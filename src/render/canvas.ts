import { G } from '../game/state';
import { computeLayout } from './layout';

export const cv = document.getElementById('board') as HTMLCanvasElement;
export const ctx = cv.getContext('2d') as CanvasRenderingContext2D;
export const wrapEl = document.getElementById('board-wrap') as HTMLDivElement;

export let dpr = Math.max(1, Math.min(window.devicePixelRatio ?? 1, 2.5));

export function resizeCanvas(): void {
  const rect = wrapEl.getBoundingClientRect();
  dpr = Math.max(1, Math.min(window.devicePixelRatio ?? 1, 2.5));
  cv.width = Math.max(1, Math.round(rect.width * dpr));
  cv.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  computeLayout();
}

export function doResize(): void {
  const rect = wrapEl.getBoundingClientRect();
  G.boardW = rect.width;
  G.boardH = rect.height;
  resizeCanvas();
}
