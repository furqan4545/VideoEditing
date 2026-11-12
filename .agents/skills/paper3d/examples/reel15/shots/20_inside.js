// 13.1 - 35.4 s. Inside the tag, one continuous macro move through eight pictures:
//   no battery / no chip -> the loose strip over the flat magnet -> a field makes it longer -> without one it snaps back ->
//   the ruler on its desk (shorter = faster) -> 58,000 times a second -> the magnet sets that speed -> no magnet, no shake.
// All poses are in station T (the tag's own frame: +X along the strip, origin under the tag's centre). Starts on H1, ends on H2.
(function () {
  const K = KIT, E = OM.ease, PI = Math.PI, FOG = [1.6, 4.5], cl = K.clamp;
  const kk = (a, b, t) => cl((t - a) / (b - a)), sm = (a, b, t) => E.smooth(kk(a, b, t));
  const win = (t, a, b, c, d) => sm(a, b, t) * (1 - sm(c, d, t));              // up over a..b, down over c..d
  const T0 = 13.1, T1 = 35.4, TIP = 0.019;
  const key = (t, o) => K.cam.key(t, Object.assign({ st: 'T', fov: 24, fog: FOG }, o));

  // ---------------------------------------------------------------- the miniature desk with the ruler (behind the tag's +X end)
  const DS = 0.05, DX = 0.045, DZ = -0.032, RY = 0.72 * DS, RZ = DZ + 0.085 * DS, RX0 = DX + 0.248 * DS;   // scale, place, ruler height / depth, clamp line
  const DESK_ON = 23.2, DESK_OFF = 26.6;

  // ---------------------------------------------------------------- helper: a sheet of clean paper just over the cheese's film
  // (the film's top face lies 0.03 mm above the world's macro paper and its glare shows through as a pale rectangle with
  // hard edges). Same paper, same grain; drawn after the film, fades in during the first move and out during the last.
  const cover = (() => {
    const T = THREE, S = 1.6, g = new T.Group(), tex = K.canvasTex(K.paperCanvas(1024, 5), { repeat: 1 });
    const paper = new T.Mesh(new T.PlaneGeometry(S, S), new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false }));
    const sh = new T.Mesh(new T.PlaneGeometry(S, S), new T.ShadowMaterial({ opacity: 0, color: 0x241f18, depthWrite: false }));
    for (const m of [paper, sh]) { m.rotation.x = -PI / 2; m.castShadow = false; m.userData.noAO = m.userData.noDepth = true; g.add(m); }
    paper.renderOrder = 4.5; sh.renderOrder = 4.6; sh.position.y = 0.000004; sh.receiveShadow = true;
    g.position.y = 0.00002; g.visible = false; K.stations.T.g.add(g);
    return (o) => { g.visible = o > 0.003; paper.material.opacity = o; sh.material.opacity = K.look.shadow * o; tex.repeat.setScalar(S / cl((K.pose ? K.pose.d : 1) * 0.9, 0.004, 6)); };
  })();
  K.shot({ id: 'inside-cover', t0: 0, t1: 999, update(t) { cover(win(t, T0, T0 + 0.6, T1 - 0.8, T1 - 0.05)); } });

  // ---------------------------------------------------------------- camera
  key(13.10, { l: [0.004, 0.0012, 0], d: 0.085, az: 1.15, el: 0.32, ap: 0.0012 });                                             // H1
  // 1 no battery, no chip: back and up to the battery hovering over the open tag, then a push through it to the chip
  key(13.62, { l: [0.002, 0.0062, 0], d: 0.150, az: 1.25, el: 0.38, ap: 0.0010, ease: 'cubicInOut', shadow: 1.5 });
  key(14.12, { l: [0.0022, 0.0062, 0], d: 0.141, az: 1.22, el: 0.38, ap: 0.0010, ease: 'sineInOut', shadow: 1.5 });
  key(14.86, { l: [0.008, 0.0068, 0.001], d: 0.052, az: 0.95, el: 0.36, ap: 0.0012, ease: 'cubicInOut', dive: true, shadow: 1.5 });
  // 2 the strip lies loose above the magnet: down to a low three-quarter section, a slide along the strip to its +X end
  key(15.52, { l: [0.004, 0.0014, 0.003], d: 0.045, az: 0.45, el: 0.20, ap: 0.0014, ease: 'cubicInOut', shadow: 2 });
  key(16.90, { l: [0.010, 0.0014, 0.003], d: 0.042, az: 0.40, el: 0.18, ap: 0.0014, ease: 'sineInOut', shadow: 2 });
  key(17.50, { l: [0.0165, 0.0012, 0.002], d: 0.038, az: 0.30, el: 0.15, ap: 0.0010, ease: 'cubicInOut', shadow: 2 });
  key(18.35, { l: [0.0172, 0.0013, 0.002], d: 0.035, az: 0.27, el: 0.16, ap: 0.0010, ease: 'sineInOut', shadow: 2 });
  // 3 a field makes it longer: up beside the little scale, then a slow push onto the strip's end
  key(18.98, { l: [0.015, 0.0016, -0.002], d: 0.055, az: 0.40, el: 0.28, ap: 0.0014, ease: 'cubicInOut', shadow: 2 });
  key(20.60, { l: [0.0186, 0.0017, -0.0040], d: 0.032, az: 0.16, el: 0.27, ap: 0.0016, ease: 'sineInOut', shadow: 2 });
  key(21.85, { l: [0.0186, 0.0017, -0.0040], d: 0.030, az: 0.13, el: 0.27, ap: 0.0016, ease: 'sineInOut', shadow: 2 });
  // 4 it snaps back: ease off, then back for the bands that come faster and faster
  key(22.62, { l: [0.0178, 0.0017, -0.0032], d: 0.036, az: 0.22, el: 0.28, ap: 0.0016, ease: 'sineInOut', shadow: 2 });
  key(23.32, { l: [0.013, 0.0016, -0.001], d: 0.060, az: 0.42, el: 0.30, ap: 0.0014, ease: 'cubicInOut', shadow: 1 });
  // 5 the ruler: the camera rises to the little desk behind the tag, pushes in as the ruler slides shorter
  key(24.15, { l: [RX0 + 0.0052, RY - 0.0012, RZ], d: 0.072, az: 0.12, el: 0.24, ap: 0.0012, ease: 'cubicInOut', shadow: 1.6, lift: 0.016 });
  key(25.10, { l: [RX0 + 0.0024, RY - 0.0010, RZ], d: 0.056, az: 0.20, el: 0.26, ap: 0.0012, ease: 'sineInOut', shadow: 1.6 });
  key(25.95, { l: [RX0 + 0.0024, RY - 0.0010, RZ], d: 0.052, az: 0.23, el: 0.26, ap: 0.0012, ease: 'sineInOut', shadow: 1.6 });
  // 6 58,000 times a second: swing over and down onto the whole strip from above
  key(26.62, { l: [0.0008, 0.0015, 0.0062], d: 0.204, az: 1.42, el: 1.15, ap: 0.0006, ease: 'cubicInOut', shadow: 1.2, lift: 0.018 });
  key(29.62, { l: [0.0008, 0.0015, 0.0060], d: 0.196, az: 1.49, el: 1.12, ap: 0.0006, ease: 'sineInOut', shadow: 1.2 });
  // 7 the magnet sets the speed: drop to the side section
  key(30.35, { l: [0.012, 0.0022, 0], d: 0.066, az: 0.06, el: 0.15, ap: 0.0010, ease: 'cubicInOut', shadow: 2 });
  key(32.30, { l: [0.013, 0.0022, 0], d: 0.062, az: -0.06, el: 0.14, ap: 0.0010, ease: 'sineInOut', shadow: 2 });
  // 8 without the magnet: back and round for the second strip, then out to H2
  key(33.00, { l: [0.012, 0.0038, 0], d: 0.085, az: 0.45, el: 0.16, ap: 0.0012, ease: 'cubicInOut', shadow: 2 });
  key(34.30, { l: [0.012, 0.0038, 0], d: 0.082, az: 0.52, el: 0.17, ap: 0.0012, ease: 'sineInOut', shadow: 2 });
  key(35.40, { l: [0, 0.0012, 0], d: 0.11, az: 0.90, el: 0.35, ap: 0.0010, ease: 'cubicInOut' });                              // H2

  // ---------------------------------------------------------------- the field bands as a stream, and what the strip does
  // a stream: band number k is centred on xref + (phi - k) * gap; even bands are dark (+X), odd ones light (-X)
  function stream(b, phi, gap, xref, o, lw) {
    const m = Math.floor(phi), fr = phi - m, cnt = cl(m + 2, 0, 3);
    b.vis = o > 0.003 && cnt > 0; b.o = o; b.gap = gap; b.lw = lw; b.x = xref + (fr - 1) * gap; b.dir = ((m + 1) % 2 + 2) % 2 === 0 ? 1 : -1;
    b.n = cnt < 3 ? cnt : 3 - E.smooth(kk(0.5, 0.95, fr));
  }
  const fieldAt = (phi, gap, xref, x) => { const p = phi - (x - xref) / gap; return p < -0.5 ? 0 : Math.cos(PI * p); };   // -1..1 at x; nothing before the first band
  // beat 3: one band sweeps in along the strip and parks on its end; beat 4: it slides off
  const bandX = t => t < 20.5 ? -0.003 + 0.0185 * E.sineInOut(kk(18.85, 20.5, t)) : t < 21.95 ? 0.0155 + 0.0035 * sm(20.5, 21.3, t) : t < 22.78 ? 0.019 + 0.0035 * E.quadIn(kk(21.95, 22.78, t)) : 0.0225 + 0.012 * kk(22.78, 22.96, t);
  const SNAP = 22.78, D0 = 23.05, D1 = 23.95, RD0 = 2.5, RD1 = 20;
  const phiD = t => { const tau = Math.min(t, D1) - D0, uq = tau / (D1 - D0); return -0.5 + RD0 * tau + (RD1 - RD0) * tau * uq * uq / 3 + RD1 * Math.max(0, t - D1); };
  const G0 = 29.9, RG = 2.5, GG = 0.016, GX = -0.002, phiG = t => RG * (t - G0) - 1;
  const FHZ = 10.3;
  function stripLen(t) {
    let v = 0;
    if (t >= 20.5 && t < SNAP) v += 0.033 * sm(20.5, 21.3, t);
    if (t >= SNAP && t < 23.4) { const tau = t - SNAP; v += 0.033 * Math.exp(-22 * tau) * Math.cos(38 * tau); }
    if (t >= D0 && t < 24.9) v += 0.030 * (t < D1 ? 1 : Math.exp(-(t - D1) / 0.22)) * (1 - sm(24.4, 24.9, t)) * Math.cos(PI * phiD(t));
    if (t >= 26.3 && t < 30.3) v += 0.035 * win(t, 26.3, 27.0, 29.7, 30.25) * Math.sin(2 * PI * FHZ * (t - 26.3));
    if (t >= G0 && t < 34.85) v += 0.030 * (1 - sm(34.35, 34.8, t)) * fieldAt(phiG(t), GG, GX, TIP);
    return v;
  }
  // the ruler: let go at RT0, slides from 24 cm to 10 cm of free length, its pitch goes with 1 / length squared
  const RT0 = 23.68, RS0 = 24.48, RS1 = 24.98, FREE0 = 0.24, FREE1 = 0.10, RC = 1.5 * 0.242 * 0.242;
  const freeAt = t => FREE0 + (FREE1 - FREE0) * E.cubicInOut(kk(RS0, RS1, t)), hzAt = t => RC / Math.pow(freeAt(t) + 0.002, 2);
  function rulerPhase(t) {
    if (t <= RT0) return -PI / 2;
    let c = hzAt(RT0) * (Math.min(t, RS0) - RT0);
    if (t > RS0) { const b = Math.min(t, RS1), n = 24, h = (b - RS0) / n; let s = 0; for (let i = 0; i <= n; i++) s += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * hzAt(RS0 + i * h); c += s * h / 3; }
    if (t > RS1) c += hzAt(RS1) * (t - RS1);
    return -PI / 2 + 2 * PI * c;
  }
  // the pin: falls 34.62 -> 34.95, quivers, stands
  const pinDrop = t => t < 34.95 ? 0.6 * kk(34.62, 34.95, t) : 0.6 + 0.4 * kk(34.95, 35.55, t);
  const hover = (inst, x, y, z, tilt, yaw) => { inst.group.position.set(x, y, z); inst.group.rotation.order = 'YXZ'; inst.group.rotation.set(tilt, yaw, 0); };
  const fmt = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // ---------------------------------------------------------------- sound moments
  K.event(13.68, 'tick', 'a thin bar crosses out the coin battery', 0.26);
  K.event(14.14, 'dive', 'push in to the microchip as the battery is taken away', 0.72);
  K.event(14.68, 'tick', 'a thin bar crosses out the chip', 0.22);
  K.event(16.28, 'land', 'the loose strip hops and rattles back down on its shelf', 0.7);
  K.event(17.28, 'reveal', 'the magnet turns see-through: blue arrows, blue field lines grow out of it', 0.8);
  K.event(18.90, 'pulse', 'one purple band of field sweeps in along the strip (field on)', 2.4);
  K.event(20.50, 'riser', 'the strip end slides out along the tiny scale, very slowly', 0.8);
  K.event(22.78, 'snap', 'band gone: the strip snaps back, one tiny settle', 0.25);
  K.event(23.05, 'riser', 'bands come faster and faster until the strip is one shake', 0.9);
  K.event(23.36, 'whip', 'camera rises from the tag to the ruler on its little desk', 0.78);
  K.event(23.68, 'hit', 'the long ruler is let go: slow, deep twang', 0.8);
  K.event(24.48, 'riser', 'the ruler slides shorter while it rings, pitch climbing', 0.5);
  K.event(24.98, 'pulse', 'short ruler buzzes fast and high', 1.0);
  K.event(25.96, 'whip', 'camera swings over and down onto the whole strip', 0.66);
  K.event(26.50, 'riser', 'counter runs up, both strip tips blur', 0.95);
  K.event(27.45, 'hit', 'counter lands on 58,000', 0);
  K.event(29.63, 'dive', 'drop to the side section of the tag', 0.72);
  K.event(30.40, 'pulse', 'purple bands pass one by one, the strip grows and shrinks in step (steady rhythm)', 1.9);
  K.event(32.30, 'reveal', 'a second, grey strip with no magnet glides in above the real one', 0.7);
  K.event(34.36, 'quiet', 'bands gone, the grey strip glides away', 0.5);
  K.event(34.95, 'land', 'a small pin lands on the magnet and quivers', 0.5);

  // ---------------------------------------------------------------- the shot
  K.shot({ id: 'inside', t0: T0, t1: T1, pre: 0, post: 0.7, update(t, u) {
    const w = u.w, tg = w.tag, loc = K.stations.T.g.worldToLocal(K.pose.l.clone());   // the camera's look-at in the tag's frame
    // labels that outlive the handoff by a few frames (they fade, nothing else of this shot runs after T1)
    u.label('c-pin', 'Remember this magnet', { screen: [540, 1365], kind: 'note', o: win(t, 34.98, 35.22, T1 + 0.25, T1 + 0.55) });
    if (t > T1) return;

    // the world at tag scale: clean paper under the tag, nothing of the shopper in the background
    tg.s.lid = 1; w.mp.s.vis = true; w.mp.s.o = 1; w.bag.s.ghost = 1; w.receipt.s.vis = false; w.legs.s.vis = false; w.gA.s.vis = false; w.gB.s.vis = false;
    tg.s.wall = win(t, 15.0, 15.45, 34.5, 35.25);

    // ---- 1 no battery, no chip
    // each part glides in from the right, hovers, gets its bar and is taken away again (always solid: no see-through)
    if (t > 13.26 && t < 14.36) { const b = w.battery, i = E.cubicOut(kk(13.28, 13.66, t)), o = E.cubicIn(kk(14.0, 14.34, t)); b.s.vis = true; b.s.cross = E.cubicInOut(kk(13.68, 13.94, t));
      hover(b, -0.003, 0.0055 + 0.0055 * i + 0.00012 * Math.sin(2.1 * t), -0.040 + 0.0405 * i - 0.042 * o, 0.75, 1.25); }
    if (t > 14.28 && t < 15.42) { const c = w.chip, i = E.cubicOut(kk(14.3, 14.64, t)), o = E.cubicIn(kk(15.0, 15.4, t)); c.s.vis = true; c.s.cross = E.cubicInOut(kk(14.68, 14.9, t));
      hover(c, 0.008 + 0.004 * o, 0.0065 + 0.00008 * Math.sin(2.3 * t + 1), -0.032 + 0.033 * i - 0.034 * o, 0.7, 0.95); }

    // ---- 2 the strip lies loose above a flat magnet
    if (t >= 16.28 && t < 18.3) { tg.s.rattle = 2.4 * (1 - sm(17.6, 18.25, t)); tg.s.rattleT = t - 16.28; }
    tg.s.xray = win(t, 17.22, 17.6, 18.35, 18.8) + 0.8 * win(t, 29.95, 30.4, 32.3, 32.9);
    tg.s.blue = win(t, 17.45, 18.0, 18.35, 18.8) + win(t, 29.95, 30.45, 34.5, 35.1);
    const lo1 = win(t, 15.5, 15.75, 17.0, 17.25), lo2 = win(t, 17.5, 17.75, 18.3, 18.55);
    u.label('c-strip', 'Metal strip', { at: tg.at([loc.x - 0.0015, 0.00147, 0.0045]), dx: 60, dy: -440, kind: 'name', o: lo1 });
    u.label('c-thin', '38 mm long. 0.025 mm thick:<br>a quarter as thick as paper.', { screen: [540, 1400], kind: 'note', o: win(t, 15.9, 16.15, 17.0, 17.25) });
    u.label('c-magnet', 'Flat magnet', { at: tg.at([loc.x - 0.0015, 0.00067, 0.0065]), dx: 70, dy: 230, kind: 'name', o: lo2 });

    // ---- 3 / 4 a field makes it longer, without one it snaps back, then faster and faster
    tg.s.marks = win(t, 18.45, 18.9, 23.4, 23.85);
    tg.s.len = stripLen(t);
    const b = w.band.s;
    if (t >= 18.8 && t < 24.2) { w.band.group.scale.set(1, 0.5, 0.42); w.band.group.position.y = 0.0009; }       // a lower slab for the close-ups: its lines stay out of the caption band
    if (t >= 18.8 && t < 22.98) { b.vis = true; b.n = 1; b.dir = 1; b.lw = 0.3; b.x = bandX(t); b.o = 0.9 * win(t, 18.85, 19.2, 22.8, 22.96); tg.s.glowEnds = 0.7 * win(t, 20.5, 21.3, 22.6, 22.8); }
    if (t >= 23.0 && t < 24.2) stream(b, phiD(t), 0.014, 0.010, win(t, 23.0, 23.15, 23.75, 24.1), 0.45);
    u.label('c-real', 'Real stretch:<br>under 0.001 mm', { screen: [850, 1250], kind: 'note', o: win(t, 21.05, 21.3, 22.2, 22.45) });

    // ---- 5 a shorter ruler buzzes faster
    if (t >= DESK_ON && t < DESK_OFF) { const r = w.ruler; r.s.vis = true; r.group.position.set(DX, 0, DZ); r.group.rotation.set(0, 0, 0); r.group.scale.setScalar(DS);
      const sk = kk(RS0, RS1, t); r.s.free = freeAt(t); r.s.phase = rulerPhase(t);
      r.s.amp = 0.045 * Math.exp(-Math.max(0, t - RT0) / 2.2) * (1 - E.smooth(sk)) + 0.0098 * E.smooth(sk) * Math.exp(-Math.max(0, t - RS1) / 3); }
    u.label('c-ruler', 'Shorter = faster', { screen: [745, 1130], kind: 'note', o: win(t, 25.05, 25.3, 25.85, 26.1) });

    // ---- 6 58,000 times a second
    const cnt = Math.round(58000 * E.cubicOut(kk(26.5, 27.45, t)) / 100) * 100;
    u.label('c-count', fmt(cnt), { screen: [388, 900], kind: 'big', align: 'r', o: win(t, 26.48, 26.7, 29.55, 29.8) });
    u.label('c-times', 'times a second', { screen: [284, 962], kind: 'note', o: win(t, 28.5, 28.75, 29.55, 29.8) });
    u.label('c-steady', '58,000', { screen: [540, 1330], kind: 'mid', o: win(t, 30.35, 30.6, 32.2, 32.45) });

    // ---- 7 / 8 the magnet sets the speed; without it the strip barely shakes
    if (t >= G0 && t < 34.7) { stream(b, phiG(t), GG, GX, win(t, G0 + 0.3, G0 + 0.6, 34.3, 34.62), 0.6); tg.s.glowEnds = 0.45 * Math.abs(fieldAt(phiG(t), GG, GX, TIP)) * (1 - sm(34.3, 34.6, t)); }
    if (t >= 32.3 && t < 34.9) { const g2 = w.tag2, f = fieldAt(phiG(t), GG, GX, TIP) * (1 - sm(34.35, 34.8, t));
      g2.s.vis = true; g2.s.lid = 1; g2.s.tagO = 0; g2.s.shelf = 0; g2.s.magVis = false; g2.s.dim = 1; g2.s.len = 0.0035 * f;
      g2.group.position.set(-0.052 * (1 - E.cubicOut(kk(32.3, 33.02, t))) + 0.075 * E.cubicIn(kk(34.36, 34.9, t)), 0.0046, 0); }       // glides in lengthwise from the far end, leaves past the lens
    u.label('c-nomag', 'No magnet, almost no answer', { screen: [540, 1400], kind: 'note', o: win(t, 33.35, 33.6, 34.3, 34.55) });
    if (t >= 34.6) { w.pin.s.vis = true; w.pin.s.drop = pinDrop(t); }
  } });
  // what stays after this sequence: the lid is off, the pin stands on the magnet (until the supermarket leaves the film)
  K.shot({ id: 'inside-hold', t0: T1, t1: 73.2, update(t, u) { const w = u.w; if (t <= T1) return; w.tag.s.lid = 1; w.pin.s.vis = true; w.pin.s.drop = pinDrop(t); } });
})();
