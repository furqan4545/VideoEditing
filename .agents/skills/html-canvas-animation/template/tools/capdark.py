"""Decide once per caption line whether it sits on a dark picture (white text) or not (black text): seeks 6 frames
inside each line with captions off, reads the band behind the text (kit's capDarkness), majority wins.
Writes film/capdark.js (window.CAP_DARK = {lineIndex: 1}). Needs Chromium with file access (Ali's frames are file://).
   ~/.local/share/onetake/.venv/bin/python tools/capdark.py"""
import asyncio, json, pathlib
from playwright.async_api import async_playwright
JS = """async () => { const out = {}, dbg = [];
  for (let i = 0; i < CAPS.length; i++) { const c = CAPS[i]; let d = 0, n = 0;
    for (let k = 0; k < 6; k++) { const TT = c.t0 + (c.t1 - c.t0) * (0.08 + 0.84 * k / 5); await window.__seek(TT); d += capDarkness(560) > 0.5 ? 1 : 0; n++; }
    if (d / n > 0.5) out[i] = 1; dbg.push([i, +c.t0.toFixed(2), d, c.parts.map(p => p.txt).join(' ')]); }
  return { out, dbg }; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--allow-file-access-from-files"]); pg = await b.new_page(viewport={"width": 1080, "height": 1920})
        await pg.goto(pathlib.Path("film/comp.html").resolve().as_uri() + "?nocaps=1"); await pg.evaluate("window.__ready")
        res = await pg.evaluate(JS); await b.close()
        open("film/capdark.js", "w").write("window.CAP_DARK = " + json.dumps(res["out"]) + ";\n")
        for i, t, d, s in res["dbg"]:
            if d: print(f"{i:3d} {t:6.2f} dark {d}/6  {s}")
        print(len(res["out"]), "of", len(res["dbg"]), "lines white")
asyncio.run(main())
