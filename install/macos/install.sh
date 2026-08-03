#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
NODE_BIN="$(command -v node || true)"
if [ -z "$NODE_BIN" ]; then
  echo "Node.js 18 ou mais recente nao foi encontrado. Instale em https://nodejs.org/."
  exit 1
fi
NODE_MAJOR="$($NODE_BIN --version | sed 's/^v//' | cut -d. -f1)"
if [ "$NODE_MAJOR" -lt 18 ]; then echo "O OverAE requer Node.js 18 ou mais recente."; exit 1; fi

INSTALL_ROOT="$HOME/Library/Application Support/OverAE"
BRIDGE_TARGET="$INSTALL_ROOT/bridge"
FIGMA_TARGET="$INSTALL_ROOT/figma-plugin"
CEP_TARGET="$HOME/Library/Application Support/Adobe/CEP/extensions/overae"
PLIST="$HOME/Library/LaunchAgents/com.brunojorri.overae.bridge.plist"

mkdir -p "$BRIDGE_TARGET" "$FIGMA_TARGET" "$CEP_TARGET" "$HOME/Library/LaunchAgents"
cp "$REPO_ROOT/local-bridge/server.js" "$REPO_ROOT/local-bridge/package.json" "$BRIDGE_TARGET/"
cp "$REPO_ROOT/figma-plugin/manifest.json" "$REPO_ROOT/figma-plugin/code.js" "$REPO_ROOT/figma-plugin/ui.generated.html" "$REPO_ROOT/figma-plugin/avatar.jpg" "$FIGMA_TARGET/"
cp -R "$REPO_ROOT/ae-cep-panel/." "$CEP_TARGET/"

for version in 9 10 11 12; do defaults write "com.adobe.CSXS.$version" PlayerDebugMode 1; done

cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>com.brunojorri.overae.bridge</string>
<key>ProgramArguments</key><array><string>$NODE_BIN</string><string>$BRIDGE_TARGET/server.js</string></array>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
<key>StandardOutPath</key><string>/tmp/overae-bridge.log</string>
<key>StandardErrorPath</key><string>/tmp/overae-bridge-error.log</string>
</dict></plist>
EOF

launchctl bootout "gui/$(id -u)" "$PLIST" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

echo "OverAE instalado com sucesso."
echo "Reinicie o After Effects e abra Window > Extensions > OverAE."
echo "No Figma Desktop, importe este manifesto uma unica vez:"
echo "$FIGMA_TARGET/manifest.json"
