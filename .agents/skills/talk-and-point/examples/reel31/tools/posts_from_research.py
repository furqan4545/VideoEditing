# research/complaints.json + research/shots/*.png → film/img/posts/*.png and film/posts.js:
#   window.POSTS = [{img, url, host, title}]   (every real post screenshot, usernames already blurred)
#   window.TOP5 = [[label, short link], ...]    (the ranked top five themes, each with its best real link)
#   window.THREAD_IDX = index into POSTS of the top complaint's best thread (the one that opens when the link is tapped)
#   window.NEW_COMPLAINT = a sixth real complaint (the "NEW" line next Monday)
# Images are capped at 1100 px wide (enough for a full-frame card) to keep frames fast.
import json, os, re, shutil, sys
from PIL import Image
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
R = "../research"; J = json.load(open(f"{R}/complaints.json"))
os.makedirs("film/img/posts", exist_ok=True)
themes = J["themes"] if isinstance(J, dict) and "themes" in J else J
posts, byurl = [], {}
for th in themes:
    for p in th.get("posts", []):
        if not p.get("shot") or p["url"] in byurl: continue
        src = p["shot"] if os.path.isabs(p["shot"]) else os.path.join(R, p["shot"]) if os.path.exists(os.path.join(R, p["shot"])) else os.path.join(R, "shots", os.path.basename(p["shot"]))
        if not os.path.exists(src): print("missing", src); continue
        name = os.path.basename(src); im = Image.open(src).convert("RGB")
        if im.width > 1100: im = im.resize((1100, round(im.height * 1100 / im.width)), Image.LANCZOS)
        im.save(f"film/img/posts/{name}", optimize=True)
        host = re.sub(r"^https?://(www\.|old\.)?", "", p["url"]).split("/")[0]
        byurl[p["url"]] = len(posts); posts.append({"img": f"img/posts/{name}", "url": p["url"], "host": host, "title": p.get("title", "")})
def short(u):
    u = re.sub(r"^https?://(www\.|old\.)?", "", u); m = re.match(r"(reddit\.com/r/[^/]+)/comments/([^/]+)", u)
    if m: return f"{m.group(1)}/comments/{m.group(2)}"
    return u if len(u) < 46 else u[:44] + "…"
top = sorted(themes, key=lambda th: th.get("rank", 99))[:5]
TOP5 = [[th["label"], short(th["best_url"])] for th in top]
thread = byurl.get(top[0]["best_url"], 0)
extra = J.get("new_complaint") if isinstance(J, dict) else None
NEW = (extra or {}).get("label") if isinstance(extra, dict) else extra
open("film/posts.js", "w").write("window.POSTS = " + json.dumps(posts, ensure_ascii=False) + ";\nwindow.TOP5 = " + json.dumps(TOP5, ensure_ascii=False) +
                                 f";\nwindow.THREAD_IDX = {thread};\nwindow.NEW_COMPLAINT = " + json.dumps(NEW or "", ensure_ascii=False) + ";\n")
print(len(posts), "posts;", "TOP5:", *TOP5, sep="\n  "); print("thread:", posts[thread]["url"] if posts else None, "| new:", NEW)
