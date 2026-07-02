// The world: an infinite chunked desert grown deterministically from one seed.
// Terrain = layered simplex fields blended across biome control space.
// Chunks stream in around the player; megastructures live on a sparser lattice.
import * as THREE from 'three';
import { Simplex2 } from './noise.js';
import { hash2, hash3, randFromHash, Rand } from './rng.js';
import { BIOMES, biomeWeights, dominantBiome } from './biomes.js';
import {
  GeoBuilder, addBuilding, addWreckGeo, addRock, addScrapPile,
  addGlassSpire, addBones, buildMegastructure, MEGA_TYPES,
} from './structures.js';
import { Names } from './grammar.js';
import { makeCircle, resolve, supportY, pointBlocked } from './collision.js';

export const CHUNK = 64;          // metres per chunk
const RES = 32;                   // quads per side
export const VIEW = 6;            // chunk radius streamed in
const MEGA_CELL = 1100;           // megastructure lattice spacing
const REGION_CELL = 900;          // named-region lattice

const terrainMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const structMat = new THREE.MeshLambertMaterial({ vertexColors: true });
const shardMat = new THREE.MeshBasicMaterial({ color: 0x6fe8d0 });
const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffb347 });
const cacheMat = new THREE.MeshLambertMaterial({ color: 0x3a8f7c, emissive: 0x16453b });
const poleMat = new THREE.MeshLambertMaterial({ color: 0x4a4440 });
const shardGeo = new THREE.OctahedronGeometry(0.55);
const beaconGeo = new THREE.SphereGeometry(0.32, 6, 5);
const poleGeo = new THREE.CylinderGeometry(0.12, 0.18, 6, 6);
const cacheGeo = new THREE.BoxGeometry(1.4, 1.0, 1.0);

export class World {
  constructor(scene, seed) {
    this.scene = scene;
    this.seed = seed >>> 0;
    // independent noise fields
    this.nElev = new Simplex2(hash2(seed, 1, 1));
    this.nElev2 = new Simplex2(hash2(seed, 2, 7));
    this.nDune = new Simplex2(hash2(seed, 3, 13));
    this.nWarp = new Simplex2(hash2(seed, 4, 17));
    this.nDetail = new Simplex2(hash2(seed, 5, 23));
    this.nArid = new Simplex2(hash2(seed, 6, 31));
    this.nRuin = new Simplex2(hash2(seed, 7, 41));

    this.view = VIEW;             // chunk stream radius (settings can change it)
    this.chunks = new Map();      // "cx,cz" -> chunk record
    this.buildQueue = [];
    this.megas = new Map();       // "mx,mz" -> mega record | null
    this.looted = new Set();
    this.explored = new Map();    // "cx,cz" -> biomeId (for the map)
    this.discovered = [];         // map markers {name, kind, x, z}
    this.questCaches = [];        // {id, x, z, spawned}
    this.staticColliders = [];    // world-fixed (anchor obelisk, field posts)
    this.groundOverride = null;   // set while inside a hollow place (interiors.js)
    this.anchorActiveSet = new Set(); // restored waystation anchors (by mega key)
    this.discoveredKeys = new Set();
    this.onDiscover = null;
    this._w = new Float32Array(BIOMES.length);
  }

  // ---------- field sampling ----------
  controls(x, z) {
    const a = 0.5 + 0.5 * this.nArid.fbm(x * 0.0011, z * 0.0011, 3);
    const r = 0.5 + 0.5 * this.nRuin.fbm(x * 0.0009 + 53.7, z * 0.0009 - 21.3, 3);
    return [a, r];
  }

  sample(x, z) {
    const [a, r] = this.controls(x, z);
    const w = biomeWeights(a, r, this._w);
    // shared base elevation
    let h = this.nElev.fbm(x * 0.0016, z * 0.0016, 4) * 16
      + this.nElev2.fbm(x * 0.0005, z * 0.0005, 2) * 12;
    // domain-warped dune field, blended per biome
    const warp = this.nWarp.noise(x * 0.004, z * 0.004) * 28;
    const detail = this.nDetail.fbm(x * 0.045, z * 0.045, 2);
    for (let i = 0; i < BIOMES.length; i++) {
      if (w[i] < 0.03) continue;
      const b = BIOMES[i];
      const dn = this.nDune.noise((x + warp) * b.duneScale, (z - warp * 0.6) * b.duneScale * 0.42);
      const dune = Math.pow(1 - Math.abs(dn), 1.8) * b.duneAmp;
      h += w[i] * (dune + detail * b.detailAmp + b.baseLift);
    }
    return { h, w, a, r };
  }

  getHeight(x, z) { return this.sample(x, z).h; }
  biomeAt(x, z) { return dominantBiome(this.sample(x, z).w); }

  regionName(x, z) {
    const rx = Math.floor(x / REGION_CELL), rz = Math.floor(z / REGION_CELL);
    return Names.region(this.seed, rx, rz);
  }

  // ---------- streaming ----------
  update(px, pz, dt) {
    const pcx = Math.floor(px / CHUNK), pcz = Math.floor(pz / CHUNK);
    const V = this.view;
    // queue missing chunks
    for (let dz = -V; dz <= V; dz++) {
      for (let dx = -V; dx <= V; dx++) {
        const cx = pcx + dx, cz = pcz + dz;
        const key = cx + ',' + cz;
        if (!this.chunks.has(key)) {
          this.chunks.set(key, { state: 'pending', cx, cz });
          this.buildQueue.push(key);
        }
      }
    }
    // build nearest pending chunk (1 per frame keeps frametime smooth)
    if (this.buildQueue.length) {
      // drop keys whose chunks were unloaded while still queued
      this.buildQueue = this.buildQueue.filter(k => {
        const r = this.chunks.get(k);
        return r && r.state === 'pending';
      });
    }
    if (this.buildQueue.length) {
      this.buildQueue.sort((ka, kb) => {
        const A = this.chunks.get(ka), B = this.chunks.get(kb);
        return (Math.abs(A.cx - pcx) + Math.abs(A.cz - pcz)) - (Math.abs(B.cx - pcx) + Math.abs(B.cz - pcz));
      });
      const key = this.buildQueue.shift();
      const rec = this.chunks.get(key);
      if (rec && rec.state === 'pending') this.buildChunk(rec);
    }
    // unload far chunks
    for (const [key, rec] of this.chunks) {
      if (Math.abs(rec.cx - pcx) > V + 2 || Math.abs(rec.cz - pcz) > V + 2) {
        this.disposeChunk(rec);
        this.chunks.delete(key);
      }
    }
    this.updateMegas(px, pz);
    this.animateEntities(dt);
  }

  buildChunk(rec) {
    const { cx, cz } = rec;
    const ox = cx * CHUNK, oz = cz * CHUNK;
    const step = CHUNK / RES;
    const verts = RES + 1;
    const pos = new Float32Array(verts * verts * 3);
    const col = new Float32Array(verts * verts * 3);
    const heights = new Float32Array(verts * verts);
    const detailN = this.nDetail;
    let vi = 0;
    for (let j = 0; j < verts; j++) {
      for (let i = 0; i < verts; i++) {
        const x = ox + i * step, z = oz + j * step;
        const s = this.sample(x, z);
        heights[j * verts + i] = s.h;
        pos[vi] = x; pos[vi + 1] = s.h; pos[vi + 2] = z;
        // colour: blend biome palettes, shade by a fine grain
        let cr = 0, cg = 0, cb = 0;
        const g = 0.5 + 0.5 * detailN.noise(x * 0.13, z * 0.13);
        for (let bi = 0; bi < BIOMES.length; bi++) {
          if (s.w[bi] < 0.02) continue;
          const b = BIOMES[bi];
          cr += s.w[bi] * (b.colLow[0] + (b.colHigh[0] - b.colLow[0]) * g);
          cg += s.w[bi] * (b.colLow[1] + (b.colHigh[1] - b.colLow[1]) * g);
          cb += s.w[bi] * (b.colLow[2] + (b.colHigh[2] - b.colLow[2]) * g);
        }
        col[vi] = cr; col[vi + 1] = cg; col[vi + 2] = cb;
        vi += 3;
      }
    }
    const idx = [];
    for (let j = 0; j < RES; j++) {
      for (let i = 0; i < RES; i++) {
        const a = j * verts + i, b = a + 1, c = a + verts, d = c + 1;
        idx.push(a, c, b, b, c, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, terrainMat);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    this.scene.add(mesh);

    // ----- structures, decoration, entities -----
    const center = this.sample(ox + CHUNK / 2, oz + CHUNK / 2);
    const biome = dominantBiome(center.w);
    const rng = randFromHash(this.seed, cx, cz);
    const gb = new GeoBuilder();
    const colliders = [];
    const entities = [];

    // buried city grid (only where the city biome dominates)
    const cityIdx = BIOMES.findIndex(b => b.id === 'city');
    if (center.w[cityIdx] > 0.18) {
      const GRID = 22;
      const g0x = Math.floor(ox / GRID), g1x = Math.floor((ox + CHUNK) / GRID);
      const g0z = Math.floor(oz / GRID), g1z = Math.floor((oz + CHUNK) / GRID);
      for (let gz = g0z; gz <= g1z; gz++) {
        for (let gx = g0x; gx <= g1x; gx++) {
          const bx = gx * GRID + GRID / 2, bz = gz * GRID + GRID / 2;
          if (bx < ox || bx >= ox + CHUNK || bz < oz || bz >= oz + CHUNK) continue;
          const sw = this.sample(bx, bz);
          if (sw.w[cityIdx] < 0.45) continue;
          const brng = randFromHash(this.seed, gx * 7 + 3, gz * 7 + 5);
          if (!brng.chance(0.5)) continue;
          colliders.push(...addBuilding(gb, brng, bx, sw.h, bz));
        }
      }
    }

    // decorations driven by blended densities
    const deco = { rock: 0, scrap: 0, spire: 0, bones: 0 };
    for (let bi = 0; bi < BIOMES.length; bi++) {
      const b = BIOMES[bi], w = center.w[bi];
      if (w < 0.03) continue;
      for (const k in deco) deco[k] += w * (b.deco[k] || 0);
    }
    const place = (count, fn) => {
      const n = Math.floor(count) + (rng.chance(count % 1) ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const x = ox + rng.range(2, CHUNK - 2), z = oz + rng.range(2, CHUNK - 2);
        const c = fn(gb, rng, x, this.getHeight(x, z), z);
        if (c) Array.isArray(c) ? colliders.push(...c) : colliders.push(c);
      }
    };
    place(deco.rock * 9, addRock);
    place(deco.scrap * 8, addScrapPile);
    place(deco.spire * 7, addGlassSpire);
    place(deco.bones * 4, addBones);

    // wrecks (salvageable)
    const wreckChance = biome.wreckDensity;
    const nWrecks = rng.chance(wreckChance) ? rng.int(1, 2) : 0;
    for (let i = 0; i < nWrecks; i++) {
      const x = ox + rng.range(6, CHUNK - 6), z = oz + rng.range(6, CHUNK - 6);
      const y = this.getHeight(x, z);
      const wk = addWreckGeo(gb, rng, x, y, z);
      colliders.push(wk.collider);
      const id = `w:${cx}:${cz}:${i}`;
      entities.push({ id, kind: 'wreck', x, y, z, r: wk.r + 1.5, salt: hash3(this.seed, cx, cz) + i });
    }
    // memory shards (lore)
    if (rng.chance(biome.shardDensity)) {
      const x = ox + rng.range(4, CHUNK - 4), z = oz + rng.range(4, CHUNK - 4);
      const y = this.getHeight(x, z);
      const id = `s:${cx}:${cz}`;
      const mesh2 = new THREE.Mesh(shardGeo, shardMat);
      mesh2.position.set(x, y + 1.4, z);
      entities.push({ id, kind: 'shard', x, y, z, r: 2.5, mesh: mesh2, salt: hash3(this.seed, cz, cx) });
    }
    // signal beacons (procedural quests)
    if (rng.chance(biome.beaconDensity)) {
      const x = ox + rng.range(4, CHUNK - 4), z = oz + rng.range(4, CHUNK - 4);
      const y = this.getHeight(x, z);
      const id = `b:${cx}:${cz}`;
      const grp = new THREE.Group();
      const pole = new THREE.Mesh(poleGeo, poleMat); pole.position.y = 3;
      const lamp = new THREE.Mesh(beaconGeo, beaconMat); lamp.position.y = 6.2;
      grp.add(pole, lamp); grp.position.set(x, y, z);
      entities.push({ id, kind: 'beacon', x, y, z, r: 3, mesh: grp, lamp, salt: hash3(this.seed, cx + 9, cz + 9) });
    }
    // quest caches landing in this chunk
    for (const qc of this.questCaches) {
      if (!qc.spawned && qc.x >= ox && qc.x < ox + CHUNK && qc.z >= oz && qc.z < oz + CHUNK) {
        this.spawnCache(qc, entities);
      }
    }

    for (const e of entities) {
      if (e.mesh && !this.looted.has(e.id)) this.scene.add(e.mesh);
    }

    let structMesh = null;
    if (!gb.empty) {
      structMesh = new THREE.Mesh(gb.build(), structMat);
      structMesh.matrixAutoUpdate = false;
      structMesh.updateMatrix();
      this.scene.add(structMesh);
    }

    rec.state = 'ready';
    rec.mesh = mesh; rec.structMesh = structMesh;
    rec.colliders = colliders; rec.entities = entities;
    rec.biomeId = biome.id;
  }

  spawnCache(qc, entityList) {
    const y = this.getHeight(qc.x, qc.z);
    const mesh = new THREE.Mesh(cacheGeo, cacheMat);
    mesh.position.set(qc.x, y + 0.5, qc.z);
    const ent = { id: qc.id, kind: 'cache', x: qc.x, y, z: qc.z, r: 2.5, mesh, questId: qc.questId };
    qc.spawned = true;
    if (entityList) entityList.push(ent);
    else {
      const key = Math.floor(qc.x / CHUNK) + ',' + Math.floor(qc.z / CHUNK);
      const rec = this.chunks.get(key);
      if (rec && rec.entities) rec.entities.push(ent);
    }
    if (!this.looted.has(ent.id)) this.scene.add(mesh);
  }

  addQuestCache(id, x, z, questId) {
    const qc = { id, x, z, questId, spawned: false };
    this.questCaches.push(qc);
    const key = Math.floor(x / CHUNK) + ',' + Math.floor(z / CHUNK);
    const rec = this.chunks.get(key);
    if (rec && rec.state === 'ready') this.spawnCache(qc);
  }

  disposeChunk(rec) {
    if (rec.mesh) { this.scene.remove(rec.mesh); rec.mesh.geometry.dispose(); }
    if (rec.structMesh) { this.scene.remove(rec.structMesh); rec.structMesh.geometry.dispose(); }
    if (rec.entities) for (const e of rec.entities) {
      if (e.mesh) this.scene.remove(e.mesh);
      if (e.kind === 'cache') { const qc = this.questCaches.find(q => q.id === e.id); if (qc) qc.spawned = false; }
    }
  }

  // ---------- megastructures ----------
  // pure placement query: what stands in this lattice cell? (no geometry built)
  // returns a live rng positioned for buildMegastructure, so visuals stay stable
  megaInfo(mx, mz) {
    const rng = randFromHash(this.seed, mx * 13 + 5, mz * 13 + 11);
    if (!rng.chance(0.42)) return null;
    const x = (mx + rng.range(0.25, 0.75)) * MEGA_CELL;
    const z = (mz + rng.range(0.25, 0.75)) * MEGA_CELL;
    const type = rng.pick(MEGA_TYPES);
    const name = Names.ruin(this.seed, hash2(this.seed, mx, mz));
    return { key: mx + ',' + mz, x, z, type, name, rng };
  }

  // all megastructures within radius — for NPC rumors and scan pings
  megasNear(x, z, radius) {
    const out = [];
    const c0x = Math.floor((x - radius) / MEGA_CELL), c1x = Math.floor((x + radius) / MEGA_CELL);
    const c0z = Math.floor((z - radius) / MEGA_CELL), c1z = Math.floor((z + radius) / MEGA_CELL);
    for (let mz = c0z; mz <= c1z; mz++) {
      for (let mx = c0x; mx <= c1x; mx++) {
        const info = this.megaInfo(mx, mz);
        if (info && Math.hypot(info.x - x, info.z - z) <= radius) out.push(info);
      }
    }
    return out;
  }

  markDiscovered(entry) {
    if (entry.key && this.discoveredKeys.has(entry.key)) return false;
    if (entry.key) this.discoveredKeys.add(entry.key);
    this.discovered.push(entry);
    return true;
  }

  updateMegas(px, pz) {
    const mcx = Math.floor(px / MEGA_CELL), mcz = Math.floor(pz / MEGA_CELL);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const mx = mcx + dx, mz = mcz + dz;
        const key = mx + ',' + mz;
        if (this.megas.has(key)) continue;
        const info = this.megaInfo(mx, mz);
        if (!info) { this.megas.set(key, null); continue; }
        const { x, z, type, name, rng } = info;
        const y = this.getHeight(x, z);
        const built = buildMegastructure(type, rng, null);
        const mesh = new THREE.Mesh(built.geo, structMat);
        mesh.position.set(x, y, z);
        mesh.matrixAutoUpdate = false; mesh.updateMatrix();
        this.scene.add(mesh);
        // every megastructure keeps a dormant waystation anchor near its foot
        const arng = randFromHash(this.seed, mx * 7 + 1, mz * 7 + 2);
        const aAng = arng.range(0, Math.PI * 2);
        const aDist = Math.min(built.radius * 0.6 + 14, 90);
        const ax = x + Math.sin(aAng) * aDist, az = z + Math.cos(aAng) * aDist;
        const ay = this.getHeight(ax, az);
        const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.9, 5, 0.9),
          new THREE.MeshLambertMaterial({ color: 0x3a3530, emissive: 0x1a0f05 }));
        pylon.position.set(ax, ay + 2.2, az);
        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.26, 6, 5),
          new THREE.MeshBasicMaterial({ color: this.anchorActiveSet.has(key) ? 0xe8a33d : 0x4a4036 }));
        lamp.position.set(ax, ay + 5, az);
        this.scene.add(pylon, lamp);
        this.megas.set(key, {
          key, x, z, y, type, mesh, name, radius: built.radius, found: false,
          anchorPos: { x: ax, y: ay, z: az }, anchorMesh: pylon, anchorLamp: lamp,
          colliders: [...built.colliders.map(c => makeCircle(c.x + x, c.z + z, c.r)), makeCircle(ax, az, 0.75, ay + 5)],
        });
      }
    }
    // discovery + unload
    for (const [key, m] of this.megas) {
      if (!m) continue;
      const d = Math.hypot(m.x - px, m.z - pz);
      if (!m.found && d < m.radius + 160) {
        m.found = true;
        if (this.markDiscovered({ key: m.key, name: m.name, kind: m.type, x: m.x, z: m.z })
          && this.onDiscover) this.onDiscover(m);
      }
      if (d > MEGA_CELL * 2.2) {
        this.scene.remove(m.mesh); m.mesh.geometry.dispose();
        if (m.anchorMesh) { this.scene.remove(m.anchorMesh, m.anchorLamp); m.anchorMesh.geometry.dispose(); m.anchorLamp.geometry.dispose(); }
        this.megas.delete(key);
      }
    }
  }

  // ---------- queries ----------
  collidersNear(x, z) {
    const out = [];
    // in the hollow places, only the halls exist — the surface (including the
    // megastructure's own full-height footprint overhead, and surface-only
    // statics like the stairhead blockhouse) does not reach down
    if (this.groundOverride !== null) {
      for (const c of this.staticColliders) {
        if (!c.surfaceOnly && Math.abs(c.x - x) < 90 && Math.abs(c.z - z) < 90) out.push(c);
      }
      return out;
    }
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const rec = this.chunks.get((cx + dx) + ',' + (cz + dz));
        if (!rec || rec.state !== 'ready') continue;
        for (const c of rec.colliders) out.push(c);
      }
    }
    for (const m of this.megas.values()) {
      if (!m) continue;
      if (Math.abs(m.x - x) > 600 || Math.abs(m.z - z) > 600) continue;
      for (const c of m.colliders) out.push(c);
    }
    for (const c of this.staticColliders) {
      if (Math.abs(c.x - x) < 90 && Math.abs(c.z - z) < 90) out.push(c);
    }
    return out;
  }

  // push out of walls; surfaces at/below feetY don't block (you're standing on them)
  collide(p, radius, feetY = -Infinity) {
    resolve(p, radius, feetY, this.collidersNear(p.x, p.z));
  }

  // terrain height OR the top of whatever standable structure is underfoot.
  // inside a hollow place the desert floor is overhead: only structure counts,
  // with a void floor far below as a safety net.
  groundAt(x, z, feetY = Infinity) {
    const sup = supportY(x, z, feetY, this.collidersNear(x, z));
    if (this.groundOverride !== null) return Math.max(sup, this.groundOverride);
    return Math.max(this.getHeight(x, z), sup);
  }

  projectileBlocked(x, y, z) {
    return pointBlocked(x, y, z, this.collidersNear(x, z));
  }

  entitiesNear(x, z, r) {
    const out = [];
    const cx = Math.floor(x / CHUNK), cz = Math.floor(z / CHUNK);
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const rec = this.chunks.get((cx + dx) + ',' + (cz + dz));
        if (!rec || rec.state !== 'ready') continue;
        for (const e of rec.entities) {
          if (this.looted.has(e.id)) continue;
          const d = Math.hypot(e.x - x, e.z - z);
          if (d < r + e.r) out.push({ ...e, dist: d, ref: e });
        }
      }
    }
    out.sort((a, b) => a.dist - b.dist);
    return out;
  }

  markLooted(e) {
    this.looted.add(e.id);
    if (e.ref && e.ref.mesh) { this.scene.remove(e.ref.mesh); }
    else if (e.mesh) { this.scene.remove(e.mesh); }
  }

  markExplored(px, pz, chunkRadius) {
    const pcx = Math.floor(px / CHUNK), pcz = Math.floor(pz / CHUNK);
    for (let dz = -chunkRadius; dz <= chunkRadius; dz++) {
      for (let dx = -chunkRadius; dx <= chunkRadius; dx++) {
        if (dx * dx + dz * dz > chunkRadius * chunkRadius) continue;
        const key = (pcx + dx) + ',' + (pcz + dz);
        if (this.explored.has(key)) continue;
        const b = this.biomeAt((pcx + dx + 0.5) * CHUNK, (pcz + dz + 0.5) * CHUNK);
        this.explored.set(key, b.id);
      }
    }
  }

  animateEntities(dt) {
    this._animT = (this._animT || 0) + dt;
    const t = this._animT;
    for (const rec of this.chunks.values()) {
      if (rec.state !== 'ready') continue;
      for (const e of rec.entities) {
        if (!e.mesh || this.looted.has(e.id)) continue;
        if (e.kind === 'shard') {
          e.mesh.rotation.y = t * 1.2;
          e.mesh.position.y = e.y + 1.4 + Math.sin(t * 2 + e.x) * 0.2;
        } else if (e.kind === 'beacon' && e.lamp) {
          e.lamp.visible = Math.sin(t * 4 + e.z) > -0.2;
        }
      }
    }
  }
}
