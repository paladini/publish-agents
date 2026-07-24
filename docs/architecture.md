# Architecture — publish-agents

## Goals

- **Reusable** across projects (harness-score, mcp-me, blog posts, etc.)
- **Deterministic CLI** contracts (JSON output, exit codes) for agents and CI
- **Browser only where APIs are closed** (Medium); API-first elsewhere (TabNews, dev.to)

## Layers

```
┌─────────────────────────────────────────────────────────┐
│  Cursor Skills (publish-medium, publish-crosspost)      │
│  — orchestration, mcp-me tone, when to dry-run          │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  MCP (optional, future)                                  │
│  — thin wrapper over CLI subprocess                      │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  CLI packages (@paladini/medium-publisher, …)             │
│  — Playwright / fetch, session on disk                    │
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

Default agent path: **dev.to MCP → Medium import URL**.

## Roadmap

1. **v0.1** — medium-publisher CLI + skills (this repo)
2. **v0.2** — tabnews-publisher CLI (REST API)
3. **v0.3** — `publish-crosspost` one-shot: write → dev.to → tabnews → medium
4. **v0.4** — optional MCP server `publish-agents-mcp`
