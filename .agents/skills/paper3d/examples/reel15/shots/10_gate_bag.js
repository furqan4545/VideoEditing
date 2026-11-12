// 6.5 - 13.1 s. Sequence B: "it sometimes beeps at the people who already paid" -> down the receipt into the bag ->
// the cheese with its tag and the real headline -> the dive into the tag (ends on H1, looking along the strip).
// The shopper walks from t = 4.5 (seen through the hole in the print), crosses the gate line on "beeps" (6.62) and brakes.
(function () {
  const K = KIT, W = window.WORLD, T = THREE, E = OM.ease, clamp = K.clamp, lerp = K.lerp, sst = OM.sstep, PI = Math.PI;
  const seg = (t, a, b) => clamp((t - a) / (b - a));

  // ------------------------------------------------------------------ the walk (a pure function of t)
  // constant 1.4 m/s, then a damped-spring brake into WALK_Z1 with a small overshoot (the settle). The gait phase is
  // tied to z (one cycle per 1.44 m), so a planted foot never slides, not even while the body rocks over it.
  const V0 = 1.4, STRIDE = 1.44, T_BEEP = 6.62, BA = 4.5, BW = 4.0, X0 = 0.32, PH_END = 0.07;
  const brake = q => Math.exp(-BA * q) * (-X0 * Math.cos(BW * q) + (V0 - BA * X0) / BW * Math.sin(BW * q));   // z - WALK_Z1, q s after the brake starts
  let qLine = 0; { let lo = 0, hi = 0.35; for (let i = 0; i < 50; i++) { qLine = (lo + hi) / 2; if (brake(qLine) < -W.WALK_Z1) lo = qLine; else hi = qLine; } }
  const T_BRAKE = T_BEEP - qLine, T_START = T_BRAKE - (W.WALK_Z1 - X0 - W.WALK_Z0) / V0;
  const walkZ = t => t <= T_START ? W.WALK_Z0 : t < T_BRAKE ? W.WALK_Z0 + V0 * (t - T_START) : W.WALK_Z1 + brake(t - T_BRAKE);
  const phase = t => PH_END + (walkZ(t) - W.WALK_Z1) / STRIDE;
  // the bag: swings with the arm while he walks, keeps going forward when he brakes, then dies out like a pendulum
  const swingAt = t => {
    const q = t - T_BRAKE, wk = t < T_START ? 0 : q < 0 ? sst(T_START, T_START + 0.5, t) : Math.exp(-5 * q);
    const stop = q > 0 ? -0.15 * Math.exp(-1.7 * q) * Math.sin(4.5 * q) : 0;
    return (0.075 * Math.sin(2 * PI * phase(t) + 1.0) * wk + stop) * (1 - sst(10.3, 11.2, t));
  };

  // ------------------------------------------------------------------ where things sit in the bag (bag-local metres; the T station has the same axes, 44.9 mm higher)
  const REC = { x: -0.098, top: 0.57, z: 0.026 };                   // the receipt stands in the leading end of the bag, just behind the front wall; 19 cm stick out of the mouth
  const CARD = { s: 0.36, x: 0.051, y0: 0.020, z: -0.0578 };        // the headline: a clipping on the bag's back wall, right behind the cheese
  const qZ = new T.Quaternion(), AZ = new T.Vector3(0, 0, 1), M = new T.Matrix4(), qM = new T.Quaternion(), sM = new T.Vector3(), pM = new T.Vector3();
  const qWall = new T.Quaternion().setFromAxisAngle(new T.Vector3(1, 0, 0), PI / 2);        // a card lying on the wall: picture toward +Z, top of the page up
  // ride the bag's swing: turn a bag-local rest point about the grip
  function ride(inst, p, th, GY) {
    const c = Math.cos(th), s = Math.sin(th), dx = p[0], dy = p[1] - GY;
    inst.group.position.set(dx * c - dy * s, GY + dx * s + dy * c, p[2]);
    qZ.setFromAxisAngle(AZ, th); inst.group.quaternion.copy(qZ);
  }
  function shopper(t, u) {                                          // walker, legs, bag and what rides in it: for every time of the film
    const w = u.w, z = walkZ(t), th = swingAt(t), GY = (w.bag && w.bag.size.gripY) || 0.504;
    w.walker.position.z = z;
    if (w.legs) { w.legs.s.walk = phase(t); w.legs.s.still = t < T_START ? 1 - sst(T_START - 0.25, T_START + 0.15, t) : 0; }
    if (!w.bag) return;
    w.bag.s.hang = 1; w.bag.s.swing = th;
    if (w.cheese) ride(w.cheese, [0, w.bag.size.floorY, 0], th, GY);
    if (w.receipt) { ride(w.receipt, [REC.x, REC.top - w.receipt.size.topY, REC.z], th, GY); w.receipt.s.curl = 1; }
  }

  // ------------------------------------------------------------------ camera
  // 6.5 -> 7.75 is ONE move: it waits on the wide while the lights go red and he brakes, then pushes in and round to
  // the front of the bag (the front wall turns to glass on the way) and settles on the receipt.
  const pushIn = x => 0.05 * x + 0.95 * E.smoother(seg(x, 0.22, 1));
  K.cam.key(6.50, { st: 'G', l: [0, 0.92, 0], d: 6.5, az: 0.10 - W.rotG, el: 0.10, fov: 24 });                                   // H0
  K.cam.key(7.75, { st: 'T', l: [-0.018, 0.150, 0], d: 0.92, az: -0.72, el: 0.22, fov: 24, ease: pushIn });
  K.cam.key(8.32, { st: 'T', l: [-0.015, 0.138, 0], d: 0.74, az: -0.75, el: 0.25, fov: 24, ease: 'sineInOut' });                  // closer on the stamp
  K.cam.key(9.12, { st: 'T', l: [0.004, 0.043, 0], d: 0.62, az: -0.68, el: 0.42, fov: 24, ease: 'cubicInOut' });                  // down to the cheese
  K.cam.key(11.25, { st: 'T', l: [0.006, 0.048, 0], d: 0.55, az: -0.58, el: 0.46, fov: 24, ease: 'sineInOut' });
  // the dive: one accelerating, then settling move, sampled every 1/15 s along a smooth path: up over the tag while
  // the picture turns, straight down onto the barcode lid, then low along the strip
  const DV0 = 11.25, DV1 = 13.10, D0 = 0.55, D1 = 0.085, L0 = [0.006, 0.048, 0], L1 = [0.004, 0.0012, 0], AZ0 = -0.58, AZ1 = 1.15, EL0 = 0.46, EL1 = 0.32;
  const divePose = t => {
    const s = E.cubicInOut(seg(t, DV0, DV1)), d = Math.exp(lerp(Math.log(D0), Math.log(D1), s)), wl = (d - D1) / (D0 - D1), far = seg(d, 0.16, 0.42);
    return { st: 'T', l: [lerp(L1[0], L0[0], wl), lerp(L1[1], L0[1], wl), lerp(L1[2], L0[2], wl)], d, az: lerp(AZ0, AZ1, E.smooth(seg(s, 0.10, 0.90))), el: lerp(EL0, EL1, s) + 0.80 * Math.pow(Math.sin(PI * s), 1.2),
      fov: 24, ap: 0.0012 * s * s, fog: [lerp(1.6, 3, far), lerp(4.5, 11, far)], ease: 'linear', dive: true };
  };
  { const n = Math.round((DV1 - DV0) * 15); for (let i = 1; i < n; i++) { const t = DV0 + (DV1 - DV0) * i / n; K.cam.key(t, divePose(t)); } }
  K.cam.key(13.10, { st: 'T', l: [0.004, 0.0012, 0], d: 0.085, az: 1.15, el: 0.32, fov: 24, ap: 0.0012, fog: [1.6, 4.5], ease: 'linear', dive: true });   // H1

  // ------------------------------------------------------------------ sound moments
  K.event(T_BEEP, 'alarm', 'the gate beeps: both lights jump to red', 0.9);
  K.event(7.05, 'whip', 'push in and round to the front of the bag', 0.6);
  K.event(8.08, 'hit', 'PAID stamp lands on the receipt', 0.15);
  K.event(11.30, 'dive', 'dive from the bag into the tag', 1.8);
  K.event(12.30, 'reveal', 'the lid of the tag lifts off and fades', 0.7);

  // ------------------------------------------------------------------ the shots
  K.shot({ id: 'shopper', t0: 0, t1: 999, update(t, u) { shopper(t, u); } });
  K.shot({ id: 'gate-bag', t0: 5.0, t1: 13.1, update(t, u) {
    const w = u.w;
    if (w.keys) w.keys.s.vis = false;
    // the alarm
    if (t >= T_BEEP) for (const g of [w.gA, w.gB]) if (g) { g.s.light = 'red'; g.s.glow = 0.6 + 0.4 * Math.exp(-(t - T_BEEP) * 3); }
    // into the bag
    if (w.bag) w.bag.s.xray = E.smooth(seg(t, 7.3, 7.75));
    if (w.receipt) w.receipt.s.stamp = seg(t, 8.06, 8.34);
    u.label('paid', 'Paid. Still beeped.', { screen: [690, 880], kind: 'note', o: Math.min(seg(t, 8.0, 8.25), 1 - seg(t, 8.7, 8.95)) });
    // the real headline, on the back wall of the bag
    const c = w.cardNews;
    if (c && t > 9.2 && t < 11.2) {
      const o = Math.min(E.smooth(seg(t, 9.3, 9.65)), 1 - E.smooth(seg(t, 10.85, 11.1)));
      c.s.vis = true; c.s.o = o; c.s.shadow = 1; c.s.lift = lerp(0.30, 0.045, E.cubicOut(seg(t, 9.3, 10.0))) + 0.12 * E.smooth(seg(t, 10.85, 11.1));
      const G = K.stations.G.g; w.bag.group.updateWorldMatrix(true, false); G.updateWorldMatrix(true, false);
      M.copy(G.matrixWorld).invert().multiply(w.bag.group.matrixWorld); M.decompose(pM, qM, sM);
      c.group.position.set(CARD.x, CARD.y0 + CARD.s * c.size.H / 2, CARD.z).applyMatrix4(M); c.group.quaternion.copy(qM).multiply(qWall); c.group.scale.setScalar(CARD.s);
      u.label('real', 'Real headline, July 2022', { screen: [730, 620], kind: 'small', align: 'l', o: Math.min(seg(t, 9.7, 9.95), 1 - seg(t, 10.85, 11.1)) });
    }
    if (w.tag) {
      u.label('tagname', 'Security tag', { at: w.tag.at('top'), dx: 250, dy: -240, kind: 'name', o: Math.min(seg(t, 10.1, 10.35), 1 - seg(t, 11.0, 11.25)) });
      w.tag.s.lid = seg(t, 12.3, 13.0);                             // the tag opens
    }
  } });
})();
