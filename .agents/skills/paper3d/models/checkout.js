// The end of a supermarket checkout counter, where the cashier switches a tag off. Real size in metres.
// A counter block 1.10 m long (X), 0.55 m deep (Z), top at 0.90 m: white matte top with a rounded front edge, a thin
// steel strip under it, a graphite cabinet (two handle-less doors, a dark finger channel above them, a lock) on a recessed
// toe kick. Set into the top, from left to right: a short black conveyor belt (printed PVC, round a roller at each end, a
// steel transfer plate past each roller, low steel side guides with a photo-eye), a slim upright scanner post with a glass
// window (at the back; behind the glass a camera eye and a light bar), and the deactivation pad: a matte black rubber
// square, 0.24 m, flush in the top, fine raised rim, three embossed arcs, one tiny status LED.
// Local frame: length along X, origin on the ground under the middle of the block, front (the nose of the top) at +Z.
// state:
//   wave 0..1   the pad's switching-off field: one thin flat white ring that leaves the pad surface, grows from a radius
//               of 0.04 m to 0.20 m while it rises 0.12 m, and fades out. 0 and 1 = nothing to see.
//   led         'green' | 'white'  (also 'off' or [r,g,b])  the pad's status LED
//   belt        metres the belt has travelled toward the pad (default 0): its print and its one splice line move with it
KIT.asset('checkout', (K, o = {}) => {
  const T = THREE, X = THREEX, g = new T.Group();
  const L = 1.10, D = 0.55, TOP = 0.90, TS = 0.03, KICK = 0.10;   // length, depth, height of the top, thickness of the white slab, toe kick
  const PAD = 0.24, PX = 0.25, PZ = 0.02;                         // the pad: side, centre
  const BX0 = -0.50, BX1 = -0.05, BZ = 0.02, BW = 0.32;           // the belt well: from x to x, centre line, belt width
  const SX = 0.045, SZ = -0.20, SW = 0.094, SH = 0.21;            // the scanner post: centre, width, height
  const add = (m) => { g.add(m); return m; };
  // extruded outlines are flat shaded: smooth the curved walls, keep the real edges (worked in millimetres so nearby corners stay apart)
  const smooth = (geo, ang = 0.22) => { geo.scale(1000, 1000, 1000); const s = X.BufferGeometryUtils.toCreasedNormals(geo, ang); s.scale(0.001, 0.001, 0.001); return s; };
  // ... and give every long straight edge a point close to each end, so that smoothing stays at the corner and the long flat wall keeps its true normal
  const tight = (pts, e = 0.0005) => { const out = []; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy);
    out.push(p); if (l > 4 * e) out.push([p[0] + dx * e / l, p[1] + dy * e / l], [q[0] - dx * e / l, q[1] - dy * e / l]); } return out; };
  const ext = (pts, depth, opt = {}) => smooth(K.geo.extrude(tight(pts), depth, Object.assign({}, opt, { holes: (opt.holes || []).map(h => tight(h)) })));
  // a flat part: an outline given as [x, z] points (world axes), extruded upwards by depth (plus the bevel on both sides)
  const flat = (pts, depth, opt = {}) => { const f = p => [p[0], -p[1]];
    const geo = K.geo.extrude(tight(pts.map(f)), depth, Object.assign({}, opt, { holes: (opt.holes || []).map(h => tight(h.map(f))) })); geo.rotateX(-Math.PI / 2); return smooth(geo); };
  const rr = (w, d, r, cx = 0, cz = 0, n = 10) => K.geo.rrect(w, d, r, n).map(p => [p[0] + cx, p[1] + cz]);
  const std = (color, rough, env = 1, spec = 1) => new T.MeshPhysicalMaterial({ color: new T.Color(color), roughness: rough, metalness: 0, envMapIntensity: env, specularIntensity: spec });
  // a tileable normal map from a height function h(x, y) in pixels (0..size, periodic): surface texture that holds at any zoom, and fades to flat far away
  const nmap = (size, h, strength, repeat) => { const cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d'), im = c.createImageData(size, size), d = im.data, H = new Float32Array(size * size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) H[y * size + x] = h(x, y);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const xl = (x + size - 1) % size, xr = (x + 1) % size, yu = (y + size - 1) % size, yd = (y + 1) % size;
      const dx = (H[y * size + xr] - H[y * size + xl]) * 0.5 * strength, dy = (H[yd * size + x] - H[yu * size + x]) * 0.5 * strength, l = Math.hypot(dx, dy, 1), i = (y * size + x) * 4;
      d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255; }
    c.putImageData(im, 0, 0); return K.canvasTex(cv, { srgb: false, repeat }); };

  // ---------------------------------------------------------------- the cabinet
  const graphite = K.mat.plastic('#44474d', 0.56), steel = K.mat.brushed(), white = K.mat.clay('#cdd0d3', 0.8);
  add(K.mesh(K.geo.rbox(1.04, KICK + 0.002, 0.42, 0.004), K.mat.clay('#1b1c1f', 0.9), { pos: [0, (KICK + 0.002) / 2, -0.045] }));          // toe kick, set back
  add(K.mesh(K.geo.rbox(1.076, 0.76, 0.50, 0.006), graphite, { pos: [0, KICK + 0.38, -0.018] }));                                         // carcass
  for (const [x0, x1] of [[-0.536, 0.043], [0.047, 0.536]])                                                                               // two front panels, a real gap between them
    add(K.mesh(K.geo.rbox(x1 - x0, 0.727, 0.012, 0.0025), graphite, { pos: [(x0 + x1) / 2, KICK + 0.003 + 0.3635, 0.235] }));
  add(K.mesh(K.geo.rbox(1.072, 0.0215, 0.004, 0.001), K.mat.clay('#1d1e21', 0.85), { pos: [0, 0.8445, 0.2325] }));                          // the finger channel above the doors: a dark shadow line under the top
  // a small cabinet lock on the right panel
  add(K.mesh(K.geo.cyl(0.008, 0.004, 32), K.mat.metal(K.col.steel, 0.3), { pos: [0.49, 0.79, 0.2415], rot: [Math.PI / 2, 0, 0] }));
  add(K.mesh(K.geo.rbox(0.0013, 0.0075, 0.001, 0.0003), K.mat.clay('#101114', 0.6), { pos: [0.49, 0.79, 0.2436], cast: false }));

  // ---------------------------------------------------------------- the top: a white slab with two openings, a rounded front edge, a steel strip under it all the way round
  add(K.mesh(K.geo.rbox(L - 0.003, 0.0125, D - 0.003, 0.0015), K.mat.metal(K.col.steel, 0.44), { pos: [0, TOP - TS - 0.006, 0] }));
  const b = 0.001, zB = -D / 2, zF = D / 2 - 0.0305, hx = L / 2 - b, so = [[hx, zF - b], [-hx, zF - b]];                                  // slab outline: square where it runs into the nose, soft corners at the back
  for (let i = 0; i <= 8; i++) { const a = Math.PI + Math.PI / 2 * i / 8; so.push([-hx + 0.004 + Math.cos(a) * 0.004, zB + b + 0.004 + Math.sin(a) * 0.004]); }
  for (let i = 0; i <= 8; i++) { const a = Math.PI * 1.5 + Math.PI / 2 * i / 8; so.push([hx - 0.004 + Math.cos(a) * 0.004, zB + b + 0.004 + Math.sin(a) * 0.004]); }
  const slab = flat(so, TS - 2 * b, { bevel: b, holes: [
    rr(BX1 - BX0, BW + 0.012, 0.010, (BX0 + BX1) / 2, BZ), rr(PAD + 0.0032, PAD + 0.0032, 0.0156, PX, PZ)] });
  slab.translate(0, TOP - TS + b, 0); add(K.mesh(slab, white));
  { const r1 = 0.022, r2 = 0.005, zN = D / 2, y0 = TOP - TS, p = [[zN - 0.035, y0 + b], [zN - r2, y0 + b]];                               // the nose: profile in (z, y), run along X (drawn smaller by the bevel, so its ends match the slab's edges)
    for (let i = 1; i <= 8; i++) { const a = -Math.PI / 2 + Math.PI / 2 * i / 8; p.push([zN - r2 + Math.cos(a) * (r2 - b), y0 + r2 + Math.sin(a) * (r2 - b)]); }
    for (let i = 0; i <= 28; i++) { const a = Math.PI / 2 * i / 28; p.push([zN - r1 + Math.cos(a) * (r1 - b), TOP - r1 + Math.sin(a) * (r1 - b)]); }
    p.push([zN - 0.035, TOP - b]);
    const nose = ext(p.map(q => [-q[0], q[1]]), L - 2 * b, { bevel: b }); nose.rotateY(Math.PI / 2); nose.translate(-L / 2 + b, 0, 0); add(K.mesh(nose, white)); }

  // ---------------------------------------------------------------- the conveyor belt: a rubber loop around two rollers in a dark well, steel rails and plates around it
  const BL = BX1 - BX0, BXC = (BX0 + BX1) / 2, beltTop = TOP + 0.001, dark = K.mat.clay('#0d0e10', 0.9);
  const liner = flat(rr(BL - 0.0034, BW + 0.012 - 0.0034, 0.0085, BXC, BZ), 0.026, { holes: [rr(BL - 0.0074, BW + 0.012 - 0.0074, 0.0065, BXC, BZ)] });
  liner.translate(0, TOP - 0.027, 0); add(K.mesh(liner, dark)); add(K.mesh(K.geo.box(BL - 0.004, 0.002, BW + 0.008), dark, { pos: [BXC, TOP - 0.0285, BZ] }));
  // the belt: a dark body, and over it the skin you see: up round the far roller, the flat run, down round the near roller into the slot under the steel plate.
  // The skin's uv is in metres (along the belt, across it), so its print and its splice can travel with the belt.
  const RB = 0.015, beltFlat = BL - 0.012 - 2 * RB, xL = BXC - beltFlat / 2, xR = BXC + beltFlat / 2, yC = beltTop - RB, LOOP = 2 * beltFlat + 2 * Math.PI * RB, TILE = 0.010;
  const body = ext(K.geo.rrect(BL - 0.0128, 2 * RB - 0.0008, RB - 0.0004, 14), BW - 0.0008); body.translate(BXC, yC, BZ - BW / 2 + 0.0004); add(K.mesh(body, K.mat.clay('#131416', 0.9)));
  const beltMat = std('#1e1f22', 0.58, 0.9, 0.8), spliceU = { value: 0 };                                                                    // PVC: a shade lighter than the rubber pad, with a low sheen
  beltMat.normalMap = nmap(256, (x, y) => { const a = Math.sin(x * Math.PI * 4 / 256), c = Math.sin(y * Math.PI * 4 / 256); return a * a * c * c; }, 7, 1 / TILE);     // the fine pyramid print of a checkout belt, 2.5 mm pitch
  beltMat.normalScale.set(0.8, 0.8);
  beltMat.onBeforeCompile = (sh) => { sh.uniforms.uSplice = spliceU;                                                                        // the splice: one slanted weld line, a little smoother than the print
    sh.vertexShader = 'varying vec2 vBelt;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n  vBelt = uv;');
    sh.fragmentShader = 'uniform float uSplice;\nvarying vec2 vBelt;\n' + sh.fragmentShader
      .replace('#include <color_fragment>', `#include <color_fragment>
        float bq = mod(vBelt.x - vBelt.y * 0.36 - uSplice, ${LOOP.toFixed(5)}), bd = min(bq, ${LOOP.toFixed(5)} - bq), bw = fwidth(bd) + 0.0002, band = 1.0 - smoothstep(0.0022 - bw, 0.0022 + bw, bd);
        diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * 1.22 + 0.004, band);`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        normal = normalize(mix(normal, nonPerturbedNormal, band * 0.55));`); };
  { const P = [], N = [], U = [], I = [], NA = 22, EXT = 0.42, sweep = Math.PI / 2 + EXT;
    const rib = (x, y, nx, ny, s) => { for (const z of [-BW / 2, BW / 2]) { P.push(x, y, BZ + z); N.push(nx, ny, 0); U.push(s, z); } };
    for (let i = 0; i <= NA; i++) { const a = Math.PI + EXT - sweep * i / NA; rib(xL + Math.cos(a) * RB, yC + Math.sin(a) * RB, Math.cos(a), Math.sin(a), -sweep * RB * (1 - i / NA)); }
    for (let i = 1; i < 8; i++) rib(xL + beltFlat * i / 8, beltTop, 0, 1, beltFlat * i / 8);
    for (let i = 0; i <= NA; i++) { const a = Math.PI / 2 - sweep * i / NA; rib(xR + Math.cos(a) * RB, yC + Math.sin(a) * RB, Math.cos(a), Math.sin(a), beltFlat + sweep * RB * i / NA); }
    for (let j = 0; j < P.length / 6 - 1; j++) { const a = 2 * j; I.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const skin = new T.BufferGeometry(); skin.setAttribute('position', new T.Float32BufferAttribute(P, 3)); skin.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); skin.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); skin.setIndex(I);
    add(K.mesh(skin, beltMat, { cast: false })); }
  // side guides: a low steel profile each side, dark end caps, and the photo-eye that stops the belt (a small black window in each guide, near the cashier's end)
  const capMat = K.mat.plastic('#2a2c30', 0.5), eyeMat = K.mat.gloss('#0c0d0f', 0.12);
  for (const sz of [-1, 1]) { const z = BZ + sz * (BW / 2 + 0.004);
    add(K.mesh(K.geo.rbox(BL + 0.046, 0.017, 0.012, 0.003), steel, { pos: [BXC, TOP + 0.0065, z] }));
    for (const sx of [-1, 1]) add(K.mesh(K.geo.rbox(0.004, 0.0174, 0.0124, 0.003), capMat, { pos: [BXC + sx * (BL / 2 + 0.0235), TOP + 0.0065, z] }));
    add(K.mesh(K.geo.rbox(0.020, 0.0085, 0.0016, 0.0006), eyeMat, { pos: [BX1 - 0.085, TOP + 0.0085, z - sz * 0.0061], cast: false }));
    add(K.mesh(K.geo.cyl(0.0022, 0.0008, 20), K.mat.metal('#4a4d54', 0.12), { pos: [BX1 - 0.085, TOP + 0.0085, z - sz * 0.0068], rot: [Math.PI / 2, 0, 0], cast: false })); }
  // a steel transfer plate past each roller: it rests on the white top and reaches over the well, the belt rolls down into the slot under its edge
  const plate = steel.clone(); plate.bumpMap = K.canvasTex(K.noiseCanvas(256, 7, 'brushed'), { srgb: false }); plate.bumpMap.center.set(0.5, 0.5); plate.bumpMap.rotation = Math.PI / 2; plate.bumpMap.repeat.set(3, 1);   // brushed along its length
  const screw = K.mat.metal('#9a9da4', 0.3), socket = K.mat.clay('#232427', 0.6), PT = 0.0026, pTop = beltTop + 0.0004;
  for (const sx of [-1, 1]) { const xa = sx > 0 ? xR + 0.010 : BX0 - 0.018, xb = sx > 0 ? BX1 + 0.018 : xL - 0.010, xs = sx > 0 ? BX1 + 0.009 : BX0 - 0.009;
    add(K.mesh(K.geo.rbox(xb - xa, PT, BW - 0.006, 0.0009), plate, { pos: [(xa + xb) / 2, pTop - PT / 2, BZ] }));
    for (const sz of [-1, 1]) { add(K.mesh(K.geo.cyl(0.003, 0.0006, 24), screw, { pos: [xs, pTop + 0.0002, BZ + sz * 0.105], cast: false }));
      add(K.mesh(K.geo.cyl(0.0014, 0.0004, 6), socket, { pos: [xs, pTop + 0.00045, BZ + sz * 0.105], cast: false })); }
  }

  // ---------------------------------------------------------------- the scanner post: a slim black post, glass window, low foot
  const sc = new T.Group(); sc.position.set(SX, TOP, SZ); g.add(sc);
  const gloss = K.mat.gloss(K.col.black, 0.26), y0 = 0.009, yc = y0 + SH / 2, wy = yc + 0.014, WW = SW - 0.025, WH = SH - 0.071, sb = 0.0015, outline = K.geo.rrect(SW - 2 * sb, SH - 2 * sb, 0.0125, 10);
  sc.add(K.mesh(K.geo.rbox(SW + 0.022, 0.011, 0.08, 0.004), K.mat.plastic('#2a2c30', 0.5), { pos: [0, 0.0055, -0.001] }));                    // foot
  const back = ext(outline, 0.040 - 2 * sb, { bevel: sb }); back.translate(0, yc, -0.027 + sb); sc.add(K.mesh(back, gloss));           // back shell
  const front = ext(outline, 0.014 - 2 * sb, { bevel: sb, holes: [K.geo.rrect(WW, WH, 0.008, 10).map(p => [p[0], p[1] + 0.014])] });
  front.translate(0, yc, 0.013 + sb); sc.add(K.mesh(front, gloss));                                                               // front shell with the window opening
  sc.add(K.mesh(K.geo.rbox(WW - 0.001, WH - 0.001, 0.002, 0.0006), K.mat.clay('#141518', 0.8), { pos: [0, wy, 0.0138] }));                          // the dark chamber behind the glass
  // what you see through the glass: the camera eye of an imaging scanner (housing, steel ring, a dark lens), and its light bar above
  sc.add(K.mesh(K.geo.cyl(0.0165, 0.0075, 48), K.mat.plastic('#232427', 0.5), { pos: [0, wy + 0.002, 0.0185], rot: [Math.PI / 2, 0, 0], cast: false }));
  sc.add(K.mesh(new T.TorusGeometry(0.0118, 0.0011, 12, 56), K.mat.metal('#8a8d95', 0.22), { pos: [0, wy + 0.002, 0.0222], cast: false }));
  sc.add(K.mesh(new T.SphereGeometry(0.0108, 40, 14, 0, Math.PI * 2, 0, Math.PI / 2), K.mat.gloss('#08090a', 0.2), { pos: [0, wy + 0.002, 0.0219], rot: [Math.PI / 2, 0, 0], scale: [1, 0.09, 1], cast: false }));
  sc.add(K.mesh(new T.TorusGeometry(0.0042, 0.0005, 8, 40), K.mat.metal('#3f4248', 0.3), { pos: [0, wy + 0.002, 0.0229], cast: false }));   // the iris you see inside the lens
  sc.add(K.mesh(K.geo.rbox(WW - 0.027, 0.0042, 0.002, 0.001), K.mat.light('#cdd1d6'), { pos: [0, wy + WH / 2 - 0.0155, 0.0156], cast: false }));         // light bar
  // the glass: a smoke tint, and over it a layer that only adds what the pane reflects (so it is clear, not milky, and the sheen grows at a low angle)
  const pane = K.mesh(K.geo.rbox(WW - 0.0025, WH - 0.0025, 0.0022, 0.0008), new T.MeshBasicMaterial({ color: 0x0a0c0e, transparent: true, opacity: 0.4, depthWrite: false }), { pos: [0, wy, 0.0256], cast: false }); pane.renderOrder = 3; sc.add(pane);
  const sheen = K.mesh(K.geo.rbox(WW - 0.0025, WH - 0.0025, 0.0022, 0.0008), new T.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.7, transparent: true, blending: T.AdditiveBlending, depthWrite: false }),
    { pos: [0, wy, 0.0258], cast: false, receive: false }); sheen.renderOrder = 4; sc.add(sheen);
  { const ink = K.mat.clay('#8b8e95', 0.6), bars = [2, 1, 1, 1, 3, 1, 1, 2, 2, 1, 1, 1, 3, 1, 2], u = 0.0008; let x = -bars.reduce((a, v) => a + v, 0) * u / 2;     // a small printed barcode mark under the window
    bars.forEach((w, i) => { if (i % 2 === 0) sc.add(K.mesh(K.geo.box(w * u, 0.0095, 0.0001), ink, { pos: [x + w * u / 2, 0.034, 0.02705], cast: false })); x += w * u; }); }
  // its cable, out of a strain relief in the back, down through a grommet in the top
  sc.add(K.mesh(K.geo.rbox(0.013, 0.012, 0.007, 0.0025), K.mat.plastic('#2a2c30', 0.5), { pos: [0, 0.040, -0.0285] }));
  sc.add(K.mesh(K.geo.tube([[0, 0.04, -0.026], [0, 0.036, -0.036], [0, 0.018, -0.045], [0, -0.004, -0.046]], 0.0032, { seg: 24, rad: 10 }), K.mat.rubber('#17181b')));
  sc.add(K.mesh(new T.TorusGeometry(0.0075, 0.0024, 12, 32), K.mat.plastic('#2a2c30', 0.5), { pos: [0, 0.0006, -0.046], rot: [Math.PI / 2, 0, 0] }));

  // ---------------------------------------------------------------- the deactivation pad
  const padMat = std('#0e0f11', 0.88, 0.45, 0.35);                                                      // anti-slip texture: a fine staggered grid of low dots, 2 mm apart
  padMat.normalMap = nmap(256, (x, y) => { const j = Math.floor(y / 32), lx = (((x - (j % 2) * 16) % 32) + 32) % 32 - 16, ly = y - j * 32 - 16, q = Math.hypot(lx, ly) / 10; return q < 1 ? (1 - q * q) * (1 - q * q) : 0; }, 3.2, 1 / 0.016);
  const pad = flat(rr(PAD - 0.0012, PAD - 0.0012, 0.0134, PX, PZ), 0.026 - 0.0012, { bevel: 0.0006 }); pad.translate(0, TOP - 0.026 + 0.0006, 0); add(K.mesh(pad, padMat));
  const rim = flat(rr(PAD - 0.0008, PAD - 0.0008, 0.0136, PX, PZ), 0.0012, { bevel: 0.0004, holes: [rr(PAD - 0.0064, PAD - 0.0064, 0.0108, PX, PZ)] });
  rim.translate(0, TOP - 0.0004, 0); add(K.mesh(rim, std('#1f2125', 0.5, 0.8, 0.8)));
  // the embossed mark: three concentric arcs, opening away from the front
  const arc = (R, w, a0, a1, n = 30) => { const p = [], h = w / 2, P = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];
    for (let i = 0; i <= n; i++) p.push(P(a0 + (a1 - a0) * i / n, R + h));
    for (let i = 1; i < 16; i++) { const c = P(a1, R), e = P(a1 + Math.PI * i / 16, h); p.push([c[0] + e[0], c[1] + e[1]]); }
    for (let i = 0; i <= n; i++) p.push(P(a1 + (a0 - a1) * i / n, R - h));
    for (let i = 1; i < 16; i++) { const c = P(a0, R), e = P(a0 + Math.PI + Math.PI * i / 16, h); p.push([c[0] + e[0], c[1] + e[1]]); }
    return p; };
  const markMat = std('#2a2c31', 0.5, 0.8, 0.9), MZ = PZ + 0.0243;
  for (const R of [0.015, 0.027, 0.039]) { const m = flat(arc(R, 0.0048, -Math.PI / 2 - 0.87, -Math.PI / 2 + 0.87).map(p => [p[0] + PX, p[1] + MZ]), 0.0004, { bevel: 0.0003 });
    m.translate(0, TOP - 0.0001, 0); add(K.mesh(m, markMat, { cast: false })); }
  // the status LED in the front right corner: a low lens in a small bezel, and the light it throws on the rubber
  const LX = PX + PAD / 2 - 0.021, LZ = PZ + PAD / 2 - 0.021;
  add(K.mesh(K.geo.cyl(0.0048, 0.0014, 32), K.mat.plastic('#2a2c30', 0.4), { pos: [LX, TOP + 0.0003, LZ], cast: false }));
  const lens = add(K.mesh(new T.SphereGeometry(0.0032, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), K.mat.light('#22c55e'), { pos: [LX, TOP + 0.0009, LZ], scale: [1, 0.5, 1], cast: false }));
  const soft = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(64, 64, 2, 64, 64, 62);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new T.CanvasTexture(c); })();
  const spill = add(K.mesh(new T.PlaneGeometry(0.021, 0.021), new T.MeshBasicMaterial({ color: 0x22c55e, map: soft, transparent: true, opacity: 0.22, depthWrite: false }), { pos: [LX, TOP + 0.0017, LZ], rot: [-Math.PI / 2, 0, 0], cast: false, receive: false, soft: true }));
  spill.renderOrder = 5; spill.material.fog = false;

  // ---------------------------------------------------------------- the wave: one thin flat ring, drawn on a square that rises (width in metres stays the same while it grows)
  const Q = 0.56, ringMat = new T.ShaderMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, uniforms: { uR: { value: 0.04 }, uW: { value: 0.003 }, uO: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uR, uW, uO; varying vec2 vUv;
      void main(){ float r = length(vUv - 0.5) * ${Q.toFixed(3)}, d = abs(r - uR);
        float core = 1.0 - smoothstep(uW * 0.45, uW, d), sh = 1.0 - smoothstep(uW * 0.8, uW * 3.2, d);   // a white line with a soft grey shoulder, so it reads on black rubber and on white paper
        float a = uO * max(core, 0.2 * sh * sh); if (a < 0.003) discard;
        gl_FragColor = vec4(mix(vec3(0.30, 0.32, 0.36), vec3(1.0), core), a); }` });
  const ring = add(K.mesh(new T.PlaneGeometry(Q, Q), ringMat, { pos: [PX, TOP + 0.003, PZ], rot: [-Math.PI / 2, 0, 0], cast: false, receive: false, soft: true })); ring.renderOrder = 6;

  const COL = { green: [0.09, 0.72, 0.30], white: [1, 1, 1], off: [0.16, 0.17, 0.18] };
  return {
    group: g,
    size: { L, D, TOP, PAD, padX: PX, padZ: PZ, beltL: BL, beltW: BW, scannerH: SH + 0.009 },
    anchors: { pad: [PX, TOP, PZ], belt: [BXC, beltTop, BZ], front: [0, TOP, D / 2], led: [LX, TOP + 0.002, LZ], mark: [PX, TOP + 0.0006, PZ], scanner: [SX, TOP + wy, SZ + 0.027],
      beltEnd: [BX1, TOP + 0.003, BZ], beltStart: [xL + 0.03, beltTop, BZ], top: [0, TOP, 0], stand: [PX, 0, D / 2 + 0.35] },
    view: Object.assign({ l: [0, 0.56, 0], d: 5.8, close: [PX - 0.07, TOP + 0.07, PZ - 0.03] }, o.view || {}),
    defaults: { wave: 0, led: 'green', belt: 0 },
    apply(s) {
      const c = Array.isArray(s.led) ? s.led : (COL[s.led] || COL.off), lit = s.led !== 'off';
      lens.material.color.setRGB(c[0], c[1], c[2]); spill.material.color.setRGB(c[0], c[1], c[2]); spill.visible = lit;
      const bt = s.belt || 0; spliceU.value = ((0.3 * beltFlat + bt) % LOOP + LOOP) % LOOP; beltMat.normalMap.offset.x = -(((bt / TILE) % 1) + 1) % 1;
      const k = K.clamp(s.wave || 0), op = K.clamp(k / 0.08) * Math.pow(1 - k, 1.35);
      ring.visible = op > 0.004;
      if (ring.visible) { ring.position.y = TOP + 0.003 + 0.12 * k; ringMat.uniforms.uR.value = 0.04 + 0.16 * k; ringMat.uniforms.uW.value = 0.0024 + 0.0012 * k; ringMat.uniforms.uO.value = op; }
    },
    demo(s, t) { const w = t < 2 ? 0 : ((t - 2) % 3.1) / 3.1; s.wave = w; s.led = (w > 0 && w < 0.5) ? 'white' : 'green'; s.belt = 0.07 * t; },
  };
});
