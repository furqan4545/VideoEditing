// The world: where every model stands on the paper. Metres, Y up. One world, one camera, no cuts.
// Stations are frames on the paper; camera keys and u.world() read coordinates in a station's frame.
window.WORLD = { windows: { G: [0, 999] } };                        // when each place exists (hide far sets so they never clutter a frame)
window.buildWorld = function (K) {
  const W = window.WORLD, w = K.w = {}, PI = Math.PI;
  const put = (parent, inst, pos, rotY) => { if (pos) inst.group.position.set(pos[0], pos[1], pos[2]); if (rotY != null) inst.group.rotation.y = rotY; parent.add(inst.group); return inst; };
  const groups = {}; const reg = (st, ...xs) => (groups[st] = groups[st] || []).push(...xs);
  // ---- G: two gates and a person with a bag (a person is ALWAYS the full-body 'person' model)
  const G = K.station('G', [0, 0, 0], 0.5);
  w.gA = put(G, K.make('gate'), [-0.5, 0, 0], PI / 2); w.gB = put(G, K.make('gate'), [0.5, 0, 0], PI / 2);
  w.man = put(G, K.make('person', { style: 'jogger', top: 'hoodie' }), [0, 0, -2.6]);
  w.bag = K.make('bag'); w.bag.group.traverse(o => { if (o.isMesh) o.castShadow = false; });
  w.cheese = put(w.bag.group, K.make('cheese'), w.bag.anchors.inside); w.tag = put(w.cheese.group, K.make('tag'), w.cheese.anchors.tag);
  G.add(w.bag.group); reg('G', w.gA, w.gB, w.man, w.bag, w.cheese, w.tag);
  // the tag's own frame: all close-ups are keyed in T
  K.stationFrom('T', w.tag.group);
  const win = W.windows, on = (st, t) => t >= win[st][0] && t <= win[st][1];
  K.shot({ id: 'places', t0: 0, t1: 999, update(t) { for (const st in groups) { const v = on(st, t); for (const a of groups[st]) a.s.vis = v; } } });
  K.shots.unshift(K.shots.pop()); W.groups = groups;
};
