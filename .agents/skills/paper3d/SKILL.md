---
name: paper3d
description: Make an animated 3D explainer film for a reel (how-it-works, science, "inside the device") as ONE continuous camera take in a real 3D world on white paper - real objects with real materials and soft shadows, built in code with three.js and rendered with onetake's motion-blur renderer. Ships a camera/world kit, a library of ready 3D models (full-body walking person, shop security gates, security tag with strip and magnet, magnetic field lines, shopping bag, receipt, cheese, keys, coin battery, chip, checkout, jeans, pay point, washing machine, calendar, tool wall, tray, jacket, shoes, belt, ruler on a desk, swing, prints of real web pages, a print that plays Ali's footage), Ali's simple story tell captions, a thumbnail scene and the reel 15 film as a worked example. Use when Ali asks for a 3D / animated / cinematic explainer, "like reel 15", "the supermarket gate video", a 3D thumbnail, or wants a device or a process shown from the inside with the camera diving in.
---

# paper3d: a 3D explainer film on white paper, in one take

One HTML composition, a real 3D world (three.js r180), one camera that never cuts. Everything is a pure function of
time, so onetake's renderer can seek it frame by frame and add real motion blur. First film: reel 15, "How does the
gate at the supermarket know you did not pay?" (94.7 s), in `downloads/reel15/full/`; Ali's verdict on v1: "This is
fucking amazing". This skill is that film's kit, its models and what it taught.

Needs the `onetake` skill installed (its Python venv with Playwright's Chromium, its `render.py` and `lib/motion.js`).
onetake is PolyForm Noncommercial: personal reels are fine, tell Ali before a film for a client or a business.

## Ali's rules for these films (each one came from his notes)

1. **A person is always full body.** Use the `person` model, never bare `legs`. ("when you draw a person it is full
   body not just legs")
2. **Show a thing whole first, then go inside it.** Every object gets an establishing view, in its place, before any
   close-up. ("first show it full then zoom in side it for explanation")
3. **No long extreme close-ups.** A macro shot lasts a few seconds, then the camera pulls back to a view that shows
   the parts together, so the viewer always knows where they are and sees the full process. Alternate close and wide.
4. **Captions are the "simple story tell caption"** (the black captions of reel 15, which he called perfect): a few
   words at a time, spoken words near-black, coming words grey, no bold, no movement. The kit loads it by default from
   the `simple-storytell-caption` skill. Do not design another caption look.
5. **Voice on top, music low.** Music stem at least 15 LU under the voice stem; check the loudest music moments one
   by one. His raw voice gets only the 1.10x speed-up and one gain per line.
6. **One take, no cuts.** Every change of place or scale is a camera move (dive, pull-out, whip, a ride on something
   that moves). His own footage appears as a `print` standing on the paper; the camera can fly through a hole in it.
7. **The look:** white paper ground and sky, black / white / grey objects with real materials and soft shadows, colour
   only for meaning (in reel 15: blue = the magnet's field, purple = the gate's field, orange = the strip's answer,
   green / red = the gate's light). Plain on-screen words, never bold, never tilted, never moving.
   **No instructions or disclaimers on screen**: never a footnote like "Slowed down and drawn bigger" (he called it
   nonsense). On-screen words are for the content only: a part's name, a number.
8. **Technical but simple:** keep the full real mechanism, in 5th-grade words; draw the invisible things (fields,
   forces) as clean thin lines.
9. **Keep the build small.** Reel 15 ran 29 agents and used up his credits mid-edit. Reuse the models here; build a
   new model yourself or with one helper; no automatic second "refine" pass; say the cost before any fan-out.

## Start a film

```bash
.agents/skills/paper3d/scripts/new_film.sh downloads/reelN/full
cd downloads/reelN/full
~/.local/share/onetake/.venv/bin/python tools/vstills.py film/comp.html look/demo.jpg 0.5,2.4,4.6,6,8.4 5 360   # the demo shot
tools/preview.sh person '' legs                                                                                  # any model alone, six views
```

`new_film.sh` copies the kit (`film/kit.js`, `film/comp.html`), all models (`film/assets/`), a demo world and shot, the
tools, onetake's `motion.js`, a patched copy of onetake's renderer (`tools/render3d.py`), the three.js bundle (built
once per Mac into `~/.cache/paper3d/`) and Apple's SF and New York fonts from this Mac (`film/fonts/`, never in git).
It never overwrites a file, so re-running it only adds what is missing.

## The order of work

1. **Voice first.** Cut Ali's takes into `cut/voice.wav` and `film/timing.js` (`TIMING.dur`, `words`, `keys`, `footage`).
   Worked example: `examples/reel15/cut/build.py` (pieces on word edges, `atempo=1.10`, one gain per phrase, JPEG frames of his
   on-camera moments for the `print` model). He is on screen only where needed; 80% or more is the animated film.
2. **Storyboard to the words.** One file like `examples/reel15/STORYBOARD.md`: per spoken phrase, the picture, the carry
   into the next beat, the few on-screen words, and exact camera poses where one sequence hands over to the next.
   Check it against rules 1 to 3 before building anything.
3. **World** (`film/world.js`): stations (frames on the paper), which model stands where, which place exists when.
4. **Shots** (`film/shots/NN_name.js`): camera keys, model states and labels as functions of time, plus `KIT.event(...)`
   for every moment the sound should mark. Preview constantly with stills; read `references/KIT.md` for the API.
5. **Sound:** `tools/events.py` writes `sound/events.json` from the film; mix from that list (`examples/reel15/sound/mix.py`
   as a start; follow the sfx-cloud, earshot and real-sfx skills and rule 5).
6. **Render and join:** `tools/assemble.sh v1` (about 2.5 frames a second on 6 to 7 workers: say the estimate first; 95 s
   took 18 minutes). Then scan for accidental jumps:
   `ffmpeg -i out/film_v1.mp4 -vf "select='gt(scene,0.25)',metadata=print:file=-" -an -f null -` and look at each hit.
7. **Thumbnail:** edit `film/thumb.js`, render `tools/still.py out/thumb.png 0.5 "thumb=1&only="`. Models only, no photo of Ali
   unless he asks.

## What is in the box

- `kit/`: `kit.js` (world, light that follows the camera, camera, labels, captions, footage, seek), `comp.html`, templates.
- `models/`: see `references/models.md` for every model with its options, states and anchors.
- `tools/`: `vstills.py` (contact sheets), `still.py` (one clean frame), `preview.sh` (one model alone), `dbg.py` (console
  errors + a JS expression), `events.py`, `assemble.sh`, `transcribe.py` (word times, one Whisper process).
- `references/KIT.md`: how models, shots, camera keys, stations, labels and previews work. Read it before writing a shot.
- `references/lessons.md`: what broke on reel 15 and the fixes. Read it before staging.
- `examples/reel15/`: the whole film's world, shots, storyboard, thumbnail, voice cut and mix scripts.

## Gotchas that cost time

- Local images cannot become WebGL textures under `file://` unless Chromium runs with `--allow-file-access-from-files
  --disable-web-security`: always use the project's `tools/*.py` and `tools/render3d.py`, never onetake's `render.py` directly.
- The kit restores every model's rest transform each frame. Move a model inside `update`, every frame; to change where
  something rests after the world is built, also copy the new transform into `inst.rest`.
- At tag scale put clean paper under the subject (`macropaper`) and hide what surrounds it, or the close-up sits on a
  yellow cheese inside a grey bag. Reel 15's `world.js` does it from the camera distance.
- A white object on white paper needs form: slightly different whites, a darker part, a seam, and its shadow.
- Captions sit at y 268 to 384. Keep subjects below y 430 and inside x 100 to 980, y up to 1500.
- Render from a snapshot copy of `film/` if you keep editing while it renders (workers reload the page every 150 frames).
