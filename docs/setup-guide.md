# Setup Guide — publish-agents

Guia completo de configuração inicial. Faça uma vez, use para sempre.

---

## Visão geral

```
publish-agents/
├── mcp/
│   ├── medium/README.md    ← Configuração Medium (este repo)
│   └── linkedin/README.md  ← Configuração LinkedIn
├── packages/
│   └── medium-publisher/   ← CLI + MCP server (Node.js)
└── skills/
    ├── publish-devto-to-medium/  ← Full DEV.to → Medium pipeline (Cursor)
    ├── review-medium-import/     ← Post-import formatting review
    ├── publish-medium/           ← Medium CLI reference
    └── publish-crosspost/        ← Multi-channel crosspost
```

**English docs:** [devto-to-medium.md](./devto-to-medium.md) · [medium-publisher.md](./medium-publisher.md) · [CHANGELOG.md](../CHANGELOG.md)

---

## 1. Medium — Setup (5 minutos)

### Instalar globalmente

```powershell
cd D:\code\publish-agents\packages\medium-publisher
npm install -g .
```

Confirme:
```powershell
medium-publisher --help
medium-publisher-mcp  # deve responder imediatamente com JSON-RPC
# Ctrl+C para sair
```

### Login (uma vez só)

Feche o Chrome completamente, depois:

```powershell
medium-publisher login
```

Um Chrome vai abrir. Se você já está logado no Medium no Chrome, pressione Enter imediatamente.
Se não, faça login e pressione Enter quando a página `medium.com/me/stories` carregar.

O cookie fica salvo em:
```
%LOCALAPPDATA%\medium-publisher\storageState.json
```

### Verificar sessão

```powershell
medium-publisher session-check
```

### Registrar no Claude Code

```powershell
claude mcp add medium-publisher -- medium-publisher-mcp
```

### Registrar no Claude Desktop

Edite `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "medium-publisher": {
      "command": "medium-publisher-mcp"
    }
  }
}
```

Reinicie o Claude Desktop.

### Registrar no Cursor

Settings → MCP → Add Server:
- **Name:** `medium-publisher`
- **Command:** `medium-publisher-mcp`

---

## 2. LinkedIn — Setup (2 minutos)

### Instalar uv (se ainda não tem)

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Importar sessão do Chrome (sem precisar logar de novo)

```powershell
uvx mcp-server-linkedin@latest --import-from-browser chrome
```

### Registrar no Claude Code

```powershell
claude mcp add linkedin -- uvx mcp-server-linkedin@latest
```

### Para publicar posts: Playwright MCP

```powershell
claude mcp add playwright -- npx @playwright/mcp@latest --browser chrome
```

Veja detalhes completos em [mcp/linkedin/README.md](../mcp/linkedin/README.md).

---

## 3. Dev.to — Setup (1 minuto)

Dev.to tem API REST pública com API key.

1. Vá para: https://dev.to/settings/extensions
2. Gere um API key
3. O MCP `user-devto` já está configurado no Antigravity — adicione a key lá

---

## 4. Verificar tudo junto

```powershell
# Medium
medium-publisher session-check

# Claude Code — listar MCPs registrados
claude mcp list
```

---

## Reconfigurar após reinstalar o SO

Se reinstalar o Windows, execute nesta ordem:

```powershell
# 1. Instalar Node.js 20+ e uv
# 2. Clonar o repo
git clone <repo> D:\code\publish-agents
cd D:\code\publish-agents

# 3. Instalar dependências
npm install

# 4. Instalar Medium publisher globalmente
cd packages\medium-publisher
npm install -g .

# 5. Login no Medium
medium-publisher login

# 6. Login no LinkedIn
uvx mcp-server-linkedin@latest --import-from-browser chrome

# 7. Registrar MCPs
claude mcp add medium-publisher -- medium-publisher-mcp
claude mcp add linkedin -- uvx mcp-server-linkedin@latest
claude mcp add playwright -- npx @playwright/mcp@latest --browser chrome

# 8. Copiar configs para Claude Desktop e Cursor (ver READMEs em mcp/)
```

---

## Secrets — o que NÃO commitar

| Arquivo | Por quê não commitar |
|---|---|
| `%LOCALAPPDATA%\medium-publisher\storageState.json` | Cookies do Medium |
| `~/.linkedin-mcp/profile/` | Sessão do LinkedIn |
| `.env` (se criar) | Keys e tokens |

Todos já estão no `.gitignore`.
