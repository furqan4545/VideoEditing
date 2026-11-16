#!/bin/zsh
# Run one heavy job (tone-map, Whisper, hand tracking, person matte, render) under the shared lock, so parallel reel
# sessions on this Mac never run two at once. Polls every second (sessions that wait 20-30 s between tries kept losing
# the lock to sessions that grabbed it right after a release). Do several heavy steps in ONE call when you can.
#   tools/heavy.sh "reelN whisper" python cut/transcribe_take.py ...
#   tools/heavy.sh "reelN cut+hands" zsh -c 'python cut/build.py && ...'
L="${HEAVY_LOCK:-$(cd "$(dirname "$0")/../../.." && pwd)/.heavy_lock}"   # downloads/.heavy_lock (project = downloads/reelN/full)
label="$1"; shift
until mkdir "$L" 2>/dev/null; do sleep 1; done; echo "$label $(date)" > "$L/owner"
trap 'rm -rf "$L"' EXIT INT TERM
echo "lock: $label $(date)"
"$@"; rc=$?
echo "done: $label (exit $rc) $(date)"; exit $rc
