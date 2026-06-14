// Applies the player's chosen cosmetics: vial skin → canvas palette/glass,
// background theme → DOM. Call after load, after a purchase/equip, and after a
// cloud sync.

import { Store } from '../store';
import { setActiveSkin } from '../render/colors';
import { markDirty } from '../render/loop';
import { skinById, themeById } from './cosmetics';

export function applyCosmetics(): void {
  const skin = skinById(Store.data.cosmetics.skin);
  setActiveSkin(skin.glass, skin.transform);

  const theme = themeById(Store.data.cosmetics.theme);
  const app = document.getElementById('app');
  const aurora = document.getElementById('aurora');
  if (app) app.style.background = theme.appBg;
  if (aurora) aurora.style.background = theme.aurora;

  markDirty();
}
