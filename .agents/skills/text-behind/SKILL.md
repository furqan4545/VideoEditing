---
name: text-behind
description: >
  Put big title text BEHIND the person in a video for a couple of seconds: the words sit on the background and the
  speaker stays in front of them (the editorial "text behind subject" look — tall condensed serif, red and white,
  background dimmed while the words are up). Use while editing a talking-head reel, podcast clip or vlog when a key
  line deserves a big title behind the speaker ("THE REAL TRUTH", "REVENGE", "COMPARE THEM"), when the user says
  "text behind me", "words behind my head", "text behind the person/subject", or when an edit needs one or two
  premium title beats. Works on a finished video (one window, audio kept) or on a folder of footage frames (an
  onetake comp's take), so it slots into the reel workflow before the render.
---

# text-behind

Big words behind the speaker, ~2 s. The person is cut out per frame with **Apple's Vision framework** (built into
macOS, runs on the Neural Engine: no model download, one frame at a time, ~0.1 s a frame), the background is dimmed
and partly desaturated, the text is drawn on the background, and the person goes back on top.

Setup (once per Mac, `setup.sh` does it): `swiftc -O scripts/personmask.swift -o ~/.local/share/text-behind/personmask`.
Run the compositor with onetake's Python: `PY=~/.local/share/onetake/.venv/bin/python`.

## Use it

```bash
# a finished video: the effect from 13.7 s for 2.2 s, the rest untouched, audio copied
$PY scripts/textbehind.py --video IN.mp4 --out OUT.mp4 --at 13.7 --dur 2.2 \
    --text "THE REAL|white|t=0,size=0.7" --text "TRUTH|red|t=0.42" --y 0.21

# an onetake take (film/footage/<id>/NNNN.jpg at 30 fps): frames replaced in place, originals kept in _orig/
$PY scripts/textbehind.py --frames film/footage/L7 --fps 30 --at 2.5 --dur 2.2 --text "THE REAL|white" --text "TRUTH|red"
```

`--at` is seconds into the video (or into the frame folder: frame 0 = 0 s). Time each line to the spoken word
(`t=` is relative to `--at`): the line lands as the word is said, the whole block leaves together at the end.
Every option is in `scripts/textbehind.py --help`.

## Choosing the words and the placement (what made the sample work)

- **One short phrase, 1-3 words per line, max 2 lines.** The key word in red (`|red`), the setup word small and white
  (`size=0.6-0.7`). Each line is fitted to the frame width, so short words get huge.
- **Put it at head height** (`--y` = the block's centre, 0 top → 1 bottom): the head must cover part of the letters,
  or it just looks like a caption. Selfie close-ups: `--y 0.18-0.25` (above the eyes, behind the hair). Wider shots
  with the person to one side: put the words on the empty side at shoulder height (`--y 0.4-0.5`).
- **Look at a still first**: the middle letters can hide behind the head (`TR·TH`): fine while the word still reads.
  If it doesn't, shorten the word, raise `--y`, or use `size=` to shrink a line.
- **Length: 1.8-2.6 s.** It's a beat, not a caption track: one or two per reel, on the line that matters.
- Bright rooms need the dim (`--dim 0.42` default); a dark set can go to `--dim 0.7` and keep more colour.
- `--mode person` (default) keeps hands and arms with the body; `--mode subject` takes every foreground object
  but can drop a loose hand.
- Fonts: default Bodoni 72 Bold squeezed to 60 % (`--condense 0.6`); Didot Bold (`--font
  /System/Library/Fonts/Supplemental/Didot.ttc --font-index 2`) is lighter. Any .ttf/.otf works with `--font`.

## In the reel workflow (onetake comps)

Run it on the take's frame folder **before** the render: the comp keeps reading the same frame names, so nothing in
the comp changes. Then hide that stretch's captions/marker boxes in the comp (the words are already on screen) and
give the moment a sound (a low boom or a riser into it, at the same level as the other effects). To undo, copy the
files back from `_orig/`. Worked sample: `downloads/reel2/out/text_behind_sample.mp4` (made from reel 2's L7 take).

## Files

| path | what |
|---|---|
| `scripts/personmask.swift` | Vision person / subject matte per frame → 8-bit PNG (compile once) |
| `scripts/textbehind.py` | dims the background, draws the animated lines, puts the person back on top; video or frame-folder mode |
