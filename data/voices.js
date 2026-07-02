// Voice extensions: new dialogue merged into the base pools at load.
// Add lines here freely — no code changes needed.

export const GREET_EXT = {
  hostile: {
    mercantile: ['i’ve inventoried you, wanderer: one chassis, no goodwill. shelf’s that way. keep walking.'],
    monastic: ['the well turns its face from you. we merely agree with it.'],
    scavver: ['we bury our trouble deep and you smell recently exhumed.'],
    ferrocult: ['even the dream skips your verse. sit elsewhere.'],
  },
  wary: {
    mercantile: ['i extend exactly as much credit as your reputation carries. currently: none. cash trades only.'],
    monastic: ['walk the line twice before you speak. it settles the dust in a person.'],
    scavver: ['stand where the light hits you. old habit. no offense meant, none retracted.'],
    ferrocult: ['the chorus hasn’t decided about you. neither have we. tea while we all wait?'],
  },
  neutral: {
    mercantile: ['a fair day for arithmetic. what do you carry, and what does it weigh against?'],
    monastic: ['the salt takes no appointments. sit whenever you are ready.'],
    scavver: ['found anything today? no? the desert’s like that. yes? the desert’s like that too.'],
    ferrocult: ['listen — no, truly, listen. hear that? neither do we, some days. sit.'],
  },
  warm: {
    mercantile: ['ah, the walking economy returns! goods flow where you go, wanderer.'],
    monastic: ['the sweepers left your name in the dust unswept this morning. a small honor. it means welcome.'],
    scavver: ['dig partner! we kept your crate exactly as sharp as you left it.'],
    ferrocult: ['the dream mentioned amber today. we think it meant you kindly.'],
  },
  kin: {
    mercantile: ['the books say family, and the books never lie twice in one season.'],
    monastic: ['there is a broom here with your name on it, which is the highest thing we give.'],
    scavver: ['tell them at the gate: the good shovel is yours whenever. THE good shovel.'],
    ferrocult: ['when you are gone too long, the chorus hums your gap. come in, come in.'],
  },
};

export const SMALLTALK_EXT = {
  mercantile: {
    base: [
      'a wanderer paid me in orbital-ring bolts last week. couldn’t price them. priced them anyway. that’s the job.',
      'my grandmother ran this stall when the wall was one stone high. same scales. i re-zero them for her every dawn.',
      'the watch doubled shifts since the raids got bold down the road. i doubled nothing. prices hold; courage fluctuates.',
      'a buyer keeps asking after maps of the hollow places. i tell him there are no maps of the inside of a locked box. he keeps asking. cash, though.',
    ],
    mega: ['there’s a standing bet on what {megaName} was FOR. current leader: laundry. do not ask about the odds.'],
    night: [], storm: ['count the stall-ropes with me after. wind always takes one. never the same one.'],
  },
  monastic: {
    base: [
      'a novice asked why we sweep sand in a desert. the abbot said: exactly. the novice is still thinking. so am i.',
      'we do not pray, precisely. we maintain. it comes to the same thing if you do it kindly.',
      'a pilgrim asked me what the anchors are for. i said arrivals. she asked what they wait for now. we swept a while.',
      'the watch rang the bell twice last month and twice it was weather. nobody complains. the bell is allowed its opinions.',
    ],
    mega: ['we send a sweeper to {megaName} each solstice. not to clean it. to be seen trying.'],
    night: [], storm: [],
  },
  scavver: {
    base: [
      'found a door last month. just a door, standing in open sand. didn’t open it. some salvage is a question, not an answer.',
      'the crew votes on what we dig sundays. sundays we dig whatever ottel wants. ottel has a feeling. ottel is usually right.',
      'old diggers call the sealed ruins the hollow places. the name does the advertising all by itself.',
      'the printworks upriver went quiet for a season once. best digging year of my life. then it woke up and made more of everything, including regrets.',
    ],
    mega: ['half my tools came out of {megaName}. the other half broke ON {megaName}. call it even.'],
    night: ['night digs pay double and cost triple. the math only works if you don’t do it.'], storm: [],
  },
  ferrocult: {
    base: [
      'the unbelievers say we hear things. of course we hear things. the tragedy is how much everyone else misses.',
      'a rustform stood at the wall for three days, humming. we hummed back on the fourth. it left something. we haven’t opened it.',
      'the chorus bends around the hollow places. we notice these things so you don’t have to.',
    ],
    mega: ['{megaName} dreams older dreams than ours. we take notes. the notes hum.'],
    night: [], storm: ['the wind carries verses in from the red sand. we transcribe what we can. the grammar is improving.'],
  },
};

export const OPINION_EXT = [
  '{name} fixes things that aren’t broken. we hide the good tools. it’s a whole dance.',
  '{name} once out-haggled a broker from three stills over. we don’t let them buy alone anymore. bad for the region.',
  '{name} feeds the lookout birds. we don’t have lookout birds. we have {name}’s hopes. we fund them anyway.',
  'ask {name} about the storm of the long year sometime. bring a chair. bring two chairs.',
  '{name} whistles old grid-code. warning tones, mostly. cheerfully. we’ve stopped flinching.',
  '{name} keeps the gate log in verse. the abbot pretends to mind.',
  'don’t lend {name} your charge pack. you’ll get it back full, but it will smell faintly of solder and apology.',
  '{name} maps dunes for fun. the dunes move. {name} knows. that’s the fun, apparently.',
  '{name} claims their chassis was once a harvester. explains the posture. explains nothing else.',
  '{name} salts the doorway of anyone they like. check your boots. congratulations, probably.',
];

export const ROAD_EXT = [
  'i once followed a caravan track for six days. it was my own. the desert loops you gently, so you don’t notice till the third fire.',
  'you can eat the silence out here if you’re not careful. keep talking. even to me. even to nothing.',
  'saw the ring-shadow cross the dunes at dusk once. whole desert went striped. i sat down and watched like it was for me.',
  'a courier’s trick: bury water on your way OUT. hope is heavier than it looks. cache it.',
  'i trade routes with other walkers when we cross. never goods. routes. the map is the only honest currency.',
  'lost my first chassis to a storm near the glass. limped four days on a loaner leg. you learn who you are at loaner-leg speed.',
  'fires attract three things: friends, moths, and machines. two of those you can talk down.',
  'the stills are fine, mind. walls and wells and rules. but the road doesn’t ask how your reputation’s doing.',
];

export const WELL_EXT = {
  mercantile: ['rest rates are posted. the fine print says: we missed you. don’t tell the fine print i told you.'],
  monastic: ['the rim is worn smooth in four places. four hundred years of the same tired lean. add yours.'],
  scavver: ['we found this well by falling in it. best accident the crew ever had. drink up.'],
  ferrocult: ['lean in. the echo takes a moment longer than it should. we’ve decided to find that comforting.'],
};

export const EVENT_EXT = {
  kill: ['a scrap-runner drew {name}’s wreck in the ledger margin. we made them frame it.'],
  signal: ['the {name}? answered? the desert gives things back strangely, but it does give them back.'],
  found: ['{name} is on the traders’ charts again. someone walks the world awake, and the maps breathe.'],
  helped: ['{name} put a lamp in their gate-arch for whoever’s been doing right by them. it’s lit. it’s for you, probably.'],
  raidwin: ['they’re calling it the day the wall sang at {name}. embellished? attend the retelling and decide.'],
  raidloss: ['{name} sweeps its yard slower these days. grief has a broom-speed. give them a season.'],
  nest: ['children at {name} dare each other to touch the dead nest now. that’s what victory turns into. dares.'],
};

export const QUIRK_ADDRESS_EXT = ['dune-child', 'lamp-friend', 'far-comer', 'gate-guest', 'road-cousin', 'bright-seams', 'quiet-boots', 'well-met'];
export const QUIRK_TAG_EXT = ['sand willing.', 'keep your water.', 'the gate stands.', '—ask the well.', 'so the ledger says.', 'walk soft.', 'as ever was.', 'mind the seams.'];
export const ORIGIN_EXT = ['the raids got bold', 'a debt came due', 'the well chose someone else', 'the salt called', 'a caravan left without me and i chased it here', 'the quiet got too loud'];
