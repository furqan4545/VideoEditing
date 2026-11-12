"""Reel 15 soundtrack: Ali's RAW voice + the cinematic score (main_loud_hanZimmer.mp3, four sections cut on its own
bass notes and swells) + real recorded effects placed from the film's event list.

  ~/.local/share/earshot/.venv/bin/python sound/prep_sfx.py     (once: trims the effect recordings -> sound/sfx/cut/)
  ~/.local/share/earshot/.venv/bin/python sound/mix.py [--events sound/events.json]

Reads  cut/voice.wav, cut/timing.json, sound/cand/main_loud_hanZimmer.wav, sound/events.json ([{t, kind, note, dur}])
Writes sound/mix.wav (48 kHz stereo, -14 LUFS, true peak <= -2 dBFS), sound/stems/{voice,music,fx}.wav,
       sound/cues_placed.json, sound/music_cut.json

Rules (Ali): voice untouched (one overall gain); music bed -22 LUFS, ducked 11 dB under speech + 8 dB more in
0.8-4 kHz; every effect at ONE phone-weighted level 16 dB under the voice (camera moves 2 dB under that, the field hum
5, the strip's ring 6, risers 7); no dead air: the music runs from the first frame to the last, "silence" is a held,
filtered note; no sound twice in a row.
"""
import argparse, json, os, re
from collections import Counter
import numpy as np, soundfile as sf, scipy.signal as sg, pyloudnorm as pl
from scipy.ndimage import maximum_filter1d, minimum_filter1d

os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
ap = argparse.ArgumentParser()
ap.add_argument("--events", default="sound/events.json"); ap.add_argument("--out", default="sound/mix.wav")
ap.add_argument("--fx-below-voice", type=float, default=16.0); ap.add_argument("--music-lufs", type=float, default=-22.0)
ap.add_argument("--duck", type=float, default=11.0); ap.add_argument("--duck-mid", type=float, default=8.0)
ap.add_argument("--fx-mid-duck", type=float, default=6.0); ap.add_argument("--lufs", type=float, default=-14.0)
ap.add_argument("--ceil", type=float, default=-2.0)
A = ap.parse_args()
SR = 48000
TL = json.load(open("cut/timing.json")); DUR = TL["dur"]; N = int(round(DUR * SR))
P = {p["id"]: p for p in TL["pieces"]}
EV = json.load(open(A.events)); EV = EV["events"] if isinstance(EV, dict) else EV
EV = sorted([dict(t=float(e["t"]), kind=e["kind"], note=e.get("note", ""), dur=float(e.get("dur") or 0)) for e in EV], key=lambda e: e["t"])
meter = pl.Meter(SR); db = lambda g: 10 ** (g / 20)


def load(path):
    x, sr = sf.read(path, always_2d=True, dtype="float32")
    if sr != SR: x = sg.resample_poly(x, SR, sr, axis=0).astype(np.float32)
    return x if x.shape[1] == 2 else np.repeat(x[:, :1], 2, 1)


def kweight(x):
    y = x.copy()
    for f in meter._filters.values(): y = sg.lfilter(f.b, f.a, y, axis=0)
    return y


def short_loud(x, win=0.2, hop=0.05):
    x = x if x.ndim == 2 else x[:, None]; ms = (kweight(x) ** 2).sum(1); w, h = int(win * SR), int(hop * SR)
    if len(ms) < w + 1: ms = np.pad(ms, (0, w + 1 - len(ms)))
    c = np.concatenate([[0], np.cumsum(ms)]); idx = np.arange(0, max(1, len(ms) - w), h)
    return -0.691 + 10 * np.log10((c[idx + w] - c[idx]) / w + 1e-12), idx


def peak200(x): return float(short_loud(x)[0].max())
def loud400(x): return float(short_loud(x, 0.4, 0.05)[0].max())
PHONE_HP = sg.butter(4, 120 / (SR / 2), "high", output="sos")


def phone400(x):   # loudness as a phone speaker plays it (nothing under 120 Hz), over the sound's own length (0.1-0.4 s)
    y = sg.sosfilt(PHONE_HP, x, axis=0); env = np.abs(y).max(1); act = np.nonzero(env > env.max() * 10 ** (-30 / 20))[0]
    dur = (act[-1] - act[0]) / SR if len(act) else 0.4
    return float(short_loud(y, float(np.clip(dur, 0.1, 0.4)), 0.02)[0].max())


def tame_peaks(x, crest_max=12.0):   # spiky foley: hold the clip's own peaks to loudness + 12 dB
    lvl = phone400(x); thr = 10 ** ((lvl + crest_max) / 20); pk = maximum_filter1d(np.abs(x).max(1), size=int(0.002 * SR) * 2 + 1)
    if pk.max() <= thr: return x
    g = np.minimum(1.0, thr / np.maximum(pk, 1e-9)); g = sg.filtfilt(*sg.butter(1, 60 / (SR / 2)), g)
    return (x * np.minimum(1.0, g)[:, None]).astype(np.float32)


def phone_ready(x):   # sub-heavy hits: a clean 80-220 Hz harmonic layer so a phone hears the body
    pk = np.abs(x).max() + 1e-9; h = np.tanh(3.0 * x / pk) * pk
    h = sg.sosfiltfilt(sg.butter(4, [80 / (SR / 2), 220 / (SR / 2)], "band", output="sos"), h, axis=0)
    return (x + 0.5 * h).astype(np.float32)


def follower(x, att, rel, step=64):
    a, r = np.exp(-1 / (att * SR / step)), np.exp(-1 / (rel * SR / step)); d = x[::step]; o = np.empty_like(d); s = 0.0
    for i, val in enumerate(d):
        s = a * s + (1 - a) * val if val > s else r * s + (1 - r) * val; o[i] = s
    return np.repeat(o, step)[:len(x)]


def interp_keys(keys):   # [(t, dB), ...] -> per-sample curve
    t = np.arange(N) / SR; return np.interp(t, [k[0] for k in keys], [k[1] for k in keys]).astype(np.float32)


# ───────── voice: raw, one gain ─────────
v = load("cut/voice.wav").mean(1); v = np.pad(v, (0, max(0, N - len(v))))[:N]
v *= db(-17.0 - meter.integrated_loudness(v))
V2 = np.stack([v, v], 1)
vL4, _ = short_loud(sg.sosfilt(PHONE_HP, V2, axis=0), 0.4, 0.05); VTYP = float(np.median(vL4[vL4 > vL4.max() - 22]))
print(f"voice -17.0 LUFS mono ({meter.integrated_loudness(V2):.1f} as stereo); typical on a phone (400 ms) {VTYP:.1f}")
vact = (follower(np.abs(v), 0.005, 0.05) > db(-45)).astype(np.float32)
look = int(0.06 * SR); vahead = np.maximum(vact, np.concatenate([vact[look:], np.zeros(look, np.float32)]))
fol = follower(vahead, 0.02, 0.45)

# ───────── music: four sections of the song, joined on its own bass notes / swells ─────────
M = load("sound/cand/main_loud_hanZimmer.wav")
T_HOOK_LAND = next((e["t"] + e["dur"] for e in EV if e["kind"] == "dive" and e["t"] < 8), 6.5)       # the camera comes out at the gates
alarms = [e for e in EV if e["kind"] == "alarm"]
T_ALARM = next((e["t"] for e in alarms if "main" in e["note"].lower()), None) or next((e["t"] for e in alarms if 55 < e["t"] < 68), 61.3)
T_GATE, T_LISTEN0, T_LISTEN1 = P["L9a"]["t0"], P["L11a"]["t0"], P["L11b"]["t0"]
T_BEST0, T_BEST1, T_JEANS, T_LAST = P["L15"]["t0"], P["L15"]["t1"], P["L16a"]["t0"], P["L19"]["t0"]
T_INSIDE = P["L5a"]["t0"] - 0.17; T_DIVE = P["L4b"]["t0"]
for e in EV:                                                             # the picture may say exactly when it goes quiet
    if e["kind"] == "quiet" and abs(e["t"] - T_LISTEN0) < 2.5: T_LISTEN0, T_LISTEN1 = e["t"], e["t"] + (e["dur"] or (T_LISTEN1 - T_LISTEN0))
    if e["kind"] == "quiet" and abs(e["t"] - T_BEST0) < 2.5: T_BEST0, T_BEST1 = e["t"], e["t"] + (e["dur"] or (T_BEST1 - T_BEST0))
SONG_LAND, SONG_BREAK, SONG_BASS, SONG_END = 212.80, 166.10, 100.025, 468.75
# crossfade windows: S1->S2 while the camera dives into the tag, S2->S3 inside the thinnest moment, S3->S4 as Ali comes back
XA, XB, XC, XD = T_DIVE, T_INSIDE, T_BEST1 - 0.05, T_LAST - 0.50
SECT = [  # film in, film out, song time at film in, fade in, fade out, what
    (0.0, XB, SONG_LAND - T_HOOK_LAND, 0.05, XB - XA, "S1 organ cycle: its tail under the hook, its first chord lands as the camera comes out at the gates"),
    (XA, T_JEANS + 0.30, SONG_BREAK - T_ALARM + XA, XB - XA, 0.45, "S2 the quiet ticking section, its build from 'the gate fires', its wave breaking on the alarm, its decay"),
    (XC, T_LAST + 0.05, SONG_BASS - T_JEANS + XC, 0.33, 0.55, "S3 the ticking section again (earlier bars): a bass note on 'One man', the next on 'its alarm rang'"),
    (XD, DUR, SONG_END - T_LAST + XD, 0.55, 0.02, "S4 the song's last warm swell under the last line, then out"),
]
raw = np.zeros((N, 2), np.float32); cutlog = []
for f0, f1, s0, fi, fo, what in SECT:
    n = int(round((f1 - f0) * SR)); a0 = int(round(s0 * SR)); x = M[a0:a0 + n].copy(); assert a0 >= 0 and len(x) == n, (what, s0)
    a, b = max(1, int(fi * SR)), max(1, int(fo * SR))
    x[:a] *= np.sin(np.linspace(0, np.pi / 2, a))[:, None]; x[-b:] *= np.cos(np.linspace(0, np.pi / 2, b))[:, None]     # equal power
    # level each section to a common loudness first, so a crossfade is between equals
    x *= db(-20.0 - meter.integrated_loudness(x)) if n > SR else 1.0
    i0 = int(round(f0 * SR)); raw[i0:i0 + n] += x[:N - i0]
    cutlog.append(dict(film=[round(f0, 2), round(f1, 2)], song=[round(s0, 2), round(s0 + f1 - f0, 2)], fade_in=round(fi, 2), fade_out=round(fo, 2), what=what))
    print(f"music  film {f0:6.2f}-{f1:6.2f}  <- song {s0:7.2f}-{s0 + f1 - f0:7.2f}   {what}")
# contour: slow gain that puts the music's own 3 s loudness on the film's curve (dB around the bed level)
CONT = [(0, 0), (4.9, 0), (T_HOOK_LAND, 3), (T_HOOK_LAND + 1.6, 1), (T_DIVE, 0), (T_INSIDE, -5), (T_GATE - 0.3, -5), (T_GATE + 1.0, -1), (T_LISTEN0 - 0.2, 1),
        (T_LISTEN1 + 0.6, -2), (T_ALARM - 3.8, -1), (T_ALARM, 5), (T_ALARM + 1.6, 2), (T_BEST0 - 0.4, -4), (T_JEANS + 0.1, -3), (T_LAST - 0.3, -3), (T_LAST + 0.2, -1), (DUR, -1)]
cont = interp_keys(CONT)
L3, idx = short_loud(raw, 3.0, 0.25); Lc = np.interp(np.arange(N), idx + int(1.5 * SR), L3).astype(np.float32)
g = cont - Lc; g = np.clip(g, np.median(g) - 16, np.median(g) + 24)
k = int(1.2 * SR); g = np.convolve(np.pad(g, (k, k), mode="edge"), np.hanning(2 * k + 1) / np.hanning(2 * k + 1).sum(), "same")[k:-k]
mus = raw * db(g - np.median(g))[:, None]
# "silence" = the music thinned to a held, filtered note (never digital silence)
thin = np.zeros(N, np.float32)
for t0, t1, depth in [(T_LISTEN0, T_LISTEN1, 10.0), (T_BEST0 - 0.05, T_BEST1 - 0.12, 9.0)]:
    a_, b_, r = int(t0 * SR), int(t1 * SR), int(0.3 * SR); w = np.ones(b_ - a_ + 2 * r, np.float32); w[:r] = np.linspace(0, 1, r); w[-r:] = np.linspace(1, 0, r)
    s = max(0, a_ - r // 2); thin[s:s + len(w)] = np.maximum(thin[s:s + len(w)], (depth * w)[:N - s])
lp = sg.sosfiltfilt(sg.butter(2, 500 / (SR / 2), "low", output="sos"), mus, axis=0).astype(np.float32)
wet = np.clip(thin / 10.0, 0, 1)[:, None]; mus = (mus * (1 - wet) + lp * wet) * db(-thin)[:, None]
fo = int(0.8 * SR); mus[-fo:] *= (np.cos(np.linspace(0, np.pi / 2, fo)) ** 2)[:, None]
# duck under speech: all of it, and the speech band more
MSOS = sg.butter(3, [800 / (SR / 2), 4000 / (SR / 2)], "band", output="sos")
mus *= (1 - (1 - db(-A.duck)) * fol)[:, None]
mid = sg.sosfiltfilt(MSOS, mus, axis=0).astype(np.float32); mus = mus - mid + mid * (1 - (1 - db(-A.duck_mid)) * fol)[:, None]
mus *= db(A.music_lufs - meter.integrated_loudness(mus))

# ───────── effects ─────────
CUT = "sound/sfx/cut/"
WHIP = ["whip_ali1", "whip_wind", "whip_sweep", "whip_ali2"]; DIVE = ["dive_scifi", "dive_airy", "dive_heavy", "dive_epic"]; PULL = ["pull_deviant", "dive_airy"]
HIT = ["boom_sub", "boom_real", "hit_bz"]; TICK = ["tick_tape", "tick_gear", "tick_tiny", "tick_ali"]; PULSE = ["field_low_a", "field_low_b"]; RING = ["ring_spade", "ring_impact"]
SOFT = {"whip": -2.0, "dive": -2.0, "pullout": -2.0, "pulse": -5.0, "ring": -6.0, "riser": -7.0}
ANCH = {"whip": "peak", "dive": "peak", "pullout": "peak", "hit": "peak", "riser": "end"}
PRIO = {"alarm": 6, "hit": 5, "dive": 4, "pullout": 3, "whip": 2}
cnt = Counter(); cues = []; skipped = []


def pick(kind, e):
    note = e["note"].lower()
    if kind == "whip": return WHIP
    if kind == "dive": return DIVE
    if kind == "pullout": return PULL
    if kind == "hit": return HIT
    if kind == "alarm": return ["alarm_a6"] if ("main" in note or e["dur"] >= 1.2) else ["alarm_a4"]
    if kind in ("tick", "snap"): return TICK
    if kind == "pulse": return PULSE
    if kind == "ring": return RING
    if kind == "riser": return ["rev_glass"]
    if kind == "land":
        if "jacket" in note: return ["cloth_move29"]
        if "shoe" in note: return ["cloth_move24"]
        if "belt" in note or "buckle" in note: return ["clink_carabiner"]
        if "receipt" in note or "paper" in note: return ["paper_a4"]
        if "pin" in note: return ["tick_tiny"]
        return ["cloth_flip"]
    if kind == "reveal":
        if re.search(r"terminal|paid", note): return ["beep_button"]
        if re.search(r"card|page|headline|blog|calendar", note): return ["page_book", "page_ency"]
        if re.search(r"flap|cloth|denim|jeans", note): return ["cloth_flip"]
        if "key" in note: return ["keys_kawa"]
        if "receipt" in note: return ["paper_a4"]
    return None


last_cam, last_pulse, last_name = -9.0, -9.0, None
for e in EV:
    kind = e["kind"]; names = pick(kind, e)
    if kind == "quiet": continue
    if not names: skipped.append((e["t"], kind, e["note"], "no sound for this (stays silent)")); continue
    t = e["t"]
    if kind in ("whip", "dive", "pullout"):
        tc = t + e["dur"] * (0.5 if kind == "whip" else 0.55)                 # the swish peaks mid-move
        if tc - last_cam < 1.0 and kind == "whip": skipped.append((t, kind, e["note"], "too close to the last camera sound")); continue
        last_cam = tc; t = tc
    if kind == "pulse":
        if t - last_pulse < 4.0: skipped.append((t, kind, e["note"], "field hum already sounding")); continue
        last_pulse = t; t = t - 0.15
    name = names[cnt[kind] % len(names)]; cnt[kind] += 1
    if kind in ("whip", "dive", "pullout"):                                  # never the same swish twice in a row, whatever the kind of move
        if name == last_name: name = names[cnt[kind] % len(names)]; cnt[kind] += 1
        last_name = name
    cues.append(dict(t=t, ev_t=e["t"], kind=kind, name=name, note=e["note"]))
cues.sort(key=lambda c: c["t"]); keep = []
for c in cues:                                                               # two sounds on one moment: the more important one stays
    if keep and c["t"] - keep[-1]["t"] < 0.22 and not {c["kind"], keep[-1]["kind"]} == {"alarm", "hit"}:
        if PRIO.get(c["kind"], 1) > PRIO.get(keep[-1]["kind"], 1): skipped.append((keep[-1]["ev_t"], keep[-1]["kind"], keep[-1]["note"], "gave way to " + c["kind"])); keep[-1] = c
        else: skipped.append((c["ev_t"], c["kind"], c["note"], "gave way to " + keep[-1]["kind"]))
        continue
    keep.append(c)
cues = keep
TARGET = VTYP - A.fx_below_voice
print(f"effects: every one at {TARGET:.1f} LUFS on a phone (voice {VTYP:.1f} - {A.fx_below_voice:g}); camera -2, field hum -5, ring -6, riser -7")
fx = np.zeros((N, 2), np.float32); fx_alarm = np.zeros((N, 2), np.float32); placed = []; cache = {}
for c in cues:
    name = c["name"]
    if name not in cache: cache[name] = load(CUT + name + ".wav")
    x = cache[name].copy(); envx = sg.convolve(np.abs(x).max(1), np.ones(960) / 960, mode="same"); pk = int(np.argmax(envx))
    anchor = ANCH.get(c["kind"], "onset")
    start = c["t"] - (pk / SR if anchor == "peak" else (len(x) / SR - 0.05) if anchor == "end" else 0.0)
    if c["kind"] == "hit": start = c["t"] - min(pk / SR, 0.06)
    sub = loud400(x) - phone400(x)                                           # how much of the sound a phone cannot play
    if sub > 6:                                                               # a sub-heavy hit: take the excess out of the lows (they would only eat headroom), then add body a phone can hear
        cut = min(18.0, sub - 4.0); lo = sg.sosfiltfilt(sg.butter(2, 140 / (SR / 2), "low", output="sos"), x, axis=0).astype(np.float32)
        x = x - lo * (1 - db(-cut)); x = phone_ready(x)
    x = tame_peaks(x); lvl = phone400(x); gdb = min(26.0, TARGET - lvl) + SOFT.get(c["kind"], 0.0)
    xs = x * db(gdb); i0 = int(round(start * SR))
    if i0 < 0: xs = xs[-i0:]; i0 = 0
    n = min(len(xs), N - i0); (fx_alarm if c["kind"] == "alarm" else fx)[i0:i0 + n] += xs[:n]
    placed.append(dict(t=round(c["t"], 3), kind=c["kind"], sound=name, note=c["note"], start=round(start, 3), end=round(start + len(x) / SR, 3), gain_db=round(gdb, 1), level=round(lvl + gdb, 1)))
# under speech the effects give up some of their 0.8-4 kHz band so no swish sits on a consonant; the alarm (the story's own sound) gives up half as much
for buf, d in ((fx, A.fx_mid_duck), (fx_alarm, 0.0)):
    smid = sg.sosfiltfilt(MSOS, buf, axis=0).astype(np.float32); buf += smid * ((1 - (1 - db(-d)) * fol)[:, None] - 1)
fx = fx + fx_alarm
# dip the music under each effect only as far as needed (music >= 8 dB under the effect, at most 9 dB)
dip = np.zeros(N, np.float32)
for p in placed:
    span = (p["end"] - p["start"]) if p["kind"] == "alarm" else min(0.6, p["end"] - p["start"])     # the alarm keeps its room for all its beeps
    i0 = max(0, int(p["start"] * SR)); i1 = min(N, i0 + int(span * SR))
    if i1 - i0 < 2400: continue
    need = min(9.0, max(0.0, peak200(mus[i0:i1]) - (p["level"] - 8.0)))
    if need > 0.5:
        a_, b_ = max(0, i0 - int(0.02 * SR)), min(N, i1 + int(0.25 * SR)); w = np.ones(b_ - a_, np.float32)
        if i0 > a_: w[:i0 - a_] = np.linspace(0, 1, i0 - a_)
        w[i1 - a_:] = np.linspace(1, 0, b_ - i1); dip[a_:b_] = np.maximum(dip[a_:b_], need * w)
mus *= db(-dip)[:, None]

# ───────── master ─────────
pre = V2 + mus + fx; gm = A.lufs - meter.integrated_loudness(pre)


def limiter(x, ceil_db, rel=0.08, look=0.002):
    up = sg.resample_poly(x, 4, 1, axis=0); pk = np.abs(up).max(1).reshape(-1, 4).max(1)[:len(x)]
    need = np.minimum(1.0, db(ceil_db) / np.maximum(pk, 1e-9)); L = int(look * SR); gmin = minimum_filter1d(need, size=2 * L + 1)
    r = np.exp(-1 / (rel * SR)); out = np.empty_like(gmin); s = 1.0
    for i, val in enumerate(gmin):
        s = val if val < s else r * s + (1 - r) * val; out[i] = s
    return x * out[:, None], out


for _ in range(6):                                                          # land on the loudness target after the limiter, not before it
    mix, lg = limiter(pre * db(gm), A.ceil - 0.3); err = A.lufs - meter.integrated_loudness(mix)
    if abs(err) < 0.1: break
    gm += err
for p_ in placed:                                                            # what the limiter did under each effect
    a_, b_ = max(0, int(p_["start"] * SR)), min(N, int(p_["end"] * SR)); p_["limiter_db"] = round(float(-20 * np.log10(lg[a_:b_].min())), 1) if b_ > a_ else 0.0
os.makedirs("sound/stems", exist_ok=True)
sf.write(A.out, mix, SR, subtype="PCM_24")
for nm, y in (("voice", V2), ("music", mus), ("fx", fx)): sf.write(f"sound/stems/{nm}.wav", y * db(gm), SR, subtype="FLOAT")
json.dump(dict(target_phone_lufs=round(TARGET, 1), master_gain_db=round(gm, 1), cues=placed, skipped=[dict(t=s[0], kind=s[1], note=s[2], why=s[3]) for s in skipped]), open("sound/cues_placed.json", "w"), indent=1)
json.dump(dict(song="main_loud_hanZimmer.mp3 (Ali's own folder)", t_hook_land=T_HOOK_LAND, t_alarm=T_ALARM, sections=cutlog, thin=[[round(T_LISTEN0, 2), round(T_LISTEN1, 2)], [round(T_BEST0, 2), round(T_BEST1, 2)]], contour=CONT), open("sound/music_cut.json", "w"), indent=1)
up = sg.resample_poly(mix, 4, 1, axis=0)
print(f"sounds used: {dict(Counter(p['sound'] for p in placed))}")
print(f"placed {len(placed)} cues, {len(skipped)} events left silent")
for p in placed: print(f"  {p['t']:6.2f} {p['kind']:8s} {p['sound']:18s} gain {p['gain_db']:+5.1f}  level {p['level']:6.1f}  limiter {p['limiter_db']:4.1f}  {p['note'][:54]}")
m_under = meter.integrated_loudness(mus * db(gm)); f_l = meter.integrated_loudness(np.pad(fx * db(gm), ((0, 0), (0, 0)))) if np.abs(fx).max() > 0 else -99
print(f"master: {meter.integrated_loudness(mix):.1f} LUFS, true peak {20 * np.log10(np.abs(up).max() + 1e-9):.2f} dBFS, limiter max reduction {-20 * np.log10(lg.min()):.1f} dB "
      f"| stems: voice {meter.integrated_loudness(V2 * db(gm)):.1f}, music {m_under:.1f}, fx {f_l:.1f} LUFS | master gain {gm:+.1f} dB")
