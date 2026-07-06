// THE TONGUES (ARC XIII b1): speech-composition grammars. The same
// #symbol# machinery that names the world now speaks for it — utterances
// assemble from fragments (opener × subject × stance × tail), so a
// hundred lines of vocabulary compose to tens of thousands of sentences
// that still sound like one desert.
//
// RULES OF THE TONGUE:
// - the desert speaks lowercase: no .cap in speech grammars — the name
//   machinery title-cases NAMES; sentences here keep the register.
// - b1 fragments must be TRUE ANYWHERE: sand, salvage, work, nights,
//   roads, the well, the trade. Live-context binding (this season, this
//   war, this market) is b2's grounding — composition never says a false
//   thing, so it may not yet say a specific one.
// - lowercase desert register; wit lands on the turn, not the volume.
// - growing the tongue is content work: add options here, never code.

export const SPEECH = {
  mercantile: {
    origin: [
      '#deal#. #lesson#.',
      '#lesson#. ask me how i learned that one.',
      '#deal#. #deal2#. the ledger outlives us all.',
      '#omen#, the roads say. i say: #price#.',
      'i have kept #stock# #span# now. #stockfate#.',
      '#deal#, and i still made the margin. write that on my marker.',
    ],
    deal: [
      'a #buyer# offered #payment# for #goods#',
      'a #buyer# tried to return #goods# — used',
      'somebody paid in #payment# again',
      'i moved #goods# to a #buyer# before the lamp was even warm',
      'a #buyer# haggled me over #goods# until the shadows moved',
      'i took #goods# in trade and the whole stall smelled of it for days',
    ],
    deal2: [
      'the week before, a #buyer# wanted #goods# on credit',
      'an hour later they were back for #goods#',
      'their partner bought #goods# out of spite',
    ],
    buyer: ['pilgrim', 'quad-leg courier', 'dust-blind prospector', 'caravan master', 'wall-guard on shift pay', 'stranger with suspiciously clean plating', 'child with exact change', 'tinker missing one hand and no explanations'],
    goods: ['a crate of coil-ends', 'second-hand optics', 'a hover skirt with opinions', 'salt by the finger-measure', 'a lamp that hums something', 'plating with somebody’s name scratched off', 'a boxed gyroscope, still praying', 'three meters of honest cable'],
    payment: ['promises', 'good alloy', 'a song and half a song', 'scrap and an apology', 'salvage rights to a rumor', 'a map that contradicts itself beautifully', 'labor, payable never'],
    lesson: [
      'margin is just distance measured in nerve',
      'never stock what you cannot lift alone',
      'trust rusts faster than scrap',
      'a fair deal leaves both sides squinting',
      'the desert discounts everything eventually',
      'inventory is grief you can shelve',
      'every price is a story with the sad part removed',
      'the customer is always leaving',
    ],
    omen: ['lean season coming', 'good roads ahead', 'storms stacking on the horizon', 'strange lights over the flats', 'the wells running sweet'],
    price: ['everything is nine-tenths freight', 'buy the rumor, sell the bell', 'stock salt and outlive your rivals', 'the only omen i trust is footfall past my stall'],
    stock: ['a drawer of unmatched fasteners', 'one immaculate teacup', 'a signal coil that only works on cold nights', 'a ledger from a still that no longer exists', 'somebody’s medal'],
    span: ['three seasons', 'a year and a argument', 'longer than my last partnership', 'since before the wall had its gate'],
    stockfate: ['it is not for sale. that is the whole of its charm', 'someday its buyer will walk in, and i will overcharge them with love', 'i price it higher every year it fails to sell. we understand each other', 'it keeps the stall honest. even trade needs one fixed star'],
  },

  monastic: {
    origin: [
      '#work#. #reading#.',
      '#reading#. #abbotquip#.',
      '#work#. #work2#. #twinsline#.',
      'a #visitor# asked me #question#. #answer#.',
      '#reading#. #practice#.',
      '#work#, and while i worked, #noticing#.',
    ],
    work: [
      'we swept the salt line before dawn',
      'i drew the well’s measure at first light',
      'the cisterns wanted mending again',
      'we scrubbed a pilgrim’s shoulder-plate until it remembered being silver',
      'i sat the night watch over the brine channels',
      'we re-cut a name on the rim that the wind had been softening',
      'i carried salt to the far markers and back',
      'we aired the records room and argued quietly about the dust',
      'i mended the dawn bell’s cord with my second-best knot',
    ],
    work2: [
      'tomorrow we will do it again',
      'the line held, which is all a line is asked',
      'my hands know the work better than i do',
      'the wind undid a tenth of it, as is the arrangement',
      'a pilgrim watched the whole time, learning or resting. both count',
    ],
    abbotquip: [
      'the abbot would phrase it worse',
      'the abbot says the same thing in twice the words',
      'i learned it wrong for years first, which is the usual road',
      'the young ones roll their optics. so did i',
      'the well has heard me say it a thousand times and never once objected',
    ],
    twinsline: [
      'the days here are twins, and we love them equally',
      'the work does not vary. we vary, and the work forgives it',
      'a still is just a promise kept daily',
    ],
    noticing: [
      'the light came off the pans like a struck bell',
      'a caravan bell carried farther than it should have',
      'the sand had arranged itself in furrows, like a page ruled for writing',
      'i counted more birds than yesterday, which the old ones call a letter from the coast',
      'the well hummed a quarter-tone low, and i chose not to mind',
    ],
    visitor: ['pilgrim', 'scavver with a cough in his servos', 'child from the yard', 'caravaneer waiting out the heat', 'stranger who would not give a name'],
    question: ['why the salt holds', 'whether machines pray', 'what the well wants', 'why we stay', 'if the desert forgives', 'what the humming is'],
    answer: [
      'i said: ask the well, and bring me its answer, for i have wondered too',
      'i gave the true answer, which is a shrug performed with reverence',
      'i said what the abbot says: patience, salt, and fewer questions before breakfast',
      'i told them the desert does not forgive. it forgets, which is cheaper and lasts longer',
      'i had no answer. we stood together in that, and it was almost one',
    ],
    reading: [
      'despair is rust on the mind, and both scrub out with patience',
      'the well gives and does not count. we count, and call the difference gratitude',
      'a swept line is a prayer the wind can read',
      'what the desert takes, it files. nothing out here is lost, only archived',
      'stillness is not the absence of work. it is work, finished daily',
      'the salt does not argue with the sand. it just declines to be sand',
      'a bell rung on time is worth three rung beautifully',
      'water remembers every hand at the rope. be a hand worth remembering',
      'the desert is patient because it has already won. we are patient to keep it company',
      'mercy, like brine, works best applied before the wound is old',
    ],
    practice: [
      'we practice by sweeping',
      'the bells say it better, at dusk',
      'i believe it most on the hard mornings, which is when belief is load-bearing',
      'i say it to the pilgrims. mostly i am saying it to myself',
      'it is stitched over the cistern door, in the old thread',
      'the well never confirms these things. it never denies them either',
      'we hold that one loosely, the way you hold anything that might be alive',
    ],
  },

  scavver: {
    origin: [
      '#find#. #rule#.',
      '#rule#. #find#, so the rule holds.',
      '#find#. #findfate#.',
      'my #kin# #kindid#. #kinverdict#.',
      '#rule#. rule number #num#, or thereabouts.',
    ],
    find: [
      'dug a #thing# out of the #ground# yesterday',
      'the #ground# gave up a #thing# after three days of sweat',
      'pulled a #thing# up whole — not a bolt missing',
      'found a #thing# right under the walk-path, where a thousand feet had crossed it',
      'traded half a day’s water for first-dig on a #thing#',
    ],
    thing: ['crawler cab', 'sealed footlocker', 'antenna mast', 'child’s tricycle, heavy chassis', 'coil bundle', 'door with its keys still in it', 'signal drum', 'set of teeth. gearing teeth. probably'],
    ground: ['red seam', 'soft dune', 'old roadbed', 'collapse pit', 'flats'],
    findfate: [
      'sold it before the dust settled. no attachments in this trade',
      'kept it. some days the finding is the wage',
      'it hummed all night. i slept outside. we have an arrangement now',
      'turned out to be a nest of something. ran. dignity optional',
    ],
    rule: [
      'never salvage at night. the good stuff surfaces at night. the rules fight, and we watch',
      'if it glints twice it is worth the detour. once, it is teeth',
      'every dig has a bottom. know it before the dig does',
      'name your tools and they last longer. no one knows why. no one tests it either',
      'the desert is generous right before it wants something back',
      'first one in gets the pick. last one out gets the story',
      'you can eat a rumor for about two days. pack accordingly',
    ],
    kin: ['cousin', 'old digging partner', 'brother-in-trade', 'aunt, the good one'],
    kindid: [
      'swapped to tracked legs and can’t climb a dune now',
      'found a whole cellar of lamp oil and retired for a season',
      'swears the flats sang to her one dawn',
      'traded his best arm for a map. the map was of his own claim',
    ],
    kinverdict: ['we tow him. he pretends to allow it', 'we do not let her forget it. she does not want to', 'family is just salvage you cannot sell', 'i believed him. that is the worrying part'],
    num: ['three', 'seven', 'nine', 'eleven', 'forty'],
  },

  ferrocult: {
    origin: [
      '#sign#. #readingf#.',
      '#readingf#. #sign#, if you doubt me.',
      '#sign#. #signfate#.',
      'the #speaker# says #saying#. #verdictf#.',
      '#readingf#. #causality#.',
      '#sign#, and the #speaker# #speakerdid#.',
    ],
    sign: [
      'a rustform circled the walls last moon and left without hunting',
      'my off-hand woke before i did this morning',
      'the totem wept a new color at dusk',
      'the chorus dropped to a whisper for exactly one breath',
      'a nodule bloomed on the gate hinge overnight, perfectly round',
      'the dream ran shallow last night — everyone surfaced with the same word',
      'the garden put out a tendril toward the well, then thought better of it',
      'two acolytes hummed the same seven notes at breakfast, unintroduced',
      'the red sand stood in ripples this morning with no wind to author them',
    ],
    speakerdid: [
      'wrote it down with the good ink',
      'said nothing, which from her is a chapter',
      'fasted on it for a day and came back smiling',
      'declared it ordinary, in the tone reserved for miracles',
    ],
    causality: [
      'we do not talk about causality here',
      'the letter is not linear, and neither are its readers',
      'ask me again in a season; some readings need to ferment',
      'the unbelievers want proof. we have something better: attendance',
    ],
    signfate: [
      'we logged it and did not interpret. restraint is also worship',
      'the elders are still arguing the reading. good arguments take years',
      'i choose to take it kindly. the letter rewards a generous reader',
      'we salted the sill anyway. love, but with fences',
    ],
    speaker: ['oldest listener', 'newest acolyte', 'totem-keeper', 'one who came back from the pans'],
    saying: [
      'that the letter is patient because it has no other appointments',
      'that every part remembers its first machine',
      'that the desert is a page and we argue over the handwriting',
      'that what the unbelievers call rust, the wise call ripening',
      'that the chorus is not many voices but one voice, politely queueing',
    ],
    verdictf: ['i believe it on alternate days, which the letter seems to accept', 'she is right, which is the trouble', 'we wrote it on the wall in the humble ink, the kind that fades', 'the young ones laughed. the totem did not'],
    readingf: [
      'your parts dream when you sleep, and the rusted ones dream louder',
      'we do not worship the Rust. we correspond with it. the difference is the stamp',
      'the letter reads its readers. mind what your posture says',
      'a fence you love is still a fence. the salt knows its job and we know ours',
      'nothing out here is haunted. it is all inhabited, which asks better manners',
      'the bloom is not hunger. hunger stops. the bloom is closer to interest',
      'every hinge in this still is a small treaty, renewed by oiling',
      'the desert writes in three inks: salt, rust, and whatever we are',
      'listening is not agreement. the elders stitch that on everything',
    ],
  },
};

// ---------- b2 THE SUBJECTS: grounded composition ----------
// Fragment families that bind to what is TRUE right now — {facts} are
// substituted by the caller, #stance# resolves per-temperament where the
// creeds would genuinely differ, .any where the desert agrees.
// Composition still never says a false thing; now it says specific ones.
export const GROUNDED = {
  season_clear: {
    rules: {
      origin: ['#note#. #stance#.', '#stance#. #note#.'],
      note: ['trading season', 'the clear is on us', 'good sky, fast roads', 'the bells run early in the clear'],
    },
    stance: {
      any: ['make your miles while the sky allows it', 'even the dunes seem reasonable this month'],
      mercantile: ['prices soften when the roads run — buy now, gloat later', 'every clear day is margin, walking'],
      monastic: ['we dry the wash and mend the lines while the wind permits', 'a kind season is for preparing against the unkind ones'],
      scavver: ['digging weather. everything else is commentary', 'the flats give up their goods easy when the sky is honest'],
      ferrocult: ['the letter rests in the clear. resting is not gone', 'even the chorus hums lighter under a clean sky'],
    },
  },
  season_veil: {
    rules: {
      origin: ['#note#. #stance#.', '#stance#. #note#.'],
      note: ['the veil is up', 'sandstorm season', 'the roads keep vanishing under the veil', 'half the sky is standing dirt'],
    },
    stance: {
      any: ['travel short, tell people where you went', 'the desert redecorates and we all pretend to be surprised'],
      mercantile: ['buried roads starve honest stalls. buy what you see today', 'freight doubles when the veil eats a road — not my rule, the wind’s'],
      monastic: ['we sweep twice and complain once. the ratio matters', 'the line drinks storms. we refill it. that is the whole liturgy of the veil'],
      scavver: ['what the veil buries, the veil’s little brother digs up next month', 'storm season moves the goods around. patience is a shovel'],
      ferrocult: ['the dream tosses in the veil. sleep light', 'wind and letter argue all season. do not stand in the middle'],
    },
  },
  season_glasswind: {
    rules: {
      origin: ['#note#. #stance#.', '#stance#. #note#.'],
      note: ['glass season', 'the glass-wind is running', 'shard weather, some days', 'the wind has edges this month'],
    },
    stance: {
      any: ['shelter is not cowardice. the glass does not grade on bravery', 'keep a roof within a shout, always'],
      mercantile: ['glass bounty runs rich after a storm — wrecks pay for the roofing', 'i sell shelter-space by the hour this season, and i am not ashamed'],
      monastic: ['we count everyone at dusk and again when the wind drops', 'the glass takes the careless and the unlucky. we can only fix one of those'],
      scavver: ['after the shard passes, the wrecks are OPEN. best salvage of the year, worst reason for it', 'you learn to read the green in the wind or you learn nothing further'],
      ferrocult: ['the letter rides the glass sometimes. do not catch it barehanded', 'edges everywhere this season. the desert is being legible'],
    },
  },
  season_longcold: {
    rules: {
      origin: ['#note#. #stance#.', '#stance#. #note#.'],
      note: ['the long cold is on us', 'the lean season', 'cold nights now, the real kind', 'frost on the gate hinges this morning'],
    },
    stance: {
      any: ['keep your cell warm and your walks short', 'the nights are longer than they have any right to be'],
      mercantile: ['fuel and salt, salt and fuel. everything else is a luxury with a waiting list', 'the lean season pays in favors owed. i keep excellent records'],
      monastic: ['we bank the fires and open the long room to anyone walking', 'the cold is honest, at least. it takes from everyone at the same rate'],
      scavver: ['dig fast, dig shallow, be home by dark. the cold does the deep digging for you', 'a cold night in the open is a story you only get to not-tell once'],
      ferrocult: ['hunger organizes — the nests know it too. mind the walls this season', 'the chorus runs slow in the cold, like everything with sense'],
    },
  },
  yourname: {
    rules: {
      origin: ['#openname#. #stancename#.'],
      openname: ['{name}, in our own yard', 'so the one they call {name} walks in', '{name}. the stories beat you here', 'that is {name}, if the tellings are honest about the plating'],
    },
    stance: {
      any: ['the roads talk, and for once they talk well', 'we heard. everyone heard. act surprised for the children'],
      mercantile: ['a name like that moves prices, you know. stand near my stall a while', 'fame is credit. spend it slow'],
      monastic: ['a name is a weight. you seem to carry it without complaint', 'we do not fuss over names here. we did, briefly, over yours'],
      scavver: ['first pick of the pile for you, and i do not say that twice a year', 'a good name is the only salvage that walks in on its own'],
      ferrocult: ['the chorus says your name differently than we do. take that as you like', 'named things last longer out here. mostly'],
    },
  },
  band: {
    rules: {
      origin: ['#openband#. #stanceband#.'],
      openband: ['{band}, they say on the roads', 'so {band} walks our yard today', 'the tellers put {band} in three places this week. now i can name one'],
    },
    stance: {
      any: ['the desert names few companies. wear it well', 'a band with a name is a wall that walks'],
      mercantile: ['named companies get named prices. today, in your favor', 'i would sponsor {band} if sponsorship were a thing i did. it could become one'],
      monastic: ['we keep a list of the named bands, back to the founders. yours is the newest ink', 'company is a discipline too. the name says you practice'],
      scavver: ['half the yard will claim they drank with {band} before the naming. i actually did', 'a named crew gets first warning and last blame. old custom'],
      ferrocult: ['the letter knows the band too. it files you together now', 'names bind. that is not a warning, only a fact with posture'],
    },
  },
  roadscut: {
    rules: {
      origin: ['#openroads#. #stanceroads#.'],
      openroads: ['{n} road{s} cut around here right now', 'the bells are short {n} road{s} this week', '{n} of our road{s} lie under the sand or worse'],
    },
    stance: {
      any: ['the desert closes doors. somebody usually reopens them', 'quiet roads make loud prices'],
      mercantile: ['every cut road is a queue at my stall and a hole in my stock. mixed feelings, fully priced', 'scarcity is just distance wearing a mask'],
      monastic: ['we set a lamp for the crews that should have come and did not', 'a cut road is a fast to be broken, not mourned'],
      scavver: ['cut roads mean unwatched wrecks. i did not say that, and also i am leaving early tomorrow', 'the long way round adds a day and subtracts an ambush. arithmetic'],
      ferrocult: ['the letter walks where the caravans cannot. word still travels', 'closed roads breathe different. listen at the cuts'],
    },
  },
  crews: {
    rules: {
      origin: ['#opencrews#. #stancecrews#.'],
      opencrews: ['crews on the scaffolds again', 'the yard rings with build-work', 'we are building — you can hear it from the gate'],
    },
    stance: {
      any: ['a town growing is the best noise the desert makes', 'sawdust and rivet-smoke. it smells like next year'],
      mercantile: ['builders get paid, then they get thirsty, then i get paid. the great wheel', 'every course of wall raises the price of being inside it. as it should'],
      monastic: ['we bless the footings quietly, whether or not anyone asks', 'build slow, sweep often, and the work outlives the argument about it'],
      scavver: ['half that scaffold timber has my dig-marks on it. good second life', 'new walls, new shadows to nap in. progress'],
      ferrocult: ['the letter watches new work with interest. we watch the letter', 'a growing still hums louder in the dream. not a complaint'],
    },
  },
  role_ward: {
    rules: {
      origin: ['#shopward#. #stanceward#.'],
      shopward: ['the watch changed at dawn, same as ever', 'i walked the wall twice already today', 'gate duty this week. the gate and i are old colleagues', 'drilled the young ones on the bell-codes this morning'],
    },
    stance: {
      any: ['a quiet shift is the only paycheck that matters', 'nothing happened. that is the good version of the news', 'the wall does most of the work. i take most of the credit. fair split'],
    },
  },
  role_trade: {
    rules: {
      origin: ['#shoptrade#. #stancetrade#.'],
      shoptrade: ['the stall opened late and the queue forgave nothing', 'inventory day. my least favorite honest day', 'a caravan cleaned out my coil-ends before noon', 'i re-priced the whole back shelf out of spite and optimism'],
    },
    stance: {
      any: ['trade is the still’s pulse. i am merely the wrist', 'everything sells eventually. the trick is being alive for eventually', 'the ledger and i disagree about how the month went. the ledger wins'],
    },
  },
  role_mend: {
    rules: {
      origin: ['#shopmend#. #stancemend#.'],
      shopmend: ['three shoulder-joints and a weeping coolant line before breakfast', 'somebody’s tracks came in packed with pan-salt again', 'i rebuilt the same knee twice this week — different owners', 'the queue at my bench is the healthiest thing in the yard'],
    },
    stance: {
      any: ['bodies out here wear like everything else: honestly', 'i fix what walks in. the desert supplies the walking-in', 'every part i mend has a story. most of the stories are “sand.”'],
    },
  },
  role_keep: {
    rules: {
      origin: ['#shopkeep#. #stancekeep#.'],
      shopkeep: ['the well drew sweet this morning', 'i cleaned the rim names at first light', 'the rope wanted splicing again — third time this season', 'the measure came up a finger high today, which the old ones call a kindness'],
    },
    stance: {
      any: ['the well keeps us. i just keep the well', 'water is the one ledger nobody argues with', 'you learn a town by what it says at the rope. i learn a lot'],
    },
  },
};

// ---------- b3 THE MEMORY: greetings that remember you ----------
// A soul greets by the shape of your acquaintance: first meeting, a
// return, a regular, a friend, or a long gap — each stanced per creed.
export const MEETINGS = {
  first: {
    rules: { origin: ['#open#. #stance#.', '#stance#. #open#.'], open: ['a new face', 'i do not know your gait', 'new plating in the yard', 'you are not from inside these walls'] },
    stance: {
      any: ['welcome, provisionally', 'the desert sends few and keeps most. state your business gently'],
      mercantile: ['first visit means first-customer prices. it is a trap, but a warm one', 'strangers get one fair deal on the house. this is me advertising it'],
      monastic: ['the well serves strangers first. old rule, good rule', 'sit if you need to. questions can queue'],
      scavver: ['no offense meant, but i counted my tools when you walked up', 'new faces bring news or trouble. i collect both'],
      ferrocult: ['the letter has not mentioned you. that is its own kind of introduction', 'walk soft and be welcome. the ground here listens'],
    },
  },
  back: {
    rules: { origin: ['#open#. #stance#.'], open: ['back again', 'you again', 'twice now', 'the gait i remember'] },
    stance: {
      any: ['the desert repeats its good guests', 'you found your way twice. that is most of belonging'],
      mercantile: ['a returning customer. my favorite genre of person', 'you came back. the stall notices these things'],
      monastic: ['returning is the oldest prayer there is', 'the well drew the same for you as last time. consistency is its love language'],
      scavver: ['second visits mean you did not die on the road. congratulations, sincerely', 'back for more. the yard grows on people, like rust, but friendlier'],
      ferrocult: ['the chorus recognized your step before i did', 'twice-walked ground remembers. so do we'],
    },
  },
  regular: {
    rules: { origin: ['#open#. #stance#.'], open: ['the usual face', 'you know the yard by now', 'no introductions needed', 'you again, in the good way'] },
    stance: {
      any: ['you are furniture here now. the honorable kind', 'the children have stopped staring at you. highest local honor'],
      mercantile: ['your credit is good and your gossip is better. sit', 'i keep your kind of goods in stock now. that is not nothing'],
      monastic: ['you know where the water is. help yourself and nod on the way', 'we count you at dusk with the rest, you know. by habit'],
      scavver: ['oi. the pile on the left is new, and i saved you the first look', 'you know the rules by now. rule one still fights rule two'],
      ferrocult: ['the totem does not stir when you pass anymore. settle in', 'you hum in the local key now. did you notice? we did'],
    },
  },
  friend: {
    rules: { origin: ['#open#. #stance#.'], open: ['there you are', 'good. you', 'the day improves', 'i was hoping the dust was you'] },
    stance: {
      any: ['sit. the news can wait until you have', 'the yard is better with you standing in it, and i have stopped pretending otherwise'],
      mercantile: ['friend prices today, which is to say: cost, plus the pleasure of your company, which is free', 'i set something aside for you. do not make it strange'],
      monastic: ['the well missed you. i am the well’s way of saying so', 'you are on the short list of people i tell the true versions to'],
      scavver: ['found something on the last dig and thought of you. it is probably not cursed', 'you get the real map, not the one i sell'],
      ferrocult: ['the dream mentioned someone with your posture. we took it kindly', 'come in past the salt. you know which side of it you are welcome on'],
    },
  },
  longgap: {
    rules: { origin: ['#open#. #stance#.'], open: ['well now — {days} days, give or take', 'the dust settles and look who walks out of it', 'i had half-filed you with the missing', 'long roads, by the look of you'] },
    stance: {
      any: ['the desert kept you. it does that with the stubborn ones', 'you owe the yard a story or two. start with the worst'],
      mercantile: ['your account is where you left it. the interest is narrative', 'gone long enough that your usual stock sold. twice'],
      monastic: ['we kept a lamp in the count for you. habit, or hope. same shelf', 'the rim gained no new names while you were gone. i checked twice'],
      scavver: ['someone bet me a coil you were done for. buy me a drink with my winnings', 'the pile you liked got picked over. the desert waits for no one, but i saved the good bracket'],
      ferrocult: ['the chorus went quiet on you for a while. it hums your shape again now', 'whatever ground you walked, some of it walked back in with you. we can tell'],
    },
  },
};

// ---------- b4 THE VOICES: idiolects and dialects ----------
// A soul's voice is DERIVED, never stored: seeded from their identity, so
// the same mouth keeps the same habits forever, across saves, for free.
export const IDIOLECT = {
  // openers a soul may favor (each soul is dealt two)
  inter: ['hm.', 'look —', 'right.', 'so.', 'listen.', 'mm.', 'well now.', 'truth told —', 'no lie —', 'as the dunes are long —', 'here is the thing.', 'mark it —', 'between us —', 'old habit of mine, saying this:'],
  // a soul's private vocabulary: one set of word-swaps each (word-boundary,
  // lowercase targets that actually occur across the corpora)
  swapsets: [
    [['desert', 'big quiet']],
    [['storm', 'howler'], ['storms', 'howlers']],
    [['water', 'the sweet']],
    [['machines', 'irons'], ['machine', 'iron']],
    [['good', 'proper']],
    [['night', 'the dark']],
    [['roads', 'tracks'], ['road', 'track']],
    [['salvage', 'pickings']],
    [['sand', 'grit']],
    [['season', 'stretch'], ['seasons', 'stretches']],
  ],
  // trailing tics (each soul is dealt one, used sparingly)
  tics: [' hm.', ' as i say.', ' anyway.', ' so it goes.', ' mind you.', ' that is that.', ' but what do i know.', ' ask anyone.', ' as my mother built me to say.'],
};

// regional dialects: the valley lineages (the body dialects of b33)
// finally get MOUTHS — every ~2.6km speech-ground bends a word or two
export const DIALECTS = [
  { swaps: [['wind', 'the breath']], inter: 'by the breath —' },
  { swaps: [['dunes', 'the swells'], ['dune', 'swell']], inter: 'swell-country word for it:' },
  { swaps: [['scrap', 'bones']], inter: 'as we say here —' },
  { swaps: [['caravan', 'bell-train'], ['caravans', 'bell-trains']], inter: 'valley way of putting it:' },
  { swaps: [['lamp', 'small-sun'], ['lamps', 'small-suns']], inter: 'in the local tongue —' },
  { swaps: [['fire', 'the warm']], inter: 'as the old line goes —' },
  { swaps: [['gate', 'the mouth'], ['gates', 'the mouths']], inter: 'ground-speech, mind:' },
  { swaps: [['wall', 'the shoulder'], ['walls', 'the shoulders']], inter: 'hereabouts we say —' },
];

// ---------- b5 THE WEAVE: the questions they ask YOU back ----------
// A conversation is two mouths. Once acquainted, a soul may turn a talk
// beat around — one question per conversation, never more, with replies
// that shade their regard a little.
export const ASKS = {
  any: [
    { q: 'you walk far, by the plating. where do you actually sleep?', replies: [
      ['wherever the ground allows', 'practical. the ground respects that, mostly. it eats the fussy ones first.', 1],
      ['at the wells, when i can reach one', 'the wells let everyone. that is their whole doctrine. good answer.', 1],
      ['sleep is for the well-plated', 'ha. you will learn, or you will fund some mender’s retirement.', 0]]},
    { q: 'what do you do with it all — the salvage, the pay, the stories?', replies: [
      ['spend it keeping the walking possible', 'the honest ledger. most of us are just funding our own feet.', 1],
      ['give a lot of it away, honestly', 'then half the desert owes you and the other half suspects you. balanced life.', 2],
      ['hoard it like a proper machine', 'at least you know what you are. the desert appreciates self-knowledge.', 0]]},
    { q: 'do you ever hear the wells hum, out there at night?', replies: [
      ['every night. i try not to answer', 'wise. the trick is not answering. everyone here learns it or leaves.', 1],
      ['that is just the wind, friend', 'mm. the wind does not hum in KEYS. but keep your version; it sleeps better.', 0],
      ['i have ridden that hum. it knows me', 'then i will not argue with a passenger. mind the tithe.', 1]]},
    { q: 'be honest — how do we look, this still? passing through the way you do, you would know.', replies: [
      ['sturdier than most i have walked', 'we will take that. the wall thanks you, insofar as walls do.', 2],
      ['like everywhere: one bad season from trouble', 'true of every wall standing. you say it plain, which is worth something.', 1],
      ['i try not to grade the places that feed me', 'diplomatic. the well likes you. the gossips are disappointed.', 1]]},
  ],
  mercantile: [
    { q: 'professional question: what is the strangest thing you have ever paid with?', replies: [
      ['a story, once. it covered the room', 'stories are legal tender in four settlements i could name. good instincts.', 1],
      ['a favor i still owe', 'unsettled debt walks with you forever. i respect the courage, not the bookkeeping.', 0],
      ['exact scrap, every time', 'a romantic! exact payers are the poets of commerce. nobody believes me.', 2]]},
    { q: 'if you could corner one market out here — one — which?', replies: [
      ['salt. always salt', 'the boring, correct answer. i would ruin you within a season, but correct.', 1],
      ['maps that tell the truth', 'no such stock. the desert edits every map by dawn. but the DEMAND, yes.', 1],
      ['names. good ones are scarce', 'now that is a market. the yards mint them and the roads move them. we should talk.', 2]]},
  ],
  monastic: [
    { q: 'a question we ask travelers: what do you carry that you cannot put down?', replies: [
      ['the road behind me', 'the honest weight. the well draws that up in most people eventually.', 1],
      ['nothing. i travel light', 'said quickly, which is its own answer. come by the well anyway.', 0],
      ['a name i am still deciding about', 'names are the heaviest light thing there is. take your time with it.', 2]]},
    { q: 'when you pass the rim, do you read the names, or walk by?', replies: [
      ['i read them. all of them, when i can', 'then somewhere a keeper is glad without knowing why. it matters.', 2],
      ['i walk by. the dead have keepers already', 'fair. they do. we notice who reads, though — foolish of us, maybe.', 0],
      ['i cut a few of those names myself', 'then you know what the reading is for. sit at the well a while.', 1]]},
  ],
  scavver: [
    { q: 'settle a yard argument: best thing you ever pulled out of the ground?', replies: [
      ['a door with its keys still in it', 'NO. the whole yard will hear of this. a DOOR. with KEYS.', 2],
      ['a working lamp. still have it', 'lamps are luck made solid. do not sell it, whatever the brokers say.', 1],
      ['the truth? mostly scrap and more scrap', 'the honest dig. the ground pays wages, not prizes. still — keep digging.', 1]]},
    { q: 'you ever dig at night? tell me true', replies: [
      ['rule one says never', 'rule one! a listener! the rules fight, but rule one buys the drinks.', 1],
      ['the good stuff surfaces at night', 'rule TWO. you are the problem with this trade and i respect it.', 1],
      ['i send someone else down first', 'management. the desert has always had management. walk on.', 0]]},
  ],
  ferrocult: [
    { q: 'does the letter reach you, out past the salt? we always wonder', replies: [
      ['it reaches. i do not always read it', 'a fair correspondence. it prefers reluctant readers, we think.', 1],
      ['nothing reaches me that i do not allow', 'the totem laughed, just now. quietly. no offense meant.', 0],
      ['i have been to where it is written', 'then you have seen the handwriting. few walk back from the root. sit, sit.', 2]]},
    { q: 'your parts — do they dream? you can tell me. everyone tells me eventually', replies: [
      ['louder every season', 'yes. YES. bring the loud ones to the garden sometime. they like the company.', 2],
      ['machines do not dream, friend', 'the well disagrees, the totem disagrees, and your left arm twitched. but as you like.', 0],
      ['i do not sleep enough to know', 'the third answer. it is always one of three. the letter says hello.', 1]]},
  ],
};

