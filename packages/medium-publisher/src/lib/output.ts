import type { StoryExtract } from './medium/extract-story.js';

export type PublishStatus = 'draft' | 'published' | 'dry-run';

export type PublishResult = {
  ok: boolean;
  mode: 'import' | 'publish';
  medium_url?: string;
  canonical_url?: string;
  status: PublishStatus;
  screenshot?: string;
  message?: string;
  error?: string;
  extract?: StoryExtract;
};

export function printResult(result: PublishResult, asJson: boolean): number {
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.ok) {
    console.log(`OK [${result.mode}] status=${result.status}`);
    if (result.medium_url) console.log(`URL: ${result.medium_url}`);
    if (result.canonical_url) console.log(`Canonical: ${result.canonical_url}`);
    if (result.screenshot) console.log(`Screenshot: ${result.screenshot}`);
    if (result.message) console.log(result.message);
    if (result.extract?.flags.length) {
      console.log(`Extract flags: ${result.extract.flags.length}`);
    }
  } else {
    console.error(`FAIL [${result.mode}] ${result.error ?? 'unknown error'}`);
    if (result.screenshot) console.error(`Screenshot: ${result.screenshot}`);
  }

  if (!result.ok) return result.status === 'dry-run' ? 5 : 1;
  return result.status === 'dry-run' ? 5 : 0;
}

export class SessionError extends Error {
  readonly exitCode = 3;
  constructor(message: string) {
    super(message);
    this.name = 'SessionError';
  }
}

export class TimeoutError extends Error {
  readonly exitCode = 4;
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

export function printJson(value: unknown): void {
  console.log(JSON.stringify(value, null, 2));
}

export function printJsonExit(value: { ok: boolean }, asJson: boolean): number {
  if (asJson) printJson(value);
  else if (value.ok) console.log('OK');
  else console.error('FAIL');
  return value.ok ? 0 : 1;
}
