'use strict';
/* ---------- The Ship :: dźwięk (wszystko generowane proceduralnie) ---------- */

class Audio {
  constructor() {
    this.ready = false;
    this.musicOn = true;
    this.volume = 0.7;
  }

  start() {
    if (this.ready) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.ready = true;

    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(ctx.destination);

    // pogłos przybliżony opóźnieniem ze sprzężeniem
    this.verbIn = ctx.createGain();
    const delay = ctx.createDelay(1.5);
    delay.delayTime.value = 0.32;
    const fb = ctx.createGain(); fb.gain.value = 0.42;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
    this.verbIn.connect(delay); delay.connect(lp); lp.connect(fb); fb.connect(delay);
    const verbOut = ctx.createGain(); verbOut.gain.value = 0.5;
    lp.connect(verbOut); verbOut.connect(this.master);

    this.musicGain = ctx.createGain();
    this.musicGain.gain.value = 0.0;
    this.musicGain.connect(this.master);
    this.musicGain.connect(this.verbIn);

    this.sfxGain = ctx.createGain();
    this.sfxGain.gain.value = 0.9;
    this.sfxGain.connect(this.master);
    this.sfxGain.connect(this.verbIn);

    this.buildAmbience();
    this.musicGain.gain.setTargetAtTime(0.22, ctx.currentTime, 3);
    this.nextNote = ctx.currentTime + 1;
    this.chordIdx = 0;
  }

  /* stały szum silników / wentylacji */
  buildAmbience() {
    const ctx = this.ctx;
    this.ambGain = ctx.createGain();
    this.ambGain.gain.value = 0.10;
    this.ambGain.connect(this.master);

    const noise = ctx.createBufferSource();
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
    noise.buffer = buf; noise.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 420;
    noise.connect(nf); nf.connect(this.ambGain);
    noise.start();
    this.ambNoise = nf;

    // niski hum reaktora
    this.hum = [];
    [55, 82.5, 110].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? 'triangle' : 'sawtooth';
      o.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.035 / (i + 1);
      const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = 260;
      o.connect(flt); flt.connect(g); g.connect(this.ambGain);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.05 + i * 0.03;
      const lg = ctx.createGain(); lg.gain.value = 1.5;
      lfo.connect(lg); lg.connect(o.frequency); lfo.start();
      o.start();
      this.hum.push({ o: o, g: g });
    });
  }

  setAmbience(kind) {
    if (!this.ready) return;
    const t = this.ctx.currentTime;
    if (kind === 'space') {
      this.ambNoise.frequency.setTargetAtTime(420, t, 1.5);
      this.ambGain.gain.setTargetAtTime(0.10, t, 1.5);
    } else if (kind === 'eva') {
      this.ambNoise.frequency.setTargetAtTime(150, t, 1.5);
      this.ambGain.gain.setTargetAtTime(0.05, t, 1.5);
    } else if (kind === 'planet') {
      this.ambNoise.frequency.setTargetAtTime(900, t, 1.5);
      this.ambGain.gain.setTargetAtTime(0.07, t, 1.5);
    }
  }

  /* --- chill muzyka: powolne pady w skali pentatonicznej --- */
  update(dt) {
    if (!this.ready || !this.musicOn) return;
    const ctx = this.ctx;
    if (ctx.currentTime < this.nextNote) return;
    const roots = [55, 65.41, 49, 73.42];      // A, C, G, D
    const scale = [0, 3, 5, 7, 10, 12, 15, 19];
    const root = roots[this.chordIdx % roots.length];
    if (Math.random() < 0.28) this.chordIdx++;
    const n = scale[Math.floor(Math.random() * scale.length)];
    const freq = root * Math.pow(2, n / 12) * (Math.random() < 0.35 ? 2 : 4);
    this.pad(freq, 2.6 + Math.random() * 2.4, 0.11);
    if (Math.random() < 0.45) this.pad(root * 2, 5, 0.05);
    this.nextNote = ctx.currentTime + 1.4 + Math.random() * 2.4;
  }

  pad(freq, dur, vol) {
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'triangle'; o.frequency.value = freq;
    const o2 = ctx.createOscillator();
    o2.type = 'sine'; o2.frequency.value = freq * 1.005;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1400;
    o.connect(f); o2.connect(f); f.connect(g); g.connect(this.musicGain);
    o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }

  toggleMusic() {
    if (!this.ready) return this.musicOn;
    this.musicOn = !this.musicOn;
    this.musicGain.gain.setTargetAtTime(this.musicOn ? 0.22 : 0, this.ctx.currentTime, 0.6);
    return this.musicOn;
  }

  noiseBurst(dur, f0, f1, vol, type) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = type || 'bandpass'; f.Q.value = 3;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
    const g = ctx.createGain(); g.gain.value = vol;
    g.gain.setTargetAtTime(0.0001, t + dur * 0.7, 0.12);
    src.connect(f); f.connect(g); g.connect(this.sfxGain);
    src.start(t); src.stop(t + dur + 0.05);
  }

  blip(freq, dur, vol, type) {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 1.9, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }

  door() { this.noiseBurst(0.7, 400, 1800, 0.28); this.blip(180, 0.25, 0.05, 'square'); }
  step(outside) { this.noiseBurst(0.09, outside ? 500 : 1300, outside ? 200 : 500, 0.11); }
  collect() { this.blip(700, 0.28, 0.16, 'sine'); setTimeout(() => this.blip(1050, 0.3, 0.12, 'sine'), 90); }
  place() { this.noiseBurst(0.12, 900, 300, 0.2); }
  remove() { this.noiseBurst(0.12, 300, 900, 0.16); }
  ui() { this.blip(520, 0.12, 0.08, 'triangle'); }
  deny() { this.blip(150, 0.2, 0.10, 'square'); }
  warp() {
    if (!this.ready) return;
    const ctx = this.ctx, t = ctx.currentTime;
    this.noiseBurst(3.2, 200, 5000, 0.30, 'bandpass');
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(60, t);
    o.frequency.exponentialRampToValueAtTime(700, t + 3.0);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.14, t + 1.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 1200;
    o.connect(f); f.connect(g); g.connect(this.sfxGain);
    o.start(t); o.stop(t + 3.7);
  }
  land() {
    this.noiseBurst(2.6, 900, 90, 0.30, 'lowpass');
    this.blip(90, 1.2, 0.10, 'sawtooth');
  }

  /* ciągła syrena alarmowa */
  sirenOn() {
    if (!this.ready || this.siren) return;
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 520;
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.55;
    const lg = ctx.createGain(); lg.gain.value = 180;
    lfo.connect(lg); lg.connect(o.frequency);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2.5;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.6);
    o.connect(f); f.connect(g); g.connect(this.master);
    o.start(t); lfo.start(t);
    this.siren = { o: o, lfo: lfo, g: g };
    if (this.musicGain) this.musicGain.gain.setTargetAtTime(0, t, 0.4);
  }

  sirenOff() {
    if (!this.ready || !this.siren) return;
    const t = this.ctx.currentTime, s = this.siren;
    s.g.gain.setTargetAtTime(0.0001, t, 0.35);
    s.o.stop(t + 1.6); s.lfo.stop(t + 1.6);
    this.siren = null;
    if (this.musicGain && this.musicOn) this.musicGain.gain.setTargetAtTime(0.22, t + 2, 3);
  }
}
