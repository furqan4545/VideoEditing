// 28-57 s  "So the green light goes into your skin. Some gets swallowed by your blood, and the rest bounces back into tiny
//          light sensors." / "But here's where it gets clever." / "Every time your heart beats, it pushes more blood into
//          your wrist. More blood swallows more green, so less light comes back. Between beats, more comes back." /
//          "The change is tiny, less than one percent. But the watch sees it with every beat, and counts how often. That's
//          your heart rate."
// Up out of the vein: we are INSIDE the wrist under the watch, the frame full top to bottom: the skin's underside with the
// four green lights shining down, the arterioles with their blood across the middle, fat and muscle below. Photons pour
// down; some die on blood in green flashes, the rest climb back to the light sensors. Each heartbeat swells the vessels:
// more flashes, the sensors dim; between beats they shine. Then back out through the cut to the watch on the hand: a green
// line grows above it, a dot on every beat; down onto its face: 155.
(function () {
  const K = KIT, L = K.L, Wt = K.Wt, R = K.R40, w = K.w, V = K.V;
  const [s0, s1] = L('skin'), [c0, c1] = L('clever'), [b0, b1] = L('beat'), [r0, r1] = L('rate'), [p0] = L('problem');
  const D = p => w.D(p), PD = w.derm ? w.derm.pdPoint(2) : [0.0024, -0.0007, 0.0024], LED = w.derm ? w.derm.ledPoint(2) : [0.0034, -0.0007, 0];
  const IN = (o) => Object.assign({ st: 'P', fov: 56, fog: [1.0, 5.5] }, o);
  const BEATS = [...R.train(Wt('beat', 'beats') - 0.05, Wt('beat', 'back') + 0.1, 1.14), ...R.train(r0 - 0.2, r1 + 0.6, 0.95)].filter(x => x < Wt('beat', 'Between') - 0.2 || x > Wt('beat', 'back', 1) + 0.15);
  // up out of the vein, turning to look across the wrist
  K.cam.key(s0 + 0.7, IN({ l: D([-0.001, -0.0029, 0.0]), d: 0.0135, az: R.PI2, el: -0.05, ease: 'cubicInOut' }));
  K.cam.key(Wt('skin', 'swallowed') - 0.1, IN({ l: D([-0.0005, -0.0025, 0.0005]), d: 0.0112, az: R.PI2 - 0.08, el: -0.06, ease: 'sineInOut' }));
  K.cam.key(Wt('skin', 'blood') + 0.3, IN({ l: D([0.0, -0.0022, 0.0012]), d: 0.0085, az: R.PI2 - 0.16, el: -0.04, ease: 'sineInOut' }));
  K.cam.key(Wt('skin', 'bounces') + 0.25, IN({ l: D([PD[0], -0.0016, PD[2]]), d: 0.0105, az: R.PI2 + 0.06, el: -0.2, ease: 'cubicInOut' }));
  K.cam.key(s1 + 0.25, IN({ l: D([PD[0], -0.0016, PD[2]]), d: 0.0098, az: R.PI2 + 0.1, el: -0.22, ease: 'sineInOut' }));
  K.cam.key(c1 + 0.3, IN({ l: D([0.0, -0.0026, 0.0]), d: 0.0118, az: R.PI2 - 0.02, el: -0.08, ease: 'cubicInOut' }));
  K.cam.key(Wt('beat', 'More') - 0.1, IN({ l: D([0.0, -0.0026, 0.0]), d: 0.0108, az: R.PI2 - 0.06, el: -0.1, ease: 'sineInOut' }));
  K.cam.key(Wt('beat', 'less') + 0.1, IN({ l: D([0.0008, -0.0019, 0.0006]), d: 0.0108, az: R.PI2 + 0.02, el: -0.16, ease: 'cubicInOut' }));
  K.cam.key(b1 + 0.15, IN({ l: D([0.0008, -0.0019, 0.0006]), d: 0.0102, az: R.PI2 + 0.05, el: -0.18, ease: 'sineInOut' }));
  // back out through the cut (a soft flash), up and round to the elbow end: the watch, its line, the hand behind
  K.cam.key(r0 + 0.3, { st: 'P', l: [0, R.TOP - 0.004, R.ZW], d: 0.07, az: R.PI2, el: 0.08, fov: 30, ease: 'cubicIn' });
  K.cam.key(r0 + 0.65, { st: 'P', l: [0, R.TOP + 0.01, R.ZW], d: 0.16, az: R.PI2 - 0.5, el: 0.45, fov: 28, ease: 'sineInOut' });
  const FRONT = (d, o = {}) => Object.assign({ st: 'P', l: [0, w.LINEY - 0.008, R.ZW - 0.01], d, az: 0.0, el: 0.42, fov: 26, ap: 0.011 }, o);
  K.cam.key(Wt('rate', 'tiny') + 0.55, FRONT(0.26, { ease: 'cubicOut' }));
  K.cam.key(Wt('rate', 'often'), FRONT(0.24, { az: -0.05, ease: 'sineInOut' }));
  K.cam.key(Wt('rate', 'heart') + 0.05, R.deskScreen(0.13, { ease: 'cubicInOut' }));
  K.cam.key(p0 - 0.6, R.deskScreen(0.125, { ease: 'sineInOut' }));
  R.leaveRate = p0 - 0.6;
  K.event(s0 - 0.1, 'pullout', 'out of the vein into the skin', 0.9); K.event(Wt('skin', 'swallowed'), 'hit', 'light swallowed', 0);
  K.event(Wt('skin', 'bounces'), 'tick', 'light reaches the sensors', 0); K.event(c0 - 0.1, 'quiet', 'build-up', c1 - c0 + 0.6);
  BEATS.filter(x => x < r1).forEach(x => K.event(x, 'pulse', 'heartbeat', 0.3));
  K.event(r0 - 0.05, 'pullout', 'out of the skin to the line', 0.8); K.event(Wt('rate', 'heart') - 0.4, 'whip', 'down onto the face', 0.5);
  K.shot({ id: 'inside', t0: s0 - 0.6, t1: p0, update(t, u) {
    const k = u.k, ts = w.derm; if (!ts) return;
    const beat = R.beatAt(t, BEATS), sw = k(Wt('skin', 'swallowed') - 0.2, Wt('skin', 'blood'), t) * (1 - k(Wt('skin', 'and'), Wt('skin', 'rest'), t));
    Object.assign(ts.s, { rays: 1, beat, pAbs: 0.2 + 0.65 * beat + 0.3 * sw, flow: 1 + 0.8 * beat, shafts: 1, veinCells: 1 });
    const inBeat = t > b0 - 0.3 && t < b1 + 0.4; ts.s.lightBack = inBeat ? 1 - 0.85 * beat : -1;
    if (w.hand) { w.hand.s.beat = beat; w.hand.s.light = 0.7; }
    if (K.inside && w.hw) Object.assign(w.hw.s, { led: 0.45, flash: 1, glow: 0.2 });
    const dw = p => u.world('P', D(p)), lt = { color: '#ffffff' };
    u.label('sens', 'light sensor', Object.assign({ screen: [540, 640], lead: false, kind: 'note', o: k(Wt('skin', 'light', 1) - 0.1, Wt('skin', 'light', 1) + 0.25, t) * (1 - k(s1 + 0.5, s1 + 0.8, t)) }, lt));
    u.label('swl', 'blood swallows the light', Object.assign({ screen: [540, 640], lead: false, kind: 'note', o: k(Wt('skin', 'swallowed'), Wt('skin', 'swallowed') + 0.25, t) * (1 - k(Wt('skin', 'and') - 0.1, Wt('skin', 'and') + 0.2, t)) }, lt));
    u.label('less', 'less light back', Object.assign({ screen: [540, 640], lead: false, kind: 'note', o: k(Wt('beat', 'less') - 0.1, Wt('beat', 'less') + 0.2, t) * (1 - k(Wt('beat', 'Between') - 0.3, Wt('beat', 'Between'), t)) }, lt));
    u.label('more', 'more light back', Object.assign({ screen: [540, 640], lead: false, kind: 'note', o: k(Wt('beat', 'more', 3) - 0.1, Wt('beat', 'more', 3) + 0.2, t) * (1 - k(b1 + 0.2, b1 + 0.5, t)) }, lt));
    const g = w.trG; if (g) { g.s.vis = t > Wt('rate', 'tiny') - 0.2 && t < Wt('rate', 'often') + 0.15; g.s.head = 0.3; g.s.grow = k(Wt('rate', 'tiny'), Wt('rate', 'often'), t); g.s.scroll = Math.max(0, t - Wt('rate', 'tiny')) * 0.5; g.s.ticks = k(Wt('rate', 'every') - 0.1, Wt('rate', 'beat'), t); }
    if (false) u.label('pct', 'less than 1%', { at: u.world('P', [0.0, w.LINEY + 0.012, R.ZW]), dy: -70, kind: 'note', o: k(Wt('rate', 'less'), Wt('rate', 'less') + 0.25, t) * (1 - k(Wt('rate', 'But'), Wt('rate', 'But') + 0.3, t)) });
    K.bloomS = K.inside ? 0.35 : 0.5;
  } });
})();
