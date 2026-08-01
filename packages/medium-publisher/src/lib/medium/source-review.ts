import type { FixAction } from './fix-draft.js';
import type { StoryBlock, StoryExtract, StoryBlockType } from './extract-story.js';

type ExpectedBlock = {
  type: Extract<StoryBlockType, 'paragraph' | 'heading2' | 'heading3' | 'code' | 'list' | 'image' | 'quote'>;
  text: string;
};

export type SourceReview = {
  issues: string[];
  actions: FixAction[];
  critical: boolean;
};

function normalize(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function isFence(line: string): boolean {
  return /^\s*(```|~~~)/.test(line);
}

function isBoundary(line: string): boolean {
  return (
    !line.trim() ||
    /^\s*#{1,6}\s+/.test(line) ||
    isFence(line) ||
    /^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(line) ||
    /^\s*!\[[^\]]*\]\([^)]*\)/.test(line) ||
    /^\s*>\s?/.test(line)
  );
}

export function parseSourceBlocks(markdown: string): ExpectedBlock[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: ExpectedBlock[] = [];

  for (let i = 0; i < lines.length; ) {
    const line = lines[i] ?? '';
    if (!line.trim()) {
      i++;
      continue;
    }

    const fence = line.match(/^\s*(```|~~~)/)?.[1];
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !new RegExp(`^\\s*${fence}`).test(lines[i] ?? '')) {
        code.push(lines[i] ?? '');
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: 'code', text: code.join('\n').trim() });
      continue;
    }

    const heading = line.match(/^\s*(#{2,3})\s+(.+?)\s*#*\s*$/);
    if (/^\s*#\s+/.test(line)) {
      i++;
      continue;
    }
    if (heading) {
      blocks.push({
        type: heading[1].length === 2 ? 'heading2' : 'heading3',
        text: heading[2],
      });
      i++;
      continue;
    }

    if (/^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(line)) {
      const list: string[] = [];
      while (i < lines.length && /^\s*(?:[-*+]\s+|\d+[.)]\s+)/.test(lines[i] ?? '')) {
        list.push((lines[i] ?? '').replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/, '').trim());
        i++;
      }
      blocks.push({ type: 'list', text: list.join('\n') });
      continue;
    }

    if (/^\s*!\[[^\]]*\]\([^)]*\)/.test(line)) {
      blocks.push({ type: 'image', text: line.trim() });
      i++;
      continue;
    }

    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i] ?? '')) {
        quote.push((lines[i] ?? '').replace(/^\s*>\s?/, '').trim());
        i++;
      }
      blocks.push({ type: 'quote', text: quote.join('\n') });
      continue;
    }

    const paragraph: string[] = [line.trim()];
    i++;
    while (i < lines.length && !isBoundary(lines[i] ?? '')) {
      paragraph.push((lines[i] ?? '').trim());
      i++;
    }
    blocks.push({ type: 'paragraph', text: paragraph.join('\n') });
  }

  return blocks;
}

function bodyBlocks(extract: StoryExtract): StoryBlock[] {
  return extract.blocks.filter((block) => {
    if (block.type === 'title') return false;
    if (block.type === 'paragraph' && !block.text.trim()) return false;
    if ((block.type === 'heading2' || block.type === 'heading3') && !block.text.trim()) return false;
    if (block.type === 'image' && /type caption for image/i.test(block.text)) return false;
    return true;
  });
}

export function reviewSourceAgainstExtract(sourceMarkdown: string, extract: StoryExtract): SourceReview {
  const expected = parseSourceBlocks(sourceMarkdown);
  const actual = bodyBlocks(extract);
  const issues: string[] = [];
  const actions: FixAction[] = [];

  if (expected.length !== actual.length) {
    issues.push(`Block count differs: source=${expected.length}, medium=${actual.length}`);
  }

  const pairs = Math.min(expected.length, actual.length);
  for (let i = 0; i < pairs; i++) {
    const source = expected[i]!;
    const medium = actual[i]!;

    if (source.type !== medium.type) {
      issues.push(`Block ${i} type differs: source=${source.type}, medium=${medium.type}`);
      if (source.type === 'heading2' || source.type === 'heading3') {
        actions.push({
          type: 'replaceBlockText',
          blockIndex: medium.index,
          text: source.text,
        });
        actions.push({
          type: 'promoteDemoteHeading',
          blockIndex: medium.index,
          level: source.type === 'heading2' ? 2 : 3,
        });
      }
      continue;
    }

    if (source.type === 'code' && normalize(source.text) !== normalize(medium.text)) {
      issues.push(`Code block ${i} differs from DEV.to source`);
      actions.push({ type: 'replaceBlockText', blockIndex: medium.index, text: source.text });
    }

    if ((source.type === 'heading2' || source.type === 'heading3') && normalize(source.text) !== normalize(medium.text)) {
      issues.push(`Heading ${i} differs from DEV.to source`);
      actions.push({ type: 'replaceBlockText', blockIndex: medium.index, text: source.text });
    }
  }

  const critical = issues.length > 0 || extract.flags.length > 0;
  return { issues, actions, critical };
}
