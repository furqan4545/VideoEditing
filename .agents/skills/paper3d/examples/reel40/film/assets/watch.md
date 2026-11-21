# watch (`KIT.make('watch', opts)`)

Apple Watch, Series 11 / 12 style, 46 mm. Real size in metres: 0.046 (Y) x 0.039 (X) x 0.00975 (Z, glass top to sensor
apex). Origin = the case centre, the screen faces +Z, top = +Y, the Digital Crown is on +X. About 39k triangles bare,
58k with the hanging band, 63k worn.

What is modelled: an aluminium case with a soft pebble side (one curve from the back to the front lip), a thin polished
lip, black cover glass that wraps over the edge (opaque black border, clear over the display, slightly domed), OLED
screen (canvas), knurled crown with a polished chamfer, mic hole, flat side button in a dark gap, two speaker grilles
(-X), band slots top and bottom, an engraved ring of text on the back ("SERIES 11 · 46MM ALUMINUM CASE · ..."), two
band-release pills, a polished chamfer round the domed sapphire sensor window with 72 radial Fresnel lines, a split ring
electrode, 4 LED clusters (lens + two dies) and 4 photodiodes (framed, iridescent, finger grid).

## Options
| option | default | meaning |
|---|---|---|
| `finish` | `'jetblack'` | `'jetblack'` (dark graphite, clear-coat shine; reads on the navy void) / `'spacegrey'` / `'silver'` |
| `caseMat` | — | `{ c, m, r, cc }` override case colour / metalness / roughness / clearcoat |
| `band` | `'none'` | `'none'` (slots show) / `'hang'` (black sport band, two straps curling away behind the case: product shot; pin stud on the top strap, 8 holes on the bottom one) / `'worn'` (closed round a wrist: pin through a hole, keeper loop, on the palm side) |
| `wrist` | `{ w: 0.058, h: 0.042, p: 2 }` | band `'worn'`: wrist cross-section in the YZ plane, `w` along Y, `h` along Z (metres). The band's inner face lies on a superellipse of exponent `p` (2 = true oval) centred at `anchors.wrist` = `[0, 0, backZ - h/2]`, so the sensor touches the top of the wrist. The arm runs along X (crown toward the hand) |
| `wristGuide` | `false` | adds a plain skin-coloured forearm of that cross-section (x -0.07..0.07, capped), for previews / quick shots |
| `keys`, `states` | — | preview only: six camera keys / six state objects |

## State (`defaults`)
| state | default | meaning |
|---|---|---|
| `screen` | `'bpm'` | `'off'` / `'bpm'` (Heart Rate: red "Heart Rate" + time, grey "Current", big white tabular number, red BPM, pulsing red heart above BPM, 2-minute dot history) / `'alert'` (white Health tile with a pink-red heart, "Possible / Hypertension") |
| `on` | 1 | screen brightness 0..1 (0 = black glass, reflections only) |
| `gain` | 0.78 | linear level of white on the screen (0.78 sits just under the bloom; 0.95+ makes the number bloom) |
| `bpm` | 72 | integer on the screen. The canvas is redrawn only when `screen` or `bpm` changes |
| `pulse` | 0 | 0..1 heart beat (scale 0.8 -> 1.1 and brightness); drive it from a beat curve |
| `led` | 0 | green LED brightness 0..1 |
| `flash` | 1 | strobe gate 0..1: lit = `led * flash` (cores, halos, a green scatter over the centre) |
| `glow` | 0 | soft green spill around the back (6 cm wide, single-sided facing -Z, invisible from the front) |
| `pd` | 0 | photodiodes catch a faint green glint (light coming back) |
| `crown` | 0 | radians the Digital Crown has turned |

## API and anchors
- `ledPoints()` -> 4 local `[x, y, z]`, LED cluster centres just outside the sensor face, order top, +X, bottom, -X (radius 3.4 mm)
- `pdPoints()` -> 4 local points, photodiode centres, order top-+X, top--X, bottom--X, bottom-+X
- `screenPoint(u, v, zmm = 0)` -> local point on the glass (u, v from the screen's top-left 0..1, `zmm` MILLIMETRES above)
- `size`: `{ w: 0.039, h: 0.046, d: 0.00975, backZ: -0.0049 (sensor apex), frontZ: 0.00485, screenW: 0.0324, screenH: 0.0386, sensorR: 0.0128, ledR: 0.0034 }`
- `anchors`: `screen` (centre of the glass, outside), `back` (sensor apex, outside), `crown` (crown face centre), `button`, `leds` (centre of the LED ring), `wrist` (wrist oval centre, band `'worn'`)

## Preview
`tools/preview.sh watch` (bare), `tools/preview.sh watch '{"band":"hang"}'`, `tools/preview.sh watch '{"band":"worn","wristGuide":true}'`.
Demo: front 3/4 bpm with beating heart -> back lit green strobing with spill -> side profile -> sensor close (unlit) ->
alert -> sensor close lit. Any pose: `'{"keys":[six {az,el,d,l}],"states":[six state objects]}'`.

## Known limits
- `band` and `wrist` are build options (geometry), not animatable. For a band that changes, make two instances.
- `'worn'` on the default round oval: the case ends hover ~8 mm above the wrist, so the strap leaves the slot flat and
  bends down steeply (that is what a 46 mm case does on a round 58 x 42 mm wrist). `wrist.p` 2.4-2.8 gives a flatter,
  more real wrist top; then build the arm with the same superellipse so the band sits on the skin.
- The sensor-side close-ups are impossible while worn (the sensor is in the skin); use a bare instance for those.
- The glow spill and LED halos are planes facing -Z: they read from behind / the side, not from the front (on purpose).
- Back text is engraved-looking decal text (no Apple logo).
