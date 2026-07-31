# Publicar no NPM

Os três pacotes estão prontos para publicação:

| Pacote | Versão |
|--------|--------|
| `@paladini/medium-publisher-mcp` | 0.2.1 |
| `@paladini/tabnews-publisher-mcp` | 0.1.0 |
| `@paladini/linkedin-publisher-mcp` | 0.1.0 |

## Pré-requisitos

1. **Conta npm** com acesso ao scope `@paladini`
   - Se o org ainda não existir: https://www.npmjs.com/org/create
   - Ou publique sem scope (requer renomear os pacotes)

2. **Login local** (uma vez):

```powershell
npm login
npm whoami
```

3. **Token para CI** (GitHub Actions):
   - Crie em https://www.npmjs.com/settings/~tokens → **Automation**
   - Adicione como secret `NPM_TOKEN` no repo GitHub

## Publicar localmente

```powershell
cd D:\code\publish-agents
npm run publish:npm
```

Ou pacote a pacote:

```powershell
npm publish --workspace=@paladini/medium-publisher-mcp --access public
npm publish --workspace=@paladini/tabnews-publisher-mcp --access public
npm publish --workspace=@paladini/linkedin-publisher-mcp --access public
```

## Publicar via GitHub Actions

1. Configure `NPM_TOKEN` em **Settings → Secrets → Actions**
2. Crie e push uma tag:

```powershell
git tag v0.3.0
git push origin v0.3.0
```

O workflow `.github/workflows/release.yml` publica os três pacotes no npm e no GitHub Packages.

## Instalar após publicação

```powershell
npm install -g @paladini/medium-publisher-mcp
npm install -g @paladini/linkedin-publisher-mcp
npm install -g @paladini/tabnews-publisher-mcp
```

MCP no Cursor:

```json
{
  "mcpServers": {
    "medium-publisher": { "command": "medium-publisher-mcp" },
    "linkedin-publisher": { "command": "linkedin-publisher-mcp" },
    "tabnews-publisher": { "command": "tabnews-publisher-mcp" }
  }
}
```
