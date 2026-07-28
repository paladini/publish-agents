#!/usr/bin/env node
import fs from 'node:fs';
import { checkSession, interactiveLogin, parseLoginCliArgs, startDebugBrowser } from './lib/medium/session.js';
import { importStory } from './lib/medium/import-story.js';
import { publishMarkdown } from './lib/medium/new-story.js';
import { extractStory } from './lib/medium/extract-story.js';
import { fixDraft, type FixAction } from './lib/medium/fix-draft.js';
import { openDraftStory } from './lib/medium/open-draft.js';
import { publishFromDevto } from './lib/medium/publish-from-devto.js';
import { printResult, printJsonExit, SessionError } from './lib/output.js';

function usage(): never {
  console.log(`medium-publisher — publish to Medium via Playwright

Usage:
  medium-publisher login [options]
  medium-publisher browser-start [--channel chrome|msedge] [--cdp-url URL]
  medium-publisher session-check [--json]
  medium-publisher import --url URL [--canonical URL] [--publish] [--dry-run] [--json]
  medium-publisher publish --title T --body-file PATH [--tags a,b] [--canonical URL] [--publish] [--dry-run] [--json]
  medium-publisher extract --url URL [--json]
  medium-publisher open-draft --url URL [--json]
  medium-publisher fix-draft --url URL --actions-file PATH [--json]
  medium-publisher publish-devto --url DEVTO_URL [--draft] [--json]

Login options (reuse your logged-in browser):
  --browser bundled|chrome|edge|system-profile|cdp
  --channel chrome|msedge
  --user-data-dir PATH
  --cdp-url URL
  --email / --password

Exit codes: 0 ok · 1 failure · 2 usage · 3 session · 4 timeout · 5 dry-run ok
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

function parseActionsFile(path: string): FixAction[] {
  const raw = JSON.parse(fs.readFileSync(path, 'utf8')) as unknown;
  if (!Array.isArray(raw)) throw new Error('--actions-file must contain a JSON array');
  return raw as FixAction[];
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];
  if (!cmd) usage();

  try {
    if (cmd === 'login') {
      await interactiveLogin(parseLoginCliArgs(args));
      process.exit(0);
    }

    if (cmd === 'browser-start') {
      startDebugBrowser({
        channel: parseLoginCliArgs(args).channel,
        userDataDir: opt(args, '--user-data-dir'),
        cdpUrl: opt(args, '--cdp-url') ?? process.env.MEDIUM_CDP_URL,
      });
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

    if (cmd === 'import') {
      const url = opt(args, '--url');
      if (!url) usage();
      const result = await importStory({
        url,
        canonical: opt(args, '--canonical'),
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
      const tagsRaw = opt(args, '--tags');
      const result = await publishMarkdown({
        title,
        body,
        tags: tagsRaw?.split(',').map((t) => t.trim()).filter(Boolean),
        canonical: opt(args, '--canonical'),
        publish: flag(args, '--publish'),
        dryRun: flag(args, '--dry-run'),
      });
      process.exit(printResult(result, flag(args, '--json')));
    }

    if (cmd === 'extract') {
      const url = opt(args, '--url');
      if (!url) usage();
      const result = await extractStory({ url });
      process.exit(printJsonExit(result, flag(args, '--json')));
    }

    if (cmd === 'open-draft') {
      const url = opt(args, '--url');
      if (!url) usage();
      const result = await openDraftStory({ url });
      process.exit(printJsonExit(result, flag(args, '--json')));
    }

    if (cmd === 'fix-draft') {
      const url = opt(args, '--url');
      const actionsFile = opt(args, '--actions-file');
      if (!url || !actionsFile) usage();
      const result = await fixDraft({ url, actions: parseActionsFile(actionsFile) });
      process.exit(printJsonExit(result, flag(args, '--json')));
    }

    if (cmd === 'publish-devto') {
      const url = opt(args, '--url');
      if (!url) usage();
      const result = await publishFromDevto({ devtoUrl: url, publish: !flag(args, '--draft') });
      if (flag(args, '--json')) {
        console.log(
          JSON.stringify(
            result.ok
              ? { medium_url: result.medium_url, details: result.details }
              : { error: result.error },
            null,
            2,
          ),
        );
      } else if (result.ok && result.medium_url) {
        console.log(result.medium_url);
      } else {
        console.error(result.error ?? 'Cross-post failed');
      }
      process.exit(result.ok ? 0 : 1);
    }

    usage();
  } catch (err) {
    if (err instanceof SessionError) {
      console.error(err.message);
      process.exit(err.exitCode);
    }
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

main();
