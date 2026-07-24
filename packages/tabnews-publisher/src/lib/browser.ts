import { chromium, type BrowserContext, type Page } from 'playwright';
import fs from 'node:fs';
import { statePath, artifactsDir } from './paths.js';

export async function loadContext(headless = true): Promise<{ context: BrowserContext; page: Page }> {
  const sessionFile = statePath();
  const options: Parameters<typeof chromium.launchPersistentContext>[1] = {
    headless,
    viewport: { width: 1280, height: 800 },
  };

  let context: BrowserContext;

  if (fs.existsSync(sessionFile)) {
    // Launch chromium with storageState
    const browser = await chromium.launch({ headless });
    context = await browser.newContext({ storageState: sessionFile });
  } else {
    const browser = await chromium.launch({ headless });
    context = await browser.newContext();
  }

  const page = await context.newPage();
  return { context, page };
}

export async function saveSession(context: BrowserContext): Promise<string> {
  const file = statePath();
  await context.storageState({ path: file });
  return file;
}

export async function assertLoggedIn(page: Page): Promise<boolean> {
  await page.goto('https://www.tabnews.com.br/perfil', { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const url = page.url();
  if (url.includes('/login') || url.includes('/cadastro')) {
    throw new Error('Não autenticado no TabNews. Execute primeiro: tabnews-publisher login');
  }
  return true;
}

export async function screenshotOnError(page: Page, prefix = 'tabnews-error'): Promise<string> {
  const path = `${artifactsDir()}/${prefix}-${Date.now()}.png`;
  await page.screenshot({ path, fullPage: true }).catch(() => undefined);
  return path;
}
