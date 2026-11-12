// A whole person, walking: the 'legs' model plus a torso, two swinging arms, a neck and a head. Real size, about 1.82 m.
// Needs assets/legs.js loaded too. Local frame: feet on y = 0, faces +Z, "R" is the +X side.
// options: { style: 'jogger' | 'jeans' (the trousers, see legs.js), top: 'hoodie' | 'jacket' | 'tee', topColor: '#hex' (optional) }
// state: everything legs has (walk, still, lift) plus
//   carryR 0..1   the right arm hangs straight and still, as if holding a bag (hang the bag from anchor handR)
//   carryL 0..1   same for the left arm
//   arms   0..1   how much the arms swing with the walk (default 1)
//   topVis        boolean: false hides the jacket layer of top 'jacket' and shows the tee under it (he took his jacket off)
// Anchors (standing pose): everything legs has, with handR / handL moved to the real hands, plus head, face, chest, shoulderR, shoulderL.
KIT.asset('person', (K, o) => {
  const T = THREE, PI = Math.PI, legs = K.assets.legs(K, o), g = legs.group;
  const pelvis = g.children.find(c => c.isGroup && c.rotation.order === 'YZX') || g;      // the upper body rides on the pelvis (bob, sway, turn)
  const HIPY = pelvis === g ? 0 : pelvis.position.y, up = new T.Group(); up.position.y = -HIPY; pelvis.add(up);   // inside `up`, y is metres above the ground (standing)
  const top = o.top || 'hoodie';
  const TOPC = o.topColor || (top === 'jacket' ? '#1d1e21' : top === 'tee' ? '#f1efea' : '#e9e6df');
  const cloth = new T.MeshStandardMaterial({ color: new T.Color(TOPC), roughness: 0.92, metalness: 0 });
  cloth.bumpMap = K.canvasTex(K.noiseCanvas(128, 31, 'weave'), { srgb: false, repeat: 18 }); cloth.bumpScale = 0.35;
  const tee = new T.MeshStandardMaterial({ color: new T.Color('#f1efea'), roughness: 0.95, metalness: 0 });
  const rib = new T.MeshStandardMaterial({ color: new T.Color(TOPC).multiplyScalar(0.9), roughness: 0.95, metalness: 0 });
  const skin = new T.MeshStandardMaterial({ color: new T.Color('#c9b3a1'), roughness: 0.78, metalness: 0 });
  const hair = new T.MeshStandardMaterial({ color: new T.Color('#23211f'), roughness: 0.85, metalness: 0 });
  const lathe = (pts, zs, mat, seg = 56) => { const m = K.mesh(new T.LatheGeometry(pts.map(p => new T.Vector2(p[0], p[1])), seg), mat); m.scale.z = zs; return m; };
  // ---- torso: a soft tapered body, wider at the chest and shoulders, with a hem band over the waistband
  const BODY = [[0.0, 0.94], [0.150, 0.945], [0.172, 0.965], [0.176, 1.02], [0.180, 1.12], [0.190, 1.25], [0.200, 1.34], [0.204, 1.40], [0.198, 1.44], [0.176, 1.468], [0.135, 1.49], [0.088, 1.507], [0.064, 1.52], [0.0, 1.522]];
  const torso = new T.Group(); up.add(torso);
  const body = lathe(BODY, 0.62, top === 'tee' ? tee : cloth); torso.add(body);
  torso.add(lathe([[0.168, 0.938], [0.181, 0.946], [0.183, 0.985], [0.176, 0.995]], 0.62, rib));                                  // hem band
  const under = lathe(BODY.map(p => [p[0] * 0.965, p[1]]), 0.6, tee); under.visible = false; torso.add(under);                     // the tee under a jacket
  if (top === 'hoodie') {
    const hood = K.mesh(new T.SphereGeometry(0.1, 32, 20), cloth, { pos: [0, 1.495, -0.075], scale: [1.35, 0.78, 0.82] }); torso.add(hood);
    const collar = K.mesh(new T.TorusGeometry(0.074, 0.026, 16, 48), cloth, { pos: [0, 1.515, 0.004], rot: [PI / 2 + 0.22, 0, 0] }); torso.add(collar);
    for (const sx of [-1, 1]) torso.add(K.mesh(K.geo.tube([[sx * 0.022, 1.50, 0.078], [sx * 0.026, 1.42, 0.118], [sx * 0.03, 1.33, 0.122]], 0.004, { seg: 12 }), K.mat.clay('#d8d5ce', 0.9)));   // drawcords
  }
  if (top === 'jacket') {                                                                                                         // a short puffer: soft horizontal rolls and a zip
    for (let i = 0; i < 6; i++) { const y = 1.0 + i * 0.075, r = 0.186 + 0.022 * Math.sin(PI * (i + 0.5) / 6.4);
      const roll = K.mesh(new T.TorusGeometry(r, 0.043, 14, 56), cloth, { pos: [0, y, 0], rot: [PI / 2, 0, 0], scale: [1, 0.66, 1] }); torso.add(roll); }
    torso.add(K.mesh(K.geo.box(0.008, 0.46, 0.006), K.mat.metal('#9a9da3', 0.4), { pos: [0, 1.2, 0.151] }));
    torso.add(K.mesh(new T.TorusGeometry(0.078, 0.034, 16, 48), cloth, { pos: [0, 1.50, 0.0], rot: [PI / 2 + 0.15, 0, 0] }));        // stand-up collar
  }
  // ---- neck and head: a calm mannequin head with hair, ears and a hint of a nose, no drawn face
  up.add(K.mesh(K.geo.cyl(0.05, 0.11, 32, 0.046), skin, { pos: [0, 1.55, -0.004] }));
  const head = new T.Group(); head.position.set(0, 1.698, 0.006); up.add(head);
  head.add(K.mesh(new T.SphereGeometry(0.104, 48, 36), skin, { scale: [0.89, 1.16, 0.98] }));
  head.add(K.mesh(new T.SphereGeometry(0.014, 16, 12), skin, { pos: [0, -0.018, 0.102], scale: [0.85, 1.5, 1.0] }));                // nose
  for (const sx of [-1, 1]) head.add(K.mesh(new T.SphereGeometry(0.02, 16, 12), skin, { pos: [sx * 0.094, -0.012, -0.006], scale: [0.45, 1.25, 0.8] }));   // ears
  const hairCap = K.mesh(new T.SphereGeometry(0.109, 48, 28, 0, PI * 2, 0, 1.72), hair, { pos: [0, 0.008, -0.008], rot: [-0.52, 0, 0], scale: [0.925, 1.13, 1.03] }); head.add(hairCap);
  // ---- arms: shoulder -> elbow -> wrist, sleeves in the top's cloth, a mitten hand
  const UA = 0.295, FA = 0.262, mk = sx => {
    const sh = new T.Group(); sh.position.set(sx * 0.198, 1.408, -0.004); up.add(sh);
    const sleeve = top === 'tee' ? tee : cloth;
    sh.add(K.mesh(new T.SphereGeometry(0.058, 24, 18), sleeve, { scale: [1.0, 1.0, 1.05] }));
    const ua = K.mesh(new T.CapsuleGeometry(0.05, UA - 0.06, 8, 24), top === 'tee' ? skin : sleeve, { pos: [0, -UA / 2, 0] }); sh.add(ua);
    if (top === 'tee') sh.add(K.mesh(new T.CapsuleGeometry(0.056, 0.085, 8, 24), tee, { pos: [0, -0.075, 0] }));                    // short sleeve
    const el = new T.Group(); el.position.y = -UA; sh.add(el);
    el.add(K.mesh(new T.CapsuleGeometry(0.044, FA - 0.05, 8, 24), top === 'tee' ? skin : sleeve, { pos: [0, -FA / 2, 0] }));
    if (top !== 'tee') el.add(K.mesh(K.geo.cyl(0.046, 0.04, 28, 0.043), rib, { pos: [0, -FA + 0.012, 0] }));                        // cuff
    const hand = new T.Group(); hand.position.y = -FA - 0.012; el.add(hand);
    hand.add(K.mesh(K.geo.rbox(0.034, 0.1, 0.078, 0.016), skin, { pos: [0, -0.05, 0.004] }));
    hand.add(K.mesh(new T.CapsuleGeometry(0.0125, 0.034, 6, 12), skin, { pos: [-sx * 0.004, -0.04, 0.048], rot: [0.5, 0, 0] }));     // thumb
    return { sh, el, hand, sx };
  };
  const armR = mk(1), armL = mk(-1);
  const A = Object.assign({}, legs.anchors || {}, { head: [0, 1.70, 0], face: [0, 1.69, 0.1], chest: [0, 1.28, 0.12], shoulderR: [0.198, 1.408, 0], shoulderL: [-0.198, 1.408, 0],
    handR: [0.248, 0.79, 0.012], handL: [-0.248, 0.79, 0.012], top: [0, 1.82, 0] });
  const la = legs.apply, cl = K.clamp;
  return {
    group: g, size: Object.assign({}, legs.size, { height: 1.82, shoulder: 0.42 }), anchors: A,
    view: { l: [0, 0.92, 0], d: 6.4, close: [0, 1.45, 0] },
    defaults: Object.assign({}, legs.defaults, { carryR: 0, carryL: 0, arms: 1, topVis: true }),
    apply(s, t) {
      la.call(legs, s, t);
      const st = cl(s.still || 0), w = 2 * PI * (s.walk || 0), amp = 0.42 * (1 - st) * cl(s.arms ?? 1);
      for (const a of [armR, armL]) {
        const carry = cl(a.sx > 0 ? s.carryR : s.carryL), sw = -a.sx * Math.cos(w) * amp * (1 - 0.88 * carry);        // the arm swings against its own leg
        a.sh.rotation.set(-sw + 0.03 * carry, 0, a.sx * (0.085 + 0.02 * carry));                                     // rotation.x < 0 swings the hand forward
        a.el.rotation.set(-(0.16 + 0.28 * Math.max(0, sw) + 0.1 * (1 - st) * (1 - carry)) * (1 - 0.7 * carry), 0, 0);
        a.hand.rotation.set(0, 0, 0);
      }
      head.rotation.set(0.02, 0, 0);
      const jv = s.topVis !== false; if (top === 'jacket') { for (const c of torso.children) c.visible = jv || c === under; under.visible = !jv; }
    },
    demo(s, t) { s.walk = t * 0.55; s.still = t > 8 ? 1 : 0; s.carryR = t > 4 ? 1 : 0; },
  };
});
