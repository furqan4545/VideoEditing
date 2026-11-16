#!/bin/bash
# Biggest frame-to-frame changes in a render (ffmpeg scene score): a hard cut or a flash shows up above ~0.35.
#   tools/scenescan.sh film/draft_v1.mp4 [top N]
ffmpeg -v error -i "$1" -vf "select='gte(scene,0)',metadata=print:file=-" -f null - 2>/dev/null | awk '/pts_time/{split($0,a,"pts_time:");t=a[2]} /scene_score/{split($0,b,"=");print b[2], t}' | sort -rn | head -${2:-12}
