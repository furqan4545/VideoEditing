# Breathing room: 0.2 s of voice silence after every piece that ends a sentence (. ? !).
# The scenes were designed on the tight clock (film/timing.js = window.VO). This writes the NEW clock:
#   cut/voice_raw.wav          the voice with the pauses (tight one kept as cut/voice_tight.wav)
#   cut/timing2.json, film/timing2.js (window.VO2)   pieces + word times on the new clock, plus "old" piece times
# comp.html maps new time -> old time (identity inside the words, a short slow-down across each pause), so the
# picture keeps moving through every pause and the words stay in sync.
# run: ~/.local/share/onetake/.venv/bin/python cut/pauses.py
import json, os, shutil, re
import numpy as np, soundfile as sf
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
SR, PAUSE, TAIL = 48000, 0.20, 1.0
T = json.load(open("cut/timing.json")); G = json.load(open("cut/gains.json"))["gain_db"]
if not os.path.exists("cut/voice_tight.wav"): shutil.copy("cut/voice_raw.wav", "cut/voice_tight.wav")
segs, R = [], 0.0
for s in T["segs"]:
    d = s["t1"] - s["t0"]; p = PAUSE if re.search(r"[.?!]$", s["text"].strip()) else 0.0
    segs.append({**s, "old_t0": s["t0"], "old_t1": s["t1"], "t0": round(R, 4), "t1": round(R + d, 4), "pause": p,
                 "words": [[w, round(a - s["t0"] + R, 3), round(b - s["t0"] + R, 3)] for w, a, b in s["words"]]})
    R += d + p
dur = round(float(np.ceil((R + TAIL) * 30) / 30), 4)
v = np.zeros(int((dur + 0.5) * SR), np.float32)
for s in segs:
    y, _ = sf.read(f"cut/check/{s['id']}.wav"); y = y.astype(np.float32) * 10 ** (G[s["id"]] / 20)
    i = int(round(s["t0"] * SR)); v[i:i + len(y)] += y
sf.write("cut/voice_raw.wav", v, SR)
T2 = {"dur": dur, "fps": 30, "speed": T["speed"], "old_dur": T["dur"], "segs": segs}
json.dump(T2, open("cut/timing2.json", "w"), indent=1, ensure_ascii=False)
open("film/timing2.js", "w").write("window.VO2 = " + json.dumps(T2, ensure_ascii=False) + ";\n")
print(f"{sum(1 for s in segs if s['pause'])} sentence ends, +{sum(s['pause'] for s in segs):.1f} s -> {dur} s (was {T['dur']})")
