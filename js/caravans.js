// THE ROADS — caravans walk real routes between neighbor stills.
// Each route is a deterministic edge in the still-neighbor graph; its caravan
// exists on a schedule derived from world time, so the road is walked whether
// you are watching or not. Come within range and it materializes: a caravan
// master and their people in file, quadruped beastbot haulers panniered with
// cargo, bells on the lead beast. They talk, they trade, they camp at night,
// and the desert sends things against them. What happens to a caravan happens
// to both ends of its road.
import * as THREE from 'three';
import { hash2, hashString, randFromHash } from './rng.js';
import { Names } from './grammar.js';
import { buildResidentMesh } from './stills.js';
import { rollFolkLoadout, attachGreebles } from './enemies.js';
import { sampleForm, lineageAt, biomeAccent } from './frames.js';
import { QUIRK_ADDRESS, QUIRK_TAG } from './dialogue.js';

const ROUTE_R = 6500;    // how far a still's trade reaches (matches gossip)
const LEG_DAYS = 0.55;   // one walked leg, in world days
const REST_DAYS = 0.2;   // laid up at each endpoint
const LOAD_R = 700;      // materialize within this range
const UNLOAD_R = 950;
const CARAVAN_ROLES = ['caravan master', 'drover', 'outrider', 'tally-keeper'];

// ---------- the beastbot: a quadruped hauler, low and patient ----------
function buildBeastbot(rng) {
  const g = new THREE.Group();
  const hide = new THREE.MeshLambertMaterial({ color: 0x5a4632 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x3a2f22 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.3, 1.5), hide);
  body.position.y = 1.4;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.9), dark);
  head.position.set(0, 1.05, 1.15);
  g.add(head);
  const bell = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.16),
    new THREE.MeshBasicMaterial({ color: 0x9a7530 }));
  bell.position.set(0, 0.68, 1.3);
  g.add(bell);
  const legs = [];
  for (const [lx, lz] of [[-0.95, 0.55], [0.95, 0.55], [-0.95, -0.55], [0.95, -0.55]]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.15, 0.32), dark);
    leg.position.set(lx, 0.62, lz);
    g.add(leg);
    legs.push(leg);
  }
  for (const side of [-1, 1]) {
    const pan = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 1.15), dark);
    pan.position.set(side * 1.35, 1.45, -0.1);
    g.add(pan);
  }
  const cargo = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.55, 1.05), hide);
  cargo.position.set(0, 2.25, -0.15);
  cargo.rotation.y = rng.range(-0.15, 0.15);
  g.add(cargo);
  g.userData.legs = legs;
  return g;
}

class Beastbot {
  constructor(scene, world, rng, slot) {
    this.world = world;
    this.slot = slot;
    this.hp = 480; this.maxHp = 480; // a wall that walks
    this.dmg = 7;                     // and barely bites — but oh, the shove
    this.atkT = 0; this.flashT = 0;
    this.animT = rng.range(0, 9);
    this.mesh = buildBeastbot(rng);
    this.pos = new THREE.Vector3();
    this.yaw = 0;
    scene.add(this.mesh);
  }
  damage(n) { this.hp -= n; this.flashT = 0.15; return n; }
  update(dt, tx, tz, moving, enemies) {
    this.animT += dt;
    this.atkT = Math.max(0, this.atkT - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    // a threatened hauler lowers its head and shoves: low damage, huge
    // knockback, and 480 points of patience soaking hits off the crew
    if (enemies) {
      let foe = null, fd = 13;
      for (const e of enemies.enemies) {
        const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
        if (d < fd) { fd = d; foe = e; }
      }
      if (foe) {
        const dx = foe.pos.x - this.pos.x, dz = foe.pos.z - this.pos.z;
        const d = Math.hypot(dx, dz) || 1;
        this.yaw += (Math.atan2(dx, dz) - this.yaw) * Math.min(1, dt * 3);
        if (d > 2.6) { this.pos.x += (dx / d) * 3.2 * dt; this.pos.z += (dz / d) * 3.2 * dt; }
        else if (this.atkT <= 0) { this.atkT = 2.0; foe.hurt(this.dmg, (dx / d) * 11, (dz / d) * 11); }
        this.world.collide(this.pos, 0.9, this.pos.y);
        this.pos.y = this.world.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.1);
        this.mesh.position.copy(this.pos);
        this.mesh.rotation.y = this.yaw;
        this.mesh.userData.legs.forEach((leg, i) =>
          leg.rotation.x = Math.sin(this.animT * 4.2 + (i % 2 ? Math.PI : 0)) * 0.42);
        this.mesh.traverse(o => { if (o.material && o.material.emissive) o.material.emissive.setHex(this.flashT > 0 ? 0x884433 : 0x000000); });
        return;
      }
    }
    const bx = this.pos.x, bz = this.pos.z;
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    let wanted = 0;
    if (d > 0.6) {
      const sp = Math.min(7.5, d * 1.4);
      // when the desert blocks the straight line, slide around it
      let mx = dx / d, mz = dz / d;
      if ((this.stuckT || 0) > 0.45) {
        const a = (this.detour || (this.detour = Math.random() < 0.5 ? 1 : -1)) * 1.0;
        const ca = Math.cos(a), sa = Math.sin(a);
        [mx, mz] = [mx * ca - mz * sa, mx * sa + mz * ca];
      }
      this.pos.x += mx * sp * dt;
      this.pos.z += mz * sp * dt;
      wanted = sp * dt;
      this.yaw += (Math.atan2(mx, mz) - this.yaw) * Math.min(1, dt * 4);
    }
    this.world.collide(this.pos, 0.9, this.pos.y);
    if (wanted > 0.02) {
      const movedD = Math.hypot(this.pos.x - bx, this.pos.z - bz);
      if (movedD < wanted * 0.3) {
        this.stuckT = (this.stuckT || 0) + dt;
        if (this.stuckT > 1.4) { this.detour = -(this.detour || 1); this.stuckT = 0.5; } // try the other way around
      } else { this.stuckT = 0; this.detour = 0; }
    }
    this.pos.y = this.world.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.1);
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.y = this.yaw;
    const stride = (moving || d > 0.6) ? 1 : 0.12;
    this.mesh.userData.legs.forEach((leg, i) =>
      leg.rotation.x = Math.sin(this.animT * 4.2 + (i % 2 ? Math.PI : 0)) * 0.42 * stride);
    this.mesh.traverse(o => { if (o.material && o.material.emissive) o.material.emissive.setHex(this.flashT > 0 ? 0x884433 : 0x000000); });
  }
  dispose(scene) { scene.remove(this.mesh); }
}

// ---------- the people of the road ----------
class Caravaneer {
  constructor(scene, world, caravan, idx, rng) {
    this.id = `cvn:${caravan.key}:${idx}`;
    this.world = world;
    this.camp = caravan; // dialogue: road-folk (road talk, no "this place" history)
    this.temperament = rng.weighted([['mercantile', 4], ['scavver', 2], ['monastic', 1], ['ferrocult', 0.7]]);
    this.name = Names.person(world.seed, hash2(world.seed, caravan.salt, idx + 700));
    this.role = CARAVAN_ROLES[Math.min(idx, CARAVAN_ROLES.length - 1)];
    this.archetype = this.role === 'outrider' || this.role === 'drover' ? 'fighter' : 'mender';
    this.baseDisp = rng.int(4, 20); // the road is glad of faces
    this.trader = idx === 0 ? true : rng.chance(0.5);
    this.recruitable = false;       // they have a contract already
    this.quirk = { address: rng.pick(QUIRK_ADDRESS), tag: rng.pick(QUIRK_TAG), tagChance: rng.range(0.18, 0.42) };
    const home = rng.chance(0.5) ? caravan.route.a : caravan.route.b; // one draw, as before
    this.origin = home.name;
    this.opinionOf = null;
    this.still = caravan.pseudoStill;
    this.slot = idx * 3.4;
    const tier = 1 + Math.min(1.5, Math.hypot(caravan.pseudoStill.x, caravan.pseudoStill.z) / 2000);
    this.maxHp = Math.round(125 * tier); // the road doesn't hire the fragile
    this.dmg = 11 * tier;
    // signing bonus: real plate — and the wealth of home shows on the road:
    // crews out of a thriving still wear it, crews out of a fading one don't
    const homeStage = caravan.stageOf ? (caravan.stageOf(home.key) || 0) : 0;
    this.loadout = rollFolkLoadout(rng, tier + 1.2, homeStage); // a real equipment floor
    for (const p of this.loadout) {
      this.maxHp += Math.round((p.stats.hull || 0) * 0.5 + (p.stats.armor || 0));
      if (p.slot === 'ARMS') this.dmg += (p.stats.damage || 0) * 0.3;
    }
    this.hp = this.maxHp;
    this.atkT = 0; this.flashT = 0; this.animT = rng.range(0, 9);
    const frameRoll = hash2(world.seed, caravan.salt, idx * 13 + 977) % 100;
    this.bodyFrame = frameRoll < 16 ? 'quad' : 'biped'; // road folk favor legs that haul
    // machinic DNA: crews carry the body dialect of the still that raised them
    this.form = sampleForm(hash2(world.seed, caravan.salt, idx * 41 + 5501), {
      temperament: this.temperament, lineage: lineageAt(world.seed, home.x, home.z), spread: 0.9,
      accent: biomeAccent(world.seed, world.biomeAt(home.x, home.z).id),
    });
    this.mesh = buildResidentMesh(this.temperament, true, this.bodyFrame, this.form);
    attachGreebles(this.mesh, this.loadout, 0.8, homeStage);
    scene.add(this.mesh);
    this.pos = new THREE.Vector3();
    this.yaw = 0;
  }
  damage(n) { this.hp -= n; this.flashT = 0.15; return n; }
  update(dt, player, enemies, tx, tz) {
    this.animT += dt;
    this.atkT = Math.max(0, this.atkT - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    let foe = null, fd = 18;
    for (const e of enemies.enemies) {
      const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
      if (d < fd) { fd = d; foe = e; }
    }
    const toPlayer = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
    if (foe && this.archetype === 'fighter') {
      const dx = foe.pos.x - this.pos.x, dz = foe.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      this.yaw = Math.atan2(dx, dz);
      if (d > 2.4) { this.pos.x += (dx / d) * 4.4 * dt; this.pos.z += (dz / d) * 4.4 * dt; }
      else if (this.atkT <= 0) { this.atkT = 1.2; foe.hurt(this.dmg, (dx / d) * 4, (dz / d) * 4); }
    } else if (foe && fd < 7) {
      const dx = this.pos.x - foe.pos.x, dz = this.pos.z - foe.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      this.pos.x += (dx / d) * 3.6 * dt; this.pos.z += (dz / d) * 3.6 * dt;
    } else if (toPlayer < 5 && Math.hypot(tx - this.pos.x, tz - this.pos.z) < 3) {
      // in slot and a face nearby: be sociable. out of slot: march first.
      this.yaw = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
    } else {
      const bx = this.pos.x, bz = this.pos.z;
      const dx = tx - this.pos.x, dz = tz - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.5) {
        const sp = Math.min(8, d * 1.5);
        let mx = dx / d, mz = dz / d;
        if ((this.stuckT || 0) > 0.45) {
          const a = (this.detour || (this.detour = Math.random() < 0.5 ? 1 : -1)) * 1.0;
          const ca = Math.cos(a), sa = Math.sin(a);
          [mx, mz] = [mx * ca - mz * sa, mx * sa + mz * ca];
        }
        this.pos.x += mx * sp * dt;
        this.pos.z += mz * sp * dt;
        this.yaw = Math.atan2(mx, mz);
        this._wanted = sp * dt;
      } else this._wanted = 0;
    }
    this.world.collide(this.pos, 0.45, this.pos.y);
    if ((this._wanted || 0) > 0.02) {
      const movedD = Math.hypot(this.pos.x - (this._bx ?? this.pos.x), this.pos.z - (this._bz ?? this.pos.z));
      if (movedD < this._wanted * 0.3) {
        this.stuckT = (this.stuckT || 0) + dt;
        if (this.stuckT > 1.4) { this.detour = -(this.detour || 1); this.stuckT = 0.5; } // try the other way around
      } else { this.stuckT = 0; this.detour = 0; }
      this._wanted = 0;
    }
    this._bx = this.pos.x; this._bz = this.pos.z;
    this.pos.y = this.world.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.1);
    this.mesh.position.copy(this.pos);
    this.mesh.position.y += Math.abs(Math.sin(this.animT * 6)) * 0.05;
    this.mesh.rotation.y = this.yaw;
    this.mesh.traverse(o => { if (o.material && o.material.emissive) o.material.emissive.setHex(this.flashT > 0 ? 0x884433 : 0x000000); });
  }
  dispose(scene) { scene.remove(this.mesh); }
}

// ---------- the manager: routes, schedules, and what befalls them ----------
export class CaravanManager {
  constructor(scene, world, stills, hooks = {}) {
    this.scene = scene;
    this.world = world;
    this.stills = stills;
    this.hooks = hooks; // { isCut(routeKey), onScatter(caravan), onDefended(caravan) }
    this.loaded = new Map();
    this.scanT = 0;
    this.belled = new Set(); // routes already announced this session
  }

  // deterministic route edges: each still pairs with its 1-2 nearest neighbors
  routesNear(x, z) {
    const out = new Map();
    for (const s of this.stills.stillsNear(x, z, 9000)) {
      const neigh = this.stills.stillsNear(s.x, s.z, ROUTE_R)
        .filter(n => n.key !== s.key)
        .sort((p, q) => Math.hypot(p.x - s.x, p.z - s.z) - Math.hypot(q.x - s.x, q.z - s.z))
        .slice(0, 2);
      for (const n of neigh) {
        const key = [s.key, n.key].sort().join('|');
        if (out.has(key)) continue;
        const salt = hashString(key) | 0;
        const rng = randFromHash(this.world.seed, salt, 733);
        if (!rng.chance(0.65)) continue; // not every road is walked
        // the schedule walks at honest footpace (5.5 m/s) — a leg takes as
        // long as its distance demands, or the crew can never keep the column
        const legDays = Math.max(0.2, Math.hypot(n.x - s.x, n.z - s.z) / (5.5 * 480));
        // a/b must follow the SORTED key, not iteration order — otherwise
        // the same route flips ends depending on where you queried from,
        // and the schedule (pure in worldT) mirrors: caravans teleporting
        // to the reflected point whenever the query context changed
        const [aS, bS] = s.key < n.key ? [s, n] : [n, s];
        out.set(key, { key, a: aS, b: bS, salt, phase: rng.range(0, 1), legDays });
      }
    }
    return [...out.values()];
  }

  // routes run between the EDGES of stills, never through their walls:
  // clip an endpoint 50m out from the settlement's heart, toward the other
  // (FIELD_R is 42; the ground-blades stand at 36 — nobody paths into them)
  static clipToWall(from, toward) {
    const dx = toward.x - from.x, dz = toward.z - from.z;
    const d = Math.hypot(dx, dz) || 1;
    const off = Math.min(50, d * 0.4);
    return { x: from.x + (dx / d) * off, z: from.z + (dz / d) * off };
  }

  // where the caravan of this route stands at this hour, watched or not
  schedule(route, worldT) {
    const leg = route.legDays || LEG_DAYS;
    const cycle = 2 * (leg + REST_DAYS);
    const t = ((worldT + route.phase * cycle) % cycle + cycle) % cycle;
    let from, to, frac, resting = null;
    if (t < leg) { from = route.a; to = route.b; frac = t / leg; }
    else if (t < leg + REST_DAYS) { from = route.a; to = route.b; frac = 1; resting = route.b; }
    else if (t < 2 * leg + REST_DAYS) { from = route.b; to = route.a; frac = (t - leg - REST_DAYS) / leg; }
    else { from = route.b; to = route.a; frac = 1; resting = route.a; }
    const p0 = CaravanManager.clipToWall(from, to);
    const p1 = CaravanManager.clipToWall(to, from);
    return {
      x: p0.x + (p1.x - p0.x) * frac,
      z: p0.z + (p1.z - p0.z) * frac,
      from, to, frac, resting,
    };
  }

  load(route, sched, worldT) {
    const rng = randFromHash(this.world.seed, route.salt, 977);
    const pseudoStill = {
      key: 'cvn:' + route.key,
      name: `the ${route.a.name.replace(/^the\s+/i, '')}–${route.b.name.replace(/^the\s+/i, '')} road`,
      x: sched.x, z: sched.z, temperament: 'mercantile',
    };
    const caravan = {
      key: route.key, route, pseudoStill, rng, salt: route.salt,
      stageOf: (k) => this.hooks.stageOf ? this.hooks.stageOf(k) : 0,
      members: [], beasts: [], fire: null,
      ambushed: false, defendedTold: false,
    };
    const nMembers = rng.int(3, 4), nBeasts = rng.int(1, 2); // safety in numbers
    for (let i = 0; i < nMembers; i++) caravan.members.push(new Caravaneer(this.scene, this.world, caravan, i, rng));
    for (let i = 0; i < nBeasts; i++) caravan.beasts.push(new Beastbot(this.scene, this.world, rng, nMembers * 3.4 + i * 4.2));
    // place everyone at their slots immediately (no walk-in from origin)
    const dir = Math.atan2(sched.to.x - sched.from.x, sched.to.z - sched.from.z);
    const put = (ent, slot, lat) => {
      ent.pos.set(sched.x - Math.sin(dir) * slot + Math.cos(dir) * lat,
        0, sched.z - Math.cos(dir) * slot - Math.sin(dir) * lat);
      ent.pos.y = this.world.getHeight(ent.pos.x, ent.pos.z);
      ent.yaw = dir;
    };
    caravan.members.forEach((m, i) => put(m, m.slot, i % 2 ? 1.1 : -1.1));
    caravan.beasts.forEach((b, i) => put(b, b.slot, i % 2 ? -1.4 : 1.4));
    this.loaded.set(route.key, caravan);
    return caravan;
  }

  // an escort caravan is contract-bound: it exists for a work chain, walks
  // only while the player stays close, and its progress lives ON THE STEP —
  // so it survives saves, unloads, and the player wandering off.
  spawnEscort(step, chainId) {
    const key = 'esc:' + chainId;
    if (this.loaded.has(key)) return this.loaded.get(key);
    const route = { key: step.routeKey, a: step.from, b: step.to, salt: (hashString(step.routeKey + chainId) | 0) };
    const rng = randFromHash(this.world.seed, route.salt, 977);
    const s0 = CaravanManager.clipToWall(step.from, step.to);
    const s1 = CaravanManager.clipToWall(step.to, step.from);
    const pseudoStill = {
      key,
      name: `the ${step.from.name.replace(/^the\s+/i, '')}–${step.to.name.replace(/^the\s+/i, '')} road`,
      x: s0.x + (s1.x - s0.x) * step.progress,
      z: s0.z + (s1.z - s0.z) * step.progress,
      temperament: 'mercantile',
    };
    const caravan = {
      key, route, pseudoStill, rng, escort: step, chainId, salt: route.salt,
      stageOf: (k) => this.hooks.stageOf ? this.hooks.stageOf(k) : 0,
      members: [], beasts: [], fire: null,
      ambushed: false, defendedTold: false,
    };
    const nMembers = rng.int(3, 4), nBeasts = rng.int(1, 2); // safety in numbers
    for (let i = 0; i < nMembers; i++) caravan.members.push(new Caravaneer(this.scene, this.world, caravan, i, rng));
    for (let i = 0; i < nBeasts; i++) caravan.beasts.push(new Beastbot(this.scene, this.world, rng, nMembers * 3.4 + i * 4.2));
    const dir = Math.atan2(step.to.x - step.from.x, step.to.z - step.from.z);
    const put = (ent, slot, lat) => {
      ent.pos.set(pseudoStill.x - Math.sin(dir) * slot + Math.cos(dir) * lat,
        0, pseudoStill.z - Math.cos(dir) * slot - Math.sin(dir) * lat);
      ent.pos.y = this.world.getHeight(ent.pos.x, ent.pos.z);
      ent.yaw = dir;
    };
    caravan.members.forEach((m, i) => put(m, m.slot, i % 2 ? 1.1 : -1.1));
    caravan.beasts.forEach((b, i) => put(b, b.slot, i % 2 ? -1.4 : 1.4));
    this.loaded.set(key, caravan);
    return caravan;
  }

  unload(key) {
    const c = this.loaded.get(key);
    if (!c) return;
    for (const m of c.members) m.dispose(this.scene);
    for (const b of c.beasts) b.dispose(this.scene);
    if (c.fire) { this.scene.remove(c.fire); }
    if (c.fireZone && this.hooks.safeZones) {
      const zi = this.hooks.safeZones.indexOf(c.fireZone);
      if (zi >= 0) this.hooks.safeZones.splice(zi, 1);
    }
    this.loaded.delete(key);
  }

  update(dt, player, enemies, isNight, worldT) {
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = 0.8;
      for (const route of this.routesNear(player.pos.x, player.pos.z)) {
        if (this.loaded.has(route.key)) continue;
        if (this.hooks.isCut && this.hooks.isCut(route.key)) continue;
        const sched = this.schedule(route, worldT);
        if (sched.resting) continue; // laid up inside a still: not on the road
        if (Math.hypot(sched.x - player.pos.x, sched.z - player.pos.z) < LOAD_R) {
          const c = this.load(route, sched, worldT);
          if (!this.belled.has(route.key)) {
            this.belled.add(route.key);
            if (this.hooks.onSighted) this.hooks.onSighted(c);
          }
        }
      }
    }
    for (const [key, c] of this.loaded) {
      const alive = c.members.filter(m => m.hp > 0);
      // the fallen fall
      for (const m of c.members) {
        if (m.hp <= 0 && !m._downTold) { m._downTold = true; m.dispose(this.scene); }
      }
      if (!alive.length) {
        if (c.escort) { if (this.hooks.onEscortWiped) this.hooks.onEscortWiped(c); }
        else if (this.hooks.onScatter) this.hooks.onScatter(c);
        this.unload(key);
        continue;
      }
      let sched, halted;
      if (c.escort) {
        // contract pace: walks day and night, but ONLY with the escort close
        const st = c.escort;
        const e0 = CaravanManager.clipToWall(st.from, st.to);
        const e1 = CaravanManager.clipToWall(st.to, st.from);
        const total = Math.hypot(e1.x - e0.x, e1.z - e0.z) || 1;
        const nearPlayer = Math.hypot(c.pseudoStill.x - player.pos.x, c.pseudoStill.z - player.pos.z) < 260;
        const moving = nearPlayer && !c.ambushed && st.progress < 1;
        if (moving) st.progress = Math.min(1, st.progress + (5.6 * dt) / total); // under the crew's stride — nobody straggles
        sched = {
          x: e0.x + (e1.x - e0.x) * st.progress,
          z: e0.z + (e1.z - e0.z) * st.progress,
          from: st.from, to: st.to, resting: null,
        };
        // position updates BEFORE the wires: an ambush must spawn where the
        // caravan IS, not where it was last frame
        c.pseudoStill.x = sched.x; c.pseudoStill.z = sched.z;
        halted = !moving;
        if (!nearPlayer && !c.ambushed && st.progress < 1 && !c._waitTold) {
          c._waitTold = true;
          if (this.hooks.onEscortWaiting) this.hooks.onEscortWaiting(c);
        }
        if (nearPlayer) c._waitTold = false;
        if (st.progress > 0.4 && !st.amb1) { st.amb1 = true; if (this.hooks.onEscortAmbush) this.hooks.onEscortAmbush(c); }
        if (st.progress > 0.78 && !st.amb2) { st.amb2 = true; if (this.hooks.onEscortAmbush) this.hooks.onEscortAmbush(c); }
        if (st.progress >= 1 && !c._arrived) { c._arrived = true; if (this.hooks.onEscortArrived) this.hooks.onEscortArrived(c); }
      } else {
        sched = this.schedule(c.route, worldT);
        // within reach of shelter, a caravan pushes through the dark to the
        // gate instead of camping a stone's throw from the wall (and waking
        // up behind its own schedule, apparently walking home confused)
        const nearHaven = Math.hypot(sched.to.x - sched.x, sched.to.z - sched.z) < 260
          || Math.hypot(sched.from.x - sched.x, sched.from.z - sched.z) < 260;
        // a camp made is a camp kept: once the fire is lit away from
        // shelter, the crew stays until dawn even though the invisible
        // schedule walks on without them (it was leaving at 23:30 when the
        // schedule point drifted within reach of the far gate)
        if (isNight && c._nightCamped) halted = true;
        else {
          halted = (isNight && !nearHaven) || sched.resting || c.ambushed
            || !!(this.hooks.herdCrossing && this.hooks.herdCrossing(sched.x, sched.z)); // the road waits for the herd
          if (isNight && halted && !sched.resting && !c.ambushed) c._nightCamped = true;
        }
        if (!isNight) c._nightCamped = false;
      }
      c.pseudoStill.x = sched.x; c.pseudoStill.z = sched.z;
      const dir = Math.atan2(sched.to.x - sched.from.x, sched.to.z - sched.from.z);
      let li = 0, bi = 0;
      for (const m of alive) {
        const lat = (li++ % 2) ? 1.1 : -1.1;
        const tx = halted ? m.pos.x : sched.x - Math.sin(dir) * m.slot + Math.cos(dir) * lat;
        const tz = halted ? m.pos.z : sched.z - Math.cos(dir) * m.slot - Math.sin(dir) * lat;
        m.update(dt, player, enemies, tx, tz);
      }
      for (const b of c.beasts) {
        if (b.hp <= 0) { if (!b._downTold) { b._downTold = true; b.dispose(this.scene); } continue; }
        const lat = (bi++ % 2) ? -1.4 : 1.4;
        const tx = halted ? b.pos.x : sched.x - Math.sin(dir) * b.slot + Math.cos(dir) * lat;
        const tz = halted ? b.pos.z : sched.z - Math.cos(dir) * b.slot - Math.sin(dir) * lat;
        b.update(dt, tx, tz, !halted, enemies);
      }
      // a night camp keeps a fire
      if (isNight && !c.fire) {
        c.fire = new THREE.Group();
        const ember = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.7, 6),
          new THREE.MeshBasicMaterial({ color: 0xff8a3c }));
        const glow = new THREE.PointLight(0xff8a3c, 0.9, 16);
        glow.position.y = 1;
        c.fire.add(ember, glow);
        const lead = alive[0];
        c.fire.position.set(lead.pos.x + 2, this.world.getHeight(lead.pos.x + 2, lead.pos.z) + 0.3, lead.pos.z);
        this.scene.add(c.fire);
        // the fire wards: while the camp burns, feral machines keep their
        // distance — the road's answer to the still-wall and the anchor field
        if (this.hooks.safeZones) {
          c.fireZone = { x: c.fire.position.x, z: c.fire.position.z, r: 30 };
          this.hooks.safeZones.push(c.fireZone);
        }
      } else if (!isNight && c.fire) {
        this.scene.remove(c.fire);
        c.fire = null;
        if (c.fireZone && this.hooks.safeZones) {
          const zi = this.hooks.safeZones.indexOf(c.fireZone);
          if (zi >= 0) this.hooks.safeZones.splice(zi, 1);
          c.fireZone = null;
        }
      }
      // the fight ends and the road holds
      if (c.ambushed && !c.defendedTold) {
        let near = false;
        for (const e of enemies.enemies) {
          if (Math.hypot(e.pos.x - sched.x, e.pos.z - sched.z) < 70) { near = true; break; }
        }
        if (!near) {
          c.defendedTold = true;
          c.ambushed = false;
          if (this.hooks.onDefended) this.hooks.onDefended(c);
        }
      }
      const anchor = alive[0] || c.beasts[0];
      if (anchor && Math.hypot(anchor.pos.x - player.pos.x, anchor.pos.z - player.pos.z) > UNLOAD_R) this.unload(key);
    }
  }

  npcNear(pos, r) {
    for (const c of this.loaded.values()) {
      for (const m of c.members) {
        if (m.hp > 0 && Math.hypot(m.pos.x - pos.x, m.pos.z - pos.z) < r) return m;
      }
    }
    return null;
  }

  alliesNear(pos, r) {
    const out = [];
    for (const c of this.loaded.values()) {
      for (const m of c.members) {
        if (m.hp > 0 && Math.hypot(m.pos.x - pos.x, m.pos.z - pos.z) < r) out.push(m);
      }
      // the haulers stand in the line too — 480 points of walking wall
      for (const b of c.beasts) {
        if (b.hp > 0 && Math.hypot(b.pos.x - pos.x, b.pos.z - pos.z) < r) out.push(b);
      }
    }
    return out;
  }

  loadedList() { return [...this.loaded.values()]; }
}
