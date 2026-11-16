// camera.js — the master camera (TIGHT clock) and Ali's stage pieces. Face → animation → face: every place change is a
// whip (expoInOut + a landing shake), each one starting ~0.3 s before the line ends and landing just after the next starts.
// On Ali the zoom never stops (st: 1.00 ↔ 1.045 of his base frame, turning at each beat) plus sudden punch-ins (face).
// His base frame is a little tighter than the full take and set low, so his chin sits above the captions (screen y ~1270).
'use strict';
const CS = ease.sineInOut, CX = ease.expoInOut, CO = ease.expoOut;
const SZ = Z0 * 1.08;                                                         // his base frame (k = 1)
const st = (t, k, o = {}) => [t, 540, 1035, SZ * k, o];                      // base frame, k = 1.00 .. 1.045
const face = (t, k, o = {}) => [t, 540, 1000, Z0 * k, o];                   // punch-in on his face, k = 1.10 .. 1.25
const at = (t, x, y, z, o = {}) => [t, x, y, z, o];
// places
const CC = AP_COLX + AP_CW / 2, CHAT = (t, z, o = {}) => at(t, CC, APP.y + 620, z, { fy: 760, ...o });
const LIST = (t, z, dy = 0, o = {}) => at(t, CC, AP_Y('list', t) + 300 + dy, z, { fy: 600, ...o });   // fy 600: the window's bottom edge stays above the captions
const RV_C = (t, z, o = {}) => at(t, REG.K.x + REG.K.w / 2, REG.K.y + 720, z, o);
const BF_C = (t, y, z, o = {}) => at(t, REG.B.x + 600, REG.B.y + y, z, o);
const L2_TO_ALI = Wd('L2', 'why') - 0.05;                                    // row 8 leaves the list for his face here
const SPLIT_OUT = Wd('C1b', 'competitor') - 0.02;                            // the close leaves BEFORE / AFTER for his face here
const CAM_KEYS = () => {
  const K = [];
  // ── hook: punch-in on "steal" while the posts pile up behind him
  K.push(st(-1, 1.0), st(Wd('H', 'steal') - 0.1, 1.02, { curve: CS }), face(Wd('H', 'steal') + 0.1, 1.14, { curve: CO, hit: 2 }), face(T1('H') - 0.25, 1.17, { curve: CS }));
  // ── B1: grey comes in, he pulls back; the sticky note on his hand
  K.push(st(T0('B1') + 0.3, 1.035, { curve: CX }), st(T1('B1') - 0.32, 1.0, { curve: CS }));
  // ── whip to the grey desk: note + friends, down to the survey, the question mark
  K.push(BF_C(T0('B2a') + 0.08, 700, 1.0, { curve: CX, hit: 3 }), BF_C(Wd('B2b', 'survey') - 0.25, 1200, 1.0, { curve: CX }),
    BF_C(Wd('B2c', 'hope') - 0.1, 1060, 0.97, { curve: CX }), BF_C(T1('B2c') - 0.32, 1050, 0.98, { curve: CS }));
  // ── back to him; then the wall: pull back while the posts multiply, too big to read
  K.push(st(T0('B3a') + 0.08, 1.0, { curve: CX, hit: 3 }), st(T0('B3a') + 0.5, 0.995, { curve: CS }), [T1('B3b') - 0.02, 540, 960, 0.2, { curve: ease.cubicIn }]);
  // ── "Now": the dive back into his face, colour snaps on
  K.push(face(T0('N1a') + 0.35, 1.12, { curve: CX, hit: 3 }), face(T1('N1a') - 0.25, 1.08, { curve: CS }));
  K.push(st(T0('N1b') + 0.28, 1.0, { curve: CX }), st(T1('N1b') - 0.32, 1.04, { curve: CS }));
  // ── whip to "your app vs your competitor"
  K.push(RV_C(T0('N2') + 0.08, 0.92, { curve: CX, hit: 3 }), RV_C(Wd('N2', 'cursor') + 0.05, 0.95, { curve: CS }), RV_C(T1('N2') - 0.32, 0.96, { curve: CS }));
  // ── into OpenMausBot: the whole window on "Make a bot", then the chat for the message
  K.push(at(T0('M1') + 0.1, APP.x + APP.w / 2, APP.y + APP.h / 2, 0.66, { curve: CX, hit: 2, fy: 880 }), at(T1('M1') - 0.3, APP.x + APP.w / 2 + 30, APP.y + APP.h / 2, 0.69, { curve: CS, fy: 880 }));
  K.push(CHAT(T0('M2a') + 0.12, 1.0, { curve: CX }), CHAT(T1('M2c') - 0.3, 1.03, { curve: CS }));
  // ── sent → to him: "Keep your laptop awake" (the switch under his fingertip)
  K.push(st(T0('M3a') + 0.1, 1.0, { curve: CX, hit: 3 }), st(T1('M3a') - 0.3, 1.035, { curve: CS }));
  // ── back to the chat: "Every Monday" becomes the card, the run, the list lands; then into the top rows
  K.push(CHAT(T0('M3b') + 0.08, 1.0, { curve: CX, hit: 3 }), CHAT(A_.tListIn - 0.1, 1.02, { curve: CS }),
    LIST(A_.tListIn + 0.45, 1.06, 0, { curve: CX }), LIST(A_.tLit + 0.1, 1.15, -140, { curve: CX }), LIST(L2_TO_ALI - 0.3, 1.17, -140, { curve: CS }));
  // ── "why someone would switch to you": his face, the customers hop to him
  K.push(st(L2_TO_ALI + 0.08, 1.0, { curve: CX, hit: 3 }), st(T1('L2') - 0.1, 1.04, { curve: CS }));
  // ── "Here's the first trick": punch-in
  K.push(face(Wd('K1', 'trick') - 0.03, 1.16, { curve: CO, hit: 2 }));
  // ── a finger taps the top link → the real thread opens
  K.push(LIST(T0('K2') + 0.1, 1.08, -140, { curve: CX, hit: 3 }), LIST(A_.tThread + 0.05, 1.1, -140, { curve: CS }),
    at(A_.tThread + 0.55, THREAD_C[0], THREAD_C[1], 0.98, { curve: CX, fy: 900 }), at(T1('K2') - 0.3, THREAD_C[0], THREAD_C[1] - 20, 1.02, { curve: CS, fy: 900 }));
  // ── "And here's the best part": back to him, sudden zoom on "best" (the music drops out)
  K.push(st(T0('P1') + 0.06, 1.0, { curve: CX, hit: 3 }), face(Wd('P1', 'best') - 0.02, 1.24, { curve: CO, hit: 3 }), face(T1('P1') - 0.05, 1.25, { curve: CS }));
  K.push(st(T0('P2a') + 0.22, 1.01, { curve: CX }), st(T1('P2a') - 0.3, 1.035, { curve: CS }));
  // ── the message gets one more line, then the notes file with the NEW line
  K.push(at(T0('P2b') + 0.12, NT_BUB.x + NT_BUB.w / 2, NT_BUB.y + 230, 1.06, { curve: CX, hit: 3 }), at(T1('P2b') - 0.3, NT_BUB.x + NT_BUB.w / 2, NT_BUB.y + 250, 1.09, { curve: CS }));
  K.push(at(T0('P3') + 0.15, NOTES_CARD.x + NOTES_CARD.w / 2, NOTES_CARD.y + 380, 0.98, { curve: CX, fy: 900 }), at(T1('P3') - 0.28, NOTES_CARD.x + NOTES_CARD.w / 2 + 30, NOTES_CARD.y + 420, 1.06, { curve: CS, fy: 900 }));
  // ── the close: BEFORE / AFTER side by side, then back on his face, punch on "begging"
  K.push(at(T0('C1a') + 0.08, REG.S.x + REG.S.w / 2, REG.S.y + 760, 0.97, { curve: CX, hit: 3 }), at(SPLIT_OUT - 0.32, REG.S.x + REG.S.w / 2, REG.S.y + 760, 1.0, { curve: CS }));
  K.push(st(SPLIT_OUT + 0.08, 1.0, { curve: CX, hit: 3 }), st(Wd('C1b', 'begging') - 0.12, 1.03, { curve: CS }), face(Wd('C1b', 'begging') + 0.08, 1.12, { curve: CO, hit: 2 }), face(T1('C1b') - 0.05, 1.13, { curve: CS }));
  // ── CTA on his face, slow push
  K.push(st(T0('C2') + 0.3, 1.0, { curve: CX }), st(DUR + 1, 1.045, { curve: CS }));
  for (let i = 1; i < K.length; i++) if (K[i][0] <= K[i - 1][0] + 0.02) console.error('camera keys out of order at', i, K[i - 1][0].toFixed(2), K[i][0].toFixed(2));
  return K;
};
// Ali's stage: every piece shown on STAGE while the camera can see it
const ALI_IDS = VO.segs.map(s => s.id);
startFilm({
  aliShow: ALI_IDS.map((id, i) => ({ id, t0: i ? T0(id) : -1, t1: i < ALI_IDS.length - 1 ? T0(ALI_IDS[i + 1]) : DUR + 2, c: STAGE, crop: { sx: 0, sy: 0, sw: 1080 } })),
  keys: CAM_KEYS,
});
