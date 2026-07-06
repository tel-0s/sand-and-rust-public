// THE SCORE (ARC XVI b3): the desert hums to itself, in your world's key.
// A generative composer, all synthesis: the world seed derives a MOTIF; the
// moment picks a scale (day wanders dorian, night thins to five notes, the
// yards go pentatonic in their temperament's register); a contour grammar
// composes each phrase from the motif the way the tongues compose speech.
// Silence is the instrument — phrases arrive like weather, minutes apart,
// denser at dawn and dusk, and never loop.
import { hash2, hashString, Rand } from './rng.js';

const SCALES = {
  day: [0, 2, 3, 5, 7, 9, 10],     // dorian: the walking mode
  night: [0, 3, 5, 7, 10],         // thinned aeolian: the dark keeps fewer notes
  yard: [0, 2, 4, 7, 9],           // pentatonic: nothing a yard can argue with
  interior: [0, 1, 5, 7, 8],       // close intervals for close walls
};
const YARD_REGISTER = { mercantile: 1.25, monastic: 0.75, scavver: 1.0, ferrocult: 0.66 };

// contour grammars: how a phrase moves through the motif
const CONTOURS = [
  [0, 1, 2, 1, 0],            // the arch
  [0, 1, 0, -1, 0, 1],        // the sway
  [0, 2, 1, 3, 2],            // the climb with looks back
  [3, 2, 1, 0],               // the descent
  [0, 0, 1, 1, 2],            // the patient rise
  [2, 0, 3, 1],               // the leap pair
];
const RHYTHMS = [
  [1, 1, 2, 1, 3],
  [2, 1, 1, 2, 2],
  [1, 2, 1, 1, 4],
  [3, 1, 2, 2],
];

export class Score {
  constructor(audio, seed) {
    this.audio = audio;
    this.seed = seed;
    // THE MOTIF: your world's five-to-seven degrees, fixed forever
    const h = hash2(seed, 7771, 13);
    const r = new Rand(h >>> 0);
    const len = 5 + (h % 3);
    this.motif = [];
    for (let i = 0; i < len; i++) this.motif.push(r.int(0, 6));
    this.rootHz = 110 * Math.pow(2, (h >>> 4) % 12 / 12); // the world's key
    this.nextIn = 20 + r.range(0, 30); // the first phrase comes early-ish
    this.phraseN = 0;
    this._pulseT = 0;
  }

  ensureBus() {
    const A = this.audio;
    if (!A.ctx || this.bus) return;
    this.bus = A.ctx.createGain();
    this.bus.gain.value = 0;
    this.bus.connect(A.master);
    this.applyVolume();
  }

  applyVolume() {
    if (this.bus) this.bus.gain.value = (window.SETTINGS_AUDIO_MUSIC ?? this._vol ?? 0.5);
  }
  setVolume(v) { this._vol = v; if (this.bus) this.bus.gain.value = v; }

  // seeded per (world, phrase index): the same evening sings the same phrase
  update(dt, s) {
    const A = this.audio;
    if (!A.ctx || A.ctx.state !== 'running') return;
    this.ensureBus();
    if ((this._vol ?? 0.5) <= 0.001) return; // the toggle: silence chosen

    // the war pulse: while the fight is hot, a low heartbeat under everything
    if (s.combatHot) {
      this._pulseT -= dt;
      if (this._pulseT <= 0) {
        this._pulseT = 0.46;
        A.burst({ f0: 120, f1: 40, dur: 0.18, g: 0.1, bus: this.bus });
        if (this.phraseN % 2 === 0) A.tone({ type: 'sine', f0: this.rootHz * 0.5, dur: 0.4, g: 0.05, bus: this.bus });
      }
      return; // no melodies over a fight
    }

    // phrase scheduling: minutes of rest; dawn and dusk lean closer
    const nearTurn = Math.min(Math.abs(s.dayT - 0.25), Math.abs(s.dayT - 0.75)) < 0.03;
    this.nextIn -= dt * (nearTurn ? 2.6 : 1);
    if (this.nextIn > 0) return;
    this.phraseN++;
    const r = new Rand(hash2(this.seed, 8887, this.phraseN) >>> 0);
    this.nextIn = 110 + r.range(0, 160);
    this.playPhrase(r, s);
  }

  playPhrase(r, s) {
    const A = this.audio;
    const scale = SCALES[s.context] || SCALES.day;
    const register = s.context === 'yard' ? (YARD_REGISTER[s.temperament] || 1) : (s.context === 'night' ? 0.75 : 1);
    const root = this.rootHz * 2 * register;
    const contour = r.pick(CONTOURS);
    const rhythm = r.pick(RHYTHMS);
    const beat = 0.42 + r.range(0, 0.3);
    const voice = s.context === 'interior' ? 'pluck' : r.chance(0.6) ? 'bell' : 'pluck';
    // walk the motif by the contour; the scale quantizes every step
    let idx = r.int(0, this.motif.length - 1);
    let t = 0;
    const notes = [];
    for (let i = 0; i < contour.length; i++) {
      idx = ((idx + contour[i]) % this.motif.length + this.motif.length) % this.motif.length;
      const deg = this.motif[idx] % scale.length;
      const oct = this.motif[idx] >= scale.length ? 2 : 1;
      const hz = root * oct * Math.pow(2, scale[deg] / 12);
      const dur = (rhythm[i % rhythm.length] || 1) * beat;
      if (!r.chance(0.14)) notes.push({ hz, at: t, dur }); // the rests are real
      t += dur;
    }
    for (const n of notes) this.voice(voice, n.hz, n.at, n.dur);
    // sometimes the root breathes underneath (never indoors: the walls hum enough)
    if (s.context !== 'interior' && r.chance(0.4)) {
      A.tone({ type: 'sine', f0: root * 0.5, dur: t + 1.2, g: 0.025, bus: this.bus });
      A.tone({ type: 'sine', f0: root * 0.5 * 1.005, dur: t + 1.2, g: 0.02, bus: this.bus });
    }
  }

  // synthesized voices — FM bell and a plucked triangle, nothing sampled
  voice(kind, hz, at, dur) {
    const A = this.audio, ctx = A.ctx;
    const t0 = ctx.currentTime + 0.03 + at;
    if (kind === 'bell') {
      const carrier = ctx.createOscillator();
      carrier.type = 'sine'; carrier.frequency.value = hz;
      const mod = ctx.createOscillator();
      mod.type = 'sine'; mod.frequency.value = hz * 2.76; // inharmonic: the bell's shimmer
      const modG = ctx.createGain(); modG.gain.setValueAtTime(hz * 1.4, t0);
      modG.gain.exponentialRampToValueAtTime(1, t0 + dur * 1.4);
      mod.connect(modG); modG.connect(carrier.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.055, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur * 1.6);
      carrier.connect(g); g.connect(this.bus);
      carrier.start(t0); mod.start(t0);
      carrier.stop(t0 + dur * 1.7); mod.stop(t0 + dur * 1.7);
    } else { // pluck
      const o = ctx.createOscillator();
      o.type = 'triangle'; o.frequency.value = hz;
      const fl = ctx.createBiquadFilter();
      fl.type = 'lowpass'; fl.frequency.setValueAtTime(hz * 5, t0);
      fl.frequency.exponentialRampToValueAtTime(hz * 1.2, t0 + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.06, t0 + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.min(dur, 0.9));
      o.connect(fl); fl.connect(g); g.connect(this.bus);
      o.start(t0); o.stop(t0 + dur + 0.1);
    }
  }

  // a stinger for the moments that deserve one note NOW
  stinger(kind) {
    const A = this.audio;
    if (!A.ctx || A.ctx.state !== 'running') return;
    this.ensureBus();
    if ((this._vol ?? 0.5) <= 0.001) return;
    const r = new Rand(hash2(this.seed, 9931, (this.phraseN += 1)) >>> 0);
    const scale = SCALES.day;
    const root = this.rootHz * 2;
    if (kind === 'discovery') {
      // three rising steps of YOUR motif: the world acknowledging the find
      let idx = r.int(0, this.motif.length - 1);
      [0, 1, 2].forEach((k, i) => {
        idx = (idx + 1) % this.motif.length;
        const hz = root * Math.pow(2, scale[this.motif[idx] % scale.length] / 12) * (i === 2 ? 2 : 1);
        this.voice('bell', hz, i * 0.22, 0.5);
      });
    }
  }
}
