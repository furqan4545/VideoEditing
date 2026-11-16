// camera.js — the master camera (TIGHT clock) and his stage pieces. Face → animation place → face: every place change is
// a whip (expoInOut + a landing shake) that starts ~0.3 s before a line ends and lands ~0.08 s after the next starts.
// On his stage the zoom never stops (st: k 1.00 ↔ 1.045, turning at each beat) plus sudden punch-ins on key words (face).
'use strict';
const CS = ease.sineInOut, CX = ease.expoInOut, CO = ease.expoOut;
const SZ = Z0 * 1.08;                                                         // his base frame (k = 1): a little tight, set low,
const st = (t, k, o = {}) => [t, 540, 1035, SZ * k, o];                      // so his chin sits above the captions (no edge for k >= 1)
const face = (t, k, o = {}) => [t, 540, 1000, Z0 * k, o];                   // punch-in on his face, k = 1.10 .. 1.25 (k >= 1.03 shows no edge)
const at = (t, x, y, z, o = {}) => [t, x, y, z, o];                          // a place on the desk (o.fy: screen y of that point)
const CAM_KEYS = () => {
  const K = [];
  // hook: base frame, sudden punch-in on the key word
  K.push(st(-1, 1.0), st(A_.tHook - 0.1, 1.02, { curve: CS }), face(A_.tHook + 0.1, 1.15, { curve: CO, hit: 2 }), face(T1('H') - 0.3, 1.17, { curve: CS }));
  // whip to the animation place, slow push while he talks over it
  K.push(at(T0('S1') + 0.08, REG.A.x + REG.A.w / 2, REG.A.y + 640, 0.95, { curve: CX, hit: 3 }), at(T1('S1') - 0.3, REG.A.x + REG.A.w / 2, REG.A.y + 650, 1.0, { curve: CS }));
  // whip back to him; slow zoom to the end
  K.push(st(T0('S2') + 0.08, 1.0, { curve: CX, hit: 3 }), st(DUR + 1, 1.045, { curve: CS }));
  for (let i = 1; i < K.length; i++) if (K[i][0] <= K[i - 1][0] + 0.02) console.error('camera keys out of order at', i, K[i - 1][0].toFixed(2), K[i][0].toFixed(2));
  return K;
};
// his stage: every piece shows on STAGE while it plays (the camera decides whether you see it)
const ALI_IDS = VO.segs.map(s => s.id);
startFilm({
  aliShow: ALI_IDS.map((id, i) => ({ id, t0: i ? T0(id) : -1, t1: i < ALI_IDS.length - 1 ? T0(ALI_IDS[i + 1]) : DUR + 2, c: STAGE, crop: { sx: 0, sy: 0, sw: 1080 } })),
  keys: CAM_KEYS,
});
