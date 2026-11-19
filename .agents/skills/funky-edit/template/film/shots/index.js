// The shots, in story order. Each file calls KIT.shot(...) and KIT.cam.key(...). 00_base runs first on every frame
// (everything back to "off"), 99_post last (the words, labels, the wipe). Put your beats between them.
window.SHOT_FILES = ['00_base', '10_demo', '99_post'];
window.loadShots = async () => { for (const n of window.SHOT_FILES) await new Promise((res) => {
  const s = document.createElement('script'); s.src = 'shots/' + n + '.js'; s.onload = res; s.onerror = () => { console.warn('shot file missing: ' + n); res(); }; document.head.appendChild(s); }); };
