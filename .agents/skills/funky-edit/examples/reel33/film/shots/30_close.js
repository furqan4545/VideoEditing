// recipe -> catch -> close: back in the studio, then the wall again, the repo and the comment box.
(function () {
  const K = KIT, V = VOX, T = THREE, wt = V.wt, cl = K.clamp, lerp = K.lerp, ease = OM.ease;
  const tR = wt('recipe', 0), tC = wt('catch', 0), tE = wt('close', 0), CUT3 = tR - 0.1, CUT4 = tE - 0.08, DUR = TIMING.dur;
  window.PLACES.push([CUT3, 'S'], [CUT4, 'W']);

  // ---------------------------------------------------------------- camera
  K.cam.key(CUT3, { st: 'M', l: [0, 0.33, 0], d: 6.1, az: -0.1, el: 0.03, fov: 26, ap: 0.0012 });
  K.cam.key(tC - 0.2, { st: 'M', l: [0, 0.33, 0], d: 5.8, az: -0.02, el: 0.03, fov: 26, ap: 0.0012, ease: 'linear' });
  K.cam.key(tC + 0.3, { st: 'S', l: [-0.34, 0.86, 0.5], d: 4.7, az: 0.1, el: 0.07, fov: 26, ap: 0.0045, ease: 'expoInOut' });
  K.cam.key(CUT4 - 0.001, { st: 'S', l: [-0.33, 0.88, 0.5], d: 4.45, az: 0.02, el: 0.07, fov: 26, ap: 0.0045, ease: 'linear' });
  K.cam.key(CUT4, { st: 'W', l: [0, 10.6, 0], d: 13, az: 0, el: 0, fov: 26, hand: 0.6 });
  K.cam.key(DUR, { st: 'W', l: [0, 6.2, 0], d: 12.2, az: 0, el: 0, fov: 26, hand: 0.6, ease: 'linear' });
  V.wipe(CUT3, { seed: 11 }); V.wipe(CUT4, { seed: 13 });
  K.event(tC - 0.1, 'whip', 'whip to the host', 0.5);

  // ---------------------------------------------------------------- words
  V.say('recipe', [
    { at: [96, 418], align: 'l', size: 54, lines: ['So you ^paste', 'one line into', '#Claude #Code.'] },
    { at: [96, 418], align: 'l', size: 54, lines: ['Then you say,', '+draw +icons', 'for my app.'] },
    { at: [96, 418], align: 'l', size: 54, lines: ['It ~draws them,', 'checks its own', '+screenshots,'] },
    { at: [96, 418], align: 'l', size: 56, lines: ['and !fixes', 'its own mess.'] }]);
  V.say('catch', [
    { at: [540, 372], align: 'c', size: 66, lines: ['The !catch?'] },
    { at: [540, 372], align: 'c', size: 58, lines: ['It needs a', '^strong model', 'that can ~see images.'] },
    { at: [540, 372], align: 'c', size: 64, lines: ['Like +Opus +5.5.'] }]);
  V.say('close', [
    { at: [540, 520], align: 'c', size: 64, lines: ['Too ~lazy', 'to draw?'] },
    { at: [540, 520], align: 'c', size: 58, count: true, lines: ['The repo also', 'comes with', '!2,800 icons,'] },
    { at: [540, 520], align: 'c', size: 60, lines: ['^ready to use', 'right now.'] },
    { at: [540, 520], align: 'c', size: 96, lines: ['+Free.'] },
    { at: [540, 520], align: 'c', size: 62, lines: ['Link is in', 'the ^description.'] },
    { at: [540, 520], align: 'c', size: 64, lines: ['Or comment', '!SKILL,'] },
    { at: [540, 520], align: 'c', size: 52, until: DUR, lines: ['and I will send you', '+detailed instructions', 'with the repo link.'] }]);

  // ---------------------------------------------------------------- the monitor: a terminal
  const tPaste = wt('recipe', 'paste') - 0.05, tInst = wt('recipe', 'Code.') + 0.3, tAsk = wt('recipe', 'draw') - 0.08, tDraw = wt('recipe', 'draws') - 0.12, tCheck = wt('recipe', 'checks') - 0.05, tShots = wt('recipe', 'screenshots,') - 0.05, tFix = wt('recipe', 'fixes') - 0.05, tMess = wt('recipe', 'mess.');
  const SET = ['home', 'search', 'bell', 'user', 'calendar', 'settings'];
  [[tPaste, 'snap', 'the line is pasted'], [tInst, 'tick', 'installed'], [tAsk, 'tick', 'typing', 0.8], [tDraw, 'reveal', 'icons get drawn', 1.0], [tCheck, 'snap', 'screenshot flash'], [tShots + 0.25, 'hit', 'one red mark'], [tFix, 'tick', 'fixed'], [tMess - 0.05, 'meme', 'pipe']].forEach(e => K.event(...e));
  function paintTerm(g, W, H, t) {
    g.fillStyle = '#0b0c10'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#15171d'; g.fillRect(0, 0, W, 70); for (const [i, c] of ['#ff5f57', '#febc2e', '#28c840'].entries()) { g.fillStyle = c; g.beginPath(); g.arc(40 + i * 36, 35, 11, 0, 7); g.fill(); }
    g.font = '700 26px Menlo, monospace'; g.textBaseline = 'middle'; g.fillStyle = '#7b8191'; g.fillText('claude', 350, 36);
    const mono = (txt, x, y, col, size = 34) => { g.font = `700 ${size}px Menlo, monospace`; g.fillStyle = col; g.fillText(txt, x, y); };
    const pa = cl((t - tPaste) / 0.12);
    if (pa > 0) { g.fillStyle = `rgba(53,236,208,${0.28 * (1 - cl((t - tPaste - 0.12) / 0.5))})`; g.fillRect(30, 96, W - 60, 156);
      mono('>', 40, 126, '#35ecd0'); mono('Install the Kubai Icons skill', 78, 126, '#f1f4fa'); mono('for me: clone github.com/', 78, 174, '#f1f4fa'); mono('kubai087/kubai-icons', 78, 222, '#f1f4fa'); }
    if (t > tInst) { mono('✓', 40, 292, '#28c840'); mono('skill ready: kubai-icons', 78, 292, '#9fe8b0'); }
    if (t > tAsk) { const n = Math.round(cl((t - tAsk) / 0.8) * 23), s = 'draw icons for my app'.slice(0, n); mono('>', 40, 366, '#35ecd0'); mono(s, 78, 366, '#f1f4fa'); if (n < 23 || Math.floor(t * 2.5) % 2 === 0) { g.fillStyle = '#35ecd0'; g.fillRect(80 + g.measureText(s).width, 346, 5, 40); } }
    if (t > tDraw) {
      g.fillStyle = '#12141a'; V.rrect(g, 30, 420, W - 60, 620, 26); g.fill(); mono('check-out/rest.png', 54, 462, '#5d6373', 22);
      const flash = cl(1 - (t - tCheck) / 0.3) * (t > tCheck ? 1 : 0);
      SET.forEach((n, i) => {
        const x = 170 + (i % 3) * 230, y = 610 + Math.floor(i / 3) * 250, a = V.pop(t, tDraw + i * 0.13, 0.3), sk = cl((t - tDraw - i * 0.13 + 0.14) / 0.14);
        g.setLineDash([10, 9]); g.lineWidth = 3; g.strokeStyle = `rgba(120,128,146,${0.9 * sk * (1 - cl(a))})`; V.rrect(g, x - 76, y - 76, 152, 152, 30); g.stroke(); g.setLineDash([]);
        if (a > 0) { const bad = i === 3 && t < tFix + 0.1; g.save(); if (bad) { g.translate(x, y); g.rotate(0.05); g.translate(-x, -y); } V.drawIcon(g, n, t > tFix + 0.4 ? V.hover(t, tFix + 0.5 + i * 0.06, 0.8) : 0, x, y, 170 * a); g.restore();
          if (bad && t > tShots - 0.3) { g.strokeStyle = '#ff2338'; g.lineWidth = 5; g.setLineDash([8, 7]); g.beginPath(); g.arc(x + 46, y - 34, 30, 0, 7); g.stroke(); g.setLineDash([]); }
          const tk = t > tCheck + 0.1 + i * 0.07 ? V.pop(t, tCheck + 0.1 + i * 0.07, 0.25) : 0;
          if (tk > 0) { const red = i === 3 && t < tFix; g.fillStyle = red ? '#ff2338' : '#28c840'; g.beginPath(); g.arc(x + 62, y + 62, 24 * tk, 0, 7); g.fill(); g.font = '700 30px Menlo, monospace'; g.fillStyle = '#0b0c10'; g.textAlign = 'center'; g.fillText(red ? '✕' : '✓', x + 62, y + 64); g.textAlign = 'left'; } }
      });
      if (flash > 0) { g.fillStyle = `rgba(255,255,255,${0.8 * flash})`; g.fillRect(30, 420, W - 60, 620); }
      if (t > tShots) { const fixed = t > tFix + 0.1; mono(fixed ? '✓' : '✕', 44, 1092, fixed ? '#28c840' : '#ff2338'); mono(fixed ? 'findings.md: 0 problems' : 'findings.md: 1 outline gap', 84, 1092, fixed ? '#9fe8b0' : '#ff8a96', 28); }
    }
  }

  // ---------------------------------------------------------------- times of the last beats
  const cCatch = wt('catch', 'catch?') - 0.05, cStrong = wt('catch', 'strong') - 0.1, cReads = wt('catch', 'see') - 0.05, cOpus = wt('catch', 'Opus') - 0.12;
  const eLazy = wt('close', 'lazy') - 0.05, eRepo = wt('close', 'repo') - 0.1, eReady = wt('close', 'ready') - 0.08, eFree = wt('close', 'Free.') - 0.08, eLink = wt('close', 'Link') - 0.1, eComment = wt('close', 'comment') - 0.12, eSkill = wt('close', 'SKILL,') - 0.06, eSend = wt('close', 'send') - 0.1;
  [[cCatch, 'meme', 'awkward'], [cStrong, 'tick', 'small model fails'], [cOpus, 'reveal', 'Opus 5.5'], [eLazy, 'meme', 'snore'], [eReady, 'hit', 'READY TO USE'], [eFree, 'tick', 'free'], [eLink, 'tick', 'typing the repo', 0.9], [eComment, 'land', 'comment box'], [eSkill, 'tick', 'typing SKILL', 0.4], [eSend, 'land', 'the Claude block jumps in']].forEach(e => K.event(...e));
  const URL = 'github.com/kubai087/kubai-icons';
  const END_HERO = [['folder', -1.06, 0.2, 0], ['lock', 1.06, 0.05, 0.3], ['mail', -1.08, -1.5, 0.6], ['calendar', 1.08, -1.62, 0.9]];

  K.shot({ id: 'close', t0: CUT3, t1: DUR + 1, update(t, u) {
    const w = u.w;
    if (t < CUT4) {
      w.screen.paint((g, W, H) => paintTerm(g, W, H, t));
      const c = w.clawd.s; c.pen = t > tDraw - 0.1 && t < tCheck ? 1 : 0; c.armR = c.pen ? 1.25 + 0.35 * Math.sin(t * 22) : (t > tFix ? 1.2 + 0.3 * Math.sin(t * 14) : 0); c.armL = t > tFix ? 1.2 + 0.3 * Math.sin(t * 14 + 1) : 0; c.happy = t > tFix ? 1 : 0;
      c.hop = t > tFix ? 0.04 * Math.abs(Math.sin((t - tFix) * 9)) * Math.exp(-(t - tFix) * 1.6) : 0; c.tilt = t > tShots && t < tFix ? 0.12 : 0;
      w.scrLight.intensity = 5 + 14 * cl(1 - (t - tCheck) / 0.3) * (t > tCheck ? 1 : 0);
      V.meme('mess', 'lazy_bed.jpg', t, tMess - 0.08, { at: [258, 1500], w: 260, rot: -6, dur: Math.min(1.1, tC - tMess - 0.25) });
      if (t > tC - 0.3) {
        // ---- the catch: the host says it straight
        w.screen.material.color.setScalar(1 - 0.93 * cl((t - tC + 0.05) / 0.25)); w.pimp.group.position.x = -0.62;
        const p = w.pimp.s; p.talk = 1; p.look = 0.3; p.armL = t > cCatch ? 2.5 * V.pop(t, cCatch, 0.3) : 0; p.nod = t > cOpus ? -0.12 * Math.sin(cl((t - cOpus) / 0.5) * Math.PI) : 0; p.armR = t > cOpus ? 2.2 * V.pop(t, cOpus, 0.3) + 0.08 * Math.sin(t * 9) : 0;
        V.meme('side', 'side_eye.jpg', t, cCatch, { at: [800, 760], w: 240, rot: 7, dur: Math.min(1.25, cStrong - cCatch - 0.05) });
        const sm = V.pop(t, cStrong, 0.3), shake = t > cReads ? 10 * Math.sin((t - cReads) * 46) * Math.exp(-(t - cReads) * 7) : 0, dim = 1 - 0.55 * cl((t - cOpus) / 0.3);
        V.label('small', '▬ &nbsp;SMALL MODEL &nbsp;✕', { at: [742 + shake, 800], cls: 'chip r big', o: cl(sm) * dim, scale: 0.7 + 0.3 * sm });
        const op = V.pop(t, cOpus, 0.36);
        V.label('opus', '◉ &nbsp;OPUS 5.5 &nbsp;✓', { at: [742, 950], cls: 'chip on big', o: cl(op), scale: (0.7 + 0.3 * op) * 1.12 });
        V.label('opusn', 'SEES ITS OWN SCREENSHOTS', { at: [742, 1030], cls: 'tag', o: V.fade(t, cOpus + 0.25) });
      }
      return;
    }
    // ---- close: the wall, ready to use, where to find it, the comment box
    V.bloom.strength = 0.22; K.key.intensity = 2.6; K.hemi.intensity = 0.62; const cy = K.pose.l.y;
    V.label('scrim2', '', { at: [540, 520], cls: 'scrim', o: 0.94 * cl((t - CUT4 - 0.1) / 0.3) });
    V.meme('lazy', 'eepy.jpg', t, eLazy, { at: [540, 1150], w: 330, rot: -5, dur: Math.min(1.4, eRepo - eLazy) });
    const st = V.pop(t, eReady, 0.3), so = cl(st) * (1 - cl((t - eLink + 0.05) / 0.2));
    V.label('ready', 'READY TO USE', { at: [540, 1128], cls: 'stamp sm', o: so, scale: 1.6 - 0.6 * Math.min(1, st), rot: -7 });
    const n = Math.round(cl((t - eLink) / 0.9) * URL.length), up = ease.cubicInOut(cl((t - eComment) / 0.35));
    V.label('url', '<b>⌕</b>&nbsp; ' + URL.slice(0, n) + (n < URL.length ? '<b>▍</b>' : ''), { at: [540, 1128 - 96 * up], cls: 'term', o: V.fade(t, eLink, 0.15), scale: (0.86 + 0.14 * V.pop(t, eLink, 0.3)) * (1 - 0.1 * up) });
    const k = Math.round(cl((t - eSkill) / 0.4) * 5), cm = V.pop(t, eComment, 0.32);
    V.label('cmt', '<b>Comment</b>&nbsp; ' + (k ? 'SKILL'.slice(0, k) : '<span style="opacity:.4">Add a comment…</span>') + (k < 5 && Math.floor(t * 2.5) % 2 === 0 ? '<b>▍</b>' : '') + (k >= 5 ? '<i>➤</i>' : ''), { at: [540, 1160], cls: 'term cmt', o: cl(cm), scale: 1.12 * (0.7 + 0.3 * cm) * V.pulse(t, eSkill + 0.42, 0.1) });
    END_HERO.forEach(([nm, x, dy, dl], i) => { const m = w.wallHeroes.find(q => q.nameId === nm), a = V.pop(t, eRepo + i * 0.09, 0.34); m.visible = a > 0; m.position.set(x, cy + dy, 0.8); m.scale.setScalar(Math.max(0.001, 0.78 * a)); m.frame(V.hover((t - eRepo - dl) % 2.6, 0.5, 0.9)); });
    const c = w.clawdW, upc = V.pop(t, eSend, 0.45); c.s.vis = upc > 0; c.group.position.set(0, cy - 2.3 + 0.9 * (upc - 1), 1.2); c.group.scale.setScalar(2.8);
    c.s.happy = 1; c.s.armR = 1.3 + 0.45 * Math.sin(t * 11); c.s.armL = 0.3; c.s.hop = 0.02 * Math.abs(Math.sin(t * 5));
  } });
})();
