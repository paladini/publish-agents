import fs from 'node:fs';
import { configPath } from './paths.js';

/** How login opens a browser. Publish commands always use saved storageState + bundled Chromium. */
export type BrowserMode = 'bundled' | 'chrome' | 'edge' | 'system-profile' | 'cdp';

/** Installed browser for system-profile / browser-start. */
export type BrowserChannel = 'chrome' | 'msedge';

export type MediumPublisherConfig = {
  /** Default: false — save as draft unless --publish */
  publishByDefault?: boolean;
  /** headless browser for publish commands (login always headful) */
  headless?: boolean;
  /** slowMo ms for debugging selectors */
  slowMo?: number;
  /** Expected Medium @username for session validation */
  username?: string;
  /** Import preview timeout ms */
  importTimeoutMs?: number;
  /** Wait for draft autosave after import/edit */
  saveTimeoutMs?: number;
  /** Login browser mode — use system-profile or cdp to reuse your logged-in browser */
  browserMode?: BrowserMode;
  /** chrome or msedge when using system-profile / browser-start */
  browserChannel?: BrowserChannel;
  /** Override profile path; empty = auto-detect */
  userDataDir?: string;
  /** CDP endpoint for --browser cdp */
  cdpUrl?: string;
};

const DEFAULTS: Required<MediumPublisherConfig> = {
  publishByDefault: false,
  headless: false,
  slowMo: 0,
  username: '',
  importTimeoutMs: 120_000,
  saveTimeoutMs: 30_000,
  browserMode: 'bundled',
  browserChannel: 'chrome',
  userDataDir: '',
  cdpUrl: 'http://127.0.0.1:9222',
};

export function loadConfig(): Required<MediumPublisherConfig> {
  const envDir = process.env.MEDIUM_USER_DATA_DIR;
  const file = configPath();
  if (!fs.existsSync(file)) {
    return { ...DEFAULTS, ...(envDir ? { userDataDir: envDir } : {}) };
  }
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as MediumPublisherConfig;
    return {
      ...DEFAULTS,
      ...parsed,
      ...(envDir ? { userDataDir: envDir } : {}),
    };
  } catch {
    return { ...DEFAULTS, ...(envDir ? { userDataDir: envDir } : {}) };
  }
}

export function saveConfig(partial: MediumPublisherConfig): void {
  const current = loadConfig();
  const next = { ...current, ...partial };
  fs.writeFileSync(configPath(), `${JSON.stringify(next, null, 2)}\n`, 'utf8');
}
