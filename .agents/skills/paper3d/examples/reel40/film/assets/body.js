// body.js: reel 40's own models, dark cinematic look (cine.js). Metres, Y up.
//
// 'wrist'    a cut-open slab of wrist under the watch, seen from the front (+Z) cut face: skin, dermis with tiny blood
//            vessels (an arteriole and capillary loops), fat, the artery and the vein, muscle. Vessels are glassy tubes laid
//            on the cut face with blood cells flowing inside; the watch's green light drawn as glowing zig-zag rays.
//            Local origin = the skin surface at the centre of the cut face (y = 0 is the skin top, the slab goes down to
//            y = -size.depth, back to z = -size.d). The watch sits on top with its side flush with the cut face.
//   options: w (along the arm, 0.14), d (into the arm, 0.05), leds ([-0.0045, 0.0045]), pds ([-0.0115, 0.0115])
//   state: rays 0..1 | beat 0..1 (vessels bulge, light gets swallowed, less comes back) | flow (blood speed, 1) |
//          slosh (m, the blood in the vessels rocks by this much) | glow 0..1 (green wash under the watch) |
//          pd 0..1 (light-sensor glow) | absorb 0..1 (extra: show the swallowed rays ending in a small flash)
//   API: inst.pdPoint(i) / inst.ledPoint(i) local points on the skin; inst.arteriole() local y of the small vessel
// 'cell'     one red blood cell (biconcave disc, real shape) for the macro shot, a white beam that hits it, red light that
//            bounces back, green light that sinks in and is swallowed. Local origin = the cell centre, disc faces +Z.
//   options: r (cell radius, 0.004), crowd (n other cells around, 7)
//   state: beam 0..1 (white beam arrives) | red 0..1 (red bounces out) | green 0..1 (green goes in) | swallow 0..1 (green dies) | spin
// 'trace'    a glowing signal line floating in the dark (the light the sensor gets back). Local origin = the left end centre,
//            the line runs along +X, faces +Z.
//   options: w (0.12), h (0.02), span (seconds shown, 4), kind 'ppg' | 'steps', color, bpm (155), spm (165), th (0.0007)
//   state: o 0..1 | grow 0..1 (drawn left to right) | scroll (signal seconds at the left edge) | mix 0..1 (adds the step
//          rhythm to a ppg line: messy) | amp (1) | ticks 0..1 (a dot on every beat) | head 0..1 (glowing pen at the tip)
// 'hose'     a garden hose (with its brass end) that bulges as water pulses through it; can turn into a blood vessel.
//   options: kind 'new' | 'old', len (0.42), r (0.0095)
//   state: o 0..1 | amp (bulge size; new 0.32, old 0.04 by default) | speed (pulses a second, 1.3) | vessel 0..1 (turns red,
//          the brass end shrinks away)
// 'cal30'    a 30-day calendar in the dark: 30 glass tiles that light one a day.  state: fill 0..30 | alert 0..1 (tiles warm red)
// 'road'     a dark asphalt road along +Z for the runner (lane dashes, edge lines).  options: len (240), w (7)
// 'heartglow' a softly glowing red heart that beats.  options: r (0.06).  state: o 0..1 | beat 0..1
(function () {
  const T = THREE;
  const C = c => new T.Color(c);
  const sm = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
  const fr = x => x - Math.floor(x);
  const GREEN = '#2bff6a';
  const addGlow = (color, opacity = 1) => new T.MeshBasicMaterial({ color: C(color), transparent: true, opacity, depthWrite: false, toneMapped: false, blending: T.AdditiveBlending });
  const radialTex = (inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)', size = 256) => {
    const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d');
    const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2); gr.addColorStop(0, inner); gr.addColorStop(0.35, inner.replace(/,[\d.]+\)$/, ',0.55)')); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.fillRect(0, 0, size, size); const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t; };
  const soft = m => { m.userData.noAO = true; m.userData.noDepth = true; m.castShadow = false; m.receiveShadow = false; return m; };

  // ======================================================================== wrist
  KIT.asset('wrist', (K, o) => {
    const g = new T.Group(), R = OM.rng(40);
    const W = o.w || 0.14, D = o.d || 0.05;
    const yE = -0.0008, yD = -0.0050, yF = -0.0150, yB = -0.0215;        // bottoms of epidermis, dermis, fat, muscle
    const PX = 22000;                                                     // canvas pixels per metre
    const LEDS = o.leds || [-0.0045, 0.0045], PDS = o.pds || [-0.0115, 0.0115];
    // ---- the cut face: painted tissue layers (lit, so the key light shades it like a real slice)
    const face = K.canvasPlane(W, -yB, PX, (c, w, h) => {
      const Y = y => -y * PX, X = x => (x + W / 2) * PX, r = OM.rng(7);
      // muscle
      c.fillStyle = '#4a1016'; c.fillRect(0, Y(yF), w, h - Y(yF));
      for (let i = 0; i < 260; i++) { const y = Y(yF) + r() * (h - Y(yF)); c.strokeStyle = `rgba(255,${120 + r() * 60},${120 + r() * 40},${0.05 + r() * 0.09})`; c.lineWidth = 0.8 + r() * 1.6; c.beginPath(); c.moveTo(0, y); for (let x = 0; x <= w; x += 60) c.lineTo(x, y + Math.sin(x * 0.01 + i) * 2.5); c.stroke(); }
      const mg = c.createLinearGradient(0, Y(yF), 0, h); mg.addColorStop(0, 'rgba(0,0,0,0)'); mg.addColorStop(1, 'rgba(0,0,0,0.45)'); c.fillStyle = mg; c.fillRect(0, Y(yF), w, h - Y(yF));
      // fat: lobules of round cells between thin pink septa
      c.fillStyle = '#5a3a2a'; c.fillRect(0, Y(yD), w, Y(yF) - Y(yD));
      for (let gy = Y(yD) + 10; gy < Y(yF) + 6; gy += 23) for (let gx = -10; gx < w + 20; gx += 25) {
        const x = gx + (r() - 0.5) * 12 + ((gy / 23) % 2) * 12, y = gy + (r() - 0.5) * 9, rr = 10 + r() * 5;
        const cg = c.createRadialGradient(x - rr * 0.3, y - rr * 0.35, rr * 0.1, x, y, rr); cg.addColorStop(0, '#f6dc9a'); cg.addColorStop(0.7, '#d9b062'); cg.addColorStop(1, '#a8783a');
        c.fillStyle = cg; c.beginPath(); c.ellipse(x, y, rr, rr * (0.86 + r() * 0.2), r() * 3, 0, 7); c.fill(); }
      // dermis: rose, with wavy collagen fibres
      c.fillStyle = '#b4646a'; c.fillRect(0, Y(yE), w, Y(yD) - Y(yE) + 4);
      for (let i = 0; i < 420; i++) { const x = r() * w, y = Y(yE) + 6 + r() * (Y(yD) - Y(yE) - 6), L = 30 + r() * 70, a = (r() - 0.5) * 0.6;
        c.strokeStyle = `rgba(255,226,222,${0.08 + r() * 0.12})`; c.lineWidth = 1 + r() * 1.5; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + L * 0.5, y + Math.sin(a) * L * 0.5 + (r() - 0.5) * 10, x + L * Math.cos(a), y + L * Math.sin(a)); c.stroke(); }
      const dg = c.createLinearGradient(0, Y(yE), 0, Y(yD)); dg.addColorStop(0, 'rgba(255,200,190,0.18)'); dg.addColorStop(1, 'rgba(60,0,10,0.22)'); c.fillStyle = dg; c.fillRect(0, Y(yE), w, Y(yD) - Y(yE));
      // the fat/dermis edge: a soft irregular line
      c.strokeStyle = 'rgba(70,20,20,0.5)'; c.lineWidth = 3; c.beginPath(); for (let x = 0; x <= w; x += 20) c.lineTo(x, Y(yD) + Math.sin(x * 0.02) * 4 + (r() - 0.5) * 3); c.stroke();
      // epidermis: skin tone, wavy bottom (the papillae), a pale top layer
      c.fillStyle = '#d6a283'; c.beginPath(); c.moveTo(0, 0); c.lineTo(w, 0);
      for (let x = w; x >= 0; x -= 8) c.lineTo(x, Y(yE) + 5 + Math.sin(x * 0.045) * 5); c.closePath(); c.fill();
      c.fillStyle = 'rgba(255,236,220,0.55)'; c.fillRect(0, 0, w, 3);
      c.strokeStyle = 'rgba(120,60,40,0.25)'; c.lineWidth = 1; for (let i = 0; i < 90; i++) { const x = r() * w, y = 4 + r() * (Y(yE) - 4); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 6 + r() * 10, y); c.stroke(); }
    }, { lit: true });
    face.position.set(0, yB / 2, 0); face.receiveShadow = true; face.material.roughness = 0.72; g.add(face);
    // ---- the top skin, and the slab body behind the face
    const top = K.canvasPlane(W, D, 6000, (c, w, h) => { const r = OM.rng(9); c.fillStyle = '#c9906f'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 1800; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '120,70,50' : '255,225,205'},${0.05 + r() * 0.07})`; c.beginPath(); c.arc(r() * w, r() * h, 0.6 + r() * 1.4, 0, 7); c.fill(); }
      for (let i = 0; i < 70; i++) { c.strokeStyle = 'rgba(110,62,44,0.10)'; c.lineWidth = 1; const x = r() * w, y = r() * h; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 20); c.stroke(); } }, { lit: true });
    top.rotation.x = -Math.PI / 2; top.position.set(0, 0, -D / 2); top.material.roughness = 0.55; top.receiveShadow = true; g.add(top);
    const body = K.mesh(K.geo.box(W, -yB - 0.0004, D - 0.0004), K.mat.clay('#3b1216', 0.8), { pos: [0, yB / 2 - 0.0002, -D / 2 - 0.0002] }); g.add(body);
    // ---- vessels: glassy tubes along X laid on the cut face, blood cells inside
    const vessels = [];
    const vessel = (y, r, color, n, amp, kind) => {
      const grp = new T.Group(); grp.position.set(0, y, 0);
      const wall = new T.Mesh(new T.CylinderGeometry(r, r, W, 48, 1, true), new T.MeshPhysicalMaterial({ color: C(color), roughness: 0.5, transparent: true, opacity: 0.5, clearcoat: 0.25, clearcoatRoughness: 0.4, depthWrite: false, side: T.FrontSide, envMapIntensity: 0.4 }));
      wall.rotation.z = Math.PI / 2; soft(wall); wall.renderOrder = 3; grp.add(wall);
      const lumen = new T.Mesh(new T.CylinderGeometry(r * 0.93, r * 0.93, W, 32, 1, true), new T.MeshStandardMaterial({ color: C(kind === 'vein' ? '#3a0710' : '#5c0a14'), roughness: 0.6, side: T.BackSide }));
      lumen.rotation.z = Math.PI / 2; grp.add(lumen);
      const disc = new T.CylinderGeometry(r * 0.32, r * 0.32, r * 0.12, 18); disc.rotateX(Math.PI / 2);
      const cells = new T.InstancedMesh(disc, new T.MeshStandardMaterial({ color: C(kind === 'vein' ? '#8e1222' : '#d01c2c'), roughness: 0.35, metalness: 0 }), n);
      cells.castShadow = false; cells.receiveShadow = false; grp.add(cells);
      const seeds = []; for (let i = 0; i < n; i++) seeds.push({ x: R(), rr: Math.sqrt(R()) * r * 0.62, a: R() * 6.283, ax: R() * 3, ay: R() * 3, sp: 0.7 + R() * 0.6 });
      g.add(grp); const v = { grp, wall, cells, seeds, r, amp, kind }; vessels.push(v); return v;
    };
    const vein = vessel(-0.0118, 0.0027, '#7a2a4a', 70, 0.02, 'vein');
    const artery = vessel(-0.0085, 0.0015, '#e0303c', 38, 0.16, 'artery');
    const arteriole = vessel(-0.0031, 0.00062, '#ff4050', 30, 0.34, 'small');
    // capillary loops from the arteriole up toward the skin
    const loops = [];
    const loopMat = new T.MeshPhysicalMaterial({ color: C('#ff5664'), roughness: 0.3, transparent: true, opacity: 0.75, clearcoat: 1, depthWrite: false });
    for (let i = 0; i < 15; i++) { const x0 = -W / 2 + 0.006 + i * (W - 0.012) / 14 + (R() - 0.5) * 0.002, hgt = 0.0016 + R() * 0.0005, sp = 0.0006 + R() * 0.0003;
      const pts = [[x0 - sp, -0.0031, 0], [x0 - sp * 0.9, -0.0031 + hgt * 0.6, 0.0002], [x0, -0.0031 + hgt, 0.0003], [x0 + sp * 0.9, -0.0031 + hgt * 0.6, 0.0002], [x0 + sp, -0.0031, 0]];
      const m = new T.Mesh(K.geo.tube(pts, 0.00022, { seg: 40, rad: 8 }), loopMat); soft(m); m.renderOrder = 3; g.add(m); loops.push({ m, x0 }); }
    // ---- the green light: zig-zag rays in front of the cut face, and photons that travel along them
    const ZR = 0.0009, rays = [];
    const rayMat = () => addGlow(GREEN, 0.0), beadMat = () => addGlow('#b9ffd0', 0.0);
    const mkPath = (pts) => { const cp = new T.CurvePath(); for (let i = 0; i < pts.length - 1; i++) cp.add(new T.LineCurve3(K.V(pts[i]), K.V(pts[i + 1]))); return cp; };
    const capTop = loops.map(l => l.x0);
    let pi = 0;
    for (const xl of LEDS) for (let j = 0; j < 4; j++) {
      const back = j !== 1 && j !== 3, dir = (j % 2 ? 1 : -1) * (xl < 0 ? 1 : -1) * (back ? -1 : 1) * -1, r = OM.rng(100 + pi++);
      const pts = [[xl, 0, ZR]]; let x = xl;
      if (back) {                                   // down into the dermis, bouncing, and back up into the nearest light sensor
        const xp = PDS.reduce((a, b) => Math.abs(b - xl) < Math.abs(a - xl) ? b : a) + (r() - 0.5) * 0.0012, n = 3 + Math.floor(r() * 2), stepx = (xp - xl) / (n + 1);
        for (let k = 1; k <= n; k++) { x = xl + stepx * k + (r() - 0.5) * 0.0008; const y = -(0.0012 + r() * 0.0032) * (k % 2 ? 1 : 0.62); pts.push([x, y, ZR]); }
        pts.push([xp, 0, ZR]);
      } else {                                      // down until it hits a tiny blood vessel and is swallowed
        const tgt = capTop.reduce((a, b) => Math.abs(b - (xl + 0.004 * (j === 1 ? -1 : 1))) < Math.abs(a - (xl + 0.004 * (j === 1 ? -1 : 1))) ? b : a);
        pts.push([xl + (tgt - xl) * 0.45 + (r() - 0.5) * 0.001, -0.0026 - r() * 0.0012, ZR]); pts.push([tgt, -0.0016, ZR]);
      }
      const cp = mkPath(pts), sp = cp.getSpacedPoints(80), L = cp.getLength();
      // split a returning ray where it starts its last climb, so the way back can fade on its own
      const cut = back ? Math.round(80 * (1 - (Math.hypot(pts[pts.length - 1][0] - pts[pts.length - 2][0], pts[pts.length - 1][1] - pts[pts.length - 2][1]) / L))) : 80;
      const seg = (a, b) => { const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(sp.slice(a, b + 1), false, 'centripetal', 0), Math.max(8, (b - a) * 2), 0.00011, 6, false), rayMat()); soft(m); m.renderOrder = 6; g.add(m); return m; };
      const down = seg(0, Math.min(cut, 80)), up = back && cut < 80 ? seg(cut, 80) : null;
      const beads = [0].map(() => { const m = new T.Mesh(new T.SphereGeometry(0.0002, 12, 8), beadMat()); soft(m); m.renderOrder = 7; g.add(m); return m; });
      const halo = new T.Mesh(new T.PlaneGeometry(0.0016, 0.0016), new T.MeshBasicMaterial({ map: radialTex('rgba(80,255,140,0.9)'), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false })); soft(halo); halo.position.copy(sp[80]); halo.renderOrder = 7; g.add(halo);
      rays.push({ back, sp, cut, down, up, beads, halo, off: r() });
    }
    // ---- green wash under the watch and the light sensors' glow
    const wash = new T.Mesh(new T.PlaneGeometry(0.034, 0.012), new T.MeshBasicMaterial({ map: radialTex('rgba(60,255,120,0.9)'), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
    wash.position.set(0, -0.0022, 0.0006); soft(wash); wash.renderOrder = 4; g.add(wash);
    const pdGlow = PDS.map(x => { const m = new T.Mesh(new T.PlaneGeometry(0.004, 0.0022), new T.MeshBasicMaterial({ map: radialTex('rgba(150,255,190,1)'), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false })); m.position.set(x, 0.0002, ZR + 0.0002); soft(m); m.renderOrder = 8; g.add(m); return m; });
    const M4 = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), P = new T.Vector3(), S1 = new T.Vector3(1, 1, 1);
    return {
      group: g, size: { w: W, d: D, depth: -yB, epi: -yE, derm: -yD, fat: -yF },
      anchors: { centre: [0, 0, 0], arteriole: [0, -0.0031, 0], artery: [0, -0.0085, 0], vein: [0, -0.0118, 0], led0: [LEDS[0], 0, 0], pd0: [PDS[0], 0, 0] },
      ledPoint: i => [LEDS[i], 0, ZR], pdPoint: i => [PDS[i], 0, ZR], arteriole: () => -0.0031,
      view: { l: [0, -0.006, 0], d: 0.09, close: [-0.006, -0.003, 0] },
      defaults: { rays: 0, beat: 0, flow: 1, slosh: 0, glow: 0, pd: 0, absorb: 0 },
      apply(s, t) {
        // vessels: bulge with the beat, cells flow (and rock with the arm)
        for (const v of vessels) {
          const b = 1 + v.amp * s.beat; v.wall.scale.set(b, 1, b); v.grp.children[1].scale.set(b, 1, b);
          const slo = v.kind === 'vein' ? s.slosh : v.kind === 'artery' ? s.slosh * 0.35 : s.slosh * 0.15;
          for (let i = 0; i < v.seeds.length; i++) { const q = v.seeds[i];
            const x = fr(q.x + t * s.flow * 0.012 * q.sp * (v.kind === 'vein' ? -0.5 : 1) / W + slo / W) * W - W / 2;
            P.set(x, Math.sin(q.a) * q.rr * b, Math.abs(Math.cos(q.a)) * q.rr * b * 0.9 + v.r * 0.05); E.set(q.ax + t * 0.6 * q.sp, q.ay, 0); Q.setFromEuler(E);
            M4.compose(P, Q, S1); v.cells.setMatrixAt(i, M4); }
          v.cells.instanceMatrix.needsUpdate = true;
        }
        for (const l of loops) l.m.scale.set(1, 1 + 0.25 * s.beat, 1 + 0.6 * s.beat);
        // light: rays draw in, photons travel; on a beat more is swallowed and less comes back
        const ra = s.rays;
        for (const r of rays) {
          const lessBack = r.back ? (1 - 0.78 * s.beat) : 1;
          r.down.material.opacity = ra * 0.55; if (r.up) r.up.material.opacity = ra * 0.55 * lessBack;
          r.beads.forEach((m, k) => { const f = fr(t * 0.45 + r.off), i = Math.min(80, Math.round(f * 80)); m.position.copy(r.sp[i]);
            let op = ra * sm(f / 0.06) * (r.back ? (i > r.cut ? lessBack : 1) * sm((1 - f) / 0.05) : sm((1 - f) / 0.18)); m.material.opacity = op; });
          r.halo.material.opacity = r.back ? 0 : ra * (0.35 + 0.65 * Math.max(s.absorb, s.beat)) * (0.6 + 0.4 * Math.sin(t * 9 + r.off * 6));
        }
        wash.material.opacity = s.glow * 0.42;
        pdGlow.forEach(m => m.material.opacity = s.pd * (1 - 0.72 * s.beat));
      },
      demo(s, t) { s.rays = sm(t / 1.5); s.glow = s.rays; s.pd = s.rays; s.beat = t > 4 ? Math.pow(Math.max(0, Math.sin(t * 2.6)), 6) : 0; s.slosh = t > 8 ? 0.006 * Math.sin(t * 4.6) : 0; },
    };
  });

  // ======================================================================== cell
  KIT.asset('cell', (K, o) => {
    const g = new T.Group(), Rc = o.r || 0.004, Rr = OM.rng(5);
    // Evans-Fung shape: half-thickness h(r) = R sqrt(1-x^2)(0.207 + 2.003x^2 - 1.123x^4), x = r/R
    const prof = []; const N = 40;
    for (let i = 0; i <= N; i++) { const x = i / N, h = Rc * Math.sqrt(Math.max(0, 1 - x * x)) * (0.207 + 2.003 * x * x - 1.123 * x ** 4) * 0.5; prof.push(new T.Vector2(x * Rc, h)); }
    for (let i = N; i >= 0; i--) { const p = prof[i]; prof.push(new T.Vector2(p.x, -p.y)); }
    const cellGeo = new T.LatheGeometry(prof.filter((p, i, a) => i === 0 || p.distanceTo(a[i - 1]) > 1e-9), 96); cellGeo.rotateX(Math.PI / 2);
    const cellMat = new T.MeshPhysicalMaterial({ color: C('#b01020'), roughness: 0.32, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.25, sheen: 0.6, sheenColor: C('#ff6070'), emissive: C('#2a0005') });
    const main = K.mesh(cellGeo, cellMat); g.add(main);
    const SPR = o.spread ?? 1, crowd = []; for (let i = 0; i < (o.crowd ?? 7); i++) { const m = K.mesh(cellGeo, cellMat, { pos: [(Rr() - 0.5) * Rc * 9 * SPR, (Rr() - 0.5) * Rc * 11 * SPR, -Rc * (1.5 + Rr() * 6)], rot: [Rr() * 3, Rr() * 3, 0], scale: 0.85 + Rr() * 0.3 }); g.add(m); crowd.push(m); }
    // light: a white beam from the upper left, red rays out toward the camera, green rays into the cell
    const hit = new T.Vector3(-Rc * 0.35, Rc * 0.42, Rc * 0.16);
    const ray = (dir, len, color, r) => { const geo = new T.CylinderGeometry(r, r, 1, 16, 1, true); geo.translate(0, 0.5, 0); const m = new T.Mesh(geo, addGlow(color, 0)); soft(m); m.renderOrder = 8;
      m.position.copy(hit); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), K.V(dir).normalize()); m.userData.len = len; m.scale.set(1, 1e-4, 1); g.add(m); return m; };
    const beamDir = K.V(0.9, -0.62, -0.35).normalize(), beamLen = Rc * 9;
    const beam = new T.Mesh((() => { const geo = new T.CylinderGeometry(Rc * 0.035, Rc * 0.035, 1, 24, 1, true); geo.translate(0, -0.5, 0); return geo; })(), addGlow('#ffffff', 0)); soft(beam); beam.renderOrder = 8;
    beam.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), beamDir.clone().negate()); g.add(beam);
    const beamHalo = new T.Mesh((() => { const geo = new T.CylinderGeometry(Rc * 0.1, Rc * 0.1, 1, 24, 1, true); geo.translate(0, -0.5, 0); return geo; })(), addGlow('#cfe8ff', 0)); soft(beamHalo); beamHalo.quaternion.copy(beam.quaternion); g.add(beamHalo);
    const reds = [[-0.55, 0.55, 1], [-0.15, 0.85, 0.9], [-0.85, 0.2, 0.75]].map(d => ray(d, Rc * 6.5, '#ff2a3a', Rc * 0.03));
    const greens = [[0.25, -0.35, -1], [0.05, -0.15, -1], [0.4, -0.05, -1]].map(d => ray(d, Rc * 0.9, GREEN, Rc * 0.03));
    const flash = new T.Mesh(new T.PlaneGeometry(Rc * 0.9, Rc * 0.9), new T.MeshBasicMaterial({ map: radialTex('rgba(255,255,255,1)'), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
    flash.position.copy(hit).add(K.V(0, 0, Rc * 0.05)); soft(flash); flash.renderOrder = 9; g.add(flash);
    const gin = new T.Mesh(new T.PlaneGeometry(Rc * 1.4, Rc * 1.4), new T.MeshBasicMaterial({ map: radialTex('rgba(60,255,120,1)'), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
    gin.position.copy(hit).add(K.V(Rc * 0.1, -Rc * 0.15, -Rc * 0.05)); soft(gin); gin.renderOrder = 9; g.add(gin);
    return {
      group: g, size: { r: Rc }, anchors: { hit: hit.toArray(), centre: [0, 0, 0] },
      view: { l: [0, 0, 0], d: Rc * 8, close: [0, 0, 0] },
      defaults: { beam: 0, red: 0, green: 0, swallow: 0, spin: 0 },
      apply(s, t) {
        main.rotation.set(0.85 + 0.05 * Math.sin(t * 0.4), -0.45 + s.spin, 0.2);
        crowd.forEach((m, i) => { m.rotation.z = t * 0.05 * (i % 2 ? 1 : -1); });
        const b = sm(s.beam); beam.position.copy(hit).addScaledVector(beamDir, -beamLen); beam.scale.set(1, Math.max(1e-4, beamLen * b), 1); beam.material.opacity = b > 0.001 ? 0.8 : 0;
        beamHalo.position.copy(beam.position); beamHalo.scale.copy(beam.scale); beamHalo.material.opacity = b > 0.001 ? 0.12 : 0;
        flash.material.opacity = sm(s.beam * 4 - 3) * (0.28 + 0.1 * Math.sin(t * 7));
        reds.forEach((m, i) => { const k = sm(s.red * 1.3 - i * 0.15); m.scale.set(1, Math.max(1e-4, m.userData.len * k), 1); m.material.opacity = k > 0.001 ? 0.9 : 0; });
        greens.forEach((m, i) => { const k = sm(s.green * 1.3 - i * 0.15), dead = sm(s.swallow); m.scale.set(1, Math.max(1e-4, m.userData.len * k * (1 - 0.6 * dead)), 1); m.material.opacity = k > 0.001 ? 0.95 * (1 - dead) : 0; });
        gin.material.opacity = sm(s.green) * (1 - sm(s.swallow)) * 0.7 + sm(s.swallow) * (1 - sm(s.swallow * 1.6 - 0.6)) * 0.35;
      },
      demo(s, t) { s.beam = sm(t / 2); s.red = sm((t - 2.5) / 1.5); s.green = sm((t - 4) / 1.5); s.swallow = sm((t - 7) / 2); s.spin = t * 0.05; },
    };
  });

  // ======================================================================== trace
  KIT.asset('trace', (K, o) => {
    const g = new T.Group(), N = o.n || 420, Wd = o.w || 0.12, Ht = o.h || 0.02, span = o.span || 4, kind = o.kind || 'ppg';
    const PAPER = !!o.paper, col = o.color || (kind === 'steps' ? (PAPER ? '#ff7a12' : '#ff9a2e') : (PAPER ? '#0fbf4c' : GREEN)), bpm = o.bpm || 155, spm = o.spm || 165, th = o.th || (PAPER ? 0.0009 : 0.0007);
    // on white paper an additive glow vanishes: ink it (normal blending, a soft darker halo)
    const inkMat = (c, op) => new T.MeshBasicMaterial({ color: C(c), transparent: true, opacity: op, depthWrite: false, toneMapped: false, side: T.DoubleSide });
    const ribbon = (w, op) => { const pos = new Float32Array(N * 6), idx = [];
      for (let i = 0; i < N - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setIndex(idx);
      const m = new T.Mesh(geo, PAPER ? inkMat(col, op) : addGlow(col, op)); m.frustumCulled = false; soft(m); m.renderOrder = 9; g.add(m); return { m, pos, w }; };
    const core = ribbon(th, 1), halo = ribbon(th * 6, 0.18), hot = ribbon(th * 0.4, 0.9); hot.m.material.color = PAPER ? C(col).multiplyScalar(0.6) : C('#ffffff').lerp(C(col), 0.35);
    const head = new T.Mesh(new T.PlaneGeometry(th * 14, th * 14), new T.MeshBasicMaterial({ map: radialTex('rgba(255,255,255,1)'), color: C(col).lerp(C('#ffffff'), 0.5), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
    soft(head); head.renderOrder = 10; g.add(head);
    const ticks = []; for (let i = 0; i < 14; i++) { const m = new T.Mesh(new T.PlaneGeometry(th * 9, th * 9), new T.MeshBasicMaterial({ map: radialTex('rgba(255,255,255,1)'), color: C(col), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false })); soft(m); m.renderOrder = 10; g.add(m); ticks.push(m); }
    // the shapes: a beat = the light dips fast and comes back slowly; a step = a bigger, rounder bump
    const beatDip = p => p < 0.13 ? -sm(p / 0.13) : -Math.exp(-(p - 0.13) * 5.2);
    const stepBump = p => Math.pow(Math.max(0, Math.sin(Math.PI * p)), 1.6) * 1.0 - 0.32;
    const sig = (tt, s) => { let y = 0;
      if (kind === 'ppg') y = 0.42 * (beatDip(fr(tt * bpm / 60)) + 0.5) + s.mix * 0.78 * stepBump(fr(tt * spm / 60 + 0.31));
      else y = 0.72 * stepBump(fr(tt * spm / 60 + 0.31));
      return y * Ht * s.amp; };
    const xs = new Float32Array(N), ys = new Float32Array(N);
    return {
      group: g, size: { w: Wd, h: Ht }, anchors: { left: [0, 0, 0], right: [Wd, 0, 0] },
      view: { l: [Wd / 2, 0, 0], d: Wd * 2.2 },
      defaults: { o: 1, grow: 1, scroll: 0, mix: 0, amp: 1, ticks: 0, head: 1 },
      beatTimes: (s) => { const per = 60 / bpm, out = []; let k = Math.ceil(s.scroll / per); while ((k * per - s.scroll) <= span && out.length < 14) { out.push(k * per); k++; } return out; },
      apply(s, t) {
        const n = Math.max(2, Math.round(s.grow * (N - 1)) + 1);
        for (let i = 0; i < N; i++) { const j = Math.min(i, n - 1), f = j / (N - 1); xs[i] = f * Wd; ys[i] = sig(s.scroll + f * span, s); }
        for (const r of [core, halo, hot]) { const p = r.pos, w = r.w / 2;
          for (let i = 0; i < N; i++) { const a = Math.max(0, Math.min(i, n - 2)), dx = xs[a + 1] - xs[a], dy = ys[a + 1] - ys[a], L = Math.hypot(dx, dy) || 1, nx = -dy / L * w, ny = dx / L * w;
            p[i * 6] = xs[i] + nx; p[i * 6 + 1] = ys[i] + ny; p[i * 6 + 2] = 0; p[i * 6 + 3] = xs[i] - nx; p[i * 6 + 4] = ys[i] - ny; p[i * 6 + 5] = 0; }
          r.m.geometry.attributes.position.needsUpdate = true; }
        core.m.material.opacity = s.o; halo.m.material.opacity = s.o * (PAPER ? 0.12 : 0.2); hot.m.material.opacity = s.o * 0.85;
        head.position.set(xs[n - 1], ys[n - 1], 0.0001); head.material.opacity = s.o * s.head * (s.grow < 0.999 && s.grow > 0.01 ? 1 : 0.0);
        const per = 60 / bpm; let k = Math.ceil(s.scroll / per), i = 0;
        for (; i < ticks.length; i++, k++) { const tt = k * per + 0.13 * per, f = (tt - s.scroll) / span;
          if (f > s.grow || f > 1) { ticks[i].material.opacity = 0; continue; }
          ticks[i].position.set(f * Wd, sig(tt, s), 0.0002); ticks[i].material.opacity = s.o * s.ticks * (0.75 + 0.25 * sm((s.grow - f) * 20)); }
      },
      demo(s, t) { s.grow = sm(t / 4); s.scroll = t * 0.6; s.ticks = t > 5 ? 1 : 0; s.mix = t > 8 ? 1 : 0; },
    };
  });

  // ======================================================================== hose
  KIT.asset('hose', (K, o) => {
    const g = new T.Group(), kind = o.kind || 'new', Ln = o.len || 0.42, R0 = o.r || 0.0095, NS = 200, NR = 36;
    const geo = new T.CylinderGeometry(R0, R0, Ln, NR, NS, true); geo.rotateZ(-Math.PI / 2);   // along +X, x in [-Ln/2, Ln/2]
    const base = geo.attributes.position.array.slice(), pos = geo.attributes.position.array;
    let mat;
    if (kind === 'new') { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 16; const c = cv.getContext('2d');
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, 512, 16); c.fillStyle = '#1f6b3a'; c.fillRect(120, 0, 10, 16); c.fillRect(138, 0, 4, 16); c.fillRect(376, 0, 10, 16); c.fillRect(394, 0, 4, 16);
      const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace; tx.wrapS = tx.wrapT = T.RepeatWrapping;
      mat = new T.MeshPhysicalMaterial({ color: C('#f5b60c'), map: tx, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12, sheen: 0.3 }); }
    else { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 128; const c = cv.getContext('2d'), r = OM.rng(3);
      c.fillStyle = '#8f7a4a'; c.fillRect(0, 0, 1024, 128);
      for (let i = 0; i < 2600; i++) { c.fillStyle = `rgba(${r() < 0.5 ? '60,48,28' : '200,185,150'},${0.06 + r() * 0.1})`; c.fillRect(r() * 1024, r() * 128, 1 + r() * 3, 1 + r() * 2); }
      for (let i = 0; i < 70; i++) { c.strokeStyle = `rgba(40,30,18,${0.35 + r() * 0.4})`; c.lineWidth = 0.8 + r() * 1.2; let x = r() * 1024, y = r() * 128; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 16; y += 4 + r() * 8; c.lineTo(x, y); } c.stroke(); }
      const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace; tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.repeat.set(2, 1);
      mat = new T.MeshStandardMaterial({ color: C('#ffffff'), map: tx, roughness: 0.88 }); }
    const tube = K.mesh(geo, mat); g.add(tube);
    const c0 = mat.color.clone(), cV = C(kind === 'new' ? '#d42a3a' : '#a0555c');
    // the brass end (coupling) at -X
    const brass = new T.Group(); brass.position.set(-Ln / 2, 0, 0); g.add(brass);
    const bm = K.mat.metal('#c9a24a', 0.3);
    brass.add(K.mesh(K.geo.cyl(R0 * 1.12, 0.014, 40), bm, { rot: [0, 0, Math.PI / 2], pos: [-0.007, 0, 0] }));
    for (let i = 0; i < 6; i++) brass.add(K.mesh(K.geo.cyl(R0 * 1.4, 0.0018, 40), bm, { rot: [0, 0, Math.PI / 2], pos: [-0.016 - i * 0.0024, 0, 0] }));
    brass.add(K.mesh(K.geo.cyl(R0 * 1.3, 0.004, 40), bm, { rot: [0, 0, Math.PI / 2], pos: [-0.032, 0, 0] }));
    // a soft red glow that travels with each bulge once it is a blood vessel
    return {
      group: g, size: { len: Ln, r: R0 }, anchors: { left: [-Ln / 2, 0, 0], right: [Ln / 2, 0, 0] },
      view: { l: [0, 0, 0], d: Ln * 1.9, close: [-Ln / 2, 0, 0] },
      defaults: { o: 1, amp: kind === 'new' ? 0.42 : 0.04, speed: 1.3, vessel: 0 },
      apply(s, t) {
        const wB = Ln * 0.075, per = 0.55 * Ln;
        for (let i = 0; i < pos.length; i += 3) { const x = base[i], u = x + Ln / 2;
          let b = 0; const c = fr(t * s.speed * 0.6) * per; for (let k = -1; k < 3; k++) { const d = u - (c + k * per); b += Math.exp(-(d * d) / (wB * wB)); }
          const f = 1 + s.amp * b; pos[i + 1] = base[i + 1] * f; pos[i + 2] = base[i + 2] * f; }
        geo.attributes.position.needsUpdate = true;
        mat.color.lerpColors(c0, cV, sm(s.vessel)); if (mat.map) mat.color.multiplyScalar(1);
        const bs = 1 - sm(s.vessel * 1.6); brass.scale.setScalar(Math.max(1e-4, bs)); brass.visible = bs > 0.01;
      },
      demo(s, t) { s.vessel = t > 7 ? sm((t - 7) / 2) : 0; },
    };
  });

  // ======================================================================== cal30
  KIT.asset('cal30', (K, o) => {
    const g = new T.Group(), cols = 6, rows = 5, tw = o.tw || 0.011, gap = o.gap || 0.003, tiles = [];
    const W = cols * tw + (cols - 1) * gap, H = rows * tw + (rows - 1) * gap;
    g.add(K.mesh(K.geo.rbox(W + 0.008, H + 0.008, 0.002, 0.002), K.mat.gloss('#0c1018', 0.25), { pos: [0, 0, -0.0012] }));
    for (let i = 0; i < 30; i++) { const c = i % cols, r = Math.floor(i / cols), x = -W / 2 + tw / 2 + c * (tw + gap), y = H / 2 - tw / 2 - r * (tw + gap);
      const m = new T.MeshPhysicalMaterial({ color: C('#1a2333'), roughness: 0.25, clearcoat: 1, emissive: C('#000000') });
      const tile = K.mesh(K.geo.rbox(tw, tw, 0.0016, 0.0016), m, { pos: [x, y, 0] }); g.add(tile);
      const dot = new T.Mesh(new T.PlaneGeometry(tw * 0.9, tw * 0.9), new T.MeshBasicMaterial({ map: radialTex('rgba(255,255,255,1)'), color: C('#bfe6ff'), transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false }));
      dot.position.set(x, y, 0.0012); soft(dot); dot.renderOrder = 6; g.add(dot);
      const num = K.canvasPlane(tw * 0.8, tw * 0.8, 9000, (c, w, h) => { c.fillStyle = 'rgba(220,232,255,0.9)'; c.font = `500 ${Math.round(h * 0.42)}px ${K.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i + 1), w / 2, h / 2 + 2); });
      num.material.transparent = true; num.material.depthWrite = false; num.position.set(x, y, 0.00095); num.renderOrder = 7; soft(num); g.add(num); tiles.push({ m, dot, num }); }
    const on = C('#7fb8ff'), warm = C('#ff3b4a'), tmp = new T.Color();
    return { group: g, size: { w: W, h: H }, view: { l: [0, 0, 0], d: 0.24 }, defaults: { fill: 0, alert: 0 },
      apply(s) { tiles.forEach((q, i) => { const k = sm(s.fill - i); tmp.copy(on).lerp(warm, sm(s.alert)); q.m.emissive.copy(tmp).multiplyScalar(0.55 * k); q.dot.material.color.copy(tmp); q.dot.material.opacity = k * 0.55; }); },
      demo(s, t) { s.fill = t * 3; s.alert = sm((t - 10.5) / 0.8); } };
  });

  // ======================================================================== road
  KIT.asset('road', (K, o) => {
    const g = new T.Group(), Ln = o.len || 240, Wr = o.w || 7;
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 2048; const c = cv.getContext('2d'), r = OM.rng(11);
    c.fillStyle = '#2c2f36'; c.fillRect(0, 0, 512, 2048);
    for (let i = 0; i < 26000; i++) { const v = 34 + r() * 50; c.fillStyle = `rgba(${v},${v},${v + 6},${0.25 + r() * 0.35})`; c.fillRect(r() * 512, r() * 2048, 1 + r() * 2, 1 + r() * 2); }
    c.fillStyle = 'rgba(240,238,225,0.92)'; for (let y = 0; y < 2048; y += 512) c.fillRect(250, y, 12, 300);   // centre dashes
    c.fillStyle = 'rgba(225,225,215,0.55)'; c.fillRect(24, 0, 8, 2048); c.fillRect(480, 0, 8, 2048);           // edge lines
    const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace; tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.repeat.set(1, Ln / 24); tx.anisotropy = 8;
    const m = K.mesh(new T.PlaneGeometry(Wr, Ln), new T.MeshStandardMaterial({ map: tx, roughness: 0.82, metalness: 0 }), { rot: [-Math.PI / 2, 0, 0], cast: false }); g.add(m);
    const kerb = K.mat.clay('#3a3d44', 0.85);
    g.add(K.mesh(K.geo.box(0.25, 0.12, Ln), kerb, { pos: [-Wr / 2 - 0.125, 0.06, 0] })); g.add(K.mesh(K.geo.box(0.25, 0.12, Ln), kerb, { pos: [Wr / 2 + 0.125, 0.06, 0] }));
    g.add(K.mesh(new T.PlaneGeometry(3, Ln), K.mat.clay('#24272d', 0.9), { rot: [-Math.PI / 2, 0, 0], pos: [-Wr / 2 - 1.75, 0.12, 0], cast: false }));
    g.add(K.mesh(new T.PlaneGeometry(3, Ln), K.mat.clay('#24272d', 0.9), { rot: [-Math.PI / 2, 0, 0], pos: [Wr / 2 + 1.75, 0.12, 0], cast: false }));
    return { group: g, view: { l: [0, 0.8, 0], d: 6 }, defaults: {}, apply() {} };
  });

  // ======================================================================== sky (dusk, around the runner)
  KIT.asset('sky', (K, o) => {
    const g = new T.Group(), Rs = o.r || 26, H0 = -6, H1 = 34;
    const cv = document.createElement('canvas'); cv.width = 8; cv.height = 512; const c = cv.getContext('2d'), gr = c.createLinearGradient(0, 0, 0, 512);
    const at = y => 1 - (y - H0) / (H1 - H0);   // canvas v for a height
    gr.addColorStop(0, '#060a14'); gr.addColorStop(at(16), '#101a33'); gr.addColorStop(at(7), '#2c2d58'); gr.addColorStop(at(3), '#7a4a6a');
    gr.addColorStop(at(0.9), '#d0805a'); gr.addColorStop(at(0.15), '#e8a070'); gr.addColorStop(at(-0.2), '#120e12'); gr.addColorStop(1, '#05070b');
    c.fillStyle = gr; c.fillRect(0, 0, 8, 512); const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace;
    const m = new T.Mesh(new T.CylinderGeometry(Rs, Rs, H1 - H0, 96, 1, true), new T.MeshBasicMaterial({ map: tx, side: T.BackSide, fog: false, depthWrite: true, toneMapped: false }));
    m.position.y = (H0 + H1) / 2; soft(m); m.renderOrder = -5; g.add(m);
    return { group: g, view: { l: [0, 1, 0], d: 6 }, defaults: {}, apply() {} };
  });

  // ======================================================================== heartglow
  KIT.asset('heartglow', (K, o) => {
    const g = new T.Group(), Rh = o.r || 0.06, pts = [];
    for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2, x = 16 * Math.sin(a) ** 3, y = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a); pts.push([x / 17 * Rh, y / 17 * Rh + Rh * 0.1]); }
    const geo = K.geo.extrude(pts, Rh * 0.3, { bevel: Rh * 0.12 }); geo.translate(0, 0, -Rh * 0.15);
    const core = new T.Mesh(geo, new T.MeshBasicMaterial({ color: C('#ff3348'), transparent: true, opacity: 0, toneMapped: false, depthTest: false, depthWrite: false })); soft(core); core.renderOrder = 20; g.add(core);
    const halo = new T.Mesh(new T.PlaneGeometry(Rh * 5, Rh * 5), new T.MeshBasicMaterial({ map: radialTex('rgba(255,60,80,0.9)'), transparent: true, opacity: 0, depthWrite: false, depthTest: false, blending: T.AdditiveBlending, toneMapped: false })); soft(halo); halo.renderOrder = 19; g.add(halo);
    return { group: g, view: { l: [0, 0, 0], d: Rh * 8 }, defaults: { o: 1, beat: 0 },
      apply(s) { const b = 1 + 0.14 * s.beat; core.scale.setScalar(b); core.material.opacity = s.o * (0.75 + 0.25 * s.beat); halo.scale.setScalar(0.8 + 0.35 * s.beat); halo.material.opacity = s.o * (0.35 + 0.4 * s.beat); },
      demo(s, t) { s.beat = Math.pow(Math.max(0, Math.sin(t * Math.PI * 2.6)), 8); } };
  });
})();
