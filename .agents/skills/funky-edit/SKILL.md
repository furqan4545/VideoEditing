---
name: funky-edit
description: Ali's "funky edit" - the reel 33 look (Kubai icons, 19 Nov 2026). A faceless reel in a dark voxel room at night - a voxel host and the orange Claude block, an upright monitor, every spoken word on screen as big moving type (cream and red Impact, teal, red boxes), motion-blurred whips inside a room and pixel-block wipes between rooms, a black board with a teal grid where the mechanism is shown as a 3D drawing that swings round and comes apart, real screenshots and a real recorded demo with before and after, silent dog and cat meme stickers on the funny words, the saved Dr.pimp voice with a bro-style script, a low music bed cut to the words and light real effects all at one level. Built on paper3d (three.js, one continuous camera, fast GPU renderer). Ships the look engine (vox.js), the 3D drawing kit, a studio + board world, the two characters, a demo film, voice / timing / meme / screenshot / recording / mix tools, a thumbnail scene and reel 33 as the worked example. Use when Ali says "funky edit", "funky style", "like reel 33", "the voxel video", "the Dr.pimp video style", "same as the icons reel", or wants a faceless funny bro-style tool reel with big words and memes.
---

# funky-edit: voxel room, big moving words, bro voice

The style of reel 33, "Now your Claude can design icons" (85 s, 19 Nov 2026). Ali's notes that shaped it: *"ok it looks
great"* (v1 picture), *"use full bro style language while teaching, and make it casual"*, *"add some 3d animations when
explaining something"*, *"throw memes downloaded from internet whenever you use some funny word, use dog and cat memes"*,
*"sound effects ... all super light and on same level"*. He asked for this skill by the name **funky edit**.

The look follows a reference reel (a dark voxel room, pixel characters, big kinetic words, pixel-block wipes); every
model, word and sound here is built new. It runs on `paper3d` (one three.js world, one camera, every frame a pure
function of time) with a dark layer on top: `vox.js`.

## The style, rule by rule

1. **Faceless, Dr.pimp voice, bro script.** No footage of Ali. The saved Dr.pimp voice narrates (see "Saved voices" in
   `AGENTS.md`; never design a replacement). The script talks like a friend: "Bro.", "Alright, let's cook.", "What the
   fuck is this?", "That's the whole fucking trick.", short fragments, a reaction after a fact. It still teaches the real
   thing in 5th-grade words, and every line says its plain meaning ("the repo also comes with 2,800 icons, ready to use
   right now"), never a clever paraphrase. His own lines (hook, close) are used word for word.
2. **A real demo, and a before / after.** The workspace rule holds: record the tool really working on this Mac and show
   what it made as a before and an after. Here it plays as a card (`VOX.clip`) or on the monitor (`VOX.drawPic`).
   Write it into the script's picture column before building anything.
3. **Two rooms.** `S`, the studio at night (warm lamp, red rim light, bloom): the claim, the proof, the recipe, the
   close. `B`, the board (black, teal grid floor): the mechanism. A film may add a third place for one big picture
   (reel 33: a wall of all 3,026 icons).
4. **Every spoken word is on screen at its own time** (`VOX.say`), a few lines at a time in the top third, the key
   words big: cream Impact, red Impact, teal, a red box. Words never sit on a busy picture without a scrim.
5. **The camera never freezes.** A slow push or drift on every hold (the kit's hand float is always on), a whip
   (`expoInOut`) between two spots of one room, a **pixel-block wipe** (`VOX.wipe`) under every cut between rooms, a
   dive into the thing the explanation is about.
6. **"It is built like this" is a 3D drawing** (`ANAT.stack`): the whole thing first, flat from the front, then it
   swings to three-quarter view, comes apart, each piece gets its name on its word, and it closes again. One example is
   carried all the way through.
7. **Real things.** Real pages as screenshots (`tools/webshots.py`), real logos and icons, real numbers read from the
   source. Check every number on a screenshot against the script (reel 33's GitHub card says 2,600+ while the voice
   says 2,800).
8. **Memes on the funny words.** Dog and cat meme photos (`tools/memes.py`) pop in as small white-framed stickers for
   about a second (`VOX.meme`), beside the words, never over them. They are **silent pictures**: no sound on a meme.
   About one per funny line; reel 33 has eight in 85 s.
9. **Sound: light and level.** The voice is raw (one gain per line). Music sits at least 15 LU under it, its drops cut
   to a cut or a key word. Every effect is a real recording at **one level, 16 dB under the voice's loudest moment**
   (at 11 dB he said "too loud"). Cinematic whooshes, soft hits, clicks, pops; nothing cartoonish. Prove it with the
   mixer's level report and `earshot`.
10. **Close.** His own closing line if he gives one, word for word (reel 33: link in the description, "or comment
    SKILL…"). Otherwise a value line; details go in the description.

## Start a reel

```bash
.agents/skills/funky-edit/scripts/new_reel.sh downloads/reelN/full
cd downloads/reelN/full
PY=~/.local/share/onetake/.venv/bin/python
$PY tools/vstills.py film/comp.html look/demo.jpg 0.6,2.2,4.2,6.6,8.6,10.5,12.6,15.6 8 300    # look at the 17 s demo
```

The demo (`film/shots/10_demo.js`) uses every piece once: read it, then replace it with your beats.

## Order of work

1. **Research + script.** Read the source (`downloads/reelN/research/`). Write `downloads/reelN/script.md` as a
   `| Beat | Script | Action |` table in bro style. The story shape is his usual one; `insta_zoom_pw_story` only when
   he names it. Plan about **3.2 words a second** (Dr.pimp's real pace: reel 33 is 264 words in 85 s). Show him the
   script before building.
2. **Record the demo** on this Mac (tools go in `downloads/reelN/demo-tools/` with a `CLEANUP.md`), then
   `tools/clip.sh REC.mov demo 1280` → frames + the `VOX.clip` line. Stills of before and after go in
   `film/img/demo/` and `film/img/manifest.js`.
3. **Voice.** Put the lines in `vo/script.json` (`text` = what is said, spelled out: "Koo-bye", "twenty-eight hundred";
   `show` = what the screen shows: "Kubai", "2,800"; `direction` = how). VoiceStudio open, then `python3 vo/generate.py`
   (one line at a time; never beside another heavy model). Read every Whisper line it prints; a dropped or garbled word
   gets a new take with `"seed"`.
4. **Timing.** `$PY cut/build_voice.py` → `cut/voice.wav` + `film/timing.js` (every word's time, by beat). A line that
   needs air: `"gap"`; a list that needs beats: `"pauses"`.
5. **Pictures.** `tools/webshots.py name=URL …`, `python3 tools/memes.py cool_dog="cool dog" huh_cat="confused cat"`
   (look at `look/memes.jpg`; `--pick name=2` for the next result).
6. **Build the film.** World in `film/world.js`, one shot file per act in `film/shots/` (listed in `index.js`), every
   loose thing reset in `00_base.js`. Take all times from the words: `VOX.wt('step1', 'cook.')`, never a typed number.
   Stills every ~1.5 s and dense around whips, wipes and pops: `tools/vstills.py`. Errors: `$PY tools/dbg.py "1"`.
7. **Sound.** `$PY tools/events.py` → `sound/events.json`, then
   `~/.local/share/earshot/.venv/bin/python sound/mix.py --music "/path/track.mp3" --drop 78.97=board/Alright, --drop 111.98=name/skill.`
   (`--find-drops` lists where a track gets loud). Read its report: music LU under the voice, every effect's level.
8. **Render + join.** `tools/assemble.sh v1` (the fast GPU renderer, about 1.5 to 2.5 s per film second, then the mux). Never
   edit `film/` while it renders. One stretch again: `tools/partial_rerender.sh out/film_v1_silent.mp4 v2 "13.0-35.9"`.
9. **Check.** A frame sheet of the MP4, `earshot` `measure` + `timeline` (and `critique`) on the final file: -14 LUFS,
   true peak under -1 dB, words clear over the music.
10. **Deliver** to `~/Downloads/reelN_<slug>/`: the MP4, `thumbnail.png` (`$PY tools/still.py out/thumbnail.png 0.5 "thumb=1"`,
    title in `film/thumb.js`), `description.md` (only what the video skipped, every link open) and `CREDITS.md`
    (voice, music, every sound pack, fonts, memes with "rights not checked").

## The pieces

**Words** — `VOX.say(beatKey, [block, …])`, one call per voice line. A block: `{ at: [x, y], align: 'l' | 'c' | 'r', size, lines: ['plain ^BIG !RED', …] }`.
Each token takes the next spoken word of that beat (the console says so when the count is off). A block leaves when the
next one starts; `until` / `hold` change that, `count: true` counts a number up, `_` in a token is a space.

| token | look | token | look |
|---|---|---|---|
| `word` | white Geist 500 | `+word` | teal, bold, glow |
| `*word` | bold | `#word` | white on a red box |
| `^word` | big cream Impact | `@word` | blue |
| `!word` | bigger red Impact, glow | `$word` | amber |
| `~word` | red heavy italic | `%word` | big outline only |

**Labels** — `VOX.label(id, html, { at: [x, y], cls, o, scale, rot, align })`, called on every frame it shows (it hides
itself otherwise). Classes: `tag`, `tagt`, `name`, `num`, `chip` (+ `t` teal, `r` red, `on`, `big`), `stamp` (+ `sm`),
`mark`, `q`, `term` (+ `cmt` a comment box), `scrim` (the dark patch behind words). Pin one to a 3D thing:
`at: VOX.px(w.doc.at('c'), 0, 205)`.

**Moves** — `VOX.wipe(t, { seed, dur })` (also logs the whoosh), `VOX.pop / fade / pulse(t, t0)`, `VOX.hover(t, t0, hold)`,
`VOX.wt(beat, wordOrIndex, nth)` = that word's start time, `VOX.setBackdrop(opacity, color)` a flat colour scene.

**Things** — `VOX.boxes([[cx, y0, cz, w, h, d, color], …], { glow })` one merged voxel mesh; `VOX.jit` colour jitter;
`VOX.glow(color, size)`; `VOX.screen(w, h, pw, ph).paint((g, W, H) => …)` a canvas screen; `VOX.pic(id, h)` a picture
plane and `VOX.drawPic(g, id, x, y, w, h, r)` on a canvas; `VOX.clip(id, h, { n, w, h })` a card that plays a recording
(`.play(seconds)`); `VOX.meme(id, file, t, t0, { at, w, rot, dur })`; `VOX.icon / tile / slab` for 4 x 3 sprite sheets
of animated icons (reel 33).

**3D drawing** — `ANAT.stack({ pieces: [{ id, ring, th, tone, outline, lines }], az, el, U, cx, cy, e, alpha, grid, hot, bump, labels })`.
`ring` = `ANAT.rect(w, h, r, cx, cy)` / `ANAT.rounded(points, radii)` / `ANAT.circle(r)`; `tone` = `ANAT.tone('#5393FF')`,
`ANAT.tone(c, 'light')`, `ANAT.white`, `ANAT.ink`; `az 90, el 0` is flat from the front, `az 56, el 18` three-quarter;
`e` pulls the pieces apart; `outline` 0..1 draws a fat outline on. It is an SVG with its own camera: hold the board's
camera still under it (`hand: 0`) and fade the GL grid out as it tilts. A special shape (reel 33's folder that opens on
a hinge, a colour block that splits into three tones) is a copy of `examples/reel33/film/anat.js`.

**World and cast** — `w.screen` (the monitor, 800 x 1200 px), `w.clawd` (states `happy, hop, armL, armR, squash, pen, tilt`),
`w.pimp` the host (`talk, look, nod, armL, armR, fwdL, fwdR, hop, lean`), `w.doc` / `w.docB` a voxel file, `w.grid`,
`w.heroGlow`, `w.lamp / rim / scrLight`. Stations `S`, `M` (the screen's centre), `B`. `window.PLACES = [[t, 'S'], …]`
says which room is on. Camera keys are paper3d's: `K.cam.key(t, { st, l, d, az, el, fov, ap, hand, ease, dive })`.

**Sound events** — `K.event(t, kind, note, dur)` in the shots; `sound/mix.py` gives each kind a real sound: `whip`
(whooshes, rotated), `dive`, `tick` (clicks, pitch varied), `pop`, `hit`, `boom`, `snap`, `card`, `enter`, `click`,
`riser`, `type`. `reveal` and anything else is silent. One event by its note: the `NOTE` table in `mix.py`.

## The files

| file | what |
|---|---|
| `scripts/new_reel.sh` | paper3d's starter + this template (once), the 3D kit bundle, Geist + Impact |
| `template/film/vox.js`, `comp.html` | the look engine and the dark page (word, label, meme, wipe styles) |
| `template/film/anat.js`, `kit3d/` | the 3D drawing (`ANAT.stack`) on the anatomy kit (MIT, © 2026 Ryan; `kit3d/LICENSE`); `scripts/build_anatomy.py` bundles it |
| `template/film/world.js`, `assets/chars.js` | studio, board, the host and the Claude block |
| `template/film/shots/` | `00_base` (reset), `10_demo` (every piece once), `99_post` (words, labels, wipe) |
| `template/film/thumb.js` | the thumbnail scene (`comp.html?thumb=1`) |
| `template/vo/`, `cut/build_voice.py` | Dr.pimp lines through VoiceStudio; the raw voice cut + word times |
| `template/tools/` | `memes.py`, `webshots.py`, `clip.sh` (a recording → frames) |
| `template/sound/mix.py` | voice + low music cut to the words + one-level effects, with a level report |
| `examples/reel33/` | the whole film's code, script, description, credits, its mixer and icon tools |
| `references/lessons.md` | what went wrong on reel 33 and what he said about each version |

From paper3d, in every project: `kit.js`, `tools/vstills.py`, `still.py`, `dbg.py`, `events.py`, `render_gpu.py`,
`assemble.sh`, `partial_rerender.sh`, `transcribe.py`. Media never goes in git: fonts, memes, screenshots, recordings,
voice and music stay in `downloads/`. Built on onetake's motion library (PolyForm Noncommercial): personal reels only.

## Worked example: reel 33 (`examples/reel33/`)

"Now your Claude can design icons" (Kubai Icons, 85.2 s, script in the `insta_zoom_pw_story` shape because he asked for
it). Studio: an app with no icons fills with real ones as the prompt types → the host, the skill file drops, a real
GitHub card → pixel wipe to a wall of every icon, a counter to 2,800 → dive into the folder → the board: two icons that
do not match, the question, then the folder as a 3D drawing: three pieces come apart and get named, the fat outline
draws on, one colour block splits into light, dark and shadow and repaints it, it opens on its hinge → "A skill." on
the music's second drop → folder and lock side by side → the studio: a terminal on the monitor, the check sheet →
the catch with the host → the wall again, READY TO USE, the URL, a comment box typing SKILL. Eight silent memes.
`examples/reel33/README.md` says how to run it.
