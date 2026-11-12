// scenes/class.js — region B · the floor, the furniture and the people of the classroom, seen from straight above
// (a premium architect's plan / paper diorama). Prefix CL_. Every value is a pure function of t.
// Draws: the floor (planks, walls, windows, door, shelf, plants) · 100 desks + 100 students · the teacher, her desk,
// office chair, the letter TRAY, the wire BIN, the done pile · You and Minji walking up to the board and back (rewind)
// · the hearts of R4-R7 and the broken like · the sight lines · the "Teacher only" floor tape · the notes (pass, unfold,
// queue tickets, done pile, the duplicate crumpled into the bin) · name pills.
// wall.js owns y < 600 (front wall, board, Sara's drawing), the notebook on the desk and the race diagram.
//
// Names other files can use:
//   CL_youPos(t), CL_minjiPos(t)  → {x, y}   shoulder centre of the two walkers (seat when seated)
//   CL_notePos(t)                 → {x, y}   You's first note (drawn centre, lifted), CL_dupPos(t) the second one
//   CL_teacherHand(t)             → {x, y}   the teacher's right hand (the marker hand). At A_.tRule it is ≈ (3545, 586)
//   CL_teach(t)                   → {x, y, ang, up, hr:[x,y], hl:[x,y]}   teacher body + both hands (world)
//   CL_SEAT.{you, minji, leo, sara} {x, y} seats · CL_NUM board number point · CL_DONE done pile · CL_TAPE_Y
//   CL_person(x, y, ang, look, o) a person seen from above · CL_note(x, y, o) a paper note · CL_heart(x, y, size, o)
'use strict';

// ───────── layout ─────────
const CL_COLX = [2810, 2930, 3150, 3270, 3390, 3610, 3730, 3850, 4070, 4190];   // aisles at 3040, 3500, 3960
const CL_DY = r => 1050 + r * 148;           // desk centre y of row r (row 0 = front)
const CL_SDY = 62;                           // a seated student's shoulders sit this far below the desk centre
const CL_TAPE_Y = 958;                       // the floor tape between the class and the front
const CL_NUM = { x: 3640, y: 321 };          // centre of the number on the board (wall.js WL_NUM, read live by CL_num())
const CL_num = () => (typeof WL_NUM !== 'undefined' ? { x: WL_NUM.x + WL_NUM.h * 0.72, y: WL_NUM.y + WL_NUM.h * 0.5 } : CL_NUM);
const CL_DONE = { x: 3739, y: 774 };          // the done pile (east end of the teacher's desk)
const CL_SLOT = [{ x: 3602, y: 770, r: -0.05 }, { x: 3642, y: 774, r: 0.06 }, { x: 3683, y: 769, r: -0.03 }];   // tray queue slots
const CL_BINC = { x: BIN.x + BIN.w / 2, y: BIN.y + BIN.h / 2, r: 44 };
const CL_BROKE = { x: BOARD.x + 84, y: BOARD.y + BOARD.h - 64 };             // where your like lands and breaks (left of the number)
const CL_HR = 14, CL_HY = -6;                // head radius and head centre (local) of a person
const CL_PI = Math.PI, CL_S = Math.PI / 2;   // facing south = +CL_S, north = -CL_S

// ───────── small helpers ─────────
const CL_wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const CL_alerp = (a, b, k) => a + CL_wrap(b - a) * k;
const CL_hair1 = () => clamp(1.05 / Math.max(0.05, CAM.zoom), 0.3, 2.6);   // a 1 px hairline in world units
function CL_keyed(t, K, curve = ease.smoother) {        // K = [[t, v0, v1, ...], ...] → values, eased between keys
  if (t <= K[0][0]) return K[0].slice(1);
  for (let i = 0; i < K.length - 1; i++) { const a = K[i], b = K[i + 1]; if (t < b[0]) { const k = curve(seg(t, a[0], b[0])); return a.slice(1).map((v, j) => lerp(v, b[j + 1], k)); } }
  return K[K.length - 1].slice(1);
}
function CL_chan(t, list, base) { let v = base; for (const [t0, t1, a, b] of list) { if (t >= t1) { v = b; continue; } if (t > t0) return lerp(a, b, ease.smoother(seg(t, t0, t1))); return v; } return v; }
function CL_prof(u, a = 0.22) { u = clamp(u); const s = u < a ? u * u / (2 * a) : u < 1 - a ? a / 2 + (u - a) : (1 - a) - (1 - u) * (1 - u) / (2 * a); return s / (1 - a); }
function CL_mkPath(pts, N = 22) {          // Catmull-Rom through pts with an arc-length table
  const S = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let j = 0; j < N; j++) { const u = j / N, u2 = u * u, u3 = u2 * u, f = d => 0.5 * (2 * p1[d] + (-p0[d] + p2[d]) * u + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * u2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * u3); S.push([f(0), f(1)]); }
  }
  S.push(pts[pts.length - 1].slice());
  const cum = [0]; for (let i = 1; i < S.length; i++) cum.push(cum[i - 1] + Math.hypot(S[i][0] - S[i - 1][0], S[i][1] - S[i - 1][1]));
  const L = cum[cum.length - 1];
  return { L, at(s) { s = clamp(s, 0, L); let lo = 0, hi = cum.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; }
    const a = S[lo], b = S[hi], u = (s - cum[lo]) / Math.max(1e-6, cum[hi] - cum[lo]); return { x: lerp(a[0], b[0], u), y: lerp(a[1], b[1], u), ang: Math.atan2(b[1] - a[1], b[0] - a[0]) }; } };
}

// ───────── the cast (looks decided once, deterministic) ─────────
const CL_HAIRC = ['#141416', '#1b1b1e', '#232326', '#2e2e32', '#3d3d42', '#56565c', '#77767a', '#a29d93', '#c7bfb0'];
const CL_SHIRT = ['#ffffff', '#ffffff', '#f7f5f0', '#efece6', '#e4e1da', '#d6d3cc', '#c4c1ba', '#a9a7a1', '#8e8c87', '#5c5b5f', '#3a3a3f', '#1d1d20'];
const CL_SKIN = ['#f4ede5', '#ece2d6', '#e0d3c4', '#d2c1ae', '#bea892', '#a38b74'];
const CL_PANTS = ['#2b2b30', '#3f3f45', '#55555b', '#1a1a1d', '#6e6d70'];
const CL_STYLES = ['crop', 'part', 'long', 'pony', 'bun', 'curly', 'buzz', 'scarf', 'crop', 'part', 'long', 'curly', 'crop', 'pony'];
const CL_KIDS = [];
(function () {
  const R = OM.rng(1717), pick = a => a[Math.floor(R() * a.length)];
  for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
    const dx = CL_COLX[c], dy = CL_DY(r);
    const k = { r, c, dx, dy, x: dx + (R() - 0.5) * 5, y: dy + CL_SDY + (R() - 0.5) * 4,
      style: pick(CL_STYLES), hair: pick(CL_HAIRC), shirt: pick(CL_SHIRT), skin: pick(CL_SKIN), pants: pick(CL_PANTS), hl: 6.2 + R() * 3,
      tPop: 6.70 + 0.074 * r + 0.024 * c + R() * 0.03, ph: R() * 6.283, lag: 0.05 + R() * 0.16,
      pr: (R() - 0.5) * 0.2, pc: 1.2 + (R() - 0.5) * 0.6, pencil: pick(['#e2dccf', '#f1ede4', '#c8c3b9', '#9a968e', '#e9e1cf', '#3a3a3f']), item: R(),
      bag: R() < 0.4, bagC: pick(['#8f8d88', '#d8d5ce', '#b4b0a8', '#efece6', '#c9c5bd', '#5c5b5f']), bagX: (R() - 0.5) * 14, bagR: (R() - 0.5) * 0.3, scr: [],
      pose: (q => q < 0.46 ? 'write' : q < 0.78 ? 'rest' : 'lap')(R()) };
    const nL = 2 + Math.floor(R() * 4);
    for (let i = 0; i < nL; i++) { const pts = [], y0 = -12 + i * 6, x0 = -13 + R() * 2, x1 = 0 + R() * 11; for (let x = x0; x < x1; x += 1.5) pts.push([x, y0 + (R() - 0.5) * 1.8]); k.scr.push(pts); }
    if (k.style === 'scarf') k.hair = pick(['#d8d5ce', '#8f8d88', '#3a3a3f', '#ebe8e1', '#5c5b5f']);
    CL_KIDS.push(k);
  }
})();
const CL_kid = (r, c) => CL_KIDS[r * 10 + c];
const CL_YOU = Object.assign(CL_kid(5, 2), { name: 'You', shirt: C.blue, hair: '#121214', style: 'crop', hl: 7.6, pants: '#1f2638', skin: '#ebe1d5', bag: true, bagC: '#1d1d20' });
const CL_MINJI = Object.assign(CL_kid(3, 7), { name: 'Minji', shirt: '#1c1c21', hair: '#0d0d0f', style: 'pony', pants: '#17171a', skin: '#efe6dc' });   // sleeves match wall.js's race hands
const CL_LEO = Object.assign(CL_kid(8, 8), { name: 'Leo', shirt: '#e4e1da', hair: '#3a3a3f', style: 'curly', skin: '#dccdbb' });
const CL_SARA = Object.assign(CL_kid(0, 1), { name: 'Sara', shirt: '#ffffff', hair: '#1d1d20', style: 'long', skin: '#f1e9df' });
const CL_SEAT = { you: { x: CL_YOU.x, y: CL_YOU.y }, minji: { x: CL_MINJI.x, y: CL_MINJI.y }, leo: { x: CL_LEO.x, y: CL_LEO.y }, sara: { x: CL_SARA.x, y: CL_SARA.y } };
const CL_TLOOK = { shirt: '#57524c', cuff: '#ffffff', hair: '#a8a298', style: 'bun', skin: '#ebe1d5', pants: '#1d1d20', big: 1.4 };   // sleeve + cuff match wall.js's board hands

// ───────── a person seen from straight above ─────────
// local frame: origin = shoulder centre, facing -y, +x = the person's right. 1 unit ≈ 0.6 cm.
const CL_LU = 26, CL_LF = 26;
function CL_armSolve(sx, sy, hx, hy, side, len = CL_LU, bend = 1) {
  let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1e-6; const M = len * 2 * 0.985;
  if (d > M) { hx = sx + dx / d * M; hy = sy + dy / d * M; dx = hx - sx; dy = hy - sy; d = M; }
  const a = d / 2, b = Math.sqrt(Math.max(0, len * len - a * a)) * bend; let nx = -dy / d, ny = dx / d; if (nx * side < 0) { nx = -nx; ny = -ny; }
  return { ex: sx + dx / 2 + nx * b, ey: sy + dy / 2 + ny * b, hx, hy };
}
function CL_marker(x, y, a, s = 1) {          // the black whiteboard marker, top view, pointing along a
  g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s); g.lineCap = 'butt';
  g.fillStyle = '#141416'; g.beginPath(); g.roundRect(-6, -3.9, 38, 7.8, 3.9); g.fill();
  g.fillStyle = '#f4f2ed'; g.fillRect(10, -3.9, 9, 7.8);
  g.fillStyle = '#3a3a3f'; g.beginPath(); g.roundRect(29, -3.1, 6, 6.2, 1.6); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(-4, -2.6, 33, 1.3);
  g.restore();
}
function CL_arm(sx, sy, H, side, P, len, bend, item) {
  const A = CL_armSolve(sx, sy, H[0], H[1], side, len, bend * clamp(Math.hypot(H[0] - sx, H[1] - sy) / 34, 0.25, 1)), fa = Math.atan2(A.hy - A.ey, A.hx - A.ex);
  const cx = A.hx - Math.cos(fa) * 4.4, cy = A.hy - Math.sin(fa) * 4.4;
  g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(sx, sy); g.lineTo(A.ex, A.ey); g.lineTo(cx, cy);
  g.strokeStyle = 'rgba(13,13,15,0.14)'; g.lineWidth = 10.8; g.stroke(); g.strokeStyle = P.shirt; g.lineWidth = 9.4; g.stroke();
  if (P.cuff) { g.strokeStyle = P.cuff; g.lineWidth = 8.6; g.beginPath(); g.moveTo(cx - Math.cos(fa) * 1.2, cy - Math.sin(fa) * 1.2); g.lineTo(cx + Math.cos(fa) * 0.6, cy + Math.sin(fa) * 0.6); g.stroke(); }
  if (item) item(A.hx, A.hy, fa);
  g.fillStyle = P.skin; g.beginPath(); g.ellipse(A.hx, A.hy, 5.4, 4.7, fa, 0, 6.2832); g.fill();
  g.strokeStyle = 'rgba(13,13,15,0.22)'; g.lineWidth = 0.7; g.stroke();
  return A;
}
function CL_hair(P, z) {                      // in the head's frame: centre (0, 0), face toward -y
  const c = P.hair, st = P.style, R = CL_HR, hl = P.hl ?? 7.4;
  const cover = (k, r = R + 0.7, col = c) => { g.save(); g.beginPath(); g.arc(0, 0, r, 0, 6.2832); g.clip(); g.fillStyle = col; g.beginPath(); g.ellipse(0, k, r + 1.4, r + 2.4, 0, 0, 6.2832); g.fill(); g.restore(); };
  const dark = parseInt(c.slice(1, 3), 16) < 0x70;
  g.fillStyle = c;
  if (st === 'scarf') { g.beginPath(); g.arc(0, 0.8, R + 1.6, 0, 6.2832); g.fill();
    if (z > 0.9) { g.strokeStyle = 'rgba(13,13,15,0.14)'; g.lineWidth = 0.8; g.beginPath(); g.arc(0, 2, 10.5, -2.6, -0.55); g.moveTo(-11, 7); g.quadraticCurveTo(0, 12, 11, 7); g.stroke(); }
    return; }
  if (st === 'curly') { g.beginPath(); g.moveTo(12.5, 3); g.arc(0, 3, 12.5, 0, 6.2832);
    const bumps = []; for (let i = 0; i < 15; i++) { const a = i / 15 * 6.2832, f = Math.abs(CL_wrap(a + CL_S)), rr_ = f < 0.95 ? 7.4 : 11.4; bumps.push([Math.cos(a) * rr_, Math.sin(a) * rr_ + 2.4]); }
    for (const [x, y] of bumps) { g.moveTo(x + 4.6, y); g.arc(x, y, 4.6, 0, 6.2832); } g.fill();
    if (z > 1.3) { g.strokeStyle = 'rgba(255,255,255,0.14)'; g.lineWidth = 0.6; g.beginPath(); for (const [x, y] of bumps) { g.moveTo(x + 2.3, y); g.arc(x, y, 2.3, 0, 4); } g.stroke(); }
    return; }
  if (st === 'buzz') cover(hl + 1.5, R + 0.3, mix(c, P.skin, 0.38)); else cover(st === 'long' || st === 'pony' || st === 'bun' ? 6 : hl);
  if (st === 'pony') { g.fillStyle = c; g.beginPath(); g.ellipse(0, 18.5, 5, 9.4, 0, 0, 6.2832); g.fill(); g.fillStyle = mix(c, '#ffffff', 0.35); g.beginPath(); g.roundRect(-4.2, 11, 8.4, 3, 1.5); g.fill(); }
  if (st === 'bun') { g.fillStyle = c; g.beginPath(); g.arc(0, 9, 7.4, 0, 6.2832); g.fill();
    if (z > 0.8) { g.strokeStyle = dark ? 'rgba(255,255,255,0.16)' : 'rgba(13,13,15,0.18)'; g.lineWidth = 0.75; g.beginPath(); g.arc(0, 9, 4.9, 0.4, 5.2); g.moveTo(2.4, 9); g.arc(0, 9, 2.4, 0, 4.4); g.stroke(); } }
  if (st === 'part' && z > 0.7) { g.strokeStyle = mix(c, '#ffffff', 0.3); g.lineWidth = 0.9; g.beginPath(); g.moveTo(-4.2, hl - 15.5); g.quadraticCurveTo(-3, 0, -2.4, 11); g.stroke(); }
  if (z > 1.6) {                                   // strands from the crown, only up close
    g.save(); g.beginPath(); g.arc(0, 0, R + 0.6, 0, 6.2832); g.clip(); g.strokeStyle = dark ? 'rgba(255,255,255,0.10)' : 'rgba(13,13,15,0.10)'; g.lineWidth = 0.5; g.beginPath();
    for (let i = 0; i < 11; i++) { const a = -2.7 + i * 0.5; g.moveTo(0, 5); g.quadraticCurveTo(Math.cos(a) * 7 + 1.5, 5 + Math.sin(a) * 7, Math.cos(a) * 16, 5 + Math.sin(a) * 16); } g.stroke(); g.restore(); }
  if (z > 0.6) { const gr = g.createRadialGradient(-4, 4, 1, -4, 4, 12); gr.addColorStop(0, 'rgba(255,255,255,0.17)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 2, 13.5, 0.1, 3.0); g.fill(); }
}
// (x, y) = shoulder centre (world), ang = facing (radians; -PI/2 = up the screen, toward the board).
// o: { s, op, stand 0..1, walk 0..1, phase, sway, head (turn, rad), hr/hl local hand targets [x, y] with hrW/hlW blend,
//      bend (elbow bend 0..1), marker (in the right hand), shadow, lift }
function CL_person(x, y, ang, P, o = {}) {
  const s = (o.s ?? 1) * (P.big || 1), st = o.stand ?? 0, wk = o.walk ?? 0, sw = Math.sin(o.phase ?? 0) * wk, z = CAM.zoom * s;
  if (o.op !== undefined && o.op <= 0.003) return;
  g.save(); g.translate(x, y); g.rotate(ang + CL_S + (o.sway ?? 0)); g.scale(s, s);
  if (o.op !== undefined) g.globalAlpha *= clamp(o.op);
  const hw = clamp(1.05 / Math.max(0.05, z), 0.25, 2.4);
  if (o.shadow) { const L = o.lift ?? 1; g.fillStyle = P.shirt; g.beginPath(); g.roundRect(-32, -11, 64, 24, 12); g.moveTo(CL_HR, CL_HY); g.arc(0, CL_HY, CL_HR, 0, 6.2832);
    sh(15 * L, 7 * L, 0.17); g.fill(); sh(4 * L, 2 * L, 0.15); g.fill(); noSh(); }
  if (st > 0.02) {                                  // legs and shoes (only when standing; seated legs are under the desk)
    g.save(); g.globalAlpha *= clamp(st * 1.6); const fL = -6 - sw * 19, fR = -6 + sw * 19;
    g.lineCap = 'round'; g.strokeStyle = P.pants || '#2b2b30'; g.lineWidth = 10.5; g.beginPath(); g.moveTo(-8.5, 2); g.lineTo(-8.8, fL); g.moveTo(8.5, 2); g.lineTo(8.8, fR); g.stroke();
    g.fillStyle = '#26262a'; g.beginPath(); g.roundRect(-13.2, fL - 12, 9, 19, 4.5); g.roundRect(4.2, fR - 12, 9, 19, 4.5); g.fill();
    if (z > 1.1) { g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.roundRect(-12, fL - 10.8, 6.6, 5, 2.5); g.roundRect(5.4, fR - 10.8, 6.6, 5, 2.5); g.fill(); }
    g.restore(); }
  const rw = o.hr ? (o.hrW ?? 1) : 0, lw = o.hl ? (o.hlW ?? 1) : 0, bend = o.bend ?? 0.55;
  const sR = o.seatR || [15, -41], sL = o.seatL || [-15, -41], lap = o.lap ?? 0;
  const restR = [lerp(sR[0], 32, st), lerp(sR[1], 6 - sw * 10, st)], restL = [lerp(sL[0], -32, st), lerp(sL[1], 6 + sw * 10, st)];
  const HR = o.hr ? [lerp(restR[0], o.hr[0], rw), lerp(restR[1], o.hr[1], rw)] : restR, HL = o.hl ? [lerp(restL[0], o.hl[0], lw), lerp(restL[1], o.hl[1], lw)] : restL;
  const dR = Math.max(st, lap) * (1 - rw), dL = Math.max(st, lap) * (1 - lw);
  CL_arm(-27, -2, HL, -1, P, lerp(CL_LU, 13, dL), lerp(bend, 0.15, dL), null);
  CL_arm(27, -2, HR, 1, P, lerp(CL_LU, 13, dR), lerp(bend, 0.15, dR), o.marker ? (hx, hy, a) => CL_marker(hx - Math.cos(a) * 2, hy - Math.sin(a) * 2, a - 0.5, 0.95) : null);
  // torso: a soft rounded shoulder line, lit from the top
  g.beginPath(); g.roundRect(-32, -11, 64, 24, 12); g.fillStyle = P.shirt; g.fill();
  if (z > 0.42) { const gr = g.createLinearGradient(-10, -11, 6, 13); gr.addColorStop(0, 'rgba(255,255,255,0.24)'); gr.addColorStop(0.5, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.09)'); g.fillStyle = gr; g.fill(); }
  g.strokeStyle = 'rgba(13,13,15,0.2)'; g.lineWidth = hw; g.stroke();
  if (z > 1.2) { g.strokeStyle = 'rgba(13,13,15,0.09)'; g.lineWidth = hw * 0.9; g.beginPath(); g.moveTo(-20, -10); g.quadraticCurveTo(-23, 1, -20, 12); g.moveTo(20, -10); g.quadraticCurveTo(23, 1, 20, 12); g.stroke(); }
  if (P.style === 'long') { g.fillStyle = P.hair; g.beginPath(); g.ellipse(0, 5, 13, 12, 0, 0, 6.2832); g.fill();
    if (z > 1.1) { g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 0.6; g.beginPath(); for (let i = -4; i <= 4; i++) { g.moveTo(i * 2.4, -1); g.quadraticCurveTo(i * 2.8, 8, i * 2.2, 16); } g.stroke(); } }
  if (P.style === 'scarf') { g.fillStyle = P.hair; g.beginPath(); g.ellipse(0, 4, 17, 11, 0, 0, 6.2832); g.fill(); }
  if (z > 0.8 && P.style !== 'scarf' && P.style !== 'long') { g.strokeStyle = 'rgba(13,13,15,0.13)'; g.lineWidth = hw * 1.1; g.beginPath(); g.arc(0, CL_HY, CL_HR + 2.6, 0.5, CL_PI - 0.5); g.stroke(); }   // collar
  // head
  g.save(); g.translate(0, CL_HY); g.rotate(o.head || 0);
  g.fillStyle = P.skin;
  if (P.style !== 'scarf') { g.beginPath(); g.ellipse(-13.4, 1, 2.8, 4, 0, 0, 6.2832); g.moveTo(16.2, 1); g.ellipse(13.4, 1, 2.8, 4, 0, 0, 6.2832); g.fill(); }
  g.beginPath(); g.ellipse(0, -14.4, 2.4, 3.2, 0, 0, 6.2832); g.fill();
  g.beginPath(); g.arc(0, 0, CL_HR, 0, 6.2832); g.fill(); g.strokeStyle = 'rgba(13,13,15,0.2)'; g.lineWidth = hw; g.stroke();
  if (z > 1.4) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(-3, -11, 3.4, 1.4, -0.2, 0, 6.2832); g.fill(); }   // light on the forehead
  CL_hair(P, z);
  g.restore();
  g.restore();
}

// ───────── the walkers: You and Minji go up to the board, and walk back in reverse under the rule ─────────
const CL_STEP = 118;
function CL_mkWalker(kid, pts, T) {
  const P = CL_mkPath(pts), W = { kid, P, T };
  W.s = t => t <= T.w0 ? 0 : t < T.w1 ? P.L * CL_prof(seg(t, T.w0, T.w1)) : t <= T.b0 ? P.L : t < T.b1 ? P.L * (1 - ease.cubicInOut(seg(t, T.b0, T.b1))) : 0;
  W.up = t => sstep(T.up, T.w0 + 0.06, t) * (1 - sstep(T.b1 - 0.02, T.b1 + 0.3, t));
  W.isUp = t => t > T.up && t < T.b1 + 0.32;
  W.state = t => { const s = W.s(t), p = P.at(s), v = (W.s(t + 0.02) - W.s(t - 0.02)) / 0.04;
    const away = sstep(0, 55, s) * (1 - sstep(P.L - 90, P.L - 6, s));
    return { x: p.x, y: p.y, ang: CL_alerp(-CL_S, p.ang, away), s, v, up: W.up(t), wk: clamp(Math.abs(v) / 240), phase: s / CL_STEP * CL_PI }; };
  W.prints = []; let last = 0;
  for (let t = T.w0; t <= T.w1; t += 1 / 240) { const s = W.s(t), n = Math.floor(s / CL_STEP); if (n > last) { last = n; const p = P.at(s), side = n % 2 ? 1 : -1, nx = -Math.sin(p.ang), ny = Math.cos(p.ang); W.prints.push({ x: p.x + nx * side * 9 + Math.cos(p.ang) * 6, y: p.y + ny * side * 9 + Math.sin(p.ang) * 6, ang: p.ang, t }); } }
  return W;
}
const CL_W = {
  you: CL_mkWalker(CL_YOU, [[CL_YOU.x, CL_YOU.y], [3100, 1876], [3046, 1838], [3040, 1500], [3040, 900], [3064, 702], [3150, 622], [3330, 582], [3470, 566], [KID_SPOT.you.x, KID_SPOT.you.y]],
    { up: A_.tWalk - 0.14, w0: A_.tWalk + 0.03, w1: 17.88, b0: A_.tRuleStart + 0.1, b1: A_.tRuleStart + 1.65 }),
  minji: CL_mkWalker(CL_MINJI, [[CL_MINJI.x, CL_MINJI.y], [3902, 1580], [3958, 1540], [3960, 1200], [3960, 760], [3970, 642], [KID_SPOT.minji.x, KID_SPOT.minji.y]],
    { up: A_.tStands - 0.15, w0: A_.tStands, w1: 17.95, b0: A_.tRuleStart + 0.15, b1: A_.tRuleStart + 1.55 }),
};
function CL_walkPos(W, t) { if (!W.isUp(t)) return { x: W.kid.x, y: W.kid.y }; const S = W.state(t); return { x: S.x, y: S.y }; }
const CL_youPos = t => CL_walkPos(CL_W.you, t);
const CL_minjiPos = t => CL_walkPos(CL_W.minji, t);

// ───────── the teacher (body keys, hand poses in her local frame) ─────────
// She sits behind her desk facing the class; at "teacher" she stands; she turns to the board and catches the marker
// (wall.js hops it to TEACHER + (30, -10) over tRule … tRule + 0.42); she works the notes facing the desk (the fountain pen
// writes the names by itself, wall.js); she turns to the board for 42 / 43 / 44 (wall.js draws her hands up close).
const CL_TB = [                               // [t, x, y, facing, up]
  [0, 3500, 664, CL_S, 0], [A_.tTeacher, 3500, 664, CL_S, 0], [A_.tTeacher + 0.32, 3500, 648, CL_S, 1],
  [A_.tRule - 0.55, 3500, 648, CL_S, 1], [A_.tRule - 0.2, 3500, 642, -CL_S + 0.1, 1], [A_.tRule + 0.5, 3500, 642, -CL_S + 0.1, 1], [A_.tRule + 0.85, 3504, 652, CL_S, 1],
  [A_.tPass, 3504, 652, CL_S, 1], [A_.tPass + 0.6, 3528, 668, CL_S, 1],
  [A_.tChanges - 0.15, 3528, 668, CL_S, 1], [A_.tChanges + 0.22, 3560, 640, -CL_S + 0.12, 1], [A_.tLost - 0.5, 3560, 640, -CL_S + 0.12, 1], [A_.tLost - 0.12, 3528, 668, CL_S, 1],
  [99, 3528, 668, CL_S, 1]];
const CL_TH = [                               // [t, right x, y, left x, y] in her local frame (+x = her right, -y = ahead)
  [0, 15, -41, -15, -41], [A_.tTeacher, 15, -41, -15, -41], [A_.tTeacher + 0.3, 31, 8, -31, 8],
  [A_.tRule - 0.3, 31, 8, -31, 8], [A_.tRule - 0.02, 21, -9, -31, 8], [A_.tRule + 0.5, 21, -9, -31, 8], [A_.tRule + 0.85, 24, -26, -31, 8],
  [A_.tPass + 0.3, 24, -26, -31, 8], [A_.tPass + 0.7, 15, -40, -15, -40],
  [35.46, 15, -40, -15, -40], [35.68, 15, -40, -52, -42], [35.9, 15, -40, -52, -42], [36.1, 15, -40, -16, -46],
  [37.84, 15, -40, -16, -46], [37.98, 15, -40, -50, -32], [38.3, 15, -40, -15, -40],
  [A_.tChanges - 0.15, 15, -40, -15, -40], [A_.tChanges + 0.22, 14, -52, -14, -52], [A_.tLost - 0.5, 14, -52, -14, -52], [A_.tLost - 0.12, 15, -40, -15, -40],
  [45.36, 15, -40, -15, -40], [45.56, 15, -40, -52, -42], [45.78, 15, -40, -52, -42], [45.98, 15, -40, -16, -46],
  [47.4, 15, -40, -16, -46], [47.5, -2, -47, -16, -47], [47.76, -2, -47, -16, -47], [47.88, 15, -40, -50, -28], [48.3, 15, -40, -15, -40], [99, 15, -40, -15, -40]];
let CL_TMEMO = { t: NaN, v: null };
function CL_teach(t) {
  if (CL_TMEMO.t === t) return CL_TMEMO.v;
  const [x, y, ang, up] = CL_keyed(t, CL_TB), h = CL_keyed(t, CL_TH), s = CL_TLOOK.big * (1 + 0.03 * up);
  let rx = h[0], ry = h[1], lx = h[2], ly = h[3];
  const atB = sstep(A_.tChanges + 0.1, A_.tChanges + 0.3, t) * (1 - sstep(A_.tLost - 0.55, A_.tLost - 0.4, t));   // both hands up at the board: they move as she writes
  rx += atB * 3.5 * Math.sin(t * 9.1); ry += atB * 3 * Math.cos(t * 7.3); lx += atB * 3 * Math.sin(t * 8.3 + 1); ly += atB * 2.5 * Math.cos(t * 6.7 + 2);
  const ca = Math.cos(ang + CL_S), sa = Math.sin(ang + CL_S), toW = (lx_, ly_) => [x + (ca * lx_ - sa * ly_) * s, y + (sa * lx_ + ca * ly_) * s];
  const AR = CL_armSolve(27, -2, rx, ry, 1), AL = CL_armSolve(-27, -2, lx, ly, -1); h[2] = lx; h[3] = ly;
  const v = { x, y, ang, up, s, hrL: [rx, ry], hlL: [h[2], h[3]], hr: toW(AR.hx, AR.hy), hl: toW(AL.hx, AL.hy) };
  CL_TMEMO = { t, v }; return v;
}
const CL_teacherHand = t => { const T_ = CL_teach(t); return { x: T_.hr[0], y: T_.hr[1] }; };
const CL_handL = t => { const T_ = CL_teach(t); return { x: T_.hl[0], y: T_.hl[1] }; };

// ───────── notes: tracks (hops), unfold, tickets ─────────
const CL_NSPOT = (r, c) => ({ x: CL_COLX[c] + 20, y: CL_DY(r) - 6 });
function CL_hopsUp(c, rFrom, rTo, t0, dur, gap, H) { const m = []; let t = t0; for (let r = rFrom - 1; r >= rTo; r--) { m.push({ t0: t, t1: t + dur, to: CL_NSPOT(r, c), H, pass: [r, c] }); t += dur + gap; } return m; }
const CL_NOTES = [
  { id: 'you', who: { name: 'You', col: C.blue }, tIn: A_.tPass - 0.36, start: CL_NSPOT(5, 2), rot: -0.06,
    moves: [...CL_hopsUp(2, 5, 0, A_.tPass, 0.2, 0.03, 34), { t0: 35.1, t1: 35.32, to: CL_SLOT[0], H: 70 }, { t0: 35.72, t1: 35.9, to: CL_handL, H: 14, held: true },
      { t0: 37.9, t1: 38.15, to: { x: CL_DONE.x - 1, y: CL_DONE.y + 7 }, H: 50 }],
    unf: [[A_.tName - 0.41, A_.tName - 0.11, 0, 1], [A_.tName + 0.25, A_.tName + 0.37, 1, 0], [35.95, 36.25, 0, 1], [37.72, 37.88, 1, 0]],
    sc: [[A_.tName - 0.41, A_.tName - 0.11, 1, 1.8], [A_.tName + 0.25, A_.tName + 0.37, 1.8, 1], [35.95, 36.25, 1, 1.15], [37.72, 37.88, 1.15, 1]],
    lift: [[A_.tName - 0.41, A_.tName - 0.11, 0, 24], [A_.tName + 0.25, A_.tName + 0.37, 24, 0]], held: [35.9, 37.9], chip: 1, tChip: 35.32, tDone: 38.15, doneRot: 0.08 },
  { id: 'minji', who: { name: 'Minji', col: C.ink }, tIn: 34.18, start: CL_NSPOT(3, 7), rot: 0.05,
    moves: [...CL_hopsUp(7, 3, 0, 34.45, 0.18, 0.03, 30), { t0: 35.12, t1: 35.42, to: CL_SLOT[1], H: 80 }, { t0: 36.0, t1: 36.22, to: CL_SLOT[0], H: 0 },
      { t0: NB_NEW[1].t - 0.3, t1: NB_NEW[1].t + 0.03, to: { x: CL_DONE.x + 2, y: CL_DONE.y }, H: 50 }],
    unf: [], sc: [], lift: [], chip: 2, tChip: 35.42, tDone: NB_NEW[1].t + 0.03, doneRot: -0.07 },
  { id: 'leo', who: { name: 'Leo', col: C.ink }, tIn: 33.28, start: CL_NSPOT(8, 8), rot: 0.03,
    moves: [...CL_hopsUp(8, 8, 0, 33.55, 0.18, 0.03, 30), { t0: 35.24, t1: 35.55, to: CL_SLOT[2], H: 90 }, { t0: 36.06, t1: 36.28, to: CL_SLOT[1], H: 0 },
      { t0: NB_NEW[1].t - 0.17, t1: NB_NEW[1].t + 0.05, to: CL_SLOT[0], H: 0 }, { t0: NB_NEW[2].t - 0.3, t1: NB_NEW[2].t + 0.03, to: { x: CL_DONE.x - 2, y: CL_DONE.y - 7 }, H: 50 }],
    unf: [], sc: [], lift: [], chip: 3, tChip: 35.55, tDone: NB_NEW[2].t + 0.03, doneRot: 0.12 },
  { id: 'dup', who: { name: 'You', col: C.blue }, tIn: A_.tTwiceStart + 0.03, start: CL_NSPOT(5, 2), rot: -0.04,
    moves: [...CL_hopsUp(2, 5, 0, 44.0, 0.13, 0.02, 26), { t0: 44.8, t1: A_.tTwice + 0.27, to: CL_SLOT[0], H: 70 }, { t0: 45.6, t1: 45.78, to: CL_handL, H: 14, held: true },
      { t0: A_.tOnce - 0.09, t1: A_.tOnce + 0.26, to: { x: CL_BINC.x + 2, y: CL_BINC.y + 3 }, H: 85 }],
    unf: [[45.88, 46.18, 0, 1]], sc: [[45.88, 46.18, 1, 1.15]], lift: [], held: [45.78, A_.tOnce - 0.09],
    crumple: [A_.tOnce - 0.4, A_.tOnce - 0.14], tBin: A_.tOnce + 0.26 },
];
const CL_NOTE = {}; for (const n of CL_NOTES) CL_NOTE[n.id] = n;
const CL_PASS = new Map();                    // kid index → hops that land on their desk (they reach back for them)
for (const n of CL_NOTES) for (const m of n.moves) if (m.pass) { const key = m.pass[0] * 10 + m.pass[1]; if (!CL_PASS.has(key)) CL_PASS.set(key, []); CL_PASS.get(key).push({ n, m }); }
const CL_WRITE = [[CL_YOU, A_.tPass - 0.62, A_.tPass - 0.34], [CL_LEO, 33.0, 33.3], [CL_MINJI, 33.9, 34.2], [CL_YOU, A_.tTwiceStart - 0.24, A_.tTwiceStart + 0.04]];
function CL_trackAt(t, N) {
  let cur = N.start;
  for (const m of N.moves) {
    const to = typeof m.to === 'function' ? m.to(t) : m.to;
    if (t < m.t0) return { x: cur.x, y: cur.y, h: 0, held: false };
    if (t < m.t1) { const k = ease.smoother(seg(t, m.t0, m.t1)); return { x: lerp(cur.x, to.x, k), y: lerp(cur.y, to.y, k), h: Math.sin(CL_PI * k) * (m.H || 0), k, m, rot: lerp(cur.r ?? N.rot, to.r ?? N.rot, k) + Math.sin(CL_PI * k) * 0.22 }; }
    cur = to;
  }
  return { x: cur.x, y: cur.y, h: 0 };
}
function CL_noteState(t, N) {
  if (t < N.tIn) return null;
  const P = CL_trackAt(t, N), u = CL_chan(t, N.unf, 0), s = CL_chan(t, N.sc, 1);
  let h = P.h + CL_chan(t, N.lift, 0); const held = N.held && t >= N.held[0] && t < N.held[1]; if (held) h += 12;
  const pk = spring(t - N.tIn, 0.62, 18), c = N.crumple ? ease.smoother(seg(t, N.crumple[0], N.crumple[1])) : 0;
  let rot = P.rot ?? N.rot; if (N.tDone && t >= N.tDone - 0.25) rot = lerp(rot, N.doneRot, ease.smoother(seg(t, N.tDone - 0.25, N.tDone)));
  return { x: P.x, y: P.y, h, u, s: s * (0.7 + 0.3 * pk), op: clamp((t - N.tIn) / 0.1), rot, c, inBin: N.tBin && t >= N.tBin, binK: N.tBin ? seg(t, N.tBin - 0.12, N.tBin) : 0 };
}
const CL_drawnPos = S => S ? { x: S.x, y: S.y - S.h * 0.6 } : null;
const CL_notePos = t => CL_drawnPos(CL_noteState(t, CL_NOTE.you)) || { x: CL_NSPOT(5, 2).x, y: CL_NSPOT(5, 2).y };
const CL_dupPos = t => CL_drawnPos(CL_noteState(t, CL_NOTE.dup)) || { x: CL_NSPOT(5, 2).x, y: CL_NSPOT(5, 2).y };

// a paper note from above. open size 60 x 42 at s = 1; folded twice it shows 30 x 21. u: 0 folded → 1 open. c: crumple.
const CL_BALL = (() => { const R = OM.rng(91), v = []; for (let i = 0; i < 18; i++) { const a = i / 18 * 6.2832 + (R() - 0.5) * 0.2; v.push([Math.cos(a) * (9.5 + R() * 3.4), Math.sin(a) * (9 + R() * 3.4)]); } return v; })();
const CL_RECTP = (() => { const v = []; for (let i = 0; i < 18; i++) { const a = i / 18 * 6.2832, dx = Math.cos(a), dy = Math.sin(a), k = Math.min(30 / Math.abs(dx || 1e-6), 21 / Math.abs(dy || 1e-6)); v.push([dx * k, dy * k]); } return v; })();
function CL_noteInside(who, x0, x1) {         // inside face content, in open coordinates [-30,30] x [-21,21], clipped to [x0, x1]
  g.save(); g.beginPath(); g.rect(x0, -21, x1 - x0, 42); g.clip();
  g.fillStyle = '#fffefb'; g.fillRect(-30, -21, 60, 42);
  g.strokeStyle = 'rgba(13,13,15,0.07)'; g.lineWidth = 0.35; g.beginPath(); for (const y of [-13, -6, 1, 8, 15]) { g.moveTo(-26, y); g.lineTo(26, y); } g.stroke();
  g.fillStyle = who.col; heartPath(-13, 0.5, 18); g.fill();
  g.strokeStyle = who.col; g.lineWidth = 0.5; g.globalAlpha *= 0.9;
  T(who.name, -1.5, 6.2, { f: FH(who.name.length > 3 ? 12 : 15), c: who.col });
  g.restore();
}
function CL_noteLabel(who) {                  // outside face of the folded note, in [0,30] x [0,21]
  g.fillStyle = who.col; heartPath(8.2, 11.2, 8.4); g.fill();
  T(who.name, 13.4, 14.2, { f: FH(who.name.length > 3 ? 6.4 : 7.8), c: who.col });
}
function CL_note(x, y, o) {
  const { u = 0, s = 1, rot = 0, h = 0, who, op = 1, c = 0 } = o; if (op <= 0.003) return;
  const sc = s * (1 + h / 170), hw = clamp(1 / Math.max(0.05, CAM.zoom * sc), 0.15, 2);
  g.save(); g.globalAlpha *= op; g.translate(x, y - h * 0.6); g.rotate(rot); g.scale(sc, sc);
  const uB = clamp(u * 2), uA = clamp(u * 2 - 1);
  const sha = () => sh(5 + h * 0.7, 2 + h * 0.6, 0.18 / (1 + h / 40));
  if (c > 0.002) {                              // crumple: the sheet's outline folds in to a paper ball
    const k = ease.smoother(c), cs = lerp(1, 1, k); g.beginPath();
    for (let i = 0; i < 18; i++) { const a = CL_RECTP[i], b = CL_BALL[i], j = 0.6 * Math.sin(i * 2.7) * Math.sin(k * CL_PI); const px = lerp(a[0], b[0], k) * cs + j * 3, py = lerp(a[1], b[1], k) * cs + j * 2; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.closePath();
    g.fillStyle = mix('#fffefb', '#f1eee8', k); sha(); g.fill(); noSh(); g.strokeStyle = 'rgba(13,13,15,0.22)'; g.lineWidth = hw; g.stroke();
    if (k < 0.6) { g.save(); g.clip(); g.globalAlpha *= 1 - k / 0.6; g.scale(1 - k * 0.5, 1 - k * 0.5); CL_noteInside(who, -30, 30); g.restore(); }
    if (k > 0.25) { g.strokeStyle = `rgba(13,13,15,${(0.2 * k).toFixed(3)})`; g.lineWidth = hw * 0.9; g.beginPath(); for (let i = 0; i < 18; i += 2) { const b = CL_BALL[i], m = CL_BALL[(i + 7) % 18]; g.moveTo(b[0] * k, b[1] * k); g.lineTo(m[0] * 0.3 * k, m[1] * 0.3 * k); } g.stroke();
      const gr = g.createRadialGradient(-3, -4, 1, 0, 0, 13); gr.addColorStop(0, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(0,0,0,0.07)'); g.fillStyle = gr; g.globalAlpha *= k; g.beginPath(); for (let i = 0; i < 18; i++) { const b = CL_BALL[i]; i ? g.lineTo(b[0], b[1]) : g.moveTo(b[0], b[1]); } g.fill(); }
    g.restore(); return;
  }
  g.translate(-15 * (1 - uA), -10.5 * (1 - uB));      // keep the visible part centred while it opens
  const edge = (pts) => { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); };
  if (uA <= 0) {
    // stage B: the top flap swings up from the fold at y = 0 (the column is still folded in half)
    edge([[0, 0], [30, 0], [30, 21], [0, 21]]); g.fillStyle = '#fffefb'; sha(); g.fill(); noSh(); g.strokeStyle = 'rgba(13,13,15,0.2)'; g.lineWidth = hw; g.stroke();
    if (uB > 0.003) { g.fillStyle = 'rgba(13,13,15,0.05)'; g.fillRect(0, 0, 30, 3); }
    const ey = 21 * Math.cos(CL_PI * uB), sh_ = 0.8 + 0.2 * Math.abs(Math.cos(CL_PI * uB));
    if (Math.abs(ey) > 0.2) {
      edge([[0, 0], [30, 0], [30, ey], [0, ey]]); g.fillStyle = mix('#ffffff', '#d9d6cf', 1 - sh_); if (uB > 0.02 && ey > 0) sh(3 + 6 * uB, 1 + 3 * uB, 0.12); g.fill(); noSh();
      g.strokeStyle = 'rgba(13,13,15,0.2)'; g.lineWidth = hw; g.stroke();
      if (ey > 0) { g.save(); g.beginPath(); g.rect(0, 0, 30, ey); g.clip(); g.transform(1, 0, 0, ey / 21, 0, 0); CL_noteLabel(who); g.restore(); }
    }
  } else {
    // stage A: the left half swings open from the fold at x = 0
    edge([[0, -21], [30, -21], [30, 21], [0, 21]]); g.fillStyle = '#fffefb'; sha(); g.fill(); noSh();
    CL_noteInside(who, 0, 30); g.strokeStyle = 'rgba(13,13,15,0.2)'; g.lineWidth = hw; edge([[0, -21], [30, -21], [30, 21], [0, 21]]); g.stroke();
    const ex = 30 * Math.cos(CL_PI * uA), sh_ = 0.8 + 0.2 * Math.abs(Math.cos(CL_PI * uA));
    if (Math.abs(ex) > 0.2) {
      edge([[0, -21], [ex, -21], [ex, 21], [0, 21]]);
      if (ex > 0) { g.fillStyle = mix('#ffffff', '#d9d6cf', 1 - sh_); sh(3 + 6 * uA, 1 + 3 * uA, 0.12); g.fill(); noSh(); }
      else { g.save(); g.clip(); g.transform(-ex / 30, 0, 0, 1, 0, 0); CL_noteInside(who, -30, 0); g.restore(); if (uA < 0.98) { g.fillStyle = `rgba(13,13,15,${(0.08 * (1 - sh_) / 0.2).toFixed(3)})`; edge([[0, -21], [ex, -21], [ex, 21], [0, 21]]); g.fill(); } }
      g.strokeStyle = 'rgba(13,13,15,0.2)'; g.lineWidth = hw; edge([[0, -21], [ex, -21], [ex, 21], [0, 21]]); g.stroke();
    }
    if (uA > 0.9) { g.strokeStyle = 'rgba(13,13,15,0.09)'; g.lineWidth = hw * 0.8; g.beginPath(); g.moveTo(0, -21); g.lineTo(0, 21); g.moveTo(-30, 0); g.lineTo(30, 0); g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.moveTo(0.7, -21); g.lineTo(0.7, 21); g.moveTo(-30, 0.7); g.lineTo(30, 0.7); g.stroke(); }
  }
  g.restore();
}

// ───────── hearts ─────────
const CL_CRACK = [[0, -12.5], [-2.6, -8.4], [2.2, -4.6], [-3.2, -0.6], [1.6, 3.2], [-1.8, 6.8], [0.6, 9], [0, 11]];
// o: { col: 'blue' | 'ink', op, lift, rot, red 0..1, crack 0..1, half: -1 left / 1 right / 0 whole }
function CL_heart(x, y, sz, o = {}) {
  const { col = 'blue', op = 1, lift = 1, rot = 0, red = 0, crack = 0, half = 0 } = o; if (op <= 0.003 || sz <= 0.5) return;
  const k = sz / 32, blue = col === 'blue';
  g.save(); g.globalAlpha *= clamp(op); g.translate(x, y); g.rotate(rot);
  if (half) { g.beginPath(); g.moveTo(0, -24 * k); CL_CRACK.forEach(([cx, cy]) => g.lineTo(cx * k, cy * k)); g.lineTo(0, 16 * k); g.lineTo(half * 24 * k, 16 * k); g.lineTo(half * 24 * k, -24 * k); g.closePath(); g.clip(); }
  heartPath(0, 0, sz); g.fillStyle = blue ? C.blue : C.ink; sh(10 * lift, 6 * lift, 0.24 * (1 - 0.7 * red)); g.fill(); noSh();
  const gr = g.createLinearGradient(-sz * 0.4, -sz * 0.55, sz * 0.35, sz * 0.4);
  if (blue) { gr.addColorStop(0, '#6b97ff'); gr.addColorStop(0.45, '#2f6bff'); gr.addColorStop(1, '#1a4ad6'); } else { gr.addColorStop(0, '#55555b'); gr.addColorStop(0.5, '#1d1d20'); gr.addColorStop(1, '#0d0d0f'); }
  g.fillStyle = gr; g.fill();
  if (red > 0) { g.fillStyle = `rgba(255,240,238,${(0.97 * red).toFixed(3)})`; g.fill(); }
  g.strokeStyle = red > 0 ? mix(blue ? '#1a46c8' : '#000000', C.red, red) : (blue ? '#1a46c8' : '#000000'); g.lineWidth = Math.max(1.1 / Math.max(0.05, CAM.zoom), sz * 0.025 + sz * 0.045 * red); g.lineJoin = 'round'; g.stroke();
  g.fillStyle = `rgba(255,255,255,${(0.32 * (1 - red)).toFixed(3)})`; g.beginPath(); g.ellipse(-sz * 0.25, -sz * 0.31, sz * 0.11, sz * 0.065, -0.65, 0, 6.2832); g.fill();
  if (crack > 0) {                               // the crack runs down from the notch
    const n = CL_CRACK.length - 1, f = crack * n, i0 = Math.floor(f); g.beginPath(); g.moveTo(CL_CRACK[0][0] * k, CL_CRACK[0][1] * k);
    for (let i = 1; i <= Math.min(n, i0); i++) g.lineTo(CL_CRACK[i][0] * k, CL_CRACK[i][1] * k);
    if (i0 < n) { const a = CL_CRACK[i0], b = CL_CRACK[i0 + 1], u = f - i0; g.lineTo(lerp(a[0], b[0], u) * k, lerp(a[1], b[1], u) * k); }
    g.strokeStyle = red > 0.5 ? C.red : '#ffffff'; g.lineWidth = sz * 0.035; g.lineCap = 'round'; g.lineJoin = 'miter'; g.stroke();
  }
  if (half) { g.beginPath(); g.moveTo(CL_CRACK[0][0] * k, CL_CRACK[0][1] * k); CL_CRACK.forEach(([cx, cy]) => g.lineTo(cx * k, cy * k)); g.strokeStyle = C.red; g.lineWidth = sz * 0.05 * red; g.stroke(); }
  g.restore();
}

// ───────── labels: small SF Pro pills, a constant size on screen, never flying ─────────
function CL_pill(x, y, txt, { fill = C.ink, fg = '#fff', t0 = 0, t = 0, op = 1 } = {}) {
  if (t < t0 || op <= 0.003) return;
  const p = pop(t, t0, { rise: 0 }), q = clamp(1 / CAM.zoom, 0.5, 2.3), f = F(21 * q, 600), w = tw(txt, f) + 26 * q, h = 36 * q, cy = y + 24 + 6 * q + h / 2;
  g.save(); g.globalAlpha *= p.op * op; g.translate(x, cy); g.scale(p.s, p.s);
  g.fillStyle = fill; sh(12 * q, 5 * q, 0.2); rr(-w / 2, -h / 2, w, h, h / 2); g.fill(); noSh();
  g.beginPath(); g.moveTo(-5.5 * q, -h / 2 + 1); g.lineTo(0, -h / 2 - 6 * q); g.lineTo(5.5 * q, -h / 2 + 1); g.closePath(); g.fill();
  T(txt, 0, 7.4 * q, { f, c: fg, al: 'center' }); g.restore();
}
function CL_chip(x, y, n, t, t0, tDone, q = 1) {   // queue ticket: a tiny mono number chip that becomes a check when done
  if (t < t0) return; const k = spring(t - t0, 0.5, 22), dk = tDone ? spring(t - tDone, 0.55, 20) : 0;
  if (dk < 0.98) { g.save(); g.translate(x, y); const s = (0.6 + 0.4 * k) * (1 - dk) * q; g.scale(s, s); g.globalAlpha *= clamp(k * 2) * (1 - dk);
    g.fillStyle = C.ink; sh(5, 2, 0.2); g.beginPath(); g.arc(0, 0, 7.6, 0, 6.2832); g.fill(); noSh(); T(String(n), 0, 3.6, { f: FM(10, 600), c: '#fff', al: 'center' }); g.restore(); }
  if (dk > 0.003) check(x, y, 7.8 * q, { k: dk });
}

// ───────── gaze: heads follow what is happening ─────────
const CL_GAZE = [
  { w: t => sstep(14.6, 14.95, t) * (1 - sstep(17.9, 18.4, t)), f: CL_youPos, r: 620 },
  { w: t => sstep(16.5, 16.8, t) * (1 - sstep(17.95, 18.4, t)), f: CL_minjiPos, r: 620 },
  { w: t => 0.55 * sstep(18.2, 18.7, t) * (1 - sstep(26.0, 26.6, t)), f: () => CL_num(), r: 1e6 },
  { w: t => sstep(29.45, 29.65, t) * (1 - sstep(31.1, 31.5, t)), f: CL_youPos, r: 560 },
  { w: t => sstep(29.45, 29.65, t) * (1 - sstep(31.0, 31.4, t)), f: CL_minjiPos, r: 560 },
  { w: t => 0.6 * sstep(30.2, 30.5, t) * (1 - sstep(31.4, 31.8, t)), f: t => CL_teach(t), r: 1e6 },
  { w: t => sstep(32.95, 33.2, t) * (1 - sstep(35.2, 35.5, t)), f: CL_notePos, r: 430 },
  { w: t => 0.62 * sstep(35.4, 35.8, t) * (1 - sstep(42.5, 42.9, t)), f: t => CL_teach(t), r: 1e6 },
  { w: t => sstep(43.95, 44.1, t) * (1 - sstep(45.1, 45.4, t)), f: CL_dupPos, r: 430 },
  { w: t => 0.6 * sstep(45.4, 45.8, t) * (1 - sstep(48.6, 49.2, t)), f: t => CL_teach(t), r: 1e6 },
];
function CL_head(k, t, act) {
  const idle = 0.08 * Math.sin(0.55 * t + k.ph) + 0.045 * Math.sin(1.31 * t + 2 * k.ph);
  let W = 0, A = 0; const hx = k.x, hy = k.y - 4;
  for (const G of act) { const p = G.f(t - k.lag), d = Math.hypot(p.x - hx, p.y - hy); if (d < 30) continue; const w = G.wv * Math.exp(-d / G.r);
    const a = clamp(CL_wrap(Math.atan2(p.y - hy, p.x - hx) + CL_S), -1.25, 1.25); W += w; A += w * a; }
  return W > 1 ? A / W : idle * (1 - W) + A;
}

// ───────── 3 · the floor ─────────
const CL_PLANKS = (() => { const R = OM.rng(31), P = []; for (let i = 0; i < 23; i++) { const x = FLOOR.x + i * 70; let y = FLOOR.y - R() * 500; while (y < FLOOR.y + FLOOR.h) { const L = 340 + R() * 420; P.push([x, y, Math.min(70, FLOOR.x + FLOOR.w - x), L, Math.floor(R() * 4), R()]); y += L; } } return P; })();
const CL_WINDOWS = [[1080, 1300], [1580, 1800], [2080, 2300]];
const CL_BOOKS = (() => { const R = OM.rng(55), B = []; let x = 2768; while (x < 3300) { const w = 7 + R() * 9; B.push([x, w, ['#d8d4cc', '#e7e4dd', '#b9b5ad', '#8f8d88', '#c9c5bc', '#f6f4ef', '#6f6d69'][Math.floor(R() * 7)], 26 + R() * 10]); x += w + 1.2 + (R() < 0.12 ? 10 : 0); } return B; })();
function CL_plant(cx, cy, r, seed) {
  const R = OM.rng(seed);
  g.fillStyle = '#f4f2ed'; sh(18, 9, 0.18); g.beginPath(); g.arc(cx, cy, r * 0.62, 0, 6.2832); g.fill(); noSh();
  g.strokeStyle = 'rgba(13,13,15,0.14)'; g.lineWidth = CL_hair1(); g.stroke(); g.fillStyle = '#6f6458'; g.beginPath(); g.arc(cx, cy, r * 0.52, 0, 6.2832); g.fill();
  const L = []; for (let i = 0; i < 13; i++) L.push([R() * 6.283, r * (0.55 + R() * 0.55), 0.18 + R() * 0.12, R()]);
  L.sort((a, b) => a[3] - b[3]);
  for (const [a, len, wd, tone] of L) { g.save(); g.translate(cx, cy); g.rotate(a); g.fillStyle = mix('#3d4038', '#9aa094', tone); sh(6, 3, 0.16);
    g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(len * 0.5, -len * wd, len, 0); g.quadraticCurveTo(len * 0.5, len * wd, 0, 0); g.fill(); noSh();
    g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = CL_hair1() * 0.8; g.beginPath(); g.moveTo(len * 0.1, 0); g.lineTo(len * 0.92, 0); g.stroke(); g.restore(); }
}
layer(3, 'cl-floor', t => {
  if (!onScreen(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h + 200, 200)) return;
  const { x, y, w, h } = FLOOR, z = CAM.zoom, hw = CL_hair1();
  plate(x, y, w, h, 0, { fill: '#ebe7df', lift: 1.5, line: false });
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip();
  const tones = ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.07)', 'rgba(110,90,60,0.025)', 'rgba(110,90,60,0.05)'];
  for (let b = 0; b < 4; b++) { g.beginPath(); for (const p of CL_PLANKS) if (p[4] === b) g.rect(p[0], p[1], p[2], p[3]); g.fillStyle = tones[b]; g.fill(); }
  g.beginPath(); for (let i = 1; i < 23; i++) { g.moveTo(x + i * 70, y); g.lineTo(x + i * 70, y + h); } for (const p of CL_PLANKS) { g.moveTo(p[0], p[1]); g.lineTo(p[0] + p[2], p[1]); }
  g.strokeStyle = 'rgba(96,78,50,0.13)'; g.lineWidth = Math.max(hw, 1.1); g.stroke();
  if (z > 0.9) { g.beginPath(); for (const p of CL_PLANKS) { const n = 2; for (let j = 0; j < n; j++) { const gx = p[0] + 14 + j * 26 + p[5] * 12; g.moveTo(gx, p[1] + 10); g.bezierCurveTo(gx + 6, p[1] + p[3] * 0.3, gx - 6, p[1] + p[3] * 0.6, gx + 2, p[1] + p[3] - 10); } }
    g.strokeStyle = 'rgba(96,78,50,0.045)'; g.lineWidth = hw; g.stroke(); }
  for (const [y0, y1] of CL_WINDOWS) { const gr = g.createLinearGradient(x + w, 0, x + w - 520, 0); gr.addColorStop(0, 'rgba(255,253,246,0.55)'); gr.addColorStop(1, 'rgba(255,253,246,0)');
    g.fillStyle = gr; g.beginPath(); g.moveTo(x + w, y0); g.lineTo(x + w, y1); g.lineTo(x + w - 520, y1 + 190); g.lineTo(x + w - 520, y0 + 190); g.closePath(); g.fill(); }
  const edgeSh = (x0, y0, x1, y1, a) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, `rgba(40,30,12,${a})`); gr.addColorStop(1, 'rgba(40,30,12,0)'); g.fillStyle = gr; g.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0) || w, Math.abs(y1 - y0) || h); };
  edgeSh(x, y, x, y + 70, 0.16); edgeSh(x + 22, y, x + 90, y, 0.1); edgeSh(x + w - 22, y, x + w - 90, y, 0.08); edgeSh(x, y + h - 22, x, y + h - 90, 0.1);
  g.restore();
  // walls (white, raised), windows on the right, the door at the back
  g.fillStyle = '#fbfaf7'; g.beginPath(); g.rect(x, y, 22, h); g.rect(x + w - 22, y, 22, h); g.rect(x, y + h - 22, 1340, 22); g.rect(x + 1480, y + h - 22, w - 1480, 22);
  sh(16, 6, 0.12); g.fill(); noSh(); g.strokeStyle = 'rgba(13,13,15,0.12)'; g.lineWidth = hw; g.stroke();
  for (const [y0, y1] of CL_WINDOWS) { g.fillStyle = '#f2f4f5'; g.fillRect(x + w - 22, y0, 22, y1 - y0); g.strokeStyle = 'rgba(13,13,15,0.32)'; g.lineWidth = hw; g.beginPath();
    g.moveTo(x + w - 22, y0); g.lineTo(x + w, y0); g.moveTo(x + w - 22, y1); g.lineTo(x + w, y1); g.moveTo(x + w - 13, y0); g.lineTo(x + w - 13, y1); g.moveTo(x + w - 9, y0); g.lineTo(x + w - 9, y1); g.stroke(); }
  { const hx = x + 1480, hy = y + h; g.fillStyle = '#fbfaf7'; sh(10, 5, 0.14); g.fillRect(hx - 8, hy, 8, 140); noSh(); g.strokeStyle = 'rgba(13,13,15,0.25)'; g.lineWidth = hw; g.strokeRect(hx - 8, hy, 8, 140);
    g.setLineDash([7, 6]); g.beginPath(); g.arc(hx, hy, 140, CL_S, CL_PI); g.stroke(); g.setLineDash([]); }
  // a low bookshelf on the back wall, plants in two corners
  if (onScreen(2750, 2520, 600, 70, 50)) { plate(2758, y + h - 70, 556, 46, 4, { fill: '#f6f4ef', lift: 0.7 });
    if (z > 0.5) { for (const [bx, bw, bc, bh] of CL_BOOKS) { g.fillStyle = bc; g.fillRect(bx, y + h - 66 + (38 - bh) / 2, bw, bh); } g.strokeStyle = 'rgba(13,13,15,0.18)'; g.lineWidth = hw * 0.8; g.beginPath(); for (const [bx, bw, , bh] of CL_BOOKS) g.rect(bx, y + h - 66 + (38 - bh) / 2, bw, bh); g.stroke(); } }
  CL_plant(x + w - 62, y + h - 62, 44, 3); CL_plant(x + 70, y + 72, 40, 8);
});

// ───────── 5 · on the floor: footprints, the tape, the sign ─────────
layer(5, 'cl-floor-marks', t => {
  if (!onScreen(FLOOR.x, FLOOR.y, FLOOR.w, FLOOR.h, 100)) return;
  for (const W of [CL_W.you, CL_W.minji]) { if (t < W.T.w0 || t > W.T.w1 + 1) continue;
    for (const p of W.prints) { if (t < p.t || t > p.t + 0.95) continue; const a = 0.15 * (1 - (t - p.t) / 0.95);
      g.save(); g.translate(p.x, p.y); g.rotate(p.ang + CL_S); g.fillStyle = `rgba(13,13,15,${a.toFixed(3)})`; g.beginPath(); g.roundRect(-4.6, -10, 9.2, 13, 4.6); g.roundRect(-4, 4.5, 8, 6.5, 3.2); g.fill(); g.restore(); } }
  const t0 = A_.tTouch, t1 = t0 + 0.78; if (t < t0) return;
  const x0 = FLOOR.x + 22, x1 = FLOOR.x + FLOOR.w - 22, y = CL_TAPE_Y, tw_ = 20, k = ease.smoother(seg(t, t0, t1)), xe = lerp(x0, x1, k), hw = CL_hair1();
  g.fillStyle = 'rgba(30,24,12,0.10)'; g.fillRect(x0, y - tw_ / 2 + 1.6, xe - x0, tw_);
  g.save(); g.beginPath(); g.rect(x0, y - tw_ / 2, xe - x0, tw_); g.clip(); g.fillStyle = '#fbfaf6'; g.fillRect(x0, y - tw_ / 2, xe - x0, tw_);
  g.beginPath(); for (let sx = x0 - 30; sx < xe + 30; sx += 40) { g.moveTo(sx, y + tw_ / 2); g.lineTo(sx + 20, y + tw_ / 2); g.lineTo(sx + 32, y - tw_ / 2); g.lineTo(sx + 12, y - tw_ / 2); g.closePath(); } g.fillStyle = mix(C.ink, '#d4d1c9', 0.85 * sstep(A_.tPass - 0.3, A_.tPass + 0.4, t)); g.fill();   // the rule is set: the tape goes quiet so it never fights the captions
  const gl = g.createLinearGradient(0, y - tw_ / 2, 0, y + tw_ / 2); gl.addColorStop(0, 'rgba(255,255,255,0.28)'); gl.addColorStop(0.4, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,0,0.06)'); g.fillStyle = gl; g.fillRect(x0, y - tw_ / 2, xe - x0, tw_);
  g.restore(); g.strokeStyle = 'rgba(13,13,15,0.2)'; g.lineWidth = hw; g.strokeRect(x0, y - tw_ / 2, xe - x0, tw_);
  if (k < 1 || t < t1 + 0.4) {                    // the roll travels along and leaves
    const rx = xe + 24 + Math.max(0, t - t1) * 260, ro = 1 - seg(t, t1, t1 + 0.4); g.save(); g.globalAlpha *= ro; g.translate(rx, y);
    g.fillStyle = '#f4f2ed'; sh(12, 6, 0.2); g.beginPath(); g.roundRect(-24, -tw_ / 2 - 2, 48, tw_ + 4, 5); g.fill(); noSh();
    g.save(); g.beginPath(); g.roundRect(-24, -tw_ / 2 - 2, 48, tw_ + 4, 5); g.clip(); g.beginPath(); const off = (xe * 0.9) % 40; for (let sx = -60 - off; sx < 60; sx += 40) { g.moveTo(sx, tw_); g.lineTo(sx + 20, tw_); g.lineTo(sx + 30, -tw_); g.lineTo(sx + 10, -tw_); g.closePath(); } g.fillStyle = C.ink; g.fill();
    const cg = g.createLinearGradient(-24, 0, 24, 0); cg.addColorStop(0, 'rgba(0,0,0,0.32)'); cg.addColorStop(0.35, 'rgba(255,255,255,0.18)'); cg.addColorStop(0.6, 'rgba(255,255,255,0)'); cg.addColorStop(1, 'rgba(0,0,0,0.38)'); g.fillStyle = cg; g.fillRect(-24, -tw_, 48, tw_ * 2); g.restore();
    g.strokeStyle = 'rgba(13,13,15,0.3)'; g.lineWidth = hw; g.beginPath(); g.roundRect(-24, -tw_ / 2 - 2, 48, tw_ + 4, 5); g.stroke(); g.restore(); }
  const ps = pop(t, t0 + 0.42, { rise: 0, s0: 0.86, ds: 0.14 });   // the sign lying on the tape
  if (ps.op > 0.003) { g.save(); g.globalAlpha *= ps.op; g.translate(2864, y); g.scale(ps.s, ps.s); plate(-96, -26, 192, 52, 13, { lift: 1.0 });
    g.fillStyle = C.ink; g.beginPath(); g.arc(-68, 0, 10, 0, 6.2832); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2.6; g.lineCap = 'round'; g.beginPath(); g.moveTo(-73, 0); g.lineTo(-63, 0); g.stroke();
    T('Teacher only', -50, 8, { f: F(22, 600), c: C.ink }); g.restore(); }
});

// ───────── 11 · the teacher's desk ─────────
layer(11, 'cl-tdesk', t => {
  if (!onScreen(TDESK.x, TDESK.y, TDESK.w, TDESK.h, 120)) return;
  const { x, y, w, h } = TDESK, hw = CL_hair1();
  plate(x, y, w, h, 10, { fill: '#f5f0e6', lift: 1.15 });
  g.save(); rr(x, y, w, h, 10); g.clip();
  if (CAM.zoom > 0.7) { const R = OM.rng(4); g.beginPath(); for (let i = 0; i < 26; i++) { const gy = y + 6 + i * 7 + R() * 3; g.moveTo(x, gy); g.bezierCurveTo(x + w * 0.3, gy + (R() - 0.5) * 6, x + w * 0.6, gy + (R() - 0.5) * 6, x + w, gy + (R() - 0.5) * 4); }
    g.strokeStyle = 'rgba(120,96,60,0.06)'; g.lineWidth = hw; g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x, y, w, 2.5); g.fillStyle = 'rgba(80,60,30,0.07)'; g.fillRect(x, y + h - 6, w, 6);
  g.restore();
});

// ───────── 14 · chairs and bags ─────────
function CL_chairOff(k, t) { const W = k === CL_YOU ? CL_W.you : k === CL_MINJI ? CL_W.minji : null; return W ? W.up(t) : 0; }
layer(14, 'cl-chairs', t => {
  if (!onScreen(FLOOR.x, 980, FLOOR.w, 1560, 60)) return;
  const z = CAM.zoom, hw = CL_hair1(), vis = CL_KIDS.filter(k => onScreen(k.x - 40, k.y - 20, 80, 90, 10));
  const pose = k => { const u = CL_chairOff(k, t); return { x: k.x + u * 4, y: k.y + u * 16, a: u * 0.12 }; };
  const path = (fn) => { g.beginPath(); for (const k of vis) { const p = pose(k); g.save(); g.translate(p.x, p.y); g.rotate(p.a); fn(k); g.restore(); } };
  path(() => { g.roundRect(-22, -10, 44, 37, 7); g.roundRect(-26, 23, 52, 8, 4); });
  g.fillStyle = '#e4e0d8'; sh(12, 5, 0.12); g.fill(); sh(3, 1.5, 0.12); g.fill(); noSh();
  path(() => g.roundRect(-25, 23.5, 50, 6.5, 3.25)); g.fillStyle = '#6a6964'; g.fill();
  if (z > 0.7) { path(() => g.roundRect(-22, -10, 44, 37, 7)); g.strokeStyle = 'rgba(13,13,15,0.12)'; g.lineWidth = hw; g.stroke();
    path(() => g.roundRect(-24, 24.5, 48, 2, 1)); g.fillStyle = 'rgba(255,255,255,0.16)'; g.fill(); }
  if (z > 0.5) { const bags = vis.filter(k => k.bag);
    for (const k of bags) { const p = pose(k); g.save(); g.translate(p.x + k.bagX, p.y + 44); g.rotate(k.bagR + p.a); g.fillStyle = k.bagC; sh(8, 4, 0.16); g.beginPath(); g.roundRect(-15, -9, 30, 19, 7); g.fill(); noSh();
      g.strokeStyle = 'rgba(13,13,15,0.2)'; g.lineWidth = hw; g.stroke();
      if (z > 0.9) { g.strokeStyle = 'rgba(13,13,15,0.18)'; g.beginPath(); g.moveTo(-14, -1); g.quadraticCurveTo(0, 4, 14, -1); g.moveTo(-8, -9); g.lineTo(-8, -14); g.moveTo(8, -9); g.lineTo(8, -14); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-11, -7, 22, 2); } g.restore(); } }
});

// ───────── 16 · the 100 desks, and what lies on them ─────────
function CL_pencil(col, z) {
  g.fillStyle = col; g.fillRect(-16, -2.3, 30, 4.6);
  if (z > 1.1) { g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(-16, -2.3, 30, 1.3); g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(-16, 1.2, 30, 1.1); }
  g.fillStyle = '#e9dcc6'; g.beginPath(); g.moveTo(-16, -2.3); g.lineTo(-23, 0); g.lineTo(-16, 2.3); g.closePath(); g.fill();
  g.fillStyle = '#2a2a2e'; g.beginPath(); g.moveTo(-21.2, -0.6); g.lineTo(-23.4, 0); g.lineTo(-21.2, 0.6); g.closePath(); g.fill();
  g.fillStyle = '#a7a39b'; g.fillRect(14, -2.4, 3.6, 4.8); g.fillStyle = '#ddd6cc'; g.beginPath(); g.roundRect(17.4, -2.3, 4, 4.6, 1.6); g.fill();
}
function CL_deskItems(k, t, z, hw) {
  g.save(); g.translate(k.dx, k.dy);
  g.save(); g.translate(-12, 6); g.rotate(k.pr);
  g.fillStyle = 'rgba(40,30,12,0.07)'; g.fillRect(-16.4, -21, 34, 44); g.fillStyle = '#fffefb'; g.fillRect(-17, -22, 34, 44);
  if (z > 1.0) { g.strokeStyle = 'rgba(13,13,15,0.08)'; g.lineWidth = hw * 0.6; g.beginPath(); for (let i = 0; i < 7; i++) { g.moveTo(-14, -15 + i * 6); g.lineTo(14, -15 + i * 6); } g.stroke();
    g.strokeStyle = 'rgba(13,13,15,0.42)'; g.lineWidth = Math.max(0.35, hw * 0.55); g.beginPath(); for (const L of k.scr) L.forEach((p, i) => (i ? g.lineTo(p[0], p[1] - 1.5) : g.moveTo(p[0], p[1] - 1.5))); g.stroke(); }
  g.strokeStyle = 'rgba(13,13,15,0.1)'; g.lineWidth = hw * 0.7; g.strokeRect(-17, -22, 34, 44); g.restore();
  if (k.item < 0.14) { g.save(); g.translate(26, -13); g.rotate(k.pr * 2); g.fillStyle = k.item < 0.05 ? '#3a3a3f' : k.item < 0.1 ? '#a9a59d' : '#d9d4ca'; sh(4, 2, 0.16); g.beginPath(); g.roundRect(-13, -10, 26, 20, 2); g.fill(); noSh();
    g.fillStyle = '#efece5'; g.fillRect(10.5, -9, 2, 18); g.fillStyle = 'rgba(255,255,255,0.15)'; g.fillRect(-13, -10, 3, 20); g.restore(); }
  else if (k.item < 0.36) { g.save(); g.translate(30, -16); g.rotate(0.3 + k.pr); g.fillStyle = '#fbfaf7'; g.beginPath(); g.roundRect(-7, -4, 14, 8, 1.6); g.fill(); g.strokeStyle = 'rgba(13,13,15,0.2)'; g.lineWidth = hw * 0.7; g.stroke(); g.fillStyle = '#3a3a3f'; g.fillRect(-1, -4, 8, 8); g.restore(); }
  g.save(); g.translate(26, 10); g.rotate(k.pc); g.fillStyle = 'rgba(40,30,12,0.12)'; g.fillRect(-22, -1.3, 44, 4.6); CL_pencil(k.pencil, z); g.restore();
  g.restore();
}
layer(16, 'cl-desks', t => {
  if (!onScreen(FLOOR.x, 980, FLOOR.w, 1500, 60)) return;
  const z = CAM.zoom, hw = CL_hair1(), vis = CL_KIDS.filter(k => onScreen(k.dx - 50, k.dy - 34, 100, 68, 10));
  if (!vis.length) return;
  g.beginPath(); for (const k of vis) g.roundRect(k.dx - 46, k.dy - 29, 92, 58, 5);
  g.fillStyle = '#fcfbf8'; sh(24, 11, 0.12); g.fill(); sh(5, 2.2, 0.13); g.fill(); noSh();
  g.strokeStyle = 'rgba(13,13,15,0.1)'; g.lineWidth = hw; g.stroke();
  g.beginPath(); for (const k of vis) g.rect(k.dx - 44, k.dy + 25.5, 88, 3); g.fillStyle = 'rgba(80,64,40,0.05)'; g.fill();
  g.beginPath(); for (const k of vis) g.rect(k.dx - 44, k.dy - 28, 88, 1.6); g.fillStyle = 'rgba(255,255,255,0.9)'; g.fill();
  if (z > 0.55) for (const k of vis) CL_deskItems(k, t, z, hw);
});

// ───────── 33 · tray, bin (+ the ball once it is in) ─────────
function CL_tray(t) {
  const { x, y, w, h } = TRAY, hw = CL_hair1();
  plate(x, y, w, h, 12, { fill: '#fdfcfa', lift: 0.8 });
  const ix = x + 9, iy = y + 9, iw = w - 18, ih = h - 18;
  g.save(); rr(ix, iy, iw, ih, 7); g.fillStyle = '#efede7'; g.fill(); g.clip();
  g.strokeStyle = 'rgba(13,13,15,0.045)'; g.lineWidth = hw; g.beginPath(); for (let i = 1; i < 12; i++) { g.moveTo(ix + i * iw / 12, iy); g.lineTo(ix + i * iw / 12, iy + ih); } g.stroke();
  g.shadowColor = 'rgba(24,20,10,0.24)'; g.shadowBlur = 9 * ZS * DPR; g.shadowOffsetY = 4 * ZS * DPR; g.shadowOffsetX = 1.5 * ZS * DPR;
  g.lineWidth = 24; g.strokeStyle = '#000'; rr(ix - 12, iy - 12, iw + 24, ih + 24, 18); g.stroke(); noSh(); g.restore();
  g.strokeStyle = 'rgba(13,13,15,0.14)'; g.lineWidth = hw; rr(ix, iy, iw, ih, 7); g.stroke();
  g.fillStyle = '#efede7'; g.beginPath(); g.ellipse(x + w / 2, y + 4.5, 22, 9, 0, 0, CL_PI); g.fill(); g.strokeStyle = 'rgba(13,13,15,0.14)'; g.beginPath(); g.ellipse(x + w / 2, y + 4.5, 22, 9, 0, 0, CL_PI); g.stroke();
  T('NOTES', x + w / 2, y + h - 2.2, { f: FM(7, 600), c: C.mute, al: 'center', ls: 1.4 });
}
function CL_bin(t) {
  const { x: cx, y: cy, r } = CL_BINC, tB = CL_NOTE.dup.tBin, hw = CL_hair1(), b = t > tB ? OM.ring(t - tB, 8, 30) : 0, s = 1 + b * 0.05;
  g.save(); g.translate(cx, cy); g.scale(s, s);
  g.fillStyle = '#d9d5cc'; sh(18, 10, 0.24); g.beginPath(); g.arc(0, 0, r, 0, 6.2832); g.fill(); sh(4, 2, 0.16); g.fill(); noSh();
  const bx = 2.4, by = 4.2, br = r * 0.6;
  const gw = g.createRadialGradient(bx, by, br * 0.6, 0, 0, r); gw.addColorStop(0, '#d6d2c9'); gw.addColorStop(1, '#a9a49a'); g.fillStyle = gw; g.beginPath(); g.arc(0, 0, r, 0, 6.2832); g.fill();
  g.fillStyle = '#e6e2da'; g.beginPath(); g.arc(bx, by, br, 0, 6.2832); g.fill(); g.strokeStyle = 'rgba(13,13,15,0.35)'; g.lineWidth = hw * 1.2; g.stroke();
  if (CAM.zoom > 0.9) { g.strokeStyle = 'rgba(13,13,15,0.12)'; g.lineWidth = hw * 0.7; g.beginPath(); for (let i = -4; i <= 4; i++) { g.moveTo(bx + i * 5.5, by - Math.sqrt(Math.max(0, br * br - (i * 5.5) ** 2))); g.lineTo(bx + i * 5.5, by + Math.sqrt(Math.max(0, br * br - (i * 5.5) ** 2))); } g.stroke(); }
  if (t >= tB) CL_note(bx - 2 + b * 2, by, { c: 1, who: CL_NOTE.dup.who, s: 0.78, rot: 0.6 });
  g.strokeStyle = 'rgba(28,28,31,0.62)'; g.lineWidth = Math.max(0.5, hw * 1.05); g.beginPath();
  for (let i = 0; i < 40; i++) { const a = i / 40 * 6.2832, c = Math.cos(a), s_ = Math.sin(a); g.moveTo(bx + c * br, by + s_ * br); g.lineTo(c * (r - 2), s_ * (r - 2)); }
  for (const f of [0.25, 0.5, 0.75]) { const rr_ = lerp(br, r - 2, f), ox = lerp(bx, 0, f), oy = lerp(by, 0, f); g.moveTo(ox + rr_, oy); g.arc(ox, oy, rr_, 0, 6.2832); }
  g.stroke();
  g.strokeStyle = '#1c1c1f'; g.lineWidth = 4.2; g.beginPath(); g.arc(0, 0, r - 1.5, 0, 6.2832); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 1.2; g.beginPath(); g.arc(0, 0, r - 2.2, 3.6, 5.4); g.stroke();
  g.restore();
}
layer(33, 'cl-props', t => {
  if (!onScreen(TRAY.x - 40, TRAY.y - 40, BIN.x + BIN.w - TRAY.x + 80, 200, 60)) return;
  CL_tray(t); CL_bin(t);
});

// ───────── 36 · people ─────────
function CL_teacherChair(t, T_) {
  const k = sstep(A_.tTeacher + 0.05, A_.tTeacher + 0.5, t), cx = lerp(3500, 3402, k), cy = lerp(670, 652, k), a = lerp(0, -0.35, k);
  g.save(); g.translate(cx, cy); g.rotate(a); g.scale(1.4, 1.4); const hw = CL_hair1() / 1.4;
  g.strokeStyle = '#2a2a2e'; g.lineWidth = 3.4; g.lineCap = 'round'; g.beginPath(); for (let i = 0; i < 5; i++) { const b = -CL_S + i * 1.2566 + 0.3; g.moveTo(0, 0); g.lineTo(Math.cos(b) * 25, Math.sin(b) * 25); } g.stroke();
  g.fillStyle = '#1d1d20'; for (let i = 0; i < 5; i++) { const b = -CL_S + i * 1.2566 + 0.3; g.beginPath(); g.arc(Math.cos(b) * 25, Math.sin(b) * 25, 3, 0, 6.2832); g.fill(); }
  g.fillStyle = '#d7d3ca'; sh(12, 6, 0.16); g.beginPath(); g.roundRect(-21, -19, 42, 38, 12); g.fill(); noSh(); g.strokeStyle = 'rgba(13,13,15,0.16)'; g.lineWidth = hw; g.stroke();
  g.fillStyle = '#2a2a2e'; sh(8, 4, 0.18); g.beginPath(); g.roundRect(-24, -25, 48, 9, 4.5); g.fill(); noSh();
  g.restore();
}
function CL_drawTeacher(t) {
  if (!onScreen(3330, 560, 360, 220, 80) || t < 6.6) return;
  const T_ = CL_teach(t), p = pop(t, 6.66, { rise: 0, s0: 1.3, ds: -0.3 });
  CL_teacherChair(t, T_);
  const atBoard = SHARED.WL_teacherAtBoard ? SHARED.WL_teacherAtBoard(t) : false, look = sstep(37.3, 37.6, t) * (1 - sstep(38.7, 39.0, t)) + sstep(46.0, 46.25, t) * (1 - sstep(47.0, 47.3, t));
  CL_person(T_.x, T_.y, T_.ang, CL_TLOOK, { s: (1 + 0.03 * T_.up) * p.s, op: p.op, stand: T_.up, hr: T_.hrL, hl: T_.hlL, marker: t > A_.tRule + 0.42 && !atBoard, shadow: true, lift: 1 + 0.6 * T_.up,
    head: 0.08 * Math.sin(0.5 * t + 1) + 0.42 * look });
}
function CL_drawWalker(W, t) {
  if (!W.isUp(t)) return; const k = W.kid, S = W.state(t);
  if (t > W.T.b0 && t < W.T.b1 + 0.25) for (let i = 3; i >= 1; i--) { const tg = t - 0.075 * i; if (tg < W.T.b0) continue; const G = W.state(tg);
    CL_person(G.x, G.y, G.ang, k, { s: 1.04, stand: G.up, walk: G.wk, phase: G.phase, op: [0, 0.3, 0.17, 0.08][i] * (1 - seg(t, W.T.b1 - 0.1, W.T.b1 + 0.25)), sway: Math.sin(G.phase) * 0.07 * G.wk }); }
  const bob = 1 + 0.016 * Math.abs(Math.sin(S.phase)) * S.wk, wr = sstep(19.15, 19.4, t) * (1 - sstep(21.0, 21.25, t));   // arms up while wall.js shows the hands writing (19.3-21.25)
  CL_person(S.x, S.y, S.ang, k, { s: (1 + 0.04 * S.up) * bob, stand: S.up, walk: S.wk, phase: S.phase, shadow: true, lift: 1 + 0.9 * S.up, sway: Math.sin(S.phase) * 0.07 * S.wk,
    hr: [12 + 3 * Math.sin(t * 9), -56 + 2 * Math.cos(t * 7)], hrW: wr, hl: [-10, -50], hlW: wr * 0.6, head: 0.05 * Math.sin(t * 1.7 + k.ph) * (1 - S.wk) });
}
function CL_seatPose(k, t) {                  // how a seated kid holds their arms: writing, resting on the desk, or hands in the lap
  if (k.pose === 'write') return { r: [2 + 1.2 * Math.sin(t * 6.3 + k.ph), -45 + 0.9 * Math.cos(t * 4.7 + k.ph)], l: [-23, -36], lap: 0 };
  if (k.pose === 'rest') return { r: [9, -37], l: [-9, -38], lap: 0 };
  return { r: [30, 3], l: [-30, 3], lap: 1 };
}
function CL_kidArms(k, t) {                       // seated: write a note, or reach back for a note that is passed forward
  for (const [kid, t0, t1] of CL_WRITE) if (kid === k && t > t0 - 0.15 && t < t1 + 0.2) return { hr: [-6 + 3.2 * Math.sin(t * 37), -50 + 1.6 * Math.cos(t * 23)], hrW: sstep(t0 - 0.15, t0, t) * (1 - sstep(t1, t1 + 0.2, t)) };
  const L = CL_PASS.get(k.r * 10 + k.c); if (!L) return null;
  for (const { n, m } of L) if (t > m.t0 - 0.16 && t < m.t1 + 0.32) { const P = CL_trackAt(t, n); return { hr: [P.x - k.x, P.y - k.y], hrW: sstep(m.t0 - 0.16, m.t0 + 0.02, t) * (1 - sstep(m.t1 + 0.04, m.t1 + 0.32, t)) }; }
  return null;
}
layer(36, 'cl-people', t => {
  if (!onScreen(FLOOR.x, 480, FLOOR.w, 2150, 80)) return;
  CL_drawTeacher(t);
  if (t < 6.6) return;
  const act = []; for (const G of CL_GAZE) { const wv = G.w(t); if (wv > 0.003) act.push({ wv, f: G.f, r: G.r }); }
  const vis = [];
  for (const k of CL_KIDS) { if ((k === CL_YOU && CL_W.you.isUp(t)) || (k === CL_MINJI && CL_W.minji.isUp(t))) continue;
    if (!onScreen(k.x - 50, k.y - 70, 100, 110, 20)) continue; const tau = t - k.tPop; if (tau <= 0) continue;
    const sp = spring(tau, 0.6, 15); vis.push({ k, op: clamp(tau / 0.12), s: 1 + 0.34 * (1 - sp), lift: 1 + 3.2 * Math.max(0, 1 - sp), settled: tau > 0.75 }); }
  g.beginPath(); let n = 0;
  for (const v of vis) if (v.settled) { g.roundRect(v.k.x - 32, v.k.y - 11, 64, 24, 12); g.moveTo(v.k.x + CL_HR, v.k.y + CL_HY); g.arc(v.k.x, v.k.y + CL_HY, CL_HR, 0, 6.2832); n++; }
  if (n) { g.fillStyle = '#dcd8d0'; sh(15, 7, 0.16); g.fill(); sh(4, 2, 0.14); g.fill(); noSh(); }
  for (const v of vis) { const a = CL_kidArms(v.k, t) || {};
    const ps = CL_seatPose(v.k, t);
    CL_person(v.k.x, v.k.y, -CL_S, v.k, { s: v.s, op: v.op, shadow: !v.settled, lift: v.lift, head: CL_head(v.k, t, act), hr: a.hr, hrW: a.hrW, seatR: ps.r, seatL: ps.l, lap: ps.lap }); }
  CL_drawWalker(CL_W.minji, t); CL_drawWalker(CL_W.you, t);
});

// ───────── 42 · notes, tickets, the done pile ─────────
layer(42, 'cl-notes', t => {
  if (t < 32.5 || !onScreen(FLOOR.x, 600, FLOOR.w, 1700, 80)) return;
  const order = ['leo', 'minji', 'you', 'dup'];
  for (const id of order) { const N = CL_NOTE[id], S = CL_noteState(t, N); if (!S || S.inBin) continue;
    const sb = S.binK > 0 ? lerp(1, 0.8, ease.quadOut(S.binK)) : 1;
    CL_note(S.x, S.y, { u: S.u, s: S.s * sb, rot: S.rot, h: S.h, who: N.who, op: S.op, c: S.c });
    if (N.chip && t >= N.tChip) { const q = 1 + S.u * 0.15, dx = -17 * S.s * (1 + S.u), dy = -14 * S.s * (1 + S.u * 0.9), cov = CL_NOTES.find(o => o.tDone > N.tDone && t >= o.tDone - 0.05);   // only the top of the done pile keeps its check
      if (!cov) CL_chip(S.x + dx, S.y - S.h * 0.6 + dy, N.chip, t, N.tChip, N.tDone, q); }
  }
});

// ───────── 46 · name pills ─────────
layer(46, 'cl-labels', t => {
  if (t < 7 || !onScreen(FLOOR.x - 100, 400, FLOOR.w + 200, 2300, 100)) return;
  const y = CL_youPos(t), m = CL_minjiPos(t);
  CL_pill(CL_SARA.x, CL_SARA.y, 'Sara', { t, t0: A_.tSara, op: 1 - sstep(13.2, 13.6, t) });
  CL_pill(y.x, y.y, 'You', { t, t0: 7.35, fill: C.blue });
  CL_pill(m.x, m.y, 'Minji', { t, t0: A_.tMinji });
  CL_pill(CL_LEO.x, CL_LEO.y, 'Leo', { t, t0: 33.4 });
});

// ───────── 64 · hearts, sight lines (above the board) ─────────
const CL_HUP = 82;                                // a heart floats this far above a kid at the board
layer(64, 'cl-hearts', t => {
  if (t < 13.8 || t > 49) return;
  const hw = CL_hair1();
  // R4 · your like appears, rides along while you walk, waits at the board
  if (t >= A_.tLikeIt && t < A_.tNumber + 0.12) { const Y = CL_youPos(t), p = pop(t, A_.tLikeIt, { rise: 0, s0: 0.4, ds: 0.6 }), atB = sstep(A_.tTwo - 0.05, A_.tTwo + 0.25, t);
    const sz = lerp(lerp(38, 26, sstep(A_.tWalk - 0.1, A_.tWalk + 0.25, t)), 44, spring(t - A_.tTwo, 0.55, 16) * (t > A_.tTwo ? 1 : 0)), oy = lerp(58, CL_HUP, sstep(17.6, 18.2, t));
    CL_heart(Y.x + 2, Y.y - oy + 3 * Math.sin(t * 4.2) * (1 - atB), sz * p.s, { col: 'blue', op: p.op, lift: 1.6 }); }
  // R6 · both saw 41: dashed sight lines from each head to the number
  if (t > A_.tSaw - 0.05 && t < A_.tWrite + 0.3) { const k = ease.expoOut(seg(t, A_.tSaw - 0.05, A_.tSaw + 0.3)), fo = 1 - sstep(A_.tWrite - 0.2, A_.tWrite + 0.3, t);
    for (const [P, col, dl] of [[KID_SPOT.you, C.blue, 0], [KID_SPOT.minji, C.ink, 0.06]]) { const kk = ease.expoOut(seg(t, A_.tSaw - 0.05 + dl, A_.tSaw + 0.3 + dl)), sx = P.x, sy = P.y - 22, N_ = CL_num(), th = Math.atan2((sy - N_.y) / 118, (sx - N_.x) / 168), ex = lerp(sx, N_.x + 168 * Math.cos(th), kk), ey = lerp(sy, N_.y - 4 + 118 * Math.sin(th), kk);
      ln(sx, sy, ex, ey, { c: col, w: 3.2, dash: [11, 9], op: fo }); g.save(); g.globalAlpha *= fo * kk; g.fillStyle = col; g.beginPath(); g.arc(ex, ey, 5, 0, 6.2832); g.fill(); g.restore(); }
    g.save(); g.globalAlpha *= fo * k; g.strokeStyle = C.ink; g.lineWidth = 2.4; g.setLineDash([6, 6]); const N2 = CL_num(); g.beginPath(); g.ellipse(N2.x, N2.y - 4, 168, 118, 0, 0, 6.2832); g.stroke(); g.restore(); }
  // R7 · two hearts fly to the number: Minji's merges, yours bounces off, grows, cracks, splits, falls
  const Mi = { x: KID_SPOT.minji.x, y: KID_SPOT.minji.y - CL_HUP }, Yo = { x: KID_SPOT.you.x, y: KID_SPOT.you.y - CL_HUP }, tgt = { x: CL_num().x + 40, y: CL_num().y + 10 };
  if (t >= A_.tTwo && t < A_.tNumber + 0.9) { const p = pop(t, A_.tTwo, { rise: 0, s0: 0.4, ds: 0.6 }), f0 = A_.tNumber, f1 = f0 + 0.5;
    const u = seg(t, f0, f1), e = u * u * (3 - 2 * u), x = lerp(Mi.x, tgt.x, e), y = lerp(Mi.y, tgt.y, e) - Math.sin(CL_PI * e) * 70, sz = 44 * p.s * (1 - 0.75 * sstep(f1 - 0.16, f1, t));
    if (t < f1) CL_heart(x, y, sz, { col: 'ink', op: p.op * (1 - sstep(f1 - 0.08, f1, t)), lift: 1.6 + Math.sin(CL_PI * e) });
    if (t >= f1 - 0.02) { const r = ease.expoOut(seg(t, f1 - 0.02, f1 + 0.45)); g.save(); g.globalAlpha *= 1 - r; g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.arc(tgt.x, tgt.y - 14, 30 + 60 * r, 0, 6.2832); g.stroke(); g.restore(); } }
  if (t >= A_.tNumber + 0.12 && t < A_.tGone + 0.95) {
    const f0 = A_.tNumber + 0.12, f1 = A_.tNumber + 0.7, b1 = f1 + 0.62, tC = A_.tGone - 0.42, tG = A_.tGone;
    let x, y, sz, rot = 0, lift = 1.6;
    if (t < f1) { const u = ease.smoother(seg(t, f0, f1)); x = lerp(Yo.x, tgt.x - 30, u); y = lerp(Yo.y, tgt.y, u) - Math.sin(CL_PI * u) * 60; sz = 44; lift = 1.6 + Math.sin(CL_PI * u); }
    else if (t < b1) { const u = seg(t, f1, b1), e = ease.cubicOut(u); x = lerp(tgt.x - 30, CL_BROKE.x, e); y = lerp(tgt.y, CL_BROKE.y, u * u) - Math.sin(CL_PI * Math.min(1, u * 1.15)) * 130; sz = lerp(44, 104, ease.cubicOut(u)); rot = -0.5 * Math.sin(CL_PI * u); lift = 2.2; }
    else { const im = OM.impact(t, b1, { decay: 9, omega: 24 }); x = CL_BROKE.x; y = CL_BROKE.y + 2 * Math.sin((t - b1) * 2.4); sz = 104 * (1 + 0.04 * im.r); lift = 1.8; }
    const hitK = t > f1 ? OM.ring(t - f1, 12, 40) : 0;
    const red = sstep(tG - 0.16, tG + 0.02, t), crack = ease.cubicOut(seg(t, tC, tG - 0.16)), shk = t > tC && t < tG ? 2.2 * Math.sin(t * 90) * (1 - seg(t, tC, tG)) : 0;
    if (t < tG) CL_heart(x + hitK * 6 + shk, y, sz, { col: 'blue', lift, rot, red, crack });
    else { const tau = t - tG, op = 1 - sstep(0.26, 0.58, tau), sep = ease.expoOut(seg(t, tG, tG + 0.3));
      CL_heart(x - 12 * sep - 40 * tau, y + 0.5 * 1500 * tau * tau, sz, { col: 'blue', lift, rot: -0.32 * sep - 0.5 * tau, red: 1, half: -1, op });
      CL_heart(x + 14 * sep + 46 * tau, y + 0.5 * 1650 * tau * tau, sz, { col: 'blue', lift, rot: 0.38 * sep + 0.6 * tau, red: 1, half: 1, op }); }
  }
  // R14 · nobody is lost: a heart with a check glows above each of the three seats
  if (t > A_.tLost - 0.05 && t < A_.tTwiceStart + 0.9) { const fo = 1 - sstep(A_.tTwiceStart + 0.3, A_.tTwiceStart + 0.8, t);
    [[CL_YOU, 'blue', 0], [CL_MINJI, 'ink', 0.09], [CL_LEO, 'ink', 0.18]].forEach(([k, col, d]) => { const p = pop(t, A_.tLost + d, { rise: 0, s0: 0.3, ds: 0.7 }); if (p.op <= 0.003) return;
      const hx = k.x, hy = k.y - 36; g.save(); g.globalAlpha *= p.op * fo;
      const gr = g.createRadialGradient(hx, hy, 4, hx, hy, 86); gr.addColorStop(0, col === 'blue' ? 'rgba(37,99,255,0.30)' : 'rgba(255,255,255,0.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(hx, hy, 86, 0, 6.2832); g.fill(); g.restore();
      CL_heart(hx, hy, 58 * p.s, { col, op: p.op * fo, lift: 2 }); check(hx + 25 * p.s, hy + 17 * p.s, 13 * p.s, { k: p.op * fo, fill: col === 'blue' ? C.blue : C.ink }); }); }
});

// ───────── sound moments ─────────
window.SFX_EVENTS = (window.SFX_EVENTS || []).concat([
  { t: 6.7, kind: 'whoosh_low', v: 0.4, note: 'class: 100 students drop into their seats, front to back' },
  { t: A_.tLikeIt, kind: 'pop', v: 0.5, note: 'class: your blue heart pops above You' },
  { t: A_.tWalk + 0.05, kind: 'footsteps', v: 0.38, note: 'class: You walks up the aisle (to 17.9)' },
  { t: A_.tStands, kind: 'footsteps', v: 0.32, note: 'class: Minji hurries up the right aisle (to 17.95)' },
  { t: A_.tSaw, kind: 'tick', v: 0.3, note: 'class: both sight lines land on 41' },
  { t: A_.tTwo, kind: 'pop', v: 0.42, note: 'class: a heart above each kid' },
  { t: A_.tNumber, kind: 'whoosh', v: 0.42, note: 'class: both hearts fly to the number' },
  { t: A_.tNumber + 0.5, kind: 'hit', v: 0.36, note: 'class: Minji’s heart merges into the number' },
  { t: A_.tNumber + 0.7, kind: 'hit', v: 0.55, note: 'class: your heart hits and bounces off' },
  { t: A_.tGone, kind: 'hit', v: 0.5, note: 'class: your heart cracks in two (low, glassy)' },
  { t: A_.tRuleStart + 0.1, kind: 'whoosh_big', v: 0.5, note: 'class: rewind, both kids walk back to their seats' },
  { t: A_.tTouch, kind: 'paper', v: 0.42, note: 'class: floor tape unrolls across the room' },
  { t: A_.tPass - 0.6, kind: 'pen', v: 0.32, note: 'class: You writes the note' },
  { t: A_.tPass, kind: 'paper', v: 0.3, note: 'class: the note is passed desk to desk' },
  { t: A_.tName - 0.4, kind: 'paper', v: 0.45, note: 'class: the note unfolds (close-up)' },
  { t: 35.32, kind: 'tick', v: 0.26, note: 'class: ticket 1 (You) in the tray' },
  { t: 35.42, kind: 'tick', v: 0.22, note: 'class: ticket 2 (Minji)' },
  { t: 35.55, kind: 'tick', v: 0.22, note: 'class: ticket 3 (Leo)' },
  { t: 35.75, kind: 'paper', v: 0.34, note: 'class: the teacher takes note 1' },
  { t: 38.15, kind: 'tick', v: 0.32, note: 'class: You done (check)' },
  { t: NB_NEW[1].t + 0.03, kind: 'tick', v: 0.3, note: 'class: Minji done (check)' },
  { t: NB_NEW[2].t + 0.03, kind: 'tick', v: 0.3, note: 'class: Leo done (check)' },
  { t: A_.tLost, kind: 'pop', v: 0.36, note: 'class: three hearts glow over the seats' },
  { t: A_.tTwiceStart + 0.15, kind: 'paper', v: 0.3, note: 'class: You sends the same note again' },
  { t: A_.tOnce - 0.4, kind: 'paper', v: 0.5, note: 'class: the duplicate is crumpled' },
  { t: A_.tOnce + 0.26, kind: 'hit', v: 0.32, note: 'class: paper ball lands in the wire bin' },
]);

// ───────── preview views (the integrator copies the keys from CAMERA NOTES below) ─────────
(function () {
  const X = ease.expoInOut, S = ease.sineInOut, L = ease.linear;
  const wide = [[6.0, DRAW.x + DRAW.w / 2, DRAW.y + DRAW.h / 2, 2.2, {}], [7.25, 3500, 1300, 0.5, { fy: 720, curve: X }], [13.4, 3500, 1290, 0.52, { fy: 720, curve: S }],
    [13.95, CL_YOU.x, CL_YOU.y - 60, 1.0, { curve: X }]];
  for (let t = 14.55; t < 15.95; t += 0.2) { const p = CL_youPos(t + 0.18); wide.push([t, p.x + 40, p.y - 80, 1.0, { curve: t < 14.6 ? S : L }]); }
  for (let t = 16.2; t <= 17.81; t += 0.2) { const a = CL_youPos(t + 0.15), b = CL_minjiPos(t + 0.15), dx = Math.abs(a.x - b.x) + 520, dy = Math.abs(a.y - b.y) + 520;
    wide.push([t, (a.x + b.x) / 2, (a.y + b.y) / 2 - 40, clamp(Math.min(1080 / dx, 1150 / dy), 0.5, 1.0), { curve: t < 16.3 ? X : L }]); }
  wide.push([18.35, 3775, 445, 1.15, { curve: S }], [21.0, 3775, 440, 1.2, { curve: S }], [22.4, 3775, 430, 1.15, { curve: S }], [23.3, 3700, 420, 1.25, { curve: S }],
    [24.25, CL_BROKE.x, CL_BROKE.y + 30, 2.7, { curve: X, hit: 3 }], [25.3, CL_BROKE.x, CL_BROKE.y + 40, 2.9, { curve: S }], [26.1, CL_BROKE.x, CL_BROKE.y + 70, 2.75, { curve: S }]);
  VIEW_REG['cl-wide'] = { keys: wide };
  const notes = [[29.2, 3500, 1250, 0.55, {}], [29.45, 3500, 1250, 0.55, { curve: S }], [30.45, 3560, 565, 1.3, { curve: X }], [31.35, 3560, 570, 1.35, { curve: S }],
    [31.75, 3500, 1000, 0.74, { curve: X }], [32.75, 3500, 990, 0.76, { curve: S }], [33.05, CL_NSPOT(5, 2).x, CL_NSPOT(5, 2).y + 40, 1.4, { curve: X }]];
  for (let t = 33.25; t <= 34.2; t += 0.15) { const p = CL_notePos(t + 0.12); notes.push([t, p.x, p.y + 40, 1.4, { curve: L }]); }
  notes.push([34.62, CL_NSPOT(0, 2).x, CL_NSPOT(0, 2).y - 22, 3.0, { curve: X }], [35.0, CL_NSPOT(0, 2).x, CL_NSPOT(0, 2).y - 24, 3.1, { curve: S }],
    [35.42, 3610, 790, 2.0, { curve: X }], [37.3, 3600, 790, 2.05, { curve: S }], [37.7, 3520, 790, 2.0, { curve: S }], [38.6, 3580, 790, 2.0, { curve: S }],
    [39.9, 3680, 560, 1.05, { curve: X }], [42.3, 3680, 565, 1.1, { curve: S }], [42.78, 3500, 1300, 0.5, { curve: X }], [43.75, 3500, 1300, 0.52, { curve: S }]);
  VIEW_REG['cl-notes'] = { keys: notes };
  const bin = [[43.6, 3500, 1300, 0.52, {}], [43.98, CL_NSPOT(5, 2).x, CL_NSPOT(5, 2).y - 40, 1.25, { curve: X }]];
  for (let t = 44.15; t <= 44.75; t += 0.15) { const p = CL_dupPos(t + 0.1); bin.push([t, p.x, p.y + 30, 1.25, { curve: L }]); }
  bin.push([45.2, 3700, 790, 2.0, { curve: X }], [47.3, 3705, 792, 2.05, { curve: S }], [47.7, 3700, 795, 2.2, { curve: S }], [48.45, 3725, 800, 2.3, { curve: S }], [48.7, 3725, 800, 2.3, { curve: S }]);
  VIEW_REG['cl-bin'] = { keys: bin };
})();

// CAMERA NOTES (class.js) — keys as [t, x, y, zoom, {fy, curve}] in world units. X = ease.expoInOut (whip), S = ease.sineInOut (hold / ease), L = linear (tracking keys).
//  R1  6.43  pull back from Sara's drawing to the whole room:  [6.0, 3000, 275, 2.2] → [7.25, 3500, 1300, 0.5, {fy: 720, curve: X}] → hold [8.6, 3500, 1290, 0.52, {fy: 720, curve: S}]
//            (wall + floor span screen y 70-1370 at 0.5 with fy 720, so the caption pill sits just under the room; students drop in 6.70-7.65)
//  R4 13.73  whip to You: [13.95, 3150, 1792, 1.0, {curve: X}] (You's heart pops 13.93; 1.0-1.2 both work) then track You every 0.2 s with linear keys:
//            [t, CL_youPos(t+0.18).x + 40, CL_youPos(t+0.18).y - 80, 1.0, {curve: L}] for t = 14.55 … 15.95 (see VIEW_REG['cl-wide'])
//  R5 15.90  widen to keep You and Minji both in frame: centre = midpoint of CL_youPos / CL_minjiPos (+0.15 s), zoom = clamp(min(1080/(|dx|+520), 1150/(|dy|+520)), 0.5, 1)
//            keys every 0.2 s from 16.2 (first one curve X) to 17.8 (linear); about zoom 0.6 at 16.6, 1.0 at 17.8
//  R6 18.13  both at the board + the number: [18.35, 3775, 445, 1.15, {curve: S}] → [21.0, 3775, 440, 1.2, {curve: S}]   (sight lines at 18.55, arms write 20.1)
//  R7 21.07  hearts above both; flight 22.51-23.21: [22.4, 3775, 430, 1.15, S] → [23.3, 3700, 420, 1.25, S]
//            your heart bounces to the board's lower-left and grows: whip [24.25, 3458, 462, 2.7, {curve: X, hit: 3}] → [25.3, 3458, 472, 2.9, S] → [26.1, 3458, 502, 2.75, S]
//            (crack 24.8-25.18, red outline by 25.24, halves fall 25.22-25.95)
//  R9 29.40  rewind seen wide: [29.45, 3500, 1250, 0.55, S] (kids moonwalk back 29.5-31.05 with ghost trails)
//            then the teacher catches the marker: [30.45, 3560, 565, 1.3, {curve: X}] → [31.35, 3560, 570, 1.35, S]  (board tray + her raised right hand ≈ (3530, 630) = wall.js's hop target)
//  R10 31.43 the tape across the room: [31.75, 3500, 1000, 0.74, {curve: X}] → [32.75, 3500, 990, 0.76, S]  (tape 31.83-32.61, roll leaves; small "Teacher only" sign pops 32.25 at the left end, x 2864)
//  R11 32.93 You's desk: [33.05, 3170, 1824, 1.4, {curve: X}] then follow CL_notePos(t + 0.12) (+40 y) every 0.15 s to 34.2 (linear)
//            unfold close-up: [34.62, 3170, 1022, 3.0, {curve: X}] → [35.0, 3170, 1020, 3.1, S]   (note fully open 34.62-34.98, "You" readable)
//  R12 35.57 the tray, three tickets 1 2 3, teacher takes #1 at 35.75: [35.42, 3610, 790, 2.0, {curve: X}] → [37.3, 3600, 790, 2.05, S]
//  R13 37.47 notebook (wall.js pen writes "42. You") + the note in her hand: [37.7, 3520, 790, 2.0, S] → [38.6, 3580, 790, 2.0, S]   (note 1 to the done pile 37.9-38.15, ticket → check)
//  R14 39.23 board + desk together for 42 / 43 / 44 and the two notes going to the done pile: [39.9, 3680, 560, 1.05, {curve: X}] → [42.3, 3680, 565, 1.1, S]
//            "Nobody is lost": [42.78, 3500, 1300, 0.5, {curve: X}] → [43.75, 3500, 1300, 0.52, S]  (glowing hearts + checks over You, Minji, Leo)
//  R15 43.83 the second note: [43.98, 3170, 1754, 1.25, {curve: X}], follow CL_dupPos(t + 0.1) (+30 y) every 0.15 s to 44.75 (linear)
//            desk + bin: [45.2, 3700, 790, 2.0, {curve: X}] → [47.3, 3705, 792, 2.05, S] → [47.7, 3700, 795, 2.2, S] → [48.45, 3725, 800, 2.3, S]  (her hand ≈ x 3560 and the bin x 3855 both in frame)
//            (crumple 47.49-47.75, toss 47.8-48.15, bin rings 48.15)
