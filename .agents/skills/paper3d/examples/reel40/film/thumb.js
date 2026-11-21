// Thumbnail (reel 40 v3): the wrist cut open under the watch, the green light pouring in, the vessels full of blood;
// title in SF, one accent word in green. Render: tools/still.py look/thumb_v3.png 0.5 "thumb=1&only="
window.thumbScene = function (K) {
  const w = K.w, T = THREE, TOP = w.TOP, ZW = w.ZW;
  K.cam.keys.length = 0; K.shots.length = 0; K.noCaps = true;
  K.cam.key(0, { st: 'P', l: [0.004, TOP - 0.0012, ZW + 0.002], d: 0.122, az: Math.PI / 2 - 0.55, el: 0.42, fov: 26, hand: 0 });
  K.shot({ id: 'thumb', t0: 0, t1: 999, update(t, u) {
    for (const a of K.insts) a.s.vis = false;
    if (w.hand) Object.assign(w.hand.s, { vis: true, cut: 1, laser: 0, light: 1, beat: 0.6 });
    if (w.hw) Object.assign(w.hw.s, { vis: true, screen: 'bpm', bpm: 155, on: 1, led: 1, flash: 1, glow: 1.0, pd: 0.6 });
    K.bloomS = 0.6;
  } });
  const s = document.createElement('style');
  s.textContent = '#thumbtitle{position:absolute;left:70px;width:940px;top:120px;text-align:center;font:650 96px/108px "SF Reel",-apple-system,sans-serif;letter-spacing:-0.022em;color:#111317;text-shadow:0 0 4px rgba(255,255,255,0.95),0 2px 22px rgba(255,255,255,0.95);}' +
    '#thumbtitle .key{font-family:"NY Reel",ui-serif,serif;font-style:italic;font-weight:600;color:#0fae46;font-size:1.1em;letter-spacing:0;}';
  document.head.appendChild(s);
  const d = document.createElement('div'); d.id = 'thumbtitle';
  d.innerHTML = 'Your Apple Watch<br><span class="key">watches</span> your blood';
  document.getElementById('overlay').appendChild(d);
  K.dur = 2; window.__meta.dur = 2;
  return document.fonts.ready;
};
