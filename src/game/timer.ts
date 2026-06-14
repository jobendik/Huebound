import { G } from './state';

let displayTimer = 0;

export function startTiming(): void {
  G.timing = true;
  G.lastTick = performance.now();
  // Live HUD clock — update the time chip once a second while playing.
  clearInterval(displayTimer);
  displayTimer = window.setInterval(() => {
    if (!G.timing) return;
    tickTime();
    const el = document.getElementById('hud-time');
    if (el) el.textContent = fmtTime(G.timeMs);
  }, 1000);
}

export function stopTiming(): void {
  if (G.timing) tickTime();
  G.timing = false;
  clearInterval(displayTimer);
}

export function tickTime(): void {
  if (!G.timing) return;
  const now = performance.now();
  G.timeMs += now - G.lastTick;
  G.lastTick = now;
}

export function fmtTime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}
