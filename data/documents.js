// Document & history extensions, merged into the testimony engine at load.
// Same slot language as js/lore.js: {ruin} {ruinNoun} {ruin2} {dist} {dir}
// {still} {person} {person2} {machine} {region} {detail} {num}

export const DOCUMENT_EXT_BODIES = {
  'SHIFT LOG': [
    'shift log, {ruin}. {person} counted the doors again: one more than yesterday. management says recount. management has not been down here.',
    'night shift, {ruin}. the machines idle sweeter after midnight, like they know the quota sleeps. don’t tell the day crew. it’s ours.',
  ],
  'LETTER': [
    '{person} — sold the cart, kept the mule-bot. walking to {still} by way of {detail}. if the letters stop it means the letters stopped, nothing more. promise me you’ll read it that way.',
    'to my brother at {still}: the {region} is not what they say. it is worse and it is more beautiful and i am not coming home. tell mother both halves.',
  ],
  'MANIFEST': [
    'return manifest, crawler {machine}: empty. driver’s note: delivered everything, collected nothing, saw {ruin} lit at dusk which is impossible. deadheading home the long way around it.',
  ],
  'SURVEY MARKER': [
    'boundary stake {num}. everything {dir} of this line was deeded to people who no longer exist, by an office that no longer exists, on paper that lasted longer than both. the desert honors it anyway, some nights.',
  ],
  'PRAYER CARD': [
    'burned at the edges, still legible: let the wind pass over {still}. let it take the count of us and find the count unchanged.',
  ],
  'BROADCAST FRAGMENT': [
    '…and that concludes the water report. next broadcast at dawn. this station reminds you: {num} days without incident. stay counted, stay kind, stay—',
  ],
  'LEDGER PAGE': [
    'inventory, final: everything priced, nothing sold, nobody came. entered into the record because a record is a kind of company. — {person}, clerk of {still}',
  ],
};

// a wholly new document type
export const DOCUMENT_EXT_TYPES = [
  {
    label: 'WORK ORDER', weight: 1.6, leads: true, needsRuin: true,
    bodies: [
      'work order {num}, reissued: shore the gallery at {ruin}, {dist} {dir}. crew of four requested. crew of four declined, in writing, with reasons. reasons attached. reasons compelling.',
      'standing order, {ruin} maintenance: grease the door that screams. it is load-bearing, the door. so is the screaming, we’ve come to think.',
      'work order, expedited, hand of {person}: whatever is knocking inside the {detail} cistern — schedule it, name it, or seal it. pick one. stop doing all three.',
    ],
  },
];

export const HISTORY_EXT = [
  'the still once voted to move. the well abstained. they stayed.',
  'there is a door in the wall that opens onto nothing. it predates the wall. they built around it, out of respect or caution. same thing here.',
  'a caravan wintered here in the bad year and never left. half the family names date from that season, including the word “family.”',
  '{person} planted iron filings by the gate every spring for thirty years. nothing grew. the planting continues. the point, they say, was never the growing.',
  'the bell is the third bell. nobody discusses the first two.',
  'for one summer, the well echoed a half-second late. the elders speak of it the way others speak of war.',
];

export const EPITAPH_EXT = [
  'sang off-key on purpose', 'never once locked the stash', 'counted the children twice, always',
  'died mid-sentence; the sentence was kind', 'held the gate and the opinion', 'first through every door',
  'made the storm-nights bearable', 'owed nothing, owed by all', 'kept the smallest promises hardest',
];

export const WHISPER_EXT = {
  low: ['…what do you think polish tastes like, to us…', '…the desert rusts. the stars rust. you are not special. you are invited…'],
  mid: ['…we counted your seams last night. you were sleeping. you looked peaceful. eleven…', '…the ones you strip for parts — we remember them. shall we recite…'],
  high: ['…you keep our gifts and scrub our voice. wear the whole argument. come whole…', '…the well remembers your shape. so do we. one of us is more patient…'],
};

export const SIGNAL_EXT = [
  'listen: {person} of the {region} watch left this running for their relief. the relief is {num} years late. the cache is {dist} to the {dir}. consider yourself relieved.',
  'hand-keyed, slow: R-A-T-I-O-N-S. {dist}. {dir}. then, slower: T-A-K-E. T-H-E-M. H-O-M-E. any home. yours will do.',
  'automated depot mind, cheerful: your delivery awaits {dist} to the {dir}! estimated wait: {num} decades. thank you for your patience, valued receiver.',
];
