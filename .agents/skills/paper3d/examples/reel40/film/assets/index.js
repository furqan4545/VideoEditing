// The models. Each file calls KIT.asset(name, factory).
window.ASSET_FILES = ['exhibit', 'body', 'legs', 'person', 'watch', 'runner', 'tissue', 'hand', 'derm', 'keys'];
window.loadAssets = () => Promise.all(window.ASSET_FILES.map(n => new Promise((res) => {
  const s = document.createElement('script'); s.src = 'assets/' + n + '.js'; s.onload = res; s.onerror = () => { console.warn('asset file missing: ' + n); res(); }; document.head.appendChild(s);
})));
