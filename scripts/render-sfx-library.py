"""Render every sound in earshot's bank to a WAV file, plus an index.

Usage: <earshot venv python> render_bank.py OUT_DIR
"""
import json
import sys
import time
from pathlib import Path

from earshot.forge import bank
from earshot.forge.sfx import sfx_render

out = Path(sys.argv[1]).expanduser()
out.mkdir(parents=True, exist_ok=True)
info = {s["id"]: s for s in bank.list_sounds()}
rows, failed = [], []
t0 = time.time()
for sid in bank.ids():
    path = out / (sid + ".wav")
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        r = sfx_render(sid, out=str(path))
    except Exception as e:  # keep going; report at the end
        failed.append((sid, str(e)))
        continue
    meta = info.get(sid, {})
    clean = r.get("ok", r.get("clean")) if isinstance(r, dict) else None
    rows.append({
        "id": sid,
        "file": str(path.relative_to(out)),
        "seconds": round(meta.get("dur_s", 0.0), 3),
        "peak_at_s": round(meta.get("peak_s", 0.0), 3),
        "kinds": ", ".join(meta.get("kinds", [])),
        "audit_clean": clean,
    })

(out / "index.json").write_text(json.dumps(rows, indent=1))
lines = ["# earshot sound effects (%d)" % len(rows), "",
         "Rendered from the earshot bank (made in code; CC0-fitted ones credited in earshot docs/CREDITS_FIT.md).",
         "New takes, lengths, peak timing and pitch: `earshot sfx render ID -o x.wav --dur 0.8 --apex 0.3 --pitch E5`.", "",
         "| id | seconds | peak at | kinds |", "|---|---|---|---|"]
lines += ["| `%s` | %.2f | %.2f | %s |" % (r["id"], r["seconds"], r["peak_at_s"], r["kinds"]) for r in rows]
(out / "INDEX.md").write_text("\n".join(lines) + "\n")
print(json.dumps({"rendered": len(rows), "failed": failed[:10], "n_failed": len(failed),
                  "seconds": round(time.time() - t0, 1), "out": str(out)}))
