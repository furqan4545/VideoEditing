#!/usr/bin/env python3
"""Meme photos for the funny words: dog and cat memes from imgflip's public template pages.

    python3 tools/memes.py cool_dog="cool dog" huh_cat="confused cat" cook="cooking cat"      # NAME="search words"
    python3 tools/memes.py huh_cat="confused cat" --pick huh_cat=3                            # take the 3rd result instead

For each NAME it saves film/img/memes/NAME.jpg (the first result that is a real picture, or the --pick'th), then rewrites
film/img/memes/manifest.js (window.MEMES) and a contact sheet look/memes.jpg. LOOK at the sheet before using one: the
search is loose. Show one with VOX.meme('id', 'NAME.jpg', t, t0, { at: [x, y], w: 280, rot: -6 }).
Memes are silent pictures: no sound on them. They are other people's photos and their rights are not checked: keep them
small and short (about a second), and list them in CREDITS.md.
"""
import io, json, re, sys, urllib.parse, urllib.request
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]; OUT = ROOT / "film/img/memes"; OUT.mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (Macintosh) meme-fetch"}
def get(url):
    return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=30).read()
args = [a for a in sys.argv[1:] if "=" in a and not a.startswith("--")]; pick = {}
if "--pick" in sys.argv:
    for a in sys.argv[sys.argv.index("--pick") + 1:]:
        if "=" in a: k, v = a.split("=", 1); pick[k] = int(v)
    args = [a for a in args if sys.argv.index(a) < sys.argv.index("--pick")]
for a in args:
    name, words = a.split("=", 1); name = re.sub(r"[^a-z0-9_]", "_", name.lower())
    html = get("https://imgflip.com/memesearch?q=" + urllib.parse.quote_plus(words)).decode("utf-8", "replace")
    hits = re.findall(r'<img class="shadow"[^>]*alt="([^"]*?) Meme Template"[^>]*src="//i\.imgflip\.com/4/([a-z0-9]+)\.(?:jpg|png)"', html)
    if not hits: print(f"{name}: nothing found for '{words}'"); continue
    want = pick.get(name, 1); n = 0; saved = False
    for title, mid in hits:
        data = None
        for ext in ("jpg", "png"):
            try: d = get(f"https://i.imgflip.com/{mid}.{ext}")
            except Exception: continue
            if len(d) > 3000 and len(d) != 27150: data = d; break          # 27,150 bytes = imgflip's "no image" placeholder
        if not data: continue
        n += 1
        if n < want: continue
        try:
            from PIL import Image
            im = Image.open(io.BytesIO(data)).convert("RGB"); im.thumbnail((640, 640)); im.save(OUT / f"{name}.jpg", quality=88)
        except ImportError: (OUT / f"{name}.jpg").write_bytes(data)
        print(f"{name}: '{title}' (result {n} of {len(hits)}) -> film/img/memes/{name}.jpg"); saved = True; break
    if not saved: print(f"{name}: no usable picture for '{words}' (found {len(hits)} templates)")
files = sorted(p.name for p in OUT.glob("*.jpg")) + sorted(p.name for p in OUT.glob("*.png"))
(OUT / "manifest.js").write_text("// Written by tools/memes.py: the meme photos in this folder. VOX.meme('id', 'file.jpg', t, t0, { at, w, rot }) shows one.\nwindow.MEMES = " + json.dumps(files) + ";\n")
try:
    from PIL import Image, ImageDraw
    if files:
        T = 260; sheet = Image.new("RGB", (T * min(len(files), 6), (T + 26) * ((len(files) + 5) // 6)), "#111")
        for i, f in enumerate(files):
            im = Image.open(OUT / f).convert("RGB"); im.thumbnail((T - 8, T - 8)); x, y = (i % 6) * T, (i // 6) * (T + 26)
            sheet.paste(im, (x + (T - im.width) // 2, y + (T - im.height) // 2)); ImageDraw.Draw(sheet).text((x + 6, y + T + 4), f, fill="yellow")
        (ROOT / "look").mkdir(exist_ok=True); sheet.save(ROOT / "look/memes.jpg", quality=88); print("sheet: look/memes.jpg")
except ImportError: print("(no Pillow: run with ~/.local/share/onetake/.venv/bin/python for the contact sheet)")
print(len(files), "memes:", files)
