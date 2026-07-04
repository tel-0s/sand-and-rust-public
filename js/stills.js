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
import { buildForm, sampleForm, lineageAt, applyMods } from './frames.js';

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

// a friendly chassis, sash-tinted by temperament; pack for the road-folk.
// form is the soul's machinic DNA, decoded: proportions and modifiers on
// top of their chosen frame — no form means the neutral body, as ever.
export function buildResidentMesh(temperament, withPack = false, frame = 'biped', form = null) {
  // not every soul kept the makers' shape: some walk on four legs now, some
  // low and wide ("my cousin swapped to tracked legs. we tow him.")
  if (frame !== 'biped') {
    const tint0 = new THREE.Color(TEMPERAMENTS[temperament].color);
    const bodyMat0 = new THREE.MeshLambertMaterial({ color: 0x6e655a });
    const accentMat0 = new THREE.MeshLambertMaterial({ color: tint0.multiplyScalar(0.55) });
    const g = buildForm(frame, frame === 'quad' ? 0.78 : 0.9,
      { body: bodyMat0, dark: new THREE.MeshLambertMaterial({ color: 0x4a4238 }), eye: lampMat },
      form || undefined);
    const sash = new THREE.Mesh(new THREE.BoxGeometry(frame === 'quad' ? 1.2 : 1.0, 0.2, 0.5), accentMat0);
    sash.position.y = (g.userData.mountH || 1.2);
    g.add(sash);
    if (withPack) {
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.4), accentMat0);
      pack.position.set(0, (g.userData.mountH || 1.2) + 0.35, -0.35);
      g.add(pack);
    }
    return g;
  }
  const tint = new THREE.Color(TEMPERAMENTS[temperament].color);
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x6e655a });
  const accentMat = new THREE.MeshLambertMaterial({ color: tint.multiplyScalar(0.55) });
  const g = new THREE.Group();
  if (form) {
    // the makers' shape, inflected: the legacy biped generalized so every
    // soul's proportions carry their DNA (neutral values reduce to the
    // shared-geometry body below, so nobody re-bodied when this shipped)
    const { bw, bh, bd, legLen, legThick, head } = form;
    const legL = 0.7 * legLen, bodyY = legL + 0.45;
    const headY = bodyY + 0.5 * bh + 0.25;
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8 * bw, 1.0 * bh, 0.55 * bd), bodyMat);
    body.position.y = bodyY; g.add(body);
    const sash = new THREE.Mesh(new THREE.BoxGeometry(0.86 * bw, 0.22, 0.6 * bd), accentMat);
    sash.position.y = bodyY + 0.2; g.add(sash);
    const hd = new THREE.Mesh(new THREE.BoxGeometry(0.45 * head, 0.4 * head, 0.45 * head), bodyMat);
    hd.position.y = headY; g.add(hd);
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.28 * head, 0.08, 0.05), lampMat);
    eye.position.set(0, headY + 0.03, 0.25 * head); g.add(eye);
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.2 * legThick, legL, 0.24 * legThick), bodyMat);
      leg.position.set(sx * 0.22 * bw, legL / 2, 0); g.add(leg);
    }
    if (withPack) {
      const pack = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.7, 0.3), accentMat);
      pack.position.set(0, bodyY + 0.15, -(0.28 * bd + 0.14)); g.add(pack);
      const roll = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 0.2), bodyMat);
      roll.position.set(0, bodyY + 0.57, -(0.28 * bd + 0.14)); g.add(roll);
    }
    if (form.mods && form.mods.length) {
      applyMods(g, 1, { body: bodyMat, dark: new THREE.MeshLambertMaterial({ color: 0x4a4238 }) }, form, {
        topY: headY + 0.25 * head, backZ: -0.28 * bd, sideX: 0.4 * bw,
        shoulderY: bodyY + 0.35 * bh, bodyY, eyeY: headY + 0.03, frontZ: 0.28 * bd,
      });
    }
    g.userData.form = form;
    return g;
  }
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

    const frameRoll = hash2(world.seed, still.salt, idx * 13 + 977) % 100;
    this.bodyFrame = frameRoll < 12 ? 'quad' : frameRoll < 19 ? 'lowslung' : 'biped';
    // machinic DNA on its own hash stream (no rng draws — the stream is
    // load-bearing): temperament shapes the drift, the valley lends its accent
    this.form = sampleForm(hash2(world.seed, still.salt, idx * 41 + 5501), {
      temperament: still.temperament, lineage: lineageAt(world.seed, still.x, still.z), spread: 0.9,
    });
    this.mesh = buildResidentMesh(still.temperament, false, this.bodyFrame, this.form);
    scene.add(this.mesh);
    this.recruitable = true;
    // flesh would call it mortality; they call it warranty.
    // frontier folk are harder folk: defenders scale with their region
    const tier = 1 + Math.min(1.5, Math.hypot(still.x, still.z) / 2000);
    this.maxHp = Math.round(95 * tier); this.hp = this.maxHp;
    this.dmg = 10 * tier; this.atkT = 0; this.flashT = 0;
    // of one substance: residents wear real parts too — and the parts wear
    // the still's fortune (prosperity part-swapping: a stage change re-rolls
    // gear on the same stream, so the people keep their names and homes)
    this.loadout = rollFolkLoadout(rng, tier, still.stage || 0);
    for (const p of this.loadout) {
      this.maxHp += Math.round((p.stats.hull || 0) * 0.5 + (p.stats.armor || 0));
      if (p.slot === 'ARMS') this.dmg += (p.stats.damage || 0) * 0.3;
    }
    this.hp = this.maxHp;
    attachGreebles(this.mesh, this.loadout, 0.8, still.stage || 0);

    const a = rng.range(0, Math.PI * 2), r = rng.range(4, 16);
    this.home = { x: still.x + Math.sin(a) * r, z: still.z + Math.cos(a) * r };
    this.pos = new THREE.Vector3(this.home.x, 0, this.home.z);
    this.target = null;
    this.pauseT = rng.range(0, 4);
    // utility-lite drives: simple needs that build and discharge, a seeded
    // work ethic, and a current activity (a real post in the yard)
    this.needs = { work: rng.range(0.2, 1), social: rng.range(0.2, 1) };
    this.jobBias = rng.range(0.8, 1.35);
    this.activity = null;
    this.activityT = 0;
    this.chatterT = rng.range(4, 12);
    this.animT = rng.range(0, 10);
    this.yaw = rng.range(0, Math.PI * 2);
  }

  damage(n) { this.hp -= n; this.flashT = 0.15; return n; }

  // which posts suit this soul's role?
  roleLikes(kind) {
    const A = {
      stall: ['broker', 'tinker', 'caravaneer'],
      shrine: ['salt-monk', 'sweeper', 'abbot', 'well-keeper'],
      totem: ['rust-speaker', 'acolyte', 'listener', 'grafter'],
      heap: ['scrapper', 'digger', 'sorter', 'tinker', 'grafter'],
      gate: ['warden', 'lookout'],
    };
    return (A[kind] || []).includes(this.role);
  }

  // pick the highest-utility post in the yard for this hour of the day
  chooseActivity(dayFrac) {
    const spots = this.still.jobSpots || [];
    if (!spots.length) return null;
    const dusk = dayFrac > 0.42 && dayFrac < 0.55; // the social hour
    const dawn = dayFrac < 0.1;
    let best = null, bestScore = 0.85; // below this, just wander
    for (const p of spots) {
      let sc = 0.4 + Math.random() * 0.4;
      if (this.roleLikes(p.kind)) sc += 1.6 * this.needs.work * this.jobBias;
      if (p.kind === 'well' || p.kind === 'landmark') sc += this.needs.social * 1.1;
      if (dusk && p.kind === 'well') sc += 1.4;                       // everyone drifts to the well at dusk
      if (dawn && (p.kind === 'shrine' || p.kind === 'gate')) sc += 0.9; // the dawn sweep, the first watch
      sc -= Math.hypot(p.x - this.pos.x, p.z - this.pos.z) / 90;
      if (sc > bestScore) { bestScore = sc; best = p; }
    }
    return best;
  }

  tickNeeds(dt) {
    this.needs.work = Math.min(1, this.needs.work + dt * 0.012);
    this.needs.social = Math.min(1, this.needs.social + dt * 0.009);
  }

  update(dt, player, isNight, enemies, dayFrac = 0.3) {
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
    } else if (this.activity) {
      // a soul with somewhere to be: walk to the post, then work it
      this.tickNeeds(dt);
      const p = this.activity;
      const d = Math.hypot(p.x - this.pos.x, p.z - this.pos.z);
      if (d > 1.7) {
        this.yaw = Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
        this.pos.x += ((p.x - this.pos.x) / d) * 1.5 * dt;
        this.pos.z += ((p.z - this.pos.z) / d) * 1.5 * dt;
      } else {
        // dwelling: face the work (or whoever shares it), and let it show
        this.activityT -= dt;
        let mate = null;
        for (const n of (this.still._roster || [])) {
          if (n !== this && n.activity && n.activity.kind === p.kind
            && Math.hypot(n.pos.x - this.pos.x, n.pos.z - this.pos.z) < 4) { mate = n; break; }
        }
        this.yaw = mate
          ? Math.atan2(mate.pos.x - this.pos.x, mate.pos.z - this.pos.z)
          : Math.atan2(p.x + (p.fx || 0) - this.pos.x, p.z + (p.fz || 0) - this.pos.z) + Math.sin(this.animT * 0.4) * 0.3;
        // two souls at one post pass the time in carrier tones
        this.chatterT -= dt;
        if (mate && this.chatterT <= 0) {
          this.chatterT = 9 + Math.random() * 9;
          if (this.onChatter) this.onChatter(this);
        }
        if (this.activityT <= 0) {
          if (this.roleLikes(p.kind)) this.needs.work = Math.max(0, this.needs.work - 0.7);
          if (p.kind === 'well' || p.kind === 'landmark') this.needs.social = Math.max(0, this.needs.social - 0.7);
          this.activity = null;
          this.pauseT = 2 + Math.random() * 5;
        }
      }
    } else {
      this.pauseT -= dt;
      this.tickNeeds(dt);
      if (this.pauseT <= 0 && !(isNight && !this.isWatch)) {
        this.activity = this.chooseActivity(dayFrac);
        if (this.activity) this.activityT = 22 + Math.random() * 28;
        else {
          const a = Math.random() * Math.PI * 2, r = Math.random() * 14;
          this.target = { x: this.still.x + Math.sin(a) * r, z: this.still.z + Math.cos(a) * r };
        }
      }
    }
    this.finishPose(dt, !!this.target || (this.activity && Math.hypot(this.activity.x - this.pos.x, this.activity.z - this.pos.z) > 1.7));
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
// every still keeps one landmark — a thing older or stranger than the walls,
// that residents point at and histories cite. Geometry lives in buildLandmark.
export const LANDMARKS = [
  { id: 'bell', name: 'the cracked bell' },
  { id: 'fountain', name: 'the dead fountain' },
  { id: 'skull', name: 'the mounted sentinel skull' },
  { id: 'obelisk', name: 'the glass obelisk' },
  { id: 'keel', name: 'the buried keel' },
  { id: 'crane', name: 'the ancient crane' },
  { id: 'sundial', name: 'the bone sundial' },
  { id: 'star', name: 'the fallen star, bolted upright' },
  { id: 'door', name: 'the door to nowhere' },
  { id: 'tree', name: 'the iron tree' },
];

function buildLandmark(gb, colliders, still, world, rng) {
  const a = rng.range(0, Math.PI * 2), r = rng.range(7, 11);
  const lx = still.x + Math.sin(a) * r, lz = still.z + Math.cos(a) * r;
  const y = world.getHeight(lx, lz);
  const STONE = [0.55, 0.53, 0.48], WOODY = [0.42, 0.33, 0.22], RUSTC = [0.55, 0.27, 0.13];
  const GLASS = [0.55, 0.75, 0.7], BONE = [0.8, 0.77, 0.68], DARKM = [0.3, 0.28, 0.26];
  switch (still.landmark.id) {
    case 'bell':
      gb.addBox(lx - 1.1, y + 1.6, lz, 0.25, 3.2, 0.25, WOODY);
      gb.addBox(lx + 1.1, y + 1.6, lz, 0.25, 3.2, 0.25, WOODY);
      gb.addBox(lx, y + 3.3, lz, 2.6, 0.25, 0.3, WOODY);
      gb.addBox(lx, y + 2.5, lz, 1.1, 1.3, 1.1, DARKM, 0.3); // the bell, split
      gb.addBox(lx + 0.18, y + 2.4, lz + 0.14, 0.12, 1.1, 0.5, [0.1, 0.09, 0.08], 0.35); // the crack
      break;
    case 'fountain':
      for (let i = 0; i < 8; i++) { const b = (i / 8) * Math.PI * 2; gb.addBox(lx + Math.sin(b) * 1.9, y + 0.35, lz + Math.cos(b) * 1.9, 0.9, 0.7, 0.6, STONE, b); }
      gb.addBox(lx, y + 1.2, lz, 0.5, 2.4, 0.5, STONE);
      gb.addBox(lx, y + 2.4, lz, 1.4, 0.2, 1.4, STONE); // dry basin, tilted
      break;
    case 'skull':
      gb.addBox(lx, y + 2.2, lz, 0.5, 4.4, 0.5, WOODY, 0.1);
      gb.addBox(lx, y + 4.9, lz, 1.7, 1.5, 1.6, DARKM, 0.2, 0.15); // the head
      gb.addBox(lx, y + 4.9, lz + 0.85, 1.5, 0.3, 0.15, RUSTC); // dead eye band
      break;
    case 'obelisk':
      gb.addBox(lx, y + 2.6, lz, 1.1, 5.2, 1.1, GLASS, rng.range(0, 3), 0.06);
      break;
    case 'keel':
      gb.addBox(lx, y + 1.5, lz, 9, 1.1, 0.8, RUSTC, a, 0.5); // hull spine breaching
      gb.addBox(lx + Math.sin(a) * 3, y + 2.6, lz + Math.cos(a) * 3, 0.4, 2.6, 0.4, RUSTC, a, 0.4);
      break;
    case 'crane':
      gb.addBox(lx, y + 3.5, lz, 0.9, 7, 0.9, DARKM, 0.15);
      gb.addBox(lx + 1.8, y + 6.6, lz, 4.6, 0.5, 0.5, DARKM, 0.15, -0.2);
      gb.addBox(lx + 3.6, y + 5.2, lz, 0.12, 2.6, 0.12, WOODY); // the hanging chain
      break;
    case 'sundial':
      for (let i = 0; i < 6; i++) { const b = (i / 6) * Math.PI * 2; gb.addBox(lx + Math.sin(b) * 2.2, y + 0.3, lz + Math.cos(b) * 2.2, 0.5, 0.6, 0.5, BONE, b); }
      gb.addBox(lx, y + 1.3, lz, 0.3, 2.6, 0.3, BONE, 0, 0.5); // the gnomon rib
      break;
    case 'star':
      gb.addBox(lx, y + 1.8, lz, 2.2, 2.2, 2.2, DARKM, 0.6, 0.6); // pitted mass
      gb.addBox(lx - 1.4, y + 0.9, lz, 0.3, 1.8, 0.3, RUSTC, 0.2); // the bolts
      gb.addBox(lx + 1.4, y + 0.9, lz, 0.3, 1.8, 0.3, RUSTC, -0.2);
      break;
    case 'door':
      gb.addBox(lx - 1, y + 1.7, lz, 0.4, 3.4, 0.4, STONE);
      gb.addBox(lx + 1, y + 1.7, lz, 0.4, 3.4, 0.4, STONE);
      gb.addBox(lx, y + 3.5, lz, 2.6, 0.4, 0.4, STONE); // a frame, standing alone
      break;
    case 'tree':
      gb.addBox(lx, y + 2, lz, 0.6, 4, 0.6, RUSTC, 0.1, 0.08);
      for (let i = 0; i < 4; i++) { const b = (i / 4) * Math.PI * 2 + 0.5; gb.addBox(lx + Math.sin(b) * 1.3, y + 3.4 + i * 0.3, lz + Math.cos(b) * 1.3, 2, 0.18, 0.18, RUSTC, b, 0.3); }
      break;
  }
  colliders.push(makeCircle(lx, lz, 1.6, y + 2.2, false));
  still.landmarkPos = [lx, lz];
  still.jobSpots.push({ kind: 'landmark', x: lx + 2.4, z: lz + 0.4, fx: -2.4, fz: -0.4 });
}

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
    still.jobSpots.push({ kind: 'well', x: cx + 3.0, z: cz + 0.6, fx: -3, fz: -0.6 });
    still.jobSpots.push({ kind: 'well', x: cx - 2.8, z: cz - 1.0, fx: 2.8, fz: 1.0 });
  }

  // dynamic stage: what the years have done to this place. Stage shifts the
  // EFFECTIVE class (a thriving hamlet dresses like a village), and decline
  // must be legible in retrospect: boards, drifts, dark lamps, breaches.
  const stage = still.stage || 0;
  const CLASS_ORDER = ['hamlet', 'village', 'town'];
  const effIdx = Math.max(0, Math.min(2, CLASS_ORDER.indexOf(still.sizeClass || 'hamlet') + Math.max(-1, Math.min(1, stage))));
  const buildingsBuilt = []; // [bx, bz, w, d, h, rot, y] for the boarding pass

  // VARIETY: every still has a personality — a palette lean, and a layout
  // (most huddle in a ring; some line up along a street; some crowd one
  // side against the prevailing wind)
  const tint = rng.range(-0.06, 0.07);
  const SANDT = [SAND[0] + tint, SAND[1] + tint * 0.7, SAND[2] + tint * 0.4];
  const layout = rng.chance(0.28) ? 'street' : rng.chance(0.2) ? 'windbreak' : 'ring';
  const streetA = rng.range(0, Math.PI * 2);

  // dwellings & temperament set-dressing on a ring
  const nBuildings = rng.int(3, 5);
  for (let i = 0; i < nBuildings; i++) {
    let a = (i / nBuildings) * Math.PI * 2 + rng.range(-0.25, 0.25);
    if (layout === 'street') a = streetA + (i % 2 ? Math.PI : 0) + rng.range(-0.45, 0.45);
    else if (layout === 'windbreak') a = streetA + rng.range(-1.1, 1.1);
    const r = rng.range(12, 24);
    const bx = cx + Math.sin(a) * r, bz = cz + Math.cos(a) * r;
    const y = gY(bx, bz);
    const w = rng.range(4.5, 7), d = rng.range(4, 6), h = rng.range(2.6, 3.6);
    const rot = a + rng.range(-0.3, 0.3);
    gb.addBox(bx, y + h / 2, bz, w, h, d, [SANDT[0] + rng.range(-0.04, 0.04), SANDT[1], SANDT[2]], rot);
    gb.addBox(bx, y + h + 0.2, bz, w + 0.7, 0.35, d + 0.7, WOODY, rot); // roof slab
    colliders.push(makeBox(bx, bz, w / 2 + 0.1, d / 2 + 0.1, rot, y + h + 0.4, true));
    buildingsBuilt.push([bx, bz, w, d, h, rot, y]);
    // lamp by the door
    still.lampSpots.push([bx + Math.sin(rot) * (d / 2 + 1), y + 1.8, bz + Math.cos(rot) * (d / 2 + 1)]);
  }
  if (temperament === 'monastic') {
    // salt shrine: stacked white stones
    const sx = cx + 8, sz = cz - 6, y = gY(sx, sz);
    for (let i = 0; i < 4; i++) gb.addBox(sx, y + 0.4 + i * 0.7, sz, 1.8 - i * 0.35, 0.7, 1.8 - i * 0.35, WHITE, i * 0.4);
    colliders.push(makeCircle(sx, sz, 1.2, y + 3, false));
    still.jobSpots.push({ kind: 'shrine', x: sx + 2.2, z: sz, fx: -2.2, fz: 0 });
  } else if (temperament === 'ferrocult') {
    // rust-totem: leaning corroded pylon
    const sx = cx - 9, sz = cz + 7, y = gY(sx, sz);
    gb.addBox(sx, y + 3.2, sz, 0.8, 6.5, 0.8, RUSTC, 0.3, 0.12);
    colliders.push(makeCircle(sx, sz, 0.8, y + 6, false));
    still.jobSpots.push({ kind: 'totem', x: sx + 2.0, z: sz + 0.5, fx: -2, fz: -0.5 });
  } else if (temperament === 'mercantile') {
    // market stalls: posts + awnings
    for (let i = 0; i < 2; i++) {
      const sx = cx + (i ? 7 : -7), sz = cz + 8, y = gY(sx, sz);
      for (const ox of [-1.6, 1.6]) for (const oz of [-1.2, 1.2]) gb.addBox(sx + ox, y + 1.1, sz + oz, 0.18, 2.2, 0.18, WOODY);
      gb.addBox(sx, y + 2.3, sz, 4.2, 0.15, 3.2, CLOTH, 0.05);
      gb.addBox(sx, y + 0.8, sz, 3.2, 0.5, 2.0, WOODY); // counter
      colliders.push(makeBox(sx, sz, 1.7, 1.1, 0, y + 1.05, true));
      still.jobSpots.push({ kind: 'stall', x: sx, z: sz - 2.2, fx: 0, fz: 2.2 });
    }
  } else {
    // scavver sorting heaps
    for (let i = 0; i < 3; i++) {
      const sx = cx + rng.range(-14, 14), sz = cz + rng.range(-14, 14), y = gY(sx, sz);
      gb.addBox(sx, y + 0.5, sz, rng.range(1.5, 3), rng.range(0.8, 1.6), rng.range(1.5, 2.5), rng.chance(0.5) ? RUSTC : STONE, rng.range(0, 3), 0.15);
      if (i === 0) still.jobSpots.push({ kind: 'heap', x: sx + 2, z: sz, fx: -2, fz: 0 });
    }
  }

  // GREATER STILLS: villages and towns grow a second ring and a district
  const size = CLASS_ORDER[effIdx];
  if (size !== 'hamlet') {
    const extra = size === 'town' ? rng.int(4, 6) : rng.int(2, 3);
    for (let i = 0; i < extra; i++) {
      const a = (i / extra) * Math.PI * 2 + rng.range(-0.3, 0.3) + 0.5;
      const r = rng.range(26, 33);
      const bx = cx + Math.sin(a) * r, bz = cz + Math.cos(a) * r;
      const y = gY(bx, bz);
      const w = rng.range(4, 6.5), d = rng.range(3.5, 5.5), h = rng.range(2.4, 3.4);
      const rot = a + rng.range(-0.3, 0.3);
      gb.addBox(bx, y + h / 2, bz, w, h, d, [SAND[0] + rng.range(-0.06, 0.04), SAND[1], SAND[2]], rot);
      gb.addBox(bx, y + h + 0.2, bz, w + 0.6, 0.3, d + 0.6, WOODY, rot);
      colliders.push(makeBox(bx, bz, w / 2 + 0.1, d / 2 + 0.1, rot, y + h + 0.35, true));
      buildingsBuilt.push([bx, bz, w, d, h, rot, y]);
      still.lampSpots.push([bx + Math.sin(rot) * (d / 2 + 1), y + 1.8, bz + Math.cos(rot) * (d / 2 + 1)]);
    }
    // the district: the temperament's dressing, doubled into a quarter
    if (temperament === 'mercantile') {
      for (let i = 0; i < (size === 'town' ? 3 : 2); i++) {
        const sx2 = cx - 6 + i * 6.5, sz2 = cz - 12, y = gY(sx2, sz2);
        for (const ox of [-1.6, 1.6]) for (const oz of [-1.2, 1.2]) gb.addBox(sx2 + ox, y + 1.1, sz2 + oz, 0.18, 2.2, 0.18, WOODY);
        gb.addBox(sx2, y + 2.3, sz2, 4.2, 0.15, 3.2, CLOTH, 0.05 + i * 0.03);
        gb.addBox(sx2, y + 0.8, sz2, 3.2, 0.5, 2.0, WOODY);
        colliders.push(makeBox(sx2, sz2, 1.7, 1.1, 0, y + 1.05, true));
        still.jobSpots.push({ kind: 'stall', x: sx2, z: sz2 - 2.2, fx: 0, fz: 2.2 });
      }
    } else if (temperament === 'monastic') {
      // a cloister walk: white posts flanking a swept path to the shrine
      for (let i = 0; i < 6; i++) {
        for (const side of [-1.6, 1.6]) {
          const px = cx + 5 + i * 2.2, pz = cz - 3 + side, y = gY(px, pz);
          gb.addBox(px, y + 1, pz, 0.3, 2, 0.3, WHITE);
        }
      }
    } else if (temperament === 'ferrocult') {
      // a totem garden: lesser pylons leaning toward the great one
      for (let i = 0; i < (size === 'town' ? 4 : 2); i++) {
        const px = cx - 9 + rng.range(-6, 6), pz = cz + 7 + rng.range(-6, 6), y = gY(px, pz);
        gb.addBox(px, y + 1.8, pz, 0.5, 3.6, 0.5, RUSTC, rng.range(0, 3), rng.range(0.08, 0.2));
        colliders.push(makeCircle(px, pz, 0.5, y + 3.4, false));
      }
    } else {
      // a crane-yard: the sorting heaps get industry
      const px = cx + 12, pz = cz - 10, y = gY(px, pz);
      gb.addBox(px, y + 2.6, pz, 0.7, 5.2, 0.7, [0.3, 0.28, 0.26], 0.1);
      gb.addBox(px + 1.4, y + 4.9, pz, 3.6, 0.4, 0.4, [0.3, 0.28, 0.26], 0.1, -0.15);
      colliders.push(makeCircle(px, pz, 0.7, y + 5, false));
      still.jobSpots.push({ kind: 'heap', x: px + 2.4, z: pz, fx: -2.4, fz: 0 });
      for (let i = 0; i < 3; i++) {
        const hx = px + rng.range(-5, 5), hz = pz + rng.range(-5, 5), hy = gY(hx, hz);
        gb.addBox(hx, hy + 0.5, hz, rng.range(1.5, 3), rng.range(0.8, 1.6), rng.range(1.5, 2.5), rng.chance(0.5) ? RUSTC : STONE, rng.range(0, 3), 0.15);
      }
    }
  }
  // the landmark: older or stranger than the walls
  if (still.landmark) buildLandmark(gb, colliders, still, world, rng);

  // flavor: two small seeded touches per still, from a shared catalog —
  // even the smallest hamlet is nobody else's hamlet
  {
    const FLAVORS = ['windwheel', 'troughs', 'racks', 'platform', 'statue', 'flags', 'cairns', 'arch'];
    const f1 = rng.int(0, FLAVORS.length - 1);
    const f2 = (f1 + 1 + rng.int(0, FLAVORS.length - 2)) % FLAVORS.length;
    for (const fid of [FLAVORS[f1], FLAVORS[f2]]) {
      const fa = rng.range(0, Math.PI * 2), fr = rng.range(9, 20);
      const fx = cx + Math.sin(fa) * fr, fz = cz + Math.cos(fa) * fr;
      const fy = gY(fx, fz);
      switch (fid) {
        case 'windwheel':
          gb.addBox(fx, fy + 2.6, fz, 0.3, 5.2, 0.3, WOODY);
          for (let k = 0; k < 4; k++) gb.addBox(fx, fy + 4.8, fz, k % 2 ? 0.16 : 2.6, k % 2 ? 2.6 : 0.16, 0.1, CLOTH, fa + k * 0.02);
          colliders.push(makeCircle(fx, fz, 0.4, fy + 5, false));
          break;
        case 'troughs':
          gb.addBox(fx, fy + 0.35, fz, 2.4, 0.7, 0.9, STONE, fa);
          gb.addBox(fx + 1.6, fy + 0.3, fz + 1.1, 2.0, 0.6, 0.8, STONE, fa + 0.4);
          break;
        case 'racks':
          for (const off of [0, 2.4]) {
            gb.addBox(fx + off, fy + 1.1, fz, 0.16, 2.2, 0.16, WOODY);
            gb.addBox(fx + off, fy + 1.1, fz + 2, 0.16, 2.2, 0.16, WOODY);
          }
          gb.addBox(fx + 1.2, fy + 2.1, fz + 1, 2.8, 0.08, 2.2, CLOTH, 0.05, 0.04);
          break;
        case 'platform':
          for (const [ox2, oz2] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) gb.addBox(fx + ox2, fy + 1.6, fz + oz2, 0.25, 3.2, 0.25, WOODY);
          gb.addBox(fx, fy + 3.3, fz, 2.8, 0.25, 2.8, WOODY);
          colliders.push(makeBox(fx, fz, 1.4, 1.4, 0, fy + 3.45, true));
          break;
        case 'statue':
          gb.addBox(fx, fy + 1.0, fz, 1.1, 2.0, 0.8, STONE, fa, 0.12); // a torso, sand to the waist
          gb.addBox(fx + 0.1, fy + 2.3, fz, 0.6, 0.6, 0.6, STONE, fa, 0.2);
          colliders.push(makeCircle(fx, fz, 0.7, fy + 2.4, false));
          break;
        case 'flags':
          gb.addBox(fx, fy + 1.5, fz, 0.14, 3, 0.14, WOODY);
          gb.addBox(fx + 4, fy + 1.4, fz + 1, 0.14, 2.8, 0.14, WOODY);
          for (let k = 1; k <= 4; k++) gb.addBox(fx + k * 0.8, fy + 2.5 - k * 0.06, fz + k * 0.2, 0.4, 0.3, 0.03, k % 2 ? WHITE : CLOTH, 0.2);
          break;
        case 'cairns':
          for (let k = 0; k < 3; k++) {
            const kx = fx + rng.range(-2, 2), kz = fz + rng.range(-2, 2), ky = gY(kx, kz);
            for (let j = 0; j < 3; j++) gb.addBox(kx, ky + 0.25 + j * 0.42, kz, 0.8 - j * 0.2, 0.42, 0.8 - j * 0.2, STONE, j * 0.5);
          }
          break;
        case 'arch':
          gb.addBox(fx - 1.4, fy + 1.8, fz, 0.5, 3.6, 0.5, RUSTC, 0.1, 0.28);
          gb.addBox(fx + 1.4, fy + 1.8, fz, 0.5, 3.6, 0.5, RUSTC, -0.1, -0.28);
          colliders.push(makeCircle(fx - 1.4, fz, 0.5, fy + 3.4, false));
          colliders.push(makeCircle(fx + 1.4, fz, 0.5, fy + 3.4, false));
          break;
      }
    }
    still.flavors = [FLAVORS[f1], FLAVORS[f2]];
  }

  // THE YEARS, MADE VISIBLE
  if (stage < 0) {
    const BOARD = [0.28, 0.2, 0.13];
    const boardFrom = stage <= -2 ? 0 : Math.ceil(buildingsBuilt.length * 0.55);
    buildingsBuilt.forEach(([bx, bz, w, d, h, rot, y], i) => {
      if (i < boardFrom) return;
      // planks nailed across the door face, and the door lamp goes dark
      const fx = bx + Math.sin(rot) * (d / 2 + 0.15), fz = bz + Math.cos(rot) * (d / 2 + 0.15);
      gb.addBox(fx, y + 1.0, fz, 1.7, 0.22, 0.12, BOARD, rot, 0.25);
      gb.addBox(fx, y + 1.7, fz, 1.7, 0.22, 0.12, BOARD, rot, -0.2);
      const li = still.lampSpots.findIndex(([lx2, , lz2]) => Math.hypot(lx2 - fx, lz2 - fz) < 2.5);
      if (li >= 0) still.lampSpots.splice(li, 1);
      // sand has begun to take the threshold back
      gb.addBox(fx, y + 0.25, fz + 0.3, 2.4, 0.5, 1.4, SAND, rot, 0.18);
    });
    if (stage <= -2) {
      // the well is capped; the rim still keeps its names
      const wy = gY(cx, cz);
      gb.addBox(cx, wy + 1.05, cz, 3.4, 0.2, 0.7, [0.28, 0.2, 0.13], 0.2);
      gb.addBox(cx, wy + 1.05, cz, 0.7, 0.2, 3.4, [0.28, 0.2, 0.13], 0.2);
      still.lampSpots.length = 0;
    } else if (still.lampSpots.length > 2) {
      still.lampSpots.length = Math.ceil(still.lampSpots.length / 2); // half the lamps have died
    }
  } else if (stage >= 1) {
    // growth you can watch: a new dwelling under construction
    const a = rng.range(0, Math.PI * 2);
    const bx = cx + Math.sin(a) * 29, bz = cz + Math.cos(a) * 29, y = gY(bx, bz);
    for (const [ox, oz] of [[-2.2, -1.8], [2.2, -1.8], [-2.2, 1.8], [2.2, 1.8]]) {
      gb.addBox(bx + ox, y + 1.5, bz + oz, 0.3, 3, 0.3, WOODY);
    }
    gb.addBox(bx, y + 3.05, bz, 4.9, 0.2, 0.25, WOODY);
    gb.addBox(bx, y + 0.7, bz - 1.8, 4.4, 1.4, 0.3, [0.62, 0.55, 0.42]); // first course of wall
    colliders.push(makeBox(bx, bz, 2.4, 2, 0, y + 1.4, true));
  }

  // perimeter wall: low arc segments — two gates, three for a town, and
  // town walls stand taller (they have more to lose)
  const SEGS = 16;
  const gate1 = rng.int(0, SEGS - 1), gate2 = (gate1 + SEGS / 2) | 0;
  const gate3 = size === 'town' ? (gate1 + (SEGS / 4) | 0) % SEGS : -1;
  const wallH = size === 'town' ? 2.2 : 1.5;
  for (let i = 0; i < SEGS; i++) {
    if (i === gate1 || i === gate2 || i === gate3) {
      const ga = (i / SEGS) * Math.PI * 2;
      still.jobSpots.push({ kind: 'gate', x: cx + Math.sin(ga) * (FIELD_R - 8), z: cz + Math.cos(ga) * (FIELD_R - 8), fx: Math.sin(ga) * 3, fz: Math.cos(ga) * 3 });
      continue;
    }
    // an abandoned wall is breached: segments have fallen to rubble
    if (stage <= -2 && i % 4 === 1) {
      const a2 = (i / SEGS) * Math.PI * 2;
      const rx = cx + Math.sin(a2) * (FIELD_R - 6), rz = cz + Math.cos(a2) * (FIELD_R - 6);
      const ry = gY(rx, rz);
      gb.addBox(rx, ry + 0.3, rz, 2.2, 0.6, 1.6, STONE, a2, 0.2);
      continue;
    }
    const a = (i / SEGS) * Math.PI * 2;
    const wx = cx + Math.sin(a) * (FIELD_R - 6), wz = cz + Math.cos(a) * (FIELD_R - 6);
    const y = gY(wx, wz);
    const len = (Math.PI * 2 * (FIELD_R - 6)) / SEGS * 0.92;
    gb.addBox(wx, y + wallH / 2 - 0.05, wz, len, wallH, 0.7, [STONE[0] + rng.range(-0.04, 0.04), STONE[1], STONE[2]], a + Math.PI / 2);
    colliders.push(makeBox(wx, wz, len / 2, 0.45, a + Math.PI / 2, y + wallH - 0.05, true));
    if (i % 3 === 0) still.lampSpots.push([wx, y + wallH + 0.6, wz]);
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
  // the pan-scan is pure (no rng): shared by natural stills, dry wells,
  // and the hearths founded on them
  scanPan(sx, sz) {
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
    return { best, bestW };
  }

  // a dry well: good salt where the founders never came — until you
  dryWellAt(sx, sz) {
    const key = sx + ',' + sz;
    const rng = randFromHash(this.world.seed, sx * 29 + 7, sz * 29 + 17);
    if (rng.chance(0.75)) return null;              // that cell got a real still (or nothing)
    if (this.hooks.isFounded && this.hooks.isFounded(key)) return null; // already a hearth
    const { best, bestW } = this.scanPan(sx, sz);
    if (bestW <= 0.3 || !best) return null;
    return { key, x: best[0], z: best[1] };
  }

  dryWellsNear(x, z, radius) {
    const out = [];
    const c0x = Math.floor((x - radius) / STILL_CELL), c1x = Math.floor((x + radius) / STILL_CELL);
    const c0z = Math.floor((z - radius) / STILL_CELL), c1z = Math.floor((z + radius) / STILL_CELL);
    for (let sz = c0z; sz <= c1z; sz++) {
      for (let sx = c0x; sx <= c1x; sx++) {
        const w = this.dryWellAt(sx, sz);
        if (w && Math.hypot(w.x - x, w.z - z) <= radius) out.push(w);
      }
    }
    return out;
  }

  infoAt(sx, sz) {
    const key = sx + ',' + sz;
    if (this.cells.has(key)) return this.cells.get(key);
    let info = null;
    const rng = randFromHash(this.world.seed, sx * 29 + 7, sz * 29 + 17);
    // a founded hearth is a real still, whatever the old dice said
    if (!rng.chance(0.75)) {
      if (this.hooks.isFounded && this.hooks.isFounded(key)) {
        const { best, bestW } = this.scanPan(sx, sz);
        if (bestW > 0.3 && best) {
          const salt = hash2(this.world.seed, sx * 31 + 3, sz * 31 + 13);
          const rng2 = randFromHash(this.world.seed, sx * 41 + 9, sz * 41 + 19);
          const temperament = rng2.weighted([['mercantile', 3], ['scavver', 3], ['monastic', 2], ['ferrocult', 1]]);
          info = {
            key, x: best[0], z: best[1], salt, temperament,
            name: Names.still(this.world.seed, salt),
            sizeClass: 'hamlet', extent: 0,
            residents: rng2.int(3, 5),
            landmark: LANDMARKS[hash2(this.world.seed, salt, 555) % LANDMARKS.length],
            founded: true,
            lampSpots: [],
          };
        }
      }
      this.cells.set(key, info);
      return info;
    }
    {
      const { best, bestW } = this.scanPan(sx, sz);
      if (bestW > 0.25 && best) {
        const salt = hash2(this.world.seed, sx * 31 + 3, sz * 31 + 13);
        const temperament = rng.weighted([['mercantile', 3], ['scavver', 3], ['monastic', 2], ['ferrocult', 1.4]]);
        // GREATER STILLS. Size is earned from the ground: measure the pan's
        // actual extent by sampling the salt field on rings around the heart.
        // (All new draws use a SECOND stream — rng's sequence feeds
        // temperament and the base population, and shifting it would reshuffle
        // every settlement on every live save. The pools lesson, applied.)
        const rng2 = randFromHash(this.world.seed, sx * 41 + 9, sz * 41 + 19);
        let extent = 0;
        for (let ring = 1; ring <= 3; ring++) {
          for (let k = 0; k < 8; k++) {
            const a = (k / 8) * Math.PI * 2 + ring * 0.39;
            if (this.saltAt(best[0] + Math.sin(a) * ring * 95, best[1] + Math.cos(a) * ring * 95) > 0.3) extent++;
          }
        }
        // tuned against the measured extent distribution: ~2/3 hamlets,
        // ~1/3 villages, towns a rare few percent — the desert is sparing
        const sizeClass = extent >= 15 && rng2.chance(0.5) ? 'town' : extent >= 12 ? 'village' : 'hamlet';
        const baseResidents = rng.int(3, 5); // the original draw, untouched
        info = {
          key, x: best[0], z: best[1], salt, temperament,
          name: Names.still(this.world.seed, salt),
          sizeClass, extent,
          residents: baseResidents + (sizeClass === 'town' ? rng2.int(5, 8) : sizeClass === 'village' ? rng2.int(2, 4) : 0),
          landmark: LANDMARKS[hash2(this.world.seed, salt, 555) % LANDMARKS.length],
          lampSpots: [],
        };
      }
    }
    this.cells.set(key, info);
    return info;
  }

  dryNear(pos, r) {
    if (!this.dryLoaded) return null;
    for (const w of this.dryLoaded.values()) {
      if (Math.hypot(w.x - pos.x, w.z - pos.z) < r) return w;
    }
    return null;
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

  update(dt, player, isNight, enemies, dayFrac = 0.3) {
    const px = player.pos.x, pz = player.pos.z;
    // dry wells: the stills that never were, waiting for a founder
    if (!this.dryLoaded) this.dryLoaded = new Map();
    for (const w of this.dryWellsNear(px, pz, STILL_CELL * 1.2)) {
      if (this.dryLoaded.has(w.key)) continue;
      const gb = new GeoBuilder();
      const y = this.world.getHeight(w.x, w.z);
      const rng = randFromHash(this.world.seed, hash2(this.world.seed, w.x | 0, w.z | 0), 17);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + rng.range(-0.2, 0.2);
        gb.addBox(w.x + Math.sin(a) * 1.5, y + rng.range(0.05, 0.3), w.z + Math.cos(a) * 1.5,
          0.85, rng.range(0.3, 0.7), 0.65, [0.5, 0.48, 0.44], a, rng.range(-0.15, 0.15));
      }
      gb.addBox(w.x + 0.4, y + 0.15, w.z - 0.3, 2.6, 0.3, 0.4, [0.35, 0.28, 0.2], 0.4, 0.1); // the fallen crossbeam
      const mesh = new THREE.Mesh(gb.build(), stillMat);
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      this.scene.add(mesh);
      this.dryLoaded.set(w.key, { mesh, x: w.x, z: w.z, key: w.key });
    }
    for (const [key, rec] of this.dryLoaded) {
      if (Math.hypot(rec.x - px, rec.z - pz) > STILL_CELL * 1.4
        || (this.hooks.isFounded && this.hooks.isFounded(key))) {
        this.scene.remove(rec.mesh); rec.mesh.geometry.dispose();
        this.dryLoaded.delete(key);
      }
    }
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
          n.update(dt, player, isNight, enemies, dayFrac);
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
    info.jobSpots = [];
    // dynamic stills: the game assesses this settlement's fortunes before we
    // build it — stage rides info and shapes everything below
    if (this.hooks.assess) this.hooks.assess(info);
    info.stage = info.stage || 0;
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
    const turretCount = info.stage <= -2 ? 0
      : 1 + (this.hooks.hasFundedTurret && this.hooks.hasFundedTurret(info.key) ? 1 : 0);
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
    const effResidents = info.stage <= -2 ? 0
      : info.stage === -1 ? Math.max(2, Math.floor(info.residents * 0.6))
      : info.residents + (info.stage >= 1 ? 2 : 0);
    // unfinished business outlasts the lean years: souls the game says must
    // stay (open contracts, epics) spawn even past the trimmed roster. The
    // loop still constructs every index up to the last one needed, so each
    // soul's draws land where they always did.
    const keep = this.hooks.mustKeep ? this.hooks.mustKeep(info) : null;
    const maxIdx = Math.min(info.residents + 2,
      Math.max(effResidents, keep && keep.size ? Math.max(...keep) + 1 : 0));
    for (let i = 0; i < maxIdx; i++) {
      const n = new NPC(this.scene, this.world, info, i, rng, neighbors);
      n.onChatter = this.hooks.onChatter || null;
      // some names are kept against the drift of the pools (legacy revivals)
      const ov = this.hooks.nameOverride && this.hooks.nameOverride(n.id);
      if (ov) n.name = ov;
      // someone who walks with you (or once did) is not also at home;
      // and the dead, the desert keeps
      if ((this.hooks.isRecruited && this.hooks.isRecruited(n.id)) ||
          (this.hooks.isDead && this.hooks.isDead(n.id))) { n.dispose(this.scene); continue; }
      if (i >= effResidents && !(keep && keep.has(i))) { n.dispose(this.scene); continue; } // left with the lean years
      n.lingering = i >= effResidents; // stayed behind for you
      npcs.push(n);
    }
    this.world.staticColliders.push(...built.colliders);
    const zone = info.stage <= -2 ? null : { x: info.x, z: info.z, r: FIELD_R };
    if (zone && this.hooks.safeZones) this.hooks.safeZones.push(zone);
    info._roster = npcs; // souls at the same post find each other
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
