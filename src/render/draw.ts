import { G } from '../game/state';
import { pal, glassStops, rgba } from './colors';
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

// Gem-quality crystal facet overlay applied on top of a base-color fill.
// Simulates faceted light: radial inner highlight, upper-left bright zone,
// right-side shadow, bottom shadow, and a bright crystal-cut edge at top.
function drawCrystalBand(
  innerX: number, top: number, innerW: number, hpx: number,
): void {
  if (hpx < 0.5) return;

  // Radial internal glow — light "inside" the gem
  const glowX = innerX + innerW * 0.35;
  const glowY = top + hpx * 0.30;
  const glowR = Math.max(innerW, hpx) * 0.90;
  const innerGlow = ctx.createRadialGradient(glowX, glowY, 0, glowX, glowY, glowR);
  innerGlow.addColorStop(0,    'rgba(255,255,255,0.36)');
  innerGlow.addColorStop(0.28, 'rgba(255,255,255,0.14)');
  innerGlow.addColorStop(0.60, 'rgba(0,0,0,0)');
  innerGlow.addColorStop(1,    'rgba(0,0,0,0.30)');
  ctx.fillStyle = innerGlow;
  ctx.fillRect(innerX, top, innerW, hpx + 0.6);

  // Upper-left bright facet
  const facetG = ctx.createLinearGradient(innerX, top, innerX + innerW * 0.58, top + hpx * 0.52);
  facetG.addColorStop(0, 'rgba(255,255,255,0.42)');
  facetG.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = facetG;
  ctx.fillRect(innerX, top, innerW, hpx);

  // Right-side dark shadow facet
  const rightG = ctx.createLinearGradient(innerX + innerW * 0.56, 0, innerX + innerW, 0);
  rightG.addColorStop(0, 'rgba(0,0,0,0)');
  rightG.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = rightG;
  ctx.fillRect(innerX, top, innerW, hpx);

  // Bottom shadow
  if (hpx > 5) {
    const bsh = Math.min(5, hpx * 0.22);
    const botG = ctx.createLinearGradient(0, top + hpx - bsh, 0, top + hpx + 0.6);
    botG.addColorStop(0, 'rgba(0,0,0,0)');
    botG.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = botG;
    ctx.fillRect(innerX, top + hpx - bsh, innerW, bsh + 0.6);
  }

  // Bright crystal-cut edge — the sharpest visual marker of each gem layer
  const edgeH = Math.min(3.5, hpx * 0.26);
  const edgeG = ctx.createLinearGradient(innerX, 0, innerX + innerW, 0);
  edgeG.addColorStop(0,    'rgba(255,255,255,0.88)');
  edgeG.addColorStop(0.42, 'rgba(255,255,255,0.65)');
  edgeG.addColorStop(1,    'rgba(255,255,255,0.22)');
  ctx.fillStyle = edgeG;
  ctx.fillRect(innerX, top, innerW, edgeH);

  // Diagonal striation lines (crystal internal planes)
  if (hpx > 14) {
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 0.7;
    const n = Math.min(3, Math.floor(hpx / 14));
    for (let j = 1; j <= n; j++) {
      const ly = top + (j / (n + 1)) * hpx;
      ctx.beginPath();
      ctx.moveTo(innerX + 2, ly + 2);
      ctx.lineTo(innerX + innerW - 2, ly);
      ctx.stroke();
    }
    ctx.restore();
  }
}

interface DrawVialOpts {
  selected?: boolean;
  completed?: boolean;
  hintFrom?: boolean;
  hintTo?: boolean;
  lift?: number;
  dx?: number;
  rot?: number;
  squash?: number;
  pulse?: number;
}

// Soft contact shadow grounding the vial on the cave floor. Drawn in screen
// space (never rotated) and fades out as the vial lifts off to pour.
function drawGroundShadow(bx: number, y: number, w: number, h: number, lift: number): void {
  const spread = 1 - Math.min(1, lift / (w * 1.1));
  if (spread <= 0.03) return;
  const cx = bx + w / 2;
  const cy = y + h + Math.min(7, w * 0.10);
  const rx = w * 0.5;
  const ry = w * 0.14;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, ry / rx);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
  g.addColorStop(0, `rgba(0,0,0,${0.42 * spread})`);
  g.addColorStop(0.65, `rgba(0,0,0,${0.18 * spread})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawVial(rect: VialRect, bands: Band[], opts: DrawVialOpts = {}, cap = 4): void {
  const { x: bx, y, w, h, unitH, innerPad } = rect;
  const x = bx + (opts.dx ?? 0);
  const lift = opts.lift ?? 0;
  const rot = opts.rot ?? 0;
  const sq = opts.squash ?? 0;
  const rimH = w * 0.16;
  const bodyY = y - lift + rimH * 0.5;
  const bodyH = h - rimH * 0.5;
  const rTop = w * 0.18, rBot = w * 0.46;
  const innerX = x + innerPad, innerW = w - innerPad * 2;
  const innerBottom = (y - lift) + h - innerPad;

  drawGroundShadow(bx, y, w, h, lift);

  ctx.save();

  // Pour tilt — rotate the rigid vial about its own centre so it leans toward
  // the target without swinging out of bounds.
  if (rot) {
    const pivX = x + w / 2;
    const pivY = bodyY + bodyH / 2;
    ctx.translate(pivX, pivY);
    ctx.rotate(rot);
    ctx.translate(-pivX, -pivY);
  }
  // Landing bounce — squash/stretch about the base when crystals settle.
  if (sq) {
    const pcx = x + w / 2;
    const pcy = (y - lift) + h;
    ctx.translate(pcx, pcy);
    ctx.scale(1 - sq * 0.5, 1 + sq);
    ctx.translate(-pcx, -pcy);
  }

  // Glass body — tint comes from the active skin so the tube is clearly visible.
  roundRectPath(ctx, x, bodyY, w, bodyH, rTop, rBot);
  const gs = glassStops();
  const glassG = ctx.createLinearGradient(x, 0, x + w, 0);
  glassG.addColorStop(0,   gs[0]);
  glassG.addColorStop(0.5, gs[1]);
  glassG.addColorStop(1,   gs[2]);
  ctx.fillStyle = glassG;
  ctx.fill();

  // Clip inner content to the tube interior.
  ctx.save();
  roundRectPath(ctx, innerX, bodyY + innerPad * 0.4, innerW, bodyH - innerPad * 0.8, rTop * 0.7, rBot * 0.92);
  ctx.clip();

  const totalUnits = bands.reduce((s, b) => s + b.units, 0);

  // Empty tube interior — dark depth fill above the crystals.
  const emptyUnits = cap - totalUnits;
  if (emptyUnits > 0.1) {
    const emptyH = emptyUnits * unitH;
    const emptyTopY = innerBottom - totalUnits * unitH - emptyH;
    const depthG = ctx.createLinearGradient(innerX, emptyTopY, innerX + innerW, emptyTopY + emptyH);
    depthG.addColorStop(0, 'rgba(4,2,16,0.80)');
    depthG.addColorStop(1, 'rgba(10,5,28,0.60)');
    ctx.fillStyle = depthG;
    ctx.fillRect(innerX, emptyTopY, innerW, emptyH + 1);
  }

  // Crystal bands — base color then gem-facet overlay.
  let acc = 0;
  for (const band of bands) {
    if (band.units <= 0) continue;
    const hpx = band.units * unitH;
    const top = innerBottom - (acc + band.units) * unitH;
    ctx.fillStyle = pal()[band.color] ?? '#888';
    ctx.fillRect(innerX, top, innerW, hpx + 0.6);
    drawCrystalBand(innerX, top, innerW, hpx);
    acc += band.units;
  }

  // Crystal-cut separator lines: dark incision + bright reflection edge below it.
  for (let u = 1; u < acc - 0.001; u++) {
    const yy = innerBottom - u * unitH;
    ctx.strokeStyle = 'rgba(0,0,0,0.40)';
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(innerX, yy); ctx.lineTo(innerX + innerW, yy); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 0.6;
    ctx.beginPath(); ctx.moveTo(innerX, yy + 1.3); ctx.lineTo(innerX + innerW, yy + 1.3); ctx.stroke();
  }

  // Accessibility symbols.
  if (G.symbols) {
    acc = 0;
    for (const band of bands) {
      let rem = band.units;
      while (rem >= 0.6) {
        const cyc = innerBottom - (acc + 0.5) * unitH;
        drawSymbol(band.color, innerX + innerW / 2, cyc, unitH * 0.34);
        acc += 1; rem -= 1;
      }
      if (rem > 0) acc += rem;
    }
  }

  ctx.restore();

  // Glass gloss streak (left edge highlight).
  ctx.save();
  roundRectPath(ctx, x, bodyY, w, bodyH, rTop, rBot);
  ctx.clip();
  const gg = ctx.createLinearGradient(x, 0, x + w, 0);
  gg.addColorStop(0,    'rgba(255,255,255,0.28)');
  gg.addColorStop(0.12, 'rgba(255,255,255,0.09)');
  gg.addColorStop(0.5,  'rgba(255,255,255,0)');
  gg.addColorStop(0.88, 'rgba(255,255,255,0.03)');
  gg.addColorStop(1,    'rgba(255,255,255,0.16)');
  ctx.fillStyle = gg;
  ctx.fillRect(x, bodyY, w, bodyH);
  ctx.restore();

  // Outline / glow — completed vials glow with their own gem color.
  let stroke = 'rgba(255,255,255,0.30)';
  let lw = Math.max(1.5, w * 0.040);
  let glow = 0, glowCol = '';
  if (opts.completed) {
    const gemCol = pal()[bands[0]?.color ?? 0] ?? '#ffd35c';
    stroke = rgba(gemCol, 0.95); glow = 20; glowCol = rgba(gemCol, 0.65);
  }
  if (opts.hintTo)   { stroke = rgba('#5fe1a0', 0.95); glow = 18; glowCol = 'rgba(95,225,160,0.85)'; }
  if (opts.hintFrom) { stroke = rgba('#3fd3c8', 0.95); glow = 18; glowCol = 'rgba(63,211,200,0.85)'; }
  if (opts.selected) { stroke = 'rgba(255,255,255,0.96)'; glow = 24; glowCol = 'rgba(160,130,255,0.95)'; }
  if (opts.pulse) glow += opts.pulse;

  roundRectPath(ctx, x, bodyY, w, bodyH, rTop, rBot);
  if (glow) { ctx.shadowColor = glowCol || 'rgba(160,130,255,0.9)'; ctx.shadowBlur = glow; }
  ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke();
  ctx.shadowBlur = 0;

  // Rim (neck of tube).
  ctx.beginPath();
  ctx.ellipse(x + w / 2, bodyY, w / 2 - 1, rimH * 0.55, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(6,3,18,0.62)';
  ctx.fill();
  ctx.lineWidth = Math.max(1.4, w * 0.036);
  ctx.strokeStyle = opts.selected ? 'rgba(255,255,255,0.90)' : 'rgba(255,255,255,0.44)';
  ctx.stroke();

  // Completed checkmark.
  if (opts.completed) {
    const ccx = x + w / 2, ccy = (y - lift) + h * 0.52;
    ctx.strokeStyle = 'rgba(255,255,255,0.96)';
    ctx.lineWidth = Math.max(2, w * 0.08);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ccx - w * 0.16, ccy);
    ctx.lineTo(ccx - w * 0.03, ccy + w * 0.14);
    ctx.lineTo(ccx + w * 0.20, ccy - w * 0.17);
    ctx.stroke();
    ctx.lineCap = 'butt';
  }

  ctx.restore();
}

// Source-vial pour transform shared between the body draw and the shard stream.
interface PourTf { dir: 1 | -1; lift: number; dx: number; rot: number; spoutX: number; spoutY: number; }

function pourTransform(a: AnimState, ap: AnimProgress): PourTf {
  const { rects, vw } = G.layout!;
  const sr = rects[a.s], dr = rects[a.d];
  const dir: 1 | -1 = dr.x >= sr.x ? 1 : -1;
  const env = ap.liftEnv;
  // Lift, but never push the vial mouth above the top of the board.
  const lift = Math.min(vw * 0.30 * env, Math.max(0, sr.y - 6) * env);
  const dx = dir * vw * 0.14 * env;
  const rot = dir * 0.40 * env; // up to ~23° of lean at full pour
  // Spout = the pouring lip, found by rotating the mouth-edge about the centre.
  const rimH = sr.w * 0.16;
  const x = sr.x + dx;
  const bodyY = sr.y - lift + rimH * 0.5;
  const bodyH = sr.h - rimH * 0.5;
  const cx = x + sr.w / 2, cy = bodyY + bodyH / 2;
  const lx = x + sr.w / 2 + dir * sr.w * 0.46 - cx;
  const ly = bodyY + rimH * 0.4 - cy;
  const spoutX = cx + lx * Math.cos(rot) - ly * Math.sin(rot);
  const spoutY = cy + lx * Math.sin(rot) + ly * Math.cos(rot);
  return { dir, lift, dx, rot, spoutX, spoutY };
}

// Crystal shard pour — diamond fragments fall from the tilted spout under
// gravity and stream into the destination mouth.
export function drawCrystalStream(a: AnimState, ap: AnimProgress, tf: PourTf): void {
  const { rects, vw } = G.layout!;
  const dr = rects[a.d];

  const spoutX = tf.spoutX;
  const spoutY = tf.spoutY;
  const dstUnits = a.pre[a.d].length + a.count * ap.tfrac;
  const innerBottom = dr.y + dr.h - dr.innerPad;
  const dstTopY = Math.max(dr.y + dr.w * 0.22, innerBottom - dstUnits * dr.unitH);
  const mouthX = dr.x + dr.w / 2;
  // Arc that bows toward the destination — bezier control biased to the source.
  const ctrlX = spoutX + (mouthX - spoutX) * 0.35;
  const ctrlY = Math.min(spoutY, dstTopY) - vw * 0.12;

  const col = pal()[a.color] ?? '#fff';
  const numShards = 9;

  for (let k = 0; k < numShards; k++) {
    const t = clamp01(ap.tfrac * 1.15 - k * 0.06);
    if (t <= 0 || t >= 1) continue;

    const bx = (1 - t) * (1 - t) * spoutX + 2 * (1 - t) * t * ctrlX + t * t * mouthX;
    const by = (1 - t) * (1 - t) * spoutY + 2 * (1 - t) * t * ctrlY + t * t * dstTopY;
    const shardSize = vw * (0.085 + (numShards - k) * 0.006);
    const rot = t * Math.PI * 3.5 + k * 1.15;

    ctx.save();
    ctx.translate(bx, by);
    ctx.rotate(rot);
    ctx.globalAlpha = (0.95 - k * 0.07) * clamp01(t * 8) * clamp01((1 - t) * 8);

    // Glow halo
    ctx.shadowColor = rgba(col, 0.8);
    ctx.shadowBlur = vw * 0.10;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -shardSize);
    ctx.lineTo(shardSize * 0.55, 0);
    ctx.lineTo(0, shardSize * 0.8);
    ctx.lineTo(-shardSize * 0.55, 0);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Facet highlight
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
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

  // Selection float — gentle ease-up plus a slow hover bob.
  const bob = G.selected >= 0 ? Math.sin(now * 0.005) * 2.4 + 9 : 0;
  let hintPulse = 0;
  if (G.hintMove) {
    hintPulse = 8 + Math.sin(now * 0.008) * 6;
    if (now - G.hintTimer > 2600) G.hintMove = null;
  }
  const shakeActive = G.shakeI >= 0 && now - G.shakeT < 320;
  const sh = shakeActive
    ? Math.sin((now - G.shakeT) * 0.06) * G.layout.vw * 0.10 * (1 - (now - G.shakeT) / 320)
    : 0;

  // Landing bounce — a quick damped squash on the destination after a pour.
  const SETTLE_MS = 360;
  let settleSq = 0;
  if (G.settleI >= 0) {
    const st = now - G.settleT;
    if (st < SETTLE_MS) {
      const k = st / SETTLE_MS;
      settleSq = Math.sin(k * Math.PI * 2.2) * 0.10 * (1 - k);
    } else {
      G.settleI = -1;
    }
  }

  const tf = a && ap ? pourTransform(a, ap) : null;

  for (let i = 0; i < G.tubes.length; i++) {
    const r = G.layout.rects[i];
    const tube = G.tubes[i];
    let bands: Band[];
    const opts: DrawVialOpts = {};
    const completed = tube.length === cap && isMonochrome(tube);

    if (a && ap && tf && (i === a.s || i === a.d)) {
      if (i === a.s) {
        const base = a.pre[a.s].slice(0, a.pre[a.s].length - a.count);
        bands = bandsOf(base);
        const moving = a.count * (1 - ap.tfrac);
        if (moving > 0.001) bands.push({ color: a.color, units: moving });
        opts.lift = tf.lift;
        opts.dx = tf.dx;
        opts.rot = tf.rot;
      } else {
        bands = bandsOf(a.pre[a.d]);
        const add = a.count * ap.tfrac;
        if (add > 0.001) bands.push({ color: a.color, units: add });
      }
    } else {
      bands = bandsOf(tube);
      if (i === G.selected) opts.lift = bob;
      if (i === G.shakeI && sh) opts.dx = sh;
      if (i === G.settleI && settleSq) opts.squash = settleSq;
    }

    opts.completed = completed && !(a && i === a.d && ap && ap.tfrac < 1);
    if (G.hintMove) {
      if (i === G.hintMove.s) { opts.hintFrom = true; opts.pulse = hintPulse; }
      if (i === G.hintMove.d) { opts.hintTo = true; opts.pulse = hintPulse; }
    }
    drawVial(r, bands, opts, cap);
  }

  if (a && ap && tf && ap.tfrac > 0.001 && ap.tfrac < 0.999) drawCrystalStream(a, ap, tf);
}
