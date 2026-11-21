// 90-112 s  "On newer watches, this same green light can warn you about high blood pressure." / "A healthy blood vessel is
//           soft, like a new garden hose, and every heartbeat makes it bulge. High blood pressure makes it stiff, like an old
//           hose left in the sun." / "The green light sees that bulge. If your blood vessels look stiff for thirty days, the
//           watch tells you to get your blood pressure checked."
// Up from under the watch to its face: the alert -> over the fingers to Apple's real alert photo standing behind the hand ->
// down onto two garden hoses running away from us (they fill the frame top to bottom): the new one bulges with every push,
// the old one barely moves; they turn into two blood vessels -> a second watch comes down over the soft one and shines its
// green light on it -> the 30-day calendar fills, that watch lands in front of it and shows the alert, the calendar warms.
(function () {
  const K = KIT, L = K.L, Wt = K.Wt, R = K.R40, w = K.w, T = THREE;
  const [b0, b1] = L('bp'), [h0, h1] = L('hose'), [g0, g1] = L('bulge'), [p0] = L('payoff');
  const card = w.bpPhoto ? w.bpPhoto.group.position.toArray() : [0.02, 0.072, -0.34], HX = w.HOSE[0], HZ = w.HOSE[1], NX = HX - 0.024, OX = HX + 0.024, CAL = w.CAL;
  // ---- the second watch: over the soft vessel, then lying in front of the calendar (screen up, read from the camera)
  const rotX = a => new T.Quaternion().setFromAxisAngle(K.V(1, 0, 0), a), rotY = a => new T.Quaternion().setFromAxisAngle(K.V(0, 1, 0), a);
  const flatQ = rotY(-0.35).multiply(rotX(-Math.PI / 2)), hoseQ = rotY(Math.PI / 2).multiply(rotX(-Math.PI / 2));
  const AW = { high: { p: [NX, 0.12, HZ + 0.04], q: hoseQ }, over: { p: [NX, 0.052, HZ + 0.01], q: hoseQ },
    cal: { p: [CAL[0] - 0.017, 0.0055, CAL[2] + 0.052], q: flatQ } };
  const tIn = Wt('bulge', 'The') - 0.9, tOver = Wt('bulge', 'green') - 0.1, tFly0 = Wt('bulge', 'If') - 0.35, tFly1 = Wt('bulge', 'look') + 0.15;
  const P0 = new T.Vector3(), P1 = new T.Vector3(), Qt = new T.Quaternion();
  const awPose = t => { const seg = t < tOver ? ['high', 'over', tIn, tOver] : ['over', 'cal', tFly0, tFly1]; const k = R.sm((t - seg[2]) / (seg[3] - seg[2])), A = AW[seg[0]], B = AW[seg[1]];
    P0.fromArray(A.p); P1.fromArray(B.p); const p = P0.lerp(P1, k); if (seg[0] === 'over') p.y += 0.05 * Math.sin(Math.PI * k); Qt.copy(A.q).slerp(B.q, k); return { p: p.clone(), q: Qt.clone() }; };
  // ---- camera
  K.cam.key(b0 + 0.2, { st: 'P', l: [0, R.TOP + 0.006, R.ZW], d: 0.12, az: R.PI2, el: 0.2, fov: 28, ease: 'cubicInOut' });
  K.cam.key(Wt('bp', 'this') + 0.1, R.deskScreen(0.13, { ease: 'cubicInOut' }));
  K.cam.key(Wt('bp', 'warn') + 0.1, R.deskScreen(0.125, { ease: 'sineInOut' }));
  K.cam.key(Wt('bp', 'about') + 0.15, { st: 'P', l: [card[0], card[1], card[2]], d: 0.30, az: 0.0, el: 0.04, ease: 'cubicInOut', lift: 0.05 });
  K.cam.key(h0 + 0.35, { st: 'P', l: [card[0], card[1] - 0.002, card[2]], d: 0.28, az: -0.04, el: 0.05, ease: 'sineInOut' });
  K.cam.key(Wt('hose', 'vessel') + 0.15, { st: 'P', l: [HX, 0.01, HZ], d: 0.31, az: 0.0, el: 1.3, ease: 'cubicInOut' });
  K.cam.key(Wt('hose', 'garden') - 0.1, { st: 'P', l: [HX - 0.006, 0.01, HZ + 0.005], d: 0.3, az: 0.01, el: 1.31, ease: 'sineInOut' });
  K.cam.key(Wt('hose', 'bulge') + 0.2, { st: 'P', l: [HX - 0.008, 0.01, HZ + 0.01], d: 0.29, az: 0.03, el: 1.32, ease: 'sineInOut' });
  K.cam.key(Wt('hose', 'stiff') - 0.15, { st: 'P', l: [HX + 0.008, 0.01, HZ + 0.01], d: 0.29, az: -0.03, el: 1.32, ease: 'cubicInOut' });
  K.cam.key(h1 + 0.1, { st: 'P', l: [HX, 0.01, HZ + 0.015], d: 0.31, az: 0.0, el: 1.3, ease: 'sineInOut' });
  K.cam.key(Wt('bulge', 'sees') + 0.1, { st: 'P', l: [NX, 0.034, HZ + 0.01], d: 0.25, az: -1.15, el: 0.26, ease: 'cubicInOut' });
  K.cam.key(Wt('bulge', 'bulge') + 0.4, { st: 'P', l: [NX, 0.034, HZ + 0.01], d: 0.24, az: -1.2, el: 0.25, ease: 'sineInOut' });
  const calL = [CAL[0] - 0.006, CAL[1] - 0.012, CAL[2] + 0.02];
  K.cam.key(Wt('bulge', 'look') + 0.05, { st: 'P', l: calL, d: 0.27, az: -0.35, el: 0.2, ease: 'cubicInOut' });
  K.cam.key(p0 - 0.75, { st: 'P', l: calL, d: 0.25, az: -0.38, el: 0.22, ease: 'sineInOut' });
  R.awScreen = t => { const ps = awPose(t), n = K.V(0, 0, 1).applyQuaternion(ps.q), sp = K.V(w.aw.anchors.screen).applyQuaternion(ps.q).add(ps.p); return { l: sp.toArray(), az: -0.35, el: 1.42 }; };
  K.event(Wt('bp', 'this') - 0.4, 'whip', 'up to the watch face', 0.5); K.event(Wt('bp', 'warn'), 'alarm', 'the alert on the watch', 0.4);
  K.event(Wt('bp', 'about') - 0.35, 'whip', 'over the fingers to Apple\'s alert', 0.5); K.event(Wt('bp', 'high'), 'hit', 'high blood pressure', 0);
  K.event(h0 + 0.3, 'whip', 'down to the hoses', 0.5); K.event(Wt('hose', 'bulge'), 'pulse', 'the hose bulges', 0.4);
  K.event(Wt('hose', 'stiff') - 0.2, 'whip', 'to the stiff old hose', 0.3); K.event(h1, 'reveal', 'hoses become vessels', 0.8);
  K.event(Wt('bulge', 'sees') - 0.5, 'whip', 'round to the watch over the vessel', 0.5); K.event(Wt('bulge', 'look') - 0.5, 'whip', 'to the calendar', 0.5);
  for (let i = 0; i < 30; i += 6) K.event(Wt('bulge', 'look') + (Wt('bulge', 'days') - Wt('bulge', 'look')) * i / 30, 'tick', 'a day', 0);
  K.event(Wt('bulge', 'checked') - 0.5, 'alarm', 'the alert', 0.5);
  // the green light from the watch's back down onto the soft vessel (ink on paper)
  const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256; const c = cv.getContext('2d'), gr = c.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, 'rgba(30,220,100,0.75)'); gr.addColorStop(1, 'rgba(30,220,100,0.08)'); c.fillStyle = gr; c.fillRect(0, 0, 64, 256);
  const hz = c.createLinearGradient(0, 0, 64, 0); hz.addColorStop(0, 'rgba(0,0,0,1)'); hz.addColorStop(0.5, 'rgba(0,0,0,0)'); hz.addColorStop(1, 'rgba(0,0,0,1)'); c.globalCompositeOperation = 'destination-out'; c.fillStyle = hz; c.fillRect(0, 0, 64, 256);
  const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace;
  const sheet = new T.Mesh(new T.PlaneGeometry(0.028, 0.032), new T.MeshBasicMaterial({ map: tx, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, side: T.DoubleSide }));
  sheet.userData.noAO = true; sheet.userData.noDepth = true; sheet.renderOrder = 9; sheet.position.set(NX, 0.030, HZ + 0.01); sheet.rotation.y = Math.PI / 2; K.stations.P.g.add(sheet);
  K.shot({ id: 'bp', t0: b0 - 0.5, t1: p0 + 0.3, update(t, u) {
    const k = u.k;
    if (w.hw) Object.assign(w.hw.s, { screen: t > Wt('bp', 'warn') - 0.05 ? 'alert' : 'bpm', bpm: 155 });
    if (w.bpPhoto) { w.bpPhoto.s.o = 1; w.bpPhoto.s.lit = 0.95; w.bpPhoto.s.glow = 0; }
    const vessel = k(h1 - 0.1, Wt('bulge', 'The') + 0.4, t);
    if (w.hoseN) { w.hoseN.s.vessel = vessel; w.hoseN.s.amp = 0.85; w.hoseN.s.speed = 0.9; }
    if (w.hoseO) { w.hoseO.s.vessel = vessel; w.hoseO.s.amp = 0.05; w.hoseO.s.speed = 0.9; }
    u.label('soft', 'healthy: soft', { at: u.world('P', [NX, 0.02, HZ + 0.06]), dx: -150, dy: 0, kind: 'note', o: k(Wt('hose', 'soft') - 0.1, Wt('hose', 'soft') + 0.2, t) * (1 - k(Wt('hose', 'High') - 0.3, Wt('hose', 'High'), t)) });
    u.label('stiff', 'stiff', { at: u.world('P', [OX, 0.02, HZ + 0.06]), dx: 150, dy: 0, kind: 'note', color: '#a8322a', o: k(Wt('hose', 'stiff') - 0.1, Wt('hose', 'stiff') + 0.2, t) * (1 - k(h1 - 0.3, h1, t)) });
    // the second watch
    if (w.aw && t > tIn - 0.2) { const ps = awPose(t), fly = k(tFly0, tFly1, t); w.aw.s.vis = true; w.aw.group.position.copy(ps.p); w.aw.group.quaternion.copy(ps.q);
      Object.assign(w.aw.s, { screen: fly > 0.6 ? 'alert' : 'off', bpm: 72, on: fly > 0.6 ? 1 : 0, led: 1 - fly, flash: R.flash(t), glow: (1 - fly) * 0.5 }); }
    sheet.material.opacity = k(Wt('bulge', 'green') - 0.2, Wt('bulge', 'sees'), t) * (1 - k(tFly0 - 0.2, tFly0 + 0.1, t)) * 0.9;
    if (w.cal) { w.cal.s.fill = 30 * k(Wt('bulge', 'look'), Wt('bulge', 'days') + 0.2, t); w.cal.s.alert = k(Wt('bulge', 'checked') - 0.4, Wt('bulge', 'checked'), t); }
    if (w.cal) u.label('days', '30 days', { at: u.world('P', [CAL[0], CAL[1] + 0.036, CAL[2]]), dy: -50, kind: 'note', o: k(Wt('bulge', 'thirty'), Wt('bulge', 'thirty') + 0.25, t) * (1 - k(p0 - 0.8, p0 - 0.5, t)) });
    K.bloomS = 0.5;
  } });
})();
