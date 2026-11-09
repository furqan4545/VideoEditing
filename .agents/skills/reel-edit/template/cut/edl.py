# Reel 4 edit list: Ali's best take of each line + the VoiceStudio demo voices, on one reel clock.
# Writes cut/timeline.json, sound/ali_raw.wav (Ali + demo voices on the reel clock) and cut/check/<id>.wav
# (each piece alone, to check by transcription that no word is clipped or extra).
import json, os
import numpy as np, soundfile as sf, scipy.signal as sg

SR = 48000
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")

# kind, id, source (take or demo wav), in, out (s), what is said
SEQ = [
    ("A", "H1", "IMG_3413", 11.62, 14.98, "Stop making AI voiceover that sounds like this."),
    ("D", "BAD", "demo/bad_default.wav", None, None, "In a world where every voice costs money one free app changed everything"),
    ("A", "H2", "IMG_3414", 9.92, 12.58, "and start making them sound like this."),
    ("D", "GOOD", "demo/good_trailer_b.wav", None, None, "In a world... where every voice costs money... one free app... changed... everything."),
    ("A", "HO", "IMG_3415", 0.50, 3.05, "That's a free app, VoiceStudio, and here's how."),
    ("A", "S1a", "IMG_3415", 54.15, 56.95, "One. Stop using the default voice for acting."),
    ("A", "S1b", "IMG_3415", 76.28, 79.30, "Switch to an emotion engine like VoxCPM2,"),
    ("A", "S1c", "IMG_3415", 99.74, 104.25, "tell it how to feel: tired... whispering... about to cry."),
    ("A", "S2a", "IMG_3415", 118.26, 119.05, "Step two."),
    ("A", "S2b", "IMG_3415", 132.86, 135.05, "Stop cloning from a boring clip."),
    ("A", "S2c", "IMG_3415", 144.30, 146.95, "It copies how you talk, not just your voice."),
    ("A", "S2d", "IMG_3415", 167.58, 170.25, "So record 10 seconds in the mood you want to speak."),
    ("A", "S3a", "IMG_3415", 219.88, 221.86, "Three. Stop writing long paragraphs."),
    ("A", "S3b", "IMG_3415", 240.76, 244.20, "Add pauses and dots, and it starts breathing like a real person."),
    ("A", "B1", "IMG_3415", 292.40, 295.40, "Stop pasting ElevenLabs tags like 'excited'."),
    ("D", "EXC", "demo/excited_tag.wav", None, None, "Excited. Oh my god, this is so cool!"),
    ("A", "B2", "IMG_3415", 299.20, 301.25, "This app will literally read them out loud."),
    ("A", "R1", "IMG_3415", 338.02, 341.90, "Remember: it doesn't just copy your voice. It copies your acting."),
    ("D", "CTA", "demo/cta_clone.wav", None, None, "Link and setup are in the description."),
]
GAP_DEMO = 0.14       # breath before / after a demo voice
TAIL = 0.55           # hold after the clone's last word


def load(path):
    y, sr = sf.read(path)
    y = y if y.ndim == 1 else y.mean(1)
    if sr != SR: y = sg.resample_poly(y, SR, sr)
    return y.astype(np.float32)


def trim(y, thr_db=-45):
    env = np.abs(y); hop = int(0.005 * SR)
    lv = np.array([env[i:i + hop].max() for i in range(0, len(y), hop)]) + 1e-9
    on = np.nonzero(20 * np.log10(lv / lv.max()) > thr_db)[0]
    a, b = max(0, on[0] * hop - int(0.02 * SR)), min(len(y), (on[-1] + 1) * hop + int(0.06 * SR))
    return y[a:b]


segs, R = [], 0.0
pieces = []
for kind, sid, src, a, b, text in SEQ:
    if kind == "A":
        y = load(f"audio/{src}.wav")[int(a * SR):int(b * SR)].copy()
        d = b - a
    else:
        y = trim(load(src)); d = len(y) / SR
        R += GAP_DEMO
    f = int(0.012 * SR); y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
    segs.append({"kind": kind, "id": sid, "src": src, "src_in": a, "src_out": b, "R_in": round(R, 3), "R_out": round(R + d, 3), "text": text})
    pieces.append((R, y))
    R += d
    if kind == "D": R += GAP_DEMO
total = round(R + TAIL, 3)

n = int((total + 0.2) * SR)
ali = np.zeros(n, np.float32); demo = np.zeros(n, np.float32)
os.makedirs("cut/check", exist_ok=True)
for s, (r0, y) in zip(segs, pieces):
    i = int(r0 * SR)
    (ali if s["kind"] == "A" else demo)[i:i + len(y)] += y[: n - i]
    sf.write(f"cut/check/{s['id']}.wav", y, SR)
os.makedirs("sound", exist_ok=True)
sf.write("sound/ali_raw.wav", ali, SR); sf.write("sound/demo_raw.wav", demo, SR)
json.dump({"total": total, "segs": segs}, open("cut/timeline.json", "w"), indent=1, ensure_ascii=False)
print("total", total)
for s in segs:
    print(f"{s['kind']} {s['id']:5s} R {s['R_in']:6.2f}-{s['R_out']:6.2f}  {s['src']}  {s['text']}")
