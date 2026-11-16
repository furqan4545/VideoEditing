// overlays.js — the opening title (Instagram's own caption look, gone after 2 s) and the reel 13 captions decided black or
// white once per line (film/capdark.js from tools/capdark.py).
'use strict';
function TITLE_draw(lines, cy, { size = 56, wt = 800, pitch = 66, pad = 11, px = 20, r = 12, a = 1 } = {}) {
  if (a <= 0.003) return; g.save(); g.globalAlpha = a; const f = F(size, wt); g.font = f; g.letterSpacing = (-0.012 * size).toFixed(2) + 'px';
  const n = lines.length, top = cy - (n * pitch + 2 * pad) / 2, ws = lines.map(s => g.measureText(s).width + 2 * px);
  const R = i => ({ x: 540 - ws[i] / 2, y: top + i * pitch + (i ? pad : 0), w: ws[i], h: pitch + (i === 0 ? pad : 0) + (i === n - 1 ? pad : 0) });
  const shape = () => { g.beginPath();
    for (let i = 0; i < n; i++) { const b = R(i), y0 = i === 0 ? b.y : b.y - 2, h = b.h + (i === 0 ? 0 : 2), up = i === 0 || ws[i] > ws[i - 1] + 2 * r ? r : 0, dn = i === n - 1 || ws[i] > ws[i + 1] + 2 * r ? r : 0;
      g.roundRect(b.x, y0, b.w, h, [up, up, dn, dn]); }
    for (let i = 0; i < n - 1; i++) {   // inner fillets where the narrower of two lines meets the wider one
      const A = R(i), B = R(i + 1), yj = B.y, d = (ws[i] - ws[i + 1]) / 2;
      if (Math.abs(d) < 2 * r) continue; const nar = d > 0 ? B : A, down = d > 0 ? 1 : -1;
      for (const side of [-1, 1]) { const xe = side < 0 ? nar.x : nar.x + nar.w, cx = xe + side * r, cy2 = yj + down * r;
        g.moveTo(xe, yj); g.lineTo(xe, cy2); g.arc(cx, cy2, r, side < 0 ? 0 : Math.PI, down > 0 ? -Math.PI / 2 : Math.PI / 2, (side < 0) === (down > 0)); g.closePath(); } }
  };
  g.fillStyle = '#ffffff'; g.shadowColor = 'rgba(15,18,22,0.12)'; g.shadowBlur = 16 * DPR; g.shadowOffsetY = 5 * DPR; shape(); g.fill('nonzero');
  g.shadowColor = 'transparent'; shape(); g.fill('nonzero');
  g.fillStyle = '#0a0a0a'; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; lines.forEach((s, i) => g.fillText(s, 540, top + pad + i * pitch + pitch * 0.735));
  g.restore();
}
overlay(85, 'title', t => { const a = 1 - sstep(1.86, 2.04, NEWT); if (a > 0.003) TITLE_draw(TITLE_LINES, TITLE_Y, { a }); });
drawCaps = function (TT) {
  if (CAP_OFF || Q.has('nocaps')) return; const ci = CAPS.findIndex(c => TT >= c.t0 && TT < c.t1); if (ci < 0) return; const c = CAPS[ci]; screen();
  const k = clamp((TT - c.t0) / 0.12), e = 1 - (1 - k) * (1 - k), y = CAP_Y + (1 - e) * 10, f = F(c.size, 600), fk = FS(Math.round(c.size * 1.07), 600, true), ls = -0.01 * c.size;
  const sp = c.size * 0.27, gap = i => sp + (c.parts[i].key ? c.size * 0.07 : 0) + (c.parts[i + 1] && c.parts[i + 1].key ? c.size * 0.03 : 0); let total = 0; for (let i = 0; i < c.parts.length - 1; i++) total += gap(i);
  const ws = c.parts.map(p => { g.font = p.key ? fk : f; g.letterSpacing = (p.key ? 0 : ls) + 'px'; const w = g.measureText(p.txt).width; total += w; return w; }); g.letterSpacing = '0px';
  const dark = (window.CAP_DARK || {})[ci] ? 1 : 0, col = p => p.key ? mix('#1a8cff', '#62b3ff', dark) : mix('#0f1216', '#ffffff', dark);
  const draw = (sc, blur, dy) => { g.shadowColor = sc; g.shadowBlur = blur * DPR; g.shadowOffsetY = dy * DPR; g.shadowOffsetX = 0;
    let x = 540 - total / 2; c.parts.forEach((p, i) => { T(p.txt, x, y, { f: p.key ? fk : f, c: col(p), ls: p.key ? 0 : ls }); x += ws[i] + gap(i); }); };
  g.save(); g.globalAlpha = e;
  if (dark > 0.01) { g.globalAlpha = e * dark; draw('rgba(0,0,0,0.55)', 22, 0); g.globalAlpha = e; }
  draw(`rgba(${Math.round(15 * (1 - dark))},${Math.round(18 * (1 - dark))},${Math.round(22 * (1 - dark))},${(0.24 + 0.36 * dark).toFixed(3)})`, 10, 4);
  g.restore();
};
