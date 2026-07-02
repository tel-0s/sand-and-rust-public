// THE WORKBENCH — dev-only debug console. Loaded ONLY when the dev server
// answers HEAD /__dev__ (serve.py --dev); public hosting never sees it run.
// Backtick [`] toggles. Everything here goes through the same code paths the
// game uses (spawnAt, generateChain, the natural NPC death pipeline...), so
// what you test is what ships.
import { Rand, hashString } from './rng.js';
import { makePart, PART_DEFS } from './parts.js';
import { MATERIALS, CONSUMABLES } from './items.js';
import { ENEMY_KINDS } from './enemies.js';
import { generateChain } from './quests.js';
import { composeShard, composeInteriorDoc, stillHistory, whisper } from './lore.js';

const CAMP_CELL = 1300;

export function initDebug(getGame) {
  if (document.getElementById('dbg-root')) return;
  const css = document.createElement('style');
  css.textContent = `
#dbg-root { position: fixed; inset: 4vh 4vw; z-index: 300; display: none; flex-direction: column;
  background: rgba(10,8,5,0.96); border: 1px solid #7a5f26; font-family: inherit; color: var(--amber, #d8a050);
  padding: 14px 18px; }
#dbg-root.open { display: flex; }
#dbg-head { display: flex; align-items: baseline; gap: 18px; border-bottom: 1px solid rgba(232,163,61,0.25); padding-bottom: 8px; }
#dbg-title { color: #6fe8d0; font-size: 13px; letter-spacing: 3px; }
#dbg-tabs { display: flex; gap: 6px; }
.dbg-tab { font-family: inherit; font-size: 10px; letter-spacing: 2px; padding: 4px 12px; cursor: pointer;
  background: transparent; border: 1px solid rgba(232,163,61,0.25); color: var(--amber-dim, #8a6c3e); }
.dbg-tab.active { color: #6fe8d0; border-color: #6fe8d0; }
#dbg-body { display: flex; gap: 16px; flex: 1; min-height: 0; padding-top: 10px; }
#dbg-controls { width: 46%; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
#dbg-out { flex: 1; overflow-y: auto; border: 1px solid rgba(232,163,61,0.2); background: rgba(0,0,0,0.4);
  padding: 10px 12px; font-size: 11px; line-height: 1.7; white-space: pre-wrap; }
.dbg-sec { border: 1px solid rgba(232,163,61,0.18); padding: 8px 10px; }
.dbg-sec-h { font-size: 9px; letter-spacing: 2px; color: var(--amber-dim, #8a6c3e); margin-bottom: 6px; }
.dbg-row { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; margin-bottom: 4px; }
.dbg-btn { font-family: inherit; font-size: 10px; letter-spacing: 1px; padding: 4px 9px; cursor: pointer;
  background: rgba(40,28,12,0.8); border: 1px solid rgba(232,163,61,0.4); color: var(--amber, #d8a050); }
.dbg-btn:hover { color: #fff; border-color: #6fe8d0; }
.dbg-btn.act { color: #6fe8d0; }
#dbg-root select, #dbg-root input[type=number] { font-family: inherit; font-size: 10px; background: #171208;
  color: var(--amber, #d8a050); border: 1px solid rgba(232,163,61,0.4); padding: 3px 5px; max-width: 170px; }
#dbg-root label { font-size: 10px; letter-spacing: 1px; }
#dbg-foot { font-size: 9px; color: var(--amber-dim, #8a6c3e); letter-spacing: 1px; padding-top: 8px; }
`;
  document.head.appendChild(css);

  const root = document.createElement('div');
  root.id = 'dbg-root';
  root.innerHTML = `
    <div id="dbg-head"><span id="dbg-title">// THE WORKBENCH — dev console</span><div id="dbg-tabs"></div></div>
    <div id="dbg-body"><div id="dbg-controls"></div><div id="dbg-out">the workbench is open. nothing you do here is the desert's fault.\n</div></div>
    <div id="dbg-foot">[\`] toggle · dev server only — this panel does not exist in the public build</div>`;
  document.body.appendChild(root);
  const controls = root.querySelector('#dbg-controls');
  const out = root.querySelector('#dbg-out');
  const tabsEl = root.querySelector('#dbg-tabs');

  const log = (t) => { out.textContent = t + '\n' + '─'.repeat(46) + '\n' + out.textContent; out.scrollTop = 0; };
  const rnd = () => new Rand((Math.random() * 0xffffffff) >>> 0);
  const g = () => getGame();
  const pos = () => g().player.pos;

  // ---------- shared queries ----------
  const leaveHalls = () => { if (g().interiors.active) g().exitHollow(false); };
  const port = (x, z, label) => {
    leaveHalls();
    const p = g().player;
    p.pos.set(x, g().world.getHeight(x, z) + 0.6, z);
    p.vel.set(0, 0, 0); p.grounded = true;
    log(`→ teleported to ${label} (${Math.round(x)}, ${Math.round(z)})`);
  };
  const nearestStill = () => g().stills.stillsNear(pos().x, pos().z, 40000)
    .sort((a, b) => Math.hypot(a.x - pos().x, a.z - pos().z) - Math.hypot(b.x - pos().x, b.z - pos().z))[0];
  const nearestMega = (undiscovered) => g().world.megasNear(pos().x, pos().z, 40000)
    .filter(m => !undiscovered || !g().world.discoveredKeys.has(m.key))
    .sort((a, b) => Math.hypot(a.x - pos().x, a.z - pos().z) - Math.hypot(b.x - pos().x, b.z - pos().z))[0];
  const nearestNest = () => g().nests.nestsNear(pos().x, pos().z, 25000)
    .sort((a, b) => Math.hypot(a.x - pos().x, a.z - pos().z) - Math.hypot(b.x - pos().x, b.z - pos().z))[0];
  const nearestCamp = () => {
    const c0x = Math.floor(pos().x / CAMP_CELL), c0z = Math.floor(pos().z / CAMP_CELL);
    let best = null;
    for (let r = 0; r <= 10; r++) {
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const info = g().camps.infoAt(c0x + dx, c0z + dz);
        if (!info) continue;
        const d = Math.hypot(info.x - pos().x, info.z - pos().z);
        if (!best || d < best.d) best = { d, info };
      }
      if (best) return best.info;
    }
    return null;
  };
  const nearestResident = () => {
    let best = null;
    for (const rec of g().stills.loaded.values()) {
      for (const n of rec.npcs) {
        if (n.hp <= 0) continue;
        const d = Math.hypot(n.pos.x - pos().x, n.pos.z - pos().z);
        if (d < 120 && (!best || d < best.d)) best = { d, n, rec };
      }
    }
    return best;
  };
  const loadedStill = () => {
    let best = null;
    for (const rec of g().stills.loaded.values()) {
      const d = Math.hypot(rec.info.x - pos().x, rec.info.z - pos().z);
      if (!best || d < best.d) best = { d, rec };
    }
    return best && best.rec;
  };

  // ---------- tab construction ----------
  const sec = (title, build) => {
    const el = document.createElement('div');
    el.className = 'dbg-sec';
    el.innerHTML = `<div class="dbg-sec-h">${title}</div>`;
    build(el);
    return el;
  };
  const row = (parent) => { const r = document.createElement('div'); r.className = 'dbg-row'; parent.appendChild(r); return r; };
  const btn = (parent, label, fn, cls = '') => {
    const b = document.createElement('button');
    b.className = 'dbg-btn' + (cls ? ' ' + cls : '');
    b.textContent = label;
    b.addEventListener('click', () => { try { fn(); } catch (err) { log('✗ ' + err.message); } });
    parent.appendChild(b);
    return b;
  };
  const sel = (parent, options) => {
    const s = document.createElement('select');
    for (const [v, lab] of options) { const o = document.createElement('option'); o.value = v; o.textContent = lab; s.appendChild(o); }
    parent.appendChild(s);
    return s;
  };
  const num = (parent, val, min, max, step = 1) => {
    const i = document.createElement('input');
    i.type = 'number'; i.value = val; i.min = min; i.max = max; i.step = step;
    parent.appendChild(i);
    return i;
  };
  const chk = (parent, label) => {
    const l = document.createElement('label');
    const c = document.createElement('input'); c.type = 'checkbox';
    l.appendChild(c); l.appendChild(document.createTextNode(' ' + label));
    parent.appendChild(l);
    return c;
  };

  const TABS = {
    WORLD: (c) => {
      c.appendChild(sec('TELEPORT — nearest', (el) => {
        const r = row(el);
        btn(r, 'still', () => { const s = nearestStill(); s ? port(s.x + 10, s.z, s.name) : log('✗ no still in 40km'); });
        btn(r, 'camp', () => { const cp = nearestCamp(); cp ? port(cp.x + 4, cp.z, cp.pseudoStill ? cp.pseudoStill.name : 'camp') : log('✗ no camp found'); });
        btn(r, 'nest', () => { const n = nearestNest(); n ? port(n.x + 35, n.z, n.name || 'nest') : log('✗ no nest in 25km'); });
        btn(r, 'megastructure', () => { const m = nearestMega(false); m ? port(m.x + 40, m.z, m.name) : log('✗ none'); });
        btn(r, 'undiscovered mega', () => { const m = nearestMega(true); m ? port(m.x + 40, m.z, m.name) : log('✗ none'); });
        const r2 = row(el);
        btn(r2, 'your anchor', () => port(g().anchor.x + 5, g().anchor.z, 'the anchor'));
        btn(r2, 'epic target', () => { const e = g().epic; e ? port(e.x + 40, e.z, e.megaName) : log('✗ no epic running'); });
        btn(r2, 'epic well', () => { const e = g().epic; e ? port(e.stillX + 10, e.stillZ, e.stillName) : log('✗ no epic running'); });
      }));
      c.appendChild(sec('TIME & WEATHER', (el) => {
        const r = row(el);
        btn(r, 'dawn', () => { g().dayT = 0.02; log('→ dawn'); });
        btn(r, 'noon', () => { g().dayT = 0.25; log('→ noon'); });
        btn(r, 'dusk', () => { g().dayT = 0.48; log('→ dusk'); });
        btn(r, 'midnight', () => { g().dayT = 0.75; log('→ midnight'); });
        btn(r, '+1 day', () => { g().worldT += 1; log(`→ world day ${1 + Math.floor(g().worldT)}`); });
        const r2 = row(el);
        btn(r2, 'storm ON', () => { g()._stormOverride = 1; log('→ storm forced on'); });
        btn(r2, 'storm OFF', () => { g()._stormOverride = 0; log('→ storm forced off'); });
        btn(r2, 'weather auto', () => { g()._stormOverride = null; log('→ weather returned to the desert'); });
      }));
      c.appendChild(sec('MAP', (el) => {
        const r = row(el);
        btn(r, 'reveal 12 km', () => {
          let n = 0;
          for (const s of g().stills.stillsNear(pos().x, pos().z, 12000)) {
            if (g().world.markDiscovered({ key: 'still:' + s.key, name: s.name, kind: 'still', x: s.x, z: s.z })) n++;
          }
          for (const m of g().world.megasNear(pos().x, pos().z, 12000)) {
            if (g().world.markDiscovered({ key: m.key, name: m.name, kind: m.type, x: m.x, z: m.z })) n++;
          }
          log(`→ ${n} places marked on the map`);
        });
        btn(r, 'where am i', () => log(`(${Math.round(pos().x)}, ${Math.round(pos().z)}) — ${g().world.regionName(pos().x, pos().z)} · ${g().biomeName || g().world.biomeAt(pos().x, pos().z).name || ''}`));
      }));
    },

    SPAWN: (c) => {
      c.appendChild(sec('ENEMY DESIGNER', (el) => {
        const r = row(el);
        const kind = sel(r, Object.keys(ENEMY_KINDS).map(k => [k, k]));
        const tier = num(r, 1.5, 0.5, 6, 0.25);
        const infected = chk(r, 'infected');
        const count = num(r, 1, 1, 8);
        const r2 = row(el);
        btn(r2, 'spawn ahead', () => {
          const p = g().player, n = +count.value;
          for (let i = 0; i < n; i++) {
            const a = g().camYaw + (i - (n - 1) / 2) * 0.35;
            const e = g().enemies.spawnAt(kind.value, p.pos.x + Math.sin(a) * 12, p.pos.z + Math.cos(a) * 12,
              { tierMult: +tier.value, infected: infected.checked });
            e.pos.y = p.pos.y;
          }
          log(`→ ${n}× ${kind.value} (tier ${tier.value}${infected.checked ? ', infected' : ''}) spawned ahead`);
        }, 'act');
        btn(r2, 'dry run (stats)', () => {
          const d = ENEMY_KINDS[kind.value], t = +tier.value;
          log(`DRY RUN — ${kind.value} @ tier ${t}\nhp ~${Math.round(d.hp * t)} · dmg ~${Math.round(d.dmg * t)} · speed ${d.speed} · range ${d.attackRange}\naggro ${d.aggro} · scale ${d.scale}${d.corrupting ? ` · corrupting ${d.corrupting}` : ''}\ndrops: ${JSON.stringify(d.drops)}`);
        });
        btn(r2, 'clear all enemies', () => {
          const n = g().enemies.enemies.length;
          for (let i = n - 1; i >= 0; i--) g().enemies.remove(i);
          log(`→ ${n} machines unmade`);
        });
      }));
      c.appendChild(sec('PART DESIGNER', (el) => {
        const r = row(el);
        const def = sel(r, PART_DEFS.map(d => [d.id, `${d.slot.toLowerCase()} · ${d.id.replace(/_/g, ' ')}`]));
        const tier = sel(r, [[1, 'Mk.I'], [2, 'Mk.II'], [3, 'Mk.III']]);
        const rusted = chk(r, 'rust-grown');
        const r2 = row(el);
        btn(r2, 'give part', () => {
          const part = makePart(def.value, +tier.value, rusted.checked, (Math.random() * 0xffffffff) >>> 0);
          g().inventory.parts.push(part);
          log(`→ ${part.name} (${part.tierName}${part.rusted ? ' · RUST-GROWN' : ''}) added to inventory`);
        }, 'act');
        btn(r2, 'dry run', () => {
          const part = makePart(def.value, +tier.value, rusted.checked, 12345);
          const { mesh, ...flat } = part;
          log('DRY RUN — ' + JSON.stringify(flat, null, 1));
        });
        btn(r2, 'random part ×3', () => {
          for (let i = 0; i < 3; i++) {
            const part = (() => { const r3 = rnd(); return makePart(PART_DEFS[r3.int(0, PART_DEFS.length - 1)].id, r3.int(1, 3), r3.chance(0.25), r3.int(0, 0xffffffff)); })();
            g().inventory.parts.push(part);
            log(`→ ${part.name} (${part.tierName}${part.rusted ? ' · RUST-GROWN' : ''})`);
          }
        });
      }));
    },

    GIVE: (c) => {
      c.appendChild(sec('MATERIALS', (el) => {
        const r = row(el);
        for (const [id, m] of Object.entries(MATERIALS)) {
          const amt = id === 'shaper' ? 1 : 10;
          btn(r, `+${amt} ${m.icon} ${id}`, () => {
            g().inventory.mats[id] = (g().inventory.mats[id] || 0) + amt;
            log(`→ +${amt} ${m.name}`);
          });
        }
      }));
      c.appendChild(sec('CONSUMABLES', (el) => {
        const r = row(el);
        for (const [id, cd] of Object.entries(CONSUMABLES)) {
          btn(r, `+3 ${cd.icon} ${id.replace(/_/g, ' ')}`, () => {
            g().inventory.consumables[id] = (g().inventory.consumables[id] || 0) + 3;
            log(`→ +3 ${cd.name}`);
          });
        }
      }));
      c.appendChild(sec('CHASSIS STATE', (el) => {
        const r = row(el);
        btn(r, 'full repair', () => { const p = g().player; p.hull = p.stats.maxHull; p.energy = p.stats.energyCap; log('→ hull & power restored'); });
        btn(r, 'hull 10%', () => { const p = g().player; p.hull = p.stats.maxHull * 0.1; log('→ hull to 10%'); });
        btn(r, 'corruption +25', () => { const p = g().player; p.corruption = Math.min(100, p.corruption + 25); log(`→ corruption ${Math.round(p.corruption)}`); });
        btn(r, 'corruption 0', () => { g().player.corruption = 0; log('→ scrubbed clean'); });
      }));
    },

    GEN: (c) => {
      let pendingChain = null;
      c.appendChild(sec('WORK CHAIN (blackboard) — from nearest loaded still', (el) => {
        const r = row(el);
        btn(r, 'dry run', () => {
          const rec = loadedStill();
          if (!rec || !rec.npcs.length) return log('✗ stand near a still first (it must be loaded)');
          const npc = rec.npcs[0];
          pendingChain = generateChain(g().world, npc, g().stills.stillsNear(rec.info.x, rec.info.z, 6500));
          log(`DRY RUN — ${pendingChain.title}\ngiver: ${npc.name} (${rec.info.name})\npitch: ${pendingChain.pitch}\n` +
            pendingChain.steps.map((s, i) => ` ${i + 1}. [${s.type}] ${s.desc}`).join('\n') +
            `\nreward: ${pendingChain.reward.scrap} ▤`);
        });
        btn(r, 'take the job', () => {
          if (!pendingChain) return log('✗ dry run first');
          g().chains.push(pendingChain);
          g().activateChainStep(pendingChain);
          g().journal.push({ type: 'lore', cat: 'work', title: pendingChain.title, body: `taken from the workbench. the log tracks each step.` });
          log(`→ chain accepted: ${pendingChain.title}`);
          pendingChain = null;
        }, 'act');
      }));
      c.appendChild(sec('TESTIMONY', (el) => {
        const r = row(el);
        btn(r, 'document (here)', () => {
          const d = composeShard(g().world, g().stills, pos().x, pos().z, (Math.random() * 0xffffff) | 0);
          log(`DRY RUN — ${d.title}\n${d.body}${d.lead ? `\n[leads to ${d.lead.name}]` : ''}`);
        });
        btn(r, 'interior doc (nearest mega)', () => {
          const m = nearestMega(false);
          if (!m) return log('✗ no mega in range');
          const d = composeInteriorDoc(g().world, g().stills, m, (Math.random() * 0xffffff) | 0, 'test chamber');
          log(`DRY RUN — ${d.title} (${m.name})\n${d.body}`);
        });
        btn(r, 'still history', () => {
          const s = nearestStill();
          if (!s) return log('✗ no still in range');
          log(`DRY RUN — the story of ${s.name}\n` + stillHistory(g().world, g().stills, s, 4).join('\n'));
        });
        btn(r, 'whisper', () => log('DRY RUN — the Rust whispers:\n' + whisper(Math.max(30, g().player.corruption), rnd())));
      }));
    },

    SOULS: (c) => {
      c.appendChild(sec('NEAREST RESIDENT (within 120 m)', (el) => {
        const r = row(el);
        btn(r, 'who?', () => {
          const b = nearestResident();
          b ? log(`${b.n.name} — ${b.n.role}, ${b.rec.info.name}\nid ${b.n.id} · earned disp ${g().npcDisp[b.n.id] || 0} · hp ${Math.round(b.n.hp)}`)
            : log('✗ nobody within 120 m');
        });
        btn(r, 'befriend (disp 50)', () => { const b = nearestResident(); if (!b) return log('✗ nobody near'); g().npcDisp[b.n.id] = 50; log(`→ ${b.n.name} counts you as kin`); });
        btn(r, 'sour (disp −40)', () => { const b = nearestResident(); if (!b) return log('✗ nobody near'); g().npcDisp[b.n.id] = -40; log(`→ ${b.n.name} wants you gone`); });
        btn(r, 'fell them', () => { const b = nearestResident(); if (!b) return log('✗ nobody near'); b.n.hp = 0; log(`→ ${b.n.name} falls (natural death pipeline — memorial, chains, gossip all fire)`); });
        const r2 = row(el);
        btn(r2, 'STAGE EPIC: befriend + fell', () => {
          const b = nearestResident();
          if (!b) return log('✗ stand in a still first');
          g().npcDisp[b.n.id] = 50;
          b.n.hp = 0;
          log(`→ ${b.n.name} was your friend, and now they are gone.\nask the well: it will tell you about the Shaper.`);
        }, 'act');
      }));
      c.appendChild(sec('SETTLEMENT & EVENTS', (el) => {
        const r = row(el);
        btn(r, 'rep +10', () => { const s = nearestStill(); if (!s) return log('✗ none'); g().changeRep(s, 10); log(`→ ${s.name} rep ${Math.round(g().stillRep[s.key] || 0)}`); });
        btn(r, 'rep −10', () => { const s = nearestStill(); if (!s) return log('✗ none'); g().changeRep(s, -10); log(`→ ${s.name} rep ${Math.round(g().stillRep[s.key] || 0)}`); });
        btn(r, 'force RAID (nearest still)', () => { const s = nearestStill(); if (!s) return log('✗ none'); g().eventSys.forceRaid(s); log(`→ a raid gathers against ${s.name}`); });
        btn(r, 'force BLOOM (here)', () => { g().eventSys.forceBloom(pos().x + 60, pos().z); log('→ the Rust blooms 60 m east of you'); });
      }));
      c.appendChild(sec('SAVE', (el) => {
        const r = row(el);
        btn(r, 'save now', () => { g().saveT = 0.01; log('→ autosave queued'); });
        btn(r, 'dump state summary', () => {
          const gg = g();
          log(`day ${1 + Math.floor(gg.worldT)} · chains ${gg.chains.filter(ch => !ch.done).length} open · topics ${gg.topics.length}\n` +
            `dead ${gg.deadNpcIds.length} · revived stills ${Object.keys(gg.revived).length} · nests broken ${Object.keys(gg.destroyedNests).length}\n` +
            `epic: ${gg.epic ? `${gg.epic.npcName} — ${gg.epic.state} @ ${gg.epic.megaName}` : 'none'}\n` +
            `corruption ${Math.round(gg.player.corruption)} · kills ${gg.kills} · discovered ${gg.world.discovered.length}`);
        });
      }));
    },
  };

  let activeTab = null;
  const showTab = (name) => {
    activeTab = name;
    controls.innerHTML = '';
    TABS[name](controls);
    tabsEl.querySelectorAll('.dbg-tab').forEach(t => t.classList.toggle('active', t.dataset.t === name));
  };
  for (const name of Object.keys(TABS)) {
    const t = document.createElement('button');
    t.className = 'dbg-tab'; t.dataset.t = name; t.textContent = name;
    t.addEventListener('click', () => showTab(name));
    tabsEl.appendChild(t);
  }
  showTab('WORLD');

  const toggle = () => {
    root.classList.toggle('open');
    if (root.classList.contains('open')) document.exitPointerLock && document.exitPointerLock();
  };
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Backquote') { e.preventDefault(); e.stopImmediatePropagation(); toggle(); return; }
    if (root.classList.contains('open') && e.code === 'Escape') { e.stopImmediatePropagation(); toggle(); return; }
    // don't let WASD reach the game while typing in a workbench field
    if (root.classList.contains('open') && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) e.stopImmediatePropagation();
  }, true);

  window.SAR_DEBUG = { toggle, log };
  console.log('%cSAND & RUST — the workbench is loaded. press [`]', 'color:#6fe8d0');
}
