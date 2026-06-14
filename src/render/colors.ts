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
