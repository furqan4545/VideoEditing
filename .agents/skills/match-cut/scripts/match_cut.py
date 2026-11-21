#!/usr/bin/env python3
"""Make an audio-timed match cut from a drop of photos, clips, or one continuous take."""

import argparse
import json
import math
import subprocess
import tempfile
from contextlib import ExitStack, closing
from itertools import repeat
from pathlib import Path

import cv2
import numpy as np
from picture import (
    AUDIO,
    IMAGES,
    VIDEOS,
    CornerWarp,
    compare,
    compose,
    fixed_crop,
    probe,
    read_image,
    resized_size,
    scan,
    video_frames,
)
from PIL import Image, ImageDraw
from sound import (
    DEFAULT_SHUTTER,
    RATE,
    SHUTTER_FILTER,
    get_bed,
    schedule,
    soundtrack,
    steady_schedule,
)


def collect(paths):
    files = []
    for item in paths:
        path = Path(item).expanduser().resolve()
        if path.is_dir():
            files.extend(
                sorted(
                    f
                    for f in path.iterdir()
                    if f.is_file()
                    and not f.name.startswith(".")
                    and f.suffix.lower() in IMAGES | VIDEOS
                )
            )
        elif path.is_file() and path.suffix.lower() in IMAGES | VIDEOS | AUDIO:
            files.append(path)
        else:
            raise ValueError(f"Unsupported or missing input: {path}")
    files = list(dict.fromkeys(files))
    return (
        [p for p in files if p.suffix.lower() not in AUDIO],
        [p for p in files if p.suffix.lower() in AUDIO],
    )


def candidates(src, length, low, high, fps):
    if src.still:
        return [0.0]
    limit = (src.duration - length) * src.hz
    last = min(len(src.samples) - 1, math.floor(min(limit, high * src.hz) + 0.00001))
    starts = []
    for i in range(max(0, math.ceil(low * src.hz - 0.00001)), last + 1):
        t = i / src.hz
        if src.at(t + max(0, length - 1 / fps)).scene == src.samples[i].scene:
            starts.append(t)
    return starts


class InsufficientWindows(ValueError):
    pass


def matching_motion(outgoing, incoming):
    a, b = outgoing.flow, incoming.flow
    va, vb = np.linalg.norm(a), np.linalg.norm(b)
    return (
        min(va, vb) >= 0.024
        and np.dot(a, b) >= 0.76 * va * vb
        and np.linalg.norm(outgoing.locus - incoming.locus) <= 0.15
    )


def action_starts(src, lengths, fps):
    """Match motion across camera shots, or distant thirds of a continuous source."""
    paths = [(0.0, (), (), None)]
    preferred_regions = (0, 2, 1)
    spare = max(0.0, src.duration - sum(lengths))
    guard = min(1.0, 0.4 * spare / max(1, len(lengths) - 1))
    for i, length in enumerate(lengths):
        groups = {}
        for t in candidates(src, length, 0, src.duration, fps):
            entry = src.at(t)
            region = min(2, int(3 * (t + length / 2) / src.duration))
            groups.setdefault((entry.scene, region), []).append(t)
        if not groups:
            raise ValueError(f"No uninterrupted source shot fits {length:.2f}s.")
        # Sample each scene/region so short inserts survive the search budget.
        limit = max(3, 240 // len(groups))
        scene_count = len({scene for scene, region in groups})
        next_paths = []
        for (scene, region), starts in groups.items():
            for index in np.linspace(
                0, len(starts) - 1, min(limit, len(starts)), dtype=int
            ):
                t = starts[index]
                end = t + length
                incoming = src.at(t + min(length / 2, 1 / src.hz))
                outgoing = src.at(max(t, end - 1 / fps))
                best = None
                for cost, spans, history, last in paths:
                    if any(
                        t < old_end + guard - 1e-7 and end > old_start - guard + 1e-7
                        for old_start, old_end in spans
                    ):
                        continue
                    if history:
                        old_scene, old_region = history[-1]
                        if scene_count > 1 and scene == old_scene:
                            continue
                        prev_start, prev_end = spans[-1]
                        gap = max(t - prev_end, prev_start - end)
                        if scene == old_scene and (
                            old_region == region or gap < min(5.0, src.duration * 0.16)
                        ):
                            continue
                    # Break chronology on purpose. Prefer early, late, middle on
                    # the opening three shots while still comparing the action phase.
                    score = cost
                    if i < 3 and region != preferred_regions[i]:
                        score += 0.85
                    if last is not None:
                        score += compare(last, incoming, True)
                        if not matching_motion(last, incoming):
                            score += 1.25
                        score += 0.3 * (region == history[-1][1])
                        if scene_count > 1:
                            score += 0.42 * sum(
                                old_scene == scene for old_scene, _ in history
                            )
                            if any(old_scene == scene for old_scene, _ in history[-3:]):
                                score += 0.45
                    else:
                        score -= 0.24 * min(1.0, np.linalg.norm(incoming.flow) * 5)
                    if best is None or score < best[0]:
                        best = (
                            score,
                            spans + ((t, end),),
                            history + ((scene, region),),
                            outgoing,
                        )
                if best is not None:
                    next_paths.append(best)
        if not next_paths:
            raise InsufficientWindows(
                "Too few non-overlapping excerpts from different scenes or distant time regions. "
                "Use a shorter edit or a longer source."
            )
        next_paths.sort(key=lambda item: item[0])
        # Keep a plausible continuation in each region as well as the best joins.
        paths = next_paths[:10]
        kept = {p[2][-1] for p in paths}
        for item in next_paths[10:]:
            if item[2][-1] not in kept:
                paths.append(item)
                kept.add(item[2][-1])
            if len(paths) >= 20:
                break
    return [t for t, _ in min(paths, key=lambda p: p[0])[1]]


def select_shots(sources, marks, end_frame, keep_order, motif, fps):
    single = len(sources) == 1
    remaining = list(sources)
    used_windows = {}
    previous = None
    result = []
    boundaries = [m[0] for m in marks] + [end_frame]
    chosen = action_starts(sources[0], np.diff(boundaries) / fps, fps) if single else ()
    for i, (begin, kind, accent) in enumerate(marks):
        end = boundaries[i + 1]
        length = (end - begin) / fps
        best = None
        if not remaining:
            remaining = list(sources)
        pool = (
            sources if single else (remaining[:1] if keep_order or not i else remaining)
        )
        for src in pool:
            if not single and result and str(src.path) == result[-1]["source"]:
                continue
            starts = (
                [chosen[i]]
                if single
                else candidates(src, length, 0.0, src.duration, fps)
            )
            for t in starts:
                if any(
                    t < used_end - 1e-7 and t + length > used_start + 1e-7
                    for used_start, used_end in used_windows.get(src.path, ())
                ):
                    continue
                entry = src.at(t)
                # Flow is measured from the preceding proxy frame. Use the first in-shot
                # vector, never motion across a source edit.
                near = src.at(t + min(length / 2, 1 / max(1, src.hz)))
                action = previous is not None and previous[1] and not src.still
                if previous:
                    score = compare(previous[0], near if action else entry, action)
                else:
                    score = -0.16 * min(1.0, np.linalg.norm(near.flow) * 5)
                if best is None or score < best[0]:
                    best = (score, src, t, entry, near, action)
        if best is None:
            raise ValueError(
                f"No uninterrupted source window fits shot {i + 1} ({length:.2f}s). "
                "Shorten --duration or choose a longer take."
            )
        _, src, t, entry, near, action = best
        if not single:
            remaining.remove(src)
            if not src.still:
                used_windows.setdefault(src.path, []).append((t, t + length))
        exit_sample = src.at(t + length - 1 / fps)
        box = entry.box if src.still else None
        if not src.still and (not single or motif != "auto"):
            # A single transform preserves travel within the shot. Lock a stable motif
            # when it can be found at both ends and halfway through the excerpt.
            boxes = [s.box for s in (entry, src.at(t + length / 2), exit_sample)]
            if all(boxes) and np.max(np.ptp(boxes, axis=0)) < 0.12:
                box = np.median(boxes, axis=0).tolist()
        decision = "opening"
        if previous:
            decision = "graphic" if not action else "graphic fallback"
            if action and matching_motion(previous[0], near):
                decision = "action"
        result.append(
            {
                "source": str(src.path),
                "still": src.still,
                "source_audio": src.audio,
                "source_size": list(src.size),
                "in_seconds": round(t, 7),
                "source_scene": entry.scene if not src.still else None,
                "source_region": ("early", "middle", "late")[
                    min(2, int(3 * (t + length / 2) / src.duration))
                ]
                if not src.still
                else None,
                "frames": end - begin,
                "timeline_frame": begin,
                "match": decision,
                "anchor": box,
                "cue": kind,
                "cue_seconds": accent,
            }
        )
        previous = (exit_sample, not src.still)
    return result


def make_plan(args, tmp):
    paths, sounds = collect(args.inputs)
    if not paths or (len(paths) == 1 and paths[0].suffix.lower() in IMAGES):
        raise ValueError(
            "Give me at least two pictures/shots or one video with two distinct moments."
        )
    if len(sounds) > 1 and not (args.audio or args.shutter):
        raise ValueError(
            "Several sound files were dropped. Use --shutter to choose the effect."
        )
    sources = []
    seen_photos = set()
    for path in paths:
        print("Analyzing", path.name, flush=True)
        source = scan(path, args.motif)
        if source.still:
            key = (source.size, source.photo_digest)
            if key in seen_photos:
                print("Skipping duplicate picture:", path.name, flush=True)
                continue
            seen_photos.add(key)
        sources.append(source)
    single = len(sources) == 1
    if single and sources[0].still:
        raise ValueError("Give me at least two visually different pictures.")
    if single and all(
        np.array_equal(s.color, sources[0].samples[0].color)
        and np.array_equal(s.layout, sources[0].samples[0].layout)
        for s in sources[0].samples
    ):
        raise ValueError(
            "The sampled pictures are identical. Add another shot or a take with movement."
        )
    photos_only = all(src.still for src in sources)
    duration = args.duration
    if duration is None and photos_only and not args.audio:
        duration = 10.0
    if duration is not None and (not math.isfinite(duration) or duration <= 0):
        raise ValueError("Duration must be positive.")
    if args.audio_start < 0 or not math.isfinite(args.audio_start):
        raise ValueError("The audio offset must be zero or greater.")
    audio = {
        "bed": None,
        "offset": args.audio_start,
        "location_sound": args.location_sound,
    }
    if args.audio:
        # A continuous bed is available only when explicitly selected.
        fps = 30
        seconds = duration or (
            min(8.0, sources[0].duration * 0.58)
            if single
            else len(sources) * (0.084 if args.pace == "burst" else 0.22)
        )
        path, bed = get_bed(
            [Path(args.audio).expanduser().resolve()], seconds, args.audio_start, True
        )
        if duration and len(bed) / RATE < seconds - 1 / fps:
            raise ValueError("Soundtrack is shorter than the requested edit.")
        frames = round(min(seconds, len(bed) / RATE) * fps)
        count = (
            max(2, round(frames / fps / (0.24 if args.pace == "burst" else 0.48)))
            if single
            else len(sources)
        )
        marks, grid = schedule(count, frames, fps, bed, tmp / "analysis.wav")
        audio.update(bed=str(path), grid=grid)
    else:
        fps = 60
        path = (
            Path(args.shutter or (sounds[0] if sounds else DEFAULT_SHUTTER))
            .expanduser()
            .resolve()
        )
        speed = (
            args.shutter_speed
            if args.shutter_speed is not None
            else (2.0 if args.pace == "burst" else 1.0)
        )
        audio.update(
            shutter=str(path),
            filter=SHUTTER_FILTER,
            shutter_mode="steady-loop",
            shutter_speed=speed,
        )
        if single and duration is None:
            duration = min(2.6, sources[0].duration * 0.36)
        marks, frames = steady_schedule(speed, fps, duration, len(sources))
        if args.keep_order and len(sources) > len(marks):
            indices = np.linspace(0, len(sources) - 1, len(marks)).round().astype(int)
            sources = [sources[i] for i in indices]
    while True:
        try:
            shots = select_shots(
                sources, marks, frames, args.keep_order, args.motif, fps
            )
            break
        except InsufficientWindows:
            if not single or len(marks) < 4:
                raise
            if args.audio:
                marks = marks[::2]
            elif args.duration is None:
                # Shorten an automatic action edit to the available distant moments.
                # Every retained boundary keeps the requested cadence.
                end = len(marks) // 2
                frames = marks[end][0]
                marks = marks[:end]
            else:
                raise
    aspect = {"portrait": 9 / 16, "landscape": 16 / 9, "square": 1}.get(
        args.aspect, sources[0].size[0] / sources[0].size[1]
    )
    h = args.long_edge / max(1, aspect)
    size = [max(2, round(h * aspect / 2) * 2), max(2, round(h / 2) * 2)]
    return {
        "fps": fps,
        "size": size,
        "picture_style": "locked-corners",
        "target": [0.5, 0.5],
        "fill": 0.74,
        "audio": audio,
        "shots": shots,
    }


def review_sheets(join_frames, directory):
    if not join_frames:
        return
    tw, th, rows = 140, 128, 7
    for k in range(0, len(join_frames), rows):
        group = join_frames[k : k + rows]
        sheet = Image.new("RGB", (4 * tw + 12, (th + 24) * len(group)), "#202020")
        draw = ImageDraw.Draw(sheet)
        for j, (label, frames) in enumerate(group):
            y = j * (th + 24)
            draw.text((5, y + 3), label, fill="white")
            for m, frame in enumerate(frames):
                im = Image.fromarray(frame[:, :, ::-1])
                im.thumbnail((tw, th))
                x = m * tw + (12 if m >= 2 else 0)
                sheet.paste(im, (x + (tw - im.width) // 2, y + 22))
        sheet.save(directory / f"joins-{k // rows + 1:02}.jpg", quality=89)


def shot_pictures(shot, plan, warp):
    size = tuple(plan["size"])
    count = shot["frames"]
    anchor = shot.get("anchor")
    target = plan["target"]
    with ExitStack() as stack:
        if shot["still"]:
            base = read_image(shot["source"])
            if warp is not None:
                picture = warp.apply(fixed_crop(base, size, anchor, target))
                yield from repeat(picture, count)
                return
            frames = repeat(base, count)
        else:
            decode_size = resized_size(*shot["source_size"], max(size) * 1.5)
            frames = stack.enter_context(
                video_frames(
                    shot["source"], shot["in_seconds"], plan["fps"], decode_size, count
                )
            )
        for j in range(count):
            base = next(frames, None)
            if base is None:
                raise ValueError(
                    f"Source ends before requested frame: {shot['source']} at {shot['in_seconds']}s"
                )
            if warp is not None:
                yield warp.apply(fixed_crop(base, size, anchor, target))
            else:
                # Unversioned plans replay the camera movement used by the original renderer.
                phase = (shot["timeline_frame"] + j) / plan["fps"]
                zoom = 1 + 0.0225 * (1 - math.cos(phase * math.pi / 0.52))
                yield compose(base, size, anchor, zoom, plan["fill"], target)


def render(plan, directory):
    fps = plan["fps"]
    size = tuple(plan["size"])
    shots = plan["shots"]
    total = sum(s["frames"] for s in shots)
    if len(shots) < 2 or min(s["frames"] for s in shots) < 2 or fps <= 0:
        raise ValueError("An edit needs two or more shots of at least two frames each.")
    elapsed = 0
    for shot in shots:
        shot["timeline_frame"] = elapsed
        if plan["audio"].get("shutter_mode") == "per-shot":
            shot["cue_seconds"] = elapsed / fps
        elif plan["audio"].get("shutter_mode") == "steady-loop":
            # Preserve a fractional-frame audio clock. A hand-retimed shot still
            # takes its click with it when replaying the edited plan.
            cue = shot["cue_seconds"]
            if round(cue * fps) != elapsed:
                shot["cue_seconds"] = elapsed / fps
        elapsed += shot["frames"]
    warp = CornerWarp(size) if plan.get("picture_style") == "locked-corners" else None
    soundtrack(plan, directory / "mix.wav")
    cmd = [
        "ffmpeg",
        "-nostdin",
        "-v",
        "error",
        "-f",
        "rawvideo",
        "-pixel_format",
        "bgr24",
        "-video_size",
        f"{size[0]}x{size[1]}",
        "-framerate",
        str(fps),
        "-i",
        "-",
        "-i",
        str(directory / "mix.wav"),
        "-map",
        "0:v",
        "-map",
        "1:a",
        "-c:v",
        "libx264",
        "-crf",
        "17",
        "-preset",
        "veryfast",
        "-pix_fmt",
        "yuv420p",
        "-c:a",
        "aac",
        "-b:a",
        "256k" if plan["audio"].get("shutter_mode") == "steady-loop" else "192k",
        "-movflags",
        "+faststart",
        "-y",
        str(directory / "match-cut.mp4"),
    ]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    joins, tail = [], []
    try:
        for shot in shots:
            count = shot["frames"]
            with closing(shot_pictures(shot, plan, warp)) as pictures:
                ends = {}
                for j, pic in enumerate(pictures):
                    proc.stdin.write(pic.tobytes())
                    if j in (0, 1, count - 2, count - 1):
                        ends[j] = cv2.resize(
                            pic, resized_size(*size, 220), interpolation=cv2.INTER_AREA
                        )
                if tail:
                    label = f"{shot['timeline_frame'] / fps:.3f}s   {shot['match']}   /   {shot['cue']}"
                    joins.append((label, tail + [ends[0], ends[1]]))
                tail = [ends[count - 2], ends[count - 1]]
    finally:
        proc.stdin.close()
        status = proc.wait()
    if status:
        raise ValueError("FFmpeg encoding failed.")
    info = probe(directory / "match-cut.mp4")
    video = next(s for s in info["streams"] if s["codec_type"] == "video")
    audio = next(s for s in info["streams"] if s["codec_type"] == "audio")
    if (
        int(video["nb_frames"]) != total
        or abs(float(audio["duration"]) - total / fps) > 1 / fps
    ):
        raise ValueError(
            "Encoded frame count or soundtrack length differs from the edit plan."
        )
    review_sheets(joins, directory)
    (directory / "edit.json").write_text(json.dumps(plan, indent=2) + "\n")


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "inputs",
        nargs="*",
        help="Pictures, videos, a folder, and optionally one soundtrack",
    )
    p.add_argument("-o", "--out", type=Path, required=True, help="New output directory")
    mode = p.add_mutually_exclusive_group()
    mode.add_argument(
        "--shutter", help="Camera-shutter SFX, softened and played at double tempo"
    )
    mode.add_argument("--audio", help="Explicit continuous soundtrack override")
    p.add_argument(
        "--shutter-speed",
        type=float,
        metavar="MULTIPLIER",
        help="Shutter and cut rate relative to 10 clicks/sec (0.5 = slower, 1 = default, 2 = faster)",
    )
    p.add_argument("--audio-start", type=float, default=0)
    p.add_argument(
        "--duration",
        type=float,
        help="Output length in seconds (shutter photo edits default to 10)",
    )
    p.add_argument(
        "--aspect",
        choices=["source", "portrait", "landscape", "square"],
        default="source",
    )
    p.add_argument("--long-edge", type=int, default=1920)
    p.add_argument("--pace", choices=["fast", "burst"], default="fast")
    p.add_argument(
        "--keep-order",
        action="store_true",
        help="Keep file order; directories use filename order",
    )
    p.add_argument(
        "--motif",
        choices=["auto", "circle", "face"],
        default="auto",
        help="Prefer the principal silhouette, a circle, or a frontal face",
    )
    p.add_argument(
        "--location-sound",
        action="store_true",
        help="Mix selected production audio with outgoing L-cuts",
    )
    p.add_argument(
        "--from-plan",
        type=Path,
        help="Re-render an edited edit.json, including corrected subject boxes",
    )
    args = p.parse_args()
    out = args.out.expanduser().resolve()
    if out.exists():
        p.error("Choose a new output directory to preserve the earlier render.")
    if args.long_edge < 64:
        p.error("--long-edge must be at least 64 pixels")
    if args.audio and args.shutter_speed is not None:
        p.error(
            "--shutter-speed applies to the shutter soundtrack. Choose it or --audio."
        )
    if args.from_plan and (
        args.audio
        or args.shutter
        or args.location_sound
        or args.shutter_speed is not None
    ):
        p.error(
            "To choose a new sound or shutter speed, pass the original media. --from-plan replays the saved timing and mix."
        )
    if args.from_plan and args.inputs:
        p.error("Use either drop inputs or --from-plan.")
    out.parent.mkdir(parents=True, exist_ok=True)
    try:
        with tempfile.TemporaryDirectory(dir=out.parent, prefix=".match-cut-") as tmp:
            scratch = Path(tmp)
            ready = scratch / "deliverables"
            ready.mkdir()
            plan = (
                json.loads(args.from_plan.read_text())
                if args.from_plan
                else make_plan(args, scratch)
            )
            render(plan, ready)
            (ready / "mix.wav").unlink()
            if out.exists():
                raise ValueError(f"Output appeared during render: {out}")
            ready.rename(out)
        print(out / "match-cut.mp4")
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        p.exit(1, f"Match cut: {error}\n")


if __name__ == "__main__":
    main()
