# linkedin-publisher

Cross-post DEV.to articles to **LinkedIn Articles** via browser automation (Patchright).

Converts Markdown to LinkedIn-compatible rich text (headings, lists, links, code as blockquotes, images) and **saves as draft by default**.

## Install

From the monorepo root:

```bash
npm install
npm run build -w @paladini/linkedin-publisher-mcp
```

## Login (once)

```bash
linkedin-publisher login
```

Session saved to `%LOCALAPPDATA%\linkedin-publisher\storageState.json` (Windows).

## CLI

```bash
# Cross-post DEV.to → LinkedIn draft
linkedin-publisher publish-devto --url https://dev.to/author/my-post

# Preview conversion without browser
linkedin-publisher preview-devto --url https://dev.to/author/my-post --json

# Publish from local markdown
linkedin-publisher publish --title "My Title" --body-file article.md --source-url https://dev.to/...

# Check session
linkedin-publisher session-check
```

## MCP tools

| Tool | Description |
|------|-------------|
| **`linkedin_publish_from_devto`** | Main tool — DEV.to URL → LinkedIn draft |
| `linkedin_session_check` | Verify saved session |
| `linkedin_publish` | Publish raw Markdown as LinkedIn Article |
| `linkedin_preview_devto` | Preview conversion (no browser) |

### Cursor config

```json
{
  "mcpServers": {
    "linkedin-publisher": {
      "command": "linkedin-publisher-mcp"
    }
  }
}
```

## Formatting rules

| Markdown | LinkedIn |
|----------|----------|
| `# Title` | Article title field (not in body) |
| `##` / `###` | H2 / H3 |
| `**bold**`, `*italic*` | Rich text |
| `[text](url)` | Hyperlink |
| `- list` / `1. list` | Bullet / numbered lists |
| `> quote` | Blockquote |
| ` ```code``` ` | Blockquote + monospace (LinkedIn has no code blocks) |
| `![alt](url)` | Inline image (inserted after paste) |
| Cover image | DEV.to `cover_image` or first inline image |

Adds footer: *Publicado originalmente em [DEV.to](source_url).*

## Notes

- Uses **Patchright** (not vanilla Playwright) — LinkedIn detects standard Playwright.
- Default is **draft only** — set `publish: true` to go live.
- LinkedIn auto-saves drafts while editing.
- Limit automated publishing to 2–3 posts/day.

## Related

- [mcp/linkedin/README.md](../../mcp/linkedin/README.md) — MCP client setup
- [medium-publisher](../medium-publisher) — DEV.to → Medium cross-post
