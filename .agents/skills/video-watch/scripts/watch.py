#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.10"
# dependencies = ["yt-dlp[default]", "imageio-ffmpeg"]
# ///
"""Turn a video (a link or a local file) into still frames plus timestamped
subtitles, so an AI agent can see what is on screen and read what is said.

Usage: uv run --script watch.py SOURCE [--max-frames N] [--every SEC]
                                       [--start T] [--end T] [--width PX] [--lang en]
                                       [--browser chrome]
"""

import argparse
import html
import json
import math
import os
import re
import shutil
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
TS = r"(?:\d+:)?\d{1,2}:\d{2}[.,]\d{3}"


def parse_time(value):
    """'90', '1:30' or '00:01:30.5' -> seconds."""
    if value is None:
        return None
    seconds = 0.0
    for part in str(value).replace(",", ".").split(":"):
        seconds = seconds * 60 + float(part)
    return seconds


def fmt(t):
    t = int(round(t))
    return f"{t // 3600:02d}:{t % 3600 // 60:02d}:{t % 60:02d}"


def slug(text):
    return re.sub(r"[^A-Za-z0-9_-]+", "-", text).strip("-")[:60] or "video"


def duration_of(video):
    r = subprocess.run([FFMPEG, "-hide_banner", "-i", str(video)], capture_output=True, text=True)
    m = re.search(r"Duration: (\d+):(\d+):(\d+(?:\.\d+)?)", r.stderr)
    if not m:
        fail(f"Could not read the length of {video}. Is it a video file?")
    h, mnt, s = m.groups()
    return int(h) * 3600 + int(mnt) * 60 + float(s)


def fail(message):
    print(json.dumps({"ok": False, "error": message}))
    sys.exit(1)


def download(url, out_root, lang, browser=None):
    """Download with yt-dlp (720p max). Returns (folder, video_path, info).
    browser: use that browser's sign-ins (e.g. 'chrome'), for private or login-only videos."""
    base = [
        sys.executable, "-m", "yt_dlp", url,
        "--no-playlist",
        "-f", "bv*[height<=720]+ba/b[height<=720]/bv*+ba/b",
        "--merge-output-format", "mp4",
        "--ffmpeg-location", FFMPEG,
        "--write-info-json",
        "-o", str(out_root / "%(extractor_key)s-%(id)s" / "video.%(ext)s"),
        "--no-simulate", "--print", "after_move:filepath", "--quiet",
    ]
    if browser:
        base += ["--cookies-from-browser", browser]
    subs = ["--write-subs", "--write-auto-subs", "--sub-langs", f"{lang}.*,{lang}", "--sub-format", "vtt/best"]
    for cmd in (base + subs, base):  # if subtitles break the download, retry without them
        r = subprocess.run(cmd, capture_output=True, text=True)
        lines = [l for l in r.stdout.splitlines() if l.strip()]
        if lines and Path(lines[-1]).is_file():
            video = Path(lines[-1])
            info_file = video.with_suffix(".info.json")
            info = json.loads(info_file.read_text("utf-8")) if info_file.is_file() else {}
            return video.parent, video, info
    fail("Download failed: " + (r.stderr.strip().splitlines() or ["unknown error"])[-1])


def parse_subs(path):
    """VTT or SRT -> [(start_seconds, text)], with rolling auto-caption repeats removed."""
    cues, last = [], None
    for block in re.split(r"\n\s*\n", path.read_text("utf-8", errors="replace")):
        lines = block.strip().splitlines()
        for i, line in enumerate(lines):
            m = re.match(rf"\s*({TS})\s*-->\s*({TS})", line)
            if not m:
                continue
            start = parse_time(m.group(1))
            for raw in lines[i + 1:]:
                text = html.unescape(re.sub(r"<[^>]+>", "", raw)).strip()
                if text and text != last:
                    cues.append((start, text))
                    last = text
            break
    return cues


def find_subs(folder, video, lang):
    exact = [folder / f"video.{lang}.vtt", folder / f"video.{lang}.srt"]
    candidates = [f for f in exact if f.is_file()]
    candidates += sorted(folder.glob("video.*.vtt")) + sorted(folder.glob("video.*.srt"))
    candidates += [video.with_suffix(ext) for ext in (".vtt", ".srt") if video.with_suffix(ext).is_file()]
    return candidates[0] if candidates else None


def grab_frame(video, t, out, width):
    subprocess.run(
        [FFMPEG, "-hide_banner", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", str(video),
         "-frames:v", "1", "-vf", f"scale=w='min({width},iw)':h=-2", "-q:v", "3", "-y", str(out)],
        check=False,
    )
    return out if out.is_file() else None


def main():
    p = argparse.ArgumentParser(description="Turn a video into frames + subtitles an AI can watch.")
    p.add_argument("source", nargs="?", help="Video URL (YouTube, TikTok, X, Vimeo...) or a local file")
    p.add_argument("--max-frames", type=int, default=30, help="Most frames to grab (default 30)")
    p.add_argument("--every", type=float, help="Grab a frame every N seconds instead of auto spacing")
    p.add_argument("--start", help="Only look from this time, e.g. 1:30")
    p.add_argument("--end", help="Only look until this time, e.g. 2:15")
    p.add_argument("--width", type=int, default=768, help="Frame width in pixels (default 768)")
    p.add_argument("--lang", default="en", help="Subtitle language (default en)")
    p.add_argument("--out", default="downloads", help="Output folder (default ./downloads)")
    p.add_argument("--browser", help="Use this browser's sign-ins for private or login-only videos, "
                                     "e.g. chrome, safari, firefox, or 'chrome:Profile 1'")
    p.add_argument("--check", action="store_true", help="Install/verify the tools, then exit")
    a = p.parse_args()

    if a.check:
        import yt_dlp.version
        print(json.dumps({"ok": True, "yt_dlp": yt_dlp.version.__version__, "ffmpeg": FFMPEG}))
        return
    if not a.source:
        p.error("give a video URL or file path")

    out_root = Path(a.out).resolve()
    local = Path(a.source).expanduser()
    if local.is_file():
        video, info = local.resolve(), {"title": local.name}
        folder = out_root / f"local-{slug(local.stem)}"
        folder.mkdir(parents=True, exist_ok=True)
    elif re.match(r"https?://", a.source):
        out_root.mkdir(parents=True, exist_ok=True)
        folder, video, info = download(a.source, out_root, a.lang, a.browser)
    else:
        fail(f"Not a URL and no such file: {a.source}")

    total = duration_of(video)
    start = max(0.0, parse_time(a.start) or 0.0)
    end = min(total, parse_time(a.end) or total)
    if end <= start:
        fail(f"--start/--end are outside the video (length {fmt(total)})")
    span = end - start
    step = a.every or max(2.0, span / a.max_frames)
    count = min(a.max_frames, max(1, math.floor(span / step)))
    times = [start + step * (i + 0.5) for i in range(count)]

    part = "" if (start == 0 and end == total) else f"_{fmt(start)}_{fmt(end)}".replace(":", "-")
    frames_dir = folder / f"frames{part}"
    shutil.rmtree(frames_dir, ignore_errors=True)
    frames_dir.mkdir(parents=True)
    with ThreadPoolExecutor(max_workers=4) as pool:
        frames = list(pool.map(
            lambda it: grab_frame(video, it[1], frames_dir / f"{it[0] + 1:03d}_{fmt(it[1]).replace(':', '-')}.jpg", a.width),
            enumerate(times)))

    sub_file = find_subs(folder, video, a.lang)
    cues = parse_subs(sub_file) if sub_file else []
    if cues:
        (folder / "transcript.txt").write_text("\n".join(f"[{fmt(t)}] {s}" for t, s in cues) + "\n", "utf-8")

    title = info.get("title") or video.name
    lines = [
        f"# {title}", "",
        f"- Source: {info.get('webpage_url') or a.source}",
        f"- Channel: {info.get('uploader') or info.get('channel') or 'n/a'}",
        f"- Length: {fmt(total)}" + (f" (looking at {fmt(start)}-{fmt(end)})" if part else ""),
        f"- Frames: {sum(1 for f in frames if f)}, one every {step:.1f}s",
        f"- Subtitles: {'yes (' + sub_file.name + ')' if cues else 'none found'}",
        f"- Video file: {video}", "",
    ]
    for t, frame in zip(times, frames):
        said = " ".join(s for ts, s in cues if t - step / 2 <= ts < t + step / 2)
        lines.append(f"## {fmt(t)}")
        lines.append(f"frame: {frame.relative_to(folder) if frame else '(could not grab)'}")
        if said:
            lines.append(f"said: {said[:400]}")
        lines.append("")
    index = folder / f"index{part}.md"
    index.write_text("\n".join(lines), "utf-8")

    print(json.dumps({
        "ok": True, "title": title, "folder": str(folder), "index": str(index),
        "frames": sum(1 for f in frames if f), "every_seconds": round(step, 1),
        "length": fmt(total), "subtitles": bool(cues), "video": str(video),
    }))


if __name__ == "__main__":
    main()
