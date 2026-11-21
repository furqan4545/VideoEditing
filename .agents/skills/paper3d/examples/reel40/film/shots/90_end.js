// 112 s - end  "So your Apple Watch never feels your heartbeat. It just watches your blood swallow green light." /
//              "Follow for more content like this."
// Into the alert on the second watch's face, out of the runner's watch: back until he fills the frame, running, his heart
// glowing; in to his wrist on "watches your blood swallow green light"; back out to the whole runner for the close.
(function () {
  const K = KIT, L = K.L, Wt = K.Wt, R = K.R40, w = K.w;
  const [p0, p1] = L('payoff'), [f0] = L('follow'), END = (window.TIMING && TIMING.dur) || 120;
  const J6 = p0 - 0.12;
  R.segs.push([J6 - 0.5, END + 1, -10.0]);
  const CL0 = Wt('payoff', 'It') - 0.4, CL1 = p1 + 0.6;
  const prevArms = R.armsAt; R.armsAt = t => { if (t > J6 - 0.3 && t < J6 + 1.3) return 1 - 0.88 * Math.min(R.sm((t - J6 + 0.3) / 0.3), R.sm((J6 + 1.3 - t) / 0.4)); if (t > CL0 - 0.4 && t < CL1 + 0.4) return 1 - 0.8 * Math.min(R.sm((t - CL0 + 0.4) / 0.4), R.sm((CL1 + 0.4 - t) / 0.4)); return prevArms(t); };
  // into the second watch's face (lying in front of the calendar)
  if (R.awScreen) { const A = R.awScreen(J6 - 0.45), B = R.awScreen(J6);
    K.cam.key(J6 - 0.45, { st: 'P', l: A.l, d: 0.07, az: A.az, el: A.el, ease: 'cubicInOut' });
    K.cam.key(J6, { st: 'P', l: B.l, d: R.DIN, az: B.az, el: B.el, ease: 'cubicIn' }); }
  R.outOfRunner(J6, J6 + 0.42);
  R.runCam(J6 + 0.45, END, [
    [J6 + 0.45, { scr: 1, d: 0.09, az: 1.0, el: 0.1, ly: 1.0 }],
    [J6 + 1.3, { scr: 0, d: 3.7, az: 1.0, el: 0.1, ly: 1.02 }],
    [Wt('payoff', 'It') - 0.1, { scr: 0, d: 3.3, az: 0.92, el: 0.1, ly: 1.05 }],
    [Wt('payoff', 'blood') + 0.1, { scr: 0.6, d: 1.15, az: 0.9, el: 0.14, ly: 1.2 }],
    [p1 + 0.25, { scr: 0.45, d: 1.4, az: 0.82, el: 0.12, ly: 1.16 }],
    [f0 + 0.2, { scr: 0, d: 3.5, az: 0.7, el: 0.1, ly: 0.98 }],
    [END, { scr: 0, d: 3.9, az: 0.6, el: 0.11, ly: 0.96 }]]);
  K.event(J6 - 0.4, 'dive', 'into the alert, out of the runner\'s watch', 0.6); K.event(J6 + 0.5, 'pullout', 'back to the runner', 0.8);
  K.event(Wt('payoff', 'It') + 0.1, 'whip', 'in to his wrist', 0.5); K.event(f0, 'pullout', 'out to the whole runner', 1.0); K.event(f0 + 1.2, 'land', 'the close', 0);
  K.shot({ id: 'end', t0: J6 - 0.5, t1: END + 1, update(t, u) { const k = u.k;
    R.run(t, u, { glow: 0.9, bpm: 155, screen: t < J6 + 0.5 ? 'alert' : 'bpm', heart: k(J6 + 0.8, J6 + 1.4, t) });
    K.bloomS = 0.36; } });
})();
