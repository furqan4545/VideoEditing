// scenes/finger.js — the UI that appears where Ali points (prefix FG_). His raised index fingertip per frame comes from
// Apple Vision hand pose (tools/hands → cut/fingers.py → film/fingers.js: smoothed take pixels, null when no hand is up).
// A pin pops in, rides his finger (or sits at a fixed spot), and a tap flips / presses it. Drawn above his stage (z 60).
// RULES (reel 31): never over his face (face ~ x 400-880, y 560-1320 of his take); never in the caption band; inside
// x 100-980. When the finger points at the lens or sits low, use a FIXED spot beside / above his head or on his chest.
'use strict';
const FGD = window.FINGERS || {};
function FG_tip(id, t) { const d = FGD[id]; if (!d) return null; const k = frameOf(id, t), p = d.tip[clamp(k, 0, d.tip.length - 1)]; return p ? AL_pt(p[0], p[1]) : null; }
function FG_tipHold(id, t) { for (let i = 0; i < 8; i++) { const p = FG_tip(id, t - i / FPS); if (p) return p; } return null; }
// his fingertip when the hand is up, else a resting point (take px); averaged over ±0.2 s so a pin glides
function FG_pos(id, t, rest) { const R = AL_pt(rest[0], rest[1]); let x = 0, y = 0, n = 0;
  for (let i = -6; i <= 6; i++) { const p = FG_tip(id, t + i / FPS) || R; x += p[0]; y += p[1]; n++; } return [x / n, y / n]; }
function FG_pin(id, t, t0, t1, dx, dy, draw, { s0 = 0.4, rest = [760, 760], fixed = false } = {}) {
  if (t < t0 - 0.05 || t > t1 + 0.35) return; const p = fixed ? AL_pt(rest[0], rest[1]) : FG_pos(id, t, rest);
  const kin = OM.spring(t - t0, 0.55, 16), kout = seg(t, t1, t1 + 0.3); const s = (s0 + (1 - s0) * kin) * (1 - 0.3 * kout), op = clamp((t - t0) * 7) * (1 - kout);
  if (op <= 0.003) return; g.save(); g.globalAlpha *= op; g.translate(p[0] + dx, p[1] + dy); g.scale(s, s); draw(t); g.restore();
}
layer(60, 'fg-ui', t => {
  if (!onScreen(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 0)) return;
  for (const P of FG_PINS) if (t > P.t0 - 0.1 && t < P.t1 + 0.4) FG_pin(P.id, t, P.t0, P.t1, P.dx || 0, P.dy || 0, P.draw, P.o || {});
});
// a switch he "presses": knob at (0, 0) = the spot his finger points at, label card to the right; flips at tOn
function FG_switch(t, tOn, lines, { title = '' } = {}) {
  const on = ease.expoOut(seg(t, tOn, tOn + 0.3)), w = 520; g.save();
  plate(-90, -150, w, 230, 34, { fill: '#101012', lift: 1.7, line: false });
  if (title) T(title, -54, -92, { f: F(26, 600), c: '#9c9ca2' });
  lines.forEach((l, i) => T(l, 80, -12 + i * 42, { f: F(32, 600), c: '#f2f2f3' }));
  g.fillStyle = mix('#3a3a3d', '#2f7cf6', on); rr(-60, -26, 104, 56, 28); g.fill(); g.fillStyle = '#fff'; sh(6, 2, 0.3); g.beginPath(); g.arc(-32 + 48 * on, 2, 23, 0, 6.2832); g.fill(); noSh();
  SH_tapRing(-8, 2, t, tOn, { r: 40 }); g.restore();
}
// FG_PINS: [{ id (piece), t0, t1, dx, dy, draw(t), o: { rest: [take px x, y], fixed, s0 } }] — fill in for your film.
// Demo: a chip above his head on "hook" (fixed spot; the template has no tracking data).
const FG_PINS = [
  { id: 'H', t0: Math.max(A_.tHook, 2.05), t1: T1('H') - 0.1, draw: () => SH_chip('+ your idea here'), o: { rest: [560, 420], fixed: true } },   // after the 2 s title
];
