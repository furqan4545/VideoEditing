"""Build a continuous soundtrack and put picture boundaries on measured audio events."""

import subprocess
import sys
from pathlib import Path

import numpy as np
from scipy.io import wavfile
from scipy.signal import find_peaks

SIBLINGS = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(SIBLINGS / "real-sfx" / "scripts"))
import beats

RATE = 48000


def decode(path, seconds, start=0):
    raw = subprocess.check_output(
        [
            "ffmpeg",
            "-v",
            "error",
            "-nostdin",
            "-ss",
            str(start),
            "-i",
            str(path),
            "-t",
            str(seconds),
            "-map",
            "0:a:0",
            "-ac",
            "2",
            "-ar",
            str(RATE),
            "-f",
            "f32le",
            "-",
        ]
    )
    return np.frombuffer(raw, np.float32).reshape(-1, 2)


DEFAULT_SHUTTER = (
    Path.home() / "Desktop/MY VIDEO EDITING STUFF/Ali_BG_MUSIC/camera_sfx/"
    "alexis_gaming_cam-camera-shutter-346101.mp3"
)
SHUTTER_FILTER = (
    "atempo=2,treble=g=-12:f=2200:t=q:w=0.707,lowpass=f=5800:p=2,volume=4dB"
)


def processed_shutter(audio):
    path = Path(audio["shutter"])
    if not path.is_file():
        raise ValueError(
            f"Shutter recording is missing: {path}. Use --shutter FILE to locate it."
        )
    raw = subprocess.check_output(
        [
            "ffmpeg",
            "-v",
            "error",
            "-nostdin",
            "-ss",
            str(audio["offset"]),
            "-i",
            str(path),
            "-vn",
            "-map",
            "0:a:0",
            "-af",
            audio["filter"],
            "-ar",
            str(RATE),
            "-ac",
            "2",
            "-f",
            "f32le",
            "-",
        ]
    )
    return np.frombuffer(raw, np.float32).reshape(-1, 2)


def shutter_schedule(audio, count, duration, fps, min_frames):
    # Time the treated recording itself. Time-stretching can move a transient
    # several milliseconds relative to half its original timestamp.
    recording = processed_shutter(audio)
    hop = RATE // 500
    blocks = len(recording) // hop
    if blocks < 2:
        raise ValueError("The shutter recording has no usable audio at this offset.")
    signal = np.max(np.abs(recording), axis=1)
    envelope = signal[: blocks * hop].reshape(-1, hop).max(axis=1)
    threshold = max(0.0001, float(np.percentile(envelope, 99.5)) * 0.58)
    peaks, _ = find_peaks(
        np.pad(envelope, 1),
        height=threshold,
        prominence=threshold * 0.45,
        distance=round(0.044 * RATE / hop),
    )
    attacks = []
    for peak in peaks - 1:
        # A shutter stroke can build for 10–20 ms before its loudest clack.
        # Land on the audible leading edge after the last quiet block.
        low = max(0, peak - 12)
        quiet = np.flatnonzero(envelope[low:peak] < 0.10 * envelope[peak])
        block = low + quiet[-1] + 1 if len(quiet) else max(0, peak - 2)
        start = block * hop
        window = signal[start : (peak + 1) * hop]
        active = np.flatnonzero(window >= 0.15 * envelope[peak])
        if len(active):
            attacks.append(start + int(active[0]))
    if not attacks:
        raise ValueError("Could not find a shutter attack in the chosen recording.")
    audio["trim_samples"] = int(attacks[0])
    attacks = np.array(attacks) - attacks[0]
    # Preserve the recorded burst spacing and the release between bursts. At a
    # repeat, start at the same first attack, with the original tail in front of it.
    cycle = len(recording) - audio["trim_samples"]
    needed = count or 2
    cycles = (
        int(np.ceil(duration * RATE / cycle)) + 1
        if duration is not None
        else int(np.ceil(needed / max(1, len(attacks)))) * min_frames + 2
    )
    marks = []
    for repetition in range(cycles):
        for offset in attacks:
            time = float((repetition * cycle + offset) / RATE)
            frame = round(time * fps)
            if not marks or frame - marks[-1][0] >= min_frames:
                marks.append((frame, "shutter", round(time, 6)))
        if duration is None and len(marks) > needed:
            break
    if duration is None:
        chosen = marks[:needed]
        if len(chosen) < needed:
            raise ValueError("Too few separated shutter attacks for this edit.")
        # Keep the last release audible, ending ahead of the next exposure.
        next_frame = (
            marks[needed][0]
            if needed < len(marks)
            else chosen[-1][0] + round(0.15 * fps)
        )
        frames = chosen[-1][0] + max(
            2, min(round(0.16 * fps), next_frame - chosen[-1][0])
        )
    else:
        frames = round(duration * fps)
        marks = [m for m in marks if m[0] <= frames - 2]
        if count is not None and audio.get("shutter_mode") == "per-shot":
            if frames < 2 * count:
                raise ValueError(
                    "Allow at least two frames per picture or select fewer inputs."
                )
            # Give the closing picture a full beat when the requested duration allows it.
            spaced = [m for m in marks if m[0] <= frames - frames // count]
            if len(spaced) >= count:
                marks = spaced
            elif len(marks) < count:
                # The shutter is sampled per shot. A dense selection can reuse individual
                # strokes at new times without playing any of the intervening recording.
                return [
                    (
                        i * frames // count,
                        "shutter",
                        float(attacks[i % len(attacks)] / RATE),
                    )
                    for i in range(count)
                ], frames
        if len(marks) < needed:
            raise ValueError(
                "Too few shutter attacks for these pictures in the requested duration."
            )
        if count is None:
            chosen = marks
        else:
            # Spread a fixed number of pictures over genuine attacks only.
            indices = np.linspace(0, len(marks) - 1, count).round().astype(int)
            chosen = [marks[i] for i in indices]
    return chosen, frames


def get_bed(candidates, seconds, start, explicit):
    for path in candidates:
        data = decode(path, seconds, start)
        if not explicit and len(data) < (seconds - 1 / 30) * RATE:
            continue
        if len(data) and np.max(np.abs(data)) > 0.001:
            return path, data
        if explicit:
            raise ValueError(f"No audible samples at {start}s in {path}")
    return None, None


def accents(data):
    # Use 10 ms hops; measure changes in frequency as well as a rise in level.
    if len(data) < 2 * 960:
        return []
    mono = data.reshape(-1, 2).mean(axis=1)
    windows = np.lib.stride_tricks.sliding_window_view(mono, 960)[::480]
    spectra = np.log1p(40 * np.abs(np.fft.rfft(windows * np.hanning(960))))
    flux = np.maximum(0, np.diff(spectra, axis=0)).mean(axis=1)
    peaks, _ = find_peaks(
        flux, distance=6, prominence=max(0.012, np.percentile(flux, 70) * 0.32)
    )
    return [(round((i + 1) * 0.01 + 0.005, 3), float(flux[i])) for i in peaks]


def schedule(n, frames, fps, bed, wave_path, minimum=2):
    if frames < n * minimum:
        raise ValueError(
            "The duration is too short for this many shots. Increase duration or select fewer inputs."
        )
    onsets, grid = [], {}
    if bed is not None:
        wavfile.write(wave_path, RATE, bed)
        onsets = accents(bed)
        grid = beats.detect(wave_path, max_seconds=frames / fps)
    period = 60 / grid["tempo"] if grid.get("usable") else None
    step = frames / n
    marks = [(0, "start", 0.0)]
    for j in range(1, n):
        ideal = j * step
        lo = marks[-1][0] + minimum
        hi = frames - (n - j) * minimum
        radius = max(1, min(fps * 0.17, step * 0.44))
        # Strong real accents win when several fall within the same timing window.
        nearby = [
            (t, power)
            for t, power in onsets
            if abs(t * fps - ideal) <= radius and lo <= round(t * fps) <= hi
        ]
        strongest = max((power for _, power in nearby), default=1)
        choices = [
            (0.45 * abs(t * fps - ideal) / radius + 1 - power / strongest, t, "onset")
            for t, power in nearby
        ]
        if not choices and period:
            subdivision = min((1, 2, 4, 8), key=lambda k: abs(period / k - step / fps))
            for beat in grid["beats"]:
                for k in range(subdivision):
                    t = beat + k * period / subdivision
                    if abs(t * fps - ideal) <= radius and lo <= round(t * fps) <= hi:
                        choices.append(
                            (
                                abs(t * fps - ideal),
                                t,
                                "beat" if k == 0 else "subdivision",
                            )
                        )
        if choices:
            _, time, kind = min(choices)
        else:
            time = ideal / fps
            kind = "percussion" if bed is None else "paced"
        frame = min(hi, max(lo, round(time * fps)))
        marks.append((frame, kind, round(time, 5)))
    return marks, {
        k: grid[k] for k in ("tempo", "usable", "confidence", "kick_check") if k in grid
    }


def stereo_fade(data, fade_in, fade_out):
    for count, end in [(fade_in, False), (fade_out, True)]:
        count = min(len(data), max(0, count))
        if count:
            ramp = np.linspace(0, 1, count, dtype=np.float32)[:, None]
            if end:
                data[-count:] *= ramp[::-1]
            else:
                data[:count] *= ramp


def shutter_hit(cycle, source_seconds, max_samples):
    """Take a single mechanical stroke, ending its tail before the shutter returns."""
    at = round(source_seconds * RATE) % len(cycle)
    hit = cycle[at : at + round(0.043 * RATE)]
    envelope = np.max(np.abs(hit), axis=1)
    strength = envelope[: round(0.017 * RATE)].max()
    if strength < 1e-5:
        raise ValueError("No shutter attack at the saved sample position.")
    stop = min(len(hit), round(0.033 * RATE), max_samples)
    quiet_length = round(0.0037 * RATE)
    if len(hit) >= quiet_length:
        quiet = (envelope < strength * 0.09).astype(np.int32)
        quiet_runs = np.convolve(quiet, np.ones(quiet_length, np.int32), "valid")
        releases = np.flatnonzero(quiet_runs == quiet_length)
        releases = releases[releases >= round(0.009 * RATE)]
        if len(releases):
            stop = min(stop, int(releases[0]) + quiet_length)
    hit = hit[:stop].copy()
    stereo_fade(hit, 8, round(0.0035 * RATE))
    return hit


def soundtrack(plan, output):
    fps, shots = plan["fps"], plan["shots"]
    length = round(sum(s["frames"] for s in shots) / fps * RATE)
    mix = np.zeros((length, 2), np.float32)
    audio = plan["audio"]
    if audio.get("shutter"):
        cycle = processed_shutter(audio)[audio["trim_samples"] :]
        if not len(cycle):
            raise ValueError("Shutter source changed since planning.")
        if audio.get("shutter_mode") == "per-shot":
            for shot in shots:
                start = round(shot["timeline_frame"] * RATE / fps)
                # Leave a release gap even for two-frame cuts in a dense burst.
                max_samples = max(1, round(shot["frames"] * RATE / (2 * fps)))
                hit = shutter_hit(cycle, shot["shutter_source_seconds"], max_samples)
                mix[start : start + len(hit)] = hit
        else:
            for start in range(0, length, len(cycle)):
                n = min(len(cycle), length - start)
                mix[start : start + n] = cycle[:n]
    elif audio["bed"]:
        bed = decode(audio["bed"], length / RATE, audio["offset"])
        if len(bed) < length - RATE / fps:
            raise ValueError(
                "Soundtrack ends before the edit. Pick a longer section or shorten the edit."
            )
        mix[: min(length, len(bed))] = bed[:length]
    else:
        kit = SIBLINGS / "sound-effects" / "sfx" / "kit"
        hits = []
        for filename in ["click.ogg", "tick.ogg"]:
            hit = decode(kit / filename, 1)
            active = np.where(np.max(abs(hit), axis=1) > 0.08 * np.max(abs(hit)))[0]
            hit = hit[max(0, int(active[0]) - 48) :].copy()
            hit *= 0.32 / max(0.01, np.max(abs(hit)))
            hits.append(hit)
        for i, s in enumerate(shots):
            start = round(s["timeline_frame"] / fps * RATE)
            hit = hits[int(i % 4 != 0)][: length - start]
            gain = 1 if i % 4 == 0 else (0.58 if i % 2 == 0 else 0.36)
            mix[start : start + len(hit)] += hit * gain
    if audio["location_sound"]:
        for s in shots:
            if not s["source_audio"]:
                continue
            start = round(s["timeline_frame"] / fps * RATE)
            duration = s["frames"] / fps
            # Leave up to 100 ms of outgoing production sound under the incoming picture.
            sound = decode(s["source"], duration + 0.10, s["in_seconds"]).copy()[
                : length - start
            ]
            stereo_fade(
                sound,
                round(0.018 * RATE),
                max(round(0.012 * RATE), len(sound) - round(duration * RATE)),
            )
            mix[start : start + len(sound)] += sound * (0.32 if audio["bed"] else 0.75)
    if audio.get("shutter_mode") != "per-shot" or audio["location_sound"]:
        stereo_fade(mix, 48, round(min(0.065, length / RATE / 8) * RATE))
    peak = np.max(abs(mix))
    if peak > 0.89:
        mix *= 0.89 / peak
    wavfile.write(output, RATE, (np.clip(mix, -1, 1) * 32767).astype(np.int16))
