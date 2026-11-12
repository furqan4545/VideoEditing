// 0 - 9 s. A demo of the grammar: establish the whole scene, go in, come back out. Replace with your film's shots.
(function () {
  const K = KIT, PI = Math.PI, STRIDE = 1.44;
  // the walk: a pure function of time (feet never slide: one gait cycle per 1.44 m)
  const z = t => K.lerp(-2.6, 0.15, K.ease.sineOut(K.seg(t, 0.2, 2.3)));
  K.cam.key(0.0, { st: 'G', l: [0, 0.95, 0], d: 7.6, az: 0.25, el: 0.10 });                                  // 1. the whole place first
  K.cam.key(2.6, { st: 'G', l: [0.1, 0.9, 0.1], d: 6.4, az: 0.38, el: 0.11, ease: 'sineInOut' });
  K.cam.key(4.4, { st: 'G', l: [0.27, 0.42, 0.2], d: 0.9, az: 0.55, el: 0.45, dive: true, ease: 'cubicInOut' });   // 2. then inside the bag
  K.cam.key(6.0, { st: 'G', l: [0.27, 0.40, 0.2], d: 0.8, az: 0.62, el: 0.5, ease: 'sineInOut' });
  K.cam.key(8.6, { st: 'G', l: [0, 0.95, 0], d: 7.2, az: 0.7, el: 0.12, dive: true, ease: 'cubicInOut' });   // 3. and back out, so the viewer knows where they are
  K.event(2.3, 'alarm', 'both lights go red', 0.9); K.event(2.9, 'dive', 'into the bag', 1.4); K.event(6.1, 'pullout', 'back to the gates', 1.6);
  K.shot({ id: 'demo', t0: 0, t1: 9, update(t, u) {
    const w = u.w, zz = z(t), still = K.seg(t, 2.0, 2.5);
    w.man.group.position.z = zz; w.man.s.walk = (zz + 2.6) / STRIDE; w.man.s.still = still; w.man.s.carryR = 1;
    const h = w.man.anchors.handR, grip = w.bag.anchors.grip || [0, w.bag.size.gripY || 0.5, 0];                // hang the bag from the hand
    w.bag.group.rotation.y = PI / 2; w.bag.group.position.set(h[0] - grip[2], h[1] - grip[1] - 0.045, zz + h[2] + grip[0]); w.bag.s.hang = 1;
    w.bag.s.xray = K.ease.smooth(K.seg(t, 3.0, 4.0)) * (1 - K.seg(t, 6.2, 7.2));
    const red = t > 2.3; w.gA.s.light = w.gB.s.light = red ? 'red' : 'green';
    u.label('tag', 'Security tag', { at: w.tag.at('top'), dx: 240, dy: -200, kind: 'name', o: Math.min(K.seg(t, 4.5, 4.8), 1 - K.seg(t, 5.8, 6.1)) });
  } });
})();
