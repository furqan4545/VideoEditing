# The cue list, hand-picked: few, soft, cinematic (about one every 2 s at most; the scenes' SFX_EVENTS are only proposals). Writes sound/events.json on the NEW clock (with the pauses).
# Times marked old= are picture moments on the tight clock (camera keys / scene beats), mapped like comp.html's oldT().
# run: ~/.local/share/onetake/.venv/bin/python sound/cues.py
import json, os
os.chdir(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
T2 = json.load(open("cut/timing2.json")); S = T2["segs"]; TAILW = 0.3
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
C = [  # (time on the NEW clock, or "o:SECONDS" on the tight clock = a picture moment / camera key), kind, note
    # kinds: boom (t=0 hook = sub boom; note containing "reveal" = the big reveal boom), hit, whoosh (4 rotate), whoosh_low, whoosh_big, riser,
    #        tick / click (his click), keys (typing), paper (soft paper foley; "crumple" in the note = a crumple)
    (0.00, "boom", "hook"),
    ("o:2.95", "whoosh", "whip to the device"),
    ("o:3.85", "hit", "land in the close-up"),
]
ev = []
for t, k, n in C:
    tt = newT(float(t[2:])) if isinstance(t, str) else t
    ev.append({"t": round(tt, 3), "kind": k, "v": 1, "note": n})
ev.sort(key=lambda e: e["t"])
json.dump({"T": T2["dur"], "events": ev}, open("sound/events.json", "w"), indent=1)
print(len(ev), "cues; reveal at", round(R16a, 3))
for e in ev: print(f"{e['t']:6.2f} {e['kind']:10s} {e['note']}")
