// A paper print of a real web page: 'card'. A screenshot from film/img/ (see film/img/README.md) printed on thick
// matte paper (0.6 mm) with a small white margin, softly rounded corners, a faint curl that lifts one corner a few
// millimetres, and its own soft shadows. It lies on the paper ground and can tilt up on its bottom edge to face the camera.
// Local frame: flat card centred on the origin, picture up (+Y), top of the page toward -Z, bottom edge (the hinge) at z = +H/2.
//
// options (KIT.make('card', {...})):
//   img        'img/independent_top.png'   path relative to film/comp.html
//   w          0.3      width of the sheet in metres; the height comes from the image's aspect (size.H)
//   radius     corner radius in metres (default 1.2 % of w; at most the margin)
//   margin     white border in metres (default about 3 % of w)
//   crop       [x0, y0, x1, y1] in image fractions, y from the top: print only this part of the image (default all of it),
//              e.g. [0, 0.27, 1, 1] prints wolfstad_top.png without its header row (logo and the site's advert banner)
//   mark       a rectangle to mark, in image fractions [x0, y0, x1, y1] with y measured from the TOP of the image,
//              or a name from the table below ('headline', 'date', 'tag', 'belt', ...), or a list of up to three of either
//   markStyle  'auto' (default: one line of text -> underline, anything taller -> box) | 'underline' | 'box'  (or a list)
//   pen        marker line width in metres (default about 0.4 % of w)
//   curl       0..1.5   how much the corner lifts (default 1 = about 5 mm on a 0.3 m sheet; 0 = dead flat)
//   corner     'tr' (default) | 'tl' | 'br' | 'bl'   which corner lifts
//   aspect     image height / width, only needed for an image that is not in the table (else it is fixed up on load)
//   liftAngle  degrees the card stands at when lift = 1 (default 70)
// state:
//   o 0..1      opacity of the whole print: sheet, picture, marks and all its shadows fade together, evenly
//   lift 0..1   0 = lying flat, 1 = tilted up 70 degrees toward the camera, hinged on its bottom edge
//   mark 0..1   the marker line draws itself under / around the first mark rectangle, left to right, with a round tip
//   mark2, mark3   the same for a second and third rectangle
//   shadow 0..1 strength of the card's own shadows on the plane it lies on (its local y = 0). Set 0 when the card is held
//               in the air: it then goes into the kit's shadow map instead and throws a real shadow on whatever is below
//               (that real one cannot fade with o: it leaves at o = 0.5)
// anchors (they follow lift: read them after you set s.lift in the same shot update):
//   centre, markPos, markPos2, markPos3, top, bottom (the hinge), tl, tr, bl, br
// also: inst.pt(u, v, lift) -> local [x, y, z] of a point of the printed picture (u across, v down from the top, both 0..1);
//       inst.at(inst.pt(u, v, lift)) gives it in the world. inst.size = { W, H, iw, ih, M, TH, r } in metres.
//
// Shadows: the print is never in the kit's shadow map (except shadow = 0, above). It receives other things' shadows, and
// draws its own on its ground plane: the key light's shadow of the sheet worked out per pixel (tight at the paper, soft
// far from it, right for any turn of the card), a wide soft one for the sky light, a contact line where paper meets
// ground. They are flat drawings on the card's own plane, so they do not climb onto a neighbouring object.
//
// Images under file:// : a page opened from disk may not use a file as a WebGL texture, so each PNG in film/img/ has a
// sidecar "<name>.png.js" holding the same bytes as a data URL; the card loads that when the film runs from file://
// and the PNG itself when it is served over http. Either way the texture comes from THREE.TextureLoader and its
// promise is pushed to window.ASSET_PROMISES.
(function () {
  // the captured prints: pixel size and the useful rectangles (image fractions, y from the top)
  const PRINTS = {
    'independent_top.png':  { px: [1720, 3324], marks: { headline: [0.0163, 0.1913, 0.9009, 0.367], tags: [0.0233, 0.2383, 0.7315, 0.2768], date: [0.0209, 0.5054, 0.5214, 0.5295], photo: [0, 0.6161, 1, 0.9611] } },
    'independent_head.png': { px: [1720, 1808], marks: { headline: [0.0163, 0.3518, 0.9009, 0.6748], tags: [0.0233, 0.4381, 0.7315, 0.5088], date: [0.0209, 0.9292, 0.5214, 0.9735] } },
    'wolfstad_top.png':     { px: [3150, 2240], marks: { title: [0.081, 0.3264, 0.705, 0.3888], date: [0.1111, 0.3929, 0.5532, 0.433], belt: [0.081, 0.5424, 0.3063, 0.5826], kept: [0.313, 0.5424, 0.5935, 0.5826], tag: [0.4199, 0.8326, 0.8282, 0.8728] } },
    'wolfstad_post.png':    { px: [2520, 4088], marks: { title: [0.0809, 0.1431, 0.7052, 0.1705], date: [0.1111, 0.1722, 0.5532, 0.1898], belt: [0.081, 0.2378, 0.3063, 0.2554], tag: [0.4199, 0.365, 0.8282, 0.3826], photo: [0.1833, 0.6703, 0.8579, 0.9824] } },
    'wolfstad_tagline.png': { px: [3492, 528],  marks: { tag: [0.3909, 0.1705, 0.8329, 0.375] } },
    'wolfstad_story.png':   { px: [3492, 1080], marks: { belt: [0.0241, 0.2833, 0.268, 0.3833], kept: [0.2752, 0.2833, 0.5788, 0.3833], hidden: [0.4643, 0.7167, 0.8034, 0.8167] } },
    'wolfstad_photo.png':   { px: [1281, 963],  marks: {} },
  };
  const TEX = {};                                                    // url -> Promise<THREE.Texture | null>, shared by every card that uses the image
  function loadPrint(url) {
    if (TEX[url]) return TEX[url];
    const T = THREE, name = url.split('/').pop().split('?')[0], local = location.protocol === 'file:' && !/^data:/.test(url);
    const src = !local ? Promise.resolve(url) : new Promise(res => {
      window.CARD_IMG = window.CARD_IMG || {}; if (window.CARD_IMG[name]) return res(window.CARD_IMG[name]);
      const s = document.createElement('script'); s.src = url + '.js'; s.onload = () => res(window.CARD_IMG[name] || null); s.onerror = () => res(null); document.head.appendChild(s);
    });
    return TEX[url] = src.then(u => new Promise(res => {
      if (!u) { console.error('card: no sidecar ' + url + '.js (needed under file://, see film/img/README.md)'); return res(null); }
      new T.TextureLoader().load(u, t => {
        t.colorSpace = T.SRGBColorSpace; t.generateMipmaps = true; t.minFilter = T.LinearMipmapLinearFilter; t.magFilter = T.LinearFilter;
        t.anisotropy = (window.KIT && KIT.renderer) ? KIT.renderer.capabilities.getMaxAnisotropy() : 8; res(t);
      }, undefined, () => { console.error('card: could not load ' + url); res(null); });
    }));
  }

  // The kit's soft (VSM) shadow map draws every mesh that casts OR receives shadows. The print must take other things'
  // shadows but throws its own (see castMat below), so in the shadow pass it is drawn with a material that writes nothing.
  let NOSHADOW = null, CAP = null;
  const capGeo = () => CAP || (CAP = new THREE.CircleGeometry(1, 20, -Math.PI / 2, Math.PI));   // a half disc bulging toward +x (shared)
  const noShadow = () => NOSHADOW || (NOSHADOW = new THREE.ShaderMaterial({ vertexShader: 'void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }', fragmentShader: 'void main(){ gl_FragColor = vec4(1.0); discard; }' }));   // (the colour is never written: every pixel is thrown away; it is there so the shader has an output)

  KIT.asset('card', (K, o) => {
    const T = THREE, g = new T.Group(), clamp = K.clamp, lerp = K.lerp;
    const img = o.img || 'img/independent_top.png', name = img.split('/').pop().split('?')[0], known = PRINTS[name] || {};
    const W = o.w ?? 0.3, TH = 0.0006, Y0 = 0.0003, LIFT = (o.liftAngle ?? 70) * Math.PI / 180, E2 = 0.00005, SHADOW = '#241e16';
    const curl = clamp(o.curl ?? 1, 0, 1.5), cn = o.corner || 'tr', CX = cn[1] === 'l' ? -1 : 1, CY = cn[0] === 'b' ? -1 : 1;
    const pen = o.pen ?? Math.max(0.0007, W * 0.0042);
    const CR = (Array.isArray(o.crop) && o.crop.length === 4 && o.crop[2] > o.crop[0] && o.crop[3] > o.crop[1]) ? o.crop.map(v => clamp(+v)) : [0, 0, 1, 1], CW = CR[2] - CR[0], CH = CR[3] - CR[1];   // the part of the image that is printed
    const S = { W, TH, H: 0, iw: 0, ih: 0, M: 0, r: 0, reach: 0, amp: 0, pad: 0, aspect: 0 };   // sizes in metres, filled by build()
    let outline = [];                                                 // the sheet's rounded outline on the page, counter-clockwise

    // the sheet's shape: height above its own flat plane at page point (x across from the centre, y up from the bottom edge)
    const zf = (x, y) => {
      const s = ((x - CX * W / 2) * CX + (y - (CY > 0 ? S.H : 0)) * CY) * Math.SQRT1_2 + S.reach, t = s <= 0 ? 0 : s / S.reach;   // 0 at the fold line, 1 at the corner
      return S.amp * Math.pow(t, 2.3);
    };
    // page point -> local point at a given lift (the hinge turns the page about its bottom edge)
    const place = (x, y, z, lift) => { const a = -Math.PI / 2 + clamp(lift) * LIFT, c = Math.cos(a), s = Math.sin(a); return [x, Y0 + y * c - z * s, S.H / 2 + y * s + z * c]; };
    const pt = (u, v, lift = 0) => { const x = -S.iw / 2 + u * S.iw, y = S.M + (1 - v) * S.ih; return place(x, y, zf(x, y) + TH, lift); };

    // materials: a solid set for the normal case and a see-through twin for fades (swapped in apply).
    // Matte paper under this film's light would clip to pure white lying flat and go grey standing up, so the sheet and
    // the picture are part lit (30 %: form shading on the curl, other things' shadows), part self-lit, and apply() sets
    // the self-lit part from how much light the sheet's face is getting at its tilt. The paper comes out about 250 lying
    // flat and 248 tilted up: never 255, and always a touch brighter and cooler than the cream ground it lies on.
    // The paper is the brightest thing on the print, as on a real one: the picture is the same paper times the image,
    // 3 % down, so a white web page still shows a hairline step to its white margin and never outshines it.
    const LIT = 0.30, INKED = 0.97, WHITE0 = 0.955, WHITE1 = 0.94;   // lit share; picture white / paper white; paper white (linear) lying flat and at lift 1
    const sheetSolid = K.mat.paper('#ffffff').clone(); sheetSolid.color.setRGB(LIT, LIT, LIT);
    const sheetFade = sheetSolid.clone(); sheetFade.transparent = true;
    const printSolid = new T.MeshStandardMaterial({ roughness: 0.9, metalness: 0 }); printSolid.color.setRGB(LIT * INKED, LIT * INKED, LIT * INKED);
    const printFade = printSolid.clone(); printFade.transparent = true;
    const glow = k => { sheetSolid.emissive.setRGB(k, k, k); sheetFade.emissive.setRGB(k, k, k); printSolid.emissive.setRGB(k * INKED, k * INKED, k * INKED); printFade.emissive.setRGB(k * INKED, k * INKED, k * INKED); };
    glow(WHITE0 - LIT * 1.33);                                        // (lying flat; apply sets it every frame)
    const ink = new T.MeshBasicMaterial({ color: new T.Color(K.col.ink), transparent: true, opacity: 1, depthWrite: false, side: T.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
    const blobMat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 1, depthWrite: false });
    const skirtMat = new T.MeshBasicMaterial({ color: new T.Color(SHADOW), vertexColors: true, transparent: true, opacity: 1, depthWrite: false, side: T.DoubleSide });
    // The key light's shadow of the sheet, worked out per pixel on the ground instead of taken from the kit's shadow
    // map: for each ground point, walk toward the key light, see whether the walk meets the sheet (a rounded rectangle
    // in its own plane, with the curled corner's height), and soften the edge with the distance walked, so the shadow
    // is tight where the paper touches the ground and soft where it is far above it. Unlike the shadow map it fades
    // exactly with the card (state o), never pops, and stays sharp in a macro shot.
    const castMat = new T.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uBox: { value: new T.Vector4(0, 0, 1, 1) }, uL: { value: new T.Vector3(0, 1, 0) }, uEy: { value: new T.Vector3(0, 0, -1) }, uEn: { value: new T.Vector3(0, 1, 0) }, uO: { value: new T.Vector3() },
        uRect: { value: new T.Vector4() }, uCurl: { value: new T.Vector4() }, uSoft: { value: new T.Vector4() }, uCol: { value: new T.Color(SHADOW) } },
      vertexShader: 'uniform vec4 uBox; varying vec2 vG; void main(){ vG = uBox.xy + position.xz * uBox.zw; gl_Position = projectionMatrix * modelViewMatrix * vec4(vG.x, position.y, vG.y, 1.0); }',
      fragmentShader: `uniform vec3 uL, uEy, uEn, uO, uCol; uniform vec4 uRect, uCurl, uSoft; varying vec2 vG;
        float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
        float curlH(vec2 p){ float s = ((p.x - uCurl.x * uRect.x) * uCurl.x + (p.y - (uCurl.y > 0.0 ? 2.0 * uRect.y : 0.0)) * uCurl.y) * 0.70710678 + uCurl.z; return s <= 0.0 ? 0.0 : uCurl.w * pow(min(s / uCurl.z, 1.3), 2.3); }
        void main(){
          vec3 G = vec3(vG.x, 0.0, vG.y) - uO; float dn = dot(uL, uEn); dn = abs(dn) < 1e-4 ? (dn < 0.0 ? -1e-4 : 1e-4) : dn;
          float h = uRect.w, t = (h - dot(G, uEn)) / dn; vec3 P = G + t * uL; vec2 p = vec2(P.x, dot(P, uEy));
          t = (h + curlH(p) - dot(G, uEn)) / dn; P = G + t * uL; p = vec2(P.x, dot(P, uEy));           // once more, with the curl's height at the point it met
          float tp = max(t, 0.0), w = uSoft.x + uSoft.y * tp / (1.0 + tp / uSoft.w), sd = sdRR(p - vec2(0.0, uRect.y), uRect.xy, uRect.z);   // the edge softens fast in the first centimetres off the paper, then levels off
          float a = (1.0 - smoothstep(-w, w, sd)) * smoothstep(-uSoft.x, 0.0, t) * uSoft.z;
          if (a < 0.002) discard; gl_FragColor = vec4(uCol, a);
        }`,
    });

    const hinge = new T.Group(); g.add(hinge);
    const sheet = K.mesh(new T.BufferGeometry(), sheetSolid, { cast: false, receive: true }); sheet.renderOrder = 3; hinge.add(sheet);
    const print = K.mesh(new T.BufferGeometry(), printSolid, { cast: false, receive: true }); print.renderOrder = 4; hinge.add(print);
    const markG = new T.Group(); hinge.add(markG);
    sheet.customDepthMaterial = print.customDepthMaterial = noShadow();
    sheet.userData.noAO = print.userData.noAO = true;                 // the kit's ambient occlusion greys a standing sheet from the ground up; the print brings its own contact shadow instead
    const castGeo = new T.PlaneGeometry(1, 1); castGeo.rotateX(-Math.PI / 2);
    const cast = K.mesh(castGeo, castMat, { cast: false, receive: false, soft: true, pos: [0, 0.00012, 0] }); cast.renderOrder = 0.4; cast.frustumCulled = false; g.add(cast);   // the key light's shadow (its corners are placed by the shader)
    const blob = K.mesh(new T.BufferGeometry(), blobMat, { cast: false, receive: false, soft: true }); blob.renderOrder = 0.5; g.add(blob);    // wide soft shadow of the sky light, real size
    const skirt = K.mesh(new T.BufferGeometry(), skirtMat, { cast: false, receive: false, soft: true }); skirt.renderOrder = 0.6; g.add(skirt);   // tight contact line, as wide as the shot needs
    const foot = K.mesh(new T.BufferGeometry(), skirtMat.clone(), { cast: false, receive: false, soft: true }); foot.renderOrder = 0.7; g.add(foot);   // the line where the bottom edge rests once the card tilts up
    // (all four draw before the kit's shadow catcher, renderOrder 1: that 400 m plane writes depth that is only good to a few tenths of a millimetre and would swallow them in close shots)

    // which rectangles to mark
    let ml = o.mark == null ? [] : (Array.isArray(o.mark) && typeof o.mark[0] === 'number') ? [o.mark] : [].concat(o.mark);
    ml = ml.map(m => typeof m === 'string' ? (known.marks || {})[m] : m).filter(r => Array.isArray(r) && r.length === 4)
      .map(r => [(r[0] - CR[0]) / CW, (r[1] - CR[1]) / CH, (r[2] - CR[0]) / CW, (r[3] - CR[1]) / CH]).filter(r => r[0] > -0.03 && r[1] > -0.03 && r[2] < 1.03 && r[3] < 1.03).slice(0, 3);   // image fractions -> fractions of the printed part; a mark outside the crop is dropped
    const styles = [].concat(o.markStyle || 'auto'), marks = [];      // marks[i] = { rect, strokes: [mesh] }

    // The sheet and the picture share one grid: the picture is the block of cells inside the margin and the sheet's top
    // face is the frame of cells around it, on the very same points. One surface, so nothing can cross or flicker where
    // the corner curls, and a fading card fades evenly (no paper showing through a see-through picture).
    let grid = null;
    function sheetGeo() {
      const H = S.H, r = S.r, M = S.M, nc = 6, NX = Math.round(clamp(S.iw / 0.005, 10, 64)), NY = Math.round(clamp(S.ih / 0.005, 6, 120)), gap = M - r > 1e-7;
      const lin = (a, b, n, skip) => { const out = []; for (let i = skip ? 1 : 0; i <= n; i++) out.push(a + (b - a) * i / n); return out; };
      const axis = (lo, hi, n) => [...lin(lo, lo + r, nc), ...(gap ? [lo + M] : []), ...lin(lo + M, hi - M, n, true), ...(gap ? [hi - r] : []), ...lin(hi - r, hi, nc, true)];   // corner band, rest of the margin, picture, margin, corner band
      const xs = axis(-W / 2, W / 2, NX), ys = axis(0, H, NY), nx = xs.length, ny = ys.length, i0 = nc + (gap ? 1 : 0), P = [];
      for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {     // square corners -> quarter discs, smoothly (no folded triangles)
        let x = xs[i], y = ys[j]; const ax = Math.abs(x) - (W / 2 - r), low = y < H / 2, by = low ? r - y : y - (H - r);
        if (ax > 1e-9 && by > 1e-9) { const f = Math.max(ax, by) / Math.hypot(ax, by); x = Math.sign(x) * (W / 2 - r + ax * f); y = low ? r - by * f : H - r + by * f; }
        P.push([x, y]);
      }
      grid = { P, nx, i0, i1: i0 + NX, j0: i0, j1: i0 + NY };
      const loop = []; for (let i = 0; i < nx; i++) loop.push(i); for (let j = 1; j < ny; j++) loop.push(j * nx + nx - 1);
      for (let i = nx - 2; i >= 0; i--) loop.push((ny - 1) * nx + i); for (let j = ny - 2; j >= 1; j--) loop.push(j * nx);
      outline = loop.map(k => P[k]);
      const n = nx * ny, L = loop.length, pos = new Float32Array((2 * n + 2 * L) * 3), uv = new Float32Array((2 * n + 2 * L) * 2), idx = [];
      const put = (k, x, y, z, u, v) => { pos[k * 3] = x; pos[k * 3 + 1] = y; pos[k * 3 + 2] = z; uv[k * 2] = u; uv[k * 2 + 1] = v; };
      for (let k = 0; k < n; k++) { const [x, y] = P[k], z = zf(x, y); put(k, x, y, z + TH, x * 16, y * 16); put(n + k, x, y, z, x * 16 + 0.37, y * 16 + 0.61); }
      for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const a = j * nx + i, b = a + 1, c = a + nx + 1, d = a + nx, pic = i >= grid.i0 && i < grid.i1 && j >= grid.j0 && j < grid.j1;
        if (!pic) idx.push(a, b, c, a, c, d); idx.push(n + a, n + c, n + b, n + a, n + d, n + c); }                 // top (not under the picture: the print mesh is that part of the surface), bottom
      let run = 0;
      for (let k = 0; k < L; k++) { const [x, y] = P[loop[k]], z = zf(x, y); if (k) run += Math.hypot(x - P[loop[k - 1]][0], y - P[loop[k - 1]][1]); put(2 * n + k, x, y, z + TH, run * 16, 0.01); put(2 * n + L + k, x, y, z, run * 16, 0); }
      for (let k = 0; k < L; k++) { const k2 = (k + 1) % L, ta = 2 * n + k, tb = 2 * n + k2, ba = 2 * n + L + k, bb = 2 * n + L + k2; idx.push(ba, bb, tb, ba, tb, ta); }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
    }
    function printGeo() {
      const { P, nx, i0, i1, j0, j1 } = grid, cols = i1 - i0 + 1, pos = [], uv = [], idx = [];
      for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const [x, y] = P[j * nx + i]; pos.push(x, y, zf(x, y) + TH); uv.push(CR[0] + (x + S.iw / 2) / S.iw * CW, 1 - CR[3] + (y - S.M) / S.ih * CH); }
      for (let j = 0; j < j1 - j0; j++) for (let i = 0; i < i1 - i0; i++) { const a = j * cols + i, b = a + 1, c = a + cols + 1, d = a + cols; idx.push(a, b, c, a, c, d); }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals(); return geo;
    }
    // the wide soft shadow: a blurred rounded rectangle on the ground under the sheet
    function blobTex() {
      const pad = S.pad, cw = 512, sx = cw / (W + 2 * pad), ch = Math.min(2048, Math.round((S.H + 2 * pad) * sx)), sy = ch / (S.H + 2 * pad);
      const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; const c = cv.getContext('2d'), OFF = 4096;
      const pass = (alpha, blurM, grow) => { c.save(); c.shadowColor = `rgba(36,30,22,${alpha})`; c.shadowBlur = blurM * sx; c.shadowOffsetX = OFF; c.shadowOffsetY = 0; c.fillStyle = '#000';
        const x = pad * sx - OFF - grow * sx, y = pad * sy - grow * sy, w = W * sx + 2 * grow * sx, h = S.H * sy + 2 * grow * sy, r = Math.max(1, (S.r + grow) * sx);
        c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fill(); c.restore(); };
      pass(0.26, pad * 0.95, pad * 0.02); pass(0.28, pad * 0.34, 0);
      const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; return t;
    }
    // the contact line: a soft dark band hugging the sheet's outline on the ground. Its width is a morph influence in
    // metres (so apply can keep it about the same size on screen from a wide shot down to a macro), and two more
    // influences lean it away from the key light: thin on the lit sides, wider on the shadow sides.
    function skirtGeo() {
      const L = outline.length, rings = [[0, -0.0004, 1], [0, 0, 1], [0.3, 0, 0.42], [1, 0, 0]], pos = [], m0 = [], mx = [], mz = [], col = [], idx = [];   // [width factor, fixed offset, alpha]
      for (let k = 0; k < L; k++) { const a = outline[(k + L - 1) % L], b = outline[(k + 1) % L], p = outline[k], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1, nx = (b[1] - a[1]) / l, nz = (b[0] - a[0]) / l;   // outward, on the ground (page y runs toward -z)
        const up = clamp((zf(p[0], p[1]) - 0.00015) / 0.0011), touch = 1 - up * up * (3 - 2 * up);                 // the curled corner is off the ground: no contact line there
        for (const [f, fix, al] of rings) { pos.push(p[0] + nx * fix, 0, -p[1] + nz * fix); m0.push(nx * f, 0, nz * f); mx.push(nx * f * nx, 0, nz * f * nx); mz.push(nx * f * nz, 0, nz * f * nz); col.push(1, 1, 1, al * touch); } }
      for (let k = 0; k < L; k++) { const k2 = (k + 1) % L; for (let q = 0; q < 3; q++) { const a = k * 4 + q, b = k2 * 4 + q, c = k2 * 4 + q + 1, d = k * 4 + q + 1; idx.push(a, c, b, a, d, c); } }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 4));
      geo.morphAttributes.position = [new T.Float32BufferAttribute(m0, 3), new T.Float32BufferAttribute(mx, 3), new T.Float32BufferAttribute(mz, 3)]; geo.morphTargetsRelative = true; geo.setIndex(idx); return geo;
    }
    function footGeo() {                                              // a soft strip along the hinge line: unit depth (scaled in apply), fading out at both ends
      const xs = [-W / 2 + S.r * 0.3, -W / 2 + S.r * 1.6, W / 2 - S.r * 1.6, W / 2 - S.r * 0.3], ax = [0, 1, 1, 0], zs = [-2.2, 0, 1], az = [0, 1, 0], pos = [], col = [], idx = [];
      for (let j = 0; j < 3; j++) for (let i = 0; i < 4; i++) { pos.push(xs[i], 0, zs[j]); col.push(1, 1, 1, ax[i] * az[j]); }
      for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) { const a = j * 4 + i, b = a + 1, c = a + 5, d = a + 4; idx.push(a, c, b, a, d, c); }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new T.Float32BufferAttribute(col, 4)); geo.setIndex(idx); return geo;
    }
    // a marker stroke along a 2D path on the page: a thin ribbon lying on the print, drawn with setDrawRange
    function stroke(poly, seed) {
      const R = OM.rng(seed), n = 180, cum = [0]; for (let i = 1; i < poly.length; i++) cum.push(cum[i - 1] + Math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]));
      const len = cum[cum.length - 1], pts = []; let k = 0;
      for (let i = 0; i < n; i++) { const d = len * i / (n - 1); while (k < poly.length - 2 && cum[k + 1] < d) k++; const f = (d - cum[k]) / Math.max(1e-12, cum[k + 1] - cum[k]); pts.push([lerp(poly[k][0], poly[k + 1][0], f), lerp(poly[k][1], poly[k + 1][1], f)]); }
      const p1 = R() * 6.28, p2 = R() * 6.28, p3 = R() * 6.28, f1 = 0.9 + R() * 0.8, f2 = 2.6 + R() * 1.2, f3 = 1.4 + R() * 1.4, amp = pen * 0.2, pos = new Float32Array(n * 6), idx = [];
      const cen = new Float32Array(n * 3), hws = new Float32Array(n), ang = new Float32Array(n);                     // the line's middle, half width and heading at every step: where the round tip sits while it is being drawn
      const tan = i => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / l, (b[1] - a[1]) / l]; };
      for (let i = 0; i < n; i++) { const s = i / (n - 1), [tx, ty] = tan(i), wob = amp * Math.sin(Math.PI * s) * (0.6 * Math.sin(6.283 * f1 * s + p1) + 0.4 * Math.sin(6.283 * f2 * s + p2));   // a hand is never ruler straight
        const e = clamp(Math.min(s, 1 - s) / 0.035), hw = pen / 2 * (0.62 + 0.38 * e * e * (3 - 2 * e)) * (1 + 0.05 * Math.sin(6.283 * f3 * s + p3)), cx = pts[i][0] - ty * wob, cy = pts[i][1] + tx * wob;   // the pen lands light, presses, lifts light
        cen[i * 3] = cx; cen[i * 3 + 1] = cy; cen[i * 3 + 2] = zf(cx, cy) + TH + E2; hws[i] = hw; ang[i] = Math.atan2(ty, tx);
        const lx = cx - ty * hw, ly = cy + tx * hw, rx = cx + ty * hw, ry = cy - tx * hw;
        pos[i * 6] = rx; pos[i * 6 + 1] = ry; pos[i * 6 + 2] = zf(rx, ry) + TH + E2; pos[i * 6 + 3] = lx; pos[i * 6 + 4] = ly; pos[i * 6 + 5] = zf(lx, ly) + TH + E2;
        if (i < n - 1) idx.push(2 * i, 2 * i + 2, 2 * i + 3, 2 * i, 2 * i + 3, 2 * i + 1); }
      const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setIndex(idx);
      const m = K.mesh(geo, ink, { cast: false, receive: false }); m.renderOrder = 5; m.userData.noAO = true; Object.assign(m.userData, { segs: n - 1, cen, hws, ang });
      const cap = () => { const c = K.mesh(capGeo(), ink, { cast: false, receive: false }); c.renderOrder = 5; c.userData.noAO = true; m.add(c); return c; };   // round ends: a half disc where the line starts, another that rides its growing tip
      const tail = cap(); tail.position.set(cen[0], cen[1], cen[2]); tail.scale.setScalar(hws[0]); tail.rotation.z = ang[0] + Math.PI; m.userData.tip = cap(); return m;
    }
    function markStrokes(rect, style, seed) {
      const X0 = -S.iw / 2 + rect[0] * S.iw, X1 = -S.iw / 2 + rect[2] * S.iw, Yt = S.M + (1 - rect[1]) * S.ih, Yb = S.M + (1 - rect[3]) * S.ih, bw = X1 - X0, bh = Yt - Yb;
      if (style === 'auto') style = bw / Math.max(1e-9, bh) > 5 ? 'underline' : 'box';
      if (style === 'underline') { const y = Yb - pen * 0.75; return [stroke([[X0 - pen * 0.3, y], [X1 + pen * 0.3, y]], seed)]; }
      const p = pen * (bw / Math.max(1e-9, bh) > 5 ? 0.85 : 1.3), x0 = X0 - p, x1 = X1 + p, yt = Yt + p, yb = Yb - p, cy = (yt + yb) / 2, rc = Math.min((yt - yb) * 0.3, (x1 - x0) * 0.2, W * 0.016);
      const half = (ye, sg) => { const a = [[x0, cy], [x0, ye - sg * rc]];        // from the middle of the left side, round the corner, along, round the corner, to the middle of the right side
        for (let i = 1; i <= 8; i++) { const th = Math.PI - (Math.PI / 2) * i / 8; a.push([x0 + rc + rc * Math.cos(th), ye - sg * rc + sg * rc * Math.sin(th)]); }
        for (let i = 0; i <= 8; i++) { const th = Math.PI / 2 - (Math.PI / 2) * i / 8; a.push([x1 - rc + rc * Math.cos(th), ye - sg * rc + sg * rc * Math.sin(th)]); }
        a.push([x1, cy]); return a; };
      return [stroke(half(yt, 1), seed), stroke(half(yb, -1), seed + 7)];
    }

    function build(aspect) {
      S.aspect = aspect; S.M = o.margin ?? Math.min(W * 0.03, W * aspect * 0.14); S.iw = W - 2 * S.M; S.ih = S.iw * aspect; S.H = S.ih + 2 * S.M;
      const mn = Math.min(W, S.H), mx = Math.max(W, S.H);
      S.r = Math.max(0.0003, Math.min(o.radius ?? W * 0.012, S.M, mn * 0.45)); S.reach = Math.max(0.36 * mn, 0.1 * mx); S.amp = 0.045 * S.reach * curl; S.pad = Math.max(0.014, 0.11 * mn);
      sheet.geometry.dispose(); sheet.geometry = sheetGeo(); print.geometry.dispose(); print.geometry = printGeo();
      if (blobMat.map) blobMat.map.dispose(); blobMat.map = blobTex(); blobMat.needsUpdate = true;
      blob.geometry.dispose(); const bg = new T.PlaneGeometry(W + 2 * S.pad, S.H + 2 * S.pad); bg.rotateX(-Math.PI / 2); bg.translate(0, 0, -S.H / 2); blob.geometry = bg;   // local z = 0 is the hinge line, so the shadow can shorten toward it as the card tilts up
      skirt.geometry.dispose(); skirt.geometry = skirtGeo(); skirt.updateMorphTargets(); foot.geometry.dispose(); foot.geometry = footGeo();
      hinge.position.set(0, Y0, S.H / 2);
      for (const m of marks) for (const st of m.strokes) { markG.remove(st); st.geometry.dispose(); } marks.length = 0;
      ml.forEach((rect, i) => { const strokes = markStrokes(rect, styles[Math.min(i, styles.length - 1)], 31 + i * 17); strokes.forEach(st => markG.add(st)); marks.push({ rect, strokes }); });
    }
    build((o.aspect ?? (known.px ? known.px[1] / known.px[0] : 1.4)) * CH / CW);

    // the picture
    const ready = loadPrint(img).then(t => {
      if (!t) return;
      printSolid.map = printSolid.emissiveMap = printFade.map = printFade.emissiveMap = t; printSolid.needsUpdate = printFade.needsUpdate = true;
      const a = t.image.height / t.image.width * CH / CW; if (o.aspect == null && Math.abs(a - S.aspect) / a > 0.004) build(a);
    });
    (window.ASSET_PROMISES = window.ASSET_PROMISES || []).push(ready);

    const q = new T.Quaternion(), sv = new T.Vector3(), lv = new T.Vector3(), nv = new T.Vector3(), ws = new T.Vector3(), KEY = new T.Vector3(-1.1, 2.3, 1.25).normalize();   // KEY: toward the kit's key light (kit.js seek)
    const L = () => (api.s && api.s.lift) || 0, edge = (x, y) => place(x, y, zf(x, y) + TH, L());
    const mk = i => marks[i] ? pt((marks[i].rect[0] + marks[i].rect[2]) / 2, (marks[i].rect[1] + marks[i].rect[3]) / 2, L()) : pt(0.5, 0.5, L());
    const api = {
      group: g, size: S, ready, pt,
      get view() { const D = Math.max(5.2 * W, 3.5 * S.H), H = S.H, up = place(0, H * 0.5, 0, 1), cr = place(CX * W * 0.36, CY > 0 ? H - W * 0.14 : W * 0.14, 0, 0), mp = marks[0] ? pt((marks[0].rect[0] + marks[0].rect[2]) / 2, (marks[0].rect[1] + marks[0].rect[3]) / 2, 0) : pt(0.5, 0.3, 0);
        return { l: [0, 0, 0], d: D, close: cr, keys: [
          { az: 0.38, el: 0.8, l: [0, 0, H * 0.04], d: D * 1.08 },             // lying flat, three-quarter
          { az: -0.32, el: 0.2, l: up, d: D },                                 // tilted up to the camera, mark drawn
          { az: 0.95, el: 0.3, l: [0, H * 0.22, -H * 0.1], d: D * 0.95 },      // from the side, half way up, half faded: its shadow fades with it
          { az: 0, el: 1.45, l: [0, 0, 0], d: D * 0.86 },                      // straight down, mark drawn
          { az: 0.7 * CX, el: 0.16, l: cr, d: Math.max(0.2, W * 1.0), ap: 0.0005 },   // the lifted corner, close and low
          { az: -0.2, el: 0.95, l: mp, d: Math.max(0.3, W * 1.5) },            // the mark, half drawn
        ] }; },
      demo(s, t) { const v = Math.floor(t / 2); s.lift = v === 1 ? 1 : v === 2 ? 0.5 : 0; s.o = v === 2 ? 0.55 : 1; s.mark = v === 1 || v === 3 ? 1 : v === 5 ? 0.55 : 0; s.mark2 = s.mark; s.mark3 = s.mark; },
      anchors: {
        get centre() { return pt(0.5, 0.5, L()); }, get markPos() { return mk(0); }, get markPos2() { return mk(1); }, get markPos3() { return mk(2); },
        get top() { return edge(0, S.H); }, get bottom() { return edge(0, 0); }, get tl() { return edge(-W / 2, S.H); }, get tr() { return edge(W / 2, S.H); }, get bl() { return edge(-W / 2, 0); }, get br() { return edge(W / 2, 0); },
      },
      defaults: { o: 1, lift: 0, mark: 0, mark2: 0, mark3: 0, shadow: 1 },
      apply(s) {
        const op = clamp(s.o), lf = clamp(s.lift), th = lf * LIFT, solid = op > 0.999, sh = op * clamp(s.shadow);
        hinge.visible = op > 0.002; cast.visible = blob.visible = skirt.visible = foot.visible = sh > 0.002; if (!hinge.visible) return;
        hinge.rotation.x = -Math.PI / 2 + th;
        sheet.material = solid ? sheetSolid : sheetFade; print.material = solid ? printSolid : printFade; sheetFade.opacity = printFade.opacity = ink.opacity = op;
        // shadow 0 says the card is held in the air: there is no ground under it to draw a shadow on, so it goes back into the kit's shadow map and throws a real one on whatever is below (that one cannot fade: it leaves at o = 0.5)
        const air = clamp(s.shadow) <= 0.002 && op > 0.5; sheet.castShadow = air; sheet.customDepthMaterial = print.customDepthMaterial = air ? undefined : noShadow();
        const ct = Math.cos(th), sn = Math.sin(th);
        // exposure: how much light a face pointing this way gets from the kit's rig (measured on 40 tilts and turns, fitted to within 0.07), topped up to the paper white we want
        g.getWorldQuaternion(q); nv.set(0, ct, sn).applyQuaternion(q);
        glow(clamp(lerp(WHITE0, WHITE1, lf) - LIT * (0.655 - 0.029 * nv.x + 1.422 * nv.y + 0.068 * nv.z - 0.724 * nv.y * nv.y - 0.1 * nv.x * nv.z + 0.054 * (nv.x * nv.x - nv.z * nv.z)), 0.25, 0.8));
        // shadows on the ground (the card's own plane y = 0). None of them is in the kit's shadow map, so they fade with the card.
        q.invert(); sv.set(0.66, 0, -0.75).applyQuaternion(q); lv.copy(KEY).applyQuaternion(q); g.getWorldScale(ws);
        const dist = (K.dist || 1) / Math.max(1e-6, ws.x);
        // 1. the key light's own shadow: the sheet's outline thrown on the ground, tight at the paper, softer with height
        if (cast.visible && lv.y > 0.08) {
          const U = castMat.uniforms, w0 = clamp(0.0009 * dist, 0.00006, 0.004), kp = 0.28, t0 = 0.07 / Math.max(1e-6, ws.x), zt = TH + S.amp, ty = Y0 + S.H * sn + zt * ct, tz = S.H / 2 - S.H * ct + zt * sn;   // edge softness at the paper, its growth per metre of light path, where that levels off; the top edge's height and depth
          const kx = -lv.x / lv.y, kz = -lv.z / lv.y, pad = w0 + kp * t0 + 0.002, sx = kx * ty, sz = tz + kz * ty;
          const x0 = Math.min(0, sx) - W / 2 - pad, x1 = Math.max(0, sx) + W / 2 + pad, z0 = Math.min(S.H / 2, tz, sz) - pad, z1 = Math.max(S.H / 2, tz, sz) + pad;
          U.uBox.value.set((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0, z1 - z0); U.uL.value.copy(lv); U.uEy.value.set(0, sn, -ct); U.uEn.value.set(0, ct, sn); U.uO.value.set(0, Y0, S.H / 2);
          U.uRect.value.set(W / 2, S.H / 2, S.r, TH * 0.5); U.uCurl.value.set(CX, CY, S.reach, S.amp); U.uSoft.value.set(w0, kp, 0.38 * sh, t0);
        } else cast.visible = false;
        // 2. the sky's soft shadow under the sheet, 3. the contact line round it, 4. the line where the bottom edge stands once it tilts up
        const sq = Math.max(ct, 0.2), wide = S.pad * 0.22 * (1 + 2 * lf), w = clamp(0.011 * dist, 0.0005, Math.min(0.005, S.pad * 0.4)), fl = clamp(1 - lf / 0.4), mi = skirt.morphTargetInfluences;
        blob.scale.z = sq; blob.position.set(sv.x * wide, 0.00016, S.H / 2 + sv.z * wide * sq); blobMat.opacity = sh * lerp(1, 0.3, lf * lf * (3 - 2 * lf));
        skirt.scale.z = sq; skirt.position.set(0, 0.0002, S.H / 2); mi[0] = w * 0.7; mi[1] = w * 0.45 * sv.x; mi[2] = w * 0.45 * sv.z; skirtMat.opacity = sh * 0.36 * fl * fl * (3 - 2 * fl);
        foot.position.set(0, 0.00024, S.H / 2); foot.scale.z = w * 0.8; foot.material.opacity = sh * 0.5 * (1 - fl) * (1 - fl) * (1 + 2 * fl);
        for (let i = 0; i < marks.length; i++) { const k = clamp(i === 0 ? s.mark : i === 1 ? s.mark2 : s.mark3); for (const st of marks[i].strokes) { const u = st.userData, j = Math.round(k * u.segs), tip = u.tip; st.visible = k > 0.001; st.geometry.setDrawRange(0, 6 * j);
          tip.position.set(u.cen[j * 3], u.cen[j * 3 + 1], u.cen[j * 3 + 2]); tip.scale.setScalar(u.hws[j]); tip.rotation.z = u.ang[j]; } }
      },
    };
    return api;
  });
})();
