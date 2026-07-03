// Dialogue & disposition. Lines are grown from temperament-keyed grammars over
// a small blackboard of true facts; rumors point at places that really exist.
import { Rand } from './rng.js';
import {
  GREET_EXT, SMALLTALK_EXT, OPINION_EXT, ROAD_EXT, WELL_EXT, EVENT_EXT,
  QUIRK_ADDRESS_EXT, QUIRK_TAG_EXT, ORIGIN_EXT,
} from '../data/voices.js';

export const TEMPERAMENTS = {
  mercantile: {
    label: 'Mercantile', color: '#e8a33d',
    sellMult: 1.45, buyMult: 0.7, partsBuyer: true,
    stock: ['repair_kit', 'charge_pack'],
    corruptionBias: -0.12, rustBias: -6,
    creed: 'everything is worth something to someone still breathing.',
  },
  monastic: {
    label: 'Salt-Monastic', color: '#ded9cc',
    sellMult: 1.15, buyMult: 0.6, partsBuyer: false,
    stock: ['purge_capsule', 'repair_kit'],
    corruptionBias: -0.45, rustBias: -14,
    creed: 'white ground is clean ground. we keep the line.',
  },
  scavver: {
    label: 'Scavver', color: '#9a8a64',
    sellMult: 1.25, buyMult: 0.85, partsBuyer: true,
    stock: ['repair_kit'],
    corruptionBias: -0.05, rustBias: 2,
    creed: 'the desert buries; we unbury. simple work.',
  },
  ferrocult: {
    label: 'Ferro-Cultist', color: '#ff6a3c',
    sellMult: 1.3, buyMult: 0.75, partsBuyer: true,
    stock: ['charge_pack'],
    corruptionBias: 0.35, rustBias: 12,
    creed: 'rust is only iron, dreaming. we listen to the dream.',
  },
};

export const MAT_VALUES = { coil: 3, glass: 2, alloy: 6, cell: 5, nodule: 4, salt: 2 };
export const CONSUMABLE_VALUES = { repair_kit: 6, purge_capsule: 7, charge_pack: 6 };

// effective disposition = seeded base + earned (persisted) + live stance toward
// what you ARE right now: corruption and Rust-grown parts swing it hard.
export function effDisposition(npc, earned, corruption, rustedCount) {
  const t = TEMPERAMENTS[npc.temperament];
  let d = npc.baseDisp + earned;
  d += t.corruptionBias * corruption * 0.4;
  d += t.rustBias * Math.min(3, rustedCount) * 0.5;
  return Math.max(-60, Math.min(90, d));
}

export function dispTier(d) {
  if (d < -25) return { label: 'HOSTILE', cls: 'hostile' };
  if (d < 0) return { label: 'WARY', cls: 'wary' };
  if (d < 20) return { label: 'NEUTRAL', cls: 'neutral' };
  if (d < 50) return { label: 'WARM', cls: 'warm' };
  return { label: 'KIN', cls: 'kin' };
}

export function buyPrice(value, temperament, effD) {
  return Math.max(1, Math.ceil(value * TEMPERAMENTS[temperament].sellMult * (1 - effD / 400)));
}
export function sellPrice(value, temperament, effD) {
  return Math.max(1, Math.floor(value * TEMPERAMENTS[temperament].buyMult * (1 + effD / 400)));
}
export function partPrice(part, temperament) {
  let v = 2 + part.tier * 3;
  if (part.rusted) v += temperament === 'ferrocult' ? 5 : 1;
  return v;
}

// ---------- voice: every resident speaks a little differently ----------
export const QUIRK_ADDRESS = ['wanderer', 'sparrow', 'new-boots', 'friend-shape', 'walker', 'tin-pilgrim', 'salt-cousin', 'stranger-mine'];
export const QUIRK_TAG = ['so it goes.', 'as the salt keeps us.', 'mind the wind.', 'hm.', 'the well hears.', '—but what do i know.', 'rust willing.', 'count your bolts.'];
export function decorate(text, npc, rand) {
  if (!npc || !npc.quirk) return text;
  let t = text.replace(/\bwanderer\b/g, npc.quirk.address);
  if (rand.chance(npc.quirk.tagChance || 0.3)) t += ' ' + npc.quirk.tag;
  return t;
}

// ---------- line generation ----------
const GREET = {
  hostile: {
    mercantile: ['we’re closed. to you.', 'your custom is not wanted here, wanderer.', 'i price risk for a living, wanderer, and you are all margin and no market.'],
    monastic: ['you carry the Rust like a lit torch. stand away from the well.', 'the line is white and you are not. keep your distance.', 'we sweep after your kind passes. twice.'],
    scavver: ['walk on. we dig our own trouble.', 'whatever you’re selling, it’s already cost someone.', 'i’ve sorted scarier things than you out of a collapsed cab. don’t test the claim.'],
    ferrocult: ['you polish what should bloom. the chorus has no verse for you.', 'come back when you have let something grow.', 'the dream flinches when you pass. take the hint it is too polite to give.'],
  },
  wary: {
    mercantile: ['browse if you must. touch nothing twice.', 'scrap up front, stranger.', 'new faces pay old prices. that’s not unkindness, it’s bookkeeping.'],
    monastic: ['mind the salt line, wanderer. it minds you.', 'speak softly. the well is older than your warranty.', 'you may rest. the line will tell us the rest.'],
    scavver: ['huh. still got both arms. lucky or careful?', 'don’t kick the piles. everything’s sorted. roughly.', 'we count the crates when strangers visit. nothing personal. everything practical.'],
    ferrocult: ['the iron in you is very… quiet. a pity.', 'you may listen, but you have not yet heard.', 'sit where we can see your seams, wanderer.'],
  },
  neutral: {
    mercantile: ['salvage for scrap, scrap for goods. simplest arithmetic in the waste.', 'welcome to the stalls. prices are honest-ish.', 'good light for trading, wanderer. bad light for everything else, so trade.'],
    monastic: ['peace upon your chassis. the salt keeps us; it can keep you a while.', 'rest. the feral ones do not cross white ground.', 'drink, sit, mend. the desert will still be there. it always is.'],
    scavver: ['pull up a crate. mind the sharp ones.', 'you look like you’ve seen some digging. respect.', 'boots off the sorted piles and we’ll get along fine.'],
    ferrocult: ['ah. a walking argument between polish and bloom. sit.', 'the dream turns in its sleep tonight. you may stay.', 'welcome, wanderer. everything here is exactly as alive as it needs to be.'],
  },
  warm: {
    mercantile: ['my favorite kind of customer — alive and solvent!', 'good wind brings you back. the good shelf is open to you.', 'ha! the road didn’t keep you. come in, the ledger smiled when it saw you.'],
    monastic: ['the well remembers your shadow kindly, wanderer.', 'sit by the salt. you are counted among the kept.', 'your name comes up at the sweeping, and nobody frowns. that is high praise here.'],
    scavver: ['hey! the dunes didn’t eat you. drinks are metaphorical but offered.', 'found anything good? course you did. tell me everything.', 'make room, make room — the good crate for the good wanderer.'],
    ferrocult: ['the chorus hums when you approach. it likes you. probably.', 'you walk the seam between. it is beautiful to watch.', 'the dream asked after you. we said you were out walking. it seemed satisfied.'],
  },
  kin: {
    mercantile: ['family discount. and i don’t say family lightly. or often. or twice.', 'for you? cost. don’t tell the desert.', 'sit. eat something. the stall runs itself when you’re here, somehow.'],
    monastic: ['brother-of-the-line. the well is yours as it is ours.', 'when the storms come, there is a roof here with your designation on it.', 'the abbot says you are proof the desert sends as well as takes.'],
    scavver: ['the crew’s crew! sit, sit. best crate. the one with cushions.', 'whatever you need, it’s half-buried somewhere and i know where.', 'we tell stories about you when the digging’s slow. mostly true ones.'],
    ferrocult: ['the dream speaks your designation now, you know. softly. fondly.', 'kin of the bloom. ask, and it is given.', 'when the chorus lists what it loves, you are in the quiet verses.'],
  },
};

// smalltalk: each temperament has a generic pool, plus fact-grounded lines
// that only surface when the world supplies the fact (a real ruin, night, storm)
const SMALLTALK = {
  mercantile: {
    base: [
      'caravan’s late. caravan’s always late. one day the desert will be late instead.',
      'a sentinel walked the ridge three nights back. didn’t stop. they never buy anything.',
      'salt’s the only currency that keeps. scrap rusts. trust rusts faster.',
      'heard the {region} is whispering again. carrier waves. bad for business. good for salvage.',
      'i sold a hover skirt to a quad-leg purist last week. the desert makes converts of everyone eventually.',
      'a ledger balances or it doesn’t. people are the same, just slower to total.',
    ],
    mega: [
      'see {megaName}, out {megaDir} of here? dead as last year’s ledgers. but the road past it runs fast and flat, and i price for that.',
      'a buyer once offered me the whole of {megaName}, deed and all. i asked who he’d stolen it from. he said history. fair, i suppose.',
    ],
    night: ['night market’s just me and the lamp. everything’s ten percent quieter, nothing’s ten percent cheaper.'],
    storm: ['storm tax is real, before you ask. wind gets into the crates, the crates get into my margins.'],
  },
  monastic: {
    base: [
      'we sweep the line at dawn and dusk. the Rust tests it like a tide.',
      'a pilgrim came through with forty percent corruption. we scrubbed what we could. they sing in their sleep now.',
      'the well is four hundred years old. it has never once asked anything of us.',
      'beneath the {region}, the old pipes still carry brine. the desert remembers plumbing.',
      'the abbot says despair is just rust on the mind. we scrub one like the other: patiently, with salt.',
      'we keep no relics here. the well is enough. anything older is just a sharper way to miss the world.',
    ],
    mega: [
      '{megaName} broods on the {megaDir} horizon. we swept it once, years back. the salt would not stay. some ground refuses to be clean.',
      'pilgrims ask if {megaName} is holy. we tell them it is heavy. out here that is nearly the same thing.',
    ],
    night: ['the line glows faintly at night, if your optics are honest. the salt working. or praying. we’ve stopped distinguishing.'],
    storm: ['a storm is the desert sweeping its own line. we shelter and do not take it personally.'],
  },
  scavver: {
    base: [
      'dug up a crawler cab yesterday. seats still warm. don’t think about it too hard.',
      'rule one: never salvage at night. rule two: the good stuff only surfaces at night. rules fight.',
      'my cousin swapped to tracked legs. can’t climb a dune now. won’t admit it. we tow him.',
      'the {region}’s been generous lately. that usually means it wants something back.',
      'found a music box last dig. no music in it. we wound it anyway and stood around. you do strange things out here.',
      'every dig has a bottom. the trick is knowing it before the dig does.',
    ],
    mega: [
      'we stripped the skin off {megaName} years back — it’s {megaDir} of here. bones are still good if you’re brave and roped.',
      'the seam under {megaName} ran three weeks of alloy before it pinched out. best three weeks of my life, and i’ve had a wedding.',
    ],
    night: ['hear that? nothing. that’s wrong. the desert’s loudest right before it isn’t.'],
    storm: ['storms move the dunes, dunes uncover the goods. tomorrow’s the best digging day of the season. today is for walls.'],
  },
  ferrocult: {
    base: [
      'we do not worship the Rust. we negotiate with it. there is a difference. usually.',
      'a rustform circled the walls last moon. it was not hunting. it was homesick.',
      'your parts dream when you sleep. the rusted ones dream louder.',
      'under the {region} the dream runs close to the surface. walk soft there.',
      'the unbelievers ask why we live by the salt, of all things. fences make good neighbors. even fences you love.',
      'a listener once heard her own voice in the chorus, three years before she joined it. we do not talk about causality here.',
    ],
    mega: [
      '{megaName} sings flat lately — {megaDir} of here, you can’t miss it. when the big ones sing flat, the dream rolls over. mind the wake.',
      'we sent an acolyte to listen at {megaName}. she came back with a new word for amber and no memory of tuesday. a fair trade, she insists.',
    ],
    night: ['the chorus is clearest at night. not louder. clearer. like the day was the static all along.'],
    storm: ['the storm and the dream do not speak, but they nod to each other. watch the red sand when the wind drops.'],
  },
};

// every still keeps a landmark, and everyone has an opinion about it
const LANDMARK_TALK = [
  'you\u2019ve seen {landmark}? older than the walls. older than the well, some say, but not where the well can hear.',
  'we tell time by {landmark}\u2019s shadow, weather by its sound, and luck by whether the new arrivals ask about it. you just asked.',
  'someone offered to haul {landmark} away for scrap once. the whole still came out to watch them leave. empty-handed.',
  'children dare each other to touch {landmark} at midnight. so do some of the adults. nobody says why.',
  '{landmark} was here when the founders came. it will be here after. we are the temporary ones, and it is polite enough not to mention it.',
];

const RUMOR_LEAD = [
  'word for word, as i heard it:',
  'you didn’t hear this from me:',
  'the dunes tell on themselves. listen:',
  'cost me a coil to learn this, so value it:',
];
const DIST_PHRASE = [
  [500, 'a short walk'], [1100, 'an hour’s trek'], [1900, 'half a day’s walk'], [9999999, 'a long haul'],
];

function bearingWord(dx, dz) {
  const a = ((Math.atan2(dx, -dz) * 180 / Math.PI) + 360) % 360;
  const words = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  return words[Math.round(a / 45) % 8];
}
const MEGA_NOUN = { ring: 'a shattered orbital ring', colossus: 'a fallen colossus', dish: 'a listening array', spire: 'a broken spire' };

export function greeting(npc, tierCls, rand) {
  const pool = GREET[tierCls === 'hostile' ? 'hostile' : tierCls][npc.temperament] || GREET.neutral[npc.temperament];
  return decorate(rand.pick(pool), npc, rand);
}
// ctx: { region, mega: {name, dir} | null, isNight, storm }
export function smalltalk(npc, rand, ctx) {
  const t = SMALLTALK[npc.temperament];
  const pool = [...t.base];
  if (ctx.mega) pool.push(...t.mega, ...t.mega); // grounded lines surface often
  if (ctx.isNight) pool.push(...t.night);
  if (ctx.storm > 0.25) pool.push(...t.storm, ...t.storm);
  if (ctx.landmark) pool.push(...LANDMARK_TALK);
  const bare = (ctx.region || '').replace(/^the\s+/i, '');
  let line = rand.pick(pool).replaceAll('{region}', bare);
  if (ctx.mega) line = line.replaceAll('{megaName}', ctx.mega.name).replaceAll('{megaDir}', ctx.mega.dir);
  if (ctx.landmark) line = line.replaceAll('{landmark}', ctx.landmark);
  return decorate(line, npc, rand);
}
export function rumorText(npc, mega, from, rand) {
  const dx = mega.x - from.x, dz = mega.z - from.z;
  const dist = Math.hypot(dx, dz);
  const phrase = DIST_PHRASE.find(([d]) => dist < d)[1];
  return `${rand.pick(RUMOR_LEAD)} ${MEGA_NOUN[mega.type] || 'something vast'} they call ${mega.name} stands ${phrase} to the ${bearingWord(dx, dz)}. i’ve marked your chart.`;
}
export function noRumor(rand) {
  return rand.pick([
    'the desert’s keeping its secrets this week. come back after a storm.',
    'nothing new under the sun, and the sun checks thoroughly.',
    'i’ve told you everything i know. that’s rarer than alloy, so treasure it.',
  ]);
}
const ORIGIN_REASONS = ['the east wall failed', 'the water turned', 'the dream got loud', 'the work dried up', 'the road stopped being safe', 'the old crew scattered'];
export function aboutSelf(npc, rand) {
  const t = TEMPERAMENTS[npc.temperament];
  // half the time, a life: they came from a real neighboring still, for a reason
  if (npc.origin && rand.chance(0.5)) {
    return decorate(rand.pick([
      `came up from ${npc.origin} after ${rand.pick(ORIGIN_REASONS)}. been ${npc.role} here since. ${t.creed}`,
      `i was born at ${npc.origin}, if born is the word for it. when ${rand.pick(ORIGIN_REASONS)}, i walked. this well took me in.`,
      `ask anyone at ${npc.origin} about me — actually, don’t. ${t.creed}`,
    ]), npc, rand);
  }
  return decorate(rand.pick([
    `${t.creed}`,
    `i’ve been ${npc.role} here since before your last reboot, i’d wager. ${t.creed}`,
    `the still keeps us and we keep it. as for me — ${t.creed}`,
  ]), npc, rand);
}

// ---------- gossip: opinions of co-residents ----------
const RESIDENT_OPINION = [
  '{name}? sorts bolts by smell. i’ve stopped asking questions.',
  '{name} talks to the well at night. the well has not complained.',
  'don’t play tiles against {name}. counts cards with both processors.',
  '{name} saved my chassis in a storm once. i pretend i’ve forgotten so they keep reminding me.',
  'between us — {name} polishes their plating twice a day. vanity survives anything.',
  '{name} hums old grid-frequencies while working. some of us hum along.',
  '{name} keeps a dead radio tuned to a dead station. says the silence has a good schedule.',
  'i owe {name} three coils and an apology. they’ll get the coils.',
  '{name} names the storms. last one was “gerald.” we survived gerald.',
  'when the wall needed mending, {name} worked through two nights. never mentioned it once. so i mention it.',
  '{name} claims to remember the rain. nobody argues. you don’t argue with a face like that.',
  'there’s a bet running about what {name} keeps in the locked crate. my money’s on nothing. the lock is the point.',
];
export function residentGossip(npc, otherName, rand) {
  return decorate(rand.pick(RESIDENT_OPINION).replace('{name}', otherName), npc, rand);
}

// ---------- gossip: word of the neighbors (reveals real Stills) ----------
const NEIGHBOR_GOSSIP = {
  mercantile: [
    'we run salt and coil to {name}, {dist} to the {dir}. {flavor} good customers. terrible hagglers.',
    'there’s a market at {name}, {dist} {dir} of here. {flavor} tell them i sent you; they’ll charge you extra out of spite.',
  ],
  monastic: [
    'our sister-well stands at {name}, {dist} to the {dir}. {flavor} the line holds there too.',
    'pilgrims pass between us and {name}, {dist} {dir}ward. {flavor} walk the white and you cannot be lost.',
  ],
  scavver: [
    'the diggers at {name} — {dist} {dir} — hit an alloy seam last season. {flavor} still smug about it.',
    'if you’re hauling, {name} is {dist} to the {dir}. {flavor} they’ll buy anything that doesn’t bite.',
  ],
  ferrocult: [
    'the dream is louder at {name}, {dist} to the {dir}. {flavor} the unbelievers there tolerate us. barely.',
    'we hear singing from {name}, {dist} {dir} of here. {flavor} no one else hears it. that is fine.',
  ],
};
const NEIGHBOR_FLAVOR = {
  mercantile: 'merchant folk.', monastic: 'salt-keepers.', scavver: 'digger folk.', ferrocult: 'listeners, like us — or unlike us.',
};
export function neighborGossip(npc, neighbor, from, rand) {
  const dx = neighbor.x - from.x, dz = neighbor.z - from.z;
  const dist = Math.hypot(dx, dz);
  const phrase = DIST_PHRASE.find(([d]) => dist < d)[1];
  return rand.pick(NEIGHBOR_GOSSIP[npc.temperament])
    .replace('{name}', neighbor.name)
    .replace('{dist}', phrase)
    .replaceAll('{dir}', bearingWord(dx, dz))
    .replace('{flavor}', NEIGHBOR_FLAVOR[neighbor.temperament]);
}
// ---------- the market speaks (scarcity is a mood everyone shares) ----------
export const MARKET_TALK = {
  starved: [
    'the roads are cut and the shelves show it. everything costs what it costs — don’t glare at me, glare at the desert.',
    'no bells for days. what’s in the yard is what there is, and the prices know it.',
  ],
  lean: [
    'the roads have run thin lately. prices lean the wrong way, and lean is the polite word.',
    'fewer bells than we’d like this season. hold your scrap or spend it dear.',
  ],
  flush: [
    'the bells keep coming through — the good shelf is actually good for once. buy while it lasts.',
    'caravans all week. prices soft as dune-sand. treat yourself, wanderer.',
  ],
};

// ---------- the road's own talk (wanderers mix these in) ----------
export const ROAD_TALK = [
  'the road gives and the road takes, and it keeps terrible books.',
  'slept inside a dead crawler last week. best roof in a hundred klicks. previous tenant didn’t mind.',
  'you walk like someone with a map. throw it away. maps are just opinions with borders.',
  'i count my steps some days. lost count at forty thousand once and felt free.',
  'met a sentinel on the ridge road. we ignored each other with great professionalism.',
  'the fire’s the thing. walls are just a fire that forgot how to be warm.',
  'every camp i leave, i bury one bolt. seeding the desert with spares. someone will thank me in a century.',
  'storms you can walk out of. quiet — quiet you have to be careful with.',
];
export function roadTalk(npc, rand) { return decorate(rand.pick(ROAD_TALK), npc, rand); }

// ---------- companionship ----------
export const RECRUIT_LINES = [
  'you mean it? …yes. yes, let me get the pack. it’s already packed. it’s been packed for years.',
  'thought you’d never ask, {addr}. the fire keeps itself. the road doesn’t.',
  'i walk with you, then. two shadows confuse the desert. it’s good arithmetic.',
];
export const DISMISS_LINES = [
  'aye. it was a good stretch of road, {addr}. find me by some fire or other.',
  'go on, then. i’ll tell the next fire about you. the flattering parts. mostly.',
  'the road forks, like it does. walk well. mind the wind.',
];
export const DOWN_LINES = [
  '{name}’s chassis gives out — they wave you off and limp toward the nearest fire to mend.',
  '{name} goes down hard, hauls themselves up, and turns for home. “next time,” they manage.',
];
export function recruitLine(npc, rand) { return rand.pick(RECRUIT_LINES).replace('{addr}', npc.quirk ? npc.quirk.address : 'wanderer'); }
export function dismissLine(npc, rand) { return rand.pick(DISMISS_LINES).replace('{addr}', npc.quirk ? npc.quirk.address : 'wanderer'); }
export function downLine(f, rand) { return rand.pick(DOWN_LINES).replaceAll('{name}', f.name); }

export function gossipDry(rand) {
  return rand.pick([
    'i’ve told you what i know of the roads. the rest you walk yourself.',
    'my map of the neighbors is spent. ask the dunes — they gossip in sand.',
    'enough geography from me. some places you only find by being lost first.',
  ]);
}
export function noNeighbors(rand) {
  return rand.pick([
    'neighbors? the dunes, the wind, and whatever is digging under the east wall.',
    'we keep to ourselves out here. the desert insists.',
  ]);
}

// ---------- your deeds travel ahead of you ----------
const EVENT_LINES = {
  kill: ['word travels: someone put down {name}. machines talk, you know. they’re frightened. good.',
    'the scrap-runners say {name} is finally quiet. that was you, wasn’t it? thought so.'],
  signal: ['a runner mentioned the {name} got answered after all these years. the desert noticed.',
    'they say someone followed the {name} all the way down. bold.'],
  found: ['travelers speak of {name} like it’s new. it was always there. you just made it real again.',
    'so {name} stands after all. the maps grow honest again.'],
  helped: ['{name} speaks well of a wanderer lately. work done, debts paid. raises the tone of the whole desert.',
    'word from {name}: someone out here still finishes what they start. imagine that.'],
  raidwin: ['they say the wall at {name} held against a raid, and a stranger stood with the watch. good story. better if true.',
    'the bell at {name} rang and nobody died. you don’t hear that every season.'],
  raidloss: ['hard word from {name}: the raid got through. the well keeps the names.',
    '{name} buried their own after the last raid. light a lamp when you pass.'],
  nest: ['someone broke the heart of {name} — the printworks, the ugly one. the night patrols sleep easier.',
    'word is {name} has gone quiet. whoever slagged that core drinks free at any fire i tend.'],
};
export function eventLine(npc, event, rand) {
  return rand.pick(EVENT_LINES[event.t] || EVENT_LINES.found).replace('{name}', event.name);
}

// ---------- the well: services ----------
export const WELL_FLAVOR = {
  mercantile: [
    'the well is metered, the meter is fair, and the fairness is negotiable.',
    'water, repairs, and rest: the three things nobody haggles over twice.',
    'the stall-keepers voted to keep the well free. then voted a fee for everything around it. democracy.',
  ],
  monastic: [
    'the well asks nothing. we ask a little, to keep asking nothing.',
    'four hundred years of giving. we are the well’s way of washing its hands.',
    'lay your burdens by the rim. the heavy ones first. the metal ones we can actually fix.',
  ],
  scavver: [
    'we dug the cistern out ourselves. drink’s honest. tools sharper.',
    'the winch squeaks on the third turn. it’s squeaked for nine years. fixing it would be admitting something.',
    'everything in this yard was buried once, including the well, including most of us.',
  ],
  ferrocult: [
    'the water tastes of iron here. we consider this a feature.',
    'the well goes down further than the rope. the rope goes down further than we discuss.',
    'drink. the dream filters through forty meters of salt before it reaches you. practically clean.',
  ],
};

// merge data-file voice extensions into the base pools
for (const tier of Object.keys(GREET_EXT)) for (const t of Object.keys(GREET_EXT[tier])) GREET[tier][t].push(...GREET_EXT[tier][t]);
for (const t of Object.keys(SMALLTALK_EXT)) for (const k of Object.keys(SMALLTALK_EXT[t])) SMALLTALK[t][k].push(...SMALLTALK_EXT[t][k]);
RESIDENT_OPINION.push(...OPINION_EXT);
ROAD_TALK.push(...ROAD_EXT);
for (const t of Object.keys(WELL_EXT)) WELL_FLAVOR[t].push(...WELL_EXT[t]);
for (const k of Object.keys(EVENT_EXT)) (EVENT_LINES[k] = EVENT_LINES[k] || []).push(...EVENT_EXT[k]);
QUIRK_ADDRESS.push(...QUIRK_ADDRESS_EXT);
QUIRK_TAG.push(...QUIRK_TAG_EXT);
ORIGIN_REASONS.push(...ORIGIN_EXT);
