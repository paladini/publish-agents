import type { Locator, Page } from 'patchright';
import { loadConfig } from '../config.js';
import { assertLoggedIn, withBrowser } from '../browser.js';
import { extractStoryFromPage, type StoryExtract } from './extract-story.js';
import {
  blurEditor,
  deleteBlock,
  openDraft,
  replaceBlockText,
  selectBlock,
  storyBlockLocators,
  waitForDraftSaved,
  waitForStoryEditor,
} from './editor-utils.js';

export type FixAction =
  | { type: 'removeEmptyCodeBlocks' }
  | { type: 'mergeAdjacentCodeBlocks' }
  | { type: 'promoteDemoteHeading'; blockIndex: number; level: 2 | 3 | 'paragraph' }
  | { type: 'replaceBlockText'; blockIndex: number; text: string };

export type FixDraftOptions = {
  url: string;
  actions: FixAction[];
};

export type FixDraftResult = {
  ok: boolean;
  medium_url?: string;
  extract?: StoryExtract;
  applied: string[];
  error?: string;
};

async function blockTypeAt(page: Page, index: number): Promise<string> {
  const blocks = await storyBlockLocators(page);
  if (index < 0 || index >= blocks.length) return 'missing';
  const block = blocks[index]!;
  return block.evaluate((el) => {
    const cls = (el.className ?? '').toLowerCase();
    if (cls.includes('graf--pre') || el.tagName === 'PRE') return 'code';
    if (cls.includes('graf--h2')) return 'heading2';
    if (cls.includes('graf--h3')) return 'heading3';
    return 'other';
  });
}

async function codeBlockText(block: Locator): Promise<string> {
  return ((await block.locator('.pre--content').first().textContent().catch(() => '')) ?? '').replace(
    /\u00a0/g,
    ' ',
  );
}

async function removeEmptyCodeBlocks(page: Page): Promise<number> {
  let removed = 0;
  for (let pass = 0; pass < 20; pass++) {
    const blocks = await storyBlockLocators(page);
    const beforeCount = blocks.length;
    let found = false;
    for (let i = blocks.length - 1; i >= 0; i--) {
      const block = blocks[i]!;
      const kind = await blockTypeAt(page, i);
      const text = (await codeBlockText(block)).trim();
      if (kind === 'code' && !text) {
        await deleteBlock(page, block);
        removed++;
        found = true;
        break;
      }
    }
    if (!found) break;
    const afterCount = (await storyBlockLocators(page)).length;
    if (afterCount >= beforeCount) break;
  }
  return removed;
}

async function mergeAdjacentCodeBlocks(page: Page): Promise<number> {
  let merged = 0;
  for (let pass = 0; pass < 20; pass++) {
    const blocks = await storyBlockLocators(page);
    let found = false;
    for (let i = 0; i < blocks.length - 1; i++) {
      const a = blocks[i]!;
      const b = blocks[i + 1]!;
      const typeA = await blockTypeAt(page, i);
      const typeB = await blockTypeAt(page, i + 1);
      if (typeA !== 'code' || typeB !== 'code') continue;
      const textA = (await codeBlockText(a)).trimEnd();
      const textB = (await codeBlockText(b)).trim();
      const beforeCount = blocks.length;
      await replaceBlockText(page, a, `${textA}\n${textB}`);
      await deleteBlock(page, b);
      const afterCount = (await storyBlockLocators(page)).length;
      if (afterCount >= beforeCount) return merged;
      merged++;
      found = true;
      break;
    }
    if (!found) break;
  }
  return merged;
}

async function promoteDemoteHeading(
  page: Page,
  blockIndex: number,
  level: 2 | 3 | 'paragraph',
): Promise<void> {
  const blocks = await storyBlockLocators(page);
  const block = blocks[blockIndex];
  if (!block) throw new Error(`Block index ${blockIndex} not found`);

  await selectBlock(page, block);
  await page.waitForTimeout(200);

  const formatBtn = page.getByRole('button', { name: /text format|format/i }).first();
  if ((await formatBtn.count()) > 0 && (await formatBtn.isVisible().catch(() => false))) {
    await formatBtn.click({ force: true }).catch(() => undefined);
  }

  const label =
    level === 2 ? /heading 2|h2/i : level === 3 ? /heading 3|h3/i : /paragraph|normal text/i;
  const option = page.getByRole('button', { name: label }).first();
  if ((await option.count()) > 0 && (await option.isVisible().catch(() => false))) {
    await option.click({ force: true });
    return;
  }

  const text = (await block.innerText()).trim();
  if (level === 'paragraph') {
    await replaceBlockText(page, block, text);
    return;
  }

  await replaceBlockText(page, block, text);
}

async function applyFixAction(page: Page, action: FixAction): Promise<string> {
  switch (action.type) {
    case 'removeEmptyCodeBlocks': {
      const n = await removeEmptyCodeBlocks(page);
      return `removeEmptyCodeBlocks (${n} removed)`;
    }
    case 'mergeAdjacentCodeBlocks': {
      const n = await mergeAdjacentCodeBlocks(page);
      return `mergeAdjacentCodeBlocks (${n} merged)`;
    }
    case 'promoteDemoteHeading': {
      await promoteDemoteHeading(page, action.blockIndex, action.level);
      return `promoteDemoteHeading block ${action.blockIndex} -> ${action.level}`;
    }
    case 'replaceBlockText': {
      const blocks = await storyBlockLocators(page);
      const block = blocks[action.blockIndex];
      if (!block) throw new Error(`Block index ${action.blockIndex} not found`);
      await replaceBlockText(page, block, action.text);
      return `replaceBlockText block ${action.blockIndex}`;
    }
    default:
      throw new Error(`Unknown fix action: ${(action as FixAction).type}`);
  }
}

export async function applyFixesOnPage(page: Page, actions: FixAction[]): Promise<string[]> {
  await waitForStoryEditor(page);
  const applied: string[] = [];
  for (const action of actions) {
    applied.push(await applyFixAction(page, action));
    await blurEditor(page);
  }
  await waitForDraftSaved(page);
  return applied;
}

export async function fixDraft(options: FixDraftOptions): Promise<FixDraftResult> {
  const config = loadConfig();
  try {
    return await withBrowser(
      async ({ page }) => {
        await assertLoggedIn(page, config.username || undefined);
        await openDraft(page, options.url);
        const applied = await applyFixesOnPage(page, options.actions);
        const extract = await extractStoryFromPage(page);
        return { ok: true, medium_url: page.url(), extract, applied };
      },
      { requireSession: true },
    );
  } catch (err) {
    return {
      ok: false,
      applied: [],
      error: err instanceof Error ? err.message : String(err),
      medium_url: options.url,
    };
  }
}
