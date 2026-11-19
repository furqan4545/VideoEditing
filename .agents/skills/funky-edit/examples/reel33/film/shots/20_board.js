// anchor -> question -> four steps -> name -> read -> why: the board. One folder, carried all the way.
// The four steps are a 3D drawing made with the anatomy kit (anat.js): the flat icon tips into a standing folder,
// comes apart, gets its outline, gets painted, opens on its hinge, and hands back to the flat icon.
(function () {
  const K = KIT, V = VOX, T = THREE, wt = V.wt, cl = K.clamp, lerp = K.lerp, W = K.w, A = ANAT;
  const CUT2 = wt('anchor', 0) - 0.14, tQ = wt('question', 0), CUTQ = tQ - 0.06, t1 = wt('step1', 0), t2 = wt('step2', 0), t3 = wt('step3', 0), t4 = wt('step4', 0), tName = wt('name', 0), tRead = wt('read', 0), tWhy = wt('why', 0), END = wt('recipe', 0) - 0.12;
  const ease = OM.ease, io = ease.cubicInOut, bo = ease.backOut;
  const PPM = 1920 / (2 * 9.6 * Math.tan(13 * Math.PI / 180)), UA = 24, SA = UA * 36 / (W.HS * PPM), YA = 1.5 - 50 / PPM;        // the flat icon exactly where the 3D drawing stands

  // ---------------------------------------------------------------- times
  const ask1 = wt('anchor', 'Ask') - 0.05, aIcon = wt('anchor', 'icon') - 0.05, aTwice = wt('anchor', 'twice,'), aDiff = wt('anchor', 'different'), aWtf = wt('anchor', 'What') - 0.05;
  const qFolder = wt('question', 'folder') - 0.1, qLock = wt('question', 'lock') - 0.1, qOne = wt('question', 'one') - 0.05;
  const tCook = wt('step1', 'cook.'), HAND0 = tCook + 0.02, TILT1 = HAND0 + 1.05, sBack = wt('step1', 'Back'), sWhite = wt('step1', 'White'), sFront = wt('step1', 'Front'), EXPL = sBack - 0.3;
  const oOff = t2 + 0.05, oFat = wt('step2', 'fat') - 0.08, oOut = wt('step2', 'outside,') - 0.08, oNever = wt('step2', 'never') - 0.05;
  const cOne = wt('step3', 'one') - 0.1, cPaint = wt('step3', 'paints') - 0.05, cLight = wt('step3', 'Light,') - 0.08, cDark = wt('step3', 'dark,') - 0.08, cShadow = wt('step3', 'shadow,') - 0.08, cGreen = wt('step3', 'all') - 0.05, cPurple = cGreen + 0.62, cBlue = t4 - 0.2;
  const SHUT = t4 - 0.02, pRest = wt('step4', 'Rest') - 0.05, pHover = wt('step4', 'hover.') - 0.08, pThats = wt('step4', "That's") - 0.05, FLAT0 = wt('step4', 'whole') - 0.1, FLAT1 = Math.min(FLAT0 + 0.8, tName - 0.12), tF = wt('step4', 'fucking');
  const nNot = wt('name', 'not') - 0.05, nList = wt('name', 'list') - 0.25, nCalled = wt('name', 'A') - 0.12, nSkill = wt('name', 'skill.') - 0.12;
  const rA = wt('read', 'layers.') - 0.08, rB = wt('read', 'outline.') - 0.08, rC = wt('read', 'light.') - 0.08;
  const wRules = wt('why', 'same') - 0.05, tMatch = wt('why', 'match.') - 0.25, wMoves = wt('why', 'move') - 0.12;

  // ---------------------------------------------------------------- camera (the 3D drawing has its own camera, so the board's camera holds still under it)
  const front = { st: 'B', l: [0, 1.5, 0], d: 9.6, az: 0, el: 0.02, fov: 26 };
  K.cam.key(CUT2, front); K.cam.key(t1, Object.assign({}, front, { ease: 'linear' }));
  K.cam.key(HAND0 - 0.1, Object.assign({}, front, { hand: 0 })); K.cam.key(FLAT1, Object.assign({}, front, { hand: 0, ease: 'linear' }));
  K.cam.key(tName - 0.05, Object.assign({}, front, { hand: 0.5 }));
  K.cam.key(tName + 0.7, { st: 'B', l: [0, 2.0, 0], d: 9.8, az: 0, el: 0.02, fov: 26 });
  K.cam.key(tRead - 0.1, { st: 'B', l: [0, 2.0, 0], d: 9.6, az: 0, el: 0.02, fov: 26, ease: 'linear' });
  K.cam.key(tRead + 0.6, { st: 'B', l: [0, 2.4, 0], d: 10.4, az: 0, el: 0.02, fov: 26 });
  K.cam.key(tMatch, { st: 'B', l: [0, 2.4, 0], d: 10.2, az: 0, el: 0.02, fov: 26, ease: 'linear' });
  K.cam.key(tMatch + 0.8, { st: 'B', l: [0, 2.1, 0], d: 13, az: 0, el: 0.02, fov: 26 });
  K.cam.key(END, { st: 'B', l: [0, 2.1, 0], d: 12.6, az: 0, el: 0.02, fov: 26, ease: 'linear' });
  V.wipe(CUTQ, { seed: 7 });

  // ---------------------------------------------------------------- words
  const TOP = 380;
  V.say('anchor', [
    { at: [540, TOP], align: 'c', size: 60, lines: ['Ask ^AI for', 'an icon ~twice,'] },
    { at: [540, TOP], align: 'c', size: 60, lines: ['and you get', '!two different', 'styles.'] },
    { at: [540, TOP], align: 'c', size: 62, lines: ['What the ^fuck', 'is this?'] }]);
  V.say('question', [
    { at: [540, TOP], align: 'c', size: 58, lines: ['So how does it draw', 'a @folder and a $lock'] },
    { at: [540, TOP], align: 'c', size: 58, lines: ['that look like', '^one ^guy', 'made both?'] }]);
  V.say('step1', [
    { at: [540, TOP], align: 'c', size: 64, lines: ['Alright,', "let's !cook."] },
    { at: [540, TOP], align: 'c', size: 60, lines: ['Every icon is built', 'like a @folder.'] },
    { at: [540, TOP - 10], align: 'c', size: 56, lines: ['^back piece.', '^white sheet.', '^front piece.'] }]);
  V.say('step2', [
    { at: [540, TOP - 20], align: 'c', size: 58, lines: ['Next, every piece', 'gets a ^fat +outline'] },
    { at: [540, TOP - 20], align: 'c', size: 58, lines: ['on the ^outside,'] },
    { at: [540, TOP - 20], align: 'c', size: 58, lines: ['so the shape', '!never shrinks.'] }]);
  V.say('step3', [
    { at: [540, TOP - 50], align: 'c', size: 58, lines: ['Then ^one ^color', 'paints the whole thing.'] },
    { at: [540, TOP - 50], align: 'c', size: 56, lines: ['+Light, +dark, +shadow,', 'all from that', '^one ^color.'] }]);
  V.say('step4', [
    { at: [540, TOP], align: 'c', size: 58, lines: ['Last, every part', 'gets ^two ^poses.'] },
    { at: [540, TOP], align: 'c', size: 64, lines: ['+Rest and +hover.'] },
    { at: [540, TOP], align: 'c', size: 58, lines: ["That's the whole", '~fucking ^trick.'] }]);
  V.say('name', [
    { at: [540, TOP], align: 'c', size: 60, lines: ['So style is', '^not ^taste,', 'bro.'] },
    { at: [540, TOP - 30], align: 'c', size: 58, lines: ["It's a", '^list of ^rules.'] },
    { at: [540, TOP - 30], align: 'c', size: 64, lines: ['A +skill.'] }]);
  V.say('read', [{ at: [540, TOP - 40], align: 'c', size: 54, lines: ['Same ^layers.', 'Same ^outline.', 'Same ^light.'] }]);
  V.say('why', [
    { at: [540, TOP - 50], align: 'c', size: 56, lines: ['A @folder and a $lock', 'are different things,'] },
    { at: [540, TOP - 50], align: 'c', size: 56, lines: ['but they follow', 'the ^same ^rules.'] },
    { at: [540, TOP - 50], align: 'c', size: 62, lines: ['So they +match.'] },
    { at: [540, TOP - 50], align: 'c', size: 56, lines: ['And they ~move', 'like the', '^real ^thing.'] }]);

  [[CUT2 + 0.05, 'reveal', 'red board, the Claude block'], [aIcon, 'tick', 'first icon pops'], [aTwice + 0.2, 'tick', 'second icon pops'], [aDiff, 'hit', 'they do not match'], [aWtf, 'meme', 'meow'], [qFolder, 'land', 'folder'], [qLock, 'land', 'lock'], [qOne, 'reveal', 'question mark'],
    [tCook, 'meme', 'taco'], [HAND0 + 0.1, 'whip', 'the folder tips into 3D', 0.9], [EXPL + 0.08, 'snap', 'back piece slides out'], [sBack, 'tick', 'part name'], [sWhite, 'tick', 'part name'], [sFront, 'tick', 'part name'],
    [oFat, 'snap', 'outline snaps on'], [oFat + 0.18, 'snap', 'outline snaps on'], [oNever, 'pulse', 'never shrinks'],
    [cOne, 'land', 'the colour block drops'], [cPaint, 'reveal', 'colour fills the folder', 0.5], [cLight, 'tick', 'light'], [cDark, 'tick', 'dark'], [cShadow, 'tick', 'shadow'], [cGreen, 'pulse', 'green'], [cPurple, 'pulse', 'purple'],
    [SHUT + 0.1, 'snap', 'layers close'], [pHover, 'tick', 'opens'], [pThats, 'tick', 'opens'], [tF, 'meme', 'wink'], [FLAT0 + 0.05, 'whip', 'back to the flat icon', 0.7],
    [nNot, 'hit', 'not taste'], [nList, 'tick', 'rules list'], [nSkill, 'hit', 'the skill file'], [rA, 'tick', 'tick'], [rB, 'tick', 'tick'], [rC, 'tick', 'tick'],
    [tMatch + 0.1, 'reveal', 'the family arrives', 0.8], [wMoves, 'pulse', 'every icon moves', 1.2]].forEach(e => K.event(...e));

  const hang = [K.line([[0, 2.7, 0], [-0.62, 2.14, 0]], { color: '#35ecd0', width: 4, opacity: 0.9 }), K.line([[0, 2.7, 0], [0.62, 2.14, 0]], { color: '#35ecd0', width: 4, opacity: 0.9 })]; hang.forEach(l => { l.visible = false; W.board.add(l); });
  const FAM = [['mail', -1.25, 1.7], ['calendar', 1.25, 1.7], ['settings', -1.25, 0.8], ['bell', -0.42, 0.8], ['search', 0.42, 0.8], ['camera', 1.25, 0.8]];
  const RULES = ['1 &nbsp;THREE LAYERS', '2 &nbsp;OUTLINE OUTSIDE', '3 &nbsp;ONE COLOR', '4 &nbsp;TWO POSES'];
  const ACC = { blue: '#5393ff', green: '#22c55e', purple: '#8b5cf6', grey: '#9aa3b5' }, TN = {}; for (const c in ACC) TN[c] = A.tone(ACC[c]);

  K.shot({ id: 'board', t0: CUT2, t1: END + 0.3, update(t, u) {
    const w = u.w; V.bloom.strength = 0.2; hang.forEach(l => { l.visible = false; }); K.key.intensity = 2.5; K.hemi.intensity = 0.62;
    // ============================================================ anchor: one prompt, asked twice, two styles
    if (t < CUTQ) {
      w.grid.visible = false; V.setBackdrop(1, '#d9481c');
      const c = w.clawdB; c.s.vis = true; c.group.position.set(0, 0.05, 0.6); c.group.rotation.y = 0; c.group.scale.setScalar(2.1);
      c.s.armR = (t > ask1 && t < ask1 + 0.7) || (t > aTwice && t < aTwice + 0.7) ? 1.5 + 0.2 * Math.sin(t * 20) : 0; c.s.pen = c.s.armR > 0 ? 1 : 0; c.s.tilt = t > aDiff ? 0.16 : 0; c.s.squash = t > aWtf ? 0.3 * Math.exp(-(t - aWtf) * 5) : 0;
      const a = V.pop(t, aIcon, 0.34), b = V.pop(t, aTwice + 0.2, 0.34), sh = t > aDiff ? 0.03 * Math.sin((t - aDiff) * 40) * Math.exp(-(t - aDiff) * 6) : 0;
      w.badA.visible = a > 0; w.badA.position.set(-0.6 + sh, 1.92, 0); w.badA.scale.setScalar(Math.max(0.001, 0.74 * a)); w.badA.rotation.z = 0.04;
      w.badB.visible = b > 0; w.badB.position.set(0.6 - sh, 1.92, 0); w.badB.scale.setScalar(Math.max(0.001, 0.74 * b)); w.badB.rotation.z = -0.05;
      V.label('prompt', '<b>&gt;</b> draw a folder icon', { at: [540, 1065], cls: 'term', o: V.fade(t, ask1 - 0.1), scale: Math.max(V.pulse(t, ask1, 0.12), V.pulse(t, aTwice, 0.12)) });
      V.label('neq', '≠', { at: [540, 762], cls: 'mark', o: V.fade(t, aDiff, 0.08), scale: 0.6 + 0.6 * V.pop(t, aDiff, 0.3) });
      V.label('x2', '×2', { at: [836, 1065], cls: 'chip r', o: V.fade(t, aTwice), scale: V.pulse(t, aTwice, 0.3) });
      V.meme('huh', 'huh_cat.jpg', t, aWtf, { at: [196, 1290], w: 240, rot: -7, dur: Math.min(1.5, CUTQ - aWtf - 0.1) });
      return;
    }
    // ============================================================ the dark board from here on
    w.heroGlow.visible = true; w.heroGlow.material.opacity = 0.2; w.heroGlow.scale.set(3.3, 3.3, 1);
    if (t < tName) {
      const inQ = t < t1, solid = cl((t - HAND0) / 0.2) * (1 - cl((t - (FLAT1 - 0.2)) / 0.2));
      // ---- the flat icons (question, the walk to the middle, and again after the 3D part)
      const toC = io(cl((t - t1) / 0.7)), fa = V.pop(t, qFolder, 0.36), la = V.pop(t, qLock, 0.36) * (1 - cl((t - t1) / 0.4));
      w.lock.visible = la > 0.002; w.lock.position.set(0.62 + 2.2 * ease.cubicIn(cl((t - t1) / 0.5)), 1.62, 0); w.lock.scale.setScalar(Math.max(0.001, 0.5 * V.pop(t, qLock, 0.36))); w.lock.material.opacity = cl(la); w.lock.frame(0);
      w.folder.visible = fa > 0 && solid < 0.999; w.folder.position.set(lerp(-0.62, 0, toC), lerp(1.62, YA, toC), 0.02); w.folder.scale.setScalar(Math.max(0.001, lerp(0.5, SA, toC) * (t < t1 ? fa : 1))); w.folder.material.opacity = 1 - solid; w.folder.frame(0);
      w.heroGlow.position.set(lerp(0, 0, toC), lerp(w.HY, YA, toC), -0.6);
      if (inQ) { V.label('qm', '?', { at: [540, 1330], cls: 'q', o: V.fade(t, qOne, 0.1), scale: 0.5 + 0.5 * V.pop(t, qOne, 0.4), rot: 8 * Math.sin(t * 2.2) });
        const c = w.clawdB; c.group.position.set(-0.02, 0.02, 1.3); c.group.scale.setScalar(1.25); c.group.rotation.y = 0; c.s.tilt = 0.14 * Math.sin(t * 1.6); c.s.vis = t < qOne - 0.1; }
      V.meme('cook', 'cat_cook.jpg', t, tCook - 0.05, { at: [236, 1420], w: 230, rot: -7, dur: 1.5 });
      if (t >= HAND0 - 0.02 && t < FLAT1 + 0.02) {
        // ---- the 3D drawing
        const tilt = io(cl((t - HAND0) / (TILT1 - HAND0))) * (1 - io(cl((t - FLAT0) / (FLAT1 - FLAT0)))), drift = cl((t - TILT1) / (FLAT0 - TILT1));
        w.grid.material.opacity = 1 - tilt;
        const e = t < SHUT ? (t > EXPL ? bo(cl((t - EXPL) / 0.5)) : 0) : 1 - io(cl((t - SHUT) / 0.42));
        const open = t >= pThats ? 1 - io(cl((t - pThats) / 0.35)) : t >= pHover ? bo(cl((t - pHover) / 0.5)) : 0;
        const hot = t < t2 - 0.2 ? (t >= sFront - 0.08 ? 'front' : t >= sWhite - 0.08 ? 'sheet' : t >= sBack - 0.08 ? 'back' : null) : null;
        const lo = 1 - cl((t - (t2 - 0.1)) / 0.25), lab = (id, n, name, t0, v) => ({ id, n, name, v, a: cl((t - t0 + 0.06) / 0.22) * lo, on: hot === id });
        // outline: on, off at the start of step 2, then drawn round each piece
        const dr = (t0) => t < oOff ? 1 : t < t0 ? 1 - cl((t - oOff) / 0.15) : ease.cubicOut(cl((t - t0) / 0.42));
        const fat = t >= oFat && t < t3 ? 7 * Math.sin(cl((t - oFat) / 1.0) * Math.PI) : 0;
        const nb = 1 + (t >= oNever && t < t3 ? 0.06 * Math.sin(cl((t - oNever) / 0.45) * Math.PI) : 0);
        // colour: grey, then one colour paints it, then it follows the block
        let tones = TN.blue, acc = ACC.blue;
        if (t >= t3 && t < cPaint) tones = A.mixTone(TN.blue, TN.grey, cl((t - t3) / 0.3));
        else if (t >= cPaint && t < cGreen) tones = A.mixTone(TN.grey, TN.blue, cl((t - cPaint) / 0.4));
        else if (t >= cGreen && t < cPurple) { const m = cl((t - cGreen) / 0.3); tones = A.mixTone(TN.blue, TN.green, m); acc = V.mix(ACC.blue, ACC.green, m); }
        else if (t >= cPurple && t < cBlue) { const m = cl((t - cPurple) / 0.3); tones = A.mixTone(TN.green, TN.purple, m); acc = V.mix(ACC.green, ACC.purple, m); }
        else if (t >= cBlue && t < t4 + 0.4) { const m = cl((t - cBlue) / 0.18); tones = A.mixTone(TN.purple, TN.blue, m); acc = V.mix(ACC.purple, ACC.blue, m); }
        const cs = t >= cOne ? bo(cl((t - cOne) / 0.4)) * (1 - cl((t - (t4 - 0.08)) / 0.25)) : 0, ch = (t0) => { const a = cl((t - t0) / 0.32); return a <= 0 ? 0 : Math.min(1, bo(a)); };
        const UU = UA + 3 * (io(cl((t - t2 - 0.1) / 0.8)) - io(cl((t - t3) / 0.6)));
        const out = A.draw({ az: lerp(90, lerp(57, 40, drift), tilt), el: lerp(0, lerp(17, 23, drift), tilt), U: UU, cx: 540 - 14 * tilt, cy: 1010 + 40 * (io(cl((t - t3) / 0.6)) - io(cl((t - t4) / 0.5))), e, open, tones, hot, alpha: solid, grid: tilt,
          outline: { back: dr(oFat), front: dr(oFat + 0.18) }, fat, bump: nb !== 1 ? { back: nb, sheet: nb, front: nb } : null,
          labels: [lab('back', '01', 'BACK', sBack, 6.4), lab('sheet', '02', 'SHEET', sWhite, -0.6), lab('front', '03', 'FRONT', sFront, -7.6)],
          cube: cs > 0 ? { accent: acc, s: cs, z: lerp(27, 17.5, ease.cubicOut(cl((t - cOne) / 0.4))), chips: [{ src: '#ccdfff', a: ch(cLight) * (cs > 0.5 ? 1 : 0) }, { src: '#3f7cf0', a: ch(cDark) * (cs > 0.5 ? 1 : 0) }, { src: '#8ab6ff', a: ch(cShadow) * (cs > 0.5 ? 1 : 0), o: 0.6 }] } : null });
        ['LIGHT', 'DARK', 'SHADOW'].forEach((n, i) => { const p = out.chips[i]; if (p) V.label('tone' + i, n, { at: [p[0], p[1] + 44], cls: 'tag', o: V.fade(t, [cLight, cDark, cShadow][i] + 0.18) * cl(cs) }); });
        if (t >= t2 && t < t3) V.label('to', '1 UNIT · OUTSIDE', { at: [540, 1452], cls: 'chip t big', o: V.fade(t, oOut) * (1 - cl((t - t3 + 0.2) / 0.2)), scale: 0.85 + 0.15 * V.pop(t, oOut) });
        if (t >= pRest - 0.25) { const on = open > 0.5 ? 'h' : 'r', a = V.fade(t, pRest - 0.2) * (1 - cl((t - FLAT0) / 0.2));
          V.label('pr', 'REST', { at: [370, 1452], cls: 'chip big' + (on === 'r' ? ' on' : ''), o: a, scale: on === 'r' ? 1.06 : 1 }); V.label('ph', 'HOVER', { at: [712, 1452], cls: 'chip big' + (on === 'h' ? ' on' : ''), o: a, scale: on === 'h' ? 1.06 : 1 }); }
      }
      V.meme('smug', 'smug_dog.jpg', t, tF - 0.05, { at: [226, 1380], w: 250, rot: -6, dur: Math.min(1.4, tName - tF - 0.1) });
      return;
    }
    // ============================================================ name: the four steps are a list, the list is a file
    const f = w.skillB;
    if (t < tRead) {
      V.setBackdrop(0.75 * Math.max(0, 1 - Math.abs(t - nNot - 0.2) / 0.45), '#c8121f');
      const fo = 1 - cl((t - tName) / 0.35); w.folder.visible = fo > 0.01; w.folder.position.set(0, YA, 0.02); w.folder.scale.setScalar(SA * (0.6 + 0.4 * fo)); w.folder.material.opacity = fo; w.folder.frame(0);
      const gather = ease.cubicIn(cl((t - nCalled) / 0.4));
      RULES.forEach((r, i) => { const a = V.pop(t, nList + i * 0.1, 0.3); V.label('rule' + i, r, { at: [540, lerp(790 + i * 96, 940, gather)], cls: 'chip big', o: cl(a) * (1 - gather), scale: (0.7 + 0.3 * a) * (1 - 0.5 * gather) }); });
      const s = V.pop(t, nSkill, 0.45); f.s.vis = s > 0; f.group.position.set(0, 1.2 + 0.03 * Math.sin(t * 2), 0.5); f.group.scale.setScalar(Math.max(0.001, 1.75 * s)); f.group.rotation.set(0, 0.5 * (1 - cl((t - nSkill) / 0.6)) + 0.08 * Math.sin(t * 1.4), 0.03);
      w.heroGlow.material.color.set('#35ecd0'); w.heroGlow.material.opacity = 0.26 * cl(s); w.heroGlow.position.set(0, 2.3, -0.4);
      V.label('skilltag2', 'SKILL.md', { at: [540, 1452], cls: 'chip t big', o: V.fade(t, nSkill + 0.2), scale: 0.85 + 0.15 * V.pop(t, nSkill + 0.2) });
      return;
    }
    // ============================================================ read + why: both icons hang from the same file
    w.heroGlow.material.color.set('#5393FF'); w.heroGlow.position.set(0, 1.9, -0.6); w.heroGlow.material.opacity = 0.14;
    const mv = io(cl((t - tRead) / 0.6)), fam = io(cl((t - tMatch) / 0.7));
    f.s.vis = true; f.group.position.set(0, lerp(1.2, 2.7, mv) + 0.02 * Math.sin(t * 2), lerp(0.5, 0, mv)); f.group.scale.setScalar(lerp(1.75, 0.92, mv) * V.pulse(t, wRules, 0.16, 0.5)); f.group.rotation.set(0, 0.06 * Math.sin(t * 1.4), 0.02);
    const bump = V.pulse(t, rA, 0.1) * V.pulse(t, rB, 0.1) * V.pulse(t, rC, 0.1);
    const ix = lerp(0.62, 0.42, fam), isz = lerp(0.457, 0.34, fam);
    [[w.folder, -1, 0], [w.lock, 1, 0.1]].forEach(([m, sx, dly], i) => { const a = V.pop(t, tRead + 0.25 + dly, 0.36); m.visible = a > 0; m.position.set(sx * ix, 1.7, 0.02); m.scale.setScalar(Math.max(0.001, isz * a * bump)); m.frame(V.hover(t, wMoves + i * 0.14, 1.3)); });
    const lo = V.fade(t, tRead + 0.55, 0.25) * (1 - fam); hang.forEach(l => { l.visible = lo > 0.02; l.material.opacity = 0.9 * lo; });
    [['LAYERS', rA, 250], ['OUTLINE', rB, 540], ['LIGHT', rC, 826]].forEach(([n, t0, x], i) => V.label('same' + i, '✓ ' + n, { at: [x, 1492], cls: 'chip t', o: V.fade(t, t0) * (1 - cl((t - tWhy - 0.2) / 0.3)), scale: 0.8 + 0.2 * V.pop(t, t0) }));
    FAM.forEach(([n, x, y], i) => { const m = w.family.find(q => q.nameId === n), a = V.pop(t, tMatch + 0.25 + i * 0.07, 0.34); m.visible = a > 0; m.position.set(x, y, 0.02); m.scale.setScalar(Math.max(0.001, 0.9 * a)); m.frame(V.hover(t, wMoves + 0.28 + i * 0.14, 1.3)); });
  } });
})();
