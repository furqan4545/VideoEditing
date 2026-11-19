# Reel 5 edit list: "How human can a FREE AI voice get?" — Ali's lines from the one take (IMG_3438) and the six AI
# levels between them. While an AI line plays, the picture is Ali's real reaction from the take: "lead" footage runs
# straight into his next line (no cut there), "at" footage starts at a chosen moment (the facepalm).
# Writes cut/timeline.json (segs = sound pieces, video = picture clips), sound/ali_raw.wav, sound/demo_raw.wav and
# cut/check/<id>.wav (each piece alone, for check_pieces.sh).
import json, os
import numpy as np, soundfile as sf, scipy.signal as sg

SR = 48000
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
TAKE = "IMG_3438"

# kind, id, source, in, out (s), what is said, picture under a D piece
SEQ = [
    ("A", "HOOK", TAKE, 17.96, 21.50, "This free AI tool says it's not a robot. Let's test it.", None),
    ("A", "LV1", TAKE, 56.88, 57.86, "Level one.", None),
    ("D", "L1", "demo/l1_Fred.wav", None, None, "hello i am not a robot i am a real human", ("at", 41.05)),
    ("A", "YA", TAKE, 68.02, 69.12, "Yeah, you are.", None),
    ("D", "L2", "demo/l2_a.wav", None, None, "Hi... I'm not a robot. I promise.", ("lead",)),
    ("A", "BET", TAKE, 76.70, 79.56, "Hmm... better. Now make it nervous.", None),
    ("D", "L3", "demo/l3_b.wav", None, None, "Why are you staring? I'm... I'm not a robot.", ("lead",)),
    ("A", "OFF", TAKE, 99.40, 100.62, "Now offended.", None),
    ("D", "L4", "demo/l4_a.wav", None, None, "Excuse me? Robots don't get offended. And I am very offended.", ("lead",)),
    ("A", "LAU", TAKE, 111.42, 112.82, "Okay. Make it laugh.", None),
    ("D", "L5", "demo/l5_a.wav", None, None, "Me? A robot? That's the funniest thing I've heard all day.", ("lead",)),
    ("A", "HA", TAKE, 123.26, 123.76, "", None),                          # Ali laughs along
    ("A", "MYV", TAKE, 126.66, 127.90, "Now use my voice.", None),
    ("D", "L6", "demo/l6_b.wav", None, None, "Relax. I'm not the robot. You are.", ("lead",)),
    ("A", "AMI", TAKE, 152.38, 153.12, "Am I?", None),
    ("A", "END", TAKE, 161.50, 163.62, "It's free. Everything in the description.", None),
]
GAP_DEMO = 0.14       # breath before / after an AI line
TAIL = 0.55           # hold after the last word (freeze-frame)


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


segs, pieces, R = [], [], 0.0
for kind, sid, src, a, b, text, pic in SEQ:
    if kind == "A":
        y = load(f"audio/{src}.wav")[int(a * SR):int(b * SR)].copy(); d = b - a
    else:
        y = trim(load(src)); d = len(y) / SR
        R += GAP_DEMO
    f = int(0.012 * SR); y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
    segs.append({"kind": kind, "id": sid, "src": src, "src_in": a, "src_out": b, "R_in": round(R, 3), "R_out": round(R + d, 3),
                 "text": text, "pic": pic})
    pieces.append((R, y))
    R += d
    if kind == "D": R += GAP_DEMO
total = round(R + TAIL, 3)

# picture: Ali's take under every piece; a D piece shows his reaction (whole span incl. the breaths around it)
video = []
for i, s in enumerate(segs):
    if s["kind"] == "A":
        video.append([s["R_in"], s["R_out"], s["src_in"]])
    else:
        r0, r1 = s["R_in"] - GAP_DEMO, s["R_out"] + GAP_DEMO
        if s["pic"][0] == "lead":
            nxt = segs[i + 1]; src0 = nxt["src_in"] - (r1 - r0)
        else:
            src0 = s["pic"][1]
        video.append([round(r0, 3), round(r1, 3), round(src0, 3)])
# join neighbours that are one continuous shot (same footage time), so only real take changes remain
clips = []
for r0, r1, s0 in video:
    if clips and abs((clips[-1][2] + (r0 - clips[-1][0])) - s0) < 0.02 and abs(clips[-1][1] - r0) < 0.02:
        clips[-1][1] = r1
    else:
        clips.append([r0, r1, s0])
clips[-1][1] = total                       # the last shot holds through the tail (freeze-frame over it)
cuts = [round(c[0], 3) for c in clips[1:]]

n = int((total + 0.2) * SR)
ali = np.zeros(n, np.float32); demo = np.zeros(n, np.float32)
os.makedirs("cut/check", exist_ok=True)
for s, (r0, y) in zip(segs, pieces):
    i = int(r0 * SR)
    (ali if s["kind"] == "A" else demo)[i:i + len(y)] += y[: n - i]
    if s["text"]: sf.write(f"cut/check/{s['id']}.wav", y, SR)
os.makedirs("sound", exist_ok=True)
sf.write("sound/ali_raw.wav", ali, SR); sf.write("sound/demo_raw.wav", demo, SR)
json.dump({"total": total, "segs": segs, "video": clips, "cuts": cuts}, open("cut/timeline.json", "w"), indent=1, ensure_ascii=False)
print("total", total)
for s in segs:
    print(f"{s['kind']} {s['id']:5s} R {s['R_in']:6.2f}-{s['R_out']:6.2f}  {s['src']}  {s['text']}")
print("picture clips:")
for r0, r1, s0 in clips:
    print(f"  R {r0:6.2f}-{r1:6.2f}  take {s0:7.2f}-{s0 + r1 - r0:7.2f}")
print("take changes at", cuts)
