#!/bin/zsh
# His iPhone take (HEVC 10-bit HLG, 60 fps, vertical) → SDR 30 fps H.264 for editing (Apple's own tone-map, avconvert),
# plus the take's sound. Run from the project: tools/tonemap.sh /path/IMG_XXXX.MOV   (writes ../sdr/take.mov, audio/take.wav)
set -e; SRC="$1"; P="$(cd "$(dirname "$0")/.." && pwd)"; SDR="$P/../sdr"; mkdir -p "$SDR" "$P/audio"
"$P/tools/heavy.sh" "$(basename "$(dirname "$P")") tonemap" zsh -c "
avconvert -s '$SRC' -p Preset1920x1080 -o '$SDR/tm.mov' --replace &&
ffmpeg -y -v error -i '$SDR/tm.mov' -vf fps=30 -an -c:v libx264 -crf 15 -g 15 -pix_fmt yuv420p '$SDR/take.mov' && rm -f '$SDR/tm.mov' &&
ffmpeg -y -v error -i '$SRC' -vn -ac 1 -ar 48000 -c:a pcm_f32le '$P/audio/take.wav'"
