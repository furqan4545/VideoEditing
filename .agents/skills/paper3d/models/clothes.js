// Two models for the shop scenes, real size in metres.
//
// 'jeans'  a neatly folded pair of new indigo jeans as sold in a shop (0.34 x 0.26 x 0.07), folded in thirds: two legs
//          lying on each other, turned twice. On top: the waistband with belt loops, the leather patch and the top
//          button, the yoke, one back pocket with arc stitching, the side seam, the front pocket and a paper size tag.
//          At the front: the big fold and the two hems under it. Inside the left end of the waistband, under a flap of
//          denim, lies the sewn-in security tag: a flat off-white square, 38 x 38 x 1.2 mm.
//   state: flap 0..1   the flap of denim above the tag turns back like a page (0 = closed, the tag cannot be seen)
//          glow 0..1   a calm thin orange ring around the square tag ("still switched on"): one steady line and one
//                      soft pulse every 2.4 s. Drawn over the cloth, so it also shows while the flap is closed
//          ghost 0..1  the flap becomes see-through (down to 15 %) so the tag shows through the cloth, off-white and unshaded
//
// 'till'   a small clothes-shop pay point: white counter (0.9 x 0.5 x 0.95) on a graphite plinth, a slim card terminal
//          on a stand, a small receipt printer, and behind it a black steel clothes rail (1.2 x 1.6) with six garments.
//   state: paid 0..1     the terminal screen goes from the amount to a check mark and "PAID"; its four status lights come on
//          receipt 0..1  (extra) a printed receipt feeds out of the printer slot
//
// preview:  tools/preview.sh jeans '' clothes      tools/preview.sh till '' clothes
//   preview extras in the options: "keys":[{az,el,d,l}, ...] replaces the six views, "s":{"flap":1, ...} forces a state,
//   and for the till "jeans":1 lays the folded jeans on the counter where the film puts them
(function () {
  const T = THREE, PI = Math.PI, UVS = 1 / 0.34;                       // cloth weave: one texture unit = 0.34 m
  const v3 = (x, y, z) => new T.Vector3(x, y, z);
  const smooth = (a, b, x) => { const k = Math.min(1, Math.max(0, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

  // cloth UVs from position, so the weave has the same size on every piece
  function planarUV(geo, ax = 'xz') {
    const p = geo.attributes.position, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) * UVS; uv[i * 2 + 1] = (ax === 'xz' ? p.getZ(i) : p.getY(i)) * UVS; }
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); return geo;
  }
  // the same for a flat block seen from above: the weave lies on the top and unfolds down the sides instead of smearing
  function clothUV(geo) {
    geo.computeBoundingBox(); const p = geo.attributes.position, n = geo.attributes.normal, top = geo.boundingBox.max.y, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      let u = p.getX(i), v = p.getZ(i); const d = top - p.getY(i), nx = n.getX(i), nz = n.getZ(i);
      if (Math.abs(nz) > Math.abs(nx)) v += Math.sign(nz) * d; else if (Math.abs(nx) > 1e-4) u += Math.sign(nx) * d;
      uv[i * 2] = u * UVS; uv[i * 2 + 1] = v * UVS;
    }
    geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); return geo;
  }
  // a skin over closed rings of points (all rings the same count). Smooth normals, optional flat caps.
  function loft(rings, { capS = false, capE = false, uvOf } = {}) {
    const n = rings.length, m = rings[0].length, pos = [], uv = [], idx = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const p = rings[i][j]; pos.push(p[0], p[1], p[2]); const q = uvOf ? uvOf(p, i, j) : [p[0] * UVS, p[1] * UVS]; uv.push(q[0], q[1]); }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < m; j++) { const j2 = (j + 1) % m, a = i * m + j, b = (i + 1) * m + j, c = i * m + j2, d = (i + 1) * m + j2; idx.push(a, b, c, b, d, c); }
    const cap = (i, flip) => {
      const base = pos.length / 3; let cx = 0, cy = 0, cz = 0; for (const p of rings[i]) { cx += p[0] / m; cy += p[1] / m; cz += p[2] / m; }
      for (const p of rings[i]) { pos.push(p[0], p[1], p[2]); uv.push(p[0] * UVS, p[1] * UVS); } pos.push(cx, cy, cz); uv.push(cx * UVS, cy * UVS);
      for (let j = 0; j < m; j++) { const j2 = (j + 1) % m; if (flip) idx.push(base + m, base + j2, base + j); else idx.push(base + m, base + j, base + j2); }
    };
    if (capS) cap(0, false); if (capE) cap(n - 1, true);
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  }
  // cross-section of a flat band with round edges: half flat width a, half thickness h
  function stadium(a, h, nT = 6, nA = 8) {
    const p = [];
    for (let k = 0; k <= nT; k++) p.push([-a + 2 * a * k / nT, h, 0, 1]);
    for (let k = 1; k < nA; k++) { const th = PI / 2 - PI * k / nA; p.push([a + h * Math.cos(th), h * Math.sin(th), Math.cos(th), Math.sin(th)]); }
    for (let k = 0; k <= nT; k++) p.push([a - 2 * a * k / nT, -h, 0, -1]);
    for (let k = 1; k < nA; k++) { const th = -PI / 2 - PI * k / nA; p.push([-a + h * Math.cos(th), h * Math.sin(th), Math.cos(th), Math.sin(th)]); }
    return p;                                                          // [x, y, nx, ny]
  }
  // a path in the ZY plane made of straight pieces and arcs: at(s) -> { z, y, tz, ty }
  function makePath(pieces) {
    let S = 0; for (const p of pieces) { p.L = p.arc ? Math.abs(p.a1 - p.a0) * p.r : Math.hypot(p.z1 - p.z0, p.y1 - p.y0); p.s0 = S; S += p.L; }
    const at = (s) => {
      let p = pieces[pieces.length - 1]; for (const q of pieces) if (s <= q.s0 + q.L) { p = q; break; }
      const k = (s - p.s0) / p.L;                                        // may run past the ends: the path carries on straight
      if (p.arc) { const a = p.a0 + (p.a1 - p.a0) * Math.min(1, Math.max(0, k)), sg = Math.sign(p.a1 - p.a0); return { z: p.zc + p.r * Math.cos(a), y: p.yc + p.r * Math.sin(a), tz: -Math.sin(a) * sg, ty: Math.cos(a) * sg }; }
      return { z: p.z0 + (p.z1 - p.z0) * k, y: p.y0 + (p.y1 - p.y0) * k, tz: (p.z1 - p.z0) / p.L, ty: (p.y1 - p.y0) / p.L };
    };
    return { S, at, pieces };
  }
  // a smooth path through 2D points [z, y]
  function curvePath(pts, n = 60) {
    const c = new T.CatmullRomCurve3(pts.map(p => v3(0, p[1], p[0])), false, 'centripetal').getSpacedPoints(n), pieces = [];
    for (let i = 0; i < n; i++) pieces.push({ z0: c[i].z, y0: c[i].y, z1: c[i + 1].z, y1: c[i + 1].y });
    return makePath(pieces);
  }
  function samples(path, { line = 0.008, arc = PI / 22, fineEnd = 0 } = {}) {
    const ss = [0];
    for (const p of path.pieces) { const n = p.arc ? Math.ceil(Math.abs(p.a1 - p.a0) / arc) : Math.max(1, Math.ceil(p.L / line)); for (let k = 1; k <= n; k++) ss.push(p.s0 + p.L * k / n); }
    for (let s = path.S - fineEnd; s < path.S; s += 0.0007) ss.push(s);
    return [...new Set(ss.map(s => +s.toFixed(6)))].sort((a, b) => a - b);
  }
  // a band (width along X, round edges) swept along a ZY path. W, th and x0 may be functions of s. endRound rounds the far end.
  function ribbon(path, ss, { x0 = 0, W, th, off = 0, endRound = 0, capS = true, capE = true }) {
    const pos = [], nor = [], uv = [], idx = [], tg = [], fn = (f, s) => typeof f === 'function' ? f(s) : f; let M = 0;
    const ring = (s, along, inset, tilt) => {
      const P = path.at(s), t = fn(th, s), h = Math.max(t / 2 - inset, 1e-5), a = fn(W, s) / 2 - t / 2, xc = fn(x0, s), pr = stadium(a, h), ct = Math.cos(tilt), st = Math.sin(tilt);
      const nz = -P.ty, ny = P.tz, z = P.z + P.tz * along + nz * off, y = P.y + P.ty * along + ny * off; let per = -a; M = pr.length + 1;
      for (let j = 0; j < M; j++) {                                      // the seam column is doubled so the weave can run right round the section
        const q = pr[j % pr.length]; if (j) { const q0 = pr[j - 1]; per += Math.hypot(q[0] - q0[0], q[1] - q0[1]); }
        pos.push(xc + q[0], y + q[1] * ny, z + q[1] * nz); nor.push(q[2] * ct, q[3] * ny * ct + P.ty * st, q[3] * nz * ct + P.tz * st); uv.push((xc + per) * UVS, (s + along) * UVS);
      }
      tg.push([P.ty, P.tz]);
    };
    for (const s of ss) ring(s, 0, 0, 0);
    if (endRound) for (const ph of [0.5, 1.0, 1.4]) ring(path.S, endRound * Math.sin(ph), endRound * (1 - Math.cos(ph)), ph);
    const n = tg.length;
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < M - 1; j++) { const a = i * M + j, b = (i + 1) * M + j, c = a + 1, d = b + 1; idx.push(a, b, c, b, d, c); }
    const cap = (i, sg) => {
      const base = pos.length / 3; let cx = 0, cy = 0, cz = 0;
      for (let j = 0; j < M - 1; j++) { const o = (i * M + j) * 3; pos.push(pos[o], pos[o + 1], pos[o + 2]); nor.push(0, tg[i][0] * sg, tg[i][1] * sg); uv.push(pos[o] * UVS, pos[o + 1] * UVS); cx += pos[o] / (M - 1); cy += pos[o + 1] / (M - 1); cz += pos[o + 2] / (M - 1); }
      pos.push(cx, cy, cz); nor.push(0, tg[i][0] * sg, tg[i][1] * sg); uv.push(cx * UVS, cy * UVS);
      for (let j = 0; j < M - 1; j++) { const j2 = (j + 1) % (M - 1); if (sg > 0) idx.push(base + M - 1, base + j2, base + j); else idx.push(base + M - 1, base + j, base + j2); }
    };
    if (capS) cap(0, -1); if (capE) cap(n - 1, 1);
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx); return geo;
  }
  // points at equal steps along a polyline of Vector3 -> [{ p, t }]
  function resample(pts, step) {
    const out = []; let acc = 0, next = step / 2;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1], L = a.distanceTo(b); if (L < 1e-9) continue;
      while (next <= acc + L) { out.push({ p: a.clone().lerp(b, (next - acc) / L), t: b.clone().sub(a).normalize() }); next += step; }
      acc += L;
    }
    return out;
  }
  // move a convex outline [[x, y], ...] inwards by d
  function insetPoly(pts, d) {
    const n = pts.length; let A = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; A += a[0] * b[1] - b[0] * a[1]; }
    const sg = A > 0 ? 1 : -1, L = [];
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); L.push({ px: a[0] - dy / l * sg * d, py: a[1] + dx / l * sg * d, dx, dy }); }
    return pts.map((_, i) => { const e0 = L[(i + n - 1) % n], e1 = L[i], den = e0.dx * e1.dy - e0.dy * e1.dx, t = ((e1.px - e0.px) * e1.dy - (e1.py - e0.py) * e1.dx) / den; return [e0.px + e0.dx * t, e0.py + e0.dy * t]; });
  }
  // every stitch is its own little thread: one instanced capsule per stitch, half sunk into the cloth. list: [{ p, t, n }]
  function stitchMesh(list, mat, r = 0.00034, len = 0.0025, cap = 1, rad = 6) {
    const geo = new T.CapsuleGeometry(r, len, cap, rad); geo.rotateZ(PI / 2);                 // pointed ends: the thread dives into the cloth
    const im = new T.InstancedMesh(geo, mat, list.length), m4 = new T.Matrix4(), x = v3(), y = v3(), z = v3();
    list.forEach((s, i) => { x.copy(s.t).normalize(); z.crossVectors(x, s.n).normalize(); y.crossVectors(z, x); m4.makeBasis(x, y, z); m4.setPosition(s.p.x + y.x * r * 0.3, s.p.y + y.y * r * 0.3, s.p.z + y.z * r * 0.3); im.setMatrixAt(i, m4); });
    im.instanceMatrix.needsUpdate = true; im.castShadow = false; im.receiveShadow = true; im.computeBoundingSphere(); return im;
  }
  // a flat printed face lying in the XZ plane (text top toward -Z): the outline is filled with a drawing, lit like the part under it
  function printTop(outline, w, h, px, paint, mat) {
    const geo = new T.ShapeGeometry(new T.Shape(outline.map(p => new T.Vector2(p[0], p[1]))), 12), uv = geo.attributes.uv, pos = geo.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
    geo.rotateX(-PI / 2);
    const cv = document.createElement('canvas'); cv.width = Math.round(w * px); cv.height = Math.round(h * px); const c = cv.getContext('2d'); paint(c, cv.width, cv.height);
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    const m = mat.clone(); m.map = tex; m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -1;
    const mesh = new T.Mesh(geo, m); mesh.castShadow = false; mesh.receiveShadow = true; return mesh;
  }

  // woven denim: dark warp, pale weft showing as fine diagonal twill lines and a few specks. Tiles.
  function denimCanvas(base, pale, seed, lines = 0.2, specks = 1) {
    const S = 1024, cv = document.createElement('canvas'); cv.width = cv.height = S; const x = cv.getContext('2d'), R = OM.rng(seed);
    x.fillStyle = base; x.fillRect(0, 0, S, S);
    for (let i = 0; i < 70; i++) {                                     // uneven dye, very soft
      const px = R() * S, py = R() * S, r = 80 + R() * 160, dark = R() < 0.5, a = 0.010 + R() * 0.018;
      for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) { if (px + ox + r < 0 || px + ox - r > S || py + oy + r < 0 || py + oy - r > S) continue; const gr = x.createRadialGradient(px + ox, py + oy, 0, px + ox, py + oy, r); gr.addColorStop(0, dark ? `rgba(8,12,30,${a})` : `rgba(255,255,255,${a * 0.7})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(px + ox - r, py + oy - r, 2 * r, 2 * r); }
    }
    x.lineCap = 'round';
    for (let k = -S; k < 2 * S; k += 8) { x.strokeStyle = pale; x.globalAlpha = lines; x.lineWidth = 2.2; x.beginPath(); x.moveTo(k, 0); x.lineTo(k - S, S); x.stroke(); x.strokeStyle = '#060a1c'; x.globalAlpha = lines * 0.9; x.beginPath(); x.moveTo(k + 4, 0); x.lineTo(k + 4 - S, S); x.stroke(); }
    for (let i = 0; i < 26000 * specks; i++) { const px = R() * S, py = R() * S, l = 2 + R() * 6, pal = R() < 0.6; x.strokeStyle = pal ? pale : '#060a1c'; x.globalAlpha = pal ? 0.05 + R() * 0.11 : 0.05 + R() * 0.11; x.lineWidth = 1.6 + R() * 0.8; x.beginPath(); x.moveTo(px, py); x.lineTo(px - l, py + l); x.stroke(); }
    x.globalAlpha = 1; return cv;
  }

  // ====================================================================================================== jeans
  const WOVEN = {};
  KIT.asset('jeans', (K, o) => {
    const g = new T.Group(), W = 0.34, TH = 0.010, GAP = 0.0015, H2 = TH / 2, c = i => H2 + i * (TH + GAP);   // six plies: two legs, three layers
    const TOPY = c(5) + H2, ZB = -0.131, ZS = -0.083, ZF = 0.114, WBT = TOPY + 0.0034, WBZ = (ZB + ZS) / 2, WBD = ZS - ZB;
    const rOut = 1.5 * (TH + GAP), zfc = ZF - rOut - H2, zbc = -0.122 + rOut + H2;
    const weave = (base, pale, seed, lines) => WOVEN[base + seed] || (WOVEN[base + seed] = (() => { const m = K.mat.cloth(K.col.denim).clone(); m.color.set('#ffffff'); m.map = K.canvasTex(denimCanvas(base, pale, seed, lines), { repeat: 4 }); return m; })());   // the kit's cloth with the weave drawn into it; made once, shared by every pair
    const denim = weave('#' + new T.Color(K.col.denim).multiplyScalar(0.6).getHexString(), '#a9b7d4', 41, 0.2), inside = weave('#7a8cb0', '#e6eaf2', 43, 0.18);   // indigo face, pale reverse
    const thread = K.mat.clay('#c7a268', 0.8), steel = K.mat.metal(K.col.steel, 0.3);
    const add = (geo, mat, pos, opt = {}) => { const m = K.mesh(geo, mat, Object.assign({ pos }, opt)); g.add(m); return m; };

    // ---- the two legs: each a flat tube of denim that runs back to front, turns under, runs back, turns under again
    const leg = (yT, yM, yB, zEnd) => makePath([
      { z0: -0.128, y0: yT, z1: zfc, y1: yT },
      { arc: 1, zc: zfc, yc: (yT + yM) / 2, r: (yT - yM) / 2, a0: PI / 2, a1: -PI / 2 },
      { z0: zfc, y0: yM, z1: zbc, y1: yM },
      { arc: 1, zc: zbc, yc: (yM + yB) / 2, r: (yM - yB) / 2, a0: PI / 2, a1: 1.5 * PI },
      { z0: zbc, y0: yB, z1: zEnd, y1: yB }]);
    const pA = leg(c(5), c(2), c(1), 0.120), pB = leg(c(4), c(3), c(0), 0.131);
    const legGeo = (p, x0, x1, w0, w1, ph) => ribbon(p, samples(p, { fineEnd: 0.02 }), { x0: s => x0 + (x1 - x0) * smooth(0.3, 1, s / p.S) + 0.0010 * Math.sin(s * 29 + ph) * smooth(0.10, 0.22, s),
      W: s => w0 + (w1 - w0) * smooth(0.25, 1, s / p.S) + 0.0016 * Math.sin(s * 21 + ph * 1.7) * smooth(0.10, 0.22, s),   // cloth edges wander a millimetre or two (not under the waistband)
      th: s => TH + 0.0010 * smooth(p.S - 0.0150, p.S - 0.0136, s), endRound: 0.002 });                // legs taper toward the hem and never lie quite square on each other
    add(legGeo(pA, 0, 0.0035, W, 0.316, 0.6), denim, [0, 0, 0]); add(legGeo(pB, 0.0015, -0.003, W - 0.004, 0.310, 2.9), denim, [0, 0, 0]);
    const surf = (path, s, x, off) => { const P = path.at(s), nz = -P.ty, ny = P.tz, sg = Math.sign(off); return { p: v3(x, P.y + ny * off, P.z + nz * off), t: v3(0, P.ty, P.tz), n: v3(0, ny * sg, nz * sg) }; };   // a point beside a path, off along its normal
    const surfA = (s, x, lift = 0) => surf(pA, s, x, H2 + lift);                                        // a point on the outer face of the top leg

    // ---- stitches (collected, then drawn as one instanced mesh)
    const ST = [], UP = v3(0, 1, 0);
    const sew = (pts, pitch = 0.0034) => { for (const q of resample(pts, pitch)) ST.push({ p: q.p, t: q.t, n: UP }); };
    const flat = (xz, y) => xz.map(p => v3(p[0], y, p[1]));

    // ---- waistband: a firm bar on the back edge. Its left end is built in layers: base, rim, the tag, the flap
    const XL = -0.168, XR = 0.168, XH = -0.0985, WBH = TH + 0.0037;
    const bar = (w, h, d, x, y, z) => add(clothUV(K.geo.rbox(w, h, d, 0.0024)), denim, [x, y, z]);
    bar(XR - XH + 0.0005, WBH, WBD, (XR + XH - 0.0005) / 2, WBT - WBH / 2, WBZ);                     // the waistband right of the flap
    bar(0.332, TH + 0.0006, WBD - 0.002, 0.0015, c(4), WBZ - 0.0005);                                // the waistband of the leg underneath
    bar(XH + 0.004 - XL, WBH - 0.0033, WBD - 0.0002, (XL + XH + 0.004) / 2, TOPY + 0.0001 - (WBH - 0.0033) / 2, WBZ);   // base under the pocket for the tag
    const CX = (XL + XH) / 2, rb = 0.0003;
    const rimGeo = K.geo.extrude(K.geo.rrect(XH - XL - 2 * rb, WBD - 0.0001 - 2 * rb, 0.0022), 0.0017 - 2 * rb, { bevel: rb, holes: [K.geo.rrect(XH - XL - 0.006 + 2 * rb, WBD - 0.006 + 2 * rb, 0.0016)] });
    rimGeo.rotateX(-PI / 2); clothUV(rimGeo); add(rimGeo, denim, [CX, TOPY + 0.0001 + rb, WBZ]);       // rim: the seam allowance the flap rests on
    add(clothUV(K.geo.rbox(XH - XL - 0.005, 0.0004, WBD - 0.005, 0.0001)), inside, [CX, TOPY + 0.0002, WBZ]);   // floor: the pale inner face of the waistband
    sew(flat([[XH + 0.0042, ZB + 0.0038], [XR - 0.004, ZB + 0.0038]], WBT)); sew(flat([[XH + 0.0042, ZS - 0.0038], [XR - 0.004, ZS - 0.0038]], WBT));
    sew(flat([[XH + 0.0040, ZB + 0.006], [XH + 0.0040, ZS - 0.006]], WBT));                           // the short seam where the flap is hinged

    // ---- the security tag: a flat soft square, sewn in along its back edge
    const TG = 0.038, TT = 0.0012, TX = CX, TZ = WBZ, TY = TOPY + 0.0004, tb = 0.00025, tagMat = K.mat.plastic('#dddbd3', 0.5);
    const tag = new T.Group(); tag.position.set(TX, TY, TZ); g.add(tag);
    const tagGeo = K.geo.extrude(K.geo.rrect(TG - 2 * tb, TG - 2 * tb, 0.004), TT - 2 * tb, { bevel: tb }); tagGeo.rotateX(-PI / 2); tagGeo.translate(0, tb, 0); tag.add(K.mesh(tagGeo, tagMat));
    const tagPrint = printTop(K.geo.rrect(TG - 0.0012, TG - 0.0012, 0.0035), TG, TG, 27000, (x, w, h) => {
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(120,118,112,0.55)'; x.lineWidth = w * 0.004; const m = w * 0.075, r = w * 0.07; x.beginPath(); x.roundRect(m, m, w - 2 * m, h - 2 * m, r); x.stroke();   // the welded edge of the pouch
      x.fillStyle = '#1b1c1f'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `500 ${Math.round(w * 0.064)}px ${K.FONT}`; if ('letterSpacing' in x) x.letterSpacing = (w * 0.007) + 'px';
      ['REMOVE BEFORE', 'WASHING OR', 'WEARING'].forEach((s, i) => x.fillText(s, w / 2, h * (0.405 + i * 0.096)));
    }, tagMat); tagPrint.position.y = TT + 0.00002; tag.add(tagPrint);
    const tagSt = []; for (const q of resample([v3(TX - 0.0145, TY + TT, TZ - TG / 2 + 0.0026), v3(TX + 0.0145, TY + TT, TZ - TG / 2 + 0.0026)], 0.0036)) tagSt.push({ p: q.p, t: q.t, n: UP });
    g.add(stitchMesh(tagSt, K.mat.clay('#bcbab3', 0.8), 0.00034, 0.0022, 4, 12));

    // ---- the glow: one thin ring that stays, one that breathes outwards and fades. Flat lines, drawn over the cloth.
    const ringG = new T.Group(); ringG.position.set(TX, TY + TT + 0.0003, TZ); g.add(ringG);
    const ringGeo = (s, w) => { const sh = new T.Shape(K.geo.rrect(s, s, 0.0064).map(p => new T.Vector2(p[0], p[1]))); sh.holes.push(new T.Path(K.geo.rrect(s - 2 * w, s - 2 * w, 0.0064 - w).map(p => new T.Vector2(p[0], p[1])))); const ge = new T.ShapeGeometry(sh, 10); ge.rotateX(-PI / 2); return ge; };
    const rings = [0, 1].map(i => { const m = K.mat.flat(K.col.orange, 0); m.depthTest = false; m.side = T.DoubleSide; const r = K.mesh(ringGeo(0.0436, i ? 0.00042 : 0.0006), m, { cast: false, receive: false, soft: true }); r.renderOrder = 8; ringG.add(r); return r; });

    // ---- the flap: the outer layer of the waistband end. One skin over a centre line that bends, so it turns like cloth and not like a lid
    const FT = 0.0016, FR = FT / 2, FD = WBD - 0.0012, FL = XH - XL - 0.0008;
    const KU = [0, 0.002, 0.006, 0.010, 0.014, 0.019, 0.027, 0.040, 0.0585, FL];                       // where the bend is set along the flap (metres from the hinge)
    const AF = [45, 45, 45, 40, 25, -4, -8, -7.5].map(d => d * PI / 180), AB = [0, 0, 2, 5, 8, 8, 6, 4].map(d => d * PI / 180);   // bend added at each knot when open; extra curl while it turns
    const flapDark = denim.clone(), flapLight = inside.clone(), flapThread = thread.clone(); for (const m of [flapDark, flapLight, flapThread]) m.transparent = true;
    const NU = 64, FU = [], rk = [], rw = []; for (let i = 0; i <= NU; i++) { const u = FL * Math.pow(i / NU, 1.5); FU.push(u); let k = 0; while (k < KU.length - 2 && u > KU[k + 1]) k++; rk.push(k); rw.push((u - KU[k]) / (KU[k + 1] - KU[k])); }
    const fcx = new Float64Array(NU + 1), fcy = new Float64Array(NU + 1), fth = new Float64Array(NU + 1), KA = new Float64Array(KU.length);
    const centre = (e, late, bend) => {                                  // the flap's centre line for one pose: positions fcx/fcy and angle fth at every ring
      let acc = 0; KA[0] = 0; for (let k = 0; k < AF.length; k++) { acc += AF[k] * (k < 4 ? e : late) + AB[k] * bend; KA[k + 1] = acc; } KA[KU.length - 1] = acc;
      let x = 0, y = 0, tp = 0;
      for (let i = 0; i <= NU; i++) { const th = KA[rk[i]] * (1 - rw[i]) + KA[rk[i] + 1] * rw[i]; if (i) { const tm = (th + tp) / 2, du = FU[i] - FU[i - 1]; x -= Math.cos(tm) * du; y += Math.sin(tm) * du; } fcx[i] = x; fcy[i] = y; fth[i] = th; tp = th; }
    };
    { let lo = 0.1, hi = 1.0; for (let i = 0; i < 40; i++) { AF[4] = (lo + hi) / 2; centre(1, 1, 0); if (fcy[NU] > 0.0026) lo = AF[4]; else hi = AF[4]; } }   // open, its free end comes to rest on the leather patch
    const prof = stadium(FD / 2 - FR, FR, 4, 6), PM = prof.length, ENDS = [0.5, 1.0, PI / 2], NRING = NU + 1 + ENDS.length, capB = NRING * PM;
    const fpos = new Float32Array((capB + PM + 1) * 3), fnor = new Float32Array(fpos.length), fuv = new Float32Array((capB + PM + 1) * 2), dk = [], lt = [];
    for (let i = 0; i < NRING; i++) for (let j = 0; j < PM; j++) { const u = i <= NU ? FU[i] : FL + FR * Math.sin(ENDS[i - NU - 1]); fuv[(i * PM + j) * 2] = (XH - u) * UVS; fuv[(i * PM + j) * 2 + 1] = (WBZ + prof[j][0]) * UVS; }
    for (let i = 0; i < NRING - 1; i++) for (let j = 0; j < PM; j++) { const j2 = (j + 1) % PM, a = i * PM + j, b = (i + 1) * PM + j, c = i * PM + j2, d = (i + 1) * PM + j2; (prof[j][1] + prof[j2][1] > 0 ? dk : lt).push(a, b, c, b, d, c); }
    for (let j = 0; j < PM; j++) dk.push(capB + PM, capB + j, capB + (j + 1) % PM);                    // the hinge end, closed
    const flapGeo = new T.BufferGeometry(); flapGeo.setAttribute('position', new T.BufferAttribute(fpos, 3)); flapGeo.setAttribute('normal', new T.BufferAttribute(fnor, 3)); flapGeo.setAttribute('uv', new T.BufferAttribute(fuv, 2));
    flapGeo.setIndex(dk.concat(lt)); flapGeo.addGroup(0, dk.length, 0); flapGeo.addGroup(dk.length, lt.length, 1); flapGeo.boundingSphere = new T.Sphere(v3(0, 0, 0), 0.09);
    const flap = K.mesh(flapGeo, [flapDark, flapLight], { pos: [XH, WBT - FR, WBZ] }); flap.frustumCulled = false; g.add(flap);
    const FS = []; for (let u = 0.0044; u < 0.0625; u += 0.0036) for (const z of [-(WBD / 2 - 0.0038), WBD / 2 - 0.0038]) FS.push({ u, z, cross: false });   // its two rows of stitches, and one row across the free end
    for (let z = -0.0162; z < 0.017; z += 0.0036) FS.push({ u: FL - 0.0042, z, cross: true });
    for (const s of FS) { let i = 0; while (i < NU - 1 && FU[i + 1] < s.u) i++; s.i = i; s.w = (s.u - FU[i]) / (FU[i + 1] - FU[i]); }
    const fsGeo = new T.CapsuleGeometry(0.00034, 0.0025, 2, 6); fsGeo.rotateZ(PI / 2);
    const flapSt = new T.InstancedMesh(fsGeo, flapThread, FS.length); flapSt.position.copy(flap.position); flapSt.castShadow = false; flapSt.frustumCulled = false; g.add(flapSt);
    const fm = new T.Matrix4(), fa = v3(), fb = v3(), fc = v3();
    let posed = -1;
    const poseFlap = (f) => {
      if (f === posed) return; posed = f;
      centre(K.ease.cubicInOut(f), smooth(0.7, 1, f), Math.sin(PI * f) * Math.sqrt(1 - f));
      for (let i = 0; i < NRING; i++) {
        const e2 = i > NU ? ENDS[i - NU - 1] : 0, ii = Math.min(i, NU), th = fth[ii], tx = -Math.cos(th), ty = Math.sin(th), nx = Math.sin(th), ny = Math.cos(th), ce = Math.cos(e2), se = Math.sin(e2);
        const cx = fcx[ii] + tx * FR * se, cy = fcy[ii] + ty * FR * se;
        for (let j = 0; j < PM; j++) {
          const q = prof[j], o3 = (i * PM + j) * 3, yl = q[1] * ce; fpos[o3] = cx + nx * yl; fpos[o3 + 1] = cy + ny * yl; fpos[o3 + 2] = q[0];
          const ax = nx * q[3] * ce + tx * se, ay = ny * q[3] * ce + ty * se, az = q[2] * ce, l = Math.hypot(ax, ay, az) || 1; fnor[o3] = ax / l; fnor[o3 + 1] = ay / l; fnor[o3 + 2] = az / l;
        }
      }
      for (let j = 0; j <= PM; j++) { const o3 = (capB + j) * 3; fpos[o3] = 0; fpos[o3 + 1] = j < PM ? prof[j][1] : 0; fpos[o3 + 2] = j < PM ? prof[j][0] : 0; fnor[o3] = 1; fnor[o3 + 1] = 0; fnor[o3 + 2] = 0; }
      flapGeo.attributes.position.needsUpdate = true; flapGeo.attributes.normal.needsUpdate = true;
      for (let k = 0; k < FS.length; k++) {
        const s = FS[k], th = fth[s.i] + (fth[s.i + 1] - fth[s.i]) * s.w, px = fcx[s.i] + (fcx[s.i + 1] - fcx[s.i]) * s.w, py = fcy[s.i] + (fcy[s.i + 1] - fcy[s.i]) * s.w, h = FR + 0.0001;
        fb.set(Math.sin(th), Math.cos(th), 0); if (s.cross) fa.set(0, 0, 1); else fa.set(-Math.cos(th), Math.sin(th), 0); fc.crossVectors(fa, fb);
        fm.makeBasis(fa, fb, fc); fm.setPosition(px + fb.x * h, py + fb.y * h, s.z); flapSt.setMatrixAt(k, fm);
      }
      flapSt.instanceMatrix.needsUpdate = true;
    };

    // ---- belt loops: a strap from the panel up over the waistband and round its back edge
    const loopPath = curvePath([[ZS + 0.0125, TOPY + 0.0010], [ZS + 0.0070, TOPY + 0.0015], [ZS + 0.0012, TOPY + 0.0042], [ZS - 0.0040, TOPY + 0.0060], [WBZ, TOPY + 0.0068], [ZB + 0.0050, TOPY + 0.0060], [ZB - 0.0002, TOPY + 0.0044], [ZB - 0.0014, TOPY + 0.0010], [ZB - 0.0014, TOPY - 0.0030]], 64);
    const loopGeo = ribbon(loopPath, samples(loopPath, { line: 0.001 }), { W: 0.0115, th: 0.0018, endRound: 0.0006 });
    const LOOPS = [-0.020, 0.092];
    for (const x of LOOPS) {
      add(loopGeo, denim, [x, 0, 0]);
      for (const dx of [-0.0037, 0.0037]) for (let q = 0.0046; q < loopPath.S - 0.0045; q += 0.0036) ST.push(surf(loopPath, q, x + dx, -0.00095));
      add(K.geo.rbox(0.0100, 0.0006, 0.0017, 0.0003), thread, [x, TOPY + 0.0021, ZS + 0.0102], { cast: false }); add(K.geo.rbox(0.0100, 0.0006, 0.0017, 0.0003), thread, [x, TOPY + 0.0070, ZB + 0.0052], { cast: false });   // bar tacks
    }

    // ---- leather patch on the waistband, with the size pressed in
    const PW = 0.054, PD = 0.032, PX = -0.0615, leather = K.mat.clay('#ab885e', 0.7);
    const patchGeo = K.geo.extrude(K.geo.rrect(PW - 0.0004, PD - 0.0004, 0.0026), 0.0004, { bevel: 0.0002 }); patchGeo.rotateX(-PI / 2); add(patchGeo, leather, [PX, WBT + 0.0002, WBZ]);
    const patchPrint = printTop(K.geo.rrect(PW - 0.0008, PD - 0.0008, 0.0024), PW, PD, 16000, (x, w, h) => {
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); const R = OM.rng(31);
      for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(70,45,20,${0.02 + R() * 0.05})`; x.beginPath(); x.arc(R() * w, R() * h, 0.6 + R() * 2.2, 0, 7); x.fill(); }                 // grain
      x.strokeStyle = 'rgba(74,48,24,0.55)'; x.lineWidth = w * 0.006; x.beginPath(); x.roundRect(w * 0.085, h * 0.15, w * 0.83, h * 0.70, w * 0.02); x.stroke();
      x.fillStyle = 'rgba(66,42,20,0.78)'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `400 ${Math.round(h * 0.25)}px ${K.FONT}`; if ('letterSpacing' in x) x.letterSpacing = (w * 0.014) + 'px'; x.fillText('W32  L32', w / 2, h * 0.46);
      x.font = `400 ${Math.round(h * 0.105)}px ${K.FONT}`; if ('letterSpacing' in x) x.letterSpacing = (w * 0.02) + 'px'; x.fillText('STRAIGHT  FIT', w / 2, h * 0.70);
    }, leather); patchPrint.position.set(PX, WBT + 0.0008 + 0.00002, WBZ); g.add(patchPrint);
    const pr = K.geo.rrect(PW - 0.0044, PD - 0.0044, 0.0012, 3).map(p => [PX + p[0], WBZ + p[1]]); pr.push(pr[0]); sew(flat(pr, WBT + 0.0008));

    // ---- the top button (a steel shank button) at the front end of the waistband
    const BX = 0.1465, btn = new T.Group(); btn.position.set(BX, WBT, WBZ); g.add(btn);
    btn.add(K.mesh(K.geo.cyl(0.0086, 0.0020, 48, 0.0080), steel, { pos: [0, 0.0010, 0] }));
    const tor = new T.TorusGeometry(0.0066, 0.0011, 12, 48); tor.rotateX(PI / 2); btn.add(K.mesh(tor, steel, { pos: [0, 0.0021, 0] }));
    btn.add(K.mesh(new T.SphereGeometry(0.0052, 32, 12), K.mat.metal('#aeb1b8', 0.42), { pos: [0, 0.0019, 0], scale: [1, 0.3, 1] }));
    const bh = []; for (let i = 0; i <= 28; i++) { const a = i / 28 * 2 * PI; bh.push([BX + 0.0118 * Math.cos(a), WBZ + 0.0118 * Math.sin(a)]); } sew(flat(bh, WBT), 0.0031);

    // ---- yoke seam: runs from the centre back down to the side seam
    const XS = 0.012, yk0 = [-0.162, -0.040], yk1 = [XS - 0.004, -0.063], ykL = Math.hypot(yk1[0] - yk0[0], yk1[1] - yk0[1]), ykA = Math.atan2(-(yk1[1] - yk0[1]), yk1[0] - yk0[0]);
    add(clothUV(K.geo.rbox(ykL, 0.0012, 0.0088, 0.0005)), denim, [(yk0[0] + yk1[0]) / 2, TOPY + 0.0001, (yk0[1] + yk1[1]) / 2], { rot: [0, ykA, 0] });
    const ykN = [(yk1[1] - yk0[1]) / ykL, -(yk1[0] - yk0[0]) / ykL];
    for (const d of [-0.0026, 0.0026]) sew(flat([[yk0[0] + ykN[0] * d + 0.002, yk0[1] + ykN[1] * d], [yk1[0] + ykN[0] * d - 0.002, yk1[1] + ykN[1] * d]], TOPY + 0.0007));

    // ---- side seam: a felled seam down the middle of the top, over the big fold and under
    const sSeam0 = ZS + 0.128, sSeam1 = pA.pieces[1].s0 + pA.pieces[1].L * 0.93;
    add(ribbon(pA, samples(pA, { line: 0.006 }).filter(s => s >= sSeam0 && s <= sSeam1), { x0: XS, W: 0.0090, th: 0.0012, off: H2 + 0.0001, capS: true, capE: true }), denim, [0, 0, 0]);
    for (const dx of [-0.0027, 0.0027]) for (let s = sSeam0 + 0.0025; s < sSeam1 - 0.002; s += 0.0034) ST.push(surfA(s, XS + dx, 0.0007));

    // ---- back pocket: a patch of denim with a turned top edge, double seams and two arcs
    const PKX = -0.086, PKZ = 0.024, PKA = 0.07, pc = Math.cos(PKA), ps = Math.sin(PKA), PKH = 0.116;
    const pk = (x, zl) => { const z = zl - PKH / 2; return [PKX + x * pc + z * ps, PKZ - x * ps + z * pc]; };
    const pkOut = [[-0.056, 0], [0.056, 0], [0.0515, 0.080], [0, PKH], [-0.0515, 0.080]];
    const pkGeo = K.geo.extrude(pkOut.map(p => [p[0], -(p[1] - PKH / 2)]), 0.0005, { bevel: 0.0004 }); pkGeo.rotateX(-PI / 2); clothUV(pkGeo);
    add(pkGeo, denim, [PKX, TOPY + 0.0003, PKZ], { rot: [0, PKA, 0] });
    const PY = TOPY + 0.0012, pkLine = (pts) => sew(flat(pts.map(p => pk(p[0], p[1])), PY));
    add(clothUV(K.geo.rbox(0.111, 0.0006, 0.0125, 0.0003)), denim, [pk(0, 0.0068)[0], PY, pk(0, 0.0068)[1]], { rot: [0, PKA, 0] });   // the turned top edge
    pkLine([[-0.0535, 0.0032], [0.0535, 0.0032]]); pkLine([[-0.0530, 0.0108], [0.0530, 0.0108]]);
    for (const d of [0.0026, 0.0082]) { const q = insetPoly(pkOut, d); pkLine([[q[0][0], 0.014], q[4], q[3], q[2], [q[1][0], 0.014]]); }
    for (const dz of [0, 0.0058]) { const a = []; for (let i = 0; i <= 40; i++) { const x = -0.044 + 0.088 * i / 40; a.push([x, 0.030 + dz + 0.024 * (1 - Math.pow(Math.abs(x) / 0.044, 1.8))]); } pkLine(a); }
    for (const sx of [-1, 1]) { const q = pk(sx * 0.0515, 0.0072); add(K.geo.rbox(0.0062, 0.0006, 0.0017, 0.0003), thread, [q[0], PY + 0.0004, q[1]], { rot: [0, PKA, 0], cast: false }); }

    // ---- front pocket: the curved opening, its rolled edge, two rivets
    const sc = (ax, az, n = 40, a0 = 0.02, a1 = PI / 2 - 0.02) => { const a = []; for (let i = 0; i <= n; i++) { const f = a0 + (a1 - a0) * i / n; a.push([XS + 0.0045 + ax * Math.cos(f), ZS + az * Math.sin(f)]); } return a; };
    add(planarUV(K.geo.tube(sc(0.0700, 0.0760).map(p => [p[0], TOPY + 0.0001, p[1]]), 0.0011, { seg: 56, rad: 8 })), denim, [0, 0, 0]);
    sew(flat(sc(0.0672, 0.0732), TOPY + 0.0002)); sew(flat(sc(0.0618, 0.0678), TOPY + 0.0002));
    for (const p of [[XS + 0.0045 + 0.0660, ZS + 0.0052], [XS + 0.0095, ZS + 0.0712]]) {
      add(K.geo.cyl(0.0036, 0.0005, 24), steel, [p[0], TOPY + 0.00025, p[1]], { cast: false }); add(new T.SphereGeometry(0.0027, 20, 10), steel, [p[0], TOPY + 0.0004, p[1]], { scale: [1, 0.5, 1], cast: false });
    }

    // ---- hems at the front, under the big fold: one row of stitches on each
    const hemY = (i) => c(i) + H2 + 0.0005 + 0.0002;
    sew(flat([[-0.150, 0.1105], [0.150, 0.1105]], hemY(1))); sew(flat([[-0.146, 0.1225], [0.150, 0.1225]], hemY(0)));

    // ---- paper size tag on a white cord, looped through the front belt loop
    const HX = 0.101, HZ = 0.030, HA = -0.16, hw = 0.046, hh = 0.080, paper = K.mat.paper('#e2e0da');
    const ht = new T.Group(); ht.position.set(HX, TOPY + 0.0003, HZ); ht.rotation.y = HA; g.add(ht);
    const cardGeo = K.geo.extrude(K.geo.rrect(hw, hh, 0.003), 0.0005); cardGeo.rotateX(-PI / 2); ht.add(K.mesh(cardGeo, paper));
    const cardPrint = printTop(K.geo.rrect(hw - 0.0004, hh - 0.0004, 0.0028), hw, hh, 12000, (x, w, h) => {
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#1b1c1f'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.beginPath(); x.arc(w / 2, h * 0.075, w * 0.045, 0, 7); x.fill();                                                                // the punched hole
      x.font = `400 ${Math.round(w * 0.075)}px ${K.FONT}`; if ('letterSpacing' in x) x.letterSpacing = (w * 0.02) + 'px'; x.fillText('STRAIGHT FIT', w / 2, h * 0.215);
      x.font = `500 ${Math.round(w * 0.26)}px ${K.FONT}`; if ('letterSpacing' in x) x.letterSpacing = '0px'; x.fillText('32 / 32', w / 2, h * 0.37);
      x.fillRect(w * 0.14, h * 0.485, w * 0.72, Math.max(1, h * 0.0022));
      x.font = `400 ${Math.round(w * 0.068)}px ${K.FONT}`; x.textAlign = 'left'; ['Waist 32', 'Length 32', '100% cotton'].forEach((s, i) => x.fillText(s, w * 0.14, h * (0.545 + i * 0.05)));
      const R = OM.rng(12); let bx = w * 0.14; while (bx < w * 0.86) { const bw = (1 + Math.floor(R() * 3)) * w * 0.0085; x.fillRect(bx, h * 0.735, Math.min(bw, w * 0.86 - bx), h * 0.135); bx += bw + (1 + Math.floor(R() * 3)) * w * 0.0085; }
      x.textAlign = 'center'; x.font = `400 ${Math.round(w * 0.058)}px ${K.FONT}`; x.fillText('4 006381 333931', w / 2, h * 0.905);
    }, paper); cardPrint.position.y = 0.00052; ht.add(cardPrint);
    const eye = new T.TorusGeometry(0.0024, 0.0005, 8, 24); eye.rotateX(PI / 2); ht.add(K.mesh(eye, steel, { pos: [0, 0.0006, -hh / 2 + hh * 0.075], cast: false }));
    ht.updateMatrix(); const hole = v3(0, 0.0009, -hh / 2 + hh * 0.075).applyMatrix4(ht.matrix);
    const cord = K.mat.clay('#e6e3db', 0.85), LX = LOOPS[1];
    add(K.geo.tube([[hole.x - 0.0006, hole.y, hole.z], [hole.x - 0.004, TOPY + 0.0012, hole.z - 0.016], [LX - 0.0075, TOPY + 0.0012, ZS + 0.022], [LX - 0.0072, TOPY + 0.0016, ZS + 0.0085]], 0.00042, { seg: 40, rad: 6 }), cord, [0, 0, 0], { cast: false });
    add(K.geo.tube([[hole.x + 0.0006, hole.y, hole.z], [hole.x + 0.001, TOPY + 0.0012, hole.z - 0.018], [LX + 0.0078, TOPY + 0.0012, ZS + 0.024], [LX + 0.0072, TOPY + 0.0016, ZS + 0.0085]], 0.00042, { seg: 40, rad: 6 }), cord, [0, 0, 0], { cast: false });
    add(K.geo.tube([[LX - 0.0072, TOPY + 0.0016, ZS + 0.0085], [LX - 0.004, TOPY + 0.0031, ZS + 0.0078], [LX + 0.004, TOPY + 0.0031, ZS + 0.0078], [LX + 0.0072, TOPY + 0.0016, ZS + 0.0085]], 0.00042, { seg: 24, rad: 6 }), cord, [0, 0, 0], { cast: false });

    g.add(stitchMesh(ST, thread));

    const tagC = [TX, TY + TT, TZ];
    const keys = o.keys || [{ az: 0.55, el: 0.42 }, { az: -0.75, el: 0.3 }, { az: 0.12, el: 0.1, d: 1.35, l: [0, 0.035, 0.05] }, { az: 0.0, el: 1.15, d: 1.7 },
      { az: -0.5, el: 0.62, d: 0.3, l: [TX + 0.012, TY, TZ] }, { az: -0.15, el: 0.95, d: 0.2, l: [TX + 0.004, TY, TZ] }];
    return {
      group: g,
      size: { W, D: 0.266, H: WBT, top: TOPY, tag: TG, tagThick: TT, waistband: WBD, flap: FL },
      anchors: { tag: tagC, waist: [0, WBT, WBZ], top: [0, TOPY, 0.01], pocket: [PKX, TOPY + 0.0012, PKZ], patch: [PX, WBT + 0.0008, WBZ], button: [BX, WBT + 0.002, WBZ],
        flapHinge: [XH, WBT, WBZ], flapEdge: [XL, WBT, WBZ], fold: [0, (c(5) + c(2)) / 2, ZF], hem: [0, c(1), 0.120], sizeTag: [HX, TOPY + 0.001, HZ] },
      view: { l: [0, 0.03, 0], d: 1.75, close: tagC, keys },
      defaults: { flap: 0, glow: 0, ghost: 0 },
      demo(s, t) { s.flap = t < 4 ? 0 : t < 8 ? K.clamp((t - 4.1) / 0.8) : t < 10 ? 0 : 1; s.glow = t >= 6 ? 1 : 0; s.ghost = t >= 8 && t < 10 ? 1 : 0; if (o.s) Object.assign(s, o.s); },
      apply(s, t) {
        poseFlap(K.clamp(s.flap));
        const gh = K.clamp(s.ghost), solid = gh < 0.02, see = Math.pow(gh, 2.2);                       // dark cloth over a pale tag thins out on screen much faster than its opacity says: this curve makes the fade even to the eye
        flapDark.opacity = flapLight.opacity = 1 - 0.85 * see; flapThread.opacity = 1 - 0.6 * see; flapDark.depthWrite = flapLight.depthWrite = flapThread.depthWrite = solid;
        flap.castShadow = flap.receiveShadow = flapSt.receiveShadow = solid;                           // VSM shadows: whatever receives a shadow also casts one, so a see-through flap gives up both or it greys the tag
        flap.renderOrder = flapSt.renderOrder = solid ? 0 : 2;
        flap.userData.noAO = flap.userData.noDepth = flapSt.userData.noAO = flapSt.userData.noDepth = gh > 0.25;
        const gl = K.clamp(s.glow); ringG.visible = gl > 0.003;
        if (ringG.visible) {
          rings[0].material.opacity = gl * (0.94 + 0.06 * Math.sin(t * 2 * PI / 2.4));                // the steady line stays pure orange
          const ph = (((t / 2.4) % 1) + 1) % 1, k = 1 + 0.2 * (1 - Math.pow(1 - ph, 2.4)); rings[1].scale.set(k, 1, k); rings[1].material.opacity = gl * 0.7 * Math.pow(1 - ph, 1.5) * K.clamp(ph * 6);   // one calm pulse every 2.4 s
        }
      },
    };
  });

  // ====================================================================================================== till
  // one garment on a hanger. Local frame: the rail runs through the origin along Z, the garment hangs in the XY plane.
  function garment(K, { color, long, seed, steel, hangerMat }) {
    const g = new T.Group(), R = OM.rng(seed), mat = K.mat.cloth(color);
    const yn = -0.100, xn = 0.078, xs = 0.215, ys = yn - 0.050, len = long ? 0.74 : 0.68, yh = yn - len, dipF = long ? 0.10 : 0.075, dipB = 0.016;
    const p1 = R() * 6.28, p2 = R() * 6.28, p3 = R() * 6.28, kx = 19 + R() * 9;
    const fold = (x, v) => (0.014 * Math.pow(1 - v, 1.3) + 0.0012) * (Math.sin(kx * x + p1) + 0.45 * Math.sin(kx * 2.1 * x + p2));   // soft drape, deeper toward the hem
    const NT = 56, NV = 30, rings = [];
    for (let i = 0; i <= NV; i++) {
      const v = i / NV, ring = [], a = 0.246 + 0.004 * smooth(0, 0.4, v) - (0.25 - xs) * smooth(0.68, 1, v);
      for (let j = 0; j < NT; j++) {
        const th = 2 * PI * j / NT, cs = Math.cos(th), sn = Math.sin(th), X = a * Math.sign(cs) * Math.pow(Math.abs(cs), 0.6), cz = Math.sign(sn) * Math.pow(Math.abs(sn), 0.6), ax = Math.abs(X);
        const ytop = ax < xn ? yn - (sn >= 0 ? dipF : dipB) * Math.sqrt(1 - (ax / xn) ** 2) : yn - (yn - ys) * Math.min(1, (ax - xn) / (xs - xn));   // shoulder line, with the neck cut out of it
        const bBody = 0.016 + 0.005 * Math.sin(PI * v), bTop = 0.0095 + 0.0035 * smooth(1.15, 0.6, ax / xn), b = bBody + (bTop - bBody) * smooth(0.74, 1, v);
        ring.push([X, yh + v * (ytop - yh) - 0.007 * (1 - v) * Math.sin(kx * 0.55 * X + p3), b * cz + fold(X, v) * (1 - smooth(0.8, 1, v))]);
      }
      rings.push(ring);
    }
    const body = loft(rings), idx = Array.from(body.index.array), top = NV * NT;
    for (let j = 0; j < NT / 2; j++) { const A = j, B = j + 1, C = (NT - j - 1) % NT, D = (NT - j) % NT; idx.push(top + A, top + D, top + C, top + A, top + C, top + B, A, C, D, A, B, C); }   // close the shoulders and the hem
    body.setIndex(idx); body.computeVertexNormals(); g.add(K.mesh(body, mat));
    const col = []; for (let i = 0; i < 40; i++) { const f = 2 * PI * i / 40, sn = Math.sin(f); col.push([xn * Math.cos(f), yn - (sn >= 0 ? dipF : dipB) * Math.abs(sn), 0.0135 * Math.sign(sn) * Math.pow(Math.abs(sn), 0.5)]); }
    g.add(K.mesh(K.geo.tube(col, 0.0052, { closed: true, seg: 80, rad: 8 }), mat));                    // the rib at the neck
    for (const sx of [-1, 1]) {                                          // sleeves: they hang from the shoulder and lie against the side
      const n = long ? 16 : 7, L = long ? 0.60 : 0.19, sl = []; let px = sx * (xs - 0.030), py = ys - 0.045;
      for (let i = 0; i <= n; i++) {
        const k = i / n, ang = long ? 0.50 - 0.40 * smooth(0, 0.7, k) : 0.50, dx = sx * Math.sin(ang), dy = -Math.cos(ang); if (i) { px += dx * L / n; py += dy * L / n; }
        const w = long ? 0.085 - 0.035 * k : 0.085 - 0.012 * k, bz = 0.012 - 0.002 * k, ring = [];
        for (let j = 0; j < 20; j++) { const f = 2 * PI * j / 20, cs = Math.cos(f), sn = Math.sin(f), q = Math.sign(cs) * Math.pow(Math.abs(cs), 0.7) * w; ring.push([px + dy * q, py - dx * q, bz * Math.sign(sn) * Math.pow(Math.abs(sn), 0.7) + 0.005 * Math.sin(k * 5 + p1 + sx) * k]); }
        sl.push(ring);
      }
      g.add(K.mesh(loft(sl, { capS: true, capE: true }), mat));
    }
    const rh = 0.0175, hook = [[0, yn - 0.004, 0], [0, yn + 0.03, 0], [0, -rh - 0.012, 0], [0, -rh, 0]]; for (let i = 1; i <= 22; i++) { const a = -PI / 2 + i / 22 * 1.62 * PI; hook.push([rh * Math.cos(a), rh * Math.sin(a), 0]); }
    g.add(K.mesh(K.geo.tube(hook, 0.0021, { seg: 90, rad: 8 }), steel));
    g.add(K.mesh(K.geo.tube([[-0.200, ys - 0.016, 0], [-0.09, yn - 0.032, 0], [-0.03, yn - 0.014, 0], [0, yn - 0.009, 0], [0.03, yn - 0.014, 0], [0.09, yn - 0.032, 0], [0.200, ys - 0.016, 0]], 0.0048, { seg: 48, rad: 10 }), hangerMat));   // the hanger: only its neck shows in the collar
    return g;
  }

  KIT.asset('till', (K, o) => {
    const g = new T.Group(), CW = 0.9, CD = 0.5, CH = 0.95, ZR = -0.74;
    const white = K.mat.plastic('#eceae4', 0.5), graphite = K.mat.plastic(K.col.graphite, 0.55), black = K.mat.gloss(K.col.black, 0.3), steel = K.mat.metal(K.col.steel, 0.3), rubber = K.mat.rubber('#101113');
    const add = (geo, mat, pos, opt = {}) => { const m = K.mesh(geo, mat, Object.assign({ pos }, opt)); g.add(m); return m; };

    // ---- counter: a white carcass (open toward the cashier) on a set-back graphite plinth, a shadow gap, a white top
    add(K.geo.rbox(CW - 0.09, 0.09, CD - 0.09, 0.005), graphite, [0, 0.045, 0]);
    for (const sx of [-1, 1]) add(K.geo.rbox(0.02, 0.80, 0.47, 0.003), white, [sx * (CW / 2 - 0.02), 0.49, -0.005]);
    add(K.geo.rbox(CW - 0.02, 0.80, 0.02, 0.003), white, [0, 0.49, 0.222]);                           // front panel
    const shelf = K.mat.plastic('#d0cec8', 0.5); add(K.geo.rbox(0.84, 0.02, 0.45, 0.003), shelf, [0, 0.10, -0.012]); add(K.geo.rbox(0.84, 0.018, 0.40, 0.003), shelf, [0, 0.52, -0.03]); add(K.geo.rbox(0.84, 0.07, 0.02, 0.003), white, [0, 0.855, -0.23]);
    add(K.geo.rbox(CW - 0.04, 0.014, CD - 0.04, 0.002), graphite, [0, 0.896, 0]);                     // shadow gap under the top
    add(K.geo.rbox(CW, 0.048, CD, 0.007), K.mat.plastic('#cfcdc7', 0.45), [0, CH - 0.024, 0]);   // a shade under the body white, so the top does not burn out against the paper
    const NF = 28, flute = new T.InstancedMesh(K.geo.cyl(0.0122, 0.776, 20), white, NF), fm = new T.Matrix4();   // fluted front: gives white on white something to shade
    for (let i = 0; i < NF; i++) { fm.makeTranslation(-0.42 + 0.015 + i * 0.03, 0.49, 0.2315); flute.setMatrixAt(i, fm); } flute.castShadow = true; flute.receiveShadow = true; g.add(flute);

    // ---- card terminal on a stand, turned to the customer
    const term = new T.Group(); term.position.set(0.215, CH, 0.105); term.rotation.y = -0.2; g.add(term);
    const tblack = K.mat.plastic('#121316', 0.55).clone(); tblack.specularIntensity = 0.45; tblack.clearcoat = 0.18; tblack.envMapIntensity = 0.5;   // satin black that stays black under the white studio
    term.add(K.mesh(K.geo.cyl(0.050, 0.008, 64, 0.046), tblack, { pos: [0, 0.004, 0] }));
    term.add(K.mesh(K.geo.tube([[0, 0.006, -0.012], [0, 0.05, -0.022], [0, 0.092, -0.024], [0, 0.112, -0.016]], 0.0075, { seg: 40, rad: 16 }), tblack));
    const SY0 = 0.040, head = new T.Group(); head.position.set(0, 0.122, 0.002); head.rotation.x = -0.62; term.add(head);
    head.add(K.mesh(K.geo.rbox(0.040, 0.050, 0.010, 0.004), graphite, { pos: [0, -0.002, -0.011] }));   // mount
    head.add(K.mesh(K.geo.rbox(0.078, 0.160, 0.015, 0.0072), tblack));
    head.add(K.mesh(K.geo.rbox(0.0680, 0.0660, 0.0012, 0.0006), tblack, { pos: [0, SY0, 0.0072], cast: false }));   // the raised bezel round the screen
    const SW = 0.062, SH = 0.060, SY = SY0, SZ = 0.0079, sf = (x, h, wgt, k) => { x.font = `${wgt} ${Math.round(h * k)}px ${K.FONT}`; };
    const idle = K.canvasPlane(SW, SH, 9500, (x, w, h) => {
      x.fillStyle = '#101114'; x.fillRect(0, 0, w, h); x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = '#8c8f96'; sf(x, h, 500, 0.072); if ('letterSpacing' in x) x.letterSpacing = (h * 0.016) + 'px'; x.fillText('TOTAL', w / 2, h * 0.2);
      x.fillStyle = '#f4f1ea'; sf(x, h, 400, 0.27); if ('letterSpacing' in x) x.letterSpacing = '0px'; x.fillText('49.00', w / 2, h * 0.44);
      x.strokeStyle = '#8c8f96'; x.lineWidth = h * 0.014; x.lineCap = 'round'; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(w * 0.47, h * 0.75, h * (0.03 + i * 0.034), -0.85, 0.85); x.stroke(); }
      x.fillStyle = '#8c8f96'; sf(x, h, 400, 0.066); x.fillText('Tap or insert card', w / 2, h * 0.92);
    }); idle.position.set(0, SY, SZ); head.add(idle);
    const paid = K.canvasPlane(SW, SH, 9500, (x, w, h) => {
      x.fillStyle = '#101114'; x.fillRect(0, 0, w, h); x.strokeStyle = '#f4f1ea'; x.lineCap = 'round'; x.lineJoin = 'round'; const cx = w / 2, cy = h * 0.38, r = h * 0.21;
      x.lineWidth = h * 0.02; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.stroke();
      x.lineWidth = h * 0.034; x.beginPath(); x.moveTo(cx - r * 0.46, cy + r * 0.04); x.lineTo(cx - r * 0.12, cy + r * 0.38); x.lineTo(cx + r * 0.50, cy - r * 0.32); x.stroke();
      x.fillStyle = '#f4f1ea'; x.textAlign = 'center'; x.textBaseline = 'middle'; sf(x, h, 500, 0.16); if ('letterSpacing' in x) x.letterSpacing = (h * 0.03) + 'px'; x.fillText('PAID', w / 2 + h * 0.015, h * 0.81);
    }); paid.position.set(0, SY, SZ + 0.00006); paid.material.transparent = true; paid.material.depthWrite = false; paid.renderOrder = 2; head.add(paid);
    const keyMat = K.mat.rubber('#2a2c30');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) head.add(K.mesh(K.geo.rbox(0.0165, 0.0095, 0.0018, 0.0009), r === 3 && c !== 1 ? K.mat.rubber('#55585e') : keyMat, { pos: [(c - 1) * 0.0205, -0.008 - r * 0.0138, 0.0078], cast: false }));
    head.add(K.mesh(K.geo.rbox(0.050, 0.0022, 0.0030, 0.001), rubber, { pos: [0, -0.0718, 0.0066], cast: false }));   // card slot
    const legend = K.canvasPlane(0.062, 0.056, 9500, (x, w, h) => {                                    // what is printed on the keys: plain digits, a cross and a ring
      x.clearRect(0, 0, w, h); x.fillStyle = x.strokeStyle = '#b9bbbf'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.font = `400 ${Math.round(h * 0.095)}px ${K.FONT}`; x.lineWidth = h * 0.012; x.lineCap = 'round';
      const kx = c => w / 2 + (c - 1) * 0.0205 / 0.062 * w, ky = r => h / 2 + (r - 1.5) * 0.0138 / 0.056 * h, q = h * 0.026;
      for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) x.fillText(String(r * 3 + c + 1), kx(c), ky(r) + h * 0.006);
      x.fillText('0', kx(1), ky(3) + h * 0.006); x.strokeStyle = '#e3e3e0';
      x.beginPath(); x.moveTo(kx(0) - q, ky(3) - q); x.lineTo(kx(0) + q, ky(3) + q); x.moveTo(kx(0) + q, ky(3) - q); x.lineTo(kx(0) - q, ky(3) + q); x.stroke();
      x.beginPath(); x.arc(kx(2), ky(3), q * 1.15, 0, 7); x.stroke();
    }); legend.position.set(0, -0.008 - 1.5 * 0.0138, 0.00872); legend.material.transparent = true; legend.material.depthWrite = false; legend.renderOrder = 2; legend.userData.noAO = legend.userData.noDepth = true; head.add(legend);   // print, not a solid: the keys under it keep their own shading
    const ledOff = new T.Color('#34363b'), ledOn = new T.Color('#f4f1ea'), ledMat = K.mat.light('#34363b');   // the four status lights over the screen: all on when the card is read
    for (let i = 0; i < 4; i++) head.add(K.mesh(K.geo.cyl(0.0009, 0.0006, 16), ledMat, { pos: [(i - 1.5) * 0.0062, 0.0766, 0.0076], rot: [PI / 2, 0, 0], cast: false }));
    const GX = 0.292, GZ = -0.208;                                       // both cables leave through one grommet in the top
    add(K.geo.cyl(0.0125, 0.001, 40), K.mat.rubber('#0c0d0f'), [GX, CH + 0.0002, GZ], { cast: false });
    const grom = new T.TorusGeometry(0.0132, 0.0022, 12, 48); grom.rotateX(PI / 2); add(grom, rubber, [GX, CH + 0.0008, GZ]);
    add(K.geo.tube([[0.222, CH + 0.003, 0.058], [0.238, CH + 0.0024, 0.0], [0.244, CH + 0.0024, -0.09], [0.258, CH + 0.0024, -0.165], [0.276, CH + 0.0026, -0.196], [GX - 0.005, CH + 0.001, GZ + 0.003], [GX - 0.004, CH - 0.012, GZ + 0.002], [GX - 0.004, CH - 0.03, GZ + 0.002]], 0.0024, { seg: 90, rad: 8 }), rubber, [0, 0, 0]);   // the terminal's cable

    // ---- receipt printer: a small cube with a paper slot on top
    const PW = 0.118, PH = 0.094, PDp = 0.138, prn = new T.Group(); prn.position.set(0.325, CH, -0.085); prn.rotation.y = -0.12; g.add(prn);
    const shell = K.mat.plastic('#d9d7d1', 0.5);
    prn.add(K.mesh(K.geo.rbox(PW, PH, PDp, 0.014), shell, { pos: [0, 0.003 + PH / 2, 0] }));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) prn.add(K.mesh(K.geo.cyl(0.007, 0.003, 20), rubber, { pos: [sx * 0.042, 0.0015, sz * 0.052], cast: false }));
    const seam = K.geo.extrude(K.geo.rrect(PW + 0.0004, PDp + 0.0004, 0.0142), 0.0012); seam.rotateX(-PI / 2); prn.add(K.mesh(seam, graphite, { pos: [0, 0.003 + PH * 0.62, 0], cast: false }));   // the lid seam
    const lid = K.geo.extrude(K.geo.rrect(0.094, 0.070, 0.008), 0.0012, { bevel: 0.0004 }); lid.rotateX(-PI / 2); prn.add(K.mesh(lid, graphite, { pos: [0, 0.003 + PH - 0.0006, -0.024] }));
    const SLZ = 0.034, SLY = 0.003 + PH;
    prn.add(K.mesh(K.geo.rbox(0.068, 0.0016, 0.0050, 0.0007), rubber, { pos: [0, SLY - 0.0004, SLZ], cast: false }));                         // the slot
    prn.add(K.mesh(K.geo.rbox(0.072, 0.0022, 0.0022, 0.0007), K.mat.brushed(), { pos: [0, SLY + 0.0005, SLZ + 0.0046], cast: false }));       // tear bar
    prn.add(K.mesh(K.geo.cyl(0.0052, 0.0014, 24), graphite, { pos: [0.036, 0.003 + PH * 0.40, PDp / 2 + 0.0002], rot: [PI / 2, 0, 0], cast: false }));   // feed button
    const led = K.mesh(K.geo.cyl(0.0016, 0.001, 16), K.mat.light('#f4f1ea'), { pos: [0.021, 0.003 + PH * 0.40, PDp / 2 + 0.0003], rot: [PI / 2, 0, 0], cast: false }); prn.add(led);
    add(K.geo.tube([[0.335, CH + 0.03, -0.152], [0.336, CH + 0.024, -0.170], [0.326, CH + 0.008, -0.190], [0.308, CH + 0.0032, -0.203], [GX + 0.005, CH + 0.001, GZ - 0.002], [GX + 0.004, CH - 0.012, GZ - 0.002], [GX + 0.004, CH - 0.03, GZ - 0.002]], 0.0026, { seg: 60, rad: 8 }), rubber, [0, 0, 0]);   // the printer's cable
    // the receipt: a strip on a circle that passes through the slot. Turning it about the circle's centre feeds it out.
    const RR = 0.11, RL = 0.085, GS = 0.12, RWd = 0.057, rc = new T.Group(); rc.position.set(0, SLY - RR * Math.sin(GS), SLZ - RR * Math.cos(GS)); prn.add(rc);
    const NRc = 28, rpos = [], ruv = [], ridx = [];
    for (let i = 0; i <= NRc; i++) { const gm = RL / RR * i / NRc; for (const sx of [-1, 1]) { rpos.push(sx * RWd / 2, RR * Math.sin(gm), RR * Math.cos(gm)); ruv.push(sx > 0 ? 1 : 0, i / NRc); } }
    for (let i = 0; i < NRc; i++) { const a = i * 2; ridx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const rgeo = new T.BufferGeometry(); rgeo.setAttribute('position', new T.Float32BufferAttribute(rpos, 3)); rgeo.setAttribute('uv', new T.Float32BufferAttribute(ruv, 2)); rgeo.setIndex(ridx); rgeo.computeVertexNormals();
    const rcv = document.createElement('canvas'); rcv.width = 456; rcv.height = 680; { const x = rcv.getContext('2d'), w = 456, h = 680; x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#1b1c1f'; x.textBaseline = 'middle';
      x.textAlign = 'center'; x.font = `400 32px ${K.FONT}`; if ('letterSpacing' in x) x.letterSpacing = '6px'; x.fillText('RECEIPT', w / 2, 70); if ('letterSpacing' in x) x.letterSpacing = '0px';
      x.fillRect(46, 112, w - 92, 2); x.font = `400 27px ${K.FONT}`; const row = (a, b, y) => { x.textAlign = 'left'; x.fillText(a, 46, y); x.textAlign = 'right'; x.fillText(b, w - 46, y); };
      row('1 x Jeans 32/32', '49.00', 160); row('Total', '49.00', 214); row('Card', 'PAID', 268); x.fillRect(46, 310, w - 92, 2);
      const R = OM.rng(5); let bx = 60; while (bx < w - 60) { const bw = (1 + Math.floor(R() * 3)) * 4; x.fillRect(bx, 350, Math.min(bw, w - 60 - bx), 120); bx += bw + (1 + Math.floor(R() * 3)) * 4; }
      x.textAlign = 'center'; x.font = `400 24px ${K.FONT}`; x.fillText('Thank you', w / 2, 530); }
    const rtex = new T.CanvasTexture(rcv); rtex.colorSpace = T.SRGBColorSpace; rtex.anisotropy = 8;
    const rface = K.mat.paper('#eeece6').clone(); rface.map = rtex; rface.side = T.FrontSide; const rback = K.mat.paper('#eeece6').clone(); rback.side = T.BackSide;
    rc.add(K.mesh(rgeo, rface), K.mesh(rgeo, rback, { cast: false }));

    // ---- clothes rail behind the counter: black steel tube on four castors
    const RX = 0.6 - 0.0125, RY = 1.6 - 0.0125, FY = 0.066, EL = 0.05, rp = [];
    for (let y = FY; y < RY - EL; y += 0.06) rp.push([-RX, y, ZR]); for (let i = 0; i <= 10; i++) { const a = PI - i / 10 * PI / 2; rp.push([-RX + EL + EL * Math.cos(a), RY - EL + EL * Math.sin(a), ZR]); }
    for (let x = -RX + EL + 0.06; x < RX - EL; x += 0.06) rp.push([x, RY, ZR]); for (let i = 0; i <= 10; i++) { const a = PI / 2 - i / 10 * PI / 2; rp.push([RX - EL + EL * Math.cos(a), RY - EL + EL * Math.sin(a), ZR]); }
    for (let y = RY - EL - 0.06; y > FY; y -= 0.06) rp.push([RX, y, ZR]); rp.push([RX, FY, ZR]);
    add(K.geo.tube(rp, 0.0125, { seg: 320, rad: 16 }), black, [0, 0, 0]);
    add(K.geo.cyl(0.0125, 2 * RX, 24), black, [0, FY, ZR], { rot: [0, 0, PI / 2] });                  // low stretcher
    for (const sx of [-1, 1]) {
      add(new T.CapsuleGeometry(0.0125, 0.46, 6, 24), black, [sx * RX, FY, ZR], { rot: [PI / 2, 0, 0] });   // foot bar
      for (const sz of [-1, 1]) { add(K.geo.rbox(0.020, 0.030, 0.012, 0.003), graphite, [sx * RX, 0.040, ZR + sz * 0.21]); add(K.geo.cyl(0.021, 0.015, 28), rubber, [sx * RX, 0.021, ZR + sz * 0.21 + 0.006], { rot: [0, 0, PI / 2] }); }
    }
    const GC = ['#e9e7e1', '#1c1d20', '#9a9da3', '#dfddd7', '#55585e', '#c4c4c1'], hangerMat = K.mat.rubber('#17181b');
    GC.forEach((color, i) => { const gm = garment(K, { color, long: i === 1 || i === 4, seed: 300 + i * 17, steel, hangerMat }); gm.position.set(-0.41 + i * 0.164, RY, ZR); gm.rotation.y = PI / 2 - 0.42 - 0.05 * Math.sin(i * 2.3); g.add(gm); });

    if (o.jeans && K.assets.jeans) { const j = K.make('jeans'); j.group.position.set(-0.2, CH, 0); g.add(j.group); }   // preview only: the folded jeans where the film puts them
    g.updateMatrixWorld(true);
    const A = (obj, p) => obj.localToWorld(v3(p[0], p[1], p[2])).toArray(), aTerm = A(head, [0, SY, SZ]), aSlot = A(prn, [0, SLY, SLZ]);
    return {
      group: g,
      size: { W: CW, D: CD, H: CH, railW: 1.2, railH: 1.6, railZ: ZR },
      anchors: { top: [-0.2, CH, 0.0], terminal: aTerm, printer: aSlot, rail: [0, RY, ZR], front: [0, 0.5, CD / 2] },
      view: { l: [0, 0.8, -0.3], d: 7.4, close: aTerm, keys: o.keys || [{ az: 0.5, el: 0.2 }, { az: -0.55, el: 0.14 }, { az: 2.4, el: 0.22 }, { az: 0.25, el: 0.8 },
        { az: 0.35, el: 0.42, d: 1.5, l: [0.12, CH + 0.06, 0.0] }, { az: -0.1, el: 0.5, d: 0.62, l: aTerm }] },
      defaults: { paid: 0, receipt: 0 },
      demo(s, t) { s.paid = K.clamp((t - 5.5) / 0.4); s.receipt = K.clamp((t - 8) / 1.2); if (o.s) Object.assign(s, o.s); },
      apply(s) {
        const pd = K.clamp(s.paid); paid.material.opacity = pd; paid.visible = pd > 0.003; ledMat.color.copy(ledOff).lerp(ledOn, pd);
        const r = K.clamp(s.receipt); rc.visible = r > 0.003; rc.rotation.x = -(GS - (1 - r) * RL / RR);
      },
    };
  });
})();
