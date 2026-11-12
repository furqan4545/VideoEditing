// Two models for the "washed again and again, month after month" beat. Both register from this one file.
//
// 'washer'    a front-loading washing machine, real size: 0.60 m wide, 0.85 m high, 0.58 m deep (the door stands 3 cm proud).
//             White cabinet with a worktop on a dark seam, a control strip (detergent drawer with a recessed grip, programme
//             dial, small dark display, buttons), a big round door (chrome ring, black inner ring, bulging glass, handle),
//             a kick panel with a filter cap, four feet, and a real back (service plate, transport-bolt caps, water inlet,
//             drain stub, rating label). Behind the glass: a pressed stainless drum (rolled mouth, rows of holes, a back wall
//             with a raised ring and three pressed ribs, painted darker toward the back) inside a dark tub, three grey lifter
//             paddles, a bundle of jeans (waistband, button, belt loops, back pocket, two hemmed legs; twill print, small
//             wrinkles, pale wear on the fold backs) and a little water.
//   state:  spin   radians. 0 = the jeans lie at the bottom. The drum turns clockwise seen from the front. The jeans ride up the left side ahead of a rib,
//                  let go near the top, turn over in the air and land on the right: one full tumble every 4*PI/3 of spin
//                  (two ribs). About 5 rad/s is a real wash; the pose depends on the angle only.
//           water  0..1   how high the water stands in the drum (0 = none; below about 0.1 it hides under the door's rim)
//           dial   radians, the programme dial's pointer (0 = straight up)
//   options: { jeans: false } an empty drum; { glass: false } no door glass (for a camera that goes inside);
//            preview only: { set: { spin: 1, water: 0.6 } } holds a state, { view: {...} } replaces the six preview views.
//
// 'calendar'  a desk flip calendar on a small black tent stand, 0.18 m wide, 0.22 m high: white pages on two steel rings.
//   state:  flip   0..1   the DECEMBER page lifts from its bottom edge, goes up and over the rings and lands on the back of
//                  the stand; JANUARY is under it. Linear in flip: ease it in the shot. The sheet in the air is shaded as
//                  paper (a shade greyer on its plain back, the print showing through faintly), so it reads against the white.
//   options: { from: 'DECEMBER', to: 'JANUARY', fromStart: 1, toStart: 4, fromDays: 31, toDays: 31 }  (start: weekday of the 1st, 0 = Monday);
//            preview only: { set: { flip: 0.4 } }, { view: {...} }.
(function () {
  const T = THREE, TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;

  // ------------------------------------------------------------------ geometry helpers (build time only)
  // a surface from P(u, v, target): (nu+1) x (nv+1) vertices, smooth normals, seam and poles welded
  function grid(nu, nv, P, { closeU = false, pole0 = false, pole1 = false, flip = false, ru = 1, rv = 1 } = {}) {
    const n = (nu + 1) * (nv + 1), pos = new Float32Array(n * 3), uv = new Float32Array(n * 2), idx = [], p = new T.Vector3();
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const k = j * (nu + 1) + i; P(i / nu, j / nv, p); pos[k * 3] = p.x; pos[k * 3 + 1] = p.y; pos[k * 3 + 2] = p.z; uv[k * 2] = i / nu * ru; uv[k * 2 + 1] = j / nv * rv;
      if (i < nu && j < nv) { const a = k, b = k + 1, c = k + nu + 1, d = c + 1; if (flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c); }
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const N = geo.attributes.normal, avg = (ks) => { let x = 0, y = 0, z = 0; for (const k of ks) { x += N.getX(k); y += N.getY(k); z += N.getZ(k); } const l = Math.hypot(x, y, z) || 1; for (const k of ks) N.setXYZ(k, x / l, y / l, z / l); };
    const row = (j) => Array.from({ length: nu + 1 }, (_, i) => j * (nu + 1) + i);
    if (closeU) for (let j = 0; j <= nv; j++) avg([j * (nu + 1), j * (nu + 1) + nu]);
    if (pole0) avg(row(0)); if (pole1) avg(row(nv));
    return geo;
  }
  // a soft lump of cloth: an ellipsoid with long folds across it. One family of folds (rounded backs, sharp creases) that wanders,
  // fades in and out along its length and never crosses itself, plus very fine wrinkles.
  function blob(rx, ry, rz, seed, { nu = 72, nv = 44, amp = 0.1, ru = 0.5, rv = 0.25, f = 5.5, lump = 0.07, crease = 0.55 } = {}) {
    const R = OM.rng(seed), rv3 = () => [R() - 0.5, R() - 0.5, R() - 0.5], az = R() * TAU, n = new T.Vector3(0.55 * cos(az), 0.84, 0.55 * sin(az)).normalize();
    const ph = R() * TAU, w1 = rv3(), w2 = rv3(), m1 = rv3(), k1 = rv3(), l1 = rv3(), l2 = rv3(), q1 = R() * TAU, q2 = R() * TAU, p1 = R() * TAU, p2 = R() * TAU, p3 = R() * TAU, ff = f + R() * 1.5, dot = (a, x, y, z) => a[0] * x + a[1] * y + a[2] * z;
    const low = (x, y, z) => 1 + lump * (0.6 * sin(dot(l1, x, y, z) * 4.4 + q1) + 0.4 * sin(dot(l2, x, y, z) * 6.8 + q2));   // big soft bulges: the outline is never a clean oval
    let ridge = 0;                                               // 0 in a crease, 1 on the back of a fold (kept for the colour)
    const kf = (x, y, z) => {                                    // how far the cloth stands out along the unit direction (x, y, z)
      const q = (n.x * x + n.y * y + n.z * z) * ff + ph + 2.0 * sin(dot(w1, x, y, z) * 4.2 + p1) + 1.0 * sin(dot(w2, x, y, z) * 7.1 + p2);
      const fade = 0.58 + 0.42 * sin(dot(m1, x, y, z) * 4.3 + p3);
      ridge = Math.pow(Math.abs(sin(q)), crease);
      return low(x, y, z) * (1 + amp * (fade * (ridge - 0.6) + 0.07 * sin(dot(k1, x, y, z) * 34 + p2)));
    };
    const col = [];
    const geo = grid(nu, nv, (u, v, p) => { const th = v * Math.PI, phi = u * TAU, x = sin(th) * cos(phi), y = cos(th), z = sin(th) * sin(phi), k = kf(x, y, z); p.set(x * rx * k, y * ry * k, z * rz * k);
      const wash = 1 + 0.07 * sin(dot(l2, x, y, z) * 9 + q1) + 0.05 * sin(dot(k1, x, y, z) * 15 + q2); wear(ridge, wash, col); },
      { closeU: true, pole0: true, pole1: true, ru, rv });
    geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    geo.userData.k = kf; geo.userData.low = low; geo.userData.ridge = () => ridge; return geo;
  }
  // denim's print: fine diagonal twill ribs and pale weft flecks (multiplies the cloth colour; tiles)
  function twillCanvas(seed) {
    const n = 256, cv = document.createElement('canvas'); cv.width = cv.height = n; const g = cv.getContext('2d'), R = OM.rng(seed), im = g.createImageData(n, n), d = im.data;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const v = 230 + 17 * sin((x + y) * TAU / 4) + (R() - 0.5) * 18, i = (y * n + x) * 4; d[i] = v - 2; d[i + 1] = v; d[i + 2] = v + 3; d[i + 3] = 255; }
    g.putImageData(im, 0, 0); g.lineCap = 'round';
    for (let i = 0; i < 900; i++) { const x = R() * n, y = R() * n, L = 2 + R() * 6; g.strokeStyle = `rgba(255,255,255,${0.10 + R() * 0.22})`; g.lineWidth = 0.8 + R() * 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y - L); g.stroke(); }
    for (let i = 0; i < 320; i++) { const x = R() * n, y = R() * n, L = 3 + R() * 9; g.strokeStyle = `rgba(18,28,58,${0.05 + R() * 0.10})`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + L, y - L); g.stroke(); }
    return cv;
  }
  // the small wrinkles of wet cloth: soft-edged creases in three wandering families that fade in and out, as a tangent-space normal map (tiles)
  function wrinkleCanvas(seed, n = 512, s = 30) {
    const R = OM.rng(seed), H = new Float32Array(n * n), w = TAU / n, ri = (a, b) => a + Math.floor(R() * (b - a + 1));
    const fam = [[2, 1, 1.0], [-1, 3, 0.72], [4, -3, 0.36]].map(([kx, ky, a]) => ({ kx, ky, a, p: R() * TAU, ax: ri(1, 2), ay: ri(-2, -1), bx: ri(2, 3), by: ri(2, 3), q1: R() * TAU, q2: R() * TAU, mx: ri(-1, 1), my: ri(1, 2), mq: R() * TAU }));
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let h = 0;
      for (const f of fam) { const q = 0.5 * w * (f.kx * x + f.ky * y) + f.p + 1.1 * sin(w * (f.ax * x + f.ay * y) + f.q1) + 0.5 * sin(w * (f.bx * x - f.by * y) + f.q2);
        const c = Math.abs(sin(q)); h += f.a * Math.pow(0.5 + 0.5 * sin(w * (f.mx * x + f.my * y) + f.mq), 1.4) * (c * c / (c * c + 0.045)); }   // a crease with a rounded bottom and broad flat backs
      H[y * n + x] = h; }
    const cv = document.createElement('canvas'); cv.width = cv.height = n; const g = cv.getContext('2d'), im = g.createImageData(n, n), d = im.data, at = (x, y) => H[((y + n) % n) * n + (x + n) % n];
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { let nx = -s * (at(x + 1, y) - at(x - 1, y)) / 2 + (R() - 0.5) * 0.05, ny = s * (at(x, y + 1) - at(x, y - 1)) / 2 + (R() - 0.5) * 0.05; const m = Math.hypot(nx, ny);
      if (m > 1.1) { nx *= 1.1 / m; ny *= 1.1 / m; } const l = Math.hypot(nx, ny, 1), i = (y * n + x) * 4; d[i] = 127.5 + 127.5 * nx / l; d[i + 1] = 127.5 + 127.5 * ny / l; d[i + 2] = 127.5 + 127.5 / l; d[i + 3] = 255; }
    g.putImageData(im, 0, 0); return cv;
  }
  // denim wears pale on the back of every fold and stays deep in the creases. r: 0 = crease .. 1 = fold back; w: slow wash variation about 1
  function wear(r, w, out) { const k = Math.pow(r, 1.6); out.push(w * (0.64 + 0.66 * k), w * (0.66 + 0.60 * k), w * (0.73 + 0.44 * k)); }
  const plain = (geo, v = 1) => { const n = geo.attributes.position.count, c = new Float32Array(n * 3).fill(v); geo.setAttribute('color', new T.BufferAttribute(c, 3)); return geo; };   // a part with no folds of its own
  // a soft flat band swept along a path. pts: [[x,y,z],...]; nrm: which way its flat side faces at each point; hw / hh: half width / half thickness
  // tone(edge 0..1, v) -> [wear 0..1, wash]: paints denim wear on the band (edge = 1 on its two folded edges)
  function ribbon(pts, nrm, hw, hh, { nu = 32, nv = 72, e = 2.8, cap0 = 0, cap1 = 0, wf = null, hf = null, ru = 1, rv = 1, tone = null } = {}) {
    const cp = new T.CatmullRomCurve3(pts.map(p => new T.Vector3(p[0], p[1], p[2])), false, 'catmullrom', 0.5), cn = new T.CatmullRomCurve3(nrm.map(p => new T.Vector3(p[0], p[1], p[2])), false, 'catmullrom', 0.5);
    const c = new T.Vector3(), t = new T.Vector3(), n = new T.Vector3(), b = new T.Vector3();
    const frame = (v) => { v = Math.min(1, Math.max(0, v)); cp.getPoint(v, c); cp.getTangent(v, t); cn.getPoint(v, n); b.crossVectors(t, n).normalize(); n.crossVectors(b, t).normalize(); };
    const capK = (v) => { let k = 1; if (cap0 > 0 && v < cap0) k *= Math.sqrt(1 - Math.pow(1 - v / cap0, 2)); if (cap1 > 0 && v > 1 - cap1) k *= Math.sqrt(1 - Math.pow(1 - (1 - v) / cap1, 2)); return Math.max(k, 1e-4); };
    const sp = (x) => Math.sign(x) * Math.pow(Math.abs(x), 2 / e);
    const col = [];
    const geo = grid(nu, nv, (u, v, p) => { frame(v); const a = u * TAU, k = capK(v), w = hw * k * (wf ? wf(v) : 1), h = hh * k * (hf ? hf(v) : 1); p.copy(c).addScaledVector(b, sp(cos(a)) * w).addScaledVector(n, sp(sin(a)) * h);
      if (tone) { const tn = tone(Math.abs(cos(a)), v); wear(tn[0], tn[1], col); } },
      { closeU: true, pole0: cap0 > 0, pole1: cap1 > 0, flip: true, ru, rv });
    if (tone) geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    // a point on the band's flat face: x = -1..1 across the width, side = +1 (the face nrm points to) or -1, lift = metres off the cloth
    const at = (x, v, side = 1, lift = 0) => { frame(v); const k = capK(v), w = hw * k * (wf ? wf(v) : 1), h = hh * k * (hf ? hf(v) : 1), y = h * Math.pow(Math.max(0, 1 - Math.pow(Math.abs(x), e)), 1 / e);
      return { p: c.clone().addScaledVector(b, x * w).addScaledVector(n, side * (y + lift)), c: c.clone(), t: t.clone(), n: n.clone().multiplyScalar(side), b: b.clone(), w, h }; };
    return { geo, at };
  }
  // a profile [[r, z], ...] turned around the Z axis. Walk the profile with the outside on your right.
  const lathe = (pts, seg = 96) => new T.LatheGeometry(pts.map(p => new T.Vector2(Math.max(p[0], 0), p[1])), seg).rotateX(Math.PI / 2);
  const spline = (pts, n = 40) => new T.SplineCurve(pts.map(p => new T.Vector2(p[0], p[1]))).getPoints(n).map(p => [p.x, p.y]);
  // an outline pushed out along Z with a rounded edge; the result spans z = 0 .. depth. A hole is [cx, cy, r] or a list of points.
  function slab(pts, depth, bevel, holes = [], bs = 6, cs = 72) {
    const sh = new T.Shape(pts.map(p => new T.Vector2(p[0], p[1])));
    for (const h of holes) { const c = new T.Path(); if (Array.isArray(h[0])) c.setFromPoints(h.map(p => new T.Vector2(p[0], p[1]))); else c.absarc(h[0], h[1], h[2], 0, TAU, true); sh.holes.push(c); }
    const g = new T.ExtrudeGeometry(sh, { depth: depth - 2 * bevel, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: bs, curveSegments: cs }); g.translate(0, 0, bevel); return g;
  }
  // small sewn stitches: one dash per frame { p, t (along the dash), n (off the cloth) }
  function dashes(K, list, color, len = 0.0030, w = 0.00078) {
    const m = new T.InstancedMesh(new T.CylinderGeometry(w / 2, w / 2, len, 5, 1).rotateZ(Math.PI / 2).scale(1, 0.7, 1), K.mat.clay(color, 0.85), list.length), M = new T.Matrix4(), z = new T.Vector3();
    const y = new T.Vector3();
    list.forEach((f, i) => { z.crossVectors(f.t, f.n).normalize(); y.crossVectors(z, f.t).normalize(); M.makeBasis(f.t, y, z); M.setPosition(f.p); m.setMatrixAt(i, M); });
    m.castShadow = false; m.receiveShadow = true; return m;
  }
  const place = (m, x, y, z, p) => { m.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(x, y, z)); m.position.copy(p); return m; };

  // ================================================================== the washing machine
  KIT.asset('washer', (K, o = {}) => {
    const g = new T.Group(), rb = (w, h, d, r, seg = 2) => K.geo.rbox(w, h, d, r, seg);   // light rounded boxes: the kit's default of 4 segments is about 1000 triangles each
    const W = 0.60, H = 0.85, D = 0.58, FOOT = 0.018, TOPT = 0.026, SEAM = 0.003;
    const BW = W - 0.004, BY0 = FOOT, BY1 = H - TOPT - SEAM, BH = BY1 - BY0, BYC = (BY0 + BY1) / 2;      // the cabinet
    const ZB = -D / 2 + 0.004, ZF0 = D / 2 - 0.018, PAN = 0.008, ZF = ZF0 + PAN;                          // cabinet back, cabinet front, door panel front
    const DY = 0.425, RO = 0.245, RG = 0.186, RT = 0.238;                                                 // door axis height, door radius, glass radius, hole in the cabinet
    const DR0 = 0.214, DR1 = 0.186, DL = 0.30, ZD0 = ZF0 - 0.030, ZD1 = ZD0 - DL, SLOPE = (DR0 - DR1) / DL;   // drum: radius front / back, length
    const enamel = K.mat.plastic('#f0f3f8', 0.36), topMat = K.mat.clay('#c3c6cb', 0.62), ctrlMat = K.mat.plastic('#e9ecf1', 0.46);
    const seamMat = K.mat.clay('#74767a', 0.9), chrome = K.mat.metal('#eef0f3', 0.1), satin = K.mat.metal('#cfd2d7', 0.34), blackGloss = K.mat.gloss(K.col.black, 0.2), ink = K.mat.rubber('#1c1d20');

    // ---- cabinet: one enamelled shell with the drum tunnel through it, a back panel, a worktop on a thin dark seam
    const cab = slab(K.geo.rrect(BW - 0.022, BH - 0.022, 0.005, 10), ZF0 - ZB, 0.011, [[0, DY - BYC, RT]], 6, 72); cab.translate(0, BYC, ZB); g.add(K.mesh(cab, enamel));
    g.add(K.mesh(rb(BW - 0.06, BH - 0.07, 0.006, 0.002), K.mat.plastic('#e2e5ea', 0.5), { pos: [0, BYC, ZB - 0.001] }));
    { const zb = ZB - 0.004, greyP = K.mat.plastic('#c9ccd1', 0.5), capP = K.mat.plastic('#9a9da3', 0.5), back = (m) => { m.rotation.y = Math.PI; return m; };
      g.add(K.mesh(rb(0.34, 0.25, 0.004, 0.012), K.mat.plastic('#d9dce1', 0.5), { pos: [0, 0.475, zb - 0.001] }));                                  // service plate
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) g.add(K.mesh(K.geo.cyl(0.0042, 0.002, 16), satin, { pos: [sx * 0.155, 0.475 + sy * 0.110, zb - 0.0035], rot: [Math.PI / 2, 0, 0] }));
      const cap = lathe([[0.0175, 0], [0.0175, 0.0030], [0.0160, 0.0046], [0.0070, 0.0052], [0, 0.0052]], 40);
      for (const [x, y] of [[-0.215, 0.660], [0.215, 0.660], [0, 0.250]]) g.add(back(K.mesh(cap, capP, { pos: [x, y, zb] })));                                     // transport-bolt caps
      g.add(K.mesh(K.geo.cyl(0.0125, 0.020, 32), greyP, { pos: [0.205, 0.775, zb - 0.008], rot: [Math.PI / 2, 0, 0] }));                                // water inlet (3/4 inch thread)
      for (let i = 0; i < 4; i++) g.add(K.mesh(new T.TorusGeometry(0.0127, 0.0011, 8, 32), greyP, { pos: [0.205, 0.775, zb - 0.006 - i * 0.0032] }));
      g.add(K.mesh(K.geo.cyl(0.017, 0.006, 6), greyP, { pos: [0.205, 0.775, zb - 0.001], rot: [Math.PI / 2, 0, 0] }));
      g.add(K.mesh(K.geo.cyl(0.0135, 0.024, 32), K.mat.rubber('#2a2b2e'), { pos: [-0.205, 0.130, zb - 0.010], rot: [Math.PI / 2, 0, 0] }));             // drain stub
      g.add(K.mesh(K.geo.cyl(0.0165, 0.006, 32), K.mat.rubber('#2a2b2e'), { pos: [-0.205, 0.130, zb - 0.002], rot: [Math.PI / 2, 0, 0] }));
      const plate = K.canvasPlane(0.105, 0.060, 4000, (c, Wp, Hp) => { const m = Wp / 0.105; c.fillStyle = '#e9e8e4'; c.fillRect(0, 0, Wp, Hp); c.fillStyle = '#4a4c50'; c.textBaseline = 'middle';
        c.font = `500 ${Math.round(0.0052 * m)}px ${K.FONT}`; c.fillText('8 kg   1400 rpm', 0.006 * m, 0.010 * m); c.font = `400 ${Math.round(0.0036 * m)}px ${K.FONT}`; c.fillStyle = '#6d7076';
        ['220-240 V   50 Hz   10 A', '2100 W   IPX4', '0.05-1.0 MPa', 'Type WM 8140'].forEach((t, i) => c.fillText(t, 0.006 * m, (0.022 + i * 0.0085) * m));
        c.fillStyle = '#2b2c2f'; for (let i = 0; i < 38; i++) { const w = (1 + (i * 7) % 3) * 0.00045 * m; c.fillRect((0.064 + i * 0.00092) * m, 0.018 * m, w * 0.6, 0.030 * m); } }, { lit: true });
      plate.position.set(0.170, 0.160, zb - 0.0002); plate.rotation.y = Math.PI; plate.receiveShadow = true; g.add(plate); }
    for (const sx of [-1, 1]) g.add(K.mesh(rb(0.004, BH - 0.14, ZF0 - ZB - 0.12, 0.002), enamel, { pos: [sx * (BW / 2 - 0.0005), BYC, (ZB + ZF0) / 2] }));   // pressed side panels
    g.add(K.mesh(rb(BW - 0.008, SEAM + 0.004, ZF0 - ZB + 0.004, 0.001), seamMat, { pos: [0, BY1 + SEAM / 2, (ZB + ZF0) / 2 + 0.004] }));
    g.add(K.mesh(rb(W, TOPT, D, 0.007, 4), topMat, { pos: [0, H - TOPT / 2, 0] }));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const x = sx * (BW / 2 - 0.05), z = sz > 0 ? ZF0 - 0.05 : ZB + 0.05;
      g.add(K.mesh(K.geo.cyl(0.024, 0.011, 32, 0.021), K.mat.rubber('#141517'), { pos: [x, 0.0055, z] }));
      g.add(K.mesh(K.geo.cyl(0.013, 0.008, 6), satin, { pos: [x, 0.015, z] })); }

    // ---- front: kick panel, door panel, control strip, with a dark seam between them
    const FW = BW - 0.010, KY0 = BY0 + 0.008, KH = 0.092, FY0 = KY0 + KH + SEAM, CH = 0.100, CY1 = BY1 - 0.002, CY0 = CY1 - CH, CYC = (CY0 + CY1) / 2, FY1 = CY0 - SEAM, FH = FY1 - FY0, FYC = (FY0 + FY1) / 2, ZC = ZF0 + 0.012;
    const fas = slab(K.geo.rrect(FW - 0.005, FH - 0.005, 0.004, 8), PAN, 0.0025, [[0, DY - FYC, RT - 0.004]], 4, 72); fas.translate(0, FYC, ZF0); g.add(K.mesh(fas, enamel));
    g.add(K.mesh(rb(FW, KH, 0.006, 0.0025), enamel, { pos: [0, KY0 + KH / 2, ZF0 + 0.003] }));
    g.add(K.mesh(rb(FW, CH, 0.012, 0.005, 3), ctrlMat, { pos: [0, CYC, ZF0 + 0.006] }));
    for (const y of [FY0 - SEAM / 2, FY1 + SEAM / 2]) g.add(K.mesh(rb(FW - 0.004, SEAM + 0.002, 0.003, 0.0008), seamMat, { pos: [0, y, ZF0 + 0.0012] }));
    // filter cap on the kick panel
    const KX = 0.205, KYC = KY0 + KH / 2, KZ = ZF0 + 0.006;
    g.add(K.mesh(K.geo.cyl(0.0346, 0.002, 64), seamMat, { pos: [KX, KYC, KZ], rot: [Math.PI / 2, 0, 0] }));
    g.add(K.mesh(lathe([[0.0332, -0.001], [0.0332, 0.0010], [0.0318, 0.0026], [0.028, 0.0034], [0, 0.0036]], 64), enamel, { pos: [KX, KYC, KZ] }));
    g.add(K.mesh(rb(0.024, 0.0042, 0.002, 0.001), seamMat, { pos: [KX, KYC + 0.019, KZ + 0.0032] }));

    // ---- control strip: detergent drawer with a recessed grip, programme dial, display, buttons
    const DWW = 0.165, DWH = 0.076, DWX = -FW / 2 + 0.010 + DWW / 2;
    const dw = slab(K.geo.rrect(DWW - 0.003, DWH - 0.003, 0.004, 8), 0.0045, 0.0015, [K.geo.rrect(0.080, 0.017, 0.0084, 10).map(p => [p[0], p[1] - 0.019])], 4, 24); dw.translate(DWX, CYC, ZC); g.add(K.mesh(dw, enamel));
    g.add(K.mesh(rb(0.082, 0.019, 0.0012, 0.0005), K.mat.clay('#a3a5a7', 0.9), { pos: [DWX, CYC - 0.019, ZC + 0.0004] }));
    const DX = -0.012, dialG = new T.Group(); dialG.position.set(DX, CYC, ZC); g.add(dialG);
    dialG.add(K.mesh(lathe([[0.0372, 0], [0.0372, 0.0016], [0.0358, 0.0028], [0.031, 0.0028], [0.031, 0]], 96), K.mat.gloss('#2a2c30', 0.3)));
    const knob = new T.Group(); dialG.add(knob);
    knob.add(K.mesh(lathe(spline([[0.0300, 0.0005], [0.0300, 0.013], [0.0290, 0.0185], [0.0258, 0.0218], [0.019, 0.0230], [0.009, 0.0234], [0, 0.0235]], 20), 72), satin));
    knob.add(K.mesh(rb(0.0028, 0.012, 0.0016, 0.0007), ink, { pos: [0, 0.0185, 0.0226] }));
    { const NR = 44, grip = new T.InstancedMesh(rb(0.0017, 0.0016, 0.0105, 0.0007, 1), satin, NR), d = new T.Object3D();      // grip ridges around the knob
      for (let i = 0; i < NR; i++) { const a = i * TAU / NR; d.position.set(0.0300 * cos(a), 0.0300 * sin(a), 0.0072); d.rotation.set(0, 0, a + Math.PI / 2); d.updateMatrix(); grip.setMatrixAt(i, d.matrix); } grip.castShadow = true; grip.receiveShadow = true; knob.add(grip); }
    const print = K.canvasPlane(0.20, 0.092, 6000, (c, Wp, Hp) => {
      const m = Wp / 0.20, cx = Wp / 2, cy = Hp / 2; c.clearRect(0, 0, Wp, Hp); c.fillStyle = '#54575c';
      for (let i = 0; i < 12; i++) { const a = i * TAU / 12; c.beginPath(); c.arc(cx + sin(a) * 0.0425 * m, cy - cos(a) * 0.0425 * m, (i % 3 ? 0.0007 : 0.0011) * m, 0, 7); c.fill(); }
      c.font = `400 ${Math.round(0.0040 * m)}px ${K.FONT}`; c.textBaseline = 'middle';
      const L = ['Cotton', 'Eco 40-60', 'Synthetics', 'Delicates'], Rr = ['Wool', 'Quick 15', 'Rinse', 'Spin'];
      for (let i = 0; i < 4; i++) { const y = cy + (i - 1.5) * 0.0165 * m; c.textAlign = 'right'; c.fillText(L[i], cx - 0.053 * m, y); c.textAlign = 'left'; c.fillText(Rr[i], cx + 0.053 * m, y); }
    }, { lit: true });
    print.material.transparent = true; print.material.depthWrite = false; print.position.set(DX, CYC, ZC + 0.0002); print.receiveShadow = true; g.add(print);
    const SX = 0.150;
    g.add(K.mesh(rb(0.096, 0.040, 0.003, 0.0045), blackGloss, { pos: [SX, CYC + 0.012, ZC + 0.0004] }));
    const disp = K.canvasPlane(0.088, 0.032, 9000, (c, Wp, Hp) => { const m = Wp / 0.088; c.clearRect(0, 0, Wp, Hp); c.fillStyle = '#eef1f3'; c.textBaseline = 'middle'; c.textAlign = 'left';
      c.font = `300 ${Math.round(0.0195 * m)}px ${K.FONT}`; c.fillText('1:28', 0.006 * m, Hp * 0.54);
      c.fillStyle = '#9da2a8'; c.font = `400 ${Math.round(0.0062 * m)}px ${K.FONT}`; c.textAlign = 'right'; c.fillText('40°', Wp - 0.006 * m, Hp * 0.31); c.fillText('1400', Wp - 0.006 * m, Hp * 0.71); });
    disp.material.transparent = true; disp.material.depthWrite = false; disp.position.set(SX, CYC + 0.012, ZC + 0.0021); g.add(disp);
    for (let i = 0; i < 4; i++) g.add(K.mesh(rb(0.017, 0.0072, 0.003, 0.0034), K.mat.plastic('#d9dce1', 0.42), { pos: [SX + (i - 1.5) * 0.025, CYC - 0.027, ZC + 0.0004] }));
    const BX = 0.250;
    g.add(K.mesh(lathe([[0.0162, 0], [0.0162, 0.0022], [0.0150, 0.0034], [0.0128, 0.0034], [0.0128, 0]], 64), chrome, { pos: [BX, CYC, ZC] }));
    g.add(K.mesh(lathe([[0.0127, 0], [0.0127, 0.0020], [0.0118, 0.0027], [0, 0.0028]], 64), K.mat.plastic('#f0f3f8', 0.4), { pos: [BX, CYC, ZC] }));
    const icon = K.canvasPlane(0.016, 0.016, 12000, (c, Wp, Hp) => { c.clearRect(0, 0, Wp, Hp); c.fillStyle = '#5a5d62'; const u = Wp / 16; c.beginPath(); c.moveTo(4.2 * u, 4.6 * u); c.lineTo(8.2 * u, 8 * u); c.lineTo(4.2 * u, 11.4 * u); c.closePath(); c.fill(); c.fillRect(9.4 * u, 4.8 * u, 1.1 * u, 6.4 * u); c.fillRect(11.4 * u, 4.8 * u, 1.1 * u, 6.4 * u); }, { lit: true });
    icon.material.transparent = true; icon.material.depthWrite = false; icon.position.set(BX, CYC, ZC + 0.003); g.add(icon);

    // ---- door: chrome ring, black inner ring, glass bowl, handle, hinge cover, the grey rubber seal behind the glass
    const DG = new T.Group(); DG.position.set(0, DY, ZF); g.add(DG);
    DG.add(K.mesh(lathe(spline([[RO, 0], [RO + 0.0008, 0.011], [RO - 0.002, 0.021], [RO - 0.009, 0.0282], [RO - 0.018, 0.030], [RO - 0.026, 0.0282], [RO - 0.0315, 0.0225], [RO - 0.033, 0.015], [RO - 0.033, 0.004]], 28), 108), chrome));
    DG.add(K.mesh(lathe(spline([[RO - 0.0325, 0.0170], [RO - 0.039, 0.0130], [RO - 0.049, 0.0112], [RG + 0.0006, 0.0106]], 12), 120), blackGloss));
    const dome = []; for (let i = 0; i <= 22; i++) { const a = i / 22 * Math.PI / 2; dome.push([(RG + 0.0025) * Math.pow(cos(a), 0.8), 0.0080 + 0.0365 * Math.pow(sin(a), 0.8)]); }   // its rim is seated behind the black ring: the bowl rises out of the ring through a clean crossing, nothing coplanar
    const domeGeo = lathe(dome, 96), glass = K.mesh(domeGeo, K.mat.glass(0.13, '#4c5257'), { cast: false, receive: false, soft: true }); glass.renderOrder = 3; DG.add(glass);
    // what the glass mirrors (softboxes, the bright rim at grazing angles) is added on top of what you see through it
    const sheen = K.mesh(domeGeo, new T.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.16, metalness: 0, envMapIntensity: 1.15, transparent: true, blending: T.AdditiveBlending, depthWrite: false }), { cast: false, receive: false, soft: true }); sheen.renderOrder = 4; DG.add(sheen);
    if (o.glass === false) glass.visible = sheen.visible = false;
    DG.add(K.mesh(lathe(spline([[RG + 0.001, 0.0100], [0.181, 0.002], [0.1765, -0.011], [0.1805, -0.021], [0.1768, -0.032], [0.172, -0.0385]], 16), 96), K.mat.rubber('#6c6f74')));
    const arc = (r, a0, a1, z, n = 9) => Array.from({ length: n }, (_, i) => { const a = a0 + (a1 - a0) * i / (n - 1); return [r * cos(a), r * sin(a), z]; }), zz = (n) => Array.from({ length: n }, () => [0, 0, 1]);
    DG.add(K.mesh(ribbon(arc(RO - 0.003, -0.26, 0.26, 0.0235), zz(9), 0.0185, 0.0098, { nu: 28, nv: 48, e: 3.6, cap0: 0.10, cap1: 0.10 }).geo, satin));                       // handle at 3 o'clock
    DG.add(K.mesh(ribbon(arc(RO + 0.0142, -0.17, 0.17, 0.0235), zz(9), 0.0028, 0.0052, { nu: 12, nv: 28, e: 2.4, cap0: 0.12, cap1: 0.12 }).geo, ink));                       // its finger slot
    DG.add(K.mesh(ribbon(arc(RO + 0.003, Math.PI - 0.30, Math.PI + 0.30, 0.008), zz(9), 0.0125, 0.008, { nu: 20, nv: 40, e: 3.6, cap0: 0.08, cap1: 0.08 }).geo, enamel));   // hinge cover at 9 o'clock

    // ---- drum: perforated steel, three lifter ribs, a pressed back wall. Turns around Z.
    const drum = new T.Group(); drum.position.set(0, DY, 0); g.add(drum);
    // Stainless steel you look INTO: it mirrors the studio, so the depth is painted in (bright at the mouth, dark at the back).
    const steel = new T.MeshStandardMaterial({ color: new T.Color('#9c9fa5'), metalness: 1, roughness: 0.31, envMapIntensity: 0.78, side: T.DoubleSide, vertexColors: true });
    steel.bumpMap = K.canvasTex(K.noiseCanvas(256, 29, 'brushed'), { srgb: false, repeat: 2 }); steel.bumpScale = 0.25;
    const shade = (geo, f) => { const P = geo.attributes.position, c = new Float32Array(P.count * 3); for (let i = 0; i < P.count; i++) { const v = f(P.getX(i), P.getY(i), P.getZ(i)); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = v; } geo.setAttribute('color', new T.BufferAttribute(c, 3)); return geo; };
    const DEEP = 0.36, ZM = (ZD0 + ZD1) / 2, wall = new T.CylinderGeometry(DR0, DR1, DL, 144, 8, true); wall.rotateX(Math.PI / 2); wall.translate(0, 0, ZM);
    drum.add(K.mesh(shade(wall, (x, y, z) => DEEP + (1 - DEEP) * Math.pow(K.clamp((z - ZD1) / DL), 1.35)), steel));
    // the mouth: the sheet rolls inward to a lip; the door seal's own lip sits just inside it (no see-through gap, no crossing surfaces)
    drum.add(K.mesh(shade(lathe([[DR0 - SLOPE * 0.008, -0.008], [DR0 - 0.0006, -0.0035], [DR0 - 0.003, -0.0005], [DR0 - 0.008, 0.0012], [0.182, 0.0014], [0.178, 0.0004], [0.1755, -0.002], [0.1748, -0.006]], 120), () => 0.5), steel, { pos: [0, 0, ZD0] }));
    // the fixed tub around the drum: dark, so any gap you can look into is a shadow and never the white cabinet
    { const tubMat = new T.MeshStandardMaterial({ color: new T.Color('#232427'), roughness: 0.8, metalness: 0, side: T.DoubleSide });
      const tub = new T.CylinderGeometry(0.2335, 0.2335, DL + 0.022, 72, 1, true); tub.rotateX(Math.PI / 2); g.add(K.mesh(tub, tubMat, { pos: [0, DY, ZD0 + 0.008 - (DL + 0.022) / 2], cast: false }));
      g.add(K.mesh(new T.RingGeometry(0.178, 0.2335, 96), tubMat, { pos: [0, DY, ZD0 + 0.008], cast: false }));
      g.add(K.mesh(new T.CircleGeometry(0.2335, 72), tubMat, { pos: [0, DY, ZD0 - DL - 0.014], cast: false })); }
    // the back wall is one pressing: a flat with a raised ring round the hub and a rounded corner up into the wall
    const backP = [[0, 0.0005], [0.048, 0.0005]]; for (let i = 0; i <= 16; i++) { const q = i / 16; backP.push([0.050 + 0.020 * q, 0.0005 + 0.0014 * (1 - cos(TAU * q))]); }
    backP.push([0.164, 0.0005]); for (let i = 1; i <= 14; i++) { const a = i / 14 * Math.PI / 2; backP.push([0.164 + 0.0232 * sin(a), 0.0005 + 0.022 * (1 - cos(a))]); }
    const backTone = (x, y) => 0.60 - 0.20 * Math.pow(Math.hypot(x, y) / 0.187, 2);
    drum.add(K.mesh(shade(lathe(backP, 96), backTone), steel, { pos: [0, 0, ZD1] }));
    drum.add(K.mesh(shade(lathe(spline([[0.044, 0], [0.040, 0.003], [0.032, 0.0062], [0.016, 0.0078], [0, 0.008]], 20), 72), () => 0.66), steel, { pos: [0, 0, ZD1] }));
    // three pressed stiffening ribs on the back wall: long soft ovals that rise out of the sheet with no edge
    const ribA = [0, 1, 2].map(k => -Math.PI / 2 + k * TAU / 3), spokeA = ribA.map(a => a + Math.PI / 3);
    const boss = (a, b, h, e = 2.8) => grid(44, 10, (u, v, p) => { const t = u * TAU, cx = cos(t), sx = sin(t), k = Math.pow(Math.pow(Math.abs(cx), e) + Math.pow(Math.abs(sx), e), -1 / e); p.set(a * v * k * cx, b * v * k * sx, h * Math.pow(1 - v * v, 1.6) - 0.0004); }, { closeU: true, pole0: true });
    const bossGeo = shade(boss(0.0135, 0.045, 0.0058), (x, y, z) => 0.50 + 12 * Math.max(0, z));
    for (const a of spokeA) drum.add(K.mesh(bossGeo, steel, { pos: [cos(a) * 0.121, sin(a) * 0.121, ZD1 + 0.0005], rot: [0, 0, a - Math.PI / 2] }));
    const near = (a, list, w) => list.some(c => Math.abs(Math.atan2(sin(a - c), cos(a - c))) < w), HM = [], dm = new T.Object3D();
    for (let r = 0, z = ZD0 - 0.034; z > ZD1 + 0.030; z -= 0.0165, r++) { const rad = DR0 - SLOPE * (ZD0 - z) - 0.0005;
      for (let i = 0; i < 72; i++) { const a = (i + (r % 2) * 0.5) * TAU / 72; if (near(a, ribA, 0.235)) continue;
        dm.position.set(rad * cos(a), rad * sin(a), z); dm.lookAt(rad * cos(a) - cos(a), rad * sin(a) - sin(a), z + SLOPE); dm.updateMatrix(); HM.push(dm.matrix.clone()); } }
    dm.rotation.set(0, 0, 0);
    for (let q = 0, rad = 0.082; rad < 0.160; rad += 0.0175, q++) { const n = Math.round(TAU * rad / 0.0175);
      for (let i = 0; i < n; i++) { const a = (i + (q % 2) * 0.5) * TAU / n; if (near(a, spokeA, Math.asin(0.021 / rad))) continue; dm.position.set(rad * cos(a), rad * sin(a), ZD1 + 0.0009); dm.updateMatrix(); HM.push(dm.matrix.clone()); } }
    const holes = new T.InstancedMesh(new T.CircleGeometry(0.0020, 8), new T.MeshBasicMaterial({ color: 0x08090a }), HM.length); HM.forEach((m, i) => holes.setMatrixAt(i, m)); drum.add(holes);
    // three lifters: grey moulded paddles, rounded like an upturned hull, a row of drain slots along the crest
    const RH = 0.046, RWD = 0.036, RL = 0.25, ribK = (v) => Math.pow(1 - Math.pow(Math.abs(2 * v - 1), 4), 1 / 4), ribY = (u, v) => (RH + 0.006) * Math.pow(cos(Math.abs(1 - 2 * u) * Math.PI / 2), 0.8) * ribK(v) - 0.006;
    const ribGeo = grid(32, 48, (u, v, p) => p.set(RWD * (1 - 2 * u) * (0.72 + 0.28 * ribK(v)), ribY(u, v), (v - 0.5) * RL)), ribMat = new T.MeshPhysicalMaterial({ color: new T.Color('#505358'), roughness: 0.72, metalness: 0, specularIntensity: 0.22 })   /* matt and a step darker than the moulding really is: the studio's light is not shut out by the cabinet, so the paddle must not glow in there */, slotGeo = rb(0.0026, 0.0016, 0.019, 0.0008, 1), slotMat = K.mat.rubber('#232427');
    for (let k = 0; k < 3; k++) { const hold = new T.Group(); hold.rotation.z = k * TAU / 3; drum.add(hold);
      const rib = K.mesh(ribGeo, ribMat, { pos: [0, -((DR0 + DR1) / 2 - 0.0005), ZM], rot: [Math.atan(SLOPE), 0, 0] }); hold.add(rib);
      for (const z of [-0.076, -0.038, 0, 0.038, 0.076]) rib.add(K.mesh(slotGeo, slotMat, { pos: [0, ribY(0.5, z / RL + 0.5) - 0.0006, z], cast: false })); }

    // ---- the jeans: a soft wet bundle. Local frame: -Y lies on the drum wall, +Z faces the door.
    const ZJ = ZD0 - 0.135, RB = DR0 - SLOPE * 0.135 - 0.046, TG = new T.Group(), J = new T.Group(); let LG = new T.Group(), LG2 = new T.Group(); TG.position.set(0, DY, ZJ); g.add(TG); TG.add(J);
    if (o.jeans !== false) {
      // denim = the kit's cloth in the kit's denim blue, plus a twill print, small wrinkles and the wear painted per vertex (pale fold backs, deep creases)
      const denim = K.mat.cloth(K.col.denim).clone(); denim.map = K.canvasTex(twillCanvas(61), { repeat: 24 }); denim.vertexColors = true;
      const denimStiff = denim.clone();                                                                  // waistband and belt loops: interfaced, they keep the weave and do not wrinkle
      denim.bumpMap = null; denim.normalMap = K.canvasTex(wrinkleCanvas(83), { repeat: 10, srgb: false }); denim.normalScale = new T.Vector2(0.9, 0.9);   // the weave is in the print; the relief is the wrinkles
      const thread = '#b8b19d', V = (a) => new T.Vector3(a[0], a[1], a[2]);
      const E = [0.122, 0.060, 0.104], core = K.mesh(blob(E[0], E[1], E[2], 11, { amp: 0.125, nu: 116, nv: 72, f: 6.2, lump: 0.065 }), denim, { pos: [0, 0, -0.006], rot: [0, 0.2, 0.04] }); J.add(core);
      J.add(K.mesh(blob(0.074, 0.047, 0.080, 23, { amp: 0.14, ru: 0.34, rv: 0.17, f: 5.6, lump: 0.06 }), denim, { pos: [0.060, 0.034, -0.034], rot: [0.2, -0.5, -0.22] }));
      J.add(K.mesh(blob(0.064, 0.041, 0.058, 37, { amp: 0.14, ru: 0.3, rv: 0.15, f: 5.2, lump: 0.06 }), denim, { pos: [-0.076, 0.002, 0.056], rot: [-0.15, 0.6, 0.28] }));
      // the waistband: a stiff double band across the top, two rows of stitches, two belt loops, a steel button
      const wp = [], wn = [];
      for (let i = 0; i <= 6; i++) { const q = i / 6, az = -1.25 + 2.45 * q, el = 0.50 + 0.36 * sin(Math.PI * q), d = [cos(el) * sin(az), sin(el), cos(el) * cos(az)], k = ((i === 0 || i === 6) ? 0.93 : 1.075) * core.geometry.userData.low(d[0], d[1], d[2]);
        wp.push([d[0] * E[0] * k, d[1] * E[1] * k, d[2] * E[2] * k]); const nn = new T.Vector3(d[0] / E[0], d[1] / E[1], d[2] / E[2]).normalize(); wn.push([nn.x, nn.y, nn.z]); }
      const band = ribbon(wp, wn, 0.019, 0.0052, { nu: 24, nv: 80, e: 4, cap0: 0.03, cap1: 0.03, ru: 0.07, rv: 0.34, tone: (edge, v) => [0.50 + 0.50 * Math.pow(edge, 8), 1 + 0.05 * sin(v * 23)] }); core.add(K.mesh(band.geo, denimStiff));
      const st = []; for (const x of [-0.74, 0.74]) for (let i = 0; i < 66; i++) st.push(band.at(x, 0.06 + 0.88 * i / 65, 1, 0.0001)); core.add(dashes(K, st, thread));
      for (const v of [0.30, 0.72]) { const f = band.at(0, v, 1, 0.0014); core.add(place(K.mesh(plain(rb(0.010, 0.0032, 0.046, 0.0014), 1.0), denimStiff), f.t, f.n, f.b, f.p)); }
      { const f = band.at(0, 0.52, 1, -0.0002); core.add(place(K.mesh(lathe([[0.0086, 0], [0.0086, 0.0012], [0.0078, 0.0024], [0.0050, 0.0031], [0, 0.0033]], 32), K.mat.metal(K.col.steel, 0.3)), f.b, f.t, f.n, f.p)); }
      // a back pocket on the side that faces the door: a soft patch that follows the folds, sealed at its edge, hemmed on top, stitched all round
      { const kf = core.geometry.userData.k, az = 0.40, el = 0.0, c0 = V([cos(el) * sin(az), sin(el), cos(el) * cos(az)]), ex = V([cos(az), 0, -sin(az)]), ey = V([-sin(el) * sin(az), cos(el), -sin(el) * cos(az)]);
        const hw = (b) => b > -0.5 ? 0.9 + 0.1 * (b + 0.5) / 1.5 : 0.9 * (b + 1) / 0.5, d = new T.Vector3(), nn = new T.Vector3();
        const pk = (a, b, lift, out) => { d.copy(c0).addScaledVector(ex, a * 0.27).addScaledVector(ey, b * 0.43).normalize(); const k = kf(d.x, d.y, d.z); nn.set(d.x / E[0], d.y / E[1], d.z / E[2]).normalize();
          return out.set(d.x * E[0] * k, d.y * E[1] * k, d.z * E[2] * k).addScaledVector(nn, lift); };
        const pcol = [], rdg = core.geometry.userData.ridge;
        const pocket = grid(30, 32, (u, v, p) => { const b = 1 - 2 * v, m = Math.min(u, 1 - u, v, 1 - v); pk((2 * u - 1) * hw(b), b, 0.0004 + 0.0017 * K.ease.smooth(K.clamp(m / 0.1)), p);
          wear(Math.max(0.30 + 0.60 * rdg(), 1 - K.clamp(m / 0.07)), 1.03, pcol); }, { flip: true, pole1: true, ru: 0.045, rv: 0.05 });           // a patch of its own: worn pale along its edge
        pocket.setAttribute('color', new T.Float32BufferAttribute(pcol, 3)); core.add(K.mesh(pocket, denim));
        const fr = (a, b, a2, b2) => { const p = pk(a, b, 0.0022, new T.Vector3()), q = pk(a2, b2, 0.0022, new T.Vector3()); pk(a, b, 0, new T.Vector3()); return { p, t: q.sub(p).normalize(), n: nn.clone() }; };
        const pst = [], line = (a0, b0, a1, b1, n) => { for (let i = 0; i < n; i++) { const q = (i + 0.5) / n, e = 0.5 / n; pst.push(fr(a0 + (a1 - a0) * (q - e), b0 + (b1 - b0) * (q - e), a0 + (a1 - a0) * (q + e), b0 + (b1 - b0) * (q + e))); } };
        line(-0.84, 0.74, 0.84, 0.74, 15); line(-0.84, 0.60, 0.84, 0.60, 15); line(-0.86, 0.52, -0.78, -0.5, 12); line(-0.78, -0.5, 0, -0.86, 11); line(0, -0.86, 0.78, -0.5, 11); line(0.78, -0.5, 0.86, 0.52, 12);
        core.add(dashes(K, pst, thread)); }
      // two legs: one thrown over the top with its hemmed cuff hanging at the front right, one wrapped round the back to the front left.
      // Each is its own group so it can swing a little when the bundle turns over.
      const denim2 = denim.clone(); denim2.side = T.DoubleSide;                       // the legs are open tubes: you can see into the cuff
      const makeLeg = (lp, lc, hw, hh, seed) => { const G = new T.Group(), ln = lp.map(p => { const v = V(p).sub(V(lc)).normalize(); return [v.x, v.y, v.z]; });
        const leg = ribbon(lp, ln, hw, hh, { nu: 28, nv: 72, e: 3, cap0: 0.10, wf: v => 1 - 0.10 * sin(v * 9 + seed), hf: v => 1 + 0.16 * sin(v * 31 + 1 + seed) * (1 - v * 0.6) + (v > 0.93 ? 0.10 : 0), ru: 0.16, rv: 0.42,
          tone: (edge, v) => [Math.max(0.30 + 0.45 * (0.5 + 0.5 * sin(v * 31 + 1 + seed)) * (1 - v * 0.5), Math.pow(edge, 10), v > 0.93 ? 0.8 : 0), 1 + 0.06 * sin(v * 7 + seed * 3)] });   // pale on the pressed edges, the wrinkle backs and the hem
        G.add(K.mesh(leg.geo, denim2));
        const ls = []; for (const x of [0.50, 0.63]) for (let i = 0; i < 82; i++) ls.push(leg.at(x, 0.14 + 0.77 * i / 81, 1, 0.0001));
        for (let i = 0; i < 24; i++) { const f = leg.at(-0.86 + 1.72 * i / 23, 0.925, 1, 0.0001); ls.push({ p: f.p, t: f.b, n: f.n }); }
        G.add(dashes(K, ls, thread));
        const f = leg.at(0, 0.95), plug = K.mesh(new T.CircleGeometry(1, 40), K.mat.clay('#18243d', 0.95), { cast: false }); plug.scale.set(f.h * 0.92, f.w * 0.95, 1); G.add(place(plug, f.n, f.b, f.t, f.c)); return G; };
      LG = makeLeg([[-0.03, -0.006, -0.03], [0.012, 0.030, 0.006], [0.062, 0.020, 0.058], [0.097, -0.024, 0.094], [0.110, -0.075, 0.108], [0.113, -0.112, 0.112]], [-0.01, -0.07, -0.02], 0.047, 0.0155, 0);
      LG.position.set(0.03, 0.058, -0.03); J.add(LG);
      LG2 = makeLeg([[0.05, 0.0, 0.01], [-0.03, -0.012, -0.02], [-0.10, 0.004, 0.012], [-0.135, 0.03, 0.07], [-0.138, 0.035, 0.125], [-0.128, 0.0, 0.158], [-0.118, -0.035, 0.165]], [0.02, 0.03, 0.07], 0.044, 0.017, 2.3);
      LG2.position.set(-0.02, -0.03, -0.07); J.add(LG2);
    }

    // ---- water: a level low in the drum. A dark glossy surface, a pale soapy sheet where it stands against the door, a bright rippling line on top.
    const WG = new T.Group(), WL = new T.Group(); WG.position.set(0, DY, 0); g.add(WG); WG.add(WL);
    const WH = 0.22, WWD = 2 * DR0, NW = 40, wz0 = ZD1 + 0.002, wz1 = ZD0 - 0.002;
    const wsurf = K.mesh(new T.PlaneGeometry(WWD + 0.02, wz1 - wz0), new T.MeshStandardMaterial({ color: new T.Color('#3d4b55'), roughness: 0.16, metalness: 0, transparent: true, opacity: 0.3, depthWrite: false, envMapIntensity: 0.35, side: T.DoubleSide }),
      { cast: false, receive: false, soft: true, pos: [0, 0, (wz0 + wz1) / 2], rot: [-Math.PI / 2, 0, 0] });
    const wsheet = K.mesh(new T.PlaneGeometry(WWD, WH, NW, 1), K.mat.flat('#dfe9ee', 0.15), { cast: false, receive: false, soft: true, pos: [0, 0, wz1] });
    const wline = K.mesh(new T.PlaneGeometry(WWD, 0.002, NW, 1), K.mat.flat('#ffffff', 0.62), { cast: false, receive: false, soft: true, pos: [0, 0, wz1 + 0.0006] });
    for (const m of [wsurf, wsheet, wline]) { m.renderOrder = 2; m.frustumCulled = false; WL.add(m); }
    const WSP = wsheet.geometry.attributes.position, WLP = wline.geometry.attributes.position;

    const PER = TAU * 2 / 3, PH0 = 0.52, UA = 0.45, UB = 0.80, HB = 0.058, SP0 = PER - PH0;   // one tumble per two ribs; the bundle rides 30 degrees ahead of the rib that pushes it; SP0 puts it at rest on the bottom at spin 0
    return {
      group: g,
      size: { W, H, D, door: 2 * RO, glass: 2 * RG, drum: 2 * DR0, doorY: DY },
      anchors: { door: [0, DY, ZF + 0.045], top: [0, H, 0], dial: [DX, CYC, ZC + 0.024], drum: [0, DY, ZJ], drawer: [DWX, CYC, ZC + 0.005], display: [SX, CYC + 0.012, ZC + 0.002], front: [0, DY, ZF] },
      view: o.view || { l: [0, 0.43, 0], d: 4.4, close: [0, DY, 0.25], keys: [{ az: 0.55, el: 0.17 }, { az: -0.45, el: 0.1 }, { az: 1.5, el: 0.08 }, { az: 0.3, el: 0.95 }, { az: 0.3, el: 0.12, d: 1.9, l: [0, DY, 0.25] }, { az: -0.35, el: 0.3, d: 0.75, l: [0.03, 0.765, 0.28] }] },
      defaults: { spin: 0, water: 0.2, dial: 0 },
      demo(s, t) { s.spin = PER * (t / 2 + [0, 0.3, 0.45, 0.8, 0.37, 0.6][Math.min(5, Math.floor(t / 2))]) - SP0; s.water = [0.2, 0.7, 0.2, 0.45, 0.2, 0.2][Math.min(5, Math.floor(t / 2))]; s.dial = 0.6 * Math.floor(t / 2); if (o.set) Object.assign(s, o.set); },
      apply(s) {
        const sp = (s.spin || 0) + SP0, e = K.ease.smooth; drum.rotation.z = -sp; knob.rotation.z = -(s.dial || 0);
        // the tumble: ride the wall up the left, let go, turn over in the air, land on the right, ride back to the bottom
        const u = ((sp / PER) % 1 + 1) % 1; let x, y, rot, sx = 1, sy = 1, flap = 0;
        if (u < UA) { const ph = PH0 + u * PER, lean = e(K.clamp((ph - 1.35) / 1.0)); sy = 1 + 0.10 * lean; sx = 1 - 0.04 * lean; const r = RB - HB * (sy - 1) - 0.014 * lean; x = -r * sin(ph); y = -r * cos(ph); rot = -ph; flap = 0.25 * lean; }
        else if (u < UB) { const k = (u - UA) / (UB - UA), w = PER * (UB - UA), ph0 = PH0 + UA * PER, phL = PH0 - (1 - UB) * PER, r0 = RB - HB * 0.10 - 0.014;
          const x0 = -r0 * sin(ph0), y0 = -r0 * cos(ph0), x1 = -RB * sin(phL), y1 = -RB * cos(phL), vy = r0 * w * sin(ph0);
          x = x0 + (x1 - x0) * k; y = y0 + vy * k + (y1 - y0 - vy) * k * k; rot = -ph0 - w * k - (TAU - PER * (1 - UB + UA) - w) * k * k;
          sy = 1.10 - 0.10 * k - 0.07 * sin(Math.PI * k); sx = 0.96 + 0.04 * k + 0.10 * sin(Math.PI * k); flap = 0.25 + 0.25 * k + 0.55 * sin(Math.PI * k); }
        else { const k = (u - UB) / (1 - UB), ph = PH0 - (1 - u) * PER, sq = Math.exp(-4.5 * k) * cos(k * 7.5); sy = 1 - 0.20 * sq; sx = 1 + 0.12 * sq; const r = RB - HB * (sy - 1); x = -r * sin(ph); y = -r * cos(ph); rot = -ph - TAU; flap = 0.5 * Math.exp(-5 * k) * cos(6 * k); }
        J.position.set(x, y, 0); J.rotation.z = rot; J.scale.set(sx, sy, 1); LG.rotation.z = 0.55 * flap; LG.rotation.x = -0.12 * flap; LG2.rotation.z = -0.4 * flap; LG2.rotation.y = 0.15 * flap;
        // water: level, and a small slosh each time a rib goes through it
        const lv = K.clamp(s.water || 0); WG.visible = lv > 0.004; WG.rotation.z = 0.04 * sin(3 * sp + 0.7) * Math.min(1, lv * 4); WL.position.y = -DR0 + 0.035 + 0.10 * lv + 0.003 * sin(3 * sp + 2.1);
        if (WG.visible) { for (let i = 0; i <= NW; i++) { const xx = -WWD / 2 + WWD * i / NW, yw = 0.0028 * sin(22 * xx + 3 * sp) + 0.0016 * sin(41 * xx - 5 * sp + 1.3); WSP.setY(i, yw); WLP.setY(i, yw + 0.0011); WLP.setY(i + NW + 1, yw - 0.0011); }
          WSP.needsUpdate = true; WLP.needsUpdate = true; }
      },
    };
  });

  // ================================================================== the flip calendar
  KIT.asset('calendar', (K, o = {}) => {
    const g = new T.Group();
    const W = 0.18, AL = 0.27, LB = 0.212, TB = 0.004, BASE = 0.005;                                     // width, lean of each face, face length, board thickness
    const PW = 0.166, LP = 0.188, TP = 0.005, TPB = 0.003, GAP = 0.005, HOLE = 0.0065, RX = 0.047, LIFT = 0.00035;   // page, stacks front / back, hole from the page's top edge, ring x
    const ca = cos(AL), sa = sin(AL), HA = 0.003 + LB * ca, CY = HA - 0.002;                             // apex height, ring centre height
    const black = K.mat.plastic('#1b1c1f', 0.55), paper = K.mat.paper('#f4f2ed');
    // ---- stand: a folded black board (front face, back face, base), rounded ridge
    g.add(K.mesh(K.geo.rbox(W, BASE, 2 * LB * sa + 0.014, 0.002), black, { pos: [0, BASE / 2, 0] }));
    const FG = new T.Group(), BG = new T.Group(); FG.position.set(0, HA, 0); FG.rotation.x = -AL; BG.position.set(0, HA, 0); BG.rotation.x = AL; g.add(FG, BG);
    for (const G of [FG, BG]) G.add(K.mesh(K.geo.rbox(W, LB, TB, 0.0015), black, { pos: [0, -LB / 2, 0] }));
    g.add(K.mesh(K.geo.cyl(0.0032, W - 0.002, 24), black, { pos: [0, HA, 0], rot: [0, 0, Math.PI / 2] }));
    // ---- printing
    const months = [{ name: o.from || 'DECEMBER', start: o.fromStart ?? 1, days: o.fromDays ?? 31 }, { name: o.to || 'JANUARY', start: o.toStart ?? 4, days: o.toDays ?? 31 }], PX = 7000;
    const font = (c, wt, px) => { c.font = `${wt} ${px}px ${K.FONT}`; };
    let mpx = 0; { const c = document.createElement('canvas').getContext('2d'); font(c, 500, 100); try { c.letterSpacing = '4px'; } catch (e) {} const w = Math.max(...months.map(m => c.measureText(m.name).width)); mpx = 100 * (PW - 0.034) * PX / w; }
    const paint = (mo) => (c, Wp, Hp) => {
      const m = Wp / PW, xm = 0.017 * m, cw = (Wp - 2 * xm) / 7; c.fillStyle = '#f6f4ef'; c.fillRect(0, 0, Wp, Hp);
      c.fillStyle = '#2b2c2f'; for (const sx of [-1, 1]) { c.beginPath(); c.arc(Wp / 2 + sx * RX * m, HOLE * m, 0.0027 * m, 0, 7); c.fill(); }
      c.fillStyle = '#c9c6bf'; for (let x = 0.004; x < PW - 0.003; x += 0.0021) { c.beginPath(); c.arc(x * m, 0.0165 * m, 0.00033 * m, 0, 7); c.fill(); }     // tear-off perforation
      c.fillStyle = K.col.ink; c.textAlign = 'left'; c.textBaseline = 'alphabetic'; font(c, 500, mpx); try { c.letterSpacing = (mpx * 0.04) + 'px'; } catch (e) {} c.fillText(mo.name, xm - mpx * 0.03, 0.0605 * m);
      try { c.letterSpacing = '0px'; } catch (e) {} c.fillRect(xm, 0.0705 * m, Wp - 2 * xm, Math.max(1, 0.00028 * m));
      c.textAlign = 'center'; font(c, 400, 0.0064 * m); 'MTWTFSS'.split('').forEach((d, i) => { c.fillStyle = i > 4 ? '#a4a7ad' : '#7b7e85'; c.fillText(d, xm + (i + 0.5) * cw, 0.0865 * m); });
      font(c, 400, 0.0098 * m); for (let d = 1; d <= mo.days; d++) { const q = mo.start + d - 1, col = q % 7, rw = Math.floor(q / 7); c.fillStyle = col > 4 ? '#9c9fa5' : '#26282c'; c.fillText(String(d), xm + (col + 0.5) * cw, (0.1075 + rw * 0.0162) * m); }
    };
    // paper lets some light through: it never goes fully dark or fully white. lit = how much it answers the light, glow = its own floor
    const thin = (m, lit = 0.32, glow = 0.60) => { m.color.setRGB(lit, lit, lit); m.emissive = new T.Color(1, 1, 1); m.emissiveMap = m.map; m.emissiveIntensity = glow; return m; };
    const edge = (w, h, along) => K.canvasPlane(w, h, 30000, (c, Wp, Hp) => { c.fillStyle = '#efede7'; c.fillRect(0, 0, Wp, Hp); c.fillStyle = 'rgba(92,88,80,0.34)'; const R = OM.rng(77), n = Math.round((along ? Hp : Wp) / 5.2);
      for (let i = 1; i < n; i++) { const q = (i + (R() - 0.5) * 0.3) * 5.2; if (along) c.fillRect(0, q, Wp, 1.4); else c.fillRect(q, 0, 1.4, Hp); } }, { lit: true });
    // ---- front stack (JANUARY on top of it), the turned pages on the back
    const py = -(GAP + LP / 2);
    FG.add(K.mesh(K.geo.rbox(PW, LP, TP, 0.0005, 2), paper, { pos: [0, py, TB / 2 + TP / 2] }));
    const jan = K.canvasPlane(PW - 0.0006, LP - 0.0006, PX, paint(months[1]), { lit: true }); thin(jan.material); jan.position.set(0, py, TB / 2 + TP + 0.00008); jan.receiveShadow = true; FG.add(jan);
    { const b = edge(PW - 0.001, TP - 0.0006, true); b.rotation.x = Math.PI / 2; b.position.set(0, -(GAP + LP) - 0.00006, TB / 2 + TP / 2); FG.add(b);
      for (const sx of [-1, 1]) { const s = edge(TP - 0.0006, LP - 0.001, false); s.rotation.y = sx * Math.PI / 2; s.position.set(sx * (PW / 2 + 0.00006), py, TB / 2 + TP / 2); FG.add(s); } }
    BG.add(K.mesh(K.geo.rbox(PW, LP, TPB, 0.0005, 2), paper, { pos: [0, py, -(TB / 2 + TPB / 2)] }));
    for (const sx of [-1, 1]) BG.add(K.mesh(new T.CircleGeometry(0.0027, 24), K.mat.flat('#2b2c2f'), { cast: false, receive: false, pos: [sx * RX, -(GAP + HOLE), -(TB / 2 + TPB + 0.00006)], rot: [0, Math.PI, 0] }));
    { const b = edge(PW - 0.001, TPB - 0.0006, true); b.rotation.x = Math.PI / 2; b.position.set(0, -(GAP + LP) - 0.00006, -(TB / 2 + TPB / 2)); BG.add(b); }
    // ---- rings: the page's holes ride around them from the front (F) to the back (B)
    const hy = -(GAP + HOLE), zf = TB / 2 + TP + LIFT, zb = -(TB / 2 + TPB + LIFT);
    const F = [HA + hy * ca + zf * sa - CY, -hy * sa + zf * ca], B = [HA + hy * ca - zb * sa - CY, hy * sa + zb * ca];
    const RF = Math.hypot(F[0], F[1]), RBK = Math.hypot(B[0], B[1]), PS0 = Math.atan2(F[0], F[1]), PS1 = Math.atan2(B[0], B[1]) + TAU, RR = (RF + RBK) / 2;
    for (const sx of [-1, 1]) g.add(K.mesh(new T.TorusGeometry(RR, 0.0011, 14, 72), K.mat.metal(K.col.steel, 0.2), { pos: [sx * RX, CY, 0], rot: [0, Math.PI / 2, 0] }));
    // ---- the page that turns: a subdivided sheet, bent every frame (print on the front, plain paper on the back)
    const NX = 8, NY = 48, dec = K.canvasPlane(PW, LP, PX, paint(months[0]), { lit: true }), pageGeo = new T.PlaneGeometry(PW, LP, NX, NY);
    // The sheet in the air answers the light more than the pages lying on the stand, so its bend shades and it stands off the white paper behind it.
    thin(dec.material, 0.44, 0.42); dec.material.shadowSide = T.DoubleSide;
    // the back of the sheet: plain uncoated paper, a shade greyer, with the print showing through very faintly (mirrored, as it is in life)
    const ghost = K.canvasPlane(PW, LP, PX / 2, (c, Wp, Hp) => { const m = Wp / PW; c.drawImage(dec.userData.cv, 0, 0, Wp, Hp); c.fillStyle = 'rgba(238,236,230,0.968)'; c.fillRect(0, 0, Wp, Hp);
      const eg = 0.0011 * m; for (const [x0, y0, x1, y1, rx, ry, rw, rh] of [[0, 0, eg, 0, 0, 0, eg, Hp], [Wp, 0, Wp - eg, 0, Wp - eg, 0, eg, Hp], [0, 0, 0, eg, 0, 0, Wp, eg], [0, Hp, 0, Hp - eg, 0, Hp - eg, Wp, eg]]) {   // the cut edge of the sheet: a hair darker
        const gr = c.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(96,92,84,0.16)'); gr.addColorStop(1, 'rgba(96,92,84,0)'); c.fillStyle = gr; c.fillRect(rx, ry, rw, rh); }
      c.fillStyle = '#2b2c2f'; for (const sx of [-1, 1]) { c.beginPath(); c.arc(Wp / 2 + sx * RX * m, HOLE * m, 0.0027 * m, 0, 7); c.fill(); } }, { lit: true });
    thin(ghost.material, 0.32, 0.50).side = T.BackSide;   // answers the light less than the front, so even turned full to the key it stays a shade under the paper sweep
    const page = new T.Mesh(pageGeo, dec.material), pageBack = new T.Mesh(pageGeo, ghost.material);
    page.castShadow = true; page.receiveShadow = true; pageBack.receiveShadow = true; page.frustumCulled = pageBack.frustumCulled = false; g.add(page, pageBack);
    const PP = pageGeo.attributes.position, PN = pageGeo.attributes.normal, DS = LP / NY, LL = LP - HOLE, CURL = 0.5;
    const pageMid = [0, HA + py * ca + zf * sa, -py * sa + zf * ca];
    return {
      group: g,
      size: { W, H: CY + RR, D: 2 * LB * sa + 0.014, page: [PW, LP], lean: AL },
      anchors: { page: pageMid, month: [-0.02, HA - (GAP + 0.052) * ca + zf * sa, (GAP + 0.052) * sa + zf * ca], rings: [0, CY + RR, 0], top: [0, CY + RR, 0], base: [0, 0, 0] },
      view: o.view || { l: [0, 0.11, 0], d: 1.1, close: pageMid, keys: [{ az: 0.45, el: 0.16 }, { az: -0.5, el: 0.12 }, { az: 1.45, el: 0.08 }, { az: 0.25, el: 0.85 }, { az: 0.3, el: 0.2, d: 0.5, l: [0, 0.13, 0.02] }, { az: -0.8, el: 0.3, d: 0.26, l: [0.03, 0.2, 0] }] },
      defaults: { flip: 0 },
      demo(s, t) { const v = Math.min(5, Math.floor(t / 2)), k = (t % 2) / 2; s.flip = K.clamp((k - 0.25) * 1.6 + [0, 0.3, 0.5, 0.7, 0.15, 1][v]); if (o.set) Object.assign(s, o.set); },
      apply(s) {
        const f = K.clamp(s.flip || 0), psi = PS0 + (PS1 - PS0) * f, rr = RF + (RBK - RF) * f, th0 = AL + (TAU - 2 * AL) * f, curl = CURL * sin(TAU * f) - 0.2 * Math.pow(sin(Math.PI * f), 2);   // the free edge leads on the way up and trails on the way down
        let y = CY + rr * sin(psi) + HOLE * cos(th0), z = rr * cos(psi) - HOLE * sin(th0), k = 0;      // the page's top edge: back from the hole along the sheet
        for (let j = 0; j <= NY; j++) {
          const sj = j * DS - HOLE, th = th0 + curl * Math.pow(Math.max(0, sj) / LL, 1.4);
          if (j) { const sm = sj - DS / 2, tm = th0 + curl * Math.pow(Math.max(0, sm) / LL, 1.4); y -= DS * cos(tm); z += DS * sin(tm); }
          const ny = sin(th), nz = cos(th);
          for (let i = 0; i <= NX; i++, k++) { PP.setY(k, y); PP.setZ(k, z); PN.setXYZ(k, 0, ny, nz); }
        }
        PP.needsUpdate = true; PN.needsUpdate = true;
      },
    };
  });
})();
