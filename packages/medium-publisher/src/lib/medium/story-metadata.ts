import type { Page } from 'patchright';
import { firstVisible } from '../browser.js';
import { getStoryTitle } from './editor-utils.js';
import { SELECTORS } from './selectors.js';

export type PublishMetadata = {
  /** SEO / search preview title (defaults to story title) */
  previewTitle?: string;
  /** ~140 char subtitle for Google / Medium search preview */
  subtitle?: string;
  /** Up to 5 Medium topics */
  tags?: string[];
};

/** Trim DEV.to description to a search-friendly subtitle (~140 chars). */
export function truncateSeoDescription(text: string, max = 140): string {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return '';
  if (normalized.length <= max) return normalized;

  const cut = normalized.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  if (lastSpace > max * 0.6) {
    return `${cut.slice(0, lastSpace).trimEnd()}…`;
  }
  return `${cut.trimEnd()}…`;
}

export function parseDevtoTags(tagList: string | string[] | undefined): string[] {
  if (!tagList) return [];
  const raw = Array.isArray(tagList) ? tagList : tagList.split(',');
  return raw
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 5);
}

export async function fillStoryTitle(page: Page, title: string): Promise<void> {
  const titleEl =
    (await firstVisible(page, SELECTORS.titleInput)) ??
    page.locator(
      '[data-testid="editorTitleParagraph"], h1[contenteditable="true"], h3.graf--title, [class*="graf--title"]',
    ).first();
  if ((await titleEl.count()) === 0) {
    await page.keyboard.insertText(title);
    return;
  }
  await titleEl.click();
  const editable = await titleEl.evaluate((element) => {
    const tag = element.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || element.getAttribute('contenteditable') === 'true';
  });
  if (editable) {
    await titleEl.fill(title);
  } else {
    await titleEl.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    });
    await page.keyboard.type(title);
  }
  await page.waitForTimeout(400);
}

/** Fill title when Medium import left the default empty "Title" placeholder. */
export async function ensureStoryTitle(page: Page, title: string): Promise<boolean> {
  const current = (await getStoryTitle(page)).trim();
  if (current && current.toLowerCase() !== 'title') return false;
  await fillStoryTitle(page, title);
  const savedTitle = (await getStoryTitle(page)).trim();
  if (savedTitle !== title) {
    throw new Error(`Medium title was not set correctly (expected "${title}", got "${savedTitle}")`);
  }
  return true;
}

/** Wait for a hero/cover image to appear after import (Medium may fetch OG async). */
export async function waitForHeroImage(page: Page, timeoutMs = 12_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const src = await page
      .locator('figure.graf--figure img, [data-testid="storyHero"] img')
      .first()
      .getAttribute('src')
      .catch(() => null);
    if (src && !src.startsWith('data:')) return true;
    await page.waitForTimeout(500);
  }
  return false;
}


export async function addPublishTag(page: Page, tag: string): Promise<void> {
  const topicInput = page.locator('input[placeholder*="topic" i]').first();
  await topicInput.waitFor({ state: 'visible', timeout: 10_000 });

  await topicInput.click({ force: true });
  await topicInput.fill(tag);

  await page
    .waitForFunction(
      () => {
        const menu = document.getElementById('tagMultiSelectMenu');
        return Boolean(menu && menu.querySelectorAll('button').length > 0);
      },
      { timeout: 4000 },
    )
    .catch(() => undefined);

  const picked = await page.evaluate((rawTag) => {
    const menu = document.getElementById('tagMultiSelectMenu');
    if (!menu) return null;
    const escaped = rawTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const exact = new RegExp(`^${escaped}\\s*\\(`, 'i');
    const buttons = [...menu.querySelectorAll('button')];
    const match = buttons.find((btn) => exact.test((btn.textContent || '').replace(/\s+/g, ' ').trim()));
    const target = match ?? buttons[0];
    if (!target) return null;
    target.click();
    return (target.textContent || '').replace(/\s+/g, ' ').trim();
  }, tag);

  if (!picked) {
    await topicInput.press('ArrowDown');
    await page.waitForTimeout(100);
    await topicInput.press('Enter');
  }

  await page.waitForTimeout(400);
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.waitForTimeout(200);
}

export async function fillPublishDialog(page: Page, metadata: PublishMetadata): Promise<void> {
  if (metadata.previewTitle) {
    const previewTitle = page.getByRole('textbox', { name: /preview title/i }).first();
    if ((await previewTitle.count()) > 0) {
      await previewTitle.fill(metadata.previewTitle);
    }
  }

  if (metadata.subtitle) {
    const subtitle = page.getByRole('textbox', { name: /preview subtitle/i }).first();
    if ((await subtitle.count()) > 0) {
      await subtitle.fill(truncateSeoDescription(metadata.subtitle));
    }
  }

  if (metadata.tags?.length) {
    for (const tag of metadata.tags.slice(0, 5)) {
      await addPublishTag(page, tag);
    }
  }
}

export function buildPublishMetadata(article: {
  title: string;
  description: string;
  tags: string[];
  body_markdown?: string;
}): PublishMetadata {
  const description = truncateSeoDescription(article.description);
  const firstBodyParagraph = article.body_markdown
    ?.split(/\r?\n\s*\r?\n/)
    .map((part) => part.replace(/^\s*#{1,6}\s+/, '').replace(/[`*_]/g, '').trim())
    .find(Boolean);
  const subtitle = description || truncateSeoDescription(
    firstBodyParagraph || `Discover ${article.title} with practical examples and implementation guidance.`,
  );

  return {
    previewTitle: article.title,
    subtitle,
    tags: article.tags.slice(0, 5),
  };
}
