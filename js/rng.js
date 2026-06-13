// Seeded, deterministic randomness. Everything in the world grows from one seed.

// String → 32-bit seed (FNV-1a)
export function hashString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// Integer mixing for coordinate hashing (deterministic per (seed,x,y[,z]))
export function hash2(seed, x, y) {
  let h = seed >>> 0;
  h = Math.imul(h ^ (x | 0), 0x85ebca6b);
  h = (h ^ (h >>> 13)) >>> 0;
  h = Math.imul(h ^ (y | 0), 0xc2b2ae35);
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}
export function hash3(seed, x, y, z) {
  return hash2(hash2(seed, x, y), z, 0x9e3779b9);
}

// mulberry32 PRNG
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Convenience wrapper with helpers
export class Rand {
  constructor(seed) { this.next = mulberry32(seed >>> 0); }
  f() { return this.next(); }
  range(a, b) { return a + this.next() * (b - a); }
  int(a, b) { return a + Math.floor(this.next() * (b - a + 1)); } // inclusive
  pick(arr) { return arr[Math.floor(this.next() * arr.length)]; }
  chance(p) { return this.next() < p; }
  // weighted pick: items = [[value, weight], ...]
  weighted(items) {
    let total = 0;
    for (const [, w] of items) total += w;
    let r = this.next() * total;
    for (const [v, w] of items) { r -= w; if (r <= 0) return v; }
    return items[items.length - 1][0];
  }
  sign() { return this.next() < 0.5 ? -1 : 1; }
}

export function randFromHash(seed, x, y) { return new Rand(hash2(seed, x, y)); }
