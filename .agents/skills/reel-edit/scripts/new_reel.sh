#!/bin/zsh
# Start a new reel from the user's phone takes.
#   new_reel.sh NAME TAKES_DIR [--no-transcribe]
# Makes downloads/NAME/full (a copy of this skill's template), then for every take in TAKES_DIR:
#   sdr/<take>.mp4   1080x1920, 30 fps, SDR (iPhone HLG is tone-mapped with avconvert first)
#   audio/<take>.wav mono 48 kHz, for cutting and transcribing
#   cut/<take>.json  VoiceStudio's Whisper transcript with word times (needs VoiceStudio at localhost:3900)
# and sets up the HyperFrames project in hf/ with the footage linked into hf/assets/footage/.
# Takes are transcribed one at a time (never run several big models at once).
set -euo pipefail
[ $# -ge 2 ] || { echo "usage: new_reel.sh NAME TAKES_DIR [--no-transcribe]"; exit 1; }
NAME=$1; TAKES=${2:A}; TRANSCRIBE=1; [ "${3:-}" = "--no-transcribe" ] && TRANSCRIBE=0
SKILL=${0:A:h:h}; REPO=${SKILL:h:h:h}
P="$REPO/downloads/$NAME/full"
mkdir -p "$P"/{sdr,audio,cut,sound,demo,hf}
cp -Rn "$SKILL/template/." "$P/" 2>/dev/null || true   # never overwrites files already there
cd "$P"

takes=("$TAKES"/*.(MOV|mov|MP4|mp4|m4v)(N))
[ ${#takes} -gt 0 ] || { echo "no .mov/.mp4 takes in $TAKES"; exit 1; }
VF="scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30"
for f in $takes; do
  b=${${f:t}:r}
  if [ ! -f sdr/$b.mp4 ]; then
    src=$f
    if ffprobe -v error -select_streams v:0 -show_entries stream=color_transfer -of csv=p=0 "$f" | grep -q arib-std-b67; then
      avconvert -s "$f" -p Preset1920x1080 -o sdr/$b.mov --replace >/dev/null 2>&1   # HLG -> SDR (looks right on phones)
      src=sdr/$b.mov
    fi
    ffmpeg -v error -y -i "$src" -vf "$VF" -an -c:v libx264 -crf 15 -g 15 -pix_fmt yuv420p sdr/$b.mp4
    [ "$src" = sdr/$b.mov ] && rm -f sdr/$b.mov
  fi
  [ -f audio/$b.wav ] || ffmpeg -v error -y -i "$f" -vn -ac 1 -ar 48000 audio/$b.wav
  echo "$b: $(ffprobe -v error -show_entries format=duration -of csv=p=0 sdr/$b.mp4 | cut -c1-6) s"
done

if [ $TRANSCRIBE = 1 ]; then
  curl -sf localhost:3900/health >/dev/null || { open -gj -a VoiceStudio; for i in {1..60}; do curl -sf localhost:3900/health >/dev/null && break; sleep 2; done; }
  for f in audio/*.wav; do
    b=${${f:t}:r}; [ -s cut/$b.json ] && continue
    curl -s --fail-with-body http://localhost:3900/v1/audio/transcriptions -F file=@$f -F response_format=verbose_json \
      -F "timestamp_granularities[]=word" -F language=en -o cut/$b.json || echo "transcription failed: $b"
  done
  python3 - <<'EOF'
import json, glob
for f in sorted(glob.glob("cut/*.json")):
    if f.endswith(("timeline.json", "events.json", "hands.json")): continue
    d = json.load(open(f)); print("=====", f[4:-5], "dur", round(d.get("duration", 0), 1))
    for s in d.get("segments", []): print(f"  [{s['start']:7.2f}-{s['end']:7.2f}] {s['text'].strip()}")
EOF
fi

[ -f hf/hyperframes.json ] || npx hyperframes init hf --skip-skills --skill=hyperframes >/dev/null 2>&1
mkdir -p hf/assets/footage hf/assets/shots
for f in sdr/*.mp4; do ln -f "$f" hf/assets/footage/; done
echo "project ready: $P"
