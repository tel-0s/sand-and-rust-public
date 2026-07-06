// THE HOLLOW PLACES — megastructure interiors.
// Every big ruin keeps a sealed threshold; step through and a warren of
// buried halls is grown on the spot from a room grammar keyed to the
// structure's type — now descending: stair galleries walk you down floor by
// floor (each step within STEP_UP, so the desert's own physics climbs them),
// and the deep rooms hold what the salvage crews never reached. The rooms
// are real geometry hoisted deep below the surface at the mega's own
// coordinates: no scene switch — the enclosure itself hides the desert, and
// the collision system carries the walls. The wind dies at the door.
//
// One hard rule: rooms never overlap in plan, even across floors — wall
// colliders are 2D footprints with tops but no bottoms, so an upper room
// above a lower one would fence the floor below with invisible walls.
import * as THREE from 'three';
import { hashString, randFromHash } from './rng.js';
import { GeoBuilder } from './structures.js';
import { makeBox } from './collision.js';

const BASE_DEPTH = 120;   // how far beneath the surface the top floor runs
const FLOOR_DROP = 8;     // vertical distance between floors
const DOOR_W = 5.0;       // doorway gap width — chunky frames deserve doors
const DOOR_H = 4.4;       // doorway opening height
const WALL_T = 0.7;       // wall thickness (inset fully inside each room)
const STEP_RISE = 0.42;   // < STEP_UP: stairs are just terrain that argues
const STEP_RUN = 0.68;

// palettes: [r,g,b] vertex colors, dark — the lamps do the talking
const FLOOR_C = [0.16, 0.14, 0.12];
const CEIL_C = [0.10, 0.09, 0.08];
const WALL_C = [0.20, 0.18, 0.15];
const WALL_C2 = [0.17, 0.16, 0.15];
const DEBRIS_C = [0.13, 0.12, 0.10];
const STEP_C = [0.19, 0.17, 0.13];

// each structure type implies a grammar of spaces
export const ROOM_GRAMMAR = {
  colossus: {
    entry: 'access wound', halls: ['plating gallery', 'actuator hall', 'coolant throat', 'ribcage span', 'servo crypt'],
    grand: ['the furnace hall', 'the ribvault'], deep: 'core shrine', floors: [2, 3],
  },
  spire: {
    entry: 'sunken lobby', halls: ['office warren', 'service floor', 'stair landing', 'archive row', 'atrium shaft'],
    grand: ['the grand atrium', 'the cistern hall'], deep: 'executive vault', floors: [2, 3],
  },
  dish: {
    entry: 'maintenance hatch', halls: ['operations bunker', 'signal archive', 'battery row', 'antenna root', 'listening chamber'],
    grand: ['the array crypt', 'the signal vault'], deep: 'the quiet room', floors: [2, 2],
  },
  ring: {
    entry: 'elevator terminus', halls: ['cargo hall', 'customs row', 'tether gallery', 'counterweight vault', 'departure lounge'],
    grand: ['the terminus concourse', 'the cargo vault'], deep: 'the last platform', floors: [2, 3],
  },
  launch: {
    entry: 'crew tunnel', halls: ['fuel gallery', 'telemetry row', 'cryo store', 'checkout bay', 'suit-up room'],
    grand: ['the integration hall', 'the flame trench'], deep: 'the countdown bunker', floors: [2, 3],
  },
  // THE COLOSSI: the old war's corpses keep their own architecture
  hand: {
    entry: 'wrist breach', halls: ['tendon gallery', 'knuckle span', 'hydraulic throat', 'armature crypt', 'cable warren'],
    grand: ['the palm chamber', 'the grip vault'], deep: 'the trigger room', floors: [2, 3],
  },
  head: {
    entry: 'jaw hatch', halls: ['optic gallery', 'cortex row', 'antenna root', 'gyro chamber', 'speech-box crawl'],
    grand: ['the mind hall', 'the command socket'], deep: 'the last thought', floors: [2, 3],
  },
  titan: {
    entry: 'waist hatch', halls: ['magazine row', 'coolant gut', 'crew gallery', 'ammunition lift', 'servo cathedral'],
    grand: ['the magazine', 'the gyro vault'], deep: 'the reactor shrine', floors: [3, 3],
  },
};

export class InteriorSystem {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.active = null;
    this.doors = new Map();     // mega key -> stairhead { meshes, x, z, key }
  }

  // ---------- thresholds: a stairhead blockhouse at every mega's foot ----------
  doorInfo(mega) {
    const rng = randFromHash(this.world.seed, hashString(mega.key) | 0, 991);
    const c = mega.colliders && mega.colliders[0];
    const cx = c ? c.x : mega.x, cz = c ? c.z : mega.z, cr = (c && c.r) ? c.r : 8;
    const a = rng.range(0, Math.PI * 2);
    return { x: cx + Math.sin(a) * (cr + 3.6), z: cz + Math.cos(a) * (cr + 3.6), rotY: a };
  }

  maintainDoors() {
    for (const [key, m] of this.world.megas) {
      if (!m || this.doors.has(key)) continue;
      const d = this.doorInfo(m);
      const y = this.world.getHeight(d.x, d.z);
      // a squat blockhouse big enough to plausibly hold the stairs it does hold
      const dark = new THREE.MeshLambertMaterial({ color: 0x1c1814 });
      const house = new THREE.Mesh(new THREE.BoxGeometry(6.8, 5.4, 6.8), dark);
      house.position.set(d.x, y + 2.3, d.z);
      house.rotation.y = d.rotY;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.6, 7.6), dark);
      roof.position.set(d.x, y + 5.1, d.z);
      roof.rotation.y = d.rotY;
      const fx = d.x + Math.sin(d.rotY) * 3.42, fz = d.z + Math.cos(d.rotY) * 3.42;
      const recess = new THREE.Mesh(new THREE.BoxGeometry(3.4, 4.4, 0.16),
        new THREE.MeshBasicMaterial({ color: 0x030302 }));
      recess.position.set(fx, y + 2, fz);
      recess.rotation.y = d.rotY;
      const seam = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.22, 0.18),
        new THREE.MeshBasicMaterial({ color: 0x2a6e5e }));
      seam.position.set(fx, y + 4.3, fz);
      seam.rotation.y = d.rotY;
      this.scene.add(house, roof, recess, seam);
      // the blockhouse is stone to the shoulder — but only on the surface:
      // it sits directly above the halls, and colliders have no bottoms
      const col = makeBox(d.x, d.z, 3.1, 3.1, d.rotY, y + 5.4, false);
      col.surfaceOnly = true;
      this.world.staticColliders.push(col);
      this.doors.set(key, { meshes: [house, roof, recess, seam], x: d.x, z: d.z, key, col });
    }
    for (const [key, door] of this.doors) {
      if (this.world.megas.get(key)) continue;
      for (const m of door.meshes) { this.scene.remove(m); m.geometry.dispose(); }
      if (door.col) this.world.staticColliders = this.world.staticColliders.filter(c => c !== door.col);
      this.doors.delete(key);
    }
  }

  doorNear(pos, r) {
    if (this.active) return null;
    for (const door of this.doors.values()) {
      if (Math.hypot(door.x - pos.x, door.z - pos.z) < r) return door;
    }
    return null;
  }

  exitNear(pos, r) {
    const a = this.active;
    if (!a) return null;
    return Math.hypot(a.exitSpot.x - pos.x, a.exitSpot.z - pos.z) < r ? a.exitSpot : null;
  }

  pileNear(pos, r) {
    const a = this.active;
    if (!a) return null;
    for (const p of a.piles) {
      if (!this.world.looted.has(p.id) && Math.hypot(p.x - pos.x, p.z - pos.z) < r) return p;
    }
    return null;
  }

  cacheNear(pos, r) {
    const a = this.active;
    if (!a || !a.cache || this.world.looted.has(a.cache.id)) return null;
    return Math.hypot(a.cache.x - pos.x, a.cache.z - pos.z) < r ? a.cache : null;
  }

  docNear(pos, r) {
    const a = this.active;
    if (!a) return null;
    for (const dd of a.docs) {
      if (!this.world.looted.has(dd.id) && Math.hypot(dd.x - pos.x, dd.z - pos.z) < r) return dd;
    }
    return null;
  }

  // ---------- the warren: floors of rooms, joined by stair galleries ----------
  layout(mega, rng) {
    const g = ROOM_GRAMMAR[mega.type] || ROOM_GRAMMAR.spire;
    const floorCount = rng.int(g.floors[0], g.floors[1]);
    const rooms = [];
    // strict interpenetration only, checked against EVERY floor (see header)
    const overlaps = (r) => rooms.some(o => r.x0 < o.x1 - 0.05 && r.x1 > o.x0 + 0.05 && r.z0 < o.z1 - 0.05 && r.z1 > o.z0 + 0.05);
    const mk = (cx, cz, w, d, kind, floorY, floor, h) => ({
      cx, cz, x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2,
      w, d, h: h ?? rng.range(9, 14), kind, floorY, floor, doors: [],
    });
    // try to place a room adjacent to `cur`; the doorway lives at doorY.
    // a room's reserved side (the entry's exit wall) never grows a doorway —
    // the way OUT must read as the way out, not as one more dark gap.
    const tryPlace = (cur, w, d, kind, floorY, floor, doorY, h, forceDir) => {
      let dirs = forceDir ? [forceDir] : [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => rng.range(-1, 1));
      if (cur.reserved) dirs = dirs.filter(([dx, dz]) => !(dx === cur.reserved[0] && dz === cur.reserved[1]));
      for (const [dx, dz] of dirs) {
        const ww = dx ? w : d, dd = dx ? d : w; // long axis follows the walk
        const cx = cur.cx + dx * (cur.w / 2 + ww / 2) + (dz ? rng.range(-2, 2) : 0);
        const cz = cur.cz + dz * (cur.d / 2 + dd / 2) + (dx ? rng.range(-2, 2) : 0);
        const r = mk(cx, cz, ww, dd, kind, floorY, floor, h);
        if (overlaps(r)) continue;
        const door = dx
          ? { axis: 'x', wallX: dx > 0 ? cur.x1 : cur.x0, at: (Math.max(cur.z0, r.z0) + Math.min(cur.z1, r.z1)) / 2, y: doorY }
          : { axis: 'z', wallZ: dz > 0 ? cur.z1 : cur.z0, at: (Math.max(cur.x0, r.x0) + Math.min(cur.x1, r.x1)) / 2, y: doorY };
        cur.doors.push(door);
        r.doors.push(door);
        r.dir = [dx, dz];
        rooms.push(r);
        return r;
      }
      return null;
    };
    const dig = (seed, count, floorY, floor) => {
      let cur = seed, made = 0, guard = 0;
      const pool = () => {
        const p = rooms.filter(o => o.floor === floor && o.kind !== '__stair');
        return p.length ? rng.pick(p) : seed;
      };
      while (made < count && guard++ < 80) {
        const big = rng.chance(0.3);
        const w = big ? rng.range(34, 48) : rng.range(18, 30);
        const d = big ? rng.range(30, 42) : rng.range(18, 30);
        const r = tryPlace(cur, w, d, rng.pick(g.halls), floorY, floor, floorY, big ? rng.range(13, 18) : undefined);
        if (!r) { cur = pool(); continue; }
        made++;
        cur = rng.chance(0.3) ? pool() : r;
      }
      return cur;
    };

    const entry = mk(mega.x, mega.z, rng.range(18, 24), rng.range(18, 24), g.entry, 0, 0);
    entry.reserved = rng.pick([[1, 0], [-1, 0], [0, 1], [0, -1]]); // the exit wall stays solid
    rooms.push(entry);
    let host = dig(entry, rng.int(3, 5), 0, 0);
    const stairLen = Math.ceil((FLOOR_DROP / STEP_RISE)) * STEP_RUN + 5;
    for (let f = 1; f < floorCount; f++) {
      const upperY = -(f - 1) * FLOOR_DROP, lowerY = -f * FLOOR_DROP;
      // the stair gallery: floor at the lower level, tall enough to reach the
      // upper doorway; the door from the host floor sits at the TOP of the
      // stairs. Stair + landing place atomically — a stair whose landing has
      // nowhere to go is rolled back, or the floor below would be unreachable.
      let stair = null, landing = null, tries = 0;
      while (!landing && tries++ < 14) {
        stair = tryPlace(host, stairLen, 11, '__stair', lowerY, f, upperY, FLOOR_DROP + 6.5);
        if (!stair) {
          host = rng.pick(rooms.filter(o => o.floor === f - 1 && o.kind !== '__stair'));
          continue;
        }
        landing = tryPlace(stair, rng.range(18, 26), rng.range(18, 26), rng.pick(g.halls), lowerY, f, lowerY, undefined, stair.dir);
        if (!landing) { rooms.pop(); host.doors.pop(); stair = null; }
      }
      if (!landing) break; // the collapse won: the building ends here
      host = dig(landing, rng.int(2, 4), lowerY, f);
      // the lower floors open up: vast halls greebled with dead machinery
      if (rng.chance(0.65)) {
        const hall = tryPlace(host, rng.range(50, 72), rng.range(40, 58),
          rng.pick(g.grand || g.halls), lowerY, f, lowerY, rng.range(19, 26));
        if (hall) { hall.grand = true; host = hall; }
      }
    }
    // the deep room is a grand hall at the end of the deepest floor
    const lastFloor = Math.max(...rooms.map(r => r.floor));
    const hostPool = rooms.filter(r => r.floor === lastFloor && r.kind !== '__stair');
    let deep = null;
    for (let t = 0; t < 10 && !deep; t++) {
      deep = tryPlace(rng.pick(hostPool), rng.range(46, 64), rng.range(40, 54),
        g.deep, -lastFloor * FLOOR_DROP, lastFloor, -lastFloor * FLOOR_DROP, rng.range(19, 26));
    }
    if (deep) deep.grand = true;
    else {
      // the collapse won that fight too: promote the farthest ordinary room
      const pool = hostPool.filter(r => r !== entry);
      if (pool.length) pool[pool.length - 1].kind = g.deep;
    }
    return rooms;
  }

  // one wall of one room, split around its doorway gaps (which may sit above
  // the room's own floor — that's how the stair galleries meet the upper level)
  buildWall(gb, cols, jambs, room, side, baseY) {
    const h = room.h, floorAbs = baseY + room.floorY;
    const horiz = side === 'n' || side === 's'; // wall runs along x
    const fixed = side === 'n' ? room.z0 + WALL_T / 2 : side === 's' ? room.z1 - WALL_T / 2
      : side === 'w' ? room.x0 + WALL_T / 2 : room.x1 - WALL_T / 2;
    const lo = horiz ? room.x0 : room.z0, hi = horiz ? room.x1 : room.z1;
    const plane = side === 'n' ? room.z0 : side === 's' ? room.z1 : side === 'w' ? room.x0 : room.x1;
    const gaps = room.doors
      .filter(dr => (horiz ? dr.axis === 'z' && Math.abs(dr.wallZ - plane) < 0.01 : dr.axis === 'x' && Math.abs(dr.wallX - plane) < 0.01))
      .sort((a, b) => a.at - b.at);
    const spans = [];
    let c = lo;
    for (const gp of gaps) {
      spans.push([c, Math.max(c, gp.at - DOOR_W / 2)]);
      c = Math.min(hi, gp.at + DOOR_W / 2);
      const gapY = baseY + gp.y;
      const lx = horiz ? gp.at : fixed, lz = horiz ? fixed : gp.at;
      // panel below an elevated doorway: solid, standable — it is the landing's riser
      if (gp.y - room.floorY > 0.1) {
        const ph = gapY - floorAbs;
        gb.addBox(lx, floorAbs + ph / 2, lz, horiz ? DOOR_W : WALL_T, ph, horiz ? WALL_T : DOOR_W, WALL_C2);
        cols.push(makeBox(lx, lz, (horiz ? DOOR_W : WALL_T) / 2, (horiz ? WALL_T : DOOR_W) / 2, 0, gapY, true));
      }
      // lintel from door height to this room's ceiling
      const lh = (floorAbs + h) - (gapY + DOOR_H);
      if (lh > 0.1) gb.addBox(lx, gapY + DOOR_H + lh / 2, lz, horiz ? DOOR_W : WALL_T, lh, horiz ? WALL_T : DOOR_W, WALL_C2);
      // glowing jambs: a doorway must be readable in the dark — they protrude
      // past both wall faces so no angle hides them
      jambs.push(
        { x: horiz ? gp.at - DOOR_W / 2 - 0.12 : fixed, z: horiz ? fixed : gp.at - DOOR_W / 2 - 0.12, y: gapY, horiz },
        { x: horiz ? gp.at + DOOR_W / 2 + 0.12 : fixed, z: horiz ? fixed : gp.at + DOOR_W / 2 + 0.12, y: gapY, horiz });
    }
    spans.push([c, hi]);
    for (const [a, b] of spans) {
      if (b - a < 0.2) continue;
      const mid = (a + b) / 2, len = b - a;
      const wx = horiz ? mid : fixed, wz = horiz ? fixed : mid;
      gb.addBox(wx, floorAbs + h / 2, wz, horiz ? len : WALL_T, h, horiz ? WALL_T : len, WALL_C);
      cols.push(makeBox(wx, wz, (horiz ? len : WALL_T) / 2, (horiz ? WALL_T : len) / 2, 0, floorAbs + h, false));
    }
  }

  build(mega) {
    const rng = randFromHash(this.world.seed, hashString(mega.key) | 0, 4177);
    const baseY = mega.y - BASE_DEPTH;
    const rooms = this.layout(mega, rng);
    const grammar = ROOM_GRAMMAR[mega.type] || ROOM_GRAMMAR.spire;
    const gb = new GeoBuilder();
    const cols = [], jambs = [], spawnSpots = [];
    const group = new THREE.Group();
    const maxFloor = Math.max(...rooms.map(r => r.floor));
    for (const room of rooms) {
      const floorAbs = baseY + room.floorY;
      // some grand halls open into CHASMS: the floor drops away under a
      // bridge (a collider with a real bottom — stand on it, walk under it),
      // a debris stair climbs back out, and the dark below holds its own
      room.chasm = !!room.grand && room.w > 30 && room.d > 24 && rng.chance(0.5);
      if (room.chasm) {
        const PIT_D = 6.5, RIM = 3.6;
        const px0 = room.x0 + RIM, px1 = room.x1 - RIM, pz0 = room.z0 + RIM, pz1 = room.z1 - RIM;
        const pitY = floorAbs - PIT_D;
        // rim ring (four slabs, standable at hall level)
        const rims = [
          [room.cx, (room.z0 + pz0) / 2, room.w / 2, RIM / 2],
          [room.cx, (pz1 + room.z1) / 2, room.w / 2, RIM / 2],
          [(room.x0 + px0) / 2, (pz0 + pz1) / 2, RIM / 2, (pz1 - pz0) / 2],
          [(px1 + room.x1) / 2, (pz0 + pz1) / 2, RIM / 2, (pz1 - pz0) / 2],
        ];
        for (const [rx, rz, hw, hd] of rims) {
          gb.addBox(rx, floorAbs - 0.35, rz, hw * 2, 0.7, hd * 2, FLOOR_C);
          cols.push(makeBox(rx, rz, hw, hd, 0, floorAbs, true));
        }
        // pit walls (visual) + pit floor (walkable, darker)
        gb.addBox(room.cx, pitY + PIT_D / 2 - 0.35, (room.z0 + pz0) / 2 + RIM / 4, room.w, PIT_D, 0.5, WALL_C2);
        gb.addBox(room.cx, pitY + PIT_D / 2 - 0.35, (pz1 + room.z1) / 2 - RIM / 4, room.w, PIT_D, 0.5, WALL_C2);
        gb.addBox((room.x0 + px0) / 2 + RIM / 4, pitY + PIT_D / 2 - 0.35, room.cz, 0.5, PIT_D, room.d, WALL_C2);
        gb.addBox((px1 + room.x1) / 2 - RIM / 4, pitY + PIT_D / 2 - 0.35, room.cz, 0.5, PIT_D, room.d, WALL_C2);
        gb.addBox(room.cx, pitY - 0.35, room.cz, room.w - RIM, 0.7, room.d - RIM, [0.1, 0.09, 0.08]);
        cols.push(makeBox(room.cx, room.cz, (room.w - RIM) / 2, (room.d - RIM) / 2, 0, pitY, true));
        // the bridge: spans the long axis at hall level, 2.8 wide
        const alongX = room.w >= room.d;
        const bw = alongX ? (px1 - px0) / 2 : 1.4, bd = alongX ? 1.4 : (pz1 - pz0) / 2;
        gb.addBox(room.cx, floorAbs - 0.3, room.cz, bw * 2, 0.6, bd * 2, FLOOR_C);
        cols.push(makeBox(room.cx, room.cz, bw, bd, 0, floorAbs, true, floorAbs - 0.6));
        // glow studs at the bridge ends: readable in the dark
        for (const e of [-1, 1]) {
          const sx2 = alongX ? room.cx + e * (bw - 0.5) : room.cx + 1.2;
          const sz2 = alongX ? room.cz + 1.2 : room.cz + e * (bd - 0.5);
          const stud = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.14, 0.3),
            new THREE.MeshBasicMaterial({ color: 0x8a6c2e }));
          stud.position.set(sx2, floorAbs + 0.1, sz2);
          group.add(stud);
        }
        // a debris stair out of the dark, along one pit wall
        const nSt = Math.ceil(PIT_D / 0.42);
        const stx = px0 + 1.1;
        for (let k = 1; k <= nSt; k++) {
          const top = pitY + (k / nSt) * PIT_D;
          const sz3 = pz1 - 1.0 - (k - 0.5) * 0.9;
          gb.addBox(stx, (pitY + top) / 2, sz3, 2.0, top - pitY, 0.95, STEP_C);
          cols.push(makeBox(stx, sz3, 1.0, 0.5, 0, top, true));
        }
        gb.addBox(room.cx, floorAbs + room.h + 0.35, room.cz, room.w + 0.8, 0.7, room.d + 0.8, CEIL_C);
        for (const side of ['n', 's', 'w', 'e']) this.buildWall(gb, cols, jambs, room, side, baseY);
        continue;
      }
      gb.addBox(room.cx, floorAbs - 0.35, room.cz, room.w, 0.7, room.d, FLOOR_C);
      cols.push(makeBox(room.cx, room.cz, room.w / 2, room.d / 2, 0, floorAbs, true));
      gb.addBox(room.cx, floorAbs + room.h + 0.35, room.cz, room.w + 0.8, 0.7, room.d + 0.8, CEIL_C);
      for (const side of ['n', 's', 'w', 'e']) this.buildWall(gb, cols, jambs, room, side, baseY);

      if (room.kind === '__stair') {
        // steps descend from the elevated door toward the far end
        const [dx, dz] = room.dir || [1, 0];
        const n = Math.ceil(FLOOR_DROP / STEP_RISE);
        const startX = dx > 0 ? room.x0 : dx < 0 ? room.x1 : room.cx;
        const startZ = dz > 0 ? room.z0 : dz < 0 ? room.z1 : room.cz;
        for (let k = 1; k <= n; k++) {
          const top = floorAbs + FLOOR_DROP - k * STEP_RISE;
          const along = WALL_T + (k - 0.5) * STEP_RUN;
          const sx = dx ? startX + dx * along : room.cx;
          const sz = dz ? startZ + dz * along : room.cz;
          const cw = (dx ? room.d : room.w) - 1.4;
          gb.addBox(sx, (floorAbs + top) / 2, sz, dx ? STEP_RUN : cw, Math.max(0.3, top - floorAbs), dx ? cw : STEP_RUN, STEP_C);
          cols.push(makeBox(sx, sz, (dx ? STEP_RUN : cw) / 2, (dx ? cw : STEP_RUN) / 2, 0, top, true));
        }
        // the stairwell is lit — descending into darkness is a choice the
        // deep rooms make, not the stairs
        const strip = new THREE.Mesh(new THREE.BoxGeometry(dx ? room.w - 2 : 0.34, 0.12, dz ? room.d - 2 : 0.34),
          new THREE.MeshBasicMaterial({ color: 0x8a6c2e }));
        strip.position.set(room.cx, floorAbs + room.h - 0.2, room.cz);
        group.add(strip);
        const well = new THREE.PointLight(0xd8a050, 0.9, Math.max(room.w, room.d) * 1.8);
        well.position.set(room.cx, floorAbs + FLOOR_DROP * 0.6, room.cz);
        group.add(well);
        // nosing strips every few steps so the descent reads step by step
        for (let k = 3; k <= n; k += 4) {
          const top = floorAbs + FLOOR_DROP - k * STEP_RISE;
          const along = WALL_T + (k - 1) * STEP_RUN;
          const nx = dx ? startX + dx * along : room.cx;
          const nz = dz ? startZ + dz * along : room.cz;
          const nose = new THREE.Mesh(new THREE.BoxGeometry(dx ? 0.12 : (room.w - 1.6), 0.06, dx ? (room.d - 1.6) : 0.12),
            new THREE.MeshBasicMaterial({ color: 0x6e5a28 }));
          nose.position.set(nx, top + 0.04, nz);
          group.add(nose);
        }
        continue;
      }

      // rubble and dead machinery: the rooms are furnished by collapse
      const junk = rng.int(0, room.w > 15 ? 4 : 2);
      for (let j = 0; j < junk; j++) {
        const jx = rng.range(room.x0 + 2.6, room.x1 - 2.6), jz = rng.range(room.z0 + 2.6, room.z1 - 2.6);
        const jw = rng.range(1.2, 4), jh = rng.range(0.8, 2.6), jd = rng.range(1.2, 4);
        const jrot = rng.range(0, 3);
        gb.addBox(jx, floorAbs + jh / 2, jz, jw, jh, jd, DEBRIS_C, jrot);
        // the collider wears the same rotation and depth as the box it guards
        cols.push(makeBox(jx, jz, jw / 2, jd / 2, jrot, floorAbs + jh, true));
      }
      // grand halls: columns to the ceiling, dead machinery of unknown purpose,
      // gantries overhead — vast, and furnished by whatever worked here once
      if (room.grand) {
        const nc = rng.int(9, 14);
        for (let k = 0; k < nc; k++) {
          const px = rng.range(room.x0 + 5, room.x1 - 5), pz = rng.range(room.z0 + 5, room.z1 - 5);
          if (Math.abs(px - room.cx) < 8 && Math.abs(pz - room.cz) < 8) continue; // keep the heart open
          gb.addBox(px, floorAbs + room.h / 2, pz, 2.2, room.h, 2.2, WALL_C2);
          cols.push(makeBox(px, pz, 1.1, 1.1, 0, floorAbs + room.h, false));
        }
        const nm = rng.int(7, 12);
        for (let k = 0; k < nm; k++) {
          const px = rng.range(room.x0 + 4, room.x1 - 4), pz = rng.range(room.z0 + 4, room.z1 - 4);
          const mw = rng.range(3, 8), mh = rng.range(2.5, room.h * 0.5), md = rng.range(3, 8);
          const mrot = rng.range(0, 3);
          gb.addBox(px, floorAbs + mh / 2, pz, mw, mh, md, DEBRIS_C, mrot);
          cols.push(makeBox(px, pz, mw / 2, md / 2, mrot, floorAbs + mh, true));
        }
        for (let k = 0; k < 3; k++) {
          const gy = floorAbs + room.h * rng.range(0.5, 0.72);
          const across = rng.chance(0.5);
          gb.addBox(room.cx + rng.range(-6, 6), gy, room.cz + rng.range(-6, 6),
            across ? room.w - 5 : 2.4, 0.7, across ? 2.4 : room.d - 5, WALL_C);
        }
        const lamp2 = new THREE.PointLight(0xd8a050, 0.7, Math.max(room.w, room.d) * 1.5);
        lamp2.position.set(rng.range(room.x0 + 4, room.x1 - 4), floorAbs + room.h - 1.4, rng.range(room.z0 + 4, room.z1 - 4));
        group.add(lamp2);
      }
      // a dim lamp strip still draws on some deep reserve; deeper runs redder
      const lit = room.grand || rng.chance(0.8);
      if (lit) {
        const deepC = room.kind === grammar.deep ? 0x8a3c2a : [0x6e5a28, 0x6a4e24, 0x64381e][Math.min(2, room.floor)];
        const strip = new THREE.Mesh(new THREE.BoxGeometry(Math.min(8, room.w * 0.4), 0.16, 0.7),
          new THREE.MeshBasicMaterial({ color: deepC }));
        strip.position.set(room.cx, floorAbs + room.h - 0.15, room.cz);
        group.add(strip);
        const lamp = new THREE.PointLight(0xd8a050, 0.85, Math.max(room.w, room.d) * 1.6);
        lamp.position.set(room.cx, floorAbs + room.h - 0.8, room.cz);
        group.add(lamp);
      }
      room.lit = lit;
      // the deeper halls keep their own: spawn spots for the things that never left
      if (room !== rooms[0] && (room.floor > 0 || rng.chance(0.4))) {
        spawnSpots.push({ x: room.cx, z: room.cz, depth: room.floor, floorY: room.floorY, roomKind: room.kind });
      }
    }
    // glowing doorjambs — every connection readable in the dark
    const jambH = new THREE.BoxGeometry(0.22, DOOR_H - 0.6, WALL_T + 0.4);
    const jambV = new THREE.BoxGeometry(WALL_T + 0.4, DOOR_H - 0.6, 0.22);
    const jambMat = new THREE.MeshBasicMaterial({ color: 0x9a7530 });
    for (const j of jambs) {
      const m = new THREE.Mesh(j.horiz ? jambH : jambV, jambMat);
      m.position.set(j.x, j.y + (DOOR_H - 0.6) / 2 + 0.2, j.z);
      group.add(m);
    }

    // scrap where the salvage crews never reached — richer with every floor down
    const piles = [];
    const pileRooms = rooms.filter(r => r !== rooms[0] && r.kind !== '__stair' && rng.chance(0.5)).slice(0, 5);
    for (let i = 0; i < pileRooms.length; i++) {
      const room = pileRooms[i];
      const mgn = room.chasm ? 5.5 : 2.4; // chasm piles must land IN the pit
      const px = rng.range(room.x0 + mgn, room.x1 - mgn), pz = rng.range(room.z0 + mgn, room.z1 - mgn);
      const m = new THREE.Mesh(new THREE.ConeGeometry(1.05, 1.2, 5),
        new THREE.MeshLambertMaterial({ color: 0x6b5a3a, emissive: 0x241a08 }));
      // in a chasm hall the scrap fell where everything falls: the pit floor
      m.position.set(px, baseY + room.floorY + (room.chasm ? -6.5 : 0) + 0.6, pz);
      // what was taken stays taken: the looted ledger gates the mesh too
      m.visible = !this.world.looted.has(`int:${mega.key}:${i}`);
      group.add(m);
      piles.push({ id: `int:${mega.key}:${i}`, x: px, z: pz, mesh: m, room: room.kind, depth: room.floor });
    }
    // the sealed cache in the deep room: a real part, worth the descent
    let cache = null;
    const deepRoom = rooms.find(r => r.kind === grammar.deep);
    if (deepRoom) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.3, 1.1),
        new THREE.MeshLambertMaterial({ color: 0x2a5548, emissive: 0x123328 }));
      m.position.set(deepRoom.cx + 3, baseY + deepRoom.floorY + 0.65, deepRoom.cz - 3);
      m.visible = !this.world.looted.has(`int:${mega.key}:deep`);
      group.add(m);
      cache = { id: `int:${mega.key}:deep`, x: deepRoom.cx + 3, z: deepRoom.cz - 3, mesh: m, room: deepRoom.kind, depth: deepRoom.floor };
    }
    // testimony about THIS building, left in its own halls
    const docs = [];
    const docRooms = rooms.filter(r => r !== rooms[0] && r.kind !== '__stair').sort(() => rng.range(-1, 1)).slice(0, 2);
    for (let i = 0; i < docRooms.length; i++) {
      const room = docRooms[i];
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.6, 0.2),
        new THREE.MeshBasicMaterial({ color: 0x1f5548 }));
      m.position.set(room.cx - 3.5, baseY + room.floorY + 0.85, room.cz + 3.5);
      m.visible = !this.world.looted.has(`int:${mega.key}:doc${i}`);
      group.add(m);
      docs.push({ id: `int:${mega.key}:doc${i}`, x: room.cx - 3.5, z: room.cz + 3.5, mesh: m, roomKind: room.kind, salt: hashString(mega.key) + i * 131 });
    }

    const mesh = new THREE.Mesh(gb.build(), new THREE.MeshLambertMaterial({ vertexColors: true }));
    mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    group.add(mesh);
    // the way back out: a glowing seam on the entry room's reserved wall,
    // which layout() guarantees is solid
    const entry = rooms[0];
    const free = { '1,0': 'e', '-1,0': 'w', '0,1': 's', '0,-1': 'n' }[entry.reserved.join(',')] || 'n';
    const ex = {
      n: { x: entry.cx, z: entry.z0 + 2.2, sx: entry.cx, sz: entry.z0 + WALL_T + 0.12 },
      s: { x: entry.cx, z: entry.z1 - 2.2, sx: entry.cx, sz: entry.z1 - WALL_T - 0.12 },
      w: { x: entry.x0 + 2.2, z: entry.cz, sx: entry.x0 + WALL_T + 0.12, sz: entry.cz },
      e: { x: entry.x1 - 2.2, z: entry.cz, sx: entry.x1 - WALL_T - 0.12, sz: entry.cz },
    }[free];
    const exitSpot = { x: ex.x, z: ex.z, label: 'the threshold' };
    const seam = new THREE.Mesh(new THREE.BoxGeometry(free === 'n' || free === 's' ? 3.6 : 0.22, 5, free === 'n' || free === 's' ? 0.22 : 3.6),
      new THREE.MeshBasicMaterial({ color: 0x2a6e5e }));
    seam.position.set(ex.sx, baseY + 2.5, ex.sz);
    group.add(seam);
    return { rooms, cols, group, exitSpot, piles, cache, docs, spawnSpots, baseY, deepRoom };
  }

  enter(mega, player) {
    if (this.active) return null;
    const built = this.build(mega);
    this.scene.add(built.group);
    this.world.staticColliders.push(...built.cols);
    this.world.groundOverride = built.baseY - Math.max(...built.rooms.map(r => -r.floorY)) - 40;
    this.active = {
      mega, group: built.group, colliders: built.cols, rooms: built.rooms,
      exitSpot: built.exitSpot, piles: built.piles, cache: built.cache,
      docs: built.docs, spawnSpots: built.spawnSpots, baseY: built.baseY,
      deepRoom: built.deepRoom,
      outsidePos: { x: player.pos.x, y: player.pos.y, z: player.pos.z },
    };
    const entry = built.rooms[0];
    // stand ON the floor for every gait: pos.y is baseY above the ground
    // (tracked/hover carry high hulls — placing them at floor+0.1 put their
    // computed feet BELOW the slab, so supportY rejected it and they fell)
    player.pos.set(entry.cx, built.baseY + (player.baseY || 0) + 0.05, entry.cz);
    player.vel.set(0, 0, 0);
    player.grounded = true;
    return this.active;
  }

  exit(player, teleportBack = true) {
    const a = this.active;
    if (!a) return;
    this.scene.remove(a.group);
    a.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    this.world.staticColliders = this.world.staticColliders.filter(c => !a.colliders.includes(c));
    this.world.groundOverride = null;
    if (teleportBack && player) {
      player.pos.set(a.outsidePos.x, a.outsidePos.y + 0.05, a.outsidePos.z);
      player.vel.set(0, 0, 0);
      player.grounded = true;
    }
    this.active = null;
  }
}
