// World events: discrete happenings with a lifecycle — forecast, onset,
// active, resolution — scheduled on world-time. Sandstorms were the first of
// this kind (they keep their own engine); here live the rest: Rust blooms
// boiling out of the red sand, and raids breaking against settlement walls.
import * as THREE from 'three';
import { Rand } from './rng.js';
import { bearingWord } from './lore.js';

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
    if (pd < this.r) {
      g.player.corruption = Math.min(100, g.player.corruption + (7 / 60) * dt);
      // sanctuary for the third body: under the dome, the red sand mends kin
      if (g.embrace !== null && g.embrace >= 3) {
        g.player.hull = Math.min(g.player.stats.maxHull, g.player.hull + 2.5 * dt);
      }
    }
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
  constructor(game, still, opts = {}) {
    this.game = game;
    this.kind = 'raid';
    this.still = still;
    // THE SIEGE: a war-front's arrival fights on this same chassis, scaled
    // up — more waves, bigger waves, and they press from the road the
    // column walked, not from everywhere at once
    this.war = opts.war || null;
    this.totalWaves = this.war ? 3 + Math.min(3, Math.floor(this.war.strength / 4)) : 2;
    this.waveGap = this.war ? 20 : 17;
    this.assaultT = 20 + this.totalWaves * this.waveGap;
    // funded walls blunt the teeth: raiders arrive weaker where the
    // keeper paid for stone (-8% tier per wall course)
    const wk = game.stakeWorks && game.stakeWorks[still.key];
    const br = (game.worksBroken && game.worksBroken[still.key]) || {};
    const walls = wk ? Math.max(0, (wk.walls || 0) - (br.walls || 0)) : 0;
    this.wallSoften = walls ? 1 - 0.08 * walls : 1;
    // THE COVETING in person: a worthy stake draws a bigger march
    this.covetBonus = game.stakeWorth && game.stake && game.stake.key === still.key
      ? Math.min(3, Math.floor(game.stakeWorth(still.key) / 4)) : 0;
    this.phase = 'warning';
    this.t = 12; // seconds of warning bell
    this.wave = 0;
    this.raiders = [];
    this.deaths = 0;
    this.done = false;
    game.audio.play('bell');
    game.ui.toast(this.war
      ? `THE COLUMN IS AT THE WALL OF ${still.name.toUpperCase()} — SIEGE`
      : `THE BELL AT ${still.name.toUpperCase()} — machines sighted. RAID INCOMING`, 'rust');
  }

  spawnWave() {
    const g = this.game, s = this.still;
    // a siege wave is sized to what survived the road: strength feeds it,
    // every second escort dropped on the march starves it
    const warBonus = this.war
      ? Math.max(0, Math.floor(this.war.strength / 3) - Math.floor((this.war.escortsKilled || 0) / 2)) : 0;
    const n = Math.min(9, (this.wave === 0 ? 4 : 3) + (this.covetBonus || 0) + warBonus);
    // raiders come sized for the settlement, not for you: a frontier still
    // faces frontier machines, but the walls stay defensible
    const stillTier = 1 + Math.min(1.2, Math.hypot(s.x, s.z) / 2600);
    for (let i = 0; i < n; i++) {
      // war waves press from the road the column walked; mere raids swarm
      const a = this.war ? this.war.angle + (Math.random() - 0.5) * 1.2 : Math.random() * Math.PI * 2;
      const r = 60 + Math.random() * 25;
      const kind = Math.random() < 0.5 ? 'scrabbler' : (Math.random() < 0.65 ? 'dervish' : 'rustform');
      const e = g.enemies.spawnAt(kind, s.x + Math.sin(a) * r, s.z + Math.cos(a) * r,
        { infected: Math.random() < 0.6, raider: true, aggro: true, tierMult: stillTier * this.wallSoften });
      this.raiders.push(e);
    }
    if (this.war && this.wave > 0) {
      g.audio.play('bell');
      g.ui.toast(`WAVE ${this.wave + 1} OF ${this.totalWaves} — from the ${bearingWord(Math.sin(this.war.angle), Math.cos(this.war.angle))}`, 'rust');
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
      g.rootStory('story:raid:' + this.still.key + ':' + Math.floor(g.worldT), 'wall',
        `when the nests came for ${this.still.name}, the walker stood the wall, and nothing was lost.`,
        { stills: [this.still] });
      g.appendHistory(this.still.key, `the raid of day ${1 + Math.floor(g.worldT)} broke against the wall. no souls lost. a wanderer stood with the watch.`);
      g.audio.play('chime');
      g.ui.toast(`${prefix.toUpperCase()}THE WALL HELD, NOTHING LOST — ${this.still.name.toUpperCase()} remembers this`, 'good');
    } else {
      g.changeRep(this.still, 3);
      g.recordEvent('raidloss', this.still.name);
      g.appendHistory(this.still.key, `the raid of day ${1 + Math.floor(g.worldT)} took ${this.deaths} soul${this.deaths === 1 ? '' : 's'}. the well keeps their designations.`);
      g.ui.toast(`${prefix}the raid is over, but ${this.still.name.toUpperCase()} buries ${this.deaths} of its own`, 'rust');
    }
    // a war-siege's outcome decides the front's whole story
    if (this.war) g.warSys.onSiegeResolved(this);
  }

  update(dt) {
    const g = this.game;
    this.t -= dt;
    if (this.phase === 'warning') {
      if (Math.floor(this.t) % 3 === 0 && !this._rang) { g.audio.play('bell'); this._rang = true; }
      if (Math.floor(this.t) % 3 !== 0) this._rang = false;
      if (this.t <= 0) {
        this.phase = 'assault';
        this.t = this.assaultT;
        this.spawnWave(); this.wave = 1;
        g.ui.toast(this.war ? 'THE SIEGE BEGINS — the watch takes the wall' : 'RAIDERS AT THE WALL — the watch takes the gate', 'rust');
      }
      return;
    }
    // assault — a siege you walk away from resolves without you, on paper
    if (this.war && Math.hypot(g.player.pos.x - this.still.x, g.player.pos.z - this.still.z) > 520) {
      for (const e of this.raiders) { e.raider = false; e.state = 'wander'; }
      this.done = true;
      g.warSys.onSiegeAbandoned(this);
      return;
    }
    if (this.wave < this.totalWaves && this.t < this.assaultT - this.wave * this.waveGap) {
      this.spawnWave(); this.wave++;
    }
    this.raiders = this.raiders.filter(e => g.enemies.enemies.includes(e));
    if (this.raiders.length === 0 && this.wave >= this.totalWaves) {
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

  // the war comes to a wall you're standing on: a front-sized raid, on
  // demand (THE MARCH). bonus raiders per wave, on top of the covet math;
  // opts.war turns the chassis into a full siege (waves, direction, stakes).
  beginRaid(still, bonus = 0, war = null) {
    if (this.active.some(e => e.kind === 'raid')) return null;
    const ev = new RaidEvent(this.game, still, { war });
    ev.covetBonus = Math.max(ev.covetBonus || 0, bonus);
    this.lastRaidT = this.game.worldT;
    this.raidGrace = { key: still.key, t: this.game.worldT };
    this.active.push(ev);
    return ev;
  }

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
    if (!this.active.some(e => e.kind === 'raid') && g.worldT - this.lastRaidT > 2.2) {
      // nests raid for salvage and spite — an abandoned still offers neither
      const stills = g.stills.loadedStillsWithin(g.player.pos, 130)
        .filter(s => ((g.stillStates[s.key] && g.stillStates[s.key].stage) || 0) > -2)
        // a still that just bled has nothing worth a second march yet
        .filter(s => !(this.raidGrace && this.raidGrace.key === s.key && g.worldT - this.raidGrace.t < 2.5))
        // THE MARCH owns its target: while a front aims at a still, the
        // nests are massing or marching, not freelancing — no ambient raids
        // muddying the war (they collided: the siege fell to paper while
        // the player fought the wrong battle at the same wall)
        .filter(s => !(g.war && g.war.front && g.war.front.stillKey === s.key));
      if (stills.length) {
        const s = stills[0];
        const nests = g.nests.nestsNear(s.x, s.z, 3500)
          .filter(n => !(g.destroyedNests && g.destroyedNests[n.key]));
        // pressure comes FROM the nests: no nests nearby, almost no raids
        const chance = nests.length ? Math.min(0.12, 0.02 + nests.length * 0.02) : 0.006; // saturates: nest country is dangerous, not inescapable
        if (rand.chance(chance)) {
          this.lastRaidT = g.worldT;
          this.raidGrace = { key: s.key, t: g.worldT };
          this.active.push(new RaidEvent(g, s));
        }
      }
    }
    // --- the hunt: the white ground answers the deeply blooming
    this.maybeHunt(g, rand);
  }

  maybeHunt(g, rand) {
    if (g.embrace === null) return;
    // THE WEAVE: the hunt follows the stories. Ordinarily the monks move
    // at Bloom II — but if a bloom-story has reached a monastic still,
    // they know EARLIER (Bloom I) and they come more often.
    const bloomHeard = g.stories.some(s =>
      (s.kind === 'bloom') && Object.keys(s.roots).some(k => {
        if (k === '*') return true;
        const st = g.resolveStillByKey(k);
        return st && st.temperament === 'monastic';
      }));
    if (g.embrace < (bloomHeard ? 1 : 2)) return;
    if (g.worldT - (this.lastHuntT ?? -9) < (bloomHeard ? 1.2 : 1.6)) return;
    if (g.interiors.active) return;
    const p = g.player.pos;
    for (const sz of g.enemies.safeZones) {
      if (Math.hypot(p.x - sz.x, p.z - sz.z) < sz.r + 30) return; // they wait past the walls
    }
    if (!rand.chance(0.05)) return;
    this.lastHuntT = g.worldT;
    const a = rand.range(0, Math.PI * 2);
    const names = ['Brother Ilex', 'Sister Vane', 'Brother Ossic', 'Sister Halyard', 'Brother Pale-Enough', 'Sister Marrow'];
    const picked = [];
    for (let i = 0; i < 2; i++) {
      let nm = rand.pick(names);
      while (picked.includes(nm)) nm = rand.pick(names);
      picked.push(nm);
      const hx = p.x + Math.sin(a + i * 0.4) * 85, hz = p.z + Math.cos(a + i * 0.4) * 85;
      const h = g.enemies.spawnAt('huntermonk', hx, hz, {
        tierMult: 1 + Math.min(1.3, g.embrace * 0.35), aggro: true, raider: true,
        name: `${nm} of the White Ground`,
      });
      h.aggroR = 400;
    }
    g.audio.play('bell');
    g.ui.toast('THE WHITE GROUND SENT HUNTERS — they have your gait', 'rust');
    g.journal.push({
      type: 'lore', cat: 'event', title: 'HUNTERS ON THE SALT',
      body: `on day ${1 + Math.floor(g.worldT)} the monks sent ${picked.join(' and ')} to unmake what you are becoming. the desert will decide whose prayer holds.`,
    });
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
