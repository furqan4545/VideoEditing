"""The soundtrack. Voice: Ali's RAW recording (cut/voice_raw.wav from cut/pauses.py: atempo 1.10, one plain gain per line).
Music: one track (sound/music.wav), ducked under speech, at least 15 LU under the voice (Ali's rule: voice up, music low).
  --drop ID --bar SONG_S: the song's bar line at SONG_S lands on piece ID's first word, with a breath of music silence before it
  --room ID: 3 dB more room for one line (e.g. the comment keyword)
Effects: cinematic only, few and soft, all at one level about 11 dB under the voice as a phone hears it. Picked by hand
in sound/cues.py (no pen / marker strokes, no pops, no dings).
Effects: cinematic only, few and soft, about 11 dB under the voice as a phone hears it (camera moves 2 dB lower,
risers 7 dB lower). No pops, no whistles, no toy drums.

Run:  uv run -q --with numpy --with soundfile --with scipy --with pyloudnorm python sound/mix.py [--music FILE --at SEC]
Writes sound/mix.wav, sound/stems/{voice,music,sfx}.wav, sound/cues_placed.json.
"""
import json, os, glob, argparse, subprocess, tempfile
from collections import Counter
import numpy as np, soundfile as sf, scipy.signal as sg, pyloudnorm as pl
from scipy.ndimage import maximum_filter1d, minimum_filter1d

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
SR = 48000
ap = argparse.ArgumentParser()
ap.add_argument("--music", default="sound/music.wav")
ap.add_argument("--at", type=float, default=None)           # where in the song the reel starts (default: from --drop/--bar, else 0)
ap.add_argument("--drop", default=None); ap.add_argument("--bar", type=float, default=None); ap.add_argument("--room", default=None)
ap.add_argument("--fx-below-voice", type=float, default=11.0)
ap.add_argument("--music-lufs", type=float, default=-33.0)
ap.add_argument("--duck", type=float, default=12.0)
ap.add_argument("--lufs", type=float, default=-14.0)
ap.add_argument("--fx-mid-duck", type=float, default=6.0)
ap.add_argument("--out", default="sound/mix.wav")
A = ap.parse_args()

EV = json.load(open("sound/events.json"))
TL = json.load(open("cut/timing2.json"))   # the new clock (0.2 s after every sentence)
TOTAL = TL["dur"]; N = int(TOTAL * SR)
meter = pl.Meter(SR)
db = lambda g: 10 ** (g / 20)
CLOUD = os.path.expanduser("~/Music/SFX/cloud/sounds/")


def load(path, mono=False):
    if not path.lower().endswith((".wav", ".flac", ".ogg")):
        with tempfile.TemporaryDirectory() as td:
            o = f"{td}/a.wav"; subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", path, "-ar", str(SR), "-c:a", "pcm_f32le", o], check=True)
            x, sr = sf.read(o, always_2d=True)
    else: x, sr = sf.read(path, always_2d=True)
    x = x.astype(np.float32)
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


def phone400(x):   # loudness as a phone speaker plays it, over the sound's own length (0.1-0.4 s)
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


# ───────── voice: raw ─────────
v = load("cut/voice_raw.wav", mono=True); v = np.pad(v, (0, max(0, N - len(v))))[:N]
v *= db(-17.0 - meter.integrated_loudness(v))
vL4, _ = short_loud(sg.sosfilt(PHONE_HP, v), win=0.4, hop=0.05); VTYP4 = float(np.median(vL4[vL4 > vL4.max() - 22]))
VI = meter.integrated_loudness(v)
print(f"voice {VI:.1f} LUFS, typical (phone, 400 ms) {VTYP4:.1f}")
vact = (follower(np.abs(v), 0.005, 0.05) > db(-42)).astype(np.float32)
look = int(0.06 * SR); vact_ahead = np.maximum(vact, np.concatenate([vact[look:], np.zeros(look, np.float32)]))
fol = follower(vact_ahead, 0.02, 0.45)

# ───────── music ─────────
M = load(A.music)
SEGS = {x["id"]: x for x in TL["segs"]}; T_REVEAL = SEGS[A.drop]["t0"] + 0.06 if A.drop else None
if A.at is None: A.at = (A.bar - T_REVEAL) if (A.bar is not None and T_REVEAL is not None) else 0.0
print(f"music starts at {A.at:.3f} s of the song")
i0 = int(A.at * SR); mus = M[i0:i0 + N].copy(); mus = np.pad(mus, ((0, max(0, N - len(mus))), (0, 0)))
fi, fo = int(0.5 * SR), int(1.4 * SR); mus[:fi] *= np.linspace(0, 1, fi)[:, None]; mus[-fo:] *= (np.linspace(1, 0, fo)[:, None]) ** 1.5
# the drop: silence for a breath before the --drop line, the music comes back on its first word
if T_REVEAL is not None:
    tt = np.arange(N) / SR; gate = np.clip((T_REVEAL - 0.42 - tt) / 0.06, 0, 1) + np.clip((tt - (T_REVEAL - 0.01)) / 0.012, 0, 1)
    mus *= np.clip(gate, 0, 1)[:, None]
MSOS = sg.butter(3, [800 / (SR / 2), 4000 / (SR / 2)], "band", output="sos")
mus *= (1 - (1 - db(-A.duck)) * fol)[:, None]
mid = sg.sosfiltfilt(MSOS, mus, axis=0).astype(np.float32)
mus = mus - mid + mid * (1 - (1 - db(-8.0)) * fol)[:, None]
mus *= db(A.music_lufs - meter.integrated_loudness(mus))
# --room: 3 dB more room for one line (e.g. the comment keyword), from just before it to the end
if A.room:
    rr_ = SEGS[A.room]; tt_ = np.arange(N) / SR
    mus *= db(-3.0 * np.clip((tt_ - (rr_["t0"] - 0.4)) / 0.4, 0, 1))[:, None]

# ───────── effects: cinematic only ─────────
def F(pattern):
    hits = sorted(glob.glob(CLOUD + pattern)); assert hits, pattern; return hits[0]

S = dict(
    boom_sub=F("ali-own/cinematic-and-ui/submority-boom*.mp3"), boom_real=F("ali-own/cinematic-and-ui/soundreality-boom*.mp3"),
    drop=F("sonniss-gdc-2026/344 Audio - Bass Drops & Downers Vol. 1/DSGNBass_Bass Drop & Downer Fast 16*"),
    hit_bz=F("sonniss-gdc-2024/BluezoneCorp - Modern Cinematic Impact/Bluezone_BC0294_modern_cinematic_impact_022*"),
    hit_bzboom=F("sonniss-gdc-2024/BluezoneCorp - Modern Cinematic Impact/Bluezone_BC0294_modern_cinematic_impact_boom_003*"),
    w_airy=F("sonniss-gdc-2024/Rescopic Sound - Distinct Whooshes/WHSH_Airy-Whoosh Wind Gust 11*"),
    w_scifi=F("sonniss-gdc-2024/Rescopic Sound - Distinct Whooshes/WHSH_Pure SciFi-Whoosh Fast 03*"),
    w_wind=F("sonniss-gdc-2026/344 Audio - Elemental Palette Designed Vol. 1/WINDDsgn_Wind, Rush, Whoosh, Long x5 01*"),
    w_ali1=F("ali-own/cinematic-and-ui/woosh_1*.mp3"), w_ali2=F("ali-own/cinematic-and-ui/woosh_2*.mp3"),
    w_epic=F("ali-own/cinematic-and-ui/dragon-studio-epic-whoosh*.mp3"),
    w_heavy=F("sonniss-gdc-2024/Mechanical Wave - Cinematic Feel/WHSH_Sci-Fi Heavy Whoosh_MWSFX_CF 29*"),
    click=F("ali-own/cinematic-and-ui/click.mp3"), typing=F("ali-own/cinematic-and-ui/typing.mp3"),
    crumple=F("sonniss-gdc-2024/Mechanical Wave - Cardboard and Paper/PAPRHndl_Paper Sheet Crumple_ 04*"),
    page=F("sonniss-gdc-2026/Cinematic Sound Design - Paper Foley/Encyclopedia Glossy Page Turn Muted*"),
    paper_swipe=F("earshot-sfx/swipe/paper.wav"),
)
MAXLEN = {"boom_sub": 3.2, "boom_real": 2.8, "drop": 2.6, "hit_bz": 1.6, "hit_bzboom": 2.2, "w_epic": 1.6, "w_heavy": 1.7, "w_airy": 1.4, "w_scifi": 1.3, "w_wind": 1.05,
          "click": 0.35, "typing": 1.0, "crumple": 0.9, "page": 0.55, "paper_swipe": 0.7}
HP = {"w_epic": 100, "w_heavy": 90}
LEAD = {"hit_bz": 0.30, "hit_bzboom": 0.30}; TAIL = {"w_epic": 0.7, "w_heavy": 0.6}; TAIL_W = 0.5
SOFT = {"w_epic": -2.0, "w_heavy": -3.0, "w_airy": -2.0, "w_scifi": -2.0, "w_wind": -2.0, "w_ali1": -2.0, "w_ali2": -2.0, "click": -3.0, "typing": -5.0,
        "hit_bz": -1.0, "hit_bzboom": -1.0, "crumple": -3.0, "page": -4.0, "paper_swipe": -4.0}
WHOOSH = ["w_airy", "w_ali1", "w_scifi", "w_ali2"]; HITS = ["hit_bz", "hit_bzboom"]; PAPER = ["paper_swipe", "page"]
SKIP_KINDS = {"marker", "pen", "footsteps", "pop"}          # Ali: no pen or marker strokes, no pops
cues, wk, hk, pk_ = [], 0, 0, 0
for e in EV["events"]:
    t, kind, note = e["t"], e["kind"], e.get("note", "")
    if kind in SKIP_KINDS or t < 0 or t > TOTAL - 0.2: continue
    if kind == "whoosh": cues.append((t, WHOOSH[wk % len(WHOOSH)], "peak", note, 0)); wk += 1
    elif kind == "whoosh_low": cues.append((t, "w_heavy", "peak", note, 0))
    elif kind == "whoosh_big": cues.append((t, "w_epic", "peak", note, 0))
    elif kind == "hit": cues.append((t, HITS[hk % len(HITS)], "peak", note, 0)); hk += 1
    elif kind == "boom": cues.append((t, "boom_sub" if t < 0.1 else "boom_real" if "reveal" in note.lower() else "drop", "onset" if t < 0.1 else "peak", note, 0))
    elif kind == "riser": cues.append((t + 0.45, "w_wind", "peak", note, -5.0))
    elif kind in ("tick", "click"): cues.append((t, "click", "onset", note, 0))
    elif kind == "keys": cues.append((t, "typing", "onset", note, 0))
    elif kind == "paper":
        if "crumple" in note.lower(): cues.append((t, "crumple", "onset", note, 0))
        else: cues.append((t, PAPER[pk_ % len(PAPER)], "onset", note, 0)); pk_ += 1
cues.sort(key=lambda q: q[0])
PRIO = lambda n: 3 if n.startswith(("boom", "drop")) else 2 if n.startswith(("hit", "crumple")) else 1
keep = []
for q in cues:
    if keep and q[0] - keep[-1][0] < 0.22 and not {q[1], keep[-1][1]} & {"typing", "clock", "click"}:
        if PRIO(q[1]) > PRIO(keep[-1][1]): keep[-1] = q
        continue
    keep.append(q)
cues = keep
print("sounds used:", dict(Counter(q[1] for q in cues)))
TARGET = VTYP4 - A.fx_below_voice
print(f"every effect at {TARGET:.1f} LUFS (phone, own length)")
sfx = np.zeros((N, 2), np.float32); placed, cache = [], {}
for t, name, anchor, what, extra in cues:
    if name not in cache:
        y0 = load(S[name]); amp0 = np.abs(y0).max(1); on0 = int(np.argmax(amp0 > amp0.max() * 10 ** (-38 / 20)))      # drop the silent lead
        cache[name] = y0[max(0, on0 - 96):]
    src = cache[name]
    if name == "typing": src = src[:int(0.40 * SR)]
    x = src[:int(MAXLEN.get(name, 3.0) * SR)].copy()
    fl = min(len(x), int(0.25 * SR)); x[-fl:] *= (np.linspace(1, 0, fl)[:, None]) ** 2
    pk0 = int(np.argmax(sg.convolve(np.abs(x).max(1), np.ones(960) / 960, mode="same")))
    if name in LEAD and pk0 > int(LEAD[name] * SR):
        x = x[pk0 - int(LEAD[name] * SR):].copy(); fi_ = int(0.12 * SR); x[:fi_] *= np.linspace(0, 1, fi_)[:, None] ** 2
        pk0 = int(LEAD[name] * SR)
    tl = TAIL.get(name, TAIL_W if name.startswith("w_") else None)
    if tl and len(x) > pk0 + int(tl * SR):
        x = x[:pk0 + int(tl * SR)].copy(); fo_ = int(min(0.3, tl * 0.7) * SR); x[-fo_:] *= np.linspace(1, 0, fo_)[:, None] ** 2
    if name in HP: x = sg.lfilter(*sg.butter(2, HP[name] / (SR / 2), "high"), x, axis=0).astype(np.float32)
    if name.startswith(("hit", "boom", "drop")):          # sub-heavy: 40 Hz high-pass and 6 dB less under 110 Hz, so the limiter is not hit by sub a phone cannot play
        x = sg.sosfilt(sg.butter(2, 40 / (SR / 2), "high", output="sos"), x, axis=0)
        x = (x - 0.5 * sg.sosfiltfilt(sg.butter(2, 110 / (SR / 2), "low", output="sos"), x, axis=0)).astype(np.float32)
    envx = np.abs(x).max(1); pk = int(np.argmax(sg.convolve(envx, np.ones(960) / 960, mode="same")))
    start = t - (pk / SR if anchor == "peak" else 0)
    if loud400(x) - phone400(x) > 6: x = phone_ready(x)
    x = tame_peaks(x)
    lvl = phone400(x); g = min(18.0, TARGET - lvl) + SOFT.get(name, 0.0) + extra
    i0 = int(round(start * SR)); xs = x * db(g)
    if i0 < 0: xs = xs[-i0:]; i0 = 0
    n = min(len(xs), N - i0); sfx[i0:i0 + n] += xs[:n]
    placed.append({"t": round(t, 3), "sound": name, "what": what, "file": S[name].replace(CLOUD, ""), "start": round(start, 3),
                   "peak_t": round(start + pk / SR, 3), "gain_db": round(g, 1), "level": round(lvl + g, 1)})
smid = sg.sosfiltfilt(MSOS, sfx, axis=0).astype(np.float32)
sfx = sfx - smid + smid * (1 - (1 - db(-A.fx_mid_duck)) * fol)[:, None]
# dip the music under each effect only as far as needed (music >= 6 dB under the effect, at most 6 dB down)
dip = np.zeros(N, np.float32)
for p in placed:
    i0 = max(0, int(p["start"] * SR)); i1 = min(N, i0 + int(0.5 * SR))
    if i1 - i0 < 2400: continue
    mL = peak200(mus[i0:i1]); need = min(6.0, max(0, mL - (p["level"] - 6.0)))
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
g2 = A.lufs - meter.integrated_loudness(mix)
if abs(g2) > 0.15: mix, lg2 = limiter(mix * db(g2)); lg = np.minimum(lg, lg2); gm += g2
os.makedirs("sound/stems", exist_ok=True)
sf.write(A.out, mix, SR, subtype="PCM_24")
sf.write("sound/stems/voice.wav", v * db(gm), SR, subtype="PCM_24"); sf.write("sound/stems/music.wav", mus * db(gm), SR, subtype="PCM_24")
sf.write("sound/stems/sfx.wav", sfx * db(gm), SR, subtype="PCM_24")
for p in placed:
    i = int(p["peak_t"] * SR); p["limiter_db"] = round(float(20 * np.log10(lg[max(0, i - 2400):i + 2400].min())), 1)
json.dump(placed, open("sound/cues_placed.json", "w"), indent=1)
print(f"{'t':>6}  {'sound':10s} level  limiter  what")
for p in placed:
    print(f"{p['t']:6.2f}  {p['sound']:10s} {p['level'] + gm:5.1f}  {p['limiter_db']:5.1f}   {p['what']}")
ml = meter.integrated_loudness(mus * db(gm)); vl = meter.integrated_loudness(v * db(gm))
print(f"{len(placed)} effects · mix {meter.integrated_loudness(mix):.1f} LUFS · peak {20 * np.log10(np.abs(mix).max()):.1f} dBFS · voice {vl:.1f} · music {ml:.1f} (voice {vl - ml:+.1f} LU over the music)")
