# MCP Configs — tabnews-publisher

Configurações prontas para adicionar o `tabnews-publisher` como servidor MCP
em qualquer cliente compatível.

**Pré-requisito:** fazer login uma vez antes de usar.

```powershell
tabnews-publisher login
```

Isso abre um navegador do Playwright. Faça o login com sua conta do TabNews e pressione ENTER no terminal para salvar a sessão.
O cookie fica salvo em `%LOCALAPPDATA%\tabnews-publisher\storageState.json`.

---

## Claude Desktop

Arquivo: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "tabnews-publisher": {
      "command": "tabnews-publisher-mcp"
    }
  }
}
```

---

## Cursor

Settings → MCP → Add Server:
- **Name:** `tabnews-publisher`
- **Command:** `tabnews-publisher-mcp`

---

## Claude Code (CLI)

```bash
claude mcp add tabnews-publisher -- tabnews-publisher-mcp
```

---

## Ferramentas disponíveis no MCP

| Tool | Descrição |
|---|---|
| `tabnews_session_check` | Verifica se a sessão do TabNews está ativa |
| `tabnews_publish` | Publica markdown no TabNews |

### Como publicar como rascunho / pré-visualização (para testes)

O tool `tabnews_publish` aceita o parâmetro `status`:

- `"status": "draft"` → preenche e gera screenshot sem clicar em publicar (seguro para testes)
- `"status": "published"` → publica de verdade
- `"dry_run": true` → apenas preenche o formulário e gera screenshot de validação
