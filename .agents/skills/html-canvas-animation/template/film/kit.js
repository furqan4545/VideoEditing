// html-canvas-animation · kit.js — the engine of a white-paper "cinematic movie" (reel 16 / reel 17 style).
// Vertical 1080x1920 · ONE camera over ONE white paper desk · everything is a pure function of t (seconds).
// Load order: timing.js, timing2.js, fonts.js, motion.js, kit.js, story.js, scenes/*.js, then comp.html's script,
// which ends with startFilm({...}). Never edit kit.js for one film: put film things in story.js / scenes/*.js.
//
// Two clocks. VO (timing.js) = the TIGHT clock the picture is designed on (word times of the cut pieces back to back).
// VO2 (timing2.js, from cut/pauses.py) = the clock the film PLAYS on: 0.2 s of silence after every sentence.
// Everything you author (scene timings, camera keys, sound moments) uses the tight clock; startFilm maps it.
'use strict';
const { clamp, lerp, seg, sstep, spring, ease } = OM;
const W = 1080, H = 1920, FPS = 30, VO = window.VO, DUR = VO.dur;
const SEG = {}; VO.segs.forEach(s => (SEG[s.id] = s));
const clean = s => s.toLowerCase().replace(/[^a-z0-9%]/g, '');
// time (reel clock, s) where the nth word containing `word` starts inside piece `id`
function Wd(id, word, nth = 0) { const s = SEG[id]; let k = 0; for (const [w, t0] of s.words) if (clean(w).includes(clean(word)) && k++ === nth) return t0; console.warn('no word', id, word); return (s.t0 + s.t1) / 2; }
function WdEnd(id, word, nth = 0) { const s = SEG[id]; let k = 0; for (const [w, t0, t1] of s.words) if (clean(w).includes(clean(word)) && k++ === nth) return t1; return (s.t0 + s.t1) / 2; }
const T0 = id => SEG[id].t0, T1 = id => SEG[id].t1;

// ───────── look ─────────
// Premium black on white. ONE accent: blue = "you" (your like, your note, your name). Red = something lost / wrong.
const C = { paper: '#f4f2ed', ink: '#0d0d0f', ink2: '#3b3b40', mute: '#8a8a90', faint: '#c8c6c0', track: '#e7e5df', white: '#ffffff',
  blue: '#2563ff', blueSoft: '#e4ecff', red: '#ff3b30', redSoft: '#ffe5e3', warm: '#ff9a3d', dark: '#0d0d0f', floor: '#ece9e2', wood: '#e2ddd2' };
const F = (px, wt = 500) => `${wt} ${px}px SFP, -apple-system, "Helvetica Neue", sans-serif`;         // SF Pro (inlined)
const FM = (px, wt = 500) => `${wt} ${px}px SFM, Menlo, monospace`;                                   // SF Mono (inlined)
const FS = (px, wt = 500, it = false) => `${it ? 'italic ' : ''}${wt} ${px}px NY, Georgia, serif`;    // New York (inlined)
const FH = (px, wt = 400) => `${wt} ${px}px "Bradley Hand", "Noteworthy", cursive`;                  // handwriting (system font, works in the renderer)
const FMK = (px, wt = 700) => `${wt} ${px}px "Noteworthy", "Marker Felt", cursive`;                  // marker-ish handwriting
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, k) => { const A = hex(a), B = hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], clamp(k)))).join(',')})`; };

// ───────── canvas + camera state ─────────
const cv = document.getElementById('cv'), g = cv.getContext('2d');
let DPR = 1, CAM = { x: 540, y: 960, zoom: 1, rot: 0 }, VIEW = [1, 0, 0, 1, 0, 0], ZS = 1, QT = 0;
function setupCanvas() { DPR = window.devicePixelRatio || 1; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); }
const mat = M => g.setTransform(M[0] * DPR, M[1] * DPR, M[2] * DPR, M[3] * DPR, M[4] * DPR, M[5] * DPR);
const world = () => { mat(VIEW); ZS = CAM.zoom; };                 // draw in world units
const screen = () => { g.setTransform(DPR, 0, 0, DPR, 0, 0); ZS = 1; };  // draw in screen pixels (1080x1920)
// is a world rect (with margin) on screen? use it to skip drawing far-away things
function onScreen(x, y, w, h, m = 0) { const a = OM.unproject(VIEW, 0, 0), b = OM.unproject(VIEW, W, H); const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
  return x + w >= x0 - m && x <= x1 + m && y + h >= y0 - m && y <= y1 + m; }

// ───────── drawing helpers (world or screen space, whichever is active) ─────────
function rr(x, y, w, h, r) { r = Math.max(0, Math.min(r, w / 2, h / 2)); g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
// shadow sized in world units (scales with the camera zoom so depth holds at every zoom)
const sh = (blur, dy, a, dx = 0) => { g.shadowColor = `rgba(24,20,10,${a})`; g.shadowBlur = Math.min(260, blur * ZS) * DPR; g.shadowOffsetY = dy * ZS * DPR; g.shadowOffsetX = dx * ZS * DPR; };
const noSh = () => { g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0; g.shadowOffsetX = 0; };
// a card lying on the paper: wide soft shadow + tight contact shadow + hairline. lift > 1 = floating higher.
function plate(x, y, w, h, r, { fill = C.white, lift = 1, line = true, op = 1 } = {}) {
  if (op <= 0.003) return; g.save(); g.globalAlpha *= op; g.fillStyle = fill;
  sh(54 * lift, 26 * lift, 0.13); rr(x, y, w, h, r); g.fill();
  sh(9 * lift, 3 * lift, 0.12); rr(x, y, w, h, r); g.fill(); noSh();
  if (line) { g.lineWidth = 1.2; g.strokeStyle = 'rgba(13,13,15,0.07)'; rr(x, y, w, h, r); g.stroke(); }
  g.restore();
}
function T(str, x, y, { f = F(30), c = C.ink, al = 'left', base = 'alphabetic', op = 1, ls = 0 } = {}) {
  if (op <= 0.003) return; g.save(); g.globalAlpha *= clamp(op); g.font = f; g.textAlign = al; g.textBaseline = base; g.letterSpacing = ls + 'px'; g.fillStyle = c; g.fillText(str, x, y); g.restore();
}
const tw = (str, f) => { g.font = f; return g.measureText(str).width; };
function ln(x0, y0, x1, y1, { c = C.ink, w = 2, dash = null, op = 1, cap = 'round' } = {}) {
  if (op <= 0.003) return; g.save(); g.globalAlpha *= op; g.strokeStyle = c; g.lineWidth = w; g.lineCap = cap; if (dash) g.setLineDash(dash); g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore();
}
// popIn tuned for this film (returns {op, dy, s})
const pop = (t, t0, o = {}) => OM.popIn(t, t0, { zeta: 0.72, omega: 17, rise: 26, s0: 0.9, ds: 0.1, ...o });
function check(cx, cy, r, { fill = C.ink, k = 1 } = {}) { if (k <= 0.003) return; g.save(); g.translate(cx, cy); g.scale(k, k); g.fillStyle = fill; g.beginPath(); g.arc(0, 0, r, 0, 6.2832); g.fill();
  g.strokeStyle = '#fff'; g.lineWidth = r * 0.2; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-r * 0.42, r * 0.02); g.lineTo(-r * 0.1, r * 0.34); g.lineTo(r * 0.44, -r * 0.3); g.stroke(); g.restore(); }
// a heart path centred on (cx, cy), size s (about s wide)
function heartPath(cx, cy, s) { const k = s / 32; g.beginPath(); g.moveTo(cx, cy + 11 * k); g.bezierCurveTo(cx - 3 * k, cy + 8.5 * k, cx - 16 * k, cy, cx - 16 * k, cy - 7 * k);
  g.bezierCurveTo(cx - 16 * k, cy - 13.5 * k, cx - 11 * k, cy - 17 * k, cx - 7 * k, cy - 17 * k); g.bezierCurveTo(cx - 3.5 * k, cy - 17 * k, cx - 1 * k, cy - 15 * k, cx, cy - 12.5 * k);
  g.bezierCurveTo(cx + 1 * k, cy - 15 * k, cx + 3.5 * k, cy - 17 * k, cx + 7 * k, cy - 17 * k); g.bezierCurveTo(cx + 11 * k, cy - 17 * k, cx + 16 * k, cy - 13.5 * k, cx + 16 * k, cy - 7 * k);
  g.bezierCurveTo(cx + 16 * k, cy, cx + 3 * k, cy + 8.5 * k, cx, cy + 11 * k); g.closePath(); }
// progressive reveal of text left→right (handwriting feel): k 0..1
function writeOn(str, x, y, k, o = {}) { if (k <= 0) return; const f = o.f || FH(40), w = tw(str, f), al = o.al || 'left', x0 = al === 'center' ? x - w / 2 : al === 'right' ? x - w : x;
  g.save(); g.beginPath(); g.rect(x0 - 20, y - 400, (w + 40) * clamp(k), 800); g.clip(); T(str, x, y, o); g.restore(); return x0 + w * clamp(k); }

// ───────── paper: warm white, grain anchored to the desk (two octaves so it holds at any zoom), a dot grid, light ─────────
let GRAIN = null;
function makeGrain() {
  const c = document.createElement('canvas'); c.width = c.height = 512; const x = c.getContext('2d'), r = OM.rng(7), id = x.createImageData(512, 512);
  for (let i = 0; i < 512 * 512; i++) { const v = 128 + (r() - 0.5) * 84; id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = v; id.data[i * 4 + 3] = 255; }
  x.putImageData(id, 0, 0);
  for (let k = 0; k < 340; k++) { x.strokeStyle = r() < 0.5 ? 'rgba(255,255,255,0.4)' : 'rgba(84,78,62,0.26)'; x.lineWidth = 0.6 + r() * 0.9; const px = r() * 512, py = r() * 512, a = r() * 6.283, L = 8 + r() * 26;
    x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + Math.cos(a) * L / 2 + (r() - 0.5) * 8, py + Math.sin(a) * L / 2 + (r() - 0.5) * 8, px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); }
  GRAIN = c;
}
function paper() {
  screen(); const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#faf9f5'); gr.addColorStop(0.55, C.paper); gr.addColorStop(1, '#eae7e0'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const L = Math.log2(Math.max(1e-3, CAM.zoom)), n = Math.floor(L), f = L - n;
  g.save(); g.globalCompositeOperation = 'overlay';
  for (const [k, a] of [[Math.pow(2, -n), 1 - f], [Math.pow(2, -n - 1), f]]) { if (a < 0.02) continue; const p = g.createPattern(GRAIN, 'repeat');
    p.setTransform(new DOMMatrix([VIEW[0] * k * DPR, VIEW[1] * k * DPR, VIEW[2] * k * DPR, VIEW[3] * k * DPR, VIEW[4] * DPR, VIEW[5] * DPR])); g.globalAlpha = 0.62 * a; g.fillStyle = p; g.setTransform(1, 0, 0, 1, 0, 0); g.fillRect(0, 0, cv.width, cv.height); }
  g.restore();
  world(); const sp = 60, c0 = OM.unproject(VIEW, 0, 0), c1 = OM.unproject(VIEW, W, H), c2 = OM.unproject(VIEW, W, 0), c3 = OM.unproject(VIEW, 0, H);
  const x0 = Math.floor(Math.min(c0[0], c1[0], c2[0], c3[0]) / sp) * sp, x1 = Math.max(c0[0], c1[0], c2[0], c3[0]), y0 = Math.floor(Math.min(c0[1], c1[1], c2[1], c3[1]) / sp) * sp, y1 = Math.max(c0[1], c1[1], c2[1], c3[1]);
  g.fillStyle = 'rgba(13,13,15,0.105)'; const rad = 1.9 * Math.pow(CAM.zoom, -0.35);
  if ((x1 - x0) / sp * (y1 - y0) / sp < 9000) for (let x = x0; x <= x1; x += sp) for (let y = y0; y <= y1; y += sp) { g.beginPath(); g.arc(x, y, rad, 0, 6.2832); g.fill(); }
}
function light() { screen(); let gr = g.createRadialGradient(160, 120, 60, 160, 120, 1500); gr.addColorStop(0, 'rgba(255,255,255,0.20)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
  gr = g.createRadialGradient(540, 900, 700, 540, 960, 1500); gr.addColorStop(0, 'rgba(20,16,8,0)'); gr.addColorStop(1, 'rgba(20,16,8,0.10)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }

// ───────── footage: Ali's JPEG frames, 30 fps, one folder per piece (only pieces in ON_CAM have frames) ─────────
const IMG = new Map(); let USED = [];
const fkey = (id, k) => id + '/' + String(k).padStart(4, '0');
function frameOf(id, t) { const s = SEG[id], tq = Math.round(t * FPS) / FPS; return clamp(s.pad + Math.round((tq - s.t0) * FPS), 0, s.frames - 1); }
function want(id, t) { const key = fkey(id, frameOf(id, t)); let e = IMG.get(key);
  if (!e) { const im = new Image(); im.src = 'footage/' + key + '.jpg'; e = { im, p: im.decode().catch(() => {}) }; IMG.set(key, e); } USED.push(key); return e; }
function trimCache() { const keep = new Set(USED.slice(-40)); for (const k of IMG.keys()) if (!keep.has(k)) IMG.delete(k); }
// Ali as a live photo lying on the paper. crop = {sx, sy, sw} in the 1920x1080 take; a slow push inside the frame.
// The piece shown is chosen by the caller (the frame for time t of piece id). Needs want(id,t) in prepare().
function aliCard(id, t, c, crop, { r = 38, op = 1 } = {}) {
  if (op <= 0.003) return; const { x, y, w, h } = c, s = SEG[id], e = IMG.get(fkey(id, frameOf(id, t)));
  g.save(); g.globalAlpha *= op; plate(x, y, w, h, r, { fill: '#1a1a1c', lift: 1.25, line: false });
  g.save(); rr(x, y, w, h, r); g.clip();
  if (e && e.im.complete && e.im.naturalWidth) { const z = 1 + 0.045 * ease.sineInOut(seg(t, s.t0 - 0.5, s.t1 + 0.5)), sw = crop.sw / z, sh_ = crop.sw * h / w / z;
    const sx = crop.sx + (crop.sw - sw) * 0.5, sy = crop.sy + (crop.sw * h / w - sh_) * 0.32; g.drawImage(e.im, sx, sy, sw, sh_, x, y, w, h); }
  const gl = g.createLinearGradient(0, y, 0, y + h); gl.addColorStop(0, 'rgba(255,255,255,0.07)'); gl.addColorStop(0.3, 'rgba(255,255,255,0)'); gl.addColorStop(1, 'rgba(0,0,0,0.10)'); g.fillStyle = gl; g.fillRect(x, y, w, h);
  g.restore(); g.lineWidth = 1.5; g.strokeStyle = 'rgba(255,255,255,0.35)'; rr(x + 0.75, y + 0.75, w - 1.5, h - 1.5, r); g.stroke(); g.restore();
}
// world point of a pixel (px, py) of the 1920x1080 take inside an Ali card (ignores the slow inner push; good to ~1%)
function aliPoint(c, crop, px, py) { return [c.x + (px - crop.sx) / crop.sw * c.w, c.y + (py - crop.sy) / (crop.sw * c.h / c.w) * c.h]; }

// ───────── layers: scene files register what they draw; comp.html calls them in z order ─────────
// layer(z, name, fn): fn(t) draws in WORLD space (world() is active). overlay(z, name, fn): fn(t) draws in SCREEN space.
// z guide:  0-9 floor / big grounds · 10-29 wall + furniture · 30-49 people, notes, props · 50 Ali cards · 60-79 things above
// Ali (comment box, hands) · 80-99 close-up overlays in world space.  Overlays: 10-40 dark scenes / vignettes, 90 captions.
const LAYERS = [], OVERLAYS = [];
const layer = (z, name, fn) => { LAYERS.push({ z, name, fn }); LAYERS.sort((a, b) => a.z - b.z); };
const overlay = (z, name, fn) => { OVERLAYS.push({ z, name, fn }); OVERLAYS.sort((a, b) => a.z - b.z); };
// Things one scene draws and another scene reuses (e.g. a picture that must look identical in two places for a hidden
// join). story.js declares placeholders, the owning scene file overrides them.
const SHARED = {};
// Named views for previews: VIEW_REG[name] = { keys: [[t, x, y, zoom, {fy, curve, rot}], ...] }  (comp.html?view=name)
const VIEW_REG = {};

// ───────── camera: keyed, operated (a hand float + shakes on landings) ─────────
// key: { t, x, y, zoom, fy (screen y the focus point sits at, default 960), rot, curve (ease into this key), anchor }
function mkKeys(list) { return list.map(([t, x, y, zoom, o = {}]) => ({ t, x, y, zoom, fy: o.fy ?? 960, rot: o.rot ?? 0, curve: o.curve, anchor: o.anchor, hit: o.hit || 0 })).sort((a, b) => a.t - b.t); }
function camAt(KEYS, t, { handAmp = 2.4 } = {}) {
  let A = KEYS[0], B = KEYS[0]; if (t >= KEYS[KEYS.length - 1].t) A = B = KEYS[KEYS.length - 1]; else if (t > KEYS[0].t) { let i = 0; while (KEYS[i + 1].t < t) i++; A = KEYS[i]; B = KEYS[i + 1]; }
  const k = A === B ? 0 : (B.curve || ease.cubicInOut)(seg(t, A.t, B.t)), zoom = Math.exp(lerp(Math.log(A.zoom), Math.log(B.zoom), k));
  let x = lerp(A.x, B.x, k), y = lerp(A.y, B.y, k), rot = lerp(A.rot, B.rot, k); let fy = lerp(A.fy, B.fy, k);
  if (B.anchor) { const [ax, ay] = B.anchor, s0 = [540 + (ax - A.x) * A.zoom, A.fy + (ay - A.y) * A.zoom], s1 = [540 + (ax - B.x) * B.zoom, B.fy + (ay - B.y) * B.zoom], sx = lerp(s0[0], s1[0], k), sy = lerp(s0[1], s1[1], k);
    x = ax + (540 - sx) / zoom; y = ay + (960 - sy) / zoom; fy = 960; }
  x += handAmp * (Math.sin(1.7 * t) + 0.6 * Math.sin(2.9 * t + 1)) / zoom; y += handAmp * (Math.sin(1.3 * t + 2) + 0.5 * Math.sin(3.3 * t)) / zoom;
  for (const K of KEYS) if (K.hit) { const s = OM.shake(t, K.t, { amp: K.hit, decay: 12, seed: Math.round(K.t * 100) }); x += s.x / zoom; y += s.y / zoom; rot += s.rot * 0.4; }
  return { x, y: y + (960 - fy) / zoom, zoom, rot };
}


// ═════════════════════════════ the breathing-room clock (VO2) ═════════════════════════════
// oldT(newT): identity inside the words; across each 0.2 s pause the last 0.3 s of the piece is stretched over 0.5 s,
// so the picture eases through the pause instead of freezing. Without timing2.js the two clocks are the same.
const VO2 = window.VO2 || { dur: VO.dur, segs: VO.segs.map(s => ({ ...s, old_t0: s.t0, old_t1: s.t1, pause: 0 })) };
const DUR2 = VO2.dur, SEG2 = {}; VO2.segs.forEach(s => (SEG2[s.id] = s));
const TAILW = 0.3;
function oldT(T) {
  const S = VO2.segs; if (!S.length || T <= S[0].t0) return T;
  for (const s of S) { const L = s.old_t1 - s.old_t0, end = s.t1 + s.pause; if (T > end) continue;
    const d = T - s.t0; if (!s.pause || d <= L - TAILW) return s.old_t0 + d;
    return s.old_t1 - TAILW + (d - (L - TAILW)) / (TAILW + s.pause) * TAILW; }
  const l = S[S.length - 1]; return l.old_t1 + (T - (l.t1 + l.pause));
}
function newT(t) { let lo = 0, hi = DUR2; for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (oldT(m) < t) lo = m; else hi = m; } return (lo + hi) / 2; }
let NEWT = 0;
// Ali's footage follows the NEW clock: through a pause his own spare frames keep playing (no frozen face)
frameOf = function (id, t) { const s = SEG2[id] || SEG[id], tq = Math.round(NEWT * FPS) / FPS; return clamp(s.pad + Math.round((tq - s.t0) * FPS), 0, Math.max(0, s.frames - 1)); };

// ═════════════════════════════ captions: Ali's reel 13 style ═════════════════════════════
// One line in Apple's SF semibold (600), black, straight on the picture (no box, no pill), the first key word of a line in
// New York italic blue, a soft drop shadow, fade in 0.12 s with a 10 px rise. Up to 4 words a line; a new line at , . ?
// or a pause over 0.35 s. White text where the picture behind the line is dark (read from the frame itself, so it never
// guesses). Built from VO2 (the new clock). story.js fills CAP_KEYS (lowercase tokens, e.g. 'instagram', 'lose') and
// CAP_FIX (token -> shown text, e.g. {"Sara's": 'Sara’s', 'pen.': '“pen”'}).
// For the "simple story tell caption" look instead, load the simple-storytell-caption skill's file and set CAP_OFF = true.
const Q = new URLSearchParams(location.search);
const CAP_KEYS = new Set(), CAP_FIX = {}, CAPS = []; let CAP_OFF = false, CAP_Y = 1470;
function buildCaps() {
  const chunks = [];
  for (const s of VO2.segs) { let cur = []; s.words.forEach(([tok, t0, t1], k) => { cur.push([tok, t0, t1, s.id]); const nxt = k + 1 < s.words.length ? s.words[k + 1][1] : null;
    if (cur.length === 4 || /[,.?]$/.test(tok) || nxt === null || nxt - t1 > 0.35) { chunks.push(cur); cur = []; } }); }
  chunks.forEach((c, i) => { const t0 = Math.max(0, c[0][1] - 0.06), t1 = i + 1 < chunks.length ? Math.min(chunks[i + 1][0][1] - 0.06, c[c.length - 1][2] + 0.35) : DUR2; let keyed = false;
    const parts = c.map(([tok, , , sid]) => { const key = !keyed && CAP_KEYS.has(tok.toLowerCase()); if (key) keyed = true; return { txt: CAP_FIX[sid + ':' + tok] ?? CAP_FIX[tok] ?? tok, key }; });
    const n = c.reduce((a, w) => a + w[0].length, 0) + c.length - 1; CAPS.push({ t0, t1, parts, size: n * 31 <= 880 ? 60 : Math.floor(880 / (n * 0.52)) }); });
}
function capDarkness(w) {   // share of dark pixels behind the caption text (0 = light .. 1 = dark), from the frame drawn so far
  try { const x0 = Math.max(0, Math.round((540 - w / 2 - 16) * DPR)), ww = Math.max(8, Math.round((w + 32) * DPR)), d = g.getImageData(x0, Math.round((CAP_Y - 50) * DPR), ww, Math.round(64 * DPR)).data;
    let dark = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 23) { const l = (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255; if (l < 0.45) dark++; n++; }
    return sstep(0.22, 0.5, dark / n); } catch (e) { return 0; }
}
function drawCaps(TT) {
  if (CAP_OFF || Q.has('nocaps')) return; const c = CAPS.find(c => TT >= c.t0 && TT < c.t1); if (!c) return; screen();
  const k = clamp((TT - c.t0) / 0.12), e = 1 - (1 - k) * (1 - k), y = CAP_Y + (1 - e) * 10, f = F(c.size, 600), fk = FS(Math.round(c.size * 1.07), 600, true), ls = -0.01 * c.size;
  const sp = c.size * 0.27, gap = i => sp + (c.parts[i].key ? c.size * 0.07 : 0) + (c.parts[i + 1] && c.parts[i + 1].key ? c.size * 0.03 : 0); let total = 0; for (let i = 0; i < c.parts.length - 1; i++) total += gap(i);
  const ws = c.parts.map(p => { g.font = p.key ? fk : f; g.letterSpacing = (p.key ? 0 : ls) + 'px'; const w = g.measureText(p.txt).width; total += w; return w; }); g.letterSpacing = '0px';
  const dark = capDarkness(total);
  g.save(); g.globalAlpha = e; g.shadowColor = dark > 0.5 ? 'rgba(0,0,0,0.6)' : 'rgba(15,18,22,0.24)'; g.shadowBlur = 10 * DPR; g.shadowOffsetY = 4 * DPR; g.shadowOffsetX = 0;
  let x = 540 - total / 2; c.parts.forEach((p, i) => { T(p.txt, x, y, { f: p.key ? fk : f, c: p.key ? mix('#1a8cff', '#62b3ff', dark) : mix('#0f1216', '#ffffff', dark), ls: p.key ? 0 : ls }); x += ws[i] + gap(i); });
  g.restore();
}

// ═════════════════════════════ startFilm: the render contract ═════════════════════════════
// startFilm({ aliShow: [{id, t0, t1, c, crop}], keys: () => [[t, x, y, zoom, {fy, curve, hit, anchor}], ...] })
// aliShow / keys use the TIGHT clock. ?view=NAME previews a scene's VIEW_REG keys, ?t=12.4 draws one time (new clock),
// ?hud shows the camera, ?play plays in real time, ?nocaps hides captions.
// window.__seek / __ready / __meta / __motion / __events are what onetake's render.py drives.
let KEYS = [];
function startFilm({ aliShow = [], keys = () => [[0, 540, 960, 1]] } = {}) {
  const aliNow = t => aliShow.filter(a => t >= a.t0 && t < a.t1);
  layer(50, 'ali', t => { for (const a of aliNow(t)) if (onScreen(a.c.x, a.c.y, a.c.w, a.c.h, 200)) aliCard(a.id, t, a.c, a.crop); });
  const buildKeys = () => { KEYS = mkKeys(Q.has('view') && VIEW_REG[Q.get('view')] ? VIEW_REG[Q.get('view')].keys : keys()); };
  const prepare = t => { USED = []; return Promise.all(aliNow(t).filter(a => SEG[a.id] && SEG[a.id].frames).map(a => want(a.id, t).p)); };
  const draw = t => {
    QT = Math.round(t * FPS) / FPS; CAM = camAt(KEYS, t); VIEW = OM.view(CAM, { W, H }); paper();
    for (const L of LAYERS) { world(); g.save(); try { L.fn(t); } catch (e) { console.error(L.name, e); } g.restore(); }
    light();
    for (const O of OVERLAYS) { screen(); g.save(); try { O.fn(t); } catch (e) { console.error(O.name, e); } g.restore(); }
    const hud = document.getElementById('hud'); if (hud) hud.textContent = `t=${NEWT.toFixed(2)} (tight ${t.toFixed(2)}) cam ${CAM.x.toFixed(0)},${CAM.y.toFixed(0)} z${CAM.zoom.toFixed(2)}`;
  };
  const seek = async TT => { NEWT = TT; const t = oldT(TT); await prepare(t); draw(t); drawCaps(TT); trimCache(); return true; };
  window.__meta = { dur: DUR2, fps: FPS, w: W, h: H };
  window.__seek = async t => { await seek(t); return true; };
  window.__motion = (A, B) => { const t0 = oldT(A), t1 = oldT(B); return Math.min(1800, OM.screenTravel(camAt(KEYS, t0), camAt(KEYS, t1), camAt(KEYS, (t0 + t1) / 2), { W, H })); };
  window.__events = () => ({ T: DUR2, events: (window.SFX_EVENTS || []).map(e => ({ ...e, t: +newT(e.t).toFixed(3), t_old: e.t })).sort((a, b) => a.t - b.t) });
  window.__ready = Promise.all([document.fonts.ready, window.FONTS_READY]).then(() => { setupCanvas(); makeGrain(); buildKeys(); buildCaps(); return seek(0); });
  if (Q.has('t')) window.__ready.then(() => seek(parseFloat(Q.get('t'))));
  if (Q.has('hud')) { const h = document.getElementById('hud'); if (h) h.style.display = 'block'; }
  if (Q.has('play')) window.__ready.then(() => { const t0 = performance.now(); let busy = false; (function loop() { if (!busy) { busy = true; seek(((performance.now() - t0) / 1000) % DUR2).then(() => (busy = false)); } requestAnimationFrame(loop); })(); });
}
