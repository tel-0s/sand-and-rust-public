// Procedural structure geometry. Everything is boxes pushed into one merged
// BufferGeometry per chunk (or per megastructure) — vertex colours, no textures.
import * as THREE from 'three';
import { makeBox, makeCircle } from './collision.js';

export class GeoBuilder {
  constructor() { this.pos = []; this.nrm = []; this.col = []; }

  // Axis box rotated by rotY around its own center (cx, cy, cz = center)
  addBox(cx, cy, cz, w, h, d, color, rotY = 0, tiltZ = 0) {
    const hw = w / 2, hh = h / 2, hd = d / 2;
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const cosT = Math.cos(tiltZ), sinT = Math.sin(tiltZ);
    const rot = (x, y, z) => {
      // tilt around Z, then yaw around Y
      const x1 = x * cosT - y * sinT, y1 = x * sinT + y * cosT;
      return [cx + x1 * cosY + z * sinY, cy + y1, cz + -x1 * sinY + z * cosY];
    };
    const faces = [
      [[-hw, -hh, hd], [hw, -hh, hd], [hw, hh, hd], [-hw, hh, hd], [0, 0, 1]],
      [[hw, -hh, -hd], [-hw, -hh, -hd], [-hw, hh, -hd], [hw, hh, -hd], [0, 0, -1]],
      [[hw, -hh, hd], [hw, -hh, -hd], [hw, hh, -hd], [hw, hh, hd], [1, 0, 0]],
      [[-hw, -hh, -hd], [-hw, -hh, hd], [-hw, hh, hd], [-hw, hh, -hd], [-1, 0, 0]],
      [[-hw, hh, hd], [hw, hh, hd], [hw, hh, -hd], [-hw, hh, -hd], [0, 1, 0]],
      [[-hw, -hh, -hd], [hw, -hh, -hd], [hw, -hh, hd], [-hw, -hh, hd], [0, -1, 0]],
    ];
    for (const [a, b, c, d2, n] of faces) {
      const va = rot(...a), vb = rot(...b), vc = rot(...c), vd = rot(...d2);
      const n1 = [n[0] * cosT - n[1] * sinT, n[0] * sinT + n[1] * cosT, n[2]];
      const nr = [n1[0] * cosY + n1[2] * sinY, n1[1], -n1[0] * sinY + n1[2] * cosY];
      this.pos.push(...va, ...vb, ...vc, ...va, ...vc, ...vd);
      for (let i = 0; i < 6; i++) { this.nrm.push(...nr); this.col.push(...color); }
    }
  }

  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    return g;
  }
  get empty() { return this.pos.length === 0; }
}

const CONCRETE = [0.42, 0.38, 0.33];
const CONCRETE_D = [0.32, 0.29, 0.26];
const METAL = [0.35, 0.33, 0.32];
const RUSTMETAL = [0.5, 0.26, 0.13];
const GLASSC = [0.45, 0.62, 0.58];
const BONE = [0.85, 0.8, 0.7];

function vary(rng, c, amt = 0.06) {
  const d = rng.range(-amt, amt);
  return [c[0] + d, c[1] + d, c[2] + d];
}

// ---- A half-buried tower; returns colliders (footprint + core) ----
export function addBuilding(gb, rng, x, groundY, z, scale = 1) {
  const floors = rng.int(2, 5);
  const w = rng.range(7, 13) * scale, d = rng.range(7, 13) * scale;
  const bury = rng.range(2, 9) * scale;          // how deep the sand has swallowed it
  const rotY = rng.range(0, Math.PI * 2);
  const tilt = rng.chance(0.3) ? rng.range(-0.07, 0.07) : 0;
  let y = groundY - bury;
  let fw = w, fd = d;
  let f0Top = 0;
  for (let f = 0; f < floors; f++) {
    const fh = rng.range(4, 6) * scale;
    gb.addBox(x, y + fh / 2, z, fw, fh, fd, vary(rng, rng.chance(0.85) ? CONCRETE : CONCRETE_D), rotY, tilt);
    // window band
    if (rng.chance(0.7)) gb.addBox(x, y + fh * 0.65, z, fw + 0.3, fh * 0.18, fd + 0.3, [0.12, 0.1, 0.08], rotY, tilt);
    y += fh;
    if (f === 0) f0Top = y;
    if (rng.chance(0.4)) { fw *= rng.range(0.7, 0.9); fd *= rng.range(0.7, 0.9); }
  }
  if (rng.chance(0.4)) gb.addBox(x, y + 2.5, z, 0.4, 5, 0.4, METAL, rotY); // antenna
  // two colliders: full footprint up to the first-floor ledge (climbable),
  // plus a slimmer core to the roof (the upper floors shrink as they rise)
  return [
    makeBox(x, z, w / 2 + 0.2, d / 2 + 0.2, rotY, f0Top, true),
    makeBox(x, z, w * 0.36, d * 0.36, rotY, y, true),
  ];
}

// ---- Dead crawler / wreck hull (salvage target) ----
export function addWreckGeo(gb, rng, x, groundY, z) {
  const rotY = rng.range(0, Math.PI * 2);
  const L = rng.range(6, 10), W = rng.range(3, 4.5);
  const sink = rng.range(0.5, 1.6);
  const col = rng.chance(0.5) ? METAL : RUSTMETAL;
  gb.addBox(x, groundY - sink + 1.6, z, L, 3.2, W, vary(rng, col), rotY, rng.range(-0.12, 0.12));
  gb.addBox(x, groundY - sink + 3.4, z, L * 0.45, 1.6, W * 0.7, vary(rng, CONCRETE_D), rotY); // cab
  if (rng.chance(0.6)) gb.addBox(x + Math.cos(rotY) * 1.5, groundY - sink + 4.8, z - Math.sin(rotY) * 1.5, 0.25, 3.5, 0.25, METAL, rotY, 0.3);
  return {
    collider: makeBox(x, z, L / 2 + 0.2, W / 2 + 0.2, rotY, groundY - sink + 3.2, true),
    r: Math.max(L, W) * 0.55,
  };
}

// ---- Small decorations (each returns its collider(s), or null) ----
export function addRock(gb, rng, x, groundY, z) {
  const s = rng.range(0.8, 2.6);
  gb.addBox(x, groundY + s * 0.25, z, s * 1.4, s * 0.9, s * 1.1, vary(rng, [0.45, 0.38, 0.3]), rng.range(0, 3), rng.range(-0.2, 0.2));
  // standable: small rocks step over via STEP_UP, big ones can be climbed
  return makeCircle(x, z, s * 0.68, groundY + s * 0.68, true);
}
export function addScrapPile(gb, rng, x, groundY, z) {
  const n = rng.int(2, 4);
  for (let i = 0; i < n; i++) {
    gb.addBox(x + rng.range(-1.4, 1.4), groundY + rng.range(0.1, 0.7), z + rng.range(-1.4, 1.4),
      rng.range(0.5, 1.8), rng.range(0.15, 0.5), rng.range(0.5, 1.5),
      vary(rng, rng.chance(0.45) ? RUSTMETAL : METAL), rng.range(0, 3), rng.range(-0.3, 0.3));
  }
  return null; // ankle-height debris stays walkable
}
export function addGlassSpire(gb, rng, x, groundY, z) {
  const h = rng.range(4, 12);
  gb.addBox(x, groundY + h / 2 - 0.5, z, rng.range(0.7, 1.6), h, rng.range(0.7, 1.6), vary(rng, GLASSC, 0.1), rng.range(0, 3), rng.range(-0.15, 0.15));
  return makeCircle(x, z, 0.75, groundY + h - 0.6, false); // a spike, not a platform
}
export function addBones(gb, rng, x, groundY, z) {
  // ribcage of something vast, or a dead machine's frame
  const n = rng.int(3, 6), rotY = rng.range(0, Math.PI * 2);
  const cols = [];
  for (let i = 0; i < n; i++) {
    const t = i / n, h = (2.5 + Math.sin(t * Math.PI) * 3) * rng.range(0.8, 1.3);
    const rx = x + Math.cos(rotY) * i * 1.6, rz = z - Math.sin(rotY) * i * 1.6;
    gb.addBox(rx, groundY + h / 2 - 0.4, rz,
      0.45, h, 0.45, vary(rng, BONE), rotY, rng.range(-0.35, 0.35) * (rng.chance(0.5) ? 1 : -1));
    cols.push(makeCircle(rx, rz, 0.4, groundY + h * 0.85, false));
  }
  return cols;
}

// ---- Megastructures: vast, rare, visible from far away ----
// Returns { geo, colliders: [{x,z,r}], radius }
export function buildMegastructure(type, rng, groundYFn) {
  const gb = new GeoBuilder();
  const colliders = [];
  let radius = 100;

  if (type === 'ring') {
    // a shattered orbital-elevator ring arcing out of the sand
    const R = rng.range(120, 200);
    const segs = 34;
    const gap0 = rng.range(0, Math.PI * 2), gapW = rng.range(0.6, 1.6);
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      let da = Math.abs(((a - gap0 + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (da < gapW / 2) continue; // collapsed section
      const px = Math.cos(a) * R, pz = 0;
      const py = Math.sin(a) * R; // ring stands vertically
      if (py < -10) continue;     // buried portion
      gb.addBox(px, py, pz, (Math.PI * 2 * R) / segs * 1.15, 14, 22, vary(rng, CONCRETE_D, 0.04), 0, a + Math.PI / 2);
    }
    colliders.push({ x: R, z: 0, r: 16 }, { x: -R, z: 0, r: 16 });
    radius = R + 30;
  } else if (type === 'colossus') {
    // a dead titan, kneeling in the sand for a thousand years
    const s = rng.range(2.2, 3.4);
    const lean = rng.range(-0.18, 0.05);
    const gy = 0;
    gb.addBox(0, gy + 13 * s, 0, 10 * s, 16 * s, 7 * s, vary(rng, METAL, 0.04), 0, lean);        // torso
    gb.addBox(0.5 * s, gy + 23.5 * s, 0, 4.5 * s, 5 * s, 4.5 * s, vary(rng, CONCRETE_D), 0, lean); // head
    gb.addBox(1.5 * s, gy + 24 * s, 0, 5.2 * s, 1.2 * s, 1.2 * s, [0.9, 0.55, 0.2], 0, lean);   // dead eye band
    gb.addBox(-7.5 * s, gy + 12 * s, 2 * s, 3.5 * s, 18 * s, 3.5 * s, vary(rng, METAL), 0.1, lean + 0.35); // arm
    gb.addBox(7.5 * s, gy + 8 * s, -2 * s, 3.5 * s, 13 * s, 3.5 * s, vary(rng, RUSTMETAL), -0.1, lean - 0.5); // arm in sand
    gb.addBox(-3.5 * s, gy + 2.5 * s, 1 * s, 4 * s, 7 * s, 4 * s, vary(rng, METAL), 0, 0.1);     // thigh
    colliders.push({ x: 0, z: 0, r: 7 * s });
    radius = 26 * s;
  } else if (type === 'dish') {
    // a listening array, still aimed at something that no longer answers
    const n = rng.int(3, 5);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, dist = rng.range(28, 60);
      const px = Math.cos(a) * dist, pz = Math.sin(a) * dist;
      const h = rng.range(14, 26);
      gb.addBox(px, h / 2, pz, 2.2, h, 2.2, vary(rng, METAL), a);                  // pylon
      gb.addBox(px, h + 4, pz, 16, 1.2, 16, vary(rng, CONCRETE_D), a, rng.range(0.5, 0.9)); // tilted dish
      colliders.push({ x: px, z: pz, r: 3.5 });
    }
    radius = 80;
  } else { // 'spire'
    const h = rng.range(120, 220), w = rng.range(14, 22);
    const tilt = rng.range(-0.1, 0.1);
    gb.addBox(0, h * 0.5 - 14, 0, w, h, w, vary(rng, CONCRETE_D, 0.03), rng.range(0, 3), tilt);
    gb.addBox(0, h - 14, 0, w * 0.5, h * 0.16, w * 0.5, vary(rng, METAL), 0.4, tilt);
    for (let i = 0; i < 5; i++) {
      const fy = rng.range(8, h * 0.7);
      gb.addBox(rng.range(-w, w), fy, rng.range(-w, w), rng.range(3, 8), rng.range(2, 5), rng.range(3, 8), vary(rng, CONCRETE), rng.range(0, 3)); // debris shelf
    }
    colliders.push({ x: 0, z: 0, r: w * 0.75 });
    radius = h * 0.5;
  }
  return { geo: gb.build(), colliders, radius };
}

export const MEGA_TYPES = ['ring', 'colossus', 'dish', 'spire'];
