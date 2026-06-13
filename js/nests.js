// Fabricator nests: the Rust's ugly industry. Where the Stills seek salt,
// the nests seek the red sand — half-buried printworks that keep a steady
// brood of feral machines patrolling, and corrupt the ground around them.
// Break the core and the nest goes quiet. The desert notices.
import * as THREE from 'three';
import { randFromHash, hash2 } from './rng.js';
import { Names } from './grammar.js';
import { GeoBuilder } from './structures.js';
import { makeBox, makeCircle } from './collision.js';
import { BIOMES, biomeWeights } from './biomes.js';

const NEST_CELL = 1700;
const RUST_IDX = BIOMES.findIndex(b => b.id === 'rustlands');
const nestMat = new THREE.MeshLambertMaterial({ vertexColors: true });

export class NestManager {
  constructor(scene, world, hooks = {}) {
    this.scene = scene; this.world = world;
    this.hooks = hooks; // { isDestroyed, onDiscover, onDestroyed }
    this.cells = new Map();
    this.loaded = new Map();
    this._w = new Float32Array(BIOMES.length);
  }

  rustAt(x, z) {
    const [a, r] = this.world.controls(x, z);
    return biomeWeights(a, r, this._w)[RUST_IDX];
  }

  // pure lattice query: nests grow where the red runs strong
  infoAt(nx, nz) {
    const key = nx + ',' + nz;
    if (this.cells.has(key)) return this.cells.get(key);
    let info = null;
    const rng = randFromHash(this.world.seed, nx * 53 + 13, nz * 53 + 29);
    if (rng.chance(0.6)) {
      let best = null, bestW = 0;
      for (let gz = 0; gz < 5; gz++) {
        for (let gx = 0; gx < 5; gx++) {
          const px = (nx + 0.12 + 0.76 * (gx + 0.5) / 5) * NEST_CELL;
          const pz = (nz + 0.12 + 0.76 * (gz + 0.5) / 5) * NEST_CELL;
          const w = this.rustAt(px, pz);
          if (w > bestW) { bestW = w; best = [px, pz]; }
        }
      }
      if (bestW > 0.3 && best) {
        const salt = hash2(this.world.seed, nx * 59 + 3, nz * 59 + 17);
        info = {
          key, x: best[0], z: best[1], salt,
          name: Names.nest(this.world.seed, salt),
          found: false,
        };
      }
    }
    this.cells.set(key, info);
    return info;
  }

  nestsNear(x, z, radius) {
    const out = [];
    const c0x = Math.floor((x - radius) / NEST_CELL), c1x = Math.floor((x + radius) / NEST_CELL);
    const c0z = Math.floor((z - radius) / NEST_CELL), c1z = Math.floor((z + radius) / NEST_CELL);
    for (let nz = c0z; nz <= c1z; nz++) {
      for (let nx = c0x; nx <= c1x; nx++) {
        const info = this.infoAt(nx, nz);
        if (info && Math.hypot(info.x - x, info.z - z) <= radius) out.push(info);
      }
    }
    return out;
  }

  update(dt, player, enemies) {
    const px = player.pos.x, pz = player.pos.z;
    for (const info of this.nestsNear(px, pz, NEST_CELL * 1.1)) {
      const d = Math.hypot(info.x - px, info.z - pz);
      if (d < 420 && !this.loaded.has(info.key)) this.load(info, enemies);
      if (d < 220 && !info.found) {
        info.found = true;
        if (this.hooks.onDiscover) this.hooks.onDiscover(info);
      }
    }
    for (const [key, rec] of this.loaded) {
      const d = Math.hypot(rec.info.x - px, rec.info.z - pz);
      if (d > 620) { this.unload(key, enemies); continue; }
      if (rec.destroyed) continue;
      // the heart breaks: the nest goes quiet
      if (rec.core && rec.core.hp <= 0) {
        rec.destroyed = true;
        rec.core = null;
        if (this.hooks.onDestroyed) this.hooks.onDestroyed(rec.info);
        continue;
      }
      // brood: keep up to 3 patrol machines while the core beats
      rec.spawnT -= dt;
      if (rec.spawnT <= 0 && d < 300) {
        rec.spawnT = 11;
        const alive = enemies.enemies.filter(e => e.homeNest === key && !e.def.stationary).length;
        if (alive < 3) {
          const a = Math.random() * Math.PI * 2, r = 25 + Math.random() * 40;
          const kind = Math.random() < 0.5 ? 'rustform' : (Math.random() < 0.5 ? 'dervish' : 'scrabbler');
          enemies.spawnAt(kind, rec.info.x + Math.sin(a) * r, rec.info.z + Math.cos(a) * r,
            { infected: true, homeNest: key });
        }
      }
    }
  }

  load(info, enemies) {
    const destroyed = this.hooks.isDestroyed && this.hooks.isDestroyed(info.key);
    const rng = randFromHash(this.world.seed, info.salt, 61);
    const gb = new GeoBuilder();
    const colliders = [];
    const gY = (x, z) => this.world.getHeight(x, z);
    const { x: cx, z: cz } = info;
    const y0 = gY(cx, cz);
    const RUSTC = [0.5, 0.24, 0.11], DARK = [0.25, 0.18, 0.14], SLAG = [0.35, 0.22, 0.15];

    // the main slab, half-swallowed, like a rash on the desert's face
    gb.addBox(cx, y0 + 1.0, cz, 14, 2.6, 10, SLAG, rng.range(0, 3), 0.05);
    colliders.push(makeBox(cx, cz, 7.2, 5.2, 0, y0 + 2.2, true));
    // stacks, leaning and weeping
    for (let i = 0; i < 3; i++) {
      const sx = cx + rng.range(-8, 8), sz = cz + rng.range(-6, 6);
      const h = rng.range(7, 14);
      gb.addBox(sx, gY(sx, sz) + h / 2, sz, 1.1, h, 1.1, RUSTC, rng.range(0, 3), rng.range(-0.15, 0.15));
      colliders.push(makeCircle(sx, sz, 0.9, gY(sx, sz) + h, false));
    }
    // vats and a conveyor arm
    for (let i = 0; i < 2; i++) {
      const vx = cx + rng.range(-10, 10), vz = cz + rng.range(-8, 8);
      gb.addBox(vx, gY(vx, vz) + 0.8, vz, 2.6, 1.6, 2.6, DARK, rng.range(0, 3));
      colliders.push(makeCircle(vx, vz, 1.6, gY(vx, vz) + 1.6, true));
    }
    gb.addBox(cx + 6, y0 + 3.4, cz - 3, 9, 0.5, 1.4, DARK, rng.range(0, 3), 0.18);

    const mesh = new THREE.Mesh(gb.build(), nestMat);
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    this.scene.add(mesh);
    this.world.staticColliders.push(...colliders);

    // the heart, atop the slab — an Enemy, so every weapon already works
    let core = null;
    if (!destroyed) {
      core = enemies.spawnAt('fabcore', cx, cz, { name: info.name, homeNest: info.key });
      core.pos.y = y0 + 2.2;
    }
    this.loaded.set(info.key, { info, mesh, colliders, core, destroyed, spawnT: 3 });
  }

  unload(key, enemies) {
    const rec = this.loaded.get(key);
    if (!rec) return;
    this.scene.remove(rec.mesh); rec.mesh.geometry.dispose();
    this.world.staticColliders = this.world.staticColliders.filter(c => !rec.colliders.includes(c));
    if (rec.core) {
      const i = enemies.enemies.indexOf(rec.core);
      if (i >= 0) enemies.remove(i);
    }
    this.loaded.delete(key);
  }

  // corruption pressure near a living nest
  auraAt(x, z) {
    for (const rec of this.loaded.values()) {
      if (rec.destroyed) continue;
      if (Math.hypot(rec.info.x - x, rec.info.z - z) < 60) return true;
    }
    return false;
  }
}
