"""Reel 4 soundtrack: Ali + the VoiceStudio demo voices, the Zimmer-style track cut into four pieces (dead silence
under the robotic demo, the swell under the cinematic one, a tension bed with hits on the step numbers, big hits at
the end), and one-level real sound effects on every visual event.

Run:  uv run -q --with numpy --with soundfile --with scipy --with pyloudnorm python sound/mix.py
Writes sound/mix.wav (+ hf/assets/mix.wav), sound/stems/{voice,music,sfx}.wav, sound/cues_placed.json.
Rules (memory): every effect at ONE level, 4 dB under the voice's typical loudness as a phone hears it (risers and
long textures lower); real recordings only; music loud between lines, ducked under speech, full silent before drops;
master -14 LUFS, peaks under -1.5 dBFS.
"""
import json, os, glob, argparse
from collections import Counter
import numpy as np, soundfile as sf, scipy.signal as sg, pyloudnorm as pl
from scipy.ndimage import maximum_filter1d, minimum_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
SR = 48000
ap = argparse.ArgumentParser()
ap.add_argument("--fx-below-voice", type=float, default=4.0)
ap.add_argument("--music-over", type=float, default=1.0)   # music between lines, relative to the voice
ap.add_argument("--duck", type=float, default=11.0)         # music under speech
ap.add_argument("--lufs", type=float, default=-14.0)
A = ap.parse_args()

E = json.load(open("cut/events.json"))
TL = json.load(open("cut/timeline.json"))
TOTAL = E["total"]; N = int(TOTAL * SR)
meter = pl.Meter(SR)
db = lambda g: 10 ** (g / 20)
CLOUD = os.path.expanduser("~/Music/SFX/cloud/sounds/")


def load(path, mono=False):
    x, sr = sf.read(path, always_2d=True); x = x.astype(np.float32)
    if sr != SR: x = sg.resample_poly(x, SR, sr, axis=0).astype(np.float32)
    if mono: return x.mean(1)
    return x if x.shape[1] == 2 else np.repeat(x[:, :1], 2, 1)


def kweight(x):
    y = x.copy()
    for f in meter._filters.values():
        y = f.apply_filter(y) if hasattr(f, "apply_filter") else sg.lfilter(f.b, f.a, y, axis=0)
    return y


def short_loud(x, win=0.2, hop=0.05):
    x = x if x.ndim == 2 else x[:, None]
    y = kweight(x); ms = (y ** 2).sum(1)
    w, h = int(win * SR), int(hop * SR)
    if len(ms) < w + 1: ms = np.pad(ms, (0, w + 1 - len(ms)))
    c = np.concatenate([[0], np.cumsum(ms)])
    idx = np.arange(0, max(1, len(ms) - w), h); v = (c[idx + w] - c[idx]) / w
    return -0.691 + 10 * np.log10(v + 1e-12), idx


def peak200(x): L, _ = short_loud(x); return float(L.max())
def loud400(x): L, _ = short_loud(x, win=0.4, hop=0.05); return float(L.max())


PHONE_HP = sg.butter(4, 120 / (SR / 2), "high", output="sos")


def phone400(x):   # loudness as a phone speaker plays it, measured over the sound's own length (0.1-0.4 s)
    x = x if x.ndim == 2 else x[:, None]; y = sg.sosfilt(PHONE_HP, x, axis=0)
    env = np.abs(y).max(1); act = np.nonzero(env > env.max() * 10 ** (-30 / 20))[0]
    dur = (act[-1] - act[0]) / SR if len(act) else 0.4
    L, _ = short_loud(y, win=float(np.clip(dur, 0.1, 0.4)), hop=0.02); return float(L.max())


def tame_peaks(x, crest_max=12.0):
    lvl = phone400(x); thr = 10 ** ((lvl + crest_max) / 20)
    pk = maximum_filter1d(np.abs(x).max(1), size=int(0.002 * SR) * 2 + 1)
    if pk.max() <= thr: return x
    g = np.minimum(1.0, thr / np.maximum(pk, 1e-9)); g = sg.filtfilt(*sg.butter(1, 60 / (SR / 2)), g)
    return (x * np.minimum(1.0, g)[:, None]).astype(np.float32)


def phone_ready(x):   # sub-heavy hits: add a clean 80-220 Hz harmonic layer so phones hear the body
    pk = np.abs(x).max() + 1e-9
    h = np.tanh(3.0 * x / pk) * pk; h = sg.sosfiltfilt(sg.butter(4, [80 / (SR / 2), 220 / (SR / 2)], "band", output="sos"), h, axis=0)
    return (x + 0.5 * h).astype(np.float32)


def follower(x, att, rel, step=64):
    a, r = np.exp(-1 / (att * SR / step)), np.exp(-1 / (rel * SR / step)); d = x[::step]; o = np.empty_like(d); s = 0.0
    for i, val in enumerate(d):
        s = a * s + (1 - a) * val if val > s else r * s + (1 - r) * val; o[i] = s
    return np.repeat(o, step)[:len(x)]



SEGS = {s["id"]: s for s in E["segs"]}
# ───────── voice: every take at one level, the demo voices at the same level ─────────
ali = load("sound/ali_raw.wav", mono=True); ali = np.pad(ali, (0, max(0, N - len(ali))))[:N]
ali = sg.sosfilt(sg.butter(2, 85 / (SR / 2), "high", output="sos"), ali).astype(np.float32)
demo = load("sound/demo_raw.wav", mono=True); demo = np.pad(demo, (0, max(0, N - len(demo))))[:N]
gains = np.zeros(N, np.float32)
for s in E["segs"]:
    i0, i1 = int(s["R_in"] * SR), min(N, int(s["R_out"] * SR)); seg = (ali if s["kind"] == "A" else demo)[i0:i1]
    L, _ = short_loud(seg); sp = L[L > L.max() - 18]
    gains[i0:i1] = -20.0 - float(np.median(sp))
gains = sg.filtfilt(*sg.butter(1, 30 / (SR / 2)), gains)        # ~10 ms ramps between pieces
v = (ali + demo) * db(gains)
# de-esser: when the band above 5 kHz gets within 12 dB of the whole voice (an 's'), pull that band down (max 8 dB)
HSOS = sg.butter(4, 5000 / (SR / 2), "high", output="sos")
hf = sg.sosfiltfilt(HSOS, v).astype(np.float32); lf = v - hf
ratio = 20 * np.log10((follower(np.abs(hf), 0.002, 0.05) + 1e-9) / (follower(np.abs(v), 0.002, 0.05) + 1e-9))
v = lf + hf * db(-np.clip(ratio + 12.0, 0, 8.0))
env = follower(np.abs(v), 0.008, 0.15)                          # gentle 3:1 above -26 dB
lev = 20 * np.log10(env + 1e-9); v = v * db(-np.maximum(0, lev - (-26)) * (1 - 1 / 3))
v *= db(-17.0 - meter.integrated_loudness(v))
vL4, _ = short_loud(sg.sosfilt(PHONE_HP, v), win=0.4, hop=0.05); VTYP4 = float(np.median(vL4[vL4 > vL4.max() - 22]))
VI = meter.integrated_loudness(v)
print(f"voice {VI:.1f} LUFS, typical (phone, 400 ms) {VTYP4:.1f}")
vact = (follower(np.abs(v), 0.005, 0.05) > db(-42)).astype(np.float32)

# ───────── music: four pieces of the Zimmer-style track ─────────
M = load("sound/music.wav")   # the song, made with: ffmpeg -i SONG.mp3 -ar 48000 sound/music.wav
G0, G1 = SEGS["GOOD"]["R_in"], SEGS["GOOD"]["R_out"]
p2_in = SEGS["H2"]["R_in"] - 0.25
p3_in = SEGS["HO"]["R_in"]
p4_in = SEGS["B2"]["R_in"] - 0.06
FREEZE0 = E["freeze"][0]
PIECES = [  # reel in, reel out, source in, fade in, fade out, level vs the voice (dB)
    (0.0, SEGS["H1"]["R_out"], 109.85, 0.01, 0.12, -5.0),                       # hook: tension, a low hit on the first word
    (p2_in, SEGS["HO"]["R_in"] + 0.12, 164.6 - (G0 - p2_in), 0.25, 0.30, +1.5),   # crescendo under "and start...", the swell lands on the cinematic take
    (p3_in, SEGS["EXC"]["R_in"] - 0.04, 130.0 - (SEGS["S1a"]["R_in"] - p3_in), 0.20, 0.06, -3.0),  # tension bed: its low hits land on "One", "Step two", "Three"
    (p4_in, TOTAL, 385.6 - (FREEZE0 - p4_in), 0.01, 0.35, 0.0),                 # the big hits; the biggest one on the clone freeze-frame
]
mus = np.zeros((N, 2), np.float32)
for r0, r1, s0, fi, fo, g in PIECES:
    n = int((r1 - r0) * SR); x = M[int(s0 * SR):int(s0 * SR) + n].copy()
    gx = (VI + A.music_over + g) - meter.integrated_loudness(x)
    a, b = int(fi * SR), int(fo * SR)
    x[:a] *= np.linspace(0, 1, a)[:, None]; x[-b:] *= np.linspace(1, 0, b)[:, None] ** 2
    i0 = int(r0 * SR); mus[i0:i0 + len(x)] += x * db(gx)
    print(f"music  R {r0:6.2f}-{r1:6.2f}  <- track {s0:7.2f}-{s0 + r1 - r0:7.2f}  gain {gx:+.1f} dB")
# duck under speech (60 ms ahead); the trailer voice rides the swell, so it ducks less
look = int(0.06 * SR); vact_ahead = np.maximum(vact, np.concatenate([vact[look:], np.zeros(look, np.float32)]))
depth = np.full(N, A.duck, np.float32); depth[int(G0 * SR):int(G1 * SR)] = 6.0
mdepth = np.full(N, 9.0, np.float32); mdepth[int(G0 * SR):int(G1 * SR)] = 4.0
fol = follower(vact_ahead, 0.02, 0.45)
mus *= (1 - (1 - db(-depth)) * fol)[:, None]
MSOS = sg.butter(3, [800 / (SR / 2), 4000 / (SR / 2)], "band", output="sos")
mid = sg.sosfiltfilt(MSOS, mus, axis=0).astype(np.float32)
mus = mus - mid + mid * (1 - (1 - db(-mdepth)) * fol)[:, None]

# ───────── effects ─────────
def F(pattern):
    hits = sorted(glob.glob(CLOUD + pattern))
    assert hits, pattern
    return hits[0]


S = dict(
    boom_sub=F("ali-own/cinematic-and-ui/submority-boom*"), boom_real=F("ali-own/cinematic-and-ui/soundreality-boom*"),
    w_epic=F("ali-own/cinematic-and-ui/dragon-studio-epic-whoosh*"), w_ali1=F("ali-own/cinematic-and-ui/woosh_1*"), w_ali2=F("ali-own/cinematic-and-ui/woosh_2*"),
    w_broom=F("sound-effects-cc0/transition/fs-816262*"), w_kit=F("sound-effects-cc0/kit/whoosh.ogg"), w_swoosh=F("sound-effects-cc0/transition/fs-786514*"),
    w_cloth=F("sonniss-gdc-2026/Epic Stock Media - Fantasy Game 2*/CLOTHFlp_Action Inventory Open Flip Cloth Canvas Bag Slide Light 02*"),
    w_830=F("sound-effects-cc0/whoosh/fs830856.ogg"), w_chop=F("sound-effects-cc0/whoosh/fs-127197*"), w_810=F("sound-effects-cc0/whoosh/fs810485.ogg"),
    pop_in=F("sound-effects-cc0/pop/fs-824189*"), pop_mouth=F("sound-effects-cc0/pop/fs-258269*"), pop_kit=F("sound-effects-cc0/kit/pop.ogg"),
    pop_hand=F("sonniss-gdc-2024/Rogue Waves - Kawaii UI/UIClick_Hand Pop UI Diminished 1*"), pop_syr=F("sonniss-gdc-2024/Rogue Waves - Kawaii UI/TOONPop_Syringe Pop 4*"),
    typing=F("sound-effects-cc0/typing/fs-447909*"), error=F("uisfx/studio/error.mp3"), correct=F("ali-own/ishowspeed-memes/09 - Correct Answer*"),
    impact=F("sound-effects-cc0/impact/kenney-impact-impactsoft-heavy-000.ogg"),
)
LOW, TEXTURE, FELT = -7.0, -8.0, -12.0
MAXLEN = {"boom_sub": 3.2, "boom_real": 2.8, "typing": 1.0, "w_epic": 1.6}
HP = {"w_epic": 100}
cues = []   # (time, sound, anchor, extra dB, what)
c = cues.append
panel_in = {"plain": "w_ali1", "trailer": "w_epic", "engines": "w_broom", "clone": "w_kit", "script": "w_swoosh", "excited": "w_810"}
for pid, a, b in E["panels"]:
    c((a + 0.12, panel_in[pid], "peak", 0, f"panel {pid} in"))
c((E["stamp_bad"] + 0.2, "error", "peak", 0, "✕ ROBOTIC stamp"))
c((E["panels"][0][2] - 0.12, "w_swoosh", "peak", 0, "robotic panel leaves: 'and start...'"))
c((E["everything"], "boom_sub", "peak", 0, "'everything.' (submority boom)"))
c((E["stamp_good"] + 0.2, "correct", "peak", 0, "✓ CINEMATIC stamp"))
for (t, d), snd in zip(E["whips"], ["w_chop", "w_cloth", "w_830", "w_ali2"]):
    c((t, snd, "peak", 0, "whip"))
for t in E["punches"]:
    c((t, "impact", "peak", 0, "punch-in"))
pops = ["pop_in", "pop_mouth", "pop_hand", "pop_kit", "pop_syr"]
k = 0
for cid, a, b in E["chips"]:
    if a <= 0.01 or cid in ("start2", "desc"): continue
    c((a + 0.06, pops[k % len(pops)], "peak", 0, f"card {cid}")); k += 1
c((E["vox"], "pop_hand", "peak", 0, "VoxCPM2 lights up"))
c((E["script"][0], "typing", "start", TEXTURE, "pause markers appear"))
c((E["bubble"] + 0.1, "pop_syr", "peak", 0, "'IT SAID EXCITED' bubble"))
c((FREEZE0, "boom_real", "peak", 0, "clone freeze-frame (soundreality boom)"))

cues.sort(key=lambda q: q[0])
print("sounds used:", dict(Counter(q[1] for q in cues)))

TARGET = VTYP4 - A.fx_below_voice
print(f"every effect at {TARGET:.1f} LUFS (phone, own length); risers {TARGET + LOW:.1f}, textures {TARGET + TEXTURE:.1f}")
sfx = np.zeros((N, 2), np.float32); placed, cache = [], {}
for t, name, anchor, extra, what in cues:
    if name not in cache: cache[name] = load(S[name])
    x = cache[name][:int(MAXLEN.get(name, 3.0) * SR)].copy()
    fl = int(0.04 * SR); x[-fl:] *= np.linspace(1, 0, fl)[:, None]
    if name in HP: x = sg.lfilter(*sg.butter(2, HP[name] / (SR / 2), "high"), x, axis=0).astype(np.float32)
    if name == "heartbeat": fo = int(1.2 * SR); x[-fo:] *= np.linspace(1, 0, fo)[:, None]
    envx = np.abs(x).max(1); pk = int(np.argmax(sg.convolve(envx, np.ones(960) / 960, mode="same")))
    start = t - (pk / SR if anchor == "peak" else len(x) / SR if anchor == "end" else 0)
    if loud400(x) - phone400(x) > 6: x = phone_ready(x)
    x = tame_peaks(x)
    lvl = phone400(x); g = min(18.0, TARGET - lvl) + extra
    i0 = int(round(start * SR)); xs = x * db(g)
    if i0 < 0: xs = xs[-i0:]; i0 = 0
    n = min(len(xs), N - i0); sfx[i0:i0 + n] += xs[:n]
    placed.append({"t": round(t, 3), "sound": name, "what": what, "file": S[name].replace(CLOUD, ""), "start": round(start, 3),
                   "peak_t": round(start + pk / SR, 3), "gain_db": round(g, 1), "level": round(lvl + g, 1)})

# dip the music under each effect only as far as needed (music >= 8 dB under the effect, at most 9 dB down)
dip = np.zeros(N, np.float32)
for p in placed:
    i0 = max(0, int(p["start"] * SR)); i1 = min(N, i0 + int(0.5 * SR))
    if i1 - i0 < 2400: continue
    mL = peak200(mus[i0:i1]); need = min(9.0, max(0, mL - (p["level"] - 8.0)))
    if need > 0.5:
        a, b = max(0, i0 - int(0.015 * SR)), min(N, i1 + int(0.22 * SR)); w = np.ones(b - a, np.float32)
        if i0 > a: w[:i0 - a] = np.linspace(0, 1, i0 - a)
        w[i1 - a:] = np.linspace(1, 0, b - i1)
        dip[a:b] = np.maximum(dip[a:b], need * w)
mus *= db(-dip)[:, None]

# ───────── master ─────────
mix = mus + sfx + v[:, None]
gm = A.lufs - meter.integrated_loudness(mix); mix *= db(gm)


def limiter(x, ceil_db=-2.2, rel=0.08, look=0.002):
    up = sg.resample_poly(x, 4, 1, axis=0); pk = np.abs(up).max(1).reshape(-1, 4).max(1)[:len(x)]
    need = np.minimum(1.0, db(ceil_db) / np.maximum(pk, 1e-9))
    L = int(look * SR); g = minimum_filter1d(need, size=2 * L + 1); r = np.exp(-1 / (rel * SR)); out = np.empty_like(g); s = 1.0
    for i in range(0, len(g), 2048):
        blk = g[i:i + 2048]; o = np.empty_like(blk)
        for j, val in enumerate(blk):
            s = val if val < s else r * s + (1 - r) * val; o[j] = s
        out[i:i + 2048] = o
    return x * out[:, None], out


mix, lg = limiter(mix)
os.makedirs("sound/stems", exist_ok=True)
sf.write("sound/mix.wav", mix, SR, subtype="PCM_24"); sf.write("hf/assets/mix.wav", mix, SR, subtype="PCM_24")
sf.write("sound/stems/voice.wav", v * db(gm), SR, subtype="PCM_24"); sf.write("sound/stems/music.wav", mus * db(gm), SR, subtype="PCM_24")
sf.write("sound/stems/sfx.wav", sfx * db(gm), SR, subtype="PCM_24")
for p in placed:
    i = int(p["peak_t"] * SR); p["limiter_db"] = round(float(20 * np.log10(lg[max(0, i - 2400):i + 2400].min())), 1)
json.dump(placed, open("sound/cues_placed.json", "w"), indent=1)
print(f"{'t':>6}  {'sound':12s} level  limiter  what")
for p in placed:
    print(f"{p['t']:6.2f}  {p['sound']:12s} {p['level'] + gm:5.1f}  {p['limiter_db']:5.1f}   {p['what']}")
print(f"{len(placed)} effects · mix {meter.integrated_loudness(mix):.1f} LUFS · peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS")
