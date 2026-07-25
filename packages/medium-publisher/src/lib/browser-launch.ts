import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import {
  chromium,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
} from 'patchright';
import { loadConfig, type BrowserChannel, type BrowserMode } from './config.js';
import { appDir } from './paths.js';

export type LoginBrowserHandle = {
  browser: Browser | null;
  context: BrowserContext;
  page: Page;
  mode: BrowserMode;
  close: () => Promise<void>;
};

export type LoginBrowserOptions = {
  mode?: BrowserMode;
  channel?: BrowserChannel;
  userDataDir?: string;
  cdpUrl?: string;
  slowMo?: number;
};

function localAppData(...parts: string[]): string {
  return path.join(process.env.LOCALAPPDATA ?? path.join(os.homedir(), 'AppData', 'Local'), ...parts);
}

/** Default Chrome profile directory on this machine. */
export function defaultChromeUserDataDir(): string | null {
  const dir = localAppData('Google', 'Chrome', 'User Data');
  return fs.existsSync(dir) ? dir : null;
}

/** Default Edge profile directory on this machine. */
export function defaultEdgeUserDataDir(): string | null {
  const dir = localAppData('Microsoft', 'Edge', 'User Data');
  return fs.existsSync(dir) ? dir : null;
}

export function resolveUserDataDir(channel: BrowserChannel, override?: string): string {
  if (override?.trim()) return override.trim();
  const dir = channel === 'msedge' ? defaultEdgeUserDataDir() : defaultChromeUserDataDir();
  if (!dir) {
    throw new Error(
      `Could not find ${channel === 'msedge' ? 'Edge' : 'Chrome'} user data directory on this machine.`,
    );
  }
  return dir;
}

export function isBrowserProcessRunning(channel: BrowserChannel): boolean {
  if (process.platform !== 'win32') {
    try {
      const name = channel === 'msedge' ? 'msedge' : 'chrome';
      execSync(`pgrep -x ${name}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }
  const image = channel === 'msedge' ? 'msedge.exe' : 'chrome.exe';
  try {
    const out = execSync(`tasklist /FI "IMAGENAME eq ${image}" /NH`, { encoding: 'utf8' });
    return out.toLowerCase().includes(image.toLowerCase());
  } catch {
    return false;
  }
}

function browserExecutable(channel: BrowserChannel): string | null {
  if (process.platform !== 'win32') return null;
  if (channel === 'msedge') {
    const candidates = [
      path.join(process.env['ProgramFiles(x86)'] ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(process.env.ProgramFiles ?? '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    ];
    return candidates.find((p) => p && fs.existsSync(p)) ?? null;
  }
  const candidates = [
    path.join(process.env.ProgramFiles ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    path.join(process.env['ProgramFiles(x86)'] ?? '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    localAppData('Google', 'Chrome', 'Application', 'chrome.exe'),
  ];
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

export function startDebugBrowser(options: LoginBrowserOptions = {}): void {
  const config = loadConfig();
  const channel = options.channel ?? config.browserChannel;
  const userDataDir = resolveUserDataDir(channel, options.userDataDir ?? config.userDataDir);
  const port = new URL(config.cdpUrl).port || '9222';

  if (isBrowserProcessRunning(channel)) {
    throw new Error(
      `Close all ${channel === 'msedge' ? 'Edge' : 'Chrome'} windows first, then run browser-start again.`,
    );
  }

  const exe = browserExecutable(channel);
  if (!exe) {
    throw new Error(`Could not find ${channel === 'msedge' ? 'Edge' : 'Chrome'} executable.`);
  }

  console.log(`Starting ${channel} with your default profile and remote debugging on port ${port}…`);
  console.log(`Profile: ${userDataDir}`);
  console.log('');
  console.log('Then run: medium-publisher login --browser cdp');
  console.log('');

  if (process.platform === 'win32') {
    execSync(
      `start "" "${exe}" --remote-debugging-port=${port} --user-data-dir="${userDataDir}" --profile-directory=Default`,
      { stdio: 'inherit', shell: 'cmd.exe' },
    );
    return;
  }

  spawn(
    exe,
    [`--remote-debugging-port=${port}`, `--user-data-dir=${userDataDir}`, '--profile-directory=Default'],
    { detached: true, stdio: 'ignore' },
  ).unref();
}

export async function openLoginBrowser(options: LoginBrowserOptions = {}): Promise<LoginBrowserHandle> {
  const config = loadConfig();
  const mode = options.mode ?? config.browserMode;
  const channel = options.channel ?? config.browserChannel;
  const slowMo = options.slowMo ?? config.slowMo;
  const cdpUrl = options.cdpUrl ?? config.cdpUrl;

  if (mode === 'cdp') {
    let browser: Browser;
    try {
      browser = await chromium.connectOverCDP(cdpUrl);
    } catch {
      throw new Error(
        `Could not connect to ${cdpUrl}. Run: medium-publisher browser-start — then retry login --browser cdp`,
      );
    }
    const context = browser.contexts()[0] ?? (await browser.newContext());
    const page = context.pages()[0] ?? (await context.newPage());
    return {
      browser,
      context,
      page,
      mode,
      close: async () => {
        await browser.close();
      },
    };
  }

  if (mode === 'system-profile') {
    const userDataDir = resolveUserDataDir(channel, options.userDataDir ?? config.userDataDir);
    if (isBrowserProcessRunning(channel)) {
      throw new Error(
        `Close all ${channel === 'msedge' ? 'Edge' : 'Chrome'} windows first to use your logged-in profile,\n` +
          `or use: medium-publisher browser-start  then  medium-publisher login --browser cdp`,
      );
    }
    const dir = options.userDataDir?.trim() || userDataDir;
    const args: string[] = [];
    if (options.userDataDir?.trim()) {
      // User provided explicit user-data-dir
    }
    const context = await chromium.launchPersistentContext(dir, {
      channel,
      headless: false,
      slowMo,
      args,
      ignoreDefaultArgs: ['--enable-automation'],
      viewport: null,
    });
    const page = context.pages()[0] ?? (await context.newPage());
    return {
      browser: null,
      context,
      page,
      mode,
      close: async () => {
        await context.close();
      },
    };
  }

  const launchOptions = {
    headless: false,
    slowMo,
    ...(mode === 'chrome' || mode === 'edge' ? { channel: mode === 'edge' ? 'msedge' : 'chrome' } : {}),
  } satisfies Parameters<typeof chromium.launch>[0];

  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext({ viewport: null } as BrowserContextOptions);
  const page = await context.newPage();
  return {
    browser,
    context,
    page,
    mode,
    close: async () => {
      await context.close();
      await browser.close();
    },
  };
}

export function describeBrowserMode(mode: BrowserMode, channel: BrowserChannel): string {
  switch (mode) {
    case 'system-profile':
      return `your ${channel === 'msedge' ? 'Edge' : 'Chrome'} profile (Default)`;
    case 'cdp':
      return `CDP attach (${channel} with remote debugging)`;
    case 'chrome':
      return 'installed Google Chrome (isolated session)';
    case 'edge':
      return 'installed Microsoft Edge (isolated session)';
    default:
      return 'Playwright Chromium (isolated session)';
  }
}
