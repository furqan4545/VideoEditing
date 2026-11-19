#!/usr/bin/env python3
"""Join the voice lines (vo/raw/NN_key.wav + their Whisper JSON) into cut/voice.wav and write film/timing.js.
The voice stays RAW: silence trimmed at both ends, one gain per line, nothing else (no EQ, no compressor).

    ~/.local/share/onetake/.venv/bin/python cut/build_voice.py

Per line in vo/script.json: "gap" = silence before it (default 0.28 s; give the line after a punch 0.4-0.55),
"pauses" = { "heard word": seconds } a breath added after that word (cut at the quietest point before the next word),
"show" = the words the screen shows when the voice text spells things out. Shown words are lined up with the heard
words; where they differ ("2,800" for "twenty-eight hundred") the shown words share the heard run's time.
film/timing.js: window.TIMING = { dur, lines: [{ key, t0, t1, gain_db, text }], words: [[word, t0, t1, key]] }.
"""
import difflib, json, re, subprocess, wave
from pathlib import Path
import numpy as np
ROOT = Path(__file__).resolve().parents[1]; RAW = ROOT / "vo/raw"; SR = 48000
SCRIPT = json.loads((ROOT / "vo/script.json").read_text())["lines"]
LEAD, HEAD, TAIL, TARGET, GAP0, END = 0.25, 0.05, 0.10, -21.0, 0.28, 1.6

def read(p):
    out = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(out, np.float32).copy()
def edges(x, thr_db=-42.0, win=0.02):
    n = int(win * SR); e = np.sqrt(np.convolve(x * x, np.ones(n) / n, "same")); on = np.where(e > 10 ** (thr_db / 20))[0]
    return on[0] / SR, on[-1] / SR
def rms_db(x):
    v = x[np.abs(x) > 10 ** (-45 / 20)]; return 20 * np.log10(np.sqrt(np.mean(v * v)) + 1e-9)
norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())

t = LEAD; parts = [np.zeros(int(LEAD * SR), np.float32)]; lines = []; words = []
for i, L in enumerate(SCRIPT):
    x = read(RAW / f"{i+1:02d}_{L['key']}.wav"); a, b = edges(x); s0, s1 = max(0, a - HEAD), min(len(x) / SR, b + TAIL)
    W = json.loads((RAW / f"{i+1:02d}_{L['key']}.json").read_text())["words"]; cuts = []; env = np.sqrt(np.convolve(x * x, np.ones(480) / 480, "same"))
    for j, w in enumerate(W[:-1]):                                   # added breaths
        pz = L.get("pauses", {}).get(w["word"].strip())
        if pz: lo, hi = int(max(w["end"] - 0.12, w["start"] + 0.1) * SR), int((W[j + 1]["start"] + 0.06) * SR); cuts.append(((lo + int(np.argmin(env[lo:hi]))) / SR, pz))
    pieces = []; pos = s0
    for q, pz in cuts: pc = x[int(pos * SR):int(q * SR)].copy(); pc[-240:] *= np.linspace(1, 0, 240); pieces += [pc, np.zeros(int(pz * SR), np.float32)]; pos = q
    pc = x[int(pos * SR):int(s1 * SR)].copy()
    if cuts: pc[:240] *= np.linspace(0, 1, 240)
    seg = np.concatenate(pieces + [pc]); sh = lambda mid: sum(pz for q, pz in cuts if q <= mid)
    g = 10 ** ((TARGET - rms_db(seg)) / 20); seg *= g
    f = int(0.008 * SR); seg[:f] *= np.linspace(0, 1, f); seg[-f:] *= np.linspace(1, 0, f)
    if i: gap = L.get("gap", GAP0); parts.append(np.zeros(int(gap * SR), np.float32)); t += gap
    disp = L.get("show", L["text"]).split(); A, B = [norm(d) for d in disp], [norm(w["word"]) for w in W]; span = [None] * len(disp)
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, A, B, autojunk=False).get_opcodes():
        if tag == "equal":
            for k in range(i2 - i1): span[i1 + k] = (W[j1 + k]["start"], W[j1 + k]["end"])
        elif i2 > i1:                                                # shown differently from what was heard: share the heard run's time evenly
            t0 = W[j1]["start"] if j2 > j1 else (W[j1 - 1]["end"] if j1 else a); t1 = W[j2 - 1]["end"] if j2 > j1 else (W[j1]["start"] if j1 < len(W) else b)
            for k in range(i2 - i1): span[i1 + k] = (t0 + (t1 - t0) * k / (i2 - i1), t0 + (t1 - t0) * (k + 1) / (i2 - i1))
    if A != B: print(f"  {L['key']}: lined up {len(disp)} shown words with {len(W)} heard: CHECK this line's words on screen")
    lw = []
    for j, d in enumerate(disp):
        w0, w1 = span[j]
        if j == 0: w0 = max(w0, a)
        lw.append([d, round(float(t + max(w0, s0) - s0 + sh((w0 + w1) / 2)), 3), round(float(t + min(max(w1, w0 + 0.05), s1) - s0 + sh((w0 + w1) / 2)), 3)])
    for j in range(len(lw) - 1): lw[j][2] = min(lw[j][2], lw[j + 1][1]) if lw[j][2] > lw[j + 1][1] else lw[j][2]
    lines.append({"key": L["key"], "t0": round(float(t), 3), "t1": round(float(t + len(seg) / SR), 3), "gain_db": round(float(20 * np.log10(g)), 1), "text": " ".join(w[0] for w in lw)})
    words += [[w[0], w[1], w[2], L["key"]] for w in lw]; parts.append(seg); t += len(seg) / SR
parts.append(np.zeros(int(END * SR), np.float32)); y = np.concatenate(parts); dur = len(y) / SR
(ROOT / "cut").mkdir(exist_ok=True)
with wave.open(str(ROOT / "cut/voice.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(3); w.setframerate(SR)
    q = (np.clip(y, -1, 1) * 8388607).astype("<i4"); w.writeframes(b"".join(int(v).to_bytes(3, "little", signed=True) for v in q))
(ROOT / "film/timing.js").write_text("window.TIMING = " + json.dumps({"dur": round(dur, 3), "lines": lines, "words": words}, ensure_ascii=False) + ";\n")
for l in lines: print(f"{l['t0']:6.2f} {l['t1']:6.2f} {l['gain_db']:+5.1f} dB  {l['key']:9s} {l['text']}")
nw = len(words); print(f"dur {dur:.2f} s, {nw} words, {nw / max(1e-9, dur - END - LEAD):.2f} words/s, peak {20 * np.log10(np.abs(y).max()):.1f} dBFS")
