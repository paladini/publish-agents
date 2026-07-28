import type { Page } from 'patchright';
import { loadConfig } from '../config.js';
import { assertLoggedIn, firstVisible, withBrowser } from '../browser.js';
import type { PublishResult } from '../output.js';
import { artifactsDir } from '../paths.js';
import { clickPublish } from './import-flow.js';
import { fillStoryTitle, truncateSeoDescription } from './story-metadata.js';
import { MEDIUM_URLS, SELECTORS } from './selectors.js';

export type PublishMarkdownOptions = {
  title: string;
  body: string;
  tags?: string[];
  /** ~140 char SEO subtitle for search previews */
  subtitle?: string;
  canonical?: string;
  publish?: boolean;
  dryRun?: boolean;
};

async function pasteMarkdown(page: Page, body: string): Promise<void> {
  const editor =
    (await firstVisible(page, SELECTORS.editor)) ?? page.locator('[contenteditable="true"]').last();
  if (!editor || (await editor.count()) === 0) throw new Error('Could not find Medium story editor');

  await editor.click({ force: true }).catch(() => editor.focus().catch(() => undefined));
  await page.evaluate(async (text) => {
    await navigator.clipboard.writeText(text);
  }, body);
  await page.keyboard.press(`${process.platform === 'darwin' ? 'Meta' : 'Control'}+KeyV`);
  await page.waitForTimeout(1500);
}

export async function publishMarkdown(options: PublishMarkdownOptions): Promise<PublishResult> {
  const config = loadConfig();
  const shouldPublish = options.publish ?? config.publishByDefault;
  const dryRun = options.dryRun ?? false;

  try {
    return await withBrowser(
      async ({ page, context }) => {
        await assertLoggedIn(page, config.username || undefined);
        await page.goto(MEDIUM_URLS.newStory, { waitUntil: 'domcontentloaded', timeout: 60_000 });

        await context.grantPermissions(['clipboard-read', 'clipboard-write']);
        await fillStoryTitle(page, options.title);
        await pasteMarkdown(page, options.body);

        const shot = `${artifactsDir()}/publish-preview-${Date.now()}.png`;
        await page.screenshot({ path: shot, fullPage: true });

        if (dryRun) {
          return {
            ok: true,
            mode: 'publish',
            status: 'dry-run',
            medium_url: page.url(),
            canonical_url: options.canonical,
            screenshot: shot,
            message: 'Dry run — stopped before publish',
          };
        }

        if (shouldPublish) {
          await clickPublish(page, {
            previewTitle: options.title,
            subtitle: options.subtitle ? truncateSeoDescription(options.subtitle) : undefined,
            tags: options.tags,
          });
        }

        return {
          ok: true,
          mode: 'publish',
          status: shouldPublish ? 'published' : 'draft',
          medium_url: page.url(),
          canonical_url: options.canonical,
          screenshot: shot,
        };
      },
      { requireSession: true },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      mode: 'publish',
      status: dryRun ? 'dry-run' : 'draft',
      canonical_url: options.canonical,
      error: message,
    };
  }
}
