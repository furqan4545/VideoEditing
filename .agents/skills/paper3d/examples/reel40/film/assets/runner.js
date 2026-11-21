// A whole person RUNNING: an easy run at 165 steps a minute and 3.0 m/s (2.2 m per gait cycle). Real size 1.78 m.
// Dark athletic clothes for reel 40's dark cinematic look: a fitted charcoal tee, black running shorts, running shoes
// with a dark knit upper, a light midsole and a reflective heel strip, low light-grey socks. Medium-brown skin with a
// soft sheen, short dark hair, a calm head with no face. One skinned body on one 17-bone skeleton (GPU skinning), so no
// gap can open at a shoulder, elbow, hip or knee; hands, head, socks and shoes ride rigidly on their bones.
// Local frame: feet on y = 0 when standing, faces +Z, metres.
//
// LEFT / RIGHT: his LEFT side is +X. (A person facing +Z in a right-handed frame has his left hand on +X. legs.js's
//   "R is the +X side" is a mirror image: a watch worn on its "left" would read as being on his RIGHT wrist.)
//   Option leftX: -1 puts his "left" on -X if a shot ever needs the old convention (everything named L follows it).
//
// options: { leftX: 1 | -1, watchY: 'across' | 'fingers', watchStub: false, skin: '#hex', tee: '#hex',
//            look: 'all' | 'gait' | 'wrist' | 'front' | 'detail' | 'joints' (preview cameras), keys / states (preview only) }
//   See runner.md for the full gait numbers. About 128k triangles.
// state:
//   run    gait phase in cycles (1 cycle = 2 steps). His LEFT foot strikes at run = 0, 1, 2 ..., his right at 0.5, 1.5 ...
//          The CALLER moves him: group.position.z = z0 + 2.2 * run (1.1 m a step). A planted foot then stays exactly
//          where it landed. 165 steps a minute = run = t * 1.375.
//   still  0..1   1 = standing relaxed (feet apart, arms hanging, no lean). Blend it in while run stops changing.
//   arms   0..1   how much the arms swing (0 = held bent at 90 degrees, still)
// API (local frame of the runner, for the pose of state s; these call apply(s), so call them from a shot's update,
//      which runs before the frame's own apply):
//   wristL(s) -> { pos: [x,y,z], quat: [x,y,z,w] }   where the 46 mm watch sits on the back of his left wrist:
//          watch +Z = away from the skin, watch +X (the crown side) = toward his fingers, watch +Y (12 o'clock) = across
//          the wrist, so a band attached at +-Y wraps round the wrist (how a real watch is worn).
//          Option watchY: 'fingers' gives the other frame (+Y toward the fingers) instead. wristR(s) = the same, right arm.
//   point(s, name) -> [x,y,z]   name: heart | head | wristL | wristR | handL | handR | elbowL | elbowR | shoulderL |
//          shoulderR | kneeL | kneeR | ankleL | ankleR | hip
//   _soles(s) (debug) -> [yL, zL, yR, zR]   the lowest point of each sole
// Anchors (standing pose): chest (= heart: inside the chest, a little to his left), head, wristL, wristR, handL, handR,
//   footL, footR, hip, top.
KIT.asset('runner', (K, o) => {
  o = o || {};
  const T = THREE, PI = Math.PI, TAU = PI * 2, clamp = K.clamp, lerp = K.lerp;
  const sst = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  const LX = o.leftX === -1 ? -1 : 1;
  const g = new T.Group();
  // smooth profile through [x, y] keys (x ascending)
  const prof = ks => x => {
    const n = ks.length; if (x <= ks[0][0]) return ks[0][1]; if (x >= ks[n - 1][0]) return ks[n - 1][1];
    let i = 0; while (ks[i + 1][0] < x) i++;
    const x0 = ks[i][0], y0 = ks[i][1], x1 = ks[i + 1][0], y1 = ks[i + 1][1], h = x1 - x0, t = (x - x0) / h, sl = (y1 - y0) / h;
    const m0 = i > 0 ? (y1 - ks[i - 1][1]) / (x1 - ks[i - 1][0]) : sl, m1 = i < n - 2 ? (ks[i + 2][1] - y0) / (ks[i + 2][0] - x0) : sl, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m0 + (3 * t2 - 2 * t3) * y1 + (t3 - t2) * h * m1;
  };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const along = (p, n, d) => [p[0] + n[0] * d, p[1] + n[1] * d, p[2] + n[2] * d], dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  // ------------------------------------------------------------------ skeleton (rest pose: standing straight, arms hanging, palms to the thighs)
  const HIPY = 0.895, HIPX = 0.088, L1 = 0.405, L2 = 0.40, LL = L1 + L2, ANKY = 0.09;
  const SHX = 0.178, SHY = 1.445, SHZ = -0.012, UA = 0.305, FA = 0.26;
  const BONES = [];
  const bone = (parent, x, y, z, order) => { const b = new T.Bone(); b.position.set(x, y, z); if (order) b.rotation.order = order; (parent || g).add(b); BONES.push(b); return b; };
  const pelvis = bone(null, 0, HIPY, 0, 'YZX');                  // 0  yaw, roll, pitch
  const spine = bone(pelvis, 0, 0.10, -0.01, 'YXZ');             // 1  y 0.995
  const chest = bone(spine, 0, 0.27, 0, 'YXZ');                  // 2  y 1.265
  const neck = bone(chest, 0, 0.24, -0.005, 'YXZ');              // 3  y 1.505
  const head = bone(neck, 0, 0.09, 0.01, 'YXZ');                 // 4  y 1.595
  const ARM = {}, LEG = {};
  for (const sx of [1, -1]) {
    const sh = bone(chest, sx * SHX, SHY - 1.265, SHZ + 0.01, 'ZXY'), el = bone(sh, 0, -UA, 0, 'XYZ'), hd = bone(el, 0, -FA, 0, 'XYZ');
    ARM[sx] = { sx, sh, el, hd, i: BONES.length - 3 };
  }
  for (const sx of [1, -1]) {
    const th = bone(pelvis, sx * HIPX, 0, 0), sn = bone(th, 0, -L1, 0), ft = bone(sn, 0, -L2, 0);
    LEG[sx] = { sx, th, sn, ft, i: BONES.length - 3 };
  }
  const BI = new Map(BONES.map((b, i) => [b, i]));
  g.updateMatrixWorld(true);
  const restPos = b => { const v = new T.Vector3(); b.getWorldPosition(v); return [v.x, v.y, v.z]; };
  const skel = new T.Skeleton(BONES);
  const IDENT = new T.Matrix4();

  // ------------------------------------------------------------------ mesh tools (as in legs.js, plus skin weights)
  const mkBuf = () => ({ p: [], n: [], u: [], c: [], si: [], sw: [], ix: [] });
  // (nu+1) x (nv+1) points from f(i, j) -> [x, y, z, u, v, (r, g, b), (nx, ny, nz)]. Normals come from the grid itself.
  // Faces look outward when i runs with phi (x = cos, z = sin) and j runs DOWN the outside; flip for the other way round.
  // wf(p) -> [[bone, weight], ...] (up to 4) gives each vertex its skin weights.
  function grid(b, nu, nv, f, { wrap = false, flip = false, wf = null } = {}) {
    const base = b.p.length / 3, W = nu + 1, P = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) P.push(f(i, j));
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const q = P[j * W + i], a = P[j * W + (i > 0 ? i - 1 : wrap ? nu - 1 : 0)], c = P[j * W + (i < nu ? i + 1 : wrap ? 1 : nu)], d = P[Math.max(j - 1, 0) * W + i], e = P[Math.min(j + 1, nv) * W + i];
      let n = cross(sub(c, a), sub(e, d)); const l = Math.hypot(n[0], n[1], n[2]);
      if (q.length > 8) n = [q[8], q[9], q[10]]; else if (l < 1e-14) n = [0, 1, 0]; else { const k = (flip ? -1 : 1) / l; n = [n[0] * k, n[1] * k, n[2] * k]; }
      b.p.push(q[0], q[1], q[2]); b.n.push(n[0], n[1], n[2]); b.u.push(q[3] || 0, q[4] || 0); b.c.push(q[5] ?? 1, q[6] ?? 1, q[7] ?? 1);
      if (wf) { const w = wf(q); for (let k = 0; k < 4; k++) { b.si.push(w[k] ? w[k][0] : 0); b.sw.push(w[k] ? w[k][1] : 0); } }
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = base + j * W + i, bb = a + 1, c = a + W, d = c + 1; if (flip) b.ix.push(a, c, bb, bb, c, d); else b.ix.push(a, bb, c, bb, d, c); }
  }
  function bufGeo(b, sx = 1) {
    const geo = new T.BufferGeometry(), P = new Float32Array(b.p), N = new Float32Array(b.n), ix = b.ix.slice();
    if (sx < 0) { for (let i = 0; i < P.length; i += 3) { P[i] = -P[i]; N[i] = -N[i]; } for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } }
    geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(N, 3));
    geo.setAttribute('uv', new T.BufferAttribute(new Float32Array(b.u), 2)); geo.setAttribute('color', new T.BufferAttribute(new Float32Array(b.c), 3));
    if (b.si.length) { geo.setAttribute('skinIndex', new T.Uint16BufferAttribute(b.si, 4)); geo.setAttribute('skinWeight', new T.Float32BufferAttribute(b.sw, 4)); }
    geo.setIndex(ix); return geo;
  }
  // a skinned body part (positions in the rest pose, in the runner's frame)
  function skinned(b, mat) {
    const m = new T.SkinnedMesh(bufGeo(b), mat); m.castShadow = m.receiveShadow = true; m.frustumCulled = false; g.add(m); m.bind(skel, IDENT); return m;
  }
  // a rigid mesh on a bone, given in rest-pose runner coordinates
  function onBone(bn, mesh) { const r = restPos(bn); mesh.position.x -= r[0]; mesh.position.y -= r[1]; mesh.position.z -= r[2]; bn.add(mesh); return mesh; }
  // a raised panel on any surface: pf(a, b) -> [point, normal]; the border sinks under the surface so the edge reads as a real edge
  function slab(b, pf, na, nb, thick, c, ea, eb, { flip = false, open = '' } = {}) {
    const A = [0], B = [0]; for (let i = 0; i <= na; i++) A.push(ea + (1 - 2 * ea) * i / na); A.push(1); for (let j = 0; j <= nb; j++) B.push(eb + (1 - 2 * eb) * j / nb); B.push(1);
    grid(b, A.length - 1, B.length - 1, (i, j) => {
      const q = pf(A[i], B[j]), edge = (i === 0 && !open.includes('l')) || (i === A.length - 1 && !open.includes('r')) || (j === 0 && !open.includes('t')) || (j === B.length - 1 && !open.includes('b'));
      const p = along(q[0], q[1], edge ? -0.0007 : thick); return [p[0], p[1], p[2], A[i] * 0.2, B[j] * 0.2, c[0], c[1], c[2]];
    }, { flip });
  }
  // a row of stitches: short threads, half sunk into the surface
  function stitches(b, path, { len = 0.0029, gap = 0.0015, r = 0.00048 } = {}) {
    const L = [0]; for (let i = 1; i < path.length; i++) L.push(L[i - 1] + dist(path[i].p, path[i - 1].p));
    const tot = L[L.length - 1]; let k = 0;
    const at = s => { while (k < path.length - 2 && L[k + 1] < s) k++; const u = clamp((s - L[k]) / (L[k + 1] - L[k] || 1)); return { p: mix(path[k].p, path[k + 1].p, u), n: nrm(mix(path[k].n, path[k + 1].n, u)) }; };
    for (let s = gap * 0.5; s + len <= tot; s += len + gap) {
      const A = at(s), B = at(s + len), d = nrm(sub(B.p, A.p)), sd = nrm(cross(d, A.n)), base = b.p.length / 3;
      for (const E of [A, B]) for (let q = 0; q < 4; q++) {
        const nn = q === 0 ? E.n : q === 1 ? sd : q === 2 ? [-E.n[0], -E.n[1], -E.n[2]] : [-sd[0], -sd[1], -sd[2]], p = along(E.p, nn, q === 0 ? r * 1.15 : q === 2 ? r * 0.3 : r);
        b.p.push(p[0], p[1], p[2]); b.n.push(nn[0], nn[1], nn[2]); b.u.push(0, 0); b.c.push(1, 1, 1);
      }
      for (let q = 0; q < 4; q++) { const a = base + q, a1 = base + (q + 1) % 4; b.ix.push(a, a1, a + 4, a1, a1 + 4, a + 4); }
    }
  }
  // superellipse ring point: half width a, front f, back bk, centre z zc, exponent n
  const se = (phi, a, f, bk, zc, n) => { const c = Math.cos(phi), s = Math.sin(phi), e = 2 / n; return [a * Math.sign(c) * Math.pow(Math.abs(c), e), zc + (s >= 0 ? f : bk) * Math.sign(s) * Math.pow(Math.abs(s), e)]; };
  // normalised skin weights from a list of [bone, w]
  const W2 = (b0, b1, k) => k <= 0.0001 ? [[b0, 1]] : k >= 0.9999 ? [[b1, 1]] : [[b0, 1 - k], [b1, k]];

  // ------------------------------------------------------------------ materials
  const fabricBump = (seed, rep) => K.canvasTex(K.noiseCanvas(128, seed, 'weave'), { srgb: false, repeat: rep });
  const skin = new T.MeshPhysicalMaterial({ color: new T.Color(o.skin || '#85573d'), roughness: 0.5, metalness: 0, clearcoat: 0.22, clearcoatRoughness: 0.45 });
  skin.bumpMap = K.canvasTex(K.noiseCanvas(256, 77, 'grain'), { srgb: false, repeat: 1 }); skin.bumpScale = 0.05;
  const teeMat = new T.MeshPhysicalMaterial({ color: new T.Color(o.tee || '#323843'), roughness: 0.82, metalness: 0, sheen: 1, sheenRoughness: 0.42, sheenColor: new T.Color('#7d8aa3') });
  teeMat.bumpMap = fabricBump(41, 1); teeMat.bumpScale = 0.35;
  const shortsMat = new T.MeshPhysicalMaterial({ color: new T.Color('#121317'), roughness: 0.62, metalness: 0, sheen: 1, sheenRoughness: 0.35, sheenColor: new T.Color('#5d6575') });
  shortsMat.bumpMap = fabricBump(53, 1); shortsMat.bumpScale = 0.25;
  const hairMat = new T.MeshPhysicalMaterial({ color: new T.Color('#16120f'), roughness: 0.72, metalness: 0, sheen: 0.6, sheenRoughness: 0.5, sheenColor: new T.Color('#4a4038') });
  hairMat.bumpMap = K.canvasTex(K.noiseCanvas(256, 91, 'grain'), { srgb: false, repeat: 1 }); hairMat.bumpScale = 0.6;
  const refl = new T.MeshStandardMaterial({ color: new T.Color('#d7dbe2'), roughness: 0.22, metalness: 0.85, envMapIntensity: 1.6 });
  const nailMat = new T.MeshPhysicalMaterial({ color: new T.Color('#b98a72'), roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2 });

  // ------------------------------------------------------------------ the tee: torso (pelvis -> spine -> chest)
  const TK = [   // y, half width, front, back, centre z, superellipse exponent
    [0.884, 0.179, 0.113, 0.132, 0.000, 2.4], [0.94, 0.169, 0.109, 0.123, 0.000, 2.4], [1.00, 0.160, 0.106, 0.113, 0.000, 2.4], [1.08, 0.154, 0.104, 0.107, 0.000, 2.4],
    [1.16, 0.156, 0.110, 0.107, 0.000, 2.45], [1.24, 0.164, 0.121, 0.110, 0.000, 2.5], [1.30, 0.171, 0.126, 0.112, 0.000, 2.55], [1.35, 0.178, 0.123, 0.113, -0.004, 2.6],
    [1.40, 0.190, 0.112, 0.109, -0.008, 2.65], [1.44, 0.205, 0.095, 0.099, -0.012, 2.7], [1.466, 0.196, 0.081, 0.088, -0.014, 2.6], [1.49, 0.152, 0.069, 0.078, -0.014, 2.3],
    [1.51, 0.098, 0.059, 0.068, -0.013, 2.1], [1.526, 0.066, 0.051, 0.062, -0.011, 2.0]];
  const col = k => prof(TK.map(r => [r[0], r[k]]));
  const tHW = col(1), tF = col(2), tB = col(3), tZ = col(4), tN = col(5);
  const PEL = BI.get(pelvis), SPI = BI.get(spine), CHE = BI.get(chest), NEC = BI.get(neck), HEA = BI.get(head);
  const torsoW = q => { const y = q[1], wp = 1 - sst((y - 0.97) / 0.12), wc = sst((y - 1.13) / 0.17), ws = Math.max(0, 1 - wp - wc), out = [];
    if (wp > 1e-4) out.push([PEL, wp]); if (ws > 1e-4) out.push([SPI, ws]); if (wc > 1e-4) out.push([CHE, wc]); return out; };
  function teeP(phi, y, inset = 0) {
    let [x, z] = se(phi, tHW(y) - inset, tF(y) - inset, tB(y) - inset, tZ(y), tN(y));
    const ax = Math.abs(x), s = Math.sin(phi);
    // chest, shoulder blades, the spine groove: soft forms under the fabric
    if (s > 0) z += 0.009 * Math.exp(-(((y - 1.312) / 0.055) ** 2)) * Math.exp(-(((ax - 0.07) / 0.055) ** 2)) - 0.003 * Math.exp(-(((y - 1.30) / 0.09) ** 2)) * Math.exp(-((ax / 0.02) ** 2));
    else z -= 0.006 * Math.exp(-(((y - 1.37) / 0.07) ** 2)) * Math.exp(-(((ax - 0.085) / 0.05) ** 2)) - 0.004 * Math.exp(-(((y - 1.2) / 0.14) ** 2)) * Math.exp(-((ax / 0.018) ** 2));
    // a few soft drag folds above the hem
    const fy = sst((1.02 - y) / 0.1);
    if (fy > 0) { const d = 0.0018 * fy * Math.sin(phi * 7 + 1.3 + 9 * y) * (0.6 + 0.4 * Math.sin(phi * 3)); x += Math.sign(x) * d * Math.abs(Math.cos(phi)); z += Math.sign(s) * d * Math.abs(s); }
    return [x, y, z];
  }
  {
    const b = mkBuf(), N = 80, ys = [];
    for (let y = 1.526; y > 0.886; y -= y > 1.40 ? 0.0075 : 0.011) ys.push(y); ys.push(0.884);
    const rows = ys.map(y => [y, 0]); rows.push([0.881, 0.003], [0.886, 0.006], [0.900, 0.008]);   // the hem turns in
    grid(b, N, rows.length - 1, (i, j) => { const phi = TAU * i / N - PI / 2, p = teeP(phi, rows[j][0], rows[j][1]); return [p[0], p[1], p[2], i / N * 9, p[1] * 9]; }, { wrap: true, wf: torsoW });
    skinned(b, teeMat);
    // a ribbed crew neck: a soft roll round the neckline, on the chest bone
    const cb = mkBuf(), CR = [[-0.006, -0.0005], [-0.003, 0.0035], [0.004, 0.0042], [0.011, 0.0034], [0.0135, 0.0008], [0.0128, -0.0028], [0.004, -0.0032]];   // [dy, out]
    grid(cb, 72, CR.length - 1, (i, j) => { const phi = TAU * i / 72 - PI / 2, p = teeP(phi, 1.526), back = Math.max(0, -Math.sin(phi)), y0 = 1.523 + 0.004 * back, ex = Math.hypot(p[0], p[2] - tZ(1.526)) || 1, o2 = CR[j][1];
      return [p[0] + p[0] / ex * o2, y0 + CR[j][0] * (1 - 0.25 * back), p[2] + (p[2] - tZ(1.526)) / ex * o2, i / 72 * 30, j]; }, { wrap: true, flip: true });
    onBone(chest, K.mesh(bufGeo(cb), teeMat));
  }

  // ------------------------------------------------------------------ arms: sleeve + skin (shoulder -> elbow -> wrist), hands
  const SK = [[0.026, 0.008, 0.008], [0.021, 0.026, 0.030], [0.011, 0.040, 0.046], [-0.004, 0.050, 0.056], [-0.025, 0.0555, 0.060], [-0.05, 0.0555, 0.059],
    [-0.09, 0.054, 0.0565], [-0.115, 0.0525, 0.055], [-0.132, 0.052, 0.054]];
  const AK = [   // local y below the shoulder joint, half thickness (x: back of the hand side), front half width (thumb side), back half width
    [-0.095, 0.047, 0.049, 0.051], [-0.15, 0.044, 0.047, 0.047], [-0.20, 0.040, 0.045, 0.043], [-0.25, 0.036, 0.039, 0.038], [-0.285, 0.034, 0.035, 0.036],
    [-0.305, 0.0335, 0.034, 0.040], [-0.33, 0.036, 0.038, 0.041], [-0.37, 0.038, 0.043, 0.041], [-0.42, 0.035, 0.041, 0.037], [-0.47, 0.029, 0.036, 0.032],
    [-0.51, 0.0235, 0.031, 0.0295], [-0.533, 0.021, 0.029, 0.029], [-0.552, 0.0198, 0.0282, 0.0282], [-0.565, 0.0192, 0.028, 0.028], [-0.583, 0.017, 0.029, 0.029]];
  const AKa = AK.slice().reverse(), aX = prof(AKa.map(r => [r[0], r[1]])), aF = prof(AKa.map(r => [r[0], r[2]])), aB = prof(AKa.map(r => [r[0], r[3]]));
  const sX = prof(SK.slice().reverse().map(r => [r[0], r[1]])), sZ = prof(SK.slice().reverse().map(r => [r[0], r[2]]));
  for (const sx of [1, -1]) {
    const A = ARM[sx], cx = sx * SHX, cy = SHY, cz = SHZ, iS = BI.get(A.sh), iE = BI.get(A.el);
    // sleeve: the cap above the joint stays with the chest, the tube goes with the arm
    const sb = mkBuf(), sl = [];
    for (let y = 0.026; y > -0.132; y -= y > -0.01 ? 0.003 : 0.0075) sl.push([y, 0]); sl.push([-0.132, 0], [-0.135, 0.0025], [-0.131, 0.0055], [-0.12, 0.007]);
    grid(sb, 56, sl.length - 1, (i, j) => { const phi = TAU * i / 56, ly = sl[j][0], ins = sl[j][1], x = cx + sx * (0.008 + (sX(ly) - ins) * Math.cos(phi)), z = cz + (sZ(ly) - ins) * Math.sin(phi);
      return [x, cy + ly, z, i / 56 * 3, ly * 9]; }, { wrap: true, flip: sx < 0, wf: q => W2(CHE, iS, sst((0.03 - (q[1] - cy)) / 0.10)) });
    skinned(sb, teeMat);
    // skin: one tube from inside the sleeve to inside the palm; the elbow blends upper arm -> forearm
    const ab = mkBuf(), ar = [];
    for (let y = -0.095; y > -0.583; y -= Math.abs(y + 0.305) < 0.05 ? 0.006 : y < -0.48 ? 0.007 : 0.011) ar.push(y); ar.push(-0.583);
    grid(ab, 56, ar.length - 1, (i, j) => { const phi = TAU * i / 56, ly = ar[j], c = Math.cos(phi), s = Math.sin(phi);
      let rx = aX(ly), rz = s >= 0 ? aF(ly) : aB(ly);
      rz += s < 0 ? 0.004 * Math.exp(-(((ly + 0.305) / 0.016) ** 2)) * Math.pow(Math.max(0, -s), 6) : 0;     // the point of the elbow
      return [cx + sx * rx * c, cy + ly, cz + rz * s, i / 56 * 1.6, ly * 10]; }, { wrap: true, flip: sx < 0, wf: q => W2(iS, iE, sst((-(UA - 0.035) - (q[1] - cy)) / 0.07)) });
    skinned(ab, skin);
  }
  // hands: a loosely closed runner's fist (fingers curled, thumb resting on the index finger), built on the hand bone.
  // Rest frame: wrist at the origin, fingers along -Y, thumb toward +Z, palm toward the body's midline (-sx X).
  const BGU = THREEX.BufferGeometryUtils;
  function capsule(a, b, r, r2 = r) {
    const d = sub(b, a), L = Math.hypot(d[0], d[1], d[2]), geo = new T.CapsuleGeometry(1, 1, 4, 12);
    const pos = geo.attributes.position;   // taper: radius r at a, r2 at b
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i), t = clamp((y + 1.5) / 3), rr = lerp(r, r2, t), yy = y > 0.5 ? L / 2 + (y - 0.5) * rr : y < -0.5 ? -L / 2 + (y + 0.5) * rr : y * L;
      pos.setXYZ(i, pos.getX(i) * rr, yy, pos.getZ(i) * rr); }
    geo.computeVertexNormals();
    const q = new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(d[0] / L, d[1] / L, d[2] / L));
    geo.applyMatrix4(new T.Matrix4().compose(new T.Vector3((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), q, new T.Vector3(1, 1, 1))); return geo;
  }
  const FING = [   // knuckle z, knuckle y, lengths (proximal, middle, distal), radius, curl (MCP, PIP, DIP)
    [0.0262, -0.090, [0.043, 0.025, 0.020], 0.0088, [1.22, 1.62, 0.62]],
    [0.0085, -0.094, [0.047, 0.028, 0.022], 0.0091, [1.30, 1.66, 0.64]],
    [-0.0092, -0.091, [0.044, 0.027, 0.021], 0.0086, [1.36, 1.68, 0.66]],
    [-0.0258, -0.084, [0.035, 0.020, 0.018], 0.0076, [1.44, 1.70, 0.66]]];
  const HANDPTS = {};
  function buildHand(sx) {
    const parts = [], nails = [], px = v => -sx * v;   // px: toward the palm
    // palm: the back of the hand is flatter, the palm side fuller
    { const b = mkBuf(), NV = 26;   // palm: a smooth rounded slab, thicker and narrower at the wrist, the palm side fuller at its heel
      grid(b, 40, NV, (i, j) => { const v = PI * j / NV, cv = Math.cos(v), sv = Math.sin(v), a = Math.sign(cv) * Math.pow(Math.abs(cv), 0.4), e = Math.pow(Math.abs(sv), 0.4), y = -0.0495 + 0.0505 * a, t = clamp((y + 0.099) / 0.099);
        const phi = TAU * i / 40, c = Math.cos(phi), sn = Math.sin(phi), q = se(phi, 1, 1, 1, 0, 2.7), dors = c * sx > 0;
        const tx = (dors ? lerp(0.0125, 0.0165, t) : lerp(0.0155, 0.0215, t)) * e, tz = lerp(0.0385, 0.031, t) * e;
        return [px(-0.002) + q[0] * tx, y, 0.001 + 0.003 * t + q[1] * tz, 0, 0]; void sn; }, { wrap: true, flip: sx < 0 });
      const pg = bufGeo(b); pg.deleteAttribute('color'); parts.push(pg); }
    const heel = new T.SphereGeometry(1, 18, 12); heel.scale(0.016, 0.034, 0.033); heel.translate(px(0.008), -0.036, -0.004); parts.push(heel);   // heel of the hand
    const thenar = new T.SphereGeometry(1, 18, 12); thenar.scale(0.016, 0.032, 0.019); thenar.translate(px(0.012), -0.040, 0.022); parts.push(thenar);
    for (const [kz, ky, Ls, r, cu] of FING) {
      let p = [sx * 0.002, ky, kz], th = 0; const rr = [r, r * 0.9, r * 0.82];
      parts.push((() => { const s = new T.SphereGeometry(r * 1.02, 14, 10); s.scale(0.72, 1.15, 1.2); s.translate(sx * 0.0045, p[1] + 0.002, p[2]); return s; })());   // knuckle, a soft bump on the back of the hand
      for (let k = 0; k < 3; k++) {
        th += cu[k]; const q = [p[0] + px(Math.sin(th)) * Ls[k], p[1] - Math.cos(th) * Ls[k], p[2]];
        parts.push(capsule(p, q, rr[k], k === 2 ? rr[k] * 0.9 : rr[k + 1]));
        if (k === 2) {   // a nail on the back of the last segment
          const d = nrm(sub(q, p)), up = [sx * Math.cos(th), -Math.sin(th) * 0 + 0, 0], nl = K.geo.rbox(r * 1.2, 0.0001 + Ls[k] * 0.55, 0.0013, 0.0006, 1);
          const n = nrm([sx * Math.cos(th), Math.sin(th), 0]), c = along(mix(p, q, 0.62), n, rr[k] * 0.93);
          const m = new T.Matrix4().makeBasis(new T.Vector3(...nrm(cross(d, n))), new T.Vector3(...d), new T.Vector3(...n)); m.setPosition(c[0], c[1], c[2]); nl.applyMatrix4(m); nails.push(nl); void up;
        }
        p = q;
      }
    }
    // thumb: from the base of the palm to a tip resting on the side of the index finger
    const t0 = [px(0.006), -0.026, 0.027], t1 = [px(0.024), -0.054, 0.042], t2 = [px(0.040), -0.073, 0.043], t3 = [px(0.050), -0.089, 0.035];
    parts.push(capsule(t0, t1, 0.0135, 0.0112), capsule(t1, t2, 0.0108, 0.0100), capsule(t2, t3, 0.0099, 0.0088));
    { const d = nrm(sub(t3, t2)), n = nrm([sx * 0.55, 0.15, 0.82]), c = along(mix(t2, t3, 0.6), n, 0.0086), nl = K.geo.rbox(0.0108, 0.012, 0.0013, 0.0006, 1);
      const xa = nrm(cross(d, n)), na = cross(xa, d), m = new T.Matrix4().makeBasis(new T.Vector3(...xa), new T.Vector3(...d), new T.Vector3(...na)); m.setPosition(c[0], c[1], c[2]); nl.applyMatrix4(m); nails.push(nl); }
    const norm = gg => { const q = gg.index ? gg.toNonIndexed() : gg; for (const k of Object.keys(q.attributes)) if (!['position', 'normal', 'uv'].includes(k)) q.deleteAttribute(k); return q; };
    const hand = K.mesh(BGU.mergeGeometries(parts.map(norm)), skin), nm = K.mesh(BGU.mergeGeometries(nails.map(norm)), nailMat, { cast: false });
    ARM[sx].hd.add(hand); ARM[sx].hd.add(nm);
    HANDPTS[sx] = [px(0.02), -0.075, 0.01];
  }
  buildHand(1); buildHand(-1);

  // ------------------------------------------------------------------ neck, head and hair
  {
    const b = mkBuf(), ys = []; for (let y = 1.47; y < 1.632; y += 0.008) ys.push(y);
    grid(b, 48, ys.length - 1, (i, j) => { const phi = TAU * i / 48, y = ys[j], r = lerp(0.054, 0.047, sst((y - 1.47) / 0.12)), c = Math.cos(phi), s = Math.sin(phi);
      return [r * c, y, -0.012 + 0.006 * sst((y - 1.5) / 0.1) + r * (s >= 0 ? 0.93 : 1.0) * s, i / 48, y * 8]; },
      { wrap: true, flip: true, wf: q => { const y = q[1]; if (y < 1.505) return W2(CHE, NEC, sst((y - 1.475) / 0.03)); return W2(NEC, HEA, sst((y - 1.565) / 0.045)); } });
    skinned(b, skin);
    const hg = new T.Group(); hg.position.set(0, 0.072, 0.012); head.add(hg);
    // one smooth egg (unit sphere -> head) that narrows to a soft jaw and chin; the hair is the same shape, a little bigger
    const headPt = (x, y, z, f) => { const lo = Math.max(0, -y), k = Math.pow(lo, 1.6);
      x *= 1 - 0.13 * k; z = z > 0 ? z * (1 + 0.04 * k) : z * (1 - 0.12 * k); y -= 0.05 * k * Math.max(0, z);
      z += 0.03 * Math.exp(-(((y - 0.35) / 0.3) ** 2)) * Math.max(0, z);                                                      // the brow
      return [x * 0.0885 * f, y * 0.1155 * f, z * 0.0985 * f]; };
    { const geo = new T.SphereGeometry(1, 56, 40), hp = geo.attributes.position;
      for (let i = 0; i < hp.count; i++) { const q = headPt(hp.getX(i), hp.getY(i), hp.getZ(i), 1); hp.setXYZ(i, q[0], q[1], q[2]); }
      geo.deleteAttribute('normal'); geo.deleteAttribute('uv'); const m = BGU.mergeVertices(geo, 1e-7); m.computeVertexNormals(); hg.add(K.mesh(m, skin)); }
    // short hair: a hairline high on the forehead, set back at the temples, above the ears, low at the nape; a crisp 1 mm edge
    { const HL = prof([[0, 1.10], [0.5, 1.15], [0.8, 1.27], [1.1, 1.36], [1.45, 1.38], [1.7, 1.40], [1.95, 1.72], [2.3, 2.18], [2.7, 2.42], [PI, 2.48]]);
      const b = mkBuf(), NJ = 22, rows = []; for (let j = 0; j <= NJ; j++) rows.push([j / NJ, lerp(1.034, 1.012, sst((j / NJ - 0.8) / 0.2))]); rows.push([1, 0.992]);
      grid(b, 72, rows.length - 1, (i, j) => { const ph = TAU * i / 72 - PI, th = HL(Math.abs(ph)) * rows[j][0], st = Math.sin(th);
        const q = headPt(st * Math.sin(ph), Math.cos(th), st * Math.cos(ph), rows[j][1]); return [q[0], q[1], q[2], i / 72 * 6, j / NJ * 3]; }, { wrap: true, flip: true });
      hg.add(K.mesh(bufGeo(b), hairMat)); }
    { const ng = new T.SphereGeometry(0.011, 20, 14), np = ng.attributes.position; for (let i = 0; i < np.count; i++) { const y = np.getY(i) / 0.011; np.setX(i, np.getX(i) * lerp(1.15, 0.45, (y + 1) / 2)); np.setZ(i, np.getZ(i) * lerp(1.0, 0.7, (y + 1) / 2)); }
      ng.computeVertexNormals(); hg.add(K.mesh(ng, skin, { pos: [0, -0.014, 0.0925], scale: [0.85, 1.9, 0.78], rot: [0.12, 0, 0] })); }        // a hint of a nose
    for (const sx of [-1, 1]) {
      hg.add(K.mesh(new T.SphereGeometry(0.021, 20, 14), skin, { pos: [sx * 0.088, -0.012, -0.006], scale: [0.42, 1.25, 0.78], rot: [0, sx * 0.25, 0] }));   // ears
    }
  }

  // ------------------------------------------------------------------ shorts (one half per leg; above the crotch each half is a D that meets the other)
  const PA = prof([[0.76, 0.180], [0.82, 0.182], [0.88, 0.170], [0.95, 0.157], [1.0, 0.149]]);
  const PF = prof([[0.76, 0.095], [0.86, 0.099], [0.92, 0.100], [1.0, 0.096]]);
  const PB = prof([[0.76, 0.106], [0.82, 0.123], [0.855, 0.125], [0.90, 0.115], [0.95, 0.106], [1.0, 0.097]]);
  const SXo = prof([[0.64, 0.094], [0.72, 0.095], [0.80, 0.097]]), SF = prof([[0.64, 0.091], [0.72, 0.093], [0.80, 0.096]]), SB = prof([[0.64, 0.098], [0.72, 0.101], [0.80, 0.106]]);
  const TM = y => sst((0.865 - y) / 0.09), EIN = 0.013;
  function shortsS(phi, y, sx) {
    const c = Math.cos(phi), s = Math.sin(phi), t = TM(y);
    let x = HIPX + SXo(y) * c, z = (s >= 0 ? SF(y) : SB(y)) * s;
    if (t < 1) { const px = (c >= 0 ? PA(y) : EIN) * c, pz = (s >= 0 ? PF(y) : PB(y)) * s; x = px + (x - px) * t; z = pz + (z - pz) * t; }
    // creases: the cloth bunches a little at the front of the hip and hangs in soft folds near the hem
    const fy = sst((0.80 - y) / 0.08); if (fy > 0) { const d = 0.0022 * fy * Math.sin(phi * 5 + 0.7 + 14 * y); x += d * c; z += d * s; }
    return [sx * x, y, z];
  }
  const hemY = phi => { let a = Math.atan2(Math.sin(phi), Math.cos(phi)); return 0.690 + 0.042 * Math.exp(-((a / 0.30) ** 2)) - 0.012 * Math.max(0, Math.sin(phi)); };
  for (const sx of [1, -1]) {
    const b = mkBuf(), NV = 44, Lg = LEG[sx], iT = BI.get(Lg.th);
    const wf = q => { const xa = Math.abs(q[0]), base = lerp(0.775, 0.87, Math.min(1, xa / 0.17)); return W2(PEL, iT, sst((base + 0.06 - q[1]) / 0.12)); };
    grid(b, 72, NV + 3, (i, j) => {
      const phi = TAU * i / 72, hy = hemY(phi);
      if (j <= NV) { const y = lerp(0.99, hy, j / NV), p = shortsS(phi, y, sx); return [p[0], p[1], p[2], i / 72 * 9, y * 9]; }
      const k = j - NV, yy = hy + [0.0, -0.002, 0.002, 0.014][k], ins = [0, 0.003, 0.006, 0.007][k], p = shortsS(phi, Math.min(yy, hy), sx), dx = p[0] - sx * HIPX, l = Math.hypot(dx, p[2]) || 1;
      return [p[0] - dx / l * ins, yy, p[2] - p[2] / l * ins, i / 72 * 9, yy * 9];
    }, { wrap: true, flip: sx < 0, wf });
    skinned(b, shortsMat);
    // a small reflective tab on the hem at the back of the outer side (rigid on the thigh: the hem moves with it)
    if (sx === LX) { const p = shortsS(-0.55, 0.712, sx), tab = K.mesh(K.geo.rbox(0.022, 0.009, 0.002, 0.0009, 2), refl, { pos: [p[0] + sx * 0.0012, p[1], p[2] - 0.0008], rot: [0, Math.atan2(sx * Math.cos(-0.55), Math.sin(-0.55)) , 0], cast: false }); onBone(Lg.th, tab); }
  }

  // ------------------------------------------------------------------ legs: skin from inside the shorts to inside the sock
  const LKs = [   // y, outer, inner, front, back
    [0.755, 0.089, 0.081, 0.089, 0.093], [0.72, 0.086, 0.078, 0.086, 0.090], [0.66, 0.080, 0.071, 0.080, 0.083], [0.60, 0.069, 0.062, 0.071, 0.072],
    [0.555, 0.057, 0.054, 0.061, 0.060], [0.515, 0.052, 0.050, 0.057, 0.054], [0.49, 0.050, 0.049, 0.053, 0.050], [0.46, 0.048, 0.047, 0.047, 0.056],
    [0.42, 0.050, 0.048, 0.045, 0.064], [0.37, 0.049, 0.047, 0.044, 0.062], [0.31, 0.044, 0.042, 0.041, 0.053], [0.24, 0.037, 0.035, 0.036, 0.041],
    [0.18, 0.0315, 0.030, 0.033, 0.034], [0.13, 0.0295, 0.0285, 0.031, 0.032], [0.07, 0.028, 0.028, 0.030, 0.031]].reverse();
  const lO = prof(LKs.map(r => [r[0], r[1]])), lI = prof(LKs.map(r => [r[0], r[2]])), lF = prof(LKs.map(r => [r[0], r[3]])), lB = prof(LKs.map(r => [r[0], r[4]]));
  for (const sx of [1, -1]) {
    const b = mkBuf(), Lg = LEG[sx], iT = BI.get(Lg.th), iS = BI.get(Lg.sn), ys = [];
    for (let y = 0.755; y > 0.07; y -= Math.abs(y - 0.49) < 0.06 ? 0.0065 : 0.012) ys.push(y); ys.push(0.07);
    grid(b, 56, ys.length - 1, (i, j) => { const phi = TAU * i / 56, y = ys[j], c = Math.cos(phi), s = Math.sin(phi);
      let rx = c >= 0 ? lO(y) : lI(y), rz = s >= 0 ? lF(y) : lB(y);
      rz += s > 0 ? 0.0075 * Math.exp(-(((y - 0.513) / 0.024) ** 2)) * Math.pow(s, 5) : 0;                                       // the kneecap
      rx += 0.0035 * Math.exp(-(((y - 0.40) / 0.05) ** 2)) * Math.max(0, -c) * Math.max(0, -s) * 2;                                // inner calf head
      return [sx * (HIPX + rx * c), y, rz * s, i / 56 * 2.4, y * 10]; }, { wrap: true, flip: sx < 0, wf: q => W2(iT, iS, sst((0.527 - q[1]) / 0.072)) });
    skinned(b, skin);
  }

  // ------------------------------------------------------------------ running shoe (built as the +X foot; the other is its mirror), from legs.js's sneaker
  // the sole is a rocker: flat in the middle, an arc under the heel, an arc under the toes. The foot ROLLS on it (no sliding).
  const ZHEEL = -0.075, ZTOE = 0.205, ZF = 0.115, RF = 0.195, AF = Math.asin((ZTOE - ZF) / RF), YTIP = RF * (1 - Math.cos(AF)), ZH = -0.035, RH = 0.07;
  const soleY = z => z > ZF ? RF - Math.sqrt(Math.max(0, RF * RF - (z - ZF) * (z - ZF))) : z < ZH ? RH - Math.sqrt(Math.max(0, RH * RH - (z - ZH) * (z - ZH))) : 0;
  const rcv = document.createElement('canvas'); rcv.width = 64; rcv.height = 4; const rg = rcv.getContext('2d'); for (let x = 0; x < 64; x++) { const v = Math.round(128 + 110 * Math.sin(x / 64 * TAU * 8)); rg.fillStyle = `rgb(${v},${v},${v})`; rg.fillRect(x, 0, 1, 4); }
  const sockMat = new T.MeshStandardMaterial({ color: new T.Color('#bfc3ca'), roughness: 0.92 }); sockMat.bumpMap = K.canvasTex(rcv, { srgb: false }); sockMat.bumpMap.repeat.set(5, 1); sockMat.bumpScale = 2.0;
  function buildShoe() {
    const sg = new T.Group();
    const UP = new T.MeshPhysicalMaterial({ color: new T.Color('#2a2e36'), roughness: 0.74, metalness: 0, sheen: 1, sheenRoughness: 0.38, sheenColor: new T.Color('#8792a8') });
    UP.bumpMap = K.canvasTex(K.noiseCanvas(128, 61, 'weave'), { srgb: false, repeat: 1 }); UP.bumpMap.repeat.set(26, 14); UP.bumpScale = 0.9;
    const SOLE = K.mat.clay('#e9e7e1', 0.62), GREY = new T.MeshPhysicalMaterial({ color: new T.Color('#1b1c20'), roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    const OUTS = K.mat.rubber('#2c2d31'), LIN = K.mat.clay('#17181b', 0.96), LACE = K.mat.clay('#c7cad0', 0.86);
    const add = (b, mat, opt) => { const m = K.mesh(bufGeo(b), mat, opt); sg.add(m); return m; };
    // footprint: heel -> outer side -> toe -> inner side
    const CP = [[0, -0.075], [0.026, -0.069], [0.038, -0.045], [0.041, -0.005], [0.045, 0.045], [0.052, 0.095], [0.0510, 0.135], [0.0385, 0.176], [0.017, 0.200], [-0.004, 0.205], [-0.024, 0.197], [-0.0415, 0.168], [-0.0492, 0.125], [-0.046, 0.08], [-0.039, 0.03], [-0.0375, -0.015], [-0.0375, -0.045], [-0.026, -0.069]];
    const M = 96, O = new T.CatmullRomCurve3(CP.map(p => new T.Vector3(p[0], 0, p[1])), true, 'centripetal').getSpacedPoints(M).slice(0, M).map(v => [v.x, v.z]);
    const ON = O.map((p, j) => { const a = O[(j + M - 1) % M], c = O[(j + 1) % M], l = Math.hypot(c[0] - a[0], c[1] - a[1]); return [(c[1] - a[1]) / l, -(c[0] - a[0]) / l]; });
    const oAt = (s, inset = 0) => { s = ((s % 1) + 1) % 1; const f = s * M, j = Math.floor(f) % M, k = (j + 1) % M, u = f - Math.floor(f); return [lerp(O[j][0], O[k][0], u) - lerp(ON[j][0], ON[k][0], u) * inset, lerp(O[j][1], O[k][1], u) - lerp(ON[j][1], ON[k][1], u) * inset]; };
    let jTip = 0; O.forEach((p, j) => { if (p[1] > O[jTip][1]) jTip = j; }); const sNose = jTip / M;
    const sAtZ = (z, lat) => {
      if (lat) { for (let j = 0; j < jTip; j++) if (O[j + 1][1] >= z) return (j + clamp((z - O[j][1]) / (O[j + 1][1] - O[j][1] || 1))) / M; return sNose; }
      for (let j = jTip; j < M; j++) { const a = O[j][1], b = O[(j + 1) % M][1]; if (b <= z) return (j + clamp((a - z) / (a - b || 1))) / M; } return 1;
    };
    // sole: dark rubber outsole, a tall light midsole (a running shoe's foam) with a soft bulge
    const ytop = z => lerp(0.050, 0.033, sst((z + 0.04) / 0.14)) + (z > ZF ? soleY(z) : 0);
    const wall = (b, rows, v0) => grid(b, M, rows.length - 1, (i, j) => { const p = oAt(i / M, rows[j][0]); return [p[0], rows[j][1](p[1]), p[1], i / M * 3, v0 + j * 0.05]; }, { wrap: true, flip: true });
    const bo = mkBuf(); wall(bo, [[0.0035, z => soleY(z) + 0.0004], [0.0008, z => soleY(z) + 0.0028], [0, z => soleY(z) + 0.0062], [0.0008, z => soleY(z) + 0.0082]], 0); add(bo, OUTS);
    const bm = mkBuf(); const mid = k => z => lerp(soleY(z) + 0.011, ytop(z), k); wall(bm, [[0.0013, z => soleY(z) + 0.0078], [-0.0006, z => soleY(z) + 0.0108], [-0.0026, mid(0.40)], [-0.0008, mid(0.47)], [-0.0026, mid(0.54)], [-0.0018, z => ytop(z) - 0.006], [0, z => ytop(z) - 0.0012], [0.003, z => ytop(z) + 0.0006], [0.014, z => ytop(z) + 0.0006]], 0); add(bm, SOLE);
    const bb = mkBuf(), tcv = document.createElement('canvas'); tcv.width = 128; tcv.height = 256; const tg = tcv.getContext('2d'); tg.fillStyle = '#3a3b40'; tg.fillRect(0, 0, 128, 256); tg.strokeStyle = '#1e1f22'; tg.lineWidth = 5;
    for (let y = -20; y < 280; y += 17) { tg.beginPath(); for (let x = 0; x <= 128; x += 16) tg.lineTo(x, y + ((x / 16) % 2 ? 9 : 0)); tg.stroke(); }
    grid(bb, M, 4, (i, j) => { const p = oAt(i / M, 0.0035), k = 1 - j / 4, x = 0.002 + (p[0] - 0.002) * k, z = 0.065 + (p[1] - 0.065) * k; return [x, soleY(z) + 0.0004, z, x / 0.11 + 0.5, (z + 0.08) / 0.29, 1, 1, 1, 0, -1, 0]; }, { wrap: true });
    add(bb, new T.MeshStandardMaterial({ map: K.canvasTex(tcv), roughness: 0.8 }), { cast: false });
    // upper: slices stacked from the sole to the collar. Each slice is the footprint, shorter at the front the higher it is.
    const INS = 0.0035; let zmin = 9, zmax = -9; for (let j = 0; j < M; j++) { const p = oAt(j / M, INS); zmin = Math.min(zmin, p[1]); zmax = Math.max(zmax, p[1]); }
    const ZFk = prof([[0, zmax], [0.12, zmax - 0.001], [0.22, zmax - 0.006], [0.30, 0.176], [0.36, 0.150], [0.42, 0.125], [0.55, 0.100], [0.70, 0.078], [0.85, 0.057], [1, 0.040]]);
    const zBk = h => zmin + 0.012 * h * h - 0.004 * Math.sin(PI * h), ws = h => 1 - 0.06 * sst(h / 0.3) - 0.13 * Math.pow(h, 1.6), yC = z => 0.103 + (z + 0.07) * 0.145;
    const sf = s => { s = ((s % 1) + 1) % 1; const k = Math.sin(PI * (s < sNose ? s / sNose : (s - sNose) / (1 - sNose))); return k * k; };   // 1 at the sides of the ankle: the collar dips there
    const U = (h, s, inset = 0, dy = 0) => { const p = oAt(s, INS + inset), f = (p[1] - zmin) / (zmax - zmin), zb = zBk(h), z = zb + (ZFk(h) - zb) * f; return [p[0] * ws(h), lerp(ytop(z) - 0.001, yC(z), h) + dy - 0.010 * sf(s) * h * h * h, z]; };
    const UN = (h, s) => { const eh = 0.012, a = U(h, s - 0.004), b = U(h, s + 0.004), c = U(Math.max(0, h - eh), s), d = U(Math.min(1, h + eh), s); return nrm(cross(sub(d, c), sub(b, a))); };
    const HN = 24, rows = []; for (let i = 0; i < HN; i++) rows.push([i / (HN - 1), 0, 0]);
    rows.push([1, 0.0026, 0.0032], [1, 0.0056, 0.0022], [1, 0.0070, -0.003]);
    const bu = mkBuf(); grid(bu, M, rows.length - 1, (i, j) => { const p = U(rows[j][0], i / M, rows[j][1], rows[j][2]); return [p[0], p[1], p[2], i / M * 2, j / HN]; }, { wrap: true, flip: true }); add(bu, UP);
    const bl = mkBuf(), lr = [[1, 0.0070, -0.003, 1], [1, 0.0082, -0.028, 1], [1, 0.0082, -0.028, 0.5], [1, 0.0082, -0.028, 0]];
    grid(bl, M, lr.length - 1, (i, j) => { const p = U(1, i / M, lr[j][1], lr[j][2]), k = lr[j][3]; return k === 0 ? [0, yC(-0.01) - 0.034, -0.01, 0, 0, 1, 1, 1, 0, 1, 0] : [p[0] * k, k < 1 ? yC(-0.01) - 0.034 : p[1], -0.01 + (p[2] + 0.01) * k]; }, { wrap: true, flip: true }); add(bl, LIN);
    // overlays laid on the upper
    const sAt = (z, h, lat) => { const zb = zBk(h); return sAtZ(zmin + clamp((z - zb) / (ZFk(h) - zb)) * (zmax - zmin), lat); };
    const sOff = (h, d) => { const sgn = Math.sign(d), ds = 0.0012; let s = sNose, acc = 0, p = U(h, s); for (let k = 0; k < 500 && acc < Math.abs(d); k++) { s += sgn * ds; const q = U(h, s); acc += dist(q, p); p = q; } return s; };
    const panel = (mat, fn, na, nb, thick, ea, eb, open = '') => { const b = mkBuf(); slab(b, (a, bb2) => { const q = fn(a, bb2), h = clamp(q[1]); return [U(h, q[0]), UN(h, q[0])]; }, na, nb, thick, [1, 1, 1], ea, eb, { flip: true, open }); add(b, mat); };
    const sA = sAt(0.062, 0, true), sB = sAt(0.052, 0, false);
    panel(GREY, (a, b) => [lerp(sA, sB, a), b * (0.015 + 0.24 * Math.pow(Math.sin(PI * a), 1.25))], 64, 7, 0.0012, 0.004, 0.05, 't');   // toe bumper
    const sC = sAt(-0.012, 0, false), sD = 1 + sAt(-0.012, 0, true);
    panel(GREY, (a, b) => [lerp(sC, sD, a), b * (0.30 + 0.60 * Math.pow(Math.sin(PI * a), 0.8))], 30, 10, 0.0026, 0.012, 0.03, 't');   // heel counter
    panel(K.mat.metal('#d7dbe2', 0.2), (a, b) => [lerp(lerp(sC, sD, 0.36), lerp(sC, sD, 0.64), a), lerp(0.70, 0.76, b)], 14, 2, 0.0034, 0.04, 0.12);   // reflective heel strip
    for (const lat of [true, false]) panel(GREY, (a, b) => { const h = lat ? 0.46 + 0.53 * a : 0.99 - 0.53 * a; return [sOff(h, (lat ? -1 : 1) * (0.0145 + 0.0165 * b)), h]; }, 14, 3, 0.0024, 0.03, 0.08);        // eyestays
    // side swoosh-free stripe: a thin light line along the midsole top edge catches the rim light
    { const b = mkBuf(); grid(b, M, 1, (i, j) => { const p = oAt(i / M, -0.0006), z = p[1]; return [p[0], ytop(z) + 0.0004 - j * 0.0016, z, 0, 0]; }, { wrap: true, flip: true }); add(b, K.mat.clay('#f4f3ef', 0.5), { cast: false }); }
    // stitching along the overlay edges
    const bs = mkBuf(), sst2 = (fn, lift, t0 = 0, t1 = 1) => { const path = []; for (let i = 0; i <= 90; i++) { const q = fn(lerp(t0, t1, i / 90)), h = clamp(q[1]), n = UN(h, q[0]); path.push({ p: along(U(h, q[0]), n, lift), n }); } stitches(bs, path, { len: 0.0026, gap: 0.0014, r: 0.0004 }); };
    sst2(a => [lerp(sC, sD, a), 0.90 * (0.30 + 0.60 * Math.pow(Math.sin(PI * a), 0.8)) - 0.02], 0.0030, 0.05, 0.95);
    add(bs, K.mat.clay('#3d4047', 0.9), { cast: false });
    // tongue: a padded strip up the instep, standing a little above the collar
    const Rg = h => U(h, sNose), RNn = h => UN(h, sNose), Te = nrm(sub(Rg(1), Rg(0.95))), tp = [];
    for (let k = 0; k <= 14; k++) { const h = 0.47 + 0.53 * k / 14; tp.push({ p: along(Rg(h), RNn(h), -0.0062 * (1 - sst(k / 3))), n: RNn(h), w: lerp(0.021, 0.0255, k / 14) }); }
    for (const d of [0.007, 0.014, 0.020]) tp.push({ p: along(along(Rg(1), Te, d), RNn(1), 0.0015 * d / 0.02), n: RNn(1), w: 0.0255 });
    const bt = mkBuf(), TS = 16, nt = tp.length;
    grid(bt, TS, nt + 1, (i, j) => { const q = tp[clamp(j - 1, 0, nt - 1)], end = j === 0 || j === nt + 1, tip = j <= 1 || j >= nt ? 0.72 : 1, a = TAU * i / TS, ca = Math.cos(a), sa = Math.sin(a);
      const cx = end ? 0 : q.w * tip * Math.sign(ca) * Math.pow(Math.abs(ca), 0.6), cn = 0.0045 + (end ? 0 : 0.0036 * Math.sign(sa) * Math.pow(Math.abs(sa), 0.8)), p = along(q.p, q.n, cn);
      return end ? [p[0], p[1], p[2], 0, 0, 1, 1, 1, 0, j ? 0.6 : -0.6, j ? -0.8 : 0.8] : [p[0] + cx, p[1], p[2], i / TS, j / nt]; }, { wrap: true, flip: true }); add(bt, UP);
    // eyelets and laces
    const EL = [], EM = [];
    for (let r = 0; r < 5; r++) { const h = 0.52 + r * 0.105; for (const lat of [true, false]) { const s = sOff(h, (lat ? -1 : 1) * 0.0228), p = U(h, s), n = UN(h, s), e = along(p, n, 0.0028); (lat ? EL : EM).push({ p: e, h });
      const m = K.mesh(K.geo.cyl(0.0024, 0.0009, 16), K.mat.clay('#3b3d42', 0.6), { pos: e, cast: false }); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(n[0], n[1], n[2])); sg.add(m); } }
    const lace = (a, b, hm, lift) => { const n = RNn(hm), pts = [0, 0.2, 0.5, 0.8, 1].map((t, i) => along(mix(a, b, t), n, [0, 0.0115, 0.014, 0.0115, 0][i] + (i > 0 && i < 4 ? lift : 0))); sg.add(K.mesh(K.geo.tube(pts, 0.0021, { seg: 20, rad: 8 }), LACE)); };
    lace(EL[0].p, EM[0].p, EL[0].h, 0);
    for (let r = 0; r < 4; r++) { const hm = (EL[r].h + EL[r + 1].h) / 2; lace(EL[r].p, EM[r + 1].p, hm, 0); lace(EM[r].p, EL[r + 1].p, hm, 0.0026); }
    lace(EL[4].p, EM[4].p, EL[4].h, 0.001);
    // heel pull tab, and the sock going down into the shoe
    const loopGeo = K.geo.extrude(K.geo.rrect(0.0058, 0.026, 0.0028), 0.011, { bevel: 0.0003, holes: [K.geo.rrect(0.0030, 0.0232, 0.0014)], curveSegments: 10 }); loopGeo.rotateY(PI / 2); loopGeo.translate(-0.0055, 0, 0);
    sg.add(K.mesh(loopGeo, refl, { pos: [0, yC(-0.07) - 0.0015, zBk(0.9) - 0.0022], rot: [0.14, 0, 0] }));
    sg.add(K.mesh(K.geo.cyl(0.035, 0.04, 32), sockMat, { pos: [0, 0.066, -0.004], scale: [0.86, 1, 1.02] }));
    return sg;
  }
  const sockGeo = new T.LatheGeometry(new T.SplineCurve([[0.030, -0.05], [0.0345, -0.02], [0.0356, 0], [0.0352, 0.03], [0.0358, 0.055], [0.0366, 0.072]].map(p => new T.Vector2(p[0], p[1]))).getPoints(20), 40);
  const shoe = buildShoe();
  for (const sx of [1, -1]) {
    const Lg = LEG[sx];
    // sock on the shin bone (a low running sock with a rolled top), shoe on the foot bone
    Lg.sn.add(K.mesh(sockGeo, sockMat, { pos: [0, -L2, 0], scale: [0.92, 1, 1.0] }));
    Lg.sn.add(K.mesh(new T.TorusGeometry(0.0356, 0.0032, 10, 40), sockMat, { pos: [0, -L2 + 0.071, 0], rot: [PI / 2, 0, 0], scale: [0.92, 1.0, 1] }));
    Lg.sn.add(K.mesh(new T.SphereGeometry(0.0352, 28, 20), sockMat, { pos: [0, -L2, 0], scale: [0.86, 1, 1.02] }));
    const inner = sx > 0 ? shoe : shoe.clone(true); inner.position.y = -ANKY; inner.scale.x = sx; Lg.ft.add(inner);
  }

  // ------------------------------------------------------------------ the running gait
  // One cycle = two steps. Per leg, p = 0 at its foot strike. Stance 0..DUTY (the foot rolls heel -> flat -> toe on its
  // rocker sole while the body passes over it at SPD m per cycle), then the swing: toe-off, heel kick, knee drive, reach,
  // a little pull back, strike. Swing is keyed in joint angles (hip h, knee k) and joins the stance with matched speed.
  const G = { SPD: 2.2, DUTY: 0.31, HS: 0.17, pFF: 0.05, pHO: 0.12, TO: 1.02, EXP: 1.45, ZS: 0.125, FXW: 0.050, TOEOUT: 0.07, PL: -0.08,
    HM: 0.872, BOB: 0.031, PLOW: 0.12, STANDY: 0.892,
    SU: [0.30, 0.58, 0.82], SH: [0.04, 0.58, 0.70], SK: [1.86, 1.52, 0.66],                // swing keys: u, hip angle, knee bend
    AMID: -0.17, AAMP: 0.47, EMID: 1.52, EAMP: 0.28, PRON: 0.62, ALAG: 0.03 };
  const RK = [0, 0];
  function rock(th, out) {   // ankle [dz, y] for a foot pitched by th (heel up > 0) rolling on its sole, relative to where the flat foot stands
    const c = Math.cos(th), s = Math.sin(th);
    if (th >= 0) {
      if (th <= AF) { out[0] = ZF + RF * th - ZF * c + (ANKY - RF) * s; out[1] = RF + ZF * s + (ANKY - RF) * c; }
      else { out[0] = ZF + RF * AF - ZTOE * c + (ANKY - YTIP) * s; out[1] = ZTOE * s + (ANKY - YTIP) * c; }
    } else { out[0] = ZH + RH * th - ZH * c + (ANKY - RH) * s; out[1] = RH + ZH * s + (ANKY - RH) * c; }
    return out;
  }
  const stTh = p => p < G.pFF ? -G.HS * (1 - p / G.pFF) * (1 - p / G.pFF) : p < G.pHO ? 0 : G.TO * Math.pow((p - G.pHO) / (G.DUTY - G.pHO), G.EXP);
  const frac = x => x - Math.floor(x);
  const PP = { x: 0, y: 0, z: 0, yaw: 0, roll: 0, pitch: 0 };
  function pelvisAt(run, w, P) {
    const c1 = TAU * run;
    P.x = w * LX * 0.010 * Math.sin(c1 + 0.63); P.z = 0;
    P.y = lerp(G.STANDY, G.HM - G.BOB * Math.cos(2 * TAU * (run - G.PLOW)), w);
    P.yaw = -w * LX * 0.085 * Math.cos(c1 - 0.15);       // his left hip forward when his left foot lands
    P.roll = w * LX * 0.035 * Math.sin(c1 + 0.63);        // the swing side drops a little
    P.pitch = lerp(0.0, 0.06, w);                        // pelvis tipped forward: part of the run's lean
    return P;
  }
  const hipAt = (P, sx, out) => { const cr = Math.cos(P.roll), sr = Math.sin(P.roll), cy = Math.cos(P.yaw), sy = Math.sin(P.yaw), h = sx * HIPX;
    out[0] = P.x + h * cr * cy; out[1] = P.y + h * sr; out[2] = P.z - h * cr * sy; return out; };
  const IKo = { b: 0, h: 0, k: 0 };
  function ik(H, ax, ay, az, out) {
    const dx = ax - H[0], dy = H[1] - ay, dz = az - H[2], dn = Math.hypot(dx, dy), dc = Math.min(Math.hypot(dz, dn), LL * 0.9995);
    out.b = Math.atan2(dx, dy);
    out.k = PI - Math.acos(clamp((L1 * L1 + L2 * L2 - dc * dc) / (2 * L1 * L2), -1, 1));
    out.h = Math.atan2(dz, dn) + Math.acos(clamp((L1 * L1 + dc * dc - L2 * L2) / (2 * L1 * dc), -1, 1));
    return out;
  }
  // a planted foot at its own phase p (0..DUTY) while the pelvis is at run r: joint angles and foot pitch
  const PPs = { x: 0, y: 0, z: 0, yaw: 0, roll: 0, pitch: 0 }, Hs = [0, 0, 0];
  function stanceIK(sx, p, r, out) {
    const th = stTh(p); rock(th, RK); const fy = sx * G.TOEOUT;
    pelvisAt(r, 1, PPs); hipAt(PPs, sx, Hs);
    ik(Hs, sx * G.FXW + Math.sin(fy) * RK[0], RK[1], G.ZS - G.SPD * p + RK[0], out); out.th = th; return out;
  }
  const E0 = { b: 0, h: 0, k: 0, th: 0 }, E0m = { b: 0, h: 0, k: 0, th: 0 }, E1 = { b: 0, h: 0, k: 0, th: 0 }, E1p = { b: 0, h: 0, k: 0, th: 0 };
  const KX = [0, 0, 0, 0, 1], KY = [0, 0, 0, 0, 0];
  function spline5(u, Y, m0, m1) {   // Hermite through 5 keys at KX with end slopes m0, m1 and Catmull-Rom slopes inside
    let i = 0; while (i < 3 && u > KX[i + 1]) i++;
    const x0 = KX[i], x1 = KX[i + 1], h = x1 - x0, t = clamp((u - x0) / h), t2 = t * t, t3 = t2 * t;
    const s0 = i === 0 ? m0 : (Y[i + 1] - Y[i - 1]) / (KX[i + 1] - KX[i - 1]), s1 = i === 3 ? m1 : (Y[i + 2] - Y[i]) / (KX[i + 2] - KX[i]);
    return (2 * t3 - 3 * t2 + 1) * Y[i] + (t3 - 2 * t2 + t) * h * s0 + (3 * t2 - 2 * t3) * Y[i + 1] + (t3 - t2) * h * s1;
  }
  const herm = (u, a, b, m0, m1) => { const u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * a + (u3 - 2 * u2 + u) * m0 + (3 * u2 - 2 * u3) * b + (u3 - u2) * m1; };
  KX[1] = G.SU[0]; KX[2] = G.SU[1]; KX[3] = G.SU[2];
  // one leg at run phase `run` (pure running pose): fills L = { b, h, k, th }
  function legRun(sx, run, L) {
    const p = frac(run + (sx === LX ? 0 : 0.5)), EPS = 1e-4, SW = 1 - G.DUTY;
    if (p < G.DUTY) { stanceIK(sx, p, run, L); return L; }
    const u = (p - G.DUTY) / SW, r0 = run - (p - G.DUTY), r1 = run + (1 - p);
    stanceIK(sx, G.DUTY, r0, E0); stanceIK(sx, G.DUTY - EPS, r0 - EPS, E0m); stanceIK(sx, 0, r1, E1); stanceIK(sx, EPS, r1 + EPS, E1p);
    const sc = SW / EPS;
    KY[0] = E0.h; KY[1] = G.SH[0]; KY[2] = G.SH[1]; KY[3] = G.SH[2]; KY[4] = E1.h; L.h = spline5(u, KY, (E0.h - E0m.h) * sc, (E1p.h - E1.h) * sc);
    KY[0] = E0.k; KY[1] = G.SK[0]; KY[2] = G.SK[1]; KY[3] = G.SK[2]; KY[4] = E1.k; L.k = spline5(u, KY, (E0.k - E0m.k) * sc, (E1p.k - E1.k) * sc);
    L.b = herm(u, E0.b, E1.b, (E0.b - E0m.b) * sc, (E1p.b - E1.b) * sc);
    const thb = herm(u, E0.th, E1.th, (E0.th - E0m.th) * sc, (E1p.th - E1.th) * sc), bw = Math.pow(Math.sin(PI * u), 1.3);
    L.th = thb + (-(L.h - L.k) + G.PL - thb) * bw;     // mid-swing the foot keeps a set angle to the shin
    return L;
  }

  // ------------------------------------------------------------------ pose
  const LR = { b: 0, h: 0, k: 0, th: 0 }, Hh = [0, 0, 0];
  const eP = new T.Euler(0, 0, 0, 'YZX'), eT = new T.Euler(0, 0, 0, 'ZXY'), eF = new T.Euler(0, 0, 0, 'YXZ');
  const qP = new T.Quaternion(), qPi = new T.Quaternion(), qT = new T.Quaternion(), qS = new T.Quaternion(), qF = new T.Quaternion(), XA = new T.Vector3(1, 0, 0);
  const WLp = new T.Vector3(), WLq = new T.Quaternion(), WRp = new T.Vector3(), WRq = new T.Quaternion();
  const mA = new T.Matrix4(), vA = new T.Vector3(), sA = new T.Vector3(), qA = new T.Quaternion();
  // the watch frame on each forearm (forearm-bone frame): centre on the back of the wrist, 32 mm above the wrist joint
  const WOFF = 0.0255, WUP = FA - 0.032, WQ = {}, WQF = {};
  for (const sx of [1, -1]) {
    const Z = new T.Vector3(sx, 0, 0), Xd = new T.Vector3(0, -1, 0);
    WQ[sx] = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(Xd, new T.Vector3().crossVectors(Z, Xd), Z));        // +X to the fingers, +Y across
    WQF[sx] = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(new T.Vector3().crossVectors(Xd, Z), Xd, Z));     // +Y to the fingers
  }
  const chainTo = (b, out) => { out.copy(b.matrix); for (let p = b.parent; p && p !== g; p = p.parent) out.premultiply(p.matrix); return out; };
  let stub = null; const SIDES = [1, -1];
  function apply(s) {
    const run = s.run || 0, stl = clamp(s.still || 0), w = 1 - stl, arms = clamp(s.arms ?? 1);
    pelvisAt(run, w, PP);
    pelvis.position.set(PP.x, PP.y, PP.z); pelvis.rotation.set(PP.pitch, PP.yaw, PP.roll);
    qP.copy(pelvis.quaternion); qPi.copy(qP).invert();
    // legs
    for (const sx of SIDES) {
      const Lg = LEG[sx]; let b, h, k, th;
      hipAt(PP, sx, Hh);
      if (w > 0) { legRun(sx, run, LR); b = LR.b; h = LR.h; k = LR.k; th = LR.th; }
      if (stl > 0) {   // blend the ankle toward standing (feet apart, flat) and solve again
        let ax = sx * 0.098, ay = ANKY, az = 0.0;
        if (w > 0) { const S = L1 * Math.cos(h) + L2 * Math.cos(h - k); hipAt(pelvisAt(run, 1, PPs), sx, Hs);
          ax = lerp(Hs[0] + S * Math.sin(b), ax, stl); ay = lerp(Hs[1] - S * Math.cos(b), ay, stl); az = lerp(Hs[2] + L1 * Math.sin(h) + L2 * Math.sin(h - k), az, stl); th *= w; }
        else th = 0;
        ik(Hh, ax, ay, az, IKo); b = IKo.b; h = IKo.h; k = IKo.k;
      }
      eT.set(-h, 0, b); qT.setFromEuler(eT); Lg.th.quaternion.copy(qPi).multiply(qT);
      Lg.sn.quaternion.setFromAxisAngle(XA, k);
      eT.set(k - h, 0, b); qS.setFromEuler(eT);
      eF.set(th, sx * lerp(0.13, G.TOEOUT, w), 0); qF.setFromEuler(eF); Lg.ft.quaternion.copy(qS).invert().multiply(qF);
    }
    // trunk: lean, shoulders turning against the hips, head kept level and looking ahead
    const tY = w * LX * 0.10 * Math.cos(TAU * (run - 0.03)), rel = tY - PP.yaw;
    spine.rotation.set(0.082 * w, 0.45 * rel, -0.6 * PP.roll);
    chest.rotation.set(0.034 * w, 0.55 * rel, -0.25 * PP.roll + 0.012 * w * Math.sin(TAU * run * 2));
    neck.rotation.set(-0.065 * w, -0.5 * tY, 0.3 * PP.roll); head.rotation.set(-0.06 * w + 0.01, -0.5 * tY, 0.25 * PP.roll);
    // arms: swing from the shoulder against the legs, elbows near 90 degrees, forearms turned a little palm-down
    for (const sx of SIDES) {
      const A = ARM[sx], fwd = (sx === LX ? -1 : 1) * Math.cos(TAU * (run - G.ALAG)) * arms;
      const flex = lerp(0.03, G.AMID + G.AAMP * fwd, w), abd = lerp(0.075, 0.14 + 0.05 * Math.max(0, -fwd), w), ir = lerp(0.0, 0.30 + 0.10 * fwd, w);
      const elb = lerp(0.2, G.EMID + G.EAMP * fwd, w), pron = lerp(0.25, G.PRON, w);
      A.sh.rotation.set(-flex, -sx * ir, sx * abd);
      A.el.rotation.set(-elb, -sx * pron, 0);
      A.hd.rotation.set(-0.08 * w, 0, sx * 0.1 * w);
    }
    for (const b of BONES) b.updateMatrix();
    // the watch frame on each wrist, in the runner's frame
    for (const sx of SIDES) {
      const A = ARM[sx], P = sx === LX ? WLp : WRp, Q = sx === LX ? WLq : WRq;
      chainTo(A.el, mA); mA.decompose(vA, qA, sA);
      P.set(sx * WOFF, -WUP, 0).applyMatrix4(mA); Q.copy(qA).multiply(o.watchY === 'fingers' ? WQF[sx] : WQ[sx]);
    }
    if (stub) { stub.position.copy(WLp); stub.quaternion.copy(WLq); stub.visible = true; }
  }
  const PT = new T.Vector3();
  function point(s, name) {
    if (s) apply(s);
    const side = /L$/.test(name) ? LX : -LX, A = ARM[side], Lg = LEG[side]; let b = null; PT.set(0, 0, 0);
    switch (name.replace(/[LR]$/, '')) {
      case 'heart': b = chest; PT.set(LX * 0.028, 1.315 - 1.265, 0.045); break;
      case 'head': b = head; PT.set(0, 0.075, 0.012); break;
      case 'wrist': return (side === LX ? WLp : WRp).toArray();
      case 'hand': b = A.hd; PT.fromArray(HANDPTS[side]); break;
      case 'elbow': b = A.el; break;
      case 'shoulder': b = A.sh; break;
      case 'knee': b = Lg.sn; break;
      case 'ankle': b = Lg.ft; break;
      case 'hip': b = pelvis; break;
      default: return [0, 0, 0];
    }
    chainTo(b, mA); return PT.applyMatrix4(mA).toArray();
  }
  // debug: the lowest point of each sole (runner frame) -> [yL, zL, yR, zR]
  const SOLE = []; for (let z = ZHEEL; z <= ZTOE + 1e-6; z += 0.005) for (const x of [-0.03, 0, 0.035]) SOLE.push(new T.Vector3(x, soleY(z) - ANKY, z));
  function soles(s) { if (s) apply(s); const out = [];
    for (const sx of [LX, -LX]) { chainTo(LEG[sx].ft, mA); let by = 9, bz = 0; for (const v of SOLE) { vA.copy(v); vA.x *= sx; vA.applyMatrix4(mA); if (vA.y < by) { by = vA.y; bz = vA.z; } } out.push(by, bz); }
    return out; }
  const wristOut = (s, sx) => { if (s) apply(s); const P = sx === LX ? WLp : WRp, Q = sx === LX ? WLq : WRq; return { pos: P.toArray(), quat: [Q.x, Q.y, Q.z, Q.w] }; };
  function makeStub() {   // preview / option only: a box the size of the 46 mm watch, and a band round the wrist
    stub = new T.Group(); g.add(stub);
    stub.add(K.mesh(K.geo.rbox(0.039, 0.046, 0.0097, 0.0045, 4), K.mat.gloss('#22252b', 0.25)));
    stub.add(K.mesh(K.geo.rbox(0.0325, 0.0395, 0.0006, 0.0003, 2), K.mat.flat('#4cd964'), { pos: [0, 0, 0.0049], cast: false }));
    const band = K.mesh(new T.CylinderGeometry(1, 1, 0.022, 48, 1, true), new T.MeshStandardMaterial({ color: '#3c4048', roughness: 0.6, side: T.DoubleSide }));
    band.rotation.z = PI / 2; band.scale.set(0.031, 1, 0.0225); band.position.z = -WOFF; stub.add(band);   // cylinder axis along watch X (the forearm)
    if (o.watchY === 'fingers') { band.rotation.set(0, 0, 0); band.scale.set(0.031, 1, 0.0225); }
  }
  if (o.watchStub) makeStub();

  // ------------------------------------------------------------------ preview cameras, anchors
  const S0 = { run: 0, still: 1, arms: 1 }; apply(S0);
  const anchors = { chest: point(null, 'heart'), heart: point(null, 'heart'), head: point(null, 'head'), wristL: point(null, 'wristL'), wristR: point(null, 'wristR'),
    handL: point(null, 'handL'), handR: point(null, 'handR'), hip: point(null, 'hip'), top: [0, 1.78, 0],
    footL: [LX * 0.098, 0.05, 0.07], footR: [-LX * 0.098, 0.05, 0.07], ground: [0, 0, 0] };
  const wristView = (t, daz, d, el0 = 0) => { const s = { run: t * 1.375, still: 0, arms: 1 }; apply(s); const n = new T.Vector3(0, 0, 1).applyQuaternion(WLq);
    return { az: Math.atan2(n.x, n.z) + daz, el: clamp(Math.asin(clamp(n.y, -1, 1)) * 0.7 + el0, -0.3, 1.0), d, l: WLp.toArray() }; };
  const BODY = [0, 0.93, 0];
  const LOOK = {
    all: [{ az: LX * PI / 2, el: 0.05, d: 5.6, l: BODY }, { az: LX * 0.62, el: 0.10, d: 5.6, l: BODY }, { az: -LX * PI / 2, el: 0.05, d: 5.6, l: BODY },
      wristView(6.5, 0, 0.75), wristView(8.5, LX * 0.5, 0.42, 0.15), { az: LX * 0.55, el: 0.12, d: 5.4, l: BODY }],
    gait: [0, 1, 2, 3, 4, 5].map(() => ({ az: LX * PI / 2, el: 0.03, d: 4.4, l: [0, 0.62, 0.35] })),
    front: [0, 1, 2, 3, 4, 5].map(i => ({ az: i < 3 ? 0 : PI, el: 0.05, d: 5.2, l: BODY })),
    wrist: [wristView(0.5, 0, 0.32), wristView(2.5, LX * 0.6, 0.32, 0.1), wristView(4.5, -LX * 0.5, 0.32), wristView(6.5, 0, 0.18), wristView(8.5, 0, 0.6), { az: LX * 1.2, el: 0.1, d: 0.5, l: anchors.wristL }],
  };
  const handR = (() => { apply({ run: 0, still: 0, arms: 1 }); return point(null, 'handR'); })();
  LOOK.detail = [{ az: 0, el: 0.04, d: 0.8, l: [0, 1.665, 0.01] }, { az: LX * 0.9, el: 0.1, d: 0.8, l: [0, 1.665, 0.01] }, { az: LX * 0.35, el: 0.08, d: 1.7, l: [0, 1.28, 0.05] },
    { az: LX * PI / 2, el: 0.05, d: 1.7, l: [0, 0.74, 0.15] }, { az: -LX * 0.5, el: 0.05, d: 1.7, l: [0, 0.74, 0.1] }, { az: -LX * 0.6, el: 0.15, d: 0.4, l: handR }];
  const at = (r, n) => { apply({ run: r, still: 0, arms: 1 }); return point(null, n); };
  LOOK.joints = [{ az: -LX * PI / 2, el: 0.1, d: 0.55, l: at(0, 'elbowR') }, { az: -LX * 0.3, el: 0.3, d: 0.55, l: at(0, 'elbowR') }, { az: LX * PI / 2, el: 0.1, d: 0.6, l: at(0, 'shoulderL') },
    { az: PI - LX * 0.4, el: 0.05, d: 1.1, l: at(0.3, 'hip') }, { az: LX * PI / 2, el: 0.05, d: 0.8, l: at(0.55, 'kneeL') }, { az: LX * 2.2, el: 0.15, d: 0.8, l: at(0.55, 'kneeL') }];
  const LOOKST = { detail: [{ still: 1 }, { still: 1 }, { run: 0.1 }, { run: 0.83 }, { run: 0.83 }, { run: 0 }], joints: [{ run: 0 }, { run: 0 }, { run: 0 }, { run: 0.3 }, { run: 0.55 }, { run: 0.55 }] };
  apply(S0);
  return {
    group: g, _soles: soles, wristL: s => wristOut(s, LX), wristR: s => wristOut(s, -LX), point, skeleton: skel,
    size: { height: 1.78, hip: HIPY, stride: G.SPD, step: G.SPD / 2, cadence: 165, speed: G.SPD * 1.375, shoulder: 2 * SHX, upperArm: UA, forearm: FA, thigh: L1, shin: L2,
      wrist: { w: 0.058, t: 0.042 }, watch: { w: 0.039, h: 0.046, d: 0.0097 } },
    anchors,
    view: { l: BODY, d: 5.6, close: anchors.wristL, keys: o.keys || LOOK[o.look] || LOOK.all },
    defaults: { run: 0, still: 0, arms: 1 },
    apply,
    demo(s, t) {
      const st = o.states || LOOKST[o.look];
      if (st) { Object.assign(s, st[Math.min(st.length - 1, Math.floor(t / 2))]); }
      else if (o.look === 'gait') { s.run = [0, 0.06, 0.12, 0.18, 0.24, 0.30][Math.min(5, Math.floor(t / 2))] + (o.gait0 || 0); this.group.position.z = G.SPD * (s.run - (o.gait0 || 0)); }
      else { s.run = t * 1.375; s.still = sst((t - 9.4) / 0.8); }
      if (!stub && o.watchStub !== false) makeStub();
    },
  };
});
