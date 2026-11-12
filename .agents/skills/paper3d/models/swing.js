// A playground swing being pushed, real size in metres: top bar at 2.10 m, seat 0.50 m off the ground.
// An A-frame of round powder-coated steel tube, two black chains, a flat black rubber seat, and behind the seat the
// pusher: an open mitten hand in matte white clay (four fused fingers with grooves, a thumb that grows out of the palm)
// coming out of a clean-cut dark sleeve with a cuff. It comes forward to meet the seat and shoves it.
// Local frame: top bar along X, the seat swings in the YZ plane, front = +Z, feet on y = 0, centred on x = 0, z = 0.
// options: { tone: 'white' | 'grey',       grey = every part one flat mid grey (the "pushed at the wrong moments" copy)
//            frame: 'white' | 'steel',     white powder-coated tube (default) or satin steel
//            fittings: 'dark' | 'light',   graphite cast joints (default) or pale ones
//            sleeve: 'dark' | 'light' | 'none',   graphite sleeve (default), pale grey sleeve, or a bare clay forearm with a round end
//            handScale: 1.4 }              the hand is drawn a little bigger than life so it reads when the swing is small
//            (preview aids only: pose = a state or one state per view, keys = camera views)
// state:
//   ang      swing angle in radians, positive = seat forward (+Z). Seat and chains turn about the pivot pins.
//   push     the hand's forward extension. 0 = drawn back, 1 = palm on the seat's back edge when ang === reach.
//            Above 1 the palm rides the seat's arc (the shove): to stay on the seat use  push = 1 + (ang - reach) / size.follow
//   reach    the swing angle at which the hand meets the seat (the back of the arc: a negative angle). Default -0.45.
//   handVis  boolean
// helpers on the instance (local points, pass them to inst.at):  seatAt(ang) -> seat top centre   handAt(push, reach) -> palm
//                                                                  elbowAt(push, reach) -> the far end of the sleeve
KIT.asset('swing', (K, o) => {
  const T = THREE, g = new T.Group(), grey = o.tone === 'grey', V = (x, y, z) => new T.Vector3(x, y, z), UP = V(0, 1, 0);
  const sst = (x) => { x = K.clamp(x); return x * x * (3 - 2 * x); };
  const flat = grey ? K.mat.clay('#9c9fa5', 0.9) : null;
  const M = {
    tube: flat || (o.frame === 'steel' ? K.mat.metal(K.col.steel, 0.38) : K.mat.plastic('#dddbd4', 0.55)),                 // powder-coated steel tube (a white that keeps its shading under the key light)
    cast: flat || K.mat.plastic(o.fittings === 'light' ? '#cfcdc8' : '#2b2d31', 0.5),   // cast fittings: graphite, so the joints read on white paper
    steel: flat || K.mat.metal(K.col.steel, 0.3),
    black: flat || K.mat.rubber('#16171a'),
    seat: flat || K.mat.rubber('#1b1c1f'),
    chain: flat || new T.MeshStandardMaterial({ color: new T.Color('#1d1e22'), metalness: 0.75, roughness: 0.42, envMapIntensity: 1.2 }),
    hand: flat || K.mat.clay('#d5d2cb', 0.88),
    sleeve: flat || K.mat.clay(o.sleeve === 'light' ? '#bdbcb8' : '#26282c', 0.92),
  };
  // a round bar from a to b (r at a, r2 at b), pushed out by e0 / e1 past its ends
  const rod = (a, b, r, mat, { seg = 32, r2, e0 = 0, e1 = 0 } = {}) => {
    const d = b.clone().sub(a), len = d.length(); d.normalize();
    const m = K.mesh(K.geo.cyl(r, len + e0 + e1, seg, r2), mat); m.position.copy(a).add(b).multiplyScalar(0.5).addScaledVector(d, (e1 - e0) / 2); m.quaternion.setFromUnitVectors(UP, d); return m;
  };
  // a turned collar from a to b around a tube of radius rt: outer radius r at a, r2 at b, with a rounded lip at each end
  const collar = (a, b, r, mat, { r2 = r, rt = 0, f = 0.003, seg = 40 } = {}) => {
    const d = b.clone().sub(a), len = d.length(), p = [], N = 4, ri = Math.max(1e-5, rt - 0.0015); d.normalize();
    p.push(new T.Vector2(ri, 0));
    for (let i = 0; i <= N; i++) { const q = i / N * Math.PI / 2; p.push(new T.Vector2(r - f + f * Math.sin(q), f - f * Math.cos(q))); }
    for (let i = 0; i <= N; i++) { const q = i / N * Math.PI / 2; p.push(new T.Vector2(r2 - f + f * Math.cos(q), len - f + f * Math.sin(q))); }
    p.push(new T.Vector2(ri, len));
    const geo = new T.LatheGeometry(p, seg); geo.translate(0, -len / 2, 0);
    const m = K.mesh(geo, mat); m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d); return m;
  };

  // ---------------------------------------------------------------- the A-frame
  const BAR_Y = 2.10, XB = 0.75, RBAR = 0.031, RLEG = 0.026, FOOT_Z = 0.90, FOOT_DX = 0.10, OVER = 0.085, BRACE_Y = 1.40;
  g.add(K.mesh(K.geo.cyl(RBAR, 2 * (XB + OVER), 48), M.tube, { pos: [0, BAR_Y, 0], rot: [0, 0, Math.PI / 2] }));
  for (const sx of [-1, 1]) {
    const J = V(sx * XB, BAR_Y, 0);
    // black end plug
    g.add(K.mesh(K.geo.cyl(RBAR + 0.002, 0.018, 48), M.black, { pos: [sx * (XB + OVER + 0.005), BAR_Y, 0], rot: [0, 0, Math.PI / 2] }));
    g.add(K.mesh(new T.SphereGeometry(RBAR + 0.002, 40, 20), M.black, { pos: [sx * (XB + OVER + 0.014), BAR_Y, 0], scale: [0.4, 1, 1] }));
    // cast node: a sleeve on the bar, a rounded hub, and a socket for each leg
    g.add(collar(V(J.x - 0.082, BAR_Y, 0), V(J.x + 0.082, BAR_Y, 0), RBAR + 0.008, M.cast, { rt: RBAR, f: 0.0035 }));
    g.add(K.mesh(new T.SphereGeometry(0.05, 40, 24), M.cast, { pos: [J.x, BAR_Y - 0.004, 0], scale: [1.15, 1, 1.05] }));
    const braceEnds = [];
    for (const sz of [-1, 1]) {
      const F = V(sx * (XB + FOOT_DX), 0, sz * FOOT_Z), d = F.clone().sub(J), len = d.length(); d.normalize();
      const at = (q) => J.clone().addScaledVector(d, q);
      g.add(rod(at(0.04), F, RLEG, M.tube, { e1: 0.04 }));                                    // the leg
      g.add(collar(at(0), at(0.205), RLEG + 0.0095, M.cast, { r2: RLEG + 0.0065, rt: RLEG, f: 0.003 }));   // its socket, tapering down the leg
      for (const c of [-1, 1]) {                                                              // through-bolt: a washer and a hex head each side
        const B = at(0.15);
        g.add(K.mesh(K.geo.cyl(0.0135, 0.0024, 28), M.steel, { pos: [B.x + c * (RLEG + 0.0068), B.y, B.z], rot: [0, 0, Math.PI / 2] }));
        g.add(K.mesh(K.geo.cyl(0.0098, 0.0068, 6), M.steel, { pos: [B.x + c * (RLEG + 0.0108), B.y, B.z], rot: [0, 0, Math.PI / 2] }));
      }
      // rubber boot with a rolled rim, and a round pad on the ground
      g.add(collar(at(len - 0.122), at(len + 0.04), RLEG + 0.0075, M.black, { rt: RLEG, f: 0.003 }));
      g.add(collar(at(len - 0.132), at(len - 0.108), RLEG + 0.0115, M.black, { rt: RLEG, f: 0.0045 }));
      { const p = [new T.Vector2(1e-5, 0), new T.Vector2(0.074, 0)];
        for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; p.push(new T.Vector2(0.068 + 0.008 * Math.cos(a), 0.007 + 0.008 * Math.sin(a))); }
        p.push(new T.Vector2(1e-5, 0.016));
        g.add(K.mesh(new T.LatheGeometry(p, 56), M.black, { pos: [F.x, 0, F.z] })); }
      // brace clamp
      const q = len * (1 - BRACE_Y / BAR_Y); braceEnds.push(at(q));
      g.add(collar(at(q - 0.036), at(q + 0.036), RLEG + 0.006, M.cast, { rt: RLEG, f: 0.003 }));
    }
    g.add(rod(braceEnds[0], braceEnds[1], 0.0135, M.tube, { seg: 24 }));                      // the cross-brace that makes it an A
  }

  // ---------------------------------------------------------------- hangers on the bar, then everything that swings
  const XH = 0.235, PIV_Y = BAR_Y - RBAR - 0.034, SEAT_TOP = 0.50, SW = 0.52, ST = 0.034, SD = 0.17, L = PIV_Y - (SEAT_TOP - ST / 2);
  for (const sx of [-1, 1]) {
    const x = sx * XH;
    g.add(collar(V(x - 0.023, BAR_Y, 0), V(x + 0.023, BAR_Y, 0), RBAR + 0.005, M.steel, { rt: RBAR, f: 0.002 }));                         // clamp band
    for (const c of [-1, 1]) g.add(K.mesh(K.geo.rbox(0.006, 0.062, 0.036, 0.0028), M.steel, { pos: [x + c * 0.0135, BAR_Y - RBAR - 0.022, 0] }));   // clevis cheeks
    g.add(K.mesh(K.geo.cyl(0.0055, 0.044, 20), M.steel, { pos: [x, PIV_Y, 0], rot: [0, 0, Math.PI / 2] }));                                // pivot pin
    for (const c of [-1, 1]) g.add(K.mesh(K.geo.cyl(0.0095, 0.005, 6), M.steel, { pos: [x + c * 0.0195, PIV_Y, 0], rot: [0, 0, Math.PI / 2] }));
  }
  const sw = new T.Group(); sw.position.set(0, PIV_Y, 0); g.add(sw);
  // chain: a ring on the pin, real links (alternating a quarter turn), an eye on the seat
  const RR = 0.016, rr = 0.0042, PIN = 0.0055, ringY = -(RR - rr - PIN), LW = 0.0023, LR = 0.0062;
  const RE = 0.0125, re = 0.0038, seatTopY = -L + ST / 2, eyeY = seatTopY + RE - 0.0005;
  const yTop = ringY - (RR - rr) + LW, yBot = eyeY + (RE - re) - LW, D = yTop - yBot;
  const NL = Math.round((D - 2 * LW) / 0.025), pitch = (D - 2 * LW) / NL, la = pitch / 2 + LW - LR;
  const lp = [];
  for (let i = 0; i < 8; i++) { const a = Math.PI * i / 7; lp.push([LR * Math.cos(a), la + LR * Math.sin(a), 0]); }
  for (let i = 0; i < 8; i++) { const a = Math.PI + Math.PI * i / 7; lp.push([LR * Math.cos(a), -la + LR * Math.sin(a), 0]); }
  const links = new T.InstancedMesh(K.geo.tube(lp, LW, { closed: true, seg: 28, rad: 7 }), M.chain, NL * 2); links.castShadow = true; links.receiveShadow = true;
  { const dm = new T.Object3D(); let n = 0;
    for (const sx of [-1, 1]) for (let i = 0; i < NL; i++) { dm.position.set(sx * XH, yTop - (la + LR) - i * pitch, 0); dm.rotation.set(0, i % 2 ? Math.PI / 2 : 0, 0); dm.updateMatrix(); links.setMatrixAt(n++, dm.matrix); }
    links.instanceMatrix.needsUpdate = true; }
  sw.add(links);
  const eyeTurn = (NL - 1) % 2 ? 0 : Math.PI / 2;
  for (const sx of [-1, 1]) {
    sw.add(K.mesh(new T.TorusGeometry(RR, rr, 12, 40), M.steel, { pos: [sx * XH, ringY, 0], rot: [0, Math.PI / 2, 0] }));
    sw.add(K.mesh(new T.TorusGeometry(RE, re, 12, 36), M.steel, { pos: [sx * XH, eyeY, 0], rot: [0, eyeTurn, 0] }));
    sw.add(K.mesh(K.geo.rbox(0.042, 0.005, 0.118, 0.002), M.steel, { pos: [sx * XH, seatTopY + 0.002, 0] }));                              // eye plate
    for (const c of [-1, 1]) sw.add(K.mesh(K.geo.cyl(0.0065, 0.004, 20, 0.005), M.steel, { pos: [sx * XH, seatTopY + 0.0062, c * 0.043] }));   // rivets
  }
  // seat: a flat rubber slab with grip ribs
  sw.add(K.mesh(K.geo.rbox(SW, ST, SD, 0.013, 6), M.seat, { pos: [0, -L, 0] }));
  for (let i = -2; i <= 2; i++) sw.add(K.mesh(K.geo.rbox(SW - 0.17, 0.005, 0.010, 0.0024), M.seat, { pos: [0, seatTopY + 0.0012, i * 0.027] }));

  // ---------------------------------------------------------------- the pusher: a sleeve, a forearm and a mitten hand in matte clay
  // Built in the arm's own frame: forearm along +Z, the wrist bent back so the palm faces forward and a little down,
  // fingers up. s = distance along the spine from the elbow end.
  const R0 = -0.45, HS = o.handScale ?? 1.4, FOLLOW = 0.6, TRAVEL = 0.30, TILT = 0.7, GAP = 0.002;
  const LA = 0.27, HB = 0.034, LP = 0.088, LF = 0.092, EXT = Math.PI / 2 + R0, CAP = 0.032;
  const sW0 = LA - HB, sP0 = LA + HB, sK = sP0 + LP, sE = sK + LF;
  const phi = (s) => EXT * sst((s - sW0) / (2 * HB));                 // the wrist: straight forearm, then the palm stands up
  const NSP = 800, SP = new Float32Array((NSP + 1) * 2);
  { let y = 0, z = 0; const ds = sE / NSP; for (let i = 0; i <= NSP; i++) { SP[2 * i] = z; SP[2 * i + 1] = y; const p = phi((i + 0.5) * ds); z += Math.cos(p) * ds; y += Math.sin(p) * ds; } }
  const spine = (s) => { const f = K.clamp(s / sE) * NSP, i = Math.min(NSP - 1, Math.floor(f)), k = f - i; return [K.lerp(SP[2 * i], SP[2 * i + 2], k), K.lerp(SP[2 * i + 1], SP[2 * i + 3], k)]; };   // -> [z, y]
  const curve = (keys) => (s) => {                                 // a smooth curve through [s, value] keys
    let i = 0; while (i < keys.length - 2 && s > keys[i + 1][0]) i++;
    const p0 = keys[Math.max(0, i - 1)], p1 = keys[i], p2 = keys[i + 1], p3 = keys[Math.min(keys.length - 1, i + 2)];
    const h = p2[0] - p1[0], u = K.clamp((s - p1[0]) / h), m1 = (p2[1] - p0[1]) / (p2[0] - p0[0]) * h, m2 = (p3[1] - p1[1]) / (p3[0] - p1[0]) * h, u2 = u * u, u3 = u2 * u;
    return (2 * u3 - 3 * u2 + 1) * p1[1] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[1] + (u3 - u2) * m2;
  };
  // a closed skin over rings of points: fn(r, j, p) writes ring r, column j into p. The faces are turned to look outward.
  const skin = (NR, NC, fn) => {
    const pos = new Float32Array(NR * NC * 3), idx = [], p = [0, 0, 0];
    for (let r = 0; r < NR; r++) for (let j = 0; j < NC; j++) { fn(r, j, p); const k = (r * NC + j) * 3; pos[k] = p[0]; pos[k + 1] = p[1]; pos[k + 2] = p[2]; }
    for (let r = 0; r < NR - 1; r++) for (let j = 0; j < NC; j++) { const a = r * NC + j, b = r * NC + (j + 1) % NC, c = a + NC, d = b + NC; idx.push(a, b, c, b, d, c); }
    let vol = 0;                                                   // signed volume: negative = inside out
    for (let i = 0; i < idx.length; i += 3) { const a = idx[i] * 3, b = idx[i + 1] * 3, c = idx[i + 2] * 3;
      vol += pos[a] * (pos[b + 1] * pos[c + 2] - pos[b + 2] * pos[c + 1]) + pos[a + 1] * (pos[b + 2] * pos[c] - pos[b] * pos[c + 2]) + pos[a + 2] * (pos[b] * pos[c + 1] - pos[b + 1] * pos[c]); }
    if (vol < 0) for (let i = 0; i < idx.length; i += 3) { const x = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = x; }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
  };
  const wK = curve([[0, 0.039], [LA * 0.5, 0.0345], [sW0, 0.0285], [LA, 0.0278], [sP0, 0.0350], [sP0 + 0.04, 0.0435], [sK, 0.0445], [sK + 0.045, 0.0418], [sE, 0.0388]]);   // half width
  const tK = curve([[0, 0.035], [LA * 0.5, 0.031], [sW0, 0.0240], [LA, 0.0222], [sP0, 0.0232], [sP0 + 0.04, 0.0188], [sK, 0.0158], [sK + 0.045, 0.0133], [sE, 0.0113]]);      // half thickness
  const nK = curve([[0, 2], [sW0, 2.05], [sP0, 2.3], [sK, 2.7], [sE, 2.9]]);                                                                                               // how square the section is
  const kPalm = (s) => 1 - 0.14 * sst((s - sW0) / (sP0 + 0.02 - sW0));                                                                                                      // the palm side is flatter than the back
  const FLN = [0.80, 0.95, 1.0, 0.93];                             // finger lengths, little finger .. index (the thumb is on +X)
  const fl = (u) => { const f = K.clamp((u + 0.75) / 0.5, 0, 3), i = Math.min(2, Math.floor(f)), len = K.lerp(FLN[i], FLN[i + 1], sst(f - i)), du = ((u + 1) % 0.5) / 0.25 - 1;
    return len - 0.10 * (1 - Math.sqrt(Math.max(0, 1 - 0.92 * du * du))); };
  const GW = 0.075, notch = (u) => { if (Math.abs(u) > 0.75) return 0; const dg = Math.abs(((u + 1.25) % 0.5) - 0.25); return dg < GW ? Math.pow(Math.cos(Math.PI / 2 * dg / GW), 2) : 0; };
  const gss = (x, c, w) => Math.exp(-Math.pow((x - c) / w, 2));
  const pads = (u, s) => 0.0016 * gss(u, 0.52, 0.40) * gss(s, sP0 + 0.022, 0.030) + 0.0032 * gss(u, -0.56, 0.36) * gss(s, sP0 + 0.026, 0.032) + 0.0014 * gss(s, sK - 0.010, 0.012);   // thumb-side heel, little-finger heel, the row under the knuckles
  // the fingers curl forward a little, the little finger more than the index, so the tips fan out (seen from the side it reads as a hand, not a blade)
  const sF0 = sK - 0.03, FD = LF + 0.03, PF = spine(sF0), FP = [0, 0, 0];
  const fingerAt = (sv, u, out) => {
    const c = K.lerp(0.44, 0.13, (u + 1) / 2), N = 16, ds = (sv - sF0) / N; let z = PF[0], y = PF[1];
    for (let i = 0; i < N; i++) { const a = EXT - c * sst((i + 0.5) * ds / FD); z += Math.cos(a) * ds; y += Math.sin(a) * ds; }
    out[0] = z; out[1] = y; out[2] = EXT - c * sst((sv - sF0) / FD);
  };
  // the thumb's axis in palm coordinates [x across, v toward the fingers from sT, n out of the palm, radius]: it lies in the
  // plane of the palm and is a touch flat, so it never pokes through the seat
  const sT = sP0 + 0.012, FLT = 0.86, KB = 0.004, TH = [];
  const tPath = new T.CatmullRomCurve3([V(0.014, 0.000, 0.003), V(0.041, 0.022, 0.004), V(0.064, 0.046, 0.0015), V(0.079, 0.074, 0)], false, 'centripetal');
  const rT = curve([[0, 0.0215], [0.3, 0.0172], [0.62, 0.0130], [1, 0.0110]]);
  for (let i = 0; i <= 48; i++) { const q = tPath.getPoint(i / 48); TH.push([q.x, q.y, q.z, rT(i / 48)]); }
  // how far the thumb's skin stands off the palm's mid-plane over the point (x, v), on the palm side (+1) or the back (-1)
  const thumbH = (x, v, side) => { let best = -1;
    for (let i = 0; i < TH.length; i++) { const a = TH[i], q = a[3] * a[3] - (x - a[0]) * (x - a[0]) - (v - a[1]) * (v - a[1]), h = side * a[2] + FLT * (q >= 0 ? Math.sqrt(q) : -1.5 * Math.sqrt(-q)); if (h > best) best = h; }
    return best; };
  const rows = [];
  for (let i = 0; i <= 8; i++) rows.push(CAP * (1 - Math.cos(i / 8 * Math.PI / 2)));
  for (let i = 1; i <= 12; i++) rows.push(K.lerp(CAP, sW0, i / 12));
  for (let i = 1; i <= 18; i++) rows.push(K.lerp(sW0, sP0, i / 18));
  for (let i = 1; i <= 30; i++) rows.push(K.lerp(sP0, sK, i / 30));
  for (let i = 1; i <= 18; i++) rows.push(sK + LF * 0.84 * i / 18);
  for (let i = 1; i <= 10; i++) rows.push(sK + LF * (0.84 + 0.16 * Math.sin(i / 10 * Math.PI / 2)));
  const NH = 76, NA = NH * 2;
  const hgeo = skin(rows.length, NA, (r, j, p) => {
    const s = rows[r], capf = s < CAP ? Math.sqrt(Math.max(0, 1 - Math.pow(1 - s / CAP, 2))) : 1, q = K.clamp(((s - sK) / LF - 0.84) / 0.16), tipf = Math.sqrt(Math.max(0, 1 - q * q));
    const w = wK(s) * capf * (1 - 0.06 * q * q), t = tK(s) * capf * tipf, n = nK(s), fz = sst((s - sK) / (0.3 * LF)), kp = kPalm(s);
    const side = j <= NH ? 1 : -1, psi = side > 0 ? -Math.PI / 2 + j * Math.PI / NH : Math.PI / 2 - (j - NH) * Math.PI / NH, u = Math.sin(psi);
    const edge = Math.pow(Math.max(0, 1 - Math.pow(Math.abs(u), n)), 1 / n);
    let zt = edge * (t * (side > 0 ? kp : 1) + (side > 0 ? pads(u, s) * capf : 0));
    if (u > 0 && s > sP0 - 0.03 && s < sP0 + 0.115) { const h = thumbH(u * w, s - sT, side) - 0.0012 - 0.0032 * sst((u - 0.72) / 0.28); zt = 0.5 * (zt + h + Math.sqrt((zt - h) * (zt - h) + KB * KB)); }   // the skin rises into the root of the thumb (a smooth union, no crease)
    if (fz > 0) zt = Math.max(zt * 0.3, zt - (side > 0 ? 0.0027 : 0.0022) * fz * (1 + 0.5 * K.clamp((s - sK) / LF)) * notch(u));       // the grooves between the fused fingers
    const sv = s <= sK ? s : sK + (s - sK) * fl(u); let pz, py, ph;
    if (sv > sF0) { fingerAt(sv, u, FP); pz = FP[0]; py = FP[1]; ph = FP[2]; } else { const P = spine(sv); pz = P[0]; py = P[1]; ph = phi(sv); }
    p[0] = u * w; p[1] = py - Math.cos(ph) * side * zt; p[2] = pz + Math.sin(ph) * side * zt;
  });
  const arm = new T.Group(), handG = new T.Group(); handG.add(arm); g.add(handG);
  arm.add(K.mesh(hgeo, M.hand));
  // local basis on the spine: X across the hand, Tn toward the fingertips, Nn out of the palm
  const basisAt = (s) => { const P = spine(s), ph = phi(s); return { P: V(0, P[1], P[0]), X: V(1, 0, 0), Tn: V(0, Math.sin(ph), Math.cos(ph)), Nn: V(0, -Math.cos(ph), Math.sin(ph)) }; };
  // thumb: one curved, tapered finger growing out of the mound at the heel of the palm
  { const B = basisAt(sT), NC = 36, NB = 26, R = [], C = V(0, 0, 0), Tg = V(0, 0, 0), E2 = V(0, 0, 0), q = V(0, 0, 0);
    const to3 = (a, out) => out.copy(B.X).multiplyScalar(a.x).addScaledVector(B.Tn, a.y).addScaledVector(B.Nn, a.z);
    for (let i = 0; i <= 5; i++) { const a = i / 5 * Math.PI / 2; R.push([0, -0.012 * Math.cos(a), rT(0) * Math.sin(a)]); }       // rows: [place on the axis, shift along it, radius]
    for (let i = 1; i <= NB; i++) R.push([i / NB, 0, rT(i / NB)]);
    for (let i = 1; i <= 8; i++) { const a = i / 8 * Math.PI / 2; R.push([1, rT(1) * Math.sin(a), rT(1) * Math.cos(a)]); }
    arm.add(K.mesh(skin(R.length, NC, (r, j, p) => { const h = R[r][0], rad = R[r][2], th = j / NC * Math.PI * 2;
      to3(tPath.getPoint(h, q), C).add(B.P); to3(tPath.getTangent(h, q), Tg).normalize(); E2.crossVectors(Tg, B.Nn).normalize();
      C.addScaledVector(Tg, R[r][1]).addScaledVector(E2, rad * Math.cos(th)).addScaledVector(B.Nn, rad * FLT * Math.sin(th)); p[0] = C.x; p[1] = C.y; p[2] = C.z; }), M.hand)); }
  // sleeve: the forearm comes out of a clean-cut sleeve with a cuff, so the arm ends on purpose instead of in a stump
  if (o.sleeve !== 'none') {
    const E = 0.0075, EC = 0.0036, S0 = -0.006, S1 = sW0 - 0.028, SC = S1 - 0.034, f = 0.008, fc = 0.0045, NC = 72, R = [[S0, E, 0], [S0, E, 0.45]];   // rows: [s, offset over the skin, scale (for the closed ends)]
    for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; R.push([S0 + f * (1 - Math.cos(a)), E, 1 - f / 0.045 * (1 - Math.sin(a))]); }
    for (let i = 1; i <= 8; i++) R.push([K.lerp(S0 + f, SC - 0.004, i / 8), E, 1]);
    for (let i = 1; i <= 5; i++) R.push([SC - 0.004 + 0.006 * i / 5, E + EC * sst(i / 5), 1]);                                    // the cuff steps up
    R.push([S1 - fc - 0.012, E + EC, 1]);
    for (let i = 0; i <= 6; i++) { const a = i / 6 * Math.PI / 2; R.push([S1 - fc + fc * Math.sin(a), E + EC - fc * (1 - Math.cos(a)), 1]); }
    R.push([S1, -0.003, 1], [S1, -0.003, 0]);
    arm.add(K.mesh(skin(R.length, NC, (r, j, p) => { const s = R[r][0], e = R[r][1], m = R[r][2], th = j / NC * Math.PI * 2;
      p[0] = (wK(s) + e) * m * Math.cos(th); p[1] = (tK(s) + e) * m * Math.sin(th); p[2] = s; }), M.sleeve));
  }
  // the palm's contact point becomes the hand group's origin, so the hand is placed and tilted about the spot that touches the seat
  const EL = [0, 0, 0];                                            // the far end of the sleeve, seen from the contact point (hand group frame)
  { const sC = sP0 + 0.058, B = basisAt(sC), C = B.P.clone().addScaledVector(B.Nn, tK(sC) * kPalm(sC)); arm.scale.setScalar(HS); arm.position.copy(C).multiplyScalar(-HS);
    EL[1] = -HS * C.y; EL[2] = HS * (-0.006 - C.z); }

  // where the palm is for a given push and reach (local): written into out
  const HP = [0, 0, 0];
  const handPos = (push, reach, out) => {
    const a = reach + Math.max(0, push - 1) * FOLLOW, back = Math.max(0, 1 - push) * TRAVEL, ey = -L, ez = -(SD / 2 + GAP), ca = Math.cos(a), sa = Math.sin(a);
    out[0] = 0; out[1] = PIV_Y + ey * ca + ez * sa - sa * back; out[2] = -ey * sa + ez * ca - ca * back; return a;
  };
  const seatAt = (ang) => [0, PIV_Y - (L - ST / 2) * Math.cos(ang), (L - ST / 2) * Math.sin(ang)];
  const handAt = (push = 0, reach = R0) => { const p = [0, 0, 0]; handPos(push, reach, p); return p; };
  const elbowAt = (push = 0, reach = R0) => { const p = [0, 0, 0], th = -(handPos(push, reach, p) - R0) * TILT, c = Math.cos(th), sn = Math.sin(th);
    return [0, p[1] + EL[1] * c - EL[2] * sn, p[2] + EL[1] * sn + EL[2] * c]; };
  const PERIOD = 2.5, PC = 0.11, DA = 0.085;
  return {
    group: g,
    size: { H: BAR_Y, W: 2 * (XB + FOOT_DX), D: 2 * FOOT_Z, L: L - ST / 2, pivotY: PIV_Y, seatW: SW, seatD: SD, seatT: ST, seatTop: SEAT_TOP, chainX: XH, period: PERIOD, follow: FOLLOW, travel: TRAVEL, reach0: R0, handScale: HS, armLen: HS * (sE + 0.006) },
    anchors: { seat: [0, SEAT_TOP, 0], pivot: [0, PIV_Y, 0], hand: handAt(0, R0), contact: handAt(1, R0), elbow: elbowAt(0, R0), top: [0, BAR_Y, 0], seatBack: seatAt(R0), seatFront: seatAt(-R0), ground: [0, 0, 0] },
    seatAt, handAt, elbowAt,
    view: { l: [0, 1.05, -0.25], d: 11.5, close: [0, 0.62, -0.5],
      keys: o.keys || [{ az: 0.78, el: 0.16 }, { az: -0.5, el: 0.5, d: 2.2, l: [0, 0.62, -0.45] }, { az: 1.5, el: 0.06 }, { az: -0.62, el: 0.12 }, { az: 0.45, el: 0.12, d: 2.9, l: [0.5, 1.97, 0] }, { az: 2.3, el: 0.34, d: 3.3, l: [0, 0.68, -0.85] }] },
    defaults: { ang: 0, push: 0, reach: R0, handVis: true },
    apply(s) {
      sw.rotation.x = -(s.ang || 0);
      handG.visible = !!s.handVis; if (!handG.visible) return;
      const a = handPos(s.push || 0, s.reach ?? R0, HP);
      handG.position.set(HP[0], HP[1], HP[2]); handG.rotation.x = -(a - R0) * TILT;
    },
    // a growing swing: the hand meets the seat at the back of every cycle, shoves, lets go, comes back
    demo(s, t) {
      if (o.pose) { Object.assign(s, Array.isArray(o.pose) ? o.pose[Math.min(o.pose.length - 1, Math.floor(t / 2))] : o.pose); return; }   // preview aid: hold a pose (or one pose per view)
      const n = Math.floor(t / PERIOD), p = t / PERIOD - n, B = 0.14 + DA * n, w = 2 * Math.PI;
      const ang = (p) => -(B + DA * sst(p / 0.3)) * Math.cos(w * p);
      s.ang = ang(p); s.reach = -(B + DA * sst((p - 0.2) / 0.5)); s.handVis = true;
      if (p < PC) s.push = 1 + (s.ang + B) / FOLLOW;                                            // palm on the seat, riding its arc
      else if (p < 0.45) { const pe = 1 + (ang(PC) + B) / FOLLOW, v0 = (ang(PC) - ang(PC - 0.002)) / 0.002 / FOLLOW, x = (p - PC) / (0.45 - PC);
        s.push = (pe + v0 * (p - PC) * (1 - x) * (1 - x)) * (1 - sst(x)); }                     // lets go and draws back
      else if (p > 0.74) s.push = 0.5 - 0.5 * Math.cos(Math.PI * (p - 0.74) / 0.26);            // comes forward to arrive as the seat stops at the back
      else s.push = 0;
    },
  };
});
