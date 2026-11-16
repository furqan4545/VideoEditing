// scenes/rival.js — "Say you're building a coding app, and your biggest competitor is Cursor." (prefix RV_)
// Two app tiles on the paper: "Your app" (a plain code tile, blue = you) and "Your competitor": on "Cursor" Cursor's real
// app icon drops onto its empty tile with a little bounce (the fun bit: the tile shudders).
'use strict';
const RV = REG.K, RV_L = { x: RV.x + 70, y: RV.y + 420, w: 440, h: 600 }, RV_R = { x: RV.x + RV.w - 510, y: RV.y + 420, w: 440, h: 600 };
layer(40, 'rv-tiles', t => {
  if (t < T0('N2') - 1 || t > T0('M1') + 1 || !onScreen(RV.x, RV.y, RV.w, RV.h, 200)) return;
  const kL = seg(t, T0('N2') + 0.05, T0('N2') + 0.4), kR = seg(t, A_.tBiggest - 0.3, A_.tBiggest + 0.05);
  // your app
  if (kL > 0) { const p = pop(t, T0('N2') + 0.05); g.save(); g.globalAlpha *= p.op; g.translate(0, p.dy);
    plate(RV_L.x, RV_L.y, RV_L.w, RV_L.h, 40, { lift: 1.2 });
    const cx = RV_L.x + RV_L.w / 2; g.fillStyle = '#0d0d0f'; rr(cx - 115, RV_L.y + 80, 230, 230, 54); g.fill();
    T('</>', cx, RV_L.y + 225, { f: FM(84, 700), c: '#5aa2ff', al: 'center' });
    T('Your app', cx, RV_L.y + 420, { f: F(46, 700), al: 'center' }); T('a coding app', cx, RV_L.y + 478, { f: F(32, 400), c: C.mute, al: 'center', op: seg(t, A_.tCoding - 0.1, A_.tCoding + 0.2) });
    g.restore(); }
  // your competitor: an empty dashed slot, then Cursor's icon drops in
  if (kR > 0) { const p = pop(t, A_.tBiggest - 0.3), hitT = A_.tCursor + 0.02, shud = t > hitT ? Math.sin((t - hitT) * 40) * 6 * Math.exp(-(t - hitT) * 7) : 0;
    g.save(); g.globalAlpha *= p.op; g.translate(shud, p.dy); plate(RV_R.x, RV_R.y, RV_R.w, RV_R.h, 40, { lift: 1.2 });
    const cx = RV_R.x + RV_R.w / 2; g.setLineDash([14, 12]); g.strokeStyle = '#c9c7c0'; g.lineWidth = 4; rr(cx - 115, RV_R.y + 80, 230, 230, 54); g.stroke(); g.setLineDash([]);
    T('Your competitor', cx, RV_R.y + 420, { f: F(46, 700), al: 'center' });
    const kn = seg(t, A_.tCursor + 0.05, A_.tCursor + 0.3); T('Cursor', cx, RV_R.y + 478, { f: F(32, 500), c: C.ink2, al: 'center', op: kn });
    g.restore();
    // the icon falls from above and lands on "Cursor"
    const u = t - (A_.tCursor - 0.32); if (u > 0) { const fall = clamp(u / 0.32), y0 = RV_R.y - 900, y1 = RV_R.y + 195, bounce = u > 0.32 ? OM.spring(u - 0.32, 0.35, 22) : 0;
      const y = fall < 1 ? lerp(y0, y1, fall * fall) : y1 - 26 * Math.sin(Math.PI * clamp((u - 0.32) / 0.25)) * Math.exp(-(u - 0.32) * 4);
      SH_cursorIcon(cx + shud, y, 262, { rot: (1 - fall) * -0.3 }); } }
  // "vs" between them
  const kv = seg(t, A_.tBiggest, A_.tBiggest + 0.25); if (kv > 0) T('vs', RV.x + RV.w / 2, RV_L.y + 270, { f: FS(70, 600, true), c: C.mute, al: 'center', op: kv });
});
window.SFX_EVENTS = (window.SFX_EVENTS || []).concat([{ t: A_.tCursor, kind: 'hit', v: 0.8, note: 'Cursor icon lands' }]);
