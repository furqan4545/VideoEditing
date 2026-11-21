// Reel 40 v3 world: ONE sheet of white wrapped paper, one camera, no cuts. Metres, Y up, station P at the origin.
//   desk (x ~ 0)      a real left hand lying palm-down (fingers toward -Z), the watch worn on its wrist at z = 0.03. The
//                     wrist can be cut open lengthwise under the watch (hand.s.cut); right under the watch lies the inside
//                     world (derm), shown only when the camera is inside the skin. Apple's real Heart Rate photo lies on the
//                     watch face at the start; the signal lines float above the watch.
//   runner (x -2.6)   he runs along +Z, his watch on his left wrist, a heart glowing in his chest. Reached only THROUGH a
//                     watch screen (push into one screen, come out of the other), never by flying over empty paper.
//   past the fingers  Apple's alert photo stands behind the fingertips; two garden hoses run away from the camera; the 30-day
//                     calendar stands beyond them with a second watch lying in front of it.
window.WORLD = {};
window.buildWorld = function (K) {
  const w = K.w = {}, T = THREE, groups = [];
  const has = n => !!K.assets[n], mk = (n, o) => has(n) ? K.make(n, o) : null;
  const put = (parent, inst, pos, rot) => { if (!inst) return null; if (pos) inst.group.position.set(pos[0], pos[1], pos[2]); if (rot) inst.group.rotation.set(rot[0], rot[1], rot[2]); parent.add(inst.group); groups.push(inst); return inst; };
  const P = K.station('P', [0, 0, 0], 0);
  // ---- the hand and its watch (worn, the band cut with the wrist)
  w.hand = put(P, mk('hand'), [0, 0, 0]);
  const ZW = w.hand.ZW, TOP = w.hand.top(ZW); w.ZW = ZW; w.TOP = TOP;
  w.hw = mk('watch', { band: 'worn', wrist: w.hand.wrist }); P.add(w.hw.group); groups.push(w.hw);
  { const ps = w.hand.watchPose(w.hw.size.backZ); w.hw.group.position.fromArray(ps.pos); w.hw.group.quaternion.copy(ps.quat); w.hw.group.updateMatrixWorld(true);
    const band = w.hw.group.getObjectByName('band'); if (band) band.traverse(m => { if (m.isMesh) m.material = w.hand.cutMaterial(m.material.clone()); }); }
  w.sw = w.hw;                                                     // the shots' "desk watch"
  const wpt = p => w.hw.group.localToWorld(K.V(p));
  w.SCREEN = wpt(w.hw.anchors.screen).toArray();                     // centre of its glass (world)
  // ---- the inside of the wrist under the watch (local = hand axes, origin on the skin under the watch centre)
  const toSkin = p => { const v = wpt(p); return [v.x, v.z - ZW]; };
  w.derm = put(P, mk('derm', { leds: w.hw.ledPoints().map(toSkin), pds: w.hw.pdPoints().map(toSkin) }), [0, TOP, ZW]);
  w.D = (p) => [p[0], p[1] + TOP, p[2] + ZW];                       // derm-local -> world
  w.LEDW = w.hw.ledPoints().map(p => wpt(p).toArray()); w.PDW = w.hw.pdPoints().map(p => wpt(p).toArray());
  // the blood cell of the macro shot, inside the vein
  if (w.derm) { w.CELL = w.D(w.derm.cellSpot(0.56)); w.cell = put(P, mk('cell', { r: 0.00042, crowd: 5, spread: 0.5 }), w.CELL); }
  // ---- Apple's real Heart Rate photo, lying flat on the watch face (its top toward -X, like the watch's 12 o'clock)
  w.hrPhoto = put(P, mk('photo', { img: 'img/apple_hr_app.jpg', w: 0.09, aspect: 1, border: 0.0004 }), [w.SCREEN[0], w.SCREEN[1] + 0.0066, w.SCREEN[2]]);
  if (w.hrPhoto) w.hrPhoto.group.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(K.V(0, 0, -1), K.V(-1, 0, 0), K.V(0, 1, 0)));
  // ---- the signal lines above the watch, facing the camera at the elbow end (+Z)
  const LY = w.SCREEN[1] + 0.03; w.LINEY = LY;
  w.trG = put(P, mk('trace', { kind: 'ppg', w: 0.056, h: 0.011, span: 3.4, bpm: 155, spm: 165, paper: true }), [-0.028, LY, ZW]);
  w.trO = put(P, mk('trace', { kind: 'steps', w: 0.056, h: 0.011, span: 3.4, spm: 165, paper: true }), [-0.028, LY + 0.022, ZW]);
  // ---- the motion sensor chip (rises out of the watch on "motion sensor")
  w.chip = put(P, mk('chip'), [0, w.SCREEN[1] + 0.006, ZW]);
  // ---- the runner on the paper
  w.runner = put(P, mk('runner'), [-2.6, 0, 0]);
  w.rw = mk('watch', { band: 'worn', wrist: { w: 0.058, h: 0.042 } }); if (w.rw && w.runner) { w.runner.group.add(w.rw.group); groups.push(w.rw); }
  w.heart = mk('heartglow', { r: 0.045 }); if (w.heart && w.runner) { const c = (w.runner.anchors && w.runner.anchors.chest) || [0.04, 1.31, 0.05]; w.heart.group.position.set(c[0], c[1], c[2]); w.runner.group.add(w.heart.group); groups.push(w.heart); }
  // ---- past the fingertips: Apple's alert photo, the hoses (running away from the camera), the calendar and a second watch
  w.bpPhoto = put(P, mk('photo', { img: 'img/apple_hypertension.jpg', w: 0.11, aspect: 1306 / 1590, border: 0.0006 }), [0.17, 0.072, -0.40]);
  w.HOSE = [0.30, -0.46];                                          // centre of the pair (x, z)
  w.hoseN = put(P, mk('hose', { kind: 'new', len: 0.42, r: 0.0095 }), [w.HOSE[0] - 0.024, 0.0098, w.HOSE[1]], [0, Math.PI / 2, 0]);
  w.hoseO = put(P, mk('hose', { kind: 'old', len: 0.42, r: 0.0095 }), [w.HOSE[0] + 0.024, 0.0098, w.HOSE[1]], [0, Math.PI / 2, 0]);
  w.CAL = [0.43, 0.042, -0.57];
  w.cal = put(P, mk('cal30', { tw: 0.0088, gap: 0.0024 }), w.CAL, [0, -0.35, 0]);
  w.aw = put(P, mk('watch', { band: 'none' }), [0, 0, 0]);
  K.shot({ id: 'places', t0: 0, t1: 999, update() { for (const a of groups) a.s.vis = false; } });
  K.shots.unshift(K.shots.pop());
};
