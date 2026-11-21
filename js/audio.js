// Synthesized Web Audio API Sound Engine - Rich, Audible, Safari/iPadOS/macOS Compatible
class NasaAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.engineGain = null;
    this.engineFilter = null;
    this.noiseNode = null;
    this.subOsc = null;
    this.subGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized && this.ctx) {
      this.resume();
      return;
    }
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      this.ctx = new AudioContextClass();
      this.setupEngineRumble();
      this.initialized = true;
      this.resume();
    } catch (e) {
      console.warn("Web Audio API not supported:", e);
    }
  }

  setupEngineRumble() {
    if (!this.ctx) return;

    // 2-second full-scale pink/brown rocket roar buffer
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    let peak = 0.001;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.992 * b0 + white * 0.06;
      b1 = 0.965 * b1 + white * 0.09;
      b2 = 0.880 * b2 + white * 0.14;
      const sample = b0 + b1 + b2 + white * 0.12;
      output[i] = sample;
      const abs = Math.abs(sample);
      if (abs > peak) peak = abs;
    }

    // Normalize buffer to strong audible level without clipping
    const norm = 0.85 / peak;
    for (let i = 0; i < bufferSize; i++) {
      output[i] *= norm;
    }

    this.noiseNode = this.ctx.createBufferSource();
    this.noiseNode.buffer = noiseBuffer;
    this.noiseNode.loop = true;

    // Warm low-pass filter that opens up with throttle
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.setValueAtTime(180, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(1.2, this.ctx.currentTime);

    // Master engine gain (strictly 0.0 until liftoff)
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // Subtle deep thruster sub-rumble oscillator for laptop & iPad speakers
    this.subOsc = this.ctx.createOscillator();
    this.subOsc.type = "sawtooth";
    this.subOsc.frequency.setValueAtTime(62, this.ctx.currentTime);

    this.subGain = this.ctx.createGain();
    this.subGain.gain.setValueAtTime(0.18, this.ctx.currentTime);

    this.noiseNode.connect(this.engineFilter);
    this.subOsc.connect(this.subGain);
    this.subGain.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);

    this.noiseNode.start(0);
    this.subOsc.start(0);
  }

  setThrottle(throttle) {
    if (!this.initialized) this.init();
    if (!this.ctx || !this.engineGain || !this.engineFilter) return;
    this.resume();
    const now = this.ctx.currentTime;

    if (throttle <= 0.01 || this.isMuted) {
      try {
        this.engineGain.gain.setTargetAtTime(0.0, now, 0.04);
      } catch (e) {}
      return;
    }

    const targetVol = Math.min(0.55, Math.max(0.0, 0.12 + throttle * 0.38));
    const cutoffFreq = 180 + throttle * 950;
    const subFreq = 52 + throttle * 36;

    try {
      this.engineGain.gain.setTargetAtTime(targetVol, now, 0.05);
      this.engineFilter.frequency.setTargetAtTime(cutoffFreq, now, 0.05);
      if (this.subOsc) {
        this.subOsc.frequency.setTargetAtTime(subFreq, now, 0.05);
      }
    } catch (e) {}
  }

  stopEngine() {
    if (this.engineGain && this.ctx) {
      try {
        const now = this.ctx.currentTime;
        this.engineGain.gain.setTargetAtTime(0.0, now, 0.03);
      } catch (e) {}
    }
  }

  stopAll() {
    this.stopEngine();
  }

  toggleMute() {
    this.init();
    this.resume();
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopEngine();
    } else {
      this.playCountdownBeep(false);
      if (typeof sim !== "undefined" && sim && sim.state === "FLIGHT" && sim.throttle > 0.01) {
        this.setThrottle(sim.throttle);
      }
    }
    return this.isMuted;
  }

  resume() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
  }

  playCountdownBeep(isFinal = false) {
    if (this.isMuted) return;
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;

    osc.type = "sine";
    osc.frequency.setValueAtTime(isFinal ? 1100 : 780, now);

    gain.gain.setValueAtTime(0.32, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (isFinal ? 0.38 : 0.16));

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + (isFinal ? 0.42 : 0.2));
  }

  playStageSeparation() {
    if (this.isMuted) return;
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();
    const now = this.ctx.currentTime;

    // Deep pyrotechnic bolt thump
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(170, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.38);

    gain.gain.setValueAtTime(0.55, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.45);

    // Crisp pyrotechnic burst hiss
    const burstLen = Math.floor(this.ctx.sampleRate * 0.28);
    const burstBuf = this.ctx.createBuffer(1, burstLen, this.ctx.sampleRate);
    const data = burstBuf.getChannelData(0);
    for (let i = 0; i < burstLen; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (burstLen * 0.35));
    }
    const burstSrc = this.ctx.createBufferSource();
    burstSrc.buffer = burstBuf;
    const burstGain = this.ctx.createGain();
    burstGain.gain.setValueAtTime(0.38, now);
    burstGain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    burstSrc.connect(burstGain);
    burstGain.connect(this.ctx.destination);
    burstSrc.start(now);
  }

  playOrbitAchieved() {
    if (this.isMuted) return;
    if (!this.initialized) this.init();
    if (!this.ctx) return;
    this.resume();
    const notes = [440, 554.37, 659.25, 880]; // Major chord fanfare
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + idx * 0.12;

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.65);
    });
  }
}

const NASA_AUDIO = new NasaAudioEngine();
