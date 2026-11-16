// scenes/ali.js — Ali on his full-frame stage (prefix AL_). His vertical selfie fills STAGE; the camera frames it a little
// tight and low (camera.js `st`) so his chin sits above the captions. A grey BEFORE stretch (A_.tGreyIn → A_.tNow) greys
// everything on the stage, and the colour snaps back on A_.tNow. On pieces in CUT_IDS, things drawn by AL_BEHIND sit
// BEHIND him: his Apple Vision matte (film/cutout/<id>/NNNN.png, tools/cutout.py) is drawn over them.
'use strict';
const CUT_IDS = new Set(window.CUT_IDS || []);
// preload the cut-out of the frame too (same index as the footage frame)
{ const want0 = want; want = function (id, t) { const e = want0(id, t); if (!CUT_IDS.has(id)) return e; const key = 'cut:' + fkey(id, frameOf(id, t)); let c = IMG.get(key);
    if (!c) { const im = new Image(); im.src = 'cutout/' + fkey(id, frameOf(id, t)) + '.png'; c = { im, p: im.decode().catch(() => {}) }; IMG.set(key, c); } USED.push(key); return { im: e.im, p: Promise.all([e.p, c.p]) }; }; }
const AL_grey = t => seg(t, A_.tGreyIn - 0.2, A_.tGreyIn + 0.3) * (1 - seg(t, A_.tNow, A_.tNow + 0.06));
// take pixel (px, py) of his 1080x1920 frame → world point on the stage (pins, things behind him)
const AL_pt = (px, py) => [STAGE.x + px / 1080 * STAGE.w, STAGE.y + py / 1920 * STAGE.h];
aliCard = function (id, t, c, crop, { op = 1 } = {}) {
  if (op <= 0.003) return; const { x, y, w, h } = c, e = IMG.get(fkey(id, frameOf(id, t))), gr = AL_grey(t);
  g.save(); g.globalAlpha *= op;
  g.fillStyle = '#ffffff'; sh(80, 40, 0.22); rr(x - 14, y - 14, w + 28, h + 28, 44); g.fill(); noSh();
  g.save(); rr(x, y, w, h, 34); g.clip(); g.fillStyle = '#d9d9d9'; g.fillRect(x, y, w, h);
  if (gr > 0.01) g.filter = `grayscale(${gr.toFixed(3)}) brightness(${(1 - 0.05 * gr).toFixed(3)})`;   // the whole stage goes grey
  if (e && e.im.complete && e.im.naturalWidth) g.drawImage(e.im, x, y, w, h);
  if (CUT_IDS.has(id)) {   // things behind him, then his cut-out on top
    for (const fn of AL_BEHIND) fn(id, t);
    const ce = IMG.get('cut:' + fkey(id, frameOf(id, t))); if (ce && ce.im.complete && ce.im.naturalWidth) g.drawImage(ce.im, x, y, w, h);
  }
  g.filter = 'none';
  g.restore(); g.restore();
};
const AL_BEHIND = [];   // fn(id, t) in world space, drawn between his frame and his cut-out (only on CUT_IDS pieces)
// ───────── the hook pile: real posts fly in and pile up behind his head (reel 31) ─────────
// [take px x, take px y (centre), width px, rotation, from-direction]: around and behind his head (face ~ x 400-880,
// y 560-1320 in his take); the top band stays clear for the opening title until it fades at 2 s.
const AL_PILE = [[200, 700, 430, -0.10, -1], [930, 650, 430, 0.08, 1], [170, 1060, 400, 0.06, -1], [950, 1020, 400, -0.07, 1],
  [560, 430, 500, 0.03, 1], [250, 330, 440, 0.09, -1], [880, 300, 440, -0.06, 1], [640, 760, 480, -0.04, -1]];
const AL_ORDER = [0, 1, 2, 3, 4, 5, 6, 7];   // which POSTS land, in order
AL_BEHIND.push((id, t) => {
  if (!SH_POSTS.length || t < A_.tPile0 - 0.1 || t > A_.tPile1 + 3) return; const t0 = A_.tPile0, dt = (A_.tPile1 - t0) / AL_PILE.length;
  AL_PILE.forEach(([px, py, pw, rot, dir], i) => { const u = t - (t0 + i * dt); if (u < 0) return;
    const sp = OM.spring(u, 0.55, 15), [wx, wy] = AL_pt(px, py), w = pw / 1080 * STAGE.w, hgt = SH_postH(AL_ORDER[i], w, 0.62);
    g.save(); g.translate(wx + dir * 1100 * (1 - sp), wy - 300 * (1 - sp)); g.rotate(rot + dir * 0.5 * (1 - sp)); g.translate(-w / 2, -hgt / 2);
    SH_post(AL_ORDER[i], 0, 0, w, { op: clamp(u * 6), lift: 1.3, maxAR: 0.62 }); g.restore(); });
});
