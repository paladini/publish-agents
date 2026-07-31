# publish-agents

Reusable **publication agents** for AI-assisted cross-posting — browser automation, CLI tools, MCP servers, and Cursor skills.

**Published on npm** as `@paladini/*-publisher-mcp`. Current release: **v0.2.1** (+ linkedin-publisher **0.1.0**).

## Quick start

```powershell
npm install -g @paladini/medium-publisher-mcp
medium-publisher login
```

Or from source:

```powershell
git clone git@github.com:paladini/publish-agents.git
cd publish-agents
npm install
npm run build

cd packages/medium-publisher
npm link
patchright install chromium
medium-publisher login
```

Register MCP: `medium-publisher-mcp` — see [mcp/medium/README.md](./mcp/medium/README.md).

## Publish DEV.to → Medium (one command)

**CLI:**

```powershell
medium-publisher publish-devto --url "https://dev.to/author/post"
```

**MCP:** `medium_publish_from_devto` with `devto_url` → returns JSON with Medium URL + metadata details.

See [docs/devto-to-medium.md](./docs/devto-to-medium.md) and [docs/medium-publisher.md](./docs/medium-publisher.md).

## Packages

| Package | Version | Description |
|---|---|---|
| [medium-publisher](./packages/medium-publisher) | **0.2.1** | Medium via Patchright — import, metadata, auto-fix, MCP |
| [tabnews-publisher](./packages/tabnews-publisher) | 0.1.0 | TabNews via Playwright |
| [linkedin-publisher](./packages/linkedin-publisher) | 0.1.0 | LinkedIn Articles via Patchright — DEV.to cross-post, MCP |
| Dev.to | external | `user-devto` MCP |

## Cursor skills

| Skill | Purpose |
|---|---|
| [publish-devto-to-medium](./skills/publish-devto-to-medium) | Full DEV.to → Medium pipeline with review |
| [review-medium-import](./skills/review-medium-import) | Post-import formatting review |
| [publish-medium](./skills/publish-medium) | Medium CLI reference |
| [publish-crosspost](./skills/publish-crosspost) | Multi-channel orchestration |

```powershell
.\scripts\install-skills.ps1
```

## Documentation

| Doc | Contents |
|---|---|
| [docs/medium-publisher.md](./docs/medium-publisher.md) | CLI, MCP, config, source layout |
| [docs/devto-to-medium.md](./docs/devto-to-medium.md) | DEV.to cross-post details |
| [docs/setup-guide.md](./docs/setup-guide.md) | Initial setup |
| [docs/architecture.md](./docs/architecture.md) | System design |
| [CHANGELOG.md](./CHANGELOG.md) | Release history |

## Development

```bash
npm install
npm run build
npm test -w @paladini/medium-publisher-mcp
```

## License

MIT
