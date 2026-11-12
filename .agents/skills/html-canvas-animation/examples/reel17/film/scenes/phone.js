// scenes/phone.js · region A (the hook post), region C (the phone that sends a like), region E (the close).
// Every top-level name starts with PH_. Every value is a pure function of t (reel seconds). No Math.random, no Date.
'use strict';

// ═════════════════════════════ small shared bits ═════════════════════════════
const PH_in2 = u => u * u, PH_in3 = u => u * u * u;          // ease-ins (motion.js has only the outs)
const PH_fmt = n => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
// line icons, Instagram-like, centred on (cx, cy), about s wide
function PH_icon(kind, cx, cy, s, { c = C.ink, lw = 2.6, fill = null } = {}) {
  g.save(); g.strokeStyle = c; g.lineWidth = lw; g.lineJoin = 'round'; g.lineCap = 'round';
  if (kind === 'heart') { heartPath(cx, cy + s * 0.094, s); if (fill) { g.fillStyle = fill; g.fill(); } else g.stroke(); }
  else if (kind === 'comment') { const r = s * 0.44; g.beginPath(); g.arc(cx, cy, r, 2.62, 2.0 + 6.2832); g.lineTo(cx - s * 0.47, cy + s * 0.47); g.closePath(); g.stroke(); }
  else if (kind === 'share') { g.beginPath(); g.moveTo(cx - 0.46 * s, cy - 0.38 * s); g.lineTo(cx + 0.48 * s, cy - 0.38 * s); g.lineTo(cx + 0.02 * s, cy + 0.46 * s); g.lineTo(cx - 0.11 * s, cy - 0.03 * s); g.closePath();
    g.moveTo(cx - 0.11 * s, cy - 0.03 * s); g.lineTo(cx + 0.48 * s, cy - 0.38 * s); g.stroke(); }
  else if (kind === 'save') { g.beginPath(); g.moveTo(cx - 0.31 * s, cy - 0.45 * s); g.lineTo(cx + 0.31 * s, cy - 0.45 * s); g.lineTo(cx + 0.31 * s, cy + 0.46 * s); g.lineTo(cx, cy + 0.19 * s); g.lineTo(cx - 0.31 * s, cy + 0.46 * s); g.closePath(); g.stroke(); }
  g.restore();
}
// a tiny stopwatch glyph; ang = hand angle (rad, 0 = 12 o'clock)
function PH_watch(cx, cy, r, ang, c = '#fff', lw = 2) {
  g.save(); g.strokeStyle = c; g.fillStyle = c; g.lineWidth = lw; g.lineCap = 'round';
  g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.stroke(); rr(cx - r * 0.34, cy - r * 1.5, r * 0.68, r * 0.32, r * 0.12); g.fill();
  g.beginPath(); g.moveTo(cx, cy - r * 1.2); g.lineTo(cx, cy - r); g.stroke();
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(ang) * r * 0.68, cy - Math.cos(ang) * r * 0.68); g.stroke(); g.restore();
}
// a round avatar with a person glyph
function PH_person(cx, cy, r, bg, fg) {
  g.save(); g.fillStyle = bg; g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.fill(); g.clip(); g.fillStyle = fg;
  g.beginPath(); g.arc(cx, cy - r * 0.2, r * 0.34, 0, 6.2832); g.fill(); g.beginPath(); g.ellipse(cx, cy + r * 0.8, r * 0.62, r * 0.5, 0, 0, 6.2832); g.fill(); g.restore();
}
// Sara's avatar: a paper disc with a tiny crayon sun over a hill
function PH_saraAvatar(cx, cy, r) {
  g.save(); g.strokeStyle = 'rgba(13,13,15,0.16)'; g.lineWidth = 1.6; g.beginPath(); g.arc(cx, cy, r + 4, 0, 6.2832); g.stroke();
  g.fillStyle = '#fffdf7'; g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.fill(); g.clip();
  g.strokeStyle = C.ink; g.lineWidth = r * 0.07; g.lineCap = 'round'; const sx = cx + r * 0.22, sy = cy - r * 0.22;
  g.beginPath(); g.arc(sx, sy, r * 0.2, 0, 6.2832); g.stroke();
  for (let i = 0; i < 8; i++) { const a = i * 0.785; g.beginPath(); g.moveTo(sx + Math.cos(a) * r * 0.29, sy + Math.sin(a) * r * 0.29); g.lineTo(sx + Math.cos(a) * r * 0.4, sy + Math.sin(a) * r * 0.4); g.stroke(); }
  g.beginPath(); g.moveTo(cx - r, cy + r * 0.62); g.quadraticCurveTo(cx - r * 0.3, cy + r * 0.05, cx + r * 0.3, cy + r * 0.5); g.quadraticCurveTo(cx + r * 0.6, cy + r * 0.34, cx + r, cy + r * 0.46); g.stroke();
  g.restore();
}

// ─── an odometer: every digit is a column that rolls up. N = the count (real), rate = likes per second (for the blur),
// e0 = roll progress of the ones digit to force (null = from the rate). Returns the x where the number ends.
function PH_odo(x, y, N, rate, { px = 30, wt = 600, c = C.ink, bg = '#ffffff', e0 = null, digits = 7 } = {}) {
  const f = F(px, wt); g.save(); g.font = f; g.textBaseline = 'alphabetic'; g.letterSpacing = '0px';
  let dw = 0; for (let d = 0; d < 10; d++) dw = Math.max(dw, g.measureText(String(d)).width);
  const cw = g.measureText(',').width, LH = px * 1.1, k = Math.floor(N), u = N - k, w0 = clamp(rate * 0.16);
  const E0 = e0 !== null ? e0 : (w0 >= 0.999 ? u : ease.cubicOut(clamp(u / Math.max(w0, 1e-6))));
  const cols = []; let cx = x;
  for (let i = digits - 1; i >= 0; i--) { cols.push({ p: i, x: cx }); cx += dw; if (i > 0 && i % 3 === 0) { g.fillStyle = c; g.textAlign = 'left'; g.fillText(',', cx, y); cx += cw; } }
  const top = y - px * 0.9, bot = y + px * 0.24;
  g.save(); g.beginPath(); for (const cl of cols) g.rect(cl.x - 1, top, dw + 2, bot - top); g.clip(); g.fillStyle = c; g.textAlign = 'center';
  for (const cl of cols) {
    const P = Math.pow(10, cl.p), carry = (k % P === 0) ? k / P - 1 + E0 : Math.floor(k / P), cont = (N - 1) / P, sp = rate / P;
    const pos = lerp(carry, cont, sstep(0.45, 1, clamp(sp * 0.16))), blur = Math.min(1.9, sp / 46);
    const n = blur < 0.05 ? 1 : Math.min(40, 3 + Math.ceil(blur * 18));
    for (let j = 0; j < n; j++) { const pj = pos - (n === 1 ? 0 : blur * j / (n - 1)), b = Math.floor(pj), fr = pj - b, d0 = ((b % 10) + 10) % 10;
      g.globalAlpha = n === 1 ? 1 : Math.min(1, 2.1 * Math.sin(Math.PI * (j + 0.5) / n) / n * (1 + 0.6 / (1 + blur)));
      g.fillText(String(d0), cl.x + dw / 2, y - fr * LH); if (fr > 0.001) g.fillText(String((d0 + 1) % 10), cl.x + dw / 2, y + (1 - fr) * LH); }
  }
  g.globalAlpha = 1; g.restore();
  // soft top and bottom of the window, so a rolling digit fades in and out like a real drum
  const [r, gg, bb] = hex(bg), x0 = x - 2, x1 = cx + 2;
  let gr = g.createLinearGradient(0, top, 0, top + px * 0.34); gr.addColorStop(0, `rgba(${r},${gg},${bb},1)`); gr.addColorStop(1, `rgba(${r},${gg},${bb},0)`); g.fillStyle = gr; g.fillRect(x0, top - 1, x1 - x0, px * 0.34 + 1);
  gr = g.createLinearGradient(0, bot, 0, bot - px * 0.3); gr.addColorStop(0, `rgba(${r},${gg},${bb},1)`); gr.addColorStop(1, `rgba(${r},${gg},${bb},0)`); g.fillStyle = gr; g.fillRect(x0, bot - px * 0.3, x1 - x0, px * 0.3 + 1);
  g.restore(); return cx;
}

// ═════════════════════════════ A · the hook post ═════════════════════════════
// the like count: slow, then accelerating from "millions" to a blur by "heart", then 18,402 a second
const PH_N0 = 1204311.6, PH_R0 = 2.2, PH_RMAX = 18402, PH_K = Math.log(PH_RMAX / PH_R0) / (A_.tHeart - A_.tMillions);
function PH_rate(t) { return t < A_.tMillions ? PH_R0 : t < A_.tHeart ? PH_R0 * Math.exp(PH_K * (t - A_.tMillions)) : PH_RMAX; }
function PH_count(t) { const m = A_.tMillions, h = A_.tHeart; let n = PH_N0 + PH_R0 * clamp(t, 0, m);
  if (t > m) n += PH_R0 / PH_K * (Math.exp(PH_K * (Math.min(t, h) - m)) - 1); if (t > h) n += PH_RMAX * (t - h); return n; }
// taps on the heart: one ring each, sparse, then faster and faster
const PH_TAPS = (() => { const L = []; let tt = 2.36; while (tt < 7) { L.push(tt); tt += tt < A_.tMillions ? 0.6 : Math.max(0.09, 0.6 * Math.exp(-1.9 * (tt - A_.tMillions))); } return L; })();
const PH_PW = 880, PH_PH = 750, PH_HY = 670;    // post layout in its own units: header 0-84, image 84-634, footer 634-750, icon row at 674

// the post. (x, y) top-left, s = scale. Used by the hook (s 1, on a card) and by the phone screen (flat, s 0.518).
function PH_post(t, x, y, s, { card = true, N = PH_N0, rate = 0, e0 = null, heartT = 1e9, taps = null, chip = false } = {}) {
  g.save(); g.translate(x, y); g.scale(s, s);
  if (card) plate(0, 0, PH_PW, PH_PH, 30); else { g.fillStyle = '#fff'; g.fillRect(0, 0, PH_PW, PH_PH); }
  PH_saraAvatar(46, 42, 25);
  T('sara.draws', 86, 39, { f: F(26, 600) }); T('Art class', 86, 66, { f: F(20, 400), c: C.mute });
  g.fillStyle = C.ink; for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(838 + i * 11, 42, 3.3, 0, 6.2832); g.fill(); }
  g.save(); g.beginPath(); g.rect(0, 84, PH_PW, 550); g.clip(); SHARED.saraDrawing(0, 84, PH_PW, 550, t); g.restore();
  // footer · the heart takes taps: one expanding ring per tap
  const hx = 46, hy = PH_HY; let last = -1;
  if (taps) for (const tp of taps) { if (tp <= t) last = tp; const a = t - tp; if (a < 0 || a > 0.46) continue; const k = ease.cubicOut(a / 0.46);
    g.save(); g.globalAlpha = 0.46 * (1 - k); g.strokeStyle = t >= heartT ? C.red : C.ink; g.lineWidth = 0.7 + 2.1 * (1 - k); g.beginPath(); g.arc(hx, hy, 25 + 46 * k, 0, 6.2832); g.stroke(); g.restore(); }
  if (t < heartT) { const pr = last > 0 ? OM.press(t, last, { depth: -0.13, decay: 15, omega: 36 }) : { s: 1 }; PH_icon('heart', hx, hy, 42 * pr.s, { lw: 2.7 }); }
  else { const k = spring(t - heartT, 0.36, 21), im = OM.impact(t, heartT + 0.05, { decay: 9, omega: 26, sqx: 0.13, sqy: 0.15 }), sc = 0.3 + 0.7 * k;
    g.save(); g.translate(hx, hy); g.scale(sc * im.sx, sc * im.sy); PH_icon('heart', 0, 0, 42, { fill: C.red }); g.restore(); }
  PH_icon('comment', 112, hy, 40, { lw: 2.7 }); PH_icon('share', 174, hy - 1, 38, { lw: 2.7 }); PH_icon('save', 836, hy, 37, { lw: 2.7 });
  const xe = PH_odo(26, 733, N, rate, { px: 31, e0 }); T(' likes', xe, 733, { f: F(31, 600) });
  if (chip) PH_secChip(t, xe + tw(' likes', F(31, 600)) + 18, 722);
  g.restore();
}
// "in the same second": a black chip, a stopwatch sweeping one second, and the likes that landed in it
function PH_secChip(t, x, cy) {
  const t0 = A_.tSameSec - 0.04, k = pop(t, t0, { rise: 8, s0: 0.82, ds: 0.18 }); if (t < t0 || k.op <= 0.003) return;
  const n = 18402 * ease.cubicOut(seg(QT, t0 + 0.06, t0 + 0.82)), s1 = '1 s', s2 = '+' + PH_fmt(n), f = FM(19, 600), w1 = tw(s1, f), w2 = tw('+18,402', f), h = 38;
  const xd = 16 + 20 + 9 + w1 + 13, w = xd + 14 + w2 + 16;
  g.save(); g.globalAlpha *= k.op; g.translate(x, cy + k.dy); g.scale(k.s, k.s);
  g.fillStyle = C.ink; sh(16, 7, 0.22); rr(0, -h / 2, w, h, h / 2); g.fill(); noSh();
  PH_watch(16 + 10, 2, 8.5, 6.2832 * seg(t, t0 + 0.06, t0 + 1.06), '#fff', 2);
  T(s1, 16 + 20 + 9, 7, { f, c: '#fff' }); g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(xd, -10, 1.3, 20);
  T(s2, xd + 14, 7, { f, c: '#fff' }); g.restore();
}
layer(40, 'ph-post', t => {
  if (t > 9 || !onScreen(POST.x, POST.y, POST.w, POST.h, 120)) return;
  PH_post(t, POST.x, POST.y, 1, { N: PH_count(t), rate: PH_rate(t), heartT: A_.tHeart, taps: PH_TAPS, chip: true });
});

// ═════════════════════════════ C · the phone ═════════════════════════════
const PH_SCR = { x: PHONE.x + 22, y: PHONE.y + 22, w: PHONE.w - 44, h: PHONE.h - 44, r: 56 };
const PH_PS = PH_SCR.w / PH_PW, PH_PY = PH_SCR.y + 112;                       // the post on the phone: scale, top
const PH_HEART = [PH_SCR.x + 46 * PH_PS, PH_PY + PH_HY * PH_PS];               // the heart icon on the phone (world)
const PH_WAKE = A_.tPhone - 0.1, PH_TAPP = A_.tPhone + 0.15;                   // screen wakes · the finger taps the heart
const PH_ISL = { x: PHONE.x + PHONE.w / 2 - 62, y: PH_SCR.y + 14, w: 124, h: 36, r: 18 };   // the Dynamic Island
// the message above the phone: "+1" (struck out), then the request card, then the chip that flies to the network
const PH_TOUT = A_.tNever - 0.03, PH_TSTRIKE = A_.tNumberWord, PH_TMORPH = T0('R16c') + 0.06, PH_TFOLD = 53.6, PH_TFLY = 53.86, PH_TARR = 54.55;
const PH_C1 = { x: PHONE.x + 250 - 180, y: PHONE.y - 340, w: 360, h: 188, r: 42 };
const PH_C2 = { x: PHONE.x + 250 - 300, y: PHONE.y - 392, w: 600, h: 252, r: 40 };
const PH_CHIP = { w: 158, h: 60, r: 30 };
const PH_DEST = { x: 7660, y: 1460 };                                         // where the chip heads (network.js picks it up ~54.6)

function PH_phoneBody() {
  const { x, y, w, h } = PHONE, R = 78;
  // the long soft shadow on the paper (light from the top left) and the contact shadow
  g.save(); g.fillStyle = '#17171a'; sh(110, 54, 0.24, 30); rr(x, y, w, h, R); g.fill(); sh(16, 6, 0.34, 2); rr(x, y, w, h, R); g.fill(); noSh(); g.restore();
  const btn = (bx, by, bw, bh) => { const gr = g.createLinearGradient(bx, 0, bx + bw, 0); gr.addColorStop(0, '#4a4a50'); gr.addColorStop(0.5, '#1d1d20'); gr.addColorStop(1, '#3a3a40'); g.fillStyle = gr; rr(bx, by, bw, bh, 3.5); g.fill(); };
  btn(x - 6, y + 196, 10, 54); btn(x - 6, y + 284, 10, 98); btn(x - 6, y + 400, 10, 98); btn(x + w - 4, y + 300, 10, 156); btn(x + w - 4, y + 640, 8, 82);
  // titanium band
  const fg = g.createLinearGradient(x, y, x + w, y + h); fg.addColorStop(0, '#55555c'); fg.addColorStop(0.16, '#26262a'); fg.addColorStop(0.5, '#323237'); fg.addColorStop(0.84, '#18181b'); fg.addColorStop(1, '#45454c');
  g.fillStyle = fg; rr(x, y, w, h, R); g.fill();
  const hl = g.createLinearGradient(x, y, x + w * 0.6, y + h * 0.6); hl.addColorStop(0, 'rgba(255,255,255,0.55)'); hl.addColorStop(0.5, 'rgba(255,255,255,0.12)'); hl.addColorStop(1, 'rgba(255,255,255,0.05)');
  g.strokeStyle = hl; g.lineWidth = 1.6; rr(x + 1, y + 1, w - 2, h - 2, R - 1); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; rr(x + 4.5, y + 4.5, w - 9, h - 9, R - 4.5); g.stroke();
  // antenna lines in the band
  g.fillStyle = 'rgba(160,160,168,0.55)'; for (const [ax, ay, aw, ah] of [[x + 96, y, 5, 6], [x + w - 101, y, 5, 6], [x + 96, y + h - 6, 5, 6], [x + w - 101, y + h - 6, 5, 6], [x, y + 140, 6, 5], [x + w - 6, y + h - 160, 6, 5]]) g.fillRect(ax, ay, aw, ah);
  // black glass border
  g.fillStyle = '#020203'; rr(x + 9, y + 9, w - 18, h - 18, R - 9); g.fill();
}
function PH_statusBar(S) {
  T('9:41', S.x + 56, S.y + 45, { f: F(19, 600), al: 'center' });
  const bx = S.x + S.w - 128, by = S.y + 44; g.fillStyle = C.ink;
  for (let i = 0; i < 4; i++) { rr(bx + i * 6, by - 4 - i * 3, 4, 4 + i * 3, 1); g.fill(); }
  g.save(); g.strokeStyle = C.ink; g.lineCap = 'round'; g.lineWidth = 2.2; const wx = bx + 42, wy = by + 1;
  for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(wx, wy, 3 + i * 4.5, -2.36, -0.785); g.stroke(); } g.restore();
  g.save(); g.strokeStyle = 'rgba(13,13,15,0.45)'; g.lineWidth = 1.4; rr(bx + 60, by - 13, 27, 13, 4); g.stroke(); g.fillStyle = C.ink; rr(bx + 62.2, by - 10.8, 20, 8.6, 2.4); g.fill(); rr(bx + 88.5, by - 8.6, 2, 4.4, 1); g.fill(); g.restore();
}
function PH_tabBar(S) {
  const y0 = S.y + S.h - 86, cy = y0 + 34; g.fillStyle = '#fff'; g.fillRect(S.x, y0, S.w, 86); ln(S.x, y0, S.x + S.w, y0, { c: 'rgba(13,13,15,0.1)', w: 1, cap: 'butt' });
  const xs = [0.1, 0.3, 0.5, 0.7, 0.9].map(k => S.x + S.w * k); g.save(); g.strokeStyle = C.ink; g.fillStyle = C.ink; g.lineWidth = 2.2; g.lineJoin = 'round'; g.lineCap = 'round';
  g.beginPath(); g.moveTo(xs[0] - 11, cy + 10); g.lineTo(xs[0] - 11, cy - 3); g.lineTo(xs[0], cy - 12); g.lineTo(xs[0] + 11, cy - 3); g.lineTo(xs[0] + 11, cy + 10); g.closePath(); g.fill();
  g.beginPath(); g.arc(xs[1] - 2, cy - 2, 8.5, 0, 6.2832); g.stroke(); g.beginPath(); g.moveTo(xs[1] + 4.5, cy + 4.5); g.lineTo(xs[1] + 10, cy + 10); g.stroke();
  rr(xs[2] - 11, cy - 11, 22, 22, 6); g.stroke(); g.beginPath(); g.moveTo(xs[2], cy - 5); g.lineTo(xs[2], cy + 5); g.moveTo(xs[2] - 5, cy); g.lineTo(xs[2] + 5, cy); g.stroke();
  rr(xs[3] - 11, cy - 11, 22, 22, 6); g.stroke(); g.beginPath(); g.moveTo(xs[3] - 11, cy - 4); g.lineTo(xs[3] + 11, cy - 4); g.stroke(); g.beginPath(); g.moveTo(xs[3] - 2.5, cy - 0.5); g.lineTo(xs[3] + 4, cy + 3.2); g.lineTo(xs[3] - 2.5, cy + 7); g.closePath(); g.fill();
  g.restore(); PH_person(xs[4], cy, 11.5, C.ink, '#fff');
  g.fillStyle = C.ink; rr(S.x + S.w / 2 - 68, S.y + S.h - 16, 136, 5, 2.5); g.fill();
}
function PH_screen(t) {
  const S = PH_SCR, b = sstep(PH_WAKE, PH_WAKE + 0.22, t);
  g.save(); rr(S.x, S.y, S.w, S.h, S.r); g.clip();
  g.fillStyle = '#040405'; g.fillRect(S.x, S.y, S.w, S.h);
  if (b > 0.003) {
    g.fillStyle = '#fff'; g.fillRect(S.x, S.y, S.w, S.h); PH_statusBar(S);
    // nav: back chevron, the account over "Posts"
    g.save(); g.strokeStyle = C.ink; g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(S.x + 34, S.y + 76); g.lineTo(S.x + 24, S.y + 87); g.lineTo(S.x + 34, S.y + 98); g.stroke(); g.restore();
    T('SARA.DRAWS', S.x + S.w / 2, S.y + 76, { f: F(11.5, 500), c: C.mute, al: 'center', ls: 1.2 }); T('Posts', S.x + S.w / 2, S.y + 99, { f: F(19, 600), al: 'center' });
    const lit = t >= PH_TAPP + 0.06;
    PH_post(t, S.x, PH_PY, PH_PS, { card: false, N: lit ? 1204312 : 1204311, e0: lit ? ease.cubicOut(seg(t, PH_TAPP + 0.06, PH_TAPP + 0.3)) : 1, heartT: PH_TAPP, taps: [PH_TAPP] });
    // the next post, peeking
    const ny = PH_PY + PH_PH * PH_PS + 12; PH_person(S.x + 24, ny + 22, 13, '#d9d6cf', '#fff'); T('leo.builds', S.x + 46, ny + 27, { f: F(13.5, 600) });
    g.fillStyle = C.ink; for (let i = -1; i <= 1; i++) { g.beginPath(); g.arc(S.x + S.w - 22 + i * 6, ny + 22, 1.8, 0, 6.2832); g.fill(); }
    const gi = g.createLinearGradient(S.x, ny + 48, S.x + S.w, ny + 400); gi.addColorStop(0, '#f7f5f0'); gi.addColorStop(1, '#ebe7df'); g.fillStyle = gi; g.fillRect(S.x, ny + 48, S.w, 400);
    PH_tabBar(S);
    if (b < 0.997) { g.fillStyle = `rgba(4,4,5,${(1 - b).toFixed(3)})`; g.fillRect(S.x, S.y, S.w, S.h); }
  }
  // the glass: a diagonal reflection streak and a soft sheen
  const gl = g.createLinearGradient(S.x, S.y, S.x + S.w, S.y + S.h * 0.55);
  gl.addColorStop(0, 'rgba(255,255,255,0)'); gl.addColorStop(0.38, 'rgba(255,255,255,0)'); gl.addColorStop(0.45, `rgba(255,255,255,${0.09 - 0.05 * b})`); gl.addColorStop(0.53, `rgba(255,255,255,${0.035 - 0.02 * b})`); gl.addColorStop(0.6, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gl; g.fillRect(S.x, S.y, S.w, S.h);
  if (b < 1) { const rg = g.createRadialGradient(S.x + S.w * 0.3, S.y + S.h * 0.2, 10, S.x + S.w * 0.3, S.y + S.h * 0.2, S.h * 0.9); rg.addColorStop(0, `rgba(70,72,84,${0.22 * (1 - b)})`); rg.addColorStop(1, 'rgba(70,72,84,0)'); g.fillStyle = rg; g.fillRect(S.x, S.y, S.w, S.h); }
  g.restore();
  // the Dynamic Island and its lens
  g.fillStyle = '#000'; rr(PH_ISL.x, PH_ISL.y, PH_ISL.w, PH_ISL.h, PH_ISL.r); g.fill();
  const lx = PH_ISL.x + PH_ISL.w - 22, ly = PH_ISL.y + PH_ISL.h / 2; g.fillStyle = '#0d0e14'; g.beginPath(); g.arc(lx, ly, 8, 0, 6.2832); g.fill();
  g.fillStyle = 'rgba(120,130,170,0.35)'; g.beginPath(); g.arc(lx - 2.4, ly - 2.4, 2.4, 0, 6.2832); g.fill();
}
layer(36, 'ph-phone', t => {
  if (t < 40 || !onScreen(PHONE.x, PHONE.y, PHONE.w, PHONE.h, 140)) return;
  PH_phoneBody(); PH_screen(t);
});

// ─── a real fingertip, seen from above: tip at (tx, ty), ang = where it points (0 = up), wd = width,
// lift 0 = on the glass .. 1 = high (bigger, softer, farther shadow), blanch 0..1 = the nail bed whitens under pressure
function PH_finger(tx, ty, ang, wd, lift, blanch = 0) {
  const hw = wd / 2, L = 1700;
  const outline = () => { g.beginPath(); g.moveTo(-hw * 1.2, L); g.lineTo(-hw * 1.07, hw * 4.4); g.bezierCurveTo(-hw * 1.02, hw * 2.4, -hw * 0.95, hw * 0.62, -hw * 0.6, hw * 0.17);
    g.bezierCurveTo(-hw * 0.34, -hw * 0.05, hw * 0.34, -hw * 0.05, hw * 0.6, hw * 0.17); g.bezierCurveTo(hw * 0.95, hw * 0.62, hw * 1.02, hw * 2.4, hw * 1.07, hw * 4.4); g.lineTo(hw * 1.2, L); g.closePath(); };
  const nail = () => { g.beginPath(); g.moveTo(-hw * 0.6, hw * 1.6); g.bezierCurveTo(-hw * 0.67, hw * 1.1, -hw * 0.63, hw * 0.52, -hw * 0.43, hw * 0.31); g.bezierCurveTo(-hw * 0.2, hw * 0.14, hw * 0.2, hw * 0.14, hw * 0.43, hw * 0.31);
    g.bezierCurveTo(hw * 0.63, hw * 0.52, hw * 0.67, hw * 1.1, hw * 0.6, hw * 1.6); g.bezierCurveTo(hw * 0.44, hw * 1.86, -hw * 0.44, hw * 1.86, -hw * 0.6, hw * 1.6); g.closePath(); };
  g.save(); g.translate(tx, ty); g.rotate(ang); const sc = 1 + 0.07 * lift; g.scale(sc, sc);
  // cast shadow on the glass (shadow offsets ignore the transform, so the light stays top-left)
  g.save(); g.shadowColor = `rgba(28,16,8,${(0.34 - 0.13 * lift).toFixed(3)})`; g.shadowBlur = Math.min(260, (7 + 52 * lift) * ZS) * DPR; g.shadowOffsetX = (5 + 34 * lift) * ZS * DPR; g.shadowOffsetY = (9 + 56 * lift) * ZS * DPR;
  g.fillStyle = '#e0b090'; outline(); g.fill(); g.restore();
  // skin, round across the finger
  const gr = g.createLinearGradient(-hw * 1.12, 0, hw * 1.12, 0);
  gr.addColorStop(0, '#9e6750'); gr.addColorStop(0.09, '#c38a6d'); gr.addColorStop(0.28, '#e3b193'); gr.addColorStop(0.45, '#f1cbb0'); gr.addColorStop(0.6, '#ecc1a3'); gr.addColorStop(0.84, '#cf9577'); gr.addColorStop(1, '#a06a52');
  g.fillStyle = gr; outline(); g.fill();
  g.save(); outline(); g.clip();
  let rg = g.createRadialGradient(0, hw * 0.9, 2, 0, hw * 0.9, hw * 1.7); rg.addColorStop(0, 'rgba(232,128,112,0.20)'); rg.addColorStop(1, 'rgba(232,128,112,0)'); g.fillStyle = rg; g.fillRect(-hw * 1.3, -hw, hw * 2.6, hw * 3);
  if (blanch > 0.01) { rg = g.createRadialGradient(0, hw * 0.6, 2, 0, hw * 0.6, hw * 1.2); rg.addColorStop(0, `rgba(255,236,224,${(0.32 * blanch).toFixed(3)})`); rg.addColorStop(1, 'rgba(255,236,224,0)'); g.fillStyle = rg; g.fillRect(-hw * 1.3, -hw, hw * 2.6, hw * 3); }
  // knuckle creases: the last joint (fine) and the middle joint (deeper, with a darker patch)
  g.lineCap = 'round'; g.strokeStyle = 'rgba(118,64,46,0.32)'; g.lineWidth = Math.max(1, hw * 0.028);
  for (const [yy, bend, ww, dx] of [[3.0, -0.1, 0.42, 0.04], [3.2, -0.15, 0.6, -0.02], [3.38, -0.1, 0.5, 0.05], [3.55, -0.06, 0.32, -0.06]]) { g.beginPath(); g.moveTo(-hw * ww + hw * dx, hw * yy); g.quadraticCurveTo(hw * dx, hw * (yy + bend), hw * ww + hw * dx, hw * yy + hw * 0.02); g.stroke(); }
  rg = g.createRadialGradient(0, hw * 6.1, 2, 0, hw * 6.1, hw * 1.1); rg.addColorStop(0, 'rgba(150,84,60,0.16)'); rg.addColorStop(1, 'rgba(150,84,60,0)'); g.fillStyle = rg; g.fillRect(-hw * 1.3, hw * 4.6, hw * 2.6, hw * 3);
  g.strokeStyle = 'rgba(112,60,42,0.34)'; g.lineWidth = Math.max(1.1, hw * 0.034);
  for (const [yy, bend, ww, dx] of [[5.7, -0.18, 0.5, 0.0], [5.92, -0.24, 0.7, 0.03], [6.12, -0.2, 0.74, -0.03], [6.32, -0.16, 0.6, 0.02], [6.5, -0.1, 0.4, -0.04]]) { g.beginPath(); g.moveTo(-hw * ww + hw * dx, hw * yy); g.bezierCurveTo(-hw * ww * 0.4 + hw * dx, hw * (yy + bend), hw * ww * 0.3 + hw * dx, hw * (yy + bend * 0.6), hw * ww + hw * dx, hw * yy); g.stroke(); }
  g.restore();
  // the nail: plate, free edge, lunula, a highlight; the cuticle fold
  g.save(); nail(); g.clip();
  const ng = g.createLinearGradient(-hw * 0.66, 0, hw * 0.66, 0); ng.addColorStop(0, '#d79d88'); ng.addColorStop(0.3, '#f0c7b7'); ng.addColorStop(0.5, '#f5d4c6'); ng.addColorStop(0.75, '#ecbfae'); ng.addColorStop(1, '#d39985');
  g.fillStyle = ng; g.fillRect(-hw, 0, hw * 2, hw * 2);
  g.fillStyle = '#fbefe8'; g.beginPath(); g.moveTo(-hw, 0); g.lineTo(hw, 0); g.lineTo(hw, hw * 0.5); g.quadraticCurveTo(0, hw * 0.28, -hw, hw * 0.5); g.closePath(); g.fill();
  g.fillStyle = 'rgba(255,244,240,0.55)'; g.beginPath(); g.ellipse(0, hw * 1.7, hw * 0.36, hw * 0.17, 0, 0, 6.2832); g.fill();
  if (blanch > 0.01) { g.fillStyle = `rgba(255,246,242,${(0.42 * blanch).toFixed(3)})`; g.fillRect(-hw, hw * 0.4, hw * 2, hw * 1.6); }
  g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = hw * 0.07; g.lineCap = 'round'; g.beginPath(); g.moveTo(-hw * 0.3, hw * 0.66); g.quadraticCurveTo(-hw * 0.4, hw * 1.0, -hw * 0.36, hw * 1.42); g.stroke();
  g.restore();
  g.strokeStyle = 'rgba(128,70,54,0.4)'; g.lineWidth = Math.max(0.8, hw * 0.022); nail(); g.stroke();
  g.strokeStyle = 'rgba(150,90,70,0.3)'; g.lineWidth = Math.max(1, hw * 0.03); g.beginPath(); g.moveTo(-hw * 0.66, hw * 1.66); g.bezierCurveTo(-hw * 0.5, hw * 2.02, hw * 0.5, hw * 2.02, hw * 0.66, hw * 1.66); g.stroke();
  g.restore();
}
// the finger's path: in from the bottom right, presses the heart, lifts away
function PH_fingerAt(t) {
  if (t < 49.7 || t > 50.95) return null; const ang = -0.2, wd = 98, dir = [Math.sin(ang), -Math.cos(ang)];
  const tip = [PH_HEART[0] + dir[0] * wd * 0.44, PH_HEART[1] + dir[1] * wd * 0.44];
  const kin = ease.cubicInOut(seg(t, 49.76, PH_TAPP - 0.02)), kout = PH_in3(seg(t, PH_TAPP + 0.16, PH_TAPP + 0.66));
  const x = tip[0] - dir[0] * 920 * (1 - kin) + 170 * kout, y = tip[1] - dir[1] * 920 * (1 - kin) + 1080 * kout;
  const lift = t < PH_TAPP ? lerp(1, 0.18, kin) * (1 - PH_in3(seg(t, PH_TAPP - 0.06, PH_TAPP))) : 0.55 * ease.cubicOut(seg(t, PH_TAPP + 0.12, PH_TAPP + 0.42));
  const blanch = sstep(PH_TAPP - 0.03, PH_TAPP + 0.03, t) * (1 - sstep(PH_TAPP + 0.12, PH_TAPP + 0.26, t));
  return { x, y, ang, wd, lift, blanch };
}
layer(72, 'ph-finger', t => { const f = PH_fingerAt(t); if (!f || !onScreen(f.x - 200, f.y - 100, 400, 1800, 50)) return; PH_finger(f.x, f.y, f.ang, f.wd, f.lift, f.blanch); });

// ─── the message: the Dynamic Island grows into a "+1" card, "+1" is struck out, the card morphs into the
// request {like, user: "you", post}, folds into a blue chip and flies right to the network
function PH_chipAt(t) {          // centre of the flying chip (world), for t in [PH_TFLY, PH_TARR]; network.js may use it
  const c0 = { x: PH_C2.x + PH_C2.w / 2, y: PH_C2.y + PH_C2.h / 2 }, k = ease.cubicInOut(seg(t, PH_TFLY, PH_TARR));
  return { k, x: lerp(c0.x, PH_DEST.x, k), y: lerp(c0.y, PH_DEST.y, k) - Math.sin(Math.PI * k) * 250 };
}
const PH_REQ = [['{ user: ', '"you"', ','], ['  post: ', '"sara.draws/123"', ' }']];
function PH_reqContent(t, x, y, a, foldK) {      // request card content at card top-left (x, y), opacity a
  if (a <= 0.003) return; g.save(); g.globalAlpha *= a;
  const r0 = OM.maskRise(t, PH_TMORPH + 0.1, 0, { stagger: 0.07, dist: 26 }), hk = spring(t - (A_.tSendsName - 0.06), 0.62, 18);
  // header: the name dot (lights blue on "name") + "like" + a small heart
  g.save(); g.globalAlpha *= clamp(r0.k * 1.5); g.translate(0, r0.y);
  g.strokeStyle = 'rgba(13,13,15,0.2)'; g.lineWidth = 1.6; g.setLineDash([3, 4]); g.beginPath(); g.arc(x + 46, y + 52, 15, 0, 6.2832); g.stroke(); g.setLineDash([]);
  if (hk > 0.003) { g.save(); g.translate(x + 46, y + 52); g.scale(hk, hk); PH_person(0, 0, 15, C.blue, '#fff'); g.restore(); }
  T('like', x + 76, y + 63, { f: FM(32, 600) }); PH_icon('heart', x + PH_C2.w - 50, y + 52, 30, { lw: 2.6 });
  g.restore();
  const r1 = OM.maskRise(t, PH_TMORPH + 0.1, 1, { stagger: 0.07, dist: 26 }); ln(x + 30, y + 98, x + 30 + (PH_C2.w - 60) * ease.expoOut(clamp(r1.k)), y + 98, { c: 'rgba(13,13,15,0.1)', w: 1.4, cap: 'butt' });
  const f = FM(28, 500);
  PH_REQ.forEach(([a1, a2, a3], i) => { const r = OM.maskRise(t, PH_TMORPH + 0.1, i + 2, { stagger: 0.07, dist: 26 }); if (!r.visible) return; const yy = y + 150 + i * 48 + r.y;
    g.save(); g.globalAlpha *= clamp(r.k * 1.5); let xx = x + 34; T(a1, xx, yy, { f, c: C.ink2 }); xx += tw(a1, f);
    if (i === 0 && hk > 0.003) { const w = tw(a2, f) + 14; g.fillStyle = C.blueSoft; rr(xx - 7, yy - 30, w * Math.min(1, hk), 40, 9); g.fill(); }
    T(a2, xx, yy, { f: FM(28, i === 0 ? 600 : 500), c: i === 0 ? C.blue : C.ink }); xx += tw(a2, f); T(a3, xx, yy, { f, c: C.ink2 }); g.restore(); });
  g.restore();
}
function PH_packet(t) {
  if (t < PH_TOUT || t > PH_TARR + 0.05) return;
  const c2x = PH_C2.x + PH_C2.w / 2, c2y = PH_C2.y + PH_C2.h / 2;
  // the thread from the phone's top edge to the message (dashes flow upward: sending)
  const thr = sstep(PH_TOUT + 0.05, PH_TOUT + 0.3, t) * (1 - sstep(PH_TFOLD - 0.05, PH_TFOLD + 0.15, t));
  if (thr > 0.01) { const m = t < PH_TMORPH ? PH_C1 : PH_C2; g.save(); g.globalAlpha = 0.4 * thr; g.strokeStyle = C.ink; g.lineWidth = 2.2; g.setLineDash([2, 9]); g.lineCap = 'round'; g.lineDashOffset = t * 46;
    g.beginPath(); g.moveTo(PHONE.x + 250, PHONE.y - 6); g.lineTo(PHONE.x + 250, m.y + m.h + 14); g.stroke(); g.restore(); }
  if (t < PH_TFLY) {
    let m, fill = '#ffffff', lift = 1.2;
    if (t < PH_TMORPH) { m = OM.morphRect(t, PH_TOUT, PH_TOUT + 0.5, PH_ISL, PH_C1, { spring: { zeta: 0.8, omega: 13 } }); fill = mix('#000000', '#ffffff', sstep(0.05, 0.4, m.k)); }
    else if (t < PH_TFOLD) m = OM.morphRect(t, PH_TMORPH, PH_TMORPH + 0.5, PH_C1, PH_C2, { curve: ease.expoOut });
    else { const ch = { x: c2x - PH_CHIP.w / 2, y: c2y - PH_CHIP.h / 2, w: PH_CHIP.w, h: PH_CHIP.h, r: PH_CHIP.r }; m = OM.morphRect(t, PH_TFOLD, PH_TFLY, { ...PH_C2 }, ch, { curve: ease.expoInOut }); fill = mix('#ffffff', C.blue, sstep(0.15, 0.7, m.k)); }
    const dim = t < PH_TMORPH ? 1 - 0.06 * sstep(PH_TSTRIKE + 0.1, PH_TSTRIKE + 0.4, t) : 1, sx = m.cx, sy = m.cy;
    g.save(); g.translate(sx, sy); g.scale(dim, dim); g.translate(-sx, -sy);
    plate(m.x, m.y, m.w, m.h, m.r, { fill, lift });
    if (t < PH_TMORPH + 0.15) {           // "+1"
      const a = sstep(PH_TOUT + 0.25, PH_TOUT + 0.42, t) * (1 - sstep(PH_TMORPH, PH_TMORPH + 0.1, t)), dk = sstep(PH_TSTRIKE + 0.1, PH_TSTRIKE + 0.45, t);
      if (a > 0.003) { g.save(); rr(m.x, m.y, m.w, m.h, m.r); g.clip(); T('+1', m.cx, m.cy + 36, { f: FM(106, 600), c: mix(C.ink, '#b9b7b1', dk), al: 'center', op: a });
        const sk = ease.expoOut(seg(t, PH_TSTRIKE, PH_TSTRIKE + 0.3)); if (sk > 0) { const x0 = m.cx - 100, y0 = m.cy + 11, x1 = m.cx + 100, y1 = m.cy - 15;
          g.globalAlpha = a; g.strokeStyle = C.red; g.lineWidth = 8; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2, (y0 + y1) / 2 + 5, lerp(x0, x1, sk), lerp(y0, y1, sk) + 5 * Math.sin(Math.PI * sk) * 0); g.stroke(); }
        g.restore(); }
    }
    if (t >= PH_TMORPH) {                 // the request
      const a = sstep(PH_TMORPH + 0.06, PH_TMORPH + 0.2, t) * (1 - sstep(PH_TFOLD + 0.04, PH_TFOLD + 0.16, t)), fs = t < PH_TFOLD ? 1 : m.w / PH_C2.w;
      g.save(); rr(m.x, m.y, m.w, m.h, m.r); g.clip(); g.translate(m.cx, m.cy); g.scale(fs, fs); g.translate(-PH_C2.w / 2, -PH_C2.h / 2);
      PH_reqContent(t, 0, 0, a); g.restore();
    }
    if (t >= PH_TFOLD) PH_chipFace(m.cx, m.cy, sstep(PH_TFOLD + 0.14, PH_TFLY, t));
    g.restore();
    return;
  }
  // flight: a gentle arc to the network, leaning into the turn, a fading line behind it
  const p = PH_chipAt(t), q = PH_chipAt(t - 1 / 60), vx = (p.x - q.x) * 60, vy = (p.y - q.y) * 60, sq = OM.squash(vx, vy, { k: 0.00006, max: 0.3, kY: 0.00004, maxY: 0.18 });
  g.save(); g.lineCap = 'round'; for (let i = 0; i < 18; i++) { const ka = Math.max(0, p.k - 0.32 * (1 - i / 18)), kb = Math.max(0, p.k - 0.32 * (1 - (i + 1) / 18)); if (kb <= 0) continue;
    const A = PH_chipAt(PH_TFLY + (PH_TARR - PH_TFLY) * PH_invEase(ka)), B = PH_chipAt(PH_TFLY + (PH_TARR - PH_TFLY) * PH_invEase(kb));
    g.strokeStyle = `rgba(37,99,255,${(0.32 * (i + 1) / 18).toFixed(3)})`; g.lineWidth = 3; g.beginPath(); g.moveTo(A.x, A.y); g.lineTo(B.x, B.y); g.stroke(); }
  g.restore();
  g.save(); g.translate(p.x, p.y); g.rotate(sq.ang); g.scale(sq.sx, sq.sy); g.rotate(-sq.ang);
  plate(-PH_CHIP.w / 2, -PH_CHIP.h / 2, PH_CHIP.w, PH_CHIP.h, PH_CHIP.r, { fill: C.blue, lift: 1.5 }); PH_chipFace(0, 0, 1); g.restore();
}
const PH_invEase = k => { let lo = 0, hi = 1; for (let i = 0; i < 18; i++) { const m = (lo + hi) / 2; if (ease.cubicInOut(m) < k) lo = m; else hi = m; } return (lo + hi) / 2; };
function PH_chipFace(cx, cy, a) { if (a <= 0.003) return; g.save(); g.globalAlpha *= a; PH_person(cx - 40, cy, 17, '#ffffff', C.blue); T('you', cx - 14, cy + 9, { f: F(26, 600), c: '#fff' }); g.restore(); }
layer(74, 'ph-packet', t => { if (t < PH_TOUT || t > PH_TARR + 0.05) return; PH_packet(t); });

// ═════════════════════════════ E · the close ═════════════════════════════
// two computers grow out of Ali's two fingers (the V at 67.0 s), one number between them.
const PH_EA = { x: 13525, y: 390, w: 230, h: 160 }, PH_EB = { x: 14125, y: 390, w: 230, h: 160 }, PH_EN = { x: 13870, y: 405, w: 140, h: 130 };
const PH_CB = { x: ALI_E.x + 75, y: ALI_E.y - 230, w: 850, h: 140 };            // the comment box
const PH_TSPAWN = 66.975, PH_TNUM = A_.tSameNum - 0.74, PH_TREACH = A_.tSameNum - 0.1, PH_TCLASH = A_.tSameNum + 0.13, PH_TRESET = T0('R21') + 0.12;
const PH_TNOTE = A_.tSendName, PH_TNOTEIN = A_.tSendName + 0.5, PH_TPEN = A_.tGive, PH_TONE = A_.tOnlyOneOf, PH_TLAND = A_.tPenGive;
const PH_TWRITE = PH_TLAND + 0.12, PH_TROLL = PH_TLAND + 0.26, PH_TCOPY = PH_TLAND + 0.24, PH_TBCOPY = PH_TLAND + 0.95;
const PH_TBUB = A_.tComment - 0.92, PH_TTYPE = A_.tComment + 0.5, PH_TSEND = A_.tPenWord + 0.65;
// a point of the R20 take (1920 x 1080 px) on Ali's close card, including the card's slow inner push
function PH_aliPt(id, t, px, py) { const s = SEG[id], c = ALI_E, cr = CROP_E, z = 1 + 0.045 * ease.sineInOut(seg(t, s.t0 - 0.5, s.t1 + 0.5)), sw = cr.sw / z, shh = cr.sw * c.h / c.w / z;
  const sx = cr.sx + (cr.sw - sw) * 0.5, sy = cr.sy + (cr.sw * c.h / c.w - shh) * 0.32; return [c.x + (px - sx) / sw * c.w, c.y + (py - sy) / shh * c.h]; }
// the two fingertips of his V, measured per frame of the R20 take (index, middle), px of the 1920x1080 take
const PH_VTIP = [[62, [1095, 345], [1140, 300]], [63, [1070, 340], [1135, 295]], [64, [1060, 340], [1125, 295]], [65, [1060, 385], [1148, 330]], [66, [1060, 410], [1150, 365]],
  [67, [1055, 415], [1145, 390]], [68, [1060, 425], [1145, 405]], [70, [1080, 460], [1170, 430]], [72, [1100, 500], [1185, 460]], [76, [1100, 500], [1190, 468]]];
function PH_tipAt(i, t) { const f = frameOf('R20', t); let row = PH_VTIP[0]; for (const r of PH_VTIP) if (r[0] <= f) row = r; return PH_aliPt('R20', t, row[1 + i][0], row[1 + i][1]); }

function PH_compAt(i, t) {
  const sl = i ? PH_EB : PH_EA, tau = t - PH_TSPAWN - i * 0.04; if (tau < 0) return null; const [tx, ty] = PH_tipAt(i, t);
  const ks = spring(tau, 0.75, 9), ky = spring(tau - 0.06, 0.78, 9), kx = spring(tau - 0.03, 0.8, 11);
  return { cx: lerp(tx, sl.x + sl.w / 2, kx), cy: lerp(ty, sl.y + sl.h / 2, ky), s: lerp(0.04, 1, ks), lift: 1 + 1.4 * (1 - clamp(ky)), tau };
}
// a small server, ink black, front panel: two drive bays, a vent grid, a tiny display, three LEDs, its letter
function PH_server(cx, cy, s, t, { label = 'A', lift = 1, lcd = '', lcdC = '#f2f2f4', led = null, press = 1, seed = 1 } = {}) {
  if (s <= 0.01) return; const w = 230, h = 160;
  g.save(); g.translate(cx, cy); g.scale(s, s * press);
  g.fillStyle = '#121214'; sh(50 * lift, 30 * lift, 0.25); rr(-w / 2, -h / 2, w, h, 24); g.fill(); sh(8, 3, 0.32); rr(-w / 2, -h / 2, w, h, 24); g.fill(); noSh();
  const bg = g.createLinearGradient(0, -h / 2, 0, h / 2); bg.addColorStop(0, '#2f2f34'); bg.addColorStop(0.07, '#1d1d21'); bg.addColorStop(0.6, '#141417'); bg.addColorStop(1, '#0b0b0d'); g.fillStyle = bg; rr(-w / 2, -h / 2, w, h, 24); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.2)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-w / 2 + 22, -h / 2 + 1.2); g.lineTo(w / 2 - 22, -h / 2 + 1.2); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 1; rr(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1, 23.5); g.stroke();
  for (let i = 0; i < 2; i++) { const by = -h / 2 + 20 + i * 30; g.fillStyle = '#232328'; rr(-w / 2 + 18, by, 124, 22, 6); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = 1; rr(-w / 2 + 18.5, by + 0.5, 123, 21, 5.5); g.stroke();
    g.fillStyle = '#0b0b0d'; rr(-w / 2 + 28, by + 8, 44, 6, 3); g.fill(); g.fillStyle = 'rgba(255,255,255,0.1)'; g.fillRect(-w / 2 + 30, by + 8.5, 40, 1);
    for (let j = 0; j < 6; j++) { g.fillStyle = '#18181c'; g.fillRect(-w / 2 + 84 + j * 7, by + 6, 3, 10); }
    const on = Math.floor(t * 7 + seed * 3 + i * 5) % 4 !== 0; g.fillStyle = on ? '#e9e9ec' : '#3a3a40'; g.beginPath(); g.arc(-w / 2 + 132, by + 11, 2.6, 0, 6.2832); g.fill(); }
  g.fillStyle = '#070708'; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.beginPath(); g.arc(w / 2 - 70 + c * 14, -h / 2 + 26 + r * 13, 3.4, 0, 6.2832); g.fill(); }
  g.fillStyle = 'rgba(255,255,255,0.07)'; for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) { g.beginPath(); g.arc(w / 2 - 70 + c * 14, -h / 2 + 26 + r * 13 + 2.6, 2.2, 0, 3.1416); g.fill(); }
  // the little display
  g.fillStyle = '#050506'; rr(-w / 2 + 18, 4, 124, 34, 8); g.fill(); g.strokeStyle = 'rgba(255,255,255,0.09)'; g.lineWidth = 1; rr(-w / 2 + 18.5, 4.5, 123, 33, 7.5); g.stroke();
  if (lcd) T(lcd, -w / 2 + 30, 28, { f: FM(17, 600), c: lcdC });
  else { g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(-w / 2 + 30, 20, 16, 2.4); }
  // status LEDs
  const ledC = [led || '#f4f4f6', '#f4f4f6', (Math.floor(t * 5 + seed) % 3) ? '#f4f4f6' : '#3a3a40'];
  ledC.forEach((c, j) => { const lx = w / 2 - 66 + j * 16, ly = 21; if (c !== '#3a3a40') { const gl = g.createRadialGradient(lx, ly, 0, lx, ly, 11); gl.addColorStop(0, c === '#f4f4f6' ? 'rgba(255,255,255,0.35)' : c + '88'); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.beginPath(); g.arc(lx, ly, 11, 0, 6.2832); g.fill(); }
    g.fillStyle = c; g.beginPath(); g.arc(lx, ly, 3.4, 0, 6.2832); g.fill(); });
  T(label, -w / 2 + 18, h / 2 - 15, { f: FM(32, 600), c: '#ffffff' }); T('computer', -w / 2 + 46, h / 2 - 17, { f: FM(14, 500), c: '#7c7c84' });
  g.fillStyle = '#2a2a2f'; for (const sx of [w / 2 - 16, w / 2 - 30]) { g.beginPath(); g.arc(sx, h / 2 - 22, 3, 0, 6.2832); g.fill(); }
  g.restore();
}
// a premium black fountain pen with a metal clip, along its own x axis: cap end at -150, nib tip at +152
function PH_pen(cx, cy, ang, s, lift, { sqx = 1, sqy = 1 } = {}) {
  g.save(); g.translate(cx, cy); g.rotate(ang); g.scale(s * sqx, s * sqy);
  const cyl = (x0, x1, r, stops) => { const gr = g.createLinearGradient(0, -r, 0, r); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(x0, -r, x1 - x0, 2 * r); };
  const lacquer = [[0, '#3a3a40'], [0.2, '#77777f'], [0.32, '#2a2a2e'], [0.6, '#0e0e10'], [0.9, '#050506'], [1, '#1e1e22']];
  const metal = [[0, '#8e8e95'], [0.22, '#ffffff'], [0.4, '#c9c9ce'], [0.7, '#7d7d84'], [1, '#c4c4c9']];
  // silhouette with shadow
  const sil = () => { g.beginPath(); g.moveTo(-138, -15.5); g.lineTo(-30, -15.5); g.lineTo(90, -14); g.lineTo(118, -10); g.lineTo(152, -0.8); g.lineTo(152, 0.8); g.lineTo(118, 10); g.lineTo(90, 14); g.lineTo(-30, 15.5); g.lineTo(-138, 15.5); g.quadraticCurveTo(-152, 15.5, -152, 0); g.quadraticCurveTo(-152, -15.5, -138, -15.5); g.closePath(); };
  g.save(); g.shadowColor = `rgba(20,16,10,${(0.32 - 0.1 * clamp(lift / 2)).toFixed(3)})`; g.shadowBlur = Math.min(260, (6 + 30 * lift) * ZS * s) * DPR; g.shadowOffsetX = (4 + 26 * lift) * ZS * s * DPR; g.shadowOffsetY = (7 + 40 * lift) * ZS * s * DPR; g.fillStyle = '#111'; sil(); g.fill(); g.restore();
  g.save(); sil(); g.clip();
  cyl(-152, -30, 15.5, lacquer);                                      // cap
  cyl(-30, 90, 14.4, lacquer);                                        // barrel
  cyl(-34, -24, 15.8, metal);                                         // cap band
  cyl(-152, -146, 15.5, metal);                                       // cap end ring
  g.beginPath(); g.moveTo(90, -14); g.lineTo(118, -10); g.lineTo(118, 10); g.lineTo(90, 14); g.closePath(); const sg = g.createLinearGradient(0, -14, 0, 14); sg.addColorStop(0, '#2a2a2e'); sg.addColorStop(0.3, '#4a4a50'); sg.addColorStop(0.55, '#141416'); sg.addColorStop(1, '#0a0a0b'); g.fillStyle = sg; g.fill();
  for (let i = 0; i < 4; i++) { g.fillStyle = 'rgba(255,255,255,0.06)'; g.fillRect(96 + i * 5.5, -12, 1.4, 24); }
  // nib
  g.beginPath(); g.moveTo(116, -10.5); g.quadraticCurveTo(134, -9, 152, -0.6); g.lineTo(152, 0.6); g.quadraticCurveTo(134, 9, 116, 10.5); g.closePath(); const ng = g.createLinearGradient(0, -10, 0, 10); ng.addColorStop(0, '#9b9ba2'); ng.addColorStop(0.3, '#ffffff'); ng.addColorStop(0.55, '#c6c6cc'); ng.addColorStop(1, '#78787f'); g.fillStyle = ng; g.fill();
  g.strokeStyle = 'rgba(30,30,34,0.75)'; g.lineWidth = 0.9; g.beginPath(); g.moveTo(132, 0); g.lineTo(152, 0); g.stroke(); g.fillStyle = 'rgba(30,30,34,0.85)'; g.beginPath(); g.arc(131, 0, 1.6, 0, 6.2832); g.fill();
  g.strokeStyle = 'rgba(40,40,46,0.35)'; g.lineWidth = 0.6; g.beginPath(); g.moveTo(121, -5); g.quadraticCurveTo(125, 0, 121, 5); g.stroke(); g.beginPath(); g.moveTo(124, -4.5); g.quadraticCurveTo(128, 0, 124, 4.5); g.stroke();
  g.restore();
  // the clip, lying on top of the cap
  g.fillStyle = 'rgba(0,0,0,0.35)'; rr(-140, -3, 92, 8.5, 4); g.fill();
  const cg = g.createLinearGradient(0, -6, 0, 4); cg.addColorStop(0, '#ffffff'); cg.addColorStop(0.45, '#c9c9cf'); cg.addColorStop(1, '#808087'); g.fillStyle = cg; rr(-142, -6, 90, 9, 4.5); g.fill();
  g.beginPath(); g.arc(-56, -1.5, 6, 0, 6.2832); g.fill(); g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.arc(-57.5, -3.5, 1.8, 0, 6.2832); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-128, -4.8, 60, 1.2);
  g.restore();
}
function PH_penAt(t) {
  if (t < PH_TPEN - 0.05) return null; const A = { x: PH_EA.x + PH_EA.w / 2, y: PH_EA.y + 10 };
  const kin = ease.expoOut(seg(t, PH_TPEN, PH_TPEN + 0.45)), kg = ease.cubicInOut(seg(t, PH_TONE, PH_TLAND - 0.3)), kd = PH_in2(seg(t, PH_TLAND - 0.3, PH_TLAND));
  const bob = Math.sin((t - PH_TPEN) * 7) * 5 * (1 - kd);
  const x = lerp(lerp(13940, 13940, kin), A.x, kg), y = lerp(lerp(140, 270, kin), A.y - 70, kg) + kd * 70 + bob;
  const ang = lerp(-0.16, -0.42, kg) + 0.03 * Math.sin((t - PH_TPEN) * 4.4) * (1 - kd), s = lerp(lerp(1.4, 1.16, kin), 1, kd), lift = lerp(2.2, 0.3, kd), op = sstep(PH_TPEN - 0.05, PH_TPEN + 0.15, t);
  const im = OM.impact(t, PH_TLAND, { decay: 10, omega: 30, sqx: 0.05, sqy: 0.12 });
  return { x, y, ang, s, lift, op, sqx: t >= PH_TLAND ? im.sx : 1, sqy: t >= PH_TLAND ? im.sy : 1 };
}
// an arrow that grows from (x0, y0) toward (x1, y1) by k, with a small mono chip riding it
function PH_arrow(x0, y0, x1, y1, k, { c = C.ink, lw = 3.4, label = null, labC = C.ink } = {}) {
  if (k <= 0.003) return; const x = lerp(x0, x1, k), y = lerp(y0, y1, k), a = Math.atan2(y1 - y0, x1 - x0);
  g.save(); g.strokeStyle = c; g.fillStyle = c; g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x - Math.cos(a) * 6, y - Math.sin(a) * 6); g.stroke();
  g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(a - 0.5) * 15, y - Math.sin(a - 0.5) * 15); g.lineTo(x - Math.cos(a + 0.5) * 15, y - Math.sin(a + 0.5) * 15); g.closePath(); g.fill();
  if (label && k > 0.3) { const mx = lerp(x0, x, 0.5), my = lerp(y0, y, 0.5) - 26, f = FM(18, 600), w = tw(label, f) + 18; g.globalAlpha *= sstep(0.3, 0.7, k);
    g.fillStyle = '#fff'; sh(10, 4, 0.16); rr(mx - w / 2, my - 15, w, 30, 15); g.fill(); noSh(); g.strokeStyle = 'rgba(13,13,15,0.1)'; g.lineWidth = 1; rr(mx - w / 2, my - 15, w, 30, 15); g.stroke(); T(label, mx, my + 6.5, { f, c: labC, al: 'center' }); }
  g.restore();
}
function PH_numCard(t) {
  const k = pop(t, PH_TNUM, { rise: 18 }); if (t < PH_TNUM || k.op <= 0.003) return;
  const N = PH_EN, sk = OM.shake(t, PH_TCLASH, { amp: 7, decay: 7, freq: 14, seed: 5 }), red = sstep(PH_TCLASH - 0.02, PH_TCLASH + 0.08, t) * (1 - sstep(PH_TRESET, PH_TRESET + 0.3, t));
  const e0 = t < PH_TCLASH ? 0 : t < PH_TRESET ? ease.cubicOut(seg(t, PH_TCLASH, PH_TCLASH + 0.2)) : t < PH_TROLL ? 1 - ease.cubicInOut(seg(t, PH_TRESET, PH_TRESET + 0.3)) : ease.cubicOut(seg(t, PH_TROLL, PH_TROLL + 0.22));
  const cx = N.x + N.w / 2, cy = N.y + N.h / 2;
  g.save(); g.globalAlpha *= k.op; g.translate(cx + sk.x, cy + k.dy + sk.y * 0.4); g.rotate(sk.rot * 6); g.scale(k.s, k.s); g.translate(-cx, -cy);
  plate(N.x, N.y, N.w, N.h, 26, { lift: 1.1 });
  PH_icon('heart', N.x + 26, N.y + 28, 17, { lw: 2 }); T('likes', N.x + 42, N.y + 34, { f: F(17, 500), c: C.mute });
  g.font = F(66, 600); const dw = Math.max(...'0123456789'.split('').map(d => g.measureText(d).width));
  PH_odo(cx - dw, N.y + 108, 45, 0, { px: 66, e0, digits: 2 });
  if (red > 0.003) { g.save(); g.globalAlpha *= red; g.strokeStyle = C.red; g.lineWidth = 4; rr(N.x - 3, N.y - 3, N.w + 6, N.h + 6, 28); g.stroke();
    g.lineWidth = 8; g.lineCap = 'round'; for (const [i, a, b, c, d] of [[0, N.x + 24, N.y + 22, N.x + N.w - 24, N.y + N.h - 20], [1, N.x + N.w - 24, N.y + 22, N.x + 24, N.y + N.h - 20]]) {
      const p = ease.cubicOut(seg(t, PH_TCLASH + 0.04 + i * 0.13, PH_TCLASH + 0.2 + i * 0.13)); if (p <= 0) continue; g.beginPath(); g.moveTo(a, b); g.quadraticCurveTo((a + c) / 2 + (i ? 6 : -6), (b + d) / 2, lerp(a, c, p), lerp(b, d, p)); g.stroke(); }
    g.restore(); }
  const ck = spring(t - (PH_TROLL + 0.24), 0.5, 22); if (t > PH_TROLL + 0.24) check(N.x + N.w - 8, N.y + 8, 19, { k: ck });
  g.restore();
}
// the note with your name that flies into computer A
function PH_note(t) {
  if (t < PH_TNOTE - 0.05 || t > PH_TNOTEIN + 0.05) return; const p0 = { x: ALI_E.x + 150, y: ALI_E.y + 70 }, p1 = { x: PH_EA.x + 80, y: PH_EA.y + 40 };
  const k = ease.cubicInOut(seg(t, PH_TNOTE + 0.05, PH_TNOTEIN)), x = lerp(p0.x, p1.x, k), y = lerp(p0.y, p1.y, k) - Math.sin(Math.PI * k) * 170, pk = pop(t, PH_TNOTE - 0.05, { rise: 20 });
  const s = (0.85 + 0.15 * pk.k) * lerp(1, 0.32, PH_in3(seg(t, PH_TNOTEIN - 0.2, PH_TNOTEIN))), op = pk.op * (1 - sstep(PH_TNOTEIN - 0.08, PH_TNOTEIN, t));
  g.save(); g.globalAlpha *= op; g.translate(x, y); g.rotate(-0.1 + 0.16 * k); g.scale(s, s);
  plate(-80, -38, 160, 76, 14, { lift: 1.5 }); g.fillStyle = '#ecebe6'; g.beginPath(); g.moveTo(58, -38); g.lineTo(80, -38); g.lineTo(80, -16); g.closePath(); g.fill();
  PH_person(-44, 0, 19, C.blue, '#fff'); T('you', -16, 10, { f: F(29, 600), c: C.blue }); g.restore();
}
function PH_close(t) {
  if (t < 64.5 || !onScreen(PH_EA.x - 200, 100, 1100, 1300, 100)) return;
  // births: a glow and a thread at each fingertip
  for (let i = 0; i < 2; i++) { const a = t - PH_TSPAWN - i * 0.04; if (a < 0 || a > 0.42) continue; const [tx, ty] = PH_tipAt(i, t), c = PH_compAt(i, t), k = a / 0.42;
    const gl = g.createRadialGradient(tx, ty, 0, tx, ty, 46); gl.addColorStop(0, `rgba(255,255,255,${(0.85 * (1 - k)).toFixed(3)})`); gl.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gl; g.beginPath(); g.arc(tx, ty, 46, 0, 6.2832); g.fill();
    g.save(); g.globalAlpha = 0.55 * (1 - PH_in3(k)); g.strokeStyle = '#fff'; g.lineWidth = 2.2; g.setLineDash([2, 7]); g.lineCap = 'round'; g.beginPath(); g.moveTo(tx, ty); g.lineTo(c.cx, c.cy + 80 * c.s); g.stroke(); g.restore(); }
  // the clash: both read 44, both reach to write 45
  const reach = ease.expoOut(seg(t, PH_TREACH, PH_TREACH + 0.24)) * (1 - PH_in3(seg(t, PH_TRESET - 0.2, PH_TRESET + 0.05)));
  const my = PH_EN.y + PH_EN.h / 2 + 8;
  PH_arrow(PH_EA.x + PH_EA.w + 10, my, PH_EN.x - 10, my, reach, { label: '45' }); PH_arrow(PH_EB.x - 10, my, PH_EN.x + PH_EN.w + 10, my, reach, { label: '45' });
  // the clean write: only A (it holds the pen) writes; B keeps a copy
  const wk = ease.expoOut(seg(t, PH_TWRITE, PH_TWRITE + 0.22)); PH_arrow(PH_EA.x + PH_EA.w + 10, my, PH_EN.x - 10, my, wk, { label: '45' });
  const ck = ease.cubicInOut(seg(t, PH_TCOPY, PH_TCOPY + 0.45));
  if (ck > 0.003) { const x0 = PH_EA.x + PH_EA.w - 6, y0 = PH_EA.y + 16, x1 = PH_EB.x + 6, y1 = PH_EB.y + 16, mx = (x0 + x1) / 2, py = PH_EA.y - 92;
    g.save(); g.strokeStyle = 'rgba(13,13,15,0.42)'; g.lineWidth = 2.4; g.setLineDash([3, 9]); g.lineCap = 'round'; g.lineDashOffset = -t * 40; g.beginPath(); g.moveTo(x0, y0);
    const n = 40; for (let i = 1; i <= Math.round(n * ck); i++) { const u = i / n; g.lineTo((1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * mx + u * u * x1, (1 - u) * (1 - u) * y0 + 2 * u * (1 - u) * py + u * u * y1); } g.stroke(); g.restore(); }
  PH_numCard(t);
  // the two computers
  const pressA = OM.press(t, PH_TNOTEIN, { depth: 0.07 }).s * OM.press(t, PH_TLAND, { depth: -0.09, decay: 9, omega: 26 }).s;
  const ledA = t > PH_TCLASH && t < PH_TRESET ? (Math.floor(t * 8) % 2 ? C.red : '#3a3a40') : t > PH_TNOTEIN ? C.blue : null, ledB = t > PH_TCLASH && t < PH_TRESET ? (Math.floor(t * 8 + 1) % 2 ? C.red : '#3a3a40') : null;
  for (let i = 0; i < 2; i++) { const c = PH_compAt(i, t); if (!c) continue;
    const lcd = i === 0 ? (t > PH_TNOTEIN ? 'you' : '') : (t > PH_TBCOPY ? '45' : ''), lcdC = i === 0 ? '#6f9bff' : '#f2f2f4';
    PH_server(c.cx, c.cy, c.s, t, { label: i ? 'B' : 'A', lift: c.lift, lcd, lcdC, led: i ? ledB : ledA, press: i ? 1 : pressA, seed: i + 1 }); }
  // B is only a copy
  const tg = pop(t, PH_TCOPY + 0.38, { rise: 10, s0: 0.7, ds: 0.3 }); if (t > PH_TCOPY + 0.38 && tg.op > 0.003) { const x = PH_EB.x + PH_EB.w - 46, y = PH_EB.y - 26, f = FM(19, 600), w = tw('copy', f) + 26;
    g.save(); g.globalAlpha *= tg.op; g.translate(x, y + tg.dy); g.scale(tg.s, tg.s); ln(0, 10, 0, 26, { c: 'rgba(13,13,15,0.35)', w: 1.6 });
    g.fillStyle = '#e4e2dc'; sh(8, 3, 0.12); rr(-w / 2, -16, w, 32, 16); g.fill(); noSh(); T('copy', 0, 6.5, { f, c: C.ink2, al: 'center' }); g.restore(); }
  PH_note(t);
  const p = PH_penAt(t); if (p && p.op > 0.003) { g.save(); g.globalAlpha *= p.op; PH_pen(p.x, p.y, p.ang, p.s, p.lift, p); g.restore(); }
}
layer(64, 'ph-close', PH_close);

// the comment box: a comment bubble pops above Ali, opens into the box, "pen" is typed, sent
function PH_comment(t) {
  if (t < PH_TBUB - 0.05 || !onScreen(PH_CB.x, PH_CB.y, PH_CB.w, PH_CB.h, 100)) return;
  const cx = PH_CB.x + PH_CB.w / 2, cy = PH_CB.y + PH_CB.h / 2, bk = pop(t, PH_TBUB, { rise: 16, s0: 0.6, ds: 0.4 });
  const m = OM.morphRect(t, PH_TBUB + 0.34, PH_TBUB + 0.84, { x: cx - 50, y: cy - 50, w: 100, h: 100, r: 50 }, { ...PH_CB, r: 70 }, { curve: ease.expoInOut });
  g.save(); g.globalAlpha *= bk.op; g.translate(cx, cy + bk.dy); g.scale(bk.s, bk.s); g.translate(-cx, -cy);
  plate(m.x, m.y, m.w, m.h, m.r, { lift: 1.15 });
  const ia = 1 - sstep(0.05, 0.3, m.k); if (ia > 0.003) { g.save(); g.globalAlpha *= ia; PH_icon('comment', cx, cy, 46, { lw: 3.2 }); g.restore(); }
  const a = sstep(0.6, 1, m.k);
  if (a > 0.003) { g.save(); g.globalAlpha *= a; rr(m.x, m.y, m.w, m.h, m.r); g.clip(); const B = PH_CB;
    PH_person(B.x + 74, B.y + 70, 44, C.blue, '#fff');
    const cm = OM.typeOn(t, PH_TTYPE, 'pen', { cps: 12 }), has = cm.n > 0, sent = spring(t - PH_TSEND, 0.6, 20), f = F(48, 600);
    const hk = ease.expoOut(seg(t, A_.tPenWord + 0.12, A_.tPenWord + 0.45));
    if (hk > 0.003 && has) { g.fillStyle = C.blueSoft; rr(B.x + 138, B.y + 34, (tw(cm.str, f) + 20) * hk, 74, 16); g.fill(); }
    if (!has) T('Add a comment…', B.x + 146, B.y + 86, { f: F(42, 400), c: C.mute }); else T(cm.str, B.x + 148, B.y + 88, { f, c: C.ink });
    if (t > PH_TTYPE - 0.6 && sent < 0.5 && (!cm.done || Math.floor(t * 2.4) % 2 === 0)) { g.fillStyle = C.blue; g.fillRect(B.x + 150 + (has ? tw(cm.str, f) : 0), B.y + 42, 4, 56); }
    const pr = OM.press(t, PH_TSEND), bx = B.x + B.w - 74, by = B.y + 70; g.save(); g.translate(bx, by); g.scale(pr.s, pr.s);
    g.fillStyle = has ? C.blue : '#dddbd5'; g.beginPath(); g.arc(0, 0, 46, 0, 6.2832); g.fill();
    if (sent > 0.5) check(0, 0, 46, { fill: C.blue }); else { g.strokeStyle = '#fff'; g.lineWidth = 6.5; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(0, 18); g.lineTo(0, -18); g.moveTo(-15, -3); g.lineTo(0, -18); g.lineTo(15, -3); g.stroke(); }
    g.restore(); g.restore(); }
  g.restore();
}
layer(70, 'ph-comment', PH_comment);

// ═════════════════════════════ CAMERA NOTES (for the master camera) ═════════════════════════════
// [t, x, y, zoom, {fy, curve, hit}] · world units · fy default 960 · S = sineInOut, X = expoInOut, O = expoOut.
// The same keys are registered below as VIEW_REG 'ph-hook', 'ph-phone', 'ph-close'.
// HOOK (A). Ali's mouth must stay above the caption band: at zoom 1.4 / fy 690 it sits at screen y ~1290.
//   [0,     540,  760, 1.04, {fy: 760}]                      wide: post + Ali
//   [3.3,   540,  752, 1.07, {curve: S, fy: 760}]            slow creep
//   [3.95,  450,  790, 1.40, {curve: X, fy: 690}]            push on "millions": the count races, the heart takes taps, his face stays in
//   [5.4,   455,  792, 1.46, {curve: S, fy: 690, hit: 2}]    heart pop at 5.00 sits inside this hold; "1 s +18,402" chip at 5.52
//   [5.75,  455,  792, 1.48, {curve: S, fy: 690}]
//   [6.43,  540,  439, 2.40, {curve: X}]                     dive into POST_IMG centre -> swap to DRAW on the wall
// PHONE (C). Your push through Ali's hand should end deep in the black glass, e.g. (5940, 2455, 7.5) at 49.95 (screen centre).
//   [50.4,  5850, 2390, 1.50, {curve: O, fy: 1000}]          pull out of the glass; the finger lands on the heart (world 5736, 2481) at 50.20
//   [50.95, 5940, 2130, 1.12, {curve: X, fy: 880}]           tilt up with the "+1" leaving the Dynamic Island (50.40-50.90)
//   [51.85, 5940, 2100, 1.16, {curve: S, fy: 880}]           hold: red strike through "+1" at 51.31
//   [52.4,  5940, 1760, 1.45, {curve: X, fy: 900}]           the request card (morph 51.93-52.43)
//   [52.78, 5790, 1712, 3.00, {curve: X}]                    EXTREME CLOSE-UP: name dot + "like" + user: "you" (blue lights at 52.75)
//   [53.4,  5798, 1716, 3.15, {curve: S}]
//   [53.8,  5960, 1780, 1.15, {curve: X, fy: 900}]           pull back: the card folds into the blue chip (53.60-53.86)
//   [54.05, 6300, 1660, 1.00, {curve: S, fy: 900}]           chase the chip (PH_chipAt(t) = its centre) ...
//   [54.3,  7120, 1460, 0.93, {curve: linear, fy: 900}]
//   [54.55, 7450, 1470, 0.90, {curve: linear, fy: 900}]      ... it reaches PH_DEST (7660, 1460) at 54.55; network.js takes over
// CLOSE (E). Face stays above the caption at zoom <= 1.2 with y >= 925; the rig sits at world y 390-550 above the card.
//   [64.9,  13940, 1090, 1.00]
//   [65.6,  14000, 1120, 1.50, {curve: X, fy: 860}]          tight on Ali: "So if you build an app"
//   [66.85, 14005, 1115, 1.55, {curve: S, fy: 860}]          his V forms at 66.97-67.03; the two computers are born on his fingertips
//   [67.6,  13940,  930, 1.20, {curve: X}]                   pull back as they float up to their slots (settled ~67.6); "44" pops 67.50
//   [68.05, 13940,  925, 1.22, {curve: S}]
//   [68.36, 13940,  500, 2.30, {curve: X, fy: 820, hit: 4}]  EXTREME CLOSE-UP on the number: both arrows "45", shake, red outline + cross
//   [68.95, 13940,  505, 2.42, {curve: S, fy: 820}]
//   [69.36, 13900,  900, 1.24, {curve: X}]                   the "you" note flies from his card into A (69.03-69.53)
//   [69.62, 13622,  482, 3.40, {curve: X}]                   EXTREME CLOSE-UP on A's front: display reads "you", LED blue
//   [70.1,  13626,  484, 3.60, {curve: S}]
//   [70.62, 13790,  470, 1.85, {curve: X, fy: 880}]          the pen appears (70.21), hovers, glides over A on "one" (70.63)
//   [71.39, 13760,  470, 1.95, {curve: S, fy: 880, hit: 4}]  the pen lands on A exactly on "pen"
//   [71.95, 13940,  930, 1.20, {curve: X}]                   A writes 45 (check 71.89), dashed copy line to B, "copy" tag 72.0
//   [73.75, 13940,  935, 1.18, {curve: S}]
//   [74.45, 13940,  900, 1.12, {curve: X}]                   comment bubble (73.79) opens into the box; box + his face
//   [76.3,  13940,  905, 1.15, {curve: S}]                   "pen" typed 75.21-75.46, highlight 75.45, send 75.98 -> check

// ═════════════════════════════ preview views ═════════════════════════════
{
  const S = ease.sineInOut, X = ease.expoInOut, O = ease.expoOut;
  VIEW_REG['ph-hook'] = { keys: [
    [0, 540, 760, 1.04, { fy: 760 }],
    [3.3, 540, 752, 1.07, { curve: S, fy: 760 }],
    [3.95, 450, 790, 1.4, { curve: X, fy: 690 }],               // closer: the count races, the heart takes taps, his face stays above the caption
    [5.4, 455, 792, 1.46, { curve: S, fy: 690, hit: 2 }],
    [5.75, 455, 792, 1.48, { curve: S, fy: 690 }],
    [6.43, POST_IMG.x + POST_IMG.w / 2, POST_IMG.y + POST_IMG.h / 2, 2.4, { curve: X }],   // dive into the image
  ] };
  const Sx = PH_SCR.x + PH_SCR.w / 2, Sy = PH_SCR.y + PH_SCR.h / 2, cuX = PH_C2.x + 150, cuY = PH_C2.y + 104;
  VIEW_REG['ph-phone'] = { keys: [
    [49.2, Sx, Sy, 1.0],
    [49.95, Sx, Sy - 60, 7.5, { curve: X }],                     // stand-in for the push through Ali's hand: deep in the black glass
    [50.4, 5850, 2390, 1.5, { curve: O, fy: 1000 }],             // pull out: the finger comes in and taps the heart
    [50.95, 5940, 2130, 1.12, { curve: X, fy: 880 }],            // tilt up with the +1 leaving the top of the phone
    [51.85, 5940, 2100, 1.16, { curve: S, fy: 880 }],
    [52.4, 5940, 1760, 1.45, { curve: X, fy: 900 }],             // the request card
    [52.78, cuX, cuY, 3.0, { curve: X }],                        // extreme close-up: the name dot, like, user "you"
    [53.4, cuX + 8, cuY + 4, 3.15, { curve: S }],
    [53.8, 5960, 1780, 1.15, { curve: X, fy: 900 }],             // pull back for the fold
    [54.05, 6300, 1660, 1.0, { curve: S, fy: 900 }],             // chase the chip toward the network
    [54.3, 7120, 1460, 0.93, { curve: ease.linear, fy: 900 }],
    [54.55, 7450, 1470, 0.9, { curve: ease.linear, fy: 900 }],
  ] };
  VIEW_REG['ph-close'] = { keys: [
    [64.9, 13940, 1090, 1.0],
    [65.6, 14000, 1120, 1.5, { curve: X, fy: 860 }],            // tight on Ali: "So if you build an app"
    [66.85, 14005, 1115, 1.55, { curve: S, fy: 860 }],
    [67.6, 13940, 930, 1.2, { curve: X }],                       // pull back: the computers float up out of his two fingers
    [68.05, 13940, 925, 1.22, { curve: S }],
    [68.36, 13940, 500, 2.3, { curve: X, fy: 820, hit: 4 }],     // extreme close-up: both write the same number
    [68.95, 13940, 505, 2.42, { curve: S, fy: 820 }],
    [69.36, 13900, 900, 1.24, { curve: X }],                     // the note flies into A
    [69.62, 13622, 482, 3.4, { curve: X }],                       // extreme close-up: A's display now reads "you", its LED goes blue
    [70.1, 13626, 484, 3.6, { curve: S }],
    [70.62, 13790, 470, 1.85, { curve: X, fy: 880 }],            // the pen hovers, picks A
    [71.39, 13760, 470, 1.95, { curve: S, fy: 880, hit: 4 }],     // the pen lands on A
    [71.95, 13940, 930, 1.2, { curve: X }],                       // A writes 45, B keeps a copy
    [73.75, 13940, 935, 1.18, { curve: S }],
    [74.45, 13940, 900, 1.12, { curve: X }],                      // the comment box and his face
    [76.3, 13940, 905, 1.15, { curve: S }],
  ] };
}

// ═════════════════════════════ sound moments ═════════════════════════════
window.SFX_EVENTS = (window.SFX_EVENTS || []).concat([
  { t: A_.tMillions, kind: 'riser', v: 0.35, note: 'hook: the like count starts to race' },
  { t: A_.tHeart, kind: 'pop', v: 0.7, note: 'hook: the heart fills red' },
  { t: A_.tSameSec - 0.04, kind: 'tick', v: 0.4, note: 'hook: the 1 s chip' },
  { t: PH_WAKE, kind: 'click', v: 0.3, note: 'phone: screen wakes' },
  { t: PH_TAPP, kind: 'click', v: 0.6, note: 'phone: finger taps the heart' },
  { t: PH_TOUT + 0.05, kind: 'whoosh', v: 0.4, note: 'phone: the +1 leaves the Dynamic Island' },
  { t: PH_TSTRIKE, kind: 'marker', v: 0.5, note: 'phone: red strike through +1' },
  { t: PH_TMORPH, kind: 'paper', v: 0.4, note: 'phone: +1 card morphs into the request' },
  { t: A_.tSendsName - 0.06, kind: 'tick', v: 0.4, note: 'phone: the name dot lights blue' },
  { t: PH_TFOLD, kind: 'paper', v: 0.3, note: 'phone: the request folds into a chip' },
  { t: PH_TFLY, kind: 'whoosh', v: 0.6, note: 'phone: the chip flies to the network' },
  { t: PH_TSPAWN, kind: 'pop', v: 0.5, note: 'close: two computers grow from his fingers' },
  { t: PH_TNUM, kind: 'pop', v: 0.35, note: 'close: the number card 44' },
  { t: PH_TCLASH, kind: 'hit', v: 0.7, note: 'close: both write the same number' },
  { t: PH_TCLASH + 0.05, kind: 'marker', v: 0.45, note: 'close: red cross' },
  { t: PH_TNOTE + 0.05, kind: 'whoosh', v: 0.4, note: 'close: the name note flies into A' },
  { t: PH_TPEN, kind: 'whoosh_low', v: 0.45, note: 'close: the pen descends' },
  { t: PH_TLAND, kind: 'hit', v: 0.75, note: 'close: the pen lands on computer A' },
  { t: PH_TROLL + 0.24, kind: 'tick', v: 0.45, note: 'close: 45 with a check' },
  { t: PH_TBUB, kind: 'pop', v: 0.4, note: 'close: the comment box' },
  { t: PH_TTYPE, kind: 'keys', v: 0.4, note: 'close: typing "pen"' },
  { t: PH_TSEND, kind: 'click', v: 0.5, note: 'close: send' },
]);
