// The shots, in story order. Each file calls KIT.shot(...) and KIT.cam.key(...).
window.SHOT_FILES = ['00_base', '10_open', '20_board', '30_close', '99_post'];
window.loadShots = async () => { for (const n of window.SHOT_FILES) await new Promise((res) => {
  const s = document.createElement('script'); s.src = 'shots/' + n + '.js'; s.onload = res; s.onerror = () => { console.warn('shot file missing: ' + n); res(); }; document.head.appendChild(s); }); };
