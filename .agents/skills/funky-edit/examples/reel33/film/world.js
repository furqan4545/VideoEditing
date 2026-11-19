// The world of reel 33. S = the voxel studio at night. B = the board: black space with a teal grid floor (the mechanism).
// W = the wall of the real library icons. Metres, Y up. Camera keys read coordinates in a station's frame.
KIT.asset('skillfile', (K, o) => {
  const T = THREE, V = VOX, R = OM.rng(7), g = new T.Group(), L = [], c = 0.062, nx = 10, ny = 13;
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (i + (ny - 1 - j) < 2 && j > ny - 3 && i < 2) continue;                              // the cut corner (top left as seen from behind = top right from the front)
    const top = ny - 1 - j, red = top >= 2 && top <= 3;
    L.push([(i - nx / 2 + 0.5) * c, j * c, 0, c, c, 0.05, red ? V.jit('#c8121f', 0.05, R) : V.jit('#e6d6b8', 0.07, R)]);
  }
  for (const [row, n] of [[7, 7], [9, 6], [11, 4]]) L.push([(-nx / 2 + 1 + n / 2) * c, (ny - 1 - row) * c + c * 0.2, 0.03, n * c, c * 0.55, 0.02, '#3a2a20']);
  const m = V.boxes(L); m.position.y = 0; g.add(m);
  return { group: g, size: { w: nx * c, h: ny * c }, anchors: { c: [0, ny * c / 2, 0], top: [0, ny * c, 0], band: [0, (ny - 3) * c, 0.05] }, defaults: {}, apply() {} };
});
window.buildWorld = function (K) {
  const T = THREE, V = VOX, w = K.w = {}, R = OM.rng(33), C = c => new T.Color(c);
  const put = (parent, inst, pos, rotY) => { if (pos) inst.group.position.set(pos[0], pos[1], pos[2]); if (rotY != null) inst.group.rotation.y = rotY; parent.add(inst.group); return inst; };

  // =============================================================== S: the studio
  const S = K.station('S', [0, 0, 0], 0), L = [], G = [];
  for (let i = -10; i <= 10; i++) L.push([i * 0.5, -0.08, 1, 0.492, 0.08, 10, V.jit('#2a120d', 0.03, R)]);                    // floor planks
  for (let i = -16; i <= 16; i++) L.push([i * 0.32, 0, -2.4, 0.312, 6, 0.14, V.jit('#31100e', 0.028, R)]);                    // back wall slats
  L.push([0, 0, -2.31, 11, 0.2, 0.06, '#190908']);
  // rug: a voxel disc with rings
  for (let i = -18; i <= 18; i++) for (let j = -18; j <= 18; j++) { const r = Math.hypot(i, j); if (r > 18.2) continue;
    const ring = r > 16.4 ? '#7d0c15' : r > 14.6 ? '#c21525' : r > 13.4 ? '#8f0f1a' : (Math.abs(r - 8) < 0.9 ? '#8f0f1a' : r < 3 ? '#8f0f1a' : '#b41322');
    L.push([i * 0.1, 0, 0.85 + j * 0.1, 0.1, 0.025, 0.1, V.jit(ring, 0.03, R)]); }
  // desk
  const DY = 0.83;
  L.push([0, DY - 0.09, -1.6, 2.6, 0.09, 1.02, '#6f3a22'], [0, DY - 0.2, -1.6, 2.5, 0.11, 0.9, '#55291a']);
  for (const [x, z] of [[-1.18, -1.2], [1.18, -1.2], [-1.18, -2], [1.18, -2]]) L.push([x, 0, z, 0.12, DY - 0.2, 0.12, '#4a2416']);
  // monitor: base, neck, frame (the screen itself is a canvas plane)
  L.push([0, DY, -1.86, 0.6, 0.04, 0.32, '#1b1c21'], [0, DY + 0.04, -1.93, 0.1, 0.34, 0.08, '#202127'], [0, DY + 0.3, -1.86, 1.14, 1.64, 0.08, '#15161a']);
  // keyboard
  L.push([0, DY, -1.3, 0.8, 0.03, 0.27, '#15161a']);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 13; c++) { const k = R(); L.push([-0.36 + c * 0.06, DY + 0.03, -1.4 + r * 0.062, 0.048, 0.018, 0.048, k < 0.08 ? '#e11d2e' : k < 0.5 ? '#efe6d6' : '#2a2c33']); }
  // mug, mouse
  L.push([-0.72, DY, -1.3, 0.11, 0.13, 0.11, '#c8121f'], [-0.79, DY + 0.04, -1.3, 0.03, 0.06, 0.035, '#c8121f'], [0.56, DY, -1.28, 0.07, 0.03, 0.11, '#efe6d6']);
  // lamp (the head glows)
  L.push([-1.02, DY, -1.8, 0.24, 0.04, 0.24, '#1b1c21'], [-1.02, DY + 0.04, -1.8, 0.05, 0.5, 0.05, '#1b1c21'], [-1.02, DY + 0.72, -1.8, 0.36, 0.06, 0.36, '#8f0f1a']);
  G.push([-1.02, DY + 0.54, -1.8, 0.3, 0.18, 0.3, '#ffb347'], [-1.02, DY + 0.46, -1.8, 0.2, 0.08, 0.2, '#ffd27a']);
  // shelves and books
  const BOOKS = ['#c8121f', '#35ecd0', '#efe6d6', '#ffb347', '#1f3a8a', '#1f7a4d', '#8f0f1a', '#0f6b62', '#3b2a55', '#d9d3c6'];
  for (const [sy, x0, x1] of [[3.02, -1.5, 1.5], [3.78, -1.5, 1.5], [4.54, -1.5, 1.5]]) {
    L.push([(x0 + x1) / 2, sy, -2.17, x1 - x0 + 0.1, 0.06, 0.32, '#4a2416']);
    let x = x0 + 0.05; while (x < x1 - 0.1) { const bw = 0.05 + R() * 0.06, bh = 0.2 + R() * 0.2; if (R() < 0.84) L.push([x + bw / 2, sy + 0.06, -2.17, bw, bh, 0.22, V.jit(BOOKS[Math.floor(R() * BOOKS.length)], 0.05, R)]); else if (R() < 0.6) G.push([x + 0.04, sy + 0.06, -2.1, 0.07, 0.07, 0.07, '#ffd9a0']); x += bw + 0.012 + (R() < 0.12 ? 0.16 : 0); }
  }
  // frames on the wall
  for (const [x, y, s, col] of [[-1.95, 1.9, 0.5, '#35ecd0'], [1.95, 2.05, 0.56, '#ffb347'], [-2.0, 3.1, 0.42, '#c8121f'], [2.02, 3.2, 0.44, '#efe6d6'], [-2.05, 4.1, 0.5, '#ffb347'], [1.98, 4.2, 0.46, '#35ecd0']])
    L.push([x, y, -2.3, s, s * 1.15, 0.06, col], [x, y + 0.06, -2.27, s - 0.12, s * 1.15 - 0.12, 0.04, '#170708']);
  // plant
  L.push([1.62, 0, -1.25, 0.36, 0.3, 0.36, '#b4532a'], [1.62, 0.3, -1.25, 0.4, 0.05, 0.4, '#c9652f']);
  for (let i = 0; i < 46; i++) { const a = R() * 6.28, rr = R() * 0.26, y = 0.36 + R() * 0.85; L.push([1.62 + Math.cos(a) * rr * (1.3 - y * 0.5), y, -1.25 + Math.sin(a) * rr * (1.3 - y * 0.5), 0.1, 0.1, 0.1, V.jit('#2f8a3a', 0.12, R)]); }
  S.add(V.boxes(L)); S.add(V.boxes(G, { glow: 1.9 }));
  const lampGlow = V.glow('#ff9a3c', 1.5, 0.5); lampGlow.position.set(-1.02, DY + 0.55, -1.7); S.add(lampGlow);
  const lamp = w.lamp = new T.PointLight(0xffa24a, 9, 7, 1.6); lamp.position.set(-0.95, DY + 0.5, -1.45); S.add(lamp);
  const rim = w.rim = new T.PointLight(0xff2b3d, 16, 9, 1.5); rim.position.set(2.6, 2.6, 1.6); S.add(rim);
  const scr = w.scrLight = new T.PointLight(0xbfd8ff, 5, 4, 1.6); scr.position.set(0, DY + 0.8, -1.2); S.add(scr);
  // the monitor stands upright (a portrait frame wants a portrait screen): 1.0 x 1.5 m, 800 x 1200 px
  w.screen = V.screen(1.0, 1.5, 800, 1200, { glow: 1.0 }); w.screen.position.set(0, DY + 0.3 + 0.82, -1.815); S.add(w.screen);
  K.station('M', [0, DY + 1.12, -1.815], 0);                                   // the screen's own frame (its centre)
  w.clawd = put(S, K.make('clawd'), [0.35, DY + 1.94, -1.84], -0.12);                // it sits on top of the monitor
  w.pimp = put(S, K.make('pimp'), [-0.78, 0.025, 0.45], 0.3);
  w.skill = put(S, K.make('skillfile'), [0, 1.2, 0.3], 0);
  // floating cards for the studio beats (dark cards with a real icon each)
  w.cards = ['folder', 'lock', 'mail', 'calendar', 'bell', 'settings'].map(n => { const t = V.tile(n, 0.42); t.visible = false; S.add(t); t.nameId = n; return t; });
  w.studio = S;

  // =============================================================== B: the board (black space, teal grid floor)
  const B = K.station('B', [400, 0, 0], 0);
  { const cv = document.createElement('canvas'); cv.width = cv.height = 256; const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#35ecd0'; g.lineWidth = 3; g.strokeRect(0, 0, 256, 256);
    const tx = new T.CanvasTexture(cv); tx.wrapS = tx.wrapT = T.RepeatWrapping; tx.repeat.set(300, 300); tx.anisotropy = 8; tx.colorSpace = T.SRGBColorSpace;
    const fl = w.grid = new T.Mesh(new T.PlaneGeometry(300, 300), new T.MeshBasicMaterial({ map: tx, color: C('#2f7d72'), transparent: true, blending: T.AdditiveBlending, depthWrite: false })); fl.userData.noDepth = true; fl.renderOrder = -6; fl.rotation.x = -Math.PI / 2; fl.userData.noAO = true; B.add(fl); }
  const HY = 1.75, HS = 2.3;                                                      // the hero icon: centre height, size
  w.hero = new T.Group(); w.hero.position.set(0, HY, 0); B.add(w.hero);
  w.slabs = {}; for (const p of ['back', 'backO', 'file', 'front', 'frontO']) { w.slabs[p] = V.slab(HS, p); w.hero.add(w.slabs[p]); }
  w.folder = V.icon('folder', HS, { big: true }); w.folder.position.set(0, HY, 0.02); B.add(w.folder);
  w.lock = V.icon('lock', HS, { big: true }); w.lock.position.set(0, HY, 0.02); B.add(w.lock);
  w.family = ['mail', 'calendar', 'settings', 'bell', 'search', 'camera', 'bookmark', 'clock'].map(n => { const m = V.icon(n, 0.86); m.visible = false; m.nameId = n; B.add(m); return m; });
  // two icons that do NOT match (the anchor beat): drawn here, on purpose in two other styles
  const bad = (paint) => { const cv = document.createElement('canvas'); cv.width = cv.height = 512; paint(cv.getContext('2d')); const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace;
    const m = new T.Mesh(new T.PlaneGeometry(1.5, 1.5), new T.MeshBasicMaterial({ map: tx, transparent: true, depthWrite: false, fog: false })); m.userData.noAO = true; m.userData.noDepth = true; m.visible = false; B.add(m); return m; };
  w.badA = bad(g => { g.strokeStyle = '#aeb4c0'; g.lineWidth = 9; g.lineJoin = 'miter'; g.beginPath(); g.moveTo(96, 150); g.lineTo(210, 150); g.lineTo(250, 196); g.lineTo(416, 196); g.lineTo(416, 380); g.lineTo(96, 380); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(96, 236); g.lineTo(416, 236); g.stroke(); });
  w.badB = bad(g => { const gr = g.createLinearGradient(0, 120, 0, 420); gr.addColorStop(0, '#ffe45c'); gr.addColorStop(1, '#ff8a00'); g.fillStyle = '#b05a00'; g.beginPath(); g.roundRect(70, 150, 380, 270, 60); g.fill();
    g.fillStyle = gr; g.beginPath(); g.roundRect(60, 120, 380, 270, 64); g.fill(); g.fillStyle = '#ffb000'; g.beginPath(); g.roundRect(60, 86, 190, 110, 44); g.fill();
    g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.ellipse(170, 180, 80, 26, -0.2, 0, 7); g.fill(); g.fillStyle = '#5a2a00'; g.beginPath(); g.arc(200, 280, 20, 0, 7); g.arc(300, 280, 20, 0, 7); g.fill(); g.lineWidth = 12; g.strokeStyle = '#5a2a00'; g.lineCap = 'round'; g.beginPath(); g.arc(250, 300, 52, 0.35, 2.8); g.stroke(); });
  // the one colour: a glowing voxel block
  w.swatch = new T.Mesh(new T.BoxGeometry(0.46, 0.46, 0.46), new T.MeshBasicMaterial({ color: C('#5393FF') })); w.swatch.visible = false; w.swatch.userData.noAO = true; B.add(w.swatch);
  w.swatchGlow = V.glow('#5393FF', 2.2, 0.55); w.swatchGlow.visible = false; B.add(w.swatchGlow);
  w.chips = [0, 1, 2].map(() => { const m = new T.Mesh(new T.BoxGeometry(0.24, 0.24, 0.06), new T.MeshBasicMaterial({ color: C('#fff') })); m.visible = false; m.userData.noAO = true; B.add(m); return m; });
  w.skillB = put(B, K.make('skillfile'), [0, 3.2, 0], 0);
  w.clawdB = put(B, K.make('clawd'), [1.25, 0, 0.9], -0.5);
  w.hang = [K.line([[0, 3.62, 0], [-0.62, 3.05, 0]], { color: '#35ecd0', width: 4, opacity: 0.9 }), K.line([[0, 3.62, 0], [0.62, 3.05, 0]], { color: '#35ecd0', width: 4, opacity: 0.9 })]; w.hang.forEach(l => { l.visible = false; B.add(l); });
  w.heroGlow = V.glow('#5393FF', 5.5, 0.22); w.heroGlow.position.set(0, HY, -0.6); B.add(w.heroGlow);
  w.board = B; w.HY = HY; w.HS = HS;

  // =============================================================== W: the wall of the real library icons
  const Wl = K.station('W', [800, 0, 0], 0), M = window.ICONS.wall, ww = 12, wh = ww * (M.rows / M.cols);
  w.wall = new T.Mesh(new T.PlaneGeometry(ww, wh), new T.MeshBasicMaterial({ map: V.tex('wall'), transparent: true, depthWrite: false, fog: false })); w.wall.position.set(0, wh / 2, 0); w.wall.userData.noAO = true; w.wall.userData.noDepth = true; Wl.add(w.wall);
  w.wallSize = [ww, wh];
  w.clawdW = put(Wl, K.make('clawd'), [0, 0, 1], 0);
  w.wallHeroes = ['folder', 'lock', 'mail', 'calendar', 'bell', 'camera', 'rocket', 'gift', 'music', 'heart', 'star', 'home'].map((n, i) => { const m = V.icon(n, 1.15); m.nameId = n; m.visible = false; Wl.add(m); return m; });

  // which place exists when (set by the shots): B and W are far away and unlit, hiding them is only for speed
  w.place = (name) => { S.visible = name === 'S'; B.visible = name === 'B'; Wl.visible = name === 'W'; };
};
