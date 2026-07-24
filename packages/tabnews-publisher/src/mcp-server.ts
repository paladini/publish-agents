#!/usr/bin/env node
import { checkSession } from './lib/session.js';
import { publishTabNews } from './lib/publish.js';

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
    name: 'tabnews_session_check',
    description: 'Verifica se a sessão do TabNews está ativa e salva em disco.',
    inputSchema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'tabnews_publish',
    description:
      'Publica um artigo no TabNews em formato Markdown. Use status="draft" para testes seguros sem publicar.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Título da publicação' },
        body: { type: 'string', description: 'Conteúdo em Markdown' },
        source_url: { type: 'string', description: 'URL de onde o artigo foi originalmente publicado' },
        status: { type: 'string', enum: ['draft', 'published'], description: 'draft = pré-visualização; published = publica' },
        dry_run: { type: 'boolean', description: 'Apenas preenche e gera screenshot' },
      },
      required: ['title', 'body'],
    },
  },
];

async function handleRequest(req: JsonRpcRequest): Promise<void> {
  const { id, method, params = {} } = req;

  if (method === 'initialize') {
    ok(id, {
      protocolVersion: '2024-11-05',
      serverInfo: { name: 'tabnews-publisher', version: '0.1.0' },
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
      if (toolName === 'tabnews_session_check') {
        const res = await checkSession();
        ok(id, { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }], isError: !res.ok });
        return;
      }

      if (toolName === 'tabnews_publish') {
        const title = args.title as string;
        const body = args.body as string;
        const publish = (args.status as string) === 'published';
        const res = await publishTabNews({
          title,
          body,
          sourceUrl: args.source_url as string | undefined,
          publish,
          dryRun: (args.dry_run as boolean | undefined) ?? false,
        });
        ok(id, { content: [{ type: 'text', text: JSON.stringify(res, null, 2) }], isError: !res.ok });
        return;
      }

      err(id, -32601, `Ferramenta desconhecida: ${toolName}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      ok(id, { content: [{ type: 'text', text: `Erro: ${msg}` }], isError: true });
    }
    return;
  }

  err(id, -32601, `Método não encontrado: ${method}`);
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
