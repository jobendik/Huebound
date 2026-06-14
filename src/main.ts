import { Store } from './store';
import { Platform } from './platform';
import { G } from './game/state';
import { applySettings } from './ui/settings';
import { applyCosmetics } from './meta/apply';
import { rollChallenge } from './meta/economy';
import { ensureObjectives } from './meta/objectives';
import { showScreen, updateMenuStars } from './ui/overlays';
import { maybeShowDailyReward } from './ui/daily';
import { doResize } from './render/canvas';
import { initUI, buildLevelGrid } from './ui';
import './styles/main.css';

function init(): void {
  if (import.meta.env.DEV) (window as unknown as { __G: typeof G }).__G = G;
  Store.load();
  G.shakeI = -1;
  G.shakeT = 0;
  applySettings();
  applyCosmetics();
  rollChallenge();
  ensureObjectives();
  Platform.init();
  // When the SDK is ready, pull cloud progress and refresh the menu.
  Platform.whenReady(() => {
    if (Store.syncFromCloud()) { applyCosmetics(); buildLevelGrid(); }
    updateMenuStars();
  });
  updateMenuStars();
  showScreen('menu');
  doResize();
  initUI();
  Platform.loadingFinished();
  maybeShowDailyReward();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
