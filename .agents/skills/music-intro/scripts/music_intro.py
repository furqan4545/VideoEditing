#!/usr/bin/env python3
"""music-intro: start background music naturally instead of fading it in.

Styles (from @iam_ar_un's "How to start a music" reel, Instagram DdML99Ds5Kr):
  reverse  the song's own ending, reversed, swells into the first beat ("end cut reversed")
  stem     one instrument of the song plays alone for the lead-in, then the full song comes in ("the stem cut")
  riser    a riser + a deep whoosh + a mid whoosh peak on the first beat ("riser and whoosh")
  filter   extra, no model: the song plays muffled (low-passed) for the lead-in, then opens up on the beat
  plain    the old way (volume fade-in), only for comparison

Output: a music bed WAV that is silent until the lead-in starts, with the full music landing exactly on --hit
(seconds in your video). Optional: mix it under a video's own audio (--video).

Run with the sound-effects venv (numpy, scipy, librosa, soundfile):
  ~/.local/share/sound-effects/.venv/bin/python music_intro.py SONG --style all --out DIR
or through the `music-intro` command that setup.sh installs.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

SR = 48000
HERE = Path(__file__).resolve().parent
SKILL = HERE.parent
KITS_FILE = SKILL / "kits.json"
STEM_CACHE = Path(os.environ.get("MUSIC_INTRO_CACHE", Path.home() / "Library/Caches/music-intro"))
STYLES = ["reverse", "stem", "riser", "filter", "plain"]


# ---------------------------------------------------------------- audio io
def tool(name: str) -> str:
    p = shutil.which(name) or str(Path.home() / ".local/bin" / name)
    if not Path(p).exists():
        sys.exit(f"music-intro: {name} not found")
    return p


def load(path: str | Path, start: float | None = None, dur: float | None = None) -> np.ndarray:
    """Decode any audio/video file to float32 stereo at 48 kHz, shape (n, 2)."""
    cmd = [tool("ffmpeg"), "-v", "error", "-nostdin"]
    if start is not None:
        cmd += ["-ss", f"{max(0.0, start):.4f}"]
    cmd += ["-i", str(path)]
    if dur is not None:
        cmd += ["-t", f"{dur:.4f}"]
    cmd += ["-vn", "-ac", "2", "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()


def save(path: Path, x: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [tool("ffmpeg"), "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "2", "-i", "-",
           "-c:a", "pcm_s24le", str(path)]
    subprocess.run(cmd, input=np.ascontiguousarray(x, dtype=np.float32).tobytes(), check=True)


def duration(path: str | Path) -> float:
    out = subprocess.run([tool("ffprobe"), "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0",
                          str(path)], capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


def db(x: float) -> float:
    return 20 * np.log10(max(x, 1e-9))


def rms(x: np.ndarray) -> float:
    return float(np.sqrt(np.mean(np.square(x)))) if len(x) else 0.0


def env(x: np.ndarray, win: float = 0.02) -> np.ndarray:
    """RMS envelope, one value per `win` seconds."""
    m = x.mean(axis=1) if x.ndim == 2 else x
    n = max(1, int(win * SR))
    k = len(m) // n
    if k == 0:
        return np.array([rms(m)])
    return np.sqrt(np.mean(np.square(m[: k * n].reshape(k, n)), axis=1))


def curve(n: int, shape: str = "exp") -> np.ndarray:
    t = np.linspace(0.0, 1.0, n, dtype=np.float32)
    if shape == "exp":  # slow start, fast finish: how a swell feels
        return t ** 2.5
    if shape == "lin":
        return t
    return np.sin(t * np.pi / 2) ** 2  # equal-power-ish


def match_level(x: np.ndarray, ref: np.ndarray, under_db: float, max_boost_db: float = 12.0) -> tuple[np.ndarray, float]:
    """Set x so its loudest 100 ms sits `under_db` under ref's loudest 100 ms (boost capped). Returns gain dB."""
    if not len(x) or not len(ref):
        return x, 0.0
    g = db(env(ref, 0.1).max()) - under_db - db(env(x, 0.1).max())
    g = min(g, max_boost_db)
    return x * 10 ** (g / 20), round(float(g), 1)


def fade(x: np.ndarray, fin: float = 0.0, fout: float = 0.0, shape: str = "lin") -> np.ndarray:
    x = x.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a:
        a = min(a, len(x))
        x[:a] *= curve(a, shape)[:, None]
    if b:
        b = min(b, len(x))
        x[len(x) - b:] *= curve(b, "lin")[::-1, None]
    return x


# ---------------------------------------------------------------- where the music hits
def find_drop(song: Path, lead: float, search_end: float = 75.0) -> float:
    """The moment the full beat comes in: the biggest jump between the 2 s before and the 2 s after, in the
    first `search_end` s. The song's own start from silence does not count (there is nothing to lead in with)."""
    x = load(song, 0, search_end)
    hop = 0.05
    e = env(x, hop)
    w = int(2.0 / hop)
    if len(e) < 2 * w + 2:
        return 0.0
    ldb = np.maximum(20 * np.log10(e + 1e-9), -60)
    c = np.concatenate([[0.0], np.cumsum(ldb)])
    first_sound = int(np.argmax(ldb > -45))
    idx, rises = [], []
    for i in range(max(w, first_sound + int((lead + 1.0) / hop)), len(ldb) - w):
        before = (c[i] - c[i - w]) / w
        after = (c[i + w] - c[i]) / w
        if before < -45:  # still the silence before the song
            continue
        idx.append(i)
        rises.append(after - before)
    if not rises or max(rises) < 2.0:  # no clear drop: start on the first sound
        return snap(song, first_sound * hop + lead, 0.3)
    rises = np.array(rises)
    # the FIRST big drop, not only the biggest: anything within 70 % of the biggest rise, earliest wins,
    # then the top of that stretch
    ok = np.where(rises >= max(2.0, 0.7 * rises.max()))[0]
    run = [ok[0]]  # the first stretch of strong rise; its top is the drop
    for k in ok[1:]:
        if k - run[-1] > int(0.5 / hop):
            break
        run.append(k)
    j = max(run, key=lambda k: rises[k])
    return snap(song, idx[j] * hop, 0.5)


def onset_env(x: np.ndarray, hop: int = 480) -> np.ndarray:
    """Spectral flux, one value per 10 ms."""
    m = x.mean(axis=1)
    nfft = 2048
    if len(m) < nfft:
        return np.zeros(1)
    frames = 1 + (len(m) - nfft) // hop
    idx = np.arange(nfft)[None, :] + hop * np.arange(frames)[:, None]
    spec = np.abs(np.fft.rfft(m[idx] * np.hanning(nfft), axis=1))
    spec = np.log1p(spec * 10)
    flux = np.maximum(0, np.diff(spec, axis=0)).sum(axis=1)
    return np.concatenate([[0.0], flux])


def snap(song: Path, t: float, radius: float = 0.25) -> float:
    """Move t to the strongest onset (a kick / the beat) within +-radius s."""
    s0 = max(0.0, t - radius - 0.05)
    x = load(song, s0, 2 * radius + 0.1)
    f = onset_env(x)
    if len(f) < 3:
        return t
    i = int(np.argmax(f))
    return round(float(s0 + i * 0.01), 3)


# ---------------------------------------------------------------- styles
def style_plain(song: Path, at: float, lead: float, length: float) -> tuple[np.ndarray, dict]:
    start = max(0.0, at - lead)
    x = load(song, start, (at - start) + length)
    x = fade(x, fin=at - start, shape="lin")
    return x, {"lead_in": "volume fade-in (the old way)", "lead_s": round(at - start, 3)}


def style_reverse(song: Path, at: float, lead: float, length: float, source: str = "end") -> tuple[np.ndarray, dict]:
    body = load(song, at, length)
    if source == "end":
        d = duration(song)
        tail = load(song, max(0.0, d - 12.0), 12.0)
        e = env(tail, 0.02)
        loud = np.where(20 * np.log10(e + 1e-9) > -45)[0]
        end = (loud[-1] + 1) * int(0.02 * SR) if len(loud) else len(tail)
        n = int(lead * SR)
        seg = tail[max(0, end - n): end]
        src = f"song ending {d - 12 + max(0, end - n) / SR:.2f}-{d - 12 + end / SR:.2f} s, reversed"
    else:  # "hit": the first `lead` seconds after the hit, played backwards
        seg = load(song, at, lead)
        src = f"song {at:.2f}-{at + lead:.2f} s (just after the hit), reversed"
    rev = seg[::-1].copy()
    rev = fade(rev, fin=len(rev) / SR * 0.85, shape="exp")
    # level: the swell's loudest 100 ms sits ~2 dB under the music's first second, so the beat still lands
    target = rms(body[: SR]) * 10 ** (-2 / 20)
    peak = env(rev, 0.1).max() if len(rev) else 0
    if peak > 0:
        rev *= target / peak
    # a 10 ms overlap so the join has no click
    o = int(0.01 * SR)
    rev[-o:] *= curve(o, "lin")[::-1, None]
    out = np.concatenate([rev, body])
    return out, {"lead_in": src, "lead_s": round(len(rev) / SR, 3)}


def demucs_stems(song: Path, start: float, dur: float) -> dict[str, np.ndarray]:
    key = hashlib.sha1(f"{song.resolve()}|{song.stat().st_size}|{start:.3f}|{dur:.3f}".encode()).hexdigest()[:16]
    cdir = STEM_CACHE / key
    names = ["drums", "bass", "other", "vocals"]
    if not all((cdir / f"{n}.wav").exists() for n in names):
        cdir.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory() as td:
            clip = Path(td) / "clip.wav"
            save(clip, load(song, start, dur))
            uv = tool("uv")
            cmd = [uv, "run", "--quiet", "--no-project", "--python", "3.11",
                   "--with", "demucs==4.0.1", "--with", "torch==2.5.1", "--with", "torchaudio==2.5.1",
                   "--with", "soundfile", "--with", "numpy<2",
                   "python", "-m", "demucs", "-n", "htdemucs", "-o", td, str(clip)]
            print("music-intro: separating stems with demucs (htdemucs, ~10-30 s for the window) ...", file=sys.stderr)
            r = subprocess.run(cmd, capture_output=True, text=True)
            if r.returncode != 0:
                raise RuntimeError("demucs failed: " + (r.stderr or r.stdout)[-800:])
            outd = Path(td) / "htdemucs" / "clip"
            for n in names:
                shutil.copy(outd / f"{n}.wav", cdir / f"{n}.wav")
    return {n: load(cdir / f"{n}.wav") for n in names}


def style_stem(song: Path, at: float, lead: float, length: float, stem: str = "auto") -> tuple[np.ndarray, dict]:
    start = max(0.0, at - lead)
    lead = at - start
    pad = 1.0
    w0 = max(0.0, start - pad)
    stems = demucs_stems(song, w0, (at - w0) + pad)
    a, b = int((start - w0) * SR), int((at - w0) * SR)
    order = [stem] if stem != "auto" else ["other", "drums", "bass"]
    chosen, seg = None, None
    for s in order:
        cand = stems[s][a:b]
        if db(rms(cand)) > -42:
            chosen, seg = s, cand
            break
    if seg is None:  # everything was quiet: take the loudest non-vocal stem
        chosen = max(["other", "drums", "bass"], key=lambda s: rms(stems[s][a:b]))
        seg = stems[chosen][a:b]
    body = load(song, at, length)
    seg = fade(seg, fin=min(0.06, lead / 4))
    # one instrument alone is much quieter than the full drop: lift it to 5 dB under the beat so it is heard
    seg, g = match_level(seg, body[: 2 * SR], 5.0)
    out = np.concatenate([seg, body])
    return out, {"lead_in": f"{chosen} stem of song {start:.2f}-{at:.2f} s (demucs htdemucs)", "stem": chosen,
                 "stem_gain_db": g, "lead_s": round(lead, 3)}


def style_filter(song: Path, at: float, lead: float, length: float) -> tuple[np.ndarray, dict]:
    from scipy.signal import butter, sosfilt
    start = max(0.0, at - lead)
    lead = at - start
    pre = load(song, start, lead)
    # muffled: low-pass that opens from 300 Hz to 2.5 kHz over the lead, done in 8 blocks
    blocks = np.array_split(np.arange(len(pre)), 8)
    out = np.zeros_like(pre)
    for i, ix in enumerate(blocks):
        fc = 300 * (2500 / 300) ** (i / 7)
        sos = butter(4, fc, btype="low", fs=SR, output="sos")
        lo = sosfilt(sos, pre[max(0, ix[0] - 4800): ix[-1] + 1], axis=0)
        out[ix] = lo[-len(ix):]
    out = fade(out, fin=min(0.3, lead / 3))
    body = load(song, at, length)
    out, _ = match_level(out, body[: 2 * SR], 6.0)
    return np.concatenate([out, body]), {"lead_in": f"song {start:.2f}-{at:.2f} s low-passed, opening up", "lead_s": round(lead, 3)}


def kit_paths(kit: dict) -> dict[str, str]:
    """Resolve a kit's sounds: absolute paths are used as they are, other values are sfx-cloud IDs."""
    out = {}
    ids = {k: v["id"] for k, v in kit["layers"].items() if not Path(v["id"]).is_absolute()}
    if ids:
        r = subprocess.run([tool("sfx-cloud"), "path", *ids.values()], capture_output=True, text=True)
        lines = [l.strip() for l in r.stdout.splitlines() if l.strip().startswith("/")]
        if len(lines) != len(ids):
            raise RuntimeError(f"sfx-cloud path gave {len(lines)} paths for {len(ids)} IDs: {r.stdout}{r.stderr}")
        out.update(dict(zip(ids.keys(), lines)))
    for k, v in kit["layers"].items():
        if Path(v["id"]).is_absolute():
            out[k] = v["id"]
    return out


def peak_time(x: np.ndarray) -> float:
    e = env(x, 0.02)
    return float(np.argmax(e) * 0.02 + 0.01)


def style_riser(song: Path, at: float, lead: float, length: float, kit: dict,
                overrides: dict[str, str]) -> tuple[np.ndarray, dict]:
    paths = kit_paths(kit)
    paths.update({k: v for k, v in overrides.items() if v})
    body = load(song, at, length)
    ref = db(env(body[: 2 * SR], 0.1).max())  # the music's loudest 100 ms in its first 2 s
    layers, info = [], {}
    for name, spec in kit["layers"].items():
        x = load(paths[name])
        if spec.get("reverse"):
            x = x[::-1].copy()
        if spec.get("trim_to_peak"):  # a riser stops dead on its peak: the beat takes over
            p = int(peak_time(x) * SR) + int(0.03 * SR)
            x = fade(x[:p], fout=0.03)
        pk = peak_time(x)
        cap = lead + spec.get("extra_lead", 0.0)
        if pk > cap:  # keep only the last `lead` seconds before the peak, faded in, so every layer starts together
            x = fade(x[int((pk - cap) * SR):], fin=cap * 0.6, shape="exp")
            pk = cap
        x *= 10 ** ((ref + spec.get("db", -4) - db(env(x, 0.1).max())) / 20)
        off = pk - spec.get("peak_offset", 0.0)  # seconds before the hit that the sound starts
        layers.append((x, off))
        info[name] = {"file": paths[name], "peak_at_s": round(pk, 3), "starts_before_hit_s": round(off, 3),
                      "level_vs_music_db": spec.get("db", -4), "reversed": bool(spec.get("reverse"))}
    pre = max(off for _, off in layers)
    n0 = int(pre * SR)
    total = n0 + len(body)
    for x, off in layers:
        total = max(total, n0 - int(off * SR) + len(x))
    out = np.zeros((total, 2), dtype=np.float32)
    out[n0: n0 + len(body)] += body
    for x, off in layers:
        s = n0 - int(off * SR)
        if s < 0:
            x, s = x[-s:], 0
        out[s: s + len(x)] += x
    return out, {"lead_in": f"kit '{kit['name']}': " + ", ".join(kit["layers"]), "lead_s": round(pre, 3), "layers": info}


# ---------------------------------------------------------------- assemble
def place(bed: np.ndarray, lead_s: float, hit: float, total: float | None) -> np.ndarray:
    """Put the bed so the full music lands at `hit` seconds; cut anything before 0."""
    start = hit - lead_s
    if start < 0:
        bed = bed[int(-start * SR):]
        start = 0.0
    out = np.concatenate([np.zeros((int(start * SR), 2), dtype=np.float32), bed])
    if total is not None:
        n = int(total * SR)
        out = out[:n] if len(out) >= n else np.concatenate([out, np.zeros((n - len(out), 2), np.float32)])
        out = fade(out, fout=min(1.0, total / 10))
    return out


def limit(x: np.ndarray, ceiling_db: float = -1.0) -> np.ndarray:
    pk = float(np.abs(x).max()) if len(x) else 0.0
    c = 10 ** (ceiling_db / 20)
    return x * (c / pk) if pk > c else x


def mix_video(video: Path, bed_wav: Path, out: Path, music_db: float, duck: bool) -> None:
    has_audio = bool(subprocess.run([tool("ffprobe"), "-v", "error", "-select_streams", "a", "-show_entries",
                                     "stream=index", "-of", "csv=p=0", str(video)], capture_output=True,
                                    text=True).stdout.strip())
    if not has_audio:
        fc = f"[1:a]volume={music_db}dB,alimiter=limit=0.89[a]"
    elif duck:
        fc = (f"[0:a]aformat=sample_rates={SR}:channel_layouts=stereo,asplit=2[v][sc];"
              f"[1:a]volume={music_db}dB[m];[m][sc]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=350[md];"
              f"[v][md]amix=inputs=2:duration=first:normalize=0,alimiter=limit=0.89[a]")
    else:
        fc = (f"[1:a]volume={music_db}dB[m];[0:a][m]amix=inputs=2:duration=first:normalize=0,"
              f"alimiter=limit=0.89[a]")
    cmd = [tool("ffmpeg"), "-v", "error", "-y", "-i", str(video), "-i", str(bed_wav), "-filter_complex", fc,
           "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "256k", "-shortest", str(out)]
    subprocess.run(cmd, check=True)


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("music", help="the song / background music file (any format ffmpeg reads)")
    ap.add_argument("--style", default="all", help="reverse | stem | riser | filter | plain | all | a,comma,list")
    ap.add_argument("--at", default="auto", help="seconds IN THE SONG where the full music should hit "
                    "(default auto = where the beat drops in; snapped to the nearest beat)")
    ap.add_argument("--no-snap", action="store_true", help="use --at exactly, do not move it onto a beat")
    ap.add_argument("--hit", type=float, default=None, help="seconds IN YOUR VIDEO where the full music lands "
                    "(default: right after the lead-in, i.e. the bed starts at 0)")
    ap.add_argument("--lead", type=float, default=1.2, help="lead-in length in seconds (default 1.2; the reel uses ~1)")
    ap.add_argument("--length", type=float, default=None, help="seconds of music after the hit "
                    "(default: to the end of --video, else 20)")
    ap.add_argument("--reverse-source", choices=["end", "hit"], default="end",
                    help="reverse: reverse the song's ending (end, as in the reel) or its first beat (hit)")
    ap.add_argument("--stem", default="auto", choices=["auto", "other", "drums", "bass", "vocals"],
                    help="stem: which instrument plays alone (auto = other -> drums -> bass, first one not silent)")
    ap.add_argument("--kit", default="1", help="riser: kit number or name from kits.json (rotate between videos)")
    ap.add_argument("--riser", help="riser: use this file for the riser layer")
    ap.add_argument("--deep", help="riser: use this file for the deep whoosh")
    ap.add_argument("--mid", help="riser: use this file for the mid whoosh")
    ap.add_argument("--video", help="also mix the bed under this video's own audio -> <out>/<video>_<style>.mp4")
    ap.add_argument("--music-db", type=float, default=-12.0, help="bed gain in the video mix, dB (default -12)")
    ap.add_argument("--no-duck", action="store_true", help="video mix: do not duck the music under the voice")
    ap.add_argument("--out", required=True, help="output folder")
    a = ap.parse_args()

    song = Path(a.music).expanduser().resolve()
    out = Path(a.out).expanduser().resolve()
    out.mkdir(parents=True, exist_ok=True)
    styles = STYLES if a.style == "all" else [s.strip() for s in a.style.split(",")]
    bad = [s for s in styles if s not in STYLES]
    if bad:
        sys.exit(f"music-intro: unknown style {bad}; use {STYLES}")

    at = find_drop(song, a.lead) if a.at == "auto" else float(a.at)
    if a.at != "auto" and not a.no_snap:
        at = snap(song, at)
    video = Path(a.video).expanduser().resolve() if a.video else None
    hit = a.hit if a.hit is not None else None
    total = duration(video) if video else None
    if a.length is not None:
        length = a.length
    elif video:
        length = max(1.0, total - (hit or a.lead) + 0.5)
    else:
        length = 20.0
    length = min(length, duration(song) - at)

    kits = json.loads(KITS_FILE.read_text())["kits"]
    kit = next((k for i, k in enumerate(kits, 1) if a.kit in (str(i), k["name"])), None)
    if kit is None:
        sys.exit(f"music-intro: no kit {a.kit!r}; kits: {[k['name'] for k in kits]}")

    report = {"music": str(song), "song_hit_s": at, "lead_s": a.lead, "styles": {}}
    previews = []
    for s in styles:
        try:
            if s == "plain":
                bed, info = style_plain(song, at, a.lead, length)
            elif s == "reverse":
                bed, info = style_reverse(song, at, a.lead, length, a.reverse_source)
            elif s == "stem":
                bed, info = style_stem(song, at, a.lead, length, a.stem)
            elif s == "filter":
                bed, info = style_filter(song, at, a.lead, length)
            else:
                bed, info = style_riser(song, at, a.lead, length, kit, {"riser": a.riser, "deep": a.deep, "mid": a.mid})
        except Exception as e:  # one style failing must not lose the others
            report["styles"][s] = {"error": str(e)}
            print(f"music-intro: {s} failed: {e}", file=sys.stderr)
            continue
        h = hit if hit is not None else info["lead_s"]
        placed = limit(place(bed, info["lead_s"], h, total))
        wav = out / f"intro_{s}.wav"
        save(wav, placed)
        info.update({"wav": str(wav), "video_hit_s": round(h, 3),
                     "lead_starts_s": round(max(0.0, h - info["lead_s"]), 3)})
        if video:
            mp4 = out / f"{video.stem}_{s}.mp4"
            mix_video(video, wav, mp4, a.music_db, not a.no_duck)
            info["mp4"] = str(mp4)
        report["styles"][s] = info
        # preview: 0.5 s before the lead-in to 3 s after the hit
        p0 = max(0.0, h - info["lead_s"] - 0.5)
        previews.append((s, placed[int(p0 * SR): int((h + 3.0) * SR)]))

    if previews:
        gap = np.zeros((int(1.0 * SR), 2), np.float32)
        comp, marks, t = [], [], 0.0
        for s, p in previews:
            marks.append({"style": s, "starts_s": round(t, 2)})
            comp += [p, gap]
            t += (len(p) + len(gap)) / SR
        save(out / "compare.wav", limit(np.concatenate(comp)))
        report["compare"] = {"wav": str(out / "compare.wav"), "order": marks}
    (out / "music_intro.json").write_text(json.dumps(report, indent=1, default=float))
    print(json.dumps(report, indent=1, default=float))


if __name__ == "__main__":
    main()
