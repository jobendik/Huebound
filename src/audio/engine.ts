// Web Audio synthesizer — crystal-tuned frequencies for gem/shard sorting theme.
export const AudioEngine = {
  ctx: null as AudioContext | null,
  master: null as GainNode | null,
  enabled: true,
  unlocked: false,

  ensure(): void {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  },

  unlock(): void {
    this.ensure();
    if (this.ctx?.state === 'suspended') this.ctx.resume().catch(() => {});
    this.unlocked = true;
  },

  suspendForAd(): void {
    try { this.ctx?.suspend(); } catch { /* ignore */ }
  },

  blip(freq: number, dur: number, type: OscillatorType, gain: number, when?: number): void {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx || !this.master) return;
    const t0 = when ?? this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  },

  glide(f0: number, f1: number, dur: number, type: OscillatorType, gain: number): void {
    if (!this.enabled) return;
    this.ensure();
    if (!this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  },

  select(): void {
    const t = this.ctx ? this.ctx.currentTime : 0;
    this.blip(740, 0.09, 'sine', 0.13, t);
    this.blip(1110, 0.07, 'sine', 0.06, t + 0.01);
  },
  deselect(): void { this.glide(660, 440, 0.10, 'sine', 0.10); },
  pour(): void {
    // Crystal shards cascading — a sparkle of descending chimes with variation.
    this.ensure();
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    const root = 880 * (0.94 + Math.random() * 0.12);
    const steps = [1, 1.26, 1.5, 1.88];
    steps.forEach((m, i) => this.blip(root * m, 0.10, 'triangle', 0.07 - i * 0.012, t + i * 0.035));
    this.glide(1180, 760, 0.16, 'sine', 0.05);
  },
  invalid(): void { this.blip(150, 0.16, 'square', 0.09); this.blip(110, 0.18, 'square', 0.06); },
  complete(): void {
    // Bright resolving chord — a satisfying "click into place".
    const base = this.ctx ? this.ctx.currentTime : 0;
    [1047, 1319, 1568].forEach((f, i) => this.blip(f, 0.22, 'sine', 0.13, base + i * 0.06));
    this.blip(2093, 0.18, 'triangle', 0.06, base + 0.12);
  },
  button(): void { this.blip(660, 0.04, 'sine', 0.08); },
  win(): void {
    this.ensure();
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    [784, 988, 1175, 1568, 1976].forEach((f, i) => this.blip(f, 0.26, 'sine', 0.14, t + i * 0.10));
  },
  best(): void {
    this.ensure();
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime;
    [1976, 2349, 3136].forEach((f, i) => this.blip(f, 0.20, 'triangle', 0.12, t + i * 0.06));
  },
};
