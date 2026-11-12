// A sheet of the same white paper that slides in right under the tag when the camera is at tag scale, so every
// close-up of the tag sits on clean paper with a soft contact shadow (the cheese and the bag floor disappear under it).
// state: o 0..1 (the world sets it from how close the camera is; shots may override)
KIT.asset('macropaper', (K, o) => {
  const T = THREE, g = new T.Group(), S = o.size || 1.6;
  const tex = K.canvasTex(K.paperCanvas(1024, 5), { repeat: 1 });
  const paper = new T.Mesh(new T.PlaneGeometry(S, S), new T.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0 })); paper.rotation.x = -Math.PI / 2; paper.renderOrder = 0; g.add(paper);
  const sh = new T.Mesh(new T.PlaneGeometry(S, S), new T.ShadowMaterial({ opacity: 0, color: 0x241f18 })); sh.rotation.x = -Math.PI / 2; sh.position.y = 0.000004; sh.receiveShadow = true; sh.renderOrder = 1; g.add(sh);
  paper.userData.noAO = false;
  return { group: g, size: { S }, anchors: {}, view: { l: [0, 0, 0], d: 0.3 }, defaults: { o: 0 },
    apply(s) { const v = K.clamp(s.o); paper.visible = sh.visible = v > 0.003; paper.material.opacity = v; paper.material.depthWrite = v > 0.98; sh.material.opacity = K.look.shadow * v;
      tex.repeat.setScalar(S / K.clamp((K.pose ? K.pose.d : 1) * 0.9, 0.004, 6)); } };
});
