// Real Kubai icons -> SVG strings (the library's own renderer, packages/core/src/render.js). node tools/icons_svg.mjs REPO OUT.json
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
const root = process.argv[2], out = process.argv[3];
const { loadIcons } = await import(pathToFileURL(root + '/tools/registry.mjs').href);
const { renderSVG } = await import(pathToFileURL(root + '/packages/core/src/render.js').href);
const { icons, bases } = await loadIcons({ strict: false });
const by = Object.fromEntries(bases.map(b => [b.name, b]));
const COLORFUL = ['#5393FF', '#6366F1', '#EC4899', '#F97316', '#22C55E', '#06B6D4', '#8B5CF6', '#F43F5E', '#14B8A6', '#0284C7', '#0EA5E9', '#EF4444', '#7C3AED', '#F59E0B', '#4F46E5', '#0D9488', '#16A34A', '#D97706', '#64748B', '#DC2626'];
const HERO = { folder: '#5393FF', lock: '#F59E0B', mail: '#EC4899', calendar: '#EF4444', settings: '#64748B', bell: '#F59E0B', search: '#6366F1', download: '#22C55E', bookmark: '#F43F5E',
  clock: '#06B6D4', trash: '#EF4444', camera: '#8B5CF6', heart: '#F43F5E', star: '#F59E0B', home: '#14B8A6', user: '#0EA5E9', image: '#22C55E', key: '#D97706', shield: '#16A34A', gift: '#EC4899',
  music: '#7C3AED', video: '#DC2626', map: '#0D9488', compass: '#F97316', calculator: '#4F46E5', notebook: '#0284C7', rocket: '#F97316', palette: '#8B5CF6', scissors: '#64748B', pencil: '#F59E0B' };
const N = 12, res = { N, heroes: {}, big: {}, layers: {}, wall: [], counts: { icons: icons.length, bases: bases.length } };
for (const [n, c] of Object.entries(HERO)) { if (!by[n]) { console.error('no icon', n); continue; }
  res.heroes[n] = { color: c, frames: Array.from({ length: N }, (_, i) => renderSVG(by[n], { size: 256, accent: c, progress: i / (N - 1), k: `h-${n}-${i}` })) }; }
for (const n of ['folder', 'lock']) res.big[n] = { color: HERO[n], frames: Array.from({ length: N }, (_, i) => renderSVG(by[n], { size: 768, accent: HERO[n], progress: i / (N - 1), k: `b-${n}-${i}` })) };
for (const [id, c] of Object.entries({ grey: '#9AA3B5', blue: '#5393FF', green: '#22C55E', purple: '#8B5CF6', amber: '#F59E0B' })) res.layers[id] = { color: c, svg: renderSVG(by.folder, { size: 1024, accent: c, progress: 0, k: `l-${id}` }) };
icons.forEach((ic, i) => { try { res.wall.push(renderSVG(ic, { size: 64, accent: COLORFUL[(i * 7) % COLORFUL.length], progress: 0, k: `w${i}` })); } catch (e) {} });
fs.writeFileSync(out, JSON.stringify(res));
console.log('heroes', Object.keys(res.heroes).length, 'wall', res.wall.length, 'bytes', fs.statSync(out).size);
