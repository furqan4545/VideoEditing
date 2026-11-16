// scenes/demo.js — one animation place on the paper desk (prefix DM_), to show the conventions. Replace with your film's
// places (reel 31: before.js = the grey BEFORE desk + the wall of posts, rival.js = "your competitor", app.js = the tool's
// chat, notes.js = the notes file + the BEFORE / AFTER split). Each place: draw only when on screen and in its time window,
// times from A_, a // CAMERA NOTES line, SFX proposals in SFX_EVENTS.
'use strict';
const DM = REG.A;
layer(40, 'dm-card', t => {
  if (t < T0('S1') - 1 || t > T0('S2') + 1 || !onScreen(DM.x, DM.y, DM.w, DM.h, 200)) return;
  const p = pop(t, T0('S1') + 0.1); g.save(); g.globalAlpha *= p.op; g.translate(0, p.dy);
  plate(DM.x + 80, DM.y + 260, DM.w - 160, 760, 40, { fill: '#0b0b0c', lift: 1.5, line: false });   // a dark app card on white paper
  T('Every frame', DM.x + 150, DM.y + 420, { f: F(64, 700), c: '#f2f2f3' });
  T('is a function of time', DM.x + 150, DM.y + 500, { f: F(44, 500), c: '#9c9ca2' });
  const k = seg(t, A_.tTime - 0.2, A_.tTime + 0.3); g.fillStyle = '#2f7cf6'; rr(DM.x + 150, DM.y + 620, (DM.w - 300) * ease.expoOut(k), 22, 11); g.fill();
  g.restore();
});
// CAMERA NOTES: whip in at T0('S1') + 0.08 to the card centre (zoom ~0.95), slow push, whip back to his stage at T0('S2').
window.SFX_EVENTS = (window.SFX_EVENTS || []).concat([{ t: T0('S1'), kind: 'whoosh', v: 1, note: 'whip to the card' }]);
