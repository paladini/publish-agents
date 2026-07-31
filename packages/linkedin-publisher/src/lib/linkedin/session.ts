import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import fs from 'node:fs';
import { chromium } from 'patchright';
import { assertLoggedIn, saveSession } from '../browser.js';
import { LINKEDIN_URLS } from './selectors.js';
import { statePath } from '../paths.js';

export async function interactiveLogin(): Promise<string> {
  console.log('Abrindo o navegador para login no LinkedIn...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(LINKEDIN_URLS.login, { waitUntil: 'domcontentloaded' });

  console.log('');
  console.log('Faça login com sua conta LinkedIn no navegador aberto.');
  console.log('Complete 2FA/captcha se solicitado.');
  console.log('Quando o feed carregar, pressione ENTER aqui no terminal.');
  console.log('');

  const rl = readline.createInterface({ input, output });
  await rl.question('Pressione ENTER para salvar a sessão... ');
  rl.close();

  await page.goto(LINKEDIN_URLS.feed, { waitUntil: 'domcontentloaded' });
  await assertLoggedIn(page);

  const file = await saveSession(context);
  await browser.close();

  console.log(`Sessão do LinkedIn salva em: ${file}`);
  return file;
}

export async function checkSession(): Promise<{ ok: boolean; path: string; message: string }> {
  const file = statePath();
  if (!fs.existsSync(file)) {
    return { ok: false, path: file, message: 'Nenhuma sessão encontrada. Execute: linkedin-publisher login' };
  }

  const { withBrowser, assertLoggedIn: check } = await import('../browser.js');
  try {
    await withBrowser(async ({ page }) => {
      await check(page);
    }, { requireSession: true, headless: true });
    return { ok: true, path: file, message: 'Sessão do LinkedIn está ativa e válida!' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, path: file, message: msg };
  }
}
