// Topic discovery — Morrowind by way of the blackboard. The words people use
// are doors: mentions of real places, real people, and the desert's ideas
// light up in dialogue and join a persistent list of subjects. Asking routes
// through what THIS speaker plausibly knows — their walls, their roads, their
// creed — before it deflects. Gossip stays a map; now curiosity steers it.
import { CONCEPTS, DEFLECT, HOSTILE_BRUSH, PLACE_UNKNOWN, PERSON_UNKNOWN, REGION_RESP, WELL_TOPICS, WELL_DEFLECT } from '../data/topics.js';
import { decorate, residentGossip, aboutSelf, rumorText, neighborGossip } from './dialogue.js';
import { stillHistory } from './lore.js';

const MEGA_KNOW = 5200;   // how far a resident's mental map of the big ones reaches
const STILL_KNOW = 6500;  // matches the neighbor-gossip radius
const MEGA_KINDS = ['ring', 'colossus', 'dish', 'spire'];

const isWordCh = (ch) => ch !== undefined && /[a-z0-9’'-]/i.test(ch);

export class TopicSystem {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.fresh = new Set(); // topics first heard in the current conversation
    // concept aliases never change; build their matchers once
    this.conceptMatchers = [];
    for (const [id, c] of Object.entries(CONCEPTS)) {
      for (const alias of c.aliases) {
        this.conceptMatchers.push({ id: 'c:' + id, label: c.label, alias: alias.toLowerCase() });
      }
    }
  }

  // every conversation happens somewhere; followers talk from where you stand
  anchor(npc) {
    if (npc.still && npc.still.x !== undefined) return npc.still;
    const p = this.game.player.pos;
    return { x: p.x, z: p.z };
  }

  // the referent table for one conversation: which names could come up here?
  openContext(npc) {
    const g = this.game, at = this.anchor(npc);
    this.fresh = new Set();
    const matchers = [...this.conceptMatchers];
    const seen = new Set(matchers.map(m => m.id));
    const add = (id, label) => {
      if (!label || seen.has(id)) return;
      seen.add(id);
      matchers.push({ id, label, alias: label.toLowerCase() });
    };
    for (const m of g.world.megasNear(at.x, at.z, MEGA_KNOW)) add('m:' + m.key, m.name);
    for (const d of g.world.discovered) {
      if (d.kind === 'still') add('s:' + String(d.key).replace(/^still:/, ''), d.name);
      else if (MEGA_KINDS.includes(d.kind)) add('m:' + d.key, d.name);
    }
    for (const s of g.stills.stillsNear(at.x, at.z, STILL_KNOW)) add('s:' + s.key, s.name);
    const region = g.world.regionName(at.x, at.z);
    // match the bare name: templates re-article it ("the {region} is whispering")
    if (region) matchers.push({ id: 'r:' + region, label: region, alias: region.replace(/^the\s+/i, '').toLowerCase() });
    // people: everyone inside these walls, plus whoever the speaker has opinions on
    const rec = npc.still && g.stills.loaded && g.stills.loaded.get(npc.still.key);
    if (rec) for (const n of rec.npcs) add('p:' + n.name, n.name);
    if (npc.opinionOf) add('p:' + npc.opinionOf, npc.opinionOf);
    if (g.followers.follower) add('p:' + g.followers.follower.name, g.followers.follower.name);
    add('p:' + npc.name, npc.name);
    matchers.sort((a, b) => b.alias.length - a.alias.length); // longest alias wins overlaps
    this.ctx = { npc, matchers };
  }

  register(id, label) {
    const g = this.game;
    if (g.topics.some(t => t.id === id)) return false;
    g.topics.push({ id, label, kind: id[0], day: Math.floor(g.worldT) });
    this.fresh.add(id);
    return true;
  }

  // wrap known subjects in clickable spans; every mention becomes a topic
  linkify(text) {
    if (!this.ctx) return { html: text, fresh: 0 };
    const lower = text.toLowerCase();
    const ranges = [];
    for (const m of this.ctx.matchers) {
      let i = 0;
      while ((i = lower.indexOf(m.alias, i)) !== -1) {
        const j = i + m.alias.length;
        // a possessive ("the well’s") still counts as a mention of the well
        const endOk = !isWordCh(text[j]) || ((text[j] === '’' || text[j] === "'") && lower[j + 1] === 's');
        const clean = !isWordCh(text[i - 1]) && endOk
          && !ranges.some(r => i < r.end && j > r.start);
        if (clean) { ranges.push({ start: i, end: j, id: m.id, label: m.label }); break; }
        i = j;
      }
    }
    if (!ranges.length) return { html: text, fresh: 0 };
    ranges.sort((a, b) => a.start - b.start);
    let html = '', cursor = 0, fresh = 0;
    for (const r of ranges) {
      if (this.register(r.id, r.label)) fresh++;
      html += text.slice(cursor, r.start)
        + `<span class="tw" data-t="${r.id}">${text.slice(r.start, r.end)}</span>`;
      cursor = r.end;
    }
    html += text.slice(cursor);
    return { html, fresh };
  }

  // newest subjects first; the ones from this conversation are marked
  railList() {
    return [...this.game.topics].reverse().map(t => ({ ...t, fresh: this.fresh.has(t.id) }));
  }

  labelOf(id) {
    const t = this.game.topics.find(t => t.id === id);
    return t ? t.label : 'that';
  }

  // what does THIS speaker say when asked? knowledge before deflection.
  respond(id, npc, rand) {
    const g = this.game, at = this.anchor(npc);
    const temp = npc.temperament;
    const { effD, tier } = g.calcDisp(npc);
    if (tier.cls === 'hostile') return { text: decorate(rand.pick(HOSTILE_BRUSH), npc, rand) };
    const kind = id[0], rest = id.slice(2);
    // the well is not a resident — it is the substrate. it speaks on the deep
    // subjects in its own voice, and declines the rest without apology.
    if (npc.isWell) {
      if (kind === 'c' && WELL_TOPICS[rest]) return { text: rand.pick(WELL_TOPICS[rest]) };
      return { text: rand.pick(WELL_DEFLECT) };
    }

    if (kind === 'c') {
      const c = CONCEPTS[rest];
      if (!c) return { text: decorate(rand.pick(DEFLECT[temp]), npc, rand) };
      let pool = c.by[temp] || DEFLECT[temp];
      // trusted friends hear the deeper verses, often
      if (effD >= 50 && c.warm && c.warm[temp]) pool = [...pool, ...c.warm[temp], ...c.warm[temp]];
      return { text: decorate(rand.pick(pool), npc, rand) };
    }
    if (kind === 'm') {
      const [mx, mz] = rest.split(',').map(Number);
      const info = g.world.megaInfo(mx, mz);
      if (!info || Math.hypot(info.x - at.x, info.z - at.z) > MEGA_KNOW) {
        return { text: decorate(rand.pick(PLACE_UNKNOWN[temp]).replaceAll('{name}', this.labelOf(id)), npc, rand) };
      }
      const marked = g.world.markDiscovered({ key: info.key, name: info.name, kind: info.type, x: info.x, z: info.z });
      return { text: rumorText(npc, info, at, rand), sys: marked ? '— marked on map [M]' : undefined };
    }
    if (kind === 's') {
      if (npc.still && npc.still.key === rest) {
        const lines = [...stillHistory(g.world, g.stills, npc.still, 3), ...(g.histories[rest] || [])];
        return { text: rand.pick(lines) };
      }
      const s = g.stills.stillsNear(at.x, at.z, STILL_KNOW).find(n => n.key === rest);
      if (!s) return { text: decorate(rand.pick(PLACE_UNKNOWN[temp]).replaceAll('{name}', this.labelOf(id)), npc, rand) };
      const marked = g.world.markDiscovered({ key: 'still:' + s.key, name: s.name, kind: 'still', x: s.x, z: s.z });
      return { text: neighborGossip(npc, s, at, rand), sys: marked ? '— settlement marked on map [M]' : undefined };
    }
    if (kind === 'p') {
      if (rest === npc.name) return { text: aboutSelf(npc, rand) };
      const rec = npc.still && g.stills.loaded && g.stills.loaded.get(npc.still.key);
      const knows = (rec && rec.npcs.some(n => n.name === rest))
        || npc.opinionOf === rest
        || (g.followers.follower && g.followers.follower.name === rest);
      if (knows) return { text: residentGossip(npc, rest, rand) };
      return { text: decorate(rand.pick(PERSON_UNKNOWN[temp]).replaceAll('{name}', rest), npc, rand) };
    }
    if (kind === 'r') {
      if (rest === g.world.regionName(at.x, at.z)) {
        const bare = rest.replace(/^the\s+/i, '');
        return { text: decorate(rand.pick(REGION_RESP[temp]).replaceAll('{region}', bare), npc, rand) };
      }
      return { text: decorate(rand.pick(PLACE_UNKNOWN[temp]).replaceAll('{name}', rest), npc, rand) };
    }
    return { text: decorate(rand.pick(DEFLECT[temp]), npc, rand) };
  }
}
