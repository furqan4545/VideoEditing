"""Compare two frames (new clock) pixel by pixel: python tools/swapcheck.py 9.499 9.501 [nocaps]"""
import asyncio, io, sys, pathlib, numpy as np
from PIL import Image
from playwright.async_api import async_playwright
async def main():
    a, b = float(sys.argv[1]), float(sys.argv[2])
    async with async_playwright() as p:
        br = await p.chromium.launch(args=["--allow-file-access-from-files"]); pg = await br.new_page(viewport={"width": 1080, "height": 1920})
        await pg.goto(pathlib.Path("film/comp.html").resolve().as_uri() + "?nocaps=1"); await pg.evaluate("window.__ready")
        ims = []
        for t in (a, b):
            await pg.evaluate(f"window.__seek({t})"); ims.append(np.asarray(Image.open(io.BytesIO(await pg.screenshot())).convert("RGB")).astype(float))
        cam = await pg.evaluate("[CAM.x, CAM.y, CAM.zoom]"); await br.close()
    d = np.abs(ims[0] - ims[1]).mean(2); print(f"mean abs diff {d.mean():.2f}, 99th pct {np.percentile(d, 99):.1f}, max {d.max():.0f}; cam at b {cam}")
    Image.fromarray(np.concatenate([ims[0], ims[1]], 1).astype(np.uint8)).resize((1080, 960)).save("look/swapcheck.jpg")
asyncio.run(main())
