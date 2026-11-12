// The security tag (acousto-magnetic label), the film's hero. Real size in metres: 46 mm long (X), 16.5 mm wide (Z).
// Thicknesses are drawn bigger than life so the camera can read the layers (the tray is 2.6 mm high instead of 2.2).
// Bottom to top: paper sticker base (a hair larger), white moulded tray, flat dark MAGNET (39.2 x 13 mm) on the floor, an
// air gap, a clear separator SHELF resting on a moulded step, and on it, loose with air all around and above, the thin
// bright metal STRIP (38 x 9 mm, so the magnet shows on both sides of it). A printed lid sits in a rebate with a hairline
// seam. No battery, no chip.
// Local frame: length along X, feet on y = 0, centred, front = +Z (the "near" long wall is the +Z one).
//
// state (every number is animatable; rest values in `defaults`):
//   lid 0..1        0 = closed lid with the barcode, 1 = lifted off about 1.6 mm and faded away
//   wall 0..1       1 = the near (+Z) long wall is cut away (section view); the corners keep their cut faces
//   len             strip strain, drawn bigger: scale.x = 1 + len about the centre (both tips move; use +-0.035 at most)
//   rattle 0..1     the strip sits loose: small hop and yaw, driven by rattleT (seconds since it arrived)
//   dim 0..1        a strip that hardly answers: greyer, duller
//   stripLift       metres: lifts the strip straight up out of the tray (beauty shot); the orange loops follow it
//   glowEnds 0..1   soft purple tint on the strip's two tips (the gate's field is pushing it)
//   shelf 0..1      visibility of the clear separator shelf (default 1)
//   xray 0..1       the magnet turns smoky see-through so its tiny arrows (domains) show, all pointing +X
//   dom 0..1        0 = every arrow points +X, 1 = arrows tumbled into mixed directions (wiped). The tumble starts at the
//                   +X end and runs down the magnet; the blue loops fade with it (gone by dom = 0.77)
//   blue 0..1       the magnet's own field: thin loops out of the +X end, back over / along the strip, into the -X end
//   ans 0..1, ansT  the strip's answer: thin orange loops that hug the strip and grow outward. One new loop is born
//                   each time ansT passes a whole number and lives for 4 units (so 4 are on screen, the line stays thin)
//   ansTilt         radians: plane of the orange loops. 0 = flat around the strip, lifting clear of the rim as they grow
//                   (default); PI/2 = upright along the strip
//   marks 0..1      the half-millimetre scale standing just behind the strip's +X end (middle long tick = resting end)
//   tagO 0..1       opacity of the housing (sticker, tray, lid, shelf): 0 leaves only strip + magnet
//   stripVis, magVis  booleans
// anchors: strip (centre, top face), stripEnd (+X tip), stripEndL (-X tip), magnet, magnetEnd, top, cavity, shelf, marks, lid
// preview any pose from any angle:  tools/preview.sh tag '{"keys":[six {az,el,d,l,ap}],"states":[six state objects],"yaw":2.19}'
//   (yaw turns the tag as it lies in the world: 2.19 = on the cheese in the bag; the key light is fixed in the world, so add
//   the same angle to every az)
KIT.asset('tag', (K, o) => {
  o = o || {};
  const T = THREE, g = new T.Group(), R = OM.rng(4242), clamp = K.clamp, PI = Math.PI;
  const SH = K._tagShared || (K._tagShared = {}), once = (k, f) => SH[k] || (SH[k] = f());   // textures every tag instance shares
  // ---------------------------------------------------------------- sizes (metres)
  const L = 0.046, WD = 0.0165, RC = 0.0014;                                   // footprint, corner radius
  const Y_ST = 0.0001, Y_FL = 0.00042, Y_T = 0.0026, LID_T = 0.00034, Y_R = Y_T - LID_T;   // sticker top, floor top, rim top, lid, rebate
  const WALL = 0.00085, RIM = 0.00042, STEP = 0.0005, GAP = 0.00006;           // wall, rim above the rebate, shelf step, lid seam
  const ML = 0.0392, MW = 0.013, MT = 0.0005, magTop = Y_FL + MT, magMid = Y_FL + MT / 2;
  const Y_SH = 0.00122, SH_T = 0.00014, RAIL_Y = Y_SH + SH_T;                   // shelf: bottom, thickness, the top the strip rests on
  const SL = 0.038, SW = 0.009, ST = 0.00009, stripY = RAIL_Y + ST / 2 + 0.00002, stripTop = stripY + ST / 2;
  const HH = Y_T;

  // ---------------------------------------------------------------- small geometry kit
  function Geo() {
    const P = [], N = [], U = [], I = [];
    const v = (x, y, z, nx, ny, nz, u = 0, w = 0) => { P.push(x, y, z); N.push(nx, ny, nz); U.push(u, w); return P.length / 3 - 1; };
    const tri = (a, b, c) => {                                                 // wound so the face looks where its normals look
      const ax = P[a * 3], ay = P[a * 3 + 1], az = P[a * 3 + 2], ux = P[b * 3] - ax, uy = P[b * 3 + 1] - ay, uz = P[b * 3 + 2] - az, vx = P[c * 3] - ax, vy = P[c * 3 + 1] - ay, vz = P[c * 3 + 2] - az;
      const d = (uy * vz - uz * vy) * (N[a * 3] + N[b * 3] + N[c * 3]) + (uz * vx - ux * vz) * (N[a * 3 + 1] + N[b * 3 + 1] + N[c * 3 + 1]) + (ux * vy - uy * vx) * (N[a * 3 + 2] + N[b * 3 + 2] + N[c * 3 + 2]);
      if (d >= 0) I.push(a, b, c); else I.push(a, c, b);
    };
    const quad = (a, b, c, d) => { tri(a, b, c); tri(a, c, d); };
    const build = () => { const G = new T.BufferGeometry(); G.setAttribute('position', new T.Float32BufferAttribute(P, 3)); G.setAttribute('normal', new T.Float32BufferAttribute(N, 3)); G.setAttribute('uv', new T.Float32BufferAttribute(U, 2)); G.setIndex(I); G.computeBoundingSphere(); return G; };
    return { v, tri, quad, build };
  }
  // rounded rectangle in the XZ plane with outward normals. The +Z straight side runs from point [n] to point [n + 1].
  function ringPath(w, d, r, n) {
    const pts = [];
    for (const [sx, sz, q] of [[1, 1, 0], [-1, 1, 1], [-1, -1, 2], [1, -1, 3]]) for (let i = 0; i <= n; i++) { const a = (q + i / n) * PI / 2, nx = Math.cos(a), nz = Math.sin(a); pts.push({ x: sx * (w / 2 - r) + nx * r, z: sz * (d / 2 - r) + nz * r, nx, nz }); }
    return pts;
  }
  // sweep a profile along a path. A profile is a list of runs; a run is a list of [inset, y, normalInward, normalUp].
  function sweep(G, pts, runs, closed, uv = [0, 0]) {
    const m = pts.length, cnt = closed ? m : m - 1;
    for (const run of runs) {
      const id = pts.map(p => run.map(([n, y, Nn, Ny]) => G.v(p.x - p.nx * n, y, p.z - p.nz * n, -p.nx * Nn, Ny, -p.nz * Nn, uv[0], uv[1])));
      for (let j = 0; j < cnt; j++) { const a = id[j], b = id[(j + 1) % m]; for (let k = 0; k < run.length - 1; k++) G.quad(a[k], b[k], b[k + 1], a[k + 1]); }
    }
  }
  // a flat face over a path, inset, at height y, looking up
  function fill(G, pts, inset, y, uvf) {
    const xz = pts.map(p => [p.x - p.nx * inset, p.z - p.nz * inset]);
    const id = xz.map(([x, z]) => { const q = uvf ? uvf(x, z) : [0, 0]; return G.v(x, y, z, 0, 1, 0, q[0], q[1]); });
    for (const [a, b, c] of T.ShapeUtils.triangulateShape(xz.map(([x, z]) => new T.Vector2(x * 1e3, z * 1e3)), [])) G.tri(id[a], id[b], id[c]);
  }
  // a thin tube along a curve drawn in the XY plane at depth z (true round section, open ends)
  function tube(pts, z, r, rad = 8) {
    const m = pts.length, P = new Float32Array(m * rad * 3), I = [];
    for (let i = 0; i < m; i++) {
      const a = pts[Math.max(i - 1, 0)], b = pts[Math.min(i + 1, m - 1)]; let tx = b[0] - a[0], ty = b[1] - a[1]; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
      for (let j = 0; j < rad; j++) { const ph = 2 * PI * j / rad, c = Math.cos(ph) * r, s = Math.sin(ph) * r, q = (i * rad + j) * 3; P[q] = pts[i][0] - ty * c; P[q + 1] = pts[i][1] + tx * c; P[q + 2] = z + s; }
    }
    for (let i = 0; i < m - 1; i++) for (let j = 0; j < rad; j++) { const a = i * rad + j, b = i * rad + (j + 1) % rad, c = a + rad, d = b + rad; I.push(a, b, d, a, d, c); }
    const G = new T.BufferGeometry(); G.setAttribute('position', new T.BufferAttribute(P, 3)); G.setIndex(I); G.computeBoundingSphere(); return G;
  }
  // the strip's and the shelf's light tent turns with the tag (about Y), so they look the same wherever the tag lies in the world.
  // Read at draw time, when every parent has its final place for this frame.
  function tentFollows() { const e = g.matrixWorld.elements; this.material.envMapRotation.y = Math.atan2(-e[2], e[0]); }
  const lineMesh = (geo, mat, order = 5) => { const m = new T.Mesh(geo, mat); m.castShadow = false; m.receiveShadow = false; m.userData.noAO = true; m.renderOrder = order; return m; };

  // ---------------------------------------------------------------- materials (own copies: several of them fade)
  const mBody = new T.MeshPhysicalMaterial({ color: new T.Color('#d4d6d8'), roughness: 0.52, metalness: 0, clearcoat: 0.22, clearcoatRoughness: 0.5 });
  const mLid = new T.MeshPhysicalMaterial({ color: new T.Color('#dcdddf'), roughness: 0.46, metalness: 0, clearcoat: 0.3, clearcoatRoughness: 0.35 });
  const mPaper = K.mat.paper('#c9c8c4').clone();
  const mMag = new T.MeshStandardMaterial({ color: new T.Color('#2a2b2f'), roughness: 0.52, metalness: 0.25 });
  const mMagX = mMag.clone(); mMagX.transparent = true; mMagX.depthWrite = false;
  // a light tent only the strip and the shelf reflect (the scene's own studio has a black card exactly where the film's
  // camera looks, which turned the strip dark): white dome falling off to a thin dark horizon, the same softboxes, and a
  // row of tall strip lights behind the tag whose streaks slide over the metal and the glass as the camera moves
  const tent = once('tent', () => {
    if (!K.renderer) return K.scene ? K.scene.environment : null;
    const es = new T.Scene(), cv = document.createElement('canvas'); cv.width = 8; cv.height = 512; const c = cv.getContext('2d'), gr = c.createLinearGradient(0, 0, 0, 512);
    for (const [v, col] of [[0, '#ffffff'], [0.25, '#e9e8e7'], [0.36, '#d0cfcd'], [0.43, '#b6b5b2'], [0.478, '#94928f'], [0.497, '#676562'], [0.512, '#bfbbb3'], [0.6, '#e6e2da'], [1, '#f0ece4']]) gr.addColorStop(v, col);
    c.fillStyle = gr; c.fillRect(0, 0, 8, 512); const dt = new T.CanvasTexture(cv); dt.colorSpace = T.SRGBColorSpace;
    es.add(new T.Mesh(new T.SphereGeometry(50, 32, 48), new T.MeshBasicMaterial({ map: dt, side: T.BackSide })));
    const card = (w, h, pos, v) => { const m = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ color: new T.Color(v, v, v), side: T.DoubleSide })); m.position.set(pos[0], pos[1], pos[2]); m.lookAt(0, 0, 0); es.add(m); };
    card(26, 14, [-22, 30, 18], 1.3); card(18, 26, [34, 14, 10], 1.15); card(30, 8, [0, 40, -24], 1.2); card(9, 26, [20, 5, 34], 0.03);   // the studio's softboxes, held just under white so the metal never blows out
    for (let a = -1.42; a < 1.95; a += 0.3) card(5, 28, [-42 * Math.sin(a), 20, -42 * Math.cos(a)], 1.15);   // tall strip lights behind the tag: the streaks that slide over the metal as the camera moves
    const pm = new T.PMREMGenerator(K.renderer), tex = pm.fromScene(es, 0.012).texture; pm.dispose(); return tex;
  });
  // the shelf is drawn as glass really looks: nothing but its reflection (added on top) and its polished edge
  const mShelf = new T.MeshPhysicalMaterial({ color: new T.Color('#000000'), roughness: 0.045, metalness: 0, envMap: tent, envMapIntensity: 0.52, transparent: true, opacity: 1, blending: T.AdditiveBlending, depthWrite: false });
  const SHELF_E = 0.62, mShelfE = new T.MeshPhysicalMaterial({ color: new T.Color('#e9f3f5'), roughness: 0.2, metalness: 0, envMap: tent, envMapIntensity: 0.9, transparent: true, opacity: SHELF_E, depthWrite: false });

  // things that fade: each keeps its solid material and a see-through twin; hollow shapes get a depth-only pre-pass so
  // their inside faces never show through while they fade
  const mPre = new T.MeshBasicMaterial({ colorWrite: false, transparent: true, depthWrite: true, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
  function fader(mesh, { pre = false, order = 9 } = {}) {
    const f = { mesh, solid: mesh.material, ghost: mesh.material.clone(), pre: null, cast: mesh.castShadow };
    f.ghost.transparent = true; f.ghost.depthWrite = !pre; mesh.renderOrder = order;
    if (pre) { f.pre = new T.Mesh(mesh.geometry, mPre); f.pre.renderOrder = order - 1; f.pre.castShadow = false; f.pre.receiveShadow = false; f.pre.visible = false; mesh.parent.add(f.pre); }
    return f;
  }
  function setFade(f, op, castOK = true) {
    const m = f.mesh, on = op > 0.004, part = on && op < 0.999;
    m.visible = on; m.material = part ? f.ghost : f.solid; if (part) f.ghost.opacity = op;
    m.castShadow = m.receiveShadow = f.cast && castOK && op > 0.5; m.userData.noAO = m.userData.noDepth = op < 0.5;   // (the soft-shadow map also draws receivers, so both flags go together)
    if (f.pre) { f.pre.visible = part; f.pre.userData.noAO = f.pre.userData.noDepth = op < 0.5; }
  }

  // ---------------------------------------------------------------- sticker base: paper, a hair larger than the tray
  const stickerGeo = K.geo.extrude(K.geo.rrect(L + 0.0015, WD + 0.0015, RC + 0.0005, 10), Y_ST - 0.00002, { bevel: 0.00001 }); stickerGeo.rotateX(-PI / 2); stickerGeo.translate(0, 0.00001, 0);
  const sticker = K.mesh(stickerGeo, mPaper); g.add(sticker);

  // ---------------------------------------------------------------- the moulded tray
  const NC = 14, path = ringPath(L, WD, RC, NC);
  const rT = 0.00024, cH = 0.00004, arc = [];
  for (let i = 0; i <= 8; i++) { const a = i / 8 * PI / 2; arc.push([rT - rT * Math.cos(a), Y_T - rT + rT * Math.sin(a), -Math.cos(a), Math.sin(a)]); }
  const wallRuns = [
    [[0, Y_FL, -1, 0], [0, Y_T - rT, -1, 0]],                                   // outer face
    arc,                                                                        // soft top outer edge
    [[rT, Y_T, 0, 1], [RIM - cH, Y_T, 0, 1]],                                   // rim
    [[RIM - cH, Y_T, 0.707, 0.707], [RIM, Y_T - cH, 0.707, 0.707]],             // tiny chamfer into the rebate
    [[RIM, Y_T - cH, 1, 0], [RIM, Y_R, 1, 0]],                                  // rebate wall
    [[RIM, Y_R, 0, 1], [WALL, Y_R, 0, 1]],                                      // the ledge the lid sits on
    [[WALL, Y_R, 1, 0], [WALL, Y_SH, 1, 0]],                                    // cavity wall
    [[WALL, Y_SH, 0, 1], [WALL + STEP, Y_SH, 0, 1]],                            // the step the shelf rests on
    [[WALL + STEP, Y_SH, 1, 0], [WALL + STEP, Y_FL, 1, 0]],                     // lower cavity wall (around the magnet)
  ];
  const capPoly = [[0, Y_FL], ...arc.map(a => [a[0], a[1]]), [RIM - cH, Y_T], [RIM, Y_T - cH], [RIM, Y_R], [WALL, Y_R], [WALL, Y_SH], [WALL + STEP, Y_SH], [WALL + STEP, Y_FL]];
  const capTris = T.ShapeUtils.triangulateShape(capPoly.map(([n, y]) => new T.Vector2(n * 1e3, y * 1e3)), []);
  const cutFace = (G, p, dir) => { const id = capPoly.map(([n, y]) => G.v(p.x - p.nx * n, y, p.z - p.nz * n, dir, 0, 0)); for (const [a, b, c] of capTris) G.tri(id[a], id[b], id[c]); };
  const GB = Geo();
  sweep(GB, path, [[[0, Y_ST, -1, 0], [0, Y_FL, -1, 0]]], true);                // floor slab edge
  fill(GB, path, 0, Y_FL);                                                      // floor
  const rest = [...path.slice(NC + 1), ...path.slice(0, NC + 1)];               // everything but the near straight wall
  sweep(GB, rest, wallRuns, false); cutFace(GB, rest[0], 1); cutFace(GB, rest[rest.length - 1], -1);
  const body = K.mesh(GB.build(), mBody); g.add(body);
  const GN = Geo(); sweep(GN, [path[NC], path[NC + 1]], wallRuns, false);
  const near = K.mesh(GN.build(), mBody); g.add(near);
  // a moulded material mark and part number on the inside of the far wall
  const mould = K.canvasPlane(0.0078, 0.00062, 150000, (c, W, H) => {
    c.clearRect(0, 0, W, H); c.font = `400 ${Math.round(H * 0.6)}px ${K.FONT}`; c.textBaseline = 'middle'; c.textAlign = 'center';
    const txt = '>PS<    AM 58    46165-02', d = H * 0.035;
    try { c.letterSpacing = Math.round(H * 0.07) + 'px'; } catch (e) {}
    c.fillStyle = 'rgba(40,38,34,0.42)'; c.fillText(txt, W / 2, H / 2 + d); c.fillStyle = 'rgba(255,255,255,0.9)'; c.fillText(txt, W / 2, H / 2 - d);
    c.globalCompositeOperation = 'destination-out'; c.fillStyle = 'rgba(0,0,0,0.8)'; c.fillText(txt, W / 2, H / 2);
  }, { lit: true });
  mould.material.transparent = true; mould.material.depthWrite = false; mould.castShadow = false; mould.userData.noAO = true; mould.renderOrder = 9.6;
  mould.position.set(-0.0075, (RAIL_Y + Y_R) / 2, -(WD / 2 - WALL) + 0.000008); g.add(mould);

  // ---------------------------------------------------------------- the magnet: a flat dark strip on the floor
  const mag = K.mesh(K.geo.rbox(ML, MT, MW, 0.00005), mMag, { pos: [0, magMid, 0] }); mag.renderOrder = 2; g.add(mag);
  // what the see-through magnet shows under itself: a plain pale sheet instead of its own (noisy) shadow on the floor
  const magBack = K.mesh(new T.PlaneGeometry(ML - 0.0001, MW - 0.0001), new T.MeshBasicMaterial({ color: new T.Color('#c6c7c9') }), { cast: false, receive: false, pos: [0, Y_FL + 0.000012, 0], rot: [-PI / 2, 0, 0] }); magBack.userData.noAO = true; magBack.visible = false; g.add(magBack);
  // its tiny arrows (magnetic domains): small flat darts lying inside the magnet, a regular grid
  const aL = 0.0018, hL = 0.00066, hR = 0.00023, sR = 0.00006;
  const shaft = new T.CylinderGeometry(sR, sR, aL - hL, 10); shaft.rotateZ(-PI / 2); shaft.translate(-hL / 2, 0, 0);
  const head = new T.ConeGeometry(hR, hL, 16); head.rotateZ(-PI / 2); head.translate(aL / 2 - hL / 2, 0, 0);
  const dart = THREEX.BufferGeometryUtils.mergeGeometries([shaft, head]); dart.scale(1, 0.6, 1);
  const NX = 14, NZ = 6, PX = 0.0027, PZ = 0.0022;   // six rows: the two outer ones show beside the strip, none hides under the centre field line
  const arrows = new T.InstancedMesh(dart, new T.MeshBasicMaterial({ color: new T.Color(K.col.blue), transparent: true, opacity: 0 }), NX * NZ);
  arrows.castShadow = false; arrows.receiveShadow = false; arrows.userData.noAO = true; arrows.renderOrder = 2.5; arrows.frustumCulled = false; g.add(arrows);
  const AD = [];
  for (let i = 0; i < NX; i++) for (let j = 0; j < NZ; j++) {
    const far = 1 - i / (NX - 1);                                               // the tumble starts at the +X end and runs down the magnet
    AD.push({ x: (i - (NX - 1) / 2) * PX, z: (j - (NZ - 1) / 2) * PZ, a: (R() < 0.5 ? -1 : 1) * (PI * 0.3 + PI * 1.4 * R() + (R() < 0.45 ? 2 * PI : 0)), delay: 0.34 * far + 0.21 * R() });
  }
  const dummy = new T.Object3D();

  // ---------------------------------------------------------------- the clear separator shelf (rests on the tray's step)
  const shW = L - 2 * WALL - 0.0003, shD = WD - 2 * WALL - 0.0003, sPath = ringPath(shW, shD, RC - WALL - 0.0001, 8), shB = 0.00002;
  const GT = Geo(); fill(GT, sPath, shB, RAIL_Y);
  const shelf = K.mesh(GT.build(), mShelf, { cast: false, receive: false }); shelf.renderOrder = 6; shelf.userData.noAO = true; shelf.onBeforeRender = tentFollows; g.add(shelf);
  const GE = Geo(); sweep(GE, sPath, [[[0.00018, RAIL_Y + 0.000003, 0, 1], [shB, RAIL_Y + 0.000003, 0, 1]], [[shB, RAIL_Y, -0.707, 0.707], [0, RAIL_Y - shB, -0.707, 0.707]], [[0, RAIL_Y - shB, -1, 0], [0, Y_SH, -1, 0]]], true);
  const shelfE = K.mesh(GE.build(), mShelfE, { cast: false, receive: false }); shelfE.renderOrder = 6.2; shelfE.userData.noAO = true; shelfE.onBeforeRender = tentFollows; g.add(shelfE);
  // never drawn in the picture: a solid block from floor to shelf top that only the ambient-shading and focus passes see, so the
  // thin gaps under the glass stay clean instead of grainy
  const shelfAO = K.mesh(new T.BoxGeometry(shW, RAIL_Y + 0.00004 - Y_FL, shD), new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false }), { cast: false, receive: false, pos: [0, (RAIL_Y + 0.00004 + Y_FL) / 2, 0] }); g.add(shelfAO);

  // ---------------------------------------------------------------- the strip: thin amorphous metal ribbon, loose on the shelf
  const brush = once('brush', () => {                                           // fine rolling lines along the length
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; const c = cv.getContext('2d'), r = OM.rng(77);
    c.fillStyle = '#808080'; c.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 2600; i++) { const y = r() * 512, x = r() * 1024 - 300, w = 200 + r() * 900; c.strokeStyle = r() < 0.5 ? `rgba(255,255,255,${0.02 + r() * 0.055})` : `rgba(0,0,0,${0.02 + r() * 0.055})`; c.lineWidth = 0.5 + r() * 1.1; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y + (r() - 0.5) * 1.2); c.stroke(); }
    const t = new T.CanvasTexture(cv); t.wrapS = t.wrapT = T.RepeatWrapping; t.colorSpace = T.NoColorSpace; t.anisotropy = 16; return t;
  });
  const STRIP_C = new T.Color('#dee0e8'), STRIP_DIM = new T.Color('#b2b3b7'), STRIP_ENV = 1.1, STRIP_R = 0.36;
  const stripMat = new T.MeshStandardMaterial({ color: STRIP_C.clone(), metalness: 1, roughness: STRIP_R, envMap: tent, envMapIntensity: STRIP_ENV, roughnessMap: brush, bumpMap: brush, bumpScale: 0.006 });
  const stripG = new T.Group(); stripG.position.set(0, stripY, 0); g.add(stripG);
  const stripGeo = K.geo.rbox(SL, ST, SW, 0.000022, 3);
  const strip = K.mesh(stripGeo, stripMat); strip.onBeforeRender = tentFollows; stripG.add(strip);
  // purple tint on the two tips: the same shape laid over the metal, multiplying its colour (so reflections stay)
  const tipGeo = stripGeo.clone(); { const p = tipGeo.attributes.position, uv = tipGeo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / SL + 0.5, 0.5); }
  const tipTex = once('tip', () => { const cv = document.createElement('canvas'); cv.width = 512; cv.height = 2; const c = cv.getContext('2d'), im = c.createImageData(512, 2);
    for (let x = 0; x < 512; x++) { const u = x / 511, d = Math.min(u, 1 - u), a = Math.pow(clamp(1 - d / 0.17), 1.6); for (let y = 0; y < 2; y++) { const i = (y * 512 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 255; im.data[i + 3] = Math.round(a * 255); } }
    c.putImageData(im, 0, 0); const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t; });
  const tipMat = new T.MeshBasicMaterial({ color: new T.Color('#8a55f2'), map: tipTex, transparent: true, opacity: 0, premultipliedAlpha: true, depthWrite: false, blending: T.CustomBlending, blendSrc: T.DstColorFactor, blendDst: T.OneMinusSrcAlphaFactor, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const tips = new T.Mesh(tipGeo, tipMat); tips.castShadow = false; tips.receiveShadow = false; tips.userData.noAO = true; tips.userData.noDepth = true; tips.renderOrder = 4; tips.visible = false; stripG.add(tips);

  // ---------------------------------------------------------------- lid: sits in the rebate, barcode printed on it
  const LI = RIM + GAP, lw = L - 2 * LI, ld = WD - 2 * LI, lc = 0.00003, lidTop = Y_T - 0.000012;
  const print = once('print', () => {
    const mpx = 20, ppm = mpx / 0.33, W = Math.round(lw * 1e3 * ppm), H = Math.round(ld * 1e3 * ppm), cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d');
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, W, H);
    const LC = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'], PAR = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
    let d = '201234567890', sum = 0; for (let i = 0; i < 12; i++) sum += (+d[i]) * (i % 2 ? 3 : 1); d += (10 - sum % 10) % 10;
    const inv = s => s.replace(/[01]/g, x => x === '0' ? '1' : '0'), rev = s => s.split('').reverse().join('');
    let bits = '101'; for (let i = 1; i <= 6; i++) bits += PAR[+d[0]][i - 1] === 'L' ? LC[+d[i]] : rev(inv(LC[+d[i]])); bits += '01010'; for (let i = 7; i <= 12; i++) bits += inv(LC[+d[i]]); bits += '101';
    const bh = Math.round(8.0 * ppm), ge = Math.round(1.0 * ppm), fs = Math.round(2.05 * ppm), x0 = Math.round(W / 2 - 95 * mpx / 2 + 2.5 * mpx), y0 = Math.round((H - (bh + ge * 0.3 + fs)) / 2);
    c.fillStyle = '#0f1012';
    for (let i = 0; i < 95; i++) if (bits[i] === '1') { const guard = i < 3 || (i >= 45 && i < 50) || i >= 92; c.fillRect(x0 + i * mpx, y0, mpx, bh + (guard ? ge : 0)); }
    c.font = `400 ${fs}px ${K.FONT}`; c.textAlign = 'center'; c.textBaseline = 'alphabetic'; const ty = y0 + bh + ge * 0.3 + fs * 0.8;
    c.fillText(d[0], x0 - 5.5 * mpx, ty); for (let i = 0; i < 6; i++) { c.fillText(d[1 + i], x0 + (3 + 3.5 + 7 * i) * mpx, ty); c.fillText(d[7 + i], x0 + (50 + 3.5 + 7 * i) * mpx, ty); }
    const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 16; return t;
  });
  mLid.map = print;
  const GL = Geo(), lidUV = (x, z) => [x / lw + 0.5, 0.5 - z / ld];
  fill(GL, path, LI + lc, lidTop, lidUV);
  sweep(GL, path, [[[LI + lc, lidTop, -0.707, 0.707], [LI, lidTop - lc, -0.707, 0.707]], [[LI, lidTop - lc, -1, 0], [LI, Y_R + 0.00001, -1, 0]]], true, [0.5, 0.006]);
  const lidG = new T.Group(); g.add(lidG);
  const lid = K.mesh(GL.build(), mLid); lidG.add(lid);
  // the hairline seam between lid and rim
  const GS = Geo(); sweep(GS, path, [[[RIM, Y_T - 0.000014, 0, 1], [LI, Y_T - 0.000014, 0, 1]]], true);
  const seamMat = new T.MeshBasicMaterial({ color: new T.Color('#8e8b84'), transparent: true, opacity: 1, depthWrite: false });
  const seam = K.mesh(GS.build(), seamMat, { cast: false, receive: false }); seam.userData.noAO = true; seam.renderOrder = 9.5; g.add(seam);

  const F = { sticker: fader(sticker, { order: 8.5 }), body: fader(body, { pre: true, order: 9 }), near: fader(near, { pre: true, order: 9 }), lid: fader(lid, { order: 10 }) };

  // ---------------------------------------------------------------- blue: the magnet's own field
  // four nested loops in the centre plane, two fainter ones over the strip's edges: out of the +X end, up, back over the
  // strip (the lowest one runs along it), down into the -X end
  const mBlue = new T.MeshBasicMaterial({ color: new T.Color(K.col.blue), transparent: true, opacity: 0 }), mBlue2 = mBlue.clone();
  const blueG = new T.Group(); g.add(blueG);
  const LS = ML / 2 - 0.0001, coneGeo = new T.ConeGeometry(0.00012, 0.001, 20);
  function loop(z, clear, bow, mat, r, heads) {
    const b = (stripTop + clear - magMid) / 2, pts = [], nU = 26, nT = 36, top = magMid + 2 * b;
    for (let i = 0; i <= nU; i++) { const a = -PI / 2 + PI * i / nU; pts.push([LS + b * Math.cos(a), magMid + b + b * Math.sin(a)]); }
    for (let i = 1; i < nT; i++) { const x = LS - 2 * LS * i / nT; pts.push([x, top + bow * (1 - (x / LS) * (x / LS))]); }
    for (let i = 0; i <= nU; i++) { const a = PI / 2 + PI * i / nU; pts.push([-LS + b * Math.cos(a), magMid + b + b * Math.sin(a)]); }
    blueG.add(lineMesh(tube(pts, z, r), mat));
    for (const x of heads) { const c = lineMesh(coneGeo, mat); c.position.set(x, top + bow * (1 - (x / LS) * (x / LS)), z); c.rotation.z = Math.atan2(2 * bow * x / (LS * LS), -1) - PI / 2; blueG.add(c); }
  }
  loop(0, 0.00008, 0, mBlue, 0.00005, [-0.0065, 0.0065]);
  loop(0, 0.0005, 0.00012, mBlue, 0.00005, [-0.0065, 0.0065]);
  loop(0, 0.00105, 0.0003, mBlue, 0.00005, [-0.0065, 0.0065]);
  loop(0, 0.00175, 0.00055, mBlue, 0.00005, [-0.0065, 0.0065]);
  for (const z of [-0.0045, 0.0045]) loop(z, 0.0005, 0.00012, mBlue2, 0.00004, [0]);

  // ---------------------------------------------------------------- orange: the strip's answer, rings that keep a thin line at any size
  const NR = 4, RS = 144, RR = 8, RING_R = 0.00013, GROW = 0.016, RISE = 0.0016;
  const cT = new Float32Array(RS), sT = new Float32Array(RS), cP = new Float32Array(RR), sP = new Float32Array(RR);
  for (let k = 0; k < RS; k++) { cT[k] = Math.cos(2 * PI * k / RS); sT[k] = Math.sin(2 * PI * k / RS); } for (let j = 0; j < RR; j++) { cP[j] = Math.cos(2 * PI * j / RR); sP[j] = Math.sin(2 * PI * j / RR); }
  const ringIdx = []; for (let k = 0; k < RS; k++) for (let j = 0; j < RR; j++) { const a = k * RR + j, b = k * RR + (j + 1) % RR, c = ((k + 1) % RS) * RR + j, d = ((k + 1) % RS) * RR + (j + 1) % RR; ringIdx.push(a, b, d, a, d, c); }
  const oG = new T.Group(); oG.position.set(0, stripY, 0); g.add(oG);
  const rings = [];
  for (let i = 0; i < NR; i++) {
    const G = new T.BufferGeometry(), pos = new T.BufferAttribute(new Float32Array(RS * RR * 3), 3); pos.setUsage(T.DynamicDrawUsage); G.setAttribute('position', pos); G.setIndex(ringIdx);
    const m = lineMesh(G, new T.MeshBasicMaterial({ color: new T.Color(K.col.orange), transparent: true, opacity: 0 })); m.frustumCulled = false; m.visible = false; oG.add(m); rings.push({ m, pos, arr: pos.array });
  }
  // a superellipse |x/a|^p + |y/b|^p = 1 in the ring's own XZ plane (p = 2 is an ellipse; higher hugs the strip's outline)
  function writeRing(rg, a, b, p) {
    const A = rg.arr, e = 2 / p, e2 = 2 - e;
    for (let k = 0; k < RS; k++) {
      const c = cT[k], s = sT[k], ac = Math.abs(c), as = Math.abs(s), sc = c < 0 ? -1 : 1, ss = s < 0 ? -1 : 1;
      const x = sc * a * Math.pow(ac, e), y = ss * b * Math.pow(as, e); let nx = sc * Math.pow(ac, e2) / a, ny = ss * Math.pow(as, e2) / b; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      for (let j = 0; j < RR; j++) { const q = (k * RR + j) * 3, w = RING_R * cP[j]; A[q] = x + nx * w; A[q + 1] = RING_R * sP[j]; A[q + 2] = y + ny * w; }
    }
    rg.pos.needsUpdate = true;
  }

  // ---------------------------------------------------------------- the half-millimetre scale behind the strip's +X end
  // a little white plate leaning back so the low camera reads it square on: 11 ticks, every second one longer, the
  // middle long tick exactly at the strip's resting end
  const MKW = 0.0056, MKH = 0.00105, MKT = 0.0001, MKP = 170000;
  const markG = new T.Group(); markG.position.set(SL / 2, RAIL_Y + 0.000005, -(SW / 2 + 0.0003)); markG.rotation.x = -0.3; g.add(markG);
  const plate = K.mesh(K.geo.rbox(MKW, MKH, MKT, 0.00003, 3), new T.MeshPhysicalMaterial({ color: new T.Color('#dcdee0'), roughness: 0.5, metalness: 0, clearcoat: 0.2, clearcoatRoughness: 0.4 }), { pos: [0, MKH / 2, -MKT / 2] }); markG.add(plate);
  const marks = K.canvasPlane(MKW, MKH, MKP, (c, W, H) => {
    c.clearRect(0, 0, W, H); const px = MKP / 1000; c.fillStyle = '#17181b';
    const tw = Math.max(2, Math.round(0.034 * px)), base = H - Math.round(0.085 * px);
    for (let i = 0; i <= 10; i++) { const x = W / 2 + (i - 5) * 0.5 * px, h = (i % 2 ? 0.62 : 0.36) * px; c.fillRect(Math.round(x - tw / 2), base - h, tw, h); }
    c.fillRect(Math.round(W / 2 - 5 * 0.5 * px - tw / 2), base - Math.round(0.022 * px), Math.round(10 * 0.5 * px + tw), Math.round(0.022 * px));
  });
  marks.material.transparent = true; marks.material.depthWrite = false; marks.castShadow = false; marks.userData.noAO = true; marks.renderOrder = 6.6;
  marks.position.set(0, MKH / 2, 0.000005); markG.add(marks);
  F.plate = fader(plate, { order: 6.4 });

  const smooth = K.ease.smooth;
  if (o.yaw) g.rotation.y = o.yaw;   // preview only: turn the tag as it lies in the world (the key light is fixed in the world, not to the camera)
  return {
    group: g, size: { L, WD, HH, SL, SW, ST, ML, MW, MT, floorY: Y_FL, magTop, shelfY: RAIL_Y, stripY, lidY: Y_R },
    view: { l: [0, 0.0012, 0], d: 0.24, close: [0.012, 0.0012, 0], keys: o.keys || [
      { az: 0.62, el: 0.42, d: 0.24, l: [0, 0.0012, 0] },                        // closed, three-quarter: the object itself
      { az: 1.15, el: 0.32, d: 0.09, l: [0.002, 0.0012, 0], ap: 0.0012 },        // the film's camera: low, along the strip
      { az: 0.12, el: 0.11, d: 0.1, l: [0.011, 0.0014, 0] },                     // side section through the cut wall
      { az: 0, el: 1.5, d: 0.24, l: [0, 0.0012, 0] },                            // straight down: strip narrower than magnet
      { az: 0.7, el: 0.26, d: 0.05, l: [0.0176, 0.0015, -0.0008], ap: 0.0016 },  // the +X tip against the scale
      { az: 1.25, el: 0.4, d: 0.075, l: [0.006, 0.0008, 0] },                    // into the magnet: its arrows
    ] },
    demo(s, t) {
      if (o.states) { Object.assign(s, o.states[Math.min(o.states.length - 1, Math.floor(t / 2))]); return; }   // preview any pose: tools/preview.sh tag '{"keys":[six cameras],"states":[six state objects]}'
      const k = (a, b) => clamp((t - a) / (b - a));
      s.lid = k(1.2, 2); s.wall = k(1.7, 2.1);
      if (t >= 2 && t < 4) { s.rattle = 1; s.rattleT = t - 2; s.blue = k(2.2, 2.45); }
      if (t >= 4 && t < 6) { s.blue = 1; s.dim = k(5, 5.3); s.shelf = 1 - k(5.6, 5.9); }
      if (t >= 6 && t < 8) { s.blue = 1; s.xray = k(6, 6.4); s.wall = 0; if (t > 7) { s.xray = 0; s.blue = 0; s.lid = 0; s.ans = 1; s.ansT = (t - 7) * 3; } }
      if (t >= 8 && t < 10) { s.marks = 1; s.len = 0.032 * Math.sin((t - 8.5) * 7 + 1.2); s.glowEnds = 0.5 + 0.5 * Math.sin((t - 8.5) * 7 + 1.2); s.ans = t > 9 ? 1 : 0; s.ansT = (t - 9) * 3; }
      if (t >= 10) { s.xray = 1; s.blue = 1; s.dom = k(10, 10.45); s.stripLift = 0.003 * K.ease.cubicInOut(k(11, 11.4)); s.tagO = 1 - 0.85 * k(11.3, 11.8); }
    },
    anchors: { strip: [0, stripTop, 0], stripEnd: [SL / 2, stripTop, 0], stripEndL: [-SL / 2, stripTop, 0], magnet: [0, magTop, 0], magnetEnd: [ML / 2, magTop, 0], top: [0, Y_T, 0], cavity: [0, RAIL_Y, 0],
      shelf: [0, RAIL_Y, SW / 2 + 0.0012], marks: [SL / 2, RAIL_Y + MKH * 0.6, -(SW / 2 + 0.0003)], lid: [0, Y_T, 0] },
    defaults: { lid: 0, wall: 0, len: 0, rattle: 0, rattleT: 0, xray: 0, dom: 0, blue: 0, ans: 0, ansT: 0, ansTilt: 0, marks: 0, dim: 0, shelf: 1, glowEnds: 0, stripLift: 0, tagO: 1, stripVis: true, magVis: true },
    apply(s) {
      const tagO = clamp(s.tagO), lidK = clamp(s.lid), wallK = clamp(s.wall);
      // housing
      setFade(F.sticker, tagO); setFade(F.body, tagO); setFade(F.near, tagO * (1 - smooth(wallK)));
      const lidO = tagO * (1 - smooth(clamp((lidK - 0.06) / 0.8)));
      setFade(F.lid, lidO, lidK < 0.02); lidG.position.y = 0.0016 * K.ease.cubicOut(lidK);
      seamMat.opacity = tagO * (1 - clamp(lidK * 12)); seam.visible = seamMat.opacity > 0.004;
      mould.material.opacity = tagO; mould.visible = tagO > 0.004;
      const shO = clamp(s.shelf) * tagO, shOn = shO > 0.5; mShelf.opacity = shO; mShelfE.opacity = SHELF_E * shO; shelf.visible = shelfE.visible = shO > 0.004;
      shelfAO.visible = shOn;
      // strip
      const lift = s.stripLift || 0, rt = s.rattleT || 0, ra = s.rattle || 0, dim = clamp(s.dim);
      stripG.visible = !!s.stripVis; stripG.scale.x = 1 + s.len;
      stripG.position.y = RAIL_Y + ST / 2 + 0.00002 + ra * 0.00022 * Math.abs(Math.sin(rt * 19)) * Math.exp(-rt * 2.2) + lift;
      stripG.rotation.y = ra * 0.012 * Math.sin(rt * 13) * Math.exp(-rt * 1.8); stripG.rotation.z = ra * 0.006 * Math.sin(rt * 23 + 1) * Math.exp(-rt * 2.5);
      stripMat.color.copy(STRIP_C).lerp(STRIP_DIM, dim); stripMat.envMapIntensity = STRIP_ENV * (1 - 0.3 * dim); stripMat.roughness = STRIP_R + 0.5 * dim;
      const ge = clamp(s.glowEnds); tips.visible = ge > 0.004; tipMat.opacity = 0.62 * ge;
      // magnet and its arrows
      const xr = clamp(s.xray), showMag = !!s.magVis;
      mag.visible = showMag; mag.material = xr > 0.004 ? mMagX : mMag; mMagX.opacity = 1 - 0.66 * xr; mag.castShadow = mag.receiveShadow = xr < 0.6;
      arrows.visible = magBack.visible = showMag && xr > 0.004; arrows.material.opacity = smooth(clamp(xr * 1.4));
      if (arrows.visible) {
        for (let i = 0; i < AD.length; i++) { const a = AD[i], k = K.ease.cubicInOut(clamp(s.dom * 1.55 - a.delay)); dummy.position.set(a.x, magMid, a.z); dummy.rotation.set(0, a.a * k, 0); dummy.updateMatrix(); arrows.setMatrixAt(i, dummy.matrix); }
        arrows.instanceMatrix.needsUpdate = true;
      }
      // blue loops
      const bo = clamp(s.blue) * (1 - clamp(s.dom * 1.3)); blueG.visible = bo > 0.004; mBlue.opacity = bo; mBlue2.opacity = bo * 0.42;
      // orange rings
      const ans = clamp(s.ans); oG.visible = ans > 0.004;
      if (oG.visible) {
        const tilt = s.ansTilt || 0, half = SW / 2 * Math.abs(Math.cos(tilt)) + ST / 2 * Math.abs(Math.sin(tilt));
        oG.position.y = stripY + lift; oG.rotation.x = -tilt;
        for (let i = 0; i < NR; i++) {
          const f = ((((s.ansT - i) % NR) + NR) % NR) / NR, gr = GROW * f, op = ans * Math.pow(1 - f, 0.85) * clamp(f * 9), rg = rings[i];
          rg.m.visible = op > 0.004; rg.m.material.opacity = op;
          if (rg.m.visible) { writeRing(rg, SL / 2 + 0.0005 + gr, half + 0.0005 + gr * 0.85, 2 + 4 * (1 - smooth(clamp(f * 3.2)))); rg.m.position.y = RISE * Math.cos(tilt) * smooth(clamp(gr / 0.0028)); }   // a flat ring lifts clear of the rim as it leaves the tray
        }
      }
      // scale
      const mk = clamp(s.marks); marks.material.opacity = mk; marks.visible = mk > 0.004; setFade(F.plate, mk);
    },
  };
});
