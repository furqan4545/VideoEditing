# The models (film/assets/*.js)

Each file registers one or more models with `KIT.asset(name, ...)`. Build one with `KIT.make(name, options)`; drive it by writing its states in a shot: `u.w.<inst>.s.<state> = ...`. Preview: `tools/preview.sh <name> '<options json>' <file-if-different>`.
The text below is each file's own header (kept in the file, so it is always current).


## `bag.js`: bag, receipt

```
Two paper things, real size in metres.

'bag'      a white paper shopping bag, 0.30 wide (X), 0.38 tall (Y), 0.12 deep (Z), two black rope handles.
            Origin on the ground under the bag, front wall toward +Z.
   options: near   0 (default) = in x-ray the gusset that is toward the camera fades with the front wall (it follows the camera);
                   1 | -1 = always the +X | -X gusset
            keys, state   preview only: six camera keys, and a state to hold (tools/preview.sh bag '{"state":{"xray":1}}')
   state:   xray 0..1    the front wall and the near gusset fade to a faint veil, their edges and folds stay as thin lines. The faded walls
                         stop throwing shadow, so the key light falls on what is inside
            hang 0..1    0 = standing, handles up in two arches; 1 = carried: both handles pulled to the grip, the top pinched
            swing        radians, about the grip, in the plane of the wide face (a carried bag swinging as you walk)
            swingX       radians, about the grip, front to back
            squash       0 = none; +0.1 = 10 % shorter and a little wider (it lands); negative stretches
            shade 0|1    1 (default) = the walls and ropes throw shadows; 0 = they throw none, so nothing in the bag is ever shaded by it
                         (the floor still takes the product's shadow and still drops the bag's shadow on the ground)
            ao           -1 = auto (default), 0 = never, 1 = always in the contact-shade (AO) pass. Auto takes the bag out only when it hangs in
                         the air with no other model within 1.2 m: alone on bare paper the pass paints a grey halo behind it
   extras:  inst.body    the group that swings and squashes: add a product to it (bag-local coordinates) and it rides along
   shadows: the kit's VSM shadow map draws every mesh that casts OR receives. Setting castShadow = false on a wall from outside is
            understood here (the wall then stops receiving too, so it really leaves the map); doing it to other meshes has no effect

'receipt'  a long till receipt on thermal paper, 58 mm wide, option { len: 0.6 } metres, hanging from its top edge.
            Origin on the ground under it; the top edge is at y = size.topY (= len + 0.12).
   state:   stamp 0..1   a black-ink PAID stamp lands on the lower part (fade, then it settles to size)
            curl 0..1    how far the bottom end rolls up (0 = flat end)
            sway         radians, the strip swings from its top edge, the bottom trailing
            tip -1..1    the top 17 cm stands free and leans over (+ = back, away from the print side; - = forward); everything below stays put.
                         For a receipt sticking out of a bag: hold the strip where it passes the rim and let the top lean
            ao           -1 = auto (default), 0 = never, 1 = always in the contact-shade (AO) pass. A thin strip alone in the air throws a grey AO halo
                         on the ground seen close behind it; auto takes the strip out of the pass then, but never when another model is within 1.2 m
   extras:  inst.pos(u, s)  local [x, y, z] of the point u (0 top .. 1 bottom) down the middle of the strip in state s
   in a bag: parent the group to bag.body at [0.09, bag.anchors.mouth[1] + out - size.topY, 0.02] (out = how far it sticks out, about 0.2), curl 1,
            tip about 0.8. With out 0.24 a 0.62 m strip just reaches the bag's floor; x 0.09 keeps it clear of the eyelets and of a product in the middle
```


## `cards.js`: card

```
A paper print of a real web page: 'card'. A screenshot from film/img/ (see film/img/README.md) printed on thick
matte paper (0.6 mm) with a small white margin, softly rounded corners, a faint curl that lifts one corner a few
millimetres, and its own soft shadows. It lies on the paper ground and can tilt up on its bottom edge to face the camera.
Local frame: flat card centred on the origin, picture up (+Y), top of the page toward -Z, bottom edge (the hinge) at z = +H/2.

options (KIT.make('card', {...})):
   img        'img/independent_top.png'   path relative to film/comp.html
   w          0.3      width of the sheet in metres; the height comes from the image's aspect (size.H)
   radius     corner radius in metres (default 1.2 % of w; at most the margin)
   margin     white border in metres (default about 3 % of w)
   crop       [x0, y0, x1, y1] in image fractions, y from the top: print only this part of the image (default all of it),
              e.g. [0, 0.27, 1, 1] prints wolfstad_top.png without its header row (logo and the site's advert banner)
   mark       a rectangle to mark, in image fractions [x0, y0, x1, y1] with y measured from the TOP of the image,
              or a name from the table below ('headline', 'date', 'tag', 'belt', ...), or a list of up to three of either
   markStyle  'auto' (default: one line of text -> underline, anything taller -> box) | 'underline' | 'box'  (or a list)
   pen        marker line width in metres (default about 0.4 % of w)
   curl       0..1.5   how much the corner lifts (default 1 = about 5 mm on a 0.3 m sheet; 0 = dead flat)
   corner     'tr' (default) | 'tl' | 'br' | 'bl'   which corner lifts
   aspect     image height / width, only needed for an image that is not in the table (else it is fixed up on load)
   liftAngle  degrees the card stands at when lift = 1 (default 70)
state:
   o 0..1      opacity of the whole print: sheet, picture, marks and all its shadows fade together, evenly
   lift 0..1   0 = lying flat, 1 = tilted up 70 degrees toward the camera, hinged on its bottom edge
   mark 0..1   the marker line draws itself under / around the first mark rectangle, left to right, with a round tip
   mark2, mark3   the same for a second and third rectangle
   shadow 0..1 strength of the card's own shadows on the plane it lies on (its local y = 0). Set 0 when the card is held
               in the air: it then goes into the kit's shadow map instead and throws a real shadow on whatever is below
               (that real one cannot fade with o: it leaves at o = 0.5)
anchors (they follow lift: read them after you set s.lift in the same shot update):
   centre, markPos, markPos2, markPos3, top, bottom (the hinge), tl, tr, bl, br
also: inst.pt(u, v, lift) -> local [x, y, z] of a point of the printed picture (u across, v down from the top, both 0..1);
       inst.at(inst.pt(u, v, lift)) gives it in the world. inst.size = { W, H, iw, ih, M, TH, r } in metres.

Shadows: the print is never in the kit's shadow map (except shadow = 0, above). It receives other things' shadows, and
draws its own on its ground plane: the key light's shadow of the sheet worked out per pixel (tight at the paper, soft
far from it, right for any turn of the card), a wide soft one for the sky light, a contact line where paper meets
ground. They are flat drawings on the card's own plane, so they do not climb onto a neighbouring object.

Images under file:// : a page opened from disk may not use a file as a WebGL texture, so each PNG in film/img/ has a
sidecar "<name>.png.js" holding the same bytes as a data URL; the card loads that when the film runs from file://
and the PNG itself when it is served over http. Either way the texture comes from THREE.TextureLoader and its
promise is pushed to window.ASSET_PROMISES.
```


## `checkout.js`: checkout

```
The end of a supermarket checkout counter, where the cashier switches a tag off. Real size in metres.
A counter block 1.10 m long (X), 0.55 m deep (Z), top at 0.90 m: white matte top with a rounded front edge, a thin
steel strip under it, a graphite cabinet (two handle-less doors, a dark finger channel above them, a lock) on a recessed
toe kick. Set into the top, from left to right: a short black conveyor belt (printed PVC, round a roller at each end, a
steel transfer plate past each roller, low steel side guides with a photo-eye), a slim upright scanner post with a glass
window (at the back; behind the glass a camera eye and a light bar), and the deactivation pad: a matte black rubber
square, 0.24 m, flush in the top, fine raised rim, three embossed arcs, one tiny status LED.
Local frame: length along X, origin on the ground under the middle of the block, front (the nose of the top) at +Z.
state:
   wave 0..1   the pad's switching-off field: one thin flat white ring that leaves the pad surface, grows from a radius
               of 0.04 m to 0.20 m while it rises 0.12 m, and fades out. 0 and 1 = nothing to see.
   led         'green' | 'white'  (also 'off' or [r,g,b])  the pad's status LED
   belt        metres the belt has travelled toward the pad (default 0): its print and its one splice line move with it
```


## `cheese.js`: cheese

```
A block of mature cheddar in clear vacuum wrap, the way it lies on the shelf. Real size in metres:
115 mm long (X), 70 mm wide (Z), 42 mm high (42.7 mm with the film). Local frame: length along X, the label faces +Z,
the wrap rests on y = 0, centred on x = z = 0. With its two end fins the pack is 150 mm long.
Parts: the cheese (pale, softly rounded, a slight waxy sheen; fine pores and cut marks that only show in a macro), a
clear vacuum-tight film with a few tension creases near the short ends, at each short end the film pulled together
off the end face into a flat heat-sealed crimped fin with a pinked (zig-zag) cut edge (plus the two folded-in side
panels on the end face), a lap seam along the back, and a white paper label on the front long face (CHEDDAR / MATURE /
350 g, a nutrition grid, an EAN-13 barcode).
The film is drawn the way clear film looks: almost nothing but its reflections (added on top), a faint grey body
where it stands free of the block, and a pale shadow (40 %) under the fins.
The top face is left clean and flat in the middle: that is where the security tag gets stuck (anchor 'tag').
state:
   wobble (rad)   the block rocks on its long bottom edges while it settles: + lifts the front (label) edge, - the back edge
extra: inst.slot is a THREE.Group at the 'tag' anchor that rocks with the block (parent the tag to it to ride the wobble).
preview only: option keys = a list of camera keys for tools/preview.sh, e.g. '{"keys":[{"az":0.7,"el":0.4,"d":0.15,"l":[0.066,0.02,0]}]}'
```


## `clothes.js`: jeans, till

```
Two models for the shop scenes, real size in metres.

'jeans'  a neatly folded pair of new indigo jeans as sold in a shop (0.34 x 0.26 x 0.07), folded in thirds: two legs
          lying on each other, turned twice. On top: the waistband with belt loops, the leather patch and the top
          button, the yoke, one back pocket with arc stitching, the side seam, the front pocket and a paper size tag.
          At the front: the big fold and the two hems under it. Inside the left end of the waistband, under a flap of
          denim, lies the sewn-in security tag: a flat off-white square, 38 x 38 x 1.2 mm.
   state: flap 0..1   the flap of denim above the tag turns back like a page (0 = closed, the tag cannot be seen)
          glow 0..1   a calm thin orange ring around the square tag ("still switched on"): one steady line and one
                      soft pulse every 2.4 s. Drawn over the cloth, so it also shows while the flap is closed
          ghost 0..1  the flap becomes see-through (down to 15 %) so the tag shows through the cloth, off-white and unshaded

'till'   a small clothes-shop pay point: white counter (0.9 x 0.5 x 0.95) on a graphite plinth, a slim card terminal
          on a stand, a small receipt printer, and behind it a black steel clothes rail (1.2 x 1.6) with six garments.
   state: paid 0..1     the terminal screen goes from the amount to a check mark and "PAID"; its four status lights come on
          receipt 0..1  (extra) a printed receipt feeds out of the printer slot

preview:  tools/preview.sh jeans '' clothes      tools/preview.sh till '' clothes
   preview extras in the options: "keys":[{az,el,d,l}, ...] replaces the six views, "s":{"flap":1, ...} forces a state,
   and for the till "jeans":1 lays the folded jeans on the counter where the film puts them
```


## `fields.js`: gatefield, band, answer

```
The invisible magnetic fields, drawn as clean coloured lines in the air: a physics diagram, never a glow.
Three assets live in this file (plus 'fields', a preview-only wrapper at the bottom):

   'gatefield'  the gate's field at human scale. Local origin = the ground midpoint between the two gates
                (gate A at x = -0.5, gate B at x = +0.5, panels in the YZ plane, people walk along Z).
                Copies of the coil's own loop (0.34 m along Z by 1.36 m tall, centred at y 0.82) march from A to B.
     state: amp 0..1    overall opacity
            phase       loops advance one spacing (0.125 m) per unit; wraps, so a growing phase reads as a stream
            reach 0..1  loops exist from x = -0.5 up to x = -0.5 + reach (the front is soft over 0.1 m)
            lw          line weight, 1 = as built (tube radius 4 mm); 0.5 = half as heavy, for when the camera comes close

   'band'       the same field at the scale of the tag: up to three thin purple slabs (7 mm along X, 9 mm tall,
                24 mm deep along Z, centred at y 3.5 mm) with 5 x 3 straight field lines inside, running along X.
     state: o 0..1      opacity
            x           centre of band 0 along X (metres)
            gap         centre to centre distance; band k sits at x + k * gap (a negative gap puts them behind)
            dir         +1 = band 0 dark purple, arrows toward +X;  -1 = light purple, arrows toward -X.
                        Neighbouring bands always alternate.
            n 0..3      how many bands show (fractions fade the next one in)
            lw          line weight, 1 = as built (tube radius 0.06 mm); lower it in extreme close-ups

   'answer'     the strip's reply at human scale: small orange rings travelling along a gentle arc.
     state: amp 0..1, phase (rings advance one spacing per unit), reach 0..1 (how far along the path rings have got)
            from, to    [x,y,z] in the group's local frame (a Vector3 works too). Give a new array, never edit the old one.
            bow         height of the arc as a fraction of the straight distance (0.12; 0 = straight, negative = sags)
            face 0..1   how far each ring turns from "facing along the path" toward the camera. 0 = strictly along the path
                        (seen from the side a ring is only a dash), 1 = flat to the lens. 0.45 by default: always an open ellipse.
            lw          line weight, 1 = as built (tube radius 3 mm)
```


## `gate.js`: gate

```
One security gate (an acousto-magnetic pedestal): a clear acrylic panel with the copper coil you can see inside it,
a dark base that holds the electronics, and a light bar on top. Local frame: panel in the XY plane, feet on y = 0,
centred on x = 0, thin along Z. Real size: 0.42 m wide, 1.55 m tall.
state: light 'green' | 'red' | 'white' | 'off' | [r,g,b]   glow 0..1 (how strongly the edge lights up)   coil 0..1 (copper glow while it fires)
```


## `hardware.js`: pegboard, tray, jacket, shoes, belt

```
Hardware-shop props, real size in metres, Y up, origin on the ground under the model, front toward +Z.
   pegboard   a free-standing white pegboard wall on black steel legs with a tidy tool wall
              state: sway 0..1 (the tools that hang from one hook swing a little)
   tray       a grey security-check tray (no state). Option: with = [[name, [x, y, z], rotY], ...] puts jacket / shoes / belt in it (-> .items)
   jacket     a folded black puffer jacket: two quilted layers, zip, collar   state: fall 0..1
   shoes      a pair of white chunky sneakers, grey suede overlays            state: fall 0..1
   belt       a coiled black leather belt, steel buckle                       state: fall 0..1
fall: 0 = 0.35 m above its resting place, about 0.56 = it lands, then a soft bounce and a rock that dies out, 1 = at rest.
Preview any of them: tools/preview.sh <name> '' hardware     (fall strip: add the times 2.2,2.9,3.15,3.3,3.6,3.95)
Preview only: options view = { l, d, close, keys } (camera) and hold = { fall: 0.6 } (fixed state instead of the demo).
```


## `keys.js`: keys, battery, chip, pin

```
Four small real-size props for the close-ups, one file:

   'keys'     a bunch of keys the way it really lies on a table: a steel split ring (two wire turns, 28 mm) propped at
              an angle, a cylinder-lock key (cut blade, milled groove, rounded bow), a dimple key (rectangular bow,
              drilled dimples), a small padlock key and a black leather fob strap, all hanging on the ring.
              state: ring 0..1 (a thin purple outline hovering around each key: plain metal answering the gate's field)
                     jiggle (rad: the keys swing a little about their holes, the ring turns, the strap shifts)
              options: debug (prints a build check: what cuts into what), close (anchor name for the preview close-ups)
   'battery'  a CR2032 coin cell, 20 mm x 3.2 mm, "+ / CR2032 / 3V" stamped in the top, crimped edge, + side up.
   'chip'     an SOIC-8 microchip: black epoxy body 5 x 4 x 1.5 mm, moulded pin-1 dot, 8 gull-wing legs, laser marking.
              both: o 0..1 (opacity of everything; a clean fade, the insides never show, the shadow fades with it),
              cross 0..1 (a thin black bar laid across the top face from lower-left to upper-right, growing along its length)
   'pin'      a round-head map pin: matte black ball 2.2 mm on a polished steel needle (0.4 mm), 9 mm tall, tip at the origin.
              state: drop 0..1 (falls from 30 mm, lands at 0.6, quivers, stands at rest at 1)
   every asset also takes the preview options keys (six camera keys) and states (six state objects), see `posed`.

Everything is built in millimetres inside a group scaled by 0.001, so the numbers below read like a drawing.
```


## `laundry.js`: washer, calendar

```
Two models for the "washed again and again, month after month" beat. Both register from this one file.

'washer'    a front-loading washing machine, real size: 0.60 m wide, 0.85 m high, 0.58 m deep (the door stands 3 cm proud).
             White cabinet with a worktop on a dark seam, a control strip (detergent drawer with a recessed grip, programme
             dial, small dark display, buttons), a big round door (chrome ring, black inner ring, bulging glass, handle),
             a kick panel with a filter cap, four feet, and a real back (service plate, transport-bolt caps, water inlet,
             drain stub, rating label). Behind the glass: a pressed stainless drum (rolled mouth, rows of holes, a back wall
             with a raised ring and three pressed ribs, painted darker toward the back) inside a dark tub, three grey lifter
             paddles, a bundle of jeans (waistband, button, belt loops, back pocket, two hemmed legs; twill print, small
             wrinkles, pale wear on the fold backs) and a little water.
   state:  spin   radians. 0 = the jeans lie at the bottom. The drum turns clockwise seen from the front. The jeans ride up the left side ahead of a rib,
                  let go near the top, turn over in the air and land on the right: one full tumble every 4*PI/3 of spin
                  (two ribs). About 5 rad/s is a real wash; the pose depends on the angle only.
           water  0..1   how high the water stands in the drum (0 = none; below about 0.1 it hides under the door's rim)
           dial   radians, the programme dial's pointer (0 = straight up)
   options: { jeans: false } an empty drum; { glass: false } no door glass (for a camera that goes inside);
            preview only: { set: { spin: 1, water: 0.6 } } holds a state, { view: {...} } replaces the six preview views.

'calendar'  a desk flip calendar on a small black tent stand, 0.18 m wide, 0.22 m high: white pages on two steel rings.
   state:  flip   0..1   the DECEMBER page lifts from its bottom edge, goes up and over the rings and lands on the back of
                  the stand; JANUARY is under it. Linear in flip: ease it in the shot. The sheet in the air is shaded as
                  paper (a shade greyer on its plain back, the print showing through faintly), so it reads against the white.
   options: { from: 'DECEMBER', to: 'JANUARY', fromStart: 1, toStart: 4, fromDays: 31, toDays: 31 }  (start: weekday of the 1st, 0 = Monday);
            preview only: { set: { flip: 0.4 } }, { view: {...} }.
```


## `legs.js`: legs

```
A person from the waist down, walking. Real size in metres: waist cap at 1.0, hip joints 0.92, knee 0.5, ankle 0.09,
shoe 0.28 long. Local frame: feet on y = 0, centred on x = 0, the person faces +Z. "R" is the +X side.
options: { style: 'jogger' | 'jeans' }   jogger = black sweatpants with ribbed cuffs, jeans = indigo denim, turned-up hem.
state:
   walk   phase in cycles (0..1 = one full gait cycle = two steps). The +X foot strikes the ground at walk = 0, 1, 2 ...,
          the -X foot at 0.5, 1.5 ... The CALLER moves the group forward by 1.44 m per cycle (0.72 m per step):
          group.position.z = z0 + 1.44 * walk. A planted foot then stays exactly where it is on the ground.
   still  0..1   1 = standing still, feet side by side (blends the walk out)
   lift   -1..1  heel raise for a small shuffle: > 0 lifts the +X heel, < 0 the -X heel (the toe stays planted)
Anchors are given for the standing pose. While walking the pelvis rides 1 to 3.5 cm lower (it bobs 2.6 cm, twice a cycle),
sways 1.6 cm to the standing leg and turns a few degrees, so pin things to the waist with a little slack.
Preview only: option look = 'all' | 'shoe' | 'hip' | 'back' | 'gait' | 'front' | 'ankle' | 'lift' picks the six preview cameras;
option pv = { keys: [six cameras {az, el, d, l}], walk, still, lift: number | [six numbers] } sets any cameras and poses.
The trousers are one skinned tube per leg (bent on the CPU around the hip and the knee, so no gap can open);
shoes and socks are rigid. Feet are placed by inverse kinematics from a foot path that rolls heel to toe on the sole.
```


## `macropaper.js`: macropaper

```
A sheet of the same white paper that slides in right under the tag when the camera is at tag scale, so every
close-up of the tag sits on clean paper with a soft contact shadow (the cheese and the bag floor disappear under it).
state: o 0..1 (the world sets it from how close the camera is; shots may override)
```


## `person.js`: person

```
A whole person, walking: the 'legs' model plus a torso, two swinging arms, a neck and a head. Real size, about 1.82 m.
Needs assets/legs.js loaded too. Local frame: feet on y = 0, faces +Z, "R" is the +X side.
options: { style: 'jogger' | 'jeans' (the trousers, see legs.js), top: 'hoodie' | 'jacket' | 'tee', topColor: '#hex' (optional) }
state: everything legs has (walk, still, lift) plus
   carryR 0..1   the right arm hangs straight and still, as if holding a bag (hang the bag from anchor handR)
   carryL 0..1   same for the left arm
   arms   0..1   how much the arms swing with the walk (default 1)
   topVis        boolean: false hides the jacket layer of top 'jacket' and shows the tee under it (he took his jacket off)
Anchors (standing pose): everything legs has, with handR / handL moved to the real hands, plus head, face, chest, shoulderR, shoulderL.
```


## `print.js`: print

```
Ali's footage as a print standing on the paper: an upright board that plays the take. The camera can fly through a
round hole that opens in it (the push through his cupped hand).
options: { foot: 'loc' | 'st2' | 'st19', w, h (metres, the whole board), border (metres of white paper margin) }
state: hole (radius in metres, 0 = no hole), holeAt [u, v] (0..1 on the board, v up), o (opacity), tOff (seconds added to the film time)
```


## `ruler.js`: ruler

```
The "twang a ruler on the edge of a desk" set, real size in metres.
A small desk (cool white top, graphite edge band, black steel frame; top at y = 0.72), a 30 cm frosted clear plastic
ruler (cm scale on a bevelled edge, hang hole at the 30 end) lying on it and sticking out over the +X edge, and a
matte-black clamp block with two knurled steel thumbscrews that holds the ruler down. The block's outer face is flush
with the desk edge and a small toe hooks over the rounded lip, so the clamp line IS the desk edge (x = 0.25).
Local frame: desk centred on x = 0 / z = 0, feet on y = 0, ruler along X, front = +Z.
options: legs 4 | 1   (1 = only the front-right leg, for a frame that never shows the rest)
          preview only: pose { free, amp, phase, sag } holds the demo on one state; keys [...] replaces the six preview views
state:
   free   metres of ruler hanging past the desk edge, 0.08 .. 0.24 (the ruler slides along X; the clamp stays put)
   amp    tip deflection in metres (0.03 is a good twang at full length). It is capped at 1.2 L^2 (L = free length):
          the plastic only takes so much curvature at the clamp, so 7 cm at 24 cm but 8 mm at 8 cm. Short = stiff.
   phase  radians; deflection of the free part = amp * shape(x) * sin(phase), shape = first bending mode of a
          cantilever, x^2 (3 - x) / 2 with x = 0 at the clamp and 1 at the tip (zero slope at the clamp)
   sag    0..1 the ruler's own weight: 3.7 mm of droop at 24 cm, nothing you can see at 8 cm (it goes with L^4)
helpers on the instance (pure, for shots): inst.hz(free) real pitch in Hz (10 at 24 cm, 23 at 16 cm, 91 at 8 cm),
   inst.ampFor(free) what the same finger push gives at that length (goes with L^3),
   inst.pointAt(s, k, out) local point on the ruler's top, k = 0 at the clamp .. 1 at the tip; inst.tipAt(s, out)
anchors tip, mid, hole and end0 move with the state (rewritten in apply); clamp, deskEdge, block, deskTop, corner, leg, floor are fixed
```


## `swing.js`: swing

```
A playground swing being pushed, real size in metres: top bar at 2.10 m, seat 0.50 m off the ground.
An A-frame of round powder-coated steel tube, two black chains, a flat black rubber seat, and behind the seat the
pusher: an open mitten hand in matte white clay (four fused fingers with grooves, a thumb that grows out of the palm)
coming out of a clean-cut dark sleeve with a cuff. It comes forward to meet the seat and shoves it.
Local frame: top bar along X, the seat swings in the YZ plane, front = +Z, feet on y = 0, centred on x = 0, z = 0.
options: { tone: 'white' | 'grey',       grey = every part one flat mid grey (the "pushed at the wrong moments" copy)
            frame: 'white' | 'steel',     white powder-coated tube (default) or satin steel
            fittings: 'dark' | 'light',   graphite cast joints (default) or pale ones
            sleeve: 'dark' | 'light' | 'none',   graphite sleeve (default), pale grey sleeve, or a bare clay forearm with a round end
            handScale: 1.4 }              the hand is drawn a little bigger than life so it reads when the swing is small
            (preview aids only: pose = a state or one state per view, keys = camera views)
state:
   ang      swing angle in radians, positive = seat forward (+Z). Seat and chains turn about the pivot pins.
   push     the hand's forward extension. 0 = drawn back, 1 = palm on the seat's back edge when ang === reach.
            Above 1 the palm rides the seat's arc (the shove): to stay on the seat use  push = 1 + (ang - reach) / size.follow
   reach    the swing angle at which the hand meets the seat (the back of the arc: a negative angle). Default -0.45.
   handVis  boolean
helpers on the instance (local points, pass them to inst.at):  seatAt(ang) -> seat top centre   handAt(push, reach) -> palm
                                                                  elbowAt(push, reach) -> the far end of the sleeve
```


## `tag.js`: tag

```
The security tag (acousto-magnetic label), the film's hero. Real size in metres: 46 mm long (X), 16.5 mm wide (Z).
Thicknesses are drawn bigger than life so the camera can read the layers (the tray is 2.6 mm high instead of 2.2).
Bottom to top: paper sticker base (a hair larger), white moulded tray, flat dark MAGNET (39.2 x 13 mm) on the floor, an
air gap, a clear separator SHELF resting on a moulded step, and on it, loose with air all around and above, the thin
bright metal STRIP (38 x 9 mm, so the magnet shows on both sides of it). A printed lid sits in a rebate with a hairline
seam. No battery, no chip.
Local frame: length along X, feet on y = 0, centred, front = +Z (the "near" long wall is the +Z one).

state (every number is animatable; rest values in `defaults`):
   lid 0..1        0 = closed lid with the barcode, 1 = lifted off about 1.6 mm and faded away
   wall 0..1       1 = the near (+Z) long wall is cut away (section view); the corners keep their cut faces
   len             strip strain, drawn bigger: scale.x = 1 + len about the centre (both tips move; use +-0.035 at most)
   rattle 0..1     the strip sits loose: small hop and yaw, driven by rattleT (seconds since it arrived)
   dim 0..1        a strip that hardly answers: greyer, duller
   stripLift       metres: lifts the strip straight up out of the tray (beauty shot); the orange loops follow it
   glowEnds 0..1   soft purple tint on the strip's two tips (the gate's field is pushing it)
   shelf 0..1      visibility of the clear separator shelf (default 1)
   xray 0..1       the magnet turns smoky see-through so its tiny arrows (domains) show, all pointing +X
   dom 0..1        0 = every arrow points +X, 1 = arrows tumbled into mixed directions (wiped). The tumble starts at the
                   +X end and runs down the magnet; the blue loops fade with it (gone by dom = 0.77)
   blue 0..1       the magnet's own field: thin loops out of the +X end, back over / along the strip, into the -X end
   ans 0..1, ansT  the strip's answer: thin orange loops that hug the strip and grow outward. One new loop is born
                   each time ansT passes a whole number and lives for 4 units (so 4 are on screen, the line stays thin)
   ansTilt         radians: plane of the orange loops. 0 = flat around the strip, lifting clear of the rim as they grow
                   (default); PI/2 = upright along the strip
   marks 0..1      the half-millimetre scale standing just behind the strip's +X end (middle long tick = resting end)
   tagO 0..1       opacity of the housing (sticker, tray, lid, shelf): 0 leaves only strip + magnet
   stripVis, magVis  booleans
anchors: strip (centre, top face), stripEnd (+X tip), stripEndL (-X tip), magnet, magnetEnd, top, cavity, shelf, marks, lid
preview any pose from any angle:  tools/preview.sh tag '{"keys":[six {az,el,d,l,ap}],"states":[six state objects],"yaw":2.19}'
   (yaw turns the tag as it lies in the world: 2.19 = on the cheese in the bag; the key light is fixed in the world, so add
   the same angle to every az)
```
