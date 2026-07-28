---
name: publish-medium
description: >-
  Publish or cross-post to Medium via the medium-publisher CLI (Playwright).
  Use when the user asks to publish on Medium, cross-post from dev.to/TabNews,
  import a story URL, or run medium-publisher login/session-check/import/publish.
disable-model-invocation: true
---

# Publish to Medium

Uses **`@paladini/medium-publisher`** from the **publish-agents** repo — **not** harness-score or other product repos.

## ⚠️ Wrong directory = `Missing script: "medium"`

`npm run medium` only works inside **publish-agents**:

```powershell
cd D:\code\publish-agents
npm run medium -- login
```

From **any** directory (Windows):

```powershell
D:\code\publish-agents\scripts\medium.ps1 login
```

Or after `npm link` in `packages/medium-publisher`:

```powershell
medium-publisher login
```

Set `PUBLISH_AGENTS_ROOT=D:\code\publish-agents` if the repo lives elsewhere.

## Prerequisites

- Node.js 20+
- Repo at `D:\code\publish-agents` (or `PUBLISH_AGENTS_ROOT`)
- Built once: `npm install && npm run build`
- One-time login: see commands above

## Login (reuse your Chrome/Edge session)

Default config uses **`system-profile`** — your real Chrome Default profile.

**If already logged into Medium in Chrome:**

1. Close **all** Chrome windows.
2. `medium-publisher login` → press Enter when `/me/stories` loads.

**If Chrome must stay open:**

```powershell
medium-publisher browser-start
medium-publisher login --browser cdp
```

**Isolated Playwright Chromium (no profile):**

```powershell
medium-publisher login --browser bundled
```

Config: `%APPDATA%\medium-publisher\config.json` — copy from `packages/medium-publisher/config.example.json`.

## Workflow (cross-post — preferred)

1. Confirm source URL is **public** (dev.to or TabNews).
2. Session check:

```bash
npm run medium -- session-check
```

3. Dry-run import (creates draft + extract, no publish):

```bash
npm run medium -- import --url "https://dev.to/..." --dry-run --json
```

4. Import draft:

```bash
npm run medium -- import --url "https://dev.to/..." --json
```

5. **Review formatting** — follow `skills/review-medium-import/SKILL.md` (compare DEV.to markdown, fix code blocks/headings via `fix-draft`).

6. Publish only when user confirms:

```bash
npm run medium -- import --url "https://dev.to/..." --publish --json
```

7. Record returned `medium_url` in the announcement markdown frontmatter (`medium_url:`).

## Workflow (local markdown — fallback)

When no public URL exists:

```bash
npm run medium -- publish --title "..." --body-file ./post.md --dry-run
npm run medium -- publish --title "..." --body-file ./post.md --publish --json
```

## When session fails (exit 3)

Tell the user to run **interactive login** — do not store passwords in repo files:

```bash
npm run medium -- login
```

## Style / content

For tone and structure, consult **mcp-me** (`ask_about_me`) before writing. After DEV.to import, run **review-medium-import** or use **publish-devto-to-medium** for the full pipeline. See [docs/devto-to-medium.md](../docs/devto-to-medium.md).

## Do not

- Commit `storageState.json` or `.env` with credentials
- Gate CI on Medium publish (flaky browser)
- Use Playwright when TabNews API CLI exists (future `tabnews-publisher`)

## Troubleshooting

See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).
