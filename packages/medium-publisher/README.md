# @paladini/medium-publisher

Publish to **Medium** via Playwright with a persistent browser session.

## Install

From the monorepo root:

```bash
cd publish-agents
npm install
npm run build
```

Install Chromium (first time):

```bash
npx playwright install chromium
```

## Quick start

### 1. Login once (interactive)

```bash
npx medium-publisher login
```

Sign in in the browser window, then press Enter in the terminal. Session is saved to:

- **Windows:** `%LOCALAPPDATA%\medium-publisher\storageState.json`
- **Linux/macOS:** `~/.local/share/medium-publisher/storageState.json`

### 2. Check session

```bash
npx medium-publisher session-check
```

### 3. Cross-post from dev.to (recommended)

```bash
npx medium-publisher import \
  --url "https://dev.to/paladini/your-post" \
  --dry-run

npx medium-publisher import \
  --url "https://dev.to/paladini/your-post" \
  --publish \
  --json
```

Medium's import tool fetches the public URL and sets the canonical link automatically.

### 4. Publish local markdown (fallback)

```bash
npx medium-publisher publish \
  --title "My title" \
  --body-file ./post.md \
  --dry-run
```

Uses clipboard paste into Medium's ProseMirror editor — less reliable than import.

## Configuration

Optional `~/.config/medium-publisher/config.json` (Windows: `%APPDATA%\medium-publisher\config.json`):

```json
{
  "publishByDefault": false,
  "headless": false,
  "username": "fernandopaladini",
  "importTimeoutMs": 120000
}
```

## Exit codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Failure |
| 2 | Usage error |
| 3 | Session missing/expired |
| 4 | Timeout |
| 5 | Dry-run completed |

## Troubleshooting

See [../../skills/publish-medium/TROUBLESHOOTING.md](../../skills/publish-medium/TROUBLESHOOTING.md).

Screenshots on failure: `%LOCALAPPDATA%\medium-publisher\artifacts\` (or `~/.local/share/medium-publisher/artifacts/`).
