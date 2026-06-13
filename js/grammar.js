// Replacement-grammar engine (Tracery-style) + the vocabularies of the world.
// expand(rules, '#origin#', rand) recursively rewrites #symbols# until fixed.
import { Rand, hash2 } from './rng.js';

export function expand(rules, text, rand, depth = 0) {
  if (depth > 12) return text;
  return text.replace(/#([a-zA-Z_][a-zA-Z_0-9]*)(\.cap|\.up)?#/g, (_, sym, mod) => {
    const options = rules[sym];
    if (!options) return sym;
    let out = expand(rules, rand.pick(options), rand, depth + 1);
    // .cap title-cases every word ("quiet engines" -> "Quiet Engines"),
    // but never the letter after an apostrophe
    if (mod === '.cap') out = out.replace(/(^|[\s"])([a-z])/g, (m, sp, ch) => sp + ch.toUpperCase());
    if (mod === '.up') out = out.toUpperCase();
    return out;
  });
}

// ---------- Region names: "The Cinnabar Reach", "Ashfall Expanse" ----------
const REGION = {
  origin: ['the #adj.cap# #place.cap#', '#prefix.cap##suffix# #place.cap#', 'the #place.cap# of #abstract.cap#', '#prefix.cap##suffix# #place.cap#'],
  adj: ['cinnabar', 'ochre', 'glassed', 'silent', 'sunken', 'shattered', 'saline', 'hollow', 'umber', 'static', 'leeward', 'rusting', 'pale', 'broken', 'singing', 'burnished', 'sleeping', 'forgotten'],
  place: ['reach', 'expanse', 'span', 'waste', 'basin', 'shelf', 'sprawl', 'deep', 'flats', 'verge', 'drift', 'mouth', 'steppe', 'scar'],
  prefix: ['ash', 'dun', 'sol', 'kar', 'vel', 'mor', 'tal', 'zeph', 'cal', 'or', 'sard', 'hex'],
  suffix: ['fall', 'mere', 'rend', 'wick', 'march', 'gate', 'rin', 'os', 'und', 'eth'],
  abstract: ['echoes', 'glass', 'salt', 'sleepers', 'antennae', 'last light', 'slow sand', 'old signals', 'broken vows', 'quiet engines'],
};

// ---------- Ruin / structure names ----------
const RUIN = {
  origin: ['#facility.cap# #designation#', 'the #adj.cap# #facility.cap#', '#name.cap# #facility.cap#'],
  facility: ['relay', 'foundry', 'arcology', 'reservoir', 'archive', 'bastion', 'terminal', 'works', 'array', 'vault', 'refinery', 'habitat', 'exchange'],
  designation: ['#letter##num#', '#num#-#letter#', '"#word.cap#"'],
  letter: ['K', 'V', 'T', 'R', 'X', 'M', 'S', 'A', 'Z', 'H'],
  num: ['7', '12', '3', '40', '9', '21', '88', '101', '6', '17'],
  adj: ['drowned', 'gutted', 'blind', 'leaning', 'severed', 'amber', 'whistling', 'patient'],
  name: ['meridian', 'cassia', 'opaline', 'verdigris', 'halcyon', 'tantalum', 'caldera', 'sirocco'],
  word: ['lodestar', 'plumb', 'tessera', 'anvil', 'cistern', 'gnomon'],
};

// ---------- Machine designations: "VL-7 'Gravedigger'" ----------
const MACHINE = {
  origin: ['#ser##num# "#epithet.cap#"'],
  ser: ['VL-', 'KR-', 'TX-', 'MN-', 'OS-', 'HX-', 'RD-', 'SC-'],
  num: ['2', '3', '5', '7', '9', '11', '13', '17', '21', '40'],
  epithet: ['gravedigger', 'lornsong', 'palebreaker', 'dustwife', 'cinderjaw', 'mirrorback', 'saltlicker', 'hollowman', 'threadbare', 'glasswalker', 'smokeeater', 'wirenest', 'doomscriber', 'shardfoot'],
};

// ---------- Part names: epithets layered on a base ----------
const PART_EPITHET = {
  origin: ['#maker.cap# #quality#', '#quality.cap#', '#maker.cap#'],
  maker: ['solenne', 'karst', 'veldt', 'orrin', 'tessek', 'hadal', 'mirin', 'coriol', 'sundermark', 'abrasax'],
  quality: ['pattern', 'type', 'mark', 'series', 'issue', 'cast'],
};
const RUST_EPITHET = {
  origin: ['#corrupt.cap# #noun.cap#'],
  corrupt: ['weeping', 'gnawed', 'whispering', 'blooming', 'feverish', 'hungering', 'singing', 'molting'],
  noun: ['iteration', 'remnant', 'graft', 'tumor', 'chorus', 'wound', 'blossom', 'relic'],
};

// ---------- Lore fragments found at memory shards ----------
const LORE = {
  origin: [
    '"#sentence.cap#" — #source#',
    'recovered fragment: #sentence#',
    '#source#, final entry: "#sentence.cap#"',
  ],
  sentence: [
    'the sand was not always hungry. we taught it to be',
    'we fed the foundries until the foundries fed on us',
    'the Rust is not a virus. it is a forgetting',
    'they buried the cities standing up, like they expected them to walk out again',
    'every machine that dreams, dreams of water',
    'the last broadcast was a lullaby. nobody admits to sending it',
    'we built minds to outlast us. we did not ask if they wanted to',
    'salt holds the line. the old crews knew. white ground is clean ground',
    'when the megastructures went quiet, the birds nested in them for one more spring',
    'do not trust a machine that has begun to name itself',
    'the desert is an archive. every dune is a misfiled century',
    'somewhere under the glass there is still a garden, sealed and waiting',
    'the Rust sings in carrier waves. if you can hear it, you are already listening back',
    'we never finished the evacuation. we just stopped counting',
  ],
  source: ['maintenance log', 'unsigned letter', 'overseer’s diary', 'cached transmission', 'etched panel', 'child’s notebook', 'service manifest', 'prayer card'],
};

// ---------- Signal quests ----------
const SIGNAL = {
  origin: [
    'a #adj# beacon repeats: "#payload.cap#." coordinates attached.',
    'intercepted carrier wave — #payload#. source pinned #dir#.',
    'an old #src# is still transmitting: "#payload.cap#."',
  ],
  adj: ['stuttering', 'faint', 'looping', 'encrypted', 'desperate', 'automated'],
  src: ['supply drone', 'watchtower', 'crawler convoy', 'orbital relay', 'mining rig'],
  payload: ['cache intact, no survivors', 'parts depot unsealed, power failing', 'salvage claim unregistered, first come', 'inventory abandoned in place', 'final delivery never collected', 'emergency stores released to any receiver'],
  dir: ['to bearing north', 'beyond the next ridge', 'out in the open waste', 'under a dead arch'],
};

// ---------- Still (settlement) names ----------
const STILL = {
  origin: ['#prefix.cap##suffix#', 'the #adj.cap# #noun.cap#', '#noun.cap# of the #thing.cap#'],
  prefix: ['brine', 'salt', 'white', 'quiet', 'low', 'glass', 'last', 'far', 'kettle', 'cinder'],
  suffix: ['rest', 'well', 'stead', 'hold', 'reach', 'mark', 'haven', 'gather'],
  adj: ['patient', 'white', 'standing', 'mended', 'unrusted', 'shaded', 'sworn'],
  noun: ['well', 'cistern', 'stillness', 'gate', 'lantern', 'refuge', 'commons'],
  thing: ['Clean Ground', 'Second Boot', 'Long Water', 'Kept Flame', 'White Line'],
};

// ---------- Fabricator nests (the Rust's ugly industry) ----------
const NEST = {
  origin: ['the #adj.cap# #fac.cap#', '#fac.cap# #letter##num#', 'the #fac.cap# that #does#'],
  adj: ['weeping', 'gnawing', 'humming', 'blooming', 'stuttering', 'patient', 'red'],
  fac: ['hatchery', 'printworks', 'forge-wound', 'assembly', 'birthing-rack', 'foundry'],
  letter: ['K', 'R', 'X', 'V', 'Z'],
  num: ['3', '7', '9', '13', '21'],
  does: ['sings flat', 'never sleeps', 'counts its children', 'remembers fire'],
};

// ---------- People (remnant minds in patchwork chassis) ----------
const PERSON = {
  origin: ['#name.cap#', '#name.cap# the #title.cap#', 'Old #name.cap#', '#name.cap# #title2.cap#'],
  name: ['vesper', 'mirele', 'cassun', 'odo', 'brann', 'sefa', 'tirel', 'ondine', 'kepp', 'sol', 'marda', 'ivo', 'nef', 'quill', 'rusk', 'tamsin', 'jorrel', 'ash'],
  title: ['lathe', 'quiet', 'ledger', 'wirewright', 'salt-eyed', 'patient', 'unrusted', 'twice-built', 'kettle', 'mended'],
  title2: ['Halfgear', 'Brinehand', 'Coilworn', 'Saltborn', 'Threadneedle', 'Slagheart'],
};

function gen(rules, seed, salt) {
  return expand(rules, '#origin#', new Rand(hash2(seed, salt, 0x517cc1b7)));
}

export const Names = {
  region: (seed, cx, cz) => gen(REGION, hash2(seed, cx, cz), 11),
  ruin: (seed, salt) => gen(RUIN, seed, salt + 23),
  machine: (seed, salt) => gen(MACHINE, seed, salt + 37),
  partEpithet: (seed, salt) => gen(PART_EPITHET, seed, salt + 51),
  rustEpithet: (seed, salt) => gen(RUST_EPITHET, seed, salt + 67),
  lore: (seed, salt) => gen(LORE, seed, salt + 83),
  signal: (seed, salt) => gen(SIGNAL, seed, salt + 97),
  still: (seed, salt) => gen(STILL, seed, salt + 113),
  nest: (seed, salt) => gen(NEST, seed, salt + 127),
  person: (seed, salt) => gen(PERSON, seed, salt + 131),
};
