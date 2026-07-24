# Medium publisher — troubleshooting

## Session expired (exit 3)

```bash
medium-publisher login
```

Prefer `--browser system-profile` (default) if Medium works in your normal Chrome.

## Chrome says profile in use

Close **every** Chrome window (check system tray), then retry.

Or use CDP mode:

```powershell
medium-publisher browser-start
medium-publisher login --browser cdp
```

## browser-start / CDP connect failed

- Close normal Chrome first, then `medium-publisher browser-start`.
- Default CDP URL: `http://127.0.0.1:9222` (override with `--cdp-url` or `MEDIUM_CDP_URL`).
- Then: `medium-publisher login --browser cdp`.

## Import fails / timeout (exit 4)

- Confirm URL loads in a private browser tab (no paywall).
- dev.to posts must be **published**, not draft.
- Increase timeout in config: `importTimeoutMs: 180000`.
- Check screenshot in `artifacts/` folder under app data dir.

## Import button not found

Medium changed UI. Update selectors in:

`packages/medium-publisher/src/lib/medium/selectors.ts`

Run dry-run with `headless: false` in config to watch the browser.

## Paste publish mangled formatting

Use **import mode** instead (`import --url`). Paste mode is best-effort for ProseMirror.

## 2FA / captcha during login

Use interactive `login` (headful browser). Complete verification manually, then press Enter.

## Chromium not installed

```bash
npx playwright install chromium
```

## Permission errors on clipboard paste

Run with `headless: false`. Windows may need browser focused during paste step.
