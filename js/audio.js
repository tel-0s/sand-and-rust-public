// The desert's voice. Pure WebAudio synthesis — not a single audio file.
// Wind from filtered noise, footfalls per gait, combat from shaped bursts,
// and the Rust as a detuned choir that grows with your corruption.
import { SETTINGS } from './settings.js';
import { mulberry32 } from './rng.js';

// each biome breathes differently: [loudness multiplier, filter centre Hz]
const WIND_BIOME = {
  dunes: [1.0, 420], flats: [0.8, 380], salt: [0.55, 680],
  glass: [0.7, 620], city: [0.95, 540], rustlands: [0.85, 300],
};

// one-shot routing: which bus does each sound belong to
const ROUTE = {
  swing: 'combat', hit: 'combat', shot: 'combat', boom: 'combat', hurt: 'combat', seizure: 'combat',
  jump: 'steps', land: 'steps',
  pickup: 'ui', quest: 'ui', chime: 'ui', talk: 'ui', ability: 'ui',
  storm: 'ambient', bell: 'ambient',
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.muted = localStorage.getItem('sar-muted') === '1';
    this.strideAcc = 0;
  }

  // must be called from a user gesture
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.connect(ctx.destination);
    // mix buses: ambient (wind/choir/hum), steps, combat, ui
    this.bus = {};
    for (const name of ['ambient', 'steps', 'combat', 'ui']) {
      const g = ctx.createGain();
      g.connect(this.master);
      this.bus[name] = g;
    }
    // THE CHIMES (b2): combat ducks the ambient bed so the fight reads
    this.duckGain = ctx.createGain();
    this.bus.ambient.disconnect();
    this.bus.ambient.connect(this.duckGain);
    this.duckGain.connect(this.master);
    this.applyVolumes();

    // shared noise buffer (2s of white noise)
    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    const loopNoise = (filterType, f, q, bus) => {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf; src.loop = true;
      const fl = ctx.createBiquadFilter();
      fl.type = filterType; fl.frequency.value = f; fl.Q.value = q;
      const g = ctx.createGain(); g.gain.value = 0;
      src.connect(fl); fl.connect(g); g.connect(bus);
      src.start();
      return { src, fl, g };
    };

    // --- wind bed: always present, swells with storms and speed
    this.wind = loopNoise('bandpass', 420, 0.6, this.bus.ambient);
    this.windTargetF = 420;

    // --- tracked treads / hover skirt: continuous locomotion layers
    this.treads = loopNoise('lowpass', 110, 0.8, this.bus.steps);
    this.hoverOsc = ctx.createOscillator();
    this.hoverOsc.type = 'triangle'; this.hoverOsc.frequency.value = 160;
    this.hoverGain = ctx.createGain(); this.hoverGain.gain.value = 0;
    this.hoverOsc.connect(this.hoverGain); this.hoverGain.connect(this.bus.steps);
    this.hoverOsc.start();

    // --- the Rust choir: detuned minor cluster, silent until you aren't clean
    this.choirGain = ctx.createGain(); this.choirGain.gain.value = 0;
    this.choirGain.connect(this.bus.ambient);
    this.choir = [110, 130.8, 155.6, 220].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'sine' : 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.25;
      o.connect(g); g.connect(this.choirGain);
      o.start();
      return o;
    });

    // --- field hum: the sound of safety inside anchor & still walls
    this.humGain = ctx.createGain(); this.humGain.gain.value = 0;
    this.humGain.connect(this.bus.ambient);
    for (const f of [55, 110.3]) {
      const o = ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = f < 100 ? 0.5 : 0.22;
      o.connect(g); g.connect(this.humGain);
      o.start();
    }

    // ---------- THE GROUNDING (ARC XVI b1): the world's own voices ----------
    // the listener: set each frame from the walker's position and facing,
    // so spatial voices pan and fade like the world means it
    this.listener = { x: 0, z: 0, yaw: 0 };

    // the brood-song: a pulsing sub-drone that IS the nests — the thing
    // every war rumor promised you could hear
    this.broodGain = ctx.createGain(); this.broodGain.gain.value = 0;
    this.broodPan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (this.broodPan) { this.broodGain.connect(this.broodPan); this.broodPan.connect(this.bus.ambient); }
    else this.broodGain.connect(this.bus.ambient);
    this.broodOsc = [41.2, 61.7, 82.4].map((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sine'; o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = i === 0 ? 0.55 : 0.3;
      o.connect(g); g.connect(this.broodGain);
      o.start();
      return o;
    });

    // yard murmur: the sound of a living still — soft clatter and near-voices,
    // scaled by how many souls actually stand in the yard
    this.yard = loopNoise('bandpass', 900, 2.2, this.bus.ambient);
    this._yardBlipT = 0;

    // the hollow places: a dark closed-in bed for interiors
    this.hollow = loopNoise('lowpass', 130, 0.5, this.bus.ambient);
    this._dripT = 2;

    // the glass-wind: shard tinkle scheduler state
    this._shardT = 0;

    // caravan bells: jingle timers keyed per caravan
    this._bellAcc = new Map();
  }

  // ---------- spatial voices: sound that comes FROM somewhere ----------
  // pan by bearing relative to the walker's facing; fade by distance
  spatial(x, z, maxDist, fn) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const L = this.listener;
    const dx = x - L.x, dz = z - L.z;
    const d = Math.hypot(dx, dz);
    if (d > maxDist) return;
    const att = Math.pow(1 - d / maxDist, 1.4);
    // bearing → pan: full left/right at 90° off the nose
    const rel = Math.atan2(dx, dz) - L.yaw;
    const pan = Math.max(-1, Math.min(1, -Math.sin(rel)));
    const g = this.ctx.createGain(); g.gain.value = att;
    let head = g;
    if (this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p); head = p;
    }
    head.connect(this.bus.combat);
    fn(g, att);
  }
  // a positioned tone/burst pair for one-shot world events
  spatialTone(x, z, maxDist, opts) {
    this.spatial(x, z, maxDist, (g) => {
      const saved = opts.bus;
      opts = { ...opts, bus: g };
      this.tone(opts);
      opts.bus = saved;
    });
  }
  spatialBurst(x, z, maxDist, opts) {
    this.spatial(x, z, maxDist, (g) => {
      this.burst({ ...opts, bus: g });
    });
  }

  setMuted(m) {
    this.muted = m;
    localStorage.setItem('sar-muted', m ? '1' : '0');
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.master) return;
    const a = SETTINGS.audio;
    this.master.gain.value = this.muted ? 0 : a.master;
    if (this.bus) {
      this.bus.ambient.gain.value = a.ambient;
      this.bus.steps.gain.value = a.steps;
      this.bus.combat.gain.value = a.combat;
      this.bus.ui.gain.value = a.ui;
    }
  }

  // smooth a gain toward a target (called per frame)
  _ease(param, target, dt, rate = 3) {
    param.value += (target - param.value) * Math.min(1, dt * rate);
  }

  // garbled speech: a short burble of pitched blips, seeded by the line so a
  // sentence always sounds like itself; the temperament sets the register.
  // no words — the desert's machines talk in carrier tones.
  speak(salt, temperament) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const base = { mercantile: 340, monastic: 250, scavver: 300, ferrocult: 215 }[temperament] || 300;
    const r = mulberry32(salt >>> 0);
    const n = 5 + Math.floor(r() * 5);
    let t = this.ctx.currentTime + 0.02;
    for (let i = 0; i < n; i++) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = i % 4 === 3 ? 'square' : 'triangle';
      o.frequency.value = base * (0.82 + r() * 0.55) * (i % 3 === 2 ? 1.24 : 1);
      const dur = 0.04 + r() * 0.055;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(i % 4 === 3 ? 0.022 : 0.045, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.bus.ui);
      o.start(t); o.stop(t + dur + 0.02);
      t += dur + 0.012 + r() * 0.045;
    }
  }

  // state: { storm, corruption, inField, moving, sprinting, gait, speedFrac,
  //          distMoved, grounded, biome, windMod }
  update(dt, s) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    // wind: quiet base, biome character, calm spells (windMod), storm roar.
    // a storm always overrides a lull — weather outranks weather.
    const [bMul, bFreq] = WIND_BIOME[s.biome] || [1, 420];
    const lull = Math.max(s.windMod ?? 1, s.storm);
    // the wind dies at the door: indoors it is a memory through the walls
    const windTarget = (0.012 + s.storm * 0.22 + (s.sprinting ? 0.012 : 0)) * bMul * (0.35 + 0.85 * lull)
      * (s.interior ? 0.05 : 1);
    this._ease(this.wind.g.gain, windTarget, dt, 1.2);
    this.windTargetF += (Math.random() - 0.5) * 600 * dt;
    this.windTargetF = Math.max(220, Math.min(900, this.windTargetF));
    const fTarget = (this.windTargetF + bFreq) / 2 + s.storm * 160;
    this.wind.fl.frequency.value += (fTarget - this.wind.fl.frequency.value) * Math.min(1, dt);

    // locomotion layers
    const treadsOn = s.gait === 'tracked' && s.moving && s.grounded;
    this._ease(this.treads.g.gain, treadsOn ? 0.16 : 0, dt, 6);
    const hoverOn = s.gait === 'hover';
    this._ease(this.hoverGain.gain, hoverOn ? (s.moving ? 0.05 : 0.02) : 0, dt, 4);
    if (hoverOn) this.hoverOsc.frequency.value = 150 + s.speedFrac * 60;

    // the choir: audible from ~20 corruption, undeniable by 80
    const c = Math.max(0, (s.corruption - 15) / 85);
    this._ease(this.choirGain.gain, Math.pow(c, 1.6) * 0.11, dt, 1.5);
    // an answered letter resolves the choir: the detune collapses toward
    // consonance — the same voices, no longer arguing
    const dis = s.answered ? 0.22 : 1;
    for (let i = 0; i < this.choir.length; i++) {
      this.choir[i].detune.value = Math.sin(performance.now() / (700 + i * 310) + i * 2) * (8 + c * 30) * dis;
    }

    // field hum
    this._ease(this.humGain.gain, s.inField ? 0.05 : 0, dt, 2.5);

    // combat ducks the ambient bed (fast in, slow out)
    if (this.duckGain) this._ease(this.duckGain.gain, s.combatHot ? 0.5 : 1, dt, s.combatHot ? 8 : 1.2);

    // discrete footfalls for legged gaits
    if (s.moving && s.grounded && (s.gait === 'biped' || s.gait === 'quad')) {
      this.strideAcc += s.distMoved;
      const stride = s.gait === 'quad' ? 1.7 : 2.3;
      if (this.strideAcc > stride) {
        this.strideAcc = 0;
        this.step(s.gait);
      }
    } else this.strideAcc = 0;

    // ---------- THE GROUNDING layers ----------
    // the brood-song: swells inside ~220m of a living nest, throbs faster
    // when the nest is pressed or screaming
    if (this.broodGain) {
      const nd = s.nestDist ?? 1e9;
      const near = Math.max(0, 1 - nd / 220);
      const throb = 0.6 + 0.4 * Math.sin(performance.now() / (s.nestHot ? 180 : 420));
      this._ease(this.broodGain.gain, near * near * 0.14 * throb * (s.interior ? 0.15 : 1), dt, 2.5);
      if (this.broodPan && s.nestBearing !== undefined && nd < 220) {
        this.broodPan.pan.value += (Math.max(-1, Math.min(1, -Math.sin(s.nestBearing))) - this.broodPan.pan.value) * Math.min(1, dt * 3);
      }
    }

    // yard murmur: population is volume; the occasional clatter-blip on top
    if (this.yard) {
      const pop = s.yardPop || 0;
      this._ease(this.yard.g.gain, Math.min(0.05, pop * 0.008) * (s.interior ? 0 : 1), dt, 2);
      if (pop > 0 && !s.interior) {
        this._yardBlipT -= dt;
        if (this._yardBlipT <= 0) {
          this._yardBlipT = 1.2 + Math.random() * 3.5 / Math.max(1, pop * 0.5);
          if (Math.random() < 0.5) this.burst({ fType: 'bandpass', f0: 1400 + Math.random() * 900, q: 3, dur: 0.03, g: 0.02, bus: this.bus.ambient });
          else this.tone({ type: 'triangle', f0: 200 + Math.random() * 140, dur: 0.05, g: 0.012, bus: this.bus.ambient });
        }
      }
    }

    // the hollow places: the bed rises indoors; a drip now and then
    if (this.hollow) {
      this._ease(this.hollow.g.gain, s.interior ? 0.05 : 0, dt, 2);
      if (s.interior) {
        this._dripT -= dt;
        if (this._dripT <= 0) {
          this._dripT = 3 + Math.random() * 9;
          const f = 900 + Math.random() * 700;
          this.tone({ type: 'sine', f0: f, f1: f * 0.55, dur: 0.14, g: 0.03, bus: this.bus.ambient });
          this.tone({ type: 'sine', f0: f * 0.98, f1: f * 0.5, dur: 0.3, g: 0.012, delay: 0.13, bus: this.bus.ambient });
        }
      }
    }

    // the glass-wind: high glass pings riding the shard density
    if ((s.shard || 0) > 0.35 && !s.interior) {
      this._shardT -= dt;
      if (this._shardT <= 0) {
        this._shardT = 0.12 + Math.random() * (1.2 - s.shard);
        const f = 2400 + Math.random() * 2600;
        this.tone({ type: 'sine', f0: f, f1: f * 0.92, dur: 0.05 + Math.random() * 0.06, g: 0.02 + s.shard * 0.02, bus: this.bus.ambient });
      }
    }
  }

  // ---------- THE CHIMES (b2): event signatures — each moment its own sound.
  // Composed from the same two primitives as everything else; no samples.
  sig(name) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const T = (o) => this.tone({ bus: this.bus.ui, ...o });
    const B = (o) => this.burst({ bus: this.bus.ui, ...o });
    switch (name) {
      // the war: one horn to open it, one chord for each way it ends
      case 'war-waking':
        T({ type: 'sawtooth', f0: 98, f1: 92, dur: 1.6, g: 0.1 });
        T({ type: 'sawtooth', f0: 147, f1: 139, dur: 1.3, g: 0.06, delay: 0.35 });
        B({ f0: 200, f1: 70, dur: 0.8, g: 0.08, delay: 0.1 });
        break;
      case 'war-held':
        T({ type: 'triangle', f0: 262, dur: 0.5, g: 0.09 });
        T({ type: 'triangle', f0: 330, dur: 0.5, g: 0.09, delay: 0.16 });
        T({ type: 'triangle', f0: 392, dur: 0.7, g: 0.1, delay: 0.32 });
        T({ type: 'sine', f0: 523, dur: 1.4, g: 0.07, delay: 0.5 });
        break;
      case 'war-gate': // the near thing: the held chord plus the gate-bell on top
        T({ type: 'triangle', f0: 262, dur: 0.5, g: 0.09 });
        T({ type: 'triangle', f0: 330, dur: 0.5, g: 0.09, delay: 0.14 });
        T({ type: 'triangle', f0: 392, dur: 0.7, g: 0.1, delay: 0.28 });
        T({ type: 'triangle', f0: 784, f1: 776, dur: 1.6, g: 0.1, delay: 0.46 });
        B({ f0: 300, f1: 60, dur: 0.5, g: 0.12, delay: 0.42 });
        break;
      case 'war-sacked': // the grief fall
        T({ type: 'triangle', f0: 392, f1: 370, dur: 0.8, g: 0.09 });
        T({ type: 'triangle', f0: 311, dur: 0.8, g: 0.08, delay: 0.5 });
        T({ type: 'triangle', f0: 262, f1: 247, dur: 1.6, g: 0.09, delay: 1.0 });
        B({ f0: 120, f1: 40, dur: 2.0, g: 0.1, delay: 1.1 });
        break;
      case 'war-broken': // the waking dies where it rose: hollow, unresolved
        T({ type: 'triangle', f0: 196, dur: 1.2, g: 0.08 });
        T({ type: 'sine', f0: 233, f1: 229, dur: 1.5, g: 0.05, delay: 0.3 });
        break;
      case 'war-column': // clean work on the open road
        T({ type: 'triangle', f0: 330, dur: 0.35, g: 0.09 });
        T({ type: 'triangle', f0: 494, dur: 0.8, g: 0.09, delay: 0.22 });
        break;
      // the proving: the oath and the taking
      case 'proving-signed':
        B({ fType: 'bandpass', f0: 1800, f1: 900, q: 2, dur: 0.12, g: 0.06 }); // the old form unrolls
        T({ type: 'triangle', f0: 220, dur: 0.4, g: 0.08, delay: 0.15 });
        T({ type: 'triangle', f0: 330, dur: 0.8, g: 0.08, delay: 0.4 });
        break;
      case 'proving-taken':
        for (const [i, f] of [330, 392, 494, 659].entries()) T({ type: 'triangle', f0: f, dur: 0.3, g: 0.08, delay: i * 0.11 });
        T({ type: 'sine', f0: 988, f1: 980, dur: 1.2, g: 0.06, delay: 0.5 });
        break;
      // a name, coined
      case 'naming':
        T({ type: 'triangle', f0: 523, f1: 519, dur: 1.0, g: 0.1 });
        T({ type: 'sine', f0: 1046, dur: 0.6, g: 0.04, delay: 0.12 });
        break;
      // the seasons: one motif each, contour = the season's character
      case 'season-clear': for (const [i, f] of [392, 494, 587, 784].entries()) T({ type: 'sine', f0: f, dur: 0.4, g: 0.06, delay: i * 0.18 }); break;
      case 'season-veil': for (const [i, f] of [440, 415, 440, 370].entries()) T({ type: 'sine', f0: f, dur: 0.6, g: 0.05, delay: i * 0.26 }); break;
      case 'season-longcold': for (const [i, f] of [330, 294, 247, 196].entries()) T({ type: 'triangle', f0: f, dur: 0.8, g: 0.06, delay: i * 0.3 }); break;
      case 'season-glasswind': for (const [i, f] of [880, 1175, 988, 1319].entries()) T({ type: 'sine', f0: f, dur: 0.22, g: 0.045, delay: i * 0.12 }); break;
      // pickups: what you found decides the sound
      case 'doc':
        for (let i = 0; i < 3; i++) B({ fType: 'highpass', f0: 2200, q: 0.8, dur: 0.04, g: 0.03, delay: i * 0.05 }); // pages
        T({ f0: 740, dur: 0.06, g: 0.05, delay: 0.16 });
        break;
      case 'part':
        T({ type: 'square', f0: 220, dur: 0.07, g: 0.05 });
        T({ type: 'square', f0: 277, dur: 0.09, g: 0.04, delay: 0.04 });
        B({ f0: 900, f1: 300, dur: 0.08, g: 0.05, delay: 0.02 });
        break;
      // the well rituals
      case 'well-drink':
        for (const [i, f] of [900, 760, 620, 540].entries()) T({ type: 'sine', f0: f, f1: f * 0.92, dur: 0.1, g: 0.05, delay: i * 0.09 });
        break;
      case 'well-scrape':
        B({ fType: 'bandpass', f0: 700, f1: 1600, q: 4, dur: 0.5, g: 0.09 }); // the rasp
        T({ type: 'sine', f0: 392, dur: 0.7, g: 0.06, delay: 0.5 });          // the relief
        break;
      // an old one, recognizing: two voices a hair apart, settling into one
      case 'oldone':
        T({ type: 'sine', f0: 220, dur: 1.6, g: 0.05 });
        T({ type: 'sine', f0: 224, f1: 220, dur: 1.6, g: 0.05 });
        break;
      // the want, asked and answered
      case 'want': T({ type: 'sine', f0: 392, f1: 494, dur: 0.5, g: 0.06 }); break;
      case 'want-done':
        for (const [i, f] of [494, 392, 330].entries()) T({ type: 'triangle', f0: f, dur: 0.5, g: 0.07, delay: i * 0.2 });
        break;
    }
  }

  // caravan bells: called per loaded caravan per frame — the bell jingles
  // with the column's own walking, positioned on the road where it walks
  caravanBell(key, x, z, moving, dt) {
    if (!this.ctx || this.ctx.state !== 'running' || !moving) return;
    let acc = this._bellAcc.get(key) || 0;
    acc += dt;
    if (acc > 0.62) {
      acc = 0;
      this.spatial(x, z, 130, (g) => {
        this.tone({ type: 'triangle', f0: 1180, f1: 1120, dur: 0.09, g: 0.06, bus: g });
        if (Math.random() < 0.4) this.tone({ type: 'triangle', f0: 1560, f1: 1500, dur: 0.06, g: 0.03, delay: 0.05, bus: g });
      });
    }
    this._bellAcc.set(key, acc);
  }

  // dawn/dusk wall-bells: each still rings its own set — count and interval
  // seeded by the still, register colored by temperament
  wallBells(salt, temperament, x, z) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const base = { mercantile: 392, monastic: 262, scavver: 330, ferrocult: 220 }[temperament] || 330;
    const r = mulberry32(salt >>> 0);
    const n = 2 + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      this.spatial(x, z, 420, (g) => {
        this.tone({ type: 'triangle', f0: base * (1 + (r() - 0.5) * 0.04), f1: base * 0.97, dur: 1.1, g: 0.12, delay: i * (0.9 + r() * 0.5), bus: g });
        this.tone({ type: 'sine', f0: base * 2.02, dur: 0.5, g: 0.03, delay: i * (0.9 + r() * 0.5) + 0.02, bus: g });
      });
    }
  }

  // the star-fall: a descending scream, then the ground answers
  starfall(x, z) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.tone({ type: 'sawtooth', f0: 1800, f1: 140, dur: 2.2, g: 0.06, bus: this.bus.ambient });
    this.spatialBurst(x, z, 3000, { f0: 300, f1: 40, dur: 1.4, g: 0.5, delay: 2.1 });
    this.spatialBurst(x, z, 3000, { f0: 90, f1: 30, dur: 2.5, g: 0.3, delay: 2.3 });
  }

  // transmission: the static that eats you, then spits you out somewhere else
  txWhoosh() {
    if (!this.ctx || this.ctx.state !== 'running') return;
    this.burst({ fType: 'highpass', f0: 300, f1: 4200, q: 0.7, dur: 0.9, g: 0.22, bus: this.bus.ui });
    this.burst({ fType: 'bandpass', f0: 1200, f1: 200, q: 2, dur: 0.7, g: 0.14, delay: 0.35, bus: this.bus.ui });
    this.tone({ type: 'sine', f0: 55, f1: 220, dur: 0.8, g: 0.1, delay: 0.2, bus: this.bus.ui });
  }

  // ---------- primitives ----------
  tone({ type = 'sine', f0 = 440, f1, dur = 0.1, g = 0.2, delay = 0, bus }) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(), gn = ctx.createGain();
    const t = ctx.currentTime + delay;
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    gn.gain.setValueAtTime(g, t);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(gn); gn.connect(this.bus[bus || this._bus || 'ui'] || this.master);
    o.start(t); o.stop(t + dur + 0.05);
  }
  burst({ fType = 'lowpass', f0 = 800, f1, q = 1, dur = 0.15, g = 0.3, delay = 0, bus }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.7 + Math.random() * 0.6;
    const fl = ctx.createBiquadFilter();
    fl.type = fType; fl.Q.value = q;
    const t = ctx.currentTime + delay;
    fl.frequency.setValueAtTime(f0, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const gn = ctx.createGain();
    gn.gain.setValueAtTime(g, t);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(fl); fl.connect(gn); gn.connect(this.bus[bus || this._bus || 'ui'] || this.master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  step(gait) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    this._bus = 'steps';
    if (gait === 'quad') {
      this.burst({ f0: 240, f1: 90, dur: 0.05, g: 0.07 });
      this.burst({ f0: 200, f1: 80, dur: 0.05, g: 0.05, delay: 0.07 });
    } else {
      this.burst({ f0: 300, f1: 100, dur: 0.08, g: 0.11 });
      this.tone({ f0: 65, f1: 40, dur: 0.06, g: 0.06 });
    }
  }

  // ---------- one-shots ----------
  play(name) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    this._bus = ROUTE[name] || 'ui';
    switch (name) {
      case 'swing': this.burst({ fType: 'bandpass', f0: 900, f1: 280, q: 1.4, dur: 0.12, g: 0.12 }); break;
      case 'hit': this.tone({ type: 'square', f0: 1100, f1: 700, dur: 0.04, g: 0.07 });
        this.burst({ fType: 'highpass', f0: 2200, dur: 0.05, g: 0.08 }); break;
      case 'shot': this.tone({ type: 'square', f0: 620, f1: 130, dur: 0.1, g: 0.1 });
        this.burst({ fType: 'highpass', f0: 1600, dur: 0.04, g: 0.06 }); break;
      case 'boom': this.burst({ f0: 380, f1: 60, dur: 0.4, g: 0.3 });
        this.tone({ f0: 70, f1: 32, dur: 0.35, g: 0.22 }); break;
      case 'hurt': this.tone({ type: 'sawtooth', f0: 110, f1: 60, dur: 0.16, g: 0.16 });
        this.burst({ f0: 500, f1: 150, dur: 0.1, g: 0.1 }); break;
      case 'ability': this.tone({ f0: 320, f1: 760, dur: 0.12, g: 0.09 }); break;
      case 'pickup': this.tone({ f0: 740, dur: 0.05, g: 0.07 });
        this.tone({ f0: 1100, dur: 0.06, g: 0.06, delay: 0.06 }); break;
      case 'quest': this.tone({ f0: 660, dur: 0.09, g: 0.08 });
        this.tone({ f0: 990, dur: 0.13, g: 0.08, delay: 0.1 }); break;
      case 'chime': this.tone({ f0: 520, dur: 0.08, g: 0.07 });
        this.tone({ f0: 780, dur: 0.08, g: 0.07, delay: 0.09 });
        this.tone({ f0: 1170, dur: 0.14, g: 0.07, delay: 0.18 }); break;
      case 'talk': this.tone({ type: 'triangle', f0: 440, f1: 520, dur: 0.06, g: 0.06 }); break;
      case 'jump': this.burst({ fType: 'bandpass', f0: 500, f1: 900, q: 1, dur: 0.09, g: 0.07 }); break;
      case 'land': this.burst({ f0: 260, f1: 70, dur: 0.1, g: 0.13 }); break;
      case 'seizure': this.tone({ type: 'sawtooth', f0: 180, f1: 45, dur: 0.5, g: 0.12 });
        this.tone({ type: 'sine', f0: 1300, f1: 900, dur: 0.4, g: 0.04, delay: 0.05 }); break;
      case 'storm': this.burst({ f0: 600, f1: 200, dur: 1.6, g: 0.12 }); break;
      case 'bell': this.tone({ type: 'triangle', f0: 220, f1: 214, dur: 0.9, g: 0.14 });
        this.tone({ type: 'sine', f0: 440, f1: 430, dur: 0.7, g: 0.06, delay: 0.04 }); break;
    }
  }
}
