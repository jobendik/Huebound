import { G } from '../game/state';
import { wrapEl } from './canvas';

export function computeLayout(): void {
  const rect = wrapEl.getBoundingClientRect();
  const W = rect.width, H = rect.height;
  const n = G.tubes.length, cap = G.cap;
  if (W <= 0 || H <= 0 || n === 0) { G.layout = null; return; }

  const padX = 10, padY = 10;
  const availW = W - padX * 2, availH = H - padY * 2;
  let best: { rows: number; cols: number; vw: number; gapY: number } | null = null;

  for (let rows = 1; rows <= 3; rows++) {
    const cols = Math.ceil(n / rows);
    const gapY = Math.max(14, availH * 0.04);
    let vw = Math.min((availW - Math.max(8, availW * 0.02) * (cols - 1)) / cols * 0.9, 92);
    const vhFromW = vw * 0.92 * cap + vw * 0.55;
    const cellH = (availH - gapY * (rows - 1)) / rows;
    if (vhFromW > cellH * 0.96) vw = (cellH * 0.96) / (0.92 * cap + 0.55);
    vw = Math.min(vw, 96);
    if (vw < 16) continue;
    if (!best || vw > best.vw) best = { rows, cols, vw, gapY };
  }
  if (!best) best = { rows: Math.ceil(n / 4), cols: 4, vw: 28, gapY: 14 };

  const { rows, cols, vw, gapY } = best;
  const unitH = vw * 0.92;
  const innerPad = Math.max(3, vw * 0.07);
  const vialH = unitH * cap + vw * 0.55;
  const gapX = Math.max(8, (availW - cols * vw) / (cols + 1));
  const gridH = rows * vialH + (rows - 1) * gapY;
  const startY = padY + Math.max(0, (availH - gridH) / 2);
  const rects = [];

  for (let i = 0; i < n; i++) {
    const r = Math.floor(i / cols), c = i % cols;
    const itemsInRow = r === rows - 1 ? n - r * cols : cols;
    const rowW = itemsInRow * vw + (itemsInRow - 1) * gapX;
    const rowStartX = padX + (availW - rowW) / 2;
    rects.push({
      x: rowStartX + c * (vw + gapX),
      y: startY + r * (vialH + gapY),
      w: vw,
      h: vialH,
      unitH,
      innerPad,
    });
  }

  G.layout = { rects, vw, unitH, vialH, rows, cols };
}
