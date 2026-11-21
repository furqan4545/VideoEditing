// cine.js (reel 40 v2): the WHITE WRAPPED PAPER look. Ali on v1: "remove that shitty blue wallpaper, with may be white
// textured wrapped paper". One sheet of crumpled white paper is the floor and the backdrop of the whole film; inside the
// skin the world turns into deep rose tissue (K.inside = 0..1, set by the shots). Same API as the dark cine.js
// (cine_dark.js): K.cine.setup(), K.cine.frame(), K.L / K.Wt timing helpers, K.mat.glow, K.bloomS.
(function () {
  const K = window.KIT, T = THREE, X = THREEX, OM = window.OM;
  const C = c => new T.Color(c);
  Object.assign(K.col, { paper: '#f1ede5', rose: '#3a1018', roseHi: '#6a2430', gold: '#ffbf3c', cyan: '#5fd4ff', skin: '#d9a184' });
  K.mat.glow = (color, opacity = 1) => new T.MeshBasicMaterial({ color: C(color), transparent: true, opacity, depthWrite: false, toneMapped: false });

  // timing helpers for shots: K.L('grid') -> [t0, t1] of a voice line; K.Wt(line, word, nth) -> start of that word; K.We -> its end
  const TM = () => window.TIMING || { lines: {}, words: [] };
  K.L = key => (TM().lines[key] || [0, 0]).slice(0, 2);
  const wfind = (key, w, nth = 0) => { const re = w instanceof RegExp ? w : new RegExp('^' + String(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const L = TM().words.filter(x => x[3] === key && re.test(x[0].replace(/[^\w'-]/g, ''))); return L[nth] || L[L.length - 1]; };
  K.Wt = (key, w, nth) => { const x = wfind(key, w, nth); return x ? x[1] : K.L(key)[0]; };
  K.We = (key, w, nth) => { const x = wfind(key, w, nth); return x ? x[2] : K.L(key)[1]; };

  // crumpled wrapping paper: soft facets, creases (a light ridge next to a dark valley), fibres, grain
  function wrapped(size, seed, base) {
    const cv = K.paperCanvas(size, seed, { base, grain: 7, fibres: 700 }), g = cv.getContext('2d'), R = OM.rng(seed + 7);
    for (let i = 0; i < 180; i++) {                       // facets: big soft triangles a touch lighter or darker
      const x = R() * size, y = R() * size, s = size * (0.08 + R() * 0.22), a = R() * 6.28, d = R() < 0.5;
      g.fillStyle = d ? `rgba(110,100,85,${0.012 + R() * 0.03})` : `rgba(255,255,255,${0.03 + R() * 0.06})`;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); g.lineTo(x + Math.cos(a + 1.9) * s * 0.8, y + Math.sin(a + 1.9) * s * 0.8); g.closePath(); g.fill(); }
    for (let i = 0; i < 70; i++) {                        // creases: polylines that wander a little
      let x = R() * size, y = R() * size; const a0 = R() * 6.28, n = 4 + Math.floor(R() * 6), L = size * (0.03 + R() * 0.07), pts = [[x, y]];
      for (let k = 0; k < n; k++) { const a = a0 + (R() - 0.5) * 0.9; x += Math.cos(a) * L; y += Math.sin(a) * L; pts.push([x, y]); }
      const w = 0.8 + R() * 1.6;
      for (const [dx, col] of [[-w * 0.7, `rgba(255,255,255,${0.45 + R() * 0.3})`], [w * 0.7, `rgba(105,95,80,${0.16 + R() * 0.14})`]]) {
        g.strokeStyle = col; g.lineWidth = w; g.beginPath(); pts.forEach(([px, py], k) => k ? g.lineTo(px + dx, py + dx * 0.4) : g.moveTo(px + dx, py + dx * 0.4)); g.stroke(); } }
    return cv;
  }
  K.wrappedCanvas = wrapped;

  K.cine = {
    setup() {
      const sc = K.scene;
      sc.background = C(K.col.paper); sc.fog = new T.Fog(C(K.col.paper).getHex(), 10, 60);
      // the floor: the kit's paper, now crumpled wrapping paper
      const gt = K.canvasTex(wrapped(1024, 5, K.col.paper), { repeat: 1 }); K.ground.material.map = gt; K.ground.userData.tex = gt; K.ground.material.needsUpdate = true;
      K.shadowCatcher.material.opacity = 0.3;
      // NaN guard (a grazing-angle skin pixel would smear into black boxes through bloom), then bloom for the HDR glows only
      const san = new X.ShaderPass({ uniforms: { tDiffuse: { value: null } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); bvec4 bad = bvec4(c.r != c.r || abs(c.r) > 1e4, c.g != c.g || abs(c.g) > 1e4, c.b != c.b || abs(c.b) > 1e4, c.a != c.a); gl_FragColor = any(bad) ? vec4(0.0, 0.0, 0.0, 1.0) : max(c, vec4(0.0)); }' });
      K.composer.insertPass(san, 1);
      const bloom = K.bloom = new X.UnrealBloomPass(new T.Vector2(K.W, K.H), 0.6, 0.45, 0.98);
      K.composer.insertPass(bloom, K.composer.passes.length - 1);
      // the backdrop: the same wrapped paper behind everything, fixed to the camera (fog-free)
      sc.add(K.camera);
      const bt = new T.CanvasTexture(wrapped(1024, 19, '#efeae1')); bt.colorSpace = T.SRGBColorSpace;
      const bd = K.backdropMesh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: bt, transparent: true, opacity: 1, depthWrite: false, fog: false }));
      bd.userData.noAO = true; bd.userData.noDepth = true; bd.renderOrder = -10; bd.frustumCulled = false; K.camera.add(bd);
      // a flash that fills the frame at a dive ("into the light"): a plane just in front of the lens, drawn last
      const fm = K.flashMesh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: C('#7dffa8'), transparent: true, opacity: 0, depthTest: false, depthWrite: false, toneMapped: false, fog: false }));
      fm.userData.noAO = true; fm.userData.noDepth = true; fm.renderOrder = 999; fm.frustumCulled = false; K.camera.add(fm);
      K.cineOn = true; K.capTopDefault = 1385;
      K._paperC = C(K.col.paper); K._roseC = C(K.col.rose); K._tmpC = new T.Color();
      // labels: dark ink on paper (the shots pass a light colour inside the skin)
      const st = document.createElement('style');
      // v3: labels big enough to read on a phone (44 px semibold), dark ink with a white halo on paper, white with a dark halo inside
      st.textContent = '.lab{color:#15171b;text-shadow:0 0 3px rgba(255,255,255,0.95),0 1px 14px rgba(255,255,255,0.9) !important}.lab.note{font-size:44px !important;font-weight:600 !important;letter-spacing:-0.005em !important}' +
        '#labels.ins .lab{color:#ffffff;text-shadow:0 0 3px rgba(0,0,0,0.7),0 2px 16px rgba(0,0,0,0.75) !important}#lsvg .lead{stroke:#3a3d44 !important;stroke-width:2.5px !important}#lsvg .dot{fill:#15171b !important}' +
        // captions: slightly bold (Ali on v2: "make caption slightly bold"), stronger halo so a word never sinks into the picture
        '.stcap.dark .on{color:#111216 !important}.stcap.dark .off{color:#7f8086 !important}.stcap.dark{text-shadow:0 0 2px rgba(255,255,255,0.9),0 1px 12px rgba(255,255,255,0.85)}' +
        '.stcap.pill .on{color:#111216 !important}.stcap.pill .off{color:#6f7076 !important}.stcap.pill .ln{background:rgba(255,255,255,0.88);padding:5px 20px 8px;border-radius:18px;box-shadow:0 6px 22px rgba(0,0,0,0.22);-webkit-box-decoration-break:clone;box-decoration-break:clone}' +
        '.stcap.light .on{color:#ffffff !important}.stcap.light .off{color:rgba(255,255,255,0.72) !important}.stcap.light{text-shadow:0 0 3px rgba(0,0,0,0.75),0 2px 16px rgba(0,0,0,0.8) !important}';
      if (window.StoryCaption && window.TIMING) StoryCaption.build(TIMING.words, { weight: 600, size: 52 });
      document.head.appendChild(st);
    },
    // every frame, after the camera is placed and the shots have run
    frame(o, d) {
      const cam = K.camera, bd = K.backdropMesh, ins = K.clamp(K.inside || 0); if (!bd) return;
      const dist = cam.far * 0.8, h = 2 * dist * Math.tan(cam.fov * Math.PI / 360) * 1.25;
      bd.position.set(0, 0, -dist); bd.scale.set(h * K.W / K.H, h, 1); bd.material.opacity = (K.backdropO ?? 1) * (1 - ins);
      K._tmpC.copy(K._paperC).lerp(K._roseC, ins); K.scene.background.copy(K._tmpC); K.scene.fog.color.copy(K._tmpC);
      K.ground.visible = ins < 0.5; K.shadowCatcher.visible = ins < 0.5; K.ao.enabled = ins < 0.5; K.scene.environmentIntensity = K.look.env * (1 - 0.6 * ins);
      K.bloom.strength = K.bloomS ?? 0.6;
      const fm = K.flashMesh, fd = cam.near * 3, fh = 2 * fd * Math.tan(cam.fov * Math.PI / 360) * 1.2;
      fm.position.set(0, 0, -fd); fm.scale.set(fh * K.W / K.H, fh, 1); fm.material.opacity = K.clamp(K.flashO || 0); if (K.flashC) fm.material.color.set(K.flashC); K.flashO = 0;
      K.capTheme = ins > 0.5 ? 'light' : 'dark'; K.grainO = 0.18 * (1 - ins);
      K.dom.labels.classList.toggle('ins', ins > 0.5);
      // the caption plan (capplan.js, made by tools/capplan.py from the picture behind each caption): where each chunk sits and in which ink
      if (window.CAP_PLAN && window.StoryCaption && !K.noCaps) { const st = StoryCaption.state(K.t || 0), pl = st && CAP_PLAN[st.i]; if (pl) { K.capTop = pl.top; K.capTheme = pl.theme; } }
      K.inside = 0;
    },
  };
})();
