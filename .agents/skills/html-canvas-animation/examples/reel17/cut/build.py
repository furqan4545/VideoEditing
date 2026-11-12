# Reel 17 cut (how Instagram never loses a like): Ali's best try of each line, on one reel clock, for an onetake composition.
# One 7.2-minute landscape take (pen_edit.mov). Each piece is cut on its word edges and sped up SPEED x.
# Voice rule: raw voice, ffmpeg atempo only, one plain gain per line. No EQ, no compressor, no rubberband.
#   film/footage/<id>/0000.jpg ...  the piece as JPEG frames (full 1920x1080), PAD spare frames at both ends
#   cut/check/<id>.wav              the piece's sound alone (word times come from transcribing these)
#   cut/voice_raw.wav               all pieces on the reel clock
#   cut/timing.json, film/timing.js the reel clock: pieces, frame counts, word times
# run: ~/.local/share/onetake/.venv/bin/python cut/build.py            (cut + frames + words + timing)
#      ~/.local/share/onetake/.venv/bin/python cut/build.py --timing   (only rebuild timing from cut/words/*.json)
import json, os, subprocess, sys, difflib, re
import numpy as np, soundfile as sf

SR, FPS, SPEED, PAD = 48000, 30, 1.10, 12
SRC = "/Users/topg/Downloads/pen_edit.mov"
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
SEQ = [  # id, in, out (s in the take: first / last sound, from the loudness envelope), caption text (his words, spelled right)
    ("H",    58.32,  65.18, "How does Instagram never lose the count of likes when millions of people tap the heart in the same second?"),
    ("R1",   82.805, 85.255, "Imagine you are in the class of 100 students."),
    ("R2",   91.52,  93.58, "Sara's drawing is on the wall,"),
    ("R3",  107.55, 110.44, "and a board next to it says 41 likes."),
    ("R4",  123.70, 125.85, "You like it, so you walk up to add one."),
    ("R5",  176.63, 178.88, "But Minji stands up at the same time."),
    ("R6a", 182.07, 183.39, "You both saw 41,"),
    ("R6b", 188.59, 190.13, "so you both write 42."),
    ("R7a", 199.10, 200.30, "Two kids liked it."),
    ("R7b", 203.75, 205.95, "The number went up by only one."),
    ("R7c", 209.25, 210.97, "Your like is gone."),
    ("R8",  213.74, 216.975, "Engineers call this race condition."),
    ("R9",  233.62, 235.66, "So the teacher makes a rule."),
    ("R10", 240.74, 242.18, "Nobody touches the board."),
    ("R11", 247.06, 249.76, "You pass her a note with your name on it."),
    ("R12", 254.48, 256.38, "She takes one note at a time."),
    ("R13", 265.00, 266.73, "She writes the name in her notebook."),
    ("R14", 273.73, 278.57, "Then she changes the number. 42, 43, 44. Nobody is lost."),
    ("R15a", 283.86, 285.80, "And if you send your note twice,"),
    ("R15b", 288.94, 290.23, "your name is already there."),
    ("R15c", 296.97, 298.53, "It still counts once."),
    ("R16a", 301.40, 302.47, "That is Instagram."),
    ("R16b", 305.55, 307.56, "Your phone never sends a number."),
    ("R16c", 310.09, 311.59, "It sends your name."),
    ("R17a", 320.07, 321.31, "And for every post,"),
    ("R17b", 325.29, 330.46, "one computer holds the pen among millions of computers, which we call server."),
    ("R18a", 335.50, 337.25, "All the other computers in the world"),
    ("R18b", 340.17, 341.56, "just hold copies."),
    ("R19", 372.57, 375.13, "They hear the number a second later."),
    ("R20", 393.07, 396.99, "So if you build an app, never let two computers change the same number."),
    ("R21", 406.05, 409.17, "Send the name and give only one of them the pen."),
    ("R22", 423.575, 427.995, "And if you want more engineering secrets like this, comment the word pen."),
]
ON_CAM = {"H", "R1", "R16a", "R16b", "R20", "R21", "R22"}   # only these pieces get footage frames (Ali is a photo card only here)
PRE, POST, TAIL = 0.07, 0.10, 1.0
ONLY_TIMING = "--timing" in sys.argv
for d in ("cut/check", "cut/raw", "cut/words", "film/footage"): os.makedirs(d, exist_ok=True)

def active_db(y):
    hop = 480; n = len(y) // hop
    r = 20 * np.log10(np.sqrt(np.mean(y[:n * hop].reshape(n, hop) ** 2, axis=1)) + 1e-9)
    act = r[r > r.max() - 22]
    return float(np.mean(act))

plan = []
for sid, a, b, text in SEQ:
    a = np.floor((a - PRE) * FPS) / FPS; b = np.ceil((b + POST) * FPS) / FPS
    n = int(round((b - a) / SPEED * FPS))
    plan.append((sid, float(a), float(b), n, text))

if not ONLY_TIMING:
    full, sr = sf.read("audio/pen_edit.wav"); assert sr == SR; full = full.astype(np.float32)
    levels = {}
    for sid, a, b, n, text in plan:
        d = n / FPS; raw, out, fdir = f"cut/raw/{sid}.wav", f"cut/check/{sid}.wav", f"film/footage/{sid}"
        y = full[int(round(a * SR)):int(round(b * SR))].copy()
        f = int(0.012 * SR); y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
        sf.write(raw, y, SR)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-filter:a", f"atempo={SPEED}", "-ar", str(SR), out], check=True)
        y, _ = sf.read(out); y = (y if y.ndim == 1 else y.mean(1)).astype(np.float32)
        m = int(round(d * SR)); y = np.pad(y, (0, max(0, m - len(y))))[:m]
        levels[sid] = active_db(y); sf.write(out, y, SR)
        if sid not in ON_CAM: continue
        os.makedirs(fdir, exist_ok=True)
        for old in os.listdir(fdir): os.remove(f"{fdir}/{old}")
        ps = PAD / FPS * SPEED
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{a - ps:.6f}", "-t", f"{b - a + 2 * ps + 0.2:.6f}", "-i", SRC,
                        "-vf", f"setpts=(PTS-STARTPTS)/{SPEED},fps={FPS},eq=contrast=1.05:saturation=1.08",
                        "-frames:v", str(n + 2 * PAD), "-q:v", "3", "-start_number", "0", f"{fdir}/%04d.jpg"], check=True)
    med = float(np.median(list(levels.values())))
    gains = {k: float(np.clip(med - v, -5, 5)) for k, v in levels.items()}
    json.dump({"median_db": med, "levels": levels, "gain_db": gains}, open("cut/gains.json", "w"), indent=1)
    R, v = 0.0, np.zeros(int((sum(p[3] for p in plan) / FPS + TAIL + 0.5) * SR), np.float32)
    for sid, a, b, n, text in plan:
        y, _ = sf.read(f"cut/check/{sid}.wav"); y = y.astype(np.float32) * 10 ** (gains[sid] / 20)
        i = int(round(R * SR)); v[i:i + len(y)] += y; R += n / FPS
    sf.write("cut/voice_raw.wav", v, SR)
    print("line gains (dB):", {k: round(g, 1) for k, g in gains.items()})
    # word times from the sped pieces
    from faster_whisper import WhisperModel
    os.environ["HF_HUB_OFFLINE"] = "1"
    model = WhisperModel("small", device="cpu", compute_type="int8")
    for sid, a, b, n, text in plan:
        y, _ = sf.read(f"cut/check/{sid}.wav"); y = y.astype(np.float32)
        y16 = np.interp(np.arange(0, len(y), 3.0), np.arange(len(y)), y).astype(np.float32)
        segs, _ = model.transcribe(y16, language="en", word_timestamps=True, initial_prompt=text, condition_on_previous_text=False)
        words = [{"word": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)} for s in segs for w in s.words]
        json.dump({"words": words}, open(f"cut/words/{sid}.json", "w"))

norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
segs, R = [], 0.0
for sid, a, b, n, text in plan:
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
                 "heard": " ".join(w[0] for w in words)})
    R += d
dur = round(float(np.ceil((R + TAIL) * FPS) / FPS), 4)
T = {"dur": dur, "fps": FPS, "speed": SPEED, "segs": segs}
json.dump(T, open("cut/timing.json", "w"), indent=1, ensure_ascii=False)
open("film/timing.js", "w").write("window.VO = " + json.dumps(T, ensure_ascii=False) + ";\n")
print("dur", dur, "s at", SPEED, "x")
for s in segs: print(f"{s['id']:4s} {s['t0']:6.2f}-{s['t1']:6.2f} frames {s['frames']:4d} | heard: {s['heard']}")
