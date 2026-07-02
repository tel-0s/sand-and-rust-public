// Replacement-grammar engine (Tracery-style) + the vocabularies of the world.
// expand(rules, '#origin#', rand) recursively rewrites #symbols# until fixed.
import { Rand, hash2 } from './rng.js';
import { REGION, RUIN, MACHINE, PART_EPITHET, RUST_EPITHET, STILL, NEST, PERSON } from '../data/lexicon.js';

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

// Vocabularies live in data/lexicon.js — add words there, not here.

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
