// THE MARCH: the Rust learns to add. Where enough fabricator nests stand
// in reach of one living still, some morning they wake TOGETHER — a front.
// Three days of massing, then the march. Silence enough hearts while it
// masses and the waking dies on the ground it rose from. Fronts are saved
// state; their rolls are seeded per (still, day). One front at a time:
// the desert is patient, not infinite.
import { hash2, hashString } from './rng.js';
import { bearingWord } from './lore.js';

export const FRONT_MIN = 3;      // living nests that make a cluster worth waking
export const FRONT_REACH = 3800; // a nest this close to a still can join its front
export const MASS_DAYS = 3;      // days between the waking and the march
export const REST_DAYS = 6;      // exhaustion after a campaign — one season's breath

export class WarSystem {
  constructor(game) { this.game = game; }

  // the cluster that could wake against a still: its living nests, in reach
  clusterAt(still) {
    const g = this.game;
    return g.nests.nestsNear(still.x, still.z, FRONT_REACH)
      .filter(n => !g.destroyedNests[n.key]);
  }

  // every still near (x, z) with a cluster big enough to wake
  candidatesNear(x, z, radius = 9000) {
    const g = this.game;
    const out = [];
    for (const s of g.stills.stillsNear(x, z, radius)) {
      if (((g.stillStates[s.key] || {}).stage || 0) <= -2) continue; // ash draws no armies
      const nests = this.clusterAt(s);
      if (nests.length >= FRONT_MIN) out.push({ still: s, nests });
    }
    return out;
  }

  // is this nest feeding a massing front? its brood runs hot while it does
  pressed(nestKey) {
    const f = this.game.war.front;
    return !!(f && f.phase === 'massing' && f.nests.some(n => n.key === nestKey));
  }

  // the daily arithmetic, from the world's day-tick
  tick(day) {
    const g = this.game;
    if (g.war.front) {
      // a reload can swallow a live battle: the orphaned siege goes to paper
      if (g.war.front.phase === 'siege' && !g.eventSys.raidFor(g.war.front.stillKey)) { this.strikePaper(day); return; }
      this.frontTick(day);
      return;
    }
    if (day < (g.war.rest || 0)) return; // the desert is catching its breath
    const cold = g.season && g.season.id === 'longcold' ? 0.05 : 0; // hunger organizes
    for (const c of this.candidatesNear(g.player.pos.x, g.player.pos.z)) {
      const chance = Math.min(0.18, 0.035 + (c.nests.length - FRONT_MIN) * 0.02 + cold);
      if (hash2(g.seed, hashString('wake' + c.still.key) | 0, day) % 1000 >= chance * 1000) continue;
      this.wake(c, day);
      return; // one waking is plenty for any morning
    }
  }

  wake(c, day) {
    const g = this.game;
    const nests = c.nests.map(n => ({ key: n.key, name: n.name, x: n.x, z: n.z }));
    const hx = nests.reduce((a, n) => a + n.x, 0) / nests.length;
    const hz = nests.reduce((a, n) => a + n.z, 0) / nests.length;
    g.war.front = {
      key: 'front:' + c.still.key + ':' + day,
      stillKey: c.still.key, stillName: c.still.name,
      x: c.still.x, z: c.still.z, heartX: hx, heartZ: hz,
      nests, wokeDay: day, marchDay: day + MASS_DAYS, phase: 'massing',
      known: false, // knowledge is earned: by ear (rumor) or by eye (proximity)
    };
    // the desert doesn't send telegrams: if you're close enough to hear the
    // brood-song change, you know NOW; otherwise the word must reach a mouth
    // near you (deliverRumors) or your own feet must find it (update)
    const near = Math.min(
      Math.hypot(g.player.pos.x - hx, g.player.pos.z - hz),
      Math.hypot(g.player.pos.x - c.still.x, g.player.pos.z - c.still.z));
    if (near < 2600) this.announceFront('sense');
    else g.rumors.push({
      id: 'rumor:' + g.war.front.key, kind: 'waking', day,
      x: c.still.x, z: c.still.z, reach: 9500,
      data: { frontKey: g.war.front.key, stillName: c.still.name },
    });
  }

  // the moment the war becomes YOURS to know: marks, topics, journal, pin.
  // via 'sense' = you heard the song yourself; 'told' = a mouth brought it.
  announceFront(via = 'sense') {
    const g = this.game, f = g.war.front;
    if (!f || f.known) return;
    f.known = true;
    g.rumors = (g.rumors || []).filter(r => !(r.kind === 'waking' && r.data.frontKey === f.key));
    g.audio.play('bell');
    g.ui.toast(via === 'sense'
      ? `THE NESTS ARE WAKING TOGETHER — a front masses against ${f.stillName.toUpperCase()}`
      : `WORD OF WAR — a front ${f.phase === 'marching' ? 'MARCHES on' : 'masses against'} ${f.stillName.toUpperCase()}`, 'rust');
    g.world.markDiscovered({
      key: f.key, name: (f.phase === 'marching' ? 'the column against ' : 'the front against ') + f.stillName,
      kind: 'front', x: f.heartX, z: f.heartZ, rumored: true,
    });
    for (const n of f.nests) g.world.markDiscovered({ key: 'nest:' + n.key, name: n.name, kind: 'nest', x: n.x, z: n.z, rumored: true });
    // rumor of a war is rumor of a PLACE: the threatened still lands on the
    // map and in your topics, even if you've never walked its yard
    g.world.markDiscovered({ key: 'still:' + f.stillKey, name: f.stillName, kind: 'still', x: f.x, z: f.z, rumored: true });
    g.topicsSys && g.topicsSys.register('s:' + f.stillKey, f.stillName);
    const bw = bearingWord(f.x - g.player.pos.x, f.z - g.player.pos.z);
    const km = (Math.hypot(f.x - g.player.pos.x, f.z - g.player.pos.z) / 1000).toFixed(1);
    g.journal.push({
      type: 'lore', cat: 'event', title: `THE WAKING — ${f.stillName.toUpperCase()}`,
      body: `${via === 'sense' ? 'you heard it yourself: ' : 'the word finally reached you: '}on day ${1 + f.wokeDay} the ${f.nests.length} nests around ${f.stillName} — ${km} km to the ${bw} — woke on the same breath, and their brood-song found one key. ${f.phase === 'marching' ? 'the column is ALREADY ON THE ROAD.' : `they mass until day ${1 + f.marchDay}; then they march.`} fewer than ${FRONT_MIN} hearts left beating and the front dies where it rose. the still and the nests are marked.`,
    });
    // CALL FOR AID: a free compass takes the war by default
    if (!g.tracked) {
      g.tracked = { kind: 'war', id: f.key };
      g.ui.toast('the war rides your compass — the pin follows the front', 'good');
    }
  }

  // THE MUSTER: the world answers itself. Inside a day the still arms its
  // own; your renown raises volunteers; funded plate raises more. The
  // muster is a real camp at the wall — souls with names, who fight.
  musterSize(f) {
    const g = this.game;
    const day = Math.floor(g.worldT);
    let n = day > f.wokeDay ? 1 : 0;                            // the still's own militia
    n += Math.min(2, Math.floor(g.renownAt(f.stillKey) / 3));   // the stories raise volunteers
    if (f.militiaFunded) n += 2;                                 // the plate you bought
    return Math.min(5, n);
  }

  musterUpdate() {
    const g = this.game, f = g.war.front;
    if (!f) return;
    const n = this.musterSize(f);
    if (n <= 0) return;
    const key = 'war:' + f.key;
    if (Math.hypot(g.player.pos.x - f.x, g.player.pos.z - f.z) < 500 && !g.camps.loaded.has(key)) {
      // the camp stands on the defended side, back to the wall,
      // facing the road the war will come by
      const a = Math.atan2(f.heartX - f.x, f.heartZ - f.z) + Math.PI;
      const salt = hash2(g.seed, hashString(f.key) | 0, 7717);
      const mx = f.x + Math.sin(a) * 52, mz = f.z + Math.cos(a) * 52;
      g.camps.load({
        key, x: mx, z: mz, salt, name: 'the muster', residents: n, found: false,
        // a real pseudo-still, like every natural camp: souls with no home
        // record crash the dialogue (disposition, gossip, topics all key on it)
        pseudoStill: { key: 'camp:' + key, name: 'the muster of ' + f.stillName, x: mx, z: mz, salt, temperament: 'scavver' },
      });
      if (!f.mustered && f.known) {
        f.mustered = true;
        const vols = Math.min(2, Math.floor(g.renownAt(f.stillKey) / 3));
        g.audio.play('bell');
        g.ui.toast(`THE MUSTER OF ${f.stillName.toUpperCase()} — ${n} soul${n === 1 ? '' : 's'} stand to at the wall`, 'good');
        g.journal.push({
          type: 'lore', cat: 'event', title: `THE MUSTER — ${f.stillName.toUpperCase()}`,
          body: `${n} soul${n === 1 ? ' has' : 's have'} made camp against the wall of ${f.stillName}, facing the road the war will come by.${vols ? ` ${vols} of them came because the stories say you'll be there.` : ''}${f.militiaFunded ? ' two wear the plate you paid for.' : ''} they will stand the siege whether you do or not.`,
        });
      }
    }
  }

  frontTick(day) {
    const g = this.game, f = g.war.front;
    if (f.phase !== 'massing') return; // a marching column answers to the road, not the nests
    const alive = f.nests.filter(n => !g.destroyedNests[n.key]);
    if (alive.length < FRONT_MIN) { this.breakFront(day); return; }
    if (day >= f.marchDay) this.beginMarch(day, alive.length);
  }

  // THE COLUMN: the nests empty onto the road. From here the front's life
  // is the warhulk's life — break the heart-engine and the war forgets
  // why it came. arrival is watched per-frame in update().
  beginMarch(day, strength) {
    const g = this.game, f = g.war.front;
    f.phase = 'marching';
    f.strength = strength;
    f.escortsKilled = 0;
    if (!f.known) return; // a war you haven't heard of marches in silence
    const dur = this.marchDur();
    const eta = dur < 0.35 ? 'by mid-morning' : dur < 0.6 ? 'by midday' : dur < 0.85 ? 'by dusk' : 'by nightfall';
    g.audio.play('bell');
    g.ui.toast(`THE COLUMN WALKS — the front marches on ${f.stillName.toUpperCase()}`, 'rust');
    const mark = g.world.discovered.find(m => m.key === f.key);
    if (mark) mark.name = 'the column against ' + f.stillName;
    g.journal.push({
      type: 'lore', cat: 'event', title: `THE COLUMN — ${f.stillName.toUpperCase()}`,
      body: `on day ${1 + day} the massing became a march: ${strength} nests' worth of machines on the ground behind a heart-engine, walking the straight line to ${f.stillName}. it reaches the wall ${eta}. the column is marked, and it moves — break the heart-engine and the front dies on the road. every escort dropped is one fewer at the wall.`,
    });
  }

  // pure schedule: where the column stands at this instant of world-time
  marchDur() {
    const f = this.game.war.front;
    const dist = Math.hypot(f.x - f.heartX, f.z - f.heartZ) || 1;
    return Math.min(1.0, Math.max(0.3, dist / 3400)); // ~7 m/s of world-walking
  }

  columnAt() {
    const g = this.game, f = g.war.front;
    const dur = this.marchDur();
    const t = Math.min(1, (g.worldT - f.marchDay) / dur);
    const dx = f.x - f.heartX, dz = f.z - f.heartZ;
    const dist = Math.hypot(dx, dz) || 1;
    return { x: f.heartX + dx * t, z: f.heartZ + dz * t, t, dirX: dx / dist, dirZ: dz / dist };
  }

  // per-frame: the column walks whether you watch or not; watching makes it flesh
  update(dt) {
    const g = this.game, f = g.war.front;
    // you can always simply RUN ACROSS a war: close enough to hear the
    // massing (or see the column), the front announces itself
    if (f && !f.known) {
      const c = f.phase === 'marching' ? this.columnAt() : { x: f.heartX, z: f.heartZ };
      const near = Math.min(
        Math.hypot(g.player.pos.x - c.x, g.player.pos.z - c.z),
        Math.hypot(g.player.pos.x - f.x, g.player.pos.z - f.z));
      if (near < 2600) this.announceFront('sense');
    }
    this.musterUpdate();
    if (!f || f.phase !== 'marching') { if (this._col) this.unloadColumn(false); return; }
    const c = this.columnAt();
    if (c.t >= 1) { this.arrive(); return; }
    // the map mark walks with the war
    if (!this._colMark || this._colMark.key !== f.key) this._colMark = g.world.discovered.find(m => m.key === f.key) || null;
    if (this._colMark) { this._colMark.x = c.x; this._colMark.z = c.z; }
    const pd = Math.hypot(g.player.pos.x - c.x, g.player.pos.z - c.z);
    if (!this._col && pd < 340) this.loadColumn(c);
    else if (this._col && pd > 380) this.unloadColumn(true);
    if (this._col) this.steerColumn(c);
  }

  loadColumn(c) {
    const g = this.game, f = g.war.front;
    const tier = 1 + Math.min(1.4, f.strength * 0.07);
    const hulk = g.enemies.spawnAt('warhulk', c.x, c.z, { name: 'the heart-engine', raider: true, tierMult: tier });
    if (f.hulkHp) hulk.hp = hulk.maxHp * f.hulkHp;
    hulk.columnTag = 'hulk';
    const kinds = ['dervish', 'rustform', 'scrabbler', 'lurcher', 'dervish', 'spindler'];
    const n = Math.max(0, Math.min(12, 3 + f.strength) - (f.escortsKilled || 0));
    const escorts = [];
    for (let i = 0; i < n; i++) {
      const back = 7 + (i >> 1) * 5, side = (i % 2 ? 1 : -1) * (3.5 + (i >> 1) * 0.8);
      const e = g.enemies.spawnAt(kinds[i % kinds.length],
        c.x - c.dirX * back - c.dirZ * side, c.z - c.dirZ * back + c.dirX * side,
        { raider: true, infected: Math.random() < 0.5, tierMult: tier * 0.9 });
      e.columnTag = 'escort';
      escorts.push(e);
    }
    this._col = { hulk, escorts };
    if (!f.seen) {
      f.seen = true;
      g.audio.play('bell');
      g.ui.toast(`THE COLUMN — ${1 + n} machines walking on ${f.stillName.toUpperCase()}, a heart-engine at the head`, 'rust');
    }
  }

  steerColumn(c) {
    const g = this.game, col = this._col;
    const list = g.enemies.enemies;
    col.escorts = col.escorts.filter(e => list.includes(e)); // the dead were counted at the kill
    if (col.hulk && !list.includes(col.hulk)) col.hulk = null;
    if (col.hulk) col.hulk.march = { x: c.x, z: c.z };
    col.escorts.forEach((e, i) => {
      const back = 7 + (i >> 1) * 5, side = (i % 2 ? 1 : -1) * (3.5 + (i >> 1) * 0.8);
      e.march = { x: c.x - c.dirX * back - c.dirZ * side, z: c.z - c.dirZ * back + c.dirX * side };
    });
  }

  unloadColumn(keepWounds) {
    const g = this.game, col = this._col;
    if (!col) return;
    const f = g.war.front;
    if (keepWounds && f && col.hulk) f.hulkHp = Math.max(0.05, col.hulk.hp / col.hulk.maxHp);
    for (const e of [col.hulk, ...col.escorts]) {
      if (!e) continue;
      e.march = null; e.columnTag = null;
      const i = g.enemies.enemies.indexOf(e);
      if (i >= 0) g.enemies.remove(i);
    }
    this._col = null;
  }

  // a column member dies under the player's hand (routed from onEnemyDeath)
  onColumnDeath(e) {
    const g = this.game, f = g.war.front;
    if (!f || f.phase !== 'marching') return;
    if (e.columnTag === 'escort') {
      f.escortsKilled = (f.escortsKilled || 0) + 1;
      g.ui.toast(`ONE FEWER AT THE WALL — ${f.escortsKilled} of the escort down`, 'good');
      return;
    }
    if (e.columnTag !== 'hulk') return;
    // THE BREAKING OF THE COLUMN: the heart-engine falls and the war
    // forgets why it came. the escorts scatter into mere weather.
    if (this._col) {
      for (const esc of this._col.escorts) {
        if (g.enemies.enemies.includes(esc)) { esc.raider = false; esc.state = 'wander'; esc.march = null; esc.columnTag = null; }
      }
      this._col = null;
    }
    const day = Math.floor(g.worldT);
    this.close(f, day, 'column');
    g.audio.play('chime');
    g.ui.toast(`THE HEART-ENGINE FALLS — THE COLUMN BREAKS ON THE OPEN ROAD`, 'good');
    const still = g.resolveStillByKey(f.stillKey);
    if (still) {
      g.changeRep(still, 10);
      g.appendHistory(f.stillKey, `a column marched on this place on day ${1 + day} behind a heart-engine, and a walker met it on the open road and broke it. the wall never fired a shot. that is the best kind of siege.`);
      g.rootStory('story:column:' + f.key, 'war',
        `the walker stood in the road between the column and ${f.stillName} and broke the heart-engine at its head, and the machines forgot the word 'together.'`,
        { stills: [still] });
    }
    g.recordEvent('front', f.stillName);
    g.journal.push({
      type: 'lore', cat: 'event', title: `THE COLUMN BROKEN — ${f.stillName.toUpperCase()}`,
      body: `the heart-engine is slag on the ${f.stillName} road, day ${1 + day}. the escorts scattered into ordinary weather. the front is over; the wall never knew how close it came.`,
    });
  }

  // the column reaches the wall with its heart still turning
  arrive() {
    const g = this.game, f = g.war.front;
    // a skirmish already at some wall: the column halts at the field's edge
    // and waits for its moment — the war refuses to share a battle
    if (g.eventSys.active.some(e => e.kind === 'raid')) { f.marchDay += 0.02; return; }
    this.unloadColumn(true);
    this._colMark = null;
    this.strike(Math.floor(g.worldT), f.strength);
  }

  // too few hearts to carry the march: the front dies unmarched
  breakFront(day) {
    const g = this.game, f = g.war.front;
    const known = f.known;
    this.close(f, day, 'broken');
    if (known) {
      g.audio.play('chime');
      g.ui.toast(`THE FRONT AGAINST ${f.stillName.toUpperCase()} DIES ON THE GROUND IT ROSE FROM`, 'good');
    }
    const still = g.resolveStillByKey(f.stillKey);
    if (still) {
      g.changeRep(still, 8);
      g.appendHistory(f.stillKey, `the nests woke together against this place on day ${1 + f.wokeDay}, and went quiet again before they marched. a walker hunted the waking out of them, heart by heart.`);
      g.rootStory('story:front:' + f.key, 'war',
        `when the nests around ${f.stillName} woke as one, the walker broke the waking before it walked — hunted the hearts until the front forgot its own name.`,
        { stills: [still] });
    }
    g.recordEvent('front', f.stillName);
    if (known) {
      g.journal.push({
        type: 'lore', cat: 'event', title: `THE FRONT BROKEN — ${f.stillName.toUpperCase()}`,
        body: `too few hearts left beating to carry the march. day ${1 + day}. ${f.stillName} will hear who did the quieting.`,
      });
    }
  }

  // the column reaches the wall with the front still breathing. attended,
  // the battle itself decides the front (THE SIEGE); unattended, paper does.
  strike(day, strength) {
    const g = this.game, f = g.war.front;
    const still = g.resolveStillByKey(f.stillKey);
    if (!still) { this.close(f, day, 'faded'); return; }
    const attended = Math.hypot(g.player.pos.x - still.x, g.player.pos.z - still.z) < 450;
    if (attended) {
      const war = {
        strength, escortsKilled: f.escortsKilled || 0,
        angle: Math.atan2(f.heartX - still.x, f.heartZ - still.z), // the waves press from the road
      };
      if (g.eventSys.beginRaid(still, 0, war)) {
        // the heart-engine walks up the road it came by, to shell the wall
        const hulk = g.enemies.spawnAt('warhulk',
          still.x + Math.sin(war.angle) * 62, still.z + Math.cos(war.angle) * 62,
          { name: 'the heart-engine', raider: true, aggro: true, tierMult: 1 + Math.min(1.4, strength * 0.07) });
        if (f.hulkHp) hulk.hp = hulk.maxHp * f.hulkHp;
        f.phase = 'siege'; // the front holds its breath: the battle decides it
        g.journal.push({
          type: 'lore', cat: 'event', title: `THE MARCH ARRIVES — ${f.stillName.toUpperCase()}`,
          body: `the column came down on ${f.stillName} on day ${1 + day}, heart-engine and all, and you are on the wall.${f.escortsKilled ? ` the ${f.escortsKilled} you dropped on the road are ${f.escortsKilled} who never reached the gate.` : ''} stand the waves; the front lives or dies at this wall.`,
        });
        return;
      }
    }
    this.strikePaper(day);
  }

  // what a still can put between itself and a march, written out in full —
  // the paper battles show their arithmetic, so losses read as reasons
  defenseLedger(still, front = null) {
    const g = this.game;
    const stage = (g.stillStates[still.key] || {}).stage || 0;
    const parts = [['the watch', 4]];
    if (stage) parts.push(['the town’s fortune', stage * 2]);
    if (g.fundedTurrets[still.key]) parts.push(['the funded wall-gun', 1]);
    if (g.stake && g.stake.key === still.key) {
      const base = 4 + (stage ? stage * 2 : 0) + (g.fundedTurrets[still.key] ? 1 : 0);
      const sd = g.stakeDefense(still.key) + 2;
      if (sd > base) parts.push(['the keeper’s works', sd - base]);
    }
    // THE MUSTER stands in the arithmetic whether you attend or not
    if (front && front.stillKey === still.key) {
      const m = this.musterSize(front);
      if (m) parts.push(['the mustered', m]);
    }
    const total = parts.reduce((a, p) => a + p[1], 0);
    return { total, text: parts.map(([n, v]) => `${n} ${v >= 0 ? '+' : ''}${v}`).join(' · ') };
  }

  // a sack takes a stage, breaks a course of whatever the keeper funded,
  // and leaves the still standing — retakeable, rekindlable
  sackStill(f) {
    const g = this.game;
    const st = g.stillStates[f.stillKey] || (g.stillStates[f.stillKey] = { stage: 0, lastAssess: g.worldT });
    st.stage = Math.max(-2, st.stage - 1);
    st.lastAssess = g.worldT; st.graceUntil = g.worldT + 6;
    const wk = g.stakeWorks[f.stillKey];
    if (wk) {
      const br = g.worksBroken[f.stillKey] || (g.worksBroken[f.stillKey] = {});
      if ((wk.walls || 0) - (br.walls || 0) > 0) br.walls = (br.walls || 0) + 1;
      if ((wk.turrets || 0) - (br.turrets || 0) > 0) br.turrets = (br.turrets || 0) + 1;
    }
    if (g.stills.loaded.has(f.stillKey)) { g._skipJudgment = true; g.stills.reload(f.stillKey); g._skipJudgment = false; }
  }

  // on paper: the covet arithmetic, war-sized — the world answers itself
  strikePaper(day, malus = 0) {
    const g = this.game, f = g.war.front;
    const still = g.resolveStillByKey(f.stillKey);
    if (!still) { this.close(f, day, 'faded'); return; }
    const worn = Math.floor((f.escortsKilled || 0) / 2); // the road's toll
    const strength = f.strength ?? f.nests.filter(n => !g.destroyedNests[n.key]).length;
    const led = this.defenseLedger(still, f);
    const defense = led.total - malus;
    // appetite saturates: past ~7 nests a march is no hungrier on paper,
    // so a prepared town (works + muster + arms) can hold even the big ones
    const appetite = Math.max(2, Math.min(10, 3 + strength - worn));
    const roll = hash2(g.seed, hashString('march' + f.stillKey) | 0, day) % 10;
    const margin = defense - appetite + (roll - 4);
    // the arithmetic stays under the hood: the player reads a VERDICT,
    // in the voice of whoever survived to tell it
    const verdict = margin >= 4 ? 'the march broke on the wall like weather on stone — the watch hardly woke its reserves.'
      : margin >= 0 ? 'it held by fingers and gun-heat — the wall was argued for course by course, and the argument barely won.'
      : margin >= -3 ? 'it was close, which is the cruelest part: a course more of wall, a few more hands, and the tellers would be singing instead of counting.'
      : 'the still stood no chance. the front came down like a tide, and the wall was a suggestion.';
    const musterN = this.musterSize(f);
    const credit = [
      musterN ? (margin >= 0 ? 'the mustered stood their line, and every teller agrees it mattered' : 'the mustered stood as long as standing was a thing that could be done') : '',
      malus ? 'the wall you left mid-fight was one voice short of the argument' : '',
    ].filter(Boolean).join('. ');
    const ledger = `${verdict}${credit ? ' ' + credit + '.' : ''}`;
    const known = f.known;
    if (known) g.audio.play('bell');
    if (margin >= 0) {
      this.close(f, day, 'held');
      g.appendHistory(f.stillKey, `the front of day ${1 + f.wokeDay} marched on day ${1 + day}, and the wall answered for everyone behind it. the watch drank well that night.`);
      if (known) {
        g.ui.toast(`WORD FROM ${f.stillName.toUpperCase()} — the march broke against the wall`, 'good');
        g.journal.push({
          type: 'lore', cat: 'event', title: `${f.stillName.toUpperCase()} HELD`,
          body: `the march came and the wall held without you, day ${1 + day}.${f.escortsKilled ? ` the ${f.escortsKilled} machines you dropped on the road arrived nowhere, and that arithmetic was part of the holding.` : ' the desert wins some of its own arguments.'} the nests spent their fury; the front is done.\n\n${ledger}`,
        });
      }
    } else {
      this.close(f, day, 'sacked');
      this.sackStill(f);
      g.appendHistory(f.stillKey, `the front of day ${1 + f.wokeDay} marched on day ${1 + day} and the wall did not hold. the well keeps the names. what stands can be rekindled; that is the whole hope of the desert.`);
      if (known) {
        g.ui.toast(`WORD FROM ${f.stillName.toUpperCase()} — the march went over the wall. SACKED`, 'rust');
        g.journal.push({
          type: 'lore', cat: 'event', title: `${f.stillName.toUpperCase()} — SACKED`,
          body: `the march went over the wall on day ${1 + day}. the still drops a stage; souls were lost, and what the keeper funded broke with them. what the war takes can be retaken — a sacked hearth still answers the rekindling.\n\n${ledger}`,
        });
      }
    }
  }

  // the live battle reports back: the front's whole story hinged on it
  onSiegeResolved(ev) {
    const g = this.game, f = g.war.front;
    if (!f || f.phase !== 'siege' || f.stillKey !== ev.still.key) return;
    const day = Math.floor(g.worldT);
    const still = g.resolveStillByKey(f.stillKey);
    if (ev.deaths >= 4) {
      // even a stood wall can break: too many souls down and the still folds
      this.close(f, day, 'sacked');
      this.sackStill(f);
      g.ui.toast(`THE SIEGE TAKES ${f.stillName.toUpperCase()} — too many souls down to hold the name`, 'rust');
      g.appendHistory(f.stillKey, `the siege of day ${1 + day} went over the wall even with a walker standing it. ${ev.deaths} souls. the still stands smaller now, and remembers everything.`);
      g.journal.push({
        type: 'lore', cat: 'event', title: `${f.stillName.toUpperCase()} — SACKED`,
        body: `you stood the wall and the wall still broke: ${ev.deaths} souls lost, the still down a stage, the well keeping every name. what the war takes can be retaken. day ${1 + day}.`,
      });
    } else {
      this.close(f, day, 'held');
      if (still) {
        g.changeRep(still, 10);
        g.rootStory('story:siege:' + f.key, 'war',
          `when the column came down on ${f.stillName}, the walker stood the wall through every wave, and the front spent itself against that standing.`,
          { stills: [still] });
        g.appendHistory(f.stillKey, `the siege of day ${1 + day} broke against this wall, wave after wave, a walker standing it the whole way. the front is spent. the watch will tell this for years.`);
      }
      g.recordEvent('front', f.stillName);
      g.audio.play('chime');
      g.journal.push({
        type: 'lore', cat: 'event', title: `THE SIEGE OF ${f.stillName.toUpperCase()} — HELD`,
        body: `every wave broke${ev.deaths ? `; ${ev.deaths} soul${ev.deaths === 1 ? '' : 's'} paid for it` : ', and nothing was lost'}. the front is spent, the war is over, and you were on the wall for all of it. day ${1 + day}.`,
      });
    }
  }

  // walking away from a siege doesn't pause the war — it just resolves
  // the rest of it without you, a point worse off for the wall you left
  onSiegeAbandoned(ev) {
    const g = this.game, f = g.war.front;
    if (!f || f.stillKey !== ev.still.key) return;
    const day = Math.floor(g.worldT);
    g.ui.toast('YOU LEFT THE WALL — the siege resolves without you', 'rust');
    g.journal.push({
      type: 'lore', cat: 'event', title: `THE WALL, LEFT — ${f.stillName.toUpperCase()}`,
      body: `you were on the wall at ${f.stillName} while the waves were still coming, and then you were not. the rest is arithmetic. day ${1 + day}.`,
    });
    this.strikePaper(day, 1);
  }

  // every campaign ends the same way: the front record closes, the map
  // forgets the mass, and the desert takes a season's breath
  close(f, day, outcome) {
    const g = this.game;
    // a war that ended before its rumor arrived becomes a different rumor:
    // you hear how it ENDED, from whoever tells you first
    if (!f.known) {
      g.rumors = (g.rumors || []).filter(r => !(r.kind === 'waking' && r.data.frontKey === f.key));
      if (['held', 'sacked', 'broken', 'column'].includes(outcome)) {
        g.rumors.push({
          id: 'rumor:end:' + f.key, kind: 'warend', day,
          x: f.x, z: f.z, reach: 12000,
          data: { outcome, stillName: f.stillName, stillKey: f.stillKey, day },
        });
      }
    }
    g.war.front = null;
    // THE TIDE: exhaustion scales with how the campaign ended. a front
    // killed early leaves hungry nests (short rest); a wall that held
    // spent the fury fully; a sack gorges the rust and it sleeps long —
    // the beaten town gets time to raise itself before the next waking.
    const REST_BY = { broken: 4, column: 4, held: 7, stood: 7, sacked: 8, faded: 5, cleared: 3 };
    g.war.rest = day + (REST_BY[outcome] ?? REST_DAYS);
    (g.war.history || (g.war.history = [])).push({ stillKey: f.stillKey, stillName: f.stillName, day, outcome });
    const i = g.world.discovered.findIndex(d2 => d2.key === f.key);
    if (i >= 0) g.world.discovered.splice(i, 1);
    // the muster goes home; the compass lets the war go
    if (g.camps.loaded.has('war:' + f.key)) g.camps.unload('war:' + f.key);
    if (g.tracked && g.tracked.kind === 'war') g.tracked = null;
  }

  // what a still can put between itself and a march
  defenseOf(still) { return this.defenseLedger(still).total; }
}
