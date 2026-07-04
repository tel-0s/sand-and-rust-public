// FRAMES — the body typologies of the desert. Every machine is a frame
// wearing parts: the frame sets the silhouette and the gait, the parts set
// the stats and the greebles. One vocabulary for enemies, souls, and
// haulers alike — and as of the sampler, every frame is only the NEUTRAL
// POINT of a parameterized space: a 32-bit seed is machinic DNA, decoded
// into decoupled axes (proportions, leg length, head) and modifiers
// (antennas, spines, extra arms...). The five named frames are samples.
import * as THREE from 'three';
import { hash3, mulberry32 } from './rng.js';

// legs get their geometry translated so the pivot sits at the hip — rotation
// swings them like limbs instead of spinning them like propellers
function limb(w, len, d, mat) {
  const geo = new THREE.BoxGeometry(w, len, d);
  geo.translate(0, -len / 2, 0);
  return new THREE.Mesh(geo, mat);
}

// the identity element of the form space: buildForm(NEUTRAL) === the frame
// as it has always looked. Every axis is a multiplier around 1.
export const NEUTRAL_FORM = Object.freeze({
  bw: 1, bh: 1, bd: 1, legLen: 1, legThick: 1, head: 1, mods: Object.freeze([]),
});

// ---------- machinic DNA ----------
// contextual priors: who your people are shapes how your body drifts.
// scavvers vary in the standard ways; ferro-cultists come back wrong on
// purpose; monks go tall and spare; brokers go broad and carry things.
const FORM_PRIORS = {
  scavver:    { axes: { bw: [0.92, 1.22], legLen: [0.9, 1.18] }, mods: ['arms', 'pods', 'brow', 'tail'], modMax: 2 },
  mercantile: { axes: { bw: [1.0, 1.28], bh: [0.9, 1.08] }, mods: ['pods', 'brow', 'antenna'], modMax: 2 },
  monastic:   { axes: { bh: [1.02, 1.28], bw: [0.82, 1.0], legLen: [1.0, 1.26] }, mods: ['antenna', 'fin'], modMax: 1 },
  ferrocult:  { axes: { bw: [0.8, 1.34], bh: [0.85, 1.28], legLen: [0.85, 1.3], head: [0.75, 1.3] }, mods: ['spines', 'asym', 'tail', 'antenna', 'arms'], modMax: 3 },
  feral:      { axes: {}, mods: ['fin', 'spines', 'antenna', 'tail', 'brow'], modMax: 2 }, // the wild kinds
};

// axis defaults when the prior doesn't shape them
const AXIS_DEFAULTS = { bw: [0.88, 1.16], bh: [0.9, 1.14], bd: [0.88, 1.18], legLen: [0.9, 1.16], legThick: [0.85, 1.22], head: [0.85, 1.18] };

// sample a form from DNA. opts: { temperament, lineage, spread, infected }
// spread scales deviation from neutral: 1 for souls (full character),
// ~0.5 for enemy kinds (the silhouette must stay readable at a glance).
export function sampleForm(dna, opts = {}) {
  const r = mulberry32(dna >>> 0);
  const pr = FORM_PRIORS[opts.temperament] || FORM_PRIORS.feral;
  const spread = opts.spread ?? 1;
  const form = { mods: [] };
  for (const k of Object.keys(AXIS_DEFAULTS)) {
    const [lo, hi] = pr.axes[k] || AXIS_DEFAULTS[k];
    form[k] = 1 + (lo + r() * (hi - lo) - 1) * spread;
  }
  // the local dialect bends the body its way, and often signs its work
  if (opts.lineage) {
    for (const [k, v] of opts.lineage.bias) form[k] *= 1 + (v - 1) * spread;
    if (opts.lineage.mod && r() < 0.55 * spread) form.mods.push(opts.lineage.mod);
  }
  const nMods = Math.floor(r() * (pr.modMax + 1) * Math.min(1, spread + 0.25));
  for (let i = 0; i < nMods; i++) {
    const m = pr.mods[Math.floor(r() * pr.mods.length)];
    if (!form.mods.includes(m)) form.mods.push(m);
  }
  if (opts.infected && r() < 0.5 && !form.mods.includes('spines')) form.mods.push('spines');
  if (form.mods.length > 3) form.mods.length = 3;
  return form;
}

// ---------- regional lineages ----------
// every ~2.6 km cell of desert speaks its own body dialect: two axes bent a
// fixed way, one signature modifier most locals carry. Machines of a valley
// share a family resemblance; walk far enough and the bodies change accent.
const LINEAGE_CELL = 2600;
const AXIS_WORDS = {
  legLen: ['Longshank', 'Lowset'], bw: ['Broadback', 'Narrowframe'],
  bh: ['Highhull', 'Flatback'], bd: ['Longbody', 'Shortframe'],
  legThick: ['Heavyjoint', 'Finelimb'], head: ['Greathead', 'Smallcrown'],
};
const LINEAGE_MODS = ['antenna', 'fin', 'spines', 'pods', 'arms', 'tail', 'brow'];
export function lineageAt(seed, x, z) {
  const cx = Math.floor(x / LINEAGE_CELL), cz = Math.floor(z / LINEAGE_CELL);
  const r = mulberry32(hash3(seed, cx, cz, 6011) >>> 0);
  const keys = Object.keys(AXIS_WORDS);
  const a1 = keys[Math.floor(r() * keys.length)];
  let a2 = keys[Math.floor(r() * keys.length)];
  if (a2 === a1) a2 = keys[(keys.indexOf(a1) + 1) % keys.length];
  const d1 = r() < 0.5 ? 1 : -1, d2 = r() < 0.5 ? 1 : -1;
  const bias = [
    [a1, 1 + d1 * (0.08 + r() * 0.1)],
    [a2, 1 + d2 * (0.05 + r() * 0.08)],
  ];
  const mod = r() < 0.75 ? LINEAGE_MODS[Math.floor(r() * LINEAGE_MODS.length)] : null;
  return { bias, mod, name: `the ${AXIS_WORDS[a1][d1 > 0 ? 0 : 1]} line` };
}

// ---------- modifiers ----------
// bolt-on expressivity: each mod attaches at frame-computed anchors.
// sway-tagged meshes get a slow pendulum in animateFrame.
export function applyMods(g, s, mats, form, an) {
  const sway = [];
  const M = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || mats.dark);
  for (const mod of form.mods) {
    if (mod === 'antenna') {
      const mast = limb(0.05 * s, 0.9 * s, 0.05 * s, mats.dark);
      mast.position.set(0.12 * s, an.topY, an.backZ * 0.4);
      mast.rotation.x = Math.PI - 0.12; mast.userData.swayAxis = 'z';
      g.add(mast); sway.push(mast);
    } else if (mod === 'fin') {
      const fin = M(0.1 * s, 0.5 * s, 0.8 * s);
      fin.position.set(0, an.topY + 0.14 * s, an.backZ * 0.5);
      fin.rotation.x = -0.2; g.add(fin);
    } else if (mod === 'spines') {
      for (let i = 0; i < 3; i++) {
        const sp = M(0.09 * s, 0.42 * s, 0.09 * s);
        sp.position.set((i - 1) * 0.14 * s, an.topY + 0.1 * s, an.backZ * (0.15 + i * 0.3));
        sp.rotation.x = -0.35 - i * 0.14; sp.rotation.z = (i - 1) * 0.18;
        g.add(sp);
      }
    } else if (mod === 'pods') {
      for (const sx of [-1, 1]) {
        const pod = M(0.26 * s, 0.4 * s, 0.6 * s);
        pod.position.set(sx * (an.sideX + 0.14 * s), an.bodyY, -0.05 * s);
        g.add(pod);
      }
    } else if (mod === 'arms') {
      for (const sx of [-1, 1]) {
        const arm = limb(0.13 * s, 0.75 * s, 0.13 * s, mats.dark);
        arm.position.set(sx * (an.sideX + 0.04 * s), an.shoulderY, 0.12 * s);
        arm.rotation.x = -0.5; arm.rotation.z = sx * 0.15; arm.userData.swayAxis = 'x';
        g.add(arm); sway.push(arm);
      }
    } else if (mod === 'asym') {
      const sx = an.asymSide || 1;
      const block = M(0.5 * s, 0.45 * s, 0.5 * s, mats.body);
      block.position.set(sx * an.sideX * 0.85, an.shoulderY + 0.12 * s, 0);
      block.rotation.z = sx * 0.16; g.add(block);
    } else if (mod === 'tail') {
      const tail = limb(0.12 * s, 0.85 * s, 0.12 * s, mats.dark);
      tail.position.set(0, an.bodyY + 0.1 * s, an.backZ);
      tail.rotation.x = Math.PI - 0.55; tail.userData.swayAxis = 'z';
      g.add(tail); sway.push(tail);
    } else if (mod === 'brow') {
      const brow = M(0.7 * s, 0.14 * s, 0.3 * s);
      brow.position.set(0, an.eyeY + 0.16 * s, an.frontZ * 0.85);
      g.add(brow);
    }
  }
  if (sway.length) g.userData.sway = sway;
}

// mats: { body, dark, eye } — THREE materials supplied by the caller so
// temperament tints and infection stains stay the caller's business
export function buildForm(frameId, s, mats, form = NEUTRAL_FORM) {
  const g = new THREE.Group();
  const B = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat || mats.body);
  const { bw, bh, bd, legLen, legThick, head } = form;
  const legs = [];
  let eyeH = 1.9, mountH = 1.2, an;

  if (frameId === 'quad') {
    const L = 0.95 * legLen, bodyY = L + 0.2;
    const body = B(2.0 * bw * s, 0.9 * bh * s, 1.3 * bd * s); body.position.y = bodyY * s; g.add(body);
    const hd = B(0.55 * head * s, 0.5 * head * s, 0.7 * head * s, mats.dark);
    hd.position.set(0, (bodyY - 0.2) * s, 0.95 * bd * s); g.add(hd);
    const eye = B(0.34 * head * s, 0.09 * s, 0.05, mats.eye);
    eye.position.set(0, (bodyY - 0.15) * s, (0.95 * bd + 0.36 * head) * s); g.add(eye);
    for (const [lx, lz] of [[-0.75, 0.45], [0.75, 0.45], [-0.75, -0.45], [0.75, -0.45]]) {
      const leg = limb(0.24 * legThick * s, L * s, 0.24 * legThick * s, mats.dark);
      leg.position.set(lx * bw * s, L * s, lz * bd * s); g.add(leg); legs.push(leg);
    }
    eyeH = (bodyY - 0.15) * s; mountH = (bodyY + 0.35) * s;
    an = { topY: (bodyY + 0.45 * bh) * s, backZ: -0.65 * bd * s, sideX: 1.0 * bw * s, shoulderY: bodyY * s, bodyY: bodyY * s, eyeH, eyeY: eyeH, frontZ: 0.65 * bd * s };
  } else if (frameId === 'lowslung') {
    const L = 0.55 * legLen, bodyY = 0.5 * legLen + 0.1;
    const body = B(1.7 * bw * s, 0.55 * bh * s, 2.0 * bd * s); body.position.y = bodyY * s; g.add(body);
    const brow = B(1.1 * head * s, 0.25 * head * s, 0.3 * s, mats.dark);
    brow.position.set(0, (bodyY + 0.25) * s, 0.9 * bd * s); g.add(brow);
    const eye = B(0.7 * head * s, 0.08 * s, 0.05, mats.eye);
    eye.position.set(0, (bodyY + 0.12) * s, (0.9 * bd + 0.12) * s); g.add(eye);
    for (let i = 0; i < 3; i++) {
      for (const sx of [-1, 1]) {
        const leg = limb(0.16 * legThick * s, L * s, 0.16 * legThick * s, mats.dark);
        leg.position.set(sx * 0.95 * bw * s, 0.5 * legLen * s, (i - 1) * 0.7 * bd * s);
        leg.rotation.z = sx * 0.35;
        g.add(leg); legs.push(leg);
      }
    }
    eyeH = (bodyY + 0.12) * s; mountH = (bodyY + 0.35) * s;
    an = { topY: (bodyY + 0.28 * bh) * s, backZ: -1.0 * bd * s, sideX: 0.85 * bw * s, shoulderY: (bodyY + 0.15) * s, bodyY: bodyY * s, eyeH, eyeY: eyeH, frontZ: 1.0 * bd * s };
  } else if (frameId === 'stilt') {
    const L = 2.5 * legLen, legY = 2.35 * legLen, podY = legY + 0.25;
    const pod = B(0.85 * bw * s, 0.75 * bh * s, 0.85 * bd * s); pod.position.y = podY * s; g.add(pod);
    const ring = B(0.95 * bw * s, 0.12 * s, 0.95 * bd * s, mats.dark); ring.position.y = (legY - 0.07) * s; g.add(ring);
    const eye = B(0.5 * head * s, 0.1 * s, 0.05, mats.eye);
    eye.position.set(0, (podY + 0.06) * s, (0.02 + 0.42 * bd) * s); g.add(eye);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.5;
      const leg = limb(0.12 * legThick * s, L * s, 0.12 * legThick * s, mats.dark);
      leg.position.set(Math.sin(a) * 0.4 * s, legY * s, Math.cos(a) * 0.4 * s);
      leg.rotation.z = Math.sin(a) * 0.28;
      leg.rotation.x = -Math.cos(a) * 0.28;
      g.add(leg); legs.push(leg);
    }
    eyeH = (podY + 0.06) * s; mountH = (podY + 0.3) * s;
    an = { topY: (podY + 0.38 * bh) * s, backZ: -0.42 * bd * s, sideX: 0.42 * bw * s, shoulderY: podY * s, bodyY: podY * s, eyeH, eyeY: eyeH, frontZ: 0.42 * bd * s };
  } else if (frameId === 'colossal') {
    const L = 2.2 * legLen, bodyY = L;
    const body = B(1.4 * bw * s, 1.0 * bh * s, 1.8 * bd * s); body.position.y = bodyY * s; g.add(body);
    const cab = B(0.8 * head * s, 0.6 * head * s, 0.8 * head * s, mats.dark);
    cab.position.y = (bodyY + 0.75 * bh) * s; g.add(cab);
    const eye = B(0.5 * head * s, 0.12 * s, 0.05, mats.eye);
    eye.position.set(0, (bodyY + 0.8 * bh) * s, 0.42 * s); g.add(eye);
    for (const sx of [-1, 1]) {
      const leg = limb(0.3 * legThick * s, L * s, 0.4 * legThick * s, mats.dark);
      leg.position.set(sx * 0.6 * bw * s, L * s, 0); g.add(leg); legs.push(leg);
    }
    eyeH = (bodyY + 0.8 * bh) * s; mountH = (bodyY + 0.2) * s;
    an = { topY: (bodyY + 0.5 * bh) * s, backZ: -0.9 * bd * s, sideX: 0.7 * bw * s, shoulderY: (bodyY + 0.4 * bh) * s, bodyY: bodyY * s, eyeH, eyeY: eyeH, frontZ: 0.9 * bd * s };
  } else { // 'biped' — the makers' shape
    const L = 0.75 * legLen, bodyY = L + 0.35;
    const body = B(0.9 * bw * s, 1.4 * bh * s, 0.9 * bd * s); body.position.y = bodyY * s; g.add(body);
    const eye = B(0.5 * head * s, 0.08 * s, 0.05, mats.eye);
    eye.position.set(0, (bodyY + 0.4 * bh) * s, (0.02 + 0.45 * bd) * s); g.add(eye);
    for (const sx of [-1, 1]) {
      const leg = limb(0.22 * legThick * s, L * s, 0.22 * legThick * s, mats.dark);
      leg.position.set(sx * 0.28 * bw * s, L * s, 0); g.add(leg); legs.push(leg);
    }
    eyeH = (bodyY + 0.4 * bh) * s; mountH = (bodyY + 0.2) * s;
    an = { topY: (bodyY + 0.7 * bh) * s, backZ: -0.45 * bd * s, sideX: 0.45 * bw * s, shoulderY: (bodyY + 0.45 * bh) * s, bodyY: bodyY * s, eyeH, eyeY: eyeH, frontZ: 0.45 * bd * s };
  }
  if (form.mods && form.mods.length) applyMods(g, s, mats, form, an);
  g.userData.frame = frameId;
  g.userData.form = form;
  g.userData.legs = legs.length ? legs : undefined;
  g.userData.eyeH = eyeH;
  g.userData.mountH = mountH;
  return g;
}

// the neutral call: the five frames exactly as they have always looked
export function buildFrame(frameId, s, mats) {
  return buildForm(frameId, s, mats);
}

// a single body segment of a segmented machine: a carapace slab on two legs.
// segment count is the creature's DNA — the first parameterized axis of the
// botform sampler (frames as samples; see the producer's notes)
export function buildSegment(s, mats, isTail) {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.BoxGeometry(1.15 * s, 0.7 * s, (isTail ? 1.0 : 1.35) * s), mats.body);
  shell.position.y = 0.85 * s;
  if (isTail) shell.rotation.x = 0.18;
  g.add(shell);
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.4 * s, 0.22 * s, 1.1 * s), mats.dark);
  ridge.position.y = 1.32 * s;
  g.add(ridge);
  const legs = [];
  for (const sx of [-1, 1]) {
    const leg = limb(0.14 * s, 0.85 * s, 0.14 * s, mats.dark);
    leg.position.set(sx * 0.62 * s, 0.85 * s, 0);
    leg.rotation.z = sx * 0.5;
    g.add(leg); legs.push(leg);
  }
  g.userData.legs = legs;
  return g;
}

// one gait clock for everything with legs: phase-offset swings per frame kind.
// long legs slow the cadence (the form shapes the walk, not just the look);
// sway-tagged modifier meshes get a slow pendulum on top.
export function animateFrame(group, animT, stride) {
  const ud = group.userData;
  if (ud.sway) {
    for (let i = 0; i < ud.sway.length; i++) {
      const m = ud.sway[i], k = Math.sin(animT * 1.7 + i * 1.9) * 0.07;
      if (m.userData.swayAxis === 'x') m.rotation.x = -0.5 + k;
      else m.rotation.z = (i % 2 ? 0.15 : -0.15) + k;
    }
  }
  if (!ud.legs) return;
  const f = ud.frame;
  let rate = f === 'colossal' ? 2.6 : f === 'stilt' ? 3.2 : f === 'lowslung' ? 9 : f === 'quad' ? 5.5 : 6.5;
  if (ud.form && ud.form.legLen) rate /= Math.sqrt(ud.form.legLen);
  const amp = (f === 'colossal' ? 0.22 : f === 'stilt' ? 0.4 : 0.42) * Math.max(0.08, stride);
  ud.legs.forEach((leg, i) => {
    leg.rotation.x = Math.sin(animT * rate + (i % 2 ? Math.PI : 0) + (i >> 1) * 0.35) * amp;
  });
}
