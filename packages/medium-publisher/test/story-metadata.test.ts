import { describe, expect, it } from 'vitest';
import { parseDevtoTags, truncateSeoDescription } from '../src/lib/medium/story-metadata.js';
import { parseSourceBlocks, reviewSourceAgainstExtract } from '../src/lib/medium/source-review.js';

describe('truncateSeoDescription', () => {
  it('returns short text unchanged', () => {
    expect(truncateSeoDescription('Hello world')).toBe('Hello world');
  });

  it('truncates long text near word boundary', () => {
    const text = 'A'.repeat(100) + ' ' + 'B'.repeat(50);
    const result = truncateSeoDescription(text, 140);
    expect(result.length).toBeLessThanOrEqual(141);
    expect(result.endsWith('…')).toBe(true);
  });

  it('collapses whitespace', () => {
    expect(truncateSeoDescription('foo   bar')).toBe('foo bar');
  });
});

describe('parseDevtoTags', () => {
  it('parses comma-separated tags and caps at five', () => {
    expect(parseDevtoTags('git, python, tutorial, i18n, devops, extra')).toEqual([
      'git',
      'python',
      'tutorial',
      'i18n',
      'devops',
    ]);
  });
});

describe('source formatting review', () => {
  it('parses headings, code, lists, and paragraphs from source markdown', () => {
    const blocks = parseSourceBlocks('Intro.\n\n## Setup\n\n```ts\nconst x = 1;\n```\n\n- one\n- two');
    expect(blocks.map((block) => block.type)).toEqual(['paragraph', 'heading2', 'code', 'list']);
  });

  it('creates a safe code replacement when Medium changed imported code', () => {
    const review = reviewSourceAgainstExtract('```ts\nconst x = 1;\n```', {
      title: 'Example',
      medium_url: 'https://medium.com/p/example/edit',
      wordCount: 3,
      codeBlockCount: 1,
      flags: [],
      blocks: [
        { index: 0, type: 'title', text: 'Example' },
        { index: 1, type: 'code', text: 'const x=1;' },
      ],
    });

    expect(review.critical).toBe(true);
    expect(review.actions).toContainEqual({ type: 'replaceBlockText', blockIndex: 1, text: 'const x = 1;' });
  });
});
