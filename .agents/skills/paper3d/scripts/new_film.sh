#!/bin/bash
# Start a 3D film project:  .agents/skills/paper3d/scripts/new_film.sh downloads/reelN/full
# Makes film/ (kit, models, a demo world + shot, fonts, the three.js bundle), tools/ (stills, preview, render, events), look/, out/.
# Existing files are never overwritten (re-run it to add what is missing).
set -euo pipefail
[ $# -ge 1 ] || { echo "usage: new_film.sh PROJECT_DIR"; exit 1; }
SKILL="$(cd "$(dirname "$0")/.." && pwd)"; P="$1"; export PATH="$HOME/.local/bin:/opt/homebrew/bin:$PATH"
mkdir -p "$P"/{film/assets,film/shots,film/fonts,film/img,film/footage,film/vendor,tools,look,out,sound,cut}
put() { [ -e "$2" ] || cp "$1" "$2"; }
put "$SKILL/kit/kit.js" "$P/film/kit.js"; put "$SKILL/kit/comp.html" "$P/film/comp.html"
put "$SKILL/kit/world.template.js" "$P/film/world.js"; put "$SKILL/kit/timing.template.js" "$P/film/timing.js"; put "$SKILL/kit/thumb.template.js" "$P/film/thumb.js"
put "$SKILL/kit/assets.index.js" "$P/film/assets/index.js"; put "$SKILL/kit/shots.index.js" "$P/film/shots/index.js"; put "$SKILL/kit/shot.template.js" "$P/film/shots/10_demo.js"
for f in "$SKILL"/models/*.js; do put "$f" "$P/film/assets/$(basename "$f")"; done
for f in "$SKILL"/tools/*; do put "$f" "$P/tools/$(basename "$f")"; done; chmod +x "$P"/tools/*.sh
# onetake's move library and its renderer (patched so local images can be WebGL textures)
OT="$HOME/.claude/skills/onetake"; [ -d "$OT" ] || OT="$SKILL/../onetake"
put "$OT/lib/motion.js" "$P/film/motion.js"
[ -e "$P/tools/render3d.py" ] || sed 's|GPU_ARGS = \["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"\]|GPU_ARGS = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--allow-file-access-from-files", "--disable-web-security"]|' "$OT/scripts/render.py" > "$P/tools/render3d.py"
grep -q "allow-file-access-from-files" "$P/tools/render3d.py" || { echo "could not patch onetake's render.py (its GPU_ARGS line changed): add --allow-file-access-from-files --disable-web-security by hand"; exit 1; }
# three.js bundle (built once per Mac) and Apple's fonts (copied from this Mac, never committed)
"$SKILL/scripts/build_three.sh" >/dev/null; put "$HOME/.cache/paper3d/three.bundle.js" "$P/film/vendor/three.bundle.js"
put /System/Library/Fonts/SFNS.ttf "$P/film/fonts/SFNS.ttf"; put /System/Library/Fonts/NewYorkItalic.ttf "$P/film/fonts/NewYorkItalic.ttf"
echo "ready: $P"
echo "  look at the demo:   cd $P && ~/.local/share/onetake/.venv/bin/python tools/vstills.py film/comp.html look/demo.jpg 0.5,2.4,4.6,6,8.4 5 360"
echo "  preview one model:  cd $P && tools/preview.sh person '' legs"
