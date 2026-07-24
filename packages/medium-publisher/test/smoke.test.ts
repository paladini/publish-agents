import { describe, expect, it } from 'vitest';
import { loadConfig } from '../src/lib/config.js';
import { MEDIUM_URLS } from '../src/lib/medium/selectors.js';
import { defaultChromeUserDataDir } from '../src/lib/browser-launch.js';

describe('config', () => {
  it('defaults to system-profile browser for login', () => {
    const cfg = loadConfig();
    expect(cfg.browserMode).toBe('system-profile');
    expect(cfg.browserChannel).toBe('chrome');
    expect(cfg.importTimeoutMs).toBeGreaterThan(0);
  });
});

describe('browser paths', () => {
  it('detects Chrome user data on Windows dev machines', () => {
    const dir = defaultChromeUserDataDir();
    if (process.platform === 'win32') {
      expect(dir === null || dir.includes('Chrome')).toBe(true);
    } else {
      expect(dir === null || dir.includes('google-chrome')).toBe(true);
    }
  });
});
