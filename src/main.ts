import { Store } from './store';
import { Platform } from './platform';
import { G } from './game/state';
import { applySettings } from './ui/settings';
import { showScreen, updateMenuStars } from './ui/overlays';
import { doResize } from './render/canvas';
import { initUI } from './ui';
import './styles/main.css';

function init(): void {
  if (import.meta.env.DEV) (window as unknown as { __G: typeof G }).__G = G;
  Store.load();
  G.shakeI = -1;
  G.shakeT = 0;
  applySettings();
  Platform.init();
  updateMenuStars();
  showScreen('menu');
  doResize();
  initUI();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
