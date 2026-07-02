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
    for (let i = 0; i < this.choir.length; i++) {
      this.choir[i].detune.value = Math.sin(performance.now() / (700 + i * 310) + i * 2) * (8 + c * 30);
    }

    // field hum
    this._ease(this.humGain.gain, s.inField ? 0.05 : 0, dt, 2.5);

    // discrete footfalls for legged gaits
    if (s.moving && s.grounded && (s.gait === 'biped' || s.gait === 'quad')) {
      this.strideAcc += s.distMoved;
      const stride = s.gait === 'quad' ? 1.7 : 2.3;
      if (this.strideAcc > stride) {
        this.strideAcc = 0;
        this.step(s.gait);
      }
    } else this.strideAcc = 0;
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
