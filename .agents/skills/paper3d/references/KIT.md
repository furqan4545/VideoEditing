# paper3d kit: how to build a model or a shot

One HTML composition (`film/comp.html`), rendered by onetake's `render.py`. It is a real 3D world (three.js r180,
bundled in `vendor/three.bundle.js` as `THREE` + `THREEX`) on white paper. Everything is a pure function of time:
`window.__seek(t)` must give the same frame every time. Read `film/kit.js` (short) before writing anything; read
`film/assets/gate.js` and `film/assets/tag.js` as the two reference models (quality bar and conventions).
A person is always the full-body `person` model. Show an object whole before any close-up, keep close-ups short and
pull back often (see the skill's rules).

## The look (do not drift from it)

- White paper world. The ground is paper (`KIT.col.paper`), the "sky" is the same paper white, shadows are soft.
  It should feel like a premium product film shot on a white paper sweep: real objects, real materials, soft light.
- Black, white and greys only: white/cream plastics and paper, black/graphite rubber and gloss, brushed steel,
  clear acrylic. Copper only for coil wire. Colour is reserved for meaning:
  blue `KIT.col.blue` = the tag magnet's own field; purple `KIT.col.purple` (+ `purpleLight`) = the gate's field;
  orange `KIT.col.orange` = the strip's answer; green / red = the gate's light. Allowed object colours, used once
  each: denim `KIT.col.denim` for the jeans, pale `KIT.col.cheese` for the cheese, `KIT.col.kraft` for cardboard.
- Real things, real proportions, real size in metres (a person's hip is at 0.9 m, a gate is 1.55 m tall, the tag is
  46 mm long). Rounded edges everywhere (`KIT.geo.rbox`, bevelled extrusions): never a raw sharp box. Add the small
  details that reward a close-up: seams, a lip, feet, screws, stitching, a printed label, a cable.
- No cartoon faces, no outlines, no emoji, no gradients-as-decoration, no glow blobs, no particles.
- Text on objects is plain: system font `KIT.FONT`, regular or medium weight, never bold, never tilted.

## A model file: `film/assets/<name>.js`

```js
KIT.asset('name', (K, o) => {           // o = options given to KIT.make('name', o)
  const T = THREE, g = new T.Group();
  // build meshes with K.mesh(geometry, material, { pos, rot, scale, cast, receive, soft })
  //   geometry: K.geo.rbox(w,h,d,r) | K.geo.cyl(r,h,seg,rTop) | K.geo.extrude(points2D, depth, {bevel, holes}) |
  //             K.geo.rrect(w,h,r) (outline) | K.geo.tube(points3D, radius, {closed, seg}) | any THREE geometry
  //   material: K.mat.clay(color, rough) | plastic | gloss | rubber | metal | brushed | glass(opacity) | cloth | paper |
  //             K.mat.flat(color, opacity) (unlit, NOT cached: for things you animate) | K.mat.light(color) (an LED)
  //   printed surfaces / drawings: K.canvasPlane(w, h, pxPerMetre, (ctx, W, H) => {...}, { lit: true })
  //   field lines: K.tubeLine(points, { color, r, opacity, closed })   (thin unlit tube; set .material.opacity)
  return {
    group: g,
    size: { ... },                       // useful numbers (metres)
    anchors: { handle: [x, y, z] },      // named local points other code can aim at:  inst.at('handle') -> world Vector3
    view: { l: [0, 0.5, 0], d: 3, close: [0, 0.6, 0] },   // where the preview camera looks, from how far
    defaults: { open: 0, walk: 0 },      // every animatable number, with its rest value
    apply(s, t) { /* pose the model from state s. Pure: same s -> same pose. No Math.random, no Date. */ },
    demo(s, t) { /* preview only: drive s over t = 0..12 s so all states get seen */ },
  };
});
```

Rules: local origin on the ground under the model, Y up, the model's "front" faces +Z. Cached materials are shared:
clone one before you animate its colour or opacity. Soft things that are not solid (glows, halos, light cones) get
`{ soft: true }` so they stay out of the shadow/AO/depth passes. Use `OM.rng(seed)` for any randomness. Keep each
model under about 150k triangles. `apply` runs every frame: do not allocate geometry there.
Every seek, state `s` is reset to `defaults`, then the active shots write into it, then `apply(s, t)` runs.

## Preview a model (do this until it looks premium)

```bash
cd downloads/reel15/full && tools/preview.sh <name> ['{"opt":1}'] [other,asset,files] [times] [tileWidth]
# -> look/asset_<name>.jpg : six views at t = 0.5, 2.5, 4.5, 6.5, 8.5, 10.5 (two wide, a side, a top, two close)
```

Open the JPEG with the Read tool and look hard. Fix what a designer would reject: wrong proportions, floating parts,
z-fighting, blown-out whites, mushy silhouettes, missing contact shadow, a part that reads as a toy. Add the asset's
file name to `window.ASSET_FILES` in `film/assets/index.js` only when I ask (the preview loads it by name anyway).
Only one preview process at a time per agent; each takes about 5 s.

## A shot file: `film/shots/<nn>_<name>.js`

```js
KIT.cam.key(12.0, { st: 'G', l: [0, 0.8, 0], d: 5.2, az: 0.5, el: 0.15, fov: 24, ease: 'cubicInOut' });
KIT.cam.key(14.0, { st: 'G', l: [0, 0.3, 0.4], d: 0.4, az: 0.2, el: 0.5, dive: true, ap: 0.001 });
KIT.shot({ id: 'gate-walk', t0: 12.0, t1: 14.0, pre: 0.3, post: 0.3, update(t, u) {
  const k = u.k(12.2, 13.4, t);                  // 0..1 between two times
  u.w.legs.s.walk = k * 3;  u.w.gA.s.light = t > 13.1 ? 'red' : 'green';
  u.label('paid', 'Paid. Still beeped.', { screen: [540, 1480], kind: 'note', o: u.k(13.2, 13.5, t) });
} });
```

Camera pose: look-at point `l` (station-local), distance `d`, azimuth `az` (0 = camera on +Z looking toward -Z,
positive swings the camera toward +X), elevation `el` (radians above the horizon), `fov` (24 by default look),
`ease` (name from OM.ease) for the move INTO this key, `dive: true` for big scale changes (the landing point glides
to the centre while the distance closes), `ap` depth-of-field amount (0 = off, about 0.0008 to 0.002 for macro),
`hand` (0..1, the operator's float; keep 1), `lift` / `swing` for arcs. The camera is never frozen.
Labels: `u.label(id, html, { at: worldVector3 | screen: [x, y], dx, dy, kind: 'name'|'note'|'mid'|'big'|'small', o })`.
Frame: 1080 x 1920. Captions (the simple story tell caption, loaded by the kit) sit at y 268 to 384: keep that band clean.
No footnotes or disclaimers on screen ("Slowed down and drawn bigger" was cut from reel 15): labels are for content only. Keep everything that matters inside
x 100 to 980 and y 420 to 1500 (Instagram covers the rest).

## Moving a model, and things that must stay changed

Every seek: each model's group goes back to its rest transform (where `world.js` put it), each state `s` goes back to
`defaults`, then every shot whose window `[t0 - pre, t1 + post]` contains t runs. So inside `update` you may set
`inst.group.position / rotation / scale` freely: it is recomputed every frame. If something must STAY changed after
your sequence ends (a walker that has arrived, a lid that stays off), register a second small shot that covers the
rest of the film and keeps it there, e.g. `KIT.shot({ id: 'hold-walker', t0: 8.6, t1: 95, update(t, u) { ... } })`.
Never rely on what an earlier frame left behind.

Stations are frames on the paper: `KIT.cam.key(t, { st: 'T', ... })` reads `l` and `az` in that station's frame;
`u.world('T', [x, y, z])` turns a station-local point into a world point; `inst.at('anchor')` or `inst.at([x,y,z])`
gives a model-local point in world space. Eases: any name in OM.ease plus quadIn, cubicIn, quartIn, sineIn, sineOut,
quadInOut.

## Previewing a sequence, and telling the sound what happens

`tools/vstills.py film/comp.html look/<name>.jpg 13.2,14,15.5 6 360 "only=20_inside"` renders stills of the film
with only your shot file loaded (plus the opening and the ending), so another sequence's half-written file cannot
break your preview. Columns and tile width are yours to choose (tile 540 or 1080 to judge detail).
For every moment a sound designer would mark, call once at load time:
`KIT.event(t, kind, note, dur)` with kind one of whip, dive, pullout, hit, alarm, tick, pulse, land, reveal, snap,
riser, quiet. Few and meaningful (camera moves, the alarm, things landing, the field bursts), not every label.
