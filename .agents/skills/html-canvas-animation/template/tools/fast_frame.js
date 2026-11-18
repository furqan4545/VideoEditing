// html-canvas-animation fast renderer, the half that runs in the page. tools/render_fast.py injects it after window.__ready.
//
// onetake's render.py takes a Chrome PNG screenshot of every shutter sample (~240 ms on reel 17) although the page draws
// a sample in ~65 ms and the canvas already holds the exact pixels (a screenshot of these films equals getImageData of
// #cv, byte for byte: the canvas covers the page and is opaque). So here every sample is read straight from the canvas
// (~1.5 ms) and averaged in linear light in the page, with render.py's own arithmetic: its two lookup tables (sent by
// render_fast.py), float32 sums in the same order, numpy's rint (ties to even), the same "both ends identical = still
// frame" shortcut and the same cut rule on PIL's greyscale 1/8 thumbnails (L = (19595 R + 38470 G + 7471 B + 32768) >> 16,
// an 8x8 box (sum + 32) >> 6). The result is the frame render.py would have written. The finished frame (RGB, top row
// first) is POSTed as a Blob to render_fast.py's local server.
// It needs nothing from the film except the onetake contract (window.__seek, __motion) and one canvas that is the picture.
(function () {
  const cv = document.getElementById('cv') || [...document.querySelectorAll('canvas')].sort((a, b) => b.width * b.height - a.width * a.height)[0];
  if (!cv) throw new Error('fast_frame.js: no canvas in the page');
  const g = cv.getContext('2d');
  window.__fastCanvas = () => cv;
  let cfg = null, W = 0, H = 0, NPX = 0, TW = 0, TH = 0, LIN = null, OUT = null, acc = null, rgb = null, box = null, thumbs = [];
  let posts = [], sent = 0, visibleAtInit = '';
  const prof = window.__fastProf = { seek: 0, read: 0, add: 0, fin: 0, post: 0, n: 0, samples: 0, redraw: 0 };
  const now = () => performance.now();

  // what else in the page could be painted over the canvas (the renderer refuses frames where that changes)
  function visibleOthers() {
    const out = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (el === cv || el.contains(cv) || /^(SCRIPT|STYLE|LINK|META|TEMPLATE)$/.test(el.tagName)) continue;
      const cs = getComputedStyle(el), r = el.getBoundingClientRect();
      if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity <= 0 || r.width <= 0 || r.height <= 0) continue;
      if (r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) continue;
      out.push((el.id ? '#' + el.id : el.tagName.toLowerCase()) + ` ${r.width.toFixed(0)}x${r.height.toFixed(0)}`);
    }
    return out.join(', ');
  }

  async function grab(t) {
    let q = now(); await window.__seek(t); prof.seek += now() - q; q = now();
    let d;
    try { d = g.getImageData(0, 0, W, H).data; }
    catch (e) { throw new Error(`fast_frame: at ${t.toFixed(3)} s the canvas cannot be read (${e.name}: a tainted canvas, an image from another origin): render this film with tools/render_local.py`); }
    prof.read += now() - q; prof.samples++;
    return d;
  }
  // add one sample into acc (first = assign) and, when asked, its 8x8 greyscale box sums into thumbs[k]
  function add(d, first, k) {
    const q = now(), L = LIN;
    if (k >= 0) {
      box.fill(0);
      for (let y = 0, i = 0, j = 0; y < H; y++) {
        const row = (y >> 3) * TW;
        for (let x = 0; x < W; x++, i += 4, j += 3) {
          const r = d[i], gg = d[i + 1], b = d[i + 2];
          if (first) { acc[j] = L[r]; acc[j + 1] = L[gg]; acc[j + 2] = L[b]; } else { acc[j] += L[r]; acc[j + 1] += L[gg]; acc[j + 2] += L[b]; }
          box[row + (x >> 3)] += (r * 19595 + gg * 38470 + b * 7471 + 0x8000) >> 16;
        }
      }
      const th = thumbs[k] || (thumbs[k] = new Int16Array(TW * TH));
      for (let i = 0; i < th.length; i++) th[i] = (box[i] + 32) >> 6;
    } else if (first) {
      for (let i = 0, j = 0; j < 3 * NPX; i += 4, j += 3) { acc[j] = L[d[i]]; acc[j + 1] = L[d[i + 1]]; acc[j + 2] = L[d[i + 2]]; }
    } else {
      for (let i = 0, j = 0; j < 3 * NPX; i += 4, j += 3) { acc[j] += L[d[i]]; acc[j + 1] += L[d[i + 1]]; acc[j + 2] += L[d[i + 2]]; }
    }
    prof.add += now() - q;
  }
  // render.py cut_side(): all samples, unless one step between neighbours carries the change (>= 3x any other step)
  function cutSide(n) {
    const all = [0, n];
    if (n < 4) return all;
    const d = [], m = TW * TH;
    for (let k = 0; k < n - 1; k++) { const a = thumbs[k + 1], b = thumbs[k]; let s = 0; for (let i = 0; i < m; i++) s += Math.abs(a[i] - b[i]); d.push(s / m); }
    let j = 0; for (let k = 1; k < d.length; k++) if (d[k] > d[j]) j = k;
    let om = -Infinity; for (let k = 0; k < d.length; k++) if (k !== j && d[k] > om) om = d[k];
    if (d[j] <= 0 || d[j] < 3 * om) return all;
    return j < (n >> 1) ? [j + 1, n] : [0, j + 1];
  }
  // render.py integrate(): LIN_TO_SRGB[clip(rint(acc * float32(65535 / n)), 0, 65535)]
  function finish(n) {
    const q = now(), c = Math.fround(65535 / n), O = OUT;
    for (let j = 0; j < 3 * NPX; j++) {
      const v = Math.fround(acc[j] * c); let r = Math.round(v);
      if (r - v === 0.5 && (r & 1)) r--;                            // numpy rint: ties go to the even neighbour
      rgb[j] = O[r > 65535 ? 65535 : r];
    }
    prof.fin += now() - q;
  }
  function copyRgb(d) { for (let i = 0, j = 0; j < 3 * NPX; i += 4, j += 3) { rgb[j] = d[i]; rgb[j + 1] = d[i + 1]; rgb[j + 2] = d[i + 2]; } }
  function same(a, b) { const A = new Uint32Array(a.buffer, a.byteOffset, a.length >> 2), B = new Uint32Array(b.buffer, b.byteOffset, b.length >> 2); for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return false; return true; }

  window.__fast = {
    init(c) {
      cfg = Object.assign({ fps: 30, shutter: 180, samples: 8, gap: 6, smin: 4, smax: 48, scale: 1 }, c);
      W = cv.width; H = cv.height; NPX = W * H; TW = W >> 3; TH = H >> 3;
      LIN = new Float32Array(cfg.lin); OUT = new Uint8Array(cfg.out); delete cfg.lin; delete cfg.out;
      acc = new Float32Array(3 * NPX); rgb = new Uint8Array(3 * NPX); box = new Int32Array(TW * TH);
      cfg.adaptive = cfg.shutter > 0 && typeof window.__motion === 'function';
      visibleAtInit = visibleOthers();
      const r = cv.getBoundingClientRect();
      return { W, H, adaptive: cfg.adaptive, others: visibleAtInit, rect: [r.left, r.top, r.width, r.height], dpr: devicePixelRatio, inner: [innerWidth, innerHeight] };
    },
    // one output frame at t = idx / fps, exactly as render.py's frame() makes it
    async frame(idx, t) {
      const c = cfg, open = (c.shutter / 360) / c.fps; let S = c.samples, kind = 'blur', n = 0;
      if (c.shutter <= 0) { copyRgb(await grab(t)); kind = 'still'; n = 1; }
      else {
        if (c.adaptive) { try { const far = window.__motion(Math.max(t - open / 2, 0), Math.min(t + open / 2, c.dur - 1e-6)); S = Math.min(c.smax, Math.max(c.smin, Math.ceil(far * c.scale / c.gap))); } catch (e) { S = c.samples; } }
        const times = []; for (let k = 0; k < S; k++) times.push(Math.min(Math.max(t + open * ((k + 0.5) / S - 0.5), 0), c.dur - 1e-6));
        const first = await grab(times[0]), last = await grab(times[S - 1]);
        if (same(first, last)) { copyRgb(first); kind = 'still'; n = 2; }       // nothing moved while the shutter was open
        else {
          const check = S >= 4;
          add(first, true, check ? 0 : -1);
          for (let k = 1; k < S - 1; k++) add(await grab(times[k]), false, check ? k : -1);
          add(last, false, check ? S - 1 : -1); n = S;
          const [k0, k1] = check ? cutSide(S) : [0, S];
          if (k1 - k0 < S) {                                                    // a cut inside the shutter: sum the kept side again, in order
            kind = 'cut'; const q = now();
            for (let k = k0; k < k1; k++) add(k === 0 ? first : k === S - 1 ? last : await grab(times[k]), k === k0, -1);
            prof.redraw += now() - q;
          }
          finish(k1 - k0);
        }
      }
      let q = now();
      if (posts.length > 2) await posts.shift();
      const body = new Blob([rgb]);                                             // a Blob copies rgb now, so it can be reused
      posts.push((async () => {                                                 // a dropped local connection is retried, never a lost frame
        for (let a = 0; ; a++) {
          try { const r = await fetch(c.url + '/f/' + idx, { method: 'POST', body }); if (r.ok) return; if (a >= 5) throw new Error('frame post ' + r.status); }
          catch (e) { if (a >= 5) throw e; }
          await new Promise(r => setTimeout(r, 50 * (a + 1)));
        }
      })());
      // every frame is a new 6 MB Blob and every sample a new 8 MB ImageData: collect them on time (paper3d: uploads failed
      // after ~260 frames without this). render_fast.py starts Chrome with --js-flags=--expose-gc.
      if (window.gc && ++sent % 16 === 0) window.gc();
      prof.post += now() - q; prof.n++;
      const others = visibleOthers();
      return { S, n, kind, others: others === visibleAtInit ? null : others };
    },
    async flush() { await Promise.all(posts.splice(0)); return true; },
  };
})();
