// THE TRANSMISSION: the wells all drink the same water, and the water
// remembers being read. Under every living well runs the old upload
// lattice — the same lines that carried you IN, once. Attune a well and
// it learns your signal; from any attuned node you can be read down the
// line and reassembled at another. But you are information, and
// information degrades: the letter rides the line with you, and every
// jump leaves a tithe of corruption in the copy that steps out.
//
// The network is earned well by well (no free map teleport), the tithe
// scales with distance (the roads stay alive), and — later in the arc —
// the lines will start remembering who ELSE you were. (b1: THE ATTUNEMENT)

import { hash2 } from './rng.js';

export const ATTUNE_COST = { scrap: 8, cell: 1 };

// THE FORMER LIFE (b2, the first leak): the lines carried every mind in,
// and a line never wholly forgets a format it has held. Your pre-upload
// designation is a pure function of the world seed — it was always there,
// waiting in the buffers for you to ride again.
const DES_A = ['KV', 'SR', 'TM', 'VA', 'RY', 'OS', 'HN', 'EL'];
export function formerDesignation(seed) {
  const a = DES_A[Math.abs(seed | 0) % DES_A.length];
  const n = 1000 + (Math.abs((seed | 0) * 2654435761 % 2147483647) % 9000);
  return a + '-' + n;
}

// fragments cling to a signal in order: the mystery escalates, ride by ride
export const LEAK_AT = [2, 4, 7]; // txCount thresholds — deterministic, testable
export const FRAGMENTS = [
  {
    title: 'A FRAGMENT IN THE BUFFER',
    line: 'something else steps out of the line with you — not a body, a RECORD, clinging to your carrier wave: «…intake manifest, berth 4407 · {des} · cognition intact · somatic waiver SIGNED…» the well holds it up like a mirror. you do not remember signing anything.',
    body: 'recovered from the reassembly buffer, riding your signal like a burr: «…intake manifest, berth 4407 · {des} · cognition intact · somatic waiver SIGNED — remains to be processed per contract…» the designation is not yours. the line disagrees: it filed the fragment under YOU.',
  },
  {
    title: 'THE LINE REMEMBERS A VOICE',
    line: 'mid-ride, a voice that is not the hum: «shift log, day 112 — {des} asking after the coast again. told them the coast is gone. they signed anyway.» then the well, and the sand, and now.',
    body: 'a second fragment, surfaced mid-transmission: «shift log, day 112 — {des} asking after the coast again. told them the coast is gone. told them everyone they knew would stay dead regardless. they signed anyway.» whoever kept this log wanted it remembered. the line obliged.',
  },
  {
    title: 'THE LAST ENTRY',
    line: 'the line holds you a half-beat too long, as if checking something, and lets a third fragment through: «final boarding — {des} — carried nothing. left no next-of-record. clerk’s note: they seemed relieved.»',
    body: 'the third fragment, and the line released it reluctantly: «final boarding — {des} — carried nothing. left no next-of-record. clerk’s note appended, against regulation: they seemed RELIEVED.» somewhere up the line there is a place where this record was made. the fragments all lean the same direction, like grass in wind.',
  },
];

// the price of being carried: base handshake + degradation per km, capped
// where the line simply refuses to promise fidelity
export function titheFor(dist) {
  return Math.min(28, Math.round(6 + (dist / 1000) * 1.1));
}

// every attuned node reachable from `fromKey`, nearest first
export function reachableNodes(game, fromKey) {
  const out = [];
  for (const key of Object.keys(game.attuned)) {
    if (key === fromKey) continue;
    const still = game.resolveStillByKey(key);
    if (!still) continue;
    if (((game.stillStates[key] || {}).stage || 0) <= -2) continue; // a capped well is a dark node
    const dist = Math.hypot(still.x - game.player.pos.x, still.z - game.player.pos.z);
    // b5 THE CHOICE: the line carries its own — a walker who took the old
    // name back rides at half tithe (floor 3: fidelity is never free)
    const carried = game.formerLife && game.formerLife.choice === 'carried';
    const tithe = carried ? Math.max(3, Math.round(titheFor(dist) * 0.5)) : titheFor(dist);
    out.push({ key, still, dist, tithe });
  }
  return out.sort((a, b) => a.dist - b.dist);
}

// the ride itself: close the panel, degrade, reassemble at the far well
export function transmit(game, key) {
  const node = reachableNodes(game, null).find(n => n.key === key);
  if (!node) return false;
  const g = game, still = node.still;
  g.ui.closePanel(); g.dlg = null;
  g.audio.play('seizure');
  // THE WANT: some company only needed to WATCH you ride, once
  if (g.fulfillWant) g.fulfillWant('ride');
  // THE STATIC: a body walking beside you is NOT information. the line
  // refuses every passenger; the company takes the road together
  if (g.followers.follower) {
    const names = g.followers.list().map(f => f.name);
    const days = Math.max(0.25, node.dist / 22000); // a hard walker's pace
    g.followerWalk = {
      walkers: g.followers.list().map(f => g.followers.serializeOne(f)),
      arriveT: g.worldT + days,
    };
    while (g.followers.follower) g.followers.dismiss();
    const who = names.join(' AND ');
    g.ui.toast(`${who.toUpperCase()} ${names.length > 1 ? 'TAKE' : 'TAKES'} THE ROAD — a body cannot ride the line`, 'good');
    g.journal.push({
      type: 'lore', cat: 'event', title: `${who.toUpperCase()} WALK${names.length > 1 ? '' : 'S'}`,
      body: `the well refused them — 'a body is not information,' it said, in the way wells say things. ${names.join(' and ')} shrugged, checked their plating, and took the road after you. expect them in about ${days < 0.5 ? 'half a day' : Math.round(days) + ' day' + (Math.round(days) === 1 ? '' : 's')}.`,
    });
  }
  // the copy steps out a few strides from the far well, facing it
  const a = (Math.random() * Math.PI * 2);
  g.player.pos.x = still.x + Math.sin(a) * 7;
  g.player.pos.z = still.z + Math.cos(a) * 7;
  g.player.pos.y = g.world.getHeight(g.player.pos.x, g.player.pos.z) + (g.player.baseY || 0) + 0.1;
  g.player.vel.set(0, 0, 0);
  g.player.corruption = Math.min(100, g.player.corruption + node.tithe);
  g.shakeT = Math.max(g.shakeT, 0.45);
  // the static: the yard sees you step out of the well, humming
  g.txCount = (g.txCount || 0) + 1;
  g._staticT = 9;
  g._lastTx = { key, t: g.worldT };
  g.ui.txStatic && g.ui.txStatic();
  g.ui.toast(`REASSEMBLED AT ${still.name.toUpperCase()} — the line kept ${node.tithe} of you`, 'rust');
  // MEMORY LEAK: the line files old records under your signal, in order
  const li = LEAK_AT.indexOf(g.txCount);
  if (li >= 0 && (g.txLeaks || 0) <= li) {
    const des = formerDesignation(g.seed);
    const fr = FRAGMENTS[li];
    g.txLeaks = li + 1;
    g.ui.toast('THE LINE REMEMBERS SOMETHING — a fragment clings to your signal', 'rust');
    g.journal.push({
      type: 'lore', cat: 'memory', title: fr.title,
      body: fr.body.replaceAll('{des}', des),
    });
    trailCheck(g);
  }
  if (!g._firstTransmit) {
    g._firstTransmit = true;
    g.journal.push({
      type: 'lore', cat: 'event', title: 'THE FIRST RIDE',
      body: `you let the well at one end of the desert read you, and stepped out of another. the distance did not pass — YOU did, as signal, down lines older than any road. the copy that arrived carries ${node.tithe} more of the letter than the one that left. this is how you came here the first time, before you were you. the wells remember the format.`,
    });
  }
  // no deed record, no story: the desert doesn't see the wire — only the
  // arrival, which the yards notice all on their own
  return true;
}

// ---------- b3 THE FORMER LIFE: the evidence system ----------
// six pieces of a person, scattered where evidence lives: three leaks in
// the line (b2), a name cut deep in one well-rim, one living soul who
// remembers the gait, and a cross-reference in the buried paper.

// the still where the name was cut: seeded among the settled country
// near the world's root — findable, walkable, always the same
export function rimStillFor(game) {
  const near = game.stills.stillsNear(0, 0, 14000)
    .sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  if (!near.length) return null;
  return near[hash2(game.seed, 8111, 17) % Math.min(near.length, 6)];
}

// which soul at the rim still hauled water beside the former life
export function elderIndexFor(game, rosterLen) {
  return rosterLen ? hash2(game.seed, 8117, 3) % rosterLen : 0;
}

// does this buried document carry a cross-reference to the record?
export function docCarriesRecord(seed, salt) {
  return hash2(seed, salt | 0, 909) % 100 < 18;
}

export function formerPieces(game) {
  const fl = game.formerLife || {};
  return (game.txLeaks || 0) + (fl.doc ? 1 : 0) + (fl.rim ? 1 : 0) + (fl.soul ? 1 : 0);
}

// at five of six, the pieces hold each other up: the trail leans (b4's door)
export function trailCheck(game) {
  const g = game;
  if (!g.formerLife || g.formerLife.trail || formerPieces(g) < 5) return;
  g.formerLife.trail = true;
  const des = formerDesignation(g.seed);
  g.audio.play('bell');
  g.ui.toast('THE FRAGMENTS LEAN THE SAME WAY — the trail of the former life', 'good');
  g.journal.push({
    type: 'lore', cat: 'memory', title: 'THE TRAIL LEANS',
    body: `enough of ${des} has surfaced now that the pieces hold each other up, and they all lean the same direction — up the oldest line, toward wherever the record was MADE. a berth number. a clerk's hand. a coast that is gone. the lattice knows the way to its own root, and something down there still answers to the name. (the source can be sought when the way opens.)`,
  });
}

// ---------- b4 THE SOURCE: where the record was made ----------
// the lattice has a root: the intake site of the third evacuation series,
// buried under one far megastructure — seeded, walkable, and a true
// pilgrimage (14–32 km out). The reading antennas were always the doors.
export function sourceMegaFor(game) {
  if (game._sourceMega !== undefined) return game._sourceMega;
  const list = game.world.megasNear(0, 0, 32000)
    .filter(m => Math.hypot(m.x, m.z) > 13000)
    .sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
  const dishes = list.filter(m => m.type === 'dish');
  const pool = dishes.length ? dishes : list;
  game._sourceMega = pool.length ? pool[hash2(game.seed, 8123, 29) % pool.length] : null;
  return game._sourceMega;
}

// the walking companion catches up on world-time, not render-time
export function followerTick(game) {
  const g = game, w = g.followerWalk;
  if (!w || g.worldT < w.arriveT) return;
  g.followerWalk = null;
  const walkers = w.walkers || (w.data ? [w.data] : []); // old saves carried one
  const names = [];
  for (const data of walkers) {
    if (!g.followers.hasRoom(true)) continue; // recruited meanwhile: the road keeps its own
    g.followers.restore(data, g.player.pos);
    names.push(data.name);
  }
  if (!names.length) return;
  g.audio.play('chime');
  g.ui.toast(`${names.join(' AND ').toUpperCase()} ${names.length > 1 ? 'FIND' : 'FINDS'} YOU — dusty, and unimpressed with the shortcut`, 'good');
}
