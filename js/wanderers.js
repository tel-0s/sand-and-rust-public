// Fellow travelers. Camps are barely more than a tent and a robot-fire on the
// open lattice — no salt required, no walls, just company. The souls there
// talk, trade, gossip, fight beside you, and the dearest of them will walk
// with you. The world may be desolate, but you need not wander alone.
import * as THREE from 'three';
import { randFromHash, hash2, Rand } from './rng.js';
import { Names } from './grammar.js';
import { GeoBuilder } from './structures.js';
import { makeCircle, makeBox } from './collision.js';
import { QUIRK_ADDRESS, QUIRK_TAG } from './dialogue.js';
import { buildResidentMesh } from './stills.js';
import { sampleForm, lineageAt, biomeAccent } from './frames.js';
import { rollFolkLoadout, attachGreebles } from './enemies.js';

const CAMP_CELL = 1300;
const MENDER_ROLES = ['tinker-errant', 'road-mender', 'pilgrim', 'well-keeper', 'sweeper', 'abbot', 'tinker'];
const WANDERER_ROLES = ['drifter', 'prospector', 'outrider', 'salvage-hand', 'tinker-errant', 'road-mender', 'pilgrim', 'courier'];
export const archetypeOf = (role) => MENDER_ROLES.includes(role) ? 'mender' : 'fighter';

const campMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const emberMat = new THREE.MeshBasicMaterial({ color: 0xff8a3c });

// ---------- a person of the open road ----------
export class Wanderer {
  constructor(scene, world, camp, idx, rng, neighbors) {
    this.id = `wnd:${camp.key}:${idx}`;
    this.world = world;
    this.camp = camp;
    this.temperament = rng.weighted([['scavver', 3], ['mercantile', 2.5], ['monastic', 1.5], ['ferrocult', 1]]);
    this.name = Names.person(world.seed, hash2(world.seed, camp.salt, idx + 40));
    this.role = rng.pick(WANDERER_ROLES);
    this.archetype = archetypeOf(this.role);
    this.baseDisp = rng.int(2, 18); // road folk are glad of faces
    this.trader = rng.chance(0.4);
    this.recruitable = true;
    this.quirk = { address: rng.pick(QUIRK_ADDRESS), tag: rng.pick(QUIRK_TAG), tagChance: rng.range(0.18, 0.42) };
    this.origin = (neighbors.length && rng.chance(0.7)) ? rng.pick(neighbors).name : null;
    this.opinionOf = null;
    // dialogue stack expects a "still": the camp stands in
    this.still = camp.pseudoStill;
    const wTier = 1 + Math.min(1.5, Math.hypot(camp.x, camp.z) / 2000);
    this.maxHp = Math.round(75 * wTier); this.hp = this.maxHp;
    this.dmg = 9 * wTier;
    this.loadout = rollFolkLoadout(rng, wTier);
    for (const p of this.loadout) {
      this.maxHp += Math.round((p.stats.hull || 0) * 0.5 + (p.stats.armor || 0));
      if (p.slot === 'ARMS') this.dmg += (p.stats.damage || 0) * 0.3;
    }
    this.hp = this.maxHp;
    this.atkT = 0; this.flashT = 0;
    const frameRoll = hash2(world.seed, camp.salt, idx * 13 + 977) % 100;
    this.bodyFrame = frameRoll < 14 ? 'quad' : frameRoll < 22 ? 'lowslung' : 'biped';
    // machinic DNA: a fresh hash stream, the camp's ground for an accent
    this.form = sampleForm(hash2(world.seed, camp.salt, idx * 41 + 5501), {
      temperament: this.temperament, lineage: lineageAt(world.seed, camp.x, camp.z), spread: 0.9,
      accent: biomeAccent(world.seed, world.biomeAt(camp.x, camp.z).id),
    });
    this.mesh = buildResidentMesh(this.temperament, true, this.bodyFrame, this.form);
    attachGreebles(this.mesh, this.loadout, 0.8);
    scene.add(this.mesh);
    const a = rng.range(0, Math.PI * 2);
    this.pos = new THREE.Vector3(camp.x + Math.sin(a) * 3.5, 0, camp.z + Math.cos(a) * 3.5);
    this.yaw = rng.range(0, Math.PI * 2);
    this.target = null; this.pauseT = rng.range(0, 4); this.animT = rng.range(0, 10);
  }

  damage(n) { this.hp -= n; this.flashT = 0.15; return n; }

  update(dt, player, enemies, isNight) {
    this.animT += dt;
    this.atkT = Math.max(0, this.atkT - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    const toPlayer = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);

    // a fight near camp is everyone's fight
    let foe = null, fd = 18;
    for (const e of enemies.enemies) {
      const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
      if (d < fd) { fd = d; foe = e; }
    }
    if (foe && this.archetype === 'fighter') {
      const dx = foe.pos.x - this.pos.x, dz = foe.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      this.yaw = Math.atan2(dx, dz);
      if (d > 2.4) { this.pos.x += (dx / d) * 4.2 * dt; this.pos.z += (dz / d) * 4.2 * dt; }
      else if (this.atkT <= 0) {
        this.atkT = 1.2;
        foe.hurt(this.dmg, (dx / d) * 4, (dz / d) * 4);
        if (this.onStrike) this.onStrike(foe);
      }
    } else if (foe && fd < 6) {
      // menders back away from trouble
      const dx = this.pos.x - foe.pos.x, dz = this.pos.z - foe.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      this.pos.x += (dx / d) * 3.5 * dt; this.pos.z += (dz / d) * 3.5 * dt;
    } else if (toPlayer < 6) {
      this.target = null;
      this.yaw = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
    } else if (this.target) {
      const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.5) { this.target = null; this.pauseT = 3 + Math.random() * 6; }
      else { this.yaw = Math.atan2(dx, dz); this.pos.x += (dx / d) * 1.2 * dt; this.pos.z += (dz / d) * 1.2 * dt; }
    } else {
      this.pauseT -= dt;
      if (this.pauseT <= 0 && !isNight) {
        const a = Math.random() * Math.PI * 2, r = 2.5 + Math.random() * 6;
        this.target = { x: this.camp.x + Math.sin(a) * r, z: this.camp.z + Math.cos(a) * r };
      }
    }
    this.world.collide(this.pos, 0.45, this.pos.y);
    this.pos.y = this.world.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.1);
    this.mesh.position.copy(this.pos);
    this.mesh.position.y += Math.abs(Math.sin(this.animT * (this.target || foe ? 7 : 1.5))) * 0.05;
    this.mesh.rotation.y = this.yaw;
    this.mesh.traverse(o => { if (o.material && o.material.emissive) o.material.emissive.setHex(this.flashT > 0 ? 0x884433 : 0x000000); });
  }

  dispose(scene) { scene.remove(this.mesh); }
}

// ---------- camps: a fire on the open lattice ----------
export class CampManager {
  constructor(scene, world, stills, hooks = {}) {
    this.scene = scene; this.world = world; this.stills = stills;
    this.hooks = hooks; // { onDiscover, isRecruited }
    this.cells = new Map();
    this.loaded = new Map();
    this.restCooldowns = new Map();
  }

  infoAt(cx, cz) {
    const key = cx + ',' + cz;
    if (this.cells.has(key)) return this.cells.get(key);
    let info = null;
    const rng = randFromHash(this.world.seed, cx * 41 + 11, cz * 41 + 19);
    if (rng.chance(0.3)) {
      const x = (cx + rng.range(0.2, 0.8)) * CAMP_CELL;
      const z = (cz + rng.range(0.2, 0.8)) * CAMP_CELL;
      // camps keep clear of settlements — that's what walls are for
      const nearStill = this.stills.stillsNear(x, z, 600).length > 0;
      if (!nearStill) {
        const salt = hash2(this.world.seed, cx * 43 + 5, cz * 43 + 23);
        const leader = Names.person(this.world.seed, hash2(this.world.seed, salt, 40));
        const name = `${leader}’s fire`;
        info = {
          key, x, z, salt, name,
          residents: rng.chance(0.55) ? 2 : 1,
          pseudoStill: null, found: false,
        };
        info.pseudoStill = { key: 'camp:' + key, name, x, z, salt, temperament: 'scavver' };
      }
    }
    this.cells.set(key, info);
    return info;
  }

  campsNear(x, z, radius) {
    const out = [];
    const c0x = Math.floor((x - radius) / CAMP_CELL), c1x = Math.floor((x + radius) / CAMP_CELL);
    const c0z = Math.floor((z - radius) / CAMP_CELL), c1z = Math.floor((z + radius) / CAMP_CELL);
    for (let cz = c0z; cz <= c1z; cz++) {
      for (let cx = c0x; cx <= c1x; cx++) {
        const info = this.infoAt(cx, cz);
        if (info && Math.hypot(info.x - x, info.z - z) <= radius) out.push(info);
      }
    }
    return out;
  }

  update(dt, player, enemies, isNight) {
    const px = player.pos.x, pz = player.pos.z;
    for (const info of this.campsNear(px, pz, CAMP_CELL * 1.1)) {
      const d = Math.hypot(info.x - px, info.z - pz);
      if (d < 450 && !this.loaded.has(info.key)) this.load(info);
      if (d < 130 && !info.found) {
        info.found = true;
        if (this.hooks.onDiscover) this.hooks.onDiscover(info);
      }
    }
    for (const [key, rec] of this.loaded) {
      const d = Math.hypot(rec.info.x - px, rec.info.z - pz);
      if (d > 650) { this.unload(key); continue; }
      if (d < 150) {
        for (let i = rec.wanderers.length - 1; i >= 0; i--) {
          const w = rec.wanderers[i];
          if (w.hp <= 0) {
            if (this.hooks.onWandererDown) this.hooks.onWandererDown(w);
            w.dispose(this.scene);
            rec.wanderers.splice(i, 1);
            continue;
          }
          w.update(dt, player, enemies, isNight);
        }
        // the fire breathes
        rec.ember.material.color.setHex(Math.sin(performance.now() / 280) > 0 ? 0xff8a3c : 0xe06a28);
      }
    }
  }

  load(info) {
    const rng = randFromHash(this.world.seed, info.salt, 47);
    const gb = new GeoBuilder();
    const colliders = [];
    const gY = (x, z) => this.world.getHeight(x, z);
    const { x: cx, z: cz } = info;
    const y0 = gY(cx, cz);
    // the fire: a scavenged coil brazier
    gb.addBox(cx, y0 + 0.25, cz, 0.9, 0.5, 0.9, [0.25, 0.22, 0.2]);
    colliders.push(makeCircle(cx, cz, 0.7, y0 + 0.6, false));
    // the tent: two leaning slabs
    const ta = rng.range(0, Math.PI * 2);
    const tx = cx + Math.sin(ta) * 4, tz = cz + Math.cos(ta) * 4;
    const ty = gY(tx, tz);
    gb.addBox(tx - 0.8, ty + 0.9, tz, 0.12, 2.4, 2.6, [0.5, 0.38, 0.24], ta, 0.5);
    gb.addBox(tx + 0.8, ty + 0.9, tz, 0.12, 2.4, 2.6, [0.46, 0.35, 0.22], ta, -0.5);
    colliders.push(makeBox(tx, tz, 1.1, 1.4, ta, ty + 1.7, false));
    // a bench-log and the stash crate
    const ba = ta + rng.range(1.8, 2.6);
    gb.addBox(cx + Math.sin(ba) * 2.2, gY(cx + Math.sin(ba) * 2.2, cz + Math.cos(ba) * 2.2) + 0.3,
      cz + Math.cos(ba) * 2.2, 2.2, 0.5, 0.6, [0.4, 0.31, 0.2], ba + Math.PI / 2);
    const sa = ta + rng.range(3.6, 4.6);
    const sx = cx + Math.sin(sa) * 3, sz = cz + Math.cos(sa) * 3;
    gb.addBox(sx, gY(sx, sz) + 0.4, sz, 1.1, 0.8, 0.8, [0.42, 0.36, 0.28], sa);
    colliders.push(makeCircle(sx, sz, 0.7, gY(sx, sz) + 0.8, true));

    const mesh = new THREE.Mesh(gb.build(), campMat);
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    this.scene.add(mesh);
    const ember = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 5), emberMat.clone());
    ember.position.set(cx, y0 + 0.7, cz);
    this.scene.add(ember);
    this.world.staticColliders.push(...colliders);

    const neighbors = this.stills.stillsNear(cx, cz, 9500);
    const wanderers = [];
    for (let i = 0; i < info.residents; i++) {
      const w = new Wanderer(this.scene, this.world, info, i, rng, neighbors);
      if ((this.hooks.isRecruited && this.hooks.isRecruited(w.id))
        || (this.hooks.isSettled && this.hooks.isSettled(w.id))) { w.dispose(this.scene); continue; }
      wanderers.push(w);
    }
    this.loaded.set(info.key, { info, mesh, ember, wanderers, colliders, stash: { x: sx, z: sz, id: 'campstash:' + info.key } });
  }

  unload(key) {
    const rec = this.loaded.get(key);
    if (!rec) return;
    this.scene.remove(rec.mesh, rec.ember);
    rec.mesh.geometry.dispose();
    for (const w of rec.wanderers) w.dispose(this.scene);
    this.world.staticColliders = this.world.staticColliders.filter(c => !rec.colliders.includes(c));
    this.loaded.delete(key);
  }

  wandererNear(pos, r) {
    let best = null, bd = r;
    for (const rec of this.loaded.values()) {
      for (const w of rec.wanderers) {
        if (w.hp <= 0) continue;
        const d = Math.hypot(w.pos.x - pos.x, w.pos.z - pos.z);
        if (d < bd) { bd = d; best = w; }
      }
    }
    return best;
  }
  fireNear(pos, r) {
    for (const rec of this.loaded.values()) {
      if (Math.hypot(rec.info.x - pos.x, rec.info.z - pos.z) < r) return rec;
    }
    return null;
  }
  stashNear(pos, r) {
    for (const rec of this.loaded.values()) {
      if (Math.hypot(rec.stash.x - pos.x, rec.stash.z - pos.z) < r) return rec.stash;
    }
    return null;
  }
  reload(key) {
    const rec = this.loaded.get(key);
    if (!rec) return;
    const info = rec.info;
    this.unload(key);
    this.load(info);
  }

  removeWanderer(id) {
    for (const rec of this.loaded.values()) {
      const i = rec.wanderers.findIndex(w => w.id === id);
      if (i >= 0) { rec.wanderers[i].dispose(this.scene); rec.wanderers.splice(i, 1); return; }
    }
  }
  alliesNear(pos, r) {
    const out = [];
    for (const rec of this.loaded.values()) {
      for (const w of rec.wanderers) {
        if (w.hp > 0 && Math.hypot(w.pos.x - pos.x, w.pos.z - pos.z) < r) out.push(w);
      }
    }
    return out;
  }
}

// ---------- the one who walks with you ----------
export class FollowerSystem {
  constructor(scene, world) {
    this.scene = scene; this.world = world;
    this.follower = null;
    this.second = null; // THE SECOND CHAIR: earned, not given
    this.onDown = null; this.onHeal = null; this.onStrike = null;
  }

  list() { return [this.follower, this.second].filter(Boolean); }
  hasRoom(secondUnlocked) { return !this.follower || (!!secondUnlocked && !this.second); }

  recruit(npc, homeLabel) {
    const f = {
      id: npc.id, name: npc.name, role: npc.role, temperament: npc.temperament,
      quirk: npc.quirk, origin: npc.origin, homeLabel,
      archetype: archetypeOf(npc.role),
      maxHp: 110, hp: 110, dmg: 11, atkT: 0, healT: 6, flashT: 0, animT: 0, regenT: 0,
      pos: npc.pos.clone(), yaw: npc.yaw || 0,
      still: npc.still, baseDisp: npc.baseDisp, trader: false, recruitable: false,
      isFollower: true, opinionOf: null,
      // THE KIT (THE COMPANY b1): parts given by the walker — best equips, rest rides
      gear: [], equipped: { PLATING: null, ARMS: null, CORE: null },
      gearHull: 0, gearArmor: 0, gearDmg: 0, abilityT: 0, barrierT: 0,
      damage: (n) => {
        if (f.barrierT > 0) { f.flashT = 0.1; return 0; } // the aegis holds
        const cut = Math.max(1, n - (f.gearArmor || 0) * 0.4);
        f.hp -= cut; f.flashT = 0.15; return cut;
      },
      mesh: buildResidentMesh(npc.temperament, true, npc.bodyFrame || 'biped', npc.form || null),
    };
    f.mesh.position.copy(f.pos);
    this.scene.add(f.mesh);
    if (!this.follower) this.follower = f;
    else this.second = f;
    return f;
  }

  serializeOne(f) {
    if (!f) return null;
    return {
      id: f.id, name: f.name, role: f.role, temperament: f.temperament,
      quirk: f.quirk, origin: f.origin, homeLabel: f.homeLabel,
      baseDisp: f.baseDisp, hp: f.hp, gear: f.gear, tierPeak: f.tierPeak || 1,
    };
  }
  serialize() { return this.serializeOne(this.follower); }
  serializeSecond() { return this.serializeOne(this.second); }
  restore(data, playerPos) {
    if (!data) return;
    const f = this.recruit({
      id: data.id, name: data.name, role: data.role, temperament: data.temperament,
      quirk: data.quirk, origin: data.origin, baseDisp: data.baseDisp,
      pos: playerPos.clone(), yaw: 0,
      still: { key: 'road', name: 'the road', x: playerPos.x, z: playerPos.z, temperament: data.temperament },
    }, data.homeLabel);
    f.hp = Math.max(30, data.hp ?? 110);
    f.gear = data.gear || [];
    f.tierPeak = data.tierPeak || 1;
    this.refreshGear(f);
    return f;
  }

  // ---------- THE KIT: the company wears what you give them ----------
  gearValue(part) {
    const s = part.stats || {};
    return part.tier * 10 + (s.hull || 0) * 0.5 + (s.armor || 0) * 4
      + (s.damage || 0) * 2 + (s.powerOut || 0) * 0.4 + (part.rusted ? 5 : 0);
  }
  refreshGear(f) {
    for (const slot of ['PLATING', 'ARMS', 'CORE']) {
      const pool = f.gear.filter(p => p.slot === slot);
      f.equipped[slot] = pool.length
        ? pool.reduce((a, b) => this.gearValue(b) > this.gearValue(a) ? b : a) : null;
    }
    const eq = Object.values(f.equipped).filter(Boolean);
    f.gearHull = eq.reduce((a, p) => a + (p.stats.hull || 0), 0);
    f.gearArmor = eq.reduce((a, p) => a + (p.stats.armor || 0), 0);
    f.gearDmg = eq.reduce((a, p) => a + (p.stats.damage || 0), 0);
  }
  give(part, f = this.follower) {
    if (!f || !['PLATING', 'ARMS', 'CORE'].includes(part.slot)) return false;
    f.gear.push(part);
    this.refreshGear(f);
    return true;
  }
  takeBack(i, f = this.follower) {
    if (!f || !f.gear[i]) return null;
    const p = f.gear.splice(i, 1)[0];
    this.refreshGear(f);
    return p;
  }

  dismiss(f = this.follower) {
    if (!f) return;
    f.mesh && this.scene.remove(f.mesh);
    if (this.second === f) { this.second = null; return; }
    // the first chair empties: the second moves up, as companies do
    this.follower = this.second;
    this.second = null;
  }

  update(dt, player, enemies, worldT = 0) {
    for (let i = 0; i < 2; i++) {
      const f = i === 0 ? this.follower : this.second;
      if (f) this.updateOne(f, i, dt, player, enemies, worldT);
    }
    // the company keeps its spacing
    if (this.follower && this.second) {
      const a = this.follower, b = this.second;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 1.6 && d > 1e-4) {
        const push = (1.6 - d) / 2;
        a.pos.x -= dx / d * push; a.pos.z -= dz / d * push;
        b.pos.x += dx / d * push; b.pos.z += dz / d * push;
      }
    }
  }

  updateOne(f, slot, dt, player, enemies, worldT = 0) {
    f.animT += dt;
    f.atkT = Math.max(0, f.atkT - dt);
    f.healT = Math.max(0, f.healT - dt);
    f.flashT = Math.max(0, f.flashT - dt);

    if (f.hp <= 0) {
      // THE WANT: the sworn refuse to fall — once a world-day, they simply
      // decide the ground is not having them
      if (f.sworn && worldT - (f._lastStand ?? -9) > 1) {
        f._lastStand = worldT;
        f.hp = Math.round(f.maxHp * 0.25);
        f.flashT = 0.5;
        if (this.onLastStand) this.onLastStand(f);
      } else {
        if (this.onDown) this.onDown(f);
        this.dismiss(f);
        return;
      }
    }

    const toPlayer = Math.hypot(player.pos.x - f.pos.x, player.pos.z - f.pos.z);
    const side = slot === 1 ? -2 : 2; // each chair keeps its own shoulder
    if (toPlayer > 60) { f.pos.set(player.pos.x + side, player.pos.y, player.pos.z + 2); } // catch up

    // a companion grows with the desert they walk: hull and arm scale like the
    // machines they face (the 110 floor never drops)
    // a companion grows with the deepest desert they have WALKED — and never
    // gives it back (the old live-distance scaling visibly shrank them on
    // the way home, which read as sickness, not scale)
    f.tierPeak = Math.max(f.tierPeak || 1, 1 + Math.min(2.2, Math.hypot(f.pos.x, f.pos.z) / 1300));
    const tier = f.tierPeak;
    const newMax = Math.round((110 + (f.gearHull || 0) * 0.8) * tier * (f.sworn ? 1.15 : 1));
    if (newMax !== f.maxHp) {
      const frac = f.maxHp > 0 ? f.hp / f.maxHp : 1;
      f.maxHp = newMax;
      f.hp = Math.min(newMax, frac * newMax);
    }
    f.dmg = (11 + (f.gearDmg || 0) * 0.3) * tier * (f.sworn ? 1.15 : 1);
    f.barrierT = Math.max(0, (f.barrierT || 0) - dt);
    f.abilityT = Math.max(0, (f.abilityT || 0) - dt);

    // fight what threatens you (fighters close in; menders keep their distance)
    let foe = null, fd = 20;
    for (const e of enemies.enemies) {
      const d = Math.hypot(e.pos.x - player.pos.x, e.pos.z - player.pos.z);
      if (d < fd && e.state === 'chase') { fd = d; foe = e; }
    }

    // THE KIT: a companion USES what they carry — every granted ability
    // has a combat meaning, keyed to its nature
    if (f.abilityT <= 0) {
      const abParts = Object.values(f.equipped).filter(p => p && p.ability);
      for (const p of abParts) {
        const ab = p.ability;
        const power = Math.round((6 + p.tier * 5 + ((p.stats || {}).damage || 0) * 0.4) * (p.rusted ? 1.25 : 1));
        const ffd = foe ? Math.hypot(foe.pos.x - f.pos.x, foe.pos.z - f.pos.z) : 999;
        if (ab === 'mend' && (player.hull < player.stats.maxHull - 12 || f.hp < f.maxHp - 12)) {
          f.abilityT = 12;
          player.hull = Math.min(player.stats.maxHull, player.hull + power);
          f.hp = Math.min(f.maxHp, f.hp + power);
          if (this.onAbility) this.onAbility(f, ab, f);
          break;
        }
        if (ab === 'barrier' && foe && f.hp < f.maxHp * 0.45) {
          f.abilityT = 14; f.barrierT = 4;
          if (this.onAbility) this.onAbility(f, ab, f);
          break;
        }
        if (ab === 'overchg' && f.hp < f.maxHp * 0.6 && !foe) {
          f.abilityT = 18; f.hp = Math.min(f.maxHp, f.hp + power * 1.5);
          if (this.onAbility) this.onAbility(f, ab, f);
          break;
        }
        if (['lance', 'volley'].includes(ab) && foe && ffd < 26 && ffd > 4) {
          f.abilityT = 9;
          const kd = ffd || 1;
          foe.hurt(power * (ab === 'lance' ? 1.8 : 1.3),
            (foe.pos.x - f.pos.x) / kd * 4, (foe.pos.z - f.pos.z) / kd * 4);
          if (this.onAbility) this.onAbility(f, ab, foe);
          break;
        }
        if (['whirl', 'crush', 'ram', 'dash', 'leap', 'surge'].includes(ab) && foe && ffd < 5) {
          f.abilityT = 9;
          const aoe = ['whirl', 'crush'].includes(ab);
          for (const e of enemies.enemies) {
            const d2 = Math.hypot(e.pos.x - f.pos.x, e.pos.z - f.pos.z);
            if (e === foe || (aoe && d2 < 4.5)) {
              const kd = d2 || 1;
              e.hurt(power * (e === foe ? 1.5 : 1), (e.pos.x - f.pos.x) / kd * 6, (e.pos.z - f.pos.z) / kd * 6);
            }
          }
          if (this.onAbility) this.onAbility(f, ab, foe);
          break;
        }
        // ping and the rest: no combat meaning yet — the part still armors
      }
    }
    // machines self-mend, given a quiet moment
    if (!foe) {
      f.regenT += dt;
      if (f.regenT > 4 && f.hp < f.maxHp) f.hp = Math.min(f.maxHp, f.hp + 4 * dt);
    } else f.regenT = 0;
    let moved = false;
    if (foe && f.archetype === 'fighter') {
      const dx = foe.pos.x - f.pos.x, dz = foe.pos.z - f.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      f.yaw = Math.atan2(dx, dz);
      if (d > 2.4) { f.pos.x += (dx / d) * 7.5 * dt; f.pos.z += (dz / d) * 7.5 * dt; moved = true; }
      else if (f.atkT <= 0) {
        f.atkT = 1.0;
        foe.hurt(f.dmg, (dx / d) * 5, (dz / d) * 5);
        if (this.onStrike) this.onStrike(f, foe);
      }
    } else if (toPlayer > 4.5) {
      // heel: a spot just off your shoulder
      const dx = player.pos.x - f.pos.x, dz = player.pos.z - f.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      f.yaw = Math.atan2(dx, dz);
      const speed = Math.min(13, 4 + toPlayer * 0.9);
      f.pos.x += (dx / d) * speed * dt; f.pos.z += (dz / d) * speed * dt;
      moved = true;
    } else {
      f.yaw = Math.atan2(player.pos.x - f.pos.x, player.pos.z - f.pos.z);
    }

    // menders patch your hull on the move
    if (f.archetype === 'mender' && f.healT <= 0 && player.hull < player.stats.maxHull - 4) {
      f.healT = 9;
      player.hull = Math.min(player.stats.maxHull, player.hull + 7);
      if (this.onHeal) this.onHeal(f);
    }

    this.world.collide(f.pos, 0.45, f.pos.y);
    f.pos.y = this.world.groundAt(f.pos.x, f.pos.z, f.pos.y + 0.1);
    f.mesh.position.copy(f.pos);
    f.mesh.position.y += Math.abs(Math.sin(f.animT * 7)) * (moved ? 0.06 : 0.02);
    f.mesh.rotation.y = f.yaw;
    f.mesh.traverse(o => { if (o.material && o.material.emissive) o.material.emissive.setHex(f.flashT > 0 ? 0x884433 : 0x000000); });
  }
}
