// Dialogue & disposition. Lines are grown from temperament-keyed grammars over
// a small blackboard of true facts; rumors point at places that really exist.
import { Rand, hashString } from './rng.js';
import { expand } from './grammar.js';
import { SPEECH, GROUNDED, MEETINGS, IDIOLECT, DIALECTS, ASKS } from '../data/speech.js';
import {
  GREET_EXT, SMALLTALK_EXT, OPINION_EXT, ROAD_EXT, WELL_EXT, EVENT_EXT,
  QUIRK_ADDRESS_EXT, QUIRK_TAG_EXT, ORIGIN_EXT,
} from '../data/voices.js';

// THE TONGUES: an utterance composed from the fragment grammars — the
// name machinery, generalized to speech. Same rand in, same sentence out.
export function composeSmalltalk(npc, rand) {
  const rules = SPEECH[npc.temperament] || SPEECH.scavver;
  return expand(rules, '#origin#', rand);
}

// b2 THE SUBJECTS: a grounded utterance — a fragment family keyed to a
// TRUE fact of the moment, stanced per temperament where the creeds
// would differ, with {facts} bound in by the caller
export function composeGrounded(npc, key, facts, rand) {
  const G = GROUNDED[key];
  if (!G) return null;
  const stancePool = (G.stance && (G.stance[npc.temperament] || G.stance.any)) || null;
  const rules = { ...G.rules };
  // temperament stance merges with the shared pool: the creed colors it,
  // the desert still agrees on the facts
  const anyPool = G.stance && G.stance.any ? G.stance.any : [];
  const key2 = Object.keys(rules).find(k => k.startsWith('stance'));
  rules[key2 || 'stance'] = stancePool && stancePool !== anyPool ? [...stancePool, ...anyPool] : (stancePool || ['']);
  // the origin references #stance#/#stancename#/etc — normalize: expose all
  for (const sk of ['stance', 'stancename', 'stanceband', 'stanceroads', 'stancecrews', 'stanceward', 'stancetrade', 'stancemend', 'stancekeep']) {
    if (!rules[sk]) rules[sk] = rules[key2 || 'stance'];
  }
  let line = expand(rules, '#origin#', rand);
  for (const [k, v] of Object.entries(facts || {})) line = line.replaceAll('{' + k + '}', String(v));
  return line;
}

// b3 THE MEMORY: a greeting shaped by the acquaintance — first meeting,
// a return, a regular, a friend, or a long gap since the last one
export function composeGreeting(npc, stage, facts, rand) {
  const G = MEETINGS[stage];
  if (!G) return null;
  const anyPool = (G.stance && G.stance.any) || [];
  const pool = (G.stance && G.stance[npc.temperament]) || null;
  const rules = { ...G.rules, stance: pool ? [...pool, ...anyPool] : anyPool };
  let line = expand(rules, '#origin#', rand);
  for (const [k, v] of Object.entries(facts || {})) line = line.replaceAll('{' + k + '}', String(v));
  return line;
}

// spoken-line callbacks: when a soul has said everything they hold, they
// own the repetition instead of pretending it is new
const CALLBACK = [
  'as i told you — ',
  'i said it before and it held: ',
  'you have heard this one, but it bears the weight: ',
  'same as last time, because it is still true: ',
  'stop me if you know it. actually, don’t: ',
];

// b5 THE WEAVE: the question a soul turns back on you
export function pickAsk(npc, rand) {
  const pool = [...(ASKS[npc.temperament] || []), ...ASKS.any];
  return rand.pick(pool);
}

// which grounded families are true right now, and with what facts
export function groundedKeys(npc, ctx) {
  const out = [];
  if (ctx.season && GROUNDED['season_' + ctx.season]) out.push(['season_' + ctx.season, {}]);
  if (ctx.yourName) out.push(['yourname', { name: ctx.yourName }]);
  if (ctx.bandKnown) out.push(['band', { band: ctx.bandKnown }]);
  if (ctx.roadsCut > 0) out.push(['roadscut', { n: ctx.roadsCut, s: ctx.roadsCut === 1 ? '' : 's' }]);
  if (ctx.crewsBusy) out.push(['crews', {}]);
  const role = String(npc.role || '');
  if (/warden|guard|outrider/.test(role)) out.push(['role_ward', {}]);
  else if (/broker|trader|merchant|courier/.test(role)) out.push(['role_trade', {}]);
  else if (/tinker|mender|smith/.test(role)) out.push(['role_mend', {}]);
  else if (/keeper|sweeper|abbot/.test(role)) out.push(['role_keep', {}]);
  return out;
}

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
// b4 THE VOICES: a soul's idiolect, derived from their identity — the
// same mouth keeps the same habits forever, and nothing is saved
export function voiceOf(npc) {
  const h = hashString(npc.id || npc.name || 'soul') >>> 0;
  return {
    inter: [IDIOLECT.inter[h % IDIOLECT.inter.length], IDIOLECT.inter[(h >>> 4) % IDIOLECT.inter.length]],
    swaps: IDIOLECT.swapsets[(h >>> 8) % IDIOLECT.swapsets.length],
    tic: IDIOLECT.tics[(h >>> 12) % IDIOLECT.tics.length],
    interRate: 0.12 + ((h >>> 16) % 12) / 100,  // 0.12–0.23: some souls open more
    ticRate: 0.06 + ((h >>> 20) % 8) / 100,     // 0.06–0.13
  };
}

const swapWords = (t, swaps) => {
  for (const [from, to] of swaps) t = t.replace(new RegExp('\\b' + from + '\\b', 'g'), to);
  return t;
};

export function decorate(text, npc, rand) {
  if (!npc || !npc.quirk) return text;
  // where the naming story has reached, the desert uses YOUR name —
  // the epithet rides in on npc._epithet, set at dialogue-open by the
  // game (which knows what this still knows)
  const addr = npc._epithet && rand.chance(0.65) ? npc._epithet : npc.quirk.address;
  let t = text.replace(/\bwanderer\b/g, addr);
  // THE VOICES: private vocabulary always (it IS their word for it);
  // the valley's dialect always (ground-speech); at most ONE flourish
  // per line — an opener or a tic, never both, and mostly neither
  const v = voiceOf(npc);
  t = swapWords(t, v.swaps);
  const d = npc._dialectIdx !== undefined ? DIALECTS[npc._dialectIdx % DIALECTS.length] : null;
  if (d) t = swapWords(t, d.swaps);
  if (rand.chance(v.interRate)) {
    const useDialect = d && rand.chance(0.25);
    t = (useDialect ? d.inter : rand.pick(v.inter)) + ' ' + t;
  } else if (rand.chance(v.ticRate)) {
    t += v.tic;
  }
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
const MEGA_NOUN = { ring: 'a shattered orbital ring', colossus: 'a fallen colossus', dish: 'a listening array', spire: 'a broken spire', launch: 'a launch complex, the ship still on the pad' };

// the still's fortune, worn on the body and spoken aloud — prosperity
// part-swapping made visible in the mouth as well as the plate
// tales about the walker: each temperament frames the same story its own way
const TALE_FRAME = {
  mercantile: ['they tell it in the markets: {tale}', 'a hauler swore this one is true: {tale}'],
  scavver: ['word came up the digs: {tale}', 'heard this over a fire: {tale}'],
  monastic: ['the order keeps an account of you. it reads: {tale}', 'it is written, and weighed: {tale}'],
  ferrocult: ['the totems already sing it: {tale}', 'we keep this one like a relic: {tale}'],
};
export function taleLine(npc, tale, rand) {
  const pool = TALE_FRAME[npc.temperament] || TALE_FRAME.scavver;
  return decorate(rand.pick(pool).replaceAll('{tale}', tale.body), npc, rand);
}

// what the creeds say about what you are becoming (pushed into smalltalk)
export const EMBRACE_TALK = {
  ferrocult: {
    answered: ['you answered it. we heard the choir change key from here.', 'the letter walks. sit by our totem sometime; it leans toward you now.'],
    bloom: ['the bloom on your plate is the most honest thing in this still.', 'when you pass the totem garden, the blossoms open. the acolytes cry about it. good crying.'],
    full: ['THE BLOOMING. in our histories you are already a chapter.', 'we do not kneel, as a rule. for you the rule bends.'],
  },
  monastic: {
    answered: ['there is a hum under your hum. scrub, before it learns your name.', 'the salt can still reach it, walker. let it.'],
    bloom: ['you should not have come. the order counts what you carry.', 'i will not trade words with the letter. leave the wall while walking is still yours.'],
    full: ['abomination is a strong word. it is the correct one.', 'the guns will speak for the order. i am only telling you which way to run.'],
  },
  mercantile: {
    answered: ['no offense, but your hum is bad for business. the skittish stock notices.', 'whatever you answered, keep it off my ledger.'],
    bloom: ['rust on the plate, discount on the goods — for you prices run a shade colder.', 'i will still trade. i will just count my fingers after.'],
    full: ['the Blooming, at MY stall. wait till the route hears this one.'],
  },
  scavver: {
    answered: ['you hum different. no judgment. everything out here hums eventually.', 'answered it, did you? my cousin did too. she is... taller now.'],
    bloom: ['nice bloom. does it itch? the honest ones always itch.', 'the ferals walk past you like family. that is worth more than plate, some nights.'],
    full: ['the diggers say the red sand goes quiet where you sleep. spooky. useful, but spooky.'],
  },
};
export const POLISHED_TALK = {
  monastic: ['not a grain of it on you, and the chassis at full temper. the order sees you, polished one.', 'you are what the rite is FOR. walk proud on the white ground.'],
  mercantile: ['tier-three head to heel and clean as a ledger day one. you make the rest of us look rented.'],
  scavver: ['shiniest thing in four regions. try not to stand where the raiders look.'],
  ferrocult: ['polished. immaculate. sealed. a letter returned unopened — the saddest thing we know.'],
};

// the town tells its story back: what the keeper built, spoken by the
// people living inside it — numbers real, tone dry, pride unmistakable
const STAKE_PRIDE = [
  'you know {keeper} funded this wall out of their own salvage? i lean on it sometimes just to feel expensive.',
  '{held} raids broke on that wall. i counted. counting is most of my job.',
  'my cousin says no town gathers people out of the open sand. we have {settlers} who walked in ON PURPOSE. tell your cousin.',
  'the keeper sleeps here, same well as anybody. that is the whole speech about this place, really.',
  'we are worth robbing now. the yard is strangely proud of that.',
];
export function stakePrideLine(npc, pride, rand) {
  let line = rand.pick(STAKE_PRIDE)
    .replaceAll('{keeper}', pride.keeper)
    .replaceAll('{held}', String(pride.held))
    .replaceAll('{settlers}', String(pride.settlers));
  return decorate(line, npc, rand);
}

// the desert talks about its weather the way anyone does: constantly
const SEASON_TALK = {
  clear: [
    'the clear, at last. the bells run early and the prices run kind. it will not last. enjoy it like it will.',
    'trading season. even the wardens smile, which frightens the children.',
    'sky like hammered brass and not a storm in it. somebody up there forgot about us, praise be.',
  ],
  veil: [
    'the veil is on us. i tie a rope from my door to the well and trust nothing else.',
    'three storms this week and the week is young. the compass has been lying since the turn.',
    'veil season. the haulers double their prices and honestly, watching the sky, fair enough.',
  ],
  glasswind: [
    'glass-wind season — you hear it coming, like the desert dragging a knife along itself. get indoors.',
    'my cousin lost half her plating to a shard squall. the glitter after is pretty. she says it is NOT worth it.',
    'when the wind goes green at the edges, stop walking. that is the whole wisdom of the season.',
  ],
  longcold: [
    'the long cold. the nights chew through a power cell like it owes them. keep to the fires.',
    'lean season. the machines get hungry and so does everything else. the wall-watch doubles.',
    'cold enough at night to hear your own joints think. spring for a fire. spring for two.',
  ],
};

const HERD_TALK = [
  'the herd is due through here inside two days. tie down anything that rolls; they do not go around.',
  'you can hear them before you see them — a hundred feet agreeing on a direction. the herd is coming.',
  'herd season for this stretch. the caravans will wait at the crossings, and the wise wait with them.',
];

// THE MARCH: a massing front owns every conversation within earshot of it
const WAR_TALK = [
  'the nests out by {wstill} are waking together. TOGETHER. they never used to know that word.',
  'a front masses against {wstill}. {wdays} more day(s) of brood-song, they say, and then it walks.',
  'you can hear it at night when the wind sits right — every nest on one key. {wstill} hears it loudest.',
  'my cousin ran the {wstill} road. ran. the past tense is the whole report.',
  'they say if enough hearts go quiet before the march, the waking dies with them. somebody with a good arm should be out there counting.',
];
const WAR_HERE_TALK = [
  'the watch doubles at dusk now. the brood-song is OUR name this time.',
  'we oil the wall-guns and we do not talk about the counting. {wdays} day(s).',
  'some of the young ones want to go out and break the nests before the march comes. some of the old ones went.',
  'the well keeps a list of everyone who is staying. it is the whole town. that is the kind of place this is.',
];
// the column is on the ground: rumor turns from arithmetic to sightings
const WAR_MARCH_TALK = [
  'the column is ON THE GROUND. it walks for {wstill} behind a heart-engine the size of a granary.',
  'you can see its dust from the ridge, they say. a straight line with no hurry in it, aimed at {wstill}.',
  'break the heart-engine and the whole thing forgets why it came. easy to say from behind a wall.',
  'a caravaneer counted the escort through a scope and stopped counting. that was the report. stopped counting.',
];

// THE STATIC: the yard saw you step out of the well, and has opinions
const TX_TALK = {
  any: [
    'you stepped out of the WELL, walker. saw it with my own optics. the old doors still open for you.',
    'the hum is still on you. give it an hour before you go shaking hands.',
    'my grandmother said people used to arrive that way every day, whole crowds of them. she said it like a warning.',
    'one moment the well is a well, the next it is a DOOR and you are in it. warn a soul next time.',
  ],
  monastic: [
    'the well is for water and the keeping of names. what you did with it is neither. we will speak of this at the rite.',
    'every ride leaves a little of you in the line, walker. the salt cannot scour what the wire keeps.',
  ],
  ferrocult: [
    'you RODE the lattice. the letter rides with you — did you feel it press closer? the totem is jealous tonight.',
    'the line keeps its tithe, and the Rust keeps everything it is given. what you call travel, we call correspondence.',
  ],
  scavver: ['cheaper than feet, they say. NOTHING is cheaper than feet.'],
  mercantile: ['if the wells carry walkers again, they can carry FREIGHT. do you know what that does to hauling rates? sit down. we should talk.'],
};
// and past a few rides, the hum never quite leaves your signal
const RIDER_TALK = [
  'they say some walkers ride the lines so often the wells greet them by wave-shape. they say it QUIETLY.',
  'you have the look of someone the lattice knows. that is not a compliment everywhere, walker.',
];

// THE ROAD TALK (THE COMPANY b2): the one who walks with you has
// opinions, and the road is long. Keyed by context; a voice per
// temperament where it matters; paced to season, never flood.
export const BANTER = {
  idle: {
    any: [
      'my feet do not get tired. i checked the manual twice. so what is this, then.',
      'if you sing, i will also sing, and neither of us wants that. noted? noted.',
      'i count the dunes some days. the number changes. i have decided not to think about it.',
      'you walk like you know where we are going. i have decided to find that comforting.',
      'quiet out. the good kind, for once.',
      'i had a dream standing up yesterday. machines are not supposed to do that. it was about doors.',
    ],
    scavver: [
      'that ridge line looks like salvage. every ridge line looks like salvage. this is a sickness and i am at peace with it.',
      'rule of the road: if it glints twice, it is worth the detour. if it glints once, it is teeth.',
    ],
    mercantile: [
      'i keep a running tally of what this trip costs against what it might pay. do not ask for the current figure.',
      'every still we pass and do not trade at is a small grief. i carry many small griefs.',
    ],
    monastic: [
      'walking is a rite too, you know. the shortest one with the longest name. i forget the name.',
      'i miss the bells. any bells. even the warning kind, a little, which i will deny saying.',
    ],
    ferrocult: [
      'the ground hums different out here. older letters. do not worry, i am only listening.',
      'you never ask what the totem said to me. i respect that. it said INTERESTING things.',
    ],
  },
  biome: {
    rustlands: [
      'red sand. keep your seams shut and your mouth shutter too. i have seen what breathing it does.',
      'the ground here is not sleeping. walk like a guest.',
    ],
    salt: [
      'the white ground. everything goes quiet here — even the letter, they say. enjoy the silence; it is rented.',
      'salt in my joints for a week after this. worth it. the pans are the closest thing the desert has to mercy.',
    ],
    flats: [
      'scrap flats. every step is somebody’s old roof. walk respectful; scavenge thorough.',
    ],
    dunes: [
      'dunes. my least favorite arithmetic: two steps up, one step down, repeat until philosophy.',
      'somewhere under all this sand is the road they built. somewhere under the road is another road. try not to think about it.',
    ],
    city: [
      'buried streets. people STOOD here, queueing for things. bread, maybe. permits. i think about the permits.',
      'watch the high floors. things nest where the view is good — that part of the world never changed.',
    ],
    glass: [
      'glass country. step where i step, or we will both be picking shards out of your shins and only one of us will find it funny.',
    ],
  },
  storm: [
    'storm coming up. i can feel it in the arm you gave me. the storm can probably feel the arm too. everybody wins.',
    'head down, walker. the sand does not hate us, but it does not know our names either.',
    'i will stand on your wind side. do not read anything into it.',
  ],
  shard: [
    'GLASS ON THE WIND — cover, now, and i am not asking.',
    'shard weather. whoever calls this a season has never stood in it.',
  ],
  coldnight: [
    'cold enough to slow the mind. talk to me so i know yours is still turning.',
    'the long cold. my joints sound like an argument. do not laugh. you are humming too.',
  ],
  war: [
    'you hear that? that is not wind. that is a lot of things agreeing with each other. i hate it.',
    'if we are going TOWARD the war, i want it noted that i noticed, and came anyway.',
  ],
  stillArrive: [
    'walls and a well. my standards have simplified beautifully out here.',
    'let me do the talking at the market. no offense. some offense.',
    'smell that? forge-smoke and stew. civilization is mostly those two things and i have missed both.',
  ],
  home: [
    'this is my old yard, you know. that post there — i held it four years. it has not been swept since. i am fine. it is fine.',
    'careful what you say about this place in front of me. only i get to say it.',
  ],
  hollow: [
    'a hollow place. wind dies at the door — you noticed? everything in here has been waiting a long time. try not to be what it was waiting FOR.',
    'i will watch behind us. that is not an offer, it is a policy.',
    'people made this. people made most of the terrible beautiful things.',
  ],
  deepRoom: [
    'deep room. last floor. whatever is kept here was worth stairs. stairs, walker.',
  ],
  corruption: [
    'the letter is loud in you today. i can hear it when you idle. do what you need to do — i will still be here, either way. that is the whole arrangement.',
    'your eyes are doing the thing again. the red thing. drink some salt when we next can, or do not — but KNOW you are doing the thing.',
  ],
  static: [
    'you stepped out of a WELL. i watched a wall of water learn your face and give it back. i am going to need a minute.',
    'the hum is still on you from the ride. it is like walking next to a kettle that is thinking.',
  ],
  lowHull: [
    'you are leaking, walker. visibly. as your second opinion: patch it.',
    'do not fall over out here. i have carried you before in a manner of speaking and the manner was undignified.',
  ],
  dawn: [
    'dawn. the desert pretends to be kind for about an hour. take it personally; it is the only way to enjoy it.',
    'another one. we keep getting these. i have decided it is a good sign.',
  ],
  want: {
    place: ['we are still not going toward {target}, i notice. noticing is all i am doing. loudly.'],
    nest: ['{target} still beats. i can feel it some nights, like a splinter with a schedule.'],
    ride: ['any well would do, you know. for the watching. whenever the roads allow.'],
    deep: ['every hollow we pass, i think: maybe this one has our stairs in it.'],
    storm: ['glass season will come around again. i keep the want oiled.'],
  },
  wantLate: [
    'the want does not spoil, walker. but i do wonder, some mornings, whose route this is.',
    'i have started dreaming about it standing up again. that is usually my sign to do something myself.',
  ],
  sworn: [
    'you answered the want. i do not forget things like that. i do not forget ANYTHING, technically, but you know what i mean.',
    'walk wherever you like today. i have already been where i needed to go.',
  ],
  // THE SECOND CHAIR: two voices, one road — they talk to each other
  duo: [
    ['{other}. settle something. dunes: worse going up, or worse going down.', 'worse going ON, is the answer nobody likes. next question.'],
    ['i had a home once, you know. walls. a post i held.', 'we all had a once, {other}. that is what the walking is FOR.'],
    ['if the walker falls over out here, i am not carrying the legs. i am saying it now.', 'you take the legs. i carried the legs at the crossing and one of them kicked.'],
    ['do you hear the wells humming, some nights?', 'everyone hears it. the trick is not answering. drink your salt.'],
    ['the stories have both our names in them now. stitched to the walker’s.', 'then walk taller. stories check their sources.'],
  ],
};
// one line in the pool — the legend seasons, it never shouts
// THE WANT (THE COMPANY b4): every companion carries one thing they need
// from the road — stated when asked, voiced when neglected, and answered,
// if you will walk that way
export const WANT_SAY = {
  place: 'there is a place — {target}. my people swore the well there sings at dusk, and i have never once heard it. i am not asking you to change the route. i am telling you the route i would change it TO.',
  nest: 'the nest they call {target}. it took someone from me, back before i knew you. i want to stand there when its heart goes dark. that is the whole want. i have carried it a long time and it does not get lighter.',
  ride: 'i want to watch you ride the lattice. up close. i want to see the well take you and give you back somewhere else. everyone describes it wrong and i want to describe it wrong FIRSTHAND.',
  deep: 'i have never stood in a deep room. the last floor, where the old world kept what it could not say out loud. take me down sometime. i will watch the stairs behind us.',
  storm: 'i want to stand in the glass-wind once — sheltered, alive, but IN it. my grandmother did it and never shut up about it. i intend to inherit the not shutting up.',
};
export const WANT_DONE = {
  place: 'the well DOES sing. slightly flat. do not tell anyone i cried a little, because machines cannot, so it will be a confusing rumor.',
  nest: 'dark. finally dark. i thought it would feel bigger. it feels — quiet. thank you, walker. i mean it in the oldest way the word works.',
  ride: 'you were THERE and then you were GONE and the water just — closed. everyone does describe it wrong. it is worse and better. i will be telling this for years.',
  deep: 'so this is the last floor. it is smaller than the stories and heavier than the stairs. i am glad i saw it. i am gladder we are leaving.',
  storm: 'i STOOD IN IT. grandmother, wherever your chassis rests — i inherit the not shutting up.',
};

// THE JOINT LEDGER: the yards notice who walks beside you — quietly,
// and only where the shared stories have actually reached
const COMPANION_TALK = [
  'that is {cname} walking with you, is it not? the stories put you two together. good. the desert is kinder in pairs.',
  '{cname}. we know that name here — it arrives stitched to yours now.',
  'the two of you match the telling. taller, though. stories always shrink people to fit around fires.',
];
const COMPANION_EP_TALK = [
  'so that is {cname} {cep}, in the plating. the name got here a week before the two of you did.',
];

const CHOICE_TALK = {
  carried: [
    'they say a walker went down to the root of the wells and came back up carrying an OLD-WORLD name. imagine wanting one of those back.',
    'a walker took their intake name back, down at the root. the ferro-cult says the line sings differently around them now. cheaper, anyway.',
  ],
  walker: [
    'they say a walker found their own intake record at the root of the wells — and gave the name BACK. left it with the dead, where it was resting.',
    'somebody read the oldest file in the desert and signed it "the walker." i do not know if that is humility or the largest boast i ever heard.',
  ],
  erased: [
    'they say a walker burned their own intake record at the root. unread. the monks call it immaculate. the cult will not say the walker’s name at all now — any of them.',
    'one less name in the third series, and the one who erased it chose to be nobody twice. that is either the saddest or the freest thing i know.',
  ],
};

// THE TIDE: after a campaign, the aftermath owns the smalltalk for days
const WAR_AFTER_TALK = {
  held: [
    'the wall at {wstill} held the whole march. wave after wave. they are rebuilding the watch roster out of VOLUNTEERS now.',
    'you hear about {wstill}? the front spent itself on their wall. the desert argued, and lost, for once.',
    'they rang the bells at {wstill} until noon the day after. not warning bells. the other kind.',
  ],
  sacked: [
    'they say {wstill} is smaller now. the march went over the wall. light a lamp when you pass.',
    'the war took a bite out of {wstill}. what stands can be raised again — that is not comfort, that is instructions.',
    'refugees from {wstill} came through with what they could carry. the well there still draws. that is where the rebuilding starts.',
  ],
  broken: [
    'the front near {wstill} died before it marched. somebody hunted the waking out of the nests, heart by heart.',
    'all those nests singing one key, and then — nothing. the quiet after is the loudest thing i ever heard.',
  ],
  column: [
    'the column for {wstill} is slag on the road. the heart-engine fell and the escorts forgot the word together.',
    'they met the war on the OPEN ROAD and broke it. the wall never fired. that story buys drinks for a year.',
  ],
};
WAR_AFTER_TALK.stood = WAR_AFTER_TALK.held; // old ledgers use the old word

const THRIVING_TALK = [
  'new plate this season. the roads paid for it — feel the weight of me.',
  'everyone here is wearing fresh salvage. good years put armor on backs.',
  'the grafting queue runs a week long now. a fine problem to have.',
  'you can hear it, can’t you? the whole still hums heavier. that’s tier in the joints.',
];
const LEAN_TALK = [
  'don’t look too hard at my plating. we patch what we can’t replace.',
  'sold my good arm-mounts a season back. the lean years take from the body first.',
  'every bolt on me is borrowed. when the roads come back, so will the plate.',
  'we strip the empty houses for shims now. the desert lends nothing twice.',
];

export function greeting(npc, tierCls, rand) {
  const pool = GREET[tierCls === 'hostile' ? 'hostile' : tierCls][npc.temperament] || GREET.neutral[npc.temperament];
  return decorate(rand.pick(pool), npc, rand);
}
// ctx: { region, mega: {name, dir} | null, isNight, storm }
export function smalltalk(npc, rand, ctx) {
  const t = SMALLTALK[npc.temperament];
  const pool = [...t.base];
  // THE TONGUES: composed lines join the pool, weighted to dominate it —
  // seeded per (soul, day), so a soul holds their stories for a day but
  // the yard never speaks in unison, and tomorrow brings new ones
  if (ctx.speechSalt !== undefined) {
    for (let k = 0; k < 3; k++) {
      const line = composeSmalltalk(npc, new Rand((ctx.speechSalt + k * 7919) >>> 0));
      pool.push(line, line); // ×2: composition carries the channel
    }
    // b2: everything TRUE becomes sayable — one composed line per live
    // subject, held for the day like the rest of the soul's stories
    const grounds = groundedKeys(npc, ctx);
    for (let i = 0; i < grounds.length; i++) {
      const [key, facts] = grounds[i];
      const line = composeGrounded(npc, key, facts, new Rand((ctx.speechSalt + 31337 + i * 6301) >>> 0));
      if (line) pool.push(line, line);
    }
  }
  if (ctx.mega) pool.push(...t.mega, ...t.mega); // grounded lines surface often
  if (ctx.isNight) pool.push(...t.night);
  if (ctx.storm > 0.25) pool.push(...t.storm, ...t.storm);
  if (ctx.landmark) pool.push(...LANDMARK_TALK);
  if (ctx.stage > 0) pool.push(...THRIVING_TALK, ...THRIVING_TALK);
  if (ctx.stage < 0) pool.push(...LEAN_TALK, ...LEAN_TALK);
  // what you are becoming is on everyone's tongue
  if (ctx.embraceState) {
    const et = (EMBRACE_TALK[npc.temperament] || {})[ctx.embraceState];
    if (et) pool.push(...et, ...et);
  }
  if (ctx.polished) {
    const pt = POLISHED_TALK[npc.temperament];
    if (pt) pool.push(...pt);
  }
  if (ctx.season && SEASON_TALK[ctx.season]) pool.push(...SEASON_TALK[ctx.season]);
  if (ctx.herdDue) pool.push(...HERD_TALK, ...HERD_TALK);
  if (ctx.warFront) {
    const wt = ctx.warFront.marching ? WAR_MARCH_TALK
      : ctx.warFront.here ? [...WAR_HERE_TALK, ...WAR_TALK] : WAR_TALK;
    const lines = wt.map(l => l
      .replaceAll('{wstill}', ctx.warFront.still)
      .replaceAll('{wdays}', String(ctx.warFront.days)));
    // a war drowns out the weather — and at the threatened still itself,
    // it IS the weather: souls preparing for a march talk of little else
    const weight = ctx.warFront.here ? 4 : 2;
    for (let i = 0; i < weight; i++) pool.push(...lines);
  }
  if (ctx.txArrived) {
    const tt = [...TX_TALK.any, ...(TX_TALK[npc.temperament] || [])];
    pool.push(...tt, ...tt); // an arrival by wire is the morning's whole news
  }
  if (ctx.txRider && !ctx.txArrived) pool.push(...RIDER_TALK);
  if (ctx.lifeChoice && CHOICE_TALK[ctx.lifeChoice]) pool.push(...CHOICE_TALK[ctx.lifeChoice]);
  if (ctx.companion && ctx.companion.known) {
    const ct = [...COMPANION_TALK, ...(ctx.companion.epithet ? COMPANION_EP_TALK : [])];
    pool.push(...ct.map(l => l
      .replaceAll('{cname}', ctx.companion.name)
      .replaceAll('{cep}', ctx.companion.epithet || '')));
  }
  if (ctx.warAfter && WAR_AFTER_TALK[ctx.warAfter.outcome]) {
    const at = WAR_AFTER_TALK[ctx.warAfter.outcome].map(l => l.replaceAll('{wstill}', ctx.warAfter.still));
    pool.push(...at, ...(ctx.warAfter.here ? at : [])); // at the wall itself, it's all anyone says
  }
  if (ctx.stakePride && (ctx.stakePride.held > 0 || ctx.stakePride.settlers > 0 || ctx.stakePride.works >= 3)) {
    // guard the templates that need real numbers
    const ok = STAKE_PRIDE.filter(l =>
      (!l.includes('{held}') || ctx.stakePride.held > 0) &&
      (!l.includes('{settlers}') || ctx.stakePride.settlers > 0));
    pool.push(...ok.map(l => l
      .replaceAll('{keeper}', ctx.stakePride.keeper)
      .replaceAll('{held}', String(ctx.stakePride.held))
      .replaceAll('{settlers}', String(ctx.stakePride.settlers))));
  }
  const bare = (ctx.region || '').replace(/^the\s+/i, '');
  // b3 THE MEMORY: what this soul has already told YOU retires from the
  // pool — until the pool runs dry, at which point they own the repeat
  let callback = '';
  let pickPool = pool;
  if (ctx.said && ctx.said.size) {
    const fresh = pool.filter(l => !ctx.said.has(hashString(l) >>> 0));
    if (fresh.length) pickPool = fresh;
    else callback = rand.pick(CALLBACK);
  }
  const raw = rand.pick(pickPool);
  if (ctx.onSaid) ctx.onSaid(hashString(raw) >>> 0); // the TEMPLATE is the thought; facts and quirks vary around it
  let line = raw.replaceAll('{region}', bare);
  if (ctx.mega) line = line.replaceAll('{megaName}', ctx.mega.name).replaceAll('{megaDir}', ctx.mega.dir);
  if (ctx.landmark) line = line.replaceAll('{landmark}', ctx.landmark);
  return callback + decorate(line, npc, rand);
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
  front: ['they say the nests woke together against {name}, and somebody broke the waking before it walked. heart by heart. that is a NEW kind of story.',
    'the front against {name} died on the ground it rose from. the roads are already arguing over who did the quieting.'],
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
