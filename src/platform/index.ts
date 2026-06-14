import { AudioEngine } from '../audio/engine';

/* eslint-disable @typescript-eslint/no-explicit-any */

// CrazyGames SDK v3 wrapper. Fully optional — the game runs identically without
// it (local dev, itch, self-host). When the SDK is present we wire up the full
// lifecycle: loading screen, gameplay start/stop, happytime, interstitial &
// rewarded ads, and cloud-saved progress via the data module.
type AdType = 'midgame' | 'rewarded';

export const Platform = {
  sdk: null as any,
  ready: false,
  _readyCbs: [] as Array<() => void>,

  init(): void {
    try {
      const w = window as any;
      this.sdk = w.CrazyGames?.SDK ?? w.CrazySDK ?? null;
      if (!this.sdk) return;
      const done = () => {
        this.ready = true;
        try { this._game()?.sdkGameLoadingStart?.(); } catch { /* ignore */ }
        this._readyCbs.splice(0).forEach((cb) => { try { cb(); } catch { /* ignore */ } });
      };
      if (this.sdk.init) Promise.resolve(this.sdk.init()).then(done).catch(() => {});
      else done();
    } catch { /* SDK absent or blocked */ }
  },

  // Run `cb` once the SDK is initialised (immediately if already ready, never if
  // the SDK is absent).
  whenReady(cb: () => void): void {
    if (this.ready) cb();
    else if (this.sdk) this._readyCbs.push(cb);
  },

  // Called once the menu is interactive so CrazyGames can hide its loader.
  loadingFinished(): void {
    try { this._game()?.sdkGameLoadingStop?.(); } catch { /* ignore */ }
  },

  _game(): any { return this.sdk?.game ?? null; },
  _ad(): any { return this.sdk?.ad ?? null; },

  onGameplayStart(): void { try { this._game()?.gameplayStart?.(); } catch { /* ignore */ } },
  onGameplayStop(): void { try { this._game()?.gameplayStop?.(); } catch { /* ignore */ } },
  onLevelStart(_level: number): void { /* reserved for analytics */ },
  onLevelComplete(_level: number, _data: unknown): void { /* reserved for analytics */ },
  onHappyMoment(): void { try { this._game()?.happytime?.(); } catch { /* ignore */ } },

  // ── Ads ────────────────────────────────────────────────
  // Unified request that supports both the v3 promise API and the older
  // callback API, mutes audio for the duration, and reports success/failure.
  _requestAd(type: AdType): Promise<boolean> {
    const ad = this._ad();
    if (!this.sdk || !ad?.requestAd) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ok: boolean) => { if (settled) return; settled = true; resolve(ok); };
      const callbacks = {
        adStarted: () => { try { AudioEngine.suspendForAd(); } catch { /* ignore */ } },
        adFinished: () => { try { AudioEngine.unlock(); } catch { /* ignore */ } finish(true); },
        adError: () => { try { AudioEngine.unlock(); } catch { /* ignore */ } finish(false); },
      };
      try {
        const maybe = ad.requestAd(type, callbacks);
        // v3 promise form resolves on finish / rejects on error.
        if (maybe && typeof maybe.then === 'function') {
          maybe.then(() => finish(true)).catch(() => finish(false));
        }
      } catch { finish(false); }
      // Safety net so the UI never hangs if no callback ever fires.
      setTimeout(() => finish(false), 45000);
    });
  },

  // Optional opt-in reward. Resolves true only when the ad completed.
  requestRewardedAd(): Promise<boolean> { return this._requestAd('rewarded'); },

  requestMidgameAdIfAvailable(): void { void this._requestAd('midgame'); },
  hasRewardedAds(): boolean { return !!this._ad()?.requestAd; },

  // ── Cloud save (data module) ───────────────────────────
  cloudGet(key: string): string | null {
    try { return this.sdk?.data?.getItem?.(key) ?? null; } catch { return null; }
  },
  cloudSet(key: string, value: string): void {
    try { this.sdk?.data?.setItem?.(key, value); } catch { /* ignore */ }
  },

  // ── Misc ───────────────────────────────────────────────
  inviteLink(params: Record<string, string> = {}): string | null {
    try { return this.sdk?.game?.inviteLink?.(params) ?? null; } catch { return null; }
  },
};
