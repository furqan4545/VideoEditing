// 54.75 - 71.3 s. Keys go quiet; six answers; the alarm; the checkout kills the magnet.
//   54.75  H3 (wide on the gates) -> an arc-dive to the see-through bag: purple loops cross, the keys wear a thin purple outline
//   55.95  the gate stops: outline gone at once, orange rings keep rising from the tag -> the camera follows them up to gate B's light
//   57.75  six rounds (purple burst, quiet, orange answer lands on the white light, one dot fills) under a slow push at the light
//   61.30  alarm: both lights red, a short punch, pull out to both gates
//   62.58  whip-dolly back into the shop to the checkout: the cheese slides onto the pad, the white ring rises
//   63.95  dive into that tag: lid off, the strip lifts clear, the pin lands on the magnet, its arrows tumble, the blue lines fade
//   65.30  the strip settles back, goes dull, the read-out climbs 58,000 -> 60,000
//   66.80  purple bands pass, the strip hardly moves; the grey swing behind is pushed at the wrong moments
//   69.20  in on the strip's tip (a faint orange loop), then out to the gates: one faint ring leaves the checkout and dies. H4.
(function () {
  const K = KIT, T = THREE, w = K.w, E = K.ease, FOG = [1.6, 4.5], clamp = K.clamp, lerp = K.lerp;
  const sst = x => { x = clamp(x); return x * x * (3 - 2 * x); }, seg = (a, b, t) => clamp((t - a) / (b - a));
  const TAN = Math.tan(12 * Math.PI / 180);
  const G = K.stations.G.g, C = K.stations.C.g;
  const loc = (st, v) => { const p = st.worldToLocal(v.clone()); return [p.x, p.y, p.z]; };
  // look-at point (station-local) that puts the station-local point P on screen pixel (sx, sy) for a camera at d / az / el
  const aim = (P, sx, sy, d, az, el) => { const ce = Math.cos(el), se = Math.sin(el), sa = Math.sin(az), ca = Math.cos(az), a = (sx - 540) / 540 * d * TAN * 0.5625, b = -(sy - 960) / 960 * d * TAN;
    return [P[0] - a * ca + b * se * sa, P[1] - b * ce, P[2] + a * sa + b * se * ca]; };
  const at = (n, p, st, fb) => w[n] ? loc(st, w[n].at(p)) : fb;        // a model-local point in a station's frame (with the rest value as a fallback)
  const TAG = at('tag', [0, 0.0026, 0], G, [0.3, 0.2835, 0.2]), LIGHT_B = at('gB', [0, 1.556, 0], G, [0.5, 1.556, 0]), LIGHT_A = at('gA', [0, 1.556, 0], G, [-0.5, 1.556, 0]);
  const T3 = at('tag3', [0, 0, 0], C, [0.25, 0.9427, 0.02]), T3G = at('tag3', [0, 0.0026, 0], G, [-0.9, 0.9453, -3.28]);
  const NEED = ['gA', 'gB', 'gatefield', 'answer', 'legs', 'bag', 'keys', 'receipt', 'checkout', 'cheese2', 'tag3', 'pin3', 'band3', 'swing3'];
  const t3 = (x, y, z) => [T3[0] + x, T3[1] + y, T3[2] + z];
  const PADC = w.checkout ? w.checkout.anchors.pad : [0.25, 0.9, 0.02];
  // the one faint ring that leaves the paid-for cheese: its line of flight (G), on a path seven times too long so that only one ring is ever on it
  const RDIR = new T.Vector3(-0.3 - T3G[0], 1.4 - T3G[1], 0 - T3G[2]).normalize(), RLEN = 7.0, RTO = [T3G[0] + RDIR.x * RLEN, T3G[1] + RDIR.y * RLEN, T3G[2] + RDIR.z * RLEN];
  const ringAt = s => [T3G[0] + RDIR.x * s, T3G[1] + RDIR.y * s, T3G[2] + RDIR.z * s];
  const BAGV = [0.312, 0.262, 0.245];                                   // between the cheese and the keys, on the bag floor (G)
  const q = new URLSearchParams(location.search);

  // ---------------------------------------------------------------- times
  const BURST0 = 54.86, QUIET = 55.95;                                  // the long burst of the slow replay, and the instant the gate stops
  const R0 = 57.75, RP = 0.59, NR = 6, LAND = 0.37;                     // six rounds; an answer lands LAND after its round starts
  const landT = i => R0 + i * RP + LAND, ALARM = 61.30;
  const WHIP0 = 62.58, WHIP1 = 63.10;

  // ---------------------------------------------------------------- camera
  K.cam.key(54.75, { st: 'G', l: [0.15, 0.75, 0], d: 5.4, az: -0.45, el: 0.12, fov: 24 });                                                    // H3
  K.cam.key(55.52, { st: 'G', l: aim(BAGV, 530, 1095, 0.82, 0.98, 0.50), d: 0.82, az: 0.98, el: 0.50, fov: 24, dive: true, ease: 'cubicInOut' });
  K.cam.key(56.25, { st: 'G', l: aim(BAGV, 545, 1105, 0.74, 1.08, 0.48), d: 0.74, az: 1.08, el: 0.48, fov: 24, ease: 'sineInOut' });
  K.cam.key(57.50, { st: 'G', l: aim(LIGHT_B, 790, 560, 6.0, -0.38, 0.10), d: 6.0, az: -0.38, el: 0.10, fov: 24, dive: true, ease: 'cubicInOut' });
  K.cam.key(61.26, { st: 'G', l: aim(LIGHT_B, 790, 560, 3.3, -0.30, 0.10), d: 3.3, az: -0.30, el: 0.10, fov: 24, dive: true, ease: 'sineInOut' });
  K.cam.key(61.42, { st: 'G', l: aim(LIGHT_B, 770, 590, 2.9, -0.30, 0.10), d: 2.9, az: -0.30, el: 0.10, fov: 24, roll: 0.012, ease: 'expoOut' });
  K.cam.key(62.58, { st: 'G', l: [0.05, 0.85, 0], d: 5.5, az: -0.50, el: 0.12, fov: 24, dive: true, ease: 'cubicInOut' });
  K.cam.key(63.10, { st: 'C', l: aim(PADC, 560, 1090, 1.9, -0.30, 0.36), d: 1.9, az: -0.30, el: 0.36, fov: 24, ease: 'expoInOut' });
  K.cam.key(63.95, { st: 'C', l: aim(PADC, 540, 1060, 1.35, -0.42, 0.42), d: 1.35, az: -0.42, el: 0.42, fov: 24, ease: 'sineInOut' });
  K.cam.key(64.85, { st: 'C', l: aim(t3(0.004, 0.0009, 0.0012), 620, 890, 0.062, 0.30, 0.45), d: 0.062, az: 0.30, el: 0.45, fov: 24, dive: true, ease: 'cubicInOut', ap: 0.0012, fog: FOG });
  K.cam.key(65.40, { st: 'C', l: aim(t3(0.007, 0.0009, 0.0012), 600, 890, 0.056, 0.42, 0.47), d: 0.056, az: 0.42, el: 0.47, fov: 24, ease: 'sineInOut', ap: 0.0012, fog: FOG });
  K.cam.key(66.15, { st: 'C', l: aim(t3(0.019, 0.0014, 0), 620, 1000, 0.078, 1.02, 0.26), d: 0.078, az: 1.02, el: 0.26, fov: 24, ease: 'cubicInOut', ap: 0.0012, fog: FOG });
  K.cam.key(66.80, { st: 'C', l: aim(t3(0.019, 0.0014, 0), 640, 1020, 0.070, 0.92, 0.25), d: 0.070, az: 0.92, el: 0.25, fov: 24, ease: 'sineInOut', ap: 0.0012, fog: FOG });
  K.cam.key(67.45, { st: 'C', l: aim(t3(0.012, 0.0252, -0.035), 700, 455, 0.20, 0.22, 0.20), d: 0.20, az: 0.22, el: 0.20, fov: 24, ease: 'cubicInOut', ap: 0.0008, fog: FOG });
  K.cam.key(69.05, { st: 'C', l: aim(t3(0.012, 0.0252, -0.035), 690, 455, 0.19, 0.12, 0.19), d: 0.19, az: 0.12, el: 0.19, fov: 24, ease: 'sineInOut', ap: 0.0008, fog: FOG });
  K.cam.key(69.62, { st: 'C', l: aim(t3(0.019, 0.0014, 0.002), 560, 1090, 0.05, 1.25, 0.24), d: 0.05, az: 1.25, el: 0.24, fov: 24, ease: 'cubicInOut', ap: 0.0014, fog: FOG });
  K.cam.key(70.25, { st: 'G', l: aim(T3G, 300, 1060, 2.2, -0.45, 0.18), d: 2.2, az: -0.45, el: 0.18, fov: 24, dive: true, ease: 'cubicInOut' });
  K.cam.key(71.30, { st: 'G', l: [0, 0.80, 0], d: 6.2, az: -0.50, el: 0.14, fov: 24, dive: true, ease: 'sineInOut' });                    // H4

  // ---- TEMP debug: hold candidate poses (remove before delivery)
  if (q.has('dbg')) {
    const mine = K.cam.keys.filter(k => k.t >= 54.75 && k.t <= 71.3); for (const k of mine) K.cam.keys.splice(K.cam.keys.indexOf(k), 1);
    const hold = (t, o) => { K.cam.key(t, Object.assign({ fov: 24, hand: 0, ease: 'linear' }, o)); K.cam.key(t + 0.99, Object.assign({ fov: 24, hand: 0, ease: 'linear' }, o)); };
    const P = window.DBG_POSES = JSON.parse(q.get('dbg')); P.forEach((o, i) => hold(55 + i, o));
    K.shot({ id: 'dbg', t0: 54.75, t1: 71.3, update(t, u) { const i = Math.floor(t - 55), o = P[i]; if (!o || !o.s) return; for (const n in o.s) { Object.assign(u.w[n].s, o.s[n]); } } });
  }

  // ---------------------------------------------------------------- the grey swing, pushed at the wrong moments (worked out once, read by time)
  // A soft hand meets a swing that keeps its own, faster rhythm: most shoves find the seat on its way back, or not there at all.
  const SW = (() => {
    const sz = (w.swing3 && w.swing3.size) || { L: 1.535, follow: 0.6, travel: 0.3 }, L = sz.L, FOLLOW = sz.follow, TRAVEL = sz.travel, PS = 0.5, PH = 0.66, W0 = 2 * Math.PI / PS, CD = 0.6, KC = 1.2, REACH = -0.03, PMAX = 1.12, FWD = 0.2, HOLD = 0.04, BACK = 0.24;
    const T0 = 66.55, OFF = 0.35, DT = 1 / 240, N = Math.round(3.6 / DT), th = new Float32Array(N + 1), pa = new Float32Array(N + 1);
    const push = s => { if (s < OFF) return 0; const x = ((s - OFF) / PH % 1) * PH; return x < FWD ? PMAX * sst(x / FWD) : x < FWD + HOLD ? PMAX : x < FWD + HOLD + BACK ? PMAX * (1 - sst((x - FWD - HOLD) / BACK)) : 0; };
    const palm = p => p >= 1 ? REACH + (p - 1) * FOLLOW : REACH - (1 - p) * TRAVEL / L;
    let a = 0.03, om = 0;
    for (let i = 0; i <= N; i++) { const s = i * DT, ah = palm(push(s)), pen = Math.max(0, ah - a); om += (-W0 * W0 * Math.sin(a) - CD * om + KC * pen * W0 * W0) * DT; a += om * DT; th[i] = a; pa[i] = Math.min(ah, a); }
    const rd = (arr, t) => { const x = clamp((t - T0) / DT, 0, N), i = Math.min(N - 1, Math.floor(x)); return lerp(arr[i], arr[i + 1], x - i); };
    return { PH, T0, OFF, REACH, ang: t => rd(th, t), push: t => { const p = rd(pa, t); return p >= REACH ? 1 + (p - REACH) / FOLLOW : 1 - (REACH - p) * L / TRAVEL; } };
  })();

  // ---------------------------------------------------------------- sound
  K.event(54.78, 'dive', 'arc-dive from the gates into the see-through bag', 0.74);
  K.event(BURST0, 'pulse', 'the gate fires: purple loops cross, the keys light up', QUIET - BURST0);
  K.event(QUIET, 'quiet', 'the gate stops: the keys go quiet, only the tag keeps answering', 1.5);
  K.event(56.30, 'pullout', 'follow the orange rings up to gate B\'s white light', 1.2);
  for (let i = 0; i < NR; i++) { K.event(R0 + i * RP, 'pulse', 'burst ' + (i + 1) + ' of six', 0.21); K.event(landT(i), 'tick', 'answer ' + (i + 1) + ' lands on the white light', 0.1); }
  K.event(ALARM, 'alarm', 'both lights red', 1.9); K.event(ALARM, 'hit', 'the camera punches in on the red light', 0.14);
  K.event(61.44, 'pullout', 'out to both red gates', 1.1);
  K.event(WHIP0, 'whip', 'whip-dolly back into the shop to the checkout', WHIP1 - WHIP0);
  K.event(63.72, 'land', 'the cheese stops on the pad');
  K.event(63.74, 'pulse', 'the pad\'s white ring rises through the cheese', 0.8);
  K.event(63.95, 'dive', 'dive into the tag on the cheese', 0.9);
  K.event(64.66, 'land', 'the pin lands on the magnet');
  K.event(64.90, 'reveal', 'the magnet\'s arrows tumble, the blue lines fade', 1.3);
  K.event(65.55, 'riser', 'the read-out climbs from 58,000 to 60,000', 0.9);
  K.event(66.95, 'pulse', 'purple bands pass, the strip hardly moves; the hand shoves the grey swing at the wrong moments', 2.1);
  K.event(69.25, 'quiet', 'almost nothing comes back: one faint orange loop', 0.6);
  K.event(69.78, 'pullout', 'out of the tag, back to the gates; a faint ring dies on the way', 1.5);

  // ---------------------------------------------------------------- labels
  const DOT = (f) => '<span style="display:inline-block;position:relative;width:20px;height:20px;margin:0 7px;border-radius:50%;box-sizing:border-box;border:2px solid #8c8f96">' +
    '<span style="position:absolute;left:-2px;top:-2px;width:20px;height:20px;border-radius:50%;background:#f97316;opacity:' + f.toFixed(3) + '"></span></span>';
  const NUM = s => '<span style="font-variant-numeric:tabular-nums">' + s + '</span>';

  K.shot({ id: 'alarm-checkout', t0: 54.75, t1: 71.3, update(t, u) {
    const w = u.w, d = K.pose.d, lwG = clamp(d / 5.4, 0.14, 1);
    if (NEED.some(n => !w[n])) return;                                   // a model still missing: leave the world at rest
    w.legs.s.still = 1; w.bag.s.hang = 1; w.bag.s.xray = 1;
    if (t < 57.6) { w.bag.s.ghost = 0; if (w.mp) { w.mp.s.vis = false; w.mp.s.o = 0; } }   // the close look into the bag is not a tag-scale shot: the bag stays, no clean paper
    if (t > 55.3 && t < 63.4) w.receipt.s.vis = false;                    // out of frame when it goes and when it comes back

    // ---- the gate fires (purple) / the tag answers (orange)
    let burst = 0, reachP = 1, ans = 0, reachO = 1, listen = 1, pulse = 0, kTo = 1;
    if (t < R0 - 0.1) {                                                   // the long burst of the slow replay, then the quiet
      burst = seg(BURST0, BURST0 + 0.16, t) * (1 - seg(QUIET - 0.02, QUIET + 0.05, t)); reachP = seg(BURST0, BURST0 + 0.34, t);
      ans = t < QUIET ? 1 - seg(BURST0 - 0.04, BURST0 + 0.2, t) : seg(QUIET + 0.02, QUIET + 0.16, t) * (1 - seg(57.4, 57.64, t));   // the old train is drowned out; a new one leaves the tag in the quiet
      if (t >= QUIET) kTo = clamp(Math.pow(d / 6, 1.45));                                                                          // a short train over the tag in the close-up; it reaches up to the light as the camera pulls back with it
      listen = 1 - seg(BURST0, BURST0 + 0.1, t) * (1 - seg(QUIET, QUIET + 0.08, t));
    } else if (t < ALARM) {
      const i = clamp(Math.floor((t - R0) / RP), 0, NR - 1), s = t - (R0 + i * RP);
      burst = seg(0, 0.035, s) * (1 - seg(0.19, 0.225, s)); reachP = seg(0, 0.13, s);
      ans = seg(0.225, 0.27, s) * (i < NR - 1 ? 1 - seg(RP - 0.06, RP, s) : 1); reachO = seg(0.215, LAND + 0.02, s);
      listen = 1 - seg(0, 0.03, s) * (1 - seg(0.2, 0.24, s)); pulse = Math.exp(-Math.max(0, s - LAND) * 9) * (s >= LAND ? 1 : 0);
    }
    const red = t >= ALARM && t < 63.5, quietPart = t >= 63.5;
    if (burst > 0.003) { const f = w.gatefield.s; f.vis = true; f.amp = burst; f.reach = reachP; f.phase = 2.4 * (t - 54.75); f.lw = lwG; }
    w.gA.s.coil = burst; w.keys.s.ring = t < R0 - 0.1 ? sst(seg(BURST0 + 0.12, BURST0 + 0.3, t)) * (1 - seg(QUIET - 0.02, QUIET + 0.06, t)) : burst;
    if (!red && !quietPart && ans > 0.003) { const a = w.answer.s; a.vis = true; a.amp = ans; a.reach = reachO; a.phase = 2.6 * (t - 54.75); a.from = TAG; a.to = kTo >= 1 ? LIGHT_B : [lerp(TAG[0], LIGHT_B[0], kTo), lerp(TAG[1], LIGHT_B[1], kTo), lerp(TAG[2], LIGHT_B[2], kTo)]; a.lw = clamp(d / 5.4, 0.13, 1); a.bow = 0.12; a.face = lerp(0.08, 0.45, kTo); }
    // lights: A green, B white while it listens; both red from the alarm until the camera has left
    if (red) { const fl = 0.78 + 0.22 * Math.cos(2 * Math.PI * 3.2 * (t - ALARM)); w.gA.s.light = w.gB.s.light = 'red'; w.gA.s.glow = w.gB.s.glow = fl; }
    else if (!quietPart) { w.gB.s.light = [lerp(0.09, 1, listen), lerp(0.72, 1, listen), lerp(0.30, 1, listen)]; w.gB.s.glow = 0.5 + 0.45 * pulse; }

    // ---- six dots and the stopwatch, beside gate B's light
    const lo = seg(57.55, 57.8, t) * (1 - seg(61.75, 62.0, t));
    if (lo > 0) {
      let h = ''; for (let i = 0; i < NR; i++) h += DOT(seg(landT(i), landT(i) + 0.1, t));
      u.label('six', h, { screen: [694, 474], kind: 'note', o: lo });
      const sec = 0.07 * clamp((t - R0) / (landT(NR - 1) - R0));
      u.label('watch', NUM((Math.floor(sec * 100 + 1e-6) / 100).toFixed(2)) + ' s', { screen: [902, 474], kind: 'note', o: lo });
    }

    // ---- the checkout
    const slide = E.cubicOut(seg(62.85, 63.72, t)); w.cheese2.group.position.x -= 0.40 * (1 - slide); w.checkout.s.belt = Math.min(0.40 * slide, 0.17);
    const wave = seg(63.74, 64.56, t); w.checkout.s.wave = wave; w.checkout.s.led = wave > 0 && wave < 0.75 ? 'white' : 'green';

    // ---- inside that tag
    const s3 = w.tag3.s;
    s3.lid = seg(64.05, 64.5, t); s3.wall = seg(64.3, 64.7, t);          // it stays open (with its pin) until the checkout has left the frame
    if (w.mp3) { w.mp3.group.position.y += 0.00004 * seg(64.4, 64.8, t); if (t > 64.85 && t < 69.62) { w.mp3.s.vis = true; w.mp3.s.o = 1; } }   // the clean paper, fully there and a hair above the cheese's film
    if (t > 64.9 && t < 69.55) w.checkout.s.vis = false;                 // under the clean paper anyway; its scanner post would stand in the fog behind the tag
    s3.stripLift = 0.004 * sst(seg(64.42, 64.86, t)) * (1 - sst(seg(65.3, 65.85, t)));
    s3.xray = seg(64.6, 64.95, t); s3.blue = t > 64.0 ? 1 : 0; s3.dom = t > 64.0 ? seg(64.9, 66.2, t) : 0;
    s3.dim = seg(65.3, 65.95, t);
    w.pin3.s.vis = t > 64.4; w.pin3.s.drop = seg(64.40, 64.84, t);
    // the strip: a leftover shake while the read-out climbs, then almost nothing under the bands
    const shake = seg(65.5, 65.9, t) * (1 - seg(66.5, 66.95, t)), f = 9 + 3 * seg(65.55, 66.45, t);
    s3.len = 0.010 * shake * Math.sin(2 * Math.PI * f * (t - 65.5)) + 0.0028 * seg(67.0, 67.3, t) * (1 - seg(68.9, 69.2, t)) * Math.sin(2 * Math.PI * 1.9 * (t - 67)) * Math.sin(2 * Math.PI * 0.55 * (t - 66.6));
    // purple bands: an endless train; three are drawn at a time (the leader leaves the frame, a new one fades in at the tail)
    const bo = seg(66.85, 67.15, t) * (1 - seg(68.9, 69.2, t));
    if (bo > 0.003) {
      const b = w.band3.s, g = 0.016, v = 2 * g / SW.PH, XE = 0.036, head = -0.012 + v * (t - 66.85), j0 = Math.max(0, Math.ceil((head - XE) / g)), x0 = head - j0 * g;
      b.vis = true; b.o = bo; b.gap = -g; b.x = x0; b.dir = j0 % 2 ? -1 : 1; b.n = 2 + seg(XE - 3 * g, XE - 3 * g + 0.006, x0 - 2 * g); b.lw = 1;
      s3.glowEnds = 0.4 * bo;
    }
    w.swing3.s.vis = t > 66.2 && t < 69.55; w.swing3.s.ang = SW.ang(t); w.swing3.s.push = SW.push(t); w.swing3.s.reach = SW.REACH; w.swing3.s.handVis = true;
    // almost nothing comes back: a faint loop at the strip, then one faint ring that dies on its way to the gates
    s3.ans = 0.5 * seg(69.2, 69.45, t) * (1 - seg(69.9, 70.2, t)); s3.ansT = 1.6 * (t - 69.2);
    const rs = t < 70.25 ? lerp(0.06, 0.42, sst(seg(69.9, 70.25, t))) : lerp(0.42, 1.0, seg(70.25, 71.0, t));
    if (t > 69.9 && t < 71.0) { const a = w.answer.s; a.vis = true; a.amp = seg(69.9, 70.0, t); a.from = T3G; a.to = RTO; a.reach = 1 / 7; a.phase = 7 * rs / RLEN; a.bow = 0.02; a.lw = clamp(d / 5.4, 0.13, 1); }

    // ---- words
    u.label('mixed', '<span style="white-space:nowrap">The magnet\'s tiny arrows get mixed up</span>', { screen: [540, 1400], kind: 'note', w: 760, o: seg(64.95, 65.2, t) * (1 - seg(65.7, 65.95, t)) });
    const hz = 58000 + 2000 * E.cubicInOut(seg(65.6, 66.45, t));
    u.label('hz', NUM((Math.round(hz / 10) * 10).toLocaleString('en-US')), { screen: [540, 1395], kind: 'big', o: seg(66.0, 66.25, t) * (1 - seg(67.0, 67.25, t)) });
  } });
})();
