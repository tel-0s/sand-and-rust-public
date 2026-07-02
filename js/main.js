// SAND & RUST — a mind in a chassis, an endless procedural desert.
import * as THREE from 'three';
import { hashString, Rand, hash2 } from './rng.js';
import { World, CHUNK } from './world.js';
import { Player } from './player.js';
import { EnemyManager } from './enemies.js';
import { Projectiles } from './combat.js';
import { starterLoadout, abilityLoadout, randomPart, makePart, SLOTS, ABILITIES } from './parts.js';
import { CONSUMABLES, rollWreckLoot, rollCacheLoot, craft, MATERIALS } from './items.js';
import { Names } from './grammar.js';
import { UI } from './ui.js';
import { VFX } from './vfx.js';
import { AudioEngine } from './audio.js';
import { SETTINGS, saveSettings, VIEW_DIST, DIFFICULTY } from './settings.js';
import { Simplex2, smoothstep } from './noise.js';
import { makeCircle, inFootprint } from './collision.js';
import { StillManager } from './stills.js';
import { CampManager, FollowerSystem } from './wanderers.js';
import { NestManager } from './nests.js';
import { EventSystem } from './events.js';
import { stillHistory, memorialLines, composeInteriorDoc } from './lore.js';
import { BUILD, ARC, LABEL } from './version.js';
import { generateChain, setChainCounter, getChainCounter } from './quests.js';
import { composeShard, composeSignal, whisper, bearingWord } from './lore.js';
import {
  TEMPERAMENTS, effDisposition, dispTier, greeting, smalltalk, rumorText, noRumor,
  aboutSelf, buyPrice, sellPrice, partPrice, MAT_VALUES, CONSUMABLE_VALUES,
  residentGossip, neighborGossip, noNeighbors, gossipDry, eventLine, WELL_FLAVOR,
  roadTalk, recruitLine, dismissLine, downLine, MARKET_TALK, decorate,
} from './dialogue.js';
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
    this.nameOverrides = {};      // names kept against the drift of the pools, by npc id
    this.routesCut = {};          // roads that lost their caravan: routeKey -> quiet until worldT
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
      nameOverride: (id) => this.nameOverrides[id],
      safeZones: this.enemies.safeZones,
      isRecruited: (id) => this.recruitedIds.includes(id),
      isDead: (id) => this.deadNpcIds.includes(id),
      hasFundedTurret: (key) => !!this.fundedTurrets[key],
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
        this.audio.play('chime');
        this.ui.toast(`STILL FOUND: ${s.name.toUpperCase()} — ${TEMPERAMENTS[s.temperament].label}`, 'good');
        this.journal.push({
          type: 'lore', cat: 'place', title: s.name.toUpperCase(),
          body: `a ${TEMPERAMENTS[s.temperament].label.toLowerCase()} still beside the salt. ${s.residents} souls keep the well, and the feral ones do not cross their wall. marked on the map.`,
        });
      },
    });

    // camps: fires on the open lattice, and the system for who walks with you
    this.camps = new CampManager(this.scene, this.world, this.stills, {
      isRecruited: (id) => this.recruitedIds.includes(id),
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
    this.followers.onDown = (f) => {
      this.ui.toast(downLine(f, new Rand((Math.random() * 0xffffffff) >>> 0)), 'rust');
      this.npcDisp[f.id] = Math.max(-40, (this.npcDisp[f.id] || 0) - 3);
      this.recruitedIds = this.recruitedIds.filter(id => id !== f.id);
      this.reloadHomeOf(f.id);
      saveGame(this);
    };
    this.followers.onHeal = (f) => {
      this.vfx.rise(this.player.pos, { color: 0x6fe8d0, r: 1.2, dur: 0.4 });
    };
    this.followers.onStrike = () => { this.audio.play('hit'); };

    // fabricator nests: the Rust's industry, and the world's event clock
    this.nests = new NestManager(this.scene, this.world, {
      isDestroyed: (key) => !!this.destroyedNests[key],
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
    this.topics = d.topics || [];
    this.epic = d.epic || null;
    this.nameOverrides = d.nameOverrides || {};
    this.routesCut = d.routesCut || {};
    this.deadNpcIds = d.deadNpcIds || [];
    this.destroyedNests = d.destroyedNests || {};
    this.histories = d.histories || {};
    this.memorials = d.memorials || {};
    this.fundedTurrets = d.fundedTurrets || {};
    this.revived = d.revived || {};
    for (const k of Object.keys(this.megaAnchors)) this.world.anchorActiveSet.add(k);
    if (d.follower) this.followers.restore(d.follower, this.player.pos);
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
    const f = this.followers.follower;
    if (f) { f.pos.set(this.player.pos.x + 1.4, this.player.pos.y, this.player.pos.z + 1); f.mesh.position.copy(f.pos); }
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
    this.interiors.exit(this.player, teleportBack);
    for (let i = this.enemies.enemies.length - 1; i >= 0; i--) this.enemies.remove(i);
    this.enemies.suppressSpawn = false;
    if (teleportBack) {
      const f = this.followers.follower;
      if (f) { f.pos.set(this.player.pos.x + 1.4, this.player.pos.y, this.player.pos.z + 1); f.mesh.position.copy(f.pos); }
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
      const doc = this.interiors.docNear(this.player.pos, 3);
      if (doc) {
        this.world.looted.add(doc.id);
        doc.mesh.visible = false;
        const mega = this.interiors.active.mega;
        const d = composeInteriorDoc(this.world, this.stills, mega, doc.salt, doc.roomKind);
        this.journal.push({ type: 'lore', cat: 'memory', title: d.title, body: `${d.body}\n\n— recovered from the ${doc.roomKind}, ${mega.name}, day ${1 + Math.floor(this.worldT)}` });
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
    // your follower, then settlement folk, then road folk
    const f = this.followers.follower;
    if (f && Math.hypot(f.pos.x - this.player.pos.x, f.pos.z - this.player.pos.z) < 2.5) {
      this.openDialogue(f); return;
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
    const well = this.stills.wellNear(this.player.pos, 4.5);
    if (well && !ent) { this.openWell(well); return; }
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
    effD += (this.stillRep[npc.still.key] || 0) * 0.25; // the still's regard colours everyone's
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
    const moodVal = Math.min(1.35, Math.max(0.85, sum / n));
    const word = moodVal > 1.24 ? 'starved' : moodVal > 1.12 ? 'lean' : moodVal < 0.98 ? 'flush' : 'steady';
    return { mul, moodVal, word, cut: routes.length - open.length, routes: routes.length };
  }

  openDialogue(npc) {
    this.dlg = { npc, view: 'root', lines: [], rand: new Rand((Math.random() * 0xffffffff) >>> 0) };
    this.topicsSys.openContext(npc);
    const { tier } = this.calcDisp(npc);
    this.dlg.lines.push({ text: greeting(npc, tier.cls, this.dlg.rand) });
    this.audio.play('talk');
    this.ui.toggle('dialogue');
    this.renderDlg();
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
      this.stills.reload(still.key); // the living straighten out immediately
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

  openWell(still) {
    this.backfillMemorials(still);
    const pseudo = {
      id: 'well:' + still.key, isWell: true, still, temperament: still.temperament,
      name: 'the well', role: 'services', baseDisp: 0, trader: false,
    };
    this.dlg = { npc: pseudo, view: 'well', lines: [], rand: new Rand((Math.random() * 0xffffffff) >>> 0) };
    this.topicsSys.openContext(pseudo);
    this.dlg.lines.push({ text: this.dlg.rand.pick(WELL_FLAVOR[still.temperament]) });
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
      l.html = this.topicsSys.linkify(l.text).html;
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
      temperamentLabel: TEMPERAMENTS[d.npc.temperament].label,
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
    if (d.view === 'well') {
      const p = this.player, hostile = tier.cls === 'hostile';
      const rep = this.stillRep[npc.still.key] || 0;
      opts.push({ header: `SERVICES — STANDING: ${Math.round(rep)} · YOUR SCRAP: ${scrap} ▤` });
      if (hostile) {
        opts.push({ header: 'the well is covered when you approach. no service here.' });
      } else {
        const restCost = effD >= 20 ? 0 : 2;
        opts.push({ id: 'svc:rest', label: '◑ rest until dawn — hull & power restored', price: restCost || undefined, disabled: scrap < restCost });
        const missing = p.stats.maxHull - p.hull;
        const repCost = Math.max(1, Math.ceil(missing / 12 * (1 - effD / 200)));
        opts.push({ id: 'svc:repair', label: '✚ patch the hull', price: repCost, disabled: missing < 1 || scrap < repCost });
        if (npc.temperament === 'monastic') {
          const saltCost = Math.max(1, Math.ceil(p.corruption / 25));
          opts.push({ id: 'svc:scrub', label: `❄ scrub the Rust (−${Math.round(p.corruption)} corruption, costs ${saltCost} salt)`, disabled: p.corruption < 1 || (mats.salt || 0) < saltCost });
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
        if (npc.recruitable && !npc.isFollower && !this.followers.follower && effD >= 50) {
          opts.push({ id: 'recruit', label: `» walk with me, ${npc.name.split(' ')[0]}` });
        }
      }
      if (npc.isFollower) opts.push({ id: 'partways', label: '» part ways here', cls: 'leave' });
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
    const sys = (text) => d.lines.push({ text, sys: true });

    if (id === 'leave') { this.ui.closePanel(); this.dlg = null; return; }
    if (id === 'back') { d.view = 'root'; this.renderDlg(); return; }

    // ---- topics: ask after a subject ----
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
      this.followers.recruit(npc, npc.still ? npc.still.name : 'the road');
      this.recruitedIds.push(npc.id);
      // pull them out of their home roster so they aren't in two places
      this.camps.removeWanderer(npc.id);
      for (const rec of this.stills.loaded.values()) {
        const i = rec.npcs.findIndex(n => n.id === npc.id);
        if (i >= 0) { rec.npcs[i].dispose(this.scene); rec.npcs.splice(i, 1); }
      }
      say(recruitLine(npc, rand));
      sys(`— ${npc.name} walks with you now. ${npc.role}s ${['fight at your side', 'mend you on the road'][this.followers.follower.archetype === 'mender' ? 1 : 0]}. company quiets the chorus.`);
      this.recordEvent('helped', npc.still ? npc.still.name : 'the road');
      saveGame(this);
      this.ui.closePanel(); this.dlg = null;
      this.ui.toast(`${npc.name.toUpperCase()} WALKS WITH YOU`, 'good');
      return;
    }
    if (id === 'partways') {
      const f = this.followers.follower;
      say(dismissLine(f, rand));
      this.npcDisp[f.id] = Math.max(-40, Math.min(40, (this.npcDisp[f.id] || 0) + 2));
      this.recruitedIds = this.recruitedIds.filter(x => x !== f.id);
      this.followers.dismiss();
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
      // your deeds travel: sometimes the talk is about you
      if (this.events.length && rand.chance(0.35)) {
        say(eventLine(npc, rand.pick(this.events), rand));
      } else {
        // ground the smalltalk in what actually stands nearby
        const megas = this.world.megasNear(npc.still.x, npc.still.z, 2400);
        const m = megas[0] || null;
        say(smalltalk(npc, rand, {
          region: this.world.regionName(npc.still.x, npc.still.z),
          mega: m ? { name: m.name, dir: bearingWord(m.x - npc.still.x, m.z - npc.still.z) } : null,
          isNight: Math.sin(this.dayT * Math.PI * 2) < -0.08,
          storm: this.storm,
        }));
      }
      this.renderDlg(); return;
    }
    if (id === 'self') {
      // one beat per click: themselves first, then opinions of the neighbors-in-walls
      d.selfTurns = (d.selfTurns || 0) + 1;
      if (npc.opinionOf && d.selfTurns % 2 === 0) say(residentGossip(npc, npc.opinionOf, rand));
      else say(aboutSelf(npc, rand));
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
      if (id === 'svc:rest') {
        const cost = effD >= 20 ? 0 : 2;
        if ((mats.scrap || 0) < cost) return;
        mats.scrap -= cost;
        p.hull = p.stats.maxHull; p.energy = p.stats.energyCap;
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
      } else if (id === 'svc:scrub') {
        const cost = Math.max(1, Math.ceil(p.corruption / 25));
        if (p.corruption < 1 || (mats.salt || 0) < cost) return;
        mats.salt -= cost;
        p.corruption = 0;
        this.vfx.rise(p.pos, { color: 0xffffff, r: 1.8 });
        sys(`the Rust is scoured from your seams · −${cost} ❄ salt`);
        say('white ground is clean ground. so are you, for now.');
        this.changeRep(npc.still, 1);
      } else if (id === 'svc:memorial') {
        for (const l of memorialLines(this.world, npc.still, this.memorials[npc.still.key] || [])) say(l);
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
        this.stills.reload(npc.still.key);
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
        this.stills.reload(npc.still.key);
        this.appendHistory(npc.still.key, `on day ${1 + Math.floor(this.worldT)}, a wanderer carried a Neuromanifold Shaper up out of ${e.megaName} and gave it to the well, and the well gave back ${e.npcName} — all of them, down to the weave. the Shaper sang once and went still. nobody here will say the word miracle. everybody here means it.`);
        this.changeRep(npc.still, 8);
        this.npcDisp[e.npcId] = 40; // they remember everything, including this
        this.recordEvent('helped', npc.still.name);
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
    const result = craft(r, this.inventory.mats);
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
    // pixel modes: pull the haze in slightly — distant subpixel geometry shimmers otherwise
    this.fogTrim = SETTINGS.video.renderScale <= 0.5 ? 0.86 : 1;
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
      // storm fronts ride a slow noise field over world-time
      const sn = 0.5 + 0.5 * this.stormNoise.noise(this.worldT * 0.9, 3.7);
      const target = this._stormOverride ?? smoothstep(0.7, 0.86, sn);
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
    this.clockText = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')} ${this.storm > 0.25 ? '· SANDSTORM — the compass swims' : isNight ? '· NIGHT — they are bolder now' : ''}`;

    if (!this.dead && !paused) {
      const inp = this.input;
      const wasGrounded = p.grounded, lastX = p.pos.x, lastZ = p.pos.z;
      p.update(dt, inp, this.camYaw, this.world);
      // who's near a field? (used for shelter, healing, and the safety hum)
      const inAnchor = Math.hypot(p.pos.x - this.safeZone.x, p.pos.z - this.safeZone.z) < this.safeZone.r;
      const fieldStills = this.stills.loadedStillsWithin(p.pos, 45);
      this._fieldStills = fieldStills;
      const inField = inAnchor || fieldStills.length > 0;
      // the storm leans on you — unless something tall breaks the wind
      if (this.storm > 0.05 && !this.interiors.active) {
        let sheltered = inField;
        if (!sheltered) {
          for (const c of this.world.collidersNear(p.pos.x, p.pos.z)) {
            if (c.top > p.pos.y + 2 && inFootprint(c, p.pos.x, p.pos.z, 5)) { sheltered = true; break; }
          }
        }
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
      this.followers.update(dt, p, this.enemies);
      this.nests.update(dt, p, this.enemies);
      this.eventSys.update(dt);
      const allies = [
        ...(this.followers.follower ? [this.followers.follower] : []),
        ...this.camps.alliesNear(p.pos, 80),
        ...this.caravans.alliesNear(p.pos, 90),
        // during a raid, the residents are in the fight too
        ...(this.eventSys.raidActive ? this.stillDefenders() : []),
      ];
      this.enemies.aggroMul = this.interiors.active ? 1 : 1 - this.storm * 0.55; // storms hunt blind
      this.enemies.update(dt, p, this.projectiles, isNight, allies);
      // the desert's voice
      const distMoved = Math.min(5, Math.hypot(p.pos.x - lastX, p.pos.z - lastZ));
      const moving = (p.vel.x * p.vel.x + p.vel.z * p.vel.z) > 1;
      this.audio.update(dt, {
        storm: this.storm, corruption: p.corruption, inField,
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
      this.stills.update(dt, p, isNight, this.enemies);
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
        el.innerHTML = `${te.name}${te.infected ? ' <span style="color:var(--rust-bright)">[INFECTED]</span>' : ''}${worn ? `<br><span style="color:var(--amber-dim)">${worn}</span>` : ''}`;
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
      } else if (well && !ent) {
        this.ui.showInteract(`<b>[E]</b> THE WELL — rest · repair${well.temperament === 'monastic' ? ' · scrub the Rust' : well.temperament === 'ferrocult' ? ' · harvest the bloom' : ''}`);
      } else if (ent) {
        const label = { wreck: 'SALVAGE WRECK', shard: 'ABSORB MEMORY SHARD', beacon: 'TRIANGULATE SIGNAL', cache: 'OPEN CACHE' }[ent.kind];
        this.ui.showInteract(`<b>[E]</b> ${label}`);
      } else this.ui.showInteract(null);
      }
    }
    this.saveT -= dt;
    if (this.saveT <= 0) { this.saveT = 20; if (!this.dead) saveGame(this); }

    this.ui.updateHUD(this.camYaw);
    this.ui.updateEnemyBars(this.enemies.enemies, this.camera, this.renderer);
    this.renderer.render(this.scene, this.camera);
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
    let rate = s.corruptionRate / 60; // per second
    if (biome.corrupting) rate += 2.2 / 60;
    if (this.nests.auraAt(p.pos.x, p.pos.z)) rate += 3 / 60; // the nest breathes on you
    if (this.followers.follower) rate *= 0.85; // company quiets the chorus
    // the ferro-cultists' totem keeps the bloom: no scrubbing inside their walls
    const inFerroField = (this._fieldStills || []).some(s => s.temperament === 'ferrocult');
    if (biome.cleansing && !inFerroField) {
      if (p.corruption > 0) {
        p.corruption = Math.max(0, p.corruption - (5 / 60) * dt * 60);
        if (!this._saltToldYou) { this._saltToldYou = true; this.ui.toast('the salt is scouring the Rust from your seams', 'good'); }
      }
      rate = 0;
    }
    p.corruption = Math.min(100, p.corruption + rate * dt);

    if (p.corruption >= 50) {
      this.seizureT -= dt * (p.corruption >= 75 ? 2 : 1);
      if (this.seizureT <= 0) {
        this.seizureT = 14 + Math.random() * 14;
        p.stunT = 0.9;
        p.damage(3, true);
        this.shakeT = 0.6;
        this.audio.play('seizure');
        this.ui.toast('THE RUST MOVES IN YOUR JOINTS', 'rust');
      }
    }
    if (p.corruption >= 99.5) {
      p.damage(2.5 * dt, true); // being consumed
    }
    this.whisperT -= dt;
    if (this.whisperT <= 0) {
      this.whisperT = 50 + Math.random() * 60;
      if (p.corruption >= 25) {
        this.ui.toast(whisper(p.corruption, new Rand((Math.random() * 0xffffffff) >>> 0)), 'rust');
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
