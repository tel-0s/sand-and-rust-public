// localStorage persistence. The desert forgets nothing; neither do we.
import { setUidCounter, getUidCounter } from './parts.js';
import { getChainCounter } from './quests.js';

// three slots; slot 1 keeps the legacy key so old saves appear in it
const PREFIX = 'sand-and-rust-save';
export const SLOTS_N = 3;
const keyFor = (slot) => (slot && slot > 1) ? `${PREFIX}-${slot}` : PREFIX;

export function hasSave(slot = 1) { return !!localStorage.getItem(keyFor(slot)); }
export function clearSave(slot = 1) { localStorage.removeItem(keyFor(slot)); }

export function listSaves() {
  const out = [];
  for (let s = 1; s <= SLOTS_N; s++) {
    try {
      const raw = localStorage.getItem(keyFor(s));
      if (!raw) { out.push({ slot: s, exists: false }); continue; }
      const d = JSON.parse(raw);
      out.push({
        slot: s, exists: true,
        seedPhrase: d.seedPhrase,
        day: 1 + Math.floor(d.worldT ?? d.dayT ?? 0),
        kills: d.kills || 0,
      });
    } catch (e) { out.push({ slot: s, exists: false }); }
  }
  return out;
}

export function saveGame(g) {
  try {
    const data = {
      v: 1,
      seed: g.seed,
      seedPhrase: g.seedPhrase,
      uid: getUidCounter(),
      dayT: g.dayT,
      worldT: g.worldT,
      // inside a hollow place, save the spot outside the door — the halls are
      // regrown on entry, not persisted
      player: (() => {
        const inside = g.interiors && g.interiors.active;
        const pp = inside ? g.interiors.active.outsidePos : g.player.pos;
        return { x: pp.x, y: pp.y, z: pp.z, hull: g.player.hull, energy: g.player.energy, corruption: g.player.corruption };
      })(),
      anchor: g.anchor,
      equipped: g.equipped,
      inventory: g.inventory,
      journal: g.journal,
      quests: g.quests,
      waypoint: g.waypoint,
      npcDisp: g.npcDisp,
      stillRep: g.stillRep,
      events: g.events,
      chains: g.chains,
      chainCounter: getChainCounter(),
      respawnPt: g.respawnPt,
      gossipCount: g.gossipCount,
      megaAnchors: g.megaAnchors,
      directoryUsed: g.directoryUsed,
      recruitedIds: g.recruitedIds,
      background: g.background,
      v: 2, // save-format epoch: future migrations branch on this
      tracked: g.tracked,
      topics: g.topics,
      epic: g.epic,
      nameOverrides: g.nameOverrides,
      routesCut: g.routesCut,
      stillStates: g.stillStates,
      foundedStills: g.foundedStills,
      deadNpcIds: g.deadNpcIds,
      destroyedNests: g.destroyedNests,
      histories: g.histories,
      memorials: g.memorials,
      fundedTurrets: g.fundedTurrets,
      revived: g.revived,
      follower: g.followers ? g.followers.serialize() : null,
      looted: [...g.world.looted],
      discovered: g.world.discovered,
      explored: [...g.world.explored.entries()],
      kills: g.kills,
    };
    localStorage.setItem(keyFor(g.slot || 1), JSON.stringify(data));
    return true;
  } catch (e) {
    console.warn('save failed', e);
    return false;
  }
}

export function loadGame(slot = 1) {
  try {
    const raw = localStorage.getItem(keyFor(slot));
    if (!raw) return null;
    const data = JSON.parse(raw);
    setUidCounter((data.uid || 1) + 1);
    return data;
  } catch (e) {
    console.warn('load failed', e);
    return null;
  }
}
