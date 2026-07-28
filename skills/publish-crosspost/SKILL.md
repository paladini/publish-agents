---
name: publish-crosspost
description: >-
  Orchestrate multi-channel publication: write with mcp-me voice, publish dev.to
  via MCP, cross-post Medium via medium-publisher CLI. Use for release announcements,
  cross-posting, or "publish everywhere" requests.
disable-model-invocation: true
---

# Cross-post orchestration

Coordinates **writing style**, **dev.to**, and **Medium** (TabNews API when available).

## Channels

| Channel | Tool | Language default |
|---|---|---|
| dev.to | MCP `user-devto` → `create_article` | English |
| Medium | CLI `medium-publisher import --url` | Import from dev.to (same language) |
| TabNews | Manual or future `tabnews-publisher` | Portuguese |
| Tone | MCP `user-me` → `ask_about_me` | Match user voice |

## Standard pipeline

### 1. Prepare content

- Source: changelog, `content/*-announcement.md`, or user brief
- Ask **mcp-me** for voice if writing from scratch
- Save draft markdown with YAML frontmatter (`title`, `tags`, `description`)

### 2. Publish dev.to first

```
create_article(title, body_markdown, tags, published: true)
```

Store `published_url` and `article_id` in frontmatter.

### 3. Medium cross-post

Use skill **`publish-devto-to-medium`** for the full corrected pipeline, or manually:

From **publish-agents** repo:

```bash
npm run medium -- session-check
npm run medium -- import --url "<dev.to URL>" --json
# review-medium-import / fix-draft as needed
npm run medium -- import --url "<dev.to URL>" --publish --json  # explicit opt-in only
```

See [docs/devto-to-medium.md](../docs/devto-to-medium.md).

Add `medium_url` to frontmatter.

### 4. TabNews (until API CLI ships)

Adapt title/body to Portuguese; user pastes or run future CLI.

## Frontmatter template

```yaml
---
title: "..."
description: "..."
tags: ai, opensource
devto_url: https://dev.to/...
devto_id: 123456
medium_url: https://medium.com/...
tabnews_url:
---
```

Keep announcement files in **each product repo's `content/`** folder — not in publish-agents.

## Order matters

Always **dev.to → Medium import** so Medium gets a stable public URL and canonical link.

## Skills used together

1. **publish-crosspost** (this file) — multi-channel pipeline
2. **publish-devto-to-medium** — full DEV.to → Medium with review and fixes
3. **review-medium-import** — formatting review only
4. **publish-medium** — Medium CLI details
5. **mcp-me** — voice
6. **user-devto** — dev.to API

## Failures

- dev.to succeeded, Medium failed → user still has primary post; retry Medium only
- Never re-publish dev.to duplicate unless updating same `article_id` via `update_article`
