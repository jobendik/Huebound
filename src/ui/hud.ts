import { G } from '../game/state';
import { Store } from '../store';
import { fmtTime } from '../game/timer';

export function updateHUD(): void {
  const lvl = document.getElementById('hud-level');
  if (lvl) lvl.textContent = String(G.level + 1);

  const moves = document.getElementById('hud-moves');
  if (moves) moves.textContent = String(G.moves);

  const time = document.getElementById('hud-time');
  if (time) time.textContent = fmtTime(G.timeMs);

  const target = document.getElementById('hud-target');
  if (target) target.textContent = String(G.par + 2);

  const best = Store.data.best[String(G.level)];
  const bestEl = document.getElementById('hud-best');
  if (bestEl) bestEl.textContent = best ? String(best.moves) : '—';

  const undoBtn = document.getElementById('btn-undo') as HTMLButtonElement | null;
  if (undoBtn) undoBtn.disabled = G.history.length === 0;
}
