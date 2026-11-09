#!/bin/zsh
# Run from a reel project (downloads/NAME/full) after cut/edl.py.
# Transcribes every cut piece (cut/check/<id>.wav) with VoiceStudio's Whisper, one at a time, saves the word times to
# cut/words/<id>.json (build_reel.py times the captions from them) and prints what was heard next to what the EDL
# says should be there, so a clipped first/last word or a stray extra word shows up before any rendering.
#   check_pieces.sh [ID ...]     (no IDs: every piece)
set -euo pipefail
mkdir -p cut/words
ids=("$@"); [ ${#ids} -gt 0 ] || ids=(cut/check/*.wav(N:t:r))
for b in $ids; do
  curl -s --fail-with-body http://localhost:3900/v1/audio/transcriptions -F file=@cut/check/$b.wav \
    -F response_format=verbose_json -F "timestamp_granularities[]=word" -F language=en -o cut/words/$b.json || { echo "FAIL $b"; continue; }
  python3 - "$b" <<'EOF'
import json, sys
b = sys.argv[1]; heard = json.load(open(f"cut/words/{b}.json"))["text"].strip()
want = next((s["text"] for s in json.load(open("cut/timeline.json"))["segs"] if s["id"] == b), "?")
norm = lambda t: "".join(c for c in t.lower() if c.isalnum() or c == " ").split()
mark = "ok " if norm(heard) == norm(want) else ">> "
print(f"{mark}{b:6s} heard: {heard}\n{'':10s}want:  {want}" if mark != "ok " else f"{mark}{b:6s} {heard}")
EOF
done
