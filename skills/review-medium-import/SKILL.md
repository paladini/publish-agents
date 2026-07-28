---
name: review-medium-import
description: >-
  Review and fix Medium drafts after DEV.to import. Compare source markdown with
  extracted Medium editor outline, fix formatting (code blocks, headings), confirm
  autosave. Use after medium_import or when import formatting looks broken.
disable-model-invocation: true
---

# Review Medium import formatting

Run **after** `medium_import` (draft) when cross-posting from DEV.to or other markdown sources. DEV.to → Medium import often breaks code fences, splits blocks, or leaves raw markdown.

## Prerequisites

- `publish-agents` built (`npm install && npm run build`)
- Valid Medium session (`medium-publisher session-check`)
- Source markdown (DEV.to body or local `.md` file)
- `medium_url` from import result (draft editor URL)

## Pipeline

### 1. Import draft (if not done)

```bash
cd D:\code\publish-agents
npm run medium -- import --url "<public dev.to URL>" --json
```

Result includes `medium_url`, `extract` (blocks + `flags`), and screenshot path.

### 2. Load source markdown

- From DEV.to MCP / API: `body_markdown` of the published article
- Or local file used to publish DEV.to

Keep this as the **ground truth** for structure and code fences.

### 3. Compare source vs extract

Inspect `extract.blocks` and `extract.flags`:

| Check | Source (markdown) | Medium extract issue |
|---|---|---|
| Headings | `#` / `##` / `###` hierarchy | `raw_markdown_heading`, wrong `heading2`/`heading3`/`paragraph` |
| Code fences | ` ```lang ` blocks | `empty_code_block`, `adjacent_code_blocks`, `raw_markdown_fence` |
| Paragraphs | blank lines between sections | `empty_paragraph` |
| Bold/links | `**`, `[text](url)` | literal `**` or broken links in block text |
| Lists | `-` / `1.` | merged into paragraphs |

Build a fix plan: list issues → intended fix action per issue.

### 4. Apply fixes in editor

Use MCP `medium_fix_draft` or CLI:

```bash
npm run medium -- fix-draft --url "<medium_url>" --actions-file ./fixes.json --json
```

`fixes.json` example:

```json
[
  { "type": "removeEmptyCodeBlocks" },
  { "type": "mergeAdjacentCodeBlocks" },
  { "type": "replaceBlockText", "blockIndex": 4, "text": "Section title" },
  { "type": "promoteDemoteHeading", "blockIndex": 4, "level": 2 }
]
```

Action reference:

- `removeEmptyCodeBlocks` — delete empty `pre` blocks
- `mergeAdjacentCodeBlocks` — join consecutive code blocks (split import artifact)
- `replaceBlockText` — replace block text (headings, cleanup raw markdown)
- `promoteDemoteHeading` — set block to H2/H3/paragraph via format menu

Re-run `medium_extract` (or read `extract` from fix result) until flags are acceptable or only minor issues remain.

### 5. Manual fallback

If automation cannot fix a block (complex tables, embeds, images):

1. `medium_open_draft` or `open-draft --url` (headed browser)
2. Edit manually in Medium editor
3. Re-run `extract` to verify

### 6. Confirm save — do not publish

- Fix commands wait for Medium **Saved** indicator
- Verify draft appears under `medium.com/me/stories`
- **Do not** call `--publish` unless user explicitly asks

### 7. Report to user

```markdown
## Medium import review

- **Draft URL:** …
- **Issues found:** …
- **Fixed:** …
- **Remaining (manual):** …
- **Extract flags:** …
```

## MCP tools

| Tool | Purpose |
|---|---|
| `medium_import` | Import URL → draft + extract |
| `medium_extract` | Re-read editor outline |
| `medium_fix_draft` | Apply fix actions + autosave |
| `medium_open_draft` | Headed inspection |

## Security checks

Before considering the draft ready:

- No accidental paste of API keys, tokens, or `.env` values (compare suspicious blocks to source)
- No `eval(` / inline secrets in code blocks that weren't in source
- Links point to expected domains (no injected redirect URLs)
- Canonical/source attribution matches DEV.to URL if cross-posting

## Related skills

- **publish-devto-to-medium** — full end-to-end pipeline (import + review + publish)
- **publish-medium** — login, import CLI
- **publish-crosspost** — DEV.to → Medium pipeline
- **user-devto** — fetch source markdown

Full reference: [docs/devto-to-medium.md](../../docs/devto-to-medium.md)

## Do not

- Publish automatically after review
- Skip comparison with source markdown
- Ignore `adjacent_code_blocks` on technical posts (common import bug)
