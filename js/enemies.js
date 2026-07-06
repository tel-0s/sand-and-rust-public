// Rogue machines. Some are merely feral; some carry the Rust.
import * as THREE from 'three';
import { Rand, hash2 } from './rng.js';
import { Names } from './grammar.js';
import { clamp } from './noise.js';
import { makePart, PART_DEFS } from './parts.js';
import { buildForm, animateFrame, buildSegment, sampleForm, lineageAt, biomeAccent } from './frames.js';

const KIND_DEFS = {
  scrabbler: {
    hp: 32, speed: 8.2, dmg: 8, attackRange: 2.6, attackCd: 1.1, aggro: 26,
    scale: 0.7, color: 0x6b5f50, melee: true, frame: 'lowslung',
    drops: { scrap: [1, 3], coil: 0.3, partChance: 0.08 },
  },
  dervish: {
    hp: 58, speed: 10.5, dmg: 13, attackRange: 2.8, attackCd: 0.9, aggro: 34,
    scale: 0.95, color: 0x77654a, melee: true, spins: true, frame: 'biped',
    drops: { scrap: [2, 4], coil: 0.5, glass: 0.35, partChance: 0.14 },
  },
  sentinel: {
    hp: 150, speed: 5.2, dmg: 16, attackRange: 38, attackCd: 2.2, aggro: 48,
    scale: 1.9, color: 0x55504a, melee: false, projSpeed: 30, stompDmg: 22, frame: 'colossal',
    drops: { scrap: [3, 6], alloy: 0.6, cell: 0.5, partChance: 0.3 },
  },
  strider: { // a pack-hunter on four fast legs — runs you down in the open
    hp: 48, speed: 11.5, dmg: 10, attackRange: 2.6, attackCd: 0.9, aggro: 38,
    scale: 1.0, color: 0x7a6a4e, melee: true, frame: 'quad',
    drops: { scrap: [1, 3], coil: 0.4, partChance: 0.12 },
  },
  lurcher: { // a low armored dread that shoulders through rubble
    hp: 130, speed: 4.2, dmg: 20, attackRange: 3.0, attackCd: 1.6, aggro: 24,
    scale: 1.5, color: 0x5e564c, melee: true, frame: 'lowslung',
    drops: { scrap: [2, 5], alloy: 0.5, partChance: 0.2 },
  },
  spindler: { // a needle-gun on stilts, patient above the glass
    hp: 60, speed: 6.5, dmg: 9, attackRange: 26, attackCd: 1.8, aggro: 42,
    scale: 1.3, color: 0x6a6456, melee: false, projSpeed: 36, stompDmg: 12, frame: 'stilt',
    drops: { scrap: [2, 4], glass: 0.6, cell: 0.3, partChance: 0.15 },
  },
  rustform: {
    hp: 85, speed: 7.4, dmg: 11, attackRange: 2.8, attackCd: 1.0, aggro: 32,
    scale: 1.1, color: 0x8a3a18, melee: true, corrupting: 4,
    drops: { scrap: [1, 3], nodule: 0.9, partChance: 0.22, rustBias: 0.85 },
  },
  centipede: { // the segmented terror: rare, long, and killable piece by piece
    hp: 90, speed: 9.0, dmg: 16, attackRange: 3.0, attackCd: 1.2, aggro: 44,
    scale: 1.25, color: 0x5c4a38, melee: true, segmented: true, frame: 'lowslung',
    drops: { scrap: [4, 8], alloy: 0.8, cell: 0.5, partChance: 0.6, rustBias: 0.3 },
  },
  fabcore: { // the beating heart of a nest: it does not move; it makes
    hp: 380, speed: 0, dmg: 0, attackRange: 0, attackCd: 9, aggro: 0,
    scale: 2.4, color: 0x6a2a10, melee: true, stationary: true,
    drops: { scrap: [4, 8], nodule: 1, alloy: 0.9, cell: 0.8, partChance: 0.85, rustBias: 0.9 },
  },
  huntermonk: { // the white ground's answer to the blooming: sent, not spawned
    hp: 150, speed: 10.8, dmg: 15, attackRange: 3.0, attackCd: 1.1, aggro: 240,
    scale: 1.05, color: 0xd8d2c4, melee: true, frame: 'biped',
    drops: { scrap: [2, 5], salt: 1, partChance: 0.4, rustBias: 0 },
  },
  warhulk: { // THE MARCH: the column's heart-engine — a walking siege tower.
    // sent, not spawned: it exists only where a front puts it. it does not
    // hurry, it does not hunt; it walks, and it shells what it was sent for.
    hp: 520, speed: 7.6, dmg: 20, attackRange: 30, attackCd: 2.4, aggro: 34,
    scale: 2.7, color: 0x4a3f33, melee: false, projSpeed: 26, stompDmg: 30, frame: 'colossal',
    drops: { scrap: [6, 11], alloy: 1, cell: 0.9, partChance: 0.9 },
  },
  conceptory: { // she made minds, once. she still makes things. she does not
    // leave: wired into the works, she leans, and her arms reach far.
    hp: 680, speed: 0, dmg: 30, attackRange: 7.5, attackCd: 1.7, aggro: 26,
    scale: 4.4, color: 0x7a4a30, melee: true, corrupting: 6, rooted: true, frame: 'colossal',
    drops: { scrap: [8, 12], nodule: 1, alloy: 1, cell: 1, partChance: 1, rustBias: 0.6 },
  },
};

const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff5a2a });
const rustGlowMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });

// ---------- general modularity: machines wear real parts ----------
// every robot draws from the same part pool you do; what they wear is what
// they drop, and what they wear changes what they are.
const LOADOUT_SLOTS = {
  scrabbler: ['PLATING'],
  dervish: ['ARMS', 'PLATING'],
  sentinel: ['PLATING', 'CORE', 'ARMS'],
  rustform: ['ARMS', 'CORE'],
  strider: ['PLATING'],
  lurcher: ['PLATING', 'CORE'],
  centipede: ['PLATING', 'ARMS'],
  spindler: ['CORE'],
  fabcore: [],
  conceptory: ['PLATING', 'CORE', 'ARMS'],
  huntermonk: ['PLATING', 'ARMS'],
  warhulk: ['PLATING', 'CORE', 'ARMS'],
};

// friendly folk draw from the same pool: 1-2 parts, quality by tier.
// stage is the still's living fortune (-2..+1): prosperity buys a second
// mount and better plate; the lean years strip you down. Draw count and
// order are IDENTICAL at every stage — the stream is load-bearing, so a
// still that grows re-rolls its people's gear without moving their homes.
export function rollFolkLoadout(rand, tier, stage = 0) {
  const out = [];
  // constant draw count at every stage AND every outcome: the second mount
  // is always rolled and only sometimes kept, so a fortune swing re-rolls
  // gear without moving a single downstream draw (homes stay homes)
  const two = !rand.chance(0.6 - stage * 0.15);
  const eff = tier + stage * 0.6;
  for (const slot of ['PLATING', 'ARMS']) {
    const pool = PART_DEFS.filter(d => d.slot === slot);
    const def = pool[rand.int(0, pool.length - 1)];
    const up = rand.chance((eff - 1) * 0.5);
    const salt = rand.int(0, 0xffffffff);
    // tier 3 only where prosperity meets the frontier — decided from bits of
    // the salt already drawn, never a fresh draw
    const t = up ? (stage > 0 && eff > 2 && (salt >>> 6) % 10 < 3 ? 3 : 2) : 1;
    if (slot === 'ARMS' && !two) continue;
    out.push(makePart(def.id, t, false, salt));
  }
  return out;
}

function generateLoadout(kind, tierMult, infected) {
  const slots = LOADOUT_SLOTS[kind] || [];
  const out = [];
  for (const slot of slots) {
    if (slots.length > 1 && Math.random() < 0.3) continue; // not every mount is filled
    const pool = PART_DEFS.filter(d => d.slot === slot);
    const def = pool[Math.floor(Math.random() * pool.length)];
    const tier = Math.random() < (tierMult - 1) * 0.45 ? (Math.random() < 0.3 ? 3 : 2) : 1;
    const rusted = Math.random() < (infected ? 0.6 : 0.12);
    out.push(makePart(def.id, tier, rusted, (Math.random() * 0xffffffff) >>> 0));
  }
  return out;
}

// visible salvage bolted to the frame: you can see what it's wearing.
// mood tints the plate by the still's fortune — kept metal in the good
// years, sand-eaten patchwork in the lean ones. Legible at a glance.
export function attachGreebles(mesh, loadout, s, mood = 0) {
  const plate = mood > 0 ? 0x8a8172 : mood < 0 ? 0x4a4238 : 0x6e675c;
  for (const p of loadout) {
    const mat = new THREE.MeshLambertMaterial({ color: p.rusted ? 0x9c4422 : plate });
    if (p.slot === 'PLATING') {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(1.0 * s, 0.18 * s, 0.8 * s), mat);
      slab.position.set(0, 1.35 * s, -0.1 * s); slab.rotation.z = 0.06;
      mesh.add(slab);
    } else if (p.slot === 'ARMS') {
      for (const side of [-1, 1]) {
        const prong = new THREE.Mesh(new THREE.BoxGeometry(0.16 * s, 0.6 * s, 0.16 * s), mat);
        prong.position.set(side * 0.75 * s, 1.0 * s, 0.2 * s); prong.rotation.x = -0.35;
        mesh.add(prong);
      }
    } else if (p.slot === 'CORE') {
      const core = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.3 * s, 0.3 * s),
        new THREE.MeshBasicMaterial({ color: p.rusted ? 0xff5a2a : 0x6fe8d0 }));
      core.position.set(0, 1.1 * s, -0.55 * s); core.rotation.y = 0.6;
      mesh.add(core);
    }
  }
}

function buildEnemyMesh(kind, def, infected, motherMode, form) {
  const bodyMat = new THREE.MeshLambertMaterial({ color: infected ? 0x8a3a18 : def.color });
  const dark = new THREE.MeshLambertMaterial({ color: 0x352f28 });
  const s = def.scale;
  // frame-based machines: the frame is the silhouette, the kind is the decor
  if (def.frame) {
    const g = buildForm(def.frame, s, { body: bodyMat, dark, eye: eyeMat }, form || undefined);
    const B = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || bodyMat);
    if (kind === 'dervish') {
      const blades = new THREE.Group();
      for (let i = 0; i < 3; i++) {
        const bl = B(2.4 * s, 0.08 * s, 0.25 * s, dark); bl.rotation.y = (i / 3) * Math.PI; blades.add(bl);
      }
      blades.position.y = 1.2 * s; g.add(blades); g.userData.blades = blades;
    } else if (kind === 'sentinel') {
      const gun = B(0.25 * s, 0.25 * s, 1.4 * s, dark); gun.position.set(0, 2.3 * s, 1.4 * s); g.add(gun);
    } else if (kind === 'spindler') {
      const needle = B(0.1 * s, 0.1 * s, 1.6 * s, dark); needle.position.set(0, 2.55 * s, 0.9 * s); g.add(needle);
    } else if (kind === 'strider') {
      const fin = B(0.12 * s, 0.5 * s, 0.9 * s, dark); fin.position.set(0, 1.75 * s, -0.3 * s); fin.rotation.x = -0.25; g.add(fin);
    } else if (kind === 'lurcher') {
      const plow = B(1.9 * s, 0.6 * s, 0.25 * s, dark); plow.position.set(0, 0.55 * s, 1.1 * s); plow.rotation.x = 0.4; g.add(plow);
    } else if (kind === 'centipede') {
      for (const sx of [-1, 1]) { // mandibles
        const jaw = B(0.14 * s, 0.14 * s, 0.8 * s, dark);
        jaw.position.set(sx * 0.4 * s, 0.55 * s, 1.15 * s); jaw.rotation.y = sx * 0.35; g.add(jaw);
      }
    } else if (kind === 'conceptory') {
      // the Mother: shoulders like gantries — and what hangs from them is
      // her armament, worn where you can read it before it reads you
      const hingedArm = (sx, len, clawed) => {
        const arm = new THREE.Group();
        const boom = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, len * s, 0.3 * s), bodyMat);
        boom.geometry.translate(0, -len * s / 2, 0); // pivot at the shoulder
        arm.add(boom);
        if (clawed) for (const cx of [-1, 0, 1]) {
          const claw = new THREE.Mesh(new THREE.BoxGeometry(0.12 * s, 0.7 * s, 0.14 * s), dark);
          claw.geometry.translate(0, -0.35 * s, 0);
          claw.position.set(cx * 0.18 * s, -len * s, 0); claw.rotation.x = cx * 0.12 - 0.15;
          arm.add(claw);
        }
        arm.position.set(sx * 1.3 * s, 2.8 * s, 0.15 * s);
        arm.rotation.x = -0.35;
        return arm;
      };
      for (const sx of [-1, 1]) {
        const shoulder = B(0.7 * s, 0.5 * s, 0.9 * s, dark); shoulder.position.set(sx * 1.05 * s, 2.8 * s, 0); g.add(shoulder);
      }
      if (motherMode === 'cannon') {
        // one arm to swat with; the other shoulder-joint carries the cannon
        const arm = hingedArm(-1, 2.1, false); g.add(arm);
        g.userData.motherArms = [arm];
        const can = new THREE.Group();
        const housing = B(0.55 * s, 0.55 * s, 1.1 * s, dark); can.add(housing);
        const barrel = B(0.3 * s, 0.3 * s, 1.7 * s, bodyMat); barrel.position.set(0, 0.06 * s, 1.2 * s); can.add(barrel);
        const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.34 * s, 0.34 * s, 0.14 * s),
          new THREE.MeshBasicMaterial({ color: 0xffb066 }));
        muzzle.position.set(0, 0.06 * s, 2.06 * s); muzzle.visible = false; can.add(muzzle);
        can.position.set(1.05 * s, 3.15 * s, 0.2 * s);
        g.add(can);
        g.userData.cannon = can; g.userData.muzzle = muzzle;
      } else {
        // long clawed arms, hung to swipe and strike
        const arms = [hingedArm(-1, 2.4, true), hingedArm(1, 2.4, true)];
        for (const a of arms) g.add(a);
        g.userData.motherArms = arms;
      }
      const crown = B(0.5 * s, 0.35 * s, 0.5 * s, rustGlowMat); crown.position.y = 3.4 * s; g.add(crown);
    }
    if (infected) {
      const sig = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, 0.18), rustGlowMat);
      sig.position.y = (g.userData.eyeH || 1.9) + 0.5; g.add(sig);
    }
    return g;
  }
  const g = new THREE.Group();
  const B = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || bodyMat);
  if (kind === 'fabcore') {
    // a half-buried printing heart, ribbed and weeping rust
    const housing = B(2.6 * s, 1.6 * s, 2.2 * s); housing.position.y = 0.8 * s; g.add(housing);
    for (let i = 0; i < 3; i++) {
      const rib = B(0.3 * s, 2.4 * s, 0.3 * s, dark);
      rib.position.set((i - 1) * 0.9 * s, 1.6 * s, 0); rib.rotation.z = (i - 1) * 0.18; g.add(rib);
    }
    const core = B(0.9 * s, 0.9 * s, 0.9 * s, rustGlowMat); core.position.y = 1.3 * s; core.rotation.y = 0.6; g.add(core);
    g.userData.spinCore = core;
  } else { // rustform — a wrong shape, a machine grown like coral
    for (let i = 0; i < 5; i++) {
      const lump = B((0.5 + Math.random() * 0.7) * s, (0.5 + Math.random() * 0.9) * s, (0.5 + Math.random() * 0.6) * s);
      lump.position.set((Math.random() - 0.5) * s, (0.4 + Math.random() * 1.2) * s, (Math.random() - 0.5) * s);
      lump.rotation.set(Math.random(), Math.random(), Math.random());
      g.add(lump);
    }
    const core = B(0.4 * s, 0.4 * s, 0.4 * s, rustGlowMat); core.position.y = 1.0 * s; g.add(core);
  }
  if (infected) {
    const sig = B(0.18, 0.5, 0.18, rustGlowMat); sig.position.y = 1.9 * s; g.add(sig);
  }
  return g;
}

let enemySalt = 1;

export class Enemy {
  constructor(scene, kind, x, z, world, tierMult, infected, opts = {}) {
    this.kind = kind; this.def = KIND_DEFS[kind];
    this.infected = infected;
    const m = tierMult * (infected ? 1.3 : 1);
    this.maxHp = Math.round(this.def.hp * m);
    this.hp = this.maxHp;
    this.dmg = this.def.dmg * m;
    this.speed = this.def.speed * (infected ? 1.1 : 1);
    this.tierMult = tierMult;
    const mySalt = enemySalt++;
    this.name = opts.name || Names.machine(world.seed, mySalt);
    // machinic DNA: the salt decodes into a body. Kinds stay readable
    // (spread well under 1); the local lineage lends its accent; the Mother
    // keeps her silhouette bare — her armament IS her body language.
    this.lineage = lineageAt(world.seed, x, z);
    if (this.def.frame) {
      this.form = sampleForm(hash2(world.seed, mySalt, 7717), {
        temperament: 'feral', spread: kind === 'conceptory' ? 0.3 : 0.55,
        lineage: this.lineage, infected,
        accent: biomeAccent(world.seed, world.biomeAt(x, z).id),
      });
      if (kind === 'conceptory') { this.form.mods = []; this.form.legLen = 1; } // her gantries are load-bearing
    }
    this.questTag = opts.questTag || null;
    this.raider = opts.raider || false; // raiders do not respect the fields
    this.homeNest = opts.homeNest || null;
    // what it wears is what it is — and what it drops
    this.loadout = generateLoadout(kind, tierMult, infected);
    if (kind === 'conceptory') {
      // her armament is her identity: one ARMS part, chosen once per Mother
      // (armSalt is seeded from her megastructure, so she keeps her weapon
      // across visits) — and since she drops everything, she drops it too
      const armDefs = PART_DEFS.filter(d => d.slot === 'ARMS');
      const salt = (opts.armSalt !== undefined ? opts.armSalt : (Math.random() * 0xffffffff)) >>> 0;
      const arm = makePart(armDefs[salt % armDefs.length].id,
        tierMult > 2 ? 3 : 2, infected && (salt >> 4) % 3 === 0, salt);
      this.loadout = this.loadout.filter(p => p.slot !== 'ARMS');
      this.loadout.push(arm);
      this.motherArm = arm;
      this.motherMode = arm.attackKind === 'ranged' ? 'cannon' : 'sweep';
    }
    for (const p of this.loadout) {
      this.maxHp += Math.round((p.stats.hull || 0) * 0.6 + (p.stats.armor || 0) * 1.5);
      if (p.slot === 'ARMS') this.dmg += (p.stats.damage || 0) * 0.35;
    }
    this.hp = this.maxHp;
    this.pos = new THREE.Vector3(x, world.getHeight(x, z), z);
    // the segmented ones: length is DNA. each segment is its own target.
    if (this.def.segmented) {
      this.segCount = 5 + Math.floor(Math.random() * 4) + (tierMult > 2 ? 1 : 0);
      const poolMul = 1 + this.segCount * 0.28;
      this.maxHp = Math.round(this.maxHp * poolMul);
      this.hp = this.maxHp;
      this.segTrail = [];
      const segMats = {
        body: new THREE.MeshLambertMaterial({ color: infected ? 0x8a3a18 : this.def.color }),
        dark: new THREE.MeshLambertMaterial({ color: 0x352f28 }),
      };
      for (let i = 0; i < this.segCount; i++) {
        const mesh = buildSegment(this.def.scale, segMats, i === this.segCount - 1);
        mesh.position.set(x - (i + 1) * 1.5 * this.def.scale, this.pos.y, z);
        scene.add(mesh);
        this.segTrail.push({
          mesh, hp: Math.round(28 * tierMult), maxHp: Math.round(28 * tierMult),
          pos: new THREE.Vector3().copy(mesh.position), yaw: 0,
        });
      }
    }
    this.mesh = buildEnemyMesh(kind, this.def, infected, this.motherMode, this.form);
    attachGreebles(this.mesh, this.loadout, this.def.scale);
    if (this.questTag) {
      // a pale marker diamond: this one has a name on a contract
      const mark = new THREE.Mesh(new THREE.OctahedronGeometry(0.3),
        new THREE.MeshBasicMaterial({ color: 0xffffff }));
      mark.position.y = (kind === 'sentinel' ? 4.2 : 2.4) * this.def.scale;
      this.mesh.add(mark);
    }
    this.mesh.position.copy(this.pos);
    scene.add(this.mesh);
    this.state = 'wander';
    this.heading = Math.random() * Math.PI * 2;
    this.headingT = 0; this.attackT = 0; this.animT = Math.random() * 10;
    this.aggroR = this.def.aggro;
    this.flashT = 0;
    this.kvx = 0; this.kvz = 0; // knockback velocity
  }

  update(dt, targets, world, projectiles, safeZones) {
    this.animT += dt;
    this.attackT = Math.max(0, this.attackT - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    // THE CALLING: a machine walking beside the blooming hunts its own kind
    if (this.calledT > 0) {
      this.calledT -= dt;
      this.updateCalled(dt, targets, world);
      return;
    }
    // a machine fights whatever is nearest — you, or whoever stands with you
    const player = targets[0];
    let target = player, toPlayer = player.pos.distanceTo(this.pos);
    for (let i = 1; i < targets.length; i++) {
      const d = targets[i].pos.distanceTo(this.pos);
      if (d < toPlayer) { toPlayer = d; target = targets[i]; }
    }

    // the nest's heart only sits, takes its beating, and glows
    if (this.def.stationary) {
      this.flashT = Math.max(0, this.flashT);
      if (this.mesh.userData.spinCore) this.mesh.userData.spinCore.rotation.y += dt * (1 + (1 - this.hp / this.maxHp) * 4);
      this.mesh.traverse(o => { if (o.material && o.material.emissive) o.material.emissive.setHex(this.flashT > 0 ? 0x9a9484 : 0x000000); });
      return;
    }

    // anchor & still fields repel feral machines — they will not follow you in
    if (safeZones && !this.raider) {
      for (const sz of safeZones) {
        const dSelf = Math.hypot(this.pos.x - sz.x, this.pos.z - sz.z);
        const playerInside = Math.hypot(target.pos.x - sz.x, target.pos.z - sz.z) < sz.r;
        if (dSelf < sz.r + 4 || (this.state === 'chase' && playerInside)) {
          this.state = 'wander';
          this.heading = Math.atan2(this.pos.x - sz.x, this.pos.z - sz.z);
          this.headingT = 2;
          this.repelledT = 1.2; // retreat with conviction, ignore the player
          break;
        }
      }
    }
    this.repelledT = Math.max(0, (this.repelledT || 0) - dt);

    if (this.state === 'wander') {
      this.headingT -= dt;
      if (this.headingT <= 0) { this.heading += (Math.random() - 0.5) * 2; this.headingT = 2 + Math.random() * 3; }
      if (this.march) {
        // column discipline (THE MARCH): hold the line, close the gap when it
        // stretches, and never wander off the axis of the war
        const mdx = this.march.x - this.pos.x, mdz = this.march.z - this.pos.z;
        const md = Math.hypot(mdx, mdz);
        if (md > 2.5) {
          this.heading = Math.atan2(mdx, mdz);
          this.move(mdx / md, mdz / md, this.speed * (md > 22 ? 1 : 0.62), dt, world);
        }
      } else if (!this.def.rooted) this.move(Math.sin(this.heading), Math.cos(this.heading), this.speed * (this.repelledT > 0 ? 0.95 : 0.3), dt, world);
      // lurkers in the halls need to SEE you — no aggro through walls
      const kin = this.kind === 'rustform' && !this.raider && !this.provoked
        && (this.embraceLevel || 0) >= 1 && target.isPlayer;
      const calm = this.herdCalm && !this.provoked; // the herd walks; it does not hunt
      if (!kin && !calm && toPlayer < this.aggroR * (this.aggroMul ?? 1) && this.repelledT <= 0
        && (!this.losAggro || this.seesTarget(target, world))) this.state = 'chase';
    } else if (this.state === 'chase') {
      if (this.kind === 'rustform' && !this.raider && !this.provoked
        && (this.embraceLevel || 0) >= 1 && target.isPlayer) this.state = 'wander';
      const dx = target.pos.x - this.pos.x, dz = target.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      this.heading = Math.atan2(dx, dz); // even the rooted ones lean toward you
      const range = this.def.melee ? this.def.attackRange : this.def.attackRange * 0.8;
      if (toPlayer > range && !this.def.rooted) this.move(dx / d, dz / d, this.speed, dt, world);
      if (this.motherMode) {
        this.motherCombat(dt, targets, target, toPlayer, world, projectiles);
      } else if (toPlayer < (this.def.melee ? this.def.attackRange : this.def.attackRange) && this.attackT <= 0) {
        this.attackT = this.def.attackCd;
        const shove = (power) => {
          if (!target.knock) return;
          const sx = target.pos.x - this.pos.x, sz = target.pos.z - this.pos.z;
          const sd = Math.hypot(sx, sz) || 1;
          target.knock(sx / sd, sz / sd, power);
        };
        if (this.def.melee) {
          if (toPlayer < this.def.attackRange + 0.6) {
            const dealt = target.damage(this.dmg * (this.dmgMul ?? 1));
            if (dealt > 0) shove(5);
            if (dealt > 0 && this.def.corrupting && target.isPlayer) target.corruption = Math.min(100, target.corruption + this.def.corrupting);
            if (target.isPlayer) this.onHitPlayer && this.onHitPlayer(dealt);
          }
        } else {
          // sentinel: stomp up close, plasma lob at range
          if (toPlayer < 5) {
            const dealt = target.damage(this.def.stompDmg * this.tierMult * (this.dmgMul ?? 1));
            if (dealt > 0) shove(13);
            if (target.isPlayer) this.onHitPlayer && this.onHitPlayer(dealt);
          } else {
            const from = this.pos.clone(); from.y += 4;
            const tp = target.pos.clone(); tp.y += 1.2;
            const dir = tp.sub(from).normalize();
            projectiles.spawn({ from, dir, speed: this.def.projSpeed, dmg: this.dmg * (this.dmgMul ?? 1), friendly: false, color: 0xff6a3c });
          }
        }
      }
      if (toPlayer > this.aggroR * 3.5) this.state = 'wander';
    }

    // knockback drift
    this.pos.x += this.kvx * dt;
    this.pos.z += this.kvz * dt;
    const kd = Math.pow(0.005, dt);
    this.kvx *= kd; this.kvz *= kd;
    // stick to ground (terrain or whatever it was knocked onto)
    world.collide(this.pos, 0.8, this.pos.y);
    this.pos.y = world.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.1);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    // animation flourishes
    if (this.mesh.userData.blades) this.mesh.userData.blades.rotation.y += dt * (this.state === 'chase' ? 18 : 4);
    // gaits: legs swing on frame-legged machines; the legless hop; the rooted sway
    if (this.mesh.userData.legs && !this.def.rooted) {
      const moving = this.state === 'chase' ? 1 : 0.45;
      animateFrame(this.mesh, this.animT, moving);
      this.mesh.position.y += Math.abs(Math.sin(this.animT * 4)) * 0.02 * this.def.scale;
    } else if (this.def.rooted) {
      animateFrame(this.mesh, this.animT, 0.06); // a giant shifting her weight
      this.mesh.position.y += Math.sin(this.animT * 1.3) * 0.05 * this.def.scale;
      const ud = this.mesh.userData, A = this._atk;
      if (ud.motherArms) {
        // rest: a slow hanging sway. wind: raised high behind her. swing: slammed through.
        const goal = A && A.phase === 'wind' ? -2.4
          : A && A.phase === 'swing' ? 0.85
          : -0.35 + Math.sin(this.animT * 1.1) * 0.1;
        const rate = A && A.phase === 'swing' ? 22 : 7;
        for (const arm of ud.motherArms) arm.rotation.x += (goal - arm.rotation.x) * Math.min(1, dt * rate);
      }
      if (ud.cannon) {
        const charging = A && A.phase === 'charge', firing = A && A.phase === 'fire';
        ud.muzzle.visible = charging || firing;
        if (charging) ud.muzzle.scale.setScalar(0.6 + (1 - A.t / 0.9) * 1.2);
        else if (firing) { ud.muzzle.scale.setScalar(1.4 + Math.random() * 0.5); ud.cannon.position.z = 0.2 * this.def.scale - (A.shotT < 0.06 ? 0.12 : 0); }
        else ud.cannon.position.z = 0.2 * this.def.scale;
        // the barrel tracks its argument
        ud.cannon.rotation.x = firing || charging ? -0.06 : 0.04;
      }
    } else {
      this.mesh.position.y += Math.abs(Math.sin(this.animT * 8)) * 0.06 * this.def.scale;
    }
    // hit flash: a brief pale blaze, unmissable
    this.mesh.traverse(o => { if (o.material && o.material.emissive) o.material.emissive.setHex(this.flashT > 0 ? 0x9a9484 : 0x000000); });
    this.updateSegments(dt, world);
  }

  // the Mother fights with what she wears: telegraphed claw sweeps that hit
  // everything in the arc, or shoulder-cannon bursts — charge, sustained
  // fire, long dramatic silence. Hugging the cannon earns you the off-arm.
  motherCombat(dt, targets, target, toPlayer, world, projectiles) {
    const A = this._atk || (this._atk = { phase: 'idle', t: 0 });
    const hurt = (t, mul, kb) => {
      const dealt = t.damage(this.dmg * mul * (this.dmgMul ?? 1));
      if (dealt > 0 && t.knock) {
        const sx = t.pos.x - this.pos.x, sz = t.pos.z - this.pos.z, sd = Math.hypot(sx, sz) || 1;
        t.knock(sx / sd, sz / sd, kb);
      }
      if (dealt > 0 && this.def.corrupting && t.isPlayer) t.corruption = Math.min(100, t.corruption + this.def.corrupting);
      if (t.isPlayer) this.onHitPlayer && this.onHitPlayer(dealt);
    };
    if (this.motherMode === 'sweep') {
      if (A.phase === 'idle' && toPlayer < this.def.attackRange + 1.5 && this.attackT <= 0) {
        A.phase = 'wind'; A.t = 0.75; // the arms rise: your warning
      } else if (A.phase === 'wind') {
        A.t -= dt;
        if (A.t <= 0) { A.phase = 'swing'; A.t = 0.45; A.hit = false; }
      } else if (A.phase === 'swing') {
        A.t -= dt;
        if (!A.hit && A.t < 0.28) { // the blow lands mid-arc
          A.hit = true;
          for (const t of targets) { // a sweep is honest about its width
            const dx = t.pos.x - this.pos.x, dz = t.pos.z - this.pos.z;
            const d = Math.hypot(dx, dz);
            const rel = ((Math.atan2(dx, dz) - this.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
            if (d < this.def.attackRange + 1.2 && Math.abs(rel) < 1.25) hurt(t, 1.4, 16);
          }
        }
        if (A.t <= 0) { A.phase = 'idle'; this.attackT = 2.4; }
      }
    } else { // cannon
      this._swatT = Math.max(0, (this._swatT || 0) - dt);
      if (toPlayer < 5.2 && this._swatT <= 0 && A.phase !== 'fire') {
        this._swatT = 2.0; hurt(target, 0.8, 12); // the off-arm answers
      }
      const isArc = this.motherArm.defId === 'arc_projector';
      if (A.phase === 'idle' && toPlayer < 46 && toPlayer > 4 && this.attackT <= 0 && this.seesTarget(target, world)) {
        A.phase = 'charge'; A.t = 0.9; // the muzzle glows: your warning
      } else if (A.phase === 'charge') {
        A.t -= dt;
        if (A.t <= 0) { A.phase = 'fire'; A.t = isArc ? 1.8 : 1.9; A.shotT = 0; A.shots = 0; }
      } else if (A.phase === 'fire') {
        A.t -= dt; A.shotT -= dt;
        const maxShots = isArc ? 6 : 12;
        if (A.shotT <= 0 && A.shots < maxShots) {
          A.shotT = isArc ? 0.3 : 0.15; A.shots++;
          const s = this.def.scale;
          const from = this.pos.clone();
          from.x += Math.cos(this.heading) * 1.05 * s + Math.sin(this.heading) * 1.4 * s;
          from.z += -Math.sin(this.heading) * 1.05 * s + Math.cos(this.heading) * 1.4 * s;
          from.y += 3.2 * s;
          const tp = target.pos.clone(); tp.y += 1.2;
          const dir = tp.sub(from).normalize();
          dir.x += (Math.random() - 0.5) * 0.07; dir.z += (Math.random() - 0.5) * 0.07;
          dir.normalize();
          projectiles.spawn({
            from, dir, speed: isArc ? 36 : 26,
            dmg: this.dmg * (isArc ? 0.5 : 0.24) * (this.dmgMul ?? 1),
            friendly: false, color: isArc ? 0x7fd2ff : 0xffb066,
          });
        }
        if (A.t <= 0) { A.phase = 'idle'; this.attackT = 4.2; } // the long silence
      }
    }
  }

  // called: chase and bite the nearest OTHER machine; drift back to the
  // caller when nothing needs biting. when the call fades, it wakes wild.
  updateCalled(dt, targets, world) {
    const player = targets[0];
    let foe = null, fd = 46;
    if (this.mgrEnemies) for (const o of this.mgrEnemies) {
      if (o === this || o.hp <= 0 || o.calledT > 0) continue;
      const d = o.pos.distanceTo(this.pos);
      if (d < fd) { fd = d; foe = o; }
    }
    if (foe) {
      const dx = foe.pos.x - this.pos.x, dz = foe.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      this.heading = Math.atan2(dx, dz);
      if (d > this.def.attackRange) this.move(dx / d, dz / d, this.speed, dt, world);
      else if (this.attackT <= 0) {
        this.attackT = this.def.attackCd;
        foe._lastHitPos = { x: foe.pos.x, z: foe.pos.z };
        foe.hurt(this.dmg, dx / d * 4, dz / d * 4);
        foe.state = 'chase';
      }
    } else {
      const dp = player.pos.distanceTo(this.pos);
      if (dp > 8) {
        const dx = player.pos.x - this.pos.x, dz = player.pos.z - this.pos.z;
        this.heading = Math.atan2(dx, dz);
        this.move(dx / dp, dz / dp, this.speed * 0.8, dt, world);
      }
    }
    this.pos.y = world.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.1);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.heading;
    if (this.mesh.userData.legs) animateFrame(this.mesh, this.animT, 1);
    this.mesh.traverse(o => { if (o.material && o.material.emissive) o.material.emissive.setHex(0x300b02); });
    this.updateSegments(dt, world);
  }

  // can this machine actually see its target, or is there a wall in the way?
  // samples every ~0.6 m so thin walls can't slip between steps
  seesTarget(target, world) {
    const y0 = this.pos.y + 1.2, y1 = target.pos.y + 1.2;
    const dist = Math.hypot(target.pos.x - this.pos.x, target.pos.z - this.pos.z);
    const n = Math.min(40, Math.max(4, Math.ceil(dist / 0.6)));
    for (let i = 1; i < n; i++) {
      const s = i / n;
      const x = this.pos.x + (target.pos.x - this.pos.x) * s;
      const z = this.pos.z + (target.pos.z - this.pos.z) * s;
      if (world.projectileBlocked(x, y0 + (y1 - y0) * s, z)) return false;
    }
    return true;
  }

  // the segmented body follows its head: each segment eases toward the one
  // ahead at fixed spacing, hugging the actual ground, legs in a wave
  updateSegments(dt, world) {
    if (!this.segTrail) return;
    const spacing = 1.5 * this.def.scale;
    let ahead = this.pos, aheadYaw = this.heading;
    this.segTrail.forEach((seg, i) => {
      const dx = ahead.x - seg.pos.x, dz = ahead.z - seg.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      if (d > spacing) {
        const pull = (d - spacing);
        seg.pos.x += (dx / d) * pull * Math.min(1, dt * 10);
        seg.pos.z += (dz / d) * pull * Math.min(1, dt * 10);
        seg.yaw = Math.atan2(dx, dz);
      }
      seg.pos.y = world.groundAt(seg.pos.x, seg.pos.z, seg.pos.y + 0.1);
      seg.mesh.position.copy(seg.pos);
      seg.mesh.rotation.y = seg.yaw;
      seg.flashT = Math.max(0, (seg.flashT || 0) - dt);
      seg.mesh.userData.legs.forEach((leg, li) =>
        leg.rotation.x = Math.sin(this.animT * 8 + i * 0.7 + li * Math.PI) * 0.45);
      seg.mesh.traverse(o => { if (o.material && o.material.emissive) o.material.emissive.setHex(seg.flashT > 0 ? 0x9a9484 : 0x000000); });
      ahead = seg.pos; aheadYaw = seg.yaw;
    });
  }

  move(dx, dz, speed, dt, world) {
    // machines also struggle with slopes (sentinels barely)
    const h0 = world.getHeight(this.pos.x, this.pos.z);
    const h1 = world.getHeight(this.pos.x + dx, this.pos.z + dz);
    const slope = h1 - h0;
    const pen = slope > 0.2 ? clamp(1 - (slope - 0.2) * 0.9, 0.3, 1) : 1;
    this.pos.x += dx * speed * pen * dt;
    this.pos.z += dz * speed * pen * dt;
  }

  hurt(amount, kbx = 0, kbz = 0) {
    this.provoked = true; // kinship ends where the blade begins
    // per-part damage: a hit on a segmented machine lands where it lands
    if (this.segTrail && this._lastHitPos) {
      const hp2 = this._lastHitPos;
      this._lastHitPos = null;
      let bi = -1, bd = Math.hypot(hp2.x - this.pos.x, hp2.z - this.pos.z);
      this.segTrail.forEach((seg, i) => {
        const d = Math.hypot(hp2.x - seg.pos.x, hp2.z - seg.pos.z);
        if (d < bd) { bd = d; bi = i; }
      });
      if (bi === -1) amount *= 1.5; // the head is the mind
      else {
        const seg = this.segTrail[bi];
        seg.hp -= amount;
        seg.flashT = 0.15;
        if (seg.hp <= 0) {
          // the segment breaks off; the body shortens and staggers
          this._segBroke = seg;
          this.segTrail.splice(bi, 1);
          amount += this.maxHp * 0.07;
          this.speed = Math.max(4, this.speed - 0.5);
        }
      }
    }
    this.hp -= amount;
    this.flashT = 0.15;
    // heavier machines barely move; scrabblers go flying
    const massFactor = 1 / (0.4 + this.def.scale);
    this.kvx += kbx * massFactor;
    this.kvz += kbz * massFactor;
    if (this.state === 'wander') this.state = 'chase';
    return this.hp <= 0;
  }
}

export class EnemyManager {
  constructor(scene, world) {
    this.scene = scene; this.world = world;
    this.enemies = [];
    this.spawnT = 3;
    this.cap = 9;
    this.safeZones = [];
    this.onDeath = null; this.onHitPlayer = null;
  }

  update(dt, player, projectiles, isNight, allies = []) {
    this.spawnT -= dt;
    if (this.spawnT <= 0) {
      this.spawnT = this.coldNight ? 1.9 : 2.6; // the long cold's nights press harder
      // the hollow places stock themselves once, at the door (interiors.js)
      if (this.enemies.length < this.cap && !this.suppressSpawn) this.trySpawn(player, isNight);
    }
    const targets = [player, ...allies.filter(a => a.hp > 0)];
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      const d = e.pos.distanceTo(player.pos);
      if (d > (e.questTag ? 450 : e.def.stationary ? 520 : e.raider ? 400 : 220)) {
        if (e.questTag && this.onQuestTargetLost) this.onQuestTargetLost(e);
        this.remove(i); continue;
      }
      e.onHitPlayer = this.onHitPlayer;
      e.aggroMul = this.aggroMul ?? 1;
      e.dmgMul = this.dmgMul ?? 1;
      e.embraceLevel = this.embraceLevel || 0;
      e.mgrEnemies = this.enemies;
      e.update(dt, targets, this.world, projectiles, this.safeZones);
      if (e._segBroke) {
        this.scene.remove(e._segBroke.mesh);
        e._segBroke.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
        if (this.onSegmentBroke) this.onSegmentBroke(e, e._segBroke);
        e._segBroke = null;
      }
      if (e.hp <= 0) {
        if (this.onDeath) this.onDeath(e);
        this.remove(i);
      }
    }
    // pairwise separation: packs shouldn't phase into one stacked blob
    for (let i = 0; i < this.enemies.length; i++) {
      for (let j = i + 1; j < this.enemies.length; j++) {
        const a = this.enemies[i], b = this.enemies[j];
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
        const minD = (a.def.scale + b.def.scale) * 0.85;
        const d2 = dx * dx + dz * dz;
        if (d2 < minD * minD && d2 > 1e-6) {
          const d = Math.sqrt(d2), push = (minD - d) / 2;
          const nx = dx / d, nz = dz / d;
          a.pos.x -= nx * push; a.pos.z -= nz * push;
          b.pos.x += nx * push; b.pos.z += nz * push;
        }
      }
    }
  }

  trySpawn(player, isNight) {
    const rand = new Rand((Math.random() * 0xffffffff) >>> 0);
    const ang = rand.range(0, Math.PI * 2);
    const dist = rand.range(45, 95);
    const x = player.pos.x + Math.sin(ang) * dist;
    const z = player.pos.z + Math.cos(ang) * dist;
    for (const sz of this.safeZones) {
      if (Math.hypot(x - sz.x, z - sz.z) < sz.r + 20) return;
    }
    const biome = this.world.biomeAt(x, z);
    let danger = biome.danger * (isNight ? 1.7 : 1) * (this.spawnMul ?? 1);
    if (!rand.chance(Math.min(0.9, danger * 0.55))) return;
    let kind = rand.pick(biome.enemyKinds);
    const distFromOrigin = Math.hypot(x, z);
    const tierMult = 1 + Math.min(2.2, distFromOrigin / 1300);
    // the deep desert grows them long: a rare segmented terror, far out only
    if (tierMult > 1.5 && (biome.id === 'dunes' || biome.id === 'rustlands') && rand.chance(0.05)) kind = 'centipede';
    const infected = rand.chance(biome.id === 'rustlands' ? 0.8 : 0.22);
    const e = new Enemy(this.scene, kind, x, z, this.world, tierMult, infected);
    this.enemies.push(e);
  }

  // direct placement for events & nests
  spawnAt(kind, x, z, opts = {}) {
    const tierMult = opts.tierMult ?? (1 + Math.min(2.2, Math.hypot(x, z) / 1300));
    const e = new Enemy(this.scene, kind, x, z, this.world, tierMult, opts.infected ?? false, opts);
    if (opts.aggro) { e.state = 'chase'; e.aggroR = 999; }
    this.enemies.push(e);
    return e;
  }

  // a machine with a name on a contract: tougher, marked, long leash
  spawnQuestTarget(x, z, name, questTag) {
    const biome = this.world.biomeAt(x, z);
    const kind = biome.enemyKinds.includes('sentinel') && Math.random() < 0.45
      ? 'sentinel' : biome.enemyKinds[biome.enemyKinds.length - 1];
    const tierMult = (1 + Math.min(2.2, Math.hypot(x, z) / 1300)) * 1.35;
    const e = new Enemy(this.scene, kind, x, z, this.world, tierMult, Math.random() < 0.4, { name, questTag });
    e.aggroR = 60;
    this.enemies.push(e);
    return e;
  }

  remove(i) {
    const e = this.enemies[i];
    this.scene.remove(e.mesh);
    e.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    if (e.segTrail) {
      for (const seg of e.segTrail) {
        this.scene.remove(seg.mesh);
        seg.mesh.traverse(o => { if (o.geometry) o.geometry.dispose(); });
      }
    }
    this.enemies.splice(i, 1);
  }

  // returns enemies hit by a melee arc from `pos` facing `yaw`
  meleeArc(pos, yaw, range, halfAngle = 1.1) {
    const out = [];
    for (const e of this.enemies) {
      // the swing hits the nearest body-node WITHIN the arc — a long body is
      // many targets, and standing between two segments must not blind you
      let best = null, bestD = Infinity;
      const consider = (px, pz) => {
        const dx = px - pos.x, dz = pz - pos.z;
        const d = Math.hypot(dx, dz);
        if (d > range + e.def.scale) return;
        const ang = Math.atan2(dx, dz);
        let da = Math.abs(ang - yaw);
        if (da > Math.PI) da = Math.PI * 2 - da;
        if (da >= halfAngle) return;
        if (d < bestD) { bestD = d; best = { x: px, z: pz }; }
      };
      consider(e.pos.x, e.pos.z);
      if (e.segTrail) for (const seg of e.segTrail) consider(seg.pos.x, seg.pos.z);
      if (best) {
        if (e.segTrail) e._lastHitPos = best;
        out.push(e);
      }
    }
    return out;
  }
}

export const ENEMY_KINDS = KIND_DEFS;
