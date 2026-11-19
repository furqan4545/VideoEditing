// The two characters, built from voxels. clawd = the orange Claude block (with a beret: it draws). pimp = the host, Dr. Pimp.
KIT.asset('clawd', (K, o) => {
  const T = THREE, V = VOX, u = 0.036, g = new T.Group(), body = new T.Group(); g.add(body);
  const OR = '#e8662c', ORD = '#c9501f', BK = '#141216';
  body.add(V.boxes([[0, 2 * u, 0, 10 * u, 7 * u, 7 * u, OR]]));
  const legs = V.boxes([[-3.6 * u, 0, 2.4 * u, 1.5 * u, 2.2 * u, 1.5 * u, ORD], [3.6 * u, 0, 2.4 * u, 1.5 * u, 2.2 * u, 1.5 * u, ORD], [-3.6 * u, 0, -2.4 * u, 1.5 * u, 2.2 * u, 1.5 * u, ORD], [3.6 * u, 0, -2.4 * u, 1.5 * u, 2.2 * u, 1.5 * u, ORD], [-1.3 * u, 0, 2.4 * u, 1.5 * u, 2.2 * u, 1.5 * u, ORD], [1.3 * u, 0, 2.4 * u, 1.5 * u, 2.2 * u, 1.5 * u, ORD]]); g.add(legs);
  const arm = (sx) => { const a = new T.Group(); a.position.set(sx * 5 * u, 5.2 * u, 0); a.add(V.boxes([[sx * 1.1 * u, -1 * u, 0, 2.2 * u, 2 * u, 2.2 * u, OR]])); body.add(a); return a; };
  const aL = arm(-1), aR = arm(1);
  const eye = (sx) => { const e = V.boxes([[0, -1.3 * u, 0, 1.25 * u, 2.6 * u, 0.3 * u, BK]], { rough: 0.3 }); e.position.set(sx * 2.3 * u, 6.2 * u, 3.5 * u); body.add(e); return e; };
  const eL = eye(-1), eR = eye(1);
  const happy = (sx) => { const h = new T.Group(); h.add(V.boxes([[-0.75 * u, 0, 0, 0.8 * u, 0.8 * u, 0.3 * u, BK], [0, 0.75 * u, 0, 0.8 * u, 0.8 * u, 0.3 * u, BK], [0.75 * u, 0, 0, 0.8 * u, 0.8 * u, 0.3 * u, BK]])); h.position.set(sx * 2.3 * u, 5.4 * u, 3.5 * u); body.add(h); return h; };
  const hL = happy(-1), hR = happy(1);
  // the beret
  const hat = new T.Group(); hat.position.set(0, 9 * u, 0); hat.rotation.z = -0.1;
  hat.add(V.boxes([[0.6 * u, 0, 0, 10.4 * u, 1.3 * u, 8 * u, '#1a1820'], [0.9 * u, 1.3 * u, 0, 7.6 * u, 0.9 * u, 6 * u, '#221f2a'], [0.9 * u, 2.2 * u, 0, 1 * u, 1 * u, 1 * u, '#1a1820'], [0, -0.5 * u, 0, 8.6 * u, 0.6 * u, 7.2 * u, '#e11d2e']]));
  body.add(hat);
  // a pencil for the drawing beat
  const pen = new T.Group(); pen.add(V.boxes([[0, 0, 0, 0.9 * u, 6 * u, 0.9 * u, '#ffc93c'], [0, 6 * u, 0, 0.9 * u, 1 * u, 0.9 * u, '#ff8fa3'], [0, -1.2 * u, 0, 0.7 * u, 1.2 * u, 0.7 * u, '#f3d2a7'], [0, -1.9 * u, 0, 0.35 * u, 0.7 * u, 0.35 * u, '#222']])); pen.position.set(2.2 * u, -1 * u, 1.4 * u); pen.rotation.set(0.5, 0, -0.5); aR.add(pen);
  return { group: g, size: { h: 11.5 * u, w: 10 * u }, anchors: { top: [0, 12 * u, 0], face: [0, 6 * u, 3.6 * u], hand: [7 * u, 4.5 * u, 1.5 * u] }, view: { l: [0, 0.2, 0], d: 2 },
    defaults: { bob: 1, hop: 0, happy: 0, armL: 0, armR: 0, squash: 0, pen: 0, ph: 0, tilt: 0 },
    apply(s, t) {
      const b = s.bob * Math.sin(t * 2.6 + s.ph), sq = s.squash;
      body.position.y = s.hop + s.bob * 0.006 * (1 + b); body.scale.set(1 + sq * 0.12, 1 - sq * 0.14 + s.bob * 0.012 * b, 1 + sq * 0.12); body.rotation.z = s.tilt;
      aL.rotation.z = -s.armL - 0.05 * b * s.bob; aR.rotation.z = s.armR + 0.05 * b * s.bob;
      const blink = (Math.sin(t * 1.3 + s.ph * 2) > 0.985 || Math.sin(t * 0.9 + 1 + s.ph) > 0.992) ? 0.12 : 1, hp = s.happy > 0.5;
      eL.visible = eR.visible = !hp; hL.visible = hR.visible = hp; eL.scale.y = eR.scale.y = blink; pen.visible = s.pen > 0.5;
    } };
});
KIT.asset('pimp', (K, o) => {
  const T = THREE, V = VOX, u = 0.046, g = new T.Group(), body = new T.Group(); g.add(body);
  const SK = '#f0c39c', SKD = '#dba77e', HAIR = '#1c1416', COAT = '#f3efe6', COATD = '#d9d3c6', PUR = '#6d28d9', PURD = '#4c1d95', GOLD = '#f6c343', BK = '#131216', PANT = '#23242b';
  // legs + shoes
  g.add(V.boxes([[-1.6 * u, 0.8 * u, 0, 2.6 * u, 2.6 * u, 3 * u, PANT], [1.6 * u, 0.8 * u, 0, 2.6 * u, 2.6 * u, 3 * u, PANT], [-1.6 * u, 0, 0.5 * u, 2.8 * u, 0.9 * u, 4 * u, BK], [1.6 * u, 0, 0.5 * u, 2.8 * u, 0.9 * u, 4 * u, BK]]));
  // coat, shirt, chain
  body.add(V.boxes([[0, 3.2 * u, 0, 7.4 * u, 6.2 * u, 4.4 * u, COAT], [0, 3.2 * u, 2.25 * u, 2.2 * u, 6.2 * u, 0.2 * u, '#8f0f1a'], [-1.9 * u, 3.2 * u, 2.25 * u, 1.3 * u, 3 * u, 0.25 * u, COATD], [1.9 * u, 3.2 * u, 2.25 * u, 1.3 * u, 3 * u, 0.25 * u, COATD],
    [0, 7.4 * u, 2.4 * u, 1.9 * u, 0.6 * u, 0.3 * u, GOLD], [0, 6.5 * u, 2.45 * u, 0.9 * u, 0.9 * u, 0.3 * u, GOLD], [2.6 * u, 6.4 * u, 2.3 * u, 1 * u, 1.6 * u, 0.25 * u, '#35ecd0']]));
  const arm = (sx) => { const a = new T.Group(); a.position.set(sx * 4.2 * u, 8.8 * u, 0); a.add(V.boxes([[sx * 0.7 * u, -5 * u, 0, 2 * u, 5 * u, 2.2 * u, COAT], [sx * 0.7 * u, -6.3 * u, 0, 1.9 * u, 1.4 * u, 2 * u, SK]])); body.add(a); return a; };
  const aL = arm(-1), aR = arm(1);
  // head
  const head = new T.Group(); head.position.set(0, 9.4 * u, 0); body.add(head);
  head.add(V.boxes([[0, 0, 0, 9 * u, 8 * u, 8 * u, SK], [0, 5.4 * u, -0.4 * u, 9.6 * u, 3 * u, 8.6 * u, HAIR], [-4.5 * u, 2.6 * u, -0.6 * u, 0.8 * u, 3.4 * u, 7 * u, HAIR], [4.5 * u, 2.6 * u, -0.6 * u, 0.8 * u, 3.4 * u, 7 * u, HAIR], [0, 0, -4 * u, 9.2 * u, 6 * u, 0.6 * u, HAIR],
    [-2.1 * u, 5.7 * u, 4.05 * u, 1.7 * u, 0.5 * u, 0.25 * u, HAIR], [2.1 * u, 5.9 * u, 4.05 * u, 1.7 * u, 0.5 * u, 0.25 * u, HAIR],
    [-2.3 * u, 1.2 * u, 4.05 * u, 1.6 * u, 0.5 * u, 0.2 * u, '#e89a8a'], [2.3 * u, 1.2 * u, 4.05 * u, 1.6 * u, 0.5 * u, 0.2 * u, '#e89a8a']]));
  const eye = (sx) => { const e = V.boxes([[0, -1 * u, 0, 1.2 * u, 2 * u, 0.3 * u, BK]], { rough: 0.3 }); e.position.set(sx * 2.1 * u, 4.1 * u, 4.05 * u); head.add(e); return e; };
  const eL = eye(-1), eR = eye(1);
  const mouth = V.boxes([[0, 0, 0, 2 * u, 0.6 * u, 0.25 * u, '#7a2b2b']]); mouth.position.set(0, 1.1 * u, 4.05 * u); head.add(mouth);
  const mouthO = V.boxes([[0, 0, 0, 1.6 * u, 1.5 * u, 0.25 * u, '#5a1616']]); mouthO.position.set(0, 0.7 * u, 4.05 * u); head.add(mouthO);
  // the hat: wide brim, tall crown, gold band, a feather
  const hat = new T.Group(); hat.position.set(0, 7.6 * u, 0); hat.rotation.z = 0.07;
  hat.add(V.boxes([[0, 0, 0, 14 * u, 0.9 * u, 13 * u, PUR], [0, 0.9 * u, 0, 9.4 * u, 1.1 * u, 8.6 * u, GOLD], [0, 2 * u, 0, 9.4 * u, 3.4 * u, 8.6 * u, PUR], [0, 5.4 * u, 0, 8 * u, 0.7 * u, 7.2 * u, PURD],
    [5 * u, 1.2 * u, 0, 0.7 * u, 4.6 * u, 1.6 * u, '#35ecd0'], [5.4 * u, 4.6 * u, 0, 0.7 * u, 2 * u, 1.2 * u, '#9ff5e6']])); head.add(hat);
  return { group: g, size: { h: 24 * u }, anchors: { head: [0, 14 * u, 0], top: [0, 25 * u, 0], hand: [5.5 * u, 3 * u, 1 * u] }, view: { l: [0, 0.55, 0], d: 4 },
    defaults: { bob: 1, hop: 0, armL: 0, armR: 0, fwdL: 0, fwdR: 0, look: 0, nod: 0, talk: 0, ph: 0, lean: 0 },
    apply(s, t) {
      const b = Math.sin(t * 2.2 + s.ph) * s.bob;
      body.position.y = s.hop + 0.008 * b; body.rotation.z = s.lean; head.rotation.y = s.look; head.rotation.x = s.nod + 0.02 * b; head.position.y = 9.4 * u + 0.004 * b;
      aL.rotation.set(-s.fwdL, 0, -s.armL - 0.03 - 0.02 * b); aR.rotation.set(-s.fwdR, 0, s.armR + 0.03 + 0.02 * b);
      const blink = (Math.sin(t * 1.1 + s.ph) > 0.988 || Math.sin(t * 0.73 + 2 + s.ph) > 0.993) ? 0.12 : 1; eL.scale.y = eR.scale.y = blink;
      const open = s.talk > 0 && Math.sin(t * 17) * Math.sin(t * 5.3 + 1) > 0.05; mouth.visible = !open; mouthO.visible = open;
    } };
});
