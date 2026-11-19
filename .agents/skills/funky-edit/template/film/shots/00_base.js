// Runs first on every frame: puts every loose object back to "off", so each beat only says what it shows.
// Add every new loose thing of your world here (hidden, at rest), or it will stay on screen after its beat.
(function () {
  const K = KIT, V = VOX;
  window.PLACES = window.PLACES || [[0, 'S']];                      // [from time, station]; the beats fill it
  K.shot({ id: 'base', t0: 0, t1: 9999, update(t, u) {
    const w = u.w; let place = 'S'; for (const [t0, p] of window.PLACES) if (t >= t0) place = p; w.place(place); w.now = place;
    ANAT.begin(); w.grid.material.opacity = 1; w.grid.visible = true;
    V.setBackdrop(0); V.bloom.strength = 0.5; V.bloom.radius = 0.7; V.bloom.threshold = 0.86; K.grainO = 0.22;
    K.key.intensity = 1.15; K.hemi.intensity = 0.34; w.screen.material.color.setScalar(1); w.lamp.intensity = 9; w.rim.intensity = 16; w.scrLight.intensity = 5;
    w.heroGlow.visible = false; w.heroGlow.material.opacity = 0.22; w.heroGlow.material.color.set('#5393FF'); w.heroGlow.position.set(0, w.HY, -0.6);
    w.doc.s.vis = false; w.docB.s.vis = false; w.clawdB.s.vis = false;
  } });
})();
