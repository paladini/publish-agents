# Changelog

## [0.2.1] — 2026-07-28

### Added

- **Story metadata module** (`story-metadata.ts`) — title, SEO subtitle (~140 chars), Medium topics (up to 5)
- DEV.to API fields: `description`, `tag_list`, `cover_image`, `social_image`
- Publish dialog automation: preview title/subtitle, topic autocomplete via `#tagMultiSelectMenu`
- Hero image wait after import (OG fetch)
- CLI `--json` returns `details` (tags, subtitle, `title_set`, `hero_image`)
- Unit tests for `truncateSeoDescription` and `parseDevtoTags`

### Fixed

- **Import navigation** — do not click "See your story" when already on `/p/.../edit` (was opening import preview and breaking publish)
- **Tags** — wait for autocomplete menu, pick exact topic match, dismiss dropdown between tags
- **Publish URL** — normalize to clean `https://medium.com/p/{id}/` after publish
- Overlay dismiss before clicking Publish

### Changed

- MCP `medium_publish_from_devto` returns JSON with `medium_url` + `details` (was plain URL text)
- MCP `medium_publish` accepts optional `subtitle`; server version read from `package.json`
- MCP server version synced (was stale `0.1.0`)

### Package

- `@paladini/medium-publisher-mcp` **0.2.1** — GitHub release only

## [0.2.0] — 2026-07-28

### Added

- **`medium_publish_from_devto`** MCP tool and **`publish-devto`** CLI — one-shot DEV.to → Medium with auto-fix and publish
- Post-import **autosave** wait before closing browser
- **`extract`** — structured editor outline + formatting flags
- **`fix-draft`** — apply fix actions in Medium editor
- **`open-draft`** — headed draft inspection
- Auto-fix: empty code blocks, adjacent code blocks, raw markdown headings
- Security check comparing Medium content to DEV.to source
- Import via correct URL `https://medium.com/p/import` and **contenteditable** field (not search input)
- Cursor skills: `publish-devto-to-medium`, `review-medium-import`
- Documentation: `docs/devto-to-medium.md`, `docs/medium-publisher.md`

### Changed

- `import` returns `extract` in JSON result
- `postinstall` uses `patchright install chromium`
- MCP server exposes 7 tools (was 3)

### Package

- `@paladini/medium-publisher-mcp` **0.2.0** — distributed via this GitHub repo only

## [0.1.0] — initial

- Medium CLI + MCP (`medium_import`, `medium_publish`, `medium_session_check`)
- Patchright browser automation with persistent session
- Import URL and markdown paste flows
- Cursor skills `publish-medium`, `publish-crosspost`
