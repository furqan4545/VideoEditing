"""Reel 33 soundtrack: the Dr.pimp voice (raw: one gain), a low music bed cut so its two drops land on the cut into the
board and on "called a skill", and real recorded effects placed from the film's own event list, all at one level.

  ~/.local/share/earshot/.venv/bin/python sound/mix.py
Reads  ../cut/voice.wav, film/timing.js, sound/events.json.  Writes sound/mix.wav (-14 LUFS, true peak <= -1.5 dB), sound/stems/*.wav, sound/cues_placed.json
"""
import json, os, subprocess, sys
from collections import Counter
import numpy as np, soundfile as sf, scipy.signal as sg, pyloudnorm as pl
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
SR = 48000; meter = pl.Meter(SR); db = lambda g: 10 ** (g / 20)
s = open("film/timing.js").read(); TIMING = json.loads(s[s.index("{"):s.rindex("}") + 1]); DUR = TIMING["dur"]; N = int(round(DUR * SR))
EV = json.load(open("sound/events.json"))
ALI = os.path.expanduser("~/Desktop/MY VIDEO EDITING STUFF/Ali_BG_MUSIC/"); CL = os.path.expanduser("~/Music/SFX/cloud/sounds/")
MUSIC = ALI + "Timeless (Instrumental).mp3"
FX_BELOW_VOICE, MUSIC_UNDER, QUIET_UNDER, TARGET, CEIL = 16.0, 16.0, 19.0, -14.0, -1.5      # effects and music, in dB / LU under the voice
F = {  # every effect is a real recording
 "woosh1": ALI + "woosh_1.mp3", "woosh2": ALI + "woosh_2.mp3", "dragon": ALI + "dragon-studio-epic-whoosh-478371.mp3", "trail": ALI + "whoosh_trailFollow.mp3",
 "click": ALI + "click.mp3", "enter": ALI + "enter_sound.mp3", "typing": ALI + "typing.mp3", "boomS": ALI + "submority-boom-geomorphism-cinematic-trailer-sound-effects-123876.mp3", "boomR": ALI + "soundreality-boom-128320.mp3",
 "kwhoosh": CL + "sound-effects-cc0/kit/whoosh.ogg", "broom": CL + "sound-effects-cc0/transition/fs-816262-broomstick-whoosh-3-quiet-okm1.ogg", "thud": CL + "sound-effects-cc0/kit/impact.ogg",
 "btn": CL + "sound-effects-cc0/pop/fs-467951-ui-button-click.ogg", "riser": CL + "sound-effects-cc0/riser/fs-685256-riser-sound-effect-short-wav.ogg",
 "box": CL + "sonniss-gdc-2024/Mechanical Wave - Cardboard and Paper/OBJPack_Big Cardboard Box Impact_ 02_MWSFX_CDAP.wav", "noisy": CL + "sonniss-gdc-2024/Doex Studio - Qantum UI/UI_Noisy_Impact_09.wav",
 "card": CL + "sonniss-gdc-2026/Epic Stock Media - Board Game - Sound Set Kit for Tabletop and Digital Games/PAPRHndl_Game Play Cards Dry Show Flip Toss Disgard Near 12_ESM_BG.wav",
 "dbl": CL + "sonniss-gdc-2026/Epic Stock Media - Board Game - Sound Set Kit for Tabletop and Digital Games/UIClick_UI Button Analog Vintage Double Click Neutral Dry Press 11_ESM_BG.wav",
 "latch": CL + "sonniss-gdc-2026/Epic Stock Media - HD Lock And Mechanism Sound Design Kit/MECHLtch_Click Deep Mechanism Latch Button Nearfield Thunk 02_ESM_HDLM.wav",
 "pop": CL + "sonniss-gdc-2024/Rogue Waves - Kawaii UI/UIClick_Hand Pop UI Diminished 1_RogueWaves_KawaiiUI.wav" }

def load(path, rate=1.0):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(int(SR / rate)), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
def kw(x):
    y = x.copy()
    for f in meter._filters.values(): y = sg.lfilter(f.b, f.a, y, axis=0)
    return y
PHONE = sg.butter(4, 150 / (SR / 2), "high", output="sos")
def short_max(x, win=0.2):                      # loudest 200 ms, K-weighted, as a phone speaker hears it (no sub)
    y = kw(sg.sosfilt(PHONE, x, axis=0)); ms = (y ** 2).sum(1); w = int(win * SR)
    if len(ms) < w + 1: ms = np.pad(ms, (0, w + 1 - len(ms)))
    c = np.concatenate([[0], np.cumsum(ms)]); return float(-0.691 + 10 * np.log10(((c[w:] - c[:-w]) / w).max() + 1e-12))
def full_max(x, win=0.2):                       # the same, full range: a sub-heavy boom must not run away on big speakers
    y = kw(x); ms = (y ** 2).sum(1); w = int(win * SR)
    if len(ms) < w + 1: ms = np.pad(ms, (0, w + 1 - len(ms)))
    c = np.concatenate([[0], np.cumsum(ms)]); return float(-0.691 + 10 * np.log10(((c[w:] - c[:-w]) / w).max() + 1e-12))
def env_peak(x): e = np.abs(x).max(1); k = int(0.02 * SR); return int(np.argmax(np.convolve(e, np.ones(k) / k, "same")))
def trim(x, thr=-45):
    e = np.abs(x).max(1); on = np.where(e > db(thr) * max(e.max(), 1e-9))[0]; return x[max(0, on[0] - 48):on[-1] + 480] if len(on) else x
def fades(x, a=0.004, b=0.03):
    x = x.copy(); na, nb = min(len(x) // 2, int(a * SR)), min(len(x) // 2, int(b * SR)); x[:na] *= np.linspace(0, 1, na)[:, None]; x[-nb:] *= np.linspace(1, 0, nb)[:, None]; return x

# ---------------------------------------------------------------- voice (raw)
v = load("../cut/voice.wav"); voice = np.zeros((N, 2), np.float32); voice[:min(N, len(v))] = v[:N]
v_lufs = meter.integrated_loudness(voice); v_short = short_max(voice, 0.4); MUSIC_LOUD, MUSIC_QUIET = v_lufs - MUSIC_UNDER, v_lufs - QUIET_UNDER

# ---------------------------------------------------------------- music: two drops, cut to the words
m = load(MUSIC); mono = m.mean(1); w = int(0.05 * SR)
rms = lambda a, b: 20 * np.log10(np.sqrt(np.mean(mono[int(a * SR):int(b * SR)] ** 2)) + 1e-9)
def onset(lo, hi, up=True):                      # the first 50 ms where the track gets loud (or quiet) in [lo, hi]
    for t in np.arange(lo, hi, 0.01):
        r = rms(t, t + 0.05)
        if (up and r > -13) or (not up and r < -17 and rms(t, t + 0.4) < -16): return float(t)
    return lo
d1, d2 = onset(76.6, 79.5), onset(110.5, 113.5); b1 = onset(74.5, 77, up=False)
words = {k: [x for x in TIMING["words"] if x[3] == k] for k in set(x[3] for x in TIMING["words"])}
CUT2 = round(words["anchor"][0][1] - 0.14, 3); T_SKILL = [x for x in words["name"] if x[0].startswith("skill")][0][1] - 0.12
offA = d1 - CUT2; jump = (d2 - T_SKILL) - offA; tj = (96.4 - offA) + 0.8                       # film time of the jump, inside the quiet part
music = np.zeros((N, 2), np.float32); xf = int(0.25 * SR)
def lay(f0, f1, off, fin=False, fout=False):
    a, b = int(f0 * SR), min(N, int(f1 * SR)); src = m[int((f0 + off) * SR):int((f0 + off) * SR) + (b - a)].copy(); n = len(src)
    if fin: src[:xf] *= np.sin(np.linspace(0, np.pi / 2, xf))[:, None]
    if fout: src[-xf:] *= np.cos(np.linspace(0, np.pi / 2, xf))[:, None]
    music[a:a + n] += src
lay(0, tj + 0.25, offA, fout=True); lay(tj, DUR, offA + jump, fin=True)
# level: the loud parts and the quiet parts each get their own bed level; the break before the first drop goes almost silent
e = np.sqrt(sg.sosfiltfilt(sg.butter(2, 0.7 / (SR / 2), output="sos"), (music ** 2).sum(1)).clip(1e-12)); edb = 20 * np.log10(e + 1e-9); loud = edb > (np.percentile(edb, 80) - 9)
loud_lufs = meter.integrated_loudness(music[loud]); quiet_lufs = meter.integrated_loudness(music[~loud]) if (~loud).sum() > SR * 2 else loud_lufs - 12
g = np.where(loud, MUSIC_LOUD - loud_lufs, MUSIC_QUIET - quiet_lufs).astype(np.float64)
t = np.arange(N) / SR; brk = (t > (b1 - offA) + 0.15) & (t < CUT2 - 0.02); g[brk] -= 9.0
g = sg.sosfiltfilt(sg.butter(2, 6 / (SR / 2), output="sos"), g); g[int((CUT2 - 0.02) * SR):int((CUT2 + 0.5) * SR)] = MUSIC_LOUD - loud_lufs      # the drop itself is instant
ka, kb = int((T_SKILL - 0.02) * SR), int((T_SKILL + 0.5) * SR); g[ka:kb] = MUSIC_LOUD - loud_lufs
music *= db(g)[:, None].astype(np.float32); music[:int(0.03 * SR)] *= np.linspace(0, 1, int(0.03 * SR))[:, None]; fo = int(1.6 * SR); music[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5

# ---------------------------------------------------------------- effects: one level, rotated, none twice in a row
fx = np.zeros((N, 2), np.float32); placed = []; cache = {}
def put(name, t_peak, rel=0.0, rate=1.0, cut=None, at="peak", note=""):
    key = (name, rate)
    if key not in cache: cache[key] = trim(load(F[name], rate))
    x = cache[key]          # ONE level for every effect. Sounds that land on top of each other (a quick run of clicks, the two outline snaps) are turned down so the group reads at that same level
    rel = -3.0 if name == "riser" else -3.4 if note in ("icon pop", "icon drawn") else -2.6 if note == "outline snaps on" else -3.0 if note == "screenshot flash" else 0.0
    if cut: x = fades(x[int(cut[0] * SR):int(cut[1] * SR)], 0.01, 0.12)
    x = fades(x); x = x * db((v_short - FX_BELOW_VOICE + rel) - max(short_max(x), full_max(x))); i0 = int(t_peak * SR) - (env_peak(x) if at == "peak" else 0)
    a, b = max(0, i0), min(N, i0 + len(x))
    if b > a: fx[a:b] += x[a - i0:b - i0]; placed.append(dict(t=round(t_peak, 2), sound=name, level=rel, note=note))
E = lambda note: [e for e in EV if e["note"].startswith(note)]
whooshes = iter(["woosh1", "trail", None, "woosh2", "kwhoosh", "broom", "trail", "woosh1", "woosh2", "kwhoosh"])
for e in [x for x in EV if x["kind"] == "whip"]:
    n = next(whooshes)
    if n: put(n, e["t"] + e["dur"] / 2, -1.0, note=e["note"])
dv = E("dive")[0]; put("dragon", dv["t"] + dv["dur"] - 0.12, 0.0, note="dive")
r = E("count")[0]; put("riser", r["t"] + 0.5, -7.0, note="riser into 2,800")
for i, e in enumerate(E("icon pops in")): put("btn", e["t"] + 0.03, -5.0, rate=[1.0, 1.06, 0.95, 1.1, 1.0, 0.92, 1.06, 1.12][i], note="icon pop")
for i, e in enumerate(x for x in EV if "typing" in x["note"]): put("typing", e["t"], -4.0, cut=(0.4 + i * 1.9, 0.4 + i * 1.9 + e["dur"]), at="start", note=e["note"])
ONE = {"GitHub card": ("card", -1), "the skill file drops": ("box", 0), "FREE": ("boomR", 0, (0, 2.6)), "first icon pops": ("pop", -2), "second icon pops": ("pop", -2), "they do not match": ("thud", 0),
       "folder": ("pop", -2), "lock": ("pop", -2), "back piece": ("card", -1), "part name": ("btn", -4), "outline snaps on": ("latch", -3), "the colour block": ("thud", -1),
       "light": ("btn", -4), "dark": ("btn", -4), "shadow": ("btn", -4), "layers close": ("card", -1), "opens": ("click", -4), "not taste": ("noisy", -1), "rules list": ("btn", -4), "the skill file": ("boomS", 0, (0, 3.6)),
       "tick": ("click", -5), "the family arrives": ("broom", -1), "the line is pasted": ("enter", -2), "installed": ("btn", -3), "screenshot flash": ("dbl", -1), "one red mark": ("latch", -2), "fixed": ("enter", -3),
       "small model fails": ("latch", -3), "Opus": ("pop", -2), "READY TO USE": ("thud", 0), "free": ("btn", -3), "comment box": ("pop", -2), "the Claude block jumps": ("pop", -2)}
last = None
for e in EV:
    if e["kind"] in ("meme", "whip", "dive", "riser") or "typing" in e["note"]: continue
    for k, vdef in ONE.items():
        if e["note"] == k or (e["note"].startswith(k) and k not in ("light", "tick", "folder", "lock", "dark")):
            if k == "outline snaps on" and last == "latch": name, rel = "card", -3
            else: name, rel = vdef[0], vdef[1]
            put(name, e["t"] + (0.02 if e["kind"] in ("tick", "snap") else 0.0), rel, cut=vdef[2] if len(vdef) > 2 else None, note=e["note"]); last = name; break
# the memes are pictures only: no sound on them (his note on v2)
dr = E("icons get drawn")[0]
for i in range(6): put("btn", dr["t"] + 0.12 + i * 0.13, -6.0, rate=[1.0, 1.08, 0.94, 1.04, 1.12, 0.98][i], note="icon drawn")

# ---------------------------------------------------------------- master: -14 LUFS, a clean ceiling
mix = voice + music + fx; gain = TARGET - meter.integrated_loudness(mix); mix *= db(gain)
pk = np.abs(mix).max()
os.makedirs("sound/stems", exist_ok=True)
for name, x in (("voice", voice), ("music", music), ("fx", fx)): sf.write(f"sound/stems/{name}.wav", x * db(gain), SR, subtype="PCM_24")
sf.write("sound/premaster.wav", mix, SR, subtype="FLOAT")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "sound/premaster.wav", "-af", f"alimiter=limit={db(CEIL):.4f}:attack=3:release=60:level=false", "-ar", str(SR), "-c:a", "pcm_s24le", "sound/mix.wav"], check=True); os.remove("sound/premaster.wav")
out, _ = sf.read("sound/mix.wav", dtype="float32"); st = {n: sf.read(f"sound/stems/{n}.wav", dtype="float32")[0] for n in ("voice", "music", "fx")}
json.dump(dict(music=dict(track=os.path.basename(MUSIC), drop1_track=round(d1, 2), drop2_track=round(d2, 2), break_track=round(b1, 2), offset=round(offA, 2), jump_s=round(jump, 2), jump_at_film=round(tj, 2), drop2_film=round(T_SKILL, 2)), cues=sorted(placed, key=lambda c: c["t"])), open("sound/cues_placed.json", "w"), indent=1)
print(f"music: drops in the track at {d1:.2f} and {d2:.2f} s, break from {b1:.2f}; film drops at {CUT2} and {T_SKILL:.2f} (jump {jump:.2f} s at film {tj:.2f})")
print(f"mix {meter.integrated_loudness(out):.1f} LUFS, peak {20 * np.log10(np.abs(out).max()):.1f} dBFS (before the limiter {20 * np.log10(pk):.1f}) | stems: voice {meter.integrated_loudness(st['voice']):.1f}, music {meter.integrated_loudness(st['music']):.1f}, fx {meter.integrated_loudness(st['fx']):.1f} LUFS")
print(len(placed), "effects:", dict(Counter(c["sound"] for c in placed)))
lv = []
for c in placed:
    i0 = max(0, int((c["t"] - 0.25) * SR)); seg = st["fx"][i0:i0 + int(0.9 * SR)]
    if len(seg) > SR // 4: lv.append((round(max(short_max(seg), full_max(seg)), 1), c["sound"], c["t"]))
vs_m = short_max(st["voice"], 0.4); arr = np.array([l[0] for l in lv])
print(f"effects as placed (loudest 200 ms each): quietest {arr.min():.1f}, middle {np.median(arr):.1f}, loudest {arr.max():.1f} LUFS; the voice's loudest moment {vs_m:.1f} -> effects sit {vs_m - np.median(arr):.1f} dB under it")
print("more than 2 dB from the middle:", [(l[1], l[2], l[0]) for l in lv if abs(l[0] - np.median(arr)) > 2.0][:12])
