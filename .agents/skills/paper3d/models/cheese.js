// A block of mature cheddar in clear vacuum wrap, the way it lies on the shelf. Real size in metres:
// 115 mm long (X), 70 mm wide (Z), 42 mm high (42.7 mm with the film). Local frame: length along X, the label faces +Z,
// the wrap rests on y = 0, centred on x = z = 0. With its two end fins the pack is 150 mm long.
// Parts: the cheese (pale, softly rounded, a slight waxy sheen; fine pores and cut marks that only show in a macro), a
// clear vacuum-tight film with a few tension creases near the short ends, at each short end the film pulled together
// off the end face into a flat heat-sealed crimped fin with a pinked (zig-zag) cut edge (plus the two folded-in side
// panels on the end face), a lap seam along the back, and a white paper label on the front long face (CHEDDAR / MATURE /
// 350 g, a nutrition grid, an EAN-13 barcode).
// The film is drawn the way clear film looks: almost nothing but its reflections (added on top), a faint grey body
// where it stands free of the block, and a pale shadow (40 %) under the fins.
// The top face is left clean and flat in the middle: that is where the security tag gets stuck (anchor 'tag').
// state:
//   wobble (rad)   the block rocks on its long bottom edges while it settles: + lifts the front (label) edge, - the back edge
// extra: inst.slot is a THREE.Group at the 'tag' anchor that rocks with the block (parent the tag to it to ride the wobble).
// preview only: option keys = a list of camera keys for tools/preview.sh, e.g. '{"keys":[{"az":0.7,"el":0.4,"d":0.15,"l":[0.066,0.02,0]}]}'
KIT.asset('cheese', (K, o) => {
  const T = THREE, X = THREEX, g = new T.Group();
  const L = 0.115, W = 0.07, H = 0.042, R = 0.0046, FT = 0.00035, HT = H + 2 * FT;   // FT = the wrap's allowance around the nominal block
  const RB = R + FT, ZP = W / 2 + FT - RB;                          // the wrap's corner radius; where its flat faces end (the block rocks on that line)
  const rock = new T.Group(), all = new T.Group(); g.add(rock); rock.add(all);

  // ------------------------------------------------------------ the cheese
  const skin = (() => {                                            // faint mottling, so the block is not one flat colour
    const S = 512, cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'), r = OM.rng(350);
    c.fillStyle = '#fbf7ee'; c.fillRect(0, 0, S, S);
    for (let i = 0; i < 420; i++) {
      const x = r() * S, y = r() * S, rad = 8 + r() * 52, dark = r() < 0.55, a = 0.014 + r() * 0.03, col = dark ? '168,120,34' : '255,255,255';
      const gr = c.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(${col},${dark ? a : a * 2.2})`); gr.addColorStop(1, `rgba(${col},0)`);
      c.fillStyle = gr; c.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    return cv;
  })();
  const cheeseMat = new T.MeshPhysicalMaterial({ color: new T.Color(K.col.cheese).multiplyScalar(0.38), roughness: 0.56, metalness: 0, clearcoat: 0.1, clearcoatRoughness: 0.5,
    sheen: 0.1, sheenRoughness: 0.55, sheenColor: new T.Color('#fff0c2'), emissive: new T.Color('#f2d27a'), emissiveIntensity: 0.43 });
  cheeseMat.map = K.canvasTex(skin); cheeseMat.bumpMap = K.canvasTex(K.noiseCanvas(256, 31, 'grain'), { srgb: false, repeat: 2 }); cheeseMat.bumpScale = 0.1;
  // the surface up close: slow unevenness, sparse fine pores and a few short cut marks, in real size on their own UV set
  // (uv1), so they hold at any zoom and average out to nothing from far away. Two tiling maps from one height field: a
  // normal map, and an occlusion map that darkens the pits (the block is lit mostly by the white room, so pits read by
  // shade, not by slope). Under the glossy film this is what keeps a macro from looking like a yellow card.
  const TILE = 0.036;
  { const S = 1024, Hf = new Float32Array(S * S), Hp = new Float32Array(S * S), r = OM.rng(907), wrap = v => ((v % S) + S) % S;   // 0.035 mm per texel
    const blob = (A, cx, cy, rad, amp, pw = 2) => { const m = Math.ceil(rad * (pw > 2 ? 1.5 : 2.6)), x0 = Math.round(cx), y0 = Math.round(cy);
      for (let dy = -m; dy <= m; dy++) for (let dx = -m; dx <= m; dx++) A[wrap(y0 + dy) * S + wrap(x0 + dx)] += amp * Math.exp(-Math.pow(((x0 + dx - cx) ** 2 + (y0 + dy - cy) ** 2) / (rad * rad), pw / 2)); };
    for (let i = 0; i < 70; i++) blob(Hf, r() * S, r() * S, 36 + 60 * r(), (r() - 0.5) * 4.4);                   // slow unevenness (millimetres across)
    for (let i = 0; i < 160; i++) { const x = r() * S, y = r() * S, rad = 2.2 + 3.4 * r(), d = -(0.45 + 0.55 * r()), a = r() * Math.PI, e = (0.4 + 1.1 * r()) * rad;   // pores: irregular, 0.1 to 0.3 mm
      blob(Hp, x, y, rad, d, 4); blob(Hp, x + Math.cos(a) * e, y + Math.sin(a) * e, rad * (0.55 + 0.3 * r()), d * 0.8, 4); }
    for (let i = 0; i < 80; i++) { const x = r() * S, y = r() * S, l = 10 + 30 * r(), d = -(0.3 + 0.35 * r()), bend = (r() - 0.5) * 0.02; let a = (r() - 0.5) * 0.9;           // slits, roughly along the cut
      for (let k = 0; k <= l; k++) { a += bend; blob(Hp, x + Math.cos(a) * k, y + Math.sin(a) * k, 1.1 + 0.5 * Math.sin(Math.PI * k / l), d * Math.sin(Math.PI * k / l) * 0.6, 4); } }
    const grain = new Float32Array(S); { let v = 0; for (let y = 0; y < S; y++) { v = v * 0.55 + (r() - 0.5); grain[y] = v; } grain[0] = (grain[1] + grain[S - 1]) / 2; }   // the wire's fine drag lines
    const tex = paint => { const cv = document.createElement('canvas'); cv.width = cv.height = S; const c = cv.getContext('2d'), im = c.createImageData(S, S); paint(im.data); c.putImageData(im, 0, 0);
      const t = new T.CanvasTexture(cv); t.colorSpace = T.NoColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; t.channel = 1; return t; };
    const h = (x, y) => Hf[wrap(y) * S + wrap(x)] + 2 * Hp[wrap(y) * S + wrap(x)];
    cheeseMat.normalMap = tex(d => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const dx = (h(x + 1, y) - h(x - 1, y)) * 0.5, dy = (h(x, y + 1) - h(x, y - 1)) * 0.5, l = Math.hypot(dx, dy, 1), i = (y * S + x) * 4;
      d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255; } });
    cheeseMat.aoMap = tex(d => { for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const i = (y * S + x) * 4, v = 255 * K.clamp(0.975 + 0.34 * Math.max(-1.2, Hp[y * S + x]) + grain[y] * 0.022 + (r() - 0.5) * 0.02);
      d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255; } });
    cheeseMat.normalScale.set(0.6, 0.6); cheeseMat.aoMapIntensity = 1; }               // both follow the camera distance, see below
  // RoundedBoxGeometry, with plain planar UVs per face (u along the face's long way), so maps land where we put them
  const rbox = (w, h, d, r) => { const geo = K.geo.rbox(w, h, d, r, 6), p = geo.attributes.position, uv = geo.attributes.uv, n = p.count / 6;
    for (let i = 0; i < p.count; i++) { const sd = Math.floor(i / n), x = p.getX(i) / w + 0.5, y = p.getY(i) / h + 0.5, z = p.getZ(i) / d + 0.5;
      if (sd < 2) uv.setXY(i, sd === 0 ? 1 - z : z, y); else if (sd < 4) uv.setXY(i, x, sd === 2 ? 1 - z : z); else uv.setXY(i, sd === 4 ? x : 1 - x, y); }
    const m = new Float32Array(p.count * 2);                       // uv1: the same faces in real size (one tile = TILE metres), for detail that must keep its scale
    for (let i = 0; i < p.count; i++) { const sd = Math.floor(i / n), x = p.getX(i) / TILE, y = p.getY(i) / TILE, z = p.getZ(i) / TILE; m[i * 2] = sd < 2 ? z : x; m[i * 2 + 1] = (sd === 2 || sd === 3) ? z : y; }
    geo.setAttribute('uv1', new T.BufferAttribute(m, 2)); return geo; };
  // vacuum-tight: the body is drawn right up under the film (GAP below it), so no ring of bare film shows around the silhouette
  const GAP = 0.00004, BG = FT - GAP;
  const body = K.mesh(rbox(L + 2 * BG, H + 2 * BG, W + 2 * BG, R + BG), cheeseMat, { pos: [0, HT / 2, 0] }); all.add(body);
  // the pores are a macro detail: full strength with the lens within 7 cm of the block, gone by 24 cm (from there they
  // would only read as specks). Set from the camera at draw time, so it is the same for the same frame every time.
  const inv = new T.Matrix4(), cp = new T.Vector3();
  body.onBeforeRender = (rd, sc, cam) => {
    cp.setFromMatrixPosition(cam.matrixWorld).applyMatrix4(inv.copy(body.matrixWorld).invert());
    const d = Math.hypot(Math.max(0, Math.abs(cp.x) - L / 2), Math.max(0, Math.abs(cp.y) - H / 2), Math.max(0, Math.abs(cp.z) - W / 2)) * body.matrixWorld.getMaxScaleOnAxis();
    const k = 1 - K.clamp((d - 0.07) / 0.17), e = k * k * (3 - 2 * k);
    cheeseMat.aoMapIntensity = 0.08 + 0.92 * e; cheeseMat.normalScale.setScalar(0.2 + 0.4 * e);
  };

  // ------------------------------------------------------------ the clear film
  // tension creases where the film is pulled toward the two end seals: normal maps (they hold up at any zoom), drawn at
  // 0.225 mm per texel, flat everywhere except near the short ends. paint(add, r, PW, PH): add(x0, y0, x1, y1, width, height) in texels
  const creaseMap = (PW, PH, seed, paint) => {
    const Hf = new Float32Array(PW * PH);
    const add = (x0, y0, x1, y1, w, amp) => {                       // a soft ridge along a segment: rises just after (x0,y0), fades out toward (x1,y1)
      const ax = x1 - x0, ay = y1 - y0, l2 = ax * ax + ay * ay, m = w * 3.2;
      const xa = Math.max(0, Math.floor(Math.min(x0, x1) - m)), xb = Math.min(PW - 1, Math.ceil(Math.max(x0, x1) + m)), ya = Math.max(0, Math.floor(Math.min(y0, y1) - m)), yb = Math.min(PH - 1, Math.ceil(Math.max(y0, y1) + m));
      for (let y = ya; y <= yb; y++) for (let x = xa; x <= xb; x++) { const t = K.clamp(((x - x0) * ax + (y - y0) * ay) / l2), dx = x - (x0 + ax * t), dy = y - (y0 + ay * t), ww = w * (1 - 0.5 * t);
        Hf[y * PW + x] += amp * K.clamp(t * 7) * Math.pow(1 - t, 1.3) * Math.exp(-(dx * dx + dy * dy) / (ww * ww)); }
    };
    paint(add, OM.rng(seed), PW, PH);
    const cv = document.createElement('canvas'); cv.width = PW; cv.height = PH; const c = cv.getContext('2d'), im = c.createImageData(PW, PH), d = im.data, h = (x, y) => Hf[Math.min(PH - 1, Math.max(0, y)) * PW + Math.min(PW - 1, Math.max(0, x))];
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) { const dx = (h(x + 1, y) - h(x - 1, y)) * 0.5, dy = (h(x, y + 1) - h(x, y - 1)) * 0.5, l = Math.hypot(dx, dy, 1), i = (y * PW + x) * 4;
      d[i] = (-dx / l * 0.5 + 0.5) * 255; d[i + 1] = (dy / l * 0.5 + 0.5) * 255; d[i + 2] = (1 / l * 0.5 + 0.5) * 255; d[i + 3] = 255; }
    c.putImageData(im, 0, 0); const t = new T.CanvasTexture(cv); t.colorSpace = T.NoColorSpace; t.anisotropy = 8; return t;
  };
  // top: a few creases running in from each short end, roughly along the block; the middle (where the tag goes) stays flat
  const creaseTop = creaseMap(512, 312, 1177, (add, r, PW, PH) => { for (const side of [0, 1]) for (let i = 0; i < 6; i++) {
    const y0 = (0.07 + 0.86 * r()) * PH, len = r() < 0.35 ? 64 + 34 * r() : 24 + 30 * r(), ang = (r() - 0.5) * 0.4, dir = side ? -1 : 1, x0 = side ? PW - 22 - 6 * r() : 22 + 6 * r(), w = 2.6 + 3 * r(), amp = (r() < 0.65 ? 1 : -0.8) * (0.8 + 0.9 * r());
    add(x0, y0, x0 + dir * len * Math.cos(ang), y0 + len * Math.sin(ang), w, amp); if (r() < 0.35) add(x0, y0 + w * 2.4, x0 + dir * len * 0.6, y0 + w * 2.4 + len * 0.6 * Math.sin(ang + 0.06), w * 0.8, -amp * 0.6); } });
  // long sides: creases fanning out from where the fin ends, at fin height; they stop short of the label
  const creaseSide = creaseMap(512, 188, 2311, (add, r, PW, PH) => { for (const side of [0, 1]) for (let i = 0; i < 5; i++) {
    const f = (i + 0.2 + 0.6 * r()) / 5 - 0.5, y0 = PH * (0.53 + f * 0.5), ang = f * 1.5 + (r() - 0.5) * 0.15, len = 26 + 30 * r(), dir = side ? -1 : 1, x0 = side ? PW - 22 - 6 * r() : 22 + 6 * r(), w = 2.2 + 2.2 * r(), amp = (r() < 0.6 ? 1 : -0.8) * (0.7 + 0.8 * r());
    add(x0, y0, x0 + dir * len * Math.cos(ang), y0 + len * Math.sin(ang), w, amp); } });
  // K.mat.glass, made into a clear film: almost no body colour of its own, mostly what it reflects (clear film shows as highlights).
  // Film parts neither cast nor receive: with the kit's VSM shadows a receiver is drawn into the shadow map too, and a film
  // lying on the cheese would shade it in streaks. Only the two crimped fins cast (a pale shadow, see finDepth). Film is
  // also kept out of the AO pass (userData.noAO): it is not a solid. The polygon offset keeps it clear of the body 0.04 mm below.
  const film = K.mat.glass(0.14).clone(); film.color.set('#0b0c0d'); film.opacity = 1; film.blending = T.AdditiveBlending; film.clearcoat = 0; film.ior = 2.0; film.roughness = 0.16; film.envMapIntensity = 0.6; film.fog = false;
  film.polygonOffset = true; film.polygonOffsetFactor = -1; film.polygonOffsetUnits = -6;
  const filmTop = film.clone(), filmSide = film.clone(); filmTop.normalMap = creaseTop; filmSide.normalMap = creaseSide; filmTop.normalScale.set(2.2, 2.2); filmSide.normalScale.set(2.2, 2.2);
  const wrap = K.mesh(rbox(L + 2 * FT, HT, W + 2 * FT, RB), [film, film, filmTop, film, filmSide, filmSide], { pos: [0, HT / 2, 0], cast: false, receive: false }); wrap.renderOrder = 3; wrap.userData.noAO = true; all.add(wrap);
  // film seen against the paper has to carry a little body: the pulled film at the ends, and the welded, crimped seal (cloudier)
  const pull = K.mat.glass(0.12, '#aeb6ba').clone(); pull.side = T.DoubleSide;
  const SEAL_O = 0.4, seal = new T.MeshPhysicalMaterial({ color: new T.Color('#c4cbce'), roughness: 0.2, metalness: 0, transparent: true, opacity: SEAL_O, clearcoat: 1, clearcoatRoughness: 0.12,
    envMapIntensity: 1.4, depthWrite: false, side: T.DoubleSide });
  // one end, drawn for +X from the middle of the end face: two sheets of film pulled together off the face, then the flat crimped fin
  const FW = 0.0715, NL = 0.006, FL = 0.0112, TF = 0.00024, HN = 0.009, FY = HT * 0.47, AMP = 0.0002, NR = 8, DROOP = [0.09, 0.055];
  const faceX = z => { const a = Math.abs(z) - ZP; return a <= 0 ? 0 : Math.sqrt(Math.max(0, RB * RB - a * a)) - RB; };   // the end face in plan: flat, then rounding off
  const sheet = sgn => { const NU = 14, NZ = 48, pos = [], idx = [];
    for (let j = 0; j <= NZ; j++) { const q = j / NZ * 2 - 1, zr = q * (W / 2 + FT - 0.0003), zt = q * FW / 2, x0 = faceX(zr) - 0.0007, hn = HN * (sgn > 0 ? 1 : 0.8) * (1 - 0.35 * q * q);
      for (let i = 0; i <= NU; i++) { const u = i / NU; pos.push(x0 + (NL - x0) * u, sgn * (TF / 2 + (hn - TF / 2) * Math.pow(1 - u, 2.4)), zr + (zt - zr) * u); } }
    for (let j = 0; j < NZ; j++) for (let i = 0; i < NU; i++) { const a = j * (NU + 1) + i, b = a + NU + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals(); return geo; };
  const sheets = [sheet(1), sheet(-1)];
  const c0 = 0.0012, c1 = FL - 0.0014, finPts = [], NS = 160, fx = i => -0.0005 + (FL + 0.0005) * i / NS;
  const ridge = x => { const u = (x - c0) / (c1 - c0); return (u <= 0 || u >= 1) ? 0 : AMP * Math.sin(u * NR * 2 * Math.PI) * K.clamp(Math.min(u, 1 - u) * NR * 2); };
  for (let i = 0; i <= NS; i++) finPts.push([fx(i), TF / 2 + ridge(fx(i))]);
  for (let i = NS; i >= 0; i--) finPts.push([fx(i), -TF / 2 + ridge(fx(i))]);
  const finFlat = K.geo.extrude(finPts, FW); finFlat.translate(0, 0, -FW / 2);
  { const p = finFlat.attributes.position, uv = finFlat.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + 0.0005) / (FL + 0.0005), p.getZ(i) / FW + 0.5); }
  seal.map = (() => { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 4; const c = cv.getContext('2d');   // troughs a little darker: the crimp reads in any light
    for (let i = 0; i < 1024; i++) { const x = -0.0005 + (FL + 0.0005) * (i + 0.5) / 1024, v = Math.round(255 * (0.74 + 0.13 * (1 + ridge(x) / AMP))); c.fillStyle = `rgb(${v},${v},${v})`; c.fillRect(i, 0, 1, 4); }
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; return t; })();
  // the cut edge is pinked (zig-zag), the way a flow-wrap knife leaves it: an alpha cut-out over the last 0.6 mm
  const TEETH = 56, TOOTH = 0.0006, cut = (() => { const CW = 512, CH = 2048, cv = document.createElement('canvas'); cv.width = CW; cv.height = CH; const c = cv.getContext('2d');
    const ux = x => (x + 0.0005) / (FL + 0.0005) * CW, per = CH / TEETH;
    c.fillStyle = '#000'; c.fillRect(0, 0, CW, CH); c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -4); c.lineTo(ux(FL - TOOTH), -4);
    for (let k = 0; k < TEETH; k++) { c.lineTo(ux(FL - TOOTH), k * per); c.lineTo(ux(FL - 0.00004), (k + 0.5) * per); } c.lineTo(ux(FL - TOOTH), CH + 4); c.lineTo(0, CH + 4); c.closePath(); c.fill();
    const t = new T.CanvasTexture(cv); t.colorSpace = T.NoColorSpace; t.anisotropy = 8; return t; })();
  seal.alphaMap = cut; seal.alphaTest = SEAL_O * 0.5;
  // what makes film read as film is what it reflects: a second, additive skin on the fin carries the glints on the crimp
  const sheen = film.clone(); sheen.side = T.DoubleSide; sheen.ior = 2.2; sheen.specularIntensity = 0.4; sheen.roughness = 0.12; sheen.envMapIntensity = 0.8; sheen.polygonOffset = false;
  const glint = film.clone(); glint.side = T.DoubleSide; glint.roughness = 0.2; glint.ior = 2.2; glint.specularIntensity = 0.32; glint.envMapIntensity = 0.9; glint.alphaMap = cut; glint.alphaTest = 0.5; glint.polygonOffset = false;
  // a clear fin throws a pale shadow: its depth pass keeps 2 shadow-map texels in 5, and the kit's VSM blur turns that into a 40 % shadow
  const finDepth = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, alphaMap: cut, alphaTest: 0.5 });
  finDepth.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'void main() {\n\tif ( mod( floor( gl_FragCoord.x ) + 2.0 * floor( gl_FragCoord.y ), 5.0 ) > 1.5 ) discard;'); };
  // no fin is dead flat: each one gets its own slight twist and curl, growing toward the cut edge
  const curl = (tw, bow) => { const geo = finFlat.clone(), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const k = K.clamp(p.getX(i) / FL), q = p.getZ(i) / (FW / 2); p.setY(i, p.getY(i) + k * k * (tw * q + bow * q * q)); }
    return X.BufferGeometryUtils.toCreasedNormals(geo, 0.9); };
  const finGeos = [curl(0.0006, -0.0005), curl(-0.0004, 0.0006)];
  // the folded-in side panels on the end face (a second layer of film lying flat, pointing at the fin)
  const gus = zs => K.geo.extrude([[zs * 0.0304, 0.0062], [zs * 0.0304, HT - 0.0062], [zs * 0.013, FY]], 0.00014, { bevel: 0.00005 });
  [1, -1].forEach((sx, n) => {
    const e = new T.Group(); e.position.set(sx * (L / 2 + FT), FY, 0); e.rotation.y = sx > 0 ? 0 : Math.PI; all.add(e);
    for (const sg of sheets) { const m = K.mesh(sg, pull, { cast: false, receive: false }); m.renderOrder = 3; e.add(m); const h = K.mesh(sg, sheen, { cast: false, receive: false }); h.renderOrder = 4; e.add(h); m.userData.noAO = h.userData.noAO = true; }
    const fin = K.mesh(finGeos[n], seal, { receive: false, pos: [NL, 0, 0], rot: [0, 0, -DROOP[n]] }); fin.renderOrder = 4; fin.customDepthMaterial = finDepth; e.add(fin);
    const shine = K.mesh(finGeos[n], glint, { cast: false, receive: false, pos: [NL, 0, 0], rot: [0, 0, -DROOP[n]] }); shine.renderOrder = 5; e.add(shine); fin.userData.noAO = shine.userData.noAO = true;   // film this thin is not a solid for the AO pass (it left dark specks from far away)
    for (const zs of [1, -1]) { const m = K.mesh(gus(zs), film, { cast: false, receive: false, pos: [sx * (L / 2 + FT - 0.0001), 0, 0], rot: [0, sx * Math.PI / 2, 0] }); m.renderOrder = 3; m.userData.noAO = true; all.add(m); }
  });
  // the lap seam along the back
  const seam = K.mesh(K.geo.rbox(L * 0.92, 0.0066, 0.0005, 0.0002), film, { pos: [0, HT * 0.5, -(W / 2 + FT + 0.00012)], cast: false, receive: false }); seam.renderOrder = 3; seam.userData.noAO = true; all.add(seam);

  // ------------------------------------------------------------ the label (paper, stuck on the film, front long face)
  const LW = 0.086, LH = 0.0275, PX = 20000, LR = 0.0016, LZ = W / 2 + FT;
  const label = K.canvasPlane(LW, LH, PX, (c, Wp, Hp) => {
    const mm = PX / 1000, ink = '#1b1c1f', grey = '#6c6f75', hair = '#b4b5b3';
    c.fillStyle = '#fbfaf6'; c.fillRect(0, 0, Wp, Hp); c.textBaseline = 'alphabetic';
    const text = (s, x, y, size, { w = 400, ls = 0, col = ink, align = 'left' } = {}) => {
      c.font = `${w} ${(size * mm).toFixed(1)}px ${K.FONT}`; c.fillStyle = col; c.textAlign = align;
      if ('letterSpacing' in c) c.letterSpacing = (ls * size * mm).toFixed(2) + 'px';
      c.fillText(s, x * mm, y * mm); if ('letterSpacing' in c) c.letterSpacing = '0px';
    };
    const rule = (x0, y0, x1, y1, w = 0.11, col = hair) => { c.strokeStyle = col; c.lineWidth = Math.max(1, w * mm); c.beginPath(); c.moveTo(x0 * mm, y0 * mm); c.lineTo(x1 * mm, y1 * mm); c.stroke(); };
    // left: the name
    text('CHEDDAR', 4.6, 11.2, 6.7, { w: 500, ls: 0.055 });
    text('MATURE', 4.8, 15.6, 2.45, { ls: 0.3, col: grey });
    rule(4.8, 18.3, 37.6, 18.3);
    text('350 g', 4.7, 23.3, 3.7);
    text('KEEP REFRIGERATED', 37.6, 21.6, 1.2, { ls: 0.12, col: grey, align: 'right' });
    text('0 to 5 °C', 37.6, 23.3, 1.2, { ls: 0.12, col: grey, align: 'right' });
    rule(41.4, 4.6, 41.4, 23.4);
    // middle: a nutrition-style grid
    const gx0 = 44.8, gx1 = 63.4, gy0 = 7.9, gy1 = 23.4, rows = [['Energy', '1725 kJ'], ['Fat', '34.9 g'], ['Carbohydrate', '0.1 g'], ['Protein', '25.4 g'], ['Salt', '1.8 g']], rh = (gy1 - gy0) / rows.length;
    text('NUTRITION', gx0, 6.3, 1.45, { ls: 0.2, col: grey }); text('per 100 g', gx1, 6.3, 1.3, { col: grey, align: 'right' });
    c.strokeStyle = '#8f9194'; c.lineWidth = Math.max(1, 0.11 * mm); c.strokeRect(gx0 * mm, gy0 * mm, (gx1 - gx0) * mm, (gy1 - gy0) * mm);
    for (let i = 1; i < rows.length; i++) rule(gx0, gy0 + rh * i, gx1, gy0 + rh * i, 0.09, '#a9abac');
    rule(55.6, gy0, 55.6, gy1, 0.09, '#a9abac');
    rows.forEach((r, i) => { const y = gy0 + rh * (i + 0.5) + 0.52; text(r[0], gx0 + 0.9, y, 1.42, { col: '#3b3d42' }); text(r[1], gx1 - 0.8, y, 1.42, { col: '#3b3d42', align: 'right' }); });
    // right: a short EAN-13 barcode (a real code: 5 012345 678900)
    const code = '5012345678900', Lc = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'], par = 'LGGLLG';
    const inv = s => s.split('').map(b => b === '1' ? '0' : '1').join(''), rev = s => s.split('').reverse().join('');
    let bits = '101'; for (let i = 1; i <= 6; i++) { const l = Lc[+code[i]]; bits += par[i - 1] === 'L' ? l : rev(inv(l)); } bits += '01010'; for (let i = 7; i <= 12; i++) bits += inv(Lc[+code[i]]); bits += '101';
    const mod = 3, bx = Math.round(67.3 * mm), by = 5.2 * mm, bh = 12.2 * mm; c.fillStyle = ink;
    for (let i = 0; i < bits.length; i++) if (bits[i] === '1') { const guard = i < 3 || i >= 92 || (i >= 45 && i < 50); c.fillRect(bx + i * mod, by, mod, bh + (guard ? 1.3 * mm : 0)); }
    const dg = (s, cx) => text(s, bx / mm + cx, 20.9, 1.75, { ls: 0.06, align: 'center' });
    dg(code.slice(1, 7), (3 + 21) * mod / mm); dg(code.slice(7), (50 + 21) * mod / mm); text(code[0], bx / mm - 0.5, 20.9, 1.75, { align: 'right' });
    text('MILK', bx / mm + 95 * mod / mm, 23.4, 1.2, { ls: 0.2, col: grey, align: 'right' });
  }, { lit: true });
  const lout = K.geo.rrect(LW, LH, LR, 6), lgeo = new T.ShapeGeometry(new T.Shape(lout.map(p => new T.Vector2(p[0], p[1]))), 6);
  { const uv = lgeo.attributes.uv, pp = lgeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pp.getX(i) / LW + 0.5, pp.getY(i) / LH + 0.5); }
  label.geometry.dispose(); label.geometry = lgeo; label.material.roughness = 0.72; label.material.polygonOffset = true; label.material.polygonOffsetFactor = -1; label.material.polygonOffsetUnits = -1;
  label.position.set(0, HT / 2, LZ + 0.00018); label.receiveShadow = true; all.add(label);
  all.add(K.mesh(K.geo.extrude(lout, 0.00014), K.mat.paper('#fbfaf6'), { pos: [0, HT / 2, LZ - 0.00006], cast: false }));

  // where the tag sits: a mount that rocks with the block
  const slot = new T.Group(); slot.position.set(0, HT, 0); all.add(slot);
  return {
    group: g, slot,
    size: { L, W, H, top: HT, film: FT, label: [LW, LH], fin: FL, long: L + 2 * (FT + NL + FL) },
    anchors: { tag: [0, HT, 0], top: [0, HT, 0], centre: [0, HT / 2, 0], label: [0, HT / 2, LZ + 0.0002], name: [-0.022, HT / 2 + 0.005, LZ + 0.0002], barcode: [0.0314, HT / 2 + 0.0025, LZ + 0.0002],
      finR: [L / 2 + FT + NL + FL / 2, FY - DROOP[0] * FL / 2, 0], finL: [-(L / 2 + FT + NL + FL / 2), FY - DROOP[1] * FL / 2, 0], end: [L / 2 + FT, HT / 2, 0], corner: [L / 2 - R, HT, W / 2 - R] },
    view: { l: [0, 0.019, 0], d: 0.85, close: [0.03, 0.02, 0.03], keys: o.keys },
    defaults: { wobble: 0 },
    apply(s) {
      const a = s.wobble || 0, zp = a >= 0 ? -ZP : ZP;
      rock.position.set(0, RB * (1 - Math.cos(a)), zp); rock.rotation.x = -a; all.position.z = -zp;
    },
    demo(s, t) { const k = t - 4; s.wobble = (k > 0 && k < 2) ? 0.16 * Math.exp(-1.6 * k) * Math.cos(4 * Math.PI * k) : 0; },
  };
});
