import fs from 'node:fs';
import type { Page, BrowserContext } from 'patchright';
import { downloadImage, firstVisible, screenshotOnError } from '../browser.js';
import { TimeoutError } from '../output.js';
import { artifactsDir, tempDir } from '../paths.js';
import type { ContentImage } from './markdown-to-html.js';
import { LINKEDIN_URLS, SELECTORS } from './selectors.js';

export type FillArticleOptions = {
  title: string;
  html: string;
  coverImagePath?: string | null;
  contentImages?: ContentImage[];
  saveTimeoutMs?: number;
};

async function grantClipboard(context: BrowserContext, page: Page): Promise<void> {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']).catch(() => undefined);
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], {
    origin: 'https://www.linkedin.com',
  }).catch(() => undefined);
}

async function copyHtmlToClipboard(page: Page, html: string): Promise<void> {
  await page.evaluate(async (content) => {
    const htmlBlob = new Blob([content], { type: 'text/html' });
    const plain = content.replace(/<[^>]+>/g, '');
    const textBlob = new Blob([plain], { type: 'text/plain' });
    await navigator.clipboard.write([
      new ClipboardItem({
        'text/html': htmlBlob,
        'text/plain': textBlob,
      }),
    ]);
  }, html);
}

async function copyImageFileToClipboard(page: Page, imagePath: string): Promise<void> {
  const buffer = fs.readFileSync(imagePath);
  const base64 = buffer.toString('base64');
  const ext = imagePath.toLowerCase();
  const mimeType = ext.endsWith('.png')
    ? 'image/png'
    : ext.endsWith('.gif')
      ? 'image/gif'
      : ext.endsWith('.webp')
        ? 'image/webp'
        : 'image/jpeg';

  await page.evaluate(
    async ({ b64, mime }) => {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      const blob = new Blob([bytes], { type: mime });
      await navigator.clipboard.write([new ClipboardItem({ [mime]: blob })]);
    },
    { b64: base64, mime: mimeType },
  );
}

export async function waitForArticleEditor(page: Page, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const title = await firstVisible(page, SELECTORS.title);
    const editor = await firstVisible(page, SELECTORS.editor);
    if (title && editor) return;
    await page.waitForTimeout(500);
  }
  throw new TimeoutError('LinkedIn article editor did not load in time');
}

export async function uploadCoverImage(page: Page, imagePath: string): Promise<boolean> {
  const fileInput = await firstVisible(page, SELECTORS.coverInput);
  if (fileInput) {
    await fileInput.setInputFiles(imagePath);
    await page.waitForTimeout(2500);
    return true;
  }

  const coverBtn = page.getByRole('button', { name: /cover image|add.*cover/i }).first();
  if ((await coverBtn.count()) > 0) {
    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 10_000 }),
      coverBtn.click(),
    ]);
    await fileChooser.setFiles(imagePath);
    await page.waitForTimeout(2500);
    return true;
  }

  const coverArea = page.locator('[class*="cover"], [data-test*="cover"]').first();
  if ((await coverArea.count()) > 0) {
    try {
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser', { timeout: 10_000 }),
        coverArea.click(),
      ]);
      await fileChooser.setFiles(imagePath);
      await page.waitForTimeout(2500);
      return true;
    } catch {
      // fall through
    }
  }

  return false;
}

export async function fillTitle(page: Page, title: string): Promise<void> {
  const titleField =
    (await firstVisible(page, SELECTORS.title)) ??
    page.locator('h1[contenteditable="true"]').first();

  if (!titleField || (await titleField.count()) === 0) {
    throw new Error('Could not find LinkedIn article title field');
  }

  await titleField.click({ force: true });
  await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+KeyA`);
  await titleField.fill(title).catch(async () => {
    await page.keyboard.type(title, { delay: 10 });
  });
  await page.waitForTimeout(300);
}

export async function pasteHtmlContent(page: Page, html: string): Promise<void> {
  const editor =
    (await firstVisible(page, SELECTORS.editor)) ??
    page.locator('[contenteditable="true"]').last();

  if (!editor || (await editor.count()) === 0) {
    throw new Error('Could not find LinkedIn article content editor');
  }

  await editor.click({ force: true });
  await copyHtmlToClipboard(page, html);
  await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+KeyV`);
  await page.waitForTimeout(2000);
}

async function getEditorBlocks(page: Page) {
  const editor =
    (await firstVisible(page, SELECTORS.editor)) ??
    page.locator('[contenteditable="true"]').last();
  return editor.locator(':scope > *');
}

export async function insertContentImages(
  page: Page,
  images: Array<{ localPath: string; blockIndex: number }>,
): Promise<number> {
  if (!images.length) return 0;

  const sorted = [...images].sort((a, b) => b.blockIndex - a.blockIndex);
  let inserted = 0;

  for (const image of sorted) {
    const blocks = await getEditorBlocks(page);
    const count = await blocks.count();
    const targetIndex = Math.min(Math.max(image.blockIndex, 0), Math.max(0, count - 1));
    const block = blocks.nth(targetIndex);

    if ((await block.count()) === 0) continue;

    await block.click({ force: true });
    await copyImageFileToClipboard(page, image.localPath);
    await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+KeyV`);
    await page.waitForTimeout(2500);
    inserted++;
  }

  return inserted;
}

export async function waitForDraftSaved(page: Page, timeoutMs: number): Promise<void> {
  await page.keyboard.press('Escape').catch(() => undefined);
  await page.locator('body').click({ position: { x: 10, y: 10 } }).catch(() => undefined);

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const bodyText = await page.locator('body').innerText().catch(() => '');
    if (/\bSaved\b/i.test(bodyText) || /\bDraft saved\b/i.test(bodyText)) return;
    await page.waitForTimeout(1000);
  }

  // LinkedIn auto-saves even without visible indicator — blur and wait briefly
  await page.waitForTimeout(2000);
}

export async function fillLinkedInArticle(
  page: Page,
  context: BrowserContext,
  options: FillArticleOptions,
): Promise<{ coverUploaded: boolean; imagesInserted: number }> {
  await page.goto(LINKEDIN_URLS.newArticle, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await waitForArticleEditor(page, options.saveTimeoutMs ?? 60_000);
  await grantClipboard(context, page);

  let coverUploaded = false;
  if (options.coverImagePath && fs.existsSync(options.coverImagePath)) {
    coverUploaded = await uploadCoverImage(page, options.coverImagePath);
  }

  await fillTitle(page, options.title);
  await pasteHtmlContent(page, options.html);

  const imageDownloads: Array<{ localPath: string; blockIndex: number }> = [];
  const tmp = tempDir();

  for (let i = 0; i < (options.contentImages?.length ?? 0); i++) {
    const img = options.contentImages![i]!;
    try {
      const localPath = await downloadImage(img.url, tmp, 'content-' + i + '-');
      imageDownloads.push({ localPath, blockIndex: img.blockIndex });
    } catch {
      // skip failed image downloads
    }
  }

  const imagesInserted = await insertContentImages(page, imageDownloads);
  await waitForDraftSaved(page, options.saveTimeoutMs ?? 30_000);

  return { coverUploaded, imagesInserted };
}

export async function takeArticleScreenshot(page: Page, label: string): Promise<string> {
  const shot = `${artifactsDir()}/${label}-${Date.now()}.png`;
  await page.screenshot({ path: shot, fullPage: true });
  return shot;
}

export { screenshotOnError };
