// Reel 17 · "How does Instagram never lose a like?" · shared base for every scene file.
// Vertical 1080x1920 · ONE camera over ONE white paper desk · everything is a pure function of t (seconds).
// Load order: timing.js, fonts.js, motion.js, base.js, scenes/*.js, comp.html's own script.
// Scene files ONLY add: functions with their own prefix, layer(...) / overlay(...) calls, VIEW_REG entries,
// and SHARED.* overrides. They never edit this file.
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
// Things one scene draws and another scene reuses. Scene files may override these.
const SHARED = {
  // Sara's drawing (a child's drawing). Used by the hook's post card AND the classroom wall, so it must look identical in both.
  // Draw it filling the rect (x, y, w, h) with aspect 1.6 (w/h). wall.js owns the real one.
  saraDrawing(x, y, w, h, t) { g.save(); g.fillStyle = '#fffdf7'; g.fillRect(x, y, w, h); g.strokeStyle = C.ink; g.lineWidth = w * 0.012; g.beginPath(); g.arc(x + w * 0.75, y + h * 0.28, h * 0.12, 0, 6.28); g.stroke(); g.strokeRect(x + w * 0.2, y + h * 0.45, w * 0.3, h * 0.38); g.restore(); },
};
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

// ───────── the desk layout (world units; at zoom 1 the screen shows 1080 x 1920 of them) ─────────
// Regions sit side by side on one paper desk; the camera travels between them.
//   A  hook       x     0 .. 1080   Ali card + a social post card whose like count races
//   B  classroom  x  2600 .. 4400   the class of 100, the front wall (Sara's drawing, the board), the teacher's desk
//   C  turn       x  5400 .. 6600   Ali card ("That is Instagram"), then the phone that sends a like
//   D  network    x  7400 .. 12400  the server field (millions), the one server with the pen, the world map of copies
//   E  close      x 13400 .. 14500  Ali card ("two computers"), two computers + one number, the comment box
const REG = { A: { x: 0, y: 0, w: 1080, h: 1920 }, B: { x: 2600, y: -200, w: 1800, h: 3000 }, C: { x: 5400, y: 0, w: 1200, h: 3600 }, D: { x: 7400, y: -2000, w: 5000, h: 6000 }, E: { x: 13400, y: 0, w: 1100, h: 2800 } };
// A · hook
const POST = { x: 100, y: 80, w: 880, h: 750 };                  // the post card: header 84, image 880 x 550 (aspect 1.6), footer 116
const POST_IMG = { x: 100, y: 164, w: 880, h: 550 };
const ALI_H = { x: 40, y: 850, w: 1000, h: 540 }, CROP_H = { sx: 310, sy: 40, sw: 1300 };
// B · classroom. The front wall is "unfolded" flat above the floor like a pop-up book lying open: wall at the top, floor below.
const CLS = { x: 2700, y: 0, w: 1600, h: 2600 };                 // whole room (wall + floor)
const WALL = { x: 2700, y: 0, w: 1600, h: 600 };                 // the front wall, seen face-on
const DRAW = { x: 2800, y: 150, w: 400, h: 250 };                // Sara's drawing pinned on the wall (aspect 1.6 like POST_IMG)
const BOARD = { x: 3330, y: 70, w: 880, h: 440 };                // the whiteboard; the number is written on it with a marker
const FLOOR = { x: 2700, y: 600, w: 1600, h: 2000 };             // the floor, seen from above
const TDESK = { x: 3240, y: 700, w: 520, h: 190 };               // the teacher's desk (top view), the class faces it
const NOTEBOOK = { x: 3270, y: 720, w: 250, h: 150 };            // open notebook on the desk (wall.js draws it; close-ups zoom in a lot)
const TRAY = { x: 3560, y: 730, w: 160, h: 120 };                // the note tray on the desk (class.js draws it)
const BIN = { x: 3810, y: 760, w: 90, h: 90 };                   // the waste bin next to the desk (class.js)
const TEACHER = { x: 3500, y: 640 };                             // teacher stands between the board and her desk (class.js draws her)
const KID_SPOT = { you: { x: 3560, y: 560 }, minji: { x: 3990, y: 560 } };   // where You and Minji stand in front of the board to write
// C · turn
const ALI_T = { x: 5440, y: 600, w: 1000, h: 720 }, CROP_T = { sx: 330, sy: 50, sw: 1260 };   // taller: his pointing hand (take px ~810, 870) is in frame
const PHONE = { x: 5690, y: 2000, w: 500, h: 1030 };             // the phone lying on the paper (phone.js), screen inset ~22
// D · network (network.js owns everything inside REG.D)
// E · close
const ALI_E = { x: 13440, y: 850, w: 1000, h: 540 }, CROP_E = { sx: 310, sy: 40, sw: 1300 };

// ───────── the story clock: named moments from Ali's words (reel seconds) ─────────
const A_ = {
  // H hook
  tMillions: Wd('H', 'millions'), tTap: Wd('H', 'tap'), tHeart: Wd('H', 'heart'), tSameSec: Wd('H', 'same'), tHookEnd: T1('H'),
  // R1-R3 the class and the board
  tClass: T0('R1'), t100: Wd('R1', '100'), tSara: T0('R2'), tWall: Wd('R2', 'wall'), tBoard: Wd('R3', 'board'), t41: Wd('R3', '41'), tLikes: Wd('R3', 'likes'),
  // R4-R6 the race
  tYou: T0('R4'), tLikeIt: Wd('R4', 'like'), tWalk: Wd('R4', 'walk'), tAdd: Wd('R4', 'add'),
  tMinji: Wd('R5', 'minji'), tStands: Wd('R5', 'stands'), tSameTime: Wd('R5', 'same'),
  tSaw: Wd('R6a', 'saw'), tSaw41: Wd('R6a', '41'), tWrite: Wd('R6b', 'write'), tW42: Wd('R6b', '42'),
  // R7 the loss
  tTwo: T0('R7a'), tLiked: Wd('R7a', 'liked'), tNumber: Wd('R7b', 'number'), tOnlyOne: Wd('R7b', 'only'), tYourLike: T0('R7c'), tGone: Wd('R7c', 'gone'),
  // R8 the name
  tEng: T0('R8'), tRace: T1('R8') - 1.25, tRaceEnd: T1('R8'),
  // R9-R10 the rule (the scene rewinds: kids walk back, the board goes back to 41)
  tRuleStart: T0('R9'), tTeacher: Wd('R9', 'teacher'), tRule: Wd('R9', 'rule'), tNobody: T0('R10'), tTouch: Wd('R10', 'touches'),
  // R11-R14 notes, one at a time
  tPass: Wd('R11', 'pass'), tNote: Wd('R11', 'note'), tName: Wd('R11', 'name'), tTakes: Wd('R12', 'takes'), tOneNote: Wd('R12', 'one'),
  tWrites: Wd('R13', 'writes'), tNotebook: Wd('R13', 'notebook'), tChanges: Wd('R14', 'changes'), t42: Wd('R14', '42'), t43: Wd('R14', '43'), t44: Wd('R14', '44'), tLost: Wd('R14', 'nobody'),
  // R15 the double note
  tTwiceStart: T0('R15a'), tTwice: Wd('R15a', 'twice'), tAlready: Wd('R15b', 'already'), tOnce: Wd('R15c', 'once'),
  // R16 the turn
  tInsta: T0('R16a'), tPhone: Wd('R16b', 'phone'), tNever: Wd('R16b', 'never'), tNumberWord: Wd('R16b', 'number'), tSendsName: Wd('R16c', 'name'),
  // R17-R19 the network
  tEveryPost: Wd('R17a', 'every'), tOneComp: T0('R17b'), tHoldsPen: Wd('R17b', 'pen'), tMillionsComp: Wd('R17b', 'millions'), tServer: Wd('R17b', 'server'),
  tWorld: Wd('R18a', 'world'), tOthers: T0('R18a'), tCopies: Wd('R18b', 'copies'), tHear: Wd('R19', 'hear'), tSecond: Wd('R19', 'second'), tLater: Wd('R19', 'later'),
  // R20-R22 the close
  tBuild: Wd('R20', 'build'), tNeverLet: Wd('R20', 'never'), tTwoComp: Wd('R20', 'two'), tSameNum: Wd('R20', 'same'), tSendName: T0('R21'), tGive: Wd('R21', 'give'), tOnlyOneOf: Wd('R21', 'one'), tPenGive: Wd('R21', 'pen'),
  tWant: Wd('R22', 'want'), tComment: Wd('R22', 'comment'), tPenWord: Wd('R22', 'pen'),
};
// Shared story state (every scene reads these; never re-derive them):
// the number written on the board at time t.  41 → (race) 42 → (rewind under the rule) 41 → 42, 43, 44 (teacher, notes in order)
function boardNum(t) {
  if (t < A_.tW42 - 0.1) return 41;
  if (t < A_.tRule) return 42;           // the race wrote 42 (one like lost)
  if (t < A_.t42 - 0.05) return 41;      // rewound: replay the same moment with the rule
  if (t < A_.t43 - 0.05) return 42;
  if (t < A_.t44 - 0.05) return 43;
  return 44;
}
// names in the teacher's notebook after the first 41 (in order, with the time each is written)
const NB_NEW = [{ name: 'You', t: A_.tWrites + 0.05, n: 42 }, { name: 'Minji', t: A_.t43 - 0.35, n: 43 }, { name: 'Leo', t: A_.t44 - 0.35, n: 44 }];
