#!/bin/zsh
# A screen recording -> frames the film plays on a card (the real demo, the before and the after).
#   tools/clip.sh REC.mov demo [width=1280] [start_s] [dur_s]     ->  film/footage/demo/0000.jpg ... (30 fps) + the line for world.js
# Record the real thing on this Mac first (the tool being installed or used, then what it made). Keep the clip short:
# cut to the seconds that show the result, speed a long wait up before this step (ffmpeg setpts), never a click-by-click tour.
cd "$(dirname "$0")/.." && src="$1"; id="${2:-demo}"; w="${3:-1280}"; d="film/footage/$id"
[ -f "$src" ] || { echo "usage: tools/clip.sh REC.mov [id] [width] [start_s] [dur_s]"; exit 1; }
mkdir -p "$d" && find "$d" -name '*.jpg' -delete
ffmpeg -v error -y ${4:+-ss} ${4:+$4} -i "$src" ${5:+-t} ${5:+$5} -vf "fps=30,scale=$w:-2" -start_number 0 -q:v 3 "$d/%04d.jpg" || exit 1
n=$(find "$d" -name '*.jpg' | wc -l | tr -d ' '); h=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$d/0000.jpg")
echo "$n frames ($(printf '%.1f' $((n / 30.0))) s) in $d"
echo "  world.js:   w.$id = V.clip('$id', 1.6, { n: $n, w: $w, h: $h }); w.$id.visible = false; S.add(w.$id);"
echo "  00_base.js: w.$id.visible = false;      a beat: w.$id.visible = true; w.$id.position.set(0, 1.9, 0.6); w.$id.play(t - tDemo);"
