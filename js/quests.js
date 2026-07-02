// Quest chains, grown on the blackboard. A giver's temperament seeds a
// motive; design moves place it at real locations, complicate it, and
// price it. Every step is somewhere the world has actually committed to,
// and every chain ends with a person, not a checkbox.
import { Blackboard, DesignMove, runMoves } from './blackboard.js';
import { Names } from './grammar.js';
import { hash2, Rand } from './rng.js';
import { MOTIVE_EXT } from '../data/motives.js';

// ---------- motives, by temperament ----------
const MOTIVES = {
  mercantile: [
    {
      id: 'lost-cargo', verb: 'retrieve',
      nouns: ['sealed manifest', 'bonded strongbox', 'coil shipment', 'ledger core'],
      pitch: 'a crawler went down out there with our {noun} aboard. insurance says lost. i say salvageable. interested?',
      midDesc: 'recover the {noun}',
    },
    {
      id: 'unpaid-debt', verb: 'retrieve',
      nouns: ['debtor’s cache', 'collateral crate', 'escrow box'],
      pitch: 'someone skipped town owing the stalls. word is their {noun} is still where they buried it. bring it back and we’re square — you and me, anyway.',
      midDesc: 'dig up the {noun}',
    },
  ],
  monastic: [
    {
      id: 'tainted-relic', verb: 'retrieve',
      nouns: ['rusted reliquary', 'corrupted shard-case', 'blighted censer'],
      pitch: 'something Rusted was buried where it should never have been. the line weakens around it. bring us the {noun}, and we will see it scoured.',
      midDesc: 'unearth the {noun}',
    },
    {
      id: 'lost-pilgrim', verb: 'retrieve',
      nouns: ['pilgrim’s effects', 'walker’s satchel', 'last offerings'],
      pitch: 'a pilgrim walking the white line stopped reporting. we do not hope. we only ask: find what remains — the {noun} — and carry it home.',
      midDesc: 'recover the {noun}',
    },
  ],
  scavver: [
    {
      id: 'claim-jumper', verb: 'kill',
      nouns: ['claim', 'dig site', 'seam'],
      pitch: 'something big and ugly moved onto our {noun} and it does not pay rent. evict it. violently.',
      midDesc: 'clear the {noun}',
    },
    {
      id: 'big-find', verb: 'retrieve',
      nouns: ['alloy seam sample', 'pre-collapse toolcase', 'intact capacitor rack'],
      pitch: 'we hit something too big to haul and too good to leave. the {noun} is crated and waiting. first one back with it drinks free. metaphorically.',
      midDesc: 'haul back the {noun}',
    },
  ],
  ferrocult: [
    {
      id: 'singing-relic', verb: 'retrieve',
      nouns: ['singing fragment', 'dreaming core', 'chorus-shard'],
      pitch: 'something sings out there. the dream turns toward it in its sleep. bring us the {noun} — and do not listen too closely on the way home.',
      midDesc: 'claim the {noun}',
    },
    {
      id: 'wayward-acolyte', verb: 'retrieve',
      nouns: ['acolyte’s graft-case', 'listener’s recorder', 'votive bundle'],
      pitch: 'one of ours chased the dream too far past the wall. what they carried — the {noun} — matters more than what they became. go.',
      midDesc: 'recover the {noun}',
    },
  ],
};

// ---------- design moves ----------
const moves = [
  new DesignMove('seed-motive', 10,
    (bb) => !bb.has(['motive']),
    (bb, rng, ctx) => {
      const m = rng.pick(MOTIVES[ctx.giver.temperament]);
      bb.assert('motive', m.id, m);
      bb.assert('noun', rng.pick(m.nouns));
    }),

  new DesignMove('place-target', 8,
    (bb) => bb.has(['motive']) && !bb.has(['target']),
    (bb, rng, ctx) => {
      const { still } = ctx.giver;
      // prefer an undiscovered megastructure: quests that teach geography
      const megas = ctx.world.megasNear(still.x, still.z, 2600)
        .filter(m => !ctx.world.discoveredKeys.has(m.key));
      if (megas.length && rng.chance(0.6)) {
        const m = megas[rng.int(0, megas.length - 1)];
        bb.assert('target', m.x + rng.range(-40, 40), m.z + rng.range(-40, 40), `near ${m.name}`);
        bb.assert('target-mega', m.key, m.name, m.type, m.x, m.z);
      } else {
        const a = rng.range(0, Math.PI * 2), d = rng.range(500, 1400);
        const x = still.x + Math.sin(a) * d, z = still.z + Math.cos(a) * d;
        bb.assert('target', x, z, `in ${ctx.world.regionName(x, z)}`);
      }
    }),

  // the complication tier: exactly one of these wins the tie-break,
  // including the option of an honest, uncomplicated job
  new DesignMove('no-complication', 4,
    (bb) => bb.has(['target']) && !bb.has(['complication']),
    (bb) => { bb.assert('complication', 'none'); }),

  new DesignMove('complicate-trail', 4,
    (bb) => bb.has(['target']) && !bb.has(['complication']),
    (bb, rng, ctx) => {
      // a waypoint between giver and target: the trail must be cut first
      const t = bb.queryOne(['target']);
      const { still } = ctx.giver;
      const fx = (still.x + t[1]) / 2 + rng.range(-150, 150);
      const fz = (still.z + t[2]) / 2 + rng.range(-150, 150);
      bb.assert('complication', 'trail');
      bb.assert('waypoint', fx, fz, `a trail-marker in ${ctx.world.regionName(fx, fz)}`);
    }),

  new DesignMove('complicate-guardian', 4,
    (bb) => bb.has(['target']) && !bb.has(['complication']),
    (bb, rng, ctx) => {
      bb.assert('complication', 'guardian');
      bb.assert('guardian', Names.machine(ctx.world.seed, hash2(ctx.world.seed, ctx.salt, 7)));
    }),

  new DesignMove('complicate-handoff', 4,
    (bb, ctx) => bb.has(['target']) && !bb.has(['complication'])
      && bb.queryOne(['motive'])[2].verb === 'retrieve' && !!ctx.neighbor,
    (bb, rng, ctx) => {
      const n = ctx.neighbor;
      bb.assert('complication', 'handoff');
      // resident 0 of the neighbor still — deterministic id & name
      bb.assert('handoff', `npc:${n.key}:0`, Names.person(ctx.world.seed, hash2(ctx.world.seed, n.salt, 0)), n.key, n.name, n.x, n.z);
    }),

  new DesignMove('set-reward', 2,
    (bb) => bb.has(['motive']) && bb.has(['target']) && !bb.has(['reward']),
    (bb, rng) => {
      const hops = 2 + (bb.has(['waypoint']) ? 1 : 0) + (bb.has(['guardian']) ? 1 : 0) + (bb.has(['handoff']) ? 1 : 0);
      bb.assert('reward',
        8 + hops * 5 + rng.int(0, 6),                       // scrap
        rng.pick(['alloy', 'cell', 'coil', 'glass']), rng.int(1, 2), // material
        rng.chance(0.25 + hops * 0.12));                     // part?
    }),
];

// ---------- compile the board into a playable chain ----------
let chainCounter = 1;
export function setChainCounter(n) { chainCounter = Math.max(chainCounter, n); }
export function getChainCounter() { return chainCounter; }

export function generateChain(world, giver, neighborStills) {
  const salt = hash2(world.seed, (giver.id + chainCounter).split('').reduce((a, c) => a + c.charCodeAt(0), 0), chainCounter);
  const rng = new Rand(salt);
  const neighbors = neighborStills.filter(s => s.key !== giver.still.key);
  const ctx = {
    world, giver, salt,
    neighbor: neighbors.length ? neighbors[rng.int(0, neighbors.length - 1)] : null,
  };
  const bb = runMoves(moves, new Blackboard(), rng, ctx);

  const motive = bb.queryOne(['motive'])[2];
  const noun = bb.queryOne(['noun'])[1];
  const target = bb.queryOne(['target']);
  const waypoint = bb.queryOne(['waypoint']);
  const guardian = bb.queryOne(['guardian']);
  const handoff = bb.queryOne(['handoff']);
  const reward = bb.queryOne(['reward']);

  const steps = [];
  if (waypoint) steps.push({
    type: 'goto', x: waypoint[1], z: waypoint[2],
    desc: `follow the trail — ${waypoint[3]}`,
  });
  if (guardian) steps.push({
    type: 'kill', x: target[1], z: target[2], killName: guardian[1],
    desc: `destroy ${guardian[1]}, holding the site ${target[3]}`,
  });
  if (motive.verb === 'kill' && !guardian) {
    const name = Names.machine(world.seed, hash2(world.seed, salt, 11));
    steps.push({
      type: 'kill', x: target[1], z: target[2], killName: name,
      desc: `${motive.midDesc.replace('{noun}', noun)} — destroy ${name} ${target[3]}`,
    });
  } else {
    steps.push({
      type: 'retrieve', x: target[1], z: target[2],
      desc: `${motive.midDesc.replace('{noun}', noun)} ${target[3]}`,
    });
  }
  if (handoff) steps.push({
    type: 'talk', npcId: handoff[1], npcName: handoff[2], x: handoff[5], z: handoff[6],
    desc: `deliver the ${noun} to ${handoff[2]} at ${handoff[4]}`,
  });
  else steps.push({
    type: 'talk', npcId: giver.id, npcName: giver.name, x: giver.still.x, z: giver.still.z,
    desc: `return to ${giver.name} at ${giver.still.name}`,
  });

  return {
    id: 'ch' + (chainCounter++),
    title: 'WORK: ' + noun.toUpperCase(),
    giverId: giver.id, giverName: giver.name,
    stillKey: giver.still.key, stillName: giver.still.name,
    pitch: motive.pitch.replace('{noun}', noun),
    noun,
    steps, current: 0, done: false,
    reward: { scrap: reward[1], matId: reward[2], matN: reward[3], part: reward[4] },
  };
}

// merge data-file motives: more reasons to cross the sand
for (const t of Object.keys(MOTIVE_EXT)) MOTIVES[t].push(...MOTIVE_EXT[t]);
