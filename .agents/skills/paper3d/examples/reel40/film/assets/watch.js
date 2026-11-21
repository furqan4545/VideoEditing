// An Apple Watch (Series 11 / 12 style, 46 mm): the hero of reel 40. Real size: 46 (Y) x 39 (X) x 9.7 (Z) mm,
// outline corner radius 10.5 mm. Aluminium case with a soft pebble side (one smooth curve from the back to the front lip),
// a thin polished lip, black cover glass that wraps over the edge (refractive edge, slightly domed top), OLED screen with a
// thin black border. +X side: knurled Digital Crown, mic hole, flat side button. -X side: two speaker grilles.
// Band slots across the top and bottom. Back: aluminium back with an engraved ring of text, two band-release pills, a
// polished chamfer, and the domed black sapphire sensor window: radial Fresnel lines, a split ring electrode, four LED
// clusters (top / right / bottom / left of centre) and four photodiodes (dark glossy squares on the diagonals).
// Local frame: origin = the case centre, the screen faces +Z, the long axis is Y (top = +Y, the crown is on +X).
//
// options: finish 'jetblack' (default, dark graphite with a clear-coat shine) | 'spacegrey' | 'silver'
//          caseMat { c, m, r, cc }  override the case colour / metalness / roughness / clearcoat
//          band   'none' (default) | 'hang' (black sport band, two straps curling away behind, product shot)
//                 | 'worn' (the band closes round a wrist: pin through a hole, a keeper loop)
//          wrist  { w: 0.058, h: 0.042, p: 2 }  wrist cross-section (Y width, Z height, metres) for band 'worn'; the loop is
//                 a superellipse of exponent p (2 = a true oval) centred under the back, the sensor touching its top
//          wristGuide true -> a plain skin-coloured forearm of that cross-section (preview / quick shots only)
//          keys / states  (preview only, like iphone.js: six camera keys / six state objects)
// state (defaults below):
//   screen   'off' | 'bpm' (Heart Rate app: big white number, red BPM, pulsing red heart) | 'alert' (Possible Hypertension)
//   on 0..1  screen brightness          gain  linear level of white on the screen (0.78 = just under the bloom)
//   bpm      integer shown on the screen (the canvas is redrawn only when screen / bpm change)
//   pulse 0..1   the heart icon's beat (scale + brightness)
//   led 0..1     green LED brightness     flash 0..1  strobe gate (lit = led * flash)
//   glow 0..1    soft green spill around the back ("light into the skin"), bloom picks it up
//   pd 0..1      the four photodiodes catch a faint green glint (light coming back)
//   crown        radians the Digital Crown has turned
// API: ledPoints() / pdPoints() -> four local [x, y, z] each (on the sensor face, outside; order top, right, bottom, left /
//      top-right, top-left, bottom-left, bottom-right), screenPoint(u, v, zmm) -> local point on the glass (u, v from the
//      screen's top-left, 0..1; zmm millimetres above the glass)
// anchors: screen, back, crown, button, leds (centre of the LED ring), wrist (centre of the wrist oval, band 'worn')
KIT.asset('watch', (K, o) => {
  o = o || {};
  const T = THREE, g = new T.Group(), PI = Math.PI, clamp = K.clamp;
  const SH_ = K._watchShared || (K._watchShared = {}), once = (k, f) => SH_[k] || (SH_[k] = f());
  // ---------------------------------------------------------------- sizes (metres)
  const W = 0.039, H = 0.046, RC = 0.0105;
  const zBack = -0.0038, zEq = 0.0006, zLip = 0.0036;                           // back face, widest line, front lip
  const NB = 0.0035, NL = 0.0011, rzB = zEq - zBack, rzF = zLip - zEq;           // insets of the back face and the lip
  const GI = 0.0012, GE = 0.0026, zG0 = zLip - 0.00015, zG1 = 0.0047, GV = zG1 - zG0, DOME = 0.00015, GSPLIT = 0.0019;
  const SW = 0.0324, SHh = 0.0386, RS = 0.0073, zScr = 0.0040, zInk = 0.0034;  // display 416 x 496 px at 326 ppi
  const RWIN = 0.0128, RCH = 0.0133, zWin = zBack - 0.00028, HD = 0.00082, zApex = zWin - HD;
  const CRY = 0.0118, CRZ = 0.0003, BTY = -0.0024;                               // crown and side button
  const zS = -0.0004, SLH = 0.0016, SLX = 0.0122;                                // band slot centre z, half height, half length
  const RE = 0.0034;                                                             // radius of the LED / photodiode ring
  const FIN = { jetblack: { c: '#3e4045', m: 0.5, r: 0.25, cc: 1, lip: '#9a9da4', txt: 'rgba(150,154,162,0.78)' },
    spacegrey: { c: '#686b71', m: 0.6, r: 0.3, cc: 0.35, lip: '#b5b8be', txt: 'rgba(30,31,34,0.55)' },
    silver: { c: '#c6c9ce', m: 0.9, r: 0.3, cc: 0.2, lip: '#eceef1', txt: 'rgba(60,62,66,0.5)' } };
  const finKey = FIN[o.finish] ? o.finish : 'jetblack', F = Object.assign({}, FIN[finKey], o.caseMat || {});
  const BAND = o.band || 'none';

  // ---------------------------------------------------------------- small geometry kit (as in iphone.js / tag.js)
  function Geo() {
    const P = [], N = [], U = [], I = [];
    const v = (x, y, z, nx, ny, nz, u = 0, w = 0) => { P.push(x, y, z); N.push(nx, ny, nz); U.push(u, w); return P.length / 3 - 1; };
    const tri = (a, b, c) => {
      const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2], ux = P[b * 3] - ax, uy = P[b * 3 + 1] - ay, uz = P[b * 3 + 2] - az, vx = P[c * 3] - ax, vy = P[c * 3 + 1] - ay, vz = P[c * 3 + 2] - az;
      const d = (uy * vz - uz * vy) * (N[a * 3] + N[b * 3] + N[c * 3]) + (uz * vx - ux * vz) * (N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1]) + (ux * vy - uy * vx) * (N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2]);
      if (d >= 0) I.push(a, b, c); else I.push(a, c, b);
    };
    const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
    const build = () => { const G = new T.BufferGeometry(); G.setAttribute('position', new T.Float32BufferAttribute(P, 3)); G.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); G.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); G.setIndex(I); G.computeBoundingSphere(); return G; };
    return { v, tri, quad, build };
  }
  // rounded rectangle path in XY (outward normals, arc length); the same points as rrPts
  function rrPath(w, h, r, n) {
    const pts = []; let s = 0, prev = null;
    for (const [sx, sy, q] of [[1, 1, 0], [-1, 1, 1], [-1, -1, 2], [1, -1, 3]]) for (let i = 0; i <= n; i++) {
      const a = (q + i / n) * PI / 2, nx = Math.cos(a), ny = Math.sin(a), x = sx * (w / 2 - r) + nx * r, y = sy * (h / 2 - r) + ny * r;
      if (prev) s += Math.hypot(x - prev.x, y - prev.y); const p = { x, y, nx, ny, s }; pts.push(p); prev = p;
    }
    pts.len = s + Math.hypot(pts[0].x - prev.x, pts[0].y - prev.y); return pts;
  }
  const rrPts = (w, h, r, n = 28) => rrPath(w, h, r, n).map(p => [p.x, p.y]);
  // sweep a profile (runFn(p) -> [[inset, z, outwardNormal, zNormal], ...], same length for every p) along a path
  function sweep(G, path, runFn, closed = true, uvs = 0.02) {
    const m = path.length, cnt = closed ? m + 1 : m, rows = [];
    for (let i = 0; i < cnt; i++) {
      const p = path[i % m], s = i === m ? path.len : p.s, run = runFn(p); let acc = 0;
      rows.push(run.map((q, j) => { if (j) acc += Math.hypot(q[0] - run[j - 1][0], q[1] - run[j - 1][1]); return G.v(p.x - p.nx * q[0], p.y - p.ny * q[0], q[1], p.nx * q[2], p.ny * q[2], q[3], s / uvs, acc / uvs); }));
    }
    for (let i = 0; i < cnt - 1; i++) for (let j = 0; j < rows[i].length - 1; j++) G.quad(rows[i][j], rows[i + 1][j], rows[i + 1][j + 1], rows[i][j + 1]);
  }
  // a surface of revolution about Z facing -Z (the back): z = f(r), slope fp(r); planar UVs over the sensor window
  function polar(G, rs, f, fp, a0 = 0, a1 = 2 * PI, M = 160) {
    const rows = [];
    for (const r of rs) { const d = fp(r), l = Math.hypot(d, 1), row = [];
      for (let i = 0; i <= M; i++) { const a = a0 + (a1 - a0) * i / M, c = Math.cos(a), s = Math.sin(a);
        row.push(G.v(r * c, r * s, f(r), d * c / l, d * s / l, -1 / l, 0.5 - r * c / (2 * RWIN), 0.5 + r * s / (2 * RWIN))); }
      rows.push(row); }
    for (let k = 0; k < rows.length - 1; k++) for (let i = 0; i < M; i++) G.quad(rows[k][i], rows[k][i + 1], rows[k + 1][i + 1], rows[k + 1][i]);
  }
  const shapeOf = (pts, holes = []) => { const s = new T.Shape(pts.map(p => new T.Vector2(p[0], p[1]))); for (const h of holes) s.holes.push(new T.Path(h.map(p => new T.Vector2(p[0], p[1])))); return s; };
  function flat(pts, holes = []) {
    const G = new T.ShapeGeometry(shapeOf(pts, holes), 12); G.computeBoundingBox(); const bb = G.boundingBox, uv = G.attributes.uv, p = G.attributes.position;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - bb.min.x) / (bb.max.x - bb.min.x), (p.getY(i) - bb.min.y) / (bb.max.y - bb.min.y)); return G;
  }
  const rr = (w, h, r, n = 14) => K.geo.rrect(w, h, Math.min(r, w / 2, h / 2), n);
  const stadium = (w, h, n = 12) => rr(w, h, h / 2, n);
  const circle = (r, n = 96) => { const p = []; for (let i = 0; i < n; i++) { const a = i / n * 2 * PI; p.push([r * Math.cos(a), r * Math.sin(a)]); } return p; };
  const back = G => { G.rotateY(PI); return G; };                       // a +Z-facing flat turned to face -Z (reads right from behind)
  const soft = (m, order) => { m.castShadow = false; m.receiveShadow = false; m.userData.noAO = true; m.userData.noDepth = true; if (order != null) m.renderOrder = order; return m; };
  const decal = m => { m.polygonOffset = true; m.polygonOffsetFactor = -1; m.polygonOffsetUnits = -4; return m; };
  const nrm = (a, b) => { const l = Math.hypot(a, b); return [a / l, b / l]; };
  // the case side: inset and outward normal at height z (back half: a quarter ellipse, front half: a narrow one up to the lip)
  function sideAt(z) {
    if (z <= zEq) { const c = clamp((zEq - z) / rzB, 0, 1), s = Math.sqrt(1 - c * c), [a, b] = nrm(s / NB, -c / rzB); return [NB * (1 - s), a, b]; }
    const s = clamp((z - zEq) / rzF, 0, 1), c = Math.sqrt(1 - s * s), [a, b] = nrm(c / NL, s / rzF); return [NL * (1 - c), a, b];
  }

  // ---------------------------------------------------------------- materials
  const grainTex = once('grain', () => K.canvasTex(K.noiseCanvas(256, 23, 'grain'), { srgb: false, repeat: 6 }));
  const mCase = new T.MeshPhysicalMaterial({ color: new T.Color(F.c), metalness: F.m, roughness: F.r, envMapIntensity: 1.9, bumpMap: grainTex, bumpScale: 0.025, clearcoat: F.cc, clearcoatRoughness: 0.07 });
  const mLip = new T.MeshStandardMaterial({ color: new T.Color(F.lip), metalness: 1, roughness: 0.08, envMapIntensity: 2.0 });
  const mPolish = new T.MeshStandardMaterial({ color: new T.Color(F.lip), metalness: 1, roughness: 0.1, envMapIntensity: 1.8 });
  const mBtn = mCase.clone(); mBtn.roughness = Math.max(0.1, F.r - 0.06);
  const mHole = new T.MeshBasicMaterial({ color: new T.Color('#020203') });
  const mSlot = new T.MeshStandardMaterial({ color: new T.Color('#050506'), roughness: 0.55, metalness: 0.2 });
  const mInk = new T.MeshBasicMaterial({ color: new T.Color('#010102') });
  const mGlassF = new T.MeshPhysicalMaterial({ color: new T.Color('#000000'), roughness: 0.03, metalness: 0, envMapIntensity: 1.9, transparent: true, blending: T.AdditiveBlending, depthWrite: false });
  const mGlassE = new T.MeshPhysicalMaterial({ color: new T.Color('#000000'), roughness: 0.03, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.9 });

  // ---------------------------------------------------------------- the case: side sweep, polished lip, back face
  const body = new T.Group(); g.add(body);
  const runSide = [];
  for (let i = 0; i <= 18; i++) { const th = PI / 2 * i / 18, [a, b] = nrm(Math.sin(th) / NB, -Math.cos(th) / rzB); runSide.push([NB * (1 - Math.sin(th)), zEq - rzB * Math.cos(th), a, b]); }
  for (let i = 1; i <= 14; i++) { const ph = PI / 2 * i / 14, [a, b] = nrm(Math.cos(ph) / NL, Math.sin(ph) / rzF); runSide.push([NL * (1 - Math.cos(ph)), zEq + rzF * Math.sin(ph), a, b]); }
  const casePath = rrPath(W, H, RC, 28);
  const GC = Geo(); sweep(GC, casePath, () => runSide); sweep(GC, casePath, () => [[NL + 0.0002, zLip, -1, 0], [NL + 0.0002, zLip - 0.0009, -1, 0]]);
  body.add(K.mesh(GC.build(), mCase));
  const GL = Geo(); sweep(GL, casePath, () => [[NL - 0.00002, zLip, 0, 1], [NL + 0.0002, zLip, 0, 1]]);
  body.add(K.mesh(GL.build(), mLip, { cast: false }));
  // back face (aluminium) with the round opening for the sensor window
  body.add(K.mesh(back(flat(rrPts(W - 2 * NB, H - 2 * NB, RC - NB), [circle(RCH, 160)])), mCase, { pos: [0, 0, zBack] }));
  // band slots: a dark strip on the curved top and bottom faces, rounded ends
  for (const sy of [1, -1]) {
    const seg = casePath.filter(p => p.y * sy > 0 && Math.abs(p.x) < SLX);
    seg.sort((a, b) => a.x - b.x);
    const GS = Geo();
    sweep(GS, seg, p => { const e = Math.max(0, Math.abs(p.x) - (SLX - SLH)) / SLH, hh = SLH * Math.sqrt(Math.max(0.02, 1 - e * e)), run = [];
      for (let j = 0; j <= 6; j++) { const z = zS - hh + 2 * hh * j / 6, [n, a, b] = sideAt(z); run.push([n - 0.000025, z, a, b]); } return run; }, false);
    body.add(K.mesh(GS.build(), mSlot, { cast: false }));
  }
  // engraved ring of text round the window
  const txtTex = once('txt' + finKey, () => { const S = 2048, cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'), px = S / 0.034;
    c.fillStyle = F.txt; c.font = `500 ${Math.round(0.00092 * px)}px ${K.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    const str = 'SERIES 11  •  46MM ALUMINUM CASE  •  ION-X GLASS  •  GPS  •  WR-50M  •  ', rad = 0.01475 * px;
    let tot = 0; const ws = [...str].map(ch => { const w = c.measureText(ch).width + 0.00012 * px; tot += w; return w; });
    let a = -PI / 2 - (tot / rad) * 0.5; [...str].forEach((ch, i) => { const aw = ws[i] / rad; a += aw / 2; c.save(); c.translate(S / 2 + Math.cos(a) * rad, S / 2 + Math.sin(a) * rad); c.rotate(a + PI / 2); c.fillText(ch, 0, 0); c.restore(); a += aw / 2; });
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; });
  const txt = new T.Mesh(back(new T.PlaneGeometry(0.034, 0.034)), decal(new T.MeshStandardMaterial({ map: txtTex, transparent: true, roughness: 0.5, metalness: 0.4, depthWrite: false })));
  txt.position.z = zBack - 0.000004; soft(txt, 2); txt.userData.noDepth = false; body.add(txt);
  // band-release pills on the back
  for (const sy of [1, -1]) {
    body.add(K.mesh(back(flat(stadium(0.0087, 0.0022))), decal(mHole.clone()), { cast: false, pos: [0, sy * 0.0172, zBack - 0.000004] }));
    body.add(K.mesh(back(flat(stadium(0.0081, 0.0016))), decal(mBtn.clone()), { cast: false, pos: [0, sy * 0.0172, zBack - 0.000008] }));
  }

  // ---------------------------------------------------------------- the sensor window (domed sapphire) and the optical sensor
  const domeZ = r => zWin - HD * (1 - (r / RWIN) * (r / RWIN)), domeD = r => 2 * HD * r / (RWIN * RWIN);
  const GCh = Geo(); polar(GCh, [RCH, RWIN], r => zBack + (zWin - zBack) * (RCH - r) / (RCH - RWIN), () => (zBack - zWin) / (RCH - RWIN), 0, 2 * PI, 160);
  body.add(K.mesh(GCh.build(), mPolish, { cast: false }));
  const domeTex = once('dome', () => {
    const S = 2048, cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'), m = S / 2, R = S / 2;
    const gr = c.createRadialGradient(m, m, 0, m, m, R);
    gr.addColorStop(0, '#07080a'); gr.addColorStop(0.43, '#090a0d'); gr.addColorStop(0.5, '#14161b'); gr.addColorStop(0.78, '#1d2026'); gr.addColorStop(0.95, '#15171c'); gr.addColorStop(1, '#0b0c0f');
    c.fillStyle = gr; c.fillRect(0, 0, S, S);
    const ring = (f, col, w) => { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.arc(m, m, R * f, 0, 2 * PI); c.stroke(); };
    // Fresnel facets: 72 radial spokes, each a light line with a dark partner
    for (let i = 0; i < 72; i++) { const a = i / 72 * 2 * PI;
      for (const [da, col, w] of [[0, 'rgba(176,184,198,0.34)', 2.4], [0.012, 'rgba(0,0,0,0.42)', 3]]) { c.strokeStyle = col; c.lineWidth = w; c.beginPath();
        c.moveTo(m + Math.cos(a + da) * R * 0.535, m + Math.sin(a + da) * R * 0.535); c.lineTo(m + Math.cos(a + da) * R * 0.972, m + Math.sin(a + da) * R * 0.972); c.stroke(); } }
    ring(0.53, 'rgba(180,188,200,0.5)', 3); ring(0.975, 'rgba(170,178,190,0.4)', 3); ring(0.985, 'rgba(0,0,0,0.6)', 6);
    ring(0.405, 'rgba(120,128,142,0.32)', 2); ring(0.37, 'rgba(90,96,108,0.22)', 2);
    // the split between the two electrode halves
    c.strokeStyle = 'rgba(0,0,0,0.85)'; c.lineWidth = 7; for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(m + sx * R * 0.49, m); c.lineTo(m + sx * R * 0.985, m); c.stroke(); }
    c.strokeStyle = 'rgba(150,158,172,0.35)'; c.lineWidth = 2; for (const sx of [-1, 1]) for (const dy of [-5, 5]) { c.beginPath(); c.moveTo(m + sx * R * 0.5, m + dy); c.lineTo(m + sx * R * 0.975, m + dy); c.stroke(); }
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 16; return t; });
  const mDome = new T.MeshPhysicalMaterial({ map: domeTex, color: new T.Color('#ffffff'), roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.5 });
  const rsD = []; for (let k = 0; k <= 34; k++) rsD.push(RWIN * k / 34);
  const GD = Geo(); polar(GD, rsD, domeZ, domeD, 0, 2 * PI, 180); body.add(K.mesh(GD.build(), mDome, { cast: false }));
  // the ring electrode: two dark-metal half rings
  const mElec = new T.MeshStandardMaterial({ color: new T.Color('#7a7f88'), metalness: 1, roughness: 0.26, envMapIntensity: 1.5 });
  const GEl = Geo(); for (const a0 of [0.07, PI + 0.07]) polar(GEl, [0.00575, 0.006, 0.00625], r => domeZ(r) - 0.000012, domeD, a0, a0 + PI - 0.14, 90);
  body.add(K.mesh(GEl.build(), mElec, { cast: false }));
  // LED clusters and photodiodes, each in a little frame tilted to the dome
  const ledAng = [PI / 2, 0, -PI / 2, PI], pdAng = [PI / 4, 3 * PI / 4, -3 * PI / 4, -PI / 4];
  const placeOnDome = (grp, ang, r, spin = ang) => { const x = r * Math.cos(ang), y = r * Math.sin(ang), d = domeD(r), l = Math.hypot(d, 1);
    const n = new T.Vector3(d * Math.cos(ang) / l, d * Math.sin(ang) / l, -1 / l), q2 = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 0, -1), n), q1 = new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), spin);
    grp.position.set(x, y, domeZ(r)); grp.quaternion.copy(q2.multiply(q1)); body.add(grp); };
  const pdTex = once('pd', () => { const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'), gr = c.createLinearGradient(0, 0, S, S);
    gr.addColorStop(0, '#1d2038'); gr.addColorStop(0.5, '#0c0e1c'); gr.addColorStop(1, '#171a30'); c.fillStyle = gr; c.fillRect(0, 0, S, S);
    c.strokeStyle = 'rgba(150,160,190,0.55)'; c.lineWidth = 3; c.strokeRect(22, 22, S - 44, S - 44);
    c.lineWidth = 2; for (let i = 1; i < 6; i++) { const x = 22 + (S - 44) * i / 6; c.beginPath(); c.moveTo(x, 22); c.lineTo(x, S - 22); c.stroke(); }
    c.fillStyle = 'rgba(170,178,200,0.7)'; c.fillRect(S / 2 - 18, 6, 36, 20);
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; });
  const mBezel = decal(new T.MeshStandardMaterial({ color: new T.Color('#30343a'), metalness: 1, roughness: 0.3, envMapIntensity: 1.4 }));
  const mLens = decal(new T.MeshPhysicalMaterial({ color: new T.Color('#59626a'), roughness: 0.42, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1.3 }));
  const mDieG = decal(new T.MeshStandardMaterial({ color: new T.Color('#b9c8bd'), roughness: 0.35, metalness: 0.2 }));
  const mDieR = decal(new T.MeshStandardMaterial({ color: new T.Color('#5a4446'), roughness: 0.35, metalness: 0.2 }));
  const mPDf = decal(new T.MeshStandardMaterial({ color: new T.Color('#7b8089'), metalness: 1, roughness: 0.28, envMapIntensity: 1.5 }));
  const mPD = decal(new T.MeshPhysicalMaterial({ map: pdTex, color: new T.Color('#ffffff'), roughness: 0.05, metalness: 0.1, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.75, iridescenceIOR: 1.7, iridescenceThicknessRange: [260, 560], envMapIntensity: 1.8 }));
  const gradTex = once('grad', () => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'), gr = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.12, 'rgba(255,255,255,0.62)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.2)'); gr.addColorStop(0.65, 'rgba(255,255,255,0.05)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 256, 256); const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t; });
  const spillTex = once('spill', () => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'), gr = c.createRadialGradient(128, 128, 0, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.07, 'rgba(255,255,255,0.72)'); gr.addColorStop(0.2, 'rgba(255,255,255,0.3)'); gr.addColorStop(0.42, 'rgba(255,255,255,0.08)'); gr.addColorStop(0.7, 'rgba(255,255,255,0.015)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 256, 256); const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t; });
  const glowM = (col, map) => { const m = K.mat.glow(col, 0); m.blending = T.AdditiveBlending; if (map) m.map = map; return m; };
  const mCore = glowM('#a6ffbe'), mHalo = glowM(K.col.oledG, gradTex), mScat = glowM('#22e85c', gradTex), mSpill = glowM('#25f064', spillTex), mPDg = glowM('#5dff8f', gradTex);
  const ledGeoB = back(new T.RingGeometry(0.00062, 0.00074, 48)), ledGeoL = back(new T.CircleGeometry(0.00062, 48)), dieGeo = back(new T.PlaneGeometry(0.00024, 0.00024));
  const coreGeo = back(new T.CircleGeometry(0.00046, 48)), haloGeo = back(new T.PlaneGeometry(0.0058, 0.0058));
  const pdOut = rr(0.0021, 0.0021, 0.00045, 8), pdIn = rr(0.0018, 0.0018, 0.00034, 8);
  const pdGeoF = back(flat(pdOut, [pdIn])), pdGeoS = back(flat(pdIn)), pdGlowGeo = back(new T.PlaneGeometry(0.0034, 0.0034));
  const glows = [];
  for (const a of ledAng) { const L = new T.Group();
    L.add(K.mesh(ledGeoB, mBezel, { cast: false, pos: [0, 0, -0.000006] })); L.add(K.mesh(ledGeoL, mLens, { cast: false, pos: [0, 0, -0.000005] }));
    L.add(K.mesh(dieGeo, mDieG, { cast: false, pos: [0.00016, 0, -0.000009] })); L.add(K.mesh(dieGeo, mDieR, { cast: false, pos: [-0.00016, 0.00005, -0.000009] }));
    const core = soft(K.mesh(coreGeo, mCore, { pos: [0, 0, -0.000025] }), 8), halo = soft(K.mesh(haloGeo, mHalo, { pos: [0, 0, -0.00004] }), 8); L.add(core); L.add(halo); glows.push(core, halo);
    placeOnDome(L, a, RE); }
  const pdGl = [];
  for (const a of pdAng) { const P = new T.Group();
    P.add(K.mesh(pdGeoF, mPDf, { cast: false, pos: [0, 0, -0.000006] })); P.add(K.mesh(pdGeoS, mPD, { cast: false, pos: [0, 0, -0.000005] }));
    const pg = soft(K.mesh(pdGlowGeo, mPDg, { pos: [0, 0, -0.00003] }), 8); P.add(pg); pdGl.push(pg);
    placeOnDome(P, a, RE, 0); }
  const scat = soft(K.mesh(back(new T.PlaneGeometry(0.016, 0.016)), mScat, { pos: [0, 0, zApex - 0.00003] }), 7); body.add(scat);
  const spill = soft(K.mesh(back(new T.PlaneGeometry(0.062, 0.062)), mSpill, { pos: [0, 0, zApex - 0.0004] }), 9); body.add(spill);

  // ---------------------------------------------------------------- side: Digital Crown, side button, mic, speaker grilles
  const crown = new T.Group(); crown.position.set(0, CRY, CRZ); body.add(crown);
  const xa = W / 2, alongX = G => { G.rotateZ(-PI / 2); return G; };          // a Y-axis lathe / cylinder turned to run along +X
  crown.add(K.mesh(alongX(new T.CylinderGeometry(0.0026, 0.0026, 0.0026, 48, 1, true)), mSlot, { pos: [xa - 0.0009, 0, 0] }));   // the neck, in shadow
  const GK = (() => {                                                           // knurled head: 60 grooves
    const Gk = Geo(), M = 360, NG = 60, x0 = xa + 0.00045, x1 = xa + 0.0023, R0 = 0.0033, dk = 0.00011, rows = [];
    const rad = a => R0 - dk * Math.pow(0.5 - 0.5 * Math.cos(NG * a), 2);
    for (let j = 0; j <= 4; j++) { const x = x0 + (x1 - x0) * j / 4, row = [];
      for (let i = 0; i <= M; i++) { const a = i / M * 2 * PI, r = rad(a), dr = (rad(a + 1e-4) - rad(a - 1e-4)) / 2e-4;
        const ny = Math.cos(a) * r + Math.sin(a) * dr, nz = Math.sin(a) * r - Math.cos(a) * dr, l = Math.hypot(ny, nz);
        row.push(Gk.v(x, Math.cos(a) * r, Math.sin(a) * r, 0, ny / l, nz / l, a / (2 * PI), j / 4)); }
      rows.push(row); }
    for (let j = 0; j < 4; j++) for (let i = 0; i < M; i++) Gk.quad(rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]);
    return Gk.build(); })();
  crown.add(K.mesh(GK, mBtn));
  const lathe = pts => alongX(new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), 96));
  crown.add(K.mesh(lathe([[0.0026, xa + 0.0004], [0.00318, xa + 0.00045]]).rotateX(0), mBtn));                       // back of the head
  crown.add(K.mesh(lathe([[0.0033, xa + 0.0023], [0.00322, xa + 0.00245], [0.00298, xa + 0.00262], [0.0028, xa + 0.00268]]), mPolish, { cast: false }));   // polished chamfer
  crown.add(K.mesh(lathe([[0.0028, xa + 0.00268], [0.0026, xa + 0.00272], [0.0016, xa + 0.00268], [0.0001, xa + 0.00264]]), mBtn, { cast: false }));    // the face, a hair concave
  crown.add(K.mesh(lathe([[0.00262, xa + 0.000405], [0.00262, xa + 0.0005]]).rotateX(0), mSlot, { cast: false }));
  // side button: a long flat pill nearly flush, in a dark gap
  body.add(K.mesh(K.geo.rbox(0.0009, 0.0120, 0.00268, 0.00042, 4), mSlot, { cast: false, pos: [xa - 0.00046, BTY, CRZ] }));
  body.add(K.mesh(K.geo.rbox(0.0011, 0.0117, 0.00245, 0.00045, 5), mBtn, { pos: [xa - 0.00035, BTY, CRZ] }));
  // mic hole between crown and button
  const sideHole = (r, x, y, z, sx) => { const G = new T.CircleGeometry(r, 16); G.rotateY(sx * PI / 2); return K.mesh(G, decal(mHole.clone()), { cast: false, pos: [x, y, z] }); };
  body.add(sideHole(0.00028, xa - sideAt(CRZ)[0] + 0.00001, 0.0063, CRZ, 1));
  // speaker grilles on -X: two groups of tiny holes in three staggered rows
  { const parts = [];
    for (const yc of [0.0042, -0.0062]) for (let row = -1; row <= 1; row++) for (let i = 0; i < 17; i++) {
      const z = zEq + row * 0.00036, y = yc + (i - 8 + (row ? 0.5 : 0)) * 0.00044; if (row && i === 16) continue;
      const G = new T.CircleGeometry(0.000125, 10); G.rotateY(-PI / 2); G.translate(-(xa - sideAt(z)[0]) - 0.00001, y, z); parts.push(G); }
    body.add(K.mesh(THREEX.BufferGeometryUtils.mergeGeometries(parts), decal(mHole.clone()), { cast: false })); }

  // ---------------------------------------------------------------- front: black ink, display, cover glass
  body.add(K.mesh(flat(rrPts(W - 2 * GI, H - 2 * GI, RC - GI)), mInk, { cast: false, pos: [0, 0, zInk] }));
  const UW = 1248, UH = 1488, PX = 3;                                            // canvas: 416 x 496 pt at 3 px per point
  const uiCv = document.createElement('canvas'); uiCv.width = UW; uiCv.height = UH; const ui = uiCv.getContext('2d');
  const uiTex = new T.CanvasTexture(uiCv); uiTex.colorSpace = T.SRGBColorSpace; uiTex.anisotropy = 16;
  const mScr = new T.MeshBasicMaterial({ map: uiTex, toneMapped: false });
  const scr = K.mesh(flat(rrPts(SW, SHh, RS, 20)), mScr, { cast: false, receive: false, pos: [0, 0, zScr] }); scr.userData.noAO = true; body.add(scr);
  // the heart icon of the Heart Rate app: its own little plane so it can beat without redrawing the screen
  const heartPath = (c, cx, cy, s) => { const q = s / 100; c.beginPath(); c.moveTo(cx, cy + 36 * q);
    c.bezierCurveTo(cx - 12 * q, cy + 27 * q, cx - 50 * q, cy + 4 * q, cx - 50 * q, cy - 18 * q); c.bezierCurveTo(cx - 50 * q, cy - 38 * q, cx - 35 * q, cy - 49 * q, cx - 23 * q, cy - 49 * q);
    c.bezierCurveTo(cx - 11 * q, cy - 49 * q, cx - 3 * q, cy - 42 * q, cx, cy - 33 * q); c.bezierCurveTo(cx + 3 * q, cy - 42 * q, cx + 11 * q, cy - 49 * q, cx + 23 * q, cy - 49 * q);
    c.bezierCurveTo(cx + 35 * q, cy - 49 * q, cx + 50 * q, cy - 38 * q, cx + 50 * q, cy - 18 * q); c.bezierCurveTo(cx + 50 * q, cy + 4 * q, cx + 12 * q, cy + 27 * q, cx, cy + 36 * q); c.closePath(); };
  const heartTex = once('heart', () => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'); c.fillStyle = '#ff3b30'; heartPath(c, 128, 136, 200); c.fill();
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t; });
  const HPL = 0.0036, mHeart = new T.MeshBasicMaterial({ map: heartTex, transparent: true, depthWrite: false, toneMapped: false });
  const heart = soft(new T.Mesh(new T.PlaneGeometry(HPL, HPL), mHeart), 3); heart.position.z = zScr + 0.000012; heart.visible = false; body.add(heart);
  const heartAt = { x: 0, y: 0 };
  // cover glass: an opaque black glossy edge (the border, wrapping over), a clear top over the display, a gentle dome
  const glass = new T.Group(); g.add(glass);
  const gPath = rrPath(W - 2 * GI, H - 2 * GI, RC - GI, 28), psiS = Math.acos(1 - GSPLIT / GE), gpt = ps => { const [a, b] = nrm(Math.cos(ps) / GE, Math.sin(ps) / GV); return [GE * (1 - Math.cos(ps)), zG0 + GV * Math.sin(ps), a, b]; };
  const runGA = [], runGB = []; for (let i = 0; i <= 14; i++) runGA.push(gpt(psiS * i / 14)); for (let i = 0; i <= 5; i++) runGB.push(gpt(psiS + (PI / 2 - psiS) * i / 5));
  const GGA = Geo(); sweep(GGA, gPath, () => runGA); sweep(GGA, gPath, () => [[GSPLIT, runGA[14][1], -1, 0], [GSPLIT, zInk, -1, 0]]);
  const gEdge = K.mesh(GGA.build(), mGlassE, { cast: false }); gEdge.userData.noAO = true; glass.add(gEdge);
  const GGB = Geo(); sweep(GGB, gPath, () => runGB);
  { const inner = rrPath(W - 2 * (GI + GE), H - 2 * (GI + GE), RC - GI - GE, 28), KR = 12, rows = [];
    for (let k = 0; k <= KR; k++) { const lam = 1 - k / KR, row = [];
      for (let i = 0; i <= inner.length; i++) { const p = inner[i % inner.length], pl = Math.hypot(p.x, p.y), sl = 2 * DOME * lam / pl, nx = sl * p.x / pl, ny = sl * p.y / pl, l = Math.hypot(nx, ny, 1);
        row.push(GGB.v(lam * p.x, lam * p.y, zG1 + DOME * (1 - lam * lam), nx / l, ny / l, 1 / l)); }
      rows.push(row); }
    for (let k = 0; k < KR; k++) for (let i = 0; i < inner.length; i++) GGB.quad(rows[k][i], rows[k][i + 1], rows[k + 1][i + 1], rows[k + 1][i]); }
  const gTop = new T.Mesh(GGB.build(), mGlassF); gTop.renderOrder = 6; gTop.userData.noAO = true; gTop.castShadow = false; gTop.receiveShadow = false; glass.add(gTop);

  // ---------------------------------------------------------------- the screen UI
  const FONT = K.FONT, RED = '#ff3b30';
  const histR = OM.rng(4011), hist = []; { let v = 0.45; for (let i = 0; i < 30; i++) { v = clamp(v + (histR() - 0.5) * 0.32, 0.08, 0.92); hist.push(v); } }
  function tabular(c, str, x, y) {                                               // tabular digits: every digit in the same cell
    let dw = 0; for (let d = 0; d < 10; d++) dw = Math.max(dw, c.measureText(String(d)).width);
    c.textAlign = 'center'; for (let i = 0; i < str.length; i++) c.fillText(str[i], x + dw * (i + 0.5), y); return dw * str.length;
  }
  function drawUI(s) {
    const c = ui, P = PX; c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#000'; c.fillRect(0, 0, UW, UH); heart.visible = false;
    if (s.screen === 'bpm') {
      c.textBaseline = 'alphabetic';
      c.fillStyle = RED; c.font = `600 ${18 * P}px ${FONT}`; c.textAlign = 'left'; c.fillText('Heart Rate', 40 * P, 58 * P);
      c.fillStyle = '#ffffff'; c.font = `500 ${18 * P}px ${FONT}`; c.textAlign = 'right'; c.fillText('10:09', 378 * P, 58 * P);
      c.fillStyle = '#8e8e93'; c.font = `500 ${19 * P}px ${FONT}`; c.textAlign = 'left'; c.fillText('Current', 36 * P, 176 * P);
      c.fillStyle = '#ffffff'; c.font = `500 ${128 * P}px ${FONT}`; try { c.letterSpacing = `${-3 * P}px`; } catch (e) {}
      const num = String(Math.max(0, Math.round(s.bpm))), nw = tabular(c, num, 30 * P, 300 * P); try { c.letterSpacing = '0px'; } catch (e) {}
      const bx = 30 * P + nw + 10 * P;
      c.fillStyle = RED; c.font = `600 ${30 * P}px ${FONT}`; c.textAlign = 'left'; c.fillText('BPM', bx, 298 * P);
      const bw = c.measureText('BPM').width; heartAt.x = bx + bw / 2; heartAt.y = 250 * P; heart.visible = true;
      // the last two minutes: faint guide lines and red dots, the latest one white
      c.strokeStyle = 'rgba(142,142,147,0.35)'; c.lineWidth = 1.5 * P; c.setLineDash([3 * P, 4 * P]);
      for (const y of [362, 452]) { c.beginPath(); c.moveTo(36 * P, y * P); c.lineTo(380 * P, y * P); c.stroke(); } c.setLineDash([]);
      c.fillStyle = '#8e8e93'; c.font = `500 ${15 * P}px ${FONT}`; c.textAlign = 'right'; c.fillText('2 min', 380 * P, 478 * P);
      hist.forEach((v, i) => { const x = (44 + i * 11.3) * P, y = (446 - v * 78) * P; c.fillStyle = i === hist.length - 1 ? '#ffffff' : RED; c.beginPath(); c.arc(x, y, (i === hist.length - 1 ? 5 : 3.6) * P, 0, 2 * PI); c.fill(); });
    } else if (s.screen === 'alert') {
      const ts = 150 * P, tx = UW / 2 - ts / 2, ty = 92 * P;
      c.save(); c.shadowColor = 'rgba(255,255,255,0.08)'; c.shadowBlur = 40 * P;
      const tg = c.createLinearGradient(0, ty, 0, ty + ts); tg.addColorStop(0, '#ffffff'); tg.addColorStop(1, '#e6e6eb'); c.fillStyle = tg;
      c.beginPath(); c.roundRect(tx, ty, ts, ts, ts * 0.225); c.fill(); c.restore();
      c.save(); c.shadowColor = 'rgba(200,20,50,0.35)'; c.shadowBlur = 10 * P; c.shadowOffsetY = 3 * P;
      const hx = tx + ts * 0.6, hy = ty + ts * 0.4, hs = ts * 0.46, hg = c.createLinearGradient(0, hy - hs * 0.5, 0, hy + hs * 0.4);
      hg.addColorStop(0, '#ff6b8a'); hg.addColorStop(0.55, '#ff2d55'); hg.addColorStop(1, '#f01a3c'); c.fillStyle = hg; heartPath(c, hx, hy, hs); c.fill(); c.restore();
      c.fillStyle = '#ffffff'; c.font = `600 ${34 * P}px ${FONT}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
      c.fillText('Possible', UW / 2, 318 * P); c.fillText('Hypertension', UW / 2, 360 * P);
    }
    uiTex.needsUpdate = true;
  }

  // ---------------------------------------------------------------- the sport band
  const mBand = new T.MeshPhysicalMaterial({ color: new T.Color('#17181b'), roughness: 0.46, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.35, envMapIntensity: 1.4, sheen: 0.4, sheenRoughness: 0.5, sheenColor: new T.Color('#3a3f48') });
  const BW = 0.0215, BW0 = 0.0232, BT = 0.0026;                                  // width, width at the case, thickness
  // a strap along a dense 2D centreline in the YZ plane (x = width). C = a point on its inner side (sets the outer face).
  function strap(pts, C) {
    const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const L = cum[cum.length - 1], n = Math.max(60, Math.ceil(L / 0.0004)), S = []; let j = 0;
    for (let i = 0; i <= n; i++) { const s = L * i / n; while (j < pts.length - 2 && cum[j + 1] < s) j++; const k = (s - cum[j]) / Math.max(1e-9, cum[j + 1] - cum[j]);
      S.push({ s, y: pts[j][0] + (pts[j + 1][0] - pts[j][0]) * k, z: pts[j][1] + (pts[j + 1][1] - pts[j][1]) * k }); }
    for (let i = 0; i <= n; i++) { const a = S[Math.max(0, i - 1)], b = S[Math.min(n, i + 1)], l = Math.hypot(b.y - a.y, b.z - a.z); S[i].ty = (b.y - a.y) / l; S[i].tz = (b.z - a.z) / l; }
    const mid = S[n >> 1], sg = ((-mid.tz) * (mid.y - C[0]) + mid.ty * (mid.z - C[1])) >= 0 ? 1 : -1;
    for (const p of S) { p.ny = -p.tz * sg; p.nz = p.ty * sg; }
    const Gs = Geo(), hw0 = BW / 2, ht = BT / 2, CS = 5, rows = [];
    for (const p of S) {
      let hw = BW0 / 2 + (hw0 - BW0 / 2) * K.ease.smooth(clamp(p.s / 0.014)), tb = 0;
      const sTip = L - hw0; if (p.s > sTip) { const e = (p.s - sTip) / hw0; tb = Math.min(1, e); hw = hw0 * Math.sqrt(Math.max(0, 1 - e * e)); }
      const rc = Math.min(ht * 0.92, hw), row = [];
      for (const [cx, cn, q] of [[1, 1, 0], [-1, 1, 1], [-1, -1, 2], [1, -1, 3]]) for (let i = 0; i <= CS; i++) {
        const a = (q + i / CS) * PI / 2, ca = Math.cos(a), sa = Math.sin(a), x = cx * (hw - rc) + ca * rc, nn = cn * (ht - rc) + sa * rc;
        const nX = ca * Math.sqrt(1 - tb * tb), nT = Math.abs(ca) * tb;   // round tip: the side normals lean forward
        row.push(Gs.v(x, p.y + p.ny * nn, p.z + p.nz * nn, nX, p.ny * sa + p.ty * nT, p.nz * sa + p.tz * nT, (x + hw0) / BW, p.s / BW));
      }
      rows.push(row); }
    for (let i = 0; i < rows.length - 1; i++) for (let k = 0; k < rows[i].length; k++) { const k2 = (k + 1) % rows[i].length; Gs.quad(rows[i][k], rows[i][k2], rows[i + 1][k2], rows[i + 1][k]); }
    const frame = s => { const i = clamp(Math.round(s / L * n), 0, n), p = S[i]; return p; };
    return { geo: Gs.build(), L, frame };
  }
  const bandG = new T.Group(); bandG.name = 'band'; g.add(bandG);
  const holeGeo = new T.CircleGeometry(0.00098, 24), holeRim = new T.RingGeometry(0.00098, 0.00125, 24);
  const mHoleRim = decal(new T.MeshStandardMaterial({ color: new T.Color('#0d0e10'), roughness: 0.7 }));
  const Zax = new T.Vector3(0, 0, 1);
  const onFace = (geo, mat, p, off) => { const n = new T.Vector3(0, p.ny * Math.sign(off), p.nz * Math.sign(off)), m = K.mesh(geo, mat, { cast: false });
    m.quaternion.setFromUnitVectors(Zax, n); m.position.set(0, p.y + p.ny * off, p.z + p.nz * off); bandG.add(m); return m; };
  const holeAt = p => { for (const off of [BT / 2 + 0.000012, -(BT / 2 + 0.000012)]) { onFace(holeGeo, decal(mHole.clone()), p, off); onFace(holeRim, mHoleRim, p, off * 1.0); } };
  // the pin: a short stud with a flat cap, standing on the outer face of the pin strap
  const pinAt = (p, len) => { const grp = new T.Group(), n = new T.Vector3(0, p.ny, p.nz);
    grp.add(K.mesh(new T.CylinderGeometry(0.00078, 0.00085, len, 24), mBand, { pos: [0, len / 2, 0] }));
    grp.add(K.mesh(new T.CylinderGeometry(0.00118, 0.00128, 0.00042, 40), mBand, { pos: [0, len + 0.0002, 0] }));
    grp.add(K.mesh(new T.TorusGeometry(0.00118, 0.00009, 6, 40).rotateX(PI / 2), mBand, { pos: [0, len + 0.00041, 0] }));
    grp.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), n); grp.position.set(0, p.y + p.ny * BT / 2, p.z + p.nz * BT / 2); bandG.add(grp); };
  const slotStart = sy => [[sy * (H / 2 - 0.0026), zS], [sy * (H / 2 - 0.001), zS], [sy * (H / 2 + 0.0004), zS]];
  let wristC = null;
  if (BAND === 'hang') {
    // each strap leaves its slot straight, then curls back behind the case (its curvature grows along it, like a real strap)
    const curl = (sy, L, k0, k1) => { const pts = slotStart(sy); let [y, z] = pts[pts.length - 1], psi = 0; const ds = 0.0004;
      for (let s = 0; s <= L; s += ds) { psi += (k0 + k1 * s) * ds; y += sy * Math.cos(psi) * ds; z -= Math.sin(psi) * ds; pts.push([y, z]); } return pts; };
    const A = strap(curl(1, 0.062, 30, 450), [H / 2 + 0.006, zS - 0.03]), B = strap(curl(-1, 0.078, 26, 300), [-H / 2 - 0.006, zS - 0.03]);
    bandG.add(K.mesh(A.geo, mBand)); bandG.add(K.mesh(B.geo, mBand));
    pinAt(A.frame(A.L - 0.012), 0.0013);
    for (let k = 0; k < 8; k++) holeAt(B.frame(B.L - 0.017 - k * 0.0062));
  } else if (BAND === 'worn') {
    const WR = Object.assign({ w: 0.058, h: 0.042, p: 2 }, o.wrist || {}), wa = WR.w / 2, wb = WR.h / 2, pe = WR.p, zc = zApex - wb; wristC = [0, 0, zc];
    const sp = (v, e) => Math.sign(v) * Math.pow(Math.abs(v), e);
    const ov = th => [wa * sp(Math.cos(th), 2 / pe), zc + wb * sp(Math.sin(th), 2 / pe)];
    const ovN = th => { const a = ov(th - 1e-4), b = ov(th + 1e-4), ty = b[0] - a[0], tz = b[1] - a[1], l = Math.hypot(ty, tz); return [tz / l, -ty / l]; };
    const ovO = (th, off) => { const p = ov(th), n = ovN(th); return [p[0] + n[0] * off, p[1] + n[1] * off]; };
    const D2R = PI / 180, ramp = th => BT / 2 + BT * K.ease.smooth(clamp((th - 222 * D2R) / (16 * D2R)));
    let tha = 10 * D2R; for (let a = 89; a >= 5; a -= 0.5) { if (ovO(a * D2R, BT / 2)[0] >= H / 2 + 0.0042) { tha = a * D2R; break; } }
    // from the slot, a smooth bend down onto the wrist (cubic Bezier, tangent at both ends), then round the wrist
    const lead = (sy, th, dir) => { const pts = slotStart(sy), S1 = pts[pts.length - 1], Q = ovO(th, BT / 2), a = ovO(th - 1e-3 * dir, BT / 2), b = ovO(th + 1e-3 * dir, BT / 2);
      const tl = Math.hypot(b[0] - a[0], b[1] - a[1]), tq = [(b[0] - a[0]) / tl, (b[1] - a[1]) / tl], d = Math.hypot(Q[0] - S1[0], Q[1] - S1[1]) * 0.45;
      const c1 = [S1[0] + sy * 0.0024, S1[1]], c2 = [Q[0] - tq[0] * d, Q[1] - tq[1] * d];
      for (let i = 1; i < 24; i++) { const u = i / 24, v = 1 - u; pts.push([v * v * v * S1[0] + 3 * v * v * u * c1[0] + 3 * v * u * u * c2[0] + u * u * u * Q[0], v * v * v * S1[1] + 3 * v * v * u * c1[1] + 3 * v * u * u * c2[1] + u * u * u * Q[1]]); }
      return pts; };
    const pA = lead(1, tha, -1); for (let a = tha; a >= -122 * D2R; a -= 0.5 * D2R) pA.push(ovO(a, BT / 2));
    const thb = PI - tha, pB = lead(-1, thb, 1); for (let a = thb; a <= 305 * D2R; a += 0.5 * D2R) pB.push(ovO(a, ramp(a)));
    const A = strap(pA, [0, zc]), B = strap(pB, [0, zc]);
    bandG.add(K.mesh(A.geo, mBand)); bandG.add(K.mesh(B.geo, mBand));
    // pin through B's hole at -108 deg; more holes either side; the keeper loop round both straps at -77 deg
    const fr = (th, off) => { const p = ovO(th, off), n = ovN(th), a = ovO(th - 1e-3, off), b = ovO(th + 1e-3, off), l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return { y: p[0], z: p[1], ny: n[0], nz: n[1], ty: (b[0] - a[0]) / l, tz: (b[1] - a[1]) / l }; };
    pinAt(fr(252 * D2R, BT / 2), BT + 0.0002);
    let sPin = 0, best = 1e9; const pinP = ovO(252 * D2R, 1.5 * BT); for (let s = 0; s <= B.L; s += 0.0002) { const p = B.frame(s), d = Math.hypot(p.y - pinP[0], p.z - pinP[1]); if (d < best) { best = d; sPin = s; } }
    for (let k = -4; k <= 4; k++) { const s = sPin + k * 0.0064; if (k && s > 0.04 && s < B.L - 0.012) holeAt(B.frame(s)); }
    { const p = fr(283 * D2R, BT), iw = BW + 0.0007, ih = 2 * BT + 0.0004, wt = 0.0009, dep = 0.0048;
      const G = new T.ExtrudeGeometry(shapeOf(rr(iw + 2 * wt, ih + 2 * wt, ih / 2 + wt, 8), [rr(iw, ih, ih / 2, 8)]), { depth: dep - 0.0006, bevelEnabled: true, bevelSize: 0.0003, bevelThickness: 0.0003, bevelSegments: 3, curveSegments: 10 });
      G.translate(0, 0, -(dep - 0.0006) / 2); const kp = K.mesh(G, mBand), Xv = new T.Vector3(1, 0, 0), Nv = new T.Vector3(0, p.ny, p.nz), Tv = Xv.clone().cross(Nv);
      kp.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(Xv, Nv, Tv)); kp.position.set(0, p.y, p.z); bandG.add(kp); }
    if (o.wristGuide) {                                                          // a plain forearm (preview / quick shots)
      const Gw = Geo(), M = 160, rows = [], mSkin = new T.MeshPhysicalMaterial({ color: new T.Color('#b98068'), roughness: 0.55, sheen: 0.6, sheenRoughness: 0.4, sheenColor: new T.Color('#ffd2bf') });
      for (const x of [-0.07, -0.035, 0, 0.035, 0.07]) { const row = []; for (let i = 0; i <= M; i++) { const a = i / M * 2 * PI, p = ovO(a, -0.00015), n = ovN(a); row.push(Gw.v(x, p[0], p[1], 0, n[0], n[1])); } rows.push(row); }
      for (let j = 0; j < rows.length - 1; j++) for (let i = 0; i < M; i++) Gw.quad(rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]);
      g.add(K.mesh(Gw.build(), mSkin));
      const cap = []; for (let i = 0; i < M; i++) { const p = ovO(i / M * 2 * PI, -0.00015); cap.push([p[0], p[1]]); }
      for (const sx of [-1, 1]) { const G = flat(cap); G.rotateY(sx * PI / 2); G.translate(sx * 0.07, 0, 0); g.add(K.mesh(G, mSkin)); }
    }
  }

  // ---------------------------------------------------------------- API
  const P3 = (ang, r, out) => [r * Math.cos(ang), r * Math.sin(ang), domeZ(r) - out];
  const ledPoints = () => ledAng.map(a => P3(a, RE, 0.00003)), pdPoints = () => pdAng.map(a => P3(a, RE, 0.00003));
  const screenPoint = (u, v, zmm = 0) => [(u - 0.5) * SW, (0.5 - v) * SHh, zG1 + DOME + zmm * 0.001];
  const big = BAND === 'none' ? 1 : BAND === 'hang' ? 2.3 : 2.6, lB = BAND === 'worn' ? [0, 0, -0.012] : [0, 0, 0];
  let uiKey = '';
  return {
    group: g, ledPoints, pdPoints, screenPoint,
    size: { w: W, h: H, d: zG1 + DOME - zApex, backZ: zApex, frontZ: zG1 + DOME, screenW: SW, screenH: SHh, sensorR: RWIN, ledR: RE },
    anchors: { screen: [0, 0, zG1 + DOME], back: [0, 0, zApex], crown: [xa + 0.0027, CRY, CRZ], button: [xa + 0.0002, BTY, CRZ], leds: [0, 0, zApex - 0.00003], wrist: wristC || [0, 0, zApex - 0.021] },
    view: { l: [0, 0, 0], d: 0.2, close: [0, 0, zApex], keys: o.keys || [
      { az: 0.55, el: 0.16, d: 0.2 * big, l: lB },                               // front three-quarter (crown side)
      { az: PI - 0.5, el: 0.22, d: 0.19 * big, l: lB },                           // the back, sensor lit green
      { az: PI / 2, el: 0.04, d: 0.13 * big, l: [0.003, 0, lB[2]] },              // side profile, crown on
      { az: PI + 0.3, el: 0.28, d: 0.055, l: [0, 0, zApex] },                     // the sensor, close, unlit
      { az: -0.3, el: 0.1, d: 0.16 * big, l: lB },                                // front, the alert
      { az: PI - 0.12, el: 0.12, d: 0.07, l: [0, 0, zApex] },                     // the sensor lit, strobing
    ] },
    defaults: { screen: 'bpm', on: 1, gain: 0.78, bpm: 72, pulse: 0, led: 0, flash: 1, glow: 0, pd: 0, crown: 0 },
    demo(s, t) {
      if (o.states) { Object.assign(s, o.states[Math.min(o.states.length - 1, Math.floor(t / 2))]); return; }
      const beat = ((t * 1.2) % 1); s.pulse = Math.exp(-beat * 7) * (1 - Math.exp(-beat * 60));
      s.bpm = 72 + Math.floor(t / 2); s.screen = t >= 8 && t < 10 ? 'alert' : 'bpm';
      const lit = (t >= 2 && t < 4) || t >= 10; s.led = lit ? 1 : 0; s.flash = ((t * 12) % 1) < 0.5 ? 1 : 0;
      s.glow = t >= 2 && t < 4 ? 0.7 : t >= 10 ? 0.35 : 0; s.pd = t >= 10 ? 0.6 : 0; s.crown = t * 0.4;
    },
    apply(s) {
      const scr0 = s.screen || 'off', key = scr0 + (scr0 === 'bpm' ? '|' + Math.round(s.bpm) : '');
      if (key !== uiKey) { uiKey = key; drawUI({ screen: scr0, bpm: s.bpm }); }
      const on = clamp(s.on), gl = on * s.gain; mScr.color.setScalar(gl); scr.visible = on > 0.002;
      heart.visible = scr0 === 'bpm' && on > 0.002;
      if (heart.visible) { const p = clamp(s.pulse), k = 0.8 + 0.3 * p; heart.scale.setScalar(k); mHeart.color.setScalar(gl * (0.82 + 0.25 * p));
        heart.position.x = (heartAt.x / UW - 0.5) * SW; heart.position.y = (0.5 - heartAt.y / UH) * SHh; }
      crown.rotation.x = s.crown || 0;
      const lv = clamp(s.led) * clamp(s.flash);
      for (let i = 0; i < glows.length; i++) glows[i].visible = lv > 0.003;
      mCore.opacity = lv; mHalo.opacity = 0.6 * lv; mScat.opacity = 0.35 * lv; scat.visible = lv > 0.003;
      const sp = clamp(s.glow); mSpill.opacity = 0.45 * sp; spill.visible = sp > 0.003;
      const pd = clamp(s.pd); mPDg.opacity = 0.7 * pd; for (const m of pdGl) m.visible = pd > 0.003;
    },
  };
});
