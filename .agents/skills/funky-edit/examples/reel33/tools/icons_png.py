"""SVG strings (work/icons.json) -> PNG sprite sheets in film/img/ic + manifest. One headless Chrome, transparent background."""
import asyncio, json, sys, pathlib
from playwright.async_api import async_playwright
src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]); out.mkdir(parents=True, exist_ok=True)
D = json.loads(src.read_text()); N = D["N"]; man = {"N": N, "cols": 4, "rows": 3, "heroes": {}, "big": {}, "layers": {}, "counts": D["counts"]}
PAGE = "<!doctype html><html><head><style>html,body{margin:0;background:transparent}#g{display:grid;grid-template-columns:repeat(%d,%dpx);width:%dpx}#g svg{display:block}</style></head><body><div id='g'>%s</div></body></html>"
async def shot(pg, html, w, h, path):
    await pg.set_viewport_size({"width": w, "height": h}); await pg.set_content(html); await pg.wait_for_timeout(60)
    await pg.screenshot(path=str(path), omit_background=True, clip={"x": 0, "y": 0, "width": w, "height": h})
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page(device_scale_factor=1)
        for group, size in (("heroes", 256), ("big", 768)):
            for n, h in D[group].items():
                f = f"{'big_' if group == 'big' else ''}{n}.png"
                await shot(pg, PAGE % (4, size, 4 * size, "".join(h["frames"])), 4 * size, 3 * size, out / f)
                man[group][n] = {"file": f, "color": h["color"], "size": size}
        # the folder's five layers per colour: back fill (+ its soft shadow), back outline, white sheet, front fill, front outline
        parts = {"back": [0, 1], "backO": [2], "file": [3], "front": [4, 5], "frontO": [6]}
        for cid, L in D["layers"].items():
            man["layers"][cid] = {"color": L["color"], "files": {}}
            for part, keep in parts.items():
                await pg.set_viewport_size({"width": 1024, "height": 1024}); await pg.set_content("<html><body style='margin:0;background:transparent'>" + L["svg"] + "</body></html>")
                await pg.evaluate("""keep => { const k = [...document.querySelector('svg').children].filter(e => e.tagName !== 'defs'); k.forEach((e, i) => { if (!keep.includes(i)) e.style.display = 'none'; }); }""", keep)
                f = f"layer_{cid}_{part}.png"; await pg.screenshot(path=str(out / f), omit_background=True, clip={"x": 0, "y": 0, "width": 1024, "height": 1024}); man["layers"][cid]["files"][part] = f
        # the wall: every icon of the library at rest, 48 columns
        W = D["wall"]; cols = 48; rows = (len(W) + cols - 1) // cols
        await shot(pg, PAGE % (cols, 64, cols * 64, "".join(W)), cols * 64, rows * 64, out / "wall.png")
        man["wall"] = {"file": "wall.png", "cols": cols, "rows": rows, "n": len(W), "cell": 64}
        await b.close()
    (out / "manifest.js").write_text("window.ICONS = " + json.dumps(man) + ";\n"); print("wrote", out, len(man["heroes"]), "heroes, wall", man["wall"])
asyncio.run(main())
