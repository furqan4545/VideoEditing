"""Analyze oriented source frames and compose the matched pictures."""

import hashlib
import json
import math
import subprocess
import tempfile
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps

IMAGES = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".heic",
    ".heif",
    ".tif",
    ".tiff",
    ".bmp",
    ".avif",
}
VIDEOS = {".mov", ".mp4", ".m4v", ".mkv", ".webm", ".avi", ".mts", ".m2ts"}
AUDIO = {".wav", ".aif", ".aiff", ".mp3", ".ogg", ".flac", ".aac", ".m4a"}


def probe(path):
    return json.loads(
        subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_format",
                "-show_streams",
                "-of",
                "json",
                str(path),
            ]
        )
    )


def read_image(path):
    def opened(name):
        with Image.open(name) as image:
            oriented = ImageOps.exif_transpose(image)
            rgba = oriented.convert("RGBA")
            rgb = Image.new("RGB", rgba.size, "black")
            rgb.paste(rgba, mask=rgba.getchannel("A"))
            return cv2.cvtColor(np.asarray(rgb), cv2.COLOR_RGB2BGR)

    try:
        return opened(path)
    except OSError:
        with tempfile.TemporaryDirectory() as tmp:
            png = Path(tmp) / "decoded.png"
            subprocess.run(
                ["sips", "-s", "format", "png", str(path), "--out", str(png)],
                stdout=subprocess.DEVNULL,
                check=True,
            )
            return opened(png)


def resized_size(width, height, long_edge):
    scale = min(1, long_edge / max(width, height))
    return max(2, round(width * scale)), max(2, round(height * scale))


@contextmanager
def video_frames(path, start, fps, size, count=None):
    w, h = size
    command = [
        "ffmpeg",
        "-nostdin",
        "-v",
        "error",
        "-ss",
        f"{start:.7f}",
        "-i",
        str(path),
        "-map",
        "0:V:0",
        "-an",
        "-sn",
        "-vf",
        f"fps={fps:.8f}:start_time=0:round=up,scale={w}:{h}:flags=area,setsar=1",
    ]
    if count is not None:
        command += ["-frames:v", str(count)]
    proc = subprocess.Popen(
        command + ["-f", "rawvideo", "-pix_fmt", "bgr24", "-"], stdout=subprocess.PIPE
    )

    def frames():
        while data := proc.stdout.read(w * h * 3):
            if len(data) != w * h * 3:
                raise ValueError(f"Incomplete video frame from {path}")
            yield np.frombuffer(data, np.uint8).reshape(h, w, 3)
        if proc.wait():
            raise ValueError(f"Could not decode video from {path}")

    try:
        yield frames()
    finally:
        proc.stdout.close()
        if proc.poll() is None:
            proc.terminate()
        proc.wait()


def silhouette(frame):
    """Find an isolated silhouette against a reasonably uniform border."""
    h, w = frame.shape[:2]
    lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB).astype(np.float32)
    border = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    bg = np.median(border, axis=0)
    spread = np.linalg.norm(border - bg, axis=1)
    if np.median(spread) > 24:
        return None
    mask = (
        np.linalg.norm(lab - bg, axis=2) > max(15, np.percentile(spread, 62) + 12)
    ).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    contours = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)[0]
    if not contours:
        return None
    contour = max(contours, key=cv2.contourArea)
    x, y, bw, bh = cv2.boundingRect(contour)
    area = cv2.contourArea(contour) / (w * h)
    if not 0.008 < area < 0.92 or (bw >= w * 0.98 and bh >= h * 0.98 and area > 0.86):
        return None
    return [
        round((x + bw / 2) / w, 5),
        round((y + bh / 2) / h, 5),
        round(bw / w, 5),
        round(bh / h, 5),
    ]


def subject(frame, gray, motif, face_detector):
    h, w = gray.shape
    if motif == "face":
        faces = face_detector.detectMultiScale(gray, 1.08, 4, minSize=(18, 18))
        if len(faces):
            x, y, bw, bh = max(faces, key=lambda f: f[2] * f[3])
            return [
                float((x + bw / 2) / w),
                float((y + bh / 2) / h),
                float(bw / w),
                float(bh / h),
            ]
        return None
    box = silhouette(frame)
    if motif != "circle":
        return box
    if box and abs(math.log((box[2] * w) / (box[3] * h))) < 0.12:
        return box
    limit = min(w, h)
    circles = cv2.HoughCircles(
        cv2.GaussianBlur(gray, (5, 5), 1.2),
        cv2.HOUGH_GRADIENT,
        dp=1,
        minDist=max(8, limit // 4),
        param1=90,
        param2=23,
        minRadius=max(5, limit // 12),
        maxRadius=round(limit * 0.52),
    )
    if circles is None:
        return None
    x, y, r = circles[0, 0]
    return [float(x / w), float(y / h), float(2 * r / w), float(2 * r / h)]


@dataclass
class Sample:
    box: list | None
    aspect: float | None
    layout: np.ndarray
    color: np.ndarray
    flow: np.ndarray
    locus: np.ndarray
    scene: int


def describe(frame, gray, previous, hz, scene, motif, face_detector):
    h, w = gray.shape
    box = subject(frame, gray, motif, face_detector)
    region = gray
    if box:
        x, y, bw, bh = box
        region = gray[
            max(0, int((y - bh / 2) * h)) : max(1, round((y + bh / 2) * h)),
            max(0, int((x - bw / 2) * w)) : max(1, round((x + bw / 2) * w)),
        ]
    edges = cv2.Canny(region, 40, 115)
    layout = (
        cv2.resize(edges, (8, 8), interpolation=cv2.INTER_AREA).astype(float).ravel()
        / 255
    )
    color = (
        cv2.resize(frame, (3, 3), interpolation=cv2.INTER_AREA).astype(float).ravel()
        / 255
    )
    flow, locus = np.zeros(2), np.array([0.5, 0.5])
    if previous is not None:
        difference = np.abs(gray.astype(float) - previous)
        # Reject a whole-frame change, while allowing local object movement.
        if difference.mean() > 32 and np.mean(difference > 26) > 0.52:
            scene += 1
        else:
            vectors = cv2.calcOpticalFlowFarneback(
                previous, gray, None, 0.5, 3, 13, 2, 5, 1.1, 0
            )
            speed = np.linalg.norm(vectors, axis=2)
            mask = speed > max(0.22, np.percentile(speed, 85))
            if mask.sum() >= 12:
                points = vectors[mask]
                flow = np.median(points, axis=0) * hz / [w, h]
                yy, xx = np.where(mask)
                locus = np.array([np.mean(xx) / w, np.mean(yy) / h])
    aspect = (box[2] * w) / (box[3] * h) if box else None
    return Sample(box, aspect, layout, color, flow, locus, scene)


@dataclass
class Source:
    path: Path
    size: tuple
    duration: float
    audio: bool
    hz: float
    samples: list
    photo_digest: bytes | None = None

    @property
    def still(self):
        return self.hz == 0

    def at(self, time):
        index = min(len(self.samples) - 1, max(0, round(self.hz * time)))
        return self.samples[index]


def scan(path, motif="auto"):
    detector = None
    if motif == "face":
        detector = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
    if path.suffix.lower() in IMAGES:
        pic = read_image(path)
        h, w = pic.shape[:2]
        small = cv2.resize(pic, resized_size(w, h, 192), interpolation=cv2.INTER_AREA)
        gray = cv2.cvtColor(small, cv2.COLOR_BGR2GRAY)
        return Source(
            path,
            (w, h),
            0,
            False,
            0,
            [describe(small, gray, None, 0, 0, motif, detector)],
            hashlib.blake2b(pic, digest_size=16).digest(),
        )
    info = probe(path)
    video = next(
        s
        for s in info["streams"]
        if s["codec_type"] == "video" and not s["disposition"]["attached_pic"]
    )
    w, h = video["width"], video["height"]
    sar = video.get("sample_aspect_ratio", "1:1")
    if ":" in sar:
        a, b = map(int, sar.split(":"))
        if a * b:
            w = round(w * a / b)
    rotations = [
        x["rotation"] for x in video.get("side_data_list", []) if "rotation" in x
    ]
    if (
        round(float(next(iter(rotations), video.get("tags", {}).get("rotate", 0))) / 90)
        % 2
    ):
        w, h = h, w
    duration = float(video.get("duration") or info["format"]["duration"])
    hz = min(15, 2400 / duration)
    samples, previous, scene = [], None, 0
    with video_frames(path, 0, hz, resized_size(w, h, 144)) as frames:
        for frame in frames:
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            sample = describe(frame, gray, previous, hz, scene, motif, detector)
            if samples and sample.scene == scene and sample.box and samples[-1].box:
                old, new = np.array(samples[-1].box), np.array(sample.box)
                delta = new[:2] - old[:2]
                if (
                    np.max(abs(np.log(new[2:] / old[2:]))) < 0.22
                    and np.linalg.norm(delta) < 0.3
                ):
                    sample.locus = (new[:2] + old[:2]) / 2
                    if np.linalg.norm(delta) * hz > 0.024:
                        sample.flow = delta * hz
            samples.append(sample)
            previous, scene = gray, sample.scene
    if not samples:
        raise ValueError(f"No video frames in {path}")
    return Source(
        path,
        (w, h),
        duration,
        any(s["codec_type"] == "audio" for s in info["streams"]),
        hz,
        samples,
    )


def compare(outgoing, incoming, action):
    shape = np.mean(abs(outgoing.layout - incoming.layout))
    color = np.mean(abs(outgoing.color - incoming.color))
    aspect = 0.1
    if outgoing.aspect and incoming.aspect:
        # The layout map describes the normalized motif, including its outline.
        aspect = min(1, abs(math.log(outgoing.aspect / incoming.aspect)))
    graphic = shape + 0.22 * color + 0.18 * aspect
    if not action:
        return graphic
    a, b = outgoing.flow, incoming.flow
    va, vb = np.linalg.norm(a), np.linalg.norm(b)
    if min(va, vb) < 0.024:
        return 0.88 + graphic
    direction = 1 - np.clip(np.dot(a, b) / (va * vb), -1, 1)
    return float(
        0.42 * direction
        + 0.15 * min(2, abs(math.log(va / vb)))
        + 0.85 * np.linalg.norm(outgoing.locus - incoming.locus)
        + 0.52 * graphic
    )


def fixed_crop(frame, size, anchor, target):
    """Fill the canvas once, positioning the motif within the available crop."""
    width, height = size
    ih, iw = frame.shape[:2]
    scale = max(width / iw, height / ih)
    cw, ch = max(1, round(width / scale)), max(1, round(height / scale))
    cx, cy = anchor[:2] if anchor else (0.5, 0.5)
    x = int(np.clip(round(cx * iw - target[0] * cw), 0, iw - cw))
    y = int(np.clip(round(cy * ih - target[1] * ch), 0, ih - ch))
    interpolation = cv2.INTER_AREA if scale <= 1 else cv2.INTER_CUBIC
    return cv2.resize(frame[y : y + ch, x : x + cw], size, interpolation=interpolation)


class CornerWarp:
    """Radially smear the four corners while preserving the original center pixels."""

    def __init__(self, size):
        self.size = size
        width, height = size
        x = np.abs((np.arange(width, dtype=np.float32) + 0.5) * 2 / width - 1)
        y = np.abs((np.arange(height, dtype=np.float32) + 0.5) * 2 / height - 1)[
            :, None
        ]

        def feather(v, low, high):
            t = np.clip((v - low) / (high - low), 0, 1)
            return t * t * (3 - 2 * t)

        mask = feather(x, 0.16, 0.77) * feather(y, 0.13, 0.77)
        self.mask = (mask * feather(np.hypot(x, y), 0.54, 1.04))[:, :, None]
        self.sample_size = resized_size(width, height, min(960, max(size) / 2))
        sw, sh = self.sample_size
        yy, xx = np.indices((sh, sw), dtype=np.float32)
        dx, dy = xx - (sw - 1) / 2, yy - (sh - 1) / 2
        radius = np.hypot(dx / (sw / 2), dy / (sh / 2))
        stretch = np.minimum(1.18, 0.30 + 0.65 * radius**1.4)
        self.rays = []
        for distance in np.linspace(0.13, 0.61, 41, dtype=np.float32):
            step = stretch * distance
            self.rays.append(
                cv2.convertMaps(xx - dx * step, yy - dy * step, cv2.CV_16SC2)
            )
        weights = np.linspace(1.15, 0.72, len(self.rays), dtype=np.float32)
        self.weights = weights / weights.sum()

    def apply(self, frame):
        small = cv2.resize(frame, self.sample_size, interpolation=cv2.INTER_AREA)
        exposure = np.zeros(small.shape, np.float32)
        for weight, (coords, fractions) in zip(self.weights, self.rays):
            sample = cv2.remap(
                small,
                coords,
                fractions,
                cv2.INTER_LINEAR,
                borderMode=cv2.BORDER_REPLICATE,
            )
            exposure += weight * sample
        blurred = cv2.resize(exposure, self.size, interpolation=cv2.INTER_CUBIC)
        return np.rint(np.clip(frame + (blurred - frame) * self.mask, 0, 255)).astype(
            np.uint8
        )


def compose(frame, size, anchor, zoom, fill, target):
    """Match a motif's long dimension and center; keep moving shots full bleed."""
    w, h = size
    ih, iw = frame.shape[:2]
    cover = max(w / iw, h / ih)
    if anchor:
        cx, cy, bw, bh = anchor
        scale = fill * min(w, h) / max(bw * iw, bh * ih)
    else:
        cx, cy = 0.5, 0.5
        scale = cover
    scale *= zoom
    dx, dy = target[0] * w - scale * cx * iw, target[1] * h - scale * cy * ih
    if not anchor:
        dx, dy = np.clip(dx, w - scale * iw, 0), np.clip(dy, h - scale * ih, 0)
    # The median of the border continues studio black, white or paper outside a plate.
    border = np.concatenate(
        [frame[0, ::8], frame[-1, ::8], frame[::8, 0], frame[::8, -1]]
    )
    color = tuple(map(float, np.median(border, axis=0)))
    return cv2.warpAffine(
        frame,
        np.float32([[scale, 0, dx], [0, scale, dy]]),
        (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_CONSTANT,
        borderValue=color,
    )
