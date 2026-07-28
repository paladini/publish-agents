import { loadConfig } from '../config.js';
import { assertLoggedIn, withBrowser } from '../browser.js';
import { openDraft, waitForDraftSaved } from './editor-utils.js';
import { extractStoryFromPage } from './extract-story.js';

export type OpenDraftOptions = {
  url: string;
  /** Keep browser open until user closes — not supported headless; waits for save then returns */
  waitForSave?: boolean;
};

export type OpenDraftResult = {
  ok: boolean;
  medium_url?: string;
  message?: string;
  error?: string;
};

export async function openDraftStory(options: OpenDraftOptions): Promise<OpenDraftResult> {
  const config = loadConfig();
  try {
    return await withBrowser(
      async ({ page }) => {
        await assertLoggedIn(page, config.username || undefined);
        await openDraft(page, options.url);
        if (options.waitForSave !== false) {
          await waitForDraftSaved(page);
        }
        const extract = await extractStoryFromPage(page);
        return {
          ok: true,
          medium_url: page.url(),
          message: `Draft open — title: "${extract.title}" (${extract.blocks.length} blocks)`,
        };
      },
      { requireSession: true, headless: false },
    );
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      medium_url: options.url,
    };
  }
}
