#!/bin/bash
# Start a talk-and-point reel (the reel 31 style): his talking take full frame ↔ animation places on white paper, UI where
# he points.   .agents/skills/talk-and-point/scripts/new_reel.sh downloads/reelN/full
# Builds on the html-canvas-animation starter (kit, fonts, cut / pauses / capdark / pstills / render tools), then lays this
# skill's template over it ONCE (stage, finger pins, camera, overlays, build.py for a vertical take, mixer, cues, the heavy
# lock, hand tracking, person matte). Re-running only adds missing files.
set -euo pipefail
[ $# -ge 1 ] || { echo "usage: new_reel.sh PROJECT_DIR"; exit 1; }
SKILL="$(cd "$(dirname "$0")/.." && pwd)"; P="$1"; export PATH="$HOME/.local/bin:/opt/homebrew/bin:$PATH"
"$SKILL/../html-canvas-animation/scripts/new_film.sh" "$P" >/dev/null
T="$SKILL/template"; FIRST=0; [ -e "$P/film/.talk-and-point" ] || FIRST=1
put() { if [ "$FIRST" = 1 ] || [ ! -e "$2" ]; then mkdir -p "$(dirname "$2")"; cp "$1" "$2"; fi; }
(cd "$T" && find . -type f) | while read -r f; do put "$T/$f" "$P/$f"; done
chmod +x "$P"/tools/*.sh
touch "$P/film/.talk-and-point"
if [ ! -x "$P/tools/hands" ] && command -v swiftc >/dev/null; then swiftc -O "$P/tools/hands.swift" -o "$P/tools/hands" 2>/dev/null || echo "note: could not compile tools/hands (Xcode command line tools?)"; fi
[ -x "$HOME/.local/share/text-behind/personmask" ] || echo "note: the person matte needs text-behind's personmask: run ./setup.sh"
PY="$HOME/.local/share/onetake/.venv/bin/python"
echo "ready: $P   (talk-and-point on html-canvas-animation)"
echo "  1. tone-map his take:   cd $P && tools/tonemap.sh /path/IMG_XXXX.MOV"
echo "  2. find every try:      tools/heavy.sh 'reelN whisper' $PY cut/transcribe_take.py \"rare words\""
echo "  3. demo stills:         $PY tools/pstills.py look/demo.jpg 0.5,1.8,3.5,5,7,9.5 --cols 6"
