#!/bin/bash
# Start a funky edit (the reel 33 style): a dark voxel room, big moving words, pixel-block wipes, 3D drawings, meme stickers,
# the Dr.pimp voice.      .agents/skills/funky-edit/scripts/new_reel.sh downloads/reelN/full
# Builds on the paper3d starter (kit, three.js bundle, fonts, stills / fast GPU render / events tools), then lays this
# skill's template over it ONCE (the look engine vox.js, the 3D drawing kit, the dark comp page, the studio + board world,
# the two voxel characters, a demo shot, voice / cut / mix / meme tools). Re-running only adds missing files.
set -euo pipefail
[ $# -ge 1 ] || { echo "usage: new_reel.sh PROJECT_DIR"; exit 1; }
SKILL="$(cd "$(dirname "$0")/.." && pwd)"; P="$1"; export PATH="$HOME/.local/bin:/opt/homebrew/bin:$PATH"
"$SKILL/../paper3d/scripts/new_film.sh" "$P" >/dev/null
T="$SKILL/template"; FIRST=0; [ -e "$P/film/.funky-edit" ] || FIRST=1
put() { if [ "$FIRST" = 1 ] || [ ! -e "$2" ]; then mkdir -p "$(dirname "$2")"; cp "$1" "$2"; fi; }
(cd "$T" && find . -type f ! -name .DS_Store) | while read -r f; do put "$T/$f" "$P/$f"; done
mkdir -p "$P"/film/img/{web,memes,demo} "$P"/vo/raw "$P"/cut "$P"/sound "$P"/out "$P"/look
# the 3D drawing kit as one classic script (the page runs from file://, so no ES modules)
[ -e "$P/film/anatomy.bundle.js" ] || python3 "$SKILL/scripts/build_anatomy.py" "$P/film/anatomy.bundle.js" >/dev/null
# fonts: Geist ships with onetake (OFL); Impact is copied from this Mac and never committed
OT="$SKILL/../onetake"; [ -d "$OT" ] || OT="$HOME/.claude/skills/onetake"
[ -e "$P/film/fonts/Geist.ttf" ] || cp "$OT/looks/fonts/Geist.ttf" "$P/film/fonts/Geist.ttf"
[ -e "$P/film/fonts/Impact.ttf" ] || cp /System/Library/Fonts/Supplemental/Impact.ttf "$P/film/fonts/Impact.ttf" 2>/dev/null || echo "note: Impact.ttf not found on this Mac: the big words fall back to the system's Impact"
chmod +x "$P"/tools/*.sh 2>/dev/null || true
touch "$P/film/.funky-edit"
PY="~/.local/share/onetake/.venv/bin/python"
echo "ready: $P   (funky-edit on paper3d)"
echo "  look at the demo:   cd $P && $PY tools/vstills.py film/comp.html look/demo.jpg 0.6,2.2,4.2,6.6,8.6,10.5,12.6,15.6 8 300"
echo "  script -> voice:    edit vo/script.json, then python3 vo/generate.py   (VoiceStudio must be open; one line at a time)"
echo "  voice -> timing:    $PY cut/build_voice.py      memes: python3 tools/memes.py cool_dog='cool dog' huh_cat='confused cat'"
