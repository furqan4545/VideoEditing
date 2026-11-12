// scenes/network.js — region D (x 7400..12400, y -2000..4000) · R17a–R19 (53.40–65.30) · prefix NW_
// every post → its own server · the one server that holds the pen · a wall of millions of servers · inside it the
// notebook as a table · the servers stream into a dot-matrix world map · copies hear the new number a second later.
'use strict';

// ───────── clock ─────────
const NW_T = {
  in: T0('R17a'), every: A_.tEveryPost, one: A_.tOneComp, holds: Wd('R17b', 'holds'), pen: A_.tHoldsPen, mil: A_.tMillionsComp,
  call: Wd('R17b', 'which'), srv: A_.tServer, others: A_.tOthers, world: A_.tWorld, copies: A_.tCopies,
  hear: A_.tHear, second: A_.tSecond, later: A_.tLater, out: T1('R19'),
};
const NW_K = {
  rackIn: 53.46, postIn: 53.56, linkIn: 53.80, chip0: 54.24, chipPost: 54.55, chipPlug: 54.80, dim: 54.80,
  slide: 54.92, pen0: NW_T.pen - 0.52, ripple: NW_T.mil - 0.22, ring: NW_T.mil + 0.2, label: NW_T.srv,
  tum0: NW_T.srv + 0.04, tum1: NW_T.srv + 0.32, gl0: NW_T.srv + 0.20, gl1: NW_T.srv + 0.40,
  shut0: 60.03, shut1: 60.13, untum0: 60.05, untum1: 60.22, fly0: 60.10, fly1: 60.74, morph0: 60.12, morphD: 0.46, morphS: 0.30,
  card0: 60.40, card1: 60.80, leader: 60.74, cities: 60.86, boards: 61.0, tl: 62.72,
  penUp: 62.84, w0: 63.04, w1: 63.40, penBack: 63.48, arcs: 63.34, pulse0: 63.55, arr0: 64.10, arr1: NW_T.later + 0.31,
  end: NW_T.out + 0.12,
};

// ───────── geometry (world units) ─────────
const NW_HX = 9700, NW_HY = 1000;                                  // Sara's server (the hero) faceplate centre
const NW_U = { w: 340, h: 28, p: 29, ear: 14, bw: 312 };            // 1U unit: width with ears, faceplate height, rack pitch, ear, body
const NW_RK = { w: 356, top: 30, bot: 40, n: 42 }; NW_RK.h = NW_RK.top + NW_RK.n * NW_U.p + NW_RK.bot;   // a 42U rack (1288 tall)
const NW_HI = 23;                                                    // hero slot in its rack → label srv-0423
const NW_RX0 = NW_HX - NW_RK.w / 2, NW_RY0 = NW_HY - NW_RK.top - NW_HI * NW_U.p - NW_U.h / 2;
const NW_uy = (ry, i) => ry + NW_RK.top + i * NW_U.p;                // top of slot i
const NW_ux = rx => rx + (NW_RK.w - NW_U.w) / 2;                     // left of a unit (ears) in a rack
const NW_POST = { x: NW_RX0 - 330 - 260, w: 260, h: 230, gap: 20 }; NW_POST.y = NW_HY - 3 * (NW_POST.h + NW_POST.gap) - NW_POST.h / 2;
const NW_POST_SLOT = [4, 10, 16, 23, 29, 36];                        // post i → its server slot in the rack (Sara = post 3 → slot 23)
const NW_HANDLES = ['@noor.trails', '@kai.brews', '@lena.city', '@sara.draws', '@milo.waves', '@ivy.blooms'];
// the map, the leader card above it, the timeline below it (framed at zoom ~0.45 centred on the hero)
const NW_MY = lat => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * lat * Math.PI / 180));   // Miller
const NW_MAP = { x: NW_HX - 1150, y: NW_HY - 856, w: 2300, lat0: 80, lat1: -56 };
NW_MAP.h = NW_MAP.w * (NW_MY(NW_MAP.lat0) - NW_MY(NW_MAP.lat1)) / (2 * Math.PI);
const NW_geo = (lon, lat) => [NW_MAP.x + (lon + 180) / 360 * NW_MAP.w, NW_MAP.y + (NW_MY(NW_MAP.lat0) - NW_MY(lat)) / (NW_MY(NW_MAP.lat0) - NW_MY(NW_MAP.lat1)) * NW_MAP.h];
const NW_CARD = { x: NW_HX - 850, y: NW_HY - 1760, w: 1700, h: 760 };
const NW_CS = 2.7, NW_CANCHOR = [NW_CARD.x + 525, NW_CARD.y + 530];   // hero scale inside the card, its bottom-centre there
const NW_BOARD = { x: NW_CARD.x + 1010, y: NW_CARD.y + 90, w: 620, h: 600 };
const NW_TL = { x: NW_MAP.x - 34, y: NW_HY + 330, w: NW_MAP.w + 68, h: 500 };
const NW_LEADER = { n: 'Virginia', lon: -77.5, lat: 39.0 };
const NW_CITIES = [
  { n: 'London', lon: -0.13, lat: 51.5, bo: [-165, -185] },
  { n: 'Frankfurt', lon: 8.68, lat: 50.11, bo: [150, -185] },
  { n: 'São Paulo', lon: -46.63, lat: -23.55, bo: [-250, 40] },
  { n: 'Mumbai', lon: 72.88, lat: 19.08, bo: [45, -190] },
  { n: 'Tokyo', lon: 139.69, lat: 35.69, bo: [-85, -190] },
  { n: 'Sydney', lon: 151.21, lat: -33.87, bo: [-225, -40] },
];

// ───────── helpers ─────────
const NW_hash = n => { n = (n | 0) ^ 0x9e3779b9; n = Math.imul(n ^ (n >>> 16), 0x85ebca6b); n = Math.imul(n ^ (n >>> 13), 0xc2b2ae35); return (n ^ (n >>> 16)) >>> 0; };
// a server LED that blinks on its own deterministic rhythm
const NW_on = (id, t, duty = 0.72) => { const h = NW_hash(id), rate = 1.6 + (h % 7) * 0.85, k = Math.floor(t * rate + ((h >>> 8) % 97) / 7); return (NW_hash(id * 7919 + k) % 1000) / 1000 < duty; };
function NW_scaled(s, fn) { const z = ZS; g.save(); g.scale(s, s); ZS = z * s; try { fn(); } finally { ZS = z; g.restore(); } }
const NW_bez = (p0, p1, p2, p3, k) => { const u = 1 - k; return [u * u * u * p0[0] + 3 * u * u * k * p1[0] + 3 * u * k * k * p2[0] + k * k * k * p3[0], u * u * u * p0[1] + 3 * u * u * k * p1[1] + 3 * u * k * k * p2[1] + k * k * k * p3[1]]; };
const NW_qb = (p0, c, p1, k) => { const u = 1 - k; return [u * u * p0[0] + 2 * u * k * c[0] + k * k * p1[0], u * u * p0[1] + 2 * u * k * c[1] + k * k * p1[1]]; };

// ───────── the land: coarse coastlines (lon, lat), rasterised once into a dot matrix ─────────
const NW_LANDP = [
  // North America
  [-168,66,-162,70,-156,71.3,-141,69.8,-128,70,-115,68.5,-105,68,-95,68.5,-90,69,-85,69.8,-82,66,-87,64,-94,61,-93,58.5,-88,56.8,-82,55,-80,51.5,-78.5,55.5,-77,59,-78,62.5,-72,62,-65,60,-61.5,56.5,-56,52,-60,48.5,-64.5,48.5,-61,45.5,-66,43.8,-70,43,-70.5,41.5,-74,40.5,-76,38,-75.5,35.5,-77.5,34.5,-81,31.5,-80,27,-80.5,25.2,-82,26,-82.8,28,-84,30,-89,30.2,-91,29.2,-94,29.6,-97.2,27.5,-97.6,24,-97.5,21.5,-96,19.2,-94.5,18.2,-91.5,18.5,-90.5,21,-87,21.5,-87.5,18.5,-88.3,16,-84,15.8,-83.3,14,-83.7,11,-82,9,-79.5,9.5,-77.4,8.5,-78.5,7.5,-80.5,7.4,-82,8.2,-85.7,10,-85.7,11.2,-87.5,13,-91.5,14,-94,16,-96.5,15.7,-100,16.9,-105.5,20,-105.5,22.5,-108,25.5,-112,29,-114.8,31.7,-113,29,-112,26.5,-110,23.5,-109.4,23,-111.5,24.5,-112.2,26,-114.2,28,-115.8,30.4,-117.1,32.5,-118.5,34,-120.6,34.6,-121.9,36.6,-122.5,37.8,-123.8,39.5,-124.2,42,-124,46,-124.7,48.4,-123,48.2,-124.5,50,-127.5,51,-130,54,-133,57.5,-137,58.5,-140,59.8,-145,60.3,-148,60.6,-151.5,59.2,-154,57.5,-158,56.5,-162,55,-164.5,54.5,-160,58.5,-162,59.8,-165,60.8,-165,62.5,-166,64.5,-163,64.5],
  [-80,73.5,-72,72,-68,70.5,-66,67,-62,66,-64.5,63.5,-66,62,-71,63,-74,64.5,-78,64.5,-80,63.5,-83,66,-86,68,-89,70.5,-86,73],   // Baffin
  [-118,72,-112,73.2,-105,73.5,-101,70,-105,68.5,-114,68.8,-118,70.5],                                                          // Victoria
  [-125,71.8,-120,71.3,-115.5,73.5,-121,74.4,-125,73.5],                                                                        // Banks
  [-96,75,-82,74.5,-80,76.5,-92,76.8],                                                                                          // Devon
  [-90,76.5,-78,76.5,-70,79,-62,82,-80,83,-92,81],                                                                              // Ellesmere
  [-72,78.5,-66,80.8,-58,82,-40,83,-22,82.5,-18,80,-19,77,-21,74,-22,71,-25,69.5,-32,68.2,-35,66,-39,65.5,-42,62,-44,60,-48,61,-50,63.5,-52,66,-54,68.5,-51.5,70.5,-55,71.5,-57,74.5,-62,76,-68,77],  // Greenland
  [-24,65.5,-22,66.4,-16,66.5,-13.5,65.2,-15,64.3,-18.5,63.4,-22.5,63.8],                                                       // Iceland
  [-59.4,47.6,-56,49.5,-55.5,51.6,-53,49,-52.7,47.5,-55,46.8],                                                                  // Newfoundland
  [-85,21.8,-82,23.2,-77.5,22,-74.2,20.2,-77.5,19.8,-80,21.7,-83.5,21.8],                                                       // Cuba
  [-74.5,19.8,-72,19.9,-68.4,18.6,-71,17.6,-74.5,18.3],                                                                         // Hispaniola
  // South America
  [-77.4,8.5,-75.5,10.8,-72,12.2,-71.5,10.8,-68,10.7,-64,10.6,-61.5,10.4,-60,8.5,-57.5,6,-54,5.7,-51.5,4.3,-50,1.8,-50,0,-48,-1,-44.5,-2.4,-41,-2.9,-37.5,-4.8,-35.2,-5.5,-35,-8.5,-37,-11,-39,-13.5,-39.2,-17.5,-40,-20.5,-41,-22,-44,-23,-47.5,-24.8,-48.6,-28,-50.2,-30.5,-52.2,-32.5,-53.4,-34,-55,-34.9,-57.5,-35,-56.7,-36.5,-57.6,-38.2,-62,-38.9,-62.3,-40.6,-65,-41,-64,-42.6,-65.3,-45,-67.5,-46.4,-65.8,-47.8,-68.2,-50.1,-68.6,-52.3,-70,-52.6,-68.5,-54.5,-71,-54.8,-74.5,-52.8,-75.4,-48.5,-74.2,-44,-73.5,-41.5,-73.4,-37,-71.6,-33,-71.4,-28.5,-70.5,-23.5,-70.2,-18.4,-71.4,-17.6,-75,-15.4,-76.3,-13.6,-77.5,-11.5,-79.5,-8,-81.2,-6,-81.2,-4.4,-80.1,-3.4,-80.9,-1.5,-80,0.5,-79,1.8,-77.8,3.8,-77.3,6.5,-77.9,7.3],
  // Africa
  [-17.1,21,-16.2,24.5,-14.5,26.2,-13,27.8,-9.8,29.8,-9.6,32.3,-6.9,34,-5.9,35.8,-2,35.1,1,36.5,5,36.8,9.7,37.3,11,37,10,34.2,11.5,33,15.3,32.2,18.5,30.4,20,31,20.2,32.7,22.6,32.8,25,31.8,29,30.9,32.3,31.3,34.2,31.3,34.5,29.5,33.6,27.3,35.5,24,37.2,21,38.6,18,39.7,15.5,41.5,13.8,43.3,12.5,43.2,11.5,45,10.4,51.2,11.8,51,10,49.5,6.5,47,3.5,45.5,2,42,-1,40.5,-2.5,39.3,-4.6,39.2,-8,40.4,-10.5,40.6,-14,39.5,-16.8,36.8,-18.5,35.3,-21.5,35.5,-24,32.9,-25.9,32.5,-28.5,31,-29.8,28,-32.7,25.6,-34,22.5,-34,20,-34.8,18.4,-34,18,-31.5,17,-29,15.2,-27,14.5,-22.5,13.4,-20.8,11.8,-17.2,12.3,-13.5,13.6,-10.8,13.2,-8.8,12.2,-6,11.7,-3.7,9.6,-1.5,9.3,0.5,9.5,3,9.7,4.2,8.5,4.6,5.8,4.3,4.5,6.3,2,6.3,-1,5,-3,5,-7.5,4.4,-9.5,5.6,-11.5,6.9,-13.2,8.8,-15,10.9,-16.8,12.3,-17.5,14.7,-16.4,16.5,-16.1,19.6],
  [49.3,-12,50.5,-15.5,49.6,-17.5,48.7,-20.5,47.5,-24.5,45,-25.5,43.6,-23.5,43.3,-21.5,44.4,-19.8,44,-17,46.3,-15.8,48,-13.6],   // Madagascar
  // Eurasia
  [-9,37,-8.9,41,-9.3,43,-8,43.7,-4.5,43.4,-1.8,43.4,-1.2,46,-2.5,47.3,-4.5,47.9,-4.6,48.6,-1.6,48.7,-1.3,49.7,0.2,49.5,1.6,50.9,3.5,51.4,4.5,52.5,5,53.3,7,53.6,8.6,54,8.6,55.5,8.2,56.8,10,57.6,10.6,57.1,10.2,56,10.8,55.2,10,54.5,11,54,13,54.3,14.2,53.9,16.5,54.5,18.5,54.8,19.6,54.4,21.2,55.2,21.1,56.4,21.6,57.4,22.6,57.7,23.4,57,24.3,57.2,24.4,58.4,23.5,58.7,23.5,59.2,25.5,59.6,28,59.5,30.2,59.9,29,60.2,26.5,60.4,23,59.9,21.3,60.8,21.5,62.3,22.4,63.5,24.6,64.9,25.4,65.2,24.2,65.8,22.2,65.7,21.2,64.4,19.5,63.5,17.6,62.4,17.2,61.2,18.6,60.2,18.9,59.7,16.8,58.6,16.4,57,15.9,56.1,14.3,55.5,12.9,55.4,12.6,56.2,11.8,57.7,11.2,58.9,10.5,59.5,9.9,59,8,58.1,6.2,58.3,5.3,59.2,5,61,5.2,62.2,7.5,63,10,64.3,12.8,66,14,67.5,16,68.6,18.5,69.8,23,70.6,26,71,29,70.6,31,70.2,33,69.4,36,69,40.5,67.7,41,66.3,38.2,66,34.8,66.6,33,66.2,34.8,64.5,37,63.8,39,64.5,40.5,64.6,44,66,44,68.4,46,68.2,53,68.8,57,68.5,60,68.8,62.5,69.8,66,69.3,68.5,69,66.8,71,69,73,72.5,72.8,75,72.3,80,73.5,87,74.5,95,75.7,104,77.6,113,76.1,113,73.7,120,73,127,73.5,130,71,139,71.5,145,72.3,152,70.9,160,70.5,170,69.9,176,69.8,180,68.9,180,65,179,62.3,177,62.5,173,61.7,170,60,166,60.2,163.5,59.9,162,57.8,163,56.2,162,54.8,160,53.2,158,52,156.6,51,156,55,157.5,58.5,155,59.4,151,59.3,147,59.4,143,59.3,140.5,57.5,137.5,54.5,140.5,53.5,141.4,51.5,140.4,48.6,138,46.5,135.2,43.5,132,43.2,130.7,42.3,129.7,41,128,39,129.4,36.5,129.3,35.2,127,34.6,126.3,34.4,126.5,36,126.7,37.6,125,37.9,124.7,39.6,121.6,38.9,121.2,40.8,119,39.2,117.8,38.6,118.5,37.5,119.2,37.2,120.7,37.8,122.5,37.3,120.3,36,119.3,34.8,120.8,32.5,121.9,30.9,121.4,28.3,119.6,25.5,118,24.4,116.5,22.9,113.5,22.2,111,21.4,109.8,21.5,108.5,21.6,106.8,20.7,105.7,19,106.6,17.5,108.5,15.4,109.3,13,109.2,11.6,107.6,10.4,106.5,9.6,105.2,8.7,104.8,10.2,103,11,102.4,12.2,100.9,12.7,100.1,13.4,99.2,10.3,99.9,9.2,100.5,7.5,101.5,6.9,102.6,6,103.4,4.6,103.5,2.8,104.2,1.4,103.5,1.3,102.2,2.2,101.3,2.9,100.4,4.6,100.3,6.4,99.3,7.6,98.3,8.2,98.6,10.2,98.5,12,97.8,14.8,97.6,16.5,96.3,16.7,94.6,16,94.2,18.8,93.3,20,92.2,21.3,91.8,22.4,90.3,21.9,89,21.8,87,21.4,86.8,20.2,84.9,19.2,82.3,16.6,80.3,15.5,80.2,13.2,79.9,10.3,79.2,9.2,78.2,8.9,77.5,8.1,76.5,9.1,75.8,11.3,74.8,12.9,74.1,15.1,73.4,16.5,72.8,19.1,72.9,20.9,72.6,21.3,70.4,20.9,69,22.3,70,22.9,68.3,23.6,67.3,24.8,66.6,25.4,64.5,25.2,61.5,25.1,58.8,25.5,57.3,25.9,56.6,27.1,54.7,26.5,53.5,26.8,51.4,27.9,50.6,29.1,50.2,30.1,49,30.1,48,29.4,48.6,28,49.6,26.8,50.2,25.6,51.6,24.3,54,24.2,55.5,25.3,56.2,26.2,56.4,24.9,57.2,23.9,58.8,23.5,59.8,22.4,58.5,20.4,57.8,19,56.6,18.2,55.3,17.6,54,17,52.2,15.7,49.5,14.6,48,14,45.6,13.3,44,12.6,43.4,12.7,42.8,14.8,42.7,16.4,41.2,19.1,40,20.5,39.2,21.5,38.5,23.6,37.4,25,36.5,26.4,35.2,28,34.9,29.4,34.2,31.3,34.9,32.5,35.5,33.9,35.9,35.4,36.1,36.7,34.6,36.8,32.8,36.1,31,36.8,29.6,36.2,28,36.8,27.3,37.4,26.4,38.4,26.6,39.5,26.2,40.1,26,40.8,24,40.7,22.9,40.4,23.5,39.5,22.8,38.6,24,38.2,23,37.4,22.5,36.5,21.7,36.9,21.1,37.8,21.3,38.4,20.7,39.1,19.4,40.3,19.4,41.8,18.5,42.5,17,43.2,15.9,43.6,15.2,44.4,14.3,45.2,13.6,45.7,12.3,45.3,12.4,44.3,13.6,43.5,14.5,42.2,16.1,41.4,17.9,40.6,18.5,40.1,17.2,39.4,16.6,38.4,16,37.9,15.6,38.3,15.8,39.5,14.8,40.3,13.5,41.2,12.2,41.8,11.1,42.4,10.2,43.9,8.6,44.4,7.5,43.8,6.2,43.1,4.6,43.4,3.1,43.1,3.2,41.9,1,41,0,39.7,-0.3,38.5,-0.7,37.6,-2.1,36.7,-4.4,36.7,-5.6,36,-6.4,36.9,-7.4,37.2],
  [-5.7,50,-3,50.6,1.4,51.2,1.7,52.7,0.2,53.5,-0.5,54.5,-1.6,55.6,-2.1,57,-1.8,57.6,-3.4,58.6,-5,58.6,-6.2,57.5,-5.6,56.3,-4.9,54.9,-3.4,54.5,-3,53.4,-4.6,53.3,-4.2,52.3,-5.2,51.7,-3,51.4,-4.5,51.1],   // Great Britain
  [-6,52,-6.1,53.9,-5.5,54.6,-7.2,55.3,-8.4,54.6,-10,54.2,-9.9,53.4,-10.4,52,-9.4,51.5,-8,51.8],                                                 // Ireland
  [8.4,39,9.6,39.2,9.8,41.1,9.5,43,8.6,42.6,8.4,40.8], [12.4,38,15.6,38.3,15.1,36.7,12.7,37.6],                                                  // Sardinia+Corsica, Sicily
  [11.2,79.4,15,79.9,18,79.8,21,78.8,16.5,76.6,14,77.4,13,78.1], [52,71.4,56,73.7,60,75.8,68,76.8,64,75.4,58,73.4,56,71],                   // Svalbard, Novaya Zemlya
  [129.7,33.2,131,31.3,131.8,32.6,132.4,34,135,33.5,136.8,34.3,138.8,34.6,140,35,140.8,36,141,38.3,142,39.6,141.5,41.4,140,41.2,139.9,40,139.5,38.6,138.5,37.4,136.9,37.1,136,35.9,133,35.5,131.5,34.6,130.9,34],   // Japan
  [140,41.6,141.2,41.8,143.2,42,145.5,43.3,145.2,44.3,142,45.5,141.6,44.2,140.4,43.2],                                                           // Hokkaido
  [142,46,143.5,46.8,143,49,144.5,49,143.2,51.5,143.3,54,142.5,54.3,141.8,52,142,48.5],                                                         // Sakhalin
  [120.1,23,121,25.3,122,25,121,22,120.7,21.9], [108.6,19.2,110.4,20.1,111,19.6,110,18.2,108.7,18.5], [79.9,6.2,79.7,8.5,80.2,9.8,81.4,8.4,81.8,7,81,6],   // Taiwan, Hainan, Sri Lanka
  [120,18.5,122.3,18.5,122,16.5,121.6,14.2,124,13,123.5,12.6,121,13.7,120.5,14.7,119.8,16.4], [121.9,7,122.2,8.1,124.2,8.6,125.3,9.8,126.6,7.3,126.2,6.2,125.2,5.6,124.1,6.4], [122,10.7,123,11.5,125,11.3,125.5,10,124,9.7,122.9,9.5],   // Philippines
  [95.3,5.6,97.5,5.2,100.4,2.3,103.8,-1,106,-3.1,105.8,-5.8,104.5,-5.9,102.3,-4,100.9,-2.1,99.1,0.3,97.7,2.3],                                  // Sumatra
  [105.2,-6.8,106.5,-6,108.6,-6.7,110.5,-6.9,112.7,-6.9,114.4,-7.7,114.5,-8.7,111,-8.3,108,-7.8,106.3,-7.4],                                    // Java
  [109,1.6,109.6,2,111,2.7,113,3.2,115.5,5.2,117,7,119.2,5.3,118.1,4.8,118.6,1,117.8,0.8,117.5,-1,116.2,-3.3,115.2,-3.9,113,-3.2,111,-3,110.1,-2,109,0],   // Borneo
  [119.4,-5.5,120.4,-5.5,120.9,-2.6,122.8,-4.6,123.2,-1,121.2,-1.3,121.5,0.5,124.9,1.5,120.1,0.8,119.8,-0.8,118.8,-2.8],                       // Sulawesi
  [131,-1.3,132.6,-0.4,135,-3.3,138,-1.6,141,-2.6,144.5,-3.8,147.5,-6,147.9,-8,150,-10.3,147,-10,146,-8.5,143.5,-9,142.4,-9.2,141,-9.1,139,-8.1,138.5,-7.4,137.6,-5.2,134,-3.9,132.2,-2.9],   // New Guinea
  [124,-9.4,125.2,-8.5,127.3,-8.4,125,-9.9,124.1,-10.1],                                                                                         // Timor
  // Australia
  [113.5,-22,114.2,-26.5,115,-29.5,115.7,-31.8,115,-34.3,117.9,-35.1,121,-33.9,123.6,-33.9,126,-32.3,129,-31.6,131.2,-31.5,134.2,-32.7,135.6,-34.8,138.1,-34.2,138.5,-35.6,139.7,-37,140.6,-38,143.5,-38.8,146.3,-39.1,148,-37.8,150,-37.5,150.2,-35.8,151.3,-33.6,152.5,-32,153.6,-28.5,153.2,-25,151,-23.5,149.5,-22.3,148.8,-20.3,146.3,-18.9,145.4,-16.3,145.3,-14.9,143.6,-14,143,-11.2,142.5,-10.7,141.6,-12.8,141.7,-15,140.8,-17.4,139.3,-17.4,137.7,-16.2,135.5,-14.8,136.8,-12.2,135.9,-11.9,132.7,-11.6,131,-12.2,129.6,-14.9,127.6,-14.2,125.8,-14.7,124.4,-16.3,122.3,-17.5,121.4,-19.4,119,-20,116.7,-20.6],
  [144.6,-40.7,148.3,-40.9,148,-43.2,146.9,-43.6,145.3,-42.2],                                                                                  // Tasmania
  [172.7,-34.4,174.4,-36,175.9,-37.4,178.5,-37.7,177.9,-39.2,176.9,-39.6,175.2,-41.6,174.6,-41.2,174.9,-39.9,173.8,-39.2,174.6,-37.2],         // NZ north
  [172.7,-40.5,174.3,-41.2,173.3,-43,171.2,-44.4,170.7,-45.9,169,-46.6,166.5,-46,167,-44.7,168.5,-44,170.5,-42.8,172,-41.3],                   // NZ south
];
const NW_WATERP = [
  [28,41.3,29.5,41.2,31.5,41.2,33.5,42,36,41.7,38.5,40.9,41.5,41.5,41.7,42.5,40,43.5,38.2,44.4,37.5,45.2,36.5,45.3,35,45,33.5,44.5,32.5,45.4,33.6,46,31.5,46.6,30.2,45.8,29.6,45.2,28.7,44,28,43],   // Black Sea
  [47,45,48.5,46.8,51,47.2,53.2,46.6,52.8,45.2,51.2,44.5,51.6,43.1,53,42,52.8,40.2,53.8,39.2,54,37.3,52,36.6,50,37.3,49,38.5,49.4,40.2,48.3,41.6,47.4,43],                                          // Caspian
];
function NW_pip(P, x, y) { let c = false; for (let i = 0, j = P.length - 2; i < P.length; j = i, i += 2) { const xi = P[i], yi = P[i + 1], xj = P[j], yj = P[j + 1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
const NW_box = P => { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (let i = 0; i < P.length; i += 2) { a = Math.min(a, P[i]); b = Math.max(b, P[i]); c = Math.min(c, P[i + 1]); d = Math.max(d, P[i + 1]); } return [a, b, c, d]; };
const NW_COLSN = 128, NW_CELL = NW_MAP.w / NW_COLSN, NW_ROWSN = Math.round(NW_MAP.h / NW_CELL), NW_DOTR = NW_CELL * 0.34;
const NW_LAND = [], NW_SEA = [];
(function NW_raster() {
  const LB = NW_LANDP.map(NW_box), WB = NW_WATERP.map(NW_box), y0 = NW_MY(NW_MAP.lat0), y1 = NW_MY(NW_MAP.lat1);
  for (let r = 0; r < NW_ROWSN; r++) for (let c = 0; c < NW_COLSN; c++) {
    const x = NW_MAP.x + (c + 0.5) * NW_CELL, y = NW_MAP.y + (r + 0.5) * NW_MAP.h / NW_ROWSN;
    const lon = (c + 0.5) / NW_COLSN * 360 - 180, my = lerp(y0, y1, (r + 0.5) / NW_ROWSN), lat = (Math.atan(Math.exp(my / 1.25)) - Math.PI / 4) / 0.4 * 180 / Math.PI;
    let land = false; for (let i = 0; i < NW_LANDP.length && !land; i++) { const b = LB[i]; if (lon >= b[0] && lon <= b[1] && lat >= b[2] && lat <= b[3] && NW_pip(NW_LANDP[i], lon, lat)) land = true; }
    if (land) for (let i = 0; i < NW_WATERP.length; i++) { const b = WB[i]; if (lon >= b[0] && lon <= b[1] && lat >= b[2] && lat <= b[3] && NW_pip(NW_WATERP[i], lon, lat)) land = false; }
    (land ? NW_LAND : NW_SEA).push([x, y]);
  }
})();

// ───────── the field: racks of 1U servers around the hero, fading into the paper toward the edges ─────────
const NW_RACKS = [], NW_UNITS = [];
for (let j = -4; j <= 4; j++) for (let k = -8; k <= 8; k++) {
  const x = NW_RX0 + k * 430, y = NW_RY0 + j * 1520, cx = x + NW_RK.w / 2, cy = y + NW_RK.h / 2;
  const e = Math.hypot((cx - NW_HX) / 3700, (cy - NW_HY) / 6300), a = 1 - sstep(0.7, 1.08, e);
  if (a < 0.03) continue;
  NW_RACKS.push({ k, j, x, y, cx, cy, e, a, hero: k === 0 && j === 0, id: NW_RACKS.length + 1, d: 0.04 + 0.66 * Math.min(1, e) });
}
for (const R of NW_RACKS) for (let i = 0; i < NW_RK.n; i++) {
  if (R.hero && i === NW_HI) continue;
  const x = NW_ux(R.x), y = NW_uy(R.y, i), cx = x + NW_U.w / 2, cy = y + NW_U.h / 2, e = Math.hypot((cx - NW_HX) / 2400, (cy - NW_HY) / 3000);
  NW_UNITS.push({ R, i, x, y, cx, cy, e, id: R.id * 64 + i, tgt: null, t0: 0 });
}
// pair the servers with land dots, keeping their order (bands top→bottom, left→right inside a band) so the flow reads
(function NW_pair() {
  const U = NW_UNITS.filter(u => u.R.a > 0.12).sort((a, b) => a.e - b.e).slice(0, NW_LAND.length), n = Math.min(U.length, NW_LAND.length);
  const pick = (L, m) => { const s = L.slice().sort((a, b) => a.k - b.k); const out = []; for (let i = 0; i < m; i++) out.push(s[Math.floor(i * s.length / m)]); return out; };
  const us = pick(U.map(u => ({ u, k: u.cy * 10 + u.cx / 1e4 })), n).map(o => o.u), ds = pick(NW_LAND.map((p, i) => ({ p, i, k: p[1] * 10 + p[0] / 1e4 })), n);
  const B = Math.max(1, Math.round(Math.sqrt(n / 2.2)));
  us.sort((a, b) => a.cy - b.cy); ds.sort((a, b) => a.p[1] - b.p[1]);
  for (let b = 0; b < B; b++) {
    const i0 = Math.floor(b * n / B), i1 = Math.floor((b + 1) * n / B);
    const ub = us.slice(i0, i1).sort((a, c) => a.cx - c.cx), db = ds.slice(i0, i1).sort((a, c) => a.p[0] - c.p[0]);
    ub.forEach((u, q) => { u.tgt = db[q].p; db[q].p.used = true; });
  }
  for (const u of NW_UNITS) u.t0 = NW_K.morph0 + NW_K.morphS * clamp(u.e / 1.3) + (NW_hash(u.id) % 100) / 100 * 0.05;
})();

// ───────── one 1U server faceplate, full detail. (x, y) = top-left with ears; 340 x 28 ─────────
function NW_unit(x, y, slot, t, { kind = 'server', status = 0, px = 30, dim = 0 } = {}) {
  const W_ = NW_U.w, H_ = NW_U.h, E = NW_U.ear, bx = x + E, bw = NW_U.bw;
  g.save();
  g.fillStyle = '#1e1e22'; g.fillRect(x, y + 0.6, E + 1, H_ - 1.2); g.fillRect(x + W_ - E - 1, y + 0.6, E + 1, H_ - 1.2);
  const gr = g.createLinearGradient(0, y, 0, y + H_); gr.addColorStop(0, '#303036'); gr.addColorStop(0.07, '#202024'); gr.addColorStop(0.6, '#161619'); gr.addColorStop(1, '#0e0e10');
  g.fillStyle = gr; g.fillRect(bx, y, bw, H_);
  g.fillStyle = 'rgba(255,255,255,0.13)'; g.fillRect(bx, y, bw, 0.7); g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(bx, y + H_ - 0.7, bw, 0.7);
  // ears: screw + pull handle
  for (const ex of [x + E / 2, x + W_ - E / 2]) {
    g.fillStyle = '#2b2b30'; rr(ex - 3.2, y + 3.5, 6.4, 7, 2); g.fill();
    g.fillStyle = '#4a4a51'; g.beginPath(); g.arc(ex, y + 19, 2.9, 0, 6.2832); g.fill();
    if (px > 30) { g.strokeStyle = '#141416'; g.lineWidth = 0.7; g.beginPath(); g.moveTo(ex - 1.8, y + 19); g.lineTo(ex + 1.8, y + 19); g.moveTo(ex, y + 17.2); g.lineTo(ex, y + 20.8); g.stroke(); }
  }
  if (kind === 'switch') {
    for (let r = 0; r < 2; r++) for (let c = 0; c < 24; c++) { const px0 = bx + 8 + c * 8 + Math.floor(c / 6) * 3, py0 = y + 5 + r * 9.5;
      g.fillStyle = '#3a3a40'; g.fillRect(px0, py0, 6.6, 7); g.fillStyle = '#050506'; g.fillRect(px0 + 0.8, py0 + 0.8, 5, 5.4);
      if (NW_on(slot * 97 + c + r * 31, t, 0.6)) { g.fillStyle = '#e8eeff'; g.fillRect(px0 + 0.9, py0 + 0.9, 1.2, 1); } }
    g.fillStyle = '#d9d9dd'; g.fillRect(bx + 232, y + 6, 30, 8); if (px > 22) T('tor-04', bx + 247, y + 12.2, { f: FM(5.2, 600), c: '#151517', al: 'center' });
    g.fillStyle = '#e8eeff'; g.beginPath(); g.arc(bx + 285, y + 14, 1.4, 0, 6.2832); g.arc(bx + 292, y + 14, 1.4, 0, 6.2832); g.fill();
    g.restore(); return;
  }
  if (kind === 'brush') {
    g.fillStyle = '#0a0a0b'; rr(bx + 10, y + 9, bw - 20, 10, 3); g.fill();
    if (px > 10) { g.strokeStyle = '#1f1f23'; g.lineWidth = 0.6; g.beginPath(); for (let q = bx + 12; q < bx + bw - 12; q += 1.6) { g.moveTo(q, y + 9.5); g.lineTo(q + 0.4, y + 18.5); } g.stroke(); }
    g.restore(); return;
  }
  // 8 hot-swap drive bays
  for (let b = 0; b < 8; b++) {
    const dx = bx + 6 + b * 21.5;
    g.fillStyle = '#18181b'; rr(dx, y + 3, 20, 22, 1.4); g.fill(); g.strokeStyle = '#38383e'; g.lineWidth = 0.55; g.stroke();
    if (px > 9) {
      g.fillStyle = '#26262b'; rr(dx + 2, y + 16.5, 16, 6, 1.2); g.fill();                              // release latch
      g.strokeStyle = '#2e2e34'; g.lineWidth = 0.7; g.beginPath(); for (const q of [7, 9.6, 12.2]) { g.moveTo(dx + 3, y + q); g.lineTo(dx + 12, y + q); } g.stroke();
    }
    const act = NW_on(slot * 13 + b, t, 0.55);
    g.fillStyle = act ? '#eef3ff' : '#34343a'; g.beginPath(); g.arc(dx + 15.4, y + 6.2, 1.05, 0, 6.2832); g.fill();
    g.fillStyle = '#5a5a62'; g.beginPath(); g.arc(dx + 15.4, y + 9.6, 0.8, 0, 6.2832); g.fill();
  }
  // vent: honeycomb perforation up close, fine slats far away
  const vx = bx + 186, vw = 64;
  if (px > 46) { g.fillStyle = '#060607'; g.beginPath(); for (let r = 0; r < 8; r++) for (let c = 0; c < 24; c++) { const hx = vx + 2 + c * 2.65 + (r % 2) * 1.32, hy = y + 5 + r * 2.5; if (hx > vx + vw - 1.5) continue; g.moveTo(hx + 0.8, hy); g.arc(hx, hy, 0.8, 0, 6.2832); } g.fill(); }
  else if (px > 8) { g.strokeStyle = '#0a0a0c'; g.lineWidth = 1.1; g.beginPath(); for (let r = 0; r < 5; r++) { g.moveTo(vx + 2, y + 6 + r * 4); g.lineTo(vx + vw - 2, y + 6 + r * 4); } g.stroke(); }
  // asset sticker + barcode, status LED, power button
  g.fillStyle = '#e4e4e7'; rr(bx + 258, y + 4, 36, 9, 1.2); g.fill();
  if (px > 26) { g.font = FM(5.6, 600); g.fillStyle = '#141416'; g.textAlign = 'center'; g.letterSpacing = '0px'; g.fillText('srv-04' + String(slot).padStart(2, '0'), bx + 276, y + 10.9); }
  if (px > 26) { g.fillStyle = '#9b9ba2'; for (let q = 0; q < 26; q++) if (NW_hash(slot * 41 + q) % 3) g.fillRect(bx + 259 + q * 0.8, y + 16, 0.45, 5); }
  const sx = bx + 286, sy = y + 18.5;
  if (status > 0.003) { g.save(); g.shadowColor = 'rgba(37,99,255,0.9)'; g.shadowBlur = Math.min(60, 6 * ZS) * DPR; g.fillStyle = mix('#3a3a40', C.blue, status); g.beginPath(); g.arc(sx, sy, 1.9, 0, 6.2832); g.fill(); g.restore();
    g.fillStyle = `rgba(200,215,255,${0.8 * status})`; g.beginPath(); g.arc(sx - 0.5, sy - 0.5, 0.6, 0, 6.2832); g.fill(); }
  else { g.fillStyle = NW_on(slot * 7 + 3, t, 0.9) ? '#dfe6f5' : '#3a3a40'; g.beginPath(); g.arc(sx, sy, 1.5, 0, 6.2832); g.fill(); }
  g.fillStyle = '#3c3c43'; g.beginPath(); g.arc(bx + 301, y + 14, 4.6, 0, 6.2832); g.fill(); g.fillStyle = '#151518'; g.beginPath(); g.arc(bx + 301, y + 14, 3.6, 0, 6.2832); g.fill();
  if (px > 24) { g.strokeStyle = '#9a9aa2'; g.lineWidth = 0.55; g.lineCap = 'round'; g.beginPath(); g.arc(bx + 301, y + 14.3, 1.8, -1.05, 4.19); g.moveTo(bx + 301, y + 11.6); g.lineTo(bx + 301, y + 13.8); g.stroke(); }
  if (dim > 0.003) { g.fillStyle = `rgba(13,13,15,${dim})`; g.fillRect(x, y, W_, H_); }
  g.restore();
}

// ───────── the hero rack, full detail (frame, rails with cage-nut holes, U numbers) ─────────
function NW_rackFrame(rx, ry, px, { a = 1, shadow = true } = {}) {
  g.save(); g.globalAlpha *= a;
  g.fillStyle = '#0c0c0e'; if (shadow) sh(46, 20, 0.24); rr(rx, ry, NW_RK.w, NW_RK.h, 7); g.fill(); noSh();
  g.fillStyle = '#070708'; g.fillRect(rx + 22, ry + NW_RK.top, NW_RK.w - 44, NW_RK.n * NW_U.p);
  g.fillStyle = '#19191c'; g.fillRect(rx, ry + NW_RK.top, 22, NW_RK.n * NW_U.p); g.fillRect(rx + NW_RK.w - 22, ry + NW_RK.top, 22, NW_RK.n * NW_U.p);
  const tg = g.createLinearGradient(0, ry, 0, ry + NW_RK.top); tg.addColorStop(0, '#2a2a2f'); tg.addColorStop(1, '#141416'); g.fillStyle = tg; rr(rx, ry, NW_RK.w, NW_RK.top, 7); g.fill(); g.fillRect(rx, ry + 10, NW_RK.w, NW_RK.top - 10);
  g.fillStyle = '#121214'; g.fillRect(rx, ry + NW_RK.h - NW_RK.bot, NW_RK.w, NW_RK.bot);
  if (px > 6) {
    g.fillStyle = '#060607'; g.beginPath(); for (let k = 0; k < 14; k++) g.rect(rx + 40 + k * 20, ry + 11, 12, 3); g.fill();
    g.beginPath(); for (let i = 0; i < NW_RK.n; i++) for (const q of [4, 12.5, 21]) { const yy = NW_uy(ry, i) + q; g.rect(rx + 3, yy, 3.4, 3.4); g.rect(rx + NW_RK.w - 6.4, yy, 3.4, 3.4); } g.fill();
  }
  if (px > 34) { g.font = FM(4.4, 500); g.fillStyle = '#66666d'; g.textAlign = 'left'; g.letterSpacing = '0px'; for (let i = 0; i < NW_RK.n; i += 1) g.fillText(String(NW_RK.n - i), rx + 8.5, NW_uy(ry, i) + 9); }
  if (px > 10) { T('rack d-04', rx + 26, ry + NW_RK.h - 15, { f: FM(9, 500), c: '#6e6e75' }); g.fillStyle = '#e8eeff'; g.beginPath(); g.arc(rx + NW_RK.w - 30, ry + NW_RK.h - 19, 2, 0, 6.2832); g.fill(); }
  g.restore();
}
const NW_focus = t => sstep(54.95, 55.4, t) * (1 - sstep(56.5, 56.95, t)) + sstep(58.45, 58.78, t) * (1 - sstep(59.98, 60.12, t));
const NW_kind = i => (i === 0 ? 'switch' : i === 1 ? 'brush' : 'server');

// ───────── a field rack, batched (thousands of units at a glance) ─────────
function NW_rackBatch(R, t, a, px, s = 1, dim = 0) {
  if (a <= 0.01) return;
  g.save(); g.globalAlpha *= a;
  if (s !== 1) { g.translate(R.cx, R.cy); g.scale(s, s); g.translate(-R.cx, -R.cy); }
  g.fillStyle = '#0c0c0e'; sh(46, 20, 0.22); rr(R.x, R.y, NW_RK.w, NW_RK.h, 7); g.fill(); noSh();
  const ux = NW_ux(R.x) + NW_U.ear, ys = i => NW_uy(R.y, i);
  g.fillStyle = '#1d1d21'; g.beginPath(); for (let i = 0; i < NW_RK.n; i++) g.rect(ux, ys(i), NW_U.bw, NW_U.h); g.fill();
  if (px > 3.5) {
    g.fillStyle = 'rgba(255,255,255,0.09)'; g.beginPath(); for (let i = 0; i < NW_RK.n; i++) g.rect(ux, ys(i), NW_U.bw, 1); g.fill();
    g.strokeStyle = '#34343a'; g.lineWidth = Math.max(0.8, 0.9 / CAM.zoom); g.beginPath();
    for (let i = 2; i < NW_RK.n; i++) { const y = ys(i); for (let b = 0; b <= 8; b++) { const bx = ux + 6 + b * 21.5 - 0.75; g.moveTo(bx, y + 3); g.lineTo(bx, y + 25); } } g.stroke();
  }
  g.fillStyle = '#c9c9ce'; g.beginPath(); for (let i = 2; i < NW_RK.n; i++) g.rect(ux + 258, ys(i) + 4, 36, 9); g.fill();
  const lr = Math.max(2.4, 1.3 / CAM.zoom);
  g.fillStyle = '#eef3ff'; g.beginPath();
  for (let i = 0; i < NW_RK.n; i++) { const y = ys(i), id = R.id * 64 + i; if (NW_on(id, t)) g.rect(ux + 14 - lr / 2, y + 6.2 - lr / 2, lr, lr); if (NW_on(id + 5000, t, 0.4)) g.rect(ux + 101 - lr / 2, y + 6.2 - lr / 2, lr, lr); if (NW_on(id + 9000, t, 0.92)) g.rect(ux + 286 - lr / 2, y + 18.5 - lr / 2, lr, lr); }
  g.fill();
  if (dim > 0.003) { g.fillStyle = `rgba(244,242,237,${0.72 * dim})`; rr(R.x - 2, R.y - 2, NW_RK.w + 4, NW_RK.h + 4, 8); g.fill(); }
  g.restore();
}

// ───────── a black fountain pen (side view): posted cap with a steel clip, barrel, ring, section, steel nib ─────────
function NW_pen(cx, cy, L, ang = 0, { op = 1, lift = 0 } = {}) {
  if (op <= 0.003) return;
  const D = L * 0.085, X = f => -L / 2 + f * L;
  g.save(); g.globalAlpha *= op; g.translate(cx, cy); g.rotate(ang);
  const body = () => { g.beginPath(); g.moveTo(X(0.02), -D * 0.52); g.lineTo(X(0.33), -D * 0.52); g.lineTo(X(0.36), -D * 0.47); g.lineTo(X(0.215), -D * 0.47);
    rr(X(0), -D * 0.52, L * 0.36, D * 1.04, D * 0.52); };
  // contact + cast shadow
  g.fillStyle = '#000'; sh(6 + 46 * lift, 3 + 34 * lift, 0.34 - 0.12 * lift); rr(X(0), -D * 0.5, L * 0.86, D, D / 2); g.fill(); noSh();
  const lac = g.createLinearGradient(0, -D / 2, 0, D / 2);
  lac.addColorStop(0, '#45454c'); lac.addColorStop(0.16, '#141417'); lac.addColorStop(0.3, '#6c6c75'); lac.addColorStop(0.4, '#17171a'); lac.addColorStop(0.82, '#050506'); lac.addColorStop(1, '#26262b');
  const steel = g.createLinearGradient(0, -D / 2, 0, D / 2);
  steel.addColorStop(0, '#ffffff'); steel.addColorStop(0.35, '#c4c4cb'); steel.addColorStop(0.55, '#f4f4f6'); steel.addColorStop(1, '#85858e');
  g.fillStyle = lac;
  rr(X(0), -D * 0.52, L * 0.37, D * 1.04, D * 0.52); g.fill();                                   // posted cap
  rr(X(0.34), -D * 0.47, L * 0.24, D * 0.94, D * 0.2); g.fill();                                 // barrel
  g.beginPath(); g.moveTo(X(0.585), -D * 0.42); g.lineTo(X(0.70), -D * 0.33); g.lineTo(X(0.70), D * 0.33); g.lineTo(X(0.585), D * 0.42); g.closePath(); g.fill();   // section
  g.fillStyle = steel; g.fillRect(X(0.345), -D * 0.5, L * 0.022, D); g.fillRect(X(0.575), -D * 0.44, L * 0.013, D * 0.88);   // cap band, section ring
  // nib: steel, slit, breather hole, a little scroll engraving
  g.beginPath(); g.moveTo(X(0.70), -D * 0.36); g.bezierCurveTo(X(0.80), -D * 0.4, X(0.9), -D * 0.2, X(1.0), D * 0.02); g.bezierCurveTo(X(0.9), D * 0.16, X(0.8), D * 0.36, X(0.70), D * 0.36); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(30,30,34,0.85)'; g.lineWidth = Math.max(0.35, D * 0.05); g.beginPath(); g.moveTo(X(0.86), -D * 0.02); g.lineTo(X(0.995), D * 0.02); g.stroke();
  g.fillStyle = '#2a2a30'; g.beginPath(); g.arc(X(0.855), -D * 0.02, D * 0.07, 0, 6.2832); g.fill();
  g.strokeStyle = 'rgba(60,60,66,0.45)'; g.lineWidth = Math.max(0.25, D * 0.025); g.beginPath(); g.arc(X(0.76), 0, D * 0.16, -1.2, 1.2); g.moveTo(X(0.795), -D * 0.24); g.quadraticCurveTo(X(0.81), 0, X(0.795), D * 0.24); g.stroke();
  // clip on the cap: root block, bar, ball end
  g.fillStyle = steel; rr(X(0.035), -D * 0.66, L * 0.05, D * 0.3, D * 0.08); g.fill();
  rr(X(0.06), -D * 0.66, L * 0.25, D * 0.17, D * 0.08); g.fill();
  g.beginPath(); g.arc(X(0.305), -D * 0.5, D * 0.14, 0, 6.2832); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.55)'; g.fillRect(X(0.07), -D * 0.64, L * 0.22, D * 0.04);
  g.strokeStyle = 'rgba(255,255,255,0.32)'; g.lineWidth = Math.max(0.3, D * 0.05); rr(X(0), -D * 0.52, L * 0.585, D * 1.04, D * 0.4); g.stroke();
  g.restore();
}

// ───────── posts (six thumbnails), each tied to its own server ─────────
function NW_thumb(i, x, y, w, h, t) {
  g.save(); rr(x, y, w, h, 10); g.clip();
  const bg = (a, b) => { const gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, a); gr.addColorStop(1, b); g.fillStyle = gr; g.fillRect(x, y, w, h); };
  if (i === 0) { bg('#e3e1db', '#f6f5f1'); g.fillStyle = '#cbc6bb'; g.beginPath(); g.arc(x + w * 0.74, y + h * 0.3, h * 0.11, 0, 6.2832); g.fill();
    g.fillStyle = '#9b988f'; g.beginPath(); g.moveTo(x - 10, y + h); g.lineTo(x + w * 0.28, y + h * 0.36); g.lineTo(x + w * 0.56, y + h); g.fill();
    g.fillStyle = '#2f2f31'; g.beginPath(); g.moveTo(x + w * 0.2, y + h); g.lineTo(x + w * 0.58, y + h * 0.22); g.lineTo(x + w * 1.05, y + h); g.fill();
    g.fillStyle = '#fbfaf7'; g.beginPath(); g.moveTo(x + w * 0.58, y + h * 0.22); g.lineTo(x + w * 0.66, y + h * 0.39); g.lineTo(x + w * 0.61, y + h * 0.36); g.lineTo(x + w * 0.57, y + h * 0.41); g.lineTo(x + w * 0.52, y + h * 0.34); g.closePath(); g.fill(); }
  else if (i === 1) { bg('#efebe4', '#e2dcd2'); g.fillStyle = '#d6d0c5'; g.fillRect(x, y + h * 0.8, w, h * 0.2);
    g.fillStyle = '#f7f6f2'; g.beginPath(); g.ellipse(x + w * 0.5, y + h * 0.82, w * 0.22, h * 0.06, 0, 0, 6.2832); g.fill(); g.strokeStyle = '#b9b3a8'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#fff'; g.strokeStyle = C.ink; g.lineWidth = 2.4; rr(x + w * 0.38, y + h * 0.4, w * 0.24, h * 0.4, 10); g.fill(); g.stroke();
    g.beginPath(); g.arc(x + w * 0.64, y + h * 0.56, h * 0.08, -1.3, 1.3); g.stroke();
    g.strokeStyle = '#9a968e'; g.lineWidth = 2; g.lineCap = 'round'; for (const q of [0.44, 0.5, 0.56]) { g.beginPath(); g.moveTo(x + w * q, y + h * 0.33); g.bezierCurveTo(x + w * (q - 0.03), y + h * 0.26, x + w * (q + 0.03), y + h * 0.2, x + w * q, y + h * 0.12); g.stroke(); } }
  else if (i === 2) { bg('#dcdfe3', '#f2f3f4'); const r = OM.rng(5); let xx = x + 4;
    while (xx < x + w) { const bw = 18 + r() * 26, bh = h * (0.3 + r() * 0.5); g.fillStyle = r() < 0.5 ? '#2a2b2f' : '#3d3e43'; g.fillRect(xx, y + h - bh, bw - 3, bh);
      g.fillStyle = 'rgba(255,255,255,0.55)'; for (let wy = y + h - bh + 6; wy < y + h - 6; wy += 8) for (let wx = xx + 4; wx < xx + bw - 7; wx += 6) if (r() < 0.55) g.fillRect(wx, wy, 2.4, 3.2); xx += bw; } }
  else if (i === 3) { SHARED.saraDrawing(x, y, w, h, t); }
  else if (i === 4) { bg('#f3f4f5', '#e1e4e7'); g.lineCap = 'round';
    for (let q = 0; q < 5; q++) { g.strokeStyle = `rgba(13,13,15,${0.25 + q * 0.14})`; g.lineWidth = 2 + q * 0.4; g.beginPath(); for (let k = 0; k <= 40; k++) { const px = x + k / 40 * w, py = y + h * (0.48 + q * 0.11) + Math.sin(k / 40 * 9 + q * 1.3) * (4 + q); k ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
    g.fillStyle = C.ink; g.beginPath(); g.moveTo(x + w * 0.62, y + h * 0.43); g.lineTo(x + w * 0.62, y + h * 0.16); g.lineTo(x + w * 0.74, y + h * 0.43); g.closePath(); g.fill(); g.fillRect(x + w * 0.58, y + h * 0.44, w * 0.2, 4); }
  else { bg('#f2f0eb', '#e7e3db'); g.fillStyle = '#cfc8bb'; g.beginPath(); g.moveTo(x + w * 0.4, y + h * 0.72); g.lineTo(x + w * 0.6, y + h * 0.72); g.lineTo(x + w * 0.57, y + h); g.lineTo(x + w * 0.43, y + h); g.fill();
    g.strokeStyle = '#3a3a36'; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x + w * 0.5, y + h * 0.72); g.bezierCurveTo(x + w * 0.5, y + h * 0.5, x + w * 0.52, y + h * 0.35, x + w * 0.5, y + h * 0.22); g.stroke();
    g.fillStyle = '#3a3a36'; for (const [dx, dy, a] of [[-0.07, 0.55, -0.6], [0.07, 0.45, 0.6], [-0.06, 0.34, -0.5]]) { g.beginPath(); g.ellipse(x + w * (0.5 + dx), y + h * dy, w * 0.07, h * 0.05, a, 0, 6.2832); g.fill(); }
    g.fillStyle = '#fff'; g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.arc(x + w * 0.5, y + h * 0.18, h * 0.08, 0, 6.2832); g.fill(); g.stroke(); }
  g.restore();
}
const NW_postXY = i => [NW_POST.x, NW_POST.y + i * (NW_POST.h + NW_POST.gap)];
const NW_linkEnds = i => { const [x, y] = NW_postXY(i), sy = NW_uy(NW_RY0, NW_POST_SLOT[i]) + NW_U.h / 2; return [[x + NW_POST.w, y + NW_POST.h / 2], [NW_ux(NW_RX0) + 4, sy]]; };
const NW_linkPt = (i, k) => { const [a, b] = NW_linkEnds(i), dx = b[0] - a[0]; return NW_bez(a, [a[0] + dx * 0.55, a[1]], [b[0] - dx * 0.55, b[1]], b, k); };
function NW_post(i, t, op) {
  const [x, y] = NW_postXY(i), w = NW_POST.w, h = NW_POST.h, sara = i === 3, p = pop(t, NW_K.postIn + i * 0.05);
  const hit = sara ? OM.press(t, NW_K.chipPost, { depth: 0.06 }) : { s: 1 };
  const o = op * p.op; if (o <= 0.003) return;
  g.save(); g.globalAlpha *= o; g.translate(x + w / 2, y + h / 2 + p.dy); g.scale(p.s * hit.s, p.s * hit.s); g.translate(-x - w / 2, -y - h / 2);
  plate(x, y, w, h, 22, { lift: sara ? 1.1 : 0.8 });
  g.fillStyle = '#e1ded6'; g.beginPath(); g.arc(x + 23, y + 21, 10, 0, 6.2832); g.fill(); g.strokeStyle = C.ink; g.lineWidth = 1.6; g.stroke();
  T(NW_HANDLES[i], x + 41, y + 26, { f: FM(12, 600), c: C.ink });
  g.fillStyle = C.mute; for (const q of [0, 5, 10]) { g.beginPath(); g.arc(x + w - 30 + q, y + 21, 1.6, 0, 6.2832); g.fill(); }
  NW_thumb(i, x + 10, y + 38, w - 20, (w - 20) / 1.6, t);
  const fy = y + h - 21, liked = sara ? spring(t - NW_K.chipPost, 0.5, 22) : 0;
  g.save(); g.translate(x + 25, fy); const hs = 1 + (liked > 0 ? 0.35 * Math.max(0, 1 - liked) * Math.sin(liked * 3.1) : 0); g.scale(hs, hs);
  heartPath(0, 0, 21); g.lineWidth = 2; g.strokeStyle = liked > 0.02 ? C.blue : C.ink; g.stroke(); if (liked > 0.02) { g.globalAlpha *= clamp(liked * 2); g.fillStyle = C.blue; g.fill(); } g.restore();
  g.strokeStyle = C.ink; g.lineWidth = 2; g.beginPath(); g.arc(x + 58, fy - 2, 8.5, 0.6, 5.9); g.lineTo(x + 66, fy + 6); g.closePath(); g.stroke();
  g.beginPath(); g.moveTo(x + 80, fy - 9); g.lineTo(x + 97, fy - 9); g.lineTo(x + 88, fy + 8); g.lineTo(x + 87, fy - 2); g.closePath(); g.lineJoin = 'round'; g.stroke();
  g.beginPath(); g.moveTo(x + w - 32, fy - 10); g.lineTo(x + w - 20, fy - 10); g.lineTo(x + w - 20, fy + 9); g.lineTo(x + w - 26, fy + 4); g.lineTo(x + w - 32, fy + 9); g.closePath(); g.stroke();
  g.restore();
}

// ───────── the packet chip: your like travels as your name ─────────
function NW_chip(cx, cy, s, op = 1) {
  if (op <= 0.003 || s <= 0.01) return;
  g.save(); g.globalAlpha *= op; g.translate(cx, cy); g.scale(s, s);
  g.fillStyle = C.blue; sh(26, 12, 0.3); rr(-64, -24, 128, 48, 24); g.fill(); noSh();
  g.fillStyle = 'rgba(255,255,255,0.18)'; rr(-60, -21, 120, 12, 6); g.fill();
  g.fillStyle = '#fff'; heartPath(-30, 2, 24); g.fill();
  T('you', -10, 9, { f: FM(22, 600), c: '#fff' });
  g.restore();
}
function NW_chipPos(t) {
  if (t < NW_K.chipPost) { const k = ease.cubicOut(seg(t, NW_K.chip0, NW_K.chipPost)); const [px, py] = NW_postXY(3), tgt = [px + NW_POST.w / 2, py + NW_POST.h / 2];
    return NW_bez([REG.D.x, 2200], [8250, 2150], [tgt[0] - 380, tgt[1] + 40], tgt, k); }
  const k = ease.expoInOut(seg(t, NW_K.chipPost + 0.02, NW_K.chipPlug)), [px, py] = NW_postXY(3), c = [px + NW_POST.w / 2, py + NW_POST.h / 2], [a, b] = NW_linkEnds(3);
  return k < 0.35 ? [lerp(c[0], a[0], k / 0.35), lerp(c[1], a[1], k / 0.35)] : (() => { const q = (k - 0.35) / 0.65, p = NW_linkPt(3, Math.min(1, q * 1.05)); return [p[0] + Math.max(0, q - 0.9) * 600, p[1]]; })();
}

// ───────── the hero: Sara's server — slides out, takes the pen, opens (tumbles, lid turns to glass), flies into the leader card ─────────
const NW_DEPTH = 510;                                   // server depth (front → back) for the tumble
function NW_heroState(t) {
  const sl = spring(t - NW_K.slide, 0.75, 14);
  const tum = ease.expoInOut(seg(t, NW_K.tum0, NW_K.tum1)) * (1 - ease.cubicInOut(seg(t, NW_K.untum0, NW_K.untum1)));
  const glass = ease.cubicInOut(seg(t, NW_K.gl0, NW_K.gl1)) * (1 - ease.cubicInOut(seg(t, NW_K.shut0, NW_K.shut1)));
  const fk = ease.expoInOut(seg(t, NW_K.fly0, NW_K.fly1));
  const lift = 0.15 * clamp(sl) * (1 - fk);
  const land = OM.ring(t - NW_T.pen, 11, 34) * 2.2;     // the server dips when the pen lands
  const ax = lerp(NW_HX, NW_CANCHOR[0], fk), ay = lerp(NW_HY + NW_U.h / 2, NW_CANCHOR[1], fk) + land - Math.sin(fk * Math.PI) * 220;
  const s = lerp(1 + lift, NW_CS, fk);
  return { ax, ay, s, a: tum * 1.257, glass, fk, sl: clamp(sl), lift };
}
// the steel lid seen from above (lh = its projected depth): frame, brushed top, service map, thumb screws, latch
function NW_lid(lh, sa) {
  const w = NW_U.bw, x0 = -w / 2, V = v => v * sa;
  const lg = g.createLinearGradient(0, 0, 0, lh); lg.addColorStop(0, '#9c9da3'); lg.addColorStop(0.5, '#bfc0c5'); lg.addColorStop(1, '#d4d5d9'); g.fillStyle = lg; g.fillRect(x0, 0, w, lh);
  g.strokeStyle = 'rgba(255,255,255,0.18)'; g.lineWidth = 0.45; g.beginPath(); for (let q = 0; q < 70; q++) { const yy = (q + 0.5) / 70 * lh; g.moveTo(x0 + 4, yy); g.lineTo(x0 + w - 4, yy); } g.stroke();
  g.strokeStyle = '#7f8087'; g.lineWidth = 2.2; g.strokeRect(x0 + 1.1, 1.1, w - 2.2, lh - 2.2);
  g.strokeStyle = 'rgba(255,255,255,0.5)'; g.lineWidth = 0.8; g.beginPath(); g.moveTo(x0 + 3, lh - 3); g.lineTo(x0 + w - 3, lh - 3); g.stroke();
  g.fillStyle = '#f2f2f4'; rr(x0 + 26, V(60), 170, V(190), 4); g.fill(); g.strokeStyle = '#a3a4ab'; g.lineWidth = 0.6; g.stroke();
  T('srv-0423', x0 + 36, V(60) + 16 * Math.max(0.6, sa), { f: FM(9, 600), c: '#2a2a2f' });
  g.strokeStyle = '#8d8e95'; g.lineWidth = 0.7; for (const [a, b, c, d] of [[36, 90, 60, 40], [104, 90, 82, 40], [36, 140, 150, 60], [36, 210, 70, 28], [114, 210, 72, 28]]) { g.strokeRect(x0 + a, V(b), c, V(d)); }
  g.fillStyle = '#c9cacf'; rr(x0 + 214, V(70), 72, V(120), 3); g.fill();
  g.strokeStyle = '#a9aab0'; g.lineWidth = 0.7; g.beginPath(); for (let q = 0; q < 10; q++) { g.moveTo(x0 + 222, V(82 + q * 10)); g.lineTo(x0 + 278, V(82 + q * 10)); } g.stroke();
  for (const [sx, sy] of [[x0 + 14, V(14)], [x0 + w - 14, V(14)]]) { g.fillStyle = '#6f7077'; g.beginPath(); g.ellipse(sx, sy, 6, Math.max(0.5, 6 * sa), 0, 0, 6.2832); g.fill(); g.fillStyle = '#a5a6ac'; g.beginPath(); g.ellipse(sx, sy, 4, Math.max(0.4, 4 * sa), 0, 0, 6.2832); g.fill(); }
  g.fillStyle = '#4b4c52'; rr(-40, lh - V(46), 80, V(22), 5); g.fill(); g.fillStyle = '#26262b'; rr(-34, lh - V(42), 68, V(14), 4); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + w * 0.35, 0); g.lineTo(x0 + w * 0.1, lh); g.lineTo(x0, lh); g.closePath(); g.fill();
}
// interior seen from above through the glass lid: drives, fans, CPUs + RAM, PSUs, and the notebook as a table
function NW_inside(t, sinA) {
  const w = NW_U.bw, x0 = -w / 2;
  g.save(); g.scale(1, sinA);
  g.fillStyle = '#161619'; g.fillRect(x0, 0, w, NW_DEPTH);
  g.strokeStyle = 'rgba(120,120,135,0.16)'; g.lineWidth = 0.5; g.beginPath(); for (let q = 0; q < 26; q++) { const yy = 20 + q * 18; g.moveTo(x0 + 6, yy); g.lineTo(x0 + 40 + (q % 4) * 20, yy); g.lineTo(x0 + 52 + (q % 4) * 20, yy + 8); g.lineTo(x0 + 70, yy + 8); } g.stroke();
  // back: I/O edge, two PSUs, a riser
  g.fillStyle = '#0c0c0e'; g.fillRect(x0, 0, w, 10);
  for (const px of [74, 152]) { g.fillStyle = '#26262b'; rr(x0 + w - px, 14, 70, 112, 3); g.fill(); g.strokeStyle = '#36363d'; g.lineWidth = 0.6; g.beginPath(); for (let q = 0; q < 9; q++) { g.moveTo(x0 + w - px + 8, 30 + q * 10); g.lineTo(x0 + w - px + 62, 30 + q * 10); } g.stroke(); }
  g.fillStyle = '#202025'; rr(x0 + 10, 16, 120, 34, 3); g.fill(); g.fillStyle = '#0e0e10'; for (let q = 0; q < 6; q++) g.fillRect(x0 + 16 + q * 19, 22, 14, 22);
  // CPUs (heatsink fins) and RAM, left and right of the notebook
  for (const sx of [-1, 1]) { const cx = sx * 137; g.fillStyle = '#25252a'; rr(cx - 15, 150, 30, 190, 3); g.fill(); g.strokeStyle = '#3d3d44'; g.lineWidth = 0.5; g.beginPath(); for (let q = 0; q < 60; q++) { g.moveTo(cx - 13, 153 + q * 3.1); g.lineTo(cx + 13, 153 + q * 3.1); } g.stroke(); }
  // fan wall
  for (let f = 0; f < 6; f++) { const cx = x0 + 26 + f * 52, cy = 398, r = 19;
    g.fillStyle = '#101012'; rr(cx - 24, cy - 24, 48, 48, 5); g.fill(); g.fillStyle = '#070708'; g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.fill();
    g.save(); g.translate(cx, cy); g.rotate(t * 2.4 + f); g.strokeStyle = '#3a3a41'; g.lineWidth = 1.6; g.lineCap = 'round'; for (let b = 0; b < 7; b++) { g.rotate(6.2832 / 7); g.beginPath(); g.moveTo(5, 0); g.quadraticCurveTo(12, 5, 17, 2); g.stroke(); } g.restore();
    g.fillStyle = '#2b2b31'; g.beginPath(); g.arc(cx, cy, 5.5, 0, 6.2832); g.fill(); }
  // drive cage (front)
  for (let b = 0; b < 8; b++) { const dx = x0 + 6 + b * 37.6; g.fillStyle = '#222226'; rr(dx, 434, 34, 70, 2.5); g.fill(); g.fillStyle = '#d7d7db'; g.fillRect(dx + 7, 446, 20, 26); g.fillStyle = '#8c8c94'; for (let q = 0; q < 4; q++) g.fillRect(dx + 9, 450 + q * 5, 16 - q * 3, 1.4); g.fillStyle = '#0d0d0f'; g.fillRect(dx + 10, 426, 14, 8); }
  g.restore();
  // the notebook page (drawn upright; the camera leans in on it)
  const py = 148 * sinA, ph = 200 * sinA, pw = 238, px = -pw / 2;
  g.save(); g.fillStyle = '#fbfaf6'; sh(22, 8, 0.45); rr(px, py, pw, ph, 5); g.fill(); noSh();
  g.strokeStyle = '#e2dfd7'; g.lineWidth = 0.7; g.beginPath(); for (let q = 0; q < 7; q++) { const yy = py + 34 * sinA + q * 24 * sinA + 30; if (yy > py + ph - 8) break; g.moveTo(px + 8, yy); g.lineTo(px + pw - 8, yy); } g.stroke();
  g.fillStyle = '#2b2b31'; for (let q = 0; q < 13; q++) { const cx = px + 16 + q * 17.4; g.beginPath(); g.ellipse(cx, py + 1, 2.6, 6, 0, 0, 6.2832); g.fill(); g.fillStyle = '#9a9aa2'; g.fillRect(cx - 0.6, py - 5, 1.2, 4); g.fillStyle = '#2b2b31'; }
  const L = (y) => py + y * sinA, cN = px + 14, cName = px + 50, cPost = px + 112;
  T('likes', cN, L(34), { f: F(16, 600) }); T('sara.draws/123', px + pw - 12, L(34), { f: FM(9, 500), c: C.mute, al: 'right' });
  T('#', cN, L(58), { f: FM(9, 500), c: C.mute }); T('name', cName, L(58), { f: FM(9, 500), c: C.mute }); T('post', cPost, L(58), { f: FM(9, 500), c: C.mute });
  ln(px + 10, L(64), px + pw - 10, L(64), { c: C.ink, w: 0.8, op: 0.5 });
  const rows = [['42', 'you', C.blue], ['43', 'minji', C.ink], ['44', 'leo', C.ink]];
  rows.forEach(([n, who, col], r) => { const y = L(88 + r * 25);
    if (r === 0) { g.fillStyle = 'rgba(37,99,255,0.08)'; rr(px + 8, y - 15, pw - 16, 21, 4); g.fill(); }
    T(n, cN, y, { f: FM(13, 600) }); T(who, cName, y, { f: FM(13, 600), c: col });
    g.fillStyle = r === 0 ? C.blue : C.ink; heartPath(cPost + 5, y - 4.5, 10); g.fill(); T('sara.draws/123', cPost + 14, y, { f: FM(9.6, 500), c: C.ink2 }); });
  T('…', cN, L(168), { f: FM(13, 500), c: C.faint });
  g.restore();
}
function NW_hero(t, S) {
  const a = S.a, ca = Math.cos(a), sa = Math.sin(a), fh = NW_U.h * ca, lh = NW_DEPTH * sa, px = NW_U.h * CAM.zoom * S.s;
  g.save(); g.translate(S.ax, S.ay);
  NW_scaled(S.s, () => {
    // shadow of the whole box
    g.fillStyle = '#000'; sh(14 + 220 * S.lift, 4 + 110 * S.lift, 0.42); rr(-NW_U.bw / 2, -fh - lh, NW_U.bw, fh + lh, 3); g.fill(); noSh();
    if (sa > 0.002) {
      g.save(); g.translate(0, -fh - lh);
      if (S.glass > 0.003) NW_inside(t, sa);
      // the lid: brushed steel, latch, screws, service label; turns to glass
      const lo = 1 - S.glass * 0.94;
      g.save(); g.globalAlpha *= lo; NW_lid(lh, sa); g.restore();
      // glass: a pane with an edge and one soft reflection
      if (S.glass > 0.003) { g.save(); g.globalAlpha *= S.glass; g.strokeStyle = 'rgba(210,210,220,0.9)'; g.lineWidth = 2.2; g.strokeRect(-NW_U.bw / 2 + 1, 1, NW_U.bw - 2, lh - 2);
        const rg = g.createLinearGradient(-NW_U.bw / 2, 0, NW_U.bw / 2, lh); rg.addColorStop(0, 'rgba(255,255,255,0)'); rg.addColorStop(0.18, 'rgba(255,255,255,0.10)'); rg.addColorStop(0.26, 'rgba(255,255,255,0)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(-NW_U.bw / 2, 0, NW_U.bw, lh); g.restore(); }
      g.fillStyle = `rgba(0,0,0,${0.18 * sa})`; g.fillRect(-NW_U.bw / 2, lh - 2, NW_U.bw, 2);
      g.restore();
    }
    g.save(); g.translate(-NW_U.w / 2, -fh); g.scale(1, Math.max(0.02, ca));
    NW_unit(0, 0, NW_HI, t, { status: clamp((t - NW_K.chipPlug) / 0.12), px: px * ca });
    if (sa > 0.01) { g.fillStyle = `rgba(0,0,0,${0.55 * sa})`; g.fillRect(0, 0, NW_U.w, NW_U.h); }
    g.restore();
  });
  g.restore();
}
function NW_penState(t, S) {
  // resting on top of the server (back edge when it is tumbled), in hero-local units → world
  const a = S.a, top = -(NW_U.h * Math.cos(a) + NW_DEPTH * Math.sin(a)), L = 205, D = L * 0.085;
  let lx = 30, ly = top - D / 2, ang = -0.012, sc = 1, lift = 0, op = 1;
  if (t < NW_T.pen) { const k = seg(t, NW_K.pen0, NW_T.pen); ly -= 330 * (1 - k * k); ang = lerp(-0.5, -0.012, ease.cubicOut(k)); sc = lerp(1.75, 1, k * k); lift = 1 - k; op = clamp(k * 5); lx += 60 * (1 - k); }
  ang += 0.05 * OM.ring(t - NW_T.pen, 9, 30); ly -= 4 * Math.abs(OM.ring(t - NW_T.pen, 9, 30));
  let wx = S.ax + lx * S.s, wy = S.ay + ly * S.s, wl = L * S.s * sc, wang = ang;
  // writing 44 on the leader board (in the card), then back onto the server
  if (t > NW_K.penUp && t < NW_K.penBack + 0.3) {
    const tip = NW_writeTip(t), dirA = 2.25, half = wl / 2, cx = tip[0] - Math.cos(dirA) * half, cy = tip[1] - Math.sin(dirA) * half;
    const kin = ease.cubicInOut(seg(t, NW_K.penUp, NW_K.w0)), kout = ease.cubicInOut(seg(t, NW_K.penBack, NW_K.penBack + 0.28)), k = kin * (1 - kout);
    wx = lerp(wx, cx, k); wy = lerp(wy, cy, k) - Math.sin(k * Math.PI) * 30; wang = lerp(wang, dirA, k); lift = Math.max(lift, 0.35 * k);
  }
  return { x: wx, y: wy, L: wl, ang: wang, lift, op };
}

// ───────── the leader card: the hero, its pen and its number ─────────
const NW_NUM = { cx: NW_BOARD.x + NW_BOARD.w / 2, base: NW_BOARD.y + 405, f: FMK(310) };
function NW_writeTip(t) {
  const k = seg(t, NW_K.w0, NW_K.w1), w = tw('44', NW_NUM.f), x0 = NW_NUM.cx - w / 2;
  return [x0 + w * k, NW_NUM.base - 110 + Math.sin(k * 26) * 46 + 30 * Math.cos(k * 11)];
}
function NW_card(t, S) {
  const k = ease.expoOut(seg(t, NW_K.card0, NW_K.card1)); if (k <= 0.003) return;
  const B = OM.morphRect(t, NW_K.card0, NW_K.card1, { x: S.ax - 420, y: S.ay - 120, w: 840, h: 160 }, NW_CARD, { curve: ease.expoOut });
  plate(B.x, B.y, B.w, B.h, 56, { lift: 1.6, op: clamp(k * 1.6) });
  const o = clamp((k - 0.5) * 2); if (o <= 0.003) return;
  const X = NW_CARD.x, Y = NW_CARD.y;
  g.save(); g.globalAlpha *= o;
  g.fillStyle = C.ink; rr(X + 70, Y + 60, 236, 84, 42); g.fill(); T('leader', X + 188, Y + 116, { f: FM(44, 600), c: '#fff', al: 'center' });
  T('srv-0423 · ' + NW_LEADER.n, X + 336, Y + 117, { f: FM(42, 500), c: C.mute });
  g.fillStyle = '#f4f3ef'; rr(NW_BOARD.x, NW_BOARD.y, NW_BOARD.w, NW_BOARD.h, 34); g.fill(); g.lineWidth = 2.4; g.strokeStyle = 'rgba(13,13,15,0.09)'; g.stroke();
  T('likes', NW_NUM.cx, NW_BOARD.y + NW_BOARD.h - 62, { f: F(52, 500), c: C.mute, al: 'center' });
  const out = seg(t, NW_K.w0 - 0.06, NW_K.w0 + 0.14);
  if (out < 1) T('43', NW_NUM.cx, NW_NUM.base - 90 * out, { f: NW_NUM.f, c: C.ink, al: 'center', op: 1 - out });
  if (t > NW_K.w0) writeOn('44', NW_NUM.cx, NW_NUM.base, seg(t, NW_K.w0, NW_K.w1), { f: NW_NUM.f, c: C.ink, al: 'center' });
  g.restore();
}

// ───────── map pieces ─────────
const NW_NODE = (() => { const L = NW_geo(NW_LEADER.lon, NW_LEADER.lat);
  const arcs = NW_CITIES.map(c => { const p = NW_geo(c.lon, c.lat), d = Math.hypot(p[0] - L[0], p[1] - L[1]), mid = [(p[0] + L[0]) / 2, (p[1] + L[1]) / 2 - d * 0.32];
    let len = 0, q = L; for (let i = 1; i <= 40; i++) { const r = NW_qb(L, mid, p, i / 40); len += Math.hypot(r[0] - q[0], r[1] - q[1]); q = r; } return { c, p, mid, len }; });
  const l0 = Math.min(...arcs.map(a => a.len)), l1 = Math.max(...arcs.map(a => a.len));
  arcs.slice().sort((a, b) => a.len - b.len).forEach((a, r) => (a.arr = lerp(NW_K.arr0, NW_K.arr1, 0.75 * r / (arcs.length - 1) + 0.25 * (a.len - l0) / (l1 - l0))));
  return { L, arcs };
})();
function NW_board(cx, cy, flipK, op, i) {
  if (op <= 0.003) return;
  const w = 270, h = 170;
  g.save(); g.globalAlpha *= op;
  plate(cx - w / 2, cy - h / 2, w, h, 26, { lift: 0.75 });
  g.save(); rr(cx - w / 2 + 18, cy - h / 2 + 54, 140, 104, 10); g.clip();
  const f = FM(88, 600), x0 = cx - w / 2 + 24, y0 = cy + h / 2 - 30;
  T('4', x0, y0, { f });
  const dw = tw('4', f), roll = ease.backOut(clamp(flipK)) * 100;
  T('3', x0 + dw, y0 - roll, { f }); T('4', x0 + dw, y0 + 100 - roll, { f });
  g.restore();
  T(NW_CITIES[i].n, cx - w / 2 + 24, cy - h / 2 + 44, { f: FM(32, 500), c: C.mute });
  g.lineWidth = 2.4; g.strokeStyle = C.ink; rr(cx + w / 2 - 104, cy + h / 2 - 74, 84, 44, 22); g.stroke();
  T('copy', cx + w / 2 - 62, cy + h / 2 - 43, { f: FM(26, 600), c: C.ink, al: 'center' });
  g.restore();
}

// ═════════ layers ═════════
// z 11 · the map card (white plate under the dots)
layer(11, 'nw-mapplate', t => {
  if (t < NW_K.morph0 + 0.25 || t > NW_K.end) return;
  const k = ease.expoOut(seg(t, NW_K.morph0 + 0.3, NW_K.morph0 + 0.75));
  const pad = 34, x = NW_MAP.x - pad, y = NW_MAP.y - pad, w = NW_MAP.w + pad * 2, h = NW_MAP.h + pad * 2;
  g.save(); g.translate(x + w / 2, y + h / 2); g.scale(lerp(0.96, 1, k), lerp(0.96, 1, k)); g.translate(-x - w / 2, -y - h / 2); plate(x, y, w, h, 60, { lift: 1.2, op: k }); g.restore();
});
// z 12 · the field of racks (ripples in at "millions"), then every server flows into a dot of the world map
layer(12, 'nw-field', t => {
  if (t < NW_K.ripple - 0.05 || t > NW_K.end) return;
  const px = NW_U.h * CAM.zoom, morphing = t >= NW_K.morph0;
  // racks still standing (each fades as its servers leave)
  for (const R of NW_RACKS) {
    if (R.hero && !morphing) continue;
    if (!onScreen(R.x, R.y, NW_RK.w, NW_RK.h, 60)) continue;
    const kin = R.hero ? 1 : spring(t - (NW_K.ripple + R.d), 0.8, 13); if (kin <= 0.003) continue;
    const rt = NW_K.morph0 + NW_K.morphS * clamp(Math.hypot((R.cx - NW_HX) / 2400, (R.cy - NW_HY) / 3000) / 1.3), gone = morphing ? seg(t, rt - 0.02, rt + 0.14) : 0;
    if (gone >= 1) continue;
    if (!morphing || gone <= 0) { NW_rackBatch(R, t, R.a * clamp(kin * 1.4), px, lerp(0.92, 1, clamp(kin)), NW_focus(t)); continue; }
    g.save(); g.globalAlpha *= R.a * (1 - gone); g.fillStyle = '#0c0c0e'; rr(R.x, R.y, NW_RK.w, NW_RK.h, 7); g.fill(); g.restore();
  }
  if (!morphing) return;
  // flying servers → dots
  const done = NW_K.morph0 + NW_K.morphS + 0.05 + NW_K.morphD;
  if (t < done + 0.02) {
    g.fillStyle = '#121214'; g.beginPath(); let fade = [];
    for (const u of NW_UNITS) {
      if (u.R.a <= 0.12 && !u.tgt) continue;
      const k0 = seg(t, u.t0, u.t0 + NW_K.morphD); if (k0 <= 0 && t < u.t0) { if (u.R.hero || u.R.a > 0.12) { g.rect(u.x + NW_U.ear, u.y, NW_U.bw, NW_U.h); } continue; }
      if (!u.tgt) { fade.push(u); continue; }
      const k = ease.cubicInOut(k0), ks = ease.cubicOut(seg(t, u.t0, u.t0 + NW_K.morphD * 0.7));
      const dx = u.tgt[0] - u.cx, dy = u.tgt[1] - u.cy, sw = 0.12 * Math.sin(k * Math.PI) * ((NW_hash(u.id) & 1) ? 1 : -1);
      const x = u.cx + dx * k - dy * sw, y = u.cy + dy * k + dx * sw, w = lerp(NW_U.bw, NW_DOTR * 2, ks), h = lerp(NW_U.h, NW_DOTR * 2, ks);
      g.rect(x - w / 2, y - h / 2, w, h);
    }
    g.fill();
    if (fade.length) { g.save(); g.fillStyle = '#121214'; g.beginPath(); for (const u of fade) { const k = seg(t, u.t0, u.t0 + 0.25); if (k >= 1) continue; const w = NW_U.bw * (1 - k), h = NW_U.h * (1 - k); g.rect(u.cx - w / 2, u.cy - h / 2, w, h); } g.globalAlpha *= 0.85; g.fill(); g.restore(); }
  }
  // the map once the flow has landed: land dots (incl. the ones no server flew to), faint ocean grid
  const mk = seg(t, done - 0.1, done + 0.05), sea = ease.cubicOut(seg(t, done - 0.3, done + 0.4));
  if (mk > 0) { g.fillStyle = '#121214'; g.beginPath(); for (const p of NW_LAND) { if (!p.used && t < done) continue; g.moveTo(p[0] + NW_DOTR, p[1]); g.arc(p[0], p[1], NW_DOTR, 0, 6.2832); } g.globalAlpha = mk; g.fill(); g.globalAlpha = 1; }
  else { const extra = clamp((t - (done - 0.35)) / 0.3); if (extra > 0) { g.fillStyle = '#121214'; g.beginPath(); for (const p of NW_LAND) { if (p.used) continue; g.moveTo(p[0] + NW_DOTR * extra, p[1]); g.arc(p[0], p[1], NW_DOTR * extra, 0, 6.2832); } g.fill(); } }
  if (sea > 0) { g.fillStyle = `rgba(13,13,15,${0.13 * sea})`; g.beginPath(); const r = NW_CELL * 0.11; for (const p of NW_SEA) g.rect(p[0] - r, p[1] - r, 2 * r, 2 * r); g.fill(); }
});
// z 30 · posts + their links
layer(30, 'nw-posts', t => {
  if (t < NW_K.postIn - 0.05 || t > 55.9) return;
  if (!onScreen(NW_POST.x - 40, NW_POST.y - 40, NW_RX0 - NW_POST.x + 80, 6 * (NW_POST.h + NW_POST.gap) + 80, 100)) return;
  const dimO = 1 - ease.cubicInOut(seg(t, NW_K.dim, NW_K.dim + 0.5)), saraO = 1 - ease.cubicInOut(seg(t, 55.3, 55.8));
  for (let i = 0; i < 6; i++) {
    const op = i === 3 ? saraO : dimO, k = ease.cubicInOut(seg(t, NW_K.linkIn + i * 0.06, NW_K.linkIn + i * 0.06 + 0.34));
    if (k > 0 && op > 0.003) { g.save(); g.globalAlpha *= op; g.strokeStyle = C.ink; g.lineWidth = i === 3 ? 2.6 : 1.7; g.globalAlpha *= i === 3 ? 0.9 : 0.42; g.lineCap = 'round';
      g.beginPath(); for (let q = 0; q <= 32; q++) { const p = NW_linkPt(i, k * q / 32); q ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.stroke(); g.restore();
      const [a] = NW_linkEnds(i); g.save(); g.globalAlpha *= op; g.fillStyle = C.ink; g.beginPath(); g.arc(a[0], a[1], 4, 0, 6.2832); g.fill(); g.restore();
      if (k >= 1) { const [, b] = NW_linkEnds(i), pk = spring(t - (NW_K.linkIn + i * 0.06 + 0.34), 0.5, 24); g.save(); g.globalAlpha *= op; g.strokeStyle = i === 3 ? C.ink : '#fff'; g.lineWidth = 2; g.beginPath(); g.arc(b[0], b[1], 5.5 * pk, 0, 6.2832); g.stroke(); g.restore(); } }
    NW_post(i, t, op);
  }
});
// z 32 · the hero rack (full detail) until its servers leave for the map
layer(32, 'nw-rack', t => {
  if (t < NW_K.rackIn - 0.05 || t >= NW_K.morph0) return;
  if (!onScreen(NW_RX0, NW_RY0, NW_RK.w, NW_RK.h, 80)) return;
  const p = pop(t, NW_K.rackIn, { rise: 40 }), px = NW_U.h * CAM.zoom, morphing = false, gone = 0;
  g.save(); g.globalAlpha *= p.op; g.translate(NW_HX, NW_HY + p.dy); g.scale(p.s, p.s); g.translate(-NW_HX, -NW_HY);
  NW_rackFrame(NW_RX0, NW_RY0, px, { a: 1 - gone });
  if (!morphing) {
    const y0 = OM.unproject(VIEW, 0, 0)[1], y1 = OM.unproject(VIEW, 0, H)[1];
    for (let i = 0; i < NW_RK.n; i++) { if (i === NW_HI) continue; const uy = NW_uy(NW_RY0, i); if (uy > y1 + 40 || uy + NW_U.h < y0 - 40) continue;
      const linked = NW_POST_SLOT.indexOf(i) >= 0 && i !== NW_HI, lk = linked ? spring(t - (NW_K.linkIn + NW_POST_SLOT.indexOf(i) * 0.06 + 0.34), 0.6, 20) * (1 - seg(t, NW_K.dim, NW_K.dim + 0.5)) : 0;
      NW_unit(NW_ux(NW_RX0), uy, i, t, { kind: NW_kind(i), px, dim: 0.0 });
      if (lk > 0.01) { g.save(); g.globalAlpha *= clamp(lk); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.4; g.strokeRect(NW_ux(NW_RX0) + 0.7, uy + 0.7, NW_U.w - 1.4, NW_U.h - 1.4); g.restore(); } }
    const fd = NW_focus(t); if (fd > 0.003) { g.fillStyle = `rgba(244,242,237,${0.72 * fd})`; rr(NW_RX0 - 2, NW_RY0 - 2, NW_RK.w + 4, NW_RK.h + 4, 8); g.fill(); }
  }
  g.restore();
});
// z 36 · hero, pen, label, ring, leader card
layer(36, 'nw-hero', t => {
  if (t < NW_K.rackIn - 0.05 || t > NW_K.end) return;
  const S = NW_heroState(t), p = pop(t, NW_K.rackIn, { rise: 40 });
  // the blue ring that finds it among millions
  const rk = spring(t - NW_K.ring, 0.62, 14) * (1 - ease.cubicInOut(seg(t, NW_K.label - 0.5, NW_K.label - 0.1)));
  if (rk > 0.003 && t < NW_K.label) { g.save(); g.strokeStyle = C.blue; g.lineWidth = 5 / CAM.zoom; const R = 320 * (0.6 + 0.4 * rk);
    g.globalAlpha = clamp(rk); g.beginPath(); g.arc(NW_HX, NW_HY - 20, R, 0, 6.2832); g.stroke();
    for (let q = 0; q < 2; q++) { const ph = ((t - NW_K.ring) * 0.9 + q * 0.5) % 1; g.globalAlpha = clamp(rk) * (1 - ph) * 0.6; g.lineWidth = 3 / CAM.zoom; g.beginPath(); g.arc(NW_HX, NW_HY - 20, R * (1 + ph * 0.9), 0, 6.2832); g.stroke(); }
    g.restore(); }
  NW_card(t, S);
  g.save(); g.globalAlpha *= p.op; g.translate(NW_HX, NW_HY + p.dy); g.scale(p.s, p.s); g.translate(-NW_HX, -NW_HY); NW_hero(t, S); g.restore();
  // "server" label under it
  const lk = pop(t, NW_K.label, { rise: 10 }), lo = lk.op * (1 - seg(t, NW_K.gl1, NW_K.gl1 + 0.12));
  if (lo > 0.003) { const ly = S.ay + 6; g.save(); g.globalAlpha *= lo; g.translate(0, lk.dy * 0.4); ln(NW_HX, ly + 6, NW_HX, ly + 20, { c: C.ink, w: 1.4, op: 0.7 }); T('server', NW_HX, ly + 52, { f: F(27, 500), c: C.ink, al: 'center' }); g.restore(); }
  // the pen
  if (t >= NW_K.pen0) { const P = NW_penState(t, S); NW_pen(P.x, P.y, P.L, P.ang, { op: P.op, lift: P.lift }); }
});
// z 38 · map overlays: leader node, connector, city nodes, copy boards, arcs, pulses, the timeline
layer(38, 'nw-net', t => {
  if (t < NW_K.leader - 0.05 || t > NW_K.end) return;
  const N = NW_NODE, Lp = N.L, lk = spring(t - NW_K.leader, 0.55, 18);
  // connector from the card down to the leader node
  const ck = ease.cubicInOut(seg(t, NW_K.leader + 0.05, NW_K.leader + 0.4));
  if (ck > 0) { const y0 = NW_CARD.y + NW_CARD.h; ln(Lp[0], y0, Lp[0], lerp(y0, Lp[1], ck), { c: C.ink, w: 3, op: 0.55 }); g.fillStyle = C.ink; g.beginPath(); g.arc(Lp[0], y0, 7, 0, 6.2832); g.fill(); }
  // arcs + pulses
  N.arcs.forEach((A, i) => {
    const k = ease.cubicInOut(seg(t, NW_K.arcs + i * 0.04, NW_K.arcs + i * 0.04 + 0.3)); if (k <= 0) return;
    g.save(); g.strokeStyle = C.ink; g.lineWidth = 3; g.globalAlpha = 0.5 * (1 - 0.5 * seg(t, A.arr + 0.2, A.arr + 0.6)); g.lineCap = 'round'; g.beginPath();
    for (let q = 0; q <= 48; q++) { const p = NW_qb(Lp, A.mid, A.p, k * q / 48); q ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]); } g.stroke(); g.restore();
    const pk = seg(t, NW_K.pulse0, A.arr);
    if (pk > 0 && pk < 1) { const e = ease.smooth(pk), p = NW_qb(Lp, A.mid, A.p, e);
      g.save(); g.strokeStyle = C.ink; g.lineCap = 'round'; g.lineWidth = 7; g.globalAlpha = 0.35; g.beginPath(); for (let q = 0; q <= 10; q++) { const r = NW_qb(Lp, A.mid, A.p, Math.max(0, e - 0.12 * (1 - q / 10))); q ? g.lineTo(r[0], r[1]) : g.moveTo(r[0], r[1]); } g.stroke();
      g.globalAlpha = 1; g.fillStyle = C.ink; sh(10, 4, 0.3); g.beginPath(); g.arc(p[0], p[1], 12, 0, 6.2832); g.fill(); noSh(); g.fillStyle = '#fff'; g.beginPath(); g.arc(p[0], p[1], 4.5, 0, 6.2832); g.fill(); g.restore(); }
  });
  // "about 1 s" on the longest arc
  const ck2 = pop(t, NW_K.pulse0 + 0.3, { rise: 10 });      // sits in the open North Atlantic, just under the bundle of arcs
  if (ck2.op > 0.003) { const p = NW_geo(-40, 44); g.save(); g.globalAlpha *= ck2.op; g.translate(p[0], p[1] + ck2.dy); g.scale(ck2.s, ck2.s); g.fillStyle = C.ink; sh(14, 6, 0.22); rr(-104, -30, 208, 60, 30); g.fill(); noSh(); T('about 1 s', 0, 11, { f: FM(30, 600), c: '#fff', al: 'center' }); g.restore(); }
  // city nodes + copy boards
  N.arcs.forEach((A, i) => {
    const nk = spring(t - (NW_K.cities + i * 0.05), 0.55, 18); if (nk <= 0.003) return;
    const hit = t > A.arr ? OM.ring(t - A.arr, 8, 24) : 0, ring = seg(t, A.arr, A.arr + 0.6);
    if (ring > 0 && ring < 1) { g.save(); g.strokeStyle = C.ink; g.globalAlpha = (1 - ring) * 0.6; g.lineWidth = 3; g.beginPath(); g.arc(A.p[0], A.p[1], 14 + ring * 60, 0, 6.2832); g.stroke(); g.restore(); }
    g.save(); g.translate(A.p[0], A.p[1]); g.scale(nk * (1 + hit * 0.25), nk * (1 + hit * 0.25)); g.fillStyle = '#fff'; sh(8, 3, 0.25); g.beginPath(); g.arc(0, 0, 12, 0, 6.2832); g.fill(); noSh(); g.lineWidth = 5; g.strokeStyle = C.ink; g.stroke(); g.restore();
    const bx = A.p[0] + A.c.bo[0], by = A.p[1] + A.c.bo[1], bk = pop(t, NW_K.boards + i * 0.07, { rise: 22 });
    if (bk.op > 0.003) { ln(A.p[0], A.p[1], lerp(A.p[0], bx, 0.85), by + (A.c.bo[1] < 0 ? 85 : 0), { c: C.ink, w: 2, op: 0.45 * bk.op });
      g.save(); g.translate(bx, by + bk.dy); g.scale(bk.s, bk.s); NW_board(0, 0, (t - A.arr) / 0.32, bk.op, i); g.restore(); }
  });
  // leader node: ink dot, ring, tag, a tiny pen
  if (lk > 0.003) { g.save(); g.translate(Lp[0], Lp[1]); g.scale(lk, lk); g.fillStyle = C.ink; sh(10, 4, 0.3); g.beginPath(); g.arc(0, 0, 17, 0, 6.2832); g.fill(); noSh();
    g.strokeStyle = C.ink; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, 28, 0, 6.2832); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 6, 0, 6.2832); g.fill();
    g.fillStyle = C.ink; sh(10, 4, 0.25); rr(-262, -32, 206, 64, 32); g.fill(); noSh(); T('leader', -128, 11, { f: FM(32, 600), c: '#fff', al: 'center' });
    g.save(); g.translate(-222, 0); g.rotate(-0.62); g.fillStyle = '#fff'; rr(-17, -4.5, 24, 9, 4.5); g.fill(); g.beginPath(); g.moveTo(8, -4); g.lineTo(19, 0); g.lineTo(8, 4); g.closePath(); g.fill(); g.restore();
    g.restore(); }
  // the timeline under the map: when each copy hears 44
  const tk = pop(t, NW_K.tl, { rise: 30 });
  if (tk.op > 0.003) {
    const X = NW_TL.x, Y = NW_TL.y, Wt = NW_TL.w, Ht = NW_TL.h, ax0 = X + 120, ax1 = X + Wt - 120, ay = Y + 300, span = 1.5, tz = NW_K.w1;
    g.save(); g.globalAlpha *= tk.op; g.translate(0, tk.dy); plate(X, Y, Wt, Ht, 48, { lift: 1 });
    T('when each copy hears 44', X + 70, Y + 104, { f: F(56, 500), c: C.ink });
    ln(ax0, ay, ax1, ay, { c: C.ink, w: 3, op: 0.25 });
    [[0, '0'], [0.5, '0.5 s'], [1, '1 s'], [1.5, '1.5 s']].forEach(([v, s]) => { const x = lerp(ax0, ax1, v / span); ln(x, ay - 14, x, ay + 14, { c: C.ink, w: 3, op: 0.4 }); T(s, x, ay + 82, { f: FM(42, 500), c: C.mute, al: 'center' }); });
    const ph = clamp((t - tz) / span); if (ph > 0) { const x = lerp(ax0, ax1, ph); ln(ax0, ay, x, ay, { c: C.ink, w: 5 }); ln(x, ay - 40, x, ay + 26, { c: C.ink, w: 2.4, op: 0.8 }); }
    N.arcs.slice().sort((a, b) => a.arr - b.arr).forEach((A, q) => { const dk = spring(t - A.arr, 0.5, 20); if (dk <= 0.003) return; const x = lerp(ax0, ax1, (A.arr - tz) / span);
      g.save(); g.translate(x, ay); g.scale(dk, dk); g.fillStyle = C.ink; g.beginPath(); g.arc(0, 0, 13, 0, 6.2832); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(0, 0, 5, 0, 6.2832); g.fill(); g.restore();
      T(A.c.n, x, ay - (q % 2 ? 104 : 44), { f: FM(36, 600), c: C.ink2, al: 'center', op: clamp(dk) }); });
    g.restore();
  }
});
// z 40 · the packet chip arriving from the phone
layer(40, 'nw-chip', t => {
  if (t < NW_K.chip0 || t > NW_K.chipPlug + 0.25) return;
  const [x, y] = NW_chipPos(t), into = seg(t, NW_K.chipPlug - 0.08, NW_K.chipPlug);
  NW_chip(x, y, lerp(1, 0.25, into), 1 - into);
  const rp = seg(t, NW_K.chipPlug, NW_K.chipPlug + 0.25); if (rp > 0 && rp < 1) { g.save(); g.strokeStyle = C.blue; g.globalAlpha = 1 - rp; g.lineWidth = 3; rr(NW_HX - NW_U.w / 2 - 10 * rp * 6, NW_HY - NW_U.h / 2 - 10 * rp * 3, NW_U.w + 20 * rp * 6, NW_U.h + 20 * rp * 3, 8); g.stroke(); g.restore(); }
});

// ═════════ CAMERA NOTES — copy these keys (world units; [t, x, y, zoom, {fy, curve, hit}]; curve = ease INTO that key) ═════════
// Exact same list as VIEW_REG 'nw-servers' + 'nw-map' below. Hero = Sara's server srv-0423, faceplate centre (9700, 1000).
// R17a  53.40  (your phone key, then)                                            whip from the phone; the chip follows into D
//       53.95  [9410,  878, 0.80,  { fy: 760, curve: expoInOut }]                  posts (left) + rack (right) in the upper frame; links draw 53.80-54.44
//       54.62  [9395,  905, 0.84,  { fy: 760, curve: sineInOut }]                  drift with the blue chip: Sara's post 54.55, plugs into srv-0423 54.80
// R17b  55.30  [9700,  960, 1.95,  { fy: 960, curve: expoInOut }]                  "one computer": push onto srv-0423 (it slides out, rest of rack veils)
//       56.10  [9700,  960, 2.15,  { fy: 960, curve: sineInOut }]                  slow push while the pen falls (55.62 → lands 56.14)
//       56.16  [9700,  960, 2.16,  { fy: 960, curve: sineInOut, hit: 4 }]          the landing
//       56.62  [9700,  960, 2.24,  { fy: 960, curve: sineInOut }]
//       57.75  [9700, 1000, 0.19,  { fy: 900, curve: quintInOut }]                 "millions": pull far back, racks ripple in, blue ring on the hero
//       58.36  [9700, 1000, 0.185, { fy: 900, curve: sineInOut }]                  hold on the wall of racks
//       58.80  [9700,  750, 1.80,  { fy: 680, curve: expoInOut }]                  whip back in; the whole box framed, "server" label 58.86
//       59.20  [9700,  738, 1.86,  { fy: 690, curve: sineInOut }]                  it tips open (58.90-59.18), lid turns to glass (59.06-59.26)
//       59.52  [9700,  722, 3.85,  { curve: expoInOut }]                           into the glass: the notebook as a table (42 you / 43 minji / 44 leo)
//       59.88  [9700,  722, 4.05,  { curve: sineInOut }]                           hold on the table
// R18a  60.30  [9700,  700, 0.26,  { curve: expoInOut }]                           pull out: the field again; servers stream into a world map 60.12-60.90
//       60.88  [9700, 1020, 0.43,  { curve: quintInOut }]                          settle on the stack: leader card / map / (timeline from 62.72)
// R18b  61.30  [9700, 1020, 0.435, { curve: sineInOut }]                           copy boards "43 · copy" pop 61.00-61.35
//       61.72  [9720,  623, 1.55,  { curve: expoInOut }]                           push onto London + Frankfurt ("just hold copies")
//       62.50  [9720,  623, 1.62,  { curve: sineInOut }]
// R19   62.92  [9700, 1020, 0.43,  { curve: expoInOut }]                           whole stack again: pen writes 44 (63.04-63.40), arcs, pulses
//       64.90  [9700, 1020, 0.437, { curve: sineInOut }]                           copies flip 43→44 64.10…64.85; leave for E at 64.9
// Keep zoom ≤ 0.44 on the map stack: the map card is 2368 world wide (edge-to-edge at 0.456).
const NW_X = ease.expoInOut, NW_S = ease.sineInOut, NW_Q = ease.quintInOut;
const NW_KEYS_SERVERS = [
  [53.40, 7900, 1700, 0.55, { fy: 900 }], [53.95, 9410, 878, 0.80, { fy: 760, curve: NW_X }], [54.62, 9395, 905, 0.84, { fy: 760, curve: NW_S }],
  [55.30, NW_HX, NW_HY - 40, 1.95, { fy: 960, curve: NW_X }], [56.10, NW_HX, NW_HY - 40, 2.15, { fy: 960, curve: NW_S }], [56.16, NW_HX, NW_HY - 40, 2.16, { fy: 960, curve: NW_S, hit: 4 }],
  [56.62, NW_HX, NW_HY - 40, 2.24, { fy: 960, curve: NW_S }], [57.75, NW_HX, NW_HY, 0.19, { fy: 900, curve: NW_Q }], [58.36, NW_HX, NW_HY, 0.185, { fy: 900, curve: NW_S }],
  [58.80, NW_HX, NW_HY - 250, 1.8, { fy: 680, curve: NW_X }], [59.20, NW_HX, NW_HY - 262, 1.86, { fy: 690, curve: NW_S }], [59.52, NW_HX, NW_HY - 278, 3.85, { curve: NW_X }], [59.88, NW_HX, NW_HY - 278, 4.05, { curve: NW_S }],
  [60.30, NW_HX, NW_HY - 300, 0.26, { curve: NW_X }], [60.88, NW_HX, NW_HY + 20, 0.43, { curve: NW_Q }],
];
VIEW_REG['nw-servers'] = { keys: NW_KEYS_SERVERS };
VIEW_REG['nw-map'] = { keys: NW_KEYS_SERVERS.filter(k => k[0] >= 59.3).concat([
  [61.30, NW_HX, NW_HY + 20, 0.435, { curve: NW_S }], [61.72, 9720, 623, 1.55, { curve: NW_X }], [62.50, 9720, 623, 1.62, { curve: NW_S }],
  [62.92, NW_HX, NW_HY + 20, 0.43, { curve: NW_X }], [64.90, NW_HX, NW_HY + 20, 0.437, { curve: NW_S }], [65.30, NW_HX, NW_HY + 20, 0.438, { curve: NW_S }],
]) };
VIEW_REG['nw-all'] = { keys: NW_KEYS_SERVERS.concat(VIEW_REG['nw-map'].keys.filter(k => k[0] > 60.9)) };   // the whole 53.4-65.3 run

// ═════════ sound moments ═════════
window.SFX_EVENTS = (window.SFX_EVENTS || []).concat([
  { t: 53.62, kind: 'paper', v: 0.35, note: 'nw: six post cards land' },
  { t: 54.56, kind: 'pop', v: 0.45, note: 'nw: chip hits Sara’s post, heart turns blue' },
  { t: 54.80, kind: 'click', v: 0.55, note: 'nw: chip plugs into srv-0423, blue status light' },
  { t: 55.66, kind: 'whoosh_low', v: 0.4, note: 'nw: pen falls toward the server' },
  { t: NW_T.pen, kind: 'hit', v: 0.75, note: 'nw: pen lands on the server' },
  { t: 56.70, kind: 'whoosh_big', v: 0.6, note: 'nw: pull back to millions of servers' },
  { t: 57.55, kind: 'boom', v: 0.45, note: 'nw: the wall of racks is revealed' },
  { t: 58.40, kind: 'whoosh', v: 0.5, note: 'nw: whip back in to the one server' },
  { t: 58.92, kind: 'click', v: 0.4, note: 'nw: server tips open, lid turns to glass' },
  { t: 59.94, kind: 'whoosh_big', v: 0.55, note: 'nw: pull out, servers stream into the world map' },
  { t: 60.86, kind: 'hit', v: 0.45, note: 'nw: the map lands (world)' },
  { t: 61.05, kind: 'pop', v: 0.3, note: 'nw: copy boards appear' },
  { t: 61.40, kind: 'whoosh', v: 0.4, note: 'nw: push onto London + Frankfurt' },
  { t: 62.55, kind: 'whoosh_low', v: 0.35, note: 'nw: back to the whole map' },
  { t: NW_K.w0, kind: 'pen', v: 0.6, note: 'nw: the leader writes 44' },
  { t: NW_K.pulse0, kind: 'whoosh', v: 0.3, note: 'nw: the new number leaves on every arc' },
  ...NW_NODE.arcs.map(A => ({ t: A.arr, kind: 'tick', v: 0.32, note: 'nw: ' + A.c.n + ' flips 43 → 44' })),
]);
