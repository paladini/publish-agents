import type { Locator, Page } from 'patchright';
import { firstVisible } from '../browser.js';
import { TimeoutError } from '../output.js';
import { SELECTORS } from './selectors.js';

const STORY_URL_PATTERN =
  /medium\.com\/(?:p\/[a-f0-9-]+|@[^/]+\/[a-f0-9-]+|new-story)/i;

export function isStoryEditorUrl(url: string): boolean {
  return STORY_URL_PATTERN.test(url) || /\/edit(?:\/|$|\?)/i.test(url);
}

export function storyContentScore(childCount: number, grafCount: number, textLength: number): number {
  return grafCount * 100 + childCount * 10 + (textLength > 0 ? 1 : 0);
}

export function hasMinimumStoryBlocks(blockCount: number, minimumBlocks: number): boolean {
  return blockCount >= minimumBlocks;
}

export async function openDraft(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitForStoryEditor(page);
}

export async function waitForStoryEditor(
  page: Page,
  timeoutMs = 60_000,
  minimumBlocks = 1,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const editor = await firstVisible(page, SELECTORS.editor);
    if (editor && isStoryEditorUrl(page.url()) && (await hasStoryContent(page, minimumBlocks))) return;
    if (editor && (await hasStoryContent(page, minimumBlocks))) return;
    await page.waitForTimeout(500);
  }
  throw new TimeoutError(`Story editor did not load within ${timeoutMs}ms (url: ${page.url()})`);
}

export async function storyContentRoot(page: Page): Promise<Locator> {
  const candidates: Locator[] = [];
  for (const selector of SELECTORS.storyBody) {
    const locator = page.locator(selector);
    const count = await locator.count();
    for (let index = 0; index < count; index++) {
      candidates.push(locator.nth(index));
    }
  }

  let best: { locator: Locator; score: number } | undefined;
  for (const candidate of candidates) {
    if (!(await candidate.isVisible().catch(() => false))) continue;

    const directChildren = candidate.locator(':scope > *');
    const childCount = await directChildren.count();
    const grafCount = await candidate.locator(':scope > [class*="graf-"]').count();
    const textLength = (await candidate.innerText().catch(() => '')).trim().length;
    const score = storyContentScore(childCount, grafCount, textLength);

    if (!best || score > best.score) best = { locator: candidate, score };
  }

  if (best) return best.locator;
  return page.locator('[contenteditable="true"]').last();
}

export async function storyBlockLocators(page: Page): Promise<Locator[]> {
  const root = await storyContentRoot(page);
  const blocks = root.locator(':scope > *');
  const count = await blocks.count();
  return Array.from({ length: count }, (_, i) => blocks.nth(i));
}

export async function getStoryTitle(page: Page): Promise<string> {
  const titleEl =
    (await firstVisible(page, SELECTORS.titleInput)) ??
    page.locator(
      '[data-testid="editorTitleParagraph"], h1[contenteditable="true"], h3.graf--title, [class*="graf--title"]',
    ).first();
  if ((await titleEl.count()) === 0) return '';
  return (await titleEl.innerText()).trim();
}

export async function hasStoryContent(page: Page, minimumBlocks = 1): Promise<boolean> {
  const root = await storyContentRoot(page);
  const blocks = root.locator(':scope > *');
  if (!hasMinimumStoryBlocks(await blocks.count(), minimumBlocks)) return false;

  const title = await getStoryTitle(page);
  if (title && title.toLowerCase() !== 'title') return true;
  return (await root.innerText().catch(() => '')).trim().length > 0;
}

export async function blurEditor(page: Page): Promise<void> {
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.locator('body').click({ position: { x: 8, y: 8 } }).catch(() => undefined);
  await page.waitForTimeout(400);
}

export async function waitForDraftSaved(page: Page, timeoutMs = 30_000): Promise<void> {
  await waitForStoryEditor(page);
  await blurEditor(page);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const saved = page.getByText(/^saved$/i).first();
    const saving = page.getByText(/^saving/i).first();

    if ((await saved.count()) > 0 && (await saved.isVisible().catch(() => false))) {
      return;
    }

    const savingVisible =
      (await saving.count()) > 0 && (await saving.isVisible().catch(() => false));
    if (!savingVisible && isStoryEditorUrl(page.url()) && (await hasStoryContent(page))) {
      await page.waitForTimeout(1500);
      if ((await saved.count()) > 0 && (await saved.first().isVisible().catch(() => false))) {
        return;
      }
      if (!(await saving.isVisible().catch(() => false))) {
        return;
      }
    }

    await page.waitForTimeout(400);
  }

  const url = page.url();
  const titleBefore = await getStoryTitle(page);
  if (!isStoryEditorUrl(url)) {
    throw new TimeoutError(`Draft save failed — not on story editor (${url})`);
  }

  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitForStoryEditor(page);
  const titleAfter = await getStoryTitle(page);
  if (titleBefore && titleAfter && titleBefore === titleAfter) return;

  throw new TimeoutError(`Draft did not save within ${timeoutMs}ms`);
}

export async function selectBlock(page: Page, block: Locator): Promise<void> {
  await block.scrollIntoViewIfNeeded();
  await block.click({ force: true });
  await block.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  });
}

export async function deleteBlock(page: Page, block: Locator): Promise<void> {
  await selectBlock(page, block);
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(300);
}

export async function replaceBlockText(page: Page, block: Locator, text: string): Promise<void> {
  await selectBlock(page, block);
  await page.keyboard.press('Backspace');
  if (text) await page.keyboard.insertText(text);
  await page.waitForTimeout(300);
}
