# The cue list, hand-picked (talk-and-point): cinematic only, few, one level (mix.py). Times are picture moments on the TIGHT clock
# (word times from cut/timing.json, the same anchors the film's camera uses), mapped to the NEW clock (with the pauses).
# run: ~/.local/share/onetake/.venv/bin/python sound/cues.py
import json, os, re
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
T1J = json.load(open("cut/timing.json")); T2 = json.load(open("cut/timing2.json")); S = T2["segs"]; TAILW = 0.3
SEG = {s["id"]: s for s in T1J["segs"]}
clean = lambda w: re.sub(r"[^a-z0-9%]", "", w.lower())
def W(sid, word, nth=0):
    k = 0
    for w, a, b in SEG[sid]["words"]:
        if clean(word) in clean(w):
            if k == nth: return a
            k += 1
    raise SystemExit(f"no word {sid} {word}")
T0 = lambda s: SEG[s]["t0"]; T1 = lambda s: SEG[s]["t1"]
def oldT(T):
    if T <= S[0]["t0"]: return T
    for s in S:
        L = s["old_t1"] - s["old_t0"]; end = s["t1"] + s["pause"]
        if T > end: continue
        d = T - s["t0"]
        if not s["pause"] or d <= L - TAILW: return s["old_t0"] + d
        return s["old_t1"] - TAILW + (d - (L - TAILW)) / (TAILW + s["pause"]) * TAILW
    l = S[-1]; return l["old_t1"] + (T - (l["t1"] + l["pause"]))
def newT(t):
    lo, hi = 0.0, T2["dur"]
    for _ in range(50):
        m = (lo + hi) / 2
        if oldT(m) < t: lo = m
        else: hi = m
    return round((lo + hi) / 2, 3)
LAND = lambda sid, d=0.08: T0(sid) + d - 0.12      # a whip's whoosh peaks just before the landing key (camera.js lands at T0 + 0.08)
C = [  # (tight time, kind, note) — kinds: boom (t=0 hook sub; "reveal" in the note = the big boom), hit, whoosh (4 rotate),
       # whoosh_low, whoosh_big, riser, click, keys. Few and soft: one per whip / reveal / tap; never on a key word.
    (0.0, "boom", "hook: sub under the first word"),
    (W("H", "hook") + 0.1, "hit", "punch-in on the key word"),
    (LAND("S1"), "whoosh", "whip to the animation place"),
    (LAND("S2"), "whoosh", "whip back to him"),
]
ev = [{"t": newT(t) if t > 0 else 0.0, "t_old": round(t, 3), "kind": k, "v": 1, "note": n} for t, k, n in C]
ev.sort(key=lambda e: e["t"])
json.dump({"T": T2["dur"], "events": ev}, open("sound/events.json", "w"), indent=1)
print(len(ev), "cues")
for e in ev: print(f"{e['t']:6.2f} {e['kind']:10s} {e['note']}")
