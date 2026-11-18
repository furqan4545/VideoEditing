#!/usr/bin/env python3
"""render_gpu.py - paper3d's fast renderer: the same film, the same motion blur, without a screenshot per sample.

  python tools/render_gpu.py film/comp.html --out out/film_v1_silent.mp4            # 1080x1920, 30 fps, shutter 180
  python tools/render_gpu.py film/comp.html --out out/draft.mp4 --shutter 0         # no motion blur (quick look)
  python tools/render_gpu.py film/comp.html --out out/part.mp4 --t0 13 --t1 36      # only 13.0 to 36.0 s

Why. render3d.py takes a Chrome PNG screenshot of every shutter sample (about 270 ms each), decodes it in Python and
averages in linear light. Drawing a sample on the GPU takes about 15 ms, so 95 percent of a render was PNGs.
Here tools/gpu_frame.js (injected into the page) adds every sample in linear light into a float target on the GPU,
runs render3d's cut check on 1/8-size thumbnails, multiplies the paper grain, and POSTs the finished frame as raw RGBA
to a small server in this script (as a Blob: a Uint8Array body took 200 ms to upload, a Blob 6 ms). The HTML overlay
(captions, labels, leader lines) is placed by separate browsers that never draw 3D, copied from Chrome only when it
changed and only where it draws, and laid on top here. Frames go straight into ffmpeg, in order.

Shadows: the soft shadow map (4096 px VSM) was about 60% of a sample, so it is drawn once per frame at the middle
sample and reused by that frame's other samples (at most 1/60 s away). On reel 15 that doubled the speed (4.5 -> 9.1
frames a second) and the frames differed from per-sample shadows by less than two per-sample runs differ from each
other. --exact-shadows draws it for every sample.

Differences from render3d.py: captions and labels are drawn crisp at the frame time instead of averaged over the
shutter (a word lighting up no longer shows one half-lit frame); --scale 2 is not supported. Measured on the demo film:
the 3D itself differs between two runs of the SAME renderer (ambient-occlusion noise, ~0.25% of pixels by more than 8
levels), and between the two renderers by no more than that.

Same sample times and counts as render3d (window.__motion, --gap px, --samples-min..max), same cut rule, same x264
settings, and a <out>.render.json next to the film. The comp is untouched: any paper3d film renders with either tool.
"""
import argparse, asyncio, io, json, math, os, subprocess, sys, time

import numpy as np
from PIL import Image
from playwright.async_api import async_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
GPU_JS = os.path.join(HERE, "gpu_frame.js")
GPU_ARGS = ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-gpu-rasterization",
            "--allow-file-access-from-files", "--disable-web-security", "--js-flags=--expose-gc"]   # gc: see gpu_frame.js


def over(arr, x, y, p):
    """Lay an RGBA overlay patch (straight alpha, sRGB, as Chrome composites it) onto the frame at x, y."""
    H, W = arr.shape[:2]
    h, w = min(p.shape[0], H - y), min(p.shape[1], W - x)
    if h <= 0 or w <= 0:
        return
    p = p[:h, :w]
    if not p[..., 3].any():
        return
    a = p[..., 3:4].astype(np.float32) * (1.0 / 255.0)
    reg = arr[y:y + h, x:x + w, :3]
    reg[:] = np.rint(p[..., :3] * a + reg * (1.0 - a)).astype(np.uint8)


async def run(a):
    comp = os.path.abspath(a.comp)
    st = dict(next=0, W=0, H=0)
    frames, ovs, hist, errs = {}, {}, {}, []
    counts = dict(captures=0, cuts=0, grabs=0, relaunched=0, t_gpu=0.0, t_grab=0.0, grab_px=0)
    cv = asyncio.Condition()

    async def notify():
        async with cv:
            cv.notify_all()

    # ---- the local server the page POSTs finished frames to
    async def handle(reader, writer):
        try:
            while True:
                line = await reader.readline()
                if not line:
                    break
                parts = line.decode("latin1").split()
                if len(parts) < 2:
                    break
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
                    if len(body) == st["W"] * st["H"] * 4:
                        frames[int(path[3:])] = body; code = "200 OK"; await notify()
                    else:
                        code = "400 Bad Request"
                writer.write((f"HTTP/1.1 {code}\r\nAccess-Control-Allow-Origin: *\r\nAccess-Control-Allow-Methods: POST, OPTIONS\r\n"
                              "Access-Control-Allow-Headers: *\r\nAccess-Control-Allow-Private-Network: true\r\nContent-Length: 0\r\nConnection: close\r\n\r\n").encode())
                await writer.drain()
                break                                   # one request per connection: a reused keep-alive socket raced a close ("Failed to fetch" at frame 932)
        except (asyncio.IncompleteReadError, ConnectionResetError, BrokenPipeError):
            pass
        finally:
            writer.close()

    srv = await asyncio.start_server(handle, "127.0.0.1", 0, limit=1 << 25)
    url = f"http://127.0.0.1:{srv.sockets[0].getsockname()[1]}"
    shutter = 0.0 if a.shutter <= 0 else a.shutter

    async with async_playwright() as p:
        async def open_page(role):
            br = await p.chromium.launch(args=GPU_ARGS)
            pg = await (await br.new_context(viewport={"width": a.width, "height": a.height}, device_scale_factor=1)).new_page()
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            await pg.goto("file://" + comp, timeout=180000); await pg.evaluate("window.__ready")
            await pg.add_script_tag(path=GPU_JS)
            info = await pg.evaluate("c => __gpu.init(c)", dict(url=url, fps=a.fps, shutter=shutter, samples=max(2, a.samples), gap=a.gap, role=role,
                                                              smin=max(2, a.samples_min), smax=max(2, a.samples_max), scale=1, dur=a.dur or 0,
                                                              fastShadows=not a.exact_shadows))
            return br, pg, info

        t0 = time.time()
        first = await open_page("gpu")
        info = first[2]; st["W"], st["H"] = W, H = info["W"], info["H"]
        dur = a.dur or info["dur"]; N = int(round(dur * a.fps))
        f0 = max(0, int(round((a.t0 or 0) * a.fps))); f1 = min(N, int(round(a.t1 * a.fps))) if a.t1 else N
        if f1 <= f0:
            sys.exit(f"nothing to render: frames {f0}..{f1}")
        nw = max(1, min(a.workers, f1 - f0)); no = max(1, min(a.overlay_workers, f1 - f0))
        rest = await asyncio.gather(*[open_page("gpu") for _ in range(nw - 1)], *[open_page("overlay") for _ in range(no)])
        gpus, ovps = [first] + list(rest[:nw - 1]), list(rest[nw - 1:])
        st["next"] = f0
        how = "no shutter" if shutter <= 0 else f"shutter {shutter:g}, " + (
            f"captures per frame sized by __motion (gap {a.gap:g} px, {a.samples_min}-{a.samples_max})" if info["adaptive"] else f"{a.samples} captures per moving frame")
        print(f"render_gpu: {f1 - f0} frames ({f0}..{f1 - 1}) of {N}, {W}x{H} @ {a.fps}, {how}, {nw} GPU + {no} overlay browsers on {info['gpu']}, "
              f"grain {'on GPU' if info['grain'] else 'none'}, shadows {'every sample' if a.exact_shadows else 'once per frame'}  {time.time() - t0:.0f}s to load", flush=True)
        limit = 3 * max(nw, no) + 6
        png_set = {int(x) for x in a.png_frames.split(",") if x.strip()} if a.png_frames else set()
        if png_set:
            os.makedirs(a.png_dir, exist_ok=True)

        async def retry(pool, k, role, job):
            """job(pg) once; if the browser was closed under it, relaunch it and try again (lose the frame, not the run)"""
            for attempt in range(4):
                br, pg, _ = pool[k]
                try:
                    return await job(pg)
                except Exception:
                    if br.is_connected() or attempt == 3:
                        raise
                    counts["relaunched"] += 1
                    pool[k] = await open_page(role)

        async def gpu_worker(k):
            for f in range(f0 + k, f1, nw):
                async with cv:
                    await cv.wait_for(lambda: f - st["next"] <= limit)
                c0 = time.time()
                r = await retry(gpus, k, "gpu", lambda pg: pg.evaluate("([i, t]) => __gpu.frame(i, t)", [f, f / a.fps]))
                counts["t_gpu"] += time.time() - c0
                counts["captures"] += r["S"]; counts["cuts"] += r["cut"]; hist[r["S"]] = hist.get(r["S"], 0) + 1
            pg = gpus[k][1]
            await pg.evaluate("__gpu.flush()")
            if a.prof:
                pr = await pg.evaluate("window.__gpuProf"); n = max(1, pr.pop("n"))
                print(f"  GPU browser {k} ms per frame:", {q: round(v / n, 1) for q, v in pr.items()}, flush=True)

        async def overlay_worker(k):
            last = []
            for f in range(f0 + k, f1, no):
                async with cv:
                    await cv.wait_for(lambda: f - st["next"] <= limit)
                c0 = time.time()

                async def job(pg):
                    r = await pg.evaluate("t => __gpu.overlay(t)", f / a.fps)
                    if r["same"]:
                        return None
                    pat = []
                    for b in r["boxes"]:
                        png = await pg.screenshot(type="png", omit_background=True, clip=b)
                        pat.append((b["x"], b["y"], np.asarray(Image.open(io.BytesIO(png)).convert("RGBA"))))
                        counts["grabs"] += 1; counts["grab_px"] += b["width"] * b["height"]
                    return pat
                pat = await retry(ovps, k, "overlay", job)
                if pat is not None:
                    last = pat
                counts["t_grab"] += time.time() - c0
                ovs[f] = last; await notify()

        cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-framerate", str(a.fps), "-i", "-"]
        if a.sfx:
            cmd += (["-ss", f"{f0 / a.fps:.6f}"] if f0 else []) + ["-i", os.path.abspath(a.sfx)]
        cmd += ["-c:v", "libx264", "-preset", "medium", "-crf", str(a.crf), "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "5.2", "-movflags", "+faststart"]
        if a.sfx:
            cmd += ["-c:a", "aac", "-b:a", "256k", "-shortest"]
        out = os.path.abspath(a.out); os.makedirs(os.path.dirname(out), exist_ok=True)
        enc = await asyncio.create_subprocess_exec(*cmd, out, stdin=subprocess.PIPE)

        async def writer():
            for i in range(f0, f1):
                async with cv:
                    await cv.wait_for(lambda: i in frames and i in ovs)
                buf, pat = frames.pop(i), ovs.pop(i)
                if pat or i in png_set:
                    arr = np.frombuffer(buf, np.uint8).reshape(H, W, 4).copy()
                    for x, y, pp in pat:
                        over(arr, x, y, pp)
                    if i in png_set:
                        Image.fromarray(arr[..., :3]).save(os.path.join(a.png_dir, f"{i:05d}.png"), compress_level=1)
                    buf = memoryview(arr).cast("B")
                enc.stdin.write(buf); await enc.stdin.drain()
                st["next"] = i + 1; await notify()
            enc.stdin.close()

        async def progress():
            while True:
                await asyncio.sleep(15)
                print(f"  {st['next'] - f0}/{f1 - f0}  {time.time() - t0:.0f}s", flush=True)

        tick = asyncio.create_task(progress())
        try:
            await asyncio.gather(writer(), *[gpu_worker(k) for k in range(nw)], *[overlay_worker(k) for k in range(no)])
        except BaseException:
            enc.kill(); raise
        finally:
            tick.cancel()
            for br, _, _ in gpus + ovps:
                try:
                    await br.close()
                except Exception:
                    pass
        rc = await enc.wait()
        srv.close()
        if rc:
            sys.exit(f"ffmpeg failed ({rc})")

    secs = time.time() - t0
    print(f"{f1 - f0} frames, {counts['captures']} captures ({counts['cuts']} kept a cut hard), {counts['grabs']} overlay grabs in {secs:.0f}s "
          f"on {nw} GPU + {no} overlay browsers ({(f1 - f0) / secs:.1f} frames a second); page errors: {errs[:3] or 'none'}"
          + f"; busy time: GPU browsers {counts['t_gpu']:.0f}s, overlay browsers {counts['t_grab']:.0f}s ({counts['grab_px'] / max(1, counts['grabs']) / 1e3:.0f}k px each)"
          + (f"; relaunched a closed browser {counts['relaunched']}x" if counts["relaunched"] else ""))
    meta = {"comp": comp, "renderer": "render_gpu", "fps": a.fps, "scale": 1, "size": [W, H], "shutter": shutter,
            "samples": ("adaptive" if info["adaptive"] else max(2, a.samples)) if shutter > 0 else 1}
    if shutter > 0 and info["adaptive"]:
        meta.update(gap_px=a.gap, samples_per_moving_frame={str(k): hist[k] for k in sorted(hist)})
    meta.update(shadows="every sample" if a.exact_shadows else "once per frame", workers=nw, overlay_workers=no, frames=f1 - f0, first_frame=f0, still_frames=0, cut_frames=counts["cuts"], captures=counts["captures"],
                overlay_grabs=counts["grabs"], seconds=round(secs, 1), final=False)
    json.dump(meta, open(os.path.splitext(out)[0] + ".render.json", "w"), indent=1)
    print("wrote", out)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("comp"); ap.add_argument("--out", default="draft.mp4")
    ap.add_argument("--fps", type=int, default=30)
    ap.add_argument("--shutter", type=float, default=180.0, help="shutter angle in degrees; 0 = no motion blur")
    ap.add_argument("--samples", type=int, default=8, help="captures per moving frame when the page has no window.__motion")
    ap.add_argument("--gap", type=float, default=6.0, help="px between neighbouring captures, for a page with window.__motion")
    ap.add_argument("--samples-min", type=int, default=4); ap.add_argument("--samples-max", type=int, default=48)
    ap.add_argument("--workers", type=int, default=2, help="browsers drawing on the GPU (the GPU is the limit: 1, 2, 3 ran 7.7, 8.1, 8.2 frames a second on the demo)")
    ap.add_argument("--overlay-workers", type=int, default=2, help="browsers that only place and copy the HTML overlay (no 3D)")
    ap.add_argument("--width", type=int, default=1080); ap.add_argument("--height", type=int, default=1920)
    ap.add_argument("--dur", type=float, default=None); ap.add_argument("--t0", type=float, default=0.0); ap.add_argument("--t1", type=float, default=None)
    ap.add_argument("--sfx", default=None); ap.add_argument("--crf", type=int, default=16)
    ap.add_argument("--png-frames", default="", help="comma-separated frame numbers to also save as PNG (checks)")
    ap.add_argument("--png-dir", default="out/gpu_png")
    ap.add_argument("--exact-shadows", action="store_true", help="redraw the shadow map for every shutter sample (about 2x slower; default: once per frame)")
    ap.add_argument("--prof", action="store_true", help="print where each browser spends a frame")
    ap.add_argument("--gpu", action="store_true", help="accepted for render3d.py compatibility (always on)")
    ap.add_argument("--scale", type=int, default=1, help="only 1 (the film is drawn at its own size)")
    a = ap.parse_args()
    if a.scale != 1:
        sys.exit("render_gpu.py renders at the film's own size only (--scale 1); use render3d.py for --scale 2")
    asyncio.run(run(a))


if __name__ == "__main__":
    main()
