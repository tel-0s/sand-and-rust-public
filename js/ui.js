// HUD + panels. The interface is part of the fiction: you ARE the machine,
// and this is your firmware talking.
import { SLOTS, ABILITIES, abilityPower } from './parts.js';
import { SETTINGS, saveSettings, VIEW_DIST, DIFFICULTY } from './settings.js';
import { MATERIALS, CONSUMABLES, RECIPES, canCraft } from './items.js';
import { MAP_COLORS, BIOMES } from './biomes.js';
import { CHUNK } from './world.js';
import { formerDesignation } from './transmit.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor(game) {
    this.game = game;
    this.activePanel = null;
    this.invTab = 'parts';
    this.selected = null; // {part, equippedSlot|null}
    this.barEls = new Map();

    // compass strip: 3 copies for wraparound
    const strip = $('compass-strip');
    const labels = ['N', '·', 'NE', '·', 'E', '·', 'SE', '·', 'S', '·', 'SW', '·', 'W', '·', 'NW', '·'];
    let html = '';
    for (let c = 0; c < 3; c++) for (let i = 0; i < 16; i++) {
      html += `<span class="${labels[i].length <= 1 && labels[i] !== '·' ? 'card' : ''} ${labels[i] === '·' ? '' : 'card'}">${labels[i]}</span>`;
    }
    strip.innerHTML = html;

    // scope to the body panel: the settings panel reuses .inv-tab styling
    this.invCat = 'all';
    document.querySelectorAll('#panel-body .inv-tab').forEach(b =>
      b.addEventListener('click', () => {
        this.invTab = b.dataset.tab;
        this.invCat = 'all';
        this.renderBody();
      }));

    // map view state + interactions: drag pans, wheel zooms, click sets waypoint
    this.mapView = { cx: 0, cz: 0, px: 8 }; // centre (world coords) + pixels per chunk
    const cv = $('map-canvas');
    // the canvas is CSS-scaled (max-height) — convert display px to canvas px
    const toCanvas = (e) => {
      const r = cv.getBoundingClientRect();
      return [(e.clientX - r.left) * (cv.width / r.width), (e.clientY - r.top) * (cv.height / r.height)];
    };
    let dragging = false, moved = 0, lastX = 0, lastY = 0;
    cv.addEventListener('mousedown', (e) => { dragging = true; moved = 0; [lastX, lastY] = toCanvas(e); });
    cv.addEventListener('mousemove', (e) => {
      if (!dragging) return;
      const [mx, my] = toCanvas(e);
      const dx = mx - lastX, dy = my - lastY;
      moved += Math.abs(dx) + Math.abs(dy);
      lastX = mx; lastY = my;
      this.mapView.cx -= (dx / this.mapView.px) * CHUNK;
      this.mapView.cz -= (dy / this.mapView.px) * CHUNK;
      this.renderMap();
    });
    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      if (moved < 5 && e.type === 'mouseup') this.mapClick(...toCanvas(e));
    };
    cv.addEventListener('mouseup', endDrag);
    cv.addEventListener('mouseleave', endDrag);
    cv.addEventListener('wheel', (e) => {
      e.preventDefault();
      const f = e.deltaY < 0 ? 1.25 : 0.8;
      this.mapView.px = Math.min(28, Math.max(2, this.mapView.px * f));
      this.renderMap();
    }, { passive: false });
    window.addEventListener('resize', () => {
      if (this.activePanel === 'map') { this.fitMapCanvas(); this.renderMap(); }
    });
  }

  mapToWorld(sx, sy) {
    const cv = $('map-canvas');
    const v = this.mapView;
    return [
      v.cx + ((sx - cv.width / 2) / v.px) * CHUNK,
      v.cz + ((sy - cv.height / 2) / v.px) * CHUNK,
    ];
  }

  mapClick(sx, sy) {
    const g = this.game;
    const [wx, wz] = this.mapToWorld(sx, sy);
    if (g.waypoint) {
      // clicking on (or near) the existing waypoint clears it
      const v = this.mapView;
      const mx = $('map-canvas').width / 2 + ((g.waypoint.x - v.cx) / CHUNK) * v.px;
      const my = $('map-canvas').height / 2 + ((g.waypoint.z - v.cz) / CHUNK) * v.px;
      if (Math.hypot(sx - mx, sy - my) < 14) {
        g.waypoint = null;
        this.toast('waypoint cleared');
        this.renderMap();
        return;
      }
    }
    g.waypoint = { x: Math.round(wx), z: Math.round(wz) };
    this.toast(`waypoint set — ${Math.round(Math.hypot(wx - g.player.pos.x, wz - g.player.pos.z))} m out`);
    this.renderMap();
  }

  // ---------- transient feedback ----------
  toast(msg, cls = '') {
    const el = document.createElement('div');
    el.className = 'toast ' + cls;
    el.textContent = msg;
    $('toast-stack').appendChild(el);
    setTimeout(() => el.remove(), 4200);
  }

  // THE ROAD TALK: the company's voice, a caption above the hotbar
  banter(name, text) {
    let el = document.getElementById('banter');
    if (!el) {
      el = document.createElement('div');
      el.id = 'banter';
      document.getElementById('hud').appendChild(el);
    }
    el.innerHTML = `<span class="banter-name">${name}</span> — “${text}”`;
    el.classList.remove('show');
    void el.offsetWidth; // restart the fade
    el.classList.add('show');
    clearTimeout(this._banterTo);
    this._banterTo = setTimeout(() => el.classList.remove('show'), 6500);
  }

  // THE STATIC: a full-screen reassembly burst on arriving down the line
  txStatic() {
    const el = document.createElement('div');
    el.className = 'tx-static';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1300);
  }

  float(screenX, screenY, text, cls = '') {
    const el = document.createElement('div');
    el.className = 'dmg-float ' + cls;
    el.textContent = text;
    el.style.left = screenX + 'px'; el.style.top = screenY + 'px';
    $('float-layer').appendChild(el);
    setTimeout(() => el.remove(), 800);
  }

  showInteract(html) {
    const el = $('interact-prompt');
    if (!html) { el.classList.add('hidden'); return; }
    el.innerHTML = html;
    el.classList.remove('hidden');
  }

  // ---------- HUD ----------
  updateHUD(camYaw) {
    const g = this.game, p = g.player, s = p.stats;
    $('bar-hull').style.width = Math.max(0, (p.hull / s.maxHull) * 100) + '%';
    // ceil for display, but never above the (rounded) maximum — no more 114/113
    const maxShown = Math.round(s.maxHull);
    $('hull-num').textContent = `${Math.min(maxShown, Math.ceil(Math.max(0, p.hull)))}/${maxShown}`;
    $('bar-energy').style.width = Math.max(0, (p.energy / s.energyCap) * 100) + '%';
    $('energy-num').textContent = `${Math.ceil(p.energy)}/${Math.round(s.energyCap)}`;
    $('bar-corr').style.width = p.corruption + '%';
    $('corr-num').textContent = Math.round(p.corruption) + '%';
    $('corr-row').style.display = (p.corruption > 0 || s.corruptionRate > 0) ? 'flex' : 'none';
    // an answered letter renames the meter: it is not an infection anymore
    const corrLbl = g.embrace !== null ? 'COMMUNION' : 'RUST';
    if (this._corrLbl !== corrLbl) {
      this._corrLbl = corrLbl;
      document.querySelector('#corr-row .bar-label').textContent = corrLbl;
    }
    // the ones who walk with you — every chair, not just the first
    const company = g.followers ? g.followers.list() : [];
    const ft = $('follower-tag');
    if (company.length) {
      ft.classList.remove('hidden');
      ft.innerHTML = company.map(f =>
        `<div>◆ ${f.name} — ${g.followers.shownArchetype(f)} <span class="ft-hp">${Math.max(0, Math.ceil(f.hp))}/${f.maxHp}</span></div>`).join('');
    } else ft.classList.add('hidden');
    $('glitch-overlay').style.opacity = p.corruption > 25 ? Math.min(0.85, (p.corruption - 25) / 80) : 0;

    // compass: 16 ticks * 60px per full turn; 3 strip copies make it seamless
    // (sandstorms make the needle swim)
    const jitter = (g.storm || 0) > 0.1 ? (Math.random() - 0.5) * g.storm * 0.45 : 0;
    const heading = ((Math.PI - camYaw + jitter) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
    const px = (heading / (Math.PI * 2)) * 960;
    $('compass-strip').style.left = (-780 - px) + 'px';
    // waypoint marker rides the compass; clamps to the edge when off-axis
    const way = $('compass-way'), wayInfo = $('waypoint-info');
    if (g.waypoint) {
      const bearing = Math.PI - Math.atan2(g.waypoint.x - p.pos.x, g.waypoint.z - p.pos.z);
      let rel = bearing - heading;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      const wx = Math.min(404, Math.max(6, 210 + (rel / (Math.PI * 2)) * 960));
      way.style.left = wx + 'px';
      way.classList.remove('hidden');
      wayInfo.textContent = `◇ ${Math.round(Math.hypot(g.waypoint.x - p.pos.x, g.waypoint.z - p.pos.z))} m`;
      wayInfo.classList.remove('hidden');
    } else {
      way.classList.add('hidden');
      wayInfo.classList.add('hidden');
    }
    // the pinned job rides the compass too, in teal
    const taskEl = $('compass-task'), panel = $('track-panel');
    let pin = null; // {x, z, title, desc}
    if (g.tracked && g.tracked.kind === 'chain') {
      const ch = g.chains.find(c => c.id === g.tracked.id && !c.done);
      const cur = ch && ch.steps[ch.current];
      if (cur && cur.x !== undefined) pin = { x: cur.x, z: cur.z, title: ch.title, desc: cur.desc };
    } else if (g.tracked && g.tracked.kind === 'signal') {
      const q = g.quests.find(q => q.id === g.tracked.id && !q.done);
      if (q) pin = { x: q.x, z: q.z, title: q.title, desc: 'reach the signal source' };
    } else if (g.tracked && g.tracked.kind === 'proving' && g.proving) {
      pin = { x: g.proving.x, z: g.proving.z, title: 'THE PROVING', desc: `the deep room of ${g.proving.megaName} — take what it keeps` };
    } else if (g.tracked && g.tracked.kind === 'war' && g.war && g.war.front) {
      const f = g.war.front;
      const c = f.phase === 'marching' && g.warSys ? g.warSys.columnAt()
        : f.phase === 'siege' ? { x: f.x, z: f.z } : { x: f.heartX, z: f.heartZ };
      pin = {
        x: c.x, z: c.z, title: `THE FRONT AGAINST ${f.stillName.toUpperCase()}`,
        desc: f.phase === 'massing' ? `massing — it marches on day ${1 + f.marchDay}`
          : f.phase === 'marching' ? 'the column is on the road' : 'the siege is at the wall',
      };
    } else if (g.tracked && g.tracked.kind === 'epic' && g.epic) {
      pin = g.epic.state === 'seek'
        ? { x: g.epic.x, z: g.epic.z, title: `THE RECOMMISSION OF ${g.epic.npcName.toUpperCase()}`, desc: `take the Shaper from the Mother beneath ${g.epic.megaName}` }
        : { x: g.epic.stillX, z: g.epic.stillZ, title: `THE RECOMMISSION OF ${g.epic.npcName.toUpperCase()}`, desc: `surrender the Shaper to the well at ${g.epic.stillName}` };
    }
    if (pin) {
      const bearing = Math.PI - Math.atan2(pin.x - p.pos.x, pin.z - p.pos.z);
      let rel = bearing - heading;
      while (rel > Math.PI) rel -= Math.PI * 2;
      while (rel < -Math.PI) rel += Math.PI * 2;
      taskEl.style.left = Math.min(404, Math.max(6, 210 + (rel / (Math.PI * 2)) * 960)) + 'px';
      taskEl.classList.remove('hidden');
      panel.classList.remove('hidden');
      $('track-title').textContent = pin.title;
      $('track-step').textContent = pin.desc;
      $('track-dist').textContent = `◈ ${Math.round(Math.hypot(pin.x - p.pos.x, pin.z - p.pos.z))} m`;
    } else {
      taskEl.classList.add('hidden');
      panel.classList.add('hidden');
    }

    $('locale-region').textContent = g.regionName || '';
    $('locale-biome').textContent = g.biomeName || '';
    $('locale-clock').textContent = g.clockText || '';

    // hotbar
    for (let i = 0; i < 4; i++) {
      const slot = g.abilitySlots[i];
      const el = this.hotbarEls[i];
      if (!slot || !slot.ab) { el.classList.add('empty'); el.querySelector('.hk-icon').textContent = '·'; el.querySelector('.hk-name').textContent = '—'; continue; }
      el.classList.remove('empty');
      el.querySelector('.hk-icon').textContent = slot.ab.icon;
      el.querySelector('.hk-name').textContent = slot.ab.name;
      const cdFrac = g.abilityCds[i] > 0 ? g.abilityCds[i] / slot.ab.cd : 0;
      el.querySelector('.hk-cd').style.transform = `scaleY(${cdFrac})`;
      el.classList.toggle('nopower', p.energy < slot.ab.cost);
    }
  }

  buildHotbar() {
    const bar = $('hotbar');
    bar.innerHTML = '';
    this.hotbarEls = [];
    for (let i = 0; i < 4; i++) {
      const el = document.createElement('div');
      el.className = 'hotkey';
      el.innerHTML = `<span class="hk-num">${i + 1}</span><span class="hk-icon"></span><span class="hk-name"></span><div class="hk-cd"></div>`;
      bar.appendChild(el);
      this.hotbarEls.push(el);
    }
  }

  updateEnemyBars(enemies, camera, renderer) {
    const layer = $('float-layer');
    const w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    const seen = new Set();
    for (const e of enemies) {
      if (e.state !== 'chase' || e.hp >= e.maxHp && e.pos.distanceTo(this.game.player.pos) > 40) continue;
      const v = e.pos.clone(); v.y += e.def.scale * 2.4;
      v.project(camera);
      if (v.z > 1) continue;
      const sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * h;
      let bar = this.barEls.get(e);
      if (!bar) {
        bar = document.createElement('div');
        bar.className = 'npc-bar';
        bar.innerHTML = '<div></div>';
        layer.appendChild(bar);
        this.barEls.set(e, bar);
      }
      bar.style.left = (sx - 26) + 'px'; bar.style.top = sy + 'px';
      bar.firstChild.style.width = Math.max(0, (e.hp / e.maxHp) * 100) + '%';
      seen.add(e);
    }
    for (const [e, bar] of this.barEls) {
      if (!seen.has(e) || e.hp <= 0) { bar.remove(); this.barEls.delete(e); }
    }
  }

  // ---------- dialogue ----------
  renderDialogue(session) {
    const $id = (i) => document.getElementById(i);
    // speaking with the Rust wears its own skin: rust-red, glitching
    $id('panel-dialogue').classList.toggle('dlg-rust', !!session.npc.isRust);
    // the Rust has no standing to measure and no subjects to file
    $id('dlg-topics').style.display = (session.npc.isRust || session.npc.isRecord) ? 'none' : '';
    $id('dlg-disp').style.display = (session.npc.isRust || session.npc.isRecord) ? 'none' : '';
    $id('dlg-name').textContent = session.npc.name;
    $id('dlg-role').textContent = session.npc.role.toUpperCase();
    $id('dlg-still').textContent = `${session.npc.still.name} — ${session.temperamentLabel}`;
    const disp = $id('dlg-disp');
    disp.textContent = `${session.tier.label} (${Math.round(session.effD)})`;
    disp.className = session.tier.cls;
    $id('dlg-text').innerHTML = session.lines.map(l =>
      l.sys ? `<div class="dlg-sys">${l.text}</div>`
        : l.narrate ? `<div class="dlg-narrate">${l.html ?? l.text}</div>`
        : `<div>“${l.html ?? l.text}”</div>`).join('');
    const box = $id('dlg-text');
    box.querySelectorAll('.tw').forEach(el =>
      el.addEventListener('click', () => this.game.dialogueAction('topic:' + el.dataset.t)));
    box.scrollTop = box.scrollHeight;
    // the rail: newest subjects up front; a well-traveled mind files the
    // rest under headings — a still, a place, a name, an idea
    const rail = $id('dlg-topic-list');
    rail.innerHTML = '';
    const all = session.topics || [];
    if (session.npc !== this._dlgNpc) { this._dlgNpc = session.npc; this.dlgTopicCat = null; }
    const CATS = [
      { id: 'still', label: 'a still', kinds: ['s'] },
      { id: 'place', label: 'a place', kinds: ['m', 'r'] },
      { id: 'name', label: 'a name', kinds: ['p'] },
      { id: 'idea', label: 'an idea', kinds: ['c'] },
    ];
    const chip = (t) => {
      const b = document.createElement('button');
      b.className = 'dlg-topic' + (t.fresh ? ' fresh' : '');
      b.textContent = t.label;
      b.addEventListener('click', () => this.game.dialogueAction('topic:' + t.id));
      rail.appendChild(b);
    };
    if (all.length <= 10 && !this.dlgTopicCat) {
      for (const t of all) chip(t);
    } else if (this.dlgTopicCat) {
      const cat = CATS.find(c => c.id === this.dlgTopicCat);
      const back = document.createElement('button');
      back.className = 'dlg-topic dlg-topic-cat';
      back.textContent = '← all subjects';
      back.addEventListener('click', () => { this.dlgTopicCat = null; this.game.renderDlg(); });
      rail.appendChild(back);
      for (const t of all.filter(t => cat.kinds.includes(t.kind || t.id[0]))) chip(t);
    } else {
      const recent = all.slice(0, 6);
      for (const t of recent) chip(t);
      for (const cat of CATS) {
        const items = all.filter(t => cat.kinds.includes(t.kind || t.id[0]));
        if (!items.length) continue;
        const b = document.createElement('button');
        b.className = 'dlg-topic dlg-topic-cat' + (items.some(t => t.fresh) ? ' fresh' : '');
        b.textContent = `${cat.label}… (${items.length})`;
        b.addEventListener('click', () => { this.dlgTopicCat = cat.id; this.game.renderDlg(); });
        rail.appendChild(b);
      }
    }
    const opts = $id('dlg-options');
    opts.innerHTML = '';
    for (const o of session.options) {
      if (o.header) {
        const h = document.createElement('div');
        h.className = 'dlg-trade-head';
        h.textContent = o.header;
        opts.appendChild(h);
        continue;
      }
      if (o.input) {
        // an option that asks for words: a label, a field, a confirm
        const wrap = document.createElement('div');
        wrap.className = 'dlg-opt dlg-opt-input';
        const lab = document.createElement('div'); lab.textContent = o.label; wrap.appendChild(lab);
        const inp = document.createElement('input');
        inp.type = 'text'; inp.maxLength = 20; inp.placeholder = o.placeholder || '';
        inp.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Enter') go.click(); });
        const go = document.createElement('button');
        go.className = 'dlg-opt'; go.textContent = '✓ so name it';
        go.addEventListener('click', () => { if (inp.value.trim()) this.game.dialogueAction(o.id + ':' + encodeURIComponent(inp.value)); });
        wrap.appendChild(inp); wrap.appendChild(go);
        opts.appendChild(wrap);
        continue;
      }
      const b = document.createElement('button');
      b.className = 'dlg-opt' + (o.disabled ? ' disabled' : '') + (o.cls ? ' ' + o.cls : '');
      b.innerHTML = o.label + (o.price !== undefined ? `<span class="opt-price">${o.price} ▤</span>` : '');
      if (!o.disabled) b.addEventListener('click', () => this.game.dialogueAction(o.id));
      opts.appendChild(b);
    }
  }

  // ---------- panels ----------
  toggle(name) {
    if (this.activePanel === name) { this.closePanel(); return; }
    this.closePanel();
    this.activePanel = name;
    $('panel-' + name).classList.remove('hidden');
    if (name === 'body') this.renderBody();
    if (name === 'map') { this.centerMapOnPlayer(); this.fitMapCanvas(); this.renderMap(); }
    if (name === 'journal') this.renderJournal();
    if (name === 'settings') this.renderSettings();
    document.exitPointerLock && document.exitPointerLock();
  }
  closePanel() {
    if (!this.activePanel) return false;
    $('panel-' + this.activePanel).classList.add('hidden');
    $('part-detail').classList.add('hidden');
    this.activePanel = null;
    this.selected = null;
    return true;
  }

  // ---------- body / inventory / craft ----------
  renderBody() {
    const g = this.game;
    const sc = $('slot-column');
    sc.innerHTML = '';
    for (const slot of SLOTS) {
      const p = g.equipped[slot];
      const card = document.createElement('div');
      card.className = 'slot-card' + (p && p.rusted ? ' rusted' : '') + (this.selected && this.selected.equippedSlot === slot ? ' selected' : '');
      card.innerHTML = p
        ? `<div class="sc-slot">${slot}</div><div class="sc-name">${p.name}</div><div class="sc-meta">${p.tierName}${p.rusted ? ' · RUST-GROWN' : ''}${p.ability ? ' · [' + ABILITIES[p.ability].name + ']' : ''}</div>`
        : `<div class="sc-slot">${slot}</div><div class="sc-name" style="color:var(--amber-dim)">— empty —</div><div class="sc-meta">&nbsp;</div>`;
      if (p) card.addEventListener('click', () => this.selectPart(p, slot));
      sc.appendChild(card);
    }

    // derived stats
    const s = g.player.stats;
    const rows = [
      ['HULL', `${Math.round(s.maxHull)}`],
      ['ARMOR', `${Math.round(s.armor)}%`],
      ['MASS', `${Math.round(s.mass)} kg`],
      ['SPEED', `${s.speed.toFixed(1)} m/s`],
      ['POWER', `${Math.round(s.powerDraw)} / ${Math.round(s.powerOut)} ${s.brownout ? '⚠ BROWNOUT' : ''}`],
      ['PWR CAP', `${Math.round(s.energyCap)} (+${s.energyRegen.toFixed(1)}/s)`],
      ['DAMAGE', `${s.damage.toFixed(0)} (${s.attackKind})`],
      ['SLOPE GRIP', `${Math.round(s.slopeGrip * 100)}%`],
      ['SCAN', `${Math.round(s.scanRadius)} m`],
      ['RUST GAIN', s.corruptionRate > 0 ? `+${s.corruptionRate.toFixed(1)}/min ⚠` : 'none'],
    ];
    $('body-stats').innerHTML = '<div class="st-head">CHASSIS TELEMETRY</div>' + rows.map(([k, v]) =>
      `<div class="st-row${v.includes('⚠') ? ' st-warn' : ''}"><span>${k}</span><span>${v}</span></div>`).join('');

    // keep the tab highlight honest
    document.querySelectorAll('#panel-body .inv-tab').forEach(x =>
      x.classList.toggle('active', x.dataset.tab === this.invTab));

    // inventory
    const list = $('inv-list');
    list.innerHTML = '';
    const chips = (cats) => {
      const wrap = document.createElement('div');
      wrap.className = 'inv-cats';
      for (const c of cats) {
        const b = document.createElement('button');
        b.className = 'inv-cat' + (this.invCat === c ? ' active' : '');
        b.textContent = c.toUpperCase();
        b.addEventListener('click', () => { this.invCat = c; this.renderBody(); });
        wrap.appendChild(b);
      }
      list.appendChild(wrap);
    };

    // at-a-glance comparison vs the equipped part in the same slot
    const DIFF_KEYS = [
      ['hull', 'hull', 10], ['armor', 'arm', 5], ['mass', 'mass', 15, true],
      ['powerOut', 'pwr', 5], ['powerDraw', 'draw', 3, true], ['energyCap', 'cap', 20],
      ['energyRegen', 'rgn', 2], ['damage', 'dmg', 4], ['attackRate', 'rate', 0.5],
      ['range', 'rng', 10], ['speed', 'spd', 1], ['slopeGrip', 'grip', 0.2],
      ['jump', 'jmp', 2], ['scanRadius', 'scan', 60],
    ];
    const diffSummary = (p) => {
      const cur = g.equipped[p.slot];
      if (!cur) return '<span class="up">fills empty slot</span>';
      const diffs = [];
      for (const [k, label, scale, goodDown] of DIFF_KEYS) {
        const a = p.stats[k], b = cur.stats[k];
        if (a === undefined && b === undefined) continue;
        const d = (a || 0) - (b || 0);
        if (Math.abs(d) < 0.05) continue;
        const good = goodDown ? d < 0 : d > 0;
        diffs.push({ mag: Math.abs(d) / scale, html: `<span class="${good ? 'up' : 'down'}">${d > 0 ? '+' : ''}${Math.round(d * 10) / 10} ${label}</span>` });
      }
      if (!diffs.length) return '<span class="ii-meta">≈ equipped</span>';
      diffs.sort((x, y) => y.mag - x.mag);
      return diffs.slice(0, 3).map(d => d.html).join(' ');
    };

    if (this.invTab === 'parts') {
      chips(['all', ...SLOTS.map(s => s.toLowerCase())]);
      const parts = g.inventory.parts.filter(p => this.invCat === 'all' || p.slot.toLowerCase() === this.invCat);
      if (!parts.length) list.insertAdjacentHTML('beforeend', '<div style="color:var(--amber-dim);font-size:11px;padding:10px">no spare parts here. the desert provides — go take.</div>');
      for (const p of parts) {
        const el = document.createElement('div');
        el.className = 'inv-item' + (p.rusted ? ' rusted' : '');
        el.innerHTML = `<span><span class="ii-name">${p.name}</span><br><span class="ii-meta">${p.slot} · ${p.tierName}${p.rusted ? ' · RUST-GROWN' : ''}</span></span>
          <span class="ii-cmp">${diffSummary(p)}</span><span class="ii-action">▸</span>`;
        el.addEventListener('click', () => this.selectPart(p, null));
        list.appendChild(el);
      }
    } else if (this.invTab === 'mats') {
      chips(['all', 'materials', 'consumables']);
      let any = false;
      if (this.invCat !== 'consumables') {
        for (const [id, n] of Object.entries(g.inventory.mats)) {
          if (n <= 0) continue;
          any = true;
          const m = MATERIALS[id];
          const el = document.createElement('div');
          el.className = 'inv-item';
          el.innerHTML = `<span><span class="ii-name">${m.icon} ${m.name} × ${n}</span><br><span class="ii-meta">${m.desc}</span></span>`;
          list.appendChild(el);
        }
      }
      if (this.invCat !== 'materials') {
        for (const [id, n] of Object.entries(g.inventory.consumables)) {
          if (n <= 0) continue;
          any = true;
          const c = CONSUMABLES[id];
          const el = document.createElement('div');
          el.className = 'inv-item';
          el.innerHTML = `<span><span class="ii-name">${c.icon} ${c.name} × ${n}</span><br><span class="ii-meta">${c.desc}</span></span><span class="ii-action">USE</span>`;
          el.addEventListener('click', () => { g.useConsumable(id); this.renderBody(); });
          list.appendChild(el);
        }
      }
      if (!any) list.insertAdjacentHTML('beforeend', '<div style="color:var(--amber-dim);font-size:11px;padding:10px">pockets full of sand.</div>');
    } else { // craft
      chips(['all', 'parts', 'consumables']);
      for (const r of RECIPES) {
        const kind = r.result.kind === 'consumable' ? 'consumables' : 'parts';
        if (this.invCat !== 'all' && kind !== this.invCat) continue;
        const ok = canCraft(r, g.inventory.mats);
        const cost = Object.entries(r.cost).map(([k, n]) => `${MATERIALS[k].icon}${n} ${MATERIALS[k].name}`).join(', ');
        const el = document.createElement('div');
        el.className = 'inv-item' + (ok ? '' : ' uncraftable');
        el.innerHTML = `<span><span class="ii-name">${r.icon} ${r.name}</span><br><span class="ii-meta">${r.desc} — needs: ${cost}</span></span>` + (ok ? '<span class="ii-action">FABRICATE</span>' : '');
        if (ok) el.addEventListener('click', () => { g.craftRecipe(r); this.renderBody(); });
        list.appendChild(el);
      }
    }
  }

  selectPart(part, equippedSlot) {
    this.selected = { part, equippedSlot };
    const g = this.game;
    const d = $('part-detail');
    const current = equippedSlot ? null : g.equipped[part.slot];
    const statRows = [];
    const SHOW = [['hull', 'HULL'], ['armor', 'ARMOR %'], ['mass', 'MASS'], ['powerOut', 'PWR OUT'], ['powerDraw', 'PWR DRAW'],
      ['energyCap', 'PWR CAP'], ['energyRegen', 'PWR REGEN'], ['damage', 'DAMAGE'], ['attackRate', 'RATE'], ['range', 'RANGE'],
      ['speed', 'SPEED'], ['slopeGrip', 'GRIP'], ['jump', 'JUMP'], ['scanRadius', 'SCAN']];
    const fv = (v) => typeof v === 'number' ? Math.round(v * 1000) / 1000 : v;
    for (const [k, label] of SHOW) {
      if (part.stats[k] === undefined) continue;
      let cmp = '';
      if (current && current.stats[k] !== undefined) {
        const diff = part.stats[k] - current.stats[k];
        const goodDown = k === 'mass' || k === 'powerDraw';
        if (Math.abs(diff) > 0.01) {
          const up = diff > 0;
          const good = goodDown ? !up : up;
          cmp = ` <span class="${good ? 'up' : 'down'}">(${up ? '+' : ''}${Math.round(diff * 10) / 10})</span>`;
        }
      }
      statRows.push(`<div class="pd-stat"><span>${label}</span><span>${fv(part.stats[k])}${cmp}</span></div>`);
    }
    if (part.corruptionRate > 0) statRows.push(`<div class="pd-stat"><span>RUST GAIN</span><span class="down">+${part.corruptionRate}/min</span></div>`);
    if (part.ability) {
      const pw = abilityPower(part);
      statRows.push(`<div class="pd-stat"><span>ABILITY</span><span>${ABILITIES[part.ability].name}${pw > 1 ? ` <span class="up">(+${Math.round((pw - 1) * 100)}% potency)</span>` : ''}</span></div>`);
    }

    let actions = '';
    if (equippedSlot) actions = `<button id="pd-unequip">UNEQUIP</button>`;
    else actions = `<button id="pd-equip">EQUIP</button><button id="pd-scrap">SCRAP (+2 ▤)</button>`;
    d.innerHTML = `<div class="pd-name${part.rusted ? ' rusted' : ''}">${part.name}</div>
      <div class="pd-flavor">${part.flavor || ''}${part.rusted ? ' [it hums when you are not listening.]' : ''}</div>
      ${statRows.join('')}<div class="pd-actions">${actions}<button id="pd-close">CLOSE</button></div>`;
    d.classList.remove('hidden');
    const eq = document.getElementById('pd-equip');
    if (eq) eq.addEventListener('click', () => { g.equipPart(part); this.selectNone(); });
    const un = document.getElementById('pd-unequip');
    if (un) un.addEventListener('click', () => { g.unequipSlot(equippedSlot); this.selectNone(); });
    const scr = document.getElementById('pd-scrap');
    if (scr) scr.addEventListener('click', () => { g.scrapPart(part); this.selectNone(); });
    document.getElementById('pd-close').addEventListener('click', () => this.selectNone());
  }
  selectNone() {
    this.selected = null;
    $('part-detail').classList.add('hidden');
    this.renderBody();
  }

  // ---------- map ----------
  centerMapOnPlayer() {
    this.mapView.cx = this.game.player.pos.x;
    this.mapView.cz = this.game.player.pos.z;
  }

  renderMap() {
    const g = this.game;
    const cv = $('map-canvas');
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#0d0a06';
    ctx.fillRect(0, 0, cv.width, cv.height);
    const v = this.mapView;
    const PX = v.px;
    const halfW = cv.width / 2, halfH = cv.height / 2;
    const toScreen = (x, z) => [halfW + ((x - v.cx) / CHUNK) * PX, halfH + ((z - v.cz) / CHUNK) * PX];
    // RELIEF: the chart carries the ground's shape — hillshade derived
    // from the world's own heightfield at render time (pure function of
    // the seed: nothing stored, cached per session, light from the NW)
    if (!this._shadeCache) this._shadeCache = new Map();
    if (!this._rgbCache) {
      this._rgbCache = {};
      for (const [id, hex] of Object.entries(MAP_COLORS)) {
        this._rgbCache[id] = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
      }
    }
    ctx.globalAlpha = 0.85;
    for (const [key, biomeId] of g.world.explored) {
      const [cx, cz] = key.split(',').map(Number);
      const [sx, sy] = toScreen(cx * CHUNK, cz * CHUNK);
      if (sx < -PX || sy < -PX || sx > cv.width || sy > cv.height) continue;
      let sh = this._shadeCache.get(key);
      if (sh === undefined) {
        const wx = cx * CHUNK, wz = cz * CHUNK;
        const h0 = g.world.getHeight(wx, wz);
        const hx = g.world.getHeight(wx + CHUNK, wz);
        const hz = g.world.getHeight(wx, wz + CHUNK);
        // slope toward the NW light brightens; away falls into shadow —
        // plus a whisper of elevation tint so the high ground reads high
        sh = 1 + (-(hx - h0) - (hz - h0)) * 0.030 + (h0 - 6) * 0.0035;
        sh = Math.min(1.32, Math.max(0.60, sh));
        this._shadeCache.set(key, sh);
      }
      const rgb = this._rgbCache[biomeId] || [102, 102, 102];
      ctx.fillStyle = `rgb(${Math.min(255, rgb[0] * sh) | 0},${Math.min(255, rgb[1] * sh) | 0},${Math.min(255, rgb[2] * sh) | 0})`;
      ctx.fillRect(sx, sy, Math.max(1, PX - 0.5), Math.max(1, PX - 0.5));
    }
    ctx.globalAlpha = 1;
    // discovered structures & stills
    ctx.font = '9px monospace';
    for (const m of g.world.discovered) {
      const [sx, sy] = toScreen(m.x, m.z);
      if (sx < 0 || sy < 0 || sx > cv.width || sy > cv.height) continue;
      if (m.kind === 'still') {
        ctx.fillStyle = '#5fb8a6';
        ctx.fillRect(sx - 4, sy - 2, 8, 6);             // little house
        ctx.beginPath();
        ctx.moveTo(sx - 5, sy - 2); ctx.lineTo(sx, sy - 7); ctx.lineTo(sx + 5, sy - 2);
        ctx.fill();
        if (g.attuned && g.attuned[String(m.key).replace(/^still:/, '')]) {
          ctx.strokeStyle = '#7fd8ff';                  // an attuned node hums
          ctx.beginPath();
          ctx.moveTo(sx, sy - 10); ctx.lineTo(sx + 8, sy - 1); ctx.lineTo(sx, sy + 8); ctx.lineTo(sx - 8, sy - 1);
          ctx.closePath(); ctx.stroke();
        }
      } else if (m.kind === 'camp') {
        ctx.fillStyle = '#ff8a3c';                      // a little flame
        ctx.beginPath();
        ctx.moveTo(sx, sy - 5); ctx.lineTo(sx + 3, sy + 2); ctx.lineTo(sx - 3, sy + 2);
        ctx.fill();
      } else if (m.kind === 'nest') {
        ctx.fillStyle = m.destroyed ? '#5a4438' : '#e8401f'; // the rash, or its scar
        ctx.beginPath(); ctx.arc(sx, sy, 4, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = m.destroyed ? '#5a4438' : '#e8401f';
        ctx.beginPath(); ctx.arc(sx, sy, 6.5, 0, Math.PI * 2); ctx.stroke();
      } else if (m.kind === 'front') {
        ctx.strokeStyle = '#ff4a4a'; ctx.lineWidth = 2;      // crossed blades: the massing
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy - 4); ctx.lineTo(sx + 4, sy + 4);
        ctx.moveTo(sx + 4, sy - 4); ctx.lineTo(sx - 4, sy + 4);
        ctx.stroke(); ctx.lineWidth = 1;
      } else {
        ctx.fillStyle = '#ffd27f';
        ctx.beginPath();
        ctx.moveTo(sx, sy - 5); ctx.lineTo(sx + 5, sy); ctx.lineTo(sx, sy + 5); ctx.lineTo(sx - 5, sy);
        ctx.fill();
      }
      ctx.fillStyle = m.kind === 'still' ? '#5fb8a6' : m.kind === 'camp' ? '#ff8a3c' : m.kind === 'nest' ? (m.destroyed ? '#5a4438' : '#e8401f') : m.kind === 'front' ? '#ff4a4a' : '#ffd27f';
      ctx.fillText(m.name.toUpperCase() + (m.kind === 'nest' && m.destroyed ? ' (SILENCED)' : ''), sx + 9, sy + 3);
    }
    // caravans in earshot: a moving bell on the map while they're near
    for (const c of (g.caravans ? g.caravans.loadedList() : [])) {
      if (!c.members.some(m => m.hp > 0)) continue;
      const [sx, sy] = toScreen(c.pseudoStill.x, c.pseudoStill.z);
      if (sx < 0 || sy < 0 || sx > cv.width || sy > cv.height) continue;
      ctx.fillStyle = '#ffd27f';
      ctx.beginPath(); // a little bell
      ctx.moveTo(sx, sy - 5); ctx.lineTo(sx + 4, sy + 2); ctx.lineTo(sx - 4, sy + 2);
      ctx.fill();
      ctx.fillRect(sx - 1.5, sy + 2, 3, 2.5);
      ctx.fillText(c.stray ? 'A WALKER' : 'CARAVAN', sx + 8, sy + 3);
    }
    // quest targets
    for (const q of g.quests) {
      if (q.done) continue;
      const [sx, sy] = toScreen(q.x, q.z);
      ctx.strokeStyle = '#5fb8a6'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - 5, sy - 5); ctx.lineTo(sx + 5, sy + 5);
      ctx.moveTo(sx + 5, sy - 5); ctx.lineTo(sx - 5, sy + 5);
      ctx.stroke();
      ctx.fillStyle = '#5fb8a6';
      ctx.fillText('SIGNAL', sx + 8, sy + 3);
    }
    // anchor (spawn)
    {
      const [sx, sy] = toScreen(g.anchor.x, g.anchor.z);
      ctx.fillStyle = '#e8a33d';
      ctx.fillRect(sx - 3, sy - 3, 6, 6);
      ctx.fillText('ANCHOR', sx + 8, sy + 3);
    }
    // active chain objectives
    for (const ch of g.chains) {
      if (ch.done) continue;
      const cur = ch.steps[ch.current];
      if (!cur || cur.x === undefined) continue;
      const [sx, sy] = toScreen(cur.x, cur.z);
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 6); ctx.lineTo(sx + 6, sy); ctx.lineTo(sx, sy + 6); ctx.lineTo(sx - 6, sy); ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.fillText('TASK', sx + 9, sy + 3);
    }
    // custom waypoint
    if (g.waypoint) {
      const [sx, sy] = toScreen(g.waypoint.x, g.waypoint.z);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 7); ctx.lineTo(sx + 5, sy); ctx.lineTo(sx, sy + 7); ctx.lineTo(sx - 5, sy); ctx.closePath();
      ctx.stroke();
      ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.fillText('WAYPOINT', sx + 9, sy + 3);
    }
    // player — arrow shows camera heading, matching the compass
    {
      const [sx, sy] = toScreen(g.player.pos.x, g.player.pos.z);
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(Math.PI - g.camYaw);
      ctx.fillStyle = '#ff6a3c';
      ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(4.5, 5); ctx.lineTo(-4.5, 5); ctx.fill();
      ctx.restore();
    }
    // search focus: a ring around the found place, until the next search
    if (this._mapFocus) {
      const [sx, sy] = toScreen(this._mapFocus.x, this._mapFocus.z);
      ctx.strokeStyle = '#ffd27f'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(sx, sy, 14, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.arc(sx, sy, 19, 0, Math.PI * 2); ctx.globalAlpha = 0.4; ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 1;
    }
    this.buildMapSide();
  }

  // the sidebar: terrain, marks, and controls — three sections, one side
  buildMapSide() {
    if (this._mapSideBuilt) return;
    this._mapSideBuilt = true;
    $('map-side').innerHTML = `
      <div class="map-sec"><h4>TERRAIN</h4>${BIOMES.map(b =>
        `<div class="lg"><span class="sw" style="background:${MAP_COLORS[b.id]}"></span>${b.name}</div>`).join('')}</div>
      <div class="map-sec"><h4>MARKS</h4>
        <div class="lg"><span style="color:#5fb8a6">⌂</span> still</div>
        <div class="lg"><span style="color:#ffd27f">◆</span> structure</div>
        <div class="lg"><span style="color:#ff8a3c">▲</span> camp / caravan</div>
        <div class="lg"><span style="color:#e8401f">●</span> nest (dim: silenced)</div>
        <div class="lg"><span style="color:#ff4a4a">✕</span> war front</div>
        <div class="lg"><span style="color:#5fb8a6">✕</span> signal</div>
        <div class="lg"><span style="color:#fff">◇</span> task / waypoint</div>
        <div class="lg"><span style="color:#e8a33d">■</span> anchor</div>
        <div class="lg"><span style="color:#ff6a3c">➤</span> you</div>
      </div>
      <div class="map-sec"><h4>CONTROLS</h4>
        <div class="lg">drag — pan</div>
        <div class="lg">scroll — zoom</div>
        <div class="lg">click — set / clear waypoint</div>
        <div class="lg">type ⌕ — find a mapped place</div>
      </div>`;
    // the search pane: every mapped thing, filtered live, click to focus
    const inp = $('map-search-in');
    inp.addEventListener('input', () => this.renderMapSearch());
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = document.querySelector('#map-results .map-hit');
        if (first) first.click();
      }
    });
    this.renderMapSearch();
  }

  mapSearchIndex() {
    const g = this.game;
    const out = [];
    for (const m of g.world.discovered) {
      out.push({ name: m.name, kind: m.kind || 'structure', x: m.x, z: m.z });
    }
    out.push({ name: 'the anchor (first light)', kind: 'anchor', x: g.anchor.x, z: g.anchor.z });
    if (g.waypoint) out.push({ name: 'waypoint', kind: 'waypoint', x: g.waypoint.x, z: g.waypoint.z });
    for (const ch of g.chains) {
      if (ch.done) continue;
      const cur = ch.steps[ch.current];
      if (cur && cur.x !== undefined) out.push({ name: 'task: ' + (ch.noun || ch.id), kind: 'task', x: cur.x, z: cur.z });
    }
    if (g.proving) out.push({ name: 'the proving: ' + g.proving.megaName, kind: 'task', x: g.proving.x, z: g.proving.z });
    return out;
  }

  renderMapSearch() {
    const g = this.game;
    const q = ($('map-search-in').value || '').toLowerCase().trim();
    const box = $('map-results');
    const px = g.player.pos.x, pz = g.player.pos.z;
    const KIND_ICON = { still: ['⌂', '#5fb8a6'], camp: ['▲', '#ff8a3c'], nest: ['●', '#e8401f'], front: ['✕', '#ff4a4a'], anchor: ['■', '#e8a33d'], waypoint: ['◇', '#fff'], task: ['◇', '#fff'] };
    let hits = this.mapSearchIndex()
      .filter(m => !q || m.name.toLowerCase().includes(q))
      .map(m => ({ ...m, dist: Math.hypot(m.x - px, m.z - pz) }))
      .sort((a, b) => (q ? a.name.toLowerCase().indexOf(q) - b.name.toLowerCase().indexOf(q) : 0) || a.dist - b.dist)
      .slice(0, 40);
    box.innerHTML = '';
    if (!hits.length) {
      box.innerHTML = `<div style="font-size:10px;color:var(--amber-dim);padding:6px 2px;">${q ? 'nothing mapped by that name — the desert keeps it yet' : 'nothing mapped yet — walk, and the chart fills'}</div>`;
      return;
    }
    for (const m of hits) {
      const [ic, col] = KIND_ICON[m.kind] || ['◆', '#ffd27f'];
      const el = document.createElement('div');
      el.className = 'map-hit';
      el.innerHTML = `<span><span style="color:${col}">${ic}</span> ${m.name.toUpperCase()}</span><span class="mh-dist">${(m.dist / 1000).toFixed(1)}km</span>`;
      el.onclick = () => {
        this.mapView.cx = m.x; this.mapView.cz = m.z;
        if (this.mapView.px < 6) this.mapView.px = 8;
        this._mapFocus = { x: m.x, z: m.z };
        this.renderMap();
      };
      box.appendChild(el);
    }
  }

  // the canvas backing store matches its on-screen box, so the chart is
  // crisp at any window size — called on open and on resize
  fitMapCanvas() {
    const cv = $('map-canvas');
    const box = cv.parentElement.getBoundingClientRect();
    if (box.width > 40 && box.height > 40) {
      cv.width = Math.round(box.width);
      cv.height = Math.round(box.height);
    }
  }

  // ---------- journal ----------
  renderJournal() {
    const g = this.game;
    this.journalTab = this.journalTab || 'all';
    document.querySelectorAll('#journal-tabs .inv-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === this.journalTab);
      b.onclick = () => { this.journalTab = b.dataset.tab; this.renderJournal(); };
    });
    const tab = this.journalTab;
    const list = $('journal-list');
    list.innerHTML = '';
    // LEGENDS: the ledger of stories — yours and the others' — and where
    // the desert tells each one
    if (tab === 'legends') {
      const head = document.createElement('div');
      head.className = 'journal-entry';
      const idLine = g.formerLife && g.formerLife.choice === 'carried' ? ` — and you answer to ${formerDesignation(g.seed)}`
        : g.formerLife && g.formerLife.choice === 'walker' ? ' — the old name given back to its dead'
        : g.formerLife && g.formerLife.choice === 'erased' ? ' — the record is ash; only the deeds remain' : '';
      head.innerHTML = `<div class="je-title">${g.epithet ? 'THEY CALL YOU ' + g.epithet.toUpperCase() : g.namingRefused ? 'THE WALKER WALKS (a name was offered, and given back)' : 'UNNAMED — the walker'}${idLine.toUpperCase()}</div>
        <div class="je-body">${g.stories.filter(s => s.kind !== 'other').length} stories of yours on the roads · ${g.stories.filter(s => s.kind === 'other').length} legends of others</div>`;
      list.appendChild(head);
      // THE COMPANY: the ones who walked with you, and what the roads made of them
      const comps = Object.entries(g.companions || {});
      if (comps.length) {
        const co = document.createElement('div');
        co.className = 'journal-entry';
        const rows = comps.map(([n, c]) =>
          `${n}${c.epithet ? ', called ' + c.epithet.toUpperCase() : ''} — ${c.stories} shared stor${c.stories === 1 ? 'y' : 'ies'} on the roads`).join('<br>');
        co.innerHTML = `<div class="je-title">THE COMPANY${g.bandName ? ' — the yards call you ' + g.bandName.toUpperCase() : ' — the desert knows who walks with you'}</div>
          <div class="je-body">${rows}</div>`;
        list.appendChild(co);
      }
      // THE CAMPAIGNS: the ledger of fronts fought, however they ended
      if (g.war && g.war.history && g.war.history.length) {
        const wars = document.createElement('div');
        wars.className = 'journal-entry';
        const word = (o) => o === 'held' || o === 'stood' ? 'HELD'
          : o === 'sacked' ? 'SACKED' : o === 'column' ? 'THE COLUMN, BROKEN'
          : o === 'broken' ? 'THE WAKING, BROKEN' : o.toUpperCase();
        const rows = [...g.war.history].reverse().slice(0, 8)
          .map(h => `day ${1 + h.day} — ${h.stillName || h.stillKey}: ${word(h.outcome)}${h.raised ? ' · RAISED SINCE' : ''}`)
          .join('<br>');
        wars.innerHTML = `<div class="je-title">THE CAMPAIGNS — ${g.war.history.length} front${g.war.history.length === 1 ? '' : 's'} the desert remembers</div>
          <div class="je-body">${rows}</div>`;
        list.appendChild(wars);
      }
      for (const st of [...g.stories].reverse()) {
        const el = document.createElement('div');
        el.className = 'journal-entry';
        const places = Object.keys(st.roots);
        const names = places.slice(0, 3).map(k => k === '*' ? 'everywhere' : ((g.resolveStillByKey(k) || {}).name || k));
        const where = places.includes('*') ? 'told everywhere'
          : `told at ${places.length} still${places.length === 1 ? '' : 's'}: ${names.join(', ')}${places.length > 3 ? '…' : ''}`;
        el.innerHTML = `<div class="je-title">${st.kind === 'other' ? '◇ A LEGEND OF ANOTHER' : '◆ A STORY OF YOURS'} — day ${st.day}</div>
          <div class="je-body">${st.body}</div>
          <div class="je-dist">${where}</div>`;
        list.appendChild(el);
      }
      if (!g.stories.length) {
        const el = document.createElement('div');
        el.className = 'journal-entry';
        el.innerHTML = '<div class="je-body">no stories yet. do something worth telling, near someone who tells.</div>';
        list.appendChild(el);
      }
      return;
    }
    // active work chains first — the desert's open contracts; the paid sink
    const chainOrder = [...g.chains].reverse().sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0));
    if (tab === 'all' || tab === 'work') for (const ch of chainOrder) {
      const el = document.createElement('div');
      el.className = 'journal-entry quest' + (ch.done ? ' done' : '');
      const steps = ch.steps.map((s, i) => {
        const cls = s.done ? 'qs qs-done' : (i === ch.current && !ch.done ? 'qs qs-cur' : 'qs');
        const mark = s.done ? '✓' : (i === ch.current && !ch.done ? '▸' : '·');
        return `<div class="${cls}">${mark} ${s.desc}</div>`;
      }).join('');
      let dist = '';
      const cur = ch.steps[ch.current];
      const isTracked = g.tracked && g.tracked.kind === 'chain' && g.tracked.id === ch.id;
      if (!ch.done && cur && cur.x !== undefined) {
        dist = `<div class="je-dist">▸ ${Math.round(Math.hypot(cur.x - g.player.pos.x, cur.z - g.player.pos.z))} m — ${isTracked ? '◈ ON COMPASS · click to unpin' : 'click to pin to compass'}</div>`;
      }
      el.innerHTML = `<div class="je-title">${ch.title}${ch.done ? (ch.failed ? ' — <span style="color:var(--rust-bright)">FAILED</span>' : ' — PAID') : ''}</div>
        <div class="je-body">for ${ch.giverName}, ${ch.stillName}</div>${steps}${dist}`;
      if (!ch.done) {
        el.style.cursor = 'pointer';
        if (isTracked) el.style.borderLeftColor = '#fff';
        el.addEventListener('click', () => { g.trackChain(ch.id); this.renderJournal(); });
      }
      list.appendChild(el);
    }
    let items = [...g.journal].reverse();
    if (tab === 'work') {
      items = items.filter(e => e.type === 'quest' || e.cat === 'work')
        .sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0)); // resolved signals sink below
    }
    else if (tab === 'memories') {
      items = items.filter(e => e.type !== 'quest' && (e.cat || 'memory') === 'memory');
      // THE FORMER LIFE: the evidence assembles at the head of the memories
      const fl = g.formerLife;
      const pieces = (g.txLeaks || 0) + (fl && fl.doc ? 1 : 0) + (fl && fl.rim ? 1 : 0) + (fl && fl.soul ? 1 : 0);
      if (fl && pieces > 0) {
        const des = g.txLeaks > 0 ? formerDesignation(g.seed) : null;
        const P = (found, text, tease) => `${found ? '◆' : '·'} ${found ? text : tease}`;
        const rows = [
          P(g.txLeaks >= 1, 'the intake manifest — berth 4407, waiver signed', 'something the line holds, one ride away'),
          P(g.txLeaks >= 2, 'the shift log — asking after a coast that is gone', 'a voice in the wire, more rides down'),
          P(g.txLeaks >= 3, 'the boarding record — carried nothing; seemed relieved', 'the line’s last fragment, further still'),
          P(fl.rim, 'the name, cut deep in a well-rim and traced smooth', 'a name not yet found in stone'),
          P(fl.soul, 'the one who cut it — they know the gait', 'a voice not yet met'),
          P(fl.doc, 'a routing slip in the buried paper — filed twice', 'a cross-reference not yet unearthed'),
        ].join('<br>');
        const el = document.createElement('div');
        el.className = 'journal-entry';
        el.innerHTML = `<div class="je-title">THE FORMER LIFE — ${des || 'a designation, surfacing'} · ${pieces} of 6</div>
          <div class="je-body">${rows}${fl.trail ? '<br><br>the pieces lean the same way. the trail waits.' : ''}</div>`;
        list.appendChild(el);
      }
    }
    else if (tab === 'places') items = items.filter(e => e.cat === 'place');
    else if (tab === 'events') items = items.filter(e => e.cat === 'event');
    if (!items.length && !list.children.length) list.innerHTML = '<div style="color:var(--amber-dim);font-size:12px;padding:20px">nothing filed here yet. the desert is patient.</div>';
    for (const e of items) {
      const el = document.createElement('div');
      el.className = 'journal-entry' + (e.type === 'quest' ? ' quest' : '') + (e.done ? ' done' : '');
      let dist = '';
      if (e.type === 'quest' && !e.done) {
        const d = Math.round(Math.hypot(e.x - g.player.pos.x, e.z - g.player.pos.z));
        dist = `<div class="je-dist">▸ signal source ${d} m away — marked on map</div>`;
      }
      el.innerHTML = `<div class="je-title">${e.title}${e.done ? ' — RESOLVED' : ''}</div><div class="je-body">${e.body}</div>${dist}`;
      // active signals can ride the compass too
      if (e.type === 'quest' && !e.done && e.x !== undefined) {
        el.style.cursor = 'pointer';
        if (g.tracked && g.tracked.kind === 'signal' && g.tracked.id === e.id) el.style.borderLeftColor = '#fff';
        el.addEventListener('click', () => { g.trackSignal(e.id); this.renderJournal(); });
      }
      list.appendChild(el);
    }
  }

  // ---------- settings ----------
  renderSettings() {
    const g = this.game;
    this.setTab = this.setTab || 'audio';
    document.querySelectorAll('#set-tabs .inv-tab').forEach(b => {
      b.classList.toggle('active', b.dataset.tab === this.setTab);
      b.onclick = () => { this.setTab = b.dataset.tab; this.renderSettings(); };
    });
    const body = $('set-body');
    body.innerHTML = '';
    const slider = (label, sub, get, set) => {
      const row = document.createElement('div');
      row.className = 'set-row';
      row.innerHTML = `<span class="set-label">${label}<span class="set-sub">${sub}</span></span>
        <span style="display:flex;align-items:center;gap:10px"><input type="range" min="0" max="100" value="${Math.round(get() * 100)}"><span class="set-val">${Math.round(get() * 100)}%</span></span>`;
      const input = row.querySelector('input');
      input.addEventListener('input', () => {
        set(input.value / 100);
        row.querySelector('.set-val').textContent = input.value + '%';
        g.audio.applyVolumes();
        saveSettings();
      });
      body.appendChild(row);
    };
    const cycle = (label, sub, options, get, set) => {
      const row = document.createElement('div');
      row.className = 'set-row';
      row.innerHTML = `<span class="set-label">${label}<span class="set-sub">${sub}</span></span><button class="set-cycle"></button>`;
      const btn = row.querySelector('button');
      const labelOf = (v) => options.find(o => o.v === v)?.label ?? String(v);
      btn.textContent = labelOf(get());
      btn.addEventListener('click', () => {
        const i = options.findIndex(o => o.v === get());
        const next = options[(i + 1) % options.length].v;
        set(next);
        btn.textContent = labelOf(next);
        g.applySettings();
      });
      body.appendChild(row);
    };

    if (this.setTab === 'audio') {
      const a = SETTINGS.audio;
      cycle('OUTPUT', 'silence the desert entirely', [{ v: false, label: 'SOUND ON' }, { v: true, label: 'MUTED' }],
        () => g.audio.muted, (v) => g.audio.setMuted(v));
      slider('MASTER', 'everything, before the buses', () => a.master, (v) => a.master = v);
      slider('AMBIENT', 'wind · field hum · the choir', () => a.ambient, (v) => a.ambient = v);
      slider('FOOTFALLS', 'your own weight in the world', () => a.steps, (v) => a.steps = v);
      slider('THE SCORE', 'the desert humming to itself — 0 for pure silence', () => a.music ?? 0.5, (v) => { a.music = v; if (g.score) g.score.setVolume(v); });
      slider('COMBAT', 'violence, incoming and outgoing', () => a.combat, (v) => a.combat = v);
      slider('INTERFACE', 'chimes · pickups · voices', () => a.ui, (v) => a.ui = v);
    } else if (this.setTab === 'video') {
      const v = SETTINGS.video;
      cycle('RENDER SCALE', 'resolution multiplier — pixel modes upscale crisp, retro-style',
        [{ v: 0.3, label: 'CHUNKY (pixelated)' }, { v: 0.45, label: 'RETRO (pixelated)' },
         { v: 0.75, label: 'LOW (0.75×)' }, { v: 1, label: 'STANDARD (1×)' }, { v: 1.5, label: 'HIGH (1.5×)' }, { v: 2, label: 'NATIVE (2×)' }],
        () => v.renderScale, (x) => v.renderScale = x);
      cycle('PIXEL SMOOTHING', 'pixel modes: antialias at full res BEFORE the chunky downscale — kills the distant shimmer',
        [{ v: true, label: 'ON (pre-downscale AA)' }, { v: false, label: 'OFF (raw)' }],
        () => SETTINGS.video.pixelAA !== false, (x) => SETTINGS.video.pixelAA = x);
      cycle('VIEW DISTANCE', 'how far the haze allows',
        Object.entries(VIEW_DIST).map(([k, d]) => ({ v: k, label: d.label })),
        () => v.viewDist, (x) => v.viewDist = x);
      cycle('CAMERA SHAKE', 'impacts rattle the optics', [{ v: true, label: 'ON' }, { v: false, label: 'OFF' }],
        () => v.shake, (x) => v.shake = x);
    } else {
      const gm = SETTINGS.game;
      cycle('DIFFICULTY', 'how hungry the machines are',
        Object.entries(DIFFICULTY).map(([k, d]) => ({ v: k, label: d.label })),
        () => gm.difficulty, (x) => gm.difficulty = x);
      cycle('DAMAGE NUMBERS', 'floating arithmetic over your victims', [{ v: true, label: 'ON' }, { v: false, label: 'OFF' }],
        () => gm.dmgNumbers, (x) => gm.dmgNumbers = x);
    }
  }

  death(show, text) {
    $('death-screen').classList.toggle('hidden', !show);
    if (text) $('death-sub').textContent = text;
  }
}
