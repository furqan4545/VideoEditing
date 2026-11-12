#!/bin/bash
# While render.py runs: encode the frames already rendered (contiguous from frame 0) with the mix, so Ali can watch the
# first part right away.   tools/preview_partial.sh [out.mp4]
set -euo pipefail; cd "$(dirname "$0")/.."
N=$(ls film/_frames | sort | awk 'NR>1 && $0+0 != prev+1 {exit} {prev=$0+0} END{print prev+1}')
[ "$N" -gt 30 ] || { echo "not enough frames yet ($N)"; exit 1; }
OUT=${1:-film/preview_first_$((N / 30))s.mp4}; A=sound/mix.wav; [ -f "$A" ] || A=cut/voice_raw.wav
ffmpeg -v error -y -framerate 30 -start_number 0 -i film/_frames/%05d.png -i "$A" -frames:v $((N - 5)) -map 0:v -map 1:a -c:v libx264 -preset fast -pix_fmt yuv420p -crf 18 -c:a aac -b:a 192k -shortest "$OUT"
echo "wrote $OUT ($(( (N - 5) / 30 )) s)"
