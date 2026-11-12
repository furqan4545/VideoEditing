# Reel 15 storyboard: "How does the gate know you did not pay?" (94.70 s, 1080x1920, 30 fps)

A cinematic animated explainer in ONE continuous take: one camera in one 3D world on white paper. No cuts, ever.
Every change of place is a camera move (a dive, a pull-out, a whip, a ride on something that moves). The viewer must
always be one step ahead: the next thing is already entering the frame while the current line ends.
Ali is on screen only in 0-5.6 s and 90.2-94.7 s (already staged in shots/00_hook.js and shots/90_end.js).

The voice is fixed (film/timing.js: TIMING.pieces with t0/t1 per phrase, TIMING.words with [word, t0, t1, piece]).
Sync the picture to the WORDS: read the word times from timing.js, do not guess.

## Colour code, never broken
blue = the tag magnet's own field and its tiny arrows. purple = the gate's field. orange = the strip's answer.
green / red / white = the gate's light (white = listening). Everything else is black, white, grey, steel, copper wire,
plus denim for the jeans and pale yellow for the cheese.

## On-screen words
Captions are automatic (top of frame, y 268-400). Extra on-screen text uses `u.label` only, plain, small, still:
kinds `name` (small caps part names with a leader line), `note` (one short sentence), `mid` / `big` (a number),
`small` (a quiet footnote). At most two labels at once, never over the subject, never in the caption band, inside
x 100-980 and y 430-1500. Fade in/out over 0.2-0.3 s (opacity only). No moving, scaling or bouncing text.
No footnotes or disclaimers (v1 had `Slowed down and drawn bigger` during the inside-the-tag shots; Ali had it removed).

## Stations (frames on the paper; see film/world.js for what stands where)
- `G` the supermarket gates. Gate A at x -0.5, gate B at x +0.5, panels parallel to Z, people walk along +Z (out of the shop, toward the default camera). The shopper (legs + bag) stops at z = +0.15 between the gates.
- `T` the tag at rest: origin = centre of the tag's underside, +X along the strip (46 mm long), Y up. The tag sits on the cheese inside the shopper's bag between the gates. All inside-the-tag shots are keyed in `T`.
- `C` the checkout counter with the switching-off pad, behind the gates.
- `S` the clothes shop pay point. `H` home: washing machine and calendar. `W` the hardware shop: a second pair of gates, the tool wall, the tray.
- `E` the last print of Ali.

## Handoff poses (exact; your first key must equal the pose at your start time, your last key the pose at your end)
- H0  t = 6.50   { st:'G', l:[0, 0.80, 0], d:5.9, az: 0.10 - WORLD.rotG, el:0.10, fov:24 }
- H1  t = 13.10  { st:'T', l:[0.004, 0.0012, 0], d:0.085, az:1.15, el:0.32, fov:24, ap:0.0012 }
- H2  t = 35.40  { st:'T', l:[0, 0.0012, 0], d:0.11, az:0.90, el:0.35, fov:24, ap:0.0010 }
- H3  t = 54.75  { st:'G', l:[0.15, 0.75, 0], d:5.4, az:-0.45, el:0.12, fov:24 }
- H4  t = 71.30  { st:'G', l:[0, 0.80, 0], d:6.2, az:-0.50, el:0.14, fov:24 }
- H5  t = 90.20  { st:'E', l:[0, 0.80, 0], d:6.6, az:0, el:0.02, fov:24 }

## Sequences

### B  6.5 -> 13.1   paid, still beeped; into the bag; into the tag            (file shots/10_gate_bag.js)
- 5.90-8.67 "So it sometimes beeps at the people who already paid."  The shopper (black joggers, white sneakers, white paper bag in the right hand, a long receipt sticking out of the bag) is already walking toward the gates while the camera flies in (from 5.6), passes between them, and on "beeps" both lights jump to red and he stops mid-step. One note near the receipt: `Paid. Still beeped.`
- Carry: the camera slides down the long receipt into the mouth of the bag; the bag's front turns see-through.
- 8.90-11.21 "Some shops even put a tag on the cheese."  Inside the bag: the block of cheddar with the white tag stuck on top. On "tag" a name label `Security tag`. The real headline card (The Independent, 5 July 2022) tilts up beside the cheese from about 9.3 and is gone by 11.1, with one footnote `Real headline, July 2022`.
- 11.27-12.78 "Let's go inside that tag."  The camera dives at the tag until its barcode lid fills the frame, the lid lifts and fades (12.3-13.0), the bag fades to clean paper white, and the camera swings down to H1: looking along the strip from one end, low, shallow depth of field.

### C  13.1 -> 35.4   inside the tag: the parts, the stretch, the ruler, 58,000, the magnet's two jobs   (file shots/20_inside.js)
- 13.27-15.03 "There is no battery and no chip."  A coin battery and a microchip (real size) hover above the open tag, one after the other on their words; each gets one thin diagonal bar across it and fades. Clean, almost silent picture.
- 15.10-18.32 "A metal strip lies loose above a flat magnet."  On "loose" the strip hops and settles (it is not glued). Name labels `Metal strip`, then `Flat magnet`. On "flat magnet" the magnet turns see-through: tiny blue arrows, all pointing the same way; blue field lines loop out of the magnet, through the strip and back. Note: `38 mm long. 0.025 mm thick: a quarter as thick as paper.`
- 18.53-21.80 "A magnetic field makes the strip a tiny bit longer."  Extreme close-up of the strip's +X end beside the tiny scale. One purple band of field sweeps along the strip; as it covers the strip the end slides out past two marks. Note: `Real stretch: under 0.001 mm`.
- 21.87-23.66 "Without one, it snaps back."  The band leaves; the end snaps back with a tiny settle. Then bands come faster and faster until longer / shorter blurs into a shake (motion blur does the rest).
- 23.90-26.05 "A shorter ruler buzzes faster."  The camera rises a little: behind the tag stands the miniature desk with the ruler. It twangs slowly while it sticks out far; it slides shorter and buzzes fast. Note: `Shorter = faster`.
- 26.10-29.68 "The strip is cut to shake 58,000 times a second."  Back on the whole strip from above-side: it gets longer and shorter so fast that both tips blur while the middle stays still (never a flap). A number counts up to `58,000` (kind big) with `times a second` under it, landing on "58,000".
- 29.90-32.39 "The magnet's pull sets that exact speed."  Section view: blue lines run through the strip all the time. Purple bands pass; with each one the strip grows or shrinks. A quiet read-out `58,000` stays rock steady.
- 32.47-35.26 "Without the magnet, the strip barely shakes."  A second, grey strip with NO magnet under it floats in above the real one. The same purple bands pass through both: the real strip shakes, the grey one hardly moves. Note: `No magnet, almost no answer`. Then a small black pin drops onto the magnet with `Remember this magnet`. End on H2.

### D  35.4 -> 54.75   the gate fires; the swing; it listens; it works backwards       (file shots/30_gate_fires.js)
- 35.50-39.58 "As you leave, the gate fires a magnetic field / that flips at the same speed."  The camera pulls back out of the tag, out of the bag, to both gates with the shopper standing between them (lights green again: this is the slow replay). Gate A's copper coil lights up and purple loops, copies of the coil's own shape, stream across the gap, dark then light. `58,000 flips a second` (mid). Footnote: `One burst lasts 1.6 thousandths of a second`.
- 39.80-43.75 "Each flip pushes the strip at the right moment, like pushing a swing."  The camera rides one purple loop back into the bag and into the tag. Inside, purple bands cross the strip, dark, light, dark; each pair is one push and the shake grows. On "swing" the miniature swing behind the tag is pushed by the hand in the very same rhythm and goes higher.
- 43.83-45.97 "It shakes harder and harder."  The shake keeps growing, the swing too. Note: `About 93 pushes in one burst`.
- 46.20-48.28 "Then the gate stops and listens."  The bands are gone. The camera tips up and out just far enough to see gate B's light go white (listening), coil dark. Note: `The gate is silent more than 85% of the time`.
- 48.33-50.81 "The strip is loose, so it keeps shaking."  Back on the strip: it keeps shaking with nothing pushing it, a little less each time; the swing keeps swinging with the hand gone.
- 51.03-54.62 "Now it works backward. / Shaking makes a tiny magnetic field."  With every stretch the strip sends out one thin orange loop; the loops grow and leave through the tag's skin. Note: `Not a sound. A magnetic field.` The camera follows one orange loop out of the bag to H3.

### E  54.75 -> 71.3   keys go quiet; six answers; the alarm; the checkout kills the magnet   (file shots/40_alarm_checkout.js)
- 54.87-57.47 "Your keys go quiet when the gate stops."  Wide on both gates, the bag see-through with the cheese and a bunch of keys in it. While purple loops cross, the keys show a thin purple outline; the instant the loops stop (on "quiet") the keys' outline is gone, but orange rings keep leaving the tag toward gate B's white light.
- 57.53-61.02 "The strip answers about six times, faster than a blink,"  Six rounds: purple burst, quiet, orange answer landing on the gate's white light. Six small round ticks fill one by one near the gate (one label: six dots). A small stopwatch read-out ends on `0.07 s`.
- 61.10-62.56 "and the alarm rings."  On the sixth tick both lights go red; the camera takes a short hit.
- 62.80-65.20 "When you pay, the checkout kills that magnet."  The camera slides back along the shopper's path to the checkout: a second cheese with its tag slides over the black pad, a soft white ring rises from the pad through it. The camera dives into that tag to the magnet (the pin marks it): the tiny blue arrows tumble into mixed directions and the blue lines fade. Note: `The magnet's tiny arrows get mixed up`.
- 65.27-66.74 "The strip changes speed."  The strip above goes dull; a read-out climbs from `58,000` to `60,000`.
- 66.80-69.18 "The pushes land at the wrong moments,"  Purple bands pass, the strip hardly moves; beside it the grey swing gets its pushes at the wrong moments and hardly moves.
- 69.23-71.12 "and almost nothing comes back."  The camera pulls back to the gates: one faint orange ring leaves this cheese and dies on the way; the lights stay green. End on H4.

### F  71.3 -> 90.2   the best part: the jeans                                   (file shots/50_jeans.js)
- 71.50-72.53 "And here's the best part."  The camera drifts onto clean empty paper; only the caption. Near stillness. Then it travels to the clothes shop.
- 72.97-75.00 "One man paid for the new jeans."  The pay point: folded jeans on the counter. On "paid" the card terminal shows PAID and a receipt with a PAID stamp comes out.
- 75.07-78.15 "A tag hidden inside was never turned off."  The camera pushes into the jeans' waistband; the flap of denim folds back and there is the small square tag with its tiny print; a calm thin orange ring pulses around it. Note: `Paid. The tag is still on.`
- 78.37-79.69 "He washed them at home."  A whip to the washing machine: the jeans tumble behind the glass. Beside it the calendar page turns from DECEMBER to JANUARY (during "Weeks later").
- 79.77-83.77 "Weeks later, he wore them to a hardware shop, / and its alarm rang."  A whip to the hardware shop: the tool wall behind a second pair of gates; a pair of jeans (legs only) walks out between them; on "alarm rang" both lights go red. Note: `Another shop. Same jeans.`
- 84.00-86.75 "He took off his jacket, his shoes / and belt."  Beside the gate a grey tray: the jacket, the shoes, the belt land in it, each on its own word.
- 86.83-87.92 "It still rang,"  The jeans step between the gates again: red again.
- 88.00-89.91 "because the tag was in his jeans."  The denim at the left hip turns see-through: the square tag glows orange inside. Then the real blog post (wolfstad.com, 22 January 2006) tilts up with the tag's words marked: REMOVE BEFORE WASHING OR WEARING, footnote `Real blog post, 22 January 2006`. The camera moves on to H5.

## Camera grammar
- Scale changes are dives (`dive: true`, exponential distance): the landing point glides to the centre. Use them as the film's signature: gates -> bag -> tag -> strip end, and back out.
- Macro shots: shallow depth of field (`ap` 0.0008-0.002), low angles along the strip, the subject large in frame. Extreme close-ups are wanted: the strip's edge, the scale ticks, the magnet's arrows.
- Whips between places take 0.3-0.45 s on `expoInOut`; land a hair early and settle. Ordinary moves on `cubicInOut` / `sineInOut`. Never two identical moves in a row.
- Keep the subject inside x 100-980, y 430-1500 on screen. Check with stills: `tools/vstills.py film/comp.html look/<name>.jpg t1,t2,... cols tileWidth`.
