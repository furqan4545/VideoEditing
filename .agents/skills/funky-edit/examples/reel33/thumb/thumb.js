// Reel 33 thumbnail: real Kubai icon shapes built as 3D objects with the anatomy kit (iso-kit + lathe), one camera,
// the big folder open on its hinge, the Claude block with its pencil, and the title.
import * as k from '../demo3d/kit/iso-kit.mjs';
import * as L from '../demo3d/kit/lathe.mjs';

const W = 1080, H = 1920, AZ = 53, EL = 19;
const hx = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), toHex = c => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const REF = [83, 147, 255];
const tint = (src, accent) => { const s = hx(src), a = hx(accent); return toHex([0, 1, 2].map(i => { const amt = i === 2 ? (s[0] - REF[0]) / (255 - REF[0]) : (s[i] - REF[i]) / (255 - REF[i]); return amt >= 0 ? a[i] + (255 - a[i]) * amt : a[i] * (1 + amt); })); };
const mix = (a, b, m) => { const x = hx(a), y = hx(b); return toHex(x.map((v, i) => v + (y[i] - v) * m)); };
const C = ([x, y]) => [x - 15.5, 12.5 - y];                          // icon units, centred, up is +
function rounded(pts, radii, steps = 6) {
  const n = pts.length, o = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[(i + n - 1) % n], b = pts[(i + 1) % n], r = Array.isArray(radii) ? radii[i] : radii;
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]), ra = Math.min(r, la / 2), rb = Math.min(r, lb / 2);
    if (r <= 0.01) { o.push(p); continue; }
    const p0 = [p[0] + (a[0] - p[0]) / la * ra, p[1] + (a[1] - p[1]) / la * ra], p1 = [p[0] + (b[0] - p[0]) / lb * rb, p[1] + (b[1] - p[1]) / lb * rb];
    for (let s = 0; s <= steps; s++) { const t = s / steps, m = 1 - t; o.push([m * m * p0[0] + 2 * m * t * p[0] + t * t * p1[0], m * m * p0[1] + 2 * m * t * p[1] + t * t * p1[1]]); }
  }
  return o;
}
const rect = (x, y, w, h, r) => rounded([[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(C), r);
const circle = (cx, cy, r, n = 40) => Array.from({ length: n }, (_, i) => C([cx + r * Math.cos(i / n * 6.2832), cy + r * Math.sin(i / n * 6.2832)]));
function bezierPath(d, ox, oy, sc = 1) {                             // an "M x y C ..." path -> points (the heart)
  const n = d.match(/-?\d*\.?\d+/g).map(Number), pts = []; let cur = [n[0], n[1]];
  for (let i = 2; i + 5 < n.length; i += 6) { const [a, b, c, e, f, g] = n.slice(i, i + 6);
    for (let s = 0; s < 12; s++) { const t = s / 12, m = 1 - t; pts.push([m * m * m * cur[0] + 3 * m * m * t * a + 3 * m * t * t * c + t * t * t * f, m * m * m * cur[1] + 3 * m * m * t * b + 3 * m * t * t * e + t * t * t * g]); }
    cur = [f, g]; }
  return pts.map(([x, y]) => C([ox + x * sc, oy + y * sc]));
}
// tones of one accent (the library's rule: every tone is the accent moved by the step the blue reference tone sits from #5393FF)
function tones(accent) { const t = h => tint(h, accent); return {
  mid: { cap: [t('#93bbff'), t('#7faeff')], line: t('#5393ff'), s: ['#2b5cc0', '#3569d2', '#4279e3', '#5289f0', '#b4cfff'].map(t) },
  light: { cap: [t('#ccdfff'), t('#adcbff')], line: t('#5393ff'), s: ['#4f83e0', '#6193ec', '#74a2f4', '#89b2fa', '#eaf2ff'].map(t) },
  white: { cap: ['#ffffff', '#f1f5fc'], line: t('#c9d8f5'), s: ['#aebbd2', '#bec9dd', '#cdd6e7', '#dbe2ef', '#ffffff'], thin: true },
  deep: t('#2f6fe0'), soft: t('#89b5ff'), glow: accent }; }
const pt = (F, s, [x, y]) => [F.o[0] + F.a[0] * s + F.u[0] * x + F.v[0] * y, F.o[1] + F.a[1] * s + F.u[1] * x + F.v[1] * y, F.o[2] + F.a[2] * s + F.u[2] * x + F.v[2] * y];
let uid = 0; const HALOS = [];                                          // every glow goes under every icon, so no glow tints a neighbour
// one icon: layers far -> near. layer: { ring, s0, s1, tn, F (optional frame), marks(P, F, s1) }
function icon(layers, { cx, cy, U, accent, az = AZ, el = EL, blur = 0, glow = 0.42, o = 1 }) {
  const T = tones(accent), P0 = { origin: [0, 0], scale: U / Math.sqrt(1.6), azimuth: az, elevation: el }, c0 = k.iso([0, 1.2, 0], P0), P = { ...P0, origin: [cx - c0[0], cy - c0[1]] };
  const F0 = { o: [0, 0, 0], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] }; let out = '', defs = '';
  for (const ly of layers(T)) { const F = ly.F || F0, tn = T[ly.tn] || ly.tn, id = 'g' + (uid++), pr = L.prismOf(F, ly.ring, ly.s0, ly.s1, P);
    const cap = k.pathOf(ly.ring.map(q => k.iso(pt(F, ly.s1, q), P)), true);
    defs += `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${tn.cap[0]}"/><stop offset="1" stop-color="${tn.cap[1]}"/></linearGradient>`;
    out += pr.shades.map((d, i) => d ? `<path d="${d}" fill="${tn.s[i]}" stroke="${tn.s[i]}" stroke-width=".7"/>` : '').join('') + (pr.top ? `<path d="${pr.top}" fill="${tn.s[4]}" stroke="${tn.s[4]}" stroke-width=".7"/>` : '');
    out += `<path d="${cap}" fill="url(#${id})" stroke="${tn.line}" stroke-width="${(tn.thin ? U * 0.06 : U * 0.19).toFixed(2)}" stroke-linejoin="round"/>`;
    if (ly.marks) out += ly.marks(P, F, ly.s1, T, U); }
  const halo = `<ellipse cx="${cx}" cy="${cy}" rx="${(U * 15).toFixed(0)}" ry="${(U * 13).toFixed(0)}" fill="${accent}" opacity="${glow}" style="filter:blur(${(U * 3.2).toFixed(0)}px)"/>`;
  HALOS.push(halo); return `<defs>${defs}</defs><g opacity="${o}"${blur ? ` style="filter:blur(${blur}px)"` : ''}>${out}</g>`;
}
const onFace = (P, F, s, pts) => k.pathOf(pts.map(q => k.iso(pt(F, s, q), P)), true);
const faceMatrix = (P, F, s, at) => { const o = k.iso(pt(F, s, at), P), x = k.iso(pt(F, s, [at[0] + 1, at[1]]), P), y = k.iso(pt(F, s, [at[0], at[1] - 1]), P); return `matrix(${(x[0] - o[0]).toFixed(4)} ${(x[1] - o[1]).toFixed(4)} ${(y[0] - o[0]).toFixed(4)} ${(y[1] - o[1]).toFixed(4)} ${o[0].toFixed(2)} ${o[1].toFixed(2)})`; };
const tiltFrame = (th, s0, hinge) => { const v = [0, Math.sin(th), Math.cos(th)], an = [0, Math.cos(th), -Math.sin(th)], h = [0, s0, hinge]; return { o: [h[0] - an[0] * s0 - v[0] * hinge, h[1] - an[1] * s0 - v[1] * hinge, h[2] - an[2] * s0 - v[2] * hinge], a: an, u: [1, 0, 0], v }; };

// ---------------------------------------------------------------- the icons (their real 2D shapes from the repo, given thickness)
const FOLDER = (open) => (T) => [
  { ring: rounded([[4, 2], [11.2, 2], [14.2, 5], [27, 5], [27, 23], [4, 23]].map(C), [2.2, 1.4, 1.4, 2.2, 2.2, 2.2]), s0: 0, s1: 1.7, tn: 'mid' },
  { ring: rect(7, 9, 17, 9, 1), s0: 1.84, s1: 2.44, tn: 'white', F: { o: [0, 0, open * 2.2], a: [0, 1, 0], u: [1, 0, 0], v: [0, 0, 1] }, marks: (P, F, s, Tn, U) => `<path d="${k.pathOf([C([12.5, 11.3]), C([18.5, 11.3])].map(q => k.iso(pt(F, s, q), P)))}" fill="none" stroke="#d3e2ff" stroke-width="${(U / 3).toFixed(1)}" stroke-linecap="round"/>` },
  { ring: rect(4, 5, 23, 18, 2.2), s0: 2.58, s1: 4.28, tn: 'light', F: tiltFrame(open * 0.62, 2.58, -10.5) }];
const LOCK = (T) => { const rot = ([x, y]) => { const a = 0.35, c = Math.cos(a), s = Math.sin(a), dx = x - 20.5, dy = y - 12; return [20.5 + dx * c - dy * s, 12 + dx * s + dy * c - 2.4]; };
  const arc = (r, a0, a1, n = 14) => Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + (a1 - a0) * i / n) * Math.PI / 180; return [15.5 + r * Math.cos(a), 7.6 - r * Math.sin(a)]; });
  const sh = [[8.9, 12.6], ...arc(6.6, 180, 0), [22.1, 12.6], [18.9, 12.6], ...arc(3.4, 0, 180), [12.1, 12.6]].map(rot).map(C);
  return [{ ring: sh, s0: 0.5, s1: 1.8, tn: 'mid' },
    { ring: rect(5.6, 11, 19.8, 12.6, 2.2), s0: 0, s1: 2.3, tn: 'light', marks: (P, F, s) => `<path d="${onFace(P, F, s, circle(15.5, 16.2, 2.5, 24))}${onFace(P, F, s, rect(14.6, 16.6, 1.8, 4.6, 0.9))}" fill="${T.deep}"/>` }]; };
const CAL = (T) => [
  { ring: [...rect(10.4, 1.6, 1.8, 3.8, 0.9)], s0: 0.4, s1: 1.6, tn: 'white' }, { ring: rect(18.8, 1.6, 1.8, 3.8, 0.9), s0: 0.4, s1: 1.6, tn: 'white' },
  { ring: rect(5.2, 3.4, 20.6, 19.4, 2.2), s0: 0, s1: 2.0, tn: 'mid', marks: (P, F, s, Tn, U) => `<path d="${onFace(P, F, s, rounded([[8.2, 9], [22.8, 9], [22.8, 19.8], [8.2, 19.8]].map(C), [0, 0, 1.2, 1.2]))}" fill="#fff"/><path d="${onFace(P, F, s, rounded([[5.2, 3.4], [25.8, 3.4], [25.8, 9], [5.2, 9]].map(C), [2.2, 2.2, 0, 0]))}" fill="${T.light.cap[0]}" stroke="${T.mid.line}" stroke-width="${(U * 0.19).toFixed(2)}" stroke-linejoin="round"/><text transform="${faceMatrix(P, F, s, C([15.5, 17.6]))}" text-anchor="middle" font-family="Geist R, Helvetica, Arial" font-weight="800" font-size="8.6" fill="${T.mid.line}">17</text>` }];
const STAR = (T) => { const st = (r1, r2) => rounded(Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? r2 : r1; return C([15.5 + Math.cos(a) * r, 13.4 + Math.sin(a) * r]); }), 0.5, 3);
  return [{ ring: st(11.6, 5.4), s0: 0, s1: 2.2, tn: 'mid' }, { ring: st(5.6, 2.6), s0: 2.3, s1: 3.2, tn: 'light' }]; };
const HEART = (T) => { const d = 'M0 9.6C-5.5 5.6 -10.9 1.4 -10.9 -3.6C-10.9 -7 -8.3 -9.6 -5.1 -9.6C-2.9 -9.6 -1.1 -8.4 0 -6.6C1.1 -8.4 2.9 -9.6 5.1 -9.6C8.3 -9.6 10.9 -7 10.9 -3.6C10.9 1.4 5.5 5.6 0 9.6Z';
  return [{ ring: bezierPath(d, 15.5, 13), s0: 0, s1: 2.3, tn: 'mid' }, { ring: bezierPath(d, 15.5, 12.4, 0.5), s0: 2.4, s1: 3.3, tn: 'light' }]; };
const GEAR = (T) => { const pts = [], step = 60, rad = d => d * Math.PI / 180; for (let i = 0; i < 6; i++) [[9, i * step - 18], [11.4, i * step - 10.2], [11.4, i * step + 10.2], [9, i * step + 18]].forEach(([r, d]) => pts.push(C([15.5 + r * Math.sin(rad(d)), 12.5 - r * Math.cos(rad(d))])));
  return [{ ring: rounded(pts, 0.8, 3), s0: 0, s1: 2.2, tn: 'mid', marks: (P, F, s) => `<path d="${onFace(P, F, s, circle(15.5, 12.5, 4.1, 30))}" fill="#fff"/><path d="${onFace(P, F, s, circle(15.5, 12.5, 1.9, 20))}" fill="${T.deep}"/>` }]; };
const MAIL = (T) => [
  { ring: rounded([[4, 3.3], [27, 3.3], [15.5, -3.9]].map(C), [0.4, 0.4, 2.4], 4), s0: 0, s1: 0.9, tn: 'mid' },
  { ring: rect(4, 3.3, 23, 18.4, 2.2), s0: 0, s1: 1.2, tn: 'mid' },
  { ring: rect(7, -1.2, 17, 12, 1.2), s0: 1.3, s1: 1.8, tn: 'white', marks: (P, F, s, Tn, U) => `<path d="${k.pathOf([C([9.8, 2.4]), C([16.8, 2.4])].map(q => k.iso(pt(F, s, q), P)))}" fill="none" stroke="${T.mid.line}" stroke-width="${(U * 0.3).toFixed(1)}" stroke-linecap="round"/><path d="${k.pathOf([C([9.8, 5.6]), C([21.2, 5.6])].map(q => k.iso(pt(F, s, q), P)))}" fill="none" stroke="${T.soft}" stroke-width="${(U * 0.3).toFixed(1)}" stroke-linecap="round"/>` },
  { ring: rounded([[4, 7.1], [15.5, 13.7], [27, 7.1], [27, 21.7], [4, 21.7]].map(C), [0.6, 2.4, 0.6, 2.2, 2.2]), s0: 1.9, s1: 3.0, tn: 'light' }];

// ---------------------------------------------------------------- the Claude block, built from boxes with the same camera
function clawd({ cx, cy, U }) {
  const P0 = { origin: [0, 0], scale: U / Math.sqrt(1.6), azimuth: AZ + 4, elevation: EL + 3 }, c0 = k.iso([0, 0, 5], P0), P = { ...P0, origin: [cx - c0[0], cy - c0[1]] };
  const OR = ['#b8431a', '#c9501f', '#d85a24', '#e8662c'], TOP = '#f58a52', BK = ['#101014', '#17171c', '#1d1c23', '#24222b'], BKT = '#34313d';
  const box = (x, y, z, w, d, h, s, top, r = 0.25) => { const e = k.extrude(k.roundedPlan({ x: x - w / 2, y: y - d / 2, w, d, r }, 2), z, h, P, { convex: true }); return `<path d="${e.fill}" fill="${s[1]}"/>` + e.shades.map((p, i) => p ? `<path d="${p}" fill="${s[i]}"/>` : '').join('') + `<path d="${e.top}" fill="${top}"/>`; };
  const face = (x0, x1, z0, z1, y, fill) => `<path d="${k.pathOf([[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]].map(q => k.iso(q, P)), true)}" fill="${fill}"/>`;
  let s = `<ellipse cx="${cx}" cy="${cy + U * 4.6}" rx="${U * 8}" ry="${U * 2.6}" fill="#000" opacity=".5" style="filter:blur(${U}px)"/>`;
  for (const [x, y] of [[-3.6, -2.4], [3.6, -2.4], [-3.6, 2.4], [-1.2, 2.4], [1.2, 2.4], [3.6, 2.4]]) s += box(x, y, 0, 1.5, 1.5, 2.3, OR.map(c => mix(c, '#000000', 0.12)), '#c9501f');
  s += box(-6.1, 0, 4.2, 2.2, 2.2, 2.2, OR, TOP);                                  // far arm
  s += box(0, 0, 2.2, 10, 7, 7, OR, TOP, 0.5);                                     // body
  s += face(-3.1, -1.8, 5.0, 7.6, 3.52, '#141216') + face(1.8, 3.1, 5.0, 7.6, 3.52, '#141216');                 // eyes on the front face
  s += box(6.4, 0.6, 5.2, 2.6, 2.2, 2.2, OR, TOP);                                 // near arm, raised a little
  s += box(0, 0, 9.0, 8.8, 7.4, 0.55, ['#8f0f1a', '#a81320', '#c8121f', '#e11d2e'], '#e11d2e');                 // the beret's band
  s += box(0.5, 0, 9.5, 10.6, 8.2, 1.3, BK, BKT, 1.2) + box(0.9, 0, 10.8, 7.4, 6, 0.9, BK, BKT, 1.2) + box(0.9, 0, 11.7, 1, 1, 1, BK, BKT);
  // the pencil in the raised hand
  const a = k.iso([7.6, 1.6, 6.4], P), b = k.iso([11.2, 2.4, 13.2], P), nx = (b[1] - a[1]), ny = -(b[0] - a[0]), ln = Math.hypot(nx, ny), w = U * 0.55, ox = nx / ln * w, oy = ny / ln * w, tip = [a[0] - (b[0] - a[0]) * 0.16, a[1] - (b[1] - a[1]) * 0.16];
  s += `<path d="M${a[0] - ox} ${a[1] - oy}L${b[0] - ox} ${b[1] - oy}L${b[0] + ox} ${b[1] + oy}L${a[0] + ox} ${a[1] + oy}Z" fill="#ffc93c" stroke="#b9861a" stroke-width="2"/><path d="M${a[0] - ox} ${a[1] - oy}L${tip[0]} ${tip[1]}L${a[0] + ox} ${a[1] + oy}Z" fill="#f3d2a7"/><circle cx="${tip[0]}" cy="${tip[1]}" r="${U * 0.18}" fill="#222"/>
    <path d="M${b[0] - ox} ${b[1] - oy}L${b[0] - ox + (b[0] - a[0]) * 0.1} ${b[1] - oy + (b[1] - a[1]) * 0.1}L${b[0] + ox + (b[0] - a[0]) * 0.1} ${b[1] + oy + (b[1] - a[1]) * 0.1}L${b[0] + ox} ${b[1] + oy}Z" fill="#ff8fa3"/>`;
  return s;
}

// ---------------------------------------------------------------- the picture
function grid() { const P0 = { origin: [0, 0], scale: 30 / Math.sqrt(1.6), azimuth: AZ, elevation: EL }, c0 = k.iso([0, 0, 0], P0), P = { ...P0, origin: [540 - c0[0], 1520 - c0[1]] }, g = [];
  for (let i = -12; i <= 12; i++) g.push(k.segment([i * 5, -60, 0], [i * 5, 60, 0], P), k.segment([-60, i * 5, 0], [60, i * 5, 0], P));
  return `<defs><radialGradient id="gm" cx="50%" cy="76%" r="52%"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><mask id="gmask"><rect width="${W}" height="${H}" fill="url(#gm)"/></mask></defs><path d="${g.join('')}" fill="none" stroke="#35ecd0" stroke-width="1.8" opacity=".3" mask="url(#gmask)"/>`; }
const ICONS = [
  icon(GEAR, { cx: 944, cy: 1296, U: 9.5, accent: '#7c8aa5', blur: 1.2, glow: 0.3 }),
  icon(HEART, { cx: 118, cy: 786, U: 8.5, accent: '#f43f5e', glow: 0.34 }),
  icon(CAL, { cx: 172, cy: 1052, U: 11.5, accent: '#ef4444', glow: 0.4 }),
  icon(LOCK, { cx: 890, cy: 1024, U: 12.5, accent: '#f59e0b', glow: 0.42 }),
  icon(FOLDER(0.9), { cx: 552, cy: 1296, U: 28, accent: '#5393ff', glow: 0.5 }),
  icon(STAR, { cx: 902, cy: 1604, U: 11, accent: '#f59e0b', glow: 0.4 }),
  icon(MAIL, { cx: 600, cy: 1772, U: 10.5, accent: '#ec4899', glow: 0.36 })];
const body = [grid(), HALOS.join(''), ICONS.join(''), clawd({ cx: 232, cy: 1618, U: 21 })].join('');
document.getElementById('svg').innerHTML = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${body}</svg>`;
window.__ready = Promise.all([document.fonts.load('500 60px "Geist R"'), document.fonts.load('800 60px "Geist R"'), document.fonts.load('60px "Impact R"')]).then(() => true);
