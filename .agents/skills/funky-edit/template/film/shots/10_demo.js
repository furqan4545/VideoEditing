// A 17 s demo of every piece of the look: the studio and the push to the monitor, the words, a whip to the host, a label
// pinned to a 3D thing, a meme sticker, the pixel wipe, the board with a 3D drawing that comes apart, a stamp.
// Replace it with your beats: one file per act (10_open.js, 20_board.js, 30_close.js), listed in shots/index.js.
(function () {
  const K = KIT, V = VOX, A = ANAT, wt = V.wt, cl = K.clamp, lerp = K.lerp, io = OM.ease.cubicInOut;
  const tHost = wt('host', 0), tRoom = wt('host', 'room.') - 0.1, tWtf = wt('host', 'What') - 0.05, tBoard = wt('board', 0), CUT1 = tBoard - 0.14, tClose = wt('close', 0), CUT2 = tClose - 0.14;
  const tFunky = wt('hook', 'funky') - 0.06, tEvery = wt('board', 'Every') - 0.05, tBack = wt('board', 'Back.') - 0.06, tMid = wt('board', 'Middle.') - 0.06, tFront = wt('board', 'Front.') - 0.06, tOwn = wt('close', 'own.') - 0.05;
  window.PLACES = [[0, 'S'], [CUT1, 'B'], [CUT2, 'S']];              // which place is on from when

  // ---------------------------------------------------------------- camera: never frozen. Same room = a whip; another room = a cut under the pixel wipe
  K.cam.key(0, { st: 'S', l: [0, 2.5, -1.7], d: 11.5, az: 0.26, el: 0.1, fov: 26, ap: 0.0009 });
  K.cam.key(1.5, { st: 'M', l: [0, 0.33, 0], d: 6.0, az: 0.1, el: 0.03, fov: 26, ap: 0.0012, ease: 'quartOut' });                        // push to the monitor
  K.cam.key(tHost - 0.22, { st: 'M', l: [0, 0.33, 0], d: 5.75, az: 0.03, el: 0.03, fov: 26, ap: 0.0012, ease: 'linear' });               // the slow zoom
  K.cam.key(tHost + 0.3, { st: 'S', l: [-0.34, 0.86, 0.5], d: 4.7, az: -0.06, el: 0.07, fov: 26, ap: 0.0045, ease: 'expoInOut' });       // whip to the host
  K.cam.key(CUT1 - 0.001, { st: 'S', l: [-0.32, 0.88, 0.5], d: 4.45, az: 0.02, el: 0.07, fov: 26, ap: 0.0045, ease: 'linear' });
  K.cam.key(CUT1, { st: 'B', l: [0, 1.5, 0], d: 9.6, az: 0, el: 0.02, fov: 26, hand: 0 });        // the 3D drawing has its own camera, so the board's camera holds still under it (hand: 0)
  K.cam.key(CUT2 - 0.001, { st: 'B', l: [0, 1.5, 0], d: 9.6, az: 0, el: 0.02, fov: 26, hand: 0, ease: 'linear' });
  K.cam.key(CUT2, { st: 'S', l: [-0.1, 1.72, -0.6], d: 10.8, az: -0.16, el: 0.08, fov: 26, ap: 0.001 });
  K.cam.key(TIMING.dur, { st: 'S', l: [-0.1, 1.76, -0.6], d: 10.0, az: -0.09, el: 0.08, fov: 26, ap: 0.001, ease: 'linear' });
  V.wipe(CUT1, { seed: 3 }); V.wipe(CUT2, { seed: 5, dur: 0.56 });

  // ---------------------------------------------------------------- sound events (tools/events.py -> sound/events.json -> sound/mix.py). Memes get none.
  K.event(0.05, 'reveal', 'studio, push to the monitor', 1.5); K.event(tHost - 0.1, 'whip', 'whip to the host', 0.5);
  [0, 1, 2, 3].forEach(i => K.event(tFunky + i * 0.11, 'tick', 'tile pops in'));
  K.event(tRoom, 'pop', 'the file drops'); K.event(tBack, 'tick', 'part name'); K.event(tMid, 'tick', 'part name'); K.event(tFront, 'tick', 'part name'); K.event(tOwn, 'hit', 'stamp');

  // ---------------------------------------------------------------- words: every spoken word is on screen at its own time
  V.say('hook', [{ at: [96, 400], align: 'l', size: 70, lines: ['^Bro.'] }, { at: [96, 440], align: 'l', size: 56, lines: ['This is the', '!funky', '^edit.'] }]);
  V.say('host', [{ at: [540, 372], align: 'c', size: 60, lines: ['*Big ^words.'] }, { at: [540, 372], align: 'c', size: 60, lines: ['A +voxel +room.'] }, { at: [540, 372], align: 'c', size: 62, lines: ['What the ^fuck', 'is this?'] }]);
  V.say('board', [{ at: [540, 380], align: 'c', size: 62, lines: ["Alright, let's ~cook."] }, { at: [540, 380], align: 'c', size: 58, lines: ['Every part gets', 'its own !layer.'] }, { at: [540, 380], align: 'c', size: 60, lines: ['#Back. *Middle. +Front.'] }]);
  V.say('close', [{ at: [540, 420], align: 'c', size: 64, lines: ['Now go make', 'your ^own.'] }]);

  // ---------------------------------------------------------------- the monitor: an app BEFORE (empty dashed tiles) and AFTER (they fill in on "funky")
  const COL = ['#5393FF', '#F59E0B', '#EC4899', '#22C55E'], ASK = 'make it funky';
  function paintApp(g, W, H, t) {
    g.fillStyle = '#0d0f14'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#171a22'; V.rrect(g, 36, 34, W - 72, 104, 26); g.fill();                                // the prompt bar
    const typed = ASK.slice(0, Math.round(cl((t - 0.45) / 0.9) * ASK.length));
    g.font = '700 38px Menlo, monospace'; g.textBaseline = 'middle'; g.fillStyle = '#35ecd0'; g.fillText('>', 66, 88);
    g.fillStyle = typed ? '#f4f6fb' : '#5d6373'; g.fillText(typed || 'ask for anything', 108, 88);
    g.font = '600 30px "Geist R", sans-serif'; g.fillStyle = '#8a90a0'; g.fillText('My App', 44, 190); g.fillStyle = '#2a2e39'; g.fillRect(44, 222, W - 88, 3);
    COL.forEach((c, i) => {
      const x = 216 + (i % 2) * 368, y = 440 + Math.floor(i / 2) * 320, p = V.pop(t, tFunky + i * 0.11, 0.36);
      g.fillStyle = p > 0 ? '#191c25' : '#12141a'; V.rrect(g, x - 164, y - 140, 328, 280, 34); g.fill();
      g.lineWidth = 4; g.setLineDash(p > 0 ? [] : [14, 12]); g.strokeStyle = '#2a2e39'; V.rrect(g, x - 164, y - 140, 328, 280, 34); g.stroke(); g.setLineDash([]);
      if (p > 0) { const s = 160 * p; g.fillStyle = c; V.rrect(g, x - s / 2, y - s / 2, s, s, 34 * p); g.fill(); g.fillStyle = 'rgba(255,255,255,.26)'; V.rrect(g, x - s / 2, y - s / 2, s, s * 0.44, 34 * p); g.fill(); }
    });
  }

  // ---------------------------------------------------------------- the 3D drawing: three pieces, back first (units: x right, y up)
  const BLUE = '#5393FF', PIECES = [
    { id: 'back', ring: A.rect(23, 18, 2.2), th: 1.7, tone: A.tone(BLUE), outline: 1 },
    { id: 'mid', ring: A.rect(17, 11, 1), th: 0.6, tone: A.white, ink: '#d3e2ff', lines: [[[-4, 2.4], [4, 2.4]], [[-4, -0.4], [1.5, -0.4]]] },
    { id: 'front', ring: A.rect(23, 15, 2.2, 0, -1.5), th: 1.7, tone: A.tone(BLUE, 'light'), outline: 1 }];

  K.shot({ id: 'demo', t0: 0, t1: 9999, update(t, u) {
    const w = u.w;
    w.screen.paint((g, W, H) => paintApp(g, W, H, t));
    if (w.now === 'S') {
      const c = w.clawd.s; c.happy = t > tFunky ? 1 : 0; c.hop = t > tFunky ? 0.05 * Math.max(0, Math.sin((t - tFunky) * 9)) * Math.exp(-(t - tFunky) * 2.4) : 0;
      const p = w.pimp.s; p.talk = t > tHost && t < CUT1 ? 1 : 0; p.look = 0.3;
      p.armR = t > tWtf && t < CUT1 ? 2.2 * V.pop(t, tWtf, 0.3) + 0.08 * Math.sin(t * 9) : 0;               // an arm goes up on "What the fuck"
      if (t > tRoom && t < CUT1) {                                                                          // a file drops in beside him, with a label pinned to it
        const s = V.pop(t, tRoom, 0.42), drop = cl((t - tRoom) / 0.42); w.doc.s.vis = true;
        w.doc.group.position.set(0.05, lerp(1.0, 0.3, 1 - Math.pow(1 - drop, 3)) + 0.014 * Math.sin(t * 2.1), 0.8); w.doc.group.rotation.set(0, -0.2 + 0.06 * Math.sin(t * 1.3), 0.05); w.doc.group.scale.setScalar(Math.max(0.001, 0.62 * s));
        if (s > 0.5) V.label('doctag', 'SKILL.md', { at: V.px(w.doc.at('c'), 0, 205), cls: 'chip t', o: V.fade(t, tRoom + 0.2), scale: 0.9 + 0.1 * V.pop(t, tRoom + 0.2) });
      }
      if (t > tHost - 0.1 && t < CUT1) V.label('scrim', '', { at: [540, 372], cls: 'scrim', o: 0.85 * V.fade(t, tHost - 0.1, 0.25) });   // a soft dark patch behind the words when the picture behind them is busy
      if (V.MEMES.length) V.meme('wtf', V.MEMES[0], t, tWtf + 0.25, { at: [840, 800], w: 250, rot: 5 });      // a silent sticker on the funny word (tools/memes.py)
      if (t > CUT2) { const s = V.pop(t, tOwn, 0.3); if (s > 0) V.label('stamp', 'FUNKY', { at: [540, 1010], cls: 'stamp', o: Math.min(1, s * 2), scale: 1.5 - 0.5 * Math.min(1, s), rot: -6 }); }
    } else {
      const tilt = io(cl((t - tEvery) / 0.9)), e = io(cl((t - (tBack - 0.4)) / 0.6)), a = V.fade(t, CUT1 + 0.12, 0.25) * (1 - V.fade(t, CUT2 - 0.32, 0.2));
      w.heroGlow.visible = true; w.grid.material.opacity = 1 - tilt;                                        // the drawing brings its own floor once it tilts
      w.clawdB.s.vis = t < tEvery + 0.1; w.clawdB.s.happy = 1; w.clawdB.s.pen = 1; w.clawdB.s.armR = 0.9 + 0.2 * Math.sin(t * 8); w.clawdB.group.scale.setScalar(Math.max(0.001, 1 - io(cl((t - tEvery + 0.2) / 0.28))));
      A.stack({ pieces: PIECES, az: lerp(90, 56, tilt) - 5 * cl((t - tBack) / 3), el: lerp(0, 18, tilt), U: 24, cx: 540 - 50 * e, cy: 1040, e, alpha: a, grid: tilt,
        hot: t > tFront ? 'front' : t > tMid ? 'mid' : t > tBack ? 'back' : null, bump: { back: V.pulse(t, tBack), mid: V.pulse(t, tMid), front: V.pulse(t, tFront) },
        labels: [{ id: 'back', n: '01', name: 'BACK', a: V.fade(t, tBack, 0.25), on: t < tMid, at: [11.4, 6] }, { id: 'mid', n: '02', name: 'MIDDLE', a: V.fade(t, tMid, 0.25), on: t < tFront, at: [8.4, 0] },
          { id: 'front', n: '03', name: 'FRONT', a: V.fade(t, tFront, 0.25), on: true, at: [11.4, -6] }] });
    }
  } });
})();
