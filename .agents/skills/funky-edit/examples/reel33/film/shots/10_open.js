// claim (0.25) -> proof (6.11) -> promise (13.97): the studio, the skill file, the wall of 2,800, the dive into the folder.
(function () {
  const K = KIT, V = VOX, T = THREE, wt = V.wt, cl = K.clamp, lerp = K.lerp;
  const tProof = wt('proof', 0), tThat = wt('proof', 'That'), tPromise = wt('promise', 0), CUT1 = tThat - 0.2, CUT2 = wt('anchor', 0) - 0.14;
  window.PLACES = [[0, 'S'], [CUT1, 'W'], [CUT2, 'B']];

  // ---------------------------------------------------------------- camera
  K.cam.key(0, { st: 'S', l: [0, 2.5, -1.7], d: 11.5, az: 0.26, el: 0.1, fov: 26, ap: 0.0009 });
  K.cam.key(1.55, { st: 'M', l: [0, 0.33, 0], d: 6.0, az: 0.1, el: 0.03, fov: 26, ap: 0.0012, ease: 'quartOut' });
  K.cam.key(tProof - 0.22, { st: 'M', l: [0, 0.33, 0], d: 5.75, az: 0.03, el: 0.03, fov: 26, ap: 0.0012, ease: 'linear' });
  K.cam.key(tProof + 0.3, { st: 'S', l: [-0.34, 0.86, 0.5], d: 4.7, az: -0.06, el: 0.07, fov: 26, ap: 0.0045, ease: 'expoInOut' });         // whip to the host
  K.cam.key(CUT1 - 0.001, { st: 'S', l: [-0.32, 0.88, 0.5], d: 4.45, az: 0.02, el: 0.07, fov: 26, ap: 0.0045, ease: 'linear' });
  K.cam.key(CUT1, { st: 'W', l: [1.9, 10.4, 0], d: 4.6, az: 0, el: 0, fov: 26, hand: 0.6 });                                                // cut under the pixel wipe
  K.cam.key(wt('proof', 'icons.') + 0.15, { st: 'W', l: [0, 8, 0], d: 33, az: 0, el: 0, fov: 26, hand: 0.6, ease: 'cubicInOut' });         // pull out: the whole wall
  K.cam.key(tPromise, { st: 'W', l: [0, 8, 0], d: 30.5, az: 0, el: 0, fov: 26, hand: 0.6, ease: 'linear' });
  K.cam.key(CUT2 - 0.001, { st: 'W', l: [0, 7.22, 0.6], d: 0.5, az: 0, el: 0, fov: 26, hand: 0.2, dive: true, ease: 'quartIn' });           // dive into the folder
  K.event(0.05, 'reveal', 'studio, push to the monitor', 1.5); K.event(tProof - 0.1, 'whip', 'whip to the host', 0.5); K.event(tPromise + 0.3, 'dive', 'dive into the folder', 1.7);
  V.wipe(CUT1, { seed: 3 }); V.wipe(CUT2, { seed: 5, dur: 0.56 });

  // ---------------------------------------------------------------- words
  V.say('claim', [
    { at: [96, 400], align: 'l', size: 70, lines: ['^Bro.'] },
    { at: [96, 418], align: 'l', size: 54, lines: ['Claude can now', '~draw ^every', '!icon', 'in your app.'] },
    { at: [96, 418], align: 'l', size: 56, lines: ['*Animated.', '+One +style.', 'From #one', '#sentence.'] }]);
  V.say('proof', [
    { at: [540, 372], align: 'c', size: 60, lines: ['A dev', 'called ^Kubai'] },
    { at: [540, 372], align: 'c', size: 58, lines: ['wrote one whole style', 'down in a +skill +file.'] },
    { at: [540, 560], align: 'c', size: 60, count: true, lines: ['That skill has', 'already drawn', 'over !2,800 icons.'] },
    { at: [540, 560], align: 'c', size: 84, lines: ['All +free.'] }]);
  V.say('promise', [
    { at: [540, 560], align: 'c', size: 62, lines: ["Here's how", 'this ~shit ^works,'] },
    { at: [540, 560], align: 'c', size: 64, lines: ['and how', 'you !use it.'] }]);

  // ---------------------------------------------------------------- the monitor: an app that has no icons yet
  const APP = ['folder', 'lock', 'mail', 'calendar', 'bell', 'settings', 'search', 'camera'], NAMES = ['Files', 'Privacy', 'Inbox', 'Events', 'Alerts', 'Settings', 'Search', 'Camera'];
  const tEvery = wt('claim', 'every') - 0.06, tAnim = wt('claim', 'Animated.') - 0.05, tStyle = wt('claim', 'style.') - 0.1, tFrom = wt('claim', 'From'), tBro = wt('claim', 'Bro.');
  APP.forEach((n, i) => K.event(tEvery + i * 0.11, 'tick', 'icon pops in'));
  K.event(tAnim, 'pulse', 'all icons move', 0.8); K.event(tFrom, 'tick', 'typing', 0.9);
  function paintApp(g, W, H, t) {
    g.fillStyle = '#0d0f14'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#171a22'; V.rrect(g, 36, 34, W - 72, 104, 26); g.fill();                                // the prompt bar
    const typed = 'draw icons for my app'.slice(0, Math.round(cl((t - tFrom) / 0.85) * 21));
    g.font = '700 38px Menlo, monospace'; g.textBaseline = 'middle'; g.fillStyle = '#35ecd0'; g.fillText('>', 66, 88);
    g.fillStyle = typed ? '#f4f6fb' : '#5d6373'; g.fillText(typed || 'ask for anything', 108, 88);
    if (typed && typed.length < 21 || (t > tFrom && Math.floor(t * 2.5) % 2 === 0)) { g.fillStyle = '#35ecd0'; g.fillRect(110 + g.measureText(typed).width, 66, 5, 44); }
    g.font = '600 30px "Geist R", sans-serif'; g.fillStyle = '#8a90a0'; g.fillText('My App', 44, 190); g.fillStyle = '#2a2e39'; g.fillRect(44, 222, W - 88, 3);
    APP.forEach((n, i) => {
      const x = 216 + (i % 2) * 368, y = 372 + Math.floor(i / 2) * 226, p = V.pop(t, tEvery + i * 0.11, 0.36), flash = cl(1 - Math.abs(t - tStyle - 0.25) / 0.4);
      g.fillStyle = p > 0 ? '#191c25' : '#12141a'; V.rrect(g, x - 164, y - 100, 328, 200, 34); g.fill();
      g.lineWidth = 4; g.setLineDash(p > 0 ? [] : [14, 12]); g.strokeStyle = flash > 0 && p > 0 ? `rgba(53,236,208,${0.25 + 0.75 * flash})` : '#2a2e39'; V.rrect(g, x - 164, y - 100, 328, 200, 34); g.stroke(); g.setLineDash([]);
      if (p > 0) { V.drawIcon(g, n, V.hover(t, tAnim + i * 0.085, 0.75), x - 76, y, 168 * p); g.globalAlpha = cl(p); g.font = '600 31px "Geist R", sans-serif'; g.fillStyle = '#e9ecf3'; g.fillText(NAMES[i], x + 14, y - 12); g.fillStyle = '#343946'; V.rrect(g, x + 14, y + 20, 104, 12, 6); g.fill(); g.globalAlpha = 1; }
      else { g.fillStyle = '#22252e'; g.beginPath(); g.arc(x - 76, y, 38, 0, 7); g.fill(); V.rrect(g, x + 14, y - 24, 110, 14, 7); g.fill(); V.rrect(g, x + 14, y + 12, 70, 12, 6); g.fill(); }
    });
  }

  // ---------------------------------------------------------------- the real GitHub page as a card (crops of the screenshot)
  const gh = V.screen(0.6, 0.47, 900, 705, { glow: 0.95 }); gh.visible = false; K.w.studio.add(gh); K.w.gh = gh; let ghDone = false;
  function paintGh(g, W, H) {
    const im = V.img.github; g.fillStyle = '#0d1117'; g.fillRect(0, 0, W, H);
    g.drawImage(im, 36, 168, 420, 64, 26, 22, 546, 83);                                                    // kubai087 / kubai-icons
    g.drawImage(im, 56, 368, 430, 72, 26, 126, 520, 87);                                                   // the repo name row
    g.drawImage(im, 2300, 370, 210, 66, 632, 132, 242, 76);                                                // the star button
    g.fillStyle = '#21262d'; g.fillRect(26, 236, W - 52, 3);
    g.drawImage(im, 1946, 580, 540, 360, 26, 262, 848, 565 * 0.75);                                        // the About text
  }

  // ---------------------------------------------------------------- the beats
  const tKubai = wt('proof', 'Kubai'), tWrote = wt('proof', 'wrote'), tFile = wt('proof', 'skill') - 0.08, tNum = wt('proof', '2,800'), tFree = wt('proof', 'free.'), tEveryOne = wt('proof', 'All') - 0.25, tShit = wt('promise', 'shit');
  K.event(tBro, 'meme', 'boom'); K.event(tShit, 'meme', 'teeth'); K.event(tKubai - 0.1, 'land', 'GitHub card lands'); K.event(tFile, 'hit', 'the skill file drops'); K.event(tNum, 'riser', 'count to 2,800', 0.6); K.event(tFree - 0.05, 'hit', 'FREE');
  const HERO_AT = [[0, 7.2, 0.6], [-2.6, 4.9, 1.2], [2.6, 4.6, 1.2], [-1.2, 3.1, 1.2], [1.4, 2.8, 1.2], [-3.0, 7.0, 1.2], [3.0, 6.7, 1.2], [0.1, 13.3, 1.2], [-2.6, 13.0, 1.2], [2.7, 12.7, 1.2], [-3.3, 2.0, 1.1], [3.3, 2.3, 1.1]];
  K.shot({ id: 'open', t0: 0, t1: CUT2, update(t, u) {
    const w = u.w;
    if (t < CUT1) {
      // ---- claim: icons pop into the app, then all of them move
      V.meme('bro', 'cool_dog.jpg', t, tBro - 0.02, { at: [250, 1290], w: 270, rot: -7, dur: 0.95 });
      w.screen.paint((g, W, H) => paintApp(g, W, H, t));
      const c = w.clawd.s, pops = cl((t - tEvery) / 0.9), wave = t > tAnim && t < tAnim + 1.6;
      c.happy = (t > tEvery + 0.2 && t < tEvery + 1.5) || wave ? 1 : 0; c.hop = t > tEvery && pops < 1 ? 0.035 * Math.abs(Math.sin((t - tEvery) * 14)) : 0;
      c.armL = c.armR = wave ? 1.1 + 0.3 * Math.sin(t * 16) : 0;
      // ---- proof, first half: the host, the real repo page, the skill file drops out of it
      w.pimp.group.position.x = -0.62; const p = w.pimp.s; p.talk = t > tProof ? 1 : 0; p.look = t > tKubai ? 0.35 : 0; p.armR = t > tFile ? 2.2 * V.pop(t, tFile, 0.3) + 0.08 * Math.sin(t * 9) : 0; p.hop = t > tFile ? 0.05 * Math.max(0, Math.sin((t - tFile) * 9)) * Math.exp(-(t - tFile) * 2.4) : 0;
      w.screen.material.color.setScalar(1 - 0.93 * cl((t - tProof + 0.05) / 0.25));          // the monitor dims: the host has the stage
      if (t > tProof - 0.3) {
        if (!ghDone) { gh.paint(paintGh); ghDone = true; }
        const a = V.pop(t, tKubai - 0.16, 0.36); gh.visible = a > 0; gh.position.set(-0.12, 1.1 + 0.012 * Math.sin(t * 1.7), 0.6); gh.rotation.set(0, -0.12, 0.02); gh.scale.setScalar(Math.max(0.001, 0.94 * a));
        const s = V.pop(t, tFile, 0.42), drop = cl((t - tFile) / 0.42); w.skill.s.vis = s > 0;
        w.skill.group.position.set(-0.08, lerp(1.0, 0.24, 1 - Math.pow(1 - drop, 3)) + 0.014 * Math.sin(t * 2.1), 0.8); w.skill.group.rotation.set(0, -0.2 + 0.06 * Math.sin(t * 1.3), 0.05); w.skill.group.scale.setScalar(Math.max(0.001, 0.62 * s));
        if (s > 0.5) V.label('skilltag', 'SKILL.md', { at: V.px(w.skill.at('c'), 0, 205), cls: 'chip t', o: V.fade(t, tFile + 0.2), scale: 0.9 + 0.1 * V.pop(t, tFile + 0.2) });
      }
    } else {
      // ---- proof, second half: the wall of the real library, counted
      const pull = cl((t - CUT1) / (wt('proof', 'icons.') + 0.15 - CUT1));
      w.wall.material.opacity = 1; V.bloom.strength = 0.22;
      const tDive = cl((t - tPromise) / (CUT2 - tPromise));
      w.wallHeroes.forEach((m, i) => {
        const at = HERO_AT[i], a = i === 0 ? 1 : V.pop(t, tEveryOne - 0.1 + i * 0.05, 0.3); m.visible = a > 0; m.position.set(at[0], at[1], at[2]);
        m.scale.setScalar(Math.max(0.001, (i === 0 ? lerp(1.5, 2.6, pull) : 2.1) * a)); m.frame(V.hover(t, i === 0 ? tFree - 0.1 : tFree - 0.05 + i * 0.07, 1.0)); if (i > 0) m.material.opacity = 1 - cl(tDive * 3);
      });
      V.meme('doge', 'doge.jpg', t, tShit - 0.03, { at: [800, 1180], w: 230, rot: 8, dur: 1.0 });
      // a dark pool behind the words so they read on the wall
      const so = cl((t - CUT1 - 0.15) / 0.3) * (1 - cl((t - (CUT2 - 0.7)) / 0.3));
      V.label('scrim', '', { at: [540, 560], cls: 'scrim', o: so * 0.94 });
    }
  } });
})();
