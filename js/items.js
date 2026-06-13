// Raw materials, consumables, loot tables, recipes.
import { makePart } from './parts.js';

export const MATERIALS = {
  scrap:   { id: 'scrap', name: 'Scrap Alloy', icon: '▤', desc: 'the desert’s most renewable resource.' },
  coil:    { id: 'coil', name: 'Copper Coil', icon: '◌', desc: 'wound patiently by dead hands or dead machines.' },
  glass:   { id: 'glass', name: 'Fused Glass', icon: '◆', desc: 'sand that saw something terrible.' },
  alloy:   { id: 'alloy', name: 'Ancient Alloy', icon: '▣', desc: 'pre-collapse metallurgy. doesn’t rust. remembers.' },
  nodule:  { id: 'nodule', name: 'Rust Nodule', icon: '❂', desc: 'a pinch of the infection, dormant. probably dormant.' },
  salt:    { id: 'salt', name: 'Salt Crystal', icon: '❄', desc: 'white ground is clean ground.' },
  cell:    { id: 'cell', name: 'Power Cell', icon: '▮', desc: 'a held breath of electricity.' },
};

export const CONSUMABLES = {
  repair_kit:   { id: 'repair_kit', name: 'Repair Kit', icon: '✚', desc: 'patches 45 hull.', use: 'hull', amount: 45 },
  purge_capsule:{ id: 'purge_capsule', name: 'Purge Capsule', icon: '❄', desc: 'salt-wash the Rust: −35 corruption.', use: 'corruption', amount: 35 },
  charge_pack:  { id: 'charge_pack', name: 'Charge Pack', icon: '▮', desc: 'instantly restores 60 power.', use: 'energy', amount: 60 },
};

// recipes: result is either a consumable id or a part-make function
export const RECIPES = [
  { id: 'r_repair', name: 'Repair Kit', icon: '✚', cost: { scrap: 4 }, result: { kind: 'consumable', id: 'repair_kit' }, desc: 'patches 45 hull.' },
  { id: 'r_purge', name: 'Purge Capsule', icon: '❄', cost: { salt: 2, coil: 1 }, result: { kind: 'consumable', id: 'purge_capsule' }, desc: 'cleanse 35 corruption.' },
  { id: 'r_charge', name: 'Charge Pack', icon: '▮', cost: { cell: 1, coil: 1 }, result: { kind: 'consumable', id: 'charge_pack' }, desc: 'restore 60 power.' },
  { id: 'r_caster', name: 'Bolt Caster Mk.I', icon: '➶', cost: { scrap: 6, coil: 3 }, result: { kind: 'part', defId: 'bolt_caster', tier: 1 }, desc: 'ranged arm: kinetic slugs.' },
  { id: 'r_quad', name: 'Quadruped Chassis Mk.I', icon: '⟁', cost: { scrap: 8, alloy: 2 }, result: { kind: 'part', defId: 'quad_chassis', tier: 1 }, desc: 'legs: superb on slopes.' },
  { id: 'r_ceramic', name: 'Ceramic Shell Mk.I', icon: '⛨', cost: { glass: 5, scrap: 3 }, result: { kind: 'part', defId: 'ceramic_shell', tier: 1 }, desc: 'light, cool plating.' },
  { id: 'r_wideband', name: 'Wideband Array Mk.I', icon: '◬', cost: { coil: 4, glass: 3 }, result: { kind: 'part', defId: 'wideband', tier: 1 }, desc: 'optics: deep scanning.' },
  { id: 'r_shield', name: 'Aegis Emitter Mk.I', icon: '◉', cost: { alloy: 3, cell: 2, glass: 2 }, result: { kind: 'part', defId: 'shield_emitter', tier: 1 }, desc: 'module: damage barrier.' },
  { id: 'r_furnace', name: 'Furnace Core Mk.II', icon: '↯', cost: { alloy: 4, cell: 3, scrap: 6 }, result: { kind: 'part', defId: 'furnace_core', tier: 2 }, desc: 'core: serious power output.' },
];

export function canCraft(recipe, mats) {
  for (const [k, n] of Object.entries(recipe.cost)) if ((mats[k] || 0) < n) return false;
  return true;
}
export function craft(recipe, mats) {
  for (const [k, n] of Object.entries(recipe.cost)) mats[k] -= n;
  if (recipe.result.kind === 'consumable') return { kind: 'consumable', id: recipe.result.id };
  return { kind: 'part', part: makePart(recipe.result.defId, recipe.result.tier, false) };
}

// loot rolls -------------------------------------------------------------
export function rollWreckLoot(rand, lootMult = 1) {
  const out = { mats: {}, parts: [] };
  const add = (id, n) => { out.mats[id] = (out.mats[id] || 0) + n; };
  add('scrap', rand.int(2, 5));
  if (rand.chance(0.6 * lootMult)) add('coil', rand.int(1, 3));
  if (rand.chance(0.35 * lootMult)) add('glass', rand.int(1, 2));
  if (rand.chance(0.22 * lootMult)) add('alloy', 1);
  if (rand.chance(0.3 * lootMult)) add('cell', 1);
  if (rand.chance(0.18 * lootMult)) out.parts.push('random'); // resolved by caller
  return out;
}
export function rollCacheLoot(rand, lootMult = 1) {
  const out = { mats: {}, parts: ['random'] };
  const add = (id, n) => { out.mats[id] = (out.mats[id] || 0) + n; };
  add('scrap', rand.int(4, 8));
  add('alloy', rand.int(1, 3));
  add('cell', rand.int(1, 2));
  if (rand.chance(0.5)) add('coil', rand.int(2, 4));
  if (rand.chance(0.4 * lootMult)) out.parts.push('random');
  return out;
}
