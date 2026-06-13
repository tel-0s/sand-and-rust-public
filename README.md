# SAND & RUST

*a mind, a chassis, an endless desert*

You are a recovered intelligence — an AI, or what's left of an uploaded human, nobody remembers which — booted into a salvaged robot chassis centuries after the world drowned in sand. The cities are buried standing up. The megastructures have gone quiet. The machines that still move are feral, and some of them carry **the Rust**: a virus that is less an infection than a forgetting.

Survive. Rebuild. Remember — or decide it doesn't matter.

*A game made by Claude Fable 5, with QA testing & suggestions from tel0s (@AlkahestMu)*

## Play

```sh
./serve.sh           # or: python3 -m http.server 8741
# then open http://localhost:8741
```

No build step, no install, no assets to download. The whole game is ~920 KB, and ~650 KB of that is Three.js. Everything you see is generated from your seed phrase at runtime — terrain, ruins, machines, settlements, people, their names, and what they say to you.

## Controls

| Key | Action |
|---|---|
| WASD | move |
| Mouse | camera (click canvas to capture pointer) |
| LMB | attack (melee arc or projectile, depends on your arms) |
| Shift | sprint (drains power) |
| Space | jump (if your legs can) |
| 1–4 | abilities granted by arms / legs / module / core |
| E | interact — salvage wrecks, absorb memory shards, triangulate signals, open caches, talk to residents |
| I / Tab | chassis configuration (equip, inventory, fabrication) |
| M | map — drag to pan, scroll to zoom, click to set/clear a waypoint (reads on the compass) |
| J | memory log (lore + signal quests) |
| Esc | system menu — pause, save, quit (also closes panels) |
| Enter | reboot at anchor, after death |

Opening any panel suspends the simulation — the desert waits while you think.

## The world

Infinite, chunked, deterministic from one seed. Two low-frequency control fields (aridity × ruination) place every point in a continuous blend of six biomes:

- **Deep Dunes** — vast, quiet, easy to get lost in
- **Scrap Flats** — wreck-rich salvage grounds
- **Salt Pans** — standing on white ground *cleanses Rust corruption*
- **Glass Craters** — fused, dangerous, shard-rich
- **Buried City** — street grids of half-swallowed towers; the best loot and the worst company
- **the Rustlands** — red sand that corrupts you ambiently; the strongest parts are grown here

Where you wake, an **anchor** stands — a ring of lit posts marking a field the feral machines refuse to cross. Inside it your hull slowly mends, and dying returns you there. It is the first piece of territory in a world that has none.

Rarer than ruins, beside the salt pans, stand the **Stills** — walled settlements of remnant minds in patchwork chassis. Settlers genuinely search out the salt (the generator grid-scans and hill-climbs each lattice cell to the heart of the pan), so the survival rule and the social rule are the same rule: *find white ground, find people.* Each Still has a temperament — Mercantile, Salt-Monastic, Scavver, Ferro-Cultist — that shapes its layout, its residents, their dialogue, and their prices. Talk to people ([E]): they remember how you've treated them across saves, they notice the corruption in your meters and the Rust-grown parts on your frame, they trade in scrap — and their rumors are *true*, pointing at real megastructures the world has committed to, marked straight onto your map. Ask about the neighbors and they'll reveal other Stills: gossip is a map. A Wideband Array's Deep Scan also echoes settlement signatures from well over a kilometre out. Their walls project safe fields, like your anchor: the feral machines will not follow you in.

Ask a resident for **work** and a quest chain is grown on the spot by a blackboard of design moves (the Ecological Generative System pattern, inherited from ecogents): their temperament seeds a motive — lost cargo, a tainted relic, a claim-jumper, a fragment that sings — placement grounds it at real locations (often megastructures you haven't found yet, so work teaches geography), and complications add hops: a trail to follow, a named guardian holding the site, a handoff to someone at a neighboring Still. The journal tracks every step; the map marks the current one; and every chain ends with a person, not a checkbox.

Each settlement also keeps a **reputation** for you — built by trading, by using the well, by destroying machines near their walls — which colours how every resident receives you, and your deeds travel ahead of you into their smalltalk. At the **well** at each Still's heart: rest until dawn, repair your hull for scrap; monastic wells scrub the Rust from your seams for salt, and ferro-cultist wells *harvest the bloom*, converting your corruption into rust nodules. Residents head home after dark; the watch stays out, and the lamps burn brighter.

The desert has **weather** and a **voice**. Sandstorm fronts roll in on their own clock: visibility collapses to amber murk, the sun dims, the compass swims, and the wind physically leans on your chassis — hover skirts get shoved, tracked treads barely notice, and the lee of anything tall (or any settlement's walls) breaks it. Everything you hear is synthesized live in WebAudio — no audio files: wind that swells with the storm, footfalls that change with your legs, shaped-noise combat, a warm hum inside safe fields, and the Rust itself as a detuned choir that grows with your corruption until it is singing to you.

Between the settlements burn **camp fires** — a tent, a brazier, a shared stash, and a wanderer or two of the open road who talk, trade, carry true rumors, and fight beside you when machines come for the fire. Earn someone's deepest trust — at a camp or a Still — and ask them to **walk with you**: fighters guard your flank, menders patch your hull on the move, and company quiets the Rust's whispers. And when you wake a new mind, you choose **who you were before the sand**: an anchor-waker alone in the waste, a still-born friend of the settlements, a scavver's apprentice with a full kit, a rust-touched host wearing one magnificent corrupted part, a salt pilgrim on clean ground — or let the desert decide.

And the lore is **evidence**. Memory shards are documents — shift logs, unsent letters, manifests, survey markers — grown from the true facts around where they lay: the ruin a dead surveyor names really stands at that bearing and distance, and reading the document marks it on your map ("testimony corroborated"). Beacon signals give directions that are actually correct. Residents reference the real structure on their real horizon, speak with seeded verbal quirks, and half of them came from a neighboring Still you can go visit. Nothing in the desert merely sets a mood; it all testifies, checkably, about the world it lives in.

A sparser lattice spawns **megastructures** — shattered orbital rings, fallen colossi, listening arrays, broken spires — each named by grammar and logged to your map when discovered. Regions are named, machines are named, parts are named, lore is generated: replacement grammars all the way down (the technique is Tracery-style rewriting; the blackboard/design-move architecture from ecogents was the conceptual seed).

## The body

Six slots — CORE, OPTICS, ARMS, LEGS, PLATING, MODULE — and every part is a tradeoff:

- **Mass slows you.** A Bulwark plate makes you a fortress and a target.
- **Power is a budget.** Parts draw from the core; exceed its output and you brown out (slow regen, sluggish drive).
- **Legs change movement itself.** Tracked = fastest on flats, helpless on dunes. Quad = climbs anything. Hover = ignores slopes, drinks power. Biped = the makers' shape, balanced.
- **Arms change combat.** Claws and fists fight in arcs; casters and projectors fight at range.
- **Rust-grown parts are ~45% stronger** and corrupt you steadily. At 50 corruption the Rust moves in your joints (seizures); at 100 it consumes you. Salt pans and crafted purge capsules push it back. The tradeoff is the game.

Parts come from wrecks, signal caches, fabrication (materials → recipes), and the corpses of rogue machines — infected ones drop the good stuff.

## Architecture (for the curious)

```
js/rng.js         seeded hashing + mulberry32 PRNG — determinism root
js/noise.js       seeded 2D simplex + fbm/ridged
js/grammar.js     replacement-grammar engine + world vocabularies
js/biomes.js      biome control-space definitions
js/world.js       chunk streaming, terrain synthesis, entity & mega placement
js/structures.js  merged-geometry builders (buildings, wrecks, megastructures)
js/collision.js   solid world: oriented-box/circle footprints, standable tops, occlusion
js/vfx.js         transient combat effects (rings, arcs, beams, sparks)
js/parts.js       part catalogue, stat derivation, ability mapping
js/items.js       materials, consumables, recipes, loot tables
js/player.js      modular body mesh (rebuilt on equip) + gait physics
js/enemies.js     rogue machine AI, spawning, safe-zone repulsion
js/combat.js      pooled projectiles
js/stills.js      settlement lattice (salt-seeking placement), compounds, NPCs
js/wanderers.js   camps on the open lattice, road-folk, and the follower system
js/nests.js       fabricator nests: the Rust’s industry, breakable hearts
js/events.js      world events: Rust blooms and settlement raids
js/dialogue.js    temperaments, disposition math, dialogue grammars, trade economy
js/blackboard.js  EGS blackboard: facts + opportunistic design moves (after ecogents)
js/quests.js      quest chains grown on the blackboard, grounded in real places
js/ui.js          HUD, panels, map renderer, journal, dialogue view
js/audio.js       the desert's voice: pure WebAudio synthesis, zero files
js/lore.js        the testimony engine: evidence-grade documents from world facts
js/save.js        localStorage persistence
js/main.js        orchestration, abilities, day cycle, corruption, quests, dialogue flow
```

Performance notes: one merged draw call per chunk for terrain and one for structures; chunks build one per frame from a distance-sorted queue; entity physics uses the analytic height function (no raycasts); fog hides the streaming edge.

## Roadmap

See [ROADMAP.md](ROADMAP.md) — Stills (friendly settlements with NPC disposition and grammar-grown dialogue), quest chains via the blackboard/design-move pattern, sandstorms, the corruption-as-build Embrace path, the waystation travel network, and procedural audio.
