# MCP Configs — medium-publisher

Configurações prontas para adicionar o `medium-publisher` como servidor MCP
em qualquer cliente compatível.

**Pré-requisito:** fazer login uma vez antes de usar qualquer cliente.

```powershell
medium-publisher login
```

Isso abre o Chrome com seu perfil real. Se o Medium já estiver logado, basta
pressionar Enter. O cookie é salvo em `%LOCALAPPDATA%\medium-publisher\storageState.json`.

---

## Claude Desktop

Arquivo: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "medium-publisher": {
      "command": "medium-publisher-mcp"
    }
  }
}
```

---

## Cursor

Arquivo: `%APPDATA%\Cursor\User\globalStorage\cursor.mcp\mcp.json`
(ou Settings → MCP → Add Server → Command)

```json
{
  "mcpServers": {
    "medium-publisher": {
      "command": "medium-publisher-mcp"
    }
  }
}
```

---

## Claude Code (CLI)

```bash
claude mcp add medium-publisher -- medium-publisher-mcp
```

Ou edite `~/.claude.json` (Linux/Mac) / `%USERPROFILE%\.claude.json` (Windows):

```json
{
  "mcpServers": {
    "medium-publisher": {
      "type": "stdio",
      "command": "medium-publisher-mcp"
    }
  }
}
```

---

## VS Code (Copilot / Agent mode)

Arquivo: `.vscode/mcp.json` no workspace, ou nas User Settings:

```json
{
  "servers": {
    "medium-publisher": {
      "type": "stdio",
      "command": "medium-publisher-mcp"
    }
  }
}
```

---

## Windsurf / Cline / RooCode

```json
{
  "mcpServers": {
    "medium-publisher": {
      "command": "medium-publisher-mcp",
      "args": []
    }
  }
}
```

---

## Ferramentas disponíveis no MCP

| Tool | Descrição |
|---|---|
| `medium_session_check` | Verifica se o login ainda está ativo |
| `medium_import` | Cross-post via URL pública (dev.to, TabNews, etc.) |
| `medium_publish` | Publica markdown direto como novo artigo |

### Como publicar como rascunho (para testes)

Todos os tools aceitam o parâmetro `status`:

- `"status": "draft"` → salva sem publicar ✅ (padrão / seguro para testes)
- `"status": "published"` → publica de verdade
- `"dry_run": true` → só navega, não salva nem publica (verifica sessão)

**Exemplo de uso em linguagem natural no Claude/Cursor:**

> "Use medium_import para importar https://dev.to/meu-artigo como rascunho"

> "Use medium_publish para criar um rascunho no Medium com o título 'Teste' e o corpo '# Olá Mundo'"

---

## Sem API Key

O `medium-publisher` **não usa API key**. A autenticação é feita via cookies
do browser (Playwright storageState). Você faz login uma vez e o cookie dura
meses (enquanto você não deslogar do Medium no browser).

O arquivo de sessão fica em:
```
%LOCALAPPDATA%\medium-publisher\storageState.json
```

> ⚠️ Não commite esse arquivo! Ele já está no `.gitignore`.
