#!/bin/zsh
# Render the film and join it with the sound mix.   tools/assemble.sh v1 [workers]
#   out/reel15_<tag>_silent.mp4   the picture (1080x1920, 30 fps, real motion blur)
#   out/reel15_<tag>.mp4          picture + sound/mix.wav (AAC 256k)
cd "$(dirname "$0")/.." && tag="${1:-v1}"; w="${2:-6}"; mkdir -p out
~/.local/share/onetake/.venv/bin/python tools/render3d.py film/comp.html --out "out/reel15_${tag}_silent.mp4" --width 1080 --height 1920 --gpu --workers "$w" --crf 15 > "out/render_${tag}.log" 2>&1 || { tail -5 "out/render_${tag}.log"; exit 1; }
tail -2 "out/render_${tag}.log"
ffmpeg -v error -y -i "out/reel15_${tag}_silent.mp4" -i sound/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart "out/reel15_${tag}.mp4" && ffprobe -v error -show_entries format=duration,size -of csv=p=0 "out/reel15_${tag}.mp4"
