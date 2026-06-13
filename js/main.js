// SAND & RUST — a mind in a chassis, an endless procedural desert.
window.SAR_BUILD = 'v0.7-dev';
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
import { stillHistory, memorialLines } from './lore.js';
import { generateChain, setChainCounter, getChainCounter } from './quests.js';
import { composeShard, composeSignal, whisper, bearingWord } from './lore.js';
import {
  TEMPERAMENTS, effDisposition, dispTier, greeting, smalltalk, rumorText, noRumor,
  aboutSelf, buyPrice, sellPrice, partPrice, MAT_VALUES, CONSUMABLE_VALUES,
  residentGossip, neighborGossip, noNeighbors, gossipDry, eventLine, WELL_FLAVOR,
  roadTalk, recruitLine, dismissLine, downLine,
} from './dialogue.js';
import { saveGame, loadGame, clearSave, listSaves } from './save.js';

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
    this.memorials = {};          // the recent dead, by still key: [{name, day}]
    this.trackedChainId = null;   // the job pinned to your compass
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
      safeZones: this.enemies.safeZones,
      isRecruited: (id) => this.recruitedIds.includes(id),
      isDead: (id) => this.deadNpcIds.includes(id),
      onNpcDeath: (n, still) => {
        this.deadNpcIds.push(n.id);
        if (!this.memorials[still.key]) this.memorials[still.key] = [];
        this.memorials[still.key].push({ name: n.name, day: 1 + Math.floor(this.worldT) });
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
    this.trackedChainId = d.trackedChainId || null;
    this.deadNpcIds = d.deadNpcIds || [];
    this.destroyedNests = d.destroyedNests || {};
    this.histories = d.histories || {};
    this.memorials = d.memorials || {};
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
  reticleEnemy() {
    const rd = this.reticleDir();
    let best = null, bestDot = 0.955;
    for (const e of this.enemies.enemies) {
      if (e.pos.distanceTo(this.player.pos) > 95) continue;
      const ec = e.pos.clone(); ec.y += e.def.scale;
      const dot = ec.sub(this.camera.position).normalize().dot(rd);
      if (dot > bestDot) { bestDot = dot; best = e; }
    }
    return best;
  }
  aimRay() {
    const from = this.player.pos.clone(); from.y += 1.8;
    const rd = this.reticleDir();
    // soft assist: an enemy near the reticle ray captures the aim point
    let target = null, bestDot = 0.945;
    for (const e of this.enemies.enemies) {
      const ec = e.pos.clone(); ec.y += e.def.scale;
      const dot = ec.clone().sub(this.camera.position).normalize().dot(rd);
      if (dot > bestDot) { bestDot = dot; target = ec; }
    }
    if (!target) {
      // march the reticle ray against the terrain
      for (let t = 6; t < 90; t += 2) {
        const px = this.camera.position.x + rd.x * t;
        const py = this.camera.position.y + rd.y * t;
        const pz = this.camera.position.z + rd.z * t;
        if (py < this.world.getHeight(px, pz)) { target = new THREE.Vector3(px, py, pz); break; }
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

  interact() {
    const ent = this.nearestEntity();
    // your follower, then settlement folk, then road folk
    const f = this.followers.follower;
    if (f && Math.hypot(f.pos.x - this.player.pos.x, f.pos.z - this.player.pos.z) < 2.5) {
      this.openDialogue(f); return;
    }
    const npc = this.stills.npcNear(this.player.pos, 2.8) || this.camps.wandererNear(this.player.pos, 2.8);
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
      if (q) { q.done = true; this.ui.toast('SIGNAL RESOLVED', 'good'); this.recordEvent('signal', q.title.replace('SIGNAL: ', '').toLowerCase() + ' signal'); }
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

  trackChain(id) {
    if (this.trackedChainId === id) {
      this.trackedChainId = null;
      this.ui.toast('task unpinned from compass');
    } else {
      this.trackedChainId = id;
      this.ui.toast('task pinned to compass', 'good');
    }
    saveGame(this);
  }

  finishChain(chain, sys) {
    chain.steps[chain.current].done = true;
    chain.done = true;
    if (this.trackedChainId === chain.id) this.trackedChainId = null;
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

  openDialogue(npc) {
    this.dlg = { npc, view: 'root', lines: [], rand: new Rand((Math.random() * 0xffffffff) >>> 0) };
    const { tier } = this.calcDisp(npc);
    this.dlg.lines.push({ text: greeting(npc, tier.cls, this.dlg.rand) });
    this.audio.play('talk');
    this.ui.toggle('dialogue');
    this.renderDlg();
  }

  openWell(still) {
    const pseudo = {
      id: 'well:' + still.key, isWell: true, still, temperament: still.temperament,
      name: 'the well', role: 'services', baseDisp: 0, trader: false,
    };
    this.dlg = { npc: pseudo, view: 'well', lines: [], rand: new Rand((Math.random() * 0xffffffff) >>> 0) };
    this.dlg.lines.push({ text: this.dlg.rand.pick(WELL_FLAVOR[still.temperament]) });
    this.ui.toggle('dialogue');
    this.renderDlg();
  }

  renderDlg() {
    const d = this.dlg;
    if (!d) return;
    const { effD, tier } = this.calcDisp(d.npc);
    if (d.lines.length > 8) d.lines.splice(0, d.lines.length - 8);
    this.ui.renderDialogue({
      npc: d.npc, effD, tier,
      temperamentLabel: TEMPERAMENTS[d.npc.temperament].label,
      lines: d.lines,
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
      opts.push({ header: `THEY SELL — YOUR SCRAP: ${scrap} ▤` });
      for (const cid of t.stock) {
        const c = CONSUMABLES[cid];
        const price = buyPrice(CONSUMABLE_VALUES[cid], npc.temperament, effD);
        opts.push({ id: 'buyc:' + cid, label: `${c.icon} ${c.name}`, price, disabled: scrap < price });
      }
      const SELL_MATS = { mercantile: ['coil', 'glass', 'cell'], monastic: ['salt'], scavver: ['coil', 'glass'], ferrocult: ['nodule', 'cell'] };
      for (const mid of SELL_MATS[npc.temperament]) {
        const m = MATERIALS[mid];
        const price = buyPrice(MAT_VALUES[mid], npc.temperament, effD);
        opts.push({ id: 'buym:' + mid, label: `${m.icon} ${m.name}`, price, disabled: scrap < price });
      }
      opts.push({ header: 'THEY BUY' });
      for (const [mid, n] of Object.entries(this.inventory.mats)) {
        if (mid === 'scrap' || n <= 0 || !MAT_VALUES[mid]) continue;
        const m = MATERIALS[mid];
        opts.push({ id: 'sellm:' + mid, label: `${m.icon} ${m.name} (have ${n})`, price: sellPrice(MAT_VALUES[mid], npc.temperament, effD) });
      }
      if (TEMPERAMENTS[npc.temperament].partsBuyer) {
        const parts = this.inventory.parts.slice(0, 8);
        if (parts.length) opts.push({ header: 'PARTS' });
        for (const part of parts) {
          opts.push({ id: 'sellp:' + part.uid, label: `${part.name} — ${part.tierName}`, price: partPrice(part, npc.temperament) });
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

    // ---- work chains ----
    if (id === 'work') {
      const chain = generateChain(this.world, npc, this.stills.stillsNear(npc.still.x, npc.still.z, 6500));
      d.offer = chain; d.view = 'offer';
      say(chain.pitch);
      this.renderDlg(); return;
    }
    if (id === 'accept') {
      this.chains.push(d.offer);
      this.activateChainStep(d.offer);
      if (!this.trackedChainId) this.trackedChainId = d.offer.id; // first job pins itself
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
          const skip = (0.27 - this.dayT + 1) % 1;
          this.dayT = 0.27;
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
    if (id.startsWith('buyc:')) {
      const cid = id.slice(5);
      const price = buyPrice(CONSUMABLE_VALUES[cid], npc.temperament, effD);
      if ((mats.scrap || 0) >= price) {
        mats.scrap -= price;
        this.inventory.consumables[cid] = (this.inventory.consumables[cid] || 0) + 1;
        this.tradeDisp(npc, 0.4); this.changeRep(npc.still, 0.25);
        sys(`+1 ${CONSUMABLES[cid].name} · −${price} ▤`);
      }
    } else if (id.startsWith('buym:')) {
      const mid = id.slice(5);
      const price = buyPrice(MAT_VALUES[mid], npc.temperament, effD);
      if ((mats.scrap || 0) >= price) {
        mats.scrap -= price;
        mats[mid] = (mats[mid] || 0) + 1;
        this.tradeDisp(npc, 0.4); this.changeRep(npc.still, 0.25);
        sys(`+1 ${MATERIALS[mid].name} · −${price} ▤`);
      }
    } else if (id.startsWith('sellm:')) {
      const mid = id.slice(6);
      if ((mats[mid] || 0) > 0) {
        const price = sellPrice(MAT_VALUES[mid], npc.temperament, effD);
        mats[mid]--;
        mats.scrap = (mats.scrap || 0) + price;
        this.tradeDisp(npc, 0.4); this.changeRep(npc.still, 0.25);
        sys(`−1 ${MATERIALS[mid].name} · +${price} ▤`);
      }
    } else if (id.startsWith('sellp:')) {
      const uid = id.slice(6);
      const part = this.inventory.parts.find(pp => pp.uid === uid);
      if (part) {
        const price = partPrice(part, npc.temperament);
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
      `machines destroyed: ${this.kills} · memories recovered: ${this.journal.filter(j => j.type === 'lore').length} · signals resolved: ${this.quests.filter(q => q.done).length}`;
    this.ui.toggle('system');
  }

  // ================= death =================
  die() {
    this.dead = true;
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
    const baseFog = this.vd ? this.vd.fog : 420;
    this.scene.fog.near = 60 - this.storm * 46;
    this.scene.fog.far = baseFog - this.storm * (baseFog - 90);
    this.sun.intensity = (0.15 + dayAmt * 2.1) * (1 - this.storm * 0.6);
    this.sun.position.set(Math.cos(this.dayT * Math.PI * 2) * 100, sunEl * 120 + 20, 40);
    this.hemi.intensity = (0.25 + dayAmt * 0.7) * (1 - this.storm * 0.35);
    const hour = Math.floor(this.dayT * 24), min = Math.floor((this.dayT * 24 % 1) * 60);
    this.clockText = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')} ${this.storm > 0.25 ? '· SANDSTORM — the compass swims' : isNight ? '· NIGHT — they are bolder now' : ''}`;

    if (!this.dead && !paused) {
      const inp = this.input;
      const wasGrounded = p.grounded, lastX = p.pos.x, lastZ = p.pos.z;
      p.update(dt, inp, this.camYaw, this.world);
      // who's near a field? (used for shelter, healing, and the safety hum)
      const inAnchor = Math.hypot(p.pos.x - this.safeZone.x, p.pos.z - this.safeZone.z) < this.safeZone.r;
      const fieldStills = this.stills.loadedStillsWithin(p.pos, 45);
      const inField = inAnchor || fieldStills.length > 0;
      // the storm leans on you — unless something tall breaks the wind
      if (this.storm > 0.05) {
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
      this.followers.update(dt, p, this.enemies);
      this.nests.update(dt, p, this.enemies);
      this.eventSys.update(dt);
      const allies = [
        ...(this.followers.follower ? [this.followers.follower] : []),
        ...this.camps.alliesNear(p.pos, 80),
        // during a raid, the residents are in the fight too
        ...(this.eventSys.raidActive ? this.stillDefenders() : []),
      ];
      this.enemies.aggroMul = 1 - this.storm * 0.55; // storms hunt blind
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
    this.camera.position.set(cx + (Math.random() - 0.5) * sh, this._camY + (Math.random() - 0.5) * sh, cz + (Math.random() - 0.5) * sh);
    this.camera.lookAt(p.pos.x, p.pos.y + 1.8, p.pos.z);

    // dust follows the player — dimmed at night so it doesn't read as grounded stars
    this.dust.position.set(p.pos.x, p.pos.y, p.pos.z);
    this.dust.rotation.y += dt * 0.01;
    this.dust.material.opacity = Math.min(0.95, 0.1 + dayAmt * 0.4 + this.storm * 0.5);
    this.dust.rotation.y += dt * this.storm * 0.5;
    // stars wheel overhead, only after dark
    const nightAmt = Math.max(0, Math.min(1, -sunEl * 2.5));
    this.stars.material.opacity = nightAmt * 0.9;
    this.stars.position.set(p.pos.x, p.pos.y, p.pos.z);
    this.stars.rotation.y += dt * 0.004;

    // exploration sweep (throttled) — but the interact prompt updates every
    // frame so it never lingers after a wreck has been stripped
    this.exploreT = (this.exploreT || 0) - dt;
    if (this.exploreT <= 0) {
      this.exploreT = 0.6;
      this.world.markExplored(p.pos.x, p.pos.z, Math.max(2, Math.ceil(p.stats.scanRadius / CHUNK)));
      this.maintainMegaZones();
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
    {
      const ent = this.dead ? null : this.nearestEntity();
      const fol = this.followers.follower;
      const npc = this.dead ? null
        : (fol && Math.hypot(fol.pos.x - p.pos.x, fol.pos.z - p.pos.z) < 2.5 ? fol : null)
        || this.stills.npcNear(p.pos, 2.8) || this.camps.wandererNear(p.pos, 2.8);
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
    if (biome.cleansing) {
      if (p.corruption > 0) {
        p.corruption = Math.max(0, p.corruption - (6 / 60) * dt * 60);
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
