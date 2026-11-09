"""Reel 3 soundtrack: Ali + the old man, "Loser" (instrumental) cut into five pieces with silences that build up to
drops, and one-level real sound effects on every visual event.

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


# ───────── voice: every take at one level, the old man at the same level ─────────
ali = load("sound/ali_raw.wav", mono=True); ali = np.pad(ali, (0, max(0, N - len(ali))))[:N]
ali = sg.sosfilt(sg.butter(2, 85 / (SR / 2), "high", output="sos"), ali).astype(np.float32)
gains = np.zeros(N, np.float32)
for sid, a, b in E["segs"]:
    i0, i1 = int(a * SR), min(N, int(b * SR)); seg = ali[i0:i1]
    L, _ = short_loud(seg); sp = L[L > L.max() - 18]
    g = -20.0 - float(np.median(sp))
    gains[i0:i1] = g
gains = sg.filtfilt(*sg.butter(1, 30 / (SR / 2)), gains)        # ~10 ms ramps between takes
ali = ali * db(gains)
toon = load("sound/toon_voice.wav", mono=True); toon = np.pad(toon, (0, max(0, N - len(toon))))[:N]
L, _ = short_loud(toon); toon *= db(-20.0 - float(np.median(L[L > L.max() - 18])))
v = ali + toon
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

# voice activity for the duck (from the voice itself)
vact = (follower(np.abs(v), 0.005, 0.05) > db(-42)).astype(np.float32)

# ───────── music: five pieces; silence before every drop ─────────
M = load("sound/music_src.wav")
lines = {l["tag"]: l for l in E["lines"]}
segs = {s[0]: (s[1], s[2]) for s in E["segs"]}
punch_start = lines["EN2"]["start"]
thumbs_toon = punch_start + (18.15 - 16.763)          # the cartoon's two thumbs come up ("fine shyt")
m5_in = thumbs_toon
m5_src = 218.569 - (E["thumbs_up_ali"] - m5_in)        # the song's own stop lands as Ali's thumb comes up
PIECES = [  # reel in, reel out, source in, fade in, fade out, gain dB (relative)
    (0.0, E["hook_watch"], 0.70, 0.02, 0.06, +4.0),                 # hook: the soft intro; cut dead before "Watch."
    (E["T1"]["in0"] + 0.02, segs["A9"][0] - 0.10, 86.285, 0.004, 0.06, 0.0),   # DROP into the cartoon (bass returns)
    (segs["A10"][0], segs["A12"][0] - 0.04, 122.416, 0.004, 0.06, 0.0),        # DROP: "I gave Claude the TV remote"
    (E["T3"]["in0"] + 0.03, punch_start - 0.32, 193.236, 0.004, 0.06, 0.0),     # DROP: cartoon part 2 (after the song's break)
    (m5_in, TOTAL, m5_src, 0.004, 0.35, 0.0),                       # back on "fine shyt" to the song's ending
]
body = M[int(86.3 * SR):int(110 * SR)]
gM = (VI + A.music_over) - meter.integrated_loudness(body)
mus = np.zeros((N, 2), np.float32)
for r0, r1, s0, fi, fo, g in PIECES:
    n = int((r1 - r0) * SR); x = M[int(s0 * SR):int(s0 * SR) + n].copy()
    a, b = int(fi * SR), int(fo * SR)
    x[:a] *= np.linspace(0, 1, a)[:, None]; x[-b:] *= np.linspace(1, 0, b)[:, None] ** 2
    i0 = int(r0 * SR); mus[i0:i0 + len(x)] += x * db(gM + g)
    print(f"music  R {r0:6.2f}-{r1:6.2f}  <- song {s0:7.3f}-{s0 + r1 - r0:7.3f}")
look = int(0.06 * SR); vact_ahead = np.maximum(vact, np.concatenate([vact[look:], np.zeros(look, np.float32)]))   # duck 60 ms before each word
duck = 1 - (1 - db(-A.duck)) * follower(vact_ahead, 0.02, 0.45)
mus *= duck[:, None]
# the song's vocal chops sit where the words are: under speech, its 0.8-4 kHz band drops another 9 dB
MSOS = sg.butter(3, [800 / (SR / 2), 4000 / (SR / 2)], "band", output="sos")
mid = sg.sosfiltfilt(MSOS, mus, axis=0).astype(np.float32)
mus = mus - mid + mid * (1 - (1 - db(-9.0)) * follower(vact_ahead, 0.02, 0.45))[:, None]

# ───────── effects ─────────
def F(pattern):
    hits = sorted(glob.glob(CLOUD + pattern))
    assert hits, pattern
    return hits[0]


S = dict(
    boom_sub=F("ali-own/cinematic-and-ui/submority-boom*"), boom_real=F("ali-own/cinematic-and-ui/soundreality-boom*"),
    boom_trailer=F("sonniss-gdc-2026/Federico Soler - Effective Trailer Booms Vol. 2/EffectiveTrailer_Booms_Vol2_075.wav"),
    vine=F("ali-own/ishowspeed-memes/16 - Vine Boom*"), heartbeat=F("ali-own/cinematic-and-ui/lenspulse*"),
    w_epic=F("ali-own/cinematic-and-ui/dragon-studio-epic-whoosh*"), w_scifi=F("sonniss-gdc-2024/Rescopic Sound - Distinct Whooshes/WHSH_Pure SciFi-Whoosh Fast 03*"),
    w_iphone=F("ali-own/cinematic-and-ui/iphone-message-swoosh*"), w_ali1=F("ali-own/cinematic-and-ui/woosh_1*"), w_ali2=F("ali-own/cinematic-and-ui/woosh_2*"),
    w_broom=F("sound-effects-cc0/transition/fs-816262*"), w_kit=F("sound-effects-cc0/kit/whoosh.ogg"), w_swoosh=F("sound-effects-cc0/transition/fs-786514*"),
    w_cloth=F("sonniss-gdc-2026/Epic Stock Media - Fantasy Game 2*/CLOTHFlp_Action Inventory Open Flip Cloth Canvas Bag Slide Light 02*"),
    w_wind=F("sonniss-gdc-2026/344 Audio - Elemental Palette Designed Vol. 1/WINDDsgn_Wind, Rush, Whoosh, Long x5 01*"),
    w_830=F("sound-effects-cc0/whoosh/fs830856.ogg"), w_chop=F("sound-effects-cc0/whoosh/fs-127197*"), w_810=F("sound-effects-cc0/whoosh/fs810485.ogg"),
    pop_in=F("sound-effects-cc0/pop/fs-824189*"), pop_mouth=F("sound-effects-cc0/pop/fs-258269*"), pop_kit=F("sound-effects-cc0/kit/pop.ogg"),
    pop_hand=F("sonniss-gdc-2024/Rogue Waves - Kawaii UI/UIClick_Hand Pop UI Diminished 1*"), pop_syr=F("sonniss-gdc-2024/Rogue Waves - Kawaii UI/TOONPop_Syringe Pop 4*"),
    mouse=F("sound-effects-cc0/click/fs788933.ogg"), remote=F("sonniss-gdc-2026/Epic Stock Media - Board Game*/UIClick_UI Button Analog Vintage Double Click*"),
    typing=F("sound-effects-cc0/typing/fs-447909*"), counter=F("sonniss-gdc-2024/CB Sounddesign - Activation 2/UIData_Counter mid 54*"),
    riser=F("sound-effects-cc0/riser/fs-685256*"),
)
LOW, TEXTURE, FELT = -7.0, -8.0, -12.0
MAXLEN = {"boom_sub": 3.2, "boom_real": 2.8, "boom_trailer": 2.6, "vine": 2.2, "heartbeat": 3.3, "typing": 2.2, "counter": 0.9, "w_wind": 1.0, "w_epic": 1.6, "w_iphone": 1.0}
HP = {"w_wind": 120, "w_epic": 100, "riser": 60}
cues = []   # (time, sound, anchor, extra dB, what)
c = cues.append
c((0.0, "heartbeat", "start", FELT, "felt heartbeat under the hook"))
c((E["T1"]["in0"] - 0.02, "w_epic", "peak", 0, "T1 zoom into the palm"))
c((E["T1"]["in0"] + 0.02, "boom_sub", "peak", 0, "DROP: the cartoon (submority boom)"))
c((E["T2"]["out1"] - 0.06, "w_scifi", "peak", 0, "T2 zoom through the finger"))
whip_snd = ["w_cloth", "w_830", "w_chop"]
for (t, d), snd in zip(E["whips"], whip_snd):
    c((t, snd, "peak", 0, "whip"))
panel_in = {"home": "w_ali1", "clone": "w_broom", "design": "w_kit", "langs": "w_swoosh", "claude": "w_810", "prompt": "w_ali2"}
for pid, a, b in E["panels"]:
    c((a + 0.1, panel_in[pid], "peak", 0, f"panel {pid} in"))
pops = ["pop_in", "pop_mouth", "pop_hand", "pop_kit", "pop_syr"]
k = 0
for cid, a, b in E["chips"]:
    if a <= 0.01 or cid in ("zero",): continue
    c((a + 0.06, pops[k % len(pops)], "peak", 0, f"chip {cid}")); k += 1
c((E["count"][0], "counter", "start", TEXTURE, "646 counting up"))
c((E["click_word"], "mouse", "peak", 0, "mouse click on 'click'"))
c((segs["A10"][0], "riser", "end", LOW, "riser in the silence, into the drop"))
c((segs["A10"][0] + 0.01, "boom_trailer", "peak", 0, "DROP: Claude"))
c((E["remote_word"], "remote", "peak", 0, "TV remote click"))
c((E["prompt"][0], "typing", "start", TEXTURE, "the prompt types"))
c((E["T3"]["out1"] - 0.04, "w_iphone", "peak", 0, "T3 zoom through the wave"))
c((E["T3"]["in0"] + 0.04, "boom_real", "peak", 0, "DROP: cartoon part 2 (soundreality boom)"))
for tag, snd in (("ES", "w_kit"), ("FR", "w_wind"), ("ZH", "w_ali1"), ("EN2", "w_broom")):
    c((lines[tag]["start"] - 0.25, snd, "peak", 0, f"cartoon switch to {tag}"))
c((thumbs_toon, "vine", "peak", 0, "'fine shyt' + two thumbs up (vine boom)"))
c((E["T4"]["out1"] - 0.04, "w_swoosh", "peak", 0, "T4 zoom through the thumbs"))
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
