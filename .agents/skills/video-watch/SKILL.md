---
name: video-watch
description: >
  Download a video from YouTube or any site yt-dlp supports (TikTok, Instagram, X, Vimeo and more),
  or take a local video file, then pull out still frames and timestamped subtitles so you can actually
  watch it: see what is on screen and read what is said. Use when the user shares a video link or file
  and asks what happens in it, wants it summarized, reviewed, clipped or edited, says "watch this",
  or needs a moment or timestamp found.
---

# Video Watch

You can't play video, but you can look at images and read text. This skill turns a video into both.

## Run it

The script is `scripts/watch.py` inside this skill's folder. From the VideoEditing repo root:

```bash
uv run --script .agents/skills/video-watch/scripts/watch.py "<url or file path>"
```

From anywhere else, use the script's full path. If `uv` is not found, use `~/.local/bin/uv`.
The first run installs yt-dlp and ffmpeg on its own.

| Option | Use |
|---|---|
| `--max-frames N` | Most frames to grab (default 30). Spacing is picked to cover the whole video. |
| `--every SEC` | A frame every SEC seconds instead. |
| `--start T --end T` | Only one part, e.g. `--start 1:30 --end 2:15`. |
| `--width PX` | Frame width (default 768). Smaller is cheaper to look at. |
| `--lang xx` | Subtitle language (default `en`). |
| `--browser chrome` | Use the user's sign-ins from that browser (`chrome`, `safari`, `firefox`, or `chrome:Profile 1`). Only for private or login-only videos, such as Instagram Reels from private accounts or the user's own stories. |

It prints one JSON line. Everything lands in `downloads/<site>-<id>/` (or `downloads/local-<name>/`):

- `index.md`: each frame's time, its image path and what is said at that moment. Read this first.
- `frames/*.jpg`: the frames, named `<number>_<hh-mm-ss>.jpg`. Open them to see the video.
- `transcript.txt`: the full subtitles with timestamps.
- `video.mp4`: the downloaded video (720p max). Local files are not copied.

## How to watch

1. Run the script and read `index.md`.
2. Look at frames. Every image costs tokens, so start with a spread (every 3rd to 5th frame) and open
   more only where the question needs it.
3. To study one moment, rerun with `--start`/`--end` and `--every 1`. Zoomed runs get their own
   `frames_<range>/` and `index_<range>.md`, so the overview stays.
4. Give timestamps (hh:mm:ss) in your answer so the user can jump to them.

## When something fails

- No subtitles: say so. For YouTube, `agent-reach youtube transcribe <url>` can produce a transcript
  if the user has set up a Groq or OpenAI key (they enter it themselves with `agent-reach configure`).
- Private, age-restricted or login-only videos: if the user is signed in to that site in Chrome, rerun
  with `--browser chrome`. The first time, macOS asks the user to allow access to "Chrome Safe Storage"
  in the keychain; they click Allow themselves. If they are not signed in, tell them. Never ask for
  their password.
- Instagram: public Reels and posts download without signing in. Rate limits or "login required"
  errors mean rerun with `--browser chrome`.
- Downloads go in `downloads/`, which git ignores. Never commit video files.
