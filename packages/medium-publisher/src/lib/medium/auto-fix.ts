import type { Page } from 'patchright';
import type { FixAction } from './fix-draft.js';
import { applyFixesOnPage } from './fix-draft.js';
import { extractStoryFromPage, type StoryExtract } from './extract-story.js';

export function buildFixActionsFromExtract(extract: StoryExtract): FixAction[] {
  const actions: FixAction[] = [
    { type: 'removeEmptyCodeBlocks' },
  ];

  const seen = new Set<number>();

  for (const flag of extract.flags) {
    if (flag.blockIndex === undefined || seen.has(flag.blockIndex)) continue;
    const block = extract.blocks[flag.blockIndex];
    if (!block) continue;

    switch (flag.code) {
      case 'raw_markdown_heading': {
        const match = block.text.match(/^(#{1,6})\s+(.+)$/);
        if (match?.[1] && match[2]) {
          const level = match[1].length <= 2 ? 2 : 3;
          actions.push({ type: 'replaceBlockText', blockIndex: flag.blockIndex, text: match[2] });
          actions.push({
            type: 'promoteDemoteHeading',
            blockIndex: flag.blockIndex,
            level: level as 2 | 3,
          });
          seen.add(flag.blockIndex);
        }
        break;
      }
      case 'raw_markdown_fence':
        actions.push({ type: 'replaceBlockText', blockIndex: flag.blockIndex, text: '' });
        seen.add(flag.blockIndex);
        break;
      default:
        break;
    }
  }

  return actions;
}

const CRITICAL_FLAG_CODES = new Set([
  'empty_code_block',
  'adjacent_code_blocks',
  'raw_markdown_heading',
  'raw_markdown_fence',
]);

export function hasCriticalFlags(extract: StoryExtract): boolean {
  return extract.flags.some((f) => CRITICAL_FLAG_CODES.has(f.code));
}

export async function runAutoFixLoop(
  page: Page,
  maxIterations = 3,
): Promise<{ applied: string[]; extract: StoryExtract }> {
  const applied: string[] = [];
  let extract = await extractStoryFromPage(page);
  let previousFingerprint = '';

  for (let i = 0; i < maxIterations; i++) {
    if (!hasCriticalFlags(extract)) break;

    const fingerprint = extract.blocks
      .map((block) => `${block.type}:${block.text}`)
      .join('|');
    if (fingerprint === previousFingerprint) break;
    previousFingerprint = fingerprint;

    const actions = buildFixActionsFromExtract(extract);
    const structural = actions.filter(
      (action) => action.type === 'removeEmptyCodeBlocks' || action.type === 'mergeAdjacentCodeBlocks',
    );
    if (structural.length > 0) {
      applied.push(...(await applyFixesOnPage(page, structural)));
      extract = await extractStoryFromPage(page);
    }

    const indexed = buildFixActionsFromExtract(extract).filter(
      (action) => action.type !== 'removeEmptyCodeBlocks' && action.type !== 'mergeAdjacentCodeBlocks',
    );
    if (indexed.length > 0) {
      applied.push(...(await applyFixesOnPage(page, indexed)));
      extract = await extractStoryFromPage(page);
    }
  }

  return { applied, extract };
}
