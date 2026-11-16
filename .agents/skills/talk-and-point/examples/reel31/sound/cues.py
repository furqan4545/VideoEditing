# Reel 31 cue list, hand-picked: cinematic only, few, one level (mix.py). Times are picture moments on the TIGHT clock
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
LAND = lambda sid, d=0.08: T0(sid) + d - 0.12      # a whip's whoosh peaks just before the landing key
C = [  # (tight time, kind, note)
    (0.0, "boom", "hook: sub under the first word"),
    (T0("B2a") + 0.08 - 0.12, "whoosh", "whip to the grey desk (BEFORE)"),
    (LAND("B3a"), "whoosh", "whip back to him"),
    (T0("N1a") - 0.5, "riser", "the wall too big to read, into the silence on 'Now'"),
    (T0("N1a") + 0.30, "whoosh_big", "the dive back into his face (silence on 'Now'), colour on"),
    (LAND("N2"), "whoosh", "whip to your app vs your competitor"),
    (W("N2", "cursor") + 0.02, "hit", "Cursor's icon lands"),
    (LAND("M1", 0.1), "whoosh_low", "down into OpenMausBot"),
    (W("M2a", "every") + 0.02, "keys", "the message types: Every Monday"),
    (W("M2c", "give") + 0.0, "keys", "... give me the top five"),
    (T1("M2c") - 0.12, "whoosh", "message sent"),
    (LAND("M3a", 0.1), "whoosh", "whip to him: keep your laptop awake"),
    (W("M3a", "awake"), "click", "the switch on his fingertip"),
    (LAND("M3b"), "whoosh", "back to the chat"),
    (W("M3b", "monday") + 0.42, "hit", "'Every Monday' becomes the schedule card"),
    (W("M3b", "waiting") + 0.05, "hit", "the top five land"),
    (W("L2", "why") + 0.03 - 0.12, "whoosh", "whip to him: why someone would switch"),
    (W("K1", "trick") - 0.03, "hit", "punch-in: the first trick"),
    (LAND("K2", 0.1), "whoosh", "to the list"),
    (W("K2", "link") + 0.15, "click", "the finger taps the link"),
    (W("K2", "real") - 0.02, "hit", "REAL stamp"),
    (LAND("P1", 0.06), "whoosh", "whip to him"),
    (W("P1", "best") - 0.02, "boom", "reveal: the best part (music out)"),
    (LAND("P2b", 0.12), "whoosh", "to the message"),
    (W("P2b", "save"), "keys", "one more line types"),
    (W("P3", "new") - 0.02, "hit", "NEW tag lands"),
    (LAND("C1a"), "whoosh", "to BEFORE / AFTER"),
    (W("C1b", "competitor") - 0.02 + 0.08 - 0.12, "whoosh", "back to his face"),
    (W("C1b", "begging") + 0.06, "hit", "punch-in on 'begging'"),
]
ev = [{"t": newT(t) if t > 0 else 0.0, "t_old": round(t, 3), "kind": k, "v": 1, "note": n} for t, k, n in C]
ev.sort(key=lambda e: e["t"])
json.dump({"T": T2["dur"], "events": ev}, open("sound/events.json", "w"), indent=1)
print(len(ev), "cues")
for e in ev: print(f"{e['t']:6.2f} {e['kind']:10s} {e['note']}")
