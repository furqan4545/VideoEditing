// scenes/demo.js — a tiny scene that shows the conventions (prefix DM_). Delete it when your scenes exist.
//  · every top-level name has the file's prefix · draw through layer(z, name, fn) · return early off screen / off time
//  · times come from A_ (story.js) · sound moments go in SFX_EVENTS · a preview view goes in VIEW_REG · CAMERA NOTES below
'use strict';
function DM_counter(x, y, n, k) {                      // a number that rolls into place, digit by digit
  const s = String(n), f = F(120, 600); let cx = x;
  for (let i = 0; i < s.length; i++) { const ch = s[i], w = tw(ch, f), r = clamp(k * 1.4 - i * 0.12); g.save(); g.beginPath(); g.rect(cx - 4, y - 112, w + 8, 140); g.clip();
    T(ch, cx, y + (1 - ease.expoOut(r)) * 120, { f, op: r }); g.restore(); cx += w; }
}
layer(30, 'dm-card', t => {                            // A · a white card lying on the paper, its number rolls in on "hook"
  if (!onScreen(CARD.x, CARD.y, CARD.w, CARD.h, 200)) return; const p = pop(t, A_.tHook + 0.2);
  g.save(); g.globalAlpha *= p.op; g.translate(0, p.dy); plate(CARD.x, CARD.y, CARD.w, CARD.h, 36, { lift: 1.1 });
  T('a component on the paper', CARD.x + 60, CARD.y + 100, { f: F(34, 600) }); T('white card · two-layer shadow · hairline', CARD.x + 60, CARD.y + 148, { f: F(26, 400), c: C.mute });
  DM_counter(CARD.x + 60, CARD.y + 400, 1204312, seg(t, A_.tHook + 0.3, A_.tHook + 1.6)); g.fillStyle = C.blue; rr(CARD.x + 60, CARD.y + 470, 220, 12, 6); g.fill(); g.restore();
});
layer(30, 'dm-device', t => {                          // B · a device: seen whole first, then the camera dives to one part, then pulls back
  if (!onScreen(DEV.x, DEV.y, DEV.w, DEV.h, 200)) return;
  plate(DEV.x, DEV.y, DEV.w, DEV.h, 44, { fill: '#141416', lift: 1.4, line: false });
  for (let i = 0; i < 4; i++) { const y = DEV.y + 90 + i * 130; g.fillStyle = '#222226'; rr(DEV.x + 60, y, DEV.w - 120, 96, 18); g.fill();
    const on = i === 2 && t > A_.tTime; g.fillStyle = on ? C.blue : '#3a3a40'; g.beginPath(); g.arc(DEV.x + DEV.w - 110, y + 48, 13, 0, 6.2832); g.fill();
    T(`unit ${i + 1}`, DEV.x + 100, y + 60, { f: FM(30, 500), c: on ? '#fff' : '#8a8a90' }); }
  T('every value is f(t)', DEV.x + DEV.w - 150, DEV.y + 90 + 2 * 130 + 58, { f: FM(9, 600), c: '#fff', al: 'right', op: sstep(A_.tTime, A_.tTime + 0.3, t) });   // tiny: only readable in the close-up
});
// CAMERA NOTES (tight clock): hook wide [0, 540, 760, 1.0, {fy: 760}] · whip to B [A_.tFrame - 0.1, DEV centre, 1.0, X, hit 3]
// · dive to the lit unit [A_.tTime + 0.1, DEV.x + DEV.w - 160, DEV.y + 400, 4.0, X] · pull back to the whole device [A_.tTravels, ..., 0.9, X]
VIEW_REG['dm-all'] = { keys: [[0, 540, 760, 1.0, { fy: 760 }], [A_.tFrame - 0.1, DEV.x + DEV.w / 2, DEV.y + DEV.h / 2, 1.0, { curve: ease.expoInOut, hit: 3 }],
  [A_.tTime + 0.15, DEV.x + DEV.w - 160, DEV.y + 400, 4.0, { curve: ease.expoInOut }], [A_.tCamera, DEV.x + DEV.w - 160, DEV.y + 402, 4.2, { curve: ease.sineInOut }],
  [A_.tTravels, DEV.x + DEV.w / 2, DEV.y + DEV.h / 2, 0.9, { curve: ease.expoInOut }]] };
window.SFX_EVENTS = (window.SFX_EVENTS || []).concat([
  { t: A_.tFrame - 0.1, kind: 'whoosh', v: 1, note: 'demo: whip to the device' }, { t: A_.tTime + 0.15, kind: 'hit', v: 1, note: 'demo: land in the close-up' },
]);
