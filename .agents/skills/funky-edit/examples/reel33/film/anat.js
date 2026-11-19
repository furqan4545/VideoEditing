// anat.js: the folder as a 3D drawing, made with the anatomy kit (window.ISO = iso-kit, window.LATHE = lathe; MIT, Ryan).
// Three thick standing pieces (back, white sheet, front) seen by an isometric camera whose angle is a parameter, so the
// film can swing round it, pull the pieces apart, draw the outline on, repaint it and open it on its hinge.
// ANAT.draw({...}) rebuilds one SVG in the overlay. Pure: same input, same picture.
(function () {
  const k = window.ISO, L = window.LATHE, V = window.VOX, W = 1080, H = 1920;
  const A = window.ANAT = {};
  const C = ([x, y]) => [x - 15.5, 12.5 - y];                        // icon units, centred, v up
  function rounded(pts, radii, steps = 7) {
    const n = pts.length, o = [];
    for (let i = 0; i < n; i++) {
      const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n], r = Array.isArray(radii) ? radii[i] : radii;
      const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]), ra = Math.min(r, la / 2), rb = Math.min(r, lb / 2);
      const p0 = [p[0] + (a[0] - p[0]) / la * ra, p[1] + (a[1] - p[1]) / la * ra], p1 = [p[0] + (b[0] - p[0]) / lb * rb, p[1] + (b[1] - p[1]) / lb * rb];
      for (let s = 0; s <= steps; s++) { const t = s / steps, m = 1 - t; o.push([m * m * p0[0] + 2 * m * t * p[0] + t * t * p1[0], m * m * p0[1] + 2 * m * t * p[1] + t * t * p1[1]]); }
    }
    return o;
  }
  const RING = { back: rounded([[4, 2], [11.2, 2], [14.2, 5], [27, 5], [27, 23], [4, 23]].map(C), [2.2, 1.4, 1.4, 2.2, 2.2, 2.2]),
    sheet: rounded([[7, 9], [24, 9], [24, 18], [7, 18]].map(C), 1), front: rounded([[4, 5], [27, 5], [27, 23], [4, 23]].map(C), 2.2) };
  const TH = { back: 1.7, sheet: 0.6, front: 1.7 }, GAP = 0.14, LIFT = 5.4, FLOOR = -11.6, HINGE = -10.5;
  const REF = {                                                       // the tones of the blue folder; any other accent is tinted from these (the library's rule)
    back: { cap: ['#93bbff', '#7faeff'], line: '#5393ff', s: ['#2b5cc0', '#3569d2', '#4279e3', '#5289f0', '#b4cfff'] },
    front: { cap: ['#ccdfff', '#adcbff'], line: '#5393ff', s: ['#4f83e0', '#6193ec', '#74a2f4', '#89b2fa', '#eaf2ff'] } };
  const SHEET = { cap: ['#ffffff', '#f3f6fc'], line: '#c9d4e8', s: ['#aebbd2', '#bec9dd', '#cdd6e7', '#dbe2ef', '#ffffff'] };
  A.tone = (accent) => { const t = h => V.tint(h, accent), o = {}; for (const id in REF) o[id] = { cap: REF[id].cap.map(t), line: t(REF[id].line), s: REF[id].s.map(t) }; o.sheet = SHEET; return o; };
  A.mixTone = (a, b, m) => { if (m <= 0) return a; if (m >= 1) return b; const o = {}; for (const id of ['back', 'front']) o[id] = { cap: a[id].cap.map((c, i) => V.mix(c, b[id].cap[i], m)), line: V.mix(a[id].line, b[id].line, m), s: a[id].s.map((c, i) => V.mix(c, b[id].s[i], m)) }; o.sheet = SHEET; return o; };
  A.blue = A.tone('#5393ff');
  const pt = (F, s, [x, y]) => [F.o[0] + F.a[0] * s + F.u[0] * x + F.v[0] * y, F.o[1] + F.a[1] * s + F.u[1] * x + F.v[1] * y, F.o[2] + F.a[2] * s + F.u[2] * x + F.v[2] * y];
  let box = null, last = '', used = false;
  A.mount = () => { box = document.createElement('div'); box.id = 'anat'; const ov = document.getElementById('overlay'); ov.insertBefore(box, document.getElementById('kin')); };
  A.begin = () => { used = false; };
  A.end = () => { if (!used && last) { box.innerHTML = ''; last = ''; } };

  // o: { az, el, U, cx, cy, e, open, tones, hot, alpha, grid, outline: {back, front} 0..1 (how much of the fat outline is drawn),
  //      fat (extra outline width), bump: {id: scale}, labels: [{ id, n, name, a, on, v }], cube: { accent, y, s, spin, chips: [{ src, a }] } }
  A.draw = function (o) {
    const az = o.az ?? 90, el = o.el ?? 0, U = o.U ?? 24, e = o.e ?? 0, op = o.open ?? 0, th = op * 0.62, tones = o.tones || A.blue, alpha = o.alpha ?? 1;
    const P0 = { origin: [0, 0], scale: U / Math.sqrt(1.6), azimuth: az, elevation: el }, c0 = k.iso([0, TH.back + GAP + TH.sheet / 2, 0], P0);
    const P = { ...P0, origin: [(o.cx ?? 540) - c0[0], (o.cy ?? 1010) - c0[1]] };
    const u = [1, 0, 0], up = [0, 0, 1], a = [0, 1, 0];
    const s0 = { back: -e * LIFT, sheet: TH.back + GAP, front: TH.back + GAP + TH.sheet + GAP + e * LIFT };
    const FR = { back: { o: [0, 0, 0], a, u, v: up }, sheet: { o: [0, 0, op * 2.1], a, u, v: up } };
    { const v = [0, Math.sin(th), Math.cos(th)], an = [0, Math.cos(th), -Math.sin(th)], h = [0, s0.front, HINGE];
      FR.front = { o: [h[0] - an[0] * s0.front - v[0] * HINGE, h[1] - an[1] * s0.front - v[1] * HINGE, h[2] - an[2] * s0.front - v[2] * HINGE], a: an, u, v }; }
    const ol = o.outline || { back: 1, front: 1 }, fat = o.fat || 0;
    const piece = (id) => {
      const F = FR[id], tn = tones[id], g0 = s0[id], g1 = g0 + TH[id], pr = L.prismOf(F, RING[id], g0, g1, P);
      const cap = k.pathOf(RING[id].map(q => k.iso(pt(F, g1, q), P)), true), dim = o.hot && o.hot !== id ? 0.45 : 1, bs = (o.bump && o.bump[id]) || 1;
      const sides = pr.shades.map((d, i) => d ? `<path d="${d}" fill="${tn.s[i]}" stroke="${tn.s[i]}" stroke-width=".6"/>` : '').join('') + (pr.top ? `<path d="${pr.top}" fill="${tn.s[4]}" stroke="${tn.s[4]}" stroke-width=".6"/>` : '');
      let mark = '', line;
      if (id === 'sheet') { mark = `<path d="${k.pathOf([C([12.5, 11.3]), C([18.5, 11.3])].map(q => k.iso(pt(F, g1, q), P)))}" fill="none" stroke="#d3e2ff" stroke-width="${(U / 3).toFixed(1)}" stroke-linecap="round"/>`;
        line = `<path d="${cap}" fill="url(#cap-${id})" stroke="${tn.line}" stroke-width="1.6" stroke-linejoin="round"/>`; }
      else { const d = ol[id] ?? 1;                                   // the fat outline: drawn round the piece, outside the fill
        line = `<path d="${cap}" fill="url(#cap-${id})" stroke="${tn.cap[1]}" stroke-width="1.2" stroke-linejoin="round"/>` +
          (d > 0.002 ? `<path d="${cap}" fill="none" stroke="${tn.line}" stroke-width="${(U * 0.19 + fat).toFixed(2)}" stroke-linejoin="round" stroke-linecap="round" pathLength="1" stroke-dasharray="${d.toFixed(4)} 2"/>` : ''); }
      const tf = bs !== 1 ? ` transform-origin="${o.cx ?? 540} ${o.cy ?? 1010}" transform="scale(${bs.toFixed(4)})"` : '';
      return `<g opacity="${dim}"${tf}>${sides}${line}${mark}</g>`;
    };
    let floor = '';
    const gr = o.grid ?? 0;
    if (gr > 0.01) { const g = []; for (let i = -7; i <= 7; i++) g.push(k.segment([i * 6, -40, FLOOR], [i * 6, 44, FLOOR], P), k.segment([-42, i * 6 + 2, FLOOR], [42, i * 6 + 2, FLOOR], P));
      const sh = k.pathOf([[-12, s0.back - 1], [12, s0.back - 1], [12, s0.front + TH.front + 1 + op * 6], [-12, s0.front + TH.front + 1 + op * 6]].map(q => k.iso([q[0], q[1], FLOOR], P)), true);
      floor = `<path d="${g.join('')}" fill="none" stroke="#35ecd0" stroke-width="1.6" opacity="${(0.2 * gr).toFixed(3)}"/><path d="${sh}" fill="${tones.back.s[1]}" opacity="${(0.55 * gr * alpha).toFixed(3)}" style="filter:blur(22px)"/>`; }
    const labels = (o.labels || []).map(l => { if (l.a <= 0.003) return '';
      const p = k.iso(pt(FR[l.id], s0[l.id] + TH[l.id], [11.4, l.v]), P), x1 = 866;
      return `<g opacity="${l.a.toFixed(3)}"><path d="M${p[0].toFixed(1)} ${p[1].toFixed(1)}L${(x1 - 16).toFixed(1)} ${p[1].toFixed(1)}" stroke="#35ecd0" stroke-width="2.6" fill="none" stroke-dasharray="${(420 * l.a).toFixed(0)} 600"/><circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="7" fill="#35ecd0"/>
        <text x="${x1}" y="${(p[1] - 22).toFixed(1)}" class="tagn">${l.n}</text><text x="${x1}" y="${(p[1] + 14).toFixed(1)}" class="atag${l.on ? ' on' : ''}">${l.name}</text></g>`; }).join('');
    // the one colour: a block that floats above, and the three tones that come out of it
    let cube = ''; const out = { chips: [] };
    if (o.cube && o.cube.s > 0.002) { const c = o.cube, t = h => V.tint(h, c.accent), z0 = c.z, sz = 5.2 * c.s, x0 = -13.5, y0 = 3;
      const ring = k.roundedPlan({ x: x0 - sz / 2, y: y0 - sz / 2, w: sz, d: sz, r: 0.9 * c.s }, 5), ex = k.extrude(ring, z0, sz, P, { convex: true });
      const tn = ['#2b5cc0', '#3569d2', '#4279e3', '#5289f0'].map(t), centre = k.iso([x0, y0, z0 + sz / 2], P);
      cube = `<circle cx="${centre[0].toFixed(1)}" cy="${centre[1].toFixed(1)}" r="${(U * 6.5 * c.s).toFixed(1)}" fill="${t('#5393ff')}" opacity=".3" style="filter:blur(30px)"/><path d="${ex.fill}" fill="${tn[1]}"/>` + ex.shades.map((d, i) => d ? `<path d="${d}" fill="${tn[i]}"/>` : '').join('') + `<path d="${ex.top}" fill="${t('#9cc0ff')}"/><path d="${ex.outline}" fill="none" stroke="${t('#cfe0ff')}" stroke-width="2.4" stroke-linejoin="round"/>`;
      (c.chips || []).forEach((ch, i) => { if (ch.a <= 0.002) { out.chips.push(null); return; } const tx = lerp(x0, -4.5 + i * 7.4, ch.a), cs = 4.2 * (0.4 + 0.6 * ch.a), zc = z0 + sz / 2 - cs / 2 + 2.2 * Math.sin(ch.a * Math.PI) * (1 - ch.a);
        const r2 = k.roundedPlan({ x: tx - cs / 2, y: y0 - 0.5, w: cs, d: 1, r: 0.3 }, 3), e2 = L.prismOf({ o: [tx, y0, zc + cs / 2], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] }, rounded([[-cs / 2, -cs / 2], [cs / 2, -cs / 2], [cs / 2, cs / 2], [-cs / 2, cs / 2]], 0.7, 4), 0, 0.9, P);
        const col = t(ch.src), face = k.pathOf(rounded([[-cs / 2, -cs / 2], [cs / 2, -cs / 2], [cs / 2, cs / 2], [-cs / 2, cs / 2]], 0.7, 4).map(q => k.iso([tx + q[0], y0 + 0.9, zc + cs / 2 + q[1]], P)), true);
        cube += `<g opacity="${(ch.o ?? 1)}"><path d="${e2.fill}" fill="${V.mix(col, '#000000', 0.35)}"/><path d="${face}" fill="${col}" stroke="${V.mix(col, '#ffffff', 0.5)}" stroke-width="2"/></g>`; out.chips.push(k.iso([tx, y0 + 0.9, zc - 2.6], P)); }); }
    const defs = '<defs>' + ['back', 'sheet', 'front'].map(id => `<linearGradient id="cap-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tones[id].cap[0]}"/><stop offset="1" stop-color="${tones[id].cap[1]}"/></linearGradient>`).join('') + '</defs>';
    const html = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${defs}${floor}<g opacity="${alpha.toFixed(3)}">${piece('back')}${piece('sheet')}${piece('front')}</g>${cube}${labels}</svg>`;
    used = true; if (last !== html) { box.innerHTML = html; last = html; }
    return out;
  };
  const lerp = (a, b, t) => a + (b - a) * t;
})();
