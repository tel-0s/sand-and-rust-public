// The player: a mind in a chassis. The mesh is rebuilt from equipped parts,
// so swapping legs or arms visibly changes your body — and how it moves.
import * as THREE from 'three';
import { computeStats } from './parts.js';
import { clamp } from './noise.js';

const M = {
  body: new THREE.MeshLambertMaterial({ color: 0x8a8076 }),
  dark: new THREE.MeshLambertMaterial({ color: 0x4a443e }),
  eye: new THREE.MeshBasicMaterial({ color: 0xffc36b }),
  rust: new THREE.MeshLambertMaterial({ color: 0x9c4422 }),
  glow: new THREE.MeshBasicMaterial({ color: 0x6fe8d0 }),
};
function box(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.pos = new THREE.Vector3(8, 0, 8);
    this.vel = new THREE.Vector3();
    this.yaw = 0;             // facing
    this.grounded = true;
    this.hull = 100; this.energy = 80; this.corruption = 0;
    this.isPlayer = true;
    this.kvx = 0; this.kvz = 0;   // knockback velocity (decays)
    this.stats = null;
    this.attackCd = 0;
    this.animT = 0;
    this.barrierT = 0;        // aegis remaining
    this.surgeT = 0;          // hover glide remaining
    this.speedBoostT = 0;
    this.stunT = 0;           // corruption seizure
    this.parts = { legs: null, arms: [], torso: null, head: null };
  }

  recompute(equipped) {
    this.stats = computeStats(equipped);
    // THE THIRD BODY: rusted parts answer the blooming — +8% damage and
    // +1 armor per rusted piece worn, on top of the RUST_BOOST they carry
    if ((this.embraceLevel || 0) >= 3) {
      const rc = Object.values(equipped).filter(pt => pt && pt.rusted).length;
      if (rc) {
        this.stats.damage = Math.round(this.stats.damage * (1 + 0.08 * rc) * 10) / 10;
        this.stats.armor += rc;
      }
    }
    this.hull = Math.min(this.hull, this.stats.maxHull);
    this.energy = Math.min(this.energy, this.stats.energyCap);
    this.rebuildMesh(equipped);
  }

  rebuildMesh(equipped) {
    while (this.group.children.length) {
      const c = this.group.children.pop();
      c.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    const g = this.group;
    const rust = (p) => p && p.rusted;
    const torsoMat = this.fullBloom ? M.rust : rust(equipped.PLATING) ? M.rust : M.body;

    // torso: bulk scales with plating mass
    const bulky = equipped.PLATING && equipped.PLATING.stats.mass > 40;
    const torso = box(bulky ? 1.5 : 1.1, 1.2, bulky ? 1.1 : 0.8, torsoMat);
    // THE EMBRACE, worn openly: rust stains bloom across the chassis, two
    // per bloom, at fixed anchorages — the body stops hiding what it is
    if ((this.embraceLevel || 0) >= 1 || this.fullBloom) {
      const SPOTS = [[0.45, 1.7, 0.3], [-0.4, 1.3, -0.35], [0.2, 2.0, -0.3], [-0.5, 1.8, 0.25], [0.5, 1.1, -0.2], [-0.15, 2.15, 0.32]];
      const nStains = this.fullBloom ? SPOTS.length : this.embraceLevel * 2;
      for (let i = 0; i < Math.min(SPOTS.length, nStains); i++) {
        const [sx, sy, sz] = SPOTS[i];
        const stain = box(0.28 + i * 0.03, 0.22, 0.16, M.rust);
        stain.position.set(sx, sy, sz);
        stain.rotation.set(i * 0.7, i * 1.3, i * 0.4);
        g.add(stain);
      }
    }
    torso.position.y = 1.55;
    g.add(torso);
    if (this.fullBloom) {
      const ember = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3),
        new THREE.MeshBasicMaterial({ color: 0xff5a2a }));
      ember.position.set(0, 1.55, 0.42); ember.rotation.y = 0.6;
      g.add(ember);
    }
    const chest = box(0.5, 0.3, 0.12, M.glow);
    chest.position.set(0, 1.7, (bulky ? 0.56 : 0.41));
    g.add(chest);
    this.chestLamp = chest;

    // head from optics
    const head = box(0.55, 0.45, 0.55, rust(equipped.OPTICS) ? M.rust : M.dark);
    head.position.y = 2.4;
    g.add(head);
    const opt = equipped.OPTICS ? equipped.OPTICS.defId : 'basic_sensor';
    if (opt === 'wideband') {
      const dish = box(0.8, 0.08, 0.5, M.dark); dish.position.y = 2.7; g.add(dish);
    } else if (opt === 'hunter_optics') {
      for (let i = -1; i <= 1; i++) { const e = box(0.1, 0.1, 0.06, M.eye); e.position.set(i * 0.16, 2.42, 0.3); g.add(e); }
    }
    const eye = box(0.34, 0.1, 0.06, M.eye); eye.position.set(0, 2.45, 0.29); g.add(eye);

    // arms
    const armMat = rust(equipped.ARMS) ? M.rust : M.dark;
    const armDef = equipped.ARMS ? equipped.ARMS.defId : null;
    const armW = armDef === 'breaker_fist' ? 0.5 : 0.3;
    this.parts.arms = [];
    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      const upper = box(armW, 0.9, armW, armMat); upper.position.y = -0.35;
      arm.add(upper);
      if (armDef === 'bolt_caster' || armDef === 'arc_projector') {
        const barrel = box(0.18, 0.18, 0.8, M.dark); barrel.position.set(0, -0.75, 0.3); arm.add(barrel);
      } else if (armDef === 'shredder_claw') {
        for (let i = 0; i < 2; i++) { const cl = box(0.08, 0.4, 0.08, M.dark); cl.position.set((i - 0.5) * 0.18, -0.95, 0.08); arm.add(cl); }
      } else if (armDef === 'breaker_fist') {
        const fist = box(0.6, 0.5, 0.6, armMat); fist.position.y = -1.0; arm.add(fist);
      }
      arm.position.set(side * (bulky ? 0.95 : 0.75), 2.0, 0);
      g.add(arm);
      this.parts.arms.push(arm);
    }

    // legs by gait
    const legMat = rust(equipped.LEGS) ? M.rust : M.body;
    const gait = this.stats.gait;
    this.parts.legs = [];
    if (gait === 'tracked') {
      const tr = box(1.5, 0.7, 1.9, legMat); tr.position.y = 0.45; g.add(tr);
      for (const side of [-1, 1]) { const t = box(0.4, 0.55, 2.0, M.dark); t.position.set(side * 0.75, 0.4, 0); g.add(t); }
      this.baseY = 0.85;
    } else if (gait === 'hover') {
      const skirt = box(1.6, 0.35, 1.6, legMat); skirt.position.y = 0.55; g.add(skirt);
      const glow = box(1.2, 0.1, 1.2, M.glow); glow.position.y = 0.34; g.add(glow);
      this.hoverGlow = glow;
      this.baseY = 1.0;
    } else if (gait === 'quad') {
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const leg = new THREE.Group();
        const seg = box(0.22, 1.0, 0.22, legMat); seg.position.y = -0.5; leg.add(seg);
        leg.position.set(sx * 0.55, 1.0, sz * 0.45);
        leg.rotation.z = sx * 0.25;
        g.add(leg); this.parts.legs.push(leg);
      }
      this.baseY = 0.15;
    } else { // biped
      for (const side of [-1, 1]) {
        const leg = new THREE.Group();
        const seg = box(0.28, 1.0, 0.32, legMat); seg.position.y = -0.5; leg.add(seg);
        leg.position.set(side * 0.35, 1.0, 0);
        g.add(leg); this.parts.legs.push(leg);
      }
      this.baseY = 0.05;
    }

    // barrier bubble (hidden unless active)
    const bub = new THREE.Mesh(new THREE.SphereGeometry(2.1, 12, 9),
      new THREE.MeshBasicMaterial({ color: 0x6fe8d0, transparent: true, opacity: 0.18, depthWrite: false }));
    bub.position.y = 1.4; bub.visible = false;
    g.add(bub);
    this.bubble = bub;
  }

  update(dt, input, camYaw, world) {
    const s = this.stats;
    this.animT += dt;
    this.attackCd = Math.max(0, this.attackCd - dt);
    this.barrierT = Math.max(0, this.barrierT - dt);
    this.surgeT = Math.max(0, this.surgeT - dt);
    this.speedBoostT = Math.max(0, this.speedBoostT - dt);
    this.stunT = Math.max(0, this.stunT - dt);
    this.bubble.visible = this.barrierT > 0;

    // input direction relative to camera
    let mx = 0, mz = 0;
    if (this.stunT <= 0) {
      if (input.w) mz -= 1; if (input.s) mz += 1;
      if (input.a) mx -= 1; if (input.d) mx += 1;
    }
    const moving = (mx !== 0 || mz !== 0);
    let speed = s.speed;
    const sprinting = input.shift && moving && this.energy > 1;
    if (sprinting) speed *= 1.45;
    if (this.speedBoostT > 0) speed *= 1.5;
    if (this.surgeT > 0) speed *= 1.8;

    // slope handling per gait
    const h0 = world.getHeight(this.pos.x, this.pos.z);
    const ahead = 1.2;
    if (moving) {
      const len = Math.hypot(mx, mz);
      const sin = Math.sin(camYaw), cos = Math.cos(camYaw);
      // camera forward is (sin, cos); screen-right is (-cos, sin)
      const dx = (-mx * cos - mz * sin) / len, dz = (mx * sin - mz * cos) / len;
      const h1 = world.getHeight(this.pos.x + dx * ahead, this.pos.z + dz * ahead);
      const slope = (h1 - h0) / ahead; // rise per metre
      if (slope > 0.15 && s.gait !== 'hover') {
        const penalty = clamp(1 - (slope - 0.15) * (1.6 - s.slopeGrip * 1.4), 0.15, 1);
        speed *= penalty;
      }
      this.vel.x = dx * speed;
      this.vel.z = dz * speed;
      this.yaw = Math.atan2(dx, dz);
    } else {
      this.vel.x *= Math.pow(0.0001, dt);
      this.vel.z *= Math.pow(0.0001, dt);
    }

    // energy drains
    if (sprinting) this.spendEnergy(4.5 * dt);
    if (s.moveDrain && moving) this.spendEnergy(s.moveDrain * dt);
    this.energy = Math.min(s.energyCap, this.energy + s.energyRegen * dt * (moving ? 0.7 : 1));

    // jump
    if (input.jump && this.grounded && s.jump > 0 && this.stunT <= 0) {
      this.vel.y = s.jump;
      this.grounded = false;
      input.jump = false;
    }
    // horizontal motion first (movement + knockback), then resolve the ground
    this.pos.x += (this.vel.x + this.kvx) * dt;
    this.pos.z += (this.vel.z + this.kvz) * dt;
    const kd = Math.pow(0.006, dt); // knockback decay
    this.kvx *= kd; this.kvz *= kd;
    world.collide(this.pos, 0.9, this.pos.y - this.baseY);
    if (this.grounded) {
      // glued to the ground: follow slopes up and down without gravity flicker
      const gy = world.groundAt(this.pos.x, this.pos.z, this.pos.y - this.baseY + 0.05) + this.baseY;
      if (gy >= this.pos.y - 1.4) {
        this.pos.y = gy;
        this.vel.y = 0;
      } else {
        this.grounded = false; // the ground fell away — start falling
      }
    }
    if (!this.grounded) {
      this.vel.y -= 22 * dt;
      this.pos.y += this.vel.y * dt;
      const gy = world.groundAt(this.pos.x, this.pos.z, this.pos.y - this.baseY) + this.baseY;
      if (this.pos.y <= gy && this.vel.y <= 0) {
        // falling damage for heavy frames
        if (this.vel.y < -16) this.damage((-this.vel.y - 16) * 1.5, true);
        this.pos.y = gy; this.vel.y = 0; this.grounded = true;
      }
    }

    // pose — physics y is exact; the rendered body eases over fine terrain detail
    if (this.visY === undefined || Math.abs(this.pos.y - this.visY) > 2) this.visY = this.pos.y;
    else this.visY += (this.pos.y - this.visY) * Math.min(1, dt * 12);
    this.group.position.copy(this.pos);
    this.group.position.y = this.visY;
    this.group.rotation.y = this.yaw;
    const bob = moving && this.grounded ? Math.sin(this.animT * 9) : 0;
    if (s.gait === 'hover') {
      this.group.position.y += 0.25 + Math.sin(this.animT * 3) * 0.12;
      if (this.hoverGlow) this.hoverGlow.material.opacity = 0.6 + Math.sin(this.animT * 8) * 0.3;
    } else {
      this.group.position.y += bob * bob * 0.12; // sin² is smooth where |sin| kinks
      for (let i = 0; i < this.parts.legs.length; i++) {
        this.parts.legs[i].rotation.x = bob * 0.5 * (i % 2 === 0 ? 1 : -1);
      }
    }
    // attack swing
    const swing = this.attackCd > 0 ? Math.sin(this.attackCd * 18) * 0.9 : 0;
    if (this.parts.arms[1]) this.parts.arms[1].rotation.x = -swing - (moving ? bob * 0.25 : 0);
    if (this.parts.arms[0]) this.parts.arms[0].rotation.x = (moving ? bob * 0.25 : 0);
  }

  spendEnergy(n) { this.energy = Math.max(0, this.energy - n); }

  // shove from a hit; heavier chassis hold their ground
  knock(dx, dz, power) {
    const massFactor = 250 / (250 + this.stats.mass);
    this.kvx += dx * power * massFactor;
    this.kvz += dz * power * massFactor;
  }

  damage(amount, ignoreBarrier = false) {
    if (this.barrierT > 0 && !ignoreBarrier) return 0;
    const reduced = amount * (1 - this.stats.armor / 100);
    this.hull -= reduced;
    return reduced;
  }
}
