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

CLOUDFLARED_CMD="${CLOUDFLARED_BIN:-$(command -v cloudflared || true)}"
if [[ -z "$CLOUDFLARED_CMD" ]]; then
  echo "cloudflared binary not found. Set CLOUDFLARED_BIN in $ENV_FILE" >&2
  exit 1
fi

CONFIG_FILE="${CLOUDFLARED_CONFIG:-$HOME/.cloudflared/config.yml}"
TUNNEL_NAME="${CLOUDFLARED_TUNNEL_NAME:-ryogi-chat}"

if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "cloudflared config not found: $CONFIG_FILE" >&2
  exit 1
fi

exec "$CLOUDFLARED_CMD" tunnel --config "$CONFIG_FILE" run "$TUNNEL_NAME"
