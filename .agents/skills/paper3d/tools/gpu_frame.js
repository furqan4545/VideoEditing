// paper3d fast renderer, the half that runs in the page. tools/render_gpu.py injects it after window.__ready.
//
// The 3D picture stays on the GPU until the frame is finished. Each shutter sample is added in linear light into a
// float target, and the cut check (render3d's cut_side) runs on 1/8-size greyscale thumbnails. The paper grain is
// multiplied on the GPU, and the finished frame (top row first) is POSTed as raw RGBA to the renderer's local server.
// The HTML overlay (captions, labels, leader lines) stays in the page: __gpu.frame returns the boxes it covers, and
// the renderer copies them from Chrome only when the overlay changed.
// It needs nothing from the film itself: KIT.renderer, KIT.composer, KIT.seek, KIT.dom.grain and #overlay.
(function () {
  const K = window.KIT, T = window.THREE;
  if (!K || !K.composer) throw new Error('gpu_frame.js: no KIT.composer (not a paper3d film?)');
  const R = K.renderer, comp = K.composer, W = K.W, H = K.H, TW = Math.floor(W / 8), TH = Math.floor(H / 8);
  comp.renderToScreen = false;                                     // the composer's OutputPass now ends in comp.readBuffer

  const nearest = { depthBuffer: false, stencilBuffer: false, minFilter: T.NearestFilter, magFilter: T.NearestFilter, generateMipmaps: false };
  const rtFloat = () => new T.WebGLRenderTarget(W, H, Object.assign({ type: T.FloatType, format: T.RGBAFormat }, nearest));
  let accA = rtFloat(), accB = rtFloat();
  const out = new T.WebGLRenderTarget(W, H, Object.assign({ type: T.UnsignedByteType }, nearest));
  const SMAX = 48, atlas = new T.WebGLRenderTarget(TW, TH * SMAX, Object.assign({ type: T.UnsignedByteType }, nearest));   // one 1/8 thumbnail per sample, stacked

  const GL = `
    vec3 toLin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c)); }
    vec3 toSrgb(vec3 l) { return mix(l * 12.92, 1.055 * pow(l, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), l)); }`;
  const camO = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1), plane = new T.PlaneGeometry(2, 2);
  function quad(uniforms, body) {
    const m = new T.ShaderMaterial({ glslVersion: T.GLSL3, uniforms, depthTest: false, depthWrite: false,
      vertexShader: 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: 'precision highp float; precision highp int;\nlayout(location = 0) out highp vec4 fragOut;\n' + Object.keys(uniforms).map(k => `uniform ${uniforms[k].glsl} ${k};`).join('\n') + GL + '\nvoid main() {\n' + body + '\n}' });
    for (const k in uniforms) delete uniforms[k].glsl;
    const mesh = new T.Mesh(plane, m); mesh.frustumCulled = false; const s = new T.Scene(); s.add(mesh); return { u: m.uniforms, s };
  }
  const U = (glsl, value = null) => ({ glsl, value });
  // sum += linear(sample); alpha counts the samples, so the final pass divides by it
  const accQ = quad({ tAcc: U('sampler2D'), tSrc: U('sampler2D'), first: U('int', 1) }, `
    ivec2 p = ivec2(gl_FragCoord.xy);
    vec4 a = first == 1 ? vec4(0.0) : texelFetch(tAcc, p, 0);
    fragOut = a + vec4(toLin(clamp(texelFetch(tSrc, p, 0).rgb, 0.0, 1.0)), 1.0);`);
  // 8x8 box of the 8-bit greyscale picture (what render3d's cut check looks at: PIL convert("L").reduce(8))
  const thumbQ = quad({ tSrc: U('sampler2D'), y0: U('int', 0) }, `
    ivec2 o = (ivec2(gl_FragCoord.xy) - ivec2(0, y0)) * 8; float s = 0.0;
    for (int y = 0; y < 8; y++) for (int x = 0; x < 8; x++) {
      vec3 c = floor(clamp(texelFetch(tSrc, o + ivec2(x, y), 0).rgb, 0.0, 1.0) * 255.0 + 0.5);
      s += dot(c, vec3(0.299, 0.587, 0.114)); }
    fragOut = vec4(s / (64.0 * 255.0), 0.0, 0.0, 1.0);`);
  // mean of the kept samples -> sRGB -> the grain's CSS multiply (in sRGB, as Chrome does it), rows flipped to top-first
  const finQ = quad({ tA: U('sampler2D'), tGrain: U('sampler2D'), grainO: U('float', 0), useGrain: U('int', 0), Hh: U('int', H) }, `
    ivec2 q = ivec2(gl_FragCoord.xy), p = ivec2(q.x, Hh - 1 - q.y);
    vec4 s = texelFetch(tA, p, 0);
    vec3 c = toSrgb(clamp(s.rgb / max(s.a, 1e-6), 0.0, 1.0));
    if (useGrain == 1 && grainO > 0.0) { ivec2 gs = textureSize(tGrain, 0); vec3 g = texelFetch(tGrain, ivec2(q.x % gs.x, q.y % gs.y), 0).rgb; c *= (1.0 - grainO) + grainO * g; }
    fragOut = vec4(c, 1.0);`);
  const run = (q, target) => { R.setRenderTarget(target); R.render(q.s, camO); R.setRenderTarget(null); };

  const thumbs = new Uint8Array(TW * TH * SMAX * 4), pix = new Uint8Array(W * H * 4);
  let cfg = null, lastSig = null, posts = [], sent = 0;
  const prof = window.__gpuProf = { draw: 0, thumbs: 0, redo: 0, oseek: 0, fin: 0, read: 0, post: 0, n: 0 };
  const now = () => performance.now();

  function grainOpacity() {
    const g = K.dom && K.dom.grain; if (!g) return 0;
    const v = parseFloat(g.style.opacity); return isFinite(v) ? v : (K.grainO ?? 0.55);
  }
  // where the overlay draws: every visible element under #overlay except the grain, skipping full-frame containers
  // (unless they paint a background of their own), padded for strokes and shadows, overlapping boxes merged
  function overlayBoxes() {
    const ov = document.getElementById('overlay'); if (!ov) return { same: true };
    let sig = ''; for (const c of ov.children) if (c !== (K.dom && K.dom.grain)) sig += c.outerHTML;
    if (sig === lastSig) return { same: true };
    lastSig = sig; const rs = [], P = 28;
    (function walk(el) {
      for (const c of el.children) {
        if (c === (K.dom && K.dom.grain) || c.tagName === 'STYLE' || c.tagName === 'SCRIPT') continue;
        const cs = getComputedStyle(c);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity <= 0.001) continue;
        const r = c.getBoundingClientRect(), big = r.width * r.height > 0.5 * W * H;
        const paints = cs.backgroundImage !== 'none' || !/rgba\(.*,\s*0\)|transparent/.test(cs.backgroundColor);
        if (r.width > 0 && r.height > 0 && (!big || paints)) rs.push([r.left - P, r.top - P, r.right + P, r.bottom + P]);
        walk(c);
      }
    })(ov);
    const box = rs.map(b => [Math.max(0, Math.floor(b[0])), Math.max(0, Math.floor(b[1])), Math.min(W, Math.ceil(b[2])), Math.min(H, Math.ceil(b[3]))]).filter(b => b[2] > b[0] && b[3] > b[1]);
    for (let merged = true; merged;) {
      merged = false;
      for (let i = 0; i < box.length && !merged; i++) for (let j = i + 1; j < box.length; j++) {
        const a = box[i], b = box[j];
        if (a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]) { box[i] = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]; box.splice(j, 1); merged = true; break; }
      }
    }
    return { same: false, boxes: box.map(b => ({ x: b[0], y: b[1], width: b[2] - b[0], height: b[3] - b[1] })) };
  }
  // render3d.py's sample times, same arithmetic: centred on t, sized by __motion (gap px between neighbours)
  function sampleTimes(t) {
    const c = cfg, open = (c.shutter / 360) / c.fps;
    if (c.shutter <= 0) return [t];
    let S = c.samples;
    if (c.adaptive) { const far = K.motion(Math.max(t - open / 2, 0), Math.min(t + open / 2, c.dur - 1e-6)); S = Math.min(c.smax, Math.max(c.smin, Math.ceil(far * c.scale / c.gap))); }
    const ts = []; for (let k = 0; k < S; k++) ts.push(Math.min(Math.max(t + open * ((k + 0.5) / S - 0.5), 0), c.dur - 1e-6)); return ts;
  }

  window.__gpu = {
    // role 'gpu': draws frames and POSTs them. Role 'overlay': never draws 3D (comp.render is a no-op), only places the
    // HTML overlay at a time and reports its boxes, so the renderer can copy it while the GPU browsers draw.
    async init(c) {
      cfg = Object.assign({ fps: 30, shutter: 180, samples: 8, gap: 6, smin: 4, smax: 48, scale: 1, role: 'gpu', fastShadows: true }, c);
      cfg.adaptive = cfg.shutter > 0 && typeof K.motion === 'function';
      cfg.dur = cfg.dur || K.dur;
      const st = document.createElement('style');                  // the page now shows only the overlay, on nothing
      st.textContent = 'html, body, #stage { background: transparent !important; } #gl { visibility: hidden !important; } #grain { display: none !important; }';
      document.head.appendChild(st);
      const gl = R.getContext(), ext = gl.getExtension('WEBGL_debug_renderer_info');
      const info = { W, H, dur: cfg.dur, adaptive: cfg.adaptive, role: cfg.role, gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '?' };
      if (cfg.role === 'overlay') { comp.render = () => {}; return info; }
      if (cfg.fastShadows) R.shadowMap.autoUpdate = false;           // frame() asks for the shadow map once per frame
      const url = ((K.dom && K.dom.grain && K.dom.grain.style.backgroundImage) || '').match(/url\(["']?(.*?)["']?\)\s*$/);
      let grain = null;
      if (url) grain = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = url[1]; });
      if (grain) {
        const g = new T.Texture(grain); g.flipY = false; g.colorSpace = T.NoColorSpace; g.minFilter = g.magFilter = T.NearestFilter; g.generateMipmaps = false; g.needsUpdate = true;
        finQ.u.tGrain.value = g; finQ.u.useGrain.value = 1;
      }
      return Object.assign(info, { grain: !!grain });
    },
    // one output frame: render the shutter's samples, keep one side of a cut, add grain, send the pixels.
    // Nothing waits on the GPU per sample: each sample's thumbnail goes into its own row of the atlas, all are read once
    // at the end (a blocking read cost ~10 ms of stall per sample on Metal). A frame whose shutter holds a cut (render3d's
    // rule) is summed again over the kept side only - 38 of reel 15's 2841 frames.
    async frame(idx, t) {
      const times = sampleTimes(t), N = times.length, check = N >= 4;
      let q0 = now();
      const add = (k, src) => { accQ.u.tAcc.value = accA.texture; accQ.u.tSrc.value = src; accQ.u.first.value = k; run(accQ, accB); const sw = accA; accA = accB; accB = sw; };
      const ac = R.autoClear;
      // fast shadows: the soft shadow map (4096 px, VSM, about 60% of a sample) is drawn once per frame, at the middle
      // sample, which is therefore drawn first; the frame's other samples (at most 1/60 s away) reuse it
      const mid = N >> 1, order = [mid]; for (let k = 0; k < N; k++) if (k !== mid) order.push(k);
      const sm = R.shadowMap;
      for (let i = 0; i < N; i++) {
        const k = order[i];
        if (cfg.fastShadows) sm.needsUpdate = i === 0;
        await K.seek(times[k]);
        const src = comp.readBuffer.texture;
        if (check) {
          thumbQ.u.tSrc.value = src; thumbQ.u.y0.value = k * TH; atlas.viewport.set(0, k * TH, TW, TH);
          R.autoClear = false; run(thumbQ, atlas); R.autoClear = ac;
        }
        add(i === 0 ? 1 : 0, src);
      }
      prof.draw += now() - q0; q0 = now();
      let keep = null;
      if (check) {
        await R.readRenderTargetPixelsAsync(atlas, 0, 0, TW, TH * N, thumbs);
        const d = [], n = TW * TH;
        for (let k = 0; k < N - 1; k++) { let s = 0; const a = (k + 1) * n * 4, b = k * n * 4; for (let i = 0; i < n * 4; i += 4) s += Math.abs(thumbs[a + i] - thumbs[b + i]); d.push(s / n); }
        let jb = 0; for (let k = 1; k < d.length; k++) if (d[k] > d[jb]) jb = k;
        const om = d.reduce((m, v, i) => i === jb ? m : Math.max(m, v), 0);
        if (!(d[jb] <= 0 || d[jb] < 3 * om)) keep = jb < (N >> 1) ? [jb + 1, N] : [0, jb + 1];
      }
      prof.thumbs += now() - q0; q0 = now();
      if (keep) for (let k = keep[0]; k < keep[1]; k++) {             // the middle sample may sit across the cut: new shadows
        if (cfg.fastShadows) sm.needsUpdate = k === keep[0];
        await K.seek(times[k]); add(k === keep[0] ? 1 : 0, comp.readBuffer.texture);
      }
      prof.redo += now() - q0; q0 = now();
      if (N > 1) {                                                  // the grain's opacity at the frame time itself
        const keep = comp.render; comp.render = () => {};
        try { await K.seek(t); } finally { comp.render = keep; }
      }
      prof.oseek += now() - q0; q0 = now();
      finQ.u.tA.value = accA.texture; finQ.u.grainO.value = grainOpacity();
      run(finQ, out); prof.fin += now() - q0; q0 = now();
      await R.readRenderTargetPixelsAsync(out, 0, 0, W, H, pix);   // the blocking read waited ~40 ms on Metal; this one ~8
      prof.read += now() - q0; q0 = now();
      if (posts.length > 2) await posts.shift();
      // a Blob body: a Uint8Array body took ~200 ms to upload 8 MB, a Blob ~6 ms
      const body = new Blob([pix]);
      const send = async () => {                                    // a dropped local connection is retried, never a lost frame
        for (let a = 0; ; a++) {
          try { const r = await fetch(cfg.url + '/f/' + idx, { method: 'POST', body }); if (r.ok) return; if (a >= 5) throw new Error('frame post ' + r.status); }
          catch (e) { if (a >= 5) throw e; }
          await new Promise(r => setTimeout(r, 50 * (a + 1)));
        }
      };
      posts.push(send());
      // each frame is a new 8 MB Blob; Chrome's blob store fills faster than its garbage collector frees them and every
      // upload then fails (frame 261 in a bare test, ~400 in reel 15). The renderer starts Chrome with --expose-gc.
      if (window.gc && ++sent % 16 === 0) window.gc();
      prof.post += now() - q0; prof.n++;
      return { S: N, cut: !!keep };
    },
    // the HTML overlay at time t (role 'overlay'): its boxes, or same: true when nothing in it changed
    async overlay(t) { await K.seek(t); return overlayBoxes(); },
    async flush() { await Promise.all(posts.splice(0)); return true; },
  };
})();
