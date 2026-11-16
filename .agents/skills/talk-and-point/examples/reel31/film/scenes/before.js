// scenes/before.js — the BEFORE world, grey and slow (prefix BF_): a sticky note "What do we build next?", a few friends'
// shrugging replies, a survey with only three answers, a big question mark and crossed fingers. Then the wall: real
// angry posts about Cursor multiply around Ali's card until the wall is too big to read.
'use strict';
const BF = REG.B;
layer(30, 'bf-props', t => {
  if (t < A_.tBefore - 1 || t > A_.tBeforeOut + 1 || !onScreen(BF.x, BF.y, BF.w, BF.h, 300)) return;
  g.save(); g.filter = 'grayscale(1)';
  // sticky note on "guess what to build next"
  SH_sticky(BF.x + 300, BF.y + 170, 560, 'What do we\nbuild next?', { k: seg(t, A_.tGuess - 0.15, A_.tGuess + 0.9), rot: -0.04 });
  // friends: three shrugging replies on "ask a few friends"
  const fr = [['dark mode? 🤷', 0, false], ['idk, AI maybe', 0.25, true], ['looks good bro 👍', 0.5, false]];
  fr.forEach(([s, d, right], i) => { const x = right ? BF.x + BF.w - 120 : BF.x + 120 + i * 30; SH_paperBubble(x, BF.y + 780 + i * 104, s, { k: seg(t, A_.tFriends + d - 0.2, A_.tFriends + d + 0.2), right, f: F(42, 400) }); });
  // the survey: three answers only
  SH_survey(BF.x + 110, BF.y + 1150, 980, { k: seg(t, A_.tSurvey - 0.15, A_.tSurvey + 0.7), answers: ['make it faster?', 'dark mode', 'idk'] });
  g.filter = 'none'; g.restore();
  // the big question mark + crossed fingers on "hope", a slow wobble (the fun bit)
  const kq = seg(t, A_.tHope - 0.1, A_.tHope + 0.25); if (kq > 0) { const sp = OM.spring(t - A_.tHope + 0.1, 0.45, 14), wob = Math.sin((t - A_.tHope) * 5) * 0.06 * Math.exp(-(t - A_.tHope) * 1.2);
    g.save(); g.translate(BF.x + BF.w - 230, BF.y + 560); g.rotate(0.12 + wob); g.scale(sp, sp); T('?', 0, 120, { f: FS(380, 600, true), c: '#9a9a9f', al: 'center' }); g.restore();
    const kf = seg(t, A_.tRight - 0.2, A_.tRight + 0.2); if (kf > 0) { g.save(); g.globalAlpha *= kf; g.filter = 'grayscale(1)'; g.translate(BF.x + BF.w - 260, BF.y + 830); g.scale(0.8 + 0.2 * OM.spring(t - A_.tRight + 0.2, 0.4, 16), 0.8 + 0.2 * OM.spring(t - A_.tRight + 0.2, 0.4, 16)); T('🤞', 0, 0, { f: F(150, 400), al: 'center' }); g.filter = 'none'; g.restore(); } }
});
// ───────── the wall: real posts multiply around Ali's card (row 3) and stay as a pile behind him ─────────
// slots on a loose grid around STAGE, filled in order of distance from his card; each lands with a small spring
const BF_SLOTS = (() => { const R = OM.rng(31), S = [], cw = 760;
  for (let gy = -7; gy <= 8; gy++) for (let gx = -6; gx <= 7; gx++) { const x = STAGE.x + STAGE.w / 2 + (gx - 0.5) * (cw + 80) + (R() - 0.5) * 140, y = STAGE.y + STAGE.h / 2 + (gy - 0.5) * 860 + (R() - 0.5) * 160;
    const d = Math.hypot((x - STAGE.x - STAGE.w / 2) / 1.0, (y - STAGE.y - STAGE.h / 2) / 1.6); if (Math.abs(x - STAGE.x - STAGE.w / 2) < 700 && Math.abs(y - STAGE.y - STAGE.h / 2) < 1100) continue;
    S.push({ x: x - cw / 2, y: y - 400, w: cw, rot: (R() - 0.5) * 0.16, d, i: S.length + Math.floor(R() * 7) }); }
  S.sort((a, b) => a.d - b.d); return S; })();
function BF_wallCount(t) { const u = seg(t, A_.tWall0, A_.tWall1); return Math.floor(BF_SLOTS.length * Math.pow(u, 1.6)); }
layer(45, 'bf-wall', t => {
  if (t < A_.tWall0 - 0.2 || t > A_.tWallGone + 0.5) return; const n = BF_wallCount(t), gone = seg(t, A_.tWallGone - 0.4, A_.tWallGone);
  const grey = 1 - seg(t, A_.tNow, A_.tNow + 0.08);
  for (let k = 0; k < n; k++) { const s = BF_SLOTS[k], tk = A_.tWall0 + Math.pow(k / BF_SLOTS.length, 1 / 1.6) * (A_.tWall1 - A_.tWall0); if (!onScreen(s.x, s.y, s.w, 900, 100)) continue;
    const sp = OM.spring(t - tk, 0.6, 16), op = clamp((t - tk) * 8) * (1 - gone);
    g.save(); g.translate(s.x + s.w / 2, s.y + 400); g.scale(0.7 + 0.3 * sp, 0.7 + 0.3 * sp); g.translate(-s.x - s.w / 2, -s.y - 400);
    SH_post(s.i, s.x, s.y, s.w, { op, rot: s.rot, grey: grey * 0.85, maxAR: 1.0 }); g.restore(); }
});
// CAMERA NOTES: BEFORE place wide (zoom ~0.95 on BF centre), slow drift down from the note to the survey; the wall = pull
// back from Ali's full frame (STAGE) to zoom ~0.22 over row 3, then the push back into his face on "Now".
window.SFX_EVENTS = (window.SFX_EVENTS || []).concat([{ t: A_.tGuess, kind: 'whoosh', v: 0.5, note: 'into BEFORE' }, { t: A_.tWall0, kind: 'riser', v: 0.6, note: 'wall grows' }]);
