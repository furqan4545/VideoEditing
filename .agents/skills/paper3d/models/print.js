// Ali's footage as a print standing on the paper: an upright board that plays the take. The camera can fly through a
// round hole that opens in it (the push through his cupped hand).
// options: { foot: 'loc' | 'st2' | 'st19', w, h (metres, the whole board), border (metres of white paper margin) }
// state: hole (radius in metres, 0 = no hole), holeAt [u, v] (0..1 on the board, v up), o (opacity), tOff (seconds added to the film time)
KIT.asset('print', (K, o) => {
  const T = THREE, g = new T.Group(), w = o.w || 1.5, h = o.h || 1.5, border = o.border ?? 0.02, f = K.footage(o.foot || 'st2');
  const mat = new T.ShaderMaterial({
    uniforms: { map: { value: f.tex }, hc: { value: new T.Vector2(0.5, 0.5) }, hr: { value: 0 }, size: { value: new T.Vector2(w, h) }, border: { value: border }, paper: { value: new T.Color('#fbfaf7') }, o: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D map; uniform vec2 hc; uniform float hr; uniform vec2 size; uniform float border; uniform vec3 paper; uniform float o; varying vec2 vUv;
      void main(){ float r = length((vUv - hc) * size); if (hr > 0.0 && r < hr) discard;
        vec2 im = ((vUv - 0.5) * size) / (size - 2.0 * border) + 0.5;
        vec3 col = (im.x < 0.0 || im.x > 1.0 || im.y < 0.0 || im.y > 1.0) ? paper : texture2D(map, im).rgb;
        float rim = hr > 0.0 ? smoothstep(hr + 0.035, hr, r) * 0.35 : 0.0; col *= 1.0 - rim;
        gl_FragColor = vec4(col, o); }`,
    transparent: false, side: T.DoubleSide });
  const board = new T.Mesh(new T.PlaneGeometry(w, h), mat); board.position.y = h / 2; board.castShadow = true; board.receiveShadow = false; g.add(board);
  // a thin edge so the board has thickness when the camera is off axis
  const edge = K.mesh(K.geo.box(w, h, 0.012), K.mat.clay('#efede8', 0.9), { pos: [0, h / 2, -0.0065], cast: false }); g.add(edge);
  return {
    group: g, size: { w, h }, anchors: { centre: [0, h / 2, 0] }, view: { l: [0, h / 2, 0], d: h * 3.4 },
    uv: (u, v) => [(u - 0.5) * w, v * h, 0],                           // board uv -> local point
    defaults: { hole: 0, holeAt: [0.5, 0.5], o: 1, tOff: 0 },
    apply(s, t) { f.want(t + s.tOff); mat.uniforms.hr.value = s.hole; mat.uniforms.hc.value.set(s.holeAt[0], s.holeAt[1]); edge.visible = s.hole < 0.001; },
  };
});
