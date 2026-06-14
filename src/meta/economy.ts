// Economy & daily systems — soft-currency ("shards"), daily login streaks, and
// the seeded Daily Challenge. Ethical-pressure model: rewards create a reason to
// return, never punish or trap the player.

import { Store } from '../store';
import { generateBoard } from '../core';

// ── Date helpers ──────────────────────────────────────────
export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function dayNumber(key: string): number {
  // Days since epoch — stable integer seed for the daily puzzle.
  return Math.floor(new Date(key + 'T00:00:00').getTime() / 86400000);
}
function isConsecutive(prev: string, next: string): boolean {
  if (!prev) return false;
  return dayNumber(next) - dayNumber(prev) === 1;
}

// ── Currency ──────────────────────────────────────────────
export function shardsForWin(stars: number): number {
  return 10 + stars * 6; // 16 / 22 / 28 for 1–3 stars
}
export const DAILY_WIN_BONUS = 40;

export function addShards(n: number): void {
  Store.data.shards = Math.max(0, (Store.data.shards ?? 0) + n);
  Store.save();
}
export function spendShards(n: number): boolean {
  if ((Store.data.shards ?? 0) < n) return false;
  Store.data.shards -= n;
  Store.save();
  return true;
}

// ── Daily login streak ────────────────────────────────────
// Escalating but gentle login rewards, capped so they stay exciting not extreme.
const LOGIN_REWARDS = [25, 35, 50, 70, 90, 120, 160];
export function loginReward(streak: number): number {
  return LOGIN_REWARDS[Math.min(streak - 1, LOGIN_REWARDS.length - 1)] ?? 25;
}

export interface DailyOpenResult {
  newDay: boolean;
  streak: number;
  rewardReady: boolean; // a login reward is available to claim today
}

// Run once at startup. Advances the calendar bookkeeping; does NOT grant the
// reward (the player claims it from the popup for a satisfying tap).
export function processDailyOpen(): DailyOpenResult {
  const d = Store.data.daily;
  const today = todayKey();
  let newDay = false;
  if (d.lastSeenDay !== today) {
    newDay = true;
    d.loginStreak = isConsecutive(d.lastSeenDay, today) ? d.loginStreak + 1 : 1;
    d.bestLoginStreak = Math.max(d.bestLoginStreak ?? 0, d.loginStreak);
    d.lastSeenDay = today;
    Store.save();
  }
  return { newDay, streak: d.loginStreak, rewardReady: d.lastRewardDay !== today };
}

export function claimDailyReward(): number {
  const d = Store.data.daily;
  const today = todayKey();
  if (d.lastRewardDay === today) return 0;
  const amt = loginReward(d.loginStreak);
  d.lastRewardDay = today;
  addShards(amt);
  return amt;
}

// ── Daily Challenge ───────────────────────────────────────
const DAILY = { colors: 8, empty: 2, capacity: 4 };

export function dailyBoard(dayKey = todayKey()): {
  tubes: number[][]; capacity: number; par: number;
} {
  const g = generateBoard(DAILY.colors, DAILY.empty, DAILY.capacity, dayNumber(dayKey) + 7777);
  return { tubes: g.tubes, capacity: g.capacity, par: g.par };
}

// Keep the challenge record aligned to the current day.
export function rollChallenge(): void {
  const c = Store.data.challenge;
  const today = todayKey();
  if (c.day !== today) {
    c.day = today;
    c.done = false;
    c.best = undefined;
    Store.save();
  }
}

export function isChallengeDoneToday(): boolean {
  rollChallenge();
  return Store.data.challenge.done;
}

// Record a Daily Challenge solve; advances the daily-challenge streak.
export function recordChallengeWin(rec: { moves: number; stars: number; timeMs: number }): {
  firstToday: boolean; streak: number; shards: number;
} {
  const c = Store.data.challenge;
  const today = todayKey();
  const firstToday = !c.done || c.day !== today;
  c.day = today;
  if (firstToday) {
    c.streak = isConsecutive(c.lastSolvedDay, today) ? (c.streak || 0) + 1 : 1;
    c.lastSolvedDay = today;
    c.bestStreak = Math.max(c.bestStreak ?? 0, c.streak);
  }
  c.done = true;
  if (!c.best || rec.moves < c.best.moves) c.best = { ...rec };
  const shards = firstToday ? DAILY_WIN_BONUS + Math.min(60, c.streak * 5) : 0;
  if (shards) addShards(shards);
  else Store.save();
  return { firstToday, streak: c.streak, shards };
}
