"""Stills of the comp (1080x1920, GPU): python tools/vstills.py film/comp.html out.jpg t1,t2,... [cols] [tile_w] [query]
tile_w 1080 = full-size frames side by side. query = extra URL query, e.g. test=1"""
import asyncio, io, sys, pathlib
from PIL import Image, ImageDraw
from playwright.async_api import async_playwright
comp, out, times = sys.argv[1], sys.argv[2], [float(x) for x in sys.argv[3].split(",")]
cols = int(sys.argv[4]) if len(sys.argv) > 4 else 6; TW = int(sys.argv[5]) if len(sys.argv) > 5 else 360; TH = TW * 16 // 9
query = sys.argv[6] if len(sys.argv) > 6 else ""
GPU = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--allow-file-access-from-files", "--disable-web-security"]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=GPU); pg = await b.new_page(viewport={"width": 1080, "height": 1920})
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await pg.goto(pathlib.Path(comp).resolve().as_uri() + ("?" + query if query else "")); await pg.evaluate("window.__ready")
        ims = []
        for t in times:
            await pg.evaluate(f"window.__seek({t})")
            im = Image.open(io.BytesIO(await pg.screenshot())).convert("RGB")
            if TW != 1080: im = im.resize((TW, TH), Image.LANCZOS)
            d = ImageDraw.Draw(im); d.rectangle([0, 0, 70, 16], fill="black"); d.text((3, 2), f"{t:.2f}", fill="yellow"); ims.append(im)
        await b.close()
        rows = (len(ims) + cols - 1) // cols; sh = Image.new("RGB", (cols * TW, rows * TH), "black")
        for i, im in enumerate(ims): sh.paste(im, ((i % cols) * TW, (i // cols) * TH))
        sh.save(out, quality=90); print("wrote", out, "errors:", [e[:300] for e in errs[:4]])
asyncio.run(main())
