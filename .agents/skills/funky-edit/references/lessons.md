# Lessons from reel 33 (the first funky edit)

## What he said, version by version

- **v1 (picture approved, script not).** "ok it looks great", then: the ending made no sense ("Or skip the drawing. All
  2,800 icons work in React, Vue and plain HTML": "wtf this line mean? … use the fucking simple words"), "where is the
  funny part", "we need to use full bro style language while teaching", "add some 3d animations when explaining
  something, like … every icon is built like a folder". He asked for a 10 s demo of the 3D drawing first, then said
  "ok i love it".
- **v2 (bro script, 3D steps, memes).** He wrote the closing line himself and asked for memes: "throw memes downloaded
  from internet whenever you use some funny word. use dog and cat memes".
- **v3 (sound).** "remove all the additional sound effects that you added on meme gifs … previously sound effects were
  enough and make sure they are not fucking too loud, all are super light and on same level". Memes became silent
  pictures and every effect moved from 11 dB to 16 dB under the voice's loudest moment. Then: "ok great, we are done".
- **After it.** "always always show one working example of demo, recorded from my laptop in the video … if it is about
  icon, show before and after". Reel 33 itself has no recording (drawn terminal, drawn check sheet): that is the gap the
  rule closes. Every funky edit after it has the real demo.

## Script and voice

- Say the plain meaning. A list of tech names is never the point of a line.
- Dr.pimp speaks at about 3.2 words a second with these directions; a 264-word script is 85 s.
- Spell hard things out in `text` and keep the screen's spelling in `show`: "Koo-bye" / "Kubai", "A.I." / "AI",
  "twenty-eight hundred" / "2,800", "Opus five point five" / "Opus 5.5". Whisper merges such words ("2800", "5.5",
  "HTML"), so `build_voice.py` lines shown words up with heard words and shares the time where they differ: look at
  those lines on screen.
- The one-word opener got dropped ("Bro." vanished, the next take was garbled). "Bro, Claude can now…" with another
  seed read cleanly; the screen still shows "Bro.".
- A list needs air: `"pauses": { "piece,": 0.26 }` adds a breath after a heard word, cut at the quietest point.
- One line at a time through VoiceStudio. Never beside another heavy model.

## Picture

- Every time comes from a word: `VOX.wt('anchor', 0) - 0.14`. A typed number (a cut at 16.14) broke as soon as the
  voice was re-recorded, in three files.
- Reset every loose thing in `00_base.js`. A card added in one beat and not reset stayed on screen through the next.
- The monitor is upright because the frame is: a landscape screen is tiny in 1080 x 1920.
- The board's grid floor is additive, transparent and out of the depth pass. As an opaque plane it cut the glow sprites
  and hid the colour backdrop.
- The pixel wipe is a CSS grid: shown with `display: grid` (with `block` it is one column).
- The 3D drawing is an SVG over the GL picture. Hand over from a flat GL sprite with the same pixels per unit
  (`PPM = 1920 / (2 * d * tan(fov / 2))`) and keep the board's camera still (`hand: 0`) while the drawing is up.
- Words over a busy picture need the `scrim` label behind them.
- In a still with many glowing things (the thumbnail), draw all the glows first, then the things: one big blue halo
  tinted the icons next to it grey.
- A number on a real screenshot must match the script, or be cropped out.
- Web screenshots came out blank (3.8 KB) from a plain headless launch. `tools/webshots.py` launches with the GPU flags
  and waits 3.5 s after load.

## Memes

- `https://imgflip.com/memesearch?q=…` lists templates; the full picture is `https://i.imgflip.com/<id>.jpg`. A
  27,150-byte file is the site's placeholder, not a meme: `tools/memes.py` skips it.
- The search is loose ("confused cat" can return the "woman yelling at cat" picture): look at `look/memes.jpg`.
- Place a meme beside the words, never on them or on the thing being explained. About 250-300 px wide, about a second.
- Rights are not checked: they are other people's photos. Say so in `CREDITS.md`.
- No sound on memes. (No free dog bark turned up either: the one CC0 "dog" file was speech.)

## Sound

- v1's music sat only 8 LU under the voice and the booms ran away. The bed level is set from the voice's loudness, and
  each effect is levelled by the louder of two readings of its loudest 200 ms (as a phone hears it, and full range), so
  a sub-heavy boom is not let through by the phone reading.
- One level means the group, too: a quick run of clicks or two snaps on top of each other is turned down about 3 dB.
- Rotate transition sounds; never the same whoosh twice in a row.
- Music drops belong on a cut into a new room or on the word that names the thing (reel 33: the cut into the board and
  "A skill."). With two drops the track jumps inside its quiet part on a 0.25 s crossfade.
- Always finish with `earshot` on the final MP4, not only the mixer's own numbers.

## Tools on this Mac

- The system Python has no numpy: use `~/.local/share/onetake/.venv/bin/python` (numpy, Pillow, Playwright) and
  `~/.local/share/earshot/.venv/bin/python` (soundfile, scipy, pyloudnorm) for the mixer.
- This ffmpeg has no `drawtext` and no `-vsync`: use `-fps_mode vfr`, and Pillow for labelled sheets.
- Never edit `film/` during a render. `partial_rerender.sh` renders ranges from a snapshot and splices them in.
