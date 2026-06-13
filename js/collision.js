// Lightweight solid-world collision: 2D footprints (circles and oriented boxes)
// with heights and standable tops. Enough physics to make the world push back —
// no rigidbodies, no regrets.

export const STEP_UP = 0.45; // how high feet can step/stand without jumping

export function makeBox(x, z, hw, hd, rot, top, standable = false) {
  return { kind: 'box', x, z, hw, hd, top, standable, cos: Math.cos(rot), sin: Math.sin(rot) };
}
export function makeCircle(x, z, r, top = Infinity, standable = false) {
  return { kind: 'circle', x, z, r, top, standable };
}

// world -> box-local (matches GeoBuilder's yaw convention)
function toLocal(c, x, z) {
  const dx = x - c.x, dz = z - c.z;
  return [dx * c.cos - dz * c.sin, dx * c.sin + dz * c.cos];
}

export function inFootprint(c, x, z, margin = 0) {
  if (c.kind === 'circle') {
    const dx = x - c.x, dz = z - c.z, r = c.r + margin;
    return dx * dx + dz * dz < r * r;
  }
  const [lx, lz] = toLocal(c, x, z);
  return Math.abs(lx) < c.hw + margin && Math.abs(lz) < c.hd + margin;
}

// push a position out of one collider (treating it as a wall)
function pushOut(p, radius, c) {
  if (c.kind === 'circle') {
    const dx = p.x - c.x, dz = p.z - c.z;
    const d2 = dx * dx + dz * dz, min = c.r + radius;
    if (d2 < min * min) {
      if (d2 < 1e-6) { p.x = c.x + min; return; } // dead centre: pick a direction
      const d = Math.sqrt(d2);
      p.x = c.x + (dx / d) * min;
      p.z = c.z + (dz / d) * min;
    }
    return;
  }
  let [lx, lz] = toLocal(c, p.x, p.z);
  const ex = c.hw + radius, ez = c.hd + radius;
  if (Math.abs(lx) >= ex || Math.abs(lz) >= ez) return;
  // push along the axis of least penetration
  const penX = ex - Math.abs(lx), penZ = ez - Math.abs(lz);
  if (penX < penZ) lx = Math.sign(lx || 1) * ex;
  else lz = Math.sign(lz || 1) * ez;
  // local -> world
  p.x = c.x + lx * c.cos + lz * c.sin;
  p.z = c.z - lx * c.sin + lz * c.cos;
}

// resolve walls: colliders whose top is at/below your feet don't block (you're on them)
export function resolve(p, radius, feetY, colliders) {
  for (const c of colliders) {
    if (feetY >= c.top - STEP_UP) continue;
    pushOut(p, radius, c);
  }
}

// highest standable surface under (x,z) reachable from feetY (step-up included)
export function supportY(x, z, feetY, colliders) {
  let best = -Infinity;
  for (const c of colliders) {
    if (!c.standable || c.top > feetY + STEP_UP) continue;
    if (c.top > best && inFootprint(c, x, z, 0.25)) best = c.top;
  }
  return best;
}

// is a point inside solid structure? (projectile occlusion)
export function pointBlocked(x, y, z, colliders) {
  for (const c of colliders) {
    if (y < c.top && inFootprint(c, x, z, 0.1)) return true;
  }
  return false;
}
