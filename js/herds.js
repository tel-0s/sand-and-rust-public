// THE HERDS — the menagerie, moving. Wild machine herds migrate on pure
// schedules keyed to the SEASONS: they cross in the clear, shelter through
// the veil, walk home under the glass-wind, and winter in place through
// the long cold. Position is a pure function of (seed, worldT) — the same
// discipline as the caravan schedules; nothing is saved but what you did.
import { hash2, hash3, randFromHash } from './rng.js';
import { seasonAt, SEASON_LEN } from './seasons.js';

const HERD_CELL = 9000;   // one herd per ~9 km cell, sometimes
const LOAD_R = 700;
const UNLOAD_R = 950;

export class HerdManager {
  constructor(world, enemies, hooks = {}) {
    this.world = world;
    this.enemies = enemies;
    this.hooks = hooks;      // { onSighted(info) }
    this.loaded = new Map(); // key -> { info, members: [] }
    this.scanT = 0;
    this._force = null;      // workbench/test: { x, z, until }
  }

  // does a herd belong to this cell, and where does it walk?
  infoAt(hx, hz) {
    const rng = randFromHash(this.world.seed, hx * 37 + 11, hz * 37 + 29);
    if (!rng.chance(0.28)) return null;
    const ax = (hx + rng.range(0.2, 0.8)) * HERD_CELL;
    const az = (hz + rng.range(0.2, 0.8)) * HERD_CELL;
    const dir = rng.range(0, Math.PI * 2);
    const run = rng.range(9000, 14000);
    const bx = ax + Math.sin(dir) * run, bz = az + Math.cos(dir) * run;
    const size = rng.int(8, 13);
    return { key: hx + ',' + hz, ax, az, bx, bz, size, salt: hash2(this.world.seed, hx * 53 + 7, hz * 53 + 13) };
  }

  // the year carries the herd: clear = out, veil = graze at B,
  // glasswind = home, longcold = winter at A
  schedule(info, worldT) {
    const s = seasonAt(this.world.seed, worldT);
    const f = s.dayIn / SEASON_LEN;
    let frac, resting = false;
    if (s.id === 'clear') frac = f;
    else if (s.id === 'veil') { frac = 1; resting = true; }
    else if (s.id === 'glasswind') frac = 1 - f;
    else { frac = 0; resting = true; }
    return {
      x: info.ax + (info.bx - info.ax) * frac,
      z: info.az + (info.bz - info.az) * frac,
      resting, walking: !resting,
    };
  }

  // every herd whose cell is near (x,z) — pure query for gossip/tools
  herdsNear(x, z, radius) {
    const out = [];
    const c0x = Math.floor((x - radius) / HERD_CELL), c1x = Math.floor((x + radius) / HERD_CELL);
    const c0z = Math.floor((z - radius) / HERD_CELL), c1z = Math.floor((z + radius) / HERD_CELL);
    for (let hz = c0z; hz <= c1z; hz++) for (let hx = c0x; hx <= c1x; hx++) {
      const info = this.infoAt(hx, hz);
      if (info) out.push(info);
    }
    return out;
  }

  // is a herd (scheduled or forced) within r of (x,z)? caravans ask this
  nearSchedule(x, z, r, worldT) {
    if (this._force && worldT < this._force.until
      && Math.hypot(this._force.x - x, this._force.z - z) < r) return true;
    for (const info of this.herdsNear(x, z, r + HERD_CELL)) {
      const sc = this.schedule(info, worldT);
      if (Math.hypot(sc.x - x, sc.z - z) < r) return true;
    }
    return false;
  }

  update(dt, player, worldT) {
    this.scanT -= dt;
    if (this.scanT <= 0) {
      this.scanT = 1.1;
      for (const info of this.herdsNear(player.pos.x, player.pos.z, HERD_CELL * 1.2)) {
        if (this.loaded.has(info.key)) continue;
        const sc = this.schedule(info, worldT);
        if (Math.hypot(sc.x - player.pos.x, sc.z - player.pos.z) > LOAD_R) continue;
        this.load(info, sc);
      }
      if (this._force && worldT < this._force.until && !this.loaded.has('__forced')) {
        this.load({ key: '__forced', ax: this._force.x, az: this._force.z, bx: this._force.x, bz: this._force.z, size: 9, salt: 4242 }, { x: this._force.x, z: this._force.z, resting: true });
      }
    }
    for (const [key, h] of this.loaded) {
      const sc = key === '__forced' && this._force
        ? { x: this._force.x, z: this._force.z, resting: true }
        : this.schedule(h.info, worldT);
      const alive = h.members.filter(m => m.hp > 0);
      if (!alive.length || Math.hypot(sc.x - player.pos.x, sc.z - player.pos.z) > UNLOAD_R) {
        this.unload(key);
        continue;
      }
      // the herd drifts with its schedule; a wounded herd remembers
      let anyProvoked = false;
      for (const m of alive) if (m.provoked) anyProvoked = true;
      for (const m of alive) {
        if (m.provoked || m.state === 'chase') continue;
        if (anyProvoked && Math.hypot(m.pos.x - sc.x, m.pos.z - sc.z) < 30) m.provoked = true; // the stampede spreads
        const d = Math.hypot(sc.x - m.pos.x, sc.z - m.pos.z);
        if (d > (sc.resting ? 34 : 16)) {
          m.heading = Math.atan2(sc.x - m.pos.x, sc.z - m.pos.z);
          m.headingT = 2.5; // hold the line; don't re-roll a random walk
        }
      }
    }
  }

  load(info, sc) {
    const rng = randFromHash(this.world.seed, info.salt | 0, 641);
    const members = [];
    for (let i = 0; i < info.size; i++) {
      const kind = rng.chance(0.7) ? 'strider' : 'lurcher';
      const a = rng.range(0, Math.PI * 2), r = rng.range(4, 26);
      const e = this.enemies.spawnAt(kind, sc.x + Math.sin(a) * r, sc.z + Math.cos(a) * r, {
        tierMult: 1 + Math.min(1.6, Math.hypot(sc.x, sc.z) / 2200) + 0.3, // huntable, at a price
      });
      e.herdCalm = true;
      e.aggroR = 0; // the herd does not hunt; it walks (until provoked)
      members.push(e);
    }
    this.loaded.set(info.key, { info, members });
    if (this.hooks.onSighted) this.hooks.onSighted(info);
  }

  unload(key) {
    const h = this.loaded.get(key);
    if (!h) return;
    for (const m of h.members) {
      if (m.hp > 0) { const i = this.enemies.enemies.indexOf(m); if (i >= 0) this.enemies.remove(i); }
    }
    this.loaded.delete(key);
  }
}
