# Builds the cartoon scene for the full reel from the character template:
# mouth shapes from the cartoon's voice on its own clock (toon/), line timing from cut/edl.py, and the
# hand gestures re-timed from the v5 timing they were written against (REF) onto this edit's timing.
import json, os, subprocess
HERE = os.path.dirname(os.path.abspath(__file__))
CHAR = os.path.join(HERE, "..", "character")
os.chdir(HERE)

subprocess.run(["uv", "run", "-q", "--with", "numpy", "--with", "soundfile", "python", os.path.join(CHAR, "mouth.py")],
               cwd=os.path.join(HERE, "toon"), check=True)
m = json.load(open("toon/mouth.json"))
t = json.load(open("toon/timing.json"))
ref = json.load(open(os.path.join(CHAR, "timing.json")))   # v5 timing (zh-old), what the hand keys were written for
keys = {"EN": "en", "ES": "es", "JA": "ja", "FR": "fr", "ZH": "zh", "EN2": "punch"}
lines, total = t["lines"], t["total"]
starts = [0.0] + [round(l["start"] - 0.22, 2) for l in lines[1:]]
ends = starts[1:] + [total]
s = open(os.path.join(CHAR, "talk.template.html")).read()
for l, a, b in zip(lines, starts, ends):
    k = keys[l["tag"]]
    s = s.replace("{S_%s}" % k, f"{a:g}").replace("{D_%s}" % k, f"{round(b - a, 2):g}")
s = s.replace("__ENTER__", json.dumps([[keys[l["tag"]], a] for l, a in zip(lines, starts)]))
s = s.replace("__MOUTH__", json.dumps(m, separators=(",", ":")))
s = s.replace("__LINES__", json.dumps([{"tag": l["tag"], "start": l["start"], "end": l["end"]} for l in lines]))
s = s.replace("__TOTAL__", str(total))
s = s.replace("__REF__", json.dumps([{"start": l["start"], "end": l["end"]} for l in ref["lines"]]))
assert "{S_" not in s and "{D_" not in s and "__" not in s.split("<script>")[1].split("window.__timelines")[0].replace("__MOUTH__", "")
open("hf/compositions/talk.html", "w").write(s)
print("cartoon scene:", total, "s;", [(keys[l["tag"]], a, round(b - a, 2)) for l, a, b in zip(lines, starts, ends)])
