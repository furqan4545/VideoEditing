// 7-28 s  "Imagine you're halfway through a run. Your heart is racing, and your watch says 155." / "But how can something
//          sitting on your wrist know what your heart is doing?" / "Underneath the watch, tiny green lights flash hundreds of
//          times every second." / "And they're green for a reason. Blood looks red because it bounces red light back. Green
//          light, it swallows."
// Up from the cut to the watch face and INTO its glass -> out of the runner's watch glass -> back until he fills the frame,
// running; push to his watch (155); round him to the heart glowing in his chest -> into his watch glass -> out of the desk
// watch's glass -> down under the watch, where half of it hangs over the cut: its green lights strobing -> through one light
// into a vein: one red blood cell, a white beam hits it, red bounces back at us, green sinks in and is swallowed.
(function () {
  const K = KIT, L = K.L, Wt = K.Wt, R = K.R40, w = K.w, V = K.V;
  const [r0, r1] = L('run'), [h0, h1] = L('how'), [l0, l1] = L('leds'), [g0, g1] = L('green'), [s0] = L('skin');
  const J1 = r0 - 0.05, J2 = l0 - 0.06;                                   // the two joins through a watch glass
  R.segs.push([J1 - 0.6, J2 + 0.6, -9.0]);
  const CLOSE = [[J1 - 0.7, J1 + 0.9], [Wt('run', 'watch') - 0.5, r1 + 0.6], [J2 - 0.75, J2 + 0.2]];
  const prevArms = R.armsAt; R.armsAt = t => { for (const [a, b] of CLOSE) if (t > a - 0.4 && t < b + 0.4) return 1 - 0.88 * Math.min(R.sm((t - a + 0.4) / 0.4), R.sm((b + 0.4 - t) / 0.4)); return prevArms(t); };
  // ---- from the cut up to the watch face, into the glass; out of the runner's glass
  K.cam.key(J1 - 0.36, R.deskScreen(0.13, { ease: 'cubicInOut' }));
  K.cam.key(J1, R.deskScreen(R.DIN, { ease: 'cubicIn' }));
  R.outOfRunner(J1, J1 + 0.42);
  R.runCam(J1 + 0.45, J2 - 0.62, [
    [J1 + 0.45, { scr: 1, d: 0.09, az: 1.0, el: 0.1, ly: 1.0 }],
    [J1 + 1.25, { scr: 0, d: 4.4, az: 1.0, el: 0.08, ly: 1.0 }],
    [Wt('run', 'heart'), { d: 3.3, az: 0.9, el: 0.08 }],
    [Wt('run', 'watch') - 0.3, { scr: 0, d: 2.3 }],
    [Wt('run', 'says') + 0.12, { scr: 1, d: 0.17 }],
    [r1 + 0.1, { scr: 1, d: 0.15 }],
    [h0 + 0.55, { scr: 0, d: 2.5, az: 0.62, el: 0.1, ly: 1.12 }],
    [Wt('how', 'heart'), { d: 2.1, az: 0.36, el: 0.1, ly: 1.2 }],
    [J2 - 0.62, { d: 1.9, az: 0.3, el: 0.1, ly: 1.18 }]]);
  K.event(J1 - 0.62, 'whip', 'up to the watch face', 0.4); K.event(J1 - 0.05, 'dive', 'into the glass, out of his watch', 0.5);
  K.event(Wt('run', 'watch') - 0.3, 'whip', 'push to his watch', 0.4); K.event(h0 + 0.1, 'pullout', 'back from his watch', 0.5); K.event(Wt('how', 'heart') - 0.1, 'pulse', 'his heart glows', 0.6);
  K.shot({ id: 'run', t0: J1 - 0.8, t1: J2 + 0.8, update(t, u) {
    const k = u.k; R.run(t, u, { heart: k(Wt('how', 'heart') - 0.3, Wt('how', 'heart') + 0.2, t) * (1 - k(J2 - 0.7, J2 - 0.4, t)), glow: 0.5, bpm: 155 });
    // the two screens show the same thing at the joins
    if (w.hw) Object.assign(w.hw.s, { bpm: 155 });
    K.bloomS = 0.36;
  } });
  // ---- back to the desk through the glass, down under the watch: its lights over the cut
  R.runCam(J2 - 0.6, J2, [[J2 - 0.6, { scr: 0, d: 1.9, az: 0.3, el: 0.1, ly: 1.18 }], [J2 - 0.2, { scr: 1, d: 0.07 }], [J2, { scr: 1, d: R.DIN }]], 1 / 60);
  K.cam.key(J2 + 0.001, R.deskScreen(R.DIN, { ease: 'linear' }));
  K.cam.key(J2 + 0.4, R.deskScreen(0.13, { ease: 'cubicOut' }));
  K.cam.key(J2 + 0.95, { st: 'P', l: [0, R.TOP + 0.004, R.ZW], d: 0.12, az: R.PI2, el: 0.12, fov: 28, ease: 'cubicInOut' });
  const LC = [0.0034, R.TOP + 0.0008, R.ZW];                                        // the LED on the overhanging half
  K.cam.key(Wt('leds', 'watch') + 0.55, { st: 'P', l: [0.003, R.TOP - 0.0035, R.ZW], d: 0.06, az: R.PI2 - 0.26, el: -0.12, fov: 28, ease: 'cubicInOut' });
  K.cam.key(Wt('leds', 'flash'), { st: 'P', l: [0.0034, R.TOP - 0.0025, R.ZW], d: 0.042, az: R.PI2 - 0.2, el: -0.14, fov: 28, ease: 'sineInOut' });
  K.cam.key(l1 + 0.15, { st: 'P', l: [0.0034, R.TOP - 0.002, R.ZW], d: 0.032, az: R.PI2 - 0.14, el: -0.16, fov: 28, ease: 'sineInOut' });
  K.cam.key(g0 - 0.18, { st: 'P', l: LC, d: 0.009, az: R.PI2 - 0.1, el: -0.3, fov: 28, ease: 'cubicIn' });
  K.event(J2 - 0.5, 'dive', 'into his watch glass, out of the desk watch', 0.6); K.event(J2 + 0.45, 'whip', 'down under the watch', 0.5);
  K.event(Wt('leds', 'flash'), 'pulse', 'the lights strobe', 1.2);
  // ---- through the light into a vein: one red blood cell
  const CELL = w.CELL || [0, R.TOP - 0.006, R.ZW];
  K.cam.key(g0 + 0.32, { st: 'P', l: CELL, d: 0.0092, az: 0.02, el: 0.04, fov: 30, ease: 'cubicOut', fog: [1.0, 5] });
  K.cam.key(Wt('green', 'bounces'), { st: 'P', l: [CELL[0] + 0.00005, CELL[1] + 0.00005, CELL[2]], d: 0.0076, az: -0.02, el: 0.05, fov: 30, ease: 'sineInOut', fog: [1.0, 5] });
  K.cam.key(g1 + 0.15, { st: 'P', l: CELL, d: 0.0068, az: -0.08, el: 0.04, fov: 30, ease: 'sineInOut', fog: [1.0, 5] });
  K.event(g0 - 0.35, 'dive', 'through the light into a vein', 0.6); K.event(Wt('green', 'Blood') - 0.05, 'riser', 'the white beam comes in', 0.7);
  K.event(Wt('green', 'bounces'), 'hit', 'red bounces back', 0); K.event(Wt('green', 'Green') + 0.05, 'snap', 'green goes into the cell', 0); K.event(Wt('green', 'swallows'), 'snap', 'green is swallowed', 0);
  K.shot({ id: 'leds', t0: J2 - 0.1, t1: g0 + 0.5, update(t, u) {
    const k = u.k; if (w.hw) Object.assign(w.hw.s, { led: 1, flash: R.flash(t * (1 + 1.6 * k(Wt('leds', 'hundreds'), l1, t))), glow: 1.0, pd: 0.6 });
    if (w.hand) w.hand.s.light = 0.8;
    K.bloomS = 0.55 + 0.9 * k(g0 - 0.45, g0 - 0.12, t) * (1 - k(g0 + 0.1, g0 + 0.4, t));
    K.flashO = Math.exp(-Math.pow((t - (g0 - 0.03)) / 0.15, 2)); K.flashC = '#8dffb2';      // the light fills the frame at the join
    const lp = w.hw.group.localToWorld(V(w.hw.ledPoints()[2]));
    u.label('leds', 'green lights', { at: lp, dx: -200, dy: 260, kind: 'note', o: k(Wt('leds', 'tiny'), Wt('leds', 'tiny') + 0.3, t) * (1 - k(Wt('leds', 'every') - 0.2, Wt('leds', 'every') + 0.1, t)) });
  } });
  K.shot({ id: 'cell', t0: g0 - 0.2, t1: s0 + 1.2, update(t, u) {
    const k = u.k, c = w.cell; if (!c) return; c.s.vis = true;
    c.s.beam = k(Wt('green', 'Blood') - 0.15, Wt('green', 'red') + 0.1, t);
    c.s.red = k(Wt('green', 'bounces'), Wt('green', 'back') + 0.25, t);
    c.s.green = k(Wt('green', 'Green') - 0.05, Wt('green', 'swallows') - 0.05, t);
    c.s.swallow = k(Wt('green', 'swallows') + 0.05, g1 + 0.4, t);
    c.s.spin = 0.05 * (t - g0);
    if (w.derm) { w.derm.s.veinCells = t > s0 + 0.5 ? 1 : 0; w.derm.s.rays = 0.25; w.derm.s.shafts = 0; w.derm.s.tunnel = 1 - k(s0 - 0.2, s0 + 0.6, t); }
    if (w.hw) w.hw.s.led = 0.5;
    K.bloomS = 0.45;
  } });
})();
