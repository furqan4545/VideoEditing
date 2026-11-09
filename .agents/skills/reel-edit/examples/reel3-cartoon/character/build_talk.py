# Fills the talk scene from the voice track: mouth data, line timings, and every scene's start/length.
# Each language segment starts 0.22 s before its line (the head-shake + whoosh), the first at 0.
import json, re
m = json.load(open("mouth.json")); t = json.load(open("timing.json"))
keys = {"EN": "en", "ES": "es", "JA": "ja", "FR": "fr", "ZH": "zh", "EN2": "punch"}
lines = t["lines"]; total = t["total"]
starts = [0.0] + [round(l["start"] - 0.22, 2) for l in lines[1:]]
ends = starts[1:] + [total]
s = open("talk.template.html").read()
for l, a, b in zip(lines, starts, ends):
    k = keys[l["tag"]]
    s = s.replace("{S_%s}" % k, f"{a:g}").replace("{D_%s}" % k, f"{round(b - a, 2):g}")
s = s.replace("__ENTER__", json.dumps([[keys[l["tag"]], a] for l, a in zip(lines, starts)]))
s = s.replace("__MOUTH__", json.dumps(m, separators=(",", ":")))
s = s.replace("__LINES__", json.dumps([{"tag": l["tag"], "start": l["start"], "end": l["end"]} for l in lines]))
s = s.replace("__TOTAL__", str(total))
s = s.replace("__REF__", json.dumps([{"start": l["start"], "end": l["end"]} for l in lines]))  # same clock: no remap
assert "{S_" not in s and "{D_" not in s
open("hf/compositions/talk.html", "w").write(s)

# root: length, scene slot, voice length, one whoosh 0.25 s before each switch
idx = open("hf/index.html").read()
idx = re.sub(r'(id="root"[^>]*?data-duration=")[\d.]+', rf"\g<1>{total}", idx, flags=re.S)
idx = re.sub(r'(id="talk"[^>]*?data-duration=")[\d.]+', rf"\g<1>{total}", idx, flags=re.S)
idx = re.sub(r'(id="voice"[^>]*?data-duration=")[\d.]+', rf"\g<1>{total}", idx)
for sid, l in zip(["sw-es", "sw-ja", "sw-fr", "sw-zh", "sw-punch"], lines[1:]):
    idx = re.sub(rf'(id="{sid}"[^>]*?data-start=")[\d.]+', rf"\g<1>{round(l['start'] - 0.25, 2)}", idx)
open("hf/index.html", "w").write(idx)
print("segments:", [(keys[l["tag"]], a, round(b - a, 2)) for l, a, b in zip(lines, starts, ends)], "total", total)
