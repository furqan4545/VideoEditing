// paper3d kit: one paper-white 3D world, one camera, everything a pure function of time. (First used on reel 15.)
// Loads after vendor/three.bundle.js (THREE, THREEX) and motion.js (OM). Gives window.KIT.
//
//   KIT.asset(name, K => ({ group, defaults, apply(s, t) }))   register a model (see assets/*.js)
//   KIT.make(name, opts)                                       build one instance  -> { group, s, defaults, apply }
//   KIT.station(name, [x,y,z], rotY)                           a place on the paper; returns a THREE.Group
//   KIT.cam.key(t, { st, l:[x,y,z], d, az, el, fov, roll, ease, dive, hand, ap, fog })   a camera key
//   KIT.shot({ id, t0, t1, pre, post, update(t, u) })          what happens between t0 and t1
//   u.w (world instances), u.label(id, text, opts), u.k(a, b, t) = clamped 0..1 progress, u.e = OM.ease
//
// Units are metres, Y up. Camera pose = look-at point l, distance d, azimuth az (0 = camera on +Z looking to -Z,
// positive = camera moves toward +X), elevation el (radians above the horizon).
(function () {
  const T = THREE, X = THREEX, OM = window.OM;
  const K = window.KIT = { W: 1080, H: 1920, FPS: 30 };
  const lerp = (a, b, k) => a + (b - a) * k, clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  K.lerp = lerp; K.clamp = clamp; K.seg = (t, a, b) => clamp((t - a) / (b - a)); K.ease = OM.ease;
  Object.assign(OM.ease, { quadIn: x => x * x, cubicIn: x => x * x * x, quartIn: x => x * x * x * x, sineIn: x => 1 - Math.cos(x * Math.PI / 2), sineOut: x => Math.sin(x * Math.PI / 2), quadInOut: x => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2 });   // the few curves motion.js lacks
  K.V = (x, y, z) => Array.isArray(x) ? new T.Vector3(x[0], x[1], x[2]) : new T.Vector3(x, y, z);

  // ---------------------------------------------------------------- look
  K.look = { key: 1.75, fill: 0.25, hemi: 0.22, env: 0.62, shadow: 0.38, shadowRadius: 7, ao: 0.9 };
  K.col = {
    paper: '#f4f1ea', paperShade: '#e7e3d9', ink: '#141518', graphite: '#33353a', mid: '#8c8f96', soft: '#c9c9c6',
    white: '#fbfaf7', plastic: '#f6f5f1', black: '#17181b',
    blue: '#2563eb', purple: '#7c3aed', purpleLight: '#a78bfa', orange: '#f97316', green: '#16a34a', red: '#e11d2e',
    copper: '#c8773a', steel: '#c9ccd3', denim: '#2f4a7a', cheese: '#f3d98a', kraft: '#d9c7a6',
  };
  const C = c => new T.Color(c);

  // seeded paper: fine grain, soft fibres, a few specks. Returns a canvas.
  function paperCanvas(size, seed, { base = K.col.paper, grain = 9, fibres = 900, tint = 0 } = {}) {
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const g = cv.getContext('2d'), R = OM.rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    const im = g.getImageData(0, 0, size, size), d = im.data;
    for (let i = 0; i < d.length; i += 4) { const n = (R() - 0.5) * grain + (R() - 0.5) * grain * 0.6; d[i] += n + tint; d[i + 1] += n; d[i + 2] += n - tint; }
    g.putImageData(im, 0, 0);
    for (let i = 0; i < fibres; i++) {
      const x = R() * size, y = R() * size, a = R() * Math.PI * 2, L = 6 + R() * 26, dark = R() < 0.55;
      g.strokeStyle = dark ? `rgba(120,112,98,${0.05 + R() * 0.07})` : `rgba(255,255,255,${0.10 + R() * 0.16})`;
      g.lineWidth = 0.5 + R() * 0.8; g.beginPath(); g.moveTo(x, y);
      g.quadraticCurveTo(x + Math.cos(a) * L * 0.5 + (R() - 0.5) * 8, y + Math.sin(a) * L * 0.5 + (R() - 0.5) * 8, x + Math.cos(a) * L, y + Math.sin(a) * L); g.stroke();
    }
    for (let i = 0; i < size / 12; i++) { g.fillStyle = `rgba(90,84,74,${0.05 + R() * 0.09})`; g.beginPath(); g.arc(R() * size, R() * size, 0.4 + R() * 0.9, 0, 7); g.fill(); }
    return cv;
  }
  K.paperCanvas = paperCanvas;
  function canvasTex(cv, { repeat = 1, srgb = true } = {}) {
    const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat, repeat);
    t.colorSpace = srgb ? T.SRGBColorSpace : T.NoColorSpace; t.anisotropy = 8; t.generateMipmaps = true; return t;
  }
  K.canvasTex = canvasTex;
  // a tileable soft noise canvas for bump maps (cloth weave, plastic grain)
  function noiseCanvas(size, seed, kind = 'grain') {
    const cv = document.createElement('canvas'); cv.width = cv.height = size; const g = cv.getContext('2d'), R = OM.rng(seed);
    const im = g.createImageData(size, size), d = im.data;
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      let v = 128;
      if (kind === 'grain') v = 128 + (R() - 0.5) * 90;
      if (kind === 'weave') v = 128 + 70 * Math.sin(x * Math.PI / 2) * Math.sin(y * Math.PI / 2) + (R() - 0.5) * 50 + ((x + y) % 8 < 2 ? -40 : 0);
      if (kind === 'brushed') v = 128 + (R() - 0.5) * 30;
      const i = (y * size + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
    }
    g.putImageData(im, 0, 0);
    if (kind === 'brushed') { g.globalAlpha = 0.5; for (let i = 0; i < size * 3; i++) { const y = R() * size; g.strokeStyle = R() < 0.5 ? '#fff' : '#000'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(0, y); g.lineTo(size, y + (R() - 0.5) * 2); g.stroke(); } }
    return cv;
  }
  K.noiseCanvas = noiseCanvas;

  // materials (cached by key). All physically based; colour stays out of the picture except the three signal colours.
  const MC = {};
  const cached = (key, make) => MC[key] || (MC[key] = make());
  K.mat = {
    clay: (color = K.col.white, rough = 0.82) => cached('clay' + color + rough, () => new T.MeshStandardMaterial({ color: C(color), roughness: rough, metalness: 0 })),
    plastic: (color = K.col.plastic, rough = 0.38) => cached('pl' + color + rough, () => new T.MeshPhysicalMaterial({ color: C(color), roughness: rough, metalness: 0, clearcoat: 0.35, clearcoatRoughness: 0.35 })),
    gloss: (color = K.col.black, rough = 0.18) => cached('gl' + color + rough, () => new T.MeshPhysicalMaterial({ color: C(color), roughness: rough, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.08 })),
    rubber: (color = K.col.black) => cached('rb' + color, () => new T.MeshStandardMaterial({ color: C(color), roughness: 0.7, metalness: 0 })),
    metal: (color = K.col.steel, rough = 0.28) => cached('mt' + color + rough, () => new T.MeshStandardMaterial({ color: C(color), roughness: rough, metalness: 1, envMapIntensity: 1.15 })),
    brushed: (color = K.col.steel) => cached('br' + color, () => { const m = new T.MeshStandardMaterial({ color: C(color), roughness: 0.34, metalness: 1, envMapIntensity: 1.15 }); m.bumpMap = canvasTex(noiseCanvas(256, 7, 'brushed'), { srgb: false, repeat: 1 }); m.bumpScale = 0.4; return m; }),
    glass: (opacity = 0.22, color = '#eef3f6') => cached('gs' + opacity + color, () => new T.MeshPhysicalMaterial({ color: C(color), roughness: 0.06, metalness: 0, transparent: true, opacity, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.6, depthWrite: false })),
    cloth: (color = K.col.denim) => cached('cl' + color, () => { const m = new T.MeshStandardMaterial({ color: C(color), roughness: 0.95, metalness: 0 }); m.bumpMap = canvasTex(noiseCanvas(128, 11, 'weave'), { srgb: false, repeat: 24 }); m.bumpScale = 0.6; return m; }),
    paper: (color = K.col.white) => cached('pp' + color, () => { const m = new T.MeshStandardMaterial({ color: C(color), roughness: 0.96, metalness: 0 }); m.bumpMap = canvasTex(noiseCanvas(256, 3, 'grain'), { srgb: false, repeat: 3 }); m.bumpScale = 0.25; return m; }),
    flat: (color, opacity = 1) => new T.MeshBasicMaterial({ color: C(color), transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }),   // not cached: often animated
    light: (color) => new T.MeshBasicMaterial({ color: C(color) }),                                                                           // an LED: set .color each frame
  };
  // geometry helpers
  K.geo = {
    rbox: (w, h, d, r, seg = 4) => new X.RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)),
    box: (w, h, d) => new T.BoxGeometry(w, h, d),
    cyl: (r, h, seg = 48, r2) => new T.CylinderGeometry(r2 ?? r, r, h, seg),
    // extrude a 2D outline [[x,y],...] (closed) by depth along +Z, optional bevel and holes
    extrude: (pts, depth, { bevel = 0, holes = [], curveSegments = 24 } = {}) => {
      const sh = new T.Shape(pts.map(p => new T.Vector2(p[0], p[1])));
      for (const h of holes) sh.holes.push(new T.Path(h.map(p => new T.Vector2(p[0], p[1]))));
      return new T.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments });
    },
    // rounded rectangle outline, centred
    rrect: (w, h, r, n = 8) => { const p = []; const c = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 1], [-w / 2 + r, -h / 2 + r, 2], [w / 2 - r, -h / 2 + r, 3]];
      for (const [cx, cy, q] of c) for (let i = 0; i <= n; i++) { const a = (q + i / n) * Math.PI / 2; p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return p; },
    tube: (pts, radius, { closed = false, seg = 96, rad = 12 } = {}) => new T.TubeGeometry(new T.CatmullRomCurve3(pts.map(p => K.V(p)), closed, 'catmullrom', 0.5), seg, radius, rad, closed),
  };
  K.mesh = (geo, mat, { cast = true, receive = true, pos, rot, scale, name, soft = false } = {}) => {
    const m = new T.Mesh(geo, mat); m.castShadow = cast; m.receiveShadow = receive; if (soft) { m.userData.noAO = true; m.userData.noDepth = true; }
    if (pos) m.position.set(pos[0], pos[1], pos[2]); if (rot) m.rotation.set(rot[0], rot[1], rot[2]);
    if (scale != null) Array.isArray(scale) ? m.scale.set(scale[0], scale[1], scale[2]) : m.scale.setScalar(scale);
    if (name) m.name = name; return m;
  };
  // a line that keeps its width in pixels at any zoom (field lines, leaders). pts: [[x,y,z],...]
  K.line = (pts, { color = K.col.blue, width = 4, dashed = false, dash = 0.02, gap = 0.012, opacity = 1 } = {}) => {
    const g = new X.LineGeometry(); g.setPositions(pts.flat());
    const m = new X.LineMaterial({ color: C(color).getHex(), linewidth: width, worldUnits: false, dashed, dashSize: dash, gapSize: gap, transparent: true, opacity, depthWrite: false });
    m.resolution.set(K.W, K.H); const l = new X.Line2(g, m); l.computeLineDistances(); l.renderOrder = 5; return l;
  };
  // a field line as a thin tube (real geometry, so depth of field treats it right). r = radius in metres. Not in the AO pass.
  K.tubeLine = (pts, { color = K.col.blue, r = 0.00005, opacity = 1, closed = false, seg = 96 } = {}) => {
    const m = new T.Mesh(K.geo.tube(pts, r, { closed, seg, rad: 8 }), new T.MeshBasicMaterial({ color: C(color), transparent: true, opacity }));
    m.userData.noAO = true; m.castShadow = false; m.receiveShadow = false; return m;
  };
  // a text / drawing plane from a canvas painter: K.card(w, h, pxPerUnit, (g, W, H) => {...}) -> mesh (unlit, exact colours)
  K.canvasPlane = (w, h, px, paint, { lit = false } = {}) => {
    const cv = document.createElement('canvas'); cv.width = Math.round(w * px); cv.height = Math.round(h * px);
    const g = cv.getContext('2d'); paint(g, cv.width, cv.height);
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8;
    const mat = lit ? new T.MeshStandardMaterial({ map: tex, roughness: 0.95 }) : new T.MeshBasicMaterial({ map: tex });
    const m = new T.Mesh(new T.PlaneGeometry(w, h), mat); m.userData = { cv, g, tex }; return m;
  };
  K.FONT = '"SF Reel", -apple-system, "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif';

  // ---------------------------------------------------------------- registry
  K.assets = {}; K.asset = (name, f) => { K.assets[name] = f; };
  K.insts = [];
  K.make = (name, opts = {}) => {
    if (!K.assets[name]) throw new Error('no asset ' + name);
    const a = K.assets[name](K, opts); a.name = name; a.defaults = a.defaults || {}; a.s = {}; a.apply = a.apply || (() => {});
    if (!('vis' in a.defaults)) a.defaults.vis = true; K.insts.push(a);
    a.at = (p) => { const v = K.V(typeof p === 'string' ? (a.anchors || {})[p] || [0, 0, 0] : p); a.group.updateWorldMatrix(true, false); return v.applyMatrix4(a.group.matrixWorld); };   // an anchor or a local point -> world
    return a;
  };
  K.stations = {};
  K.station = (name, pos = [0, 0, 0], rotY = 0) => { const g = new T.Group(); g.position.set(pos[0], pos[1], pos[2]); g.rotation.y = rotY; g.name = 'st:' + name; K.scene.add(g); g.updateMatrixWorld(true); K.stations[name] = { g, rotY }; return g; };
  // a station that sits exactly on an object's frame (e.g. the tag inside the bag): local axes = the object's axes
  K.stationFrom = (name, obj) => { obj.updateWorldMatrix(true, false); const p = new T.Vector3(), q = new T.Quaternion(), s = new T.Vector3(); obj.matrixWorld.decompose(p, q, s);
    const x = new T.Vector3(1, 0, 0).applyQuaternion(q), rotY = Math.atan2(-x.z, x.x); return K.station(name, [p.x, p.y, p.z], rotY); };
  // remember where everything stands, so a shot may move a model's group and the next seek starts clean again
  K.freeze = () => { for (const a of K.insts) a.rest = { p: a.group.position.clone(), q: a.group.quaternion.clone(), s: a.group.scale.clone(), parent: a.group.parent }; };
  K.shots = []; K.shot = s => { s.pre = s.pre ?? 0; s.post = s.post ?? 0; K.shots.push(s); };
  K.w = {};                                                     // named world instances, filled by world.js
  // moments the sound should know about: KIT.event(t, kind, note, dur)  kind: 'whip' | 'dive' | 'pullout' | 'hit' | 'alarm' | 'tick' | 'pulse' | 'land' | 'reveal' | 'snap' | 'riser' | 'quiet'
  K.events = []; K.event = (t, kind, note = '', dur = 0) => K.events.push({ t, kind, note, dur });

  // ---------------------------------------------------------------- camera
  const EASE = OM.ease;
  K.cam = {
    keys: [],
    key(t, o) { K.cam.keys.push(Object.assign({ t }, o)); },
    // resolve a key to world numbers
    _res(k) {
      if (k._r) return k._r;
      const st = k.st ? K.stations[k.st] : null, l = K.V(k.l || [0, 0, 0]);
      if (st) l.applyMatrix4(st.g.matrixWorld);
      return k._r = { l, d: k.d ?? 3, az: (k.az ?? 0) + (st ? st.rotY : 0), el: k.el ?? 0.12, fov: k.fov ?? 26, roll: k.roll ?? 0, hand: k.hand ?? 1, ap: k.ap ?? 0, fogA: (k.fog || [3, 11])[0], fogB: (k.fog || [3, 11])[1], focus: k.focus ?? null, shadow: k.shadow ?? 1 };
    },
    at(t) {
      const ks = K.cam.keys; if (!ks.length) return { l: K.V(0, 1, 0), d: 4, az: 0, el: 0.1, fov: 26, roll: 0, hand: 1, ap: 0, fogA: 3, fogB: 11, focus: null, shadow: 1 };
      if (t <= ks[0].t) return Object.assign({}, K.cam._res(ks[0]));
      const L = ks.length; if (t >= ks[L - 1].t) return Object.assign({}, K.cam._res(ks[L - 1]));
      let i = 0; while (ks[i + 1].t < t) i++;
      const A = K.cam._res(ks[i]), B = K.cam._res(ks[i + 1]), kb = ks[i + 1];
      const e = typeof kb.ease === 'function' ? kb.ease : EASE[kb.ease || 'cubicInOut'];
      const k = e(clamp((t - ks[i].t) / (ks[i + 1].t - ks[i].t)));
      const d = Math.exp(lerp(Math.log(A.d), Math.log(B.d), k));
      let l;
      if (kb.dive && Math.abs(A.d - B.d) > 1e-9) {                 // the look-at point closes in as the distance does: the landing point glides to the centre
        const far = A.d > B.d ? A : B, near = A.d > B.d ? B : A, w = clamp((d - near.d) / (far.d - near.d));
        l = near.l.clone().lerp(far.l, w);
      } else l = A.l.clone().lerp(B.l, k);
      let daz = B.az - A.az; if (kb.short !== false) { while (daz > Math.PI) daz -= 2 * Math.PI; while (daz < -Math.PI) daz += 2 * Math.PI; }
      const o = { l, d, az: A.az + daz * k, el: lerp(A.el, B.el, k), fov: lerp(A.fov, B.fov, k), roll: lerp(A.roll, B.roll, k), hand: lerp(A.hand, B.hand, k), ap: lerp(A.ap, B.ap, k),
        fogA: lerp(A.fogA, B.fogA, k), fogB: lerp(A.fogB, B.fogB, k), focus: (A.focus == null && B.focus == null) ? null : lerp(A.focus ?? A.d, B.focus ?? B.d, k) * d / lerp(A.d, B.d, k), shadow: lerp(A.shadow, B.shadow, k) };
      if (kb.lift) { const s = Math.sin(Math.PI * k); o.l.y += kb.lift * s; }   // an arc over the ground for long travels
      if (kb.swing) o.az += kb.swing * Math.sin(Math.PI * k);
      return o;
    },
    // pose -> camera position (with the operator's hand: a slow two-sine float, always on, so the frame is never frozen)
    place(o, t, cam) {
      const h = o.hand, az = o.az + h * 0.0045 * (Math.sin(0.83 * t) + 0.6 * Math.sin(1.37 * t + 1.1)), el = o.el + h * 0.0035 * (Math.sin(0.71 * t + 2.0) + 0.5 * Math.sin(1.53 * t));
      const d = o.d * (1 + h * 0.012 * Math.sin(0.52 * t + 0.6));       // the slow zoom in and out
      const ce = Math.cos(el); cam.position.set(o.l.x + d * ce * Math.sin(az), o.l.y + d * Math.sin(el), o.l.z + d * ce * Math.cos(az));
      cam.up.set(Math.sin(o.roll) * Math.cos(az), Math.cos(o.roll), -Math.sin(o.roll) * Math.sin(az)); cam.lookAt(o.l);
      cam.fov = o.fov; cam.near = Math.max(d / 60, 1e-6); cam.far = d * 40 + 1; cam.updateProjectionMatrix(); cam.updateMatrixWorld(true); return d;
    },
  };

  // ---------------------------------------------------------------- overlay: labels and captions (plain DOM, no motion)
  const LAB = {};
  function labelNode(id) {
    if (LAB[id]) return LAB[id];
    const el = document.createElement('div'); el.className = 'lab'; const ln = document.createElementNS('http://www.w3.org/2000/svg', 'path'); ln.setAttribute('class', 'lead');
    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); dot.setAttribute('r', 4); dot.setAttribute('class', 'dot');
    K.dom.labels.appendChild(el); K.dom.svg.appendChild(ln); K.dom.svg.appendChild(dot); return LAB[id] = { el, ln, dot, used: false, text: null };
  }
  K.project = (v) => { const p = (v.isVector3 ? v.clone() : K.V(v)).project(K.camera); return { x: (p.x * 0.5 + 0.5) * K.W, y: (-p.y * 0.5 + 0.5) * K.H, z: p.z }; };
  // u.label(id, text, { at: Vector3 (world) | screen: [x,y], dx, dy, o, kind: 'name'|'note'|'big', align: 'l'|'r'|'c', lead: true, w })
  function drawLabel(id, text, o = {}) {
    const n = labelNode(id); n.used = true; const op = clamp(o.o ?? 1); if (op <= 0.002) { n.used = false; return; }
    let ax, ay; if (o.at) { const p = K.project(o.at); if (p.z > 1) { n.used = false; return; } ax = p.x; ay = p.y; } else { ax = (o.screen || [540, 960])[0]; ay = (o.screen || [540, 960])[1]; }
    const dx = o.dx ?? 0, dy = o.dy ?? 0, tx = clamp(ax + dx, 70, K.W - 70), ty = ay + dy, kind = o.kind || 'note', al = o.align || (dx < 0 ? 'r' : dx > 0 ? 'l' : 'c');
    if (n.text !== text) { n.el.innerHTML = text; n.text = text; }
    n.el.className = 'lab ' + kind + ' a' + al; n.el.style.opacity = op; n.el.style.maxWidth = (o.w || 620) + 'px';
    n.el.style.left = tx + 'px'; n.el.style.top = ty + 'px'; n.el.style.color = o.color || '';
    const lead = o.lead ?? (!!o.at && (Math.abs(dx) + Math.abs(dy) > 24));
    if (lead) { const ex = tx + (al === 'l' ? -10 : al === 'r' ? 10 : 0), ey = ty + (al === 'c' ? (dy > 0 ? -18 : 18) : 0);
      n.ln.setAttribute('d', `M${ax.toFixed(1)} ${ay.toFixed(1)} L${ex.toFixed(1)} ${ey.toFixed(1)}`); n.ln.style.opacity = op * 0.9; n.dot.setAttribute('cx', ax); n.dot.setAttribute('cy', ay); n.dot.style.opacity = op; }
    else { n.ln.style.opacity = 0; n.dot.style.opacity = 0; }
  }
  // captions. Default = Ali's "simple story tell caption" (story_caption.js, the black captions of reel 15: a few words at a time,
  // spoken words near-black, coming words grey, no bold, no movement). TIMING.captions = 'apple' switches to the style below.
  const capStyle = () => ((window.TIMING && TIMING.captions) || window.CAPTION_STYLE || 'story');
  const useStory = () => capStyle() === 'story' && !!window.StoryCaption;
  // the other style: Ali's Apple style (reels 12 and 13). SF 600, one centred line, near-black; one key word per chunk in blue
  // New York italic. A chunk is at most 4 words, or ends at , . ? ! or at a pause over 0.35 s. The whole chunk shows at
  // once with a 0.12 s fade. No movement. Key words: TIMING.keys or window.CAPTION_KEYS (a list of words).
  let CAPS = [];
  const capNorm = s => String(s).toLowerCase().replace(/[^a-z0-9]/g, ''), esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  function buildCaps() {
    if (useStory()) { StoryCaption.build((window.TIMING && TIMING.words) || []); return; }
    const W = (window.TIMING && TIMING.words) || [], KEYS = new Set(((window.TIMING && TIMING.keys) || window.CAPTION_KEYS || []).map(capNorm)); CAPS = []; let cur = [];
    const flush = () => { if (!cur.length) return; let keyed = false;
      const html = cur.map(w => { const k = !keyed && KEYS.has(capNorm(w[0])); if (k) keyed = true; return k ? '<span class="key">' + esc(w[0]) + '</span>' : esc(w[0]); }).join(' ');
      const n = cur.reduce((a, x) => a + x[0].length + 1, -1);
      CAPS.push({ t0: cur[0][1], t1: cur[cur.length - 1][2], html, size: n * 31 <= 880 ? 60 : Math.floor(880 / (n * 0.52)) }); cur = []; };
    for (let i = 0; i < W.length; i++) { const w = W[i], nx = W[i + 1]; cur.push(w); if (cur.length === 4 || /[,.?!]$/.test(w[0]) || !nx || nx[1] - w[2] > 0.35) flush(); }
    flush();
    for (let i = 0; i < CAPS.length; i++) { const nx = CAPS[i + 1]; CAPS[i].show0 = Math.max(0, CAPS[i].t0 - 0.06); CAPS[i].show1 = nx ? Math.min(nx.t0 - 0.06, CAPS[i].t1 + 0.35) : CAPS[i].t1 + 0.6; }
  }
  K.buildCaps = buildCaps;
  let capKey = '';
  function drawCaps(t) {
    if (useStory()) { K.dom.cap.style.opacity = 0; StoryCaption.draw(t, { theme: K.capTheme || 'dark', opacity: K.capO, hidden: !!K.noCaps }); return; }
    const c = K.noCaps ? null : CAPS.find(c => t >= c.show0 && t < c.show1), el = K.dom.cap;
    if (!c) { if (capKey !== '') { el.innerHTML = ''; capKey = ''; } el.style.opacity = 0; return; }
    const key = c.t0 + ':' + K.capTheme; if (key !== capKey) { capKey = key; el.className = 'cap ' + (K.capTheme || 'dark'); el.style.fontSize = c.size + 'px'; el.innerHTML = c.html; }
    el.style.opacity = K.capO * clamp((t - c.show0) / 0.12);
  }
  K.capTheme = 'dark';

  // ---------------------------------------------------------------- footage (JPEG frames, loaded when a frame is needed)
  const FOOT = {}; const pending = [];
  K.footage = (id) => {
    if (FOOT[id]) return FOOT[id];
    const m = (window.TIMING && TIMING.footage && TIMING.footage[id]) || { dir: 'footage/' + id, n: 1, f0_reel_t: 0, w: 1080, h: 1920 };
    const cv = document.createElement('canvas'); cv.width = m.w || 1080; cv.height = m.h || 1920; const g = cv.getContext('2d'); g.fillStyle = '#888'; g.fillRect(0, 0, cv.width, cv.height);
    const tex = new T.CanvasTexture(cv); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true;
    const f = FOOT[id] = { id, m, cv, g, tex, cur: -1, cache: new Map(),
      want(t) {                                                       // call from a shot/asset when the picture is on screen
        const tq = Math.round(t * K.FPS) / K.FPS, i = clamp(Math.round((tq - m.f0_reel_t) * K.FPS), 0, m.n - 1);
        if (i === f.cur) return; f.cur = i;
        const hit = f.cache.get(i); if (hit && hit.done) { g.drawImage(hit.img, 0, 0, cv.width, cv.height); tex.needsUpdate = true; return; }
        const img = new Image(), rec = { img, done: false }; f.cache.set(i, rec); if (f.cache.size > 24) f.cache.delete(f.cache.keys().next().value);
        pending.push(new Promise(res => { img.onload = () => { rec.done = true; if (f.cur === i) { g.drawImage(img, 0, 0, cv.width, cv.height); tex.needsUpdate = true; } res(); }; img.onerror = () => res();
          img.src = m.dir + '/' + String(i).padStart(4, '0') + '.jpg'; }));
      } };
    return f;
  };

  // ---------------------------------------------------------------- boot
  K.init = function () {
    const W = K.W, H = K.H, root = document.getElementById('stage');
    const r = K.renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    r.setPixelRatio(1); r.setSize(W, H); r.outputColorSpace = T.SRGBColorSpace; r.toneMapping = T.NoToneMapping;
    r.shadowMap.enabled = true; r.shadowMap.type = T.VSMShadowMap; r.domElement.id = 'gl'; root.insertBefore(r.domElement, root.firstChild);
    const sc = K.scene = new T.Scene(); sc.background = C(K.col.paper); sc.fog = new T.Fog(C(K.col.paper).getHex(), 10, 40);
    K.camera = new T.PerspectiveCamera(26, W / H, 0.01, 200);
    // a white photo studio to reflect: bright dome, three softboxes, two black cards so metal has an edge to show
    const es = new T.Scene(), dome = document.createElement('canvas'); dome.width = 16; dome.height = 256; const dg = dome.getContext('2d'), gr = dg.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.42, '#eceae6'); gr.addColorStop(0.5, '#bdbab4'); gr.addColorStop(0.56, '#d9d5cc'); gr.addColorStop(1, '#f0ece4'); dg.fillStyle = gr; dg.fillRect(0, 0, 16, 256);
    const dt = new T.CanvasTexture(dome); dt.colorSpace = T.SRGBColorSpace; es.add(new T.Mesh(new T.SphereGeometry(50, 32, 24), new T.MeshBasicMaterial({ map: dt, side: T.BackSide })));
    const box = (w, h, pos, v) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(v, v, v), side: T.DoubleSide })); m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 0, 0); es.add(m); };
    box(26, 14, [-22, 30, 18], 6.5); box(18, 26, [34, 14, 10], 3.2); box(30, 8, [0, 40, -24], 4.2); box(9, 30, [-36, 6, -12], 0.02); box(9, 26, [20, 5, 34], 0.03);
    const pm = new T.PMREMGenerator(r); sc.environment = pm.fromScene(es, 0.02).texture; sc.environmentIntensity = K.look.env;
    // light: one soft key that follows the camera's subject, a cool fill from the other side, sky/paper bounce
    const key = K.key = new T.DirectionalLight(0xfff4e6, K.look.key); key.castShadow = true; key.shadow.mapSize.set(4096, 4096); key.shadow.radius = K.look.shadowRadius; key.shadow.blurSamples = 20;
    sc.add(key); sc.add(key.target);
    const fill = K.fill = new T.DirectionalLight(0xe6eeff, K.look.fill); sc.add(fill); sc.add(fill.target);
    sc.add(K.hemi = new T.HemisphereLight(0xffffff, 0xd9d2c4, K.look.hemi));
    // ground: unlit paper in the exact background colour, with the key's soft shadow laid on top
    const ptex = canvasTex(paperCanvas(1024, 5), { repeat: 1 });
    const ground = K.ground = new T.Mesh(new T.PlaneGeometry(400, 400), new T.MeshBasicMaterial({ map: ptex, color: 0xffffff })); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.0005; ground.userData.tex = ptex; sc.add(ground);
    const sh = K.shadowCatcher = new T.Mesh(new T.PlaneGeometry(400, 400), new T.ShadowMaterial({ opacity: K.look.shadow, color: 0x241f18 })); sh.rotation.x = -Math.PI / 2; sh.receiveShadow = true; sh.renderOrder = 1; sc.add(sh);
    // post: MSAA target, depth of field for the close-ups, output
    const rt = new T.WebGLRenderTarget(W, H, { samples: 4, type: T.HalfFloatType });
    const comp = K.composer = new X.EffectComposer(r, rt); comp.setSize(W, H);
    comp.addPass(new X.RenderPass(sc, K.camera));
    const ao = K.ao = new X.GTAOPass(sc, K.camera, W, H); ao.output = X.GTAOPass.OUTPUT.Default; ao.blendIntensity = K.look.ao; comp.addPass(ao);
    const bokeh = K.bokeh = new X.BokehPass(sc, K.camera, { focus: 1, aperture: 0, maxblur: 0.008 }); comp.addPass(bokeh);
    // lines, glows and anything marked userData.noAO stay out of the depth / shading pre-passes (they are not solid things)
    const hideSoft = (aoPass) => { const c = []; sc.traverse(ob => { if ((ob.isLine2 || ob.isLine || ob.isPoints || ob.userData.noDepth || (aoPass && ob.userData.noAO)) && ob.visible) { ob.visible = false; c.push(ob); } }); return c; };
    ao._overrideVisibility = function () { this._visibilityCache.push(...hideSoft(true)); };
    const bRender = bokeh.render.bind(bokeh); bokeh.render = function (...a) { const c = hideSoft(false); bRender(...a); for (const ob of c) ob.visible = true; };
    comp.addPass(new X.OutputPass());
    // DOM overlay
    const ov = document.getElementById('overlay');
    ov.innerHTML = '<div id="grain"></div><svg id="lsvg" width="' + W + '" height="' + H + '"></svg><div id="labels"></div><div id="cap" class="cap dark"></div>';
    K.dom = { grain: ov.querySelector('#grain'), svg: ov.querySelector('#lsvg'), labels: ov.querySelector('#labels'), cap: ov.querySelector('#cap') };
    K.dom.grain.style.backgroundImage = 'url(' + paperCanvas(512, 21, { base: '#ffffff', grain: 16, fibres: 520 }).toDataURL('image/png') + ')';
    if (window.StoryCaption) StoryCaption.mount(ov);
    buildCaps();
  };

  // ---------------------------------------------------------------- seek
  const u = { get w() { return K.w; }, label: drawLabel, k: (a, b, t) => clamp((t - a) / (b - a)), e: OM.ease, lerp, clamp, K, V: K.V,
    world(st, p) { return K.V(p).applyMatrix4(K.stations[st].g.matrixWorld); } };
  K.poseAt = (t) => K.cam.at(t);
  K.seek = async function (t) {
    t = clamp(t, 0, K.dur - 1e-4); K.t = t;
    const o = K.cam.at(t), cam = K.camera, d = K.cam.place(o, t, cam);
    const fog = K.scene.fog; fog.near = d * o.fogA; fog.far = d * o.fogB;
    // the key light sits up-left-front of the subject; its shadow box follows the camera distance so shadows stay crisp at any scale
    const ext = d * Math.tan(o.fov * Math.PI / 360) * 2.6 * o.shadow, kl = K.key;
    // the key comes from the upper left front OF THE CAMERA (it turns with the camera's azimuth), so every shot is lit the same flattering way
    const ca = Math.cos(o.az), sa = Math.sin(o.az), kx = -1.1 * ca + 1.25 * sa, kz = 1.1 * sa + 1.25 * ca;
    kl.target.position.copy(o.l); kl.position.set(o.l.x + ext * kx, o.l.y + ext * 2.3, o.l.z + ext * kz);
    const sc = kl.shadow.camera; sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = ext * 0.2; sc.far = ext * 7; sc.updateProjectionMatrix(); kl.shadow.normalBias = ext * 0.003; kl.shadow.bias = -ext * 0.0002;
    K.fill.target.position.copy(o.l); K.fill.position.set(o.l.x + ext * (2 * ca + 0.8 * sa), o.l.y + ext, o.l.z + ext * (-2 * sa + 0.8 * ca));
    K.ground.userData.tex.repeat.setScalar(400 / clamp(o.d * 0.9, 0.004, 6));
    if (K.ao.enabled) K.ao.updateGtaoMaterial({ radius: o.d * 0.06, distanceExponent: 1.4, thickness: 1.2, scale: 1.1, samples: 16, distanceFallOff: 1, screenSpaceRadius: false }); // paper grain stays the same size on screen whether we are 5 m or 5 mm away
    K.bokeh.enabled = o.ap > 1e-6; if (K.bokeh.enabled) { const bu = K.bokeh.uniforms; bu.focus.value = o.focus ?? d; bu.aperture.value = o.ap / d; bu.maxblur.value = 0.012; }
    for (const a of K.insts) { a.s = Object.assign({}, a.defaults); if (a.rest) { a.group.position.copy(a.rest.p); a.group.quaternion.copy(a.rest.q); a.group.scale.copy(a.rest.s); } }
    for (const id in LAB) LAB[id].used = false;
    K.capTheme = 'dark'; K.pose = o; K.dist = d; K.grainO = 0.55; K.capO = 1;
    for (const s of K.shots) if (t >= s.t0 - s.pre && t <= s.t1 + s.post) s.update(t, u);
    for (const a of K.insts) { a.group.visible = !!a.s.vis; if (a.s.vis) a.apply(a.s, t); }
    for (const id in LAB) if (!LAB[id].used) { const n = LAB[id]; n.el.style.opacity = 0; n.ln.style.opacity = 0; n.dot.style.opacity = 0; }
    drawCaps(t); K.dom.grain.style.opacity = K.grainO;
    if (pending.length) { await Promise.all(pending.splice(0)); }
    K.composer.render();
  };
  // how far the picture travels on screen between two times (px): sizes the shutter's sample count
  K.motion = function (t0, t1) {
    const A = K.cam.at(t0), B = K.cam.at(t1), ca = new T.PerspectiveCamera(), cb = new T.PerspectiveCamera(); ca.aspect = cb.aspect = K.W / K.H;
    const da = K.cam.place(A, t0, ca), db = K.cam.place(B, t1, cb); let far = 0;
    const pts = [A.l, B.l]; const r = Math.min(da, db) * 0.25; for (const s of [[r, 0, 0], [-r, 0, 0], [0, r, 0], [0, 0, r], [0, 0, -r]]) pts.push(A.l.clone().add(K.V(s)));
    for (const p of pts) { const a = p.clone().project(ca), b = p.clone().project(cb); if (a.z > 1 || b.z > 1) continue; far = Math.max(far, Math.hypot((a.x - b.x) * K.W / 2, (a.y - b.y) * K.H / 2)); }
    return Math.min(far, 2400);
  };
})();
