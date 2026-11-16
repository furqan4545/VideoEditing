// story.js — reel 31 "Here's how to steal your competitor's angry customers" (OpenMausBot): the desk layout, the named
// moments (TIGHT clock, from his words), shared story data, caption key words. Scene files read these.
'use strict';
window.CUT_IDS = ['H', 'B1'];   // pieces with a person matte: the posts pile up BEHIND him
// ───────── the desk ─────────
// STAGE: Ali's vertical selfie, full frame (a card a little bigger than the screen). B: the BEFORE props (grey). K: "your
// competitor" (Cursor's real icon). APP: OpenMausBot's window. N: the message + the notes file. S: BEFORE / AFTER split.
const STAGE = { x: -20, y: 960 - 995.56, w: 1120, h: 1991.11 };
const Z0 = 1080 / 1120 * 1.012;            // camera zoom that fills the frame with the stage (subtle zoom = Z0 x 1.00 .. 1.045)
const REG = {
  B: { x: -2500, y: 40, w: 1200, h: 1840 },
  K: { x: 1900, y: -2300, w: 1100, h: 1700 },
  N: { x: 4300, y: 60, w: 1100, h: 1800 },
  S: { x: 4300, y: 2500, w: 1100, h: 1500 },
};
const APP = { x: 1700, y: 140, w: 1500, h: 1240 };
const AWAKE_Y = APP.y + APP.h - 520;                       // the "Keep this computer awake" switch floats here
const SCREEN = { x: APP.x + 660, y: APP.y + 160, w: 800, h: 980 };   // Scout's screen (the bot's computer panel)
const NOTES_CARD = { x: REG.N.x + 40, y: REG.N.y + 820, w: 1020, h: 760 };
// the top five (real complaints, real links: research/complaints.json → film/posts.js)
const TOP5 = window.TOP5 || [['Surprise bills and price changes', 'reddit.com/r/cursor'], ['The AI got worse', 'reddit.com/r/cursor'], ['Slow and freezing', 'news.ycombinator.com'], ['Support doesn’t answer', 'reddit.com/r/cursor'], ['Updates break things', 'reddit.com/r/cursor']];
const NEW_COMPLAINT = window.NEW_COMPLAINT || 'New: …';
// which piece's words type the message, and which piece adds the line
const MSG_IDS = ['M2a', 'M2b', 'M2c'], MSG_ID = 'M2c', ADD_ID = 'P2b';
// ───────── named moments (tight clock): from his words ─────────
const A_ = {
  // hook: posts land behind his head
  tPile0: T0('H') + 0.2, tPile1: T1('B1') - 0.45,
  // BEFORE
  tGreyIn: T0('B1') - 0.1, tGuess: Wd('B1', 'guess'), tBefore: T0('B2a') - 0.3, tFriends: Wd('B2a', 'friends') - 0.3, tSurvey: Wd('B2b', 'survey') - 0.2,
  tHope: Wd('B2c', 'hope'), tRight: Wd('B2c', 'right'), tBeforeOut: T0('B3a'),
  tWall0: T0('B3a') + 0.2, tWall1: T1('B3b') - 0.2, tNow: T0('N1a'), tWallGone: T0('N1a') + 0.5,
  // AFTER
  tOMB: Wd('N1b', 'openmausbot'), tFree: Wd('N1b', 'free'),
  tCoding: Wd('N2', 'coding'), tBiggest: Wd('N2', 'biggest'), tCursor: Wd('N2', 'cursor'),
  tAppIn: T0('M1') - 0.4, tMake: Wd('M1', 'make'), tMessage: Wd('M1', 'message'),
  tEveryMon: Wd('M2a', 'monday'), tSend: T1('M2c') - 0.12, tCard: Wd('M3b', 'monday') + 0.42, tReply: 1e9,
  tKeep: Wd('M3a', 'keep'), tAwake: Wd('M3a', 'awake'),
  tMonDiv: Wd('M3b', 'morning') + 0.2, tRun: Wd('M3b', 'morning') + 0.25, tListIn: Wd('M3b', 'waiting') + 0.05, tWaiting: Wd('M3b', 'waiting'),
  tSwitch: Wd('L2', 'switch'),
  tTrick: Wd('K1', 'trick'), tLinkW: Wd('K2', 'link'), tCheck: Wd('K2', 'check'), tReal: Wd('K2', 'real'),
  tBest: Wd('P1', 'best'), tOneMore: Wd('P2a', 'one'), tSaveW: Wd('P2b', 'save'), tNotesW: Wd('P2b', 'notes'),
  tNextMon: Wd('P3', 'monday'), tNew: Wd('P3', 'new'),
  tStop: Wd('C1a', 'stop'), tBuild2: Wd('C1b', 'build'), tBegging: Wd('C1b', 'begging'),
  tFollow: Wd('C2', 'follow'),
};
// the five rows land one at a time (with "the list is waiting for you" + after), the top one stays lit
A_.tRow = [0, 1, 2, 3, 4].map(i => A_.tListIn + 0.3 + i * 0.22);
A_.tLit = Wd('L2', 'these');
A_.tThread = A_.tLinkW + 0.15;                               // the tap on the top row's link → the real thread opens
A_.tAppOut = T1('K2') + 0.4;
A_.tNotesIn = T0('P2b') - 0.4; A_.tNotesFile = T0('P3') - 0.1; A_.tNotesOut = T0('C1a');
A_.tSplit = T0('C1a') + 0.05; A_.tSplitR = Wd('C1a', 'build') - 0.05; A_.tSplitOut = T0('C1b') + 0.4;
// ───────── captions ─────────
['steal', 'guess', 'survey', 'hope', 'internet', 'leverage', 'openmausbot,', 'openmausbot', 'cursor.', 'message.', 'monday,', 'hate', 'link', 'awake,', 'waiting', 'switch',
 'trick.', 'real.', 'best', 'notes.', 'new.', 'guessing', 'begging', 'follow.'].forEach(k => CAP_KEYS.add(k));
const TITLE_LINES = ['Steal your competitor’s', 'angry customers 😈'], TITLE_Y = 250;
// the real thread that opens when the link is tapped (row 9), and where its card sits
const THREAD_IDX = window.THREAD_IDX ?? 0, THREAD_C = [APP.x + 380 + 560, APP.y + 800];
