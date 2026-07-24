#!/usr/bin/env node
import fs from 'node:fs';
import { checkSession, interactiveLogin, parseLoginCliArgs, startDebugBrowser } from './lib/medium/session.js';
import { importStory } from './lib/medium/import-story.js';
import { publishMarkdown } from './lib/medium/new-story.js';
import { printResult, SessionError } from './lib/output.js';

function usage(): never {
  console.log(`medium-publisher — publish to Medium via Playwright

Usage:
  medium-publisher login [options]
  medium-publisher browser-start [--channel chrome|msedge] [--cdp-url URL]
  medium-publisher session-check [--json]
  medium-publisher import --url URL [--canonical URL] [--publish] [--dry-run] [--json]
  medium-publisher publish --title T --body-file PATH [--tags a,b] [--canonical URL] [--publish] [--dry-run] [--json]

Login options (reuse your logged-in browser):
  --browser bundled|chrome|edge|system-profile|cdp
      bundled          Playwright Chromium (isolated, default fallback)
      chrome / edge    Installed browser, isolated session
      system-profile   Your Default Chrome/Edge profile (close browser first)
      cdp              Attach to Chrome/Edge started with browser-start
  --channel chrome|msedge     Profile browser (default: chrome)
  --user-data-dir PATH        Override profile directory
  --cdp-url URL               CDP endpoint (default: http://127.0.0.1:9222)
  --email / --password        Optional; usually unnecessary with system-profile

Recommended (already logged into Medium in Chrome):
  1. Close Chrome completely
  2. medium-publisher login --browser system-profile

Or without closing Chrome:
  1. medium-publisher browser-start
  2. medium-publisher login --browser cdp

Environment:
  MEDIUM_STATE_PATH          Override session file path
  MEDIUM_PUBLISHER_HOME      App data directory
  MEDIUM_CDP_URL             Default CDP URL
  MEDIUM_EMAIL / MEDIUM_PASSWORD  Optional automated login fallback

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
