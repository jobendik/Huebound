// Pure puzzle logic — no DOM, headless-testable.

export function hashSeed(n: number): number {
  let h = 2166136261 >>> 0;
  n = n >>> 0;
  for (let i = 0; i < 4; i++) {
    h ^= n & 0xff;
    h = Math.imul(h, 16777619) >>> 0;
    n >>>= 8;
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995) >>> 0;
  h ^= h >>> 15;
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const cloneTubes = (tubes: number[][]): number[][] => tubes.map((t) => t.slice());
export const topColor = (t: number[]): number => (t.length ? t[t.length - 1] : -1);

export function topRun(t: number[]): number {
  if (!t.length) return 0;
  const c = t[t.length - 1];
  let n = 1;
  for (let i = t.length - 2; i >= 0; i--) {
    if (t[i] === c) n++;
    else break;
  }
  return n;
}

export function isMonochrome(t: number[]): boolean {
  if (!t.length) return true;
  const c = t[0];
  for (let i = 1; i < t.length; i++) if (t[i] !== c) return false;
  return true;
}

export function canPour(src: number[], dst: number[], cap: number): boolean {
  if (!src.length) return false;
  if (dst.length >= cap) return false;
  if (!dst.length) return true;
  return topColor(src) === topColor(dst);
}

export function pourAmount(src: number[], dst: number[], cap: number): number {
  if (!canPour(src, dst, cap)) return 0;
  return Math.min(topRun(src), cap - dst.length);
}

export function applyPour(tubes: number[][], s: number, d: number, cap: number): number[][] {
  const ns = cloneTubes(tubes);
  const amt = pourAmount(ns[s], ns[d], cap);
  const c = topColor(ns[s]);
  for (let i = 0; i < amt; i++) {
    ns[s].pop();
    ns[d].push(c);
  }
  return ns;
}

export function isSolved(tubes: number[][], cap: number): boolean {
  for (const t of tubes) {
    if (!t.length) continue;
    if (t.length !== cap) return false;
    const c = t[0];
    for (let i = 1; i < t.length; i++) if (t[i] !== c) return false;
  }
  return true;
}

function canon(tubes: number[][]): string {
  const parts = tubes.map((t) => t.join(','));
  parts.sort();
  return parts.join('|');
}

function genMoves(tubes: number[][], cap: number): Array<{ s: number; d: number; score: number }> {
  const out: Array<{ s: number; d: number; score: number }> = [];
  const n = tubes.length;
  for (let s = 0; s < n; s++) {
    const src = tubes[s];
    if (!src.length) continue;
    if (src.length === cap && isMonochrome(src)) continue;
    const srcMono = isMonochrome(src);
    for (let d = 0; d < n; d++) {
      if (d === s) continue;
      const dst = tubes[d];
      if (!canPour(src, dst, cap)) continue;
      if (srcMono && !dst.length) continue;
      const amt = pourAmount(src, dst, cap);
      let score: number;
      if (dst.length > 0 && dst.length + amt === cap && isMonochrome(dst)) score = 1000 + amt;
      else if (dst.length > 0) score = 600 + amt;
      else score = 200 + amt;
      out.push({ s, d, score });
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

export function isSolvable(start: number[][], cap: number, budget = 60000): boolean {
  const seen = new Set<string>();
  const stack = [cloneTubes(start)];
  let nodes = 0;
  while (stack.length) {
    if (++nodes > budget) return false;
    const cur = stack.pop()!;
    if (isSolved(cur, cap)) return true;
    const k = canon(cur);
    if (seen.has(k)) continue;
    seen.add(k);
    const moves = genMoves(cur, cap);
    for (let i = moves.length - 1; i >= 0; i--) {
      stack.push(applyPour(cur, moves[i].s, moves[i].d, cap));
    }
  }
  return false;
}

export function levelParams(idx: number): { colors: number; empty: number; capacity: number } {
  const n = idx + 1;
  let colors: number, empty = 2;
  if (n <= 8) colors = 3;
  else if (n <= 20) colors = 4;
  else if (n <= 35) colors = 5;
  else if (n <= 55) colors = 6;
  else if (n <= 75) colors = 7;
  else if (n <= 95) colors = 8;
  else if (n <= 115) colors = 9;
  else if (n <= 130) colors = 10;
  else if (n <= 142) colors = 11;
  else colors = 12;
  return { colors, empty, capacity: 4 };
}

function fisherYates(arr: number[], rng: () => number): number[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function dealRandom(colors: number, empty: number, cap: number, rng: () => number): number[][] {
  const deck: number[] = [];
  for (let c = 0; c < colors; c++) for (let k = 0; k < cap; k++) deck.push(c);
  fisherYates(deck, rng);
  const tubes: number[][] = [];
  let p = 0;
  for (let c = 0; c < colors; c++) {
    const t: number[] = [];
    for (let k = 0; k < cap; k++) t.push(deck[p++]);
    tubes.push(t);
  }
  for (let e = 0; e < empty; e++) tubes.push([]);
  return tubes;
}

function isTrivial(tubes: number[][], cap: number): boolean {
  if (isSolved(tubes, cap)) return true;
  const colorTubes = new Map<number, number>();
  for (const t of tubes) {
    if (!t.length) continue;
    if (t.length === cap && isMonochrome(t)) return true;
    const set = new Set(t);
    for (const c of set) colorTubes.set(c, (colorTubes.get(c) ?? 0) + 1);
  }
  for (const [, count] of colorTubes) if (count < 2) return true;
  return false;
}

function parFor(tubes: number[][]): number {
  const colorTubes = new Map<number, number>();
  for (const t of tubes) {
    const set = new Set(t);
    for (const c of set) colorTubes.set(c, (colorTubes.get(c) ?? 0) + 1);
  }
  let p = 0;
  for (const [, k] of colorTubes) p += Math.max(0, k - 1);
  return Math.max(1, p);
}

function reverseScramble(
  colors: number,
  empty: number,
  cap: number,
  rng: () => number,
  steps: number,
): number[][] {
  const tubes: number[][] = [];
  for (let c = 0; c < colors; c++) {
    const t: number[] = [];
    for (let k = 0; k < cap; k++) t.push(c);
    tubes.push(t);
  }
  for (let e = 0; e < empty; e++) tubes.push([]);
  for (let s = 0; s < steps; s++) {
    const pairs: [number, number][] = [];
    for (let d = 0; d < tubes.length; d++) {
      const dt = tubes[d];
      if (!dt.length) continue;
      const run = topRun(dt);
      if (!(run >= 2 || dt.length === 1)) continue;
      const c = topColor(dt);
      for (let a = 0; a < tubes.length; a++) {
        if (a === d) continue;
        const at = tubes[a];
        if (at.length >= cap) continue;
        if (at.length > 0 && topColor(at) === c) continue;
        pairs.push([d, a]);
      }
    }
    if (!pairs.length) break;
    const pick = pairs[Math.floor(rng() * pairs.length)];
    tubes[pick[1]].push(tubes[pick[0]].pop()!);
  }
  return tubes;
}

export function generateLevel(idx: number): {
  tubes: number[][];
  colors: number;
  empty: number;
  capacity: number;
  par: number;
} {
  const { colors, empty, capacity } = levelParams(idx);
  for (let attempt = 0; attempt < 60; attempt++) {
    const rng = mulberry32(hashSeed(idx * 131 + attempt + 1));
    const tubes = dealRandom(colors, empty, capacity, rng);
    if (isTrivial(tubes, capacity)) continue;
    if (isSolvable(tubes, capacity, 60000)) {
      return { tubes, colors, empty, capacity, par: parFor(tubes) };
    }
  }
  const steps = 40 + colors * 18 + idx;
  let tubes = reverseScramble(colors, empty, capacity, mulberry32(hashSeed(idx * 977 + 7)), steps);
  if (isTrivial(tubes, capacity)) {
    tubes = reverseScramble(
      colors,
      empty,
      capacity,
      mulberry32(hashSeed(idx * 977 + 99)),
      steps + colors * 8,
    );
  }
  return { tubes, colors, empty, capacity, par: parFor(tubes) };
}

export function findHint(tubes: number[][], cap: number): { s: number; d: number } | null {
  let best: { s: number; d: number } | null = null;
  let bestScore = -1e9;
  const n = tubes.length;
  for (let s = 0; s < n; s++) {
    const src = tubes[s];
    if (!src.length) continue;
    if (src.length === cap && isMonochrome(src)) continue;
    const srcMono = isMonochrome(src);
    for (let d = 0; d < n; d++) {
      if (d === s) continue;
      const dst = tubes[d];
      if (!canPour(src, dst, cap)) continue;
      if (srcMono && !dst.length) continue;
      const amt = pourAmount(src, dst, cap);
      let score = amt;
      if (dst.length > 0 && dst.length + amt === cap && isMonochrome(dst)) score += 1000;
      else if (dst.length > 0) score += 500;
      else score += topRun(src) < src.length ? 120 : -40;
      if (score > bestScore) {
        bestScore = score;
        best = { s, d };
      }
    }
  }
  return best;
}
