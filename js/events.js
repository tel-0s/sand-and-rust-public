// World events: discrete happenings with a lifecycle — forecast, onset,
// active, resolution — scheduled on world-time. Sandstorms were the first of
// this kind (they keep their own engine); here live the rest: Rust blooms
// boiling out of the red sand, and raids breaking against settlement walls.
import * as THREE from 'three';
import { Rand } from './rng.js';

// ---------- a Rust bloom: the red sand stirs ----------
class BloomEvent {
  constructor(game, x, z) {
    this.game = game;
    this.kind = 'bloom';
    this.x = x; this.z = z; this.r = 42;
    this.life = 75; // seconds
    this.spawnT = 2;
    this.spawned = 0;
    this.done = false;
    const y = game.world.getHeight(x, z);
    this.dome = new THREE.Mesh(
      new THREE.SphereGeometry(this.r, 18, 12),
      new THREE.MeshBasicMaterial({ color: 0xc1340f, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
    this.dome.position.set(x, y, z);
    game.scene.add(this.dome);
    game.audio.play('storm');
    game.ui.toast('the red sand stirs — RUST BLOOM nearby', 'rust');
  }

  update(dt) {
    const g = this.game;
    this.life -= dt;
    this.dome.material.opacity = 0.05 + Math.sin(performance.now() / 320) * 0.025;
    this.dome.scale.setScalar(1 + Math.sin(performance.now() / 900) * 0.04);
    const pd = Math.hypot(g.player.pos.x - this.x, g.player.pos.z - this.z);
    if (pd < this.r) g.player.corruption = Math.min(100, g.player.corruption + (7 / 60) * dt);
    this.spawnT -= dt;
    if (this.spawnT <= 0 && this.spawned < 5 && pd < 160) {
      this.spawnT = 9;
      this.spawned++;
      const a = Math.random() * Math.PI * 2, r = Math.random() * this.r * 0.8;
      g.enemies.spawnAt('rustform', this.x + Math.sin(a) * r, this.z + Math.cos(a) * r, { infected: true });
    }
    if (this.life <= 0) {
      this.done = true;
      g.scene.remove(this.dome); this.dome.geometry.dispose();
      g.ui.toast('the bloom recedes into the sand', 'good');
      g.journal.push({ type: 'lore', cat: 'event', title: 'RUST BLOOM', body: `the red sand rose near ${g.world.regionName(this.x, this.z)} and receded. day ${1 + Math.floor(g.worldT)}.` });
    }
  }
}

// ---------- a raid: the nests send their children against the walls ----------
class RaidEvent {
  constructor(game, still) {
    this.game = game;
    this.kind = 'raid';
    this.still = still;
    this.phase = 'warning';
    this.t = 12; // seconds of warning bell
    this.wave = 0;
    this.raiders = [];
    this.deaths = 0;
    this.done = false;
    game.audio.play('bell');
    game.ui.toast(`THE BELL AT ${still.name.toUpperCase()} — machines sighted. RAID INCOMING`, 'rust');
  }

  spawnWave() {
    const g = this.game, s = this.still;
    const n = this.wave === 0 ? 4 : 3;
    // raiders come sized for the settlement, not for you: a frontier still
    // faces frontier machines, but the walls stay defensible
    const stillTier = 1 + Math.min(1.2, Math.hypot(s.x, s.z) / 2600);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 25;
      const kind = Math.random() < 0.5 ? 'scrabbler' : (Math.random() < 0.65 ? 'dervish' : 'rustform');
      const e = g.enemies.spawnAt(kind, s.x + Math.sin(a) * r, s.z + Math.cos(a) * r,
        { infected: Math.random() < 0.6, raider: true, aggro: true, tierMult: stillTier });
      this.raiders.push(e);
    }
  }

  // every raid resolves conclusively — victory, mourning, or a scatter
  finish(scattered) {
    const g = this.game;
    this.done = true;
    const prefix = scattered ? 'the raiders lose conviction and scatter — ' : '';
    g.journal.push({
      type: 'lore', cat: 'event',
      title: `RAID — ${this.still.name.toUpperCase()}`,
      body: this.deaths === 0
        ? `${scattered ? 'the raiders scattered; ' : ''}the wall held and no souls were lost. day ${1 + Math.floor(g.worldT)}.`
        : `${scattered ? 'the raiders scattered, but ' : ''}${this.deaths} soul${this.deaths === 1 ? '' : 's'} fell before it ended. day ${1 + Math.floor(g.worldT)}.`,
    });
    if (this.deaths === 0) {
      g.changeRep(this.still, 8);
      g.recordEvent('raidwin', this.still.name);
      g.appendHistory(this.still.key, `the raid of day ${1 + Math.floor(g.worldT)} broke against the wall. no souls lost. a wanderer stood with the watch.`);
      g.audio.play('chime');
      g.ui.toast(`${prefix.toUpperCase()}THE WALL HELD, NOTHING LOST — ${this.still.name.toUpperCase()} remembers this`, 'good');
    } else {
      g.changeRep(this.still, 3);
      g.recordEvent('raidloss', this.still.name);
      g.appendHistory(this.still.key, `the raid of day ${1 + Math.floor(g.worldT)} took ${this.deaths} soul${this.deaths === 1 ? '' : 's'}. the well keeps their designations.`);
      g.ui.toast(`${prefix}the raid is over, but ${this.still.name.toUpperCase()} buries ${this.deaths} of its own`, 'rust');
    }
  }

  update(dt) {
    const g = this.game;
    this.t -= dt;
    if (this.phase === 'warning') {
      if (Math.floor(this.t) % 3 === 0 && !this._rang) { g.audio.play('bell'); this._rang = true; }
      if (Math.floor(this.t) % 3 !== 0) this._rang = false;
      if (this.t <= 0) {
        this.phase = 'assault';
        this.t = 55;
        this.spawnWave(); this.wave = 1;
        g.ui.toast('RAIDERS AT THE WALL — the watch takes the gate', 'rust');
      }
      return;
    }
    // assault
    if (this.wave === 1 && this.t < 38) { this.spawnWave(); this.wave = 2; }
    this.raiders = this.raiders.filter(e => g.enemies.enemies.includes(e));
    if (this.raiders.length === 0 && this.wave >= 2) {
      this.finish(false);
    } else if (this.t <= 0) {
      // raiders that outlast the assault clock lose conviction and scatter —
      // but the raid still resolves, with everything that entails
      for (const e of this.raiders) { e.raider = false; e.state = 'wander'; }
      this.finish(true);
    }
  }
}

// ---------- the scheduler ----------
export class EventSystem {
  constructor(game) {
    this.game = game;
    this.active = [];
    this.nextRollT = 0;
    this.lastRaidT = -1;
    this.lastBloomT = -1;
  }

  get raidActive() { return this.active.some(e => e.kind === 'raid' && e.phase === 'assault'); }
  raidFor(stillKey) { return this.active.find(e => e.kind === 'raid' && e.still.key === stillKey); }

  update(dt) {
    const g = this.game;
    if (g.worldT > this.nextRollT) {
      this.nextRollT = g.worldT + 0.12; // a roll every ~58s of play
      this.maybeBegin();
    }
    for (let i = this.active.length - 1; i >= 0; i--) {
      const ev = this.active[i];
      ev.update(dt);
      if (ev.done) this.active.splice(i, 1);
    }
  }

  maybeBegin() {
    const g = this.game;
    const rand = new Rand((Math.random() * 0xffffffff) >>> 0);
    // --- bloom: in or near the red sand, now and then
    if (!this.active.some(e => e.kind === 'bloom') && g.worldT - this.lastBloomT > 0.35) {
      const biome = g.world.biomeAt(g.player.pos.x, g.player.pos.z);
      const nearNest = g.nests.auraAt(g.player.pos.x, g.player.pos.z);
      const chance = (biome.id === 'rustlands' ? 0.22 : 0.03) + (nearNest ? 0.2 : 0);
      if (rand.chance(chance)) {
        const a = rand.range(0, Math.PI * 2), d = rand.range(50, 110);
        this.active.push(new BloomEvent(g, g.player.pos.x + Math.sin(a) * d, g.player.pos.z + Math.cos(a) * d));
        this.lastBloomT = g.worldT;
        return;
      }
    }
    // --- raid: when you linger at a still, the nests take notice
    if (!this.active.some(e => e.kind === 'raid') && g.worldT - this.lastRaidT > 1.1) {
      const stills = g.stills.loadedStillsWithin(g.player.pos, 130);
      if (stills.length) {
        const s = stills[0];
        const nests = g.nests.nestsNear(s.x, s.z, 3500)
          .filter(n => !(g.destroyedNests && g.destroyedNests[n.key]));
        const chance = 0.05 + nests.length * 0.05;
        if (rand.chance(chance)) {
          this.lastRaidT = g.worldT;
          this.active.push(new RaidEvent(g, s));
        }
      }
    }
  }

  // debug / test hooks
  forceBloom(x, z) { const ev = new BloomEvent(this.game, x, z); this.active.push(ev); return ev; }
  forceRaid(still) { const ev = new RaidEvent(this.game, still); this.active.push(ev); return ev; }

  // a raider striking down a resident reports here
  noteDeath(stillKey) {
    const raid = this.raidFor(stillKey);
    if (raid) raid.deaths++;
  }
}
