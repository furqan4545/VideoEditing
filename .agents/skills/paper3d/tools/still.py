"""One clean full-size still of the comp: python tools/still.py out.png [t] [query]   (1080x1920, GPU, no stamp)"""
import asyncio, sys, pathlib
from playwright.async_api import async_playwright
out = sys.argv[1]; t = float(sys.argv[2]) if len(sys.argv) > 2 else 0.0; query = sys.argv[3] if len(sys.argv) > 3 else ""
GPU = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--allow-file-access-from-files", "--disable-web-security"]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=GPU); pg = await b.new_page(viewport={"width": 1080, "height": 1920})
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e)[:300]))
        await pg.goto(pathlib.Path("film/comp.html").resolve().as_uri() + ("?" + query if query else "")); await pg.evaluate("window.__ready"); await pg.evaluate(f"window.__seek({t})")
        await pg.screenshot(path=out, clip={"x": 0, "y": 0, "width": 1080, "height": 1920}); await b.close(); print("wrote", out, errs[:3])
asyncio.run(main())
