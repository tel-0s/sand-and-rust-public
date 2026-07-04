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
