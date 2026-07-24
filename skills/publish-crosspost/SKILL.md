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

From **publish-agents** repo:

```bash
npm run medium -- session-check
npm run medium -- import --url "<dev.to URL>" --dry-run --json
npm run medium -- import --url "<dev.to URL>" --publish --json
```

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

1. **publish-crosspost** (this file) — pipeline
2. **publish-medium** — Medium CLI details
3. **mcp-me** — voice
4. **user-devto** — dev.to API

## Failures

- dev.to succeeded, Medium failed → user still has primary post; retry Medium only
- Never re-publish dev.to duplicate unless updating same `article_id` via `update_article`
