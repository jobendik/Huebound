import type { SaveData } from '../types';

export const Store = {
  KEY: 'huebound.save.v1',
  available: true,
  data: null as unknown as SaveData,

  _default(): SaveData {
    return {
      version: 1,
      started: false,
      maxUnlocked: 0,
      current: 0,
      best: {},
      settings: { sound: true, motion: true, symbols: false, haptics: true },
    };
  },

  load(): void {
    this.data = this._default();
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          const p = parsed as Partial<SaveData>;
          Object.assign(this.data, p);
          this.data.settings = Object.assign(this._default().settings, p.settings ?? {});
          this.data.best = p.best ?? {};
        }
      }
    } catch {
      this.available = false;
    }
  },

  save(): void {
    if (!this.available) return;
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.data));
    } catch {
      this.available = false;
    }
  },

  totalStars(): number {
    return Object.values(this.data.best).reduce((acc, r) => acc + (r.stars ?? 0), 0);
  },
};
