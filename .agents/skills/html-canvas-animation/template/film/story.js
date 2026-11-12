// story.js — everything that belongs to THIS film and is shared by its scene files:
// the desk layout (where each place sits on the one paper desk), named moments from the words, shared story state,
// caption key words. Scene files read these; they never re-derive them. (This copy is the demo: replace it.)
'use strict';
// ───────── the desk layout (world units; at zoom 1 the screen shows 1080 x 1920 of them) ─────────
// Places sit side by side on one paper desk; the camera travels between them. Leave ~1000 units of empty paper between
// places so a whip has room to blur. Keep text and faces out of the caption band (screen y 1400-1500).
const REG = { A: { x: 0, y: 0, w: 1080, h: 1920 }, B: { x: 2200, y: 0, w: 1200, h: 1920 } };
const ALI_A = { x: 40, y: 850, w: 1000, h: 540 }, CROP_A = { sx: 310, sy: 40, sw: 1300 };   // Ali's card in the hook (crop in the 1920x1080 take)
const CARD = { x: 100, y: 120, w: 880, h: 600 };                                             // the hook's component card, above his card
const DEV = { x: 2340, y: 520, w: 920, h: 760 };                                             // the device in place B
// ───────── named moments (tight clock): use the words, never typed seconds ─────────
const A_ = {
  tHook: T0('H'), tFrame: Wd('S1', 'frame'), tTime: Wd('S1', 'time'), tCamera: Wd('S2', 'camera'), tTravels: Wd('S2', 'travels'),
};
// ───────── captions ─────────
['hook', 'frame', 'never', 'travels.'].forEach(k => CAP_KEYS.add(k));
