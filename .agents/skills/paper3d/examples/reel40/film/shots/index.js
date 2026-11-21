// The shots, in story order. Each file calls KIT.shot(...) and KIT.cam.key(...).
window.SHOT_FILES = ['00_hook', '10_run', '30_beat', '40_steps', '50_bp', '90_end'];
window.loadShots = async () => { for (const n of window.SHOT_FILES) await new Promise((res) => {
  const s = document.createElement('script'); s.src = 'shots/' + n + '.js'; s.onload = res; s.onerror = () => { console.warn('shot file missing: ' + n); res(); }; document.head.appendChild(s); }); };
