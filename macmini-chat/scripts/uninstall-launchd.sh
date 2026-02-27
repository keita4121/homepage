#!/bin/zsh
set -euo pipefail

CHAT_LABEL="com.ryogi.macmini-chat"
CLOUDFLARE_LABEL="com.ryogi.cloudflared-chat"

CHAT_PLIST="$HOME/Library/LaunchAgents/${CHAT_LABEL}.plist"
CLOUDFLARE_PLIST="$HOME/Library/LaunchAgents/${CLOUDFLARE_LABEL}.plist"

launchctl bootout "gui/$(id -u)/$CHAT_LABEL" >/dev/null 2>&1 || true
launchctl bootout "gui/$(id -u)/$CLOUDFLARE_LABEL" >/dev/null 2>&1 || true

rm -f "$CHAT_PLIST" "$CLOUDFLARE_PLIST"

echo "Removed launch agents:"
echo "  $CHAT_PLIST"
echo "  $CLOUDFLARE_PLIST"
