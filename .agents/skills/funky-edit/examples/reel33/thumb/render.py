"""Render the thumbnail: python render.py out.png [scale]   (a tiny local server, because the page uses ES modules)"""
import asyncio, functools, http.server, socketserver, sys, threading, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parents[1]; out = sys.argv[1]; scale = float(sys.argv[2]) if len(sys.argv) > 2 else 1
class Q(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a): pass
srv = socketserver.TCPServer(('127.0.0.1', 0), functools.partial(Q, directory=str(ROOT))); threading.Thread(target=srv.serve_forever, daemon=True).start()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1080, 'height': 1920}, device_scale_factor=scale)
        errs = []; pg.on('pageerror', lambda e: errs.append(str(e)[:400])); pg.on('console', lambda m: errs.append(m.text[:300]) if m.type == 'error' else None)
        await pg.goto(f'http://127.0.0.1:{srv.server_address[1]}/thumb/thumb.html'); await pg.wait_for_timeout(600)
        try: await pg.wait_for_function('window.__ready !== undefined', timeout=8000); await pg.evaluate('window.__ready')
        except Exception as e: errs.append('not ready: ' + str(e)[:120])
        await pg.screenshot(path=out, clip={'x': 0, 'y': 0, 'width': 1080, 'height': 1920}); print('wrote', out, 'errors:', errs[:4]); await b.close()
asyncio.run(main()); srv.shutdown()
