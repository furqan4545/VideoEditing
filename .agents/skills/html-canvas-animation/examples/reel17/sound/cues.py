# Reel 17 cue list, hand-picked: few, soft, cinematic. Writes sound/events.json on the NEW clock (with the pauses).
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
R16a = next(s for s in S if s["id"] == "R16a")["t0"] + 0.06
C = [  # (time, kind, note); "o:" = old-clock picture time
    (0.00, "boom", "hook"),
    (3.50, "riser", "the like count starts to race"),
    (5.00, "tick", "the heart fills red"),
    ("o:6.30", "whoosh_big", "dive into the post image"),
    ("o:6.95", "whoosh_low", "pull back: the drawing is on the class wall"),
    ("o:8.85", "whoosh", "to Sara's drawing"),
    ("o:11.05", "whoosh", "along the wall to the board"),
    (12.62, "whoosh_low", "push into the 41"),
    ("o:13.88", "whoosh", "whip to You"),
    ("o:19.35", "whoosh_low", "close on the board: both write 42"),
    (23.91, "whoosh", "both hearts fly to the number"),
    (26.82, "hit", "your like cracks: gone"),
    (28.09, "whoosh", "race card grows out of the board"),
    (29.68, "hit", "the second write lands on top of the first"),
    (31.50, "whoosh_big", "rewind: the kids walk back"),
    ("o:31.70", "whoosh_low", "the room: nobody touches the board"),
    (35.53, "paper", "the note is passed desk to desk"),
    (36.73, "paper", "the note unfolds"),
    ("o:37.52", "whoosh", "into the notebook"),
    ("o:39.90", "whoosh_low", "board and desk together"),
    ("o:42.72", "whoosh", "wide: nobody is lost"),
    (47.18, "paper", "the same note again"),
    ("o:46.12", "whoosh_low", "into the notebook: already there"),
    (50.89, "paper", "crumpled into a ball: crumple"),
    (R16a - 0.16, "whoosh", "whip to Ali through the silence"),
    (R16a, "boom", "That is Instagram"),
    ("o:49.78", "whoosh_low", "push through his hand into black"),
    (54.00, "tick", "finger taps the heart"),
    (56.75, "tick", "the name lights blue"),
    (58.06, "whoosh", "the request flies to the network"),
    (59.00, "click", "plugs into the server"),
    (60.34, "hit", "the pen lands on one server"),
    (60.90, "whoosh_big", "pull back to millions of servers"),
    (61.75, "hit", "the wall of racks"),
    (62.60, "whoosh", "whip back in to the one server"),
    (64.34, "whoosh_big", "out to the world map"),
    (65.80, "whoosh", "onto London and Frankfurt"),
    (68.15, "whoosh_low", "the new number leaves on every arc"),
    (68.94, "tick", "the copies flip to 44"),
    ("o:65.35", "whoosh", "whip to Ali"),
    (71.78, "whoosh_low", "two computers grow from his fingers"),
    (73.17, "hit", "both write the same number"),
    (74.08, "whoosh", "the name note flies into A"),
    (76.39, "hit", "the pen lands on computer A"),
    (76.98, "tick", "45 with a check"),
    (81.21, "click", "send"),
]
ev = []
for t, k, n in C:
    tt = newT(float(t[2:])) if isinstance(t, str) else t
    ev.append({"t": round(tt, 3), "kind": k, "v": 1, "note": n})
ev.sort(key=lambda e: e["t"])
json.dump({"T": T2["dur"], "events": ev}, open("sound/events.json", "w"), indent=1)
print(len(ev), "cues; reveal at", round(R16a, 3))
for e in ev: print(f"{e['t']:6.2f} {e['kind']:10s} {e['note']}")
