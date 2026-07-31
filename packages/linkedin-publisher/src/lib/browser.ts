import fs from 'node:fs';
import path from 'node:path';
import { chromium, type Browser, type BrowserContext, type Page } from 'patchright';
import { loadConfig } from './config.js';
import { LOGIN_PATTERNS, LINKEDIN_URLS } from './linkedin/selectors.js';
import { artifactsDir, statePath } from './paths.js';
import { SessionError } from './output.js';

export type BrowserOptions = {
  headless?: boolean;
  slowMo?: number;
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
    throw new SessionError(`No saved session at ${stateFile}. Run: linkedin-publisher login`);
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

export async function assertLoggedIn(page: Page): Promise<void> {
  await page.goto(LINKEDIN_URLS.feed, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForTimeout(1500);

  const url = page.url();
  if (LOGIN_PATTERNS.some((p) => p.test(url))) {
    throw new SessionError('Session expired or not logged in. Run: linkedin-publisher login');
  }

  const bodyText = await page.locator('body').innerText().catch(() => '');
  if (/sign in|log in|join linkedin/i.test(bodyText.slice(0, 800))) {
    throw new SessionError('LinkedIn shows sign-in UI. Run: linkedin-publisher login');
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

export async function downloadImage(url: string, destDir: string, prefix: string): Promise<string> {
  fs.mkdirSync(destDir, { recursive: true });
  const ext = path.extname(new URL(url).pathname) || '.jpg';
  const safeExt = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext.toLowerCase()) ? ext : '.jpg';
  const file = path.join(destDir, `${prefix}${safeExt}`);

  const res = await fetch(url, { headers: { 'User-Agent': 'linkedin-publisher/0.1' } });
  if (!res.ok) throw new Error(`Failed to download image ${url}: HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(file, buffer);
  return file;
}
