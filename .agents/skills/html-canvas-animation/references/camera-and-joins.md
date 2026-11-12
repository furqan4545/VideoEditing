# The camera and the hidden joins

## Keys
`[t, x, y, zoom, { fy, curve, hit, anchor, rot }]` on the TIGHT clock, world units. `x, y` is the world point that sits at
screen `(540, fy)` (default `fy` 960). `curve` is the ease INTO this key. `camAt` adds a hand float (two slow sines,
smaller when zoomed in) and an `OM.shake` for every key with `hit` (2-4 = a landing).

- **Hold / follow:** `ease.sineInOut` between two close keys (slight drift, the frame never stops: Ali's always-moving rule).
- **Whip between beats:** `ease.expoInOut`, land 0.05-0.15 s before the word, add `hit: 3`. Leave paper between places
  so the blur has something to smear.
- **Snap in / settle:** `ease.expoOut` for a card growing out of something.
- **Dive:** `ease.expoIn` into a point at zoom 20-50 (into black, into a picture).
- **Track a moving thing:** linear keys every 0.15-0.2 s from the scene's position function (e.g. `CL_youPos(t + 0.15)`),
  the first one with `expoInOut`.
- **Anchored zoom:** `anchor: [wx, wy]` keeps that world point on a straight screen path through the move (a pull-back
  that keeps the drawing you came out of in place, a push into a fingertip).
- Framing: zoom so the subject fills the frame width; text and faces stay out of the caption band (screen y ~1400-1500).
  Instagram crops the sides: keep important things inside x 100-980.

## The hidden joins (how two places become one take)
1. **Cover swap.** Dive into a picture until it covers the whole frame (zoom = 1920 / picture height × 1.04), hold, then
   at one instant jump the camera to the SAME picture placed somewhere else (scale the zoom by the size ratio) and pull
   back to reveal the new place. Both copies must be drawn by one shared function so they match pixel for pixel
   (reel 17: the post image → Sara's drawing on the class wall, `SWAP1`). Two keys 0.0005 s apart; the second `linear`.
2. **Push into black.** Push into a dark area (his black shirt next to his pointing fingertip, a phone's black glass),
   fade a screen-space black overlay in as zoom passes ~9-30, jump to the next place's black thing at high zoom, and
   pull out (reel 17: Ali's hand → the phone's screen wakes). His card stops showing before its piece ends.
3. **Follow the thing.** A packet, note or heart leaves one place; the camera chases it to the next place where another
   scene catches it (reel 17: the request card → the server farm).
4. **Whip.** A fast `expoInOut` move between places on the same desk, motion-blurred by the renderer (reel 17: bin →
   Ali, map → Ali).
5. **Grow out of it.** A card morphs out of an object (`OM.morphRect`) and folds back (reel 17: the race diagram out of
   the whiteboard).
6. **From his gesture.** Things grow out of his fingertips (two fingers → two computers), measured on his frames with
   `aliPoint(card, crop, px, py)`; check with `--full` stills.

`render.py` asks `__motion` how far things travel per frame to choose how many captures to average; `startFilm` gives
the camera's travel. The swap frames are "kept hard" by the renderer (fine: the picture is identical).

## Ali's card
`aliShow: [{ id, t0, t1, c: {x, y, w, h}, crop: {sx, sy, sw} }]`: a piece's frames shown in a card lying on the paper.
The crop is in the 1920x1080 take; make the card taller when a gesture sits low in the frame (reel 17's turn card was
1000 x 720 so his pointing hand was in it). Only pieces in `ON_CAM` (cut/build.py) have frames.
