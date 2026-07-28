# Architecture — publish-agents

## Goals

- **Reusable** across projects (harness-score, mcp-me, blog posts, etc.)
- **Deterministic CLI** contracts (JSON output, exit codes) for agents and CI
- **Browser only where APIs are closed** (Medium); API-first elsewhere (TabNews, dev.to)

## Layers

```
┌─────────────────────────────────────────────────────────┐
│  Cursor Skills                                          │
│  publish-devto-to-medium · review-medium-import ·       │
│  publish-medium · publish-crosspost                     │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  MCP (medium-publisher-mcp)                             │
│  medium_import · medium_extract · medium_fix_draft · …  │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  CLI packages (@paladini/medium-publisher, …)             │
│  — Patchright / fetch, session on disk                    │
└───────────────────────────────────────────────────────────┘
```

## Medium session model

- **Login:** interactive once → `storageState.json` (cookies)
- **Publish commands:** load storageState, assert `/me/stories` loads
- **Expiry:** exit code `3`, user re-runs `login`
- **Secrets:** never commit storageState; chmod 600 on Unix

## Import vs paste

| Mode | Command | Reliability |
|---|---|---|
| Cross-post | `import --url` | High — Medium fetches public HTML |
| Original | `publish --body-file` | Medium — ProseMirror paste |

Default agent path: **dev.to MCP → Medium import URL → review-medium-import → publish**.

See [devto-to-medium.md](./devto-to-medium.md) for import URL, contenteditable field, autosave, extract/fix commands, and security checks.

## Releases

| Version | Medium publisher |
|---|---|
| **v0.2.0** | DEV.to one-shot publish, extract/fix, autosave, skills |
| v0.1.0 | Initial CLI + MCP import/publish |

See [CHANGELOG.md](../CHANGELOG.md).

## Roadmap

- TabNews REST API publisher (if/when stable API available)
- Unified multi-channel MCP wrapper
