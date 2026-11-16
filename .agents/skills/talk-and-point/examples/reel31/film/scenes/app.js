// scenes/app.js — the AFTER world: OpenMausBot's window (prefix AP_). Rows 6-8: make a bot, the one message typed word by
// word in the composer, send → blue bubble, "Every Monday" lifts out and becomes the real "Set up: …" card, the bot's
// reply; "Keep your laptop awake" → the real Automations switch; Monday 9:00 → Scout's screen flips through real
// Reddit / Hacker News pages; the list of five lands in the chat, one row at a time, the top one stays lit.
'use strict';
const AP_side = 380, AP_CW = APP.w - AP_side, AP_COLX = APP.x + AP_side;
const AP_MSG = 'Every Monday, go through Reddit and Hacker News, find what people hate about Cursor, and give me the top five complaints, with a link to each one.';
const AP_REPLY = 'Done. Every Monday at 9 AM I’ll send you the top five complaints about Cursor, with a link to each one.';
const AP_FC = F(33, 400), AP_LH = 46;          // composer text
const AP_FB = F(31, 400), AP_LHB = 43;         // bubbles
// the words of the message, typed as he says them (his words in piece MSG_ID, mapped onto the script text by index)
const AP_WORDS = AP_MSG.split(' ');
const AP_HIS = () => MSG_IDS.flatMap(id => (SEG[id] ? SEG[id].words : []));   // his words of the message, tight clock
function AP_typed(t) {
  const ws = AP_HIS(); if (!ws.length || t < ws[0][1]) return { str: '', n: 0 };
  let n = 0, part = '';
  for (let i = 0; i < AP_WORDS.length; i++) { const w = ws[Math.min(i, ws.length - 1)], a = i < ws.length ? w[1] : w[2] + (i - ws.length + 1) * 0.06, b = i < ws.length ? Math.max(w[2], a + 0.12) : a + 0.06;
    if (t >= b) { n = i + 1; continue; } if (t >= a) { const k = clamp((t - a) / (b - a)); part = AP_WORDS[i].slice(0, Math.ceil(AP_WORDS[i].length * k)); } break; }
  const str = AP_WORDS.slice(0, n).join(' ') + (part ? (n ? ' ' : '') + part : ''); return { str, n };
}
// the rows of the result (from research: real complaints, real links)
const AP_ROWS = (window.TOP5 || [['Top complaint', 'reddit.com/r/cursor']]).slice(0, 5);
// ───────── layout of the chat column on the TIGHT clock: [key, y-height, appear time] ─────────
function AP_items(t) {
  const L = [];
  L.push({ id: 'date', h: 56, t0: -99 });
  L.push({ id: 'hi', h: 40 + AP_LHB + 30, t0: -99 });
  const ub = SH_wrap(AP_MSG, AP_FB, AP_CW * 0.78 - 48).length;
  L.push({ id: 'me', h: ub * AP_LHB + 30 + 26, t0: A_.tSend });
  L.push({ id: 'card', h: 46 + 2 * 38 + 60 + 26, t0: A_.tCard });
  L.push({ id: 'mon', h: 80, t0: A_.tMonDiv });
  L.push({ id: 'run', h: AP_runH(t), t0: A_.tRun });
  L.push({ id: 'list', h: 110 + AP_ROWS.length * 118 + 30, t0: A_.tListIn });
  return L;
}
// scroll: the newest item's bottom stays above the composer (eased)
const AP_viewTop = () => APP.y + 92, AP_viewBot = t => APP.y + APP.h - 112 - AP_compH(t) + 74;
function AP_compH(t) { const ty = AP_typed(t).str, send = seg(t, A_.tSend - 0.05, A_.tSend + 0.25); if (!ty || send >= 1) return 74; const n = SH_wrap(ty, AP_FC, AP_CW - 160).length; return lerp(30 + Math.max(1, n) * AP_LH, 74, send); }
function AP_layout(t) {
  const L = AP_items(t); let y = 0; const out = {};
  for (const it of L) { out[it.id] = { y, h: it.h, t0: it.t0 }; y += it.h; }
  // content bottom at time t (items that have appeared, eased in)
  let bot = 0; for (const it of L) { const k = ease.expoOut(seg(t, it.t0 - 0.05, it.t0 + 0.35)); if (k > 0) bot = out[it.id].y + out[it.id].h * k; }
  const room = AP_viewBot(t) - AP_viewTop() - 40, scroll = Math.max(0, bot - room);   // top-anchored like a fresh bot's chat; scrolls once full
  return { out, scroll };
}
function AP_scroll(t) {   // smoothed scroll (average of a few nearby times so jumps ease)
  let s = 0; for (let i = 0; i < 7; i++) s += AP_layout(t - i * 0.05).scroll; return s / 7;
}
const AP_Y = (id, t) => { const { out } = AP_layout(t); return AP_viewTop() + 30 + out[id].y - AP_scroll(t); };

layer(40, 'ap-window', t => {
  if (t < A_.tAppIn - 1 || t > A_.tAppOut + 1 || !onScreen(APP.x, APP.y, APP.w, APP.h, 400)) return;
  const made = t >= A_.tMake + 0.2;
  const bots = [['Ledger', 'Hi, I’m Ledger. What would you…', '', ['#ff6b6b', '#c4303a']], ['Hazel', 'Hi, I’m Hazel. What would you…', '', ['#3ecf8e', '#118a52']]];
  if (made) bots.unshift(['Scout', t > A_.tListIn ? 'Top 5 complaints about Cursor…' : 'Hi, I’m Scout. What would you…', t > A_.tMonDiv ? '9:00 AM' : 'now', ['#5b95ff', '#1f5fe6']]);
  const W = MB_window(APP.x, APP.y, APP.w, APP.h, { title: made ? 'Scout' : 'New bot', bots, active: made ? 0 : -1, side: AP_side });
  if (!W) return;
  // the "+" (new bot) is pressed on "Make"
  const pr = OM.press(t, A_.tMake, { depth: 0.3 }); if (t > A_.tMake - 0.3 && t < A_.tMake + 0.6) SH_tapRing(APP.x + AP_side - 42, APP.y + 38, t, A_.tMake, { r: 30 });
  // the chat column (clipped)
  g.save(); g.beginPath(); g.rect(AP_COLX, APP.y + 92, AP_CW, APP.h - 92 - 4); g.clip();
  g.fillStyle = MB.bg; g.fillRect(AP_COLX + 1, APP.y + 92, AP_CW - 2, APP.h - 96);
  if (made) {
    const kHi = ease.expoOut(seg(t, A_.tMake + 0.25, A_.tMake + 0.6));
    const yD = AP_Y('date', t); T('Today 9:02 AM', AP_COLX + AP_CW / 2, yD + 30, { f: F(22, 500), c: MB.mute, al: 'center', op: kHi });
    MB_bubble(AP_COLX, AP_CW, AP_Y('hi', t), 'Hi, I’m Scout. What would you like me to do?', { f: AP_FB, lh: AP_LHB, k: kHi, maxW: 0.78 });
    // the sent message (blue), "Every Monday" highlighted until it lifts out
    const kMe = seg(t, A_.tSend, A_.tSend + 0.32);
    if (kMe > 0) { const yM = AP_Y('me', t), lift = seg(t, A_.tCard - 0.45, A_.tCard);
      MB_bubble(AP_COLX, AP_CW, yM, AP_MSG, { me: true, f: AP_FB, lh: AP_LHB, k: 1, maxW: 0.78, hi: (l, x, y, f, i) => {
        if (i === 0 && l.startsWith('Every Monday,')) { const w0 = tw('Every Monday', f); g.fillStyle = `rgba(255,255,255,${0.28 * (1 - lift)})`; rr(x - 6, y - 32, w0 + 12, 42, 9); g.fill(); }
        T(l, x, y, { f, c: '#fff' }); } }); }
    // the schedule card (grows out of the "Every Monday" words)
    if (t > A_.tCard - 0.45) { const yC = AP_Y('card', t), cw = AP_CW * 0.82, cx = AP_COLX + 30;
      const yM = AP_Y('me', t), lines = SH_wrap(AP_MSG, AP_FB, AP_CW * 0.78 - 48), bw = Math.max(...lines.map(l => tw(l, AP_FB))) + 48, bx = AP_COLX + AP_CW - 30 - bw;
      const A = { x: bx + 18, y: yM + 15 + 6, w: tw('Every Monday', AP_FB) + 12, h: 42, r: 9 }, B = { x: cx, y: yC, w: cw, h: 182, r: 22 };
      const m = OM.morphRect(t, A_.tCard - 0.45, A_.tCard + 0.15, A, B, { curve: ease.expoInOut });
      if (m.k < 0.98) { g.fillStyle = mix('#5b95ff', MB.card, m.k); rr(m.x, m.y, m.w, m.h, m.r); g.fill(); if (m.k < 0.5) T('Every Monday', m.x + 6, m.y + 32, { f: AP_FB, c: '#fff', op: 1 - m.k * 2 }); }
      else MB_schedCard(cx, yC, cw, { k: 1, glow: 1 - seg(t, A_.tCard + 0.2, A_.tCard + 2.2) }); }
    // Monday 9:00 AM divider
    const kMon = ease.expoOut(seg(t, A_.tMonDiv, A_.tMonDiv + 0.4));
    if (kMon > 0) { const y = AP_Y('mon', t) + 44; g.save(); g.globalAlpha *= kMon; ln(AP_COLX + 60, y - 9, AP_COLX + AP_CW / 2 - 150, y - 9, { c: '#333336', w: 2 }); ln(AP_COLX + AP_CW / 2 + 150, y - 9, AP_COLX + AP_CW - 60, y - 9, { c: '#333336', w: 2 });
      T('Monday 9:00 AM', AP_COLX + AP_CW / 2, y, { f: F(24, 600), c: MB.txt, al: 'center' }); g.restore(); }
    // the run: "Scout is reading…" + a small view of Scout's screen flipping through real Reddit / Hacker News pages (sped up);
    // when the list lands it folds into one line
    if (t > A_.tRun - 0.05) AP_run(AP_COLX + 30, AP_Y('run', t), AP_CW - 60, t);
    // the result: the top five, each with its link, one at a time; the top one stays lit
    AP_list(AP_COLX + 30, AP_Y('list', t), AP_CW - 60, t);
  }
  g.restore();
  // the composer: grows with the message, typed as he says it; on send the text flies up into the blue bubble
  AP_composer(t);
});
function AP_runH(t) { return lerp(500, 76, ease.expoInOut(seg(t, A_.tListIn - 0.25, A_.tListIn + 0.15))); }
function AP_run(x, y, w, t) {
  const k = seg(t, A_.tRun - 0.05, A_.tRun + 0.2), h = AP_runH(t) - 26, fold = seg(t, A_.tListIn - 0.25, A_.tListIn + 0.15); if (k <= 0) return;
  g.save(); g.globalAlpha *= k; g.fillStyle = MB.card; rr(x, y, w, h, 24); g.fill(); g.strokeStyle = MB.cardLine; g.lineWidth = 2; rr(x, y, w, h, 24); g.stroke();
  g.save(); rr(x, y, w, h, 24); g.clip();
  MB_avatar(x + 44, y + 38, 34); const done = fold > 0.5, site = (t - A_.tRun) % 0.5 < 0.25 ? 'Reddit' : 'Hacker News';
  T(done ? 'Read Reddit and Hacker News  ✓' : `Scout is reading ${site}…`, x + 78, y + 48, { f: F(27, 600), c: done ? MB.txt : MB.mute });
  if (!done) { g.strokeStyle = MB.blue; g.lineWidth = 4; g.beginPath(); g.arc(x + w - 46, y + 38, 13, t * 9, t * 9 + 4.2); g.stroke(); }
  // Scout's screen: a browser page, pages slide by every 0.16 s
  const sx = x + 24, sy = y + 76, sw = w - 48, shh = h - 96; if (shh > 30) { g.fillStyle = '#ffffff'; rr(sx, sy, sw, shh, 14); g.fill(); g.save(); rr(sx, sy, sw, shh, 14); g.clip();
    const n = Math.max(1, SH_POSTS.length), per = 0.16, i = Math.floor(Math.max(0, t - A_.tRun) / per), u = ease.expoOut(clamp(((t - A_.tRun) % per) / 0.09));
    const P = SH_POSTS[i % n]; g.fillStyle = '#eceae6'; g.fillRect(sx, sy, sw, 50); g.fillStyle = '#fff'; rr(sx + 16, sy + 9, sw - 32, 32, 16); g.fill();
    if (P) T(P.host, sx + 34, sy + 32, { f: F(19, 500), c: C.ink2 });
    for (const [j, dx] of [[i - 1, -sw * u], [i, sw * (1 - u)]]) { if (j < 0) continue; const Q = SH_POSTS[j % n]; if (!Q || !SH_ok(Q.im)) continue;
      const iw = sw - 30, ih = iw * Q.im.naturalHeight / Q.im.naturalWidth; g.drawImage(Q.im, sx + 15 + dx, sy + 60, iw, ih); }
    g.restore(); }
  g.restore(); g.restore();
}
function AP_list(x, y, w, t) {
  const k0 = seg(t, A_.tListIn, A_.tListIn + 0.35); if (k0 <= 0) return; const h = 110 + AP_ROWS.length * 118;
  g.save(); g.globalAlpha *= clamp(k0 * 1.6); const s = 0.94 + 0.06 * ease.backOut(k0); g.translate(x, y); g.scale(s, s); g.translate(-x, -y);
  g.fillStyle = MB.bub; rr(x, y, w, h, 28); g.fill();
  T('Top 5 complaints about Cursor this week', x + 34, y + 62, { f: F(31, 600), c: '#fff' });
  AP_ROWS.forEach(([label, link], i) => { const kr = seg(t, A_.tRow[i], A_.tRow[i] + 0.3); if (kr <= 0) return; const ry = y + 100 + i * 118, lit = i === 0 ? seg(t, A_.tLit, A_.tLit + 0.3) * (1 - seg(t, A_.tAppOut - 0.2, A_.tAppOut)) : 0;
    const dim = i > 0 ? 0.55 * seg(t, A_.tLit, A_.tLit + 0.3) : 0;
    g.save(); g.globalAlpha *= clamp(kr * 1.5) * (1 - dim); const dx = (1 - ease.expoOut(kr)) * 40;
    if (lit > 0) { g.save(); g.shadowColor = `rgba(47,124,246,${0.6 * lit})`; g.shadowBlur = 30 * ZS * DPR; g.fillStyle = `rgba(47,124,246,${0.22 * lit})`; rr(x + 14, ry - 4, w - 28, 110, 20); g.fill(); g.restore();
      g.strokeStyle = `rgba(90,162,255,${lit})`; g.lineWidth = 3; rr(x + 14, ry - 4, w - 28, 110, 20); g.stroke(); }
    g.fillStyle = i === 0 ? MB.blue : '#3a3a3d'; g.beginPath(); g.arc(x + 58 + dx, ry + 34, 21, 0, 6.2832); g.fill(); T(String(i + 1), x + 58 + dx, ry + 43, { f: F(24, 700), c: '#fff', al: 'center' });
    T(label, x + 96 + dx, ry + 44, { f: F(31, 600), c: '#fff' });
    T('🔗 ' + link, x + 96 + dx, ry + 86, { f: F(24, 400), c: MB.link });
    g.restore(); });
  g.restore();
}
function AP_composer(t) {
  const ty = AP_typed(t), send = seg(t, A_.tSend - 0.05, A_.tSend + 0.25), ch = AP_compH(t);
  const x = AP_COLX + 30, w = AP_CW - 60, y = APP.y + APP.h - 24 - ch;
  g.fillStyle = '#232325'; rr(x, y, w, ch, Math.min(37, ch / 2)); g.fill();
  if (t < A_.tMake + 0.2) { T('Message New bot', x + 34, y + 46, { f: F(26, 400), c: MB.dim }); return; }
  const showing = ty.str && send < 1;
  if (showing) { const lines = SH_wrap(ty.str, AP_FC, w - 130); g.save(); g.globalAlpha *= 1 - send;
    const hiOn = seg(t, A_.tEveryMon, A_.tEveryMon + 0.2);
    lines.forEach((l, i) => { const ly = y + 15 + (i + 0.78) * AP_LH;
      if (i === 0 && hiOn > 0 && l.startsWith('Every')) { const w0 = tw(l.startsWith('Every Monday') ? 'Every Monday' : l.split(',')[0], AP_FC); g.fillStyle = `rgba(47,124,246,${0.42 * hiOn})`; rr(x + 28, ly - 34, w0 + 14, 44, 9); g.fill(); }
      T(l, x + 34, ly, { f: AP_FC, c: MB.txt }); });
    const last = lines[lines.length - 1] || '', cxp = x + 36 + tw(last, AP_FC), cyp = y + 15 + (lines.length - 1 + 0.78) * AP_LH;
    if (Math.floor(QT * 2.4) % 2 === 0 || t < T1(MSG_ID)) { g.fillStyle = MB.blue; g.fillRect(cxp, cyp - 32, 3, 40); }
    g.restore(); }
  else T('Message Scout', x + 34, y + 46, { f: F(26, 400), c: MB.dim });
  // send button (pressed at send)
  const pr = OM.press(t, A_.tSend - 0.08, { depth: 0.25 }); g.save(); g.translate(x + w - 38, y + ch - 37); g.scale(pr.s, pr.s);
  g.fillStyle = showing ? MB.blue : '#3a3a3d'; g.beginPath(); g.arc(0, 0, 24, 0, 6.2832); g.fill();
  ln(0, 11, 0, -11, { c: '#fff', w: 3.5 }); ln(-9, -2, 0, -11, { c: '#fff', w: 3.5 }); ln(9, -2, 0, -11, { c: '#fff', w: 3.5 }); g.restore();
  SH_tapRing(x + w - 38, y + ch - 37, t, A_.tSend - 0.08, { r: 30 });
}
// "Keep your laptop awake": the real Automations switch, floating over the window's lower half
layer(70, 'ap-awake', t => {
  if (!window.AP_AWAKE_IN_APP) return;   // the switch is on his fingertip instead (finger.js)
  if (t < A_.tKeep - 0.3 || t > A_.tMonDiv + 0.6) return; const k = seg(t, A_.tKeep - 0.1, A_.tKeep + 0.3) * (1 - seg(t, A_.tMonDiv, A_.tMonDiv + 0.4));
  const x = APP.x + AP_side + 40, y = AWAKE_Y, w = AP_CW - 80; g.save(); const p = pop(t, A_.tKeep - 0.1); g.translate(0, p.dy);
  g.globalAlpha *= clamp(k * 1.5); plate(x - 18, y - 70, w + 36, 200, 30, { fill: '#101012', lift: 1.6, line: false });
  T('Automations', x + 6, y - 22, { f: F(24, 600), c: MB.mute });
  MB_switch(x, y, w, 'Keep this computer awake for routines', seg(t, A_.tAwake, A_.tAwake + 0.35));
  SH_tapRing(x + w - 71, y + 49, t, A_.tAwake, { r: 34 });
  g.restore();
});
// Scout's screen (the bot's computer panel): real Reddit / Hacker News pages flip by, sped up
layer(72, 'ap-screen', t => { if (!window.AP_SCREEN_FLOAT) return;   // replaced by the inline run in the chat (AP_run)
  if (t < A_.tRun - 0.4 || t > A_.tListIn + 0.8) return; const k = seg(t, A_.tRun - 0.2, A_.tRun + 0.2) * (1 - seg(t, A_.tListIn, A_.tListIn + 0.5));
  if (k <= 0.003) return; const { x, y, w, h } = SCREEN; g.save(); g.globalAlpha *= clamp(k * 1.4); const p = pop(t, A_.tRun - 0.2); g.translate(0, p.dy);
  plate(x, y, w, h, 28, { fill: '#151517', lift: 1.7, line: false });
  T('Computer', x + w / 2, y + 52, { f: F(26, 600), c: MB.txt, al: 'center' }); T('Scout’s screen', x + 30, y + 104, { f: F(22, 400), c: MB.mute });
  const sx = x + 24, sy = y + 124, sw = w - 48, shh = h - 150; g.fillStyle = '#ffffff'; rr(sx, sy, sw, shh, 16); g.fill();
  g.save(); rr(sx, sy, sw, shh, 16); g.clip();
  // a browser bar + the page; pages change every 0.22 s with a short slide
  const n = Math.max(1, SH_POSTS.length), per = 0.22, i = Math.floor(Math.max(0, t - A_.tRun) / per), u = ease.expoOut(clamp(((t - A_.tRun) % per) / 0.12));
  const P = SH_POSTS[i % n]; g.fillStyle = '#eceae6'; g.fillRect(sx, sy, sw, 56);
  g.fillStyle = '#ffffff'; rr(sx + 20, sy + 11, sw - 40, 34, 17); g.fill(); T(P ? P.host : 'reddit.com', sx + 40, sy + 35, { f: F(19, 500), c: C.ink2 });
  for (const [j, dx] of [[i - 1, -sw * u], [i, sw * (1 - u)]]) { if (j < 0) continue; const Q = SH_POSTS[j % n]; if (!Q || !SH_ok(Q.im)) continue;
    const iw = sw - 40, ih = iw * Q.im.naturalHeight / Q.im.naturalWidth; g.drawImage(Q.im, sx + 20 + dx, sy + 72, iw, ih); }
  g.restore(); g.restore();
});
// CAMERA NOTES (tight clock) — see comp.html: whole window on "Make" (zoom 0.66), push to the composer for the message
// (zoom ~1.0, composer at screen y ~1150), follow up to the card + reply, pull back for the switch, the run beside the window,
// then into the list (zoom ~1.15) with the top row centred.
window.SFX_EVENTS = (window.SFX_EVENTS || []).concat([
  { t: A_.tSend, kind: 'whoosh', v: 0.7, note: 'message sent' }, { t: A_.tCard, kind: 'hit', v: 0.6, note: 'schedule card lands' },
  { t: A_.tAwake, kind: 'click', v: 0.6, note: 'awake switch' }, { t: A_.tListIn, kind: 'hit', v: 0.8, note: 'list lands' },
]);
// ───────── the first trick: a finger taps the top row's link and the real thread opens (row 9) ─────────
function AP_rowRect(t, i) { const y = AP_Y('list', t) + 100 + i * 118; return { x: AP_COLX + 30 + 14, y: y - 4, w: AP_CW - 60 - 28, h: 110, r: 20 }; }
function AP_finger(x, y, s = 1, press = 0) {   // a simple fingertip coming up from below (skin, nail, soft shadow)
  g.save(); g.translate(x, y); g.scale(s * (1 - 0.06 * press), s * (1 - 0.06 * press)); g.rotate(-0.18);
  sh(40, 22, 0.28); const gr = g.createLinearGradient(-50, 0, 50, 0); gr.addColorStop(0, '#d9a684'); gr.addColorStop(0.5, '#f0c9a8'); gr.addColorStop(1, '#d29d7b'); g.fillStyle = gr;
  g.beginPath(); g.moveTo(-48, 600); g.lineTo(-48, 50); g.arc(0, 50, 48, Math.PI, 0); g.lineTo(48, 600); g.closePath(); g.fill(); noSh();
  g.fillStyle = 'rgba(255,236,224,0.85)'; rr(-30, 8, 60, 74, 26); g.fill(); g.strokeStyle = 'rgba(160,110,85,0.35)'; g.lineWidth = 2; rr(-30, 8, 60, 74, 26); g.stroke();
  ln(-30, 160, 30, 160, { c: 'rgba(150,100,75,0.35)', w: 2.5 }); g.restore();
}
layer(78, 'ap-thread', t => {
  if (t < A_.tLinkW - 1 || t > A_.tAppOut + 0.5) return;
  const R = AP_rowRect(t, 0), tap = A_.tThread, link = { x: R.x + 82, y: R.y + 66, w: 520, h: 40 };
  // the finger comes up, presses the link, leaves
  const kin = ease.expoOut(seg(t, tap - 0.55, tap - 0.05)), kout = ease.expoIn(seg(t, tap + 0.15, tap + 0.45)), pr = clamp(1 - Math.abs(t - tap) / 0.08);
  if (kin > 0 && kout < 1) AP_finger(link.x + 160, link.y + 30 + (1 - kin) * 700 + kout * 700, 1, pr);
  if (t > tap - 0.05 && t < tap + 0.5) SH_tapRing(link.x + 160, link.y + 20, t, tap, { r: 40, c: '90,162,255' });
  // the real thread grows out of the link into a big card
  const P = SH_POSTS[THREAD_IDX]; if (!P || !SH_ok(P.im) || t < tap + 0.05) return;
  const W2 = 1000, H2 = Math.min(1500, W2 * P.im.naturalHeight / P.im.naturalWidth + 120), B = { x: THREAD_C[0] - W2 / 2, y: THREAD_C[1] - H2 / 2, w: W2, h: H2, r: 28 };
  const m = OM.morphRect(t, tap + 0.05, tap + 0.5, { ...link, r: 12 }, B, { curve: ease.expoInOut }); const close = seg(t, A_.tAppOut - 0.35, A_.tAppOut);
  g.save(); g.globalAlpha *= 1 - close; plate(m.x, m.y, m.w, m.h, m.r, { lift: 1.8 });
  g.save(); rr(m.x, m.y, m.w, m.h, m.r); g.clip(); g.fillStyle = '#eceae6'; g.fillRect(m.x, m.y, m.w, 70 * m.k);
  if (m.k > 0.5) { const a = (m.k - 0.5) * 2; g.globalAlpha *= a; g.fillStyle = '#fff'; rr(m.x + 24, m.y + 15, m.w - 48, 40, 20); g.fill(); T('🔒 ' + P.url.replace(/^https?:\/\//, ''), m.x + 44, m.y + 43, { f: F(22, 500), c: C.ink2 });
    const iw = m.w - 40, ih = iw * P.im.naturalHeight / P.im.naturalWidth; g.drawImage(P.im, m.x + 20, m.y + 86, iw, ih); }
  g.restore();
  // "real" stamp
  const ks = seg(t, A_.tReal - 0.1, A_.tReal + 0.15); if (ks > 0) { const s = 1 + 0.6 * (1 - ease.backOut(ks)); g.save(); g.translate(m.x + m.w - 170, m.y + 170); g.rotate(-0.1); g.scale(s, s); g.globalAlpha *= clamp(ks * 3);
    g.strokeStyle = '#1f9d55'; g.lineWidth = 7; rr(-140, -50, 280, 100, 18); g.stroke(); T('✓ REAL', 0, 20, { f: F(54, 800), c: '#1f9d55', al: 'center' }); g.restore(); }
  g.restore();
});
