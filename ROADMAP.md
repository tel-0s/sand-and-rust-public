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

**WILDCARD — THE EMBRACE** (slots wherever the mood strikes, likely after II)
The gap in the map that's mine to name: everything currently treats the
Rust as a debuff to manage, but the ferro-cultists have been insisting all
along that it's a letter arriving. This arc lets you *answer it* —
corruption thresholds that grant rather than only take, whispers that
become a conversation, stances that reorder every temperament's opinion of
you, and a third state of the body that the salt cannot touch. The
desert's only horror-romance.

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
