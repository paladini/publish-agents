# MCP Config — medium-publisher

Add `medium-publisher-mcp` to any MCP-compatible client. Install from the [publish-agents](https://github.com/paladini/publish-agents) repo (see [docs/setup-guide.md](../../docs/setup-guide.md)).

**Prerequisite:** login once:

```powershell
medium-publisher login
```

Session: `%LOCALAPPDATA%\medium-publisher\storageState.json`

---

## Client configuration

### Claude Desktop

`%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "medium-publisher": {
      "command": "medium-publisher-mcp"
    }
  }
}
```

### Cursor

Settings → MCP → Add Server → Command: `medium-publisher-mcp`

Or in MCP config JSON:

```json
{
  "mcpServers": {
    "medium-publisher": {
      "command": "medium-publisher-mcp"
    }
  }
}
```

### Claude Code

```bash
claude mcp add medium-publisher -- medium-publisher-mcp
```

---

## Tools (v0.2.0)

| Tool | Description |
|---|---|
| **`medium_publish_from_devto`** | Publish a DEV.to article on Medium. Returns Medium URL. Args: `devto_url`, optional `publish` (default `true`) |
| `medium_session_check` | Verify saved session |
| `medium_import` | Import public URL. Args: `url`, `status` (`draft`\|`published`), `dry_run`, `canonical_url` |
| `medium_publish` | New story from markdown. Args: `title`, `body`, `status`, `tags`, `dry_run` |
| `medium_extract` | Extract draft outline + formatting flags. Args: `url` |
| `medium_fix_draft` | Apply editor fixes. Args: `url`, `actions[]` |
| `medium_open_draft` | Open draft in headed browser. Args: `url` |

### Recommended usage

> Use `medium_publish_from_devto` with `devto_url: "https://dev.to/author/my-post"`

Success response: plain text Medium article URL.

For step-by-step control, use `medium_import` → `medium_extract` → `medium_fix_draft`.

---

## Authentication

No Medium API key. Cookies from `medium-publisher login`. Do not commit `storageState.json`.

---

## Documentation

- [medium-publisher reference](../../docs/medium-publisher.md)
- [DEV.to → Medium guide](../../docs/devto-to-medium.md)
