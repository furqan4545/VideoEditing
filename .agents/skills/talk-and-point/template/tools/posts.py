# Real screenshots (posts, pages; usernames already blurred) + logos → film/img/ and film/posts.js:
#   window.POSTS = [{img, url, host, title}]   window.ICONS = [[key, path], ...]
#   python tools/posts.py research/shots/*.png [--icon cursor=research/logo/cursor_icon.png ...]
# A screenshot's URL comes from SHOT.png=URL on the command line, or from a urls.json beside it ({"file.png": "https://..."}).
# Images are capped at 1100 px wide (enough for a full-frame card, keeps frames fast).
import argparse, json, os, re
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument("shots", nargs="*"); ap.add_argument("--icon", action="append", default=[]); A = ap.parse_args()
A.shots = [os.path.abspath(s.split("=", 1)[0]) + ("=" + s.split("=", 1)[1] if "=" in s else "") for s in A.shots]
A.icon = [k + "=" + os.path.abspath(p) for k, p in (i.split("=", 1) for i in A.icon)]
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/.."); os.makedirs("film/img/posts", exist_ok=True)
posts, icons = [], []
for a in A.shots:
    path, _, url = a.partition("=")
    if not url:
        side = os.path.join(os.path.dirname(path), "urls.json")
        url = json.load(open(side)).get(os.path.basename(path), "") if os.path.exists(side) else ""
    im = Image.open(path).convert("RGB")
    if im.width > 1100: im = im.resize((1100, round(im.height * 1100 / im.width)), Image.LANCZOS)
    name = os.path.basename(path); im.save(f"film/img/posts/{name}", optimize=True)
    host = re.sub(r"^https?://(www\.|old\.)?", "", url).split("/")[0] if url else ""
    posts.append({"img": f"img/posts/{name}", "url": url, "host": host, "title": ""})
for kv in A.icon:
    k, p = kv.split("=", 1); dst = f"film/img/{os.path.basename(p)}"; Image.open(p).save(dst); icons.append([k, dst[len("film/"):]])
open("film/posts.js", "w").write("window.POSTS = " + json.dumps(posts, ensure_ascii=False) + ";\nwindow.ICONS = " + json.dumps(icons) + ";\n")
print(len(posts), "posts,", len(icons), "icons → film/posts.js")
