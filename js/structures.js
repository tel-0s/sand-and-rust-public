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

// ---- A tower torn open: the cutaway ruin. One face is gone — floor decks
// hang exposed, rebar prickles from every broken edge, rubble skirts the
// opening. The remaining walls are real (colliders), so the ground floor
// is a room the desert moved into. Verisimilitude via seeing past the
// surface layer — and sometimes something worth taking, further in. ----
export function addCutawayBuilding(gb, rng, x, groundY, z, scale = 1) {
  const floors = rng.int(2, 4);
  const w = rng.range(8, 13) * scale, d = rng.range(8, 13) * scale;
  const rotY = rng.range(0, Math.PI * 2);
  const bury = rng.range(1.5, 5) * scale;
  const y0 = groundY - bury;
  const sideFrac = rng.range(0.55, 0.8); // how much of each flank survived
  const cos = Math.cos(rotY), sin = Math.sin(rotY);
  const W = (lx, lz) => [x + lx * cos + lz * sin, z + -lx * sin + lz * cos];
  const colliders = [];
  const wallT = 0.6;
  let y = y0, topY = y0;
  const fhs = [];
  for (let f = 0; f < floors; f++) { fhs.push(rng.range(3.8, 5.4) * scale); topY += fhs[f]; }
  const H = topY - y0;

  // back wall (full) and the two bitten flanks — dark, shadowed concrete
  const [bwx, bwz] = W(0, -d / 2 + wallT / 2);
  gb.addBox(bwx, y0 + H / 2, bwz, w, H, wallT, vary(rng, CONCRETE_D), rotY);
  colliders.push(makeBox(bwx, bwz, w / 2, wallT / 2 + 0.1, rotY, topY, true));
  const sideLen = d * sideFrac;
  for (const sx of [-1, 1]) {
    const [swx, swz] = W(sx * (w / 2 - wallT / 2), -d / 2 + sideLen / 2);
    gb.addBox(swx, y0 + H / 2, swz, wallT, H, sideLen, vary(rng, CONCRETE), rotY);
    colliders.push(makeBox(swx, swz, wallT / 2 + 0.1, sideLen / 2, rotY, topY, true));
    // vertical rebar where the flank tore
    const [rx, rz] = W(sx * (w / 2 - wallT / 2), -d / 2 + sideLen);
    for (let i = 0; i < 2; i++) {
      gb.addBox(rx, y0 + H - i * 1.3 - 0.4, rz, 0.07, rng.range(0.9, 1.6), 0.07, RUSTMETAL, rotY, rng.range(-0.35, 0.35));
    }
  }
  // exposed floor decks — STANDABLE now: colliders with real bottoms hold
  // your weight from above and let you walk the room beneath
  y = y0;
  let firstDeck = null;
  for (let f = 0; f < floors; f++) {
    y += fhs[f];
    const deckD = d * rng.range(0.82, 0.96);
    const [dxc, dzc] = W(0, -d / 2 + deckD / 2);
    gb.addBox(dxc, y - 0.25, dzc, w - wallT, 0.5, deckD, vary(rng, f === floors - 1 ? CONCRETE : CONCRETE_D), rotY);
    // the first deck only becomes solid when the room beneath keeps real
    // headroom — a half-buried squat floor stays visual, so the walk-in
    // promise of the cutaways survives its own upgrade
    const solid = f > 0 || y - groundY >= 3.0;
    if (solid) colliders.push(makeBox(dxc, dzc, (w - wallT) / 2, deckD / 2, rotY, y, true, y - 0.5));
    if (solid && !firstDeck) firstDeck = { y, deckD };
    // rebar prickling from the broken deck edge
    const nRods = rng.int(3, 5);
    for (let i = 0; i < nRods; i++) {
      const lx = rng.range(-w / 2 + 1, w / 2 - 1);
      const [rx2, rz2] = W(lx, -d / 2 + deckD + rng.range(-0.2, 0.4));
      gb.addBox(rx2, y - 0.15 + rng.range(0, 0.3), rz2, 0.07, rng.range(0.7, 1.4), 0.07, RUSTMETAL,
        rotY + rng.range(-0.3, 0.3), rng.range(0.6, 1.4) * (rng.chance(0.5) ? 1 : -1));
    }
    // a dark utility box or door-shadow against the back wall, some floors
    if (rng.chance(0.5)) {
      const [ux, uz] = W(rng.range(-w / 3, w / 3), -d / 2 + wallT + 0.7);
      gb.addBox(ux, (f === 0 ? groundY : y - fhs[f]) + 0.8, uz, rng.range(1, 1.8), 1.6, 1.2, [0.1, 0.09, 0.08], rotY);
    }
  }
  // a rubble stair climbs one torn flank to the first exposed deck —
  // true verticality: the decks are yours if you take the climb
  const climb = firstDeck ? firstDeck.y - groundY : 0;
  const nSteps = Math.ceil(climb / 0.42);
  const runL = nSteps ? Math.min(1.1, (d + 2) / nSteps) : 0; // spread along the flank
  if (firstDeck && climb >= 1.6 && climb < 8.5 && runL >= 0.6 && rng.chance(0.65)) {
    const sx = rng.chance(0.5) ? -1 : 1;
    for (let k = 1; k <= nSteps; k++) {
      const top = groundY + (k / nSteps) * climb;
      const lz = d / 2 + 1.2 - (k - 0.5) * runL; // marching inward along the flank
      const [kx, kz] = W(sx * (w / 2 - 1.1), lz);
      const stepH = Math.max(0.4, top - groundY);
      gb.addBox(kx, top - stepH / 2, kz, rng.range(1.6, 2.3), stepH, 1.1, vary(rng, CONCRETE_D, 0.05), rotY + rng.range(-0.1, 0.1));
      colliders.push(makeBox(kx, kz, 1.0, Math.max(0.55, runL / 2 + 0.1), rotY, top, true));
    }
  }
  // rubble skirting the torn-open face
  const nRub = rng.int(2, 4);
  for (let i = 0; i < nRub; i++) {
    const lx = rng.range(-w / 2, w / 2), lz = d / 2 + rng.range(0.5, 4);
    const [rx3, rz3] = W(lx, lz);
    const rs = rng.range(0.7, 1.7);
    gb.addBox(rx3, groundY + rs * 0.25, rz3, rs * 1.3, rs * 0.8, rs, vary(rng, CONCRETE_D), rng.range(0, 3), rng.range(-0.15, 0.15));
    if (rs > 1.1) colliders.push(makeCircle(rx3, rz3, rs * 0.6, groundY + rs * 0.55, true));
  }
  // sometimes the desert left something inside
  if (rng.chance(0.45)) {
    const [px, pz] = W(rng.range(-w / 4, w / 4), rng.range(-d / 6, d / 4));
    const c = addScrapPile(gb, rng, px, groundY, pz);
    if (c) colliders.push(c);
  }
  return colliders;
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
  } else if (type === 'launch') {
    // a launch complex: the pad, the gantry, and a ship that never flew.
    // colliders here may carry {top, standable} — the pad is walkable.
    const padR = rng.range(48, 62);
    gb.addBox(0, 0.19, 0, padR * 2, 0.38, padR * 2, vary(rng, CONCRETE, 0.03), rng.range(0, 0.4));
    gb.addBox(0, 0.41, 0, padR * 0.9, 0.06, padR * 0.9, [0.16, 0.14, 0.12], rng.range(0, 0.4)); // scorch
    colliders.push({ x: 0, z: 0, r: padR * 1.05, top: 0.44, standable: true });
    const shipR = rng.range(7.5, 10.5), shipH = rng.range(85, 130);
    const fell = rng.chance(0.35);
    if (!fell) {
      // still on the pad, aimed at a sky that stopped answering
      gb.addBox(0, 0.4 + shipH * 0.5, 0, shipR * 2, shipH, shipR * 2, vary(rng, METAL, 0.04), rng.range(0, 0.5), rng.range(-0.015, 0.015));
      gb.addBox(0, 0.4 + shipH * 1.08, 0, shipR * 1.3, shipH * 0.18, shipR * 1.3, vary(rng, CONCRETE_D), rng.range(0, 0.5)); // nose fairing
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + 0.3;
        gb.addBox(Math.cos(a) * shipR * 1.25, 8, Math.sin(a) * shipR * 1.25, 1.1, 15, 8.5, vary(rng, RUSTMETAL), -a);
      }
      colliders.push({ x: 0, z: 0, r: shipR * 1.9 });
    } else {
      // it fell across its own pad an age ago and broke into thirds
      const fa = rng.range(0, Math.PI * 2);
      const dx = Math.cos(fa), dz = Math.sin(fa);
      let run = shipR * 1.6;
      for (let i = 0; i < 3; i++) {
        const segL = shipH * rng.range(0.22, 0.32);
        const px = dx * (run + segL / 2), pz = dz * (run + segL / 2);
        gb.addBox(px, shipR * rng.range(0.7, 0.95), pz, segL, shipR * 1.7, shipR * 1.8,
          vary(rng, i ? RUSTMETAL : METAL, 0.05), -fa + rng.range(-0.12, 0.12), rng.range(-0.06, 0.06));
        colliders.push({ x: px, z: pz, r: Math.max(segL, shipR * 2) * 0.55 });
        run += segL + rng.range(1.5, 5);
      }
      gb.addBox(0, 4.8, 0, shipR * 2.2, 9.6, shipR * 2.2, vary(rng, RUSTMETAL), rng.range(0, 1)); // the engines never left
      colliders.push({ x: 0, z: 0, r: shipR * 1.5 });
    }
    // the gantry, arms still reaching for where the ship is (or was)
    const ga = rng.range(0, Math.PI * 2);
    const gDist = shipR + rng.range(14, 20);
    const gx = Math.cos(ga) * gDist, gz = Math.sin(ga) * gDist;
    const gH = shipH * (fell ? rng.range(0.75, 0.95) : rng.range(0.92, 1.08));
    gb.addBox(gx, 0.4 + gH / 2, gz, 7, gH, 7, vary(rng, RUSTMETAL, 0.05), ga, rng.range(-0.02, 0.02));
    const armLen = gDist - shipR - 0.5;
    for (let i = 1; i <= 3; i++) {
      gb.addBox(Math.cos(ga) * (shipR + armLen / 2 + 0.5), 0.4 + gH * (0.22 + i * 0.21), Math.sin(ga) * (shipR + armLen / 2 + 0.5),
        armLen, 1.5, 2.4, vary(rng, METAL), Math.PI - ga);
    }
    colliders.push({ x: gx, z: gz, r: 5.5 });
    // fuel farm off one flank; a dark blast trench running off another
    const fa2 = ga + rng.range(1.8, 2.8);
    for (let i = 0; i < 2; i++) {
      const tx = Math.cos(fa2) * (padR + 14 + i * 15), tz = Math.sin(fa2) * (padR + 14 + i * 15);
      gb.addBox(tx, 5.5, tz, 11, 11, 22, vary(rng, i ? RUSTMETAL : METAL, 0.05), fa2);
      colliders.push({ x: tx, z: tz, r: 12 });
    }
    const ta = ga + rng.range(-1.4, -0.6);
    gb.addBox(Math.cos(ta) * (padR + 32), -0.8, Math.sin(ta) * (padR + 32), 70, 3, 16, [0.14, 0.12, 0.1], -ta);
    radius = padR + 60;
  } else if (type === 'hand') {
    // THE HAND (ARC XV): a warbot's hand, fingers curled out of the sand,
    // palm broad enough to hold a still. Fingers chain along X and curl in
    // the X-Y plane (tiltZ pitches boxes long in X); the palm is STANDABLE.
    const palmW = rng.range(60, 80), palmL = rng.range(75, 95); // palmL runs along X
    gb.addBox(0, 7, 0, palmL, 14, palmW, vary(rng, RUSTMETAL, 0.05), 0, rng.range(-0.04, 0.04));
    colliders.push({ x: 0, z: 0, r: Math.max(palmW, palmL) * 0.52, top: 14.2, standable: true });
    // four fingers off the +X edge, chained knuckle to knuckle, curling up
    for (let f = 0; f < 4; f++) {
      const fz = -palmW * 0.36 + f * (palmW * 0.24);
      const thick = rng.range(8, 11);
      let jx = palmL * 0.48, jy = 12, ang = rng.range(0.3, 0.42);
      for (let s2 = 0; s2 < 3; s2++) {
        const segL = rng.range(22, 30) * (1 - s2 * 0.18);
        const ex = jx + Math.cos(ang) * segL, ey = jy + Math.sin(ang) * segL;
        gb.addBox((jx + ex) / 2, (jy + ey) / 2, fz, segL * 1.12, thick, thick,
          vary(rng, s2 ? RUSTMETAL : METAL, 0.04), 0, ang);
        colliders.push({ x: (jx + ex) / 2, z: fz, r: thick * 0.9 });
        jx = ex; jy = ey; ang += rng.range(0.42, 0.58);
      }
    }
    // the thumb: one heavy curl off the near edge, half-buried
    {
      const thick = rng.range(10, 13);
      let jx = palmL * 0.15, jy = 8, ang = 0.5;
      for (let s2 = 0; s2 < 2; s2++) {
        const segL = rng.range(24, 30) * (1 - s2 * 0.2);
        const ex = jx + Math.cos(ang) * segL * 0.6, ey = jy + Math.sin(ang) * segL;
        gb.addBox((jx + ex) / 2, (jy + ey) / 2, palmW * 0.62, segL * 1.1, thick, thick,
          vary(rng, RUSTMETAL, 0.05), 0.5, ang);
        colliders.push({ x: (jx + ex) / 2, z: palmW * 0.62, r: thick });
        jx = ex; jy = ey; ang += 0.5;
      }
    }
    // the wrist: a severed trunk trailing -X into the dune, cables spilling
    gb.addBox(-palmL * 0.68, 10, 0, 46, 22, palmW * 0.7, vary(rng, METAL, 0.05), 0, 0.14);
    colliders.push({ x: -palmL * 0.68, z: 0, r: palmW * 0.4 });
    for (let i = 0; i < 5; i++) {
      const ca = rng.range(-0.7, 0.7);
      gb.addBox(-palmL * 0.95 - i * 7, 1.2, Math.sin(ca) * 18, rng.range(9, 18), 2.4, 2.2, vary(rng, RUSTMETAL), ca);
    }
    // rubble ramp onto the palm: the way UP
    gb.addBox(palmL * 0.28, 3.5, -palmW * 0.42, 22, 7, 16, vary(rng, CONCRETE, 0.04), 0, 0.3);
    colliders.push({ x: palmL * 0.28, z: -palmW * 0.42, r: 11, top: 7.2, standable: true });
    radius = palmL + 60;
  } else if (type === 'head') {
    // THE HEAD (ARC XV): a decapitated war-machine head, bigger than most
    // buildings, resting where it rolled. The jaw fell separately.
    const skW = rng.range(70, 95), skH = rng.range(55, 75), skL = rng.range(80, 105);
    const roll = rng.range(-0.12, 0.12), yaw = rng.range(0, Math.PI * 2);
    gb.addBox(0, skH * 0.34, 0, skW, skH, skL, vary(rng, METAL, 0.04), yaw, roll);
    colliders.push({ x: 0, z: 0, r: Math.max(skW, skL) * 0.55 });
    // the crown crest, snapped short; antenna stubs
    gb.addBox(Math.sin(yaw) * 4, skH * 0.86, Math.cos(yaw) * 4, skW * 0.24, skH * 0.3, skL * 0.5, vary(rng, RUSTMETAL, 0.05), yaw, roll);
    for (let i = 0; i < 3; i++) {
      gb.addBox(Math.sin(yaw + i) * skW * 0.3, skH * 0.95 + i * 3, Math.cos(yaw + i) * skL * 0.2, 2.5, rng.range(8, 20), 2.5, vary(rng, RUSTMETAL), yaw + i, rng.range(-0.2, 0.2));
    }
    // the optic sockets: two dark recesses on the face, watching nothing
    const fx = Math.sin(yaw) * (skL * 0.5), fz = Math.cos(yaw) * (skL * 0.5);
    for (const side of [-1, 1]) {
      const ox = fx + Math.sin(yaw + Math.PI / 2) * skW * 0.22 * side;
      const oz = fz + Math.cos(yaw + Math.PI / 2) * skW * 0.22 * side;
      gb.addBox(ox, skH * 0.52, oz, 11, 11, 8, [0.05, 0.045, 0.05], yaw);
    }
    // the jaw: fallen ahead of the face, teeth-side up, half buried
    const jd = skL * 0.85;
    gb.addBox(fx * 1.9, 5, fz * 1.9, skW * 0.7, 10, 26, vary(rng, RUSTMETAL, 0.05), yaw + rng.range(-0.3, 0.3), 0.08);
    colliders.push({ x: fx * 1.9, z: fz * 1.9, r: skW * 0.4, top: 10.2, standable: true });
    // the neck stump behind, shorn cables fanning
    gb.addBox(-fx * 1.2, 8, -fz * 1.2, skW * 0.5, 16, 20, vary(rng, RUSTMETAL, 0.06), yaw, 0.1);
    colliders.push({ x: -fx * 1.2, z: -fz * 1.2, r: skW * 0.3 });
    for (let i = 0; i < 6; i++) {
      const ca = yaw + Math.PI + rng.range(-0.8, 0.8);
      gb.addBox(-fx * 1.2 + Math.sin(ca) * 16, 1.4, -fz * 1.2 + Math.cos(ca) * 16, 2, 2.6, rng.range(10, 22), vary(rng, RUSTMETAL), ca);
    }
    radius = skL + 40;
  } else if (type === 'titan') {
    // THE TITAN (ARC XV): an intact war machine, buried to the waist —
    // 150 m of torso, arms, and head against the sky. The rarest thing
    // in the desert; the silhouette carries across provinces.
    const scale = rng.range(0.9, 1.15);
    const S = (v) => v * scale;
    // the waist, breaking the surface like a mountain that was built
    gb.addBox(0, S(14), 0, S(58), S(34), S(44), vary(rng, RUSTMETAL, 0.05), rng.range(0, 0.25), 0.02);
    colliders.push({ x: 0, z: 0, r: S(36) });
    // the torso: two tapering tiers, battle-scarred
    gb.addBox(0, S(52), 0, S(48), S(46), S(38), vary(rng, METAL, 0.04), 0, rng.range(-0.02, 0.02));
    gb.addBox(0, S(96), 0, S(42), S(42), S(34), vary(rng, METAL, 0.04), 0, rng.range(-0.02, 0.02));
    // the chest plate and its old wound
    gb.addBox(0, S(96), S(18), S(30), S(30), S(6), vary(rng, RUSTMETAL, 0.06), 0);
    gb.addBox(S(rng.range(-10, 10)), S(rng.range(60, 90)), S(20), S(9), S(9), S(4), [0.1, 0.07, 0.06], 0); // the hole that didn't finish it
    // shoulders: pauldron blocks flaring wide at ~118m
    for (const side of [-1, 1]) {
      gb.addBox(S(30) * side, S(120), 0, S(26), S(18), S(30), vary(rng, METAL, 0.05), 0, side * 0.06);
      colliders.push({ x: S(30) * side, z: 0, r: S(16) });
    }
    // the arms: one hangs dead at the flank; one is PLANTED in the sand,
    // bracing — the machine died standing and refused to finish falling
    // hanging arm (long in Y: built as tall thin boxes)
    const hs = rng.chance(0.5) ? -1 : 1;
    gb.addBox(S(44) * hs, S(84), 0, S(14), S(64), S(16), vary(rng, RUSTMETAL, 0.05), 0, hs * 0.05);
    gb.addBox(S(46) * hs, S(38), 0, S(12), S(30), S(13), vary(rng, RUSTMETAL, 0.06), 0, hs * 0.08);
    colliders.push({ x: S(46) * hs, z: 0, r: S(10) });
    // planted arm: upper angles down-out (long in X, tiltZ), forearm drives into the ground
    const ps = -hs;
    gb.addBox(S(58) * ps, S(100), S(6), S(46), S(13), S(15), vary(rng, METAL, 0.05), 0, ps * -0.5);
    gb.addBox(S(86) * ps, S(46), S(10), S(15), S(78), S(15), vary(rng, RUSTMETAL, 0.05), 0, ps * 0.06);
    gb.addBox(S(86) * ps, S(6), S(10), S(30), S(12), S(26), vary(rng, RUSTMETAL, 0.06), 0.3); // the fist, buried to the knuckles
    colliders.push({ x: S(86) * ps, z: S(10), r: S(17), top: S(12.2), standable: true });
    // the head: intact, watching the horizon it lost
    gb.addBox(0, S(146), 0, S(20), S(16), S(22), vary(rng, METAL, 0.04), rng.range(-0.2, 0.2));
    gb.addBox(0, S(146), S(11), S(12), S(5), S(3), [0.06, 0.05, 0.06], 0); // the optic band, dark
    gb.addBox(S(6), S(158), 0, S(2), S(16), S(2), vary(rng, RUSTMETAL), 0.2, 0.1); // antenna, bent
    // greebles: vents and plating seams down the torso
    for (let i = 0; i < 6; i++) {
      gb.addBox(S(rng.range(-20, 20)), S(rng.range(35, 110)), S(rng.range(-1, 1) > 0 ? 19 : -19),
        S(rng.range(4, 9)), S(rng.range(3, 6)), S(2), vary(rng, RUSTMETAL, 0.08), 0);
    }
    radius = S(120);
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

export const MEGA_TYPES = ['ring', 'colossus', 'dish', 'spire']; // the LEGACY pick pool — frozen (pool[hash] is load-bearing)
export const MEGA_TYPES_ALL = [...MEGA_TYPES, 'launch', 'hand', 'head', 'titan']; // every kind that exists, for UI/tools
