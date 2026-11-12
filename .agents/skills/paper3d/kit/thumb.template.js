// Thumbnail: comp.html?thumb=1 -> one still built from the film's own models. Render it with tools/still.py out/thumb.png 0.5 "thumb=1&only=".
// Title in Ali's Apple style: SF 600, one accent word in New York italic. Keep the scene in y 700-1680 and the title in y 260-660
// (Instagram's grid shows the middle 1080 x 1440).
window.thumbScene = function (K) {
  const w = K.w; K.cam.keys.length = 0; K.shots.length = 0; K.noCaps = true;
  K.cam.key(0, { st: 'G', l: [0.02, 1.34, 0], d: 8.5, az: 0.5, el: 0.085, fov: 24, hand: 0 });
  K.shot({ id: 'thumb', t0: 0, t1: 999, update(t, u) {
    for (const a of K.insts) a.s.vis = false;
    for (const a of [w.gA, w.gB, w.man, w.bag]) if (a) a.s.vis = true;
    w.gA.s.light = w.gB.s.light = 'red'; w.gA.s.glow = w.gB.s.glow = 1; w.man.s.walk = 0.8; w.man.s.carryR = 1; w.man.group.position.z = 0.16;
  } });
  const st = document.createElement('style');
  st.textContent = '#thumbtitle{position:absolute;left:90px;width:900px;top:268px;text-align:center;font:600 92px/104px "SF Reel",-apple-system,sans-serif;letter-spacing:-0.022em;color:#0f1216;}' +
    '#thumbtitle .key{font-family:"NY Reel",ui-serif,serif;font-style:italic;font-weight:600;color:#e11d2e;font-size:1.08em;letter-spacing:0;}';
  document.head.appendChild(st);
  const d = document.createElement('div'); d.id = 'thumbtitle'; d.innerHTML = 'Your title<br>with one <span class="key">key</span> word';
  document.getElementById('overlay').appendChild(d); K.dur = 2; window.__meta.dur = 2; return document.fonts.ready;
};
