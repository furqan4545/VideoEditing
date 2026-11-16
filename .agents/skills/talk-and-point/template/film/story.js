// story.js — this film's desk layout, named moments (TIGHT clock, from his words), shared data, caption key words.
// (This copy fits the template's demo timing: pieces H, S1, S2. Replace it with your film's.)
'use strict';
window.CUT_IDS = ['H'];   // pieces with a person matte (tools/cutout.py H ...): things can sit BEHIND him on these
// ───────── the desk ─────────
// STAGE: his vertical selfie, full frame (a card a little bigger than the screen, so the subtle zoom and the hand float
// never show an edge). Animation places sit around it on the same paper desk, ~1000 units of paper between them.
const STAGE = { x: -20, y: 960 - 995.56, w: 1120, h: 1991.11 };
const Z0 = 1080 / 1120 * 1.012;              // camera zoom that just fills the frame with the stage
const REG = {
  A: { x: 1700, y: 200, w: 1100, h: 1500 },  // an animation place (scenes/demo.js)
};
// ───────── named moments (tight clock): from his words, never typed seconds ─────────
const A_ = {
  tPile0: T0('H') + 0.2, tPile1: T1('H') - 0.4,        // things land behind him (scenes/ali.js AL_PILE)
  tGreyIn: 1e9, tNow: 1e9,                              // a grey BEFORE stretch on his stage (set both to use it)
  tHook: Wd('H', 'hook'), tFrame: Wd('S1', 'frame'), tTime: Wd('S1', 'time'), tCuts: Wd('S2', 'cuts'),
};
// ───────── captions + opening title ─────────
['hook', 'frame', 'never'].forEach(k => CAP_KEYS.add(k));
const TITLE_LINES = ['Your hook as an', 'Instagram title 😈'], TITLE_Y = 250;
