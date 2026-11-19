// Thumbnail: comp.html?thumb=1 -> one still built from the film's own world, with the big title.
//   ~/.local/share/onetake/.venv/bin/python tools/still.py out/thumbnail.png 0.5 "thumb=1"
// Small line (Geist) / big cream word (Impact) / small line / big red word, tilted. Keep the title in y 260-760 and the
// subject in y 800-1680: Instagram's grid shows the middle 1080 x 1440. (examples/reel33/thumb is a thumbnail drawn with the
// 3D kit instead: real icon shapes as 3D objects.)
window.thumbScene = function (K) {
  const w = K.w, V = VOX; K.cam.keys.length = 0; K.shots.length = 0; K.noCaps = true;
  const TITLE = ['Now your', 'CLAUDE', 'can make', 'VIDEOS'];             // small, BIG, small, BIG RED
  K.cam.key(0, { st: 'S', l: [-0.2, 1.05, 0.2], d: 6.4, az: -0.16, el: 0.07, fov: 26, ap: 0.002, hand: 0 });
  K.shot({ id: 'thumb', t0: 0, t1: 999, update(t, u) {
    w.place('S'); ANAT.begin(); V.setBackdrop(0); w.doc.s.vis = false; w.docB.s.vis = false; w.clawdB.s.vis = false;
    w.screen.paint((g, W, H) => { g.fillStyle = '#0d0f14'; g.fillRect(0, 0, W, H); ['#5393FF', '#F59E0B', '#EC4899', '#22C55E'].forEach((c, i) => { const x = 216 + (i % 2) * 368, y = 380 + Math.floor(i / 2) * 420; g.fillStyle = c; V.rrect(g, x - 130, y - 130, 260, 260, 56); g.fill(); g.fillStyle = 'rgba(255,255,255,.26)'; V.rrect(g, x - 130, y - 130, 260, 114, 56); g.fill(); }); });
    w.pimp.s.armR = 2.3; w.pimp.s.look = 0.3; w.pimp.s.bob = 0; w.clawd.s.happy = 1; w.clawd.s.bob = 0;
    VOX.frame(0); ANAT.end();
  } });
  const st = document.createElement('style');
  st.textContent = '#thumbtitle{position:absolute;left:0;top:250px;width:1080px;display:flex;flex-direction:column;align-items:center;font-family:"Geist R",sans-serif;color:#fff;line-height:1;text-shadow:0 6px 30px rgba(0,0,0,.7);z-index:9}' +
    '#thumbtitle .s{font-weight:600;font-size:72px;letter-spacing:-0.02em}#thumbtitle .c{font-family:"Impact R",Impact,sans-serif;font-size:204px;color:#fff1dc;letter-spacing:.005em;margin:0 0 4px}' +
    '#thumbtitle .r{font-family:"Impact R",Impact,sans-serif;font-size:236px;color:#ff2338;letter-spacing:.01em;margin-top:2px;text-shadow:0 0 60px rgba(255,35,56,.55),0 8px 30px rgba(0,0,0,.6);transform:rotate(-3deg)}' +
    '#thumbscrim{position:absolute;left:0;top:0;width:1080px;height:1000px;background:linear-gradient(180deg,rgba(9,3,5,.92) 0%,rgba(9,3,5,.78) 62%,rgba(9,3,5,0) 100%);z-index:8}';
  document.head.appendChild(st);
  const sc = document.createElement('div'); sc.id = 'thumbscrim'; const d = document.createElement('div'); d.id = 'thumbtitle';
  d.innerHTML = `<div class="s">${TITLE[0]}</div><div class="c">${TITLE[1]}</div><div class="s">${TITLE[2]}</div><div class="r">${TITLE[3]}</div>`;
  const ov = document.getElementById('overlay'); ov.appendChild(sc); ov.appendChild(d); K.dur = 2; window.__meta.dur = 2; return document.fonts.ready;
};
