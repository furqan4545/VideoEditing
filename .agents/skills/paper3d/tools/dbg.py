"""Load the comp and print console output + a JS expression: python tools/dbg.py "expr" [query]"""
import asyncio, sys, pathlib, json
from playwright.async_api import async_playwright
expr = sys.argv[1] if len(sys.argv) > 1 else "Object.keys(KIT.assets)"; query = sys.argv[2] if len(sys.argv) > 2 else ""
GPU = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--allow-file-access-from-files", "--disable-web-security"]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=GPU); pg = await b.new_page(viewport={"width": 1080, "height": 1920}); msgs = []
        pg.on("pageerror", lambda e: msgs.append("PAGEERROR " + str(e)[:400])); pg.on("console", lambda m: msgs.append(m.type + ": " + m.text[:300]) if m.type in ("error", "warning") else None)
        await pg.goto(pathlib.Path("film/comp.html").resolve().as_uri() + ("?" + query if query else ""))
        try: await pg.evaluate("window.__ready")
        except Exception as e: msgs.append("READY FAILED " + str(e)[:600])
        try: print(json.dumps(await pg.evaluate(expr))[:3000])
        except Exception as e: print("EXPR FAILED", str(e)[:400])
        for m in msgs[:30]: print(" ", m)
        await b.close()
asyncio.run(main())
