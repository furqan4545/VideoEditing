// Four small real-size props for the close-ups, one file:
//
//   'keys'     a bunch of keys the way it really lies on a table: a steel split ring (two wire turns, 28 mm) propped at
//              an angle, a cylinder-lock key (cut blade, milled groove, rounded bow), a dimple key (rectangular bow,
//              drilled dimples), a small padlock key and a black leather fob strap, all hanging on the ring.
//              state: ring 0..1 (a thin purple outline hovering around each key: plain metal answering the gate's field)
//                     jiggle (rad: the keys swing a little about their holes, the ring turns, the strap shifts)
//              options: debug (prints a build check: what cuts into what), close (anchor name for the preview close-ups)
//   'battery'  a CR2032 coin cell, 20 mm x 3.2 mm, "+ / CR2032 / 3V" stamped in the top, crimped edge, + side up.
//   'chip'     an SOIC-8 microchip: black epoxy body 5 x 4 x 1.5 mm, moulded pin-1 dot, 8 gull-wing legs, laser marking.
//              both: o 0..1 (opacity of everything; a clean fade, the insides never show, the shadow fades with it),
//              cross 0..1 (a thin black bar laid across the top face from lower-left to upper-right, growing along its length)
//   'pin'      a round-head map pin: matte black ball 2.2 mm on a polished steel needle (0.4 mm), 9 mm tall, tip at the origin.
//              state: drop 0..1 (falls from 30 mm, lands at 0.6, quivers, stands at rest at 1)
//   every asset also takes the preview options keys (six camera keys) and states (six state objects), see `posed`.
//
// Everything is built in millimetres inside a group scaled by 0.001, so the numbers below read like a drawing.
(function () {
  const T = THREE, MM = 0.001, PI = Math.PI, D = PI / 180;
  // extrusions come out flat-shaded: smooth the curved walls, keep real edges (bevel steps, cut corners) sharp
  const soft = geo => THREEX.BufferGeometryUtils.toCreasedNormals(geo, 25 * D);

  // ------------------------------------------------------------------ outline helpers (2D, millimetres)
  const arc = (cx, cy, r, a0, a1, n) => { const p = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; p.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return p; };
  const clean = (p, eps = 1e-4) => { const o = []; for (const q of p) { const l = o[o.length - 1]; if (!l || Math.hypot(q[0] - l[0], q[1] - l[1]) > eps) o.push([q[0], q[1]]); }
    while (o.length > 2 && Math.hypot(o[0][0] - o[o.length - 1][0], o[0][1] - o[o.length - 1][1]) <= eps) o.pop(); return o; };
  // round the corners of a polyline: pts = [x, y, radius]
  const fillet = (pts, closed = true, n = 6) => {
    const out = [], N = pts.length;
    for (let i = 0; i < N; i++) {
      const P = pts[i], r = P[2] || 0;
      if (!r || (!closed && (i === 0 || i === N - 1))) { out.push([P[0], P[1]]); continue; }
      const A = pts[(i + N - 1) % N], B = pts[(i + 1) % N];
      let ux = A[0] - P[0], uy = A[1] - P[1], vx = B[0] - P[0], vy = B[1] - P[1]; const lu = Math.hypot(ux, uy), lv = Math.hypot(vx, vy); ux /= lu; uy /= lu; vx /= lv; vy /= lv;
      const th = Math.acos(Math.max(-1, Math.min(1, ux * vx + uy * vy))), t = Math.min(r / Math.tan(th / 2), 0.48 * lu, 0.48 * lv), rr = t * Math.tan(th / 2);
      const bx = ux + vx, by = uy + vy, bl = Math.hypot(bx, by) || 1, cd = rr / Math.sin(th / 2), cx = P[0] + bx / bl * cd, cy = P[1] + by / bl * cd;
      const a0 = Math.atan2(P[1] + uy * t - cy, P[0] + ux * t - cx); let da = Math.atan2(P[1] + vy * t - cy, P[0] + vx * t - cx) - a0; while (da > PI) da -= 2 * PI; while (da < -PI) da += 2 * PI;
      for (let k = 0; k <= n; k++) out.push([cx + rr * Math.cos(a0 + da * k / n), cy + rr * Math.sin(a0 + da * k / n)]);
    }
    return out;
  };
  const obround = (w, h, cx = 0, cy = 0, n = 12) => { const r = Math.min(w, h) / 2, dx = Math.max(0, (w - h) / 2), dy = Math.max(0, (h - w) / 2);
    return clean([...arc(cx + dx, cy + dy, r, 0, PI / 2, n), ...arc(cx - dx, cy + dy, r, PI / 2, PI, n), ...arc(cx - dx, cy - dy, r, PI, 1.5 * PI, n), ...arc(cx + dx, cy - dy, r, 1.5 * PI, 2 * PI, n)]); };
  const area = p => { let s = 0; for (let i = 0; i < p.length; i++) { const a = p[i], b = p[(i + 1) % p.length]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
  const resample = (p, step) => { const N = p.length, L = [0]; for (let i = 0; i < N; i++) { const a = p[i], b = p[(i + 1) % N]; L.push(L[i] + Math.hypot(b[0] - a[0], b[1] - a[1])); }
    const tot = L[N], m = Math.round(tot / step), o = []; let j = 0;
    for (let i = 0; i < m; i++) { const d = tot * i / m; while (L[j + 1] < d) j++; const a = p[j], b = p[(j + 1) % N], k = (d - L[j]) / (L[j + 1] - L[j] || 1); o.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); } return o; };
  const grow = (p, d) => { const N = p.length, s = area(p) > 0 ? 1 : -1; return p.map((q, i) => { const a = p[(i + N - 1) % N], b = p[(i + 1) % N], tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; return [q[0] + s * ty / l * d, q[1] - s * tx / l * d]; }); };
  const relax = (p, n) => { for (let k = 0; k < n; k++) p = p.map((q, i) => { const a = p[(i + p.length - 1) % p.length], b = p[(i + 1) % p.length]; return [(a[0] + 2 * q[0] + b[0]) / 4, (a[1] + 2 * q[1] + b[1]) / 4]; }); return p; };
  // a centre line with a thickness -> closed outline (a strap seen from the side, a bent lead)
  const ribbon = (c, th) => { const N = c.length, L = [], R = []; for (let i = 0; i < N; i++) { const a = c[Math.max(0, i - 1)], b = c[Math.min(N - 1, i + 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    L.push([c[i][0] - ty * th / 2, c[i][1] + tx * th / 2]); R.push([c[i][0] + ty * th / 2, c[i][1] - tx * th / 2]); } return L.concat(R.reverse()); };
  const inPoly = (p, x, y) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };

  // ------------------------------------------------------------------ geometry helpers
  // plan outline [x, z] -> a plate of thickness th centred on y = 0, edges bevelled, outline true to size (inset shrinks it)
  const slab = (outline, th, bevel, { holes = [], inset = 0 } = {}) => {
    const sh = new T.Shape(outline.map(p => new T.Vector2(p[0], -p[1])));
    for (const h of holes) sh.holes.push(new T.Path(h.map(p => new T.Vector2(p[0], -p[1]))));
    const geo = new T.ExtrudeGeometry(sh, { depth: th - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel - inset, bevelSegments: 2, curveSegments: 8 });
    geo.rotateX(-PI / 2); geo.translate(0, bevel - th / 2, 0); return soft(geo);
  };
  // side profile [s, y] -> a bar of width w along X, centred, profile length along +Z
  const bar = (profile, w, bevel) => {
    const geo = new T.ExtrudeGeometry(new T.Shape(profile.map(p => new T.Vector2(p[0], p[1]))), { depth: w - 2 * bevel, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 2, curveSegments: 8 });
    geo.rotateY(-PI / 2); geo.translate(w / 2 - bevel, 0, 0); return soft(geo);
  };
  const lathe = (pts, seg = 96) => new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), seg);
  // brushed metal: one streaky canvas (cached per seed) drives the colour by a few percent and the relief
  const BR = {};
  const streaks = seed => BR[seed] || (BR[seed] = (() => { const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'), R = OM.rng(seed); c.fillStyle = 'rgb(224,224,224)'; c.fillRect(0, 0, S, S);
    for (let i = 0; i < 5200; i++) { const y = R() * S, x = R() * S, L = 30 + R() * R() * 420, j = (R() - 0.5) * 1.6; c.strokeStyle = R() < 0.55 ? `rgba(0,0,0,${0.02 + R() * 0.065})` : `rgba(255,255,255,${0.08 + R() * 0.2})`; c.lineWidth = 0.6 + R() * 1.2;
      for (const ox of [0, -S]) { c.beginPath(); c.moveTo(x + ox, y); c.lineTo(x + ox + L, y + j); c.stroke(); } } return cv; })());
  const steel = (K, color, rough, { seed = 0, tile = 10, bump = 0.6, rot = PI / 2 } = {}) => {
    const m = new T.MeshStandardMaterial({ color: new T.Color(color), metalness: 1, roughness: rough });
    if (seed) { const cv = streaks(seed); m.map = K.canvasTex(cv, { repeat: 1 / tile }); m.bumpMap = K.canvasTex(cv, { srgb: false, repeat: 1 / tile }); m.map.rotation = m.bumpMap.rotation = rot; m.bumpScale = bump; }
    return m;
  };
  // a private little studio for an upright polished part (the pin's needle): standing on white paper it mirrors nothing
  // but the white floor, so it gets tall strip lights and dark flags that cross the horizon. Built once, on first use.
  let STUDIO;
  const studio = K => {
    if (STUDIO !== undefined || !K.renderer) return STUDIO || null;
    const es = new T.Scene(), cv = document.createElement('canvas'); cv.width = 8; cv.height = 256; const c = cv.getContext('2d'), gr = c.createLinearGradient(0, 0, 0, 256);
    for (const [v, col] of [[0, '#ffffff'], [0.4, '#dddbd7'], [0.49, '#a3a19d'], [0.515, '#6f6e6b'], [0.6, '#a5a39d'], [1, '#c6c3bc']]) gr.addColorStop(v, col);
    c.fillStyle = gr; c.fillRect(0, 0, 8, 256); const dt = new T.CanvasTexture(cv); dt.colorSpace = T.SRGBColorSpace;
    es.add(new T.Mesh(new T.SphereGeometry(50, 32, 24), new T.MeshBasicMaterial({ map: dt, side: T.BackSide })));
    const card = (w, a, v) => { const m = new T.Mesh(new T.PlaneGeometry(w, 80), new T.MeshBasicMaterial({ color: new T.Color(v, v, v), side: T.DoubleSide })); m.position.set(40 * Math.sin(a), -6, 40 * Math.cos(a)); m.lookAt(0, -6, 0); es.add(m); };
    card(11, -0.5, 1.9); card(8, 1.9, 1.5); card(11, 3.9, 1.7); card(12, 0.75, 0.1); card(12, 2.9, 0.1);
    const pm = new T.PMREMGenerator(K.renderer); STUDIO = pm.fromScene(es, 0.01).texture; pm.dispose(); return STUDIO;
  };
  // a small laser-etched marking lying on a face: dark, a little see-through, reads upright when the key points at you
  const etch = (K, text, w, h, pos) => {
    const px = 64, cv = document.createElement('canvas'); cv.width = Math.round(w * px); cv.height = Math.round(h * px); const c = cv.getContext('2d');
    c.font = `500 ${Math.round(h * px * 0.76)}px ${K.FONT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.letterSpacing = Math.round(h * px * 0.14) + 'px';
    c.fillStyle = 'rgba(255,255,255,0.26)'; c.fillText(text, cv.width / 2 + 1.5, cv.height / 2 + 4); c.fillStyle = 'rgba(36,36,38,0.6)'; c.fillText(text, cv.width / 2, cv.height / 2 + 2);
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8; const geo = new T.PlaneGeometry(w, h); geo.rotateX(-PI / 2);
    const m = new T.Mesh(geo, new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    m.position.set(pos[0], pos[1], pos[2]); m.userData.noAO = true; return m;
  };
  // one opacity for a whole part. At o = 1 it is a plain solid thing. While it is see-through, a depth-only twin of every
  // mesh is drawn first, so only the outer skin shows (no insides shining through). Its shadow fades with it: in the
  // shadow pass the part is drawn through a fine dither that keeps a share of its texels, and the soft-shadow blur turns
  // that into an even, lighter shadow (the kit's VSM shadows draw every receiver, so castShadow = false alone would leave
  // a full shadow under a ghost). Below half it also leaves the AO and focus passes.
  const DEPTH = new T.MeshBasicMaterial({ colorWrite: false, polygonOffset: true, polygonOffsetFactor: 0, polygonOffsetUnits: 2 });
  const fader = (root, meshes, mats, noShadow = []) => {
    const twins = meshes.map(m => { const d = new T.Mesh(m.geometry, DEPTH); d.position.copy(m.position); d.quaternion.copy(m.quaternion); d.scale.copy(m.scale); d.renderOrder = 10; d.userData.noAO = d.userData.noDepth = true; d.visible = false; m.parent.add(d); return d; });
    const keep = { value: 1 }, shade = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking });
    shade.onBeforeCompile = sh => { sh.uniforms.uKeep = keep; sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'uniform float uKeep;\nvoid main() {\n\tif ( uKeep < 0.999 && fract( 52.9829189 * fract( dot( floor( gl_FragCoord.xy ), vec2( 0.06711056, 0.00583715 ) ) ) ) > uKeep ) discard;'); };
    for (const m of meshes) { m.customDepthMaterial = shade; m.castShadow = !noShadow.includes(m); }
    return o => { const tr = o < 0.999, on = o > 0.004; root.visible = on;
      for (const m of mats) { m.opacity = o; if (m.transparent !== tr) { m.transparent = tr; m.needsUpdate = true; } }
      for (const d of twins) d.visible = tr && on;
      keep.value = tr ? 0.05 + 0.65 * o : 1;                              // the shadow test goes from clear at 5% cover to full at 70%: this makes its strength follow o
      for (const m of meshes) m.userData.noAO = m.userData.noDepth = o < 0.5; };
  };
  // the thin black bar that crosses a part out: lies on the top face, from lower-left to upper-right, grows from its start
  const crossBar = (K, len, w, th, y) => {
    const grp = new T.Group(), mat = new T.MeshStandardMaterial({ color: new T.Color(K.col.ink), roughness: 0.78, metalness: 0 });
    const geo = K.geo.rbox(len, th, w, th * 0.45); geo.translate(len / 2, 0, 0);
    const mesh = K.mesh(geo, mat); grp.add(mesh); grp.rotation.y = PI / 4; grp.position.set(-len / 2 * Math.SQRT1_2, y, len / 2 * Math.SQRT1_2);
    return { grp, mesh, mat, set(k) { const v = K.clamp(k); grp.visible = v > 0.002; grp.scale.x = Math.max(v, 0.001); } };
  };

  // preview only: tools/preview.sh <name> '{"keys":[six cameras],"states":[six state objects]}' poses any view / state
  const posed = (o, s, t) => { if (!o.states) return false; Object.assign(s, o.states[Math.min(o.states.length - 1, Math.floor(t / 2))]); return true; };

  // ================================================================== the bunch of keys
  KIT.asset('keys', (K, o) => {
    const g = new T.Group(), mm = new T.Group(), asm = new T.Group(); mm.scale.setScalar(MM); g.add(mm); mm.add(asm);
    // the ring leans: its low point sits on the strap, the keys prop the rest. Frame: low point above the origin, ring rising toward -Z.
    const TAU = 19 * D, RR = 13.3, WIRE = 1.4, TL = 1.4, PITCH = WIRE * 1.02;
    const yLow = TL + PITCH / 2 * Math.cos(TAU) + WIRE / 2 + 0.04, C = [0, yLow + RR * Math.sin(TAU), -RR * Math.cos(TAU)];
    const ringP = a => [RR * Math.sin(a), C[1] - RR * Math.cos(a) * Math.sin(TAU), C[2] + RR * Math.cos(a) * Math.cos(TAU)];

    // ---- a pin-tumbler key: bow, shoulder, blade with cuts along one edge and a milled groove down the face
    const bladeKey = (P, mat, matPanel) => {
      const { bow, hb, xs, zs, zt, tx0, tx1, cuts, flat, th } = P, e = bow.e;
      const sup = a => [bow.a * Math.sign(Math.cos(a)) * Math.pow(Math.abs(Math.cos(a)), 2 / e), bow.cz + bow.b * Math.sign(Math.sin(a)) * Math.pow(Math.abs(Math.sin(a)), 2 / e)];
      const a1 = Math.acos(Math.pow(xs / bow.a, e / 2)), a2 = PI - Math.acos(Math.pow(hb / bow.a, e / 2)), bowP = [];
      for (let i = 0; i <= 84; i++) bowP.push(sup(a1 + (a2 - 2 * PI - a1) * i / 84));
      const top = z => { let x = Math.min(hb, tx1 + (zt - z)); for (const [zc, d] of cuts) x = Math.min(x, hb - d + Math.max(0, Math.abs(z - zc) - flat / 2)); return x; };
      let bit = []; for (let z = zt; z > zs; z -= 0.05) bit.push([top(z), z]); bit.push([hb, zs]);
      bit = bit.filter((p, i) => i === 0 || i === bit.length - 1 || Math.abs((p[0] - bit[i - 1][0]) * (bit[i + 1][1] - p[1]) - (bit[i + 1][0] - p[0]) * (p[1] - bit[i - 1][1])) > 1e-7);
      const spine = [[-hb, zt - (tx0 + hb)], [tx0, zt]];
      const base = clean([...bowP, ...spine, ...bit, [xs, zs]]);
      const [g0, g1, gz] = P.groove, rg = (g1 - g0) / 2;
      const frame = clean([...bowP, ...spine, [g0, zt], ...arc((g0 + g1) / 2, gz + rg, rg, PI, 2 * PI, 8), [g1, zt - (g1 - tx1)], ...bit.filter(p => p[0] > g1 + 1e-6), [xs, zs]]);
      const env = clean([...bowP, ...spine, [tx1, zt], [hb, zt - (hb - tx1)], [hb, zs], [xs, zs]]);
      const hole = P.hole[2] ? K.geo.rrect(P.hole[0], P.hole[1], P.hole[2], 6) : obround(P.hole[0], P.hole[1]), holes = [hole], grp = new T.Group();
      let panel = null; if (P.panel) { panel = K.geo.rrect(P.panel.w, P.panel.h, P.panel.r, 6).map(p => [p[0], p[1] + P.panel.z]); holes.push(panel); }
      grp.add(K.mesh(slab(frame, th, P.bevel, { holes }), mat));
      grp.add(K.mesh(slab(base, th - 2 * P.gd, 0.05, { holes: [hole], inset: 0.05 }), mat));
      if (panel) { grp.add(K.mesh(slab(panel, th - 2 * P.pd, 0.04, { inset: 0.02 }), matPanel)); if (P.stamp) grp.add(etch(K, P.stamp, P.panel.w * 0.66, P.panel.h * 0.34, [0, th / 2 - P.pd + 0.012, P.panel.z])); }
      return { grp, th, outline: base, hole, env, zs, tip: zt };
    };
    // ---- a dimple key: rectangular bow with a slot, a flat bar blade, drilled dimples of different sizes
    const dimpleKey = (mat, matPanel, matPit) => {
      const th = 2.6, hb = 4.8, zs = 19.6, zt = 53, grp = new T.Group();
      const body = fillet([[hb, zt - 4.6, 0], [hb, zs, 1.4], [10, zs - 5.2, 1.8], [10, -4.6, 3], [-10, -4.6, 3], [-10, zs - 5.2, 1.8], [-hb, zs, 1.4], [-hb, zt - 4.6, 0]], false);
      const tipP = []; for (let i = 1; i < 24; i++) { const a = PI * i / 24; tipP.push([-hb * Math.cos(a), zt - 4.6 + 4.6 * Math.pow(Math.sin(a), 0.8)]); }
      const outline = clean([...body, ...tipP]), slot = obround(9.4, 5.0), panel = K.geo.rrect(12.5, 9, 1.8, 6).map(p => [p[0], p[1] + 8.5]);
      const dim = [[1.5, 26.5, 1.3, 0.75], [1.5, 31, 1.0, 0.5], [1.5, 35.5, 1.45, 0.9], [1.5, 40, 1.1, 0.6], [1.5, 44.5, 1.3, 0.8], [-2.3, 28.7, 0.8, 0.45], [-2.3, 37.7, 0.9, 0.5], [-2.3, 42.2, 0.7, 0.4]];
      grp.add(K.mesh(slab(outline, th, 0.26, { holes: [slot, panel, ...dim.map(d => arc(d[0], d[1], d[2], 0, 2 * PI, 20).slice(0, -1))] }), mat));
      grp.add(K.mesh(slab(panel, th - 0.44, 0.04, { inset: 0.02 }), matPanel)); grp.add(etch(K, '31708', 9.4, 2.3, [0, th / 2 - 0.22 + 0.012, 8.5]));
      for (const [x, z, r, dp] of dim) grp.add(K.mesh(lathe([[0.001, -dp], [0.3 * r, -dp], [r + 0.04, -0.1]], 24), matPit, { pos: [x, th / 2, z], cast: false }));
      return { grp, th, outline, hole: slot, env: outline, zs, tip: zt };
    };

    // faces are brushed along the key, cut edges are plain: [face, edge]
    // (plated all over, so the stamped and cut edges are smooth and glossy: their bevels carry the highlights that say "metal".
    //  They are a step darker than the faces, so a cut that mirrors a softbox stays a light grey, not a hole of paper white)
    const edge = c => steel(K, c, 0.28);
    const mA = [steel(K, '#d2cfc8', 0.3, { seed: 41, tile: 9 }), edge('#b3b0a9')], mAp = steel(K, '#b9b6af', 0.48, { seed: 43, tile: 5, bump: 0.6 });
    const mB = [steel(K, '#cfd2d7', 0.31, { seed: 47, tile: 11 }), edge('#b9bcc2')], mBp = steel(K, '#bbbec4', 0.44, { seed: 49, tile: 5, bump: 0.6 }), mPit = steel(K, '#b4b7bd', 0.3); mPit.side = T.DoubleSide;
    const mC = [steel(K, '#bcbfc5', 0.33, { seed: 53, tile: 7 }), edge('#a3a6ac')];
    const kA = bladeKey({ th: 2.0, bevel: 0.18, gd: 0.5, pd: 0.22, bow: { cz: 5.4, a: 12, b: 11, e: 2.6 }, hole: [7.0, 7.0], hb: 4.2, xs: 6.0, zs: 18.6, zt: 49.8, tx0: -2.3, tx1: -0.7, flat: 1.2,
      cuts: [[24.9, 0.9], [28.7, 2.3], [32.5, 1.4], [36.3, 2.9], [40.1, 1.9]], groove: [-1.9, -0.45, 17.6], panel: { w: 15, h: 8.6, r: 3, z: 9.4 }, stamp: '0274' }, mA, mAp);
    const kB = dimpleKey(mB, mBp, mPit);
    const kC = bladeKey({ th: 1.5, bevel: 0.13, gd: 0.36, bow: { cz: 3.5, a: 7.5, b: 7.6, e: 2.15 }, hole: [6.8, 5.0, 1.5], hb: 2.8, xs: 3.7, zs: 12.2, zt: 33, tx0: -1.6, tx1: -0.5, flat: 0.9,
      cuts: [[16.2, 0.6], [19.4, 1.3], [22.6, 0.8], [25.8, 1.5]], groove: [-1.15, -0.25, 11.6] }, mC);

    // ---- hang a key on the ring: hole on the wire, heading yaw, then roll and pitch until the bow's low edge and the tip rest on the paper
    const lowest = (pts, th, Hy, rho, del) => { let m = 1e9; const sr = Math.sin(rho), cr = Math.cos(rho), sd = Math.sin(del), cd = Math.cos(del); for (const p of pts) { const y = Hy + (p[0] * sr - th / 2 * cr) * cd - p[1] * sd; if (y < m) m = y; } return m; };
    const hang = (k, psi, yaw, side, jf, roll) => {
      const H = ringP(psi), tipP = k.outline.filter(p => p[1] > k.zs), bowP = k.outline.filter(p => p[1] <= k.zs), gap = 0.03;
      const pitchFor = rho => { let a = -0.3, b = 0.7; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (lowest(tipP, k.th, H[1], rho, m) > gap) a = m; else b = m; } return (a + b) / 2; };
      let rho = roll; if (rho == null) { let a = 0, b = 50 * D; for (let i = 0; i < 40; i++) { const m = (a + b) / 2; if (lowest(bowP, k.th, H[1], side * m, pitchFor(side * m)) > gap) a = m; else b = m; } rho = side * (a + b) / 2; }
      k.grp.rotation.order = 'YXZ'; k.grp.position.set(H[0], H[1], H[2]); k.grp.rotation.set(pitchFor(rho), yaw, rho); k.yaw = yaw; k.jf = jf; k.psi = psi; asm.add(k.grp);
    };
    hang(kA, -76 * D, -57 * D, 1, 1);
    hang(kC, -50 * D, -21 * D, 1, 0.8);
    hang(kB, 66 * D, 51 * D, -1, -0.9);
    const keys = [kA, kB, kC];

    // ---- the split ring: one wire, two turns, a crank where it steps from the lower turn to the upper, two cut ends
    const mRing = steel(K, '#d9dbdf', 0.17), ringG = new T.Group(); ringG.position.set(C[0], C[1], C[2]); ringG.rotation.set(TAU, 0, 0); asm.add(ringG);
    const A0 = 118 * D, DJ = 0.11, NS = 320, rp = [];
    for (let i = 0; i <= NS; i++) { const a = A0 + DJ + (4 * PI - 2 * DJ) * i / NS, k = K.clamp((a - (A0 + 2 * PI - DJ)) / (2 * DJ)); rp.push([RR * Math.sin(a), (k * k * (3 - 2 * k) - 0.5) * PITCH, RR * Math.cos(a)]); }
    const ringMesh = K.mesh(K.geo.tube(rp, WIRE / 2, { seg: 640, rad: 12 }), mRing); ringG.add(ringMesh);
    for (const i of [0, NS]) { const a = A0 + DJ + (4 * PI - 2 * DJ) * i / NS; ringG.add(K.mesh(new T.SphereGeometry(WIRE / 2, 16, 12), mRing, { pos: rp[i], rot: [0, a, 0], scale: [0.3, 1, 1] })); }

    // ---- the leather fob: one strap folded through the ring, two layers stitched together, a steel rivet
    const WS = 9.6, LS = 43, RL = 2.6, lx = -0.55, ly = TL / 2 + RL, yT = TL * 1.5 + 0.1, strapYaw = 3 * D;
    const ctrl = [[LS, TL / 2], [34, TL / 2], [22, TL / 2], [12, TL / 2], [5, TL / 2], [1.4, TL / 2]];
    for (const a of [-98, -124, -150, -176, -202, -228, -254, -280, -306, -328]) ctrl.push([lx + RL * Math.cos(a * D), ly + RL * Math.sin(a * D)]);
    ctrl.push([3.3, ly + 0.5], [5.2, yT + 0.8], [7.4, yT + 0.14], [9.8, yT], [14, yT], [24, yT], [34, yT], [LS, yT]);
    const strapSide = ribbon(new T.SplineCurve(ctrl.map(p => new T.Vector2(p[0], p[1]))).getPoints(260).map(v => [v.x, v.y]), TL);
    const leatherCv = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c = cv.getContext('2d'), R = OM.rng(61); c.fillStyle = '#808080'; c.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 2600; i++) { const x = R() * 256, y = R() * 256, r = 1.2 + R() * 3.2; c.fillStyle = R() < 0.5 ? `rgba(0,0,0,${0.10 + R() * 0.16})` : `rgba(255,255,255,${0.08 + R() * 0.14})`;
        for (const [ox, oy] of [[0, 0], [256, 0], [-256, 0], [0, 256], [0, -256]]) { c.beginPath(); c.ellipse(x + ox, y + oy, r, r * (0.6 + R() * 0.4), R() * PI, 0, 2 * PI); c.fill(); } } return cv; })();
    const mLeather = new T.MeshStandardMaterial({ color: new T.Color('#151517'), roughness: 0.56, metalness: 0 }); mLeather.bumpMap = K.canvasTex(leatherCv, { srgb: false, repeat: 1 / 9 }); mLeather.bumpScale = 5;
    const strapG = new T.Group(); strapG.rotation.y = strapYaw; asm.add(strapG);
    strapG.add(K.mesh(bar(strapSide, WS, 0.28), mLeather));
    const yTop = yT + TL / 2, thread = new T.MeshStandardMaterial({ color: new T.Color('#d8d3c6'), roughness: 0.85 }), st = [];
    for (const sx of [-1, 1]) for (let s = 9.4; s < LS - 1.6; s += 2.3) st.push([sx * (WS / 2 - 1.25), s, 0]);
    for (const x of [-2.3, 0, 2.3]) st.push([x, LS - 1.5, 1]);
    const stitchGeo = new T.CapsuleGeometry(0.17, 1.25, 3, 8); stitchGeo.rotateX(PI / 2);
    const stitches = new T.InstancedMesh(stitchGeo, thread, st.length), dm = new T.Object3D(); stitches.castShadow = true; stitches.receiveShadow = true;
    st.forEach((q, i) => { dm.position.set(q[0], yTop + 0.03, q[1]); dm.rotation.set(0, q[2] ? PI / 2 : 0, 0); dm.updateMatrix(); stitches.setMatrixAt(i, dm.matrix); }); strapG.add(stitches);
    const dome = new T.SphereGeometry(2.0, 32, 10, 0, 2 * PI, 0, PI / 2); dome.scale(1, 0.42, 1);
    strapG.add(K.mesh(dome, mRing, { pos: [0, yTop + 0.16, 12.6] })); strapG.add(K.mesh(K.geo.cyl(2.2, 0.2, 40), mRing, { pos: [0, yTop + 0.08, 12.6] }));

    // ---- centre the bunch on the origin, turn it a little so the fan is not square to the camera
    asm.rotation.y = 8 * D; g.updateMatrixWorld(true);
    const box = new T.Box3().setFromObject(asm, true), ctr = box.getCenter(new T.Vector3()); asm.position.set(-ctr.x / MM, 0, -ctr.z / MM); g.updateMatrixWorld(true); box.setFromObject(asm, true);

    // ---- the purple outline that hovers around each key
    for (const k of keys) {
      const p = relax(grow(resample(k.env, 0.9), 1.4), 3), cx = p.reduce((a, q) => a + q[0], 0) / p.length, cz = p.reduce((a, q) => a + q[1], 0) / p.length;
      k.loop = K.tubeLine(p.map(q => [q[0] - cx, 0, q[1] - cz]), { color: K.col.purple, r: 0.19, opacity: 0, closed: true, seg: 360 }); k.loop.position.set(cx, k.th / 2 + 0.6, cz); k.loop.visible = false; k.grp.add(k.loop);
    }

    g.updateMatrixWorld(true);
    const at = (obj, x, y, z) => { const v = new T.Vector3(x, y, z).applyMatrix4(obj.matrixWorld); return [v.x, v.y, v.z]; };

    const swing = j => { for (const k of keys) k.grp.rotation.y = k.yaw + j * k.jf; ringG.rotation.y = j * 0.6; strapG.rotation.y = strapYaw - j * 0.3; };
    if (o.debug) {                                                      // build check: does anything cut into anything? (add "jiggle": 0.15 to check a swung pose)
      swing(+o.jiggle || 0); g.updateMatrixWorld(true);
      const v = new T.Vector3(), inv = new T.Matrix4(), f1 = n => +n.toFixed(1);
      const inKey = (k, mesh) => { inv.copy(k.grp.matrixWorld).invert(); const pos = mesh.geometry.attributes.position; let n = 0, deep = 0, x0 = 99, x1 = -99, z0 = 99, z1 = -99;
        for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld).applyMatrix4(inv); if (Math.abs(v.y) < k.th / 2 && inPoly(k.outline, v.x, v.z) && !inPoly(k.hole, v.x, v.z)) { n++; deep = Math.max(deep, k.th / 2 - Math.abs(v.y)); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z); } } return n ? [n, +deep.toFixed(2), f1(x0), f1(x1), f1(z0), f1(z1)] : 0; };
      const names = ['A', 'B', 'C'];
      keys.forEach((k, i) => { const m0 = k.grp.children[0]; let lo = 1e9; const pos = m0.geometry.attributes.position; for (let j = 0; j < pos.count; j++) lo = Math.min(lo, v.fromBufferAttribute(pos, j).applyMatrix4(m0.matrixWorld).y / MM);
        const rep = { roll: f1(k.grp.rotation.z / D), pitch: f1(k.grp.rotation.x / D), holeY: f1(k.grp.position.y), low: +lo.toFixed(2), ring: inKey(k, ringMesh), strap: inKey(k, strapG.children[0]) };
        keys.forEach((k2, j) => { if (j !== i) rep[names[j]] = inKey(k, k2.grp.children[0]); }); console.error(names[i] + ' ' + JSON.stringify(rep)); });
      inv.copy(strapG.matrixWorld).invert(); const pos = ringMesh.geometry.attributes.position; let n = 0; for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(ringMesh.matrixWorld).applyMatrix4(inv); if (Math.abs(v.x) < WS / 2 && inPoly(strapSide, v.z, v.y)) n++; }
      console.error('ringInStrap ' + n + ' box ' + JSON.stringify([box.min, box.max].map(b => [b.x, b.y, b.z].map(q => f1(q / MM)))));
      swing(0); g.updateMatrixWorld(true);
    }

    const size = box.getSize(new T.Vector3());
    const anchors = { centre: [0, 0.005, 0], ring: at(ringG, 0, 0, 0), ringLow: at(ringG, 0, 0, RR), crank: at(ringG, RR * Math.sin(A0), 0, RR * Math.cos(A0)), keyA: at(kA.grp, 0, 1, 7), keyB: at(kB.grp, 0, 1.3, 8), keyC: at(kC.grp, 0, 0.8, 4),
      bitting: at(kA.grp, 2.5, 1, 32), dimples: at(kB.grp, 0.5, 1.3, 35), holeA: at(kA.grp, 0, 0, 0), holeB: at(kB.grp, 0, 0, 0), tipA: at(kA.grp, -1.5, 0, 49.8), tipB: at(kB.grp, 0, 0, 53), fob: at(strapG, 0, yTop, 24), rivet: at(strapG, 0, yTop + 1, 12.6), top: [0, box.max.y, 0] };
    return {
      group: g, size: { w: size.x, d: size.z, h: box.max.y, ring: 0.028 }, anchors,
      view: { l: [0, 0.005, 0], d: 0.5, close: anchors[o.close] || anchors.bitting, keys: o.keys },     // preview: tools/preview.sh keys '{"close":"crank"}'
      defaults: { ring: 0, jiggle: 0 },
      demo(s, t) { if (posed(o, s, t)) return; s.ring = t < 2 ? 0 : t < 8 ? 1 : t < 10 ? 0 : 1; s.jiggle = t >= 8 && t < 10 ? 0.14 : 0; },
      apply(s) {
        const j = s.jiggle || 0, r = K.clamp(s.ring || 0), e = 1 - (1 - r) * (1 - r);
        swing(j);
        for (const k of keys) { k.loop.visible = r > 0.004; k.loop.material.opacity = r; k.loop.scale.setScalar(0.975 + 0.025 * e); k.loop.position.y = k.th / 2 + 0.25 + 0.45 * e; }
      },
    };
  });

  // ================================================================== CR2032 coin cell
  KIT.asset('battery', (K, o) => {
    const g = new T.Group(), mm = new T.Group(); mm.scale.setScalar(MM); g.add(mm);
    const RAD = 10, H = 3.2, RT = 9.45, solid = [];
    const add = (geo, mat, opt) => { const m = K.mesh(geo, mat, opt); mm.add(m); solid.push(m); return m; };
    const canM = steel(K, '#d3d5d9', 0.24), capM = steel(K, '#c3c5c9', 0.42, { seed: 73, tile: 1 / 3, bump: 0.4, rot: 0 }), gasM = new T.MeshStandardMaterial({ color: new T.Color('#2b2c2f'), roughness: 0.6 });
    // the positive can: crimped lip, wall, rounded top edge
    add(lathe([[8.95, 0.62], [9.0, 0.42], [9.36, 0.4], ...arc(9.4, 1.0, 0.6, -PI / 2, 0, 9), [10, 1.03], [10, H - 0.53], ...arc(RAD - 0.5, H - 0.5, 0.5, 0, PI / 2, 9), [RT + 0.03, H], [RT, H]], 128), canM);
    // the negative cap (it is what the cell stands on) and the dark gasket between the two
    add(lathe([[0, 0], [7.78, 0], ...arc(7.8, 0.2, 0.2, -PI / 2, 0, 5), [8.0, 0.22], [8.0, 0.64]], 96), capM);
    const gasket = add(lathe([[8.0, 0.52], [8.3, 0.37], [8.9, 0.37], [9.02, 0.56]], 96), gasM);
    // the top face: stamped "+", "CR2032", "3V" (one canvas drives the colour and the relief)
    const S = 2048, cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'), px = S / (2 * RT), R = OM.rng(77);
    c.fillStyle = '#dedede'; c.fillRect(0, 0, S, S);
    for (let i = 0; i < 800; i++) { const r = Math.sqrt(R()) * S / 2, a0 = R() * 7; c.strokeStyle = R() < 0.5 ? `rgba(0,0,0,${0.012 + R() * 0.03})` : `rgba(255,255,255,${0.15 + R() * 0.3})`; c.lineWidth = 1 + R() * 2; c.beginPath(); c.arc(S / 2, S / 2, r, a0, a0 + 0.5 + R() * 2.5); c.stroke(); }
    const ink = '#85878b', lip = 'rgba(255,255,255,0.95)', shade = 'rgba(40,42,46,0.55)';
    const stamp = draw => { c.save(); c.translate(4, 4); c.fillStyle = lip; draw(); c.restore(); c.save(); c.translate(-1.5, -1.5); c.fillStyle = shade; draw(); c.restore(); c.fillStyle = ink; draw(); };
    stamp(() => { const L = 3.4 * px, w = 0.4 * px, x = S / 2, y = S * 0.25; c.beginPath(); c.roundRect(x - L / 2, y - w / 2, L, w, w / 2); c.fill(); c.beginPath(); c.roundRect(x - w / 2, y - L / 2, w, L, w / 2); c.fill(); });
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.letterSpacing = Math.round(0.16 * px) + 'px';
    stamp(() => { c.font = `400 ${Math.round(2.75 * px)}px ${K.FONT}`; c.fillText('CR2032', S / 2 + 0.08 * px, S * 0.555); });
    stamp(() => { c.font = `400 ${Math.round(2.1 * px)}px ${K.FONT}`; c.fillText('3V', S / 2 + 0.08 * px, S * 0.785); });
    c.letterSpacing = '0px';
    const map = new T.CanvasTexture(cv); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
    const rel = new T.CanvasTexture(cv); rel.colorSpace = T.NoColorSpace; rel.anisotropy = 8;
    const topM = steel(K, '#d3d5d9', 0.3); topM.map = map; topM.bumpMap = rel; topM.bumpScale = 0.55;
    const topGeo = new T.CircleGeometry(RT, 128); topGeo.rotateX(-PI / 2); const top = add(topGeo, topM, { pos: [0, H, 0] });
    const bar = crossBar(K, 23.4, 1.0, 0.24, H + 0.14); mm.add(bar.grp);
    const setO = fader(mm, [...solid, bar.mesh], [canM, capM, gasM, topM, bar.mat], [gasket, top]);
    return {
      group: g, size: { d: 0.02, h: 0.0032 },
      anchors: { top: [0, H * MM, 0], centre: [0, H * MM / 2, 0], plus: [0, H * MM, -0.0047], text: [0, H * MM, 0.001], edge: [0.01, 0.0016, 0], crossA: [-0.00827, H * MM, 0.00827], crossB: [0.00827, H * MM, -0.00827] },
      view: { l: [0, 0.0016, 0], d: 0.14, close: [0.001, 0.003, 0.002], keys: o.keys },
      defaults: { o: 1, cross: 0 },
      demo(s, t) { if (posed(o, s, t)) return; s.o = t >= 10 ? 0.45 : 1; s.cross = t < 2 ? 0 : t < 4 ? 0.55 : t < 8 ? 1 : t < 10 ? 0 : 1; },
      apply(s) { setO(K.clamp(s.o)); bar.set(s.cross); },
    };
  });

  // ================================================================== SOIC-8 microchip
  KIT.asset('chip', (K, o) => {
    const g = new T.Group(), mm = new T.Group(); mm.scale.setScalar(MM); g.add(mm);
    const BL = 5, BW = 4, Y0 = 0.15, YP = 0.75, YT = 1.65, EPOXY = '#1d1e21', solid = [];
    const add = (geo, mat, opt) => { const m = K.mesh(geo, mat, opt); mm.add(m); solid.push(m); return m; };
    const grain = K.canvasTex(K.noiseCanvas(256, 83, 'grain'), { srgb: false, repeat: 2 });
    const bodyM = new T.MeshStandardMaterial({ color: new T.Color(EPOXY), roughness: 0.66, metalness: 0, bumpMap: grain, bumpScale: 0.35 });
    const legM = steel(K, '#b9bcc1', 0.36);
    // moulded body: two drafted halves that meet at the parting line (where the legs come out)
    const taper = (geo, ya, yb, fx, fz) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const k = K.clamp((p.getY(i) - ya) / (yb - ya)); p.setX(i, p.getX(i) * (1 + (fx - 1) * k)); p.setZ(i, p.getZ(i) * (1 + (fz - 1) * k)); } p.needsUpdate = true; return geo; };
    const FX = 0.956, FZ = 0.945;
    add(taper(K.geo.rbox(BL, YT - YP, BW, 0.1), -(YT - YP) / 2, (YT - YP) / 2, FX, FZ), bodyM, { pos: [0, (YT + YP) / 2, 0] });
    add(taper(K.geo.rbox(BL, YP - Y0, BW, 0.08), (YP - Y0) / 2, -(YP - Y0) / 2, 0.975, 0.97), bodyM, { pos: [0, (YP + Y0) / 2, 0] });
    // top face: laser marking and the moulded pin-1 dot (colour + relief)
    const TW = BL * FX - 0.22, TD = BW * FZ - 0.22, PX = 300, cw = Math.round(TW * PX), ch = Math.round(TD * PX);
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const c = cv.getContext('2d');
    c.fillStyle = EPOXY; c.fillRect(0, 0, cw, ch);
    c.fillStyle = 'rgba(206,208,212,0.8)'; c.textBaseline = 'alphabetic'; c.textAlign = 'left';
    c.font = `400 ${Math.round(0.74 * PX)}px ${K.FONT}`; c.fillText('8S02A', 0.82 * PX, 1.42 * PX);
    c.font = `400 ${Math.round(0.56 * PX)}px ${K.FONT}`; c.fillText('K2614  E3', 0.84 * PX, 2.3 * PX);
    const dx = 0.62 * PX, dy = ch - 0.62 * PX, dr = 0.33 * PX, gr = c.createRadialGradient(dx - dr * 0.25, dy - dr * 0.25, dr * 0.1, dx, dy, dr); gr.addColorStop(0, '#0f1011'); gr.addColorStop(0.78, '#131416'); gr.addColorStop(1, '#3b3c41');
    c.fillStyle = gr; c.beginPath(); c.arc(dx, dy, dr, 0, 2 * PI); c.fill();
    const bv = document.createElement('canvas'); bv.width = cw; bv.height = ch; const b = bv.getContext('2d'), R = OM.rng(91), im = b.createImageData(cw, ch);
    for (let i = 0; i < im.data.length; i += 4) { const n = 150 + (R() - 0.5) * 40; im.data[i] = im.data[i + 1] = im.data[i + 2] = n; im.data[i + 3] = 255; } b.putImageData(im, 0, 0);
    const g2 = b.createRadialGradient(dx, dy, 0, dx, dy, dr * 1.08); g2.addColorStop(0, 'rgba(10,10,10,1)'); g2.addColorStop(0.72, 'rgba(30,30,30,1)'); g2.addColorStop(1, 'rgba(150,150,150,0)'); b.fillStyle = g2; b.beginPath(); b.arc(dx, dy, dr * 1.08, 0, 2 * PI); b.fill();
    const map = new T.CanvasTexture(cv); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8; const rel = new T.CanvasTexture(bv); rel.colorSpace = T.NoColorSpace; rel.anisotropy = 8;
    const topM = new T.MeshStandardMaterial({ map, roughness: 0.66, metalness: 0, bumpMap: rel, bumpScale: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });   // 4 um above the body: the offset keeps it on top from far away too
    const topGeo = new T.PlaneGeometry(TW, TD); topGeo.rotateX(-PI / 2); const top = add(topGeo, topM, { pos: [0, YT + 0.004, 0] });
    // eight gull-wing legs: out of the body at the parting line, down, and a flat foot on the ground
    const legSide = ribbon(fillet([[1.5, YP + 0.02, 0], [2.3, YP + 0.02, 0.22], [2.43, 0.1, 0.22], [3.0, 0.1, 0]], false, 6), 0.2), legGeo = bar(legSide, 0.41, 0.03);
    for (const sz of [0, PI]) for (let i = 0; i < 4; i++) add(legGeo, legM, { pos: [(i - 1.5) * 1.27 * (sz ? -1 : 1), 0, 0], rot: [0, sz, 0] });
    const xbar = crossBar(K, 7.8, 0.36, 0.1, YT + 0.064); mm.add(xbar.grp);
    const setO = fader(mm, [...solid, xbar.mesh], [bodyM, topM, legM, xbar.mat], [top]);
    return {
      group: g, size: { l: 0.005, w: 0.004, h: 0.00165, span: 0.006 },
      anchors: { top: [0, YT * MM, 0], centre: [0, 0.0009, 0], dot: [(-TW / 2 + 0.62) * MM, YT * MM, (TD / 2 - 0.62) * MM], legs: [0, 0.0004, 0.0027], leg1: [-0.001905, 0.0001, 0.0028], mark: [0, YT * MM, -0.0003], crossA: [-0.00276, YT * MM, 0.00276], crossB: [0.00276, YT * MM, -0.00276] },
      view: { l: [0, 0.0008, 0], d: 0.05, close: [-0.0008, 0.0012, 0.0012], keys: o.keys },
      defaults: { o: 1, cross: 0 },
      demo(s, t) { if (posed(o, s, t)) return; s.o = t >= 10 ? 0.45 : 1; s.cross = t < 2 ? 0 : t < 4 ? 0.55 : t < 8 ? 1 : t < 10 ? 0 : 1; },
      apply(s) { setO(K.clamp(s.o)); xbar.set(s.cross); },
    };
  });

  // ================================================================== map pin
  KIT.asset('pin', (K, o) => {
    const g = new T.Group(), mm = new T.Group(), pin = new T.Group(); mm.scale.setScalar(MM); g.add(mm); mm.add(pin);
    const HT = 9, RB = 1.1, FALL = 30, LAND = 0.6;
    const needleM = steel(K, '#d4d7dc', 0.2); needleM.envMap = studio(K); needleM.envMapIntensity = 0.8;
    pin.add(K.mesh(lathe([[0.0005, 0], [0.06, 0.26], [0.2, 1.45], [0.2, HT - RB - 0.3]], 40), needleM));
    pin.add(K.mesh(new T.SphereGeometry(RB, 48, 32), new T.MeshStandardMaterial({ color: new T.Color('#17181b'), roughness: 0.5, metalness: 0 }), { pos: [0, HT - RB, 0] }));
    // the little dent it makes in the paper once it has landed
    const dc = document.createElement('canvas'); dc.width = dc.height = 64; const c = dc.getContext('2d'), gr = c.createRadialGradient(32, 32, 1, 32, 32, 31); gr.addColorStop(0, 'rgba(36,31,24,0.9)'); gr.addColorStop(0.35, 'rgba(36,31,24,0.35)'); gr.addColorStop(1, 'rgba(36,31,24,0)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
    const dentGeo = new T.CircleGeometry(0.5, 24); dentGeo.rotateX(-PI / 2);
    const dent = K.mesh(dentGeo, new T.MeshBasicMaterial({ map: new T.CanvasTexture(dc), transparent: true, opacity: 0, depthWrite: false }), { pos: [0, 0.02, 0], cast: false, receive: false, soft: true }); dent.renderOrder = 2; mm.add(dent);
    return {
      group: g, size: { h: HT * MM, head: 2 * RB * MM, fall: FALL * MM },
      anchors: { tip: [0, 0, 0], head: [0, (HT - RB) * MM, 0], top: [0, HT * MM, 0], start: [0, (FALL + HT - RB) * MM, 0] },
      view: { l: [0, 0.0048, 0], d: 0.075, close: [0, 0.0072, 0], keys: o.keys },
      defaults: { drop: 1 },
      demo(s, t) { if (posed(o, s, t)) return; s.drop = t < 2 ? 0.5 : t < 4 ? 0.6 : t < 6 ? 0.66 : t < 8 ? 1 : t < 10 ? 1 : 0.7; },
      apply(s) {
        const d = K.clamp(s.drop), u = K.clamp((d - LAND) / (1 - LAND)), f = Math.min(d / LAND, 1), q = d > LAND ? Math.exp(-4.2 * u) * Math.sin(2 * PI * 3 * u) * (1 - u) * (1 - u) : 0;
        pin.position.y = FALL * (1 - f * f); pin.rotation.set(0.04 * q, 0, 0.11 * q);
        dent.material.opacity = 0.55 * K.clamp((d - LAND) / 0.04); dent.visible = d > LAND;
      },
    };
  });
})();
