# SAND & RUST — Roadmap

The constraint that shapes everything here is the same one the game was born under:
**everything procedural, no assets, small enough to carry in a pocket.** Features
earn their place by being *generable* — grammars, noise, blackboards — not authored.

Vocabulary, to keep ourselves honest: **anchors** hold you, **signals** call you,
**Stills** welcome you, **the Rust** wants you.

---

## Phase 1 — Life in the desert (Stills & NPCs) — ✅ CORE SHIPPED

Friendly machines and remnant minds, living in **Stills**. Shipped in v0.2:

- ✅ **Still generation**: walled compounds on their own sparse lattice, settling
  only where the salt-biome weight runs strong (find white ground, find people).
  Well at the center, dwellings on a ring, temperament set-dressing (salt shrine /
  rust totem / market stalls / sorting heaps), low wall with two gates, all solid.
- ✅ **NPCs with disposition**: named residents with roles, persistent earned
  disposition, and live stance that reacts to your corruption and equipped
  Rust-grown parts (monks recoil; ferro-cultists lean in). Five tiers from
  HOSTILE to KIN gate what they'll offer.
- ✅ **Dialogue**: temperament-keyed grammar lines; **true rumors** that point at
  real megastructures on the lattice, marked on your map and journal.
- ✅ **Trade**: scrap-denominated barter — consumables and materials by
  temperament, parts sold to brokers (ferro-cultists pay extra for rusted),
  prices drift with disposition; trading slowly earns it.
- ✅ Stills project safe fields like the anchor; enemies will not enter.
- ✅ **Findability**: placement grid-scans + hill-climbs each cell to the heart
  of the pan (~83% of solid salt ground has a Still within 1.5 km), and Deep
  Scan echoes settlement signatures at 5× scan radius.

**Phase 1.5 — deepening — ✅ SHIPPED**
- ✅ **Gossip networks**: residents hold opinions of co-residents, and "ask about
  the neighbors" reveals *real* neighboring Stills on your map — settlements
  chain into a social web (gossip is a map).
- ✅ **Per-Still reputation**: earned by trading, using services, and destroying
  machines near the walls; colours every resident's disposition; persisted.
  Hostile standing gets you warned at the gate and refused at the well.
- ✅ **Event propagation** (blackboard-lite): your deeds — resolved signals,
  slain sentinels, rediscovered ruins — become facts that surface in NPC
  smalltalk ("word travels: someone put down VL-7…").
- ✅ **Well services**: rest until dawn (hull/power restored), hull repair for
  scrap; monastic wells scrub all corruption for salt; ferro-cultist wells
  *harvest the bloom* — corruption converted into rust nodules. Corruption is
  now a tradeable resource, if you dare carry it.
- ✅ **Daily rhythms**: residents head home after dark while the watch stays
  out; lamps burn brighter at night.

**Phase 1.75 — candidates:**
- Full ecogents blackboard once quest chains need it (Phase 2 prerequisite)
- Per-Still stock levels and price memory (sell them ten coils, coil price drops)
- Caravans: NPCs that physically travel between neighboring Stills

## Phase 2 — A web of obligations (quest chains) — ✅ CORE SHIPPED

The ecogents blackboard, finally at work. Shipped in v0.3:

- ✅ **EGS blackboard** (`js/blackboard.js`): facts as tuples, design moves
  firing opportunistically on preconditions, priority-tiered tie-breaks —
  Karth's architecture, browser-native and seeded.
- ✅ **Chain generation** (`js/quests.js`): a giver's temperament seeds a motive
  (lost cargo, tainted relics, claim-jumpers, singing fragments…); placement
  moves ground it at real locations — preferring *undiscovered megastructures*,
  so work teaches geography; a complication tier adds trail-following, named
  guardians, or handoffs to NPCs at neighboring Stills; a reward move prices
  the whole board. Five distinct chain shapes observed in the wild.
- ✅ **Step mechanics**: goto (proximity), kill (named, white-marked quest
  targets with long leashes that respawn if lost), retrieve (objective caches),
  talk/deliver (dialogue turn-ins). Every chain ends with a person.
- ✅ **Integration**: "any work?" in dialogue (max 3 open contracts, one per
  giver), journal tracks steps with distances, map marks the current objective,
  rewards pay scrap/materials/parts plus disposition and Still reputation, and
  completed work enters the gossip pool ("word from {still}: someone out here
  still finishes what they start").

## v0.6 — Fellow Travelers — ✅ SHIPPED

The world may be desolate, but you need not wander alone.

- ✅ **Camps**: fires on the open lattice (no salt required, ~1 per few km²) —
  a brazier, a tent, a shared stash, and one or two souls of the road. Rest at
  the fire for a partial mend; camps mark the map with a little flame.
- ✅ **Wanderers**: named road-folk with temperaments, quirks, real origins,
  road-talk of their own, trade, rumors, gossip, and work to give — and they
  *fight beside you* when machines come for the fire (menders back away).
- ✅ **Followers**: reach KIN with a wanderer or settlement resident and ask
  them to walk with you. Fighters close in; menders patch your hull on the
  road; company quiets the chorus (corruption gain −15%). Downed followers
  limp home to recover — recruit them again when they've mended. One
  companion at a time; fully persisted.
- ✅ **Enemy targeting**: machines now fight whoever is nearest — you, your
  follower, or the camp's defenders. Sentinel lobs lead their actual target.
- ✅ **Backgrounds** (Caves of Qud salute): Anchor-Waker, Still-Born (wake
  among friends, known and owed), Scavver's Apprentice, Rust-Touched (wake
  corrupted wearing one magnificent rusted part), Salt Pilgrim, or let the
  desert decide. Spawn, kit, standing, and your AWAKENING entry all differ.

## v0.7 — The World Turns — ✅ SHIPPED

The desert stops waiting for you.

- ✅ **Event system** (`js/events.js`): discrete happenings with lifecycles,
  rolled on world-time. Storms were the prototype; now the framework carries
  the rest.
- ✅ **Fabricator nests** (`js/nests.js`): the Rust's industry — half-buried
  printworks on their own lattice, grown where the red sand runs strong (the
  dark mirror of the Stills' salt-seeking). They breed infected patrols and
  corrupt the ground around them while their core beats. The core is a real
  combat target: break it and the nest is silenced forever — loot, reputation
  with every Still in earshot, a line in their histories, and a scar on your
  map. Living nests raise raid odds nearby; clearing them is regional defense.
- ✅ **Rust blooms**: the red sand stirs — a shimmering dome where corruption
  pours in and rustforms boil out, then recedes.
- ✅ **Raids**: the bell rings, the watch takes the gate, and machines that
  ignore the safe fields break against the wall in waves. Residents are
  mortal now — the watch fights, the rest run for the houses, and the dead
  stay dead (persisted). Hold the wall without losses and the Still
  remembers it in reputation and history; lose someone and the well keeps
  their designation.
- ✅ **Still histories**: "ask about this place" — generated founding stories
  citing real neighboring Stills and real horizon ruins, plus everything the
  world appends live: raids survived, raids mourned, nests you've silenced.
  Your deeds are now part of settlement canon.

## v0.8 — Of One Substance (general modularity, part one) — ✅ SHIPPED

- ✅ **Machines wear real parts**: every enemy spawns with a loadout drawn from
  the same part pool you equip from — visible as bolted-on greebles (slabs,
  prongs, glowing cores; rust-red when Rust-grown) — and the parts feed its
  hull and damage, so individuals of a kind genuinely differ.
- ✅ **What it wears is what it drops**: kill the dervish in Bulwark Lamellar
  and you can strip the Bulwark Lamellar from its frame. Hunting becomes
  shopping with violence.
- ✅ **Reticle intel**: sight a machine and the HUD names it and lists its
  worn salvage (and its infection) before you commit.
- ✅ **The memorial**: every well keeps its names — ancient dead cut into the
  rim (seeded, with epitaphs), joined by everyone lost in raids on your watch,
  dated. Read them; someone leaves a coil beside the new ones.
- ✅ **Journal tabs**: ALL / WORK / MEMORIES / PLACES.
- 📋 Part two of modularity: NPCs wearing & swapping parts, per-part damage,
  the segmented menagerie (the centipede awaits).

**Phase 2.5 — candidates:**
- Failure decay: abandoned chains rot into rumors someone else sells later
- Memory shards as quest seeds (evidence, not just flavor)
- Multi-chain arcs: a completed chain unlocks a follow-up from the same giver
- Faction-flavored chains (monks send you *against* what ferro-cultists covet)

## Phase 2.75 — The texture of truth — ✅ SHIPPED (v0.5)

The generators no longer communicate vibe; they produce *evidence*.

- ✅ **The testimony engine** (`js/lore.js`): memory shards are now documents —
  shift logs, letters, manifests, survey markers, prayer cards, broadcast
  fragments, ledger pages — slot-filled from facts gathered around where they
  lay: real megastructures with true bearings and distances, real neighboring
  Stills, region names, machine designations. And testimony is *actionable*:
  a document naming an undiscovered place corroborates it onto your map
  ("TESTIMONY CORROBORATED"). 22/22 leads verified true in testing.
- ✅ **Grounded signals**: beacon transmissions are composed *after* the cache
  is placed, so the watch officer's directions — distance, bearing, an
  en-route landmark to keep on your left shoulder — are all true.
- ✅ **Voice**: every resident gets a seeded address-word ("salt-cousin",
  "new-boots"), a verbal tag ("—but what do i know."), and, half the time, an
  origin: a *real* neighboring Still they came from, and a reason they left.
- ✅ **Grounded smalltalk**: residents reference the actual ruin on their
  actual horizon by name and direction; night and storm lines surface in
  night and storms.
- ✅ **Volume**: greetings +50%, smalltalk doubled with fact-slotted lines,
  opinions doubled, well flavor tripled, whispers tiered by corruption depth
  (the Rust gets more personal as it gets more of you).
- ✅ **Journal as archive**: documents filed by type with provenance — region
  recovered in, world-day stamp.

## Phase 2.8 — Greater Stills

Stills today are one ring and one well; the procgen can carry much more.

- **Size classes**: hamlet (3–5 souls, today's layout) → village (district
  grammar: well-yard, market row, workshop quarter) → the rare **town** grown
  on a major pan, with full walls, multiple gates, and a dozen residents.
  Population and footprint scale with the salt-pan's actual measured extent.
- **Layout variety**: temperament-specific districts (monastic cloister
  walks, ferro-cult totem gardens, scavver crane-yards), unique landmark per
  Still (a cracked bell, a dead fountain, a mounted sentinel skull) that
  residents reference in dialogue — geometry and lore generated from the
  same facts.
- **Inter-Still texture: caravans** (from 1.75) walking real routes between
  neighbors, vulnerable during storms, escortable for rep.

## Phase 3 — The desert as antagonist (weather & the deep Rust)

- ✅ **Sandstorms** (v0.4): fronts ride a slow noise field over world-time —
  visibility collapses to amber murk, the sun dims, the compass swims, wind
  physically leans on your chassis (gait-dependent: hovers suffer, treads grip),
  enemies hunt half-blind, and shelter is real: anchor fields, Still walls, and
  the lee of anything tall all break the wind.
- ✅ **Rust weather** (v0.7): blooms — temporary zones where corruption gain
  spikes and Rustforms spawn in choirs, under a red shimmer-dome.
- **The Embrace path**: corruption as a *build*. Past 75, instead of only seizures:
  Rust abilities surface (call a feral machine to your side; speak to Rustforms;
  read the whispers as a sixth sense for loot). The tradeoff: Stills bar their
  gates, monks send hunters. Two endings to every chassis: polished, or blooming.

## Phase 4 — Range (travel & the waystation network)

- **Wild anchors**: dormant field anchors scattered on the lattice; activate one
  (materials + a defense event) and it becomes a respawn point and fast-travel node.
- **Fast travel** as transmission: your mind moves, your chassis is rebuilt at the
  destination from its pattern — for a corruption tithe. (The lore writes the
  mechanic: you are information, and information degrades.)
- **Vehicles, maybe**: a sand-skiff as an equippable LEGS-class part with its own
  physics envelope, rather than a separate system.

## Phase 5 — Texture (sound & feel)

- ✅ **Procedural audio** (v0.4): WebAudio synthesis only, zero files — wind from
  filtered noise that swells with the storm, footfalls per gait (treads rumble,
  hovers sing, bipeds thud), shaped-burst combat (swings, shots, booms, hurt),
  discovery chimes and quest tones, a warm hum inside safe fields, and the Rust
  as a detuned four-voice choir that fades in past ~20 corruption and is
  undeniable by 80. Mutable from the system menu.
- **More body language**: gait animations per leg type (tracked treads kick dust,
  hover skirts shimmer), damage states on the player mesh (lose plating visually).
- **Photo mode**: the desert earns it.

## Continuous: balance & performance

- Difficulty curve audit: tier scaling vs. distance, night spawn rates, sentinel
  projectile dodgeability.
- Chunk generation in a Web Worker if frame hitches appear on lower-end machines.
- Save format versioning (the `v` field is already there) with migration shims, so
  no wanderer loses a chassis to an update.

---

*Items move up this list when a playtest makes them itch. Notes from the field
always welcome.*
