# Changelog

All notable changes to the `publish-agents` project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-07-24

### Added
- **`@paladini/medium-publisher-mcp`**:
  - Playwright browser automation for Medium publishing & cross-posting.
  - Interactive login command (`medium-publisher login`) with persistent session storage.
  - Native Stdio MCP server exposing `medium_session_check`, `medium_import`, and `medium_publish` tools.
  - Support for `draft`, `published`, and `dry_run` modes.

- **`@paladini/tabnews-publisher-mcp`**:
  - Playwright browser automation for TabNews content publication.
  - Interactive login command (`tabnews-publisher login`) with persistent session storage.
  - Native Stdio MCP server exposing `tabnews_session_check` and `tabnews_publish` tools.
  - Support for `draft`, `published`, and `dry_run` modes.

- **LinkedIn Integration Guides**:
  - Documentation and configuration for `mcp-server-linkedin` (profile/data reading).
  - Documentation and configuration for `@playwright/mcp` (post publishing).

- **CI/CD & Repository Harness**:
  - GitHub Actions release pipeline (`.github/workflows/release.yml`) for automated dual publishing to NPM Registry and GitHub Packages upon tag pushes (`v*`).
