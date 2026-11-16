# The cut: Ali's best try of each line, on one reel clock (the TIGHT clock the picture is designed on).
# talk-and-point: his VERTICAL selfie take (tone-mapped to SDR: ../sdr/take.mov, or TAKE=...), every piece gets frames; each piece is cut on its word edges (from the loudness envelope) and sped up SPEED x.
# Then run cut/pauses.py for the 0.2 s after every sentence (the clock the film plays on).
# Voice rule: raw voice, ffmpeg atempo only, one plain gain per line. No EQ, no compressor, no rubberband.
#   film/footage/<id>/0000.jpg ...  the piece as JPEG frames (his vertical take, 1080x1920), PAD spare frames at both ends
#   cut/check/<id>.wav              the piece's sound alone (word times come from transcribing these)
#   cut/voice_raw.wav               all pieces on the reel clock
#   cut/timing.json, film/timing.js the reel clock: pieces, frame counts, word times
# run: ~/.local/share/onetake/.venv/bin/python cut/build.py            (cut + frames + words + timing)
#      ~/.local/share/onetake/.venv/bin/python cut/build.py --timing   (only rebuild timing from cut/words/*.json)
import json, os, subprocess, sys, difflib, re
import numpy as np, soundfile as sf

SR, FPS, SPEED, PAD = 48000, 30, 1.10, 12
SRC = os.environ.get("TAKE", os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../sdr/take.mov")))      # his recording (or: TAKE=/path/to/take.mov python cut/build.py)
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
SEQ = [  # id, in, out (s in the take: first / last sound) OR [(in, out), ...] parts of ONE try (a long pause removed);
         # caption text = HIS words (what he really said, not the script). His LAST complete try of each line, whole.
    ("H",   0.000, 0.000, "The hook line, exactly as he says it."),
    ("S1",  0.000, 0.000, "The next line,"),
    ("S2",  [(0.000, 0.000), (0.000, 0.000)], "a line said in one try with a long stop in the middle."),
]
ON_CAM = {row[0] for row in SEQ}   # every piece gets frames: he is on screen often, the animation places cover the rest
EXT_GAIN = -2.5     # the off-camera person sits a little under Ali
EXT_FX = "highpass=f=110,lowpass=f=7200,aecho=0.85:0.55:23|41:0.16|0.10"   # in the room: a bit duller than his close mic, a short room
PRE, POST, TAIL = 0.07, 0.10, 1.0
ONLY_TIMING = "--timing" in sys.argv
for d in ("cut/check", "cut/raw", "cut/words", "film/footage"): os.makedirs(d, exist_ok=True)

def active_db(y):
    hop = 480; n = len(y) // hop
    r = 20 * np.log10(np.sqrt(np.mean(y[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)
    act = r[r > r.max() - 22]
    return float(np.mean(act))

def ext_clip(path):   # an off-camera line: trimmed to its first / last sound (+ PRE / POST), mono 48 k
    y, sr = sf.read(path); y = (y if y.ndim == 1 else y.mean(1)).astype(np.float32)
    if sr != SR: y = np.interp(np.arange(0, len(y), sr / SR), np.arange(len(y)), y).astype(np.float32)
    hop = 240; n = len(y) // hop; r = 20 * np.log10(np.sqrt(np.mean(y[:n * hop].reshape(n, hop) ** 2, 1)) + 1e-9); act = np.where(r > r.max() - 38)[0]
    a, b = max(0, act[0] * hop - int(PRE * SR)), min(len(y), (act[-1] + 1) * hop + int(POST * SR)); y = y[a:b].copy()
    f = int(0.008 * SR); y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
    return y
EXT = {}
plan = []   # (id, first in, last out, frames, text, parts [(a, b, n)])
for row in SEQ:
    if isinstance(row[1], dict):
        sid, spec, text = row; y = ext_clip(spec["wav"]); EXT[sid] = y; n = int(round(len(y) / SR * FPS)) + 2
        plan.append((sid, -1.0, -1.0, n, text, [])); continue
    if len(row) == 3: sid, parts, text = row
    else: sid, a, b, text = row; parts = [(a, b)]
    pp = []
    for k, (a, b) in enumerate(parts):
        a = np.floor((a - (PRE if k == 0 else 0)) * FPS) / FPS; b = np.ceil((b + (POST if k == len(parts) - 1 else 0)) * FPS) / FPS
        pp.append((float(a), float(b), int(round((b - a) / SPEED * FPS))))
    plan.append((sid, pp[0][0], pp[-1][1], sum(p[2] for p in pp), text, pp))

if not ONLY_TIMING:
    if not os.path.exists("audio/take.wav"):
        os.makedirs("audio", exist_ok=True); subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", SRC, "-vn", "-ac", "1", "-ar", "48000", "-c:a", "pcm_f32le", "audio/take.wav"], check=True)
    full, sr = sf.read("audio/take.wav"); assert sr == SR; full = full.astype(np.float32)
    levels = {}
    for sid, a, b, n, text, pp in plan:
        d = n / FPS; raw, out, fdir = f"cut/raw/{sid}.wav", f"cut/check/{sid}.wav", f"film/footage/{sid}"
        if sid in EXT:   # the off-camera person: natural speed, in the room
            sf.write(raw, EXT[sid], SR); subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", EXT_FX, "-ar", str(SR), "-ac", "1", out], check=True)
            y, _ = sf.read(out); y = (y if y.ndim == 1 else y.mean(1)).astype(np.float32); m = int(round(d * SR)); y = np.pad(y, (0, max(0, m - len(y))))[:m]
            sf.write(out, y, SR); levels[sid] = active_db(y); continue
        ys = []
        for k, (pa, pb, pn) in enumerate(pp):
            y = full[int(round(pa * SR)):int(round(pb * SR))].copy()
            f = int(0.012 * SR); y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
            sf.write(raw, y, SR)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-filter:a", f"atempo={SPEED}", "-ar", str(SR), out], check=True)
            y, _ = sf.read(out); y = (y if y.ndim == 1 else y.mean(1)).astype(np.float32)
            m = int(round(pn / FPS * SR)); ys.append(np.pad(y, (0, max(0, m - len(y))))[:m])
        y = np.concatenate(ys); m = int(round(d * SR)); y = np.pad(y, (0, max(0, m - len(y))))[:m]
        levels[sid] = active_db(y); sf.write(out, y, SR)
        if sid not in ON_CAM: continue
        os.makedirs(fdir, exist_ok=True)
        for old in os.listdir(fdir): os.remove(f"{fdir}/{old}")
        ps = PAD / FPS * SPEED; k0 = 0
        for k, (pa, pb, pn) in enumerate(pp):   # pads only at the piece's two ends
            lp, rp = (PAD if k == 0 else 0), (PAD if k == len(pp) - 1 else 0)
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{pa - lp / FPS * SPEED:.6f}", "-t", f"{pb - pa + (lp + rp) / FPS * SPEED + 0.2:.6f}", "-i", SRC,
                            "-vf", f"setpts=(PTS-STARTPTS)/{SPEED},fps={FPS},eq=contrast=1.05:saturation=1.08",
                            "-frames:v", str(pn + lp + rp), "-q:v", "3", "-start_number", str(k0), f"{fdir}/%04d.jpg"], check=True)
            k0 += pn + lp + rp
    med = float(np.median([v for k, v in levels.items() if k not in EXT]))
    gains = {k: (med - v + EXT_GAIN) if k in EXT else float(np.clip(med - v, -5, 5)) for k, v in levels.items()}   # TTS is ~11 dB hot: no clip
    json.dump({"median_db": med, "levels": levels, "gain_db": gains}, open("cut/gains.json", "w"), indent=1)
    R, v = 0.0, np.zeros(int((sum(p[3] for p in plan) / FPS + TAIL + 0.5) * SR), np.float32)
    for sid, a, b, n, text, pp in plan:
        y, _ = sf.read(f"cut/check/{sid}.wav"); y = y.astype(np.float32) * 10 ** (gains[sid] / 20)
        i = int(round(R * SR)); v[i:i + len(y)] += y; R += n / FPS
    sf.write("cut/voice_raw.wav", v, SR)
    print("line gains (dB):", {k: round(g, 1) for k, g in gains.items()})
    # word times from the sped pieces
    from faster_whisper import WhisperModel
    os.environ["HF_HUB_OFFLINE"] = "1"
    model = WhisperModel("small", device="cpu", compute_type="int8")
    for sid, a, b, n, text, pp in plan:
        y, _ = sf.read(f"cut/check/{sid}.wav"); y = y.astype(np.float32)
        y16 = np.interp(np.arange(0, len(y), 3.0), np.arange(len(y)), y).astype(np.float32)
        segs, _ = model.transcribe(y16, language="en", word_timestamps=True, initial_prompt=text, condition_on_previous_text=False)
        words = [{"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)} for s in segs for w in s.words]
        json.dump({"words": words}, open(f"cut/words/{sid}.json", "w"))

norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
segs, R = [], 0.0
for sid, a, b, n, text, pp in plan:
    d = n / FPS; fdir = f"film/footage/{sid}"; wf = f"cut/words/{sid}.json"
    words = [[w["word"], round(R + w["start"], 3), round(R + min(w["end"], d), 3)] for w in json.load(open(wf))["words"]] if os.path.exists(wf) else []
    hw = []
    for w in words:
        if hw and re.match(r"^[.,%][0-9]?", w[0]) and len(w[0]) <= 2: hw[-1] = [hw[-1][0] + w[0], hw[-1][1], w[2]]
        else: hw.append(list(w))
    mine = text.split(); tt = [None] * len(mine)
    for i0, j0, k in difflib.SequenceMatcher(None, [norm(m) for m in mine], [norm(w[0]) for w in hw], autojunk=False).get_matching_blocks():
        for q in range(k): tt[i0 + q] = (hw[j0 + q][1], hw[j0 + q][2])
    lo, hi, i = R + 0.04, R + d - 0.04, 0
    while i < len(mine):
        if tt[i] is None:
            j = i
            while j < len(mine) and tt[j] is None: j += 1
            a0 = tt[i - 1][1] if i else lo; b0 = tt[j][0] if j < len(mine) else hi
            L = [max(2, len(norm(m))) for m in mine[i:j]]; tot, acc = sum(L), 0
            for q, ln in enumerate(L):
                s0 = a0 + (b0 - a0) * acc / tot; acc += ln; tt[i + q] = (s0, a0 + (b0 - a0) * acc / tot)
            i = j
        else: i += 1
    caps = [[m, round(x[0], 3), round(x[1], 3)] for m, x in zip(mine, tt)] if words else []
    segs.append({"id": sid, "t0": round(R, 4), "t1": round(R + d, 4), "n": n, "pad": PAD, "words": caps,
                 "frames": len(os.listdir(fdir)) if os.path.isdir(fdir) else 0, "take_in": round(a, 3), "take_out": round(b, 3), "text": text,
                 "splices": [round(R + sum(q[2] for q in pp[:k]) / FPS, 4) for k in range(1, len(pp))],
                 "heard": " ".join(w[0] for w in words)})
    R += d
dur = round(float(np.ceil((R + TAIL) * FPS) / FPS), 4)
T = {"dur": dur, "fps": FPS, "speed": SPEED, "segs": segs}
json.dump(T, open("cut/timing.json", "w"), indent=1, ensure_ascii=False)
open("film/timing.js", "w").write("window.VO = " + json.dumps(T, ensure_ascii=False) + ";\n")
print("dur", dur, "s at", SPEED, "x")
for s in segs: print(f"{s['id']:4s} {s['t0']:6.2f}-{s['t1']:6.2f} frames {s['frames']:4d} | heard: {s['heard']}")
