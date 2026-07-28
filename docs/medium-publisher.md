# medium-publisher reference (v0.2.0)

Complete reference for `@paladini/medium-publisher-mcp` as implemented in this repository. Install from source only (not published to npm).

## Install from this repo

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

Register MCP in your client (`medium-publisher-mcp`). See [mcp/medium/README.md](../mcp/medium/README.md).

## Binaries

| Binary | Entry |
|---|---|
| `medium-publisher` | CLI |
| `medium-publisher-mcp` | MCP stdio server |

Monorepo shortcut: `npm run medium -- <command>` from repo root.

## Authentication

- **No Medium API key.** One interactive login saves cookies to Playwright/Patchright `storageState`.
- **Windows path:** `%LOCALAPPDATA%\medium-publisher\storageState.json`
- **Override:** `MEDIUM_STATE_PATH`, `MEDIUM_PUBLISHER_HOME`
- **Expired session:** exit code `3` → run `medium-publisher login`

### Login browser modes

| Mode | Flag | Notes |
|---|---|---|
| `bundled` | `--browser bundled` | Default in code. Isolated Patchright Chromium |
| `system-profile` | `--browser system-profile` | Real Chrome/Edge profile; close browser first |
| `cdp` | `--browser cdp` | Attach after `browser-start` |
| `chrome` / `edge` | `--browser chrome` | Installed browser, isolated session |

Publish/import commands always use **bundled Chromium + storageState** (not system profile).

## CLI commands

| Command | Description |
|---|---|
| `login` | Interactive login, save session |
| `browser-start` | Chrome with remote debugging for CDP login |
| `session-check [--json]` | Verify session |
| `import --url URL [--publish] [--dry-run] [--json]` | Import public URL → draft + extract |
| `publish --title T --body-file PATH [--publish] [--dry-run] [--json]` | Paste markdown (fallback) |
| `publish-devto --url URL [--draft] [--json]` | **Full pipeline:** DEV.to → Medium → returns URL |
| `extract --url URL [--json]` | Extract editor outline from draft |
| `fix-draft --url URL --actions-file PATH [--json]` | Apply fix actions in editor |
| `open-draft --url URL [--json]` | Open draft in headed browser |

### Exit codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Failure |
| 2 | Usage error |
| 3 | Session missing/expired |
| 4 | Timeout |
| 5 | Dry-run completed |

## MCP tools

Transport: newline-delimited JSON-RPC on stdio.

| Tool | Description |
|---|---|
| **`medium_publish_from_devto`** | Publish DEV.to on Medium. Args: `devto_url`, optional `publish` (default true). Returns Medium URL text on success |
| `medium_session_check` | Session validity |
| `medium_import` | Import URL. Args: `url`, `status` (`draft`\|`published`), `dry_run`, `canonical_url` |
| `medium_publish` | Paste markdown. Args: `title`, `body`, `status`, `tags`, `dry_run` |
| `medium_extract` | Args: `url` → outline + flags |
| `medium_fix_draft` | Args: `url`, `actions[]` |
| `medium_open_draft` | Args: `url` → headed inspection |

## `medium_publish_from_devto` pipeline

Single browser session:

1. Fetch DEV.to markdown via public API (`/api/articles/{user}/{slug}`)
2. Navigate to `https://medium.com/p/import`
3. Fill **contenteditable** import field (not search input)
4. Open draft editor, wait for autosave
5. Auto-fix loop (max 3): empty code blocks, merge adjacent blocks, raw markdown headings
6. Security check (secrets / suspicious links vs source)
7. Publish (unless `publish: false`)
8. Return normalized Medium URL

## Import flow (manual)

1. Goto `https://medium.com/p/import`
2. Wait for heading “See your story on Medium”
3. Type URL into first `[contenteditable="true"]` in import section
4. Click Import → “See your story” → editor
5. Wait for “Saved” (or reload fallback, `saveTimeoutMs`)
6. Optional: `extract`, `fix-draft`, publish

## Extract format

```json
{
  "title": "...",
  "blocks": [{ "index": 0, "type": "paragraph|heading2|code|...", "text": "..." }],
  "medium_url": "...",
  "wordCount": 1200,
  "codeBlockCount": 5,
  "flags": [{ "code": "adjacent_code_blocks", "blockIndex": 3, "message": "..." }]
}
```

Flag codes: `empty_code_block`, `adjacent_code_blocks`, `raw_markdown_heading`, `raw_markdown_fence`, `empty_paragraph`.

## Fix actions (`fix-draft`)

JSON array in `--actions-file`:

```json
[
  { "type": "removeEmptyCodeBlocks" },
  { "type": "mergeAdjacentCodeBlocks" },
  { "type": "replaceBlockText", "blockIndex": 4, "text": "Section title" },
  { "type": "promoteDemoteHeading", "blockIndex": 4, "level": 2 }
]
```

`level`: `2`, `3`, or `"paragraph"`.

## Configuration

File: `%APPDATA%\medium-publisher\config.json` (Windows) or `~/.config/medium-publisher/config.json`

| Key | Default | Purpose |
|---|---|---|
| `publishByDefault` | `false` | CLI import/publish without `--publish` |
| `headless` | `false` | Browser visibility for publish commands |
| `slowMo` | `0` | Debug delay ms |
| `username` | `""` | Soft session validation hint |
| `importTimeoutMs` | `120000` | Import preview wait |
| `saveTimeoutMs` | `30000` | Autosave wait after import/edit |
| `browserMode` | `bundled` | Login browser mode |
| `browserChannel` | `chrome` | Chrome vs Edge for profile modes |
| `cdpUrl` | `http://127.0.0.1:9222` | CDP endpoint |

## Source layout

```
packages/medium-publisher/src/
├── cli.ts
├── mcp-server.ts
└── lib/medium/
    ├── import-flow.ts      # Import page automation
    ├── import-story.ts     # import CLI
    ├── publish-from-devto.ts
    ├── extract-story.ts
    ├── fix-draft.ts
    ├── auto-fix.ts
    ├── devto-api.ts
    ├── security-check.ts
    ├── editor-utils.ts
    ├── session.ts
    └── selectors.ts
```

## Artifacts

Screenshots on success/failure: `%LOCALAPPDATA%\medium-publisher\artifacts\`

## Cursor skills

| Skill | Role |
|---|---|
| `publish-devto-to-medium` | Agent-orchestrated full pipeline |
| `review-medium-import` | Post-import review checklist |
| `publish-medium` | CLI login reference |
| `publish-crosspost` | Multi-channel workflow |

Install: `.\scripts\install-skills.ps1`

## Related

- [DEV.to → Medium guide](./devto-to-medium.md)
- [Architecture](./architecture.md)
- [Setup guide](./setup-guide.md)
