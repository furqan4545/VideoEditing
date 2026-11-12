// "Simple story tell caption": Ali's caption template for story-telling and explainer films (first used on reel 15).
// A few words at a time near the top of the frame, one weight, never bold, never moving. The words already spoken are
// near-black, the words still to come are grey, so the line fills in as he talks. Over footage the same in white.
//
//   <script src="story_caption.js"></script>
//   StoryCaption.mount(overlayElement);                       // once: adds the caption element and its style
//   StoryCaption.build(TIMING.words);                         // words = [[word, t0, t1, pieceId?], ...] in seconds
//   StoryCaption.draw(t, { theme: 'dark' | 'light', opacity: 1, hidden: false });   // every frame; pure function of t
//
// Frame: 1080 x 1920. Change a default only when the layout forces it: StoryCaption.build(words, { top: 300 }).
(function () {
  const D = {
    left: 110, width: 860, top: 268,          // the caption band: x 110-970, first line at y 268 (two lines reach y 384)
    size: 50, weight: 500, tracking: '-0.008em', lineHeight: 1.16,
    on: '#15161a', off: '#a9aaae',            // dark theme: spoken / coming words
    onLight: '#ffffff', offLight: 'rgba(255,255,255,0.55)', shadowLight: '0 2px 14px rgba(0,0,0,0.55), 0 0 2px rgba(0,0,0,0.5)',
    maxChars: 20, maxWords: 4,                // a chunk ends at 4 words or 20 characters ...
    gap: 0.45,                                // ... or at a pause longer than this, a new phrase (pieceId), or after . ? ! , :
    lead: 0.06, hold: 0.9, tail: 0.7,         // shows 0.06 s before its first word; stays at most 0.9 s after its last (0.7 s for the last chunk)
    early: 0.03,                              // a word turns dark 0.03 s before it is spoken
    font: '"SF Reel", -apple-system, "SF Pro Display", "Helvetica Neue", Helvetica, Arial, sans-serif',
  };
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const SC = window.StoryCaption = {
    defaults: D, opts: Object.assign({}, D), chunks: [], el: null, _key: '',
    // cut the words into chunks
    build(words, o) {
      const p = SC.opts = Object.assign({}, D, o || {}), W = words || [], C = SC.chunks = []; let cur = [];
      const flush = () => { if (cur.length) { C.push({ t0: cur[0][1], t1: cur[cur.length - 1][2], words: cur }); cur = []; } };
      for (let i = 0; i < W.length; i++) {
        const w = W[i], prev = cur[cur.length - 1];
        if (prev && ((w[3] !== undefined && w[3] !== prev[3]) || w[1] - prev[2] > p.gap)) flush();
        cur.push(w); const len = cur.reduce((a, x) => a + String(x[0]).length + 1, 0);
        if (/[.?!,:]$/.test(w[0]) || len >= p.maxChars || cur.length >= p.maxWords) flush();
      }
      flush();
      for (let i = 0; i < C.length; i++) { const nx = C[i + 1]; C[i].show0 = C[i].t0 - p.lead; C[i].show1 = nx ? Math.min(nx.t0 - p.lead, C[i].t1 + p.hold) : C[i].t1 + p.tail; }
      SC._key = ''; if (SC.el) SC._place(); return C;
    },
    _place() { const p = SC.opts, s = SC.el.style; s.left = p.left + 'px'; s.width = p.width + 'px'; s.top = p.top + 'px'; s.fontSize = p.size + 'px'; s.fontWeight = p.weight; s.letterSpacing = p.tracking; s.lineHeight = p.lineHeight; s.fontFamily = p.font; },
    // add the caption element (and the style, once) to a positioned container that covers the 1080 x 1920 frame
    mount(parent) {
      if (!document.getElementById('stcap-style')) { const st = document.createElement('style'); st.id = 'stcap-style';
        st.textContent = '.stcap{position:absolute;text-align:center;pointer-events:none;z-index:20}' +
          `.stcap.dark .on{color:${D.on}}.stcap.dark .off{color:${D.off}}.stcap.light .on{color:${D.onLight}}.stcap.light .off{color:${D.offLight}}.stcap.light{text-shadow:${D.shadowLight}}`;
        document.head.appendChild(st); }
      const el = SC.el = document.createElement('div'); el.className = 'stcap dark'; (parent || document.body).appendChild(el); SC._place(); return el;
    },
    // which chunk is up at time t and how many of its words are spoken: { i, said } or null
    state(t) { const C = SC.chunks; for (let i = 0; i < C.length; i++) if (t >= C[i].show0 && t < C[i].show1) return { i, said: C[i].words.filter(w => t >= w[1] - SC.opts.early).length }; return null; },
    draw(t, o) {
      const el = SC.el; if (!el) return; const theme = (o && o.theme) || 'dark', st = o && o.hidden ? null : SC.state(t);
      el.style.opacity = st ? ((o && o.opacity != null) ? o.opacity : 1) : 0;
      if (!st) { if (SC._key !== '') { el.innerHTML = ''; SC._key = ''; } return; }
      const key = st.i + ':' + st.said + ':' + theme; if (key === SC._key) return; SC._key = key; el.className = 'stcap ' + theme;
      el.innerHTML = SC.chunks[st.i].words.map((w, k) => `<span class="${k < st.said ? 'on' : 'off'}">${esc(w[0])}</span>`).join(' ');
    },
  };
})();
