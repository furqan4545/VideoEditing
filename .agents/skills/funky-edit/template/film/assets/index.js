// The models of this film.
window.ASSET_FILES = ['chars'];
window.loadAssets = () => Promise.all(window.ASSET_FILES.map(n => new Promise((res) => {
  const s = document.createElement('script'); s.src = 'assets/' + n + '.js'; s.onload = res; s.onerror = () => { console.warn('asset file missing: ' + n); res(); }; document.head.appendChild(s);
})));
