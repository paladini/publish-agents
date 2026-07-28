import type { Locator, Page } from 'patchright';
import { firstVisible } from '../browser.js';
import { TimeoutError } from '../output.js';
import { isStoryEditorUrl, waitForStoryEditor } from './editor-utils.js';
import { fillPublishDialog, type PublishMetadata } from './story-metadata.js';
import { MEDIUM_URLS, SELECTORS } from './selectors.js';

async function waitForImportPage(page: Page): Promise<void> {
  await page.goto(MEDIUM_URLS.import, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  const onImportPage = await page
    .getByRole('heading', { name: /see your story on medium/i })
    .waitFor({ timeout: 60_000 })
    .then(() => true)
    .catch(() => false);

  if (!onImportPage) {
    throw new Error(`Expected Medium import page but got: ${page.url()}`);
  }

  await page.locator('[contenteditable="true"]').first().waitFor({ timeout: 30_000 });
}

async function findImportUrlField(page: Page): Promise<Locator> {
  const byInstruction = page
    .getByText(/enter a link to your blog post/i)
    .locator('xpath=following::*[@contenteditable="true"][1]');
  if ((await byInstruction.count()) > 0) return byInstruction.first();

  return page.locator('[contenteditable="true"]').first();
}

export async function fillImportUrl(page: Page, url: string): Promise<void> {
  await waitForImportPage(page);

  const field = await findImportUrlField(page);
  if ((await field.count()) === 0) {
    throw new Error(`Could not find import URL field on Medium import page (url: ${page.url()})`);
  }

  await field.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(url);

  const importBtn =
    (await firstVisible(page, SELECTORS.importButton)) ??
    page.getByRole('button', { name: /^import$/i }).first();
  await importBtn.click();
}

export async function waitForImportPreview(page: Page, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (isStoryEditorUrl(page.url())) return;

    const seeStory = page.getByRole('link', { name: /see your story/i });
    const editor = await firstVisible(page, SELECTORS.editor);
    if ((await seeStory.count()) > 0 || editor) return;
    if (await page.getByText(/unable to import|could not import|error/i).count()) {
      throw new Error('Medium reported import failure — check URL is public');
    }
    await page.waitForTimeout(1000);
  }
  throw new TimeoutError(`Import preview did not load within ${timeoutMs}ms`);
}

export async function openImportedDraft(page: Page): Promise<void> {
  if (isStoryEditorUrl(page.url())) {
    await waitForStoryEditor(page);
    return;
  }

  // After import, Medium shows a preview with "See your story" — open the editor from there.
  const seeStoryLink = page.getByRole('link', { name: /see your story/i });
  if ((await seeStoryLink.count()) > 0) {
    await seeStoryLink.first().click();
    await page.waitForLoadState('domcontentloaded');
    if (isStoryEditorUrl(page.url())) {
      await waitForStoryEditor(page);
      return;
    }
  }

  await waitForStoryEditor(page);
}

export async function setCanonicalIfNeeded(page: Page, canonical: string | undefined): Promise<void> {
  if (!canonical) return;
  const settings = page.getByRole('button', { name: /story settings|settings|more/i }).first();
  if ((await settings.count()) === 0) return;
  void canonical;
}

async function dismissOverlays(page: Page): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(150);
  }
}

export async function clickPublish(page: Page, metadata?: PublishMetadata): Promise<void> {
  await dismissOverlays(page);

  const publish =
    (await firstVisible(page, SELECTORS.publishButton)) ??
    page.getByRole('button', { name: /^publish$/i }).first();
  await publish.click({ force: true });
  await page.waitForTimeout(800);

  if (metadata) {
    await fillPublishDialog(page, metadata);
    await page.waitForTimeout(400);
  }

  const confirm =
    (await firstVisible(page, SELECTORS.publishConfirm)) ??
    page.getByRole('button', { name: /publish now|publish and send/i }).first();
  if ((await confirm.count()) > 0 && (await confirm.isVisible())) {
    await confirm.click();
  }

  await page
    .waitForURL(/medium\.com\/(p\/[a-f0-9-]+|@[^/]+\/[a-f0-9-]+)/i, { timeout: 60_000 })
    .catch(() => undefined);
  await page.waitForLoadState('domcontentloaded', { timeout: 60_000 }).catch(() => undefined);
}

export async function runImportOnPage(
  page: Page,
  url: string,
  importTimeoutMs: number,
  canonical?: string,
): Promise<void> {
  await fillImportUrl(page, url);
  await waitForImportPreview(page, importTimeoutMs);
  await openImportedDraft(page);
  await setCanonicalIfNeeded(page, canonical ?? url);
}
