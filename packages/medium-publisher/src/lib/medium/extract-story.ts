import type { Page } from 'patchright';
import { loadConfig } from '../config.js';
import { assertLoggedIn, withBrowser } from '../browser.js';
import {
  getStoryTitle,
  openDraft,
  storyBlockLocators,
  waitForStoryEditor,
} from './editor-utils.js';

export type StoryBlockType =
  | 'title'
  | 'paragraph'
  | 'heading2'
  | 'heading3'
  | 'code'
  | 'list'
  | 'image'
  | 'quote'
  | 'unknown';

export type StoryBlock = {
  index: number;
  type: StoryBlockType;
  text: string;
  lang?: string;
};

export type StoryExtractFlagCode =
  | 'empty_code_block'
  | 'adjacent_code_blocks'
  | 'raw_markdown_heading'
  | 'raw_markdown_fence'
  | 'empty_paragraph';

export type StoryExtractFlag = {
  code: StoryExtractFlagCode;
  blockIndex?: number;
  message: string;
};

export type StoryExtract = {
  title: string;
  blocks: StoryBlock[];
  medium_url: string;
  wordCount: number;
  codeBlockCount: number;
  flags: StoryExtractFlag[];
};

export type ExtractStoryOptions = {
  url: string;
};

export type ExtractResult = {
  ok: boolean;
  extract?: StoryExtract;
  medium_url?: string;
  error?: string;
};

function classifyBlock(className: string, tagName: string): StoryBlockType {
  const cls = className.toLowerCase();
  if (cls.includes('graf--title') || tagName === 'h1') return 'title';
  if (cls.includes('graf--h2') || tagName === 'h2') return 'heading2';
  if (cls.includes('graf--h3') || tagName === 'h3') return 'heading3';
  if (cls.includes('graf--pre') || tagName === 'pre') return 'code';
  if (cls.includes('graf--ul') || cls.includes('graf--ol') || tagName === 'ul' || tagName === 'ol')
    return 'list';
  if (cls.includes('graf--figure') || tagName === 'figure') return 'image';
  if (cls.includes('graf--blockquote') || tagName === 'blockquote') return 'quote';
  if (cls.includes('graf--p') || tagName === 'p') return 'paragraph';
  return 'unknown';
}

function detectFlags(blocks: StoryBlock[]): StoryExtractFlag[] {
  const flags: StoryExtractFlag[] = [];

  for (const block of blocks) {
    if (block.type === 'code' && !block.text.trim()) {
      flags.push({
        code: 'empty_code_block',
        blockIndex: block.index,
        message: `Empty code block at index ${block.index}`,
      });
    }
    if (block.type === 'paragraph' && !block.text.trim()) {
      flags.push({
        code: 'empty_paragraph',
        blockIndex: block.index,
        message: `Empty paragraph at index ${block.index}`,
      });
    }
    if (/^#{1,6}\s+\S/.test(block.text)) {
      flags.push({
        code: 'raw_markdown_heading',
        blockIndex: block.index,
        message: `Raw markdown heading at index ${block.index}: ${block.text.slice(0, 60)}`,
      });
    }
    if (/^```/.test(block.text.trim()) || block.text.trim() === '```') {
      flags.push({
        code: 'raw_markdown_fence',
        blockIndex: block.index,
        message: `Raw markdown fence at index ${block.index}`,
      });
    }
  }

  for (let i = 0; i < blocks.length - 1; i++) {
    if (blocks[i]?.type === 'code' && blocks[i + 1]?.type === 'code') {
      flags.push({
        code: 'adjacent_code_blocks',
        blockIndex: blocks[i]?.index,
        message: `Adjacent code blocks at indexes ${blocks[i]?.index} and ${blocks[i + 1]?.index}`,
      });
    }
  }

  return flags;
}

export async function extractStoryFromPage(page: Page): Promise<StoryExtract> {
  await waitForStoryEditor(page);
  const title = await getStoryTitle(page);
  const locators = await storyBlockLocators(page);
  const blocks: StoryBlock[] = [];

  for (let index = 0; index < locators.length; index++) {
    const block = locators[index]!;
    const meta = await block.evaluate((el) => ({
      className: el.className ?? '',
      tagName: el.tagName.toLowerCase(),
      text: (el.textContent ?? '').replace(/\u00a0/g, ' ').trim(),
      lang: el.querySelector('code')?.getAttribute('data-lang') ?? undefined,
    }));
    blocks.push({
      index,
      type: classifyBlock(meta.className, meta.tagName),
      text: meta.text,
      lang: meta.lang,
    });
  }

  const wordCount = blocks.reduce((sum, b) => sum + (b.text ? b.text.split(/\s+/).length : 0), 0);
  const codeBlockCount = blocks.filter((b) => b.type === 'code').length;

  return {
    title,
    blocks,
    medium_url: page.url(),
    wordCount,
    codeBlockCount,
    flags: detectFlags(blocks),
  };
}

export async function extractStory(options: ExtractStoryOptions): Promise<ExtractResult> {
  const config = loadConfig();
  try {
    return await withBrowser(
      async ({ page }) => {
        await assertLoggedIn(page, config.username || undefined);
        await openDraft(page, options.url);
        const extract = await extractStoryFromPage(page);
        return { ok: true, extract, medium_url: page.url() };
      },
      { requireSession: true },
    );
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      medium_url: options.url,
    };
  }
}
