// shared.js — reel 31 "Steal your competitor's angry customers": things several scenes draw.
// OpenMausBot's desktop app rebuilt from its real screenshots (downloads/openmausbot-assets/screenshots: 03-chat-card,
// docs-fresh-bot, docs-automations, tasks-routines): dark window, bot list, cursor-shaped bot avatar with a face, grey
// bot bubbles, blue user bubbles, the "Set up: …" schedule card with Pause · Edit · Undo, the composer "Message Scout".
// Plus: images (real post screenshots, Cursor's icon), word wrap, the sticky note / survey of the BEFORE, the notes file.
'use strict';
// ───────── images (preloaded before the first frame) ─────────
const SH_IM = {}, SH_IMP = [];
function SH_load(key, src) { const im = new Image(); im.src = src; SH_IM[key] = im; SH_IMP.push(im.decode().catch(() => console.warn('img', src))); return im; }
SH_load('cursor', 'img/cursor_icon.png');
const SH_POSTS = (window.POSTS || []).map((p, i) => ({ ...p, im: SH_load('post' + i, p.img) }));
window.FONTS_READY = Promise.all([window.FONTS_READY, ...SH_IMP]);
const SH_ok = im => im && im.complete && im.naturalWidth > 0;

// ───────── text helpers ─────────
function SH_wrap(str, f, maxW) {
  g.font = f; const out = []; let cur = '';
  for (const w of str.split(' ')) { const tryS = cur ? cur + ' ' + w : w; if (g.measureText(tryS).width > maxW && cur) { out.push(cur); cur = w; } else cur = tryS; }
  if (cur) out.push(cur); return out;
}
// a paragraph with some words in another colour/weight: parts = [[text, {c, f}], ...]; returns height
function SH_rich(parts, x, y, maxW, lh, base) {
  let cx = x, cy = y; const sp = tw(' ', base.f);
  for (const [str, o] of parts) { const f = (o && o.f) || base.f, c = (o && o.c) || base.c;
    for (const w of str.split(' ').filter(Boolean)) { const ww = tw(w, f); if (cx + ww > x + maxW && cx > x) { cx = x; cy += lh; }
      if (o && o.bg) { g.fillStyle = o.bg; rr(cx - 6, cy - lh * 0.72, ww + 12, lh * 0.92, 8); g.fill(); }
      T(w, cx, cy, { f, c, op: (o && o.op) ?? 1 }); cx += ww + sp; } }
  return cy - y + lh;
}

// ───────── OpenMausBot: palette + avatar ─────────
const MB = { bg: '#0b0b0c', side: '#151516', line: 'rgba(255,255,255,0.08)', bub: '#262628', card: '#19191b', cardLine: '#303033',
  txt: '#f2f2f3', mute: '#9c9ca2', dim: '#6b6b70', blue: '#2f7cf6', blue2: '#1c5fe2', link: '#5aa2ff', pill: '#1f1f21' };
// the bot's avatar: a mouse-cursor shaped triangle with a small face (OpenMausBot's bots), s = height
function MB_avatar(cx, cy, s, { c1 = '#5b95ff', c2 = '#1f5fe6', face = true, op = 1 } = {}) {
  if (op <= 0.003) return; g.save(); g.globalAlpha *= op; g.translate(cx - s * 0.48, cy - s * 0.5); g.scale(s, s);
  g.beginPath(); g.moveTo(0.08, 0.02); g.quadraticCurveTo(0.0, 0.0, 0.02, 0.1); g.lineTo(0.36, 0.95); g.quadraticCurveTo(0.4, 1.02, 0.45, 0.95);
  g.lineTo(0.56, 0.66); g.lineTo(0.92, 0.6); g.quadraticCurveTo(1.0, 0.58, 0.93, 0.52); g.closePath();
  const gr = g.createLinearGradient(0, 0, 1, 1); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fill();
  if (face) { g.fillStyle = 'rgba(255,255,255,0.95)'; g.fillRect(0.3, 0.36, 0.05, 0.11); g.fillRect(0.44, 0.36, 0.05, 0.11);
    g.lineWidth = 0.035; g.strokeStyle = 'rgba(255,255,255,0.95)'; g.lineCap = 'round'; g.beginPath(); g.arc(0.39, 0.5, 0.08, 0.35, 2.8); g.stroke(); }
  g.restore();
}
// the desktop window. o.k = how far it has appeared (0..1). Returns the chat column's geometry.
// Base size w x h (default 1600 x 1040): sidebar 400, header 92, composer 104 high at the bottom.
function MB_window(x, y, w, h, o = {}) {
  const { title = 'Scout', bots = [['Scout', 'Done. Every Monday at 9…', '9:02 AM', ['#5b95ff', '#1f5fe6']], ['Ledger', 'Hi, I’m Ledger. What would you…', '', ['#ff6b6b', '#c4303a']], ['Hazel', 'Hi, I’m Hazel. What would you…', '', ['#3ecf8e', '#118a52']]],
    active = 0, model = 'Claude Sonnet 5', composer = '', caret = false, op = 1, side = 400 } = o;
  if (op <= 0.003) return null;
  g.save(); g.globalAlpha *= op;
  plate(x, y, w, h, 26, { fill: MB.bg, lift: 1.5, line: false });
  g.save(); rr(x, y, w, h, 26); g.clip();
  g.fillStyle = MB.side; g.fillRect(x, y, side, h); g.fillStyle = MB.line; g.fillRect(x + side, y, 1.5, h);
  [['#ff5f57', 0], ['#febc2e', 1], ['#28c840', 2]].forEach(([c, i]) => { g.fillStyle = c; g.beginPath(); g.arc(x + 36 + i * 30, y + 38, 10, 0, 6.2832); g.fill(); });
  T('+', x + side - 50, y + 50, { f: F(40, 300), c: MB.mute });
  g.fillStyle = '#232325'; rr(x + 22, y + 82, side - 44, 58, 14); g.fill();
  g.strokeStyle = MB.mute; g.lineWidth = 3; g.beginPath(); g.arc(x + 52, y + 109, 10, 0, 6.2832); g.stroke(); ln(x + 59, y + 116, x + 66, y + 123, { c: MB.mute, w: 3 });
  T('Search', x + 80, y + 120, { f: F(25, 400), c: MB.mute });
  T('Bots', x + 34, y + 186, { f: F(22, 500), c: MB.mute });
  bots.forEach(([n, last, tm, cols], i) => { const by = y + 210 + i * 104;
    if (i === active) { g.fillStyle = '#2a2a2c'; rr(x + 14, by, side - 28, 92, 16); g.fill(); }
    MB_avatar(x + 64, by + 46, 54, { c1: cols[0], c2: cols[1] });
    T(n, x + 110, by + 40, { f: F(27, 600), c: MB.txt }); if (tm) T(tm, x + side - 40, by + 40, { f: F(20, 400), c: MB.mute, al: 'right' });
    g.save(); g.beginPath(); g.rect(x + 110, by + 50, side - 150, 40); g.clip(); T(last, x + 110, by + 74, { f: F(21, 400), c: MB.mute }); g.restore(); });
  // bottom of the sidebar: Automations, Connected apps, You
  const ay = y + h - 170; T('Automations', x + 86, ay, { f: F(25, 400), c: MB.txt }); T('Connected apps', x + 86, ay + 52, { f: F(25, 400), c: MB.txt });
  g.strokeStyle = MB.txt; g.lineWidth = 2.5; rr(x + 38, ay - 24, 28, 28, 5); g.stroke(); ln(x + 38, ay - 14, x + 66, ay - 14, { c: MB.txt, w: 2.5 });
  g.fillStyle = '#2a2a2c'; g.beginPath(); g.arc(x + 52, ay + 98, 20, 0, 6.2832); g.fill(); T('?', x + 52, ay + 106, { f: F(20, 500), c: MB.mute, al: 'center' }); T('You', x + 86, ay + 108, { f: F(25, 400), c: MB.txt });
  // header: the bot's name pill + the model pill
  const cx0 = x + side, cw = w - side, mid = cx0 + cw / 2;
  const tw0 = tw(title, F(27, 600)) + 96; g.fillStyle = MB.pill; rr(mid - tw0 / 2, y + 20, tw0, 54, 27); g.fill();
  MB_avatar(mid - tw0 / 2 + 34, y + 47, 30); T(title, mid - tw0 / 2 + 60, y + 57, { f: F(27, 600), c: MB.txt });
  const mw = tw(model, F(22, 500)) + 80; g.fillStyle = MB.pill; rr(x + w - mw - 100, y + 22, mw, 50, 25); g.fill();
  g.fillStyle = '#e8774a'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; g.moveTo(x + w - mw - 72, y + 47); g.lineTo(x + w - mw - 72 + 10 * Math.cos(a), y + 47 + 10 * Math.sin(a)); } g.strokeStyle = '#e8774a'; g.lineWidth = 3; g.stroke();
  T(model, x + w - mw - 54, y + 55, { f: F(22, 500), c: MB.txt });
  T('···', x + w - 52, y + 55, { f: F(28, 700), c: MB.mute, al: 'center' });
  // composer
  const comp = { x: cx0 + 30, y: y + h - 98, w: cw - 60, h: 74 };
  g.fillStyle = '#232325'; rr(comp.x, comp.y, comp.w, comp.h, 37); g.fill();
  if (composer) { g.save(); g.beginPath(); g.rect(comp.x + 20, comp.y, comp.w - 90, comp.h); g.clip(); const f = F(26, 400), wdt = tw(composer, f), maxw = comp.w - 120;
      T(composer, comp.x + 34 - Math.max(0, wdt - maxw), comp.y + 46, { f, c: MB.txt });
      if (caret && (Math.floor(QT * 2.4) % 2 === 0)) { g.fillStyle = MB.blue; g.fillRect(comp.x + 38 + Math.min(wdt, maxw), comp.y + 22, 3, 32); } g.restore(); }
  else T('Message ' + title, comp.x + 34, comp.y + 46, { f: F(26, 400), c: MB.dim });
  g.fillStyle = composer ? MB.blue : '#3a3a3d'; g.beginPath(); g.arc(comp.x + comp.w - 38, comp.y + 37, 24, 0, 6.2832); g.fill();
  ln(comp.x + comp.w - 38, comp.y + 48, comp.x + comp.w - 38, comp.y + 26, { c: '#fff', w: 3.5 }); ln(comp.x + comp.w - 47, comp.y + 35, comp.x + comp.w - 38, comp.y + 26, { c: '#fff', w: 3.5 }); ln(comp.x + comp.w - 29, comp.y + 35, comp.x + comp.w - 38, comp.y + 26, { c: '#fff', w: 3.5 });
  g.restore(); g.restore();
  return { chat: { x: cx0, y: y + 92, w: cw, h: h - 92 - 112 }, comp, x, y, w, h };
}
// a chat bubble (bot = grey on the left, me = blue on the right). Returns its height. k = appear (0..1)
function MB_bubble(colX, colW, y, str, { me = false, f = F(27, 400), maxW = 0.7, k = 1, lh = 38, hi = null } = {}) {
  if (k <= 0.003) return 0; const lines = SH_wrap(str, f, colW * maxW - 48); const w = Math.max(...lines.map(l => tw(l, f))) + 48, h = lines.length * lh + 30;
  const x = me ? colX + colW - 30 - w : colX + 30; const p = ease.backOut ? ease.backOut(clamp(k)) : ease.expoOut(clamp(k));
  g.save(); g.globalAlpha *= clamp(k * 2); g.translate(x + (me ? w : 0), y + h); g.scale(0.85 + 0.15 * p, 0.85 + 0.15 * p); g.translate(-(x + (me ? w : 0)), -(y + h));
  if (me) { const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#3f86ff'); gr.addColorStop(1, '#1f5fe6'); g.fillStyle = gr; } else g.fillStyle = MB.bub;
  rr(x, y, w, h, 26); g.fill();
  lines.forEach((l, i) => { if (hi) hi(l, x + 24, y + 15 + (i + 0.78) * lh, f, i); else T(l, x + 24, y + 15 + (i + 0.78) * lh, { f, c: '#fff' }); });
  g.restore(); return h;
}
// the real "Set up: …" card (03-chat-card): lightning, the rule, Next, Pause · Edit · Undo
function MB_schedCard(x, y, w, { k = 1, rule = 'Set up: Every Monday at 9 AM, Scout sends you the top 5 complaints about Cursor', next = 'Next: Monday 9:00 AM', glow = 0 } = {}) {
  if (k <= 0.003) return 0; const f = F(26, 600), lines = SH_wrap(rule, f, w - 110), h = 46 + lines.length * 38 + 60;
  g.save(); g.globalAlpha *= clamp(k * 1.5); const s = 0.9 + 0.1 * ease.expoOut(clamp(k)); g.translate(x + w / 2, y + h / 2); g.scale(s, s); g.translate(-x - w / 2, -y - h / 2);
  if (glow > 0) { g.save(); g.shadowColor = `rgba(47,124,246,${0.55 * glow})`; g.shadowBlur = 40 * ZS * DPR; g.fillStyle = MB.card; rr(x, y, w, h, 22); g.fill(); g.restore(); }
  g.fillStyle = MB.card; rr(x, y, w, h, 22); g.fill(); g.strokeStyle = glow > 0 ? mix('#303033', '#2f7cf6', glow) : MB.cardLine; g.lineWidth = 2; rr(x, y, w, h, 22); g.stroke();
  // lightning bolt
  g.save(); g.translate(x + 40, y + 34); g.strokeStyle = MB.blue; g.lineWidth = 3; g.lineJoin = 'round'; g.beginPath(); g.moveTo(10, 0); g.lineTo(0, 16); g.lineTo(9, 16); g.lineTo(5, 30); g.lineTo(17, 12); g.lineTo(8, 12); g.closePath(); g.stroke(); g.restore();
  lines.forEach((l, i) => T(l, x + 76, y + 58 + i * 38, { f, c: MB.txt }));
  const by = y + 58 + lines.length * 38 + 14; T(next, x + 76, by, { f: F(23, 400), c: MB.mute });
  const ub = tw('Undo', F(23, 500)); T('Undo', x + w - 30, by, { f: F(23, 500), c: MB.link, al: 'right' });
  T('Pause  ·  Edit  · ', x + w - 38 - ub, by, { f: F(23, 400), c: MB.mute, al: 'right' });
  g.restore(); return h;
}
// a switch row like the app's settings ("Keep this computer awake for routines")
function MB_switch(x, y, w, label, on, { k = 1 } = {}) {
  if (k <= 0.003) return; g.save(); g.globalAlpha *= clamp(k * 1.6); g.fillStyle = MB.card; rr(x, y, w, 96, 22); g.fill(); g.strokeStyle = MB.cardLine; g.lineWidth = 2; rr(x, y, w, 96, 22); g.stroke();
  T(label, x + 30, y + 58, { f: F(27, 500), c: MB.txt }); const sx = x + w - 112, e = ease.expoOut(clamp(on));
  g.fillStyle = mix('#3a3a3d', '#2f7cf6', e); rr(sx, y + 28, 82, 42, 21); g.fill(); g.fillStyle = '#fff'; sh(6, 2, 0.3); g.beginPath(); g.arc(sx + 21 + 40 * e, y + 49, 17, 0, 6.2832); g.fill(); noSh(); g.restore();
}

// ───────── a real post (screenshot) as a card lying on the paper; i = index into POSTS ─────────
// w = card width; the height follows the image. o.grey = 0..1 desaturate, o.red = a soft red edge (angry)
function SH_post(i, x, y, w, { op = 1, rot = 0, grey = 0, lift = 1, red = 0, maxAR = 9 } = {}) {
  const P = SH_POSTS[((i % SH_POSTS.length) + SH_POSTS.length) % SH_POSTS.length]; if (!P || op <= 0.003) return 0;
  const im = P.im, ar = SH_ok(im) ? Math.min(maxAR, im.naturalHeight / im.naturalWidth) : 0.6, h = w * ar;   // maxAR: show only the top of a long post
  g.save(); g.globalAlpha *= op; if (rot) { g.translate(x + w / 2, y + h / 2); g.rotate(rot); g.translate(-x - w / 2, -y - h / 2); }
  plate(x - 10, y - 10, w + 20, h + 20, 18, { lift });
  if (SH_ok(im)) { g.save(); rr(x, y, w, h, 10); g.clip(); if (grey > 0.01) g.filter = `grayscale(${grey.toFixed(2)})`; g.drawImage(im, 0, 0, im.naturalWidth, im.naturalWidth * ar, x, y, w, h); g.filter = 'none';
    if (ar < im.naturalHeight / im.naturalWidth - 0.02) { const fg = g.createLinearGradient(0, y + h - 60, 0, y + h); fg.addColorStop(0, 'rgba(255,255,255,0)'); fg.addColorStop(1, 'rgba(255,255,255,0.95)'); g.fillStyle = fg; g.fillRect(x, y + h - 60, w, 60); }
    g.restore(); }
  if (red > 0.01) { g.strokeStyle = `rgba(226,59,59,${0.85 * red})`; g.lineWidth = 4; rr(x - 10, y - 10, w + 20, h + 20, 18); g.stroke(); }
  g.restore(); return h + 20;
}
const SH_postH = (i, w, maxAR = 9) => { const P = SH_POSTS[((i % SH_POSTS.length) + SH_POSTS.length) % SH_POSTS.length]; return P && SH_ok(P.im) ? w * Math.min(maxAR, P.im.naturalHeight / P.im.naturalWidth) + 20 : w * 0.6; };

// ───────── Cursor's real app icon ─────────
function SH_cursorIcon(cx, cy, s, { op = 1, rot = 0 } = {}) { const im = SH_IM.cursor; if (!SH_ok(im) || op <= 0.003) return; g.save(); g.globalAlpha *= op; g.translate(cx, cy); g.rotate(rot); sh(30, 14, 0.22); g.drawImage(im, -s / 2, -s / 2, s, s); noSh(); g.restore(); }

// ───────── BEFORE props (grey world) ─────────
function SH_sticky(x, y, w, str, { k = 1, rot = -0.05, col = '#ecebe6' } = {}) {
  if (k <= 0.003) return; g.save(); g.globalAlpha *= clamp(k * 2); g.translate(x + w / 2, y + w / 2); g.rotate(rot); g.translate(-x - w / 2, -y - w / 2);
  g.fillStyle = col; sh(28, 16, 0.18); g.fillRect(x, y, w, w); noSh(); sh(4, 2, 0.12); g.fillRect(x, y, w, w); noSh();
  const gr = g.createLinearGradient(x, y + w * 0.8, x, y + w); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.05)'); g.fillStyle = gr; g.fillRect(x, y, w, w);
  g.fillStyle = 'rgba(0,0,0,0.04)'; g.fillRect(x, y, w, w * 0.12);
  const lines = str.split('\n'); lines.forEach((l, i) => writeOn(l, x + w / 2, y + w * 0.38 + i * w * 0.17, clamp(k * 1.6 - i * 0.25), { f: FMK(w * 0.105, 700), al: 'center', c: '#2b2b2e' }));
  g.restore();
}
// a little survey form: title, "3 responses", three answer rows
function SH_survey(x, y, w, { k = 1, answers = [] } = {}) {
  if (k <= 0.003) return; const h = 200 + answers.length * 96; g.save(); g.globalAlpha *= clamp(k * 2); plate(x, y, w, h, 28, { lift: 1.1 });
  g.fillStyle = '#8f8f94'; rr(x, y, w, 14, 7); g.fill();
  T('What should we build next?', x + 40, y + 78, { f: F(36, 600) }); T(`${answers.length} responses`, x + 40, y + 122, { f: F(26, 400), c: C.mute });
  answers.forEach((a, i) => { const ka = clamp(k * 3 - 1 - i * 0.5), ay = y + 160 + i * 96; if (ka <= 0) return; g.save(); g.globalAlpha *= ka;
    g.fillStyle = '#f1f0ec'; rr(x + 34, ay, w - 68, 76, 16); g.fill(); g.fillStyle = '#c9c8c3'; g.beginPath(); g.arc(x + 72, ay + 38, 16, 0, 6.2832); g.fill();
    T(a, x + 106, ay + 48, { f: F(28, 400), c: C.ink2 }); g.restore(); });
  g.restore();
}
// a grey friend's chat bubble on paper (white bubble, grey text)
function SH_paperBubble(x, y, str, { k = 1, right = false, f = F(30, 400) } = {}) {
  if (k <= 0.003) return; const w = tw(str, f) + 52, h = 72; const xx = right ? x - w : x; g.save(); g.globalAlpha *= clamp(k * 2);
  const s = 0.8 + 0.2 * ease.expoOut(clamp(k)); g.translate(xx + w / 2, y + h / 2); g.scale(s, s); g.translate(-xx - w / 2, -y - h / 2);
  plate(xx, y, w, h, 34, { lift: 0.8, fill: '#ffffff' }); T(str, xx + 26, y + 47, { f, c: C.ink2 }); g.restore();
}

// ───────── the bot's notes file (Bot Settings → Memory: MEMORY.md) ─────────
// weeks = [{ head, rows: [[text, {neu, seen}]] }], k per element via o.kRow(i,j)
function SH_notes(x, y, w, h, { op = 1, weeks = [], kRow = () => 1, gauge = '' } = {}) {
  if (op <= 0.003) return; g.save(); g.globalAlpha *= op; plate(x, y, w, h, 26, { fill: '#121214', lift: 1.4, line: false });
  g.save(); rr(x, y, w, h, 26); g.clip();
  g.fillStyle = '#1b1b1d'; g.fillRect(x, y, w, 96); g.fillStyle = MB.line; g.fillRect(x, y + 96, w, 1.5);
  MB_avatar(x + 50, y + 48, 40); T('Scout', x + 84, y + 44, { f: F(26, 600), c: MB.txt }); T('Memory · MEMORY.md', x + 84, y + 76, { f: F(21, 400), c: MB.mute });
  if (gauge) T(gauge, x + w - 34, y + 60, { f: F(21, 500), c: MB.mute, al: 'right' });
  let cy = y + 150; const fm = FM(29, 500);
  weeks.forEach((wk, i) => { const kh = kRow(i, -1); if (kh <= 0.003) return; g.save(); g.globalAlpha *= clamp(kh * 2);
    T(wk.head, x + 40, cy, { f: FM(29, 700), c: '#e8e8ea' }); g.restore(); cy += 58;
    wk.rows.forEach(([txt, o = {}], j) => { const kr = kRow(i, j); if (kr <= 0.003) { return; } g.save(); g.globalAlpha *= clamp(kr * 2);
      const dx = (1 - ease.expoOut(clamp(kr))) * 30; const col = o.seen ? '#77777c' : '#e8e8ea';
      T('-', x + 44 + dx, cy, { f: fm, c: '#77777c' }); T(txt, x + 74 + dx, cy, { f: fm, c: col });
      if (o.neu) { const kn = clamp(o.neu), tx = x + 74 + dx + tw(txt, fm) + 22, s = 1 + 0.5 * (1 - ease.backOut(kn)); if (kn > 0.003) { g.save(); g.globalAlpha *= clamp(kn * 3);
        g.translate(tx + 44, cy - 9); g.scale(s, s); g.fillStyle = MB.blue; rr(-44, -21, 88, 40, 11); g.fill(); T('NEW', 0, 9, { f: F(22, 700), c: '#fff', al: 'center' }); g.restore(); } }
      if (o.strike) { const ks = clamp(o.strike); ln(x + 72, cy - 9, x + 72 + (tw(txt, fm) + 6) * ks, cy - 9, { c: '#77777c', w: 2.5 }); }
      g.restore(); cy += 52; });
    cy += 30; });
  g.restore(); g.restore();
}

// ───────── a fingertip "press" ring (where Ali taps) ─────────
function SH_tapRing(x, y, t, t0, { r = 34, c = '255,255,255' } = {}) {
  const u = (t - t0) / 0.45; if (u < 0 || u > 1) return; const e = ease.expoOut(u);
  g.save(); g.strokeStyle = `rgba(${c},${0.9 * (1 - u)})`; g.lineWidth = 5 * (1 - u) + 1; g.beginPath(); g.arc(x, y, r * (0.4 + 1.3 * e), 0, 6.2832); g.stroke(); g.restore();
}
