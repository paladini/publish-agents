import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { loadConfig, type BrowserChannel, type BrowserMode } from '../config.js';
import {
  describeBrowserMode,
  openLoginBrowser,
  startDebugBrowser,
  type LoginBrowserOptions,
} from '../browser-launch.js';
import { saveSession, assertLoggedIn } from '../browser.js';
import { MEDIUM_URLS } from './selectors.js';
import { statePath } from '../paths.js';

export type LoginOptions = LoginBrowserOptions & {
  email?: string;
  password?: string;
  timeoutMs?: number;
};

function parseBrowserFlag(value: string | undefined): BrowserMode | undefined {
  if (!value) return undefined;
  const modes: BrowserMode[] = ['bundled', 'chrome', 'edge', 'system-profile', 'cdp'];
  if (!modes.includes(value as BrowserMode)) {
    throw new Error(`Invalid --browser ${value}. Use: ${modes.join(', ')}`);
  }
  return value as BrowserMode;
}

function parseChannelFlag(value: string | undefined): BrowserChannel | undefined {
  if (!value) return undefined;
  if (value === 'chrome' || value === 'msedge') return value;
  throw new Error('Invalid --channel. Use: chrome, msedge');
}

export function parseLoginCliArgs(args: string[]): LoginOptions {
  const get = (flag: string) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : undefined;
  };
  return {
    mode: parseBrowserFlag(get('--browser')),
    channel: parseChannelFlag(get('--channel')),
    userDataDir: get('--user-data-dir'),
    cdpUrl: get('--cdp-url') ?? process.env.MEDIUM_CDP_URL,
    email: get('--email') ?? process.env.MEDIUM_EMAIL,
    password: get('--password') ?? process.env.MEDIUM_PASSWORD,
  };
}

export async function interactiveLogin(options: LoginOptions = {}): Promise<string> {
  const config = loadConfig();
  const mode = options.mode ?? config.browserMode;
  const channel = options.channel ?? config.browserChannel;

  const handle = await openLoginBrowser({ ...options, mode, channel });

  console.log(`Browser: ${describeBrowserMode(mode, channel)}`);
  console.log('Navegando para o Medium...');

  // Prefer stories page — profile/CDP may already be logged in.
  await handle.page.goto(MEDIUM_URLS.stories, { waitUntil: 'domcontentloaded', timeout: 60_000 }).catch(() => undefined);

  try {
    await assertLoggedIn(handle.page, config.username || undefined);
    console.log('Already signed in to Medium in this browser profile.');
  } catch {
    await handle.page.goto(MEDIUM_URLS.signIn, { waitUntil: 'domcontentloaded' });
    if (options.email && options.password) {
      const emailField = handle.page.locator('input[type="email"], input[name="email"]').first();
      if ((await emailField.count()) > 0) {
        await emailField.fill(options.email);
        await handle.page.locator('input[type="password"]').first().fill(options.password);
        await handle.page.locator('button[type="submit"]').first().click().catch(() => undefined);
      }
    }
    console.log('');
    console.log('Sign in to Medium in the browser window (if needed).');
    console.log('Complete 2FA/captcha if prompted.');
  }

  console.log('');
  console.log('When medium.com/me/stories loads while signed in, press Enter to save the session.');
  console.log('');

  const rl = readline.createInterface({ input, output });
  const timer = options.timeoutMs
    ? setTimeout(() => {
        console.error('Login timed out.');
        process.exit(1);
      }, options.timeoutMs)
    : undefined;

  await rl.question('Press Enter to save session… ');
  rl.close();
  if (timer) clearTimeout(timer);

  await handle.page.goto(MEDIUM_URLS.stories, { waitUntil: 'domcontentloaded' });
  await assertLoggedIn(handle.page, config.username || undefined);

  const file = await saveSession(handle.context);
  await handle.close();

  console.log(`Session saved: ${file}`);
  console.log('Future import/publish commands use this file (headless Chromium).');
  return file;
}

export { startDebugBrowser };

export async function checkSession(): Promise<{ ok: boolean; path: string; message: string }> {
  const file = statePath();
  const { existsSync } = await import('node:fs');
  if (!existsSync(file)) {
    return { ok: false, path: file, message: 'No session file. Run: medium-publisher login' };
  }

  const { withBrowser, assertLoggedIn } = await import('../browser.js');
  try {
    await withBrowser(
      async ({ page }) => {
        await assertLoggedIn(page, loadConfig().username || undefined);
      },
      { requireSession: true, headless: true },
    );
    return { ok: true, path: file, message: 'Session valid' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, path: file, message: msg };
  }
}
