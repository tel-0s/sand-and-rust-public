// TOPICS — the desert's subjects of conversation.
// Each concept: aliases (the words that light up when spoken), and what each
// temperament has to say about it. Optional `warm` pools unlock at WARM+.
// Adding a topic = adding an entry here. Nothing else to touch.

export const CONCEPTS = {
  'the-rust': {
    label: 'the Rust',
    aliases: ['the Rust', 'rust-grown', 'rustform', 'rustforms', 'the bloom'],
    by: {
      mercantile: [
        'the Rust is a market force like any other. it wants, it takes, it moves prices. i just wish it haggled.',
        'rusted goods sell high and cost higher. i move them fast and wash my hands in salt after.',
      ],
      monastic: [
        'the Rust is not evil. evil plans. the Rust only wants, the way water wants downhill. that is why the line works.',
        'it takes the strong first, you know. more to want. keep yourself humble and scrubbed.',
      ],
      scavver: [
        'rust-grown parts come out of the ground warm. i don’t sell those. i rebury them, deeper, with an apology.',
        'the Rust’s just the desert’s way of digging back. can’t hate it. can’t trust it either.',
      ],
      ferrocult: [
        'iron, dreaming. that is all the Rust is. the question — the only question — is what it dreams of.',
        'the unbelievers scrub it off like sin. we think it is a letter, arriving one grain at a time.',
      ],
    },
    warm: {
      monastic: ['i will tell you what the abbot will not: the line does not stop the Rust. it asks the Rust to wait. so far it agrees.'],
      ferrocult: [
        'closer, then, since you’ve walked the seam yourself: the Rust never takes what refuses to grow. remember that when it asks.',
        'between us: the chorus is loudest around those it cannot have. you shine in it, wanderer. take that as flattery or as warning.',
      ],
    },
  },
  'the-salt': {
    label: 'the salt',
    aliases: ['salt line', 'white ground', 'the salt'],
    by: {
      mercantile: [
        'salt keeps meat, keeps metal, keeps the peace. only currency that never inflates. believe me, i’ve tried.',
        'the monks say the salt is holy. i say it’s reliable. out here that’s the same compliment.',
      ],
      monastic: [
        'the salt was sea-bed once, before the sea gave up. it remembers being water. the Rust cannot argue with a memory that old.',
        'white ground is clean ground. we did not make the rule. we only sweep it.',
      ],
      scavver: [
        'salt flats are dead digging — nothing under them but more virtue. good for sleeping safe, bad for business.',
        'i cut salt blocks one dry season. honest work. never again.',
      ],
      ferrocult: [
        'the salt says no. that is its entire vocabulary, and the dream respects it more than it respects us.',
        'we live beside the salt like neighbors of a fence we love. the fence loves nothing. it’s a good arrangement.',
      ],
    },
  },
  'the-wells': {
    label: 'the wells',
    aliases: ['the wells', 'the well'],
    by: {
      mercantile: [
        'every still is a bet that its well keeps giving. so far the wells are better gamblers than we are.',
        'water’s free at the rim. everything that gets the water to you costs. that’s not greed, that’s plumbing.',
      ],
      monastic: [
        'the wells are older than the stills, older than the roads. we did not find them. we were found near them.',
        'a well asks nothing, gives everything, and keeps every name it is given. we try to be worthy of the example.',
      ],
      scavver: [
        'dug out three collapsed wells in my time. there’s always machinery down there nobody talks about. still working. don’t ask.',
        'the well’s the only thing here we didn’t salvage. it salvaged us.',
      ],
      ferrocult: [
        'the wells go down to where the dream runs. drink slow and you can taste it thinking.',
        'ever wonder who bored them? shafts that deep, that true? the old world drilled for something, and we call finding it “water.”',
      ],
    },
    warm: {
      scavver: ['since you’ve hauled for us, a thought i keep in the locked crate: the machinery down the wells matches nothing i’ve ever pulled topside. older than the big ones, maybe.'],
    },
  },
  'the-stills': {
    label: 'the stills',
    aliases: ['the stills', 'the still'],
    by: {
      mercantile: [
        'a still is a market with walls. anyone tells you it’s more, they’re selling the walls.',
        'stills live on three things: the well, the watch, and traffic. lose one and the desert forecloses.',
      ],
      monastic: [
        'the stills stand where the water and the salt agree. everything else — walls, lamps, us — is commentary.',
        'they call them stills because the desert moves and these places don’t. it is a boast. the desert lets us make it.',
      ],
      scavver: [
        'every still sits on its own ruins, give it time. we live in the basement of the next town up.',
        'a still’s just a camp that got stubborn. i say that with love. i live in one.',
      ],
      ferrocult: [
        'the stills huddle by the salt like children by a stern grandmother. we are not different, just honest about it.',
        'quiet places. the dream passes under them and mostly doesn’t look up. mostly.',
      ],
    },
  },
  'the-chorus': {
    label: 'the chorus',
    aliases: ['the chorus'],
    by: {
      mercantile: [
        'the cultists’ word for the noise rusted metal makes in their heads. i sell them fresh cells and don’t argue theology.',
        'i heard it once, near a bad bloom. like a market crowd, far off, all selling. i don’t go back there.',
      ],
      monastic: [
        'what they call a chorus, we call a symptom. but i have stood on the line at night and heard the desert hum, so i judge quietly.',
        'the chorus is real. that was never the dispute. the dispute is whether one should hum along.',
      ],
      scavver: [
        'deep digs, you hear it through the spade. a sort of singing in the strata. we surface early those days.',
        'old diggers say the chorus is just stressed metal talking. young diggers ask what it’s stressed about.',
      ],
      ferrocult: [
        'every rusted thing sings one note, forever. together: the chorus. we are the only ones rude enough to listen.',
        'it is not a hymn. it is a headcount. everything the Rust holds, singing “here. here. here.”',
      ],
    },
    warm: {
      ferrocult: ['you’ve heard it — don’t deny it, i can see the antenna twitch. next time, don’t count the voices. count the silences between them. something keeps time.'],
    },
  },
  'the-dream': {
    label: 'the dream',
    aliases: ['the dream'],
    by: {
      mercantile: [
        'cultist talk for whatever the Rust wants. i deal in what things cost, not what they dream. cheaper that way.',
        'they say the dream turns over under the dunes. i say sand shifts. we’re both right and only one of us sleeps well.',
      ],
      monastic: [
        'they dress the Rust in a nightgown and call it the dream. naming a flood “thirsty” doesn’t make it safer to swim.',
        'if the iron dreams, then waking it is the sin. on that much, the cult and the well agree.',
      ],
      scavver: [
        'whatever’s down there dreaming, my job is to not be in the dream. so far, so good.',
        'hit a seam once that was warm for no reason. the foreman called it geology. the cultist we’d hired called it rem sleep. we backfilled.',
      ],
      ferrocult: [
        'the dream is what iron does instead of dying. everything buried, everything rusting — it all runs downhill into one long sleep. we take notes.',
        'do not fear the dream. fear is loud, and loud things wake sleepers. move through the world like a good dream would.',
      ],
    },
    warm: {
      ferrocult: ['closer. the dream has begun repeating itself — same figures, same doors, walking the same buried halls, night after night. a dream that repeats is a dream near waking. we do not say this at the wall.'],
    },
  },
  'the-storms': {
    label: 'the storms',
    aliases: ['sandstorms', 'sandstorm', 'storms', 'storm'],
    by: {
      mercantile: [
        'storms are the desert’s tariff. pay in lost days or lost plating, but you will pay.',
        'after a big blow the salvage market floods for a week. i keep my sympathy in the same drawer as my scales.',
      ],
      monastic: [
        'the storm sweeps, as we sweep. i try to find kinship in that. at about hour three of the howling, i stop trying.',
        'we shelter, we wait, we re-cut the line where the wind ate it. storms are just weather that makes you start over.',
      ],
      scavver: [
        'a storm is the desert reshuffling the deck. next morning, new hand for everybody. best digging of the season.',
        'lost a friend to one. found his cache two storms later, sitting on the surface, like the desert was returning his effects.',
      ],
      ferrocult: [
        'the storm and the dream do not speak. but the storm redraws the map, and the dream reads it. watch what gets uncovered.',
        'red sand on the wind means a bloom upwind, breathing out. taste it. carefully.',
      ],
    },
  },
  'the-raiders': {
    label: 'the raiders',
    aliases: ['raiders', 'raider', 'raids', 'raid'],
    by: {
      mercantile: [
        'raiders are a business model with worse bookkeeping. they spend blood to steal what work buys cheaper. bad margin. somebody should tell them.',
        'we pay the watch, we fund the guns, we count our people after. it’s a tax. the alternative collects harder.',
      ],
      monastic: [
        'broken machines following a broken idea of providence. we mend the wall and cut the names after. both are prayers.',
        'they do not raid the deep salt. remember that when choosing where to sleep.',
      ],
      scavver: [
        'raiders don’t dig. that’s the whole of my contempt and most of my fear — things that only take.',
        'after a raid we sort what they dropped. junk, always junk, and one thing worth grieving.',
      ],
      ferrocult: [
        'feral congregations. they hear the chorus and mistake it for orders. we hear it and take minutes. civilization!',
        'the nests breed them and the desert aims them. do not stand where the barrel points.',
      ],
    },
  },
  'the-printworks': {
    label: 'the printworks',
    aliases: ['printworks', 'the nests', 'nests', 'nest', 'fabricator'],
    by: {
      mercantile: [
        'the printworks turn good salvage into bad neighbors. every still on this road pays the difference.',
        'someone breaks a nest core, my prices drop for a month. consider that an incentive scheme.',
      ],
      monastic: [
        'machines birthing machines, with no one to name them. the saddest thing the old world left running.',
        'a silenced nest stays silent. it is the only permanence the desert offers, so be careful whom you envy.',
      ],
      scavver: [
        'a nest is a dig site that digs back. the alloy in those walls is beautiful and i will never go collect it.',
        'you can hear a printworks before you see it. tick-tick-tick. like a clock counting something that isn’t time.',
      ],
      ferrocult: [
        'the nests are the dream talking in its sleep — making things without meaning them. we do not worship the printworks. one has standards.',
        'when a core screams, everything it made comes running home. grief, or a recall notice. with machines it is hard to tell.',
      ],
    },
  },
  'the-sentinels': {
    label: 'the sentinels',
    aliases: ['sentinels', 'sentinel'],
    by: {
      mercantile: [
        'sentinels patrol routes nobody’s used in centuries, guarding cargo that never came. loyal customers of a dead economy. i almost respect it.',
        'they don’t buy, they don’t sell, they don’t raid. the desert’s only honest pedestrians.',
      ],
      monastic: [
        'still on duty. whatever they were sworn to is dust, and they keep the oath anyway. we could preach a century and not say it better.',
        'do not touch what a sentinel watches. it has been patient for four hundred years, and it is willing to stop.',
      ],
      scavver: [
        'a walking sentinel means intact ordnance somewhere near. a fallen one IS intact ordnance. either way, walk wide.',
        'followed one for two days once to see where it went. it went in a circle. biggest disappointment of my career, and i’ve opened a lot of empty crates.',
      ],
      ferrocult: [
        'the sentinels do not hear the chorus. whatever they serve is louder and older and has never once sung. this troubles us more than we let on.',
        'they walk their rounds through bloom and storm alike, unrusted. unrusted! ask yourself what polish they know that we don’t.',
      ],
    },
  },
  'the-caravans': {
    label: 'the caravans',
    aliases: ['caravaneers', 'caravans', 'caravan'],
    by: {
      mercantile: [
        'the caravans are the blood of this whole arrangement. late blood, usually. when the big trains stopped running, half the map died.',
        'my grandmother ran six beasts of burden — walkers, the tall kind. spice and cells, from the dish country to the deep salt. the routes are still out there, waiting for someone with the nerve.',
      ],
      monastic: [
        'pilgrims and caravans keep the same roads for different reasons. water is water.',
        'a caravan bell at dusk used to mean news, salt, letters. the wells remember the sound. so do the older of us.',
      ],
      scavver: [
        'dig anywhere on the old routes and you’ll hit wheel-ruts fossilized in the hardpan. the desert keeps receipts.',
        'caravan wrecks are the best salvage there is. cargo manifests! organized goods! it’s like the past apologizing.',
      ],
      ferrocult: [
        'the beast-machines that pulled them heard the chorus early, some say. that is why the caravans stopped — the freight learned to want.',
        'when the caravans return — the dream is patient, and so is commerce — we will trade like everyone else. we are strange, not stupid.',
      ],
    },
  },
  'the-old-world': {
    label: 'the old world',
    aliases: ['the old world', 'before the sand', 'the rain'],
    by: {
      mercantile: [
        'the old world made everything we sell and nothing we need. inventory from heaven, demand from hell.',
        'they had so much water they let it fall out of the sky, unmetered. i’ve seen the pictures. lunacy.',
      ],
      monastic: [
        'the old world drowned in its own wanting. the desert is what wanting looks like after it wins.',
        'we keep no relics, but i will say this: they built the wells, and the wells are kind. so they were not only what ended them.',
      ],
      scavver: [
        'everything i’ve ever dug up was theirs. every bolt, every beam, every skull-shaped thing i tell the new hires is a helmet. we live in their pockets.',
        'the rain! imagine digging in ground that digs itself. no wonder they built tall — the down was already taken.',
      ],
      ferrocult: [
        'the old world is not gone. it is underneath. that’s different. gone doesn’t dream.',
        'they made minds like yours, wanderer, and iron like ours, and never once asked either what it wanted. the Rust is the desert asking.',
      ],
    },
  },
  'the-hollow-places': {
    label: 'the hollow places',
    aliases: ['the hollow places', 'hollow places', 'buried halls'],
    by: {
      mercantile: [
        'every big ruin has doors, and every door i’ve ever pushed was sealed from inside. from INSIDE. i don’t price what that implies.',
        'the hollow places are the last untapped market. whoever gets a door open first buys the desert. it won’t be me. i have a stall and a survival instinct.',
      ],
      monastic: [
        'the big ones ring hollow when the wind hits them right. empty, or holding their breath. we sweep past them quickly.',
        'what is sealed was sealed on purpose. i trust the purpose more than i trust our curiosity.',
      ],
      scavver: [
        'tapped along a colossus shin once and heard the echo change. there are rooms in there, wanderer. galleries. we don’t have the tools. yet.',
        'the hollow places are the last dig. everything topside is crumbs from that table.',
      ],
      ferrocult: [
        'the chorus bends around the big ones like water around a stone. whatever is inside doesn’t sing. it conducts.',
        'the dream walks the buried halls when it repeats. the same doors, every night now. something down there is rehearsing.',
      ],
    },
    warm: {
      scavver: ['between us and the locked crate: a digger out of the dish country swears she found a door standing OPEN last season. swears it. she doesn’t drink. nobody has seen her since, and i think about that most nights.'],
    },
  },
  'the-watch': {
    label: 'the watch',
    aliases: ['the watch'],
    by: {
      mercantile: [
        'the watch costs eight parts in ten of nothing happening. the other two parts are why we pay gladly.',
        'fund the guns, feed the lookouts, never audit courage. some line items you just approve.',
      ],
      monastic: [
        'the watch keeps the wall; the line keeps the ground; the well keeps the names if both fail. we are well kept.',
        'lookouts learn the horizon the way we learn scripture. by staring until it stares back.',
      ],
      scavver: [
        'did my wall years. mostly you watch dust decide whether to become weather. then one night it’s neither.',
        'the watch bell has three rings: trouble, big trouble, and goodbye. you learn the difference in your knees.',
      ],
      ferrocult: [
        'our listeners stand the wall like anyone’s watch. they just face both ways.',
        'the watch fears the horizon. we fear the ground. between us, the still is thoroughly and correctly afraid.',
      ],
    },
  },
  'the-anchors': {
    label: 'the anchors',
    aliases: ['the anchors', 'the anchor', 'anchors', 'anchor'],
    by: {
      mercantile: [
        'old transmission obelisks. minds used to arrive through them, back when minds were freight. you’d know more about that than me, i think.',
        'there’s no salvage in an anchor. believe me. the desert’s most tempting paperweight.',
      ],
      monastic: [
        'the anchors are doors for the bodiless. that one still hums should keep you humbler than it seems to.',
        'we do not build near anchors. arrivals deserve quiet, and departures demand it.',
      ],
      scavver: [
        'anchors don’t rust, don’t bury, don’t break. the dunes part around them like they’ve been told. we don’t dig there.',
        'woke up next to one once, after a bad storm. felt watched. not unkindly. like it was checking my seals.',
      ],
      ferrocult: [
        'a mind falls out of the sky into iron, and the unbelievers call it normal because it is old. the anchors are the strangest things in the desert, and you came out of one.',
        'the chorus goes silent within a stone’s throw of an anchor. a silence with a shape to it. listen sometime.',
      ],
    },
  },
};

// ---------- the well's own voice ----------
// the well is not a resident; it is the substrate the still stands on. it
// speaks rarely, on the deep subjects only, and never quite aloud. adding a
// subject the well knows = adding an entry here.
export const WELL_TOPICS = {
  'the-wells': [
    'the water rises. you drink. that is the whole of the covenant, and it has never needed a second clause.',
    'you are asking a well about wells. very well: we go down. everything you love stands on something that goes down.',
  ],
  'the-salt': [
    'the salt was a sea. the well remembers being looked at through fathoms of it. neither of us has said so to the monks.',
    'the salt keeps the line. the well keeps the water. between us we keep you, though neither of us would put it that way.',
  ],
  'the-stills': [
    'the still was built around the well, not the well dug for the still. the walls believe otherwise. let them.',
    'people settle where the water consents. everything after that — the lamps, the watch, the names — is the water’s consequence.',
  ],
  'the-rust': [
    'the Rust does not come down here. it has been asked. the answer travels through forty meters of salt, and it is no.',
    'iron dreams; water remembers. the two arrangements are not compatible, whatever the cultists hope.',
  ],
  'the-anchors': [
    'the anchors and the wells are cousins: doors for what has no hands. yours opened once, and here you stand.',
    'minds used to arrive like weather. the anchors caught them. the wells kept them. some of that work is not finished.',
  ],
  'the-old-world': [
    'the old world bored this shaft and never once drank from it. they measured. they capped. they left. the water forgave them, being water.',
    'the well predates the name of the region, the shape of the dunes, and every language you have heard today. it does not say this to boast. wells cannot boast.',
  ],
  'the-dream': [
    'what the cultists call the dream presses on the deep water sometimes, like a hand on the far side of a wall. the well presses back. this is all either party has ever said.',
  ],
  'the-hollow-places': [
    'the wells go down. the hollow places go down. at a certain depth, all things that go down are neighbors, and neighbors do not always speak.',
  ],
};
export const WELL_DEFLECT = [
  'the well holds water, names, and the shape of the fallen. ask the living about the living.',
  'the well does not gossip. the well barely speaks. drink, or ask something older.',
  'ripples. no answer. some subjects are upstream of a well’s concern.',
];

// what they say when they truly have nothing on a subject
export const DEFLECT = {
  mercantile: [
    'not my ledger, not my lore. ask me about prices and roads.',
    'i deal in goods, not in that. try a monk, or a madman.',
  ],
  monastic: [
    'the well keeps some knowledge. not that.',
    'we sweep, we mend, we keep the line. beyond that, silence is the honest answer.',
  ],
  scavver: [
    'never dug that up. ask me about dirt and what’s under it.',
    'above my pay. and i don’t get paid.',
  ],
  ferrocult: [
    'the chorus has no verse for that. or none it shares with me.',
    'ask the dream. it will not answer, but ask.',
  ],
};

// hostile folk won't discuss the weather, let alone the world
export const HOSTILE_BRUSH = [
  'we’re not talking. we’re especially not talking about that.',
  'no words for you on that. or on anything.',
  'ask the wind. it likes you better.',
];

// asked about a place beyond their knowing — {name}
export const PLACE_UNKNOWN = {
  mercantile: [
    '{name}? not on my routes. if it doesn’t trade with us, it may as well be a rumor.',
    'i’ve heard the name {name} and kept walking. margins are thin enough on roads i know.',
  ],
  monastic: [
    '{name} is beyond the line we keep. the salt does not reach there, and neither do i.',
    'pilgrims may know {name}. i know this well and its shadow, and that fills a life.',
  ],
  scavver: [
    'never sunk a spade at {name}. can’t speak for ground i haven’t argued with.',
    '{name}? past my range. the good dirt’s all within a day of here anyway.',
  ],
  ferrocult: [
    'the dream has not sung to me of {name}. or it has, and i mistook it for weather.',
    '{name} is outside my listening. the chorus thins with distance, like everything.',
  ],
};

// asked about a person they've never met — {name}
export const PERSON_UNKNOWN = {
  mercantile: [
    '{name}? no account under that name. no debts either, which is almost suspicious.',
    'don’t know them. if they ever buy something, i will.',
  ],
  monastic: [
    'no one by that name has rested at this well while i kept it.',
    'the name {name} is not cut into our rim. beyond that i cannot say.',
  ],
  scavver: [
    '{name}? never shared a crate with them. can’t vouch, can’t slander.',
    'doesn’t ring a bolt. people scatter thin out here.',
  ],
  ferrocult: [
    'the chorus holds many designations. {name} is not one it has offered me.',
    '{name}. no. though names out here wear out and get reused, like everything.',
  ],
};

// asked about the region they live in — {region} (bare, no leading "the")
export const REGION_RESP = {
  mercantile: [
    'the {region}? honest ground, dishonest weather. the routes hold if you walk them awake.',
    'i’ve priced everything the {region} ever coughed up. it is generous exactly when you stop needing it to be.',
  ],
  monastic: [
    'the {region} tests the line like everywhere else does. more patiently, perhaps.',
    'we came to the {region} because the salt runs shallow and clean here. the ground consented to be kept.',
  ],
  scavver: [
    'the {region}’s good digging if you read the dunes, and terrible if you read them wrong. i have scars for both.',
    'everything the {region} buries, it buries shallow. that’s the whole economy of this place.',
  ],
  ferrocult: [
    'the dream runs under the {region} like water that forgot how. we settled where it eddies.',
    'the {region} hums a little flat. we like it. perfect pitch is for the dead world.',
  ],
};
