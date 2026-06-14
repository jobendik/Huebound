import { G } from './state';

export function startTiming(): void {
  G.timing = true;
  G.lastTick = performance.now();
}

export function stopTiming(): void {
  if (G.timing) tickTime();
  G.timing = false;
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
