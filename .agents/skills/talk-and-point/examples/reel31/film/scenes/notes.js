// scenes/notes.js — "the best part" (prefix NT_): the same blue message on the paper gets one more line typed at its end
// ("Save this list in your notes."), then the bot's notes file (Bot Settings → Memory → MEMORY.md, OpenMausBot's real
// memory file) holds this week's five; next Monday the five are already there (grey) and only one line is new: a blue
// NEW tag lands on it. Then the BEFORE / AFTER side by side for the close.
'use strict';
const NT = REG.N, NT_MSG = AP_MSG, NT_ADD = 'Save this list in your notes.';
const NT_BUB = { x: NT.x + 60, y: NT.y + 120, w: NT.w - 120 };
function NT_typedAdd(t) {   // the added line, typed as he says it (words of piece ADD_ID after "line")
  const s = SEG[ADD_ID]; if (!s || t < A_.tSaveW) return ''; const ws = NT_ADD.split(' '); const his = s.words.filter(w => w[1] >= A_.tSaveW - 0.02);
  let n = 0, part = ''; for (let i = 0; i < ws.length; i++) { const w = his[Math.min(i, his.length - 1)], a = w ? w[1] : A_.tSaveW + i * 0.2, b = w ? Math.max(w[2], a + 0.1) : a + 0.2;
    if (t >= b) { n = i + 1; continue; } if (t >= a) part = ws[i].slice(0, Math.ceil(ws[i].length * clamp((t - a) / (b - a)))); break; }
  return ws.slice(0, n).join(' ') + (part ? (n ? ' ' : '') + part : '');
}
layer(40, 'nt-message', t => {
  if (t < A_.tNotesIn - 1 || t > A_.tNotesOut + 1 || !onScreen(NT_BUB.x, NT_BUB.y, NT_BUB.w, 700, 200)) return;
  const k = seg(t, A_.tNotesIn - 0.3, A_.tNotesIn + 0.1); if (k <= 0) return;
  const f = F(36, 400), lh = 50, maxW = NT_BUB.w - 64, lines = SH_wrap(NT_MSG, f, maxW), add = NT_typedAdd(t), addL = add ? SH_wrap(add, F(36, 600), maxW) : [];
  const h = 40 + (lines.length + (add ? addL.length : 0)) * lh + (add ? 18 : 0); const { x, y, w } = NT_BUB;
  g.save(); g.globalAlpha *= k; sh(50, 26, 0.25); const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, '#3f86ff'); gr.addColorStop(1, '#1f5fe6'); g.fillStyle = gr; rr(x, y, w, h, 36); g.fill(); noSh();
  lines.forEach((l, i) => T(l, x + 32, y + 22 + (i + 0.78) * lh, { f, c: 'rgba(255,255,255,0.78)' }));
  if (add) { const y0 = y + 22 + lines.length * lh + 18; g.fillStyle = 'rgba(255,255,255,0.22)'; rr(x + 20, y0 - 6, w - 40, addL.length * lh + 12, 14); g.fill();
    addL.forEach((l, i) => T(l, x + 32, y0 + (i + 0.78) * lh, { f: F(36, 600), c: '#fff' }));
    if (t < T1(ADD_ID) + 0.3 && Math.floor(QT * 2.4) % 2 === 0) { const last = addL[addL.length - 1]; g.fillStyle = '#fff'; g.fillRect(x + 36 + tw(last, F(36, 600)), y0 + (addL.length - 1) * lh + 6, 3, 42); } }
  T('+ one more line', x + w - 24, y - 22, { f: FH(40), c: C.ink2, al: 'right', op: seg(t, A_.tOneMore - 0.1, A_.tOneMore + 0.3) });
  g.restore();
});
// the notes file: this week's five, then next Monday: the same five (grey, already known) + one NEW line
layer(40, 'nt-notes', t => {
  const N = NOTES_CARD; if (t < A_.tNotesIn - 1 || t > A_.tNotesOut + 1 || !onScreen(N.x, N.y, N.w, N.h, 200)) return;
  const k = seg(t, A_.tNotesFile - 0.2, A_.tNotesFile + 0.25); if (k <= 0) return; const p = pop(t, A_.tNotesFile - 0.2);
  const rows = TOP5.map(r => r[0]); const nextMon = seg(t, A_.tNextMon - 0.1, A_.tNextMon + 0.3);
  const weeks = [{ head: '## Cursor complaints · Mon 9 Nov', rows: rows.map(r => [r, { seen: nextMon > 0.5 }]) }];
  if (nextMon > 0) weeks.push({ head: '## Mon 16 Nov · only what’s new', rows: [[NEW_COMPLAINT, { neu: seg(t, A_.tNew - 0.05, A_.tNew + 0.35) }]] });
  g.save(); g.translate(0, p.dy); g.globalAlpha *= clamp(k * 1.5);
  SH_notes(N.x, N.y, N.w, N.h, { weeks, gauge: '7 of 200 lines', kRow: (i, j) => i === 0 ? seg(t, A_.tNotesFile + 0.1 + Math.max(0, j) * 0.06, A_.tNotesFile + 0.4 + Math.max(0, j) * 0.06) : nextMon });
  g.restore();
  // a ring around the new line as the tag lands
  if (t > A_.tNew - 0.1) SH_tapRing(N.x + N.w - 120, NT_newY(), t, A_.tNew, { r: 60, c: '47,124,246' });
});
const NT_newY = () => NOTES_CARD.y + 150 + 58 + TOP5.length * 52 + 30 + 58 - 9;
// ───────── the close: BEFORE (grey) and AFTER (the list) side by side ─────────
layer(40, 'nt-split', t => {
  const S = REG.S; if (t < A_.tSplit - 1 || t > A_.tSplitOut + 1 || !onScreen(S.x, S.y, S.w, S.h, 200)) return;
  const kL = seg(t, A_.tSplit - 0.2, A_.tSplit + 0.25), kR = seg(t, A_.tSplitR - 0.2, A_.tSplitR + 0.25);
  const L = { x: S.x + 40, y: S.y + 260, w: 470, h: 900 }, R = { x: S.x + S.w - 510, y: S.y + 260, w: 470, h: 900 };
  if (kL > 0) { g.save(); g.globalAlpha *= kL; g.filter = 'grayscale(1)'; plate(L.x, L.y, L.w, L.h, 30, { fill: '#f7f6f2' });
    T('BEFORE', L.x + L.w / 2, L.y - 34, { f: F(34, 700), c: '#8a8a90', al: 'center' });
    SH_sticky(L.x + 70, L.y + 60, 330, 'What do we\nbuild next?', { k: 1, rot: -0.05 });
    T('3 survey answers', L.x + L.w / 2, L.y + 520, { f: F(30, 500), c: C.ink2, al: 'center' }); T('“idk”', L.x + L.w / 2, L.y + 580, { f: FS(40, 500, true), c: '#8a8a90', al: 'center' });
    T('?', L.x + L.w / 2, L.y + 800, { f: FS(190, 600, true), c: '#b0b0b4', al: 'center' }); g.filter = 'none'; g.restore(); }
  if (kR > 0) { g.save(); g.globalAlpha *= kR; plate(R.x, R.y, R.w, R.h, 30, { fill: MB.bg, line: false, lift: 1.3 });
    T('AFTER', R.x + R.w / 2, R.y - 34, { f: F(34, 700), c: MB.blue, al: 'center' });
    MB_avatar(R.x + 50, R.y + 56, 40); T('Every Monday', R.x + 84, R.y + 66, { f: F(26, 600), c: MB.txt });
    TOP5.forEach(([lab], i) => { const y = R.y + 130 + i * 146; g.fillStyle = i === 0 ? MB.blue : '#2a2a2c'; rr(R.x + 24, y, R.w - 48, 126, 18); g.fill();
      SH_wrap(lab, F(25, 600), R.w - 100).slice(0, 2).forEach((l, j) => T(l, R.x + 46, y + 46 + j * 32, { f: F(25, 600), c: '#fff' }));
      T('🔗 link', R.x + 46, y + 108, { f: F(20, 500), c: i === 0 ? '#dbe8ff' : MB.link }); });
    g.restore(); }
});
window.SFX_EVENTS = (window.SFX_EVENTS || []).concat([{ t: A_.tNew, kind: 'hit', v: 0.8, note: 'NEW tag' }, { t: A_.tSplit, kind: 'whoosh', v: 0.6, note: 'before/after' }]);
