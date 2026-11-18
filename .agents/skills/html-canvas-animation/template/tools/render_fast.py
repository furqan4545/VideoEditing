#!/usr/bin/env python3
"""render_fast.py - the html-canvas-animation renderer: the same frames as onetake's render.py, without a screenshot per sample.

  python tools/render_fast.py film/comp.html --out film/draft_v1.mp4 --keep-frames        # 1080x1920, 30 fps, shutter 180
  python tools/render_fast.py film/comp.html --out out/part.mp4 --t0 8 --t1 16           # only 8.0 to 16.0 s
  python tools/render_fast.py film/comp.html --out film/draft_v1.mp4 --keep-frames --resume   # after deleting PNGs in film/_frames

Why. render.py (tools/render_local.py) takes a Chrome PNG screenshot of every shutter sample: on reel 17 a sample draws in
~65 ms and its screenshot takes ~240 ms more, plus a PNG decode in Python. These films are one opaque canvas that covers
the page, so a screenshot equals the canvas's own pixels byte for byte. tools/fast_frame.js (injected into the page)
reads each sample with getImageData (~1.5 ms) and averages the samples in linear light right there, with render.py's own
lookup tables, float32 sums in the same order, numpy's rounding, the same still-frame shortcut and the same cut rule.
Finished frames are POSTed to a small server in this script (as a Blob) and piped straight into ffmpeg, in order.

Same as render.py: sample times and counts (window.__motion, --gap, --samples-min..max), the cut rule, x264 settings,
--keep-frames (PNGs in <out dir>/_frames, so tools/preview_partial.sh works while it runs), --resume (render only the
missing PNGs), --scale / --final, and <out>.render.json. New: --t0 / --t1 for a part.

Safety. Before rendering it checks, at three times, that a Chrome screenshot equals the canvas; and every frame it checks
that no other page element became visible over it. If either fails (HTML drawn over the canvas, a transparent canvas)
it stops and says so: render that film with tools/render_local.py (the old screenshot renderer, kept as the fallback).
"""
import argparse, asyncio, io, json, os, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

import numpy as np
from PIL import Image
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
JS = os.path.join(HERE, "fast_frame.js")
BASE_ARGS = ["--allow-file-access-from-files", "--js-flags=--expose-gc"]       # file access: Ali's frames; gc: see fast_frame.js
GPU_ARGS = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization"]

# render.py's two tables, the same lines: the page uses exactly these numbers
_u = np.arange(256) / 255.0
SRGB_TO_LIN = np.where(_u <= 0.04045, _u / 12.92, ((_u + 0.055) / 1.055) ** 2.4).astype(np.float32)
_l = np.arange(65536) / 65535.0
LIN_TO_SRGB = np.clip(np.rint(np.where(_l <= 0.0031308, _l * 12.92, 1.055 * np.power(_l, 1 / 2.4) - 0.055) * 255.0), 0, 255).astype(np.uint8)


async def run(a):
    comp = os.path.abspath(a.comp); out = os.path.abspath(a.out)
    fr = os.path.join(os.path.dirname(out), "_frames")
    st = dict(next=0, W=0, H=0)
    frames, errs, hist = {}, [], {}
    counts = dict(captures=0, still=0, cuts=0, relaunched=0, t_page=0.0, from_disk=0)
    cv = asyncio.Condition()

    async def notify():
        async with cv:
            cv.notify_all()

    async def handle(reader, writer):                       # the local server the page POSTs finished frames to
        try:
            line = await reader.readline()
            parts = line.decode("latin1").split()
            if len(parts) >= 2:
                method, path, hdr = parts[0], parts[1], {}
                while True:
                    h = await reader.readline()
                    if h in (b"\r\n", b"\n", b""):
                        break
                    k, _, v = h.decode("latin1").partition(":"); hdr[k.strip().lower()] = v.strip()
                n = int(hdr.get("content-length", "0") or 0)
                body = await reader.readexactly(n) if n else b""
                code = "404 Not Found"
                if method == "OPTIONS":
                    code = "204 No Content"
                elif method == "POST" and path.startswith("/f/"):
                    if len(body) == st["W"] * st["H"] * 3:
                        frames[int(path[3:])] = body; code = "200 OK"; await notify()
                    else:
                        code = "400 Bad Request"
                writer.write((f"HTTP/1.1 {code}\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\n"
                              "Access-Control-Allow-Headers: *\r\nAccess-Control-Allow-Private-Network: true\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").encode())
                await writer.drain()                        # one request per connection (paper3d: a reused socket raced a close)
        except (asyncio.IncompleteReadError, ConnectionResetError, BrokenPipeError):
            pass
        finally:
            writer.close()

    srv = await asyncio.start_server(handle, "127.0.0.1", 0, limit=1 << 25)
    url = f"http://127.0.0.1:{srv.sockets[0].getsockname()[1]}"
    t0 = time.time()

    async with async_playwright() as p:
        async def open_page(dur=None):
            br = await p.chromium.launch(args=(GPU_ARGS if a.gpu else []) + BASE_ARGS)
            pg = await (await br.new_context(viewport={"width": a.width, "height": a.height}, device_scale_factor=a.scale)).new_page()
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            await pg.goto("file://" + comp, timeout=180000); await pg.evaluate("window.__ready")
            if dur is None:
                dur = a.dur or await pg.evaluate("(window.__meta && window.__meta.dur) || null") or 15
            await pg.add_script_tag(path=JS)
            info = await pg.evaluate("c => __fast.init(c)", dict(url=url, fps=a.fps, shutter=a.shutter, samples=max(2, a.samples), gap=a.gap,
                                                                smin=max(2, a.samples_min), smax=max(2, a.samples_max), scale=a.scale, dur=dur,
                                                                lin=SRGB_TO_LIN.tolist(), out=LIN_TO_SRGB.tolist()))
            info["dur"] = dur
            return br, pg, info

        first = await open_page()
        info = first[2]; dur = info["dur"]; st["W"], st["H"] = W, H = info["W"], info["H"]
        N = int(round(dur * a.fps))
        f0 = max(0, int(round(a.t0 * a.fps))); f1 = min(N, int(round(a.t1 * a.fps))) if a.t1 else N
        if f1 <= f0:
            sys.exit(f"nothing to render: frames {f0}..{f1}")
        if (W, H) != (a.width * a.scale, a.height * a.scale):
            sys.exit(f"the canvas is {W}x{H}, the page {a.width * a.scale}x{a.height * a.scale}: render this film with tools/render_local.py")

        # the screenshot must equal the canvas (what render.py saw is what we read)
        if not a.no_check:
            br, pg, _ = first
            for t in sorted({f0, (f0 + f1) // 2, f1 - 1}):
                await pg.evaluate("t => window.__seek(t)", t / a.fps)
                shot = np.asarray(Image.open(io.BytesIO(await pg.screenshot(type="png"))).convert("RGB"))
                raw = await pg.evaluate("() => { const c = __fastCanvas(); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = ''; for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000)); return btoa(s); }")
                import base64
                can = np.frombuffer(base64.b64decode(raw), np.uint8).reshape(H, W, 4)[..., :3]
                bad = int((shot != can).any(2).sum()) if shot.shape == can.shape else -1
                if bad:
                    sys.exit(f"at {t / a.fps:.2f} s the screenshot and the canvas differ ({'size' if bad < 0 else f'{bad} pixels'}; other visible elements: {info['others'] or 'none'}). "
                             "Something is drawn outside the canvas: render this film with tools/render_local.py")

        if a.keep_frames:
            if not a.resume and os.path.isdir(fr):
                for n_ in os.listdir(fr):
                    if n_.endswith(".png"):
                        os.remove(os.path.join(fr, n_))
            os.makedirs(fr, exist_ok=True)
        on_disk = {f for f in range(f0, f1) if a.resume and os.path.exists(f"{fr}/{f:05d}.png")}
        todo = [f for f in range(f0, f1) if f not in on_disk]
        nw = max(1, min(a.workers, len(todo) or 1))
        rest = await asyncio.gather(*[open_page(dur) for _ in range(nw - 1)])
        pages = [first] + list(rest)
        how = "no shutter" if a.shutter <= 0 else f"shutter {a.shutter:g}, " + (
            f"captures per frame sized by __motion (gap {a.gap:g} px, {a.samples_min}-{a.samples_max})" if info["adaptive"] else f"{a.samples} captures per moving frame")
        print(f"render_fast: {f1 - f0} frames ({f0}..{f1 - 1}) of {N}, {W}x{H} @ {a.fps}, {how}, {nw} browsers"
              + (f", {len(on_disk)} frames already in _frames" if on_disk else "") + f"  {time.time() - t0:.0f}s to load", flush=True)
        st["next"] = f0
        # frames are handed out one at a time to whichever browser is free (a 48-sample whip frame takes ~5 s; a fixed
        # share per browser left the others waiting behind it), up to `limit` frames ahead of the encoder (6 MB each)
        limit = 8 * nw + 30
        queue = iter(todo)

        async def retry(k, job):
            """job(pg) once; if the browser was closed under it, relaunch it and try again (lose the frame, not the run)"""
            for attempt in range(4):
                br, pg, _ = pages[k]
                try:
                    return await job(pg)
                except Exception:
                    if br.is_connected() or attempt == 3:
                        raise
                    counts["relaunched"] += 1
                    pages[k] = await open_page(dur)

        async def worker(k):
            done = 0
            for f in queue:
                async with cv:
                    await cv.wait_for(lambda: f - st["next"] <= limit)
                if done and a.recycle and done % a.recycle == 0:
                    await pages[k][1].evaluate("__fast.flush()"); await pages[k][0].close(); pages[k] = await open_page(dur)
                done += 1
                c0 = time.time()
                r = await retry(k, lambda pg: pg.evaluate("([i, t]) => __fast.frame(i, t)", [f, f / a.fps]))
                counts["t_page"] += time.time() - c0
                if r["others"] is not None:
                    raise SystemExit(f"frame {f}: page elements became visible over the canvas ({r['others']}): render this film with tools/render_local.py")
                counts["captures"] += r["n"]
                if r["kind"] == "still":
                    counts["still"] += 1
                else:
                    hist[r["S"]] = hist.get(r["S"], 0) + 1
                    counts["cuts"] += r["kind"] == "cut"
            await pages[k][1].evaluate("__fast.flush()")
            if a.prof:
                pr = await pages[k][1].evaluate("window.__fastProf"); n = max(1, pr.pop("n")); s = max(1, pr.pop("samples"))
                print(f"  browser {k}: {n} frames, {s / n:.1f} samples a frame; ms per frame:", {q: round(v / n, 1) for q, v in pr.items()}, flush=True)

        cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-framerate", str(a.fps), "-i", "-"]
        if a.sfx:
            cmd += (["-ss", f"{f0 / a.fps:.6f}"] if f0 else []) + ["-i", os.path.abspath(a.sfx)]
        cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", str(a.crf), "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "5.2", "-movflags", "+faststart"]
        if a.sfx:
            cmd += ["-c:a", "aac", "-b:a", "256k", "-shortest"]
        os.makedirs(os.path.dirname(out), exist_ok=True)
        enc = await asyncio.create_subprocess_exec(*cmd, out, stdin=subprocess.PIPE)
        pool = ThreadPoolExecutor(max_workers=4)            # PNG writes for --keep-frames, off the event loop
        loop = asyncio.get_running_loop(); pending = []

        def save_png(buf, path):
            Image.frombuffer("RGB", (W, H), buf, "raw", "RGB", 0, 1).save(path + ".tmp", format="PNG", compress_level=1)
            os.replace(path + ".tmp", path)                 # preview_partial.sh never sees half a PNG

        def load_png(path):
            return Image.open(path).convert("RGB").tobytes()

        async def writer():
            for i in range(f0, f1):
                path = f"{fr}/{i:05d}.png"
                if i in on_disk:
                    buf = await loop.run_in_executor(pool, load_png, path); counts["from_disk"] += 1
                else:
                    async with cv:
                        await cv.wait_for(lambda: i in frames)
                    buf = frames.pop(i)
                    if a.keep_frames:
                        pending.append(loop.run_in_executor(pool, save_png, buf, path))
                        if len(pending) > 16:
                            await pending.pop(0)
                enc.stdin.write(buf); await enc.stdin.drain()
                st["next"] = i + 1; await notify()
            await asyncio.gather(*pending)
            enc.stdin.close()

        async def progress():
            while True:
                await asyncio.sleep(15)
                print(f"  {st['next'] - f0}/{f1 - f0}  {time.time() - t0:.0f}s", flush=True)

        tick = asyncio.create_task(progress())
        try:
            await asyncio.gather(writer(), *[worker(k) for k in range(nw)])
        except BaseException:
            enc.kill(); raise
        finally:
            tick.cancel()
            for br, _, _ in pages:
                try:
                    await br.close()
                except Exception:
                    pass
        rc = await enc.wait()
        srv.close()
        if rc:
            sys.exit(f"ffmpeg failed ({rc})")

    secs = time.time() - t0
    rendered = len(todo)
    print(f"{rendered} frames, {counts['captures']} captures ({counts['still']} still frames skipped the shutter, {counts['cuts']} kept a cut hard) in {secs:.0f}s "
          f"on {nw} browsers ({rendered / secs:.1f} frames a second); page errors: {errs[:3] or 'none'}"
          + (f"; {counts['from_disk']} frames read from _frames" if counts["from_disk"] else "")
          + (f"; relaunched a closed browser {counts['relaunched']}x" if counts["relaunched"] else ""))
    meta = {"comp": comp, "renderer": "render_fast", "fps": a.fps, "scale": a.scale, "size": [W, H], "shutter": a.shutter if a.shutter > 0 else 0,
            "samples": ("adaptive" if info["adaptive"] else max(2, a.samples)) if a.shutter > 0 else 1}
    if a.shutter > 0 and info["adaptive"]:
        meta.update(gap_px=a.gap, samples_per_moving_frame={str(k): hist[k] for k in sorted(hist)})
    meta.update(workers=nw, frames=f1 - f0, first_frame=f0, rendered_frames=rendered, still_frames=counts["still"], cut_frames=counts["cuts"],
                captures=counts["captures"], seconds=round(secs, 1), final=a.final)
    json.dump(meta, open(os.path.splitext(out)[0] + ".render.json", "w"), indent=1)
    print("wrote", out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("comp"); ap.add_argument("--out", default="draft.mp4")
    ap.add_argument("--fps", type=int, default=30); ap.add_argument("--scale", type=int, default=1)
    ap.add_argument("--final", action="store_true", help="60 fps at --scale 2 (sets --fps 60 --scale 2), only once the cut is accepted")
    ap.add_argument("--shutter", type=float, default=180.0, help="shutter angle in degrees; 0 = no motion blur")
    ap.add_argument("--samples", type=int, default=8, help="captures per moving frame when the page has no window.__motion")
    ap.add_argument("--gap", type=float, default=6.0, help="px between neighbouring captures, for a page with window.__motion")
    ap.add_argument("--samples-min", type=int, default=4); ap.add_argument("--samples-max", type=int, default=48)
    ap.add_argument("--workers", type=int, default=max(1, min(10, (os.cpu_count() or 3) - 4)), help="browsers drawing in parallel (each is one CPU core)")
    ap.add_argument("--width", type=int, default=1080); ap.add_argument("--height", type=int, default=1920)
    ap.add_argument("--dur", type=float, default=None); ap.add_argument("--t0", type=float, default=0.0); ap.add_argument("--t1", type=float, default=None)
    ap.add_argument("--sfx", default=None); ap.add_argument("--crf", type=int, default=16)
    ap.add_argument("--keep-frames", action="store_true", help="also write every frame as a PNG in <out dir>/_frames (preview_partial.sh, --resume)")
    ap.add_argument("--resume", action="store_true", help="with --keep-frames: frames already in _frames are reused, only the missing ones are rendered")
    ap.add_argument("--recycle", type=int, default=0, help="relaunch each browser after this many frames (0 = never)")
    ap.add_argument("--gpu", action="store_true", help="launch Chromium on the GPU (as render.py --gpu); the 2D canvas stays on the CPU either way")
    ap.add_argument("--no-check", action="store_true", help="skip the screenshot = canvas check at the start")
    ap.add_argument("--prof", action="store_true", help="print where each browser spends a frame")
    a = ap.parse_args()
    if a.final:
        a.fps, a.scale = 60, 2
    if a.resume and not a.keep_frames:
        sys.exit("--resume reuses the PNGs of --keep-frames: pass both")
    asyncio.run(run(a))


if __name__ == "__main__":
    main()
