// Player-facing calibration: audio buses, video, gameplay. Persisted apart
// from the save, so settings survive new awakenings.

const KEY = 'sar-settings';

export const VIEW_DIST = {
  near: { label: 'NEAR', fog: 320, far: 700, view: 5 },
  standard: { label: 'STANDARD', fog: 420, far: 900, view: 6 },
  far: { label: 'FAR', fog: 560, far: 1150, view: 7 },
};
export const DIFFICULTY = {
  wanderer: { label: 'WANDERER — the desert is patient', dmg: 0.6, spawn: 0.7 },
  survivor: { label: 'SURVIVOR — as intended', dmg: 1, spawn: 1 },
  rusted: { label: 'RUSTED — the desert is hungry', dmg: 1.45, spawn: 1.3 },
};

export const SETTINGS = {
  audio: { master: 0.5, ambient: 0.7, steps: 1, combat: 1, ui: 1, music: 0.5 },
  video: { renderScale: Math.min(devicePixelRatio || 1, 2), viewDist: 'standard', shake: true, pixelAA: true },
  game: { difficulty: 'survivor', dmgNumbers: true },
};

// load + deep-merge saved values over defaults
try {
  const raw = localStorage.getItem(KEY);
  if (raw) {
    const saved = JSON.parse(raw);
    for (const k of ['audio', 'video', 'game']) Object.assign(SETTINGS[k], saved[k] || {});
  }
} catch (e) { /* defaults stand */ }

export function saveSettings() {
  try { localStorage.setItem(KEY, JSON.stringify(SETTINGS)); } catch (e) { /* private mode */ }
}
