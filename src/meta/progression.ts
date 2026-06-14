// Account progression — XP, player level and title. The level is derived from
// total XP via an escalating curve (fast early, slower later) per the retention
// model (§3.1). Titles give progression an identity, not just a number (§3.2).

import { Store } from '../store';

// XP needed to advance FROM a given level to the next.
function costFor(level: number): number {
  return level <= 5 ? 80 + (level - 1) * 30 : 230 + (level - 6) * 55;
}

export interface LevelInfo {
  level: number;
  into: number;  // XP accumulated into the current level
  span: number;  // XP required to finish the current level
  title: string;
}

const TITLES: Array<[number, string]> = [
  [1, 'Novice'],
  [3, 'Apprentice'],
  [6, 'Sorter'],
  [10, 'Artisan'],
  [15, 'Curator'],
  [22, 'Lapidary'],
  [30, 'Gemmaster'],
  [45, 'Luminary'],
];

export function titleFor(level: number): string {
  let t = TITLES[0][1];
  for (const [lv, name] of TITLES) if (level >= lv) t = name;
  return t;
}

export function levelInfo(xp = Store.data.xp ?? 0): LevelInfo {
  let level = 1;
  let rem = Math.max(0, xp);
  while (rem >= costFor(level)) { rem -= costFor(level); level++; }
  return { level, into: rem, span: costFor(level), title: titleFor(level) };
}

// XP earned for finishing a level.
export function xpForWin(stars: number, firstClear: boolean, firstOfDay: boolean): number {
  return 40 + stars * 20 + (firstClear ? 40 : 0) + (firstOfDay ? 30 : 0);
}

export interface XpResult { gained: number; leveledUp: boolean; from: number; to: number; }

export function addXp(amount: number): XpResult {
  const from = levelInfo().level;
  Store.data.xp = Math.max(0, (Store.data.xp ?? 0) + amount);
  const to = levelInfo().level;
  Store.save();
  return { gained: amount, leveledUp: to > from, from, to };
}
