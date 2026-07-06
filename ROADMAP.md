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

**Phase 1.75 — candidates:** *(all since delivered)*
- ✅ Full ecogents blackboard once quest chains need it (Phase 2)
- ✅ Per-Still price movement — the living economy (2026.7 build 15) prices by
  route health rather than per-sale memory
- ✅ Caravans: NPCs that physically travel between neighboring Stills
  (THE ROADS arc, 2026.7 builds 14–17)

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

## build 2026.7.1 — "The Names Are Kept" — ✅ SHIPPED

The first build of the public era, and of the CalVer age (v1.0 is retired as
a concept — arcs have names, builds have dates, the desert just grows).

- ✅ Raids resolve conclusively in every path (the silent-scatter bug is dead)
- ✅ Raid balance: raiders sized to the Still, defenders sized to their region,
  wall turrets standard with a second fundable at the well
- ✅ **Recommission the fallen**: the well kept a copy — the same mercy your
  own respawn runs on, extended to the people you couldn't save in time.
  Escalating cost; the memorial name is ringed, not struck.
- ✅ Morrowind-split dialogue (topics left, words right)
- ✅ Journal work tab ordering; "the the" grammar fixes

## build 2026.7.2 — "A Thousand Names" — ✅ SHIPPED

The content supplemental: everything hardcoded moved to `data/` modules
(lexicon, voices, documents, motives) — adding a name, a greeting, a document
type, or a quest motive is now appending a line to a data file. Pools grew
2–3× across the board; new WORK ORDER document type; 8 new quest motives.

## build 2026.7.3 — "The Second Bell" — ✅ SHIPPED

Thirteen QA items: clock display fix, ferro-cultist fields keep the bloom
(no salt-scrub inside), memorial still-year dating, CREDITS, chains fail
when their people fall, unified compass tracking (chains + signals), the
nest screams when its core is struck, EVENTS journal tab, folk loadouts
(residents and wanderers wear real parts), rest-until-dawn at fires.

## build 2026.7.4 — "Word for Word" — ✅ SHIPPED

Topic discovery — the deeper Morrowind, done over the blackboard:

- ✅ **Words are doors**: mentions of real places, real people, and the
  desert's ideas glow in dialogue text. Click one to ask about it.
- ✅ **A persistent subject list** (the SPEAK OF rail): every topic you've
  ever picked up travels with you; ask anyone, anywhere.
- ✅ **Knowledge is local**: who can speak to what routes through the
  blackboard — megas within a resident's mental map get true bearings (and
  mark your chart), neighbor Stills route through gossip, co-residents
  through opinion, home through history. Beyond their knowing, each
  temperament deflects in its own voice.
- ✅ **15 concepts** (`data/topics.js`): the Rust, the salt, the wells, the
  chorus, the dream, the sentinels, the anchors, the hollow places… each
  with all four temperaments' takes, some with deeper verses at WARM+.
- ✅ Trusted friends say more: warm-tier lines carry foreshadowing (ask a
  ferro-cultist about the dream. ask a scavver about the hollow places.)

## build 2026.7.5 — "The Hollow Places" (arc build 1 of 3) — ✅ SHIPPED

The doors open. Every megastructure now keeps a sealed threshold at its
foot; break the seal and a warren of buried halls is grown on the spot from
a room grammar keyed to the structure's type (`js/interiors.js`):

- ✅ **Enterable thresholds**: a dark frame with a teal seam beside every
  megastructure. [E] BREAK THE SEAL.
- ✅ **Room grammars per type**: a colossus opens into plating galleries and
  a core shrine; a spire into office warrens and an executive vault; a dish
  into signal archives and the quiet room; a ring into cargo halls and the
  last platform. 6–11 rooms, deterministic per structure.
- ✅ **The desert's own physics carries the halls**: room geometry is real
  collision (walls hold, floors stand, doorways connect); while inside, the
  surface — terrain, storms, machines, sky — simply does not reach down.
  The wind dies at the door. The camera booms in against the walls.
- ✅ **Furnished by collapse**: rubble, dead machinery, lamp strips still
  drawing on some deep reserve, and undisturbed scrap the salvage crews
  never reached.
- ✅ Death, saving, and followers all handled (the halls keep no bodies;
  saves land you back outside the door; companions descend with you).

## build 2026.7.6 — "The Hollow Places" (arc build 2 of 3) — ✅ SHIPPED

The halls go down, and they are not empty.

- ✅ **Floors**: interiors now descend 2–3 levels, joined by stair galleries
  whose steps are plain standable colliders under STEP_UP — the desert's own
  physics climbs them. Stair + landing place atomically, so a floor is never
  unreachable. The deepest, farthest room is the deep room.
- ✅ **The things that never left**: each interior stocks itself once, at the
  door — lurkers with short aggro in the dark, tougher and Rust-touched on
  the lower floors. The surface machines stay topside; killing the halls
  clean means the halls stay clean until you leave.
- ✅ **Worth the descent**: scrap richens per floor; the deep room holds a
  sealed cache with a real part (tier biased by depth and distance, rust
  chance real).
- ✅ **Testimony about THIS building**: documents in the halls name the
  structure, the room they were left in, and the people who didn't get out —
  work orders, last transmissions, prayers scratched a finger deep. Filed to
  MEMORIES with provenance.
- ✅ **Legibility** (playtest: an interior read as "2 rooms" because a dark
  doorway is invisible): glowing jambs now flank every doorway, protruding
  past both wall faces; stairwells are always lit with step nosings; the
  entrance is a proper stairhead blockhouse big enough to plausibly hold
  the stairs it does hold (the dish-type ruins needed this most).
- ✅ Camera clamped under interior ceilings (ceilings have no colliders; the
  boom used to escape into the void).

## build 2026.7.7 — "The Hollow Places" (arc build 3 of 3) — ✅ SHIPPED

The arc closes at the bottom of the deepest room.

- ✅ **The epic recommission**: when a *significant* soul falls — someone who
  once walked with you, or a friend at deep earned trust — the well's rite
  is not enough. "i am a bucket on a rope." Minds like theirs were woven on
  a **Neuromanifold Shaper**, and the last Shapers are held where minds were
  made: the conceptories, in the deep rooms. The ordinary rite still serves
  ordinary residents — the epic is reserved for the ones that mattered.
- ✅ **The Conceptory Mother**: a boss in the deep room of a real
  megastructure the well chooses (preferring one you haven't found — the
  epic teaches geography like all work here). Slow, heavy, corrupting; her
  glow washes the halls red before you ever see her; at half strength SHE
  CALLS HER LITTLE ONES.
- ✅ **The return**: surrender the Shaper at the well and they come back
  *whole* — knowing your name. Settlement history records it; nobody there
  will say the word miracle; everybody there means it.
- ✅ Full compass tracking (seek → return legs), journal chain, persistence
  across saves, one epic at a time.
- ✅ Playtest fix: the entry room's exit wall is now **reserved** — no
  doorway ever shares the threshold wall, so the way out never masquerades
  as the way deeper (or vice versa).

THE HOLLOW PLACES arc is complete: thresholds (7.5) → depth, danger,
documents (7.6) → the Conceptory Mother (7.7).

## build 2026.7.8 — "The Workbench" — ✅ SHIPPED (dev-only)

A full debug console for rapid testing — the deep systems (the epic
recommission alone spans befriending, grief, a dungeon, and a boss) should
not require an hour of honest play per iteration. **Not present in the
public build**: `js/debug.js` loads only when the dev server answers a
`HEAD /__dev__` probe — run `./serve.sh --dev` and press **[`]**.

- **WORLD**: teleport to the nearest still / camp / nest / megastructure /
  undiscovered mega / anchor / epic target; set dawn–midnight, +1 day;
  force storms on/off; reveal the map 12 km; where-am-i.
- **SPAWN**: enemy designer (kind, tier, infected, count — spawn ahead or
  dry-run the stats), part designer (any part def, Mk.I–III, rust-grown —
  give or dry-run), clear all enemies.
- **GIVE**: all materials (including the Shaper ❖), consumables, chassis
  state (repair, hull 10%, corruption ±).
- **GEN**: dry-run the generators and *see* their output before committing —
  work chains from the nearest still (then "take the job" for real),
  testimony documents, interior documents, still histories, whispers.
- **SOULS**: befriend / sour / fell the nearest resident (through the
  natural death pipeline, so memorials and chain-failures fire), **STAGE
  EPIC** (befriend + fell in one click — then ask the well), rep ±, force
  raids and blooms, state summary dump.

Everything routes through the same code paths the game uses, so what you
test is what ships.

## build 2026.7.9 — "Vast and Daunting" — ✅ SHIPPED

Playtest findings from the first descent with the workbench, plus the scale
the hollow places deserved:

- ✅ **Ranged combat works underground** (two compounding bugs): projectiles
  died at birth because "below ground" was checked against the desert
  surface 120 m overhead, and the aim ray converged at the muzzle for the
  same reason. Both now resolve against the halls' own floors and walls.
  That "undamageable" machine at the threshold was unhittable, not tough.
- ✅ **No more ambush through walls**: interior lurkers need line of sight
  to aggro. They lurk; you meet them when you see them.
- ✅ **The Conceptory Mother, as she should be**: a giant (scale 4.4, the
  largest machine in the game), *rooted* — wired into the works against the
  deep room's far wall by climbing conduits, facing the door you'll come
  through. She does not chase; she leans, and her arms reach 7.5 m. Her
  pressure is what she makes: two brood waves now (60% and 30%).
- ✅ **Grand halls**: the lower floors open up — 26–38 m rooms with 12–16 m
  ceilings, columns, gantries overhead, dead machinery of unknown purpose.
  The deep room is always one. Ordinary rooms grew too (taller, and the
  "big" tier reaches 26 m). All merged geometry: scale costs almost nothing.
- 📋 Further down the visual arc: chasm rooms (sunken floors, rim walks),
  interior verticality beyond stairs, and the machinery getting *specific*
  per structure type.

## build 2026.7.10 — "Vast and Daunting" II — ✅ SHIPPED

Playtest: a chunky biped barely fit the doorways, and the camera fought the
small rooms. The whole interior vocabulary scaled ~2× in plan (ordinary
rooms 18–30 m, grand halls 50–72 m, doorways 5 m wide and 4.4 m tall with
jambs to match, stair galleries 11 m wide) and ~1.7× in height (ordinary
ceilings 9–14 m, grand 19–26 m). Furnishing density scaled to the new floor
area; thresholds, seams, and the stairhead grew with everything else.
Merged geometry: still 61 FPS.

## build 2026.7.11 — "Sight and Stone" — ✅ SHIPPED

- ✅ **No intel through walls**: reticle machine-info (and the soft aim
  assist) now require true line of sight, sampled every 0.6 m so nothing
  slips between steps. Doorways still give honest sight — walls don't.
- ✅ **The stairhead is stone**: the blockhouse has collision — but flagged
  surface-only, because it sits directly above the halls and colliders have
  no bottoms.
- ✅ **Mothers are residents, not just quest spawns**: roughly one deep room
  in three keeps its Conceptory Mother naturally (deterministic per
  structure). Wild Mothers brood like the well's, and one in four of their
  workings still holds a Shaper — *keep it*: when someone you love falls,
  the well feels the one in your pack and skips the descent ("walkers like
  you always half-know").
- 📋 Mothers whose armaments reflect their parts — long arms that sweep in
  animated arcs for claws/fists, shoulder-mounted cannon bursts for
  casters/projectors. Queued for the bigger-body-types / visual arc.

## build 2026.7.12 — "The Names Are Kept II" — ✅ SHIPPED

- ✅ **Nobody is beyond the rite for dying early**: friends who fell before
  the well kept its ledger (pre-7.1 saves) had ids in the death roll but no
  memorial — invisible to both the rite and the epic. Names are seeded, so
  the ledger is reconstructed at the well: the lost memorials are cut
  retroactively, and the rite (or the Shaper, for the ones that mattered)
  is offered again.
- ✅ **The well has its own voice**: it no longer answers topics like a
  resident. It speaks on the deep subjects only — the wells, the salt, the
  stills, the Rust, the anchors, the old world, the dream, the hollow
  places — in its own register ("the water rises. you drink. that is the
  whole of the covenant."), and declines everything else without borrowing
  a mouth ("the well holds water, names, and the shape of the fallen. ask
  the living about the living."). `WELL_TOPICS` in data/topics.js — adding
  a subject the well knows is adding an entry.

## THE ARC MAP (July 2026 — the standing plan)

Every remaining major feature, clustered so each arc mainlines one big
system and tows several small ones. Order chosen so each arc builds the
substrate the next one stands on.

**ARC I — THE ROADS** (next)
The overworld between destinations is now the quietest part of the game —
the interiors got rich, the roads didn't. Caravans walk *real routes*
between neighbor stills (the neighbor graph already exists): two to four
souls, quadruped **beastbot haulers** (the first non-humanoid frame — this
is where the Menagerie's body work begins), camping at dusk, ambushed by
what the desert sends. A **living economy lite** underneath: per-still
scarcity fed by caravan arrivals and losses, prices that move, stills that
remember "the road is cut." Escort legs as a new work-chain step; caravan
ambush events with outcomes that ripple to both endpoint stills.
*Tows: garbled speech synthesis (cheap on the WebAudio engine — voices at
last), caravan documents/motives in data/, wanderers roaming between
camps, waystone shrines on the routes.*

**ARC II — STILLS THAT LIVE**
Greater stills (size classes by measured pan extent, district grammars, a
unique landmark each) and then **dynamic** stills: growth and decay driven
by trade-route health (Arc I's substrate), raids survived or mourned,
nests nearby, and the player's deeds. Decay legible in retrospect —
boarded doors, sanded thresholds, the bell that no longer rings.
Utility-AI-lite dwellers: schedules and simple drives producing observable
life (the dawn sweep, stall hours, watch rotation). And a new proposal to
fill a gap nobody named: **the hearth** — find a dead well in the waste,
restore it, and watch a still *seed itself around it* over the days. The
player finally gets a home, and the home is other people.

**ARC III — THE MENAGERIE**
Modularity part two: body typologies (quadrupeds graduate from Arc I's
haulers; the segmented centipede; the big class), NPCs swapping their own
parts as their stills prosper (Arc II's economy makes upgrades mean
something), per-part damage and segmented collision, Mothers whose
armaments reflect their parts (sweeping claw arcs, shoulder-cannon
bursts), procgen part visual variety, and the **warbot-limb
megastructures** — the giant hand and the half-buried war machine share
the big class's geometry vocabulary.

**ARC IV — THE SHAPE OF THE LAND**
The visual arc: terrain variety (mesas, canyons, riverbeds composed into
the heightfield), ruin cutaways prickling with rebar, launch complexes
with spacecraft still on the pad, interior chasms and true verticality,
and the pre-downscale AA render pipeline.

**ARC V — THE EMBRACE** (the wildcard, now scheduled)
The Rust has been a debuff to manage; the ferro-cultists have insisted all
along it's a letter arriving. This arc lets you ANSWER it. Design tenets:
(1) ignoring the Rust changes NOTHING — the unanswered game is exactly the
game so far; (2) answering is a stance, not a power-up — every gift has a
social price, and the deepest step is near-irreversible; (3) the polished
path gets its own recognition — two endings to every chassis.

THE STATE. `embrace: null | 0 (answered) | 1..3 (blooms)`, saved (additive,
old saves load unanswered). Corruption thresholds re-read: 25 you hear it,
50 the letter can be answered, 100 — if answered — you BLOOM instead of
being consumed (embrace +1, corruption falls back to ~40, a permanent mark).

THE BUILDS.
- b1 THE LETTER — the conversation. At ≥50 corruption, whispers sometimes
  arrive answerable: a dialogue with the Rust itself (the well pattern — a
  pseudo-speaker with its own voice, grown from the whisper grammar).
  Multi-beat exchanges; the final door is 'let it in' / 'not yet'.
  Presentation: the existing dialogue UI (the well pattern), recolored
  rust-red with glitch effects on the frame and the spoken lines.
  Answered state: seizures stop damaging (the body negotiates — brief
  sway, no stun-hurt), 99.5 no longer consumes, the choir resolves toward
  consonance, the corruption bar renames itself. No powers yet — b1 is
  fiction and plumbing: state, save, UI, audio, the voice.
- b2 THE FIRST BLOOM — Rustsight. Bloom-at-100 lands; Bloom I grants the
  whispers as a sixth sense (salvage, caches, and documents ping through
  walls on a slow pulse) and KINSHIP: rustforms no longer aggro unless
  struck. The body shows it (rust stains grow on the player mesh per
  bloom). Temperament dispositions reorder: ferro-cult +, monastic −,
  mercantile a little −, scavvers don't care. All effects keyed off
  embrace level — hash streams only, no RNG pool changes.
- b3 THE SECOND BLOOM — the Calling. Call a feral machine to your side
  (temporary rust-ally through the follower machinery); fabcores become
  speakable (nests offer tithes — rust-nodule trade instead of only
  violence); monastic stills refuse services (no rites for the blooming);
  salt-monk HUNTERS begin arriving as an event at Bloom II+.
- b4 THE THIRD BODY — the state salt cannot touch. Corruption floor 40
  (pans and fields scrub only to the floor); rusted parts cost nothing to
  wear and their boosts deepen; bloom domes become sanctuary (standing in
  one mends hull); monastic gates bar at Bloom III. And THE SCOURING: a
  monastic rite unwinds one bloom at heavy cost (salt, scrap, a
  sacrificed high-tier part) — but Bloom III leaves marks nothing takes.
- b5 THE ANSWER (arc crown) — recognitions, not credit-rolls. NOTE: build
  the recognitions as an EXTENSIBLE substrate — a general 'tales about the
  player' registry that topics/smalltalk draw from — because a future
  LEGEND arc (producer's notes, forthcoming) will expand player-tales and
  player-topics on every path; b5 must leave that door open, not preempt it. Full Bloom:
  at Bloom III, carrying 100 again becomes a chosen transformation — the
  Blooming chassis, ferro-cult pilgrimage, your name in their histories.
  Polished: zero corruption, zero embrace, a full tier-3 chassis earns
  the monks' recognition and their histories instead. Saturation pass:
  every temperament gets smalltalk/topics/greetings about what you are
  becoming; the journal keeps the whole correspondence.

TOUCHPOINTS (the everything-audit): player (mesh, seizures, floor), main
(corruption tick, whisper→conversation, blooms), dialogue+topics (the
Rust's voice, temperament reactions), stills (dispositions, service
gates, ferro-cult full service), enemies (kinship, called ally, fabcore
speech), nests (tithes), events (hunters, pilgrimage), audio (the choir
learns consonance), save (additive v2 field), parts (rusted synergy).
Safety rails as always: fresh hash streams for every new roll; the
unanswered path byte-identical in behavior; old saves land unanswered.

## build 2026.7.14 — "The Roads" (ARC I, build 1) — ✅ SHIPPED

The roads are walked, whether you are watching or not.

- ✅ **Routes**: deterministic edges in the still-neighbor graph (each still
  pairs with its 1–2 nearest neighbors; ~65% of pairs are walked).
- ✅ **Caravans on schedules**: position is a pure function of world time —
  legs of ~half a day, rest at each endpoint, halts at night with a fire.
  Come within range and it materializes: 2–3 souls in file behind
  **quadruped beastbot haulers** (the Menagerie's first non-humanoid frame:
  low-slung, panniered, gait-animated, bell on the lead), announced by
  BELLS ON THE ROAD.
- ✅ **They talk, they trade**: full dialogue stack (road talk, gossip,
  topics, trade with the master), origins at the route's real endpoints.
- ✅ **The desert falls on them**: ambush rolls scale near nests and in the
  rustlands. Caravaneers fight (outriders and drovers), and stand in the
  ally roster beside you. Survive it: THE ROAD HOLDS — rep at both endpoint
  stills, journal, word travels. Lose everyone: THE ROAD IS CUT — the route
  goes quiet for six days, and both stills' histories record it.
- ✅ **Tow-along: carrier tones** — every dialogue line is now *voiced*, a
  seeded burble of pitched blips (the same sentence always sounds like
  itself; temperament sets the register). Zero files, ~20 lines of WebAudio.

## build 2026.7.16 — "The Roads" (ARC I, build 3) — ✅ SHIPPED · ARC COMPLETE

Escort legs — where the roads, the economy, the ambush system, and the
quest blackboard finally shake hands:

- ✅ **The contract**: "any work?" at a still sometimes offers an escort to
  a real neighbor (shortest uncut route; one live contract at a time).
  Sign it and a caravan stands at the gate that moment.
- ✅ **The pace is yours to protect**: the caravan moves only while you stay
  close — wander off and the master waits (and says so). Progress lives ON
  THE STEP, so the contract survives saves and returns: walk back to a
  half-finished road and the caravan re-materializes where you left it.
- ✅ **The road tests the contract**: scripted ambushes at 40% and 78% of
  the leg (stacking with random ones near nests), raider-flagged, resolved
  by the same all-clear that governs ambient caravans.
- ✅ **Arrival pays like it should**: the chain completes on the spot —
  scrap, a cell, a part on long hauls, gratitude at BOTH wells, THE
  CONTRACT HOLDS in the journal. Lose the whole crew instead and THE
  CONTRACT DIES: chain failed, rep down, and the giver's still writes it
  into its history.

*Deferred arc extras (polish, anytime): waystone shrines on the routes,
wanderers roaming between camps.*

## build 2026.7.17 — "The Roads" (post-arc polish) — ✅ SHIPPED

Playtest findings from riding with the caravans:

- ✅ **Honest footpace**: the schedule-point used to walk a leg in a fixed
  0.55 days regardless of distance — on long routes that's 11+ m/s, faster
  than the crew can walk, so the column strung out and the beastbot (the
  only member who never stops to fight or chat) appeared to lead. Legs now
  take as long as their distance demands at 5.5 m/s; the crew's catch-up
  caps sit above it; marching outranks pleasantries; escort pace ducked
  under the crew's stride. Beasts never lead the column now.
- ✅ **Detour steering**: a walker that snags on a rock slides around it
  instead of pushing into it until the column leaves them behind.
- ✅ **Ambushes are events, not weather**: a crew that just fought is left
  alone a while, and the desert paces itself globally — no more ambush
  drumbeat while wandering near roads.
- ✅ **Information travels like sound**: close by, the full cry for help; at
  the edge of earshot, "you hear fighting to the northwest — bells, and
  something answering"; beyond that, outcomes go quietly to the journal —
  the world remembering, not the game pinging. Contract escorts always get
  the full alarm. Nothing about the simulation was faked.

**ARC VI — THE LEGEND** (from the producer's notes, scheduled next)
The desert learns to remember. Deeds become STORIES that root at nearby
stills, spread along the living route graph in caravan panniers, and
change how settlements receive you — without ever becoming the only
thing anyone talks about, and without pretending the desert has a
single hero. Design tenets: (1) stories are LOCAL knowledge — a still
that never heard of you says so; (2) the roads are the medium — spread
follows open routes only, so the economy and the legend are one system;
(3) quiet weaving — telling chances stay low and capped; (4) the player
is one thread — the world grows legends about others too.

THE STATE. `stories: [{id, kind, day, body, roots: {stillKey: day}}]`,
saved. The b5 tales registry migrates in as world-rooted stories.
Spread is deterministic: hash(seed, story, still, day) — no dice drift.

THE BUILDS.
- b1 THE LEDGER — deeds become stories. Raid defended, nest silenced,
  Mother slain, epic revival, hearth founded, escort delivered, blooms
  and recognitions: each roots a story at the involved/nearest still
  (and always in the journal). The tales registry becomes the story
  substrate; 'the walker' topic starts answering from LOCAL knowledge.
- b2 THE CARRYING — stories walk. Once per world-day, each story rolls
  to cross each OPEN route out of its rooted stills (cut roads carry
  nothing — defending routes now guards your own name). The chance
  compounds with the destination's appetite: a still rich in stories
  attracts more. Stories may grow in the telling — small seeded
  embellishments per hop, so distant versions differ.
- b3 THE TELLING — the still speaks what it knows. Plus THE NAMING
  (design call, 2026-07-05): the player stays unnamed until the desert
  names them — when stories thicken at a still, that community coins an
  epithet from the player's actual deed-mix, offered at their well
  (refusable; refusing is itself a story). The epithet travels WITH the
  stories: near stills use it, far ones still say 'walker'. Names are
  given by communities here, and legends travel on epithets, not birth
  names — chosen name fields stay out. Smalltalk draws from
  local stories at a LOW rate (quiet weaving), caravaneers tell stories
  from both their endpoints (they are the vector, audibly), and renown
  (stories known here, capped) adds a gentle disposition warmth and
  colors greetings. A still that knows nothing of you treats you as the
  stranger you are.
- b4 THE OTHERS — the desert has no single story. Seeded legendary
  figures root in distant regions: the mender who walked into the red
  and came back; the warden who held a gate alone. Their stories spread
  on the same roads. Some are ALIVE — a real resident at a real distant
  still, who answers to the legend when found; some are names cut into
  a far well-rim. Asking after them gives bearings; finding them closes
  the loop.
- b5 THE WEAVE (crown) — renown opens doors: better contracts where
  your stories are thick, story-aware greetings everywhere, embrace
  stories reaching monastic stills sharpen the hunt, a LEGENDS view in
  the journal ('where they tell it'), Workbench LEGEND utilities, and
  the balance pass that keeps it all quiet.

**THE SECOND ARC MAP** (proposed 2026-07-05, after six arcs complete)

**ARC VII — THE STAKE** (recommended first)
You can revive a still; now you can BELONG to one. Your founded or
rekindled hearth becomes a stake: fund districts and watch them build
(the district grammar exists — this points it at player money), invite
named wanderers and followers to SETTLE (real souls, real rosters),
raise walls and turrets by hand, keep a workshop of your own (part
storage, a bench that remembers you), and NAME the still — the naming
rite, reversed. The desert pushes back: what you love, raiders covet;
your stake's fortunes ride the same vitality math as everyone's. Ties:
economy (your still joins the routes), legend (stories root at home),
embrace (a blooming founder makes a strange town), menagerie (your
settlers wear the local lineage).

**ARC VIII — THE SEASONS**
Weather becomes a system, not a mood. Seasonal regimes (storm seasons
that cut roads honestly, clear seasons that fatten trade), glass-wind
shard storms you shelter from, cold nights that drain power, machine
HERD MIGRATIONS crossing the map on schedule (the menagerie, moving) —
and STAR-FALL: pieces of the old sky come down on seeded schedules,
spawning salvage rushes where wanderers, caravans, and raiders converge
into temporary boomtowns that dissolve in days. The economy breathes.

**ARC IX — THE MARCH**
The Rust organizes. Nest networks link into fronts; warbands MARCH,
visible on the roads and in rumor; stills raise militias, signal
towers call for aid across the lattice, and campaigns unfold whether
you attend them or not — but a walker with a legend can turn them.
The strategic layer the raid system has been rehearsing for.

**ARC X — THE TRANSMISSION**
The introspective arc. The wells learn to speak to each other:
attuned transmission as diegetic fast travel (you are information;
information degrades — a corruption tithe per jump, from the Phase 4
notes). And THE FORMER LIFE: procedurally scattered evidence of who
your mind was before the upload — shift logs with your designation,
a name on a distant rim that answers to yours — ending in a choice
about what to do with what you learn. The game finally asks the
player-character its own question.

**WILDCARD — THE COMPANY**
Followers deepened: shared deeds enter the ledger as JOINT stories,
banter on the road, their own goals and grudges, part-growth through
the sampler, and perhaps a second companion slot. The desert is less
lonely than it was; this makes the company worth the name.

*Continuous passes, any time: photo mode, procedural music, greeble
variety, the help submenu, relief-shaded map.*

**ARC VIII — THE SEASONS: THE DESIGN** (committed 2026-07-05)
Weather becomes a system, not a mood. Design tenets: (1) THE CALENDAR
IS PURE — every seasonal fact derives from (seed, worldT), replay-
identical, nothing saved but what the player did; (2) seasons press on
SYSTEMS, not just palettes — roads, markets, crews, corruption weather,
migration; (3) EVERY HAZARD HAS A READ — the desert forecasts itself
through NPC mouths, well-keepers, sky and light, always before the
mechanics bite; (4) the desert breathes on three clocks — the day (cold
nights), the season (~6 world-days each), and the irregular (star-fall).

THE YEAR. Four seasons, desert-named, cycling ~24 world-days:
- THE CLEAR — the trading season. Storms rare, caravans brisk, prices
  kind, escort pay honest. The world exhales.
- THE VEIL — sandstorm season. Storms frequent and heavier, roads
  genuinely riskier (more scatters → more cuts → scarcity bites),
  construction crews slow, the compass swims for days.
- THE GLASS-WIND — shard season. A new hazard: regional glass storms,
  forecast a day ahead, that chip unsheltered hull and scour the light;
  shelter is real (fields, interiors, the existing windbreak check).
  After a storm passes, the glass country glitters with fresh salvage.
- THE LONG COLD — the lean season. Nights drain power outdoors (fires,
  fields, and interiors negate); the machines get hungry — sieges and
  raids likelier; the yard burns what it stored.

THE BUILDS.
- b1 THE CALENDAR — the foundation and the read. seasonAt(worldT), the
  HUD clock carries the season, sky/fog/light tint per season, storm
  frequency modulated by it, season-change journal entries, and the
  desert TALKS about it: smalltalk pools per season, well-keepers
  forecast ('the veil lifts in two days; travel then'). No pressure
  yet — b1 is legibility.
- b2 THE PRESSURE — seasons lean on the economy. THE VEIL: caravan
  scatter risk up, market scarcity amplified, work crews ×1.5 build
  time; THE CLEAR: trade fattens (kinder prices, brisker schedules,
  richer escort pay); THE LONG COLD: coveting sieges likelier, night
  spawns bolder. All deterministic modifiers on existing dials.
- b3 THE GLASS-WIND & THE COLD — the hazards. Shard storms: seeded
  regional events in season, forecast a day out, hull chip outdoors
  unsheltered, heavy audio/visual weather, fresh glass-field salvage
  after; cold nights: outdoor energy drain in THE LONG COLD, negated
  by fires/fields/interiors — the night economy of warmth.
- b4 THE HERDS — the menagerie, moving. Seeded herd routes cross the
  map as pure functions of worldT (the caravan-schedule discipline):
  masses of striders and quads with local lineage bodies, placid
  unless provoked, halting caravans at crossings, huntable at a price,
  gossiped about before they arrive ('the herd is due through the
  Sweep'). Stills near crossings mark their calendars.
- b5 STAR-FALL (crown) — pieces of the old sky come down on seeded
  schedules. A streak and a rumor first; then an impact site: crater
  glass, rare high-tier salvage, and a BOOMTOWN — a temporary camp
  cluster of named wanderers and traders that raiders also smell —
  which dissolves in days. Salvage rush as a place, factions colliding
  on a timer, stories rooting for whoever walked away with the prize.
- Workbench SEASONS tab rides along: set season, force a shard storm,
  force a star-fall, locate the nearest herd.

**ARC XV — THE COLOSSI: THE DESIGN** (committed 2026-07-06)
The old war finally gets its corpses. The producer's notes (lines
92–93): a rusted hand big enough to lift a still, a decapitated head
bigger than most buildings, extremely rare INTACT war machines buried
to the waist — paired with line 90's dangerous missions. Tenets:
(1) THE SCALE IS THE POINT — these read from kilometers; the
silhouette against sunset is the product.
(2) THE LATTICE PROVIDES, APPEND-ONLY — new types claim only cells
the launch epoch left empty, on fresh hash streams; every existing
megastructure stands exactly where it stood.
(3) THE WAR BECOMES LEGIBLE — the colossi are testimony: documents,
topics, and the Old Ones' fragments converge on what actually ended
the world.
(4) DANGER IS INVITED — the proving-tier missions are opt-in, priced
plainly, offered at impactful moments, never ambient.

THE BUILDS:
- b1 THE FALLEN — the hand and the head on the lattice (11% each of
  remaining empty cells): the standable palm with its rubble ramp,
  curled fingers three knuckles high; the rolled head with dark
  optic sockets, fallen jaw, shorn neck-cables. Full integration:
  interiors (wrist breach → the trigger room; jaw hatch → the last
  thought), nouns, topics, rumor lines, TRAVEL ports.
- b2 THE TITAN — the rarest thing in the desert (~1 per 60+ cells):
  an intact war machine buried to the waist, 150 m of torso, arms,
  and head against the sky, visible from other provinces. Its
  interior descends INTO the buried half — the magazine, the reactor
  shrine — with the heaviest lurkers in the game.
- b3 THE PROVING (crown) — line 90's dangerous missions: deep-delve
  contracts into colossi offered at wells after impactful events
  (wars won, records read, epics done), staged guardians at ×1.6,
  guaranteed Mk.III + rich caches, renown-scaled pay; arc balance.

**ARC XIV — THE LIVES: THE DESIGN** (committed 2026-07-06)
The producer's brief: souls have lives, but their words rarely show
it — give every one a history rich with relations and witnessed
events, 'to the extent that no two NPCs should seem the same save for
a different name.' Sequenced directly on THE TONGUES: the loom exists;
this arc gives it a life's worth of true things to say. Design tenets:
(1) A LIFE IS DERIVED, NOT STORED — the voices trick at biography
scale: a soul's life is a pure function of their identity and home
ground PLUS the world's real ledgers. Near-zero save weight, stable
forever, and every soul that has ever existed retroactively gains one.
(2) THE LEDGERS TESTIFY — witnessed events are REAL events: the raids
in their still's history, the campaigns of war.history in reach, the
star-fall epochs, the roads that died. A soul was seeded into or
against each ('i stood the wall that night' / 'i hid in the cistern
and am not ashamed'). Generated personal events fill only the gaps
the ledgers don't track — losses, crossings, oaths, finds — so a
biography can never contradict the record.
(3) RELATIONS ARE REAL SOULS — kin, old partners, rivals, debts bind
to actual roster members: their own yard, the still they journeyed
from (the origin link already exists), the road. Symmetric by
construction (derived from the unordered pair), so both mouths agree.
Asking after a relation makes them a topic with a bearing.
(4) THE OLD ONES — a rare few (~3%) predate the Fall: read down the
lattice like you, walked out like the original. They carry one
pre-Fall fragment and READ you differently — your arrival static,
your choice at the root, the hum you wear.
(5) LIVES FEED EVERYTHING — companions' wants re-derive from their
biographies (the nest that took SOMEONE, named; the still where their
sister still hauls water), banter gains memory-lane beats keyed to
places passed, and the asks answer back with their own lives.

THE BUILDS:
- b1 THE BIOGRAPHY — lifeOf(npc): age-band, origin arc (born inside
  these walls / came from {real still} / road-born), and 2–3 personal
  events composed from a LIFE_EVENTS grammar (apprenticeships, losses,
  crossings, finds, oaths) — surfaced through the 'ask about them'
  rotation, deterministic, tested for no-two-alike. Bench: life-of-
  nearest-soul.
- b2 THE RELATIONS — the web: 2–4 relations per soul binding real
  souls across walls, symmetric across both mouths; relations become
  askable topics with bearings; gossip prefers real relations over
  the generic acquaintance roll.
- b3 THE WITNESSES — the ledgers testify: souls carry the real events
  their ground lived (histories, campaigns, falls, cut roads) with
  seeded personal angles; THE OLD ONES appear, with pre-Fall
  fragments and their readings of what you are.
- b4 THE THREADS (crown) — lives feed everything: companion wants
  re-derived from biography (named someones, real places), memory-
  lane banter, life-answers in the asks, the balance pass, bench
  completion.

**ARC XIII — THE TONGUES: THE DESIGN** (committed 2026-07-06)
Season three opens on the mouths. The producer's diagnosis: the
underlying systems are theoretically powerful but the speech is
SELECTED, not COMPOSED — fixed pools, whole lines, and a long
playtest hears the bottom of every barrel. The style is right; the
breadth and composition are not. Design tenets:
(1) COMPOSITION OVER SELECTION — utterances assemble from fragment
grammars (opener × subject × stance × tail), the same expand()
machinery that builds names, generalized to speech. A hundred
fragments compose to tens of thousands of lines that still sound
like one desert.
(2) GROUNDED VARIATION — fragments bind to what is TRUE: this biome,
this season, this still's stage and works, this war, this market,
this speaker's neighbors and your standing with them. Composition
may never say a false thing; breadth comes from the world's actual
state space, which is enormous now.
(3) VOICE SURVIVES COMPOSITION — temperament, role, quirk, and
lineage color word choice inside the grammar, not as a coat of
paint after. The monk and the scavver can compose the same thought
and never share a sentence.
(4) THE MOUTH REMEMBERS — per-soul memory of what they told YOU:
said-sets that retire spent lines, callbacks to earlier meetings,
greetings that evolve from stranger to regular to friend.
(5) DATA STAYS DATA — fragments live in data/ modules; growing the
tongue is content work, never code work.

THE BUILDS:
- b1 THE GRAMMAR — the speech-composition engine: expand()
  generalized to utterances with per-temperament fragment pools;
  smalltalk migrated first (the widest, most-heard channel), seeded
  per (soul, day) so a soul holds their line within a day but the
  yard never speaks in unison. Workbench GEN: compose-10 previews.
- b2 THE SUBJECTS — grounding at full breadth: fragment families for
  weather/season/works/war/market/roads/neighbors/your epithet and
  band/the speaker's own role and post — everything true becomes
  sayable, composably.
- b3 THE MEMORY — the mouth remembers: said-sets per soul (saved,
  bounded), spent lines retire, 'as i told you before—' callbacks,
  first-meeting vs regular vs friend greeting arcs.
- b4 THE VOICES — idiolects: per-soul favorite words and sentence
  rhythms seeded from DNA, lineage dialects (the body dialects of
  b33 get MOUTHS), roles talking shop, creed-specific grammar
  bendings.
- b5 THE WEAVE (crown) — the whole string-space through one loom:
  rumors, gossip, tales, histories, and well-speech re-grounded on
  the grammar; two-beat exchanges (souls ask YOU things back); the
  balance pass so composition seasons and never floods.

**ARC XII — THE WORKBENCH: THE DESIGN** (committed 2026-07-05)
The dev-facing arc: the bench that built eleven arcs gets rebuilt by
what it learned. Twelve tabs grew one per arc (WORLD, TRAVEL, EMBRACE,
LEGEND, SEASONS, WAR, NET, COMPANY, SPAWN, GIVE, GEN, SOULS — 1100
lines); iteration speed is the product. Design tenets:
(1) NO BUTTON LEFT BEHIND — consolidation loses zero capability; the
merge is inventory-driven and the tests assert every old function
still reachable.
(2) THE BENCH MATCHES THE GAME — one tab per domain the game actually
has, and a standing rule forward: new arcs EXTEND tabs, never
multiply them.
(3) CREATION IS A FIRST-CLASS TOOL — named souls on demand, to spec,
placed anywhere (For Brann: the bench can bring back the lost).
(4) WATCH, DON'T POLL — the bench reports live state before you ask.

THE SEVEN TABS (from twelve):
- WORLD — time, weather, seasons, hazards, map reveal, coordinates
  (absorbs SEASONS; teleports move out to TRAVEL)
- TRAVEL — every port in one place (stills/camps/nests/megas/epic/
  anchor/front/column/rim/root/herd/fall) + the lattice: attune,
  transmit, tithes (absorbs NET's travel half + WORLD's ports)
- EVENTS — everything that HAPPENS: war fronts, raids, blooms, hunts,
  star-falls, herds, coveting, the Embrace's pressures (absorbs WAR +
  EMBRACE + scattered event triggers)
- SOULS — everyone who breathes: soul readouts, dispositions, the
  company (kit/want/ledger/band), enemy designer — and THE FOUNDRY
  (absorbs SPAWN's enemy half + COMPANY + old SOULS)
- GEAR — parts to spec, materials, the give-pile (absorbs GIVE +
  SPAWN's part designer)
- STORY — the legend ledger, renown, naming, the band, the former
  life, the record and the choice (absorbs LEGEND + NET's memory half)
- GEN — the botform sampler and generator previews, unchanged

THE BUILDS:
- b1 THE CONSOLIDATION — the 7-tab merge, inventory-driven (every
  existing button re-homed, none lost); plus the bench's own QoL: a
  filter box (type to find any button across all tabs), tab memory
  across sessions, a copyable/clearable log.
- b2 THE FOUNDRY — create named souls to spec: name, temperament,
  role, body frame; place them as a follower (a chair, if free), a
  settler at your stake (persistent — the real resurrection path), or
  standing at your feet (ephemeral, for tests). Brann, by name, back
  in the desert. Enemy designer gains names and behavior flags
  (raider/calm/infected/tier) for staging exact scenarios.
- b3 THE INSTRUMENTS — the fast-iteration deep cuts: a pinnable WATCH
  panel (live fps/worldT/season/front phase/corruption/company hp on
  screen while you play), state inspectors (dump a still's stage +
  roster + works, an npc's disposition math, the war ledger), the
  missing event triggers gathered in one place (raid-here-now, ambush
  the caravan, force a judgment, cut/heal a route), and A/B snapshot
  slots — capture and restore whole world-states for repeatable tests.

**ARC XI — THE COMPANY: THE DESIGN** (committed 2026-07-05)
For Brann. The desert is less lonely than it was; this arc makes the
company worth the name. Design tenets:
(1) A COMPANION IS A PERSON, NOT A PET — wants, grudges, a home they
miss; they speak on the road unprompted and they remember.
(2) SHARED DEEDS ARE SHARED STORIES — deeds done together root as
JOINT stories feeding both legends; the desert learns the band, not
just the walker.
(3) THE BODY GROWS — companions wear real parts, given by your hand:
the best equips, the rest rides, and every granted ability has a
combat meaning.
(4) THE COMPANY IS PLURAL — a second chair, earned; companions talk
to each other; and one day the yards name the band itself.

THE BUILDS:
- b1 THE KIT — the producer's note, verbatim: give parts to your
  follower (PLATING/ARMS/CORE; legs they keep their own). Equip-if-
  best per slot, the rest carried; gear feeds hull, armor soak, and
  arm; every ability given has a combat behavior (lance/volley at
  range, whirl/crush in the press, mend on the move, aegis when
  cornered, overcharge to recover). Gift and kit views in dialogue;
  COMPANY workbench tab.
- b2 THE ROAD TALK — banter: unprompted lines keyed to biome, season,
  weather, wars, arrivals, descents, and what you are becoming; a
  voice per temperament and quirk; paced to season, never flood.
- b3 THE JOINT LEDGER — shared deeds root joint stories ('the walker
  and Brann…'), companions accrue their own renown, yards greet them
  by name, and enough stories coin a companion epithet.
- b4 THE WANT — each companion carries a seeded want (a place, a
  vengeance, a ride down the line) and a grudge; fulfilling wants
  deepens loyalty (stat growth, new banter, they stand through
  wounds); neglect is voiced, and long enough, walked away from.
- b5 THE SECOND CHAIR (crown) — a second companion slot earned by
  renown and loyalty; inter-companion banter; trio joint stories;
  the balance pass; and THE BAND NAMED — when the company's shared
  stories run deep enough, the yards coin a name for the band
  itself. For Brann.

**ARC X — THE TRANSMISSION: THE DESIGN** (committed 2026-07-05)
The introspective arc. The fiction has been in the code since v0.1:
respawn points are 'bound transmission points' — the wells have
carried you before. This arc makes the carrying voluntary, priced,
and finally personal. Design tenets:
(1) TRAVEL IS INFORMATION, AND INFORMATION DEGRADES — transmission
is diegetic: you are read down the well-lines and reassembled, and
the letter rides the line with you (a corruption tithe per jump,
scaled by distance). Fast travel that FEEDS the Embrace economy
instead of bypassing the world.
(2) THE NETWORK IS EARNED, WELL BY WELL — you jump only between
wells you have ATTUNED (a rite, paid once, gated on standing; capped
wells are dark, hostile wells refuse). No free map teleport: the
lattice is a thing you build across the whole desert, and it looks
like your life's itinerary.
(3) THE ROADS STAY ALIVE — the tithe keeps walking meaningful;
caravans, stories, and contracts still ride the ground; the desert's
loneliness is punctuated, never abolished.
(4) THE FORMER LIFE IS FOUND, NOT TOLD — the lines remember everyone
they ever carried, including you. Who you were arrives as EVIDENCE:
fragments leaked on jumps, shift logs bearing a designation that
answers to yours, a name on a distant rim, a soul who remembers.
It converges on the upload site and ends in a choice. The game
finally asks the player-character its own question.

THE BUILDS:
- b1 THE ATTUNEMENT — the lattice exists: the attunement rite at any
  living well (scrap + a cell, standing-gated), the TRANSMIT verb
  between attuned nodes with a distance-scaled corruption tithe,
  arrival presentation, attuned rings on the map, journal fanfare for
  the first waking. Workbench NET tab from day one.
- b2 THE STATIC — the texture of the line: reassembly glitch and
  arrival static the yard can see (gossip: walkers who arrive with
  the hum on them), what rides and what walks (followers make their
  own way to you), monastic/ferro-cult readings of frequent jumpers,
  and the first MEMORY LEAKS: jumps surface fragments addressed to a
  designation the well insists is yours.
- b3 THE FORMER LIFE — the evidence system: a seeded pre-upload
  designation per save; fragments scattered where evidence lives
  (shift logs, lockers, well-rims, one living soul who knew the
  name); a FORMER LIFE ledger in the journal assembling the picture
  fragment by fragment.
- b4 THE SOURCE — the trail converges on the upload site (a deep
  node beneath a far megastructure, seeded per save): the
  pilgrimage, the descent, and the record itself — who was read in,
  when, and what was left out of the copy.
- b5 THE CHOICE (crown) — carry the old name, give it back, or wipe
  the record: each with teeth (the epithet system, the creeds, the
  tithe itself react), arc-wide balance, gossip saturation, Workbench
  completion. The desert has been calling you walker all along; now
  you decide if it was right.

**ARC IX — THE MARCH: THE DESIGN** (committed 2026-07-05)
The Rust organizes. Design tenets: (1) CAMPAIGNS ARE LEGIBLE AND
ATTENDABLE — every march is a column on the ground when near and a
rumor when far; every battle has a place and a time you can reach or
miss; (2) PAPER AND PRESENCE AGREE — offscreen resolution uses the
covet-style math, and attending is the thumb on the scale; (3) THE
WORLD ANSWERS ITSELF — stills raise militias and call for aid; the
desert doesn't need the player to fight its war, but wins more with
them; (4) BOUNDED STAKES — one front at a time, exhaustion after every
campaign, sacked stills can be retaken and rekindled. War has seasons
like everything else.

THE SHAPE. Nest CLUSTERS (≥3 living nests within reach of each other)
can WAKE into a FRONT: massing (rumor, deepened auras) → the MARCH (a
visible warband column walking nests→still on the caravan discipline,
led by a warhulk) → the SIEGE (a multi-wave super-raid, live if you
attend, paper if you don't) → HELD or SACKED (stage drop, deaths,
histories) → exhaustion. Breaking the column breaks the front — a
walker with a legend can turn campaigns with their own hands. State:
war fronts saved (what happened is state; the rolls stay seeded).

THE BUILDS.
- b1 THE WAKING — fronts exist and are read: deterministic nest
  clustering, the seeded waking roll (sharpened by the long cold),
  massing rumor through gossip/journal/map, one front at a time,
  Workbench WAR tab from day one.
- b2 THE COLUMN — the march made flesh: warband schedule, the visible
  column (raiders + a warhulk), intercept-and-break, arrival → siege.
- b3 THE SIEGE — the battle: live multi-wave super-raid when present;
  covet-style paper resolution when absent (turrets, works, walls,
  militia, defenders all count); HELD breaks the front with stories,
  SACKED drops the still a stage and the well keeps the names.
- b4 THE MUSTER — the world answers: militias arm at threatened
  stills, signal towers CALL FOR AID (map ping, compass pin, journal),
  player verbs (fund the militia, stand the siege, hunt the column),
  and renown raises volunteers who march with you.
- b5 THE TIDE (crown) — campaign memory: exhaustion seasons, sacked
  stills retaken and rekindled (the loop closes through the hearth
  rites), war stories and campaign epithets on the Legend substrate,
  gossip saturation, the balance pass, Workbench completion.

## build 2026.7.104 — the second chair, seated properly — ✅ SHIPPED

Two playtest catches from THE COMPANY, both second-member bugs.

- ✅ **The Brann bug (uninteractable second)**: [E] returned on the
  FIRST company member within 2.5 m — in marching formation both are
  usually in range, so every press reached the first chair and the
  second could never be spoken to. Now the NEAREST chair wins, and the
  interact prompt follows the same rule (it used to only ever name the
  first chair).
- ✅ **The fusion bug (same spot on load)**: restore placed both chairs
  at exactly the player's position, and the spacing separator SKIPPED
  coincident souls (its divide-by-zero guard treated d=0 as
  unseparable). Restored chairs now land on opposite sides of the
  walker (measured 3.44 m apart), and even deliberately fused souls
  part within one tick along a fixed axis.
- Verified: round119 (10 checks — nearest-chair symmetry both ways/
  second fully conversant (want, kit, part-ways all offered)/save
  carries both/restore stands them apart/forced-fusion parts), boot
  clean, regression 61 fps.

## build 2026.7.103 — "The Colossi" (ARC XV, build 3) — ✅ SHIPPED · ARC COMPLETE

THE PROVING — line 90's dangerous missions, at last.

- ✅ **The door opens at impactful moments**, never from the average
  stilldweller: a KNOWN war ended in victory (held/stood/broken/
  column), the intake record read whole, an epic recommission done, a
  star cored. For six days after, every living well offers THE PROVING
  — one at a time, the door consumed on signing.
- ✅ **The contract**: reach the deep room of the nearest UNTAKEN
  colossus (hand/head/titan — the old war's corpses keep the proving
  grounds) and take what it keeps. The well-keeper unrolls an actual
  pre-Fall FORM; pay is renown-scaled (30 ▤ + 4/renown); the target
  marks, and the compass pins it if free ('sign by walking').
- ✅ **The proving ground**: four staged guardians at ×1.6 the local
  tier hold the deep room over the resident lurkers ('you can hear
  them from here'), sentinels among them.
- ✅ **The taking**: looting the deep cache completes on the spot — the
  pay, a GUARANTEED Mk.III part on top of the cache's own, a
  delve-kind story for the legend ('the yards call that a proving,
  and they mean it as a title'), lived-chapter entries for every
  companion who stood it, journal, pin released.
- ✅ Workbench EVENTS: proving? readout, open-the-door free, port,
  abandon.
- Verified: round118 (21 checks — war opens door/well offers/signs vs
  a colossus/door consumed + offer spent/guardians ×1.6 measured/full
  taking with pay + Mk.III + story + lived/save/bench), boot clean,
  regression 61 fps.

**ARC XV — THE COLOSSI: COMPLETE.** The Fallen, the Titan, the
Proving. The old war finally has corpses — a hand that could hold a
still, a head bigger than most buildings, and twenty-three intact
titans still standing waist-deep where it left them — and the desert
finally has missions worthy of walking into them. Lines 90, 92, and
93 of the notes: closed.

## build 2026.7.102 — "The Colossi" (ARC XV, build 2) — ✅ SHIPPED

THE TITAN — intact, waist-deep, still standing where the war left it.

- ✅ **The rarest thing in the desert**: 2% of the cells every other
  epoch passed over — census: 23 titans vs 207 hands, 170 heads, 313
  launches across 3,600 cells, every prior claim re-derived intact.
  190 m from the buried waist to the bent antenna.
- ✅ **The body**: tapering torso tiers with an old wound in the chest
  plate (the hole that didn't finish it), flared pauldrons, one arm
  hanging dead at the flank and one PLANTED — the machine died
  standing and refused to finish falling; the buried fist is
  standable. The head intact, optic band dark, watching the horizon
  it lost. Screenshot: MN-2 "PALEBREAKER" filling the sky, the player
  ant-sized at the waist.
- ✅ **Machine-named**: titans draw from the machine grammar, not the
  ruin grammar — they are intact; they have a NAME.
- ✅ **The heaviest halls in the game**: waist hatch → magazine row →
  servo cathedral → THE REACTOR SHRINE (3 floors down, the deepest
  grammar); lurkers at ×1.45 the local tier with sentinels in the
  deep — measured tiers to 6.96.
- Verified: round117 (16 checks — geometry + 190 m + standable fist/
  rarity census + priors re-derived/machine name/live load/themed
  3-floor interior/lurker tiers/screenshot), boot clean, regression
  61 fps.

## build 2026.7.101 — "The Colossi" (ARC XV, build 1) — ✅ SHIPPED

THE FALLEN — the old war's corpses claim the empty desert. (Arc design
committed above: the scale is the point; the lattice provides,
append-only; the war becomes legible; danger is invited.)

- ✅ **THE HAND**: fingers chained knuckle-to-knuckle, curling out of
  the sand three joints high, thumb opposed and half-buried, a severed
  wrist trailing cables into the dune — and the palm is STANDABLE
  (rubble ramp up), broad enough to hold a still, as ordered. Reads
  unmistakably from 200 m (screenshot: the curl against the glass-wind
  sky).
- ✅ **THE HEAD**: a decapitated war-machine head bigger than most
  buildings, resting where it rolled — dark optic sockets, snapped
  crown crest, antenna stubs, the jaw fallen separately (standable),
  shorn neck-cables fanning behind.
- ✅ **RNG-safe claims**: hand and head take 11% each of cells the
  launch epoch left EMPTY, on fresh hash streams — census over 1600
  cells: 668 legacy, 150 launches (every one re-derived intact), 97
  hands, 74 heads. The legacy pick pool stays frozen.
- ✅ **Full citizenship**: themed interiors (wrist breach → tendon
  galleries → THE TRIGGER ROOM; jaw hatch → optic gallery → THE LAST
  THOUGHT), rumor nouns ('a warbot's hand, fingers curled out of the
  sand'), lore nouns, topics membership, map marks, TRAVEL ports
  (MEGA_TYPES_ALL-driven, zero bench edits needed).
- Verified: round116 (18 checks — registry/geometry + standables/1600-
  cell census with launch re-derivation/live load/themed interior/
  rumor + topics/bench/screenshot), boot clean, regression 61 fps.

## build 2026.7.100 — the finder keeps its promise — ✅ SHIPPED

The hundredth build of July, a field report from the Old One hunt.

- ✅ **The phantom Old One** (playtest catch): the workbench finder
  scanned candidate roster ids 0–11, but rosters are SMALLER — size
  class, stage trims, and funded homes decide who actually spawns. It
  was pointing at souls who never exist ('roster soul #7' of a
  four-soul hamlet). The finder now replicates the exact spawn math
  (residents, stage trim with the lean floor, funded homes) and scans
  only GUARANTEED indices — conservatively where a still's stage is
  unjudged. The report now states the count ('roster soul #2 of 5
  guaranteed spawns'), and the miss message explains that lean stills
  hide some and how to widen the hunt.
- Verified: round115 (6 checks — the finder ports to Whiteyard and the
  SPAWNED roster contains exactly the promised Old One; per-soul checks
  agree; the guarantee never exceeds the real spawn count), boot clean,
  regression 61 fps.

## build 2026.7.99 — "The Lives" (ARC XIV, build 4) — ✅ SHIPPED · ARC COMPLETE

THE THREADS — lives feed everything, and nobody narrates their own
sack like distant news.

- ✅ **OWNERSHIP** (the producer's note, closed): at the affected still
  the aftermath speaks FIRST-PERSON, never rumor-voiced — 'you are
  standing in what the march left us. we are not a rumor to ourselves —
  we are a repair schedule' / 'the wall did not hold. i was here…
  that is the whole story and i own every word.' Measured: 60 draws
  at the sacked still, 22 first-person, ZERO rumor-voiced; the rumor
  voice remains intact away from the wall. The waking is owned by
  construction: at the target you always sense the brood-song before
  a rumor could land, and the here-voice pools carry the yard (with a
  first-person fallback if a rumor ever does slip through).
- ✅ **Wants with names in them**: assignWant threads through the LIFE —
  a place-want prefers the kin's real still ('{kin} of mine keeps
  there — {name}. i want to stand in their doorway once more'), a
  nest-want names its someone ('it took a digging partner from me,
  back before i knew you').
- ✅ **Memory-lane banter**: passing the kin's still ('do not let me
  leave without saying so out loud'), and a living nest with a loss in
  the life — 'every core we break is a letter i finally get to send.'
- ✅ **The asks open their lives**: replies sometimes end with 'me — '
  and one of their own derived events. Conversation is two biographies.
- Verified: round114 (10 checks — ownership at home + rumor away/
  waking owned/named wants + bound say/lane beats/life echoes), boot
  clean, regression 61 fps.

**ARC XIV — THE LIVES: COMPLETE.** The Biography, the Relations, the
Witnesses, the Threads. Every soul has a derived past that can never
contradict the record, real kin both mouths agree on, testimony in the
first person for the events they lived, one-in-38 who remember bells
that meant dinner — and companions whose wants have names in them.
No two the same, save for a different name. Next: THE COLOSSI.

## build 2026.7.98 — "The Lives" (ARC XIV, build 3) — ✅ SHIPPED

THE WITNESSES — the ledgers testify, and the Old Ones read you.

- ✅ **The testimony**: souls near a recorded event were THERE.
  witnessedOf(npc) matches the still's real history entries (seeded
  participation, ~60%) and the nearest war campaign within 9 km. The
  record is the world's; only the ANGLE is theirs, seeded per soul:
  stood it ('you learn what you are, nights like that'), hid ('i hid
  in the cistern and i am not ashamed. the cistern was full of the
  sensible'), helped ('i carried water to the wall crews until my
  joints sang'), or came after ('i helped cut the names. the chisel
  is heavier than it looks'). War campaigns get outcome-keyed
  neighbor-testimony ('we do not call them refugees anymore; we call
  them neighbors'). Witness beats join the self rotation between
  relations and the lived chapter.
- ✅ **THE OLD ONES** (~2.6% measured): souls read down the lattice
  like you, derived from identity — the same souls are old in every
  save of a world. Their life-arc IS the reading ('read down the line
  in the second series, and walked out the far side of everything');
  they keep ONE pre-Fall fragment, told as the LAST beat of their life
  — a secret for those who keep asking ('we had bells that meant
  DINNER'). And they READ you: fresh off the line they recognize the
  hum from the inside; your choice at the root reaches them — the
  carried name respected ('carrying it gets lighter. i would know'),
  the erasure FELT ('the ledger lightened by one, a while back… i am
  only saying i FELT it'). Recognition lines retire through the said-
  ledger like every other thought.
- ✅ Workbench SOULS: old-one? check, find-an-old-one (pure-hash roster
  scan across 40 km, ports you there), witnesses-of readout.
- Verified: round113 (19 checks — rate 26/1000/stability/arc override/
  witness compose + told live/war testimony/reads static + retires +
  reads the erasure/fragment last/bench), boot clean, regression
  61 fps (one 56 reading re-run and confirmed as machine noise).

## build 2026.7.97 — "The Lives" (ARC XIV, build 2) — ✅ SHIPPED

THE RELATIONS — the web of real souls. Plus the retelling, closing the
producer's loom question.

- ✅ **THE RETELLING** (the loom, fully closed): life-beats were composed
  once and told verbatim — now the FACT is fixed but the TELLING
  composes fresh every time (tellLife/tellLived frames: 'the yard tells
  it fancier, but the true shape is this: …' / 'ask them about day 31
  sometime: … they have already improved the telling twice'), then
  through decorate for the voice. Same truth, never the same sentence.
- ✅ **The yard web**: relations derive from unordered roster pairs —
  symmetric by construction (19 pair-ends checked, zero asymmetry):
  cousins, old digging partners, rivals, water-debts (direction agreed
  by roster order), teacher/apprentice, near-siblings. Resolved against
  the LIVING roster at dialogue-open.
- ✅ **The away-kin**: souls with a real origin still (the link that
  always existed) carry named kin there — telling it marks the still
  (rumored) and registers both topics: the web becomes walkable.
- ✅ **Both mouths agree**: ask A about B and B about A — same bond,
  told from each side ('my first teacher' / 'my old apprentice').
  Relation beats join the self rotation; gossip prefers real relations
  over the generic acquaintance roll.
- ✅ Workbench SOULS: relations-of-nearest-soul (the web, with ranges).
- Verified: round112 (13 checks — retelling varies over fixed facts/
  symmetry sweep/determinism/told + asked + other-mouth-agrees/away
  told + marked + topics/bench), boot clean, regression 61 fps.

## build 2026.7.96 — "The Lives" (ARC XIV, build 1) — ✅ SHIPPED

THE BIOGRAPHY — a life derived, a chapter lived. Season three's second
arc opens, with the producer's two-way street built in from day one.

- ✅ **lifeOf(npc)**: the derived past — a pure function of identity and
  home ground, zero save weight, retroactive for every soul that has
  ever existed. An origin arc routed by their real links (camp souls
  are road-born, origin-linked souls 'came from {their actual
  neighbor still} after the water turned', the rest born inside these
  walls) plus 2–3 personal events from a LIFE_EVENTS grammar — losses,
  crossings, finds, oaths, apprenticeships, scares — kinds never
  repeating within a life. Measured: 60 souls, 60 distinct lives.
- ✅ **THE LIVED CHAPTER** (the two-way street): `lived[key]` records
  what happens to a soul ON YOUR WATCH — keyed by NAME for companions
  so it survives partings and rehires. Recorded so far: taking the
  road beside you, the want answered (with its target), refusing to
  fall, the yards coining their name, partings (good terms / for a
  funded home / gone wanting). Capped at 12, saved.
- ✅ **Told, not stored-and-hidden**: the 'ask about them' rotation now
  walks the life on its odd beats — the arc ('me? came from Wellrest
  six seasons back, two steps ahead of a debt.'), the derived events,
  then the lived chapter ('and since knowing you — day 31, refused to
  fall when the ground asked twice. they tell it like it happened to
  someone luckier.'), then back to the usual self-talk.
- ✅ Workbench SOULS: life-of-nearest-soul (derived + lived).
- Verified: round111 (19 checks — stability/60-alike/no artifacts/arc
  routing/self rotation tells arc + every event/recruit + want + last
  stand + parting all recorded and TOLD/cap/save/bench), boot clean,
  regression 61 fps.

## build 2026.7.95 — "The Tongues" (ARC XIII, build 5) — ✅ SHIPPED · ARC COMPLETE

THE WEAVE — one loom for every mouth, and the mouths ask back.

- ✅ **THE ASKS** (the crown's new thread): once acquainted (met ≥ 2),
  a soul may turn a talk beat around — one question per conversation,
  never more (28% after the second beat). Five families: shared
  ('where do you actually sleep?') and per-creed (the broker: 'what is
  the strangest thing you have ever paid with?'; the monk: 'when you
  pass the rim, do you read the names, or walk by?'; the scavver:
  'settle a yard argument — best thing you ever pulled out of the
  ground?'; the cultist: 'your parts — do they dream?'). The floor
  becomes yours: 2–3 replies (plus 'leave it unanswered'), each with
  its own voiced response and a small shift in regard.
- ✅ **The loom reaches every channel** (the producer's note, exactly):
  topic/concept answers now retire through the same said-ledger as
  smalltalk (proven: one hash per answer, none repeated); companion
  banter runs through the grammar (two composed day-lines join every
  idle pool) AND through decorate — the company speaks in their own
  voices and vocabularies on the road, duo exchanges included.
- ✅ **Balance**: the ask never fires for followers (banter is their
  channel), never before acquaintance, never twice in a talk; composed
  banter joins rather than replaces the hand-written idles.
- ✅ Workbench GEN: preview-the-asks per temperament with reply trees.
- Verified: round110 (14 checks — asks sound all tongues/live flow
  question → replies rendered → response + regard → once-per-talk/
  concept retirement through the ledger/banter composed + voiced/
  bench), boot clean, regression 61 fps.

**ARC XIII — THE TONGUES: COMPLETE.** The Grammar, the Subjects, the
Memory, the Voices, the Weave. Speech is composed, not selected;
grounded in what is true; spent without repeating; voiced per soul and
per valley; woven through every channel — and the desert now asks the
walker questions of its own. The producer's diagnosis, answered: the
underlying system finally has the leeway it deserved.

## build 2026.7.94 — "The Tongues" (ARC XIII, build 4) — ✅ SHIPPED

THE VOICES — idiolects and valley dialects, derived, never saved.

- ✅ **The idiolect**: every soul's voice derives from their identity
  hash — two favored openers ('truth told —', 'as the dunes are
  long —'), one private vocabulary set (their word for it: desert→big
  quiet, storm→howler, machines→irons, night→the dark…), one trailing
  tic (' as my mother built me to say.'), and personal rates. Zero
  save fields: the same mouth keeps the same habits forever, for free.
- ✅ **Valley dialects**: the ~2.6 km lineage grounds of the Menagerie
  get MOUTHS — eight regional speech-bendings (wind→the breath,
  scrap→bones, caravan→bell-train, wall→the shoulder) with a regional
  opener each ('hereabouts we say —'). A yard shares its ground's
  tongue; each soul keeps their self. Bound at dialogue-open from the
  home ground.
- ✅ **Flourish discipline**: vocabulary always (it IS their word);
  at most ONE flourish per line — opener or tic, never both, mostly
  neither (measured 18% / 4% / 0). Applied at the decorate() choke
  point, so every channel — greetings, smalltalk, gossip, topics —
  speaks in voice.
- ✅ Workbench GEN: voice-of-nearest-soul readout (openers, vocabulary,
  tic, dialect, rates).
- (iCloud fought the lineageAt import hard enough that the dialect now
  keys directly on the 2.6 km valley cell — same regionality, one
  fewer import, and the sync daemon is appeased.)
- Verified: round109 (13 checks — stability/variety/word-boundary
  swaps/dialect same-valley + cross-valley/flourish rates/live bind/
  vocabulary in real talk/yard shares ground, souls keep selves/
  bench), boot clean, regression 61 fps.

## build 2026.7.93 — "The Tongues" (ARC XIII, build 3) — ✅ SHIPPED

THE MEMORY — the mouth remembers you.

- ✅ **The acquaintance arc**: every soul keeps `spoken[id] = {met,
  lastDay, said}` (saved). Greetings compose by the shape of the
  acquaintance — MEETINGS grammars, stanced per creed: FIRST ('a new
  face. the letter has not mentioned you'), BACK ('you came back. the
  stall notices these things'), REGULAR at four meetings ('the
  children have stopped staring at you. highest local honor'), FRIEND
  at regard 50+ ('i was hoping the dust was you'), and LONGGAP past
  twelve days ('well now — {days} days, give or take… i had half-filed
  you with the missing'). Hostility overrules the pleasantries;
  followers keep their own manner (banter is their channel).
- ✅ **Said-retirement**: what a soul has told YOU retires from their
  pool — hashed on the TEMPLATE (facts and quirks vary around the
  thought), capped at 40 with the oldest returning. Measured: 30 talk
  clicks, 30 distinct thoughts, zero early repeats. When the pool
  truly runs dry they OWN the repetition: 'stop me if you know it.
  actually, don't:'.
- ✅ Workbench SOULS: memory? readout (met ×, thoughts spent),
  forget-me reset.
- Verified: round108 (17 checks — all stages × tongues clean/the full
  arc first→back→regular→friend→longgap with the day-count bound/
  retirement + bound + save/hostility/bench), boot clean, regression
  61 fps.

## build 2026.7.92 — "The Tongues" (ARC XIII, build 2) — ✅ SHIPPED

THE SUBJECTS — everything true becomes sayable, composably. Plus the
capitalization fix from the field.

- ✅ **The lowercase fix** (playtest catch): .cap title-cases every word
  because it was built for NAMES — and the desert speaks lowercase
  anyway. All 21 .cap modifiers stripped from the speech grammars; the
  rule is now written into the file header. Measured: zero title-case
  leaks across 320 compositions.
- ✅ **GROUNDED — 12 fragment families** that bind live facts: the four
  seasons (each stanced per-creed — the broker prices the long cold,
  the monk opens the long room, the scavver digs shallow, the cultist
  watches the walls), your epithet ('{name}. the stories beat you
  here'), the band ('the tellers put {band} in three places this
  week'), cut roads (with the count — 'scarcity is just distance
  wearing a mask'), crews on the scaffolds, and four role families
  talking shop (warden/trade/mender/keeper — 'three shoulder-joints
  and a weeping coolant line before breakfast').
- ✅ **The rule holds**: composeGrounded binds {facts} and stances
  per-temperament with shared .any pools; groundedKeys activates only
  what is TRUE (measured quiet when false). One composed line per live
  subject joins the soul's day-held stories.
- ✅ Workbench GEN: grounded-all-subjects preview per temperament, and
  the nearest soul's LIVE subjects with real facts bound.
- Verified: round107 (13 checks — lowercase sweep/all 12 families × 4
  tongues clean/fact binding/creeds color/activation + quiet/live
  channel share/in-game named + seasonal lines/bench), boot clean,
  regression 61 fps.

## build 2026.7.91 — "The Tongues" (ARC XIII, build 1) — ✅ SHIPPED

THE GRAMMAR — speech composed, not selected. Season three opens.

- ✅ **data/speech.js (new)**: four temperament tongue-grammars — the
  #symbol# machinery that names the world, generalized to utterances
  (opener × subject × stance × tail). ~180 fragment options compose to
  a space of thousands per temperament; measured breadth 150–166
  distinct per 200 draws, every tongue. Adding lines is content work.
- ✅ **The register holds**: composition is bounded by the grammar, so
  the desert's voice survives — the broker prices ('inventory is grief
  you can shelve'), the monk sweeps ('a bell rung on time is worth
  three rung beautifully'), the scavver rules ('you can eat a rumor
  for about two days. pack accordingly'), the cultist reads ('the
  bloom is not hunger. hunger stops. the bloom is closer to interest').
  Temperaments share zero sentences (measured).
- ✅ **The day-lines**: each soul composes three lines per world-day,
  seeded per (soul, day) — stable within the day (a soul holds their
  stories), rotated across days, distinct across souls (the yard never
  speaks in unison). Composed lines join the smalltalk pool at double
  weight; b1 fragments are true anywhere by rule — live-context
  binding is b2.
- ✅ Workbench GEN — THE TONGUES: compose-10 by temperament, the
  nearest soul's held day-lines (◆) vs their other days, and a
  200-draw breadth check.
- Verified: round106 (13 checks — determinism/no artifacts/breadth all
  four/voices disjoint/day-line stability + rotation + soul-distinct/
  live channel share 22-60 + saltless untouched/real-dialogue hit/
  bench previews), boot clean, regression 60 fps.

## build 2026.7.90 — the impostor and the ghosts — ✅ SHIPPED

Two field reports, one of them a genuinely good mystery.

- ✅ **The impostor Lorn** (high priority, and the player's instinct was
  right — it was NOT the same NPC): recruiting a settled soul left
  their settler record with the town, and on reload the settler
  override stamped their name, temperament, and body onto whichever
  OTHER soul held the last funded-home slot — a stranger wearing
  Lorn's everything, with different relations. `settlersOf` now skips
  settlers currently walking with you (or on the road after a
  transmission): the town keeps their HOME but not their body; part
  ways and the override stamps them back into it. Verified across the
  whole cycle. Also fixed nearby: GONE WANTING departures now return
  to the home roster instead of vanishing (recruitedIds leak).
- ✅ **Ghost loot**: the looted ledger gated interaction but interior
  rebuilds never consulted it for visibility — taken piles, caches,
  and docs re-drew as untouchable ghosts on every revisit. All three
  now check the ledger at build.
- Verified: round105 (11 checks — the full settle/recruit/reload/
  partways cycle + loot persistence with fresh-stays-visible), boot
  clean, regression 61 fps.

## build 2026.7.89 — "The Workbench" (ARC XII, build 3) — ✅ SHIPPED · ARC COMPLETE

THE INSTRUMENTS — watch, inspect, trigger, snapshot.

- ✅ **THE WATCH** (pin from WORLD): a live panel, top-right, updating
  every half-second while you PLAY — fps, day + clock, season, storm/
  shard, hull/power/rust, position + biome, the front and its phase
  (column % while marching, '(unheard)' honesty), and every companion's
  hp with their sworn ◆. Survives the bench closing; remembered across
  sessions.
- ✅ **INSPECTORS**: 'inspect this still' (stage, rep, renown, works
  standing/broken, crews with hours left, attunement, settlers, the
  loaded roster with posts, history tail); 'war ledger' (campaigns +
  the nearest wall's defense arithmetic — the numbers the players no
  longer see); 'disposition math' (THE ARITHMETIC OF REGARD: base/
  earned/letter, rep, embrace, marks, the wire & the choice, renown →
  the final tier).
- ✅ **THE TRIGGERS, gathered** (EVENTS): ambush nearest caravan (real
  ambushCaravan pipeline), cut nearest route (2 days — scarcity,
  stories, stages all feel it), heal all routes, force a judgment
  (real assessStill with the pacing satisfied).
- ✅ **A/B SNAPSHOTS**: capture the whole world-state into two bench
  slots; restore writes it over the save and reloads into it. Found
  and fixed a real race doing it: the beforeunload/pagehide autosave
  fired during the restore reload and clobbered the snapshot with live
  state — both hooks now respect the restore flag.
- Verified: round104 (32 checks — watch pins/lives/survives/remembers/
  shows company; all three inspectors; all four triggers; capture →
  mutate → restore → the mutation never happened), boot clean,
  regression 61 fps. (The /tmp date-rollover ate the test harness
  mid-round; regress.mjs rebuilt.)

**ARC XII — THE WORKBENCH: COMPLETE.** The Consolidation, the Foundry,
the Instruments. Twelve tabs became seven with nothing lost, the bench
makes souls now (For Brann — answered), and iteration got teeth: find
any button by typing, watch the world live, inspect any ledger, trigger
any event, and snapshot/restore whole worlds for repeatable tests. The
standing rule holds: arcs extend tabs; they do not multiply them.

## build 2026.7.88 — "The Workbench" (ARC XII, build 2) — ✅ SHIPPED

THE FOUNDRY — souls to spec. For Brann.

- ✅ **The soul creator** (SOULS tab, top section): name, temperament,
  role (ten, fighter and mender), body frame — three placements:
  - **as FOLLOWER**: into a free chair (bench skips the unlock), and if
    a kit waits under that name it shoulders on, every piece — type
    B-R-A-N-N and he walks the desert again with his old lance.
  - **as SETTLER at your stake**: through the real settleSoul pipeline —
    persistent, saved, on the roster, in the gossip. The true
    resurrection path for the long-lost.
  - **STANDING HERE**: an ephemeral test body by a fresh fire, 6 m east
    — re-forged from a real camp wanderer (name/temper/role/frame to
    spec, real pseudo-still so dialogue never crashes), warm enough to
    recruit on the spot, gone on reload. Plus kits-waiting readout and
    a sweep button.
- ✅ **The joint ledger doesn't care where a soul came from**: foundry
  companions accrue stories, epithets, wants, and band credit like
  anyone the roads gave you.
- ✅ **Enemy designer, staged-scene grade**: optional NAME (auto-numbered
  across counts) and behavior flags — raider (ignores fields), calm
  (herd-walks, hits back when provoked), aggro NOW.
- Verified: round103 (19 checks — Brann + kit return + live ledger/
  second chair + third refused/settler gates + places + persists/test
  body to spec + talks + sweeps + ephemeral through reload/named +
  flagged enemies/filter), boot clean, regression 61 fps.

## build 2026.7.87 — "The Workbench" (ARC XII, build 1) — ✅ SHIPPED

THE CONSOLIDATION — twelve tabs become seven, no button left behind.

- ✅ **The seven tabs**: WORLD (time, calendar, weather, map, state),
  TRAVEL (every port in the game + the lattice + coordinates), EVENTS
  (the front, the Embrace, raids/blooms/star-falls/herds), SOULS
  (residents, standing, the company, the enemy designer), GEAR (part
  designer, materials, consumables, chassis), STORY (ledger, carrying,
  renown/naming, the others, the former life), GEN (chains, testimony).
  Producer's merges followed exactly: WORLD+SEASONS, ports→TRAVEL+
  lattice, WAR+EMBRACE+events→EVENTS.
- ✅ **No button left behind, proven**: the test asserts ~140 named
  capabilities from the old bench against the live registry — missing
  list: (none). 180 buttons total. True duplicates (two '+1 day's, two
  storm toggles, two bloom buttons) merged to one home each.
- ✅ **THE FILTER**: a search box in the header — type a word and every
  matching button across every tab appears, tagged [TAB], and clickable
  right there. Built on a registry populated at init.
- ✅ **Bench QoL**: the active tab persists across sessions
  (localStorage), and the log gained copy/clear buttons.
- ✅ Standing rule now in the file header: new arcs EXTEND tabs, never
  multiply them.
- Verified: round102 (20 checks — seven tabs/full capability sweep/
  filter finds + tags + works + clears/tab memory across reload/
  re-homed buttons live/log controls), boot clean, regression 61 fps.

## build 2026.7.86 — "The Company" (ARC XI, build 5) — ✅ SHIPPED · ARC COMPLETE

THE SECOND CHAIR — for Brann. Plus the shrinking-companion fix.

- ✅ **The tier ratchet** (playtest catch): follower scale tracked live
  distance-from-origin, so walking home visibly SHRANK them — read as
  sickness, not scale. A companion now grows with the deepest desert
  they have walked and never gives it back (`tierPeak`, saved).
- ✅ **The second chair, earned**: one sworn friend + four joint stories
  unlocks a second companion slot ('join us — the company has a second
  chair'). Each chair has its own shoulder, its own dialogue (gift,
  kit, want, part ways all act on the soul you're TALKING to), its own
  want and ledger. The first chair empties, the second moves up, as
  companies do.
- ✅ **Two voices, one road**: with both chairs filled and the road
  idle, companions sometimes talk to EACH OTHER — five two-line
  exchanges ('worse going ON, is the answer nobody likes'), the reply
  landing a beat after the call.
- ✅ **Trio stories**: deeds with both root as 'the walker, Lorn, and
  Vess…', crediting both ledgers. Transmission walks the whole company
  home together; both arrive, kits intact.
- ✅ **THE BAND NAMED** (the arc's crown): at eight joint stories across
  two souls, the yards stop naming the walker and start naming the
  WALK — a band name coined from the company's dominant deed (the
  Standing Watch, the Quieting Company, the Unmarched, the
  Lamplighters…), rooted as a story that rides the roads, heading the
  LEGENDS journal. 'for everyone who ever walked beside you — every
  kit carried, every want answered, every wall stood together.'
- ✅ Workbench: second-chair readout, second test soul, name-the-band.
- Verified: round101 (22 checks — ratchet/lock + earn/two chairs/trio +
  credit/band + ledger/duo call-and-reply/per-chair gift + partways/
  company transmission walk + arrival/save), boot clean, regression
  61 fps.

**ARC XI — THE COMPANY: COMPLETE.** The Kit, the Road Talk, the Joint
Ledger, the Want, the Second Chair. The desert is less lonely than it
was, and the company is worth the name — the yards say so themselves.
For Brann.

## build 2026.7.85 — "The Company" (ARC XI, build 4) — ✅ SHIPPED

THE WANT — every companion needs one thing from the road.

- ✅ **The want**: seeded per soul (type by name-hash; target from the
  world around them) — a still their people swore sings at dusk, a
  nest that took someone from them, watching you ride the lattice up
  close, standing in a deep room, standing in the glass-wind once.
  Asked plainly in dialogue ('❥ ask what they want from the road'),
  stated in their own voice, target marked on the map — 'the route is
  yours to bend.'
- ✅ **Answering it**: fulfillment detected in play (arrival, the nest's
  heart, the moment of transmission, the deep room, the storm) — they
  become SWORN: +15% hull and arm, and once a world-day they simply
  REFUSE TO FALL ('not TODAY.' — back up at 25%, golden ring). A joint
  legend-kind story roots ('the walker bent the whole route so that a
  friend could reach…') feeding their epithet count.
- ✅ **The neglect, voiced then walked**: unanswered wants surface in
  banter every couple of days, turn pointed after ten ('i do wonder,
  some mornings, whose route this is'), and after sixteen days they
  leave at the next safe wall — 'GONE WANTING', polite about it, kit
  stashed, re-recruitable, the want still standing.
- ✅ Sworn idle banter joins the pool; Workbench: want readout, free
  answer.
- Verified: round100 (22 checks — deterministic assignment/ask + mark/
  place + ride fulfillment paths/sworn stats + last stand + once-a-day/
  neglect departure + kit waits/sworn idles/save), boot clean,
  regression 60 fps.

## build 2026.7.84 — "The Company" (ARC XI, build 3) — ✅ SHIPPED

THE JOINT LEDGER — the desert learns the band, not just the walker.
Plus the kit-loss bug from the field.

- ✅ **THE KIT WAITS** (playtest bug, wider than reported): settling a
  follower, parting ways, OR their falling all stripped the gear —
  every parting now stashes the kit by the soul's name (saved), and
  re-recruiting shoulders the old pack whole ('the kit kept, every
  piece'). Settle stores it under their new bed; the fallen's kit is
  gathered and finds them again.
- ✅ **Joint stories**: a deed done with company is a story about BOTH —
  the body itself learns the second name ('when the nests came, the
  walker AND KERN stood the wall'), the story carries `with`, and it
  rides the same roads as everything else. Solo deeds stay solo.
- ✅ **Companion renown**: each joint story feeds their ledger (count +
  deed-kinds); at FOUR, the yards coin them an epithet from the same
  pools yours came from, by their dominant deed — toast, journal ('it
  will reach them before you can tell them'), and from then on the name
  rides everywhere: the dialogue header ('warden · called Wallfriend'),
  the banter caption, the tellings.
- ✅ **The yards notice**: where the shared stories have actually
  reached, smalltalk greets the pair ('it arrives stitched to yours
  now'); where they haven't, strangers stay quiet.
- ✅ **THE COMPANY block** heads the LEGENDS journal: every soul who
  walked with you, their shared-story count, their coined name.
- ✅ Workbench: joint-ledger readout (+ kits waiting), grant-4-stories.
- Verified: round99 (18 checks — stash/reclaim/settle path/joint body +
  credit/epithet at 4/solo isolation/yard notice + stranger silence/
  role + ledger DOM/save), boot clean, regression 60 fps.

## build 2026.7.83 — "The Company" (ARC XI, build 2) — ✅ SHIPPED

THE ROAD TALK — the long walks get a voice beside you.

- ✅ **The banter engine**: while a companion walks with you, contextual
  lines surface unprompted — priority-ordered so the sharpest context
  wins: descents into hollows and deep rooms, arrival static ('i
  watched a wall of water learn your face'), storms and shard weather
  and long-cold nights, nearby wars, high corruption ('the letter is
  loud in you today'), low hull ('you are leaking, walker. visibly.'),
  biome crossings (each once), still arrivals, their HOME still ('only
  i get to say it'), dawn — and when nothing presses, idle musings
  every couple of minutes, voiced per temperament (the monk misses
  bells; the scavver diagnoses ridge lines; the ferro-cultist is only
  listening).
- ✅ **Pacing discipline**: 28 s minimum between any two lines, each
  context fires once (per place, per event, per day as fits), and
  combat holds every tongue.
- ✅ **The caption**: a dim italic bubble above the hotbar — name in
  amber, words in quotes — fading in and out over ~7 s, with the
  carrier-tone mumble every still-dweller already speaks in.
- ✅ Workbench COMPANY: make-them-talk-now, forget-what-they-said.
- Verified: round98 (12 checks — biome keys real/priority/once-only/
  idle voice/combat silence/caption DOM/cooldown/hollow lines), boot
  clean, regression 61 fps.

## build 2026.7.82 — "The Company" (ARC XI, build 1) — ✅ SHIPPED

THE KIT — the company wears what you give them. (Arc design committed
above: person-not-pet, shared stories, the body grows, the company is
plural. For Brann.)

- ✅ **Give parts to your follower** (the producer's note, verbatim):
  PLATING/ARMS/CORE from the follower dialogue — legs they keep their
  own, gaits are theirs. Best-by-value equips per slot; the rest rides
  'until it is the best they have.' Take-backs from the kit view
  ('it was getting heavy anyway.' it was not getting heavy).
- ✅ **Gear feeds the body**: +0.8 hull per point (tier-scaled with the
  usual follower growth), armor soak on every hit, +0.3 arm damage —
  and the kit view states the carried bonuses plainly.
- ✅ **They use what they're given**: every granted ability has a combat
  behavior at its part's power — lance/volley fire at range, whirl and
  crush sweep the press around them, swarm-mend patches you AND them on
  the move, the aegis field rises when they're cornered (absorbs
  everything for 4 s), overcharge recovers between fights. Rust-grown
  parts run 25% hotter. Rings and tones on every proc.
- ✅ **Part-name bug** (long-standing, from the notes): the epithet
  grammar's bare '#quality#' template minted 'Series Bulwark Lamellar'
  one roll in three — every epithet now leads with a maker ('Karst
  Series', 'Vosgane-edition'). New parts only; old misprints keep their
  names, as misprints do.
- ✅ Workbench COMPANY tab: company readout, test recruit, gift ×3,
  strip the kit.
- Verified: round97 (19 checks — 300-sample name sweep/give + equip-if-
  best + legs refused/stat feed/gift + kit views/lance + aegis + mend
  in combat/save + restore whole), boot clean, regression 61 fps.

## build 2026.7.81 — "The Transmission" (ARC X, build 5) — ✅ SHIPPED · ARC COMPLETE

THE CHOICE — the answer field, answered. Three endings, each with teeth.

- ✅ **CARRY THE NAME** ('i am {des}. i came back.'): the file no longer
  ends where the copy begins — it continues. THE LINE CARRIES ITS OWN:
  every tithe halved forever (floor 3). The monks, who keep names for a
  living, respect it (+4). If an epithet exists, both names are true;
  if not, the desert's coining becomes a second name, not a first.
- ✅ **GIVE IT BACK** ('that name belongs to the one who walked out. i am
  the walker.'): the folder returns to the dark whole and unclaimed —
  {des} stays with the one mourned at the rim. Wholly the desert's now:
  renown cap raised 8→10, and yards coin your epithet at 3 stories
  instead of 4. 'records do not grieve; that is what rims are for.'
- ✅ **BURN THE FILE**: the console asks once, in smaller type. The
  carriage comes back empty; the third series holds 41,117 names now.
  The wire's oldest claim on you is ash: corruption scrubbed to zero
  (Bloom III keeps its floor of 40). The monks call it the immaculate
  refusal (+6); the ferro-cult does not forgive a burned letter (−6).
  The console light no longer steadies when you move — it does not
  know you. The record view afterward: 'answered by absence.'
- ✅ Every choice roots a legend-kind story, travels as quiet
  CHOICE_TALK gossip (one line in the pool — the legend seasons, never
  shouts), and rewrites the LEGENDS journal header identity line.
- ✅ Workbench NET completion: choice readout, free choose ×3, unchoose.
- Verified: round96 (23 checks — gating/all three choices + every tooth/
  permanence/ash view/quiet gossip 8-60/header/save), boot clean,
  regression 61 fps.

**ARC X — THE TRANSMISSION: COMPLETE.** The Attunement, the Static, the
Former Life, the Source, the Choice. The wells learned to speak to each
other; the desert learned the player was carried in like everyone else;
and the player-character answered the game's own question — with a
name, a refusal, or a fire. The lattice hums either way. Remaining on
the map: WILDCARD — THE COMPANY (For Brann!), and the continuous passes.

## build 2026.7.80 — "The Transmission" (ARC X, build 4) — ✅ SHIPPED

THE SOURCE — the pilgrimage, the descent, and the record read whole.

- ✅ **The root**: seeded beneath one far megastructure (13–32 km out,
  reading-dish preferred) — `sourceMegaFor`, fixed per world. With the
  trail leaning, any attuned well answers ASK THE LINE THE WAY TO ITS
  ROOT: every well you've touched becomes one throat, then the
  confession — marked, journaled, 'the reading room is still lit.'
- ✅ **The descent**: inside the source hollow, a pale console stands lit
  in the deep room (placed post-generation — interior RNG untouched),
  guarded by the record's keepers (three infected machines at ×1.5 the
  hollow's tier, first visit only).
- ✅ **THE RECORD** — a new pseudo-speaker in the reading room, read in
  three parts: WHO (intake 4407-C, read in at first light of the third
  series, waiver signed unwitnessed, the clerk's illegal appendix on
  relief), WHEN (41,118 names in that morning's queue — and most are
  STILL IN THE LINE; the wells hum because the lattice is full), and
  WHAT WAS LEFT OUT (the gait, substrate-bound, could not be separated
  — the elder's recognition, explained; and the continuity note: THE
  ORIGINAL STOOD UP AND WALKED OUT. The copy rode the line; someone
  mourned the original at a well-rim. You are the one that came back).
- ✅ **The answer field**: read whole, the record surfaces one blank
  field, cursor patient — b5 THE CHOICE happens here.
- ✅ Workbench NET: where-is-the-root, reveal free, port to the root.
- Verified: round95 (23 checks — root determinism + band/askroot gating/
  console + keepers/record parts + once-only/answer field/console folds/
  stranger hollows dark/save), boot clean, regression 60 fps.

## build 2026.7.79 — "The Transmission" (ARC X, build 3) — ✅ SHIPPED

THE FORMER LIFE — six pieces of a person, scattered where evidence lives.

- ✅ **The evidence set**: the three memory leaks (b2) + THE NAME IN THE
  RIM (one seeded still near the world's root carries the designation
  cut deep into its well-rim, traced smooth by years of grief — surfaces
  when you read the names, once the line has leaked) + THE ONE WHO CUT
  IT (a seeded soul at that still recognizes your GAIT — 'i hauled water
  beside that gait for six years… and now it walks into my yard wearing
  a machine'; the walk survived the copying) + a cross-reference in the
  buried paper (~18% of megastructure interior documents carry a
  half-carbonized routing slip: 'intake {des}, berth 4407 — see central
  record'; the first one counts as evidence).
- ✅ **ASK THE LINE**: after all three fragments, any attuned well offers
  it — the water goes still, then gives up one location: where the name
  was cut, marked and topic-filed, with the unprompted addendum that
  the hand that cut it still draws water there.
- ✅ **THE FORMER LIFE ledger**: heads the MEMORIES journal tab —
  designation, N of 6, found pieces named and missing pieces teased
  ('a voice not yet met', 'a cross-reference not yet unearthed').
- ✅ **THE TRAIL LEANS** (b4's door): at five pieces, the fragments hold
  each other up and point up the oldest line toward where the record
  was made. Something down there still answers to the name.
- ✅ Workbench NET: former-life readout, port-to-rim, grant leaks,
  grant rim+soul+doc.
- Verified: round94 (23 checks — rim determinism/doc rate 18.5%/askline
  gating + spend/rim once-only/elder vs stranger/trail at five/ledger
  DOM/save), boot clean, regression 61 fps.

## build 2026.7.78 — the war owns its battles — ✅ SHIPPED

Two field reports from the Standing Harbor campaign.

- ✅ **The collision** (diagnosed from the player's screenshot): an
  ordinary ambient raid spawned at the front's target while the column
  was still on the road; the player fought THAT raid, and when the
  column arrived mid-skirmish the war siege found a raid already
  active, gave up, and resolved on paper — 'held without you' while
  they stood on the wall. Two fixes: (1) THE MARCH OWNS ITS TARGET —
  no ambient raids at a still a front is aimed at; (2) a column that
  arrives during any skirmish halts at the field's edge and takes the
  field only when it clears.
- ✅ **Verdicts, not ledgers**: paper resolutions no longer print the
  arithmetic. Four margin-ranged verdicts in the tellers' voice ('the
  march broke on the wall like weather on stone' / 'held by fingers
  and gun-heat' / 'it was close, which is the cruelest part' / 'the
  still stood no chance — the wall was a suggestion'), plus qualitative
  credit lines (the mustered, the wall left mid-fight). The numbers
  live on only in the Workbench.
- Verified: round93 (11 checks — 500-roll ambient suppression + control,
  column-halts-then-sieges, no arithmetic in journals, verdict prose),
  boot clean, regression 61 fps.

## build 2026.7.77 — "The Transmission" (ARC X, build 2) — ✅ SHIPPED

THE STATIC — the ride gets a texture, and the line starts remembering.

- ✅ **Reassembly static**: a full-screen signal burst on arrival (pale
  blue scan-noise, ~1.2 s), camera shake, and a 9-second hum the world
  can read (`_staticT`).
- ✅ **The yard saw you step out of the well**: for half a day at the
  arrival still, smalltalk turns to it — general lines plus creed
  readings (monastic: 'we will speak of this at the rite'; ferro-cult:
  'what you call travel, we call correspondence'; mercantile
  immediately wants to ship freight). Frequent riders (4+) carry the
  hum everywhere: RIDER_TALK, and the creeds adjust regard itself
  (ferro-cult +6, monastic −6 — the wire is intimacy to one and
  contamination to the other).
- ✅ **A body cannot ride**: followers are refused by the line — they
  take the road at a hard walker's pace (~22 km/world-day, saved as
  `followerWalk`) and find you when they arrive, 'dusty, and
  unimpressed with the shortcut'.
- ✅ **THE MEMORY LEAKS** (the arc's turn): the line files old records
  under your signal. At rides 2, 4, and 7, fragments surface —
  MEMORIES-tab journal entries addressed to a designation that is a
  pure function of the world seed (`formerDesignation`): an intake
  manifest with a signed somatic waiver, a shift log about someone
  asking after a coast that is gone, a final boarding record ('they
  seemed RELIEVED'). b3 builds the evidence ledger these lean toward.
- ✅ Workbench NET: designation readout, leak-next-fragment, static
  burst, follower-walk status.
- Verified: round92 (23 checks — designation/static/burst/leak order/
  yard + creed talk/disposition/refusal + walk + arrival/save), boot
  clean, regression 61 fps.

## build 2026.7.76 — the word-of-mouth rule — ✅ SHIPPED

Two producer notes on THE MARCH, the first built as a standing system.

- ✅ **THE RUMOR QUEUE** (general, not war-special): out-of-sight world
  events no longer announce themselves. A waking beyond ~2.6 km queues
  as a rumor (saved) and WAITS until a mouth near its origin meets your
  ear — the next NPC or well you talk to within reach speaks it as a
  real dialogue line ('you haven't heard? the nests around X woke
  together—' / 'the water carries a tremor from up the line'), and only
  then do the toast, journal, map marks, topics, and compass pin land.
  Within earshot you hear the brood-song yourself ('sense' variant).
  Unknown fronts march and resolve in silence (histories still written —
  the world stays true behind your back); wars that end unheard
  transmute into aftermath rumors ('there was a war while you were
  elsewhere'); stale word dies after 10 days. Star-falls stay direct —
  you SEE the sky tear. Future world-events ride the same queue.
- ✅ **War owns the threatened yard**: 4× smalltalk weight at the still
  facing the front (~2 of 3 beats), and its well leads the services
  with '— the yard drills. the well counts the days: N until the
  march —' (marching variant too).
- Verified: round91 (29 checks — silent waking/march/resolution,
  told + sense + aftermath deliveries, rumor expiry + save, yard
  saturation 42/60), boot clean, regression 61 fps.

## build 2026.7.75 — "The Transmission" (ARC X, build 1) — ✅ SHIPPED

THE ATTUNEMENT — the lattice wakes. (Full arc design committed above.)

- ✅ **js/transmit.js (new)**: the old upload lattice runs under every
  living well — the same lines that carried every mind in, including
  yours (respawn has been 'bound transmission' since v0.1; now the
  carrying is voluntary and priced).
- ✅ **The attunement rite**: at any living, non-hostile well — 8 ▤ + 1 ▮,
  once per well. The first node journals THE LATTICE WAKES. Capped
  wells are dark nodes; hostile wells never offer.
- ✅ **TRANSMIT**: from any attuned well, ride to any other — a net view
  lists nodes nearest-first with distance and tithe. The ride: seizure
  static, the dialogue closes with the body that left, reassembly a few
  strides from the far well, corruption +tithe (6 + 1.1/km, cap 28 —
  a 10 km jump costs 17). Fast travel that FEEDS the Embrace economy;
  the roads stay for everything else. THE FIRST RIDE journals once.
  Followers carried alongside (the fiction sharpens in b2).
- ✅ **The map hums**: attuned stills wear a pale-blue diamond ring.
- ✅ **Workbench NET tab** (day one): network readout, free attune
  (nearest / 5 nearest), transmit-to-farthest, tithe table, forget-all.
- Verified: round90 (21 checks — tithe math/rite/gates/net view/ride/
  once-only journals/dark nodes/save roundtrip), boot clean,
  regression 61 fps.

## build 2026.7.74 — the muster finds its voice — ✅ SHIPPED

Two playtest bugs from the war's first field reports.

- ✅ **Militia dialogue crash** (user's stack trace, exact): natural camps
  give every soul a pseudo-still home record; the muster camp passed
  `pseudoStill: null` — and so did the star-fall rush camp, the same
  latent crash shipped since b66. Both camps now carry a real
  pseudo-still ('the muster of X' / 'the rush camp'); militia and
  prospectors talk, trade, and gossip like anyone. calcDisp also
  hardened against homeless souls.
- ✅ **The stake missing from topics**: topics only ever registered from
  RUMOR, so any still you discovered by walking — which is always how
  you meet your own stake — never entered the rail. Discovery now
  registers the topic, restore backfills every mapped still on older
  saves, and renaming your stake renames its topic label in step.
- Verified: round89 (12 checks incl. dialogue-opens-no-pageerror for
  both camp types + real reload-and-resume backfill), boot clean,
  regression 61 fps.

## build 2026.7.73 — "The March" (ARC IX, build 5) — ✅ SHIPPED · ARC COMPLETE

THE TIDE — the war gets a memory, and the desert gets the last word.

- ✅ **Exhaustion scales with the ending**: a front killed early leaves
  hungry nests (rest 4); a wall that held spent the fury fully (7); a
  sack gorges the rust and it sleeps longest (8) — the beaten town gets
  time to stand back up. No death spirals.
- ✅ **THE RETAKING**: for 12 days after a sack, the still's well offers
  'raise them from the sack' (30 ▤ · 4 ▣) — a stage restored, rep +8, a
  war story rooted ('the war denied the last word'), the campaign ledger
  marked RAISED SINCE. Stills sacked to the ground still answer the
  existing rekindling rite: the loop closes at every stage.
- ✅ **The aftermath owns the smalltalk**: for 8 days after any campaign,
  within 12 km, per-outcome pools — held ('the desert argued, and lost,
  for once'), sacked ('that is not comfort, that is instructions'),
  broken, column ('that story buys drinks for a year'). Doubled at the
  wall itself.
- ✅ **THE CAMPAIGNS**: the LEGENDS journal tab now opens with the ledger
  of fronts fought — day, still, outcome, RAISED SINCE.
- ✅ **Balance pass**: paper appetite saturates at 10 (past ~7 nests a
  march is no hungrier on paper), so a prepared town — works, muster,
  funded arms — can hold even a Standing-Harbor-sized front; presence
  and preparation both count, always.
- Verified: round88 (21 checks — rest scaling/appetite cap/raise loop
  spends itself/aftermath per outcome/campaign ledger), boot clean,
  regression 60 fps.

**ARC IX — THE MARCH: COMPLETE.** The Waking, the Column, the Siege,
the Muster, the Tide. The desert now fights wars: nests wake together,
columns walk real roads behind heart-engines, sieges resolve by presence
or by ledger, the world musters its own defense (and yours), and every
campaign leaves stories, epithets, exhaustion, and the standing
invitation to take back what was lost. Next: ARC X — THE TRANSMISSION,
or the wildcard THE COMPANY (For Brann!).

## build 2026.7.72 — "The March" (ARC IX, build 4) — ✅ SHIPPED

THE MUSTER — the world answers itself; you are not alone at the wall.

- ✅ **The muster camp**: while a front lives, a real camp forms against
  the target still's wall (on the defended side, facing the war-road) —
  named souls on the wanderer chassis who talk, trade, and FIGHT the
  siege whether you attend or not. Size: the still's own militia (1,
  a day after the waking) + volunteers raised by your renown there
  (+1 per 3, cap 2 — 'they came because the stories say you'll be
  there') + 2 if you armed them. Cap 5.
- ✅ **Arm the militia** (player verb): at the threatened still's well
  while the front masses or marches — 14 scrap + 2 alloy → +2 mustered,
  a war story roots, the history remembers who paid. The muster re-forms
  around the new plate.
- ✅ **The mustered stand in the arithmetic**: defenseLedger gains 'the
  mustered +N' whenever a front targets the still — paper sieges feel
  the same bodies the live ones do.
- ✅ **CALL FOR AID — the war on your compass**: new tracked kind 'war';
  the pin follows the front through its phases (heart while massing,
  the walking column on the road, the wall under siege) with phase-aware
  text. Auto-pins at the waking if your compass is free; released when
  the front closes. Pin/unpin at any well within 9 km of the war.
- ✅ Workbench: muster readout (composition + live ledger), free-fund,
  pin/unpin.
- Verified: round87 (23 checks — auto-pin/muster math/camp forms+sized/
  named souls/funding re-forms/well verbs/story/pin follows phases/
  resolution folds camp + releases compass/ledger), boot clean,
  regression 61 fps.

## build 2026.7.71 — "The March" (ARC IX, build 3) — ✅ SHIPPED

THE SIEGE — the battle decides the front, in person or on paper.

- ✅ **Wake legibility** (playtest catch, producer's): the threatened
  still now lands on the map (rumored) and in the topics bar at the
  waking, and the journal gives its bearing and distance — no more wars
  against places you've never heard of.
- ✅ **The live siege**: an attended arrival no longer closes the front —
  it opens the battle (`phase: 'siege'`), and the battle's outcome IS
  the front's outcome. War-mode on the raid chassis: 3–6 waves scaled to
  surviving strength, wave sizes fed by strength and starved by road
  attrition (cap 9), every wave announced with its bearing — and all of
  it presses from the road the column walked, not from everywhere.
- ✅ **Three endings**: HELD (raiders spent, <4 souls lost — rep +10, a
  war story roots, 'the watch will tell this for years'); SACKED even
  attended (≥4 souls down — stage drop, funded works break, the well
  keeps every name via the existing memorial system); ABANDONED (walk
  >520 m mid-assault and the rest resolves on paper at −1 defense,
  journal 'THE WALL, LEFT').
- ✅ **The paper ledger**: unattended resolutions now show their
  arithmetic — 'the watch +4 · the town's fortune −2 · the funded
  wall-gun +1 = 3, against an appetite of 9' — so losses read as
  reasons, not dice. Defense math single-sourced (defenseLedger).
- ✅ **Sack consequences**: a sack breaks a course of funded walls and
  turrets too; orphaned sieges (reload mid-battle) resolve on paper at
  the next day-tick.
- Verified: round86 (25 checks — legibility/waves/direction/held/
  abandon/live-sack/orphan/ledger), siege screenshot (warhulk on the
  horizon down the war-road, wave one in the yard), boot clean,
  regression 61 fps.

## build 2026.7.70 — "The March" (ARC IX, build 2) — ✅ SHIPPED

THE COLUMN — the march made flesh on the road.

- ✅ **Marching phase**: at march day the massing becomes a COLUMN — a
  pure schedule (heart → still at ~7 m/s of world-walking, 0.3–1.0 days)
  that runs whether watched or not. The map mark walks with it, renamed
  'the column against X'. Journal states the ETA in day-words.
- ✅ **The warhulk** (new spawned-only kind, RNG-safe): the column's
  heart-engine — hp 520, colossal frame ×2.7, plasma lob + stomp, walks
  at siege pace. Never in any biome spawn pool.
- ✅ **Materialization**: within 340 m the column is flesh — warhulk at
  the head, up to 12 escorts in trailing files (kinds cycled, tier
  scaled to strength), all under column discipline: a new `march`
  steering field in the enemy wander state (hold the line at 0.62×,
  close gaps at full speed, fight when provoked, resume the line after).
  Beyond 380 m it folds back into schedule; the heart-engine's wounds
  persist (`hulkHp`), dead escorts stay dead (`escortsKilled`).
- ✅ **Breaking the column breaks the front**: kill the heart-engine on
  the open road → outcome 'column', rep +10, war story rooted, escorts
  scatter into ordinary weather, journal 'the wall never knew how close
  it came'. Escort kills are attrition: −1 raider per 2 dropped at the
  live siege, appetite −1 per 2 on paper (both journaled).
- ✅ **Arrival**: attended, the raid now brings the warhulk to the wall
  itself (wounds carried); unattended, war-sized paper as b1.
- ✅ Marching gossip (WAR_MARCH_TALK — sightings, not arithmetic),
  Workbench: begin-march-now, column readout, port-to-column, ARRIVE now.
- Verified: round85 (28 checks — schedule/mark/materialize/steer/
  attrition/unload-reload/break/paper/live/wild-pool safety), column
  screenshot (warhulk cresting a dune, escorts in tow), boot clean,
  regression 61 fps.

## build 2026.7.69 — "The March" (ARC IX, build 1) — ✅ SHIPPED

THE WAKING — fronts exist, and can be read and broken.

- ✅ **js/war.js (new)**: `WarSystem` on the daily tick. Where ≥3 living
  nests stand within 3.8 km of one living still, that cluster can WAKE
  into a front: seeded per (still, day), 3.5% + 2%/extra nest, +5% in
  the long cold (hunger organizes), cap 18%. One front at a time; six
  days of exhaustion after every campaign.
- ✅ **The massing is legible**: bell + toast on the waking, journal entry
  with the arithmetic (3 days to the march, dies under 3 hearts), a
  crossed-blades map mark at the cluster's heart, every front nest
  marked for the hunt, and WAR_TALK/WAR_HERE_TALK drowning out the
  smalltalk within 9 km of the front.
- ✅ **The massing is felt**: front nests breed hot (brood cap 3→5,
  cadence 11s→7s) via a `warNest` hook in the nest manager.
- ✅ **The front can be broken**: silence hearts until fewer than 3 beat
  and the waking dies unmarched — rep +8, history line, `war`-kind story
  rooted (new epithet pool: Frontbreaker, the Unmarched…), `front` deed
  travels on the event lines.
- ✅ **The march resolves either way** (b2 brings the visible column, b3
  the full siege): attended (≤450 m), it becomes a live front-sized raid
  via `eventSys.beginRaid` (+1 raider per 2 nests per wave); unattended,
  covet-style paper — defense (stage, funded guns, stake works) vs an
  appetite sized to the living nests. HELD or SACKED (stage drop, grace,
  rekindlable), both with histories and journal entries.
- ✅ **Saved state**: `war {front, rest, history}` in the save family.
- ✅ **Workbench WAR tab** (standing rule, day one): front readout,
  candidate scan, force-wake, march NOW, silence-one-nest, hard clear,
  exhaustion clear, ports to heart/target.
- Verified: round84 (23 checks — wake/rumor/pressure/break/paper/live/
  save roundtrip), module parses, boot clean, regression 61 fps.

## build 2026.7.68 — the totem announces itself — ✅ SHIPPED

- ✅ Confirmed intended (playtest question): the Rust grows slowly inside
  ferro-cultist fields even on the pans — the totem-keeps-the-bloom
  exemption composes with the salt-pause into 'the one ground on the
  white where the letter still breathes' (growth sources: rusted parts,
  nest auras, corrupting biome blends). Added the missing READ: a
  one-time toast on entering — 'the totem holds the salt OUT — inside
  these walls, the Rust breathes.'

## build 2026.7.67 — the notes pass: honest gossip, roomy yards, the salt ritual — ✅ SHIPPED

- ✅ **Gossip agrees with knowledge**: still-topics now answer across the
  full 9.5 km neighbor-gossip radius (they rumored it; they know it).
- ✅ **The yard spreads out**: idle wander roams the whole yard (6–30 m,
  half-anchored to their own homes), job posts carry soft occupancy, and
  souls within arm's reach step apart. Minimum pair distance ~7 m.
- ✅ **The salt holds** (design change, producer's): pans PAUSE the Rust
  instead of scouring it — removal is a ritual now: every non-ferro well
  offers the scrape (monastic rite most efficient at 1❄/25, common
  scraper 1❄/15), ferro-cult harvests as ever. Maintenance, like
  breathing. Bloom III floor untouched.

## build 2026.7.66 — "The Seasons" (ARC VIII, build 5) — ✅ SHIPPED · ARC COMPLETE

STAR-FALL — pieces of the old sky, and the arc's crown.

- ✅ **The streak**: one fall per ~8-day epoch, on a seeded day — the sky
  tears with a boom and a shake, the bearing is called, the rumor marks
  the map, the journal starts the clock: 'three days before the site is
  picked clean. everyone will be there. EVERYONE.'
- ✅ **The site**: a scorched crater rim, a pale star-metal core turning
  above it, cold light — and THE RUSH CAMP: a real pop-up camp of named
  prospectors (fire, tent, stash, traders — the whole camps machinery,
  injected) pitched beside the crater.
- ✅ **Everyone means everyone**: claim-jumper raiders ride in on a timer
  while you work the site — the factions collide exactly as designed.
- ✅ **The prize**: pry the star-metal from the crater — a guaranteed
  Mk.3 part (deterministic per epoch) plus alloy and cells; a story
  roots ('the walker walked away with the star-metal while the rush
  argued'); no double-dipping.
- ✅ **Dissolution**: three days on, the rush moves on — the camp folds,
  the journal closes it out, the crater keeps the rest. Mid-rush state
  saves and restores.
- ✅ **Workbench**: STAR-FALL now (2 km out) + port to the fall.

**ARC VIII — THE SEASONS: COMPLETE.** The Calendar, the Pressure, the
Glass-Wind & the Cold, the Herds, Star-Fall. The desert has time now —
and time has weather, migration, appetite, and the occasional gift
thrown down from a dead sky. Ahead on the map: THE MARCH, THE
TRANSMISSION, and THE COMPANY.

## build 2026.7.65 — "The Seasons" (ARC VIII, build 4) — ✅ SHIPPED

THE HERDS — the menagerie, moving.

- ✅ **Migrations on the year**: ~28% of 9 km cells anchor a herd whose
  route is a pure function of (seed, worldT) riding the calendar itself
  — out across the desert in THE CLEAR, grazing at the far ground
  through THE VEIL, walking home under THE GLASS-WIND, wintering in
  place through THE LONG COLD. Position is derivable forever; nothing
  is saved.
- ✅ **A column, not a mob**: 8–13 striders and lurchers (local lineage
  bodies, +0.3 tier — huntable at a price) materialize when you stand
  in their path, born calm: aggro zeroed, drifting with the schedule in
  held headings. Provoke one and it turns; the stampede spreads to
  neighbors within 30 m. First sighting journals ('a column of striders
  walking the year's road. they did not mind you.').
- ✅ **The road waits for the herd**: caravans halt when a herd's
  schedule crosses within 60 m of theirs (herdCrossing hook).
- ✅ **The yard marks its calendar**: stills within reach of a route
  gossip when the herd is due inside two days ('a hundred feet agreeing
  on a direction').
- ✅ **Workbench**: nearest-herd locator/port + 'herd HERE 120s'.

**Next in arc:** b5 STAR-FALL (crown) — pieces of the old sky.

## build 2026.7.64 — the works survive the reload — ✅ SHIPPED

- ✅ **stakeWorks was never saved**: every funded home, wall, and gun
  quietly vanished on reload (the menu read 0/N again) while the stake
  itself persisted — the field was missed in the b2 save block and no
  roundtrip test covered it. Fixed, plus a full save/load field AUDIT
  of the loader against the saver: stakeWorks was the only true gap.
  round80 now roundtrips the entire stake family (stake, works,
  storage, names, settlers, broken, stats, pending crews).

## build 2026.7.63 — narration learns to stop quoting itself — ✅ SHIPPED

Two playtest notes, fixed at the root:

- ✅ **A narration line type**: dialogue lines were universally wrapped
  in curly quotes — wrong for stage directions and parentheticals. Lines
  can now be marked `narrate`: rendered unquoted, dim, italic. Applied
  at nine sites (job-bonus parentheticals, the naming and stake keeper-
  narrations, settler moments); actual speech stays quoted.
- ✅ **The well forecasts as a well**: 'the keeper squints…' was an NPC
  line in the well's mouth (with nested quotes to boot). Now: 'the water
  goes still, listening ahead of the weather…' — one clean spoken line
  in the substrate's own register.

## build 2026.7.62 — "The Seasons" (ARC VIII, build 3) — ✅ SHIPPED

THE GLASS-WIND & THE COLD — the season gets personal.

- ✅ **Shard storms**: pure functions like everything else —
  shardStormAt(seed, worldT), half-day slots inside the glass-wind
  season (~30% carry a storm), intensity ramped at the edges so you
  hear it coming. Outdoors and unsheltered at full force: ~0.9 hull/s
  scoured off, screen shake, warnings. The air goes green; the wind
  audio carries it.
- ✅ **Shelter is real, every frame**: the sheltered state (fields,
  interiors, tall windbreaks) is now computed each frame for all three
  weathers — the fix for a stale-shelter bug where the flag only
  updated during sandstorms.
- ✅ **The read before the bite**: shard storms forecast a day out —
  a toast when the wind goes green at the edges, and the well-keeper's
  forecast warns ('keep a roof in reach: a shard storm inside the day').
- ✅ **After the glass-wind**: the storm salts the sand — wreck salvage
  runs 40% richer for a day, journaled.
- ✅ **The long cold's nights**: outdoors, unsheltered, away from fires,
  the cold taxes the core beyond its output (net −2.2 energy/s,
  whatever your regen); at an empty cell, frost chips the hull. Fires,
  fields, and roofs negate; daylight is safe. Balance caught in test:
  the first drain constant lost to baseline regen and never bit.
- ✅ **Workbench**: SHARD STORM 60s / end storm / cold night NOW.

**Next in arc:** b4 THE HERDS — the menagerie, moving.

## build 2026.7.61 — "The Seasons" (ARC VIII, build 2) — ✅ SHIPPED

THE PRESSURE — the calendar grows teeth.

- ✅ **The Veil slows the crews**: construction progress now accrues in
  WORLD time (crews work while you rest — fixed in review: the first
  cut accrued in render time and crews froze during sleep) at ×1/1.5
  under sandstorm season; the works menu quotes the drag honestly
  ('ready in ~14h (the veil slows the crews)'). Race the season.
- ✅ **The Veil buries roads**: once per day in season, a 22% seeded roll
  closes a nearby route for two days — toast, journal, and the markets
  feel it through the existing scarcity math. No new economy code: the
  cuts ARE the pressure.
- ✅ **The Clear fattens the pay**: contract and escort rewards +15% in
  trading season, quoted in the offer ('the clear is on — everyone pays
  better when the bells run early'). Stacks with renown.
- ✅ **The Long Cold sharpens appetites**: coveting sieges +6% per roll
  in season, and cold nights spawn the wild machines a third faster
  (the manager's cadence tightens 2.6s → 1.9s while it's dark).

**Next in arc:** b3 THE GLASS-WIND & THE COLD — the hazards proper.

## build 2026.7.60 — "The Seasons" (ARC VIII, build 1) — ✅ SHIPPED

THE CALENDAR — the desert learns what day it is.

- ✅ **seasonAt(seed, worldT)**: pure, save-free, replay-identical. Four
  six-day seasons; each world's year starts at a seeded phase. The turn
  is announced with a bell, a toast, and a journal entry.
- ✅ **The read**: the HUD clock carries the season name; the sky wears
  it (dust amber under the Veil, pale glass-green in the shard season,
  thin blue for the Long Cold); storm frequency rides the seasonal dial
  (the Veil brews them ×1.7 + a low-grade haze floor, the Clear starves
  them ×0.4).
- ✅ **The desert talks about it**: seasonal smalltalk pools in every
  yard ('the compass has been lying since the turn'), and well-keepers
  forecast on request — current season, days till the turn, and what
  follows ('☼ ask after the season').
- ✅ **Workbench SEASONS tab**: what-season readout, jump-to-season
  (forward-only day walk), advance 1 day / to next season, storm
  overrides. No mechanics pressure yet — b1 is legibility, per design.

**Next in arc:** b2 THE PRESSURE — seasons lean on the economy.

## build 2026.7.59 — "The Stake" (ARC VII, build 6) — ✅ SHIPPED · ARC COMPLETE

The closing notes pass — the frontier repriced.

- ✅ **Back returns to the well**: the shared 'back' handler dropped
  well-view menus (works/workshop) into NPC dialogue; wells now return
  to wells.
- ✅ **The works cost what they're worth**: ~10× prices (homes 60▤ 12▣ ·
  market 100▤ 8▮ · walls 120▤ 15▣ · guns 80▤ 8▮; mends at half), and
  crews take real time — hours for a gun, half a day per home, most of
  a day per wall course, a day and a half for the market row. Funding
  starts a project; the menu shows construction with hours remaining;
  effects land when the work STANDS (completion bells per project);
  pending crews persist through saves.

**ARC VII — THE STAKE: COMPLETE.** Claim, fund, settle, defend, and
finally belong. Next on the map: THE SEASONS.

## build 2026.7.58 — "The Stake" (ARC VII, build 5) — ✅ SHIPPED · ARC COMPLETE*

THE HEARTHSTONE — the full weight of home.
(*arc closes fully after one more notes-pass build, per the producer.)

- ✅ **The hearth holds your pattern**: claiming attunes your respawn to
  the stake; resting there re-binds it, is always free regardless of
  the keeper's mood, and restores everything.
- ✅ **The bench remembers your hands**: fabricating inside your stake's
  field refunds a fifth of the scrap. Full price on the road.
- ✅ **The hearthstone**: a claimed hearth raises a standing stone by
  the well — lamp-lit, and once the desert names you, the name goes on
  in brass. Even a bare claim raises its stone (caught in testing:
  worksOf returned null for unfunded stakes).
- ✅ **The town tells its story back**: stake residents' smalltalk
  carries the real numbers — raids held, settlers gathered, the keeper
  who funded the wall ('i lean on it sometimes just to feel
  expensive'). stakeStats (held/broke/mended) tracked and saved.

**THE STAKE, builds 1–5:** the Claim, the Funding, the Settling, the
Coveting, the Hearthstone. You can stop walking somewhere on purpose.

## build 2026.7.57 — "The Stake" (ARC VII, build 4) — ✅ SHIPPED

THE COVETING — the desert prices what you build.

- ✅ **Worth and defense**: your stake's worth (homes, market, walls,
  guns, settlers, renown) advertises; its defense (standing walls and
  guns, the residents) answers. Once per world-day, in your absence,
  the red sand does the arithmetic — deterministic, seeded, journal'd.
- ✅ **Sieges on paper**: away from home, a worthy stake (worth ≥ 3)
  draws sieges (capped 30%/roll, ≥3-day cooldown). A maintained wall
  holds ~80%; when it fails, the raiders break the sturdiest thing they
  can reach — a gun, a course of wall, the market — and go away SATED
  (4 extra days of grace: time to come home and mend).
- ✅ **The cascade is the story**: broken works stop counting (geometry,
  vitality, defense, raid-softening all read effective works), so
  neglect compounds — an abandoned stake strips piece by piece, a
  tended one shrugs raids off. Bells reach you wherever you are.
- ✅ **Mending at half price**: the works menu lists what broke; the
  labor remembers. History lines both ways ('the yard swept up and
  started over, which is the whole biography of the desert').
- ✅ **The coveting in person**: a worthy stake draws bigger live raids
  (+1 raider per 4 worth, cap +3) — walls soften them, guns fight them,
  settlers stand the wall.

**Next in arc:** b5 THE HEARTHSTONE (crown) — the full home: rest,
respawn, the bench that remembers, and the town's own story told back.

## build 2026.7.56 — "The Stake" (ARC VII, build 3) — ✅ SHIPPED

THE SETTLING — named souls choose your town.

- ✅ **Invite a wanderer**: at WARM regard (≥20), with a stake and a free
  funded home, camp wanderers offer '⌂ invite them to settle' — they
  answer in character ('a home. yes. alright. yes.'), vanish from their
  camp, and take the next funded home at your stake.
- ✅ **Settle a follower**: the party dialogue gains '⌂ offer them a home'
  beside part-ways — they unstrap the pack like it weighs a year, and
  you always know where to find them.
- ✅ **They arrive WHOLE**: settlers keep the name, temperament, role,
  and BODY you knew (frame + DNA carried in the record), your warmth
  carries onto their new roster id, and they're fully residents — jobs,
  gossip, raids — and still recruitable, so a settled friend can rejoin
  the road. Capacity = funded homes; full houses refuse politely.
- ✅ Settling roots a story ('the town that gathers people out of the
  open sand'), writes the history, journals the day. All saved.

**Next in arc:** b4 THE COVETING — raiders covet what you love.

## build 2026.7.55 — "The Stake" (ARC VII, build 2) — ✅ SHIPPED

THE FUNDING — your scrap becomes their walls.

- ✅ **THE WORKS menu** at your stake's well: raise a home (6▤ 2▣, up to
  3 — each draws a REAL settler onto the roster, RNG-safe appended
  indices), the market row (10▤ 1▮ — posts, awnings, and a stall job
  spot the utility AI works), thicken the wall (12▤ 2▣, two courses of
  stone riding the perimeter), raise a wall-gun (8▤ 1▮, up to 2 more
  turrets that fight raids).
- ✅ **Every purchase is real**: geometry rebuilds on a FRESH seeded
  stream (the rest of the still never moves an inch), history lines
  record who paid, a growth story roots and spreads, and reloads skip
  fortune judgment (bookkeeping is not a visit).
- ✅ **The works hold the still up**: +0.2 vitality per home, +0.4 for
  the market, +0.3 per wall course, +0.5 per gun (capped +2.2) — your
  investment rides the same fortune math as routes and nests.
- ✅ **Walls blunt the teeth**: raiders arrive 8% weaker per funded
  course at your stake.
- ✅ Caps hold; empty pockets refuse politely; all of it saves.

**Next in arc:** b3 THE SETTLING — invite named wanderers and followers
to settle; real souls choose your town.

## build 2026.7.54 — "The Stake" (ARC VII, build 1) — ✅ SHIPPED

THE CLAIM — a hearth you woke can become home.

- ✅ **The stake**: any still you founded or rekindled offers '⚑ drive
  your stake' at its well (existing saves qualify — rekindles are
  detected from the story ledger). One stake at a time; moving it is
  allowed and gently mourned. Claiming roots a story, writes the
  history, and pays +8 standing.
- ✅ **The workshop**: store and retrieve parts at your stake — kept
  exactly as you left them (uid-preserving), listed by name and temper
  in dialogue views.
- ✅ **The true name**: an unnamed stake offers '✎ give the still its
  true name' — the dialogue system's first typed input. The override
  applies AT THE SOURCE (stills.infoAt), so routes, gossip, markers,
  and future histories all carry your name; rosters keep their souls
  (names derive from salt, not the still's name); old journal entries
  keep the old spelling, as documents do. Sanitized, 2–20 chars.
- ✅ Save: stake, workshop contents, and given names all persist.

**Next in arc:** b2 THE FUNDING — point the district grammar at your
scrap: walls, turrets, market rows, homes that draw residents.

## build 2026.7.53 — "The Legend" (ARC VI, build 5) — ✅ SHIPPED · ARC COMPLETE

THE WEAVE — the legend ties into everything it grew from.

- ✅ **Renown opens contracts**: where your stories are thick (renown ≥
  2.4), work pays up to +50% — quoted in the offer: '(they quote the fee
  without haggling — your stories reached here first.)'
- ✅ **Legend seasons prosperity**: a still that tells your stories draws
  travelers — up to +0.6 vitality, wired into the same fortune math as
  routes and nests. Your legend can help hold a still out of the lean
  years.
- ✅ **The hunt follows the stories**: a bloom-story rooted at a monastic
  still means the monks know EARLY — hunters from Bloom I (not II) and
  more often. What the roads carry, the white ground reads.
- ✅ **The LEGENDS journal view**: your name-state up top (named / refused
  / unnamed), then every story — yours ◆ and the others' ◇ — with day
  and 'told at N stills: …' reach lines.
- ✅ **Quiet by construction** (the balance pass): one flat low-rate
  telling channel shared by all stories; renown capped; milestones
  yours-only.

**ARC VI — THE LEGEND: COMPLETE.** The Ledger (b1), the Carrying (b2),
the Telling + the Naming (b3), the Others (b4), the Weave (b5). The
desert remembers now — locally, imperfectly, and out loud.

## build 2026.7.52 — "The Legend" (ARC VI, build 4) — ✅ SHIPPED

THE OTHERS — the desert has no single story. Plus the Workbench
LEGEND tab (producer request).

- ✅ **Seeded legendary figures**: ~22% of stills anchor a legend about
  someone else — six templates (the mender who walked into the red; the
  warden whose gate held; the digger who closed a conceptory door; the
  roadwright of twelve runs; the keeper the rim read back; the saltseer
  whose book is lost). Deterministic per (world, still); surfaced when
  the still first loads; day 0 — older than your arrival.
- ✅ **Some are alive**: the subject is a REAL roster resident (name
  derivation matches the roster's exactly — a seed-signedness mismatch
  was caught in review). Meet them and 'ask about them': they answer for
  their own story, modestly ('the gate held. that is the whole true
  part. the rest is what gates do to a story.').
- ✅ **Some are the rim's**: dead subjects leave a history line at their
  still — 'the rim keeps the name…'.
- ✅ **Asking gives bearings**: name a legend-subject at any still that
  knows the story and they point you home — 'that one is real — keeps at
  {still} to this day' — marking the settlement on your map.
- ✅ **Their legend is not yours**: 'other' stories ride the same
  carrying but never feed your renown, your naming, or the walker topic
  — and their spread is journal-quiet.
- ✅ **Workbench LEGEND tab**: root/clear/list the ledger, carry 1/10
  days, reach-of-newest readout, renown-here, make-naming-ready,
  preview the coined name, clear epithet, who-am-i, nearest
  other-legend (ports to it), list known others.

**Next in arc:** b5 THE WEAVE (crown) — renown opens contracts, the
LEGENDS journal view, story-aware sharpening, the balance pass.

## build 2026.7.51 — "The Legend" (ARC VI, build 3) — ✅ SHIPPED

THE TELLING + THE NAMING — the desert speaks what it knows, and finally
says your name.

- ✅ **Caravaneers are the vector, audibly**: crews know BOTH their
  endpoints' ledgers — ask a caravaneer about the walker and they tell
  stories from either town on their road.
- ✅ **Renown**: places that hold your stories receive you a shade warmer
  — +1.2 regard per story known locally, capped at +8. Quiet by design:
  legend seasons regard, never rules it.
- ✅ **THE NAMING**: when a still holds ≥4 of your stories, its well
  offers to name you — the epithet coined from your DOMINANT deed-kind
  (stand walls → Wallfriend / the Wall That Walks; silence nests →
  Nestbane / the Quieting; delve → Mothersbane / the Lamp Below; roads →
  Bellfriend / the Fourth Bell; hearths → Lamplighter; Shapers → the
  Shaper's Hand…), hashed stable per world and still.
- ✅ **Carry it or give it back**: accepting roots 'story:naming' —
  the name spreads WITH the stories, and NPCs whose still knows it
  address you by it (~2/3 of the time; decorate() carries the epithet).
  Strangers still say 'walker'. Refusing roots its own story ('the
  walker gave it back. the desert respects that, mostly.') and closes
  the question. Both answers journaled; the naming still writes it
  into its history.

**Next in arc:** b4 THE OTHERS — the desert has no single story.

## build 2026.7.50 — "The Legend" (ARC VI, build 2) — ✅ SHIPPED

THE CARRYING — stories walk the open roads, and grow in the telling.

- ✅ **The daily walk**: once per world-day, every rooted story rolls to
  cross each OPEN route out of each still that knows it — base 12% per
  route per day, compounding with the destination's appetite (+3% per
  story already held, capped at 50%): story-rich stills attract more.
  Cut roads carry nothing — defending the routes now guards your name.
- ✅ **Deterministic**: every roll is hash(seed, story|destination, day),
  so saves replay identically; no dice drift, no save-scumming the
  spread. Measured: a story born at one still reached 22 stills in 40
  world-days through a dense cluster; airtight under cut roads.
- ✅ **The tale grows in the telling**: at stills the story REACHED
  (rather than watched), a seeded embellishment may ride along — 'the
  tellers add a storm to it now', 'they say it was twice that' —
  append-only, per (story, still), stable forever. The origin never
  embellishes; they watched it happen.
- ✅ **Milestones**: the journal notes when a story reaches 4 and 9
  stills ('the roads carry names further than faces') — thresholds,
  not exact counts, so multi-hop days can't skip them.

**Design call recorded (THE NAMING, b3)**: the player stays unnamed
until the desert names them — epithets coined by communities from the
actual deed-mix, spreading with the stories. Legends travel on
epithets, not birth names.

**Next in arc:** b3 THE TELLING + THE NAMING.

## build 2026.7.49 — "The Legend" (ARC VI, build 1) — ✅ SHIPPED

THE LEDGER — deeds become stories, and stories are local.

- ✅ **Stories with roots**: the tales registry grows into the story
  ledger — {id, kind, day, body, roots: {stillKey|'*': day}}, saved;
  old saves' tales migrate in as world-rooted ('*') stories; g.tales
  remains as a compat view. rootStory() dedupes by id and roots at
  every still within 3.5 km of the deed (or the single nearest within
  12 km — word walks home with you).
- ✅ **Seven deeds write the ledger**: the epic Mother and any natural
  Mother slain, a nest silenced, an escort delivered (roots at BOTH
  endpoints), a raid stood with nothing lost, a hearth rekindled, an
  epic revival — each with its own telling ('the nest they called X is
  quiet now. the walker made it quiet.'). Recognitions now root where
  they happened: polished at the monastic still that marked you.
- ✅ **Knowledge is local**: knownStoriesFor(npc) filters by the
  speaker's still; smalltalk tells only what THIS still knows (rate
  unchanged — quiet weaving); 'the walker' topic appends only local
  stories. A still that never heard of you says so.

**Next in arc:** b2 THE CARRYING — stories walk the open routes.

## build 2026.7.48 — camps kept, wells unfiled, routes unmirrored — ✅ SHIPPED

- ✅ **A camp made is a camp kept**: night-camped crews stay by their fire
  until dawn, even when the invisible schedule drifts within push-through
  range of the far gate (the 23:30 departure).
- ✅ **Route mirror bug** (found underneath): route endpoints followed
  iteration order while keys were sorted — the same caravan's schedule
  could flip direction depending on the query position, teleporting it to
  the reflected point. Endpoints now follow the sorted key.
- ✅ **The well is not a person**: substrate speakers (well/rust/nest) no
  longer file themselves under name-topics; saved strays scrubbed at load.

## build 2026.7.47 — "The Embrace" (ARC V, build 6) — ✅ SHIPPED · ARC COMPLETE

The Workbench EMBRACE tab — the whole stance under test controls.

- ✅ **THE STANCE**: one-click unanswered / answered / Bloom I–III (body
  stains rebuild live), FULL BLOOM and polished and deep-marks toggles,
  and 'where am i, spiritually' for the current state line.
- ✅ **COMMUNION**: set 0/25/50/75/99/100, arm an answerable whisper,
  open the correspondence directly, reset the calling cooldown.
- ✅ **EVENTS & PLACES**: send the hunters now, raise a bloom dome 20 m
  east, grant a scouring kit (12 ❄ + 20 ▤ + a Mk.3 plate), and teleport
  to the nearest ferro-cult still / monastic still / living nest.
- ✅ **TALES**: inject QA tales (registers 'the walker'), clear them,
  list the registry.

**ARC V — THE EMBRACE: COMPLETE.** The Letter (b1), the First Bloom
(b2), the Second Bloom (b3), the Third Body (b4), the Answer (b5), and
the Workbench to test it all (b6). The Rust got its argument; the monks
got their guns; the player got the choice. Ahead: the LEGEND arc
(producer's notes forthcoming) on the tales substrate.

## build 2026.7.46 — "The Embrace" (ARC V, build 5) — ✅ SHIPPED

THE ANSWER — recognitions on the Legend substrate. (Arc completion
awaits the Workbench EMBRACE utilities, per the producer.)

- ✅ **Tales about the walker**: the extensible registry the Legend arc
  will grow on — permanent, saved, deduped entries that (a) smalltalk
  frames per temperament ('they tell it in the markets: …' / 'we keep
  this one like a relic: …'), (b) register 'the walker' as a topic the
  moment the first tale lands, and (c) the walker topic itself draws on.
- ✅ **'the walker' topic**: every creed answers for what you are —
  distinct lines per temperament × state (plain / answered / blooming /
  full / polished), often appending a tale from the registry.
- ✅ **THE FULL BLOOM**: at Bloom III the brim asks ('…the last one. we
  are holding it…'); the correspondence offers the last door as a
  CHOICE. Through it: the Blooming chassis (rust body, full stains, an
  ember core), a 26 m rust ring, the tale, the journal, +8 ferro-cult /
  −6 monastic regard, and the nearest ferro-cult still re-dresses its
  totems and keeps a place at the fire (history + rep).
- ✅ **THE POLISHED**: zero rust, zero embrace, no deep marks, a full
  Mk.3 unrusted chassis, standing on monastic ground — the order marks
  the other perfect answer: tale, journal, +10 monastic regard, and one
  ring of the wall bells, which is all the celebrating they do.
- ✅ **Saturation**: EMBRACE_TALK smalltalk pools for all four creeds ×
  three states, plus POLISHED_TALK — what you are becoming is on
  everyone's tongue.

## build 2026.7.45 — "The Embrace" (ARC V, build 4) — ✅ SHIPPED

THE THIRD BODY — the state salt cannot touch, and the way back.

- ✅ **The floor**: at Bloom III nothing scrubs communion below 40 — not
  the pans, not the vials, not the rites. Re-asserted every frame, so
  every scrub source is covered at once. Below Bloom III the salt works
  exactly as it always did.
- ✅ **Rusted mastery**: rusted parts cost nothing to wear at Bloom III
  (corruptionRate zeroed at the tick), and they answer the blooming —
  +8% damage and +1 armor per rusted piece worn.
- ✅ **Sanctuary**: under a bloom dome the red sand mends kin — +2.5
  hull/s at Bloom III, neutral below.
- ✅ **The gates barred**: monastic wall-guns read the third bloom as a
  machine of the Rust — they open up inside 40 m, with a one-time toast
  and journal entry ('the guns were the explanation').
- ✅ **THE SCOURING**: the one rite the monks always perform, offered at
  monastic wells from Bloom I (even behind sealed doors): 12 salt, 20
  scrap, and your finest loose part (Mk.2+) to unwind one bloom,
  corruption burned to 15. Bloom III leaves DEEP MARKS nothing takes:
  a permanent ±4 in ferro-cult/monastic regard, saved, remembered.

**Next in arc:** b5 THE ANSWER (arc crown) — recognitions on the
extensible tales substrate, full-bloom transformation, the polished
path, temperament saturation. Then the Workbench EMBRACE utilities
before the arc is called complete.

## build 2026.7.44 — "The Embrace" (ARC V, build 3) — ✅ SHIPPED

THE SECOND BLOOM — the gifts get hands, and the bill arrives.

- ✅ **The Calling** ([C], Bloom II+): the nearest wild machine within
  60 m turns and walks beside you for 60 s, hunting its own kind (its
  eyes bank to ember while it does). Costs 12 communion — corruption
  becomes a spendable resource for the first time — 90 s cooldown, one
  companion at a time; raiders, the rooted, the stationary, and
  contract-marked machines cannot be called.
- ✅ **The nests tithe**: at Bloom II+, standing before a living fabcore
  offers SPEAK — THE NEST (the rust-red skin, its own voice: 'we do not
  rage. we CONTINUE.'). Once per world-day per nest: 2–4 rust nodules
  and +5 communion. Violence remains available; now it's a choice.
- ✅ **The rites seal**: monastic wells at Bloom II+ refuse services —
  header, the memorial names still readable (the dead are not part of
  the quarrel), everything else withdrawn. Other creeds still serve.
- ✅ **Hunters on the salt**: at Bloom II+, the white ground sends pairs
  of named hunter-monks (Brother Ilex, Sister Vane…) — a new spawned-only
  kind (pale, fast, raider-flagged so fields don't stop them but walls
  do), scaling with your bloom, ~1.6-day cooldown, journal entries both
  ways. Their salvage drops salt.

**Next in arc:** b4 THE THIRD BODY — the salt floor, rusted-part
mastery, bloom sanctuaries, monastic gates, and THE SCOURING.

## build 2026.7.43 — "The Embrace" (ARC V, build 2) — ✅ SHIPPED

THE FIRST BLOOM — the brim is a door. Plus the b1 playtest notes.

- ✅ **Bloom-at-100**: an answered soul carrying the letter to the brim
  BLOOMS instead of drowning — embrace deepens (max 3), corruption falls
  back to 40, a ring of rust light, the journal keeps it. Unanswered at
  the brim is still consumed (tenet one, verified).
- ✅ **Rustsight** (Bloom I+): every ~6.5 s, salvage answers through
  walls — wrecks, shards, caches, and undisturbed interior scrap within
  46 m ping as rising rust diamonds (depth-test off: they sing through
  everything).
- ✅ **Kinship**: wild rustforms read the blooming as kin — no aggro, and
  mid-chase they lose interest — until struck (any wound provokes,
  permanently). Raiders and scripted attackers never cared for kin.
- ✅ **The body shows it**: rust stains bloom across the player chassis,
  two per bloom level, at fixed anchorages.
- ✅ **Creed reads the bloom**: dispositions shift per temperament ×
  level — ferro-cult +12, monastic −12, mercantile −4, scavver −2.
  Verified exact for all four creeds.
- ✅ **b1 notes**: the Rust fully isolated — no topics rail, no
  disposition row, no linkified words in its mouth, a rust-voiced
  brush-off if a topic ever reaches it ('names are the salt's
  grammar…'), temperament label reads 'un-nature'; the panel takeover
  went FULL red (background wash, every option, deeper glow); the arc
  label unstuck (The Menagerie → The Embrace).

**Next in arc:** b3 THE SECOND BLOOM — the Calling, speakable fabcores,
monastic service refusal, salt-monk hunters.

## build 2026.7.42 — "The Embrace" (ARC V, build 1) — ✅ SHIPPED

THE LETTER. The Rust speaks in first person, and can be answered.

- ✅ **The correspondence**: past 50 corruption, some whispers hang in the
  air, waiting — [E] with nothing else in reach opens a conversation with
  the Rust itself (the well pattern turned inward: 'the rust · THE LETTER
  · everywhere the salt is not'). It speaks in the whisper grammar grown
  to full voice — listen, ask what it is, what it wants, what happens.
  Refusal closes gently and changes nothing; the letter keeps.
- ✅ **The answer**: 'let it in' sets embrace (saved additively; old saves
  land unanswered). Answered: seizures become negotiation (a sway, no
  stun, no wound), 99.5 stops consuming, the choir's detune collapses
  toward consonance — the same voices, no longer arguing — and the HUD
  meter renames itself RUST → COMMUNION. The journal keeps the moment.
- ✅ **The skin**: the dialogue panel possessed — rust-red frame and name,
  glowing red spoken lines, flicker and clip-glitch animations, the
  'let it in' door highlighted. Unanswered play verified byte-identical
  (seizures still bite, meter still says RUST).

**Next in arc:** b2 THE FIRST BLOOM — bloom-at-100, Rustsight, kinship,
body stains, temperament dispositions reorder.

## build 2026.7.41 — the second notes pass: gossip rounds, crews with names, raids that relent — ✅ SHIPPED

- ✅ **Gossip makes the rounds**: 'ask about them' now cycles every
  co-resident in turn instead of fixating on one fixed opinion-of.
- ✅ **Crew identity bug**: caravans never carried their route's salt, so
  every crew in the desert hashed from undefined — the same three souls
  on every road. Crews now inherit route.salt: distinct names, frames,
  DNA per road (dispositions keyed by id survive).
- ✅ **Raids relent**: cooldown 1.1 → 2.2 days, 2.5-day per-still grace
  after a raid, chance saturates at 12%/roll (was up to 50%+ in thick
  nest country), near-zero with no nests near — pressure comes FROM the
  nests, so silencing them quiets the walls.
- ✅ **The topic rail files itself**: ≤10 topics stay flat; beyond that,
  the 6 newest + category headings (a still / a place / a name / an
  idea) with counts, drill-in and back, fresh-dots carried onto
  headings.

## build 2026.7.40 — the notes pass: roads that survive, worlds that stay local — ✅ SHIPPED

Four playtest notes, between arcs:

- ✅ **Caravan survival** (the abandoned-stills diagnosis): night fires
  project a 30 m warding field (same mechanism as still-walls/anchors;
  raiders and scripted ambushes still ignore it), crews grew to 3–4
  souls, equipment floor raised (tier+1.2, hull 115→125). Fewer dead
  caravans → fewer cut roads → fewer stills sliding into the lean years.
- ✅ **Raids skip abandoned stills**: nests raid for salvage and spite;
  a stage −2 still offers neither.
- ✅ **Topic locality**: know-radii tightened (~5.2 km stills / 4.6 km
  megas) and every soul rolls a seeded REACH — 12% traveled (×3.2), 6%
  homebound (×0.55). Plus neighbor-person knowledge: ~1 in 4 souls
  knows OF a named resident of a nearby still ('the roads carry names
  further than faces'), marking the settlement when they do.
- ✅ **Biome body-schools**: each biome carries a fixed seeded axis
  accent + favored modifier, layered under the valley lineages, applied
  to every walking body. Accent modifiers derive from DNA bits, not the
  stream — existing souls keep their bodies.

## build 2026.7.39 — "The Shape of the Land" (ARC IV, build 5) — ✅ SHIPPED · ARC COMPLETE

The pre-downscale AA pipeline — the oldest open bug note, closed with
its author's own prescription.

- ✅ **AA before the chunk**: in pixel modes (CHUNKY/RETRO) the scene now
  renders full-resolution into a 4×-MSAA render target, then a box-filter
  quad pass downsamples into the low-res backbuffer, which upscales
  nearest-neighbor as before. Antialiasing happens BEFORE the pixels get
  big: distant geometry stops shimmering, edges resolve clean, the
  pixels stay honest behind the scanlines.
- ✅ **Correct to the eye**: the custom pass carries the linear→sRGB
  output transform (colorspace_fragment), so pixel modes match the
  standard path's tone exactly — caught in A/B screenshots before ship.
- ✅ **PIXEL SMOOTHING video setting** (default ON): OFF restores the raw
  path with the old haze pull-in mitigation, for low-end machines that
  used chunky as a perf mode. 61 fps measured both ways.

**ARC IV — THE SHAPE OF THE LAND: COMPLETE.** Landform provinces (b1),
ruin cutaways (b2), launch complexes + Workbench TRAVEL (b3), true
verticality — bottoms, standable decks, chasm halls, ships ×2.5 (b4),
the pre-downscale AA pipeline (b5).

## build 2026.7.38 — "The Shape of the Land" (ARC IV, build 4) — ✅ SHIPPED

True verticality — colliders learn bottoms, and the world learns to
stack. Plus the ships scaled to awe.

- ✅ **The enabling tech**: colliders carry an optional `bottom` — solid
  from bottom to top instead of down to bedrock. A finite bottom makes a
  SURFACE: stand on it from above, walk beneath it, shoot under it
  (resolve skips when it clears your head; pointBlocked respects the
  gap). Walls without bottoms behave exactly as they always did.
- ✅ **Cutaway decks hold your weight**: exposed floor decks are standable
  (with real bottoms), and a rubble stair climbs one torn flank to the
  first solid deck in ~2/3 of cutaways — steps spread dynamically along
  the flank. Squat half-buried first decks stay visual-only so the b36
  walk-in promise survives (30/30 buildings: every solid deck standable
  AND passable beneath; ground-floor entry intact).
- ✅ **Chasm halls**: ~half of the vast grand halls now open into a pit —
  the floor drops 6.5 m away under a 2.8 m bridge you can stand on, walk
  under, and fight across; a debris stair climbs back out; glow studs
  mark the bridge ends; the hall's scrap falls where everything falls
  (the pit floor). Verified end-to-end: bridge holds at hall level, pit
  walkable, under-bridge crossing clean, stair tops out.
- ✅ **Launch complexes ×2.5**: pads 48–62 m, ships 85–130 m tall — the
  old world built LARGE, and now the horizon says so.

**Remaining in arc:** the pre-downscale AA render pipeline (b5).

## build 2026.7.37 — "The Shape of the Land" (ARC IV, build 3) — ✅ SHIPPED

Launch complexes — and a Workbench built for the iteration loop.

- ✅ **A fifth megastructure kind**: the launch complex — a walkable
  scorched pad (standable collider, first of its kind for megas), a
  gantry with service arms still reaching, a fuel farm, a blast trench,
  and THE SHIP: 65% still on the pad aimed at a sky that stopped
  answering, 35% fallen across the pad an age ago, broken into thirds,
  engines never leaving.
- ✅ **Epoch-safe placement**: MEGA_TYPES stays frozen (rng.pick on it is
  load-bearing); launch complexes claim ~16% of the lattice cells the
  OLD stream left empty, on a second hash stream — verified across 1600
  cells that every legacy cell keeps its legacy type. New content grows
  in the gaps, exactly like the still-name epochs.
- ✅ **Fully a place**: its own interior grammar (crew tunnel, fuel
  galleries, the integration hall, the countdown bunker), rumor and lore
  nouns ('the ship that never flew'), topics, map reconcile, waystation
  anchor, sealed threshold — every mega system picked it up.
- ✅ **Workbench TRAVEL tab** (dev): teleport to the nearest of each mega
  kind (lattice spiral on the pure query), each still size class, mesa
  country / canyonlands / a dry wash (noise ring-scan), each biome, a
  walking caravan, the tracked job or epic pin, raw coordinates, and a
  pin-here/return pair. 24 destinations for the fast playtest cycle.

## build 2026.7.36 — "The Shape of the Land" (ARC IV, build 2) — ✅ SHIPPED

Ruin cutaways: seeing past the surface layer.

- ✅ **Torn towers**: ~28% of buried-city buildings now generate as
  cutaways — one face gone, exposing concrete floor decks (shadowed
  underside color), a full back wall, and two bitten flanks whose
  survival fraction rolls per building.
- ✅ **Prickling with rebar**: rust-metal rods jut from every broken deck
  edge at scattered angles, and vertical rebar marks where the flanks
  tore. Rubble skirts the opening; dark utility boxes and door-shadows
  stand against the back walls.
- ✅ **Accessible, with things inside**: remaining walls carry real
  colliders while the open face and interior floor stay walkable —
  verified by collision probes (walked in to 1.5 m of center; the back
  wall held the reverse probe out). 45% of cutaways hold a scrap pile.
  Deck colliders deliberately omitted: the tops-without-bottoms rule
  means a deck collider would wall off the room beneath it — upper decks
  are for the eye until true verticality (b4).
- ✅ All boxes into the same merged chunk geometry — zero new draw calls,
  61 fps held.

## build 2026.7.35 — "The Shape of the Land" (ARC IV, build 1) — ✅ SHIPPED

ARC IV opens: the desert gets a skeleton. Landforms composed into the
heightfield — the world's shape finally varies at the province scale.

- ✅ **Landform provinces** (~5 km): a very-low-frequency regime field
  divides the desert into mesa country, canyonlands, and the
  wash-threaded between. All seeded, all pure functions of (x, z).
- ✅ **Mesas**: stepped plateaus (rim + lower bench) up to ~22 m with
  tight, wall-like rims. **Canyons**: the ground splits along noise
  contours, down to ~15 m. **Dry washes**: broad, shallow, sand-floored
  channels threading every country.
- ✅ **Civilization suppresses drama**: landforms are masked to zero by
  salt-pan weight (stills stay buildable — verified 0.0 landform within
  80 m of a heart) and buried-city weight (grids stay grids), and roads
  keep only 15% of the land's shape — the old roadbeds cross canyon
  country as walkable causeways with a gentle sag.
- ✅ **Bare rock where the land stands steep**: a slope pass over the
  chunk heightfield blends stone color onto mesa rims and canyon walls
  (slope × landform-magnitude gated, so dune faces stay sand).
- ✅ Perf holds: 61 fps with the landform branch gated by regime and mask.

**Next in arc:** ruin cutaways prickling with rebar (b2), launch
complexes (b3), interior chasms + true verticality (b4), pre-downscale
AA pipeline (b5). Deferred polish note: relief shading on the map once
explored-cell records carry height.

## build 2026.7.34 — every gait stands in the hollow places — ✅ SHIPPED

Tracked/hover chassis fell through megastructure floors on entry: the
entry placement set pos.y = floor + 0.1 ignoring the chassis' base
height, so tall hulls (tracked baseY 0.85, hover 1.0) had their computed
feet below the slab — supportY rejected the floor (top > feet + step-up)
and they dropped a level, repeatedly. Entry now places every gait
baseY above the slab. Verified: tracked/hover/biped all land grounded,
zero drop, through the same door (round50).

## build 2026.7.33 — "The Menagerie" (ARC III, build 5) — ✅ SHIPPED · ARC COMPLETE

The botform sampler — the arc crown. Every frame is now only the NEUTRAL
POINT of a parameterized space; a 32-bit seed is machinic DNA.

- ✅ **Frames as samples**: buildForm generalizes all five frames over six
  decoupled axes (body w/h/d, leg length, leg thickness, head) — neutral
  values reproduce the historical geometry EXACTLY (verified to 1e-6), so
  nothing that exists was re-bodied. The legacy soul-biped got the same
  treatment: parameterized, with the shared-geometry body as its neutral.
- ✅ **Modifiers**: eight bolt-on expressives (antenna, dorsal fin, spines,
  side pods, extra arms, asymmetric shoulder, tail, brow plate) attached
  at frame-computed anchors; antennas/arms/tails sway on the gait clock.
- ✅ **Machinic DNA with contextual priors**: scavvers drift the standard
  ways (broad, extra arms, packs); brokers go broad and carry things;
  monks go tall and spare; ferro-cultists come back wrong on purpose
  (widest axes, spines/asymmetry, 3 mods). Enemies sample at spread 0.55
  so kind silhouettes stay readable; souls at 0.9; the Mother keeps her
  gantries bare — her armament is her body language.
- ✅ **Regional lineages**: every ~2.6 km cell speaks a body dialect — two
  axes bent a fixed way plus a signature modifier most locals carry, with
  a name (the Longshank line, the Broadback line...). Machines of a
  valley share a family resemblance; caravan crews carry the dialect of
  the still that raised them. The reticle intel names the lineage.
- ✅ **Stream safety**: DNA rides its own hash stream — zero rng draws
  added; names, homes, and loadouts verified bit-identical.
- ✅ Long legs slow the gait cadence: the form shapes the walk.

**ARC III — THE MENAGERIE: COMPLETE.** Frames (b1), the centipede +
per-part damage (b2), prosperity part-swapping (b3), Mother armaments
(b4), the botform sampler (b5).

## build 2026.7.32 — "The Menagerie" (ARC III, build 4) — ✅ SHIPPED

Mother armaments: what she wears is how she kills you.

- ✅ **Her armament is her identity**: every Conceptory Mother rolls one
  real ARMS part (tier 2, tier 3 in the deep tiers), seeded from her
  megastructure — the same Mother keeps the same weapon every visit. It
  sits in her loadout, so she DROPS what she wields.
- ✅ **Claw arms (Shredder Claws / Breaker Fists)**: two long hinged arms
  with claw prongs, pivoted at the gantry shoulders. Combat is a
  telegraphed three-beat — arms rise (0.75s, your warning), then slam
  through, hitting EVERYTHING in the forward arc (±72°, reach +1.2m) for
  ×1.4 damage and brutal knockback, then a long recovery.
- ✅ **Shoulder cannon (Bolt Caster / Arc Projector)**: the cannon rides
  the shoulder-joint where an arm would hang; the off-arm remains, and
  swats anyone who hugs her. Charge (muzzle glow swells, 0.9s), then a
  dramatic sustained burst — 12 fast slugs for the bolt caster, 6 heavy
  fast lances for the arc projector, mild spread, live tracking — then
  4+ seconds of silence to answer back. Barrel recoils per shot.
- ✅ Verified: deterministic arm per salt, windup lands no damage, sweep
  lands, charge glows before the first shot, burst bounded, swat answers,
  epic pipeline (delve → kill → Shaper → revive) green end to end.

**Next in arc:** the generative botform sampler (b5, arc crown) —
decoupled axes, machinic DNA with contextual priors, regional lineages.

## build 2026.7.31 — unfinished business outlasts the lean years — ✅ SHIPPED

The Zeb Stillwater fix: a fading still trims its roster, and the trimmed
souls never spawned — including ones holding the player's open contracts.
Now contract givers, chain step-targets, and epic keepers stay on the
roster at ANY stage (even abandoned: the last one, waiting), flagged
`lingering`. The spawn loop still constructs every index up to the last
one needed, so every soul's draws land where they always did. Paid
contracts release them to the lean years like anyone else.

## build 2026.7.30 — "The Menagerie" (ARC III, build 3) — ✅ SHIPPED

Prosperity part-swapping: Arc II's living economy wears itself on Arc
III's modular bodies. A still's fortune is now legible in the plate of
its people.

- ✅ **Loadouts keyed to fortune**: rollFolkLoadout gains a stage axis —
  a thriving still's residents roll a second mount more often and better
  tiers (tier 3 appears ONLY where prosperity meets the frontier); a
  fading still's folk strip down to patched single slabs. HP and damage
  follow through the existing part-stat contributions.
- ✅ **The swap comes free**: gear rolls on the same seeded stream at
  constant draw count for every stage and every outcome (the second mount
  is always rolled, only sometimes kept) — a fortune swing re-rolls the
  parts without moving one downstream draw. Verified: names, homes, and
  stage-0 loadouts bit-identical across reloads; gear monotonically
  better at +1, worse at −1.
- ✅ **The road carries the wealth**: caravaneers roll their loadout at
  their ORIGIN still's stage (stageOf hook) — crews out of a thriving
  town wear it, crews out of a fading one don't.
- ✅ **Legible at a glance**: greebles take a mood tint — kept metal in
  the good years, sand-eaten patchwork in the lean ones.
- ✅ **Spoken aloud**: prosperity smalltalk pools — "new plate this
  season, the roads paid for it" / "don't look too hard at my plating."
- Plus the 2026.7.29 QA build: paused audio eases out instead of droning
  under menus, failed contracts read — FAILED in rust-red, and mercy
  (revive/rekindle) no longer triggers a fortune judgment in the same
  breath — the judgment stays pending for the next ordinary visit.

**Next in arc:** Mother armaments reflecting parts (b4), then the
generative botform sampler (b5, arc crown).

## build 2026.7.28 — "The Menagerie" (ARC III, build 2) — ✅ SHIPPED

The centipede — and per-part damage rides in on its back.

- ✅ **Segments are DNA**: each centipede rolls 5–9 body segments (more in
  the deep tiers) — the first parameterized axis of the coming botform
  sampler, exactly as the producer's notes frame it. The hp pool scales
  with length; the body chain-follows the head over real terrain, legs in
  a wave, carapace ridges nose to tail.
- ✅ **Every segment is a target**: projectiles and melee resolve against
  the nearest body-node — sever a segment (each has its own hp) and it
  breaks off with a flash and scrap, the body shortens and slows, and the
  pool takes the trauma. **The head is the mind**: head shots deal 1.5×.
  Melee got smarter for everyone: the swing now hits the nearest node
  *within the arc*, so standing between two segments doesn't blind you.
- ✅ **Rare by design**: the deep desert grows them long — a 5% upgrade
  roll on far-tier spawns in the dunes and rustlands only. The workbench
  spawns them on demand for testing.

*Queued as the arc's crown (producer's notes, filed): the generative
botform sampler — decoupled size axes and modifiers first, then a full
body-plan space with today's frames as samples; seeds as machinic DNA
with contextual priors (scavver stills vary conventionally, ferro-cults
strangely) and **regional lineages** — biome-local body dialects, so far
travel shows in the silhouettes.*

## build 2026.7.25 — "The Menagerie" (ARC III, build 1) — ✅ SHIPPED

Frames — body typologies as a first-class system (`js/frames.js`). The
frame sets the silhouette and the gait; the parts set the stats and the
greebles. One vocabulary for enemies, souls, and haulers alike.

- ✅ **Five frames**: biped (the makers' shape), quad, lowslung, stilt, and
  colossal — each with a hip-pivoted leg rig and its own gait clock
  (ponderous colossal strides, scuttling lowslung patter, high stilt
  steps). Legs swing like limbs now, not like propellers.
- ✅ **Three new machines to meet**: the *strider* (a pack-hunter on four
  fast legs — runs you down in the open dunes), the *lurcher* (a low
  armored dread that shoulders through the buried cities), and the
  *spindler* (a needle-gun on stilts, patient above the glass). Each with
  territories, loadout slots, and drops.
- ✅ **Old kinds re-bodied**: scrabbler, dervish (blades kept), sentinel,
  and — at last — the Conceptory Mother, who was falling through to the
  coral-lump branch and is now a true colossal with gantry shoulders,
  reaching arms, and a rust-glow crown.
- ✅ **Souls in other chassis**: ~1 in 5 residents, wanderers, and
  caravaneers walks a quad or lowslung frame now ("my cousin swapped to
  tracked legs. we tow him."). Hash-picked, deterministic, RNG streams
  untouched; followers keep their chassis on the road.

**Arc III ahead:** the centipede + per-part damage (b2), prosperity-driven
NPC part-swapping (b3), Mother armaments + warbot-limb megastructures (b4).

## build 2026.7.23 — "Stills That Live" (ARC II, build 5) — ✅ SHIPPED · ARC COMPLETE

The closing pass: the roads press into the earth, and no hamlet is anyone
else's hamlet.

- ✅ **Road carving** (the producer's idea): traffic presses the desert
  flat. Within a road's width the dune and detail terms of the height
  field are suppressed — the land's large shape remains, so it reads as a
  cut through the dunes, not a trench through the world — the ground
  blends toward packed earth, scatter steps aside, and the buried cities
  part around the way. Along-road bumpiness measures ~2.5× smoother than
  the ground beside it. Segments come from the same route graph the
  caravans walk (cached per lattice cell, injected before the first chunk
  builds, deterministic forever); founding a hearth re-carves the roads
  around it.
- ✅ **The variety pass**: every still gets a personality — a seeded
  palette lean, a layout (ring, street, or windbreak huddle), and two
  flavor pieces from a shared catalog (windwheel, stone troughs, drying
  racks, watch platform, half-buried statue, prayer lines, cairns, a
  scrap arch) on top of its landmark. Even the smallest hamlet is nobody
  else's hamlet.

ARC II — STILLS THAT LIVE is complete: greater stills (b19) → dynamic
fortunes (b20) → the stilldwellers wake (b21) → the hearth (b22) → carved
roads & variety (b23). The desert now has communities that live, work,
die, and can be brought back — and the ground itself remembers where
their bells travel.

## build 2026.7.22 — "Stills That Live" (ARC II, build 4) — ✅ SHIPPED

The hearth — the player finally gets a home, and the home is other people.

- ✅ **Dry wells**: the stills that never were. Cells where the salt ran
  good but the founders never came exist deterministically in the lattice;
  they now stand visible in the waste — a broken rim, a fallen crossbeam.
- ✅ **Found a hearth** (8 ▤ · 2 ▣ · 2 ❄ · 1 ▮): restore a dry well and a
  real still enters the world — named, landmarked, on the map, with your
  founding as the FIRST line of its history ("the first lamp was theirs").
  It joins everything automatically: the route graph (caravan bells will
  come to your town), the economy, gossip, raids, all of it — because it
  is not a special object, it is a still.
- ✅ **Founder's grace**: hope carries the first days — vitality is floored
  during the grace window, so a hearth always takes root. Whether it
  survives afterward depends on the world you lit it in: silence the
  nests, keep the roads open, and it becomes a village that owes you
  everything (rep +15 at founding).
- ✅ **Rekindling**: the capped well of an abandoned still offers the same
  mercy cheaper (5 ▤ · 1 ▣ · 2 ❄) — pry the cap, sweep the yard, and the
  lifecycle machinery runs in reverse.

## build 2026.7.21 — "Stills That Live" (ARC II, build 3) — ✅ SHIPPED

The stilldwellers wake up — utility-lite AI, RimWorld-adjacent but honest
to our scale:

- ✅ **Job posts**: the yard's real geometry is the schedule — stalls,
  shrines, totems, sorting heaps, crane-yards, gates, the well (two spots,
  so company happens), and the landmark (someone is always looking at it).
- ✅ **Drives**: each soul carries simple needs (work, social) that build
  and discharge, a seeded work ethic, and picks the highest-utility post
  for the hour — brokers work their stalls, sweepers take the dawn shrine,
  wardens stand the gates, and at dusk *everyone drifts to the well*.
- ✅ **Observable life**: souls walk to their posts, dwell and face their
  work, find whoever shares the post and turn to them — and two souls at
  one post pass the time in carrier tones you can hear as you walk by.
- ✅ Fights, fleeing, and night-home all still outrank the schedule; fading
  stills are quieter automatically (fewer souls, same clock).

## build 2026.7.20 — "Stills That Live" (ARC II, build 2) — ✅ SHIPPED

Dynamic stills — the years, made visible.

- ✅ **Fortunes are assessed, not simulated offstage**: each still carries a
  persisted stage (−2 abandoned · −1 fading · 0 · +1 grown), judged when
  you arrive — one judgment per two world-days elapsed, capped at two, so
  you can come home to a change but never to chaos.
- ✅ **Vitality is the world, summed**: open roads feed a still; cut roads
  starve it; living printworks press on it; its dead diminish it; your
  standing, funded guns, and revived souls steady it; and a seeded drift
  means some places were always going to fade. The save-a-still playbook
  falls out of the math: reopen the roads, silence the nests, fund the
  wall, bring back the dead.
- ✅ **Decay legible in retrospect** (the acceptance test, passed): fading
  stills board their doors, sand drifts against the thresholds, half the
  lamps go dark. Abandoned stills stand empty — walls breached to rubble,
  no safe field (the feral ones wander the yard), the well capped. But the
  rim still keeps its names, and the landmark outlives everything.
- ✅ **Growth you can watch**: thriving stills dress a class up — a hamlet
  with good roads builds like a village — new souls arrive, and a dwelling
  rises under scaffolding.
- ✅ Every turn writes history ("by day 31 the lean years showed: doors
  boarded, lamps dark, sand taking the thresholds back"), journals an
  EVENT, and moves the market (fading stills pay scarcity prices).

## build 2026.7.19 — "Stills That Live" (ARC II, build 1) — ✅ SHIPPED

Greater Stills: size is earned from the ground.

- ✅ **Size classes measured from the pan**: the generator samples the salt
  field on rings around each settlement's heart; the measured extent makes
  ~2/3 hamlets, ~1/3 villages, and a rare few percent towns (tuned against
  the actual extent distribution, not guessed). Population scales with
  class — towns run 8–13 souls. All new randomness on a second seeded
  stream, so existing saves keep their temperaments and populations (the
  pools lesson, applied).
- ✅ **District grammar**: villages and towns grow a second ring of roofs
  and a temperament quarter — market rows under awnings, monastic cloister
  walks, ferro-cult totem gardens, scavver crane-yards. Towns stand taller
  walls with three gates.
- ✅ **Landmarks**: every still keeps one — the cracked bell, the dead
  fountain, the glass obelisk, the door to nowhere… ten types, seeded,
  built into the yard. Residents point at them in smalltalk ("children
  dare each other to touch it at midnight. so do some of the adults."),
  and founding histories cite them ("the founders did not build it; they
  built AROUND it").

## build 2026.7.18 — bookkeeping — ✅ SHIPPED

The version format is year.month.**buildCounter** (2026.7.18 = the 18th
build of July, not July 18th) — misreadable enough that the display now
says it plainly: *"The Roads" · 2026.7 · build 18*. `version.js` exports
`LABEL`; always display that, never the raw counter.


## build 2026.7.15 — "The Roads" (ARC I, build 2) — ✅ SHIPPED

The market is a view, not a second simulation: everything derives from the
deterministic route graph plus the persisted roads-cut ledger.

- ✅ **The living economy, lite**: each temperament exports what it lives by
  (monastics salt, scavvers coil/glass/alloy, ferro-cultists nodules and
  cells, merchants scrap and cells). A still's price for a material falls
  with every *uncut* route to a producer — cut its roads and scarcity
  bites: buying costs more, selling into the shortage earns more. The trade
  panel reads the mood (`market: STARVED (2 roads cut)`), scarce goods wear
  ▲ and gluts wear ▼, and the panel price is exactly what the handler
  charges.
- ✅ **The market is a mood everyone shares**: when it isn't steady,
  smalltalk says so — "no bells for days. what's in the yard is what there
  is, and the prices know it."
- ✅ **Caravans trade at road rates** (even prices — they ARE the supply).
- ✅ **The bell on the chart** (playtest request): caravans in earshot show
  as a moving bell marker on the world map; leave their range and it goes
  with them.

## build 2026.7.13 — "The Old Names Hold" — ✅ SHIPPED

Save archaeology. The 7.2 pool expansion silently shifted every seeded
name — the same soul at the same still generated a different name after the
update. For the living this passed as weather; for the dead it was erasure:
memorials backfilled under the new pools resurrected "someone else."
Tirele Threadneedle, Ondine Halfgear, and Old Mirele were recoverable
because the *old pools still exist in git history*:

- ✅ **`data/legacy.js`**: the pre-7.2 PERSON grammar, frozen forever —
  load-bearing history. Any future pool expansion adds a new epoch here
  rather than touching one. `legacyPersonName()` reproduces the old
  pipeline exactly (`expand` never changed; only the pools did).
- ✅ **The ledger corrects itself**: pre-ledger dead are backfilled under
  their true (legacy) names; earlier wrong-name backfills are recognized
  and re-cut; souls already revived under a stranger's name straighten out
  on reload. One-time toast + journal: THE LEDGER CORRECTED.
- ✅ **`nameOverrides`**: persisted names-kept-against-the-drift, applied at
  roster build — revived legacy souls keep the names that were mourned.
- ✅ **Save-format epoch stamp** (`v: 2`): future migrations branch on it.
  On backwards compatibility generally: the infdev point stands — full
  fidelity across generator changes isn't promised. The commitments are
  narrower and kept: anything with a *name the player has met* persists
  that name at the moment it matters (memorials at death, overrides at
  revival), and generator pools are now append-via-epoch, never reshuffled.

**Also ahead:**
- Modularity part two (NPCs swapping parts, per-part damage, the menagerie)
- Greater Stills · dynamic Stills · terrain variety · caravans · the Embrace

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
