// The invisible magnetic fields, drawn as clean coloured lines in the air: a physics diagram, never a glow.
// Three assets live in this file (plus 'fields', a preview-only wrapper at the bottom):
//
//   'gatefield'  the gate's field at human scale. Local origin = the ground midpoint between the two gates
//                (gate A at x = -0.5, gate B at x = +0.5, panels in the YZ plane, people walk along Z).
//                Copies of the coil's own loop (0.34 m along Z by 1.36 m tall, centred at y 0.82) march from A to B.
//     state: amp 0..1    overall opacity
//            phase       loops advance one spacing (0.125 m) per unit; wraps, so a growing phase reads as a stream
//            reach 0..1  loops exist from x = -0.5 up to x = -0.5 + reach (the front is soft over 0.1 m)
//            lw          line weight, 1 = as built (tube radius 4 mm); 0.5 = half as heavy, for when the camera comes close
//
//   'band'       the same field at the scale of the tag: up to three thin purple slabs (7 mm along X, 9 mm tall,
//                24 mm deep along Z, centred at y 3.5 mm) with 5 x 3 straight field lines inside, running along X.
//     state: o 0..1      opacity
//            x           centre of band 0 along X (metres)
//            gap         centre to centre distance; band k sits at x + k * gap (a negative gap puts them behind)
//            dir         +1 = band 0 dark purple, arrows toward +X;  -1 = light purple, arrows toward -X.
//                        Neighbouring bands always alternate.
//            n 0..3      how many bands show (fractions fade the next one in)
//            lw          line weight, 1 = as built (tube radius 0.06 mm); lower it in extreme close-ups
//
//   'answer'     the strip's reply at human scale: small orange rings travelling along a gentle arc.
//     state: amp 0..1, phase (rings advance one spacing per unit), reach 0..1 (how far along the path rings have got)
//            from, to    [x,y,z] in the group's local frame (a Vector3 works too). Give a new array, never edit the old one.
//            bow         height of the arc as a fraction of the straight distance (0.12; 0 = straight, negative = sags)
//            face 0..1   how far each ring turns from "facing along the path" toward the camera. 0 = strictly along the path
//                        (seen from the side a ring is only a dash), 1 = flat to the lens. 0.45 by default: always an open ellipse.
//            lw          line weight, 1 = as built (tube radius 3 mm)
(function () {
  const smooth = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
  const wrap = (x, n) => ((x % n) + n) % n;
  const HIDE = 0.003;
  // Human-scale lines draw right after the ground shadow (1) and before glass and see-through paper (3+): a half-faded line
  // then lies on the shadow like ink (it never cuts a pale stripe into it) and a pane of acrylic in front still tints it.
  const ORDER = 2;
  // One line = two meshes on the same geometry: its depth goes down first (no colour), then its colour, only where it is the
  // nearest surface. A half-faded line then stays one flat shape: no part of it shows through another part of itself.
  let DEPTH = null;
  const pair = (geo, mat, order = ORDER) => {
    const T = THREE, g = new T.Group(); DEPTH = DEPTH || new T.MeshBasicMaterial({ colorWrite: false, transparent: true });
    for (const m of [new T.Mesh(geo, DEPTH), new T.Mesh(geo, mat)]) { m.castShadow = m.receiveShadow = false; m.userData.noAO = true; m.renderOrder = order; g.add(m); }
    g.visible = false; return g;
  };
  // Line weight. Every line geometry carries one morph target: the same line with no thickness (a tube shrunk onto its centre
  // line, an arrowhead onto one point). Influence 1 - lw then makes the line finer or heavier without moving it.
  const weight = (pg, lw) => { const k = 1 - lw; for (const m of pg.children) m.morphTargetInfluences[0] = k; };
  const thinTo = (geo, f) => {
    const p = geo.attributes.position, a = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const q = f(p.getX(i), p.getY(i), p.getZ(i)); a[i * 3] = q[0]; a[i * 3 + 1] = q[1]; a[i * 3 + 2] = q[2]; }
    geo.morphAttributes.position = [new THREE.BufferAttribute(a, 3)]; return geo;
  };
  const bare = geo => { geo.deleteAttribute('normal'); geo.deleteAttribute('uv'); return geo; };   // unlit: position is all a line needs
  // A closed tube through stations [px,py,pz, nx,ny,nz, bx,by,bz]: a centre and the two unit vectors that span the round
  // cross-section there (b x n points along the path). Straights take one segment and stay dead straight; corners are true arcs.
  const closedTube = (st, R, rad = 10) => {
    const T = THREE, m = st.length, w = rad + 1, pos = new Float32Array((m + 1) * w * 3), thin = new Float32Array(pos.length), idx = [];
    for (let i = 0; i <= m; i++) { const s = st[i % m]; for (let j = 0; j <= rad; j++) {
      const a = 2 * Math.PI * (j % rad) / rad, c = Math.cos(a) * R, d = Math.sin(a) * R, k = (i * w + j) * 3;
      for (let q = 0; q < 3; q++) { pos[k + q] = s[q] + c * s[3 + q] + d * s[6 + q]; thin[k + q] = s[q]; } } }
    for (let i = 0; i < m; i++) for (let j = 0; j < rad; j++) { const a = i * w + j, b = a + w; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.morphAttributes.position = [new T.BufferAttribute(thin, 3)]; geo.setIndex(idx); return geo;
  };
  const merge = parts => THREEX.BufferGeometryUtils.mergeGeometries(parts);

  // ------------------------------------------------------------------ the gate's field, human scale
  KIT.asset('gatefield', (K, o) => {
    const T = THREE, g = new T.Group(), root = new T.Group(); g.add(root);
    const X0 = -0.5, SPAN = 1.0, SP = 0.125, LW = 0.34, LH = 1.36, CY = 0.82, CR = 0.05, R = o.r ?? 0.004;
    const N = 10;   // ten meshes on a ten-spacing conveyor: at most nine are between the gates, and a loop that wraps keeps its place in the dark / light order
    // the coil's outline in the YZ plane: four quarter-circle corners joined by straights (top toward +Z, down the +Z upright, back along the bottom, up the -Z upright)
    const st = [], hz = LW / 2 - CR, hy = LH / 2 - CR, cs = [[hz, hy], [hz, -hy], [-hz, -hy], [-hz, hy]], CS = 14;
    for (let q = 0; q < 4; q++) for (let i = 0; i <= CS; i++) { const a = (q + i / CS) * Math.PI / 2, c = Math.cos(a), s = Math.sin(a); st.push([0, CY + cs[q][1] + c * CR, cs[q][0] + s * CR, 0, c, s, 1, 0, 0]); }
    const loopGeo = closedTube(st, R, 12);
    // one arrowhead on each upright: up on the dark loops, down on the light ones (o.circ: they run round the loop instead).
    const head = (up, z) => { const c = bare(new T.ConeGeometry(R * 3.4, R * 10.5, 28)); if (up < 0) c.rotateX(Math.PI); c.translate(0, CY, z); return thinTo(c, () => [0, CY, z]); };
    const geoFor = dark => merge([-1, 1].map(sz => head((dark ? 1 : -1) * (o.circ ? sz : 1), sz * LW / 2)).concat(loopGeo));
    const geo = [geoFor(false), geoFor(true)], loops = [];
    for (let i = 0; i < N; i++) {
      const dark = i % 2 === 0, mat = K.mat.flat(dark ? K.col.purple : K.col.purpleLight, 0), lg = pair(geo[+dark], mat); root.add(lg); loops.push({ g: lg, mat });
    }
    return {
      group: g, size: { span: SPAN, spacing: SP, loopW: LW, loopH: LH, cy: CY, r: R, loops: N - 1 },
      anchors: { start: [X0, CY, 0], end: [X0 + SPAN, CY, 0], centre: [0, CY, 0], top: [0, CY + LH / 2, 0], bottom: [0, CY - LH / 2, 0] },
      view: { l: [0, 0.8, 0], d: 5.4, close: [-0.2, 0.86, 0] },
      defaults: { amp: 0, phase: 0, reach: 1, lw: 1 },
      apply(s) {
        const amp = K.clamp(s.amp), front = K.clamp(s.reach) * SPAN, lw = K.clamp(s.lw ?? 1, 0.05, 3);
        root.visible = amp > HIDE && front > HIDE; if (!root.visible) return;
        for (let i = 0; i < N; i++) {
          const d = wrap(i + s.phase, N) * SP, L = loops[i];                       // metres travelled from gate A
          const a = d >= front ? 0 : amp * smooth(d / 0.08) * smooth((front - d) / 0.1);
          L.g.visible = a > HIDE; if (L.g.visible) { L.g.position.x = X0 + d; L.mat.opacity = a; weight(L.g, lw); }
        }
      },
      demo(s, t) { s.amp = t > 10 && t < 11 ? 0.45 : 1; s.reach = t < 1 ? 0.5 : 1; s.phase = t * 0.31; s.lw = t >= 11 ? 0.5 : 1; },
    };
  });

  // ------------------------------------------------------------------ the same field at the scale of the tag
  KIT.asset('band', (K, o) => {
    const T = THREE, g = new T.Group(), root = new T.Group(); g.add(root);
    const BW = 0.007, BH = 0.009, BD = 0.024, CY = 0.0035, NB = 3, R = o.r ?? 0.00006;
    const ZS = [-0.0096, -0.0048, 0, 0.0048, 0.0096], YS = [-0.0018, 0.0012];   // rows at 1.7, 3.9 and 6.1 mm: the lowest one runs just over the strip
    const FACE = [0.038, 0.03, 0.05], EDGE = o.edge ?? 0.22;                              // slab faces (across the field, top / bottom, the two ends) and its hairline edges
    const dark = new T.Color(K.col.purple), light = new T.Color(K.col.purpleLight);
    // 15 straight lines with a tiny arrowhead each, merged into one mesh per band. A line runs from TAIL to its TIP; when the weight drops the head shrinks toward the tip and the shaft follows it.
    const TAIL = -0.0030, TIP = 0.0031, HL = 0.0009, HR = R * 3.2, END = TIP - HL + 0.0001;
    const shaft = (y, z) => { const c = new T.CylinderGeometry(R, R, END - TAIL, 12, 1); c.rotateZ(-Math.PI / 2); c.translate((END + TAIL) / 2, y, z); return thinTo(c, x => [x > 0 ? TIP : x, y, z]); };
    const head = (y, z) => { const c = new T.ConeGeometry(HR, HL, 20); c.rotateZ(-Math.PI / 2); c.translate(TIP - HL / 2, y, z); return thinTo(c, () => [TIP, y, z]); };
    const parts = []; for (const y of YS) for (const z of ZS) parts.push(shaft(y, z), head(y, z));
    const linesGeo = merge(parts), boxGeo = K.geo.box(BW, BH, BD), bands = [];
    const eg = [], hx = BW / 2, hy = BH / 2, hz = BD / 2, edge = (a, b) => eg.push(K.tubeLine([a, b], { r: R * 0.36, seg: 1 }).geometry);
    for (const a of [-1, 1]) for (const b of [-1, 1]) { edge([-hx, a * hy, b * hz], [hx, a * hy, b * hz]); edge([a * hx, -hy, b * hz], [a * hx, hy, b * hz]); edge([a * hx, b * hy, -hz], [a * hx, b * hy, hz]); }
    const edgeGeo = merge(eg);
    for (let k = 0; k < NB; k++) {
      const bg = new T.Group(); bg.position.y = CY;
      const fm = FACE.map(a => K.mat.flat(K.col.purple, a)); for (const m of fm) m.side = T.DoubleSide;
      const box = K.mesh(boxGeo, [fm[0], fm[0], fm[1], fm[1], fm[2], fm[2]], { cast: false, receive: false, soft: true }); box.renderOrder = 8; bg.add(box);
      const edges = K.mesh(edgeGeo, K.mat.flat(K.col.purple, 0), { cast: false, receive: false, soft: true }); edges.renderOrder = 8; bg.add(edges);
      const lm = K.mat.flat(K.col.purple, 0), lines = pair(linesGeo, lm, 8); lines.visible = true; bg.add(lines);
      bg.visible = false; root.add(bg); bands.push({ g: bg, fm, lm, em: edges.material, lines });
    }
    return {
      group: g, size: { w: BW, h: BH, d: BD, cy: CY, r: R, bands: NB },
      anchors: { centre: [0, CY, 0], low: [0, CY + YS[0], 0], top: [0, CY + BH / 2, 0] },
      view: { l: [0, 0.003, 0], d: 0.17, close: [0, 0.003, 0] },
      defaults: { o: 0, x: 0, gap: 0.014, dir: 1, n: 3, lw: 1 },
      apply(s) {
        const oo = K.clamp(s.o), dir = s.dir < 0 ? -1 : 1, lw = K.clamp(s.lw ?? 1, 0.05, 3); let any = false;
        for (let k = 0; k < NB; k++) {
          const b = bands[k], a = oo * K.clamp(s.n - k); b.g.visible = a > HIDE; if (!b.g.visible) continue; any = true;
          const d = k % 2 ? -dir : dir, c = d > 0 ? dark : light;
          b.g.position.x = s.x + k * s.gap; b.g.rotation.y = d > 0 ? 0 : Math.PI;
          b.lm.color.copy(c); b.lm.opacity = a; b.em.color.copy(c); b.em.opacity = a * EDGE; weight(b.lines, lw);
          for (let i = 0; i < 3; i++) { b.fm[i].color.copy(c); b.fm[i].opacity = a * FACE[i]; }
        }
        root.visible = any;
      },
      demo(s, t) { s.o = t > 11 ? 0.4 : 1; s.n = t < 1 ? 1 : t < 3 ? 2 : 3; s.dir = t > 10 ? -1 : 1; s.x = -0.016 + 0.0004 * t; s.gap = t > 6 && t < 8 ? 0.0095 : 0.014; s.lw = t > 9 && t < 10 ? 0.5 : 1; },
    };
  });

  // ------------------------------------------------------------------ the strip's answer, human scale
  KIT.asset('answer', (K, o) => {
    const T = THREE, g = new T.Group(), root = new T.Group(); g.add(root);
    const N = 7, RR = (o.size ?? 0.06) / 2, R = o.r ?? 0.003, FROM = Object.freeze([0, 0.45, 0]), TO = Object.freeze([0.5, 1.5, 0]), TO2 = [-0.5, 1.5, 0];
    const st = [], NS = 72; for (let k = 0; k < NS; k++) { const a = 2 * Math.PI * k / NS, c = Math.cos(a), s = Math.sin(a); st.push([c * RR, s * RR, 0, c, s, 0, 0, 0, 1]); }
    const ringGeo = closedTube(st, R, 12), rings = [];
    for (let i = 0; i < N; i++) { const mat = K.mat.flat(K.col.orange, 0), rg = pair(ringGeo, mat); root.add(rg); rings.push({ g: rg, mat }); }
    const P0 = new T.Vector3(), P1 = new T.Vector3(), P2 = new T.Vector3(), D = new T.Vector3(), B = new T.Vector3(), Tn = new T.Vector3(), Z = new T.Vector3(0, 0, 1), CAM = new T.Vector3(), C = new T.Vector3();
    const rd = (p, v) => (p && p.isVector3) ? v.copy(p) : v.set(p[0], p[1], p[2]);
    return {
      group: g, size: { ring: RR * 2, r: R, rings: N },
      anchors: { from: FROM.slice(), to: TO.slice(), mid: [0.124, 1.035, 0] },      // mid = the top of the default arc
      view: { l: [0.2, 0.95, 0], d: 3.4, close: [0.3, 1.1, 0] },
      defaults: { amp: 0, phase: 0, from: FROM, to: TO, reach: 1, bow: 0.12, face: 0.45, lw: 1 },
      apply(s) {
        const amp = K.clamp(s.amp), reach = K.clamp(s.reach), face = K.clamp(s.face ?? 0.45), lw = K.clamp(s.lw ?? 1, 0.05, 3);
        rd(s.from, P0); rd(s.to, P2); D.subVectors(P2, P0); const len = D.length();
        root.visible = amp > HIDE && reach > HIDE && len > 1e-6; if (!root.visible) return;
        // a gentle arc: the middle is lifted square to the straight line, on the side that faces up (it leaves steeply, then leans over, like a throw)
        D.multiplyScalar(1 / len); B.set(0, 1, 0).addScaledVector(D, -D.y); if (B.lengthSq() < 1e-6) B.set(0, 0, 1); B.normalize();
        P1.addVectors(P0, P2).multiplyScalar(0.5).addScaledVector(B, 2 * s.bow * len);
        if (face > 0) { g.updateWorldMatrix(true, false); g.worldToLocal(CAM.setFromMatrixPosition(K.camera.matrixWorld)); }   // where the camera is, in this group's frame
        for (let i = 0; i < N; i++) {
          const u = wrap(i + s.phase, N) / N, r = rings[i], v = 1 - u;
          const a = u >= reach ? 0 : amp * smooth(u / 0.06) * (1 - 0.42 * u) * smooth((reach - u) / 0.1);   // in over the first 6 %, paler as it goes, out over the last 10 % before the front
          r.g.visible = a > HIDE; if (!r.g.visible) continue;
          const q = r.g; q.position.set(0, 0, 0).addScaledVector(P0, v * v).addScaledVector(P1, 2 * u * v).addScaledVector(P2, u * u);
          Tn.set(0, 0, 0).addScaledVector(P0, -2 * v).addScaledVector(P1, 2 * v - 2 * u).addScaledVector(P2, 2 * u).normalize();
          if (face > 0) { C.subVectors(CAM, q.position).normalize(); if (C.dot(Tn) < 0) Tn.negate(); Tn.lerp(C, face).normalize(); }   // a ring has no front: turn it the short way toward the lens
          q.quaternion.setFromUnitVectors(Z, Tn); q.scale.setScalar(1 + 0.35 * u); r.mat.opacity = a; weight(q, lw);
        }
      },
      demo(s, t) { s.amp = t > 11 ? 0.4 : 1; s.reach = t < 1 ? 0.55 : 1; s.phase = t * 0.37; s.face = t > 2 && t < 4 ? 0 : t > 10 ? 1 : 0.45; if (t > 4 && t < 6) s.to = TO2; s.lw = t > 9 && t < 10 ? 0.5 : 1; },
    };
  });

  // ------------------------------------------------------------------ preview only: tools/preview.sh fields '{"show":"band"}' tag
  // Builds one of the three (o.show = 'gatefield' | 'band' | 'answer') next to the thing it belongs to, when that model's file is loaded too.
  // o.still = a fixed state instead of the demo (or a list of states, one per 2 s view), o.view = { l, d, close, keys } to look from somewhere else.
  KIT.asset('fields', (K, o) => {
    const T = THREE, show = o.show || 'gatefield', A = K.assets[show](K, o), g = new T.Group(); g.add(A.group);
    if (o.ctx !== false) {
      if (show !== 'band' && K.assets.gate) for (const sx of [-1, 1]) { const gt = K.make('gate'); gt.group.position.set(sx * 0.5, 0, 0); gt.group.rotation.y = Math.PI / 2; g.add(gt.group); }
      if (show === 'band' && K.assets.tag) { const tg = K.make('tag'); Object.assign(tg.defaults, { lid: 1, wall: 1 }); g.add(tg.group); }
    }
    return { group: g, size: A.size, anchors: A.anchors, view: Object.assign({}, A.view, o.view), defaults: A.defaults, apply: A.apply, demo: o.still ? ((s, t) => { Object.assign(s, Array.isArray(o.still) ? o.still[Math.min(o.still.length - 1, Math.floor(t / 2))] : o.still); }) : A.demo };
  });
})();
