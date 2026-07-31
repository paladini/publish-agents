import { describe, expect, it } from 'vitest';
import { markdownToLinkedInContent } from '../src/lib/linkedin/markdown-to-html.js';

const SAMPLE = `# My Article Title

Intro paragraph with **bold** and [a link](https://example.com).

## Section One

Some code:

\`\`\`typescript
const x = 1;
\`\`\`

> A blockquote here

- item one
- item two

1. first
2. second

![diagram](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/abc.png)

Final paragraph.
`;

describe('markdownToLinkedInContent', () => {
  it('extracts H1 as title and excludes from body', () => {
    const result = markdownToLinkedInContent(SAMPLE);
    expect(result.title).toBe('My Article Title');
    expect(result.html).not.toContain('My Article Title');
    expect(result.html).toContain('<h2>Section One</h2>');
  });

  it('converts code blocks to blockquotes', () => {
    const result = markdownToLinkedInContent(SAMPLE);
    expect(result.html).toContain('<blockquote>');
    expect(result.html).toContain('<code>const x = 1;</code>');
  });

  it('tracks inline images with block index', () => {
    const result = markdownToLinkedInContent(SAMPLE, {
      coverImageUrl: 'https://cover.example/cover.jpg',
    });
    expect(result.coverImageUrl).toBe('https://cover.example/cover.jpg');
    expect(result.contentImages).toHaveLength(1);
    expect(result.contentImages[0]?.url).toContain('abc.png');
  });

  it('adds source attribution footer', () => {
    const result = markdownToLinkedInContent('## Only heading\n\nBody.', {
      fallbackTitle: 'Fallback',
      sourceUrl: 'https://dev.to/user/post',
    });
    expect(result.html).toContain('Publicado originalmente em');
    expect(result.html).toContain('https://dev.to/user/post');
  });

  it('handles bold, links, and lists', () => {
    const result = markdownToLinkedInContent(SAMPLE);
    expect(result.html).toContain('<strong>bold</strong>');
    expect(result.html).toContain('<a href="https://example.com">a link</a>');
    expect(result.html).toContain('<ul>');
    expect(result.html).toContain('<ol>');
  });
});
