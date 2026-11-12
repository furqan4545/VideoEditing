// The models. Each file calls KIT.asset(name, factory). Add your own file names here.
window.ASSET_FILES = ['gate', 'tag', 'print', 'legs', 'person', 'bag', 'cheese', 'fields', 'ruler', 'swing', 'keys', 'checkout', 'clothes', 'laundry', 'hardware', 'cards', 'macropaper'];
window.loadAssets = () => Promise.all(window.ASSET_FILES.map(n => new Promise((res) => {
  const s = document.createElement('script'); s.src = 'assets/' + n + '.js'; s.onload = res; s.onerror = () => { console.warn('asset file missing: ' + n); res(); }; document.head.appendChild(s);
})));
