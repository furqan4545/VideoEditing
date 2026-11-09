# Turns the voice track into per-frame mouth parameters (30 fps) for the cartoon rig:
#   open  0..1  how far the jaw/lips open (loudness)
#   wide  0..1  'ee'/'s' spread (bright sound, high spectral centroid)
#   round 0..1  'oo'/'o' pucker (dark sound, low centroid while open)
import json, numpy as np, soundfile as sf
FPS = 30
y, sr = sf.read("hf/assets/voice.wav"); y = y if y.ndim == 1 else y.mean(1)
timing = json.load(open("timing.json")); n = int(timing["total"] * FPS)
win = int(0.045 * sr); hann = np.hanning(win)
rms = np.zeros(n); cen = np.zeros(n)
freqs = np.fft.rfftfreq(win, 1 / sr)
for i in range(n):
    c = int((i + 0.5) / FPS * sr); seg = y[max(0, c - win // 2): c + win // 2]
    if len(seg) < win: seg = np.pad(seg, (0, win - len(seg)))
    rms[i] = np.sqrt(np.mean(seg ** 2))
    mag = np.abs(np.fft.rfft(seg * hann)); band = (freqs > 120) & (freqs < 6000)
    cen[i] = (mag[band] * freqs[band]).sum() / (mag[band].sum() + 1e-9)
db = 20 * np.log10(rms + 1e-6)
inside = np.zeros(n, bool)
for L in timing["lines"]:
    inside[int(L["start"] * FPS): int(L["end"] * FPS) + 1] = True
ref = np.percentile(db[inside], 95); floor = ref - 22
open_raw = np.clip((db - floor) / (ref - floor), 0, 1) ** 1.9
open_raw[~inside] = 0
open_raw[db < ref - 26] = 0                                  # silence between words: lips meet
c_ok = cen[inside & (open_raw > 0.15)]; lo, hi = np.percentile(c_ok, 20), np.percentile(c_ok, 85)
bright = np.clip((cen - lo) / (hi - lo + 1e-9), 0, 1)
wide_raw = np.where(open_raw > 0.05, bright, 0) ** 1.2
round_raw = np.where(open_raw > 0.25, 1 - bright, 0) ** 2
def smooth(x, up, down):
    out = np.zeros_like(x); v = 0.0
    for i, t in enumerate(x):
        v += (t - v) * (up if t > v else down); out[i] = v
    return out
o = smooth(open_raw, 0.75, 0.45); w = smooth(wide_raw, 0.6, 0.4); r = smooth(round_raw, 0.6, 0.4)
# a small 'snap shut' on hard consonant gaps so the mouth reads as talking, not wobbling
for i in range(1, n - 1):
    if open_raw[i] == 0 and open_raw[i - 1] > 0.3: o[i] *= 0.35
energy = smooth(open_raw, 0.3, 0.08)                         # slow speech energy: drives head nods and brows
json.dump({"fps": FPS, "open": [round(float(v), 3) for v in o], "wide": [round(float(v), 3) for v in w],
           "round": [round(float(v), 3) for v in r], "energy": [round(float(v), 3) for v in energy]}, open("mouth.json", "w"))
print("frames", n, "talking frames", int((o > 0.1).sum()), "mean open while talking", round(float(o[o > 0.1].mean()), 2))
