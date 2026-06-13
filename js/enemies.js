// Rogue machines. Some are merely feral; some carry the Rust.
import * as THREE from 'three';
import { Rand } from './rng.js';
import { Names } from './grammar.js';
import { clamp } from './noise.js';
import { makePart, PART_DEFS } from './parts.js';

const KIND_DEFS = {
  scrabbler: {
    hp: 32, speed: 8.2, dmg: 8, attackRange: 2.6, attackCd: 1.1, aggro: 26,
    scale: 0.7, color: 0x6b5f50, melee: true,
    drops: { scrap: [1, 3], coil: 0.3, partChance: 0.08 },
  },
  dervish: {
    hp: 58, speed: 10.5, dmg: 13, attackRange: 2.8, attackCd: 0.9, aggro: 34,
    scale: 0.95, color: 0x77654a, melee: true, spins: true,
    drops: { scrap: [2, 4], coil: 0.5, glass: 0.35, partChance: 0.14 },
  },
  sentinel: {
    hp: 150, speed: 5.2, dmg: 16, attackRange: 38, attackCd: 2.2, aggro: 48,
    scale: 1.9, color: 0x55504a, melee: false, projSpeed: 30, stompDmg: 22,
    drops: { scrap: [3, 6], alloy: 0.6, cell: 0.5, partChance: 0.3 },
  },
  rustform: {
    hp: 85, speed: 7.4, dmg: 11, attackRange: 2.8, attackCd: 1.0, aggro: 32,
    scale: 1.1, color: 0x8a3a18, melee: true, corrupting: 4,
    drops: { scrap: [1, 3], nodule: 0.9, partChance: 0.22, rustBias: 0.85 },
  },
  fabcore: { // the beating heart of a nest: it does not move; it makes
    hp: 380, speed: 0, dmg: 0, attackRange: 0, attackCd: 9, aggro: 0,
    scale: 2.4, color: 0x6a2a10, melee: true, stationary: true,
    drops: { scrap: [4, 8], nodule: 1, alloy: 0.9, cell: 0.8, partChance: 0.85, rustBias: 0.9 },
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
  fabcore: [],
};

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

// visible salvage bolted to the frame: you can see what it's wearing
function attachGreebles(mesh, loadout, s) {
  for (const p of loadout) {
    const mat = new THREE.MeshLambertMaterial({ color: p.rusted ? 0x9c4422 : 0x6e675c });
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

function buildEnemyMesh(kind, def, infected) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: infected ? 0x8a3a18 : def.color });
  const dark = new THREE.MeshLambertMaterial({ color: 0x352f28 });
  const B = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || bodyMat);
  const s = def.scale;
  if (kind === 'scrabbler') {
    const body = B(1.1 * s, 0.6 * s, 1.3 * s); body.position.y = 0.7 * s; g.add(body);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const leg = B(0.12 * s, 0.8 * s, 0.12 * s, dark);
      leg.position.set(sx * 0.7 * s, 0.45 * s, sz * 0.5 * s); leg.rotation.z = sx * 0.5; g.add(leg);
    }
    const eye = B(0.3 * s, 0.1 * s, 0.05, eyeMat); eye.position.set(0, 0.8 * s, 0.68 * s); g.add(eye);
  } else if (kind === 'dervish') {
    const body = B(0.9 * s, 1.4 * s, 0.9 * s); body.position.y = 1.1 * s; g.add(body);
    const blades = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const bl = B(2.4 * s, 0.08 * s, 0.25 * s, dark); bl.rotation.y = (i / 3) * Math.PI; blades.add(bl);
    }
    blades.position.y = 1.2 * s; g.add(blades); g.userData.blades = blades;
    const eye = B(0.5 * s, 0.08 * s, 0.05, eyeMat); eye.position.set(0, 1.5 * s, 0.47 * s); g.add(eye);
  } else if (kind === 'sentinel') {
    const body = B(1.4 * s, 1.0 * s, 1.8 * s); body.position.y = 2.2 * s; g.add(body);
    const cab = B(0.8 * s, 0.6 * s, 0.8 * s, dark); cab.position.y = 2.95 * s; g.add(cab);
    for (const sx of [-1, 1]) {
      const leg = B(0.3 * s, 2.2 * s, 0.4 * s, dark); leg.position.set(sx * 0.6 * s, 1.1 * s, 0); g.add(leg);
    }
    const gun = B(0.25 * s, 0.25 * s, 1.4 * s, dark); gun.position.set(0, 2.3 * s, 1.4 * s); g.add(gun);
    const eye = B(0.5 * s, 0.12 * s, 0.05, eyeMat); eye.position.set(0, 3.0 * s, 0.42 * s); g.add(eye);
  } else if (kind === 'fabcore') {
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
    const sig = B(0.18, 0.5, 0.18, rustGlowMat); sig.position.y = (kind === 'sentinel' ? 3.4 : 1.9) * s; g.add(sig);
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
    this.name = opts.name || Names.machine(world.seed, enemySalt++);
    this.questTag = opts.questTag || null;
    this.raider = opts.raider || false; // raiders do not respect the fields
    this.homeNest = opts.homeNest || null;
    // what it wears is what it is — and what it drops
    this.loadout = generateLoadout(kind, tierMult, infected);
    for (const p of this.loadout) {
      this.maxHp += Math.round((p.stats.hull || 0) * 0.6 + (p.stats.armor || 0) * 1.5);
      if (p.slot === 'ARMS') this.dmg += (p.stats.damage || 0) * 0.35;
    }
    this.hp = this.maxHp;
    this.pos = new THREE.Vector3(x, world.getHeight(x, z), z);
    this.mesh = buildEnemyMesh(kind, this.def, infected);
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
      this.move(Math.sin(this.heading), Math.cos(this.heading), this.speed * (this.repelledT > 0 ? 0.95 : 0.3), dt, world);
      if (toPlayer < this.aggroR * (this.aggroMul ?? 1) && this.repelledT <= 0) this.state = 'chase';
    } else if (this.state === 'chase') {
      const dx = target.pos.x - this.pos.x, dz = target.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      this.heading = Math.atan2(dx, dz);
      const range = this.def.melee ? this.def.attackRange : this.def.attackRange * 0.8;
      if (toPlayer > range) this.move(dx / d, dz / d, this.speed, dt, world);
      if (toPlayer < (this.def.melee ? this.def.attackRange : this.def.attackRange) && this.attackT <= 0) {
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
    this.mesh.position.y += Math.abs(Math.sin(this.animT * 8)) * 0.06 * this.def.scale;
    // hit flash: a brief pale blaze, unmissable
    this.mesh.traverse(o => { if (o.material && o.material.emissive) o.material.emissive.setHex(this.flashT > 0 ? 0x9a9484 : 0x000000); });
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
      this.spawnT = 2.6;
      if (this.enemies.length < this.cap) this.trySpawn(player, isNight);
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
      e.update(dt, targets, this.world, projectiles, this.safeZones);
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
    const kind = rand.pick(biome.enemyKinds);
    const distFromOrigin = Math.hypot(x, z);
    const tierMult = 1 + Math.min(2.2, distFromOrigin / 1300);
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
    this.enemies.splice(i, 1);
  }

  // returns enemies hit by a melee arc from `pos` facing `yaw`
  meleeArc(pos, yaw, range, halfAngle = 1.1) {
    const out = [];
    for (const e of this.enemies) {
      const dx = e.pos.x - pos.x, dz = e.pos.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d > range + e.def.scale) continue;
      const ang = Math.atan2(dx, dz);
      let da = Math.abs(ang - yaw);
      if (da > Math.PI) da = Math.PI * 2 - da;
      if (da < halfAngle) out.push(e);
    }
    return out;
  }
}

export const ENEMY_KINDS = KIND_DEFS;
