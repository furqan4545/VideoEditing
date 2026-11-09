# Writes hf/index.html for reel 4 ("Stop making robotic AI voiceovers") from cut/timeline.json and the
# per-piece word timings in cut/words/. Take changes hide behind whips, punch-ins and full-frame panels;
# the demo voices play over their own panels; STOP / START cards sit above Ali's head; serif captions.
import json, os, html, re
HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
T = json.load(open("cut/timeline.json"))
TOTAL = T["total"]
S = {s["id"]: s for s in T["segs"]}

# caption text per piece (Ali's own words, spelled right); demo pieces only where a caption helps
CAPTXT = {
    "H1": "Stop making AI voiceover that sounds like this.",
    "H2": "And start making them sound like this.",
    "HO": "That's a free app, VoiceStudio, and here's how.",
    "S1a": "One. Stop using the default voice for acting.",
    "S1b": "Switch to an emotion engine like Vox CPM2,",
    "S1c": "and tell it how to feel: tired… whispering… about to cry.",
    "S2a": "Step two.",
    "S2b": "Stop cloning from a boring clip.",
    "S2c": "It copies how you talk, not just your voice.",
    "S2d": "So record 10 seconds in the mood you want to speak.",
    "S3a": "Three. Stop writing long paragraphs.",
    "S3b": "Add pauses and dots, and it starts breathing like a real person.",
    "B1": "And stop pasting ElevenLabs tags like “excited”.",
    "B2": "This app will literally read them out loud.",
    "R1": "Remember: it doesn't just copy your voice. It copies your acting.",
    "CTA": "Link and setup are in the description.",
}


def words_for(sid):
    """intended words with reel times: Whisper's times when the word counts match, else spread by length"""
    s = S[sid]; mine = CAPTXT[sid].split()
    ww = json.load(open(f"cut/words/{sid}.json"))["words"]
    base = s["R_in"]
    if len(ww) == len(mine):
        return [(m, round(base + w["start"], 3), round(base + w["end"], 3)) for m, w in zip(mine, ww)]
    a, b = base + ww[0]["start"], base + ww[-1]["end"]
    L = [max(2, len(re.sub(r"\W", "", m))) for m in mine]; tot, acc, out = sum(L), 0, []
    for m, n in zip(mine, L):
        t0 = a + (b - a) * acc / tot; acc += n
        out.append((m, round(t0, 3), round(a + (b - a) * acc / tot, 3)))
    return out


WORDS = {sid: words_for(sid) for sid in CAPTXT}


def at(sid, k):
    """reel time of word k in piece sid (negative k counts from the end)"""
    return WORDS[sid][k][1]


def chunks(ws, maxw=4):
    out, cur = [], []
    for w in ws:
        cur.append(w)
        if len(cur) >= maxw or re.search(r"[.,:?!…]$", w[0]):
            out.append(cur); cur = []
    if cur: out.append(cur)
    return out


caps, cap_js, i = [], [], 0
for sid in CAPTXT:
    for ch in chunks(WORDS[sid]):
        t0 = ch[0][1]; t1 = ch[-1][2]
        nxt = None
        inner = " ".join(f'<span id="cw{i}_{k}">{html.escape(w)}</span>' for k, (w, _, _) in enumerate(ch))
        caps.append([i, t0, t1, inner, [[k, a, b] for k, (_, a, b) in enumerate(ch)]]); i += 1
# hold each caption until the next one starts (max +0.35 s), so they never flicker
for k in range(len(caps)):
    end = caps[k][2] + 0.35
    if k + 1 < len(caps): end = min(end, caps[k + 1][1])
    caps[k][2] = round(max(end, caps[k][1] + 0.3), 3)
# a caption that is still up when a full-frame panel arrives ends with it (no text under the panel)
PSTARTS = [S[k]["R_out"] - 0.12 for k in ("H1", "H2", "S1a", "S2b", "S3a", "B1")]
for c in caps:
    for p in PSTARTS:
        if c[1] < p < c[2]: c[2] = round(p + 0.04, 3)
cap_html = [f'<div id="cap{c[0]}" class="cap clip" data-start="{c[1]}" data-duration="{round(c[2] - c[1], 3)}" data-track-index="6"><div class="capbox">{c[3]}</div></div>' for c in caps]
cap_js = [[c[0], c[1], c[4]] for c in caps]

# ---------------------------------------------------------------- panels (full frame; each hides a take change)
G = S["GOOD"]["R_in"]
PANELS = [
    ("plain", S["H1"]["R_out"] - 0.12, S["H2"]["R_in"] + 0.06),
    ("trailer", S["H2"]["R_out"] - 0.12, S["HO"]["R_in"] + 0.06),
    ("engines", S["S1a"]["R_out"] - 0.12, S["S1c"]["R_in"] + 0.06),
    ("clone", S["S2b"]["R_out"] - 0.12, S["S2d"]["R_in"] + 0.06),
    ("script", S["S3a"]["R_out"] - 0.12, at("S3b", 4) + 0.15),
    ("excited", S["B1"]["R_out"] - 0.12, S["B2"]["R_in"] + 0.06),
]
TRAILER = [("IN A WORLD…", 0.0), ("WHERE EVERY VOICE…", 0.96), ("COSTS MONEY…", 2.76), ("ONE FREE APP…", 4.56), ("CHANGED…", 5.58), ("EVERYTHING.", 6.56)]
P = {}
P["plain"] = ('<div class="tts"><div class="ttsbar"><span>AI Voice Generator</span><i>▶ Generate</i></div>'
              '<div class="ttstext">In a world where every voice costs money one free app changed everything</div>'
              '<div class="wave">' + "".join('<b></b>' for _ in range(36)) + '</div></div>'
              '<div id="stamp-bad" class="stamp bad">✕ ROBOTIC</div>')
P["trailer"] = ('<div class="bar top"></div><div class="bar bottom"></div>'
                + "".join(f'<div id="tt{k}" class="tline{" last" if k == len(TRAILER) - 1 else ""}">{html.escape(t)}</div>' for k, (t, _) in enumerate(TRAILER))
                + '<div id="stamp-good" class="stamp good">✓ CINEMATIC</div>')
P["engines"] = ('<div id="pl-engines" class="lbl">SWITCH THE <b>ENGINE</b></div><div id="pb-engines" class="list">'
                '<div class="row off"><span>VoiceStudio (default)</span><em>✕ no emotion</em></div>'
                '<div id="row-vox" class="row"><span>VoxCPM2</span><em>✓ emotion</em></div>'
                '<div class="row"><span>CosyVoice 3</span><em>✓ emotion</em></div>'
                '<div class="row"><span>IndexTTS2</span><em>✓ emotion</em></div></div>'
                '<div id="ps-engines" class="sub">then write HOW it should sound</div>')
P["clone"] = ('<div id="pl-clone" class="lbl">IT COPIES <b>HOW</b><br>YOU TALK</div><img id="pb-clone" class="card" src="assets/shots/02-voice-cloning.png" />'
              '<div id="ps-clone" class="sub">flat clip in → flat voice out</div>')
P["script"] = ('<div id="pl-script" class="lbl">ADD <b>PAUSES</b> + DOTS</div><div id="pb-script" class="term"><div class="tbar"><i></i><i></i><i></i><span>script</span></div>'
               '<div class="tbody">In a world<u>…</u> <u>[pause 500ms]</u><br>where every voice<u>…</u><br>costs money<u>…</u></div></div>')
P["excited"] = ('<div id="pl-excited" class="lbl">PASTE THIS AND…</div><div id="pb-excited" class="term"><div class="tbar"><i></i><i></i><i></i><span>script</span></div>'
                '<div class="tbody"><s>[excited]</s> Oh my god,<br>this is so cool!</div></div>'
                '<div id="bubble" class="bubble">IT SAID “EXCITED” 💀</div>')
panels = [f'<div id="p-{pid}" class="panel {pid} clip" data-start="{round(a, 3)}" data-duration="{round(b - a, 3)}" data-track-index="4"><div class="pin">{P[pid]}</div></div>'
          for pid, a, b in PANELS]

# ---------------------------------------------------------------- cards above the head: id, in, out, text, colour, row
CHIPS = [
    ("hook1", 0.0, S["H1"]["R_out"], "STOP MAKING", "r", 0), ("hook2", 0.0, S["H1"]["R_out"], "ROBOTIC AI VOICEOVERS", "w", 1),
    ("start1", S["H2"]["R_in"] + 0.2, S["H2"]["R_out"], "START MAKING THEM", "g", 0), ("start2", at("H2", 3), S["H2"]["R_out"], "CINEMATIC", "w", 1),
    ("vs", at("HO", 4), S["HO"]["R_out"], "VOICESTUDIO · FREE", "y", 0),
    ("s1", at("S1a", 1), S["S1a"]["R_out"], "1 · STOP ✕ DEFAULT VOICE", "r", 0),
    ("s1go", S["S1c"]["R_in"] + 0.1, S["S1c"]["R_out"], "START ✓ DIRECT THE EMOTION", "g", 0),
    ("tired", at("S1c", 6), at("S1c", 7), "😴 TIRED", "w", 1), ("whisper", at("S1c", 7), at("S1c", 8), "🤫 WHISPERING", "w", 1),
    ("cry", at("S1c", 8), S["S1c"]["R_out"], "😢 ABOUT TO CRY", "w", 1),
    ("s2n", S["S2a"]["R_in"] + 0.05, S["S2a"]["R_out"], "STEP 2", "w", 0),
    ("s2", S["S2b"]["R_in"] + 0.1, S["S2b"]["R_out"], "STOP ✕ BORING CLIP", "r", 0),
    ("s2go", S["S2d"]["R_in"] + 0.1, S["S2d"]["R_out"], "START ✓ RECORD THE MOOD", "g", 0),
    ("s3", at("S3a", 1), S["S3a"]["R_out"], "3 · STOP ✕ WALLS OF TEXT", "r", 0),
    ("s3go", at("S3b", 4) + 0.15, S["S3b"]["R_out"], "START ✓ PAUSES + DOTS", "g", 0),
    ("b1", at("B1", 1), S["B1"]["R_out"], "BONUS · STOP ✕ [EXCITED] TAGS", "r", 0),
    ("b2", at("B2", 4), S["B2"]["R_out"], "IT READS THEM OUT LOUD 😭", "w", 0),
    ("acting", at("R1", 7), S["R1"]["R_out"], "IT COPIES YOUR ACTING", "y", 0),
    ("clone", S["R1"]["R_out"], TOTAL, "🤖 THIS LINE = MY AI CLONE", "w", 0),
    ("desc", S["CTA"]["R_in"] + 0.6, TOTAL, "LINK + SETUP ↓ DESCRIPTION", "y", 1),
]
chips = [f'<div id="k-{c}" class="chip row{row} c{col} clip" data-start="{round(a, 3)}" data-duration="{round(b - a, 3)}" data-track-index="5"><span>{html.escape(t)}</span></div>'
         for c, a, b, t, col, row in CHIPS]

# ---------------------------------------------------------------- Ali's takes as video clips; the freeze-frame ending
videos = [f'<video id="v-{s["id"]}" class="clip" data-start="{s["R_in"]}" data-duration="{round(s["R_out"] - s["R_in"], 3)}" '
          f'data-media-start="{s["src_in"]}" data-track-index="0" src="assets/footage/{s["src"]}.mp4" muted playsinline></video>'
          for s in T["segs"] if s["kind"] == "A"]
FREEZE = (S["R1"]["R_out"], TOTAL)
ALI_SEGS = [[s["R_in"], s["R_out"]] for s in T["segs"] if s["kind"] == "A"]
WHIPS = [(S["S1a"]["R_in"], -1), (S["S2a"]["R_in"], 1), (S["S3a"]["R_in"], -1), (S["B1"]["R_in"], 1)]
PUNCHES = [S["S2b"]["R_in"], S["R1"]["R_in"]]

cfg = dict(TOTAL=TOTAL, CAPS=cap_js, PANELS=[[p[0], round(p[1], 3), round(p[2], 3)] for p in PANELS],
           CHIPS=[[c[0], round(c[1], 3), round(c[2], 3)] for c in CHIPS], SEGS=ALI_SEGS, WHIPS=WHIPS, PUNCHES=PUNCHES, FREEZE=FREEZE,
           TRAILER=[[k, round(G + t, 3)] for k, (_, t) in enumerate(TRAILER)], GOOD_END=S["GOOD"]["R_out"],
           BAD=[S["BAD"]["R_in"], S["BAD"]["R_out"]], VOX=at("S1b", 6), EXC=[S["EXC"]["R_in"], S["EXC"]["R_out"]],
           SCRIPT_T=[PANELS[4][1] + 0.25, PANELS[4][1] + 1.2])
doc = open("reel.template.html").read()
doc = (doc.replace("__TOTAL__", str(TOTAL)).replace("__VIDEOS__", "\n        ".join(videos))
       .replace("__FREEZE_START__", str(FREEZE[0])).replace("__FREEZE_DUR__", str(round(FREEZE[1] - FREEZE[0], 3)))
       .replace("__PANELS__", "\n      ".join(panels)).replace("__CHIPS__", "\n      ".join(chips))
       .replace("__CAPS__", "\n      ".join(cap_html)).replace("__CFG__", json.dumps(cfg, ensure_ascii=False)))
assert "__" not in doc.replace("window.__timelines", "")
open("hf/index.html", "w").write(doc)
json.dump({"total": TOTAL, "panels": cfg["PANELS"], "chips": cfg["CHIPS"], "whips": WHIPS, "punches": PUNCHES, "trailer": cfg["TRAILER"],
           "segs": T["segs"], "vox": cfg["VOX"], "script": cfg["SCRIPT_T"], "freeze": FREEZE,
           "stamp_bad": S["BAD"]["R_in"] + 1.4, "stamp_good": S["GOOD"]["R_out"] - 0.25, "everything": G + 6.56,
           "bubble": S["EXC"]["R_in"] + 0.5}, open("cut/events.json", "w"), indent=1)
print("reel:", TOTAL, "s |", len(videos), "takes |", len(caps), "captions |", len(panels), "panels |", len(chips), "cards")
