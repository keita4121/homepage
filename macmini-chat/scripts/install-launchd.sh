#!/bin/zsh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LAUNCHD_DIR="$HOME/Library/LaunchAgents"

CHAT_LABEL="com.ryogi.macmini-chat"
CLOUDFLARE_LABEL="com.ryogi.cloudflared-chat"

CHAT_TEMPLATE="$ROOT_DIR/launchd/${CHAT_LABEL}.plist.template"
CLOUDFLARE_TEMPLATE="$ROOT_DIR/launchd/${CLOUDFLARE_LABEL}.plist.template"

CHAT_PLIST="$LAUNCHD_DIR/${CHAT_LABEL}.plist"
CLOUDFLARE_PLIST="$LAUNCHD_DIR/${CLOUDFLARE_LABEL}.plist"

ENV_FILE="$ROOT_DIR/config/chat.env"

if [[ ! -f "$ENV_FILE" ]]; then
  cat <<EOF
Missing config file:
  $ENV_FILE

Create it first:
  cp "$ROOT_DIR/config/chat.env.example" "$ENV_FILE"
  # then edit values
EOF
  exit 1
fi

mkdir -p "$LAUNCHD_DIR"
chmod +x "$ROOT_DIR/scripts/run-chat.sh" "$ROOT_DIR/scripts/run-cloudflared.sh"

render_plist() {
  local input="$1"
  local output="$2"
  sed \
    -e "s|__HOME__|$HOME|g" \
    -e "s|__REPO__|$ROOT_DIR|g" \
    "$input" > "$output"
  plutil -lint "$output" >/dev/null
}

render_plist "$CHAT_TEMPLATE" "$CHAT_PLIST"
render_plist "$CLOUDFLARE_TEMPLATE" "$CLOUDFLARE_PLIST"

launchctl bootout "gui/$(id -u)/$CHAT_LABEL" >/dev/null 2>&1 || true
launchctl bootout "gui/$(id -u)/$CLOUDFLARE_LABEL" >/dev/null 2>&1 || true

launchctl bootstrap "gui/$(id -u)" "$CHAT_PLIST"
launchctl bootstrap "gui/$(id -u)" "$CLOUDFLARE_PLIST"

launchctl enable "gui/$(id -u)/$CHAT_LABEL"
launchctl enable "gui/$(id -u)/$CLOUDFLARE_LABEL"
launchctl kickstart -k "gui/$(id -u)/$CHAT_LABEL"
launchctl kickstart -k "gui/$(id -u)/$CLOUDFLARE_LABEL"

cat <<EOF
Installed launch agents:
  $CHAT_PLIST
  $CLOUDFLARE_PLIST

Status:
  launchctl print "gui/$(id -u)/$CHAT_LABEL" | head
  launchctl print "gui/$(id -u)/$CLOUDFLARE_LABEL" | head

Logs:
  tail -f "$HOME/Library/Logs/macmini-chat.log"
  tail -f "$HOME/Library/Logs/cloudflared-chat.log"
EOF
