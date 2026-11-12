// 35.4 - 54.75 s. The gate fires; the swing; it listens; it works backwards.
// Macro frame "M" (used for everything at tag scale in this sequence): origin = centre of the tag's underside,
// +X toward gate B (the way the gate's loops travel), +Z toward the exit, Y up. M is the T station turned by -90 deg,
// so the purple bands cross the strip in the very direction the big loops cross the gap.
(function () {
  const K = KIT, T = THREE, PI = Math.PI, FOG = [1.6, 4.5];
  const cl = K.clamp, lerp = K.lerp, seg = K.seg, sm = (a, b, x) => OM.sstep(a, b, x), sst = x => { x = cl(x); return x * x * (3 - 2 * x); };
  const m2t = p => [-p[2], p[1], p[0]];                                         // a point in M -> the T station
  const camM = (t, o) => K.cam.key(t, Object.assign({ fov: 24, fog: FOG }, o, { st: 'T', l: m2t(o.l), az: o.az - PI / 2 }));   // az given in the G frame
  const camG = (t, o) => K.cam.key(t, Object.assign({ fov: 24, st: 'G' }, o));

  // ---------------------------------------------------------------- the clock of the shake
  const P = 2 / 3, TQ = 40.8333, NPUSH = 8;                                     // one push every P seconds; pushes at TQ + n P (n = 0..7); the strip is longest half a period after each
  const q = t => (t - TQ) / P;
  const T_OFF = 46.2, TAU = 7.5;
  const amp = t => t < T_OFF ? 0.03 * Math.pow(seg(t, 40.5, 45.9), 0.9) : 0.03 * Math.exp(-(t - T_OFF) / TAU);
  const len = t => -amp(t) * Math.cos(2 * PI * q(t));
  const PH = t => 4 * (t - 40.45) + 6.4 + 400;                                  // the big loops: 4 spacings a second (0.5 m/s); a dark loop is over the bag at 40.45

  // ---------------------------------------------------------------- camera
  K.cam.key(35.40, { st: 'T', l: [0, 0.0012, 0], d: 0.11, az: 0.90, el: 0.35, fov: 24, ap: 0.0010, fog: FOG });                   // H2
  camG(36.95, { l: [0.02, 0.64, 0.0], d: 8.7, az: 2.50, el: 0.13, dive: true, ease: 'cubicInOut' });                              // straight pull-out
  camG(39.10, { l: [0.0, 0.64, 0.0], d: 8.2, az: 2.86, el: 0.15, ease: 'sineInOut' });                                            // slow arc behind the shopper
  camG(40.10, { l: [0.30, 0.52, 0.19], d: 1.3, az: 3.12, el: 0.28, dive: true, ease: 'cubicIn' });                                // in on the bag as a dark loop reaches it
  camG(40.45, { l: [0.30, 0.31, 0.195], d: 0.35, az: 3.5, el: 1.42, ease: 'linear', ap: 0.0006 });                                // over the mouth, down the loop's upright
  camM(41.00, { l: [-0.0175, 0.0015, 0.0005], d: 0.055, az: -0.85 + 2 * PI, el: 0.20, ap: 0.0014, ease: 'sineOut' });             // land on the near tip
  camM(42.30, { l: [-0.0165, 0.0015, 0.0], d: 0.050, az: -0.78 + 2 * PI, el: 0.18, ap: 0.0014, ease: 'sineInOut' });
  camM(43.00, { l: [-0.008, 0.0135, -0.006], d: 0.148, az: -0.72 + 2 * PI, el: 0.16, ap: 0.0012, ease: 'cubicInOut' });
  camM(46.15, { l: [-0.012, 0.0125, -0.003], d: 0.13, az: -0.62 + 2 * PI, el: 0.20, ap: 0.0012, ease: 'sineInOut' });
  camG(46.85, { l: [0.5, 1.36, 0.0], d: 2.3, az: -1.25 + 2 * PI, el: 0.10, dive: true, ease: 'cubicInOut' });                 // tip up to gate B's light
  camG(47.95, { l: [0.5, 1.38, 0.0], d: 2.05, az: -1.12 + 2 * PI, el: 0.09, ease: 'sineInOut' });
  camM(48.45, { l: [0.0, 0.0015, 0.0], d: 0.18, az: -0.45 + 2 * PI, el: 0.60, ap: 0.0010, dive: true, ease: 'cubicInOut' });      // back down: the whole strip
  camM(51.00, { l: [0.0, 0.0025, 0.0], d: 0.15, az: -0.30 + 2 * PI, el: 0.42, ap: 0.0010, ease: 'sineInOut' });
  camM(53.60, { l: [0.0, 0.006, 0.0], d: 0.24, az: -0.10 + 2 * PI, el: 0.36, ap: 0.0008, ease: 'sineInOut' });
  camG(54.75, { l: [0.15, 0.75, 0], d: 5.4, az: -0.45 + 2 * PI, el: 0.12, dive: true, ease: 'cubicInOut' });                      // H3

  // ---------------------------------------------------------------- extra models (only this sequence uses them)
  const MG = new T.Group(); MG.rotation.y = -PI / 2; K.stations.T.g.add(MG);     // the M frame
  const NB = 8, GAP = 0.0095, XN = -0.019, bands = [];
  for (let i = 0; i < NB; i++) { const b = K.make('band'); b.defaults.vis = false; MG.add(b.group); bands.push(b); }

  K.event(35.45, 'pullout', 'out of the tag and the bag to both gates', 1.4); K.event(36.9, 'pulse', 'the gate fires: purple loops stream across the gap', 2.6);
  K.event(39.7, 'dive', 'ride a purple loop back into the bag and the tag', 1.2); K.event(41.0, 'pulse', 'purple bands push the strip, the swing is pushed in the same rhythm', 2.4);
  K.event(43.9, 'pulse', 'it shakes harder and harder', 2.0); K.event(46.2, 'quiet', 'the gate stops: no field', 1.6); K.event(46.35, 'whip', 'up to the gate light', 0.45);
  K.event(46.9, 'reveal', 'the gate light turns white: it listens', 0.5); K.event(48.0, 'dive', 'back down onto the strip', 0.5);
  K.event(51.05, 'reveal', 'it works backwards: the shaking strip sends out orange loops', 0.8); K.event(52.4, 'pulse', 'orange loops leave through the tag skin', 1.6);
  K.event(53.7, 'pullout', 'follow an orange loop out of the bag', 1.0);
  K.shot({ id: 'gate-fires', t0: 35.4, t1: 54.75, update(t, u) {
    const w = u.w, tag = w.tag, s = tag.s;
    // ---- the people and the gates
    w.legs.s.still = 1;
    const listen = t >= 46.9, lc = listen ? 'white' : 'green';
    w.gA.s.light = lc; w.gB.s.light = lc; w.gA.s.glow = w.gB.s.glow = listen ? 0.9 : 0.55;
    w.gA.s.coil = sm(36.5, 36.9, t) * (1 - sm(46.1, 46.45, t));
    w.bag.s.xray = 1 - sm(36.25, 36.95, t);
    // ---- the gate's field at human scale
    const gf = w.gatefield; gf.s.vis = t > 36.5 && t < 40.8;
    gf.s.amp = sm(36.55, 36.85, t) * (1 - sm(40.42, 40.66, t)); gf.s.phase = PH(t); gf.s.reach = cl(0.5 * (t - 36.6));
    gf.s.lw = lerp(1, 0.12, sm(40.0, 40.5, t));
    // ---- the tag: open, turned so the strip lies along the field's travel (turned while the bag hides it)
    const turned = t > 37.9;
    if (turned) { tag.group.rotation.y = -PI / 2; w.pin.group.position.set(-0.0052, 0.0008, 0); }
    s.lid = 1; s.wall = 0; s.xray = 0; s.blue = 0; s.marks = 0; s.dim = 0;
    s.len = len(t);
    w.pin.s.vis = true;
    // ---- the bands: a conveyor along the strip, dark on the tips when the strip is longest
    const bo = sm(40.45, 40.85, t) * (1 - sm(45.85, 46.2, t)), cyc = q(t) - 0.5;
    for (let i = 0; i < NB; i++) {
      const b = bands[i], uu = (((i + 2 * cyc) % NB) + NB) % NB, x = XN + (uu - 2) * GAP;
      const a = bo * sm(-0.038, -0.028, x) * (1 - sm(0.028, 0.038, x));
      b.s.vis = a > 0.003; b.s.o = a; b.s.x = x; b.s.n = 1; b.s.dir = i % 2 === 0 ? 1 : -1; b.s.lw = 0.8;
    }
    s.glowEnds = bo * (0.25 + 0.75 * Math.max(0, -Math.cos(2 * PI * q(t))));
    // ---- the swing behind the tag
    const sw = w.swing; sw.s.vis = t > 41.05 && t < 51.45;
    const SP = [0.012, 0, -0.032], SROT = 0.77, SSC = 0.012;
    const away = OM.ease.cubicIn(cl((t - 50.7) / 0.75)) * 0.9; sw.group.position.set(-SP[2] + away * 0.55, SP[1], SP[0] - away); sw.group.rotation.y = SROT - PI / 2; sw.group.scale.setScalar(SSC);
    const B0 = 0.10, DA = 0.075, FOLLOW = 0.6, PC = 0.11, qq = q(t), W2 = 2 * PI;
    if (qq < 0) { sw.s.ang = -B0 * Math.cos(W2 * qq); sw.s.reach = -B0; sw.s.push = qq > -0.26 ? 0.5 - 0.5 * Math.cos(PI * (qq + 0.26) / 0.26) : 0; }
    else if (qq < NPUSH) {
      const n = Math.floor(qq), p = qq - n, B = B0 + DA * n, ang = pp => -(B + DA * sst(pp / 0.3)) * Math.cos(W2 * pp);
      sw.s.ang = ang(p); sw.s.reach = -(B + DA * sst((p - 0.2) / 0.5));
      if (p < PC) sw.s.push = 1 + (sw.s.ang + B) / FOLLOW;
      else if (p < 0.45) { const pe = 1 + (ang(PC) + B) / FOLLOW, v0 = (ang(PC) - ang(PC - 0.002)) / 0.002 / FOLLOW, x = (p - PC) / (0.45 - PC); sw.s.push = (pe + v0 * (p - PC) * (1 - x) * (1 - x)) * (1 - sst(x)); }
      else if (p > 0.74 && n < NPUSH - 1) sw.s.push = 0.5 - 0.5 * Math.cos(PI * (p - 0.74) / 0.26);
      else sw.s.push = 0;
    } else { const Be = B0 + DA * NPUSH, tN = TQ + NPUSH * P; sw.s.ang = -Be * Math.exp(-(t - tN) / TAU) * Math.cos(W2 * qq); sw.s.push = 0; sw.s.reach = -Be; }
    sw.s.handVis = t < 46.9;
    // ---- the answer
    s.ans = sm(51.0, 51.3, t); s.ansT = 3 * (q(t) - 0.5) + 300; s.ansTilt = PI / 2;
    // ---- the few words
    const fade = (a, b, c, d) => Math.min(sm(a, b, t), 1 - sm(c, d, t));
    u.label('d-flips', '58,000 flips a second', { screen: [540, 1400], kind: 'mid', o: fade(37.2, 37.5, 39.3, 39.6) });
    u.label('d-burst', 'One burst lasts 1.6 thousandths of a second', { screen: [540, 1458], kind: 'small', o: fade(37.9, 38.2, 39.3, 39.6) });
    u.label('d-push', 'About 93 pushes in one burst', { screen: [540, 1448], kind: 'note', o: fade(44.0, 44.3, 45.8, 46.1) });
    u.label('d-silent', 'The gate is silent more than 85% of the time', { screen: [540, 1400], kind: 'note', o: fade(47.0, 47.25, 48.0, 48.25) });
    u.label('d-field', 'Not a sound. A magnetic field.', { screen: [540, 1400], kind: 'note', o: fade(52.5, 52.8, 54.0, 54.3) });
    u.label('d-foot', 'Slowed down and drawn bigger', { screen: [540, 1490], kind: 'small', o: Math.max(fade(41.0, 41.3, 46.2, 46.5), fade(48.6, 48.9, 53.6, 53.9)) });
  } });
})();
