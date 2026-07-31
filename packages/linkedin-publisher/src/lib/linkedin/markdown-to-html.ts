export type ContentImage = {
  url: string;
  alt: string;
  blockIndex: number;
  afterText: string;
};

export type LinkedInArticleContent = {
  title: string;
  html: string;
  coverImageUrl: string | null;
  contentImages: ContentImage[];
  totalBlocks: number;
  attributionHtml: string;
};

type Block =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; level: 2 | 3; text: string }
  | { type: 'blockquote'; text: string }
  | { type: 'code'; text: string; lang?: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'image'; url: string; alt: string }
  | { type: 'hr' };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineMarkdown(text: string): string {
  let out = escapeHtml(text);
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/_([^_]+)_/g, '<em>$1</em>');
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return out;
}

function stripFrontmatter(markdown: string): string {
  if (markdown.startsWith('---')) {
    const end = markdown.indexOf('\n---', 3);
    if (end !== -1) return markdown.slice(end + 4).trimStart();
  }
  return markdown;
}

function extractTitle(markdown: string, fallbackTitle?: string): { title: string; body: string } {
  const lines = markdown.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i]?.match(/^#\s+(.+)$/);
    if (match?.[1]) {
      const title = match[1].trim();
      const body = [...lines.slice(0, i), ...lines.slice(i + 1)].join('\n').trimStart();
      return { title, body };
    }
  }
  return { title: fallbackTitle ?? 'Untitled', body: markdown };
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i] ?? '';

    if (/^```/.test(line)) {
      const lang = line.slice(3).trim() || undefined;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i] ?? '')) {
        codeLines.push(lines[i] ?? '');
        i++;
      }
      i++;
      blocks.push({ type: 'code', text: codeLines.join('\n'), lang });
      continue;
    }

    if (/^!\[([^\]]*)\]\(([^)]+)\)/.test(line.trim())) {
      const match = line.trim().match(/^!\[([^\]]*)\]\(([^)]+)\)/);
      if (match) {
        blocks.push({ type: 'image', url: match[2] ?? '', alt: match[1] ?? '' });
        i++;
        continue;
      }
    }

    if (/^#{2,3}\s+/.test(line)) {
      const level = line.startsWith('###') ? 3 : 2;
      const text = line.replace(/^#{2,3}\s+/, '').trim();
      blocks.push({ type: 'heading', level, text });
      i++;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i] ?? '')) {
        quoteLines.push((lines[i] ?? '').replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ type: 'blockquote', text: quoteLines.join('\n') });
      continue;
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^[-*+]\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: false, items });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i] ?? '')) {
        items.push((lines[i] ?? '').replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'list', ordered: true, items });
      continue;
    }

    if (/^---+$/.test(line.trim()) || /^\*\*\*+$/.test(line.trim())) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    const paraLines: string[] = [];
    while (i < lines.length && (lines[i] ?? '').trim() !== '' && !/^(#{2,3}|>|[-*+]|\d+\.|```|!\[|---|\*\*\*)/.test(lines[i] ?? '')) {
      paraLines.push(lines[i] ?? '');
      i++;
    }
    if (paraLines.length) {
      blocks.push({ type: 'paragraph', text: paraLines.join('\n') });
    }
  }

  return blocks;
}

function blockToHtml(block: Block): string {
  switch (block.type) {
    case 'paragraph':
      return `<p>${inlineMarkdown(block.text).replace(/\n/g, '<br>')}</p>`;
    case 'heading':
      return `<h${block.level}>${inlineMarkdown(block.text)}</h${block.level}>`;
    case 'blockquote':
      return `<blockquote><p>${inlineMarkdown(block.text).replace(/\n/g, '<br>')}</p></blockquote>`;
    case 'code':
      return `<blockquote><p><code>${escapeHtml(block.text).replace(/\n/g, '<br>')}</code></p></blockquote>`;
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const items = block.items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join('');
      return `<${tag}>${items}</${tag}>`;
    }
    case 'hr':
      return '<hr>';
    case 'image':
      return '';
  }
}

function blockCountsAsContent(block: Block): boolean {
  return block.type !== 'image' && block.type !== 'hr';
}

export function markdownToLinkedInContent(
  markdown: string,
  options: {
    fallbackTitle?: string;
    coverImageUrl?: string | null;
    sourceUrl?: string;
    sourceAttribution?: boolean;
  } = {},
): LinkedInArticleContent {
  const cleaned = stripFrontmatter(markdown);
  const { title, body } = extractTitle(cleaned, options.fallbackTitle);
  const blocks = parseBlocks(body);

  const contentImages: ContentImage[] = [];
  let blockIndex = 0;
  const htmlParts: string[] = [];

  for (const block of blocks) {
    if (block.type === 'image') {
      contentImages.push({
        url: block.url,
        alt: block.alt,
        blockIndex: Math.max(0, blockIndex - 1),
        afterText: block.alt || block.url,
      });
      continue;
    }

    const html = blockToHtml(block);
    if (html) htmlParts.push(html);
    if (blockCountsAsContent(block)) blockIndex++;
  }

  let coverImageUrl = options.coverImageUrl ?? null;
  if (!coverImageUrl) {
    const firstImage = contentImages.shift();
    if (firstImage) coverImageUrl = firstImage.url;
  }

  const attributionHtml =
    options.sourceAttribution !== false && options.sourceUrl
      ? `<p><em>Publicado originalmente em <a href="${escapeHtml(options.sourceUrl)}">DEV.to</a>.</em></p>`
      : '';

  if (attributionHtml) {
    htmlParts.push(attributionHtml);
    blockIndex++;
  }

  return {
    title,
    html: htmlParts.join('\n'),
    coverImageUrl,
    contentImages,
    totalBlocks: blockIndex,
    attributionHtml,
  };
}

export function prepareDevtoArticleForLinkedIn(
  article: {
    title: string;
    description: string;
    body_markdown: string;
    url: string;
    cover_image: string | null;
    social_image: string | null;
  },
): LinkedInArticleContent {
  return markdownToLinkedInContent(article.body_markdown, {
    fallbackTitle: article.title,
    coverImageUrl: article.cover_image || article.social_image,
    sourceUrl: article.url,
    sourceAttribution: true,
  });
}
