# Drawing premium components on the canvas

## The kit's helpers (kit.js)
- `plate(x, y, w, h, r, { fill, lift, line, op })`: a card lying on the paper: a wide soft shadow, a tight contact
  shadow, a hairline. `lift` > 1 floats it higher (bigger, softer shadow). Shadows are sized in world units (`sh()`), so
  depth holds at every zoom.
- `T(str, x, y, { f, c, al, base, op, ls })`, `tw(str, f)`, `ln(...)`, `rr(...)` (rounded rect path), `check(...)`,
  `heartPath(cx, cy, s)` (never an emoji glyph), `writeOn(str, x, y, k, o)` (left-to-right handwriting reveal),
  `pop(t, t0)` (spring pop-in: `{op, dy, s}`), `mix(a, b, k)` (colours), `onScreen(x, y, w, h, margin)` (skip work).
- Fonts: `F()` SF Pro, `FM()` SF Mono, `FS()` New York (serif, italic for key words), `FH()` Bradley Hand (handwriting),
  `FMK()` Noteworthy (marker). System fonts that render by name in the renderer: Bradley Hand, Noteworthy, Snell
  Roundhand, Marker Felt, Chalkboard SE, Apple Chancery, Avenir Next. SF itself only renders from fonts.js.
- Motion: `OM.popIn`, `OM.hop` (an arc between two points), `OM.morphRect` (one rect into another), `OM.press`,
  `OM.typeOn`, `spring`, `ease.*` (see onetake's `references/motion-library.md`). Randomness only from `OM.rng(seed)`.

## Patterns that worked (find them in examples/reel17 and downloads/reel16/full)
- **A number written by hand:** author single-stroke paths for 0-9, reveal with a dash offset, the marker tip riding
  the stroke end; an eraser swipe leaves a faint ghost (`wall.js`).
- **An odometer count:** each digit column rolls vertically, its speed from a rate function (`phone.js` `PH_odo`).
- **People from above:** shoulders as a rounded shape + head circle with varied hair; standing up = shadow grows and
  scale 1.04; walking = shoulder sway + fading footprints (`class.js`).
- **A phone lying on the paper:** black frame, Dynamic Island, glass streak, a long soft shadow; the screen wakes from
  black; a real fingertip taps (`phone.js`).
- **A device, then inside it:** a rack unit with LEDs and a label; the lid turns to glass and shows the data as a table
  (`network.js`). A dot-matrix world map from a hand-written land mask; arcs with pulses; digits that flip on arrival.
- **A diagram grown out of the object:** lanes on a time axis, blocks drawn left to right with the words (`wall.js` race card).
- **Download cards, stopwatches, water tanks, a line-art hand, a code window, a comment box:** reel 16's comp.html.

## Speed
The comp draws every layer every frame: return early when a scene is off screen or outside its time window; batch
thousands of small shapes into one path (`g.beginPath()` once, many `rect`/`arc`, one `fill`); cache static drawings in
an offscreen canvas. A frame should draw in well under 50 ms or the render crawls.
