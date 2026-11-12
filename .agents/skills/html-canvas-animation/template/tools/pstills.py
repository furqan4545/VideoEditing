"""Contact sheet of the reel 17 comp at chosen times, through a named view (or the master camera).
   usage: pstills.py OUT.jpg t1,t2,... [--view NAME] [--cols 6] [--tw 300] [--hud] [--full DIR]
   --full DIR also saves each frame at full 1080x1920 as DIR/<t>.png (to inspect detail).
   Prints page errors and console errors (scene draw exceptions are caught per layer and logged)."""
import asyncio, io, sys, pathlib, argparse
from PIL import Image, ImageDraw
from playwright.async_api import async_playwright
ap = argparse.ArgumentParser(); ap.add_argument("out"); ap.add_argument("times"); ap.add_argument("--view"); ap.add_argument("--cols", type=int, default=6)
ap.add_argument("--tw", type=int, default=300); ap.add_argument("--hud", action="store_true"); ap.add_argument("--full"); ap.add_argument("--nocaps", action="store_true")
a = ap.parse_args(); times = [float(x) for x in a.times.split(",")]
comp = pathlib.Path(__file__).resolve().parent.parent / "film" / "comp.html"
q = []; 
if a.view: q.append("view=" + a.view)
if a.hud: q.append("hud=1")
if a.nocaps: q.append("nocaps=1")
url = comp.as_uri() + ("?" + "&".join(q) if q else "")
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 1080, "height": 1920})
        errs = []; pg.on("pageerror", lambda e: errs.append("pageerror: " + str(e)))
        pg.on("console", lambda m: errs.append(f"console.{m.type}: {m.text}") if m.type in ("error", "warning") else None)
        await pg.goto(url); await pg.evaluate("window.__ready")
        TW = a.tw; TH = TW * 16 // 9; ims = []
        if a.full: pathlib.Path(a.full).mkdir(parents=True, exist_ok=True)
        for t in times:
            await pg.evaluate(f"window.__seek({t})")
            raw = await pg.screenshot(); im = Image.open(io.BytesIO(raw)).convert("RGB")
            if a.full: im.save(f"{a.full}/{t:06.2f}.png")
            im = im.resize((TW, TH), Image.LANCZOS); d = ImageDraw.Draw(im); d.rectangle([0, 0, 64, 16], fill="black"); d.text((3, 2), f"{t:.2f}", fill="yellow"); ims.append(im)
        await b.close()
        cols = min(a.cols, len(ims)); rows = (len(ims) + cols - 1) // cols; sh = Image.new("RGB", (cols * TW, rows * TH), "black")
        for i, im in enumerate(ims): sh.paste(im, ((i % cols) * TW, (i // cols) * TH))
        sh.save(a.out, quality=88); print("wrote", a.out)
        seen = set()
        for e in errs:
            if e not in seen: seen.add(e); print(e[:300])
asyncio.run(main())
