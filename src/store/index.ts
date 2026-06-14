import type { SaveData, BestRecord } from '../types';
import { Platform } from '../platform';

export const Store = {
  KEY: 'huebound.save.v1',
  available: true,
  data: null as unknown as SaveData,

  _default(): SaveData {
    return {
      version: 2,
      started: false,
      maxUnlocked: 0,
      current: 0,
      best: {},
      settings: { sound: true, motion: true, symbols: false, haptics: true },
      shards: 0,
      xp: 0,
      winStreak: 0,
      tutorialDone: false,
      daily: { lastSeenDay: '', loginStreak: 0, bestLoginStreak: 0, lastRewardDay: '' },
      challenge: { day: '', done: false, best: undefined, streak: 0, bestStreak: 0, lastSolvedDay: '' },
      cosmetics: { skin: 'skin-classic', theme: 'theme-cave', owned: ['skin-classic', 'theme-cave'] },
      objectives: { day: '', orders: [], rerolled: false },
      weekly: { week: '', days: [], claimed: false },
      stats: { wins: 0, perfects: 0, tubes: 0, pours: 0 },
    };
  },

  load(): void {
    this.data = this._default();
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) this._merge(JSON.parse(raw));
    } catch {
      this.available = false;
    }
  },

  // Merge a parsed save into defaults, preserving any field the old save lacks
  // and always keeping owned cosmetics that ship for free.
  _merge(parsed: unknown): void {
    if (!parsed || typeof parsed !== 'object') return;
    const d = this._default();
    const p = parsed as Partial<SaveData>;
    Object.assign(this.data, d, p);
    this.data.settings = Object.assign(d.settings, p.settings ?? {});
    this.data.best = p.best ?? {};
    this.data.daily = Object.assign(d.daily, p.daily ?? {});
    this.data.challenge = Object.assign(d.challenge, p.challenge ?? {});
    this.data.cosmetics = Object.assign(d.cosmetics, p.cosmetics ?? {});
    this.data.objectives = Object.assign(d.objectives, p.objectives ?? {});
    this.data.weekly = Object.assign(d.weekly, p.weekly ?? {});
    this.data.stats = Object.assign(d.stats, p.stats ?? {});
    const owned = new Set([...d.cosmetics.owned, ...(this.data.cosmetics.owned ?? [])]);
    this.data.cosmetics.owned = [...owned];
    this.data.shards = Math.max(0, this.data.shards ?? 0);
    this.data.version = 2;
  },

  save(): void {
    let json = '';
    try { json = JSON.stringify(this.data); } catch { return; }
    if (this.available) {
      try { localStorage.setItem(this.KEY, json); } catch { this.available = false; }
    }
    Platform.cloudSet(this.KEY, json); // best-effort mirror for logged-in users
  },

  // Pull a cloud save (CrazyGames data module) and merge it favourably so we
  // never lose progress across devices. Returns true if anything changed.
  syncFromCloud(): boolean {
    const raw = Platform.cloudGet(this.KEY);
    let changed = false;
    if (raw) {
      try { changed = this._mergeProgress(JSON.parse(raw)); } catch { /* ignore */ }
    }
    this.save(); // push the merged result back up
    return changed;
  },

  // Take the most generous value for every progression field.
  _mergeProgress(parsed: unknown): boolean {
    if (!parsed || typeof parsed !== 'object') return false;
    const o = parsed as Partial<SaveData>;
    const d = this.data;
    let changed = false;
    const bump = (cond: boolean) => { if (cond) changed = true; };

    bump((o.maxUnlocked ?? 0) > d.maxUnlocked); d.maxUnlocked = Math.max(d.maxUnlocked, o.maxUnlocked ?? 0);
    bump((o.shards ?? 0) > (d.shards ?? 0)); d.shards = Math.max(d.shards ?? 0, o.shards ?? 0);
    bump((o.xp ?? 0) > (d.xp ?? 0)); d.xp = Math.max(d.xp ?? 0, o.xp ?? 0);
    d.started = d.started || !!o.started;
    d.tutorialDone = d.tutorialDone || !!o.tutorialDone;
    if ((o.current ?? 0) > d.current) d.current = o.current ?? d.current;

    // Per-level bests: fewer moves / more stars wins.
    const ob = (o.best ?? {}) as Record<string, BestRecord>;
    for (const k of Object.keys(ob)) {
      const a = d.best[k], b = ob[k];
      if (!a || b.moves < a.moves || b.stars > a.stars) {
        d.best[k] = { moves: Math.min(a?.moves ?? Infinity, b.moves), stars: Math.max(a?.stars ?? 0, b.stars), timeMs: b.timeMs };
        changed = true;
      }
    }

    // Streaks & cosmetics: keep the best / the union.
    if (o.daily) {
      d.daily.loginStreak = Math.max(d.daily.loginStreak, o.daily.loginStreak ?? 0);
      d.daily.bestLoginStreak = Math.max(d.daily.bestLoginStreak ?? 0, o.daily.bestLoginStreak ?? 0);
    }
    if (o.challenge) {
      d.challenge.bestStreak = Math.max(d.challenge.bestStreak ?? 0, o.challenge.bestStreak ?? 0);
    }
    if (o.cosmetics?.owned) {
      const before = d.cosmetics.owned.length;
      d.cosmetics.owned = [...new Set([...d.cosmetics.owned, ...o.cosmetics.owned])];
      if (d.cosmetics.owned.length !== before) changed = true;
    }
    return changed;
  },

  totalStars(): number {
    return Object.values(this.data.best).reduce((acc, r) => acc + (r.stars ?? 0), 0);
  },
};
