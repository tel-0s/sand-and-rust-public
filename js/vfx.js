// Lightweight transient effects: rings, arcs, beams. No textures, no particles —
// just short-lived geometry that tells you where your violence went.
import * as THREE from 'three';

export class VFX {
  constructor(scene) {
    this.scene = scene;
    this.live = [];
  }

  _add(mesh, dur, tick) {
    mesh.material.transparent = true;
    mesh.material.depthWrite = false;
    this.scene.add(mesh);
    this.live.push({ mesh, t: 0, dur, tick });
  }

  // expanding flat ring (slams, scans, pulses)
  ring(pos, { color = 0xe8a33d, r0 = 0.5, r1 = 5, dur = 0.35, y = 0.25, width = 0.35 } = {}) {
    const geo = new THREE.RingGeometry(1 - width / 2, 1 + width / 2, 28);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, opacity: 0.85 }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, pos.y + y, pos.z);
    this._add(mesh, dur, (fx, k) => {
      const r = r0 + (r1 - r0) * k;
      fx.mesh.scale.set(r, r, 1);
      fx.mesh.material.opacity = 0.85 * (1 - k);
    });
  }

  // melee arc: a sector flash in front of the attacker
  arc(pos, yaw, { range = 3.5, halfAngle = 1.1, color = 0xffd27f, dur = 0.18, y = 1.2 } = {}) {
    const geo = new THREE.RingGeometry(range * 0.35, range, 16, 1, -halfAngle, halfAngle * 2);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, opacity: 0.7 }));
    mesh.rotation.x = -Math.PI / 2;
    // RingGeometry theta measures from +x in its plane; after the X-rotation,
    // rotate so the sector's bisector points along world yaw
    mesh.rotation.z = yaw - Math.PI / 2;
    mesh.position.set(pos.x, pos.y + y, pos.z);
    this._add(mesh, dur, (fx, k) => {
      fx.mesh.material.opacity = 0.7 * (1 - k);
      fx.mesh.scale.setScalar(0.8 + k * 0.3);
    });
  }

  // full spin flash (whirl)
  cyclone(pos, { range = 4.6, color = 0xffd27f, dur = 0.4, y = 1.2 } = {}) {
    const geo = new THREE.RingGeometry(range * 0.4, range, 28);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, opacity: 0.75 }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, pos.y + y, pos.z);
    this._add(mesh, dur, (fx, k) => {
      fx.mesh.material.opacity = 0.75 * (1 - k);
      fx.mesh.rotation.z = k * 9;
      fx.mesh.scale.setScalar(0.5 + k * 0.6);
    });
  }

  // straight beam (thermal lance)
  // RUSTSIGHT: a small rust diamond that sings through walls, rises, fades
  rustsight(at) {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.34),
      new THREE.MeshBasicMaterial({ color: 0xff5a2a, transparent: true, opacity: 0.85, depthTest: false }));
    m.position.set(at.x, at.y, at.z);
    m.renderOrder = 999;
    this.scene.add(m);
    const y0 = at.y;
    this.live.push({ mesh: m, t: 0, dur: 2.2, tick: (fx, k) => {
      fx.mesh.position.y = y0 + k * 1.2;
      fx.mesh.rotation.y = k * 7;
      fx.mesh.material.opacity = 0.85 * (1 - k);
    } });
  }

  beam(from, dir, { length = 40, color = 0xff8855, dur = 0.22, radius = 0.12 } = {}) {
    const geo = new THREE.CylinderGeometry(radius, radius, length, 6);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, opacity: 0.8 }));
    const mid = from.clone().addScaledVector(dir, length / 2);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    this._add(mesh, dur, (fx, k) => {
      fx.mesh.material.opacity = 0.8 * (1 - k);
      fx.mesh.scale.x = fx.mesh.scale.z = 1 - k * 0.7;
    });
  }

  // hit spark at a point
  spark(pos, { color = 0xffd27f, dur = 0.15, size = 0.5 } = {}) {
    const geo = new THREE.OctahedronGeometry(size);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, opacity: 0.9 }));
    mesh.position.copy(pos);
    this._add(mesh, dur, (fx, k) => {
      fx.mesh.material.opacity = 0.9 * (1 - k);
      fx.mesh.scale.setScalar(1 + k * 2);
      fx.mesh.rotation.y = k * 4;
    });
  }

  // rising ring (mend, overcharge)
  rise(pos, { color = 0x6fe8d0, dur = 0.6, r = 1.6 } = {}) {
    const geo = new THREE.RingGeometry(r * 0.85, r, 22);
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide, opacity: 0.8 }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x, pos.y + 0.2, pos.z);
    const baseY = pos.y + 0.2;
    this._add(mesh, dur, (fx, k) => {
      fx.mesh.position.y = baseY + k * 2.6;
      fx.mesh.material.opacity = 0.8 * (1 - k);
    });
  }

  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const fx = this.live[i];
      fx.t += dt;
      const k = Math.min(1, fx.t / fx.dur);
      fx.tick(fx, k);
      if (k >= 1) {
        this.scene.remove(fx.mesh);
        fx.mesh.geometry.dispose();
        fx.mesh.material.dispose();
        this.live.splice(i, 1);
      }
    }
  }
}
