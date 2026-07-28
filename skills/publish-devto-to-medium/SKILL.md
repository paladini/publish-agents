---
name: publish-devto-to-medium
description: >-
  End-to-end DEV.to to Medium cross-post: verify session, import draft, review
  formatting against source markdown, apply fixes, security checks, confirm save,
  and publish only when the draft is fully corrected. Use when the user wants a
  complete corrected Medium post from an existing or new DEV.to article.
disable-model-invocation: true
---

# Publish DEV.to → Medium (full pipeline)

Single skill for **start-to-finish** cross-posting: import, review, fix, verify, publish.

Use when the user says: *"publish this dev.to post on Medium"*, *"cross-post with fixes"*, or *"dev.to to medium end to end"*.

## Prerequisites

| Requirement | How |
|---|---|
| `publish-agents` built | `cd publish-agents && npm install && npm run build` |
| Medium session | `npm run medium -- session-check` (exit 3 → `login`) |
| Public DEV.to URL | Article must be live and reachable |
| Source markdown | DEV.to `body_markdown` via `user-devto` MCP, or local file |

**Order:** DEV.to must be published **before** Medium import (stable URL + canonical).

## Pipeline overview

```
session-check → fetch DEV.to markdown → medium_import (draft)
→ compare extract vs source → medium_fix_draft (loop)
→ security checks → user confirms → medium_import --publish OR manual publish
→ record medium_url
```

Do **not** skip review. DEV.to markdown → Medium import often breaks code blocks and headings.

## Step 1 — Session and source

```bash
cd D:\code\publish-agents
npm run medium -- session-check
```

Fetch source (pick one):

- **Existing DEV.to URL:** `user-devto` MCP — get article `body_markdown`, title, tags
- **New post:** publish DEV.to first via `create_article`, then use `published_url`

Store: `devto_url`, `source_markdown`, `title`.

## Step 2 — Import draft

```bash
npm run medium -- import --url "<dev.to URL>" --json
```

Or MCP `medium_import` with `status: "draft"`.

Save from response:

- `medium_url` — draft editor URL
- `extract` — `{ title, blocks, flags, wordCount, codeBlockCount }`
- `screenshot` — artifact path

If `ok: false`, stop and report error + screenshot. Do not publish.

## Step 3 — Formatting review (mandatory)

Follow the checklist in **review-medium-import** (same repo). Summary:

### Compare source markdown vs `extract`

| Area | What to check |
|---|---|
| Headings | `#` / `##` / `###` → Medium H2/H3; no raw `## Title` in blocks |
| Code | No empty fences; no split blocks (`adjacent_code_blocks` flag) |
| Paragraphs | No spurious empty blocks |
| Links / bold | No literal `**` or broken `[text](url)` |
| Lists | Not merged into single paragraphs |

### Auto-fix first (always try)

Build `fixes.json` and apply:

```bash
npm run medium -- fix-draft --url "<medium_url>" --actions-file fixes.json --json
```

Typical first pass:

```json
[
  { "type": "removeEmptyCodeBlocks" },
  { "type": "mergeAdjacentCodeBlocks" }
]
```

Then targeted fixes:

```json
[
  { "type": "replaceBlockText", "blockIndex": 4, "text": "Section title" },
  { "type": "promoteDemoteHeading", "blockIndex": 4, "level": 2 }
]
```

Re-extract until `extract.flags` is empty or only minor/manual items remain:

```bash
npm run medium -- extract --url "<medium_url>" --json
```

Max **3** fix loops; if still broken → `open-draft` for manual edit, then re-extract.

## Step 4 — Security checks (mandatory)

Compare suspicious blocks to **source markdown only** — do not invent content.

- [ ] No API keys, tokens, `.env` values, or passwords in Medium that weren't in source
- [ ] No unexpected external links or redirect domains
- [ ] Code blocks match source (no truncated secrets, no injected snippets)
- [ ] Canonical / cross-post intent: DEV.to URL is the primary source

If security issue found: fix via `replaceBlockText` or manual edit; **do not publish** until resolved.

## Step 5 — Confirm save

Import and fix commands wait for Medium **Saved**. Verify:

- `medium_url` is a story editor URL (`/p/...` or `@user/.../...`)
- Draft visible at `medium.com/me/stories` (optional: tell user to confirm)

## Step 6 — Publish (explicit opt-in)

**Default: leave as draft** and report `medium_url`.

Publish only when user explicitly asks (*"publish it"*, *"go live"*):

```bash
npm run medium -- import --url "<dev.to URL>" --publish --json
```

If draft was already fixed, prefer opening the saved draft and clicking Publish manually, **or** re-import with `--publish` only if user accepts re-import risk.

Safer path after review: tell user draft is ready; they publish from Medium UI, or agent uses `--publish` on confirmation.

## Step 7 — Final report

Always return:

```markdown
## DEV.to → Medium complete

| Field | Value |
|---|---|
| DEV.to | <url> |
| Medium draft | <medium_url> |
| Medium published | yes/no |

### Formatting
- Issues found: …
- Auto-fixed: …
- Remaining (manual): …

### Security
- Passed / issues: …

### Extract summary
- Blocks: N | Code blocks: N | Flags: N
```

Update announcement frontmatter if applicable:

```yaml
devto_url: https://dev.to/...
medium_url: https://medium.com/...
```

## When to use which tool

| Goal | Tool |
|---|---|
| **Publish DEV.to on Medium (one tool)** | `medium_publish_from_devto` |
| Step-by-step / draft only | `medium_import`, `medium_fix_draft`, … |
| Agent-orchestrated review | Skill `publish-devto-to-medium` |

## MCP tools (alternative to CLI)

| Tool | Step |
|---|---|
| **`medium_publish_from_devto`** | **All steps** — prefer for simple "publish on Medium" requests |
| `medium_session_check` | 1 |
| `medium_import` | 2, 6 |
| `medium_extract` | 3 |
| `medium_fix_draft` | 3 |
| `medium_open_draft` | 3 fallback |

## Related skills

| Skill | Role |
|---|---|
| **publish-devto-to-medium** (this) | Full orchestration |
| **review-medium-import** | Detailed review checklist |
| **publish-medium** | Login, CLI reference |
| **publish-crosspost** | Multi-channel (DEV.to + Medium + TabNews) |
| **user-devto** | DEV.to API |

## Do not

- Publish without formatting review on technical posts
- Skip security checks
- Re-publish DEV.to duplicate (use `update_article` if updating)
- Commit `storageState.json` or credentials
- Gate CI on Medium browser automation

## Reference

Full technical details: [`docs/devto-to-medium.md`](../../docs/devto-to-medium.md)
