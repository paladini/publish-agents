# MCP Configs — LinkedIn

Usa o [`mcp-server-linkedin`](https://github.com/stickerdaniel/linkedin-mcp-server)
(2.9k ⭐ — Patchright + seu Chrome real, sem API key).

---

## Pré-requisito: instalar `uv`

O servidor é Python e usa o `uv` (gerenciador moderno, similar ao npx mas para Python):

```powershell
# Windows — PowerShell (como Admin ou sem, funciona nos dois)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

Confirme que instalou:
```powershell
uv --version
```

---

## Setup inicial (login — uma vez só)

O servidor consegue **importar sua sessão do Chrome automaticamente**
(sem precisar logar de novo):

```powershell
uvx mcp-server-linkedin@latest --import-from-browser chrome
```

Isso lê os cookies do LinkedIn do seu Chrome instalado e salva em
`~/.linkedin-mcp/profile`. A partir daí o MCP funciona headless.

Se preferir fazer login manualmente (nova sessão isolada):
```powershell
uvx mcp-server-linkedin@latest --login
```

---

## Configuração nos clientes MCP

### Claude Desktop

Arquivo: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "linkedin": {
      "command": "uvx",
      "args": ["mcp-server-linkedin@latest"],
      "env": {
        "UV_HTTP_TIMEOUT": "300"
      }
    }
  }
}
```

### Claude Code (CLI)

```powershell
claude mcp add linkedin -- uvx mcp-server-linkedin@latest
```

### Cursor

Settings → MCP → Add Server → Command:
```
uvx mcp-server-linkedin@latest
```

### VS Code / Windsurf / Cline

```json
{
  "servers": {
    "linkedin": {
      "type": "stdio",
      "command": "uvx",
      "args": ["mcp-server-linkedin@latest"],
      "env": { "UV_HTTP_TIMEOUT": "300" }
    }
  }
}
```

---

## Ferramentas disponíveis

| Tool | O que faz |
|---|---|
| `get_my_profile` | Pega seu próprio perfil |
| `get_feed` | Lê o feed do LinkedIn |
| `get_person_profile` | Lê perfil de outra pessoa |
| `get_company_posts` | Posts de uma empresa |
| `search_people` / `search_companies` | Busca |
| `send_message` | Manda mensagem |
| `get_inbox` / `get_conversation` | Lê mensagens |
| `connect_with_person` | Envia convite de conexão |

> ⚠️ **Nota sobre publicação de posts:** O `mcp-server-linkedin` foca em
> *leitura* de dados do LinkedIn. Para *publicar posts*, a abordagem mais
> simples é usar o `@playwright/mcp` da Microsoft (veja abaixo) que dá
> ao agente controle total do browser.

---

## Para publicar posts no LinkedIn: `@playwright/mcp`

O LinkedIn bloqueia a API pública para posts em perfis pessoais.
A solução mais simples e robusta é o MCP oficial do Playwright:

### Configuração

**Claude Desktop** — adicione ao `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest", "--browser", "chrome"]
    }
  }
}
```

**Claude Code:**
```powershell
claude mcp add playwright -- npx @playwright/mcp@latest --browser chrome
```

A flag `--browser chrome` usa seu Chrome instalado com **suas cookies existentes**,
então o LinkedIn já estará logado automaticamente.

### Como usar para publicar

Fale naturalmente com o agente:

> "Abra linkedin.com/feed e publique o seguinte texto como um post: [seu conteúdo]"

O agente vai:
1. Navegar até o LinkedIn (já logado pelo seu Chrome)
2. Clicar em "Começar um post"
3. Digitar o texto
4. Clicar em Publicar

### Limitações do LinkedIn

- Não publique mais de 2-3 posts por dia via automação
- O LinkedIn detecta comportamento repetitivo muito rápido
- Para publicar artigos longos (Articles), o processo é mais complexo — recomenda-se fazer manualmente
- Posts simples de texto funcionam bem

---

## Sem API Key para nenhum dos dois

Tanto o `mcp-server-linkedin` quanto o `@playwright/mcp` funcionam com sua
sessão real do browser — sem API keys, sem OAuth apps, sem cadastros externos.
