# Ali's cut-out for pieces where things fly BEHIND him (the hook): Apple Vision person matte per frame
# (~/.local/share/text-behind/personmask), smoothed in time (1-2-1) and feathered, then frame x matte → RGBA PNG.
#   python tools/cutout.py H [H2 ...]   → film/cutout/<id>/NNNN.png (same numbering as film/footage/<id>/)
import os, sys, subprocess, numpy as np
from PIL import Image, ImageFilter
os.chdir(os.path.dirname(os.path.abspath(__file__)) + "/..")
MASKER = os.path.expanduser("~/.local/share/text-behind/personmask")
for sid in sys.argv[1:]:
    src, mdir, out = f"film/footage/{sid}", f"cut/masks/{sid}", f"film/cutout/{sid}"
    os.makedirs(out, exist_ok=True); subprocess.run([MASKER, src, mdir, "--mode", "person", "--quality", "accurate"], check=True)
    names = sorted(f for f in os.listdir(src) if f.endswith(".jpg"))
    M = [np.asarray(Image.open(f"{mdir}/{os.path.splitext(n)[0]}.png").convert("L"), np.float32) / 255 if os.path.exists(f"{mdir}/{os.path.splitext(n)[0]}.png")
         else np.asarray(Image.open(f"{mdir}/{n}").convert("L"), np.float32) / 255 for n in names]
    for i, n in enumerate(names):
        m = 0.25 * M[max(0, i - 1)] + 0.5 * M[i] + 0.25 * M[min(len(M) - 1, i + 1)]
        m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5)), np.float32) / 255
        m = np.clip((m - 0.08) / 0.84, 0, 1)
        im = Image.open(f"{src}/{n}").convert("RGB"); a = Image.fromarray((m * 255).astype(np.uint8)).resize(im.size)
        im.putalpha(a); im.save(f"{out}/{os.path.splitext(n)[0]}.png", optimize=False, compress_level=3)
    print(sid, len(names), "cut-outs")
