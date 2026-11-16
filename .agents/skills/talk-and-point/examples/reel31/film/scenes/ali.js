// scenes/ali.js — Ali on his full-frame stage (prefix AL_). His vertical selfie fills STAGE (a card a little bigger than the
// screen, so the camera's subtle zoom 1.00-1.045 and the punch-ins never show an edge). The BEFORE part is grey; on "Now"
// the colour snaps back. In the hook, real angry posts fly in and pile up BEHIND his head (his matte from Apple Vision:
// film/cutout/H/NNNN.png drawn over the posts). Things he points at are drawn by scenes/finger.js from his tracked fingertip.
'use strict';
const CUT_IDS = new Set(window.CUT_IDS || []);
// preload the cut-out of the frame too (same index as the footage frame)
{ const want0 = want; want = function (id, t) { const e = want0(id, t); if (!CUT_IDS.has(id)) return e; const key = 'cut:' + fkey(id, frameOf(id, t)); let c = IMG.get(key);
    if (!c) { const im = new Image(); im.src = 'cutout/' + fkey(id, frameOf(id, t)) + '.png'; c = { im, p: im.decode().catch(() => {}) }; IMG.set(key, c); } USED.push(key); return { im: e.im, p: Promise.all([e.p, c.p]) }; }; }
// how grey his picture is (BEFORE) at tight time t
const AL_grey = t => seg(t, A_.tGreyIn - 0.2, A_.tGreyIn + 0.3) * (1 - seg(t, A_.tNow, A_.tNow + 0.06));
// take pixel (px, py) of the 1080x1920 frame → world point on the stage
const AL_pt = (px, py) => [STAGE.x + px / 1080 * STAGE.w, STAGE.y + py / 1920 * STAGE.h];
aliCard = function (id, t, c, crop, { op = 1 } = {}) {
  if (op <= 0.003) return; const { x, y, w, h } = c, e = IMG.get(fkey(id, frameOf(id, t))), gr = AL_grey(t);
  g.save(); g.globalAlpha *= op;
  g.fillStyle = '#ffffff'; sh(80, 40, 0.22); rr(x - 14, y - 14, w + 28, h + 28, 44); g.fill(); noSh();
  g.save(); rr(x, y, w, h, 34); g.clip(); g.fillStyle = '#d9d9d9'; g.fillRect(x, y, w, h);
  if (gr > 0.01) g.filter = `grayscale(${gr.toFixed(3)}) brightness(${(1 - 0.05 * gr).toFixed(3)})`;   // the whole stage goes grey (him, the posts behind him)
  if (e && e.im.complete && e.im.naturalWidth) g.drawImage(e.im, x, y, w, h);
  if (CUT_IDS.has(id)) {   // things behind him, then his cut-out on top
    AL_behind(id, t);
    const ce = IMG.get('cut:' + fkey(id, frameOf(id, t))); if (ce && ce.im.complete && ce.im.naturalWidth) g.drawImage(ce.im, x, y, w, h);
  }
  g.filter = 'none';
  g.restore(); g.restore();
};
// ───────── the hook: real angry posts fly in behind his head and pile up ─────────
// [take px x, take px y (centre), width px, rotation, from-direction] — around and behind his head, the top band kept clear
// for the opening title until it fades (2 s)
const AL_PILE = [[200, 700, 430, -0.10, -1], [930, 650, 430, 0.08, 1], [170, 1060, 400, 0.06, -1], [950, 1020, 400, -0.07, 1],
  [560, 430, 500, 0.03, 1], [250, 330, 440, 0.09, -1], [880, 300, 440, -0.06, 1], [640, 760, 480, -0.04, -1]];
const AL_ORDER = [3, 0, 6, 9, 8, 7, 13, 1];   // which real posts land, in order (by index in POSTS)
function AL_behind(id, t) {
  if (id !== 'H' && id !== 'B1') return; const t0 = A_.tPile0, dt = (A_.tPile1 - t0) / AL_PILE.length;
  AL_PILE.forEach(([px, py, pw, rot, dir], i) => { const ti = t0 + i * dt, u = t - ti; if (u < 0) return;
    const sp = OM.spring(u, 0.55, 15), [wx, wy] = AL_pt(px, py), w = pw / 1080 * STAGE.w, hgt = SH_postH(AL_ORDER[i], w, 0.62);
    const fx = wx + dir * 1100 * (1 - sp), fy = wy - 300 * (1 - sp);
    g.save(); g.translate(fx, fy); g.rotate(rot + dir * 0.5 * (1 - sp)); g.translate(-w / 2, -hgt / 2); SH_post(AL_ORDER[i], 0, 0, w, { op: clamp(u * 6), lift: 1.3, maxAR: 0.62 }); g.restore(); });
}
