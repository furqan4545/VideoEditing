# Writes hf/index.html for reel 5 ("How human can a FREE AI voice get?") from cut/timeline.json and the per-piece
# word timings in cut/words/. One take; while an AI level plays the picture is Ali's real reaction. Every take
# change hides behind a whip or a punch-in. A TikTok-style title stays up the whole time, the demo card sits above
# Ali's head (level, setting, the exact typed text with the change marked, spoken words going black, a waveform of
# the AI voice), and Ali's own lines get plain TikTok captions.
import json, os, html, re
import numpy as np, soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
os.chdir(HERE)
T = json.load(open("cut/timeline.json"))
TOTAL = T["total"]
S = {s["id"]: s for s in T["segs"]}

# Ali's caption text per piece (his words as he said them)
CAPTXT = {
    "HOOK": "This free AI tool says it's not a robot. Let's test it.",
    "LV1": "Level one.",
    "YA": "Yeah, you are.",
    "BET": "Hmm… better. Now make it nervous.",
    "OFF": "Now offended.",
    "LAU": "Okay. Make it laugh.",
    "MYV": "Now use my voice.",
    "AMI": "Am I?",
    "END": "It's free. Everything in the description.",
}

# the card, per level: what was typed into the generator ({...} = this level's change, marked yellow), the setting
LEVEL = {
    1: ("L1", "🤖 Old computer voice", "hello i am not a robot i am a real human"),
    2: ("L2", "✏️ + Punctuation", "Hi{...} I'm not a robot{.} I promise{.}"),
    3: ("L3", "😰 Emotion: nervous", "{(very nervous and scared, voice shaking, stammering)} Why are you staring? I'm... I'm not a robot."),
    4: ("L4", "😤 Emotion: offended", "{(offended, sassy, annoyed, dramatic)} Excuse me? Robots don't get offended. And I am VERY offended."),
    5: ("L5", "😂 + Laugh tag", "{[laughter]} Me? A robot? That's the funniest thing I've heard all day."),
    6: ("L6", "🎙️ Voice: my own clone", "{(soft whisper, close to the microphone, slow and eerie)} Relax. I'm not the robot... you are."),
}


def whisper(sid):
    return json.load(open(f"cut/words/{sid}.json"))["words"]


def spread(mine, ww, base):
    """intended words with reel times: Whisper's times when the counts match, else spread by length"""
    if len(ww) == len(mine):
        return [(m, round(base + w["start"], 3), round(base + w["end"], 3)) for m, w in zip(mine, ww)]
    a, b = base + ww[0]["start"], base + ww[-1]["end"]
    L = [max(2, len(re.sub(r"\W", "", m))) for m in mine]; tot, acc, out = sum(L), 0, []
    for m, n in zip(mine, L):
        t0 = a + (b - a) * acc / tot; acc += n
        out.append((m, round(t0, 3), round(a + (b - a) * acc / tot, 3)))
    return out


WORDS = {sid: spread(CAPTXT[sid].split(), whisper(sid), S[sid]["R_in"]) for sid in CAPTXT}
at = lambda sid, k: WORDS[sid][k][1]


def chunks(ws, maxw=3):
    out, cur = [], []
    for w in ws:
        cur.append(w)
        if len(cur) >= maxw or re.search(r"[.,:?!…]$", w[0]):
            out.append(cur); cur = []
    if cur: out.append(cur)
    return out


caps, i = [], 0
for sid in CAPTXT:
    for ch in chunks(WORDS[sid]):
        inner = " ".join(f'<span id="cw{i}_{k}">{html.escape(w)}</span>' for k, (w, _, _) in enumerate(ch))
        caps.append([i, ch[0][1], ch[-1][2], inner, [[k, a, b] for k, (_, a, b) in enumerate(ch)]]); i += 1
for k in range(len(caps)):                 # hold each caption until the next starts (max +0.35 s)
    end = caps[k][2] + 0.35
    if k + 1 < len(caps): end = min(end, caps[k + 1][1])
    caps[k][2] = round(max(end, caps[k][1] + 0.3), 3)
caps[-1][2] = TOTAL
cap_html = [f'<div id="cap{c[0]}" class="cap clip" data-start="{c[1]}" data-duration="{round(c[2] - c[1], 3)}" data-track-index="6"><div class="capbox">{c[3]}</div></div>' for c in caps]

# ---------------------------------------------------------------- the card
SWITCH = {1: 0.0, 2: at("YA", 2) - 0.05, 3: at("BET", 5), 4: at("OFF", 1), 5: at("LAU", 3), 6: at("MYV", 3)}
CARD_END = round(S["END"]["R_in"] + 0.2, 3)
texts, levels_html, chips_html, spoken, levels = [], [], [], [], []
for L, (sid, chip, typed) in LEVEL.items():
    toks = re.findall(r"\{[^}]*\}|[^\s{}]+|\s+", typed)
    spoken_toks = [t for t in toks if not t.startswith("{") and not t.isspace()]
    times = spread(spoken_toks, whisper(sid), S[sid]["R_in"])
    parts, k = [], 0
    for t in toks:
        if t.isspace(): parts.append(" ")
        elif t.startswith("{"): parts.append(f'<mark class="tk">{html.escape(t[1:-1])}</mark>')
        else:
            parts.append(f'<span id="w{L}_{k}" class="tk">{html.escape(t)}</span>'); spoken.append([f"w{L}_{k}", times[k][1]]); k += 1
    texts.append(f'<div id="lt{L}" class="lt{" robot" if L == 1 else ""}">{"".join(parts)}</div>')
    levels_html.append(f'<div id="lvn{L}" class="lvn">LEVEL {L}<i>/6</i></div>')
    chips_html.append(f'<div id="chip{L}" class="chip">{html.escape(chip)}</div>')
    t1 = SWITCH[L + 1] if L < 6 else CARD_END
    levels.append([L, round(SWITCH[L], 3), round(t1, 3), len([t for t in toks if not t.isspace()])])

# waveform: the AI voices' loudness on the reel clock, 30 fps, each level scaled to its own loud parts
y, sr = sf.read("sound/demo_raw.wav"); hop = sr // 30
rms = np.array([np.sqrt((y[j:j + hop] ** 2).mean()) for j in range(0, len(y) - hop, hop)]) + 1e-9
env = np.zeros(len(rms))
for L, (sid, _, _) in LEVEL.items():
    a, b = int(S[sid]["R_in"] * 30), int(S[sid]["R_out"] * 30) + 1
    seg = 20 * np.log10(rms[a:b]); top = np.percentile(seg, 95)
    env[a:b] = np.clip((seg - (top - 30)) / 30, 0, 1) ** 1.3
ENV = [round(float(v), 2) for v in env[: int(TOTAL * 30) + 1]]

# ---------------------------------------------------------------- picture: shots, whips / punch-ins, freeze
videos = [f'<video id="v{k}" class="clip" data-start="{r0}" data-duration="{round(r1 - r0, 3)}" data-media-start="{s0}" '
          f'data-track-index="0" src="assets/footage/IMG_3438.mp4" muted playsinline></video>'
          for k, (r0, r1, s0) in enumerate(T["video"])]
SHOTS = [[r0, r1] for r0, r1, _ in T["video"]]
PUNCHLINE = next(k for k, (r0, _) in enumerate(SHOTS) if abs(r0 - (S["L6"]["R_in"] - 0.14)) < 0.02)
KIND = ["P", "W-", "P", "W+", "W-", "P", "W+", "P", "W-", "P"]   # one per take change, in order
assert len(KIND) == len(T["cuts"]), (len(KIND), T["cuts"])
WHIPS = [(t, -1 if k == "W-" else 1) for t, k in zip(T["cuts"], KIND) if k.startswith("W")]
PUNCHES = [t for t, k in zip(T["cuts"], KIND) if k == "P"]
FREEZE = (S["END"]["R_out"], TOTAL)

cfg = dict(TOTAL=TOTAL, CAPS=[[c[0], c[1], c[4]] for c in caps], SHOTS=SHOTS, PUNCHLINE=PUNCHLINE, WHIPS=WHIPS, PUNCHES=PUNCHES,
           FREEZE=FREEZE, LEVELS=levels, SPOKEN=spoken, CARD_END=CARD_END, ENV=ENV)
doc = open("reel.template.html").read()
doc = (doc.replace("__TOTAL__", str(TOTAL)).replace("__VIDEOS__", "\n        ".join(videos))
       .replace("__FREEZE_START__", str(FREEZE[0])).replace("__FREEZE_DUR__", str(round(FREEZE[1] - FREEZE[0], 3)))
       .replace("__CARD_END__", str(CARD_END)).replace("__LEVELS__", "".join(levels_html)).replace("__CHIPS__", "".join(chips_html))
       .replace("__TEXTS__", "\n          ".join(texts)).replace("__BARS__", "<b></b>" * 34)
       .replace("__CAPS__", "\n      ".join(cap_html)).replace("__CFG__", json.dumps(cfg, ensure_ascii=False)))
assert "__" not in doc.replace("window.__timelines", "")
open("hf/index.html", "w").write(doc)
json.dump({"total": TOTAL, "segs": T["segs"], "whips": WHIPS, "punches": PUNCHES, "freeze": FREEZE, "levels": levels,
           "card_end": CARD_END, "panels": [], "chips": []}, open("cut/events.json", "w"), indent=1, ensure_ascii=False)
print("reel:", TOTAL, "s |", len(videos), "shots |", len(caps), "captions | levels at", [l[1] for l in levels])
