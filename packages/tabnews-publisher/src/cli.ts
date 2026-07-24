#!/usr/bin/env node
import fs from 'node:fs';
import { interactiveLogin, checkSession } from './lib/session.js';
import { publishTabNews } from './lib/publish.js';
import { printResult } from './lib/output.js';

function usage(): never {
  console.log(`tabnews-publisher — publish to TabNews via Playwright

Usage:
  tabnews-publisher login
  tabnews-publisher session-check [--json]
  tabnews-publisher publish --title TITLE --body-file PATH [--source-url URL] [--publish] [--dry-run] [--json]

Options:
  --publish    Publica diretamente no TabNews (sem essa flag salva rascunho/pré-visualização)
  --dry-run    Apenas preenche e tira screenshot (não publica)
  --json       Imprime resultado em formato JSON
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

    if (cmd === 'publish') {
      const title = opt(args, '--title');
      const bodyFile = opt(args, '--body-file');
      if (!title || !bodyFile) usage();

      const body = fs.readFileSync(bodyFile, 'utf8');
      const result = await publishTabNews({
        title,
        body,
        sourceUrl: opt(args, '--source-url'),
        publish: flag(args, '--publish'),
        dryRun: flag(args, '--dry-run'),
      });
      process.exit(printResult(result, flag(args, '--json')));
    }

    usage();
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
