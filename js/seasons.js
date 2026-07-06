// THE SEASONS — the calendar is pure. Every seasonal fact derives from
// (seed, worldT): replay-identical, save-free, argument-proof. Four
// seasons of six world-days each; the year turns in twenty-four.
import { hash2 } from './rng.js';
import { smoothstep } from './noise.js';

export const SEASON_LEN = 6;   // world-days per season
export const SEASONS = [
  {
    id: 'clear', name: 'THE CLEAR', line: 'the trading season — the world exhales',
    stormMul: 0.4, tint: 0xd9b380, tintAmt: 0.0,
  },
  {
    id: 'veil', name: 'THE VEIL', line: 'sandstorm season — the compass swims for days',
    stormMul: 1.7, tint: 0xb08550, tintAmt: 0.35,
  },
  {
    id: 'glasswind', name: 'THE GLASS-WIND', line: 'shard season — shelter is not a suggestion',
    stormMul: 0.9, tint: 0x9fb8a4, tintAmt: 0.28,
  },
  {
    id: 'longcold', name: 'THE LONG COLD', line: 'the lean season — the machines get hungry',
    stormMul: 0.8, tint: 0x8898b8, tintAmt: 0.3,
  },
];

// THE GLASS-WIND: shard storms are pure functions too. Half-day slots
// inside the season; ~30% of slots carry a storm; intensity ramps at the
// edges so you hear it coming — the desert dragging a knife along itself.
export function shardStormAt(seed, worldT) {
  if (seasonAt(seed, worldT).id !== 'glasswind') return 0;
  const slot = Math.floor(worldT * 2);
  if (hash2(seed, 4881, slot) % 100 >= 30) return 0;
  const f = worldT * 2 - slot;
  return smoothstep(0, 0.18, f) * (1 - smoothstep(0.8, 1, f));
}

// is a shard storm due within the next day? (the forecast the keepers read)
export function shardForecast(seed, worldT) {
  for (let t = worldT; t < worldT + 1; t += 0.25) {
    if (shardStormAt(seed, t) > 0.4) return true;
  }
  return false;
}

// each world's year starts somewhere different (the seed sets the phase)
export function seasonAt(seed, worldT) {
  const phase = hash2(seed, 733, 877) % (SEASON_LEN * SEASONS.length);
  const yearT = ((worldT + phase) % (SEASON_LEN * SEASONS.length) + SEASON_LEN * SEASONS.length) % (SEASON_LEN * SEASONS.length);
  const idx = Math.floor(yearT / SEASON_LEN) % SEASONS.length;
  const dayIn = yearT - idx * SEASON_LEN;
  return {
    ...SEASONS[idx], idx,
    dayIn,                                  // 0..SEASON_LEN
    daysLeft: SEASON_LEN - dayIn,           // until the turn
    next: SEASONS[(idx + 1) % SEASONS.length],
  };
}
