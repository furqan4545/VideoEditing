// derm.js (reel 40 v3): INSIDE the wrist, right under the watch, built for a vertical 9:16 frame (Ali on v2: "why the hell
// we have empty area? ... use the full vertical screen ... add muscle and tissues at the bottom ... bring everything to
// center").
//
// 'derm'  a block of living wrist you fly into. Seen from the cut face (camera on +X looking -X) it stacks top to bottom:
//         the skin's underside as a ceiling (wavy papillae, the watch's four green LEDs glowing through it, its four light
//         sensors as dark windows that blink when light comes back), the dermis (arterioles along the arm with capillary
//         loops rising into the papillae, dense collagen bundles, a sweat gland coil with its duct, a hair follicle), the
//         fat (packed yellow cells round a vein and an artery) and the muscle (red fascicles along the arm) as the floor.
//         The watch's light: soft green shafts from each LED and photons (bright beads with streaks) that scatter down; some
//         are swallowed by blood (green flash on the vessel), the rest climb back to a light sensor (it blinks).
//   Local frame = the hand's axes (X across the wrist, +X toward the thumb / the cut, Y up, Z along the arm toward the
//   elbow); origin = the skin surface right under the watch centre. Block: x -0.030..+0.016, z -0.036..+0.036, y 0..-0.022.
//   options: leds [[x, z] x4], pds [[x, z] x4] (local, on the skin)
//   state: rays 0..1 | pAbs 0..1 (share of the light swallowed this moment) | beat 0..1 (arterioles swell) | flow (1) |
//          slosh (m) | speed (photon trips a second, 0.6) | led 0..1 | shafts 0..1 | walls 0..1 (vessel walls; 0 = cells only)
//   API: inst.cellSpot() local point inside the vein for the blood-cell macro; inst.pdPoint(i); inst.ledPoint(i); inst.Y
(function () {
  const T = THREE;
  const C = c => new T.Color(c);
  const sm = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
  const fr = x => x - Math.floor(x);
  const hash = (a, b) => fr(Math.sin(a * 127.1 + b * 311.7) * 43758.5453);
  const soft = m => { m.userData.noAO = true; m.userData.noDepth = true; m.castShadow = false; m.receiveShadow = false; return m; };
  let RADIAL = null;
  const radial = () => RADIAL || (RADIAL = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d');
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.22, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t; })());
  // glows never write or test depth against the tissue (no hard-edged clipped squares)
  const sprite = (color, op = 0) => { const s = new T.Sprite(new T.SpriteMaterial({ map: radial(), color: C(color), transparent: true, opacity: op, depthWrite: false, depthTest: false, blending: T.AdditiveBlending, toneMapped: false })); soft(s); s.renderOrder = 30; return s; };
  const glowMat = (c, o = 0) => new T.MeshBasicMaterial({ color: C(c), transparent: true, opacity: o, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false });

  KIT.asset('derm', (K, o) => {
    const g = new T.Group(), R = OM.rng(5050);
    const X0 = -0.030, X1 = 0.016, Z0 = -0.036, Z1 = 0.036, W = X1 - X0, D = Z1 - Z0;
    const Y = { epi: -0.0006, derm: -0.0042, fat: -0.0105, fascia: -0.0113, floor: -0.022 };
    const LEDS = (o.leds || [[-0.0034, 0], [0, -0.0034], [0.0034, 0], [0, 0.0034]]).map(([x, z]) => K.V(x, Y.epi - 0.00012, z));
    const PDS = (o.pds || [[-0.0024, -0.0024], [-0.0024, 0.0024], [0.0024, 0.0024], [0.0024, -0.0024]]).map(([x, z]) => K.V(x, Y.epi - 0.00012, z));
    // ---------------------------------------------------------------- the ceiling: the skin's underside with papillae, lit green round each LED
    {
      const nx = 460, nz = 720, geo = new T.PlaneGeometry(W, D, nx, nz); geo.rotateX(Math.PI / 2); geo.translate((X0 + X1) / 2, 0, 0);
      const p = geo.attributes.position, cols = new Float32Array(p.count * 4), base = C('#dca094'), ridge = C('#fbe0d6'), led = C('#7dff9e'), pd = C('#20242a'), tc = new T.Color();
      for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i);
        // papillae: a field of soft bumps hanging down (cellular), 0.35 mm apart
        const cx = Math.round(x / 0.00062), cz = Math.round(z / 0.00062 + 0.5 * (cx & 1)); const jx = (hash(cx, cz) - 0.5) * 0.00024, jz = (hash(cz, cx) - 0.5) * 0.00024;
        const dx = x - (cx * 0.00062 + jx), dz = z - ((cz - 0.5 * (cx & 1)) * 0.00062 + jz), r = Math.hypot(dx, dz), bump = 0.5 + 0.5 * Math.cos(Math.PI * Math.min(1, r / 0.00029));
        p.setY(i, Y.epi - 0.00013 * bump * (0.75 + 0.5 * hash(cz, cx + 3)));
        tc.copy(base).lerp(ridge, bump * 0.5);
        let gl = 0; for (const L of LEDS) gl = Math.max(gl, Math.exp(-((x - L.x) ** 2 + (z - L.z) ** 2) / 0.0000030)); tc.lerp(led, 0.85 * gl);
        const rr = Math.hypot(x, z); cols[i * 4] = tc.r; cols[i * 4 + 1] = tc.g; cols[i * 4 + 2] = tc.b; cols[i * 4 + 3] = 0.28 + 0.72 * sm((rr - 0.010) / 0.010) + 0.25 * bump * (1 - sm((rr - 0.010) / 0.010)); }
      geo.setAttribute('color', new T.BufferAttribute(cols, 4)); geo.computeVertexNormals();
      const m = new T.Mesh(geo, new T.MeshStandardMaterial({ vertexColors: true, transparent: true, depthWrite: false, roughness: 0.42, side: T.DoubleSide, emissive: C('#4a1a14'), emissiveIntensity: 0.6 }));
      m.receiveShadow = false; m.castShadow = false; m.userData.noAO = true; m.renderOrder = 7; g.add(m);
    }
    // ---------------------------------------------------------------- vessels (3D curves), pulsing and full of cells
    const vessels = [];
    const discGeo = (() => { const prof = []; for (let i = 0; i <= 16; i++) { const x = i / 16, h = Math.sqrt(Math.max(0, 1 - x * x)) * (0.207 + 2.003 * x * x - 1.123 * x ** 4) * 0.5; prof.push(new T.Vector2(x, h)); }
      for (let i = 16; i >= 0; i--) prof.push(new T.Vector2(prof[i].x, -prof[i].y)); return new T.LatheGeometry(prof.filter((p, i, a) => !i || p.distanceTo(a[i - 1]) > 1e-9), 20); })();
    const cellMat = new T.MeshPhysicalMaterial({ color: C('#c8141f'), roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.2, sheen: 0.5, sheenColor: C('#ff6a74'), emissive: C('#3a0006') });
    const vessel = (pts, r, wallColor, nCells, amp, kind, speed) => {
      const curve = new T.CatmullRomCurve3(pts.map(p => K.V(p)), false, 'centripetal'), TS = Math.max(80, Math.round(curve.getLength() / 0.0005)), RS = 22;
      const geo = new T.TubeGeometry(curve, TS, r, RS, false), base = geo.attributes.position.array.slice(), centers = [];
      for (let i = 0; i <= TS; i++) centers.push(curve.getPointAt(i / TS));
      const inner = new T.Mesh(geo, new T.MeshStandardMaterial({ color: C(kind === 'vein' ? '#4a1030' : '#7a1018'), roughness: 0.5, transparent: true, opacity: 0.55, depthWrite: false, side: T.BackSide }));
      const wall = new T.Mesh(geo, new T.MeshPhysicalMaterial({ color: C(wallColor), roughness: 0.25, transparent: true, opacity: 0.62, envMapIntensity: 0.6, clearcoat: 0.6, clearcoatRoughness: 0.2, depthWrite: false, side: T.FrontSide }));
      wall.material.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n { float fz = 1.0 - abs(dot(normalize(vViewPosition), normal)); gl_FragColor.rgb += vec3(0.9, 0.35, 0.38) * pow(fz, 3.0) * 0.35; gl_FragColor.a = min(1.0, gl_FragColor.a + pow(fz, 2.0) * 0.3); }'); };
      soft(inner); soft(wall); inner.renderOrder = 3; wall.renderOrder = 6; g.add(inner); g.add(wall);
      const frames = curve.computeFrenetFrames(400, false), samp = curve.getSpacedPoints(400);
      const cells = new T.InstancedMesh(discGeo, cellMat, nCells); cells.castShadow = false; cells.receiveShadow = false; cells.renderOrder = 4; cells.frustumCulled = false; g.add(cells);
      const seeds = []; for (let i = 0; i < nCells; i++) seeds.push({ u: R(), rr: Math.sqrt(R()) * r * 0.62, a: R() * 6.283, ax: R() * 3, ay: R() * 3, sp: 0.75 + R() * 0.5 });
      const v = { curve, geo, base, centers, TS, RS, wall, inner, cells, seeds, r, amp, kind, frames, samp, speed, len: curve.getLength() }; vessels.push(v); return v;
    };
    const along = (n, f) => Array.from({ length: n + 1 }, (_, i) => f(Z0 - 0.003 + (D + 0.006) * i / n));
    // the two arterioles on the centre line (the same ones the cut opens), three more further in
    const art = [
      vessel(along(14, z => [0.0002 * Math.sin(z * 120), -0.0020 + 0.00022 * Math.sin(z * 160 + 0.5), z]), 0.00050, '#ff4655', 40, 0.55, 'small', 1.2),
      vessel(along(14, z => [0.0003 * Math.sin(z * 90 + 1), -0.0031 + 0.00022 * Math.sin(z * 160 + 2.1), z]), 0.00040, '#ff5562', 30, 0.55, 'small', 1.2),
      vessel(along(14, z => [-0.0062 + 0.0004 * Math.sin(z * 80), -0.0025 + 0.0003 * Math.sin(z * 140 + 1), z]), 0.00048, '#ff4655', 36, 0.30, 'small', 1.2),
      vessel(along(14, z => [-0.0125 + 0.0005 * Math.sin(z * 70 + 2), -0.0022 + 0.0003 * Math.sin(z * 130 + 3), z]), 0.00046, '#ff4655', 34, 0.30, 'small', 1.2),
      vessel(along(14, z => [-0.0095 + 0.0003 * Math.sin(z * 75 + 4), -0.0028 + 0.0003 * Math.sin(z * 120 + 1.5), z]), 0.00044, '#ff4655', 34, 0.30, 'small', 1.2)];
    const venule = vessel(along(14, z => [-0.0035 + 0.0004 * Math.sin(z * 60), -0.0037 + 0.0002 * Math.sin(z * 100), z]), 0.00058, '#9a3a6a', 40, 0.04, 'vein', 0.5);
    const vein = vessel(along(12, z => [0.0003 * Math.sin(z * 50), -0.0060 + 0.00022 * Math.sin(z * 160 + 4.0), z]), 0.0016, '#7a2a62', 130, 0.02, 'vein', 0.45);
    const artery = vessel(along(12, z => [0.0004 * Math.sin(z * 40 + 1), -0.0090 + 0.00022 * Math.sin(z * 160 + 1.2), z]), 0.00100, '#e8303c', 70, 0.14, 'artery', 1.0);
    const vein2 = vessel(along(12, z => [-0.0135 + 0.0006 * Math.sin(z * 45), -0.0072 + 0.0003 * Math.sin(z * 90), z]), 0.0013, '#7a2a62', 80, 0.02, 'vein', 0.45);
    // capillary loops: little arches from the arterioles up into the papillae
    const loops = [], loopMat = new T.MeshPhysicalMaterial({ color: C('#d8303e'), roughness: 0.35, clearcoat: 0.6, emissive: C('#2a0006') });
    for (const av of art.slice(0, 3)) for (let i = 0; i < 16; i++) {
      const u = (i + 0.5 + (R() - 0.5) * 0.6) / 16, p = av.curve.getPointAt(u), sp = 0.00012 + R() * 0.00008, top = Y.epi - 0.00012 - R() * 0.0001, dx = (R() - 0.5) * 0.0005;
      const pts = [[p.x - sp, p.y, p.z], [p.x - sp + dx * 0.3, (p.y + top) / 2, p.z + (R() - 0.5) * 0.0002], [p.x + dx * 0.6, top, p.z], [p.x + sp + dx * 0.3, (p.y + top) / 2, p.z + (R() - 0.5) * 0.0002], [p.x + sp, p.y, p.z]];
      const m = new T.Mesh(K.geo.tube(pts, 0.000038, { seg: 24, rad: 6 }), loopMat); soft(m); g.add(m); loops.push(m); }
    // collagen bundles: wavy pale strands everywhere in the dermis
    const fibMat = new T.MeshStandardMaterial({ color: C('#f1c3ba'), roughness: 0.6, transparent: true, opacity: 0.7, depthWrite: false });
    for (let i = 0; i < 110; i++) { const x0 = X0 + R() * W, y0 = Y.epi - 0.0005 - R() * (Y.epi - Y.derm - 0.0008), z0 = Z0 + R() * D, a = R() * 6.28, Ln = 0.004 + R() * 0.012, b = (R() - 0.5) * 0.4;
      const pts = []; for (let k = 0; k <= 8; k++) { const f = k / 8; pts.push([x0 + Math.cos(a) * Ln * f + Math.sin(f * 11 + i) * 0.00009, y0 + Math.sin(f * 7 + i) * 0.00014 + b * Ln * f * 0.1, z0 + Math.sin(a) * Ln * f + Math.cos(f * 9 + i) * 0.00009]); }
      const m = new T.Mesh(K.geo.tube(pts, 0.000018 + R() * 0.000022, { seg: 48, rad: 5 }), fibMat); soft(m); m.renderOrder = 5; g.add(m); }
    // a sweat gland (a coiled tube) and its duct spiralling up to the skin; a hair follicle with its hair
    const glandMat = new T.MeshPhysicalMaterial({ color: C('#f2b8b0'), roughness: 0.35, clearcoat: 0.5, emissive: C('#2a0e0c') });
    for (const [gx, gz] of (o.glands ? [[-0.0085, 0.006], [0.004, -0.009]] : [])) { const pts = [], cy = Y.derm + 0.0006;
      for (let k = 0; k <= 120; k++) { const a = k * 0.42, rr = 0.00045 + 0.00012 * Math.sin(k * 0.7); pts.push([gx + Math.cos(a) * rr, cy + Math.sin(k * 0.21) * 0.0003, gz + Math.sin(a) * rr]); }
      for (let k = 1; k <= 60; k++) { const f = k / 60, a = k * 0.55; pts.push([gx + Math.cos(a) * 0.00012, cy + 0.0003 + f * (Y.epi - cy - 0.0003), gz + Math.sin(a) * 0.00012]); }
      const m = new T.Mesh(K.geo.tube(pts, 0.00007, { seg: 600, rad: 6 }), glandMat); soft(m); g.add(m); }
    if (o.hair) { const base = K.V(-0.0045, Y.derm + 0.0004, 0.0105), tipP = K.V(-0.0032, Y.epi, 0.0080), fol = new T.Mesh(K.geo.tube([base.toArray(), base.clone().lerp(tipP, 0.5).toArray(), tipP.toArray()], 0.00022, { seg: 20, rad: 12 }), glandMat); soft(fol); g.add(fol);
      const bulb = new T.Mesh(new T.SphereGeometry(0.00034, 18, 12), glandMat); bulb.position.copy(base); soft(bulb); g.add(bulb);
      const hair = new T.Mesh(K.geo.tube([base.clone().lerp(tipP, 0.15).toArray(), tipP.toArray(), tipP.clone().add(K.V(0.0006, 0.0012, -0.0010)).toArray()], 0.00007, { seg: 20, rad: 6 }), new T.MeshStandardMaterial({ color: C('#2a1a14'), roughness: 0.4 })); soft(hair); g.add(hair); }
    // ---------------------------------------------------------------- fat: packed yellow cells (opaque, a warm glow from within, a bright rim)
    const fatMat = new T.MeshStandardMaterial({ color: C('#efcf86'), roughness: 0.38, emissive: C('#6a4410'), emissiveIntensity: 0.22, envMapIntensity: 0.4 });
    fatMat.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', '#include <dithering_fragment>\n { float fz = 1.0 - abs(dot(normalize(vViewPosition), normal)); gl_FragColor.rgb += vec3(0.45, 0.34, 0.12) * pow(fz, 3.0) * 0.28; }'); };
    { const nF = 4200, fat = new T.InstancedMesh(new T.IcosahedronGeometry(1, 2), fatMat, nF), M = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), p = new T.Vector3(); let n = 0;
      const far = (pt) => [vein, artery, vein2].every(v => { const u = fr((pt.z - Z0 + 0.003) / (D + 0.006)), c = v.curve.getPointAt(Math.min(1, Math.max(0, u))); return Math.hypot(pt.x - c.x, pt.y - c.y) > v.r + 0.00035; });
      for (let tries = 0; n < nF && tries < 60000; tries++) { const r = 0.00022 + R() * 0.00014; p.set(X0 + R() * (-0.003 - X0), Y.derm - 0.0004 - R() * (Y.derm - Y.fat - 0.0006), Z0 + R() * D); if (!far(p)) continue;
        sc.set(r, r * (0.82 + R() * 0.3), r * (0.9 + R() * 0.2)); q.setFromEuler(new T.Euler(R() * 3, R() * 3, R() * 3)); M.compose(p, q, sc); fat.setMatrixAt(n++, M); }
      fat.count = n; fat.castShadow = false; fat.receiveShadow = false; fat.userData.noAO = true; g.add(fat); }
    // fascia and the muscle floor: red fascicles along the arm
    { const fas = new T.Mesh(new T.PlaneGeometry(W, D), new T.MeshStandardMaterial({ color: C('#d9b3a8'), roughness: 0.85, envMapIntensity: 0.15, side: T.DoubleSide })); fas.rotation.x = -Math.PI / 2; fas.position.set((X0 + X1) / 2, Y.fat - 0.0002, 0); fas.userData.noAO = true; g.add(fas);
      const musMat = new T.MeshPhysicalMaterial({ color: C('#a8242c'), roughness: 0.36, clearcoat: 0.6, clearcoatRoughness: 0.25, sheen: 0.4, sheenColor: C('#ff8a8a'), emissive: C('#2a0204') });
      const fasG = new T.CylinderGeometry(1, 1, D + 0.004, 18, 1, true); fasG.rotateX(Math.PI / 2);
      const nM = 140, mus = new T.InstancedMesh(fasG, musMat, nM), M = new T.Matrix4(), q = new T.Quaternion(), sc = new T.Vector3(), p = new T.Vector3(); let n = 0;
      for (let row = 0; row < 4 && n < nM; row++) for (let x = X0 + R() * 0.001; x < X1 && n < nM; x += 0.0024 + R() * 0.0008) { const r = 0.0011 + R() * 0.0006;
        p.set(x, Y.fascia - r - row * 0.0021 - R() * 0.0004, (R() - 0.5) * 0.002); q.setFromEuler(new T.Euler((R() - 0.5) * 0.06, (R() - 0.5) * 0.08, 0)); sc.set(r, r * (0.85 + R() * 0.25), 1); M.compose(p, q, sc); mus.setMatrixAt(n++, M); }
      mus.count = n; mus.castShadow = false; mus.receiveShadow = false; mus.userData.noAO = true; g.add(mus);
      const deep = new T.Mesh(new T.PlaneGeometry(W, D), new T.MeshStandardMaterial({ color: C('#5a0e14'), roughness: 0.6 })); deep.rotation.x = -Math.PI / 2; deep.position.set((X0 + X1) / 2, Y.floor, 0); deep.userData.noAO = true; g.add(deep); }
    // ---------------------------------------------------------------- the light: shafts, then photon paths from the LEDs
    const shaftMat = () => new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false, uniforms: { uO: { value: 0 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying float vY; void main(){ vY = uv.y; vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float uO; varying vec3 vN; varying vec3 vV; varying float vY; void main(){ float f = abs(dot(vN, vV)); float a = pow(f, 2.2) * pow(vY, 1.6) * uO; gl_FragColor = vec4(vec3(0.30, 1.0, 0.50) * a, a); }' });
    const shafts = LEDS.map(L => { const G = new T.CylinderGeometry(0.00035, 0.0019, 0.0042, 40, 1, true); G.translate(0, -0.0021, 0);
      const m = new T.Mesh(G, shaftMat()); m.position.copy(L); soft(m); m.renderOrder = 8; g.add(m); return m; });
    const nearestOn = (v, p) => { let best = null, bd = 1e9; for (let i = 0; i <= 400; i += 2) { const s = v.samp[i], d = s.distanceToSquared(p); if (d < bd) { bd = d; best = s; } } return best.clone(); };
    const paths = [];
    LEDS.forEach((L0, li) => {
      for (let j = 0; j < 6; j++) {
        const r = OM.rng(700 + li * 37 + j * 11), back = j % 6 < 3, pts = [L0.clone()];
        let p = L0.clone(); const ang = r() * 6.283, out = 0.0004 + r() * 0.0007, n = 3 + Math.floor(r() * 2);
        for (let k = 0; k < n; k++) { p = p.clone().add(K.V(Math.cos(ang + (r() - 0.5) * 1.8) * out, -(0.0005 + r() * 0.0007) * (k === 0 ? 1.3 : (k % 2 ? 0.6 : 1)), Math.sin(ang + (r() - 0.5) * 1.8) * out)); p.y = Math.max(p.y, Y.derm + 0.0005); pts.push(p); }
        const deep = pts.reduce((a, b) => (b.y < a.y ? b : a));
        const av = art.concat([venule]).reduce((a, b) => (nearestOn(b, deep).distanceTo(deep) < nearestOn(a, deep).distanceTo(deep) ? b : a)), hit = nearestOn(av, deep).add(K.V(0, av.r * 0.7, 0));
        if (back) { const pd = PDS.reduce((a, b) => (b.distanceTo(p) < a.distanceTo(p) ? b : a)); const mid = p.clone().lerp(pd, 0.5); mid.y -= 0.0003; pts.push(mid, pd.clone()); }
        else pts.push(hit.clone());
        const cp = new T.CurvePath(); for (let k = 0; k < pts.length - 1; k++) cp.add(new T.LineCurve3(pts[k], pts[k + 1]));
        const sp = cp.getSpacedPoints(120), dI = sp.reduce((bi, q, i) => (q.y < sp[bi].y ? i : bi), 0);
        const trail = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(sp, false, 'catmullrom', 0), 120, 0.000022, 5, false), glowMat('#38ff7a')); soft(trail); trail.renderOrder = 9; g.add(trail);
        const photons = [0, 0.5].map(() => { const core = new T.Mesh(new T.SphereGeometry(0.00008, 12, 8), glowMat('#d8ffe4'));
          const sg = new T.CylinderGeometry(0.000035, 0.000005, 1, 8, 1, true); sg.translate(0, -0.5, 0); const streak = new T.Mesh(sg, glowMat('#40ff80'));
          const halo = sprite('#46ff86'); soft(core); soft(streak); core.renderOrder = 11; streak.renderOrder = 10; g.add(core); g.add(streak); g.add(halo); return { core, streak, halo }; });
        const flash = sprite('#7dffab'), ring = new T.Mesh(new T.RingGeometry(0.9, 1, 48), new T.MeshBasicMaterial({ color: C('#9dffc0'), transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: T.AdditiveBlending, toneMapped: false, side: T.DoubleSide }));
        soft(ring); ring.renderOrder = 31; g.add(flash); g.add(ring);
        const altFlash = sprite('#7dffab'); g.add(altFlash);
        paths.push({ back, sp, dI, trail, photons, flash, ring, altFlash, off: r(), end: sp[120].clone(), deep: sp[dI].clone(), hitCell: !back });
      } });
    if (o.pdBoxes) PDS.forEach(P => { const fm = new T.Mesh(new T.BoxGeometry(0.0011, 0.00008, 0.0009), new T.MeshStandardMaterial({ color: C('#bfb4ac'), roughness: 0.35, metalness: 0.3 })); fm.position.copy(P).add(K.V(0, 0.00002, 0)); g.add(fm);
      const gl = new T.Mesh(new T.BoxGeometry(0.00092, 0.0001, 0.00072), new T.MeshPhysicalMaterial({ color: C('#0e1116'), roughness: 0.12, clearcoat: 1, emissive: C('#0a3a1a'), emissiveIntensity: 0.6 })); gl.position.copy(P).add(K.V(0, -0.00001, 0)); g.add(gl); });
    const pdGlow = PDS.map(p => { const s = sprite('#b8ffcf'); s.position.copy(p).add(K.V(0, -0.00008, 0)); g.add(s); return s; });
    const ledGlow = LEDS.map(p => { const s = sprite('#5dff95'); s.position.copy(p).add(K.V(0, -0.00006, 0)); g.add(s); return s; });
    const hitCells = paths.filter(q => q.hitCell).map(q => { const m = new T.Mesh(discGeo, cellMat.clone()); m.scale.setScalar(0.00022); m.position.copy(q.end); m.rotation.set(R() * 3, R() * 3, 0); g.add(m); q.cellMesh = m; return m; });
    const M4 = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), P = new T.Vector3(), S = new T.Vector3(), UP = new T.Vector3(0, 1, 0), DIR = new T.Vector3(), green = C('#2bff6a'), baseEm = C('#3a0006');
    return {
      group: g, Y, size: { x0: X0, x1: X1, z0: Z0, z1: Z1 },
      cellSpot: (u = 0.5) => vein.curve.getPointAt(u).toArray(), veinR: vein.r,
      pdPoint: i => PDS[i].toArray(), ledPoint: i => LEDS[i].toArray(),
      view: { l: [0, -0.004, 0], d: 0.016, close: [0, -0.003, 0], keys: o.keys },
      defaults: { rays: 0, pAbs: 0.3, beat: 0, flow: 1, slosh: 0, speed: 0.6, led: 1, shafts: 1, walls: 1, veinCells: 1, lightBack: -1, tunnel: 0 },
      apply(s, t) {
        for (const v of vessels) {
          const b = 1 + v.amp * s.beat, pos = v.geo.attributes.position.array, rs1 = v.RS + 1;
          if (v.amp > 0.05 && v.lastB !== b) { v.lastB = b; for (let i = 0; i <= v.TS; i++) { const c = v.centers[i]; for (let j = 0; j < rs1; j++) { const k = (i * rs1 + j) * 3;
            pos[k] = c.x + (v.base[k] - c.x) * b; pos[k + 1] = c.y + (v.base[k + 1] - c.y) * b; pos[k + 2] = c.z + (v.base[k + 2] - c.z) * b; } } v.geo.attributes.position.needsUpdate = true; }
          v.wall.material.opacity = 0.62 * s.walls; v.inner.material.opacity = (v === vein ? 0.55 + 0.43 * s.tunnel : 0.55) * s.walls; v.wall.visible = v.inner.visible = s.walls > 0.01;
          const slo = v.kind === 'vein' ? s.slosh : v.kind === 'artery' ? s.slosh * 0.4 : s.slosh * 0.2, dirn = v.kind === 'vein' ? 1 : -1;
          for (let i = 0; i < v.seeds.length; i++) { const q = v.seeds[i], u = fr(q.u + dirn * t * s.flow * 0.005 * q.sp * v.speed / v.len + slo / v.len), si = Math.min(400, Math.round(u * 400));
            const c = v.samp[si], N = v.frames.normals[si], B = v.frames.binormals[si], rr = q.rr * b;
            P.set(c.x + (N.x * Math.cos(q.a) + B.x * Math.sin(q.a)) * rr, c.y + (N.y * Math.cos(q.a) + B.y * Math.sin(q.a)) * rr, c.z + (N.z * Math.cos(q.a) + B.z * Math.sin(q.a)) * rr);
            E.set(q.ax + t * 0.7 * q.sp, q.ay + t * 0.3, 0); Q.setFromEuler(E); S.setScalar(v.r * (v.kind === 'small' ? 0.55 : 0.4)); M4.compose(P, Q, S); v.cells.setMatrixAt(i, M4); }
          v.cells.instanceMatrix.needsUpdate = true; v.cells.visible = v === vein ? s.veinCells > 0.5 : true;
        }
        for (const l of loops) l.scale.set(1, 1 + 0.06 * s.beat, 1);
        const ra = s.rays; let pdHit = [0, 0, 0, 0];
        shafts.forEach(m => { m.material.uniforms.uO.value = 0.34 * ra * s.shafts * s.led * (0.85 + 0.15 * Math.sin(t * 44)); });
        for (const q of paths) {
          q.trail.material.opacity = ra * 0.06;
          let flashK = 0, altK = 0;
          q.photons.forEach((ph, k) => {
            const ph0 = t * s.speed + q.off + k * 0.5, trip = Math.floor(ph0), u = ph0 - trip, i = Math.min(120, Math.floor(u * 120));
            const swallowedEarly = q.back && hash(trip * 2 + k, q.off * 97) < s.pAbs;
            const stopAt = swallowedEarly ? q.dI : 120, vis = i <= stopAt;
            const a = sm(u / 0.05) * (vis ? 1 : 0) * ra;
            const pA = q.sp[Math.min(i, stopAt)], pB = q.sp[Math.min(Math.max(0, i - 7), stopAt)];
            ph.core.position.copy(pA); ph.halo.position.copy(pA); ph.halo.scale.setScalar(0.00055);
            DIR.copy(pA).sub(pB); const Ln = DIR.length(); ph.streak.position.copy(pA);
            if (Ln > 1e-7) { ph.streak.quaternion.setFromUnitVectors(UP, DIR.multiplyScalar(-1 / Ln)); ph.streak.scale.set(1, Math.max(1e-5, Math.min(0.0009, Ln * 1.5)), 1); }
            const fadeEnd = q.back && !swallowedEarly ? 1 : sm((stopAt / 120 - u) / 0.04 + 0.2);
            ph.core.material.opacity = a * 0.95 * fadeEnd; ph.streak.material.opacity = a * 0.7 * fadeEnd; ph.halo.material.opacity = a * 0.3 * fadeEnd;
            const arrive = Math.exp(-Math.pow((u - stopAt / 120) / 0.035, 2)) * ra;
            if (!q.back) flashK = Math.max(flashK, arrive);
            else if (swallowedEarly) altK = Math.max(altK, arrive);
            else { const pi = PDS.reduce((bi, p, ii) => (p.distanceToSquared(q.end) < PDS[bi].distanceToSquared(q.end) ? ii : bi), 0); pdHit[pi] = Math.max(pdHit[pi], arrive); }
          });
          q.flash.position.copy(q.end); q.flash.scale.setScalar(0.0004 + 0.0014 * flashK); q.flash.material.opacity = flashK * 0.75;
          q.ring.position.copy(q.end); q.ring.lookAt(K.camera.position); q.ring.scale.setScalar(0.0002 + 0.0011 * (1 - flashK)); q.ring.material.opacity = flashK * 0.22;
          q.altFlash.position.copy(q.deep); q.altFlash.scale.setScalar(0.0004 + 0.0012 * altK); q.altFlash.material.opacity = altK * 0.7;
          if (q.cellMesh) q.cellMesh.material.emissive.copy(green).multiplyScalar(0.9 * flashK).add(baseEm);
        }
        pdGlow.forEach((m, i) => { const lb = s.lightBack >= 0 ? s.lightBack : 0.4; const h = Math.max(pdHit[i] * (s.lightBack >= 0 ? 0.5 + 0.5 * lb : 1), 0); m.material.opacity = ra * (0.1 + 0.55 * lb * (s.lightBack >= 0 ? 1 : 0) + 0.5 * h); m.scale.setScalar(0.0006 + 0.0016 * Math.max(h, s.lightBack >= 0 ? lb * 0.8 : 0)); });
        ledGlow.forEach(m => { m.material.opacity = ra * s.led * 0.75; m.scale.setScalar(0.0026); });
      },
      demo(s, t) { s.rays = sm(t / 1.0); s.beat = Math.pow(Math.max(0, Math.sin(t * 2.4)), 6); s.pAbs = 0.25 + 0.6 * s.beat; K.inside = 1; },
    };
  });
})();
