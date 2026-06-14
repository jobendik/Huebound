import { G } from './state';
import { startTiming, stopTiming } from './timer';
import { fmtTime } from './timer';
import { cloneTubes, topColor, pourAmount, applyPour, isSolved, findHint, generateLevel } from '../core';
import { AudioEngine } from '../audio/engine';
import { Haptics } from '../platform/haptics';
import { Store } from '../store';
import { Platform } from '../platform';
import { LEVEL_COUNT, pal } from '../render/colors';
import { startLoop, markDirty } from '../render/loop';
import { computeLayout } from '../render/layout';
import { spawnComplete, spawnCrystalRain, spawnLand } from '../render/effects';
import { updateHUD } from '../ui/hud';
import { showScreen, openOverlay, updateMenuStars } from '../ui/overlays';
import { toast } from '../ui/toast';
import { bandsOf } from '../render/draw';
import {
  shardsForWin, addShards, dailyBoard, recordChallengeWin, isChallengeDoneToday,
} from '../meta/economy';
import { maybeStartTutorial, isTutorialActive, tutorialOnPour } from './tutorial';

export const FREE_HINTS = 2;

// Transient win bookkeeping (for the "double shards" rewarded ad).
let lastWinShards = 0;
let lastWinDoubled = false;

function resetRun(): void {
  G.moves = 0;
  G.history = [];
  G.selected = -1;
  G.locked = false;
  G.anim = null;
  G.fx = [];
  G.hintMove = null;
  G.settleI = -1;
  G.timeMs = 0;
  G.hintsLeft = FREE_HINTS;
}

export function loadLevel(idx: number): void {
  idx = Math.max(0, Math.min(LEVEL_COUNT - 1, idx));
  const data = generateLevel(idx);
  G.daily = false;
  G.level = idx;
  G.cap = data.capacity;
  G.par = data.par;
  G.tubes = cloneTubes(data.tubes);
  G.start = cloneTubes(data.tubes);
  resetRun();
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
  if (idx === 0 && !Store.data.tutorialDone) maybeStartTutorial();
}

export function loadDailyChallenge(): void {
  const data = dailyBoard();
  G.daily = true;
  G.level = 0;
  G.cap = data.capacity;
  G.par = data.par;
  G.tubes = cloneTubes(data.tubes);
  G.start = cloneTubes(data.tubes);
  resetRun();
  computeLayout();
  updateHUD();
  showScreen('play');
  startTiming();
  startLoop();
  Platform.onGameplayStart();
}

export function restartLevel(): void {
  G.tubes = cloneTubes(G.start);
  resetRun();
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
  G.anim = { type: 'pour', s, d, color, count: amt, pre, t0: performance.now(), dur: G.motion ? 500 : 1 };
  AudioEngine.pour();
  Haptics.pour();
  updateHUD();
  startLoop();
  return true;
}

export function finishPour(): void {
  const a = G.anim;
  G.anim = null;
  G.locked = false;
  if (!a) return;
  // Landing bounce on the destination once the shards have settled.
  if (G.motion) { G.settleI = a.d; G.settleT = performance.now(); }
  const dt = G.tubes[a.d];
  const completed = dt.length === G.cap && G.tubes[a.d].every((c) => c === G.tubes[a.d][0]);
  if (completed) {
    spawnComplete(a.d);
    AudioEngine.complete();
    Haptics.complete();
  } else {
    spawnLand(a.d, a.color);
  }
  if (isSolved(G.tubes, G.cap)) onWin();
  else { markDirty(); if (isTutorialActive()) tutorialOnPour(); }
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

// Reveals the best next move. Returns false when no move exists.
export function doHint(): boolean {
  if (G.locked) return true;
  const h = findHint(G.tubes, G.cap);
  if (!h) { toast('No moves — try Undo or Restart'); AudioEngine.invalid(); return false; }
  G.hintMove = h;
  G.hintTimer = performance.now();
  G.selected = -1;
  AudioEngine.button();
  markDirty();
  startLoop();
  return true;
}

export function grantHints(n: number): void {
  G.hintsLeft += n;
  updateHUD();
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

// Reward the "watch ad to double your shards" button on the win screen.
export function doubleWinShards(): boolean {
  if (lastWinDoubled || lastWinShards <= 0) return false;
  lastWinDoubled = true;
  addShards(lastWinShards);
  const sEl = document.getElementById('win-shards');
  if (sEl) sEl.textContent = `+${lastWinShards * 2}`;
  const btn = document.getElementById('win-double');
  if (btn) btn.setAttribute('hidden', '');
  updateMenuStars();
  updateHUD();
  AudioEngine.best();
  Haptics.complete();
  return true;
}

// Render a row of mini vials (next-level preview).
function renderMiniVials(container: HTMLElement, tubes: number[][], cap: number): void {
  const colors = pal();
  container.innerHTML = '';
  const show = tubes.slice(0, Math.min(tubes.length, 6));
  for (const t of show) {
    const v = document.createElement('div');
    v.className = 'np-vial';
    let acc = 0;
    for (const band of bandsOf(t)) {
      const seg = document.createElement('span');
      seg.style.bottom = `${(acc / cap) * 100}%`;
      seg.style.height = `${(band.units / cap) * 100}%`;
      seg.style.background = colors[band.color] ?? '#888';
      v.appendChild(seg);
      acc += band.units;
    }
    container.appendChild(v);
  }
}

function onWin(): void {
  stopTiming();
  G.selected = -1;
  G.hintMove = null;
  const stars = starsFor(G.moves, G.par);
  const rec = { moves: G.moves, stars, timeMs: Math.round(G.timeMs) };

  // ── Currency, streaks & persistence ─────────────────────
  Store.data.winStreak = (Store.data.winStreak ?? 0) + 1;
  let earned = 0;
  let isBest = false;
  let dailyStreak = 0;

  if (G.daily) {
    const r = recordChallengeWin(rec);
    earned = r.shards; // includes daily bonus + streak
    dailyStreak = r.streak;
    isBest = !r.firstToday && (Store.data.challenge.best?.moves ?? Infinity) >= G.moves;
  } else {
    const key = String(G.level);
    const prev = Store.data.best[key];
    const firstClear = !prev;
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
    earned = firstClear ? shardsForWin(stars) : 3; // replays give a small consolation
    addShards(earned);
  }
  Store.save();

  lastWinShards = earned;
  lastWinDoubled = false;

  // ── Feedback ────────────────────────────────────────────
  spawnCrystalRain();
  AudioEngine.win();
  Haptics.win();
  Platform.onGameplayStop();
  Platform.onLevelComplete(G.level + 1, rec);

  set('win-moves', String(G.moves));
  set('win-time', fmtTime(G.timeMs));
  set('win-shards', `+${earned}`);

  const starEls = document.querySelectorAll<HTMLElement>('#win-stars .s');
  starEls.forEach((e) => e.classList.remove('lit'));
  setTimeout(() => {
    starEls.forEach((e, i) => { if (i < stars) setTimeout(() => e.classList.add('lit'), i * 180); });
  }, 200);

  // Win-streak banner ("on fire" after 2+).
  const streakEl = document.getElementById('win-streak');
  if (streakEl) {
    const ws = Store.data.winStreak;
    if (G.daily && dailyStreak > 1) {
      streakEl.textContent = `🔥 ${dailyStreak}-day Daily streak!`;
      streakEl.removeAttribute('hidden');
    } else if (ws >= 2) {
      streakEl.textContent = `🔥 ${ws} wins in a row!`;
      streakEl.removeAttribute('hidden');
    } else {
      streakEl.setAttribute('hidden', '');
    }
  }

  const bestEl = document.getElementById('win-best');
  if (bestEl) {
    if (isBest) {
      bestEl.innerHTML = '<span class="best-badge">&#10022; New Best!</span>';
      setTimeout(() => { AudioEngine.best(); Platform.onHappyMoment(); }, 700);
    } else {
      const b = G.daily ? Store.data.challenge.best : Store.data.best[String(G.level)];
      bestEl.innerHTML = b ? `<span style="color:var(--ink-dim);font-size:13px">Best: ${b.moves} moves</span>` : '';
    }
  }

  // Double-shards rewarded button (only when ads are actually available).
  const dbl = document.getElementById('win-double');
  if (dbl) {
    if (Platform.hasRewardedAds() && earned > 0) dbl.removeAttribute('hidden');
    else dbl.setAttribute('hidden', '');
  }

  // Next-level preview + button visibility.
  const lastLevel = !G.daily && G.level >= LEVEL_COUNT - 1;
  const winNext = document.getElementById('win-next') as HTMLButtonElement | null;
  if (winNext) {
    winNext.style.display = lastLevel ? 'none' : '';
    winNext.textContent = G.daily ? 'Menu' : 'Next →';
  }
  const nextWrap = document.getElementById('win-next-wrap');
  if (nextWrap) {
    if (!G.daily && !lastLevel) {
      set('win-next-num', String(G.level + 2));
      const nv = document.getElementById('win-next-vials');
      if (nv) renderMiniVials(nv, generateLevel(G.level + 1).tubes, 4);
      nextWrap.removeAttribute('hidden');
    } else {
      nextWrap.setAttribute('hidden', '');
    }
  }

  const winTitle = document.getElementById('win-title');
  if (winTitle) {
    winTitle.textContent = G.daily
      ? 'Daily Solved!'
      : (lastLevel ? 'All Crystals Sorted!' : 'Sorted!');
  }

  // Light interstitial cadence between levels (gated by SDK availability).
  if (!G.daily && (G.level + 1) % 5 === 0) Platform.requestMidgameAdIfAvailable();

  setTimeout(() => openOverlay('win'), 360);
  updateMenuStars();
}

function set(id: string, text: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

export { isChallengeDoneToday };
