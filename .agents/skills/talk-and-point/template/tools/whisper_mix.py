# Whisper (turbo) on the FINAL mix, line by line (each line with 0.4 s of context before it), against the caption text.
# Catches clipped words, effects masking words, music too loud.   python tools/whisper_mix.py [sound/mix.wav]
import os, sys, json, re, difflib, numpy as np, soundfile as sf
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
os.environ["HF_HUB_OFFLINE"] = "1"
from faster_whisper import WhisperModel
m = WhisperModel("deepdml/faster-whisper-large-v3-turbo-ct2", device="cpu", compute_type="int8")
y, sr = sf.read(sys.argv[1] if len(sys.argv) > 1 else "sound/mix.wav"); y = (y.mean(1) if y.ndim > 1 else y).astype(np.float32)
T = json.load(open("cut/timing2.json")); norm = lambda s: re.sub(r"[^a-z0-9 ]", "", s.lower().replace("’", "'").replace("'", "")).split()
bad = 0
for s in T["segs"]:
    a, b = max(0, s["t0"] - 0.4), s["t1"] + 0.15; c = y[int(a * sr):int(b * sr)]
    c16 = np.interp(np.arange(0, len(c), sr / 16000), np.arange(len(c)), c).astype(np.float32)
    segs, _ = m.transcribe(c16, language="en", condition_on_previous_text=False, beam_size=5, without_timestamps=True)
    heard = " ".join(g.text.strip() for g in segs); want = s["text"]
    r = difflib.SequenceMatcher(None, norm(want), norm(heard)).ratio(); flag = "" if r > 0.8 else "   <<< CHECK"
    if flag: bad += 1
    print(f"{s['id']:4s} {r:.2f} | {heard}{flag}", flush=True)
print(bad, "lines to check")
