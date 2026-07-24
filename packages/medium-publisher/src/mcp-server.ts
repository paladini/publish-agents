#!/usr/bin/env node
/**
 * medium-publisher MCP server
 *
 * Exposes the medium-publisher CLI as an MCP tool server so Cursor, Claude
 * Code, Codex, and any other MCP-compatible client can publish to Medium
 * without leaving the AI session.
 *
 * Transport: stdio (default for local tools)
 *
 * Tools exposed:
 *   - medium_session_check   Check whether the saved session is still valid
 *   - medium_import          Cross-post from a public URL (dev.to, TabNews, …)
 *   - medium_publish         Publish raw markdown as a new story
 *
 * No API key needed — authentication is handled once via `medium-publisher login`
 * which saves a Playwright storageState (cookies) to disk.
 */

import { checkSession } from './lib/medium/session.js';
import { importStory } from './lib/medium/import-story.js';
import { publishMarkdown } from './lib/medium/new-story.js';

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
      'Publish a raw markdown string as a new Medium story. ' +
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
          description: 'Up to 5 tags (optional)',
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
      serverInfo: { name: 'medium-publisher', version: '0.1.0' },
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
process.stderr.write('[medium-publisher MCP] ready\n');
