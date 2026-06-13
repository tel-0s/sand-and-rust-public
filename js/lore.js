// The testimony engine. Lore here is not flavor — it is evidence: every
// document is grown around real facts the world has committed to. The ruin a
// letter names exists, at that bearing, at that distance. Finding the place a
// dead man wrote about is corroboration, and the map fills in accordingly.
import { Rand, hash2 } from './rng.js';
import { Names } from './grammar.js';

// ---------- small shared helpers ----------
export function bearingWord(dx, dz) {
  const a = ((Math.atan2(dx, -dz) * 180 / Math.PI) + 360) % 360;
  return ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(a / 45) % 8];
}
function distPhrase(d) {
  if (d < 500) return 'a short walk';
  if (d < 1100) return 'an hour’s trek';
  if (d < 1900) return 'half a day’s walk';
  return 'a long haul';
}
const BIOME_DETAIL = {
  dunes: 'the slip-face of the great dune', flats: 'the scrap field',
  salt: 'the white line', glass: 'the fused ground',
  city: 'the sunken street', rustlands: 'the red sand',
};
const MEGA_NOUN = { ring: 'the broken ring', colossus: 'the kneeling giant', dish: 'the listening array', spire: 'the leaning spire' };

// gather the true facts within reach of a position
export function gatherFacts(world, stills, x, z, rand) {
  const megas = world.megasNear(x, z, 2400)
    .map(m => ({ ...m, dist: Math.hypot(m.x - x, m.z - z), dir: bearingWord(m.x - x, m.z - z) }))
    .sort((a, b) => a.dist - b.dist);
  // prefer an undiscovered ruin as the document's subject — testimony should lead somewhere
  const subject = megas.find(m => !world.discoveredKeys.has(m.key)) || megas[0] || null;
  const other = megas.find(m => m !== subject) || null;
  const nearStills = stills ? stills.stillsNear(x, z, 5500)
    .map(s => ({ ...s, dist: Math.hypot(s.x - x, s.z - z) }))
    .sort((a, b) => a.dist - b.dist) : [];
  return {
    region: world.regionName(x, z),
    biome: world.biomeAt(x, z).id,
    subject, other,
    still: nearStills[0] || null,
    person: () => Names.person(world.seed, rand.int(0, 1e6)),
    machine: () => Names.machine(world.seed, rand.int(0, 1e6)),
  };
}

// ---------- the documents ----------
// {ruin} {ruinNoun} {dist} {dir} {ruin2} {still} {person} {person2} {machine}
// {region} {detail} {num} — all filled from gathered facts. `leads: true`
// templates mark their subject ruin on the map when read.
const DOCUMENTS = [
  {
    label: 'SHIFT LOG', weight: 3, leads: true, needsRuin: true,
    bodies: [
      'shift log, {ruin}. coolant feed to the lower galleries failed again. filed the third requisition with the exchange at {still} and got salt and silence back. we seal the doors at dusk now. if the count comes up short, the dark takes a tax.',
      '{ruin}, maintenance rotation {num}. {person} swears the foundation hum changed pitch the night the sky went quiet. i logged it as settling. i no longer believe my own paperwork.',
      'final entry, {ruin}. cut power to the beacons to save the pumps. cut the pumps to save the lights. cut the lights. writing this by feel. {dist} {dir} of here, if anyone is keeping maps honest.',
      'duty log, {ruin}. the foreman sealed the lower galleries and would not say why. we never got the count. the door is still warm, year on year. it is {dist} to the {dir} and i recommend you leave it warm.',
    ],
  },
  {
    label: 'LETTER', weight: 3, leads: true, needsRuin: true,
    bodies: [
      '{person} — if this finds you, we went {dir} from {detail}, toward {ruin}. {person2} would not leave the machines. four days of water if we are careful. the {region} is wider than the maps confess.',
      '{person}, the caravan to {still} never came. {person2} says the road past {ruin} sings at night now, and will not walk it. i am leaving the lamp lit. come home.',
      'unsent: mother — the work at {ruin} pays in cells and silence. the foreman is kind, the machine is not. {dist} {dir} from the drop point, if you ever come. do not come.',
    ],
  },
  {
    label: 'MANIFEST', weight: 2, leads: true, needsRuin: true,
    bodies: [
      'manifest, crawler {machine}: forty cells, twelve coils, one crate sealed and bound for {still}, contents undeclared. driver’s note appended: the road past {ruin} sings after dark. we no longer stop.',
      'outbound from the {ruin} depot: settlement stores, {num} souls’ worth, routed {dir} past {detail}. insurance void in the event of weather, war, or the other thing.',
    ],
  },
  {
    label: 'SURVEY MARKER', weight: 2, leads: true, needsRuin: true,
    bodies: [
      'survey point {num}. {ruin} stands {dist} to the {dir} of this marker. footings sound, galleries flooded, instruments still tracking something above the weather. recommend no one ask what.',
      'cartographic note, hand of {person}: {ruinNoun} on the {dir} horizon is {ruin}, whatever the old maps claim. correct your charts. the desert does not honor clerical errors.',
    ],
  },
  {
    label: 'PRAYER CARD', weight: 1.4, leads: false, needsRuin: false,
    bodies: [
      'hand-lettered: keep the wind off {person}. keep the rust off {person2}. keep the count honest at {still}. amen, or whatever still listens.',
      'scratched into the panel: {person} was here, and then was not, and the difference is a door that should have stayed shut.',
      'votive, folded twice: salt for the door, coil for the lamp, and one good bolt for the road. the {region} keeps what it is given.',
    ],
  },
  {
    label: 'BROADCAST FRAGMENT', weight: 1.6, leads: true, needsRuin: true,
    bodies: [
      '…repeating, this is {person} at {ruin}, the lower doors are holding, tell {still} the lower doors are holding, tell them we are—',
      'carrier transcript: a child’s voice counting backward from one hundred. it never reaches one. bearing {dir}, toward {ruin}. annotation in a different hand: do not follow it. annotation in a third hand: we followed it.',
    ],
  },
  {
    label: 'LEDGER PAGE', weight: 1.4, leads: false, needsRuin: false,
    bodies: [
      '{still} exchange: {num} coils against three days’ water. debt entered under the name {person}, who signed as {person2}. the broker noted the lie and priced it in.',
      'accounts, the {region}: two chassis re-soled, one mind re-seated, one bell un-rung. paid in salt, as everything is, eventually.',
      'water ledger, hand of {person}: in — one storm, grudging. out — everything, always. balance: the desert’s, carried forward.',
    ],
  },
];

export function composeShard(world, stills, x, z, salt) {
  const rand = new Rand(hash2(world.seed, salt, 0xC0FFEE));
  const f = gatherFacts(world, stills, x, z, rand);
  // weighted doc pick; documents that need a ruin step aside when none is near
  const pool = DOCUMENTS.filter(d => !d.needsRuin || f.subject);
  const total = pool.reduce((a, d) => a + d.weight, 0);
  let roll = rand.f() * total, doc = pool[pool.length - 1];
  for (const d of pool) { roll -= d.weight; if (roll <= 0) { doc = d; break; } }

  const p1 = f.person(), p2 = f.person();
  const body = rand.pick(doc.bodies)
    .replaceAll('{ruin}', f.subject ? f.subject.name : 'the old works')
    .replaceAll('{ruinNoun}', f.subject ? (MEGA_NOUN[f.subject.type] || 'the structure') : 'the structure')
    .replaceAll('{ruin2}', f.other ? f.other.name : 'the far works')
    .replaceAll('{dist}', f.subject ? distPhrase(f.subject.dist) : 'some way')
    .replaceAll('{dir}', f.subject ? f.subject.dir : 'east')
    .replaceAll('{still}', f.still ? f.still.name : 'the nearest still')
    .replaceAll('{person}', p1).replaceAll('{person2}', p2)
    .replaceAll('{machine}', f.machine())
    .replaceAll('{region}', f.region.replace(/^the\s+/i, ''))
    .replaceAll('{detail}', BIOME_DETAIL[f.biome] || 'the open ground')
    .replaceAll('{num}', String(rand.int(3, 97)));

  const lead = (doc.leads && f.subject && !world.discoveredKeys.has(f.subject.key))
    ? { key: f.subject.key, name: f.subject.name, kind: f.subject.type, x: f.subject.x, z: f.subject.z }
    : null;
  return { title: doc.label, body, lead, region: f.region };
}

// ---------- grounded signal beacons ----------
const SIGNAL_PERSONAS = [
  'this is {person}, watch officer on the {region} line: depot unsealed, stores released to any receiver. cache lies {dist} to the {dir} of this beacon.{landmark} the watch is ended. spend it well.',
  'automated: crawler {machine} down, cargo intact, {dist} {dir} of the beacon, in the {region}. salvage rights to the finder. the company that insured us no longer exists.',
  'looping, half-strength: …{num} cells and the good coil, cached {dist} {dir}, where the ground breaks…{landmark} tell {person} the route is paid. tell {person} the route is—',
  'clean signal, old cipher: provisioning point {num}, {dist} to the {dir}. left stocked for the next walker by order of {person}, who walked on. the desert keeps the kept.',
];
export function composeSignal(world, stills, beacon, tx, tz) {
  const rand = new Rand(hash2(world.seed, beacon.salt, 0xBEAC0));
  const f = gatherFacts(world, stills, beacon.x, beacon.z, rand);
  const dist = Math.hypot(tx - beacon.x, tz - beacon.z);
  const dir = bearingWord(tx - beacon.x, tz - beacon.z);
  // a true landmark en route, when one exists
  const landmark = f.subject && f.subject.dist < 1600
    ? ` landmark: keep ${f.subject.name} on your ${rand.pick(['left', 'right'])} shoulder.` : '';
  return rand.pick(SIGNAL_PERSONAS)
    .replaceAll('{person}', f.person())
    .replaceAll('{machine}', f.machine())
    .replaceAll('{region}', world.regionName(tx, tz).replace(/^the\s+/i, ''))
    .replaceAll('{dist}', distPhrase(dist))
    .replaceAll('{dir}', dir)
    .replaceAll('{landmark}', landmark)
    .replaceAll('{num}', String(rand.int(3, 97)));
}

// ---------- still histories: every settlement has a past, checkable ----------
const HISTORY_TEMPLATES = [
  'raised {num} years back, when {neighbor} grew crowded and the well here ran sweet.',
  'the founders walked from {neighbor} after a bad season — {num} souls then, fewer now, prouder though.',
  'a raid out of the red sand came in the early years. the wall facing {dir} is newer than the rest. count the patch-stones.',
  'the well went dry once, for {num} days. nobody talks about what was promised to bring it back.',
  '{person} founded the watch here after losing a caravan on the {neighbor} road. the bell was their idea.',
  'the {ruinNoun} on the {dir} horizon — {ruin} — used to light up at night, the elders say. when it stopped, the still threw a festival. nobody remembers why.',
  'they buried a sentinel under the gate-stone for luck. it has worked so far, depending what you count.',
];
export function stillHistory(world, stills, still, count = 2) {
  const rand = new Rand(hash2(world.seed, still.salt, 0x4157));
  const f = gatherFacts(world, stills, still.x, still.z, rand);
  const neighbors = stills.stillsNear(still.x, still.z, 7000).filter(s => s.key !== still.key);
  const neighbor = neighbors.length ? neighbors[rand.int(0, neighbors.length - 1)].name : 'the old country';
  const pool = [...HISTORY_TEMPLATES];
  const out = [];
  for (let i = 0; i < count && pool.length; i++) {
    const idx = rand.int(0, pool.length - 1);
    out.push(pool.splice(idx, 1)[0]
      .replaceAll('{num}', String(rand.int(7, 240)))
      .replaceAll('{neighbor}', neighbor)
      .replaceAll('{person}', f.person())
      .replaceAll('{ruin}', f.subject ? f.subject.name : 'the far works')
      .replaceAll('{ruinNoun}', f.subject ? (MEGA_NOUN[f.subject.type] || 'the structure') : 'the structure')
      .replaceAll('{dir}', f.subject ? f.subject.dir : 'east'));
  }
  return out;
}

// ---------- the memorial: every well keeps its names ----------
const EPITAPHS = [
  'kept the count honest', 'mended what could be mended', 'walked the white line to the end',
  'never lost a caravan until the last one', 'taught the children to read manifests',
  'stood the watch through three storms', 'argued with the desert and nearly won',
  'left the lamp lit', 'paid every debt but one',
];
export function memorialLines(world, still, recentDead) {
  const rand = new Rand(hash2(world.seed, still.salt, 0xDEAD));
  const lines = ['the names are cut into the well-rim, oldest at the bottom:'];
  const n = rand.int(2, 4);
  for (let i = 0; i < n; i++) {
    lines.push(`${Names.person(world.seed, rand.int(0, 1e6))} — ${rand.pick(EPITAPHS)}. year ${rand.int(8, 230)} of the still.`);
  }
  for (const m of recentDead) {
    lines.push(`${m.name} — taken in the raid of day ${m.day}. the cut is still bright.`);
  }
  lines.push(recentDead.length
    ? 'the salt keeps what the sand takes. someone has left a coil beside the new names.'
    : 'the newest cut is old. may it stay that way.');
  return lines;
}

// ---------- the Rust's voice, by depth ----------
export const WHISPERS = {
  low: [ // 25+
    '…your parts miss their siblings…',
    '…polish is a kind of forgetting…',
    '…the iron remembers being ore. do you remember being…',
    '…stop scrubbing what wants to bloom…',
    '…rust is only iron, dreaming…',
    '…the salt lies to you. clean is just lonely…',
  ],
  mid: [ // 50+
    '…we have your designation now. it tastes like a name…',
    '…the seams would open so easily, if you let them…',
    '…why do you walk to the white ground? what did the white ground ever grow…',
    '…your core hums our key. you harmonize in your sleep…',
    '…every machine you break, we catch. we are very gentle. ask them…',
  ],
  high: [ // 75+
    '…come to the red sand. the chorus has saved you a verse…',
    '…you are mostly us now. the remainder is just stubbornness…',
    '…put down the salt. sit. bloom. it does not hurt after the first frost…',
    '…we know where your anchor is. we are not telling anyone. we are being good…',
  ],
};
export function whisper(corruption, rand) {
  const pool = corruption >= 75 ? WHISPERS.high : corruption >= 50 ? WHISPERS.mid : WHISPERS.low;
  return pool[rand.int(0, pool.length - 1)];
}
