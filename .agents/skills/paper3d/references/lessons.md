# What reel 15 taught (read before staging)

## Ali's notes on v1 (13 Nov 2026)
- "This is fucking amazing" for the 3D paper world, the dive through his cupped hand and the inside-the-tag shots.
- People were legs only: he wants the full body (now the `person` model).
- Show a magnet or any object whole first, then zoom inside it for the explanation.
- Do not hold an extreme close-up for long; show the full process so the viewer is not lost. v1 spent 22 s at macro scale.
- Captions: first he called v1's captions ugly and asked for the Apple style of reels 12 and 13; later the same day: "actually your black captions are perfect". They are now the `simple-storytell-caption` skill and the kit's default.
- "you fucking wrote instructions in the video, slowing down, drawing big ... this is fucking non sense": no footnotes or disclaimers on screen. The footnote was removed from reel 15 by re-rendering only the frames that showed it (`tools/partial_rerender.sh` in that project).
- Music was "still fucking loud" at a -22 LUFS bed with an 11 dB duck. v2 used a -28 LUFS bed (music about 16 LU under the voice).
- He could not find the delivered video: copy it to `~/Downloads`, reveal it in Finder, send the file card, and paste the description into the reply.

## Staging
- Sequence the film as places on one sheet of paper (stations) and travel between them with dives, pull-outs and whips; fix
  the camera pose where one sequence hands over to the next and stage each sequence between its two poses.
- A walk is a function of distance: one gait cycle per 1.44 m, so feet never slide; brake with a damped spring.
- For "this happens 58,000 times a second": animate a visible 9 to 12 cycles a second and let the shutter blur the tips; show slow, clear versions first.
- Put the few on-screen words in the lower third (y 1380 to 1500) unless the subject is there. No footnotes, no disclaimers.
- The key light turns with the camera's azimuth (always upper left front of the camera), so every shot is lit the same way.
- Hide far-away places by time windows; at tag scale lay `macropaper` under the subject and hide the bag (see `examples/reel15/world.js`).
- Things that must be seen through cloth or a wall: draw them over it (depthTest off or a few mm outside) with a soft halo.

## Technical
- Chromium needs `--allow-file-access-from-files --disable-web-security` for local image textures (the project's tools set them).
- three.js ignores a material's `envMapIntensity` when it uses the scene environment.
- Depth of field cannot see fat lines: draw field lines as thin tubes (`KIT.tubeLine`), and keep glows out of the depth pass (`soft: true`).
- No tone mapping (footage and paper keep their exact colours): keep lights modest so whites do not clip.
- `KIT.event(t, kind, note, dur)` in every shot; `tools/events.py` exports them for the mix. A sequence without events gets no sound.
- Render: about 2.5 frames a second with 6 to 7 workers. A scene-change scan after the render finds accidental pops; whips and dives show up there too and are fine if blurred.

## Cost
- The models took 24 agents (12 builders + 12 refiners, about 9M tokens) and the staging 5 more; the account ran out of
  credits mid-run and the review pass never happened. The models now exist: reuse them. Stage sequences yourself with
  stills; add at most a few helpers, each saving to disk early.
