export const LEVEL_COUNT = 150;

// Vivid jewel-tone palette — saturated gem colors that pop on a dark background.
export const PALETTE: readonly string[] = [
  '#ff3333', // Ruby
  '#ff7722', // Fire Opal
  '#ffcc00', // Topaz
  '#44ee77', // Peridot
  '#00cc55', // Emerald
  '#00ccbb', // Aquamarine
  '#2288ff', // Sapphire
  '#6655ff', // Tanzanite
  '#aa44ff', // Amethyst
  '#ff44aa', // Rose Quartz
  '#22ddee', // Blue Topaz
  '#ff8833', // Citrine
];

export function hexToRgb(h: string): { r: number; g: number; b: number } {
  const n = parseInt(h.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

// ── Active skin state ─────────────────────────────────────
// The rendered crystal colours and glass tint can be re-skinned by cosmetics.
// Renderers read these via pal()/glassStops() so a skin change is instant.
let ACTIVE_PALETTE: string[] = [...PALETTE];
let ACTIVE_GLASS: [string, string, string] = [
  'rgba(160,130,255,0.11)', 'rgba(255,255,255,0.07)', 'rgba(100,80,200,0.13)',
];

export function pal(): string[] { return ACTIVE_PALETTE; }
export function glassStops(): [string, string, string] { return ACTIVE_GLASS; }

export function setActiveSkin(
  glass: [string, string, string],
  transform?: (rgb: [number, number, number]) => [number, number, number],
): void {
  ACTIVE_GLASS = glass;
  if (!transform) { ACTIVE_PALETTE = [...PALETTE]; return; }
  ACTIVE_PALETTE = PALETTE.map((hex) => {
    const { r, g, b } = hexToRgb(hex);
    const [nr, ng, nb] = transform([r / 255, g / 255, b / 255]);
    const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * 255)));
    return `rgb(${c(nr)},${c(ng)},${c(nb)})`;
  });
}

export function shade(hex: string, amt: number): string {
  const c = hexToRgb(hex);
  const f = amt < 0 ? 0 : 255;
  const t = Math.abs(amt);
  const mix = (x: number) => Math.round(x + (f - x) * t);
  return `rgb(${mix(c.r)},${mix(c.g)},${mix(c.b)})`;
}

export function rgba(hex: string, a: number): string {
  const c = hexToRgb(hex);
  return `rgba(${c.r},${c.g},${c.b},${a})`;
}
