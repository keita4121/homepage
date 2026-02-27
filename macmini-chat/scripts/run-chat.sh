#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/config/chat.env}"

PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"

if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi

NODE_CMD="${NODE_BIN:-$(command -v node || true)}"
if [[ -z "$NODE_CMD" ]]; then
  echo "node binary not found. Set NODE_BIN in $ENV_FILE" >&2
  exit 1
fi

export HOST="${HOST:-127.0.0.1}"
export PORT="${PORT:-8787}"
export ALLOWED_ORIGIN="${ALLOWED_ORIGIN:-*}"
export ADMIN_TOKEN="${ADMIN_TOKEN:-}"
export SESSION_TTL_HOURS="${SESSION_TTL_HOURS:-24}"

exec "$NODE_CMD" "$ROOT_DIR/server.js"
