#!/bin/bash
set -euo pipefail
PLIST="$HOME/Library/LaunchAgents/com.brunojorri.overae.bridge.plist"
launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
rm -f "$PLIST"
rm -rf "$HOME/Library/Application Support/OverAE"
rm -rf "$HOME/Library/Application Support/Adobe/CEP/extensions/overae"
echo "OverAE removido. Remova tambem o plugin de desenvolvimento na tela de plugins do Figma."
