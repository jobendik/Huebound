import { G } from './state';
import { startTiming, stopTiming } from './timer';
import { fmtTime } from './timer';
import { cloneTubes, topColor, pourAmount, applyPour, isSolved, findHint, generateLevel } from '../core';
import { AudioEngine } from '../audio/engine';
import { Store } from '../store';
import { Platform } from '../platform';
import { LEVEL_COUNT } from '../render/colors';
import { startLoop, markDirty } from '../render/loop';
import { computeLayout } from '../render/layout';
import { spawnComplete, spawnCrystalRain } from '../render/effects';
import { updateHUD } from '../ui/hud';
import { showScreen, openOverlay, updateMenuStars } from '../ui/overlays';
import { toast } from '../ui/toast';

export function loadLevel(idx: number): void {
  idx = Math.max(0, Math.min(LEVEL_COUNT - 1, idx));
  const data = generateLevel(idx);
  G.level = idx;
  G.cap = data.capacity;
  G.par = data.par;
  G.tubes = cloneTubes(data.tubes);
  G.start = cloneTubes(data.tubes);
  G.moves = 0;
  G.history = [];
  G.selected = -1;
  G.locked = false;
  G.anim = null;
  G.fx = [];
  G.hintMove = null;
  G.timeMs = 0;
  Store.data.current = idx;
  Store.data.started = true;
  Store.save();
  computeLayout();
  updateHUD();
  showScreen('play');
  startTiming();
  startLoop();
  Platform.onGameplayStart();
  Platform.onLevelStart(idx + 1);
}

export function restartLevel(): void {
  G.tubes = cloneTubes(G.start);
  G.moves = 0;
  G.history = [];
  G.selected = -1;
  G.locked = false;
  G.anim = null;
  G.fx = [];
  G.hintMove = null;
  G.timeMs = 0;
  startTiming();
  updateHUD();
  markDirty();
  toast('Level restarted');
}

export function tryPour(s: number, d: number): boolean {
  if (G.locked || s === d) return false;
  const amt = pourAmount(G.tubes[s], G.tubes[d], G.cap);
  if (amt <= 0) return false;
  G.history.push({ tubes: cloneTubes(G.tubes), moves: G.moves });
  if (G.history.length > 400) G.history.shift();
  const color = topColor(G.tubes[s]);
  const pre = cloneTubes(G.tubes);
  G.tubes = applyPour(G.tubes, s, d, G.cap);
  G.moves++;
  G.selected = -1;
  G.hintMove = null;
  G.locked = true;
  G.anim = { type: 'pour', s, d, color, count: amt, pre, t0: performance.now(), dur: G.motion ? 440 : 1 };
  AudioEngine.pour();
  updateHUD();
  startLoop();
  return true;
}

export function finishPour(): void {
  const a = G.anim;
  G.anim = null;
  G.locked = false;
  if (!a) return;
  const dt = G.tubes[a.d];
  if (dt.length === G.cap && G.tubes[a.d].every((c) => c === G.tubes[a.d][0])) {
    spawnComplete(a.d);
    AudioEngine.complete();
  }
  if (isSolved(G.tubes, G.cap)) onWin();
  else markDirty();
}

export function undo(): void {
  if (G.locked || !G.history.length) return;
  const prev = G.history.pop()!;
  G.tubes = prev.tubes;
  G.moves = prev.moves;
  G.selected = -1;
  G.hintMove = null;
  AudioEngine.deselect();
  updateHUD();
  markDirty();
}

export function doHint(): void {
  if (G.locked) return;
  const h = findHint(G.tubes, G.cap);
  if (!h) { toast('No moves — try Undo or Restart'); AudioEngine.invalid(); return; }
  G.hintMove = h;
  G.hintTimer = performance.now();
  G.selected = -1;
  AudioEngine.button();
  markDirty();
  startLoop();
}

function starsFor(moves: number, par: number): number {
  if (moves <= par + 2) return 3;
  if (moves <= Math.round(par * 1.75) + 1) return 2;
  return 1;
}

export function pauseGame(): void {
  if (G.screen !== 'play') return;
  stopTiming();
  Platform.onGameplayStop();
  openOverlay('pause');
}

export function resumeFromPause(): void {
  closeOverlayImport('pause');
  if (G.screen === 'play' && !isSolved(G.tubes, G.cap)) {
    startTiming();
    Platform.onGameplayStart();
    startLoop();
  }
}

// Imported lazily to avoid circular dep at module level.
function closeOverlayImport(id: string): void {
  document.getElementById(id)?.classList.remove('active');
}

function onWin(): void {
  stopTiming();
  G.selected = -1;
  G.hintMove = null;
  const stars = starsFor(G.moves, G.par);
  const key = String(G.level);
  const prev = Store.data.best[key];
  let isBest = false;
  if (!prev || G.moves < prev.moves || (G.moves === prev.moves && G.timeMs < (prev.timeMs ?? Infinity))) {
    isBest = !!prev;
    Store.data.best[key] = { moves: G.moves, stars: Math.max(stars, prev ? prev.stars : 0), timeMs: Math.round(G.timeMs) };
  } else if (prev && stars > prev.stars) {
    Store.data.best[key] = { moves: prev.moves, stars, timeMs: prev.timeMs };
  }
  if (G.level + 1 > Store.data.maxUnlocked && G.level < LEVEL_COUNT - 1) {
    Store.data.maxUnlocked = G.level + 1;
  }
  Store.data.current = Math.min(
    LEVEL_COUNT - 1,
    Math.max(Store.data.current ?? 0, G.level < LEVEL_COUNT - 1 ? G.level + 1 : G.level),
  );
  Store.save();

  spawnCrystalRain();
  AudioEngine.win();
  Platform.onGameplayStop();
  Platform.onLevelComplete(G.level + 1, { moves: G.moves, stars, timeMs: Math.round(G.timeMs) });

  const winMoves = document.getElementById('win-moves');
  if (winMoves) winMoves.textContent = String(G.moves);
  const winTime = document.getElementById('win-time');
  if (winTime) winTime.textContent = fmtTime(G.timeMs);

  const starEls = document.querySelectorAll<HTMLElement>('#win-stars .s');
  starEls.forEach((e) => e.classList.remove('lit'));
  setTimeout(() => {
    starEls.forEach((e, i) => { if (i < stars) setTimeout(() => e.classList.add('lit'), i * 180); });
  }, 200);

  const bestEl = document.getElementById('win-best');
  if (bestEl) {
    if (isBest) {
      bestEl.innerHTML = '<span class="best-badge">&#10022; New Best!</span>';
      setTimeout(() => { AudioEngine.best(); Platform.onHappyMoment(); }, 700);
    } else {
      const b = Store.data.best[key];
      bestEl.innerHTML = `<span style="color:var(--ink-dim);font-size:13px">Best: ${b.moves} moves</span>`;
    }
  }

  const winNext = document.getElementById('win-next');
  if (winNext) winNext.style.display = G.level < LEVEL_COUNT - 1 ? '' : 'none';
  const winTitle = document.getElementById('win-title');
  if (winTitle) winTitle.textContent = G.level === LEVEL_COUNT - 1 ? 'All Crystals Sorted!' : 'Sorted!';

  if ((G.level + 1) % 4 === 0) Platform.requestMidgameAdIfAvailable();
  setTimeout(() => openOverlay('win'), 360);
  updateMenuStars();
}
