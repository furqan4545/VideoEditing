"""Render the thumbnail page to a PNG:  python tools/thumb.py out/thumbnail.png [film/thumb.html]"""
import asyncio, pathlib, sys
from playwright.async_api import async_playwright
async def main():
    page = sys.argv[2] if len(sys.argv) > 2 else "film/thumb.html"
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 1080, "height": 1920})
        errs = []; pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
        await pg.goto(pathlib.Path(page).resolve().as_uri()); await pg.evaluate("window.__ready"); await pg.wait_for_timeout(300)
        pathlib.Path(sys.argv[1]).parent.mkdir(parents=True, exist_ok=True); await pg.screenshot(path=sys.argv[1]); await b.close(); print("wrote", sys.argv[1], errs[:3])
asyncio.run(main())
