import { G } from '../game/state';
import { Store } from '../store';
import { LEVEL_COUNT } from '../render/colors';
import { levelInfo } from '../meta/progression';
import { ordersRemaining, weeklyClaimable } from '../meta/objectives';

export function showScreen(name: string): void {
  G.screen = name;
  document.querySelectorAll<HTMLElement>('.screen').forEach((s) =>
    s.classList.toggle('active', s.id === name),
  );
}

export function openOverlay(id: string): void {
  document.getElementById(id)?.classList.add('active');
}

export function closeOverlay(id: string): void {
  document.getElementById(id)?.classList.remove('active');
}

export function updateMenuStars(): void {
  const starsEl = document.getElementById('menu-stars');
  if (starsEl) starsEl.textContent = String(Store.totalStars());

  const shardsEl = document.getElementById('menu-shards');
  if (shardsEl) shardsEl.textContent = String(Store.data.shards ?? 0);

  const progress = document.getElementById('menu-progress');
  if (progress) {
    progress.textContent = `Level ${Math.min(LEVEL_COUNT - 1, Store.data.maxUnlocked) + 1} unlocked`;
  }

  const cont = document.getElementById('btn-continue') as HTMLButtonElement | null;
  if (cont) {
    cont.style.display = Store.data.started ? '' : 'none';
    cont.textContent = Store.data.started
      ? `Continue Level ${(Store.data.current ?? 0) + 1}`
      : 'Continue';
  }

  // Player level strip (identity, §3).
  const li = levelInfo();
  const lvlEl = document.getElementById('ps-level');
  if (lvlEl) lvlEl.textContent = String(li.level);
  const titleEl = document.getElementById('ps-title');
  if (titleEl) titleEl.textContent = li.title;
  const xpFill = document.getElementById('ps-xp-fill');
  if (xpFill) xpFill.style.width = `${Math.round((li.into / li.span) * 100)}%`;

  // Goals pip — claimable orders / weekly bonus.
  const pip = document.getElementById('goals-pip');
  if (pip) {
    const n = ordersRemaining();
    if (weeklyClaimable()) { pip.textContent = '!'; pip.removeAttribute('hidden'); }
    else if (n > 0) { pip.textContent = String(n); pip.removeAttribute('hidden'); }
    else pip.setAttribute('hidden', '');
  }

  // Daily Challenge badge: streak flame, or a tick when already solved today.
  const badge = document.getElementById('daily-badge');
  if (badge) {
    const c = Store.data.challenge;
    if (c.done && c.day) {
      badge.textContent = '✓ Done';
      badge.className = 'daily-badge done';
      badge.removeAttribute('hidden');
    } else if (c.streak > 0) {
      badge.textContent = `🔥 ${c.streak}`;
      badge.className = 'daily-badge';
      badge.removeAttribute('hidden');
    } else {
      badge.setAttribute('hidden', '');
    }
  }
}
