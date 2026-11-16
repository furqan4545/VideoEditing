# Ali's index fingertip per frame for every on-camera piece, from Apple Vision hand pose (cut/hands/<id>.jsonl, made by
# tools/hands on film/footage/<id>/). Picks the POINTING hand in each frame (index straight: tip far from its knuckle
# compared with the hand's size; the hand holding the selfie stick has a bent index), smooths the path (centred average
# over 5 frames, gaps up to 4 frames bridged), and writes film/fingers.js:
#   window.FINGERS = { id: { tip: [[x, y] | null per frame], point: [0/1 per frame] } }
# Prints, per piece, the stretches where he points (frame ranges, take px) so the pins can be placed.
import json, os, glob, numpy as np
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
T = json.load(open("cut/timing.json")); OUT = {}
def d(a, b): return float(np.hypot(a[0] - b[0], a[1] - b[1]))
for s in T["segs"]:
    f = f"cut/hands/{s['id']}.jsonl"
    if not os.path.exists(f): continue
    rows = [json.loads(l) for l in open(f)]; n = len(rows); raw = [None] * n; pt = [0] * n
    for i, r in enumerate(rows):
        best, bs = None, 1e9
        for h in r["hands"]:   # the RAISED index finger: the highest index tip in the frame (the stick hand stays low)
            if "itip" not in h or h["itip"][2] < 0.35: continue
            if "wrist" in h and h["itip"][1] > h["wrist"][1] - 60: continue      # tip must be above its wrist (pointing up / forward)
            if h["itip"][1] < bs: best, bs = h, h["itip"][1]
        if best and best["itip"][1] > 1420: best = None                           # only a raised hand counts
        if best: raw[i] = best["itip"][:2]; pt[i] = 1
    # bridge short gaps, then smooth
    xy = [None if p is None else np.array(p, float) for p in raw]
    i = 0
    while i < n:
        if xy[i] is None:
            j = i
            while j < n and xy[j] is None: j += 1
            if 0 < i and j < n and j - i <= 4:
                for k in range(i, j): xy[k] = xy[i - 1] + (xy[j] - xy[i - 1]) * (k - i + 1) / (j - i + 1)
            i = j
        else: i += 1
    sm = []
    for i in range(n):
        ws = [xy[k] for k in range(max(0, i - 2), min(n, i + 3)) if xy[k] is not None]
        sm.append(None if xy[i] is None else [round(float(np.mean([w[0] for w in ws])), 1), round(float(np.mean([w[1] for w in ws])), 1)])
    OUT[s["id"]] = {"tip": sm, "point": pt}
    runs, i = [], 0
    while i < n:
        if sm[i] is not None:
            j = i
            while j < n and sm[j] is not None: j += 1
            if j - i >= 6: runs.append((i, j - 1, sm[i], sm[(i + j) // 2], sm[j - 1]))
            i = j
        else: i += 1
    pad = s["pad"]
    print(f"{s['id']:4s} t0 {s['t0']:6.2f} frames {n:3d} | " + "  ".join(f"[{(a - pad) / 30 + s['t0']:.2f}-{(b - pad) / 30 + s['t0']:.2f}s {tuple(map(int, m))}]" for a, b, f0, m, f1 in runs))
open("film/fingers.js", "w").write("window.FINGERS = " + json.dumps(OUT, separators=(",", ":")) + ";\n")
print("wrote film/fingers.js", len(OUT), "pieces")
