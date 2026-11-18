# Transcribe every stretch of speech (from the loudness envelope list in cut/take_transcript.txt) on its own, with the
# bigger Whisper, so each in/out edge has its exact words.   python cut/runs_words.py 136 625
import os, sys, re, json, numpy as np, soundfile as sf
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
os.environ["HF_HUB_OFFLINE"] = "1"
from faster_whisper import WhisperModel
lo, hi = float(sys.argv[1]), float(sys.argv[2])
runs = [tuple(map(float, m.groups())) for m in re.finditer(r"^\s*([\d.]+)-\s*([\d.]+) \(", open("cut/take_transcript.txt").read().split("── speech")[1], re.M)]
runs = [r for r in runs if r[0] >= lo and r[1] <= hi]
y, sr = sf.read("audio/take.wav"); y = y.astype(np.float32)
m = WhisperModel("deepdml/faster-whisper-large-v3-turbo-ct2", device="cpu", compute_type="int8")
out = []
for a, b in runs:
    c = y[int((a - 0.08) * sr):int((b + 0.08) * sr)]; c16 = np.interp(np.arange(0, len(c), sr / 16000), np.arange(len(c)), c).astype(np.float32)
    segs, _ = m.transcribe(c16, language="en", condition_on_previous_text=False, beam_size=5, without_timestamps=True)
    txt = " ".join(s.text.strip() for s in segs); out.append([a, b, txt]); print(f"{a:8.3f}-{b:8.3f} ({b - a:4.2f}s) {txt}", flush=True)
json.dump(out, open("cut/runs_words.json", "w"), indent=0)
