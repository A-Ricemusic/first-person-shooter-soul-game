/** All sounds are authored at runtime; no third-party samples. */
export class SoulAudio {
  constructor() { this.volume = 0.65; this.ctx = null; }
  wake() {
    try {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain(); this.master.gain.value = this.volume * 0.5;
        const compressor = this.ctx.createDynamicsCompressor();
        compressor.threshold.value = -14; compressor.ratio.value = 8;
        this.master.connect(compressor); compressor.connect(this.ctx.destination);
        this.noise = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
        const data = this.noise.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      this.ctx.resume().catch(() => {});
    } catch (_) { /* Audio is an enhancement; blocked audio must never block play. */ }
  }
  setVolume(v) { this.volume = Math.max(0, Math.min(1, Number(v) || 0)); if (this.master) this.master.gain.setTargetAtTime(this.volume * 0.5, this.ctx.currentTime, 0.03); }
  tone(frequency, duration, type = 'sine', gain = 0.3, end = frequency, delay = 0) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(frequency, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, end), t + duration);
    g.gain.setValueAtTime(0.001, t); g.gain.linearRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + duration + 0.01);
  }
  burst(duration, gain = 0.4, cutoff = 1200) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime, source = this.ctx.createBufferSource(), g = this.ctx.createGain(), filter = this.ctx.createBiquadFilter();
    source.buffer = this.noise; filter.type = 'lowpass'; filter.frequency.value = cutoff;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + duration);
    source.connect(filter); filter.connect(g); g.connect(this.master); source.start(t, Math.random() * 0.7); source.stop(t + duration);
  }
  shoot() { this.burst(0.13, 0.8, 3400); this.tone(140, 0.11, 'triangle', 0.65, 38); this.tone(1600, 0.035, 'square', 0.1, 260); }
  hit(head) { this.tone(head ? 1400 : 800, 0.06, 'sine', 0.18, head ? 1800 : 500); }
  kill() { this.tone(280, 0.12, 'triangle', 0.2, 560); this.tone(840, 0.15, 'sine', 0.14, 1100, 0.07); }
  hurt() { this.burst(0.14, 0.5, 600); this.tone(90, 0.22, 'triangle', 0.3, 30); }
  dash() { this.burst(0.25, 0.35, 5000); this.tone(150, 0.26, 'sine', 0.2, 1600); }
  reload() { this.burst(0.045, 0.2, 2000); this.tone(250, 0.06, 'square', 0.08, 180); this.tone(400, 0.07, 'square', 0.06, 300, 0.8); }
  core() { [220, 330, 440, 660, 880].forEach((f, i) => this.tone(f, 0.8, 'sine', 0.18, f * 1.01, i * 0.08)); }
  warning() { this.tone(320, 0.13, 'sine', 0.12, 480); }
  footstep(sprint) { this.burst(0.07, sprint ? 0.11 : 0.06, 450); }
  win() { [220, 277, 330, 440, 554, 660].forEach((f, i) => this.tone(f, 1.7, 'sine', 0.17, f, i * 0.13)); }
  lose() { this.tone(180, 1.3, 'sawtooth', 0.13, 35); }
  dispose() { this.ctx?.close(); }
}
