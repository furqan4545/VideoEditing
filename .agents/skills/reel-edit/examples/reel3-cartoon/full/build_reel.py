# Writes hf/index.html for reel 3 from cut/timeline.json: Ali's takes, the cartoon, the four hand
# transitions (zoom through a hand into the matching hand), whips and punch-ins that hide every other
# take change, full-frame tool panels, keyword chips and word-highlight captions. One clock (reel time).
import json, os, html
HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
T = json.load(open("cut/timeline.json"))
TOTAL = T["total"]
SEGS = {s["id"]: s for s in T["segs"]}
LINES = {l["tag"]: l for l in T["toon_lines"]}
HANDS = json.load(open("cut/hands.json"))  # zoom-through targets (px in the 1080x1920 frame)


def R(sid, src):
    """source time in segment sid -> reel time"""
    s = SEGS[sid]
    return round(s["R_in"] + src - s["src_in"], 3)


# ---------------------------------------------------------------- captions (Ali only; the cartoon has its own)
CAPS = [
    ("A1", "ElevenLabs is never", 0.00, 0.74), ("A1", "going to sponsor me", 0.74, 1.66), ("A1", "for revealing", 1.66, 2.24),
    ("A1", "this GitHub repo.", 2.24, 3.30), ("A1", "Watch.", 3.40, 3.95),
    ("A2", "Nope.", 2.20, 2.76),
    ("A3", "Not a voice actor.", 22.46, 23.32), ("A3", "Not ElevenLabs.", 23.38, 24.30), ("A3", "It's VoiceStudio.", 24.40, 25.50),
    ("A4", "A free GitHub repo", 25.98, 26.92), ("A4", "running locally", 26.92, 27.76), ("A4", "on my laptop.", 27.76, 28.50),
    ("A5", "It's like a parrot.", 0.94, 1.76), ("A5", "Give it 10 seconds", 1.86, 2.45), ("A5", "of your voice", 2.45, 3.01),
    ("A5", "and it can say", 3.01, 3.59), ("A5", "anything you want.", 3.59, 4.45),
    ("A6", "Need a new voice?", 1.60, 2.70),
    ("A7", "Order it like", 7.78, 8.52), ("A7", "pizza:", 8.56, 9.12), ("A7", "old,", 9.36, 9.90), ("A7", "deep,", 9.90, 10.32),
    ("A7", "grumpy.", 10.38, 10.95),
    ("A8", "And it speaks", 0.52, 1.10), ("A8", "over 600", 1.10, 1.92), ("A8", "languages.", 1.92, 2.82),
    ("A9", "But I didn't click", 0.64, 1.36), ("A9", "a single button.", 1.36, 2.32),
    ("A10", "I gave Claude", 17.46, 18.29), ("A10", "the TV remote.", 18.29, 19.02), ("A10", "That's what MCP means.", 19.04, 20.52),
    ("A11", "Told it:", 28.04, 28.67), ("A11", "make me old,", 28.67, 29.60), ("A11", "grumpy man", 29.60, 30.39),
    ("A11", "that speaks", 30.39, 30.93), ("A11", "five languages.", 30.93, 31.95),
    ("A12", "Say hi, old man.", 38.98, 40.40),
    ("A13", "Link and setup", 100.56, 101.28), ("A13", "are in the description.", 101.28, 102.24), ("A13", "Sorry, ElevenLabs.", 102.30, 103.60),
]

# ---------------------------------------------------------------- full-frame tool panels (each hides a take change)
# id, in, out, label html, image, sub label
PANELS = [
    ("home", R("A3", 24.30), R("A4", 26.20), 'IT\'S <b>VOICESTUDIO</b><br>FREE ON GITHUB', "01-home.png", ""),
    ("clone", R("A4", 28.30), R("A5", 2.36), 'LIKE A <b>PARROT</b> 🦜', "02-clone-drop-or-record.png", "10 seconds of you"),
    ("design", R("A6", 2.58), R("A7", 8.58), 'ORDER A VOICE<br>LIKE <b>PIZZA</b> 🍕', "03-design-pirate-prompt.png", ""),
    ("langs", R("A7", 10.95) - 0.12, R("A8", 2.00), '', "04-dubbing-steps.png", "languages · dub any video"),
    ("claude", R("A9", 2.20), R("A10", 19.00), '<b>CLAUDE</b> GOT<br>THE TV REMOTE 📺', "07-claude-code-mcp.png", ""),
    ("prompt", R("A10", 20.40), R("A11", 30.40), '', None, ""),
]
PROMPT = "make me an old grumpy man who speaks 5 languages"

# ---------------------------------------------------------------- keyword chips in the band above Ali's head
# id, in, out, text, colour ('y' yellow, 'r' red, 'w' white), stack row
CHIPS = [
    ("hook1", 0.0, 3.36, "ELEVENLABS WILL", "w", 0), ("hook2", 0.0, 3.36, "NEVER SPONSOR ME", "y", 1),
    ("nva", R("A3", 22.46), R("A3", 24.30), "✕ NOT A VOICE ACTOR", "r", 0), ("nel", R("A3", 23.38), R("A3", 24.30), "✕ NOT ELEVENLABS", "r", 1),
    ("free", R("A4", 26.20), R("A4", 28.30), "FREE", "y", 0), ("gh", R("A4", 26.45), R("A4", 28.30), "ON GITHUB", "w", 1),
    ("lap", R("A4", 27.40), R("A4", 28.30), "RUNS ON MY LAPTOP", "y", 2),
    ("any", R("A5", 3.55), R("A5", 4.45), "SAYS ANYTHING", "y", 0),
    ("old", R("A7", 9.36), R("A7", 10.95) - 0.12, "OLD", "y", 0), ("deep", R("A7", 9.90), R("A7", 10.95) - 0.12, "DEEP", "w", 1),
    ("grumpy", R("A7", 10.38), R("A7", 10.95) - 0.12, "GRUMPY", "y", 2),
    ("l646", R("A8", 2.00), R("A8", 2.82), "646 LANGUAGES", "y", 0),
    ("zero", R("A9", 1.10), R("A9", 2.20), "0 CLICKS", "y", 0),
    ("mcp", R("A10", 19.40), R("A10", 20.40), "MCP = THE REMOTE", "y", 0),
    ("five", R("A11", 30.80), R("A11", 31.95), "5 LANGUAGES", "y", 0),
    ("desc", R("A13", 100.56), R("A13", 102.30), "LINK + SETUP ↓ DESCRIPTION", "y", 0),
    ("sorry", R("A13", 102.30), TOTAL, "SORRY, ELEVENLABS", "r", 0),
]

# ---------------------------------------------------------------- the four hand transitions + whips/punches
TOON_START, TOON_END = T["toon_start"], T["toon_end"]
ES_END, JA_START, PUNCH_END = LINES["ES"]["end"], LINES["JA"]["start"], LINES["EN2"]["end"]
T1 = dict(out0=3.92, out1=4.28, in0=4.22, in1=4.74)                                  # palm -> cartoon palm
T2 = dict(out0=ES_END - 0.22, out1=ES_END + 0.10, in0=SEGS["A2"]["R_in"], in1=SEGS["A2"]["R_in"] + 0.42)
T3 = dict(out0=SEGS["A12"]["R_out"] - 0.32, out1=SEGS["A12"]["R_out"], in0=SEGS["A12"]["R_out"] - 0.05, in1=SEGS["A12"]["R_out"] + 0.45)
T4 = dict(out0=PUNCH_END - 0.02, out1=SEGS["A13"]["R_in"] + 0.04, in0=SEGS["A13"]["R_in"], in1=SEGS["A13"]["R_in"] + 0.45)
WHIPS = [(SEGS["A3"]["R_in"], -1), (SEGS["A6"]["R_in"], 1), (SEGS["A12"]["R_in"], -1)]
PUNCHES = [SEGS["A9"]["R_in"]]
TOON_SHOW = [(T1["in0"], T2["out1"]), (T3["in0"], T4["out1"])]


def chunk_spans(text, t0, t1):
    words = text.split()
    w8 = [max(2, len(w.strip(",.:?!"))) for w in words]
    tot, acc, out = sum(w8), 0, []
    for w, n in zip(words, w8):
        a = t0 + (t1 - t0) * acc / tot
        acc += n
        out.append((w, round(a, 3), round(t0 + (t1 - t0) * acc / tot, 3)))
    return out


videos, caps, panels, chips = [], [], [], []
for s in T["segs"]:
    videos.append(f'<video id="v-{s["id"]}" class="clip" data-start="{s["R_in"]}" data-duration="{round(s["R_out"] - s["R_in"], 3)}" '
                  f'data-media-start="{s["src_in"]}" data-track-index="0" src="assets/footage/{s["take"]}.mp4" muted playsinline></video>')
cap_js = []
for i, (sid, text, a, b) in enumerate(CAPS):
    t0, t1 = R(sid, a), R(sid, b)
    spans = chunk_spans(text, t0, t1)
    inner = " ".join(f'<span id="cw{i}_{k}">{html.escape(w)}</span>' for k, (w, _, _) in enumerate(spans))
    caps.append(f'<div id="cap{i}" class="cap clip" data-start="{t0}" data-duration="{round(t1 - t0, 3)}" data-track-index="6"><div class="capbox">{inner}</div></div>')
    cap_js.append([i, t0, [[k, ws, we] for k, (_, ws, we) in enumerate(spans)]])
for pid, a, b, label, img, sub in PANELS:
    if pid == "langs":
        body = (f'<div class="big"><span id="count646">0</span></div><div id="pl-{pid}" class="lbl small">LANGUAGES</div>'
                f'<img id="pb-{pid}" class="card narrow" src="assets/shots/{img}" />')
    elif pid == "prompt":
        body = (f'<div id="pl-{pid}" class="lbl">I JUST TOLD <b>CLAUDE</b>:</div><div id="pb-{pid}" class="term"><div class="bar"><i></i><i></i><i></i><span>claude</span></div>'
                f'<div class="line"><em>&gt;</em> <span id="ptext"></span><u id="caret"></u></div></div>')
    else:
        body = f'<div id="pl-{pid}" class="lbl">{label}</div><img id="pb-{pid}" class="card" src="assets/shots/{img}" />'
    if sub:
        body += f'<div id="ps-{pid}" class="sub">{html.escape(sub)}</div>'
    panels.append(f'<div id="p-{pid}" class="panel clip" data-start="{round(a, 3)}" data-duration="{round(b - a, 3)}" data-track-index="4">'
                  f'<div class="pin">{body}</div></div>')
for cid, a, b, text, col, row in CHIPS:
    chips.append(f'<div id="k-{cid}" class="chip row{row} c{col} clip" data-start="{round(a, 3)}" data-duration="{round(b - a, 3)}" data-track-index="5">'
                 f'<span>{html.escape(text)}</span></div>')

cfg = dict(TOTAL=TOTAL, T1=T1, T2=T2, T3=T3, T4=T4, HANDS=HANDS, WHIPS=WHIPS, PUNCHES=PUNCHES, TOON_SHOW=TOON_SHOW,
           SEGS=[[s["R_in"], s["R_out"]] for s in T["segs"]], CAPS=cap_js, PANELS=[[p[0], round(p[1], 3), round(p[2], 3), bool(p[5])] for p in PANELS],
           CHIPS=[[c[0], round(c[1], 3), round(c[2], 3)] for c in CHIPS], PROMPT=PROMPT,
           PROMPT_T=[R("A11", 28.20), R("A11", 30.30)], COUNT_T=[PANELS[3][1] + 0.18, PANELS[3][1] + 0.95])

doc = open("reel.template.html").read()
doc = (doc.replace("__TOTAL__", str(TOTAL)).replace("__VIDEOS__", "\n        ".join(videos))
       .replace("__TOON_START__", str(TOON_START)).replace("__TOON_DUR__", str(round(TOON_END - TOON_START, 3)))
       .replace("__PANELS__", "\n      ".join(panels)).replace("__CHIPS__", "\n      ".join(chips))
       .replace("__CAPS__", "\n      ".join(caps)).replace("__CFG__", json.dumps(cfg, ensure_ascii=False)))
assert "__" not in doc.replace("window.__timelines", "").replace("__hyperframes", "")
open("hf/index.html", "w").write(doc)
print("reel:", TOTAL, "s |", len(videos), "takes |", len(caps), "captions |", len(panels), "panels |", len(chips), "chips")
print("T1", T1, "\nT2", T2, "\nT3", T3, "\nT4", T4)

# every visual event, for the sound mix (sound/mix.py)
json.dump({"total": TOTAL, "T1": T1, "T2": T2, "T3": T3, "T4": T4, "whips": WHIPS, "punches": PUNCHES,
           "panels": [[p[0], round(p[1], 3), round(p[2], 3)] for p in PANELS], "chips": [[c[0], round(c[1], 3), round(c[2], 3)] for c in CHIPS],
           "count": cfg["COUNT_T"], "prompt": cfg["PROMPT_T"],
           "click_word": R("A9", 1.18), "remote_word": R("A10", 18.45), "thumbs_up_ali": R("A13", 103.0),
           "hook_watch": R("A1", 3.36), "lines": T["toon_lines"], "segs": [[s["id"], s["R_in"], s["R_out"]] for s in T["segs"]]},
          open("cut/events.json", "w"), indent=1)
