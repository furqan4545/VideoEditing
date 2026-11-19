// anat.js: "it is built like this" as a 3D drawing, made with the anatomy kit (window.ISO = iso-kit, window.LATHE = lathe;
// MIT, Ryan). A thing is a stack of thick standing pieces seen by an isometric camera whose angle is a parameter, so the
// film can swing round it, pull the pieces apart, draw a fat outline on, repaint a piece and name each one.
// ANAT.stack({...}) rebuilds one SVG in the overlay every frame. Pure: same input, same picture.
// A bigger, special case (a folder that also opens on a hinge, with a colour block that splits into three tones) is in
// the skill's examples/reel33/film/anat.js.
(function () {
  const k = window.ISO, L = window.LATHE, V = window.VOX, W = 1080, H = 1920;
  const A = window.ANAT = {};
  // a polygon with rounded corners. Points in drawing units, x right, y UP, centred on [0, 0], listed CLOCKWISE (top left first).
  A.rounded = function (pts, radii, steps = 7) {
    const n = pts.length, o = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n], r = Array.isArray(radii) ? radii[i] : radii;
      const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]), ra = Math.min(r, la / 2), rb = Math.min(r, lb / 2);
      if (r <= 0.01) { o.push(p); continue; }
      const p0 = [p[0] + (a[0] - p[0]) / la * ra, p[1] + (a[1] - p[1]) / la * ra], p1 = [p[0] + (b[0] - p[0]) / lb * rb, p[1] + (b[1] - p[1]) / lb * rb];
      for (let s = 0; s <= steps; s++) { const t = s / steps, m = 1 - t; o.push([m * m * p0[0] + 2 * m * t * p[0] + t * t * p1[0], m * m * p0[1] + 2 * m * t * p[1] + t * t * p1[1]]); }
    }
    return o;
  };
  A.rect = (w, h, r = 1.6, cx = 0, cy = 0) => A.rounded([[cx - w / 2, cy + h / 2], [cx + w / 2, cy + h / 2], [cx + w / 2, cy - h / 2], [cx - w / 2, cy - h / 2]], r);
  A.circle = (r, cx = 0, cy = 0, n = 44) => Array.from({ length: n }, (_, i) => [cx + r * Math.sin(i / n * 6.2832), cy + r * Math.cos(i / n * 6.2832)]);

  // tones of one piece: cap = the face (top and bottom of its gradient), line = its outline, s = four side shades + the lit top edge.
  // A.tone('#22C55E') = a green piece; 'light' = the paler tone of the same colour (a front piece over a back piece).
  const REF = { dark: { cap: ['#93bbff', '#7faeff'], line: '#5393ff', s: ['#2b5cc0', '#3569d2', '#4279e3', '#5289f0', '#b4cfff'] },
    light: { cap: ['#ccdfff', '#adcbff'], line: '#5393ff', s: ['#4f83e0', '#6193ec', '#74a2f4', '#89b2fa', '#eaf2ff'] } };
  A.white = { cap: ['#ffffff', '#f3f6fc'], line: '#c9d4e8', s: ['#aebbd2', '#bec9dd', '#cdd6e7', '#dbe2ef', '#ffffff'] };
  A.ink = { cap: ['#2a2d37', '#1c1e25'], line: '#4a4f5e', s: ['#0c0d11', '#121318', '#181a20', '#1f2129', '#565b6b'] };
  A.tone = (accent, kind = 'dark') => { const t = h => V.tint(h, accent), r = REF[kind] || REF.dark; return { cap: r.cap.map(t), line: t(r.line), s: r.s.map(t) }; };
  A.mixTone = (a, b, m) => m <= 0 ? a : m >= 1 ? b : { cap: a.cap.map((c, i) => V.mix(c, b.cap[i], m)), line: V.mix(a.line, b.line, m), s: a.s.map((c, i) => V.mix(c, b.s[i], m)) };

  const pt = (F, s, [x, y]) => [F.o[0] + F.a[0] * s + F.u[0] * x + F.v[0] * y, F.o[1] + F.a[1] * s + F.u[1] * x + F.v[1] * y, F.o[2] + F.a[2] * s + F.u[2] * x + F.v[2] * y];
  let box = null, last = '', used = false;
  A.mount = () => { box = document.createElement('div'); box.id = 'anat'; const ov = document.getElementById('overlay'); ov.insertBefore(box, document.getElementById('kin')); };
  A.begin = () => { used = false; };                                   // the base shot calls this first on every frame
  A.end = () => { if (!used && last) { box.innerHTML = ''; last = ''; } };   // the post shot calls this last: no beat drew it -> clear it

  // A.stack({
  //   pieces: [{ id, ring, th, tone, outline, lines }],   back piece first. ring = points (A.rect / A.rounded / A.circle), th = thickness,
  //                                                       outline = 0..1 how much of a FAT outline is drawn round it (leave out for a thin one),
  //                                                       lines = [[[x0, y0], [x1, y1]], ...] short strokes on the face (a line of text, a slot)
  //   az, el      camera angle in degrees: az 90 + el 0 = flat from the front; az 55 + el 18 = a three-quarter view
  //   U           size: screen px per drawing unit. cx, cy = where the middle of the stack sits on screen
  //   e           0..1 how far the pieces are pulled apart (lift = how many units at e = 1)
  //   alpha       whole drawing's opacity. grid = 0..1 a teal floor grid with a soft shadow
  //   hot         id of the piece being talked about (the others dim). bump = { id: scale } a quick size bump of one piece
  //   labels      [{ id, n: '01', name: 'BACK PIECE', a: 0..1, on: true, at: [x, y] on that piece's face }]  -> a leader line to the right + the name
  // })  -> { point(id, [x, y]) = that spot of a piece's face on screen, for pinning a VOX.label to it }
  A.stack = function (o) {
    const PC = o.pieces, az = o.az ?? 90, el = o.el ?? 0, U = o.U ?? 24, e = o.e ?? 0, alpha = o.alpha ?? 1, gap = o.gap ?? 0.14, lift = o.lift ?? 5.4, cx = o.cx ?? 540, cy = o.cy ?? 1010;
    let s = 0; const base = PC.map(p => { const b = s; s += p.th + gap; return b; }), total = s - gap, mid = (PC.length - 1) / 2, s0 = PC.map((p, i) => base[i] + (i - mid) * e * lift);
    const P0 = { origin: [0, 0], scale: U / Math.sqrt(1.6), azimuth: az, elevation: el }, c0 = k.iso([0, total / 2, 0], P0), P = { ...P0, origin: [cx - c0[0], cy - c0[1]] };
    const F = { o: [0, 0, 0], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] }, fat = o.fat || 0;
    let lo = 1e9, x0 = 1e9, x1 = -1e9; for (const p of PC) for (const q of p.ring) { lo = Math.min(lo, q[1]); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); }
    const FLOOR = o.floor ?? lo - 1.1;
    const piece = (p, i) => {
      const tn = p.tone || A.white, g0 = s0[i], g1 = g0 + p.th, pr = L.prismOf(F, p.ring, g0, g1, P), cap = k.pathOf(p.ring.map(q => k.iso(pt(F, g1, q), P)), true);
      const dim = o.hot && o.hot !== p.id ? 0.45 : 1, bs = (o.bump && o.bump[p.id]) || 1;
      const sides = pr.shades.map((d, j) => d ? `<path d="${d}" fill="${tn.s[j]}" stroke="${tn.s[j]}" stroke-width=".6"/>` : '').join('') + (pr.top ? `<path d="${pr.top}" fill="${tn.s[4]}" stroke="${tn.s[4]}" stroke-width=".6"/>` : '');
      let face;
      if (p.outline == null) face = `<path d="${cap}" fill="url(#cap-${i})" stroke="${tn.line}" stroke-width="1.6" stroke-linejoin="round"/>`;
      else face = `<path d="${cap}" fill="url(#cap-${i})" stroke="${tn.cap[1]}" stroke-width="1.2" stroke-linejoin="round"/>` +
        (p.outline > 0.002 ? `<path d="${cap}" fill="none" stroke="${tn.line}" stroke-width="${(U * 0.19 + fat).toFixed(2)}" stroke-linejoin="round" stroke-linecap="round" pathLength="1" stroke-dasharray="${Math.min(1, p.outline).toFixed(4)} 2"/>` : '');
      const marks = (p.lines || []).map(ln => `<path d="${k.pathOf(ln.map(q => k.iso(pt(F, g1, q), P)))}" fill="none" stroke="${p.ink || tn.s[3]}" stroke-width="${(U / 3).toFixed(1)}" stroke-linecap="round"/>`).join('');
      const tf = bs !== 1 ? ` transform-origin="${cx} ${cy}" transform="scale(${bs.toFixed(4)})"` : '';
      return `<g opacity="${dim}"${tf}>${sides}${face}${marks}</g>`;
    };
    let floor = ''; const gr = o.grid ?? 0;
    if (gr > 0.01) { const g = []; for (let i = -7; i <= 7; i++) g.push(k.segment([i * 6, -40, FLOOR], [i * 6, 44, FLOOR], P), k.segment([-42, i * 6 + 2, FLOOR], [42, i * 6 + 2, FLOOR], P));
      const sh = k.pathOf([[x0 - 0.5, s0[0] - 1], [x1 + 0.5, s0[0] - 1], [x1 + 0.5, s0[PC.length - 1] + PC[PC.length - 1].th + 1], [x0 - 0.5, s0[PC.length - 1] + PC[PC.length - 1].th + 1]].map(q => k.iso([q[0], q[1], FLOOR], P)), true);
      floor = `<path d="${g.join('')}" fill="none" stroke="#35ecd0" stroke-width="1.6" opacity="${(0.2 * gr).toFixed(3)}"/><path d="${sh}" fill="${(PC[0].tone || A.white).s[1]}" opacity="${(0.55 * gr * alpha).toFixed(3)}" style="filter:blur(22px)"/>`; }
    const idx = id => PC.findIndex(p => p.id === id), point = (id, q) => { const i = idx(id); return k.iso(pt(F, s0[i] + PC[i].th, q), P); };
    const labels = (o.labels || []).map(l => { if (l.a <= 0.003 || idx(l.id) < 0) return '';
      const p = point(l.id, l.at || [x1 - 0.1, 0]), lx = o.labelX ?? 866;
      return `<g opacity="${l.a.toFixed(3)}"><path d="M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${(lx - 16).toFixed(1)} ${p[1].toFixed(1)}" stroke="#35ecd0" stroke-width="2.6" fill="none" stroke-dasharray="${(420 * l.a).toFixed(0)} 600"/><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="7" fill="#35ecd0"/>
        <text x="${lx}" y="${(p[1] - 22).toFixed(1)}" class="tagn">${l.n || ''}</text><text x="${lx}" y="${(p[1] + 14).toFixed(1)}" class="atag${l.on ? ' on' : ''}">${l.name}</text></g>`; }).join('');
    const defs = '<defs>' + PC.map((p, i) => { const tn = p.tone || A.white; return `<linearGradient id="cap-${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tn.cap[0]}"/><stop offset="1" stop-color="${tn.cap[1]}"/></linearGradient>`; }).join('') + '</defs>';
    const html = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}${floor}<g opacity="${alpha.toFixed(3)}">${PC.map(piece).join('')}</g>${labels}</svg>`;
    used = true; if (last !== html) { box.innerHTML = html; last = html; }
    return { point };
  };
})();
