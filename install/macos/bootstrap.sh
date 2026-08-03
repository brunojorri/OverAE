#!/bin/bash
set -euo pipefail

TEMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/overae-install.XXXXXX")"
trap 'rm -rf "$TEMP_ROOT"' EXIT

echo "Baixando OverAE do GitHub..."
curl -fsSL "https://github.com/brunojorri/OverAE/archive/refs/heads/main.tar.gz" -o "$TEMP_ROOT/OverAE.tar.gz"
tar -xzf "$TEMP_ROOT/OverAE.tar.gz" -C "$TEMP_ROOT"
bash "$TEMP_ROOT/OverAE-main/install/macos/install.sh"
