// 0.0 - 6.5 s. Ali at the store (a print that fills the frame), a whip to the studio print, then the camera pushes
// through his cupped hand and comes out in front of the gates.
(function () {
  const K = KIT, W = window.WORLD, hx = W.ST2[0] + (W.HAND_UV[0] - 0.5) * 1.5, hy = W.HAND_UV[1] * 1.5;
  K.cam.key(0.00, { l: [0, 1.0, 0], d: 4.50, az: 0, el: 0, fov: 24, hand: 0.25, fog: [6, 20] });
  K.cam.key(2.40, { l: [0, 1.0, 0], d: 4.30, az: 0, el: 0, fov: 24, hand: 0.25, ease: 'linear', fog: [6, 20] });
  K.cam.key(2.80, { l: [W.ST2[0], 0.80, 0], d: 6.85, az: 0, el: 0.02, fov: 24, hand: 0.6, ease: 'expoInOut', fog: [6, 20] });
  K.cam.key(4.75, { l: [W.ST2[0], 0.80, 0], d: 6.55, az: 0.02, el: 0.02, fov: 24, hand: 0.6, ease: 'sineInOut', fog: [6, 20] });
  K.cam.key(5.62, { l: [hx, hy, 0], d: 0.50, az: 0, el: 0, fov: 24, hand: 0.2, ease: 'cubicIn', dive: true, fog: [30, 90] });
  K.cam.key(6.50, { st: 'G', l: [0, 0.92, 0], d: 6.5, az: 0.10 - W.rotG, el: 0.10, fov: 24, hand: 1, ease: 'cubicOut' });
  K.event(2.42, 'whip', 'store print to studio print', 0.38); K.event(4.95, 'dive', 'push through the cupped hand to the gates', 1.5);
  K.shot({ id: 'hook', t0: 0, t1: 6.6, update(t, u) {
    const w = u.w; w.loc.s.vis = t < 3.2; w.st2.s.vis = t > 2.3 && t < 6.2;
    if (t < 2.62) { K.capTheme = 'light'; K.grainO = 0.55 * u.k(2.35, 2.6, t); }
    w.st2.s.holeAt = W.HAND_UV; w.st2.s.hole = 0.33 * u.e.cubicIn(u.k(4.95, 5.62, t));
  } });
})();
