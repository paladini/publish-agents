# @paladini/medium-publisher-mcp (v0.2.1)

Publish to **Medium** via **Patchright** browser automation with a persistent session.

Install from the [publish-agents](https://github.com/paladini/publish-agents) repository (not npm):

```bash
git clone git@github.com:paladini/publish-agents.git
cd publish-agents
npm install && npm run build
cd packages/medium-publisher && npm link
patchright install chromium
medium-publisher login
```

Full reference: [docs/medium-publisher.md](../../docs/medium-publisher.md)

## Publish DEV.to → Medium

```bash
medium-publisher publish-devto --url "https://dev.to/author/post"
```

Draft only: `--draft`. JSON output: `--json`.

## MCP

Run `medium-publisher-mcp`. Primary tool: **`medium_publish_from_devto`**.

## All CLI commands

`login` · `browser-start` · `session-check` · `import` · `publish` · `publish-devto` · `extract` · `fix-draft` · `open-draft`

## Session

Saved to `%LOCALAPPDATA%\medium-publisher\storageState.json` (Windows).

## Troubleshooting

[skills/publish-medium/TROUBLESHOOTING.md](../../skills/publish-medium/TROUBLESHOOTING.md)
