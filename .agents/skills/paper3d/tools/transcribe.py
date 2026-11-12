# Word-level transcript of one or more wav files with faster-whisper (one model, one process).
# run: ~/.local/share/onetake/.venv/bin/python tools/transcribe.py OUT_DIR a.wav b.wav ...
import json, os, sys
from faster_whisper import WhisperModel
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
m = WhisperModel("deepdml/faster-whisper-large-v3-turbo-ct2", device="cpu", compute_type="int8", cpu_threads=6)
for wav in sys.argv[2:]:
    segs, _ = m.transcribe(wav, language="en", word_timestamps=True, vad_filter=True,
                           vad_parameters=dict(min_silence_duration_ms=300), condition_on_previous_text=False)
    S = []
    for s in segs:
        S.append(dict(start=round(s.start, 3), end=round(s.end, 3), text=s.text.strip(),
                      words=[dict(word=w.word.strip(), start=round(w.start, 3), end=round(w.end, 3)) for w in (s.words or [])]))
    name = os.path.splitext(os.path.basename(wav))[0]
    json.dump(dict(segments=S), open(f"{out}/{name}.json", "w"), indent=0)
    print("==", name, len(S), "segments", flush=True)
    for s in S: print(f"{s['start']:7.2f} {s['end']:7.2f}  {s['text']}", flush=True)
