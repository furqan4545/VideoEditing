// Hardware-shop props, real size in metres, Y up, origin on the ground under the model, front toward +Z.
//   pegboard   a free-standing white pegboard wall on black steel legs with a tidy tool wall
//              state: sway 0..1 (the tools that hang from one hook swing a little)
//   tray       a grey security-check tray (no state). Option: with = [[name, [x, y, z], rotY], ...] puts jacket / shoes / belt in it (-> .items)
//   jacket     a folded black puffer jacket: two quilted layers, zip, collar   state: fall 0..1
//   shoes      a pair of white chunky sneakers, grey suede overlays            state: fall 0..1
//   belt       a coiled black leather belt, steel buckle                       state: fall 0..1
// fall: 0 = 0.35 m above its resting place, about 0.56 = it lands, then a soft bounce and a rock that dies out, 1 = at rest.
// Preview any of them: tools/preview.sh <name> '' hardware     (fall strip: add the times 2.2,2.9,3.15,3.3,3.6,3.95)
// Preview only: options view = { l, d, close, keys } (camera) and hold = { fall: 0.6 } (fixed state instead of the demo).
(function () {
  const T = THREE, PI = Math.PI, TAU = PI * 2;
  const lerp = (a, b, k) => a + (b - a) * k, clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const sstep = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
  const spow = (x, e) => Math.sign(x) * Math.pow(Math.abs(x), e);
  const bell = (x, c, w) => Math.exp(-((x - c) / w) * ((x - c) / w));
  // a smooth 1D curve through knots [[x, y], ...]
  function curve(kn) {
    const n = kn.length, m = [];
    for (let i = 0; i < n; i++) { const a = kn[Math.max(0, i - 1)], b = kn[Math.min(n - 1, i + 1)]; m.push((b[1] - a[1]) / ((b[0] - a[0]) || 1)); }
    return (x) => {
      if (x <= kn[0][0]) return kn[0][1]; if (x >= kn[n - 1][0]) return kn[n - 1][1];
      let i = 0; while (kn[i + 1][0] < x) i++;
      const h = kn[i + 1][0] - kn[i][0], u = (x - kn[i][0]) / h, u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * kn[i][1] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * kn[i + 1][1] + (u3 - u2) * h * m[i + 1];
    };
  }
  const bez = (p0, p1, p2, n) => { const o = []; for (let i = 0; i <= n; i++) { const k = i / n, a = (1 - k) * (1 - k), b = 2 * k * (1 - k), c = k * k; o.push([a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1]]); } return o; };
  const circ = (cx, cy, r, n = 28) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };
  const lathe = (pts, seg = 40) => new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), seg);   // pts [[r, y], ...] with y rising
  const ext = (shape, depth, bevel = 0, cs = 16) => new T.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: cs });
  // a grid surface: f(u, v, i, j) -> [x, y, z] or [x, y, z, s, t]
  function gridGeo(nu, nv, f, { closeV = false } = {}) {
    const pos = [], idx = [], uvs = [], cols = closeV ? nv : nv + 1;
    for (let i = 0; i <= nu; i++) for (let j = 0; j < cols; j++) { const p = f(i / nu, j / nv, i, j); pos.push(p[0], p[1], p[2]); if (p.length > 4) uvs.push(p[3], p[4]); else uvs.push(i / nu, j / nv); }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * cols + j, b = i * cols + (j + 1) % cols, c = (i + 1) * cols + j, d = (i + 1) * cols + (j + 1) % cols; idx.push(a, b, c, b, d, c); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  // make the triangles of a (nearly) closed mesh face outward
  function orient(g) {
    const p = g.attributes.position, ix = g.index.array, c = new T.Vector3(), a = new T.Vector3(), b = new T.Vector3(), d = new T.Vector3();
    for (let i = 0; i < p.count; i++) c.add(a.fromBufferAttribute(p, i)); c.multiplyScalar(1 / p.count);
    let vol = 0; for (let i = 0; i < ix.length; i += 3) { a.fromBufferAttribute(p, ix[i]).sub(c); b.fromBufferAttribute(p, ix[i + 1]).sub(c); d.fromBufferAttribute(p, ix[i + 2]).sub(c); vol += a.dot(b.cross(d)); }
    if (vol < 0) { for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } g.index.needsUpdate = true; }
    g.computeVertexNormals(); return g;
  }
  // a cap: triangles from a centre point to a closed ring, facing up or down
  function fanGeo(c, ring, up) {
    const pos = [c[0], c[1], c[2]], idx = [], n = ring.length; for (const p of ring) pos.push(p[0], p[1], p[2]);
    const a = ring[0], b = ring[1], cr = (a[2] - c[2]) * (b[0] - c[0]) - (a[0] - c[0]) * (b[2] - c[2]), fwd = (cr > 0) === up;
    for (let i = 0; i < n; i++) { const j = (i + 1) % n; if (fwd) idx.push(0, 1 + i, 1 + j); else idx.push(0, 1 + j, 1 + i); }
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }
  // ---- the drop: free fall, a soft bounce, a smaller one; the tilt rocks and dies out. Exactly at rest when f = 1.
  function fallAt(f, P) {
    const h = P.h ?? 0.35, hit = P.hit ?? 0.56, b1 = P.b1 ?? 0.02, b2 = P.b2 ?? 0.004;
    f = clamp(f); const m1 = hit + (1 - hit) * 0.5, m2 = hit + (1 - hit) * 0.8; let y = 0;
    if (f < hit) { const u = f / hit; y = h * (1 - u * u); }
    else if (f < m1) { const u = (f - hit) / (m1 - hit); y = b1 * 4 * u * (1 - u); }
    else if (f < m2) { const u = (f - m1) / (m2 - m1); y = b2 * 4 * u * (1 - u); }
    const pulse = x => x <= 0 ? 0 : x * Math.exp(1 - x);
    const sq = (pulse((f - hit) / 0.022) + 0.3 * pulse((f - m1) / 0.02)) * (1 - sstep(0.86, 1, f));
    const u = clamp((f - hit) / (1 - hit));
    const a = f < hit ? 0.5 + 0.5 * (f / hit) : (1 - u) * (1 - u) * Math.exp(-2.2 * u) * Math.cos(u * TAU * 1.5);
    return { y, sq, a };
  }
  function drop(body, f, P) {
    const d = fallAt(f, P), rx = d.a * (P.rx || 0), rz = d.a * (P.rz || 0), q = d.sq * (P.sq || 0);
    body.rotation.set(rx, d.a * (P.ry || 0), rz);
    body.position.y = d.y + Math.abs(Math.sin(rz)) * (P.hx || 0) + Math.abs(Math.sin(rx)) * (P.hz || 0);   // the low edge stays on the ground while it rocks
    body.scale.set(1 + q * 0.45, 1 - q, 1 + q * 0.45);
  }
  // preview only: KIT.make(name, { view: { l, d, close, keys } }) overrides where the preview camera looks
  const VW = (o, v) => Object.assign(v, (o && o.view) || {});
  const fallDemo = (s, t) => { const k = Math.floor(t / 2); s.fall = k === 1 ? clamp((t - 2) / 2) : k === 2 ? clamp(0.45 + (t - 4) * 0.3) : k === 3 ? clamp(0.6 + (t - 6) * 0.3) : 1; };

  // =================================================================================================== pegboard
  KIT.asset('pegboard', (K, o) => {
    const g = new T.Group(), R = OM.rng(1501);
    const W = 1.5, H = 1.1, Y0 = 0.7, YC = Y0 + H / 2, FR = 0.014, PT = 0.012, ZF = PT / 2, P = 0.025, NX = 58, NY = 42, WR = 0.0022;
    const hx = i => (i - (NX - 1) / 2) * P, hy = j => YC + (j - (NY - 1) / 2) * P;
    const col = x => hx(Math.round(x / P + (NX - 1) / 2)), row = y => hy(Math.round((y - YC) / P + (NY - 1) / 2));
    const steel = K.mat.brushed(), chrome = K.mat.metal(K.col.steel, 0.22), gun = K.mat.metal('#8e929b', 0.36), wire = K.mat.metal('#d6d8dd', 0.3);
    const rub = K.mat.rubber('#17181b'), blk = K.mat.plastic('#1c1d20', 0.5), graph = K.mat.plastic(K.col.graphite, 0.42);
    // satin chrome (the polished faces of forged tools) and the darker shot-blasted steel left in their recesses
    const satin = new T.MeshStandardMaterial({ color: new T.Color('#e4e6ea'), metalness: 0.72, roughness: 0.36, envMapIntensity: 1.3 }), cast = new T.MeshStandardMaterial({ color: new T.Color('#a9acb3'), metalness: 0.7, roughness: 0.62, envMapIntensity: 1.0 });
    satin.bumpMap = steel.bumpMap; satin.bumpScale = 0.25;
    const streak = (() => { const sc = document.createElement('canvas'); sc.width = 512; sc.height = 512; const x = sc.getContext('2d'), r = OM.rng(61); x.fillStyle = '#d9dbe0'; x.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 1500; i++) { const y = r() * 512, l = 60 + r() * 452, x0 = r() * 512 - 60; x.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.05 + r() * 0.16})` : `rgba(40,44,54,${0.04 + r() * 0.13})`; x.lineWidth = 0.6 + r() * 1.4; x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + l, y + (r() - 0.5) * 1.5); x.stroke(); }
      return sc; })();
    const plate = (ru, rv, rough = 0.3, ou = 0) => { const t = K.canvasTex(streak); t.repeat.set(ru, rv); t.offset.x = ou; return new T.MeshStandardMaterial({ color: new T.Color('#eceef1'), map: t, metalness: 0.78, roughness: rough, envMapIntensity: 1.45 }); };

    // ---- the panel: painted white hardboard, a hole every 25 mm (printed into the face, with a lit lower lip)
    const PW = W - 2 * FR + 0.008, PH = H - 2 * FR + 0.008, PX = 1800, cv = document.createElement('canvas'); cv.width = Math.round(PW * PX); cv.height = Math.round(PH * PX);
    const c = cv.getContext('2d'); c.fillStyle = '#faf9f5'; c.fillRect(0, 0, cv.width, cv.height);
    const hr = 0.0027 * PX;
    for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) {
      const x = (hx(i) + PW / 2) * PX, y = (PH / 2 - (hy(j) - YC)) * PX, gr = c.createLinearGradient(0, y - hr, 0, y + hr);
      gr.addColorStop(0, '#2a2b2f'); gr.addColorStop(0.55, '#46484d'); gr.addColorStop(1, '#7f8186');
      c.fillStyle = gr; c.beginPath(); c.arc(x, y, hr, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1.1; c.beginPath(); c.arc(x, y + 0.5, hr + 0.7, 0.15 * PI, 0.85 * PI); c.stroke();
      c.strokeStyle = 'rgba(70,66,60,0.22)'; c.beginPath(); c.arc(x, y - 0.5, hr + 0.7, 1.15 * PI, 1.85 * PI); c.stroke();
    }
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    const face = new T.MeshStandardMaterial({ map: tex, roughness: 0.74, emissive: new T.Color('#ffffff'), emissiveMap: tex, emissiveIntensity: 0.07 }), edge = K.mat.clay('#dcdad4', 0.8);
    const panel = new T.Mesh(new T.BoxGeometry(PW, PH, PT), [edge, edge, edge, edge, face, edge]); panel.position.set(0, YC, 0); panel.castShadow = panel.receiveShadow = true; g.add(panel);
    // ---- slim graphite frame, proud of the face
    const fg = K.geo.extrude(K.geo.rrect(W - 0.003, H - 0.003, 0.009), 0.03, { bevel: 0.0015, holes: [K.geo.rrect(W - 2 * FR, H - 2 * FR, 0.003)] }); fg.translate(0, YC, -0.019);
    g.add(K.mesh(fg, graph));
    // ---- two black steel legs with feet, a stretcher between them
    const LX = 0.6, LZ = -0.0345;
    for (const sx of [-1, 1]) {
      g.add(K.mesh(K.geo.rbox(0.04, 1.742, 0.028, 0.005), blk, { pos: [sx * LX, 0.028 + 0.871, LZ] }));
      g.add(K.mesh(K.geo.rbox(0.05, 0.03, 0.54, 0.008), blk, { pos: [sx * LX, 0.023, LZ] }));
      g.add(K.mesh(K.geo.rbox(0.064, 0.005, 0.088, 0.002), blk, { pos: [sx * LX, 0.0395, LZ] }));
      for (const sz of [-1, 1]) {
        g.add(K.mesh(K.geo.cyl(0.021, 0.008, 28), rub, { pos: [sx * LX, 0.004, LZ + sz * 0.235] }));
        g.add(K.mesh(K.geo.cyl(0.0052, 0.004, 6), wire, { pos: [sx * LX, 0.044, LZ + sz * 0.032] }));
      }
    }
    g.add(K.mesh(K.geo.rbox(2 * LX - 0.04, 0.03, 0.02, 0.004), blk, { pos: [0, 0.36, LZ] }));

    // ---- hooks (zinc wire, pushed into a hole)
    const hookGeo = K.geo.tube([[0, 0, -0.006], [0, 0, 0.012], [0, -0.0006, 0.036], [0, 0.0016, 0.046], [0, 0.009, 0.0508], [0, 0.015, 0.052]], WR, { seg: 28, rad: 10 });
    const tipGeo = new T.SphereGeometry(WR, 10, 8), collarGeo = K.geo.cyl(0.0048, 0.0014, 20); collarGeo.rotateX(PI / 2);
    const addHook = (x, y) => { const h = new T.Group(); h.add(K.mesh(hookGeo, wire), K.mesh(tipGeo, wire, { pos: [0, 0.015, 0.052] }), K.mesh(collarGeo, wire, { pos: [0, 0, 0.0007] })); h.position.set(x, y, ZF); g.add(h); };
    const ringGeo = new T.TorusGeometry(0.0086, 0.0018, 10, 32); ringGeo.rotateX(PI / 2);
    const armGeo = K.geo.cyl(0.0018, 0.0156, 10); armGeo.rotateX(PI / 2);
    const addRing = (x, y) => { const h = new T.Group(); h.add(K.mesh(ringGeo, wire, { pos: [0, 0, 0.020] }), K.mesh(armGeo, wire, { pos: [0, 0, 0.0038] }), K.mesh(collarGeo, wire, { pos: [0, 0, 0.0007] })); h.position.set(x, y, ZF); g.add(h); };

    // ---- claw hammer (origin: centre of the head's eye, handle down)
    function hammer() {
      const h = new T.Group();
      const poll = lathe([[0.0118, 0.010], [0.0104, 0.019], [0.0093, 0.027], [0.0100, 0.033], [0.0136, 0.0395], [0.0148, 0.043], [0.0148, 0.0525], [0.0134, 0.0548], [0, 0.0548]], 36); poll.rotateZ(-PI / 2);
      h.add(K.mesh(poll, steel), K.mesh(K.geo.rbox(0.036, 0.040, 0.027, 0.007), steel));
      const top = bez([-0.010, 0.0185], [-0.046, 0.031], [-0.086, -0.022], 16), bot = bez([-0.0848, -0.0246], [-0.050, 0.003], [-0.010, -0.0165], 16);
      const cg = K.geo.extrude([...top, ...bot], 0.0100, { bevel: 0.0012 });
      for (const z of [-0.0128, 0.0028]) h.add(K.mesh(cg, steel, { pos: [0, 0, z] }));
      h.add(K.mesh(K.geo.extrude([...top.slice(0, 8), ...bot.slice(-8)], 0.008, { bevel: 0.001 }), steel, { pos: [0, 0, -0.004] }));
      h.add(K.mesh(K.geo.cyl(0.0080, 0.118, 24, 0.0072), chrome, { pos: [0, -0.077, 0], scale: [1, 1, 0.8] }));
      h.add(K.mesh(lathe([[0, -0.312], [0.009, -0.3115], [0.0155, -0.306], [0.0172, -0.296], [0.0166, -0.280], [0.0150, -0.245], [0.0138, -0.205], [0.0132, -0.165], [0.0137, -0.140], [0.0129, -0.128], [0.0092, -0.121], [0.0078, -0.119]], 36), rub, { scale: [1, 1, 0.82] }));
      for (let i = 0; i < 5; i++) h.add(K.mesh(new T.TorusGeometry(0.0143 + i * 0.00042, 0.0007, 6, 36), blk, { pos: [0, -0.222 - i * 0.012, 0], rot: [PI / 2, 0, 0], scale: [1, 0.82, 1] }));
      return h;
    }
    // ---- hand saw (origin: middle of the handle's height; blade along +X, teeth down)
    function saw() {
      const s = new T.Group();
      const hp = [[0.036, 0.052], [0.008, 0.061], [-0.036, 0.063], [-0.076, 0.058], [-0.096, 0.044], [-0.100, 0.014], [-0.096, -0.026], [-0.089, -0.052], [-0.078, -0.064], [-0.054, -0.066], [-0.026, -0.060], [0.006, -0.057], [0.026, -0.050], [0.050, -0.018], [0.053, 0.018]];
      const hc = new T.CatmullRomCurve3(hp.map(p => new T.Vector3(p[0], p[1], 0)), true, 'catmullrom', 0.5).getPoints(150).map(v => [v.x, v.y]); hc.pop();
      const hole = []; for (let i = 0; i < 48; i++) { const a = i / 48 * TAU, px = 0.0165 * spow(Math.cos(a), 0.7), py = 0.040 * spow(Math.sin(a), 0.7); hole.push([-0.060 + px * 0.9945 + py * 0.1045, -0.002 - px * 0.1045 + py * 0.9945]); }
      const hg = K.geo.extrude(hc, 0.020, { bevel: 0.003, holes: [hole] }); hg.translate(0, 0, -0.010); s.add(K.mesh(hg, rub));
      const bl = [[-0.02, 0.056], [0.452, -0.008], [0.461, -0.013], [0.4645, -0.024], [0.4635, -0.050], [0.459, -0.058]];
      for (let x = 0.456; x > 0.034; x -= 0.004) bl.push([x - 0.0012, -0.0613], [x - 0.004, -0.058]);
      bl.push([-0.02, -0.058]);
      const bg = K.geo.extrude(bl, 0.0016, { holes: [circ(0.4442, -0.0207, 0.0055, 24)] }); bg.translate(0, 0, -0.0008); s.add(K.mesh(bg, plate(1.5, 22, 0.27, 0.1)));
      for (const p of [[0.030, 0.026], [0.034, -0.014], [0.008, -0.040]]) { const sc = K.geo.cyl(0.0052, 0.0272, 24); sc.rotateX(PI / 2); s.add(K.mesh(sc, gun, { pos: [p[0], p[1], 0] })); }
      return s;
    }
    // ---- adjustable wrench (origin: the hang hole; the head hangs down)
    function wrench() {
      const w = new T.Group(), V = p => new T.Vector2(p[0], p[1]), uv = (u, v) => [u * 0.940 + v * 0.342, -u * 0.342 + v * 0.940], E = -0.222;
      const s = new T.Shape(); s.moveTo(0.014, E);
      s.splineThru([[0.0120, -0.19], [0.0128, -0.11], [0.0152, -0.052], uv(0.031, -0.017), uv(0.0385, -0.004)].map(V));
      s.lineTo(...uv(0.0368, 0.0100)); s.lineTo(...uv(-0.004, 0.0100)); s.lineTo(...uv(-0.004, 0.049));
      s.splineThru([uv(-0.010, 0.0555), uv(-0.021, 0.052), uv(-0.031, 0.033), uv(-0.0345, 0.006), uv(-0.030, -0.018), [-0.0152, -0.052], [-0.0128, -0.11], [-0.0120, -0.19], [-0.014, E]].map(V));
      s.absarc(0, E, 0.014, PI, TAU, false);
      const hole = new T.Path(); hole.absarc(0, E, 0.0058, 0, TAU, true); s.holes.push(hole);
      const wq = [uv(0.0125, -0.0115), uv(0.0315, -0.0115), uv(0.0315, 0.0035), uv(0.0125, 0.0035)], win = new T.Path(); win.moveTo(...wq[0]); for (let i = 1; i < 4; i++) win.lineTo(...wq[i]); win.closePath(); s.holes.push(win);
      const body = ext(s, 0.0054, 0.0008, 20); body.translate(0, 0, -0.0027); w.add(K.mesh(body, cast));
      // the raised rim round a recessed panel on both faces of the handle (a drop-forged I-beam)
      const s2 = s.clone(), pan = new T.Path(); K.geo.rrect(0.0132, 0.122, 0.0066).forEach((q, i) => i ? pan.lineTo(q[0], q[1] - 0.131) : pan.moveTo(q[0], q[1] - 0.131)); pan.closePath(); s2.holes.push(pan);
      for (const z of [0.0031, -0.0031 - 0.0016]) { const rim = ext(s2, 0.0016, 0.0005, 20); rim.translate(0, 0, z); w.add(K.mesh(rim, satin)); }
      const jaw = K.geo.extrude([uv(0.0135, 0.0105), uv(0.0355, 0.0105), uv(0.0325, 0.032), uv(0.027, 0.050), uv(0.019, 0.0545), uv(0.0135, 0.049)], 0.0080, { bevel: 0.001 }); jaw.translate(0, 0, -0.0040); w.add(K.mesh(jaw, gun));
      const wc = uv(0.022, -0.004), worm = new T.Group(); worm.position.set(wc[0], wc[1], 0); worm.rotation.z = -(PI / 2 + 0.349);
      worm.add(K.mesh(K.geo.cyl(0.0056, 0.0178, 20), gun)); for (let i = -2; i <= 2; i++) worm.add(K.mesh(K.geo.cyl(0.0068, 0.0015, 20), gun, { pos: [0, i * 0.0034, 0] }));
      w.add(worm); w.position.set(0, -E, 0);
      const mid = new T.Group(); mid.add(w); mid.rotation.z = PI; return mid;
    }
    // ---- combination pliers (origin: the pivot; jaws up)
    function pliers() {
      const p = new T.Group();
      const jg = K.geo.extrude([[0.0003, -0.006], [0.0003, 0.0612], [0.0050, 0.0612], [0.0062, 0.0580], [0.0096, 0.0310], [0.0128, 0.0205], [0.0146, 0.0080], [0.0140, -0.0060], [0.0080, -0.0135]], 0.0074, { bevel: 0.0008 }); jg.translate(0, 0, -0.0037);
      const tang = K.geo.tube([[-0.003, -0.006, 0], [-0.0085, -0.024, 0], [-0.0155, -0.052, 0]], 0.0046, { seg: 16, rad: 10 });
      const grip = K.geo.tube([[-0.0088, -0.025, 0], [-0.0165, -0.055, 0], [-0.0215, -0.090, 0], [-0.0226, -0.118, 0], [-0.0206, -0.134, 0]], 0.0064, { seg: 40, rad: 12 });
      for (const sx of [1, -1]) {
        const half = new T.Group(); half.scale.x = sx;
        half.add(K.mesh(jg, steel), K.mesh(tang, steel, { scale: [1, 1, 0.8] }), K.mesh(grip, rub, { scale: [1, 1, 0.8] }));
        half.add(K.mesh(new T.SphereGeometry(0.0064, 14, 10), rub, { pos: [-0.0206, -0.134, 0], scale: [1, 1, 0.8] }), K.mesh(new T.SphereGeometry(0.0064, 14, 10), rub, { pos: [-0.0088, -0.025, 0], scale: [1, 1, 0.8] }));
        p.add(half);
      }
      const pv = K.geo.cyl(0.0128, 0.0102, 32); pv.rotateX(PI / 2); p.add(K.mesh(pv, steel));
      const bt = K.geo.cyl(0.0046, 0.0122, 24); bt.rotateX(PI / 2); p.add(K.mesh(bt, gun));
      for (let i = 0; i < 7; i++) p.add(K.mesh(K.geo.box(0.0052, 0.0005, 0.0094), gun, { pos: [0, 0.0345 + i * 0.0036, 0] }));   // the jaw's grip teeth
      return p;
    }
    // ---- screwdriver (origin: where the handle sits on its ring; handle up)
    function driver(HL, hr, SL, sr, flat) {
      const d = new T.Group(), k = HL / 0.1105, q = hr / 0.0158;
      const hg = lathe([[sr + 0.0008, 0], [0.0088 * q, 0.0015], [0.0096 * q, 0.010 * k], [0.0080 * q, 0.020 * k], [0.0098 * q, 0.030 * k], [0.0140 * q, 0.046 * k], [0.0158 * q, 0.066 * k], [0.0156 * q, 0.086 * k], [0.0140 * q, 0.099 * k], [0.0100 * q, 0.107 * k], [0.0045 * q, 0.1100 * k], [0, 0.1105 * k]], 48), hp = hg.attributes.position;
      for (let i = 0; i < hp.count; i++) { const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i), m = sstep(0.034 * k, 0.05 * k, y) * (1 - sstep(0.084 * k, 0.1 * k, y)), f = 1 - 0.12 * m * Math.pow(0.5 + 0.5 * Math.cos(6 * Math.atan2(z, x)), 3); hp.setXYZ(i, x * f, y, z * f); }
      hg.computeVertexNormals(); d.add(K.mesh(hg, rub));
      d.add(K.mesh(K.geo.cyl(sr + 0.0022, 0.007, 20), wire, { pos: [0, -0.0032, 0] }));
      d.add(K.mesh(K.geo.cyl(sr, SL - 0.02, 16), chrome, { pos: [0, -(SL - 0.02) / 2, 0] }));
      if (flat) d.add(K.mesh(gridGeo(6, 16, (u, v) => { const a = v * TAU; return [lerp(sr, sr * 1.45, u) * Math.cos(a), -(SL - 0.02) - u * 0.02, lerp(sr, 0.0005, Math.pow(u, 0.7)) * Math.sin(a)]; }, { closeV: true }), chrome));
      else d.add(K.mesh(K.geo.cyl(0.0005, 0.02, 16, sr), chrome, { pos: [0, -(SL - 0.02) - 0.01, 0] }));
      return d;
    }
    // ---- tape measure (origin: centre of the case)
    function tape() {
      const t = new T.Group(), s = new T.Shape(), a = 0.034, b = 0.031;
      s.moveTo(-a + 0.008, -b); s.lineTo(a - 0.005, -b); s.quadraticCurveTo(a, -b, a, -b + 0.005); s.lineTo(a, b - 0.014); s.quadraticCurveTo(a, b, a - 0.014, b); s.lineTo(-0.006, b); s.quadraticCurveTo(-a, b, -a, 0.003); s.lineTo(-a, -b + 0.008); s.quadraticCurveTo(-a, -b, -a + 0.008, -b);
      const cg = ext(s, 0.028, 0.004, 14); cg.translate(0, 0, -0.014); cg.scale(0.89, 0.875, 1); t.add(K.mesh(cg, rub));
      const dg = K.geo.cyl(0.0215, 0.0014, 48); dg.rotateX(PI / 2); t.add(K.mesh(dg, K.mat.plastic('#cfd0d3', 0.45), { pos: [-0.002, -0.001, 0.0182] }));
      const lab = document.createElement('canvas'); lab.width = lab.height = 256; const x = lab.getContext('2d'); x.fillStyle = '#e9e8e4'; x.fillRect(0, 0, 256, 256); x.strokeStyle = '#9a9ca2'; x.lineWidth = 3; x.beginPath(); x.arc(128, 128, 112, 0, 7); x.stroke();
      x.fillStyle = '#26282c'; x.textAlign = 'center'; x.font = `500 74px ${K.FONT}`; x.fillText('5 m', 128, 138); x.font = `400 30px ${K.FONT}`; x.fillStyle = '#6f727a'; x.fillText('16 ft', 128, 184);
      const lt = new T.CanvasTexture(lab); lt.colorSpace = T.SRGBColorSpace; lt.anisotropy = 8;
      const disc = new T.Mesh(new T.CircleGeometry(0.0172, 48), new T.MeshStandardMaterial({ map: lt, roughness: 0.6 })); disc.position.set(-0.002, -0.001, 0.0191); disc.receiveShadow = true; t.add(disc);
      t.add(K.mesh(K.geo.rbox(0.013, 0.006, 0.015, 0.002), K.mat.plastic('#8c8f96', 0.5), { pos: [0.010, 0.0285, 0] }));              // the lock
      t.add(K.mesh(K.geo.rbox(0.007, 0.0009, 0.019, 0.0003), K.mat.plastic('#e4e2dc', 0.5), { pos: [0.0325, -0.0235, 0] }));          // the end of the blade
      t.add(K.mesh(K.geo.rbox(0.0014, 0.011, 0.021, 0.0005), wire, { pos: [0.0362, -0.0235 - 0.0046, 0] }));                           // its steel hook
      return t;
    }
    // ---- spirit level (origin: centre; 0.6 m long)
    function level() {
      const l = new T.Group(), LL = 0.6, LH = 0.052, LD = 0.022, glass = K.mat.glass(0.42, '#e3e9e5'), bub = K.mat.plastic('#ffffff', 0.3);
      const bg = K.geo.extrude(K.geo.rrect(LL - 0.002, LH - 0.002, 0.003), LD, { bevel: 0.001, holes: [K.geo.rrect(0.066, 0.022, 0.006), circ(-0.215, 0, 0.0155), circ(0.215, 0, 0.0155)] }); bg.translate(0, 0, -LD / 2);
      l.add(K.mesh(bg, plate(1, 40, 0.36, 0.5)));
      for (const sx of [-1, 1]) l.add(K.mesh(K.geo.rbox(0.017, 0.0565, 0.0268, 0.004), rub, { pos: [sx * (LL / 2 - 0.003), 0, 0] }));
      const vial = (x, vert, len, r) => {
        const v = new T.Group(); v.position.set(x, 0, 0); if (!vert) v.rotation.z = PI / 2;
        v.add(K.mesh(K.geo.cyl(r, len, 20), glass, { cast: false })); v.children[0].renderOrder = 3;
        v.add(K.mesh(new T.SphereGeometry(r * 0.55, 14, 10), bub, { pos: vert ? [0, len * 0.5 - r * 1.1, 0] : [-r * 0.42, 0, 0], scale: vert ? [1, 1.4, 1] : [1, 1.9, 1], cast: false }));
        for (const sy of [-1, 1]) v.add(K.mesh(new T.TorusGeometry(r + 0.0002, 0.00045, 6, 28), blk, { pos: [0, sy * (vert ? len * 0.2 : r * 1.15), 0], rot: [PI / 2, 0, 0], cast: false }));
        for (const sy of [-1, 1]) v.add(K.mesh(K.geo.rbox(r * 2.5, 0.005, 0.016, 0.0015), blk, { pos: [0, sy * (len / 2 + 0.0015), 0] }));
        l.add(v);
      };
      vial(0, false, 0.052, 0.0072); vial(-0.215, true, 0.022, 0.0058); vial(0.215, true, 0.022, 0.0058);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) l.add(K.mesh(new T.TorusGeometry(0.0163, 0.0013, 8, 40), blk, { pos: [sx * 0.215, 0, sz * (LD / 2 + 0.0008)] }));
      for (const sz of [-1, 1]) { const rg = K.geo.extrude(K.geo.rrect(0.072, 0.028, 0.008), 0.0012, { holes: [K.geo.rrect(0.066, 0.022, 0.006)] }); l.add(K.mesh(rg, blk, { pos: [0, 0, sz > 0 ? LD / 2 + 0.0006 : -LD / 2 - 0.0018] })); }
      return l;
    }

    // ---- the wall: a row of hanging tools with their tops in line, the two long tools below
    const tools = new T.Group(); g.add(tools);
    const hang = (obj, x, y, z, dy = 0, sc = 1) => { const p = new T.Group(), q = new T.Group(); p.position.set(x, y, ZF + z); q.position.y = dy; q.scale.setScalar(sc); q.add(obj); p.add(q); tools.add(p); return p; };
    const A = {};
    // hammer: the head rests on two hooks
    let y = row(1.5875); addHook(col(-0.5625), y); addHook(col(-0.5375), y); hang(hammer(), -0.55, y + WR + 0.022, 0.019, 0, 1.1); A.hammer = [-0.55, y, ZF + 0.02];
    // big flat screwdriver in a ring
    y = row(1.5125); addRing(col(-0.3375), y); const pDA = hang(driver(0.118, 0.0165, 0.180, 0.0036, true), col(-0.3375), y, 0.020, 0.002); A.driver = [col(-0.3375), y, ZF + 0.02];
    // wrench on one hook through its hole
    y = row(1.6125); addHook(col(-0.1125), y); const pW = hang(wrench(), col(-0.1125), y, 0.012, -0.0036); A.wrench = [col(-0.1125), y - 0.12, ZF + 0.012];
    // small cross-head screwdriver
    y = row(1.5375); addRing(col(0.1125), y); const pDB = hang(driver(0.100, 0.0142, 0.140, 0.0028, false), col(0.1125), y, 0.020, 0.002);
    // pliers astride one hook
    y = row(1.5375); addHook(col(0.3375), y); const pP = hang(pliers(), col(0.3375), y, 0.012, 0.026, 1.15); A.pliers = [col(0.3375), y, ZF + 0.012];
    // tape measure on two pegs
    y = row(1.5625); addHook(col(0.55), y); addHook(col(0.575), y); hang(tape(), 0.5625, y + WR + 0.0305, 0.0235, 0, 1.12); A.tape = [0.5625, y + 0.03, ZF + 0.04];
    // spirit level on two pegs
    y = row(0.9375); addHook(col(-0.5625), y); addHook(col(-0.1375), y); hang(level(), -0.35, y + WR + 0.026, 0.0155); A.level = [-0.35, y + 0.028, ZF + 0.027];
    // hand saw: one hook through the grip, one through the hole at the toe
    y = row(1.0125); addHook(col(0.5875), y); addHook(col(0.0875), y - 2 * P); const sw = saw(); sw.rotation.y = PI; hang(sw, col(0.5875) - 0.0558, y + WR - 0.0348, 0.017); A.saw = [0.33, y - 0.03, ZF + 0.017];

    const swing = [[pW, 0.030, 1.05, 0.4], [pP, 0.036, 1.35, 2.1], [pDA, 0.022, 1.2, 4.0], [pDB, 0.028, 1.5, 5.3]];
    return {
      group: g, size: { W, H, bottom: Y0, top: Y0 + H, depth: 0.54, pitch: P },
      anchors: Object.assign({ centre: [0, YC, ZF], top: [0, Y0 + H, 0], foot: [0, 0, 0], left: [-W / 2, YC, 0], right: [W / 2, YC, 0], row1: [0, 1.53, ZF + 0.02], row2: [0, 0.97, ZF + 0.02] }, A),
      view: VW(o, { l: [0, 0.95, 0], d: 7.4, close: [-0.33, 1.5, 0.02] }),
      defaults: { sway: 0 },
      apply(s, t) { for (const [p, amp, f, ph] of swing) p.rotation.z = s.sway * amp * Math.sin(TAU * f * t + ph); },
      demo(s, t) { if (o && o.hold) return void Object.assign(s, o.hold); s.sway = t > 4 && t < 8 ? 1 : 0; },
    };
  });

  // =================================================================================================== tray
  KIT.asset('tray', (K, o) => {
    const g = new T.Group(), L = 0.52, D = 0.36, H = 0.09, RC = 0.052, FLOOR = 0.0036, RIB = 0.0022;
    const grey = K.mat.plastic('#adb0b5', 0.5);
    // wall section, bottom outside -> over the rolled rim -> down the inside: [inset from the rim's outer edge, height]
    const prof = [[0.026, 0], [0.0228, 0.0022], [0.0218, 0.006], [0.0086, 0.0725], [0.0050, 0.0750], [0.0012, 0.0782], [0.0000, 0.0830], [0.0012, 0.0874], [0.0050, 0.0900], [0.0090, 0.0880], [0.0110, 0.0835], [0.0120, 0.0770], [0.0258, 0.0090], [0.0290, 0.0050], [0.0360, FLOOR]];
    const NC = 14, ring = (off, y) => { const a = L / 2 - off, b = D / 2 - off, r = Math.max(RC - off, 0.008), out = [], cs = [[a - r, b - r, 0], [-a + r, b - r, 1], [-a + r, -b + r, 2], [a - r, -b + r, 3]];
      for (const [cx, cz, q] of cs) for (let i = 0; i <= NC; i++) { const an = (q + i / NC) * PI / 2; out.push([cx + Math.cos(an) * r, y, cz + Math.sin(an) * r]); } return out; };
    const rings = prof.map(p => ring(p[0], p[1])), n = rings[0].length;
    g.add(K.mesh(orient(gridGeo(prof.length - 1, n, (u, v, i, j) => rings[i][j], { closeV: true })), grey));
    const last = rings[rings.length - 1], first = rings[0];
    // the floor: the same plastic, lightly scuffed where bags and boxes have slid across it
    const fl = fanGeo([0, FLOOR, 0], last, true), fp = fl.attributes.position, fuv = []; for (let i = 0; i < fp.count; i++) fuv.push(fp.getX(i) / L + 0.5, fp.getZ(i) / D + 0.5); fl.setAttribute('uv', new T.Float32BufferAttribute(fuv, 2));
    const scv = document.createElement('canvas'); scv.width = 1040; scv.height = 720; const sc = scv.getContext('2d'), RS = OM.rng(77); sc.fillStyle = '#f1f1f1'; sc.fillRect(0, 0, 1040, 720);
    for (let i = 0; i < 520; i++) { const x = 90 + RS() * 860, y = 80 + RS() * 560, a = (RS() - 0.5) * 0.9 + (RS() < 0.25 ? PI / 2 : 0), l = 8 + RS() * RS() * 150; sc.strokeStyle = RS() < 0.7 ? `rgba(255,255,255,${0.10 + RS() * 0.30})` : `rgba(120,122,128,${0.05 + RS() * 0.12})`; sc.lineWidth = 0.6 + RS() * 1.3;
      sc.beginPath(); sc.moveTo(x, y); sc.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (RS() - 0.5) * 6, y + Math.sin(a) * l * 0.5 + (RS() - 0.5) * 6, x + Math.cos(a) * l, y + Math.sin(a) * l); sc.stroke(); }
    const floorMat = grey.clone(); floorMat.map = K.canvasTex(scv); floorMat.map.wrapS = floorMat.map.wrapT = T.ClampToEdgeWrapping; floorMat.roughness = 0.58;
    g.add(K.mesh(fl, floorMat, { cast: false }));
    g.add(K.mesh(fanGeo([0, 0, 0], first, false), grey));
    // low ribs along the floor
    for (let i = -3; i <= 3; i++) g.add(K.mesh(K.geo.rbox(0.392, 0.0044, 0.011, 0.0021), grey, { pos: [0, FLOOR, i * 0.036] }));
    // a small paper sticker on the front wall
    const st = K.canvasPlane(0.062, 0.026, 5000, (c, W, Hh) => { c.fillStyle = '#f3f1ec'; c.fillRect(0, 0, W, Hh); const r = OM.rng(24); let x = W * 0.07; c.fillStyle = '#1b1c1f';
      while (x < W * 0.52) { const w = (1 + Math.floor(r() * 3)) * W * 0.008; c.fillRect(x, Hh * 0.2, w, Hh * 0.6); x += w + (1 + Math.floor(r() * 3)) * W * 0.008; }
      c.font = `500 ${Math.round(Hh * 0.56)}px ${K.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('24', W * 0.77, Hh * 0.53); }, { lit: true });
    st.position.set(0.11, 0.040, D / 2 - 0.0150 + 0.0005); st.rotation.x = 0.196; st.receiveShadow = true; g.add(st);
    // optional contents, e.g. KIT.make('tray', { with: [['jacket', [0, 0, 0], 0]] }) or [['shoes', [-0.08, 0, 0], PI / 2], ['belt', [0.15, 0, 0.05], 0]]:
    // each is a normal instance (items[i].s.fall can be driven by a shot), resting on the ribs
    const items = ((o && o.with) || []).map(([name, pos = [0, 0, 0], rotY = 0]) => { const it = K.make(name); it.group.position.set(pos[0], FLOOR + RIB + (pos[1] || 0), pos[2]); it.group.rotation.y = rotY; g.add(it.group); return it; });
    return {
      group: g, items, size: { L, D, H, floor: FLOOR + RIB, innerL: L - 0.072, innerD: D - 0.072 },
      anchors: { inside: [0, FLOOR + RIB, 0], floor: [0, FLOOR, 0], rim: [0, H, 0], centre: [0, H / 2, 0], front: [0, H, D / 2], left: [-0.13, FLOOR + RIB, 0], right: [0.13, FLOOR + RIB, 0] },
      view: VW(o, { l: [0, 0.04, 0], d: 2.7, close: [0.14, 0.05, 0.1] }),
      defaults: {}, apply() {}, demo() {},
    };
  });

  // =================================================================================================== jacket
  KIT.asset('jacket', (K, o) => {
    const g = new T.Group(), body = new T.Group(); g.add(body);
    // the shell: matte black nylon. Its bump map carries the stitched seams and the small gathers that run out of them
    const shell = (seams, z0, z1, seed) => {
      const W = 2048, H = 512, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), r = OM.rng(seed);
      c.fillStyle = '#7e7e7e'; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 1100; i++) { c.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.02 + r() * 0.05})` : `rgba(0,0,0,${0.02 + r() * 0.05})`; c.beginPath(); c.ellipse(r() * W, r() * H, 5 + r() * 28, 2 + r() * 8, r() * PI, 0, TAU); c.fill(); }
      for (const z of seams.slice(1, -1)) { const y = (1 - (z - z0) / (z1 - z0)) * H;
        for (let x = 0; x < W; x += 2 + r() * 6) { const l = 6 + r() * 30, al = 0.14 + r() * 0.34, v = r() < 0.5 ? 255 : 0, x1 = x + (r() - 0.5) * 6, gr = c.createLinearGradient(0, y - l, 0, y + l);
          gr.addColorStop(0, `rgba(${v},${v},${v},0)`); gr.addColorStop(0.5, `rgba(${v},${v},${v},${al})`); gr.addColorStop(1, `rgba(${v},${v},${v},0)`);
          c.strokeStyle = gr; c.lineWidth = 1 + r() * 2.4; c.beginPath(); c.moveTo(x, y - l); c.quadraticCurveTo(x + (r() - 0.5) * 5, y, x1, y + l); c.stroke(); }
        c.strokeStyle = 'rgba(0,0,0,0.9)'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
        c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1.3; c.setLineDash([5, 4]); c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); c.setLineDash([]); }
      const m = new T.MeshPhysicalMaterial({ color: new T.Color('#121315'), roughness: 0.6, metalness: 0, specularIntensity: 0.7, sheen: 0.45, sheenRoughness: 0.5, sheenColor: new T.Color('#474a52') });
      m.bumpMap = K.canvasTex(cv, { srgb: false }); m.bumpScale = 1.4; return m; };
    // one quilted layer: a closed pillow. The channels run along X, wrap round both side edges and are stitched down between each other;
    // the ends (front fold, back) are rolled. top(x, z) gives the height of its upper face.
    function quilt(P) {
      const { a, rs, z0, z1, yc, hT, hB, seams, R = 0.028, g0 = 0.64, zip = false, seed, nTop = 104, nSide = 9, nBot = 14, per = 12, dip = null } = P;
      const r = OM.rng(seed), ph = seams.map(() => [r() * TAU, r() * TAU, r() * TAU, 0.94 + r() * 0.12, r() * TAU, r() * TAU]), q1 = r() * TAU, q2 = r() * TAU;
      const chan = z => { let k = 0; while (k < seams.length - 2 && z > seams[k + 1]) k++; return k; };
      const E = z => { const d = Math.min(z - z0, z1 - z); return d >= R ? 1 : Math.sqrt(Math.max(0, 1 - (1 - d / R) * (1 - d / R))); };
      const bulge = (x, z0_) => { const z = z0_ + 0.0016 * E(z0_) * Math.sin(x * 23 + q2) * Math.sin(z0_ * 31 + q1), k = chan(z), p = ph[k], t = clamp((z - seams[k]) / (seams[k + 1] - seams[k]));
        return Math.pow(Math.sin(PI * t), 0.5) * p[3] * (1 + 0.075 * Math.sin(x * 19 + p[0]) + 0.05 * Math.sin(x * 43 + p[1]) + 0.03 * Math.sin(x * 81 + p[2])); };
      // the gathers: small pleats that run out of every stitched seam and die away toward the crown of the channel
      const pleat = (x, z) => { const k = chan(z), dn = z - seams[k], up = seams[k + 1] - z, near = dn < up ? k : k + 1, d = Math.min(dn, up), p = ph[near]; if (near === 0 || near === seams.length - 1) return 0;
        return Math.exp(-(d / 0.0085) * (d / 0.0085)) * (0.6 * Math.sin(x * 560 + p[4] + 1.3 * Math.sin(x * 61 + p[5])) + 0.4 * Math.sin(x * 910 + p[5])); };
      const top = (x, z) => { let b = bulge(x, z); const ax = Math.abs(x), e = E(z); if (zip) b *= 1 - Math.exp(-Math.pow(ax / 0.014, 2.4));
        const gg = lerp(g0, 0.84, sstep(a - 0.04, a, ax));
        const fold = 1 - sstep(0.004, 0.05, Math.min(z - z0, z1 - z));                 // the rolled ends buckle a little where the padding is bent double
        let y = yc + hT * e * (gg + (1 - gg) * b) + e * (0.0011 * pleat(x, z) + 0.0016 * Math.sin(x * 8.5 + q1) * Math.sin(z * 15 + q2) + 0.0017 * fold * Math.sin(x * 118 + q1 + 1.6 * Math.sin(x * 19 + q2))); if (dip) y -= dip(x, z); return y; };
      const zl = []; for (const al of [0, 0.1, 0.22, 0.36, 0.52, 0.7, 0.9, 1.1, 1.32, PI / 2]) { const d = R * (1 - Math.cos(al)); zl.push(z0 + d, z1 - d); }
      for (let k = 0; k < seams.length - 1; k++) { for (let i = 0; i <= per; i++) zl.push(lerp(seams[k], seams[k + 1], i / per)); if (k) zl.push(seams[k] - 0.0012, seams[k] + 0.0012); }
      zl.sort((p, q) => p - q); const zr = []; for (const z of zl) if (z >= z0 && z <= z1 && (!zr.length || z - zr[zr.length - 1] > (Math.min(z - z0, z1 - z) < R * 0.2 ? 0.00005 : 0.0008))) zr.push(z);
      const Pm = 4 * a + TAU * rs, rows = zr.map(z => { const e = E(z), v = (z - z0) / (z1 - z0), pts = [], hb = hB * e, side = sx => [top(sx * a, z) - yc, rs * e * (0.87 + 0.13 * Math.min(1, bulge(sx * a, z)))];
        for (let j = 0; j <= nTop; j++) { const p = -1 + 2 * j / nTop, x = a * (0.72 * p + 0.28 * p * p * p); pts.push([x, top(x, z), z, (x + a) / Pm, v]); }
        const [hR, rR] = side(1), [hL, rL] = side(-1);
        for (let j = 1; j <= nSide; j++) { const th = PI / 2 - PI * j / (nSide + 1); pts.push([a + rR * Math.cos(th), yc + (th > 0 ? hR : hb) * Math.sin(th), z, (2 * a + (PI / 2 - th) * rs) / Pm, v]); }
        for (let j = 0; j <= nBot; j++) { const x = a * (1 - 2 * j / nBot); pts.push([x, yc - hb, z, (2 * a + PI * rs + a - x) / Pm, v]); }
        for (let j = 1; j <= nSide; j++) { const th = -PI / 2 + PI * j / (nSide + 1); pts.push([-a - rL * Math.cos(th), yc + (th > 0 ? hL : hb) * Math.sin(th), z, (4 * a + PI * rs + (th + PI / 2) * rs) / Pm, v]); }
        return pts; });
      const NC = rows[0].length, geo = orient(gridGeo(rows.length - 1, NC, (u, v, i, j) => rows[i][j], { closeV: true })), nn = geo.attributes.normal;
      for (let j = 0; j < NC; j++) { nn.setXYZ(j, 0, 0, -1); nn.setXYZ((rows.length - 1) * NC + j, 0, 0, 1); }
      return { geo, top, E };
    }
    // lower layer: the back and the hem, folded under
    const sL = [-0.150, -0.100, -0.050, 0, 0.050, 0.100, 0.150], lower = quilt({ a: 0.181, rs: 0.027, z0: -0.150, z1: 0.150, yc: 0.025, hT: 0.027, hB: 0.025, R: 0.024, seams: sL, seed: 41, nTop: 72 });
    body.add(K.mesh(lower.geo, shell(sL, -0.150, 0.150, 71)));
    // upper layer: the front, zip down the middle, folded over the lower one at the hem; the neck is hollowed for the collar
    const CY = 0.0915, CZ = -0.104, crx = 0.090, crz = 0.034, Z0 = -0.150, Z1 = 0.145, YC = 0.073, RU = 0.023;
    const sU = [Z0, -0.108, -0.066, -0.013, 0.040, 0.093, Z1];
    const upper = quilt({ a: 0.176, rs: 0.026, z0: Z0, z1: Z1, yc: YC, hT: 0.030, hB: 0.027, R: RU, seams: sU, seed: 43, zip: true,
      dip: (x, z) => 0.016 * (1 - sstep(0.62, 1.0, Math.hypot(x / (crx + 0.004), (z - CZ) / (crz + 0.004)))) });
    body.add(K.mesh(upper.geo, shell(sU, Z0, Z1, 73)));
    // the zip: tape, teeth, slider and a small steel pull. It follows the front down over the fold
    const zs = -0.040, path = []; for (let z = -0.052; z < Z1 - RU; z += 0.0015) path.push(z); for (let al = PI / 2; al > 0.34; al -= 0.04) path.push(Z1 - RU * (1 - Math.cos(al)));
    const pp = path.map(z => [upper.top(0, z), z]), fr = pp.map((p, i) => { const q0 = pp[Math.max(0, i - 1)], q1 = pp[Math.min(pp.length - 1, i + 1)]; let ty = q1[0] - q0[0], tz = q1[1] - q0[1]; const l = Math.hypot(ty, tz); ty /= l; tz /= l; return { y: p[0], z: p[1], ty, tz, ny: tz, nz: -ty }; });
    const tape = gridGeo(fr.length - 1, 2, (u, v, i, j) => { const f = fr[i], x = (j - 1) * 0.0065, lift = 0.0007 + (j === 1 ? 0.0004 : 0) + (upper.top(x, f.z) - f.y); return [x, f.y + f.ny * lift, f.z + f.nz * lift]; });
    const tm = K.mat.clay('#26272b', 0.9).clone(); tm.side = T.DoubleSide; body.add(K.mesh(tape, tm, { cast: false }));
    const cum = [0]; for (let i = 1; i < fr.length; i++) cum.push(cum[i - 1] + Math.hypot(fr[i].y - fr[i - 1].y, fr[i].z - fr[i - 1].z));
    const NT = Math.floor((cum[cum.length - 1] - 0.012) / 0.00125), teeth = new T.InstancedMesh(K.geo.box(0.0034, 0.0013, 0.0016), K.mat.metal('#787c85', 0.36), NT), dm = new T.Object3D();
    for (let i = 0, k = 0; i < NT; i++) { const d = 0.010 + i * 0.00125; while (k < cum.length - 2 && cum[k + 1] < d) k++; const w = (d - cum[k]) / (cum[k + 1] - cum[k] || 1), f = fr[k], h = fr[k + 1];
      dm.position.set((i % 2 ? 1 : -1) * 0.0011, lerp(f.y, h.y, w) + f.ny * 0.0017, lerp(f.z, h.z, w) + f.nz * 0.0017); dm.rotation.set(Math.atan2(-f.ty, f.tz), 0, 0); dm.updateMatrix(); teeth.setMatrixAt(i, dm.matrix); }
    teeth.receiveShadow = true; body.add(teeth);
    { const f = fr[fr.length - 3]; body.add(K.mesh(K.geo.rbox(0.0062, 0.0022, 0.0042, 0.0008), K.mat.metal('#787c85', 0.36), { pos: [0, f.y + f.ny * 0.0019, f.z + f.nz * 0.0019], rot: [Math.atan2(-f.ty, f.tz), 0, 0] })); }   // the bottom stop
    const steel = K.mat.brushed(), zy = upper.top(0, zs) + 0.0012;
    body.add(K.mesh(K.geo.rbox(0.0086, 0.0044, 0.0120, 0.0015), steel, { pos: [0, zy + 0.0022, zs] }));
    const pg = K.geo.extrude(K.geo.rrect(0.0068, 0.024, 0.0028), 0.0011, { bevel: 0.0003, holes: [K.geo.rrect(0.0030, 0.0062, 0.0014).map(p => [p[0], p[1] + 0.0058])] }); pg.rotateX(-PI / 2);
    body.add(K.mesh(pg, steel, { pos: [0.0012, zy + 0.0030, zs + 0.0195], rot: [0, 0.16, 0] }));
    body.add(K.mesh(new T.TorusGeometry(0.0024, 0.0007, 8, 20), steel, { pos: [0.0002, zy + 0.0044, zs + 0.006], rot: [0, PI / 2, 0] }));
    // the collar: a quilted padded ring that meets at the zip; the lining and a woven size label inside it
    const A0 = 97 * PI / 180, A1 = 443 * PI / 180, NSEG = 9;
    const colGeo = orient(gridGeo(180, 20, (u, v) => { const b = lerp(A0, A1, u), px = crx * Math.cos(b), pz = crz * Math.sin(b); let tx = -crx * Math.sin(b), tz = crz * Math.cos(b); const l = Math.hypot(tx, tz); tx /= l; tz /= l;
      const end = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * u - 1), 12)), 1 / 12), ds = Math.abs(((u * NSEG + 0.5) % 1) - 0.5), r = 0.0205 * end * (1 - 0.17 * Math.exp(-(ds / 0.05) * (ds / 0.05))) * (1 + 0.03 * Math.sin(u * 61)), th = v * TAU;
      return [px + r * Math.cos(th) * tz, CY + 0.82 * r * Math.sin(th), CZ + pz - r * Math.cos(th) * tx]; }, { closeV: true }));
    const cm = shell([0, 1], 0, 1, 79); cm.bumpScale = 0.5; body.add(K.mesh(colGeo, cm));
    body.add(K.mesh(K.geo.rbox(0.150, 0.014, 0.044, 0.007), K.mat.cloth('#34363b'), { pos: [0, CY - 0.0035, CZ] }));
    const lb = K.canvasPlane(0.032, 0.013, 12000, (c, W, H) => { c.fillStyle = '#e4e2dc'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(0,0,0,0.06)'; for (let x = 0; x < W; x += 3) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke(); }
      c.fillStyle = '#2a2c30'; c.font = `500 ${Math.round(H * 0.6)}px ${K.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('M', W / 2, H * 0.54); }, { lit: true });
    lb.rotation.x = -PI / 2; lb.position.set(0, CY + 0.0038, CZ - 0.004); lb.receiveShadow = true; body.add(lb);
    const P = { hx: 0.21, hz: 0.15, rx: 0.07, rz: -0.085, ry: 0.10, sq: 0.11, b1: 0.013, b2: 0.003 };
    return {
      group: g, size: { W: 0.416, D: 0.30, H: 0.109 },
      anchors: { centre: [0, 0.055, 0], top: [0, 0.103, 0.03], zip: [0, zy + 0.004, zs + 0.01], collar: [0, CY + 0.017, CZ] },
      view: VW(o, { l: [0, 0.05, 0], d: 2.3, close: [0.03, 0.09, -0.05] }),
      defaults: { fall: 1 },
      apply(s) { drop(body, s.fall, P); },
      demo(s, t) { if (o && o.hold) return void Object.assign(s, o.hold); fallDemo(s, t); },
    };
  });

  // =================================================================================================== shoes
  KIT.asset('shoes', (K, o) => {
    const g = new T.Group(), LEN = 0.28, zOf = t => -LEN / 2 + LEN * t, pH = 3.4, pT = 3.05;
    // plan of the sole: half-widths on the outer (lateral, +x) and inner (medial) side along t = 0 heel .. 1 toe; round heel, round toe
    const B = curve([[0, 0.039], [0.15, 0.0410], [0.38, 0.0420], [0.62, 0.0530], [0.82, 0.0515], [1, 0.046]]);
    const E = t => { const p = t < 0.5 ? pH : pT; return Math.pow(Math.max(0, 1 - Math.pow(Math.abs(2 * t - 1), p)), 1 / p); };
    // stations along the length: even in the middle, evenly spaced around the rounded heel and toe
    const stations = (nMid, nEnd) => { const ts = [], tE = 0.06, aH = Math.acos(Math.pow(1 - 2 * tE, pH / 2)), aT = Math.acos(Math.pow(1 - 2 * tE, pT / 2));
      for (let k = 0; k < nEnd; k++) ts.push(0.5 - 0.5 * Math.pow(Math.cos(aH * k / nEnd), 2 / pH));
      for (let k = 0; k <= nMid; k++) ts.push(lerp(tE, 1 - tE, k / nMid));
      for (let k = 1; k <= nEnd; k++) ts.push(0.5 + 0.5 * Math.pow(Math.cos(aT * (1 - k / nEnd)), 2 / pT));
      return ts; };
    const cx = t => -0.010 * sstep(0.42, 1, t);
    const wL = t => B(t) * E(t) * (1 + 0.05 * bell(t, 0.60, 0.16)), wM = t => B(t) * E(t) * (1 - 0.07 * bell(t, 0.42, 0.20) + 0.03 * bell(t, 0.70, 0.14));
    const TS = curve([[0, 0.045], [0.22, 0.047], [0.5, 0.040], [0.75, 0.035], [1, 0.033]]);
    // the toe springs up; the heel is only bevelled underneath (the top line of the sole stays straight)
    const ybT = t => 0.017 * Math.pow(sstep(0.70, 1, t), 1.6), ybH = t => 0.007 * (1 - sstep(0, 0.09, t)), yb = t => ybT(t) + ybH(t), yt = t => ybT(t) + TS(t);
    // ---- sole: rings around the plan outline, pushed out by a sculpted side profile (a cupsole: grey rubber tread, a tall white wall with one pinstripe)
    const st = stations(44, 10), NS = st.length - 1, out = [];
    for (let i = 0; i <= NS; i++) out.push({ t: st[i], x: cx(st[i]) + wL(st[i]), z: zOf(st[i]) });
    for (let i = NS - 1; i >= 1; i--) out.push({ t: st[i], x: cx(st[i]) - wM(st[i]), z: zOf(st[i]) });
    const NO = out.length;
    out.forEach((p, i) => { const a = out[(i + NO - 1) % NO], b = out[(i + 1) % NO]; let nx = b.z - a.z, nz = -(b.x - a.x); const l = Math.hypot(nx, nz) || 1; nx /= l; nz /= l; if (nx * (p.x - cx(0.5)) + nz * p.z < 0) { nx = -nx; nz = -nz; } p.nx = nx; p.nz = nz; });
    const soleRing = (v, fl) => out.map(p => [p.x + p.nx * fl, ybT(p.t) + ybH(p.t) * Math.pow(Math.max(0, 1 - v / 0.3), 2) + v * TS(p.t), p.z + p.nz * fl]);
    const loft = prof => { const rs = prof.map(p => soleRing(p[0], p[1])); return orient(gridGeo(prof.length - 1, NO, (u, v, i, j) => rs[i][j], { closeV: true })); };
    const outGeo = loft([[0, -0.0030], [0.018, 0.0016], [0.05, 0.0040], [0.15, 0.0046], [0.175, 0.0034]]);
    const midGeo = loft([[0.175, 0.0034], [0.195, 0.0058], [0.26, 0.0068], [0.50, 0.0060], [0.62, 0.0054], [0.645, 0.0042], [0.675, 0.0042], [0.70, 0.0052], [0.86, 0.0044], [0.955, 0.0034], [0.995, 0.0014], [1.004, -0.0028], [1.0, -0.018]]);
    const botGeo = fanGeo([cx(0.5), yb(0.5), 0], soleRing(0, -0.0030), false);
    // ---- upper: an arch over each cross-section (upright walls at the back, a rounder dome over the toes); a flat collar plane with the foot opening sunk into it
    const HU = curve([[0, 0.090], [0.08, 0.090], [0.20, 0.079], [0.30, 0.083], [0.39, 0.097], [0.45, 0.096], [0.60, 0.066], [0.74, 0.047], [0.88, 0.038], [0.94, 0.035], [0.975, 0.029], [0.992, 0.020], [1, 0.009]]);
    const y0u = t => yt(t) - 0.006, EXf = t => lerp(0.50, 0.80, sstep(0.36, 0.72, t)), LID = t => 0.85 * HU(t), lidOn = t => 1 - sstep(0.385, 0.425, t);
    const PIT = { zc: -0.076, az: 0.052, ax: 0.0265, depth: 0.056, n: 2.5 };
    function S(t, phi, info) {
      const w = (phi < PI / 2 ? wL(t) : wM(t)) * 0.9, h = HU(t), z = zOf(t), lid = LID(t) + (1 - lidOn(t)) * 0.06, EX = EXf(t);
      let x = w * spow(Math.cos(phi), EX), y = h * Math.pow(Math.max(Math.sin(phi), 0), EX);
      if (y > lid) { y = lid;
        const rho = Math.pow(Math.pow(Math.abs((z - PIT.zc) / PIT.az), PIT.n) + Math.pow(Math.abs(x / PIT.ax), PIT.n), 1 / PIT.n);
        if (rho < 1) y = lid - PIT.depth * (1 - Math.pow(rho, 5)); if (info && rho < 1.1) info.pit = true; }
      return [cx(t) + x, y0u(t) + y, z - 0.0045 * Math.sin(PI * clamp(y / (0.85 * h))) * (1 - sstep(0, 0.10, t))];
    }
    // a point on the upper, lifted off the surface by `off` along the true normal (so panels and laces sit on it, also round the heel and toe)
    function NRM(t, phi) {                                               // the outward unit normal of the upper at (t, phi)
      const tn = clamp(t, 0.004, 0.996), pn = clamp(phi, 0.03, PI - 0.03), q = S(tn, pn), a = S(tn, pn < PI / 2 ? pn + 0.012 : pn - 0.012), b = S(tn + 0.003, pn);
      const ux = a[0] - q[0], uy = a[1] - q[1], uz = a[2] - q[2], vx = b[0] - q[0], vy = b[1] - q[1], vz = b[2] - q[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz); if (l < 1e-14) return null;
      const tc = lerp(0.14, 0.86, t); if (nx * (q[0] - cx(tc)) + ny * (q[1] - y0u(tc) - 0.25 * HU(tc)) + nz * (q[2] - zOf(tc)) < 0) { nx = -nx; ny = -ny; nz = -nz; }
      return [nx / l, ny / l, nz / l];
    }
    function U(t, phi, off = 0, info) {
      const p = S(t, phi, info); if (!off) return p; const n = NRM(t, phi); if (!n) return p;
      return [p[0] + n[0] * off, p[1] + n[1] * off, p[2] + n[2] * off];
    }
    const arcW = (t, f0, f1) => { let L = 0, q = S(t, f0); for (let k = 1; k <= 8; k++) { const r = S(t, lerp(f0, f1, k / 8)); L += Math.hypot(r[0] - q[0], r[1] - q[1], r[2] - q[2]); q = r; } return Math.max(L, 1e-4); };
    const tu = stations(104, 12), NU = tu.length - 1, NV = 72;
    const white = new T.Color('#ffffff'), lining = new T.Color('#6f7279'), cols = [];
    const upGeo = gridGeo(NU, NV, (u, v, i) => { const inf = {}, p = U(tu[i], v * PI, 0, inf), c = inf.pit ? lining : white; cols.push(c.r, c.g, c.b); return [p[0], p[1], p[2], tu[i], v]; });
    upGeo.setAttribute('color', new T.Float32BufferAttribute(cols, 3)); orient(upGeo);
    // the leather: a soft mottle, and the vent holes punched in the toe box
    const ucv = document.createElement('canvas'); ucv.width = 2048; ucv.height = 1024; const uc = ucv.getContext('2d'), RU = OM.rng(515);
    uc.fillStyle = '#dedcd6'; uc.fillRect(0, 0, 2048, 1024);
    for (let i = 0; i < 9000; i++) { uc.fillStyle = RU() < 0.5 ? `rgba(255,255,255,${0.015 + RU() * 0.03})` : `rgba(96,92,84,${0.008 + RU() * 0.018})`; uc.beginPath(); uc.ellipse(RU() * 2048, RU() * 1024, 2 + RU() * 5, 0.8 + RU() * 1.6, 0, 0, TAU); uc.fill(); }
    const inv = (x, z) => { const t = (z + LEN / 2) / LEN, dx = x - cx(t), w = (dx > 0 ? wL(t) : wM(t)) * 0.9, c = clamp(spow(dx / w, 1 / EXf(t)), -1, 1); return [t * 2048, (1 - Math.acos(c) / PI) * 1024]; };
    const hole = (x, z, r, fill) => { uc.fillStyle = fill; uc.beginPath(); for (let k = 0; k < 14; k++) { const q = inv(x + r * Math.cos(k / 14 * TAU), z + r * Math.sin(k / 14 * TAU)); if (k) uc.lineTo(q[0], q[1]); else uc.moveTo(q[0], q[1]); } uc.closePath(); uc.fill(); };
    for (let iz = 0; iz < 6; iz++) for (let ix = -3; ix <= 3; ix++) { const z = zOf(0.775) + iz * 0.0072, x = cx(0.84) + (ix + (iz % 2 ? 0.5 : 0)) * 0.0078, e = Math.hypot((x - cx(0.84)) / 0.027, (z - zOf(0.838)) / 0.024); if (e > 1) continue;
      hole(x, z + 0.0004, 0.00125, 'rgba(255,255,255,0.55)'); hole(x, z, 0.0010, '#57595e'); }
    const utex = new T.CanvasTexture(ucv); utex.colorSpace = T.SRGBColorSpace; utex.anisotropy = 8;
    // an overlay panel: a patch of the upper lifted off along the mesh normals (straight back / forward on the heel and toe lines, so the halves meet).
    // Its own texture carries the suede, the rows of stitching along its free edges and the punched eyelets.
    const DPR = 7200;                                                   // texture pixels per metre along the panel
    function panel(tA, tB, f0, f1, nf, q = {}) {
      const off = q.off ?? 0.0013, tl = [tA, ...tu.filter(t => t > tA + 1e-4 && t < tB - 1e-4), tB], ge = gridGeo(tl.length - 1, nf, (u, v, i) => { const p = S(tl[i], lerp(f0(tl[i]), f1(tl[i]), v)); return [p[0], p[1], p[2], (tl[i] - tA) / (tB - tA), v]; });
      const Pp = ge.attributes.position, Nn = ge.attributes.normal, im = Math.floor(tl.length / 2), m = im * (nf + 1) + Math.floor(nf / 2), tc = lerp(0.14, 0.86, tl[im]);
      const sg = Nn.getX(m) * (Pp.getX(m) - cx(tc)) + Nn.getY(m) * (Pp.getY(m) - y0u(tc) - 0.25 * HU(tc)) + Nn.getZ(m) * (Pp.getZ(m) - zOf(tc)) < 0 ? -off : off;
      for (let i = 0; i < Pp.count; i++) { const t = tl[Math.floor(i / (nf + 1))]; if (t <= 0 || t >= 1) { const ph = lerp(f0(t), f1(t), (i % (nf + 1)) / nf), uy = 0.75 * Math.sin(ph), ul = Math.hypot(uy, 1); Pp.setY(i, Pp.getY(i) + off * uy / ul); Pp.setZ(i, Pp.getZ(i) + (t >= 1 ? off : -off) / ul); } else Pp.setXYZ(i, Pp.getX(i) + sg * Nn.getX(i), Pp.getY(i) + sg * Nn.getY(i), Pp.getZ(i) + sg * Nn.getZ(i)); }
      ge.computeVertexNormals();                                          // then take the upper's own normals, so neighbouring panels shade as one piece
      for (let i = 0; i < Pp.count; i++) { const t = tl[Math.floor(i / (nf + 1))], n = t <= 0 ? [0, 0, -1] : t >= 1 ? [0, 0.35, 0.937] : NRM(t, lerp(f0(t), f1(t), (i % (nf + 1)) / nf)); if (n) Nn.setXYZ(i, n[0], n[1], n[2]); }
      const Lm = (tB - tA) * LEN, W = Math.max(64, Math.min(1024, Math.round(Lm * DPR))), wMid = arcW((tA + tB) / 2, f0((tA + tB) / 2), f1((tA + tB) / 2)), H = Math.max(64, Math.min(1024, Math.round(wMid * DPR)));
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), r = OM.rng(q.seed || 7);
      c.fillStyle = q.color || '#bcbdc0'; c.fillRect(0, 0, W, H);
      for (let i = 0; i < W * H / 60; i++) { c.fillStyle = r() < 0.5 ? `rgba(255,255,255,${0.03 + r() * 0.05})` : `rgba(40,42,48,${0.03 + r() * 0.05})`; c.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 2); }
      const pxs = W / Lm, row = (vf) => { for (const [col, lw, dy] of [['rgba(60,62,68,0.5)', 0.0007, 0.0004], ['#f1efea', 0.00055, 0]]) { c.strokeStyle = col; c.lineWidth = Math.max(1.2, lw * H / wMid); c.setLineDash([0.0024 * pxs, 0.0012 * pxs]); c.beginPath();
        for (let k = 0; k <= 80; k++) { const t = lerp(tA, tB, k / 80), v = vf(t, arcW(t, f0(t), f1(t))), x = k / 80 * W, y = (1 - v) * H + dy * H / wMid; if (k) c.lineTo(x, y); else c.moveTo(x, y); } c.stroke(); } c.setLineDash([]); };
      for (const d of q.v1 || []) row((t, aw) => 1 - d / aw); for (const d of q.v0 || []) row((t, aw) => d / aw);
      const col = (sf) => { for (const [colr, lw, dx] of [['rgba(60,62,68,0.5)', 0.0007, 0.0004], ['#f1efea', 0.00055, 0]]) { c.strokeStyle = colr; c.lineWidth = Math.max(1.2, lw * pxs); c.setLineDash([0.0024 * H / wMid, 0.0012 * H / wMid]); c.beginPath(); c.moveTo(sf * W + dx * pxs, 0); c.lineTo(sf * W + dx * pxs, H); c.stroke(); } c.setLineDash([]); };
      for (const d of q.s1 || []) col(1 - d / Lm); for (const d of q.s0 || []) col(d / Lm); for (const v of q.mid || []) row(() => v);
      if (q.eye) for (const t of q.eye.ts) { const x = (t - tA) / (tB - tA) * W, y = (1 - q.eye.v) * H, rx = 0.0023 * pxs, ry = 0.0023 * H / arcW(t, f0(t), f1(t));
        c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.ellipse(x, y + ry * 0.2, rx * 1.3, ry * 1.3, 0, 0, TAU); c.fill(); c.fillStyle = '#4b4d52'; c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); }
      const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 8;
      return { ge, mat: new T.MeshStandardMaterial({ map: tx, roughness: 0.94, side: T.DoubleSide }) };
    }
    // panel edges are drawn as a height up the wall (0 = sole, 1 = top of the arch) and turned into the arch angle
    const up = (t, hf) => Math.asin(Math.pow(clamp(hf, 0, 1), 1 / EXf(t))), f62 = up(0.62, 0.46);
    const fb = t => t < 0.62 ? up(t, 0.46 * sstep(0.335, 0.62, t)) : PI / 2 - (PI / 2 - f62) * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.62) / (0.930 - 0.62), 2.4)));
    const fh = t => up(t, 0.88 * Math.pow(1 - sstep(0.03, 0.40, t), 1.25));
    const dl = t => lerp(0.40, 0.25, sstep(0.44, 0.72, t)), wE = 0.34, LT = []; for (let k = 0; k < 6; k++) LT.push(0.458 + k * 0.047);
    const panels = [
      panel(0.345, 0.930, t => 0, fb, 12, { v1: [0.0026, 0.0048], seed: 3 }), panel(0.345, 0.930, t => PI, t => PI - fb(t), 12, { v1: [0.0026, 0.0048], seed: 4 }), panel(0.927, 1, t => 0, t => PI, 30, { seed: 5, off: 0.0014 }),   // mudguard round the toe
      panel(0, 0.39, t => 0, fh, 14, { v1: [0.0026], s0: [0.0030], seed: 6 }), panel(0, 0.39, t => PI, t => PI - fh(t), 14, { v1: [0.0026], s0: [0.0030], seed: 7 }),   // heel counter, sweeping down to the waist
      panel(0.425, 0.72, t => PI / 2 - dl(t) - wE, t => PI / 2 - dl(t), 6, { v0: [0.0024], v1: [0.0022], eye: { ts: LT, v: 1 - 0.13 / wE }, seed: 9 }), panel(0.425, 0.72, t => PI / 2 + dl(t), t => PI / 2 + dl(t) + wE, 6, { v0: [0.0022], v1: [0.0024], eye: { ts: LT, v: 0.13 / wE }, seed: 10 }),   // eyestays
      panel(0.72, 0.765, t => PI / 2 - dl(0.72) - wE, t => PI / 2 + dl(0.72) + wE, 22, { s1: [0.0024], seed: 11 }),                                   // the bridge at the front of the throat
    ];
    // laces: six bars across the throat, a bow, two ends
    const path = (pts, r, seg = 28) => K.geo.tube(pts.map(p => U(p[0], p[1], p[2])), r, { seg, rad: 7 });
    const laces = [], LR = 0.0024;
    for (const t of LT) { const a = PI / 2 - dl(t) - 0.13, b = PI / 2 + dl(t) + 0.13, pts = []; for (let m = 0; m <= 8; m++) pts.push([t, lerp(a, b, m / 8), m === 0 || m === 8 ? -0.0006 : 0.0034 + 0.0006 * Math.sin(PI * m / 8)]); laces.push(path(pts, LR)); }
    for (const sg of [-1, 1]) {
      laces.push(path([[0.455, PI / 2 + sg * 0.05, 0.0075], [0.441, PI / 2 + sg * 0.36, 0.0085], [0.460, PI / 2 + sg * 0.70, 0.0065], [0.490, PI / 2 + sg * 0.52, 0.0062], [0.473, PI / 2 + sg * 0.10, 0.0075]], LR, 40));
      laces.push(path([[0.457, PI / 2 + sg * 0.05, 0.0075], [0.492, PI / 2 + sg * 0.40, 0.0056], [0.522 + sg * 0.008, PI / 2 + sg * 0.84, 0.0042], [0.538 + sg * 0.01, PI / 2 + sg * 1.04, 0.0036]], LR, 30));
    }
    const knot = U(0.458, PI / 2, 0.0072);
    // the padded collar around the opening, and the padded top of the tongue standing in front of it
    const cpts = []; for (let i = 0; i < 44; i++) { const b = i / 44 * TAU, z = PIT.zc + PIT.az * spow(Math.sin(b), 2 / PIT.n), t = (z + LEN / 2) / LEN; cpts.push([cx(t) + PIT.ax * spow(Math.cos(b), 2 / PIT.n), y0u(t) + LID(t) + 0.0008, z]); }
    const collarGeo = K.geo.tube(cpts, 0.0068, { closed: true, seg: 132, rad: 12 });
    const tg = new T.Group(); tg.position.set(cx(0.42), y0u(0.43) + HU(0.43) - 0.0085, zOf(0.43) - 0.002); tg.rotation.x = 0.60;
    const upperMat = new T.MeshStandardMaterial({ vertexColors: true, map: utex, roughness: 0.56 });
    const midMat = K.mat.clay('#dfddd7', 0.7), outMat = K.mat.clay('#b3b4b8', 0.8), laceMat = K.mat.clay('#e6e4de', 0.9), padMat = K.mat.clay('#d3d1cb', 0.88);
    tg.add(K.mesh(K.geo.rbox(0.049, 0.016, 0.046, 0.0079, 6), padMat));
    const tl = K.canvasPlane(0.026, 0.015, 9000, (c, W, H) => { c.fillStyle = '#b4b5b9'; c.fillRect(0, 0, W, H); c.strokeStyle = '#eceae5'; c.lineWidth = 3; c.setLineDash([14, 8]); c.strokeRect(9, 9, W - 18, H - 18); }, { lit: true });
    tl.rotation.x = -PI / 2; tl.position.set(0, 0.0082, -0.008); tl.receiveShadow = true; tg.add(tl);
    const shoe = () => { const s = new T.Group();
      s.add(K.mesh(outGeo, outMat), K.mesh(midGeo, midMat), K.mesh(botGeo, outMat), K.mesh(upGeo, upperMat), K.mesh(collarGeo, padMat), tg.clone());
      for (const p of panels) s.add(K.mesh(p.ge, p.mat, { cast: false }));
      for (const l of laces) s.add(K.mesh(l, laceMat));
      s.add(K.mesh(new T.SphereGeometry(0.0048, 14, 10), laceMat, { pos: knot, scale: [1.3, 0.8, 1] }));
      return s; };
    // the pair: medial sides together, toes a little out
    const pair = [];
    const SC = 0.28 / (LEN + 0.0136);                                   // the sole flares past the last: bring the whole shoe to 0.28 m overall
    for (const sx of [1, -1]) { const pose = new T.Group(), yaw = new T.Group(), sh = shoe(); sh.scale.set(sx * SC, SC, SC); yaw.rotation.y = sx * 0.10; yaw.add(sh); pose.add(yaw); const slot = new T.Group(); slot.position.x = sx * 0.064; slot.add(pose); g.add(slot); pair.push(pose); }
    const PR = { hx: 0.058, hz: 0.13, rx: 0.10, rz: 0.07, ry: 0.06, sq: 0.025, b1: 0.026, b2: 0.006 }, PL = { hx: 0.058, hz: 0.13, rx: -0.07, rz: -0.09, ry: -0.08, sq: 0.025, b1: 0.022, b2: 0.005 };
    return {
      group: g, size: { L: 0.28, W: 0.269, D: 0.291, H: 0.138, each: 0.118 },
      anchors: { centre: [0, 0.06, 0], right: [0.064, 0.076, 0], left: [-0.064, 0.076, 0], toe: [0.069, 0.057, 0.115], heel: [0.051, 0.110, -0.124], laces: [0.067, 0.108, 0.01], tongue: [0.064, 0.128, -0.03] },
      view: VW(o, { l: [0, 0.06, 0], d: 1.75, close: [0.05, 0.08, 0.03] }),
      defaults: { fall: 1 },
      apply(s) { const f = clamp(s.fall); drop(pair[0], clamp(f / 0.94), PR); drop(pair[1], clamp((f - 0.06) / 0.94), PL); },
      demo(s, t) { if (o && o.hold) return void Object.assign(s, o.hold); fallDemo(s, t); },
    };
  });

  // =================================================================================================== belt
  KIT.asset('belt', (K, o) => {
    const g = new T.Group(), body = new T.Group(), inner = new T.Group(); g.add(body); body.add(inner);
    const WS = 0.035, TH = 0.0038, r0 = 0.027, bb = 0.0105 / TAU, th1 = TAU * 3.2, r1 = r0 + bb * th1;
    // centre line: a loose spiral standing on edge, then the tail peels off and turns flat
    const P = [];
    for (let th = 0; th < th1; th += 0.035) { const r = r0 + bb * th + 0.0011 * Math.sin(th * 1.7 + 0.8) * sstep(0, 2, th) * (1 - sstep(th1 - 1.5, th1, th)); P.push([r * Math.cos(th), r * Math.sin(th)]); }
    const iTail = P.length;
    for (let d = 0; d <= 2.3; d += 0.025) { const r = r1 + 0.007 * d + 0.0065 * d * d; P.push([r * Math.cos(th1 + d), r * Math.sin(th1 + d)]); }
    const N = P.length, S = [0]; for (let i = 1; i < N; i++) S.push(S[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const LT = S[N - 1], sA = S[iTail] - 0.012, hw = WS / 2, ht = TH / 2, ch = 0.0009;
    const sec = [[-hw + ch, ht, ch / WS], [hw - ch, ht, 1 - ch / WS], [hw, ht - ch, 1], [hw, -ht + ch, 1], [hw - ch, -ht, 1 - ch / WS], [-hw + ch, -ht, ch / WS], [-hw, -ht + ch, 0], [-hw, ht - ch, 0], [-hw + ch, ht, ch / WS]];
    const frame = i => { const a = P[Math.max(0, i - 1)], b = P[Math.min(N - 1, i + 1)]; let tx = b[0] - a[0], tz = b[1] - a[1]; const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
      const s = S[i], al = PI / 2 * sstep(sA, sA + 0.085, s), ws = s > LT - 0.02 ? Math.max(0.03, Math.sqrt(Math.max(0, 1 - Math.pow((s - (LT - 0.02)) / 0.02, 2)))) : 1, ca = Math.cos(al), sa = Math.sin(al);
      return { tx, tz, nx: tz, nz: -tx, ca, sa, ws, y: hw * ws * Math.abs(ca) + ht * Math.abs(sa) + 0.0002 + 0.0065 * (1 - sstep(0, 0.10, s)) }; };
    const FR = []; for (let i = 0; i < N; i++) FR.push(frame(i));
    const strapGeo = orient(gridGeo(N - 1, 8, (u, v, i, j) => { const f = FR[i], q = sec[j], a = q[0] * f.ws, b = q[1];
      // width axis W = up*cos - out*sin, face axis F = out*cos + up*sin (the outer face turns up as the tail lies down)
      return [P[i][0] + a * (-f.nx * f.sa) + b * (f.nx * f.ca), f.y + a * f.ca + b * f.sa, P[i][1] + a * (-f.nz * f.sa) + b * (f.nz * f.ca), S[i] / LT, q[2]]; }));
    // leather: one long texture for the whole belt (grain, stitching, the five punched holes near the tip)
    const cv = document.createElement('canvas'); cv.width = 4096; cv.height = 128; const c = cv.getContext('2d'), R = OM.rng(808);
    c.fillStyle = '#151618'; c.fillRect(0, 0, 4096, 128);
    for (let i = 0; i < 26000; i++) { c.fillStyle = R() < 0.5 ? `rgba(255,255,255,${0.012 + R() * 0.03})` : `rgba(0,0,0,${0.06 + R() * 0.12})`; c.fillRect(R() * 4096, R() * 128, 1 + R() * 3, 1 + R() * 2); }
    c.fillStyle = '#4b4d54'; const tipPx = 4096 * (1 - 0.024 / LT); for (let x = 16; x < tipPx; x += 19) { c.fillRect(x, 14, 11, 2.2); c.fillRect(x, 112, 11, 2.2); }
    const holes = []; for (let k = 0; k < 5; k++) holes.push(LT - 0.040 - k * 0.022);
    for (const hs of holes) { const x = hs / LT * 4096; c.strokeStyle = '#0b0c0e'; c.lineWidth = 3; c.beginPath(); c.ellipse(x, 64, 11.5, 11.5, 0, 0, 7); c.stroke(); }
    c.globalCompositeOperation = 'destination-out'; for (const hs of holes) { c.beginPath(); c.ellipse(hs / LT * 4096, 64, 2.3 / (LT * 1000 / 4096), 2.3 / (WS * 1000 / 128), 0, 0, 7); c.fill(); } c.globalCompositeOperation = 'source-over';
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    const leather = new T.MeshPhysicalMaterial({ map: tex, alphaTest: 0.5, roughness: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.5, specularIntensity: 0.8 });
    leather.bumpMap = K.canvasTex(K.noiseCanvas(256, 23, 'grain'), { srgb: false }); leather.bumpMap.repeat.set(60, 2); leather.bumpScale = 0.25;
    inner.add(K.mesh(strapGeo, leather));
    // the cut wall of each punched hole (the strap has thickness: you do not look straight through it at an angle)
    const wallMat = new T.MeshStandardMaterial({ color: new T.Color('#0c0c0e'), roughness: 0.9, side: T.DoubleSide }), wallGeo = new T.CylinderGeometry(0.00232, 0.00232, TH - 0.0002, 18, 1, true), yAx = new T.Vector3(0, 1, 0);
    for (const hs of holes) { let i = 0; while (i < N - 1 && S[i] < hs) i++; const f = FR[i], w = K.mesh(wallGeo, wallMat, { pos: [P[i][0], f.y, P[i][1]], cast: false }); w.quaternion.setFromUnitVectors(yAx, new T.Vector3(f.nx * f.ca, f.sa, f.nz * f.ca).normalize()); inner.add(w); }
    const plain = K.mat.plastic('#191a1c', 0.55), steel = K.mat.brushed();
    // the buckle end: the strap folds round the pin bar; a keeper loop a little further on; the frame stands across the core
    const y0 = FR[0].y;
    inner.add(K.mesh(K.geo.rbox(TH * 2.3, WS, 0.014, 0.002), plain, { pos: [P[0][0], y0, P[0][1] + 0.004] }));
    let ik = 0; while (S[ik] < 0.045) ik++;
    inner.add(K.mesh(K.geo.rbox(TH + 0.0052, WS + 0.0042, 0.0115, 0.0016), plain, { pos: [P[ik][0], FR[ik].y, P[ik][1]], rot: [0, Math.atan2(FR[ik].tx, FR[ik].tz), 0] }));
    const FLn = 0.042, FH = 0.046, RB = 0.0025, ang = 65 * PI / 180, D = [-Math.sin(ang), -Math.cos(ang)], B0 = [P[0][0], P[0][1] - 0.004], by = y0 + 0.001;
    const fpts = K.geo.rrect(FLn, FH, 0.007, 6).map(p => [B0[0] + D[0] * (p[0] + FLn / 2), by + p[1], B0[1] + D[1] * (p[0] + FLn / 2)]);
    inner.add(K.mesh(K.geo.tube(fpts, RB, { closed: true, seg: 120, rad: 12 }), steel));
    const nrm = [D[1], -D[0]], pr = (p, n, dy) => [B0[0] + D[0] * p + nrm[0] * n, by + dy, B0[1] + D[1] * p + nrm[1] * n];
    inner.add(K.mesh(K.geo.tube([pr(-0.001, 0.0005, 0), pr(0.02, 0.0030, 0.0004), pr(FLn + 0.003, 0.0042, 0)], 0.0017, { seg: 20, rad: 10 }), steel));
    inner.add(K.mesh(new T.SphereGeometry(0.0017, 10, 8), steel, { pos: pr(FLn + 0.003, 0.0042, 0) }));
    inner.add(K.mesh(new T.TorusGeometry(0.0038, 0.0016, 8, 20), steel, { pos: pr(0, 0, 0), rot: [PI / 2, 0, 0] }));
    // the origin is the centre of the footprint at rest
    const bb0 = new T.Box3().setFromObject(inner), ox = -(bb0.min.x + bb0.max.x) / 2, oz = -(bb0.min.z + bb0.max.z) / 2; inner.position.set(ox, 0, oz);
    const iH = Math.round(lerp(iTail, N - 1, 0.72));
    const PB = { hx: 0.07, hz: 0.06, rx: -0.10, rz: 0.08, ry: -0.3, sq: 0, b1: 0.02, b2: 0.005 };
    return {
      group: g, size: { coil: 2 * r1, W: WS, T: TH, length: LT, footprint: [bb0.max.x - bb0.min.x, bb0.max.z - bb0.min.z] },
      anchors: { centre: [0, WS / 2, 0], coil: [ox, WS / 2, oz], buckle: [ox + B0[0] + D[0] * FLn / 2, by, oz + B0[1] + D[1] * FLn / 2], holes: [ox + P[iH][0], 0.004, oz + P[iH][1]], tip: [ox + P[N - 1][0], 0.004, oz + P[N - 1][1]] },
      view: VW(o, { l: [0, 0.015, 0], d: 1.05, close: [-0.02, 0.02, 0.03] }),
      defaults: { fall: 1 },
      apply(s) { drop(body, s.fall, PB); },
      demo(s, t) { if (o && o.hold) return void Object.assign(s, o.hold); fallDemo(s, t); },
    };
  });
})();
