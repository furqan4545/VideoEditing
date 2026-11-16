// scenes/finger.js — the UI that appears where Ali points (prefix FG_). His index fingertip per frame comes from Apple
// Vision hand pose (tools/hands → cut/fingers.py → film/fingers.js: smoothed take pixels, null when the hand is not seen),
// so each thing sits on his fingertip and is "pressed" when he taps. Drawn above his stage (z 60), in world space.
'use strict';
const FGD = window.FINGERS || {};
// fingertip of piece id at tight time t → world point (or null)
function FG_tip(id, t) { const d = FGD[id]; if (!d) return null; const k = frameOf(id, t), p = d.tip[clamp(k, 0, d.tip.length - 1)]; return p ? AL_pt(p[0], p[1]) : null; }
// hold the last seen point a little (the hand drops out for a frame or two)
function FG_tipHold(id, t) { for (let i = 0; i < 8; i++) { const p = FG_tip(id, t - i / FPS); if (p) return p; } return null; }
// where a pin sits at t: his fingertip when the hand is up, else its resting point (take px); averaged over ±0.2 s so it glides
function FG_pos(id, t, rest) { const R = AL_pt(rest[0], rest[1]); let x = 0, y = 0, n = 0;
  for (let i = -6; i <= 6; i++) { const p = FG_tip(id, t + i / FPS) || R; x += p[0]; y += p[1]; n++; } return [x / n, y / n]; }
// a pinned thing: it pops in at t0 (offset dx, dy in world units from the point), rides his finger, and leaves at t1
function FG_pin(id, t, t0, t1, dx, dy, draw, { s0 = 0.4, rest = [760, 760], fixed = false } = {}) {
  if (t < t0 - 0.05 || t > t1 + 0.35) return; const p = fixed ? AL_pt(rest[0], rest[1]) : FG_pos(id, t, rest);
  const kin = OM.spring(t - t0, 0.55, 16), kout = seg(t, t1, t1 + 0.3); const s = (s0 + (1 - s0) * kin) * (1 - 0.3 * kout), op = clamp((t - t0) * 7) * (1 - kout);
  if (op <= 0.003) return; g.save(); g.globalAlpha *= op; g.translate(p[0] + dx, p[1] + dy); g.scale(s, s); draw(t); g.restore();
}
layer(60, 'fg-ui', t => {
  if (!onScreen(STAGE.x, STAGE.y, STAGE.w, STAGE.h, 0)) return;
  for (const P of FG_PINS) if (t > P.t0 - 0.1 && t < P.t1 + 0.4) FG_pin(P.id, t, P.t0, P.t1, P.dx, P.dy, P.draw, P.o || {});
});
// ───────── the pinned things ─────────
// OpenMausBot (the app's cursor-face avatar on a white rounded tile) + its name
function FG_ombTile(t) {
  plate(-130, -130, 260, 260, 60, { lift: 1.6 }); MB_avatar(0, 2, 150);
  const f = F(40, 700), w = tw('OpenMausBot', f) + 56; g.fillStyle = '#0d0d0f'; rr(-w / 2, 160, w, 70, 35); g.fill(); T('OpenMausBot', 0, 207, { f, c: '#fff', al: 'center' });
  const k = seg(t, A_.tFree - 0.1, A_.tFree + 0.25); if (k > 0) { g.save(); g.globalAlpha *= k; const s = 0.6 + 0.4 * ease.backOut(k); g.translate(120, -120); g.scale(s, s); g.rotate(0.12);
    g.fillStyle = MB.blue; rr(-80, -34, 160, 68, 34); g.fill(); T('FREE', 0, 13, { f: F(36, 800), c: '#fff', al: 'center' }); g.restore(); }
}
// the Automations switch he taps on "awake"
function FG_awake(t) {   // the switch's knob sits on his fingertip (0, 0); the label card reaches to the right
  const on = ease.expoOut(seg(t, A_.tAwake, A_.tAwake + 0.3)), w = 520; g.save();
  plate(-90, -150, w, 230, 34, { fill: '#101012', lift: 1.7, line: false });
  T('Automations', -54, -92, { f: F(26, 600), c: MB.mute }); T('Keep this computer', 80, -12, { f: F(32, 600), c: MB.txt }); T('awake for routines', 80, 30, { f: F(32, 600), c: MB.txt });
  g.fillStyle = mix('#3a3a3d', '#2f7cf6', on); rr(-60, -26, 104, 56, 28); g.fill(); g.fillStyle = '#fff'; sh(6, 2, 0.3); g.beginPath(); g.arc(-32 + 48 * on, 2, 23, 0, 6.2832); g.fill(); noSh();
  SH_tapRing(-8, 2, t, A_.tAwake, { r: 40 }); g.restore(); }
// "+ one more line" chip
function FG_oneMore(t) { const f = F(44, 700), w = tw('+ one more line', f) + 70; g.fillStyle = MB.blue; sh(30, 14, 0.3); rr(-w / 2, -45, w, 90, 45); g.fill(); noSh(); T('+ one more line', 0, 15, { f, c: '#fff', al: 'center' }); }
// a sticky note "What do we build next?" (grey, BEFORE)
function FG_sticky(t) { g.save(); g.filter = 'grayscale(1)'; SH_sticky(-135, -135, 270, 'What do we\nbuild next?', { k: 1, rot: -0.06 }); g.filter = 'none'; g.restore(); }
// FG_PINS is filled in camera.js once the gestures are known: [{ id, t0, t1, dx, dy, draw }]
const FG_PINS = [
  { id: 'B1', t0: Wd('B1', 'build') - 0.15, t1: T1('B1') - 0.25, dx: 0, dy: 0, draw: FG_sticky, o: { rest: [240, 650], fixed: true } },   // left of his head
  { id: 'N1b', t0: A_.tOMB - 0.1, t1: T1('N1b') - 0.2, dx: 0, dy: 0, draw: FG_ombTile, o: { rest: [560, 330], fixed: true, s0: 0.6 } },
  { id: 'M3a', t0: T0('M3a') + 0.02, t1: T1('M3a') + 0.15, dx: 0, dy: 0, draw: FG_awake, o: { rest: [244, 1317], fixed: true } },   // on his chest, right above the finger he points at the lens
  { id: 'P2a', t0: Wd('P2a', 'one') - 0.12, t1: T1('P2a') - 0.05, dx: 0, dy: 0, draw: FG_oneMore, o: { rest: [560, 420], fixed: true } },   // above his head (his finger points up)
];
// ───────── "why someone would switch to you": Cursor's icon on his fingertip, little customers hop from it down to him ─────────
function FG_person(x, y, s, col) { g.save(); g.translate(x, y); g.scale(s, s); g.fillStyle = col; sh(10, 5, 0.25);
  g.beginPath(); g.arc(0, -34, 17, 0, 6.2832); g.fill(); g.beginPath(); g.moveTo(-30, 22); g.quadraticCurveTo(-30, -12, 0, -12); g.quadraticCurveTo(30, -12, 30, 22); g.closePath(); g.fill(); noSh(); g.restore(); }
layer(62, 'fg-switch', t => {
  const id = 'L2', t0 = L2_TO_ALI + 0.05, tS = A_.tSwitch - 0.1, t1 = T1('L2') - 0.3; if (t < t0 - 0.1 || t > t1 + 0.4) return;
  const out = seg(t, t1, t1 + 0.3);
  const kin = OM.spring(t - t0, 0.55, 16), ic = AL_pt(230, 590);   // left of his head (his finger points up there)
  g.save(); g.globalAlpha *= clamp((t - t0) * 6) * (1 - out);
  g.save(); g.translate(ic[0], ic[1]); g.scale(0.4 + 0.6 * kin, 0.4 + 0.6 * kin); SH_cursorIcon(0, 0, 200); g.restore();
  // five customers leave the icon one after another and land around his chest, turning blue
  for (let i = 0; i < 5; i++) { const ti = tS + i * 0.11, u = clamp((t - ti) / 0.42); const tgt = AL_pt(170 + i * 64, 1300 - Math.abs(i - 2) * 22);   // they land on his shoulder, above the captions
    const sx = ic[0] + (i - 2) * 24, sy = ic[1] + 80; if (t < ti) { FG_person(sx, sy, 0.75 * kin, '#8a8a90'); continue; }
    const e = ease.cubicInOut(u), x = lerp(sx, tgt[0], e), y = lerp(sy, tgt[1], e) - Math.sin(Math.PI * e) * 260;
    FG_person(x, y, 0.75 + 0.35 * e, mix('#8a8a90', '#2f7cf6', seg(u, 0.7, 1))); }
  g.restore();
});
