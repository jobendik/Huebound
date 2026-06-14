import { Platform } from '../platform';
import { AudioEngine } from '../audio/engine';
import { openOverlay, closeOverlay } from './overlays';
import { toast } from './toast';

interface RewardOpts {
  title: string;
  msg: string;
  onReward: () => void;       // granted after a completed ad
  fallback?: () => void;      // when no SDK / ad unavailable
}

// Opt-in rewarded-ad prompt (CrazyGames best practice: never auto-play rewarded
// ads). Resolves to onReward only when the ad actually finishes.
export function showRewardPrompt(opts: RewardOpts): void {
  const watch = document.getElementById('rp-watch') as HTMLButtonElement | null;
  const cancel = document.getElementById('rp-cancel') as HTMLButtonElement | null;
  const title = document.getElementById('rp-title');
  const msg = document.getElementById('rp-msg');
  if (title) title.textContent = opts.title;
  if (msg) msg.textContent = opts.msg;

  const close = () => {
    closeOverlay('reward-prompt');
    if (watch) watch.onclick = null;
    if (cancel) cancel.onclick = null;
  };

  if (watch) {
    watch.disabled = false;
    watch.onclick = () => {
      AudioEngine.button();
      if (!Platform.hasRewardedAds()) { close(); opts.fallback?.(); return; }
      watch.disabled = true;
      Platform.requestRewardedAd().then((ok) => {
        close();
        if (ok) opts.onReward();
        else { toast('Ad unavailable — try again later'); opts.fallback?.(); }
      });
    };
  }
  if (cancel) cancel.onclick = () => { AudioEngine.button(); close(); };

  openOverlay('reward-prompt');
}
