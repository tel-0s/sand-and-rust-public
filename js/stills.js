// Stills: settlements grown around wells, always beside the salt — because
// settlers build where the Rust can't follow. Layout, residents, and
// temperament all grow from the seed. Find white ground, find people.
import * as THREE from 'three';
import { randFromHash, hash2 } from './rng.js';
import { Names } from './grammar.js';
import { GeoBuilder } from './structures.js';
import { makeBox, makeCircle } from './collision.js';
import { BIOMES, biomeWeights } from './biomes.js';
import { TEMPERAMENTS, QUIRK_ADDRESS, QUIRK_TAG } from './dialogue.js';
import { rollFolkLoadout, attachGreebles } from './enemies.js';

const STILL_CELL = 1900;
const FIELD_R = 42;            // the still's safe-field radius
const SALT_IDX = BIOMES.findIndex(b => b.id === 'salt');

const ROLES = {
  mercantile: ['broker', 'tinker', 'caravaneer', 'warden'],
  monastic: ['salt-monk', 'well-keeper', 'sweeper', 'abbot'],
  scavver: ['scrapper', 'digger', 'lookout', 'sorter'],
  ferrocult: ['rust-speaker', 'acolyte', 'grafter', 'listener'],
};

const stillMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const lampMat = new THREE.MeshBasicMaterial({ color: 0xffd27f });
const lampGeo = new THREE.SphereGeometry(0.22, 6, 5);

// ---------- residents ----------
const NPC_BODY = new THREE.BoxGeometry(0.8, 1.0, 0.55);
const NPC_HEAD = new THREE.BoxGeometry(0.45, 0.4, 0.45);
const NPC_LEG = new THREE.BoxGeometry(0.2, 0.7, 0.24);
const NPC_EYE = new THREE.BoxGeometry(0.28, 0.08, 0.05);

// a friendly chassis, sash-tinted by temperament; pack for the road-folk
export function buildResidentMesh(temperament, withPack = false) {
  const tint = new THREE.Color(TEMPERAMENTS[temperament].color);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x6e655a });
  const accentMat = new THREE.MeshLambertMaterial({ color: tint.multiplyScalar(0.55) });
  const g = new THREE.Group();
  const body = new THREE.Mesh(NPC_BODY, bodyMat); body.position.y = 1.15; g.add(body);
  const sash = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.22, 0.6), accentMat); sash.position.y = 1.35; g.add(sash);
  const head = new THREE.Mesh(NPC_HEAD, bodyMat); head.position.y = 1.9; g.add(head);
  const eye = new THREE.Mesh(NPC_EYE, lampMat); eye.position.set(0, 1.93, 0.25); g.add(eye);
  for (const s of [-1, 1]) { const leg = new THREE.Mesh(NPC_LEG, bodyMat); leg.position.set(s * 0.22, 0.35, 0); g.add(leg); }
  if (withPack) {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.3), accentMat);
    pack.position.set(0, 1.3, -0.42); g.add(pack);
    const roll = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.2), bodyMat);
    roll.position.set(0, 1.72, -0.42); g.add(roll);
  }
  return g;
}

export class NPC {
  constructor(scene, world, still, idx, rng, neighbors = []) {
    this.id = `npc:${still.key}:${idx}`;
    this.still = still;
    this.world = world;
    this.temperament = still.temperament;
    this.name = Names.person(world.seed, hash2(world.seed, still.salt, idx));
    this.role = rng.pick(ROLES[still.temperament]);
    this.baseDisp = rng.int(-5, 15);
    this.trader = idx === 0 || rng.chance(0.5); // at least one trader per still
    this.rumorSalt = rng.int(0, 1e6);
    this.isWatch = ['lookout', 'warden', 'sweeper', 'listener'].includes(this.role);
    // a voice of their own, and sometimes a past in a real neighboring still
    this.quirk = { address: rng.pick(QUIRK_ADDRESS), tag: rng.pick(QUIRK_TAG), tagChance: rng.range(0.18, 0.42) };
    this.origin = (neighbors.length && rng.chance(0.55)) ? rng.pick(neighbors).name : null;
    // an opinion of a co-resident (computed by name, no object needed)
    if (still.residents > 1) {
      let oi = rng.int(0, still.residents - 1);
      if (oi === idx) oi = (oi + 1) % still.residents;
      this.opinionOf = Names.person(world.seed, hash2(world.seed, still.salt, oi));
    } else this.opinionOf = null;

    this.mesh = buildResidentMesh(still.temperament);
    scene.add(this.mesh);
    this.recruitable = true;
    // flesh would call it mortality; they call it warranty.
    // frontier folk are harder folk: defenders scale with their region
    const tier = 1 + Math.min(1.5, Math.hypot(still.x, still.z) / 2000);
    this.maxHp = Math.round(95 * tier); this.hp = this.maxHp;
    this.dmg = 10 * tier; this.atkT = 0; this.flashT = 0;
    // of one substance: residents wear real parts too
    this.loadout = rollFolkLoadout(rng, tier);
    for (const p of this.loadout) {
      this.maxHp += Math.round((p.stats.hull || 0) * 0.5 + (p.stats.armor || 0));
      if (p.slot === 'ARMS') this.dmg += (p.stats.damage || 0) * 0.3;
    }
    this.hp = this.maxHp;
    attachGreebles(this.mesh, this.loadout, 0.8);

    const a = rng.range(0, Math.PI * 2), r = rng.range(4, 16);
    this.home = { x: still.x + Math.sin(a) * r, z: still.z + Math.cos(a) * r };
    this.pos = new THREE.Vector3(this.home.x, 0, this.home.z);
    this.target = null;
    this.pauseT = rng.range(0, 4);
    this.animT = rng.range(0, 10);
    this.yaw = rng.range(0, Math.PI * 2);
  }

  damage(n) { this.hp -= n; this.flashT = 0.15; return n; }

  update(dt, player, isNight, enemies) {
    this.animT += dt;
    this.atkT = Math.max(0, this.atkT - dt);
    this.flashT = Math.max(0, this.flashT - dt);
    const toPlayer = Math.hypot(player.pos.x - this.pos.x, player.pos.z - this.pos.z);

    // trouble inside the walls: the watch fights, the rest run for the houses
    let foe = null, fd = 22;
    if (enemies) {
      for (const e of enemies.enemies) {
        if (e.def.stationary) continue;
        const d = Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z);
        if (d < fd) { fd = d; foe = e; }
      }
    }
    if (foe && this.isWatch) {
      const dx = foe.pos.x - this.pos.x, dz = foe.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      this.yaw = Math.atan2(dx, dz);
      if (d > 2.4) { this.pos.x += (dx / d) * 4.5 * dt; this.pos.z += (dz / d) * 4.5 * dt; }
      else if (this.atkT <= 0) { this.atkT = 1.1; foe.hurt(this.dmg, (dx / d) * 4, (dz / d) * 4); }
      this.finishPose(dt, true);
      return;
    } else if (foe && fd < 14) {
      const dx = this.home.x - this.pos.x, dz = this.home.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.8) { this.yaw = Math.atan2(dx, dz); this.pos.x += (dx / d) * 4 * dt; this.pos.z += (dz / d) * 4 * dt; }
      this.finishPose(dt, true);
      return;
    }

    // at night the residents head home; only the watch stays out
    if (isNight && !this.isWatch && toPlayer >= 6) {
      const dh = Math.hypot(this.home.x - this.pos.x, this.home.z - this.pos.z);
      if (dh > 1.2) this.target = this.home;
      else this.target = null; // settled in for the night
    }
    if (toPlayer < 6) {
      // face the visitor
      this.target = null;
      this.yaw = Math.atan2(player.pos.x - this.pos.x, player.pos.z - this.pos.z);
    } else if (this.target) {
      const dx = this.target.x - this.pos.x, dz = this.target.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.5) { this.target = null; this.pauseT = 2 + Math.random() * 5; }
      else {
        this.yaw = Math.atan2(dx, dz);
        this.pos.x += (dx / d) * 1.3 * dt;
        this.pos.z += (dz / d) * 1.3 * dt;
      }
    } else {
      this.pauseT -= dt;
      if (this.pauseT <= 0 && !(isNight && !this.isWatch)) {
        const a = Math.random() * Math.PI * 2, r = Math.random() * 14;
        this.target = { x: this.still.x + Math.sin(a) * r, z: this.still.z + Math.cos(a) * r };
      }
    }
    this.finishPose(dt, !!this.target);
  }

  finishPose(dt, hurrying) {
    this.world.collide(this.pos, 0.45, this.pos.y);
    this.pos.y = this.world.groundAt(this.pos.x, this.pos.z, this.pos.y + 0.1);
    this.mesh.position.copy(this.pos);
    this.mesh.position.y += Math.abs(Math.sin(this.animT * (hurrying ? 7 : 1.5))) * (hurrying ? 0.06 : 0.02);
    this.mesh.rotation.y = this.yaw;
    this.mesh.traverse(o => { if (o.material && o.material.emissive) o.material.emissive.setHex(this.flashT > 0 ? 0x884433 : 0x000000); });
  }

  dispose(scene) { scene.remove(this.mesh); }
}

// ---------- compound geometry ----------
function buildStillGeo(still, world) {
  const gb = new GeoBuilder();
  const colliders = [];
  const rng = randFromHash(world.seed, still.salt, 77);
  const { x: cx, z: cz, temperament } = still;
  const gY = (x, z) => world.getHeight(x, z);
  const SAND = [0.6, 0.52, 0.4], STONE = [0.55, 0.53, 0.48], WOODY = [0.42, 0.33, 0.22];
  const WHITE = [0.85, 0.83, 0.78], RUSTC = [0.55, 0.27, 0.13], CLOTH = [0.62, 0.45, 0.25];

  // the well: the reason anyone is here
  {
    const y = gY(cx, cz);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      gb.addBox(cx + Math.sin(a) * 1.6, y + 0.45, cz + Math.cos(a) * 1.6, 0.9, 0.9, 0.7, STONE, a);
    }
    gb.addBox(cx, y + 2.8, cz, 0.18, 3.4, 0.18, WOODY);
    gb.addBox(cx, y + 4.4, cz, 2.6, 0.18, 0.5, WOODY); // crossbeam
    colliders.push(makeCircle(cx, cz, 2.1, y + 1.0, true));
  }

  // dwellings & temperament set-dressing on a ring
  const nBuildings = rng.int(3, 5);
  for (let i = 0; i < nBuildings; i++) {
    const a = (i / nBuildings) * Math.PI * 2 + rng.range(-0.25, 0.25);
    const r = rng.range(12, 24);
    const bx = cx + Math.sin(a) * r, bz = cz + Math.cos(a) * r;
    const y = gY(bx, bz);
    const w = rng.range(4.5, 7), d = rng.range(4, 6), h = rng.range(2.6, 3.6);
    const rot = a + rng.range(-0.3, 0.3);
    gb.addBox(bx, y + h / 2, bz, w, h, d, [SAND[0] + rng.range(-0.05, 0.05), SAND[1], SAND[2]], rot);
    gb.addBox(bx, y + h + 0.2, bz, w + 0.7, 0.35, d + 0.7, WOODY, rot); // roof slab
    colliders.push(makeBox(bx, bz, w / 2 + 0.1, d / 2 + 0.1, rot, y + h + 0.4, true));
    // lamp by the door
    still.lampSpots.push([bx + Math.sin(rot) * (d / 2 + 1), y + 1.8, bz + Math.cos(rot) * (d / 2 + 1)]);
  }
  if (temperament === 'monastic') {
    // salt shrine: stacked white stones
    const sx = cx + 8, sz = cz - 6, y = gY(sx, sz);
    for (let i = 0; i < 4; i++) gb.addBox(sx, y + 0.4 + i * 0.7, sz, 1.8 - i * 0.35, 0.7, 1.8 - i * 0.35, WHITE, i * 0.4);
    colliders.push(makeCircle(sx, sz, 1.2, y + 3, false));
  } else if (temperament === 'ferrocult') {
    // rust-totem: leaning corroded pylon
    const sx = cx - 9, sz = cz + 7, y = gY(sx, sz);
    gb.addBox(sx, y + 3.2, sz, 0.8, 6.5, 0.8, RUSTC, 0.3, 0.12);
    colliders.push(makeCircle(sx, sz, 0.8, y + 6, false));
  } else if (temperament === 'mercantile') {
    // market stalls: posts + awnings
    for (let i = 0; i < 2; i++) {
      const sx = cx + (i ? 7 : -7), sz = cz + 8, y = gY(sx, sz);
      for (const ox of [-1.6, 1.6]) for (const oz of [-1.2, 1.2]) gb.addBox(sx + ox, y + 1.1, sz + oz, 0.18, 2.2, 0.18, WOODY);
      gb.addBox(sx, y + 2.3, sz, 4.2, 0.15, 3.2, CLOTH, 0.05);
      gb.addBox(sx, y + 0.8, sz, 3.2, 0.5, 2.0, WOODY); // counter
      colliders.push(makeBox(sx, sz, 1.7, 1.1, 0, y + 1.05, true));
    }
  } else {
    // scavver sorting heaps
    for (let i = 0; i < 3; i++) {
      const sx = cx + rng.range(-14, 14), sz = cz + rng.range(-14, 14), y = gY(sx, sz);
      gb.addBox(sx, y + 0.5, sz, rng.range(1.5, 3), rng.range(0.8, 1.6), rng.range(1.5, 2.5), rng.chance(0.5) ? RUSTC : STONE, rng.range(0, 3), 0.15);
    }
  }

  // perimeter wall: low arc segments with two gates
  const SEGS = 16;
  const gate1 = rng.int(0, SEGS - 1), gate2 = (gate1 + SEGS / 2) | 0;
  for (let i = 0; i < SEGS; i++) {
    if (i === gate1 || i === gate2) continue;
    const a = (i / SEGS) * Math.PI * 2;
    const wx = cx + Math.sin(a) * (FIELD_R - 6), wz = cz + Math.cos(a) * (FIELD_R - 6);
    const y = gY(wx, wz);
    const len = (Math.PI * 2 * (FIELD_R - 6)) / SEGS * 0.92;
    gb.addBox(wx, y + 0.7, wz, len, 1.5, 0.7, [STONE[0] + rng.range(-0.04, 0.04), STONE[1], STONE[2]], a + Math.PI / 2);
    colliders.push(makeBox(wx, wz, len / 2, 0.45, a + Math.PI / 2, y + 1.45, true));
    if (i % 3 === 0) still.lampSpots.push([wx, y + 2.1, wz]);
  }
  return { geo: gb.build(), colliders };
}

// ---------- manager ----------
export class StillManager {
  constructor(scene, world, hooks = {}) {
    this.scene = scene;
    this.world = world;
    this.hooks = hooks;            // { safeZones, onDiscover }
    this.cells = new Map();        // key -> info | null
    this.loaded = new Map();       // key -> { mesh, npcs, colliders, zone, lamps }
  }

  // salt-biome weight from the control fields alone (cheap; no height synthesis)
  saltAt(x, z) {
    const [a, r] = this.world.controls(x, z);
    if (!this._sw) this._sw = new Float32Array(BIOMES.length);
    return biomeWeights(a, r, this._sw)[SALT_IDX];
  }

  // pure lattice query: is there a Still in this cell? settlers need salt —
  // and they genuinely search for it: grid scan, then hill-climb to the pan.
  infoAt(sx, sz) {
    const key = sx + ',' + sz;
    if (this.cells.has(key)) return this.cells.get(key);
    let info = null;
    const rng = randFromHash(this.world.seed, sx * 29 + 7, sz * 29 + 17);
    if (rng.chance(0.75)) {
      const G = 7;
      let best = null, bestW = 0;
      for (let gz = 0; gz < G; gz++) {
        for (let gx = 0; gx < G; gx++) {
          const px = (sx + 0.1 + 0.8 * (gx + 0.5) / G) * STILL_CELL;
          const pz = (sz + 0.1 + 0.8 * (gz + 0.5) / G) * STILL_CELL;
          const w = this.saltAt(px, pz);
          if (w > bestW) { bestW = w; best = [px, pz]; }
        }
      }
      if (best) {
        // refine toward the heart of the pan, staying inside the cell
        const clampX = (v) => Math.min((sx + 0.92) * STILL_CELL, Math.max((sx + 0.08) * STILL_CELL, v));
        const clampZ = (v) => Math.min((sz + 0.92) * STILL_CELL, Math.max((sz + 0.08) * STILL_CELL, v));
        let step = STILL_CELL / G / 2;
        for (let i = 0; i < 10 && step > 8; i++) {
          let improved = false;
          for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = clampX(best[0] + dx * step), nz = clampZ(best[1] + dz * step);
            const w = this.saltAt(nx, nz);
            if (w > bestW) { bestW = w; best = [nx, nz]; improved = true; }
          }
          if (!improved) step /= 2;
        }
      }
      if (bestW > 0.25 && best) {
        const salt = hash2(this.world.seed, sx * 31 + 3, sz * 31 + 13);
        const temperament = rng.weighted([['mercantile', 3], ['scavver', 3], ['monastic', 2], ['ferrocult', 1.4]]);
        info = {
          key, x: best[0], z: best[1], salt, temperament,
          name: Names.still(this.world.seed, salt),
          residents: rng.int(3, 5),
          lampSpots: [],
        };
      }
    }
    this.cells.set(key, info);
    return info;
  }

  stillsNear(x, z, radius) {
    const out = [];
    const c0x = Math.floor((x - radius) / STILL_CELL), c1x = Math.floor((x + radius) / STILL_CELL);
    const c0z = Math.floor((z - radius) / STILL_CELL), c1z = Math.floor((z + radius) / STILL_CELL);
    for (let sz = c0z; sz <= c1z; sz++) {
      for (let sx = c0x; sx <= c1x; sx++) {
        const info = this.infoAt(sx, sz);
        if (info && Math.hypot(info.x - x, info.z - z) <= radius) out.push(info);
      }
    }
    return out;
  }

  update(dt, player, isNight, enemies) {
    const px = player.pos.x, pz = player.pos.z;
    // lamps burn brighter after dark
    lampMat.color.setHex(isNight ? 0xffe2a8 : 0xb98a4a);
    // stream in/out
    for (const info of this.stillsNear(px, pz, STILL_CELL * 1.2)) {
      const d = Math.hypot(info.x - px, info.z - pz);
      if (d < 700 && !this.loaded.has(info.key)) this.load(info);
      if (d < 320 && !info.found) {
        info.found = true;
        if (this.hooks.onDiscover) this.hooks.onDiscover(info);
      }
    }
    for (const [key, rec] of this.loaded) {
      const d = Math.hypot(rec.info.x - px, rec.info.z - pz);
      if (d > 950) { this.unload(key); continue; }
      if (d < 200) {
        // the wall watches back: turrets pick off machines inside their arc
        for (const t of rec.turrets || []) {
          t.cd -= dt;
          if (t.cd > 0 || !enemies) continue;
          let foe = null, fd = 45;
          for (const e of enemies.enemies) {
            if (e.def.stationary) continue;
            const d2 = Math.hypot(e.pos.x - t.x, e.pos.z - t.z);
            if (d2 < fd) { fd = d2; foe = e; }
          }
          if (foe) {
            t.cd = 1.6;
            t.barrel.lookAt(foe.pos.x, foe.pos.y + foe.def.scale, foe.pos.z);
            foe.hurt(8 * t.tier, (foe.pos.x - t.x) / fd * 3, (foe.pos.z - t.z) / fd * 3);
            if (this.hooks.onTurretFire) this.hooks.onTurretFire(t, foe);
          }
        }
        for (let i = rec.npcs.length - 1; i >= 0; i--) {
          const n = rec.npcs[i];
          if (n.hp <= 0) {
            if (this.hooks.onNpcDeath) this.hooks.onNpcDeath(n, rec.info);
            n.dispose(this.scene);
            rec.npcs.splice(i, 1);
            continue;
          }
          n.update(dt, player, isNight, enemies);
        }
      }
    }
  }

  // the nearest loaded well (the still itself, at its centre)
  wellNear(pos, r) {
    for (const rec of this.loaded.values()) {
      if (Math.hypot(rec.info.x - pos.x, rec.info.z - pos.z) < r) return rec.info;
    }
    return null;
  }

  loadedStillsWithin(pos, r) {
    const out = [];
    for (const rec of this.loaded.values()) {
      if (Math.hypot(rec.info.x - pos.x, rec.info.z - pos.z) < r) out.push(rec.info);
    }
    return out;
  }

  load(info) {
    info.lampSpots = [];
    const built = buildStillGeo(info, this.world);
    const mesh = new THREE.Mesh(built.geo, stillMat);
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    this.scene.add(mesh);
    const lamps = [];
    for (const [lx, ly, lz] of info.lampSpots) {
      const lamp = new THREE.Mesh(lampGeo, lampMat);
      lamp.position.set(lx, ly, lz);
      this.scene.add(lamp); lamps.push(lamp);
    }
    // watch turrets: one on the wall by right, a second if a wanderer funded it
    const turrets = [];
    const turretCols = [];
    const turretCount = 1 + (this.hooks.hasFundedTurret && this.hooks.hasFundedTurret(info.key) ? 1 : 0);
    const trng = randFromHash(this.world.seed, info.salt, 337);
    for (let i = 0; i < turretCount; i++) {
      const a = trng.range(0, Math.PI * 2);
      const tx = info.x + Math.sin(a) * 33, tz = info.z + Math.cos(a) * 33;
      const ty = this.world.getHeight(tx, tz);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.6, 0.5),
        new THREE.MeshLambertMaterial({ color: 0x4a443e }));
      post.position.set(tx, ty + 1.3, tz);
      const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 1.1),
        new THREE.MeshLambertMaterial({ color: 0x2e2a26 }));
      barrel.position.set(tx, ty + 2.5, tz);
      this.scene.add(post, barrel);
      const tCol = makeCircle(tx, tz, 0.5, ty + 2.6, false);
      this.world.staticColliders.push(tCol);
      turretCols.push(tCol);
      turrets.push({ x: tx, y: ty + 2.5, z: tz, post, barrel, cd: 0, tier: 1 + Math.min(1.5, Math.hypot(info.x, info.z) / 2000) });
    }

    const rng = randFromHash(this.world.seed, info.salt, 991);
    const neighbors = this.stillsNear(info.x, info.z, 9500).filter(s => s.key !== info.key);
    const npcs = [];
    for (let i = 0; i < info.residents; i++) {
      const n = new NPC(this.scene, this.world, info, i, rng, neighbors);
      // some names are kept against the drift of the pools (legacy revivals)
      const ov = this.hooks.nameOverride && this.hooks.nameOverride(n.id);
      if (ov) n.name = ov;
      // someone who walks with you (or once did) is not also at home;
      // and the dead, the desert keeps
      if ((this.hooks.isRecruited && this.hooks.isRecruited(n.id)) ||
          (this.hooks.isDead && this.hooks.isDead(n.id))) { n.dispose(this.scene); continue; }
      npcs.push(n);
    }
    this.world.staticColliders.push(...built.colliders);
    const zone = { x: info.x, z: info.z, r: FIELD_R };
    if (this.hooks.safeZones) this.hooks.safeZones.push(zone);
    this.loaded.set(info.key, { info, mesh, npcs, lamps, colliders: [...built.colliders, ...turretCols], zone, turrets });
  }

  unload(key) {
    const rec = this.loaded.get(key);
    if (!rec) return;
    this.scene.remove(rec.mesh); rec.mesh.geometry.dispose();
    for (const l of rec.lamps) this.scene.remove(l);
    for (const n of rec.npcs) n.dispose(this.scene);
    for (const t of rec.turrets || []) this.scene.remove(t.post, t.barrel);
    this.world.staticColliders = this.world.staticColliders.filter(c => !rec.colliders.includes(c));
    if (this.hooks.safeZones) {
      const i = this.hooks.safeZones.indexOf(rec.zone);
      if (i >= 0) this.hooks.safeZones.splice(i, 1);
    }
    this.loaded.delete(key);
  }

  // rebuild a loaded still's roster (e.g., a dismissed follower coming home)
  reload(key) {
    const rec = this.loaded.get(key);
    if (!rec) return;
    const info = rec.info;
    this.unload(key);
    this.load(info);
  }

  npcNear(pos, r) {
    let best = null, bd = r;
    for (const rec of this.loaded.values()) {
      for (const n of rec.npcs) {
        const d = Math.hypot(n.pos.x - pos.x, n.pos.z - pos.z);
        if (d < bd) { bd = d; best = n; }
      }
    }
    return best;
  }
}
