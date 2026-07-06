// PHOTO MODE: the desert holds still and lets you frame it.
// Free-cam (WASD + QE, shift for speed, right-drag or pointer-lock to look,
// wheel zooms FOV), roll, visibility toggles for the walker and the company,
// vignette / scanline / pixelation / tint dials, droppable point lights
// (swept on exit), and [F] to take the photograph — composited with the
// same effects the preview shows, then saved as a PNG.
import * as THREE from '../vendor/three.module.js';

const TINTS = {
  none: null,
  amber: 'rgba(255,180,80,0.14)',
  rust: 'rgba(200,90,40,0.16)',
  teal: 'rgba(60,200,190,0.12)',
  cold: 'rgba(90,130,255,0.13)',
  ash: 'rgba(128,128,128,0.0)', // mono handled via canvas filter
};

export class PhotoMode {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.keys = {};
    this.lights = [];
    this.state = { fov: 60, roll: 0, vignette: 0.55, scan: true, pixel: 1, tint: 'none', mono: false, speed: 12 };
    this._onKeyDown = (e) => this.keyDown(e);
    this._onKeyUp = (e) => { this.keys[e.key.toLowerCase()] = false; };
    this._onMouseMove = (e) => this.mouseMove(e);
    this._onWheel = (e) => { e.preventDefault(); this.setFov(this.state.fov + e.deltaY * 0.03); };
    // macOS right-drag fires the context menu — swallow it, and let ANY
    // button drag the view (the trigger is dead in photo mode anyway)
    this._onCtx = (e) => { e.preventDefault(); };
    this._onMouseDown = (e) => {
      if (e.target === this.game.renderer.domElement) { this._dragLook = true; e.preventDefault(); }
    };
    this._onMouseUp = () => { this._dragLook = false; };
  }

  toggle() { this.active ? this.exit() : this.enter(); }

  enter() {
    const g = this.game;
    this.active = true;
    this.saved = { fov: g.camera.fov };
    this.pos = g.camera.position.clone();
    this.yaw = g.camYaw + Math.PI; // face the way the play-camera faced
    this.pitch = -g.camPitch * 0.5;
    document.exitPointerLock && document.exitPointerLock();
    // the effect layers (vignette/scanlines/tint) LIVE inside #hud — hide
    // the interface, not the lens
    document.getElementById('hud').classList.add('photo-lens');
    document.addEventListener('keydown', this._onKeyDown, true);
    document.addEventListener('keyup', this._onKeyUp, true);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('contextmenu', this._onCtx);
    document.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);
    g.renderer.domElement.addEventListener('wheel', this._onWheel, { passive: false });
    this.buildPanel();
    this.applyFx();
  }

  exit() {
    const g = this.game;
    this.active = false;
    g.camera.fov = this.saved.fov;
    g.camera.rotation.z = 0;
    g.camera.updateProjectionMatrix();
    g.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    for (const L of this.lights) g.scene.remove(L.light);
    this.lights = [];
    if (g.player.mesh) g.player.mesh.visible = true;
    for (const f of g.followers.list()) if (f.mesh) f.mesh.visible = true;
    document.getElementById('hud').classList.remove('photo-lens');
    document.getElementById('vignette').style.background = '';
    document.getElementById('scanlines').style.opacity = '';
    const tintEl = document.getElementById('photo-tint');
    if (tintEl) tintEl.remove();
    const panel = document.getElementById('photo-panel');
    if (panel) panel.remove();
    document.removeEventListener('keydown', this._onKeyDown, true);
    document.removeEventListener('keyup', this._onKeyUp, true);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('contextmenu', this._onCtx);
    document.removeEventListener('mousedown', this._onMouseDown);
    document.removeEventListener('mouseup', this._onMouseUp);
    g.renderer.domElement.removeEventListener('wheel', this._onWheel);
    this.keys = {};
    this._dragLook = false;
  }

  keyDown(e) {
    const k = e.key.toLowerCase();
    if (k === 'p' || k === 'escape') { e.stopPropagation(); e.preventDefault(); this.exit(); return; }
    if (k === 'f') { e.stopPropagation(); e.preventDefault(); this.capture(); return; }
    if (['w', 'a', 's', 'd', 'q', 'e', 'shift', 'z', 'x'].includes(k)) {
      e.stopPropagation();
      this.keys[k] = true;
    }
  }

  mouseMove(e) {
    if (!this.active) return;
    // any-button drag that STARTED on the viewport looks; dial-drags don't
    if (!this._dragLook) return;
    this.yaw -= e.movementX * 0.0032;
    this.pitch = Math.min(1.5, Math.max(-1.5, this.pitch - e.movementY * 0.0026));
  }

  setFov(v) {
    this.state.fov = Math.min(110, Math.max(18, v));
    const el = document.getElementById('ph-fov');
    if (el) { el.value = this.state.fov; }
    const lb = document.getElementById('ph-fov-lb');
    if (lb) lb.textContent = Math.round(this.state.fov) + '°';
  }

  // called from the main loop every frame while active
  update(dt) {
    const g = this.game;
    const sp = this.state.speed * (this.keys.shift ? 4 : 1);
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    if (this.keys.w) { this.pos.x += sy * sp * dt; this.pos.z += cy * sp * dt; }
    if (this.keys.s) { this.pos.x -= sy * sp * dt; this.pos.z -= cy * sp * dt; }
    if (this.keys.a) { this.pos.x += cy * sp * dt; this.pos.z -= sy * sp * dt; }
    if (this.keys.d) { this.pos.x -= cy * sp * dt; this.pos.z += sy * sp * dt; }
    if (this.keys.q) this.pos.y += sp * dt;
    if (this.keys.e) this.pos.y -= sp * dt;
    if (this.keys.z) this.setRoll(this.state.roll - 40 * dt);
    if (this.keys.x) this.setRoll(this.state.roll + 40 * dt);
    g.camera.position.copy(this.pos);
    g.camera.rotation.order = 'YXZ';
    g.camera.rotation.set(this.pitch, this.yaw + Math.PI, this.state.roll * Math.PI / 180);
    if (g.camera.fov !== this.state.fov) { g.camera.fov = this.state.fov; g.camera.updateProjectionMatrix(); }
  }

  setRoll(v) {
    this.state.roll = Math.min(45, Math.max(-45, v));
    const el = document.getElementById('ph-roll');
    if (el) el.value = this.state.roll;
  }

  applyFx() {
    const g = this.game;
    const s = this.state;
    document.getElementById('vignette').style.background =
      `radial-gradient(ellipse at center, transparent ${Math.max(5, 70 - s.vignette * 50)}%, rgba(8,5,2,${(s.vignette * 0.9).toFixed(2)}) 100%)`;
    document.getElementById('scanlines').style.opacity = s.scan ? '0.5' : '0';
    g.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2) / s.pixel);
    let tintEl = document.getElementById('photo-tint');
    if (!tintEl) {
      tintEl = document.createElement('div');
      tintEl.id = 'photo-tint';
      tintEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:3;';
      document.getElementById('vignette').parentElement.insertBefore(tintEl, document.getElementById('vignette'));
    }
    tintEl.style.background = TINTS[s.tint] || 'transparent';
    g.renderer.domElement.style.filter = s.mono ? 'saturate(0.08) contrast(1.08)' : '';
  }

  dropLight() {
    if (this.lights.length >= 4) return;
    const g = this.game;
    const light = new THREE.PointLight(0xffd9a0, 60, 40);
    light.position.copy(this.pos);
    g.scene.add(light);
    this.lights.push({ light });
    this.renderLightRows();
  }

  renderLightRows() {
    const box = document.getElementById('ph-lights');
    if (!box) return;
    box.innerHTML = '';
    this.lights.forEach((L, i) => {
      const row = document.createElement('div');
      row.className = 'ph-row';
      row.innerHTML = `<span>◈ light ${i + 1}</span>`;
      const inten = document.createElement('input');
      inten.type = 'range'; inten.min = 5; inten.max = 200; inten.value = L.light.intensity;
      inten.oninput = () => { L.light.intensity = Number(inten.value); };
      const col = document.createElement('select');
      for (const [name, hex] of [['warm', 0xffd9a0], ['white', 0xffffff], ['teal', 0x59d9c9], ['rust', 0xd95a28], ['violet', 0x9a6cff]]) {
        const o = document.createElement('option');
        o.value = hex; o.textContent = name;
        col.appendChild(o);
      }
      col.onchange = () => L.light.color.setHex(Number(col.value));
      const del = document.createElement('button');
      del.textContent = '✕';
      del.onclick = () => { this.game.scene.remove(L.light); this.lights.splice(i, 1); this.renderLightRows(); };
      row.append(inten, col, del);
      box.appendChild(row);
    });
  }

  capture() {
    const g = this.game;
    // render fresh, then composite the preview effects onto a 2D canvas so
    // the PNG matches what the eye saw (CSS overlays aren't in the GL buffer)
    g.renderer.render(g.scene, g.camera);
    const src = g.renderer.domElement;
    const cv = document.createElement('canvas');
    cv.width = src.width; cv.height = src.height;
    const ctx = cv.getContext('2d');
    if (this.state.mono) ctx.filter = 'saturate(0.08) contrast(1.08)';
    ctx.drawImage(src, 0, 0);
    ctx.filter = 'none';
    const s = this.state;
    if (TINTS[s.tint]) { ctx.fillStyle = TINTS[s.tint]; ctx.fillRect(0, 0, cv.width, cv.height); }
    if (s.scan) {
      ctx.fillStyle = 'rgba(0,0,0,0.05)';
      const step = Math.max(2, Math.round(3 * (src.height / src.clientHeight || 1)));
      for (let y = 0; y < cv.height; y += step) ctx.fillRect(0, y, cv.width, Math.max(1, step / 3));
    }
    if (s.vignette > 0.02) {
      const grad = ctx.createRadialGradient(cv.width / 2, cv.height / 2, Math.min(cv.width, cv.height) * (0.7 - s.vignette * 0.5) * 0.7,
        cv.width / 2, cv.height / 2, Math.hypot(cv.width, cv.height) / 2);
      grad.addColorStop(0, 'rgba(8,5,2,0)');
      grad.addColorStop(1, `rgba(8,5,2,${(s.vignette * 0.9).toFixed(2)})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, cv.width, cv.height);
    }
    cv.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `sand-and-rust_${g.seedPhrase || 'photo'}_day${1 + Math.floor(g.worldT)}_${Date.now() % 100000}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }, 'image/png');
    // the shutter blink
    const flash = document.createElement('div');
    flash.style.cssText = 'position:fixed;inset:0;background:#fff;opacity:0.5;z-index:99;pointer-events:none;transition:opacity 0.25s;';
    document.body.appendChild(flash);
    requestAnimationFrame(() => { flash.style.opacity = '0'; setTimeout(() => flash.remove(), 300); });
  }

  buildPanel() {
    const g = this.game;
    const p = document.createElement('div');
    p.id = 'photo-panel';
    p.innerHTML = `<div class="ph-title">▣ PHOTO MODE</div>
      <div class="ph-help">WASD move · Q/E rise & sink · SHIFT fast · drag the view to look · wheel zoom · Z/X roll · [F] photograph · [P] leave</div>`;
    const row = (label, el) => {
      const r = document.createElement('div');
      r.className = 'ph-row';
      const sp = document.createElement('span'); sp.textContent = label;
      r.append(sp, el);
      p.appendChild(r);
      return r;
    };
    const slider = (id, min, max, val, step, fn) => {
      const el = document.createElement('input');
      el.type = 'range'; el.id = id; el.min = min; el.max = max; el.value = val; el.step = step;
      el.oninput = () => fn(Number(el.value));
      return el;
    };
    const fv = row('field of view', slider('ph-fov', 18, 110, this.state.fov, 1, (v) => { this.state.fov = v; document.getElementById('ph-fov-lb').textContent = Math.round(v) + '°'; }));
    const lb = document.createElement('b'); lb.id = 'ph-fov-lb'; lb.textContent = this.state.fov + '°';
    fv.appendChild(lb);
    row('roll', slider('ph-roll', -45, 45, 0, 1, (v) => { this.state.roll = v; }));
    row('vignette', slider('ph-vig', 0, 1, this.state.vignette, 0.05, (v) => { this.state.vignette = v; this.applyFx(); }));
    row('pixelation', slider('ph-pix', 1, 6, 1, 1, (v) => { this.state.pixel = v; this.applyFx(); }));
    const scan = document.createElement('input');
    scan.type = 'checkbox'; scan.checked = this.state.scan;
    scan.onchange = () => { this.state.scan = scan.checked; this.applyFx(); };
    row('scanlines', scan);
    const mono = document.createElement('input');
    mono.type = 'checkbox';
    mono.onchange = () => { this.state.mono = mono.checked; this.applyFx(); };
    row('monochrome', mono);
    const tint = document.createElement('select');
    for (const t of Object.keys(TINTS)) {
      const o = document.createElement('option'); o.value = t; o.textContent = t;
      tint.appendChild(o);
    }
    tint.onchange = () => { this.state.tint = tint.value; this.applyFx(); };
    row('tint', tint);
    const pv = document.createElement('input');
    pv.type = 'checkbox'; pv.checked = true;
    pv.onchange = () => { if (g.player.mesh) g.player.mesh.visible = pv.checked; };
    row('the walker', pv);
    const cv2 = document.createElement('input');
    cv2.type = 'checkbox'; cv2.checked = true;
    cv2.onchange = () => { for (const f of g.followers.list()) if (f.mesh) f.mesh.visible = cv2.checked; };
    row('the company', cv2);
    const drop = document.createElement('button');
    drop.textContent = '◈ drop a light here';
    drop.onclick = () => this.dropLight();
    row('lights (swept on exit)', drop);
    const lightsBox = document.createElement('div');
    lightsBox.id = 'ph-lights';
    p.appendChild(lightsBox);
    const shoot = document.createElement('button');
    shoot.className = 'ph-shoot';
    shoot.textContent = '▣ TAKE THE PHOTOGRAPH [F]';
    shoot.onclick = () => this.capture();
    p.appendChild(shoot);
    document.body.appendChild(p);
  }
}
