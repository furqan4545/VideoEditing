#!/bin/bash
# Start a white-paper cinematic movie (the reel 16 / reel 17 look):
#   .agents/skills/html-canvas-animation/scripts/new_film.sh downloads/reelN/full
# Copies the template (kit, comp, story, a demo scene, cut / sound / tools scripts), onetake's move library, and builds
# film/fonts.js from this Mac's Apple fonts (never committed). Never overwrites a file: re-run it to add what is missing.
set -euo pipefail
[ $# -ge 1 ] || { echo "usage: new_film.sh PROJECT_DIR"; exit 1; }
SKILL="$(cd "$(dirname "$0")/.." && pwd)"; P="$1"; export PATH="$HOME/.local/bin:/opt/homebrew/bin:$PATH"
PY="$HOME/.local/share/onetake/.venv/bin/python"; [ -x "$PY" ] || { echo "needs the onetake skill's Python ($PY): run ./setup.sh"; exit 1; }
mkdir -p "$P"/{audio,cut,film/scenes,film/footage,sound,tools,look,out}
put() { [ -e "$2" ] || cp "$1" "$2"; }
for f in kit.js comp.html story.js thumb.html timing.js timing2.js; do put "$SKILL/template/film/$f" "$P/film/$f"; done
put "$SKILL/template/film/scenes/demo.js" "$P/film/scenes/demo.js"
for d in cut sound tools; do for f in "$SKILL/template/$d"/*; do put "$f" "$P/$d/$(basename "$f")"; done; done; chmod +x "$P"/tools/*.sh
OT="$HOME/.claude/skills/onetake"; [ -d "$OT" ] || OT="$SKILL/../onetake"
put "$OT/lib/motion.js" "$P/film/motion.js"
[ -e "$P/film/fonts.js" ] || "$PY" "$SKILL/scripts/make_fonts.py" "$P/film/fonts.js" 2>/dev/null
echo "ready: $P"
echo "  look at the demo:  cd $P && $PY tools/pstills.py look/demo.jpg 0.5,2.5,3.6,4.6,6.2,8.5 --cols 6"
echo "  render (later):    cd $P && $PY $OT/scripts/render.py film/comp.html --out film/draft_v1.mp4 --width 1080 --height 1920 --workers 6"
