# @paladini/medium-publisher-mcp

[![npm version](https://img.shields.io/npm/v/@paladini/medium-publisher-mcp.svg)](https://www.npmjs.com/package/@paladini/medium-publisher-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

**Publish to Medium from the terminal or from your AI agent.** Browser automation with a persistent session — no Medium API key required.

Cross-post DEV.to tutorials with formatting repair, SEO metadata, topic tags, and a full [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server for Cursor, Claude Code, and other MCP clients.

---

## Why this exists

Medium has no stable public write API for personal accounts. Importing a URL is easy; importing a **technical tutorial without corrupting code blocks, headings, and lists** is not.

This package:

- Fetches your DEV.to article via the **public REST API** (no DEV.to API key for cross-post)
- Imports through Medium's official **`medium.com/p/import`** flow
- Compares the editor against the source Markdown and **auto-fixes** common import bugs
- Fills the publish dialog with **SEO subtitle (~140 chars)** and up to **5 topics**
- Exposes everything as a **CLI** and **MCP tools** for human and agent workflows

---

## Features

| Feature | Description |
|--------|-------------|
| **One-shot DEV.to → Medium** | `publish-devto` / `medium_publish_from_devto` |
| **Import any public URL** | dev.to, personal blogs, etc. |
| **Auto-fix loop** | Empty code blocks, split fences, raw Markdown headings |
| **Source review** | Block-level comparison against DEV.to Markdown |
| **Security check** | Detects secret-like values and unexpected short links |
| **Metadata** | Title, SEO subtitle, tags, hero/cover image wait |
| **Draft-first** | Save as draft by default; opt in to live publish |
| **MCP server** | 7 tools for agent-orchestrated publishing |
| **Persistent session** | Login once; reuse cookies across runs |

---

## Quick start

```bash
npm install -g @paladini/medium-publisher-mcp
medium-publisher login
medium-publisher publish-devto --url "https://dev.to/you/your-post" --draft --json
```

Expected output (JSON):

```json
{
  "ok": true,
  "medium_url": "https://medium.com/p/…/",
  "details": {
    "tags": ["javascript", "automation", "devto", "tutorial"],
    "subtitle": "A concise SEO preview line…",
    "title_set": true,
    "hero_image": true
  }
}
```

---

## Installation

### npm (recommended)

```bash
npm install -g @paladini/medium-publisher-mcp
```

Binaries: `medium-publisher` (CLI) · `medium-publisher-mcp` (MCP server)

Post-install downloads Patchright Chromium automatically.

### From source (monorepo)

```bash
git clone https://github.com/paladini/publish-agents.git
cd publish-agents
npm install && npm run build -w @paladini/medium-publisher-mcp
npm link -w @paladini/medium-publisher-mcp
medium-publisher login
```

### GitHub Packages

```bash
npm install -g @paladini/medium-publisher-mcp --registry=https://npm.pkg.github.com
```

Requires a GitHub PAT with `read:packages` in your `~/.npmrc`.

---

## Authentication

No Medium API key. One interactive login saves browser cookies to disk.

| Platform | Default session path |
|----------|---------------------|
| Windows | `%LOCALAPPDATA%\medium-publisher\storageState.json` |
| macOS / Linux | `~/.local/share/medium-publisher/storageState.json` |

**Environment overrides:** `MEDIUM_STATE_PATH` · `MEDIUM_PUBLISHER_HOME`

```bash
medium-publisher login
medium-publisher session-check --json
```

### Login browser modes

| Mode | Flag | Use when |
|------|------|----------|
| Bundled Chromium | `--browser bundled` | Default; isolated session |
| System Chrome/Edge profile | `--browser system-profile` | Reuse an existing logged-in profile |
| CDP attach | `--browser cdp` | After `medium-publisher browser-start` |

Publish commands always use **bundled Chromium + saved storageState** (not your daily browser profile).

---

## CLI reference

```bash
medium-publisher login [options]
medium-publisher browser-start [--channel chrome|msedge] [--cdp-url URL]
medium-publisher session-check [--json]
medium-publisher publish-devto --url DEVTO_URL [--draft] [--json]
medium-publisher import --url URL [--canonical URL] [--publish] [--dry-run] [--json]
medium-publisher publish --title T --body-file PATH [--tags a,b,c] [--subtitle TEXT] [--publish] [--json]
medium-publisher extract --url MEDIUM_DRAFT_URL [--json]
medium-publisher fix-draft --url URL --actions-file fixes.json [--json]
medium-publisher open-draft --url URL [--json]
```

### Exit codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Failure |
| `2` | Usage error |
| `3` | Session missing or expired → run `login` |
| `4` | Timeout |
| `5` | Dry-run completed |

### Examples

**Cross-post DEV.to as draft (safe default):**

```bash
medium-publisher publish-devto \
  --url "https://dev.to/paladini/my-tutorial" \
  --draft --json
```

**Import a public URL without publishing:**

```bash
medium-publisher import \
  --url "https://dev.to/author/slug" \
  --json
```

**Review formatting after import:**

```bash
medium-publisher extract --url "https://medium.com/p/…/edit" --json
```

**Apply targeted fixes:**

```bash
medium-publisher fix-draft \
  --url "https://medium.com/p/…/edit" \
  --actions-file fixes.json --json
```

`fixes.json` example:

```json
[
  { "type": "removeEmptyCodeBlocks" },
  { "type": "mergeAdjacentCodeBlocks" },
  { "type": "promoteDemoteHeading", "blockIndex": 4, "level": 2 }
]
```

---

## MCP server

Transport: **stdio** (newline-delimited JSON-RPC).

### Client configuration

**Cursor** — Settings → MCP → Add Server:

```json
{
  "mcpServers": {
    "medium-publisher": {
      "command": "medium-publisher-mcp"
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add medium-publisher -- medium-publisher-mcp
```

### Tools

| Tool | Description |
|------|-------------|
| **`medium_publish_from_devto`** | Full pipeline: DEV.to URL → Medium. Args: `devto_url`, `publish` (default `true`) |
| `medium_session_check` | Verify saved session |
| `medium_import` | Import public URL. Args: `url`, `status` (`draft`\|`published`), `dry_run` |
| `medium_publish` | New story from Markdown. Args: `title`, `body`, `status`, `tags`, `subtitle` |
| `medium_extract` | Structured outline + formatting flags from draft URL |
| `medium_fix_draft` | Apply fix actions in the editor |
| `medium_open_draft` | Open draft in a headed browser |

**Recommended agent call:**

```json
{
  "devto_url": "https://dev.to/author/my-post",
  "publish": false
}
```

Returns `{ ok, medium_url, details }` with tags, subtitle, `title_set`, and `hero_image`.

---

## `publish-devto` pipeline

Single browser session, end to end:

```
DEV.to public API
    → medium.com/p/import
    → open editor (/p/…/edit)
    → set title + wait for hero image
    → auto-fix loop (max 3 passes)
    → source review (blocks vs DEV.to Markdown)
    → security check
    → publish dialog (subtitle + tags) [if publish=true]
    → normalized Medium URL
```

**Import DOM note:** the import URL field is a **contenteditable** div, not a search `<input>`. The package targets the correct element automatically.

---

## Configuration

File: `%APPDATA%\medium-publisher\config.json` (Windows) or `~/.config/medium-publisher/config.json`

| Key | Default | Purpose |
|-----|---------|---------|
| `publishByDefault` | `false` | Save draft unless `--publish` |
| `headless` | `false` | Headless browser for publish commands |
| `slowMo` | `0` | Delay ms for debugging selectors |
| `username` | `""` | Soft session validation hint |
| `importTimeoutMs` | `120000` | Import preview timeout |
| `saveTimeoutMs` | `30000` | Autosave wait after edits |

---

## Programmatic API

```typescript
import { publishFromDevto } from '@paladini/medium-publisher-mcp';

const result = await publishFromDevto({
  devtoUrl: 'https://dev.to/user/slug',
  publish: false,
});
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Exit code `3` / session errors | `medium-publisher login` |
| Import hangs on preview | Article must be **public**; check `importTimeoutMs` |
| Tags not applied | Medium autocomplete UI changed — open draft manually |
| Code blocks split after import | Run `extract` → `fix-draft` or use full `publish-devto` pipeline |
| "Security check failed" | Editor contains patterns not in source — review before publishing |

Screenshots on failure: `%LOCALAPPDATA%\medium-publisher\artifacts\` (Windows).

More: [TROUBLESHOOTING.md](https://github.com/paladini/publish-agents/blob/master/skills/publish-medium/TROUBLESHOOTING.md)

---

## Limitations

- Requires Node.js **≥ 20**
- Medium UI changes can break selectors; report issues on GitHub
- Respect Medium's terms of service; do not spam publishes
- DEV.to article must be **published** (public API returns `body_markdown`)
- 2FA / bot challenges may require manual intervention in headed mode

---

## Related

| Resource | Link |
|----------|------|
| Monorepo | [paladini/publish-agents](https://github.com/paladini/publish-agents) |
| DEV.to → Medium guide | [docs/devto-to-medium.md](https://github.com/paladini/publish-agents/blob/master/docs/devto-to-medium.md) |
| Full reference | [docs/medium-publisher.md](https://github.com/paladini/publish-agents/blob/master/docs/medium-publisher.md) |
| LinkedIn cross-post | [@paladini/linkedin-publisher-mcp](https://www.npmjs.com/package/@paladini/linkedin-publisher-mcp) |
| MCP setup | [mcp/medium/README.md](https://github.com/paladini/publish-agents/blob/master/mcp/medium/README.md) |

---

## License

[MIT](https://opensource.org/licenses/MIT) · [Fernando Paladini](https://github.com/paladini)
