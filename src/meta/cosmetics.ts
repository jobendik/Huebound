// Cosmetics — vial/crystal skins and background themes the player unlocks with
// shards. Pure data + a couple of pure helpers; rendering reads the active skin
// from here. Designed so adding a new cosmetic is a one-line catalog entry.

export interface SkinDef {
  id: string;
  name: string;
  price: number;
  // A multiplicative tint applied to every gem colour (r,g,b in 0..1) plus a
  // glass-tint hue. `null` palette = the default vivid jewel palette.
  glass: [string, string, string]; // 3-stop glass gradient (left, mid, right)
  // Optional per-channel colour transform for the crystals.
  transform?: (rgb: [number, number, number]) => [number, number, number];
  swatch: string; // representative colour for the shop tile
}

export interface ThemeDef {
  id: string;
  name: string;
  price: number;
  // CSS background for #app and the aurora tint.
  appBg: string;
  aurora: string;
  swatch: string;
}

export const SKINS: SkinDef[] = [
  {
    id: 'skin-classic',
    name: 'Crystal',
    price: 0,
    glass: ['rgba(160,130,255,0.11)', 'rgba(255,255,255,0.07)', 'rgba(100,80,200,0.13)'],
    swatch: 'linear-gradient(135deg,#ff3333,#2288ff)',
  },
  {
    id: 'skin-frost',
    name: 'Frostglass',
    price: 120,
    glass: ['rgba(120,200,255,0.14)', 'rgba(255,255,255,0.10)', 'rgba(80,160,230,0.16)'],
    transform: ([r, g, b]) => [r * 0.78 + 0.16, g * 0.86 + 0.12, b * 0.95 + 0.05],
    swatch: 'linear-gradient(135deg,#bde7ff,#5aa0ff)',
  },
  {
    id: 'skin-neon',
    name: 'Neon Lumen',
    price: 220,
    glass: ['rgba(0,255,200,0.14)', 'rgba(255,255,255,0.08)', 'rgba(255,0,200,0.14)'],
    transform: ([r, g, b]) => {
      const mx = Math.max(r, g, b);
      // Push toward saturated neon by boosting the dominant channel.
      return [Math.min(1, r * 1.15 + (r === mx ? 0.1 : 0)),
        Math.min(1, g * 1.15 + (g === mx ? 0.1 : 0)),
        Math.min(1, b * 1.15 + (b === mx ? 0.1 : 0))];
    },
    swatch: 'linear-gradient(135deg,#00ffc8,#ff00c8)',
  },
  {
    id: 'skin-gold',
    name: 'Molten Gold',
    price: 320,
    glass: ['rgba(255,200,90,0.16)', 'rgba(255,255,255,0.10)', 'rgba(200,120,30,0.16)'],
    transform: ([r, g, b]) => {
      const l = 0.30 * r + 0.59 * g + 0.11 * b;
      // Sepia/amber tint while keeping per-colour distinction via luminance.
      return [Math.min(1, l * 1.05 + 0.18), Math.min(1, l * 0.82 + 0.06 + g * 0.12), Math.min(1, l * 0.42)];
    },
    swatch: 'linear-gradient(135deg,#ffd86b,#b9711f)',
  },
];

export const THEMES: ThemeDef[] = [
  {
    id: 'theme-cave',
    name: 'Violet Cave',
    price: 0,
    appBg: 'radial-gradient(120% 80% at 10% -10%, rgba(120,48,248,0.55), transparent 60%), radial-gradient(110% 90% at 90% 6%, rgba(24,214,204,0.18), transparent 55%), radial-gradient(130% 110% at 50% 116%, rgba(190,38,255,0.20), transparent 55%), linear-gradient(165deg,#11072f,#050211 72%)',
    aurora: 'radial-gradient(36% 36% at 26% 30%, rgba(138,90,255,0.40), transparent 70%), radial-gradient(44% 44% at 74% 64%, rgba(34,214,198,0.22), transparent 70%), radial-gradient(28% 28% at 54% 88%, rgba(214,48,255,0.18), transparent 70%)',
    swatch: 'linear-gradient(135deg,#7c3cf8,#2ed6cc)',
  },
  {
    id: 'theme-ember',
    name: 'Ember Forge',
    price: 150,
    appBg: 'radial-gradient(120% 80% at 12% -10%, rgba(255,110,40,0.5), transparent 60%), radial-gradient(110% 90% at 88% 6%, rgba(255,200,40,0.16), transparent 55%), radial-gradient(130% 110% at 50% 116%, rgba(220,30,80,0.22), transparent 55%), linear-gradient(165deg,#260d10,#0a0304 72%)',
    aurora: 'radial-gradient(36% 36% at 28% 30%, rgba(255,120,40,0.40), transparent 70%), radial-gradient(44% 44% at 74% 64%, rgba(255,60,90,0.22), transparent 70%)',
    swatch: 'linear-gradient(135deg,#ff7a28,#ff3c5a)',
  },
  {
    id: 'theme-abyss',
    name: 'Deep Abyss',
    price: 150,
    appBg: 'radial-gradient(120% 80% at 12% -10%, rgba(30,120,255,0.5), transparent 60%), radial-gradient(110% 90% at 88% 6%, rgba(40,230,210,0.16), transparent 55%), radial-gradient(130% 110% at 50% 116%, rgba(40,80,255,0.22), transparent 55%), linear-gradient(165deg,#04122a,#01060f 72%)',
    aurora: 'radial-gradient(36% 36% at 28% 30%, rgba(40,140,255,0.40), transparent 70%), radial-gradient(44% 44% at 74% 64%, rgba(40,230,210,0.22), transparent 70%)',
    swatch: 'linear-gradient(135deg,#1e78ff,#28e6d2)',
  },
  {
    id: 'theme-rose',
    name: 'Rose Nebula',
    price: 200,
    appBg: 'radial-gradient(120% 80% at 12% -10%, rgba(255,80,200,0.5), transparent 60%), radial-gradient(110% 90% at 88% 6%, rgba(150,80,255,0.18), transparent 55%), radial-gradient(130% 110% at 50% 116%, rgba(120,40,255,0.22), transparent 55%), linear-gradient(165deg,#1f0a26,#0a0410 72%)',
    aurora: 'radial-gradient(36% 36% at 28% 30%, rgba(255,90,190,0.40), transparent 70%), radial-gradient(44% 44% at 74% 64%, rgba(150,90,255,0.22), transparent 70%)',
    swatch: 'linear-gradient(135deg,#ff50c8,#9650ff)',
  },
];

export function skinById(id: string): SkinDef {
  return SKINS.find((s) => s.id === id) ?? SKINS[0];
}
export function themeById(id: string): ThemeDef {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
