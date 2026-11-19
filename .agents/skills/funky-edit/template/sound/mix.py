"""The soundtrack of a funky edit: the voice (raw: one gain), a LOW music bed whose drops are cut to the words, and real
recorded effects placed from the film's own event list, every one at ONE light level. Memes get no sound.

  ~/.local/share/onetake/.venv/bin/python tools/events.py                       # the film's K.event calls -> sound/events.json
  ~/.local/share/earshot/.venv/bin/python sound/mix.py --music "/path/track.mp3" --drop 78.97=board/Alright, --drop 111.98=name/skill.
  ~/.local/share/earshot/.venv/bin/python sound/mix.py --music "/path/track.mp3" --find-drops      # where the track gets loud

--drop TRACK=FILM   the track's second TRACK lands on film time FILM. FILM = seconds, or beat/word (that word's start
                    - 0.12 s; add +0.1 / -0.2 to shift). One drop = the track runs straight. More drops = the track
                    jumps between them, 6 s before the next drop (or at TRACK=FILM@JUMP), on a 0.25 s crossfade.
--hush A-B          film seconds where the music drops 9 dB more (the breath before a drop).
--fx-under 16       effects sit this many dB under the voice's loudest moment (16 = "super light"; reel 33 v1 at 11 was too loud).
--music-under 16    the bed's loud parts sit this many LU under the voice; its quiet parts 3 more.

Reads cut/voice.wav, film/timing.js, sound/events.json. Writes sound/mix.wav (-14 LUFS, true peak <= -1.5 dB),
sound/stems/{voice,music,fx}.wav, sound/cues_placed.json, and prints the level of every effect as placed.
Sounds: ~/Music/SFX/cloud (the sfx-cloud library; `sfx-cloud mount` first). A missing file is skipped with a note.
"""
import argparse, json, os, re, subprocess
from collections import Counter
import numpy as np, soundfile as sf, scipy.signal as sg, pyloudnorm as pl
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
ap = argparse.ArgumentParser(); ap.add_argument("--music"); ap.add_argument("--drop", action="append", default=[]); ap.add_argument("--hush", action="append", default=[])
ap.add_argument("--fx-under", type=float, default=16.0); ap.add_argument("--music-under", type=float, default=16.0); ap.add_argument("--find-drops", action="store_true")
a = ap.parse_args()
SR = 48000; meter = pl.Meter(SR); db = lambda g: 10 ** (g / 20); TARGET, CEIL = -14.0, -1.5

def load(path, rate=1.0):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "2", "-ar", str(int(SR / rate)), "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).reshape(-1, 2).copy()
if a.find_drops:                                  # the moments the track jumps up most (1 s after against 1 s before)
    m = load(a.music).mean(1); hop = int(0.05 * SR); e = 20 * np.log10(np.sqrt(np.array([np.mean(m[i:i + hop] ** 2) for i in range(0, len(m) - hop, hop)])) + 1e-6)
    sc = np.array([e[i:i + 20].mean() - e[i - 20:i].mean() if 20 <= i < len(e) - 20 else 0 for i in range(len(e))]); out = []
    for i in np.argsort(-sc):
        if sc[i] < 5 or len(out) >= 8: break
        if all(abs(i - j) > 100 for j in out): out.append(int(i))
    for i in sorted(out): print(f"  {i * 0.05:7.2f} s   +{sc[i]:.1f} dB")
    print("check the exact moment by ear (earshot timeline) or on the waveform, then pass it as --drop TRACK=FILM"); raise SystemExit

s = open("film/timing.js").read(); s = s[s.rindex("window.TIMING"):]; TIMING = json.loads(s[s.index("{"):s.rindex("}") + 1]); DUR = TIMING["dur"]; N = int(round(DUR * SR))
EV = json.load(open("sound/events.json")) if os.path.exists("sound/events.json") else []
CL = os.path.expanduser("~/Music/SFX/cloud/sounds/"); OWN = CL + "ali-own/cinematic-and-ui/"
F = {  # every effect is a real recording (his own set first, then the CC0 kit and the Sonniss bundles)
 "woosh1": OWN + "woosh_1.mp3", "woosh2": OWN + "woosh_2.mp3", "dragon": OWN + "dragon-studio-epic-whoosh-478371.mp3", "click": OWN + "click.mp3", "enter": OWN + "enter_sound.mp3", "typing": OWN + "typing.mp3",
 "boomS": OWN + "submority-boom-geomorphism-cinematic-trailer-sound-effects-123876.mp3", "boomR": OWN + "soundreality-boom-128320.mp3",
 "kwhoosh": CL + "sound-effects-cc0/kit/whoosh.ogg", "broom": CL + "sound-effects-cc0/transition/fs-816262-broomstick-whoosh-3-quiet-okm1.ogg", "thud": CL + "sound-effects-cc0/kit/impact.ogg",
 "btn": CL + "sound-effects-cc0/pop/fs-467951-ui-button-click.ogg", "riser": CL + "sound-effects-cc0/riser/fs-685256-riser-sound-effect-short-wav.ogg",
 "card": CL + "sonniss-gdc-2026/Epic Stock Media - Board Game - Sound Set Kit for Tabletop and Digital Games/PAPRHndl_Game Play Cards Dry Show Flip Toss Disgard Near 12_ESM_BG.wav",
 "latch": CL + "sonniss-gdc-2026/Epic Stock Media - HD Lock And Mechanism Sound Design Kit/MECHLtch_Click Deep Mechanism Latch Button Nearfield Thunk 02_ESM_HDLM.wav",
 "pop": CL + "sonniss-gdc-2024/Rogue Waves - Kawaii UI/UIClick_Hand Pop UI Diminished 1_RogueWaves_KawaiiUI.wav" }
# event kind -> the sounds it rotates through (never the same transition sound twice in a row). K.event(t, kind, note, dur)
KIND = {"whip": ["woosh1", "kwhoosh", "woosh2", "broom"], "dive": ["dragon"], "tick": ["btn"], "pop": ["pop"], "hit": ["thud"], "boom": ["boomS", "boomR"], "snap": ["latch", "card"],
        "card": ["card"], "enter": ["enter"], "click": ["click"], "riser": ["riser"], "type": ["typing"]}      # 'reveal', 'meme' and unknown kinds: no sound
NOTE = {}                                         # one event by its note: NOTE = {"the skill file drops": "thud"}  (wins over its kind; None = silent)

def kw(x):
    y = x.copy()
    for f in meter._filters.values(): y = sg.lfilter(f.b, f.a, y, axis=0)
    return y
PHONE = sg.butter(4, 150 / (SR / 2), "high", output="sos")
def loud200(y, win=0.2):
    ms = (y ** 2).sum(1); w = int(win * SR)
    if len(ms) < w + 1: ms = np.pad(ms, (0, w + 1 - len(ms)))
    c = np.concatenate([[0], np.cumsum(ms)]); return float(-0.691 + 10 * np.log10(((c[w:] - c[:-w]) / w).max() + 1e-12))
short_max = lambda x, win=0.2: loud200(kw(sg.sosfilt(PHONE, x, axis=0)), win)     # loudest 200 ms as a phone speaker hears it (no sub)
full_max = lambda x, win=0.2: loud200(kw(x), win)                                 # the same, full range: a sub-heavy boom must not run away on big speakers
def env_peak(x): e = np.abs(x).max(1); k = int(0.02 * SR); return int(np.argmax(np.convolve(e, np.ones(k) / k, "same")))
def trim(x, thr=-45):
    e = np.abs(x).max(1); on = np.where(e > db(thr) * max(e.max(), 1e-9))[0]; return x[max(0, on[0] - 48):on[-1] + 480] if len(on) else x
def fades(x, fa=0.004, fb=0.03):
    x = x.copy(); na, nb = min(len(x) // 2, int(fa * SR)), min(len(x) // 2, int(fb * SR)); x[:na] *= np.linspace(0, 1, na)[:, None]; x[-nb:] *= np.linspace(1, 0, nb)[:, None]; return x
def film_time(spec):                              # "16.2" or "beat/word" (+0.1 / -0.2)
    m = re.fullmatch(r"([^/]+)/(.+?)([+-]\d*\.?\d+)?", spec)
    if not m: return float(spec)
    ws = [w for w in TIMING["words"] if w[3] == m.group(1)]; n = lambda x: re.sub(r"[^a-z0-9]", "", x.lower()); hit = [w for w in ws if n(w[0]) == n(m.group(2))]
    if not hit: raise SystemExit(f"--drop: no word '{m.group(2)}' in beat '{m.group(1)}' ({' '.join(w[0] for w in ws)})")
    return hit[0][1] + (float(m.group(3)) if m.group(3) else -0.12)

# ---------------------------------------------------------------- voice (raw)
v = load("cut/voice.wav"); voice = np.zeros((N, 2), np.float32); voice[:min(N, len(v))] = v[:N]
v_lufs = meter.integrated_loudness(voice); v_short = short_max(voice, 0.4); MUSIC_LOUD, MUSIC_QUIET = v_lufs - a.music_under, v_lufs - a.music_under - 3.0

# ---------------------------------------------------------------- music: low, its drops cut to the words
music = np.zeros((N, 2), np.float32); drops = []
if a.music:
    m = load(a.music); xf = int(0.25 * SR)
    for d in a.drop:
        tr, fm = d.split("=", 1); jump = None
        if "@" in fm: fm, jump = fm.rsplit("@", 1)
        drops.append(dict(track=float(tr), film=film_time(fm), jump=float(jump) if jump else None))
    drops.sort(key=lambda d: d["film"])
    if not drops: drops = [dict(track=0.0, film=0.0, jump=None)]
    def lay(f0, f1, off, fin=False, fout=False):
        i0, i1 = int(f0 * SR), min(N, int(f1 * SR)); s0 = int((f0 + off) * SR); pad = max(0, -s0); src = m[max(0, s0):max(0, s0) + (i1 - i0) - pad].copy(); n = len(src)
        if n <= xf: return
        if fin: src[:xf] *= np.sin(np.linspace(0, np.pi / 2, xf))[:, None]
        if fout: src[-xf:] *= np.cos(np.linspace(0, np.pi / 2, xf))[:, None]
        music[i0 + pad:i0 + pad + n] += src
    cuts = [0.0]
    for i in range(1, len(drops)): drops[i]["jump"] = drops[i]["jump"] if drops[i]["jump"] is not None else max(drops[i - 1]["film"] + 2.0, drops[i]["film"] - 6.0); cuts.append(drops[i]["jump"])
    for i, d in enumerate(drops):
        last = i == len(drops) - 1; lay(cuts[i], DUR if last else cuts[i + 1] + 0.25, d["track"] - d["film"], fin=i > 0, fout=not last)
    # level: the track's loud parts and quiet parts each get their own bed level, so a drop is felt but never fights the voice
    e = np.sqrt(sg.sosfiltfilt(sg.butter(2, 0.7 / (SR / 2), output="sos"), (music ** 2).sum(1)).clip(1e-12)); edb = 20 * np.log10(e + 1e-9); on = edb > -70
    loud = edb > (np.percentile(edb[on], 80) - 9) if on.sum() > SR else on
    loud_lufs = meter.integrated_loudness(music[loud]) if loud.sum() > SR else -30.0; quiet = on & ~loud
    quiet_lufs = meter.integrated_loudness(music[quiet]) if quiet.sum() > SR * 2 else loud_lufs - 12
    g = np.where(loud, MUSIC_LOUD - loud_lufs, MUSIC_QUIET - quiet_lufs).astype(np.float64); t = np.arange(N) / SR
    for h in a.hush: h0, h1 = [float(x) for x in h.split("-")]; g[(t > h0) & (t < h1)] -= 9.0
    g = sg.sosfiltfilt(sg.butter(2, 6 / (SR / 2), output="sos"), g)
    for d in drops:                                # the drop itself is instant
        if d["film"] > 0.1: g[max(0, int((d["film"] - 0.02) * SR)):int((d["film"] + 0.5) * SR)] = MUSIC_LOUD - loud_lufs
    music *= db(g)[:, None].astype(np.float32); music[:int(0.03 * SR)] *= np.linspace(0, 1, int(0.03 * SR))[:, None]; fo = int(1.6 * SR); music[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
else: print("no --music: voice and effects only")

# ---------------------------------------------------------------- effects: ONE level for all of them, rotated, memes silent
fx = np.zeros((N, 2), np.float32); placed = []; cache = {}; missing = set()
def put(name, t_peak, rel=0.0, rate=1.0, cut=None, at="peak", note=""):
    if not os.path.exists(F[name]): missing.add(name); return
    key = (name, rate)
    if key not in cache: cache[key] = trim(load(F[name], rate))
    x = cache[key]
    if cut: x = fades(x[int(cut[0] * SR):int(cut[1] * SR)], 0.01, 0.12)
    x = fades(x); x = x * db((v_short - a.fx_under + rel) - max(short_max(x), full_max(x))); i0 = int(t_peak * SR) - (env_peak(x) if at == "peak" else 0)
    i_a, i_b = max(0, i0), min(N, i0 + len(x))
    if i_b > i_a: fx[i_a:i_b] += x[i_a - i0:i_b - i0]; placed.append(dict(t=round(t_peak, 2), sound=name, level=rel, note=note))
turn = Counter(); RATES = [1.0, 1.06, 0.95, 1.1, 1.0, 0.92, 1.06, 1.12]; ntype = 0
sounding = [e for e in EV if (NOTE[e["note"]] if e["note"] in NOTE else KIND.get(e["kind"]))]
for e in sounding:
    names = [NOTE[e["note"]]] if e["note"] in NOTE else KIND[e["kind"]]; name = names[turn[e["kind"]] % len(names)]; turn[e["kind"]] += 1
    # sounds that land on top of each other (a quick run of clicks, two snaps) are turned down, so the GROUP reads at the one level
    crowd = sum(1 for o in sounding if o is not e and abs(o["t"] - e["t"]) < 0.22); rel = -3.2 if crowd else 0.0
    if e["kind"] == "whip": put(name, e["t"] + e.get("dur", 0) / 2, rel, note=e["note"])
    elif e["kind"] == "dive": put(name, e["t"] + e.get("dur", 0) - 0.12, rel, note=e["note"])
    elif e["kind"] == "riser": put(name, e["t"] + e.get("dur", 0.5), -3.0, note=e["note"])
    elif e["kind"] == "type": put(name, e["t"], rel, cut=(0.4 + ntype * 1.9, 0.4 + ntype * 1.9 + max(0.3, e.get("dur", 0.9))), at="start", note=e["note"]); ntype += 1
    elif e["kind"] == "boom": put(name, e["t"], rel, cut=(0, 2.8), note=e["note"])
    elif e["kind"] == "tick": put(name, e["t"] + 0.02, rel, rate=RATES[turn["tick"] % len(RATES)], note=e["note"])
    else: put(name, e["t"], rel, note=e["note"])
if missing: print("MISSING sound files (skipped; is the library mounted? `sfx-cloud mount`):", sorted(missing))

# ---------------------------------------------------------------- master: -14 LUFS, a clean ceiling
mix = voice + music + fx; gain = TARGET - meter.integrated_loudness(mix); mix *= db(gain); pk = np.abs(mix).max()
os.makedirs("sound/stems", exist_ok=True)
for name, x in (("voice", voice), ("music", music), ("fx", fx)): sf.write(f"sound/stems/{name}.wav", x * db(gain), SR, subtype="PCM_24")
sf.write("sound/premaster.wav", mix, SR, subtype="FLOAT")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", "sound/premaster.wav", "-af", f"alimiter=limit={db(CEIL):.4f}:attack=3:release=60:level=false", "-ar", str(SR), "-c:a", "pcm_s24le", "sound/mix.wav"], check=True); os.remove("sound/premaster.wav")
out, _ = sf.read("sound/mix.wav", dtype="float32"); st = {n: sf.read(f"sound/stems/{n}.wav", dtype="float32")[0] for n in ("voice", "music", "fx")}
lufs = lambda x: meter.integrated_loudness(x) if np.abs(x).max() > 1e-5 else float("-inf")
json.dump(dict(music=dict(track=os.path.basename(a.music) if a.music else None, drops=drops), cues=sorted(placed, key=lambda c: c["t"])), open("sound/cues_placed.json", "w"), indent=1)
print(f"mix {lufs(out):.1f} LUFS, peak {20 * np.log10(np.abs(out).max()):.1f} dBFS (before the limiter {20 * np.log10(pk):.1f}) | stems: voice {lufs(st['voice']):.1f}, music {lufs(st['music']):.1f}, fx {lufs(st['fx']):.1f} LUFS")
if a.music: print(f"music sits {lufs(st['voice']) - lufs(st['music']):.1f} LU under the voice (keep it at 15 or more); drops at film " + ", ".join(f"{d['film']:.2f}" for d in drops))
print(len(placed), "effects:", dict(Counter(c["sound"] for c in placed)))
lv = []
for c in placed:
    i0 = max(0, int((c["t"] - 0.25) * SR)); seg = st["fx"][i0:i0 + int(0.9 * SR)]
    if len(seg) > SR // 4: lv.append((round(max(short_max(seg), full_max(seg)), 1), c["sound"], c["t"]))
if lv:
    vs_m = short_max(st["voice"], 0.4); arr = np.array([l[0] for l in lv])
    print(f"effects as placed (loudest 200 ms each): quietest {arr.min():.1f}, middle {np.median(arr):.1f}, loudest {arr.max():.1f} LUFS; the voice's loudest moment {vs_m:.1f} -> effects sit {vs_m - np.median(arr):.1f} dB under it")
    print("more than 2 dB from the middle (fix these: NOTE / a lower rel):", [(l[1], l[2], l[0]) for l in lv if abs(l[0] - np.median(arr)) > 2.0][:12])
