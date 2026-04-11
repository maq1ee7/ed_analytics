#!/usr/bin/env bash
# E2E MCP: npm test / npm run e2e:mcp
# Подхватывает .env как scripts/deploy.sh (mcp_dashboard/.env или корень репо).

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

if [ -f "$ROOT/.env" ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$ROOT/.env" | grep -v '^$' | xargs)
fi
REPO_ROOT="$(cd "$ROOT/../.." 2>/dev/null && pwd || true)"
if [ -n "$REPO_ROOT" ] && [ -f "$REPO_ROOT/.env" ]; then
  # shellcheck disable=SC2046
  export $(grep -v '^#' "$REPO_ROOT/.env" | grep -v '^$' | xargs)
fi

exec node scripts/test-mcp-call.mjs
