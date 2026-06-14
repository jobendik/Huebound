export const LEVEL_COUNT = 150;

// Jewel-tone palette — each color represents a distinct gemstone.
export const PALETTE: readonly string[] = [
  '#e53e3e', // Ruby
  '#dd6b20', // Fire Opal
  '#d69e2e', // Amber
  '#68d391', // Peridot
  '#38a169', // Emerald
  '#319795', // Aquamarine
  '#3182ce', // Sapphire
  '#5a67d8', // Tanzanite
  '#805ad5', // Amethyst
  '#b83280', // Rhodolite
  '#4fd1c5', // Blue Topaz
  '#c05621', // Hessonite
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
