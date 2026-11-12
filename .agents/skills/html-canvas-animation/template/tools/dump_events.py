import asyncio, json, pathlib, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={"width": 1080, "height": 1920})
        await pg.goto(pathlib.Path(sys.argv[1]).resolve().as_uri()); await pg.evaluate("window.__ready")
        ev = await pg.evaluate("window.__events()"); await b.close()
        json.dump(ev, open(sys.argv[2], "w"), indent=1); print(len(ev["events"]), "events, T =", ev["T"])
asyncio.run(main())
