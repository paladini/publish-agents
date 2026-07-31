import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP_DIR = path.join(
  process.env.LINKEDIN_PUBLISHER_HOME ??
    (process.platform === 'win32'
      ? path.join(process.env.LOCALAPPDATA ?? os.homedir(), 'linkedin-publisher')
      : path.join(os.homedir(), '.local', 'share', 'linkedin-publisher')),
);

export function appDir(): string {
  fs.mkdirSync(APP_DIR, { recursive: true });
  return APP_DIR;
}

export function configPath(): string {
  const dir =
    process.env.LINKEDIN_PUBLISHER_CONFIG_DIR ??
    (process.platform === 'win32'
      ? path.join(process.env.APPDATA ?? os.homedir(), 'linkedin-publisher')
      : path.join(os.homedir(), '.config', 'linkedin-publisher'));
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, 'config.json');
}

export function statePath(): string {
  return process.env.LINKEDIN_STATE_PATH ?? path.join(appDir(), 'storageState.json');
}

export function artifactsDir(): string {
  const dir = path.join(appDir(), 'artifacts');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function tempDir(): string {
  const dir = path.join(appDir(), 'tmp');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

export function timestampSlug(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
