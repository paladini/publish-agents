#!/usr/bin/env node
import fs from 'node:fs';
import { interactiveLogin, checkSession } from './lib/linkedin/session.js';
import { publishFromDevto, publishArticle } from './lib/linkedin/publish-from-devto.js';
import { printResult } from './lib/output.js';
import { fetchDevtoArticle } from './lib/linkedin/devto-api.js';
import { prepareDevtoArticleForLinkedIn } from './lib/linkedin/markdown-to-html.js';

function usage(): never {
  console.log(`linkedin-publisher — cross-post DEV.to articles to LinkedIn Articles

Usage:
  linkedin-publisher login
  linkedin-publisher session-check [--json]
  linkedin-publisher publish-devto --url DEVTO_URL [--publish] [--dry-run] [--json]
  linkedin-publisher publish --title TITLE --body-file PATH [--cover-url URL] [--source-url URL] [--publish] [--dry-run] [--json]
  linkedin-publisher preview-devto --url DEVTO_URL [--json]

Options:
  --publish    Publica no LinkedIn (sem essa flag salva apenas rascunho)
  --dry-run    Abre o editor sem preencher conteúdo
  --json       Imprime resultado em JSON
`);
  process.exit(2);
}

function flag(args: string[], name: string): boolean {
  return args.includes(name);
}

function opt(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];
  if (!cmd) usage();

  try {
    if (cmd === 'login') {
      await interactiveLogin();
      process.exit(0);
    }

    if (cmd === 'session-check') {
      const result = await checkSession();
      if (flag(args, '--json')) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(result.ok ? 'OK' : 'FAIL', result.message);
        console.log(`State: ${result.path}`);
      }
      process.exit(result.ok ? 0 : 3);
    }

    if (cmd === 'publish-devto') {
      const url = opt(args, '--url');
      if (!url) usage();

      const result = await publishFromDevto({
        devtoUrl: url,
        publish: flag(args, '--publish'),
        dryRun: flag(args, '--dry-run'),
      });
      process.exit(printResult(result, flag(args, '--json')));
    }

    if (cmd === 'publish') {
      const title = opt(args, '--title');
      const bodyFile = opt(args, '--body-file');
      if (!title || !bodyFile) usage();

      const body = fs.readFileSync(bodyFile, 'utf8');
      const result = await publishArticle({
        title,
        bodyMarkdown: body,
        coverImageUrl: opt(args, '--cover-url'),
        sourceUrl: opt(args, '--source-url'),
        publish: flag(args, '--publish'),
        dryRun: flag(args, '--dry-run'),
      });
      process.exit(printResult(result, flag(args, '--json')));
    }

    if (cmd === 'preview-devto') {
      const url = opt(args, '--url');
      if (!url) usage();

      const article = await fetchDevtoArticle(url);
      const preview = prepareDevtoArticleForLinkedIn(article);
      const output = {
        ok: true,
        devto_url: url,
        title: preview.title,
        cover_image: preview.coverImageUrl,
        total_blocks: preview.totalBlocks,
        content_images: preview.contentImages,
        html: preview.html,
      };

      if (flag(args, '--json')) {
        console.log(JSON.stringify(output, null, 2));
      } else {
        console.log(`Title: ${preview.title}`);
        console.log(`Cover: ${preview.coverImageUrl ?? '(none)'}`);
        console.log(`Blocks: ${preview.totalBlocks}, Images: ${preview.contentImages.length}`);
        console.log('\n--- HTML preview ---\n');
        console.log(preview.html.slice(0, 2000));
      }
      process.exit(0);
    }

    usage();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
