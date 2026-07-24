import fs from 'node:fs';
import { chromium, type Browser, type BrowserContext, type Page } from 'patchright';
import { loadConfig } from './config.js';
import { LOGIN_PATTERNS, MEDIUM_URLS } from './medium/selectors.js';
import { artifactsDir, statePath } from './paths.js';
import { SessionError } from './output.js';

export type BrowserOptions = {
  headless?: boolean;
  slowMo?: number;
  /** Require saved session; throw SessionError if missing */
  requireSession?: boolean;
};

export async function withBrowser<T>(
  fn: (ctx: { browser: Browser; context: BrowserContext; page: Page }) => Promise<T>,
  options: BrowserOptions = {},
): Promise<T> {
  const config = loadConfig();
  const headless = options.headless ?? config.headless;
  const slowMo = options.slowMo ?? config.slowMo;
  const stateFile = statePath();

  if (options.requireSession && !fs.existsSync(stateFile)) {
    throw new SessionError(
      `No saved session at ${stateFile}. Run: medium-publisher login`,
    );
  }

  const browser = await chromium.launch({ headless, slowMo });
  const context = await browser.newContext(
    fs.existsSync(stateFile) ? { storageState: stateFile } : {},
  );
  const page = await context.newPage();

  try {
    return await fn({ browser, context, page });
  } finally {
    await context.close();
    await browser.close();
  }
}

export async function saveSession(context: BrowserContext): Promise<string> {
  const file = statePath();
  await context.storageState({ path: file });
  return file;
}

export async function assertLoggedIn(page: Page, expectedUsername?: string): Promise<void> {
  await page.goto(MEDIUM_URLS.stories, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(1500);

  const url = page.url();
  if (LOGIN_PATTERNS.some((p) => p.test(url))) {
    throw new SessionError('Session expired or not logged in. Run: medium-publisher login');
  }

  const bodyText = await page.locator('body').innerText().catch(() => '');
  if (LOGIN_PATTERNS.some((p) => p.test(bodyText.slice(0, 500)))) {
    throw new SessionError('Medium shows sign-in UI. Run: medium-publisher login');
  }

  if (expectedUsername) {
    const handle = expectedUsername.replace(/^@/, '');
    const hrefPattern = new RegExp(`/@${handle}(?:/|$)`, 'i');
    const profileLink = page.locator(`a[href*="/@${handle}"]`).first();
    const hasProfile = (await profileLink.count()) > 0 || hrefPattern.test(bodyText);
    if (!hasProfile) {
      // Soft warning only — Medium header varies by layout
      console.warn(`Warning: could not confirm @${handle} in page UI`);
    }
  }
}

export async function screenshotOnError(page: Page, label: string): Promise<string> {
  const file = `${artifactsDir()}/${label}-${Date.now()}.png`;
  await page.screenshot({ path: file, fullPage: true }).catch(() => undefined);
  return file;
}

export async function firstVisible(page: Page, selectors: readonly string[]) {
  for (const sel of selectors) {
    const loc = page.locator(sel).first();
    if ((await loc.count()) > 0 && (await loc.isVisible().catch(() => false))) {
      return loc;
    }
  }
  return null;
}
