#!/usr/bin/env node
/**
 * medium-publisher MCP server (v0.2.1)
 *
 * Exposes the medium-publisher CLI as an MCP tool server so Cursor, Claude
 * Code, Codex, and any other MCP-compatible client can publish to Medium
 * without leaving the AI session.
 *
 * Transport: stdio (default for local tools)
 *
 * Primary tool: medium_publish_from_devto — DEV.to → Medium with title,
 * SEO subtitle (~140 chars), tags (up to 5), hero image wait, auto-fix, publish.
 *
 * No API key needed — authentication is handled once via `medium-publisher login`
 * which saves a Playwright storageState (cookies) to disk.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { checkSession } from './lib/medium/session.js';
import { importStory } from './lib/medium/import-story.js';
import { publishMarkdown } from './lib/medium/new-story.js';
import { extractStory } from './lib/medium/extract-story.js';
import { fixDraft, type FixAction } from './lib/medium/fix-draft.js';
import { openDraftStory } from './lib/medium/open-draft.js';
import { publishFromDevto } from './lib/medium/publish-from-devto.js';

const SERVER_VERSION = JSON.parse(
  readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8'),
).version as string;

// ---------------------------------------------------------------------------
// Minimal MCP stdio server (no extra deps — raw JSON-RPC over stdout/stdin)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tool definitions (MCP tools/list response)
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: 'medium_publish_from_devto',
    description:
      'Publish a DEV.to article on Medium. Use when the user wants to post, publish, share, ' +
      'republish, or mirror a dev.to blog post on Medium (dev.to to medium, cross-post). ' +
      'Pipeline: fetch DEV.to API (title, description, tags, cover/social image) → import at ' +
      'medium.com/p/import → open editor (skip "See your story" when already on /edit) → set title, ' +
      'auto-fix formatting, security check → publish dialog with SEO subtitle (~140 chars) and up to ' +
      '5 topics via Medium autocomplete. Returns JSON: medium_url + details (tags, subtitle, ' +
      'title_set, hero_image). Requires medium-publisher login. DEV.to article must be published.',
    inputSchema: {
      type: 'object',
      properties: {
        devto_url: {
          type: 'string',
          description:
            'Public DEV.to article URL, e.g. https://dev.to/author/my-post (must be live)',
        },
        publish: {
          type: 'boolean',
          description:
            'Publish live on Medium. Default true. Set false to save as draft and return draft URL.',
        },
      },
      required: ['devto_url'],
    },
  },
  {
    name: 'medium_session_check',
    description:
      'Check whether the saved Medium session (browser cookies) is still valid. ' +
      'If it returns ok=false, run `medium-publisher login` first.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'medium_import',
    description:
      'Cross-post an article to Medium by importing from a public URL (e.g. dev.to, TabNews). ' +
      'Medium fetches the HTML from the URL and creates a draft or publishes it. ' +
      'Use status="draft" for testing — the story will be saved but NOT published.',
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'Public URL of the article to import (must be publicly accessible)',
        },
        status: {
          type: 'string',
          enum: ['draft', 'published'],
          description: 'draft = save only (safe for testing); published = go live. Default: draft',
        },
        canonical_url: {
          type: 'string',
          description:
            'Override the canonical URL (defaults to the import URL). Use if the import URL is not the canonical source.',
        },
        dry_run: {
          type: 'boolean',
          description:
            'If true, navigate to import page and stop — never saves or publishes. ' +
            'Good for verifying session is alive. Default: false',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'medium_publish',
    description:
      'Publish a raw markdown string as a new Medium story. When status=published, fills the ' +
      'publish dialog with optional subtitle (~140 char SEO preview) and up to 5 tags. ' +
      'Use status="draft" for testing — the story will be saved but NOT published.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Story title',
        },
        body: {
          type: 'string',
          description: 'Full article body in Markdown',
        },
        status: {
          type: 'string',
          enum: ['draft', 'published'],
          description: 'draft = save only (safe for testing); published = go live. Default: draft',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Up to 5 Medium topics for the publish dialog (optional)',
        },
        subtitle: {
          type: 'string',
          description:
            'SEO preview subtitle (~140 chars) for Google/Medium search. Truncated automatically.',
        },
        canonical_url: {
          type: 'string',
          description: 'Canonical URL if cross-posting from another platform (optional)',
        },
        dry_run: {
          type: 'boolean',
          description:
            'If true, navigate but do not interact with editor. Default: false',
        },
      },
      required: ['title', 'body'],
    },
  },
  {
    name: 'medium_extract',
    description:
      'Extract a structured outline from a Medium draft/story URL. Returns title, blocks, ' +
      'and heuristic formatting flags (empty code blocks, split code blocks, raw markdown).',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Medium draft or story editor URL' },
      },
      required: ['url'],
    },
  },
  {
    name: 'medium_fix_draft',
    description:
      'Apply limited formatting fixes to a Medium draft in the editor, wait for autosave, ' +
      'and return updated extract. Actions: removeEmptyCodeBlocks, mergeAdjacentCodeBlocks, ' +
      'promoteDemoteHeading, replaceBlockText.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Medium draft URL' },
        actions: {
          type: 'array',
          description: 'Fix actions to apply in order',
          items: { type: 'object' },
        },
      },
      required: ['url', 'actions'],
    },
  },
  {
    name: 'medium_open_draft',
    description: 'Open a Medium draft in a headed browser, wait for save, return basic info.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Medium draft URL' },
      },
      required: ['url'],
    },
  },
];

// ---------------------------------------------------------------------------
// Request handler
// ---------------------------------------------------------------------------

async function handleRequest(req: JsonRpcRequest): Promise<void> {
  const { id, method, params = {} } = req;

  // ── MCP lifecycle ────────────────────────────────────────────────────────
  if (method === 'initialize') {
    ok(id, {
      protocolVersion: '2024-11-05',
      serverInfo: { name: 'medium-publisher', version: SERVER_VERSION },
      capabilities: { tools: {} },
    });
    return;
  }

  if (method === 'notifications/initialized') {
    return; // no response for notifications
  }

  if (method === 'ping') {
    ok(id, {});
    return;
  }

  // ── Tool discovery ────────────────────────────────────────────────────────
  if (method === 'tools/list') {
    ok(id, { tools: TOOLS });
    return;
  }

  // ── Tool execution ────────────────────────────────────────────────────────
  if (method === 'tools/call') {
    const toolName = params.name as string;
    const args = (params.arguments ?? {}) as Record<string, unknown>;

    try {
      if (toolName === 'medium_publish_from_devto') {
        const devtoUrl = (args.devto_url ?? args.url) as string;
        if (!devtoUrl) {
          err(id, -32602, 'medium_publish_from_devto requires "devto_url"');
          return;
        }
        const result = await publishFromDevto({
          devtoUrl,
          publish: (args.publish as boolean | undefined) ?? true,
        });
        if (result.ok && result.medium_url) {
          ok(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  { ok: true, medium_url: result.medium_url, details: result.details },
                  null,
                  2,
                ),
              },
            ],
            isError: false,
          });
        } else {
          ok(id, {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ ok: false, error: result.error ?? 'Publish failed' }, null, 2),
              },
            ],
            isError: true,
          });
        }
        return;
      }

      if (toolName === 'medium_session_check') {
        const result = await checkSession();
        ok(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.ok,
        });
        return;
      }

      if (toolName === 'medium_import') {
        const url = args.url as string;
        if (!url) {
          err(id, -32602, 'medium_import requires "url"');
          return;
        }
        const publish = (args.status as string) === 'published';
        const result = await importStory({
          url,
          canonical: args.canonical_url as string | undefined,
          publish,
          dryRun: (args.dry_run as boolean | undefined) ?? false,
        });
        ok(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.ok,
        });
        return;
      }

      if (toolName === 'medium_publish') {
        const title = args.title as string;
        const body = args.body as string;
        if (!title || !body) {
          err(id, -32602, 'medium_publish requires "title" and "body"');
          return;
        }
        const publish = (args.status as string) === 'published';
        const result = await publishMarkdown({
          title,
          body,
          tags: args.tags as string[] | undefined,
          subtitle: args.subtitle as string | undefined,
          canonical: args.canonical_url as string | undefined,
          publish,
          dryRun: (args.dry_run as boolean | undefined) ?? false,
        });
        ok(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.ok,
        });
        return;
      }

      if (toolName === 'medium_extract') {
        const url = args.url as string;
        if (!url) {
          err(id, -32602, 'medium_extract requires "url"');
          return;
        }
        const result = await extractStory({ url });
        ok(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.ok,
        });
        return;
      }

      if (toolName === 'medium_fix_draft') {
        const url = args.url as string;
        const actions = args.actions as FixAction[] | undefined;
        if (!url || !actions?.length) {
          err(id, -32602, 'medium_fix_draft requires "url" and non-empty "actions"');
          return;
        }
        const result = await fixDraft({ url, actions });
        ok(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.ok,
        });
        return;
      }

      if (toolName === 'medium_open_draft') {
        const url = args.url as string;
        if (!url) {
          err(id, -32602, 'medium_open_draft requires "url"');
          return;
        }
        const result = await openDraftStory({ url });
        ok(id, {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          isError: !result.ok,
        });
        return;
      }

      err(id, -32601, `Unknown tool: ${toolName}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      ok(id, {
        content: [{ type: 'text', text: `Error: ${message}` }],
        isError: true,
      });
    }
    return;
  }

  err(id, -32601, `Method not found: ${method}`);
}

// ---------------------------------------------------------------------------
// Stdio transport — read newline-delimited JSON from stdin
// ---------------------------------------------------------------------------

let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', async (chunk: string) => {
  buffer += chunk;
  const lines = buffer.split('\n');
  buffer = lines.pop() ?? '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let req: JsonRpcRequest;
    try {
      req = JSON.parse(trimmed) as JsonRpcRequest;
    } catch {
      send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } });
      continue;
    }
    await handleRequest(req);
  }
});

process.stdin.on('end', () => process.exit(0));
process.stderr.write(`[medium-publisher MCP] ready v${SERVER_VERSION}\n`);
