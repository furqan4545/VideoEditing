"""Dump the film's own sound events (KIT.event calls of every shot) to sound/events.json"""
import asyncio, json, pathlib
from playwright.async_api import async_playwright
GPU = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization", "--allow-file-access-from-files", "--disable-web-security"]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=GPU); pg = await b.new_page(viewport={"width": 1080, "height": 1920})
        await pg.goto(pathlib.Path("film/comp.html").resolve().as_uri()); await pg.evaluate("window.__ready")
        ev = await pg.evaluate("window.__events()"); await b.close()
    json.dump(ev, open("sound/events.json", "w"), indent=1)
    for e in ev: print(f"{e['t']:6.2f}  {e['kind']:8s} {e.get('dur', 0):4.2f}  {e.get('note', '')[:90]}")
    print(len(ev), "events")
asyncio.run(main())
