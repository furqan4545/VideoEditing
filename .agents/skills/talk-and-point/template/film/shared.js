// shared.js — things several scenes draw. Generic helpers here; put the film's own components (the tool's rebuilt UI:
// window, chat bubbles, cards) below them, prefixed (reel 31: MB_window, MB_bubble, MB_schedCard, MB_switch).
'use strict';
// ───────── images, preloaded before the first frame ─────────
// film/posts.js (tools/posts.py) sets window.POSTS = [{img, url, host, title}] (real screenshots, usernames blurred).
const SH_IM = {}, SH_IMP = [];
function SH_load(key, src) { const im = new Image(); im.src = src; SH_IM[key] = im; SH_IMP.push(im.decode().catch(() => console.warn('img', src))); return im; }
(window.ICONS || []).forEach(([k, src]) => SH_load(k, src));          // window.ICONS = [['cursor', 'img/cursor_icon.png'], ...]
const SH_POSTS = (window.POSTS || []).map((p, i) => ({ ...p, im: SH_load('post' + i, p.img) }));
window.FONTS_READY = Promise.all([window.FONTS_READY, ...SH_IMP]);
const SH_ok = im => im && im.complete && im.naturalWidth > 0;

// ───────── text ─────────
function SH_wrap(str, f, maxW) {
  g.font = f; const out = []; let cur = '';
  for (const w of str.split(' ')) { const t = cur ? cur + ' ' + w : w; if (g.measureText(t).width > maxW && cur) { out.push(cur); cur = w; } else cur = t; }
  if (cur) out.push(cur); return out;
}
// a paragraph with some words styled: parts = [[text, {c, f, bg, op}], ...]; returns its height
function SH_rich(parts, x, y, maxW, lh, base) {
  let cx = x, cy = y; const sp = tw(' ', base.f);
  for (const [str, o] of parts) { const f = (o && o.f) || base.f, c = (o && o.c) || base.c;
    for (const w of str.split(' ').filter(Boolean)) { const ww = tw(w, f); if (cx + ww > x + maxW && cx > x) { cx = x; cy += lh; }
      if (o && o.bg) { g.fillStyle = o.bg; rr(cx - 6, cy - lh * 0.72, ww + 12, lh * 0.92, 8); g.fill(); }
      T(w, cx, cy, { f, c, op: (o && o.op) ?? 1 }); cx += ww + sp; } }
  return cy - y + lh;
}

// ───────── a real post (screenshot) as a card on the paper ─────────
// i = index into POSTS; w = card width; maxAR caps height/width (shows only the top of a long post, with a fade);
// grey 0..1 desaturates (the BEFORE look), red 0..1 a red edge.
function SH_post(i, x, y, w, { op = 1, rot = 0, grey = 0, lift = 1, red = 0, maxAR = 9 } = {}) {
  const P = SH_POSTS[((i % SH_POSTS.length) + SH_POSTS.length) % SH_POSTS.length]; if (!P || op <= 0.003) return 0;
  const im = P.im, ar = SH_ok(im) ? Math.min(maxAR, im.naturalHeight / im.naturalWidth) : 0.6, h = w * ar;
  g.save(); g.globalAlpha *= op; if (rot) { g.translate(x + w / 2, y + h / 2); g.rotate(rot); g.translate(-x - w / 2, -y - h / 2); }
  plate(x - 10, y - 10, w + 20, h + 20, 18, { lift });
  if (SH_ok(im)) { g.save(); rr(x, y, w, h, 10); g.clip(); if (grey > 0.01) g.filter = `grayscale(${grey.toFixed(2)})`;
    g.drawImage(im, 0, 0, im.naturalWidth, im.naturalWidth * ar, x, y, w, h); g.filter = 'none';
    if (ar < im.naturalHeight / im.naturalWidth - 0.02) { const fg = g.createLinearGradient(0, y + h - 60, 0, y + h); fg.addColorStop(0, 'rgba(255,255,255,0)'); fg.addColorStop(1, 'rgba(255,255,255,0.95)'); g.fillStyle = fg; g.fillRect(x, y + h - 60, w, 60); }
    g.restore(); }
  if (red > 0.01) { g.strokeStyle = `rgba(226,59,59,${0.85 * red})`; g.lineWidth = 4; rr(x - 10, y - 10, w + 20, h + 20, 18); g.stroke(); }
  g.restore(); return h + 20;
}
const SH_postH = (i, w, maxAR = 9) => { const P = SH_POSTS[((i % SH_POSTS.length) + SH_POSTS.length) % SH_POSTS.length]; return P && SH_ok(P.im) ? w * Math.min(maxAR, P.im.naturalHeight / P.im.naturalWidth) + 20 : w * 0.6; };
// a real logo / app icon (window.ICONS) with a soft shadow
function SH_icon(key, cx, cy, s, { op = 1, rot = 0 } = {}) { const im = SH_IM[key]; if (!SH_ok(im) || op <= 0.003) return; g.save(); g.globalAlpha *= op; g.translate(cx, cy); g.rotate(rot); sh(30, 14, 0.22); g.drawImage(im, -s / 2, -s / 2, s, s); noSh(); g.restore(); }

// ───────── small things that read well on his footage ─────────
// a sticky note (the BEFORE look: draw it under g.filter = 'grayscale(1)')
function SH_sticky(x, y, w, str, { k = 1, rot = -0.05, col = '#ecebe6' } = {}) {
  if (k <= 0.003) return; g.save(); g.globalAlpha *= clamp(k * 2); g.translate(x + w / 2, y + w / 2); g.rotate(rot); g.translate(-x - w / 2, -y - w / 2);
  g.fillStyle = col; sh(28, 16, 0.18); g.fillRect(x, y, w, w); noSh(); sh(4, 2, 0.12); g.fillRect(x, y, w, w); noSh();
  const gr = g.createLinearGradient(x, y + w * 0.8, x, y + w); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,0.05)'); g.fillStyle = gr; g.fillRect(x, y, w, w);
  g.fillStyle = 'rgba(0,0,0,0.04)'; g.fillRect(x, y, w, w * 0.12);
  str.split('\n').forEach((l, i) => writeOn(l, x + w / 2, y + w * 0.38 + i * w * 0.17, clamp(k * 1.6 - i * 0.25), { f: FMK(w * 0.105, 700), al: 'center', c: '#2b2b2e' }));
  g.restore();
}
// a blue pill with white text (e.g. "+ one more line") — the pin that pops above his head or at his fingertip
function SH_chip(label, { f = F(44, 700), bg = '#2f7cf6' } = {}) { const w = tw(label, f) + 70; g.fillStyle = bg; sh(30, 14, 0.3); rr(-w / 2, -45, w, 90, 45); g.fill(); noSh(); T(label, 0, 15, { f, c: '#fff', al: 'center' }); }
// the ring of a tap (his fingertip presses something), 0.45 s from t0
function SH_tapRing(x, y, t, t0, { r = 34, c = '255,255,255' } = {}) {
  const u = (t - t0) / 0.45; if (u < 0 || u > 1) return; const e = ease.expoOut(u);
  g.save(); g.strokeStyle = `rgba(${c},${0.9 * (1 - u)})`; g.lineWidth = 5 * (1 - u) + 1; g.beginPath(); g.arc(x, y, r * (0.4 + 1.3 * e), 0, 6.2832); g.stroke(); g.restore();
}
