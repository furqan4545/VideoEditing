// One security gate (an acousto-magnetic pedestal): a clear acrylic panel with the copper coil you can see inside it,
// a dark base that holds the electronics, and a light bar on top. Local frame: panel in the XY plane, feet on y = 0,
// centred on x = 0, thin along Z. Real size: 0.42 m wide, 1.55 m tall.
// state: light 'green' | 'red' | 'white' | 'off' | [r,g,b]   glow 0..1 (how strongly the edge lights up)   coil 0..1 (copper glow while it fires)
KIT.asset('gate', (K, o) => {
  const T = THREE, g = new T.Group(), W = 0.42, H = 1.55, TH = 0.026, BASE_H = 0.085;
  // base: a low dark block with a softer top cover and two rubber feet
  g.add(K.mesh(K.geo.rbox(W + 0.10, BASE_H, 0.15, 0.02), K.mat.gloss(K.col.black, 0.32), { pos: [0, BASE_H / 2, 0] }));
  g.add(K.mesh(K.geo.rbox(W + 0.04, 0.02, 0.10, 0.008), K.mat.plastic('#2b2d31', 0.5), { pos: [0, BASE_H + 0.008, 0] }));
  for (const sx of [-1, 1]) g.add(K.mesh(K.geo.rbox(0.07, 0.012, 0.17, 0.005), K.mat.rubber('#0e0f11'), { pos: [sx * (W / 2 + 0.01), 0.006, 0] }));
  // acrylic panel (rounded rectangle, extruded), polished: you see through it
  const y0 = BASE_H + 0.012, ph = H - y0, outline = K.geo.rrect(W, ph, 0.07, 10);
  const panelGeo = K.geo.extrude(outline, TH, { bevel: 0.003 }); panelGeo.translate(0, y0 + ph / 2, -TH / 2);
  const panel = K.mesh(panelGeo, K.mat.glass(0.20, '#e9f1f4'), { cast: false }); panel.renderOrder = 3; g.add(panel);
  // a thin frosted rim so the panel reads against white paper
  const rimPts = outline.map(p => [p[0], p[1] + y0 + ph / 2, 0]); rimPts.push(rimPts[0]);
  const rim = K.mesh(K.geo.tube(rimPts, 0.0065, { closed: true, seg: 200, rad: 10 }), K.mat.plastic('#eceeee', 0.25)); g.add(rim);
  // the coil: three turns of enamelled copper wire running around the inside of the panel, in a milled channel
  const coilMat = new T.MeshStandardMaterial({ color: new T.Color(K.col.copper), metalness: 1, roughness: 0.32, envMapIntensity: 1.1, emissive: new T.Color(K.col.purple), emissiveIntensity: 0 });
  for (let i = 0; i < 3; i++) {
    const inset = 0.038 + i * 0.011, pts = K.geo.rrect(W - 2 * inset, ph - 2 * inset, 0.05 - i * 0.006, 10).map(p => [p[0], p[1] + y0 + ph / 2, 0]);
    g.add(K.mesh(K.geo.tube(pts, 0.0034, { closed: true, seg: 220, rad: 8 }), coilMat));
  }
  // lead wires down into the base
  for (const sx of [-0.012, 0.012]) g.add(K.mesh(K.geo.tube([[sx, y0 + 0.045, 0], [sx, y0 + 0.02, 0.002], [sx * 1.4, y0 - 0.004, 0]], 0.003, { seg: 16, rad: 8 }), coilMat));
  // light bar on top: a frosted lens that takes the state colour
  const lens = K.mesh(K.geo.rbox(0.20, 0.022, 0.034, 0.011), K.mat.light('#22c55e'), { pos: [0, H + 0.006, 0], cast: false }); g.add(lens);
  const halo = K.mesh(new T.PlaneGeometry(0.62, 0.30), new T.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0, depthWrite: false, map: (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'), gr = x.createRadialGradient(0, 0, 2, 0, 0, 62); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.4)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    x.translate(128, 64); x.scale(2, 1); x.fillStyle = gr; x.fillRect(-64, -64, 128, 128); const t = new T.CanvasTexture(c); return t; })() }), { pos: [0, H + 0.01, 0.02], cast: false, receive: false, soft: true }); halo.renderOrder = 6; halo.material.fog = false; g.add(halo);
  const COL = { green: [0.09, 0.72, 0.30], red: [0.93, 0.10, 0.16], white: [1, 1, 1], off: [0.55, 0.56, 0.58], purple: [0.49, 0.23, 0.93] };
  const rimBase = new T.Color('#eceeee');
  return {
    group: g, size: { W, H }, view: { l: [0, 0.8, 0], d: 5.4, close: [0, 1.45, 0] },
    demo(s, t) { s.light = t < 4 ? 'green' : t < 8 ? 'red' : 'white'; s.coil = t > 8 ? 1 : 0; },
    anchors: { top: [0, H, 0], centre: [0, y0 + ph / 2, 0], coil: [0, y0 + ph / 2, 0], base: [0, BASE_H, 0] },
    defaults: { light: 'green', glow: 0.55, coil: 0 },
    apply(s) {
      const c = Array.isArray(s.light) ? s.light : (COL[s.light] || COL.off);
      lens.material.color.setRGB(c[0], c[1], c[2]); halo.material.color.setRGB(c[0], c[1], c[2]); halo.material.opacity = (s.light === 'off' ? 0 : 0.55 * s.glow);
      rim.material = rim.material; coilMat.emissiveIntensity = 1.6 * s.coil;
      halo.quaternion.copy(K.camera.quaternion); const pq = new T.Quaternion(); g.getWorldQuaternion(pq); halo.quaternion.premultiply(pq.invert());
    },
  };
});
