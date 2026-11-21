// hand.js (reel 40 v3). Ali on v2: "start with the hand, cut it open, show the veins then go inside".
//
// 'hand'  a real LEFT hand and forearm lying palm-down on the paper: fingers toward -Z, thumb on +X, the forearm running
//         back along +Z out of frame. One smooth skin built from a signed distance field (forearm, carpus, metacarpals, palm
//         pad, thenar and hypothenar, five fingers with knuckles) meshed with surface nets, plus nails and colour variation.
//         THE CUT: the near half (+X) of the wrist round the watch is sliced away by a plane that sweeps in from the skin to
//         the centre line (x = 0). The cut face is exact: a shader paints it from one anatomy (skin, dermis with capillary
//         loops, fat lobules, fascia, tendons, muscle fibres, the radius and ulna with marrow, the radial / ulnar arteries
//         and the dorsal veins) wherever the eye looks through the cut, at the right depth. The vessels right under the watch
//         are real 3D tubes on the centre line: the cut opens them lengthwise and you see the blood cells flowing.
//   Local frame: metres, Y up, origin on the paper under the watch centre line's wrist joint. The watch sits at z = ZW.
//   options: none needed.  API: inst.ZW, inst.top(z) (skin top y at x = 0), inst.watchPose() -> { pos, quat } for a band
//            'worn' watch with wrist {w: 2a, h: 2b, p: 2.5}, inst.wrist (that wrist), inst.vessels [{ y(z), r, kind }],
//            inst.cutBox {z0, z1}, inst.local(worldVec) / inst.world(localVec), inst.cutMaterial(mat) (patch any material so it
//            is cut by the same plane, e.g. the watch band).
//   state: cut 0..1 (the plane sweeps from the skin, 0, to the centre line, 1) | laser 0..1 (the glowing cutting sheet) |
//          flow (blood speed, 1) | beat 0..1 (vessels swell) | slosh (m, the blood rocks with the arm) | wet 0..1 (fresh cut shine)
(function () {
  const T = THREE;
  const C = c => new T.Color(c);
  const sm = x => { x = x < 0 ? 0 : x > 1 ? 1 : x; return x * x * (3 - 2 * x); };
  const fr = x => x - Math.floor(x);

  // ------------------------------------------------------------------------------------------------ the forearm profile
  // (the same formula is written again in GLSL below: keep them identical)
  const ZW = 0.030;
  const armA = z => { z = Math.min(0.32, Math.max(-0.03, z)); return 0.0281 + 0.030 * z + 0.05 * z * z; };
  const armB = z => { z = Math.min(0.32, Math.max(-0.03, z)); return 0.01875 + 0.040 * z + 0.03 * z * z; };
  const armE = z => Math.max(2.15, 2.5 - 1.5 * Math.max(0, Math.min(0.32, z) - 0.06));
  const armSD = (x, y, z) => {
    const a = armA(z), b = armB(z), p = armE(z), yc = b + 0.0003;
    const ax = Math.max(Math.abs(x) / a, 1e-6), ay = Math.max(Math.abs(y - yc) / b, 1e-6), px = Math.pow(ax, p), py = Math.pow(ay, p), S = px + py;
    const f = Math.pow(S, 1 / p) - 1, k = Math.pow(S, 1 / p - 1), gx = k * px / ax / a, gy = k * py / ay / b;
    return f / Math.hypot(gx, gy);
  };
  const top = z => 2 * armB(z) + 0.0003;

  // ------------------------------------------------------------------------------------------------ SDF primitives
  const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
  const ell = (x, y, z, c, r) => { const px = (x - c[0]) / r[0], py = (y - c[1]) / r[1], pz = (z - c[2]) / r[2], k0 = Math.hypot(px, py, pz), k1 = Math.hypot(px / r[0], py / r[1], pz / r[2]); return k1 < 1e-9 ? -Math.min(...r) : k0 * (k0 - 1) / k1; };
  const rbox = (x, y, z, c, b, r) => { const qx = Math.abs(x - c[0]) - b[0], qy = Math.abs(y - c[1]) - b[1], qz = Math.abs(z - c[2]) - b[2];
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r; };
  // round cone between A (r1) and B (r2) (exact, Inigo Quilez)
  const rcone = (A, B, r1, r2) => { const bx = B[0] - A[0], by = B[1] - A[1], bz = B[2] - A[2], l2 = bx * bx + by * by + bz * bz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
    const lo = [Math.min(A[0], B[0]) - Math.max(r1, r2), Math.min(A[1], B[1]) - Math.max(r1, r2), Math.min(A[2], B[2]) - Math.max(r1, r2)], hi = [Math.max(A[0], B[0]) + Math.max(r1, r2), Math.max(A[1], B[1]) + Math.max(r1, r2), Math.max(A[2], B[2]) + Math.max(r1, r2)];
    const f = (x, y, z) => { const pax = x - A[0], pay = y - A[1], paz = z - A[2], yy = pax * bx + pay * by + paz * bz, zz = yy - l2;
      const qx = pax * l2 - bx * yy, qy = pay * l2 - by * yy, qz = paz * l2 - bz * yy, x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2, k = Math.sign(rr) * rr * rr * x2;
      if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
      if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
      return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1; };
    f.lo = lo; f.hi = hi; return f; };
  const boxDist = (f, x, y, z) => Math.hypot(Math.max(f.lo[0] - x, 0, x - f.hi[0]), Math.max(f.lo[1] - y, 0, y - f.hi[1]), Math.max(f.lo[2] - z, 0, z - f.hi[2]));

  // ------------------------------------------------------------------------------------------------ the hand (left, palm down)
  const KN = [[0.0262, 0.0158, -0.116], [0.0082, 0.0161, -0.121], [-0.0098, 0.0158, -0.117], [-0.0262, 0.0150, -0.108]];   // knuckles: index, middle, ring, little
  const FING = [ // lengths of the 3 phalanges, radii at the 4 joints, splay (rad, + toward the thumb)
    { L: [0.041, 0.024, 0.0205], r: [0.0079, 0.0072, 0.0067, 0.0060], sp: 0.17 },
    { L: [0.045, 0.028, 0.0215], r: [0.0082, 0.0075, 0.0070, 0.0062], sp: 0.04 },
    { L: [0.042, 0.026, 0.0205], r: [0.0077, 0.0070, 0.0065, 0.0058], sp: -0.11 },
    { L: [0.033, 0.0195, 0.0185], r: [0.0067, 0.0062, 0.0057, 0.0051], sp: -0.27 }];
  const PITCH = [0.0, 0.13, 0.32];
  const fingerJoints = FING.map((F, i) => { const P = [KN[i]]; let p = KN[i];
    for (let s = 0; s < 3; s++) { const th = PITCH[s], d = [Math.sin(F.sp) * Math.cos(th), -Math.sin(th), -Math.cos(F.sp) * Math.cos(th)]; p = [p[0] + d[0] * F.L[s], p[1] + d[1] * F.L[s], p[2] + d[2] * F.L[s]]; P.push(p); }
    return P; });
  const fingers = fingerJoints.map((P, i) => { const r = FING[i].r; return [rcone(P[0], P[1], r[0], r[1]), rcone(P[1], P[2], r[1], r[2]), rcone(P[2], P[3], r[2], r[3])]; });
  const THUMB = [[0.0235, 0.0112, -0.050], [0.0445, 0.0118, -0.081], [0.0565, 0.0100, -0.1045], [0.0640, 0.0084, -0.1255]], TR = [0.0118, 0.0104, 0.0096, 0.0084];
  const thumb = [0, 1, 2].map(s => rcone(THUMB[s], THUMB[s + 1], TR[s], TR[s + 1]));
  const meta = KN.map((k, i) => rcone([k[0] * 0.55 + 0.001, 0.0158, -0.052], [k[0], k[1] - 0.0004, k[2] + 0.004], 0.0072, i === 3 ? 0.0074 : 0.0083));
  const handSD = (x, y, z) => {
    let d = armSD(x, y, z); if (z > 0.075) return z > 0.56 ? Math.max(d, z - 0.56) : d;
    { const c = -0.030 - z, k = 0.012, h = Math.max(k - Math.abs(d - c), 0) / k; d = Math.max(d, c) + h * h * k * 0.25; }   // the forearm ends in the wrist (a smooth cap)
    d = smin(d, ell(x, y, z, [0.002, 0.0148, -0.046], [0.0285, 0.0138, 0.023]), 0.012);
    if (z < 0.005) {
      let palm = rbox(x, y, z, [0.0, 0.0108, -0.086], [0.0305, 0.0058, 0.026], 0.0062);
      for (const m of meta) palm = smin(palm, m(x, y, z), 0.008);
      palm = smin(palm, ell(x, y, z, [0.026, 0.0108, -0.066], [0.0175, 0.0098, 0.0225]), 0.008);
      palm = smin(palm, ell(x, y, z, [-0.0275, 0.0098, -0.077], [0.0105, 0.0088, 0.028]), 0.008);
      d = smin(d, palm, 0.011);
      // thumb: blended into the palm, joints a touch rounder
      let th = thumb[0](x, y, z); th = smin(th, thumb[1](x, y, z), 0.002); th = smin(th, thumb[2](x, y, z), 0.002);
      const base = d; d = smin(base, th, 0.006);
      // fingers: each blended into the palm only (no webbing between fingers), then joined hard
      for (let i = 0; i < 4; i++) { const f = fingers[i]; if (boxDist(f[0], x, y, z) > 0.008 && boxDist(f[1], x, y, z) > 0.008 && boxDist(f[2], x, y, z) > 0.008) continue;
        let fd = f[0](x, y, z); fd = smin(fd, f[1](x, y, z), 0.0016); fd = smin(fd, f[2](x, y, z), 0.0016);
        d = Math.min(d, smin(base, fd, 0.0032)); }
    }
    return d;
  };

  // ------------------------------------------------------------------------------------------------ surface nets on a grid
  // non-uniform along Z (fine over the hand, 3x coarser up the forearm); only cells near the surface are evaluated finely
  function mesh(f) {
    const h = 0.00075, X = [], Y = [], Z = [];
    for (let x = -0.051; x <= 0.080; x += h) X.push(x);
    for (let y = -0.0008; y <= 0.0705; y += h) Y.push(y);
    for (let z = -0.240; z <= 0.0755; z += h) Z.push(z);
    for (let z = Z[Z.length - 1] + 3 * h; z <= 0.575; z += 3 * h) Z.push(z);
    const nx = X.length, ny = Y.length, nz = Z.length, N = nx * ny * nz, V = new Float32Array(N), at = (i, j, k) => i + nx * (j + ny * k);
    // coarse pass (every 4th point), then fine values only where the surface can be
    const S = 4, cx = Math.ceil((nx - 1) / S) + 1, cy = Math.ceil((ny - 1) / S) + 1, cz = Math.ceil((nz - 1) / S) + 1, CV = new Float32Array(cx * cy * cz);
    const ci = (i) => Math.min(i * S, nx - 1), cj = j => Math.min(j * S, ny - 1), ck = k => Math.min(k * S, nz - 1);
    for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) CV[i + cx * (j + cy * k)] = f(X[ci(i)], Y[cj(j)], Z[ck(k)]);
    for (let k = 0; k < cz - 1; k++) for (let j = 0; j < cy - 1; j++) for (let i = 0; i < cx - 1; i++) {
      const i0 = ci(i), i1 = ci(i + 1), j0 = cj(j), j1 = cj(j + 1), k0 = ck(k), k1 = ck(k + 1);
      const diag = Math.hypot(X[i1] - X[i0], Y[j1] - Y[j0], Z[k1] - Z[k0]) * 1.35;
      let mn = 1e9, sgn = 0;
      for (const [a, b, c] of [[i, j, k], [i + 1, j, k], [i, j + 1, k], [i + 1, j + 1, k], [i, j, k + 1], [i + 1, j, k + 1], [i, j + 1, k + 1], [i + 1, j + 1, k + 1]]) { const v = CV[a + cx * (b + cy * c)]; mn = Math.min(mn, Math.abs(v)); sgn += v < 0 ? -1 : 1; }
      if (mn > diag) { const fill = sgn < 0 ? -1 : 1; for (let kk = k0; kk <= k1; kk++) for (let jj = j0; jj <= j1; jj++) for (let ii = i0; ii <= i1; ii++) { const q = at(ii, jj, kk); if (V[q] === 0) V[q] = fill; } }
      else for (let kk = k0; kk <= k1; kk++) for (let jj = j0; jj <= j1; jj++) for (let ii = i0; ii <= i1; ii++) { const q = at(ii, jj, kk); if (V[q] === 0 || Math.abs(V[q]) === 1) V[q] = f(X[ii], Y[jj], Z[kk]) || 1e-9; }
    }
    // a vertex in every cell the surface crosses: the mean of the edge crossings
    const CI = new Int32Array(N).fill(-1), pos = [], cells = [];
    const E = [[0, 0, 0, 1, 0, 0], [0, 1, 0, 1, 1, 0], [0, 0, 1, 1, 0, 1], [0, 1, 1, 1, 1, 1], [0, 0, 0, 0, 1, 0], [1, 0, 0, 1, 1, 0], [0, 0, 1, 0, 1, 1], [1, 0, 1, 1, 1, 1], [0, 0, 0, 0, 0, 1], [1, 0, 0, 1, 0, 1], [0, 1, 0, 0, 1, 1], [1, 1, 0, 1, 1, 1]];
    for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      let neg = 0; const c0 = at(i, j, k);
      for (let q = 0; q < 8; q++) if (V[at(i + (q & 1), j + ((q >> 1) & 1), k + (q >> 2))] < 0) neg++;
      if (neg === 0 || neg === 8) continue;
      let sx = 0, sy = 0, sz = 0, n = 0;
      for (const e of E) { const a = V[at(i + e[0], j + e[1], k + e[2])], b = V[at(i + e[3], j + e[4], k + e[5])]; if ((a < 0) === (b < 0)) continue;
        const u = a / (a - b); sx += X[i + e[0]] + (X[i + e[3]] - X[i + e[0]]) * u; sy += Y[j + e[1]] + (Y[j + e[4]] - Y[j + e[1]]) * u; sz += Z[k + e[2]] + (Z[k + e[5]] - Z[k + e[2]]) * u; n++; }
      CI[c0] = pos.length / 3; pos.push(sx / n, sy / n, sz / n); cells.push(i, j, k);
    }
    // a quad for every grid edge the surface crosses
    const idx = [];
    for (let c = 0; c < cells.length; c += 3) { const i = cells[c], j = cells[c + 1], k = cells[c + 2], v0 = V[at(i, j, k)];
      // x edge: cells (i, j-1..j, k-1..k)
      if (j > 0 && k > 0) { const v1 = V[at(i + 1, j, k)]; if ((v0 < 0) !== (v1 < 0)) { const a = CI[at(i, j - 1, k - 1)], b = CI[at(i, j, k - 1)], cc = CI[at(i, j, k)], d = CI[at(i, j - 1, k)]; if (a >= 0 && b >= 0 && cc >= 0 && d >= 0) { if (v0 < 0) idx.push(a, b, cc, a, cc, d); else idx.push(a, cc, b, a, d, cc); } } }
      if (i > 0 && k > 0) { const v1 = V[at(i, j + 1, k)]; if ((v0 < 0) !== (v1 < 0)) { const a = CI[at(i - 1, j, k - 1)], b = CI[at(i, j, k - 1)], cc = CI[at(i, j, k)], d = CI[at(i - 1, j, k)]; if (a >= 0 && b >= 0 && cc >= 0 && d >= 0) { if (v0 < 0) idx.push(a, cc, b, a, d, cc); else idx.push(a, b, cc, a, cc, d); } } }
      if (i > 0 && j > 0) { const v1 = V[at(i, j, k + 1)]; if ((v0 < 0) !== (v1 < 0)) { const a = CI[at(i - 1, j - 1, k)], b = CI[at(i, j - 1, k)], cc = CI[at(i, j, k)], d = CI[at(i - 1, j, k)]; if (a >= 0 && b >= 0 && cc >= 0 && d >= 0) { if (v0 < 0) idx.push(a, b, cc, a, cc, d); else idx.push(a, cc, b, a, d, cc); } } }
    }
    // project every vertex onto the surface, normals from the field's gradient
    const nv = pos.length / 3, P = new Float32Array(pos), Nn = new Float32Array(nv * 3), e = 0.00012;
    for (let v = 0; v < nv; v++) { let x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
      for (let it = 0; it < 2; it++) { const d = f(x, y, z), gx = (f(x + e, y, z) - f(x - e, y, z)) / (2 * e), gy = (f(x, y + e, z) - f(x, y - e, z)) / (2 * e), gz = (f(x, y, z + e) - f(x, y, z - e)) / (2 * e), g2 = gx * gx + gy * gy + gz * gz || 1;
        const s = Math.max(-0.0006, Math.min(0.0006, d / g2)); x -= gx * s; y -= gy * s; z -= gz * s;
        if (it === 1) { const l = Math.sqrt(g2); Nn[v * 3] = gx / l; Nn[v * 3 + 1] = gy / l; Nn[v * 3 + 2] = gz / l; } }
      P[v * 3] = x; P[v * 3 + 1] = y; P[v * 3 + 2] = z; }
    // winding check: the first triangle's face normal must agree with the gradient (outward)
    if (idx.length) { const [a, b, c] = idx, ax = P[b * 3] - P[a * 3], ay = P[b * 3 + 1] - P[a * 3 + 1], az = P[b * 3 + 2] - P[a * 3 + 2], bx = P[c * 3] - P[a * 3], by = P[c * 3 + 1] - P[a * 3 + 1], bz = P[c * 3 + 2] - P[a * 3 + 2];
      const fx = ay * bz - az * by, fy = az * bx - ax * bz, fz = ax * by - ay * bx; if (fx * Nn[a * 3] + fy * Nn[a * 3 + 1] + fz * Nn[a * 3 + 2] < 0) for (let q = 0; q < idx.length; q += 3) { const t = idx[q + 1]; idx[q + 1] = idx[q + 2]; idx[q + 2] = t; } }
    return { P, Nn, idx: nv > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), nv };
  }

  // ------------------------------------------------------------------------------------------------ the anatomy (GLSL)
  // The vessels under the watch that are real 3D tubes (centre line x = 0): y(z) = top(z) - depth + wiggle
  const VESS = [
    { kind: 'art', depth: 0.0020, r: 0.00050, ph: 0.5, wallC: '#e0303c', n: 56 },
    { kind: 'art', depth: 0.0031, r: 0.00040, ph: 2.1, wallC: '#e8414c', n: 42 },
    { kind: 'vein', depth: 0.0060, r: 0.00160, ph: 4.0, wallC: '#6a2c5c', n: 140 },
    { kind: 'art', depth: 0.0090, r: 0.00100, ph: 1.2, wallC: '#d42634', n: 80 }];
  const vY = (v, z) => top(z) - v.depth + 0.00022 * Math.sin(z * 160 + v.ph);
  const glslVY = VESS.map((v, i) => `float vY${i}(float z){ return 2.0 * armB(z) + 0.0003 - ${v.depth.toFixed(6)} + 0.00022 * sin(z * 160.0 + ${v.ph.toFixed(3)}); }`).join('\n');
  const GLSL = `
  uniform vec3 uOff; uniform vec4 uCut; uniform mat4 uPV; uniform float uTime; uniform float uWet; uniform vec4 uVR;
  varying vec3 vWP;
  vec4 armP(float z){ z = clamp(z, -0.03, 0.32); float a = 0.0281 + 0.030 * z + 0.05 * z * z; float b = 0.01875 + 0.040 * z + 0.03 * z * z; float p = max(2.15, 2.5 - 1.5 * max(0.0, z - 0.06)); return vec4(a, b, p, b + 0.0003); }
  float armB(float z){ return armP(z).y; }
  float armSD(vec3 q){ vec4 P = armP(q.z); float ax = max(abs(q.x) / P.x, 1e-6), ay = max(abs(q.y - P.w) / P.y, 1e-6); float px = pow(ax, P.z), py = pow(ay, P.z), S = px + py;
    float f = pow(S, 1.0 / P.z) - 1.0, k = pow(S, 1.0 / P.z - 1.0); vec2 g = vec2(k * px / ax / P.x, k * py / ay / P.y); return f / length(g); }
  ${glslVY}
  bool inCut(vec3 p){ return uCut.w > 0.5 && p.x > uCut.x && p.z > uCut.y && p.z < uCut.z; }
  float h21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p + n + 17.0)); }
  float vn(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f); return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
  float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * vn(p); p = p * 2.03 + 7.1; a *= 0.5; } return s; }
  vec3 voro(vec2 p){ vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0, id = 0.0;
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++){ vec2 g = vec2(float(x), float(y)), o = h22(i + g), r = g + o - f; float d = dot(r, r); if (d < d1){ d2 = d1; d1 = d; id = h21(i + g); } else if (d < d2) d2 = d; }
    return vec3(sqrt(d1), sqrt(d2) - sqrt(d1), id); }
  vec3 L(vec3 c){ return pow(c, vec3(2.2)); }
  float ellIn(vec2 p, vec2 c, vec2 r){ vec2 q = (p - c) / r; return dot(q, q); }
  // the colour of the inside of the wrist at E (local metres); face 0 = the long cut (x plane), 1 = a cross cut (z plane)
  vec3 anat(vec3 E, int face, out float rough){
    float d = -armSD(E); vec4 P = armP(E.z); float yc = P.w, b = P.y;
    vec2 uv = face == 0 ? vec2(E.z, E.y) : vec2(E.x, E.y);
    rough = 0.5; vec3 col;
    float jn = 0.00058 + 0.00017 * sin(uv.x * 2600.0 + 1.3) + 0.00007 * sin(uv.x * 7300.0 + 0.4);
    float dB = 0.0042 + 0.00028 * sin(uv.x * 900.0 + 2.0) + 0.0002 * fbm(uv * 1500.0);
    if (d < 0.00012) col = L(vec3(0.93, 0.80, 0.70));
    else if (d < jn) col = mix(L(vec3(0.91, 0.76, 0.64)), L(vec3(0.70, 0.46, 0.36)), smoothstep(jn - 0.00014, jn, d));
    else if (d < dB) {                                   // dermis: pink, collagen running along the skin, capillary loops
      float n = fbm(vec2(uv.x * 1800.0, d * 9000.0)); col = L(vec3(0.93, 0.64, 0.62)) * (0.86 + 0.22 * n);
      col = mix(col, L(vec3(0.98, 0.82, 0.80)), 0.25 * smoothstep(0.55, 0.8, fbm(vec2(uv.x * 4200.0, d * 30000.0))));
      if (face == 0){ float cl = abs(fract(uv.x / 0.0009 + 0.3 * sin(uv.x * 400.0)) - 0.5); float lt = smoothstep(0.075, 0.03, cl) * step(jn + 0.00005, d) * step(d, 0.0022);
        col = mix(col, L(vec3(0.80, 0.12, 0.16)), lt * 0.85); }
      rough = 0.45;
    } else if (d < 0.0105) {                             // fat: yellow lobules with pink septa
      vec3 v = voro(uv * 640.0); col = mix(L(vec3(0.97, 0.86, 0.52)), L(vec3(0.94, 0.78, 0.42)), v.z);
      col *= 0.9 + 0.16 * (1.0 - v.x); col = mix(col, L(vec3(0.90, 0.62, 0.56)), 1.0 - smoothstep(0.03, 0.09, v.y)); rough = 0.3;
    } else if (d < 0.0113) { col = L(vec3(0.95, 0.93, 0.89)); rough = 0.35; }
    else {                                               // muscle: fibres along the arm (long cut) or fascicles (cross cut)
      if (face == 0){ float n = fbm(vec2(uv.x * 260.0, uv.y * 5200.0)); col = mix(L(vec3(0.62, 0.15, 0.17)), L(vec3(0.80, 0.30, 0.30)), n);
        col = mix(col, L(vec3(0.93, 0.80, 0.78)), 0.5 * smoothstep(0.82, 0.95, fbm(vec2(uv.x * 90.0, uv.y * 1400.0)))); }
      else { vec3 v = voro(uv * 900.0); col = mix(L(vec3(0.64, 0.16, 0.18)), L(vec3(0.78, 0.27, 0.27)), v.z); col = mix(col, L(vec3(0.92, 0.78, 0.74)), 1.0 - smoothstep(0.02, 0.07, v.y)); }
      rough = 0.4;
    }
    vec2 xy = E.xy;
    // tendons: four over the back of the wrist, four under the palm, the median nerve
    for (int i = 0; i < 4; i++){ float fx = float(i);
      vec2 c1 = vec2(-0.0165 + fx * 0.0102, yc + b * 0.60 - abs(fx - 1.5) * 0.0011), c2 = vec2(-0.0132 + fx * 0.0088, yc - b * 0.52);
      if (ellIn(xy, c1, vec2(0.0022, 0.0015)) < 1.0 || ellIn(xy, c2, vec2(0.0027, 0.0021)) < 1.0){
        float n = face == 0 ? fbm(vec2(uv.x * 120.0, uv.y * 9000.0)) : fbm(uv * 6000.0); col = L(vec3(0.95, 0.93, 0.88)) * (0.88 + 0.14 * n); rough = 0.25; } }
    if (ellIn(xy, vec2(0.0008, yc - b * 0.74), vec2(0.0017, 0.0013)) < 1.0){ col = L(vec3(0.97, 0.90, 0.62)) * (0.9 + 0.1 * fbm(uv * 8000.0)); rough = 0.4; }
    // bones: the radius (thumb side, cut by the centre plane) and the ulna; cortex, then marrow
    float rb = ellIn(xy, vec2(0.0030, yc - 0.0015), vec2(0.0095, 0.0070)), ub = ellIn(xy, vec2(-0.0172, yc + 0.0008), vec2(0.0066, 0.0060));
    if (rb < 1.0 || ub < 1.0){ float q = min(rb, ub); float n = fbm(uv * 2600.0);
      col = q > 0.62 ? L(vec3(0.95, 0.91, 0.82)) * (0.92 + 0.08 * n) : mix(L(vec3(0.80, 0.50, 0.40)), L(vec3(0.93, 0.80, 0.66)), smoothstep(0.35, 0.75, fbm(uv * 5200.0))); rough = 0.55; }
    // the painted vessels: two dorsal veins in the fat, the radial and ulnar arteries
    vec2 vc[4]; vc[0] = vec2(0.0122, yc + b * 0.70); vc[1] = vec2(-0.0118, yc + b * 0.66); vc[2] = vec2(0.0205, yc - b * 0.50); vc[3] = vec2(-0.0185, yc - b * 0.42);
    float vr[4]; vr[0] = 0.0016; vr[1] = 0.0014; vr[2] = 0.0012; vr[3] = 0.0011;
    for (int i = 0; i < 4; i++){ float q = length(xy - vc[i]) / vr[i]; if (q < 1.0){ bool vein = i < 2;
      vec3 wall = vein ? L(vec3(0.42, 0.20, 0.38)) : L(vec3(0.88, 0.62, 0.62)); vec3 lum = vein ? L(vec3(0.30, 0.04, 0.10)) : L(vec3(0.72, 0.06, 0.10));
      float cells = face == 0 ? 0.85 + 0.25 * vn(vec2(uv.x * 2200.0 - uTime * (vein ? 0.9 : 2.4) * 1000.0 * 0.0012, uv.y * 3000.0)) : 0.9 + 0.2 * vn(uv * 4000.0);
      col = q > (vein ? 0.82 : 0.70) ? wall : lum * cells; rough = 0.2; } }
    return col;
  }
  `;
  // the cut test for anything else (vessel tubes, their cells, the band)
  const WP_GLSL = ' { vec4 wp4 = vec4(transformed, 1.0);\n#ifdef USE_INSTANCING\n wp4 = instanceMatrix * wp4;\n#endif\n vWP = (modelMatrix * wp4).xyz; }';
  const CUT_GLSL = `uniform vec3 uOff; uniform vec4 uCut; varying vec3 vWP; bool inCut(vec3 p){ return uCut.w > 0.5 && p.x > uCut.x && p.z > uCut.y && p.z < uCut.z; }`;

  KIT.asset('hand', (K, o) => {
    const g = new T.Group();
    const U = { uOff: { value: new T.Vector3() }, uCut: { value: new T.Vector4(1, 0, 0, 0) }, uPV: { value: new T.Matrix4() }, uTime: { value: 0 }, uWet: { value: 1 }, uVR: { value: new T.Vector4(1, 1, 1, 1) } };
    const Z0 = ZW - 0.026, Z1 = ZW + 0.027;
    // ---------------------------------------------------------------- the skin
    const t0 = performance.now(), M = mesh(handSD);
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(M.P, 3)); geo.setAttribute('normal', new T.BufferAttribute(M.Nn, 3)); geo.setIndex(new T.BufferAttribute(M.idx, 1));
    // skin colour: warmer on the knuckles and joints, pinker fingertips, a touch lighter on the palm side, faint mottling
    const col = new Float32Array(M.nv * 3), base = C('#d8a68c'), knuck = C('#c48572'), tip = C('#dc958a'), under = C('#e6bda5'), arm = C('#d3a083'), tc = new T.Color();
    const joints = []; KN.forEach(k => joints.push([k[0], k[1] + 0.006, k[2], 0.010])); fingerJoints.forEach(P => { joints.push([P[1][0], P[1][1] + 0.005, P[1][2], 0.0065]); joints.push([P[2][0], P[2][1] + 0.005, P[2][2], 0.0055]); });
    joints.push([THUMB[1][0], THUMB[1][1] + 0.006, THUMB[1][2], 0.008]); joints.push([THUMB[2][0], THUMB[2][1] + 0.006, THUMB[2][2], 0.0065]);
    const tips = fingerJoints.map(P => P[3]).concat([THUMB[3]]);
    for (let v = 0; v < M.nv; v++) { const x = M.P[v * 3], y = M.P[v * 3 + 1], z = M.P[v * 3 + 2], ny = M.Nn[v * 3 + 1];
      tc.copy(base).lerp(arm, sm((z - 0.0) / 0.12));
      let kj = 0; for (const j of joints) kj = Math.max(kj, Math.exp(-((x - j[0]) ** 2 + (y - j[1]) ** 2 + (z - j[2]) ** 2) / (j[3] * j[3])));
      tc.lerp(knuck, 0.55 * kj);
      let kt = 0; for (const p of tips) kt = Math.max(kt, Math.exp(-((x - p[0]) ** 2 + (y - p[1]) ** 2 + (z - p[2]) ** 2) / 0.00009));
      tc.lerp(tip, 0.5 * kt); tc.lerp(under, 0.6 * sm(-ny * 1.5));
      for (const P of fingerJoints) for (const J of [P[1], P[2]]) { const dz = Math.abs(z - J[2]), dx = Math.abs(x - J[0]); if (dz < 0.0016 && dx < 0.007 && ny > 0.35) { const cr = 0.5 + 0.5 * Math.cos(dz * 9000); tc.multiplyScalar(1 - 0.07 * cr * (1 - dz / 0.0016)); } }
      const n = 0.96 + 0.06 * (fr(Math.sin(x * 9123.1 + y * 3311.7 + z * 7771.3) * 43758.5) - 0.5) + 0.03 * Math.sin(x * 400 + z * 230) * Math.sin(z * 310 - x * 120);
      col[v * 3] = tc.r * n; col[v * 3 + 1] = tc.g * n; col[v * 3 + 2] = tc.b * n; }
    geo.setAttribute('color', new T.BufferAttribute(col, 3));
    const skin = new T.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.5, sheen: 0.45, sheenRoughness: 0.55, sheenColor: C('#ffd3c0'), clearcoat: 0.06, clearcoatRoughness: 0.5, emissive: C('#3a0c06'), emissiveIntensity: 0.12 });
    skin.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vWP;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' + WP_GLSL);
      sh.fragmentShader = GLSL + '\n' + sh.fragmentShader
        .replace('void main() {', `void main() {
          vec3 lp = vWP - uOff; if (inCut(lp)) discard;
          bool capF = false; vec3 capN = vec3(0.0), capCol = vec3(0.0); float capRough = 0.5, capDepth = gl_FragCoord.z;
          if (!gl_FrontFacing) {
            if (uCut.w < 0.5) discard;
            vec3 Cp = cameraPosition - uOff, dir = lp - Cp; float tP = length(dir); dir /= tP;
            float tIn = -1e9, tOut = 1e9; int face = 0;
            if (abs(dir.x) > 1e-7){ float tx = (uCut.x - Cp.x) / dir.x; if (dir.x > 0.0) tIn = max(tIn, tx); else if (tx < tOut){ tOut = tx; face = 0; } } else if (Cp.x <= uCut.x) discard;
            if (abs(dir.z) > 1e-7){ float ta = (uCut.y - Cp.z) / dir.z, tb = (uCut.z - Cp.z) / dir.z;
              if (dir.z > 0.0){ tIn = max(tIn, ta); if (tb < tOut){ tOut = tb; face = 2; } } else { tIn = max(tIn, tb); if (ta < tOut){ tOut = ta; face = 1; } } }
            else if (Cp.z <= uCut.y || Cp.z >= uCut.z) discard;
            if (!(tIn < tOut && tOut > 0.0 && tOut < tP + 1e-5)) discard;
            vec3 E = Cp + dir * tOut; if (armSD(E) > 0.00003) discard;
            ${VESS.map((v, i) => `if (length(vec2(E.x, E.y - vY${i}(E.z))) < ${v.r.toFixed(6)} * uVR[${i}]) discard;`).join(' ')}
            capF = true; capN = face == 0 ? vec3(1.0, 0.0, 0.0) : face == 1 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 0.0, -1.0);
            capCol = anat(E, face == 0 ? 0 : 1, capRough);
            vec4 cp = uPV * vec4(E + uOff, 1.0); capDepth = clamp(cp.z / cp.w * 0.5 + 0.5, 0.0, 1.0);
          }`)
        .replace('#include <color_fragment>', '#include <color_fragment>\n if (capF) diffuseColor.rgb = capCol;')
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n if (capF) roughnessFactor = mix(capRough, 0.18, 0.55 * uWet);')
        .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n if (capF) { normal = normalize((viewMatrix * vec4(capN, 0.0)).xyz); nonPerturbedNormal = normal; }')
        .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n if (capF) { material.sheenColor = vec3(0.0); material.clearcoat = 0.55 * uWet; material.clearcoatRoughness = 0.2; }')
        .replace('#include <lights_fragment_begin>', T.ShaderChunk.lights_fragment_begin.split('( directLight.visible && receiveShadow )').join('( directLight.visible && receiveShadow && !capF )'))
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n if (capF) totalEmissiveRadiance = capCol * 0.06;')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\n gl_FragDepth = capDepth;');
    };
    const skinM = new T.Mesh(geo, skin); skinM.castShadow = true; skinM.receiveShadow = true; skinM.side = T.DoubleSide; skin.side = T.DoubleSide;
    skinM.userData.noAO = true; skinM.frustumCulled = false;
    skinM.onBeforeRender = (r, s, cam) => { U.uPV.value.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); };
    g.add(skinM);
    // ---------------------------------------------------------------- nails
    const nailMat = new T.MeshPhysicalMaterial({ color: C('#f4d6cc'), roughness: 0.22, clearcoat: 0.9, clearcoatRoughness: 0.12, sheen: 0.3, sheenColor: C('#fff0ea') });
    const nail = (A, B, r, w, len) => { // on the distal phalanx A->B, the nail ending near the tip B
      const ax = K.V(B).sub(K.V(A)).normalize(), up0 = K.V(0, 1, 0), side = new T.Vector3().crossVectors(ax, up0).normalize(), up = new T.Vector3().crossVectors(side, ax).normalize();
      const nu = 10, nvv = 8, P = [], I = [], th = w / (r + 0.0003);
      for (let j = 0; j <= nvv; j++) for (let i = 0; i <= nu; i++) { const u = (i / nu - 0.5) * th, s = j / nvv, along = -0.0012 - len * (1 - s), out = r + 0.0006 + 0.0003 * Math.cos(u * 1.5) * (1 - Math.pow(Math.abs(2 * i / nu - 1), 4));
        const p = K.V(B).addScaledVector(ax, along).addScaledVector(up, Math.cos(u) * out).addScaledVector(side, Math.sin(u) * out); P.push(p.x, p.y, p.z); }
      for (let j = 0; j < nvv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; I.push(a, c, b, b, c, d); }
      const G = new T.BufferGeometry(); G.setAttribute('position', new T.Float32BufferAttribute(P, 3)); G.setIndex(I); G.computeVertexNormals();
      const m = new T.Mesh(G, nailMat); m.castShadow = false; m.receiveShadow = true; m.userData.noAO = true; return m; };
    fingerJoints.forEach((P, i) => g.add(nail(P[2], P[3], FING[i].r[3], FING[i].r[3] * 0.82, FING[i].L[2] * 0.48)));
    g.add(nail(THUMB[2], THUMB[3], TR[3], TR[3] * 0.85, 0.0105));
    // ---------------------------------------------------------------- the cut: a material patch for anything that must be sliced too
    const cutMaterial = (mat) => { const prev = mat.onBeforeCompile; mat.onBeforeCompile = (sh, r) => { if (prev) prev(sh, r); sh.uniforms.uOff = U.uOff; sh.uniforms.uCut = U.uCut;
        sh.vertexShader = (sh.vertexShader.includes('varying vec3 vWP;') ? '' : 'varying vec3 vWP;\n') + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n' + WP_GLSL);
        if (!sh.fragmentShader.includes('bool inCut(')) sh.fragmentShader = CUT_GLSL + '\n' + sh.fragmentShader;
        sh.fragmentShader = sh.fragmentShader.replace('void main() {', 'void main() {\n if (inCut(vWP - uOff)) discard;'); };
      mat.customProgramCacheKey = () => 'cut40'; mat.needsUpdate = true; return mat; };
    // the shadow it casts is cut too (the removed half must not darken the paper)
    skinM.customDepthMaterial = cutMaterial(new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking }));
    // ---------------------------------------------------------------- the vessels under the watch: real tubes, cut open lengthwise
    const vessels = [], discGeo = (() => { const prof = []; for (let i = 0; i <= 16; i++) { const x = i / 16, hh = Math.sqrt(Math.max(0, 1 - x * x)) * (0.207 + 2.003 * x * x - 1.123 * x ** 4) * 0.5; prof.push(new T.Vector2(x, hh)); }
      for (let i = 16; i >= 0; i--) prof.push(new T.Vector2(prof[i].x, -prof[i].y)); return new T.LatheGeometry(prof.filter((p, i, a) => !i || p.distanceTo(a[i - 1]) > 1e-9), 18); })();
    const R = OM.rng(4141);
    VESS.forEach((v, vi) => {
      const zs = [], N = 80; for (let i = 0; i <= N; i++) zs.push(-0.004 + (0.072 * i) / N);
      const curve = new T.CatmullRomCurve3(zs.map(z => K.V(0, vY(v, z), z)));
      const tg = new T.TubeGeometry(curve, 220, v.r, 28, false);
      const wallM = cutMaterial(new T.MeshPhysicalMaterial({ color: C(v.wallC), roughness: 0.32, clearcoat: 0.6, clearcoatRoughness: 0.2, side: T.DoubleSide }));
      const lum = v.kind === 'vein' ? '#3a0a18' : '#7a0c14';
      const prevW = wallM.onBeforeCompile; wallM.onBeforeCompile = (sh, r) => { prevW(sh, r); sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n if (!gl_FrontFacing) diffuseColor.rgb = pow(vec3(${C(lum).r.toFixed(3)}, ${C(lum).g.toFixed(3)}, ${C(lum).b.toFixed(3)}), vec3(1.0)) * 1.0;`); };
      const wall = new T.Mesh(tg, wallM); wall.castShadow = false; wall.receiveShadow = false; wall.userData.noAO = true; wall.userData.noDepth = true; g.add(wall);
      const cm = (new T.MeshPhysicalMaterial({ color: C(v.kind === 'vein' ? '#9a1020' : '#c8141f'), roughness: 0.35, clearcoat: 0.6, sheen: 0.5, sheenColor: C('#ff6a74'), emissive: C('#2a0005') }));
      const cells = new T.InstancedMesh(discGeo, cm, v.n); cells.castShadow = false; cells.receiveShadow = false; cells.userData.noAO = true; cells.frustumCulled = false; g.add(cells);
      const seeds = []; for (let i = 0; i < v.n; i++) seeds.push({ u: R(), rr: Math.sqrt(R()) * v.r * 0.5, a: Math.PI * (0.62 + 0.76 * R()), ax: (R() - 0.5) * 1.0, ay: R() * 6.28, sp: 0.75 + R() * 0.5 });
      vessels.push(Object.assign({ curve, wall, cells, seeds, samp: curve.getSpacedPoints(400), len: curve.getLength() }, v, { y: z => vY(v, z) }));
    });
    // ---------------------------------------------------------------- the laser: a glowing sheet at the cutting plane, brightest where it meets the skin
    const lasM = new T.ShaderMaterial({ transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, toneMapped: false,
      uniforms: { uO: { value: 0 }, uX: { value: 0 } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uO; uniform float uX; varying vec3 vP;
        vec4 armP(float z){ z = clamp(z, -0.03, 0.32); float a = 0.0281 + 0.030 * z + 0.05 * z * z; float b = 0.01875 + 0.040 * z + 0.03 * z * z; float p = max(2.15, 2.5 - 1.5 * max(0.0, z - 0.06)); return vec4(a, b, p, b + 0.0003); }
        float armSD(vec3 q){ vec4 P = armP(q.z); float ax = max(abs(q.x) / P.x, 1e-6), ay = max(abs(q.y - P.w) / P.y, 1e-6); float px = pow(ax, P.z), py = pow(ay, P.z), S = px + py;
          float f = pow(S, 1.0 / P.z) - 1.0, k = pow(S, 1.0 / P.z - 1.0); vec2 g = vec2(k * px / ax / P.x, k * py / ay / P.y); return f / length(g); }
        void main(){ float d = armSD(vec3(uX, vP.y, vP.z)); float rim = exp(-pow(d / 0.00035, 2.0)); float fill = d < 0.0 ? 0.18 : 0.0;
          float edge = smoothstep(0.0, 0.003, vP.z - ${Z0.toFixed(5)}) * smoothstep(0.0, 0.003, ${Z1.toFixed(5)} - vP.z);
          float core = exp(-pow(d / 0.00012, 2.0)); gl_FragColor = vec4(vec3(0.62, 1.0, 0.74) * (rim * 2.6 + fill) + vec3(1.0) * core * 2.0, min(1.0, rim + fill + core) * uO * edge); }` });
    const lasG = new T.PlaneGeometry(Z1 - Z0, 0.05); lasG.rotateY(Math.PI / 2); lasG.translate(0, 0.025, (Z0 + Z1) / 2);
    const laser = new T.Mesh(lasG, lasM); laser.userData.noAO = true; laser.userData.noDepth = true; laser.renderOrder = 20; laser.frustumCulled = false; g.add(laser);
    // ---------------------------------------------------------------- the watch's light ON the cut face (a drawing in light, just in front of the cut)
    let RAD = null; const radial = () => RAD || (RAD = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 128; const c2 = cv.getContext('2d'), gr = c2.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c2.fillStyle = gr; c2.fillRect(0, 0, 128, 128); const tx = new T.CanvasTexture(cv); tx.colorSpace = T.SRGBColorSpace; return tx; })());
    const spr = (c) => { const sp = new T.Sprite(new T.SpriteMaterial({ map: radial(), color: C(c), transparent: true, opacity: 0, depthWrite: false, depthTest: true, blending: T.AdditiveBlending, toneMapped: false })); sp.userData.noAO = true; sp.userData.noDepth = true; sp.renderOrder = 40; g.add(sp); return sp; };
    const glw = (c) => new T.MeshBasicMaterial({ color: C(c), transparent: true, opacity: 0, depthWrite: false, depthTest: true, blending: T.AdditiveBlending, toneMapped: false });
    const FX = 0.00035, TOPW = top(ZW), FL = [ZW - 0.0034, ZW + 0.0034], FS = [ZW - 0.0016, ZW + 0.0016];
    // a soft fan of green light spreading into the dermis under the watch
    const fanCv = document.createElement('canvas'); fanCv.width = 256; fanCv.height = 128; { const c2 = fanCv.getContext('2d'), gr = c2.createRadialGradient(128, 0, 4, 128, 0, 128); gr.addColorStop(0, 'rgba(120,255,160,0.9)'); gr.addColorStop(0.5, 'rgba(60,255,120,0.28)'); gr.addColorStop(1, 'rgba(40,255,100,0)'); c2.fillStyle = gr; c2.fillRect(0, 0, 256, 128); }
    const fanTx = new T.CanvasTexture(fanCv); fanTx.colorSpace = T.SRGBColorSpace;
    const fan = new T.Mesh(new T.PlaneGeometry(0.016, 0.008), new T.MeshBasicMaterial({ map: fanTx, transparent: true, opacity: 0, depthWrite: false, blending: T.AdditiveBlending, toneMapped: false, side: T.DoubleSide }));
    fan.rotation.y = Math.PI / 2; fan.position.set(FX * 0.6, TOPW - 0.004, ZW); fan.userData.noAO = true; fan.userData.noDepth = true; fan.renderOrder = 38; g.add(fan);
    const fpaths = [], Rf = OM.rng(9090), artY = (i, z) => vY(VESS[i], z);
    FL.forEach((lz, li) => { for (let j = 0; j < 8; j++) {
      const back = j % 8 < 5, pts = [K.V(FX, TOPW - 0.0001, lz)]; let p = pts[0].clone(); const dirz = (lz < ZW ? 1 : -1) * (back ? 1 : (Rf() < 0.5 ? 1 : -1)), n = 3;
      for (let k = 0; k < n; k++) { p = p.clone().add(K.V(0, -(0.0005 + Rf() * 0.0006) * (k === 0 ? 1.2 : 0.8), dirz * (0.0003 + Rf() * 0.0007))); p.y = Math.max(p.y, TOPW - 0.0034); pts.push(p); }
      if (back) { const sz = FS.reduce((a, b) => (Math.abs(b - p.z) < Math.abs(a - p.z) ? b : a)); pts.push(K.V(FX, (p.y + TOPW) / 2 - 0.0002, (p.z + sz) / 2), K.V(FX, TOPW - 0.0001, sz)); }
      else { const ai = p.y > TOPW - 0.0024 ? 0 : 1; pts.push(K.V(FX, artY(ai, p.z) + VESS[ai].r * 0.8, p.z)); }
      const cp = new T.CurvePath(); for (let k = 0; k < pts.length - 1; k++) cp.add(new T.LineCurve3(pts[k], pts[k + 1]));
      const sp = cp.getSpacedPoints(100), dI = sp.reduce((bi, q, i) => (q.y < sp[bi].y ? i : bi), 0);
      const trail = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(sp, false, 'catmullrom', 0), 100, 0.000028, 5, false), glw('#5cff8e')); trail.userData.noAO = true; trail.userData.noDepth = true; trail.renderOrder = 39; g.add(trail);
      const ph = [0, 0.5].map(() => ({ core: (() => { const m = new T.Mesh(new T.SphereGeometry(0.00009, 10, 8), glw('#e8fff0')); m.userData.noAO = true; m.userData.noDepth = true; m.renderOrder = 41; g.add(m); return m; })(), halo: spr('#5dff95') }));
      fpaths.push({ back, sp, dI, trail, ph, flash: spr('#9dffc0'), off: Rf(), end: sp[100].clone(), deep: sp[dI].clone() }); } });
    const fLed = FL.map(z => { const s2 = spr('#6dff9c'); s2.position.set(FX, TOPW + 0.0002, z); return s2; }), fPd = FS.map(z => { const s2 = spr('#d8ffe4'); s2.position.set(FX, TOPW + 0.0001, z); return s2; });
    const tmp = new T.Vector3(), M4 = new T.Matrix4(), Q = new T.Quaternion(), E = new T.Euler(), PP = new T.Vector3(), S3 = new T.Vector3();
    const watchQ = new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(K.V(0, 0, -1), K.V(-1, 0, 0), K.V(0, 1, 0)));
    const wrist = { w: 2 * armA(ZW), h: 2 * armB(ZW), p: 2.5 };
    console.log('hand mesh', M.nv, 'verts', (M.idx.length / 3) | 0, 'tris', Math.round(performance.now() - t0), 'ms');
    return {
      group: g, ZW, top, wrist, vessels, cutBox: { z0: Z0, z1: Z1 }, cutMaterial, armSD, U,
      // the watch worn on this wrist (band 'worn' with this.wrist): its local origin sits where its sensor apex touches the skin
      watchPose: (backZ = -0.0049) => ({ pos: [0, top(ZW) - backZ, ZW], quat: watchQ.clone() }),
      local: v => g.worldToLocal(v.clone()), world: v => g.localToWorld(K.V(v)),
      anchors: { watch: [0, top(ZW), ZW], wrist: [0, armB(ZW), ZW], knuckles: KN[1], tip: fingerJoints[1][3] },
      view: { l: [0.01, 0.02, -0.05], d: 0.42, close: [0.0, 0.03, ZW], keys: o.keys },
      defaults: { cut: 0, laser: 0, flow: 1, beat: 0, slosh: 0, wet: 1, vr: 1, light: 0, pAbs: 0.35, speed: 0.55, led: 1 },
      apply(s, t) {
        g.updateWorldMatrix(true, false); U.uOff.value.setFromMatrixPosition(g.matrixWorld); U.uTime.value = t; U.uWet.value = s.wet;
        const xs = armA(ZW) + 0.0004, xc = xs * (1 - sm(s.cut));
        U.uCut.value.set(xc, Z0, Z1, s.cut > 0.0005 ? 1 : 0);
        laser.visible = s.laser > 0.002; lasM.uniforms.uO.value = s.laser; lasM.uniforms.uX.value = xc; laser.position.x = xc;
        // the light on the cut face
        const la = s.light; fan.material.opacity = 0.55 * la * s.led * (0.9 + 0.1 * Math.sin(t * 44)); fan.visible = la > 0.002; let sH = [0, 0];
        for (const q of fpaths) { q.trail.material.opacity = 0.10 * la; let fk = 0;
          q.ph.forEach((o2, k) => { const ph0 = t * s.speed + q.off + k * 0.5, trip = Math.floor(ph0), u = ph0 - trip, i = Math.min(100, Math.floor(u * 100));
            const early = q.back && fr(Math.sin((trip * 2 + k) * 127.1 + q.off * 9711.7) * 43758.5) < s.pAbs, stop = early ? q.dI : 100, vis = i <= stop, a = sm(u / 0.05) * (vis ? 1 : 0) * la;
            const pA = q.sp[Math.min(i, stop)]; o2.core.position.copy(pA); o2.halo.position.copy(pA); o2.halo.scale.setScalar(0.0011);
            const fe = q.back && !early ? 1 : sm((stop / 100 - u) / 0.04 + 0.2); o2.core.material.opacity = a * fe; o2.halo.material.opacity = a * 0.45 * fe;
            const arr = Math.exp(-Math.pow((u - stop / 100) / 0.035, 2)) * la;
            if (!q.back || early) fk = Math.max(fk, arr); else { const si = Math.abs(q.end.z - FS[0]) < Math.abs(q.end.z - FS[1]) ? 0 : 1; sH[si] = Math.max(sH[si], arr); } });
          q.flash.position.copy(q.back ? q.deep : q.end); q.flash.scale.setScalar(0.0006 + 0.0024 * fk); q.flash.material.opacity = fk * 0.85; }
        fLed.forEach(m => { m.material.opacity = la * s.led * 0.95; m.scale.setScalar(0.0024 * (0.9 + 0.1 * Math.sin(t * 44))); });
        fPd.forEach((m, i) => { m.material.opacity = la * (0.15 + 0.85 * sH[i]); m.scale.setScalar(0.0008 + 0.0016 * sH[i]); });
        // vessels: swell on the beat, blood flows along +Z (arteries toward the hand: -Z), rocks with the arm
        vessels.forEach((v, vi) => { const sw = 1 + (v.kind === 'vein' ? 0.02 : 0.12) * s.beat; U.uVR.value.setComponent(vi, sw * s.vr); v.wall.scale.set(1, 1, 1);
          const pos = v.wall.geometry.attributes.position; if (!v.base) { v.base = pos.array.slice(); v.cen = []; for (let i = 0; i <= 220; i++) v.cen.push(v.curve.getPointAt(i / 220)); }
          if (v.lastSw !== sw) { v.lastSw = sw; const a = pos.array; for (let i = 0; i <= 220; i++) { const c = v.cen[i]; for (let j = 0; j <= 28; j++) { const k = (i * 29 + j) * 3; a[k] = c.x + (v.base[k] - c.x) * sw; a[k + 1] = c.y + (v.base[k + 1] - c.y) * sw; } } pos.needsUpdate = true; }
          const dirn = v.kind === 'vein' ? 1 : -1, slo = (v.kind === 'vein' ? 1 : 0.4) * s.slosh, spd = v.kind === 'vein' ? 0.5 : 1.2;
          for (let i = 0; i < v.seeds.length; i++) { const q = v.seeds[i], u = fr(q.u + dirn * t * s.flow * 0.0055 * q.sp * spd / v.len + slo / v.len), si = Math.min(400, Math.round(u * 400)), c = v.samp[si];
            PP.set(Math.min(-v.r * 0.25, c.x + Math.cos(q.a) * q.rr * sw), c.y + Math.sin(q.a) * q.rr * sw, c.z); E.set(q.ay + t * 0.4 * q.sp, q.ax * 0.5, Math.PI / 2 + q.ax * 0.6, 'XYZ'); Q.setFromEuler(E); S3.setScalar(v.r * 0.4); M4.compose(PP, Q, S3); v.cells.setMatrixAt(i, M4); }
          v.cells.instanceMatrix.needsUpdate = true; });
      },
      demo(s, t) { s.cut = sm((t - 1.5) / 5); s.laser = Math.sin(Math.PI * Math.min(1, Math.max(0, (t - 1.5) / 5.4))); s.beat = Math.pow(Math.max(0, Math.sin(t * 2.6)), 6); },
    };
  });
})();
