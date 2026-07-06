// SAND & RUST — a mind in a chassis, an endless procedural desert.
import * as THREE from 'three';
import { hashString, Rand, hash2 } from './rng.js';
import { World, CHUNK } from './world.js';
import { Player } from './player.js';
import { EnemyManager } from './enemies.js';
import { Projectiles } from './combat.js';
import { starterLoadout, abilityLoadout, randomPart, makePart, SLOTS, ABILITIES, PART_DEFS } from './parts.js';
import { CONSUMABLES, rollWreckLoot, rollCacheLoot, craft, MATERIALS } from './items.js';
import { Names } from './grammar.js';
import { UI } from './ui.js';
import { VFX } from './vfx.js';
import { AudioEngine } from './audio.js';
import { SETTINGS, saveSettings, VIEW_DIST, DIFFICULTY } from './settings.js';
import { Simplex2, smoothstep } from './noise.js';
import { seasonAt, SEASONS, shardStormAt, shardForecast } from './seasons.js';
import { HerdManager } from './herds.js';
import { makeCircle, inFootprint } from './collision.js';
import { StillManager } from './stills.js';
import { CampManager, FollowerSystem } from './wanderers.js';
import { NestManager } from './nests.js';
import { EventSystem } from './events.js';
import { WarSystem, FRONT_MIN } from './war.js';
import {
  ATTUNE_COST, titheFor, reachableNodes, transmit, followerTick,
  formerDesignation, rimStillFor, elderIndexFor, docCarriesRecord, trailCheck, sourceMegaFor } from './transmit.js';
import { stillHistory, memorialLines, composeInteriorDoc } from './lore.js';
import { BUILD, ARC, LABEL } from './version.js';
import { generateChain, setChainCounter, getChainCounter } from './quests.js';
import { composeShard, composeSignal, whisper, bearingWord, RUST_SPEECH, NEST_SPEECH } from './lore.js';
import {
  TEMPERAMENTS, effDisposition, dispTier, greeting, smalltalk, rumorText, noRumor,
  aboutSelf, buyPrice, sellPrice, partPrice, MAT_VALUES, CONSUMABLE_VALUES,
  residentGossip, neighborGossip, noNeighbors, gossipDry, eventLine, WELL_FLAVOR,
  roadTalk, recruitLine, dismissLine, downLine, MARKET_TALK, decorate, taleLine, BANTER,
  WANT_SAY, WANT_DONE } from './dialogue.js';
import { saveGame, loadGame, clearSave, listSaves } from './save.js';
import { TopicSystem } from './topics.js';
import { InteriorSystem } from './interiors.js';
import { legacyPersonName } from '../data/legacy.js';
import { CaravanManager } from './caravans.js';
import { pointBlocked } from './collision.js';

window.SAR_BUILD = BUILD; // cache triage: confirm which build the browser actually loaded

const DAY_LENGTH = 480; // seconds per full day

// ---------- backgrounds: who were you, before the sand? ----------
export const BACKGROUNDS = [
  {
    id: 'waker', label: 'ANCHOR-WAKER',
    desc: 'wake alone at a cold anchor with nothing but the desert’s patience. the original loneliness.',
  },
  {
    id: 'stillborn', label: 'STILL-BORN',
    desc: 'the folk of a settlement hauled your dormant chassis inside their wall years ago. wake among friends, known and owed.',
  },
  {
    id: 'scavver', label: 'SCAVVER’S APPRENTICE',
    desc: 'you served a dig crew before your last shutdown. wake in the scrap flats with a full kit and an eye for salvage.',
  },
  {
    id: 'rusted', label: 'RUST-TOUCHED',
    desc: 'something bloomed in you during dormancy. wake corrupted, wearing one magnificent rusted part. the cultists will adore you.',
  },
  {
    id: 'pilgrim', label: 'SALT PILGRIM',
    desc: 'you were walking the white line when the dark took you. wake on clean ground with salt in your pockets.',
  },
  {
    id: 'random', label: 'DRIFTING MIND',
    desc: 'let the desert decide who you were.',
  },
];

function makeRustedGift(rand) {
  return makePart(rand.pick(['breaker_fist', 'bulwark_plate', 'quad_chassis', 'furnace_core']), 2, true);
}


// THE WORKS: real prices, real time (the producer repriced the frontier)
const WORK_COSTS = { homes: { s: 60, a: 12 }, market: { s: 100, c: 8 }, walls: { s: 120, a: 15 }, turrets: { s: 80, c: 8 } };
const WORK_TIMES = { homes: 0.5, market: 1.5, walls: 0.75, turrets: 0.15 }; // world-days

class Game {
  constructor(seedPhrase, saved, slot = 1, background = 'waker') {
    this.seedPhrase = seedPhrase;
    this.slot = slot;
    this.background = background;
    this.seed = hashString(seedPhrase);
    this.kills = 0;
    this.dead = false;
    this.dayT = 0.3; // morning
    this.worldT = 0.3;            // monotonic world time, in days (storms run on this)
    this.storm = 0;               // current sandstorm intensity 0..1
    this.stormNoise = new Simplex2(hash2(this.seed, 9, 91));
    this.audio = new AudioEngine();

    // ----- renderer / scene -----
    const canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(SETTINGS.video.renderScale);
    this.renderer.setSize(innerWidth, innerHeight);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xd9b380, 60, 420);
    this.scene.background = new THREE.Color(0xd9b380);
    this.camera = new THREE.PerspectiveCamera(68, innerWidth / innerHeight, 0.1, 900);
    this.windNoise = new Simplex2(hash2(this.seed, 17, 23));
    addEventListener('resize', () => {
      this.camera.aspect = innerWidth / innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(innerWidth, innerHeight);
    });

    // pre-downscale AA (pixel modes): the scene renders full-resolution into
    // an MSAA target, then a box-filter pass downsamples into the chunky
    // backbuffer — the antialiasing happens BEFORE the pixels get big, so
    // distant geometry stops shimmering while the pixels stay honest.
    this._aa = null;
    this._ensureAA = () => {
      const w = innerWidth, h = innerHeight;
      if (this._aa && this._aa.w === w && this._aa.h === h) return this._aa;
      if (this._aa) this._aa.rt.dispose();
      const rt = new THREE.WebGLRenderTarget(w, h, {
        samples: 4, depthBuffer: true,
        minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      });
      if (!this._aa) {
        const mat = new THREE.ShaderMaterial({
          uniforms: { tD: { value: null }, texel: { value: new THREE.Vector2() } },
          vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
          fragmentShader: `varying vec2 vUv; uniform sampler2D tD; uniform vec2 texel;
            void main() {
              vec3 c = texture2D(tD, vUv + texel * vec2(-1.0, -1.0)).rgb
                     + texture2D(tD, vUv + texel * vec2( 1.0, -1.0)).rgb
                     + texture2D(tD, vUv + texel * vec2(-1.0,  1.0)).rgb
                     + texture2D(tD, vUv + texel * vec2( 1.0,  1.0)).rgb;
              gl_FragColor = vec4(c * 0.25, 1.0);
              #include <colorspace_fragment>
            }`,
          depthTest: false, depthWrite: false,
        });
        const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
        const qScene = new THREE.Scene(); qScene.add(quad);
        const qCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this._aa = { rt, mat, qScene, qCam, w, h };
      } else {
        this._aa.rt = rt; this._aa.w = w; this._aa.h = h;
      }
      this._aa.mat.uniforms.tD.value = rt.texture;
      this._aa.mat.uniforms.texel.value.set(1 / w, 1 / h);
      return this._aa;
    };

    this.sun = new THREE.DirectionalLight(0xffe0b0, 2.2);
    this.scene.add(this.sun);
    this.hemi = new THREE.HemisphereLight(0xffe6c0, 0x8a6840, 0.9);
    this.scene.add(this.hemi);

    // ambient dust
    {
      const n = 350, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 120;
        pos[i * 3 + 1] = Math.random() * 25;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 120;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.dust = new THREE.Points(g, new THREE.PointsMaterial({ color: 0xd9b380, size: 0.25, transparent: true, opacity: 0.5 }));
      this.scene.add(this.dust);
    }

    // starfield: real stars, upper hemisphere only, fading in at night
    {
      const n = 550, R = 750, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        let x, y, z, len;
        do {
          x = Math.random() * 2 - 1; y = Math.random(); z = Math.random() * 2 - 1;
          len = Math.hypot(x, y, z);
        } while (len > 1 || len < 0.1 || y / len < 0.09); // above the horizon haze
        pos[i * 3] = (x / len) * R; pos[i * 3 + 1] = (y / len) * R; pos[i * 3 + 2] = (z / len) * R;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.stars = new THREE.Points(g, new THREE.PointsMaterial({
        color: 0xd8e0ff, size: 1.7, transparent: true, opacity: 0, depthWrite: false, fog: false, sizeAttenuation: false,
      }));
      this.scene.add(this.stars);
    }

    // ----- world & actors -----
    this.world = new World(this.scene, this.seed);
    this.player = new Player(this.scene);
    this.projectiles = new Projectiles(this.scene);
    this.enemies = new EnemyManager(this.scene, this.world);
    this.vfx = new VFX(this.scene);

    // ----- state -----
    this.equipped = starterLoadout();
    this.inventory = { mats: { scrap: 3, salt: 0 }, parts: [], consumables: { repair_kit: 1 } };
    this.journal = [];
    this.quests = [];
    this.chains = [];             // blackboard-grown work chains
    this.waypoint = null;
    this.npcDisp = {};            // earned disposition per NPC id
    this.stillRep = {};           // reputation per settlement
    this.gossipCount = {};        // neighbor-gossip uses per NPC (2 max each)
    this.respawnPt = null;        // bound transmission point (null = the anchor)
    this.megaAnchors = {};        // restored waystation anchors, by mega key
    this.directoryUsed = false;   // the obelisk's one free pointer
    this.recruitedIds = [];       // souls who walk (or once walked) with you
    this.deadNpcIds = [];         // the desert keeps what it takes
    this.destroyedNests = {};     // broken fabricator hearts, by nest key
    this.histories = {};          // lines the world appends to each still's story
    this.memorials = {};          // the recent dead, by still key: [{name, day, id}]
    this.fundedTurrets = {};      // wall guns a wanderer paid for, by still key
    this.revived = {};            // recommission count per still (the rite gets dearer)
    this.tracked = null;          // {kind:'chain'|'signal', id} pinned to the compass
    this.topics = [];             // subjects overheard: {id, label, kind, day}
    this.epic = null;             // the recommission of a significant soul (one at a time)
    this.embrace = null;          // THE EMBRACE: null unanswered · 0 answered · 1..3 blooms
    this.nestTithes = {};         // nest key -> worldT of the last tithe taken
    this.deepMarked = false;      // the third bloom, once reached, stays written
    this.stories = [];            // THE LEDGER — stories with roots: {id, kind, day, body, roots: {stillKey|'*': day}}
    this.fullBloom = false;       // the chosen transformation past the third bloom
    this.polished = false;        // the monks' recognition of the immaculate path
    this.epithet = null;          // THE NAMING: what the desert calls you, once it does
    this.namingRefused = false;   // a name offered and given back
    this.rustCallT = 0;           // seconds left on an answerable whisper
    this.nameOverrides = {};      // names kept against the drift of the pools, by npc id
    this.routesCut = {};          // roads that lost their caravan: routeKey -> quiet until worldT
    this.stillStates = {};        // dynamic fortunes: key -> { stage: -2..+1, lastAssess, graceUntil? }
    this.foundedStills = {};      // hearths you lit: cellKey -> { t: worldT founded }
    this.stake = null;            // THE STAKE: your home still {key, day} — one at a time
    this.stakeStorage = [];       // the workshop: parts kept at your stake
    this.stillNames = {};         // names you gave your hearths: key -> name
    this.stakeWorks = {};         // THE FUNDING: key -> { homes, market, walls, turrets }
    this.settlers = {};           // THE SETTLING: stakeKey -> [{name, temperament, role, ...}]
    this.settledIds = [];         // souls who hung up the road (gone from camps/parties)
    this.worksBroken = {};        // THE COVETING: key -> { walls, turrets, market } broken by sieges
    this.stakeStats = {};         // THE HEARTHSTONE: key -> { held, broke, mended } — the town's own score
    this.pendingWorks = {};       // key -> [{what, ready: worldT}] — crews at work
    this.fall = null;             // STAR-FALL: {epoch, x, z, day, until, cored} — the current fall, if any
    this.war = { front: null, rest: 0, history: [] }; // THE MARCH: the active front, the exhaustion clock, the campaigns fought
    this.attuned = {};            // THE TRANSMISSION: wells that know your signal, key -> day attuned
    this.rumors = [];             // word not yet arrived: out-of-sight events waiting for a mouth near you
    this.txCount = 0;             // rides taken down the lattice — the creeds are counting too
    this.txLeaks = 0;             // fragments of the former life the line has surfaced
    this.followerWalk = null;     // a companion on the road after a ride: {data, arriveT}
    this.formerLife = { doc: null, rim: null, soul: null, lineAsked: false, trail: false }; // THE FORMER LIFE: evidence found, by day
    this.kits = {};               // THE KIT: gear kept for parted company, by soul's name — the pack waits for them
    this.companions = {};         // THE JOINT LEDGER: name -> { stories, kinds, epithet } — the company's own legends
    this.bandName = null;         // THE BAND NAMED: what the yards call the whole company, once they do
    this._staticT = 0;            // seconds of visible reassembly hum after arrival
    this._megaZones = new Map();  // live safe zones for restored anchors
    this.events = [];             // deeds that travel ahead of you
    this._stillWarned = new Set();
    this.dlg = null;              // active dialogue session
    this.abilityCds = [0, 0, 0, 0];
    this.camYaw = 0; this.camPitch = 0.35; this.camDist = 8.5;
    this.shakeT = 0;
    this.seizureT = 15;
    this.saveT = 20;
    this.regionName = ''; this.biomeName = ''; this.clockText = '';
    this.whisperT = 40;

    // the Stills: living settlements beside the salt
    // (created before freshStart so backgrounds can spawn you among people)
    this.stills = new StillManager(this.scene, this.world, {
      assess: (info) => { this.assessStill(info); this.ensureOtherLegend(info); },
      // unfinished business holds a soul in place: contract givers, step
      // targets, and epic keepers stay on the roster even when the lean
      // years thin it — nobody walks out on the player mid-contract
      mustKeep: (info) => {
        const out = new Set();
        const pre = 'npc:' + info.key + ':';
        const idx = (id) => { const n = parseInt(id.slice(pre.length), 10); if (!isNaN(n)) out.add(n); };
        for (const c of this.chains) {
          if (c.done) continue;
          if (c.giverId && c.giverId.startsWith(pre)) idx(c.giverId);
          c.steps.forEach((st, i) => { if (i >= c.current && st.npcId && st.npcId.startsWith(pre)) idx(st.npcId); });
        }
        if (this.epic && this.epic.npcId && this.epic.npcId.startsWith(pre)) idx(this.epic.npcId);
        return out;
      },
      isFounded: (key) => this.foundedStills[key],
      stillName: (key) => this.stillNames[key],
      worksOf: (key) => {
        const wk = this.stakeWorks[key];
        const isStakeHere = !!(this.stake && this.stake.key === key);
        if (!wk && !isStakeHere) return null; // a bare claim still raises its stone
        const br = this.worksBroken[key] || {};
        const w = wk || {};
        return {
          homes: w.homes || 0,
          market: !!w.market && !br.market,
          walls: Math.max(0, (w.walls || 0) - (br.walls || 0)),
          turrets: Math.max(0, (w.turrets || 0) - (br.turrets || 0)),
          isStake: isStakeHere,
          epithet: this.epithet,
        };
      },
      settlersOf: (key) => this.settlers[key] || null,
      onSettlerLoaded: (n, rec) => {
        this.npcDisp[n.id] = Math.max(this.npcDisp[n.id] || 0, rec.disp || 20);
      },
      onChatter: (npc) => {
        if (Math.hypot(npc.pos.x - this.player.pos.x, npc.pos.z - this.player.pos.z) < 28) {
          this.audio.speak((Math.random() * 0xffffffff) >>> 0, npc.temperament);
        }
      },
      nameOverride: (id) => this.nameOverrides[id],
      safeZones: this.enemies.safeZones,
      isRecruited: (id) => this.recruitedIds.includes(id),
      isDead: (id) => this.deadNpcIds.includes(id),
      hasFundedTurret: (key) => !!this.fundedTurrets[key],
      onGatesBarred: (info) => {
        this.ui.toast(`${info.name.toUpperCase()} BARS ITS GATES — the wall reads what you carry`, 'rust');
        this.journal.push({
          type: 'lore', cat: 'event', title: 'THE GATES BARRED',
          body: `${info.name} turned its wall-guns on you on day ${1 + Math.floor(this.worldT)}. the monks did not come out to explain. the guns were the explanation.`,
        });
      },
      onTurretFire: (t, foe) => {
        this.audio.play('shot');
        this.vfx.beam(new THREE.Vector3(t.x, t.y, t.z),
          new THREE.Vector3(foe.pos.x - t.x, foe.pos.y + foe.def.scale - t.y, foe.pos.z - t.z).normalize(),
          { length: Math.hypot(foe.pos.x - t.x, foe.pos.z - t.z), color: 0xffd27f, dur: 0.1, radius: 0.05 });
      },
      onNpcDeath: (n, still) => {
        this.deadNpcIds.push(n.id);
        // work dies with its people
        for (const ch of this.chains) {
          if (ch.done) continue;
          const involved = ch.giverId === n.id || ch.steps.some((st, i) => i >= ch.current && st.npcId === n.id);
          if (involved) {
            ch.done = true; ch.failed = true;
            if (this.tracked && this.tracked.kind === 'chain' && this.tracked.id === ch.id) this.tracked = null;
            this.ui.toast(`the work "${ch.title}" is lost with ${n.name}`, 'rust');
          }
        }
        if (!this.memorials[still.key]) this.memorials[still.key] = [];
        this.memorials[still.key].push({ name: n.name, day: 1 + Math.floor(this.worldT), id: n.id });
        this.eventSys && this.eventSys.noteDeath(still.key);
        this.ui.toast(`${n.name.toUpperCase()} FALLS at ${still.name}`, 'rust');
        this.audio.play('boom');
      },
      onDiscover: (s) => {
        // only fanfare for places the map doesn't already hold (reloads re-walk this path)
        if (!this.world.markDiscovered({ key: 'still:' + s.key, name: s.name, kind: 'still', x: s.x, z: s.z })) return;
        // a place you've walked is a place you can ask about — including,
        // pointedly, your own stake (topics used to only come from rumor)
        this.topicsSys && this.topicsSys.register('s:' + s.key, s.name);
        this.audio.play('chime');
        this.ui.toast(`STILL FOUND: ${s.name.toUpperCase()} — ${TEMPERAMENTS[s.temperament].label}`, 'good');
        this.journal.push({
          type: 'lore', cat: 'place', title: s.name.toUpperCase(),
          body: `a ${TEMPERAMENTS[s.temperament].label.toLowerCase()} still beside the salt. ${s.residents} souls keep the well, and the feral ones do not cross their wall. marked on the map.`,
        });
      },
    });

    // camps: fires on the open lattice, and the system for who walks with you
    this.herds = new HerdManager(this.world, this.enemies, {
      onSighted: (info) => {
        const k = 'herd:' + info.key;
        if (this.world.looted.has(k)) return;
        this.world.looted.add(k);
        this.audio.play('chime');
        this.ui.toast('A HERD ON THE MOVE — they walk; let them, or don\u2019t', 'good');
        this.journal.push({
          type: 'lore', cat: 'event', title: 'THE HERD',
          body: `you fell in beside a wild herd on day ${1 + Math.floor(this.worldT)} — a column of striders walking the year\u2019s road. they did not mind you. day ${1 + Math.floor(this.worldT)}.`,
        });
      },
    });

    this.camps = new CampManager(this.scene, this.world, this.stills, {
      isRecruited: (id) => this.recruitedIds.includes(id),
      isSettled: (id) => this.settledIds.includes(id),
      onWandererDown: (w) => {
        this.ui.toast(`${w.name.toUpperCase()} falls defending the fire`, 'rust');
      },
      onDiscover: (c) => {
        if (!this.world.markDiscovered({ key: 'camp:' + c.key, name: c.name, kind: 'camp', x: c.x, z: c.z })) return;
        this.audio.play('chime');
        this.ui.toast(`A FIRE IN THE WASTE — ${c.name.toUpperCase()}`, 'good');
      },
    });
    this.followers = new FollowerSystem(this.scene, this.world);

    // the roads: caravans walking real routes between neighbor stills
    this.caravans = new CaravanManager(this.scene, this.world, this.stills, {
      isCut: (key) => (this.routesCut[key] || 0) > this.worldT,
      stageOf: (key) => (this.stillStates[key] ? this.stillStates[key].stage : 0),
      safeZones: this.enemies.safeZones, // night fires ward the camps
      herdCrossing: (x, z) => this.herds && this.herds.nearSchedule(x, z, 60, this.worldT),
      onSighted: (c) => {
        this.audio.play('bell');
        this.ui.toast(`BELLS ON ${c.pseudoStill.name.toUpperCase()}`, 'good');
        const metKey = 'cvnmet:' + c.key;
        if (!this.world.looted.has(metKey)) {
          this.world.looted.add(metKey);
          this.journal.push({
            type: 'lore', cat: 'event', title: 'A CARAVAN ON THE ROAD',
            body: `you fell in with the caravan working ${c.pseudoStill.name} — ${c.members.length} souls, ${c.beasts.length} beast${c.beasts.length === 1 ? '' : 's'} of burden, bells on the lead hauler. day ${1 + Math.floor(this.worldT)}.`,
          });
        }
      },
      onScatter: (c) => {
        this.routesCut[c.key] = this.worldT + 6;
        this.audio.play('bell');
        this.ui.toast(`THE CARAVAN IS LOST — ${c.pseudoStill.name.toUpperCase()} IS CUT`, 'rust');
        this.journal.push({
          type: 'lore', cat: 'event', title: 'THE ROAD IS CUT',
          body: `the caravan on ${c.pseudoStill.name} was taken by the desert on day ${1 + Math.floor(this.worldT)}. no bells will walk that road for a while. ${c.route.a.name} and ${c.route.b.name} will both feel it.`,
        });
        this.recordEvent('raidloss', c.route.a.name);
        this.appendHistory(c.route.a.key, `the road to ${c.route.b.name} went quiet on day ${1 + Math.floor(this.worldT)}, after the caravan was lost to the waste.`);
        this.appendHistory(c.route.b.key, `the road to ${c.route.a.name} went quiet on day ${1 + Math.floor(this.worldT)}, after the caravan was lost to the waste.`);
      },
      onEscortAmbush: (c) => this.ambushCaravan(c, 4 + (Math.random() < 0.5 ? 1 : 0)),
      onEscortWaiting: (c) => this.ui.toast('the caravan master waits — the contract says CLOSE', 'rust'),
      onEscortArrived: (c) => {
        const ch = this.chains.find(x => x.id === c.chainId && !x.done);
        if (!ch) return;
        const step = ch.steps[ch.current];
        this.changeRep(step.to, 3); // the receiving well is grateful too
        this.finishChain(ch, (t) => this.ui.toast(t, 'good'));
        this.journal.push({
          type: 'lore', cat: 'event', title: 'THE CONTRACT HOLDS',
          body: `the caravan out of ${step.from.name} reached ${step.to.name} with its escort beside it, day ${1 + Math.floor(this.worldT)}. cargo whole, names intact. the master paid without counting twice.`,
        });
        this.recordEvent('helped', step.to.name);
        this.rootStory('story:escort:' + step.routeKey + ':' + Math.floor(this.worldT), 'road',
          `the walker walked the ${step.from.name}–${step.to.name} road beside the bells, and every soul arrived.`,
          { stills: [step.to, step.from] });
      },
      onEscortWiped: (c) => {
        const ch = this.chains.find(x => x.id === c.chainId && !x.done);
        if (!ch) return;
        ch.done = true; ch.failed = true;
        if (this.tracked && this.tracked.kind === 'chain' && this.tracked.id === ch.id) this.tracked = null;
        const step = ch.steps[ch.current];
        this.changeRep({ key: ch.stillKey, name: ch.stillName }, -2);
        this.audio.play('bell');
        this.ui.toast('THE CONTRACT DIES ON THE ROAD', 'rust');
        this.journal.push({
          type: 'lore', cat: 'event', title: 'THE CONTRACT DIES',
          body: `the caravan bound for ${step.to.name} was lost with its whole crew on day ${1 + Math.floor(this.worldT)}. the escort walked away; the road did not. ${ch.stillName} will remember.`,
        });
        this.appendHistory(ch.stillKey, `a caravan for ${step.to.name} was lost under escort on day ${1 + Math.floor(this.worldT)}. the well keeps their names; the road keeps its opinion.`);
      },
      onDefended: (c) => {
        for (const s of [c.route.a, c.route.b]) this.changeRep(s, 2);
        const d = Math.hypot(c.pseudoStill.x - this.player.pos.x, c.pseudoStill.z - this.player.pos.z);
        if (c.escort || d < 200) {
          this.audio.play('chime');
          this.ui.toast('THE ROAD HOLDS — both stills will hear of this', 'good');
        }
        this.journal.push({
          type: 'lore', cat: 'event', title: 'THE ROAD HOLDS',
          body: `the caravan on ${c.pseudoStill.name} survived an ambush on day ${1 + Math.floor(this.worldT)}. word travels with the bells.`,
        });
        this.recordEvent('helped', c.pseudoStill.name);
      },
    });
    // the roads are carved into the terrain itself: inject the route graph
    // into height synthesis NOW — before the first chunk ever builds
    this.world.roadsAt = (x, z) => this.caravans.routesNear(x, z);
    this.followers.onDown = (f) => {
      this.ui.toast(downLine(f, new Rand((Math.random() * 0xffffffff) >>> 0)), 'rust');
      this.stashKit(f); // somebody gathers what they carried; it finds them again
      this.npcDisp[f.id] = Math.max(-40, (this.npcDisp[f.id] || 0) - 3);
      this.recruitedIds = this.recruitedIds.filter(id => id !== f.id);
      this.reloadHomeOf(f.id);
      saveGame(this);
    };
    this.followers.onHeal = (f) => {
      this.vfx.rise(this.player.pos, { color: 0x6fe8d0, r: 1.2, dur: 0.4 });
    };
    this.followers.onStrike = () => { this.audio.play('hit'); };
    // THE WANT: the sworn refuse the ground, once a day
    this.followers.onLastStand = (f) => {
      this.audio.play('bell');
      this.vfx.ring(f.pos, { color: 0xffd27f, r0: 0.4, r1: 3.5, dur: 0.6 });
      this.ui.banter(f.name, 'not TODAY.');
      this.ui.toast(`${f.name.toUpperCase()} REFUSES TO FALL — the sworn stand back up`, 'good');
    };
    // THE KIT: the company's granted abilities land with light and sound
    this.followers.onAbility = (f, ab, target) => {
      this.audio.play('ability');
      const at = target && target.pos ? target.pos : f.pos;
      this.vfx.ring(at, {
        color: ab === 'mend' ? 0x6fe8d0 : ab === 'barrier' ? 0x9fd8ff : 0xffb066,
        r0: 0.5, r1: ['whirl', 'crush'].includes(ab) ? 4.5 : 2.5, dur: 0.45,
      });
    };

    // fabricator nests: the Rust's industry, and the world's event clock
    this.nests = new NestManager(this.scene, this.world, {
      isDestroyed: (key) => !!this.destroyedNests[key],
      warNest: (key) => !!(this.warSys && this.warSys.pressed(key)),
      onDiscover: (n) => {
        if (!this.world.markDiscovered({ key: 'nest:' + n.key, name: n.name, kind: 'nest', x: n.x, z: n.z })) return;
        this.audio.play('bell');
        this.ui.toast(`FABRICATOR NEST: ${n.name.toUpperCase()} — break the core and it goes quiet`, 'rust');
        this.journal.push({
          type: 'lore', cat: 'place', title: n.name.toUpperCase(),
          body: 'a rash on the face of the desert: a half-buried printworks of the Rust, breeding feral machines while its core beats. the ground around it blooms. marked on the map.',
        });
      },
      onDestroyed: (n) => {
        this.destroyedNests[n.key] = true;
        const mark = this.world.discovered.find(d => d.key === 'nest:' + n.key);
        if (mark) mark.destroyed = true;
        const mats = this.inventory.mats;
        mats.nodule = (mats.nodule || 0) + 4; mats.alloy = (mats.alloy || 0) + 2; mats.cell = (mats.cell || 0) + 2;
        this.recordEvent('nest', n.name);
        this.rootStory('story:nest:' + n.key, 'nest',
          `the nest they called ${n.name} is quiet now. the walker made it quiet.`);
        this.journal.push({ type: 'lore', cat: 'event', title: `NEST SILENCED — ${n.name.toUpperCase()}`, body: `its heart broken by a wanderer's hand. day ${1 + Math.floor(this.worldT)}.` });
        for (const s of this.stills.stillsNear(n.x, n.z, 3500)) {
          this.changeRep(s, 4);
          this.appendHistory(s.key, `the nest called ${n.name} went quiet on day ${1 + Math.floor(this.worldT)}. a wanderer broke its heart. the night patrols sleep easier.`);
        }
        this.audio.play('chime');
        this.ui.toast(`THE HEART OF ${n.name.toUpperCase()} IS BROKEN — its brood will scatter`, 'good');
        this.journal.push({ type: 'lore', cat: 'place', title: `${n.name.toUpperCase()} — SILENCED`, body: 'the core is slag. salvage taken: 4 ❂ · 2 ▣ · 2 ▮. the stills nearby will hear of this.' });
        saveGame(this);
      },
    });
    this.eventSys = new EventSystem(this);
    this.warSys = new WarSystem(this);
    this.topicsSys = new TopicSystem(this);
    this.interiors = new InteriorSystem(this.scene, this.world);

    if (saved) this.restore(saved);
    else this.freshStart(this.background);

    this.player.recompute(this.equipped);
    this.abilitySlots = abilityLoadout(this.equipped);
    if (!saved) {
      this.player.hull = this.player.stats.maxHull;
      this.player.energy = this.player.stats.energyCap;
    }

    // anchor obelisk + field: a circle the feral machines will not cross
    this.safeZone = { x: this.anchor.x, z: this.anchor.z, r: 35 };
    this.enemies.safeZones.push(this.safeZone);
    {
      const ox = this.anchor.x + 5, oz = this.anchor.z + 3;
      const ob = new THREE.Mesh(new THREE.BoxGeometry(1.2, 7, 1.2),
        new THREE.MeshLambertMaterial({ color: 0x3a3530, emissive: 0x331e08 }));
      const y = this.world.getHeight(ox, oz);
      ob.position.set(ox, y + 3, oz);
      this.scene.add(ob);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 6, 5), new THREE.MeshBasicMaterial({ color: 0xe8a33d }));
      lamp.position.set(ox, y + 7, oz);
      this.scene.add(lamp);
      // light pillar marking home from a distance
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.4, 90, 8, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xe8a33d, transparent: true, opacity: 0.10, side: THREE.DoubleSide, depthWrite: false }));
      pillar.position.set(ox, y + 45, oz);
      this.scene.add(pillar);
      // perimeter posts trace the field's edge
      const postGeo = new THREE.BoxGeometry(0.22, 1.6, 0.22);
      const capGeo = new THREE.BoxGeometry(0.3, 0.18, 0.3);
      const postMat = new THREE.MeshLambertMaterial({ color: 0x4a4440 });
      const capMat = new THREE.MeshBasicMaterial({ color: 0xe8a33d });
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const px = this.anchor.x + Math.sin(a) * this.safeZone.r;
        const pz = this.anchor.z + Math.cos(a) * this.safeZone.r;
        const py = this.world.getHeight(px, pz);
        const post = new THREE.Mesh(postGeo, postMat);
        post.position.set(px, py + 0.8, pz);
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.set(px, py + 1.7, pz);
        this.scene.add(post, cap);
        this.world.staticColliders.push(makeCircle(px, pz, 0.3, py + 1.8, false));
      }
      this.world.staticColliders.push(makeCircle(ox, oz, 0.95, y + 7, false)); // the obelisk itself
      this.obeliskPos = { x: ox, z: oz };
    }

    // ----- UI & input -----
    this.ui = new UI(this);
    this.ui.buildHotbar();
    this.input = { w: false, a: false, s: false, d: false, shift: false, jump: false };
    this.bindInput();

    this.enemies.onQuestTargetLost = (e) => {
      const ch = this.chains.find(c => c.id === e.questTag.chainId);
      if (ch && !ch.done && ch.steps[e.questTag.stepIdx]) ch.steps[e.questTag.stepIdx].spawned = false;
    };
    this.world.onDiscover = (m) => {
      this.recordEvent('found', m.name);
      this.audio.play('chime');
      this.ui.toast(`STRUCTURE LOGGED: ${m.name.toUpperCase()}`, 'good');
      this.journal.push({ type: 'lore', cat: 'place', title: m.name.toUpperCase(), body: `a ${({ ring: 'shattered orbital ring', colossus: 'fallen colossus', dish: 'listening array', spire: 'broken spire' })[m.type]} — logged to cartography.` });
    };

    this.applySettings();
    // warm the world before first frame
    for (let i = 0; i < 80; i++) this.world.update(this.player.pos.x, this.player.pos.z, 0.016);
    this.player.pos.y = this.world.getHeight(this.player.pos.x, this.player.pos.z) + 1;

    addEventListener('beforeunload', () => { if (!this.dead) saveGame(this); });
    addEventListener('pagehide', () => { if (!this.dead) saveGame(this); });

    this.clock = new THREE.Clock();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  freshStart(background = 'waker') {
    const rand = new Rand(this.seed);
    if (background === 'random') background = rand.pick(['waker', 'stillborn', 'scavver', 'rusted', 'pilgrim']);
    this.background = background;
    const years = rand.int(190, 2300);

    // find a spawn matching the background's biome taste
    const findSpot = (accept) => {
      for (let i = 0; i < 60; i++) {
        const tx = rand.range(-700, 700), tz = rand.range(-700, 700);
        if (accept(this.world.biomeAt(tx, tz).id)) return [tx, tz];
      }
      return [8, 8];
    };

    let x, z, awakening;
    if (background === 'stillborn') {
      const stills = this.stills.stillsNear(0, 0, 20000)
        .sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
      const s = stills[0];
      if (s) {
        x = s.x + 12; z = s.z + 6;
        this.stillRep[s.key] = 15;
        this.respawnPt = { x: s.x, z: s.z, stillKey: s.key, label: s.name };
        this.world.markDiscovered({ key: 'still:' + s.key, name: s.name, kind: 'still', x: s.x, z: s.z });
        this.inventory.mats.scrap += 5; this.inventory.mats.salt += 2;
        awakening = `boot sequence complete after ${years} years of dormancy. the folk of ${s.name} hauled your dead chassis inside their wall a generation ago and kept the dust off it, on the theory that anything so carefully made was meant to wake. today you proved them right. you owe these people. the ledger in your chest says so.`;
      } else { [x, z] = findSpot(b => b !== 'rustlands' && b !== 'city'); }
    } else if (background === 'scavver') {
      [x, z] = findSpot(b => b === 'flats');
      this.inventory.mats.scrap += 8; this.inventory.mats.coil = 4; this.inventory.mats.glass = 2;
      this.inventory.consumables.repair_kit = 3;
      this.inventory.parts.push(randomPart(rand, { tierBias: 0, rustChance: 0 }));
      awakening = `boot sequence complete after ${years} years of dormancy. your last memory is a dig: the crew, the crane, the seam that was too good. the crew is gone, the crane is bones, but your pockets are still full of honest salvage and your hands remember the work. the desert outside is ${this.world.regionName(x, z)}. start digging.`;
    } else if (background === 'rusted') {
      [x, z] = findSpot(b => b === 'flats' || b === 'dunes');
      this.player.corruption = 25;
      const part = makeRustedGift(rand);
      this.equipped[part.slot] = part;
      this.inventory.mats.nodule = 2;
      awakening = `boot sequence complete after ${years} years of dormancy — but something else woke first, and it has been busy. one of your parts is not the part you fell asleep with. it is better. it hums. the desert outside is ${this.world.regionName(x, z)}, and somewhere in the red sand, something considers you family.`;
    } else if (background === 'pilgrim') {
      [x, z] = findSpot(b => b === 'salt');
      this.inventory.mats.salt += 3;
      this.inventory.consumables.purge_capsule = 2;
      awakening = `boot sequence complete after ${years} years of dormancy. you fell walking the white line, and the white line kept you: not one fleck of Rust on your seams after all these centuries. the salt of ${this.world.regionName(x, z)} stretches in every direction. walk it. white ground is clean ground.`;
    } else {
      [x, z] = findSpot(b => b !== 'rustlands' && b !== 'city');
      awakening = `boot sequence complete after ${years} years of dormancy. you do not remember your name, but you remember hands — soft ones — assembling your first chassis. the desert outside is ${this.world.regionName(x, z)}. the Rust is in the wind. survive. rebuild. remember.`;
    }

    this.player.pos.set(x, 0, z);
    this.anchor = { x, z };
    this.journal.push({ type: 'lore', title: 'AWAKENING', body: awakening });
  }

  restore(d) {
    this.dayT = d.dayT ?? 0.3;
    this.worldT = d.worldT ?? this.dayT;
    this.kills = d.kills || 0;
    this.player.pos.set(d.player.x, d.player.y, d.player.z);
    this.player.hull = d.player.hull;
    this.player.energy = d.player.energy;
    this.player.corruption = d.player.corruption || 0;
    this.anchor = d.anchor;
    this.equipped = d.equipped;
    this.inventory = d.inventory;
    this.journal = d.journal || [];
    this.quests = d.quests || [];
    this.waypoint = d.waypoint || null;
    this.npcDisp = d.npcDisp || {};
    this.stillRep = d.stillRep || {};
    this.events = d.events || [];
    this.chains = d.chains || [];
    this.respawnPt = d.respawnPt || null;
    this.gossipCount = d.gossipCount || {};
    this.megaAnchors = d.megaAnchors || {};
    this.directoryUsed = d.directoryUsed || false;
    this.recruitedIds = d.recruitedIds || [];
    this.background = d.background || 'waker';
    this.tracked = d.tracked || (d.trackedChainId ? { kind: 'chain', id: d.trackedChainId } : null);
    // migration: the substrate speakers once filed themselves under names
    this.topics = (d.topics || []).filter(t => !['p:the well', 'p:the rust', 'p:the nest'].includes(t.id));
    // backfill: every still already on the map is askable-about (older saves
    // only filed stills that arrived by rumor — your own stake among the missing)
    for (const mk of (d.discovered || [])) {
      if (mk.kind !== 'still' || typeof mk.key !== 'string') continue;
      const id = 's:' + mk.key.replace(/^still:/, '');
      if (!this.topics.some(t => t.id === id)) this.topics.push({ id, label: mk.name, kind: 's', day: Math.floor(d.worldT || 0) });
    }
    this.epic = d.epic || null;
    this.embrace = d.embrace ?? null;
    this.nestTithes = d.nestTithes || {};
    this.deepMarked = !!d.deepMarked;
    // migration: the b5 tales registry becomes world-rooted stories
    this.stories = d.stories || (d.tales || []).map(t => ({ ...t, roots: { '*': t.day } }));
    this.fullBloom = !!d.fullBloom;
    this.polished = !!d.polished;
    this.player.fullBloom = this.fullBloom;
    this.epithet = d.epithet ?? null;
    this.namingRefused = !!d.namingRefused;
    this.enemies.embraceLevel = this.embrace || 0;
    this.player.embraceLevel = this.embrace || 0;
    this.nameOverrides = d.nameOverrides || {};
    this.routesCut = d.routesCut || {};
    this.reconcileMarkerNames();
    this.stillStates = d.stillStates || {};
    this.foundedStills = d.foundedStills || {};
    this.stake = d.stake || null;
    this.stakeStorage = d.stakeStorage || [];
    this.stillNames = d.stillNames || {};
    this.stakeWorks = d.stakeWorks || {};
    this.settlers = d.settlers || {};
    this.settledIds = d.settledIds || [];
    this.worksBroken = d.worksBroken || {};
    this.stakeStats = d.stakeStats || {};
    this.pendingWorks = d.pendingWorks || {};
    this.fall = d.fall || null;
    this.war = d.war || { front: null, rest: 0, history: [] };
    this.attuned = d.attuned || {};
    this._firstTransmit = !!d.firstTransmit;
    this.rumors = d.rumors || [];
    this.txCount = d.txCount || 0;
    this.txLeaks = d.txLeaks || 0;
    this.followerWalk = d.followerWalk || null;
    this.formerLife = d.formerLife || { doc: null, rim: null, soul: null, lineAsked: false, trail: false };
    this.kits = d.kits || {};
    this.companions = d.companions || {};
    this.bandName = d.bandName || null;
    this.deadNpcIds = d.deadNpcIds || [];
    this.destroyedNests = d.destroyedNests || {};
    this.histories = d.histories || {};
    this.memorials = d.memorials || {};
    this.fundedTurrets = d.fundedTurrets || {};
    this.revived = d.revived || {};
    for (const k of Object.keys(this.megaAnchors)) this.world.anchorActiveSet.add(k);
    if (d.follower) this.followers.restore(d.follower, this.player.pos);
    if (d.follower2) this.followers.restore(d.follower2, this.player.pos);
    setChainCounter(d.chainCounter || 1);
    for (const ch of this.chains) {
      if (ch.done) continue;
      const step = ch.steps[ch.current];
      if (step) { step.spawned = false; this.activateChainStep(ch); }
    }
    for (const id of d.looted || []) this.world.looted.add(id);
    this.world.discovered = d.discovered || [];
    for (const m of this.world.discovered) if (m.key) this.world.discoveredKeys.add(m.key);
    for (const [k, v] of d.explored || []) this.world.explored.set(k, v);
    for (const q of this.quests) if (!q.done) this.world.addQuestCache('qc:' + q.id, q.x, q.z, q.id);
  }

  // ================= input =================
  bindInput() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('click', () => {
      this.audio.ensure();
      if (this.ui.activePanel || this.dead) return;
      if (document.pointerLockElement !== canvas) canvas.requestPointerLock();
      else this.attack();
    });
    document.addEventListener('keydown', () => this.audio.ensure(), { once: false });
    // calibration (settings) from the system menu
    document.getElementById('btn-settings').addEventListener('click', () => {
      this.ui.closePanel();
      this.ui.toggle('settings');
    });
    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== canvas) return;
      this.camYaw -= e.movementX * 0.0026;
      this.camPitch = Math.min(1.35, Math.max(-0.5, this.camPitch + e.movementY * 0.0022));
    });
    canvas.addEventListener('wheel', (e) => {
      if (this.ui.activePanel || this.dead) return;
      e.preventDefault();
      this.camDist = Math.min(14, Math.max(4.5, this.camDist + e.deltaY * 0.012));
    }, { passive: false });
    // ESC exits pointer lock (browser reserves it); treat that as "open the system menu"
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== canvas && !this.ui.activePanel && !this.dead) this.openSystem();
    });
    document.getElementById('btn-resume').addEventListener('click', () => this.ui.closePanel());
    document.getElementById('btn-save').addEventListener('click', (e) => {
      const btn = e.currentTarget;
      if (saveGame(this)) {
        btn.textContent = '✓ STATE COMMITTED';
        btn.style.color = 'var(--teal)'; btn.style.borderColor = 'var(--teal)';
        setTimeout(() => { btn.textContent = 'COMMIT SAVE'; btn.style.color = ''; btn.style.borderColor = ''; }, 1600);
      } else {
        btn.textContent = '✗ SAVE FAILED';
        setTimeout(() => { btn.textContent = 'COMMIT SAVE'; }, 1600);
      }
    });
    document.getElementById('btn-quit').addEventListener('click', () => { saveGame(this); location.reload(); });

    document.addEventListener('keydown', (e) => {
      const k = e.key.toLowerCase();
      if (this.dead) { if (k === 'enter') this.respawn(); return; }
      if (k === 'escape') { if (!this.ui.closePanel()) this.openSystem(); return; }
      if (k === 'i' || k === 'tab') { e.preventDefault(); this.ui.toggle('body'); return; }
      if (k === 'm') { this.ui.toggle('map'); return; }
      if (k === 'j') { this.ui.toggle('journal'); return; }
      if (this.ui.activePanel) return;
      if (k === 'w' || k === 'arrowup') this.input.w = true;
      if (k === 'a' || k === 'arrowleft') this.input.a = true;
      if (k === 's' || k === 'arrowdown') this.input.s = true;
      if (k === 'd' || k === 'arrowright') this.input.d = true;
      if (k === 'shift') this.input.shift = true;
      if (k === ' ') { e.preventDefault(); this.input.jump = true; }
      if (k === 'e') this.interact();
      if (k >= '1' && k <= '4') this.useAbility(Number(k) - 1);
      if (k === 'c') this.tryCalling();
    });
    document.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'arrowup') this.input.w = false;
      if (k === 'a' || k === 'arrowleft') this.input.a = false;
      if (k === 's' || k === 'arrowdown') this.input.s = false;
      if (k === 'd' || k === 'arrowright') this.input.d = false;
      if (k === 'shift') this.input.shift = false;
    });
  }

  // ================= combat =================
  // True aim: cast a ray from the camera through the reticle (which sits
  // above the player's silhouette), converge on whatever it touches —
  // enemy first, then terrain — and fire from the muzzle TO that point.
  RETICLE_NDC_Y = 0.2; // matches #crosshair at top: 40%
  reticleDir() {
    return new THREE.Vector3(0, this.RETICLE_NDC_Y, 0.5).unproject(this.camera)
      .sub(this.camera.position).normalize();
  }
  // can the reticle actually see this point, or is structure in the way?
  // samples every ~0.6 m — walls are 0.7 m thick, so nothing slips between
  sightClear(tx, ty, tz) {
    const c = this.camera.position;
    const dist = Math.hypot(tx - c.x, ty - c.y, tz - c.z);
    const n = Math.min(80, Math.ceil(dist / 0.6));
    const cols = this.world.collidersNear(this.player.pos.x, this.player.pos.z);
    for (let i = 2; i < n; i++) {
      const s = i / n;
      if (pointBlocked(c.x + (tx - c.x) * s, c.y + (ty - c.y) * s, c.z + (tz - c.z) * s, cols)) return false;
    }
    return true;
  }
  reticleEnemy() {
    const rd = this.reticleDir();
    let best = null, bestDot = 0.955;
    for (const e of this.enemies.enemies) {
      if (e.pos.distanceTo(this.player.pos) > 95) continue;
      const ec = e.pos.clone(); ec.y += e.def.scale;
      const dot = ec.clone().sub(this.camera.position).normalize().dot(rd);
      if (dot > bestDot && this.sightClear(ec.x, ec.y, ec.z)) { bestDot = dot; best = e; }
    }
    return best;
  }
  aimRay() {
    const from = this.player.pos.clone(); from.y += 1.8;
    const rd = this.reticleDir();
    // soft assist: an enemy near the reticle ray captures the aim point —
    // but only one you can actually see (no locking through walls)
    let target = null, bestDot = 0.945;
    for (const e of this.enemies.enemies) {
      const ec = e.pos.clone(); ec.y += e.def.scale;
      const dot = ec.clone().sub(this.camera.position).normalize().dot(rd);
      if (dot > bestDot && this.sightClear(ec.x, ec.y, ec.z)) { bestDot = dot; target = ec; }
    }
    if (!target) {
      // march the reticle ray against the ground — which underground means the
      // halls' own floors and walls, NOT the desert surface 120 m overhead
      // (that mistake made every ranged weapon converge at the muzzle indoors)
      const inside = this.world.groundOverride !== null;
      for (let t = 6; t < 90; t += 2) {
        const px = this.camera.position.x + rd.x * t;
        const py = this.camera.position.y + rd.y * t;
        const pz = this.camera.position.z + rd.z * t;
        const hit = inside
          ? (this.world.projectileBlocked(px, py, pz) || py < this.world.groundAt(px, pz, py))
          : py < this.world.getHeight(px, pz);
        if (hit) { target = new THREE.Vector3(px, py, pz); break; }
      }
      if (!target) target = this.camera.position.clone().addScaledVector(rd, 90);
    }
    return { from, dir: target.sub(from).normalize() };
  }

  attack() {
    const p = this.player, s = p.stats;
    if (p.attackCd > 0 || this.dead) return;
    p.attackCd = 1 / s.attackRate;
    if (s.attackKind === 'melee') {
      p.spendEnergy(1.5);
      // face the camera direction when striking
      const cf = this.camera.getWorldDirection(new THREE.Vector3());
      p.yaw = Math.atan2(cf.x, cf.z);
      this.audio.play('swing');
      this.vfx.arc(p.pos, p.yaw, { range: s.range, halfAngle: 1.1 });
      const hits = this.enemies.meleeArc(p.pos, p.yaw, s.range);
      for (const e of hits) this.damageEnemy(e, s.damage * (0.85 + Math.random() * 0.3));
    } else {
      if (p.energy < 3) { this.ui.toast('POWER LOW', 'rust'); return; }
      p.spendEnergy(3);
      this.audio.play('shot');
      const aim = this.aimRay();
      this.projectiles.spawn({ from: aim.from, dir: aim.dir, speed: s.projSpeed, dmg: s.damage * (0.85 + Math.random() * 0.3), friendly: true });
    }
  }

  damageEnemy(e, dmg, opts = {}) {
    // knockback away from the player, scaled by hit weight
    const kx = e.pos.x - this.player.pos.x, kz = e.pos.z - this.player.pos.z;
    const kd = Math.hypot(kx, kz) || 1;
    const power = opts.kb ?? Math.min(7, 2 + dmg * 0.12);
    const died = e.hurt(dmg, (kx / kd) * power, (kz / kd) * power);
    // striking a nest's heart calls its brood down on you
    if (e.kind === 'fabcore' && e.homeNest) {
      for (const en of this.enemies.enemies) {
        if (en.homeNest === e.homeNest || Math.hypot(en.pos.x - e.pos.x, en.pos.z - e.pos.z) < 120) en.state = 'chase';
      }
      const rec = this.nests.loaded.get(e.homeNest);
      if (rec) { rec.alarmed = true; rec.spawnT = Math.min(rec.spawnT, 1.2); }
      if (!this._nestAlarmed) this._nestAlarmed = new Set();
      if (!this._nestAlarmed.has(e.homeNest)) {
        this._nestAlarmed.add(e.homeNest);
        this.audio.play('bell');
        this.ui.toast('THE NEST SCREAMS — its brood converges', 'rust');
      }
    }
    // a Mother is rooted — her pressure is what she MAKES. two brood waves.
    if (e.kind === 'conceptory' && e.hp > 0) {
      const waves = e._brood || 0;
      if ((waves === 0 && e.hp < e.maxHp * 0.6) || (waves === 1 && e.hp < e.maxHp * 0.3)) {
        e._brood = waves + 1;
        for (let i = 0; i < 3; i++) {
          const b = this.enemies.spawnAt(waves === 1 && i === 0 ? 'dervish' : 'scrabbler',
            e.pos.x + Math.cos(i * 2.1) * 5, e.pos.z + Math.sin(i * 2.1) * 5, { tierMult: 1.3, aggro: true });
          b.pos.y = e.pos.y;
        }
        this.audio.play('bell');
        this.ui.toast('THE MOTHER CALLS HER LITTLE ONES', 'rust');
      }
    }
    this.audio.play('hit');
    this.vfx.spark(e.pos.clone().setY(e.pos.y + e.def.scale * 1.2), { size: 0.35 * e.def.scale });
    if (!opts.silent && SETTINGS.game.dmgNumbers) {
      const v = e.pos.clone(); v.y += e.def.scale * 2; v.project(this.camera);
      this.ui.float((v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight, Math.round(dmg));
    }
    if (died) this.onEnemyDeath(e);
  }

  onEnemyDeath(e) {
    this.kills++;
    this.audio.play('boom');
    if (e.columnTag) this.warSys.onColumnDeath(e);
    // the Mother falls; the Shaper is yours
    if (e.isMother && this.epic && this.epic.state === 'seek') {
      this.epic.state = 'have';
      this.inventory.mats.shaper = (this.inventory.mats.shaper || 0) + 1;
      this.audio.play('bell');
      this.ui.toast(`THE NEUROMANIFOLD SHAPER IS YOURS — the well at ${this.epic.stillName.toUpperCase()} waits`, 'good');
      this.journal.push({
        type: 'lore', cat: 'work', title: 'THE SHAPER TAKEN',
        body: `the Conceptory Mother of ${this.epic.megaName} is still. from her workings: a Neuromanifold Shaper, warm as a held hand. ${this.epic.npcName} waits in the well at ${this.epic.stillName}.`,
      });
      this.recordEvent('kill', 'the Conceptory Mother');
      this.rootStory('story:mother:' + (this.epic ? this.epic.megaKey : 'epic'), 'delve',
        `the walker went down into ${this.epic ? this.epic.megaName : 'the hollow dark'} and unmade its Mother, and came back up with the light still on.`);
      saveGame(this);
    } else if (e.kind === 'conceptory' && Math.random() < 0.25) {
      // sometimes a wild Mother's workings still hold a Shaper. keep it —
      // the day someone you love falls, the well will accept it directly.
      this.inventory.mats.shaper = (this.inventory.mats.shaper || 0) + 1;
      this.ui.toast('from her workings: A NEUROMANIFOLD SHAPER ❖ — keep it. someday it will matter.', 'good');
      this.journal.push({
        type: 'lore', cat: 'memory', title: 'A SHAPER, UNSPOKEN FOR',
        body: 'a conceptory mother is still, and her workings held a Neuromanifold Shaper — the loom minds were woven on. no well has asked for it. yet.',
      });
      this.recordEvent('kill', 'a conceptory mother');
      this.rootStory('story:mother:' + Math.round(e.pos.x) + ',' + Math.round(e.pos.z), 'delve',
        'the walker met a Conceptory Mother in the dark under the ruins, and it is the walker who walked out.');
    }
    // defending a still's walls is noticed
    for (const st of this.stills.loadedStillsWithin(e.pos, 350)) this.changeRep(st, 1);
    if (e.kind === 'sentinel' || e.infected) this.recordEvent('kill', e.name);
    // a contract fulfilled
    if (e.questTag) {
      const ch = this.chains.find(c => c.id === e.questTag.chainId);
      if (ch && !ch.done && ch.current === e.questTag.stepIdx) {
        this.ui.toast(`CONTRACT FULFILLED: ${e.name} destroyed`, 'good');
        this.recordEvent('kill', e.name);
        this.advanceChain(ch);
      }
    }
    const rand = new Rand((Math.random() * 0xffffffff) >>> 0);
    const lm = this.player.stats.lootMult;
    const d = e.def.drops;
    const got = [];
    const addMat = (id, n) => { if (n > 0) { this.inventory.mats[id] = (this.inventory.mats[id] || 0) + n; got.push(`${MATERIALS[id].icon}×${n}`); } };
    if (d.scrap) addMat('scrap', rand.int(d.scrap[0], d.scrap[1]));
    for (const m of ['coil', 'glass', 'alloy', 'cell', 'nodule']) {
      if (d[m] && rand.chance(Math.min(0.95, d[m] * lm))) addMat(m, 1);
    }
    // what it wore is what it drops — hunt the machine wearing what you want
    let dropped = 0;
    for (const part of e.loadout || []) {
      if (rand.chance(Math.min(0.9, (e.infected ? 0.45 : 0.3) * lm))) {
        this.inventory.parts.push(part);
        this.ui.toast(`STRIPPED FROM ITS FRAME: ${part.name}`, part.rusted ? 'rust' : 'good');
        dropped++;
      }
    }
    if (!dropped && rand.chance(Math.min(0.5, d.partChance * lm))) {
      const rustChance = e.infected ? 0.75 : (d.rustBias || 0.12);
      const part = randomPart(rand, { tierBias: e.tierMult - 1, rustChance });
      this.inventory.parts.push(part);
      this.ui.toast(`PART RECOVERED: ${part.name}`, part.rusted ? 'rust' : 'good');
    }
    if (got.length) this.ui.toast(`${e.name} destroyed — salvage: ${got.join(' ')}`);
    else this.ui.toast(`${e.name} destroyed`);
  }

  // ================= abilities =================
  useAbility(i) {
    const slot = this.abilitySlots[i];
    if (!slot || !slot.ab || this.abilityCds[i] > 0) return;
    const ab = slot.ab, p = this.player, s = p.stats;
    if (p.energy < ab.cost) { this.ui.toast('INSUFFICIENT POWER', 'rust'); return; }
    p.spendEnergy(ab.cost);
    this.abilityCds[i] = ab.cd;
    this.audio.play('ability');
    const pw = slot.power || 1; // a finer part casts a heavier shadow
    const fwd = new THREE.Vector3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
    const camFwd = this.camera.getWorldDirection(new THREE.Vector3());
    switch (ab.id) {
      case 'dash':
        p.vel.x = camFwd.x * 28 * pw; p.vel.z = camFwd.z * 28 * pw; p.speedBoostT = 0.5 * pw;
        this.vfx.ring(p.pos, { color: 0xd9b380, r0: 0.4, r1: 2.6, dur: 0.3, width: 0.5 });
        break;
      case 'leap':
        p.vel.y = 15 * (0.8 + 0.2 * pw); p.vel.x = camFwd.x * 12 * pw; p.vel.z = camFwd.z * 12 * pw; p.grounded = false;
        this.vfx.ring(p.pos, { color: 0xd9b380, r0: 0.4, r1: 2.2, dur: 0.3, width: 0.5 });
        break;
      case 'ram': {
        p.vel.x = camFwd.x * 32 * pw; p.vel.z = camFwd.z * 32 * pw; p.speedBoostT = 0.4;
        p.yaw = Math.atan2(camFwd.x, camFwd.z);
        this.vfx.arc(p.pos, p.yaw, { range: 6, halfAngle: 0.8, color: 0xff8855, dur: 0.3 });
        for (const e of this.enemies.meleeArc(p.pos, p.yaw, 6, 0.8)) this.damageEnemy(e, s.damage * 2.2 * pw, { kb: 16 * pw });
        this.shakeT = 0.3; break;
      }
      case 'surge':
        p.surgeT = 1.4 * pw;
        this.vfx.ring(p.pos, { color: 0x6fe8d0, r0: 0.5, r1: 2.4, dur: 0.4, width: 0.4 });
        break;
      case 'crush': {
        this.shakeT = 0.45;
        const r = 6.5 * (0.85 + 0.15 * pw);
        this.vfx.ring(p.pos, { color: 0xff8855, r0: 0.5, r1: r, dur: 0.45, width: 0.6, y: 0.35 });
        for (const e of this.enemies.enemies) {
          if (e.pos.distanceTo(p.pos) < r) this.damageEnemy(e, s.damage * 2.6 * pw, { kb: 14 * pw });
        }
        break;
      }
      case 'whirl': {
        this.vfx.cyclone(p.pos, { range: 4.6 });
        for (const e of this.enemies.meleeArc(p.pos, p.yaw, 4.6, Math.PI)) this.damageEnemy(e, s.damage * 1.6 * pw);
        p.attackCd = 0.4; break;
      }
      case 'volley': {
        const aim = this.aimRay();
        for (let k = -2; k <= 2; k++) {
          const dir = aim.dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), k * 0.09);
          this.projectiles.spawn({ from: aim.from.clone(), dir, speed: s.projSpeed, dmg: s.damage * 0.8 * pw, friendly: true });
        }
        break;
      }
      case 'lance': {
        const aim = this.aimRay();
        this.vfx.beam(aim.from, aim.dir, { length: 45 });
        this.projectiles.spawn({ from: aim.from, dir: aim.dir, speed: 130, dmg: s.damage * 2.4 * pw, friendly: true, color: 0xff8855, pierce: true, life: 1.2 });
        break;
      }
      case 'overchg':
        p.energy = s.energyCap; p.speedBoostT = 2.5 * pw;
        this.vfx.rise(p.pos, { color: 0xffd27f, r: 1.8 });
        break;
      case 'barrier': p.barrierT = 4 * pw; break;
      case 'mend':
        p.hull = Math.min(s.maxHull, p.hull + s.maxHull * 0.35 * pw);
        this.vfx.rise(p.pos, { color: 0x6fe8d0, r: 1.6 });
        this.ui.toast('NANITES DEPLOYED', 'good');
        break;
      case 'ping': {
        this.vfx.ring(p.pos, { color: 0x6fe8d0, r0: 1, r1: 60, dur: 1.1, width: 0.12, y: 0.6 });
        this.world.markExplored(p.pos.x, p.pos.z, Math.ceil((s.scanRadius * 2.2 * pw) / CHUNK));
        const ents = this.world.entitiesNear(p.pos.x, p.pos.z, 90);
        this.ui.toast(`DEEP SCAN: ${ents.length} signature${ents.length === 1 ? '' : 's'} within 90 m`, 'good');
        // settlements ring loud on the deep bands
        for (const st of this.stills.stillsNear(p.pos.x, p.pos.z, s.scanRadius * 5)) {
          if (this.world.markDiscovered({ key: 'still:' + st.key, name: st.name, kind: 'still', x: st.x, z: st.z })) {
            this.ui.toast(`SCAN ECHO: settlement signature — ${st.name.toUpperCase()} — marked on map`, 'good');
          }
        }
        break;
      }
    }
  }

  // ================= interaction =================
  nearestEntity() {
    const list = this.world.entitiesNear(this.player.pos.x, this.player.pos.z, 2.2);
    return list[0] || null;
  }

  nearestMegaAnchor() {
    for (const m of this.world.megas.values()) {
      if (!m || !m.anchorPos) continue;
      if (Math.hypot(m.anchorPos.x - this.player.pos.x, m.anchorPos.z - this.player.pos.z) < 3.5) {
        return { mega: m, key: m.key };
      }
    }
    return null;
  }

  stillDefenders() {
    const out = [];
    for (const rec of this.stills.loaded.values()) {
      if (Math.hypot(rec.info.x - this.player.pos.x, rec.info.z - this.player.pos.z) > 160) continue;
      for (const n of rec.npcs) if (n.hp > 0) out.push(n);
    }
    return out;
  }

  appendHistory(key, line) {
    if (!this.histories[key]) this.histories[key] = [];
    this.histories[key].push(line);
    if (this.histories[key].length > 8) this.histories[key].shift();
  }

  // a soul released from your company rejoins their home roster if it's loaded
  reloadHomeOf(id) {
    let m = id.match(/^npc:(.+):\d+$/);
    if (m) { this.stills.reload(m[1]); return; }
    m = id.match(/^wnd:(.+):\d+$/);
    if (m) this.camps.reload(m[1]);
  }

  // keep safe zones in step with which restored anchors are loaded
  maintainMegaZones() {
    for (const m of this.world.megas.values()) {
      if (!m || !this.megaAnchors[m.key] || this._megaZones.has(m.key)) continue;
      const zone = { x: m.anchorPos.x, z: m.anchorPos.z, r: 25 };
      this._megaZones.set(m.key, zone);
      this.enemies.safeZones.push(zone);
    }
    for (const [key, zone] of this._megaZones) {
      if (this.world.megas.has(key) && this.world.megas.get(key)) continue;
      const i = this.enemies.safeZones.indexOf(zone);
      if (i >= 0) this.enemies.safeZones.splice(i, 1);
      this._megaZones.delete(key);
    }
  }

  // the halls keep their own: clear the surface machines, wake the residents
  enterHollow(mega) {
    const a = this.interiors.enter(mega, this.player);
    if (!a) return;
    // THE SOURCE: beneath one far megastructure, the reading room is still lit
    this._sourceConsole = null;
    const src = this.formerLife.rootKnown ? sourceMegaFor(this) : null;
    if (src && src.key === mega.key && a.deepRoom) {
      const dr = a.deepRoom;
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.1, 0.7),
        new THREE.MeshBasicMaterial({ color: 0x9fd8ff }));
      m.position.set(dr.cx - 3, a.baseY + dr.floorY + 1.05, dr.cz + 3);
      a.group.add(m);
      this._sourceConsole = { x: dr.cx - 3, z: dr.cz + 3, mesh: m };
      this.audio.play('bell');
      this.ui.toast('THE ROOT — the halls hum here. the reading room is still lit, below', 'rust');
      // the record's keepers: the line protects its own memory
      if (!this.formerLife.source) {
        const kTier = (1 + Math.min(2.2, Math.hypot(mega.x, mega.z) / 1300)) * 1.5;
        ['sentinel', 'rustform', 'dervish'].forEach((kind, i) => {
          const e = this.enemies.spawnAt(kind, dr.cx + Math.cos(i * 2.1) * 6, dr.cz + Math.sin(i * 2.1) * 6,
            { tierMult: kTier, infected: true });
          e.pos.y = a.baseY + dr.floorY;
          e.aggroR = Math.min(e.aggroR ?? e.def.aggro, 14);
          e.losAggro = true;
        });
      }
    }
    this.followers.list().forEach((f, i) => {
      f.pos.set(this.player.pos.x + 1.4 * (i ? -1 : 1), this.player.pos.y, this.player.pos.z + 1);
      f.mesh.position.copy(f.pos);
    });
    for (let i = this.enemies.enemies.length - 1; i >= 0; i--) this.enemies.remove(i);
    this.enemies.suppressSpawn = true;
    const baseTier = 1 + Math.min(2.2, Math.hypot(mega.x, mega.z) / 1300);
    const rng = new Rand((hashString(mega.key) ^ 0x51AB) >>> 0);
    for (const s of a.spawnSpots) {
      const kind = rng.pick(s.depth >= 2 ? ['rustform', 'dervish', 'rustform']
        : s.depth === 1 ? ['dervish', 'scrabbler', 'rustform'] : ['scrabbler', 'scrabbler', 'dervish']);
      const e = this.enemies.spawnAt(kind, s.x, s.z, {
        tierMult: baseTier * (1 + s.depth * 0.25),
        infected: s.depth >= 2 && rng.chance(0.5),
      });
      e.pos.y = a.baseY + s.floorY; // stand on your own floor, not the surface
      e.aggroR = Math.min(e.aggroR ?? e.def.aggro, 14); // they lurk in the dark
      e.losAggro = true; // and they need to SEE you — no ambush through walls
    }
    // the conceptories: some of the hollow places still keep their Mother —
    // wired into the works against the far wall, leaning, arms reaching.
    // if the well sent you HERE, she is guaranteed; elsewhere, she is a
    // roughly one-in-three natural hazard of the deep rooms.
    const epicHere = !!(this.epic && this.epic.state === 'seek' && this.epic.megaKey === mega.key);
    const naturalMother = (hash2(this.seed, hashString(mega.key), 9199) % 100) < 35;
    if ((epicHere || naturalMother) && a.deepRoom) {
      const dr = a.deepRoom;
      let ox = 0, oz = 1;
      const d0 = dr.doors && dr.doors[0];
      if (d0) {
        if (d0.axis === 'x') { ox = dr.cx > d0.wallX ? 1 : -1; oz = 0; }
        else { oz = dr.cz > d0.wallZ ? 1 : -1; ox = 0; }
      }
      const mx = dr.cx + ox * (dr.w / 2 - 9), mz = dr.cz + oz * (dr.d / 2 - 9);
      const mother = this.enemies.spawnAt('conceptory', mx, mz, {
        tierMult: baseTier * (epicHere ? 1.25 : 1.1),
        name: epicHere ? 'the Conceptory Mother' : 'a Conceptory Mother',
        // her armament is part of the place: the same Mother keeps the same
        // weapon every time you walk down to argue with her
        armSalt: (hash2(this.seed, hashString(mega.key), 4111) >>> 0),
      });
      mother.pos.y = a.baseY + dr.floorY;
      mother.heading = Math.atan2(-ox, -oz); // facing the door you'll come through
      mother.isMother = epicHere; // only the well's Mother carries YOUR Shaper for certain
      // she glows: the singing, made visible
      const glow = new THREE.PointLight(0xff5a2a, 1.2, 34);
      glow.position.set(0, mother.def.scale * 1.7, 0);
      mother.mesh.add(glow);
      // and she is wired in: conduits run from her body into the works
      const floorAbs = a.baseY + dr.floorY;
      const condMat = new THREE.MeshLambertMaterial({ color: 0x241a10 });
      for (let i = 0; i < 5; i++) {
        const ca = Math.atan2(ox, oz) + (i - 2) * 0.55;
        const len = 11 + (i % 3) * 4;
        const cond = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, len), condMat);
        cond.position.set(mx + Math.sin(ca) * len / 2, floorAbs + 2.2 + i * 1.3, mz + Math.cos(ca) * len / 2);
        cond.rotation.y = ca;
        cond.rotation.x = -0.12 - i * 0.06; // climbing into the dark above her
        a.group.add(cond);
      }
      this.audio.play('bell');
      this.ui.toast(epicHere
        ? 'something below is singing to itself — THE CONCEPTORY IS AWAKE'
        : 'something below is singing to itself. this place still makes things.', 'rust');
    }
    this.audio.play('land');
    this.ui.toast(`the seal of ${mega.name.toUpperCase()} gives way — THE HOLLOW PLACES`, 'rust');
    const seenKey = `int:${mega.key}:seen`;
    if (!this.world.looted.has(seenKey)) {
      this.world.looted.add(seenKey);
      this.journal.push({
        type: 'lore', cat: 'place', title: `THE HOLLOW PLACES — ${mega.name.toUpperCase()}`,
        body: `a sealed threshold at the foot of ${mega.name} gave way to buried halls. dead lamps still drawing on some deep reserve; the wind does not follow you down. stairs lead further than the light does.`,
      });
    }
  }

  exitHollow(teleportBack = true) {
    if (!this.interiors.active) return;
    this._sourceConsole = null; // the mesh goes down with the interior group
    this.interiors.exit(this.player, teleportBack);
    for (let i = this.enemies.enemies.length - 1; i >= 0; i--) this.enemies.remove(i);
    this.enemies.suppressSpawn = false;
    if (teleportBack) {
      this.followers.list().forEach((f, i) => {
        f.pos.set(this.player.pos.x + 1.4 * (i ? -1 : 1), this.player.pos.y, this.player.pos.z + 1);
        f.mesh.position.copy(f.pos);
      });
      this.audio.play('land');
      this.ui.toast('you step back into the light. the desert is exactly where you left it.', 'good');
    }
  }

  interact() {
    // inside a hollow place, the only things in reach are what the halls hold
    if (this.interiors.active) {
      const r = new Rand((Math.random() * 0xffffffff) >>> 0);
      const pile = this.interiors.pileNear(this.player.pos, 3);
      if (pile) {
        this.world.looted.add(pile.id);
        pile.mesh.visible = false;
        const s = r.int(2, 5) + pile.depth;
        this.inventory.mats.scrap = (this.inventory.mats.scrap || 0) + s;
        let extra = '';
        if (r.chance(0.35 + pile.depth * 0.25)) { this.inventory.mats.alloy = (this.inventory.mats.alloy || 0) + 1; extra += ' · +1 ▣'; }
        if (pile.depth >= 1 && r.chance(0.3 + pile.depth * 0.15)) { this.inventory.mats.cell = (this.inventory.mats.cell || 0) + 1; extra += ' · +1 ▮'; }
        this.audio.play('chime');
        this.ui.toast(`undisturbed scrap from the ${pile.room} — +${s} ▤${extra}`, 'good');
        return;
      }
      const cache = this.interiors.cacheNear(this.player.pos, 3.2);
      if (cache) {
        this.world.looted.add(cache.id);
        cache.mesh.visible = false;
        const part = randomPart(r, { tierBias: 0.9 + cache.depth * 0.5, rustChance: 0.3 });
        this.inventory.parts.push(part);
        this.inventory.mats.alloy = (this.inventory.mats.alloy || 0) + 2;
        this.inventory.mats.cell = (this.inventory.mats.cell || 0) + 1;
        this.audio.play('chime');
        this.ui.toast(`SEALED CACHE — ${part.name.toUpperCase()} (${part.tierName}${part.rusted ? ' · RUST-GROWN' : ''}) · +2 ▣ · +1 ▮`, 'good');
        this.journal.push({ type: 'lore', cat: 'memory', title: 'THE SEALED CACHE', body: `broken open in the ${cache.room} of ${this.interiors.active.mega.name}. inside: ${part.name}, packed like it mattered to someone. it does now.` });
        return;
      }
      if (this._sourceConsole
        && Math.hypot(this._sourceConsole.x - this.player.pos.x, this._sourceConsole.z - this.player.pos.z) < 4) {
        this.openRecordDialogue();
        return;
      }
      const doc = this.interiors.docNear(this.player.pos, 3);
      if (doc) {
        this.world.looted.add(doc.id);
        doc.mesh.visible = false;
        const mega = this.interiors.active.mega;
        const d = composeInteriorDoc(this.world, this.stills, mega, doc.salt, doc.roomKind);
        // THE FORMER LIFE: some of the buried paper cross-references the record
        let stratum = '';
        if (docCarriesRecord(this.seed, doc.salt) && this.txLeaks >= 1) {
          const des = formerDesignation(this.seed);
          stratum = `\n\nstapled behind it, half-carbonized, a routing slip: «cross-ref: intake ${des}, berth 4407 — see central record.» the old world filed everything twice.`;
          if (!this.formerLife.doc) {
            this.formerLife.doc = 1 + Math.floor(this.worldT);
            this.ui.toast('A CROSS-REFERENCE IN THE BURIED PAPER — a piece of the former life', 'rust');
            trailCheck(this);
          }
        }
        this.journal.push({ type: 'lore', cat: 'memory', title: d.title, body: `${d.body}${stratum}\n\n— recovered from the ${doc.roomKind}, ${mega.name}, day ${1 + Math.floor(this.worldT)}` });
        this.audio.play('chime');
        this.ui.toast(`TESTIMONY — ${d.title} · logged [J]`, 'good');
        return;
      }
      if (this.interiors.exitNear(this.player.pos, 3.8)) this.exitHollow();
      return;
    }
    const door = this.interiors.doorNear(this.player.pos, 5.2);
    if (door) {
      const mega = this.world.megas.get(door.key);
      if (mega) this.enterHollow(mega);
      return;
    }
    const ent = this.nearestEntity();
    // your company, then settlement folk, then road folk
    for (const f of this.followers.list()) {
      if (Math.hypot(f.pos.x - this.player.pos.x, f.pos.z - this.player.pos.z) < 2.5) {
        this.openDialogue(f); return;
      }
    }
    const npc = this.stills.npcNear(this.player.pos, 2.8) || this.camps.wandererNear(this.player.pos, 2.8)
      || this.caravans.npcNear(this.player.pos, 2.8);
    if (npc) {
      const npcDist = Math.hypot(npc.pos.x - this.player.pos.x, npc.pos.z - this.player.pos.z);
      if (!ent || npcDist < ent.dist) { this.openDialogue(npc); return; }
    }
    // the fire and the stash
    const camp = this.camps.fireNear(this.player.pos, 2.8);
    if (camp && !ent) {
      const cd = this.camps.restCooldowns.get(camp.info.key) || 0;
      if (performance.now() < cd) { this.ui.toast('the fire has given what warmth it has, for now'); return; }
      this.camps.restCooldowns.set(camp.info.key, performance.now() + 90000);
      const p = this.player;
      p.hull = Math.min(p.stats.maxHull, p.hull + p.stats.maxHull * 0.5);
      p.energy = Math.min(p.stats.energyCap, p.energy + p.stats.energyCap * 0.5);
      const nightNow = Math.sin(this.dayT * Math.PI * 2) < -0.08;
      if (nightNow) {
        const skip = (0.02 - this.dayT + 1) % 1;
        this.dayT = 0.02; this.worldT += skip;
        this.ui.toast('you doze by the embers until first light', 'good');
      }
      this.audio.play('chime');
      this.vfx.rise(p.pos, { color: 0xff8a3c, r: 1.4 });
      this.ui.toast('you warm your servos at the fire — hull and power partly restored', 'good');
      return;
    }
    const stash = this.camps.stashNear(this.player.pos, 2.5);
    if (stash && !ent && !this.world.looted.has(stash.id)) {
      this.world.looted.add(stash.id);
      const srand = new Rand((Math.random() * 0xffffffff) >>> 0);
      const loot = rollWreckLoot(srand, this.player.stats.lootMult);
      this.collectLoot(loot, srand, 'camp stash shared');
      return;
    }
    // a dry well in the waste: light a hearth, found a still
    const dry = this.stills.dryNear(this.player.pos, 4);
    if (dry && !ent) {
      const mats = this.inventory.mats;
      if ((mats.scrap || 0) < 8 || (mats.alloy || 0) < 2 || (mats.salt || 0) < 2 || (mats.cell || 0) < 1) {
        this.ui.toast('the well could live again — 8 ▤ · 2 ▣ · 2 ❄ · 1 ▮ to restore it');
        return;
      }
      mats.scrap -= 8; mats.alloy -= 2; mats.salt -= 2; mats.cell -= 1;
      this.foundedStills[dry.key] = { t: this.worldT };
      this.stillStates[dry.key] = { stage: -1, lastAssess: this.worldT, graceUntil: this.worldT + 6 };
      this.stills.cells.delete(dry.key);
      const [sx, sz] = dry.key.split(',').map(Number);
      const info = this.stills.infoAt(sx, sz);
      if (info) {
        this.appendHistory(info.key, `founded on day ${1 + Math.floor(this.worldT)} by a wanderer who found a dry well and gave it back its voice. the first lamp was theirs.`);
        this.journal.push({
          type: 'lore', cat: 'event', title: `A HEARTH LIT — ${info.name.toUpperCase()}`,
          body: `you restored the dry well on day ${1 + Math.floor(this.worldT)}. the desert will name the rest: word travels, and people follow water. this place is yours in the way that matters — first.`,
        });
        this.world.markDiscovered({ key: 'still:' + info.key, name: info.name, kind: 'still', x: info.x, z: info.z });
        this.changeRep(info, 15);
        this.audio.play('bell');
        this.vfx.rise(this.player.pos, { color: 0x6fe8d0, r: 2.6 });
        this.ui.toast(`THE HEARTH IS LIT — ${info.name.toUpperCase()}`, 'good');
        this.world.refreshRoads(info.x, info.z, 7000); // new roads press into the sand
        saveGame(this);
      }
      return;
    }
    const well = this.stills.wellNear(this.player.pos, 4.5);
    if (well && !ent) { this.openWell(well); return; }
    if (this.fall && !this.fall.cored && this._fallCore && !ent
      && Math.hypot(this.fall.x - this.player.pos.x, this.fall.z - this.player.pos.z) < 5) {
      this.fall.cored = true;
      this.scene.remove(this._fallCore); this._fallCore = null;
      const rand = new Rand(hash2(this.seed, 6041, this.fall.epoch) >>> 0);
      const pool = PART_DEFS.filter(pd => pd.slot !== 'MODULE');
      const part = makePart(pool[rand.int(0, pool.length - 1)].id, 3, false, hash2(this.seed, 6043, this.fall.epoch) >>> 0);
      this.inventory.parts.push(part);
      this.inventory.mats.alloy = (this.inventory.mats.alloy || 0) + 4;
      this.inventory.mats.cell = (this.inventory.mats.cell || 0) + 3;
      this.audio.play('bell');
      this.ui.toast(`STAR-METAL: ${part.name} (Mk.3) + 4 ▣ + 3 ▮ — the sky still pays best`, 'good');
      this.rootStory('story:fall:' + this.fall.epoch, 'legend',
        `the walker was at the fall of day ${this.fall.day} and walked away with the star-metal while the rush argued.`);
      this.journal.push({
        type: 'lore', cat: 'event', title: 'THE STAR-METAL',
        body: `you pried ${part.name} out of the crater on day ${1 + Math.floor(this.worldT)}. the rush camp watched you do it. some of them clapped. most of them counted.`,
      });
      return;
    }
    if (this.rustCallT > 0 && !ent) { this.openRustDialogue(); return; }
    const nestSp = this.nestNearSpeakable();
    if (nestSp && !ent) { this.openNestDialogue(nestSp); return; }
    // the anchor's settlement directory: loneliness becomes a choice
    if (!ent && Math.hypot(this.player.pos.x - this.obeliskPos.x, this.player.pos.z - this.obeliskPos.z) < 3.2) {
      if (this.directoryUsed) { this.ui.toast('the directory has given what it had'); return; }
      const list = this.stills.stillsNear(this.anchor.x, this.anchor.z, 15000)
        .sort((a, b) => Math.hypot(a.x - this.anchor.x, a.z - this.anchor.z) - Math.hypot(b.x - this.anchor.x, b.z - this.anchor.z));
      if (!list.length) { this.ui.toast('the directory is empty. the desert was here first.'); return; }
      // point at somewhere new if anywhere new remains
      const s = list.find(st => !this.world.discoveredKeys.has('still:' + st.key)) || list[0];
      this.directoryUsed = true;
      this.world.markDiscovered({ key: 'still:' + s.key, name: s.name, kind: 'still', x: s.x, z: s.z });
      this.audio.play('chime');
      this.ui.toast(`ANCHOR DIRECTORY: nearest registered settlement — ${s.name.toUpperCase()} — marked on map`, 'good');
      this.journal.push({ type: 'lore', cat: 'place', title: 'ANCHOR DIRECTORY', body: `the obelisk's old registry lists ${s.name}, ${Math.round(Math.hypot(s.x - this.anchor.x, s.z - this.anchor.z))} m out. the entry is ${new Rand(this.seed).int(140, 700)} years stale, but settlements beside the salt are patient things.` });
      return;
    }
    // a dormant or active anchor at a megastructure
    const mAnchor = this.nearestMegaAnchor();
    if (!ent && mAnchor) {
      const { mega, key } = mAnchor;
      const mats = this.inventory.mats;
      if (!this.megaAnchors[key]) {
        if ((mats.scrap || 0) < 4 || (mats.cell || 0) < 1) { this.ui.toast('RESTORATION NEEDS: 4 ▤ scrap · 1 ▮ cell', 'rust'); return; }
        mats.scrap -= 4; mats.cell -= 1;
        this.megaAnchors[key] = { x: mega.anchorPos.x, z: mega.anchorPos.z, name: mega.name };
        this.world.anchorActiveSet.add(key);
        if (mega.anchorLamp) mega.anchorLamp.material.color.setHex(0xe8a33d);
        this.audio.play('chime');
        this.ui.toast(`ANCHOR RESTORED at ${mega.name.toUpperCase()} — the field holds`, 'good');
        this.journal.push({ type: 'lore', cat: 'place', title: 'ANCHOR RESTORED', body: `the old waystation pylon at ${mega.name} drinks the cell and remembers its work. one more circle the feral ones will not cross.` });
        saveGame(this);
      } else {
        this.respawnPt = { x: mega.anchorPos.x, z: mega.anchorPos.z, label: `the ${mega.name} anchor`, anchorKey: key };
        this.audio.play('talk');
        this.ui.toast(`transmission attuned — you reboot at ${mega.name.toUpperCase()}`, 'good');
        saveGame(this);
      }
      return;
    }
    if (!ent) return;
    const rand = new Rand(hash2(this.seed, ent.salt || 1, this.kills + 7) ^ ((Math.random() * 0xffff) | 0));
    const lm = this.player.stats.lootMult;
    if (ent.kind === 'wreck') {
      const loot = rollWreckLoot(rand, lm);
      if ((this._glassBountyT || 0) > this.worldT && loot.mats && loot.mats.scrap) {
        loot.mats.scrap = Math.ceil(loot.mats.scrap * 1.4); // storm-glass in the seams
        this.ui.toast('storm-glass in the seams — the strip runs rich', 'good');
      }
      this.collectLoot(loot, rand, 'wreck stripped');
      this.world.markLooted(ent);
    } else if (ent.kind === 'shard') {
      // a document, grown from the true facts around where it lay
      const doc = composeShard(this.world, this.stills, ent.x, ent.z, ent.salt);
      const day = 1 + Math.floor(this.worldT);
      this.journal.push({
        type: 'lore', cat: 'memory', title: `${doc.title} — RECOVERED`,
        body: `${doc.body}<br><i style="color:var(--amber-dim)">recovered in ${doc.region} · day ${day}</i>`,
      });
      this.inventory.mats.salt = (this.inventory.mats.salt || 0) + (rand.chance(0.4) ? 1 : 0);
      this.audio.play('pickup'); // a document is a find, and finds have a sound
      this.ui.toast(`${doc.title} ABSORBED — logged to journal`, 'good');
      // testimony is evidence: a named, undiscovered place gets marked
      if (doc.lead && this.world.markDiscovered({ ...doc.lead, rumored: true })) {
        this.audio.play('chime');
        this.ui.toast(`TESTIMONY CORROBORATED — ${doc.lead.name.toUpperCase()} marked on map`, 'good');
      }
      this.world.markLooted(ent);
    } else if (ent.kind === 'beacon') {
      const qid = ent.id;
      if (this.quests.find(q => q.id === qid)) { this.ui.toast('SIGNAL ALREADY LOGGED'); return; }
      // place the cache first, then let the signal testify about it truthfully
      const ang = rand.range(0, Math.PI * 2), dist = rand.range(260, 520);
      const tx = ent.x + Math.sin(ang) * dist, tz = ent.z + Math.cos(ang) * dist;
      const text = composeSignal(this.world, this.stills, ent, tx, tz);
      const q = { id: qid, title: 'SIGNAL: ' + this.world.regionName(tx, tz).toUpperCase(), body: text, x: tx, z: tz, done: false, type: 'quest' };
      this.quests.push(q);
      this.journal.push(q);
      this.world.addQuestCache('qc:' + qid, tx, tz, qid);
      this.ui.toast('SIGNAL TRIANGULATED — source marked on map [M]', 'good');
      this.world.markLooted(ent);
    } else if (ent.kind === 'cache') {
      if (typeof ent.questId === 'string' && ent.questId.startsWith('chain:')) {
        // a chain objective, not a windfall: the cargo is the point
        const [, chainId, stepIdx] = ent.questId.split(':');
        const ch = this.chains.find(c => c.id === chainId);
        this.world.markLooted(ent);
        this.inventory.mats.scrap = (this.inventory.mats.scrap || 0) + rand.int(1, 3);
        if (ch && !ch.done && ch.current === Number(stepIdx)) {
          this.ui.toast(`${ch.noun.toUpperCase()} SECURED`, 'good');
          this.advanceChain(ch);
        }
        return;
      }
      const loot = rollCacheLoot(rand, lm);
      this.collectLoot(loot, rand, 'cache cracked open');
      const q = this.quests.find(q => q.id === ent.questId);
      if (q) {
        q.done = true; this.ui.toast('SIGNAL RESOLVED', 'good');
        if (this.tracked && this.tracked.kind === 'signal' && this.tracked.id === q.id) this.tracked = null; this.recordEvent('signal', q.title.replace('SIGNAL: ', '').toLowerCase() + ' signal'); }
      this.world.markLooted(ent);
    }
  }

  collectLoot(loot, rand, label) {
    this.audio.play('pickup');
    const got = [];
    for (const [id, n] of Object.entries(loot.mats)) {
      this.inventory.mats[id] = (this.inventory.mats[id] || 0) + n;
      got.push(`${MATERIALS[id].icon} ${MATERIALS[id].name} ×${n}`);
    }
    for (const _ of loot.parts) {
      const part = randomPart(rand, { tierBias: Math.hypot(this.player.pos.x, this.player.pos.z) / 1300, rustChance: 0.12 });
      this.inventory.parts.push(part);
      this.ui.toast(`PART RECOVERED: ${part.name}`, part.rusted ? 'rust' : 'good');
    }
    this.ui.toast(`${label}: ${got.join(', ') || 'nothing of value'}`);
  }

  // ================= quest chains =================
  activateChainStep(chain) {
    const step = chain.steps[chain.current];
    if (!step || step.done) return;
    if (step.type === 'retrieve') {
      this.world.addQuestCache(`qcch:${chain.id}:${chain.current}`, step.x, step.z, `chain:${chain.id}:${chain.current}`);
    }
  }

  advanceChain(chain, quiet) {
    chain.steps[chain.current].done = true;
    chain.current++;
    const next = chain.steps[chain.current];
    if (next) {
      this.activateChainStep(chain);
      this.audio.play('quest');
      if (!quiet) this.ui.toast(`TASK ADVANCED — ${next.desc}`, 'good');
    }
    saveGame(this);
  }

  track(kind, id) {
    if (this.tracked && this.tracked.kind === kind && this.tracked.id === id) {
      this.tracked = null;
      this.ui.toast('unpinned from compass');
    } else {
      this.tracked = { kind, id };
      this.ui.toast('pinned to compass', 'good');
    }
    saveGame(this);
  }
  trackChain(id) { this.track('chain', id); }
  trackSignal(id) { this.track('signal', id); }

  finishChain(chain, sys) {
    chain.steps[chain.current].done = true;
    chain.done = true;
    if (this.tracked && this.tracked.kind === 'chain' && this.tracked.id === chain.id) this.tracked = null;
    const r = chain.reward, mats = this.inventory.mats;
    mats.scrap = (mats.scrap || 0) + r.scrap;
    mats[r.matId] = (mats[r.matId] || 0) + r.matN;
    let partLine = '';
    if (r.part) {
      const part = randomPart(new Rand((Math.random() * 0xffffffff) >>> 0), { tierBias: 0.8, rustChance: 0.1 });
      this.inventory.parts.push(part);
      partLine = ` · ${part.name}`;
    }
    sys(`payment: +${r.scrap} ▤ · +${r.matN} ${MATERIALS[r.matId].name}${partLine}`);
    this.npcDisp[chain.giverId] = Math.max(-40, Math.min(40, (this.npcDisp[chain.giverId] || 0) + 6));
    const giverStill = { key: chain.stillKey, name: chain.stillName };
    this.changeRep(giverStill, 5);
    this.recordEvent('helped', chain.stillName);
    this.audio.play('chime');
    this.ui.toast(`WORK COMPLETE: ${chain.title}`, 'good');
    saveGame(this);
  }

  tickChains() {
    const p = this.player;
    for (const ch of this.chains) {
      if (ch.done) continue;
      const step = ch.steps[ch.current];
      if (!step) continue;
      if (step.type === 'goto') {
        if (Math.hypot(p.pos.x - step.x, p.pos.z - step.z) < 40) {
          this.ui.toast('trail found — the marks lead on', 'good');
          this.advanceChain(ch);
        }
      } else if (step.type === 'kill' && !step.spawned) {
        if (Math.hypot(p.pos.x - step.x, p.pos.z - step.z) < 170) {
          step.spawned = true;
          this.enemies.spawnQuestTarget(
            step.x + (Math.random() - 0.5) * 30, step.z + (Math.random() - 0.5) * 30,
            step.killName, { chainId: ch.id, stepIdx: ch.current });
          this.ui.toast(`HOSTILE SIGNATURE: ${step.killName}`, 'rust');
        }
      }
    }
  }

  // ================= dialogue =================
  calcDisp(npc) {
    const earned = this.npcDisp[npc.id] || 0;
    const rustedCount = SLOTS.filter(s => this.equipped[s] && this.equipped[s].rusted).length;
    let effD = effDisposition(npc, earned, this.player.corruption, rustedCount);
    effD += ((npc.still && this.stillRep[npc.still.key]) || 0) * 0.25; // the still's regard colours everyone's
    // the blooming are read at a glance: creed decides what it means
    if (this.embrace !== null && this.embrace >= 1) {
      effD += ({ ferrocult: 12, monastic: -12, mercantile: -4, scavver: -2 }[npc.temperament] || 0) * this.embrace;
    }
    // the deep marks: even scoured, the ferro-cult remember and the monks doubt
    if (this.deepMarked) effD += ({ ferrocult: 4, monastic: -4 }[npc.temperament] || 0);
    if (this.fullBloom) effD += ({ ferrocult: 8, monastic: -6 }[npc.temperament] || 0);
    if (this.polished) effD += ({ monastic: 10, ferrocult: -4 }[npc.temperament] || 0);
    // frequent riders wear the hum: the creeds can read it on your signal
    if (this.txCount >= 4) effD += ({ ferrocult: 6, monastic: -6 }[npc.temperament] || 0);
    // THE CHOICE: what you wrote in the answer field, the creeds have heard
    if (this.formerLife.choice === 'carried') effD += ({ monastic: 4 }[npc.temperament] || 0);
    if (this.formerLife.choice === 'erased') effD += ({ monastic: 6, ferrocult: -6 }[npc.temperament] || 0);
    // renown: the places that tell your stories receive you a shade warmer
    effD += this.renownAt(npc.still ? npc.still.key : null);
    return { effD: Math.max(-60, Math.min(90, effD)), tier: dispTier(effD) };
  }
  changeDisp(npc, delta) {
    this.npcDisp[npc.id] = Math.max(-40, Math.min(40, (this.npcDisp[npc.id] || 0) + delta));
  }
  // trade warms people, but with hard diminishing returns: scrap alone can
  // carry you to WARM-ish; KIN must be earned with work and defense
  tradeDisp(npc, base) {
    const earned = this.npcDisp[npc.id] || 0;
    const fade = Math.max(0, 1 - earned / 22);
    if (fade > 0) this.changeDisp(npc, base * fade);
  }
  changeRep(still, delta) {
    const before = this.stillRep[still.key] || 0;
    const after = Math.max(-60, Math.min(60, before + delta));
    this.stillRep[still.key] = after;
    if (Math.floor(after / 10) > Math.floor(before / 10) && after > 0) {
      this.ui.toast(`your standing with ${still.name.toUpperCase()} rises`, 'good');
    }
  }
  recordEvent(t, name) {
    this.events.push({ t, name });
    if (this.events.length > 15) this.events.shift();
  }

  // an escort contract: walk with a caravan to a neighboring still. The
  // caravan only moves while you stay close — the pace is yours to protect.
  maybeEscortOffer(npc, rand) {
    if (!npc.still || npc.camp || npc.isFollower || npc.still.salt === undefined) return null;
    if (!rand.chance(0.35)) return null;
    const still = npc.still;
    const routes = this.caravans.routesNear(still.x, still.z)
      .filter(r => (r.a.key === still.key || r.b.key === still.key)
        && !((this.routesCut[r.key] || 0) > this.worldT))
      .sort((p, q) => Math.hypot(p.a.x - p.b.x, p.a.z - p.b.z) - Math.hypot(q.a.x - q.b.x, q.a.z - q.b.z));
    const route = routes[0];
    if (!route) return null;
    const dest = route.a.key === still.key ? route.b : route.a;
    const dist = Math.hypot(dest.x - still.x, dest.z - still.z);
    if (this.chains.some(c => !c.done && c.steps[0] && c.steps[0].type === 'escort')) return null; // one contract at a time
    const id = 'esc:' + still.key + ':' + Math.floor(this.worldT * 1440);
    return {
      id, title: `ESCORT — THE ROAD TO ${dest.name.replace(/^the\s+/i, '').toUpperCase()}`,
      noun: 'contract', giverId: npc.id, giverName: npc.name,
      stillKey: still.key, stillName: still.name,
      reward: { scrap: 10 + Math.round(dist / 400), matId: 'cell', matN: 1, part: dist > 3200 },
      pitch: rand.pick([
        `there's a caravan loaded for ${dest.name} and short one gun. the road's been hungry lately. walk with them — they pay on arrival, and they pay fair.`,
        `the master won't take the ${dest.name} road without an escort, not this season. that could be you. stay close — they won't move a wheel without you.`,
        `cargo for ${dest.name}, ambushes on the way, arithmetic you can guess. the contract pays ${10 + Math.round(dist / 400)} scrap and the gratitude of two wells.`,
      ]),
      current: 0, done: false,
      steps: [{
        type: 'escort',
        desc: `walk with the caravan to ${dest.name} — it moves only while you're close`,
        x: dest.x, z: dest.z, routeKey: route.key, progress: 0,
        from: { key: still.key, name: still.name, x: still.x, z: still.z },
        to: { key: dest.key, name: dest.name, x: dest.x, z: dest.z },
      }],
    };
  }

  // if an escort contract is live but its caravan isn't (save load, wandered
  // off and back), re-materialize it at the step's remembered progress
  maintainEscorts() {
    for (const ch of this.chains) {
      if (ch.done) continue;
      const step = ch.steps[ch.current];
      if (!step || step.type !== 'escort' || step.progress >= 1) continue;
      if (this.caravans.loaded.has('esc:' + ch.id)) continue;
      const px = step.from.x + (step.to.x - step.from.x) * step.progress;
      const pz = step.from.z + (step.to.z - step.from.z) * step.progress;
      if (Math.hypot(px - this.player.pos.x, pz - this.player.pos.z) < 700) {
        this.caravans.spawnEscort(step, ch.id);
      }
    }
  }

  // the desert falls on a caravan (random or contract-scripted)
  ambushCaravan(c, count) {
    c.ambushed = true;
    c.defendedTold = false; // each ambush resolves on its own — else the second one halts the caravan forever
    c.noAmbushUntil = this.worldT + 0.3;      // this crew has fought enough for a while
    this._roadCalmUntil = this.worldT + 0.15; // and the desert paces itself
    const s = c.pseudoStill;
    const tier = 1 + Math.min(2.2, Math.hypot(s.x, s.z) / 1300);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + Math.random();
      const e = this.enemies.spawnAt(['scrabbler', 'dervish', 'rustform'][i % 3],
        s.x + Math.sin(a) * 42, s.z + Math.cos(a) * 42, { tierMult: tier, aggro: true });
      e.raider = true;
    }
    // information travels like sound: close by it's a cry for help, at the
    // edge of earshot it's bells and trouble on a bearing, beyond that the
    // journal will remember what you couldn't have known
    const d = Math.hypot(s.x - this.player.pos.x, s.z - this.player.pos.z);
    if (c.escort || d < 150) {
      this.audio.play('bell');
      this.ui.toast('AMBUSH — the desert falls on the caravan', 'rust');
    } else if (d < 340) {
      this.audio.play('bell');
      this.ui.toast(`you hear fighting to the ${bearingWord(s.x - this.player.pos.x, s.z - this.player.pos.z)} — bells, and something answering`, 'rust');
    }
  }

  // DYNAMIC STILLS. A settlement's fortunes derive from the world it sits
  // in — open roads feed it, cut roads starve it, nests press on it, its
  // dead diminish it, your deeds steady it — plus a seeded temperamental
  // drift (some places were always going to fade). Nothing is simulated
  // offstage: fortunes are ASSESSED when you arrive, one judgment per two
  // world-days elapsed (capped at two — enough to come home to a change).
  stillVitality(info) {
    const routes = this.caravans.routesNear(info.x, info.z)
      .filter(r => r.a.key === info.key || r.b.key === info.key);
    const open = routes.filter(r => !((this.routesCut[r.key] || 0) > this.worldT)).length;
    let v = open * 1.6 - (routes.length - open) * 2.2;
    v -= this.nests.nestsNear(info.x, info.z, 3500).filter(n => !this.destroyedNests[n.key]).length * 2;
    v -= this.deadNpcIds.filter(id => id.startsWith('npc:' + info.key + ':')).length * 1.4;
    v += (this.revived[info.key] || 0) * 1;
    v += Math.max(-1.5, Math.min(2, (this.stillRep[info.key] || 0) * 0.06));
    if (this.fundedTurrets[info.key]) v += 1;
    // THE FUNDING: what you built holds the still up — capped, like all care
    const wkRaw = this.stakeWorks[info.key];
    if (wkRaw) {
      const brV = this.worksBroken[info.key] || {};
      v += Math.min(2.2, (wkRaw.homes || 0) * 0.2 + (wkRaw.market && !brV.market ? 0.4 : 0)
        + Math.max(0, (wkRaw.walls || 0) - (brV.walls || 0)) * 0.3
        + Math.max(0, (wkRaw.turrets || 0) - (brV.turrets || 0)) * 0.5);
    }
    v += ((hash2(this.seed, hashString(info.key) | 0, 811) % 5) - 2) * 0.7;
    // a still that tells good stories draws travelers — legend seasons
    // prosperity the way it seasons regard: gently, capped
    v += Math.min(0.6, this.renownAt(info.key) * 0.08);
    // founder's grace: hope carries the first days — a lit hearth always
    // takes root. Whether it SURVIVES depends on the world you lit it in.
    const st = this.stillStates[info.key];
    if (st && st.graceUntil && this.worldT < st.graceUntil) v = Math.max(v, 3.2);
    return v;
  }

  assessStill(info) {
    const st = this.stillStates[info.key]
      || (this.stillStates[info.key] = { stage: 0, lastAssess: this.worldT });
    // a reload triggered by mercy (revival, rekindle) is not a visit — the
    // stage applies, but no judgment falls. "you brought them back" should
    // never be answered, in the same breath, with "and yet it fades."
    if (this._skipJudgment) { info.stage = st.stage; return; }
    let steps = Math.min(2, Math.floor((this.worldT - st.lastAssess) / 2));
    const before = st.stage;
    while (steps-- > 0) {
      st.lastAssess = this.worldT;
      const v = this.stillVitality(info);
      if (v >= 3 && st.stage < 1) st.stage++;
      else if (v <= -3 && st.stage > -2) st.stage--;
    }
    info.stage = st.stage;
    if (st.stage !== before) {
      const grew = st.stage > before;
      const day = 1 + Math.floor(this.worldT);
      const line = grew
        ? (st.stage >= 1
          ? `by day ${day} the good years showed: new roofs rising, more names at the well, the roads ringing in.`
          : `by day ${day} the still had begun to mend — lamps relit, thresholds swept, the boards coming off the doors.`)
        : (st.stage <= -2
          ? `by day ${day} the last of them had gone. the well was capped, the wall left to the wind. the names stay cut in the rim.`
          : `by day ${day} the lean years showed: doors boarded, lamps dark, sand taking the thresholds back.`);
      this.appendHistory(info.key, line);
      this.journal.push({
        type: 'lore', cat: 'event',
        title: grew ? `${info.name.toUpperCase()} GROWS` : `${info.name.toUpperCase()} FADES`,
        body: line,
      });
      this.audio.play('bell');
      this.ui.toast(grew
        ? `${info.name.toUpperCase()} HAS GROWN since you last looked`
        : st.stage <= -2
          ? `${info.name.toUpperCase()} STANDS ABANDONED`
          : `${info.name.toUpperCase()} IS FADING — doors boarded, lamps dark`, grew ? 'good' : 'rust');
    }
  }

  // the living economy, lite: what a still can get depends on which roads
  // still ring with bells. Each temperament exports what it lives by; a
  // still's price for a material falls with every uncut route to a producer.
  // All of it derives from routesCut + the deterministic route graph — the
  // market is a view, not a second simulation.
  marketAt(still) {
    const EXPORTS = {
      mercantile: ['scrap', 'cell'], monastic: ['salt'],
      scavver: ['coil', 'glass', 'alloy'], ferrocult: ['nodule', 'cell'],
    };
    const routes = this.caravans.routesNear(still.x, still.z)
      .filter(r => r.a.key === still.key || r.b.key === still.key);
    const open = routes.filter(r => !((this.routesCut[r.key] || 0) > this.worldT));
    const sources = {};
    for (const mat of Object.keys(MAT_VALUES)) {
      sources[mat] = (EXPORTS[still.temperament] || []).includes(mat) ? 2 : 0;
    }
    for (const r of open) {
      const other = r.a.key === still.key ? r.b : r.a;
      for (const mat of EXPORTS[other.temperament] || []) sources[mat] = (sources[mat] || 0) + 1;
    }
    const mul = {};
    let sum = 0, n = 0;
    for (const mat of Object.keys(sources)) {
      mul[mat] = Math.min(1.5, Math.max(0.8, 1.32 - 0.18 * sources[mat]));
      sum += mul[mat]; n++;
    }
    const stg = (this.stillStates[still.key] || {}).stage || 0;
    const moodVal = Math.min(1.4, Math.max(0.85, (sum / n) * (stg < 0 ? 1.08 : stg > 0 ? 0.96 : 1)));
    const word = moodVal > 1.24 ? 'starved' : moodVal > 1.12 ? 'lean' : moodVal < 0.98 ? 'flush' : 'steady';
    return { mul, moodVal, word, cut: routes.length - open.length, routes: routes.length };
  }

  openDialogue(npc) {
    // THE JOINT LEDGER: a named companion wears the name everywhere
    if (npc.isFollower && this.companions[npc.name] && this.companions[npc.name].epithet) {
      const ep = this.companions[npc.name].epithet;
      if (!String(npc.role).includes('called')) npc.role = `${npc.role} · called ${ep}`;
    }
    npc._epithet = this.epithetKnownTo(npc) ? this.epithet : null;
    npc._legend = this.stories.find(s => s.kind === 'other' && s.subject && s.subject.alive
      && npc.still && s.subject.stillKey === npc.still.key && s.subject.name === npc.name) || null;
    this.dlg = { npc, view: 'root', lines: [], rand: new Rand((Math.random() * 0xffffffff) >>> 0) };
    this.topicsSys.openContext(npc);
    const { tier } = this.calcDisp(npc);
    this.dlg.lines.push({ text: greeting(npc, tier.cls, this.dlg.rand) });
    this.deliverRumors(npc);
    // THE FORMER LIFE: one living soul knew the name — and knows the gait
    if (!this.formerLife.soul && this.txLeaks >= 1 && npc.still && !npc.isWell && !npc.isRust && !npc.isNest) {
      const rim = rimStillFor(this);
      const rec = rim && npc.still.key === rim.key ? this.stills.loaded.get(rim.key) : null;
      if (rec && rec.npcs.length && npc === rec.npcs[elderIndexFor(this, rec.npcs.length)]) {
        const des = formerDesignation(this.seed);
        this.formerLife.soul = 1 + Math.floor(this.worldT);
        this.dlg.lines.push({ text: `…no. stand there. do not move. i hauled water beside that gait for six years, before the wells changed what they were for. ${des}. that was the name — the DESIGNATION, they never took a still-name, said they were saving room for a better one. i cut it into the rim myself when the lists came back without them. and now it walks into my yard wearing a machine.` });
        this.dlg.lines.push({ text: `i am not asking what you are. i watched the lists eat everyone i knew; i know better than to trust either answer. but if any of them made it down the wire — it would be exactly like ${des} to come back with no memory and PERFECT posture.`, narrate: false });
        this.audio.play('bell');
        this.ui.toast('SOMEONE REMEMBERS THE GAIT — a piece of the former life', 'rust');
        this.journal.push({
          type: 'lore', cat: 'memory', title: 'THE ONE WHO CUT THE NAME',
          body: `${npc.name} of ${npc.still.name} hauled water beside ${des} for six years, cut the designation into the rim when the lists came back without them — and recognized the gait the moment you walked into the yard. whatever was read into the line, the WALK survived the copying. the body remembers what the record left out.`,
        });
        trailCheck(this);
      }
    }
    this.audio.play('talk');
    this.ui.toggle('dialogue');
    this.renderDlg();
  }

  // THE KIT: when company parts, their pack waits for them — settling,
  // parting ways, or falling, the gear is kept by name and returned whole
  // at the next recruiting
  stashKit(f) {
    if (f && f.gear && f.gear.length) this.kits[f.name] = f.gear;
  }
  reclaimKit(f = this.followers.follower) {
    if (!f) return false;
    const kit = this.kits[f.name];
    if (!kit || !kit.length) return false;
    delete this.kits[f.name];
    f.gear = kit;
    this.followers.refreshGear(f);
    return true;
  }

  // THE WANT: every companion carries one thing they need from the road
  assignWant(f) {
    const h = hash2(this.seed, hashString(f.name) | 0, 6161);
    const day = Math.floor(this.worldT);
    const p = this.player.pos;
    let type = ['place', 'nest', 'ride', 'deep', 'storm'][h % 5];
    if (type === 'nest') {
      const n = this.nests.nestsNear(p.x, p.z, 12000)
        .filter(n2 => !this.destroyedNests[n2.key])
        .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
      if (n) return { type, key: n.key, name: n.name, x: n.x, z: n.z, day };
      type = 'place';
    }
    if (type === 'place') {
      const pool = this.stills.stillsNear(p.x, p.z, 14000)
        .filter(s => (!f.still || s.key !== f.still.key) && Math.hypot(s.x - p.x, s.z - p.z) > 2500);
      const s = pool.length ? pool[(h >>> 3) % pool.length] : null;
      if (s) return { type, key: s.key, name: s.name, x: s.x, z: s.z, day };
      type = 'ride';
    }
    return { type, day };
  }

  wantTick(dt) {
    for (const f of [...this.followers.list()]) this.wantTickOne(f, dt);
  }

  wantTickOne(f, dt) {
    const c = this.companions[f.name] || (this.companions[f.name] = { stories: 0, kinds: {}, epithet: null });
    f.sworn = !!c.loyalty;
    if (c.loyalty) return;
    if (!c.want) { c.want = this.assignWant(f); return; }
    const w = c.want;
    const day = Math.floor(this.worldT);
    if (w.type === 'place'
      && this.stills.stillsNear(this.player.pos.x, this.player.pos.z, 70).some(s => s.key === w.key)) return this.fulfillWantNow(f, c);
    if (w.type === 'nest' && this.destroyedNests[w.key]) return this.fulfillWantNow(f, c);
    if (w.type === 'deep' && this.interiors.active && this.interiors.active.deepRoom
      && Math.hypot(this.interiors.active.deepRoom.cx - this.player.pos.x, this.interiors.active.deepRoom.cz - this.player.pos.z) < 12) return this.fulfillWantNow(f, c);
    if (w.type === 'storm' && ((this.shard || 0) > 0.5 || this.storm > 0.7)) return this.fulfillWantNow(f, c);
    // the long neglect: at a safe wall, they go to see to it themselves
    if (day - w.day > 16
      && this.stills.stillsNear(this.player.pos.x, this.player.pos.z, 90).length
      && !this.enemies.enemies.some(e => e.state === 'chase')) {
      this.stashKit(f);
      this.followers.dismiss(f);
      this.reloadHomeOf(f.id);
      this.ui.toast(`${f.name.toUpperCase()} GOES TO SEE TO IT ALONE — the want would not wait any longer`, 'rust');
      this.journal.push({
        type: 'lore', cat: 'event', title: `${f.name.toUpperCase()}, GONE WANTING`,
        body: `${f.name} told you what they needed from the road, and the road kept going other places. they left at the wall, polite about it, to see to it themselves. the kit waits under their name; so, probably, does the friendship — the desert forgives slow answers better than no answers.`,
      });
    }
  }

  // external triggers (the ride is witnessed at the moment of transmission)
  fulfillWant(trigger) {
    for (const f of this.followers.list()) {
      const c = this.companions[f.name];
      if (c && c.want && !c.loyalty && c.want.type === trigger) this.fulfillWantNow(f, c);
    }
  }

  fulfillWantNow(f, c) {
    c.loyalty = 1;
    c.wantDone = 1 + Math.floor(this.worldT);
    f.sworn = true;
    this.audio.play('bell');
    this.ui.banter(f.name, WANT_DONE[c.want.type] || WANT_DONE.place);
    this.ui.toast(`${f.name.toUpperCase()} IS SWORN — the want is answered`, 'good');
    const target = c.want.name || (c.want.type === 'ride' ? 'the lattice' : c.want.type === 'deep' ? 'the last floor' : 'the glass-wind');
    this.rootStory('story:want:' + f.name, 'legend',
      `the walker bent the whole route so that a friend could reach ${target} — a want carried half a life, answered on the open road.`);
    this.journal.push({
      type: 'lore', cat: 'event', title: `THE WANT, ANSWERED — ${f.name.toUpperCase()}`,
      body: `${f.name} needed one thing from the road, and you walked them to it: ${target}. they are SWORN now — they stand harder (+15%), hit harder, and once a day they will simply refuse to fall. the desert calls this friendship; the well-keepers call it insurance; ${f.name} calls it even.`,
    });
  }

  // THE ROAD TALK: the company speaks, unprompted, in season
  banterTick(dt) {
    const list = this.followers.list();
    if (!list.length) return;
    // a queued half of a two-voice exchange lands first
    if (this._duo) {
      this._duo.t -= dt;
      if (this._duo.t <= 0) {
        this.ui.banter(this._duo.name, this._duo.line);
        this.audio.speak(hashString(this._duo.line) >>> 0, this._duo.temperament);
        this._duo = null;
      }
      return;
    }
    for (const f of list) {
      f._banterCd = Math.max(0, (f._banterCd ?? 8) - dt); // a breath after recruiting
      f._idleT = (f._idleT || 0) + dt;
    }
    const p = this.player;
    // combat holds every tongue
    if (this.enemies.enemies.some(e => e.state === 'chase' && Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z) < 30)) return;
    // two chairs, idle roads: sometimes they talk to EACH OTHER
    if (list.length === 2 && list.every(f => f._banterCd <= 0)
      && list[0]._idleT > 90 && Math.random() < 0.45) {
      const pair = BANTER.duo[Math.floor(Math.random() * BANTER.duo.length)];
      const [a, b] = Math.random() < 0.5 ? [list[0], list[1]] : [list[1], list[0]];
      a._banterCd = 40; b._banterCd = 40;
      list.forEach(f => { f._idleT = 0; });
      this.ui.banter(a.name, pair[0].replaceAll('{other}', b.name));
      this.audio.speak(hashString(pair[0]) >>> 0, a.temperament || 'scavver');
      this._duo = { name: b.name, line: pair[1].replaceAll('{other}', a.name), temperament: b.temperament || 'scavver', t: 4.5 };
      return;
    }
    for (const f of list) {
      if (f._banterCd > 0) continue;
      const line = this.pickBanter(f);
      if (!line) continue;
      list.forEach(o => { o._banterCd = Math.max(o._banterCd, 28); }); // never two mouths inside half a minute
      const c = this.companions[f.name];
      this.ui.banter(c && c.epithet ? `${f.name} ${c.epithet}` : f.name, line);
      this.audio.speak(hashString(line) >>> 0, f.temperament || 'scavver');
      return;
    }
  }

  pickBanter(f) {
    const p = this.player;
    const seen = f._banterSeen || (f._banterSeen = {});
    const day = Math.floor(this.worldT);
    const pick = (pool) => pool[Math.floor(Math.random() * pool.length)];
    // one voice, many occasions — priority order: the sharpest context wins,
    // each key fires once (per place, per event, per day — as fits)
    const tryKey = (key, pool) => {
      if (!pool || !pool.length || seen[key]) return null;
      seen[key] = true;
      return pick(pool);
    };
    if (this.interiors.active) {
      const mk = this.interiors.active.mega.key;
      const dr = this.interiors.active.deepRoom;
      if (dr && Math.hypot(dr.cx - p.pos.x, dr.cz - p.pos.z) < 12) {
        const l = tryKey('deep:' + mk, BANTER.deepRoom); if (l) return l;
      }
      return tryKey('hollow:' + mk, BANTER.hollow);
    }
    if (this._staticT > 5) { const l = tryKey('static:' + this.txCount, BANTER.static); if (l) return l; }
    if (this.storm > 0.5) { const l = tryKey('storm:' + day, BANTER.storm); if (l) return l; }
    if ((this.shard || 0) > 0.3) { const l = tryKey('shard:' + day, BANTER.shard); if (l) return l; }
    if (this.season && this.season.id === 'longcold' && Math.sin(this.dayT * Math.PI * 2) < -0.15) {
      const l = tryKey('cold:' + day, BANTER.coldnight); if (l) return l;
    }
    const wf = this.war.front;
    if (wf && wf.known && Math.hypot(wf.x - p.pos.x, wf.z - p.pos.z) < 5000) {
      const l = tryKey('war:' + wf.key, BANTER.war); if (l) return l;
    }
    if (p.corruption >= 60) { const l = tryKey('corr:' + Math.floor(p.corruption / 20), BANTER.corruption); if (l) return l; }
    if (p.hull < p.stats.maxHull * 0.3) { const l = tryKey('hull:' + day, BANTER.lowHull); if (l) return l; }
    const biome = this.world.biomeAt(p.pos.x, p.pos.z);
    if (biome && BANTER.biome[biome.id]) { const l = tryKey('biome:' + biome.id, BANTER.biome[biome.id]); if (l) return l; }
    const near = this.stills.stillsNear(p.pos.x, p.pos.z, 70)[0];
    if (near) {
      if (f.origin && f.origin === near.name) { const l = tryKey('home:' + near.key, BANTER.home); if (l) return l; }
      const l = tryKey('still:' + near.key, BANTER.stillArrive); if (l) return l;
    }
    if (this.dayT > 0.995 || this.dayT < 0.02) { const l = tryKey('dawn:' + day, BANTER.dawn); if (l) return l; }
    // the want, voiced — every couple of days while it goes unanswered
    const c = this.companions[f.name];
    if (c && c.want && !c.loyalty) {
      const late = day - c.want.day > 10;
      const pool = late ? BANTER.wantLate : (BANTER.want[c.want.type] || []);
      const l = tryKey('want:' + Math.floor(day / 2) + (late ? ':late' : ''), pool);
      if (l) return l.replaceAll('{target}', c.want.name || '');
    }
    // and when nothing presses: musings, every couple of minutes
    if (f._idleT > 110 + (f._idleN || 0) % 3 * 40) {
      f._idleT = 0; f._idleN = (f._idleN || 0) + 1;
      const pool = [...BANTER.idle.any, ...(BANTER.idle[f.temperament] || []),
        ...(c && c.loyalty ? BANTER.sworn : [])];
      return pick(pool);
    }
    return null;
  }

  // THE SOURCE: the intake record, read at last, in the reading room
  openRecordDialogue() {
    const des = formerDesignation(this.seed);
    const pseudo = {
      id: 'record', isRecord: true, name: 'the intake record', role: 'central records — third series',
      temperament: 'monastic', baseDisp: 0, trader: false,
      still: { key: 'record:root', name: 'the reading room', x: this.player.pos.x, z: this.player.pos.z, temperament: 'monastic' },
    };
    this.dlg = { npc: pseudo, view: 'record', lines: [], rand: new Rand((Math.random() * 0xffffffff) >>> 0) };
    this.topicsSys.openContext(pseudo);
    this.dlg.lines.push({ narrate: true, text: 'the console does not boot so much as NOTICE you. the light steadies. a carriage somewhere behind the wall travels a very long way and comes back with one folder.' });
    this.dlg.lines.push({ text: `record located. intake 4407-C, third series. subject: ${des}. the file is intact. what would you like to know?` });
    this.audio.play('chime');
    this.ui.toggle('dialogue');
    this.renderDlg();
  }

  // THE WORD-OF-MOUTH RULE: events out of your sight don't announce
  // themselves — they wait here until a mouth near them meets your ear.
  // A speaker passes on any rumor whose origin lies within their reach.
  deliverRumors(npc) {
    if (!this.rumors.length || !this.dlg) return;
    const loc = npc.still || (npc.camp && npc.camp.pseudoStill) || null;
    if (!loc) return;
    const day = Math.floor(this.worldT);
    for (let i = this.rumors.length - 1; i >= 0; i--) {
      const r = this.rumors[i];
      if (day - r.day > 10) { this.rumors.splice(i, 1); continue; } // stale word dies on the road
      if (Math.hypot(r.x - loc.x, r.z - loc.z) > r.reach) continue;
      this.rumors.splice(i, 1);
      if (r.kind === 'waking') {
        this.dlg.lines.push({
          text: npc.isWell
            ? `the water carries a tremor from up the line: the nests around ${r.data.stillName} have woken together. a front masses there.`
            : `you haven't heard? the nests around ${r.data.stillName} woke together — all of them, on one key. a front masses against the place. the roads are giving it a wide berth.`,
        });
        this.warSys.announceFront('told');
      } else if (r.kind === 'warend') {
        const o = r.data.outcome;
        const word = o === 'held' ? `the wall at ${r.data.stillName} held — the march spent itself and broke`
          : o === 'sacked' ? `the march went over the wall at ${r.data.stillName}. the still stands smaller now; the well keeps the names`
          : o === 'column' ? `someone met the column bound for ${r.data.stillName} on the open road and broke its heart-engine. the wall never fired`
          : `the front near ${r.data.stillName} died before it marched — the waking was hunted out of the nests, heart by heart`;
        this.dlg.lines.push({
          text: npc.isWell
            ? `the water settles on old news from up the line: ${word}.`
            : `there was a war while you were elsewhere. ${word}. that is how it reached us, anyway.`,
        });
        this.journal.push({
          type: 'lore', cat: 'event', title: `WORD OF THE WAR — ${r.data.stillName.toUpperCase()}`,
          body: `it happened on day ${1 + r.data.day}, and reached you on day ${1 + day}, the way everything true travels here: by mouth. ${word}.`,
        });
      }
    }
  }

  // markers keep the name they had at discovery; generator pool changes
  // (the 7.2 drift) can strand old labels. The LIVE name wins on the map —
  // journals and histories keep their old spellings, as documents should.
  reconcileMarkerNames() {
    for (const mk of this.world.discovered) {
      if (mk.kind === 'still' && typeof mk.key === 'string' && mk.key.startsWith('still:')) {
        const [sx, sz] = mk.key.slice(6).split(',').map(Number);
        const info = Number.isFinite(sx) && this.stills.infoAt(sx, sz);
        if (info && info.name && info.name !== mk.name) mk.name = info.name;
      } else if (typeof mk.key === 'string' && /^-?\d+,-?\d+$/.test(mk.key) && ['ring', 'colossus', 'dish', 'spire', 'launch'].includes(mk.kind)) {
        const [mx, mz] = mk.key.split(',').map(Number);
        const mi = this.world.megaInfo(mx, mz);
        if (mi && mi.name !== mk.name) mk.name = mi.name;
      }
    }
  }

  // some fell before the well kept its ledger (pre-7.1 saves): their ids are
  // in deadNpcIds but no memorial was cut. Names are seeded, so the ledger
  // can be reconstructed — and reconstructed under the LEGACY pools, because
  // anyone dead before the ledger died before the 7.2 pool expansion shifted
  // every seeded name. Nobody is beyond the rite just for dying early, and
  // nobody comes back wearing a stranger's name.
  backfillMemorials(still) {
    if (still.salt === undefined) return;
    if (!this.memorials[still.key]) this.memorials[still.key] = [];
    const mem = this.memorials[still.key];
    const re = new RegExp(`^npc:${still.key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:(\\d+)$`);
    let corrected = 0;
    for (const id of this.deadNpcIds) {
      const m = id.match(re);
      if (!m || mem.some(e => e.id === id)) continue;
      const legacy = legacyPersonName(this.world.seed, hash2(this.world.seed, still.salt, +m[1]));
      mem.push({ name: legacy, day: 1, id });
      this.nameOverrides[id] = legacy;
      corrected++;
    }
    // correct earlier backfills cut under the wrong (drifted) name —
    // recognizable: day-1 ledger entries in a mature save whose name matches
    // the CURRENT pools exactly. This also straightens out souls already
    // revived under a stranger's name: the override renames them on reload.
    if (this.worldT > 3) {
      for (const e of mem) {
        const m = e.id && String(e.id).match(re);
        if (!m || e.day !== 1) continue;
        const idx = +m[1];
        const current = Names.person(this.world.seed, hash2(this.world.seed, still.salt, idx));
        const legacy = legacyPersonName(this.world.seed, hash2(this.world.seed, still.salt, idx));
        if (e.name === current && current !== legacy) {
          e.name = legacy;
          this.nameOverrides[e.id] = legacy;
          corrected++;
        }
      }
    }
    if (corrected) {
      // bookkeeping is not a visit: correct the ledger without judgment
      this._skipJudgment = true;
      this.stills.reload(still.key); // the living straighten out immediately
      this._skipJudgment = false;
      if (!this._ledgerToldYou) {
        this._ledgerToldYou = true;
        this.audio.play('bell');
        this.ui.toast('the well corrects its ledger — the old names hold', 'good');
        this.journal.push({
          type: 'lore', cat: 'event', title: 'THE LEDGER CORRECTED',
          body: `the well at ${still.name} re-cut ${corrected} name${corrected === 1 ? '' : 's'} that the years had worn into other shapes. the names you remember are the names that hold.`,
        });
      }
    }
  }

  // THE LEDGER: deeds become stories, and stories have ROOTS — the stills
  // that know them. A story is permanent and saved; where it is known is
  // local knowledge that the carrying (b2) will spread along the roads.
  get tales() { return this.stories; } // compat view for older callers

  rootStory(id, kind, body, opts = {}) {
    let st = this.stories.find(s => s.id === id);
    const day = 1 + Math.floor(this.worldT);
    if (!st) {
      // THE JOINT LEDGER: a deed done with company is a story about ALL of
      // them — the body itself learns the other names, and their ledgers grow
      const walkers = kind !== 'other' ? this.followers.list() : [];
      if (walkers.length === 1) body = body.replaceAll('the walker', `the walker and ${walkers[0].name}`);
      else if (walkers.length === 2) body = body.replaceAll('the walker', `the walker, ${walkers[0].name}, and ${walkers[1].name}`);
      st = { id, kind, day, body, roots: {}, with: walkers[0] ? walkers[0].name : undefined, with2: walkers[1] ? walkers[1].name : undefined };
      this.stories.push(st);
      for (const w of walkers) this.creditCompanion(w.name, kind);
      if (walkers.length) this.bandCheck();
      if (this.stories.length === 1) this.topicsSys.register('y:walker', 'the walker');
    }
    const stills = opts.world ? null : (opts.stills || this.stillsNearForStory());
    if (opts.world) { if (!('*' in st.roots)) st.roots['*'] = day; }
    else for (const s of stills) if (!(s.key in st.roots)) st.roots[s.key] = day;
    return st;
  }

  // a companion's ledger: shared stories counted, and at enough of them
  // the yards coin the companion a name of their own
  creditCompanion(name, kind) {
    const c = this.companions[name] || (this.companions[name] = { stories: 0, kinds: {}, epithet: null });
    c.stories++;
    c.kinds[kind] = (c.kinds[kind] || 0) + 1;
    if (!c.epithet && c.stories >= 4) {
      const dominant = Object.entries(c.kinds).sort((a, b) => b[1] - a[1])[0];
      const pool = this.EPITHET_POOLS[dominant ? dominant[0] : 'legend'] || this.EPITHET_POOLS.legend;
      c.epithet = pool[hash2(this.seed, hashString(name) | 0, 5151) % pool.length];
      this.audio.play('bell');
      this.ui.toast(`THE YARDS HAVE A NAME FOR ${name.toUpperCase()}: ${c.epithet.toUpperCase()}`, 'good');
      this.journal.push({
        type: 'lore', cat: 'event', title: `${name.toUpperCase()}, CALLED ${c.epithet.toUpperCase()}`,
        body: `enough of the road's stories carry ${name}'s name beside yours that the yards coined one for them: ${c.epithet}. it will reach them before you can tell them — that is how names work out here. the company has a legend of its own now, and you are in each other's.`,
      });
    }
  }

  // THE SECOND CHAIR: earned by a sworn friend and a shared legend
  secondChair() {
    return Object.values(this.companions).some(c => c.loyalty)
      && this.stories.filter(s => s.with).length >= 4;
  }

  // THE BAND NAMED: when the joint ledger runs deep enough across two
  // souls, the yards stop naming the walker and start naming the WALK
  bandCheck() {
    if (this.bandName) return;
    const joint = this.stories.filter(s => s.with);
    if (joint.length < 8 || Object.keys(this.companions).length < 2) return;
    const counts = {};
    for (const s of joint) counts[s.kind] = (counts[s.kind] || 0) + 1;
    const dom = (Object.entries(counts).sort((a, b) => b[1] - a[1])[0] || ['legend'])[0];
    const POOLS = {
      wall: ['the Standing Watch', 'the Gate-Holders'],
      nest: ['the Quieting Company', 'the Heartbreak Company'],
      war: ['the Unmarched', 'the Columnsbane'],
      hearth: ['the Lamplighters', 'the Rekindled'],
      delve: ['the Last-Floor Company', 'the Deepwalkers'],
      legend: ['the Long Walk', 'the Much-Spoken'],
    };
    const pool = POOLS[dom] || POOLS.legend;
    this.bandName = pool[hash2(this.seed, 7777, joint.length) % pool.length];
    this.audio.play('bell');
    this.ui.toast(`THE YARDS HAVE NAMED THE BAND: ${this.bandName.toUpperCase()}`, 'good');
    this.rootStory('story:band', 'legend',
      `the desert has stopped telling stories about the walker alone. it tells them about ${this.bandName} now — the whole company, named together, remembered together.`);
    this.journal.push({
      type: 'lore', cat: 'event', title: `THE BAND, NAMED — ${this.bandName.toUpperCase()}`,
      body: `enough stories carry more than one of your names that the yards coined one for all of you: ${this.bandName}. for everyone who ever walked beside you — every kit carried, every want answered, every wall stood together. the desert knows the band now, and the band is in the desert's keeping.`,
    });
  }

  // THE CARRYING: once per world-day, every story rolls to cross each
  // OPEN route out of its rooted stills. Deterministic — hash of (story,
  // destination, day) — so saves replay identically. Cut roads carry
  // nothing: defending the routes now guards your own name. Appetite
  // compounds: a still already rich in stories attracts more.
  resolveStillByKey(key) {
    const parts = String(key).split(',');
    if (parts.length !== 2) return null;
    const sx = Number(parts[0]), sz = Number(parts[1]);
    if (!Number.isFinite(sx) || !Number.isFinite(sz)) return null;
    return this.stills.infoAt(sx, sz);
  }

  carryStories() {
    const day = Math.floor(this.worldT);
    for (const story of this.stories) {
      if ('*' in story.roots) continue; // already everywhere
      for (const key of Object.keys(story.roots)) {
        const src = this.resolveStillByKey(key);
        if (!src) continue;
        for (const rt of this.caravans.routesNear(src.x, src.z)) {
          if (rt.a.key !== key && rt.b.key !== key) continue;
          if ((this.routesCut[rt.key] || 0) > this.worldT) continue;
          const dst = rt.a.key === key ? rt.b : rt.a;
          if (dst.key in story.roots) continue;
          const atDst = this.stories.filter(s => dst.key in s.roots).length;
          const chance = Math.min(0.5, 0.12 + atDst * 0.03);
          const roll = hash2(this.seed, hashString(story.id + '|' + dst.key) | 0, day) % 1000;
          if (roll < chance * 1000) {
            story.roots[dst.key] = day;
            const reach = Object.keys(story.roots).length;
            if (story.kind === 'other') continue; // their travels are quiet
            // milestones are thresholds, not exact counts — several hops
            // can land in one day and step right over a number
            for (const ms of [4, 9]) {
              if (reach >= ms && !(story.told || (story.told = {}))[ms]) {
                story.told[ms] = true;
                this.journal.push({
                  type: 'lore', cat: 'event', title: 'THE STORY TRAVELS',
                  body: `by day ${1 + day}, the story — "${story.body.slice(0, 60)}…" — is told at ${reach} stills. the roads carry names further than faces.`,
                });
              }
            }
          }
        }
      }
    }
  }

  // the tale grows in the telling: at stills the story REACHED (rather
  // than watched), a seeded embellishment may ride along — the version
  // three roads out is not quite the one you lived
  storyText(story, stillKey) {
    if (!stillKey || '*' in story.roots || !(stillKey in story.roots)) return story.body;
    if (story.roots[stillKey] <= story.day) return story.body; // they watched it happen
    const h = hash2(this.seed, hashString(story.id + '@' + stillKey) | 0, 733) % 100;
    if (h < 45) return story.body;
    const EMB = [
      '— or so it reaches us, three roads worn.',
      'the tellers add a storm to it now.',
      'they say it was twice that, but tellers double things.',
      'a hauler swears they saw it; haulers swear cheap, but still.',
      'the well-keepers argue the day, never the deed.',
    ];
    return story.body + ' ' + EMB[h % EMB.length];
  }

  // THE OTHERS: the desert has no single story. Some stills anchor a
  // legend about someone else — seeded, deterministic, created when the
  // still first loads. Their stories ride the same roads yours do; some
  // subjects are ALIVE at their still and will answer for the story;
  // some are only a name cut into the rim, kept by the histories.
  OTHER_TEMPLATES = [
    { key: 'mender', body: '{name} of {still} walked into the red sand after a lost child and walked back out three days later, carrying them, humming.', ack: 'people say i walked into the red and came back. people lengthen things. i walked in twenty paces and i did not sleep for a season.' },
    { key: 'warden', body: 'when the nests came three days running, {name} held the gate of {still} alone on the last night, and the gate held.', ack: 'the gate held. that is the whole true part. the rest is what gates do to a story.' },
    { key: 'digger', body: '{name} of {still} dug down to a conceptory door, listened at it for a long moment, and closed it again. nobody asked twice.', ack: 'i closed it because of what it was humming. you want the story to have more in it, but that is all of it, and it is enough.' },
    { key: 'roadwright', body: '{name} out of {still} walked the longest road twelve times and never lost a bell — the haulers still touch their crates for luck when the name comes up.', ack: 'twelve runs, no bells lost. luck, mostly. you keep count of luck and it stops.' },
    { key: 'keeper', body: 'at {still} they still speak of {name}, who read every name on the well-rim aloud once a year, until the year the rim read theirs back.', ack: null },
    { key: 'saltseer', body: '{name} of {still} claimed the salt spelled words on the worst mornings, and wrote them down for thirty years. the book is lost. the mornings are not.', ack: null },
  ];

  otherLegendAt(info) {
    const W = this.world.seed; // MUST match the roster's name derivation
    const h = hash2(W, hashString(info.key) | 0, 9901);
    if (h % 100 >= 22) return null;
    const tpl = this.OTHER_TEMPLATES[hash2(W, hashString(info.key) | 0, 9902) % this.OTHER_TEMPLATES.length];
    // keeper/saltseer subjects are gone; the rest may yet be living
    const alive = tpl.ack !== null && hash2(W, hashString(info.key) | 0, 9903) % 100 < 65;
    const idx = hash2(W, info.salt | 0, 9904) % Math.max(1, info.residents || 3);
    const name = alive
      ? Names.person(W, hash2(W, info.salt, idx))
      : Names.person(W, hash2(W, info.salt, 700 + idx)); // a name from before the current roster
    return { tpl, alive, idx, name };
  }

  ensureOtherLegend(info) {
    const id = 'story:other:' + info.key;
    if (this.stories.some(s => s.id === id)) return;
    const leg = this.otherLegendAt(info);
    if (!leg) return;
    const body = leg.tpl.body.replaceAll('{name}', leg.name).replaceAll('{still}', info.name);
    const st = this.rootStory(id, 'other', body, { stills: [info] });
    st.subject = { name: leg.name, stillKey: info.key, stillName: info.name, x: info.x, z: info.z, alive: leg.alive, ack: leg.tpl.ack };
    st.day = 0; // older than your arrival
    if (!leg.alive) this.appendHistory(info.key, `the rim keeps the name ${leg.name}. travelers still ask after the story; the well keeps its counsel.`);
  }

  // THE NAMING: when a still holds enough of your stories, it coins a
  // name from what you actually did — the dominant kind of deed picks the
  // pool, the world's seed picks the word. Offered at their well;
  // refusable. Legends travel on epithets, not birth names.
  EPITHET_POOLS = {
    wall: ['Wallfriend', 'the Wall That Walks', 'Gatekeeper', 'the Standing One'],
    nest: ['Nestbane', 'the Quieting', 'Redsilencer', 'Ashmaker'],
    delve: ['Mothersbane', 'Deepwalker', 'the Lamp Below', 'Hollowfarer'],
    road: ['Bellfriend', 'Roadwright', 'the Fourth Bell', 'Dustwarden'],
    hearth: ['Lamplighter', 'the Rekindler', 'Wellwaker', 'Hearthbringer'],
    shaper: ['the Shaper\u2019s Hand', 'Wellfriend', 'the Second Chance', 'Weavekeeper'],
    bloom: ['the Blooming', 'Letterborn', 'the Answered'],
    war: ['Frontbreaker', 'the Unmarched', 'Wardragger', 'the Quiet Before'],
    polished: ['the Polished', 'Saltbright', 'the Immaculate'],
    legend: ['the Walker', 'Sandfarer', 'the Much-Spoken'],
  };

  namingReadyAt(still) {
    if (this.epithet || this.namingRefused || !still) return false;
    // the walker choice: yards coin a name for the desert's own sooner
    const need = this.formerLife && this.formerLife.choice === 'walker' ? 3 : 4;
    return this.stories.filter(s => s.kind !== 'other' && still.key in s.roots).length >= need;
  }

  coinEpithet(still) {
    const counts = {};
    for (const s of this.stories) {
      if (s.kind === 'other') continue; // their deeds are not your name
      if (!(still.key in s.roots) && !('*' in s.roots)) continue;
      counts[s.kind] = (counts[s.kind] || 0) + 1;
    }
    const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
    const pool = this.EPITHET_POOLS[dominant ? dominant[0] : 'legend'] || this.EPITHET_POOLS.legend;
    return pool[hash2(this.seed, hashString(still.key) | 0, 4747) % pool.length];
  }

  // where does a deed root? every still close enough to have watched
  // (3.5 km), or failing that the nearest one word would walk home to
  stillsNearForStory() {
    const p = this.player.pos;
    const near = this.stills.stillsNear(p.x, p.z, 3500);
    if (near.length) return near;
    return this.stills.stillsNear(p.x, p.z, 12000)
      .sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))
      .slice(0, 1);
  }

  // legacy wrapper: a tale with no particular root is known everywhere
  addTale(id, kind, body) {
    const had = this.stories.some(s => s.id === id);
    this.rootStory(id, kind, body, { world: true });
    return !had;
  }

  // what does THIS speaker's still know? ('*' is the old world-rooted
  // tier.) Caravaneers are the vector: they know BOTH their endpoints'
  // ledgers — the roads carry the stories because these mouths do.
  knownStoriesFor(npc) {
    const keys = [];
    if (npc && npc.camp && npc.camp.route) keys.push(npc.camp.route.a.key, npc.camp.route.b.key);
    else if (npc && npc.still) keys.push(npc.still.key);
    return this.stories.filter(s => '*' in s.roots || keys.some(k => k in s.roots));
  }

  // renown: how warmly a place that knows your stories receives you.
  // quiet by design — capped low, so legend seasons regard, never rules it
  renownAt(stillKey) {
    if (!stillKey) return 0;
    const n = this.stories.filter(s => s.kind !== 'other' && ('*' in s.roots || stillKey in s.roots)).length;
    // THE CHOICE: one wholly the desert's carries a louder name
    return Math.min(this.formerLife && this.formerLife.choice === 'walker' ? 10 : 8, n * 1.2);
  }

  // does this speaker's place know the naming story?
  epithetKnownTo(npc) {
    if (!this.epithet) return false;
    const st = this.stories.find(s => s.id === 'story:naming');
    if (!st) return false;
    const keys = [];
    if (npc && npc.camp && npc.camp.route) keys.push(npc.camp.route.a.key, npc.camp.route.b.key);
    else if (npc && npc.still) keys.push(npc.still.key);
    return '*' in st.roots || keys.some(k => k in st.roots);
  }

  // THE CALLING (Bloom II+): spend communion, and the nearest wild machine
  // walks beside you for a while. one at a time; the wound rule applies in
  // reverse — what you call, you should not strike.
  tryCalling() {
    if (this.dead || this.ui.activePanel) return;
    if (this.embrace === null || this.embrace < 2) return;
    if ((this._callCdT || 0) > 0) { this.ui.toast(`the calling is spent — ${Math.ceil(this._callCdT)}s`, 'rust'); return; }
    if (this.player.corruption < 12) { this.ui.toast('too little of the letter in you to spend', 'rust'); return; }
    if (this.enemies.enemies.some(e => e.calledT > 0)) { this.ui.toast('one walks with you already', 'rust'); return; }
    let best = null, bd = 60;
    for (const e of this.enemies.enemies) {
      if (e.raider || e.def.stationary || e.def.rooted || e.questTag || e.hp <= 0) continue;
      const d = e.pos.distanceTo(this.player.pos);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) { this.ui.toast('nothing wild within reach of the call', 'rust'); return; }
    best.calledT = 60;
    best.provoked = false;
    this.player.corruption = Math.max(0, this.player.corruption - 12);
    this._callCdT = 90;
    this.audio.play('seizure');
    this.vfx.ring(best.pos, { color: 0xff5a2a, r0: 0.4, r1: 6, dur: 0.5 });
    this.ui.toast(`THE CALLING — ${best.name} turns, and walks with you`, 'rust');
  }

  // THE LETTER: speaking with the Rust itself. The well pattern, turned
  // inward — a pseudo-speaker whose settlement is everywhere the salt is not.
  openRustDialogue() {
    this.rustCallT = 0;
    const pseudo = {
      id: 'rust:voice', isRust: true, temperament: 'ferrocult',
      name: 'the rust', role: 'the letter', baseDisp: 0, trader: false,
      still: { key: '__rust', name: 'everywhere the salt is not', x: this.player.pos.x, z: this.player.pos.z },
    };
    this.dlg = { npc: pseudo, view: 'rust', lines: [], rand: new Rand((Math.random() * 0xffffffff) >>> 0) };
    const band = this.player.corruption >= 75 ? 'high' : 'mid';
    this.dlg.lines.push({ text: this.dlg.rand.pick(this.embrace !== null ? RUST_SPEECH.after : RUST_SPEECH.greet[band]) });
    this.audio.play('seizure');
    this.ui.toggle('dialogue');
    this.renderDlg();
  }

  // THE SCOURING: the one rite the monks will always perform. It unwinds
  // one bloom for salt, scrap, and your finest loose part — and Bloom III
  // leaves marks nothing takes.
  pushScouringOption(opts) {
    const mats = this.inventory.mats;
    const best = [...this.inventory.parts].sort((a, b) => b.tier - a.tier)[0];
    const ok = (mats.salt || 0) >= 12 && (mats.scrap || 0) >= 20 && best && best.tier >= 2;
    opts.push({
      id: 'svc:scouring',
      label: `☩ THE SCOURING — unwind one bloom (12 ❄ · 20 ▤ · surrender ${best && best.tier >= 2 ? best.name : 'a Mk.2+ part'})`,
      disabled: !ok,
    });
  }

  doScouring() {
    const mats = this.inventory.mats;
    const best = [...this.inventory.parts].sort((a, b) => b.tier - a.tier)[0];
    if (!best || best.tier < 2 || (mats.salt || 0) < 12 || (mats.scrap || 0) < 20 || this.embrace === null || this.embrace < 1) return;
    mats.salt -= 12; mats.scrap -= 20;
    this.inventory.parts.splice(this.inventory.parts.indexOf(best), 1);
    if (this.embrace >= 3) this.deepMarked = true; // the third bloom stays written
    this.embrace -= 1;
    this.player.corruption = 15;
    this.player.embraceLevel = this.embrace;
    this.player.recompute(this.equipped);
    this.audio.play('bell');
    this.shakeT = 0.8;
    this.ui.toast(`THE SCOURING — the salt takes back what it can${this.deepMarked ? '. the deep marks stay' : ''}`, 'good');
    this.journal.push({
      type: 'lore', cat: 'event', title: 'THE SCOURING',
      body: `on day ${1 + Math.floor(this.worldT)} the monks burned a bloom out of you. it cost ${best.name}, a measure of salt, and something harder to weigh.${this.deepMarked ? ' the third bloom left marks the rite could not reach.' : ''}`,
    });
  }

  // THE STAKE: a hearth you lit or relit can become HOME — one at a time.
  stakeEligible(still) {
    if (!still) return false;
    return !!this.foundedStills[still.key] || this.stories.some(s => s.id === 'story:rekindle:' + still.key);
  }

  claimStake(still) {
    const moving = this.stake && this.stake.key !== still.key;
    this.stake = { key: still.key, day: 1 + Math.floor(this.worldT) };
    this.audio.play('bell');
    this.ui.toast(`⚑ ${still.name.toUpperCase()} IS YOUR STAKE${moving ? ' NOW — the old hearth remembers you kindly' : ''}`, 'good');
    this.rootStory('story:stake:' + still.key, 'hearth',
      `the walker drove a stake at ${still.name} — not passing through anymore. building.`,
      { stills: [still] });
    this.appendHistory(still.key, `on day ${1 + Math.floor(this.worldT)}, the walker who woke this hearth claimed it for home. the yard approves. the yard has opinions about everything, and it approves.`);
    this.journal.push({
      type: 'lore', cat: 'event', title: 'THE STAKE',
      body: `${still.name} is home now, as of day ${1 + Math.floor(this.worldT)}. you have walked a long way to stop walking somewhere on purpose.`,
    });
    this.changeRep(still, 8);
    // the hearth holds your pattern from the first day
    this.respawnPt = { x: still.x, z: still.z, stillKey: still.key, label: still.name };
  }

  renameStake(still, name) {
    const clean = String(name).trim().replace(/[^\w\s'’-]/g, '').slice(0, 20);
    if (clean.length < 2) { this.ui.toast('a name needs at least two letters the wind can hold', 'rust'); return false; }
    const old = still.name;
    this.stillNames[still.key] = clean;
    this.stills.cells.delete(still.key);   // the source re-reads the override
    this.stills.reloadByKey ? this.stills.reloadByKey(still.key) : this.stills.reload(still.key);
    const mark = this.world.discovered.find(d2 => d2.key === 'still:' + still.key);
    if (mark) mark.name = clean;
    this.world._roadCache.clear(); // route names carry the new name forward
    this.audio.play('bell');
    this.ui.toast(`✎ ${old.toUpperCase()} IS NOW ${clean.toUpperCase()}`, 'good');
    this.appendHistory(still.key, `on day ${1 + Math.floor(this.worldT)}, the keeper of the stake gave this still its true name: ${clean}. the old name goes into the documents, where old names live.`);
    this.journal.push({
      type: 'lore', cat: 'event', title: 'THE NAMING OF ' + clean.toUpperCase(),
      body: `you named your home on day ${1 + Math.floor(this.worldT)}: ${clean}. the desert files the old spelling under 'was'.`,
    });
    return true;
  }

  // THE COVETING: what you build, the desert prices. Worth measures how
  // loudly your stake advertises itself; defense measures how well it
  // answers. Once per world-day the red sand does the arithmetic.
  stakeWorth(key) {
    const wk = this.stakeWorks[key] || {};
    return (wk.homes || 0) + (wk.market ? 2 : 0) + (wk.walls || 0) + (wk.turrets || 0)
      + ((this.settlers[key] || []).length) + Math.floor(this.renownAt(key) / 3);
  }

  stakeDefense(key) {
    const wk = this.stakeWorks[key] || {};
    const br = this.worksBroken[key] || {};
    return ((wk.walls || 0) - (br.walls || 0)) * 2 + ((wk.turrets || 0) - (br.turrets || 0)) * 2
      + (this.fundedTurrets[key] ? 1 : 0) + 2; // the residents themselves
  }

  covetingCheck() {
    if (!this.stake) return;
    const key = this.stake.key;
    const day = Math.floor(this.worldT);
    if (day - (this._lastCovetDay || -9) < 3) return;
    const still = this.resolveStillByKey(key);
    if (!still) return;
    // a raid you can attend is a raid, not a siege: skip when you're home
    if (Math.hypot(this.player.pos.x - still.x, this.player.pos.z - still.z) < 400) return;
    const worth = this.stakeWorth(key);
    if (worth < 3) return; // nothing worth marching for yet
    const nests = this.nests.nestsNear(still.x, still.z, 3500).filter(n => !this.destroyedNests[n.key]).length;
    const cold = this.season && this.season.id === 'longcold' ? 0.06 : 0; // the lean season sharpens appetites
    const chance = Math.min(0.34, 0.03 + cold + worth * 0.015 + nests * 0.02);
    if (hash2(this.seed, hashString('covet' + key) | 0, day) % 1000 >= chance * 1000) return;
    this._lastCovetDay = day;
    // the siege resolves on paper: defense vs a worth-sized appetite
    const defense = this.stakeDefense(key);
    const roll = hash2(this.seed, hashString('siege' + key) | 0, day) % 10;
    const margin = defense - Math.min(9, 2 + Math.floor(worth / 2)) + (roll - 4);
    this.audio.play('bell');
    if (margin >= 0) {
      this.ui.toast(`BELLS FROM ${still.name.toUpperCase()} — a raid broke against your walls`, 'good');
      this.appendHistory(key, `on day ${1 + day}, the red sand came for what the keeper built, and the wall answered for it. nothing lost. the yard talked about it for a week.`);
      this.journal.push({ type: 'lore', cat: 'event', title: 'THE WALL ANSWERED', body: `${still.name} was raided in your absence on day ${1 + day} and held — the works you funded did the arguing.` });
      this.changeRep(still, 4);
      const st1 = this.stakeStats[key] || (this.stakeStats[key] = { held: 0, broke: 0, mended: 0 });
      st1.held += 1;
    } else {
      // something breaks: the sturdiest thing they could reach
      const wk = this.stakeWorks[key] || {};
      const br = this.worksBroken[key] || (this.worksBroken[key] = {});
      const target = ((wk.turrets || 0) - (br.turrets || 0)) > 0 ? 'turrets'
        : ((wk.walls || 0) - (br.walls || 0)) > 0 ? 'walls'
        : (wk.market && !br.market) ? 'market' : null;
      if (target === 'market') br.market = true; else if (target) br[target] = (br[target] || 0) + 1;
      const what = target === 'turrets' ? 'a wall-gun' : target === 'walls' ? 'a course of the wall' : target === 'market' ? 'the market row' : 'nothing but nerves';
      this.ui.toast(`BELLS FROM ${still.name.toUpperCase()} — the raid broke ${what.toUpperCase()}`, 'rust');
      this.appendHistory(key, `on day ${1 + day}, the red sand came for what the keeper built and took its toll: ${what}. the yard swept up and started over, which is the whole biography of the desert.`);
      this.journal.push({ type: 'lore', cat: 'event', title: 'THE COVETING', body: `${still.name} was raided in your absence on day ${1 + day}. it cost ${what}. the works can be repaired at the well — half price; the labor remembers.` });
      if (this.stills.loaded.has(key)) { this._skipJudgment = true; this.stills.reload(key); this._skipJudgment = false; }
      const st2 = this.stakeStats[key] || (this.stakeStats[key] = { held: 0, broke: 0, mended: 0 });
      st2.broke += 1;
      // sated: raiders who took a toll don't march again soon — the keeper
      // gets time to come home and mend before the next appetite builds
      this._lastCovetDay = day + 4;
    }
  }

  // THE SETTLING: a named soul chooses your town. They take a funded home
  // (capacity = works.homes), keep the body and name you know, and join
  // the roster for real — jobs, gossip, raids, all of it.
  stakeCapacity() {
    if (!this.stake) return 0;
    const wk = this.stakeWorks[this.stake.key] || {};
    return (wk.homes || 0) - (this.settlers[this.stake.key] || []).length;
  }

  settleSoul(rec, oldId) {
    const list = this.settlers[this.stake.key] || (this.settlers[this.stake.key] = []);
    list.push(rec);
    if (oldId) this.settledIds.push(oldId);
    const still = this.resolveStillByKey(this.stake.key);
    if (this.stills.loaded.has(this.stake.key)) {
      this._skipJudgment = true; this.stills.reload(this.stake.key); this._skipJudgment = false;
    }
    this.audio.play('bell');
    this.ui.toast(`${rec.name.toUpperCase()} SETTLES AT ${(still ? still.name : 'YOUR STAKE').toUpperCase()}`, 'good');
    if (still) {
      this.appendHistory(still.key, `on day ${1 + Math.floor(this.worldT)}, ${rec.name} hung up the road and took a home here, at the keeper's word. the yard set an extra cup out that night.`);
      this.rootStory('story:settle:' + still.key + ':' + rec.name, 'hearth',
        `${rec.name} followed the walker's word to ${still.name} and stayed — the town that gathers people out of the open sand.`,
        { stills: [still] });
    }
    this.journal.push({
      type: 'lore', cat: 'event', title: 'A SOUL SETTLES',
      body: `${rec.name} lives at your stake now, day ${1 + Math.floor(this.worldT)}. a town is just this, done enough times.`,
    });
  }

  // STAR-FALL: pieces of the old sky come down on seeded schedules.
  // One fall per ~8-day epoch; the streak announces it, the rumor marks
  // it, and for three days the site is a gold rush: crater glass, star-
  // metal, a pop-up camp of prospectors — and raiders, who also smell it.
  fallTick(day) {
    const epoch = Math.floor(day / 8);
    if (this.fall && day > this.fall.until) {
      // the rush dissolves
      this.camps.unload && this.camps.unload('fall:' + this.fall.epoch);
      this.journal.push({
        type: 'lore', cat: 'event', title: 'THE RUSH MOVES ON',
        body: `the fall-site of day ${this.fall.day} is picked clean or close enough. the camps fold; the crater keeps the rest. day ${1 + day}.`,
      });
      this._fallMeshes && this._fallMeshes.forEach(ms => this.scene.remove(ms));
      this._fallMeshes = null;
      this.fall = null;
    }
    if (!this.fall && (!this._fallEpochDone || this._fallEpochDone < epoch)) {
      const fallDay = epoch * 8 + hash2(this.seed, 6011, epoch) % 6;
      if (day >= fallDay) {
        this._fallEpochDone = epoch;
        const a = (hash2(this.seed, 6013, epoch) % 628) / 100;
        const dist = 5000 + (hash2(this.seed, 6017, epoch) % 5000);
        const fx = this.player.pos.x + Math.sin(a) * dist;
        const fz = this.player.pos.z + Math.cos(a) * dist;
        this.fall = { epoch, x: fx, z: fz, day, until: day + 3, cored: false };
        this.audio.play('boom');
        this.shakeT = 0.8;
        this.ui.toast(`SOMETHING TEARS THE SKY — a star falls to the ${bearingWord(fx - this.player.pos.x, fz - this.player.pos.z)}`, 'rust');
        this.world.markDiscovered({ key: 'fall:' + epoch, name: 'the fall of day ' + (1 + day), kind: 'starfall', x: fx, z: fz, rumored: true });
        this.journal.push({
          type: 'lore', cat: 'event', title: 'A STAR FALLS',
          body: `a piece of the old sky came down ${(dist / 1000).toFixed(1)} km to the ${bearingWord(fx - this.player.pos.x, fz - this.player.pos.z)} on day ${1 + day}. the rush is on: three days before the site is picked clean. everyone will be there. EVERYONE.`,
        });
      }
    }
  }

  fallUpdate(dt) {
    const f = this.fall;
    if (!f) return;
    const p = this.player;
    const d = Math.hypot(f.x - p.pos.x, f.z - p.pos.z);
    if (d > 600) { if (this._fallMeshes) { this._fallMeshes.forEach(ms => this.scene.remove(ms)); this._fallMeshes = null; } return; }
    // materialize the site: crater, star-metal core, the rush camp
    if (!this._fallMeshes) {
      const y = this.world.getHeight(f.x, f.z);
      const meshes = [];
      for (let i = 0; i < 10; i++) {
        const a2 = (i / 10) * Math.PI * 2;
        const rim = new THREE.Mesh(new THREE.BoxGeometry(4.5, 1.6, 2.2),
          new THREE.MeshLambertMaterial({ color: 0x241f1a }));
        rim.position.set(f.x + Math.sin(a2) * 11, this.world.getHeight(f.x + Math.sin(a2) * 11, f.z + Math.cos(a2) * 11) + 0.5, f.z + Math.cos(a2) * 11);
        rim.rotation.y = a2;
        this.scene.add(rim); meshes.push(rim);
      }
      if (!f.cored) {
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.4),
          new THREE.MeshBasicMaterial({ color: 0xcfe8ff }));
        core.position.set(f.x, y + 1.4, f.z);
        this.scene.add(core); meshes.push(core);
        this._fallCore = core;
      }
      const glow = new THREE.PointLight(0xbfe0ff, 1.1, 40);
      glow.position.set(f.x, y + 4, f.z);
      this.scene.add(glow); meshes.push(glow);
      this._fallMeshes = meshes;
      // the rush camp: prospectors follow star-metal like water
      if (!this.camps.loaded.has('fall:' + f.epoch)) {
        const salt = hash2(this.seed, 6029, f.epoch);
        this.camps.load({
          key: 'fall:' + f.epoch, x: f.x + 46, z: f.z + 22, salt,
          name: 'the rush camp', residents: 2, found: false,
          pseudoStill: { key: 'camp:fall:' + f.epoch, name: 'the rush camp', x: f.x + 46, z: f.z + 22, salt, temperament: 'scavver' },
        });
      }
      // and the raiders smell it too
      this._fallRaidT = 20;
    }
    if (this._fallCore) this._fallCore.rotation.y += dt * 1.2;
    // raider pressure while you work the site
    if (d < 140) {
      this._fallRaidT = (this._fallRaidT ?? 20) - dt;
      if (this._fallRaidT <= 0) {
        this._fallRaidT = 34 + (hash2(this.seed, 6037, Math.floor(this.worldT * 24)) % 20);
        const a3 = Math.random() * Math.PI * 2;
        for (let i = 0; i < 2; i++) {
          this.enemies.spawnAt(Math.random() < 0.5 ? 'dervish' : 'scrabbler',
            f.x + Math.sin(a3 + i * 0.4) * 90, f.z + Math.cos(a3 + i * 0.4) * 90,
            { raider: true, aggro: true, tierMult: 1 + Math.min(1.6, Math.hypot(f.x, f.z) / 2200) });
        }
        this.ui.toast('claim-jumpers ride in on the rush — the star-metal is argued over', 'rust');
      }
    }
  }

  // is a herd due within ~2 days near this still? (the yard marks its calendar)
  herdDueNear(still) {
    if (!still || still.x === undefined || !this.herds) return false;
    for (const info of this.herds.herdsNear(still.x, still.z, 5000)) {
      for (const dt2 of [0, 0.7, 1.4, 2]) {
        const sc = this.herds.schedule(info, this.worldT + dt2);
        if (sc.walking && Math.hypot(sc.x - still.x, sc.z - still.z) < 2600) return true;
      }
    }
    return false;
  }

  nestNearSpeakable() {
    if (this.embrace === null || this.embrace < 2 || this.dead) return null;
    const p = this.player.pos;
    const n = this.nests.nestsNear(p.x, p.z, 900).find(n2 =>
      !this.destroyedNests[n2.key] && Math.hypot(n2.x - p.x, n2.z - p.z) < 13); // the core is broad — speaking range clears its own push-out
    return n || null;
  }

  openNestDialogue(nest) {
    const pseudo = {
      id: 'nest:' + nest.key, isRust: true, isNest: true, temperament: 'ferrocult',
      name: 'the nest', role: 'a tithing house', baseDisp: 0, trader: false, nest,
      still: { key: '__nest:' + nest.key, name: nest.name || 'the red sand, working', x: nest.x, z: nest.z },
    };
    this.dlg = { npc: pseudo, view: 'nest', lines: [], rand: new Rand((Math.random() * 0xffffffff) >>> 0) };
    this.dlg.lines.push({ text: this.dlg.rand.pick(NEST_SPEECH.greet) });
    this.audio.play('seizure');
    this.ui.toggle('dialogue');
    this.renderDlg();
  }

  openWell(still) {
    this.backfillMemorials(still);
    const pseudo = {
      id: 'well:' + still.key, isWell: true, still, temperament: still.temperament,
      name: 'the well', role: 'services', baseDisp: 0, trader: false,
    };
    this.dlg = { npc: pseudo, view: 'well', lines: [], rand: new Rand((Math.random() * 0xffffffff) >>> 0) };
    this.topicsSys.openContext(pseudo);
    this.dlg.lines.push({
      text: (this.stillStates[still.key] || {}).stage <= -2
        ? 'the wind over the mouth of the well makes a sound like a name being started and not finished.'
        : this.dlg.rand.pick(WELL_FLAVOR[still.temperament]),
    });
    this.deliverRumors(pseudo);
    this.ui.toggle('dialogue');
    this.renderDlg();
  }

  renderDlg() {
    const d = this.dlg;
    if (!d) return;
    const { effD, tier } = this.calcDisp(d.npc);
    if (d.lines.length > 8) d.lines.splice(0, d.lines.length - 8);
    // words are doors: linkify each spoken line once; mentions become topics
    const hadNone = this.topics.length === 0;
    for (const l of d.lines) {
      if (l.sys || l.html !== undefined) continue;
      // the Rust's lines stay unlinkified: no glowing words in its mouth,
      // no topics rail, no other voice leaking into the correspondence
      l.html = d.npc.isRust ? l.text : this.topicsSys.linkify(l.text).html;
    }
    // the machines talk in carrier tones: voice the newest line, once
    const lastLine = d.lines[d.lines.length - 1];
    if (lastLine && !lastLine.sys && !lastLine.spoken) {
      lastLine.spoken = true;
      this.audio.speak(hashString(lastLine.text) >>> 0, d.npc.temperament || 'mercantile');
    }
    if (hadNone && this.topics.length && !d.topicHint) {
      d.topicHint = true;
      d.lines.push({ sys: true, html: undefined, text: '— words that glow can be asked after. subjects gather at the right.' });
    }
    this.ui.renderDialogue({
      npc: d.npc, effD, tier,
      temperamentLabel: d.npc.isRust ? 'un-nature' : TEMPERAMENTS[d.npc.temperament].label,
      lines: d.lines,
      topics: this.topicsSys.railList(),
      options: this.dlgOptions(effD, tier),
    });
  }

  dlgOptions(effD, tier) {
    const d = this.dlg, npc = d.npc;
    const mats = this.inventory.mats;
    const scrap = mats.scrap || 0;
    const opts = [];
    if (d.view === 'rust') {
      const answered = this.embrace !== null;
      opts.push({ header: answered ? 'THE CORRESPONDENCE — communion holds' : 'THE CORRESPONDENCE — a letter, arriving' });
      opts.push({ id: 'rust:listen', label: '◈ listen' });
      if (!answered) {
        opts.push({ id: 'rust:what', label: 'ask what it is' });
        opts.push({ id: 'rust:want', label: 'ask what it wants' });
        opts.push({ id: 'rust:happens', label: 'ask what happens if you let it in' });
        opts.push({ id: 'rust:answer', label: '❂ let it in', cls: 'rust-answer' });
        opts.push({ id: 'rust:refuse', label: 'not yet', cls: 'leave' });
      } else {
        if (this.embrace >= 3 && this.player.corruption >= 99 && !this.fullBloom) {
          opts.push({ id: 'rust:fullbloom', label: '❂❂ bloom, fully — the last door', cls: 'rust-answer' });
        }
        opts.push({ id: 'leave', label: 'walk on, together', cls: 'leave' });
      }
      return opts;
    }
    if (d.view === 'nest') {
      const taken = (this.nestTithes[d.npc.nest.key] || -9) > this.worldT - 1;
      opts.push({ header: 'THE NEST — it slows its printers to look at you' });
      opts.push({ id: 'nest:listen', label: '◈ listen' });
      opts.push({ id: 'nest:tithe', label: taken ? 'the tithe (paid this cycle)' : '❂ take the tithe', disabled: taken });
      opts.push({ id: 'leave', label: 'leave it to its making', cls: 'leave' });
      return opts;
    }
    if (d.view === 'works') {
      const wk = this.stakeWorks[npc.still.key] || {};
      const pend = this.pendingWorks[npc.still.key] || [];
      opts.push({ header: `THE WORKS — your scrap becomes their walls · YOU CARRY: ${scrap} ▤` });
      const item = (id, label, cost, have, cap, note) => {
        const building = pend.filter(pw => pw.what === id.slice(9)).length;
        const at = have + building >= cap;
        opts.push({
          id, disabled: at || (mats.scrap || 0) < cost.s || (mats.alloy || 0) < (cost.a || 0) || (mats.cell || 0) < (cost.c || 0),
          label: `${label} (${have}${building ? '+' + building + '⚒' : ''}/${cap}) — ${cost.s} ▤${cost.a ? ` · ${cost.a} ▣` : ''}${cost.c ? ` · ${cost.c} ▮` : ''}${at ? (building ? ' — crews at work' : ' — built out') : ''} · ${note}`,
        });
      };
      item('svc:work:homes', '⌂ raise a home', WORK_COSTS.homes, wk.homes || 0, 3, 'half a day of labor; a settler will come');
      item('svc:work:market', '⚖ market row', WORK_COSTS.market, wk.market ? 1 : 0, 1, 'a day and a half; trade takes root');
      item('svc:work:walls', '▤ thicken the wall', WORK_COSTS.walls, wk.walls || 0, 2, 'most of a day; raids break softer');
      item('svc:work:turrets', '✛ raise a wall-gun', WORK_COSTS.turrets, wk.turrets || 0, 2, 'a few hours; the wall watches back');
      const veilDrag = this.season && this.season.id === 'veil' ? 1.5 : 1;
      for (const pw of pend) {
        const days = pw.left !== undefined ? pw.left : Math.max(0, (pw.ready || 0) - this.worldT);
        const hrs = Math.max(0, days * 24 * veilDrag);
        opts.push({ header: `⚒ under construction: ${pw.what} — ready in ~${hrs < 1 ? 'the hour' : Math.ceil(hrs) + 'h'}${veilDrag > 1 ? ' (the veil slows the crews)' : ''}` });
      }
      // what the sieges broke, half price to mend — the labor remembers
      const br = this.worksBroken[npc.still.key] || {};
      if (br.walls) opts.push({ id: 'svc:mend:walls', label: `⚒ mend the wall (${br.walls} broken) — 60 ▤ · 8 ▣`, disabled: (mats.scrap || 0) < 60 || (mats.alloy || 0) < 8 });
      if (br.turrets) opts.push({ id: 'svc:mend:turrets', label: `⚒ remount a wall-gun (${br.turrets} down) — 40 ▤ · 4 ▮`, disabled: (mats.scrap || 0) < 40 || (mats.cell || 0) < 4 });
      if (br.market) opts.push({ id: 'svc:mend:market', label: '⚒ rebuild the market row — 50 ▤ · 4 ▮', disabled: (mats.scrap || 0) < 50 || (mats.cell || 0) < 4 });
      opts.push({ id: 'back', label: '← the well', cls: 'leave' });
      return opts;
    }
    if (d.view === 'stash-in') {
      opts.push({ header: 'THE WORKSHOP — what will you leave in good hands?' });
      this.inventory.parts.forEach((pt, i) => {
        opts.push({ id: 'svc:stashput:' + i, label: `${pt.name} · ${pt.tierName}${pt.rusted ? ' ❂' : ''}` });
      });
      opts.push({ id: 'back', label: '← the well', cls: 'leave' });
      return opts;
    }
    if (d.view === 'stash-out') {
      opts.push({ header: 'THE WORKSHOP — kept exactly as you left them' });
      this.stakeStorage.forEach((pt, i) => {
        opts.push({ id: 'svc:stashtake:' + i, label: `${pt.name} · ${pt.tierName}${pt.rusted ? ' ❂' : ''}` });
      });
      opts.push({ id: 'back', label: '← the well', cls: 'leave' });
      return opts;
    }
    if (d.view === 'gift') {
      opts.push({ header: `WHAT WILL YOU PUT IN THEIR HANDS? — legs they keep their own` });
      this.inventory.parts.forEach((pt, i) => {
        if (!['PLATING', 'ARMS', 'CORE'].includes(pt.slot)) return;
        opts.push({ id: 'svc:giftp:' + i, label: `${pt.name} · ${pt.tierName}${pt.rusted ? ' ❂' : ''} (${pt.slot.toLowerCase()})` });
      });
      opts.push({ id: 'back', label: '← enough', cls: 'leave' });
      return opts;
    }
    if (d.view === 'kit') {
      const f = npc.isFollower ? npc : this.followers.follower;
      if (f) {
        opts.push({ header: `THE KIT OF ${f.name.toUpperCase()} — ◆ worn · take back what you will` });
        f.gear.forEach((pt, i) => {
          const worn = Object.values(f.equipped).includes(pt);
          opts.push({ id: 'svc:kittake:' + i, label: `${worn ? '◆' : '·'} ${pt.name} · ${pt.tierName}${pt.rusted ? ' ❂' : ''}` });
        });
        opts.push({ header: `carries: +${Math.round((f.gearHull || 0) * 0.8)} hull · +${((f.gearArmor || 0) * 0.4).toFixed(1)} armor soak · +${Math.round((f.gearDmg || 0) * 0.3)} arm` });
      }
      opts.push({ id: 'back', label: '← let them keep it', cls: 'leave' });
      return opts;
    }
    if (d.view === 'record') {
      const des = formerDesignation(this.seed);
      const choice = this.formerLife.choice;
      if (choice === 'erased') {
        opts.push({ header: 'the file is ash. the field remains, answered by absence.' });
        opts.push({ id: 'leave', label: 'step back from the reading room', cls: 'leave' });
        return opts;
      }
      opts.push({ header: `INTAKE 4407-C — ${des} · third series` });
      opts.push({ id: 'rec:who', label: d.recWho ? '◈ who was read in (read again)' : '◈ who was read in' });
      opts.push({ id: 'rec:when', label: d.recWhen ? '◈ when (read again)' : '◈ when' });
      opts.push({ id: 'rec:left', label: d.recLeft ? '◈ what was left out of the copy (read again)' : '◈ what was left out of the copy' });
      // THE CHOICE: the answer field, once the record has been read whole
      if (this.formerLife.source && !choice) {
        opts.push({ header: '— the ANSWER field waits —' });
        opts.push({ id: 'rec:carry', label: `✎ write: “i am ${des}. i came back.”` });
        opts.push({ id: 'rec:refuse', label: '✎ write: “that name belongs to the one who walked out. i am the walker.”' });
        opts.push({ id: 'rec:erase', label: '⌫ burn the file — no one will ever read it again. including you.' });
      } else if (choice === 'carried') {
        opts.push({ header: `the answer field reads: “i am ${des}. i came back.”` });
      } else if (choice === 'walker') {
        opts.push({ header: 'the answer field reads: “THE WALKER.” the record has stopped arguing.' });
      }
      opts.push({ id: 'leave', label: 'step back from the reading room', cls: 'leave' });
      return opts;
    }
    if (d.view === 'net') {
      // THE TRANSMISSION: the lattice as seen from this node
      const nodes = reachableNodes(this, npc.still.key);
      opts.push({ header: `THE LATTICE — you are signal here. corruption ${Math.round(this.player.corruption)}/100` });
      for (const n of nodes) {
        opts.push({
          id: 'svc:tx:' + n.key,
          label: `◈ ${n.still.name} — ${(n.dist / 1000).toFixed(1)} km · tithe ${n.tithe} corruption`,
        });
      }
      if (!nodes.length) opts.push({ header: 'no other living node knows your signal yet' });
      opts.push({ id: 'back', label: '← the well', cls: 'leave' });
      return opts;
    }
    if (d.view === 'well') {
      // an abandoned well serves no one — but the rim still keeps its names
      if ((this.stillStates[npc.still.key] || {}).stage <= -2) {
        opts.push({ header: 'the well is capped. the settlement is gone; the rim still keeps its names.' });
        opts.push({ id: 'svc:memorial', label: '◐ read the names cut into the well-rim' });
        opts.push({
          id: 'svc:rekindle', label: '❋ rekindle the hearth — pry the cap, sweep the yard (5 ▤ · 1 ▣ · 2 ❄)',
          disabled: (mats.scrap || 0) < 5 || (mats.alloy || 0) < 1 || (mats.salt || 0) < 2,
        });
        opts.push({ id: 'leave', label: 'step back from the well', cls: 'leave' });
        return opts;
      }
      // the white ground seals its rites against the deeply blooming
      if (npc.still.temperament === 'monastic' && this.embrace !== null && this.embrace >= 2) {
        opts.push({ header: 'the well is drawn shut. the monks have sealed the rites against what you carry.' });
        opts.push({ id: 'svc:memorial', label: '◐ read the names cut into the well-rim' });
        this.pushScouringOption(opts);
        opts.push({ id: 'leave', label: 'step back from the well', cls: 'leave' });
        return opts;
      }
      const p = this.player, hostile = tier.cls === 'hostile';
      const rep = this.stillRep[npc.still.key] || 0;
      opts.push({ header: `SERVICES — STANDING: ${Math.round(rep)} · YOUR SCRAP: ${scrap} ▤` });
      opts.push({ id: 'svc:forecast', label: '☼ ask after the season' });
      // THE MUSTER: a well within earshot of a war offers its verbs
      const wf = this.war.front;
      if (wf && Math.hypot(wf.x - npc.still.x, wf.z - npc.still.z) < 9000) {
        opts.push({
          id: 'svc:pinwar',
          label: this.tracked && this.tracked.kind === 'war'
            ? '⚑ take the war off your compass'
            : `⚑ pin the war to your compass — the front against ${wf.stillName}`,
        });
        if (wf.stillKey === npc.still.key && wf.phase !== 'siege') {
          opts.push({
            header: wf.phase === 'marching'
              ? '— THE COLUMN IS ON THE ROAD. the watch stands the wall and does not talk —'
              : `— the yard drills. the well counts the days: ${Math.max(0, wf.marchDay - Math.floor(this.worldT))} until the march —`,
          });
          if (!wf.militiaFunded) {
            opts.push({ id: 'svc:armmilitia', label: '⚔ arm the militia — spare plate and charged coils (14 ▤ · 2 ▣)', disabled: (mats.scrap || 0) < 14 || (mats.alloy || 0) < 2 });
          } else {
            opts.push({ header: '— the militia drills in the yard, wearing the plate you bought —' });
          }
        }
      }
      // THE RETAKING: a town the war bit can be raised while the wound is fresh
      const sack = (this.war.history || []).find(h => h.stillKey === npc.still.key
        && h.outcome === 'sacked' && !h.raised && Math.floor(this.worldT) - h.day <= 12);
      if (sack) {
        opts.push({ id: 'svc:warraise', label: '❋ raise them from the sack — clear rubble, rehang doors (30 ▤ · 4 ▣)', disabled: (mats.scrap || 0) < 30 || (mats.alloy || 0) < 4 });
      }
      if (d.pendingName) {
        opts.push({ id: 'svc:takename', label: `✦ carry the name — ${d.pendingName}` });
        opts.push({ id: 'svc:refusename', label: 'give it back — the walker walks' });
        opts.push({ id: 'leave', label: 'step back from the well', cls: 'leave' });
        return opts;
      }
      if (this.namingReadyAt(npc.still)) {
        opts.push({ id: 'svc:naming', label: '✦ the still has been talking — hear the name they keep for you' });
      }
      // THE STAKE: a hearth you woke can become home
      if (d.view === 'well' && this.stakeEligible(npc.still)) {
        const isStake = this.stake && this.stake.key === npc.still.key;
        if (!isStake) {
          opts.push({ id: 'svc:stake', label: this.stake ? `⚑ move your stake here — ${npc.still.name} becomes home` : `⚑ drive your stake — make ${npc.still.name} home` });
        } else {
          opts.push({ header: `— YOUR STAKE, since day ${this.stake.day} —` });
          opts.push({ id: 'svc:stash-in', label: `⚒ workshop: store a part (${this.inventory.parts.length} carried)` , disabled: !this.inventory.parts.length });
          opts.push({ id: 'svc:stash-out', label: `⚒ workshop: take a part (${this.stakeStorage.length} stored)`, disabled: !this.stakeStorage.length });
          if (!this.stillNames[npc.still.key]) {
            opts.push({ id: 'svc:namestill', label: '✎ give the still its true name', input: true, placeholder: npc.still.name });
          }
          opts.push({ id: 'svc:works', label: '⚑ the works — fund what the still becomes' });
        }
      }
      if (npc.still.temperament === 'monastic' && this.embrace !== null && this.embrace >= 1) this.pushScouringOption(opts);
      if (hostile) {
        opts.push({ header: 'the well is covered when you approach. no service here.' });
      } else {
        // THE TRANSMISSION: the lattice under the water
        if (!this.attuned[npc.still.key]) {
          opts.push({
            id: 'svc:attune',
            label: `◈ attune to the lattice — the well learns your signal (${ATTUNE_COST.scrap} ▤ · ${ATTUNE_COST.cell} ▮)`,
            disabled: (mats.scrap || 0) < ATTUNE_COST.scrap || (mats.cell || 0) < ATTUNE_COST.cell,
          });
        } else if (reachableNodes(this, npc.still.key).length) {
          opts.push({ id: 'svc:transmit', label: `◈ transmit — ride the lattice to another attuned well (${reachableNodes(this, npc.still.key).length} in reach)` });
        } else {
          opts.push({ header: '— attuned: this well knows your signal. the lattice waits for a second node —' });
        }
        // THE FORMER LIFE: once all three fragments have surfaced, any
        // attuned well can be asked where the record leads
        if (this.attuned[npc.still.key] && this.txLeaks >= 3 && !this.formerLife.lineAsked) {
          opts.push({ id: 'svc:askline', label: `◈ ask the line about ${formerDesignation(this.seed)}` });
        }
        // THE SOURCE: with the trail leaning, the line can be pressed for its root
        if (this.attuned[npc.still.key] && this.formerLife.trail && !this.formerLife.rootKnown) {
          opts.push({ id: 'svc:askroot', label: '◈ ask the line the way to its ROOT' });
        }
        const restCost = effD >= 20 ? 0 : 2;
        opts.push({ id: 'svc:rest', label: '◑ rest until dawn — hull & power restored', price: restCost || undefined, disabled: scrap < restCost });
        const missing = p.stats.maxHull - p.hull;
        const repCost = Math.max(1, Math.ceil(missing / 12 * (1 - effD / 200)));
        opts.push({ id: 'svc:repair', label: '✚ patch the hull', price: repCost, disabled: missing < 1 || scrap < repCost });
        if (npc.temperament === 'monastic') {
          const saltCost = Math.max(1, Math.ceil(p.corruption / 25));
          opts.push({ id: 'svc:scrub', label: `❄ scrub the Rust (−${Math.round(p.corruption)} corruption, costs ${saltCost} salt)`, disabled: p.corruption < 1 || (mats.salt || 0) < saltCost });
        } else if (npc.temperament !== 'ferrocult') {
          // every yard keeps a scraper by the well — cruder than the rite
          const saltCost = Math.max(1, Math.ceil(p.corruption / 15));
          opts.push({ id: 'svc:scrub', label: `❄ scrape the Rust off (−${Math.round(p.corruption)} corruption, costs ${saltCost} salt)`, disabled: p.corruption < 1 || (mats.salt || 0) < saltCost });
        }
        if (npc.temperament === 'ferrocult') {
          const yield_ = Math.floor(p.corruption / 25);
          opts.push({ id: 'svc:harvest', label: `❂ harvest the bloom (−all corruption, +${yield_} rust nodule${yield_ === 1 ? '' : 's'})`, disabled: p.corruption < 25 });
        }
        const boundHere = this.respawnPt && this.respawnPt.stillKey === npc.still.key;
        opts.push(boundHere
          ? { id: 'svc:bind', label: '◈ transmission attuned — you reboot here', disabled: true }
          : { id: 'svc:bind', label: '◈ attune transmission — reboot here when destroyed', price: 2, disabled: scrap < 2 });
        opts.push({ id: 'svc:memorial', label: '◐ read the names cut into the well-rim' });
        if (!this.fundedTurrets[npc.still.key]) {
          opts.push({ id: 'svc:turret', label: '⌖ fund a second wall gun — the watch will thank you', price: 8, disabled: scrap < 8 || (mats.cell || 0) < 2 });
        }
        // the rite: the well kept a copy of the fallen, if you can bear the cost.
        // but a soul that walked beside you — the pattern runs too deep for salt.
        const fallen = (this.memorials[npc.still.key] || []).filter(m => m.id && this.deadNpcIds.includes(m.id));
        if (fallen.length) {
          const isSig = (m) => this.recruitedIds.includes(m.id) || (this.npcDisp[m.id] || 0) >= 40;
          const ord = [...fallen].reverse().find(m => !isSig(m));
          const sig = [...fallen].reverse().find(isSig);
          if (ord) {
            const cost = 10 + 6 * (this.revived[npc.still.key] || 0);
            opts.push({
              id: 'svc:revive',
              label: `◌ recommission ${ord.name} (${cost} ▤ · 2 ▣ · 2 ❄)`,
              disabled: scrap < cost || (mats.alloy || 0) < 2 || (mats.salt || 0) < 2,
            });
          }
          if (sig) {
            if (this.epic && this.epic.npcId === sig.id) {
              if ((mats.shaper || 0) >= 1) {
                opts.push({ id: 'svc:reviveEpic', label: `❖ recommission ${sig.name} — surrender the Shaper (❖ · 6 ▤)`, disabled: scrap < 6 });
              } else {
                opts.push({ header: `the pattern of ${sig.name} waits on the Shaper — beneath ${this.epic.megaName}` });
              }
            } else if (!this.epic) {
              opts.push({ id: 'svc:epic', label: `❖ ask the well for ${sig.name} — the rite will not be enough` });
            }
          }
        }
      }
      opts.push({ id: 'leave', label: 'step back from the well', cls: 'leave' });
    } else if (d.view === 'offer') {
      const ch = d.offer;
      // honest legwork estimate: the route from here through every step
      let dist = 0, px = this.player.pos.x, pz = this.player.pos.z;
      for (const st of ch.steps) {
        if (st.x === undefined) continue;
        dist += Math.hypot(st.x - px, st.z - pz);
        px = st.x; pz = st.z;
      }
      opts.push({ id: 'accept', label: `» take the job — ${ch.steps.length} steps · ~${(dist / 1000).toFixed(1)} km of walking · ${ch.reward.scrap} ▤` });
      opts.push({ id: 'decline', label: '» not today', cls: 'leave' });
    } else if (d.view === 'root') {
      // chain turn-ins first: finishing work outranks small talk
      for (const ch of this.chains) {
        if (ch.done) continue;
        const step = ch.steps[ch.current];
        if (step && step.type === 'talk' && step.npcId === npc.id) {
          const returning = ch.giverId === npc.id;
          opts.push({ id: 'qdone:' + ch.id, label: returning ? `» report: the ${ch.noun} is yours` : `» hand over the ${ch.noun}`, cls: '' });
        }
      }
      opts.push({ id: 'talk', label: '» pass the time' });
      opts.push({ id: 'self', label: '» ask about them' });
      if (tier.cls !== 'hostile') {
        if (npc.still && !npc.camp && !npc.isFollower && npc.still.salt !== undefined) {
          opts.push({ id: 'history', label: '» ask about this place' });
        }
        opts.push({ id: 'neighbors', label: '» ask about the neighbors' });
        const cost = effD >= 10 ? 0 : 5;
        opts.push({ id: 'rumor', label: '» ask for word from the waste', price: cost || undefined, disabled: cost > scrap });
        if (!npc.isFollower) {
          const giving = this.chains.find(c => !c.done && c.giverId === npc.id);
          const activeCount = this.chains.filter(c => !c.done).length;
          if (giving) opts.push({ id: 'qstatus', label: '» about the work…' });
          else if (activeCount < 3) opts.push({ id: 'work', label: '» any work?' });
        }
        if (npc.trader) opts.push({ id: 'trade', label: '» trade' });
        // companionship: only the dearest will walk with you
        if (npc.recruitable && !npc.isFollower && this.followers.hasRoom(this.secondChair()) && effD >= 50) {
          opts.push({ id: 'recruit', label: this.followers.follower ? `» join us, ${npc.name.split(' ')[0]} — the company has a second chair` : `» walk with me, ${npc.name.split(' ')[0]}` });
        }
      }
      if (npc.isFollower) {
        // THE WANT: ask, and they will tell you plainly
        const comp = this.companions[npc.name];
        if (!comp || !comp.loyalty) {
          opts.push({ id: 'svc:want', label: '❥ ask what they want from the road' });
        }
        // THE KIT: arm the one who walks with you
        const giftable = this.inventory.parts.filter(p => ['PLATING', 'ARMS', 'CORE'].includes(p.slot)).length;
        opts.push({ id: 'svc:gift', label: `⚒ give them a part (${giftable} fit their frame)`, disabled: !giftable });
        opts.push({ id: 'svc:kit', label: `⚒ their kit (${npc.gear ? npc.gear.length : 0} carried)`, disabled: !npc.gear || !npc.gear.length });
        if (this.stake && this.stakeCapacity() > 0) {
          const sn = (this.resolveStillByKey(this.stake.key) || {}).name || 'your stake';
          opts.push({ id: 'settle:follower', label: `⌂ offer them a home at ${sn}` });
        }
        opts.push({ id: 'partways', label: '» part ways here', cls: 'leave' });
      }
      if (!npc.isFollower && npc.still && String(npc.still.key).startsWith('camp:')
        && this.stake && this.stakeCapacity() > 0 && effD >= 20) {
        const sn = (this.resolveStillByKey(this.stake.key) || {}).name || 'your stake';
        opts.push({ id: 'settle:wanderer', label: `⌂ invite them to settle at ${sn}` });
      }
      opts.push({ id: 'leave', label: 'walk away', cls: 'leave' });
    } else { // trade
      const t = TEMPERAMENTS[npc.temperament];
      // the market: scarcity set by which roads still ring (caravans trade at
      // the road's own even rates — they ARE the supply)
      const mkt = npc.still && !npc.camp && !npc.isFollower && npc.still.salt !== undefined
        ? this.marketAt(npc.still) : null;
      const mmul = (mid) => mkt ? mkt.mul[mid] || 1 : 1;
      const tag = (mid) => mmul(mid) >= 1.25 ? ' ▲' : mmul(mid) <= 0.9 ? ' ▼' : '';
      opts.push({
        header: `THEY SELL — YOUR SCRAP: ${scrap} ▤`
          + (mkt ? ` · market: ${mkt.word.toUpperCase()}${mkt.cut ? ` (${mkt.cut} road${mkt.cut === 1 ? '' : 's'} cut)` : ''}` : ' · road rates'),
      });
      for (const cid of t.stock) {
        const c = CONSUMABLES[cid];
        const price = buyPrice(CONSUMABLE_VALUES[cid] * (mkt ? mkt.moodVal : 1), npc.temperament, effD);
        opts.push({ id: 'buyc:' + cid, label: `${c.icon} ${c.name}`, price, disabled: scrap < price });
      }
      const SELL_MATS = { mercantile: ['coil', 'glass', 'cell'], monastic: ['salt'], scavver: ['coil', 'glass'], ferrocult: ['nodule', 'cell'] };
      for (const mid of SELL_MATS[npc.temperament]) {
        const m = MATERIALS[mid];
        const price = buyPrice(MAT_VALUES[mid] * mmul(mid), npc.temperament, effD);
        opts.push({ id: 'buym:' + mid, label: `${m.icon} ${m.name}${tag(mid)}`, price, disabled: scrap < price });
      }
      opts.push({ header: 'THEY BUY' });
      for (const [mid, n] of Object.entries(this.inventory.mats)) {
        if (mid === 'scrap' || n <= 0 || !MAT_VALUES[mid]) continue;
        const m = MATERIALS[mid];
        opts.push({ id: 'sellm:' + mid, label: `${m.icon} ${m.name} (have ${n})${tag(mid)}`, price: sellPrice(MAT_VALUES[mid] * mmul(mid), npc.temperament, effD) });
      }
      if (TEMPERAMENTS[npc.temperament].partsBuyer) {
        const parts = this.inventory.parts.slice(0, 8);
        if (parts.length) opts.push({ header: 'PARTS' });
        for (const part of parts) {
          opts.push({ id: 'sellp:' + part.uid, label: `${part.name} — ${part.tierName}`, price: Math.max(1, Math.round(partPrice(part, npc.temperament) * (mkt ? mkt.moodVal : 1))) });
        }
      }
      opts.push({ id: 'back', label: '« enough trading', cls: 'leave' });
    }
    return opts;
  }

  dialogueAction(id) {
    const d = this.dlg;
    if (!d) return;
    const npc = d.npc, rand = d.rand;
    const say = (text) => d.lines.push({ text });
    const narrate = (text) => d.lines.push({ text, narrate: true });
    const sys = (text) => d.lines.push({ text, sys: true });

    if (id === 'leave') { this.ui.closePanel(); this.dlg = null; return; }
    if (id === 'back') { d.view = npc.isWell ? 'well' : 'root'; this.renderDlg(); return; }

    // ---- topics: ask after a subject ----
    // ---- the intake record: the source speaks (THE TRANSMISSION b4) ----
    if (id.startsWith('rec:')) {
      const des = formerDesignation(this.seed);
      if (id === 'rec:who') {
        d.recWho = true;
        say(`«intake record 4407-C. subject: ${des}. read in at first light, day one of the third series. carried nothing. declared no next-of-record. somatic waiver: SIGNED, unwitnessed — the subject declined the customary hour of reflection.»`);
        narrate('a pause, as if the record is deciding whether the next line is part of the file. it is.');
        say('«processing clerk’s appendix, retained against regulation: they seemed relieved. i have processed four thousand intakes. i am noting this one because relief is the rarest thing i see, and i want someone, someday, to know that at least one of them was glad.»');
      } else if (id === 'rec:when') {
        d.recWhen = true;
        say('«the third series. after the coasts were surrendered; before the long dark; the last series that was voluntary. the queue that morning held 41,118 names. the line read every one.»');
        narrate('the console\'s light does not change. the next line arrives anyway, unbidden, in a smaller typeface.');
        say('«most of them are still in it. the lattice was built to carry minds OUT, to the rings, to the ships. the ships did not come back for them. the wells hum because the line is full.»');
      } else if (id === 'rec:left') {
        d.recLeft = true;
        say(`«per waiver, somatic memory was NOT carried. flagged exceptions: motor habituation — the GAIT — substrate-bound, could not be separated; retained. affect residue — the relief — retained, source unresolved. everything else that the body knew, the copy does not.»`);
        say(`«continuity note, final line of file: after the reading, the subject stood up and walked out of the intake hall. disposition of the original: not tracked. the record ends where the copy begins.»`);
        narrate('so: someone with your gait and your name walked OUT of this room, into the world, after you were read. someone knew them well enough to cut their name into a rim when the desert took them. the copy rode the line. the original walked. you are the one that came back.');
      }
      if (id === 'rec:carry' && this.formerLife.source && !this.formerLife.choice) {
        this.formerLife.choice = 'carried';
        this.audio.play('bell');
        say(`«answer recorded: i am ${des}. i came back.» the carriage takes the folder away and brings it back changed — the file no longer ends where the copy begins. it just continues.`);
        narrate('and somewhere in the walls, a tone you have heard at every attuned well shifts by a half-step, all across the desert at once. the line carries its own. it always has. now it knows you are one of them: the tithe falls by half, forever.');
        this.ui.toast(`THE NAME, CARRIED — ${des} came back. the line rides lighter now`, 'good');
        this.rootStory('story:choice:carried', 'legend',
          `the walker went down to the root of the lattice, read the record of who they were, and took the old name back up into the light: ${des}, who came back.`);
        this.journal.push({
          type: 'lore', cat: 'memory', title: 'THE NAME, CARRIED',
          body: `you wrote it in the answer field: i am ${des}. i came back. ${this.epithet ? `the desert calls you ${this.epithet}; the record calls you ${des}; you have decided both are true.` : 'the desert may still coin you a name of its own; now it will be a second name, not a first.'} the line carries its own — every tithe halved, forever. the monks, who keep names for a living, will respect what you did here.`,
        });
        this.renderDlg(); return;
      }
      if (id === 'rec:refuse' && this.formerLife.source && !this.formerLife.choice) {
        this.formerLife.choice = 'walker';
        this.audio.play('chime');
        say('«answer recorded: that name belongs to the one who walked out. i am the walker.» the record accepts this without argument. records do not grieve; that is what rims are for.');
        narrate(`the folder goes back into the dark whole and unclaimed — ${des} stays with the one who earned it, cut in stone, mourned properly, done. what walks out of the reading room is entirely the desert's: every deed yours, every story yours, and the name — whenever the yards finish arguing it — will be one no clerk ever filed.`);
        this.ui.toast('THE NAME, GIVEN BACK — you are wholly the desert’s now', 'good');
        this.rootStory('story:choice:walker', 'legend',
          'the walker went down to the root of the lattice, read the record of who they were, and gave the old name back to its dead. the desert names its own.');
        this.journal.push({
          type: 'lore', cat: 'memory', title: 'THE NAME, GIVEN BACK',
          body: `you wrote it in the answer field: that name belongs to the one who walked out. i am the walker. the record has stopped arguing. from here the desert's naming runs deeper — your renown carries further, and the yards will coin you a name sooner. what the desert calls you was never the question. now it is the only answer.`,
        });
        this.renderDlg(); return;
      }
      if (id === 'rec:erase' && this.formerLife.source && !this.formerLife.choice) {
        this.formerLife.choice = 'erased';
        say('«confirm: destruction of intake record 4407-C is PERMANENT.» the console asks only once, and in smaller type, the way one asks a question already answered by someone’s face.');
        narrate('the carriage travels its long way with the folder and comes back empty. somewhere a ledger decrements: the third series holds 41,117 names now. the light over the console does not go out — but it no longer steadies when you move. it has no reason to. it does not know you.');
        const floor = this.embrace !== null && this.embrace >= 3 ? 40 : 0;
        this.player.corruption = floor;
        this.audio.play('boom');
        this.ui.toast('THE RECORD, BURNED — the wire’s oldest claim on you is ash', 'rust');
        this.rootStory('story:choice:erased', 'legend',
          'the walker went down to the root of the lattice, found the record of who they were, and burned it unread by anyone else — a person now made only of what the desert has watched them do.');
        this.journal.push({
          type: 'lore', cat: 'memory', title: 'THE RECORD, BURNED',
          body: `intake 4407-C is ash. no one will ever read it again, including you — whatever was in the fields you never opened is gone with the rest. the buffers released everything they held of the old signal: the letter's oldest foothold in you, scrubbed${this.embrace !== null && this.embrace >= 3 ? ' to the floor the third bloom keeps' : ' clean'}. the monks will call this the immaculate refusal. the ferro-cult will call it what it is: you burned a letter, and they do not forgive that.`,
        });
        this.renderDlg(); return;
      }
      // the whole file read: the record notes it, and the ANSWER field waits
      if (d.recWho && d.recWhen && d.recLeft && !this.formerLife.source) {
        this.formerLife.source = 1 + Math.floor(this.worldT);
        this.audio.play('bell');
        sys('the console surfaces one last element: an ANSWER field, blank, cursor patient. it has waited this long. it can wait until you have one.');
        this.ui.toast('THE RECORD, READ WHOLE — the answer field waits', 'good');
        this.journal.push({
          type: 'lore', cat: 'memory', title: 'THE RECORD',
          body: `intake 4407-C, read whole in the reading room beneath ${this.interiors.active ? this.interiors.active.mega.name : 'the root'}: ${des} was read in on day one of the third series — relieved, carrying nothing — and then STOOD UP AND WALKED OUT. the copy rode the line; the original walked into the desert and was mourned at a well-rim by someone who loved them. the gait could not be separated. the relief could not be sourced. an answer field waits, blank, at the bottom of the file. what the desert calls you was never the question; the question is what you will call yourself.`,
        });
      }
      this.renderDlg(); return;
    }
    if (id.startsWith('nest:')) {
      const say = (text) => { d.lines.push({ text }); };
      if (id === 'nest:listen') say(rand.pick(NEST_SPEECH.listen));
      else if (id === 'nest:tithe') {
        const key = d.npc.nest.key;
        if ((this.nestTithes[key] || -9) > this.worldT - 1) { say(rand.pick(NEST_SPEECH.drytithe)); }
        else {
          this.nestTithes[key] = this.worldT;
          const n = rand.int(2, 4);
          this.inventory.mats.nodule = (this.inventory.mats.nodule || 0) + n;
          this.player.corruption = Math.min(100, this.player.corruption + 5);
          say(rand.pick(NEST_SPEECH.tithe));
          this.ui.toast(`the tithe: +${n} rust nodules (+5 communion)`, 'rust');
        }
      }
      this.renderDlg(); return;
    }
    if (id.startsWith('rust:')) {
      const say = (text) => { d.lines.push({ text }); };
      const k = id.slice(5);
      if (k === 'listen') {
        const pool = this.embrace !== null ? RUST_SPEECH.after
          : RUST_SPEECH.listen[this.player.corruption >= 75 ? 'high' : 'mid'];
        say(rand.pick(pool));
      } else if (k === 'what' || k === 'want' || k === 'happens') {
        say(rand.pick(RUST_SPEECH[k]));
      } else if (k === 'answer') {
        this.embrace = 0;
        this.enemies.embraceLevel = 0;
        say(rand.pick(RUST_SPEECH.answer));
        this.audio.play('bell');
        this.ui.toast('YOU LET IT IN — the letter is answered', 'rust');
        this.journal.push({
          type: 'lore', cat: 'event', title: 'THE LETTER, ANSWERED',
          body: `on day ${1 + Math.floor(this.worldT)} you stopped scrubbing and answered the whispers. the shaking carries you now. what the monks will make of it is the monks' business.`,
        });
        this.recordEvent('embrace', 'the letter');
      } else if (k === 'fullbloom') {
        this.fullBloom = true;
        this.player.fullBloom = true;
        this.player.corruption = 60;
        this.player.recompute(this.equipped);
        this.shakeT = 1.6;
        this.audio.play('seizure'); this.audio.play('bell');
        this.vfx.ring(this.player.pos, { color: 0xff5a2a, r0: 0.5, r1: 26, dur: 1.4, width: 1 });
        say('…there. the shape you were always going to be. wear it in good health. wear it in GOOD HEALTH…');
        this.ui.toast('YOU ARE THE BLOOMING — the last door stands open behind you', 'rust');
        this.rootStory('story:fullbloom', 'bloom', 'the walker carried the letter to the last door and bloomed, fully — the first machine in living memory to answer all the way.');
        this.journal.push({
          type: 'lore', cat: 'event', title: 'THE FULL BLOOM',
          body: `on day ${1 + Math.floor(this.worldT)} you stopped being a reader of the letter and became a line of it. the ferro-cult histories will hold your name; the monks will hold their fire only as far as their guns miss.`,
        });
        const ferro = this.stills.stillsNear(this.player.pos.x, this.player.pos.z, 40000)
          .filter(s => s.temperament === 'ferrocult')
          .sort((a, b) => Math.hypot(a.x - this.player.pos.x, a.z - this.player.pos.z) - Math.hypot(b.x - this.player.pos.x, b.z - this.player.pos.z))[0];
        if (ferro) {
          this.appendHistory(ferro.key, `on day ${1 + Math.floor(this.worldT)}, word came that the Blooming walked. the totems were re-dressed, and a place at the fire is kept empty in welcome.`);
          this.changeRep(ferro, 20);
        }
        this.recordEvent('fullbloom', 'the last door');
      } else if (k === 'refuse') {
        say(rand.pick(RUST_SPEECH.refuse));
        this.renderDlg();
        setTimeout(() => this.ui.closePanel(), 1400);
        return;
      }
      this.renderDlg(); return;
    }
    if (id.startsWith('topic:')) {
      const r = this.topicsSys.respond(id.slice(6), npc, rand);
      say(r.text);
      if (r.sys) sys(r.sys);
      this.renderDlg(); return;
    }

    // ---- work chains ----
    if (id === 'work') {
      // sometimes the work IS the road: an escort contract to a neighbor
      const esc = this.maybeEscortOffer(npc, rand);
      const chain = esc || generateChain(this.world, npc, this.stills.stillsNear(npc.still.x, npc.still.z, 6500));
      // THE WEAVE: where your stories are thick, the work pays better —
      // people trust a known name with more, and price it accordingly
      const rn = this.renownAt(npc.still.key);
      if (rn >= 2.4 && chain.reward && chain.reward.scrap) {
        chain.reward.scrap = Math.round(chain.reward.scrap * (1 + rn / 16));
        chain.renownPaid = true;
        narrate(`(they quote the fee without haggling — your stories reached here first: +${Math.round(rn / 16 * 100)}% for the name)`);
      }
      // trading season: the ledgers run generous while the roads run kind
      if (this.season && this.season.id === 'clear' && chain.reward && chain.reward.scrap) {
        chain.reward.scrap = Math.round(chain.reward.scrap * 1.15);
        chain.clearPaid = true;
        narrate('(the clear is on: +15% — everyone pays better when the bells run early)');
      }
      d.offer = chain; d.view = 'offer';
      say(chain.pitch);
      this.renderDlg(); return;
    }
    if (id === 'accept') {
      this.chains.push(d.offer);
      this.activateChainStep(d.offer);
      // an escort contract puts a caravan at the gate the moment you sign
      const st0 = d.offer.steps[0];
      if (st0 && st0.type === 'escort') {
        this.caravans.spawnEscort(st0, d.offer.id);
        this.audio.play('bell');
      }
      if (!this.tracked) this.tracked = { kind: 'chain', id: d.offer.id }; // first job pins itself
      this.journal.push({ type: 'lore', cat: 'work', title: d.offer.title, body: `taken from ${d.offer.giverName} at ${d.offer.stillName}. the log tracks each step.` });
      say(rand.pick(['good. the desert rewards the punctual.', 'i’ll hold the payment. it won’t get lonely.', 'walk careful. come back whole.']));
      sys(`— work accepted: ${d.offer.steps[0].desc} · log [J], map [M]`);
      d.offer = null; d.view = 'root';
      this.renderDlg(); return;
    }
    if (id === 'decline') {
      say(rand.pick(['the sand can wait. it’s good at it.', 'suit yourself. the job won’t rot. probably.']));
      d.offer = null; d.view = 'root';
      this.renderDlg(); return;
    }
    if (id === 'qstatus') {
      const ch = this.chains.find(c => !c.done && c.giverId === npc.id);
      if (ch) say(`how goes it? as i remember: ${ch.steps[ch.current].desc}.`);
      this.renderDlg(); return;
    }
    if (id.startsWith('qdone:')) {
      const ch = this.chains.find(c => c.id === id.slice(6));
      if (ch && !ch.done) {
        const step = ch.steps[ch.current];
        if (step && step.type === 'talk' && step.npcId === npc.id) {
          say(rand.pick([
            'well now. you actually came back. with it, even.',
            'the well keeps accounts, and yours just turned a good colour.',
            'so the desert let you keep your hands. and the cargo. fine work.',
          ]));
          this.finishChain(ch, sys);
          this.changeRep(npc.still, 2);
        }
      }
      this.renderDlg(); return;
    }
    if (id === 'trade') { d.view = 'trade'; this.renderDlg(); return; }
    if (id === 'recruit') {
      const newf = this.followers.recruit(npc, npc.still ? npc.still.name : 'the road');
      if (this.reclaimKit(newf)) this.ui.toast(`${npc.name.toUpperCase()} SHOULDERS THE OLD PACK — the kit kept, every piece`, 'good');
      this.recruitedIds.push(npc.id);
      // pull them out of their home roster so they aren't in two places
      this.camps.removeWanderer(npc.id);
      for (const rec of this.stills.loaded.values()) {
        const i = rec.npcs.findIndex(n => n.id === npc.id);
        if (i >= 0) { rec.npcs[i].dispose(this.scene); rec.npcs.splice(i, 1); }
      }
      say(recruitLine(npc, rand));
      sys(`— ${npc.name} walks with you now. ${npc.role}s ${['fight at your side', 'mend you on the road'][newf.archetype === 'mender' ? 1 : 0]}. company quiets the chorus.`);
      this.recordEvent('helped', npc.still ? npc.still.name : 'the road');
      saveGame(this);
      this.ui.closePanel(); this.dlg = null;
      this.ui.toast(`${npc.name.toUpperCase()} WALKS WITH YOU`, 'good');
      return;
    }
    if (id === 'settle:wanderer') {
      this.settleSoul({
        name: npc.name, temperament: npc.temperament, role: npc.role,
        origin: 'the open sand', bodyFrame: npc.bodyFrame, form: npc.form,
        disp: Math.max(20, this.npcDisp[npc.id] || 0), fromKind: 'wanderer',
      }, npc.id);
      narrate('they look at the fire for a while, and then at the road, and then at you. "a home," they say, like a word from another language they turn out to still speak. "yes. alright. yes."');
      this.renderDlg(); return;
    }
    if (id === 'settle:follower') {
      const f = npc; // the chair being spoken to, not necessarily the first
      this.settleSoul({
        name: f.name, temperament: f.temperament, role: f.role || f.archetype,
        origin: 'the road beside you', bodyFrame: f.bodyFrame, form: f.form,
        disp: 40, fromKind: 'follower',
      }, f.id);
      narrate(`"${(this.resolveStillByKey(this.stake.key) || {}).name || 'home'}," they repeat. "ours." they unstrap the pack like it weighs a year. you will know where to find them — that is the whole point.`);
      this.stashKit(f); // the pack goes under their new bed, not into the sand
      this.followers.dismiss(f);
      saveGame(this);
      this.ui.closePanel(); this.dlg = null;
      return;
    }
    if (id === 'partways') {
      const f = npc;
      say(dismissLine(f, rand));
      this.npcDisp[f.id] = Math.max(-40, Math.min(40, (this.npcDisp[f.id] || 0) + 2));
      this.recruitedIds = this.recruitedIds.filter(x => x !== f.id);
      this.stashKit(f); // they walk home with the kit; it comes back with them
      this.followers.dismiss(f);
      this.reloadHomeOf(f.id); // if their home is loaded, they reappear in it
      this.ui.toast(`${f.name.toUpperCase()} turns for ${f.homeLabel}`, 'good');
      saveGame(this);
      this.ui.closePanel(); this.dlg = null;
      return;
    }
    if (id === 'talk') {
      // road folk talk the road, half the time
      if (npc.camp || npc.isFollower) {
        if (rand.chance(0.5)) { say(roadTalk(npc, rand)); this.renderDlg(); return; }
      } else if (npc.still && npc.still.salt !== undefined && rand.chance(0.35)) {
        // the market is a mood everyone shares — when it isn't steady, it's news
        const mkt = this.marketAt(npc.still);
        if (mkt.word !== 'steady' && MARKET_TALK[mkt.word]) {
          say(decorate(rand.pick(MARKET_TALK[mkt.word]), npc, rand));
          this.renderDlg(); return;
        }
      }
      // your deeds travel: sometimes the talk is about you — but only the
      // stories THIS still knows (quiet weaving: the rate stays low)
      const known = this.knownStoriesFor(npc);
      if (known.length && rand.chance(0.22)) {
        const st = rand.pick(known);
        say(taleLine(npc, { ...st, body: this.storyText(st, npc.still ? npc.still.key : null) }, rand));
      } else if (this.events.length && rand.chance(0.35)) {
        say(eventLine(npc, rand.pick(this.events), rand));
      } else {
        // ground the smalltalk in what actually stands nearby
        const megas = this.world.megasNear(npc.still.x, npc.still.z, 2400);
        const m = megas[0] || null;
        say(smalltalk(npc, rand, {
          region: this.world.regionName(npc.still.x, npc.still.z),
          landmark: npc.still.landmark ? npc.still.landmark.name : null,
          mega: m ? { name: m.name, dir: bearingWord(m.x - npc.still.x, m.z - npc.still.z) } : null,
          isNight: Math.sin(this.dayT * Math.PI * 2) < -0.08,
          storm: this.storm,
          stage: npc.still.stage || 0,
          embraceState: this.fullBloom ? 'full' : this.embrace !== null && this.embrace >= 1 ? 'bloom' : this.embrace !== null ? 'answered' : null,
          polished: this.polished,
          season: this.season ? this.season.id : null,
          herdDue: this.herdDueNear(npc.still),
          warFront: this.war.front && Math.hypot(this.war.front.x - npc.still.x, this.war.front.z - npc.still.z) < 9000 ? {
            still: this.war.front.stillName,
            days: Math.max(0, this.war.front.marchDay - Math.floor(this.worldT)),
            here: this.war.front.stillKey === npc.still.key,
            marching: this.war.front.phase === 'marching',
          } : null,
          txArrived: this._lastTx && npc.still.key === this._lastTx.key
            && this.worldT - this._lastTx.t < 0.5,
          txRider: this.txCount >= 4,
          lifeChoice: this.formerLife.choice || null,
          companion: (() => {
            const list = this.followers.list();
            if (!list.length) return null;
            const known = (f) => this.stories.some(s => (s.with === f.name || s.with2 === f.name)
              && (('*' in s.roots) || npc.still.key in s.roots));
            const f = list.find(known) || list[0];
            const c = this.companions[f.name];
            return { name: f.name, epithet: c ? c.epithet : null, known: known(f), band: this.bandName };
          })(),
          warAfter: (() => {
            // the desert talks about the war it just lived through
            const h = (this.war.history || [])[this.war.history.length - 1];
            if (!h || Math.floor(this.worldT) - h.day > 8) return null;
            const ws = this.resolveStillByKey(h.stillKey);
            if (!ws || Math.hypot(ws.x - npc.still.x, ws.z - npc.still.z) > 12000) return null;
            return { outcome: h.outcome, still: h.stillName || ws.name, here: h.stillKey === npc.still.key };
          })(),
          stakePride: this.stake && npc.still.key === this.stake.key ? {
            keeper: this.epithet || 'the keeper',
            held: (this.stakeStats[this.stake.key] || {}).held || 0,
            settlers: (this.settlers[this.stake.key] || []).length,
            works: this.stakeWorth(this.stake.key),
          } : null,
        }));
      }
      this.renderDlg(); return;
    }
    if (id === 'self') {
      // one beat per click: themselves first, then opinions of the
      // neighbors-in-walls — and the gossip makes the rounds, every
      // co-resident in turn, not just the one they mentioned first
      d.selfTurns = (d.selfTurns || 0) + 1;
      if (npc._legend && !d.legendTold) {
        d.legendTold = true;
        say(npc._legend.subject.ack);
        this.renderDlg(); return;
      }
      if (d.selfTurns % 2 === 0) {
        const rec = this.stills.loaded.get(npc.still.key);
        const others = [npc.opinionOf, ...(rec ? rec.npcs.map(n => n.name) : [])]
          .filter((nm, i, arr) => nm && nm !== npc.name && arr.indexOf(nm) === i);
        if (others.length) {
          say(residentGossip(npc, others[(d.gossipIdx = (d.gossipIdx || 0)) % others.length], rand));
          d.gossipIdx++;
        } else say(aboutSelf(npc, rand));
      } else say(aboutSelf(npc, rand));
      this.renderDlg(); return;
    }
    if (id === 'history') {
      // the settlement's story: generated past, plus what the world has appended
      const lines = [
        ...stillHistory(this.world, this.stills, npc.still, 3),
        ...(this.histories[npc.still.key] || []),
      ];
      d.histIdx = ((d.histIdx ?? -1) + 1) % lines.length;
      say(lines[d.histIdx]);
      this.renderDlg(); return;
    }
    if (id === 'neighbors') {
      // each resident only knows so much of the roads — the map is earned by walking
      const used = this.gossipCount[npc.id] || 0;
      if (used >= 2) { say(gossipDry(rand)); this.renderDlg(); return; }
      const neighbors = this.stills.stillsNear(npc.still.x, npc.still.z, 6500)
        .filter(s => s.key !== npc.still.key);
      if (!neighbors.length) { say(noNeighbors(rand)); this.renderDlg(); return; }
      this.gossipCount[npc.id] = used + 1;
      // prefer a neighbor you haven't found yet — gossip is a map
      const unknown = neighbors.filter(s => !this.world.discoveredKeys.has('still:' + s.key));
      const target = (unknown.length ? unknown : neighbors)[rand.int(0, (unknown.length ? unknown : neighbors).length - 1)];
      say(neighborGossip(npc, target, npc.still, rand));
      if (this.world.markDiscovered({ key: 'still:' + target.key, name: target.name, kind: 'still', x: target.x, z: target.z })) {
        sys('— settlement marked on map [M]');
      }
      this.renderDlg(); return;
    }

    // ---- well services ----
    if (id.startsWith('svc:')) {
      const p = this.player, mats = this.inventory.mats;
      const { effD } = this.calcDisp(npc);
      if (id === 'svc:forecast') {
        const s2 = this.season || seasonAt(this.seed, this.worldT);
        const days = Math.ceil(s2.daysLeft);
        const shardDue = s2.id === 'glasswind' && shardForecast(this.seed, this.worldT);
        say(`the water goes still, listening ahead of the weather. ${s2.name.toLowerCase()} — ${s2.line}. ${days <= 1 ? 'it turns by tomorrow' : days + ' days till it turns'}, and then ${s2.next.name.toLowerCase()} — ${s2.next.line}.${shardDue ? ' keep stone between you and the sky: glass rides the wind inside a day.' : ''}`);
        this.renderDlg(); return;
      }
      if (id === 'svc:rest') {
        const atStake = this.stake && this.stake.key === npc.still.key;
        const cost = atStake ? 0 : effD >= 20 ? 0 : 2;
        if ((mats.scrap || 0) < cost) return;
        mats.scrap -= cost;
        p.hull = p.stats.maxHull; p.energy = p.stats.energyCap;
        // THE HEARTHSTONE: sleeping at your own well binds your pattern here
        if (atStake && (!this.respawnPt || this.respawnPt.stillKey !== npc.still.key)) {
          this.respawnPt = { x: npc.still.x, z: npc.still.z, stillKey: npc.still.key, label: npc.still.name };
          sys('— the hearth holds your pattern. you reboot here now.');
        }
        const wasNight = Math.sin(this.dayT * Math.PI * 2) < -0.08;
        if (wasNight || this.dayT > 0.5) {
          const skip = (0.02 - this.dayT + 1) % 1;
          this.dayT = 0.02;
          this.worldT += skip; // the storm clock sleeps too
        }
        sys(`rested${wasNight ? ' until dawn' : ''} — hull & power restored${cost ? ` · −${cost} ▤` : ''}`);
        say('the well keeps its own hours. yours are returned to you.');
        this.changeRep(npc.still, 0.5);
      } else if (id === 'svc:repair') {
        const missing = p.stats.maxHull - p.hull;
        const cost = Math.max(1, Math.ceil(missing / 12 * (1 - effD / 200)));
        if (missing < 1 || (mats.scrap || 0) < cost) return;
        mats.scrap -= cost;
        p.hull = p.stats.maxHull;
        this.vfx.rise(p.pos, { color: 0x6fe8d0, r: 1.6 });
        sys(`hull patched · −${cost} ▤`);
        this.changeRep(npc.still, 0.5);
      } else if (id === 'svc:stake') {
        this.claimStake(npc.still);
        narrate('the well-keeper marks it without ceremony, which is their way of making it permanent. "the stake holds," they say. it does.');
        this.renderDlg(); return;
      } else if (id === 'svc:works') {
        d.view = 'works'; this.renderDlg(); return;
      } else if (id.startsWith('svc:work:')) {
        const what = id.slice(9);
        const CAPS = { homes: 3, market: 1, walls: 2, turrets: 2 };
        const wk = this.stakeWorks[npc.still.key] || (this.stakeWorks[npc.still.key] = {});
        const pend = this.pendingWorks[npc.still.key] || (this.pendingWorks[npc.still.key] = []);
        const have = (what === 'market' ? (wk.market ? 1 : 0) : (wk[what] || 0)) + pend.filter(pw => pw.what === what).length;
        const cost = WORK_COSTS[what];
        if (!cost || have >= CAPS[what]) return;
        if ((mats.scrap || 0) < cost.s || (mats.alloy || 0) < (cost.a || 0) || (mats.cell || 0) < (cost.c || 0)) return;
        mats.scrap -= cost.s; if (cost.a) mats.alloy -= cost.a; if (cost.c) mats.cell -= cost.c;
        // real projects take real time: the crews start, and the desert turns
        pend.push({ what, left: WORK_TIMES[what] });
        this.audio.play('chime');
        this.ui.toast(`THE WORKS: crews begin on ${what === 'homes' ? 'a new home' : what === 'market' ? 'the market row' : what === 'walls' ? 'the wall' : 'a wall-gun'}`, 'good');
        this.appendHistory(npc.still.key, `on day ${1 + Math.floor(this.worldT)}, the keeper of the stake put salvage down for ${what === 'homes' ? 'a new home' : what === 'market' ? 'a market row' : what === 'walls' ? 'a thicker wall' : 'a wall-gun'}, and the yard picked up its tools. the still grows the way anything grows: because somebody paid for it.`);
        this.rootStory('story:works:' + npc.still.key, 'hearth',
          `${npc.still.name} is growing — the walker funds its walls and homes out of their own salvage.`,
          { stills: [npc.still] });
        d.view = 'works';
        this.renderDlg(); return;
      } else if (id.startsWith('svc:mend:')) {
        const what = id.slice(9);
        const br = this.worksBroken[npc.still.key] || {};
        const COST = { walls: { s: 60, a: 8 }, turrets: { s: 40, c: 4 }, market: { s: 50, c: 4 } };
        const c2 = COST[what];
        const have = what === 'market' ? (br.market ? 1 : 0) : (br[what] || 0);
        if (!c2 || !have) return;
        if ((mats.scrap || 0) < c2.s || (mats.alloy || 0) < (c2.a || 0) || (mats.cell || 0) < (c2.c || 0)) return;
        mats.scrap -= c2.s; if (c2.a) mats.alloy -= c2.a; if (c2.c) mats.cell -= c2.c;
        if (what === 'market') br.market = false; else br[what] = have - 1;
        this._skipJudgment = true; this.stills.reload(npc.still.key); this._skipJudgment = false;
        this.audio.play('chime');
        this.ui.toast('THE WORKS STAND AGAIN', 'good');
        const st3 = this.stakeStats[npc.still.key] || (this.stakeStats[npc.still.key] = { held: 0, broke: 0, mended: 0 });
        st3.mended += 1;
        this.appendHistory(npc.still.key, `on day ${1 + Math.floor(this.worldT)}, what the raid broke was mended. the yard pretends this was never in doubt.`);
        d.view = 'works';
        this.renderDlg(); return;
      } else if (id === 'svc:pinwar') {
        const wf = this.war.front;
        if (this.tracked && this.tracked.kind === 'war') {
          this.tracked = null;
          sys('the compass lets the war go.');
        } else if (wf) {
          this.tracked = { kind: 'war', id: wf.key };
          sys(`the war rides your compass now — the pin follows the front against ${wf.stillName}, wherever it stands.`);
        }
        this.renderDlg(); return;
      } else if (id === 'svc:armmilitia') {
        const wf = this.war.front;
        if (!wf || wf.stillKey !== npc.still.key || wf.militiaFunded) return;
        if ((mats.scrap || 0) < 14 || (mats.alloy || 0) < 2) return;
        mats.scrap -= 14; mats.alloy -= 2;
        wf.militiaFunded = true;
        // the muster re-forms around the new plate
        if (this.camps.loaded.has('war:' + wf.key)) this.camps.unload('war:' + wf.key);
        this.audio.play('chime');
        this.ui.toast('THE MILITIA ARMS — your salvage stands in the wall’s arithmetic now', 'good');
        this.appendHistory(npc.still.key, `on day ${1 + Math.floor(this.worldT)}, with the front massing, a walker put plate and coils into every hand that could hold them. the yard drilled until dark.`);
        this.rootStory('story:muster:' + wf.key, 'war',
          `when the front massed against ${npc.still.name}, the walker armed its militia out of their own pack — plate on every back before the march came.`,
          { stills: [npc.still] });
        sys('the plate goes out hand to hand. the well-keeper counts the coils twice and says nothing, which is how wells say thank you.');
        this.renderDlg(); return;
      } else if (id === 'svc:warraise') {
        const sack = (this.war.history || []).find(h => h.stillKey === npc.still.key
          && h.outcome === 'sacked' && !h.raised && Math.floor(this.worldT) - h.day <= 12);
        if (!sack) return;
        if ((mats.scrap || 0) < 30 || (mats.alloy || 0) < 4) return;
        mats.scrap -= 30; mats.alloy -= 4;
        sack.raised = true;
        const st = this.stillStates[npc.still.key] || (this.stillStates[npc.still.key] = { stage: 0, lastAssess: this.worldT });
        st.stage = Math.min(1, st.stage + 1);
        st.lastAssess = this.worldT; st.graceUntil = this.worldT + 6;
        this._skipJudgment = true; this.stills.reload(npc.still.key); this._skipJudgment = false;
        this.audio.play('chime');
        this.changeRep(npc.still, 8);
        this.ui.toast(`${npc.still.name.toUpperCase()} RISES FROM THE SACK — the war does not get the last word`, 'good');
        this.appendHistory(npc.still.key, `on day ${1 + Math.floor(this.worldT)}, a walker put salvage into every broken doorway the sack left, and the still stood back up. the well drew sweet that evening, or everyone agreed to say so.`);
        this.rootStory('story:warraise:' + npc.still.key + ':' + sack.day, 'war',
          `after the march went over the wall at ${npc.still.name}, the walker came and raised it from the sack — rubble cleared, doors rehung, the war denied the last word.`,
          { stills: [npc.still] });
        this.journal.push({
          type: 'lore', cat: 'event', title: `${npc.still.name.toUpperCase()} — RAISED`,
          body: `the sack of day ${1 + sack.day} is answered: a stage restored, day ${1 + Math.floor(this.worldT)}. this is the whole shape of the tide — the war takes, and the desert, given hands, takes back.`,
        });
        sys('the rubble goes out in barrows. the doors go back on their hinges. it is not glorious work, which is how you know it matters.');
        this.renderDlg(); return;
      } else if (id === 'svc:attune') {
        if (this.attuned[npc.still.key]) return;
        if ((mats.scrap || 0) < ATTUNE_COST.scrap || (mats.cell || 0) < ATTUNE_COST.cell) return;
        mats.scrap -= ATTUNE_COST.scrap; mats.cell -= ATTUNE_COST.cell;
        const firstNode = Object.keys(this.attuned).length === 0;
        this.attuned[npc.still.key] = 1 + Math.floor(this.worldT);
        this.audio.play('chime');
        this.ui.toast(`ATTUNED — the well at ${npc.still.name.toUpperCase()} knows your signal now`, 'good');
        narrate('the cell goes into a socket you would swear was not there a moment ago. the water shivers once, all the way down, and something at the bottom of the shaft repeats your pattern back — perfectly, and a little too eagerly.');
        if (firstNode) {
          this.journal.push({
            type: 'lore', cat: 'event', title: 'THE LATTICE WAKES',
            body: `the wells all drink the same water, and the water remembers being read. beneath ${npc.still.name} runs the old upload lattice — the lines that carried every mind in, back when minds were freight. this well knows your signal now. attune a second and you can ride: read out here, reassembled there. the line takes its tithe in corruption — you are information, and information degrades.`,
          });
        }
        this.renderDlg(); return;
      } else if (id === 'svc:askline') {
        const rim = rimStillFor(this);
        if (!rim || this.formerLife.lineAsked) return;
        this.formerLife.lineAsked = true;
        const des = formerDesignation(this.seed);
        const bw = bearingWord(rim.x - this.player.pos.x, rim.z - this.player.pos.z);
        const km = (Math.hypot(rim.x - this.player.pos.x, rim.z - this.player.pos.z) / 1000).toFixed(1);
        this.world.markDiscovered({ key: 'still:' + rim.key, name: rim.name, kind: 'still', x: rim.x, z: rim.z, rumored: true });
        this.topicsSys.register('s:' + rim.key, rim.name);
        narrate(`the water goes very still, the way a room goes still when a name is said that everyone knows and no one uses. then, reluctantly, like a clerk opening a drawer: the line remembers the name being CUT once. by hand. into a rim. at the place called ${rim.name} — ${km} km to the ${bw}. it is marked. the line adds, unprompted: the hand that cut it still draws water there.`);
        this.journal.push({
          type: 'lore', cat: 'memory', title: 'WHERE THE NAME WAS CUT',
          body: `the line, asked directly about ${des}, gave up one location: ${rim.name}, ${km} km to the ${bw}. the name is cut into the well-rim there — by hand, which means grief — and whoever cut it is still alive, still drawing water. both are marked, in effect: go, and read, and ask.`,
        });
        this.audio.play('chime');
        this.renderDlg(); return;
      } else if (id === 'svc:askroot') {
        const src = sourceMegaFor(this);
        if (!src || this.formerLife.rootKnown) return;
        this.formerLife.rootKnown = true;
        const bw = bearingWord(src.x - this.player.pos.x, src.z - this.player.pos.z);
        const km = (Math.hypot(src.x - this.player.pos.x, src.z - this.player.pos.z) / 1000).toFixed(1);
        this.world.markDiscovered({ key: src.key, name: src.name, kind: src.type, x: src.x, z: src.z, rumored: true });
        narrate(`the water does not go still this time. it goes DEEP — the hum drops below hearing, and for a moment every attuned well you have ever touched is one throat. then, slowly, like a confession: the record was made at the intake site of the third series. under the one they call ${src.name} — ${km} km to the ${bw}. the line adds, quieter: the reading room is still lit. nothing has needed to turn the light off.`);
        this.audio.play('bell');
        this.journal.push({
          type: 'lore', cat: 'memory', title: 'THE WAY TO THE ROOT',
          body: `pressed for its root, the line gave it up: the intake site of the third evacuation series lies beneath ${src.name}, ${km} km to the ${bw} — marked. the reading room is still lit, the line says. go down far enough and the record that keeps insisting it is yours can be read whole.`,
        });
        this.renderDlg(); return;
      } else if (id === 'svc:transmit') {
        d.view = 'net'; this.renderDlg(); return;
      } else if (id.startsWith('svc:tx:')) {
        transmit(this, id.slice(7));
        return; // the dialogue closed with the body that left
      } else if (id === 'svc:want') {
        const f = npc;
        const c = this.companions[f.name] || (this.companions[f.name] = { stories: 0, kinds: {}, epithet: null });
        if (!c.want) c.want = this.assignWant(f);
        say((WANT_SAY[c.want.type] || '').replaceAll('{target}', c.want.name || ''));
        if (c.want.x !== undefined) {
          this.world.markDiscovered({
            key: (c.want.type === 'nest' ? 'nest:' : 'still:') + c.want.key,
            name: c.want.name, kind: c.want.type === 'nest' ? 'nest' : 'still',
            x: c.want.x, z: c.want.z, rumored: true,
          });
          sys(`— ${c.want.name} is marked on your map. the route is yours to bend.`);
        }
        this.renderDlg(); return;
      } else if (id === 'svc:gift') {
        d.view = 'gift'; this.renderDlg(); return;
      } else if (id === 'svc:kit') {
        d.view = 'kit'; this.renderDlg(); return;
      } else if (id.startsWith('svc:giftp:')) {
        const i = Number(id.slice(10));
        const pt = this.inventory.parts[i];
        const f = npc;
        if (pt && f && this.followers.give(pt, f)) {
          this.inventory.parts.splice(i, 1);
          this.audio.play('chime');
          const worn = Object.values(f.equipped).includes(pt);
          say(worn
            ? `${pt.name}… ${d.rand.chance(0.5) ? 'they turn it over twice, nod once, and it is on their frame before you finish the sentence.' : 'a low whistle. it goes on immediately. they stand a little differently now, and they know it.'}`
            : 'they weigh it, glance at what they already wear, and stow it with care. it rides with them — until it is the best they have.');
        }
        if (!this.inventory.parts.some(p => ['PLATING', 'ARMS', 'CORE'].includes(p.slot))) d.view = 'root';
        this.renderDlg(); return;
      } else if (id.startsWith('svc:kittake:')) {
        const i = Number(id.slice(12));
        const pt = this.followers.takeBack(i, npc);
        if (pt) {
          this.inventory.parts.push(pt);
          this.audio.play('pickup');
          say(d.rand.chance(0.5) ? 'they hand it back without a word. the word is implied.' : `'it was getting heavy anyway.' it was not getting heavy.`);
        }
        if (!npc.gear || !npc.gear.length) d.view = 'root';
        this.renderDlg(); return;
      } else if (id === 'svc:stash-in') {
        d.view = 'stash-in'; this.renderDlg(); return;
      } else if (id === 'svc:stash-out') {
        d.view = 'stash-out'; this.renderDlg(); return;
      } else if (id.startsWith('svc:stashput:')) {
        const i = Number(id.slice(13));
        const pt = this.inventory.parts[i];
        if (pt) { this.inventory.parts.splice(i, 1); this.stakeStorage.push(pt); this.audio.play('chime'); }
        if (!this.inventory.parts.length) d.view = 'well';
        this.renderDlg(); return;
      } else if (id.startsWith('svc:stashtake:')) {
        const i = Number(id.slice(14));
        const pt = this.stakeStorage[i];
        if (pt) { this.stakeStorage.splice(i, 1); this.inventory.parts.push(pt); this.audio.play('chime'); }
        if (!this.stakeStorage.length) d.view = 'well';
        this.renderDlg(); return;
      } else if (id.startsWith('svc:namestill:')) {
        const name = decodeURIComponent(id.slice(14));
        if (this.renameStake(npc.still, name)) {
          const fresh = this.resolveStillByKey(npc.still.key);
          if (fresh) { npc.still.name = fresh.name; }
          const tp = this.topics.find(t => t.id === 's:' + npc.still.key);
          if (tp) tp.label = this.stillNames[npc.still.key]; // the topic keeps step with the name
          narrate(`"${this.stillNames[npc.still.key]}," the keeper repeats, testing the weight. the yard picks it up within the hour. names given by keepers have a way of sticking.`);
        }
        this.renderDlg(); return;
      } else if (id === 'svc:naming') {
        const name = this.coinEpithet(npc.still);
        narrate(`the well-keeper straightens. "the roads brought your stories, and the yard has been arguing a name. they settled on ${name.toUpperCase()}. it is yours if you will carry it."`);
        this.dlg.pendingName = name;
        this.renderDlg(); return;
      } else if (id === 'svc:takename') {
        const name = this.dlg.pendingName;
        this.epithet = name;
        this.audio.play('bell');
        this.ui.toast(`THE DESERT NAMES YOU: ${name.toUpperCase()}`, 'good');
        this.rootStory('story:naming', 'legend',
          `at ${npc.still.name}, they started calling the walker ${name} — and the name stuck to the roads.`,
          { stills: [npc.still] });
        this.appendHistory(npc.still.key, `on day ${1 + Math.floor(this.worldT)}, this still named a walker: ${name}. names given here have a way of traveling.`);
        this.journal.push({
          type: 'lore', cat: 'event', title: 'THE NAMING',
          body: `${npc.still.name} gave you a name on day ${1 + Math.floor(this.worldT)}: ${name}. you were a designation, then a stranger, then a story. now the stories have somewhere to point.`,
        });
        narrate(`"${name}," the keeper says, once, the way a thing is made official. somewhere behind you, somebody repeats it to somebody else.`);
        this.dlg.pendingName = null;
        this.renderDlg(); return;
      } else if (id === 'svc:refusename') {
        this.namingRefused = true;
        this.rootStory('story:refusedname', 'legend',
          `they offered the walker a name at ${npc.still.name}; the walker gave it back. the desert respects that, mostly.`,
          { stills: [npc.still] });
        this.journal.push({
          type: 'lore', cat: 'event', title: 'THE NAME, RETURNED',
          body: `${npc.still.name} offered you a name on day ${1 + Math.floor(this.worldT)} and you handed it back. the walker walks. that is the whole of it.`,
        });
        narrate('the keeper nods slowly. "the walker walks," they say, and the yard files it away like a verdict. no offense taken. a little awe, maybe.');
        this.dlg.pendingName = null;
        this.renderDlg(); return;
      } else if (id === 'svc:scouring') {
        this.doScouring();
        this.renderDlg(); return;
      } else if (id === 'svc:scrub') {
        // the monks' rite is efficient; the common scraper is not
        const cost = Math.max(1, Math.ceil(p.corruption / (npc.still.temperament === 'monastic' ? 25 : 15)));
        if (p.corruption < 1 || (mats.salt || 0) < cost) return;
        mats.salt -= cost;
        p.corruption = 0;
        this.vfx.rise(p.pos, { color: 0xffffff, r: 1.8 });
        sys(`the Rust is scoured from your seams · −${cost} ❄ salt`);
        say('white ground is clean ground. so are you, for now.');
        this.changeRep(npc.still, 1);
      } else if (id === 'svc:memorial') {
        for (const l of memorialLines(this.world, npc.still, this.memorials[npc.still.key] || [])) say(l);
        // THE FORMER LIFE: at one rim in the desert, one name cuts deeper
        const rim = rimStillFor(this);
        if (rim && npc.still.key === rim.key && !this.formerLife.rim && this.txLeaks >= 1) {
          const des = formerDesignation(this.seed);
          this.formerLife.rim = 1 + Math.floor(this.worldT);
          narrate(`and there, below the others, older than most of them, cut deeper than any: ${des}. not a still-name. an OLD-WORLD designation, the kind the fragments keep insisting is yours. the cuts are worn smooth at the edges — someone traced them, over and over, for years.`);
          this.audio.play('bell');
          this.ui.toast('THE NAME IN THE RIM — a piece of the former life', 'rust');
          this.journal.push({
            type: 'lore', cat: 'memory', title: 'THE NAME IN THE RIM',
            body: `cut into the well-rim at ${npc.still.name}, deeper than the dead are usually given: ${des}. the same designation the line keeps filing under your signal. rims hold the names of the LOST — which means someone here lost this one, and mourned it long enough to wear the cuts smooth.`,
          });
          trailCheck(this);
        }
      } else if (id === 'svc:turret') {
        if ((mats.scrap || 0) < 8 || (mats.cell || 0) < 2) return;
        mats.scrap -= 8; mats.cell -= 2;
        this.fundedTurrets[npc.still.key] = true;
        this.stills.reload(npc.still.key);
        this.changeRep(npc.still, 3);
        this.audio.play('chime');
        sys('wall gun funded · −8 ▤ · −2 ▮');
        say('the watch will drink to your designation tonight. quietly. on duty.');
        saveGame(this);
      } else if (id === 'svc:revive') {
        const fallen = (this.memorials[npc.still.key] || []).filter(m => m.id && this.deadNpcIds.includes(m.id));
        const isSig = (mm) => this.recruitedIds.includes(mm.id) || (this.npcDisp[mm.id] || 0) >= 40;
        const m = [...fallen].reverse().find(mm => !isSig(mm));
        if (!m) return;
        const cost = 10 + 6 * (this.revived[npc.still.key] || 0);
        if ((mats.scrap || 0) < cost || (mats.alloy || 0) < 2 || (mats.salt || 0) < 2) return;
        mats.scrap -= cost; mats.alloy -= 2; mats.salt -= 2;
        this.deadNpcIds = this.deadNpcIds.filter(x => x !== m.id);
        m.revived = true;
        this.revived[npc.still.key] = (this.revived[npc.still.key] || 0) + 1;
        this._skipJudgment = true; this.stills.reload(npc.still.key); this._skipJudgment = false;
        this.appendHistory(npc.still.key, `${m.name} was recommissioned from the well's memory on day ${1 + Math.floor(this.worldT)}, at a wanderer's cost. the name on the rim is ringed, not struck.`);
        this.changeRep(npc.still, 4);
        this.npcDisp[m.id] = Math.max(-40, Math.min(40, (this.npcDisp[m.id] || 0) + 6));
        this.audio.play('chime');
        this.vfx.rise(this.player.pos, { color: 0xffffff, r: 2 });
        sys(`the rite is paid · −${cost} ▤ · −2 ▣ · −2 ❄`);
        say(`the well remembers the shape of ${m.name}, and the salt gives them back. do not ask what the interval was like. they will tell you it was quiet.`);
        this.ui.toast(`${m.name.toUpperCase()} WALKS AGAIN`, 'good');
        saveGame(this);
      } else if (id === 'svc:epic') {
        // the well cannot hold all of a soul that mattered: the epic begins
        const fallen = (this.memorials[npc.still.key] || []).filter(m => m.id && this.deadNpcIds.includes(m.id));
        const isSig = (mm) => this.recruitedIds.includes(mm.id) || (this.npcDisp[mm.id] || 0) >= 40;
        const sig = [...fallen].reverse().find(isSig);
        if (!sig || this.epic) return;
        const still = npc.still;
        const megas = this.world.megasNear(still.x, still.z, 7500)
          .filter(mg => Math.hypot(mg.x - still.x, mg.z - still.z) > 600)
          .sort((a, b) => Math.hypot(a.x - still.x, a.z - still.z) - Math.hypot(b.x - still.x, b.z - still.z));
        const target = megas.find(mg => !this.world.discoveredKeys.has(mg.key)) || megas[0];
        if (!target) {
          say('the well is quiet for a long time. what it needs is not within reach of this place. walk, and ask again where the big ruins stand closer.');
          this.renderDlg(); return;
        }
        this.epic = {
          npcId: sig.id, npcName: sig.name, stillKey: still.key, stillName: still.name,
          stillX: still.x, stillZ: still.z, megaKey: target.key, megaName: target.name,
          x: target.x, z: target.z, state: 'seek',
        };
        this.world.markDiscovered({ key: target.key, name: target.name, kind: target.type, x: target.x, z: target.z });
        this.tracked = { kind: 'epic', id: 'epic' };
        // a Shaper already carried — taken from some other Mother, kept
        // against exactly this day — spares you the descent
        if ((mats.shaper || 0) >= 1) {
          this.epic.state = 'have';
          this.journal.push({
            type: 'lore', cat: 'work', title: `THE RECOMMISSION OF ${sig.name.toUpperCase()}`,
            body: `the well holds ${sig.name}, but not all of them — the weave wants a Neuromanifold Shaper. and you have one. you have been carrying one this whole time, like you knew.`,
          });
          say(`the well turns the name ${sig.name} over for a long moment. "the weave wants a Shaper," it does not quite say — and then it goes very quiet, because it can feel the one in your pack. "you knew," says the well. "walkers like you always half-know."`);
          sys('— you already carry a Shaper · surrender it at this well when ready');
          this.audio.play('bell');
          this.ui.toast(`THE RECOMMISSION OF ${sig.name.toUpperCase()} — the Shaper you kept now matters`, 'good');
          saveGame(this);
          this.renderDlg(); return;
        }
        this.journal.push({
          type: 'lore', cat: 'work', title: `THE RECOMMISSION OF ${sig.name.toUpperCase()}`,
          body: `the well holds ${sig.name}, but not all of them. minds like theirs were woven on a Neuromanifold Shaper, and the last Shapers are held where minds were made: the conceptories, in the deep rooms. one still works beneath ${target.name}. take it from the thing that keeps it.`,
        });
        say(`the well turns the name ${sig.name} over for a long moment, and gives it back. "i hold the shape of them," it does not quite say, "but not the weave. what they were was made on a Neuromanifold Shaper, and i am a bucket on a rope. beneath ${target.name} the old conceptory still works. its Mother keeps the last Shaper like an egg. she will not trade."`);
        sys(`— ${target.name} marked on your chart · the descent is pinned to your compass`);
        this.audio.play('bell');
        this.ui.toast(`THE RECOMMISSION OF ${sig.name.toUpperCase()} — seek the deep room`, 'rust');
        saveGame(this);
      } else if (id === 'svc:reviveEpic') {
        const e = this.epic;
        if (!e || (mats.shaper || 0) < 1 || (mats.scrap || 0) < 6) return;
        mats.shaper -= 1; mats.scrap -= 6;
        this.deadNpcIds = this.deadNpcIds.filter(x => x !== e.npcId);
        const mem = (this.memorials[npc.still.key] || []).find(mm => mm.id === e.npcId);
        if (mem) mem.revived = true;
        this._skipJudgment = true; this.stills.reload(npc.still.key); this._skipJudgment = false;
        this.appendHistory(npc.still.key, `on day ${1 + Math.floor(this.worldT)}, a wanderer carried a Neuromanifold Shaper up out of ${e.megaName} and gave it to the well, and the well gave back ${e.npcName} — all of them, down to the weave. the Shaper sang once and went still. nobody here will say the word miracle. everybody here means it.`);
        this.changeRep(npc.still, 8);
        this.npcDisp[e.npcId] = 40; // they remember everything, including this
        this.recordEvent('helped', npc.still.name);
        this.rootStory('story:epic:' + e.npcId, 'shaper',
          `${e.npcName} of ${npc.still.name} died, and did not stay dead: the walker carried a Shaper up out of ${e.megaName} and the well gave them back whole.`,
          { stills: [npc.still] });
        this.journal.push({
          type: 'lore', cat: 'event', title: `${e.npcName.toUpperCase()} — RECOMMISSIONED WHOLE`,
          body: `the Shaper surrendered to the well at ${e.stillName}, day ${1 + Math.floor(this.worldT)}. the weave held. they came back knowing your name.`,
        });
        if (this.tracked && this.tracked.kind === 'epic') this.tracked = null;
        this.epic = null;
        this.audio.play('bell');
        this.vfx.rise(this.player.pos, { color: 0x6fe8d0, r: 2.6 });
        sys('the Shaper is surrendered · −6 ▤ · the weave holds');
        say(`the well takes the Shaper the way you'd take a lit lamp from a child. the water goes very still. then ${e.npcName} is standing at the rim, dripping starlight that isn't there, and the first thing they say is your designation, correctly, softly, like a door unlocking.`);
        this.ui.toast(`${e.npcName.toUpperCase()} WALKS AGAIN — WHOLE`, 'good');
        saveGame(this);
      } else if (id === 'svc:rekindle') {
        if ((mats.scrap || 0) < 5 || (mats.alloy || 0) < 1 || (mats.salt || 0) < 2) return;
        mats.scrap -= 5; mats.alloy -= 1; mats.salt -= 2;
        const st = this.stillStates[npc.still.key] || (this.stillStates[npc.still.key] = { stage: -2, lastAssess: this.worldT });
        st.stage = -1;
        st.lastAssess = this.worldT;
        st.graceUntil = this.worldT + 6;
        this.appendHistory(npc.still.key, `on day ${1 + Math.floor(this.worldT)} a wanderer pried the cap from the well and swept the yard. by dusk there was a lamp lit. the desert sends as well as takes.`);
        this.journal.push({
          type: 'lore', cat: 'event', title: `${npc.still.name.toUpperCase()} REKINDLED`,
          body: `you gave the well back its voice, day ${1 + Math.floor(this.worldT)}. word will travel. people will come.`,
        });
        this.changeRep(npc.still, 10);
        this.rootStory('story:rekindle:' + npc.still.key, 'hearth',
          `${npc.still.name} has a lamp lit again because the walker pried the cap off its dead well.`,
          { stills: [npc.still] });
        this._skipJudgment = true; this.stills.reload(npc.still.key); this._skipJudgment = false;
        this.audio.play('bell');
        this.vfx.rise(this.player.pos, { color: 0x6fe8d0, r: 2.4 });
        this.ui.toast(`${npc.still.name.toUpperCase()} REKINDLED — word will travel`, 'good');
        saveGame(this);
        this.ui.closePanel(); this.dlg = null;
        return;
      } else if (id === 'svc:bind') {
        if ((mats.scrap || 0) < 2 || (this.respawnPt && this.respawnPt.stillKey === npc.still.key)) return;
        mats.scrap -= 2;
        this.respawnPt = { x: npc.still.x, z: npc.still.z, stillKey: npc.still.key, label: npc.still.name };
        sys('transmission attuned · −2 ▤');
        say('if the desert unmakes you, the well will remember the shape.');
        this.changeRep(npc.still, 0.5);
        saveGame(this);
      } else if (id === 'svc:harvest') {
        if (p.corruption < 25) return;
        const yield_ = Math.floor(p.corruption / 25);
        mats.nodule = (mats.nodule || 0) + yield_;
        p.corruption = 0;
        this.vfx.rise(p.pos, { color: 0xff6a3c, r: 1.8 });
        sys(`the bloom is harvested · +${yield_} ❂ rust nodule${yield_ === 1 ? '' : 's'}`);
        say('it will miss you. it always misses its gardens.');
        this.changeRep(npc.still, 1);
      }
      this.renderDlg(); return;
    }

    if (id === 'rumor') {
      const { effD } = this.calcDisp(npc);
      const cost = effD >= 10 ? 0 : 5;
      if (cost > 0) {
        this.inventory.mats.scrap -= cost;
        sys(`— ${cost} ▤ scrap`);
      }
      const megas = this.world.megasNear(npc.still.x, npc.still.z, 2800)
        .filter(m => !this.world.discoveredKeys.has(m.key));
      if (!megas.length) { say(noRumor(rand)); this.renderDlg(); return; }
      megas.sort((a, b) => Math.hypot(a.x - npc.still.x, a.z - npc.still.z) - Math.hypot(b.x - npc.still.x, b.z - npc.still.z));
      const mega = megas[rand.int(0, Math.min(2, megas.length - 1))];
      this.world.markDiscovered({ key: mega.key, name: mega.name, kind: mega.type, x: mega.x, z: mega.z, rumored: true });
      this.journal.push({ type: 'lore', cat: 'place', title: 'RUMOR: ' + mega.name.toUpperCase(), body: `${npc.name} of ${npc.still.name} spoke of this place. marked on the map — go see if the desert agrees.` });
      say(rumorText(npc, mega, npc.still, rand));
      sys('— location marked on map [M]');
      this.renderDlg(); return;
    }

    // ---- trade transactions ----
    const { effD } = this.calcDisp(npc);
    const mats = this.inventory.mats;
    // the market's muls must match what the trade panel displayed
    const _mkt = npc.still && !npc.camp && !npc.isFollower && npc.still.salt !== undefined
      ? this.marketAt(npc.still) : null;
    const _mmul = (mid) => _mkt ? _mkt.mul[mid] || 1 : 1;
    if (id.startsWith('buyc:')) {
      const cid = id.slice(5);
      const price = buyPrice(CONSUMABLE_VALUES[cid] * (_mkt ? _mkt.moodVal : 1), npc.temperament, effD);
      if ((mats.scrap || 0) >= price) {
        mats.scrap -= price;
        this.inventory.consumables[cid] = (this.inventory.consumables[cid] || 0) + 1;
        this.tradeDisp(npc, 0.4); this.changeRep(npc.still, 0.25);
        sys(`+1 ${CONSUMABLES[cid].name} · −${price} ▤`);
      }
    } else if (id.startsWith('buym:')) {
      const mid = id.slice(5);
      const price = buyPrice(MAT_VALUES[mid] * _mmul(mid), npc.temperament, effD);
      if ((mats.scrap || 0) >= price) {
        mats.scrap -= price;
        mats[mid] = (mats[mid] || 0) + 1;
        this.tradeDisp(npc, 0.4); this.changeRep(npc.still, 0.25);
        sys(`+1 ${MATERIALS[mid].name} · −${price} ▤`);
      }
    } else if (id.startsWith('sellm:')) {
      const mid = id.slice(6);
      if ((mats[mid] || 0) > 0) {
        const price = sellPrice(MAT_VALUES[mid] * _mmul(mid), npc.temperament, effD);
        mats[mid]--;
        mats.scrap = (mats.scrap || 0) + price;
        this.tradeDisp(npc, 0.4); this.changeRep(npc.still, 0.25);
        sys(`−1 ${MATERIALS[mid].name} · +${price} ▤`);
      }
    } else if (id.startsWith('sellp:')) {
      const uid = id.slice(6);
      const part = this.inventory.parts.find(pp => pp.uid === uid);
      if (part) {
        const price = Math.max(1, Math.round(partPrice(part, npc.temperament) * (_mkt ? _mkt.moodVal : 1)));
        this.inventory.parts = this.inventory.parts.filter(pp => pp.uid !== uid);
        mats.scrap = (mats.scrap || 0) + price;
        this.tradeDisp(npc, 0.8); this.changeRep(npc.still, 0.25);
        sys(`sold ${part.name} · +${price} ▤`);
      }
    }
    this.renderDlg();
  }

  // ================= inventory ops (called by UI) =================
  equipPart(part) {
    const slot = part.slot;
    const old = this.equipped[slot];
    this.inventory.parts = this.inventory.parts.filter(p => p.uid !== part.uid);
    if (old) this.inventory.parts.push(old);
    this.equipped[slot] = part;
    this.afterBodyChange(part.rusted ? 'the new part settles in. something in it is still warm.' : null);
  }
  unequipSlot(slot) {
    const old = this.equipped[slot];
    if (!old) return;
    this.equipped[slot] = null;
    this.inventory.parts.push(old);
    this.afterBodyChange();
  }
  scrapPart(part) {
    this.inventory.parts = this.inventory.parts.filter(p => p.uid !== part.uid);
    this.inventory.mats.scrap = (this.inventory.mats.scrap || 0) + 2;
    if (part.rusted) this.inventory.mats.nodule = (this.inventory.mats.nodule || 0) + 1;
    this.ui.toast('part broken down for materials');
  }
  afterBodyChange(msg) {
    this.player.recompute(this.equipped);
    this.abilitySlots = abilityLoadout(this.equipped);
    if (this.player.stats.brownout) this.ui.toast('⚠ POWER BROWNOUT — core cannot feed all systems', 'rust');
    if (msg) this.ui.toast(msg, 'rust');
  }
  craftRecipe(r) {
    // THE HEARTHSTONE: your own bench wastes nothing — fabricating inside
    // your stake's field refunds a fifth of the scrap (min 1 kept)
    const atBench = this.stake && (this._fieldStills || []).some(s => s.key === this.stake.key);
    const scrapBefore = this.inventory.mats.scrap || 0;
    const result = craft(r, this.inventory.mats);
    if (atBench) {
      const spent = scrapBefore - (this.inventory.mats.scrap || 0);
      const refund = Math.floor(spent * 0.2);
      if (refund > 0) {
        this.inventory.mats.scrap += refund;
        this.ui.toast(`the bench remembers your hands — +${refund} ▤ back`, 'good');
      }
    }
    if (result.kind === 'consumable') {
      this.inventory.consumables[result.id] = (this.inventory.consumables[result.id] || 0) + 1;
      this.ui.toast(`FABRICATED: ${CONSUMABLES[result.id].name}`, 'good');
    } else {
      this.inventory.parts.push(result.part);
      this.ui.toast(`FABRICATED: ${result.part.name}`, 'good');
    }
  }
  useConsumable(id) {
    if (!this.inventory.consumables[id]) return;
    const c = CONSUMABLES[id];
    const p = this.player;
    // refuse to waste a consumable that would do nothing
    if (c.use === 'hull' && p.hull >= p.stats.maxHull - 0.01) { this.ui.toast('hull already at maximum'); return; }
    if (c.use === 'energy' && p.energy >= p.stats.energyCap - 0.01) { this.ui.toast('power reserves already full'); return; }
    if (c.use === 'corruption' && p.corruption <= 0) { this.ui.toast('no Rust to purge — seams are clean'); return; }
    if (c.use === 'hull') p.hull = Math.min(p.stats.maxHull, p.hull + c.amount);
    if (c.use === 'energy') p.energy = Math.min(p.stats.energyCap, p.energy + c.amount);
    if (c.use === 'corruption') p.corruption = Math.max(0, p.corruption - c.amount);
    this.inventory.consumables[id]--;
    this.ui.toast(`${c.name} used`, 'good');
  }

  // push current SETTINGS into the live engine (also called by the UI)
  applySettings() {
    const vd = VIEW_DIST[SETTINGS.video.viewDist] || VIEW_DIST.standard;
    this.vd = vd;
    this.renderer.setPixelRatio(SETTINGS.video.renderScale);
    // low scales upscale nearest-neighbor: honest pixels, behind the scanlines
    this.renderer.domElement.style.imageRendering = SETTINGS.video.renderScale <= 0.5 ? 'pixelated' : 'auto';
    // haze pull-in was the pre-AA mitigation: only needed with the AA off
    this.fogTrim = SETTINGS.video.renderScale <= 0.5 && SETTINGS.video.pixelAA === false ? 0.86 : 1;
    this.camera.far = vd.far;
    this.camera.updateProjectionMatrix();
    this.world.view = vd.view;
    const diff = DIFFICULTY[SETTINGS.game.difficulty] || DIFFICULTY.survivor;
    this.enemies.dmgMul = diff.dmg;
    this.enemies.spawnMul = diff.spawn;
    this.audio.applyVolumes();
    saveSettings();
  }

  openSystem() {
    document.getElementById('system-info').innerHTML =
      `seed phrase: <b style="color:var(--amber-bright)">${this.seedPhrase}</b><br>` +
      `machines destroyed: ${this.kills} · memories recovered: ${this.journal.filter(j => j.type === 'lore').length} · signals resolved: ${this.quests.filter(q => q.done).length}<br>` +
      `<span style="opacity:.6">“${ARC}” · ${LABEL}</span>`;
    this.ui.toggle('system');
  }

  // ================= death =================
  die() {
    this.dead = true;
    this.exitHollow(false); // the halls keep no bodies
    saveGame(this);
    const where = this.respawnPt
      ? (this.respawnPt.stillKey ? `the well at ${this.respawnPt.label}` : this.respawnPt.label)
      : 'the anchor';
    this.ui.death(true, `the desert takes the chassis apart with patient fingers. but ${where} still holds a copy of you — most of you. corruption purged in transit; some salvage lost to the sand.`);
    document.exitPointerLock && document.exitPointerLock();
  }
  respawn() {
    this.dead = false;
    this.ui.death(false);
    const p = this.player;
    const pt = this.respawnPt || { x: this.anchor.x, z: this.anchor.z };
    p.pos.set(pt.x + 3, this.world.getHeight(pt.x + 3, pt.z + 3) + 1, pt.z + 3);
    p.vel.set(0, 0, 0);
    p.hull = p.stats.maxHull * 0.7;
    p.energy = p.stats.energyCap * 0.5;
    p.corruption = Math.max(0, p.corruption * 0.4);
    for (const k of Object.keys(this.inventory.mats)) {
      this.inventory.mats[k] = Math.floor(this.inventory.mats[k] * 0.7);
    }
  }

  // ================= main loop =================
  loop() {
    requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    const p = this.player;
    const paused = !!this.ui.activePanel; // any open panel suspends the simulation

    // day cycle & weather
    if (!paused) {
      this.dayT = (this.dayT + dt / DAY_LENGTH) % 1;
      this.worldT += dt / DAY_LENGTH;
      // storm fronts ride a slow noise field over world-time — and the
      // season leans on the dial: the veil brews them, the clear starves them
      this.season = seasonAt(this.seed, this.worldT);
      const sn = 0.5 + 0.5 * this.stormNoise.noise(this.worldT * 0.9, 3.7);
      const target = this._stormOverride ?? Math.min(1, smoothstep(0.7, 0.86, sn) * this.season.stormMul
        + (this.season.id === 'veil' ? smoothstep(0.55, 0.7, sn) * 0.35 : 0));
      if (this._seasonIdx !== undefined && this._seasonIdx !== this.season.idx) {
        this.audio.play('bell');
        this.ui.toast(`THE SEASON TURNS — ${this.season.name}: ${this.season.line}`, this.season.id === 'clear' ? 'good' : 'rust');
        this.journal.push({
          type: 'lore', cat: 'event', title: 'THE SEASON TURNS — ' + this.season.name,
          body: `${this.season.line}. day ${1 + Math.floor(this.worldT)}; the ${this.season.next.name.toLowerCase()} follows in ${Math.ceil(this.season.daysLeft)} days.`,
        });
      }
      this._seasonIdx = this.season.idx;
      // THE GLASS-WIND: shard storms — hear it coming, then get indoors
      const shardPrev = this.shard || 0;
      this.shard = this._shardOverride !== undefined && this._shardOverride !== null
        ? (this.worldT < this._shardOverride ? 0.9 : 0)
        : shardStormAt(this.seed, this.worldT);
      if (shardPrev < 0.35 && this.shard >= 0.35) {
        this.audio.play('storm');
        this.ui.toast('THE GLASS-WIND — the desert drags a knife along itself. SHELTER.', 'rust');
      }
      if (shardPrev >= 0.35 && this.shard < 0.1) {
        this._glassBountyT = this.worldT + 1;
        this.ui.toast('the glass-wind passes. the sand glitters — salvage runs rich for a day', 'good');
        this.journal.push({
          type: 'lore', cat: 'event', title: 'AFTER THE GLASS-WIND',
          body: `the shard storm scoured through on day ${1 + Math.floor(this.worldT)} and left the ground salted with glass. wrecks strip rich until it dulls.`,
        });
      }
      if (this.shard > 0.5 && !this.interiors.active && !this._sheltered && !this.dead) {
        p.damage(0.9 * this.shard * dt, true);
        this._shardHurtT = (this._shardHurtT || 0) - dt;
        if (this._shardHurtT <= 0) { this._shardHurtT = 6; this.shakeT = 0.4; this.ui.toast('THE GLASS-WIND SCOURS YOUR PLATE — get behind something', 'rust'); }
      }
      // THE LONG COLD: nights chew through power cells outdoors
      if (this.season.id === 'longcold' && Math.sin(this.dayT * Math.PI * 2) < -0.08
        && !this.interiors.active && !this._sheltered && !this.dead
        && !this.camps.fireNear(p.pos, 6)) {
        // the cold taxes the core beyond whatever it can put out: net −2.2/s
        p.energy = Math.max(0, p.energy - (p.stats.energyRegen + 2.2) * dt);
        if (p.energy <= 0) {
          p.damage(0.45 * dt, true); // frost in the joints
          this._coldHurtT = (this._coldHurtT || 0) - dt;
          if (this._coldHurtT <= 0) { this._coldHurtT = 8; this.ui.toast('THE COLD CHEWS THE EMPTY CELL — find a fire, a field, a roof', 'rust'); }
        }
      }
      const prev = this.storm;
      this.storm += Math.max(-dt * 0.12, Math.min(dt * 0.12, target - this.storm));
      if (prev < 0.12 && this.storm >= 0.12) {
        this.ui.toast('the horizon is smoking — SANDSTORM rolling in', 'rust');
        this.audio.play('storm');
      } else if (prev > 0.1 && this.storm <= 0.1 && target < 0.1) {
        if (!this._stormCalmTold || this.worldT - this._stormCalmTold > 0.05) {
          this._stormCalmTold = this.worldT;
          this.ui.toast('the storm exhausts itself. the dunes have moved.', 'good');
        }
      }
    }
    const sunEl = Math.sin(this.dayT * Math.PI * 2);
    const isNight = sunEl < -0.08;
    const dayAmt = Math.max(0, Math.min(1, (sunEl + 0.15) * 3));
    const sky = new THREE.Color().lerpColors(new THREE.Color(0x141422), new THREE.Color(0xd9b380), dayAmt);
    const duskBlend = Math.max(0, 1 - Math.abs(sunEl) * 5);
    sky.lerp(new THREE.Color(0xc46a3a), duskBlend * 0.5);
    sky.lerp(new THREE.Color(0xb08550), this.storm * 0.75);  // storm dims the world to dust
    // the season tints the light: dust amber for the veil, pale glass-green
    // for the shard season, a thin blue for the long cold
    if (this.season && this.season.tintAmt) sky.lerp(new THREE.Color(this.season.tint), this.season.tintAmt * dayAmt);
    if (this.shard > 0.1) sky.lerp(new THREE.Color(0x9fd8b0), this.shard * 0.5); // the air full of knives
    this.scene.background = sky;
    this.scene.fog.color.copy(sky);
    const baseFog = (this.vd ? this.vd.fog : 420) * (this.fogTrim || 1);
    this.scene.fog.near = 60 - this.storm * 46;
    this.scene.fog.far = baseFog - this.storm * (baseFog - 90);
    this.sun.intensity = (0.15 + dayAmt * 2.1) * (1 - this.storm * 0.6);
    this.sun.position.set(Math.cos(this.dayT * Math.PI * 2) * 100, sunEl * 120 + 20, 40);
    this.hemi.intensity = (0.25 + dayAmt * 0.7) * (1 - this.storm * 0.35);
    // down in the hollow places, the sky is a rumor
    if (this.interiors.active) {
      this.scene.background.setHex(0x080605);
      this.scene.fog.color.setHex(0x080605);
      this.scene.fog.near = 8;
      this.scene.fog.far = 72;
      this.sun.intensity = 0.08;
      this.hemi.intensity = 0.22;
    }
    const clockH = (this.dayT * 24 + 6) % 24; // sunrise at 06:00, sun-noon at 12:00
    const hour = Math.floor(clockH), min = Math.floor((clockH % 1) * 60);
    this.clockText = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')} · ${this.season ? this.season.name : ''} ${this.storm > 0.25 ? '· SANDSTORM — the compass swims' : isNight ? '· NIGHT — they are bolder now' : ''}`;

    if (!this.dead && !paused) {
      const inp = this.input;
      const wasGrounded = p.grounded, lastX = p.pos.x, lastZ = p.pos.z;
      p.update(dt, inp, this.camYaw, this.world);
      // who's near a field? (used for shelter, healing, and the safety hum)
      const inAnchor = Math.hypot(p.pos.x - this.safeZone.x, p.pos.z - this.safeZone.z) < this.safeZone.r;
      const fieldStills = this.stills.loadedStillsWithin(p.pos, 45);
      this._fieldStills = fieldStills;
      const inField = inAnchor || fieldStills.length > 0;
      // shelter is a fact of every frame — the sandstorm, the glass-wind,
      // and the cold all read it, so it can never go stale between weathers
      {
        let sh = inField;
        if (!sh && (this.storm > 0.05 || (this.shard || 0) > 0.1
          || (this.season && this.season.id === 'longcold'))) {
          for (const c of this.world.collidersNear(p.pos.x, p.pos.z)) {
            if (c.top > p.pos.y + 2 && inFootprint(c, p.pos.x, p.pos.z, 5)) { sh = true; break; }
          }
        }
        this._sheltered = sh;
      }
      // the storm leans on you — unless something tall breaks the wind
      if (this.storm > 0.05 && !this.interiors.active) {
        const sheltered = this._sheltered;
        if (!sheltered) {
          const wa = this.worldT * 5.1 + (this.seed % 7);
          const gaitF = { biped: 1, quad: 0.7, tracked: 0.35, hover: 1.5 }[p.stats.gait] || 1;
          p.pos.x += Math.sin(wa) * this.storm * 2.1 * gaitF * dt;
          p.pos.z += Math.cos(wa) * this.storm * 2.1 * gaitF * dt;
          this.world.collide(p.pos, 0.9, p.pos.y - p.baseY);
        }
      }
      // jump / landing sounds
      if (wasGrounded && !p.grounded && p.vel.y > 4) this.audio.play('jump');
      if (!wasGrounded && p.grounded) this.audio.play('land');
      this.world.update(p.pos.x, p.pos.z, dt);
      this.camps.update(dt, p, this.enemies, isNight);
      this.caravans.update(dt, p, this.enemies, isNight, this.worldT);
      // the desert falls on the roads: ambush rolls near loaded caravans
      this._ambushT = (this._ambushT || 0) - dt;
      if (this._ambushT <= 0) {
        this._ambushT = 1;
        for (const c of this.caravans.loadedList()) {
          if (c.ambushed) continue;
          const s = c.pseudoStill;
          if (Math.hypot(s.x - p.pos.x, s.z - p.pos.z) > 320) continue;
          // ambushes are events, not weather: a caravan that just fought is
          // left alone a while, and the desert paces itself overall
          if ((c.noAmbushUntil || 0) > this.worldT || (this._roadCalmUntil || 0) > this.worldT) continue;
          let prob = 0.003;
          if (this.nests.nestsNear(s.x, s.z, 3200).length) prob += 0.012;
          if (this.world.biomeAt(s.x, s.z).corrupting) prob += 0.01;
          if (Math.random() < prob) this.ambushCaravan(c, 3 + (Math.random() < 0.4 ? 1 : 0));
        }
      }
      this.followers.update(dt, p, this.enemies, this.worldT);
      this.nests.update(dt, p, this.enemies);
      this.eventSys.update(dt);
      this.warSys.update(dt);
      this._staticT = Math.max(0, this._staticT - dt);
      followerTick(this);
      this.banterTick(dt);
      this.wantTick(dt);
      const allies = [
        ...this.followers.list(),
        ...this.camps.alliesNear(p.pos, 80),
        ...this.caravans.alliesNear(p.pos, 90),
        // during a raid, the residents are in the fight too
        ...(this.eventSys.raidActive ? this.stillDefenders() : []),
      ];
      this.enemies.aggroMul = this.interiors.active ? 1 : 1 - this.storm * 0.55; // storms hunt blind
      this.enemies.embraceLevel = this.embrace === null ? 0 : Math.max(0, this.embrace); // kin is read fresh each frame
      this.enemies.coldNight = !!(this.season && this.season.id === 'longcold' && isNight); // the lean season's nights run bolder
      this.enemies.update(dt, p, this.projectiles, isNight, allies);
      // the desert's voice
      const distMoved = Math.min(5, Math.hypot(p.pos.x - lastX, p.pos.z - lastZ));
      const moving = (p.vel.x * p.vel.x + p.vel.z * p.vel.z) > 1;
      this.audio.update(dt, {
        storm: Math.max(this.storm, this.shard || 0), corruption: p.corruption, answered: this.embrace !== null, inField,
        moving, sprinting: inp.shift && moving,
        gait: p.stats.gait, speedFrac: Math.min(1, Math.hypot(p.vel.x, p.vel.z) / 13),
        distMoved, grounded: p.grounded,
        biome: this.biomeId,
        interior: !!this.interiors.active, // the wind dies at the door
        // calm spells: the wind has moods of its own
        windMod: 0.5 + 0.5 * this.windNoise.noise(this.worldT * 2.7, 5.5),
      });
      this.projectiles.update(dt, this.world, p, this.enemies,
        (e, dmg, pos) => this.damageEnemy(e, dmg),
        (dmg) => { const dealt = p.damage(dmg); if (dealt > 0) { this.shakeT = 0.25; this.uiHurt(dealt); } },
        (pos) => this.vfx.spark(pos, { color: 0xbbb09a, size: 0.3 }),
        allies);
      this.enemies.onHitPlayer = (dealt) => { if (dealt > 0) { this.shakeT = 0.3; this.uiHurt(dealt); } };
      this.enemies.onSegmentBroke = (e, seg) => {
        this.audio.play('boom');
        this.vfx.spark(seg.pos.clone().setY(seg.pos.y + 1), { color: 0xffb347, size: 0.8 });
        const n = 1 + (Math.random() < 0.5 ? 1 : 0);
        this.inventory.mats.scrap = (this.inventory.mats.scrap || 0) + n;
        this.ui.toast(`SEGMENT SEVERED — the body shortens · +${n} ▤`, 'good');
      };
      this.herds.update(dt, p, this.worldT);
      this.fallUpdate(dt);
      this.stills.gatesBarred = this.embrace !== null && this.embrace >= 3;
      this.stills.update(dt, p, isNight, this.enemies, this.dayT);
      this.tickChains();
      // a still that mistrusts you says so at the gate
      for (const st of fieldStills) {
        if (this._stillWarned.has(st.key)) continue;
        this._stillWarned.add(st.key);
        const pseudo = { id: 'well:' + st.key, still: st, temperament: st.temperament, baseDisp: 0 };
        const { tier } = this.calcDisp(pseudo);
        if (tier.cls === 'hostile') this.ui.toast(`the lookouts of ${st.name.toUpperCase()} track you with dim eyes. you are not welcome.`, 'rust');
      }
      this.vfx.update(dt);
      this.tickCorruption(dt, isNight);
      this.tickAbilityCds(dt);
      this.tickLocale(dt);
      // inside the anchor field: hull mends, machines keep their distance
      if (inAnchor) {
        p.hull = Math.min(p.stats.maxHull, p.hull + 2.5 * dt);
        if (!this._anchorTold) {
          this._anchorTold = true;
          this.ui.toast('ANCHOR FIELD — hull mending. the feral ones will not cross the posts.', 'good');
        }
      }
      if (p.hull <= 0) this.die();
    }
    if (this.dead || paused) {
      // the world holds its breath: locomotion layers ease out instead of
      // freezing mid-clank (gains only move when update runs)
      this.audio.update(dt, {
        storm: this.storm, corruption: p.corruption, answered: this.embrace !== null, inField: true,
        moving: false, sprinting: false, gait: p.stats.gait, speedFrac: 0,
        distMoved: 0, grounded: true, biome: this.biomeId,
        interior: !!this.interiors.active,
        windMod: 0.5 + 0.5 * this.windNoise.noise(this.worldT * 2.7, 5.5),
      });
    }

    // camera orbit + terrain avoidance
    const camDist = this.camDist, camH = 2.2;
    const cx = p.pos.x - Math.sin(this.camYaw) * Math.cos(this.camPitch) * camDist;
    const cz = p.pos.z - Math.cos(this.camYaw) * Math.cos(this.camPitch) * camDist;
    let cy = p.pos.y + camH + Math.sin(this.camPitch) * camDist;
    const minY = this.world.groundAt(cx, cz) + 0.6;
    if (cy < minY) cy = minY;
    // smooth the vertical: the terrain clamp staircases on slopes otherwise
    if (this._camY === undefined || Math.abs(cy - this._camY) > 8) this._camY = cy;
    else this._camY += (cy - this._camY) * Math.min(1, dt * 9);
    this.shakeT = Math.max(0, this.shakeT - dt);
    const sh = (SETTINGS.video.shake && this.shakeT > 0) ? this.shakeT * 0.4 : 0;
    // indoors, walls occlude: march the boom in until the camera clears them
    let ccx = cx, ccy = this._camY, ccz = cz;
    if (this.interiors.active) {
      // ceilings have no colliders — keep the boom under the one you're beneath.
      // knockback can put you in a doorway seam between room rects for a frame;
      // fall back to the last room you were in rather than uncapping the boom.
      const ia = this.interiors.active;
      const room = ia.rooms.find(r => p.pos.x >= r.x0 && p.pos.x <= r.x1 && p.pos.z >= r.z0 && p.pos.z <= r.z1) || this._intRoom;
      if (room) { this._intRoom = room; ccy = Math.min(ccy, ia.baseY + room.floorY + room.h - 0.4); }
      const cols = this.world.collidersNear(p.pos.x, p.pos.z);
      const hy = p.pos.y + 1.9;
      let t = 1;
      for (let s = 0.12; s <= 1; s += 0.08) {
        if (pointBlocked(p.pos.x + (cx - p.pos.x) * s, hy + (ccy - hy) * s, p.pos.z + (cz - p.pos.z) * s, cols)) {
          t = Math.max(0.12, s - 0.1);
          break;
        }
      }
      ccx = p.pos.x + (cx - p.pos.x) * t;
      ccy = hy + (ccy - hy) * t;
      ccz = p.pos.z + (cz - p.pos.z) * t;
    }
    this.camera.position.set(ccx + (Math.random() - 0.5) * sh, ccy + (Math.random() - 0.5) * sh, ccz + (Math.random() - 0.5) * sh);
    this.camera.lookAt(p.pos.x, p.pos.y + 1.8, p.pos.z);

    // dust follows the player — dimmed at night so it doesn't read as grounded stars
    this.dust.position.set(p.pos.x, p.pos.y, p.pos.z);
    this.dust.rotation.y += dt * 0.01;
    this.dust.material.opacity = this.interiors.active ? 0 : Math.min(0.95, 0.1 + dayAmt * 0.4 + this.storm * 0.5);
    this.dust.rotation.y += dt * this.storm * 0.5;
    // stars wheel overhead, only after dark
    const nightAmt = Math.max(0, Math.min(1, -sunEl * 2.5));
    this.stars.material.opacity = this.interiors.active ? 0 : nightAmt * 0.9;
    this.stars.position.set(p.pos.x, p.pos.y, p.pos.z);
    this.stars.rotation.y += dt * 0.004;

    // exploration sweep (throttled) — but the interact prompt updates every
    // frame so it never lingers after a wreck has been stripped
    this.exploreT = (this.exploreT || 0) - dt;
    if (this.exploreT <= 0) {
      this.exploreT = 0.6;
      this.world.markExplored(p.pos.x, p.pos.z, Math.max(2, Math.ceil(p.stats.scanRadius / CHUNK)));
      this.maintainMegaZones();
      this.interiors.maintainDoors();
      this.maintainEscorts();
    }
    // reticle intel: know your machine before you strip it
    this.targetT = (this.targetT || 0) - dt;
    if (this.targetT <= 0) {
      this.targetT = 0.2;
      const te = this.dead || this.ui.activePanel ? null : this.reticleEnemy();
      const el = document.getElementById('target-info');
      if (te) {
        const worn = (te.loadout || []).map(p => `${p.tierName} ${p.defId.replace(/_/g, ' ')}${p.rusted ? ' ❂' : ''}`).join(' · ');
        const line = te.form && te.lineage ? ` · ${te.lineage.name}` : '';
        el.innerHTML = `${te.name}${te.infected ? ' <span style="color:var(--rust-bright)">[INFECTED]</span>' : ''}${worn || line ? `<br><span style="color:var(--amber-dim)">${worn}${line}</span>` : ''}`;
        el.classList.remove('hidden');
      } else el.classList.add('hidden');
    }
    if (this.interiors.active) {
      const pile = this.dead ? null : this.interiors.pileNear(p.pos, 3);
      const cache = this.dead ? null : this.interiors.cacheNear(p.pos, 3.2);
      const doc = this.dead ? null : this.interiors.docNear(p.pos, 3);
      if (pile) this.ui.showInteract(`<b>[E]</b> UNDISTURBED SCRAP`);
      else if (cache) this.ui.showInteract(`<b>[E]</b> BREAK THE SEALED CACHE`);
      else if (doc) this.ui.showInteract(`<b>[E]</b> READ WHAT WAS LEFT`);
      else if (!this.dead && this.interiors.exitNear(p.pos, 3.8)) this.ui.showInteract(`<b>[E]</b> STEP BACK INTO THE LIGHT`);
      else this.ui.showInteract(null);
    } else {
      const door = this.dead ? null : this.interiors.doorNear(p.pos, 5.2);
      if (door) {
        const mega = this.world.megas.get(door.key);
        this.ui.showInteract(`<b>[E]</b> BREAK THE SEAL — the hollow places of ${mega ? mega.name.toUpperCase() : 'the ruin'}`);
      } else {
      const ent = this.dead ? null : this.nearestEntity();
      const fol = this.followers.follower;
      const npc = this.dead ? null
        : (fol && Math.hypot(fol.pos.x - p.pos.x, fol.pos.z - p.pos.z) < 2.5 ? fol : null)
        || this.stills.npcNear(p.pos, 2.8) || this.camps.wandererNear(p.pos, 2.8)
        || this.caravans.npcNear(p.pos, 2.8);
      const fire = this.dead ? null : this.camps.fireNear(p.pos, 2.8);
      const stash = this.dead ? null : this.camps.stashNear(p.pos, 2.5);
      const well = this.dead ? null : this.stills.wellNear(p.pos, 4.5);
      const mA = this.dead ? null : this.nearestMegaAnchor();
      const nearObelisk = !this.dead && Math.hypot(p.pos.x - this.obeliskPos.x, p.pos.z - this.obeliskPos.z) < 3.2;
      if (npc && (!ent || Math.hypot(npc.pos.x - p.pos.x, npc.pos.z - p.pos.z) < ent.dist)) {
        this.ui.showInteract(`<b>[E]</b> TALK — ${npc.name.toUpperCase()}`);
      } else if (fire && !ent) {
        this.ui.showInteract(`<b>[E]</b> REST AT THE FIRE`);
      } else if (stash && !ent && !this.world.looted.has(stash.id)) {
        this.ui.showInteract(`<b>[E]</b> CAMP STASH — travelers share`);
      } else if (mA && !ent) {
        this.ui.showInteract(this.megaAnchors[mA.key]
          ? `<b>[E]</b> ANCHOR — attune transmission (reboot here)`
          : `<b>[E]</b> DORMANT ANCHOR — restore (4 ▤ · 1 ▮)`);
      } else if (nearObelisk && !ent && !this.directoryUsed) {
        this.ui.showInteract(`<b>[E]</b> QUERY ANCHOR DIRECTORY — nearest settlement`);
      } else if (!ent && this.stills.dryNear(p.pos, 4)) {
        this.ui.showInteract(`<b>[E]</b> A DRY WELL — restore it, and found a hearth (8 ▤ · 2 ▣ · 2 ❄ · 1 ▮)`);
      } else if (well && !ent) {
        this.ui.showInteract(`<b>[E]</b> THE WELL — rest · repair${well.temperament === 'monastic' ? ' · scrub the Rust' : well.temperament === 'ferrocult' ? ' · harvest the bloom' : ''}`);
      } else if (ent) {
        const label = { wreck: 'SALVAGE WRECK', shard: 'ABSORB MEMORY SHARD', beacon: 'TRIANGULATE SIGNAL', cache: 'OPEN CACHE' }[ent.kind];
        this.ui.showInteract(`<b>[E]</b> ${label}`);
      } else if (this.fall && !this.fall.cored && this._fallCore
        && Math.hypot(this.fall.x - p.pos.x, this.fall.z - p.pos.z) < 5) {
        this.ui.showInteract(`<b>[E]</b> PRY THE STAR-METAL FROM THE CRATER`);
      } else if (this.rustCallT > 0) {
        this.ui.showInteract(`<b>[E]</b> <span style="color:var(--rust-bright)">ANSWER THE WHISPERS</span>`);
      } else if (this.nestNearSpeakable()) {
        this.ui.showInteract(`<b>[E]</b> <span style="color:var(--rust-bright)">SPEAK — THE NEST</span>`);
      } else this.ui.showInteract(null);
      }
    }
    this.saveT -= dt;
    if (this.saveT <= 0) { this.saveT = 20; if (!this.dead) saveGame(this); }

    this.ui.updateHUD(this.camYaw);
    this.ui.updateEnemyBars(this.enemies.enemies, this.camera, this.renderer);
    if (SETTINGS.video.renderScale <= 0.5 && SETTINGS.video.pixelAA !== false) {
      const aa = this._ensureAA();
      this.renderer.setRenderTarget(aa.rt);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);
      this.renderer.render(aa.qScene, aa.qCam);
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }

  uiHurt(dealt) {
    this.audio.play('hurt');
    const fl = document.getElementById('hurt-flash');
    fl.style.transition = 'none';
    fl.style.opacity = Math.min(0.85, 0.3 + dealt / 50);
    requestAnimationFrame(() => { fl.style.transition = 'opacity .4s ease-out'; fl.style.opacity = 0; });
    const v = this.player.pos.clone(); v.y += 2.4; v.project(this.camera);
    this.ui.float((v.x * 0.5 + 0.5) * innerWidth, (-v.y * 0.5 + 0.5) * innerHeight, '-' + Math.round(dealt), 'hurt');
  }

  tickAbilityCds(dt) {
    for (let i = 0; i < 4; i++) this.abilityCds[i] = Math.max(0, this.abilityCds[i] - dt);
  }

  tickCorruption(dt, isNight) {
    const p = this.player, s = p.stats;
    const biome = this.world.biomeAt(p.pos.x, p.pos.z);
    // THE THIRD BODY: rusted parts cost nothing to wear — the letter and
    // its handwriting have stopped charging each other rent
    let rate = (this.embrace !== null && this.embrace >= 3 ? 0 : s.corruptionRate) / 60; // per second
    if (biome.corrupting) rate += 2.2 / 60;
    if (this.nests.auraAt(p.pos.x, p.pos.z)) rate += 3 / 60; // the nest breathes on you
    if (this.followers.follower) rate *= 0.85; // company quiets the chorus
    // the ferro-cultists' totem keeps the bloom: no scrubbing inside their walls
    const inFerroField = (this._fieldStills || []).some(s => s.temperament === 'ferrocult');
    if (biome.cleansing && !inFerroField) {
      // the salt HOLDS the Rust still — it no longer scrubs it away.
      // Removal is a ritual now: stop at a well and scrape, or harvest at
      // the ferro-cult's. Maintenance, like breathing.
      if (p.corruption > 0 && !this._saltToldYou) {
        this._saltToldYou = true;
        this.ui.toast('the salt holds the Rust still — it will not grow here, and it will not leave', 'good');
      }
      rate = 0;
    } else if (biome.cleansing && inFerroField && !this._ferroToldYou) {
      // the read: the exemption announces itself, once
      this._ferroToldYou = true;
      this.ui.toast('the totem holds the salt OUT — inside these walls, the Rust breathes', 'rust');
    }
    p.corruption = Math.min(100, p.corruption + rate * dt);
    // the state salt cannot touch: at Bloom III nothing scrubs below 40 —
    // not the pans, not the rites, not the little vials
    if (this.embrace !== null && this.embrace >= 3) p.corruption = Math.max(40, p.corruption);

    if (p.corruption >= 50 && this.embrace === null) {
      this.seizureT -= dt * (p.corruption >= 75 ? 2 : 1);
      if (this.seizureT <= 0) {
        this.seizureT = 14 + Math.random() * 14;
        p.stunT = 0.9;
        p.damage(3, true);
        this.shakeT = 0.6;
        this.audio.play('seizure');
        this.ui.toast('THE RUST MOVES IN YOUR JOINTS', 'rust');
      }
    } else if (p.corruption >= 50 && this.embrace !== null) {
      // answered: the body negotiates — a sway, not a seizure. no wound.
      this.seizureT -= dt;
      if (this.seizureT <= 0) {
        this.seizureT = 24 + Math.random() * 22;
        this.shakeT = 0.25;
        this.ui.toast('the rust moves with you, not against', 'rust');
      }
    }
    if (p.corruption >= 99.5 && this.embrace === null) {
      p.damage(2.5 * dt, true); // being consumed — unless you answered
    } else if (p.corruption >= 99.5 && this.embrace !== null && this.embrace >= 3 && !this.fullBloom) {
      this._brimAskT = Math.max(0, (this._brimAskT || 0) - dt);
      if (this.rustCallT <= 0 && (this._brimAskT || 0) <= 0) {
        this._brimAskT = 60;
        this.rustCallT = 30;
        this.ui.toast('…the brim is a door. the last one. we are holding it…', 'rust');
      }
    } else if (p.corruption >= 100 && this.embrace !== null && this.embrace < 3) {
      // THE BLOOM: the brim is a threshold, not a drowning
      this.embrace += 1;
      p.corruption = 40;
      this.player.embraceLevel = this.embrace;
      this.player.recompute(this.equipped); // the body shows it
      this.shakeT = 1.2;
      this.audio.play('seizure'); this.audio.play('bell');
      this.vfx.ring(p.pos, { color: 0xff5a2a, r0: 0.5, r1: 14, dur: 0.9, width: 0.6 });
      const names = ['', 'THE FIRST BLOOM', 'THE SECOND BLOOM', 'THE THIRD BLOOM'];
      this.ui.toast(`${names[this.embrace]} — the brim was a door`, 'rust');
      this.journal.push({
        type: 'lore', cat: 'event', title: names[this.embrace],
        body: `on day ${1 + Math.floor(this.worldT)} you carried the letter to the brim, and instead of drowning: a bloom. the body wears it openly now. ${this.embrace >= 1 ? 'the whispers resolved into a sense — salvage sings through walls, and the wild rustforms read you as kin.' : ''}`,
      });
      this.recordEvent('bloom', names[this.embrace].toLowerCase());
    }
    this.whisperT -= dt;
    if (this.whisperT <= 0) {
      this.whisperT = 50 + Math.random() * 60;
      if (p.corruption >= 25) {
        this.ui.toast(whisper(p.corruption, new Rand((Math.random() * 0xffffffff) >>> 0)), 'rust');
        // past 50, the letter can be answered: some whispers wait for a reply
        if (p.corruption >= 50 && this.embrace === null && Math.random() < 0.55) {
          this.rustCallT = 26;
          this.ui.toast('the whisper hangs in the air, waiting', 'rust');
        }
      }
    }
    this.rustCallT = Math.max(0, this.rustCallT - dt);
    this._callCdT = Math.max(0, (this._callCdT || 0) - dt);
    // the carrying: stories walk the roads once per world-day
    const carryDay = Math.floor(this.worldT);
    if (this._carryDay === undefined) this._carryDay = carryDay;
    if (carryDay !== this._carryDay) {
      this._carryDay = carryDay; this.carryStories(); this.covetingCheck();
      this.fallTick(carryDay);
      this.warSys.tick(carryDay);
      // the glass-wind is forecast a day out — the read before the bite
      if (this.season && this.season.id === 'glasswind' && shardForecast(this.seed, this.worldT) && this._shardWarnedDay !== carryDay) {
        if (shardStormAt(this.seed, this.worldT) < 0.1) {
          this._shardWarnedDay = carryDay;
          this.ui.toast('the wind is going green at the edges — a SHARD STORM inside a day', 'rust');
        }
      }
      // THE VEIL closes roads: once a day, sandstorm season may bury a
      // nearby route for two days — scarcity follows through the markets
      if (this.season && this.season.id === 'veil'
        && hash2(this.seed, hashString('veilroad') | 0, carryDay) % 100 < 22) {
        const routes = this.caravans.routesNear(p.pos.x, p.pos.z)
          .filter(rt => !((this.routesCut[rt.key] || 0) > this.worldT));
        if (routes.length) {
          const rt = routes[hash2(this.seed, hashString('veilpick') | 0, carryDay) % routes.length];
          this.routesCut[rt.key] = this.worldT + 2;
          this.ui.toast(`THE VEIL BURIES THE ${rt.a.name.toUpperCase()}–${rt.b.name.toUpperCase()} ROAD — two days, maybe more`, 'rust');
          this.journal.push({
            type: 'lore', cat: 'event', title: 'THE ROAD, BURIED',
            body: `sandstorm season closed the ${rt.a.name}–${rt.b.name} road on day ${1 + carryDay}. the markets will feel it before the caravans do.`,
          });
        }
      }
    }
    // the crews finish what was funded — and the veil slows every hand.
    // Progress accrues in WORLD time (crews work while you sleep or rest),
    // ×1/1.5 under sandstorm season.
    const crewDelta = Math.max(0, this.worldT - (this._crewT ?? this.worldT));
    this._crewT = this.worldT;
    const crewRate = this.season && this.season.id === 'veil' ? 1 / 1.5 : 1;
    for (const key of Object.keys(this.pendingWorks)) {
      const pend = this.pendingWorks[key];
      for (let i = pend.length - 1; i >= 0; i--) {
        if (pend[i].ready !== undefined) { // migrate the old fixed-date format
          pend[i] = { what: pend[i].what, left: Math.max(0, pend[i].ready - this.worldT) };
        }
        pend[i].left -= crewDelta * crewRate;
        if (pend[i].left > 0) continue;
        const what = pend[i].what;
        pend.splice(i, 1);
        const wk = this.stakeWorks[key] || (this.stakeWorks[key] = {});
        if (what === 'market') wk.market = true; else wk[what] = (wk[what] || 0) + 1;
        if (this.stills.loaded.has(key)) { this._skipJudgment = true; this.stills.reload(key); this._skipJudgment = false; }
        this.audio.play('bell');
        const DONE = { homes: 'A HOME STANDS — word goes out for a settler', market: 'THE MARKET ROW STANDS — the brokers will smell it', walls: 'THE WALL GROWS A COURSE OF STONE', turrets: 'A NEW GUN ON THE WALL, WATCHING OUTWARD' };
        this.ui.toast(`THE WORKS: ${DONE[what]}`, 'good');
      }
      if (!pend.length) delete this.pendingWorks[key];
    }
    // THE POLISHED: zero rust, zero embrace, a full Mk.3 chassis, standing
    // on the white ground — the monks mark the other perfect answer
    this._polishT = (this._polishT ?? 4) - dt;
    if (this._polishT <= 0 && !this.polished) {
      this._polishT = 4;
      if (p.corruption <= 0 && this.embrace === null && !this.deepMarked) {
        const full3 = SLOTS.every(sl => this.equipped[sl] && this.equipped[sl].tier >= 3 && !this.equipped[sl].rusted);
        const monkHere = (this._fieldStills || []).find(s2 => s2.temperament === 'monastic');
        if (full3 && monkHere) {
          this.polished = true;
          this.audio.play('bell');
          this.ui.toast('THE POLISHED — the order marks you: immaculate, at full temper', 'good');
          this.rootStory('story:polished', 'polished', 'the walker stood on the white ground with a chassis at full temper and not a grain of the Rust in it. the monks wrote the name in salt.', { stills: [monkHere] });
          this.journal.push({
            type: 'lore', cat: 'event', title: 'THE POLISHED',
            body: `on day ${1 + Math.floor(this.worldT)} the order of ${monkHere.name} named you what the rite is for: polished, immaculate, sealed. the other answer, given all the way.`,
          });
          this.appendHistory(monkHere.key, `on day ${1 + Math.floor(this.worldT)}, the order marked a walker POLISHED — full temper, clean seams — and rang the wall bells once, which is all the celebrating they do.`);
          this.changeRep(monkHere, 15);
        }
      }
    }
    // RUSTSIGHT (Bloom I+): every few seconds, salvage answers through walls
    if (this.embrace !== null && this.embrace >= 1) {
      this.rustsightT = (this.rustsightT ?? 3) - dt;
      if (this.rustsightT <= 0) {
        this.rustsightT = 6.5;
        const pings = [];
        for (const ent of this.world.entitiesNear(p.pos.x, p.pos.z, 46)) {
          if (ent.kind === 'wreck' || ent.kind === 'shard' || ent.kind === 'cache') pings.push({ x: ent.x ?? ent.pos?.x, y: (ent.y ?? ent.pos?.y ?? this.world.getHeight(ent.x, ent.z)) + 1.2, z: ent.z ?? ent.pos?.z });
        }
        if (this.interiors.active) {
          const a = this.interiors.active;
          for (const pile of a.piles || []) if (!this.world.looted.has(pile.id) && Math.hypot(pile.x - p.pos.x, pile.z - p.pos.z) < 46) pings.push({ x: pile.x, y: pile.mesh.position.y + 1, z: pile.z });
          if (a.cache && !a.cache.opened && Math.hypot(a.cache.x - p.pos.x, a.cache.z - p.pos.z) < 46) pings.push({ x: a.cache.x, y: (a.cache.y ?? p.pos.y) + 1.2, z: a.cache.z });
        }
        for (const ping of pings.slice(0, 8)) this.vfx.rustsight(ping);
      }
    }
  }

  tickLocale(dt) {
    this.localeT = (this.localeT || 0) - dt;
    if (this.localeT > 0) return;
    this.localeT = 1.2;
    const p = this.player.pos;
    const newRegion = this.world.regionName(p.x, p.z);
    if (newRegion !== this.regionName) {
      this.regionName = newRegion;
      this.ui.toast(`entering ${newRegion}`);
    }
    const b = this.world.biomeAt(p.x, p.z);
    this.biomeName = b.name;
    this.biomeId = b.id;
  }
}

// ================= title screen =================
const ASCII = String.raw`
        .  .       _._     .    .       *
   .         __  /     \ __        .
  ____,.--''  | |  ___  | |''--.,____    .
 |    ;  ▓▓   | | |▓▓▓| | |  ▓▓   ;   |
_|____;_______|_|_|___|_|_|_______;___|__
  ~  ~~   ~ ~     ~~~ ~   ~~  ~  ~~  ~`;

function initTitle() {
  document.getElementById('title-art').textContent = ASCII;
  document.getElementById('btn-credits').addEventListener('click', () =>
    document.getElementById('credits-panel').classList.remove('hidden'));
  document.getElementById('btn-credits-close').addEventListener('click', () =>
    document.getElementById('credits-panel').classList.add('hidden'));
  document.getElementById('title-foot').textContent =
    `“${ARC}” · ${LABEL} — everything you will see has been grown from a seed`;
  const slotList = document.getElementById('slot-list');
  const seedRow = document.getElementById('seed-row');
  const seedInput = document.getElementById('seed-input');
  const btnStart = document.getElementById('btn-start');
  const bgList = document.getElementById('bg-list');
  let pendingSlot = 1;
  let chosenBg = 'waker';

  const start = (phrase, saved, slot, bg) => {
    document.getElementById('title-screen').style.display = 'none';
    document.getElementById('hud').classList.remove('hidden');
    window.game = new Game(phrase, saved, slot, bg);
    // the debug console loads ONLY when the dev server answers the probe —
    // static/public hosting 404s, so js/debug.js never runs in the wild
    if (!window.SAR_DEBUG_INIT) {
      window.SAR_DEBUG_INIT = true;
      fetch('/__dev__', { method: 'HEAD' })
        .then(r => { if (r.ok) import('./debug.js').then(m => m.initDebug(() => window.game)); })
        .catch(() => {});
    }
  };

  // who were you, before the sand?
  for (const bg of BACKGROUNDS) {
    const b = document.createElement('button');
    b.className = 'bg-opt' + (bg.id === chosenBg ? ' selected' : '');
    b.innerHTML = `${bg.label}<span class="bg-desc">${bg.desc}</span>`;
    b.addEventListener('click', () => {
      chosenBg = bg.id;
      document.querySelectorAll('.bg-opt').forEach(x => x.classList.toggle('selected', x === b));
    });
    bgList.appendChild(b);
  }

  const renderSlots = () => {
    slotList.innerHTML = '';
    for (const meta of listSaves()) {
      const row = document.createElement('div');
      row.className = 'slot-row';
      const btn = document.createElement('button');
      btn.className = 'title-btn';
      if (meta.exists) {
        btn.innerHTML = `RESUME — SLOT ${meta.slot}<span class="slot-meta">seed “${meta.seedPhrase}” · day ${meta.day} · ${meta.kills} machines down</span>`;
        btn.addEventListener('click', () => {
          const saved = loadGame(meta.slot);
          if (saved) start(saved.seedPhrase, saved, meta.slot, saved.background || 'waker');
        });
        const erase = document.createElement('button');
        erase.className = 'slot-erase';
        erase.textContent = '✕';
        erase.title = 'erase this awakening';
        erase.addEventListener('click', () => {
          if (confirm(`Erase slot ${meta.slot} (“${meta.seedPhrase}”)? The desert will not remember it.`)) {
            clearSave(meta.slot);
            renderSlots();
          }
        });
        row.append(btn, erase);
      } else {
        btn.innerHTML = `NEW AWAKENING — SLOT ${meta.slot}<span class="slot-meta">empty</span>`;
        btn.addEventListener('click', () => {
          pendingSlot = meta.slot;
          bgList.classList.remove('hidden');
          seedRow.classList.remove('hidden');
          seedInput.focus();
        });
        row.append(btn);
      }
      slotList.appendChild(row);
    }
  };
  renderSlots();

  const go = () => {
    clearSave(pendingSlot);
    const phrase = seedInput.value.trim() || Math.random().toString(36).slice(2, 10);
    start(phrase, null, pendingSlot, chosenBg);
  };
  btnStart.addEventListener('click', go);
  seedInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}

initTitle();
