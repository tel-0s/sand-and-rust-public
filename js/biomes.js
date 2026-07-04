// Biome palette & parameters. Biomes live at points in a 2D "control space"
// (aridity × ruination); every world position gets smooth gaussian weights
// over all biomes, so terrain, colour and spawns blend continuously.

export const BIOMES = [
  {
    id: 'dunes', name: 'Deep Dunes',
    ctrl: [0.75, 0.22],          // [aridity, ruination]
    duneAmp: 14, duneScale: 0.011, detailAmp: 1.2, baseLift: 0,
    colLow: [0.78, 0.58, 0.33], colHigh: [0.92, 0.74, 0.46],
    deco: { rock: 0.06, scrap: 0.04, spire: 0.0, bones: 0.05 },
    wreckDensity: 0.18, shardDensity: 0.05, beaconDensity: 0.05,
    danger: 0.35, enemyKinds: ['scrabbler', 'dervish', 'strider'],
  },
  {
    id: 'flats', name: 'Scrap Flats',
    ctrl: [0.42, 0.5],
    duneAmp: 2.5, duneScale: 0.02, detailAmp: 0.8, baseLift: 0,
    colLow: [0.62, 0.47, 0.3], colHigh: [0.72, 0.58, 0.4],
    deco: { rock: 0.18, scrap: 0.5, spire: 0.0, bones: 0.1 },
    wreckDensity: 0.65, shardDensity: 0.1, beaconDensity: 0.12,
    danger: 0.5, enemyKinds: ['scrabbler', 'dervish', 'sentinel', 'strider'],
  },
  {
    id: 'salt', name: 'Salt Pans',
    ctrl: [0.88, 0.62],
    duneAmp: 0.6, duneScale: 0.03, detailAmp: 0.25, baseLift: -2,
    colLow: [0.82, 0.8, 0.74], colHigh: [0.93, 0.92, 0.88],
    deco: { rock: 0.05, scrap: 0.02, spire: 0.0, bones: 0.16 },
    wreckDensity: 0.1, shardDensity: 0.08, beaconDensity: 0.04,
    danger: 0.15, enemyKinds: ['scrabbler'],
    cleansing: true, // standing here purges Rust corruption
  },
  {
    id: 'glass', name: 'Glass Craters',
    ctrl: [0.55, 0.85],
    duneAmp: 5, duneScale: 0.016, detailAmp: 2.2, baseLift: -1,
    colLow: [0.36, 0.45, 0.42], colHigh: [0.6, 0.74, 0.66],
    deco: { rock: 0.1, scrap: 0.12, spire: 0.3, bones: 0.04 },
    wreckDensity: 0.3, shardDensity: 0.2, beaconDensity: 0.08,
    danger: 0.65, enemyKinds: ['dervish', 'sentinel', 'spindler'],
  },
  {
    id: 'city', name: 'Buried City',
    ctrl: [0.25, 0.78],
    duneAmp: 3.5, duneScale: 0.014, detailAmp: 0.9, baseLift: 1,
    colLow: [0.55, 0.45, 0.32], colHigh: [0.68, 0.58, 0.44],
    deco: { rock: 0.04, scrap: 0.3, spire: 0.0, bones: 0.03 },
    wreckDensity: 0.45, shardDensity: 0.3, beaconDensity: 0.15,
    danger: 0.7, enemyKinds: ['scrabbler', 'dervish', 'sentinel', 'lurcher'],
    city: true,
  },
  {
    id: 'rustlands', name: 'the Rustlands',
    ctrl: [0.18, 0.3],
    duneAmp: 7, duneScale: 0.013, detailAmp: 2.8, baseLift: 0.5,
    colLow: [0.45, 0.2, 0.1], colHigh: [0.66, 0.32, 0.15],
    deco: { rock: 0.12, scrap: 0.2, spire: 0.5, bones: 0.12 },
    wreckDensity: 0.35, shardDensity: 0.12, beaconDensity: 0.05,
    danger: 1.0, enemyKinds: ['rustform', 'dervish', 'sentinel', 'lurcher'],
    corrupting: true, // ambient corruption gain
  },
];

// Gaussian weights over control space — returns Float per biome, normalized.
export function biomeWeights(aridity, ruination, out) {
  let sum = 0;
  for (let i = 0; i < BIOMES.length; i++) {
    const c = BIOMES[i].ctrl;
    const dx = aridity - c[0], dy = ruination - c[1];
    const w = Math.exp(-(dx * dx + dy * dy) * 18);
    out[i] = w; sum += w;
  }
  const inv = 1 / (sum || 1);
  for (let i = 0; i < BIOMES.length; i++) out[i] *= inv;
  return out;
}

export function dominantBiome(weights) {
  let best = 0, bw = -1;
  for (let i = 0; i < weights.length; i++) if (weights[i] > bw) { bw = weights[i]; best = i; }
  return BIOMES[best];
}

// Map colours for the cartography panel
export const MAP_COLORS = {
  dunes: '#b98e54', flats: '#8a7048', salt: '#ded9cc', glass: '#6e8a7c', city: '#8a7458', rustlands: '#9c4422',
};
