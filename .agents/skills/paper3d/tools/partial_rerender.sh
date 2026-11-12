#!/bin/zsh
# Re-render only some time ranges of a finished film (keeps every other frame from the last render).
#   tools/partial_rerender.sh OLD_SILENT.mp4 NEW_TAG "13.0-35.9 40.9-46.6"      -> out/film_<NEW_TAG>_silent.mp4 and out/film_<NEW_TAG>.mp4 (with sound/mix.wav)
cd "$(dirname "$0")/.." && old="$1"; tag="$2"; ranges="$3"; d="out/$tag"; rm -rf "$d" "out/snap_$tag"; mkdir -p "$d/_frames" "out/snap_$tag"
ffmpeg -v error -y -i "$old" -start_number 0 "$d/_frames/%05d.png" || exit 1
n0=$(ls "$d/_frames" | wc -l | tr -d ' ')
python3 - "$d/_frames" "$ranges" <<'PY'
import os, sys, math
d, ranges = sys.argv[1], sys.argv[2].split(); k = 0
for r in ranges:
    a, b = map(float, r.split('-'))
    for f in range(int(math.floor(a * 30)), int(math.ceil(b * 30)) + 1):
        p = f"{d}/{f:05d}.png"
        if os.path.exists(p): os.remove(p); k += 1
print("frames to render again:", k)
PY
(cd film && for f in *.js *.html assets shots; do cp -R "$f" "../out/snap_$tag/"; done); for l in footage vendor img fonts; do [ -e "film/$l" ] && ln -s "$PWD/film/$l" "out/snap_$tag/$l"; done
echo "kept $n0 frames from the old render"
~/.local/share/onetake/.venv/bin/python tools/render3d.py "out/snap_$tag/comp.html" --out "$d/film_${tag}_silent.mp4" --width 1080 --height 1920 --gpu --workers 7 --crf 15 --resume > "out/render_$tag.log" 2>&1 || { tail -4 "out/render_$tag.log"; exit 1; }
tail -2 "out/render_$tag.log" | cut -c1-200
ffmpeg -v error -y -i "$d/film_${tag}_silent.mp4" -i sound/mix.wav -map 0:v -map 1:a -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart "out/film_${tag}.mp4" && ffprobe -v error -show_entries format=duration,size -of csv=p=0 "out/film_${tag}.mp4"
