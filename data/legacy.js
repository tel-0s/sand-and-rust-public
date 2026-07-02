// LEGACY POOLS — frozen forever, exactly as they shipped.
// Build 2026.7.2 grew the name pools, which shifted every seeded name: the
// same soul at the same still generated a different name after the update.
// For the living this passed as weather; for the dead it was erasure — a
// memorial backfilled under the new pools resurrected "someone else."
// This snapshot lets the well reconstruct the names that were actually
// mourned. DO NOT EDIT: these arrays are load-bearing history. Any future
// pool expansion must add a new frozen epoch here rather than touch one.
import { Rand, hash2 } from '../js/rng.js';
import { expand } from '../js/grammar.js';

// the PERSON grammar exactly as of v0.2 through 2026.7.1
const PERSON_EPOCH_1 = {
  origin: ['#name.cap#', '#name.cap# the #title.cap#', 'Old #name.cap#', '#name.cap# #title2.cap#'],
  name: ['vesper', 'mirele', 'cassun', 'odo', 'brann', 'sefa', 'tirel', 'ondine', 'kepp', 'sol', 'marda', 'ivo', 'nef', 'quill', 'rusk', 'tamsin', 'jorrel', 'ash'],
  title: ['lathe', 'quiet', 'ledger', 'wirewright', 'salt-eyed', 'patient', 'unrusted', 'twice-built', 'kettle', 'mended'],
  title2: ['Halfgear', 'Brinehand', 'Coilworn', 'Saltborn', 'Threadneedle', 'Slagheart'],
};

// the exact old pipeline: gen(PERSON, seed, salt + 131)
export function legacyPersonName(seed, salt) {
  return expand(PERSON_EPOCH_1, '#origin#', new Rand(hash2(seed, salt + 131, 0x517cc1b7)));
}
