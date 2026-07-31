export type PublishStatus = 'draft' | 'published' | 'dry-run';

export type PublishResult = {
  ok: boolean;
  linkedin_url?: string;
  source_url?: string;
  status: PublishStatus;
  screenshot?: string;
  message?: string;
  error?: string;
  details?: {
    title?: string;
    cover_image?: boolean;
    content_images?: number;
    blocks?: number;
    devto_url?: string;
  };
};

export function printResult(result: PublishResult, asJson: boolean): number {
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.ok) {
    console.log(`OK status=${result.status}`);
    if (result.linkedin_url) console.log(`URL: ${result.linkedin_url}`);
    if (result.source_url) console.log(`Source: ${result.source_url}`);
    if (result.screenshot) console.log(`Screenshot: ${result.screenshot}`);
    if (result.message) console.log(result.message);
    if (result.details) console.log(`Details: ${JSON.stringify(result.details)}`);
  } else {
    console.error(`FAIL ${result.error ?? 'unknown error'}`);
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
