import { G } from '../game/state';
import { AudioEngine } from '../audio/engine';
import { Store } from '../store';
import { Platform } from '../platform';
import { LEVEL_COUNT } from '../render/colors';
import { pourAmount, topColor, isSolved } from '../core';
import { loadLevel, restartLevel, tryPour, undo, doHint, pauseGame, resumeFromPause } from '../game/flow';
import { startTiming, stopTiming } from '../game/timer';
import { doResize } from '../render/canvas';
import { startLoop, markDirty } from '../render/loop';
import { showScreen, openOverlay, closeOverlay, updateMenuStars } from './overlays';
import { applySettings } from './settings';
import { toast } from './toast';

export function buildLevelGrid(): void {
  const grid = document.getElementById('lvl-grid');
  if (!grid) return;
  grid.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (let i = 0; i < LEVEL_COUNT; i++) {
    const unlocked = i <= Store.data.maxUnlocked;
    const best = Store.data.best[String(i)];
    const el = document.createElement('button');
    el.className =
      'lvl' +
      (unlocked ? '' : ' locked') +
      (best ? ' cleared' : '') +
      (i === (Store.data.current ?? 0) ? ' current' : '');
    if (unlocked) {
      const stars = best ? best.stars : 0;
      el.innerHTML = `<span>${i + 1}</span><span class="st">${best ? '&#9733;'.repeat(stars) : ''}</span>`;
      if (best) el.title = `Best: ${best.moves} moves`;
      el.addEventListener('click', () => {
        AudioEngine.button();
        closeOverlay('levels');
        loadLevel(i);
      });
    } else {
      el.innerHTML = `<span class="lock">&#128274;</span>`;
    }
    frag.appendChild(el);
  }
  grid.appendChild(frag);
}

function getTubeAt(px: number, py: number): number {
  if (!G.layout) return -1;
  const pad = G.layout.vw * 0.32;
  for (let i = 0; i < G.layout.rects.length; i++) {
    const r = G.layout.rects[i];
    if (
      px >= r.x - pad && px <= r.x + r.w + pad &&
      py >= r.y - G.layout.vw * 0.6 && py <= r.y + r.h + G.layout.vw * 0.25
    ) return i;
  }
  return -1;
}

function shakeTube(i: number): void {
  G.shakeI = i;
  G.shakeT = performance.now();
  startLoop();
}

function handleTap(px: number, py: number): void {
  if (G.screen !== 'play' || G.locked) return;
  if (document.querySelector('.overlay.active')) return;
  const i = getTubeAt(px, py);
  if (i < 0) {
    if (G.selected >= 0) { G.selected = -1; AudioEngine.deselect(); markDirty(); }
    return;
  }
  if (G.selected < 0) {
    if (G.tubes[i].length > 0) { G.selected = i; G.hintMove = null; AudioEngine.select(); markDirty(); }
    return;
  }
  if (i === G.selected) { G.selected = -1; AudioEngine.deselect(); markDirty(); return; }
  const amt = pourAmount(G.tubes[G.selected], G.tubes[i], G.cap);
  if (amt > 0) { tryPour(G.selected, i); return; }
  const sameTop = topColor(G.tubes[G.selected]) === topColor(G.tubes[i]) && G.tubes[i].length > 0;
  if (sameTop) { AudioEngine.invalid(); shakeTube(i); }
  else if (G.tubes[i].length > 0) { G.selected = i; G.hintMove = null; AudioEngine.select(); markDirty(); }
  else { G.selected = -1; AudioEngine.deselect(); markDirty(); }
}

function canvasPoint(ev: PointerEvent | TouchEvent): { x: number; y: number } {
  const cvEl = document.getElementById('board') as HTMLCanvasElement;
  const rect = cvEl.getBoundingClientRect();
  let cx: number, cy: number;
  if ('touches' in ev && ev.touches[0]) {
    cx = ev.touches[0].clientX;
    cy = ev.touches[0].clientY;
  } else {
    cx = (ev as PointerEvent).clientX;
    cy = (ev as PointerEvent).clientY;
  }
  return { x: cx - rect.left, y: cy - rect.top };
}

export function initUI(): void {
  const cv = document.getElementById('board') as HTMLCanvasElement;

  cv.addEventListener('pointerdown', (ev) => {
    ev.preventDefault();
    AudioEngine.unlock();
    const p = canvasPoint(ev);
    handleTap(p.x, p.y);
  }, { passive: false });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());

  window.addEventListener('keydown', (ev) => {
    if (G.screen !== 'play') return;
    const anyOverlay = document.querySelector('.overlay.active');
    if (ev.key === 'Escape') {
      if (anyOverlay) {
        document.querySelectorAll<HTMLElement>('.overlay.active').forEach((o) => o.classList.remove('active'));
        if (G.screen === 'play') resumeFromPause();
      } else {
        pauseGame();
      }
      return;
    }
    if (anyOverlay) return;
    const n = parseInt(ev.key, 10);
    if (!isNaN(n) && n >= 1 && n <= 9 && G.layout) {
      const idx = n - 1;
      if (idx < G.tubes.length) {
        const r = G.layout.rects[idx];
        handleTap(r.x + r.w / 2, r.y + r.h / 2);
      }
      return;
    }
    if (ev.key === 'u' || ev.key === 'U') undo();
    else if (ev.key === 'h' || ev.key === 'H') doHint();
    else if (ev.key === 'r' || ev.key === 'R') restartLevel();
  }, { passive: true });

  // ── Menu ──────────────────────────────────────────────
  document.getElementById('btn-play')?.addEventListener('click', () => {
    AudioEngine.unlock(); AudioEngine.button(); loadLevel(0);
  });
  document.getElementById('btn-continue')?.addEventListener('click', () => {
    AudioEngine.unlock(); AudioEngine.button(); loadLevel(Store.data.current ?? 0);
  });
  document.getElementById('btn-levels')?.addEventListener('click', () => {
    AudioEngine.unlock(); AudioEngine.button(); buildLevelGrid(); openOverlay('levels');
  });
  document.getElementById('btn-howto')?.addEventListener('click', () => {
    AudioEngine.button(); openOverlay('howto');
  });
  document.getElementById('btn-settings')?.addEventListener('click', () => {
    AudioEngine.button(); applySettings(); openOverlay('settings');
  });

  // ── Generic close buttons ──────────────────────────────
  document.querySelectorAll<HTMLElement>('[data-close]').forEach((b) => {
    b.addEventListener('click', () => {
      AudioEngine.button();
      closeOverlay(b.getAttribute('data-close')!);
    });
  });

  // ── In-game HUD ────────────────────────────────────────
  document.getElementById('btn-pause')?.addEventListener('click', () => { AudioEngine.button(); pauseGame(); });
  document.getElementById('btn-undo')?.addEventListener('click', () => { undo(); });
  document.getElementById('btn-hint')?.addEventListener('click', () => { doHint(); });
  document.getElementById('btn-restart')?.addEventListener('click', () => { AudioEngine.button(); restartLevel(); });

  // ── Pause menu ─────────────────────────────────────────
  document.getElementById('pz-resume')?.addEventListener('click', () => { AudioEngine.button(); resumeFromPause(); });
  document.getElementById('pz-restart')?.addEventListener('click', () => {
    AudioEngine.button(); closeOverlay('pause'); restartLevel(); Platform.onGameplayStart();
  });
  document.getElementById('pz-levels')?.addEventListener('click', () => {
    AudioEngine.button(); closeOverlay('pause'); stopTiming();
    showScreen('menu'); updateMenuStars(); buildLevelGrid(); openOverlay('levels');
  });
  document.getElementById('pz-settings')?.addEventListener('click', () => {
    AudioEngine.button(); applySettings(); openOverlay('settings');
  });
  document.getElementById('pz-menu')?.addEventListener('click', () => {
    AudioEngine.button(); closeOverlay('pause'); stopTiming();
    Platform.onGameplayStop(); showScreen('menu'); updateMenuStars();
  });

  // ── Win panel ──────────────────────────────────────────
  document.getElementById('win-replay')?.addEventListener('click', () => {
    AudioEngine.button(); closeOverlay('win'); loadLevel(G.level);
  });
  document.getElementById('win-next')?.addEventListener('click', () => {
    AudioEngine.button(); closeOverlay('win');
    loadLevel(Math.min(LEVEL_COUNT - 1, G.level + 1));
  });
  document.getElementById('win-levels')?.addEventListener('click', () => {
    AudioEngine.button(); closeOverlay('win');
    showScreen('menu'); updateMenuStars(); buildLevelGrid(); openOverlay('levels');
  });

  // ── Settings toggles ───────────────────────────────────
  function bindToggle(id: string, getter: () => boolean, setter: (v: boolean) => void): void {
    const el = document.getElementById(id);
    if (!el) return;
    const act = () => { setter(!getter()); Store.save(); applySettings(); AudioEngine.button(); };
    el.addEventListener('click', act);
    el.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
    });
  }
  bindToggle('tg-sound', () => Store.data.settings.sound, (v) => { Store.data.settings.sound = v; });
  bindToggle('tg-motion', () => !Store.data.settings.motion, (v) => { Store.data.settings.motion = !v; });
  bindToggle('tg-symbols', () => Store.data.settings.symbols, (v) => { Store.data.settings.symbols = v; });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    AudioEngine.button();
    if (confirm('Reset all progress and best scores? This cannot be undone.')) {
      const keepSettings = Store.data.settings;
      Store.data = Store._default();
      Store.data.settings = keepSettings;
      Store.save();
      updateMenuStars();
      buildLevelGrid();
      toast('Progress reset');
    }
  });

  // ── Resize & lifecycle ─────────────────────────────────
  window.addEventListener('resize', doResize);
  window.addEventListener('orientationchange', () => setTimeout(doResize, 250));
  window.visualViewport?.addEventListener('resize', doResize);
  try { new ResizeObserver(doResize).observe(document.getElementById('board-wrap')!); } catch { /* ignore */ }

  document.addEventListener('gesturestart', (e) => e.preventDefault());
  let _lastTouch = 0;
  document.addEventListener('touchend', (e) => {
    const n = Date.now();
    if (n - _lastTouch < 300) e.preventDefault();
    _lastTouch = n;
  }, { passive: false });
  document.addEventListener('touchmove', (e) => {
    if (e.touches.length > 1) e.preventDefault();
  }, { passive: false });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stopTiming();
      Platform.onGameplayStop();
    } else if (G.screen === 'play' && !document.querySelector('.overlay.active') && !isSolved(G.tubes, G.cap)) {
      startTiming();
      Platform.onGameplayStart();
      startLoop();
    }
  });
}
