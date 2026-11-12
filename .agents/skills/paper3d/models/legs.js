// A person from the waist down, walking. Real size in metres: waist cap at 1.0, hip joints 0.92, knee 0.5, ankle 0.09,
// shoe 0.28 long. Local frame: feet on y = 0, centred on x = 0, the person faces +Z. "R" is the +X side.
// options: { style: 'jogger' | 'jeans' }   jogger = black sweatpants with ribbed cuffs, jeans = indigo denim, turned-up hem.
// state:
//   walk   phase in cycles (0..1 = one full gait cycle = two steps). The +X foot strikes the ground at walk = 0, 1, 2 ...,
//          the -X foot at 0.5, 1.5 ... The CALLER moves the group forward by 1.44 m per cycle (0.72 m per step):
//          group.position.z = z0 + 1.44 * walk. A planted foot then stays exactly where it is on the ground.
//   still  0..1   1 = standing still, feet side by side (blends the walk out)
//   lift   -1..1  heel raise for a small shuffle: > 0 lifts the +X heel, < 0 the -X heel (the toe stays planted)
// Anchors are given for the standing pose. While walking the pelvis rides 1 to 3.5 cm lower (it bobs 2.6 cm, twice a cycle),
// sways 1.6 cm to the standing leg and turns a few degrees, so pin things to the waist with a little slack.
// Preview only: option look = 'all' | 'shoe' | 'hip' | 'back' | 'gait' | 'front' | 'ankle' | 'lift' picks the six preview cameras;
// option pv = { keys: [six cameras {az, el, d, l}], walk, still, lift: number | [six numbers] } sets any cameras and poses.
// The trousers are one skinned tube per leg (bent on the CPU around the hip and the knee, so no gap can open);
// shoes and socks are rigid. Feet are placed by inverse kinematics from a foot path that rolls heel to toe on the sole.
KIT.asset('legs', (K, o) => {
  const T = THREE, g = new T.Group(), JE = !!o && o.style === 'jeans', PI = Math.PI, TAU = PI * 2, R = OM.rng(JE ? 815 : 407);
  const clamp = K.clamp, lerp = K.lerp, sst = x => { x = clamp(x); return x * x * (3 - 2 * x); };
  // smooth profile through [x, y] keys (x ascending)
  const prof = ks => x => {
    const n = ks.length; if (x <= ks[0][0]) return ks[0][1]; if (x >= ks[n - 1][0]) return ks[n - 1][1];
    let i = 0; while (ks[i + 1][0] < x) i++;
    const x0 = ks[i][0], y0 = ks[i][1], x1 = ks[i + 1][0], y1 = ks[i + 1][1], h = x1 - x0, t = (x - x0) / h, sl = (y1 - y0) / h;
    const m0 = i > 0 ? (y1 - ks[i - 1][1]) / (x1 - ks[i - 1][0]) : sl, m1 = i < n - 2 ? (ks[i + 2][1] - y0) / (ks[i + 2][0] - x0) : sl, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * m0 + (3 * t2 - 2 * t3) * y1 + (t3 - t2) * h * m1;
  };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
  const along = (p, n, d) => [p[0] + n[0] * d, p[1] + n[1] * d, p[2] + n[2] * d], dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

  // ------------------------------------------------------------------ skeleton and gait
  const HIPX = 0.09, HIPY = 0.92, KNEEY = 0.50, ANKY = 0.09, L1 = HIPY - KNEEY, L2 = KNEEY - ANKY, LL = L1 + L2, STRIDE = 1.44, STANDY = 0.9185;
  const FXW = 0.074, FXS = 0.080, TOEOUT = 0.10, LIFTA = 0.46;
  // the sole is a rocker: flat in the middle, an arc under the heel, an arc under the toes. The foot ROLLS on it (no sliding).
  const ZHEEL = -0.075, ZTOE = 0.205, ZF = 0.115, RF = 0.195, AF = Math.asin((ZTOE - ZF) / RF), YTIP = RF * (1 - Math.cos(AF)), ZH = -0.035, RH = 0.07;
  const soleY = z => z > ZF ? RF - Math.sqrt(Math.max(0, RF * RF - (z - ZF) * (z - ZF))) : z < ZH ? RH - Math.sqrt(Math.max(0, RH * RH - (z - ZH) * (z - ZH))) : 0;
  const G = { HS: 0.30, TO: 1.0, pFF: 0.10, pHO: 0.27, pTO: 0.62, pMid: 0.205, Y0: 0.910, BOB: 0.026, CLR: 0.02, EXP: 1.7, PL: -0.05 };
  const RK = [0, 0];
  function rock(th, out) {   // ankle [dz, y] for a foot pitched by th (heel up > 0) rolling on its sole, relative to where the flat foot stands
    const c = Math.cos(th), s = Math.sin(th);
    if (th >= 0) {
      if (th <= AF) { out[0] = ZF + RF * th - ZF * c + (ANKY - RF) * s; out[1] = RF + ZF * s + (ANKY - RF) * c; }
      else { out[0] = ZF + RF * AF - ZTOE * c + (ANKY - YTIP) * s; out[1] = ZTOE * s + (ANKY - YTIP) * c; }
    } else { out[0] = ZH + RH * th - ZH * c + (ANKY - RH) * s; out[1] = RH + ZH * s + (ANKY - RH) * c; }
    return out;
  }
  const stTh = p => p < G.pFF ? -G.HS * (1 - p / G.pFF) * (1 - p / G.pFF) : p < G.pHO ? 0 : G.TO * Math.pow((p - G.pHO) / (G.pTO - G.pHO), G.EXP);
  const SWD = 1 - G.pTO, st3 = p => { const th = stTh(p); rock(th, RK); return [RK[0], RK[1], th]; };
  const A0 = st3(G.pTO), A0m = st3(G.pTO - 1e-4), B0 = st3(0), B0p = st3(1e-4), D0 = A0.map((v, i) => (v - A0m[i]) / 1e-4 * SWD), D1 = B0.map((v, i) => (B0p[i] - v) / 1e-4 * SWD);
  const herm = (u, a, b, m0, m1) => { const u2 = u * u, u3 = u2 * u; return (2 * u3 - 3 * u2 + 1) * a + (u3 - 2 * u2 + u) * m0 + (3 * u2 - 2 * u3) * b + (u3 - u2) * m1; };
  const FT = { z: 0, y: 0, th: 0, b: 0, rz: 0 };
  function foot(p, F) {     // one foot over its cycle (p = 0 heel strike): stance rolls heel -> flat -> toe, swing carries it one stride on
    if (p <= G.pTO) { const th = stTh(p); rock(th, RK); F.z = RK[0]; F.y = RK[1]; F.th = th; F.b = 0; F.rz = RK[0]; return; }
    const u = (p - G.pTO) / SWD;
    F.z = herm(u, A0[0], STRIDE + B0[0], D0[0], D1[0]); F.y = herm(u, A0[1], B0[1], D0[1], D1[1]) + G.CLR * Math.pow(u, 0.9) * Math.pow(1 - u, 2.2) * 7;
    F.th = herm(u, A0[2], B0[2], D0[2], D1[2]); F.b = Math.pow(Math.sin(PI * u), 1.5); F.rz = lerp(A0[0], B0[0], sst(u));
  }

  // ------------------------------------------------------------------ the trouser surface (right half; the left is its mirror)
  // phi: 0 = outer side (+x), pi/2 = front (+z), pi = inner side, -pi/2 = back. Above the crotch each half is a D that
  // meets the other on the centre line; below it turns into the round leg.
  const YTOP = 0.990, HEM = JE ? 0.128 : 0.193, CUFFTOP = JE ? 0.1716 : 0.1985, EIN = 0.014;
  const LAX = prof(JE ? [[0.12, 0.0595], [0.20, 0.0600], [0.30, 0.0615], [0.40, 0.064], [0.50, 0.0675], [0.62, 0.077], [0.72, 0.087], [0.80, 0.0935], [0.90, 0.094]]
    : [[0.18, 0.0455], [0.195, 0.0465], [0.222, 0.0585], [0.30, 0.0640], [0.38, 0.0665], [0.50, 0.069], [0.62, 0.078], [0.72, 0.0875], [0.80, 0.094], [0.90, 0.094]]);
  const LAF = prof(JE ? [[0.12, 0.0575], [0.30, 0.058], [0.42, 0.061], [0.50, 0.071], [0.56, 0.075], [0.66, 0.085], [0.76, 0.093], [0.80, 0.095], [0.90, 0.098]]
    : [[0.18, 0.0455], [0.195, 0.0465], [0.222, 0.0565], [0.30, 0.0595], [0.40, 0.0625], [0.50, 0.072], [0.56, 0.076], [0.66, 0.086], [0.76, 0.094], [0.80, 0.096], [0.90, 0.098]]);
  const LAB = prof(JE ? [[0.12, 0.0615], [0.30, 0.068], [0.38, 0.071], [0.46, 0.066], [0.52, 0.065], [0.62, 0.077], [0.72, 0.091], [0.80, 0.103], [0.90, 0.110]]
    : [[0.18, 0.0455], [0.195, 0.0465], [0.222, 0.0610], [0.30, 0.0715], [0.38, 0.0745], [0.46, 0.067], [0.52, 0.064], [0.62, 0.078], [0.72, 0.092], [0.80, 0.104], [0.90, 0.110]]);
  const PA = prof([[0.76, 0.184], [0.84, 0.183], [0.90, 0.179], [0.95, 0.1705], [1.0, 0.161], [1.01, 0.160]]);
  const PBF = prof([[0.76, 0.095], [0.86, 0.099], [0.92, 0.102], [0.97, 0.103], [1.01, 0.102]]);
  const PBB = prof([[0.76, 0.104], [0.83, 0.126], [0.885, 0.134], [0.94, 0.125], [0.98, 0.113], [1.01, 0.108]]);
  const TM = y => sst((0.875 - y) / 0.09);
  const F1 = R() * TAU, F2 = R() * TAU, F3 = R() * TAU, HEMF = CUFFTOP + 0.001;
  function fold(phi, y) {   // soft creases: cloth stacking above the hem, a little bag at the knee, drape on the thigh
    if (y > 0.84) return 0;
    const s = Math.sin(phi); let d = 0;
    const e1 = sst((y - HEMF) / 0.02) * sst((HEMF + 0.15 - y) / 0.10);
    if (e1 > 0) d += (JE ? 0.0026 : 0.0032) * e1 * Math.sin(TAU * y / (JE ? 0.054 : 0.045) + 2.2 * Math.sin(phi + F1) + 1.1 * Math.sin(2 * phi + F2)) * (0.65 + 0.35 * Math.sin(3 * phi + F3));
    const f = Math.max(0, s), bk = Math.max(0, -s), k1 = (y - 0.505) / 0.055, k2 = (y - 0.50) / 0.03;
    d += 0.004 * Math.exp(-k1 * k1) * f * f - 0.0035 * Math.exp(-k2 * k2) * bk * bk;
    const et = sst((y - 0.56) / 0.06) * sst((0.80 - y) / 0.08);
    if (et > 0) d += (JE ? 0.0016 : 0.0026) * et * Math.sin(TAU * y / 0.105 + 2 * phi + F3);
    return d;
  }
  function S(phi, y) {
    const c = Math.cos(phi), s = Math.sin(phi), t = TM(y);
    let x = HIPX + LAX(y) * c, z = (s >= 0 ? LAF(y) : LAB(y)) * s, cx = HIPX;
    if (t < 1) { const px = (c >= 0 ? PA(y) : EIN) * c, pz = (s >= 0 ? PBF(y) : PBB(y)) * s; x = px + (x - px) * t; z = pz + (z - pz) * t; cx = HIPX * t; }
    const d = fold(phi, y); if (d) { const dx = x - cx, l = Math.hypot(dx, z) || 1; x += dx / l * d; z += z / l * d; }
    return [x, y, z];
  }
  function SN(phi, y) {     // outward normal of S
    const e = 1.5e-3, a = S(phi - e, y), b = S(phi + e, y), c = S(phi, y + e), d = S(phi, y - e);
    return nrm(cross(sub(b, a), sub(d, c)));
  }
  const phiAt = (x, y, front) => { let a = 0, b = front ? PI : -PI; for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (S(m, y)[0] > x) a = m; else b = m; } return (a + b) / 2; };
  const fx = (x, y) => [phiAt(x, y, true), y], bx = (x, y) => [phiAt(x, y, false), y];
  const circ = (phi, y, r) => [HIPX + r * Math.cos(phi), y, r * Math.sin(phi)];
  const pull = (p, d) => { const dx = p[0] - HIPX, l = Math.hypot(dx, p[2]) || 1; return [p[0] - dx / l * d, p[1], p[2] - p[2] / l * d]; };
  // the waist as one full ellipse (same numbers as S above the crotch): for the rigid waistband, loops, cap
  const pel = (a, y, off = 0) => { const c = Math.cos(a), s = Math.sin(a); return [(PA(y) + off) * c, y, ((s >= 0 ? PBF(y) : PBB(y)) + off) * s]; };
  const peln = (a, y) => { const c = Math.cos(a), s = Math.sin(a); return nrm([c / PA(y), 0, s / (s >= 0 ? PBF(y) : PBB(y))]); };

  // ------------------------------------------------------------------ colours and materials
  const lin = c => { const k = new T.Color(c); return [k.r, k.g, k.b]; };
  const DEN = lin(K.col.denim), DENL = lin('#7c99c6'), DENR = lin('#9dabc4'), JOG = lin('#26272b'), WHT = lin('#f1efe9');
  const cc = v => JE ? mix(DEN, DENL, Math.max(-0.35, v)) : [JOG[0] * (1 + 0.5 * v), JOG[1] * (1 + 0.5 * v), JOG[2] * (1 + 0.5 * v)];
  function fade(phi, y) {   // where denim wears pale: front of the thigh, the knee, the seat; darker along the seams
    const s = Math.sin(phi), f = Math.max(0, s), bk = Math.max(0, -s), a = (y - 0.67) / 0.12, b = (y - 0.5) / 0.07, c = (y - 0.86) / 0.07, d = (y - 0.36) / 0.1, e = (1 - Math.abs(Math.cos(phi))) / 0.05;
    return 0.46 * Math.exp(-a * a) * Math.pow(f, 1.5) + 0.40 * Math.exp(-b * b) * f * f + 0.38 * Math.exp(-c * c) * bk * bk + 0.16 * Math.exp(-d * d) * bk - 0.10 * Math.exp(-e * e) + 0.035 * Math.sin(5 * phi + 23 * y) + 0.05
      + 0.07 * clamp(fold(phi, y) / 0.0026, -1, 1);   // creases: worn pale on the ridge, dark in the valley
  }
  function shade(phi, y) {  // fleece does not fade, but it is never one flat black: creases, the knee and the seat catch a little more light
    const s = Math.sin(phi), f = Math.max(0, s), bk = Math.max(0, -s), b = (y - 0.5) / 0.08, c = (y - 0.86) / 0.08, a = (y - 0.68) / 0.13;
    return 0.42 * clamp(fold(phi, y) / 0.0032, -1, 1) + 0.16 * Math.exp(-b * b) * f * f + 0.12 * Math.exp(-c * c) * bk * bk + 0.10 * Math.exp(-a * a) * f + 0.03 * Math.sin(5 * phi + 23 * y);
  }
  const clothBase = K.mat.cloth(JE ? K.col.denim : '#26272b');   // the kit's cloth (weave bump); fleece adds a soft sheen so black still shows its form
  const clothMat = JE ? clothBase.clone() : new T.MeshPhysicalMaterial({ roughness: 0.95, metalness: 0, bumpMap: clothBase.bumpMap, bumpScale: clothBase.bumpScale, sheen: 1, sheenRoughness: 0.5, sheenColor: new T.Color('#666971') });
  clothMat.color.set('#ffffff'); clothMat.vertexColors = true;
  { // the weave you see up close: pale twill lines on denim, a fine heather on fleece. Averages to (almost) white from far away.
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'), im = x.createImageData(128, 128), d = im.data, Q = OM.rng(31);
    for (let j = 0; j < 128; j++) for (let i = 0; i < 128; i++) { const tw = ((i + j) % 8) < 3 ? 1 : 0, slub = 0.5 + 0.5 * Math.sin(i * TAU / 128 * 3 + 2 * Math.sin(j * TAU / 128)), n = Q();
      const v = JE ? 208 + 44 * tw + 16 * (n - 0.5) + 10 * slub * tw : 228 + 36 * (n - 0.5), k = (j * 128 + i) * 4; d[k] = d[k + 1] = d[k + 2] = clamp(v, 0, 255); d[k + 3] = 255; }
    x.putImageData(im, 0, 0); clothMat.map = K.canvasTex(cv, { repeat: JE ? 44 : 60 }); }
  const threadMat = K.mat.clay(JE ? '#d8bd88' : '#3a3b40', 0.85), steel = K.mat.metal(K.col.steel, 0.3);
  const tint = (geo, c) => { const n = geo.attributes.position.count, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[3 * i] = c[0]; a[3 * i + 1] = c[1]; a[3 * i + 2] = c[2]; } geo.setAttribute('color', new T.BufferAttribute(a, 3)); return geo; };

  // ------------------------------------------------------------------ mesh tools
  const mkBuf = () => ({ p: [], n: [], u: [], c: [], ix: [] });
  // (nu+1) x (nv+1) points from f(i, j) -> [x, y, z, u, v, r, g, b, (nx, ny, nz)]. Normals come from the grid itself.
  // Faces look outward when i runs with phi and j runs DOWN the outside (or up the inside); flip for the other way round.
  function grid(b, nu, nv, f, { wrap = false, flip = false } = {}) {
    const base = b.p.length / 3, W = nu + 1, P = [];
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) P.push(f(i, j));
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const q = P[j * W + i], a = P[j * W + (i > 0 ? i - 1 : wrap ? nu - 1 : 0)], c = P[j * W + (i < nu ? i + 1 : wrap ? 1 : nu)], d = P[Math.max(j - 1, 0) * W + i], e = P[Math.min(j + 1, nv) * W + i];
      let n = cross(sub(c, a), sub(e, d)); const l = Math.hypot(n[0], n[1], n[2]);
      if (q.length > 8) n = [q[8], q[9], q[10]]; else if (l < 1e-14) n = [0, 1, 0]; else { const k = (flip ? -1 : 1) / l; n = [n[0] * k, n[1] * k, n[2] * k]; }
      b.p.push(q[0], q[1], q[2]); b.n.push(n[0], n[1], n[2]); b.u.push(q[3] || 0, q[4] || 0); b.c.push(q[5] ?? 1, q[6] ?? 1, q[7] ?? 1);
    }
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = base + j * W + i, bb = a + 1, c = a + W, d = c + 1; if (flip) b.ix.push(a, c, bb, bb, c, d); else b.ix.push(a, bb, c, bb, d, c); }
  }
  function bufGeo(b, sx = 1) {
    const geo = new T.BufferGeometry(), P = new Float32Array(b.p), N = new Float32Array(b.n), ix = b.ix.slice();
    if (sx < 0) { for (let i = 0; i < P.length; i += 3) { P[i] = -P[i]; N[i] = -N[i]; } for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } }
    geo.setAttribute('position', new T.BufferAttribute(P, 3)); geo.setAttribute('normal', new T.BufferAttribute(N, 3));
    geo.setAttribute('uv', new T.BufferAttribute(new Float32Array(b.u), 2)); geo.setAttribute('color', new T.BufferAttribute(new Float32Array(b.c), 3)); geo.setIndex(ix); return geo;
  }
  // a raised panel on any surface: pf(a, b) -> [point, normal]; the border sinks under the surface so the edge reads as a real edge
  function slab(b, pf, na, nb, thick, c, ea, eb, { flip = false, open = '' } = {}) {
    const A = [0], B = [0]; for (let i = 0; i <= na; i++) A.push(ea + (1 - 2 * ea) * i / na); A.push(1); for (let j = 0; j <= nb; j++) B.push(eb + (1 - 2 * eb) * j / nb); B.push(1);
    grid(b, A.length - 1, B.length - 1, (i, j) => {
      const q = pf(A[i], B[j]), edge = (i === 0 && !open.includes('l')) || (i === A.length - 1 && !open.includes('r')) || (j === 0 && !open.includes('t')) || (j === B.length - 1 && !open.includes('b'));
      const p = along(q[0], q[1], edge ? -0.0007 : thick); return [p[0], p[1], p[2], A[i] * 0.2, B[j] * 0.2, c[0], c[1], c[2]];
    }, { flip });
  }
  // a path on the trouser surface from f(t) -> [phi, y]: points every few millimetres with their normals
  function pathFrom(f, lift = 0, step = 0.003) {
    let len = 0, prev = null; for (let i = 0; i <= 30; i++) { const q = f(i / 30), p = S(q[0], q[1]); if (prev) len += dist(p, prev); prev = p; }
    const n = Math.max(2, Math.ceil(len / step)), out = [];
    for (let i = 0; i <= n; i++) { const q = f(i / n), nn = SN(q[0], q[1]); out.push({ p: along(S(q[0], q[1]), nn, lift), n: nn }); }
    return out;
  }
  const spline = cps => { const cv = new T.CatmullRomCurve3(cps.map(c => new T.Vector3(c[0], c[1], 0)), false, 'centripetal'); return t => { const v = cv.getPoint(t); return [v.x, v.y]; }; };
  const surfPath = (cps, lift = 0) => pathFrom(spline(cps), lift);
  const xyPath = (cps, front, lift = 0) => { const f = spline(cps); return pathFrom(t => { const q = f(t); return [phiAt(q[0], q[1], front), q[1]]; }, lift); };   // control points in [x, y] on the front or the back
  const polyPath = (pts, map, lift = 0) => { const out = []; for (let i = 0; i < pts.length - 1; i++) { const a = pts[i], b = pts[i + 1], seg = pathFrom(t => map(lerp(a[0], b[0], t), lerp(a[1], b[1], t)), lift); if (i) seg.shift(); out.push(...seg); } return out; };
  const tangents = path => path.map((q, i) => nrm(sub(path[Math.min(i + 1, path.length - 1)].p, path[Math.max(i - 1, 0)].p)));
  const offsetPath = (path, d) => { const tg = tangents(path); return path.map((q, i) => ({ p: along(q.p, nrm(cross(tg[i], q.n)), d), n: q.n })); };
  // a row of stitches: short threads, half sunk into the cloth
  function stitches(b, path, { len = 0.0029, gap = 0.0015, r = 0.00048 } = {}) {
    const L = [0]; for (let i = 1; i < path.length; i++) L.push(L[i - 1] + dist(path[i].p, path[i - 1].p));
    const tot = L[L.length - 1]; let k = 0;
    const at = s => { while (k < path.length - 2 && L[k + 1] < s) k++; const u = clamp((s - L[k]) / (L[k + 1] - L[k] || 1)); return { p: mix(path[k].p, path[k + 1].p, u), n: nrm(mix(path[k].n, path[k + 1].n, u)) }; };
    for (let s = gap * 0.5; s + len <= tot; s += len + gap) {
      const A = at(s), B = at(s + len), d = nrm(sub(B.p, A.p)), sd = nrm(cross(d, A.n)), base = b.p.length / 3;
      for (const E of [A, B]) for (let q = 0; q < 4; q++) {
        const nn = q === 0 ? E.n : q === 1 ? sd : q === 2 ? [-E.n[0], -E.n[1], -E.n[2]] : [-sd[0], -sd[1], -sd[2]], p = along(E.p, nn, q === 0 ? r * 1.15 : q === 2 ? r * 0.3 : r);
        b.p.push(p[0], p[1], p[2]); b.n.push(nn[0], nn[1], nn[2]); b.u.push(0, 0); b.c.push(1, 1, 1);
      }
      for (let q = 0; q < 4; q++) { const a = base + q, a1 = base + (q + 1) % 4; b.ix.push(a, a1, a + 4, a1, a1 + 4, a + 4); }
    }
  }
  // a seam: a low rounded ridge along a path
  function ridge(b, path, w, h, c) {
    const tg = tangents(path), base = b.p.length / 3, K5 = [[-1, -0.0005, -0.9, 0.45], [-0.55, 0.85, -0.45, 1], [0, 1, 0, 1], [0.55, 0.85, 0.45, 1], [1, -0.0005, 0.9, 0.45]]; let arc = 0;
    for (let i = 0; i < path.length; i++) {
      const q = path[i], sd = nrm(cross(tg[i], q.n)); if (i) arc += dist(q.p, path[i - 1].p);
      for (let k = 0; k < 5; k++) { const e = K5[k], hh = e[1] < 0 ? e[1] : e[1] * h, p = [q.p[0] + sd[0] * e[0] * w + q.n[0] * hh, q.p[1] + sd[1] * e[0] * w + q.n[1] * hh, q.p[2] + sd[2] * e[0] * w + q.n[2] * hh], nn = nrm([sd[0] * e[2] + q.n[0] * e[3], sd[1] * e[2] + q.n[1] * e[3], sd[2] * e[2] + q.n[2] * e[3]]);
        b.p.push(p[0], p[1], p[2]); b.n.push(nn[0], nn[1], nn[2]); b.u.push(k * 0.01, arc / 0.55); b.c.push(c[0], c[1], c[2]); }
      if (i) for (let k = 0; k < 4; k++) { const a = base + (i - 1) * 5 + k, bb = a + 1, cc2 = a + 5, d = cc2 + 1; b.ix.push(a, bb, cc2, bb, d, cc2); }
    }
  }
  // a rivet: a low metal dome sitting on the cloth
  function dome(b, phi, y, r = 0.0031) {
    const p = S(phi, y), n = SN(phi, y), ax = nrm(cross(n, Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0])), ay = cross(n, ax);
    grid(b, 12, 4, (i, j) => { const a = TAU * i / 12, u = j / 4 * PI / 2, rr = r * Math.cos(u), hh = 0.0003 + r * 0.6 * Math.sin(u), q = [p[0] + (ax[0] * Math.cos(a) + ay[0] * Math.sin(a)) * rr + n[0] * hh, p[1] + (ax[1] * Math.cos(a) + ay[1] * Math.sin(a)) * rr + n[1] * hh, p[2] + (ax[2] * Math.cos(a) + ay[2] * Math.sin(a)) * rr + n[2] * hh];
      return j === 4 ? [q[0], q[1], q[2], 0, 0, 1, 1, 1, n[0], n[1], n[2]] : [q[0], q[1], q[2]]; }, { wrap: true });
  }

  // ------------------------------------------------------------------ the skin: everything that bends with a leg
  // When a thigh swings forward, cloth cannot follow the body into the crease of the hip: it pulls tight in a straight line
  // from under the waistband (BRB) to the front of the thigh (BRA). Without this the raised thigh grows a round shoulder.
  const DEF = [], BRA = 0.80, BRB = 0.955;
  function addDef(b, sx, mat, cast = true) {
    if (!b.ix.length) return; const geo = bufGeo(b, sx), mesh = K.mesh(geo, mat, { cast }); mesh.frustumCulled = false; g.add(mesh);
    const pos = geo.attributes.position, nor = geo.attributes.normal, n = pos.count, rest = Float32Array.from(pos.array), nrest = Float32Array.from(nor.array), wh = new Float32Array(n), wk = new Float32Array(n), wf = new Float32Array(n), wu = new Float32Array(n);
    for (let i = 0; i < n; i++) { const x = Math.abs(rest[3 * i]), y = rest[3 * i + 1], z = rest[3 * i + 2]; wk[i] = sst((KNEEY + 0.07 - y) / 0.14); wh[i] = sst((lerp(0.80, 0.895, Math.min(1, x / 0.17)) + 0.06 - y) / 0.12);
      wf[i] = y < BRB && y > 0.74 ? sst((z - 0.005) / 0.06) * sst((x - 0.012) / 0.06) : 0; wu[i] = clamp((BRB - y) / (BRB - BRA)); }   // the front of the thigh, and how far down the bridge it sits
    pos.setUsage(T.DynamicDrawUsage); nor.setUsage(T.DynamicDrawUsage); DEF.push({ sx, pos, nor, rest, nrest, wh, wk, wf, wu, n });
  }
  function deform(D, P) {   // bend around the knee, then around the hip, then ride on the pelvis. Every vertex turns by its own share of each angle.
    const pos = D.pos.array, nor = D.nor.array, r = D.rest, q = D.nrest, wh = D.wh, wk = D.wk, wf = D.wf, wu = D.wu, jx = D.sx * HIPX;
    const ck = Math.cos(P.k), sk = Math.sin(P.k), ch = Math.cos(-P.h), sh = Math.sin(-P.h), fh = clamp(P.h / 0.2), y0 = BRB - HIPY, yA = BRA - HIPY;
    for (let i = 0, j = 0; i < D.n; i++, j += 3) {
      let x = r[j] - jx, y = r[j + 1], z = r[j + 2], nx = q[j], ny = q[j + 1], nz = q[j + 2], c, s, t; const a = wk[i], b = wh[i];
      if (a > 0) { if (a < 1) { c = Math.cos(P.k * a); s = Math.sin(P.k * a); } else { c = ck; s = sk; }
        y -= KNEEY; t = y * c - z * s; z = y * s + z * c; y = t + KNEEY; t = ny * c - nz * s; nz = ny * s + nz * c; ny = t; }
      y -= HIPY;
      const f = fh * wf[i];
      if (f > 0) {   // forward swing, front of the thigh: blend the turned cloth toward the tight bridge
        const u = wu[i], bn = b + ((u < 1 ? 0.92 : 1) - b) * f; let yt, zt, yb = y, zb = z;
        if (u < 1) { const ya = yA * ch - z * sh, za = yA * sh + z * ch; yt = y0 + (ya - y0) * u; zt = z + (za - z) * u; } else { yt = y * ch - z * sh; zt = y * sh + z * ch; }
        if (b > 0) { if (b < 1) { c = Math.cos(-P.h * b); s = Math.sin(-P.h * b); } else { c = ch; s = sh; } yb = y * c - z * s; zb = y * s + z * c; }
        y = yb + (yt - yb) * f; z = zb + (zt - zb) * f;
        c = Math.cos(-P.h * bn); s = Math.sin(-P.h * bn); t = ny * c - nz * s; nz = ny * s + nz * c; ny = t;
      } else if (b > 0) { if (b < 1) { c = Math.cos(-P.h * b); s = Math.sin(-P.h * b); } else { c = ch; s = sh; }
        t = y * c - z * s; z = y * s + z * c; y = t; t = ny * c - nz * s; nz = ny * s + nz * c; ny = t; }
      const az = P.roll * (1 - b) + P.beta * b; c = Math.cos(az); s = Math.sin(az);
      t = x * c - y * s; y = x * s + y * c; x = t; t = nx * c - ny * s; ny = nx * s + ny * c; nx = t;
      if (b < 1) { const ay = P.yaw * (1 - b); c = Math.cos(ay); s = Math.sin(ay); t = x * c + z * s; z = -x * s + z * c; x = t; t = nx * c + nz * s; nz = -nx * s + nz * c; nx = t; }
      pos[j] = x + P.hx; pos[j + 1] = y + P.hy; pos[j + 2] = z + P.hz; nor[j] = nx; nor[j + 1] = ny; nor[j + 2] = nz;
    }
    D.pos.needsUpdate = true; D.nor.needsUpdate = true;
  }

  // one trouser leg: a tube from the waist to the hem, then turned in so nobody sees up an empty leg
  function legTube(b) {
    const N = 64, ys = []; let y = YTOP;
    while (y > HEM + 0.004) { ys.push(y); y -= y > 0.76 ? 0.010 : y > 0.60 ? 0.016 : y > 0.40 ? 0.010 : y > 0.33 ? 0.014 : 0.007; }
    ys.push(HEM);
    const rows = ys.map(yy => phi => S(phi, yy)), dark = cc(-0.6);
    if (JE) { rows.push(phi => pull(S(phi, HEM - 0.0012), 0.004)); rows.push(phi => circ(phi, HEM + 0.035, 0.039)); } else rows.push(phi => circ(phi, HEM - 0.009, 0.043));
    grid(b, N, rows.length - 1, (i, j) => { const phi = PI + TAU * i / N, p = rows[j](phi), c = j >= ys.length ? dark : cc(JE ? fade(phi, p[1]) : shade(phi, p[1])); return [p[0], p[1], p[2], i / N, p[1] / 0.55, c[0], c[1], c[2]]; }, { wrap: true });
  }
  const cuffY = (phi, y) => y + clamp((y - 0.127) / 0.045) * (0.0022 * Math.sin(2 * phi + F1) + 0.0012 * Math.sin(5 * phi + F2));
  function cuff(b) {
    if (JE) {   // turned-up hem: the pale inside of the denim, a little uneven like a real fold, with the white selvedge strip at the outer seam
      const N = 96, rows = [[0.1716, 0.0004], [0.1712, 0.0030], [0.1675, 0.0036], [0.150, 0.0036], [0.132, 0.0036], [0.1278, 0.0030], [0.1262, 0.0008], [0.1268, -0.0035]];
      grid(b, N, rows.length - 1, (i, j) => { const phi = -PI + TAU * i / N, p = pull(S(phi, cuffY(phi, rows[j][0])), -rows[j][1] * (1 + 0.22 * Math.sin(3 * phi + F3))); return [p[0], p[1], p[2], i / N * 2, p[1] / 0.55, DENR[0], DENR[1], DENR[2]]; }, { wrap: true });
      slab(b, (a, bb) => { const phi = lerp(-0.105, 0.105, a), p = pull(S(phi, cuffY(phi, lerp(0.1708, 0.1284, bb))), -0.0036 * (1 + 0.22 * Math.sin(3 * phi + F3))); return [p, nrm([p[0] - HIPX, 0, p[2]])]; }, 6, 8, 0.0006, WHT, 0.06, 0.02, { open: 'tb' });
    } else {    // ribbed elastic cuff
      const N = 144, rows = [[0.1985, 0.0435, 0], [0.1968, 0.0468, 0.4], [0.1925, 0.0480, 1], [0.180, 0.0481, 1], [0.166, 0.0479, 1], [0.152, 0.0477, 1], [0.1445, 0.0474, 1], [0.1412, 0.0458, 0.4], [0.1400, 0.0428, 0], [0.152, 0.0385, 0]], c = cc(-0.1);
      grid(b, N, rows.length - 1, (i, j) => { const phi = TAU * i / N, p = circ(phi, rows[j][0], rows[j][1] + rows[j][2] * 0.0007 * Math.cos(phi * 36)); return [p[0], p[1], p[2], i / N * 3, p[1] / 0.18, c[0], c[1], c[2]]; }, { wrap: true });
    }
  }
  function joggerDetails(sx, cloth) {
    const cR = cc(-0.15);
    ridge(cloth, surfPath([[0, 0.950], [0, 0.6], [0, 0.202]]), 0.0024, 0.0010, cR);                                   // outer seam
    ridge(cloth, surfPath([[PI, 0.762], [PI, 0.45], [PI, 0.202]]), 0.0024, 0.0010, cR);                               // inner seam
    ridge(cloth, surfPath([fx(0.110, 0.950), fx(0.140, 0.905), [0.22, 0.868], [0.04, 0.838]]), 0.0036, 0.0019, cR);   // slanted side pocket
    if (sx > 0) {
      ridge(cloth, xyPath([[0.0016, 0.950], [0.0016, 0.89], [0.0016, 0.838]], true), 0.0024, 0.0010, cR);            // centre seams (the front one stops above the fork, where the halves fold into each other)
      ridge(cloth, xyPath([[0.0016, 0.950], [0.0016, 0.88], [0.0016, 0.80]], false), 0.0024, 0.0010, cR);
      ridge(cloth, surfPath([bx(0.035, 0.884), bx(0.09, 0.887), bx(0.145, 0.892)]), 0.004, 0.0017, cR);               // one welt pocket at the back
    }
  }
  function jeansDetails(sx, cloth, thread, metal) {
    const cR = cc(-0.07), LS = 0.0005, st = (path, off) => stitches(thread, off ? offsetPath(path, off) : path);
    // side seams
    ridge(cloth, surfPath([[0, 0.958], [0, 0.6], [0, 0.173]]), 0.0027, 0.0011, cR);
    st(surfPath([[-0.034, 0.957], [-0.034, 0.84]], LS));
    ridge(cloth, surfPath([[PI, 0.764], [PI, 0.45], [PI, 0.173]]), 0.003, 0.0012, cR);
    st(surfPath([[PI - 0.085, 0.76], [PI - 0.09, 0.45], [PI - 0.10, 0.176]], LS));
    // front pocket: a scoop from the waistband to the side seam, double stitched, a rivet at each end
    const fp = [fx(0.056, 0.9585), fx(0.064, 0.930), fx(0.088, 0.902), fx(0.128, 0.886), [0.14, 0.879], [0.012, 0.875]];
    ridge(cloth, surfPath(fp), 0.0022, 0.0014, cR); const fpl = surfPath(fp, LS); st(fpl, 0.0036); st(fpl, 0.0096);
    const r1 = fx(0.0585, 0.9525), r2 = [0.05, 0.8772]; dome(metal, r1[0], r1[1]); dome(metal, r2[0], r2[1]);
    // yoke at the back
    const yk = [bx(0.004, 0.899), [-0.85, 0.917], [-0.02, 0.938]];
    ridge(cloth, surfPath(yk), 0.0024, 0.0011, cR); const ykl = surfPath(yk, LS); st(ykl, -0.0034); st(ykl, -0.0092);
    // back pocket: a patch with its own stitching
    const PX = 0.089, PT = 0.887, PW = 0.063, PWB = 0.054, PH = 0.103, PP = 0.024, PTH = 0.0016;
    const pk = (a, b) => bx(PX + a * lerp(PW, PWB, b), PT - b * (PH + PP * (1 - Math.abs(a))) + a * 0.004);
    slab(cloth, (a, b) => { const q = pk(a * 2 - 1, b); return [S(q[0], q[1]), SN(q[0], q[1])]; }, 14, 14, PTH, cc(0.10), 0.015, 0.015);
    const da = 0.0036 / PW, db = 0.0036 / PH, pl = PTH + LS;
    for (const m of [1, 2.6]) st(polyPath([[-1 + da * m, 0.02], [-1 + da * m, 1 - db * m], [0, 1 - db * m * 0.82], [1 - da * m, 1 - db * m], [1 - da * m, 0.02]], pk, pl));
    st(polyPath([[-1 + da * 3, 0.085], [1 - da * 3, 0.085]], pk, pl)); st(polyPath([[-1 + da * 3, 0.03], [1 - da * 3, 0.03]], pk, pl));
    st(polyPath([[-0.84, 0.37], [0, 0.52], [0.84, 0.37]], pk, pl)); st(polyPath([[-0.84, 0.43], [0, 0.58], [0.84, 0.43]], pk, pl));
    // centre back seam
    if (sx > 0) ridge(cloth, xyPath([[0.0016, 0.958], [0.0016, 0.88], [0.0016, 0.80]], false), 0.0026, 0.0011, cR);
    st(xyPath([[0.0062, 0.958], [0.0062, 0.88], [0.0062, 0.808]], false, LS));
    if (sx > 0) {
      // the fly: the centre seam and the J of stitching beside it
      ridge(cloth, xyPath([[0.0016, 0.958], [0.0016, 0.89], [0.0016, 0.832]], true), 0.0024, 0.0011, cR);
      st(xyPath([[0.0062, 0.958], [0.0062, 0.89], [0.0062, 0.834]], true, LS));
      const J = xyPath([[0.0375, 0.958], [0.038, 0.905], [0.0368, 0.872], [0.030, 0.851], [0.0095, 0.842]], true, LS); st(J); st(J, 0.0056);
      // coin pocket inside the front pocket
      const cp = (a, b) => fx(lerp(0.150, 0.106, a), 0.944 - b * (0.944 - (0.8865 + 0.0105 * a)));
      slab(cloth, (a, b) => { const q = cp(a, b); return [S(q[0], q[1]), SN(q[0], q[1])]; }, 8, 8, 0.0012, cc(0.06), 0.03, 0.03);
      st(polyPath([[0.05, 0.07], [0.95, 0.07]], cp, 0.0017)); st(polyPath([[0.05, 0.16], [0.95, 0.16]], cp, 0.0017));
      st(polyPath([[0.06, 0.2], [0.06, 0.93]], cp, 0.0017)); st(polyPath([[0.94, 0.2], [0.94, 0.93]], cp, 0.0017));
      const c1 = cp(0.03, 0.03), c2 = cp(0.97, 0.03); dome(metal, c1[0], c1[1], 0.0027); dome(metal, c2[0], c2[1], 0.0027);
    } else st(xyPath([[0.0062, 0.958], [0.0062, 0.89], [0.0062, 0.834]], true, LS));
    // the old hem stitch, now at the top of the turn-up
    st(pathFrom(t => { const phi = -PI + TAU * t; return [phi, cuffY(phi, 0.1635)]; }, 0.0043));
    stitches(thread, pathFrom(t => [0, lerp(0.169, 0.1295, t)], 0.0049), { len: 0.0042, gap: 0.0007, r: 0.0004 });   // the selvedge line
  }
  for (const sx of [1, -1]) {
    const cloth = mkBuf(), thread = mkBuf(), metal = mkBuf();
    legTube(cloth); cuff(cloth);
    if (JE) jeansDetails(sx, cloth, thread, metal); else joggerDetails(sx, cloth);
    addDef(cloth, sx, clothMat); addDef(thread, sx, threadMat, false); addDef(metal, sx, steel, false);
  }

  // ------------------------------------------------------------------ the pelvis: waistband, cap and the things sewn to it (rigid)
  const pelvisG = new T.Group(); pelvisG.rotation.order = 'YZX'; pelvisG.position.set(0, HIPY, 0); g.add(pelvisG);
  const pin = new T.Group(); pin.position.y = -HIPY; pelvisG.add(pin);
  const pc = mkBuf(), pt = mkBuf(), cords = [];
  const band = (N, rows, c, rib) => grid(pc, N, rows.length - 1, (i, j) => { const a = TAU * i / N, rw = rows[j], p = pel(a, rw[0], rw[1] + (rw[2] ? rw[2] * rib(a) : 0)); return [p[0], p[1], p[2], i / N * 2, p[1] / 0.55, c[0], c[1], c[2]]; }, { wrap: true });
  const ringPath = (y, off) => { const out = []; for (let i = 0; i <= 420; i++) { const a = TAU * i / 420; out.push({ p: pel(a, y, off), n: peln(a, y) }); } return out; };
  const WBO = JE ? 0.0019 : 0.0026;
  if (JE) {
    band(180, [[0.9965, -0.0065], [1.0032, -0.0045], [1.0034, -0.0008], [1.0022, 0.0013], [0.9992, WBO], [0.9808, WBO + 0.0003], [0.9625, WBO], [0.9606, 0.0011], [0.9600, -0.0006]], cc(0.02));
    stitches(pt, ringPath(0.9652, WBO + 0.0005)); stitches(pt, ringPath(0.9972, WBO + 0.0005));
    // belt loops
    const A98 = PA(0.98), la = [Math.acos(0.092 / A98), PI - Math.acos(0.092 / A98), -Math.acos(0.108 / A98), PI + Math.acos(0.108 / A98), -PI / 2];
    for (const a of la) { const p = pel(a, 0.9780, WBO + 0.0016), n = peln(a, 0.9780); pin.add(K.mesh(tint(K.geo.rbox(0.0115, 0.049, 0.0036, 0.0015), cc(0.12)), clothMat, { pos: p, rot: [0, Math.atan2(n[0], n[2]), 0] }));
      for (const yy of [0.9572, 0.9988]) { const q = pel(a, yy, WBO + 0.0036), row = []; for (let k = 0; k <= 4; k++) { const t = (k / 4 - 0.5) * 0.0085; row.push({ p: [q[0] + n[2] * t, yy, q[2] - n[0] * t], n }); } stitches(pt, row, { len: 0.0016, gap: 0.0004 }); } }
    // the waistband end and its button
    pin.add(K.mesh(tint(K.geo.rbox(0.0016, 0.0375, 0.0016, 0.0006), cc(-0.12)), clothMat, { pos: pel(Math.acos(0.021 / A98), 0.981, WBO + 0.0002) }));
    const bp = [[0, 0.0034], [0.0042, 0.0034], [0.0052, 0.0027], [0.0060, 0.0036], [0.0080, 0.0037], [0.0088, 0.0028], [0.0088, 0.0009], [0.0078, 0]].map(q => new T.Vector2(q[0], q[1])).reverse();
    pin.add(K.mesh(new T.LatheGeometry(bp, 40), steel, { pos: [0.002, 0.981, PBF(0.981) + WBO - 0.0002], rot: [PI / 2, 0, 0] }));
    // leather patch at the back
    const a0 = PI + Math.acos(0.080 / A98), lp = (a, b) => { const an = lerp(a0 - 0.2, a0 + 0.2, a), y = lerp(0.9985, 0.9635, b); return [pel(an, y, WBO), peln(an, y)]; }, lb = mkBuf();
    slab(lb, lp, 10, 6, 0.0015, [1, 1, 1], 0.025, 0.035); pin.add(K.mesh(bufGeo(lb), K.mat.clay('#c2a878', 0.72)));
    const lrow = pts => { const out = []; for (let i = 0; i < pts.length - 1; i++) for (let k = i ? 1 : 0; k <= 12; k++) { const q = lp(lerp(pts[i][0], pts[i + 1][0], k / 12), lerp(pts[i][1], pts[i + 1][1], k / 12)); out.push({ p: along(q[0], q[1], 0.002), n: q[1] }); } return out; };
    stitches(pt, lrow([[0.07, 0.12], [0.93, 0.12], [0.93, 0.88], [0.07, 0.88], [0.07, 0.12]]), { len: 0.0022, gap: 0.0012 });
  } else {
    // ribbed elastic waistband with two stitch channels, and a drawcord
    band(440, [[0.9965, -0.0065], [1.0045, -0.0048], [1.0048, 0.0004], [1.0025, WBO, 1], [0.9912, WBO, 1], [0.9892, WBO - 0.0008, 1], [0.9872, WBO, 1], [0.9688, WBO, 1], [0.9668, WBO - 0.0008, 1], [0.9648, WBO, 1], [0.9538, WBO - 0.0002, 1], [0.9518, 0.0006], [0.9512, -0.0008]], cc(-0.1), a => 0.0008 * Math.cos(a * 110));
    for (const sx of [1, -1]) {
      const x0 = sx * 0.021, z0 = PBF(0.975) + WBO + 0.0012, cg = new T.Group(); cg.position.set(x0, 0.975, z0); pin.add(cg); cords.push(cg);
      pin.add(K.mesh(new T.TorusGeometry(0.0038, 0.0012, 10, 28), steel, { pos: [x0, 0.975, z0 - 0.0006] }));
      const len = sx > 0 ? 0.118 : 0.103, pts = [[0, 0, -0.002], [sx * 0.002, -0.012, 0.0035], [sx * 0.006, -0.045, 0.0028], [sx * 0.010, -len * 0.7, 0.0005], [sx * 0.012, -len, -0.0008]];
      cg.add(K.mesh(K.geo.tube(pts, 0.0024, { seg: 40, rad: 10 }), K.mat.clay('#d6d4ce', 0.9)));
      cg.add(K.mesh(K.geo.cyl(0.0029, 0.017, 16), steel, { pos: [sx * 0.0122, -len - 0.007, -0.001], rot: [0.03, 0, sx * 0.03] }));
    }
  }
  // the clean cut at the waist
  const capB = mkBuf(), capR = [[1, 0.0066, 0.9966], [1, 0.0090, 0.9990], [1, 0.0125, 0.9997], [0.5, 0.0125, 0.9997], [0, 0.0125, 0.9997]];
  grid(capB, 96, capR.length - 1, (i, j) => { const a = TAU * i / 96, rw = capR[j], p = pel(a, 1.0, -rw[1]); return rw[0] === 0 ? [0, rw[2], 0, 0, 0, 1, 1, 1, 0, 1, 0] : [p[0] * rw[0], rw[2], p[2] * rw[0]]; }, { wrap: true, flip: true });
  pin.add(K.mesh(bufGeo(capB), K.mat.clay('#c6c4bd', 0.9)));
  if (pc.ix.length) pin.add(K.mesh(bufGeo(pc), clothMat)); if (pt.ix.length) pin.add(K.mesh(bufGeo(pt), threadMat, { cast: false }));

  // ------------------------------------------------------------------ sneaker (built as the +X foot; the other is its mirror)
  function buildShoe() {
    const sg = new T.Group();
    const UP = K.mat.clay('#dedcd6', 0.66), SOLE = K.mat.clay('#d9d7d0', 0.88), GREY = K.mat.clay('#cbcac6', 0.96), OUTS = K.mat.rubber('#a9a8a3'), LIN = K.mat.clay('#8f9196', 0.96), LACE = K.mat.clay('#d6d4ce', 0.92);
    const add = (b, mat, opt) => { const m = K.mesh(bufGeo(b), mat, opt); sg.add(m); return m; };
    // footprint: heel -> outer side -> toe -> inner side
    const CP = [[0, -0.075], [0.026, -0.069], [0.038, -0.045], [0.041, -0.005], [0.045, 0.045], [0.052, 0.095], [0.0510, 0.135], [0.0385, 0.176], [0.017, 0.200], [-0.004, 0.205], [-0.024, 0.197], [-0.0415, 0.168], [-0.0492, 0.125], [-0.046, 0.08], [-0.039, 0.03], [-0.0375, -0.015], [-0.0375, -0.045], [-0.026, -0.069]];
    const M = 96, O = new T.CatmullRomCurve3(CP.map(p => new T.Vector3(p[0], 0, p[1])), true, 'centripetal').getSpacedPoints(M).slice(0, M).map(v => [v.x, v.z]);
    const ON = O.map((p, j) => { const a = O[(j + M - 1) % M], c = O[(j + 1) % M], l = Math.hypot(c[0] - a[0], c[1] - a[1]); return [(c[1] - a[1]) / l, -(c[0] - a[0]) / l]; });
    const oAt = (s, inset = 0) => { s = ((s % 1) + 1) % 1; const f = s * M, j = Math.floor(f) % M, k = (j + 1) % M, u = f - Math.floor(f); return [lerp(O[j][0], O[k][0], u) - lerp(ON[j][0], ON[k][0], u) * inset, lerp(O[j][1], O[k][1], u) - lerp(ON[j][1], ON[k][1], u) * inset]; };
    let jTip = 0; O.forEach((p, j) => { if (p[1] > O[jTip][1]) jTip = j; }); const sNose = jTip / M;
    const sAtZ = (z, lat) => {
      if (lat) { for (let j = 0; j < jTip; j++) if (O[j + 1][1] >= z) return (j + clamp((z - O[j][1]) / (O[j + 1][1] - O[j][1] || 1))) / M; return sNose; }
      for (let j = jTip; j < M; j++) { const a = O[j][1], b = O[(j + 1) % M][1]; if (b <= z) return (j + clamp((a - z) / (a - b || 1))) / M; } return 1;
    };
    // sole: grey rubber outsole, white midsole with a soft bulge
    const ytop = z => lerp(0.046, 0.031, sst((z + 0.04) / 0.14)) + (z > ZF ? soleY(z) : 0);
    const wall = (b, rows, v0) => grid(b, M, rows.length - 1, (i, j) => { const p = oAt(i / M, rows[j][0]); return [p[0], rows[j][1](p[1]), p[1], i / M * 3, v0 + j * 0.05]; }, { wrap: true, flip: true });
    const bo = mkBuf(); wall(bo, [[0.0035, z => soleY(z) + 0.0004], [0.0008, z => soleY(z) + 0.0028], [0, z => soleY(z) + 0.0075], [0.0008, z => soleY(z) + 0.0099]], 0); add(bo, OUTS);
    const bm = mkBuf(); const mid = k => z => lerp(soleY(z) + 0.013, ytop(z), k); wall(bm, [[0.0013, z => soleY(z) + 0.0094], [-0.0006, z => soleY(z) + 0.0125], [-0.0018, mid(0.40)], [-0.0004, mid(0.47)], [-0.0018, mid(0.54)], [-0.0014, z => ytop(z) - 0.006], [0, z => ytop(z) - 0.0012], [0.003, z => ytop(z) + 0.0006], [0.014, z => ytop(z) + 0.0006]], 0); add(bm, SOLE);
    const bb = mkBuf(), tcv = document.createElement('canvas'); tcv.width = 128; tcv.height = 256; const tg = tcv.getContext('2d'); tg.fillStyle = '#b9b8b3'; tg.fillRect(0, 0, 128, 256); tg.strokeStyle = '#9a9994'; tg.lineWidth = 5;
    for (let y = -20; y < 280; y += 17) { tg.beginPath(); for (let x = 0; x <= 128; x += 16) tg.lineTo(x, y + ((x / 16) % 2 ? 9 : 0)); tg.stroke(); }
    grid(bb, M, 4, (i, j) => { const p = oAt(i / M, 0.0035), k = 1 - j / 4, x = 0.002 + (p[0] - 0.002) * k, z = 0.065 + (p[1] - 0.065) * k; return [x, soleY(z) + 0.0004, z, x / 0.11 + 0.5, (z + 0.08) / 0.29, 1, 1, 1, 0, -1, 0]; }, { wrap: true });
    add(bb, new T.MeshStandardMaterial({ map: K.canvasTex(tcv), roughness: 0.8 }), { cast: false });
    // upper: slices stacked from the sole to the collar. Each slice is the footprint, shorter at the front the higher it is.
    const INS = 0.0035; let zmin = 9, zmax = -9; for (let j = 0; j < M; j++) { const p = oAt(j / M, INS); zmin = Math.min(zmin, p[1]); zmax = Math.max(zmax, p[1]); }
    const ZFk = prof([[0, zmax], [0.12, zmax - 0.001], [0.22, zmax - 0.006], [0.30, 0.176], [0.36, 0.150], [0.42, 0.125], [0.55, 0.100], [0.70, 0.078], [0.85, 0.057], [1, 0.040]]);
    const zBk = h => zmin + 0.012 * h * h - 0.004 * Math.sin(PI * h), ws = h => 1 - 0.06 * sst(h / 0.3) - 0.13 * Math.pow(h, 1.6), yC = z => 0.101 + (z + 0.07) * 0.145;
    const sf = s => { s = ((s % 1) + 1) % 1; const k = Math.sin(PI * (s < sNose ? s / sNose : (s - sNose) / (1 - sNose))); return k * k; };   // 1 at the sides of the ankle: the collar dips there
    const U = (h, s, inset = 0, dy = 0) => { const p = oAt(s, INS + inset), f = (p[1] - zmin) / (zmax - zmin), zb = zBk(h), z = zb + (ZFk(h) - zb) * f; return [p[0] * ws(h), lerp(ytop(z) - 0.001, yC(z), h) + dy - 0.010 * sf(s) * h * h * h, z]; };
    const UN = (h, s) => { const eh = 0.012, a = U(h, s - 0.004), b = U(h, s + 0.004), c = U(Math.max(0, h - eh), s), d = U(Math.min(1, h + eh), s); return nrm(cross(sub(d, c), sub(b, a))); };
    const HN = 24, rows = []; for (let i = 0; i < HN; i++) rows.push([i / (HN - 1), 0, 0]);
    rows.push([1, 0.0026, 0.0032], [1, 0.0056, 0.0022], [1, 0.0070, -0.003]);
    const bu = mkBuf(); grid(bu, M, rows.length - 1, (i, j) => { const p = U(rows[j][0], i / M, rows[j][1], rows[j][2]); return [p[0], p[1], p[2], i / M * 2, j / HN]; }, { wrap: true, flip: true }); add(bu, UP);
    const bl = mkBuf(), lr = [[1, 0.0070, -0.003, 1], [1, 0.0082, -0.028, 1], [1, 0.0082, -0.028, 0.5], [1, 0.0082, -0.028, 0]];
    grid(bl, M, lr.length - 1, (i, j) => { const p = U(1, i / M, lr[j][1], lr[j][2]), k = lr[j][3]; return k === 0 ? [0, yC(-0.01) - 0.034, -0.01, 0, 0, 1, 1, 1, 0, 1, 0] : [p[0] * k, k < 1 ? yC(-0.01) - 0.034 : p[1], -0.01 + (p[2] + 0.01) * k]; }, { wrap: true, flip: true }); add(bl, LIN);
    // panels laid on the upper
    const sAt = (z, h, lat) => { const zb = zBk(h); return sAtZ(zmin + clamp((z - zb) / (ZFk(h) - zb)) * (zmax - zmin), lat); };
    const sOff = (h, d) => { const sgn = Math.sign(d), ds = 0.0012; let s = sNose, acc = 0, p = U(h, s); for (let k = 0; k < 500 && acc < Math.abs(d); k++) { s += sgn * ds; const q = U(h, s); acc += dist(q, p); p = q; } return s; };
    const panel = (mat, fn, na, nb, thick, ea, eb, open = '') => { const b = mkBuf(); slab(b, (a, bb2) => { const q = fn(a, bb2), h = clamp(q[1]); return [U(h, q[0]), UN(h, q[0])]; }, na, nb, thick, [1, 1, 1], ea, eb, { flip: true, open }); add(b, mat); };
    const sA = sAt(0.062, 0, true), sB = sAt(0.052, 0, false);
    panel(GREY, (a, b) => [lerp(sA, sB, a), b * (0.015 + 0.30 * Math.pow(Math.sin(PI * a), 1.25))], 64, 7, 0.0016, 0.004, 0.05, 't');   // toe guard: sweeps down to the sole at both ends
    const zq = h => h < 0.46 ? 0.088 + 0.02 * h / 0.46 : ZFk(h) - 0.012;
    panel(UP, (a, b) => { const h = 0.985 * b; return [lerp(sAt(zq(h), h, false) - 1, sAt(zq(h), h, true), a), h]; }, 70, 16, 0.0013, 0.004, 0.012, 'tb');   // quarter: one white layer round the back, its front edge is the seam
    const sC = sAt(-0.012, 0, false), sD = 1 + sAt(-0.012, 0, true);
    panel(GREY, (a, b) => [lerp(sC, sD, a), b * (0.30 + 0.60 * Math.pow(Math.sin(PI * a), 0.8))], 30, 10, 0.0029, 0.012, 0.03, 't');   // heel counter
    for (const lat of [true, false]) panel(UP, (a, b) => { const h = lat ? 0.46 + 0.53 * a : 0.99 - 0.53 * a; return [sOff(h, (lat ? -1 : 1) * (0.0145 + 0.0165 * b)), h]; }, 14, 3, 0.0031, 0.03, 0.08);        // lace stays
    // perforations on the toe box: three short rows of punched holes
    const bh = mkBuf(), hit = (x, z) => { let bd = 1e9, bh2 = 0.3, bs = sNose; for (let h = 0.2; h <= 0.5; h += 0.004) for (let q = -0.13; q <= 0.13; q += 0.0025) { const p = U(h, sNose + q), d = (p[0] - x) * (p[0] - x) + (p[2] - z) * (p[2] - z); if (d < bd) { bd = d; bh2 = h; bs = sNose + q; } } return [bh2, bs]; };
    [[0.157, 4], [0.1465, 5], [0.136, 4]].forEach(([z, n]) => { for (let k = 0; k < n; k++) { const kx = k - (n - 1) / 2, x = kx * 0.0092 - 0.0005, q = hit(x, z - 0.0011 * kx * kx), c = U(q[0], q[1]), nn = UN(q[0], q[1]), ax = nrm(cross(nn, [0, 0, 1])), ay = cross(nn, ax);
      grid(bh, 10, 1, (i, j) => { const a = TAU * i / 10, r = (1 - j) * 0.00115, w = [c[0] + (ax[0] * Math.cos(a) + ay[0] * Math.sin(a)) * r + nn[0] * 0.0005, c[1] + (ax[1] * Math.cos(a) + ay[1] * Math.sin(a)) * r + nn[1] * 0.0005, c[2] + (ax[2] * Math.cos(a) + ay[2] * Math.sin(a)) * r + nn[2] * 0.0005]; return [w[0], w[1], w[2], 0, 0, 1, 1, 1, nn[0], nn[1], nn[2]]; }, { wrap: true }); } });
    add(bh, K.mat.clay('#85878c', 0.9), { cast: false });
    // stitching along the panel edges
    const bs = mkBuf(), sst2 = (fn, lift, t0 = 0, t1 = 1) => { const path = []; for (let i = 0; i <= 90; i++) { const q = fn(lerp(t0, t1, i / 90)), h = clamp(q[1]), n = UN(h, q[0]); path.push({ p: along(U(h, q[0]), n, lift), n }); } stitches(bs, path, { len: 0.0026, gap: 0.0014, r: 0.0004 }); };
    sst2(a => [lerp(sA, sB, a), 0.86 * (0.015 + 0.30 * Math.pow(Math.sin(PI * a), 1.25)) - 0.012], 0.0020, 0.06, 0.94);
    sst2(a => [lerp(sC, sD, a), 0.90 * (0.30 + 0.60 * Math.pow(Math.sin(PI * a), 0.8)) - 0.02], 0.0033, 0.05, 0.95);
    for (const lat of [true, false]) { sst2(t => { const h = 0.45 * t; return [sAt(zq(h) - 0.004, h, lat), h]; }, 0.0017, 0.04, 1); sst2(t => { const h = 0.45 * t; return [sAt(zq(h) - 0.0075, h, lat), h]; }, 0.0017, 0.04, 1); }
    add(bs, K.mat.clay('#cfcdc6', 0.9), { cast: false });
    // tongue: a padded strip up the instep, standing a little above the collar
    const Rg = h => U(h, sNose), RNn = h => UN(h, sNose), Te = nrm(sub(Rg(1), Rg(0.95))), tp = [];
    for (let k = 0; k <= 14; k++) { const h = 0.47 + 0.53 * k / 14; tp.push({ p: along(Rg(h), RNn(h), -0.0062 * (1 - sst(k / 3))), n: RNn(h), w: lerp(0.021, 0.0255, k / 14) }); }
    for (const d of [0.007, 0.014, 0.020]) tp.push({ p: along(along(Rg(1), Te, d), RNn(1), 0.0015 * d / 0.02), n: RNn(1), w: 0.0255 });
    const bt = mkBuf(), TS = 16, nt = tp.length;
    grid(bt, TS, nt + 1, (i, j) => { const q = tp[clamp(j - 1, 0, nt - 1)], end = j === 0 || j === nt + 1, tip = j <= 1 || j >= nt ? 0.72 : 1, a = TAU * i / TS, ca = Math.cos(a), sa = Math.sin(a);
      const cx = end ? 0 : q.w * tip * Math.sign(ca) * Math.pow(Math.abs(ca), 0.6), cn = 0.0045 + (end ? 0 : 0.0036 * Math.sign(sa) * Math.pow(Math.abs(sa), 0.8)), p = along(q.p, q.n, cn);
      return end ? [p[0], p[1], p[2], 0, 0, 1, 1, 1, 0, j ? 0.6 : -0.6, j ? -0.8 : 0.8] : [p[0] + cx, p[1], p[2], i / TS, j / nt]; }, { wrap: true, flip: true }); add(bt, UP);
    // eyelets and laces
    const EL = [], EM = [];
    for (let r = 0; r < 5; r++) { const h = 0.52 + r * 0.105; for (const lat of [true, false]) { const s = sOff(h, (lat ? -1 : 1) * 0.0228), p = U(h, s), n = UN(h, s), e = along(p, n, 0.0034); (lat ? EL : EM).push({ p: e, h });
      const m = K.mesh(K.geo.cyl(0.0024, 0.0009, 16), K.mat.clay('#6a6c71', 0.6), { pos: e, cast: false }); m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(n[0], n[1], n[2])); sg.add(m); } }
    const lace = (a, b, hm, lift) => { const n = RNn(hm), pts = [0, 0.2, 0.5, 0.8, 1].map((t, i) => along(mix(a, b, t), n, [0, 0.0115, 0.014, 0.0115, 0][i] + (i > 0 && i < 4 ? lift : 0))); sg.add(K.mesh(K.geo.tube(pts, 0.0021, { seg: 20, rad: 8 }), LACE)); };
    lace(EL[0].p, EM[0].p, EL[0].h, 0);
    for (let r = 0; r < 4; r++) { const hm = (EL[r].h + EL[r + 1].h) / 2; lace(EL[r].p, EM[r + 1].p, hm, 0); lace(EM[r].p, EL[r + 1].p, hm, 0.0026); }
    lace(EL[4].p, EM[4].p, EL[4].h, 0.001);
    // heel tab, and the sock going down into the shoe
    const loopGeo = K.geo.extrude(K.geo.rrect(0.0058, 0.026, 0.0028), 0.011, { bevel: 0.0003, holes: [K.geo.rrect(0.0030, 0.0232, 0.0014)], curveSegments: 10 }); loopGeo.rotateY(PI / 2); loopGeo.translate(-0.0055, 0, 0);
    sg.add(K.mesh(loopGeo, GREY, { pos: [0, yC(-0.07) - 0.0015, zBk(0.9) - 0.0022], rot: [0.14, 0, 0] }));   // webbing pull loop at the heel
    sg.add(K.mesh(K.geo.cyl(0.035, 0.04, 32), sockMat, { pos: [0, 0.066, -0.004], scale: [0.86, 1, 1.02] }));
    return sg;
  }
  // sock: ribbed, light grey
  const rcv = document.createElement('canvas'); rcv.width = 64; rcv.height = 4; const rg = rcv.getContext('2d'); for (let x = 0; x < 64; x++) { const v = Math.round(128 + 110 * Math.sin(x / 64 * TAU * 8)); rg.fillStyle = `rgb(${v},${v},${v})`; rg.fillRect(x, 0, 1, 4); }
  const sockMat = new T.MeshStandardMaterial({ color: new T.Color('#d0cec8'), roughness: 0.95 }); sockMat.bumpMap = K.canvasTex(rcv, { srgb: false }); sockMat.bumpMap.repeat.set(5, 1); sockMat.bumpScale = 2.4;
  const sockGeo = new T.LatheGeometry(new T.SplineCurve([[0.030, -0.05], [0.0345, -0.02], [0.0352, 0], [0.0345, 0.03], [0.036, 0.07], [0.040, 0.12], [0.045, 0.20], [0.046, 0.26]].map(p => new T.Vector2(p[0], p[1]))).getPoints(28), 40);
  const shoe = buildShoe(), LEG = [];
  for (const sx of [1, -1]) {
    const sockG = new T.Group(); sockG.rotation.order = 'YZX'; g.add(sockG);
    sockG.add(K.mesh(sockGeo, sockMat, { scale: [0.86, 1, 1.02] })); sockG.add(K.mesh(new T.SphereGeometry(0.0352, 28, 20), sockMat, { scale: [0.86, 1, 1.02] }));
    const footG = new T.Group(); footG.rotation.order = 'YXZ'; g.add(footG);
    const inner = sx > 0 ? shoe : shoe.clone(true); inner.position.y = -ANKY; inner.scale.x = sx; footG.add(inner);
    LEG.push({ sx, sockG, footG, hx: sx * HIPX, hy: HIPY, hz: 0, h: 0, k: 0, beta: 0, yaw: 0, roll: 0 });
  }

  const pkx = JE ? 0.100 : 0.139, pky = JE ? 0.897 : 0.906, pk0 = along(S(phiAt(pkx, pky, true), pky), SN(phiAt(pkx, pky, true), pky), 0.003);   // the mouth of the +X front pocket
  // preview cameras: tools/preview.sh legs '{"style":"jeans","look":"hip"}'   look = all | shoe | hip | back | gait
  const SH = [FXS, 0.07, 0.06], LOOK = {
    all: [{ az: 0.55, el: 0.10 }, { az: 2.55, el: 0.12 }, { az: 1.5708, el: 0.04 }, { az: 0.3, el: 1.0 }, { az: 0.95, el: 0.2, d: 1.15, l: [0.07, 0.09, 0.05] }, { az: 0.45, el: 0.1, d: 1.5, l: [0.03, 0.88, 0] }],
    shoe: [{ az: 1.5708, el: 0.06, d: 1.3, l: SH }, { az: 0.75, el: 0.32, d: 1.0, l: SH }, { az: 0.0, el: 0.5, d: 1.0, l: SH }, { az: 2.5, el: 0.25, d: 1.1, l: SH }, { az: -1.2, el: 0.22, d: 1.2, l: [-FXS, 0.07, 0.06] }, { az: 0.4, el: 1.25, d: 1.1, l: SH }],
    hip: [{ az: 0, el: 0.05, d: 1.5, l: [0, 0.88, 0] }, { az: 0.7, el: 0.12, d: 1.5, l: [0, 0.88, 0] }, { az: 1.5708, el: 0.05, d: 1.5, l: [0, 0.88, 0] }, { az: 0.35, el: 0.1, d: 0.8, l: [0.07, 0.92, 0.05] }, { az: 0.25, el: -0.28, d: 1.3, l: [0, 0.80, 0] }, { az: 1.2, el: 0.1, d: 1.5, l: [0, 0.86, 0] }],
    back: [{ az: PI, el: 0.05, d: 1.5, l: [0, 0.88, 0] }, { az: 2.5, el: 0.12, d: 1.5, l: [0, 0.88, 0] }, { az: PI + 0.25, el: 0.1, d: 0.8, l: [-0.07, 0.9, -0.08] }, { az: PI - 0.2, el: 0.15, d: 0.8, l: [0.08, 0.84, -0.1] }, { az: PI - 0.3, el: -0.2, d: 1.4, l: [0, 0.82, 0] }, { az: 2.2, el: 0.1, d: 1.5, l: [0, 0.86, 0] }],
    gait: [0, 1, 2, 3, 4, 5].map(() => ({ az: 1.5708, el: 0.03, d: 4.4, l: [0, 0.5, 0] })),
    front: [0, 1, 2, 3, 4, 5].map(i => ({ az: i < 3 ? 0 : PI, el: 0.05, d: 4.2, l: [0, 0.5, 0] })),
    ankle: [[0.27, 0.10], [0.12, 0.09], [-0.24, 0.10], [-0.36, 0.15], [-0.43, 0.20], [-0.37, 0.23]].map(q => ({ az: 1.25, el: 0.12, d: 1.15, l: [FXW, q[1] + 0.03, q[0]] })),
    lift: [0, 1, 2, 3, 4, 5].map(i => ({ az: i < 3 ? 1.1 : -1.1, el: 0.08, d: 3.4, l: [0, 0.5, 0] })),
  };
  return {
    group: g,
    size: { waist: 1.0, hip: HIPY, knee: KNEEY, ankle: ANKY, shoe: ZTOE - ZHEEL, width: 2 * PA(0.9), stride: STRIDE, step: STRIDE / 2 },
    anchors: { waistL: [-(PA(0.985) - 0.007), 0.985, 0], waistR: [PA(0.985) - 0.007, 0.985, 0], pocket: pk0, handR: [0.30, 0.74, 0.05], handL: [-0.30, 0.74, 0.05],
      top: [0, 1.0, 0], hip: [0, HIPY, 0], kneeR: [HIPX, KNEEY, 0.07], kneeL: [-HIPX, KNEEY, 0.07], backPocket: [0.089, 0.83, -0.125], footR: [FXS, 0.06, 0.07], footL: [-FXS, 0.06, 0.07], ground: [0, 0, 0] },
    view: { l: [0, 0.52, 0], d: 3.9, close: [0.07, 0.1, 0.05], keys: (o && o.pv && o.pv.keys) || LOOK[o && o.look] || LOOK.all },
    defaults: { walk: 0, still: 0, lift: 0 },
    demo(s, t) {
      const lk = o && o.look, pv = o && o.pv;
      if (pv) { const i = Math.min(5, Math.floor(t / 2)), pick = a => Array.isArray(a) ? a[Math.min(i, a.length - 1)] : (a || 0); s.walk = pick(pv.walk); s.still = pick(pv.still); s.lift = pick(pv.lift); return; }   // preview only: pv = { keys: [six cameras], walk, still, lift: number | [six numbers] }
      if (lk === 'shoe') { s.still = 1; return; }
      if (lk === 'gait') { s.walk = t / 12; return; }
      if (lk === 'ankle') { s.walk = [0.0, 0.12, 0.38, 0.50, 0.60, 0.70][Math.min(5, Math.floor(t / 2))]; return; }
      if (lk === 'front') { s.walk = [0.02, 0.27, 0.5, 0.02, 0.27, 0.5][Math.min(5, Math.floor(t / 2))]; return; }
      if (lk === 'lift') { s.still = 1; s.lift = [0, 0.5, 1, 0, -0.5, -1][Math.min(5, Math.floor(t / 2))]; return; }
      if (lk === 'hip' || lk === 'back') { s.still = t < 8 ? 1 : 0; s.walk = t < 10 ? 0.0 : 0.5; return; }
      s.walk = t < 10 ? 0.14 + 0.115 * t : 0; s.still = t >= 10 ? 1 : 0; s.lift = t >= 11 ? 1 : 0;
    },
    apply(s) {
      const stl = clamp(s.still || 0), w = 1 - stl, ph = s.walk || 0, lf = clamp(s.lift || 0, -1, 1), la = Math.abs(lf), sw = Math.sin(TAU * (ph - 0.05));
      const px = w * 0.016 * sw - 0.014 * lf, py = lerp(G.Y0 - G.BOB * 0.5 * (1 + Math.cos(2 * TAU * ph)), STANDY, stl) - 0.003 * la;
      const roll = w * 0.03 * sw + 0.02 * lf, yaw = -w * 0.07 * Math.cos(TAU * ph), cy = Math.cos(yaw), sy = Math.sin(yaw), cr = Math.cos(roll), sr = Math.sin(roll);
      pelvisG.position.set(px, py, 0); pelvisG.rotation.set(0, yaw, roll);
      for (const L of LEG) {
        const sx = L.sx, p = (((ph + (sx > 0 ? 0 : 0.5)) % 1) + 1) % 1, fy = sx * TOEOUT, li = sx > 0 ? Math.max(lf, 0) : Math.max(-lf, 0);
        foot(p, FT);
        L.hx = px + sx * HIPX * cr * cy; L.hy = py + sx * HIPX * sr; L.hz = -sx * HIPX * cr * sy; L.yaw = yaw; L.roll = roll;
        let ax = lerp(sx * FXW, sx * FXS, stl) + Math.sin(fy) * FT.rz * w, ay = lerp(FT.y, ANKY, stl), az = lerp(FT.z + STRIDE * (G.pMid - p), 0, stl), th = FT.th * w;
        if (li > 0) { rock(li * LIFTA, RK); ax += Math.sin(fy) * RK[0]; az += RK[0]; ay += RK[1] - ANKY; }
        // two-bone inverse kinematics in the plane through the hip and the ankle
        const dx = ax - L.hx, dy = L.hy - ay, dz = az - L.hz, dn = Math.hypot(dx, dy), beta = Math.atan2(dx, dy), dc = Math.min(Math.hypot(dz, dn), LL * 0.9995);
        const k = PI - Math.acos(clamp((L1 * L1 + L2 * L2 - dc * dc) / (2 * L1 * L2), -1, 1)), h = Math.atan2(dz, dn) + Math.acos(clamp((L1 * L1 + dc * dc - L2 * L2) / (2 * L1 * dc), -1, 1)), sh = h - k;
        th += (-sh + G.PL - th) * FT.b * w + li * LIFTA;
        L.h = h; L.k = k; L.beta = beta;
        const cb = Math.cos(beta), sb = Math.sin(beta), fx2 = L.hx + (L1 * Math.cos(h) + L2 * Math.cos(sh)) * sb, fy2 = L.hy - (L1 * Math.cos(h) + L2 * Math.cos(sh)) * cb, fz2 = L.hz + L1 * Math.sin(h) + L2 * Math.sin(sh);
        L.sockG.position.set(fx2, fy2, fz2); L.sockG.rotation.set(k - h, 0, beta);
        L.footG.position.set(fx2, fy2, fz2); L.footG.rotation.set(th, fy, 0);
      }
      for (const D of DEF) deform(D, D.sx > 0 ? LEG[0] : LEG[1]);
      for (let i = 0; i < cords.length; i++) { cords[i].rotation.z = w * 0.05 * Math.sin(2 * TAU * ph + i * 1.3); cords[i].rotation.x = w * 0.035 * Math.cos(2 * TAU * ph + i) - 0.28 * Math.max(0, LEG[i].h); }   // the raised thigh pushes its cord forward
    },
  };
});
