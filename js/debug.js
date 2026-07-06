// THE WORKBENCH — dev-only debug console. Loaded ONLY when the dev server
// answers HEAD /__dev__ (serve.py --dev); public hosting never sees it run.
// Backtick [`] toggles. Everything here goes through the same code paths the
// game uses (spawnAt, generateChain, the natural NPC death pipeline...), so
// what you test is what ships.
//
// ARC XII THE CONSOLIDATION: twelve tabs (one per arc) became seven —
// WORLD, TRAVEL, EVENTS, SOULS, GEAR, STORY, GEN — with every old button
// re-homed and none lost. The standing rule forward: new arcs EXTEND
// these tabs; they do not multiply them.
import { Rand, hashString } from './rng.js';
import { makePart, PART_DEFS } from './parts.js';
import { MATERIALS, CONSUMABLES } from './items.js';
import { ENEMY_KINDS } from './enemies.js';
import { generateChain } from './quests.js';
import { composeShard, composeInteriorDoc, stillHistory, whisper } from './lore.js';
import { MEGA_TYPES_ALL } from './structures.js';
import { buildResidentMesh } from './stills.js';
import { archetypeOf } from './wanderers.js';

const CAMP_CELL = 1300;

export function initDebug(getGame) {
  if (document.getElementById('dbg-root')) return;
  const css = document.createElement('style');
  css.textContent = `
#dbg-root { position: fixed; inset: 4vh 4vw; z-index: 300; display: none; flex-direction: column;
  background: rgba(10,8,5,0.96); border: 1px solid #7a5f26; font-family: inherit; color: var(--amber, #d8a050);
  padding: 14px 18px; }
#dbg-root.open { display: flex; }
#dbg-head { display: flex; align-items: baseline; gap: 14px; border-bottom: 1px solid rgba(232,163,61,0.25); padding-bottom: 8px; }
#dbg-title { color: #6fe8d0; font-size: 13px; letter-spacing: 3px; }
#dbg-tabs { display: flex; gap: 6px; }
.dbg-tab { font-family: inherit; font-size: 10px; letter-spacing: 2px; padding: 4px 12px; cursor: pointer;
  background: transparent; border: 1px solid rgba(232,163,61,0.25); color: var(--amber-dim, #8a6c3e); }
.dbg-tab.active { color: #6fe8d0; border-color: #6fe8d0; }
#dbg-filter { margin-left: auto; font-family: inherit; font-size: 10px; background: #171208;
  color: var(--amber, #d8a050); border: 1px solid rgba(232,163,61,0.4); padding: 4px 8px; width: 170px; }
#dbg-body { display: flex; gap: 16px; flex: 1; min-height: 0; padding-top: 10px; }
#dbg-controls { width: 46%; overflow-y: auto; display: flex; flex-direction: column; gap: 10px; }
#dbg-outwrap { flex: 1; display: flex; flex-direction: column; min-height: 0; gap: 4px; }
#dbg-out { flex: 1; overflow-y: auto; border: 1px solid rgba(232,163,61,0.2); background: rgba(0,0,0,0.4);
  padding: 10px 12px; font-size: 11px; line-height: 1.7; white-space: pre-wrap; }
#dbg-outbtns { display: flex; gap: 5px; justify-content: flex-end; }
.dbg-sec { border: 1px solid rgba(232,163,61,0.18); padding: 8px 10px; }
.dbg-sec-h { font-size: 9px; letter-spacing: 2px; color: var(--amber-dim, #8a6c3e); margin-bottom: 6px; }
.dbg-row { display: flex; flex-wrap: wrap; gap: 5px; align-items: center; margin-bottom: 4px; }
.dbg-btn { font-family: inherit; font-size: 10px; letter-spacing: 1px; padding: 4px 9px; cursor: pointer;
  background: rgba(40,28,12,0.8); border: 1px solid rgba(232,163,61,0.4); color: var(--amber, #d8a050); }
.dbg-btn:hover { color: #fff; border-color: #6fe8d0; }
.dbg-btn.act { color: #6fe8d0; }
.dbg-hit-tab { color: #6fe8d0; font-size: 9px; letter-spacing: 1px; margin-right: 4px; }
#dbg-root select, #dbg-root input[type=number] { font-family: inherit; font-size: 10px; background: #171208;
  color: var(--amber, #d8a050); border: 1px solid rgba(232,163,61,0.4); padding: 3px 5px; max-width: 170px; }
#dbg-root label { font-size: 10px; letter-spacing: 1px; }
#dbg-foot { font-size: 9px; color: var(--amber-dim, #8a6c3e); letter-spacing: 1px; padding-top: 8px; }
`;
  document.head.appendChild(css);

  const root = document.createElement('div');
  root.id = 'dbg-root';
  root.innerHTML = `
    <div id="dbg-head"><span id="dbg-title">// THE WORKBENCH</span><div id="dbg-tabs"></div>
      <input id="dbg-filter" placeholder="find a button… (any tab)" /></div>
    <div id="dbg-body"><div id="dbg-controls"></div>
      <div id="dbg-outwrap"><div id="dbg-out">the workbench is open. nothing you do here is the desert's fault.\n</div>
        <div id="dbg-outbtns"><button class="dbg-btn" id="dbg-copy">copy log</button><button class="dbg-btn" id="dbg-clear">clear log</button></div></div></div>
    <div id="dbg-foot">[\`] toggle · type in the filter to search every tab · dev server only — this panel does not exist in the public build</div>`;
  document.body.appendChild(root);
  const controls = root.querySelector('#dbg-controls');
  const out = root.querySelector('#dbg-out');
  const tabsEl = root.querySelector('#dbg-tabs');
  const filterEl = root.querySelector('#dbg-filter');

  const log = (t) => { out.textContent = t + '\n' + '─'.repeat(46) + '\n' + out.textContent; out.scrollTop = 0; };
  root.querySelector('#dbg-copy').addEventListener('click', () => {
    navigator.clipboard && navigator.clipboard.writeText(out.textContent).then(() => log('→ log copied'));
  });
  root.querySelector('#dbg-clear').addEventListener('click', () => { out.textContent = ''; });
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
  // spiral the lattice for the nearest mega of one kind (pure query, no build)
  const MEGA_CELL_SZ = 2600; // matches world MEGA_CELL
  const nearestMegaOf = (type) => {
    const W = g().world;
    const c0x = Math.round(pos().x / MEGA_CELL_SZ), c0z = Math.round(pos().z / MEGA_CELL_SZ);
    for (let ring = 0; ring <= 60; ring++) {
      let best = null;
      for (let dz = -ring; dz <= ring; dz++) for (let dx = -ring; dx <= ring; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== ring) continue;
        const info = W.megaInfo(c0x + dx, c0z + dz);
        if (info && info.type === type) {
          const dd = Math.hypot(info.x - pos().x, info.z - pos().z);
          if (!best || dd < best.d) best = { ...info, d: dd };
        }
      }
      if (best) return best;
    }
    return null;
  };
  const nearestStillOf = (size) => {
    for (const r of [9000, 20000, 40000, 70000]) {
      const hit = g().stills.stillsNear(pos().x, pos().z, r)
        .filter(s => (s.sizeClass || 'hamlet') === size)
        .sort((a, b) => Math.hypot(a.x - pos().x, a.z - pos().z) - Math.hypot(b.x - pos().x, b.z - pos().z))[0];
      if (hit) return hit;
    }
    return null;
  };
  const nearestStillOfTemper = (temperament) => g().stills.stillsNear(pos().x, pos().z, 60000)
    .filter(s => s.temperament === temperament)
    .sort((a, b) => Math.hypot(a.x - pos().x, a.z - pos().z) - Math.hypot(b.x - pos().x, b.z - pos().z))[0];
  // march rings of samples for a landform or biome (cheap: pure noise)
  const scanFor = (test, step = 320, maxR = 28000) => {
    for (let r = step; r <= maxR; r += step) {
      const n = Math.max(8, Math.floor((Math.PI * 2 * r) / step));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const x = pos().x + Math.sin(a) * r, z = pos().z + Math.cos(a) * r;
        if (test(g().world.sample(x, z), x, z)) return { x, z, d: r };
      }
    }
    return null;
  };
  const km = (v) => (v / 1000).toFixed(1) + ' km';
  const nearestMega = (undiscovered) => g().world.megasNear(pos().x, pos().z, 40000)
    .filter(m => !undiscovered || !g().world.discoveredKeys.has(m.key))
    .sort((a, b) => Math.hypot(a.x - pos().x, a.z - pos().z) - Math.hypot(b.x - pos().x, b.z - pos().z))[0];
  const nearestNest = () => g().nests.nestsNear(pos().x, pos().z, 25000)
    .sort((a, b) => Math.hypot(a.x - pos().x, a.z - pos().z) - Math.hypot(b.x - pos().x, b.z - pos().z))[0];
  const nearestLivingNest = () => {
    let nest = null;
    for (let rr = 500; rr < 30000 && !nest; rr += 500) {
      for (let a = 0; a < 6.283 && !nest; a += 0.4) {
        nest = g().nests.nestsNear(pos().x + Math.sin(a) * rr, pos().z + Math.cos(a) * rr, 600)
          .filter(n2 => !g().destroyedNests[n2.key])[0] || null;
      }
    }
    return nest;
  };
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
  // THE FILTER: every button built while `registering` is set files itself
  // in the registry, so one typed word can find it across every tab
  const registry = [];
  let registering = null;
  const sec = (title, build) => {
    const el = document.createElement('div');
    el.className = 'dbg-sec';
    el.innerHTML = `<div class="dbg-sec-h">${title}</div>`;
    const held = registering; // sections keep their tab context for nested rows
    build(el);
    registering = held;
    return el;
  };
  const row = (parent) => { const r = document.createElement('div'); r.className = 'dbg-row'; parent.appendChild(r); return r; };
  const btn = (parent, label, fn, cls = '') => {
    const b = document.createElement('button');
    b.className = 'dbg-btn' + (cls ? ' ' + cls : '');
    b.textContent = label;
    b.addEventListener('click', () => { try { fn(); } catch (err) { log('✗ ' + err.message); } });
    parent.appendChild(b);
    if (registering) registry.push({ tab: registering, label, fn, cls });
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
  const txt = (parent, placeholder, width = 130) => {
    const i = document.createElement('input');
    i.type = 'text'; i.placeholder = placeholder;
    i.style.cssText = `font-family:inherit;font-size:10px;background:#171208;color:var(--amber,#d8a050);border:1px solid rgba(232,163,61,0.4);padding:3px 5px;width:${width}px;`;
    parent.appendChild(i);
    return i;
  };

  const TABS = {
    // ================= WORLD: time, calendar, weather, map, state =================
    WORLD: (c) => {
      c.appendChild(sec('TIME', (el) => {
        const r = row(el);
        btn(r, 'dawn', () => { g().dayT = 0.02; log('→ dawn'); });
        btn(r, 'noon', () => { g().dayT = 0.25; log('→ noon'); });
        btn(r, 'dusk', () => { g().dayT = 0.48; log('→ dusk'); });
        btn(r, 'midnight', () => { g().dayT = 0.75; log('→ midnight'); });
        btn(r, '+1 day', () => { g().worldT += 1; log(`→ world day ${1 + Math.floor(g().worldT)} — schedules, stories, crews, wars, and the sky all move`); });
      }));
      c.appendChild(sec('THE CALENDAR', (el) => {
        const r = row(el);
        btn(r, 'what season is it', () => {
          const s = g().season;
          s ? log(`${s.name} — ${s.line} · day ${s.dayIn.toFixed(1)} of ${6} · ${s.next.name} in ${Math.ceil(s.daysLeft)} day(s)`) : log('✗ the sky is still loading');
        });
        for (const sid of ['clear', 'veil', 'glasswind', 'longcold']) {
          btn(r, '→ ' + sid, async () => {
            // forward-only: walk worldT day by day until that season dawns
            const G = g();
            const { seasonAt } = await import('./seasons.js');
            for (let i = 0; i < 30; i++) {
              const s = seasonAt(G.seed, G.worldT);
              if (s.id === sid) { log(`→ ${s.name}, day ${s.dayIn.toFixed(1)} — ${s.line}`); return; }
              G.worldT += Math.min(1, s.daysLeft + 0.02);
            }
            log('✗ the calendar refused, somehow');
          });
        }
        const r2 = row(el);
        btn(r2, 'advance to next season', () => {
          const G = g(); const s = G.season;
          if (!s) return log('✗ no season yet');
          G.worldT += s.daysLeft + 0.05;
          log(`→ the season turns: ${s.next.name}`);
        });
        btn(r2, 'cold night NOW', async () => {
          const G = g();
          const { seasonAt } = await import('./seasons.js');
          for (let i = 0; i < 30; i++) { const s = seasonAt(G.seed, G.worldT); if (s.id === 'longcold') break; G.worldT += Math.min(1, s.daysLeft + 0.02); }
          G.dayT = 0.72;
          log('→ the long cold, past midnight. watch the power cell.');
        });
      }));
      c.appendChild(sec('WEATHER', (el) => {
        const r = row(el);
        btn(r, 'storm ON', () => { g()._stormOverride = 1; log('→ storm forced on'); });
        btn(r, 'storm OFF', () => { g()._stormOverride = 0; log('→ storm forced off'); });
        btn(r, 'weather auto', () => { g()._stormOverride = null; g()._shardOverride = null; log('→ the sky is its own again'); });
        btn(r, 'SHARD STORM 60s', () => { g()._shardOverride = g().worldT + 60 / 480; log('→ the glass-wind rises — 60s, shelter matters'); });
        btn(r, 'end shard storm', () => { g()._shardOverride = 0; log('→ the knives settle'); });
      }));
      c.appendChild(sec('MAP & STATE', (el) => {
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

    // ================= TRAVEL: every port in the game + the lattice =================
    TRAVEL: (c) => {
      c.appendChild(sec('NEAREST', (el) => {
        const r = row(el);
        btn(r, 'still', () => { const s = nearestStill(); s ? port(s.x + 10, s.z, s.name) : log('✗ no still in 40km'); });
        btn(r, 'camp', () => { const cp = nearestCamp(); cp ? port(cp.x + 4, cp.z, cp.pseudoStill ? cp.pseudoStill.name : 'camp') : log('✗ no camp found'); });
        btn(r, 'nest', () => { const n = nearestNest(); n ? port(n.x + 35, n.z, n.name || 'nest') : log('✗ no nest in 25km'); });
        btn(r, 'living nest', () => { const n = nearestLivingNest(); n ? port(n.x + 10, n.z, n.name || 'the nest') : log('✗ no living nest within 30km'); });
        btn(r, 'megastructure', () => { const m = nearestMega(false); m ? port(m.x + 40, m.z, m.name) : log('✗ none'); });
        btn(r, 'undiscovered mega', () => { const m = nearestMega(true); m ? port(m.x + 40, m.z, m.name) : log('✗ none'); });
        const r2 = row(el);
        btn(r2, 'your anchor', () => port(g().anchor.x + 5, g().anchor.z, 'the anchor'));
        btn(r2, 'epic target', () => { const e = g().epic; e ? port(e.x + 40, e.z, e.megaName) : log('✗ no epic running'); });
        btn(r2, 'epic well', () => { const e = g().epic; e ? port(e.stillX + 10, e.stillZ, e.stillName) : log('✗ no epic running'); });
        btn(r2, 'ferro-cult still', () => { const s = nearestStillOfTemper('ferrocult'); s ? port(s.x + 10, s.z, `${s.name} — ferro-cult`) : log('✗ none within 60km'); });
        btn(r2, 'monastic still', () => { const s = nearestStillOfTemper('monastic'); s ? port(s.x + 10, s.z, `${s.name} — monastic`) : log('✗ none within 60km'); });
      }));
      c.appendChild(sec('MEGASTRUCTURES — nearest of each kind', (el) => {
        const r = row(el);
        for (const t of MEGA_TYPES_ALL) {
          btn(r, t, () => {
            const m = nearestMegaOf(t);
            m ? port(m.x + 45, m.z, `${m.name} — ${t}, ${km(m.d)} out`) : log(`✗ no ${t} within 60 cells`);
          });
        }
      }));
      c.appendChild(sec('STILLS — nearest of each size', (el) => {
        const r = row(el);
        for (const sz of ['hamlet', 'village', 'town']) {
          btn(r, sz, () => {
            const s = nearestStillOf(sz);
            s ? port(s.x + 12, s.z, `${s.name} — ${sz}`) : log(`✗ no ${sz} within 70 km`);
          });
        }
        btn(r, 'founded (yours)', () => {
          const keys = Object.keys(g().foundedStills || {});
          if (!keys.length) return log('✗ you have founded nothing yet');
          const f = g().foundedStills[keys[0]];
          port(f.x + 12, f.z, f.name || 'your hearth');
        });
      }));
      c.appendChild(sec('LANDFORMS & BIOMES', (el) => {
        const r = row(el);
        btn(r, 'mesa country', () => {
          const p = scanFor((s) => (s.land || 0) > 12);
          p ? port(p.x, p.z, `mesa country, ${km(p.d)} out`) : log('✗ no mesas within 28 km');
        });
        btn(r, 'canyonlands', () => {
          const p = scanFor((s) => (s.land || 0) < -9);
          p ? port(p.x, p.z, `canyonlands, ${km(p.d)} out`) : log('✗ no canyons within 28 km');
        });
        btn(r, 'a dry wash', () => {
          const p = scanFor((s) => (s.land || 0) < -1.5 && (s.land || 0) > -4);
          p ? port(p.x, p.z, `a dry wash, ${km(p.d)} out`) : log('✗ none near');
        });
        const r2 = row(el);
        for (const [id, label] of [['dunes', 'dunes'], ['flats', 'flats'], ['salt', 'salt pans'], ['glass', 'glass'], ['city', 'buried city'], ['rustlands', 'rustlands']]) {
          btn(r2, label, () => {
            const p = scanFor((s, x, z) => g().world.biomeAt(x, z).id === id, 420, 36000);
            p ? port(p.x, p.z, `${label}, ${km(p.d)} out`) : log(`✗ no ${label} within 36 km`);
          });
        }
      }));
      c.appendChild(sec('LIVE, WAR & STORY PORTS', (el) => {
        const r = row(el);
        btn(r, 'a walking caravan', () => {
          const c2 = [...g().caravans.loaded.values()][0];
          c2 ? port(c2.pseudoStill.x + 8, c2.pseudoStill.z, c2.pseudoStill.name) : log('✗ none loaded (walk near a route)');
        });
        btn(r, 'tracked job', () => {
          const G = g(), tr = G.tracked;
          let p = null;
          if (tr && tr.kind === 'chain') {
            const ch = G.chains.find(c2 => c2.id === tr.id && !c2.done);
            const cur = ch && ch.steps[ch.current];
            if (cur && cur.x !== undefined) p = { x: cur.x, z: cur.z, name: ch.title };
          } else if (tr && tr.kind === 'signal') {
            const q = G.quests.find(q2 => q2.id === tr.id && !q2.done);
            if (q) p = { x: q.x, z: q.z, name: q.title };
          } else if (tr && tr.kind === 'war' && G.war.front) {
            const f = G.war.front;
            p = f.phase === 'marching' ? { ...G.warSys.columnAt(), name: 'the column' } : { x: f.heartX, z: f.heartZ, name: 'the front' };
          } else if (tr && tr.kind === 'epic' && G.epic) {
            p = G.epic.state === 'seek' ? { x: G.epic.x, z: G.epic.z, name: G.epic.megaName }
              : { x: G.epic.stillX, z: G.epic.stillZ, name: G.epic.stillName };
          }
          p ? port(p.x + 6, p.z, p.name) : log('✗ nothing tracked with a place on it');
        });
        btn(r, 'waypoint', () => {
          const wp = g().waypoint;
          wp ? port(wp.x, wp.z, 'the waypoint') : log('✗ no waypoint set');
        });
        btn(r, 'nearest herd', () => {
          const G = g();
          let best = null;
          for (const info of G.herds.herdsNear(pos().x, pos().z, 40000)) {
            const sc = G.herds.schedule(info, G.worldT);
            const d2 = Math.hypot(sc.x - pos().x, sc.z - pos().z);
            if (!best || d2 < best.d2) best = { d2, sc, info };
          }
          best ? port(best.sc.x + 30, best.sc.z, `the herd (${best.info.size} strong, ${best.sc.walking ? 'walking' : 'grazing'})`) : log('✗ no herd within 40km');
        });
        btn(r, 'the fall-site', () => {
          const f = g().fall;
          f ? port(f.x + 30, f.z, 'the fall-site') : log('✗ no fall active');
        });
        const r2 = row(el);
        btn(r2, 'front heart', () => {
          const f = g().war.front;
          f ? port(f.heartX + 30, f.heartZ, 'the massing') : log('✗ no front');
        });
        btn(r2, 'front target still', () => {
          const f = g().war.front;
          f ? port(f.x + 10, f.z, f.stillName) : log('✗ no front');
        });
        btn(r2, 'the column', () => {
          const G = g(), f = G.war.front;
          if (!f || f.phase !== 'marching') return log('✗ no column on the ground');
          const c2 = G.warSys.columnAt();
          port(c2.x + 60, c2.z, 'the column');
        });
        btn(r2, 'the rim still', async () => {
          const { rimStillFor } = await import('./transmit.js');
          const rim = rimStillFor(g());
          rim ? port(rim.x + 10, rim.z, rim.name + ' (the rim)') : log('✗ no rim still');
        });
        btn(r2, 'the root', async () => {
          const { sourceMegaFor } = await import('./transmit.js');
          const src = sourceMegaFor(g());
          src ? port(src.x + 40, src.z, src.name + ' (the root)') : log('✗ no root');
        });
      }));
      c.appendChild(sec('THE LATTICE', (el) => {
        const r = row(el);
        btn(r, 'network?', () => {
          const G = g();
          const keys = Object.keys(G.attuned);
          if (!keys.length) return log('✗ no attuned wells — the lattice sleeps');
          log(keys.map(k => {
            const s = G.resolveStillByKey(k);
            const d = s ? Math.hypot(s.x - pos().x, s.z - pos().z) : NaN;
            return `◈ ${s ? s.name : k} — ${(d / 1000).toFixed(1)}km · day ${G.attuned[k]}${((G.stillStates[k] || {}).stage || 0) <= -2 ? ' · DARK (capped)' : ''}`;
          }).join('\n') + `\ncorruption ${Math.round(G.player.corruption)}/100`);
        });
        btn(r, 'attune nearest still', () => {
          const G = g();
          const s = nearestStill();
          if (!s) return log('✗ no still in range');
          if (G.attuned[s.key]) return log(`✗ ${s.name} already knows your signal`);
          G.attuned[s.key] = 1 + Math.floor(G.worldT);
          log(`→ attuned free of charge: ${s.name}`);
        });
        btn(r, 'attune 5 nearest', () => {
          const G = g();
          let n = 0;
          for (const s of G.stills.stillsNear(pos().x, pos().z, 40000)
            .sort((a, b) => Math.hypot(a.x - pos().x, a.z - pos().z) - Math.hypot(b.x - pos().x, b.z - pos().z)).slice(0, 5)) {
            if (!G.attuned[s.key]) { G.attuned[s.key] = 1 + Math.floor(G.worldT); n++; }
          }
          log(`→ ${n} wells learned your signal`);
        });
        const r2 = row(el);
        btn(r2, 'transmit to farthest node', async () => {
          const G = g();
          const { reachableNodes, transmit } = await import('./transmit.js');
          const nodes = reachableNodes(G, null);
          if (!nodes.length) return log('✗ nowhere to ride');
          const far = nodes[nodes.length - 1];
          transmit(G, far.key);
          log(`→ reassembled at ${far.still.name} — tithe ${far.tithe}`);
        }, 'act');
        btn(r2, 'tithe table', async () => {
          const { titheFor } = await import('./transmit.js');
          log([1, 3, 5, 10, 15, 20, 30].map(k2 => `${k2}km → ${titheFor(k2 * 1000)} corruption`).join('\n'));
        });
        btn(r2, 'forget the lattice', () => { g().attuned = {}; log('→ every node forgets your signal'); });
        btn(r2, 'static burst', () => { g().ui.txStatic(); g()._staticT = 9; log('→ the hum is on you (9s + the yard remembers half a day)'); });
        btn(r2, 'follower walk?', () => {
          const G = g(), w = G.followerWalk;
          if (!w) return log('✗ nobody is walking to you');
          const names = (w.walkers || [w.data]).map(d2 => d2.name).join(' and ');
          log(`${names} — on the road, arrives day ${(1 + w.arriveT).toFixed(2)} (now ${(1 + G.worldT).toFixed(2)})`);
        });
      }));
      c.appendChild(sec('COORDINATES', (el) => {
        const r = row(el);
        const xi = num(r, 0, -999999, 999999), zi = num(r, 0, -999999, 999999);
        btn(r, 'GO', () => port(+xi.value, +zi.value, `(${xi.value}, ${zi.value})`));
        const r2 = row(el);
        btn(r2, 'pin here', () => { window._dbgPin = { x: pos().x, z: pos().z }; log(`→ pinned (${Math.round(pos().x)}, ${Math.round(pos().z)})`); });
        btn(r2, 'return to pin', () => { const p = window._dbgPin; p ? port(p.x, p.z, 'the pin') : log('✗ nothing pinned'); });
      }));
    },

    // ================= EVENTS: everything that HAPPENS =================
    EVENTS: (c) => {
      c.appendChild(sec('THE FRONT (THE MARCH)', (el) => {
        const r = row(el);
        btn(r, 'front?', () => {
          const G = g(), f = G.war.front;
          if (!f) return log(`no front. rest until day ${1 + (G.war.rest || 0)} · campaigns fought: ${(G.war.history || []).length}${(G.war.history || []).slice(-3).map(h => `\n  day ${1 + h.day} — ${h.stillName || h.stillKey}: ${h.outcome.toUpperCase()}`).join('')}`);
          const alive = f.nests.filter(n => !G.destroyedNests[n.key]).length;
          log(`FRONT vs ${f.stillName} — ${f.phase.toUpperCase()}\nwoke day ${1 + f.wokeDay} · marches day ${1 + f.marchDay} (today: ${1 + Math.floor(G.worldT)})\nnests ${alive}/${f.nests.length} beating (dies under 3)\nheart at (${Math.round(f.heartX)}, ${Math.round(f.heartZ)})`);
        });
        btn(r, 'candidates near', () => {
          const G = g();
          const cands = G.warSys.candidatesNear(pos().x, pos().z, 12000);
          if (!cands.length) return log('✗ no still within 12km has 3+ living nests in reach');
          log(cands.map(c2 => `${c2.still.name}: ${c2.nests.length} living nests in reach — ${(Math.hypot(c2.still.x - pos().x, c2.still.z - pos().z) / 1000).toFixed(1)}km away`).join('\n'));
        });
        btn(r, 'WAKE nearest candidate', () => {
          const G = g();
          if (G.war.front) return log('✗ a front already masses — one at a time');
          const cands = G.warSys.candidatesNear(pos().x, pos().z, 12000)
            .sort((a, b) => Math.hypot(a.still.x - pos().x, a.still.z - pos().z) - Math.hypot(b.still.x - pos().x, b.still.z - pos().z));
          if (!cands.length) return log('✗ no candidate within 12km');
          G.warSys.wake(cands[0], Math.floor(G.worldT));
          G.warSys.announceFront('sense'); // the workbench skips the rumor mill
          log(`→ the waking, forced: ${cands[0].nests.length} nests mass against ${cands[0].still.name}`);
        }, 'act');
        const r2 = row(el);
        btn(r2, 'begin the MARCH now', () => {
          const G = g(), f = G.war.front;
          if (!f) return log('✗ no front to march');
          if (f.phase === 'marching') return log('✗ the column already walks');
          f.marchDay = G.worldT;
          const alive = f.nests.filter(n => !G.destroyedNests[n.key]).length;
          G.warSys.beginMarch(Math.floor(G.worldT), alive);
          log('→ the column departs the heart THIS INSTANT — watch the map mark walk');
        }, 'act');
        btn(r2, 'column?', () => {
          const G = g(), f = G.war.front;
          if (!f || f.phase !== 'marching') return log('✗ no column on the ground');
          const c2 = G.warSys.columnAt();
          log(`COLUMN vs ${f.stillName} — ${(c2.t * 100).toFixed(0)}% of the road walked\nat (${Math.round(c2.x)}, ${Math.round(c2.z)}) · ${(Math.hypot(c2.x - pos().x, c2.z - pos().z) / 1000).toFixed(2)}km from you\nstrength ${f.strength} · escorts down ${f.escortsKilled || 0} · heart-engine ${f.hulkHp ? Math.round(f.hulkHp * 100) + '%' : 'unhurt'}`);
        });
        btn(r2, 'ARRIVE now', () => {
          const G = g(), f = G.war.front;
          if (!f || f.phase !== 'marching') return log('✗ no column on the ground');
          f.marchDay = G.worldT - 2;
          log('→ the column reaches the wall on the next frame — live if you are there, paper if not');
        }, 'act');
        btn(r2, 'silence one front nest', () => {
          const G = g(), f = G.war.front;
          if (!f) return log('✗ no front');
          const n = f.nests.find(n2 => !G.destroyedNests[n2.key]);
          if (!n) return log('✗ every heart already quiet');
          G.destroyedNests[n.key] = true;
          const alive = f.nests.filter(n2 => !G.destroyedNests[n2.key]).length;
          log(`→ ${n.name} goes quiet (${alive} beating). the next day-tick does the counting.`);
        });
        btn(r2, 'end front (hard clear)', () => {
          const G = g();
          if (!G.war.front) return log('✗ no front');
          G.warSys.close(G.war.front, Math.floor(G.worldT), 'cleared');
          log('→ front erased, exhaustion clock set');
        });
        btn(r2, 'clear exhaustion', () => { g().war.rest = 0; log('→ the desert forgets its tiredness'); });
        const r3 = row(el);
        btn(r3, 'muster?', () => {
          const G = g(), f = G.war.front;
          if (!f) return log('✗ no front, no muster');
          const n = G.warSys.musterSize(f);
          const loaded = G.camps.loaded.has('war:' + f.key);
          log(`muster at ${f.stillName}: ${n} soul(s) (militia ${Math.floor(G.worldT) > f.wokeDay ? 1 : 0} · volunteers ${Math.min(2, Math.floor(G.renownAt(f.stillKey) / 3))} · funded ${f.militiaFunded ? 2 : 0})\ncamp ${loaded ? 'STANDING at the wall' : 'not materialized (get within 500m of the still)'}\nledger: ${G.warSys.defenseLedger(G.resolveStillByKey(f.stillKey) || {}, f).text}`);
        });
        btn(r3, 'fund militia (free)', () => {
          const G = g(), f = G.war.front;
          if (!f) return log('✗ no front');
          f.militiaFunded = true;
          if (G.camps.loaded.has('war:' + f.key)) G.camps.unload('war:' + f.key);
          log('→ the militia arms for nothing — the muster re-forms bigger');
        });
        btn(r3, 'pin/unpin war', () => {
          const G = g();
          if (G.tracked && G.tracked.kind === 'war') { G.tracked = null; log('→ compass released'); }
          else if (G.war.front) { G.tracked = { kind: 'war', id: G.war.front.key }; log('→ the war rides the compass'); }
          else log('✗ no front to pin');
        });
      }));
      c.appendChild(sec('THE EMBRACE', (el) => {
        const stateLine = () => {
          const G = g();
          return `embrace: ${G.embrace === null ? 'unanswered' : G.embrace === 0 ? 'answered' : 'Bloom ' + ['', 'I', 'II', 'III'][G.embrace]}`
            + `${G.fullBloom ? ' · FULL BLOOM' : ''}${G.polished ? ' · POLISHED' : ''}${G.deepMarked ? ' · deep-marked' : ''}`
            + ` · communion ${Math.round(G.player.corruption)}`;
        };
        const setEmbrace = (v) => {
          const G = g();
          G.embrace = v;
          G.player.embraceLevel = v === null ? 0 : Math.max(0, v);
          G.player.fullBloom = G.fullBloom;
          G.player.recompute(G.equipped);
          log('→ ' + stateLine());
        };
        const r = row(el);
        btn(r, 'unanswered', () => { g().fullBloom = false; g().player.fullBloom = false; setEmbrace(null); });
        btn(r, 'answered', () => setEmbrace(0));
        btn(r, 'Bloom I', () => setEmbrace(1));
        btn(r, 'Bloom II', () => setEmbrace(2));
        btn(r, 'Bloom III', () => setEmbrace(3));
        btn(r, 'FULL BLOOM on/off', () => { const G = g(); G.fullBloom = !G.fullBloom; G.player.fullBloom = G.fullBloom; if (G.fullBloom && (G.embrace === null || G.embrace < 3)) { G.embrace = 3; } setEmbrace(G.embrace); });
        btn(r, 'polished on/off', () => { g().polished = !g().polished; log('→ ' + stateLine()); });
        btn(r, 'deep marks on/off', () => { g().deepMarked = !g().deepMarked; log('→ ' + stateLine()); });
        btn(r, 'where am i, spiritually', () => log(stateLine()));
        const r2 = row(el);
        for (const v of [0, 25, 50, 75, 99, 100]) btn(r2, 'communion ' + v, () => { g().player.corruption = v; log(`→ communion ${v}`); });
        const r3 = row(el);
        btn(r3, 'answerable whisper NOW', () => { g().rustCallT = 30; log('→ the whisper hangs — [E] with nothing in reach'); });
        btn(r3, 'open the correspondence', () => { g().openRustDialogue(); log('→ speaking with the Rust'); });
        btn(r3, 'reset calling cooldown', () => { g()._callCdT = 0; log('→ the calling is ready'); });
        btn(r3, 'send the hunters', () => {
          const G = g();
          if (G.embrace === null || G.embrace < 2) { G.embrace = 2; G.player.embraceLevel = 2; }
          G.eventSys.lastHuntT = -9;
          let tries = 0;
          while (tries++ < 400 && !G.enemies.enemies.some(e2 => e2.kind === 'huntermonk')) {
            G.eventSys.maybeHunt(G, rnd());
            if (!G.enemies.enemies.some(e2 => e2.kind === 'huntermonk')) G.eventSys.lastHuntT = -9;
          }
          log(G.enemies.enemies.some(e2 => e2.kind === 'huntermonk') ? '→ the white ground sent hunters' : '✗ they would not come (in a field? indoors?)');
        });
        btn(r3, 'scouring kit', () => {
          const G = g();
          G.inventory.mats.salt = (G.inventory.mats.salt || 0) + 12;
          G.inventory.mats.scrap = (G.inventory.mats.scrap || 0) + 20;
          G.inventory.parts.push(makePart('bulwark_plate', 3, false, (Math.random() * 0xffffffff) >>> 0));
          log('→ 12 ❄ + 20 ▤ + a Mk.3 plate: the rite is affordable');
        });
      }));
      c.appendChild(sec('RAIDS, BLOOMS & THE SKY', (el) => {
        const r = row(el);
        btn(r, 'force RAID (nearest still)', () => { const s = nearestStill(); if (!s) return log('✗ none'); g().eventSys.forceRaid(s); log(`→ a raid gathers against ${s.name}`); });
        btn(r, 'force BLOOM (here)', () => { const p2 = pos(); g().eventSys.forceBloom(p2.x + 20, p2.z); log('→ the red sand rises, 20m east'); });
        btn(r, 'STAR-FALL now (2km out)', () => {
          const G = g();
          const day = Math.floor(G.worldT);
          const a = Math.random() * Math.PI * 2;
          G.fall = { epoch: 99000 + day, x: pos().x + Math.sin(a) * 2000, z: pos().z + Math.cos(a) * 2000, day, until: day + 3, cored: false };
          G.world.markDiscovered({ key: 'fall:' + G.fall.epoch, name: 'the fall of day ' + (1 + day), kind: 'starfall', x: G.fall.x, z: G.fall.z, rumored: true });
          log('→ the sky tears, 2km out — the rush is on');
        });
        btn(r, 'herd HERE 120s', () => { g().herds._force = { x: pos().x + 40, z: pos().z, until: g().worldT + 120 / 480 }; log('→ a herd gathers 40m east, for a couple of minutes'); });
      }));
    },

    // ================= SOULS: everyone who breathes =================
    SOULS: (c) => {
      c.appendChild(sec('THE FOUNDRY — souls to spec (For Brann)', (el) => {
        const r = row(el);
        const fname = txt(r, 'name (e.g. Brann)');
        const ftemp = sel(r, [['scavver', 'scavver'], ['mercantile', 'mercantile'], ['monastic', 'monastic'], ['ferrocult', 'ferro-cult']]);
        const frole = sel(r, ['warden', 'tinker', 'broker', 'sweeper', 'drifter', 'prospector', 'outrider', 'well-keeper', 'abbot', 'courier'].map(x => [x, x]));
        const fframe = sel(r, [['biped', 'biped'], ['quad', 'quad'], ['lowslung', 'lowslung']]);
        const spec = () => {
          const name = (fname.value || '').trim();
          if (!name) { log('✗ a soul needs a name — that is the entire point of the foundry'); return null; }
          return { name, temperament: ftemp.value, role: frole.value, frame: fframe.value };
        };
        const r2 = row(el);
        btn(r2, 'place as FOLLOWER', () => {
          const G = g(), s = spec();
          if (!s) return;
          if (!G.followers.hasRoom(true)) return log('✗ both chairs are taken — part with someone first');
          const newf = G.followers.recruit({
            id: 'foundry:' + s.name.toLowerCase(), name: s.name, role: s.role, temperament: s.temperament,
            quirk: '', origin: 'the long way back', baseDisp: 40, pos: G.player.pos.clone(), yaw: 0,
            bodyFrame: s.frame, form: null,
            still: { key: 'road', name: 'the road', x: G.player.pos.x, z: G.player.pos.z, temperament: s.temperament },
          }, 'the road');
          const kitBack = G.reclaimKit(newf);
          G.recruitedIds.push('foundry:' + s.name.toLowerCase());
          log(`→ ${s.name} walks beside you — ${s.role}, ${s.frame}, ${archetypeOf(s.role)}${kitBack ? '\n→ AND their old kit was waiting under their name: shouldered, every piece' : ''}`);
        }, 'act');
        btn(r2, 'place as SETTLER at your stake', () => {
          const G = g(), s = spec();
          if (!s) return;
          if (!G.stake) return log('✗ you have no stake — drive one first (a settler needs a town)');
          if (G.stakeCapacity() <= 0) return log('✗ no funded home stands empty — build homes at the works');
          G.settleSoul({
            name: s.name, temperament: s.temperament, role: s.role,
            origin: 'the long way back', bodyFrame: s.frame, form: null,
            disp: 40, fromKind: 'wanderer',
          }, null);
          log(`→ ${s.name} settles at your stake — PERSISTENT: saved with the town, on the roster, in the gossip. the real resurrection path.`);
        }, 'act');
        btn(r2, 'place STANDING HERE (test body)', () => {
          const G = g(), s = spec();
          if (!s) return;
          const key = 'foundry:' + s.name.toLowerCase();
          if (G.camps.loaded.has(key)) G.camps.unload(key);
          const salt = hashString(s.name) >>> 0;
          const cx = pos().x + 6, cz = pos().z;
          G.camps.load({
            key, x: cx, z: cz, salt, name: 'a fire by the road', residents: 1, found: true,
            pseudoStill: { key: 'camp:' + key, name: 'a fire by the road', x: cx, z: cz, salt, temperament: s.temperament },
          });
          const rec = G.camps.loaded.get(key);
          const w = rec && rec.wanderers[0];
          if (!w) return log('✗ the foundry misfired — no body came out');
          // re-forge the generated soul to spec
          G.scene.remove(w.mesh);
          w.name = s.name; w.temperament = s.temperament; w.role = s.role;
          w.archetype = archetypeOf(s.role);
          w.bodyFrame = s.frame;
          w.baseDisp = 55; w.recruitable = true;
          w.still = rec.info.pseudoStill;
          w.mesh = buildResidentMesh(s.temperament, true, s.frame, null);
          w.mesh.position.copy(w.pos);
          G.scene.add(w.mesh);
          log(`→ ${s.name} stands by a fresh fire, 6m east — EPHEMERAL (gone on reload), warm enough to recruit on the spot`);
        }, 'act');
        const r3 = row(el);
        btn(r3, 'kits waiting?', () => {
          const ks = Object.entries(g().kits || {});
          log(ks.length ? ks.map(([n, k]) => `${n}: ${k.length} part(s) — ${k.map(p => p.name).join(', ')}`).join('\n') : '✗ no kit waits for anyone');
        });
        btn(r3, 'unload test bodies', () => {
          const G = g();
          let n = 0;
          for (const key of [...G.camps.loaded.keys()]) {
            if (String(key).startsWith('foundry:')) { G.camps.unload(key); n++; }
          }
          log(`→ ${n} foundry fire(s) cold`);
        });
      }));
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
        btn(r2, 'rep +10', () => { const s = nearestStill(); if (!s) return log('✗ none'); g().changeRep(s, 10); log(`→ ${s.name} rep ${Math.round(g().stillRep[s.key] || 0)}`); });
        btn(r2, 'rep −10', () => { const s = nearestStill(); if (!s) return log('✗ none'); g().changeRep(s, -10); log(`→ ${s.name} rep ${Math.round(g().stillRep[s.key] || 0)}`); });
      }));
      c.appendChild(sec('THE COMPANY', (el) => {
        const r = row(el);
        btn(r, 'company?', () => {
          const list = g().followers.list();
          if (!list.length) return log('✗ you walk alone');
          log(list.map(f => {
            const eq = Object.entries(f.equipped).map(([s, p]) => `${s.toLowerCase()}: ${p ? `${p.name} (${p.tierName}${p.ability ? ' · ' + p.ability : ''})` : '—'}`).join('\n');
            return `${f.name} — ${f.role} · ${f.archetype}${f.sworn ? ' · SWORN' : ''}\nhp ${Math.round(f.hp)}/${f.maxHp} · dmg ${Math.round(f.dmg)}\n${eq}\ncarries ${f.gear.length} part(s) · +${Math.round((f.gearHull || 0) * 0.8)} hull · ${((f.gearArmor || 0) * 0.4).toFixed(1)} soak · +${Math.round((f.gearDmg || 0) * 0.3)} arm`;
          }).join('\n\n'));
        });
        btn(r, 'recruit a test soul', () => {
          const G = g();
          if (G.followers.follower) return log('✗ someone already walks with you (see second chair below)');
          G.followers.recruit({
            id: 'dbg:soul', name: 'Test Brann', role: 'warden', temperament: 'scavver',
            quirk: '', origin: 'the workbench', baseDisp: 40, pos: G.player.pos.clone(), yaw: 0,
            still: { key: 'road', name: 'the road', x: 0, z: 0, temperament: 'scavver' },
          }, 'the workbench');
          log('→ Test Brann falls in beside you');
        }, 'act');
        btn(r, 'recruit a SECOND test soul', () => {
          const G = g();
          if (!G.followers.follower) return log('✗ the first chair is empty — recruit someone first');
          if (G.followers.second) return log('✗ both chairs taken');
          G.followers.recruit({
            id: 'dbg:soul2', name: 'Test Vessel', role: 'mender', temperament: 'monastic',
            quirk: '', origin: 'the workbench', baseDisp: 40, pos: G.player.pos.clone(), yaw: 0,
            still: { key: 'road', name: 'the road', x: 0, z: 0, temperament: 'monastic' },
          }, 'the workbench');
          log('→ Test Vessel takes the second chair (unlock rules skipped — this is the workbench)');
        }, 'act');
        const r2 = row(el);
        btn(r2, 'gift 3 random fitting parts', () => {
          const G = g(), f = G.followers.follower;
          if (!f) return log('✗ nobody to arm');
          const fits = PART_DEFS.filter(d2 => ['PLATING', 'ARMS', 'CORE'].includes(d2.slot));
          for (let i = 0; i < 3; i++) {
            const r3 = rnd();
            const p = makePart(fits[r3.int(0, fits.length - 1)].id, r3.int(1, 3), r3.chance(0.25), r3.int(0, 0xffffffff));
            G.followers.give(p);
            log(`→ ${p.name} (${p.tierName}) — ${Object.values(f.equipped).includes(p) ? 'WORN' : 'carried'}`);
          }
        });
        btn(r2, 'strip the kit', () => {
          const G = g(), f = G.followers.follower;
          if (!f) return log('✗ nobody to strip');
          while (f.gear.length) G.inventory.parts.push(G.followers.takeBack(0));
          log('→ every part back in your pack');
        });
        btn(r2, 'make them talk NOW', () => {
          const G = g(), f = G.followers.follower;
          if (!f) return log('✗ nobody to prompt');
          f._banterCd = 0; f._idleT = 999;
          const line = G.pickBanter(f);
          line ? (G.ui.banter(f.name, line), log('→ ' + line)) : log('✗ nothing pressed and the muse is dry — walk somewhere interesting');
        });
        btn(r2, 'forget what they said', () => {
          const f = g().followers.follower;
          if (!f) return log('✗ nobody walking');
          f._banterSeen = {}; f._idleT = 0; f._idleN = 0;
          log('→ every context is fresh again');
        });
        const r3 = row(el);
        btn(r3, 'joint ledger?', () => {
          const G = g();
          const comps = Object.entries(G.companions || {});
          if (!comps.length) return log('✗ the roads carry no shared stories yet');
          log(comps.map(([n, c2]) => `${n}${c2.epithet ? ' — called ' + c2.epithet : ''}: ${c2.stories} stories (${Object.entries(c2.kinds).map(([k, v]) => k + '×' + v).join(', ')})`).join('\n')
            + `\nkits waiting: ${Object.keys(G.kits || {}).join(', ') || 'none'}`);
        });
        btn(r3, 'want?', () => {
          const G = g(), f = G.followers.follower;
          if (!f) return log('✗ nobody walking');
          const c2 = G.companions[f.name];
          if (!c2 || !c2.want) return log('✗ no want assigned yet (it assigns on the first tick)');
          log(`${f.name}'s want: ${c2.want.type}${c2.want.name ? ' — ' + c2.want.name : ''} (day ${c2.want.day})\nloyalty: ${c2.loyalty ? 'SWORN (day ' + c2.wantDone + ')' : 'unanswered, ' + (Math.floor(G.worldT) - c2.want.day) + ' day(s) carried'}`);
        });
        btn(r3, 'answer the want (free)', () => {
          const G = g(), f = G.followers.follower;
          if (!f) return log('✗ nobody walking');
          const c2 = G.companions[f.name];
          if (!c2 || !c2.want) return log('✗ no want yet');
          if (c2.loyalty) return log('✗ already sworn');
          G.fulfillWantNow(f, c2);
          log('→ the want is answered by workbench fiat — they are SWORN');
        });
        btn(r3, 'grant 4 joint stories', () => {
          const G = g(), f = G.followers.follower;
          if (!f) return log('✗ nobody walking to share them');
          for (let i = 0; i < 4; i++) G.rootStory('story:dbg:joint:' + Math.floor(G.worldT) + ':' + i + ':' + Math.random(), 'wall', 'when it mattered, the walker stood, and the yard watched.');
          log(`→ 4 stories rooted with ${f.name}'s name in them — the epithet should coin`);
        });
        btn(r3, 'second chair?', () => {
          const G = g();
          log(`second chair ${G.secondChair() ? 'UNLOCKED' : 'locked'} — sworn: ${Object.values(G.companions).some(c2 => c2.loyalty)} · joint stories: ${G.stories.filter(s => s.with).length}/4\nchairs: ${G.followers.list().map(f => f.name).join(' + ') || 'empty'}\nband: ${G.bandName || 'unnamed (needs 8 joint stories across 2 souls)'}`);
        });
        btn(r3, 'name the band NOW', () => {
          const G = g();
          if (G.bandName) return log('✗ already named: ' + G.bandName);
          const need = 8 - G.stories.filter(s => s.with).length;
          for (let i = 0; i < Math.max(0, need); i++) {
            G.rootStory('story:dbg:band:' + i + ':' + Math.random(), 'wall', 'the walker stood.');
          }
          G.companions['Test Vessel'] = G.companions['Test Vessel'] || { stories: 1, kinds: { wall: 1 }, epithet: null };
          G.bandCheck();
          log(G.bandName ? '→ ' + G.bandName : '✗ conditions still unmet (need a companion walking for joint stories)');
        });
      }));
      c.appendChild(sec('ENEMY DESIGNER', (el) => {
        const r = row(el);
        const kind = sel(r, Object.keys(ENEMY_KINDS).map(k => [k, k]));
        const tier = num(r, 1.5, 0.5, 6, 0.25);
        const infected = chk(r, 'infected');
        const count = num(r, 1, 1, 8);
        const rn = row(el);
        const ename = txt(rn, 'name (optional — for staged scenes)');
        const raider = chk(rn, 'raider (ignores fields)');
        const calm = chk(rn, 'calm (herd-walks, hits back)');
        const aggro = chk(rn, 'aggro NOW');
        const r2 = row(el);
        btn(r2, 'spawn ahead', () => {
          const p = g().player, n = +count.value;
          for (let i = 0; i < n; i++) {
            const a = g().camYaw + (i - (n - 1) / 2) * 0.35;
            const e = g().enemies.spawnAt(kind.value, p.pos.x + Math.sin(a) * 12, p.pos.z + Math.cos(a) * 12, {
              tierMult: +tier.value, infected: infected.checked,
              raider: raider.checked, aggro: aggro.checked,
              name: (ename.value || '').trim() ? (ename.value.trim() + (n > 1 ? ' ' + (i + 1) : '')) : undefined,
            });
            if (calm.checked) e.herdCalm = true;
            e.pos.y = p.pos.y;
          }
          const flags = [infected.checked && 'infected', raider.checked && 'raider', calm.checked && 'calm', aggro.checked && 'aggro'].filter(Boolean).join(', ');
          log(`→ ${n}× ${kind.value} (tier ${tier.value}${flags ? ', ' + flags : ''}${(ename.value || '').trim() ? ', named ' + ename.value.trim() : ''}) spawned ahead`);
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
    },

    // ================= GEAR: parts, materials, the chassis =================
    GEAR: (c) => {
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

    // ================= STORY: the legend, the naming, the former life =================
    STORY: (c) => {
      c.appendChild(sec('THE LEDGER', (el) => {
        const r = row(el);
        btn(r, 'root a QA story here', () => {
          const s = nearestStill();
          if (!s) return log('✗ no still near');
          const n = g().stories.filter(t => t.id.startsWith('story:qa')).length;
          g().rootStory('story:qa' + n, ['wall', 'nest', 'delve', 'road', 'hearth'][n % 5], `the walker did QA deed #${n + 1}, and ${s.name} watched.`, { stills: [s] });
          log(`→ rooted at ${s.name} (${g().stories.length} stories total)`);
        });
        btn(r, 'world-root a QA story', () => {
          const n = g().stories.filter(t => t.id.startsWith('story:qa')).length;
          g().addTale('story:qa' + n, 'legend', `the walker did a thing every fire agrees on (QA story #${n + 1}).`);
          log(`→ story known everywhere (${g().stories.length} total)`);
        });
        btn(r, 'clear QA stories', () => {
          const b4 = g().stories.length;
          g().stories = g().stories.filter(t => !t.id.startsWith('story:qa'));
          log(`→ ${b4 - g().stories.length} burned`);
        });
        btn(r, 'list the ledger', () => {
          const ts = g().stories;
          log(ts.length ? ts.map(t => `[${t.kind}] day ${t.day} · ${Object.keys(t.roots).length} place(s) · ${t.body.slice(0, 90)}`).join('\n') : 'no stories yet.');
        });
      }));
      c.appendChild(sec('THE CARRYING', (el) => {
        const r = row(el);
        btn(r, 'carry 1 day', () => { g().worldT += 1; g()._carryDay = Math.floor(g().worldT); g().carryStories(); log('→ one day of roads walked'); });
        btn(r, 'carry 10 days', () => { for (let i = 0; i < 10; i++) { g().worldT += 1; g().carryStories(); } g()._carryDay = Math.floor(g().worldT); log('→ ten days of roads walked'); });
        btn(r, 'reach of newest story', () => {
          const st = g().stories[g().stories.length - 1];
          if (!st) return log('✗ ledger empty');
          const names = Object.keys(st.roots).map(k => k === '*' ? 'EVERYWHERE' : (g().resolveStillByKey(k) || { name: k }).name);
          log(`"${st.body.slice(0, 60)}…"\nknown at: ${names.join(' · ')}`);
        });
      }));
      c.appendChild(sec('RENOWN & THE NAMING', (el) => {
        const r = row(el);
        btn(r, 'renown here', () => {
          const s = nearestStill();
          s ? log(`→ renown at ${s.name}: +${g().renownAt(s.key).toFixed(1)} regard (${g().stories.filter(t => t.kind !== 'other' && (s.key in t.roots || '*' in t.roots)).length} stories known)`) : log('✗ no still near');
        });
        btn(r, 'make naming ready here', () => {
          const s = nearestStill();
          if (!s) return log('✗ no still near');
          for (let i = 0; i < 4; i++) g().rootStory('story:qa-name' + i, 'nest', `QA deed ${i + 1} for the naming.`, { stills: [s] });
          g().namingRefused = false;
          log(`→ ${s.name} is ready to name you — visit its well. (coined: ${g().coinEpithet(s)})`);
        });
        btn(r, 'preview coined name', () => {
          const s = nearestStill();
          s ? log(`→ ${s.name} would call you: ${g().coinEpithet(s)}`) : log('✗ no still near');
        });
        const r2 = row(el);
        btn(r2, 'clear epithet + refusal', () => {
          g().epithet = null; g().namingRefused = false;
          g().stories = g().stories.filter(t => t.id !== 'story:naming' && t.id !== 'story:refusedname');
          log('→ unnamed again; the question reopens');
        });
        btn(r2, 'who am i', () => log(`epithet: ${g().epithet || '(unnamed — the walker)'}${g().namingRefused ? ' · naming refused' : ''}${g().bandName ? ' · the band: ' + g().bandName : ''}`));
      }));
      c.appendChild(sec('THE OTHERS', (el) => {
        const r = row(el);
        btn(r, 'nearest other-legend', () => {
          const G = g();
          for (const rr of [9000, 20000, 45000]) {
            for (const s of G.stills.stillsNear(pos().x, pos().z, rr)
              .sort((a, b) => Math.hypot(a.x - pos().x, a.z - pos().z) - Math.hypot(b.x - pos().x, b.z - pos().z))) {
              const leg = G.otherLegendAt(s);
              if (leg) {
                G.ensureOtherLegend(s);
                return log(`→ ${s.name}: ${leg.name} (${leg.alive ? 'ALIVE — resident #' + leg.idx : 'a name on the rim'}) — ${leg.tpl.key}. porting…`)
                  || port(s.x + 10, s.z, `${s.name} — home of ${leg.name}`);
              }
            }
          }
          log('✗ no other-legend within 45km');
        });
        btn(r, 'list known others', () => {
          const os = g().stories.filter(t => t.kind === 'other');
          log(os.length ? os.map(t => `${t.subject.name} @ ${t.subject.stillName} (${t.subject.alive ? 'alive' : 'the rim'}) · known at ${Object.keys(t.roots).length}`).join('\n') : 'none surfaced yet — legends surface when their still first loads');
        });
      }));
      c.appendChild(sec('THE FORMER LIFE', (el) => {
        const r = row(el);
        btn(r, 'designation?', async () => {
          const { formerDesignation, LEAK_AT } = await import('./transmit.js');
          const G = g();
          log(`the line files you under: ${formerDesignation(G.seed)}\nrides ${G.txCount || 0} · leaks ${G.txLeaks || 0}/3 (at rides ${LEAK_AT.join('/')})`);
        });
        btn(r, 'former life?', async () => {
          const { formerDesignation, rimStillFor, formerPieces } = await import('./transmit.js');
          const G = g(), fl = G.formerLife, rim = rimStillFor(G);
          log(`${formerDesignation(G.seed)} — ${formerPieces(G)}/6 pieces\nleaks ${G.txLeaks || 0}/3 · rim ${fl.rim ? 'day ' + fl.rim : '—'} · soul ${fl.soul ? 'day ' + fl.soul : '—'} · doc ${fl.doc ? 'day ' + fl.doc : '—'}\nline asked: ${fl.lineAsked} · trail: ${fl.trail}\nrim still: ${rim ? `${rim.name} — ${(Math.hypot(rim.x - pos().x, rim.z - pos().z) / 1000).toFixed(1)}km` : 'none?!'}`);
        });
        btn(r, 'leak next fragment', async () => {
          const { FRAGMENTS, LEAK_AT } = await import('./transmit.js');
          const G = g();
          if ((G.txLeaks || 0) >= FRAGMENTS.length) return log('✗ the line has given up everything it held (for now)');
          G.txCount = LEAK_AT[G.txLeaks || 0] - 1;
          log(`→ txCount set to ${G.txCount}: the NEXT ride surfaces fragment ${(G.txLeaks || 0) + 1}`);
        });
        btn(r, 'grant 3 leaks', () => { const G = g(); G.txCount = Math.max(G.txCount, 7); G.txLeaks = 3; log('→ the line has given up all three fragments'); });
        btn(r, 'grant rim+soul+doc', async () => {
          const { trailCheck } = await import('./transmit.js');
          const G = g(), day = 1 + Math.floor(G.worldT);
          G.formerLife.rim = G.formerLife.rim || day;
          G.formerLife.soul = G.formerLife.soul || day;
          G.formerLife.doc = G.formerLife.doc || day;
          trailCheck(G);
          log('→ rim, soul, and paper all granted — the trail should lean');
        });
        const r2 = row(el);
        btn(r2, 'where is the root?', async () => {
          const { sourceMegaFor } = await import('./transmit.js');
          const src = sourceMegaFor(g());
          src ? log(`the root: beneath ${src.name} (${src.type}) — ${(Math.hypot(src.x - pos().x, src.z - pos().z) / 1000).toFixed(1)}km · known: ${g().formerLife.rootKnown || false} · record read: ${g().formerLife.source ? 'day ' + g().formerLife.source : 'no'}`) : log('✗ no root?!');
        });
        btn(r2, 'reveal root free', async () => {
          const { sourceMegaFor } = await import('./transmit.js');
          const G = g(), src = sourceMegaFor(G);
          if (!src) return log('✗ no root');
          G.formerLife.trail = true; G.formerLife.rootKnown = true;
          G.world.markDiscovered({ key: src.key, name: src.name, kind: src.type, x: src.x, z: src.z, rumored: true });
          log(`→ the way to the root is known: ${src.name}`);
        });
        btn(r2, 'choice?', () => {
          const G = g();
          log(`the answer field: ${G.formerLife.choice ? G.formerLife.choice.toUpperCase() : 'blank (record read: ' + (G.formerLife.source ? 'yes' : 'no') + ')'}`);
        });
        for (const ch of ['carried', 'walker', 'erased']) {
          btn(r2, 'choose ' + ch, () => {
            const G = g();
            G.formerLife.source = G.formerLife.source || 1 + Math.floor(G.worldT);
            G.formerLife.choice = ch;
            log(`→ the answer field reads: ${ch.toUpperCase()} (free, no ceremony — use the reading room for the real thing)`);
          });
        }
        btn(r2, 'unchoose', () => { g().formerLife.choice = null; log('→ the field is blank again (dev only; the desert would not allow this)'); });
      }));
    },

    // ================= GEN: the generators, previewed =================
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
  };

  // ---------- the filter registry: build every tab once, detached ----------
  for (const name of Object.keys(TABS)) {
    registering = name;
    TABS[name](document.createElement('div'));
  }
  registering = null;

  // ---------- tab display, with memory ----------
  let activeTab = null;
  const showTab = (name) => {
    activeTab = name;
    filterEl.value = '';
    controls.innerHTML = '';
    TABS[name](controls);
    tabsEl.querySelectorAll('.dbg-tab').forEach(t => t.classList.toggle('active', t.dataset.t === name));
    try { localStorage.setItem('sar-bench-tab', name); } catch (e) { /* private mode */ }
  };
  for (const name of Object.keys(TABS)) {
    const t = document.createElement('button');
    t.className = 'dbg-tab'; t.dataset.t = name; t.textContent = name;
    t.addEventListener('click', () => showTab(name));
    tabsEl.appendChild(t);
  }
  let remembered = null;
  try { remembered = localStorage.getItem('sar-bench-tab'); } catch (e) { /* private mode */ }
  showTab(TABS[remembered] ? remembered : 'WORLD');

  // ---------- THE FILTER: one typed word finds any button, any tab ----------
  const showFilter = (q) => {
    controls.innerHTML = '';
    tabsEl.querySelectorAll('.dbg-tab').forEach(t => t.classList.remove('active'));
    const hits = registry.filter(e => e.label.toLowerCase().includes(q));
    const el = sec(`FOUND ${hits.length} BUTTON${hits.length === 1 ? '' : 'S'} FOR “${q}”`, (s) => {
      for (const hit of hits.slice(0, 60)) {
        const r = row(s);
        const tag = document.createElement('span');
        tag.className = 'dbg-hit-tab'; tag.textContent = '[' + hit.tab + ']';
        r.appendChild(tag);
        btn(r, hit.label, hit.fn, hit.cls);
      }
      if (hits.length > 60) { const r = row(s); r.textContent = `…and ${hits.length - 60} more — narrow the search`; }
      if (!hits.length) { const r = row(s); r.textContent = 'nothing matches. the bench has no such lever.'; }
    });
    controls.appendChild(el);
  };
  filterEl.addEventListener('input', () => {
    const q = filterEl.value.trim().toLowerCase();
    if (!q) return showTab(activeTab || 'WORLD');
    showFilter(q);
  });

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

  window.SAR_DEBUG = { toggle, log, registry, showTab };
  console.log('%cSAND & RUST — the workbench is consolidated. press [`]', 'color:#6fe8d0');
}
