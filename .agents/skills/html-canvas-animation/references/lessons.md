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
