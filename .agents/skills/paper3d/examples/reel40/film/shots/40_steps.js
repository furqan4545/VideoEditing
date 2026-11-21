// 57-90 s  "But there's another problem. When you run, every swing of your arm moves the blood in your wrist too." / "So the
//          watch sees two rhythms, your heart and your steps. Your heart beats about 155 times a minute, and your feet land
//          about 165 times." / "Sometimes the watch even counts your steps instead of your heartbeats." / "So the watch uses
//          a motion sensor to feel every swing, finds your step rhythm, and throws it away. What's left is your heartbeat." /
//          "But here's what almost nobody knows."
// Into the watch face, out of the runner's: his arm swing drawn in orange -> back through the glass to the cut wrist, where
// the blood in the vein rocks with every swing -> up to the watch and its two lines (green heart, orange steps); onto the
// face: 155 jumps to 165 -> back to the lines: the motion sensor chip rises out of the watch, the orange line is lifted out
// and thrown away, the green comes out clean -> down under the watch, a slow push into its green light.
(function () {
  const K = KIT, L = K.L, Wt = K.Wt, R = K.R40, w = K.w, T = THREE;
  const [p0, p1] = L('problem'), [y0, y1] = L('rhythms'), [s0, s1] = L('steps'), [m0, m1] = L('motion'), [n0, n1] = L('nobody'), [b0] = L('bp');
  const J3 = p0 - 0.22, J4 = Wt('problem', 'moves') - 0.12;
  R.segs.push([J3 - 0.6, J4 + 0.6, -6.0]);
  const prevArms = R.armsAt; R.armsAt = t => { for (const [a, b] of [[J3 - 0.7, J3 + 0.9], [J4 - 0.75, J4 + 0.2]]) if (t > a - 0.4 && t < b + 0.4) return 1 - 0.88 * Math.min(R.sm((t - a + 0.4) / 0.4), R.sm((b + 0.4 - t) / 0.4)); return prevArms(t); };
  // the swing arc: his left wrist over one stride, drawn once in his own frame
  let arc = null;
  if (w.runner && w.runner.wristL) { const pts = []; for (let i = 0; i < 48; i++) pts.push(w.runner.wristL(Object.assign({}, w.runner.defaults, { run: i / 48, arms: 1, still: 0 })).pos);
    arc = K.tubeLine(pts, { color: '#ff7a12', r: 0.007, opacity: 0, closed: true, seg: 160 }); arc.material.depthWrite = false; arc.renderOrder = 9; w.runner.group.add(arc); }
  // ---- through the face to the runner
  K.cam.key(J3, R.deskScreen(R.DIN, { ease: 'cubicIn' }));
  R.outOfRunner(J3, J3 + 0.42);
  R.runCam(J3 + 0.45, J4 - 0.6, [
    [J3 + 0.45, { scr: 1, d: 0.09, az: 1.15, el: 0.08, ly: 1.02 }],
    [J3 + 1.2, { scr: 0, d: 4.3, az: 1.15, el: 0.08, ly: 1.02 }],
    [Wt('problem', 'swing') - 0.2, { d: 3.0, az: 1.22, el: 0.1, ly: 1.08 }],
    [J4 - 0.6, { d: 2.6, az: 1.25, el: 0.12, ly: 1.1 }]]);
  R.runCam(J4 - 0.58, J4, [[J4 - 0.58, { scr: 0, d: 2.6, az: 1.25, el: 0.12, ly: 1.1 }], [J4 - 0.2, { scr: 1, d: 0.07 }], [J4, { scr: 1, d: R.DIN }]], 1 / 60);
  // ---- back to the desk: down to the side of the cut, the vein rocking
  K.cam.key(J4 + 0.001, R.deskScreen(R.DIN, { ease: 'linear' }));
  K.cam.key(J4 + 0.32, R.deskScreen(0.13, { ease: 'cubicOut' }));
  K.cam.key(J4 + 0.75, { st: 'P', l: [0, R.TOP + 0.004, R.ZW], d: 0.12, az: R.PI2, el: 0.15, fov: 28, ease: 'cubicInOut' });
  K.cam.key(Wt('problem', 'wrist') - 0.05, { st: 'P', l: [0, R.TOP - 0.0055, R.ZW], d: 0.04, az: R.PI2 - 0.08, el: 0.03, fov: 28, ease: 'cubicInOut' });
  K.cam.key(y0 - 0.05, { st: 'P', l: [0, R.TOP - 0.0058, R.ZW - 0.001], d: 0.034, az: R.PI2 - 0.12, el: 0.03, fov: 28, ease: 'sineInOut' });
  K.cam.key(y0 + 0.35, { st: 'P', l: [0, R.TOP + 0.008, R.ZW], d: 0.14, az: R.PI2 - 0.5, el: 0.4, fov: 28, ease: 'cubicInOut' });
  // ---- up to the watch and its two lines
  const FRONT = (d, o = {}) => Object.assign({ st: 'P', l: [0, w.LINEY + 0.002, R.ZW - 0.01], d, az: 0.0, el: 0.42, fov: 26, ap: 0.011 }, o);
  K.cam.key(Wt('rhythms', 'two') + 0.2, FRONT(0.27, { ease: 'cubicInOut' }));
  K.cam.key(y1, FRONT(0.25, { az: -0.05, ease: 'sineInOut' }));
  K.cam.key(Wt('steps', 'counts') - 0.15, R.deskScreen(0.13, { ease: 'cubicInOut' }));
  K.cam.key(s1 + 0.2, R.deskScreen(0.122, { ease: 'sineInOut' }));
  K.cam.key(Wt('motion', 'motion') - 0.1, FRONT(0.26, { el: 0.22, ease: 'cubicInOut' }));
  K.cam.key(Wt('motion', 'What'), FRONT(0.24, { az: -0.04, ease: 'sineInOut' }));
  K.cam.key(n0 - 0.35, FRONT(0.235, { az: -0.06, ease: 'sineInOut' }));
  // ---- "almost nobody knows": down under the watch, a slow push into its green light
  const LC = [0.0034, R.TOP + 0.0008, R.ZW];
  K.cam.key(n0 + 0.05, { st: 'P', l: [0, R.TOP + 0.006, R.ZW], d: 0.13, az: R.PI2 - 0.3, el: 0.25, fov: 28, ease: 'cubicInOut' });
  K.cam.key(n0 + 0.65, { st: 'P', l: [0.003, R.TOP - 0.0032, R.ZW], d: 0.058, az: R.PI2 - 0.24, el: -0.12, fov: 28, ease: 'cubicInOut' });
  K.cam.key(b0 - 0.25, { st: 'P', l: [0.0034, R.TOP - 0.0022, R.ZW], d: 0.036, az: R.PI2 - 0.2, el: -0.15, fov: 28, ease: 'sineInOut' });
  R.leaveMotion = b0 - 0.25;
  K.event(J3 - 0.4, 'dive', 'into the face, out of his watch', 0.6); K.event(Wt('problem', 'swing'), 'whip', 'his arm swing drawn', 0.5);
  K.event(J4 - 0.45, 'dive', 'into his watch, out of the desk watch', 0.6); K.event(J4 + 0.35, 'whip', 'down to the cut', 0.5);
  K.event(Wt('rhythms', 'two') - 0.4, 'pullout', 'up to the two lines', 0.6);
  K.event(Wt('steps', 'counts') - 0.4, 'whip', 'onto the face', 0.4); K.event(Wt('steps', 'steps'), 'snap', 'the face jumps to 165', 0);
  K.event(Wt('motion', 'motion') - 0.45, 'whip', 'back to the lines', 0.45); K.event(Wt('motion', 'motion'), 'reveal', 'the motion sensor rises', 0.5);
  K.event(Wt('motion', 'throws'), 'whip', 'the orange line thrown away', 0.5); K.event(Wt('motion', 'heartbeat'), 'reveal', 'clean heartbeat', 0.6);
  K.event(n0 - 0.2, 'quiet', 'build-up', n1 - n0 + 0.5); K.event(n0 - 0.1, 'whip', 'down under the watch', 0.6);
  K.shot({ id: 'swing', t0: J3 - 0.8, t1: J4 + 0.5, update(t, u) {
    R.run(t, u, { glow: 0.5, bpm: 155 }); K.bloomS = 0.36; if (arc) arc.material.opacity = 0.85 * u.k(Wt('problem', 'swing') - 0.2, Wt('problem', 'swing') + 0.3, t) * (1 - u.k(J4 - 0.5, J4 - 0.25, t));
    } });
  K.shot({ id: 'arc-off', t0: J4 + 0.5, t1: 999, update() { if (arc && arc.material.opacity !== 0) arc.material.opacity = 0; } });
  const chipQ = new T.Quaternion();
  K.shot({ id: 'lines', t0: J4, t1: b0, update(t, u) {
    const k = u.k, swing = Math.sin(t * 2 * Math.PI * R.CAD);
    if (w.hand) { w.hand.s.slosh = 0.0028 * swing * (1 - k(y0 + 0.4, y0 + 1.4, t)); w.hand.s.light = 0.5; w.hand.s.beat = R.beatAt(t % (60 / 155), [0.02]) * 0.5; }
    const toSteps = k(Wt('steps', 'steps') - 0.05, Wt('steps', 'steps') + 0.1, t) * (1 - k(Wt('motion', 'What'), Wt('motion', 'What') + 0.15, t));
    if (w.hw) Object.assign(w.hw.s, { screen: 'bpm', bpm: toSteps > 0.5 ? 165 : 155 });
    const lineOn = k(Wt('rhythms', 'two') - 0.3, Wt('rhythms', 'two'), t) * (1 - k(Wt('steps', 'counts') - 0.85, Wt('steps', 'counts') - 0.6, t)) + k(Wt('motion', 'motion') - 0.1, Wt('motion', 'motion') + 0.25, t) * (1 - k(n0 - 0.5, n0 - 0.25, t));
    const g = w.trG, o = w.trO, on = lineOn > 0.02;
    if (g) { g.s.vis = on; g.s.o = Math.min(1, lineOn); g.s.head = 0.3; g.s.grow = k(Wt('rhythms', 'heart') - 0.2, Wt('rhythms', 'steps') + 0.3, t); g.s.scroll = (t - y0) * 0.5;
      g.s.mix = k(s0, Wt('steps', 'steps'), t) * (1 - k(Wt('motion', 'away') - 0.1, Wt('motion', 'What') + 0.2, t)); g.s.ticks = k(Wt('motion', 'What'), Wt('motion', 'heartbeat'), t); }
    if (o) { const lift = k(Wt('motion', 'throws') - 0.05, Wt('motion', 'away') + 0.4, t), feel = Math.exp(-Math.pow((t - Wt('motion', 'feel') - 0.25) / 0.35, 2)), find = k(Wt('motion', 'finds'), Wt('motion', 'rhythm'), t) * (1 - lift);
      o.s.vis = on && lift < 0.999; o.s.o = Math.min(1, lineOn) * (1 - lift); o.s.head = 0.3; o.s.grow = k(Wt('rhythms', 'steps') - 0.2, Wt('rhythms', 'land') + 0.3, t); o.s.scroll = (t - y0) * 0.5; o.s.amp = 1 + 0.35 * feel + 0.2 * find;
      o.group.position.y += 0.035 * u.e.cubicIn(lift); o.group.position.x += 0.06 * u.e.cubicIn(lift); o.group.rotation.z = -0.5 * u.e.cubicIn(lift); }
    // the motion sensor: a chip rises out of the watch and pulses with every swing
    if (w.chip) { const up = k(Wt('motion', 'motion') - 0.1, Wt('motion', 'sensor') + 0.3, t) * (1 - k(Wt('motion', 'throws') - 0.2, Wt('motion', 'throws') + 0.3, t));
      w.chip.s.vis = up > 0.01; const cg = w.chip.group; cg.position.y += 0.018 * u.e.cubicOut(up) - 0.006 * (1 - up); cg.position.x -= 0.0; chipQ.setFromAxisAngle(K.V(0, 1, 0), 0.4 + 0.3 * t); cg.quaternion.copy(chipQ);
      cg.scale.setScalar(1.6 * (0.4 + 0.6 * up) * (1 + 0.08 * Math.max(0, swing))); }
    const gx = u.world('P', [0, w.LINEY - 0.008, R.ZW]), ox = u.world('P', [0, w.LINEY + 0.022 + 0.009, R.ZW]), lo = 1 - k(Wt('steps', 'Sometimes') - 0.2, Wt('steps', 'Sometimes'), t);
    const hn = t > Wt('rhythms', '155') ? 'heart · 155 a minute' : 'heart', sn = t > Wt('rhythms', '165') ? 'steps · 165 a minute' : 'steps';
    u.label('lh', hn, { at: gx, dx: 0, dy: 0, align: 'c', w: 900, kind: 'note', lead: false, color: '#0b8a37', o: k(Wt('rhythms', 'heart'), Wt('rhythms', 'heart') + 0.25, t) * lo });
    u.label('ls', sn, { at: ox, dx: 0, dy: 0, align: 'c', w: 900, kind: 'note', lead: false, color: '#d35f00', o: k(Wt('rhythms', 'steps'), Wt('rhythms', 'steps') + 0.25, t) * lo });
    if (w.chip && w.chip.s.vis) u.label('ms', 'motion sensor', { at: u.world('P', [0, w.SCREEN[1] + 0.03, R.ZW]), dx: 0, dy: -70, kind: 'note', color: '#d35f00', o: k(Wt('motion', 'motion'), Wt('motion', 'sensor') + 0.2, t) * (1 - k(Wt('motion', 'finds') - 0.2, Wt('motion', 'finds'), t)) });
    if (t > n0 - 0.5) { Object.assign(w.hw.s, { led: 1, flash: R.flash(t), glow: 1.0, pd: 0.6 }); if (w.hand) w.hand.s.light = 0.8; }
    K.bloomS = 0.5;
  } });
})();
