export type PublishStatus = 'draft' | 'published' | 'dry-run';

export type PublishResult = {
  ok: boolean;
  tabnews_url?: string;
  source_url?: string;
  status: PublishStatus;
  screenshot?: string;
  message?: string;
  error?: string;
};

export function printResult(result: PublishResult, asJson: boolean): number {
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.ok) {
    console.log(`OK status=${result.status}`);
    if (result.tabnews_url) console.log(`URL: ${result.tabnews_url}`);
    if (result.source_url) console.log(`Source: ${result.source_url}`);
    if (result.screenshot) console.log(`Screenshot: ${result.screenshot}`);
    if (result.message) console.log(result.message);
  } else {
    console.error(`FAIL ${result.error ?? 'unknown error'}`);
    if (result.screenshot) console.error(`Screenshot: ${result.screenshot}`);
  }

  if (!result.ok) return result.status === 'dry-run' ? 5 : 1;
  return result.status === 'dry-run' ? 5 : 0;
}
