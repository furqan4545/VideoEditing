// Thumbnail: comp.html?thumb=1  ->  one still built from the film's own models (no footage of Ali).
// The shopper (full body) walks out between the gates, both lights red, the gate's purple field crossing the gap.
window.thumbScene = function (K) {
  const W = window.WORLD, w = K.w, G = K.stations.G.g, PI = Math.PI;
  K.cam.keys.length = 0; K.shots.length = 0; K.noCaps = true;
  const p = K.make('person', { style: 'jogger', top: 'hoodie' }); G.add(p.group); p.group.position.set(-0.04, 0, 0.16); p.group.rotation.y = 0.12;
  const hand = p.anchors.handR, gripY = (w.bag.size && w.bag.size.gripY) || 0.5;
  // hang the bag from the hand: the top of its handles sits in the fist
  const Y = new THREE.Vector3(0, 1, 0), rotB = PI / 2 + 0.12, grip = K.V((w.bag.anchors && w.bag.anchors.grip) || [0, gripY, 0]).applyAxisAngle(Y, rotB);
  const hw = K.V(hand).applyAxisAngle(Y, p.group.rotation.y).add(p.group.position);
  G.add(w.bag.group); w.bag.group.position.set(hw.x - grip.x, hw.y - grip.y - 0.045, hw.z - grip.z); w.bag.group.rotation.set(0, rotB, 0);
  if (w.bag.rest) { w.bag.rest.p.copy(w.bag.group.position); w.bag.rest.q.copy(w.bag.group.quaternion); }   // the kit restores rest transforms every frame
  K.cam.key(0, { st: 'G', l: [0.02, 1.34, 0], d: 8.5, az: 0.52, el: 0.085, fov: 24, hand: 0 });
  K.shot({ id: 'thumb', t0: 0, t1: 999, update(t, u) {
    for (const a of K.insts) a.s.vis = false;
    for (const a of [w.gA, w.gB, p, w.bag, w.gatefield]) if (a) a.s.vis = true;
    w.gA.s.light = w.gB.s.light = 'red'; w.gA.s.glow = w.gB.s.glow = 1; w.gA.s.coil = 1;
    p.s.walk = 0.80; p.s.carryR = 1; w.bag.s.hang = 1; w.bag.s.swing = 0.05; w.bag.s.ghost = 0;
    w.gatefield.s.amp = 0.72; w.gatefield.s.phase = 3.3; w.gatefield.s.reach = 1;
    K.grainO = 0.55;
  } });
  const st = document.createElement('style');
  st.textContent = '@font-face{font-family:"SF Reel";src:url("fonts/SFNS-latin.ttf") format("truetype");font-weight:1 1000;}@font-face{font-family:"NY Reel";src:url("fonts/NewYorkItalic.ttf") format("truetype");font-weight:400 1000;font-style:italic;}' +
    '#thumbtitle{position:absolute;left:90px;width:900px;top:268px;text-align:center;font:600 92px/104px "SF Reel",-apple-system,sans-serif;letter-spacing:-0.022em;color:#0f1216;}' +
    '#thumbtitle .key{font-family:"NY Reel",ui-serif,serif;font-style:italic;font-weight:600;color:#e11d2e;font-size:1.08em;letter-spacing:0;}';
  document.head.appendChild(st);
  const d = document.createElement('div'); d.id = 'thumbtitle';
  d.innerHTML = 'How do devices<br>at the mart detect<br>whether you <span class="key">paid</span><br>or not?';
  document.getElementById('overlay').appendChild(d);
  K.dur = 2; window.__meta.dur = 2;
  return document.fonts.ready;
};
