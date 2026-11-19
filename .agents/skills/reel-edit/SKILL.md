---
name: reel-edit
description: Edit Ali's Instagram reels in his house style from his phone takes, the way the VoiceStudio reels 3 and 4 were made. The takes are cut tight (no gap over 0.5 s), and the hook is always on camera. The picture always zooms subtly, and every take change is hidden behind a whip, punch-in, full-frame tool panel or hand zoom-through. Captions are serif with the spoken word lit, STOP/START cards sit above the head, and demo voices are made in the tool itself. The music is cut to the words and dead silent before a drop; real SFX all sit at one level; the master is -14 LUFS. Also covers the Instagram description. Use when the user gives a folder of takes and asks for a reel or video edit, says "same style as last time / reel 3 / reel 4 / reel 5", wants a talking-head tool explainer with demos, a cartoon or panels, or a "format 3" levels reel (a demo card above the head that gets better level by level, TikTok title and captions).
---

# Reel edit (Ali's style)

This is the style of Ali's Instagram tech channel: tools explained "like to a 5-year-old". It is vertical, fast and on camera, with the tool shown through real screenshots and real demos. Two reels were made this way and both are kept here as working projects:

- **`template/`**: reel 4, "Stop making robotic AI voiceovers" (59.8 s). Talking head, STOP/START format, full-frame tool panels and demo voices made in VoiceStudio. **Start every new reel from it.**
- **`examples/reel3-cartoon/`**: reel 3, "ElevenLabs is never going to sponsor me…" (53.4 s). The same pieces plus a cartoon old man who speaks five languages. Ali and the cartoon swap by zooming through a hand. Use it when a reel needs an animated character.
- **`examples/reel5-levels/`**: reel 5, "How human can a FREE AI voice get?" (37.2 s), format 3. One take, a TikTok-style title that never leaves, a small demo card **above Ali's head** that gets better level by level (so people stay to see how far it goes), and plain TikTok captions. Use it when the user asks for "format 3", "levels", or a demo that improves step by step. See "Format 3" below.
- `examples/*/description.txt` are the Instagram descriptions; `examples/reel4-stop-start/script.md` is the script format (SAY and DO kept apart).

## Format 3: levels (reel 5)

- **Script:** copy only the reference's mechanics, never its script, topic, line pattern or series name. Ali gives an instruction ("Now make it nervous."), the demo plays, Ali reacts on camera.
- **Picture under a demo** is Ali's real reaction from the take. In `cut/edl.py` a demo row says `("lead",)` (the footage runs straight into his next line, no cut) or `("at", T)` (a chosen moment, like the facepalm). Each demo row starts with a cut, hidden by a whip or punch-in.
- **Layout (Ali's face sits low in his frame):** title boxes at y 150, the card at y 372–718 above his head, captions at y 1490. The card leaves when he leans in at the end.
- **The card** shows exactly what was typed. This level's change (dots, direction, tag) is marked yellow; spoken words go from grey to black on Whisper's word times. It also has `LEVEL n/6` with six dots and a setting chip, plus a waveform drawn from the real voice's loudness. Each level types in on Ali's instruction word.
- **Captions:** Inter 800, 82 px, white with a 14 px black outline, the spoken word yellow, ≤3 words. The AI's words are read from the card, not from captions.
- **Voices get better level by level:** level 1 can be a classic computer voice (`say -v Fred`, labelled "Old computer voice", never as the tool). Then come the default engine with punctuation, VoxCPM2 directions, the `[laughter]` tag, and Ali's clone. The clone does not whisper, whatever the direction says; it reads calmly. Check every take with Whisper, and with `earshot rank` for "nervous", "offended" and "laughing".
- **Music:** the beat hits on the hook and goes dead silent under the robot. It slams back on Ali's reply and grows level by level (a gain ramp in `PIECES`). It is silent with a heartbeat under the clone, then comes back in on the last line.

## The style: rules every reel follows

**Format and pace**
- Vertical 1080×1920, 30 fps, 40–60 s.
- Use the best take of every line, cut on word edges.
- No speech gap over 0.5 s anywhere. A demo voice gets a 0.14 s breath on each side, and the only hold is about 0.55 s after the last word.

**Hook and transitions**
- The hook is always Ali on camera with a strong statement that stops the scroll. A card sits above his head from frame 1.
- Animation enters and leaves through a move, never a plain cut.
- Every take change is hidden by one of these:
  - a full-frame panel sliding over it;
  - a **whip**: x ±210 px with scale 1.42, 0.11 s in and 0.24 s out;
  - a **punch-in**: scale 1.3, 0.1 s in and 0.38 s out with expo.out;
  - a **zoom-through** from one hand into a matching hand (reel 3).

**Camera motion**
- The picture always moves: a slow zoom 1.00↔1.045 that turns at each take, origin 540,900, a little further on the punchline.
- Captions and cards stay still. The zoom never goes below 1.0.

**Captions**
- EB Garamond 700, 66 px, white, in a dark rounded box at y 1480.
- At most 4 words per chunk, or a chunk ends at punctuation.
- The spoken word lights yellow `#ffd54a`.
- Each chunk holds until the next one starts, but no longer than +0.35 s. It ends when a panel arrives (no text under a panel).

**Cards above the head**
- League Gothic, 104 px, rows at y 196 and 330.
- Colours: red = STOP ✕, green = START ✓, yellow = the key point, white = info.
- They pop in with back.out, breathe, then pop out. Emoji cards land on single words ("😴 TIRED").

**Panels**
- Full frame. They slide up from below (0.3 s, expo.out, 2.5° tilt) and leave upward.
- A League Gothic 132 px label with one yellow word, a real screenshot or a rebuilt card, and a grey sub-line.
- Show pictures of the tool and sell "Claude does it" (an "I just told Claude:" prompt card). Never a click-by-click UI tutorial.

**Demos**
- Every demo is made in the tool itself.
- A before/after must be honest: both sides come from the same app (reel 4's "robotic" take is VoiceStudio's own default engine, rushed).

**Ending**
- The last line points to the description. Never "comment X for the link".
- A freeze-frame with a slow push (1.0→1.1) and a boom loops well.
- If Ali didn't record the closing line, his VoiceStudio clone says it, labelled on screen ("🤖 THIS LINE = MY AI CLONE").

**Music**
- Full power between lines. Ducked 11 dB under speech, plus a 9 dB duck in the 0.8–4 kHz band, with 60 ms lookahead and 0.45 s release.
- Dead silence under a demo or right before a drop.
- The song is cut into pieces so its hits land on words ("One", "Step two", the punchline). It ends on a hit.
- Ali's songs are in `/Users/topg/Desktop/MY VIDEO EDITING STUFF/Ali_BG_MUSIC/`. Reel 3 used Loser (Tame Impala instrumental); reel 4 used `main_loud_hanZimmer.mp3`.
- A voice-only showcase (the reel 3 cartoon on its own) went better with no music.

**Sound effects**
- Real recordings only, from `sfx-cloud` (`~/Music/SFX/cloud/sounds/`). The earshot bank is synthesized, so don't use it here.
- Every effect sits at one level: 4 dB under the voice, measured the way a phone plays it. Risers −7 dB, textures −8 dB.
- One effect for every visual event. Rotate the transition sounds.
- Ali's own sounds are in `ali-own/`: the submority boom goes on hooks and big words, the soundreality boom on the freeze-frame.

**Voice and master**
- Every piece is levelled to the same loudness, then: high-pass at 85 Hz, de-esser, gentle 3:1 compression.
- Master −14 LUFS, limiter −2.2 dBFS, true peak under −1.5 dBTP.

**Delivery**
- The finished files go in the Mac's own Downloads folder (`/Users/topg/Downloads`): `reelN_<topic>.mp4` and `reelN_description.txt`.
- Then run `open -R` on the video so it shows in Finder.

## Tools

| Job | Tool |
|---|---|
| Picture (HTML → MP4) | HyperFrames 0.9.19 (`hyperframes` skill) with GSAP 3.15. Fonts that load by name: EB Garamond, Inter, League Gothic, JetBrains Mono. |
| Demo voices, Ali's clone, a cartoon voice | VoiceStudio at `localhost:3900` (`voicestudio` skill). Ali's clone profile is `903af710`; the Old Man (multilingual) is `1f0f102c`. |
| Transcripts with word times | VoiceStudio's Whisper: `/v1/audio/transcriptions`, `verbose_json`, `timestamp_granularities[]=word` |
| Sound effects | `sfx-cloud search WORDS` (prints a path per hit) |
| Listening checks | `earshot`: `rank` to pick a take or sound, `timeline` for a mix review (sync, silences, clipping) |
| iPhone HLG → SDR | `avconvert -p Preset1920x1080`, then ffmpeg at 30 fps, crf 15 (done by `new_reel.sh`) |
| Mix | `sound/mix.py` (numpy, scipy, soundfile, pyloudnorm through `uv run`) |
| Title behind the speaker (optional) | `text-behind` skill |

Rules for the models:
- One big model at a time: VoiceStudio generations and transcriptions run one after another, never in parallel.
- Ask before running any new heavy model.

## How to make a reel

1. **Script first.** Write it in the `examples/reel4-stop-start/script.md` form: takes, each with **SAY** and **DO** kept separate.
   - The hook opens on Ali. Every tip must be a real feature of the tool.
   - Wait for the user's takes.
2. **Make the project.**
   ```bash
   ~/.claude/skills/reel-edit/scripts/new_reel.sh reelN /path/to/takes
   ```
   This makes `downloads/reelN/full/` from the template. Inside it:
   - `sdr/*.mp4`: footage
   - `audio/*.wav`: sound
   - `cut/<take>.json`: transcripts, printed with times
   - `hf/`: the HyperFrames project, with the footage linked in
3. **Cut.** In `cut/edl.py`, write `SEQ` from the transcripts. Each row is: kind (`A` = Ali's take, `D` = demo voice), id, source, in, out, and the words.
   - Cut on word edges with a little air; `check_pieces.sh` (step 5) proves each cut.
   - Skip broken retakes.
   - When a word ends near an out point, check the loudness around it (an ASCII envelope of `audio/<take>.wav`).
4. **Demo voices.** Write them in `demo/gen.sh`, one generation at a time.
   - Pass text with `--form-string` (a value starting with `(` breaks `-F`).
   - VoxCPM2 takes a direction in parentheses at the start: `(epic movie trailer voice, low and gravelly, slow)`.
   - OmniVoice only knows `[laughter]` and `[sigh]`. Any other tag gets read out loud.
5. **Run the cut and check every piece.**
   ```bash
   uv run -q --with numpy --with soundfile --with scipy python cut/edl.py
   ```
   ```bash
   ~/.claude/skills/reel-edit/scripts/check_pieces.sh
   ```
   `check_pieces.sh` prints what Whisper heard next to what each piece should say, and saves the word times that the captions use. Fix the EDL until every line says `ok`.
6. **Picture.** In `build_reel.py`, set:
   - `CAPTXT`: caption text, spelled right
   - `PANELS`: each one starts 0.12 s before a take ends and leaves 0.06 s after the next starts
   - `CHIPS`: the cards
   - `WHIPS` / `PUNCHES` for every take change no panel covers
   - the freeze-frame

   Put new panel looks in `reel.template.html` (its CSS has: plain generator, trailer letterbox, list rows, screenshot card, terminal/script card, speech bubble). Then:
   - Put screenshots in `hf/assets/shots/`.
   - Grab the freeze frame: `ffmpeg -ss <last word end> -i sdr/<take>.mp4 -frames:v 1 hf/assets/freeze_end.png`.
   - Run `python3 build_reel.py`.
7. **Sound.**
   - Convert the song: `ffmpeg -i SONG.mp3 -ar 48000 sound/music.wav`.
   - Find its hits and drops with `earshot timeline`.
   - Set `PIECES` in `sound/mix.py` so the hits land on words, and silence before the drops.
   - Pick the effects (`sfx-cloud search`), then run:
   ```bash
   uv run -q --with numpy --with soundfile --with scipy --with pyloudnorm python sound/mix.py
   ```
8. **Look, then render.** In `hf/`:
   - Run `npx hyperframes check --json` and fix every error.
   - Snapshot about 30 moments (`npx hyperframes snapshot --at 0,2,4,...`), put them on a contact sheet and look.
   - Run `npx hyperframes render --output ../reelN_v1.mp4`.
9. **Verify.**
   ```bash
   uv run -q --with numpy --with pillow --with soundfile python ~/.claude/skills/reel-edit/scripts/verify.py reelN_v1.mp4 --transcribe
   ```
   It checks:
   - format and length;
   - LUFS and true peak of the MP4;
   - no speech gap ≥ 0.5 s;
   - mix silences;
   - every take in sync within 1 frame;
   - that Whisper hears every word.

   Then run `earshot timeline` on `sound/mix.wav`, and check that the cards and captions survive each slow zoom (see Gotchas).
10. **Deliver.** Copy the video and the description to `/Users/topg/Downloads`. Tell the user what was checked and what they haven't seen yet.

## The Instagram description

The description follows `examples/*/description.txt`, and the whole thing stays under 2,200 characters. In order:

1. **First line:** the hook, the same STOP/START line as the video. Instagram cuts the caption at about 125 characters.
2. **What it is:** "made in X, free, open source, runs on YOUR laptop".
3. **The tips**, numbered 1️⃣ 2️⃣ 3️⃣, plus the bonus.
4. **The link:** `🔗 github.com/...`, followed by "(Links in captions aren't clickable, so copy it into your browser.)"
5. **Setup:**
   - The easiest way first: "open Claude Code and paste: …", with the tool's agent install prompt.
   - Then the manual installs per OS.
6. **Good to know:**
   - the licence of the app and of each model;
   - only clone voices you have permission to use;
   - "the last line is my AI clone", when it is;
   - not sponsored, and who built it.
7. **A save line**, then 7 hashtags.

## Gotchas (each one cost a render)

**Rendering**
- **Motion blur hides overlays.** With `data-motion-blur="on"`, anything that scales is drawn by HyperFrames' "capture" path. On a slow, long zoom (the 3.4 s freeze-frame push), that capture covered every card and caption for about 1.3 s. Put `data-motion-blur="off"` on that element. Whips and punch-ins are fine.

**HyperFrames lint**
- It refuses `querySelector` with a template literal: use ids and string concatenation.
- It refuses tweens of `letterSpacing`.
- It flags text that a panel covers (`text_occluded`): end the caption when the panel arrives.
- Cinzel doesn't resolve as a font; use EB Garamond.
- Keep big titles inside the frame: "EVERYTHING." overflowed until its font size and starting scale were cut.

**Transcripts**
- On reel 3's takes, Whisper's word times ran about 0.3 s early (its first-word starts most of all), so those captions were timed from the loudness bursts. In reel 4, each cut piece was transcribed on its own and the times were fine. Check captions in a snapshot either way.
- A take that ends mid-word ("and start m-") gets transcribed as if it were whole. Listen to the end of each piece.

**Sound**
- A boom right after a word masks it: "acting" vanished under the freeze boom. Leave about 0.25 s after the last word.
- A word under loud music needs the lookahead duck plus the mid-band duck. Prove it with Whisper on the mix, not on the voice stem.
- Find the layer that garbles a word by transcribing the stems apart (voice, voice + sfx, voice + music). In reel 5 three things turned "free AI tool" into "VEI 2":
  - the keyboard-typing sound under the hook (no typing or other clicky texture under speech);
  - reel 4's de-esser at `ratio + 12, max 8 dB` (reel 5 uses `+6, max 4`);
  - the beat's opening vocal hit above -7 dB vs the voice.
- `verify.py` measures sync with the zoom centred on 540,900. A reel zoomed about another point (reel 5: 540,1000) can fail a shot with a big push. Re-measure it with the real origin and scale before believing the flag.
- **Voice: leave Ali's recording raw.** Reel 13: v1 (ffmpeg high-pass + de-esser + 3:1) was "muddy"; v2 (reel 11's studio chain) lifted the room tail and, with rubberband's speed-up, added echo (100 → 132 ms ring after each word). He judged six A/B samples and chose his raw take. So: no EQ, compression or dereverb; speed-up with ffmpeg `atempo` (`STRETCH=atempo`, less smear than rubberband R3), one plain gain per line. If the voice needs work, send A/B samples of the same lines (raw first) before rebuilding the reel. Effects levelled phone-weighted can still sit within 1-3 dB of the voice in 1 s windows: measure stems per second; his approved reel 13 levels are music bed -22 LUFS, duck 11 dB, effects 16 dB under the voice.
- In a split layout (Ali in a framed box, reels 11 and 13) `verify.py`'s sync check fails every take (ncc near 0) because it looks for a full-frame face. Measure sync instead by cross-correlating frame-to-frame motion in his box of the render against his picture track (reel 13: best at 0 frames, `downloads/reel13/full`). Pre-rendering his picture on the reel clock (`cut/ali_track.py`: each piece at 1.10×, run on through its gap, crop centred on Apple Vision face boxes) makes the whole reel one `<video>` and keeps sync exact.

**Footage**
- iPhone footage is HLG; without the avconvert step it looks washed out on phones.

**Cartoon (reel 3)**
- The hand gestures are written against the cartoon's own line timing (`REF`). `rt()` in `talk.template.html` maps them onto any new timing. Inside a gap, a time stays anchored to the nearer line edge.
- A pose that has to be up at a zoom-through hand-off must be keyed just before the next line starts.

## Reel 3 extras: the cartoon and the hand zoom-throughs

How `examples/reel3-cartoon/` fits together:

**`character/`: the cartoon on its own**
- `audio/gen_lines.sh` makes the voice lines.
- `build_voice.py` joins them into one track, each line at −16 LUFS, and writes `timing.json`.
- `mouth.py` turns the voice into mouth shapes (`mouth.json`: open, wide and round per frame).
- `build_talk.py` fills `talk.template.html`: an SVG old man with hands (POSE / PLACE / KEYS / WAVES / SHRUG), a big word behind him, a "now speaking" pill and a camera zoom.

**`full/`: the reel**
- `cut/edl.py` places Ali's takes and the cartoon lines on one clock.
- `build_toon.py` builds the cartoon scene for that clock.
- `build_reel.py` adds four transitions, T1–T4. Each one pushes into one hand (scale 6–7, power3.in) and pulls out of the matching hand (expo.out).
- `cut/hands.json` holds the hand positions, measured from the frames by skin-colour centroids.

Hands should match in what they do: palm to palm, finger to finger, wave to wave, thumbs-up to face.

## Licences

- VoiceStudio's default OmniVoice engine is CC-BY-NC: personal use only. VoxCPM2 is Apache-2.0.
- Clone only voices you're allowed to use (Ali's own voice).
- The songs are commercial music: Instagram may recognise them.
- The Sonniss recordings in sfx-cloud: media production only, never redistribute the files.
