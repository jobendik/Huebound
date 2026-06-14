import { G } from '../game/state';
import { draw } from './draw';
import { updateFX, drawFX } from './effects';
import { finishPour } from '../game/flow';

let _lastFrame = 0;

export function markDirty(): void { startLoop(); }

function shakeActive(): boolean {
  return G.shakeI >= 0 && performance.now() - G.shakeT < 320;
}

function needsAnim(): boolean {
  return !!G.anim || G.fx.length > 0 || G.selected >= 0 || !!G.hintMove || shakeActive();
}

export function startLoop(): void {
  if (G.loopRunning) return;
  G.loopRunning = true;
  _lastFrame = performance.now();
  requestAnimationFrame(loop);
}

function loop(now: number): void {
  if (!G.loopRunning) return;
  const dt = Math.min(50, now - _lastFrame);
  _lastFrame = now;
  if (G.anim && now - G.anim.t0 >= G.anim.dur) finishPour();
  updateFX(now, dt);
  draw(now);
  drawFX();
  if (G.screen === 'play' && needsAnim()) requestAnimationFrame(loop);
  else G.loopRunning = false;
}
