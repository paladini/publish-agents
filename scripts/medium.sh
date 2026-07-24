#!/usr/bin/env bash
# Run medium-publisher from any directory.
set -euo pipefail
ROOT="${PUBLISH_AGENTS_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
CLI="$ROOT/packages/medium-publisher/dist/cli.js"

if [[ ! -f "$CLI" ]]; then
  echo "medium-publisher not built. Run: cd $ROOT && npm install && npm run build" >&2
  exit 2
fi

exec node "$CLI" "$@"
