// The "twang a ruler on the edge of a desk" set, real size in metres.
// A small desk (cool white top, graphite edge band, black steel frame; top at y = 0.72), a 30 cm frosted clear plastic
// ruler (cm scale on a bevelled edge, hang hole at the 30 end) lying on it and sticking out over the +X edge, and a
// matte-black clamp block with two knurled steel thumbscrews that holds the ruler down. The block's outer face is flush
// with the desk edge and a small toe hooks over the rounded lip, so the clamp line IS the desk edge (x = 0.25).
// Local frame: desk centred on x = 0 / z = 0, feet on y = 0, ruler along X, front = +Z.
// options: legs 4 | 1   (1 = only the front-right leg, for a frame that never shows the rest)
//          preview only: pose { free, amp, phase, sag } holds the demo on one state; keys [...] replaces the six preview views
// state:
//   free   metres of ruler hanging past the desk edge, 0.08 .. 0.24 (the ruler slides along X; the clamp stays put)
//   amp    tip deflection in metres (0.03 is a good twang at full length). It is capped at 1.2 L^2 (L = free length):
//          the plastic only takes so much curvature at the clamp, so 7 cm at 24 cm but 8 mm at 8 cm. Short = stiff.
//   phase  radians; deflection of the free part = amp * shape(x) * sin(phase), shape = first bending mode of a
//          cantilever, x^2 (3 - x) / 2 with x = 0 at the clamp and 1 at the tip (zero slope at the clamp)
//   sag    0..1 the ruler's own weight: 3.7 mm of droop at 24 cm, nothing you can see at 8 cm (it goes with L^4)
// helpers on the instance (pure, for shots): inst.hz(free) real pitch in Hz (10 at 24 cm, 23 at 16 cm, 91 at 8 cm),
//   inst.ampFor(free) what the same finger push gives at that length (goes with L^3),
//   inst.pointAt(s, k, out) local point on the ruler's top, k = 0 at the clamp .. 1 at the tip; inst.tipAt(s, out)
// anchors tip, mid, hole and end0 move with the state (rewritten in apply); clamp, deskEdge, block, deskTop, corner, leg, floor are fixed
KIT.asset('ruler', (K, o) => {
  const T = THREE, g = new T.Group(), PI = Math.PI;
  const DW = 0.5, DT = 0.04, DD = 0.35, TOP = 0.72, EDGE = DW / 2, UNDER = TOP - DT;
  const RL = 0.30, RW = 0.03, RT = 0.0022, HW = RW / 2, ZR = 0.085;       // the ruler, and where it lies along Z
  const GAP = 0, CL = EDGE - GAP;                                          // the clamp line = the block's outer face, flush with the desk edge
  const BX = 0.03, BZ = 0.076, BH = 0.02;                                  // the clamp block
  const FMIN = 0.04, FMAX = 0.255, L0 = 0.24 + GAP, SAG0 = 0.0037;

  // ---------------------------------------------------------------- desk
  // the top is a cool white laminate, a clear step greyer than the paper sweep, so the slab reads even where only its top shows
  const topMat = K.mat.clay('#c5c9cb', 0.6), bandMat = K.mat.plastic(K.col.graphite, 0.55), steel = K.mat.plastic('#18191c', 0.42);
  // white laminate top with a soft rounded edge; under it the graphite edge band (a hair proud, its shoulder tucks under the white lip)
  g.add(K.mesh(K.geo.rbox(DW, 0.012, DD, 0.004, 12), topMat, { pos: [0, TOP - 0.006, 0] }));
  g.add(K.mesh(K.geo.rbox(DW + 0.0004, DT - 0.0006, DD + 0.0004, 0.0042, 12), bandMat, { pos: [0, TOP - 0.0006 - (DT - 0.0006) / 2, 0] }));
  // black steel frame: square-tube legs on levelling feet, a rail under the top between them
  const LEG = 0.025, LX = DW / 2 - 0.0425, LZ = DD / 2 - 0.0425, FOOT = 0.016;
  const legs = o.legs === 1 ? [[1, 1]] : [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  for (const [sx, sz] of legs) {
    g.add(K.mesh(K.geo.rbox(LEG, UNDER - FOOT, LEG, 0.003), steel, { pos: [sx * LX, FOOT + (UNDER - FOOT) / 2, sz * LZ] }));
    g.add(K.mesh(K.geo.cyl(0.0042, FOOT - 0.006, 20), K.mat.metal(K.col.steel, 0.3), { pos: [sx * LX, 0.006 + (FOOT - 0.006) / 2, sz * LZ] }));
    g.add(K.mesh(K.geo.cyl(0.0135, 0.007, 40, 0.012), K.mat.rubber('#0e0f11'), { pos: [sx * LX, 0.0035, sz * LZ] }));
  }
  for (const sz of [-1, 1]) g.add(K.mesh(K.geo.rbox(2 * LX - LEG + 0.004, 0.03, 0.018, 0.002), steel, { pos: [0, UNDER - 0.015, sz * LZ] }));
  for (const sx of [-1, 1]) g.add(K.mesh(K.geo.rbox(0.018, 0.03, 2 * LZ - LEG + 0.004, 0.002), steel, { pos: [sx * LX, UNDER - 0.015, 0] }));

  // ---------------------------------------------------------------- clamp block: a milled bar with a slot for the ruler, two thumbscrews
  const bev = 0.0012, sw = HW + 0.0004 + bev, bz = BZ / 2 - bev;
  const bGeo = K.geo.extrude([[-bz, bev], [-sw, bev], [-sw, RT + bev], [sw, RT + bev], [sw, bev], [bz, bev], [bz, BH - bev], [-bz, BH - bev]], BX - 2 * bev, { bevel: bev });
  bGeo.translate(0, 0, -(BX - 2 * bev) / 2); bGeo.rotateY(PI / 2);
  const blockMat = new T.MeshStandardMaterial({ color: new T.Color('#1d1e21'), roughness: 0.5, metalness: 0.35 });
  g.add(K.mesh(bGeo, blockMat, { pos: [CL - BX / 2, TOP, ZR] }));
  // a toe under the block's outer edge fills the hollow over the desk's rounded lip: the clamp hooks over the edge, and the ruler leaves it over black, not over a thin white wedge
  g.add(K.mesh(K.geo.rbox(0.0038, 0.0052, BZ, 0.0005), blockMat, { pos: [CL - 0.0019, TOP - 0.0026, ZR] }));
  // straight knurl: 40 V-grooves, flat facets so each one catches the light, the groove floors a shade darker
  const knurl = (() => { const r = 0.0068, n = 40, geo = new T.CylinderGeometry(r, r, 0.0066, n * 2, 1), p = geo.attributes.position, col = new Float32Array(p.count * 3).fill(1);
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); if (Math.hypot(x, z) < r * 0.5) continue; if (Math.round(Math.atan2(z, x) / (PI / n)) & 1) { p.setX(i, x * 0.94); p.setZ(i, z * 0.94); col[3 * i] = col[3 * i + 1] = col[3 * i + 2] = 0.5; } }
    geo.setAttribute('color', new T.BufferAttribute(col, 3)); const flat = geo.toNonIndexed(); flat.computeVertexNormals(); return flat; })();
  const screwMat = K.mat.metal(K.col.steel, 0.22), SZ = BZ / 2 - 0.0115, by = TOP + BH;
  const knurlMat = new T.MeshStandardMaterial({ color: new T.Color(K.col.steel), roughness: 0.26, metalness: 1, envMapIntensity: 1.15, vertexColors: true });
  for (const sz of [-1, 1]) {
    const x = CL - BX / 2, z = ZR + sz * SZ;
    g.add(K.mesh(K.geo.cyl(0.0079, 0.0009, 48, 0.0075), K.mat.metal('#b4b7bd', 0.3), { pos: [x, by + 0.00045, z] }));
    g.add(K.mesh(knurl, knurlMat, { pos: [x, by + 0.0009 + 0.0033, z] }));
    g.add(K.mesh(K.geo.cyl(0.0062, 0.0008, 40, 0.0052), screwMat, { pos: [x, by + 0.0009 + 0.0066 + 0.0004, z] }));
    g.add(K.mesh(K.geo.rbox(0.0102, 0.0005, 0.0011, 0.0002), K.mat.rubber('#101113'), { pos: [x, by + 0.0009 + 0.0066 + 0.0008, z], rot: [0, sz * 0.5 + 0.3, 0], cast: false }));
  }

  // ---------------------------------------------------------------- ruler: one cross-section lofted along its length (so it can bend)
  // cross-section in (z, y): 2.2 mm thick, the far (scale) edge bevelled down to 0.9 mm, small rounded corners, rounded plan corners
  const TE = 0.0009, BWD = 0.005, rc = 0.0003, PR = 0.0009, EC = 0.00022, ARC = 4, ET = 0.66;
  const beta = Math.atan2(RT - TE, BWD), zB = -HW + BWD, prof = [];        // prof: [z, y, z-inset sign, y-inset sign, tint, break after]
  const arc = (cz, cy, a0, a1, zs, ys, t0, t1) => { for (let i = 0; i <= ARC; i++) { const k = i / ARC, a = a0 + (a1 - a0) * k; prof.push([cz + rc * Math.cos(a), cy + rc * Math.sin(a), zs, ys, t0 + (t1 - t0) * k, 0]); } };
  arc(-HW + rc, TE - rc, PI, PI / 2 + beta, 1, -1, ET, 1);                  // far top corner, then the bevel runs up to the crease
  prof.push([zB, RT, 1, -1, 1, 1], [zB, RT, 1, -1, 1, 0]);                  // the crease, twice: a sharp line between bevel and flat top
  arc(HW - rc, RT - rc, PI / 2, 0, -1, -1, 1, ET);                          // near top corner
  arc(HW - rc, rc, 0, -PI / 2, -1, 1, ET, 1);                               // near bottom corner
  arc(-HW + rc, rc, -PI / 2, -PI, 1, 1, 1, ET);                             // far bottom corner
  const P = prof.length, NXS = 200, stU = [], stZ = [], stY = [];
  for (let k = 0; k < 4; k++) { const a = k / 4 * PI / 2; stU.push(PR * (1 - Math.cos(a))); stZ.push(PR * (1 - Math.sin(a))); stY.push(EC * (1 - Math.sin(a))); }
  for (let i = 0; i <= NXS; i++) { stU.push(PR + (RL - 2 * PR) * i / NXS); stZ.push(0); stY.push(0); }
  for (let k = 3; k >= 0; k--) { stU.push(RL - stU[k]); stZ.push(stZ[k]); stY.push(stY[k]); }
  const NS = stU.length, RIB0 = 4, RIB1 = NS - 5;
  // a deformable mesh: base positions / normals kept aside, each vertex knows its station along the ruler
  function soft(pos, vs, idx, { uv, col, nor } = {}) {
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(new Float32Array(pos), 3)); geo.setIndex(idx);
    if (nor) geo.setAttribute('normal', new T.BufferAttribute(new Float32Array(nor), 3)); else geo.computeVertexNormals();
    if (uv) geo.setAttribute('uv', new T.BufferAttribute(new Float32Array(uv), 2)); if (col) geo.setAttribute('color', new T.BufferAttribute(new Float32Array(col), 3));
    geo.attributes.position.setUsage(T.DynamicDrawUsage); geo.attributes.normal.setUsage(T.DynamicDrawUsage);
    return { geo, n: vs.length, vs: Uint16Array.from(vs), bp: Float32Array.from(pos), bn: Float32Array.from(geo.attributes.normal.array) };
  }
  // triangle with the winding that faces (ox, oy, oz)
  const tri = (pos, idx, a, b, c, ox, oy, oz) => {
    const ax = pos[3 * a], ay = pos[3 * a + 1], az = pos[3 * a + 2], ux = pos[3 * b] - ax, uy = pos[3 * b + 1] - ay, uz = pos[3 * b + 2] - az, vx = pos[3 * c] - ax, vy = pos[3 * c + 1] - ay, vz = pos[3 * c + 2] - az;
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; if (nx * nx + ny * ny + nz * nz < 1e-24) return;
    if (nx * ox + ny * oy + nz * oz < 0) idx.push(a, c, b); else idx.push(a, b, c);
  };
  // the hang hole near the 30 end: cut out of the body with an alpha map over the last 16 mm, plus a real inner wall
  const HX = RL - 0.0072, HR = 0.0024, HUL = 0.016, HU0 = RL - HUL;
  const holeTex = (() => { const W = 512, H = 960, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.fillStyle = '#000'; c.beginPath(); c.ellipse((HX - HU0) / HUL * W, H / 2, HR / HUL * W, HR / RW * H, 0, 0, 2 * PI); c.fill();
    const t = new T.CanvasTexture(cv); t.colorSpace = T.NoColorSpace; t.wrapS = t.wrapT = T.ClampToEdgeWrapping; t.anisotropy = 8; return t; })();
  const body = (() => {
    const pos = [], vs = [], col = [], idx = [], uv = [];
    const ring = (i) => { for (const p of prof) { const z = p[0] + p[2] * stZ[i]; pos.push(stU[i], p[1] + p[3] * stY[i], z); vs.push(i); col.push(p[4], p[4], p[4]); uv.push((stU[i] - HU0) / HUL, (z + HW) / RW); } };
    for (let i = 0; i < NS; i++) ring(i);
    for (let i = 0; i < NS - 1; i++) for (let j = 0; j < P; j++) {
      if (prof[j][5]) continue; const j2 = (j + 1) % P, a = i * P + j, b = (i + 1) * P + j, c = (i + 1) * P + j2, d = i * P + j2;
      const oy = (prof[j][1] + prof[j2][1]) / 2 - RT / 2, oz = (prof[j][0] + prof[j2][0]) / 2;
      tri(pos, idx, a, b, c, 0, oy, oz); tri(pos, idx, a, c, d, 0, oy, oz);
    }
    for (const [i, ox] of [[0, -1], [NS - 1, 1]]) {                           // end caps with their own vertices (a crisp end face)
      const c0 = pos.length / 3; ring(i); pos.push(stU[i], RT / 2, 0); vs.push(i); col.push(ET, ET, ET); uv.push((stU[i] - HU0) / HUL, 0.5);
      for (let j = 0; j < P; j++) tri(pos, idx, c0 + P, c0 + j, c0 + (j + 1) % P, ox, 0, 0);
    }
    return soft(pos, vs, idx, { col, uv });
  })();
  // frosted clear plastic: a neutral cool white you can see the desk edge through, the cut edges a shade darker
  const rulerMat = new T.MeshPhysicalMaterial({ color: new T.Color('#b2bac0'), roughness: 0.4, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.3, transparent: true, opacity: 0.78, vertexColors: true, alphaMap: holeTex, alphaTest: 0.02, shadowSide: T.BackSide });   // back faces cast: the thin lit faces never shadow themselves
  const rulerG = new T.Group(); rulerG.position.set(EDGE + 0.24 - RL, TOP, ZR); g.add(rulerG);
  const rulerMesh = K.mesh(body.geo, rulerMat); rulerMesh.frustumCulled = false; rulerMesh.renderOrder = 2; rulerG.add(rulerMesh);
  const wall = (() => {                                                      // the hole's inner wall: follows the bend between stations
    const M = 40, du = (RL - 2 * PR) / NXS, pos = [], vs = [], vf = [], nor = [], idx = [];
    for (let j = 0; j <= M; j++) { const a = j / M * 2 * PI, x = HX + HR * Math.cos(a), fi = (x - PR) / du, i0 = Math.floor(fi);
      for (const y of [0, RT]) { pos.push(x, y, HR * Math.sin(a)); nor.push(-Math.cos(a), 0, -Math.sin(a)); vs.push(4 + i0); vf.push(fi - i0); } }
    for (let j = 0; j < M; j++) { const a = j * 2, b = a + 2, am = (j + 0.5) / M * 2 * PI; tri(pos, idx, a, b, b + 1, -Math.cos(am), 0, -Math.sin(am)); tri(pos, idx, a, b + 1, a + 1, -Math.cos(am), 0, -Math.sin(am)); }
    const D = soft(pos, vs, idx, { nor }); D.vf = Float32Array.from(vf); return D;
  })();
  const wallMesh = K.mesh(wall.geo, new T.MeshStandardMaterial({ color: new T.Color('#9aa2a8'), roughness: 0.5, metalness: 0 }), { cast: false }); wallMesh.frustumCulled = false; rulerG.add(wallMesh);
  // the print: millimetre ticks on the bevelled edge, a numeral every centimetre (0 at the end on the desk, 30 at the tip)
  const PX = 26000, print = K.canvasPlane(RL, RW, PX, (c, W, H) => {
    const mm = PX / 1000; c.clearRect(0, 0, W, H); c.fillStyle = '#16171a';
    for (let i = 1; i < 300; i++) { const cm = i % 10 === 0, len = (cm ? 5.6 : i % 5 === 0 ? 4.2 : 2.8) * mm, w = cm ? 6 : 4; c.fillRect(Math.round(i * mm - w / 2), 0, w, Math.round(len)); }
    c.textBaseline = 'alphabetic'; c.textAlign = 'center'; c.font = `400 ${Math.round(3.3 * mm)}px ${K.FONT}`;
    for (let n = 1; n < 30; n++) c.fillText(String(n), n * 10 * mm, 9.0 * mm);
    c.textAlign = 'left'; c.font = `400 ${Math.round(2.3 * mm)}px ${K.FONT}`; c.fillText('cm', 2.4 * mm, 9.0 * mm);
  }, { lit: true });
  const ribbon = (() => {                                                    // the print follows the top: flat part + bevel, a hair above the plastic
    const EPS = 0.00002, cb = Math.cos(beta), sb = Math.sin(beta), fz = -HW + rc - rc * sb + 0.00012 * cb, fy = TE - rc + rc * cb + 0.00012 * sb;
    const pts = [[HW - rc - 0.0001, RT + EPS, 0, 1, 0], [zB, RT + EPS, 0, 1, 0], [zB, RT + EPS * cb, 0, cb, -sb], [fz - EPS * sb, fy + EPS * cb, 0, cb, -sb]];
    const pos = [], vs = [], nor = [], uv = [], idx = [];
    for (let i = RIB0; i <= RIB1; i++) for (const p of pts) { pos.push(stU[i], p[1], p[0]); vs.push(i); nor.push(p[2], p[3], p[4]); uv.push(stU[i] / RL, 1 - (p[0] + HW) / RW); }
    for (let i = 0; i < RIB1 - RIB0; i++) for (const j of [0, 2]) { const a = i * 4 + j, b = (i + 1) * 4 + j; tri(pos, idx, a, b, b + 1, 0, 1, 0); tri(pos, idx, a, b + 1, a + 1, 0, 1, 0); }
    return soft(pos, vs, idx, { uv, nor });
  })();
  print.geometry.dispose(); print.geometry = ribbon.geo; print.frustumCulled = false; print.renderOrder = 3; print.castShadow = false; print.receiveShadow = true;
  Object.assign(print.material, { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, roughness: 0.7 });
  print.userData.tex.anisotropy = 16; rulerG.add(print);

  // ---------------------------------------------------------------- bending
  const sW = new Float32Array(NS), sSn = new Float32Array(NS), sCs = new Float32Array(NS), sDx = new Float32Array(NS);
  const read = (s) => {                                                      // state -> free length, dynamic tip deflection q, static sag q2
    const free = K.clamp(s.free, FMIN, FMAX), L = free + GAP, cap = 1.2 * L * L;
    rd.free = free; rd.L = L; rd.q = K.clamp(s.amp || 0, -cap, cap) * Math.sin(s.phase || 0); rd.q2 = -K.clamp(s.sag ?? 1) * SAG0 * Math.pow(L / L0, 4);
  }, rd = { free: 0.24, L: L0, q: 0, q2: 0 };
  const defl = (x, q, q2) => q * x * x * (3 - x) / 2 + q2 * x * x * (6 - 4 * x + x * x) / 3;          // x = 0 at the clamp .. 1 at the tip
  const slope = (x, q, q2, L) => (q * 1.5 * x * (2 - x) + q2 * 4 * x * (3 - 3 * x + x * x) / 3) / L;
  function write(D) {
    const pos = D.geo.attributes.position.array, nor = D.geo.attributes.normal.array, bp = D.bp, bn = D.bn, vs = D.vs, vf = D.vf, mid = RT / 2;
    for (let v = 0, k = 0; v < D.n; v++, k += 3) {
      const i = vs[v], h = bp[k + 1] - mid; let s = sSn[i], c = sCs[i], w = sW[i], dx = sDx[i];
      if (vf) { const f = vf[v], j = i + 1; s += (sSn[j] - s) * f; c += (sCs[j] - c) * f; w += (sW[j] - w) * f; dx += (sDx[j] - dx) * f; }   // a vertex between two stations
      pos[k] = bp[k] - dx - h * s; pos[k + 1] = mid + w + h * c; pos[k + 2] = bp[k + 2];
      nor[k] = bn[k] * c - bn[k + 1] * s; nor[k + 1] = bn[k] * s + bn[k + 1] * c; nor[k + 2] = bn[k + 2];
    }
    D.geo.attributes.position.needsUpdate = true; D.geo.attributes.normal.needsUpdate = true;
  }
  let kL = NaN, kq = NaN, kq2 = NaN;
  function pose() {
    const L = rd.L, q = rd.q, q2 = rd.q2; if (L === kL && q === kq && q2 === kq2) return; kL = L; kq = q; kq2 = q2;
    const uc = RL - L; let dx = 0, pa = 0, pd = 0;
    for (let i = 0; i < NS; i++) {
      const a = stU[i] - uc; if (a <= 0) { sW[i] = 0; sSn[i] = 0; sCs[i] = 1; sDx[i] = 0; continue; }
      const x = a / L, d = slope(x, q, q2, L), inv = 1 / Math.sqrt(1 + d * d);
      dx += (a - pa) * (pd * pd + d * d) * 0.25; pa = a; pd = d;             // the ruler keeps its length, so the tip pulls in a little as it bends
      sW[i] = defl(x, q, q2); sSn[i] = d * inv; sCs[i] = inv; sDx[i] = dx;
    }
    write(body); write(ribbon); write(wall);
  }
  // a point on the ruler's top face, k = 0 at the clamp .. 1 at the tip, in the model's local frame
  function pointAt(s, k, out) {
    read(s); const L = rd.L, q = rd.q, q2 = rd.q2, N = 24; let dx = 0, pd = 0; k = K.clamp(k);
    for (let i = 1; i <= N; i++) { const d = slope(k * i / N, q, q2, L); dx += (k * L / N) * (pd * pd + d * d) * 0.25; pd = d; }
    const inv = 1 / Math.sqrt(1 + pd * pd); out = out || [0, 0, 0];
    out[0] = CL + k * L - dx - (RT / 2) * pd * inv; out[1] = TOP + RT / 2 + defl(k, q, q2) + (RT / 2) * inv; out[2] = ZR; return out;
  }
  const anchors = { tip: [EDGE + 0.24, TOP + RT, ZR], mid: [EDGE + 0.12, TOP + RT, ZR], clamp: [CL, TOP + RT, ZR], deskEdge: [EDGE, TOP, ZR], block: [CL - BX / 2, TOP + BH, ZR],
    end0: [EDGE + 0.24 - RL, TOP + RT, ZR], hole: [EDGE + 0.24 - (RL - HX), TOP + RT, ZR], deskTop: [0, TOP, 0], corner: [EDGE, TOP, DD / 2], leg: [LX, UNDER / 2, LZ], floor: [EDGE + 0.12, 0, ZR] };
  const defaults = { free: 0.24, amp: 0, phase: 0, sag: 1 };
  pointAt(defaults, 1, anchors.tip); pointAt(defaults, 0.5, anchors.mid); pointAt(defaults, 1 - (RL - HX) / L0, anchors.hole);    // rest values (the tip hangs 3.7 mm low)
  const hzSlow = (L) => 0.0527 / (L * L);                                    // the demo's slow-motion pitch: 0.9 Hz at full length
  return {
    group: g,
    size: { DW, DT, DD, TOP, EDGE, RL, RW, RT, ZR, CL, BX, BZ, BH, freeMin: 0.08, freeMax: 0.24 },
    anchors, view: { l: [0.09, 0.42, 0], d: 3.3, close: [0.36, 0.7, ZR], keys: o.keys },
    defaults,
    hz: (free) => 0.585 / ((free + GAP) * (free + GAP)),                     // real first-mode pitch of this ruler (acrylic, 2.2 mm)
    ampFor: (free, a24 = 0.03) => a24 * Math.pow((free + GAP) / L0, 3),      // same push, shorter ruler: far less bend
    pointAt, tipAt: (s, out) => pointAt(s, 1, out),
    apply(s) {
      read(s); rulerG.position.x = EDGE + rd.free - RL; pose();
      pointAt(s, 1, anchors.tip); pointAt(s, 0.5, anchors.mid); pointAt(s, 1 - (RL - HX) / rd.L, anchors.hole); anchors.end0[0] = EDGE + rd.free - RL;   // moving anchors follow the pose
    },
    demo(s, t) {
      if (o.pose) { Object.assign(s, o.pose); return; }                                                 // preview one fixed state
      const F1 = 0.24, F2 = 0.099, e = K.ease, hold = -PI / 2;
      s.free = F1 + (F2 - F1) * e.cubicInOut(K.clamp((t - 5.6) / 1.6));
      if (t < 1) { s.amp = 0.045 * e.cubicInOut(K.clamp(t / 0.35)); s.phase = hold; }                    // pushed down ...
      else if (t < 5.6) { s.amp = 0.045 * Math.exp(-(t - 1) / 6) * (1 - K.clamp((t - 5.0) / 0.6)); s.phase = hold + 2 * PI * hzSlow(F1 + GAP) * (t - 1); }   // ... let go: long and slow
      else if (t < 7.4) s.amp = 0;                                                                       // slide it in
      else if (t < 7.9) { s.amp = 0.010 * e.cubicInOut(K.clamp((t - 7.4) / 0.3)); s.phase = hold; }
      else { s.amp = 0.010 * Math.exp(-(t - 7.9) / 5); s.phase = hold + 2 * PI * hzSlow(F2 + GAP) * (t - 7.9); }   // short: small and fast
    },
  };
});
