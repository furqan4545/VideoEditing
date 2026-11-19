"""Real public pages as pictures for the monitor or a card (no sign-in, dark scheme):

    ~/.local/share/onetake/.venv/bin/python tools/webshots.py repo=https://github.com/OWNER/NAME site=https://example.com [--light] [--full] [--w 1280 --h 900]

Writes film/img/web/NAME.png (2x) and prints the lines to paste into film/img/manifest.js. Use real pages, real numbers:
never redraw a page that exists. A shot under ~20 KB is usually blank: look at it before using it.
"""
import asyncio, sys
from pathlib import Path
from playwright.async_api import async_playwright
ROOT = Path(__file__).resolve().parents[1]; OUT = ROOT / "film/img/web"; OUT.mkdir(parents=True, exist_ok=True)
A = sys.argv[1:]; num = lambda f, d: int(A[A.index(f) + 1]) if f in A else d
W, H = num("--w", 1280), num("--h", 900); pages = [a.split("=", 1) for a in A if "=" in a and not a.startswith("--")]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist"])
        for name, url in pages:
            ctx = await b.new_context(viewport={"width": W, "height": H}, device_scale_factor=2, color_scheme="light" if "--light" in A else "dark"); pg = await ctx.new_page()
            try:
                await pg.goto(url, timeout=45000, wait_until="load"); await pg.wait_for_timeout(3500)
                f = OUT / f"{name}.png"; await pg.screenshot(path=str(f), full_page="--full" in A)
                print(f"  {name}: 'img/web/{name}.png',   // {await pg.title()}  ({f.stat().st_size // 1024} KB{', LOOKS BLANK' if f.stat().st_size < 20000 else ''})")
            except Exception as e: print("fail", name, str(e)[:160])
            await ctx.close()
        await b.close()
asyncio.run(main())
