import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const APP_DIR = path.join(
  process.env.TABNEWS_PUBLISHER_HOME ??
    (process.platform === 'win32'
      ? path.join(process.env.LOCALAPPDATA ?? os.homedir(), 'tabnews-publisher')
      : path.join(os.homedir(), '.local', 'share', 'tabnews-publisher')),
);

export function appDir(): string {
  fs.mkdirSync(APP_DIR, { recursive: true });
  return APP_DIR;
}

export function statePath(): string {
  return process.env.TABNEWS_STATE_PATH ?? path.join(appDir(), 'storageState.json');
}

export function artifactsDir(): string {
  const dir = path.join(appDir(), 'artifacts');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}
