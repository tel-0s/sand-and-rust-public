// The modular chassis. Six slots; every part is a real tradeoff:
// mass vs speed, power draw vs the core's output, armor vs agility,
// and Rust-grown parts: stronger, but they whisper.
import { Rand, hash2 } from './rng.js';
import { Names } from './grammar.js';

export const SLOTS = ['CORE', 'OPTICS', 'ARMS', 'LEGS', 'PLATING', 'MODULE'];

// ---------- ability definitions (effects implemented in main.js) ----------
export const ABILITIES = {
  dash:      { id: 'dash', name: 'Overdrive Dash', icon: '»', cost: 12, cd: 3,   desc: 'burst of speed in your facing direction' },
  leap:      { id: 'leap', name: 'Pounce Leap', icon: '↟', cost: 14, cd: 4,     desc: 'powerful jump that clears dunes and walls' },
  ram:       { id: 'ram', name: 'Siege Ram', icon: '⊐', cost: 16, cd: 5,        desc: 'charge forward, damaging everything struck' },
  surge:     { id: 'surge', name: 'Ground Surge', icon: '≋', cost: 10, cd: 6,   desc: 'hover boost: brief frictionless glide' },
  crush:     { id: 'crush', name: 'Crushing Blow', icon: '✸', cost: 18, cd: 5,  desc: 'slam the ground; heavy damage in a circle' },
  volley:    { id: 'volley', name: 'Bolt Volley', icon: '⁂', cost: 20, cd: 6,   desc: 'fan of five projectiles' },
  lance:     { id: 'lance', name: 'Thermal Lance', icon: '─', cost: 22, cd: 7,  desc: 'piercing long-range beam shot' },
  whirl:     { id: 'whirl', name: 'Shred Cyclone', icon: '✻', cost: 16, cd: 5,  desc: 'spinning blades hit all adjacent foes' },
  overchg:   { id: 'overchg', name: 'Overcharge', icon: '↯', cost: 0, cd: 18,   desc: 'restore power instantly; brief speed surge' },
  barrier:   { id: 'barrier', name: 'Aegis Field', icon: '◉', cost: 25, cd: 14, desc: 'absorb all damage for a few seconds' },
  mend:      { id: 'mend', name: 'Swarm Mend', icon: '✚', cost: 30, cd: 12,     desc: 'nanites knit your hull back together' },
  ping:      { id: 'ping', name: 'Deep Scan', icon: '◬', cost: 8, cd: 10,       desc: 'pulse that reveals terrain and salvage far around' },
};

// ---------- part catalogue ----------
// stats are at tier 1; tier scales them. powerOut only on cores.
export const PART_DEFS = [
  // CORE — power output vs storage
  { id: 'salvage_cell', slot: 'CORE', name: 'Salvage Cell', mass: 18, hull: 10, powerOut: 16, energyCap: 70, energyRegen: 5, flavor: 'a battery pried from something that used to deliver mail.' },
  { id: 'furnace_core', slot: 'CORE', name: 'Furnace Core', mass: 42, hull: 25, powerOut: 30, energyCap: 80, energyRegen: 9, flavor: 'runs hot. smells like a foundry having a nightmare.' },
  { id: 'capacitor_core', slot: 'CORE', name: 'Capacitor Bank', mass: 30, hull: 15, powerOut: 18, energyCap: 160, energyRegen: 6, flavor: 'deep reserves, slow to refill. patience as architecture.' },
  { id: 'reactor_core', slot: 'CORE', name: 'Meridian Reactor', mass: 36, hull: 20, powerOut: 25, energyCap: 110, energyRegen: 8, ability: 'overchg', flavor: 'pre-collapse fabrication. the dial still reads CITY MAINS.' },

  // OPTICS — perception
  { id: 'basic_sensor', slot: 'OPTICS', name: 'Monocular Rig', mass: 6, hull: 8, powerDraw: 2, scanRadius: 130, flavor: 'one good eye is enough, mostly.' },
  { id: 'wideband', slot: 'OPTICS', name: 'Wideband Array', mass: 12, hull: 10, powerDraw: 6, scanRadius: 260, ability: 'ping', flavor: 'hears the desert breathing in nine frequencies.' },
  { id: 'hunter_optics', slot: 'OPTICS', name: 'Hunter Cluster', mass: 9, hull: 8, powerDraw: 5, scanRadius: 150, dmgMult: 0.18, flavor: 'tracks heat, motion, and intent.' },

  // ARMS — your argument with the world
  { id: 'shredder_claw', slot: 'ARMS', name: 'Shredder Claws', mass: 22, hull: 15, powerDraw: 4, damage: 11, attackRate: 2.4, attackKind: 'melee', range: 3.4, ability: 'whirl', flavor: 'fast, ugly, honest work.' },
  { id: 'breaker_fist', slot: 'ARMS', name: 'Breaker Fists', mass: 38, hull: 25, powerDraw: 6, damage: 26, attackRate: 1.0, attackKind: 'melee', range: 3.8, ability: 'crush', flavor: 'designed for demolition. nothing has been demolished lately. it waits.' },
  { id: 'bolt_caster', slot: 'ARMS', name: 'Bolt Caster', mass: 26, hull: 12, powerDraw: 7, damage: 14, attackRate: 1.6, attackKind: 'ranged', range: 46, projSpeed: 55, ability: 'volley', flavor: 'spits kinetic slugs recycled from yesterday’s enemies.' },
  { id: 'arc_projector', slot: 'ARMS', name: 'Arc Projector', mass: 30, hull: 14, powerDraw: 10, damage: 20, attackRate: 1.1, attackKind: 'ranged', range: 60, projSpeed: 80, ability: 'lance', flavor: 'a surveying laser, re-argued into a weapon.' },

  // LEGS — how you move IS who you are
  { id: 'biped_frame', slot: 'LEGS', name: 'Biped Frame', mass: 30, hull: 20, powerDraw: 4, speed: 10.5, slopeGrip: 0.55, jump: 7.5, ability: 'dash', gait: 'biped', flavor: 'the old shape. the makers’ shape.' },
  { id: 'quad_chassis', slot: 'LEGS', name: 'Quadruped Chassis', mass: 44, hull: 30, powerDraw: 6, speed: 9.0, slopeGrip: 0.95, jump: 8.5, ability: 'leap', gait: 'quad', flavor: 'climbs dunes like rumor climbs a town.' },
  { id: 'tracked_base', slot: 'LEGS', name: 'Tracked Undercarriage', mass: 70, hull: 45, powerDraw: 8, speed: 12.5, slopeGrip: 0.25, jump: 0, ability: 'ram', gait: 'tracked', flavor: 'unstoppable on the flats. arguments with hills go poorly.' },
  { id: 'hover_skirt', slot: 'LEGS', name: 'Hover Skirt', mass: 26, hull: 15, powerDraw: 12, speed: 11.5, slopeGrip: 1.0, jump: 6, ability: 'surge', gait: 'hover', moveDrain: 1.6, flavor: 'ignores the ground’s opinions entirely. drinks power like rain.' },

  // PLATING — armor against mass
  { id: 'scrap_plate', slot: 'PLATING', name: 'Scrap Plating', mass: 25, hull: 30, armor: 8, flavor: 'bolted-on history.' },
  { id: 'ceramic_shell', slot: 'PLATING', name: 'Ceramic Shell', mass: 16, hull: 20, armor: 14, flavor: 'light and cool to the touch, like good pottery.' },
  { id: 'bulwark_plate', slot: 'PLATING', name: 'Bulwark Lamellar', mass: 55, hull: 60, armor: 24, flavor: 'wear a building. become a building.' },

  // MODULE — utility (optional slot)
  { id: 'shield_emitter', slot: 'MODULE', name: 'Aegis Emitter', mass: 14, hull: 5, powerDraw: 8, ability: 'barrier', flavor: 'a bubble of refusal.' },
  { id: 'repair_swarm', slot: 'MODULE', name: 'Nanite Cradle', mass: 12, hull: 5, powerDraw: 6, ability: 'mend', flavor: 'ten thousand tiny opinions about what you should look like.' },
  { id: 'lodestone', slot: 'MODULE', name: 'Lodestone Coil', mass: 8, hull: 5, powerDraw: 3, lootMult: 0.5, flavor: 'pulls salvage toward you across the centuries.' },
];

export const DEF_BY_ID = Object.fromEntries(PART_DEFS.map(d => [d.id, d]));

const TIER_MULT = [1, 1.35, 1.75];
const TIER_NAMES = ['Mk.I', 'Mk.II', 'Mk.III'];
const SCALED = ['hull', 'armor', 'damage', 'powerOut', 'energyCap', 'energyRegen', 'scanRadius', 'speed', 'jump'];
const RUST_BOOST = 1.45;

let uidCounter = 1;
export function setUidCounter(n) { uidCounter = Math.max(uidCounter, n); }
export function getUidCounter() { return uidCounter; }

// Build a concrete part instance from a def + tier + rust state.
export function makePart(defId, tier = 1, rusted = false, seed = 0) {
  const def = DEF_BY_ID[defId];
  const rand = new Rand(hash2(seed || (uidCounter * 2654435761), tier, rusted ? 7 : 3));
  const stats = {};
  for (const k of ['mass', 'hull', 'armor', 'powerOut', 'powerDraw', 'energyCap', 'energyRegen',
    'scanRadius', 'damage', 'attackRate', 'range', 'projSpeed', 'speed', 'slopeGrip', 'jump',
    'dmgMult', 'lootMult', 'moveDrain']) {
    if (def[k] !== undefined) stats[k] = def[k];
  }
  const tm = TIER_MULT[tier - 1] || 1;
  for (const k of SCALED) if (stats[k] !== undefined) stats[k] = Math.round(stats[k] * tm * rand.range(0.92, 1.08) * 10) / 10;
  if (stats.speed) stats.speed = Math.round(def.speed * (1 + (tm - 1) * 0.25) * 100) / 100; // speed scales gently
  let corruptionRate = 0;
  if (rusted) {
    for (const k of ['hull', 'armor', 'damage', 'powerOut', 'energyCap', 'scanRadius']) {
      if (stats[k] !== undefined) stats[k] = Math.round(stats[k] * RUST_BOOST * 10) / 10;
    }
    if (stats.speed) stats.speed = Math.round(stats.speed * 1.15 * 10) / 10;
    corruptionRate = rand.range(0.5, 1.1) * tier;
  }
  const epithet = rusted ? Names.rustEpithet(seed || uidCounter, uidCounter) : Names.partEpithet(seed || uidCounter, uidCounter);
  const name = rusted ? `${def.name} — ${epithet}` : `${epithet} ${def.name}`;
  return {
    uid: 'p' + (uidCounter++),
    defId, slot: def.slot, tier, rusted, name,
    tierName: TIER_NAMES[tier - 1] || 'Mk.?',
    stats, corruptionRate: Math.round(corruptionRate * 100) / 100,
    ability: def.ability || null,
    gait: def.gait || null,
    attackKind: def.attackKind || null,
    flavor: def.flavor,
  };
}

// Random drop generation
export function randomPart(rand, { tierBias = 0, rustChance = 0.15, slot = null } = {}) {
  const pool = PART_DEFS.filter(d => !slot || d.slot === slot);
  const def = rand.pick(pool);
  const tier = Math.min(3, Math.max(1, rand.weighted([[1, 5], [2, 2 + tierBias * 2], [3, 0.4 + tierBias]])));
  const rusted = rand.chance(rustChance);
  return makePart(def.id, tier, rusted, Math.floor(rand.f() * 0xffffffff));
}

// The body you wake up with
export function starterLoadout() {
  return {
    CORE: makePart('salvage_cell', 1, false, 101),
    OPTICS: makePart('basic_sensor', 1, false, 102),
    ARMS: makePart('shredder_claw', 1, false, 103),
    LEGS: makePart('biped_frame', 1, false, 104),
    PLATING: makePart('scrap_plate', 1, false, 105),
    MODULE: null,
  };
}

// ---------- derived chassis stats ----------
export function computeStats(equipped) {
  const s = {
    maxHull: 30, armor: 0, mass: 20, powerOut: 0, powerDraw: 0,
    energyCap: 50, energyRegen: 4, scanRadius: 100,
    damage: 5, attackRate: 1.5, range: 3, attackKind: 'melee', projSpeed: 50,
    speed: 8, slopeGrip: 0.5, jump: 6, gait: 'biped', moveDrain: 0,
    dmgMult: 1, lootMult: 1, corruptionRate: 0, brownout: false,
  };
  for (const slot of SLOTS) {
    const p = equipped[slot];
    if (!p) continue;
    const st = p.stats;
    s.maxHull += st.hull || 0;
    s.armor += st.armor || 0;
    s.mass += st.mass || 0;
    s.powerOut += st.powerOut || 0;
    s.powerDraw += st.powerDraw || 0;
    s.corruptionRate += p.corruptionRate || 0;
    if (slot === 'CORE') { s.energyCap = st.energyCap || s.energyCap; s.energyRegen = st.energyRegen || s.energyRegen; }
    if (slot === 'OPTICS') { s.scanRadius = st.scanRadius || s.scanRadius; if (st.dmgMult) s.dmgMult += st.dmgMult; }
    if (slot === 'ARMS') {
      s.damage = st.damage || s.damage; s.attackRate = st.attackRate || s.attackRate;
      s.range = st.range || s.range; s.attackKind = p.attackKind || 'melee';
      s.projSpeed = st.projSpeed || s.projSpeed;
    }
    if (slot === 'LEGS') {
      s.speed = st.speed || s.speed; s.slopeGrip = st.slopeGrip ?? s.slopeGrip;
      s.jump = st.jump ?? s.jump; s.gait = p.gait || 'biped'; s.moveDrain = st.moveDrain || 0;
    }
    if (slot === 'MODULE' && st.lootMult) s.lootMult += st.lootMult;
  }
  // mass slows you down; the tradeoff at the heart of every build
  const massFactor = Math.min(1.1, Math.max(0.5, 1.18 - s.mass / 420));
  s.speed *= massFactor;
  s.massFactor = massFactor;
  // power brownout: drawing more than the core provides
  if (s.powerDraw > s.powerOut) {
    s.brownout = true;
    s.energyRegen *= 0.35;
    s.speed *= 0.85;
  }
  s.armor = Math.min(60, s.armor);
  s.damage *= s.dmgMult;
  return s;
}

// a better part grants a stronger ability: tier and rust feed its potency
export function abilityPower(p) {
  return 1 + (p.tier - 1) * 0.35 + (p.rusted ? 0.25 : 0);
}

// abilities mapped to hotkeys 1-4 by slot
export function abilityLoadout(equipped) {
  const order = ['ARMS', 'LEGS', 'MODULE', 'CORE'];
  return order.map(slot => {
    const p = equipped[slot];
    if (!p || !p.ability) {
      const op = equipped.OPTICS;
      if (slot === 'MODULE' && (!p || !p.ability) && op && op.ability) {
        return { slot: 'OPTICS', ab: ABILITIES[op.ability], power: abilityPower(op) };
      }
      return { slot, ab: null, power: 1 };
    }
    return { slot, ab: ABILITIES[p.ability], power: abilityPower(p) };
  });
}
