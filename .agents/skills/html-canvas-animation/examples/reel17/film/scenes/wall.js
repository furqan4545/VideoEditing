// scenes/wall.js — the classroom's front wall, seen face-on and unfolded above the floor (class.js draws the floor).
// Owns: the wall, Sara's drawing (SHARED.saraDrawing, also used by the hook's post), the whiteboard with the number
// written in real marker strokes, the race hands (R6b), the +1 chip and the ghost 43 (R7b), the race-condition card
// (R8), the rewind and the marker hop to the teacher (R9), the plaque (R10), the teacher's notebook + fountain pen
// (R13-R15) and the teacher's hands re-writing the number (R14).  Prefix WL_.  Every value is a pure function of t.
'use strict';

const WL_TAU = Math.PI * 2;
const WL_SS = (t, a, b) => ease.sineInOut(seg(t, a, b));
const WL_cubeIn = u => u * u * u;

// ═════════════════════════════ geometry helpers (unit space) ═════════════════════════════
function WL_cr(P, n = 12) {          // Catmull-Rom through P, sampled n per segment
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let j = 0; j < n; j++) {
      const u = j / n, u2 = u * u, u3 = u2 * u, f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push([P[P.length - 1][0], P[P.length - 1][1]]); return out;
}
function WL_crClosed(P, n = 8) {
  const L = P.length, out = [];
  for (let i = 0; i < L; i++) {
    const p0 = P[(i - 1 + L) % L], p1 = P[i], p2 = P[(i + 1) % L], p3 = P[(i + 2) % L];
    for (let j = 0; j < n; j++) {
      const u = j / n, u2 = u * u, u3 = u2 * u, f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(out[0].slice()); return out;
}
function WL_mkStroke(runs) {          // runs of smooth points; sharp corners where runs meet
  let pts = []; const brk = [];
  for (const r of runs) { const s = WL_cr(r, r.length > 2 ? 12 : 10); if (pts.length) { s.shift(); brk.push(pts.length - 1); } pts = pts.concat(s); }
  const cum = [0]; for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const nrm = pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; return [-dy / L, dx / L]; });
  return { pts, cum, nrm, brk, L: cum[cum.length - 1] };
}
function WL_idx(Cm, l) { let lo = 0, hi = Cm.length - 2; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (Cm[m] <= l) lo = m; else hi = m - 1; } return lo; }
function WL_at(S, l) { l = clamp(l, 0, S.L); const i = WL_idx(S.cum, l), k = (l - S.cum[i]) / Math.max(1e-9, S.cum[i + 1] - S.cum[i]); return [lerp(S.pts[i][0], S.pts[i + 1][0], k), lerp(S.pts[i][1], S.pts[i + 1][1], k)]; }
// add the part [a, b] (arc length) of stroke S to the current path, pushed `off` along the normals
function WL_range(S, a, b, off = 0, c = g) {
  a = clamp(a, 0, S.L); b = clamp(b, 0, S.L); if (b - a < 1e-5) return;
  const P = S.pts, N = S.nrm, Cm = S.cum, i = WL_idx(Cm, a), j = WL_idx(Cm, b);
  const pt = (q, l) => { const k = (l - Cm[q]) / Math.max(1e-9, Cm[q + 1] - Cm[q]); return [lerp(P[q][0], P[q + 1][0], k) + lerp(N[q][0], N[q + 1][0], k) * off, lerp(P[q][1], P[q + 1][1], k) + lerp(N[q][1], N[q + 1][1], k) * off]; };
  let p = pt(i, a); c.moveTo(p[0], p[1]);
  const B = off && S.brk && S.brk.length ? S.brk : null;
  for (let q = i + 1; q <= j; q++) { if (B && B.includes(q)) c.moveTo(P[q][0] + N[q][0] * off, P[q][1] + N[q][1] * off); else c.lineTo(P[q][0] + N[q][0] * off, P[q][1] + N[q][1] * off); }
  p = pt(j, b); c.lineTo(p[0], p[1]);
}

// ═════════════════════════════ marker digits: single-stroke paths, written by a tip ═════════════════════════════
// unit box: x 0..0.62, y 0..1 (y down). digit → strokes → runs → points.
const WL_GLYPH_DEF = {
  '0': [[[[0.32, 0.0], [0.13, 0.08], [0.04, 0.36], [0.06, 0.70], [0.20, 0.96], [0.40, 0.97], [0.55, 0.72], [0.57, 0.34], [0.47, 0.07], [0.30, 0.0], [0.21, 0.06]]]],
  '1': [[[[0.10, 0.22], [0.23, 0.12], [0.37, 0.0]], [[0.37, 0.0], [0.365, 0.5], [0.36, 1.0]]]],
  '2': [[[[0.05, 0.25], [0.12, 0.07], [0.31, 0.0], [0.50, 0.07], [0.56, 0.25], [0.47, 0.46], [0.26, 0.71], [0.03, 0.985]], [[0.03, 0.985], [0.32, 0.975], [0.61, 0.98]]]],
  '3': [[[[0.06, 0.12], [0.22, 0.01], [0.43, 0.02], [0.54, 0.17], [0.47, 0.36], [0.24, 0.46]], [[0.24, 0.46], [0.48, 0.52], [0.58, 0.71], [0.49, 0.91], [0.27, 0.995], [0.04, 0.90]]]],
  '4': [[[[0.44, 0.0], [0.23, 0.34], [0.02, 0.67]], [[0.02, 0.67], [0.32, 0.665], [0.62, 0.66]]], [[[0.47, 0.22], [0.465, 0.62], [0.46, 1.0]]]],
  '5': [[[[0.12, 0.02], [0.09, 0.22], [0.07, 0.45]], [[0.07, 0.45], [0.28, 0.37], [0.50, 0.45], [0.59, 0.67], [0.50, 0.89], [0.28, 0.995], [0.04, 0.91]]], [[[0.12, 0.02], [0.34, 0.015], [0.57, 0.01]]]],
  '6': [[[[0.50, 0.03], [0.30, 0.13], [0.12, 0.37], [0.05, 0.65], [0.13, 0.89], [0.32, 0.995], [0.52, 0.89], [0.57, 0.67], [0.45, 0.51], [0.25, 0.50], [0.07, 0.63]]]],
  '7': [[[[0.02, 0.03], [0.31, 0.02], [0.60, 0.02]], [[0.60, 0.02], [0.40, 0.49], [0.20, 1.0]]]],
  '8': [[[[0.53, 0.15], [0.39, 0.01], [0.18, 0.02], [0.07, 0.19], [0.19, 0.38], [0.42, 0.52], [0.57, 0.74], [0.47, 0.94], [0.28, 0.995], [0.08, 0.92], [0.04, 0.74], [0.18, 0.55], [0.41, 0.41], [0.53, 0.24], [0.53, 0.15]]]],
  '9': [[[[0.55, 0.20], [0.45, 0.04], [0.26, 0.0], [0.08, 0.10], [0.05, 0.30], [0.20, 0.45], [0.42, 0.41], [0.55, 0.24]], [[0.55, 0.24], [0.535, 0.6], [0.51, 1.0]]]],
};
const WL_GLY = {}; for (const d in WL_GLYPH_DEF) WL_GLY[d] = WL_GLYPH_DEF[d].map(WL_mkStroke);

// the board's number: first digit's top-left, digit height (world units)
const WL_NUM = { x: 3502, y: 226, h: 190 };
const WL_ADV = 0.78, WL_SLANT = 0.08, WL_LW = 0.084;
const WL_JIT = [[0, 0], [0.014, 0.012], [-0.008, -0.006]];
const WL_INKS = {
  k: { edge: '#050507', body: '#0f0f12', core: '#34343c', streak: '#55555f', pool: '#000000' },
  b: { edge: '#0f3cc0', body: '#1d54f2', core: '#5a8cff', streak: '#9cb9ff', pool: '#0a2fa0' },
  r: { edge: '#d92a20', body: '#ff3b30', core: '#ff7a70', streak: '#ffb0aa', pool: '#c01f16' },
};
function WL_mkMark(m) {
  m.h = m.h || WL_NUM.h; const off = m.off || [0, 0]; m.X = (m.X ?? WL_NUM.x) + off[0]; m.Y = (m.Y ?? WL_NUM.y) + off[1]; m.wdir = m.wdir || 1;
  const items = [];
  [...m.s].forEach((ch, i) => { const sl = m.slot + i, j = WL_JIT[sl % 3]; WL_GLY[ch].forEach(S => items.push({ S, sl, ox: sl * WL_ADV + j[0], oy: j[1] })); });
  if (m.rev) items.reverse();
  let c = 0; items.forEach((it, i) => { it.c0 = c; c += it.S.L; it.c1 = c; if (i < items.length - 1) c += 0.24; });
  m.items = items; m.len = c;
  const sls = m.wipe && m.wipe[2] ? m.wipe[2] : items.map(i => i.sl);
  m.xL = m.X + m.h * (Math.min(...sls) * WL_ADV - 0.05); m.xR = m.X + m.h * (Math.max(...sls) * WL_ADV + 0.74);
  return m;
}
const WL_pt = (m, it, p) => [m.X + m.h * (it.ox + p[0] + WL_SLANT * (1 - p[1])), m.Y + m.h * (it.oy + p[1])];
// walk a mark to progress p (0..1 of strokes + pen-up travel); cb(it, a, b) for every visible stroke part; returns the tip
function WL_walk(m, p, cb) {
  const l = p * m.len; let tip = null, prev = null;
  for (const it of m.items) {
    if (l <= it.c0) {
      const b = WL_pt(m, it, WL_at(it.S, m.rev ? it.S.L : 0));
      if (prev) { const a = WL_pt(m, prev, WL_at(prev.S, m.rev ? 0 : prev.S.L)), k = clamp((l - prev.c1) / Math.max(1e-6, it.c0 - prev.c1)); tip = { x: lerp(a[0], b[0], k), y: lerp(a[1], b[1], k), down: false }; }
      else tip = { x: b[0], y: b[1], down: false };
      break;
    }
    const d = Math.min(it.S.L, l - it.c0), a = m.rev ? it.S.L - d : 0, b = m.rev ? it.S.L : d;
    if (cb) cb(it, a, b);
    if (l < it.c1) { const q = WL_pt(m, it, WL_at(it.S, m.rev ? a : b)); tip = { x: q[0], y: q[1], down: true }; break; }
    prev = it;
  }
  if (!tip) { const it = m.items[m.items.length - 1], q = WL_pt(m, it, WL_at(it.S, m.rev ? 0 : it.S.L)); tip = { x: q[0], y: q[1], down: false }; }
  return tip;
}
const WL_writeEase = u => lerp(u, ease.sineInOut(u), 0.6);
function WL_prog(m, t) {
  let p = m.w[0] < 0 ? 1 : WL_writeEase(seg(t, m.w[0], m.w[1]));
  if (m.un) p = Math.min(p, 1 - ease.sineInOut(seg(t, m.un[0], m.un[1])));
  return p;
}
const WL_tipOf = m => t => WL_walk(m, WL_prog(m, t));
function WL_front(m, t) { const k = ease.sineInOut(seg(t, m.wipe[0], m.wipe[1])); return m.wdir < 0 ? lerp(m.xR, m.xL, k) : lerp(m.xL, m.xR, k); }

// marker ink: halo bleed, dark edge, lighter core, faint streaks along the stroke, a pool where the tip landed
function WL_inkStroke(m, it, a, b, ink, alpha = 1) {
  if (b - a < 1e-4 || alpha <= 0.003) return;
  const h = m.h, S = it.S, lw = WL_LW;
  g.save(); g.transform(h, 0, -WL_SLANT * h, h, m.X + h * (it.ox + WL_SLANT), m.Y + h * it.oy);
  g.lineCap = 'round'; g.lineJoin = 'round'; const A = g.globalAlpha * alpha;
  const P = off => { g.beginPath(); WL_range(S, a, b, off); };
  g.globalAlpha = A * 0.10; g.strokeStyle = ink.edge; g.lineWidth = lw * 1.07; P(0); g.stroke();
  g.globalAlpha = A * 0.97; g.strokeStyle = ink.body; g.lineWidth = lw; P(0); g.stroke();
  g.globalAlpha = A * 0.5; g.strokeStyle = ink.edge; g.lineWidth = lw * 0.08; P(0.46 * lw); g.stroke(); P(-0.46 * lw); g.stroke();
  g.globalAlpha = A * 0.13; g.strokeStyle = ink.core; g.lineWidth = lw * 0.5; P(0.05 * lw); g.stroke();
  g.globalAlpha = A * 0.22; g.strokeStyle = ink.streak; g.lineWidth = lw * 0.045;
  for (const o of [-0.33, -0.17, 0.09, 0.27]) { P(o * lw); g.stroke(); }
  if (a < 1e-3) { g.globalAlpha = A * 0.32; g.fillStyle = ink.pool; const p0 = S.pts[0]; g.beginPath(); g.arc(p0[0], p0[1], lw * 0.55, 0, WL_TAU); g.fill(); }
  g.restore();
}
function WL_ghostStroke(m, it, a, b, k) {
  if (k <= 0.003) return; const h = m.h;
  g.save(); g.transform(h, 0, -WL_SLANT * h, h, m.X + h * (it.ox + WL_SLANT) + 4 * m.wdir, m.Y + h * it.oy + 1.5);
  g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = '#6c707c'; const A = g.globalAlpha;
  g.globalAlpha = A * 0.035 * k; g.lineWidth = WL_LW * 1.9; g.beginPath(); WL_range(it.S, a, b); g.stroke();
  g.globalAlpha = A * 0.05 * k; g.lineWidth = WL_LW * 0.9; g.beginPath(); WL_range(it.S, a, b); g.stroke();
  g.restore();
}
function WL_drawMark(m, t) {
  const p = WL_prog(m, t), wiping = !!m.wipe && t >= m.wipe[0], sl = m.wipe && m.wipe[2];
  const ghost = wiping && t < (m.ghostEnd ?? 1e9);
  if (p <= 0.0005 && !ghost) return;
  const fx = wiping ? WL_front(m, t) : 0, done = wiping && t >= m.wipe[1], ink = WL_INKS[m.ink];
  const gk = ghost ? (1 - 0.45 * seg(t, m.wipe[1], m.wipe[1] + 4)) * (m.ghostEnd ? 1 - seg(t, m.ghostEnd - 0.2, m.ghostEnd) : 1) : 0;
  const clipSide = inkSide => { const right = (m.wdir < 0) !== inkSide; g.beginPath(); if (right) g.rect(fx, -1e5, 2e5, 2e5); else g.rect(-1e5, -1e5, fx + 1e5, 2e5); g.clip(); };
  WL_walk(m, p, (it, a, b) => {
    const hit = wiping && (!sl || sl.includes(it.sl));
    if (!hit) { WL_inkStroke(m, it, a, b, ink); return; }
    if (gk > 0) { g.save(); clipSide(false); WL_ghostStroke(m, it, a, b, gk); g.restore(); }
    if (!done) { g.save(); clipSide(true); WL_inkStroke(m, it, a, b, ink); g.restore(); }
  });
  if (gk > 0) {        // the swipe leaves faint streaks across where it went
    g.save(); clipSide(false); g.beginPath(); g.rect(m.xL - 10, m.Y - 16, m.xR - m.xL + 20, m.h + 32); g.clip();
    for (let i = 0; i < 7; i++) { const yy = m.Y + m.h * (0.02 + i * 0.16); ln(m.xL - 20, yy + Math.sin(i * 2.1) * 6, m.xR + 20, yy + 10 + Math.sin(i * 1.3 + 1) * 8, { c: '#5a5e6a', w: 7 + (i % 3) * 6, op: 0.02 * gk }); }
    g.restore();
  }
}

// the story on the board (the number shown always equals boardNum(t) from base.js)
const WL_RACE = { wipe0: 19.40, wipe1: 19.68, b0: 19.80, b1: 20.50, k0: 19.86, k1: 20.58, un0: 30.16, un1: 30.46, rw0: 30.48, rw1: 30.78 };
const WL_TCH = [A_.t42, A_.t43, A_.t44].map(T => ({ e0: T - 0.36, e1: T - 0.22, w0: T - 0.20, w1: T + 0.12 }));
const WL_M = {
  k41: WL_mkMark({ s: '41', slot: 0, ink: 'k', w: [-9, -8], wipe: [WL_RACE.wipe0, WL_RACE.wipe1], wdir: -1, ghostEnd: WL_RACE.rw0 }),
  b42: WL_mkMark({ s: '42', slot: 0, ink: 'b', off: [-3.2, -2.6], w: [WL_RACE.b0, WL_RACE.b1], un: [WL_RACE.un0, WL_RACE.un1] }),
  k42: WL_mkMark({ s: '42', slot: 0, ink: 'k', off: [1.4, 1.3], w: [WL_RACE.k0, WL_RACE.k1], un: [WL_RACE.un0, WL_RACE.un1] }),
  r41: WL_mkMark({ s: '41', slot: 0, ink: 'k', rev: true, w: [WL_RACE.rw0, WL_RACE.rw1], wipe: [WL_TCH[0].e0, WL_TCH[0].e1, [1]] }),
  t2: WL_mkMark({ s: '2', slot: 1, ink: 'k', w: [WL_TCH[0].w0, WL_TCH[0].w1], wipe: [WL_TCH[1].e0, WL_TCH[1].e1] }),
  t3: WL_mkMark({ s: '3', slot: 1, ink: 'k', w: [WL_TCH[1].w0, WL_TCH[1].w1], wipe: [WL_TCH[2].e0, WL_TCH[2].e1] }),
  t4: WL_mkMark({ s: '4', slot: 1, ink: 'k', w: [WL_TCH[2].w0, WL_TCH[2].w1] }),
};
const WL_MARKS = Object.values(WL_M);
// the like that should be there (R7b): a dashed red ghost "43"
const WL_G43 = WL_mkMark({ s: '43', slot: 0, ink: 'r', X: 3812, Y: 112, h: 104, w: [-9, -8] });
const WL_R7 = { chip: A_.tNumber + 0.04, ghost: A_.tOnlyOne - 0.05, out0: A_.tGone - 0.3, out1: A_.tGone + 0.35 };

// ═════════════════════════════ Sara's drawing (vector, crisp at any zoom) ═════════════════════════════
let WL_SD = null;
function WL_sdBuild() {
  if (WL_SD) return WL_SD;
  const r = OM.rng(41), J = (pts, j) => pts.map(([x, y]) => [x + (r() - 0.5) * j * 2, y + (r() - 0.5) * j * 2]);
  const S = [], F_ = [];
  const add = (pts, o = {}) => S.push({ pts: o.closed ? WL_crClosed(J(pts, o.j ?? 0.25), o.n ?? 6) : WL_cr(J(pts, o.j ?? 0.28), o.n ?? 6), w: o.w ?? 1.3, c: o.c ?? '#18181c', a: o.a ?? 0.93 });
  const ring = (cx, cy, rx, ry, n, bump = 0, ph = 0) => Array.from({ length: n }, (_, i) => { const a = i / n * WL_TAU + ph, k = 1 + bump * Math.sin(a * 5 + 0.7); return [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]; });
  // crayon fill: zigzag strokes clipped to a shape
  const fill = (clip, bx, by, bw, bh, c, a, step = 1.1, w = 0.9, ang = 0.5) => {
    const zz = []; const n = Math.ceil((bw + bh) / step); for (let i = 0; i <= n; i++) { const d = i * step, x0 = bx + d * Math.cos(ang) - bh * 0.2, y0 = by + bh + 2; zz.push([x0 + (r() - 0.5) * 0.6, y0 + (r() - 0.5) * 0.6]); zz.push([x0 + bh * 1.3 * Math.sin(ang) + (r() - 0.5) * 0.8, by - 2 + (r() - 0.5) * 0.8]); }
    F_.push({ clip, zz, c, a, w });
  };
  // the ground and grass
  add([[3, 85.6], [24, 84.6], [44, 85.7], [64, 84.7], [84, 85.5], [104, 84.4], [124, 85.4], [144, 84.6], [158, 85.3]], { w: 1.2 });
  for (const gx of [6, 27, 70, 101, 114, 148]) { add([[gx, 85], [gx + 1.1, 81.6], [gx + 2.1, 85]], { w: 0.85, n: 3, j: 0.12 }); add([[gx + 2.1, 85], [gx + 3.3, 82.2], [gx + 4.3, 85]], { w: 0.85, n: 3, j: 0.12 }); }
  // the house
  add([[19, 52.5], [18.6, 68], [19.2, 85]]); add([[61, 52.5], [61.5, 68], [61, 85]]);
  add([[12.5, 54.5], [26.5, 41.2], [40.5, 28]]); add([[40.5, 28], [54, 40.5], [68, 55]]); add([[13.4, 53.6], [40, 52.6], [67.2, 54]]);
  add([[50, 37.5], [50.2, 31], [50.4, 25.8]], { w: 1.15 }); add([[50.4, 25.8], [53.2, 25.5], [56, 25.9]], { w: 1.15 }); add([[56, 25.9], [55.8, 31], [56.1, 43]], { w: 1.15 });
  add([[53.2, 22.5], [51, 19.2], [54, 16.4], [57.6, 17.6], [56.2, 14], [58.4, 10.6], [62.5, 11.2]], { w: 0.8, c: '#707078', a: 0.75 });
  add([[34, 85], [34.3, 75.5], [34.6, 67.6]], { w: 1.2 }); add([[34.6, 67.6], [39.6, 67.2], [44.5, 67.7]], { w: 1.2 }); add([[44.5, 67.7], [44.7, 76], [44.5, 85]], { w: 1.2 });
  S.push({ dot: [42.2, 76.5, 0.8], c: '#18181c', a: 0.9 });
  for (const wx of [23, 48.5]) {
    const sq = [[wx, 57.5], [wx + 9.5, 57.2], [wx + 9.8, 66], [wx + 0.3, 66.3]];
    fill(sq, wx - 0.5, 56.5, 11, 10.5, '#5d83d6', 0.62, 1.5, 0.85, 0.62); fill(sq, wx - 0.5, 56.5, 11, 10.5, '#7d9be0', 0.35, 2.3, 0.6, -0.5);
    add([[wx, 57.5], [wx + 9.5, 57.2]], { w: 1.1 }); add([[wx + 9.5, 57.2], [wx + 9.8, 66]], { w: 1.1 }); add([[wx + 9.8, 66], [wx + 0.3, 66.3]], { w: 1.1 }); add([[wx + 0.3, 66.3], [wx, 57.5]], { w: 1.1 });
    add([[wx + 4.9, 57.4], [wx + 5.0, 66.1]], { w: 0.95 }); add([[wx + 0.2, 61.8], [wx + 9.7, 61.6]], { w: 0.95 });
  }
  // the tree
  add([[85.4, 85], [86.4, 72], [85.9, 59]], { w: 1.2 }); add([[92.6, 85], [91.8, 72], [92.3, 59]], { w: 1.2 }); add([[89.2, 67], [93, 63.5], [96, 61.5]], { w: 0.95 });
  add(ring(89, 47.5, 15.5, 13.5, 16, 0.07, 0.3), { closed: true, w: 1.25, n: 5 });
  for (const [lx, ly] of [[83, 45], [92, 42], [88, 52.5], [96, 50]]) add(ring(lx, ly, 2.4, 2.0, 7, 0, lx), { closed: true, w: 0.8, n: 4, j: 0.15, a: 0.8 });
  // the sun, with a face
  const sun = ring(135, 22, 8.6, 8.4, 18, 0.0);
  fill(sun, 125.5, 12.5, 19, 19, '#f7b538', 0.86, 1.0, 0.85, 0.45); fill(sun, 125.5, 12.5, 19, 19, '#ffd25a', 0.5, 1.6, 0.6, -0.7);
  add(sun, { closed: true, w: 1.15, c: '#e07c1f', a: 0.95, n: 4, j: 0.15 });
  for (let i = 0; i < 11; i++) { const a = i / 11 * WL_TAU + 0.2, r0 = 11, r1 = i % 2 ? 15 : 17.5; add([[135 + Math.cos(a) * r0, 22 + Math.sin(a) * r0], [135 + Math.cos(a) * r1, 22 + Math.sin(a) * r1]], { w: 1.1, c: '#e8892b', a: 0.92, n: 3, j: 0.15 }); }
  S.push({ dot: [132.3, 20.4, 0.75], c: '#18181c', a: 0.9 }); S.push({ dot: [137.6, 20.3, 0.75], c: '#18181c', a: 0.9 });
  add([[131.6, 23.6], [134.9, 26.2], [138.3, 23.4]], { w: 0.85, n: 5, j: 0.1 });
  // a cloud and two birds
  add([[90, 16.5], [92, 12.5], [96.5, 11.6], [99.5, 8.6], [104.5, 9.2], [107, 12.6], [111, 13.4], [112, 16.5], [90, 16.5]], { w: 1.05, n: 5 });
  add([[64, 16.6], [66.4, 14.1], [68.8, 16.4]], { w: 0.85, n: 4, j: 0.1 }); add([[68.8, 16.4], [71.2, 14.1], [73.6, 16.6]], { w: 0.85, n: 4, j: 0.1 });
  add([[75, 23.2], [76.8, 21.4], [78.6, 23.0]], { w: 0.8, n: 4, j: 0.1 }); add([[78.6, 23.0], [80.4, 21.4], [82.2, 23.2]], { w: 0.8, n: 4, j: 0.1 });
  // the cat
  add([[118, 85], [117.2, 78.5], [119.6, 72], [124, 69.6], [128.4, 72], [130.8, 78.5], [130, 85]], { w: 1.2 });
  add(ring(124, 64.2, 5.8, 5.2, 12, 0), { closed: true, w: 1.15, n: 4, j: 0.12 });
  add([[119.3, 61.6], [119.7, 56.2], [122.6, 59.4]], { w: 1.05, n: 3, j: 0.08 }); add([[125.4, 59.4], [128.3, 56.2], [128.7, 61.6]], { w: 1.05, n: 3, j: 0.08 });
  S.push({ dot: [122.1, 63.6, 0.62], c: '#18181c', a: 0.95 }); S.push({ dot: [125.9, 63.6, 0.62], c: '#18181c', a: 0.95 });
  add([[123.3, 65.6], [124, 66.3], [124.7, 65.6]], { w: 0.7, n: 3, j: 0.05 });
  for (const [dy, s] of [[-0.6, -1], [0.9, -1], [-0.6, 1], [0.9, 1]]) add([[124 + s * 2.4, 66 + dy * 0.3], [124 + s * 7.6, 65.2 + dy * 1.6]], { w: 0.55, n: 3, j: 0.08, a: 0.85 });
  add([[121.3, 70.2], [124, 71.2], [126.8, 70.2]], { w: 1.1, c: '#4f78d4', a: 0.9, n: 4, j: 0.08 });
  add([[130.3, 83], [135.6, 82.2], [139, 77], [136.8, 72.6], [134.6, 74]], { w: 1.15 });
  add([[121.5, 85], [121.8, 82]], { w: 0.8, j: 0.05 }); add([[126.5, 85], [126.2, 82]], { w: 0.8, j: 0.05 });
  // paper fibres
  const fib = []; for (let i = 0; i < 170; i++) { const x = r() * 160, y = r() * 100, a = r() * WL_TAU, L = 0.6 + r() * 2.2; fib.push([x, y, x + Math.cos(a) * L, y + Math.sin(a) * L, r() < 0.5]); }
  WL_SD = { S, F: F_, fib }; return WL_SD;
}
// SHARED: the hook's post (880x550) and the wall (400x250) both call this. Fills the rect; stays crisp as vectors.
SHARED.saraDrawing = function (x, y, w, h, t) {
  const D = WL_sdBuild();
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const pg = g.createLinearGradient(x, y, x + w * 0.3, y + h); pg.addColorStop(0, '#fffefa'); pg.addColorStop(1, '#fbf7ec'); g.fillStyle = pg; g.fillRect(x, y, w, h);
  g.translate(x, y); g.scale(w / 160, h / 100); g.lineCap = 'round'; g.lineJoin = 'round';
  g.lineWidth = 0.18; for (const [x0, y0, x1, y1, lt] of D.fib) { g.strokeStyle = lt ? 'rgba(255,255,255,0.6)' : 'rgba(150,135,105,0.07)'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
  for (const f of D.F) {
    g.save(); g.beginPath(); f.clip.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); g.clip();
    g.globalAlpha = f.a; g.strokeStyle = f.c; g.lineWidth = f.w; g.lineJoin = 'miter'; g.beginPath(); f.zz.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke(); g.lineJoin = 'round'; g.restore();
  }
  for (const s of D.S) {
    if (s.dot) { g.globalAlpha = s.a; g.fillStyle = s.c; g.beginPath(); g.arc(s.dot[0], s.dot[1], s.dot[2], 0, WL_TAU); g.fill(); continue; }
    g.beginPath(); s.pts.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py)));
    g.globalAlpha = s.a * 0.1; g.strokeStyle = s.c; g.lineWidth = s.w * 1.35; g.stroke();          // ink soaking into the paper
    g.globalAlpha = s.a * 0.86; g.lineWidth = s.w; g.stroke();                                        // felt-tip body (overlaps go darker)
    const p0 = s.pts[0], p1 = s.pts[s.pts.length - 1]; g.globalAlpha = s.a * 0.35; g.fillStyle = s.c;   // ink pools at the ends
    g.beginPath(); g.arc(p0[0], p0[1], s.w * 0.55, 0, WL_TAU); g.arc(p1[0], p1[1], s.w * 0.5, 0, WL_TAU); g.fill();
  }
  g.globalAlpha = 0.9; g.save(); g.translate(9, 96.2); g.rotate(-0.05); g.font = '700 8.4px "Noteworthy", "Marker Felt", cursive'; g.fillStyle = '#18181c'; g.fillText('Sara', 0, 0);
  const sw = g.measureText('Sara').width; g.restore();
  g.strokeStyle = '#18181c'; g.lineWidth = 0.75; g.globalAlpha = 0.85; heartPath(9 + sw + 5.5, 93.3, 5.2); g.stroke();
  g.globalAlpha = 1; g.restore();
  // a soft vignette, like a photo of paper
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); const vg = g.createRadialGradient(x + w * 0.5, y + h * 0.45, h * 0.35, x + w * 0.5, y + h * 0.5, w * 0.68);
  vg.addColorStop(0, 'rgba(120,100,60,0)'); vg.addColorStop(1, 'rgba(120,100,60,0.07)'); g.fillStyle = vg; g.fillRect(x, y, w, h); g.restore();
};

// ═════════════════════════════ the wall ═════════════════════════════
function WL_wall(t) {
  const { x, y, w, h } = WALL; if (!onScreen(x, y, w, h, 80)) return;
  g.save(); sh(46, 6, 0.10); g.fillStyle = '#f3f4f5'; g.fillRect(x, y, w, h); noSh(); g.restore();
  const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#e9ebee'); gr.addColorStop(0.12, '#f3f4f6'); gr.addColorStop(0.45, '#f6f7f8'); gr.addColorStop(0.85, '#eff0f2'); gr.addColorStop(1, '#e6e8eb');
  g.fillStyle = gr; g.fillRect(x, y, w, h);
  const rg = g.createRadialGradient(3640, 180, 60, 3640, 260, 1000); rg.addColorStop(0, 'rgba(255,255,255,0.55)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(x, y, w, h);
  if (GRAIN) { g.save(); const p = g.createPattern(GRAIN, 'repeat'); p.setTransform(new DOMMatrix([0.8, 0, 0, 0.8, 0, 0])); g.globalCompositeOperation = 'overlay'; g.globalAlpha = 0.22; g.fillStyle = p; g.fillRect(x, y, w, h); g.restore(); }
  ln(x, y + 1, x + w, y + 1, { c: 'rgba(13,13,15,0.10)', w: 2 });
  // baseboard
  const bb = g.createLinearGradient(0, y + 566, 0, y + 600); bb.addColorStop(0, '#ffffff'); bb.addColorStop(0.25, '#f7f7f6'); bb.addColorStop(1, '#e3e3e1'); g.fillStyle = bb; g.fillRect(x, y + 568, w, 32);
  ln(x, y + 568, x + w, y + 568, { c: 'rgba(13,13,15,0.13)', w: 1.4, cap: 'butt' }); ln(x, y + 570.5, x + w, y + 570.5, { c: 'rgba(255,255,255,0.9)', w: 1.2, cap: 'butt' });
  const sd = g.createLinearGradient(0, y + 548, 0, y + 568); sd.addColorStop(0, 'rgba(20,20,30,0)'); sd.addColorStop(1, 'rgba(20,20,30,0.05)'); g.fillStyle = sd; g.fillRect(x, y + 548, w, 20);
  // outlet near the floor and a light switch
  WL_plateDev(2768, 528, 40, 30, 'outlet'); WL_plateDev(4256, 286, 34, 56, 'switch');
}
function WL_plateDev(cx, cy, w, h, kind) {
  g.save(); sh(8, 3, 0.12); g.fillStyle = '#fbfbfa'; rr(cx - w / 2, cy - h / 2, w, h, 4); g.fill(); noSh(); g.lineWidth = 1; g.strokeStyle = 'rgba(13,13,15,0.12)'; rr(cx - w / 2, cy - h / 2, w, h, 4); g.stroke();
  if (kind === 'outlet') { for (const dx of [-7, 7]) { g.fillStyle = '#c9c9c7'; rr(cx + dx - 2.4, cy - 7, 4.8, 14, 2); g.fill(); g.fillStyle = '#9a9a98'; rr(cx + dx - 1.4, cy - 5, 2.8, 10, 1.4); g.fill(); } }
  else { g.fillStyle = '#f2f2f0'; sh(3, 1.5, 0.15); rr(cx - 8, cy - 15, 16, 30, 3); g.fill(); noSh(); g.strokeStyle = 'rgba(13,13,15,0.14)'; rr(cx - 8, cy - 15, 16, 30, 3); g.stroke(); ln(cx - 6, cy, cx + 6, cy, { c: 'rgba(13,13,15,0.12)', w: 1 }); }
  g.restore();
}
function WL_clock(t) {
  const cx = 3266, cy = 104, R = 38; if (!onScreen(cx - R, cy - R, 2 * R, 2 * R, 40)) return;
  g.save(); sh(16, 7, 0.16); g.fillStyle = '#e4e5e8'; g.beginPath(); g.arc(cx, cy, R, 0, WL_TAU); g.fill(); noSh();
  const rim = g.createLinearGradient(cx - R, cy - R, cx + R, cy + R); rim.addColorStop(0, '#f4f5f6'); rim.addColorStop(0.5, '#b9bbc0'); rim.addColorStop(1, '#8e9096'); g.fillStyle = rim; g.beginPath(); g.arc(cx, cy, R, 0, WL_TAU); g.fill();
  const face = g.createRadialGradient(cx - 8, cy - 10, 4, cx, cy, R); face.addColorStop(0, '#ffffff'); face.addColorStop(1, '#f1f1ef'); g.fillStyle = face; g.beginPath(); g.arc(cx, cy, R - 4, 0, WL_TAU); g.fill();
  for (let i = 0; i < 60; i++) { const a = i / 60 * WL_TAU, big = i % 5 === 0, r0 = R - (big ? 11 : 7.5), r1 = R - 6; ln(cx + Math.sin(a) * r0, cy - Math.cos(a) * r0, cx + Math.sin(a) * r1, cy - Math.cos(a) * r1, { c: C.ink, w: big ? 2.2 : 0.7, cap: 'butt', op: big ? 0.9 : 0.55 }); }
  const n = Math.floor(t), u = t - n, sec = 14 + n + Math.min(1.04, spring(u, 0.42, 46)), mins = 41 + sec / 60, hrs = 9 + mins / 60;
  const hand = (a, L, w, c, tail = 0) => { g.save(); g.translate(cx, cy); g.rotate(a); sh(2.4, 1.6, 0.18); ln(0, tail, 0, -L, { c, w }); noSh(); g.restore(); };
  hand(hrs / 12 * WL_TAU, R * 0.48, 3.4, C.ink); hand(mins / 60 * WL_TAU, R * 0.72, 2.4, C.ink); hand(sec / 60 * WL_TAU, R * 0.8, 0.9, C.ink2, 7);
  g.fillStyle = C.ink; g.beginPath(); g.arc(cx, cy, 2.4, 0, WL_TAU); g.fill();
  const gl = g.createLinearGradient(cx - R, cy - R, cx + R * 0.3, cy + R * 0.3); gl.addColorStop(0, 'rgba(255,255,255,0.5)'); gl.addColorStop(0.45, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.beginPath(); g.arc(cx, cy, R - 4, 0, WL_TAU); g.fill();
  g.restore();
}
function WL_tape(x, y, w, h, rot) {
  g.save(); g.translate(x, y); g.rotate(rot); const r = OM.rng(Math.round(x * 7 + y));
  g.beginPath(); g.moveTo(-w / 2, -h / 2); for (let i = 1; i <= 5; i++) g.lineTo(-w / 2 + (r() - 0.5) * 2.2, -h / 2 + h * i / 5);
  for (let i = 5; i >= 0; i--) g.lineTo(w / 2 + (r() - 0.5) * 2.2, -h / 2 + h * i / 5); g.closePath();
  sh(3, 1.2, 0.08); g.fillStyle = 'rgba(236,228,206,0.82)'; g.fill(); noSh();
  const tg = g.createLinearGradient(0, -h / 2, 0, h / 2); tg.addColorStop(0, 'rgba(255,255,255,0.35)'); tg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = tg; g.fill();
  g.strokeStyle = 'rgba(160,145,110,0.25)'; g.lineWidth = 0.6; g.stroke(); g.restore();
}
function WL_wallDrawing(t) {
  const { x, y, w, h } = DRAW; if (!onScreen(x, y, w, h, 60)) return;
  g.save(); g.translate(x, y);        // no tilt: the hook's dive swaps from the post image to this copy at the same framing
  g.save(); g.fillStyle = '#fbf8f0'; sh(26, 14, 0.13); g.beginPath(); g.moveTo(0, 0); g.lineTo(w, 0); g.lineTo(w + 1, h + 2); g.quadraticCurveTo(w / 2, h - 3, -1, h + 2); g.closePath(); g.fill(); sh(5, 2, 0.12); g.fill(); noSh(); g.restore();
  SHARED.saraDrawing(0, 0, w, h, t);
  const cg = g.createLinearGradient(0, h - 26, 0, h); cg.addColorStop(0, 'rgba(60,50,30,0)'); cg.addColorStop(1, 'rgba(60,50,30,0.05)'); g.fillStyle = cg; g.fillRect(0, h - 26, w, 26);
  g.lineWidth = 1; g.strokeStyle = 'rgba(13,13,15,0.08)'; g.strokeRect(0, 0, w, h);
  WL_tape(10, -2, 52, 17, -0.62); WL_tape(w - 12, -1, 50, 17, 0.58);
  g.restore();
}

// ═════════════════════════════ the whiteboard ═════════════════════════════
const WL_SURF = { x: BOARD.x + 16, y: BOARD.y + 16, w: BOARD.w - 32, h: BOARD.h - 32 };
let WL_SMG = null;
function WL_smudges() {            // ghosts of old lessons, rendered once (soft, so low resolution is fine)
  if (WL_SMG) return WL_SMG; const S = WL_SURF, k = 1.5, cnv = document.createElement('canvas'); cnv.width = Math.round(S.w * k); cnv.height = Math.round(S.h * k);
  const x = cnv.getContext('2d'), r = OM.rng(1717); x.scale(k, k); x.lineCap = 'round'; x.lineJoin = 'round';
  x.filter = 'blur(7px)';
  for (let i = 0; i < 8; i++) { x.strokeStyle = `rgba(92,98,112,${0.03 + r() * 0.03})`; x.lineWidth = 26 + r() * 34; x.beginPath(); const cx = r() * S.w, cy = r() * S.h, R = 70 + r() * 170, a0 = r() * 6.28; x.arc(cx, cy, R, a0, a0 + 0.7 + r() * 1.3); x.stroke(); }
  x.filter = 'blur(2.8px)';
  for (let i = 0; i < 13; i++) {       // half-erased handwriting: cursive loops at random heights
    const x0 = 20 + r() * (S.w - 220), y0 = 40 + r() * (S.h - 60), xh = 7 + r() * 6, n = 3 + Math.floor(r() * 7), pts = [[x0, y0]];
    let cx = x0; for (let k = 0; k < n; k++) { cx += 7 + r() * 6; const tall = r() < 0.2; pts.push([cx, y0 - xh * (tall ? 1.9 : 0.8 + r() * 0.3)]); cx += 6 + r() * 6; pts.push([cx + (r() - 0.5) * 3, y0 + (r() < 0.12 ? xh * 0.8 : 0)]); }
    x.strokeStyle = `rgba(58,62,74,${0.022 + r() * 0.026})`; x.lineWidth = 3 + r() * 2.4; x.beginPath(); WL_cr(pts, 6).forEach(([px, py], j) => (j ? x.lineTo(px, py) : x.moveTo(px, py))); x.stroke();
    if (r() < 0.4) { x.beginPath(); x.moveTo(x0 - 4, y0 + 6); x.lineTo(cx + 4, y0 + 4 + (r() - 0.5) * 4); x.stroke(); }
  }
  x.strokeStyle = 'rgba(40,70,160,0.05)'; x.lineWidth = 4; x.beginPath(); x.ellipse(690, 300, 70, 40, -0.2, 0, 6.28); x.stroke();
  x.strokeStyle = 'rgba(58,62,74,0.05)'; x.beginPath(); x.moveTo(560, 120); x.quadraticCurveTo(640, 80, 720, 130); x.lineTo(708, 114); x.moveTo(720, 130); x.lineTo(702, 134); x.stroke();
  WL_SMG = cnv; return cnv;
}
function WL_board(t) {
  const B = BOARD, S = WL_SURF; if (!onScreen(B.x, B.y, B.w, B.h + 40, 60)) return;
  g.save(); sh(34, 16, 0.15); g.fillStyle = '#c9cbcf'; rr(B.x, B.y, B.w, B.h, 8); g.fill(); sh(6, 3, 0.14); g.fill(); noSh();
  const fg = g.createLinearGradient(0, B.y, 0, B.y + B.h); fg.addColorStop(0, '#f6f7f8'); fg.addColorStop(0.04, '#d3d5d9'); fg.addColorStop(0.5, '#e4e6e9'); fg.addColorStop(0.96, '#c5c7cc'); fg.addColorStop(1, '#a9acb2');
  g.fillStyle = fg; rr(B.x, B.y, B.w, B.h, 8); g.fill();
  const fh = g.createLinearGradient(B.x, 0, B.x + B.w, 0); fh.addColorStop(0, 'rgba(255,255,255,0.4)'); fh.addColorStop(0.3, 'rgba(255,255,255,0)'); fh.addColorStop(0.7, 'rgba(255,255,255,0.15)'); fh.addColorStop(1, 'rgba(0,0,0,0.06)'); g.fillStyle = fh; rr(B.x, B.y, B.w, B.h, 8); g.fill();
  g.lineWidth = 1.2; g.strokeStyle = 'rgba(255,255,255,0.9)'; rr(B.x + 1.5, B.y + 1.5, B.w - 3, B.h - 3, 7); g.stroke();
  g.strokeStyle = 'rgba(13,13,15,0.22)'; g.lineWidth = 1; rr(B.x + 0.5, B.y + 0.5, B.w - 1, B.h - 1, 8); g.stroke();
  // brushed lines on the aluminium
  g.save(); g.globalAlpha = 0.18; g.strokeStyle = '#ffffff'; g.lineWidth = 0.5; for (let i = 0; i < 6; i++) { ln(B.x + 10, B.y + 3 + i * 2, B.x + B.w - 10, B.y + 3 + i * 2, { c: '#fff', w: 0.5, op: 0.4 }); } g.restore();
  // the surface
  const sg = g.createLinearGradient(S.x, S.y, S.x + S.w, S.y + S.h); sg.addColorStop(0, '#fdfdfe'); sg.addColorStop(0.6, '#fafbfc'); sg.addColorStop(1, '#f2f3f5'); g.fillStyle = sg; g.fillRect(S.x, S.y, S.w, S.h);
  g.drawImage(WL_smudges(), S.x, S.y, S.w, S.h);
  const ins = g.createLinearGradient(0, S.y, 0, S.y + 12); ins.addColorStop(0, 'rgba(20,24,34,0.13)'); ins.addColorStop(1, 'rgba(20,24,34,0)'); g.fillStyle = ins; g.fillRect(S.x, S.y, S.w, 12);
  const inl = g.createLinearGradient(S.x, 0, S.x + 9, 0); inl.addColorStop(0, 'rgba(20,24,34,0.08)'); inl.addColorStop(1, 'rgba(20,24,34,0)'); g.fillStyle = inl; g.fillRect(S.x, S.y, 9, S.h);
  g.strokeStyle = 'rgba(13,13,15,0.18)'; g.lineWidth = 1; g.strokeRect(S.x, S.y, S.w, S.h);
  // grey corner caps
  for (const [cx, cy] of [[B.x, B.y], [B.x + B.w, B.y], [B.x, B.y + B.h], [B.x + B.w, B.y + B.h]]) {
    const cg = g.createLinearGradient(cx - 13, cy - 13, cx + 13, cy + 13); cg.addColorStop(0, '#c4c6cb'); cg.addColorStop(1, '#8f9298');
    sh(4, 2, 0.18); g.fillStyle = cg; rr(cx - 13, cy - 13, 26, 26, 7); g.fill(); noSh(); g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 1; rr(cx - 12, cy - 12, 24, 24, 6.5); g.stroke();
  }
  // what was written before the film: an arrow to the drawing, its name, and "likes"
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = WL_INKS.k.body; g.globalAlpha = 0.9; g.lineWidth = 4.2;
  g.beginPath(); g.moveTo(3428, 128); g.quadraticCurveTo(3404, 126, 3376, 131); g.stroke(); g.beginPath(); g.moveTo(3389, 119); g.lineTo(3375, 131.5); g.lineTo(3390, 141); g.stroke(); g.restore();
  WL_markerText('Sara’s drawing', 3440, 140, 38); WL_markerText('likes', 3818, 412, 88);
  g.restore();
}
function WL_markerText(s, x, y, px) {
  g.save(); g.font = FMK(px, 700); g.textBaseline = 'alphabetic'; g.fillStyle = WL_INKS.k.body; g.globalAlpha = 0.95; g.fillText(s, x, y);
  g.lineJoin = 'round'; g.strokeStyle = WL_INKS.k.edge; g.lineWidth = px * 0.012; g.globalAlpha = 0.5; g.strokeText(s, x, y); g.restore();
}
function WL_boardInk(t) {
  const S = WL_SURF; if (!onScreen(S.x, S.y, S.w, S.h, 40)) return;
  g.save(); g.beginPath(); g.rect(S.x, S.y, S.w, S.h); g.clip();
  for (const m of WL_MARKS) WL_drawMark(m, t);
  // R7b: "+1" chip and the dashed ghost of the like that should be there
  const out = 1 - ease.sineInOut(seg(t, WL_R7.out0, WL_R7.out1));
  if (t > WL_R7.chip && t < WL_R7.out1 + 0.4) {
    const P = pop(t, WL_R7.chip), op = P.op * (1 - seg(t, WL_R7.out1 - 0.1, WL_R7.out1 + 0.3));
    if (op > 0.003) { const cx = 3632, cy = 186; g.save(); g.globalAlpha *= op; g.translate(cx, cy + P.dy * 0.5); g.scale(P.s, P.s);
      g.fillStyle = C.ink; sh(14, 6, 0.2); rr(-36, -21, 72, 42, 21); g.fill(); noSh(); T('+1', 0, 10, { f: F(27, 600), c: '#fff', al: 'center' }); g.restore(); }
  }
  if (t > WL_R7.ghost && t < WL_R7.out1 + 0.05) {
    const k = ease.cubicOut(seg(t, WL_R7.ghost, WL_R7.ghost + 0.45)) * out, dy = -16 * (1 - out) + 8 * (1 - ease.cubicOut(seg(t, WL_R7.ghost, WL_R7.ghost + 0.6)));
    if (k > 0.003) { g.save(); g.globalAlpha *= k; g.translate(0, dy); WL_dashGhost(WL_G43, t); g.restore(); }
  }
  g.restore();
}
function WL_dashGhost(m, t) {         // a digit outline drawn as a thin dashed red line: dashed fat stroke, hollowed with the board white
  const h = m.h, lw = WL_LW, pass = (fn) => { for (const it of m.items) { g.save(); g.transform(h, 0, -WL_SLANT * h, h, m.X + h * (it.ox + WL_SLANT), m.Y + h * it.oy); g.lineCap = 'round'; g.lineJoin = 'round'; fn(it); g.restore(); } };
  g.save(); g.globalAlpha *= 0.09; pass(it => { g.strokeStyle = C.red; g.lineWidth = lw; g.beginPath(); WL_range(it.S, 0, it.S.L); g.stroke(); }); g.restore();
  pass(it => { g.strokeStyle = C.red; g.setLineDash([0.05, 0.034]); g.lineDashOffset = -t * 0.04; g.lineWidth = lw + 0.026; g.beginPath(); WL_range(it.S, 0, it.S.L); g.stroke(); });
  pass(it => { g.strokeStyle = '#fbfbfc'; g.globalAlpha *= 0.92; g.lineWidth = lw - 0.004; g.beginPath(); WL_range(it.S, 0, it.S.L); g.stroke(); });
  g.save(); g.globalAlpha *= 0.06; pass(it => { g.strokeStyle = C.red; g.lineWidth = lw * 0.9; g.beginPath(); WL_range(it.S, 0, it.S.L); g.stroke(); }); g.restore();
}
function WL_boardSheen(t) {
  const S = WL_SURF; if (!onScreen(S.x, S.y, S.w, S.h, 40)) return;
  g.save(); g.beginPath(); g.rect(S.x, S.y, S.w, S.h); g.clip();
  const sg = g.createLinearGradient(S.x + 80, S.y - 60, S.x + 520, S.y + S.h + 80);
  sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.36, 'rgba(255,255,255,0)'); sg.addColorStop(0.45, 'rgba(255,255,255,0.17)'); sg.addColorStop(0.52, 'rgba(255,255,255,0.05)'); sg.addColorStop(0.58, 'rgba(255,255,255,0.12)'); sg.addColorStop(0.7, 'rgba(255,255,255,0)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = sg; g.fillRect(S.x, S.y, S.w, S.h);
  const vg = g.createLinearGradient(0, S.y, 0, S.y + S.h); vg.addColorStop(0, 'rgba(255,255,255,0.12)'); vg.addColorStop(0.5, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(30,34,44,0.035)'); g.fillStyle = vg; g.fillRect(S.x, S.y, S.w, S.h);
  g.restore();
}

// ── the marker tray: two capped markers and an eraser lie in it ──
const WL_TRAY = { x: BOARD.x + 36, y: BOARD.y + BOARD.h - 8, w: BOARD.w - 72 };
const WL_TK = { k: { x: 3640, y: 497 }, b: { x: 3802, y: 497 }, e: { x: 3990, y: 488 } };
function WL_markerSide(x, y, ink, { rot = 0, s = 1, op = 1 } = {}) {
  if (op <= 0.003) return; const L = 142, D = 17, col = ink === 'b' ? C.blue : '#1b1b20';
  g.save(); g.globalAlpha *= op; g.translate(x, y); g.rotate(rot); g.scale(s, s);
  const cyl = (x0, w, fill, r = 3, ext = 0) => { g.fillStyle = fill; rr(x0, -D / 2 - ext, w, D + 2 * ext, r); g.fill();
    const sg = g.createLinearGradient(0, -D / 2 - ext, 0, D / 2 + ext); sg.addColorStop(0, 'rgba(255,255,255,0.55)'); sg.addColorStop(0.28, 'rgba(255,255,255,0.08)'); sg.addColorStop(0.62, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,0.26)');
    g.fillStyle = sg; rr(x0, -D / 2 - ext, w, D + 2 * ext, r); g.fill(); };
  cyl(-L / 2 + 30, L - 36, '#f4f4f6', 2);
  cyl(L / 2 - 50, 22, col, 0); T('dry erase', L / 2 - 64, 2.6, { f: F(5.2, 600), c: C.mute, al: 'right' });
  cyl(L / 2 - 8, 8, col, 2.6, -1);
  cyl(-L / 2, 40, col, 6, 1.2);
  for (let i = 0; i < 4; i++) ln(-L / 2 + 34 - i * 3.2, -D / 2 - 0.6, -L / 2 + 34 - i * 3.2, D / 2 + 0.6, { c: 'rgba(255,255,255,0.2)', w: 0.8, cap: 'butt' });
  g.fillStyle = 'rgba(255,255,255,0.35)'; rr(-L / 2 + 8, -D / 2 - 3.2, 22, 3.6, 1.8); g.fill();
  g.lineWidth = 0.8; g.strokeStyle = 'rgba(13,13,15,0.25)'; rr(-L / 2, -D / 2 - 1.2, L, D + 2.4, 5); g.stroke();
  g.restore();
}
function WL_eraserSide(x, y, op = 1) {
  if (op <= 0.003) return; g.save(); g.globalAlpha *= op; g.translate(x, y);
  g.fillStyle = '#8b8b91'; rr(-62, 4, 124, 13, 2); g.fill(); g.save(); g.globalAlpha *= 0.25; for (let i = 0; i < 30; i++) ln(-60 + i * 4.1, 6, -59 + i * 4.1, 16, { c: '#fff', w: 0.6 }); g.restore();
  const hg = g.createLinearGradient(0, -18, 0, 6); hg.addColorStop(0, '#45454b'); hg.addColorStop(0.3, '#26262b'); hg.addColorStop(1, '#141417'); g.fillStyle = hg; rr(-60, -18, 120, 24, 9); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.16)'; rr(-50, -15, 100, 4, 2); g.fill(); ln(-40, -3, 40, -3, { c: 'rgba(255,255,255,0.12)', w: 1 });
  g.restore();
}
function WL_tray(t) {
  const T_ = WL_TRAY; if (!onScreen(T_.x, T_.y - 40, T_.w, 80, 40)) return;
  // things lying in the tray (behind its front lip)
  const pick = (t0) => ({ dy: -36 * WL_cubeIn(seg(t, t0, t0 + 0.24)), op: 1 - seg(t, t0 + 0.08, t0 + 0.24) });
  const back = (t0) => { const k = spring(t - t0, 0.55, 22); return { dy: -40 * (1 - k), op: clamp((t - t0) / 0.08) }; };
  const st = (inT) => (t < 19.02 ? { dy: 0, op: 1 } : t < 30.0 ? pick(19.02) : back(30.02));
  const sk = st(), sb = st();
  if (t < A_.tRule) WL_markerSide(WL_TK.k.x, WL_TK.k.y + sk.dy, 'k', { op: sk.op });
  WL_markerSide(WL_TK.b.x, WL_TK.b.y + sb.dy, 'b', { op: sb.op });
  const eOp = t < 39.9 ? 1 : t < 42.2 ? 1 - seg(t, 39.9, 40.0) : seg(t, 42.2, 42.3);
  WL_eraserSide(WL_TK.e.x, WL_TK.e.y, eOp);
  // the tray's lip
  const lg = g.createLinearGradient(0, T_.y, 0, T_.y + 22); lg.addColorStop(0, '#fbfbfc'); lg.addColorStop(0.18, '#d8dade'); lg.addColorStop(0.7, '#c2c4c9'); lg.addColorStop(1, '#9a9da3');
  g.save(); sh(12, 6, 0.16); g.fillStyle = lg; rr(T_.x, T_.y, T_.w, 22, 4); g.fill(); noSh(); g.restore();
  ln(T_.x + 4, T_.y + 1.5, T_.x + T_.w - 4, T_.y + 1.5, { c: '#fff', w: 1.4, op: 0.9 });
  g.save(); g.strokeStyle = 'rgba(13,13,15,0.2)'; g.lineWidth = 1; rr(T_.x, T_.y, T_.w, 22, 4); g.stroke(); g.restore();
}
// R9: at "rule" the black marker leaves the tray and hops into the teacher's hand
const WL_HOP = { t0: A_.tRule, t1: A_.tRule + 0.42, to: { x: TEACHER.x + 30, y: TEACHER.y - 10 } };
function WL_markerHop(t) {
  if (t < WL_HOP.t0 || t > WL_HOP.t1 + 0.05) return;
  const H = OM.hop(t, WL_HOP.t0, WL_HOP.t1, WL_TK.k, WL_HOP.to, { height: 150, curve: ease.cubicInOut }), up = Math.sin(H.k * Math.PI);
  if (!onScreen(H.x - 120, H.y - 120, 240, 240, 60)) return;
  g.save(); g.shadowColor = 'rgba(24,20,10,0.22)'; g.shadowBlur = (6 + 28 * up) * ZS * DPR; g.shadowOffsetX = 6 * up * ZS * DPR; g.shadowOffsetY = (4 + 26 * up) * ZS * DPR;
  WL_markerSide(H.x, H.y, 'k', { rot: lerp(0, -1.05, ease.cubicOut(H.k)) + 0.35 * up, s: 1 + 0.16 * up, op: 1 - seg(t, WL_HOP.t1 - 0.03, WL_HOP.t1 + 0.04) });
  g.restore();
}
// R10: a small engraved plaque on the board's top rail
function WL_plaque(t) {
  if (t < A_.tTouch - 0.05) return; const cx = BOARD.x + BOARD.w / 2, cy = BOARD.y + 8, w = 470, h = 54;
  if (!onScreen(cx - w / 2, cy - h / 2, w, h, 40)) return;
  const P = pop(t, A_.tTouch, { rise: 10, s0: 0.86, ds: 0.14 }); if (P.op <= 0.003) return;
  g.save(); g.globalAlpha *= P.op; g.translate(cx, cy + P.dy * 0.4); g.scale(P.s, P.s);
  const pg = g.createLinearGradient(0, -h / 2, 0, h / 2); pg.addColorStop(0, '#f7f7f8'); pg.addColorStop(0.5, '#d9dbdf'); pg.addColorStop(1, '#b8bbc1');
  sh(10, 5, 0.2); g.fillStyle = pg; rr(-w / 2, -h / 2, w, h, 8); g.fill(); noSh();
  g.save(); g.globalAlpha *= 0.22; for (let i = 0; i < 14; i++) ln(-w / 2 + 6, -h / 2 + 3 + i * 2.6, w / 2 - 6, -h / 2 + 3 + i * 2.6, { c: '#fff', w: 0.5 }); g.restore();
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1; rr(-w / 2 + 1, -h / 2 + 1, w - 2, h - 2, 7); g.stroke(); g.strokeStyle = 'rgba(13,13,15,0.25)'; rr(-w / 2, -h / 2, w, h, 8); g.stroke();
  for (const sx of [-w / 2 + 18, w / 2 - 18]) { const sg = g.createRadialGradient(sx - 1.5, -1.5, 0.5, sx, 0, 5); sg.addColorStop(0, '#ffffff'); sg.addColorStop(1, '#8e9197'); g.fillStyle = sg; g.beginPath(); g.arc(sx, 0, 4.6, 0, WL_TAU); g.fill(); ln(sx - 2.8, 1.6, sx + 2.8, -1.6, { c: 'rgba(13,13,15,0.5)', w: 0.9 }); }
  T('only the teacher writes here', 0, 11, { f: F(27, 600), c: 'rgba(255,255,255,0.85)', al: 'center', ls: 0.4 });
  T('only the teacher writes here', 0, 9.6, { f: F(27, 600), c: '#34363c', al: 'center', ls: 0.4 });
  g.restore();
}

// ═════════════════════════════ hands (line art, white skin, coloured sleeves) ═════════════════════════════
// canonical right hand seen from its back: the tool tip at (0,0), the hand below it (+y). Path2D built once.
let WL_HP = null;
function WL_handPaths() {
  if (WL_HP) return WL_HP;
  const cap = (p, x0, y0, x1, y1, w) => { const L = Math.hypot(x1 - x0, y1 - y0), a = Math.atan2(y1 - y0, x1 - x0), q = new Path2D(); q.roundRect(-w / 2, -w / 2, L + w, w, w / 2); p.addPath(q, new DOMMatrix().translate(x0, y0).rotate(a * 180 / Math.PI)); };
  const skin = new Path2D();
  cap(skin, -26, 196, -32, 640, 82);
  const bh = new Path2D(); bh.roundRect(-84, 108, 116, 112, [44, 30, 46, 40]); skin.addPath(bh);
  cap(skin, -70, 128, -73, 152, 19); cap(skin, -57, 106, -62, 138, 21); cap(skin, -35, 82, -46, 126, 23);
  cap(skin, -5, 42, -13, 74, 22); cap(skin, -13, 74, -24, 120, 24);
  cap(skin, 15, 52, 27, 88, 24); cap(skin, 27, 88, 40, 146, 29);
  const sleeve = new Path2D(); sleeve.moveTo(-82, 262); sleeve.quadraticCurveTo(-30, 250, 20, 258); sleeve.lineTo(26, 660); sleeve.lineTo(-90, 660); sleeve.closePath();
  const cuff = new Path2D(); cuff.moveTo(-80, 246); cuff.quadraticCurveTo(-30, 234, 18, 242); cuff.lineTo(20, 266); cuff.quadraticCurveTo(-30, 258, -82, 270); cuff.closePath();
  const det = new Path2D();
  det.ellipse(-6.6, 50, 5.4, 7.6, -0.25, 0, WL_TAU);                        // index nail
  det.moveTo(13.5, 54); det.ellipse(17.6, 60, 5.6, 7.8, -0.33, Math.PI * 1.1, Math.PI * 2.1);  // thumb nail
  for (const [x, y] of [[-24, 118], [-46, 124], [-62, 134]]) { det.moveTo(x - 4, y - 1); det.quadraticCurveTo(x, y - 4, x + 4, y - 1); }
  det.moveTo(-17, 70); det.lineTo(-8, 72); det.moveTo(-17.5, 76); det.lineTo(-9, 78);
  WL_HP = { skin, sleeve, cuff, det }; return WL_HP;
}
function WL_sh(c, blur, dx, dy, a) { c.shadowColor = `rgba(24,20,10,${a})`; c.shadowBlur = Math.min(240, blur * ZS) * DPR; c.shadowOffsetX = dx * ZS * DPR; c.shadowOffsetY = dy * ZS * DPR; }
function WL_noSh(c) { c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetX = 0; c.shadowOffsetY = 0; }
function WL_markerTool(c, ink) {       // an uncapped whiteboard marker, tip at (0,0), body along +y
  const col = ink === 'b' ? C.blue : '#1b1b20', edge = ink === 'b' ? '#123fc4' : '#000';
  c.lineJoin = 'round'; c.lineWidth = 2.2; c.strokeStyle = C.ink;
  c.beginPath(); c.moveTo(-10.5, 28); c.lineTo(10.5, 28); c.lineTo(10.5, 210); c.lineTo(-10.5, 210); c.closePath();
  const bg = c.createLinearGradient(-10.5, 0, 10.5, 0); bg.addColorStop(0, '#c6c7cc'); bg.addColorStop(0.35, '#ffffff'); bg.addColorStop(0.7, '#eeeef1'); bg.addColorStop(1, '#b4b6bb'); c.fillStyle = bg; c.fill(); c.stroke();
  c.fillStyle = col; c.fillRect(-10.5, 62, 21, 60); c.fillStyle = 'rgba(255,255,255,0.28)'; c.fillRect(-4.5, 62, 3, 60); c.fillStyle = 'rgba(255,255,255,0.85)'; c.fillRect(-10.5, 58, 21, 3);
  c.beginPath(); c.moveTo(-5.5, 10); c.lineTo(5.5, 10); c.lineTo(10.5, 28.5); c.lineTo(-10.5, 28.5); c.closePath();
  const ng = c.createLinearGradient(-10, 0, 10, 0); ng.addColorStop(0, '#b9bbc0'); ng.addColorStop(0.4, '#f7f7f8'); ng.addColorStop(1, '#a6a9ae'); c.fillStyle = ng; c.fill(); c.stroke();
  c.beginPath(); c.moveTo(-4.2, 11); c.quadraticCurveTo(-4.4, 2.2, 0, 0); c.quadraticCurveTo(4.4, 2.2, 4.2, 11); c.closePath(); c.fillStyle = col; c.fill(); c.lineWidth = 1.6; c.strokeStyle = edge; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(-1.4, 5.5, 0.9, 3.4, 0.2, 0, WL_TAU); c.fill();
}
function WL_eraserTool(c, ang) {      // a felt eraser held flat on the board, centred on (0,0)
  c.save(); c.rotate(-ang * 0.85); c.lineJoin = 'round';
  c.fillStyle = '#8b8b91'; c.beginPath(); c.roundRect(-70, -30, 140, 60, 14); c.fill();
  const hg = c.createLinearGradient(0, -26, 0, 26); hg.addColorStop(0, '#4a4a50'); hg.addColorStop(0.35, '#2a2a2f'); hg.addColorStop(1, '#151518');
  c.fillStyle = hg; c.beginPath(); c.roundRect(-66, -26, 132, 52, 13); c.fill(); c.lineWidth = 3; c.strokeStyle = C.ink; c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.14)'; c.beginPath(); c.roundRect(-54, -21, 108, 6, 3); c.fill(); c.restore();
}
// o: {x, y, ang, mir, tool: 'marker'|'eraser', ink, sleeve, shirt, lift, op}
const WL_HS = 0.64;                  // hand scale vs the 190-unit digits
function WL_handDraw(c, o) {
  if (!o || o.op <= 0.003) return; const P = WL_handPaths(), s = WL_HS * (1 + 0.025 * o.lift);
  c.save(); c.globalAlpha = o.op; c.translate(o.x, o.y); c.rotate(o.ang); if (o.mir) c.scale(-1, 1); c.scale(s, s);
  // cast shadow on the board (light from the upper left)
  c.save(); WL_sh(c, 16 + 22 * o.lift, 9 + 12 * o.lift, 13 + 16 * o.lift, 0.2 - 0.05 * o.lift); c.fillStyle = '#fff'; c.fill(P.skin); c.fill(P.sleeve);
  if (o.tool === 'marker') { c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(4.4, 2.2, 4.2, 11); c.lineTo(10.5, 28); c.lineTo(10.5, 210); c.lineTo(-10.5, 210); c.lineTo(-10.5, 28); c.lineTo(-4.2, 11); c.quadraticCurveTo(-4.4, 2.2, 0, 0); c.fill(); }
  c.restore();
  if (o.tool === 'marker') WL_markerTool(c, o.ink); else if (o.tool === 'eraser') { c.save(); if (o.mir) c.scale(-1, 1); WL_sh(c, 10, 6, 8, 0.2); WL_eraserTool(c, o.ang * (o.mir ? -1 : 1)); c.restore(); }
  c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = C.ink; c.lineWidth = 5.4; c.stroke(P.skin); c.stroke(P.sleeve);
  c.fillStyle = '#ffffff'; c.fill(P.skin);
  c.save(); c.clip(P.skin); const sg = c.createLinearGradient(-90, 0, 50, 0); sg.addColorStop(0, 'rgba(13,13,15,0)'); sg.addColorStop(0.6, 'rgba(13,13,15,0.015)'); sg.addColorStop(1, 'rgba(13,13,15,0.08)'); c.fillStyle = sg; c.fillRect(-120, -20, 200, 700);
  const tg = c.createLinearGradient(0, 100, 0, 230); tg.addColorStop(0, 'rgba(255,255,255,0)'); tg.addColorStop(1, 'rgba(13,13,15,0.04)'); c.fillStyle = tg; c.fillRect(-120, 100, 200, 160); c.restore();
  c.fillStyle = o.sleeve; c.fill(P.sleeve);
  c.save(); c.clip(P.sleeve); const vg = c.createLinearGradient(-90, 0, 26, 0); vg.addColorStop(0, 'rgba(255,255,255,0.10)'); vg.addColorStop(0.5, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.16)'); c.fillStyle = vg; c.fillRect(-100, 240, 140, 440);
  c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-80, 284); c.quadraticCurveTo(-30, 274, 22, 281); c.stroke();
  c.strokeStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.moveTo(-60, 340); c.quadraticCurveTo(-46, 380, -50, 430); c.stroke(); c.restore();
  if (o.shirt) { c.fillStyle = o.shirt; c.fill(P.cuff); c.lineWidth = 2.6; c.stroke(P.cuff); }
  c.lineWidth = 1.5; c.strokeStyle = 'rgba(13,13,15,0.32)'; c.stroke(P.det);
  c.lineWidth = 1.2; c.strokeStyle = 'rgba(13,13,15,0.13)'; c.beginPath(); c.moveTo(-28, 132); c.quadraticCurveTo(-31, 165, -30, 198); c.moveTo(-49, 138); c.quadraticCurveTo(-46, 170, -42, 200); c.stroke();
  c.restore();
}
let WL_OFF = null;
function WL_off() { if (!WL_OFF || WL_OFF.width !== cv.width || WL_OFF.height !== cv.height) { WL_OFF = document.createElement('canvas'); WL_OFF.width = cv.width; WL_OFF.height = cv.height; } return WL_OFF.getContext('2d'); }
// a tip path: knots (spline) with windows where the tip is driven by a mark or a wipe; blends in and out
function WL_track(t, knots, writes) {
  let p = OM.spline(knots, t), down = false, inW = false;
  for (const w of writes) {
    if (t >= w.t0 - 0.12 && t <= w.t1 + 0.14) {
      const tip = w.fn(clamp(t, w.t0, w.t1)), k = t < w.t0 ? ease.smoother(seg(t, w.t0 - 0.12, w.t0)) : t > w.t1 ? 1 - ease.smoother(seg(t, w.t1, w.t1 + 0.14)) : 1;
      p = [lerp(p[0], tip.x, k), lerp(p[1], tip.y, k)]; if (k >= 1) { inW = true; down = tip.down; }
    }
  }
  return { x: p[0], y: p[1], down, inW };
}
const WL_K = a => a.map(([t, x, y]) => ({ t, x, y }));
// R6b: Minji's palm wipes the 41 (right to left), then both write 42 on the same spot
const WL_PALM_M = [114 * 0.64, 121 * 0.64];
function WL_minjiWipe(t) { const f = WL_front(WL_M.k41, t), u = seg(t, WL_RACE.wipe0, WL_RACE.wipe1), py = 322 + 62 * Math.sin(u * Math.PI * 3); return { x: f + 26 - WL_PALM_M[0], y: py - WL_PALM_M[1], down: false }; }
const WL_HAND_DEF = {
  you: { win: [19.3, 21.25], knots: WL_K([[19.3, 3290, 790], [19.62, 3470, 330], [19.76, 3588, 236], [20.5, 3770, 414], [20.78, 3720, 470], [21.25, 3260, 820]]),
    writes: [{ t0: WL_RACE.b0, t1: WL_RACE.b1, fn: WL_tipOf(WL_M.b42) }], ang: t => 0.62 + 0.04 * Math.sin(t * 7.3), mir: false, tool: 'marker', ink: 'b', sleeve: C.blue },
  minji: { win: [19.1, 21.3], knots: WL_K([[19.1, 4190, 780], [19.38, 3705, 212], [19.7, 3392, 205], [19.82, 3560, 222], [20.58, 3775, 418], [20.9, 3880, 470], [21.3, 4210, 800]]),
    writes: [{ t0: WL_RACE.wipe0, t1: WL_RACE.wipe1, fn: WL_minjiWipe }, { t0: WL_RACE.k0, t1: WL_RACE.k1, fn: WL_tipOf(WL_M.k42) }], ang: t => -0.6 + 0.04 * Math.sin(t * 6.1 + 1), mir: true, tool: 'marker', ink: 'k', sleeve: '#1c1c21' },
};
// R14: the teacher's left hand wipes the last digit with the eraser, her right hand writes the next one
function WL_eraseFn(m) { return t => { const f = WL_front(m, t), u = seg(t, m.wipe[0], m.wipe[1]); return { x: f - 34, y: 318 + 66 * Math.sin(u * Math.PI * 3), down: true }; }; }
const WL_TL = [WL_M.r41, WL_M.t2, WL_M.t3];
const WL_TEACH_DEF = {
  left: { win: [39.95, 42.2], knots: WL_K([[39.95, 3400, 720], [40.25, 3560, 445], [40.62, 3572, 452], [40.85, 3575, 450], [41.18, 3570, 455], [41.37, 3572, 452], [41.72, 3560, 460], [42.2, 3380, 740]]),
    writes: WL_TL.map(m => ({ t0: m.wipe[0], t1: m.wipe[1], fn: WL_eraseFn(m) })), ang: t => 0.42 + 0.03 * Math.sin(t * 5), mir: false, tool: 'eraser', sleeve: '#57524c', shirt: '#ffffff' },
  right: { win: [40.0, 42.45], knots: WL_K([[40.0, 4000, 730], [40.4, 3700, 300], [40.83, 3770, 415], [40.97, 3842, 372], [41.03, 3838, 360], [41.4, 3770, 415], [41.5, 3842, 372], [41.55, 3836, 360], [41.92, 3772, 415], [42.08, 3830, 440], [42.45, 4010, 740]]),
    writes: [WL_M.t2, WL_M.t3, WL_M.t4].map(m => ({ t0: m.w[0], t1: m.w[1], fn: WL_tipOf(m) })), ang: t => -0.52 + 0.035 * Math.sin(t * 6.4), mir: true, tool: 'marker', ink: 'k', sleeve: '#57524c', shirt: '#ffffff' },
};
function WL_handState(D, t) {
  if (t < D.win[0] || t > D.win[1]) return null; const p = WL_track(t, D.knots, D.writes);
  return { x: p.x, y: p.y, ang: D.ang(t), mir: D.mir, tool: D.tool, ink: D.ink, sleeve: D.sleeve, shirt: D.shirt, lift: p.inW ? (p.down ? 0 : 0.5) : 1, op: 1 };
}
// is the teacher's hand at the board? (class.js can hide its own copy of her marker meanwhile)
SHARED.WL_teacherAtBoard = t => t >= WL_TEACH_DEF.right.win[0] && t <= WL_TEACH_DEF.right.win[1];
function WL_hands(t) {
  const list = [WL_handState(WL_TEACH_DEF.left, t), WL_handState(WL_TEACH_DEF.right, t), WL_handState(WL_HAND_DEF.you, t), WL_handState(WL_HAND_DEF.minji, t)].filter(Boolean);
  if (!list.length || !onScreen(BOARD.x - 300, BOARD.y, BOARD.w + 600, 700, 100)) return;
  const c = WL_off(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, WL_OFF.width, WL_OFF.height); c.setTransform(g.getTransform());
  for (const h of list) WL_handDraw(c, h);
  // arms come up from where the people stand: fade them into the wall's foot
  const P = [[0, 0], [W, 0], [0, H], [W, H]].map(([sx, sy]) => OM.unproject(VIEW, sx, sy)), xs = P.map(p => p[0]), ys = P.map(p => p[1]);
  c.save(); c.globalCompositeOperation = 'destination-in'; const fg = c.createLinearGradient(0, 520, 0, 598); fg.addColorStop(0, 'rgba(0,0,0,1)'); fg.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = fg; c.fillRect(Math.min(...xs) - 10, Math.min(...ys) - 10, Math.max(...xs) - Math.min(...xs) + 20, Math.max(...ys) - Math.min(...ys) + 20); c.restore();
  g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(WL_OFF, 0, 0); g.restore();
}

// ═════════════════════════════ R8 · the race-condition card (grows out of the board) ═════════════════════════════
const WL_CARD = { x: 3300, y: -52, w: 940, h: 700, r: 30 };
const WL_RC = { t0: A_.tEng + 0.02, t1: A_.tEng + 0.6, ph0: A_.tEng + 0.72, ph1: A_.tRace + 0.02, title: A_.tRace - 0.15, f0: T1('R8') + 0.05, f1: T1('R8') + 0.5 };
const WL_PHX = [220, 890];
function WL_ph(t) { const u = seg(t, WL_RC.ph0, WL_RC.ph1); return lerp(WL_PHX[0], WL_PHX[1], lerp(u, ease.sineInOut(u), 0.35)); }
function WL_phT(x) {                  // time the playhead reaches x (inverse, by bisection)
  let lo = WL_RC.ph0, hi = WL_RC.ph1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (WL_ph(m) < x) lo = m; else hi = m; } return hi;
}
function WL_race(t) {
  if (t < WL_RC.t0 || t > WL_RC.f1 + 0.02) return;
  const A = { x: BOARD.x, y: BOARD.y, w: BOARD.w, h: BOARD.h, r: 10 }, B = WL_CARD;
  let R, k, cop;
  if (t < WL_RC.f0) { R = OM.morphRect(t, WL_RC.t0, WL_RC.t1, A, B, { curve: ease.expoOut }); k = R.k; cop = clamp((t - WL_RC.t0 - 0.16) / 0.22); }
  else { R = OM.morphRect(t, WL_RC.f0, WL_RC.f1, B, A, { curve: WL_cubeIn }); k = 1 - R.k; cop = 1 - seg(t, WL_RC.f0 + 0.2, WL_RC.f0 + 0.36); }
  if (!onScreen(R.x, R.y, R.w, R.h, 140)) return;
  const op = t < WL_RC.f0 ? clamp((t - WL_RC.t0) / 0.07) : 1 - seg(t, WL_RC.f1 - 0.08, WL_RC.f1);
  plate(R.x, R.y, R.w, R.h, R.r, { lift: 0.6 + 2.0 * k, op });
  if (cop <= 0.003) return;
  const s = R.w / B.w;
  g.save(); g.beginPath(); rr(R.x, R.y, R.w, R.h, R.r); g.clip(); g.translate(R.x, R.y + (R.h - B.h * s) / 2); g.scale(s, s); g.globalAlpha *= cop;
  WL_raceContent(t); g.restore();
}
function WL_raceContent(t) {
  const ph = WL_ph(t), past = x => t >= WL_RC.ph0 && ph >= x, at = x => WL_phT(x);
  T('WHAT THE BOARD SAW', 60, 74, { f: F(19, 600), c: C.mute, ls: 2.4 });
  // title (never bold-black): SF Pro 600, a thin underline drawn on
  if (t >= WL_RC.title) { const P = pop(t, WL_RC.title, { rise: 14 }), tf = F(60, 600), w = tw('race condition', tf);
    g.save(); g.globalAlpha *= P.op; g.translate(0, P.dy * 0.6); T('race condition', 60, 150, { f: tf, c: C.ink, ls: -0.6 });
    const u = ease.cubicOut(seg(t, WL_RC.title + 0.12, WL_RC.title + 0.5)); if (u > 0) ln(62, 172, 62 + (w - 4) * u, 172, { c: C.ink, w: 2.6 }); g.restore(); }
  const lanes = [{ name: 'You', y: 254, c: C.blue, w0: 470, w1: 650 }, { name: 'Minji', y: 372, c: C.ink, w0: 570, w1: 750 }];
  const L0 = WL_PHX[0];
  // lanes
  lanes.forEach((L, i) => {
    const P = pop(t, WL_RC.t1 - 0.12 + i * 0.07, { rise: 12 }); g.save(); g.globalAlpha *= P.op; g.translate(0, P.dy * 0.5);
    g.fillStyle = L.c; g.beginPath(); g.arc(72, L.y - 1, 8.5, 0, WL_TAU); g.fill();
    T(L.name, 92, L.y + 10, { f: F(30, 600), c: L.c }); g.restore();
    const tr = clamp((ph - L0) / (WL_PHX[1] - L0)); if (t >= WL_RC.ph0) ln(L0, L.y, lerp(L0, WL_PHX[1], tr), L.y, { c: 'rgba(13,13,15,0.12)', w: 1.6 });
  });
  // the shared moment both read
  if (past(236)) {
    const t0 = at(236), dl = ease.cubicOut(seg(t, t0 + 0.04, t0 + 0.32));
    g.save(); g.setLineDash([7, 7]); ln(236, 205, 236, lerp(205, 414, dl), { c: C.mute, w: 2 }); g.restore();
    T('both read 41', 250, 444, { f: F(22, 500), c: C.ink2, op: seg(t, t0 + 0.12, t0 + 0.3) });
    lanes.forEach((L, i) => { const P = pop(t, t0 + i * 0.02, { rise: 10 }); g.save(); g.globalAlpha *= P.op; g.translate(316, L.y + P.dy * 0.4); g.scale(P.s, P.s);
      plate(-80, -30, 160, 60, 15, { lift: 0.35 }); T('read', -62, 8, { f: F(22, 500), c: C.mute }); T('41', 62, 10, { f: FM(28, 600), c: C.ink, al: 'right' }); g.restore(); });
  }
  // writes grow with the playhead
  lanes.forEach(L => {
    if (!past(L.w0)) return; const x1 = Math.min(ph, L.w1), w = x1 - L.w0; if (w < 2) return;
    g.save(); sh(16, 7, 0.16); g.fillStyle = L.c; rr(L.w0, L.y - 30, w, 60, 15); g.fill(); noSh();
    g.beginPath(); rr(L.w0, L.y - 30, w, 60, 15); g.clip(); T('write', L.w0 + 18, L.y + 8, { f: F(22, 500), c: 'rgba(255,255,255,0.72)' }); T('42', L.w0 + 162, L.y + 10, { f: FM(28, 600), c: '#fff', al: 'right' }); g.restore();
  });
  // axis
  if (t >= WL_RC.ph0 - 0.1) { const a = ease.cubicOut(seg(t, WL_RC.ph0 - 0.1, WL_RC.ph0 + 0.35));
    ln(L0, 474, lerp(L0, WL_PHX[1], a), 474, { c: 'rgba(13,13,15,0.3)', w: 1.6 });
    for (let i = 0; i < 10; i++) { const x = 236 + i * 67, o = seg(a, i / 10, i / 10 + 0.1); ln(x, 468, x, 480, { c: 'rgba(13,13,15,0.3)', w: 1.4, op: o }); T(i === 9 ? '90 ms' : String(i * 10), x, 503, { f: FM(16, 500), c: C.mute, al: i === 9 ? 'center' : 'center', op: o }); } }
  // the board's value through time
  T('board', 60, 586, { f: F(30, 600), c: C.ink, op: seg(t, WL_RC.ph0 - 0.1, WL_RC.ph0 + 0.15) });
  const cells = [{ x0: 236, x1: 650, v: '41', fill: '#ffffff', tc: C.ink }, { x0: 650, x1: 750, v: '42', fill: C.blueSoft, tc: C.blue }, { x0: 750, x1: 890, v: '42', fill: C.ink, tc: '#fff' }];
  cells.forEach((cl, i) => {
    if (!past(cl.x0 - 1)) return; const xe = Math.min(ph, cl.x1), w = xe - cl.x0 - 4; if (w < 3) return;
    const land = at(cl.x0), I = i ? OM.impact(t, land, { sqx: 0.06, sqy: 0.1 }) : { sx: 1, sy: 1 };
    g.save(); g.translate(cl.x0 + 2, 576); g.scale(1, I.sy); g.fillStyle = cl.fill; if (i === 0) { plate(0, -25, w, 50, 12, { lift: 0.3 }); } else { sh(10, 4, 0.14); rr(0, -25, w, 50, 12); g.fill(); noSh(); }
    g.beginPath(); rr(0, -25, w, 50, 12); g.clip(); T(cl.v, 18, 10, { f: FM(26, 600), c: cl.tc }); g.restore();
  });
  // each write lands on the board: a dashed drop
  lanes.forEach(L => {
    if (!past(L.w1)) return; const t0 = at(L.w1), u = ease.cubicOut(seg(t, t0 - 0.02, t0 + 0.16));
    g.save(); g.setLineDash([5, 6]); ln(L.w1, L.y + 30, L.w1, lerp(L.y + 30, 546, u), { c: L.c, w: 2.2 }); g.restore();
    if (u > 0.95) { g.fillStyle = L.c; g.beginPath(); g.moveTo(L.w1 - 6, 541); g.lineTo(L.w1 + 6, 541); g.lineTo(L.w1, 550); g.closePath(); g.fill(); }
  });
  // the second write lands on top of the first: the first 42 is gone
  if (past(752)) { const t0 = at(752), k = ease.cubicOut(seg(t, t0 + 0.05, t0 + 0.3));
    g.save(); g.globalAlpha *= k; g.strokeStyle = C.red; g.lineWidth = 2.4; g.lineCap = 'round'; g.beginPath(); g.moveTo(664, 590 - 4); g.lineTo(lerp(664, 700, k), lerp(586, 566, k)); g.stroke(); g.restore();
    T('overwritten', 700, 626, { f: F(17, 500), c: C.red, al: 'center', op: k }); }
  // playhead
  if (t >= WL_RC.ph0 && t < WL_RC.ph1 + 0.35) { const o = 1 - seg(t, WL_RC.ph1, WL_RC.ph1 + 0.3);
    ln(ph, 200, ph, 604, { c: C.ink, w: 1.6, op: 0.5 * o }); g.save(); g.globalAlpha *= o; g.fillStyle = C.ink; rr(ph - 7, 188, 14, 20, 7); g.fill(); g.restore(); }
  // result
  if (t >= WL_RC.title + 0.28) { const P = pop(t, WL_RC.title + 0.28, { rise: 12 }), f = F(31, 600), w1 = tw('board = 42', f);
    g.save(); g.globalAlpha *= P.op; g.translate(0, P.dy * 0.5); T('board = 42', 60, 660, { f, c: C.ink });
    const Q = pop(t, WL_RC.title + 0.52, { rise: 10 }); g.globalAlpha *= Q.op; T('should be 43', 60 + w1 + 30, 660, { f: F(31, 500), c: C.red }); g.restore(); }
}

// ═════════════════════════════ the teacher's notebook + fountain pen ═════════════════════════════
const WL_NB = { x: NOTEBOOK.x, y: NOTEBOOK.y, w: NOTEBOOK.w, h: NOTEBOOK.h, pw: NOTEBOOK.w / 2, top: 15, rows: 16 };
WL_NB.lh = (WL_NB.h - WL_NB.top - 7) / WL_NB.rows;
const WL_NAMES = ['Omar', 'Lina', 'Kai', 'Zoe', 'Sam', 'Noor', 'Ben', 'Mia', 'Yuki', 'Ravi', 'Ella', 'Tom', 'Aya', 'Max', 'Ivy', 'Dev', 'Nora', 'Finn', 'Lea', 'Ali', 'Hana', 'Jack', 'Rosa', 'Eli', 'Maya', 'Theo', 'Sofia', 'Arjun', 'Lily', 'Nico', 'Emma', 'Jun', 'Ines', 'Adam', 'Zara', 'Luca', 'Amir', 'Chloe', 'Ola', 'Ken', 'Ana'];
const WL_TINK = '#1d2334';
const WL_NF = FH(6.4), WL_NFH = FH(7.8);
const WL_R42 = 13;                   // the right page's row for "42. You" (names 29-41 fill rows 0-12)
function WL_row(page, r, col = 0) { return { x: WL_NB.x + page * WL_NB.pw + 10 + col * 57, y: WL_NB.y + WL_NB.top + (r + 1) * WL_NB.lh - 1.5 }; }
const WL_NEW = NB_NEW.map((e, i) => ({ ...e, row: WL_R42 + i, parts: [[`${e.n}. `, WL_TINK], [e.name, e.name === 'You' ? C.blue : WL_TINK]], t0: e.t, t1: e.t + (i === 0 ? 0.92 : i === 1 ? 0.38 : 0.3) }));
const WL_TICKS = [42.48, 42.6, 42.72].map((t0, i) => ({ t0, t1: t0 + 0.09, row: WL_R42 + i }));
const WL_CHKX = 40, WL_X1 = { t0: A_.tOnce - 0.14, t1: A_.tOnce + 0.14, c0: A_.tOnce + 0.16, c1: A_.tOnce + 0.42 };
const WL_HL = { t0: A_.tAlready, t1: A_.tAlready + 0.36 };
const WL_TICK_PTS = WL_mkStroke([[[-2.3, -0.3], [-0.6, 1.8]], [[-0.6, 1.8], [1.0, -0.4], [2.9, -2.9]]]);
function WL_tickAt(row, k, c = g) { const R = WL_row(1, row), x = R.x + WL_CHKX, y = R.y - 2.2; c.save(); c.translate(x, y); c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = WL_TINK; c.lineWidth = 0.62; c.beginPath(); WL_range(WL_TICK_PTS, 0, WL_TICK_PTS.L * k, 0, c); c.stroke(); c.restore();
  const p = WL_at(WL_TICK_PTS, WL_TICK_PTS.L * k); return { x: x + p[0], y: y + p[1] }; }
function WL_writeParts(parts, x, y, k, f) {
  let tot = 0; const ws = parts.map(([s]) => { const w = tw(s, f); tot += w; return w; }); const xe = x + tot * clamp(k);
  if (k > 0) { g.save(); g.beginPath(); g.rect(x - 3, y - 20, xe - x + 3, 30); g.clip(); let cx = x; parts.forEach(([s, c], i) => { T(s, cx, y, { f, c, op: 0.94 }); cx += ws[i]; }); g.restore(); }
  return { x: xe, w: tot };
}
function WL_notebook(t) {
  const N = WL_NB, { x, y, w, h, pw } = N; if (!onScreen(x - 20, y - 20, w + 40, h + 60, 30)) return;
  // black hardcover
  g.save(); sh(16, 6, 0.2); g.fillStyle = '#17171a'; rr(x - 4.5, y - 4, w + 9, h + 8, 3.5); g.fill(); sh(3, 1.2, 0.2); g.fill(); noSh(); g.restore();
  const cg = g.createLinearGradient(x, y - 4, x + w, y + h); cg.addColorStop(0, 'rgba(255,255,255,0.10)'); cg.addColorStop(0.5, 'rgba(255,255,255,0)'); cg.addColorStop(1, 'rgba(255,255,255,0.05)'); g.fillStyle = cg; rr(x - 4.5, y - 4, w + 9, h + 8, 3.5); g.fill();
  // page block edges
  for (let i = 3; i >= 1; i--) { g.fillStyle = i % 2 ? '#d9d3c5' : '#efe9dc'; g.fillRect(x - i * 0.7, y - i * 0.5, w + i * 1.4, h + i * 1.1); }
  // pages: valley shadow at the spine
  for (const pg of [0, 1]) { const px = x + pg * pw, gr = pg ? g.createLinearGradient(px, 0, px + pw, 0) : g.createLinearGradient(px + pw, 0, px, 0);
    gr.addColorStop(0, '#d8d1c2'); gr.addColorStop(0.07, '#ece7db'); gr.addColorStop(0.24, '#f9f6ef'); gr.addColorStop(0.9, '#fcfaf5'); gr.addColorStop(1, '#f4f0e6');
    g.fillStyle = gr; g.fillRect(px, y, pw, h); }
  // ruled lines and margins
  g.save(); g.lineWidth = 0.32; g.strokeStyle = 'rgba(70,95,140,0.22)'; g.beginPath();
  for (let r = 0; r <= N.rows; r++) { const yy = y + N.top + r * N.lh; g.moveTo(x + 3, yy); g.lineTo(x + pw - 4, yy); g.moveTo(x + pw + 4, yy); g.lineTo(x + w - 3, yy); } g.stroke();
  g.strokeStyle = 'rgba(13,13,15,0.13)'; g.beginPath(); g.moveTo(x + 7.5, y + 3); g.lineTo(x + 7.5, y + h - 3); g.moveTo(x + pw + 7.5, y + 3); g.lineTo(x + pw + 7.5, y + h - 3); g.stroke(); g.restore();
  // spine valley + stitches
  ln(x + pw, y + 0.5, x + pw, y + h - 0.5, { c: 'rgba(40,30,10,0.32)', w: 0.7, cap: 'butt' });
  for (let sy = y + 7; sy < y + h - 4; sy += 9.2) { ln(x + pw, sy, x + pw, sy + 4.4, { c: '#9c9484', w: 0.75 }); g.fillStyle = 'rgba(40,30,10,0.35)'; g.beginPath(); g.arc(x + pw, sy - 0.6, 0.35, 0, WL_TAU); g.fill(); }
  // header + the list (41 names), then the new lines
  g.save(); const hx = WL_row(0, 1).x, hy = WL_row(0, 1).y; T('Sara’s drawing – likes', hx, hy, { f: WL_NFH, c: WL_TINK, op: 0.95 });
  const hw = tw('Sara’s drawing – likes', WL_NFH); ln(hx, hy + 1.6, hx + hw, hy + 1.2, { c: WL_TINK, w: 0.45, op: 0.8 });
  const jr = OM.rng(5); WL_NAMES.forEach((nm, i) => { const n = i + 1; let R; if (n <= 28) R = WL_row(0, 2 + ((n - 1) % 14), Math.floor((n - 1) / 14)); else R = WL_row(1, n - 29);
    T(`${n}. ${nm}`, R.x + (jr() - 0.5) * 0.8, R.y + (jr() - 0.5) * 0.5, { f: WL_NF, c: WL_TINK, op: 0.88 }); });
  // R15b: the highlight under your name (drawn before the ink so the ink sits on top)
  if (t > WL_HL.t0) { const R = WL_row(1, WL_R42), wd = tw('42. You', WL_NF) + 3, u = ease.cubicOut(seg(t, WL_HL.t0, WL_HL.t1));
    g.save(); g.globalAlpha *= 0.85; g.fillStyle = 'rgba(37,99,255,0.16)'; rr(R.x - 1.5, R.y - 5.4, wd * u, 7.2, 2.2); g.fill(); g.restore(); }
  for (const e of WL_NEW) { if (t < e.t0) continue; const R = WL_row(1, e.row); WL_writeParts(e.parts, R.x, R.y, seg(t, e.t0, e.t1), WL_NF); }
  if (t > WL_HL.t0) { const R = WL_row(1, WL_R42), wd = tw('42. You', WL_NF) + 2, u = ease.cubicOut(seg(t, WL_HL.t0, WL_HL.t1));
    ln(R.x - 0.5, R.y + 1.5, R.x - 0.5 + wd * u, R.y + 1.1 + Math.sin(u * 6) * 0.15, { c: C.blue, w: 0.55 }); }
  for (const tk of WL_TICKS) if (t > tk.t0) WL_tickAt(tk.row, ease.sineInOut(seg(t, tk.t0, tk.t1)));
  if (t > WL_X1.t0) { const R = WL_row(1, WL_R42), xx = R.x + WL_CHKX + 8; WL_writeParts([['×1', WL_TINK]], xx, R.y + 0.4, seg(t, WL_X1.t0, WL_X1.t1), FH(7.4));
  }
  g.restore();
  // a little page curl at the outer corner
  g.save(); const cx = x + w, cy = y + h; g.beginPath(); g.moveTo(cx - 13, cy); g.quadraticCurveTo(cx - 5, cy - 2, cx, cy - 11); g.lineTo(cx, cy); g.closePath(); g.fillStyle = '#d9d2c3'; g.fill();
  g.beginPath(); g.moveTo(cx - 13, cy); g.quadraticCurveTo(cx - 6.5, cy - 6.5, cx, cy - 11); g.quadraticCurveTo(cx - 8, cy - 9, cx - 13, cy); const lg = g.createLinearGradient(cx - 10, cy - 9, cx - 4, cy - 2); lg.addColorStop(0, '#fffefb'); lg.addColorStop(1, '#ddd6c6');
  sh(3, 1, 0.2); g.fillStyle = lg; g.fill(); noSh(); g.restore();
  // ribbon bookmark
  g.save(); g.lineCap = 'butt'; sh(2.5, 1.2, 0.25); g.strokeStyle = '#1b1b1f'; g.lineWidth = 3.4; g.beginPath(); g.moveTo(x + pw + 2, y + h - 34); g.quadraticCurveTo(x + pw + 5, y + h - 6, x + pw + 9, y + h + 6); g.quadraticCurveTo(x + pw + 12, y + h + 16, x + pw + 10, y + h + 26); g.stroke(); noSh();
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x + pw + 1.4, y + h - 32); g.quadraticCurveTo(x + pw + 4.3, y + h - 6, x + pw + 8.2, y + h + 6); g.stroke();
  g.fillStyle = '#1b1b1f'; g.beginPath(); g.moveTo(x + pw + 8.2, y + h + 25); g.lineTo(x + pw + 11.8, y + h + 27); g.lineTo(x + pw + 10, y + h + 30.5); g.closePath(); g.fill(); g.restore();
}
// the fountain pen: nib tip at (x, y), body along angle `ang`, hovering `hov` units above the paper
function WL_penSil(c) { c.beginPath(); c.moveTo(0, 0); c.lineTo(7, -1.4); c.lineTo(22, -4.1); c.lineTo(22, 4.1); c.lineTo(7, 1.4); c.closePath(); c.roundRect(21, -5.6, 105, 11.2, 5.6); }
function WL_pen(x, y, ang, hov, op = 1) {
  if (op <= 0.003 || !onScreen(x - 140, y - 140, 280, 280, 20)) return;
  g.save(); g.globalAlpha *= op; const cs = Math.cos(ang), sn = Math.sin(ang), D = [0.5, 0.86], k = 0.26 + 0.004 * hov;
  g.save(); g.transform(cs + k * D[0], sn + k * D[1], -sn, cs, x + hov * D[0] * 0.9, y + hov * D[1] * 0.9);
  g.filter = `blur(${Math.max(0.4, (1.5 + hov * 0.3) * ZS * DPR).toFixed(2)}px)`; g.fillStyle = `rgba(24,20,10,${0.26 - 0.008 * hov})`; WL_penSil(g); g.fill(); g.filter = 'none'; g.restore();
  g.translate(x, y); g.rotate(ang); g.lineJoin = 'round';
  // nib
  g.beginPath(); g.moveTo(0, 0); g.lineTo(7, -1.4); g.quadraticCurveTo(16, -3.6, 22.5, -4.1); g.lineTo(22.5, 4.1); g.quadraticCurveTo(16, 3.6, 7, 1.4); g.closePath();
  const ng = g.createLinearGradient(0, -4, 0, 4); ng.addColorStop(0, '#fbfbf8'); ng.addColorStop(0.35, '#d9d9d3'); ng.addColorStop(0.62, '#9a9a93'); ng.addColorStop(1, '#6b6b66'); g.fillStyle = ng; g.fill(); g.lineWidth = 0.35; g.strokeStyle = 'rgba(30,30,30,0.6)'; g.stroke();
  ln(0.9, 0, 13.2, 0, { c: '#2a2a2c', w: 0.32, cap: 'butt' }); g.fillStyle = '#2a2a2c'; g.beginPath(); g.arc(13.8, 0, 0.75, 0, WL_TAU); g.fill();
  g.strokeStyle = 'rgba(40,40,40,0.35)'; g.lineWidth = 0.22; g.beginPath(); g.arc(19, 0, 2.6, -1.2, 1.2); g.moveTo(17.2, -2.5); g.quadraticCurveTo(15.6, 0, 17.2, 2.5); g.stroke();
  ln(3, -0.9, 18, -2.9, { c: '#ffffff', w: 0.35, op: 0.9 });
  // section, ring, barrel, posted cap, clip, finial
  const cyl = (x0, x1, r, a, b, c_) => { const gg = g.createLinearGradient(0, -r, 0, r); gg.addColorStop(0, a); gg.addColorStop(0.35, b); gg.addColorStop(1, c_); g.fillStyle = gg; g.beginPath(); g.roundRect(x0, -r, x1 - x0, 2 * r, Math.min(r, 2)); g.fill(); };
  cyl(21.5, 39, 4.5, '#4a4a50', '#141417', '#060607'); cyl(38.5, 42, 5.0, '#ffffff', '#c9c9c4', '#7c7c77'); cyl(41.5, 99, 5.5, '#3c3c42', '#121215', '#050506');
  cyl(91, 126, 6.0, '#3e3e44', '#131316', '#050506'); cyl(91, 94, 6.1, '#ffffff', '#cfcfca', '#7d7d78');
  g.fillStyle = '#0a0a0b'; g.beginPath(); g.ellipse(125.5, 0, 1.6, 5.6, 0, -Math.PI / 2, Math.PI / 2); g.fill();
  ln(45, -3.3, 96, -3.4, { c: '#ffffff', w: 0.8, op: 0.55 }); ln(46, -2.4, 95, -2.4, { c: '#ffffff', w: 2.4, op: 0.08 }); ln(23, -2.9, 38, -2.9, { c: '#ffffff', w: 0.6, op: 0.45 }); ln(96, -3.8, 124, -3.8, { c: '#ffffff', w: 0.7, op: 0.45 });
  ln(99, 0.9, 122.5, 0.9, { c: 'rgba(0,0,0,0.6)', w: 2.2 });
  const kg = g.createLinearGradient(0, -1.4, 0, 1.4); kg.addColorStop(0, '#ffffff'); kg.addColorStop(0.5, '#c8c8c3'); kg.addColorStop(1, '#7a7a75'); g.fillStyle = kg; g.beginPath(); g.roundRect(98, -1.3, 25, 2.6, 1.3); g.fill();
  g.beginPath(); g.arc(99.4, 0, 1.9, 0, WL_TAU); g.fill(); g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(99, -0.6, 0.6, 0, WL_TAU); g.fill();
  g.restore();
}
const WL_PREST = { x: WL_NB.x + WL_NB.w + 17, y: WL_NB.y + 10, ang: 1.6, hov: 0.5 };
function WL_penKeys() {
  const R9 = WL_row(1, WL_R42), R10 = WL_row(1, WL_R42 + 1), R11 = WL_row(1, WL_R42 + 2), RS = WL_PREST, A = 0.7;
  const k = (t, x, y, ang, hov) => ({ t, x, y, ang, hov });
  return [k(0, RS.x, RS.y, RS.ang, RS.hov), k(37.12, RS.x, RS.y, RS.ang, RS.hov), k(37.62, R9.x, R9.y - 3.5, A, 5),
    k(38.85, R9.x + 36, R9.y + 3, A, 6), k(39.85, R9.x + 38, R9.y + 4, A, 6), k(40.84, R10.x - 0.5, R10.y - 3.5, A, 3.2),
    k(41.38, R11.x - 0.5, R11.y - 3.5, A, 3), k(41.95, R9.x + WL_CHKX - 3, R9.y - 6, A, 5), k(42.42, R9.x + WL_CHKX - 2.5, R9.y - 3.6, A, 3),
    k(43.05, R11.x + 50, R11.y + 2, A, 6), k(43.5, RS.x, RS.y, RS.ang, RS.hov), k(45.45, RS.x, RS.y, RS.ang, RS.hov),
    k(45.8, WL_row(1, 5).x + 4, WL_row(1, 5).y - 2, A, 6), k(46.2, R9.x + 1, R9.y + 1.5, A, 3.6), k(46.75, R9.x + 23, R9.y + 0.5, A, 4.2),
    k(47.7, R9.x + WL_CHKX + 9, R9.y - 3, A, 3), k(48.62, R9.x + WL_CHKX + 34, R9.y + 16, A, 9), k(49.2, RS.x, RS.y, RS.ang, RS.hov)];
}
let WL_PK = null;
function WL_penAt(t) {
  WL_PK = WL_PK || WL_penKeys(); const K = WL_PK; let i = 0; while (i < K.length - 2 && K[i + 1].t <= t) i++;
  const a = K[i], b = K[i + 1], u = ease.sineInOut(seg(t, a.t, b.t));
  let x = lerp(a.x, b.x, u), y = lerp(a.y, b.y, u), ang = lerp(a.ang, b.ang, u), hov = lerp(a.hov, b.hov, u);
  // windows where the nib writes: text lines, ticks, the underline, the tally
  const W = [];
  WL_NEW.forEach(e => { const R = WL_row(1, e.row); W.push({ t0: e.t0, t1: e.t1, fn: tt => { const k_ = seg(tt, e.t0, e.t1); const tot = e.parts.reduce((s, [p]) => s + tw(p, WL_NF), 0), n = e.parts.reduce((s, [p]) => s + p.length, 0);
    return { x: R.x + tot * k_, y: R.y - 2.2 + Math.sin(k_ * n * Math.PI * 1.15) * 1.5 - 0.4 }; } }); });
  WL_TICKS.forEach(tk => W.push({ t0: tk.t0, t1: tk.t1, fn: tt => { const R = WL_row(1, tk.row), p = WL_at(WL_TICK_PTS, WL_TICK_PTS.L * ease.sineInOut(seg(tt, tk.t0, tk.t1))); return { x: R.x + WL_CHKX + p[0], y: R.y - 2.2 + p[1] }; } }));
  W.push({ t0: WL_HL.t0, t1: WL_HL.t1, fn: tt => { const R = WL_row(1, WL_R42), wd = tw('42. You', WL_NF) + 2; return { x: R.x - 0.5 + wd * ease.cubicOut(seg(tt, WL_HL.t0, WL_HL.t1)), y: R.y + 1.3 }; } });
  W.push({ t0: WL_X1.t0, t1: WL_X1.t1, fn: tt => { const R = WL_row(1, WL_R42), k_ = seg(tt, WL_X1.t0, WL_X1.t1); return { x: R.x + WL_CHKX + 8 + tw('×1', FH(7.4)) * k_, y: R.y - 2.3 + Math.sin(k_ * Math.PI * 2.6) * 1.4 }; } });
  for (const w of W) { if (t < w.t0 - 0.07 || t > w.t1 + 0.09) continue; const p = w.fn(clamp(t, w.t0, w.t1)), kk = t < w.t0 ? ease.smoother(seg(t, w.t0 - 0.07, w.t0)) : t > w.t1 ? 1 - ease.smoother(seg(t, w.t1, w.t1 + 0.09)) : 1;
    x = lerp(x, p.x, kk); y = lerp(y, p.y, kk); hov = lerp(hov, 0.35, kk); }
  return { x, y, ang, hov };
}

// ═════════════════════════════ layers ═════════════════════════════
layer(10, 'wl-wall', WL_wall);
layer(11, 'wl-clock', WL_clock);
layer(12, 'wl-drawing', WL_wallDrawing);
layer(14, 'wl-board', WL_board);
layer(15, 'wl-board-ink', WL_boardInk);
layer(16, 'wl-board-sheen', WL_boardSheen);
layer(17, 'wl-tray', WL_tray);
layer(18, 'wl-plaque', WL_plaque);
layer(35, 'wl-notebook', WL_notebook);
layer(37, 'wl-pen', t => { const p = WL_penAt(t); WL_pen(p.x, p.y, p.ang, p.hov); });
layer(76, 'wl-marker-hop', WL_markerHop);
layer(80, 'wl-hands', WL_hands);
layer(85, 'wl-race-card', WL_race);

// ═════════════════════════════ CAMERA NOTES ═════════════════════════════
// [t, x, y, zoom, {fy, curve, hit}] — world units; land a little before the word.
//  R2  tSara  8.83 : [8.95, 3000, 275, 1.6, {fy: 900, curve: expoInOut}]  → drift [10.7, 3006, 272, 1.72, sineInOut]
//  R3  tBoard 11.12: [11.12, 3768, 292, 1.12, {fy: 880, curve: expoInOut}] (whip right along the wall) → [12.0, 3770, 292, 1.18, sineInOut]
//      t41 12.36  : [12.32, 3644, 318, 3.05, {fy: 860, curve: expoInOut, hit: 2}] extreme close-up on "41" → [13.6, 3646, 318, 3.25, sineInOut]
//  R6b 19.50      : [19.42, 3648, 320, 3.0, {fy: 820, curve: expoInOut, hit: 2}] both hands write 42 → [20.95, 3652, 318, 3.15, sineInOut]
//  R7b 22.33      : [22.36, 3770, 270, 1.85, {fy: 860, curve: expoInOut}] (42, +1 chip, dashed ghost 43) → [25.5, 3772, 270, 1.95, sineInOut]
//  R8  26.27      : [26.75, 3770, 298, 1.08, {fy: 840, curve: expoOut}] card grows out of the board → [29.35, 3770, 298, 1.12, sineInOut]
//  R9  rewind     : [30.1, 3648, 322, 1.9, {fy: 860, curve: expoInOut}] → [30.78, 3650, 324, 2.0, sineInOut]; tRule follow the marker hop:
//                   [31.25, 3560, 560, 1.3, {fy: 980, curve: expoInOut}]
//  R10 31.83      : [31.8, 3770, 300, 1.15, {fy: 900, curve: expoInOut}] (plaque on the top rail) → [32.9, 3770, 300, 1.2, sineInOut]
//  R13 37.47      : [37.58, 3446, 840, 6.0, {fy: 880, curve: expoInOut}] pen writes "42. You" → [39.2, 3458, 842, 6.4, sineInOut]
//  R14 39.23      : [39.95, 3740, 470, 1.04, {fy: 820, curve: expoInOut}] board + notebook together (teacher's hands, 42→43→44; names in
//                   the notebook below) → [42.2, 3740, 475, 1.08, sineInOut] → [42.55, 3446, 848, 4.4, {fy: 860, curve: expoInOut}] the 3 ticks
//  R15b 45.80     : [46.18, 3446, 842, 4.6, {fy: 860, curve: expoInOut}] pen hovers down to "42. You", blue highlight → [48.6, 3448, 842, 4.9, sineInOut]
const WL_X = ease.expoInOut, WL_S = ease.sineInOut;
VIEW_REG['wl-board'] = { keys: [
  [8.4, 3000, 275, 1.45, { fy: 900 }], [8.95, 3000, 275, 1.6, { fy: 900, curve: WL_X }], [10.7, 3006, 272, 1.72, { fy: 900, curve: WL_S }],
  [11.12, 3768, 292, 1.12, { fy: 880, curve: WL_X }], [12.0, 3770, 292, 1.18, { fy: 880, curve: WL_S }],
  [12.32, 3644, 318, 3.05, { fy: 860, curve: WL_X, hit: 2 }], [13.6, 3646, 318, 3.25, { fy: 860, curve: WL_S }],
  [14.3, 3770, 470, 0.85, { curve: WL_X }], [18.3, 3770, 380, 1.15, { curve: WL_S }],
  [19.42, 3648, 320, 3.0, { fy: 820, curve: WL_X, hit: 2 }], [20.95, 3652, 318, 3.15, { fy: 820, curve: WL_S }],
  [21.5, 3770, 420, 1.0, { curve: WL_X }], [22.36, 3770, 270, 1.85, { fy: 860, curve: WL_X }], [25.5, 3772, 270, 1.95, { fy: 860, curve: WL_S }] ] };
VIEW_REG['wl-drawing'] = { keys: [[0, DRAW.x + 150, DRAW.y + 120, 5.3], [99, DRAW.x + 150, DRAW.y + 120, 5.3]] };   // inspect Sara's drawing at the hook's dive scale
VIEW_REG['wl-race'] = { keys: [
  [25.9, 3770, 300, 1.25, { fy: 860 }], [26.75, 3770, 298, 1.08, { fy: 840, curve: ease.expoOut }], [29.35, 3770, 298, 1.12, { fy: 840, curve: WL_S }],
  [30.1, 3648, 322, 1.9, { fy: 860, curve: WL_X }], [30.78, 3650, 324, 2.0, { fy: 860, curve: WL_S }],
  [31.25, 3560, 560, 1.3, { fy: 980, curve: WL_X }], [31.8, 3770, 300, 1.15, { fy: 900, curve: WL_X }], [32.9, 3770, 300, 1.2, { fy: 900, curve: WL_S }] ] };
VIEW_REG['wl-notebook'] = { keys: [
  [36.9, 3520, 640, 1.0], [37.58, 3446, 840, 6.0, { fy: 880, curve: WL_X }], [39.2, 3458, 842, 6.4, { fy: 880, curve: WL_S }],
  [39.95, 3740, 470, 1.04, { fy: 820, curve: WL_X }], [42.2, 3740, 475, 1.08, { fy: 820, curve: WL_S }],
  [42.55, 3446, 848, 4.4, { fy: 860, curve: WL_X }], [45.5, 3446, 848, 4.2, { fy: 860, curve: WL_S }],
  [46.18, 3446, 842, 4.6, { fy: 860, curve: WL_X }], [48.6, 3448, 842, 4.9, { fy: 860, curve: WL_S }] ] };

// ═════════════════════════════ sound moments ═════════════════════════════
window.SFX_EVENTS = (window.SFX_EVENTS || []).concat([
  { t: 12.22, kind: 'whoosh_low', v: 0.45, note: 'wall: push into the 41 on the board' },
  { t: WL_RACE.wipe0 + 0.02, kind: 'paper', v: 0.45, note: 'wall: Minji wipes the 41 with her palm' },
  { t: WL_RACE.b0, kind: 'marker', v: 0.6, note: 'wall: both kids write 42 at once (two markers)' },
  { t: WL_R7.chip, kind: 'pop', v: 0.3, note: 'wall: +1 chip' },
  { t: WL_R7.ghost, kind: 'tick', v: 0.28, note: 'wall: dashed ghost 43 appears' },
  { t: WL_RC.t0, kind: 'whoosh', v: 0.55, note: 'wall: race card grows out of the board' },
  { t: WL_phT(236), kind: 'click', v: 0.3, note: 'wall: both read 41' },
  { t: WL_phT(752), kind: 'hit', v: 0.5, note: 'wall: second write lands on top of the first' },
  { t: WL_RC.title + 0.12, kind: 'pen', v: 0.3, note: 'wall: underline under "race condition"' },
  { t: WL_RC.f0, kind: 'whoosh_low', v: 0.4, note: 'wall: card folds back into the board' },
  { t: WL_RACE.un0, kind: 'whoosh_low', v: 0.35, note: 'wall: rewind, 42 un-writes and 41 comes back' },
  { t: WL_HOP.t0, kind: 'whoosh', v: 0.35, note: 'wall: black marker hops to the teacher' },
  { t: WL_HOP.t1 - 0.02, kind: 'click', v: 0.3, note: 'wall: marker lands in her hand' },
  { t: A_.tTouch, kind: 'tick', v: 0.25, note: 'wall: plaque "only the teacher writes here"' },
  { t: NB_NEW[0].t, kind: 'pen', v: 0.55, note: 'wall: fountain pen writes 42. You' },
  { t: WL_TCH[0].w0, kind: 'marker', v: 0.4, note: 'wall: teacher writes 42 on the board' },
  { t: WL_TCH[1].w0, kind: 'marker', v: 0.4, note: 'wall: teacher writes 43' },
  { t: WL_TCH[2].w0, kind: 'marker', v: 0.4, note: 'wall: teacher writes 44' },
  { t: WL_TICKS[0].t0, kind: 'tick', v: 0.35, note: 'wall: three ticks in the notebook, nobody is lost' },
  { t: WL_HL.t0, kind: 'pen', v: 0.3, note: 'wall: blue underline, your name is already there' },
  { t: WL_X1.t0, kind: 'pen', v: 0.35, note: 'wall: x1 tally, it still counts once' },
]);
