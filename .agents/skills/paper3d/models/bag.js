// Two paper things, real size in metres.
//
// 'bag'      a white paper shopping bag, 0.30 wide (X), 0.38 tall (Y), 0.12 deep (Z), two black rope handles.
//            Origin on the ground under the bag, front wall toward +Z.
//   options: near   0 (default) = in x-ray the gusset that is toward the camera fades with the front wall (it follows the camera);
//                   1 | -1 = always the +X | -X gusset
//            keys, state   preview only: six camera keys, and a state to hold (tools/preview.sh bag '{"state":{"xray":1}}')
//   state:   xray 0..1    the front wall and the near gusset fade to a faint veil, their edges and folds stay as thin lines. The faded walls
//                         stop throwing shadow, so the key light falls on what is inside
//            hang 0..1    0 = standing, handles up in two arches; 1 = carried: both handles pulled to the grip, the top pinched
//            swing        radians, about the grip, in the plane of the wide face (a carried bag swinging as you walk)
//            swingX       radians, about the grip, front to back
//            squash       0 = none; +0.1 = 10 % shorter and a little wider (it lands); negative stretches
//            shade 0|1    1 (default) = the walls and ropes throw shadows; 0 = they throw none, so nothing in the bag is ever shaded by it
//                         (the floor still takes the product's shadow and still drops the bag's shadow on the ground)
//            ao           -1 = auto (default), 0 = never, 1 = always in the contact-shade (AO) pass. Auto takes the bag out only when it hangs in
//                         the air with no other model within 1.2 m: alone on bare paper the pass paints a grey halo behind it
//   extras:  inst.body    the group that swings and squashes: add a product to it (bag-local coordinates) and it rides along
//   shadows: the kit's VSM shadow map draws every mesh that casts OR receives. Setting castShadow = false on a wall from outside is
//            understood here (the wall then stops receiving too, so it really leaves the map); doing it to other meshes has no effect
//
// 'receipt'  a long till receipt on thermal paper, 58 mm wide, option { len: 0.6 } metres, hanging from its top edge.
//            Origin on the ground under it; the top edge is at y = size.topY (= len + 0.12).
//   state:   stamp 0..1   a black-ink PAID stamp lands on the lower part (fade, then it settles to size)
//            curl 0..1    how far the bottom end rolls up (0 = flat end)
//            sway         radians, the strip swings from its top edge, the bottom trailing
//            tip -1..1    the top 17 cm stands free and leans over (+ = back, away from the print side; - = forward); everything below stays put.
//                         For a receipt sticking out of a bag: hold the strip where it passes the rim and let the top lean
//            ao           -1 = auto (default), 0 = never, 1 = always in the contact-shade (AO) pass. A thin strip alone in the air throws a grey AO halo
//                         on the ground seen close behind it; auto takes the strip out of the pass then, but never when another model is within 1.2 m
//   extras:  inst.pos(u, s)  local [x, y, z] of the point u (0 top .. 1 bottom) down the middle of the strip in state s
//   in a bag: parent the group to bag.body at [0.09, bag.anchors.mouth[1] + out - size.topY, 0.02] (out = how far it sticks out, about 0.2), curl 1,
//            tip about 0.8. With out 0.24 a 0.62 m strip just reaches the bag's floor; x 0.09 keeps it clear of the eyelets and of a product in the middle
KIT.asset('bag', (K, o) => {
  const T = THREE, X = THREEX, g = new T.Group(), near = o.near === -1 ? -1 : o.near === 1 ? 1 : 0, clamp = K.clamp, lerp = K.lerp;   // near 0 = the gusset toward the camera
  const W = 0.30, H = 0.38, D = 0.12, XW = W / 2, ZW = D / 2, R = 0.0025, XC = XW - R, ZC = ZW - R;
  const TH = 0.0013, HEM = 0.040, YB = 0.0002, YA = D / 2, IA = 0.003, I0 = 0.011, I1 = 0.046, EX = 0.05, YE = H - 0.021, FLOOR = 0.0022;
  const pivot = new T.Group(), body = new T.Group(), sq = new T.Group(); g.add(pivot); pivot.add(body); body.add(sq);

  // ---- the fold: the gusset's centre line goes in by foldI(y), and the wide walls come together to pay for it
  const foldI = (y, k) => IA + (I0 + (I1 - I0) * k - IA) * clamp((y - YA) / (H - YA));
  const zScale = (y, k) => y > YA ? Math.sqrt(Math.max(0.05, 1 - Math.pow((foldI(y, k) - IA) / ZW, 2))) : 1;
  function warp(src, dst, k) {
    for (let i = 0; i < src.length; i += 3) {
      const x = src[i], y = src[i + 1], z = src[i + 2]; let nx = x;
      if ((x < 0 ? -x : x) > XW - 0.006) { const tent = clamp(1 - Math.abs(z) / ZC), ins = y <= YA ? IA * Math.min(tent, Math.max(y, 0) / YA) : foldI(y, k) * tent; nx = x < 0 ? x + ins : x - ins; }
      dst[i] = nx; dst[i + 1] = y; dst[i + 2] = z * zScale(y, k);
    }
  }

  // ---- shell: panels built on the plain box, vertices shared inside a patch (smooth) and split between patches (a crisp fold).
  //      Four parts, each an outside and a liner: 0 = front wall and its two corners, 1 = the +X gusset, 2 = the -X gusset, 3 = back wall and its corners
  const mk = shade => ({ pos: [], uv: [], col: [], idx: [], map: new Map(), shade }), SUV = 4, TL = 0.0005;
  const innerShade = y => 0.66 + 0.30 * K.ease.smooth(clamp(y / (H - HEM)));                 // the liner gets darker toward the floor (it takes no cast shadows: thin white paper glows inside)
  const outerShade = y => 0.93 + 0.07 * K.ease.smooth(clamp(y / H));                         // the outside loses a little light toward the ground, so a white bag keeps its form on white paper
  const parts = [0, 1, 2, 3].map(() => ({ o: mk(outerShade), i: mk(innerShade) }));
  function vtx(P, patch, p, flat) {
    const key = patch + '|' + Math.round(p[0] * 1e6) + '|' + Math.round(p[1] * 1e6) + '|' + Math.round(p[2] * 1e6);
    let i = P.map.get(key); if (i !== undefined) return i;
    i = P.pos.length / 3; P.pos.push(p[0], p[1], p[2]);
    if (flat) P.uv.push(p[0] * SUV, p[2] * SUV); else if (Math.abs(p[0]) > XC - 0.004) P.uv.push(p[2] * SUV, p[1] * SUV); else P.uv.push(p[0] * SUV, p[1] * SUV);
    const c = P.shade(p[1]); P.col.push(c, c, c);
    P.map.set(key, i); return i;
  }
  function tri(P, patch, a, b, c, hint) {                       // hint: +1 = faces out of the bag, -1 = faces in, [x,y,z] = that way
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; if (nx * nx + ny * ny + nz * nz < 1e-18) return;
    const flat = typeof hint !== 'number', hx = flat ? hint[0] : (a[0] + b[0] + c[0]) * hint, hy = flat ? hint[1] : 0, hz = flat ? hint[2] : (a[2] + b[2] + c[2]) * hint;
    const ia = vtx(P, patch, a, flat), ib = vtx(P, patch, b, flat), ic = vtx(P, patch, c, flat);
    if (nx * hx + ny * hy + nz * hz < 0) P.idx.push(ia, ic, ib); else P.idx.push(ia, ib, ic);
  }
  const quad = (P, patch, a, b, c, d, hint) => { tri(P, patch, a, b, c, hint); tri(P, patch, a, c, d, hint); };
  const DL = 0.0013, rowsY = [YB, YA * 0.5, YA - DL, YA, YA + DL], NR = 18;
  for (let i = 1; i <= NR; i++) rowsY.push(YA + DL + (H - HEM - YA - DL) * i / NR);
  const linerY = rowsY.slice(), hemY = [rowsY[rowsY.length - 1], H - HEM * 0.5, H]; rowsY.push(H - HEM * 0.5, H);
  const dz = y => ZC * Math.max(0, 1 - y / YA);                // half-width of the fold triangle at the foot of the gusset
  const pWall = (sz, crease) => (y, off) => { const z = sz * (ZW - off), zc = sz * (ZW - off - (crease && !off && y === YA ? 0.0003 : 0)); return [[-XC, z], [-XC + 0.006, zc], [XC - 0.006, zc], [XC, z]]; };
  const pGus = sx => (y, off) => { const x = sx * (XW - off), d = dz(y); return [[x, ZC], [x, d], [x, -d], [x, -ZC]]; };
  const pCor = (sx, sz) => (y, off) => { const p = []; for (let i = 0; i <= 3; i++) { const a = i / 3 * Math.PI / 2; p.push([sx * (XC + (R - off) * Math.cos(a)), sz * (ZC + (R - off) * Math.sin(a))]); } return p; };
  function band(P, patches, path, ys, off, hint) {
    for (let j = 0; j < ys.length - 1; j++) { const a = path(ys[j], off), b = path(ys[j + 1], off);
      for (let i = 0; i < a.length - 1; i++) quad(P, Array.isArray(patches) ? patches[i] : patches, [a[i][0], ys[j], a[i][1]], [a[i + 1][0], ys[j], a[i + 1][1]], [b[i + 1][0], ys[j + 1], b[i + 1][1]], [b[i][0], ys[j + 1], b[i][1]], hint); }
  }
  function lip(P, patch, path, y, o0, o1, up) { const a = path(y, o0), b = path(y, o1);
    for (let i = 0; i < a.length - 1; i++) quad(P, patch, [a[i][0], y, a[i][1]], [a[i + 1][0], y, a[i + 1][1]], [b[i + 1][0], y, b[i + 1][1]], [b[i][0], y, b[i][1]], [0, up, 0]); }
  const pre = (pat, c) => Array.isArray(pat) ? pat.map(x => c + x) : c + pat;
  function panel(pi, path, pat) { const Po = parts[pi].o, Pi = parts[pi].i;
    band(Po, pat, path, rowsY, 0, 1); lip(Po, 'rimT', path, H, 0, TH, 1);                                  // outside, and the folded top edge
    band(Pi, pre(pat, 'l'), path, linerY, TL, -1); band(Pi, pre(pat, 'h'), path, hemY, TH, -1); lip(Pi, 'rimB', path, hemY[0], TL, TH, -1); }   // inside: the liner, the hem band and its lower edge
  panel(0, pWall(1, true), 'F'); panel(3, pWall(-1, false), 'K'); panel(1, pGus(1), ['F', 'T', 'K']); panel(2, pGus(-1), ['F', 'T', 'K']);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) panel(sz > 0 ? 0 : 3, pCor(sx, sz), sz > 0 ? 'F' : 'K');
  const paperK = K.mat.paper('#eff1f4').clone(); paperK.vertexColors = true; paperK.shadowSide = T.DoubleSide; paperK.map = K.canvasTex(K.paperCanvas(512, 33, { base: '#ffffff', grain: 4, fibres: 260 }), { repeat: 3 });
  const linerK = paperK.clone(); linerK.color.set('#fafcff'); const fading = m => { const c = m.clone(); c.transparent = true; return c; };
  const matO = [fading(paperK), fading(paperK), fading(paperK), paperK], matI = [fading(linerK), fading(linerK), fading(linerK), linerK];   // parts 0..2 can fade (x-ray); the back wall never does
  function finish(P, mat) {
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(new Float32Array(P.pos), 3)); geo.setAttribute('uv', new T.BufferAttribute(new Float32Array(P.uv), 2));
    geo.setAttribute('color', new T.BufferAttribute(new Float32Array(P.col), 3));
    geo.setIndex(P.idx); geo.computeVertexNormals(); geo.computeBoundingSphere(); geo.boundingSphere.radius *= 1.08;
    const m = K.mesh(geo, mat); m.userData.base = new Float32Array(P.pos); m.userData.col = new Float32Array(P.col); return m;
  }
  const outer = parts.map((p, i) => finish(p.o, matO[i])), inner = parts.map((p, i) => finish(p.i, matI[i])), shell = [...outer, ...inner];
  for (const m of inner) { m.castShadow = false; m.receiveShadow = false; } for (let i = 0; i < 3; i++) outer[i].renderOrder = inner[i].renderOrder = 3;
  sq.add(outer[3], inner[3], outer[0], inner[0], outer[1], inner[1], outer[2], inner[2]);
  // a corner (parts 0, 3) and the gusset next to it (parts 1, 2) are one sheet of paper: the corner's last row of vertices takes the gusset's normal
  const welds = []; for (const w of [0, 3]) for (const gp of [1, 2]) for (const side of ['o', 'i']) { const ma = (side === 'o' ? outer : inner)[w], mb = (side === 'o' ? outer : inner)[gp], bm = parts[gp][side].map;
    for (const [key, ia] of parts[w][side].map) { const ib = bm.get(key); if (ib !== undefined) welds.push(ma, ia, mb, ib); } }

  // ---- the same edges and folds as thin lines, for the x-ray: one set for the front wall, one for each gusset
  const yb = YB + 0.0004;
  function lines(build) { const segs = [], seg = (a, b, r = 0.00055, n = 24) => segs.push(new T.TubeGeometry(new T.LineCurve3(K.V(a), K.V(b)), n, r, 6, false)); build(seg);
    const geo = X.BufferGeometryUtils.mergeGeometries(segs), m = K.mesh(geo, new T.MeshBasicMaterial({ color: new T.Color('#4b4e55'), transparent: true, opacity: 0, depthWrite: false }), { cast: false, receive: false, soft: true });
    m.userData.base = new Float32Array(geo.attributes.position.array); m.renderOrder = 4; m.visible = false; sq.add(m); return m; }
  const gusLines = xe => seg => { seg([xe, 0, -ZW], [xe, H, -ZW], 0.00055, 30); seg([xe, H, ZW], [xe, H, 0]); seg([xe, H, 0], [xe, H, -ZW]); seg([xe, yb, ZW], [xe, yb, -ZW]);
    seg([xe, YA, 0], [xe, H, 0], 0.00045, 30); seg([xe, 0, ZC], [xe, YA, 0], 0.00045); seg([xe, 0, -ZC], [xe, YA, 0], 0.00045); seg([xe, H - HEM, ZW], [xe, H - HEM, 0], 0.0003); seg([xe, H - HEM, 0], [xe, H - HEM, -ZW], 0.0003); };
  const edgeM = [lines(seg => { seg([-XW, H, ZW], [XW, H, ZW]); seg([-XW, yb, ZW], [XW, yb, ZW]); seg([-XW, 0, ZW], [-XW, H, ZW], 0.00055, 30); seg([XW, 0, ZW], [XW, H, ZW], 0.00055, 30);
    seg([-XW, H - HEM, ZW], [XW, H - HEM, ZW], 0.0003); }), lines(gusLines(XW)), lines(gusLines(-XW))];   // no line for the flat-pack crease: it would run across the product inside

  // ---- the flat bottom: two long flaps that overlap, and the two fold triangles on top of them (seen from inside)
  const floorMat = K.mat.paper('#e2e0da'), E = 0.0012;
  const flatShape = (pts, y0, th) => { const ge = K.geo.extrude(pts.map(p => [p[0], -p[1]]), th); ge.rotateX(-Math.PI / 2); ge.translate(0, y0, 0); return ge; };
  sq.add(K.mesh(K.geo.rbox(W - 2 * E, 0.0008, D - 2 * E, 0.0003), floorMat, { pos: [0, 0.0010, 0] }));
  sq.add(K.mesh(flatShape([[-XW + E, -0.010], [XW - E, -0.010], [XW - E, ZW - E], [-XW + E, ZW - E]], 0.0014, 0.0004), floorMat));
  for (const sx of [-1, 1]) sq.add(K.mesh(flatShape([[sx * (XW - E), ZW - E], [sx * (XW - E), -(ZW - E)], [sx * (XW - ZW), 0]], 0.0014, FLOOR - 0.0014), floorMat));
  sq.add(K.mesh(flatShape([[-XW + E, -(ZW - E)], [XW - E, -(ZW - E)], [XW - E, 0.012], [-XW + E, 0.012]], 0.0002, 0.0004), floorMat));

  // ---- eyelets, knots and the two rope handles
  // the rope's lay as a normal map (tangent space, so it reads the same from 2 m and from 2 cm): three strands, each made of fine yarns
  const steel = K.mat.metal(K.col.steel, 0.3), ropeNor = (() => { const N = 256, cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d'), im = c.createImageData(N, N), PI = Math.PI;
    const h = (u, v) => 0.5 * Math.pow(Math.abs(Math.sin(PI * (u + 3 * v))), 0.6) + 0.05 * Math.sin(2 * PI * (16 * v - u)) + 0.02 * Math.sin(2 * PI * (37 * v + 2 * u));        // height in mm. u: one lay (10.5 mm) along the rope, v: once around it (17 mm)
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const u = (x + 0.5) / N, v = 1 - (y + 0.5) / N, e = 0.5 / N, i = (y * N + x) * 4;
      const nx = -(h(u + e, v) - h(u - e, v)) / (2 * e * 10.5), ny = -(h(u, v + e) - h(u, v - e)) / (2 * e * 17), l = Math.hypot(nx, ny, 1);
      im.data[i] = (nx / l * 0.5 + 0.5) * 255; im.data[i + 1] = (ny / l * 0.5 + 0.5) * 255; im.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; im.data[i + 3] = 255; }
    c.putImageData(im, 0, 0); return K.canvasTex(cv, { srgb: false }); })();
  const ropeMat = new T.MeshStandardMaterial({ color: new T.Color('#202124'), roughness: 0.86, metalness: 0, normalMap: ropeNor, normalScale: new T.Vector2(1, 1) });
  const RR = 0.0027, ringGeo = new T.TorusGeometry(0.0047, 0.0013, 14, 56), knotGeo = new T.TorusKnotGeometry(0.0031, 0.0021, 128, 12, 2, 3), tailGeo = new T.CapsuleGeometry(RR * 0.92, 0.008, 8, 18), holeGeo = new T.CircleGeometry(0.0037, 28), holeMat = K.mat.rubber('#0f1012');
  { const u = knotGeo.attributes.uv.array; for (let i = 0; i < u.length; i += 2) u[i] *= 5; }                                       // five lays along the knot's rope
  { const u = tailGeo.attributes.uv.array; for (let i = 0; i < u.length; i += 2) { const a = u[i]; u[i] = u[i + 1] * 1.5; u[i + 1] = a; } }   // a capsule's uv runs around first: turn it so the lay follows the tail
  const eyelets = [];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const eg = new T.Group();
    eg.add(K.mesh(ringGeo, steel, { pos: [0, 0, sz * 0.0005], scale: [1, 1, 0.5] }), K.mesh(ringGeo, steel, { pos: [0, 0, -sz * (TH + 0.0005)], scale: [1, 1, 0.5] }));
    eg.add(K.mesh(holeGeo, holeMat, { pos: [0, 0, sz * 0.0003], rot: [0, sz > 0 ? 0 : Math.PI, 0], cast: false }), K.mesh(holeGeo, holeMat, { pos: [0, 0, -sz * (TH + 0.0003)], rot: [0, sz > 0 ? Math.PI : 0, 0], cast: false }));   // the punched hole, dark inside the ring
    eg.add(K.mesh(knotGeo, ropeMat, { pos: [0, 0, -sz * 0.0088], rot: [0.5, 0.3 * sx, 0.4] }), K.mesh(tailGeo, ropeMat, { pos: [sx * 0.002, -0.0075, -sz * 0.0105], rot: [0.25 * sz, 0, 0.3 * sx] }));
    sq.add(eg); eyelets.push({ g: eg, sx, sz });
  }
  // a handle is one rope from knot to knot. Its 13 control points move between two poses: standing arch and pulled to the grip.
  const SREL = [[1, 0, -0.0088], [1, 0.0006, 0.0042], [0.992, 0.013, 0.0098], [0.965, 0.046, 0.0078], [0.87, 0.096, 0.0038], [0.53, 0.134, 0.0], [0, 0.147, -0.002]];   // [x / EX, y above the eyelet, z out from the wall]
  let GY = YE + 0.16;
  function ctrl(i, sz, k, zE, out) {
    const mir = i > 6, j = mir ? 12 - i : i, S = SREL[j], sx0 = S[0] * EX, sy0 = YE + S[1], sz0 = zE + S[2] + (sz > 0 ? 0.011 : -0.008) * Math.pow(S[1] / 0.147, 1.4);   // standing, both arches lean a little toward the front, like real rope
    const ax = EX - 0.004, ay = YE + 0.013, az = zE + 0.0085, bx = 0.013, by = GY - 0.0032, bz = 0.0046; let hx, hy, hz;
    if (j <= 1) { hx = sx0; hy = sy0; hz = sz0; } else if (j === 2) { hx = ax; hy = ay; hz = az; } else if (j === 5) { hx = bx; hy = by; hz = bz; } else if (j === 6) { hx = 0; hy = GY; hz = bz; }
    else { const f = j === 3 ? 0.34 : 0.68; hx = lerp(ax, bx, f); hy = lerp(ay, by, f); hz = lerp(az, bz, f); }
    out.set((mir ? -1 : 1) * lerp(sx0, hx, k), lerp(sy0, hy, k), sz * lerp(sz0, hz, k));
  }
  const NSEG = 160, RAD = 16, ringAt = u => u - 0.78 * Math.sin(2 * Math.PI * u) / (2 * Math.PI),      // rings sit closer together near the eyelets, where the rope turns tightly
     P = new T.Vector3(), Tn = new T.Vector3(), Tp = new T.Vector3(), Nn = new T.Vector3(), Bn = new T.Vector3(), Q = new T.Quaternion();
  const mkCurve = () => new T.CatmullRomCurve3(Array.from({ length: 13 }, () => new T.Vector3()), false, 'centripetal');
  function ropeLen(curve, k) { for (let i = 0; i < 13; i++) ctrl(i, 1, k, ZW * zScale(YE, k), curve.points[i]); let L = 0, px = 0, py = 0, pz = 0;
    for (let i = 0; i <= 300; i++) { curve.getPoint(i / 300, P); if (i) L += Math.hypot(P.x - px, P.y - py, P.z - pz); px = P.x; py = P.y; pz = P.z; } return L; }
  const probe = mkCurve(), L0 = ropeLen(probe, 0);
  { let lo = YE + 0.09, hi = YE + 0.24; for (let i = 0; i < 40; i++) { GY = (lo + hi) / 2; if (ropeLen(probe, 1) < L0) lo = GY; else hi = GY; } GY = Math.round((lo + hi) / 2 * 1000) / 1000; }   // the rope keeps its length
  // ring positions by length along the standing rope (so the twist of the rope has one pitch everywhere)
  const TT = new Float32Array(NSEG + 1); { ropeLen(probe, 0); const n = 600, cum = [0]; let px, py, pz;
    for (let i = 0; i <= n; i++) { probe.getPoint(i / n, P); if (i) cum.push(cum[i - 1] + Math.hypot(P.x - px, P.y - py, P.z - pz)); px = P.x; py = P.y; pz = P.z; }
    let j = 0; for (let i = 0; i <= NSEG; i++) { const want = cum[n] * ringAt(i / NSEG); while (j < n - 1 && cum[j + 1] < want) j++; TT[i] = (j + clamp((want - cum[j]) / (cum[j + 1] - cum[j]))) / n; } }
  function ropeGeo() {
    const n = (NSEG + 1) * (RAD + 1), geo = new T.BufferGeometry(), idx = [], uv = new Float32Array(n * 2);
    for (let i = 0; i <= NSEG; i++) for (let j = 0; j <= RAD; j++) { uv[(i * (RAD + 1) + j) * 2] = ringAt(i / NSEG) * L0 / 0.0105; uv[(i * (RAD + 1) + j) * 2 + 1] = j / RAD; }
    for (let i = 0; i < NSEG; i++) for (let j = 0; j < RAD; j++) { const a = i * (RAD + 1) + j, b = a + RAD + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute('normal', new T.BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setIndex(idx); return geo;
  }
  const handles = [1, -1].map(sz => { const m = K.mesh(ropeGeo(), ropeMat); m.frustumCulled = false; sq.add(m); return { sz, m, curve: mkCurve(), C: new Float32Array((NSEG + 1) * 3) }; });
  function poseHandle(h, k, zE) {
    for (let i = 0; i < 13; i++) ctrl(i, h.sz, k, zE, h.curve.points[i]);
    const C = h.C, pos = h.m.geometry.attributes.position, nor = h.m.geometry.attributes.normal, pa = pos.array, na = nor.array;
    for (let i = 0; i <= NSEG; i++) { h.curve.getPoint(TT[i], P); C[i * 3] = P.x; C[i * 3 + 1] = P.y; C[i * 3 + 2] = P.z; }
    for (let i = 0; i <= NSEG; i++) {
      const a = Math.max(0, i - 1) * 3, b = Math.min(NSEG, i + 1) * 3; Tn.set(C[b] - C[a], C[b + 1] - C[a + 1], C[b + 2] - C[a + 2]).normalize();
      if (i === 0) { Nn.set(1, 0, 0); Nn.addScaledVector(Tn, -Nn.dot(Tn)).normalize(); } else { Q.setFromUnitVectors(Tp, Tn); Nn.applyQuaternion(Q).normalize(); }
      Bn.crossVectors(Tn, Nn); Tp.copy(Tn);
      for (let j = 0; j <= RAD; j++) { const an = j / RAD * Math.PI * 2, ca = Math.cos(an), sa = Math.sin(an), nx = ca * Nn.x + sa * Bn.x, ny = ca * Nn.y + sa * Bn.y, nz = ca * Nn.z + sa * Bn.z, q = (i * (RAD + 1) + j) * 3;
        pa[q] = C[i * 3] + RR * nx; pa[q + 1] = C[i * 3 + 1] + RR * ny; pa[q + 2] = C[i * 3 + 2] + RR * nz; na[q] = nx; na[q + 1] = ny; na[q + 2] = nz; }
    }
    pos.needsUpdate = true; nor.needsUpdate = true;
  }
  function pose(k) {
    for (const m of shell) { warp(m.userData.base, m.geometry.attributes.position.array, k); m.geometry.attributes.position.needsUpdate = true; m.geometry.computeVertexNormals(); }
    for (let i = 0; i < welds.length; i += 4) { const na = welds[i].geometry.attributes.normal.array, nb = welds[i + 2].geometry.attributes.normal.array, a = welds[i + 1] * 3, b = welds[i + 3] * 3; na[a] = nb[b]; na[a + 1] = nb[b + 1]; na[a + 2] = nb[b + 2]; }
    for (const m of edgeM) { warp(m.userData.base, m.geometry.attributes.position.array, k); m.geometry.attributes.position.needsUpdate = true; }
    const zs = zScale(YE, k), slope = (zScale(YE + 0.004, k) - zScale(YE - 0.004, k)) * ZW / 0.008, zE = ZW * zs;
    for (const e of eyelets) { e.g.position.set(e.sx * EX, YE, e.sz * zE); e.g.rotation.x = e.sz * Math.atan(slope); }
    for (const h of handles) poseHandle(h, K.ease.smooth(k), zE);
  }
  pivot.position.set(0, GY, 0); body.position.set(0, -GY, 0);
  const VEIL = 0.07;                                             // what is left of a faded wall. Blending is in linear light and the wall is bright, so 7 % reads like a 12 to 15 % milky sheet
  let lastHang = -1, lastX = -1;
  const camL = new T.Vector3(), fade = [0, 0, 0, 0], wB = new T.Vector3(), own = [], casters = outer.map((m, p) => ({ m, p, allow: true, cast: true }));
  for (const h of handles) casters.push({ m: h.m, p: 3, allow: true, cast: true }); for (const e of eyelets) for (const m of e.g.children) if (m.castShadow) casters.push({ m, p: 3, allow: true, cast: true });   // ropes, rings and knots follow the back wall's rule
  sq.traverse(m => { if (m.isMesh && !m.userData.noAO) own.push(m); });                       // every solid part of the bag (the x-ray lines are never in the AO pass)
  let me = null; const wO = new T.Vector3();
  function lonely() {                                          // carried in the air with no other model near: there the screen-space AO only paints a grey halo on the paper behind the bag
    sq.updateWorldMatrix(true, false); wB.set(0, 0, 0).applyMatrix4(sq.matrixWorld); if (wB.y < 0.012) return false;
    if (!me) me = K.insts.find(a => a.group === g);
    for (const a of K.insts) if (a !== me && a.s && a.s.vis && a.group.getWorldPosition(wO).distanceTo(wB) < 1.2) return false;   // a neighbour's own halo would print on the bag if the bag left the pass
    return true;
  }
  return {
    group: g, body: sq,
    size: { W, H, D, gripY: GY, floorY: FLOOR, hem: HEM, handleTop: YE + 0.147, eyeletX: EX, eyeletY: YE, rope: RR * 2 },
    anchors: { inside: [0, FLOOR, 0], mouth: [0, H, 0], grip: [0, GY, 0], front: [0, H * 0.5, ZW], gusset: [(near || 1) * XW, H * 0.5, 0], gussetL: [-XW, H * 0.5, 0], gussetR: [XW, H * 0.5, 0], eyelet: [EX, YE, ZW], top: [0, YE + 0.147, 0] },
    view: { l: [0, 0.25, 0], d: 1.75, close: [0.05, 0.37, 0.05], keys: o.keys || [{ az: 0.6, el: 0.2, d: 2.2, l: [0, 0.36, 0] }, { az: -0.5, el: 0.12 }, { az: 1.45, el: 0.1, d: 2.2, l: [0, 0.36, 0] }, { az: 0.3, el: 0.9 }, { az: 0.5, el: 0.25, d: 0.7, l: [0.05, 0.37, 0.05] }, { az: -0.9, el: 0.3, d: 0.7, l: [0.05, 0.37, 0.05] }] },
    defaults: { xray: 0, hang: 0, swing: 0, swingX: 0, squash: 0, shade: 1, ao: -1 },
    apply(s) {
      const k = clamp(s.hang || 0), x = clamp(s.xray || 0), q = s.squash || 0, shade = s.shade == null || s.shade > 0.5;
      if (k !== lastHang) { pose(k); lastHang = k; }
      pivot.rotation.z = s.swing || 0; pivot.rotation.x = s.swingX || 0;
      sq.scale.set(1 + 0.5 * q, 1 - q, 1 + 0.5 * q); sq.position.y = k * GY * q;                       // squash from the ground when standing, from the grip when carried
      if (x !== lastX) { lastX = x;                                                                  // with the front open the inside fills with light: the liner's shade toward the floor eases off
        for (const m of inner) { const c = m.geometry.attributes.color, a = c.array, b = m.userData.col; for (let i = 0; i < a.length; i++) a[i] = b[i] + (0.88 + (b[i] - 0.66) / 3 - b[i]) * x; c.needsUpdate = true; } }
      // x-ray: the front wall, and the gusset that is toward the camera (or the one the option names)
      let wP = near > 0 ? 1 : near < 0 ? 0 : 0.5;
      if (!near && x > 0) { sq.updateWorldMatrix(true, false); sq.worldToLocal(camL.copy(K.camera.position)); camL.y -= H * 0.5; wP = K.ease.smooth(clamp(0.5 + camL.x / (camL.length() || 1) / 0.36)); }
      fade[0] = x; fade[1] = x * wP; fade[2] = x * (1 - wP);
      for (const c of casters) { const m = c.m;
        if (m.castShadow !== c.cast) c.allow = m.castShadow;                                         // somebody outside switched this part's shadow (world.js does): keep their choice
        c.cast = m.castShadow = m.receiveShadow = c.allow && shade && fade[c.p] < 0.02; }            // a faded wall lets the key light in. Both flags: the kit's VSM shadow map also draws every mesh that RECEIVES shadows
      for (let p = 0; p < 3; p++) { const f = fade[p], m = outer[p], li = inner[p];
        matO[p].opacity = 1 - (1 - VEIL) * f; matI[p].opacity = 1 - f; matO[p].depthWrite = matI[p].depthWrite = f < 0.002; li.visible = f < 0.998;   // the liner goes fully, so what is inside sits behind one veil, not two
        m.userData.noDepth = li.userData.noDepth = f > 0.5;
        edgeM[p].visible = f > 0.01; edgeM[p].material.opacity = 0.85 * f; }
      const inAO = s.ao > 0 || (s.ao < 0 && !lonely()); for (const m of own) m.userData.noAO = !inAO;
      for (let p = 0; p < 3; p++) if (fade[p] > 0.5) outer[p].userData.noAO = inner[p].userData.noAO = true;
    },
    demo(s, t) {
      // 0-1 standing | 1-2 carried, swinging | 2-4 x-ray | 4-5 carried (side) | 5-6 squash | 6-7 look inside | 7-8 inside, x-ray | 8-9 close | 9-10 close, carried | 10-12 close, x-ray
      s.hang = (t >= 1 && t < 2) || (t >= 4 && t < 5) || (t >= 9 && t < 10) || t >= 11 ? 1 : 0;
      s.swing = t >= 1 && t < 2 ? 0.24 : 0; s.swingX = t >= 4 && t < 5 ? 0.2 : 0; s.squash = t >= 5 && t < 6 ? 0.14 : 0;
      s.xray = (t >= 2 && t < 4) || (t >= 7 && t < 8) || t >= 10 ? 1 : 0;
      if (o.state) Object.assign(s, o.state);                                 // preview only: hold a state, e.g. tools/preview.sh bag '{"state":{"xray":1}}'
      g.position.y = s.hang > 0 && t < 8 ? 0.236 : 0;                                    // preview only: a carried bag is off the ground (the kit puts the group back every frame)
    },
  };
});

KIT.asset('receipt', (K, o) => {
  const T = THREE, g = new T.Group(), clamp = K.clamp, lerp = K.lerp;
  const RW = 0.058, LEN = clamp(+o.len || 0.6, 0.2, 1.5), TH = 0.00012, TOPY = LEN + 0.12;
  const NS = Math.round(LEN / 0.0032), NX = 4, DS = LEN / NS, LC = Math.min(0.12, LEN * 0.4), UC = 1 - LC / LEN;
  const PAPER = '#f8fafc', INK = '#232427', GREY = '#6c6e74';
  const px = Math.min(9000, Math.floor(8100 / LEN)), mm = px / 1000;
  let stampMM = LEN * 720;

  // ---- the print
  const front = K.canvasPlane(RW, LEN, px, (c, CW, CH) => {
    c.fillStyle = PAPER; c.fillRect(0, 0, CW, CH);
    { const r = OM.rng(58), im = c.getImageData(0, 0, CW, CH), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (r() - 0.5) * 5; d[i] += n; d[i + 1] += n; d[i + 2] += n; } c.putImageData(im, 0, 0); }
    const L = 4.8, Rt = 58 - 4.8, CX = 29, rows = [];
    const txt = (s, x, y, em, { al = 'left', wt = 400, ls = 0, col = INK } = {}) => { c.font = `${wt} ${(em * mm).toFixed(2)}px ${K.FONT}`; c.letterSpacing = (ls * em * mm).toFixed(2) + 'px'; c.textAlign = al; c.fillStyle = col; c.fillText(s, (x + (al === 'center' ? ls * em / 2 : 0)) * mm, y * mm); };
    const add = (h, draw, extra) => rows.push(Object.assign({ h, draw, flex: 0, opt: 0 }, extra));
    const gap = (h, flex = 0.5, opt = 0) => add(h, null, { flex, opt });
    const rule = (opt = 0) => add(0.4, y => { c.strokeStyle = INK; c.globalAlpha = 0.75; c.lineWidth = 0.28 * mm; c.setLineDash([1.3 * mm, 1.0 * mm]); c.beginPath(); c.moveTo(L * mm, (y + 0.2) * mm); c.lineTo(Rt * mm, (y + 0.2) * mm); c.stroke(); c.setLineDash([]); c.globalAlpha = 1; }, { opt });
    const pair = (a, b, em, h, opts = {}, opt = 0) => add(h, y => { txt(a, L, y + h * 0.74, em, opts); txt(b, Rt, y + h * 0.74, em, Object.assign({}, opts, { al: 'right' })); }, { opt });
    const mid = (s, em, h, opts = {}, opt = 0) => add(h, y => txt(s, CX, y + h * 0.74, em, Object.assign({ al: 'center' }, opts)), { opt });
    gap(9, 1);
    mid('SUPERMARKET', 5.3, 8, { ls: 0.16, wt: 500 }); mid('Store 0417  ·  Till 03', 2.8, 5, { col: GREY });
    gap(3); rule(); gap(3.5);
    pair('13 NOV 2026', '18:42', 3.3, 5.6); pair('RECEIPT 004318', 'CASHIER 12', 2.8, 5, { col: GREY });
    gap(3); rule(); gap(4);
    for (const [n, p] of [['WHOLE MILK 2 L', '1.95'], ['SOURDOUGH LOAF', '2.80'], ['EGGS X 6', '2.35'], ['CHEDDAR 350 G', '3.49'], ['TOMATOES 500 G', '1.60'], ['BANANAS 1.1 KG', '1.32'], ['OLIVE OIL 0.5 L', '5.75'], ['PENNE 500 G', '0.95'], ['DARK CHOC 100 G', '1.89'], ['COFFEE 250 G', '4.50']]) pair(n, p, 3.75, 7.3);
    gap(3); rule(); gap(4);
    pair('SUBTOTAL', '26.60', 3.5, 6.4); pair('ITEMS', '10', 2.8, 5, { col: GREY }); gap(2.5, 0.3);
    pair('TOTAL', '26.60', 5.6, 10, { wt: 500 });
    gap(3); rule(); gap(4);
    pair('CARD PAYMENT', '26.60', 3.75, 7); pair('CARD', '**** 4821', 2.8, 5, { col: GREY }); pair('CONTACTLESS', 'APPROVED', 2.8, 5, { col: GREY }); pair('AUTH CODE', '073915', 2.8, 5, { col: GREY });
    rule(1); gap(4, 0.5, 1); pair('NET', '25.33', 2.8, 5, { col: GREY }, 1); pair('VAT INCLUDED', '1.27', 2.8, 5, { col: GREY }, 1); gap(4, 0.5, 1);
    rule(2); gap(4, 0.5, 2); pair('POINTS THIS VISIT', '26', 2.8, 5, { col: GREY }, 2); pair('POINTS BALANCE', '1 482', 2.8, 5, { col: GREY }, 2); gap(4, 0.5, 2);
    gap(4, 1); add(30, null, { flex: 2.5, stamp: true }); gap(4, 1);                               // the clear place the stamp lands on
    rule(3); gap(4, 0.5, 3); mid('Returns within 30 days', 2.8, 5, { col: GREY }, 3); mid('with this receipt.', 2.8, 5, { col: GREY }, 3); gap(4, 0.5, 3);
    rule(4); gap(4.5, 0.5, 4); mid('5.00 OFF YOUR NEXT SHOP', 3.3, 6.6, {}, 4); mid('when you spend 40.00 or more', 2.8, 5, { col: GREY }, 4); mid('Valid until 27 NOV 2026', 2.8, 5, { col: GREY }, 4); mid('COUPON 7735 0417', 2.8, 5.4, { col: GREY, ls: 0.06 }, 4); gap(4.5, 0.5, 4);
    rule(5); gap(4.5, 0.5, 5); mid('HOW DID WE DO?', 3.1, 6.2, {}, 5); mid('Tell us and win a 50.00 gift card', 2.8, 5, { col: GREY }, 5); mid('SURVEY CODE 4821 0417 7735', 2.8, 5.4, { col: GREY }, 5); gap(4.5, 0.5, 5);
    rule(); gap(5, 1); mid('THANK YOU', 3.6, 6.5, { ls: 0.2 }); gap(5, 1);
    add(15, y => { const r = OM.rng(4821), mod = 0.37; let x = 7.5; c.fillStyle = INK; while (x < 50.5) { const w = (1 + Math.floor(r() * 3)) * mod; if (x + w > 50.5) break; c.fillRect(Math.round(x * mm), y * mm, Math.max(2, Math.round(w * mm)), 15 * mm); x += w + (1 + Math.floor(r() * 3)) * mod; } });
    mid('4 006381 333931', 2.8, 5.2, { ls: 0.08 });
    gap(24, 0.2);                                                             // the blank tail past the cutter: the part that rolls up
    // fit: drop the optional blocks if the paper is short, then share what is left between the gaps (most of it to the stamp's place)
    const sum = list => list.reduce((a, r) => a + r.h, 0); let use = rows.slice();
    for (let lvl = 5; lvl >= 1 && sum(use) > LEN * 1000; lvl--) use = use.filter(r => r.opt !== lvl);
    const total = sum(use), SC = Math.min(1, LEN * 1000 / total), slack = Math.max(0, LEN * 1000 - total), fl = use.reduce((a, r) => a + r.flex, 0);
    c.save(); c.translate(CW * (1 - SC) / 2, 0); c.scale(SC, SC); let y = 0;
    for (const r of use) { const h = r.h + slack * r.flex / fl; if (r.stamp) stampMM = (y + h / 2) * SC; if (r.draw) r.draw(y + (h - r.h) / 2); y += h; }
    c.restore();
  }, { lit: true });
  // thin thermal paper lets light through: part of its brightness does not depend on which way it faces, so it is not blown out in the key light and not grey in the shade
  Object.assign(front.material, { roughness: 0.82, emissive: new T.Color('#ffffff'), emissiveMap: front.material.map, emissiveIntensity: 0.30 }); front.material.color.setRGB(0.62, 0.62, 0.62);
  front.geometry.dispose(); front.geometry = new T.PlaneGeometry(RW, LEN, NX, NS); front.castShadow = true; front.receiveShadow = true; front.frustumCulled = false; g.add(front);
  const backMat = K.mat.paper('#dfddd7').clone(); backMat.side = T.BackSide; backMat.emissive = new T.Color('#dfddd7'); backMat.emissiveIntensity = 0.30; backMat.color.multiplyScalar(0.62);
  const back = K.mesh(new T.PlaneGeometry(RW, LEN, NX, NS), backMat, { cast: false }); back.frustumCulled = false; g.add(back);
  const edgeMat = new T.MeshStandardMaterial({ color: new T.Color('#dcdad4'), roughness: 0.9, side: T.DoubleSide }), edge = [-1, 1].map(sx => {
    const geo = new T.BufferGeometry(), n = (NS + 1) * 2, idx = []; for (let j = 0; j < NS; j++) { const a = j * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3)); geo.setAttribute('normal', new T.BufferAttribute(new Float32Array(n * 3), 3)); geo.setIndex(idx);
    const m = K.mesh(geo, edgeMat, { cast: false }); m.frustumCulled = false; g.add(m); return { sx, m }; });
  // the torn ends: a row of little teeth from the printer's cutter
  const toothMat = new T.MeshStandardMaterial({ color: new T.Color(PAPER), roughness: 0.82, side: T.DoubleSide }), toothGeo = (() => { const NT = 58, p = RW / NT, v = [];
    for (let i = 0; i < NT; i++) { const x = -RW / 2 + i * p; v.push(x, -0.00012, 0, x + p, -0.00012, 0, x + p / 2, 0.00046, 0); }
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(new Float32Array(v), 3)); geo.computeVertexNormals(); return geo; })();
  const teeth = [0, NS].map(j => { const m = K.mesh(toothGeo, toothMat, { cast: false }); m.matrixAutoUpdate = false; m.frustumCulled = false; g.add(m); return { j, m }; });

  // ---- the stamp: black ink, a thin rounded frame, PAID. Lies on the paper and follows its bend.
  const SWD = 0.046, SHT = 0.020, SX = 8, SY = 10, sS = stampMM / 1000;
  const stamp = K.canvasPlane(SWD, SHT, 22000, (c, CW, CH) => {
    c.clearRect(0, 0, CW, CH); const u = CW / 46, ink = '#1b1c1f', w = CW - 2.4 * u, h = CH - 2.4 * u, r = 3.4 * u, x0 = 1.2 * u, y0 = 1.2 * u;
    c.strokeStyle = c.fillStyle = ink; c.lineWidth = 0.7 * u; c.beginPath(); c.moveTo(x0 + r, y0); c.arcTo(x0 + w, y0, x0 + w, y0 + h, r); c.arcTo(x0 + w, y0 + h, x0, y0 + h, r); c.arcTo(x0, y0 + h, x0, y0, r); c.arcTo(x0, y0, x0 + w, y0, r); c.closePath(); c.stroke();
    c.font = `500 ${(10.6 * u).toFixed(1)}px ${K.FONT}`; c.letterSpacing = (2.4 * u).toFixed(1) + 'px'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('PAID', CW / 2 + 1.2 * u, CH / 2 + 0.55 * u);
    c.globalCompositeOperation = 'destination-out'; const R = OM.rng(77);                               // a rubber stamp never inks perfectly: tiny dry specks
    for (let i = 0; i < 2400; i++) { const x = R() * CW, y = R() * CH; c.globalAlpha = 0.25 + 0.55 * R(); c.beginPath(); c.arc(x, y, (0.04 + 0.15 * R() * R()) * u * (0.6 + 0.8 * x / CW), 0, 7); c.fill(); }
  }, { lit: true });
  stamp.geometry.dispose(); stamp.geometry = new T.PlaneGeometry(SWD, SHT, SX, SY); stamp.frustumCulled = false; stamp.renderOrder = 2;
  Object.assign(stamp.material, { transparent: true, opacity: 0, depthWrite: false, roughness: 0.9, envMapIntensity: 0.3, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }); stamp.visible = false; stamp.userData.noAO = stamp.userData.noDepth = true; g.add(stamp);

  // ---- the bend: tangent angle down the strip = lean + a slow S + the sway + the roll at the bottom end
  const CY = new Float32Array(NS + 1), CZ = new Float32Array(NS + 1), TA = new Float32Array(NS + 1), TW = new Float32Array(NS + 1);
  const LT = Math.min(0.17, LEN * 0.4), JT = Math.round(LT / DS);                 // the top end that can stand free above a bag's rim
  const theta = (u, curl, sway, tip) => 0.02 + 0.125 * Math.cos(2 * Math.PI * 0.95 * u + 0.2) * (1 - 0.15 * u) + sway * (0.5 + 0.5 * Math.pow(u, 1.3)) - curl * 1.35 * Math.PI * Math.pow(clamp((u - UC) / (1 - UC)), 2.4)
    + tip * 0.95 * (1 - K.ease.smooth(clamp(u * LEN / LT)));                         // the free top end leans over: the bend eases in from the tip and eases out where the strip is held
  function shape(curl, sway, tip = 0) { let y = TOPY, z = 0;
    for (let j = 0; j <= NS; j++) { const u = j / NS, th = theta(u, curl, sway, tip); if (j) { const tm = (th + TA[j - 1]) / 2; y -= DS * Math.cos(tm); z += DS * Math.sin(tm); } CY[j] = y; CZ[j] = z; TA[j] = th; TW[j] = (0.05 + 0.45 * sway) * Math.pow(u, 1.4); }
    if (tip) { let ry = TOPY, rz = 0, pt = theta(0, curl, sway, 0);                  // everything below the bend stays where it hangs: only the top end moves
      for (let j = 1; j <= JT; j++) { const th = theta(j / NS, curl, sway, 0), tm = (th + pt) / 2; ry -= DS * Math.cos(tm); rz += DS * Math.sin(tm); pt = th; }
      const dy = ry - CY[JT], dz = rz - CZ[JT]; for (let j = 0; j <= NS; j++) { CY[j] += dy; CZ[j] += dz; } } }
  const F = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, wx: 0, wz: 0, tx: 0, ty: 0, tz: 0 };
  function frame(s) {                                                        // centre, normal, width direction and tangent at arc length s
    const f = clamp(s / DS, 0, NS), j = Math.min(NS - 1, Math.floor(f)), fr = f - j, th = lerp(TA[j], TA[j + 1], fr), tw = lerp(TW[j], TW[j + 1], fr), ct = Math.cos(tw), st = Math.sin(tw), sn = Math.sin(th), cs = Math.cos(th);
    F.x = 0; F.y = lerp(CY[j], CY[j + 1], fr); F.z = lerp(CZ[j], CZ[j + 1], fr); F.nx = cs * st; F.ny = sn; F.nz = cs * ct; F.wx = ct; F.wz = -st; F.tx = sn * st; F.ty = -cs; F.tz = sn * ct; return F;
  }
  const M = new T.Matrix4(), vX = new T.Vector3(), vY = new T.Vector3(), vZ = new T.Vector3(), wB = new T.Vector3(), wO = new T.Vector3(); let me = null;
  function aoSafe() {                                                        // is the ground behind the strip's lowest point more than 1.3 m further along the camera's line of sight?
    let jm = 0; for (let j = 1; j <= NS; j++) if (CY[j] < CY[jm]) jm = j;
    g.updateWorldMatrix(true, false); wB.set(0, CY[jm], CZ[jm]).applyMatrix4(g.matrixWorld); const c = K.camera.position;
    if (c.y <= wB.y || wB.y / (c.y - wB.y) * c.distanceTo(wB) > 1.3) return true;
    if (!me) me = K.insts.find(a => a.group === g);                           // not alone (in a bag, at a till): stay in the pass, or the neighbours' halos print on the strip and it loses its contact shade
    for (const a of K.insts) if (a !== me && a.s && a.s.vis && a.group.getWorldPosition(wO).distanceTo(wB) < 1.2) return true;
    return false;
  }
  function writeStrip() {
    const fp = front.geometry.attributes.position, fn = front.geometry.attributes.normal, bp = back.geometry.attributes.position, bn = back.geometry.attributes.normal;
    for (let j = 0; j <= NS; j++) { const f = frame(j * DS);
      for (let i = 0; i <= NX; i++) { const xl = (i / NX - 0.5) * RW, q = (j * (NX + 1) + i) * 3, cx = xl * f.wx, cz = f.z + xl * f.wz, h = TH / 2;
        fp.array[q] = cx + h * f.nx; fp.array[q + 1] = f.y + h * f.ny; fp.array[q + 2] = cz + h * f.nz; bp.array[q] = cx - h * f.nx; bp.array[q + 1] = f.y - h * f.ny; bp.array[q + 2] = cz - h * f.nz;
        fn.array[q] = bn.array[q] = f.nx; fn.array[q + 1] = bn.array[q + 1] = f.ny; fn.array[q + 2] = bn.array[q + 2] = f.nz; }
      for (const e of edge) { const p = e.m.geometry.attributes.position.array, n = e.m.geometry.attributes.normal.array, xl = e.sx * RW / 2, q = j * 6, cx = xl * f.wx, cz = f.z + xl * f.wz, h = TH / 2;
        p[q] = cx + h * f.nx; p[q + 1] = f.y + h * f.ny; p[q + 2] = cz + h * f.nz; p[q + 3] = cx - h * f.nx; p[q + 4] = f.y - h * f.ny; p[q + 5] = cz - h * f.nz;
        n[q] = n[q + 3] = e.sx * f.wx; n[q + 1] = n[q + 4] = 0; n[q + 2] = n[q + 5] = e.sx * f.wz; }
    }
    fp.needsUpdate = fn.needsUpdate = bp.needsUpdate = bn.needsUpdate = true; for (const e of edge) { e.m.geometry.attributes.position.needsUpdate = true; e.m.geometry.attributes.normal.needsUpdate = true; }
    for (const t of teeth) { const f = frame(t.j * DS), out = t.j ? 1 : -1; vX.set(f.wx, 0, f.wz); vY.set(out * f.tx, out * f.ty, out * f.tz); vZ.crossVectors(vX, vY); M.makeBasis(vX, vY, vZ).setPosition(0, f.y, f.z); t.m.matrix.copy(M); t.m.matrixWorldNeedsUpdate = true; }
  }
  function writeStamp(v) {
    const on = v > 0.002; stamp.visible = on; if (!on) return;
    stamp.material.opacity = 0.93 * clamp(v / 0.35); const sc = 1 + 0.2 * (1 - K.ease.quartOut(v)), p = stamp.geometry.attributes.position, n = stamp.geometry.attributes.normal, lift = TH / 2 + 0.00006;
    for (let j = 0; j <= SY; j++) { const f = frame(sS + (j / SY - 0.5) * SHT * sc);
      for (let i = 0; i <= SX; i++) { const xl = (i / SX - 0.5) * SWD * sc, q = (j * (SX + 1) + i) * 3; p.array[q] = xl * f.wx + lift * f.nx; p.array[q + 1] = f.y + lift * f.ny; p.array[q + 2] = f.z + xl * f.wz + lift * f.nz; n.array[q] = f.nx; n.array[q + 1] = f.ny; n.array[q + 2] = f.nz; } }
    p.needsUpdate = n.needsUpdate = true;
  }
  const defaults = { stamp: 0, curl: 0.5, sway: 0, tip: 0, ao: -1 };
  const solids = [front, back, edge[0].m, edge[1].m, teeth[0].m, teeth[1].m];
  let lc = -9, lw = -9, lv = -9, lt = -9;
  shape(defaults.curl, 0);
  const at = s => { const f = frame(s); return [0, f.y, f.z]; }, aStamp = (() => { const f = frame(sS); return [0.0005 * f.nx, f.y + 0.0005 * f.ny, f.z + 0.0005 * f.nz]; })(), aBottom = at(LEN), aHead = at(Math.min(LEN * 0.2, 0.07)), aCurl = at(LEN - LC * 0.45);
  return {
    group: g,
    size: { W: RW, len: LEN, topY: TOPY, stampW: SWD, stampH: SHT, stampAt: sS / LEN },
    anchors: { top: [0, TOPY, 0], bottom: aBottom, stampPos: aStamp, header: aHead },                 // bottom and stampPos are given for the rest pose (curl 0.5, no sway); use pos(u, s) for a moving one
    view: { l: [0, TOPY - LEN / 2, 0], d: LEN * 3.1, close: aStamp, keys: o.keys || [{ az: 0.45, el: 0.12 }, { az: -0.5, el: 0.1 }, { az: 1.5, el: 0.06 }, { az: 0.22, el: 0.16, d: 0.52, l: aHead }, { az: 0.28, el: 0.1, d: 0.34, l: aStamp }, { az: -1.0, el: 0.16, d: 0.42, l: aCurl }] },
    defaults,
    pos(u, s = defaults) { shape(clamp(s.curl ?? defaults.curl), s.sway || 0, clamp(s.tip || 0, -1, 1)); lc = -9; const f = frame(clamp(u) * LEN); return [0, f.y, f.z]; },
    apply(s) {
      const curl = clamp(s.curl || 0), sway = s.sway || 0, v = clamp(s.stamp || 0), tip = clamp(s.tip || 0, -1, 1);
      if (curl !== lc || sway !== lw || tip !== lt) { shape(curl, sway, tip); writeStrip(); lc = curl; lw = sway; lt = tip; lv = -9; }
      if (v !== lv) { writeStamp(v); lv = v; }
      const ao = s.ao < 0 ? aoSafe() : !!s.ao; for (const m of solids) m.userData.noAO = !ao;
    },
    demo(s, t) {
      // 0-2 hanging | 2-4 stamped | 4-6 side: swaying, fully curled | 6-8 close: the head | 8-10 close: the stamp lands | 10-12 close: the end, curled then flat
      s.stamp = t >= 2 && t < 4 ? 1 : t >= 8 && t < 10 ? K.seg(t, 8.2, 9.2) : t >= 10 ? 1 : 0;
      s.sway = t >= 4 && t < 5 ? 0.22 : 0; s.curl = t >= 4 && t < 6 ? 1 : t >= 11 ? 0 : 0.5; s.tip = t >= 5 && t < 6 ? 1 : 0;
      if (o.state) Object.assign(s, o.state);                                 // preview only: hold a state
    },
  };
});
