import { describe, expect, it } from 'vitest';
import {
  hasMinimumStoryBlocks,
  isStoryEditorUrl,
  storyContentScore,
} from '../src/lib/medium/editor-utils.js';
import { buildFixActionsFromExtract } from '../src/lib/medium/auto-fix.js';
import { SELECTORS } from '../src/lib/medium/selectors.js';

describe('editor utilities', () => {
  it('recognizes Medium story editor URLs but not the import page', () => {
    expect(isStoryEditorUrl('https://medium.com/p/abc123/edit')).toBe(true);
    expect(isStoryEditorUrl('https://medium.com/p/import')).toBe(false);
  });

  it('prefers a populated graf body over a generic contenteditable', () => {
    const bodyScore = storyContentScore(12, 10, 900);
    const emptyEditorScore = storyContentScore(1, 0, 0);

    expect(bodyScore).toBeGreaterThan(emptyEditorScore);
  });

  it('does not accept an incomplete imported body', () => {
    expect(hasMinimumStoryBlocks(2, 3)).toBe(false);
    expect(hasMinimumStoryBlocks(3, 3)).toBe(true);
  });

  it('only targets editable title elements', () => {
    expect(SELECTORS.titleInput).not.toContain('h1[data-default-text="Title"]');
    expect(SELECTORS.titleInput[0]).toBe('[data-testid="editorTitleParagraph"]');
  });

  it('does not merge adjacent code blocks automatically', () => {
    const actions = buildFixActionsFromExtract({
      title: 'Example',
      medium_url: 'https://medium.com/p/example/edit',
      wordCount: 4,
      codeBlockCount: 2,
      flags: [{ code: 'adjacent_code_blocks', blockIndex: 1, message: 'adjacent' }],
      blocks: [
        { index: 0, type: 'title', text: 'Example' },
        { index: 1, type: 'code', text: 'one' },
        { index: 2, type: 'code', text: 'two' },
      ],
    });

    expect(actions).not.toContainEqual({ type: 'mergeAdjacentCodeBlocks' });
  });
});
