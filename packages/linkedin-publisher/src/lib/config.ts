import fs from 'node:fs';
import { configPath } from './paths.js';

export type LinkedInPublisherConfig = {
  /** Default false — save as draft unless explicitly publishing */
  publishByDefault?: boolean;
  headless?: boolean;
  slowMo?: number;
  saveTimeoutMs?: number;
  editorTimeoutMs?: number;
};

const DEFAULTS: Required<LinkedInPublisherConfig> = {
  publishByDefault: false,
  headless: false,
  slowMo: 0,
  saveTimeoutMs: 30_000,
  editorTimeoutMs: 60_000,
};

export function loadConfig(): Required<LinkedInPublisherConfig> {
  const file = configPath();
  if (!fs.existsSync(file)) return { ...DEFAULTS };
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as LinkedInPublisherConfig;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveConfig(partial: LinkedInPublisherConfig): void {
  const current = loadConfig();
  fs.writeFileSync(configPath(), `${JSON.stringify({ ...current, ...partial }, null, 2)}\n`, 'utf8');
}
