"""End-to-end regression for fixed photos, corner-only blur and one sound per picture."""

import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import cv2
import numpy as np
from scipy.io import wavfile

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "match_cut.py"


class PhotoEditTest(unittest.TestCase):
    def test_exported_frames_and_shutter(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            photos = root / "photos"
            photos.mkdir()
            y, x = np.indices((128, 128))
            tiles = ((x // 8 + y // 8) % 2 * 100 + 20).astype(np.uint8)
            for i, offset in enumerate([0, 70, 125]):
                cv2.imwrite(str(photos / f"{i}.png"), tiles + offset)
            shutil.copyfile(photos / "0.png", photos / "duplicate.png")

            # The source cadence varies. Only its opening exposure should be repeated.
            wave = np.zeros(48000, np.int16)
            rng = np.random.default_rng(87)
            for start in [2400, 9600, 12480, 21600, 24000]:
                noise = rng.uniform(-1, 1, 900) * np.exp(-np.arange(900) / 130)
                wave[start : start + len(noise)] = np.rint(24000 * noise)
            shutter = root / "shutter.wav"
            wavfile.write(shutter, 48000, wave)

            out = root / "film"
            subprocess.run(
                [
                    sys.executable,
                    "-B",
                    SCRIPT,
                    photos,
                    "--shutter",
                    shutter,
                    "--keep-order",
                    "--long-edge",
                    "128",
                    "-o",
                    out,
                ],
                check=True,
                capture_output=True,
            )
            plan = json.loads((out / "edit.json").read_text())
            self.assertEqual(len(plan["shots"]), 100)
            self.assertEqual(sum(s["frames"] for s in plan["shots"]), 600)
            self.assertEqual([s["frames"] for s in plan["shots"]], [6] * 100)
            video = out / "match-cut.mp4"

            def decode(*options):
                return subprocess.check_output(
                    ["ffmpeg", "-v", "error", "-i", video, *options, "-"]
                )

            frames = (
                np.frombuffer(
                    decode("-an", "-pix_fmt", "gray", "-f", "rawvideo"), np.uint8
                )
                .reshape(600, 128, 128)
                .astype(np.int16)
            )
            audio = np.frombuffer(
                decode("-vn", "-ac", "1", "-ar", "48000", "-f", "f32le"), np.float32
            )
            envelope = np.max(np.abs(audio[:480000]).reshape(-1, 48), axis=1)
            active = np.flatnonzero(envelope > envelope.max() * 0.09)
            hits = np.split(active, np.flatnonzero(np.diff(active) > 20) + 1)
            self.assertEqual(len(hits), 100)

            for i, (shot, hit) in enumerate(zip(plan["shots"], hits)):
                start = shot["timeline_frame"]
                self.assertLess(abs(start / 60 - hit[0] / 1000), 1 / 120)
                hold = frames[start : start + shot["frames"]]
                # H.264 can reconstruct the same still slightly differently in a new GOP.
                self.assertLess(np.abs(hold - hold[0]).mean(axis=(1, 2)).max(), 2)
                if start:
                    self.assertGreater(np.abs(hold[0] - frames[start - 1]).mean(), 20)
                self.assertEqual(Path(shot["source"]).name, f"{i % 3}.png")
                delta = np.abs(hold[0] - (tiles + [0, 70, 125][i % 3]))
                self.assertLess(delta[48:80, 48:80].mean(), 3)
                for yy in (0, 104):
                    for xx in (0, 104):
                        self.assertGreater(delta[yy : yy + 24, xx : xx + 24].mean(), 18)

            # Compare the actual waveforms across speeds. The sound itself should
            # remain recognizable sample for sample when the spacing changes.
            reference = audio[:720]
            for speed in (0.5, 1.25, 2.0):
                with self.subTest(speed=speed):
                    dest = root / f"speed-{speed}"
                    subprocess.run(
                        [
                            sys.executable,
                            "-B",
                            SCRIPT,
                            photos,
                            "--shutter",
                            shutter,
                            "--shutter-speed",
                            str(speed),
                            "--duration",
                            "2",
                            "--keep-order",
                            "--long-edge",
                            "128",
                            "-o",
                            dest,
                        ],
                        check=True,
                        capture_output=True,
                    )
                    shifted = json.loads((dest / "edit.json").read_text())["shots"]
                    self.assertEqual(len(shifted), int(20 * speed))
                    pcm = np.frombuffer(
                        subprocess.check_output(
                            [
                                "ffmpeg",
                                "-v",
                                "error",
                                "-i",
                                dest / "match-cut.mp4",
                                "-vn",
                                "-ac",
                                "1",
                                "-ar",
                                "48000",
                                "-f",
                                "f32le",
                                "-",
                            ]
                        ),
                        np.float32,
                    )
                    for n, shot in enumerate(shifted):
                        self.assertEqual(shot["timeline_frame"], round(n * 6 / speed))
                        start = round(n * 4800 / speed)
                        self.assertGreater(
                            np.corrcoef(reference, pcm[start : start + len(reference)])[
                                0, 1
                            ],
                            0.95,
                        )


if __name__ == "__main__":
    unittest.main()
