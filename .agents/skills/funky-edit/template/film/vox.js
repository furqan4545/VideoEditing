// vox.js: the "funky edit" look on top of the paper3d kit (first made for reel 33: a dark voxel room, big moving words,
// pixel-block wipes). Loads after kit.js. Gives window.VOX: the look, voxel meshes, pictures and sprite sheets, screens,
// glows, a backdrop, the kinetic words (DOM overlay), free labels, meme stickers and the pixel-block wipe.
// Everything is a pure function of time.
(function () {
  const K = window.KIT, T = THREE, X = THREEX, OM = window.OM;
  const V = window.VOX = {};
  const C = c => new T.Color(c), lerp = K.lerp, clamp = K.clamp;
  V.pal = { bg: '#090305', wall: '#2a0f10', wood: '#3a1a12', woodD: '#24100c', red: '#e11d2e', redD: '#8f0f1a', redDeep: '#4a070c', cream: '#fff1dc', teal: '#35ecd0', tealD: '#0f6b62',
    orange: '#e8662c', orangeD: '#b8431a', amber: '#ffb347', ink: '#101114', card: '#1c1e25', cardEdge: '#30333d' };

  // ---------------------------------------------------------------- look
  V.setup = function () {
    const sc = K.scene; K.noCaps = true;
    sc.background = C(V.pal.bg); sc.fog.color = C(V.pal.bg);
    K.ground.visible = false; K.shadowCatcher.visible = false;
    K.key.color = C('#ffd9b0'); K.key.intensity = 1.15; K.fill.color = C('#ff5a4a'); K.fill.intensity = 0.22;
    K.hemi.color = C('#ffb59a'); K.hemi.groundColor = C('#2a0508'); K.hemi.intensity = 0.34; sc.environmentIntensity = 0.1;
    const bloom = V.bloom = new X.UnrealBloomPass(new T.Vector2(K.W, K.H), 0.55, 0.7, 0.86);
    K.composer.insertPass(bloom, K.composer.passes.length - 1);
    sc.add(K.camera);
    // backdrop: a soft radial gradient that fills the view behind everything (the flat colour scenes of the reference)
    const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d');
    const gr = g.createRadialGradient(256, 236, 10, 256, 256, 330); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.45, '#9a9a9a'); gr.addColorStop(1, '#161616'); g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
    const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace;
    const bd = V.backdrop = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: tx, color: C(V.pal.red), transparent: true, opacity: 0, depthWrite: false, fog: false }));
    bd.userData.noAO = true; bd.userData.noDepth = true; bd.renderOrder = -10; bd.frustumCulled = false; K.camera.add(bd);
  };
  // call every frame (from the base shot): o = opacity, color = tint
  V.setBackdrop = function (o, color) {
    const bd = V.backdrop, cam = K.camera, dist = cam.far * 0.6, h = 2 * dist * Math.tan(cam.fov * Math.PI / 360) * 1.15;
    bd.visible = o > 0.002; bd.position.set(0, 0, -dist); bd.scale.set(h, h, 1); bd.material.opacity = o; if (color) bd.material.color.set(color);
  };

  // ---------------------------------------------------------------- voxels
  // boxes: [cx, y0, cz, w, h, d, color] (y0 = bottom). One merged mesh with vertex colours.
  const FACES = [[[1, 0, 0], [0, 0, -1], [0, 1, 0]], [[-1, 0, 0], [0, 0, 1], [0, 1, 0]], [[0, 1, 0], [1, 0, 0], [0, 0, -1]], [[0, -1, 0], [1, 0, 0], [0, 0, 1]], [[0, 0, 1], [1, 0, 0], [0, 1, 0]], [[0, 0, -1], [-1, 0, 0], [0, 1, 0]]];
  V.boxes = function (list, { glow = 0, rough = 0.86, cast = true, receive = true } = {}) {
    const P = [], N = [], Cc = [], I = []; const col = new T.Color();
    for (const b of list) {
      const [cx, y0, cz, w, h, d, c] = b, hx = w / 2, hy = h / 2, hz = d / 2, cy = y0 + hy; col.set(c); if (glow) col.multiplyScalar(glow);
      for (const [n, u, v] of FACES) {
        const base = P.length / 3;
        for (const [su, sv] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
          P.push(cx + (n[0] + u[0] * su + v[0] * sv) * hx, cy + (n[1] + u[1] * su + v[1] * sv) * hy, cz + (n[2] + u[2] * su + v[2] * sv) * hz);
          N.push(n[0], n[1], n[2]); Cc.push(col.r, col.g, col.b);
        }
        I.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(Cc, 3)); geo.setIndex(I);
    const mat = glow ? new T.MeshBasicMaterial({ vertexColors: true }) : new T.MeshStandardMaterial({ vertexColors: true, roughness: rough, metalness: 0 });
    const m = new T.Mesh(geo, mat); m.castShadow = cast && !glow; m.receiveShadow = receive && !glow; if (glow) m.userData.noAO = true; return m;
  };
  // a colour nudged lighter / darker by a seeded amount
  V.jit = (c, amt, r) => { const k = new T.Color(c), h = {}; k.getHSL(h); k.setHSL(h.h, h.s, clamp(h.l + (r() - 0.5) * amt, 0, 1)); return '#' + k.getHexString(); };
  // a soft additive glow (lamp halo, neon). Not a solid thing: stays out of the depth passes.
  let glowTex = null;
  V.glow = function (color, size, opacity = 0.6) {
    if (!glowTex) { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.42)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); glowTex = new T.CanvasTexture(cv); }
    const s = new T.Sprite(new T.SpriteMaterial({ map: glowTex, color: C(color), transparent: true, opacity, blending: T.AdditiveBlending, depthWrite: false, fog: false }));
    s.scale.set(size, size, 1); s.userData.noAO = true; s.userData.noDepth = true; return s;
  };

  // ---------------------------------------------------------------- images
  // film/img/manifest.js lists them: window.IMAGES = { id: 'img/web/page.png', ... } (screenshots, logos, the recorded demo's
  // stills) and window.MEMES = ['cool_dog.jpg', ...] (files in img/memes, written by tools/memes.py). A film can also have
  // sprite sheets (4 x 3 frames of one animated icon) listed in window.ICONS (img/ic/manifest.js, see examples/reel33).
  V.img = {}; V.texBase = {}; V.MEMES = window.MEMES || [];
  V.loadImages = function () {
    const M = window.ICONS, IM = window.IMAGES || {}, list = [];
    for (const id in IM) list.push([id, IM[id]]);
    if (M) {
      for (const n in M.heroes || {}) list.push([n, 'img/ic/' + M.heroes[n].file]);
      for (const n in M.big || {}) list.push(['big_' + n, 'img/ic/' + M.big[n].file]);
      for (const c in M.layers || {}) for (const p in M.layers[c].files) list.push([`layer_${c}_${p}`, 'img/ic/' + M.layers[c].files[p]]);
      if (M.wall) list.push(['wall', 'img/ic/' + M.wall.file]);
    }
    for (const m of V.MEMES) list.push(['meme_' + m, 'img/memes/' + m]);
    return Promise.all(list.map(([id, src]) => new Promise(res => { const im = new Image(); im.onload = () => { V.img[id] = im; (im.decode ? im.decode().catch(() => {}) : Promise.resolve()).then(res); }; im.onerror = () => { console.error('image missing ' + src); res(); }; im.src = src; })));
  };
  V.tex = function (id) {
    if (V.texBase[id]) return V.texBase[id];
    const t = new T.Texture(V.img[id]); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.needsUpdate = true; return V.texBase[id] = t;
  };
  // any loaded picture as a flat plane, `h` metres tall (a logo, a screenshot, a still of the recorded demo)
  V.pic = function (id, h = 1, { opacity = 1 } = {}) {
    const im = V.img[id]; if (!im) { console.error('pic: no image "' + id + '" (add it to film/img/manifest.js)'); return new T.Group(); }
    const m = new T.Mesh(new T.PlaneGeometry(h * im.width / im.height, h), new T.MeshBasicMaterial({ map: V.tex(id), transparent: true, opacity, depthWrite: false, fog: false }));
    m.userData.noAO = true; m.userData.noDepth = true; m.renderOrder = 3; return m;
  };
  // the same picture on a 2D canvas (the monitor): fitted into the box x, y, w, h (cover), optional corner radius
  V.drawPic = function (g, id, x, y, w, h, r = 0) {
    const im = V.img[id]; if (!im) return; const k = Math.max(w / im.width, h / im.height), sw = w / k, sh = h / k;
    g.save(); if (r) { V.rrect(g, x, y, w, h, r); g.clip(); } g.drawImage(im, (im.width - sw) / 2, 0, sw, sh, x, y, w, h); g.restore();
  };
  // a screen recording as a card that plays (the real demo, the before and the after). tools/clip.sh REC.mov demo makes the
  // frames (film/footage/demo/0000.jpg ..., 30 fps) and prints this line:   const c = V.clip('demo', 1.6, { n: 240, w: 1280, h: 800 });
  // Add it to a station, hide it in 00_base, and on every frame it is on call c.play(t - tStart) (seconds into the recording).
  V.clip = function (id, h, { n, w, h: ph }) {
    TIMING.footage = TIMING.footage || {}; TIMING.footage[id] = TIMING.footage[id] || { dir: 'footage/' + id, n, f0_reel_t: 0, w, h: ph };
    const f = K.footage(id), g = new T.Group(), ww = h * w / ph;
    const frame = K.mesh(K.geo.rbox(ww + 0.07, h + 0.07, 0.04, 0.05), new T.MeshStandardMaterial({ color: C('#15161a'), roughness: 0.5 }), { cast: true, receive: false }); frame.position.z = -0.026;
    const pic = new T.Mesh(new T.PlaneGeometry(ww, h), new T.MeshBasicMaterial({ map: f.tex, fog: false })); g.add(frame, pic);
    g.play = (sec) => f.want(Math.max(0, sec)); g.size = [ww, h]; return g;
  };
  // ---- sprite sheets: one animated icon as 4 x 3 frames (rest .. hover). The reel 33 example makes them from a real icon library.
  // the icon's eased hover progress, as that library plays it: 460 ms, cubic-bezier(.22, 1, .36, 1)
  const bez = (function (x1, y1, x2, y2) { const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    return x => { if (x <= 0) return 0; if (x >= 1) return 1; let t = x; for (let i = 0; i < 8; i++) { const f = ((ax * t + bx) * t + cx) * t - x, d = (3 * ax * t + 2 * bx) * t + cx; if (Math.abs(d) < 1e-6) break; t -= f / d; } return ((ay * t + by) * t + cy) * t; }; })(0.22, 1, 0.36, 1);
  V.hoverEase = bez;
  // hover(t, t0, hold): 0 -> 1 from t0 over 0.46 s, stays `hold` s, back to 0
  V.hover = (t, t0, hold = 0.9) => t < t0 ? 0 : t < t0 + 0.46 + hold ? bez((t - t0) / 0.46) : 1 - bez((t - t0 - 0.46 - hold) / 0.46);
  // one real icon as a flat picture: mesh.frame(k) with k = 0 (rest) .. 1 (hover)
  V.icon = function (name, h = 1, { big = false, opacity = 1 } = {}) {
    const id = (big ? 'big_' : '') + name, tex = V.tex(id).clone(); tex.repeat.set(1 / 4, 1 / 3); tex.needsUpdate = true;
    const m = new T.Mesh(new T.PlaneGeometry(h, h), new T.MeshBasicMaterial({ map: tex, transparent: true, opacity, depthWrite: false, fog: false }));
    m.userData.noAO = true; m.userData.noDepth = true; m.renderOrder = 3; const Nf = window.ICONS.N;
    m.frame = (k) => { const f = Math.round(clamp(k) * (Nf - 1)), cx = f % 4, cy = Math.floor(f / 4); tex.offset.set(cx / 4, 1 - (cy + 1) / 3); };
    m.frame(0); return m;
  };
  V.drawIcon = function (g, name, k, x, y, size, big = false) {      // on a 2D canvas (the monitor)
    const im = V.img[(big ? 'big_' : '') + name]; if (!im) return; const Nf = window.ICONS.N, f = Math.round(clamp(k) * (Nf - 1)), s = im.width / 4;
    g.drawImage(im, (f % 4) * s, Math.floor(f / 4) * s, s, s, x - size / 2, y - size / 2, size, size);
  };
  // a dark rounded card holding one icon (solid, so depth of field treats it right)
  V.tile = function (name, size = 0.5, { color = V.pal.card } = {}) {
    const g = new T.Group(), body = K.mesh(K.geo.rbox(size, size, size * 0.12, size * 0.2), new T.MeshStandardMaterial({ color: C(color), roughness: 0.55 }), { cast: true, receive: true });
    const ic = V.icon(name, size * 0.86); ic.position.z = size * 0.07; ic.userData.noDepth = false; g.add(body, ic); g.icon = ic; g.frame = k => ic.frame(k); return g;
  };
  // one layer of the folder as a slab with a little thickness (stacked copies, darker behind)
  V.slab = function (h, part) {
    const g = new T.Group(), geo = new T.PlaneGeometry(h, h), mats = [];
    const mk = (z, shade, ro) => { const m = new T.Mesh(geo, new T.MeshBasicMaterial({ transparent: true, depthWrite: false, fog: false, color: new T.Color(shade, shade, shade) })); m.position.z = z; m.renderOrder = ro; m.userData.noAO = true; m.userData.noDepth = true; g.add(m); mats.push(m.material); return m; };
    for (let i = 5; i >= 1; i--) mk(-i * h * 0.006, 0.62, 2);
    const A = mk(0, 1, 3), B = mk(h * 0.001, 1, 4); let cur = null;
    g.set = (colA, colB, k, opacity = 1) => {                           // show colour A, cross-fading to colour B by k
      const ta = V.tex(`layer_${colA}_${part}`), tb = V.tex(`layer_${colB || colA}_${part}`);
      for (let i = 0; i < 5; i++) { mats[i].map = k > 0.5 ? tb : ta; mats[i].opacity = opacity; mats[i].needsUpdate = cur !== colA + colB; }
      A.material.map = ta; A.material.opacity = opacity; B.material.map = tb; B.material.opacity = opacity * clamp(k); B.visible = k > 0.002;
      if (cur !== colA + colB) { A.material.needsUpdate = B.material.needsUpdate = true; cur = colA + colB; }
    };
    return g;
  };
  // a screen (monitor, card) drawn on a 2D canvas each frame: s.paint((g, W, H) => ...)
  V.screen = function (w, h, pw, ph, { glow = 1 } = {}) {
    const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph; const g = cv.getContext('2d');
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex, color: new T.Color(glow, glow, glow), fog: false }));
    m.paint = (fn) => { g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; fn(g, pw, ph); tex.needsUpdate = true; }; m.cv = cv; return m;
  };
  V.rrect = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };

  // ---------------------------------------------------------------- kinetic words (DOM overlay). Every spoken word is on screen at its own time.
  // V.say('claim', [{ at: [x, y], align: 'l' | 'c' | 'r', size, lines: ['plain ^BIG !RED ~accent *bold +teal #boxed', ...], rot, lead }])
  // A token takes the next spoken word of that beat. '|' inside a line makes no word (a spacer). '=text' shows text for the next word.
  const STY = { '^': 'c', '!': 'x', '~': 'i', '*': 'b', '+': 't', '#': 'h', '%': 'o', '@': 'f', '$': 'l' };
  const BLOCKS = [];
  V.say = function (key, blocks) {
    const words = TIMING.words.filter(w => w[3] === key); let wi = 0;
    for (const b of blocks) {
      const el = document.createElement('div'); el.className = 'kt a' + (b.align || 'c'); el.style.fontSize = (b.size || 64) + 'px';
      const ws = [];
      for (const line of b.lines) {
        const le = document.createElement('div'); le.className = 'kl'; el.appendChild(le);
        for (let tok of line.split(/\s+/).filter(Boolean)) {
          const sty = STY[tok[0]] ? STY[tok[0]] : 'r'; if (STY[tok[0]]) tok = tok.slice(1);
          const w = words[wi++]; if (!w) { console.error('say: beat ' + key + ' has no word left for "' + tok + '"'); continue; }
          const sp = document.createElement('span'); sp.className = 'kw s-' + sty; sp.textContent = tok.replace(/_/g, ' '); le.appendChild(sp);
          ws.push({ el: sp, t0: w[1], t1: w[2], sty, last: '', text: sp.textContent, count: /^[\d,]+[.,]?$/.test(tok) && b.count ? parseInt(tok.replace(/\D/g, ''), 10) : 0 });
        }
      }
      if (!ws.length) continue;
      BLOCKS.push({ el, ws, b, key, t0: ws[0].t0 - (b.lead ?? 0.06), t1: null, shown: false }); V.dom.appendChild(el);
    }
    if (wi !== words.length) console.error(`say: beat ${key} uses ${wi} of ${words.length} words: ` + words.slice(wi).map(w => w[0]).join(' '));
  };
  const backOut = x => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); }, cubicOut = x => 1 - Math.pow(1 - x, 3);
  V.typeDone = function () {                                              // each block leaves when the next one starts
    BLOCKS.sort((a, b) => a.t0 - b.t0);
    BLOCKS.forEach((B, i) => { const nx = BLOCKS[i + 1]; const end = B.ws[B.ws.length - 1].t1; B.t1 = B.b.until ?? (nx ? Math.max(end + 0.08, nx.t0 - 0.03) : end + 1.2); if (B.b.hold != null) B.t1 = Math.min(B.t1, end + B.b.hold); });
  };
  function drawType(t) {
    for (const B of BLOCKS) {
      const on = t >= B.t0 && t < B.t1;
      if (!on) { if (B.shown) { B.el.style.display = 'none'; B.shown = false; } continue; }
      if (!B.shown) { B.el.style.display = 'flex'; B.shown = true; }
      const b = B.b, q = clamp((t - (B.t1 - 0.13)) / 0.13), drift = (t - B.t0) * (b.drift ?? 5);
      B.el.style.left = b.at[0] + 'px'; B.el.style.top = b.at[1] + 'px';
      B.el.style.opacity = (1 - q).toFixed(3);
      B.el.style.transform = `translate(${b.align === 'l' ? '0' : b.align === 'r' ? '-100%' : '-50%'}, -50%) translateY(${(-drift - q * 34).toFixed(2)}px) rotate(${b.rot || 0}deg) scale(${(1 - q * 0.05).toFixed(4)})`;
      for (const w of B.ws) {
        const p = clamp((t - w.t0 + 0.05) / 0.2); let s;
        if (p <= 0) s = 'opacity:0';
        else if (w.sty === 'c' || w.sty === 'x') { const e = cubicOut(p); s = `opacity:${Math.min(1, p * 3).toFixed(3)};transform:scale(${(1.55 - 0.55 * backOut(p)).toFixed(4)}) rotate(${((1 - e) * -5).toFixed(2)}deg);filter:blur(${((1 - e) * 7).toFixed(2)}px)`; }
        else if (w.sty === 'i') { const e = cubicOut(p); s = `opacity:${Math.min(1, p * 3).toFixed(3)};transform:translateX(${((1 - e) * -46).toFixed(2)}px) rotate(-5deg) skewX(${((1 - e) * -18).toFixed(2)}deg)`; }
        else if (w.sty === 'h') { const e = cubicOut(p); s = `opacity:1;clip-path:inset(0 ${((1 - e) * 100).toFixed(2)}% 0 0)`; }
        else { const e = backOut(p); s = `opacity:${Math.min(1, p * 2.6).toFixed(3)};transform:translateY(${((1 - cubicOut(p)) * 30).toFixed(2)}px) scale(${(0.72 + 0.28 * e).toFixed(4)})`; }
        if (w.count) { const c = clamp((t - w.t0) / 0.55), n = Math.round(w.count * (1 - Math.pow(1 - c, 3))), tx = c >= 1 ? w.text : n.toLocaleString('en-US'); if (w.el.textContent !== tx) w.el.textContent = tx; }
        if (s !== w.last) { w.el.style.cssText = s; w.last = s; }
      }
    }
  }

  // ---------------------------------------------------------------- free labels (things that are not spoken: counters, chips, tags)
  const LBL = {};
  V.label = function (id, html, { at, cls = '', o = 1, scale = 1, rot = 0, align = 'c' } = {}) {
    let n = LBL[id]; if (!n) { n = LBL[id] = { el: document.createElement('div'), html: null, used: false, last: '' }; V.dom.appendChild(n.el); }
    n.used = true; if (o <= 0.003) { n.used = false; return; }
    if (n.html !== html) { n.el.innerHTML = html; n.html = html; } if (n.cls !== cls) { n.el.className = 'lb ' + cls; n.cls = cls; }
    const s = `display:block;left:${at[0].toFixed(1)}px;top:${at[1].toFixed(1)}px;opacity:${clamp(o).toFixed(3)};transform:translate(${align === 'l' ? '0' : align === 'r' ? '-100%' : '-50%'},-50%) scale(${scale.toFixed(4)}) rotate(${rot}deg)`;
    if (s !== n.last) { n.el.style.cssText = s; n.last = s; }
  };

  // ---------------------------------------------------------------- the pixel-block wipe: squares cover the frame, then leave
  const WIPES = []; let wipeEl = null, cells = [];
  V.wipe = function (t, { dur = 0.62, seed = 1, colors = ['#e11d2e', '#8f0f1a', '#fff1dc', '#0b0406', '#e11d2e', '#3a0a0e'] } = {}) { WIPES.push({ t, dur, seed, colors }); K.event(t - dur * 0.5, 'whip', 'pixel wipe', dur); };
  function drawWipe(t) {
    const W = WIPES.find(w => t >= w.t - w.dur / 2 && t <= w.t + w.dur / 2);
    if (!W) { if (wipeEl.style.display !== 'none') wipeEl.style.display = 'none'; return; }
    wipeEl.style.display = 'grid'; const R = OM.rng(W.seed * 977 + 13), half = W.dur / 2, x = t - W.t;
    for (let i = 0; i < cells.length; i++) {
      const d = R() * 0.62, col = W.colors[Math.floor(R() * W.colors.length)], c = cells[i];
      const a = x < 0 ? clamp(((x + half) / half - d) / 0.38) : clamp((1 - x / half - (1 - d - 0.38) ) / 0.38);
      const s = a <= 0 ? 0 : a >= 1 ? 1.03 : cubicOut(a) * 1.03;
      const st = `background:${col};transform:scale(${s.toFixed(3)})`; if (c._s !== st) { c.style.cssText = st; c._s = st; }
    }
  }

  // times of spoken words: V.wt('claim', 3) = start of the 4th word of that beat; V.wt('claim', 'icon') = start of that word
  V.wt = function (key, q, nth = 0) { const ws = TIMING.words.filter(w => w[3] === key); if (typeof q === 'number') return ws[Math.min(q, ws.length - 1)][1];
    const n = x => x.toLowerCase().replace(/[^a-z0-9]/g, ''), hit = ws.filter(w => n(w[0]) === n(q))[nth]; if (!hit) { console.error('wt: no word ' + q + ' in ' + key); return ws[0][1]; } return hit[1]; };
  V.line = key => TIMING.lines.find(l => l.key === key);
  V.pop = (t, t0, dur = 0.32) => { const p = clamp((t - t0) / dur); return p <= 0 ? 0 : backOut(p); };            // 0 -> 1 with a little overshoot
  V.fade = (t, t0, dur = 0.2) => clamp((t - t0) / dur);
  V.pulse = (t, t0, amt = 0.14, dur = 0.34) => { const p = (t - t0) / dur; return p <= 0 || p >= 1 ? 1 : 1 + amt * Math.sin(p * Math.PI) * (1 - p); };  // a quick bump
  V.px = (v, dx = 0, dy = 0) => { const p = K.project(v); return [p.x + dx, p.y + dy]; };

  // one accent colour -> a whole family of tones (light, dark, shadow): every tone is the accent moved by the same step
  // the blue reference tone sits from #5393FF. V.tint('#2b5cc0', '#22C55E') = that dark blue, as a green.
  V.tint = function (src, accent) { const h = x => [1, 3, 5].map(i => parseInt(x.slice(i, i + 2), 16)), s = h(src), a = h(accent), REF = [83, 147, 255];
    return '#' + [0, 1, 2].map(i => { const amt = i === 2 ? (s[0] - REF[0]) / (255 - REF[0]) : (s[i] - REF[i]) / (255 - REF[i]); const v = amt >= 0 ? a[i] + (255 - a[i]) * amt : a[i] * (1 + amt); return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'); }).join(''); };
  V.mix = (a, b, k) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), K.clamp(k)).getHexString();

  // a meme: a photo sticker that pops in on a funny word, wobbles and drops out. A silent picture: no sound event.
  // V.meme('huh', 'huh_cat.jpg', t, V.wt('anchor', 'fuck') - 0.05, { at: [800, 1180], w: 300, rot: 5 })   (file in img/memes)
  V.meme = function (id, file, t, t0, { at, w = 260, rot = -6, dur = 1.3 } = {}) {
    if (t < t0 || t > t0 + dur + 0.2) return; const a = V.pop(t, t0, 0.28), out = K.clamp((t - (t0 + dur)) / 0.18);
    V.label('meme_' + id, `<img src="img/memes/${file}" style="width:${w}px">`, { at: [at[0], at[1] + 60 * out * out], cls: 'meme', o: 1 - out, scale: (0.4 + 0.6 * a) * (1 - 0.2 * out), rot: +(rot + 7 * Math.sin((t - t0) * 11) * Math.exp(-(t - t0) * 4)).toFixed(2) });
  };

  V.mountDom = function () {
    V.dom = document.createElement('div'); V.dom.id = 'kin'; document.getElementById('overlay').appendChild(V.dom);
    wipeEl = document.createElement('div'); wipeEl.id = 'wipe'; wipeEl.style.display = 'none'; document.getElementById('overlay').appendChild(wipeEl);
    for (let i = 0; i < 9 * 16; i++) { const c = document.createElement('i'); wipeEl.appendChild(c); cells.push(c); }
  };
  V.frame = function (t) {                                                // the base shot calls this last
    for (const id in LBL) { const n = LBL[id]; if (!n.used && n.last !== 'display:none') { n.el.style.cssText = 'display:none'; n.last = 'display:none'; } n.used = false; }
    drawType(t); drawWipe(t);
  };
  V.labelsBegin = function () { for (const id in LBL) LBL[id].used = false; };
})();
