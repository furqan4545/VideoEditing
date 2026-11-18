# What reels 16 and 17 taught

## Reel 16 (loading bar, 13 Nov 2026), approved as v2
- Draft 1 captions sat on a white pill and "flickered" (two causes: the pill changing width every line, and editing the
  comp while render.py ran, so neighbouring frames came from two versions). Captions are the reel 13 style now; never
  edit `film/` during a render.
- v2 had about 0.15 s between all pieces: "every sentence is super stack upon each other ... breathing room adds depth
  and focus". Now 0.2 s after every sentence (`cut/pauses.py`).

## Reel 17 (Instagram likes, 13 Nov 2026)
- Four scene designers in parallel produced rich scenes (phone, class, wall, network), but three finished 25-40 minutes
  before anyone looked and one kept polishing for 70 minutes; Ali asked "what is happening" twice. Build scenes yourself
  or with 2-3 helpers, check their files every ~10 minutes, take each part as it lands, stop overruns.
- The pauses were added after the scenes were designed. The fix is built in: author everything on the tight clock;
  `startFilm` maps the playing clock to it (identity inside words, a short slow-down across each pause), Ali's footage
  follows the playing clock, captions are built from VO2, sound moments are mapped with `newT()`.
- Rules saved by another session in the middle of the edit (pauses, captions, music level) were missed until he
  reminded me: re-read the memory index before the cut and before the render.
- Captions over a moving dark card went grey when the band was half card, half paper: frame the camera so the card's
  edge is not in the caption band, and let `capDarkness()` read the real frame.
- A floor tape with black/white stripes ran through the caption band in close-ups; quiet such things down once their beat is over.
- The scenes proposed 91 sound moments; the film used 45 picked by hand. A typing sound on the comment keyword masked
  the word "pen"; never put an effect on the keyword.
- First mix had the music 8 LU under the voice; his rule is at least 15 (the section after the reveal needed the bed
  1.2 dB lower again).
- Sending the frames already rendered as a preview (17 s, then 61 s) answered "where is the video?" during the render.
- Thumbnail: the film's phone with the post (Instagram-style UI) under the question, one red italic key word, inside
  the 3:4 grid crop; no photo of Ali.

## Reel 25 (how Shazam works, 14 Nov 2026)
- In a long take with many stops and starts, the small Whisper's word times drifted by several seconds between tries. Transcribing each loudness-envelope stretch on its own with the bigger model (`cut/runs_words.py` in `downloads/reel25/full`) gave exact words for every in/out edge in about 3 minutes; a whole-take pass with the big model took over 18 minutes and was stopped.
- Things several scenes draw (a fingerprint generator, the evidence card, index cards, code slips, a cabinet, a tally) went into one `film/shared.js` before the helpers started; three helpers then built their scenes in parallel in about 30 minutes.
- The scene-change scan caught three soft "flashes" a contact sheet missed: a focus veil that switched off for a frame between two close-ups (overlap the fades), a spotlight vignette that vanished in the middle of a whip (fade it before the whip), and a whip that was too short for its distance. Fixed by deleting those frames from `film/_frames` and running `render.py --resume --keep-frames` (88 s instead of a full 17-minute render).
- Keep every top-level name prefixed, even short easing aliases: an unprefixed `const X_` in one scene would stop another scene's whole file from loading.

## Reel 22 (photo compression, 14 Nov 2026)
- Captions on dark pictures stayed BLACK in every earlier film: any image loaded from `file://` (Ali's footage frames,
  photos) taints the canvas, so `capDarkness()`'s `getImageData` throws and returns 0. Chromium needs
  `--allow-file-access-from-files` (reel 22's `tools/render_local.py`, `tools/pstills.py`, `tools/thumb.py` pass it;
  onetake's own `render.py` does not yet). Test: `g.getImageData(0,0,4,4)` in the page must not throw.
- Grey captions (the kit's continuous black→white mix) cannot be read on mid-grey dot fields. Reel 22 decides black or
  white once per caption line (`tools/dark_caps.py` scans every frame, a per-line majority goes into `film/capdark.js`,
  comp.html's `drawCaps` override reads it) and gives white lines a soft dark halo: no grey, no flicker inside a line.
- A real photo split with JPEG's own maths (PIL `convert("YCbCr")`) made every layer honest: `tools/gen_images.py`
  (luma, chroma, block versions, mixes, dot grids of real pixels in `film/imgdata.js`). A red-on-blue card of equal
  lightness has a flat grey light layer: the letters vanish, the clearest picture of why such text blurs.
- Three helpers (dots / chips + squares / layers) finished in 15-20 minutes each (~760k tokens) from one written brief
  (`HELPER_BRIEF.md`) plus a shared.js written first; sending each one notes from its first contact sheet worked.

## Reel 21 (where did my Story go, 14 Nov 2026)
- Captions never turned white: Chromium taints the canvas as soon as it draws a `file://` image (Ali's frames, a printed
  web page), so `capDarkness()`'s `getImageData` throws and returns 0 in pstills AND in render.py. Override it in
  comp.html by time for the film's dark stretches (reel 21: `capDarkness = () => …` around the push into the phone),
  and keep the caption band on plain paper everywhere else.
- A story world that needs a wall, a guard, a ladder or a bed reads best in ELEVATION (front view, a paper diorama:
  ground line, wall, full-body people in profile / front / back), not top-down. `downloads/reel21/full/film/shared.js`
  has `PF_person` (walk cycle, two-bone arm IK, items in hand), polaroids with a handwritten corner time, a street
  clock, a ringing alarm clock, a drawer cabinet and a key.
- Two helpers on ONE shared place worked when story.js owned the set (wall, photos, clock) and the photo state went
  through `PHOTO_FX` effects with time windows, with two hand-off times: people + camera at one word, the photo state
  later while the camera looks away (`HANDOFF`, `A_.tSwap`). Shared hand-off drawings (`HO_bedScene`, `HO_parked`)
  kept the switch frame identical; one mismatch (photos in the bin) was caught by a dense still sheet.
- Helpers took ~20 minutes to save anything (reading first); nudging them to save early is worth it.
- A cover swap into bare paper is invisible if the destination point has the same offset to the dot grid (60) and
  the grain (16) as the dive point: pick it mod 240.

## Reel 18 (upload before you tap, 15 Nov 2026)
- He said every line once with stops, and one line had a stumble in the middle ("But your in… your internet is not that
  fast"). `cut/build.py` now takes a list of parts for one piece (`("H2", [(30.55, 30.81), (32.04, 33.65)], text)`): each
  part is sped on its own and joined, the frames are joined the same way, and `timing.json` records the splice time so
  comp.html hides it with a punch-in (two `aliShow` entries with different crops on either side of the splice).
- Find the exact word edges on 10 ms loudness (a `t` closure shows as a 50 ms dip) and transcribe short clips alone with
  the turbo model; Whisper on a long clip merges a false start into the next try ("your burg… your burger").
- Word times for captions: `cut/piece_words_turbo.py` re-times every cut piece with the turbo model (the small model
  dropped the first word of a piece and put "But" after "you're").
- A picture that must match pixel for pixel in two places (the post's photo → the same photo on a menu) is drawn ONCE
  into an offscreen canvas (`SH_BURGER`) and blitted everywhere: no file:// image, so the canvas stays untainted, and the
  cover swap is invisible. Fade the phone's glass gloss to 0 before the swap.
- A camera that dives into something above Ali's hook card drags his card through the caption band. Hold the framing
  until the last key word, then slide his card down out of frame (a getter `y` on the card) as the dive starts.
- Captions per line, black or white, from `tools/capdark.py` (6 samples per line, majority) into `film/capdark.js`, read
  by comp.html's `drawCaps` override; no continuous grey.

## Reel 19 (Wi-Fi drops to one bar, 15 Nov 2026)
- His take was a VERTICAL iPhone selfie (1080x1920 HEVC HLG 60 fps), not the landscape camera: tone-map with
  `avconvert -p Preset1920x1080` first and point `TAKE` at the SDR file. v1 used reel-18-style wide cards and he was
  furious ("cutting my face into half... the bottom half is full empty, just cover it with my video"). A vertical take
  gets TALL cards that cover the lower frame (hook x 30 y 800 w 1020 h 1500, bleeding off the bottom; turn 1020x1660; close
  y 690 h 1500), crops measured on his frames so his chin sits above screen y ~1420 and the captions land on his shirt
  (white via capdark). Fixed by deleting those frames from `film/_frames` and `render_local.py --resume --keep-frames`.
- Lines asked "as the audience / a friend" were first made in reel 10's off-camera AI voice; he hated it: "remove the
  fuckass ai voice... never ever use this fucking stupid voice again". Use HIS take of every line (he records them all),
  even with a slip (caption the script word and tell him). To swap a line without moving the film, cut his take to the
  SAME frame count as the old piece (pick the out point so `n` matches) and every scene and sound cue stays put.
- When the hook dives into a picture above his card, do it in ONE move: the camera rises and zooms into the picture and
  carries his card out of the frame bottom (motion blur), not a card slide followed by a dive.
- Cover swap: put the dive's last key and the next place's first key at EXACTLY the same time (camAt jumps with no
  in-between). Keys 0.0005 s apart left an in-between camera that showed blank paper, and motion blur samples it.
  `tools/swapcheck.py A B` compares two frames (mean abs diff 0.29 = invisible).
- A degraded picture must look degraded at every print size: block / blur size scales with the drawn width
  (`SH_qn` in reel 19's shared.js), capped so the phone's reel and the TV's picture use the same pixels at the swap.
- A top-down map with the caption band on the action (sofa, truck, scooter): shift the camera's `fy` per stretch in
  comp.html (`WD_FY`) instead of asking the helper again. A caption line that runs into a push to black fades to white
  with the picture (`blk` in drawCaps), not with a per-line switch.
- Two helpers in one workflow finished in 14 minutes (~450k tokens) with a brief that fixed the join points.

## Reel 24 (why IG shows you reels you'll like less, 15 Nov 2026)
- Ali's new card ask for a vertical selfie take: a framed card in the BOTTOM HALF with padding on every side and a drop shadow
  ("a beautiful frame"), not a card bleeding off the frame. Done as an `aliCard` override in comp.html: a white 16 px mat,
  deep soft shadow + contact shadow, the video with its own rounded corners; card x 70 y 860 940x1000, crop sx 0 sy 625 sw 1080
  (his chin ~1165 in the take lands at screen ~1390, so the captions sit on his shirt). The content lives in the top half.
- A word can hide AFTER a silence: "your thing" had a 0.1 s closure before "-ing", the loudness envelope looked finished,
  and the cut clipped it (Whisper on the mix heard "yours"). `cut/span_words.py A-B ...` (turbo word times inside spans of
  the take) + `cut/env.py A-B` (10 ms loudness) found it; transcribe the span with the out point at +0.1 / +0.3 s to confirm.
- Whisper the FINAL MIX: it caught both the clipped word and a trailing "after it" 4-10 dB under the rest. Giving the
  trailing words their own piece (= their own line gain, capped +5 dB) fixed it without compressing his voice.
- Two 1-ms mouth clicks made the master limiter duck 6 dB; `sound/mix.py` now shaves only spikes over the 99.98th
  percentile + 2 dB (57 samples), no EQ / compression.
- A cover swap into a stage: the reel picture draws the stage smaller than the screen (1.7 x the screen width, centred at
  40 %), and the swap frame is a window INSIDE the stage (0.9 x its height), the same local window in both places.
- Keep his card in place through a dive into something above it: sliding it away early leaves the caption band on bare paper.
- The project sits in an iCloud-synced Desktop: iCloud left "00284 2.png" copies in `film/_frames` after a `--resume`
  re-render. Delete `* 2.png` before encoding or looping over frame numbers.
- Two helpers (hall in elevation with full-body kids walking out; the browser + DevTools proof with the real capture) took
  ~13 min each, ~450k tokens together; the hall helper saved nothing until a nudge at ~15 min.

## Reel 27 (iPhone keyboard explained, 16 Nov 2026)
- The opening title must look like Instagram / TikTok's own caption: ONE merged white shape, lines packed at ~1.18 x the font
  (56 px SF 800, pitch 66, pad 11, radius 12) with rounded INNER corners where a shorter line meets a longer one. Two separate
  87 px boxes with a seam "doesn't look like original TikTok or IG caption at all". Copy `TITLE_draw` from
  `downloads/reel27/full/film/comp.html`; Apple emoji (📱) render in the canvas.
- `g` is a `const` in kit.js, so a shared drawing that must go through a mask (a hand that fades out) takes a context
  parameter and draws on a full-frame scratch canvas (`SH_thumbDraw(c, ...)` + `destination-in` gradient, reel 27 shared.js).
  Drawing it N times clipped into slabs showed bands and cost 15-20 ms a frame.
- A drawn phone in a mid shot put its bottom bezel right in the caption band: comp.html lifted the phone per camera key
  (`PH_FY`: fy so the phone's bottom edge lands at screen y ~1335) instead of asking the helper again.
- Whisper on the FINAL MIX caught a clipped last word ("320 pixels wide": the out point was 0.35 s early) and a whoosh masking
  "Then" at the start of a line. Fix the cut, rebuild timing (only later pieces shift), re-render from that piece on.
- Three helpers (keys + history, phone, glass) finished in 10-16 minutes each (~690k tokens) from one brief with fixed joins
  (cover swap on the W / E line via `SWAP_G`, both keyboards drawn by the same `KB_keyboard`).
- Render speed (19 Nov 2026): onetake's renderer spent most of its time on a PNG screenshot per shutter sample (~240 ms,
  against ~65 ms to draw the sample). `tools/render_fast.py` reads the canvas with getImageData (~1.5 ms) and averages in
  the page with render.py's own arithmetic: reel 17's 8-16 s took 38 s instead of 110 s on 6 workers, and all 240 frames
  were identical to the old renderer's (same per-frame md5). The full film took 2 min 57 s on 10 browsers (old: 16.5 min).
