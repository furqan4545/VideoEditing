---
name: html-canvas-animation
description: The "html canvas animation skill" - Ali's clean 2D white-paper "cinematic movie" (the reel 16 loading-bar and reel 17 Instagram-likes look). One HTML canvas page where every frame is a pure function of time; ONE camera glides, whips, dives and pulls out over one white paper desk; premium black-and-white components with soft two-layer shadows; scenes carry into each other with no cuts (dive into a picture that becomes the next place, push through his hand into black, follow the thing that flies); his footage as a photo card at a few moments; reel 13 captions; 0.2 s breathing room after every sentence; onetake's renderer adds real motion blur. Ships a starter (kit.js, comp, story, demo scene, cut / pauses / mix / cue / thumbnail tools), the docs, and reel 17 as the worked example. Use when Ali asks for an animated explainer or "cinematic movie" on white paper, "html canvas animation", "same style as reel 16 / reel 17 / the Instagram likes video / the loading bar video", a 2D one-take film built from designed components, or its thumbnail.
---

# html-canvas-animation: a white-paper cinematic movie, in one take

One HTML page draws the whole film on a `<canvas>`. Every value is a pure function of `t`, so onetake's `render.py` can
seek any frame and average several captures across the shutter into real motion blur. One camera travels over one
paper desk; every place in the story sits somewhere on that desk, and every change of place or scale is a camera move.
Made from reel 16 ("the loading bar that lies", Ali: "ok it's great") and reel 17 ("How does Instagram never lose a
like?", Ali: "omg i love this setup ... this animation is so clean and beautiful").

Needs the `onetake` skill (its Python venv with Playwright's Chromium, `scripts/render.py`, `lib/motion.js`). onetake
is PolyForm Noncommercial: personal reels are fine; tell Ali before a film for a client or a business.
For a 3D world (real 3D objects) use the `paper3d` skill instead; this one is the 2D canvas look.

## Ali's rules (each came from his notes; check the memory index too, new rules get added between sessions)

1. **One take, no cuts.** Every change is a camera move: whip, dive, pull-out, a push through his hand or shirt into
   black, the camera riding the thing that flies. Scenes carry into each other; nothing snaps.
2. **The look:** warm white paper with grain and a faint dot grid; black, white and grey components with soft two-layer
   shadows, hairlines and depth; ONE accent colour with a meaning (reel 17: blue = "you"), red only for something lost
   or wrong. "Everything plotted on top of white and black looks premium." Real detail that holds in close-up.
3. **Extreme close-ups, but short, and the whole thing first.** Show an object whole, in its place, then dive in; a
   close-up lasts a few seconds, then pull back so the viewer always knows where they are. People: full figures (seen
   from above in a plan view is fine), never legs only.
4. **Captions: reel 13 style** (built in): SF 600 black, one blue New York italic key word, soft shadow, no box, no
   flicker, up to 4 words a line, white over dark picture automatically. If he asks for the "simple story tell
   caption", load that skill's file and set `CAP_OFF = true`.
5. **His voice:** raw, 1.10x (`atempo`), one gain per line, **0.2 s of breathing room after every sentence** (built in:
   `cut/pauses.py` + the two clocks). Hook on camera; he is a photo card at only a few moments (hook, the turn, the close).
6. **Sound:** music at least 15 LU under the voice (check the loudest moments); few soft cinematic effects at one level
   about 11 dB under the voice; no pen / marker strokes, no pops, no dings; a breath of music silence before the big
   reveal. Listen with earshot before sending.
7. **Endings:** the last line gives value; a comment keyword is fine; never "follow for more", no profile card.
8. **Work in the open.** Never go quiet: post progress, send partial renders while the full one runs
   (`tools/preview_partial.sh`), take each finished part as soon as it lands. Keep agent fan-outs to 2-3 at most and
   say the cost first (reel 15 used up his credits). Never edit `film/` while `render.py` runs.

## Start a film

```bash
.agents/skills/html-canvas-animation/scripts/new_film.sh downloads/reelN/full
cd downloads/reelN/full && ~/.local/share/onetake/.venv/bin/python tools/pstills.py look/demo.jpg 0.5,2.5,3.6,4.6,6.2,8.5 --cols 6
```

It copies the template (below), onetake's `motion.js`, and builds `film/fonts.js` from this Mac's Apple fonts (SF Pro,
SF Mono, New York, inlined: a linked font file does not load from `file://`). It never overwrites a file. The demo
shows the conventions; delete `scenes/demo.js` when your scenes exist.

## The files

| file | what |
|---|---|
| `film/kit.js` | the engine: paper, `plate()` cards and shadows, text and line helpers, `heartPath`, `writeOn` (handwriting reveal), Ali's photo card (`aliCard`, `aliPoint`), `layer()/overlay()`, `VIEW_REG`, the keyed camera (`mkKeys`, `camAt` with hand float, shakes, anchored zooms), the two clocks (`oldT/newT`), the reel 13 captions, `startFilm()` (the render contract). Never edit it for one film. |
| `film/story.js` | this film's desk layout (where each place sits), named moments from the words (`A_`), shared story state, caption key words (`CAP_KEYS`, `CAP_FIX`) |
| `film/scenes/*.js` | one file per place or part of the story, each with its own name prefix; registers layers, a preview view, `// CAMERA NOTES`, and proposed `SFX_EVENTS` |
| `film/comp.html` | loads everything and calls `startFilm({ aliShow, keys })`: Ali's on-camera moments and the master camera |
| `film/thumb.html` | the thumbnail: one frame of the film's world + the question in SF 600 with one red italic key word |
| `cut/transcribe_take.py`, `cut/check_spots.py`, `cut/build.py`, `cut/pauses.py` | find every try → pick the best try of each line → cut + 1.10x + frames for on-camera pieces → the 0.2 s pauses |
| `sound/cues.py`, `sound/mix.py` | the hand-picked cue list → the mix (voice raw, music low with a drop before the reveal, effects at one level) |
| `tools/pstills.py`, `tools/preview_partial.sh`, `tools/dump_events.py`, `tools/thumb.py` | contact sheets (`--view`, `--full`), the first N seconds while rendering, the scenes' sound proposals, the thumbnail PNG |

## The order of work

1. **Script first** (scenario-first story, 5th-grade words, real mechanism). He records the whole script on camera.
2. **Cut.** `TAKE=/path/take.mov python cut/transcribe_take.py "rare words"` → pick the best try per line (in/out from the
   envelope list) → `cut/check_spots.py` for unclear words (names, accents) → fill `SEQ` + `ON_CAM` in `cut/build.py` →
   run it → `cut/pauses.py`. Tell him any word you chose by ear (reel 17: he said "Minji", not "Bilal").
3. **Plan the shots against the word times** (`cut/timing.json`): per line, the picture, the move into the next line,
   which places sit where on the desk. Find his gestures in the on-camera pieces (a pointing finger, two fingers, his
   black shirt) and plan the joins on them.
4. **Write `story.js`** (layout, `A_` moments, shared state), then the scenes. Design each beat at the zoom it is seen at;
   look at stills (`tools/pstills.py OUT times --view NAME --full DIR`) and iterate.
5. **Join the camera** in `comp.html` from the scenes' CAMERA NOTES plus your joins (`references/camera-and-joins.md`).
   Check a still every 2 s, then dense stills around every join.
6. **Render** (about 2.5 frames a second on 6 workers; 82 s took 16.5 min):
   `~/.local/share/onetake/.venv/bin/python ~/.claude/skills/onetake/scripts/render.py film/comp.html --out film/draft_v1.mp4 --width 1080 --height 1920 --workers 6`
   (run it in the background; send `tools/preview_partial.sh` cuts while it runs).
7. **Sound** while it renders: fill `sound/cues.py` by hand (the scenes' `SFX_EVENTS` are only proposals; reel 17's
   scenes proposed 91, the film used 45), then `sound/mix.py --music sound/music.wav --drop ID --bar SONG_S --room ID`.
   Pick music with `earshot rank` over his music folder; find the song's bar line for the reveal.
8. **Check:** mux, no hard cuts (`ffmpeg` scene score; biggest should stay under ~0.35, inside whips), captions frame by
   frame through whips, `earshot timeline`, Whisper on the mix against the script (with a little context before each
   line), the music vs voice gap per section (at least 15 LU), the loudest moments.
9. **Deliver** one folder in Downloads: `reelN_<name>/` with the MP4, `description.txt` (reel 16 layout: only what the
   video skipped) and the thumbnail JPEG.

## The worked example: reel 17 (`examples/reel17/`)

"How does Instagram never lose a like?" (82.6 s). Hook post card → dive into the post image, which becomes Sara's
drawing on a classroom wall → a top-down class of 100 → two kids race to the board (both read 41, both write 42) → the
race diagram grows out of the board → rewind, the teacher's rule (notes with names, one pen, one at a time, a duplicate
goes in the bin) → whip to Ali "That is Instagram" → push through his pointing hand into black → out of a phone's black
glass → the request card flies to a server farm (millions) → inside the server → a world map of copies → whip to Ali →
two computers grow from his two fingers → comment "pen". Files: `film/base.js` (the kit and story.js in one file, the
layout and the beat clock), `film/scenes/{phone,class,wall,network}.js` (each 600-850 lines), `film/comp.html` (the
joined camera), `cut/`, `sound/`. Its description is in `examples/reel17/description.txt`. The house-style reference
for single-file films is `downloads/reel16/full/film/comp.html`.

References: `references/camera-and-joins.md` (keys, curves, the hidden joins, framing), `references/components.md`
(drawing premium components, fonts that work, speed), `references/lessons.md` (what reels 16 and 17 taught).
