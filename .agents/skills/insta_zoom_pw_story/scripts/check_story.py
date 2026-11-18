#!/usr/bin/env python3
"""Check a script written in the insta_zoom_pw_story pattern (Python 3, no installs).

  python3 check_story.py script.md              beats, word limits, length, midpoint, chain hints
  python3 check_story.py script.md --clean      print the Script | Action table to show Ali, with count and length
  python3 check_story.py script.md --wps 2.6    pace for the length: words a second, pauses included

The file holds one markdown table, | Beat | Script | Action |, one row per beat, in this order:
claim, proof, promise, anchor, question, step (3 to 5 rows), name, read (optional), why, recipe, catch, close.
Text outside the table is ignored. Exit code 1 when a check fails.
"""
import argparse
import re
import sys

LIMIT = {"claim": 20, "proof": 26, "promise": 12, "anchor": 18, "question": 18, "step": 16, "name": 14, "read": 16,
         "why": 28, "recipe": 30, "catch": 16, "close": 30}
SHAPE = r"claim proof promise anchor question (step ){3,5}name (read )?why recipe catch close "
ORDER = "claim, proof, promise, anchor, question, step x3-5, name, read (optional), why, recipe, catch, close"
MID = (40, 62)            # the name beat starts in this share of the words (the reference: 51%)
LENGTH = (60, 100, 120)   # seconds: aim low, aim high, never over
LONG_SENTENCE, LONG_WORD = 20, 13
STOP = set("""a about after again all alone already also an and any are as at be because been before but by can
could did do does each either every for from get gets got had has have here how if in into is it its just let like
many may me more most much my never next no not now of on once one only or other our out over own same so some such
than that the their them then there these they this those to too up very was way we well what when where which while
who why will with would you your yours tell tells make makes made put puts take takes thing things""".split())


def words(text):
    return re.findall(r"[A-Za-z0-9][A-Za-z0-9'’%-]*", text)


def sentences(text):
    return [s for s in re.split(r"(?<=[.?!])\s+", text.strip()) if s]


def content(text):
    out = []
    for w in words(text.lower()):
        w = w.replace("’", "'").split("'")[0]
        if len(w) > 3 and w.endswith("s") and not w.endswith("ss"):
            w = w[:-1]
        if len(w) > 2 and w not in STOP and not w.isdigit():
            out.append(w)
    return out


def parse(path):
    rows = []
    for line in open(path, encoding="utf-8"):
        line = line.strip()
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in re.split(r"(?<!\\)\|", line.strip("|"))]
        beat = re.sub(r"[^a-z]", "", cells[0].lower())
        if beat in LIMIT and len(cells) >= 2:
            rows.append((beat, cells[1], cells[2] if len(cells) > 2 else ""))
    return rows


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("script")
    ap.add_argument("--clean", action="store_true", help="print the Script | Action table only")
    ap.add_argument("--wps", type=float, default=2.6, help="words a second, pauses included (default 2.6)")
    ap.add_argument("--allow-gate", action="store_true", help='allow a "comment X and I will send it" close')
    a = ap.parse_args()

    rows = parse(a.script)
    if not rows:
        sys.exit("No beat rows found. The file needs a table: | Beat | Script | Action |")
    counts = [len(words(s)) for _, s, _ in rows]
    total = sum(counts)
    secs = total / a.wps

    if a.clean:
        print("| Script | Action |\n|---|---|")
        for _, s, act in rows:
            print(f"| {s} | {act} |")
        print(f"\n{total} words, about {secs:.0f} s at {a.wps:g} words a second.")
        return

    fails, hints = [], []
    beats = [b for b, _, _ in rows]
    if not re.fullmatch(SHAPE, " ".join(beats) + " "):
        fails.append(f"beats are out of order or one is missing. Want: {ORDER}. Got: {', '.join(beats)}")

    chain_on, seen, step_no = False, [], 0
    print(f"{'beat':<10}{'words':>6}{'max':>5}  {'':<5}chain")
    for i, (beat, text, _) in enumerate(rows):
        n, mx = counts[i], LIMIT[beat]
        step_no += beat == "step"
        label = f"step {step_no}" if beat == "step" else beat
        if n > mx:
            fails.append(f"{label}: {n} words, the limit is {mx}")
        if beat == "step" and len(sentences(text)) != 1:
            hints.append(f"{label}: a step is one sentence, this has {len(sentences(text))}")
        for s in sentences(text):
            if len(words(s)) > LONG_SENTENCE:
                hints.append(f"{label}: a sentence of {len(words(s))} words is hard to say (keep to {LONG_SENTENCE})")
        for w in words(text):
            if len(w) >= LONG_WORD:
                hints.append(f'{label}: "{w}" is a long word, is there a simpler one?')

        cw, link = content(text), ""
        if beat == "step" and step_no == 1:
            chain_on = True
        if chain_on and seen:
            prev = [w for w in cw if w in seen[-1][1]]
            if prev:
                link = f"<- {prev[0]}"
            else:
                far = next(((w, lab) for lab, ws in reversed(seen[:-1]) for w in cw if w in ws), None)
                link = f"<- {far[0]} (from {far[1]})" if far else "no link: does it pick up the last sentence?"
        if beat == "recipe":
            chain_on = False
        seen.append((label, set(cw)))
        print(f"{label:<10}{n:>6}{mx:>5}  {'ok' if n <= mx else 'OVER':<5}{link}")

    def row(name):
        return next((t for b, t, _ in rows if b == name), "")

    if row("claim") and not re.search(r"\byou(r|rs)?\b", row("claim").lower()):
        hints.append('claim: no "you" or "your", is it about the viewer\'s own day?')
    if row("proof") and not re.search(r"\d", row("proof")):
        fails.append("proof: needs one number (write it in digits)")
    if row("proof") and not any(w[0].isupper() and w not in ("AI", "I") for s in sentences(row("proof")) for w in words(s)[1:]):
        hints.append("proof: name who did it (a university, a company, a person)")
    if row("question") and row("question").count("?") != 1:
        fails.append("question: must be exactly one question")
    if not a.allow_gate and re.search(r"\bcomment\b[^.?!]*\b(send|dm|message|link)\b", row("close").lower()):
        fails.append('close: a gate ("comment X and I will send it"). Put it in the description instead')
    if "name" in beats:
        at = 100 * sum(counts[:beats.index("name")]) / total
        ok = MID[0] <= at <= MID[1]
        print(f"\nname starts at {at:.0f}% of the words (want {MID[0]} to {MID[1]}%)")
        if not ok:
            fails.append(f"name starts at {at:.0f}% of the words, the middle is {MID[0]} to {MID[1]}%")
    print(f"total {total} words, about {secs:.0f} s at {a.wps:g} words a second (aim {LENGTH[0]} to {LENGTH[1]} s, never over {LENGTH[2]} s)")
    if secs > LENGTH[2]:
        fails.append(f"about {secs:.0f} s, the limit is {LENGTH[2]} s: cut words, not beats")
    elif not LENGTH[0] <= secs <= LENGTH[1]:
        hints.append(f"about {secs:.0f} s, the aim is {LENGTH[0]} to {LENGTH[1]} s")

    for h in hints:
        print("hint  " + h)
    for f in fails:
        print("FAIL  " + f)
    print("PASS" if not fails else f"{len(fails)} to fix")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
