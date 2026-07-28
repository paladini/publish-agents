#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${HOME}/.cursor/skills"
mkdir -p "$DEST"

for skill in publish-medium publish-crosspost review-medium-import publish-devto-to-medium; do
  rm -rf "${DEST}/${skill}"
  cp -R "${ROOT}/skills/${skill}" "${DEST}/${skill}"
  echo "Installed ${skill} -> ${DEST}/${skill}"
done

echo "Done. Restart Cursor or reload skills."
