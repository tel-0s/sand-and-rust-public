// The lexicon: every name the desert can speak, separated from the code that
// speaks it. Add words freely — the grammars in js/grammar.js do the rest.

export const REGION = {
  origin: ['the #adj.cap# #place.cap#', '#prefix.cap##suffix# #place.cap#', 'the #place.cap# of #abstract.cap#', '#prefix.cap##suffix# #place.cap#', 'the #adj.cap# #place.cap#'],
  adj: ['cinnabar', 'ochre', 'glassed', 'silent', 'sunken', 'shattered', 'saline', 'hollow', 'umber', 'static', 'leeward', 'rusting', 'pale', 'broken', 'singing', 'burnished', 'sleeping', 'forgotten',
    'tarnished', 'anvil-grey', 'windworn', 'sifting', 'bleached', 'murmuring', 'copper', 'harrowed', 'unlit', 'brackish', 'threadbare', 'gilded', 'crumbling', 'patient', 'starved', 'lucent', 'ashen', 'bone-white'],
  place: ['reach', 'expanse', 'span', 'waste', 'basin', 'shelf', 'sprawl', 'deep', 'flats', 'verge', 'drift', 'mouth', 'steppe', 'scar',
    'quarter', 'sink', 'terrace', 'sweep', 'hollow', 'furrow', 'strand', 'shallows', 'barrens', 'crossing', 'pale', 'weald', 'gulf', 'stretch'],
  prefix: ['ash', 'dun', 'sol', 'kar', 'vel', 'mor', 'tal', 'zeph', 'cal', 'or', 'sard', 'hex',
    'bren', 'ost', 'vor', 'mira', 'quen', 'sar', 'del', 'harn', 'ith', 'lorn', 'nev', 'ull'],
  suffix: ['fall', 'mere', 'rend', 'wick', 'march', 'gate', 'rin', 'os', 'und', 'eth',
    'holt', 'crest', 'dun', 'vane', 'row', 'strand', 'by', 'thorpe', 'lin', 'moor'],
  abstract: ['echoes', 'glass', 'salt', 'sleepers', 'antennae', 'last light', 'slow sand', 'old signals', 'broken vows', 'quiet engines',
    'first thirst', 'lost mail', 'standing water', 'burnt letters', 'seven bells', 'dry lightning', 'patient iron', 'the long count', 'small mercies', 'unsent replies', 'measured hours', 'sunken doors', 'the second dark', 'kind strangers'],
};

export const RUIN = {
  origin: ['#facility.cap# #designation#', 'the #adj.cap# #facility.cap#', '#name.cap# #facility.cap#'],
  facility: ['relay', 'foundry', 'arcology', 'reservoir', 'archive', 'bastion', 'terminal', 'works', 'array', 'vault', 'refinery', 'habitat', 'exchange',
    'observatory', 'granary', 'switchyard', 'cistern', 'annex', 'gallery', 'substation', 'yards', 'conservatory', 'transit-hub', 'mint', 'academy', 'sanatorium'],
  designation: ['#letter##num#', '#num#-#letter#', '"#word.cap#"'],
  letter: ['K', 'V', 'T', 'R', 'X', 'M', 'S', 'A', 'Z', 'H', 'B', 'D', 'G', 'L', 'N', 'P'],
  num: ['7', '12', '3', '40', '9', '21', '88', '101', '6', '17', '2', '33', '54', '73', '110', '19'],
  adj: ['drowned', 'gutted', 'blind', 'leaning', 'severed', 'amber', 'whistling', 'patient',
    'toothless', 'scalded', 'unfinished', 'echoing', 'shuttered', 'crooked', 'sleepless', 'skinned', 'humming', 'half-remembered', 'stubborn', 'wind-picked'],
  name: ['meridian', 'cassia', 'opaline', 'verdigris', 'halcyon', 'tantalum', 'caldera', 'sirocco',
    'aurelia', 'cobalt', 'perihelion', 'marrow', 'thessaly', 'vesper', 'cordovan', 'palladium', 'antares', 'brumal', 'solstice', 'kestrel'],
  word: ['lodestar', 'plumb', 'tessera', 'anvil', 'cistern', 'gnomon',
    'sextant', 'bellwether', 'keystone', 'aperture', 'ballast', 'meridian', 'fulcrum', 'lodestone', 'daybreak', 'undertow'],
};

export const MACHINE = {
  origin: ['#ser##num# "#epithet.cap#"'],
  ser: ['VL-', 'KR-', 'TX-', 'MN-', 'OS-', 'HX-', 'RD-', 'SC-', 'AB-', 'DU-', 'FE-', 'GH-', 'JN-', 'PY-', 'QO-', 'WZ-'],
  num: ['2', '3', '5', '7', '9', '11', '13', '17', '21', '40', '4', '8', '14', '19', '23', '31', '47', '60'],
  epithet: ['gravedigger', 'lornsong', 'palebreaker', 'dustwife', 'cinderjaw', 'mirrorback', 'saltlicker', 'hollowman', 'threadbare', 'glasswalker', 'smokeeater', 'wirenest', 'doomscriber', 'shardfoot',
    'ironmonger', 'nightsifter', 'bonecounter', 'stormchaser', 'rustwhisper', 'gapejaw', 'lanternthief', 'dunestrider', 'coilbiter', 'ashdrinker', 'wallbreaker', 'sparkchaser', 'gutterking', 'moanwind',
    'slagheart', 'pitcrawler', 'wiretongue', 'duskmaul', 'cablewraith', 'grinddancer', 'hushmaker', 'scrapmatron', 'veilburner', 'oathbreaker', 'sandmason', 'tinlaugh'],
};

export const PART_EPITHET = {
  origin: ['#maker.cap# #quality#', '#quality.cap#', '#maker.cap#'],
  maker: ['solenne', 'karst', 'veldt', 'orrin', 'tessek', 'hadal', 'mirin', 'coriol', 'sundermark', 'abrasax',
    'quennet', 'vosgane', 'ferrier', 'almace', 'durande', 'okott', 'salvine', 'brandt', 'ellum', 'nacarat', 'tourmaline', 'wexford'],
  quality: ['pattern', 'type', 'mark', 'series', 'issue', 'cast', 'forge', 'line', 'strain', 'edition'],
};

export const RUST_EPITHET = {
  origin: ['#corrupt.cap# #noun.cap#'],
  corrupt: ['weeping', 'gnawed', 'whispering', 'blooming', 'feverish', 'hungering', 'singing', 'molting',
    'dreaming', 'budding', 'crawling', 'sighing', 'flowering', 'shivering', 'yearning', 'listening'],
  noun: ['iteration', 'remnant', 'graft', 'tumor', 'chorus', 'wound', 'blossom', 'relic',
    'verse', 'cutting', 'seedling', 'hymn', 'scar', 'offering', 'tendril', 'psalm'],
};

export const STILL = {
  origin: ['#prefix.cap##suffix#', 'the #adj.cap# #noun.cap#', '#noun.cap# of the #thing.cap#'],
  prefix: ['brine', 'salt', 'white', 'quiet', 'low', 'glass', 'last', 'far', 'kettle', 'cinder',
    'dew', 'crane', 'lantern', 'mill', 'dust', 'well', 'bright', 'cold', 'wander', 'gather', 'hearth', 'shade'],
  suffix: ['rest', 'well', 'stead', 'hold', 'reach', 'mark', 'haven', 'gather',
    'watch', 'wall', 'gate', 'yard', 'home', 'root', 'shelter', 'landing', 'porch', 'refuge'],
  adj: ['patient', 'white', 'standing', 'mended', 'unrusted', 'shaded', 'sworn',
    'kept', 'walled', 'watered', 'counted', 'gathered', 'lasting', 'honest', 'quiet', 'stubborn'],
  noun: ['well', 'cistern', 'stillness', 'gate', 'lantern', 'refuge', 'commons',
    'porch', 'garden', 'ledger', 'hearth', 'threshold', 'harbor', 'promise', 'landing', 'circle'],
  thing: ['Clean Ground', 'Second Boot', 'Long Water', 'Kept Flame', 'White Line',
    'Slow Bell', 'First Rain', 'Patient Stone', 'Shared Cup', 'Open Gate', 'Counted Bolts', 'Last Lamp', 'Good Wind', 'Deep Cool'],
};

export const NEST = {
  origin: ['the #adj.cap# #fac.cap#', '#fac.cap# #letter##num#', 'the #fac.cap# that #does#'],
  adj: ['weeping', 'gnawing', 'humming', 'blooming', 'stuttering', 'patient', 'red',
    'chattering', 'sleepless', 'clicking', 'wet', 'breathing', 'crooked', 'greedy'],
  fac: ['hatchery', 'printworks', 'forge-wound', 'assembly', 'birthing-rack', 'foundry',
    'brood-line', 'casting-pit', 'spawnery', 'grafting-hall', 'iterator', 'meltworks'],
  letter: ['K', 'R', 'X', 'V', 'Z', 'Q', 'W', 'J'],
  num: ['3', '7', '9', '13', '21', '5', '11', '17', '29'],
  does: ['sings flat', 'never sleeps', 'counts its children', 'remembers fire',
    'eats its mistakes', 'breathes in shifts', 'dreams in solder', 'keeps no sabbath'],
};

export const PERSON = {
  origin: ['#name.cap#', '#name.cap# the #title.cap#', 'Old #name.cap#', '#name.cap# #title2.cap#', '#name.cap#', '#name.cap# #title2.cap#'],
  name: ['vesper', 'mirele', 'cassun', 'odo', 'brann', 'sefa', 'tirel', 'ondine', 'kepp', 'sol', 'marda', 'ivo', 'nef', 'quill', 'rusk', 'tamsin', 'jorrel', 'ash',
    'brida', 'colm', 'darrow', 'edda', 'fenn', 'gale', 'harl', 'isbet', 'joss', 'kettil', 'lira', 'moss', 'nadja', 'orin', 'pell', 'quint', 'renna', 'sten',
    'tova', 'ulla', 'vann', 'wren', 'yara', 'zeb', 'ambry', 'boone', 'cass', 'dell', 'ebba', 'ferro', 'gwen', 'hollis', 'ines', 'jute', 'kest', 'lorn',
    'mave', 'noll', 'ottel', 'prue', 'reyes', 'sorrel', 'thane', 'una'],
  title: ['lathe', 'quiet', 'ledger', 'wirewright', 'salt-eyed', 'patient', 'unrusted', 'twice-built', 'kettle', 'mended',
    'compass', 'gentle', 'anvil', 'sparrow', 'careful', 'lamplit', 'weathered', 'ready', 'bright-seamed', 'slow-spoken', 'far-walked', 'well-kept', 'even-handed', 'gate-born'],
  title2: ['Halfgear', 'Brinehand', 'Coilworn', 'Saltborn', 'Threadneedle', 'Slagheart',
    'Dunecaller', 'Boltkeeper', 'Windrow', 'Latchgood', 'Emberfast', 'Stillwater', 'Tallgrass', 'Copperlaugh', 'Gladhand', 'Sandsworn', 'Truescale', 'Weatherbee'],
};
