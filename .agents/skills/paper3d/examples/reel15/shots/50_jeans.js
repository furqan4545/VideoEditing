// 71.3 - 90.2 s. The best part: the jeans.
// Clean paper (the quietest picture) -> the clothes shop: PAID on the terminal, a stamped receipt -> into the waistband:
// the flap folds back, the square tag, a calm orange ring -> home: the washer, the calendar turns to JANUARY ->
// the hardware shop: the jeans walk out, red -> jacket, shoes, belt into the tray -> red again -> the left hip turns
// see-through: the tag -> the real blog post -> the last print (H5).
(function () {
  const K = KIT, T = THREE, w = K.w, E = OM.ease, PI = Math.PI, clamp = K.clamp, lerp = K.lerp;
  const seg = (a, b, t) => clamp((t - a) / (b - a));
  const A = (inst, name, fb) => { const a = inst && inst.anchors && inst.anchors[name]; return a ? [a[0], a[1], a[2]] : fb; };
  const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

  // ---------------------------------------------------------------- where things are (station-local, metres)
  // S: the pay point (the till stands on S's origin)
  const TOP = A(w.till, 'top', [-0.2, 0.95, 0]), TERM = A(w.till, 'terminal', [0.21, 1.10, 0.13]), SLOT = A(w.till, 'printer', [0.329, 1.047, -0.051]);
  const TAG = add(TOP, A(w.jeans, 'tag', [-0.133, 0.069, -0.107]));                 // the sewn-in tag under the flap
  // H: the washer on H's origin; the calendar stands on the paper at its front right corner (moved there every frame in update)
  const DOOR = A(w.washer, 'door', [0, 0.45, 0.33]), WTOP = A(w.washer, 'top', [0, 0.85, 0]);
  const CAL = [0.60, 0, 0.26], CALROT = -0.20, cp = A(w.calendar, 'page', [0, 0.11, 0.02]);
  const CALPAGE = [CAL[0] + cp[0] * Math.cos(CALROT) + cp[2] * Math.sin(CALROT), CAL[1] + cp[1], CAL[2] - cp[0] * Math.sin(CALROT) + cp[2] * Math.cos(CALROT)];
  // W: the hardware shop. The walker stops at z = ZSTOP between the gates; the tray stands right of gate D
  const ZSTOP = 0.2, WL = A(w.legs2, 'waistL', [-0.17, 0.985, 0]), HIP = [WL[0], 0.972, ZSTOP + WL[2]];
  const TRAY = w.tray ? [w.tray.group.position.x, 0.07, w.tray.group.position.z] : [1.25, 0.07, 0.5];
  const CARD = [-1.45, 0, 0.90], CARDROT = 0.22;

  // ---------------------------------------------------------------- the walk (pure functions of time)
  // phase in cycles; z = ZSTOP - 1.44 * (phase still to go). Entry 1 ends on the first alarm, entry 2 on the second.
  const stopWalk = (t, c, tD, tS, phEnd) => { const phD = phEnd - c * (tS - tD) / 2; if (t <= tD) return phD - c * (tD - t); const u = seg(tD, tS, t); return phD + c * (tS - tD) * (u - u * u / 2); };
  function walkAt(t) {
    if (t < 85.2) { const ph = stopWalk(t, 0.86, 82.75, 83.20, 4.25); return { ph, z: ZSTOP - 1.44 * (4.25 - ph), still: E.cubicInOut(seg(82.98, 83.36, t)) }; }
    const ph = stopWalk(Math.max(t, 86.32), 1.0, 87.00, 87.36, 2.75);
    return { ph, z: ZSTOP - 1.44 * (2.75 - ph), still: t < 86.6 ? 1 - E.cubicInOut(seg(86.32, 86.54, t)) : E.cubicInOut(seg(87.24, 87.56, t)) };
  }
  const WZ = (t) => walkAt(t).z;

  // ---------------------------------------------------------------- helpers built here
  // 1) the tag seen through the denim at the left hip: a pale window in the cloth, the off-white square with its print, an orange ring
  let hip = null;
  if (w.legs2) {
    hip = new T.Group(); hip.position.set(WL[0] - 0.003, 0.972, WL[2]); hip.rotation.y = -PI / 2; hip.visible = false; w.legs2.group.add(hip);
    const over = (m, ro) => { m.material.transparent = true; m.material.depthTest = false; m.material.depthWrite = false; m.renderOrder = ro; m.castShadow = false; m.receiveShadow = false; m.userData.noAO = m.userData.noDepth = true; hip.add(m); return m; };
    hip.win = over(K.canvasPlane(0.09, 0.09, 3000, (c, CW, CH) => { const m = CW * 0.17; c.clearRect(0, 0, CW, CH); c.filter = `blur(${Math.round(CW * 0.035)}px)`; c.fillStyle = 'rgb(214,222,238)'; c.beginPath(); c.roundRect(m, m, CW - 2 * m, CH - 2 * m, CW * 0.11); c.fill(); c.filter = 'none'; }), 6);   // the cloth over the tag goes pale and see-through
    hip.tag = over(K.canvasPlane(0.038, 0.038, 20000, (c, CW, CH) => {
      c.clearRect(0, 0, CW, CH); c.fillStyle = '#e9e7e0'; c.beginPath(); c.roundRect(0, 0, CW, CH, CW * 0.105); c.fill();
      c.strokeStyle = 'rgba(120,118,112,0.55)'; c.lineWidth = CW * 0.004; const m = CW * 0.075; c.beginPath(); c.roundRect(m, m, CW - 2 * m, CH - 2 * m, CW * 0.07); c.stroke();
      c.fillStyle = '#1b1c1f'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `500 ${Math.round(CW * 0.072)}px ${K.FONT}`; if ('letterSpacing' in c) c.letterSpacing = (CW * 0.006) + 'px';
      ['REMOVE BEFORE', 'WASHING OR', 'WEARING'].forEach((s, i) => c.fillText(s, CW / 2, CH * (0.40 + i * 0.105)));
    }), 7);
    const ringGeo = (s, wd) => { const sh = new T.Shape(K.geo.rrect(s, s, 0.0064).map(p => new T.Vector2(p[0], p[1]))); sh.holes.push(new T.Path(K.geo.rrect(s - 2 * wd, s - 2 * wd, 0.0064 - wd).map(p => new T.Vector2(p[0], p[1])))); return new T.ShapeGeometry(sh, 10); };
    hip.rings = [0, 1, 2].map(i => { const m = K.mat.flat(K.col.orange, 0); m.side = T.DoubleSide; return over(new T.Mesh(ringGeo(0.0436, i ? 0.0006 : 0.0009), m), 8); });
  }
  function hipAt(t) {
    if (!hip) return; const o = E.cubicInOut(seg(87.84, 88.14, t)); hip.visible = o > 0.003; if (!hip.visible) return;
    hip.win.material.opacity = 0.52 * o; hip.tag.material.opacity = 0.94 * E.cubicInOut(seg(87.92, 88.22, t));
    const gl = seg(88.30, 88.50, t), P = 2.2;
    hip.rings[0].material.opacity = gl * (0.82 + 0.18 * Math.sin(t * 2 * PI / P));
    for (let i = 1; i < 3; i++) { const ph = (((t / P + (i - 1) / 2) % 1) + 1) % 1, s = 1 + 0.42 * (1 - Math.pow(1 - ph, 3)); hip.rings[i].scale.set(s, s, 1); hip.rings[i].material.opacity = gl * 0.75 * Math.pow(1 - ph, 1.6) * clamp(ph * 7); }
  }
  // 2) the blog post print with the tag's words marked (the world's cardBlog has no mark rectangle): same model, same picture
  let blog = null;
  try { blog = K.make('card', { img: 'img/wolfstad_top.png', w: 0.56, mark: 'tag', corner: 'tr' }); blog.group.position.set(CARD[0], CARD[1], CARD[2]); blog.group.rotation.y = CARDROT; K.stations.W.g.add(blog.group); blog.defaults.vis = false; } catch (e) { console.warn('50_jeans: ' + e.message); }

  // 3) the till's receipt: the receipt model prints a supermarket slip; this one is for a pair of jeans (repaint the part above the stamp)
  if (w.receipt2) { const fr = w.receipt2.group.children.find(m => m.userData && m.userData.cv && m.userData.cv.height > 1000), sz = w.receipt2.size || {};
    if (fr && sz.stampAt) { const cv = fr.userData.cv, c = fr.userData.g, CW = cv.width, mm = CW / 58, yS = sz.stampAt * cv.height, yMax = yS - 12.5 * mm, f = (yMax - 6 * mm) / (100 * mm), INK = '#232427', GREY = '#6c6e74';
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = '#f8fafc'; c.fillRect(0, 0, CW, yMax); c.textBaseline = 'alphabetic';
      const txt = (s, x, y, em, o = {}) => { c.font = `${o.wt || 400} ${(em * mm).toFixed(1)}px ${K.FONT}`; if ('letterSpacing' in c) c.letterSpacing = ((o.ls || 0) * em * mm).toFixed(1) + 'px'; c.textAlign = o.al || 'left'; c.fillStyle = o.col || INK; c.fillText(s, x * mm, y * f * mm); };
      const pair = (a, b, y, em, o) => { txt(a, 4.8, y, em, o); txt(b, 53.2, y, em, Object.assign({}, o, { al: 'right' })); };
      const rule = (y) => { c.strokeStyle = INK; c.globalAlpha = 0.75; c.lineWidth = 0.28 * mm; c.setLineDash([1.3 * mm, 1.0 * mm]); c.beginPath(); c.moveTo(4.8 * mm, y * f * mm); c.lineTo(53.2 * mm, y * f * mm); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; };
      txt('RECEIPT', 29.5, 13, 5.0, { al: 'center', wt: 500, ls: 0.16 }); txt('Clothes shop  ·  Till 01', 29, 19.5, 2.7, { al: 'center', col: GREY });
      rule(25); pair('12 DEC', '17:20', 32, 3.2); pair('RECEIPT 001207', 'CASHIER 04', 37.5, 2.7, { col: GREY }); rule(42.5);
      pair('JEANS 32 / 32', '49.00', 52, 3.8); pair('STRAIGHT FIT', '1 PC', 58, 2.7, { col: GREY }); rule(64);
      pair('TOTAL', '49.00', 75, 5.6, { wt: 500 }); rule(81);
      pair('CARD PAYMENT', '49.00', 90, 3.7); pair('CONTACTLESS', 'APPROVED', 96, 2.7, { col: GREY }); pair('AUTH CODE', '073915', 101.5, 2.7, { col: GREY });
      c.restore(); fr.userData.tex.needsUpdate = true; } }

  // 4) his shoes come off, so from then on he walks in socks: a sock foot in each shoe's place (the legs model only has feet in shoes)
  let feet = [];
  if (w.legs2) { const sock = new T.MeshStandardMaterial({ color: new T.Color('#d0cec8'), roughness: 0.95 });
    for (const fg of w.legs2.group.children) { if (!(fg.isGroup && fg.rotation.order === 'YXZ' && fg.children.length === 1)) continue;
      const shoe = fg.children[0], gy = shoe.position.y, sg = new T.Group(); sg.visible = false; fg.add(sg);     // gy = the ground under the ankle
      const ball = (r, pos) => sg.add(K.mesh(new T.SphereGeometry(1, 32, 20), sock, { pos, scale: r }));
      ball([0.037, 0.036, 0.043], [0, gy + 0.036, -0.030]); ball([0.042, 0.035, 0.105], [0, gy + 0.035, 0.055]); ball([0.044, 0.021, 0.052], [0, gy + 0.021, 0.150]); ball([0.035, 0.046, 0.050], [0, gy + 0.052, 0.004]);
      feet.push({ shoe, sock: sg }); }
    if (feet.length !== 2) { for (const f of feet) f.sock.parent.remove(f.sock); feet = []; } }

  // ---------------------------------------------------------------- camera
  const key = (t, o) => K.cam.key(t, Object.assign({ fov: 24 }, o));
  key(71.30, { st: 'G', l: [0, 0.80, 0], d: 6.2, az: -0.50, el: 0.14 });                                             // H4
  key(71.80, { st: 'G', l: [2.75, 0, 1.5], d: 2.7, az: -0.36, el: 0.93, ease: 'cubicInOut' });                       // off the gates, down onto clean paper
  key(72.20, { st: 'G', l: [2.95, 0, 1.5], d: 2.58, az: -0.33, el: 0.95, ease: 'sineInOut' });                       // near stillness
  key(72.62, { st: 'S', l: [-0.03, 0.97, 0.16], d: 2.2, az: -0.24, el: 1.0, ease: 'expoInOut' });                    // slide onto the pay point, seen from above like a table top: the jeans, the terminal
  key(73.48, { st: 'S', l: add(TERM, [0, 0, 0.02]), d: 0.72, az: 0.20, el: 0.90, ease: 'cubicInOut', dive: true });                     // the terminal
  key(74.28, { st: 'S', l: add(SLOT, [0.0, 0.06, -0.035]), d: 1.0, az: 0.22, el: 1.17, ease: 'sineInOut' });          // up and over with the receipt
  key(74.60, { st: 'S', l: add(SLOT, [-0.002, 0.062, -0.035]), d: 0.96, az: 0.20, el: 1.17, ease: 'linear' });
  key(75.10, { st: 'S', l: [-0.27, 1.02, -0.05], d: 0.95, az: -0.40, el: 1.05, ease: 'cubicInOut' });                 // across to the jeans
  key(75.70, { st: 'S', l: add(TAG, [-0.002, 0, -0.034]), d: 0.42, az: -0.50, el: 1.05, ease: 'cubicInOut', dive: true, ap: 0.0010, fog: [1.6, 4.5] });   // into the waistband, the tag low in frame: room for the flap to stand up
  key(76.45, { st: 'S', l: add(TAG, [-0.002, 0, -0.014]), d: 0.365, az: -0.45, el: 0.96, ease: 'sineInOut', ap: 0.0012, fog: [1.6, 4.5] });
  key(77.00, { st: 'S', l: add(TAG, [-0.002, 0, 0.004]), d: 0.33, az: -0.40, el: 0.88, ease: 'sineInOut', ap: 0.0014, fog: [1.6, 4.5] });                // settle on the tag
  key(78.15, { st: 'S', l: add(TAG, [-0.001, 0, 0.004]), d: 0.31, az: -0.34, el: 0.84, ease: 'linear', ap: 0.0014, fog: [1.6, 4.5] });
  key(78.55, { st: 'H', l: [0, 0.52, 0.30], d: 3.3, az: -0.14, el: 0.08, ease: 'expoInOut' });                       // whip: out of the waistband, down to the washer
  key(79.42, { st: 'H', l: [0.01, 0.52, 0.30], d: 3.18, az: -0.07, el: 0.075, ease: 'sineOut' });
  key(79.88, { st: 'H', l: [CALPAGE[0], 0.125, CALPAGE[2]], d: 1.15, az: -0.24, el: 0.14, ease: 'cubicInOut', dive: true });   // down to the calendar
  key(80.45, { st: 'H', l: [CALPAGE[0], 0.125, CALPAGE[2]], d: 1.08, az: -0.19, el: 0.14, ease: 'linear' });
  key(80.85, { st: 'W', l: [0, 0.71, 0], d: 7.45, az: 0.14, el: 0.0, ease: 'expoInOut', lift: 1.3 });               // a rising arc to the hardware shop: gates, tool wall, the jeans walking out
  key(82.93, { st: 'W', l: [0, 0.71, 0], d: 7.32, az: 0.09, el: 0.0, ease: 'linear' });
  key(83.06, { st: 'W', l: [0, 0.725, 0], d: 7.20, az: 0.085, el: 0.0, roll: 0.012, ease: 'expoOut' });             // the alarm: a short hit
  key(83.30, { st: 'W', l: [0, 0.72, 0], d: 7.26, az: 0.08, el: 0.0, ease: 'sineInOut' });
  key(83.77, { st: 'W', l: [0, 0.72, 0], d: 7.24, az: 0.075, el: 0.0, ease: 'linear' });
  key(84.22, { st: 'W', l: [TRAY[0], 0.06, TRAY[2]], d: 2.05, az: 1.27, el: 0.82, ease: 'expoInOut', dive: true });  // round and down to the tray
  key(86.70, { st: 'W', l: [TRAY[0], 0.07, TRAY[2]], d: 1.95, az: 1.17, el: 0.80, ease: 'sineInOut' });
  key(87.10, { st: 'W', l: [-0.05, 1.02, 0.12], d: 5.0, az: -0.55, el: -0.04, ease: 'expoInOut' });                  // round the front, low, to the gates again
  key(87.62, { st: 'W', l: [-0.05, 1.02, 0.12], d: 4.88, az: -0.60, el: -0.04, ease: 'sineOut' });
  key(88.00, { st: 'W', l: HIP, d: 0.42, az: -1.30, el: 0.08, ease: 'cubicInOut', dive: true, ap: 0.0012, fog: [1.6, 4.5] });   // into the left hip
  key(88.62, { st: 'W', l: HIP, d: 0.385, az: -1.23, el: 0.07, ease: 'sineInOut', ap: 0.0012, fog: [1.6, 4.5] });
  key(89.00, { st: 'W', l: [CARD[0] + 0.03, 0.22, CARD[2] + 0.13], d: 2.9, az: CARDROT + 0.06, el: 0.15, ease: 'cubicInOut' });   // back out to the blog post print
  key(89.76, { st: 'W', l: [CARD[0] + 0.032, 0.19, CARD[2] + 0.14], d: 2.6, az: CARDROT + 0.02, el: 0.16, ease: 'sineInOut' });    // closer: the marked words
  key(90.07, { st: 'E', l: [-0.05, 0.80, 0], d: 6.78, az: 0.012, el: 0.022, ease: 'expoInOut' });                    // slide to the last print, a hair early
  key(90.20, { st: 'E', l: [0, 0.80, 0], d: 6.6, az: 0, el: 0.02, ease: 'sineOut' });                                // H5, a soft settle

  // ---------------------------------------------------------------- what happens
  const _e = new T.Euler(), _v = new T.Vector3();
  const drop = (inst, t, tl, H = 0.75) => {                          // free fall onto its place: real gravity, then the model's own bounce and rock
    if (!inst) return; const t0 = tl - Math.sqrt(2 * H / 9.81); inst.s.vis = t >= t0; if (!inst.s.vis) return;
    inst.s.fall = t < tl ? 0.56 : 0.56 + 0.44 * seg(tl, tl + 0.6, t);
    if (t < tl) inst.group.position.y += 0.5 * 9.81 * (tl - t) * (tl - t);
  };
  K.shot({ id: 'jeans', t0: 71.3, t1: 90.2, pre: 0.3, post: 0.6, update(t, u) {
    // ---- S: paid
    if (w.till) w.till.s.paid = seg(73.57, 73.64, t);
    if (w.receipt2) { const r = w.receipt2, kf = E.sineOut(seg(73.74, 74.26, t)); r.s.vis = t > 73.70 && t < 79.4;
      r.s.curl = 0; r.s.sway = 0.05 * Math.sin((t - 73.74) * 17) * Math.exp(-Math.max(0, t - 74.26) * 5) * seg(73.74, 73.95, t);
      r.s.stamp = seg(74.32, 74.52, t);
      _e.set(-0.24, -0.12, 0); r.group.rotation.copy(_e);
      const p = r.pos ? r.pos(kf, { curl: 0, sway: r.s.sway }) : [0, 0.34 - 0.22 * kf, 0]; _v.set(p[0], p[1], p[2]).applyEuler(_e);
      r.group.position.set(SLOT[0] - _v.x, SLOT[1] - _v.y, SLOT[2] - _v.z);
    }
    // ---- S: the tag hidden inside
    if (w.jeans) { w.jeans.s.flap = seg(75.62, 76.46, t); w.jeans.s.glow = seg(76.80, 77.20, t); }
    u.label('stillon', 'Paid. The tag is still on.', { screen: [540, 1440], kind: 'note', color: '#f4f1ea', o: seg(77.0, 77.25, t) * (1 - seg(77.95, 78.15, t)) });
    // ---- H: washed, weeks later
    if (w.washer) { w.washer.s.spin = 4.6 * (t - 77.6); w.washer.s.dial = 0.9; }
    if (w.calendar) { w.calendar.group.position.set(CAL[0], CAL[1], CAL[2]); w.calendar.group.rotation.set(0, CALROT, 0); w.calendar.s.flip = seg(79.94, 80.34, t); }
    // ---- W: the hardware shop
    const wk = walkAt(t);
    if (w.walker2) w.walker2.position.set(0, 0, wk.z);
    if (w.legs2) { w.legs2.s.walk = wk.ph; w.legs2.s.still = wk.still; }
    const red = (t >= 82.95 && t < 85.2) || t >= 87.26, since = t >= 87.26 ? t - 87.26 : t - 82.95;
    for (const g of [w.gC, w.gD]) if (g) { g.s.light = red ? 'red' : 'green'; if (red) g.s.glow = 0.72 + 0.28 * Math.cos(2 * PI * 3.2 * since); }
    u.label('same', 'Another shop. Same jeans.', { screen: [540, 1476], kind: 'note', o: seg(81.95, 82.2, t) * (1 - seg(83.5, 83.72, t)) });
    drop(w.jacket, t, 84.70); drop(w.shoes, t, 85.40); drop(w.belt, t, 86.24);
    for (const f of feet) { f.shoe.visible = t < 85.2; f.sock.visible = t >= 85.2; }     // the shoes are in the tray now
    hipAt(t);
    if (blog) { blog.s.vis = t > 88.2; blog.s.o = 1; blog.s.lift = E.cubicOut(seg(88.55, 88.98, t)); blog.s.mark = E.cubicInOut(seg(89.12, 89.52, t)); }
    u.label('real', 'Real blog post, 22 January 2006', { screen: [540, 1402], kind: 'small', o: seg(89.02, 89.24, t) * (1 - seg(89.7, 89.84, t)) });
  } });

  // ---------------------------------------------------------------- sound
  K.event(71.75, 'quiet', 'clean empty paper, only the caption', 0.45);
  K.event(72.20, 'whip', 'slide from the paper onto the clothes shop counter', 0.42);
  K.event(73.58, 'tick', 'the terminal shows PAID, the printer feeds the receipt', 0.68);
  K.event(74.34, 'hit', 'the PAID stamp lands on the receipt');
  K.event(75.10, 'dive', 'push into the waistband of the jeans', 0.6);
  K.event(75.66, 'reveal', 'the flap of denim folds back: the tag', 0.8);
  K.event(76.85, 'pulse', 'the orange ring: the tag is still switched on', 1.2);
  K.event(78.15, 'whip', 'out of the waistband to the washing machine, drum turning', 0.4);
  K.event(79.94, 'snap', 'the calendar page turns over: DECEMBER to JANUARY', 0.44);
  K.event(80.45, 'whip', 'a rising arc to the hardware shop', 0.4);
  K.event(82.95, 'alarm', 'the hardware shop gates go red', 0.8);
  K.event(83.77, 'whip', 'round and down to the tray', 0.45);
  K.event(84.70, 'land', 'the jacket lands in the tray');
  K.event(85.40, 'land', 'the shoes land in the tray');
  K.event(86.24, 'land', 'the belt lands in the tray');
  K.event(86.70, 'whip', 'round the front, back to the gates', 0.4);
  K.event(87.26, 'alarm', 'red again', 0.6);
  K.event(87.62, 'dive', 'into the left hip of the jeans', 0.38);
  K.event(88.32, 'reveal', 'the tag glows through the denim', 0.4);
  K.event(89.76, 'whip', 'slide to the last print', 0.31);
})();
