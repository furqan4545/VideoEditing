"""Check a rendered reel before sending it. Run from the reel project (downloads/NAME/full):

    uv run -q --with numpy --with pillow --with soundfile python ~/.claude/skills/reel-edit/scripts/verify.py reelN_v1.mp4 [--transcribe]

1. format: 1080x1920, 30 fps, length = cut/timeline.json total
2. loudness: integrated LUFS (target -14) and true peak (under -1.5 dBTP) of the MP4 itself
3. pace: speech pauses >= 0.5 s in sound/stems/voice.wav (the rule: none, except the hold after the last word)
   and silences >= 0.25 s in the whole mix (none, unless a silence was meant as a build-up)
4. sync: each take's frame in the render vs the source take (sdr/), searched over +-3 frames and the always-on zoom;
   the best match must be within 1 frame
5. --transcribe: VoiceStudio's Whisper hears the render's audio in 30 s parts (every word must be audible)
"""
import json, os, subprocess, sys, argparse
import numpy as np, soundfile as sf
from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument("video")
ap.add_argument("--transcribe", action="store_true")
A = ap.parse_args()
T = json.load(open("cut/timeline.json"))
E = json.load(open("cut/events.json")) if os.path.exists("cut/events.json") else {}
bad = []

# 1. format
info = json.loads(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height,r_frame_rate:format=duration",
                                  "-of", "json", A.video], capture_output=True, text=True).stdout)
v = next(s for s in info["streams"] if s["codec_type"] == "video"); dur = float(info["format"]["duration"])
print(f"format   {v['width']}x{v['height']} {v['r_frame_rate']} fps, {dur:.2f} s (timeline {T['total']:.2f} s), "
      f"audio {'yes' if any(s['codec_type'] == 'audio' for s in info['streams']) else 'NO'}")
if (v["width"], v["height"], v["r_frame_rate"]) != (1080, 1920, "30/1"): bad.append("format")
if abs(dur - T["total"]) > 0.1: bad.append("length")

# 2. loudness of the delivered file
out = subprocess.run(["ffmpeg", "-nostats", "-i", A.video, "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
summ = out[out.rfind("Summary"):]
I = float(summ.split("I:")[1].split("LUFS")[0]); TP = float(summ.split("Peak:")[1].split("dBFS")[0])
print(f"loudness {I:.1f} LUFS, true peak {TP:.1f} dBTP")
if abs(I + 14) > 1: bad.append("loudness")
if TP > -1.5: bad.append("true peak")


# 3. pace
def runs(path, rel_db, minlen):
    x, sr = sf.read(path); x = x if x.ndim == 1 else x.mean(1); hop = int(0.01 * sr)
    d = 20 * np.log10(np.array([np.sqrt(np.mean(x[i:i + hop] ** 2)) for i in range(0, len(x) - hop, hop)]) + 1e-9)
    q = d < np.percentile(d, 95) + rel_db; res, i = [], 0
    while i < len(q):
        if q[i]:
            j = i
            while j < len(q) and q[j]: j += 1
            if (j - i) * 0.01 >= minlen: res.append((round(i * 0.01, 2), round((j - i) * 0.01, 2)))
            i = j
        else: i += 1
    return res


last_word = max(s["R_out"] for s in T["segs"])
if os.path.exists("sound/stems/voice.wav"):
    gaps = [g for g in runs("sound/stems/voice.wav", -35, 0.5) if 0.3 < g[0] and g[0] + g[1] < last_word - 0.05]
    print("pace     speech pauses >= 0.5 s:", gaps or "none")
    if gaps: bad.append("speech gap")
if os.path.exists("sound/mix.wav"):
    sil = runs("sound/mix.wav", -40, 0.25)
    print("         mix silences >= 0.25 s:", sil or "none")


# 4. sync of every take (frames where no full-frame panel covers the picture)
def grab(path, t):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.4f}", "-i", path, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
                         capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(1920, 1080).astype(np.float32)


def zoom(img, s):
    W, H = int(round(1080 * s)), int(round(1920 * s))
    big = Image.fromarray(img.astype(np.uint8)).resize((W, H), Image.BILINEAR)
    ox, oy = int(round(540 * s - 540)), int(round(900 * s - 900))
    return np.asarray(big.crop((ox, oy, ox + 1080, oy + 1920))).astype(np.float32)


def ncc(a, b):
    a = a - a.mean(); b = b - b.mean(); return float((a * b).sum() / np.sqrt((a * a).sum() * (b * b).sum() + 1e-9))


covered = [(p[1], p[2]) for p in E.get("panels", [])]
REG = (slice(560, 1300), slice(180, 900))   # the face / upper body
print("sync     take   reel t   best offset (frames)   ncc")
for s in T["segs"]:
    take = s.get("src") or s.get("take")   # reel 4 calls the take "src", reel 3 "take"
    if s.get("kind", "A") != "A" or not os.path.exists(f"sdr/{take}.mp4"): continue
    a, b = s["R_in"] + 0.45, s["R_out"] - 0.2
    ts = [t for t in np.linspace(a, b, 9) if not any(p0 - 0.1 < t < p1 + 0.1 for p0, p1 in covered)]
    if not ts: continue
    t = ts[len(ts) // 2]; r = grab(A.video, t)[REG]; src = s["src_in"] + (t - s["R_in"])
    best = max(((max(ncc(r, zoom(grab(f"sdr/{take}.mp4", src + k / 30), z)[REG]) for z in np.arange(1.0, 1.0751, 0.015)), k)
                for k in range(-3, 4)))
    print(f"         {s['id']:6s} {t:6.2f}   {best[1]:+d}                     {best[0]:.3f}")
    if abs(best[1]) > 1 or best[0] < 0.6: bad.append(f"sync {s['id']}")

# 5. what a listener hears
if A.transcribe:
    import tempfile
    tmp = tempfile.mkdtemp()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", A.video, "-vn", "-ac", "1", "-ar", "16000", f"{tmp}/a.wav"], check=True)
    for t0 in range(0, int(dur) + 1, 29):
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t0), "-t", "30", "-i", f"{tmp}/a.wav", f"{tmp}/p.wav"], check=True)
        r = subprocess.run(["curl", "-s", "--fail-with-body", "http://localhost:3900/v1/audio/transcriptions", "-F", f"file=@{tmp}/p.wav",
                            "-F", "response_format=json", "-F", "language=en"], capture_output=True, text=True).stdout
        print(f"heard    {t0:3d}-{t0 + 30:3d} s: {json.loads(r).get('text', r).strip() if r.startswith('{') else r[:200]}")

print("RESULT  ", "all checks passed" if not bad else "CHECK: " + ", ".join(bad))
