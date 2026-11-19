"""Real public pages as pictures for the monitor: the GitHub repo and the icon site (dark scheme, no sign-in)."""
import asyncio, sys
from playwright.async_api import async_playwright
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        for name, url, w, h, full in (("github", "https://github.com/kubai087/kubai-icons", 1280, 900, False), ("site", "https://icons.kubai.design/icons/", 1280, 900, False), ("site_home", "https://icons.kubai.design/", 1280, 900, False)):
            ctx = await b.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, color_scheme="dark"); pg = await ctx.new_page()
            try:
                await pg.goto(url, timeout=45000, wait_until="networkidle"); await pg.wait_for_timeout(1500)
                await pg.screenshot(path=f"film/img/web/{name}.png", full_page=full); print("ok", name, await pg.title())
            except Exception as e: print("fail", name, str(e)[:160])
            await ctx.close()
        await b.close()
asyncio.run(main())
