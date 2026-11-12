#!/bin/bash
# Build three.js (r180) + the addons the kit uses into one classic script, once per Mac: ~/.cache/paper3d/three.bundle.js
# (Chrome blocks ES modules under file://, which is how the renderer opens a film.)
set -euo pipefail
SKILL="$(cd "$(dirname "$0")/.." && pwd)"; C="$HOME/.cache/paper3d"; export PATH="$HOME/.local/bin:/opt/homebrew/bin:$PATH"
[ -s "$C/three.bundle.js" ] && [ "${1:-}" != "--force" ] && { echo "three bundle ready: $C/three.bundle.js"; exit 0; }
mkdir -p "$C" && cd "$C" && cp "$SKILL/kit/three-entry.js" . && echo '{ "name": "paper3d-vendor", "private": true, "version": "1.0.0" }' > package.json
npm install --silent three@0.180.0 esbuild@0.25.10
./node_modules/.bin/esbuild three-entry.js --bundle --format=iife --minify --outfile=three.bundle.js >/dev/null 2>&1
echo "built $C/three.bundle.js ($(wc -c < three.bundle.js) bytes)"
