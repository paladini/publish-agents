import type { Page } from 'playwright';
import { loadContext, assertLoggedIn, screenshotOnError } from './browser.js';
import type { PublishResult } from './output.js';
import { artifactsDir } from './paths.js';

export type PublishTabNewsOptions = {
  title: string;
  body: string;
  sourceUrl?: string;
  publish?: boolean;
  dryRun?: boolean;
};

export async function publishTabNews(options: PublishTabNewsOptions): Promise<PublishResult> {
  const dryRun = options.dryRun ?? false;
  const shouldPublish = options.publish ?? false;

  let pageRef: Page | undefined;

  try {
    const { context, page } = await loadContext(true);
    pageRef = page;

    await assertLoggedIn(page);

    // Ir para a página de criação de novo conteúdo
    await page.goto('https://www.tabnews.com.br/publicar', { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Preencher o Título
    const titleInput = page.locator('input[name="title"], input[placeholder*="Título"]').first();
    await titleInput.fill(options.title);

    // Preencher o Corpo (Markdown)
    let bodyText = options.body;
    if (options.sourceUrl) {
      bodyText += `\n\n---\n*Publicado originalmente em: [${options.sourceUrl}](${options.sourceUrl})*`;
    }

    const bodyInput = page.locator('textarea[name="body"], textarea[placeholder*="Conteúdo"]').first();
    await bodyInput.fill(bodyText);

    const shot = `${artifactsDir()}/tabnews-preview-${Date.now()}.png`;
    await page.screenshot({ path: shot, fullPage: true });

    if (dryRun) {
      await context.close();
      return {
        ok: true,
        status: 'dry-run',
        tabnews_url: page.url(),
        source_url: options.sourceUrl,
        screenshot: shot,
        message: 'Dry run concluído — formulário preenchido mas não publicado',
      };
    }

    if (shouldPublish) {
      const submitBtn = page.getByRole('button', { name: /publicar|postar/i }).first();
      await submitBtn.click();
      await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => undefined);
    }

    const publishedUrl = page.url();
    await context.close();

    return {
      ok: true,
      status: shouldPublish ? 'published' : 'draft',
      tabnews_url: publishedUrl,
      source_url: options.sourceUrl,
      screenshot: shot,
      message: shouldPublish ? 'Conteúdo publicado no TabNews com sucesso!' : 'Rascunho preparado no TabNews.',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    let shot: string | undefined;
    if (pageRef) {
      shot = await screenshotOnError(pageRef, 'tabnews-publish-error');
    }
    return {
      ok: false,
      status: dryRun ? 'dry-run' : 'draft',
      source_url: options.sourceUrl,
      error: message,
      screenshot: shot,
    };
  }
}
