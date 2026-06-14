import { Store } from '../store';
import { AudioEngine } from '../audio/engine';
import { Haptics } from '../platform/haptics';
import { processDailyOpen, claimDailyReward, loginReward } from '../meta/economy';
import { openOverlay, closeOverlay, updateMenuStars } from './overlays';
import { toast } from './toast';

// Show the login-streak reward once per day for returning players.
export function maybeShowDailyReward(): void {
  const res = processDailyOpen();
  if (!res.rewardReady || !Store.data.started) return;

  const streak = res.streak;
  const title = document.querySelector('#daily-reward h2');
  if (title) title.textContent = streak > 1 ? 'Welcome back!' : 'Daily Bonus';

  const streakEl = document.getElementById('dr-streak');
  if (streakEl) streakEl.textContent = streak > 1 ? `Day ${streak} streak 🔥` : 'Your daily reward';

  const amountEl = document.getElementById('dr-amount');
  if (amountEl) amountEl.textContent = String(loginReward(streak));

  openOverlay('daily-reward');
}

export function claimDailyAndClose(): void {
  const amt = claimDailyReward();
  AudioEngine.best();
  Haptics.complete();
  closeOverlay('daily-reward');
  updateMenuStars();
  if (amt > 0) toast(`+${amt} shards collected!`);
}
