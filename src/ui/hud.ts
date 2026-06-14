import { G } from '../game/state';
import { Store } from '../store';
import { fmtTime } from '../game/timer';

function set(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

export function updateHUD(): void {
  const tag = document.getElementById('hud-level-tag');
  if (tag) {
    if (G.daily) tag.innerHTML = '&#9670; Daily';
    else tag.innerHTML = 'Level <span id="hud-level">' + (G.level + 1) + '</span>';
  }

  set('hud-moves', String(G.moves));
  set('hud-time', fmtTime(G.timeMs));
  set('hud-target', String(G.par + 2));
  set('hud-shards', String(Store.data.shards ?? 0));

  const best = G.daily ? Store.data.challenge.best : Store.data.best[String(G.level)];
  set('hud-best', best ? String(best.moves) : '—');

  const undoBtn = document.getElementById('btn-undo') as HTMLButtonElement | null;
  if (undoBtn) undoBtn.disabled = G.history.length === 0;

  const hintLabel = document.getElementById('hint-label');
  if (hintLabel) hintLabel.textContent = G.hintsLeft > 0 ? `Hint (${G.hintsLeft})` : 'Hint';
}
