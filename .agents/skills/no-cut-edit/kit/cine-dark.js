// cine.js: reel 37's dark cinematic look on top of the paper3d kit (the reference reel's look: a near-black navy void,
// premium dark product lighting, glowing gold charge). Loads after kit.js; comp.html calls KIT.cine.setup() after
// KIT.init(). Everything stays a pure function of time.
//
//   K.col.gold / goldHot / goldDim   the charge (field lines, crossings). The ONLY warm glow in the film.
//   K.col.cyan                       the finger's pull / a found touch point (used sparingly)
//   K.mat.glow(color, opacity)       unlit, bloom-friendly, NOT cached (animate .opacity / .color)
//   K.cine.backdrop(o, color)        the soft navy vignette behind everything (call from a shot to change it)
(function () {
  const K = window.KIT, T = THREE, X = THREEX, OM = window.OM;
  const C = c => new T.Color(c);
  Object.assign(K.col, {
    void: '#04060a', navy: '#0b1220', navyHi: '#16233a',
    gold: '#ffbf3c', goldHot: '#fff0c4', goldDim: '#8a5a12', cyan: '#5fd4ff', ion: '#9fb4c8',
    skin: '#d9a184', skinDeep: '#b8775c', nail: '#f2cbbd', wool: '#5d6066', titanium: '#8d8a84', glassEdge: '#9fd3e8',
    oledR: '#ff2d3a', oledG: '#2bff6a', oledB: '#2b6bff',
  });
  K.mat.glow = (color, opacity = 1) => { const m = new T.MeshBasicMaterial({ color: C(color), transparent: true, opacity, depthWrite: false, toneMapped: false }); return m; };
  K.mat.darkGlass = (opacity = 0.32) => new T.MeshPhysicalMaterial({ color: C('#9cc6d8'), roughness: 0.04, metalness: 0, transparent: true, opacity, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 2.2, depthWrite: false, side: T.DoubleSide });

  // timing helpers for shots: K.L('grid') -> [t0, t1] of a voice line; K.Wt('grid', 'columns') -> start of that word in that
  // line (nth match, regex or text, case-insensitive); K.We(...) -> its end. Missing -> the line start (never throws).
  const TM = () => window.TIMING || { lines: {}, words: [] };
  K.L = key => (TM().lines[key] || [0, 0]).slice(0, 2);
  const wfind = (key, w, nth = 0) => { const re = w instanceof RegExp ? w : new RegExp('^' + String(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const L = TM().words.filter(x => x[3] === key && re.test(x[0].replace(/[^\w'-]/g, ''))); return L[nth] || L[L.length - 1]; };
  K.Wt = (key, w, nth) => { const x = wfind(key, w, nth); return x ? x[1] : K.L(key)[0]; };
  K.We = (key, w, nth) => { const x = wfind(key, w, nth); return x ? x[2] : K.L(key)[1]; };

  // hands (hand.js: origin at the wrist, fingers +Y, palm +Z). K.aimHand puts the pointing index tip on a point given in
  // the hand's parent frame, the finger along dir, the palm toward palm. K.holdPhone wraps a gripping hand round the phone.
  const _m = new T.Matrix4(), _q = new T.Quaternion();
  K.aimHand = (hand, target, dir = [-0.25, 0.55, -0.8], palm = [0, 0, -1]) => {
    if (!hand || !hand.indexTip) return; const Y = K.V(dir).normalize(), Zp = K.V(palm), Z = Zp.sub(Y.clone().multiplyScalar(Zp.dot(Y))).normalize(), Xa = Y.clone().cross(Z);
    _m.makeBasis(Xa, Y, Z); hand.group.quaternion.setFromRotationMatrix(_m);
    const tip = K.V(hand.indexTip(hand.s)).applyQuaternion(hand.group.quaternion); hand.group.position.copy(K.V(target).sub(tip)); };
  K.holdPhone = (hand, phone) => {
    if (!hand || !hand.phoneFrame) return; const f = hand.phoneFrame(); _q.fromArray(f.quat);
    _m.compose(K.V(f.pos), _q, K.V(1, 1, 1)).invert(); phone.group.updateMatrix(); const hm = phone.group.matrix.clone().multiply(_m);
    hm.decompose(hand.group.position, hand.group.quaternion, hand.group.scale); };

  K.cine = {
    setup() {
      const sc = K.scene;
      sc.background = C(K.col.void); sc.fog = new T.Fog(C(K.col.void).getHex(), 10, 60);
      K.ground.visible = false; K.shadowCatcher.visible = false;
      // a dark studio to reflect: black dome, a big soft top box, two long strip lights, a cool rim card behind
      const es = new T.Scene();
      es.add(new T.Mesh(new T.SphereGeometry(50, 32, 24), new T.MeshBasicMaterial({ color: C('#030407'), side: T.BackSide })));
      const box = (w, h, pos, v, tint = [1, 1, 1]) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(v * tint[0], v * tint[1], v * tint[2]), side: T.DoubleSide })); m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 0, 0); es.add(m); };
      box(30, 16, [-10, 38, 12], 2.4);                       // soft top box
      box(4, 40, [-34, 8, 14], 3.6, [0.9, 0.97, 1.0]);       // tall strip left
      box(4, 40, [30, 10, -18], 2.6, [0.85, 0.93, 1.0]);     // tall strip right-back (rim on glass edges)
      box(24, 6, [0, 4, -40], 1.4, [0.7, 0.85, 1.0]);        // cool card behind
      const pm = new T.PMREMGenerator(K.renderer); sc.environment = pm.fromScene(es, 0.02).texture; sc.environmentIntensity = 0.9;
      K.key.color = C('#f3f6ff'); K.key.intensity = 1.25; K.key.shadow.radius = 10;
      K.fill.color = C('#6f8fff'); K.fill.intensity = 0.22;
      K.hemi.color = C('#8fa8d0'); K.hemi.groundColor = C('#05070b'); K.hemi.intensity = 0.16;
      // rim: from behind and above the subject, cool. Placed every frame from the camera pose (see K.cine.frame)
      const rim = K.rim = new T.DirectionalLight(0xbfd8ff, 1.1); sc.add(rim); sc.add(rim.target);
      // a NaN / Inf pixel (a skin shader at a grazing angle) would be spread by the bloom and blur passes into black
      // rectangles: zero any such pixel right after the scene is drawn, before every other pass
      const san = new X.ShaderPass({ uniforms: { tDiffuse: { value: null } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); bvec4 bad = bvec4(c.r != c.r || abs(c.r) > 1e4, c.g != c.g || abs(c.g) > 1e4, c.b != c.b || abs(c.b) > 1e4, c.a != c.a); gl_FragColor = any(bad) ? vec4(0.0, 0.0, 0.0, 1.0) : max(c, vec4(0.0)); }' });
      K.composer.insertPass(san, 1);
      // bloom: only the charge, LEDs and the lit screen glow
      const bloom = K.bloom = new X.UnrealBloomPass(new T.Vector2(K.W, K.H), 0.7, 0.5, 0.8);
      K.composer.insertPass(bloom, K.composer.passes.length - 1);
      K.ao.blendIntensity = 0.75;
      // backdrop: a soft navy glow behind the subject, fixed to the camera (fog-free, out of the depth passes)
      sc.add(K.camera);
      const cv = document.createElement('canvas'); cv.width = cv.height = 512; const g = cv.getContext('2d');
      const gr = g.createRadialGradient(256, 210, 8, 256, 256, 360); gr.addColorStop(0, '#1a2a44'); gr.addColorStop(0.38, '#0d1626'); gr.addColorStop(0.75, '#060a12'); gr.addColorStop(1, '#030406');
      g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
      // a few faint dust specks so the void has depth (seeded, fixed to the backdrop)
      const R = OM.rng(37); for (let i = 0; i < 260; i++) { const a = 0.04 + R() * 0.16; g.fillStyle = `rgba(200,215,240,${a})`; g.beginPath(); g.arc(R() * 512, R() * 512, 0.3 + R() * 0.9, 0, 7); g.fill(); }
      const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace;
      const bd = K.backdropMesh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: tx, transparent: true, opacity: 1, depthWrite: false, fog: false }));
      bd.userData.noAO = true; bd.userData.noDepth = true; bd.renderOrder = -10; bd.frustumCulled = false; K.camera.add(bd);
      K.cineOn = true; K.capTopDefault = 1385;   // reel 37 v3: captions sit low by default (his marked spot); a shot sets K.capTop to move them
    },
    // every frame, after the camera is placed (kit.js calls it from seek)
    frame(o, d) {
      const cam = K.camera, bd = K.backdropMesh; if (!bd) return;
      const dist = cam.far * 0.8, h = 2 * dist * Math.tan(cam.fov * Math.PI / 360) * 1.25;
      bd.position.set(0, 0, -dist); bd.scale.set(h * K.W / K.H * 1.0, h, 1);
      bd.material.opacity = K.backdropO ?? 1;
      const ext = d * Math.tan(o.fov * Math.PI / 360) * 2.6, ca = Math.cos(o.az), sa = Math.sin(o.az);
      K.rim.target.position.copy(o.l); K.rim.position.set(o.l.x - ext * 1.6 * sa + ext * 0.6 * ca, o.l.y + ext * 1.5, o.l.z - ext * 1.6 * ca - ext * 0.6 * sa);
      K.rim.intensity = K.rimI ?? 1.1;
      K.bloom.strength = K.bloomS ?? 0.7;
    },
  };
})();
