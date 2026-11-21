// Reel 40 v3, one take on one sheet of wrapped paper. This file: shared helpers (K.R40), the always-on world shot, the hook.
// Hook 0-7 s "Your Apple Watch doesn't actually feel your heartbeat. It watches your blood, using green light."
// Apple's real Heart Rate photo lies on the watch face (moving from frame 0) -> it peels away: under it, our 3D watch on a
// real hand -> the camera pulls back and turns until the whole hand fills the frame -> it swings down to the side of the
// wrist while a laser slices the wrist open lengthwise: skin, fat, vessels with blood flowing, tendons, muscle, bone ->
// the watch's green light pours into the cut.
(function () {
  const K = KIT, L = K.L, Wt = K.Wt, T = THREE, w = K.w;
  const sm = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
  const R = K.R40 = {};
  R.sm = sm;
  R.beatAt = (t, times) => { let b = 0; for (const tb of times) { const d = t - tb; if (d < -0.09 || d > 0.9) continue; b = Math.max(b, d < 0 ? sm(1 + d / 0.09) : Math.exp(-d / 0.24)); } return b; };
  R.train = (t0, t1, per) => { const a = []; for (let x = t0; x <= t1 + 1e-6; x += per) a.push(x); return a; };
  R.flash = t => 0.72 + 0.28 * Math.sin(t * 2 * Math.PI * 7.0);
  R.TOP = w.TOP; R.ZW = w.ZW; R.SCR = w.SCREEN; R.PI2 = Math.PI / 2;
  // ---------------------------------------------------------------- camera helpers
  R.curve = (ctrl, t, key, dflt = 0) => { const pts = ctrl.filter(c => c[1][key] !== undefined); if (!pts.length) return dflt; if (t <= pts[0][0]) return pts[0][1][key];
    for (let i = 0; i < pts.length - 1; i++) { const [a, A] = pts[i], [b, B] = pts[i + 1]; if (t <= b) { const k = sm((t - a) / (b - a)); return A[key] + (B[key] - A[key]) * k; } } return pts[pts.length - 1][1][key]; };
  R.track = (tA, tB, pose, step = 0.1) => { for (let t = tA; t <= tB + 1e-6; t += step) K.cam.key(+t.toFixed(3), Object.assign({ st: 'P', ease: 'linear' }, pose(t))); };
  // the desk watch's screen from straight above, read upright (12 o'clock up)
  R.deskScreen = (d, o = {}) => Object.assign({ st: 'P', l: R.SCR.slice(), d, az: R.PI2, el: 1.42, fov: 26 }, o);
  // ---------------------------------------------------------------- the runner (on the paper at x -2.6, running along +Z)
  R.CAD = 1.375; R.SPEED = 2.2 * 1.375; R.RX = -2.6;
  R.segs = [];                                                   // [tA, tB, z0]: he runs from z0 at tA
  R.zAt = t => { for (const [a, b, z0] of R.segs) if (t >= a - 1.5 && t <= b + 1.5) return z0 + R.SPEED * (t - a); return 0; };
  R.armsAt = t => 1;                                             // replaced by the shots (how much his arms swing at t)
  R.run = (t, u, o = {}) => { const rn = w.runner; if (!rn) return;
    rn.s.vis = true; rn.s.run = t * R.CAD; rn.s.arms = o.arms ?? R.armsAt(t); rn.s.still = 0; rn.group.position.z = R.zAt(t);
    if (w.rw && rn.wristL) { const f = rn.wristL(rn.s); w.rw.group.position.fromArray(f.pos); w.rw.group.quaternion.fromArray(f.quat); w.rw.s.vis = true;
      Object.assign(w.rw.s, { screen: o.screen || 'bpm', bpm: o.bpm ?? 155, on: 1, led: 1, flash: R.flash(t), glow: o.glow ?? 0.6, pulse: R.beatAt(t % (60 / 155), [0]) }); }
    if (w.heart) { w.heart.s.vis = (o.heart ?? 0) > 0.002; w.heart.s.o = o.heart ?? 0; w.heart.s.beat = R.beatAt(t % (60 / 155), [0.02]); } };
  // his watch screen at time t, exactly (world), and the camera angles that face it upright
  const _q = new T.Quaternion(), _P = new T.Vector3(), _N = new T.Vector3(), _U = new T.Vector3();
  R.rscreen = (t, arms) => { const rn = w.runner, rw = w.rw; if (!rn || !rw) return { l: [R.RX, 1.1, R.zAt(t)], az: 1, el: 0.4, roll: 0 };
    const f = rn.wristL(Object.assign({}, rn.defaults, { run: t * R.CAD, arms: arms ?? R.armsAt(t), still: 0 })); _q.fromArray(f.quat);
    _P.fromArray(rw.anchors.screen).applyQuaternion(_q).add(_P.clone().fromArray(f.pos)); _P.x += R.RX; _P.z += R.zAt(t);
    _N.set(0, 0, 1).applyQuaternion(_q); _U.set(0, 1, 0).applyQuaternion(_q);
    const az = Math.atan2(_N.x, _N.z), el = Math.min(1.42, Math.asin(Math.max(-1, Math.min(1, _N.y)))), c = new T.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
    const r = new T.Vector3(Math.cos(az), 0, -Math.sin(az)), up0 = new T.Vector3(0, 1, 0).addScaledVector(c, -c.y).normalize();
    return { l: _P.toArray(), az, el, roll: Math.atan2(_U.dot(r), _U.dot(up0)) }; };
  // runner camera: a curve of {d, az, el, scr (0 = his chest, 1 = his watch screen exactly), ly} along a segment
  R.runCam = (tA, tB, ctrl, step = 0.05) => { const chest = (w.runner && w.runner.anchors && w.runner.anchors.chest) || [0.03, 1.31, 0.05];
    R.track(tA, tB, t => { const s = R.curve(ctrl, t, 'scr'), z = R.zAt(t), ly = R.curve(ctrl, t, 'ly', 1.05), A = R.rscreen(t);
      const lb = [R.RX + chest[0] * 0.3, ly, z + 0.05];
      return { l: [lb[0] + (A.l[0] - lb[0]) * s, lb[1] + (A.l[1] - lb[1]) * s, lb[2] + (A.l[2] - lb[2]) * s], d: R.curve(ctrl, t, 'd'), fov: R.curve(ctrl, t, 'fov', 26),
        az: R.curve(ctrl, t, 'az') * (1 - s) + A.az * s, el: R.curve(ctrl, t, 'el') * (1 - s) + A.el * s, roll: A.roll * s, fog: [3, 14] }; }, step); };
  // a join THROUGH a screen: the camera pushes into one watch's glass and comes out of the other's (tJ = the jump)
  R.DIN = 0.0055;
  R.intoDesk = (tA, tJ) => { K.cam.key(tA, R.deskScreen(0.13, { ease: 'cubicInOut' })); K.cam.key(tJ, R.deskScreen(R.DIN, { ease: 'cubicIn' })); };
  R.outOfDesk = (tJ, tB, d = 0.07) => { K.cam.key(tJ + 0.001, R.deskScreen(R.DIN, { ease: 'linear' })); K.cam.key(tB, R.deskScreen(d, { ease: 'cubicOut' })); };
  R.intoRunner = (tA, tJ) => R.track(tA, tJ, t => { const A = R.rscreen(t), k = sm((t - tA) / (tJ - tA)); return { l: A.l, az: A.az, el: A.el, roll: A.roll, d: 0.09 * Math.pow(R.DIN / 0.09, k * k), fog: [3, 14] }; }, 1 / 60);
  R.outOfRunner = (tJ, tB) => R.track(tJ + 0.001, tB, t => { const A = R.rscreen(t), k = sm((t - tJ) / (tB - tJ)); return { l: A.l, az: A.az, el: A.el, roll: A.roll, d: R.DIN * Math.pow(0.09 / R.DIN, Math.sqrt(k)), fog: [3, 14] }; }, 1 / 60);
  // ---------------------------------------------------------------- the wrist: cut open in the hook and stays open
  R.CUT0 = 3.9; R.CUT1 = 4.85;
  // ---------------------------------------------------------------- always: props on, the inside of the skin when the camera is in it
  K.shot({ id: 'world', t0: 0, t1: 999, update(t, u) {
    for (const n of ['hand', 'hw', 'hoseN', 'hoseO', 'cal']) if (w[n]) w[n].s.vis = true;
    if (w.bpPhoto) w.bpPhoto.s.vis = t > K.L('bp')[0] - 0.5 && t < K.L('hose')[0] + 1.3;
    if (w.hand) { w.hand.s.cut = sm((t - R.CUT0) / (R.CUT1 - R.CUT0)); w.hand.s.light = t > R.CUT1 ? 0.8 : 0; }
    if (w.hw) Object.assign(w.hw.s, { screen: 'bpm', bpm: 155, on: 1, led: 1, flash: R.flash(t), glow: 0.15, pulse: R.beatAt(t % (60 / 155), [0]) });
    const c = K.camera.position, sz = w.derm.size, x = c.x, y = c.y - R.TOP, z = c.z - R.ZW;
    const ins = x > sz.x0 && x < sz.x1 && y < -0.00015 && y > -0.021 && z > sz.z0 && z < sz.z1;
    if (ins) { K.inside = 1; w.derm.s.vis = true; w.hand.s.vis = false; Object.assign(w.derm.s, { rays: 0.8, pAbs: 0.3 }); }
    else w.derm.s.vis = false;
    // crossing the cut face (in or out of the skin): a soft flash hides the switch
    if (y < 0 && y > -0.021 && z > sz.z0 && z < sz.z1 && Math.abs(x - sz.x1) < 0.005) { const f = 1 - Math.abs(x - sz.x1) / 0.005; if ((K.flashO || 0) < f) { K.flashO = f * f * 0.95; K.flashC = '#f6c9bd'; } }
  } });
  // ---------------------------------------------------------------- the hook
  const [h0, h1] = L('hook');
  const PEEL0 = 1.42, PEEL1 = 2.0, BACK1 = Wt('hook', 'heartbeat') + 0.15, SIDE = Wt('hook', 'It') - 0.05, GREEN = Wt('hook', 'green');
  R.CUT0 = SIDE + 0.05; R.CUT1 = Wt('hook', 'using') + 0.15;
  R.hookEnd = h1;
  const PH = w.hrPhoto ? w.hrPhoto.group.position.toArray() : R.SCR;
  K.cam.key(0.0, { st: 'P', l: PH, d: 0.37, az: R.PI2 + 0.05, el: 1.42 });
  K.cam.key(PEEL1, { st: 'P', l: R.SCR, d: 0.24, az: R.PI2, el: 1.42, ease: 'sineInOut' });
  K.cam.key(BACK1, { st: 'P', l: [0.010, 0.02, -0.058], d: 0.78, az: 0.0, el: 1.30, ease: 'cubicInOut' });
  K.cam.key(SIDE - 0.55, { st: 'P', l: [0.008, 0.021, -0.050], d: 0.76, az: 0.02, el: 1.28, ease: 'sineInOut' });
  K.cam.key(SIDE, { st: 'P', l: [0.006, 0.026, R.ZW], d: 0.2, az: R.PI2 - 0.55, el: 0.5, ease: 'cubicInOut' });
  K.cam.key(R.CUT1 - 0.05, { st: 'P', l: [0.004, 0.0262, R.ZW], d: 0.17, az: R.PI2 - 0.4, el: 0.36, ease: 'sineInOut' });
  K.cam.key(R.CUT1 + 0.5, { st: 'P', l: [0, 0.0262, R.ZW + 0.001], d: 0.112, az: R.PI2 - 0.05, el: 0.045, ease: 'cubicInOut' });
  K.cam.key(h1 - 0.25, { st: 'P', l: [0, R.TOP - 0.0045, R.ZW + 0.001], d: 0.07, az: R.PI2 - 0.09, el: 0.035, ease: 'sineInOut' });
  K.cam.key(h1 + 0.12, { st: 'P', l: R.SCR, d: 0.15, az: R.PI2, el: 0.8, ease: 'cubicInOut' });
  K.event(0.0, 'hit', 'the music opens on the climax', 0); K.event(PEEL0, 'whip', 'the photo peels away', 0.5);
  K.event(PEEL1 + 0.1, 'pullout', 'back to the whole hand', BACK1 - PEEL1); K.event(SIDE - 0.45, 'whip', 'down to the side of the wrist', 0.45);
  K.event(R.CUT0, 'riser', 'the laser cuts the wrist open', R.CUT1 - R.CUT0); K.event(R.CUT1, 'reveal', 'the inside of the wrist', 0.6); K.event(GREEN - 0.2, 'pulse', 'green light pours in', 0.6);
  // the opening title (0-2 s): Instagram's native caption look, heavy SF black on ONE merged white shape
  let tcv = null;
  const drawTitle = (lines, cy, { size = 56, wt = 800, pitch = 66, pad = 11, px = 20, r = 12 } = {}) => {
    const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1920; const g = cv.getContext('2d');
    g.font = `${wt} ${size}px "SF Reel", -apple-system, sans-serif`; g.letterSpacing = (-0.012 * size).toFixed(2) + 'px';
    const n = lines.length, top = cy - (n * pitch + 2 * pad) / 2, ws = lines.map(s => g.measureText(s).width + 2 * px);
    const Rb = i => ({ x: 540 - ws[i] / 2, y: top + i * pitch + (i ? pad : 0), w: ws[i], h: pitch + (i === 0 ? pad : 0) + (i === n - 1 ? pad : 0) });
    const shape = () => { g.beginPath();
      for (let i = 0; i < n; i++) { const b = Rb(i), y0 = i === 0 ? b.y : b.y - 2, h = b.h + (i === 0 ? 0 : 2), tr = i === 0 || ws[i] > ws[i - 1] + 2 * r ? r : 0, br = i === n - 1 || ws[i] > ws[i + 1] + 2 * r ? r : 0; g.roundRect(b.x, y0, b.w, h, [tr, tr, br, br]); }
      for (let i = 0; i < n - 1; i++) { const A = Rb(i), B = Rb(i + 1), yj = B.y, d = (ws[i] - ws[i + 1]) / 2; if (Math.abs(d) < 2 * r) continue; const nar = d > 0 ? B : A, down = d > 0 ? 1 : -1;
        for (const side of [-1, 1]) { const xe = side < 0 ? nar.x : nar.x + nar.w, cx = xe + side * r, cy2 = yj + down * r; g.moveTo(xe, yj); g.lineTo(xe, cy2); g.arc(cx, cy2, r, side < 0 ? 0 : Math.PI, down > 0 ? -Math.PI / 2 : Math.PI / 2, (side < 0) === (down > 0)); g.closePath(); } } };
    g.fillStyle = '#ffffff'; g.shadowColor = 'rgba(0,0,0,0.35)'; g.shadowBlur = 18; g.shadowOffsetY = 5; shape(); g.fill('nonzero'); g.shadowColor = 'transparent'; shape(); g.fill('nonzero');
    g.fillStyle = '#0a0a0a'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; lines.forEach((s, i) => g.fillText(s, 540, top + pad + i * pitch + pitch * 0.735));
    const mw = Math.max(...ws), bx = Math.floor(540 - mw / 2 - 36), by = Math.floor(top - 30), bw = Math.ceil(mw + 72), bh = Math.ceil(n * pitch + 2 * pad + 72);
    const c2 = document.createElement('canvas'); c2.width = bw; c2.height = bh; c2.getContext('2d').drawImage(cv, bx, by, bw, bh, 0, 0, bw, bh);
    c2.style.cssText = `position:absolute;left:${bx}px;top:${by}px;width:${bw}px;height:${bh}px;pointer-events:none;opacity:0`; K.dom.labels.parentNode.appendChild(c2); return c2; };
  K.shot({ id: 'title', t0: 0, t1: 2.4, update(t, u) { if (!tcv) tcv = drawTitle(['Apple Watch heart sensor', 'explained ⌚'], 250); tcv.style.opacity = String(1 - u.k(1.86, 2.04, t)); } });
  K.shot({ id: 'title-off', t0: 2.4, t1: 999, update() { if (tcv && tcv.style.opacity !== '0') tcv.style.opacity = '0'; } });
  const rotZ = new T.Quaternion();
  K.shot({ id: 'hook', t0: 0, t1: h1 + 0.6, update(t, u) {
    const k = u.k;
    if (w.hrPhoto) { const p = u.e.cubicIn(k(PEEL0, PEEL1, t)), g = w.hrPhoto.group; w.hrPhoto.s.vis = t < PEEL1; w.hrPhoto.s.o = 1; w.hrPhoto.s.lit = 1; w.hrPhoto.s.glow = 0;
      g.position.x += -0.07 * p; g.position.y += 0.23 * p; g.position.z += 0.015 * p; rotZ.setFromAxisAngle(K.V(0, 0, 1), 1.1 * p); g.quaternion.premultiply(rotZ); }
    if (w.hw) Object.assign(w.hw.s, { bpm: t < h1 - 0.2 ? 62 : 155 });
    if (w.hand) { w.hand.s.laser = Math.sin(Math.PI * k(R.CUT0 - 0.05, R.CUT1 + 0.15, t)); w.hand.s.light = 0.85 * k(GREEN - 0.35, GREEN + 0.25, t); w.hand.s.beat = R.beatAt(t, R.train(R.CUT1, h1 + 1, 0.95)) * 0.8; }
    K.bloomS = 0.5;
  } });
})();
