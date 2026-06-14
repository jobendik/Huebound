import { AudioEngine } from '../audio/engine';

// CrazyGames SDK wrapper — fully optional, game works without it.
export const Platform = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sdk: null as any,
  ready: false,

  init(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (w.CrazyGames?.SDK) this.sdk = w.CrazyGames.SDK;
      else if (w.CrazySDK) this.sdk = w.CrazySDK;
      if (this.sdk?.init) {
        Promise.resolve(this.sdk.init())
          .then(() => { this.ready = true; })
          .catch(() => {});
      } else if (this.sdk) {
        this.ready = true;
      }
    } catch { /* SDK absent or blocked */ }
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _game(): any { return this.sdk?.game ?? null; },
  onGameplayStart(): void { try { this._game()?.gameplayStart?.(); } catch { /* ignore */ } },
  onGameplayStop(): void { try { this._game()?.gameplayStop?.(); } catch { /* ignore */ } },
  onLevelStart(_level: number): void { /* reserved */ },
  onLevelComplete(_level: number, _data: unknown): void { /* reserved */ },
  onHappyMoment(): void { try { this._game()?.happytime?.(); } catch { /* ignore */ } },

  requestMidgameAdIfAvailable(): void {
    if (!this.sdk) return;
    try {
      this.sdk.ad?.requestAd?.('midgame', {
        adFinished() {},
        adError() {},
        adStarted() { try { AudioEngine.suspendForAd(); } catch { /* ignore */ } },
      });
    } catch { /* ignore */ }
  },
};
