import { loadConfig } from '../config.js';
import { assertLoggedIn, downloadImage, withBrowser } from '../browser.js';
import type { PublishResult } from '../output.js';
import { tempDir } from '../paths.js';
import { fetchDevtoArticle, heroImageUrl } from './devto-api.js';
import {
  fillLinkedInArticle,
  screenshotOnError,
  takeArticleScreenshot,
} from './editor.js';
import { prepareDevtoArticleForLinkedIn, markdownToLinkedInContent } from './markdown-to-html.js';

export type PublishFromDevtoOptions = {
  devtoUrl: string;
  /** Default false — save as draft */
  publish?: boolean;
  dryRun?: boolean;
};

export type PublishArticleOptions = {
  title: string;
  bodyMarkdown: string;
  coverImageUrl?: string | null;
  sourceUrl?: string;
  publish?: boolean;
  dryRun?: boolean;
};

function normalizeLinkedInUrl(url: string): string {
  if (url.includes('/article/new')) {
    return url;
  }
  return url.split('?')[0] ?? url;
}

export async function publishArticle(options: PublishArticleOptions): Promise<PublishResult> {
  const config = loadConfig();
  const shouldPublish = options.publish ?? config.publishByDefault;
  const dryRun = options.dryRun ?? false;

  const content = markdownToLinkedInContent(options.bodyMarkdown, {
    fallbackTitle: options.title,
    coverImageUrl: options.coverImageUrl,
    sourceUrl: options.sourceUrl,
  });

  let coverImagePath: string | null = null;
  const tmp = tempDir();

  if (content.coverImageUrl) {
    try {
      coverImagePath = await downloadImage(content.coverImageUrl, tmp, 'cover-');
    } catch {
      coverImagePath = null;
    }
  }

  try {
    return await withBrowser(
      async ({ page, context }) => {
        await assertLoggedIn(page);

        if (dryRun) {
          await page.goto('https://www.linkedin.com/article/new/', {
            waitUntil: 'domcontentloaded',
            timeout: 60_000,
          });
          const shot = await takeArticleScreenshot(page, 'linkedin-dry-run');
          return {
            ok: true,
            status: 'dry-run',
            linkedin_url: page.url(),
            source_url: options.sourceUrl,
            screenshot: shot,
            message: 'Dry run — editor aberto, conteúdo não preenchido',
            details: {
              title: content.title,
              blocks: content.totalBlocks,
              content_images: content.contentImages.length,
            },
          };
        }

        const { coverUploaded, imagesInserted } = await fillLinkedInArticle(page, context, {
          title: content.title,
          html: content.html,
          coverImagePath,
          contentImages: content.contentImages,
          saveTimeoutMs: config.saveTimeoutMs,
        });

        const shot = await takeArticleScreenshot(page, 'linkedin-draft');

        if (shouldPublish) {
          const publishBtn = page.getByRole('button', { name: /^Publish$|^Next$/i }).first();
          if ((await publishBtn.count()) > 0) {
            await publishBtn.click();
            await page.waitForTimeout(2000);
            const confirmBtn = page.getByRole('button', { name: /^Publish$/i }).last();
            if ((await confirmBtn.count()) > 0 && (await confirmBtn.isVisible())) {
              await confirmBtn.click();
              await page.waitForTimeout(3000);
            }
          }
        }

        return {
          ok: true,
          status: shouldPublish ? 'published' : 'draft',
          linkedin_url: normalizeLinkedInUrl(page.url()),
          source_url: options.sourceUrl,
          screenshot: shot,
          message: shouldPublish
            ? 'Artigo publicado no LinkedIn.'
            : 'Rascunho salvo no LinkedIn. Revise e publique manualmente.',
          details: {
            title: content.title,
            cover_image: coverUploaded,
            content_images: imagesInserted,
            blocks: content.totalBlocks,
          },
        };
      },
      { requireSession: true },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      status: dryRun ? 'dry-run' : shouldPublish ? 'published' : 'draft',
      source_url: options.sourceUrl,
      error: message,
    };
  }
}

export async function publishFromDevto(options: PublishFromDevtoOptions): Promise<PublishResult> {
  let article;
  try {
    article = await fetchDevtoArticle(options.devtoUrl);
  } catch (err) {
    return {
      ok: false,
      status: 'draft',
      error: err instanceof Error ? err.message : String(err),
    };
  }

  const content = prepareDevtoArticleForLinkedIn(article);
  const cover = heroImageUrl(article);

  const result = await publishArticle({
    title: content.title || article.title,
    bodyMarkdown: article.body_markdown,
    coverImageUrl: cover,
    sourceUrl: article.url,
    publish: options.publish ?? false,
    dryRun: options.dryRun ?? false,
  });

  return {
    ...result,
    source_url: article.url,
    details: {
      ...result.details,
      devto_url: options.devtoUrl,
      title: content.title || article.title,
    },
  };
}

export { screenshotOnError };
