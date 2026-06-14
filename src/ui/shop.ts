import { Store } from '../store';
import { AudioEngine } from '../audio/engine';
import { Haptics } from '../platform/haptics';
import { SKINS, THEMES } from '../meta/cosmetics';
import type { SkinDef, ThemeDef } from '../meta/cosmetics';
import { applyCosmetics } from '../meta/apply';
import { updateMenuStars } from './overlays';
import { toast } from './toast';

function owns(id: string): boolean {
  return Store.data.cosmetics.owned.includes(id);
}

function tile(item: SkinDef | ThemeDef, kind: 'skin' | 'theme'): HTMLElement {
  const active = kind === 'skin' ? Store.data.cosmetics.skin : Store.data.cosmetics.theme;
  const owned = owns(item.id);
  const equipped = active === item.id;

  const el = document.createElement('button');
  el.className = 'shop-item' + (equipped ? ' equipped' : '') + (owned ? ' owned' : '');
  el.innerHTML =
    `<span class="swatch" style="background:${item.swatch}"></span>` +
    `<span class="si-name">${item.name}</span>` +
    `<span class="si-cta">${equipped ? 'Equipped' : owned ? 'Equip' : `&#9670; ${item.price}`}</span>`;

  el.addEventListener('click', () => {
    if (equipped) return;
    if (owned) {
      if (kind === 'skin') Store.data.cosmetics.skin = item.id;
      else Store.data.cosmetics.theme = item.id;
      Store.save();
      applyCosmetics();
      AudioEngine.button();
      Haptics.select();
      buildShop();
      return;
    }
    // Purchase
    if ((Store.data.shards ?? 0) < item.price) {
      toast('Not enough shards — keep solving!');
      AudioEngine.invalid();
      Haptics.invalid();
      return;
    }
    Store.data.shards -= item.price;
    Store.data.cosmetics.owned.push(item.id);
    if (kind === 'skin') Store.data.cosmetics.skin = item.id;
    else Store.data.cosmetics.theme = item.id;
    Store.save();
    applyCosmetics();
    AudioEngine.best();
    Haptics.complete();
    toast(`Unlocked ${item.name}!`);
    buildShop();
    updateMenuStars();
  });
  return el;
}

export function buildShop(): void {
  const shardsEl = document.getElementById('shop-shards');
  if (shardsEl) shardsEl.textContent = String(Store.data.shards ?? 0);

  const skinGrid = document.getElementById('shop-skins');
  if (skinGrid) {
    skinGrid.innerHTML = '';
    SKINS.forEach((s) => skinGrid.appendChild(tile(s, 'skin')));
  }
  const themeGrid = document.getElementById('shop-themes');
  if (themeGrid) {
    themeGrid.innerHTML = '';
    THEMES.forEach((t) => themeGrid.appendChild(tile(t, 'theme')));
  }
}
