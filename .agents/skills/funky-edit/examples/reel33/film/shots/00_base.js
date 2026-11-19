// Runs first on every frame: puts every loose object back to "off", so each beat only says what it shows.
(function () {
  const K = KIT, V = VOX;
  window.PLACES = window.PLACES || [[0, 'S']];                      // [from time, station]; the beats fill it
  K.shot({ id: 'base', t0: 0, t1: 9999, update(t, u) {
    const w = u.w; let place = 'S'; for (const [t0, p] of window.PLACES) if (t >= t0) place = p; w.place(place); w.now = place;
    ANAT.begin(); w.grid.material.opacity = 1;
    V.setBackdrop(0); V.bloom.strength = 0.5; V.bloom.radius = 0.7; V.bloom.threshold = 0.86; K.grainO = 0.22;
    K.key.intensity = 1.15; K.hemi.intensity = 0.34; w.screen.material.color.setScalar(1); w.lamp.intensity = 9; w.rim.intensity = 16; w.scrLight.intensity = 5;
    const off = (m) => { m.visible = false; m.position.set(0, 0, 0); m.rotation.set(0, 0, 0); m.scale.set(1, 1, 1); if (m.material) m.material.opacity = 1; };
    for (const c of w.cards) off(c);
    if (w.gh) w.gh.visible = false;
    for (const m of [...w.family, ...w.wallHeroes, w.badA, w.badB, w.swatch, w.swatchGlow, ...w.chips, w.folder, w.lock]) off(m);
    for (const p in w.slabs) { off(w.slabs[p]); }
    w.hero.position.set(0, w.HY, 0); w.hero.rotation.set(0, 0, 0); w.hero.scale.set(1, 1, 1); w.heroGlow.visible = false; w.heroGlow.material.opacity = 0.22; w.heroGlow.material.color.set('#5393FF'); w.heroGlow.position.set(0, w.HY, -0.6);
    w.skill.s.vis = false; w.skillB.s.vis = false; w.clawdB.s.vis = false; w.clawdW.s.vis = false; w.grid.visible = true; w.hang.forEach(l => { l.visible = false; });
    w.wall.material.opacity = 1; w.wall.position.set(0, w.wallSize[1] / 2, 0);
  } });
})();
