import { Store } from '../store';
import { AudioEngine } from '../audio/engine';
import { Haptics } from '../platform/haptics';
import {
  ensureObjectives, rerollOrder, claimWeekly, weeklyClaimable,
  WEEKLY_GOAL,
} from '../meta/objectives';
import { updateMenuStars } from './overlays';
import { toast } from './toast';

export function buildGoals(): void {
  ensureObjectives();
  const o = Store.data.objectives;

  const note = document.getElementById('reroll-note');
  if (note) note.textContent = o.rerolled ? '' : '· tap ⟳ to swap one';

  const list = document.getElementById('orders-list');
  if (list) {
    list.innerHTML = '';
    o.orders.forEach((order, i) => {
      const pct = Math.min(100, (order.progress / order.target) * 100);
      const row = document.createElement('div');
      row.className = 'order-row' + (order.done ? ' done' : '');
      row.innerHTML =
        `<div class="or-main">` +
          `<div class="or-text">${order.text}</div>` +
          `<div class="or-bar"><i style="width:${pct}%"></i></div>` +
        `</div>` +
        `<div class="or-side">` +
          (order.done
            ? `<span class="or-done">✓</span>`
            : `<span class="or-reward">&#9670; ${order.reward}</span>` +
              (!o.rerolled ? `<button class="or-reroll" data-i="${i}" aria-label="Reroll">&#10227;</button>` : '')) +
        `</div>`;
      list.appendChild(row);
    });
    list.querySelectorAll<HTMLButtonElement>('.or-reroll').forEach((b) => {
      b.addEventListener('click', () => {
        if (rerollOrder(Number(b.dataset.i))) {
          AudioEngine.button(); Haptics.select(); buildGoals();
        }
      });
    });
  }

  // Weekly meter
  const days = Store.data.weekly.days.length;
  const count = document.getElementById('weekly-count');
  if (count) count.textContent = `${Math.min(days, WEEKLY_GOAL)}/${WEEKLY_GOAL}`;
  const dots = document.getElementById('weekly-dots');
  if (dots) {
    dots.innerHTML = '';
    for (let i = 0; i < WEEKLY_GOAL; i++) {
      const d = document.createElement('span');
      d.className = 'wk-dot' + (i < days ? ' on' : '');
      dots.appendChild(d);
    }
  }
  const claim = document.getElementById('weekly-claim') as HTMLButtonElement | null;
  if (claim) {
    if (Store.data.weekly.claimed) { claim.hidden = true; }
    else if (weeklyClaimable()) { claim.hidden = false; claim.disabled = false; claim.textContent = 'Claim weekly bonus'; }
    else { claim.hidden = false; claim.disabled = true; claim.textContent = `Play ${WEEKLY_GOAL - days} more day${WEEKLY_GOAL - days > 1 ? 's' : ''}`; }
  }
}

export function initGoals(): void {
  document.getElementById('weekly-claim')?.addEventListener('click', () => {
    const amt = claimWeekly();
    if (amt > 0) {
      AudioEngine.best(); Haptics.complete();
      toast(`+${amt} shards — weekly bonus!`);
      buildGoals();
      updateMenuStars();
    }
  });
}
