"""Burn the "simple story tell caption" onto a finished vertical video (talking head, screen recording, anything).

  ~/.local/share/onetake/.venv/bin/python .agents/skills/simple-storytell-caption/scripts/burn.py IN.mp4 WORDS.json OUT.mp4 [--theme dark|light] [--top 268]

WORDS.json: [[word, t0, t1, pieceId?], ...] or {"words": [...]}: a reel's cut/timing.json works as it is.
--theme dark = near-black text (white or light picture behind the caption band), light = white text with a soft shadow (footage).
The caption is drawn by the same story_caption.js the HTML films use, one image per caption state, then laid over the video
with ffmpeg; the sound is copied untouched.
"""
import argparse, asyncio, io, json, os, subprocess, sys
import numpy as np
from PIL import Image
from playwright.async_api import async_playwright

ap = argparse.ArgumentParser(); ap.add_argument("src"); ap.add_argument("words"); ap.add_argument("out")
ap.add_argument("--theme", default="dark", choices=["dark", "light"]); ap.add_argument("--top", type=int, default=268); ap.add_argument("--crf", type=int, default=17)
A = ap.parse_args()
HERE = os.path.dirname(os.path.abspath(__file__)); JS = open(os.path.join(HERE, "..", "story_caption.js")).read().replace("</script>", "<\\/script>")   # the file is inlined into a script tag
W = json.load(open(A.words)); W = W["words"] if isinstance(W, dict) else W
pr = json.loads(subprocess.check_output(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height,r_frame_rate,nb_frames:format=duration", "-of", "json", A.src]))
vw, vh = pr["streams"][0]["width"], pr["streams"][0]["height"]; num, den = pr["streams"][0]["r_frame_rate"].split("/"); fps = float(num) / float(den); dur = float(pr["format"]["duration"])
S = vw / 1080.0; PAD, BH = 34, 200                                   # the band that holds two caption lines and the soft shadow, in 1080-wide units
font = "/System/Library/Fonts/SFNS.ttf"
face = '@font-face{font-family:"SF Reel";src:url("file://%s") format("truetype");font-weight:1 1000;}' % font if os.path.exists(font) else ""
HTML = f"""<!doctype html><html><head><meta charset="utf-8"><style>{face}html,body{{margin:0;background:transparent}}#o{{position:absolute;left:0;top:0;width:1080px;height:1920px}}</style></head>
<body><div id="o"></div><script>{JS}</script><script>StoryCaption.mount(document.getElementById('o')); StoryCaption.build({json.dumps(W)}, {{ top: {A.top} }});
window.states = () => {{ const out = []; for (const c of StoryCaption.chunks) {{ const ts = [c.show0, ...c.words.map(w => w[1] - StoryCaption.opts.early)].filter(t => t < c.show1).sort((a, b) => a - b);
  for (let i = 0; i < ts.length; i++) out.push([Math.max(0, ts[i]), i + 1 < ts.length ? ts[i + 1] : c.show1]); }} return out; }};</script></body></html>"""

async def render():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=["--allow-file-access-from-files"]); pg = await b.new_page(viewport={"width": 1080, "height": 1920}, device_scale_factor=S)
        await pg.set_content(HTML); await pg.evaluate("document.fonts.ready"); st = await pg.evaluate("window.states()"); out = []
        for t0, t1 in st:
            if t1 - t0 < 1e-4: continue
            await pg.evaluate(f"StoryCaption.draw({(t0 + min(t1, t0 + 0.02)) / 2 + 1e-4}, {{ theme: '{A.theme}' }})")
            png = await pg.screenshot(clip={"x": 0, "y": A.top - PAD, "width": 1080, "height": BH}, omit_background=True)
            out.append((t0, t1, np.asarray(Image.open(io.BytesIO(png)).convert("RGBA")).tobytes()))
        await b.close(); return out
states = asyncio.run(render())
bw, bh = int(round(1080 * S)), int(round(BH * S)); blank = bytes(bw * bh * 4); y = int(round((A.top - PAD) * S))
assert all(len(s[2]) == bw * bh * 4 for s in states), "caption band size mismatch"
ff = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-i", A.src, "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{bw}x{bh}", "-r", f"{fps}", "-i", "-",
                       "-filter_complex", f"[0:v][1:v]overlay=0:{y}:format=auto:shortest=1[v]", "-map", "[v]", "-map", "0:a?", "-c:a", "copy", "-c:v", "libx264", "-crf", str(A.crf), "-pix_fmt", "yuv420p", "-movflags", "+faststart", A.out], stdin=subprocess.PIPE)
k = 0
for n in range(int(dur * fps) + 2):
    t = n / fps
    while k < len(states) and t >= states[k][1]: k += 1
    ff.stdin.write(states[k][2] if k < len(states) and states[k][0] <= t < states[k][1] else blank)
ff.stdin.close(); ff.wait()
print(f"wrote {A.out}: {len(states)} caption states over {dur:.1f} s, theme {A.theme}")
