# MCP Config — linkedin-publisher

In-repo MCP package: `@paladini/linkedin-publisher-mcp`

Cross-posts DEV.to articles to **LinkedIn Articles** with Markdown formatting adapted for LinkedIn (headings, lists, code as blockquotes, images). **Saves as draft by default.**

---

## Pré-requisito: build + login

```powershell
cd D:\code\publish-agents
npm install
npm run build -w @paladini/linkedin-publisher-mcp
linkedin-publisher login
```

Sessão: `%LOCALAPPDATA%\linkedin-publisher\storageState.json`

---

## Configuração nos clientes MCP

### Cursor

Settings → MCP → Add Server → Command:

```
linkedin-publisher-mcp
```

Ou no JSON:

```json
{
  "mcpServers": {
    "linkedin-publisher": {
      "command": "linkedin-publisher-mcp"
    }
  }
}
```

### Claude Desktop

`%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "linkedin-publisher": {
      "command": "linkedin-publisher-mcp"
    }
  }
}
```

### Claude Code

```powershell
claude mcp add linkedin-publisher -- linkedin-publisher-mcp
```

---

## Ferramentas disponíveis

| Tool | O que faz |
|------|-----------|
| **`linkedin_publish_from_devto`** | Cross-post DEV.to → LinkedIn Article (rascunho por padrão). Args: `devto_url`, `publish` (default `false`), `dry_run` |
| `linkedin_session_check` | Verifica sessão salva |
| `linkedin_publish` | Publica Markdown bruto. Args: `title`, `body`, `cover_image_url`, `source_url`, `publish` |
| `linkedin_preview_devto` | Preview da conversão sem abrir browser |

### Uso recomendado

> Use `linkedin_publish_from_devto` com `devto_url: "https://dev.to/author/my-post"`

Resposta de sucesso: JSON com `linkedin_url`, `status: "draft"`, e `details` (title, cover_image, content_images).

---

## Formatação DEV.to → LinkedIn

| Markdown | LinkedIn |
|----------|----------|
| `# Título` | Campo de título (não vai no corpo) |
| `##` / `###` | H2 / H3 |
| `**negrito**`, links, listas | Rich text nativo |
| Blocos de código | Blockquote + monospace |
| Imagens inline | Inseridas após colar o texto |
| Cover | `cover_image` do DEV.to |

Rodapé automático: *Publicado originalmente em DEV.to.*

---

## Autenticação

Sem API key. Cookies salvos via `linkedin-publisher login`. Usa **Patchright** (Chromium com patches anti-detecção).

---

## MCP externo (leitura)

Para ler feed, perfis e mensagens, continue usando o [`mcp-server-linkedin`](https://github.com/stickerdaniel/linkedin-mcp-server) (Python, `uvx`).

Este pacote foca em **publicar artigos longos** (LinkedIn Articles), não posts curtos.

---

## Limitações

- Default é **rascunho** — revise manualmente antes de publicar
- Não publique mais de 2–3 artigos/posts por dia via automação
- LinkedIn não tem blocos de código nativos — convertemos para blockquote

---

## Documentação

- [linkedin-publisher README](../../packages/linkedin-publisher/README.md)
- [medium-publisher MCP](../medium/README.md) — cross-post DEV.to → Medium
