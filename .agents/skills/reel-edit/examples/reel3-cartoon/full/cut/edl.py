# Reel 3 edit list: Ali's takes and the cartoon on one clock (reel time R, seconds).
# Writes cut/timeline.json, sound/ali_voice.wav, sound/toon_voice.wav, and the cartoon's own
# voice + timing (toon/hf/assets/voice.wav, toon/timing.json) for the mouth analysis.
import json, os, re, subprocess
import numpy as np, soundfile as sf

SR = 48000
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
CHAR = "../character"

# id, take, source in, source out (s), what is said / shown
SEGS = [
    ("A1", "IMG_3392", 0.00, 4.30, "hook + Watch + five fingers"),
    ("A2", "IMG_3393", 1.95, 2.76, "Nope (finger)"),
    ("A3", "IMG_3394", 22.38, 25.50, "Not a voice actor, not ElevenLabs, it's VoiceStudio"),
    ("A4", "IMG_3394", 25.92, 28.50, "a free GitHub repo running locally on my laptop"),
    ("A5", "IMG_3395", 0.92, 4.45, "parrot, 10 seconds"),
    ("A6", "IMG_3396", 1.58, 2.70, "Need a new voice?"),
    ("A7", "IMG_3396", 7.76, 10.95, "order it like pizza: old, deep, grumpy"),
    ("A8", "IMG_3397", 0.50, 2.82, "speaks over 600 languages"),
    ("A9", "IMG_3398", 0.62, 2.32, "didn't click a single button"),
    ("A10", "IMG_3398", 17.42, 20.52, "TV remote, that's what MCP means"),
    ("A11", "IMG_3398", 28.02, 31.95, "told it: make me an old grumpy man..."),
    ("A12", "IMG_3399", 38.95, 40.62, "Say hi, old man (wave)"),
    ("A13", "IMG_3399", 100.42, 104.60, "Link and setup in the description. Sorry, ElevenLabs (thumbs up)"),
]
# cartoon lines (file, tag, caption) in order; part 1 = EN, ES; part 2 = JA .. punch
TOON = [("00-en-hook", "EN"), ("01-es", "ES"), ("02-ja", "JA"), ("03-fr", "FR"), ("04-zh-old", "ZH"), ("05-en-punch", "EN2")]
TOON_START = 4.10      # cartoon clock 0 on the reel clock (its first frame is the five-finger thumbnail pose)
EN_AT = 4.35           # first cartoon word
GAP, GAP_PUNCH = 0.30, 0.30
NOPE_ONSET = 2.30      # "Nope" in IMG_3393
HI_END = 40.26         # "...old man." ends in IMG_3399
LINK_ONSET = 100.60    # "Link" in IMG_3399


def lufs(path):
    out = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-af", "ebur128", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", out)[-1])


def load(path):
    y, sr = sf.read(path)
    y = y if y.ndim == 1 else y.mean(1)
    assert sr == SR, (path, sr)
    return y


# --- cartoon line lengths, then everything's place on the reel clock -----------------------------
toon_audio = {}
for f, _ in TOON:
    p = f"{CHAR}/audio/{f}.wav"
    y, sr = sf.read(p)
    y = y if y.ndim == 1 else y.mean(1)
    if sr != SR:
        import scipy.signal as ss
        y = ss.resample_poly(y, SR, sr)
    toon_audio[f] = y * 10 ** ((-16.0 - lufs(p)) / 20)

lines = []
t = EN_AT
for f, tag in TOON[:2]:
    d = len(toon_audio[f]) / SR
    lines.append({"file": f, "tag": tag, "start": round(t, 3), "end": round(t + d, 3)})
    t += d + GAP
es_end = lines[-1]["end"]

segs = []
R = 0.0
for sid, take, a, b, note in SEGS:
    if sid == "A2":
        R = es_end + 0.06                      # out of the cartoon's wag into Ali's finger
    if sid == "A13":
        R = lines[-1]["end"] + 0.22            # out of the cartoon's thumbs into Ali
    segs.append({"id": sid, "take": take, "src_in": a, "src_out": b, "R_in": round(R, 3), "R_out": round(R + b - a, 3), "note": note})
    R += b - a
    if sid == "A12":
        t = segs[-1]["R_in"] + (HI_END - a) + 0.40   # Japanese starts 0.4 s after "old man"
        for f, tag in TOON[2:]:
            d = len(toon_audio[f]) / SR
            if tag == "EN2":
                t += GAP_PUNCH - GAP
            lines.append({"file": f, "tag": tag, "start": round(t, 3), "end": round(t + d, 3)})
            t += d + GAP
total = round(segs[-1]["R_out"], 3)
toon_end = round(segs[-1]["R_in"] + 0.15, 3)    # cartoon hidden once Ali is back

# --- Ali's words on the reel clock (Whisper word times, clipped to each segment) --------------------
for s in segs:
    words = json.load(open(f"cut/{s['take']}.json"))["words"]
    ws = []
    for w in words:
        if s["src_in"] - 0.05 <= w["start"] < s["src_out"] - 0.05:
            ws.append([w["word"].strip(), round(s["R_in"] + max(w["start"], s["src_in"]) - s["src_in"], 3),
                       round(s["R_in"] + min(w["end"], s["src_out"]) - s["src_in"], 3)])
    s["words"] = ws

# --- voice tracks on the reel clock ----------------------------------------------------------------
n = int((total + 0.5) * SR)
ali = np.zeros(n)
fade = int(0.012 * SR)
for s in segs:
    y = load(f"audio/{s['take']}.wav")[int(s["src_in"] * SR): int(s["src_out"] * SR)].copy()
    y[:fade] *= np.linspace(0, 1, fade); y[-fade:] *= np.linspace(1, 0, fade)
    i = int(s["R_in"] * SR)
    ali[i:i + len(y)] += y[: n - i]
toon = np.zeros(n)
for L in lines:
    y = toon_audio[L["file"]]
    i = int(L["start"] * SR)
    toon[i:i + len(y)] += y[: n - i]
os.makedirs("sound", exist_ok=True)
sf.write("sound/ali_raw.wav", ali, SR)
sf.write("sound/toon_voice.wav", toon, SR)

# cartoon's own clock (0 = TOON_START) for the mouth analysis and the scene build
os.makedirs("toon/hf/assets", exist_ok=True)
c0 = int(TOON_START * SR)
sf.write("toon/hf/assets/voice.wav", toon[c0:], SR)
toon_total = round(toon_end - TOON_START, 3)
json.dump({"total": toon_total, "lines": [{"id": L["file"], "tag": L["tag"], "start": round(L["start"] - TOON_START, 3),
                                         "end": round(L["end"] - TOON_START, 3)} for L in lines]},
          open("toon/timing.json", "w"), indent=1)

json.dump({"total": total, "toon_start": TOON_START, "toon_end": toon_end, "segs": segs, "toon_lines": lines},
          open("cut/timeline.json", "w"), indent=1, ensure_ascii=False)
print("total", total, "| cartoon", TOON_START, "->", toon_end)
for s in segs:
    print(f"{s['id']:4s} R {s['R_in']:6.2f}-{s['R_out']:6.2f}  {s['take']} {s['src_in']:6.2f}-{s['src_out']:6.2f}  " + " ".join(w[0] for w in s["words"]))
for L in lines:
    print(f"  toon {L['tag']:4s} R {L['start']:6.2f}-{L['end']:6.2f}")
