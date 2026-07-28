import { loadConfig } from '../config.js';
import { assertLoggedIn, withBrowser } from '../browser.js';
import { waitForDraftSaved } from './editor-utils.js';
import { extractStoryFromPage } from './extract-story.js';
import { fetchDevtoArticle, heroImageUrl } from './devto-api.js';
import { runAutoFixLoop, hasCriticalFlags } from './auto-fix.js';
import { securityCheck } from './security-check.js';
import { clickPublish, runImportOnPage } from './import-flow.js';
import {
  buildPublishMetadata,
  ensureStoryTitle,
  waitForHeroImage,
} from './story-metadata.js';

export type PublishFromDevtoOptions = {
  devtoUrl: string;
  /** Default true — publish live on Medium */
  publish?: boolean;
};

export type PublishFromDevtoResult = {
  ok: boolean;
  medium_url?: string;
  error?: string;
  details?: {
    fixesApplied?: string[];
    flagsRemaining?: number;
    devto_url?: string;
    title_set?: boolean;
    hero_image?: boolean;
    tags?: string[];
    subtitle?: string;
  };
};

/** @deprecated Use PublishFromDevtoOptions */
export type CrosspostDevtoOptions = PublishFromDevtoOptions;

/** @deprecated Use PublishFromDevtoResult */
export type CrosspostDevtoResult = PublishFromDevtoResult;

export function normalizeMediumUrl(url: string): string {
  const parsed = url.match(/medium\.com\/(p\/[a-f0-9-]+|@[^/]+\/[a-f0-9-]+)/i);
  if (parsed) return `https://medium.com/${parsed[1]}/`;
  return url.replace(/\/edit(?:\/|$|\?)/, '/').replace(/\?$/, '');
}

export async function publishFromDevto(
  options: PublishFromDevtoOptions,
): Promise<PublishFromDevtoResult> {
  const config = loadConfig();
  const publish = options.publish ?? true;

  let article;
  let sourceMarkdown: string;
  try {
    article = await fetchDevtoArticle(options.devtoUrl);
    sourceMarkdown = article.body_markdown;
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  try {
    return await withBrowser(
      async ({ page }) => {
        await assertLoggedIn(page, config.username || undefined);

        await runImportOnPage(page, options.devtoUrl, config.importTimeoutMs, options.devtoUrl);
        await waitForDraftSaved(page, config.saveTimeoutMs);

        const titleSet = article.title ? await ensureStoryTitle(page, article.title) : false;
        const expectedHero = heroImageUrl(article);
        const heroImage = expectedHero ? await waitForHeroImage(page) : true;
        if (titleSet) await waitForDraftSaved(page, config.saveTimeoutMs);

        const publishMetadata = buildPublishMetadata(article);

        const { applied, extract } = await runAutoFixLoop(page);
        await waitForDraftSaved(page, config.saveTimeoutMs);

        const security = securityCheck(sourceMarkdown, extract);
        if (!security.ok) {
          throw new Error(`Security check failed: ${security.issues.join('; ')}`);
        }

        if (hasCriticalFlags(extract)) {
          throw new Error(
            `Formatting issues remain after auto-fix (${extract.flags.length} flags). ` +
              `Open draft manually or use medium_fix_draft. Flags: ${extract.flags.map((f) => f.code).join(', ')}`,
          );
        }

        if (publish) {
          await clickPublish(page, publishMetadata);
          await page.waitForTimeout(2500);
        }

        const medium_url = normalizeMediumUrl(page.url());
        const metadataDetails = {
          devto_url: options.devtoUrl,
          title_set: titleSet || Boolean(article.title),
          hero_image: heroImage,
          tags: publishMetadata.tags,
          subtitle: publishMetadata.subtitle,
        };

        return {
          ok: true,
          medium_url,
          details: publish
            ? metadataDetails
            : {
                fixesApplied: applied,
                flagsRemaining: extract.flags.length,
                ...metadataDetails,
              },
        };
      },
      { requireSession: true },
    );
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** @deprecated Use publishFromDevto */
export const crosspostDevto = publishFromDevto;
