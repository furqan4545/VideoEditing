"""capplan.py - put every caption where it can be read (Ali on reel 40 v2: "captions are black so they get hidden on black
surface, move them on top or around if they come on top of black surface").

  ~/.local/share/onetake/.venv/bin/python tools/capplan.py            -> film/capplan.js (+ look/capplan.json)

For each caption chunk the film is drawn WITHOUT captions at 3 moments of the chunk, and the picture behind five caption
spots is measured (mean light, busyness, share of dark pixels). The chunk keeps the default spot (lower third, y 1385) in
dark ink when the picture there is light and calm; otherwise it moves to the first light, calm spot (lower, middle,
upper, top); if nothing is light it turns white with a dark halo where the picture is darkest. A chunk keeps the spot of
the chunk before it whenever that spot still works, so captions do not hop around.
"""
import asyncio, json, pathlib
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
GPU = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--allow-file-access-from-files", "--disable-web-security"]
ZONES = [("low", 1385), ("lower", 1560), ("mid", 1190), ("upper", 470), ("top", 300)]
JS = """async ([times, zones]) => {
  const cv = document.createElement('canvas'); cv.width = 270; cv.height = 480; const g = cv.getContext('2d', { willReadFrequently: true }); const out = [];
  for (const t of times) { await window.__seek(t); g.drawImage(KIT.renderer.domElement, 0, 0, 270, 480); const res = {};
    for (const [name, top] of zones) { const y0 = Math.round((top - 12) / 4), h = Math.round(84 / 4), d = g.getImageData(30, y0, 210, h).data; let s = 0, s2 = 0, dark = 0, n = 0;
      for (let i = 0; i < d.length; i += 4) { const L = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; s += L; s2 += L * L; if (L < 0.5) dark++; n++; }
      const m = s / n; res[name] = [m, Math.sqrt(Math.max(0, s2 / n - m * m)), dark / n]; }
    out.push(res); }
  return out; }"""


# windows (film seconds) where the caption must sit in a given spot: off Apple's alert photo, off the alert watch
OVERRIDE = [(92.4, 95.3, "lower", "pill"), (106.9, 109.9, "mid", "dark")]
ZPREF = {"low": 0.0, "lower": 0.05, "mid": 0.12, "upper": 0.15, "top": 0.2}


def bad(theme, st):
    m, sd, dk, mx = st
    if theme == "pill": return 0.25                                     # dark ink on a frosted white pill: always readable, a last resort
    if theme == "dark": return max(0, 0.66 - m) * 4 + max(0, dk - 0.05) * 4 + max(0, sd - 0.15) * 3
    return max(0, mx - 0.5) * 3 + max(0, sd - 0.2) * 3 + 0.15


def decide(rows):
    """one spot + ink per chunk for the whole film: clean spots first, then as few moves as possible (Viterbi)"""
    states = [(z, th) for z, _ in ZONES for th in ("dark", "light", "pill")]
    cost = []
    for r in rows:
        c = {}
        for z, th in states:
            v = 3 * bad(th, r["stats"][z]) + ZPREF[z]
            if z in ("upper", "top") and r["t"] < 2.2: v += 99          # the opening title sits there
            for (o0, o1, oz, oth) in OVERRIDE:                         # the film's own wishes: keep these off the key picture
                if o0 <= r["t"] <= o1: v += 0 if (z, th) == (oz, oth) else 6
            c[(z, th)] = v
        cost.append(c)
    best = [dict(cost[0])]; back = [{}]
    for i in range(1, len(rows)):
        gap = rows[i]["t"] - rows[i - 1]["t1"]; mv = 0.25 if gap > 0.6 else 0.5
        cur, bk = {}, {}
        for s2 in states:
            opts = [(best[-1][s1] + (mv if s1[0] != s2[0] else 0) + (0.25 if s1[1] != s2[1] else 0), s1) for s1 in states]
            v, s1 = min(opts); cur[s2] = v + cost[i][s2]; bk[s2] = s1
        best.append(cur); back.append(bk)
    s = min(best[-1], key=best[-1].get); path = [s]
    for i in range(len(rows) - 1, 0, -1): s = back[i][s]; path.append(s)
    path.reverse(); plan = {}
    for r, (z, th) in zip(rows, path):
        r["zone"], r["theme"] = z, th; plan[r["i"]] = {"top": dict(ZONES)[z], "theme": th}
        print(f"{r['i']:3d} {r['t']:6.2f} {z:6s} {th:5s} bad {bad(th, r['stats'][z]):.2f}  {r['text']}")
    return plan


def dark_ok(m, sd, dk):
    return m >= 0.66 and dk <= 0.05 and sd <= 0.15


def light_ok(m, sd, dk):
    return m <= 0.5 and sd <= 0.2


async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=GPU); pg = await b.new_page(viewport={"width": 1080, "height": 1920})
        await pg.goto((ROOT / "film/comp.html").as_uri() + "?nocaps=1"); await pg.evaluate("window.__ready")
        chunks = await pg.evaluate("StoryCaption.chunks.map(c => [c.show0, c.show1, c.words.map(w => w[0]).join(' ')])")
        rows = []
        for i, (a, bb, text) in enumerate(chunks):
            span = max(0.05, bb - a); times = [a + span * f for f in (0.12, 0.5, 0.88)]
            stats = await pg.evaluate(JS, [times, ZONES])
            agg = {}
            for name, _ in ZONES:
                ms = [s[name] for s in stats]
                agg[name] = (min(x[0] for x in ms), max(x[1] for x in ms), max(x[2] for x in ms), max(x[0] for x in ms))
            rows.append({"i": i, "t": round(a, 2), "t1": round(bb, 2), "text": text, "stats": {k: [round(x, 3) for x in v] for k, v in agg.items()}})
        await b.close()
    plan = decide(rows)
    (ROOT / "film/capplan.js").write_text("// written by tools/capplan.py: caption chunk -> where it sits (top, px) and its ink (dark / light)\nwindow.CAP_PLAN = " + json.dumps(plan) + ";\n")
    (ROOT / "look/capplan.json").write_text(json.dumps(rows, indent=1))
    print("wrote film/capplan.js", len(plan), "chunks")

asyncio.run(main())
