import type { Page } from 'playwright';
import { loadConfig } from '../config.js';
import { assertLoggedIn, firstVisible, screenshotOnError, withBrowser } from '../browser.js';
import type { PublishResult } from '../output.js';
import { TimeoutError } from '../output.js';
import { artifactsDir } from '../paths.js';
import { MEDIUM_URLS, SELECTORS } from './selectors.js';

export type ImportStoryOptions = {
  url: string;
  canonical?: string;
  publish?: boolean;
  dryRun?: boolean;
  json?: boolean;
};

async function fillImportUrl(page: Page, url: string): Promise<void> {
  await page.goto(MEDIUM_URLS.import, { waitUntil: 'domcontentloaded', timeout: 60_000 });

  let input = await firstVisible(page, SELECTORS.importUrlInput);
  if (!input) {
    await page.goto(MEDIUM_URLS.stories, { waitUntil: 'domcontentloaded' });
    const importLink = page.getByRole('link', { name: /import a story/i }).first();
    if ((await importLink.count()) > 0) {
      await importLink.click();
      await page.waitForLoadState('domcontentloaded');
    } else {
      const importBtn = page.getByRole('button', { name: /import a story/i }).first();
      if ((await importBtn.count()) > 0) await importBtn.click();
    }
    input = await firstVisible(page, SELECTORS.importUrlInput);
  }

  if (!input) {
    throw new Error('Could not find import URL field on Medium import page');
  }

  await input.fill(url);
  const importBtn =
    (await firstVisible(page, SELECTORS.importButton)) ??
    page.getByRole('button', { name: /^import$/i }).first();
  await importBtn.click();
}

async function waitForImportPreview(page: Page, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
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

async function openImportedDraft(page: Page): Promise<void> {
  const seeStory = page.getByRole('link', { name: /see your story/i });
  if ((await seeStory.count()) > 0) {
    await seeStory.first().click();
    await page.waitForLoadState('domcontentloaded');
    return;
  }
  const btn = page.getByRole('button', { name: /see your story/i });
  if ((await btn.count()) > 0) {
    await btn.first().click();
    await page.waitForLoadState('domcontentloaded');
  }
}

async function setCanonicalIfNeeded(page: Page, canonical: string | undefined): Promise<void> {
  if (!canonical) return;
  // Medium import usually sets canonical automatically; advanced settings vary by UI.
  // Best-effort: open story settings if a gear/settings control exists.
  const settings = page.getByRole('button', { name: /story settings|settings|more/i }).first();
  if ((await settings.count()) === 0) return;
  // Skip deep settings automation in v0.1 — import tool sets canonical per Medium docs.
  void canonical;
}

async function clickPublish(page: Page): Promise<void> {
  const publish =
    (await firstVisible(page, SELECTORS.publishButton)) ??
    page.getByRole('button', { name: /^publish$/i }).first();
  await publish.click();
  await page.waitForTimeout(800);
  const confirm =
    (await firstVisible(page, SELECTORS.publishConfirm)) ??
    page.getByRole('button', { name: /publish now|publish and send/i }).first();
  if ((await confirm.count()) > 0 && (await confirm.isVisible())) {
    await confirm.click();
  }
  await page.waitForLoadState('domcontentloaded', { timeout: 60_000 }).catch(() => undefined);
}

export async function importStory(options: ImportStoryOptions): Promise<PublishResult> {
  const config = loadConfig();
  const canonical = options.canonical ?? options.url;
  const shouldPublish = options.publish ?? config.publishByDefault;
  const dryRun = options.dryRun ?? false;

  try {
    return await withBrowser(
      async ({ page }) => {
        await assertLoggedIn(page, config.username || undefined);
        await fillImportUrl(page, options.url);
        await waitForImportPreview(page, config.importTimeoutMs);
        await openImportedDraft(page);
        await setCanonicalIfNeeded(page, canonical);

        const shot = `${artifactsDir()}/import-preview-${Date.now()}.png`;
        await page.screenshot({ path: shot, fullPage: true });

        if (dryRun) {
          return {
            ok: true,
            mode: 'import',
            status: 'dry-run',
            medium_url: page.url(),
            canonical_url: canonical,
            screenshot: shot,
            message: 'Dry run — stopped before publish',
          };
        }

        if (shouldPublish) {
          await clickPublish(page);
        }

        return {
          ok: true,
          mode: 'import',
          status: shouldPublish ? 'published' : 'draft',
          medium_url: page.url(),
          canonical_url: canonical,
          screenshot: shot,
          message: shouldPublish ? 'Published via import' : 'Saved as draft after import',
        };
      },
      { requireSession: true },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    let screenshot: string | undefined;
    try {
      await withBrowser(async ({ page }) => {
        screenshot = await screenshotOnError(page, 'import-error');
      }, { requireSession: true, headless: true });
    } catch {
      /* ignore secondary failure */
    }
    return {
      ok: false,
      mode: 'import',
      status: dryRun ? 'dry-run' : 'draft',
      canonical_url: canonical,
      error: message,
      screenshot,
    };
  }
}
