// exhibit.js: real pictures floating in the dark void, and the 2007 keynote screen.
//
// 'photo'  a real photo mounted on a thin black acrylic block (museum print), floating. Local origin = picture centre,
//          picture faces +Z.  options: { img: 'img/x.jpg', w (m, default 0.4), aspect (w/h of the image), border (m) }
//          state: o 0..1 (fade), lit 0..1 (picture brightness), glow 0..1 (soft light spill behind the block)
// 'stage'  the Macworld 2007 keynote, in the void: a huge screen (16:9) playing the real clip (footage 'keynote'),
//          a dark glossy stage floor that catches its light, a row of audience heads in silhouette in front.
//          Local origin = floor centre under the screen; screen faces +Z.  options: { w (m, default 4.8) }
//          state: o 0..1, clipT (seconds into the clip; the shot drives it), dim 0..1 (audience heads)
(function () {
  const T = THREE;
  const loadTex = (src) => { const tx = new T.Texture(); tx.colorSpace = T.SRGBColorSpace; tx.anisotropy = 8;
    const p = new Promise(res => { const im = new Image(); im.onload = () => { tx.image = im; tx.needsUpdate = true; res(); }; im.onerror = () => { console.error('image missing: ' + src); res(); }; im.src = src; });
    (window.ASSET_PROMISES = window.ASSET_PROMISES || []).push(p); return tx; };

  KIT.asset('photo', (K, o) => {
    const g = new T.Group(), w = o.w || 0.4, h = w / (o.aspect || 1.5), b = o.border ?? 0.006, d = 0.012;
    const tex = loadTex(o.img || 'img/steve_jobs_2007.jpg');
    const picMat = new T.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false });
    const pic = new T.Mesh(new T.PlaneGeometry(w, h), picMat); pic.position.z = d / 2 + 0.0004; g.add(pic);
    const blockMat = new T.MeshPhysicalMaterial({ color: new T.Color('#0b0d11'), roughness: 0.35, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08, transparent: true });
    const block = K.mesh(K.geo.rbox(w + 2 * b, h + 2 * b, d, 0.003, 3), blockMat, { cast: false }); g.add(block);
    const faceMat = new T.MeshPhysicalMaterial({ color: new T.Color('#0a0c10'), roughness: 0.02, metalness: 0, transparent: true, opacity: 0.12, clearcoat: 1, envMapIntensity: 2.2, depthWrite: false });
    const face = new T.Mesh(new T.PlaneGeometry(w + 2 * b, h + 2 * b), faceMat); face.position.z = d / 2 + 0.0012; face.renderOrder = 3; g.add(face);
    // soft light spill behind (a bloom-friendly halo, out of the depth passes)
    const cv = document.createElement('canvas'); cv.width = cv.height = 256; const c2 = cv.getContext('2d'), gr = c2.createRadialGradient(128, 128, 10, 128, 128, 128);
    gr.addColorStop(0, 'rgba(120,150,200,0.55)'); gr.addColorStop(0.5, 'rgba(60,80,120,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c2.fillStyle = gr; c2.fillRect(0, 0, 256, 256);
    const ht = new T.CanvasTexture(cv); ht.colorSpace = T.SRGBColorSpace;
    const haloMat = new T.MeshBasicMaterial({ map: ht, transparent: true, depthWrite: false, blending: T.AdditiveBlending, opacity: 0 });
    const halo = K.mesh(new T.PlaneGeometry(w * 2.2, h * 2.6), haloMat, { cast: false, receive: false, soft: true }); halo.position.z = -d; halo.renderOrder = -1; g.add(halo);
    return {
      group: g, size: { w, h }, anchors: { centre: [0, 0, 0], top: [0, h / 2 + b, 0], bottom: [0, -h / 2 - b, 0] },
      uv: (u, v) => [(u - 0.5) * w, (0.5 - v) * h, d / 2],
      view: { l: [0, 0, 0], d: w * 3.2, close: [0, 0, 0] },
      defaults: { o: 1, lit: 0.8, glow: 0.6 },
      apply(s) { const k = s.o; picMat.opacity = k; picMat.color.setScalar(s.lit); blockMat.opacity = k; faceMat.opacity = 0.12 * k; haloMat.opacity = s.glow * k; g.visible = k > 0.003; },
    };
  });

  KIT.asset('stage', (K, o) => {
    const g = new T.Group(), w = o.w || 4.8, h = w * 9 / 16, y0 = 0.9;
    const f = K.footage('keynote');
    const scrMat = new T.MeshBasicMaterial({ map: f.tex, toneMapped: false, transparent: true });
    const scr = new T.Mesh(new T.PlaneGeometry(w, h), scrMat); scr.position.set(0, y0 + h / 2, 0); g.add(scr);
    // the screen's black surround + a thin bezel line
    const sur = K.mesh(K.geo.box(w + 0.12, h + 0.12, 0.04), new T.MeshStandardMaterial({ color: '#050608', roughness: 0.6 }), { pos: [0, y0 + h / 2, -0.03], cast: false }); g.add(sur);
    // stage floor: dark gloss that reflects the environment and catches a soft pool of the screen's light
    const floor = K.mesh(new T.PlaneGeometry(w * 2.4, 6), new T.MeshPhysicalMaterial({ color: '#040506', roughness: 0.3, metalness: 0.2, clearcoat: 0.6, clearcoatRoughness: 0.2, envMapIntensity: 0.25 }), { cast: false });
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 2.2); floor.visible = false; g.add(floor);
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const c2 = cv.getContext('2d'), gr = c2.createRadialGradient(256, 0, 10, 256, 0, 300);
    gr.addColorStop(0, 'rgba(140,170,230,0.22)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c2.fillStyle = gr; c2.fillRect(0, 0, 512, 256);
    const pt = new T.CanvasTexture(cv); pt.colorSpace = T.SRGBColorSpace;
    const pool = K.mesh(new T.PlaneGeometry(w * 1.6, 3), new T.MeshBasicMaterial({ map: pt, transparent: true, depthWrite: false, blending: T.AdditiveBlending }), { cast: false, receive: false, soft: true });
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, 0.002, 1.5); pool.visible = false; g.add(pool);
    // audience: rows of heads and shoulders in silhouette, rim-lit by the screen
    const R = OM.rng(2007), headM = new T.MeshStandardMaterial({ color: '#0a0b0e', roughness: 0.8 }), heads = new T.Group(); g.add(heads);
    for (let row = 0; row < 3; row++) for (let k = 0; k < 9; k++) {
      const x = (k - 4) * 0.62 + (R() - 0.5) * 0.18 + (row % 2) * 0.3, z = 3.2 + row * 0.8, s = 0.95 + R() * 0.12, y = 0.0 + row * 0.12;
      heads.add(K.mesh(new T.SphereGeometry(0.11 * s, 20, 14), headM, { pos: [x, y + 1.2 * s, z], cast: false }));
      heads.add(K.mesh(K.geo.rbox(0.46 * s, 0.5, 0.26, 0.1, 3), headM, { pos: [x, y + 0.86 * s, z], cast: false }));
    }
    return {
      group: g, size: { w, h, y0 }, anchors: { screen: [0, y0 + h / 2, 0], floor: [0, 0, 1.5] },
      view: { l: [0, y0 + h / 2, 0], d: 9 },
      defaults: { o: 1, clipT: 0, dim: 1 },
      apply(s, t) {
        f.want(s.clipT + f.m.f0_reel_t);                       // footage frames are indexed from f0_reel_t
        scrMat.opacity = s.o; scrMat.color.setScalar(Math.min(1, s.o * 1.02)); heads.visible = s.dim > 0.01; g.visible = s.o > 0.003;
      },
    };
  });
})();
