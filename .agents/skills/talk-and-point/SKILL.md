---
name: talk-and-point
description: Ali's "talk and point" reel style, the reel 31 look he called "awesome editing style" (17 Nov 2026). His vertical talking take plays FULL FRAME, then a whole animation scene on white paper, then back to him, every change a motion-blurred whip. His fingertip is tracked (Apple Vision hand pose), so the button, card or chip he talks about appears where he points and flips or presses when he taps. Always-on subtle zoom plus sudden punch-ins on key words. Real posts pile up BEHIND his head (person matte). A grey BEFORE snaps to colour on "Now" with a music silence and a dive into his face. The tool's real UI is rebuilt on paper. Reel 13 captions, IG opening title. Built on html-canvas-animation and rendered by onetake with motion blur. Use when Ali asks for "like reel 31", "talk and point", "animation and back to me", "track my finger / show stuff where I point", "feel like I'm touching the button", a talking-head tool or use-case reel with animation scenes between his lines, or the OpenMausBot-series look.
---

# talk-and-point: his face ↔ animation, UI where he points

Ali's ask that made this style (17 Nov 2026): *"use animation and also plot stuff wherever i point, on screen, so it should
feel like i am touching button or objects ... back to animation and back to me ... make sure my video has subtle zoom and
sudden zoom and if we can add little bit fun"*. His verdict on reel 31: **"this is awesome editing style, i like it."**

One HTML canvas film (the html-canvas-animation engine: every frame a function of time, one camera over one paper desk,
onetake renders it with real motion blur). His footage is a full-frame **stage** card at the centre of the desk; the
animation places sit around it; the camera whips between them.

## The style, rule by rule

1. **Face → animation → face.** Alternate on purpose: lines where he looks at the lens stay on him; lines where he reads
   or looks down get a whole animation scene. Every change is a whip (`expoInOut` + a landing shake) that starts ~0.3 s
   before a line ends and lands ~0.08 s after the next line starts. No cuts.
2. **His frame.** Full frame, a little tight and set low (`st` in camera.js: zoom `Z0*1.08`, centre y 1035) so his chin
   sits above the captions. Always-on subtle zoom: `st(t, k)` with k 1.00 ↔ 1.045, turning at each beat. **Sudden
   punch-ins** on key words: `face(t, 1.12-1.25, { curve: expoOut, hit: 2-3 })`. Never below `st(…, 1.0)` (no edge).
3. **UI where he points.** `tools/hands` (Apple Vision hand pose) → `cut/fingers.py` → `film/fingers.js`: the highest raised
   index tip above its wrist per frame (the selfie-stick hand stays low). Pins in `scenes/finger.js` glide onto his
   fingertip (`FG_pos`, ±0.2 s average) or sit at a fixed spot; a tap = the thing flips / presses + `SH_tapRing` + a click.
   **Never over his face** (face ≈ x 400-880, y 560-1320 of his take), never in the caption band, inside x 100-980. When
   his finger points at the lens or sits low, use a fixed spot right above it on his chest, beside or above his head.
4. **Things behind him.** On pieces in `CUT_IDS`, `AL_BEHIND` drawings sit between his frame and his Vision matte
   (`tools/cutout.py`): reel 31's hook pile of real angry posts. Keep the top band clear for the 2 s opening title.
5. **BEFORE → AFTER.** A grey stretch (`A_.tGreyIn` → `A_.tNow`) greys his whole stage (and the props of the BEFORE place);
   on "Now" the music goes silent, the camera dives back into his face and the colour snaps on as the song drops.
6. **Real assets.** Real posts / pages as screenshot cards (`SH_post`, usernames blurred), real logos (`SH_icon`), the tool's
   real UI rebuilt from its screenshots as dark cards on white paper. Never invent UI that contradicts the real app.
7. **A little fun, cinematic sound.** A dry visual joke per scene at most (the 🤞 under the question mark, a logo that drops
   and makes its tile shudder, customers hopping over to him). Sound: cinematic whooshes on whips, soft hits on reveals,
   a click on taps, one boom on the "best part" punch-in; all at one level, music ≥15 LU under the voice.
8. Everything from html-canvas-animation still holds: his voice raw at 1.10x, 0.2 s after every sentence, his LAST complete
   try of each line (captions follow what he said), reel 13 captions (black / white per line from `tools/capdark.py`), IG
   opening title (`TITLE_LINES` in story.js), CTA kept as he recorded it, no edits in `film/` while a render runs.

## Start a reel

```bash
.agents/skills/talk-and-point/scripts/new_reel.sh downloads/reelN/full
cd downloads/reelN/full
tools/tonemap.sh /path/IMG_XXXX.MOV                         # HLG → SDR 30 fps (../sdr/take.mov) + audio/take.wav, under the lock
PY=~/.local/share/onetake/.venv/bin/python
tools/heavy.sh "reelN whisper" zsh -c "TAKE=/path/IMG_XXXX.MOV $PY cut/transcribe_take.py 'rare words' > cut/take_transcript.txt && $PY cut/runs_words.py 0 999 > cut/runs_words.txt"
```

Then: pick his last complete try per line → `SEQ` in `cut/build.py` (ids, take in/out, his words) → one lock hold for the
cut, word times, pauses, hand tracking and mattes:

```bash
tools/heavy.sh "reelN cut+hands" zsh -c "$PY cut/build.py && $PY cut/piece_words_turbo.py && $PY cut/build.py --timing && $PY cut/pauses.py \
  && mkdir -p cut/hands && for d in film/footage/*/; do tools/hands \$d > cut/hands/\$(basename \$d).jsonl; done && $PY cut/fingers.py && $PY tools/cutout.py H"
```

`cut/fingers.py` prints, per piece, when and where his finger is raised: plan the pins on those moments.

## The files (on top of html-canvas-animation's)

| file | what |
|---|---|
| `film/story.js` | `STAGE`, `Z0`, `REG` (the places), `A_` moments from his words, `CUT_IDS`, `TITLE_LINES`, caption key words |
| `film/scenes/ali.js` | his stage (`aliCard` override): grey BEFORE, `AL_BEHIND` + his matte, the hook pile (`AL_PILE`), `AL_pt` (take px → world) |
| `film/scenes/finger.js` | `FG_tip`, `FG_pos`, `FG_pin`, `FG_switch`, `FG_PINS` (the pins of this film) |
| `film/scenes/demo.js` | one animation place, the conventions; replace with yours (one file per place, own prefix) |
| `film/shared.js` | `SH_post` (screenshot card), `SH_icon`, `SH_sticky`, `SH_chip`, `SH_tapRing`, `SH_wrap`, `SH_rich`; add the tool's UI here |
| `film/camera.js` | `st` / `face` / `at` keys, the whips, the key-order check, `startFilm` with every piece on the stage |
| `film/overlays.js` | IG opening title (`TITLE_draw`, merged shape) + per-line black/white captions |
| `cut/build.py` | the cut for a vertical take: every piece gets frames (`ON_CAM` = all) |
| `cut/fingers.py`, `tools/hands.swift` | fingertip tracking |
| `tools/cutout.py` | Vision person matte → `film/cutout/<id>/NNNN.png` |
| `tools/heavy.sh`, `tools/tonemap.sh` | the shared heavy-job lock (polls every second), Apple's HLG tone-map |
| `tools/posts.py` | real screenshots + logos → `film/img/`, `film/posts.js` |
| `tools/whisper_mix.py`, `tools/scenescan.sh` | Whisper on the final mix line by line; the biggest frame-to-frame changes |
| `sound/cues.py`, `sound/mix.py` | cues from his word times (`W`, `LAND`); mixer with drops on a later word (`--drop "N1a+0.2:19.84,P2a:46.10" --hush P1`) |

## Order of work

1. Script approved; tone-map; Whisper the take; pick tries; cut + hands + mattes (above).
2. Plan per line: on him (looks at the lens) or a place (looks down / reads); the pins on his raised-finger moments; the
   whips. Write `story.js`, the places, `FG_PINS`, the camera. Stills: `$PY tools/pstills.py look/s.jpg 0.5,1.5,... --cols 9`
   (every ~1.5 s, then dense around whips, pins and punch-ins). Check: no pin on his face, no dark card in the caption band.
3. Sound: `sound/cues.py` → `uv run -q --with numpy --with soundfile --with scipy --with pyloudnorm python sound/mix.py --music sound/music.wav --drop ... --hush ...`.
4. `$PY tools/capdark.py`, then render under the lock (60 s ≈ 20 min at ~1.4 frames/s on 6 workers):
   `tools/heavy.sh "reelN render" $PY tools/render_local.py film/comp.html --out film/draft_v1.mp4 --width 1080 --height 1920 --workers 6 --keep-frames`.
   Send `tools/preview_partial.sh` cuts while it runs. To fix a stretch: delete its PNGs in `film/_frames`, `--resume`.
5. Mux, `tools/scenescan.sh`, a 1 fps sheet, Whisper on the mix (`tools/whisper_mix.py`), earshot `timeline` + `measure`.
6. Deliver `~/Downloads/reelN_<slug>/`: MP4, `description.txt` (under 2,200 characters, only what the video skipped, every
   link open), `thumbnail.jpg` (`film/thumb.html`, `tools/thumb.py`).

## Worked example: reel 31 (`examples/reel31/`)

"Here's how to steal your competitor's angry customers" (OpenMausBot, 59.8 s). Hook: real Reddit / HN posts about Cursor
pile up behind his head under the IG title → grey: a sticky note beside his head, the grey desk (friends' replies, a
3-answer survey, ? + 🤞) → back to him, the posts multiply into a wall around his card → "Now": silence, the dive, colour,
the song's drop → the OpenMausBot tile above his head → "your app vs your competitor" (Cursor's real icon drops) → the
app's chat, the message typed word by word → him: the real "Keep this computer awake" switch flips on his chest above his
pointing finger → "Every Monday" becomes the real schedule card, the run, the top five land, the top one lit → him: Cursor's
icon beside his head, customers hop over to him → a finger taps the link, the real thread opens, ✓ REAL → him: punch-in +
boom on "best part", "+ one more line" above his head → the notes file with a NEW line → BEFORE / AFTER → him, CTA.
Files: `film/scenes/{ali,before,rival,app,notes,finger}.js`, `film/{story,shared,camera,overlays,thumb}`, `cut/build.py`
(his real SEQ), `sound/cues.py`, `description.txt`. Media is not included (footage, screenshots, fonts).
Lessons: `references/lessons.md`.
