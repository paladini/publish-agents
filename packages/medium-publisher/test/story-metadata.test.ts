import { describe, expect, it } from 'vitest';
import { parseDevtoTags, truncateSeoDescription } from '../src/lib/medium/story-metadata.js';

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
