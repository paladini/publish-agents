# publish-agents

Reusable **publication agents** for AI-assisted cross-posting — browser automation, CLI tools, MCP servers, and Cursor skills you can use from any project.

**Not tied to any single product repo.** Install globally and publish from any AI client (Cursor, Claude Desktop, Claude Code, Windsurf, etc.).

## Global MCP setup (Medium)

```powershell
# 1. Install globally
cd D:\code\publish-agents\packages\medium-publisher
npm install -g .

# 2. Login once (saves browser cookies)
medium-publisher login

# 3. Register in your AI client — Claude Code:
claude mcp add medium-publisher -- medium-publisher-mcp

# 3b. Or add to Claude Desktop / Cursor config manually:
#     see mcp/medium/README.md
```

See [`mcp/medium/README.md`](./mcp/medium/README.md) for all client configs.

## Quick start (Medium login)

Uses your **real Chrome/Edge profile** by default (same cookies/extensions as daily browsing).

### Option A — Chrome profile (recommended if Medium already open in Chrome)

1. **Close Chrome completely** (all windows).
2. Run:

```powershell
cd D:\code\publish-agents
medium-publisher login
```

Default `--browser system-profile` opens Chrome with your Default profile. If Medium is already logged in, press Enter immediately.

### Option B — Chrome already running

1. `medium-publisher browser-start` (opens Chrome with remote debugging + your profile — close normal Chrome first).
2. `medium-publisher login --browser cdp`

### Option C — isolated Playwright Chromium

```powershell
medium-publisher login --browser bundled
```

### From any folder

```powershell
medium-publisher login
# or
D:\code\publish-agents\scripts\medium.ps1 login
```


| Package | Status | Description |
|---|---|---|
| [`@paladini/medium-publisher`](./packages/medium-publisher) | v0.1 | Medium via Playwright (import URL + paste markdown) |
| `medium-publisher-mcp` | v0.1 | MCP server wrapping the CLI above — use with Cursor, Claude Desktop, Claude Code |
| TabNews API publisher | planned | REST API (`/api/v1/contents`) — no browser needed |
| Dev.to | external | Use existing `user-devto` MCP |

## Skills (Cursor)

| Skill | Purpose |
|---|---|
| [`publish-medium`](./skills/publish-medium) | Publish / cross-post to Medium |
| [`publish-crosspost`](./skills/publish-crosspost) | Orchestrate dev.to → Medium (and future channels) |

### Install skills globally

```powershell
# Windows — run from this repo root
.\scripts\install-skills.ps1
```

```bash
# Linux/macOS
./scripts/install-skills.sh
```

This copies skills into `~/.cursor/skills/` (or `%USERPROFILE%\.cursor\skills\` on Windows).

## Typical release workflow

1. Write announcement markdown locally (any repo).
2. Publish to dev.to via `user-devto` MCP.
3. Cross-post to Medium:

```bash
cd publish-agents
npm run medium -- session-check
npm run medium -- import --url "https://dev.to/..." --dry-run
npm run medium -- import --url "https://dev.to/..." --publish --json
```

4. (Future) TabNews via API CLI.

## Development

```bash
npm install
npm run build
npm test
```

## Architecture

See [docs/architecture.md](./docs/architecture.md).

## License

MIT
