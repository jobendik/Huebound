import { G } from '../game/state';
import { PALETTE, rgba } from './colors';
import { ctx } from './canvas';
import { computeLayout } from './layout';
import type { AnimState, AnimProgress, Band, VialRect } from '../types';
import { isMonochrome } from '../core';

export const easeInOut = (t: number): number =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t);

export function bandsOf(tube: number[]): Band[] {
  const out: Band[] = [];
  for (const c of tube) {
    if (out.length && out[out.length - 1].color === c) out[out.length - 1].units++;
    else out.push({ color: c, units: 1 });
  }
  return out;
}

function roundRectPath(
  c: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  rTop: number, rBot: number,
): void {
  c.beginPath();
  c.moveTo(x + rTop, y);
  c.lineTo(x + w - rTop, y);
  c.quadraticCurveTo(x + w, y, x + w, y + rTop);
  c.lineTo(x + w, y + h - rBot);
  c.quadraticCurveTo(x + w, y + h, x + w - rBot, y + h);
  c.lineTo(x + rBot, y + h);
  c.quadraticCurveTo(x, y + h, x, y + h - rBot);
  c.lineTo(x, y + rTop);
  c.quadraticCurveTo(x, y, x + rTop, y);
  c.closePath();
}

// Accessibility symbols drawn on top of crystal bands.
function drawSymbol(colorIdx: number, cx: number, cy: number, r: number): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.fillStyle = 'rgba(255,255,255,0.50)';
  ctx.lineWidth = Math.max(1, r * 0.18);
  const s = colorIdx % 12;
  ctx.beginPath();
  switch (s) {
    case 0: ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2); ctx.stroke(); break;
    case 1: ctx.rect(cx - r * 0.6, cy - r * 0.6, r * 1.2, r * 1.2); ctx.stroke(); break;
    case 2: ctx.moveTo(cx, cy - r * 0.75); ctx.lineTo(cx + r * 0.7, cy + r * 0.6); ctx.lineTo(cx - r * 0.7, cy + r * 0.6); ctx.closePath(); ctx.stroke(); break;
    case 3: ctx.moveTo(cx, cy - r * 0.8); ctx.lineTo(cx + r * 0.7, cy); ctx.lineTo(cx, cy + r * 0.8); ctx.lineTo(cx - r * 0.7, cy); ctx.closePath(); ctx.stroke(); break;
    case 4: ctx.moveTo(cx - r * 0.7, cy); ctx.lineTo(cx + r * 0.7, cy); ctx.moveTo(cx, cy - r * 0.7); ctx.lineTo(cx, cy + r * 0.7); ctx.stroke(); break;
    case 5: ctx.moveTo(cx - r * 0.6, cy - r * 0.6); ctx.lineTo(cx + r * 0.6, cy + r * 0.6); ctx.moveTo(cx + r * 0.6, cy - r * 0.6); ctx.lineTo(cx - r * 0.6, cy + r * 0.6); ctx.stroke(); break;
    case 6: ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2); ctx.fill(); break;
    case 7: for (let k = 0; k < 6; k++) { const a = (Math.PI / 3) * k - Math.PI / 2; const px = cx + Math.cos(a) * r * 0.7, py = cy + Math.sin(a) * r * 0.7; if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); ctx.stroke(); break;
    case 8: for (let k = 0; k < 10; k++) { const rr = k % 2 === 0 ? r * 0.78 : r * 0.34; const a = (Math.PI / 5) * k - Math.PI / 2; const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr; if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); ctx.stroke(); break;
    case 9: ctx.arc(cx, cy, r * 0.68, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, r * 0.28, 0, Math.PI * 2); ctx.fill(); break;
    case 10: ctx.moveTo(cx - r * 0.7, cy + r * 0.5); ctx.lineTo(cx + r * 0.7, cy - r * 0.5); ctx.moveTo(cx - r * 0.7, cy - r * 0.5); ctx.lineTo(cx + r * 0.7, cy + r * 0.5); ctx.stroke(); break;
    default: ctx.moveTo(cx - r * 0.7, cy); ctx.lineTo(cx + r * 0.7, cy); ctx.stroke(); break;
  }
  ctx.restore();
}

// Crystal band — faceted gemstone appearance instead of smooth liquid.
function drawCrystalBand(
  innerX: number, top: number, innerW: number, hpx: number,
): void {
  // Diagonal facet gradient — top-left bright, bottom-right dark.
  const facetGrad = ctx.createLinearGradient(innerX, top, innerX + innerW, top + hpx);
  facetGrad.addColorStop(0, 'rgba(255,255,255,0.30)');
  facetGrad.addColorStop(0.22, 'rgba(255,255,255,0.12)');
  facetGrad.addColorStop(0.58, 'rgba(0,0,0,0.04)');
  facetGrad.addColorStop(1, 'rgba(0,0,0,0.26)');
  ctx.fillStyle = facetGrad;
  ctx.fillRect(innerX, top, innerW, hpx + 0.6);

  // Left-facet highlight strip.
  const lw = innerW * 0.13;
  const leftGrad = ctx.createLinearGradient(innerX, 0, innerX + lw, 0);
  leftGrad.addColorStop(0, 'rgba(255,255,255,0.26)');
  leftGrad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = leftGrad;
  ctx.fillRect(innerX, top, lw, hpx);

  // Bright crystal-edge highlight at top of each band.
  const edgeH = Math.min(2.5, hpx * 0.22);
  const edgeGrad = ctx.createLinearGradient(innerX, 0, innerX + innerW, 0);
  edgeGrad.addColorStop(0, 'rgba(255,255,255,0.65)');
  edgeGrad.addColorStop(0.55, 'rgba(255,255,255,0.38)');
  edgeGrad.addColorStop(1, 'rgba(255,255,255,0.10)');
  ctx.fillStyle = edgeGrad;
  ctx.fillRect(innerX, top, innerW, edgeH);

  // Subtle diagonal striation lines (crystal planes).
  if (hpx > 10) {
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 0.6;
    const numLines = Math.min(3, Math.floor(hpx / 12));
    for (let j = 1; j <= numLines; j++) {
      const ly = top + (j / (numLines + 1)) * hpx;
      ctx.beginPath();
      ctx.moveTo(innerX, ly + 1);
      ctx.lineTo(innerX + innerW, ly);
      ctx.stroke();
    }
  }
}

interface DrawVialOpts {
  selected?: boolean;
  completed?: boolean;
  hintFrom?: boolean;
  hintTo?: boolean;
  lift?: number;
  dx?: number;
  pulse?: number;
}

export function drawVial(rect: VialRect, bands: Band[], opts: DrawVialOpts = {}): void {
  const { x: bx, y, w, h, unitH, innerPad } = rect;
  const x = bx + (opts.dx ?? 0);
  const lift = opts.lift ?? 0;
  const rimH = w * 0.16;
  const bodyY = y - lift + rimH * 0.5;
  const bodyH = h - rimH * 0.5;
  const rTop = w * 0.18, rBot = w * 0.46;
  const innerX = x + innerPad, innerW = w - innerPad * 2;
  const innerBottom = (y - lift) + h - innerPad;

  ctx.save();

  // Glass body fill.
  roundRectPath(ctx, x, bodyY, w, bodyH, rTop, rBot);
  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  ctx.fill();

  // Crystal layers — clipped to inner tube.
  ctx.save();
  roundRectPath(ctx, innerX, bodyY + innerPad * 0.4, innerW, bodyH - innerPad * 0.8, rTop * 0.7, rBot * 0.92);
  ctx.clip();
  let acc = 0;
  for (let bi = 0; bi < bands.length; bi++) {
    const band = bands[bi];
    if (band.units <= 0) continue;
    const hpx = band.units * unitH;
    const top = innerBottom - (acc + band.units) * unitH;
    const col = PALETTE[band.color] ?? '#888';

    // Base solid fill.
    ctx.fillStyle = col;
    ctx.fillRect(innerX, top, innerW, hpx + 0.6);

    // Crystal facet overlay.
    drawCrystalBand(innerX, top, innerW, hpx);

    acc += band.units;
  }

  // Separator lines between layers — sharp crystal cuts.
  const totalUnits = acc;
  ctx.strokeStyle = 'rgba(0,0,0,0.22)';
  ctx.lineWidth = 1;
  for (let u = 1; u < totalUnits - 0.001; u++) {
    const yy = innerBottom - u * unitH;
    ctx.beginPath();
    ctx.moveTo(innerX, yy);
    ctx.lineTo(innerX + innerW, yy);
    ctx.stroke();
  }

  // Accessibility symbols.
  if (G.symbols) {
    acc = 0;
    for (const band of bands) {
      let rem = band.units;
      while (rem >= 0.6) {
        const cyc = innerBottom - (acc + 0.5) * unitH;
        drawSymbol(band.color, innerX + innerW / 2, cyc, unitH * 0.34);
        acc += 1;
        rem -= 1;
      }
      if (rem > 0) acc += rem;
    }
  }
  ctx.restore();

  // Glass gloss streak.
  ctx.save();
  roundRectPath(ctx, x, bodyY, w, bodyH, rTop, rBot);
  ctx.clip();
  const gg = ctx.createLinearGradient(x, 0, x + w, 0);
  gg.addColorStop(0, 'rgba(255,255,255,0.20)');
  gg.addColorStop(0.16, 'rgba(255,255,255,0.05)');
  gg.addColorStop(0.5, 'rgba(255,255,255,0)');
  gg.addColorStop(0.86, 'rgba(255,255,255,0.02)');
  gg.addColorStop(1, 'rgba(255,255,255,0.11)');
  ctx.fillStyle = gg;
  ctx.fillRect(x, bodyY, w, bodyH);
  ctx.restore();

  // Outline / glow.
  let stroke = 'rgba(255,255,255,0.30)', lw = Math.max(1.5, w * 0.035), glow = 0, glowCol = '';
  if (opts.completed) { stroke = rgba('#ffd35c', 0.95); glow = 12; glowCol = 'rgba(255,211,92,0.8)'; }
  if (opts.hintTo) { stroke = rgba('#5fe1a0', 0.95); glow = 16; glowCol = 'rgba(95,225,160,0.9)'; }
  if (opts.hintFrom) { stroke = rgba('#3fd3c8', 0.95); glow = 16; glowCol = 'rgba(63,211,200,0.9)'; }
  if (opts.selected) { stroke = 'rgba(255,255,255,0.95)'; glow = 18; glowCol = 'rgba(159,143,255,0.95)'; }
  if (opts.pulse) glow += opts.pulse;

  roundRectPath(ctx, x, bodyY, w, bodyH, rTop, rBot);
  if (glow) { ctx.shadowColor = glowCol || 'rgba(159,143,255,0.9)'; ctx.shadowBlur = glow; }
  ctx.lineWidth = lw;
  ctx.strokeStyle = stroke;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Rim (neck of tube).
  ctx.beginPath();
  ctx.ellipse(x + w / 2, bodyY, w / 2 - 1, rimH * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(8,4,20,0.55)';
  ctx.fill();
  ctx.lineWidth = Math.max(1.4, w * 0.03);
  ctx.strokeStyle = opts.selected ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.38)';
  ctx.stroke();

  // Checkmark when vial is complete.
  if (opts.completed) {
    const ccx = x + w / 2, ccy = (y - lift) + h * 0.52;
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.lineWidth = Math.max(2, w * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ccx - w * 0.16, ccy);
    ctx.lineTo(ccx - w * 0.03, ccy + w * 0.13);
    ctx.lineTo(ccx + w * 0.2, ccy - w * 0.16);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }
  ctx.restore();
}

// Crystal shard pour — individual faceted gems fall along a bezier arc.
export function drawCrystalStream(a: AnimState, ap: AnimProgress): void {
  const { rects, vw } = G.layout!;
  const sr = rects[a.s], dr = rects[a.d];
  const liftAmt = vw * 0.5;
  const dir = dr.x >= sr.x ? 1 : -1;
  const srcDx = dir * vw * 0.18 * ap.liftEnv;

  const spoutX = sr.x + srcDx + sr.w / 2 + dir * sr.w * 0.32;
  const spoutY = sr.y - liftAmt * ap.liftEnv + sr.w * 0.12;
  const dstUnits = a.pre[a.d].length + a.count * ap.tfrac;
  const innerBottom = dr.y + dr.h - dr.innerPad;
  const dstTopY = Math.max(dr.y + dr.w * 0.2, innerBottom - dstUnits * dr.unitH);
  const mouthX = dr.x + dr.w / 2;
  const ctrlX = (spoutX + mouthX) / 2;
  const ctrlY = Math.min(spoutY, dstTopY) - vw * 0.18;

  const col = PALETTE[a.color] ?? '#fff';
  const numShards = 7;

  for (let k = 0; k < numShards; k++) {
    const t = clamp01(ap.tfrac - k * 0.07);
    if (t <= 0) continue;

    // Bezier position for this shard.
    const bx = (1 - t) * (1 - t) * spoutX + 2 * (1 - t) * t * ctrlX + t * t * mouthX;
    const by = (1 - t) * (1 - t) * spoutY + 2 * (1 - t) * t * ctrlY + t * t * dstTopY;

    const shardSize = vw * (0.075 + (numShards - k) * 0.008);
    const rot = t * Math.PI * 3 + k * 1.15;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(rot);
    ctx.globalAlpha = 0.90 - k * 0.09;

    // Diamond shard body.
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -shardSize);
    ctx.lineTo(shardSize * 0.55, 0);
    ctx.lineTo(0, shardSize * 0.8);
    ctx.lineTo(-shardSize * 0.55, 0);
    ctx.closePath();
    ctx.fill();

    // Top-left facet highlight.
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath();
    ctx.moveTo(0, -shardSize);
    ctx.lineTo(shardSize * 0.55, 0);
    ctx.lineTo(0, -shardSize * 0.18);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

export function draw(now?: number): void {
  now = now ?? performance.now();
  if (!G.layout) { computeLayout(); if (!G.layout) return; }
  ctx.clearRect(0, 0, G.boardW || 99999, G.boardH || 99999);
  const cap = G.cap;
  const a = G.anim;
  let ap: AnimProgress | null = null;

  if (a) {
    const p = clamp01((now - a.t0) / a.dur);
    const approach = clamp01(p / 0.28);
    const ret = clamp01((p - 0.82) / 0.18);
    const transfer = clamp01((p - 0.28) / 0.54);
    let liftEnv = approach;
    if (p > 0.82) liftEnv = 1 - ret;
    ap = { p, tfrac: easeInOut(transfer), liftEnv };
  }

  const bob = G.selected >= 0 ? Math.sin(now * 0.006) * 2 + 6 : 0;
  let hintPulse = 0;
  if (G.hintMove) {
    hintPulse = 8 + Math.sin(now * 0.008) * 6;
    if (now - G.hintTimer > 2600) G.hintMove = null;
  }
  const shakeActive = G.shakeI >= 0 && now - G.shakeT < 320;
  const sh = shakeActive
    ? Math.sin((now - G.shakeT) * 0.06) * G.layout.vw * 0.10 * (1 - (now - G.shakeT) / 320)
    : 0;

  for (let i = 0; i < G.tubes.length; i++) {
    const r = G.layout.rects[i];
    const tube = G.tubes[i];
    let bands: Band[];
    const opts: DrawVialOpts = {};
    const completed = tube.length === cap && isMonochrome(tube);

    if (a && ap && (i === a.s || i === a.d)) {
      const liftAmt = G.layout.vw * 0.5;
      if (i === a.s) {
        const base = a.pre[a.s].slice(0, a.pre[a.s].length - a.count);
        bands = bandsOf(base);
        const moving = a.count * (1 - ap.tfrac);
        if (moving > 0.001) bands.push({ color: a.color, units: moving });
        const dir = G.layout.rects[a.d].x >= r.x ? 1 : -1;
        opts.lift = liftAmt * ap.liftEnv;
        opts.dx = dir * G.layout.vw * 0.18 * ap.liftEnv;
      } else {
        bands = bandsOf(a.pre[a.d]);
        const add = a.count * ap.tfrac;
        if (add > 0.001) bands.push({ color: a.color, units: add });
      }
    } else {
      bands = bandsOf(tube);
      if (i === G.selected) opts.lift = bob;
      if (i === G.shakeI && sh) opts.dx = sh;
    }

    opts.completed = completed && !(a && i === a.d && ap && ap.tfrac < 1);
    if (G.hintMove) {
      if (i === G.hintMove.s) { opts.hintFrom = true; opts.pulse = hintPulse; }
      if (i === G.hintMove.d) { opts.hintTo = true; opts.pulse = hintPulse; }
    }
    drawVial(r, bands, opts);
  }

  if (a && ap && ap.p > 0.26 && ap.p < 0.86) drawCrystalStream(a, ap);
}
