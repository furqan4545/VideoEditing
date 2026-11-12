#!/bin/zsh
# Preview one model alone on the paper, six views (t = 0,2,4,6,8,10) -> look/asset_<name>.jpg
#   tools/preview.sh legs            tools/preview.sh gate '{"style":"dark"}'      tools/preview.sh bag '' tag,cheese   (third arg: other asset files it needs)
cd "$(dirname "$0")/.." && n="$1"; q="asset=$n"; [ -n "$2" ] && q="$q&opts=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$2")"; [ -n "$3" ] && q="$q&needs=$3"
~/.local/share/onetake/.venv/bin/python tools/vstills.py film/comp.html "look/asset_$n.jpg" ${4:-0.5,2.5,4.5,6.5,8.5,10.5} 6 ${5:-420} "$q"
