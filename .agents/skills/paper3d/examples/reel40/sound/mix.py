"""Reel 40 soundtrack (Apple Watch heart sensor): the Dr.pimp voice (raw, one gain per line), Interstellar's "Stay" opening on
its organ climax, calm strings under the mechanism, near silence on the two build-up lines, the climax again on "On newer
watches", and real recorded effects placed from the film's own event list, all at one level 16 dB under the voice.
Built from reel 38's mix.py (approved look and sound).

  ~/.local/share/earshot/.venv/bin/python sound/mix.py
Reads  audio/voice.wav, film/timing.js, sound/events.json.  Writes sound/mix.wav (-14 LUFS, true peak <= -1.5 dB),
sound/stems/*.wav, sound/cues_placed.json.
"""
import json, os, subprocess
from collections import Counter
import numpy as np, soundfile as sf, scipy.signal as sg, pyloudnorm as pl
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
SR = 48000; meter = pl.Meter(SR); db = lambda g: 10 ** (g / 20)
s = open("film/timing.js").read(); TIMING = json.loads(s[s.index("{"):s.rindex("}") + 1]); DUR = TIMING["dur"]; N = int(round(DUR * SR))
LINES = TIMING["lines"]; WORDS = TIMING["words"]
def Wt(key, w, nth=0):
    L = [x for x in WORDS if x[3] == key and x[0].lower().strip(".,?!:").startswith(w.lower())]; return (L[nth] if L else [0, LINES[key][0]])[1]
EV = json.load(open("sound/events.json"))
ALI = "/Users/topg/Desktop/MY VIDEO EDITING STUFF/Ali_BG_MUSIC/"; CL = os.path.expanduser("~/Music/SFX/cloud/sounds/")
MUSIC = ALI + "stay.mp3"
FX_BELOW_VOICE, TARGET, CEIL = 16.0, -14.0, -1.5
F = {  # every effect is a real recording
 "woosh1": ALI + "woosh_1.mp3", "woosh2": ALI + "woosh_2.mp3", "trail": ALI + "whoosh_trailFollow.mp3", "dragon": ALI + "dragon-studio-epic-whoosh-478371.mp3",
 "boomS": ALI + "submority-boom-geomorphism-cinematic-trailer-sound-effects-123876.mp3", "boomZ": ALI + "zenowaves-deep-sub-boom-627605.mp3",
 "boomR": ALI + "soundreality-boom-128320.mp3", "heart": ALI + "lenspulse-intense-cinematic-heartbeat-sound-effect-584627.mp3",
 "kwhoosh": CL + "sound-effects-cc0/kit/whoosh.ogg", "riser": CL + "sound-effects-cc0/riser/fs-685256-riser-sound-effect-short-wav.ogg",
 "broom": CL + "sound-effects-cc0/transition/fs-816262-broomstick-whoosh-3-quiet-okm1.ogg", "thud": CL + "sound-effects-cc0/kit/impact.ogg",
 "btn": CL + "sound-effects-cc0/pop/fs-467951-ui-button-click.ogg", "pop": CL + "sonniss-gdc-2024/Rogue Waves - Kawaii UI/UIClick_Hand Pop UI Diminished 1_RogueWaves_KawaiiUI.wav",
 "arc": CL + "sonniss-gdc-2026/InMotionAudio - Arc/ELECArc_ArcDesign15_InMotionAudio_Arc.wav",
 "glass": CL + "earshot-sfx/pro_tap/glass.wav", "ring": CL + "sonniss-gdc-2026/CB_Sounddesign - Applicable Sounds - Organic UI and Building Games SFX/UIMisc_Xylophone Ringtone 2_CB Sounddesign_APPlicable Sounds.wav",
 "tick": CL + "sound-effects-cc0/kit/tick.ogg" }

def load(path, rate=1.0):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(int(SR / rate)), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
def kw(x):
    y = x.copy()
    for f in meter._filters.values(): y = sg.lfilter(f.b, f.a, y, axis=0)
    return y
PHONE = sg.butter(4, 150 / (SR / 2), "high", output="sos")
def short_max(x, win=0.2):
    y = kw(sg.sosfilt(PHONE, x, axis=0)); ms = (y ** 2).sum(1); w = int(win * SR)
    if len(ms) < w + 1: ms = np.pad(ms, (0, w + 1 - len(ms)))
    c = np.concatenate([[0], np.cumsum(ms)]); return float(-0.691 + 10 * np.log10(((c[w:] - c[:-w]) / w).max() + 1e-12))
def full_max(x, win=0.2):
    y = kw(x); ms = (y ** 2).sum(1); w = int(win * SR)
    if len(ms) < w + 1: ms = np.pad(ms, (0, w + 1 - len(ms)))
    c = np.concatenate([[0], np.cumsum(ms)]); return float(-0.691 + 10 * np.log10(((c[w:] - c[:-w]) / w).max() + 1e-12))
def env_peak(x): e = np.abs(x).max(1); k = int(0.02 * SR); return int(np.argmax(np.convolve(e, np.ones(k) / k, "same")))
def trim(x, thr=-45):
    e = np.abs(x).max(1); on = np.where(e > db(thr) * max(e.max(), 1e-9))[0]; return x[max(0, on[0] - 48):on[-1] + 480] if len(on) else x
def fades(x, a=0.004, b=0.03):
    x = x.copy(); na, nb = min(len(x) // 2, int(a * SR)), min(len(x) // 2, int(b * SR)); x[:na] *= np.linspace(0, 1, na)[:, None]; x[-nb:] *= np.linspace(1, 0, nb)[:, None]; return x

# ---------------------------------------------------------------- voice (raw)
v = load("audio/voice.wav"); voice = np.zeros((N, 2), np.float32); voice[:min(N, len(v))] = v[:N]
v_lufs = meter.integrated_loudness(voice); v_short = short_max(voice, 0.4)

# ---------------------------------------------------------------- music: "Stay", cut to the story and moved with the voice
m = load(MUSIC); music = np.zeros((N, 2), np.float32); xf = int(0.35 * SR); t = np.arange(N) / SR
run0 = LINES["run"][0]; cl0, cl1 = LINES["clever"][:2]; nb0, nb1 = LINES["nobody"][:2]; bp0 = LINES["bp"][0]
SEG = [  # (film from, film to, track offset): film t plays track t + offset
    (0.0, run0 + 0.15, 247.3),                 # the organ climax from the first frame (the real photo, the dive inside)
    (run0 + 0.15, nb1 + 0.05, 104.0 - run0),   # calm strings under the whole mechanism (its own dip falls on the build-up)
    (nb1 + 0.05, DUR, 257.2 - bp0)]            # back into the climax exactly on "On newer watches"
segs = []
for k, (f0, f1, off) in enumerate(SEG):
    a, b = int(f0 * SR), min(N, int(f1 * SR)) + (xf if k < len(SEG) - 1 else 0); b = min(N, b); i0 = int((f0 + off) * SR)
    src = m[i0:i0 + (b - a)].copy()
    if k: src[:xf] *= np.sin(np.linspace(0, np.pi / 2, xf))[:, None]
    if k < len(SEG) - 1: src[-xf:] *= np.cos(np.linspace(0, np.pi / 2, xf))[:, None]
    segs.append((a, a + len(src), src))
BED = [-22.0, -25.5, -23.0]
for (a, b, src), lv in zip(segs, BED):
    core = src[xf:-xf] if len(src) > 3 * xf else src; L = meter.integrated_loudness(core) if len(core) > SR else -40.0
    music[a:b] += src * db(lv - L)
e = np.abs(voice[:, 0]); w = int(0.05 * SR); env = np.sqrt(np.convolve(e * e, np.ones(w) / w, "same")); act = (20 * np.log10(env + 1e-9) > -42).astype(float)
def smooth(x, up, down):
    y = np.empty_like(x); a_u, a_d = np.exp(-1 / (up * SR)), np.exp(-1 / (down * SR)); vv = 0.0
    for k in range(0, len(x), 64):
        tgt = x[k]; a_ = a_u if tgt > vv else a_d
        for _ in range(64): vv = a_ * vv + (1 - a_) * tgt
        y[k:k + 64] = vv
    return y
duck = smooth(act, 0.08, 0.45); g = -7.0 * duck
def shape(a, b, gain, ra=0.25, rb=0.25):
    k = np.clip((t - (a - ra)) / ra, 0, 1) * np.clip(((b + rb) - t) / rb, 0, 1); g[:] = g + gain * k
shape(cl0 - 0.05, cl1 + 0.05, -20.0, 0.2, 0.15)             # "But here's where it gets clever." -> near silence
shape(nb0 - 0.05, nb1 + 0.04, -22.0, 0.2, 0.02)             # "But here's what almost nobody knows." -> near silence, the climax lands on bp
shape(LINES["payoff"][0] - 0.2, LINES["payoff"][1], -2.0, 0.4, 0.4)
TRIM = 0.6; NE = N - int(TRIM * SR)
music *= db(g)[:, None].astype(np.float32); fo = int(1.0 * SR); music[NE - fo:NE] *= np.linspace(1, 0, fo)[:, None] ** 1.2; music[NE:] = 0
music[:int(0.12 * SR)] *= np.linspace(0, 1, int(0.12 * SR))[:, None]
def st_loud(x, a, b):
    seg = x[int(a * SR):int(b * SR)]; return meter.integrated_loudness(seg) if len(seg) > 0.4 * SR else -70
spoken = [(a, b) for (a, b, _) in LINES.values()]
worst = max(st_loud(music, a, b) for a, b in spoken); print(f"music under the voice: loudest line {worst:.1f} LUFS vs voice {v_lufs:.1f} -> {v_lufs - worst:.1f} LU under")
if v_lufs - worst < 15.0: music *= db(-(15.0 - (v_lufs - worst)) - 0.3); print("  lowered the whole score to keep 15 LU")

# ---------------------------------------------------------------- effects: one level, rotated, none twice in a row
fx = np.zeros((N, 2), np.float32); placed = []; cache = {}
def put(name, t_peak, rel=0.0, rate=1.0, cut=None, at="peak", note=""):
    key = (name, rate, cut)
    if key not in cache:
        x = trim(load(F[name], rate))
        if cut: x = fades(x[int(cut[0] * SR):int(cut[1] * SR)], 0.004, 0.12)
        cache[key] = fades(x)
    x = cache[key]; x = x * db((v_short - FX_BELOW_VOICE + rel) - max(short_max(x), full_max(x))); i0 = int(t_peak * SR) - (env_peak(x) if at == "peak" else 0)
    a, b = max(0, i0), min(N, i0 + len(x))
    if b > a: fx[a:b] += x[a - i0:b - i0]; placed.append(dict(t=round(t_peak, 2), sound=name, level=rel, note=note))
wh = ["woosh1", "trail", "woosh2", "kwhoosh", "broom"]; wi = 0
dv = ["dragon", "woosh2", "dragon"]; di = 0
beat_line = LINES["beat"]
for ev in EV:
    k, n, tt, d = ev["kind"], ev["note"], ev["t"], ev.get("dur", 0) or 0
    if k == "whip": put(wh[wi % len(wh)], tt + min(d / 2, 0.25), -4.0, note=n); wi += 1
    elif k == "dive": put(dv[di % len(dv)], tt + d - 0.05, -1.0, note=n); di += 1
    if k == "dive" and n.startswith("down under"): put("boomZ", tt + d - 0.02, -3.0, note="sub under the dive inside")
    elif k == "pullout": put("trail", tt + 0.2, -5.0, rate=0.9, note=n)
    elif k == "hit" and n.startswith("the music opens"): put("boomS", 0.05, -1.0, cut=(0, 3.0), note=n)
    elif k == "hit" and n.startswith("red bounces"): put("glass", tt + 0.05, -4.0, note=n)
    elif k == "hit" and n.startswith("high blood"): put("boomZ", tt + 0.05, 0.0, note=n)
    elif k == "reveal" and n.startswith("the photo"): put("riser", tt + d, -6.0, note=n)
    elif k == "reveal" and n.startswith("hoses become"): put("arc", tt + 0.3, -6.0, rate=0.85, note=n)
    elif k == "reveal": put("arc", tt + 0.2, -7.0, note=n)
    elif k == "riser" and n.startswith("the laser"): put("arc", tt + d * 0.45, -5.0, rate=0.92, note=n + " (the cut)"); put("riser", tt + d, -6.0, note=n)
    elif k == "riser": put("riser", tt + d, -4.0, note=n)
    elif k == "snap": put("pop", tt + 0.02, -3.0, note=n)
    elif k == "tick" and n == "a day": put("tick", tt, -11.0, rate=1.0 + 0.02 * (len(placed) % 5), note=n)
    elif k == "tick": put("btn", tt + 0.05, -6.0, note=n)
    elif k == "land": put("thud", tt + 0.05, -3.0, note=n)
    elif k == "alarm": put("ring", tt + 0.3, -3.0, note=n)
    elif k == "pulse" and n == "heartbeat":
        if beat_line[0] - 0.5 < tt < beat_line[1]: put("heart", tt + 0.04, -5.0, cut=(0, 0.8), at="peak", note=n)
    elif k == "pulse" and n.startswith("his heart"): put("heart", tt + 0.3, -5.0, cut=(0, 0.8), note=n)
    elif k == "pulse" and n.startswith("the hose"): put("thud", tt, -8.0, rate=0.8, note=n)
    elif k == "pulse": put("arc", tt + 0.2, -8.0, note=n)

# ---------------------------------------------------------------- master: -14 LUFS, a clean ceiling
voice, music, fx = voice[:NE], music[:NE], fx[:NE]
mix = voice + music + fx; gain = TARGET - meter.integrated_loudness(mix); mix *= db(gain)
pk = np.abs(mix).max(); os.makedirs("sound/stems", exist_ok=True)
for name, x in (("voice", voice), ("music", music), ("fx", fx)): sf.write(f"sound/stems/{name}.wav", x * db(gain), SR, subtype="PCM_24")
sf.write("sound/premaster.wav", mix, SR, subtype="FLOAT")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "sound/premaster.wav", "-af", f"alimiter=limit={db(CEIL):.4f}:attack=3:release=60:level=false", "-ar", str(SR), "-c:a", "pcm_s24le", "sound/mix.wav"], check=True); os.remove("sound/premaster.wav")
out, _ = sf.read("sound/mix.wav", dtype="float32"); st = {n: sf.read(f"sound/stems/{n}.wav", dtype="float32")[0] for n in ("voice", "music", "fx")}
json.dump(dict(music=os.path.basename(MUSIC), segments=SEG, cues=sorted(placed, key=lambda c: c["t"])), open("sound/cues_placed.json", "w"), indent=1)
print(f"mix {meter.integrated_loudness(out):.1f} LUFS, peak {20 * np.log10(np.abs(out).max()):.1f} dBFS (pre-limit {20 * np.log10(pk):.1f}) | voice {meter.integrated_loudness(st['voice']):.1f}, music {meter.integrated_loudness(st['music']):.1f}, fx {meter.integrated_loudness(st['fx']):.1f} LUFS")
print(len(placed), "effects:", dict(Counter(c["sound"] for c in placed)), "| film ends at", round(NE / SR, 2), "s")
