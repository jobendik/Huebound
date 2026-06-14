import type { FXParticle, SparkFX } from '../types';
import { G } from '../game/state';
import { PALETTE } from './colors';
import { ctx } from './canvas';
import { wrapEl } from './canvas';
import { startLoop } from './loop';
import { clamp01 } from './draw';

export function spawnComplete(i: number): void {
  if (!G.layout) return;
  const r = G.layout.rects[i];
  const cx = r.x + r.w / 2, cy = r.y + r.h * 0.35;
  G.fx.push({ type: 'ring', x: cx, y: cy, born: performance.now(), life: 600, r0: r.w * 0.4, r1: r.w * 1.3 });
  const col = PALETTE[G.tubes[i][0]] ?? '#fff';
  for (let k = 0; k < 12; k++) {
    const a = (Math.PI * 2 * k) / 12 + Math.random() * 0.35;
    const sp = 0.06 + Math.random() * 0.08;
    G.fx.push({
      type: 'spark',
      x: cx, y: cy,
      vx: Math.cos(a) * sp * r.w,
      vy: Math.sin(a) * sp * r.w,
      born: performance.now(),
      life: 560,
      size: r.w * 0.09,
      color: col,
    } as SparkFX);
  }
  startLoop();
}

// Geometric crystal rain for win state (diamonds, triangles, hexagons — not plain confetti).
export function spawnCrystalRain(): void {
  if (!G.motion) return;
  const rect = wrapEl.getBoundingClientRect();
  const shapes: (3 | 4 | 6)[] = [3, 4, 6];
  for (let k = 0; k < 80; k++) {
    G.fx.push({
      type: 'confetti',
      x: rect.width * (0.15 + Math.random() * 0.70),
      y: -12 - Math.random() * 48,
      vx: (Math.random() - 0.5) * 0.13,
      vy: 0.16 + Math.random() * 0.24,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.35,
      born: performance.now(),
      life: 2000 + Math.random() * 900,
      size: 4 + Math.random() * 7,
      color: PALETTE[k % PALETTE.length] as string,
      sides: shapes[Math.floor(Math.random() * shapes.length)],
    });
  }
  startLoop();
}

export function updateFX(now: number, dtMs: number): void {
  if (!G.fx.length) return;
  const keep: FXParticle[] = [];
  for (const p of G.fx) {
    const age = now - p.born;
    if (age > p.life) continue;
    if (p.type === 'spark') {
      p.x += p.vx * dtMs * 0.06;
      p.y += p.vy * dtMs * 0.06 + dtMs * 0.03;
    } else if (p.type === 'confetti') {
      p.x += p.vx * dtMs;
      p.y += p.vy * dtMs;
      p.rot += p.vr * dtMs * 0.01;
      p.vy += 0.0002 * dtMs;
    }
    keep.push(p);
  }
  G.fx = keep;
}

// Draw geometric crystal shard shapes for confetti.
function drawGemShape(sides: 3 | 4 | 6, size: number): void {
  ctx.beginPath();
  if (sides === 4) {
    // Diamond
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.55, 0);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.55, 0);
  } else if (sides === 3) {
    // Triangle
    for (let j = 0; j < 3; j++) {
      const angle = (j / 3) * Math.PI * 2 - Math.PI / 2;
      const px = Math.cos(angle) * size, py = Math.sin(angle) * size;
      j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
  } else {
    // Hexagon
    for (let j = 0; j < 6; j++) {
      const angle = (j / 6) * Math.PI * 2;
      const px = Math.cos(angle) * size, py = Math.sin(angle) * size;
      j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

export function drawFX(): void {
  for (const p of G.fx) {
    const age = performance.now() - p.born;
    const t = clamp01(age / p.life);
    if (p.type === 'ring') {
      const r = p.r0 + (p.r1 - p.r0) * t;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,211,92,${0.8 * (1 - t)})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (p.type === 'spark') {
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (1 - t * 0.5), 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.type === 'confetti') {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(1, 2 * (1 - t));
      ctx.fillStyle = p.color;
      drawGemShape(p.sides, p.size);
      ctx.fill();
      // Facet highlight on each crystal shard.
      ctx.fillStyle = 'rgba(255,255,255,0.30)';
      ctx.globalAlpha *= 0.6;
      drawGemShape(p.sides, p.size * 0.45);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }
}
