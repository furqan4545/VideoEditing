# Reel 15 cut: Ali's voice on one reel clock + his footage frames, for the onetake composition.
#   cut/voice.wav                 the whole reel clock, 48 kHz mono. RAW voice: atempo 1.10 + one gain per phrase + 12 ms fades. Nothing else.
#   cut/check/<id>.wav            each piece alone (sped up, gained)
#   cut/timing.json, film/timing.js   window.TIMING = {fps, dur, speed, pieces, lines, words, footage}
#   film/footage/{loc,st2,st19}/0000.jpg ...   30 fps frames on the reel clock (frame k is reel time f0_reel_t + k/30)
# run: ~/.local/share/onetake/.venv/bin/python cut/build.py [--no-frames] [--no-whisper]
#   --no-frames   keep the footage folders as they are      --no-whisper  reuse cut/words/voice.json
# Times: `a`/`b` below are rough speech edges in the SOUND files (audio/studio.wav, audio/loc.wav); the exact edges are found
# from the level curve. The studio movie's sound starts 0.0825 s after its picture, so movie time = wav time + AV_OFF.
import difflib, json, os, re, subprocess, sys
import numpy as np, soundfile as sf
from scipy.signal import lfilter, resample_poly

SR, FPS, SPEED = 48000, 30, 1.10
def find(name):                                    # Ali moved the phone clips into Downloads/mart_reel on 13 Nov; look in both places
    for d in (os.path.expanduser("~/Downloads"), os.path.expanduser("~/Downloads/mart_reel")):
        if os.path.exists(f"{d}/{name}"): return f"{d}/{name}"
    raise SystemExit("missing source clip: " + name)
STUDIO_MOV, LOC_MOV = find("reel_alarm.mov"), find("IMG_3573.MOV")
AV_OFF = {"studio": 0.082521, "loc": 0.0}          # movie time - wav time
PRE, POST, FADE = 0.035, 0.045, 0.012               # spare sound kept before / after the speech edges (source s), edge fade (reel s)
START = 0.20                                        # reel time of L1's first sound
TAIL = 1.0                                          # reel runs this long after the last word
MAX_GAIN = 8.0
STUDIO_CROP = {"st2": "crop=1080:1080:380:0", "st19": "crop=1080:1080:560:0"}

# Silence between the END of one piece's speech and the START of the next (reel seconds, after the speed-up).
GAPS = {
    "inside": 0.14,          # a -> b -> c inside one line
    "join": 0.10,            # a pause I cut out inside one sentence (L9a->L9b, L18a->L18a2)
    "lines": 0.30,           # between lines
    "after": {"L1": 0.35, "L2": 0.40, "L4b": 0.55, "L15": 0.50},
    "before": {"L15": 0.45, "L19": 0.60},
}
JOINS = {("L9a", "L9b"), ("L18a", "L18a2")}

# id, line, source, rough in, rough out (wav seconds), caption text (script spelling), loudness group
PIECES = [
    ("L1",    1, "loc",      3.31,   5.80, "How does this device know that you didn't steal anything?", "L1"),
    ("L2",    2, "studio", 121.51, 124.49, "It does not know. It only listens for a tag.", "L2"),
    # L3: 158.20-159.51 is a false start ("So it sometimes be-"); the whole sentence is the next run
    ("L3",    3, "studio", 160.90, 163.84, "So it sometimes beeps at the people who already paid.", "L3"),
    ("L4a",   4, "studio", 175.68, 178.11, "Some shops even put a tag on the cheese.", "L4a"),
    ("L4b",   4, "studio", 182.67, 184.20, "Let's go inside that tag.", "L4b"),
    ("L5a",   5, "studio", 189.55, 191.33, "There is no battery and no chip.", "L5a"),
    ("L5b",   5, "studio", 204.71, 208.14, "A metal strip lies loose above a flat magnet.", "L5b"),
    ("L6a",   6, "studio", 219.51, 222.99, "A magnetic field makes the strip a tiny bit longer.", "L6a"),
    ("L6b",   6, "studio", 223.90, 225.76, "Without one, it snaps back.", "L6b"),
    ("L7a",   7, "studio", 231.77, 234.02, "A shorter ruler buzzes faster.", "L7a"),
    ("L7b",   7, "studio", 234.53, 238.36, "This strip is cut to shake 58,000 times a second.", "L7b"),
    ("L8a",   8, "studio", 264.08, 266.72, "The magnet's pull sets that exact speed.", "L8a"),
    ("L8b",   8, "studio", 269.86, 272.80, "Without the magnet, the strip barely shakes.", "L8b"),
    ("L9a",   9, "studio", 278.10, 280.70, "As you leave, the gate fires a magnetic field", "L9"),
    ("L9b",   9, "studio", 281.28, 282.84, "that flips at the same speed.", "L9"),
    ("L10a", 10, "studio", 294.14, 298.39, "Each flip pushes the strip at the right moment, like pushing a swing.", "L10a"),
    ("L10b", 10, "studio", 299.95, 302.19, "It shakes harder and harder.", "L10b"),
    ("L11a", 11, "studio", 309.78, 311.87, "Then the gate stops and listens.", "L11a"),
    ("L11b", 11, "studio", 315.98, 318.61, "The strip is loose, so it keeps shaking.", "L11b"),
    ("L12a", 12, "studio", 323.66, 324.99, "Now it works backward.", "L12a"),
    ("L12b", 12, "studio", 329.79, 332.13, "Shaking makes a tiny magnetic field.", "L12b"),
    ("L13a", 13, "studio", 337.33, 340.08, "Your keys go quiet when the gate stops.", "L13a"),
    ("L13b", 13, "studio", 341.22, 344.95, "The strip answers about six times, faster than a blink,", "L13b"),
    ("L13c", 13, "studio", 349.51, 351.01, "and the alarm rings.", "L13c"),
    ("L14a", 14, "studio", 369.83, 372.35, "When you pay, the checkout kills that magnet.", "L14a"),
    ("L14b", 14, "studio", 377.54, 379.05, "The strip changes speed.", "L14b"),
    ("L14c", 14, "studio", 382.65, 385.16, "The pushes land at the wrong moments,", "L14c"),
    ("L14d", 14, "studio", 387.18, 389.15, "and almost nothing comes back.", "L14d"),
    ("L15",  15, "studio", 392.00, 393.02, "And here's the best part.", "L15"),
    ("L16a", 16, "studio", 396.44, 398.56, "One man paid for the new jeans.", "L16a"),
    ("L16b", 16, "studio", 402.61, 405.86, "A tag hidden inside was never turned off.", "L16b"),
    ("L17a", 17, "studio", 410.85, 412.19, "He washed them at home.", "L17a"),
    ("L17b", 17, "studio", 413.04, 415.94, "Weeks later, he wore them to a hardware shop,", "L17b"),
    ("L17c", 17, "studio", 418.40, 419.60, "and its alarm rang.", "L17c"),
    ("L18a", 18, "studio", 424.99, 427.02, "He took off his jacket, his shoes", "L18a"),
    ("L18a2", 18, "studio", 427.69, 428.37, "and belt.", "L18a"),
    ("L18b", 18, "studio", 429.79, 430.90, "It still rang,", "L18b"),
    ("L18c", 18, "studio", 433.33, 435.32, "because the tag was in his jeans.", "L18c"),
    ("L19",  19, "studio", 492.16, 495.67, "The gate cannot tell a thief from a pair of clean jeans.", "L19"),
]
# Ambient handles for the location line (source s): the street sound fades in before the first word and out after the last.
LOC_HANDLE = (0.22, 0.33); LOC_FADES = (0.15, 0.25)

os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
NO_FRAMES, NO_WHISPER = "--no-frames" in sys.argv, "--no-whisper" in sys.argv
for d in ("cut/raw", "cut/check", "cut/words", "cut/sdr", "film/footage"): os.makedirs(d, exist_ok=True)

WAV = {}
for k, p in (("studio", "audio/studio.wav"), ("loc", "audio/loc.wav")):
    y, sr = sf.read(p, dtype="float32"); assert sr == SR
    WAV[k] = y if y.ndim == 1 else y.mean(1)

H, WIN = 0.005, 0.02
def level(y):                                       # dB of a 20 ms window every 5 ms; frame i covers [i*H, i*H + WIN]
    hop, win = int(H * SR), int(WIN * SR); n = (len(y) - win) // hop
    c = np.cumsum(np.concatenate([[0.0], y.astype(np.float64) ** 2])); i = np.arange(n) * hop
    return 20 * np.log10(np.sqrt((c[i + win] - c[i]) / win + 1e-14))
DB = {k: level(v) for k, v in WAV.items()}

def edges(src, a, b):
    """exact first / last sound of the phrase whose rough edges are a, b"""
    if src == "loc": return a, b                    # street noise: edges set by hand from the level curve
    db = DB[src]; ia, ib = int((a - 0.30) / H), int((b + 0.45) / H)
    strong = np.where(db[ia:ib] > -36)[0] + ia
    s0 = strong[strong >= int((a - 0.05) / H)][0]; s1 = strong[strong <= int((b + 0.10) / H)][-1]
    i, dip = s0, 0                                  # soft lead-in (s, sh, h, th): back while there is sound, stop at a 35 ms hole
    while i > ia and dip < 7: i -= 1; dip = dip + 1 if db[i] < -57 else 0
    first = i + dip
    j, dip = s1, 0                                  # tail: keep hiss and the release after a stop (holes up to 150 ms)
    while j < ib - 1 and dip < 30: j += 1; dip = dip + 1 if db[j] < -57 else 0
    return first * H, (j - dip) * H + WIN

def kloud(y):                                       # ITU-R BS.1770 integrated loudness (LUFS) of a mono signal
    z = lfilter([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585], y.astype(np.float64))
    z = lfilter([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621], z)
    blk, hop = int(0.4 * SR), int(0.1 * SR)
    if len(z) < blk: return -0.691 + 10 * np.log10(np.mean(z ** 2) + 1e-14)
    ms = np.array([np.mean(z[i:i + blk] ** 2) for i in range(0, len(z) - blk + 1, hop)])
    l = -0.691 + 10 * np.log10(ms + 1e-14); ms = ms[l > -70]
    if not len(ms): return -70.0
    rel = -0.691 + 10 * np.log10(ms.mean()) - 10
    ms = ms[-0.691 + 10 * np.log10(ms) > rel]
    return -0.691 + 10 * np.log10(ms.mean())

def atempo(y, name):
    raw, out = f"cut/raw/{name}.wav", f"cut/raw/{name}_110.wav"
    sf.write(raw, y, SR, subtype="FLOAT")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-filter:a", f"atempo={SPEED}", "-c:a", "pcm_f32le", out], check=True)
    z, _ = sf.read(out, dtype="float32"); m = int(round(len(y) / SPEED))
    return np.pad(z, (0, max(0, m - len(z))))[:m]

# 1. cut each piece on its exact edges, speed it up
P = []
for sid, line, src, a, b, text, grp in PIECES:
    s_in, s_out = edges(src, a, b)
    y = WAV[src]; c0, c1 = s_in - PRE, s_out + POST
    sp = atempo(y[int(round(c0 * SR)):int(round(c1 * SR))], sid)
    p = dict(id=sid, line=line, src=src, text=text, grp=grp, s_in=s_in, s_out=s_out, c0=c0, c1=c1, y=sp)
    if src == "loc":                                # the same cut with street-sound handles
        h0, h1 = c0 - LOC_HANDLE[0], c1 + LOC_HANDLE[1]
        p["yh"] = atempo(y[int(round(h0 * SR)):int(round(h1 * SR))], sid + "_handles"); p["h0"], p["h1"] = h0, h1
    P.append(p)

# 2. one gain per phrase group: level every group to the median loudness
G = {}
for p in P: G.setdefault(p["grp"], []).append(p["y"])
LOUD = {g: kloud(np.concatenate(v)) for g, v in G.items()}
target = float(np.median(list(LOUD.values())))
for p in P:
    p["loud"] = LOUD[p["grp"]]; p["gain_db"] = float(np.clip(target - p["loud"], -MAX_GAIN, MAX_GAIN))

# 3. the reel clock
def gap(prev, cur):
    if (prev["id"], cur["id"]) in JOINS: return GAPS["join"]
    if cur["id"] in GAPS["before"]: return GAPS["before"][cur["id"]]
    if prev["id"] in GAPS["after"]: return GAPS["after"][prev["id"]]
    return GAPS["inside"] if prev["line"] == cur["line"] else GAPS["lines"]
snap = lambda t: round(t * FPS) / FPS
for i, p in enumerate(P):
    d = len(p["y"]) / SR
    want = START if i == 0 else P[i - 1]["v1"] + gap(P[i - 1], p)          # reel time of the first sound
    p["t0"] = snap(want - PRE / SPEED); p["t1"] = p["t0"] + d
    p["v0"], p["v1"] = p["t0"] + PRE / SPEED, p["t1"] - POST / SPEED       # speech edges on the reel
    p["gap_before"] = 0.0 if i == 0 else p["v0"] - P[i - 1]["v1"]
dur = float(np.ceil((P[-1]["v1"] + TAIL) * FPS) / FPS)

# 4. the voice track
voice = np.zeros(int(round(dur * SR)) + SR, np.float32)
def fade(y, fi, fo):
    y = y.copy(); a, b = int(fi * SR), int(fo * SR)
    y[:a] *= np.linspace(0, 1, a, dtype=np.float32); y[-b:] *= np.linspace(1, 0, b, dtype=np.float32); return y
for p in P:
    g = 10 ** (p["gain_db"] / 20)
    if "yh" in p:
        y = fade(p["yh"], *LOC_FADES) * g; t = p["t0"] - LOC_HANDLE[0] / SPEED
        if t < 0: y = y[int(round(-t * SR)):]; t = 0.0
    else:
        y = fade(p["y"], FADE, FADE) * g; t = p["t0"]
    sf.write(f"cut/check/{p['id']}.wav", fade(p["y"], FADE, FADE) * g, SR, subtype="FLOAT")
    i = int(round(t * SR)); voice[i:i + len(y)] += y[: len(voice) - i]
voice = voice[: int(round(dur * SR))]
sf.write("cut/voice.wav", voice, SR, subtype="FLOAT")

# 5. word times from the assembled track (one whisper run), my caption spelling on the heard times
WJ = "cut/words/voice.json"
if not (NO_WHISPER and os.path.exists(WJ)):
    from faster_whisper import WhisperModel
    m = WhisperModel("deepdml/faster-whisper-large-v3-turbo-ct2", device="cpu", compute_type="int8", cpu_threads=6)
    segs, _ = m.transcribe(resample_poly(voice, 1, 3).astype(np.float32), language="en", word_timestamps=True, vad_filter=False,
                           condition_on_previous_text=False, temperature=0.0)
    json.dump([dict(word=w.word.strip(), start=round(w.start, 3), end=round(w.end, 3)) for s in segs for w in (s.words or [])], open(WJ, "w"))
HEARD = json.load(open(WJ))
norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())
WORDS = []
for i, p in enumerate(P):
    lo = (P[i - 1]["v1"] + p["v0"]) / 2 if i else 0.0; hi = (p["v1"] + P[i + 1]["v0"]) / 2 if i + 1 < len(P) else dur
    hw = []
    for w in HEARD:
        if not (lo <= w["end"] - 0.02 < hi): continue          # by its END: whisper starts a phrase's first word early, inside the gap
        if hw and re.match(r"^[.,]?[0-9]", w["word"]) and re.search(r"[0-9]$", hw[-1][0]): hw[-1] = [hw[-1][0] + w["word"], hw[-1][1], w["end"]]   # 58 ,000
        else: hw.append([w["word"], w["start"], w["end"]])
    p["heard"] = " ".join(w[0] for w in hw)
    mine = p["text"].split(); tt = [None] * len(mine)
    for i0, j0, k in difflib.SequenceMatcher(None, [norm(x) for x in mine], [norm(w[0]) for w in hw], autojunk=False).get_matching_blocks():
        for q in range(k): tt[i0 + q] = (hw[j0 + q][1], hw[j0 + q][2])
    a0, b0, k = p["v0"], p["v1"], 0
    while k < len(mine):                            # words whisper heard differently: spread between their neighbours by length
        if tt[k] is None:
            j = k
            while j < len(mine) and tt[j] is None: j += 1
            x0 = tt[k - 1][1] if k else a0; x1 = tt[j][0] if j < len(mine) else b0
            L = [max(2, len(norm(x))) for x in mine[k:j]]; tot, acc = sum(L), 0
            for q, ln in enumerate(L):
                s0 = x0 + (x1 - x0) * acc / tot; acc += ln; tt[k + q] = (s0, x0 + (x1 - x0) * acc / tot)
            k = j
        else: k += 1
    prev = a0
    for wd, (s0, s1) in zip(mine, tt):              # keep every word inside its piece's speech and in order
        s0 = min(max(s0, prev, a0), b0 - 0.04); s1 = min(max(s1, s0 + 0.04), b0); prev = s0
        WORDS.append([wd, round(s0, 3), round(s1, 3), p["id"]])
    mine_w = [w for w in WORDS if w[3] == p["id"]]
    mine_w[0][1] = round(a0, 3); mine_w[-1][2] = round(b0, 3)   # first / last word: use the real first and last sound of the piece

# 6. footage frames on the reel clock
def tonemap(src, out):                              # iPhone HLG -> bt709 with Apple's own tone map (keeps portrait)
    if not os.path.exists(out): subprocess.run(["avconvert", "-s", src, "-p", "Preset1920x1080", "-o", out], check=True, stdout=subprocess.DEVNULL)
    return out
def frames(name, mov, piece, before, after, vf=""):
    """frames of `mov` from `before` s (reel) ahead of the piece to `after` s behind it; frame k = reel f0 + k/30"""
    f0 = np.floor((piece["t0"] - before) * FPS + 1e-6) / FPS; n = int(np.ceil((piece["t1"] + after - f0) * FPS)) + 1
    m0 = piece["c0"] + AV_OFF[piece["src"]] + (f0 - piece["t0"]) * SPEED         # movie time shown at reel f0
    d = f"film/footage/{name}"
    if not NO_FRAMES:
        os.makedirs(d, exist_ok=True)
        for old in os.listdir(d): os.remove(f"{d}/{old}")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{m0:.6f}", "-i", mov, "-an",
                        "-vf", f"setpts=(PTS-STARTPTS)/{SPEED},fps={FPS}" + ("," + vf if vf else ""),
                        "-frames:v", str(n), "-q:v", "2", "-start_number", "0", f"{d}/%04d.jpg"], check=True)
    got = len([x for x in os.listdir(d) if x.endswith(".jpg")]) if os.path.isdir(d) else 0
    from PIL import Image
    w, h = Image.open(f"{d}/0000.jpg").size if got else (0, 0)
    return dict(dir=f"footage/{name}", n=got, f0_reel_t=round(float(f0), 4), w=w, h=h, mov_t0=round(float(m0), 4), speed=SPEED, piece=piece["id"])
by = {p["id"]: p for p in P}
FOOT = {}
loc_sdr = tonemap(LOC_MOV, "cut/sdr/IMG_3573_sdr.mov")
l1 = by["L1"]                                       # clip time 1.6 s (walking away) .. 7.2 s
FOOT["loc"] = frames("loc", loc_sdr, l1, (l1["c0"] - 1.6) / SPEED, (7.2 - l1["c1"]) / SPEED)
FOOT["st2"] = frames("st2", STUDIO_MOV, by["L2"], 1.0, 1.2, STUDIO_CROP["st2"])
FOOT["st19"] = frames("st19", STUDIO_MOV, by["L19"], 1.2, 1.2, STUDIO_CROP["st19"])
FOOT["st19w"] = frames("st19w", STUDIO_MOV, by["L19"], 1.2, 1.2, "crop=1160:1080:440:0")   # wider spare: both hands stay in frame

# 7. timing
r = lambda x: round(float(x), 4)
pieces = [dict(id=p["id"], line=p["line"], t0=r(p["t0"]), t1=r(p["t1"]), v0=r(p["v0"]), v1=r(p["v1"]), text=p["text"], heard=p["heard"], src=p["src"],
               src_in=r(p["c0"] + AV_OFF[p["src"]]), src_out=r(p["c1"] + AV_OFF[p["src"]]), gain_db=round(p["gain_db"], 2), gap_before=r(p["gap_before"])) for p in P]
lines = []
for n in sorted({p["line"] for p in P}):
    q = [p for p in P if p["line"] == n]
    lines.append(dict(n=n, t0=r(q[0]["t0"]), t1=r(q[-1]["t1"]), text=" ".join(x["text"] for x in q)))
T = dict(fps=FPS, dur=r(dur), speed=SPEED,
         note="t0/t1 = the piece's sound on the reel clock (starts on a whole frame); v0/v1 = first/last sound of the speech; "
              "src_in/src_out = seconds in the source MOVIE at t0/t1 (movie time = src_in + (t - t0) * speed); words = [word, t0, t1, pieceId]",
         pieces=pieces, lines=lines, words=WORDS, footage=FOOT)
json.dump(T, open("cut/timing.json", "w"), indent=1, ensure_ascii=False)
open("film/timing.js", "w").write("window.TIMING = " + json.dumps(T, ensure_ascii=False) + ";\n")

print(f"reel {dur:.3f} s at {SPEED}x, target loudness {target:.1f} LUFS per phrase")
for p in P:
    flag = "" if norm(p["heard"]) == norm(p["text"]) else "   <-- heard: " + p["heard"]
    print(f"{p['id']:6s} {p['t0']:7.3f}-{p['t1']:7.3f}  gap {p['gap_before']:.2f}  src {p['s_in']:7.2f}-{p['s_out']:7.2f}  {p['loud']:6.1f} LUFS  gain {p['gain_db']:+5.2f} dB  {p['text']}{flag}")
for k, v in FOOT.items(): print("footage", k, v)
