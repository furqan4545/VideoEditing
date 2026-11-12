// The world: where every model stands on the paper. Metres, Y up. One world, one camera, no cuts.
//   P  the two prints of Ali at the start (the store hook, then the studio take with the cupped hand)
//   G  the supermarket gates, straight behind the hole in the studio print. Shopper walks along +Z between them.
//   T  the tag at rest: on the cheese, in the shopper's bag, between the gates (origin = centre of the tag's underside, +X along the strip)
//   C  the checkout with the switching-off pad, behind the gates
//   S  clothes shop pay point   H  home (washing machine, calendar)   W  hardware shop (second gates, tool wall, tray)   E  the last print of Ali
// Shot files may K.make() extra models and set rest placements at load time for models only they use.
window.WORLD = {
  rotG: 0.62, HAND_UV: [0.215, 0.585], ST2: [3.4, 0, 0], G: [3.02, 0, -9.0],
  WALK_Z0: -2.9, WALK_Z1: 0.15,                       // the shopper's path in G: starts inside the shop, stops between the gates
  // when each place exists (so far-away sets never clutter a frame); each window overlaps the camera move that reaches or leaves it
  windows: { P: [0, 6.3], G: [2.3, 73.2], C: [60.5, 71.6], S: [71.9, 79.3], H: [77.6, 81.2], W: [79.0, 90.7], E: [89.3, 95] },
};
window.buildWorld = function (K) {
  const W = window.WORLD, w = K.w = {}, T = THREE, PI = Math.PI;
  const make = (name, opts) => { try { return K.make(name, opts); } catch (e) { console.warn('world: ' + e.message); return null; } };
  const put = (parent, inst, pos, rotY) => { if (!inst) return inst; if (pos) inst.group.position.set(pos[0], pos[1], pos[2]); if (rotY != null) inst.group.rotation.y = rotY; parent.add(inst.group); return inst; };
  const A = (inst, name, fb) => (inst && inst.anchors && inst.anchors[name]) || fb;
  const groups = {}; const reg = (st, ...xs) => { (groups[st] = groups[st] || []).push(...xs.filter(Boolean)); };

  // ---- P: the prints
  const P = K.station('P', [0, 0, 0], 0);
  w.loc = put(P, make('print', { foot: 'loc', w: 1.13, h: 2.0, border: 0 }));
  w.st2 = put(P, make('print', { foot: 'st2', w: 1.5, h: 1.5, border: 0.022 }), [W.ST2[0], 0, 0]);
  reg('P', w.loc, w.st2);

  // ---- G: the gates, the shopper with the bag, the fields
  const G = K.station('G', W.G, W.rotG);
  w.gA = put(G, make('gate'), [-0.5, 0, 0], PI / 2); w.gB = put(G, make('gate'), [0.5, 0, 0], PI / 2);
  w.gatefield = put(G, make('gatefield')); w.answer = put(G, make('answer'));
  // the walker: a group that carries the legs and the bag; shots move walker.position.z from WALK_Z0 to WALK_Z1 (rest = arrived)
  const walker = w.walker = new T.Group(); walker.position.set(0, 0, W.WALK_Z1); G.add(walker);
  w.legs = put(walker, make('legs', { style: 'jogger' }));
  const hand = A(w.legs, 'handR', [0.30, 0.74, 0.05]);
  w.bag = make('bag'); const gripY = (w.bag && w.bag.size && w.bag.size.gripY) || 0.50;
  if (w.bag) {                                                      // the bag never shades what is inside it, and at tag scale it melts away (state ghost, set by the world)
    const own = []; w.bag.group.traverse(o => { if (o.isMesh || o.isLine || o.isLineSegments) { o.castShadow = false; own.push(o); } });
    const ap = w.bag.apply; w.bag.defaults.ghost = 0;
    w.bag.apply = function (s, t) { for (const o of own) if (o.userData._gv !== undefined) { o.visible = o.userData._gv; o.userData._gv = undefined; } ap.call(this, s, t);
      if (s.ghost > 0.35) for (const o of own) { o.userData._gv = o.visible; o.visible = false; } };
  }
  put(walker, w.bag, [hand[0], hand[1] - gripY, hand[2]], PI / 2);                    // the bag hangs from the hand, its wide face along the walk
  if (w.bag) {
    const inside = A(w.bag, 'inside', [0, 0.004, 0]);
    w.cheese = put(w.bag.group, make('cheese'), [inside[0], inside[1], inside[2]], 0);
    w.keys = put(w.bag.group, make('keys'), [inside[0] - 0.085, inside[1], inside[2] + 0.02], 0.5);
    const mouth = A(w.bag, 'mouth', [0, 0.38, 0]);
    w.receipt = put(w.bag.group, make('receipt', { len: 0.62 }), [mouth[0] + 0.07, mouth[1] + 0.20, mouth[2] + 0.062], 0);
    if (w.cheese) { const tp = A(w.cheese, 'tag', [0, 0.042, 0]); w.tag = put(w.cheese.group, make('tag'), [tp[0], tp[1], tp[2]], 0); }
  }
  reg('G', w.gA, w.gB, w.legs, w.bag, w.cheese, w.keys, w.receipt, w.tag);
  // ---- T: the tag's own frame (valid while the walker stands at rest), and the things that live at tag scale
  const Tst = w.tag ? K.stationFrom('T', w.tag.group) : K.station('T', [W.G[0], 0.42, W.G[2]], W.rotG);
  w.band = put(Tst, make('band')); w.tag2 = put(Tst, make('tag'), [0, 0.0052, 0]);    // tag2: the grey strip with no magnet (shots hide its housing)
  w.battery = put(Tst, make('battery'), [-0.012, 0.007, 0]); w.chip = put(Tst, make('chip'), [0.012, 0.007, 0]); w.pin = put(Tst, make('pin'), [0.0, 0.00092, 0.0056]);
  w.ruler = put(Tst, make('ruler'), [0.0, -0.062, -0.06], 0); if (w.ruler) w.ruler.group.scale.setScalar(0.12);          // a miniature desk behind the tag
  w.swing = put(Tst, make('swing'), [0.012, 0, -0.035], -0.5); if (w.swing) w.swing.group.scale.setScalar(0.012);
  w.mp = put(Tst, make('macropaper'), [0, -0.00003, 0]);
  // props: hidden until a shot shows them (shot: u.w.ruler.s.vis = true)
  const props = [w.band, w.tag2, w.battery, w.chip, w.pin, w.ruler, w.swing, w.gatefield, w.answer];

  // ---- C: the checkout, a second cheese with its tag
  const C = K.station('C', K.V([-1.15, 0, -3.3]).applyMatrix4(G.matrixWorld).toArray(), W.rotG);
  w.checkout = put(C, make('checkout'));
  const pad = A(w.checkout, 'pad', [0, 0.9, 0]);
  w.cheese2 = put(C, make('cheese'), [pad[0], pad[1], pad[2]], 0);
  if (w.cheese2) { const tp = A(w.cheese2, 'tag', [0, 0.042, 0]); w.tag3 = put(w.cheese2.group, make('tag'), [tp[0], tp[1], tp[2]], 0); w.pin3 = put(w.tag3.group, make('pin'), [0, 0.00092, 0.0056]); }
  if (w.tag3) w.mp3 = put(w.tag3.group, make('macropaper'), [0, -0.00003, 0]);
  if (w.tag3) { w.band3 = put(w.tag3.group, make('band')); w.swing3 = put(w.tag3.group, make('swing', { tone: 'grey' }), [0.012, 0, -0.035], -0.5); if (w.swing3) w.swing3.group.scale.setScalar(0.012); props.push(w.band3, w.swing3); }
  reg('C', w.checkout, w.cheese2, w.tag3); props.push(w.pin3);

  // ---- S: the clothes shop
  const S = K.station('S', K.V([10, 0, -0.5]).applyMatrix4(G.matrixWorld).toArray(), W.rotG);
  w.till = put(S, make('till')); const top = A(w.till, 'top', [0, 0.95, 0]);
  w.jeans = put(S, make('jeans'), [top[0], top[1], top[2]], 0);
  const pr = A(w.till, 'printer', [0.3, 1.0, 0]); w.receipt2 = put(S, make('receipt', { len: 0.22 }), [pr[0], pr[1], pr[2]], 0);
  reg('S', w.till, w.jeans, w.receipt2);

  // ---- H: home
  const H = K.station('H', K.V([19, 0, -0.5]).applyMatrix4(G.matrixWorld).toArray(), W.rotG);
  w.washer = put(H, make('washer')); w.calendar = put(H, make('calendar'), [0.52, 0, 0.12], -0.25);
  reg('H', w.washer, w.calendar);

  // ---- W: the hardware shop
  const Wst = K.station('W', K.V([28, 0, -0.5]).applyMatrix4(G.matrixWorld).toArray(), W.rotG);
  w.gC = put(Wst, make('gate'), [-0.5, 0, 0], PI / 2); w.gD = put(Wst, make('gate'), [0.5, 0, 0], PI / 2);
  w.pegboard = put(Wst, make('pegboard'), [-0.35, 0, -3.0], 0);
  const walker2 = w.walker2 = new T.Group(); walker2.position.set(0, 0, 0.2); Wst.add(walker2);
  w.legs2 = put(walker2, make('legs', { style: 'jeans' }));
  w.tray = put(Wst, make('tray'), [1.25, 0.0, 0.5], -0.3);
  const ti = A(w.tray, 'inside', [0, 0.02, 0]);
  if (w.tray) { w.jacket = put(w.tray.group, make('jacket'), [ti[0] - 0.02, ti[1], ti[2] - 0.02], 0.2); w.shoes = put(w.tray.group, make('shoes'), [ti[0] + 0.02, ti[1] + 0.11, ti[2] + 0.02], 0.5); w.belt = put(w.tray.group, make('belt'), [ti[0] + 0.14, ti[1] + 0.11, ti[2] - 0.08], 0); }
  w.cardBlog = put(Wst, make('card', { img: 'img/wolfstad_top.png', w: 0.62 }), [-1.5, 0, 0.9], 0.25);
  w.cardTagline = put(Wst, make('card', { img: 'img/wolfstad_tagline.png', w: 0.62 }), [-1.5, 0, 1.25], 0.25);
  reg('W', w.gC, w.gD, w.pegboard, w.legs2, w.tray, w.jacket, w.shoes, w.belt); props.push(w.cardBlog, w.cardTagline);
  // the headline card near the bag (shown inside the bag scene)
  w.cardNews = put(G, make('card', { img: 'img/independent_top.png', w: 0.16 }), [0.36, 0.40, 0.42], -0.4); props.push(w.cardNews);

  // ---- E: the last print
  const E = K.station('E', K.V([37, 0, 0]).applyMatrix4(G.matrixWorld).toArray(), W.rotG);
  w.st19 = put(E, make('print', { foot: 'st19', w: 1.5, h: 1.5, border: 0.022 })); reg('E', w.st19);

  for (const a of props) if (a) a.defaults.vis = false;
  // ---- which place exists when (pure function of time); T follows G
  const win = W.windows, on = (st, t) => { const a = win[st === 'T' ? 'G' : st]; return t >= a[0] && t <= a[1]; };
  // at tag scale the tag sits on clean paper and the bag melts away: driven by how close the camera is to that tag
  const near = (tag) => { if (!tag || !K.pose) return 0; const p = tag.at([0, 0, 0]), dl = p.distanceTo(K.pose.l); return (1 - OM.sstep(0.16, 0.38, dl)) * (1 - OM.sstep(0.32, 0.75, K.pose.d)); };
  K.shot({ id: 'places', t0: 0, t1: 999, update(t) {
    for (const st in groups) { const v = on(st, t); for (const a of groups[st]) a.s.vis = v; }
    const m = near(w.tag); W.macro = m; if (w.mp) { w.mp.s.vis = m > 0.003; w.mp.s.o = m; } if (w.bag) w.bag.s.ghost = m; if (w.receipt && m > 0.6) w.receipt.s.vis = false;
    const m3 = near(w.tag3); W.macro3 = m3; if (w.mp3) { w.mp3.s.vis = m3 > 0.003; w.mp3.s.o = m3; }
  } });
  K.shots.unshift(K.shots.pop());                                   // run first, so any shot can still override
  W.groups = groups;
};
window.testScene = function (K, which) {
  K.cam.keys.length = 0; K.noCaps = true; const W = window.WORLD;
  const hold = (t, o) => { K.cam.key(t, Object.assign({ fov: 24, hand: 0, ease: 'linear' }, o)); K.cam.key(t + 0.99, Object.assign({ fov: 24, hand: 0, ease: 'linear' }, o)); };
  hold(0, { st: 'G', l: [0, 0.80, 0], d: 5.9, az: 0.10 - W.rotG, el: 0.10 });
  hold(1, { st: 'G', l: [0.3, 0.55, 0.2], d: 1.6, az: 0.5, el: 0.25 });
  hold(2, { st: 'T', l: [0, 0.02, 0], d: 0.42, az: 0.6, el: 0.5 });
  hold(3, { st: 'T', l: [0.004, 0.0012, 0], d: 0.085, az: 1.15, el: 0.32, ap: 0.0012, fog: [1.6, 4.5] });
  hold(4, { st: 'T', l: [0, 0.02, -0.03], d: 0.3, az: 0.3, el: 0.25, ap: 0.0006, fog: [1.6, 4.5] });
  hold(5, { st: 'C', l: [0, 0.9, 0], d: 3.2, az: 0.5, el: 0.3 });
  hold(6, { st: 'S', l: [0, 0.9, 0], d: 4.6, az: 0.4, el: 0.18 });
  hold(7, { st: 'H', l: [0.2, 0.45, 0], d: 3.4, az: 0.3, el: 0.15 });
  hold(8, { st: 'W', l: [0.2, 0.8, 0], d: 6.6, az: 0.45, el: 0.14 });
  hold(9, { st: 'W', l: [1.25, 0.1, 0.5], d: 1.8, az: 0.3, el: 0.5 });
  K.shot({ id: 'testvis', t0: 0, t1: 99, update(t, u) { for (const st in W.groups) for (const a of W.groups[st]) a.s.vis = true;
    const w = u.w; if (t >= 1 && t < 3 && w.bag) w.bag.s.xray = 1; if (w.tag && t >= 3 && t < 5) { w.tag.s.lid = 1; w.tag.s.xray = 0.7; w.tag.s.blue = 1; }
    if (t >= 4 && t < 5) { for (const n of ['ruler', 'swing', 'battery', 'chip', 'pin', 'band']) if (w[n]) w[n].s.vis = true; if (w.band) w.band.s.o = 1; } } });
  K.dur = 12; window.__meta.dur = 12;
};
