"""After tools/events.py: small timing tweaks for the mix (the picture's own times stay in the shots).
 - the first alarm starts just after the "b" of "beeps" (6.62 -> 6.80) so the word stays clear."""
import json
ev = json.load(open("sound/events.json"))
for e in ev:
    if e["kind"] == "alarm" and abs(e["t"] - 6.62) < 0.05: e["t"] = 6.80; e["dur"] = 0.75
json.dump(sorted(ev, key=lambda e: e["t"]), open("sound/events.json", "w"), indent=1)
