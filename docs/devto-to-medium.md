# DEV.to → Medium cross-posting guide

This document captures the **important implementation details** for cross-posting from DEV.to to Medium using `publish-agents`. Read this before changing the import flow or debugging broken drafts.

## Why browser automation?

Medium has **no stable public write API**. The supported path is:

1. Publish on DEV.to (REST API via `user-devto` MCP).
2. Import the public DEV.to URL into Medium’s official **Import story** tool.
3. Review and fix formatting in Medium’s editor (import is lossy for markdown/code).

Authentication uses **saved browser cookies** (`storageState.json`), not API keys.

## Architecture

```
DEV.to (API)          Medium (browser)
     │                       │
     │  public URL           │  Patchright + cookies
     └──────────► import ───►│  editor + autosave
                               │
                    extract / fix-draft / publish
```

| Layer | Location |
|---|---|
| CLI + MCP | `packages/medium-publisher` |
| Skills | `skills/publish-devto-to-medium`, `review-medium-import`, `publish-medium` |
| Session file | `%LOCALAPPDATA%\medium-publisher\storageState.json` (Windows) |

## Correct import URL

The import page is:

**`https://medium.com/p/import`**

Do **not** use `/me/stories/import` as the primary entry. The page title is *Import your story*; heading: **See your story on Medium**.

### Critical DOM detail

The import URL field is **not** an `<input>`. It is a **`contenteditable` div** with placeholder text `http://www.yoursite.org/your-post`.

The only visible `<input>` on that page is the header **Search Medium** field (`type="search"`). Code that does `page.locator('input').first()` will fill search instead of the import field — a common bug we fixed.

**Correct fill sequence:**

1. Wait for heading `See your story on Medium`.
2. Target `[contenteditable="true"]` (first block in import section, or following “Enter a link to your blog post”).
3. Click → Ctrl+A → Backspace → type URL.
4. Click **Import** button.

## End-to-end workflow

### 1. One-time login

```powershell
cd publish-agents
medium-publisher login
```

Cookies persist for months unless you log out of Medium in the browser.

### 2. Publish on DEV.to first

Medium import needs a **public** URL. DEV.to first also sets canonical attribution correctly.

### 3. Import as draft

```bash
npm run medium -- import --url "https://dev.to/author/slug" --json
```

Response includes:

- `medium_url` — draft editor URL
- `extract` — structured outline + formatting flags
- `screenshot` — artifact under `%LOCALAPPDATA%\medium-publisher\artifacts\`

### 4. Review formatting (required for technical posts)

Import often causes:

| Problem | Extract flag |
|---|---|
| Empty code block | `empty_code_block` |
| One fence split into two blocks | `adjacent_code_blocks` |
| Raw markdown in body | `raw_markdown_heading`, `raw_markdown_fence` |
| Extra blank paragraphs | `empty_paragraph` |

Compare against DEV.to `body_markdown` (ground truth).

### 5. Apply fixes

```bash
npm run medium -- fix-draft --url "<medium_url>" --actions-file fixes.json --json
```

Actions:

| Action | Purpose |
|---|---|
| `removeEmptyCodeBlocks` | Delete empty `pre` blocks |
| `mergeAdjacentCodeBlocks` | Join consecutive code blocks |
| `replaceBlockText` | Replace block text (headings, cleanup) |
| `promoteDemoteHeading` | Set H2 / H3 / paragraph |

Re-run extract until flags are acceptable:

```bash
npm run medium -- extract --url "<medium_url>" --json
```

### 6. Security checks

Before publish:

- No secrets in Medium that weren’t in source markdown
- Links point to expected domains
- Code blocks not truncated or injected

### 7. Publish (opt-in)

Default: **stop at draft**. Publish only when explicitly requested:

```bash
npm run medium -- import --url "https://dev.to/..." --publish --json
```

## Draft save behavior

After import, the tool:

1. Opens the story editor (via “See your story” or direct editor URL).
2. Waits for Medium **Saved** indicator (or reload fallback, ~30s timeout).
3. Extracts content **before** closing the browser.

## Metadata from DEV.to

During `publish-devto` / `medium_publish_from_devto`, the pipeline reads extra fields from the DEV.to API and applies them on Medium:

| DEV.to field | Medium destination |
|---|---|
| `title` | Story title (editor) + publish preview title |
| `description` | SEO subtitle (~140 chars) in the publish dialog |
| `tag_list` | Up to 5 topics in the publish dialog |
| `cover_image` / `social_image` | Hero image — waited for after import (Medium may fetch OG async) |

The JSON result includes `details.subtitle`, `details.tags`, `details.title_set`, and `details.hero_image` when useful for verification.

“Saved as draft” is returned only after autosave is confirmed — not immediately after clicking Import.

## CLI commands

| Command | Purpose |
|---|---|
| `session-check` | Verify cookies still valid |
| `import --url` | Import DEV.to URL → draft + extract |
| `extract --url` | Read editor outline from existing draft |
| `fix-draft --url --actions-file` | Apply formatting fixes |
| `publish-devto --url` | One-shot DEV.to → Medium (import, auto-fix, publish) |
| `open-draft --url` | Headed browser for manual inspection |

## MCP tools

| Tool | Purpose |
|---|---|
| **`medium_publish_from_devto`** | **Publish DEV.to on Medium** — import, auto-fix, publish → returns Medium URL |
| `medium_session_check` | Session validity |
| `medium_import` | Import URL (`status`: `draft` \| `published`) |
| `medium_extract` | Extract outline |
| `medium_fix_draft` | Apply fix actions array |
| `medium_open_draft` | Open draft headed |

### Simplest usage (MCP)

Ask your agent:

> Use `medium_publish_from_devto` with `devto_url: "https://dev.to/author/slug"`

Response is **only the live Medium URL** on success.

CLI equivalent:

```bash
npm run medium -- publish-devto --url "https://dev.to/author/slug"
# prints: https://medium.com/...
```

Use `--draft` to stop before publish (returns draft editor URL).

See [`mcp/medium/README.md`](../mcp/medium/README.md) for client setup.

## Cursor skills

| Skill | When to use |
|---|---|
| **`publish-devto-to-medium`** | Full pipeline: import → review → fix → security → publish |
| **`review-medium-import`** | Formatting review only (after import) |
| **`publish-medium`** | Medium login and CLI reference |
| **`publish-crosspost`** | Multi-channel announcements (DEV.to + Medium + TabNews) |

Install skills:

```powershell
.\scripts\install-skills.ps1
```

## Import vs paste

| Mode | Command | Use when |
|---|---|---|
| **Import URL** | `import --url` | Cross-post from DEV.to — **preferred** |
| **Paste markdown** | `publish --body-file` | No public URL; less reliable (ProseMirror paste) |

Always prefer import for DEV.to cross-posts.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| URL goes to search box | Wrong selector (`input` vs `contenteditable`) | Use current `import-story.ts` |
| Cloudflare “Just a moment…” | Headless bot check | Run headed once; ensure valid session |
| Draft not in `/me/stories` | Autosave not waited | Check `saveTimeoutMs` in config |
| Split code blocks | Medium import artifact | `mergeAdjacentCodeBlocks` |
| Session exit code 3 | Expired cookies | `medium-publisher login` |

More: [`skills/publish-medium/TROUBLESHOOTING.md`](../skills/publish-medium/TROUBLESHOOTING.md)

## Configuration

`%APPDATA%\medium-publisher\config.json`:

```json
{
  "publishByDefault": false,
  "headless": false,
  "importTimeoutMs": 120000,
  "saveTimeoutMs": 30000
}
```

## What we deliberately skip (for now)

- Automatic publish after review (user must opt in)
- Tags / canonical UI automation
- CI E2E against live Medium
- Medium official API (unavailable)

## Related docs

- [Architecture](./architecture.md)
- [Setup guide](./setup-guide.md)
- [Medium package README](../packages/medium-publisher/README.md)
