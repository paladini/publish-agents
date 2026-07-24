import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { chromium } from 'playwright';
import { saveSession, assertLoggedIn } from './browser.js';
import { statePath } from './paths.js';

export async function interactiveLogin(): Promise<string> {
  console.log('Abrindo o navegador para login no TabNews...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://www.tabnews.com.br/login', { waitUntil: 'domcontentloaded' });

  console.log('');
  console.log('Faça o login com sua conta no TabNews no navegador que foi aberto.');
  console.log('Quando estiver logado e visualizar a página inicial ou seu perfil, pressione ENTER aqui no terminal.');
  console.log('');

  const rl = readline.createInterface({ input, output });
  await rl.question('Pressione ENTER para salvar a sessão... ');
  rl.close();

  await page.goto('https://www.tabnews.com.br/perfil', { waitUntil: 'domcontentloaded' });
  await assertLoggedIn(page);

  const file = await saveSession(context);
  await browser.close();

  console.log(`Sessão do TabNews salva com sucesso em: ${file}`);
  return file;
}

export async function checkSession(): Promise<{ ok: boolean; path: string; message: string }> {
  const file = statePath();
  if (!fs.existsSync(file)) {
    return { ok: false, path: file, message: 'Nenhuma sessão encontrada. Execute: tabnews-publisher login' };
  }

  const { loadContext, assertLoggedIn } = await import('./browser.js');
  try {
    const { context, page } = await loadContext(true);
    await assertLoggedIn(page);
    await context.close();
    return { ok: true, path: file, message: 'Sessão do TabNews está ativa e válida!' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, path: file, message: msg };
  }
}
import fs from 'node:fs';
