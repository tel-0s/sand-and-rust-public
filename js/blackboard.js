// An Ecological Generative System blackboard — after Isaac Karth's EGS,
// by way of the ecogents project. Facts are tuples; design moves fire
// opportunistically when their preconditions hold; generation ends when
// no move can act. Browser-native, seeded, ~60 lines.

export class Blackboard {
  constructor() { this.facts = []; }
  assert(...fact) { this.facts.push(fact); return this; }
  // pattern matching: '?' is a wildcard; returns all matching facts
  query(pattern) {
    return this.facts.filter(f =>
      f.length >= pattern.length && pattern.every((p, i) => p === '?' || f[i] === p));
  }
  queryOne(pattern) { return this.query(pattern)[0] || null; }
  has(pattern) { return this.query(pattern).length > 0; }
}

export class DesignMove {
  constructor(name, priority, canApply, apply) {
    this.name = name; this.priority = priority;
    this.canApply = canApply; this.apply = apply;
  }
}

// The EGS loop: among applicable moves, the highest priority tier acts
// (ties broken by seeded rng), mutating the board; repeat until quiet.
export function runMoves(moves, bb, rng, ctx, maxIters = 24) {
  for (let i = 0; i < maxIters; i++) {
    const applicable = moves.filter(m => m.canApply(bb, ctx));
    if (!applicable.length) break;
    const best = Math.max(...applicable.map(m => m.priority));
    const tier = applicable.filter(m => m.priority === best);
    tier[rng.int(0, tier.length - 1)].apply(bb, rng, ctx);
  }
  return bb;
}
