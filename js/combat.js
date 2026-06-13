// Pooled projectiles for both sides of the argument.
import * as THREE from 'three';

const geo = new THREE.SphereGeometry(0.22, 6, 5);

export class Projectiles {
  constructor(scene) {
    this.scene = scene;
    this.pool = [];
    this.active = [];
  }

  spawn({ from, dir, speed, dmg, friendly, color = 0xffd27f, life = 2.5, pierce = false, radius = 1.4 }) {
    let p = this.pool.pop();
    if (!p) {
      p = { mesh: new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color })) };
    }
    p.mesh.material.color.setHex(color);
    p.mesh.position.copy(from);
    p.vel = dir.clone().multiplyScalar(speed);
    p.dmg = dmg; p.friendly = friendly; p.life = life; p.pierce = pierce; p.radius = radius;
    p.hitSet = pierce ? new Set() : null;
    this.scene.add(p.mesh);
    this.active.push(p);
  }

  update(dt, world, player, enemyMgr, onEnemyHit, onPlayerHit, onBlocked, allies = []) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      const pos = p.mesh.position;
      let dead = p.life <= 0 || pos.y < world.getHeight(pos.x, pos.z) - 0.2;
      // structures stop shots — cover is real, for both sides
      if (!dead && world.projectileBlocked(pos.x, pos.y, pos.z)) {
        dead = true;
        if (onBlocked) onBlocked(pos);
      }
      if (!dead && p.friendly) {
        for (const e of enemyMgr.enemies) {
          if (p.hitSet && p.hitSet.has(e)) continue;
          const hitR = p.radius * e.def.scale + 0.4;
          if (pos.distanceToSquared(e.pos.clone().setY(e.pos.y + e.def.scale)) < hitR * hitR) {
            onEnemyHit(e, p.dmg, pos);
            if (p.hitSet) p.hitSet.add(e); else { dead = true; }
            break;
          }
        }
      } else if (!dead && !p.friendly) {
        for (const a of [player, ...allies]) {
          if (a.hp !== undefined && a.hp <= 0) continue;
          const pc = a.pos.clone(); pc.y += 1.4;
          if (pos.distanceToSquared(pc) < 1.7) {
            if (a.isPlayer) onPlayerHit(p.dmg);
            else a.damage(p.dmg);
            dead = true;
            break;
          }
        }
      }
      if (dead) {
        this.scene.remove(p.mesh);
        this.pool.push(p);
        this.active.splice(i, 1);
      }
    }
  }
}
