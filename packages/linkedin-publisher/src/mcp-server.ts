#!/usr/bin/env node
/**
 * linkedin-publisher MCP server (v0.1.0)
 *
 * Cross-post DEV.to articles to LinkedIn Articles editor with Markdown
 * formatting adapted for LinkedIn (headings, lists, code as blockquotes, images).
 * Default behavior: save as draft.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkSession } from './lib/linkedin/session.js';
import { publishFromDevto, publishArticle } from './lib/linkedin/publish-from-devto.js';
import { prepareDevtoArticleForLinkedIn } from './lib/linkedin/markdown-to-html.js';
import { fetchDevtoArticle } from './lib/linkedin/devto-api.js';

const SERVER_VERSION = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'),
).version as string;

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
};

type JsonRpcResponse = {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
};

function send(obj: JsonRpcResponse): void {
  process.stdout.write(JSON.stringify(obj) + '\n');
}

function ok(id: JsonRpcRequest['id'], result: unknown): void {
  send({ jsonrpc: '2.0', id, result });
}

function err(id: JsonRpcRequest['id'], code: number, message: string, data?: unknown): void {
  send({ jsonrpc: '2.0', id, error: { code, message, data } });
}

const TOOLS = [
  {
    name: 'linkedin_publish_from_devto',
    description:
      'Cross-post a DEV.to article to LinkedIn Articles. Fetches the article via public DEV.to API, ' +
      'converts Markdown to LinkedIn-compatible rich text (H2/H3, bold, links, lists, code as blockquotes, images), ' +
      'opens linkedin.com/article/new/, fills title/cover/body, and saves as draft by default. ' +
      'Returns JSON with linkedin_url + details. Requires linkedin-publisher login.',
    inputSchema: {
      type: 'object',
      properties: {
        devto_url: {
          type: 'string',
          description: 'Public DEV.to article URL, e.g. https://dev.to/author/my-post',
        },
        publish: {
          type: 'boolean',
          description: 'Publish live on LinkedIn. Default false — saves as draft only.',
        },
        dry_run: {
          type: 'boolean',
          description: 'Open editor without filling content. Default false.',
        },
      },
      required: ['devto_url'],
    },
  },
  {
    name: 'linkedin_session_check',
    description:
      'Check whether the saved LinkedIn session (browser cookies) is still valid. ' +
      'If ok=false, run `linkedin-publisher login` first.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'linkedin_publish',
    description:
      'Publish raw Markdown as a LinkedIn Article. Converts formatting for LinkedIn editor ' +
      'and saves as draft by default. Args: title, body (markdown), optional cover_image_url, source_url.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Article title' },
        body: { type: 'string', description: 'Article body in Markdown' },
        cover_image_url: { type: 'string', description: 'Cover image URL (optional)' },
        source_url: { type: 'string', description: 'Canonical source URL for attribution footer' },
        publish: {
          type: 'boolean',
          description: 'Publish live. Default false — draft only.',
        },
        dry_run: { type: 'boolean', description: 'Open editor only, do not fill content.' },
      },
      required: ['title', 'body'],
    },
  },
  {
    name: 'linkedin_preview_devto',
    description:
      'Fetch a DEV.to article and preview the LinkedIn conversion (title, HTML, image positions) ' +
      'without opening the browser. Useful for debugging formatting.',
    inputSchema: {
      type: 'object',
      properties: {
        devto_url: { type: 'string', description: 'Public DEV.to article URL' },
      },
      required: ['devto_url'],
    },
  },
];

async function handleRequest(req: JsonRpcRequest): Promise<void> {
  const { id, method, params = {} } = req;

  if (method === 'initialize') {
    ok(id, {
      protocolVersion: '2024-11-05',
      serverInfo: { name: 'linkedin-publisher', version: SERVER_VERSION },
      capabilities: { tools: {} },
    });
    return;
  }

  if (method === 'notifications/initialized' || method === 'ping') {
    if (method === 'ping') ok(id, {});
    return;
  }

  if (method === 'tools/list') {
    ok(id, { tools: TOOLS });
    return;
  }

  if (method === 'tools/call') {
    const toolName = params.name as string;
    const args = (params.arguments ?? {}) as Record<string, unknown>;

    try {
      if (toolName === 'linkedin_publish_from_devto') {
        const devtoUrl = (args.devto_url ?? args.url) as string;
        if (!devtoUrl) {
          err(id, -32602, 'linkedin_publish_from_devto requires "devto_url"');
          return;
        }
        const result = await publishFromDevto({
          devtoUrl,
          publish: (args.publish as boolean | undefined) ?? false,
          dryRun: (args.dry_run as boolean | undefined) ?? false,
        });
        ok(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.ok,
        });
        return;
      }

      if (toolName === 'linkedin_session_check') {
        const result = await checkSession();
        ok(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.ok,
        });
        return;
      }

      if (toolName === 'linkedin_publish') {
        const title = args.title as string;
        const body = args.body as string;
        if (!title || !body) {
          err(id, -32602, 'linkedin_publish requires "title" and "body"');
          return;
        }
        const result = await publishArticle({
          title,
          bodyMarkdown: body,
          coverImageUrl: args.cover_image_url as string | undefined,
          sourceUrl: args.source_url as string | undefined,
          publish: (args.publish as boolean | undefined) ?? false,
          dryRun: (args.dry_run as boolean | undefined) ?? false,
        });
        ok(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.ok,
        });
        return;
      }

      if (toolName === 'linkedin_preview_devto') {
        const devtoUrl = args.devto_url as string;
        if (!devtoUrl) {
          err(id, -32602, 'linkedin_preview_devto requires "devto_url"');
          return;
        }
        const article = await fetchDevtoArticle(devtoUrl);
        const preview = prepareDevtoArticleForLinkedIn(article);
        ok(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  ok: true,
                  devto_url: devtoUrl,
                  title: preview.title,
                  cover_image: preview.coverImageUrl,
                  total_blocks: preview.totalBlocks,
                  content_images: preview.contentImages,
                  html_preview: preview.html.slice(0, 4000),
                },
                null,
                2,
              ),
            },
          ],
          isError: false,
        });
        return;
      }

      err(id, -32601, `Unknown tool: ${toolName}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      ok(id, { content: [{ type: 'text', text: `Error: ${message}` }], isError: true });
    }
    return;
  }

  err(id, -32601, `Method not found: ${method}`);
}

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', async (chunk: string) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      const req = JSON.parse(trimmed) as JsonRpcRequest;
      await handleRequest(req);
    } catch {
      send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
    }
  }
});

process.stdin.on('end', () => process.exit(0));
process.stderr.write(`[linkedin-publisher MCP] ready v${SERVER_VERSION}\n`);
