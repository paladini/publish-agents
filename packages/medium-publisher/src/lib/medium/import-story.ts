import { loadConfig } from '../config.js';
import { assertLoggedIn, screenshotOnError, withBrowser } from '../browser.js';
import type { PublishResult } from '../output.js';
import { artifactsDir } from '../paths.js';
import { extractStoryFromPage } from './extract-story.js';
import { waitForDraftSaved } from './editor-utils.js';
import { clickPublish, runImportOnPage } from './import-flow.js';

export type ImportStoryOptions = {
  url: string;
  canonical?: string;
  publish?: boolean;
  dryRun?: boolean;
  json?: boolean;
};

export async function importStory(options: ImportStoryOptions): Promise<PublishResult> {
  const config = loadConfig();
  const canonical = options.canonical ?? options.url;
  const shouldPublish = options.publish ?? config.publishByDefault;
  const dryRun = options.dryRun ?? false;

  try {
    return await withBrowser(
      async ({ page }) => {
        await assertLoggedIn(page, config.username || undefined);
        await runImportOnPage(page, options.url, config.importTimeoutMs, canonical);
        await waitForDraftSaved(page, config.saveTimeoutMs);
        const extract = await extractStoryFromPage(page);

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
            extract,
            message: 'Dry run — draft saved, not published',
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
          extract,
          message: shouldPublish
            ? 'Published via import'
            : `Saved as draft after import (${extract.flags.length} formatting flags)`,
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
