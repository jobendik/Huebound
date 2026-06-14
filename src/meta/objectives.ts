// Daily Orders + Weekly Activity meter (§5.2, §6, §13) — the strongest ethical
// retention tools. Short tasks that fit natural play, reward useful-but-optional
// shards, and are rerollable once a day. Nothing here ever blocks play.

import { Store } from '../store';
import { mulberry32, hashSeed } from '../core';
import { addShards, todayKey } from './economy';
import { addXp } from './progression';
import type { DailyOrder } from '../types';

interface OrderTemplate {
  kind: DailyOrder['kind'];
  text: (t: number) => string;
  targets: number[];
  reward: number;
}

const POOL: OrderTemplate[] = [
  { kind: 'win', text: (t) => `Solve ${t} levels`, targets: [3, 4, 5], reward: 40 },
  { kind: 'perfect', text: (t) => `Earn 3 stars on ${t} level${t > 1 ? 's' : ''}`, targets: [1, 2], reward: 55 },
  { kind: 'daily', text: () => 'Complete the Daily Challenge', targets: [1], reward: 70 },
  { kind: 'tubes', text: (t) => `Complete ${t} crystal tubes`, targets: [10, 14, 18], reward: 45 },
  { kind: 'pours', text: (t) => `Pour crystals ${t} times`, targets: [25, 35, 50], reward: 35 },
];

function dayNum(key: string): number {
  return Math.floor(new Date(key + 'T00:00:00').getTime() / 86400000);
}

// ISO-ish week key (year + week number) — good enough for a weekly reset.
export function weekKey(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function makeOrder(tpl: OrderTemplate, rng: () => number, salt: number): DailyOrder {
  const target = tpl.targets[Math.floor(rng() * tpl.targets.length)];
  return {
    id: `${tpl.kind}-${salt}`,
    kind: tpl.kind,
    text: tpl.text(target),
    target,
    progress: 0,
    reward: tpl.reward,
    done: false,
    claimed: false,
  };
}

function rollOrders(dayKey: string): DailyOrder[] {
  const rng = mulberry32(hashSeed(dayNum(dayKey) + 4242));
  const idx = POOL.map((_, i) => i);
  // Fisher–Yates on a copy → pick 3 distinct templates.
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return idx.slice(0, 3).map((i, n) => makeOrder(POOL[i], rng, n));
}

// Roll daily/weekly state when the calendar advances. Call at startup and on win.
export function ensureObjectives(): void {
  const today = todayKey();
  const o = Store.data.objectives;
  if (o.day !== today) {
    o.day = today;
    o.orders = rollOrders(today);
    o.rerolled = false;
  }
  const wk = weekKey();
  const w = Store.data.weekly;
  if (w.week !== wk) {
    w.week = wk;
    w.days = [];
    w.claimed = false;
  }
  Store.save();
}

export function rerollOrder(index: number): boolean {
  const o = Store.data.objectives;
  if (o.rerolled || index < 0 || index >= o.orders.length) return false;
  const order = o.orders[index];
  if (order.done) return false;
  // Pick a template not already present.
  const present = new Set(o.orders.map((x) => x.kind));
  const choices = POOL.filter((t) => !present.has(t.kind) || t.kind === order.kind);
  const rng = mulberry32(hashSeed(dayNum(o.day) + index * 17 + 99));
  const tpl = choices[Math.floor(rng() * choices.length)] ?? POOL[0];
  o.orders[index] = makeOrder(tpl, rng, index + 50);
  o.rerolled = true;
  Store.save();
  return true;
}

export interface OrderCompletion { text: string; reward: number; }

// Advance any matching active orders. Returns the ones completed by this event
// (so the UI can celebrate). Completing an order grants its shards + a little XP.
export function progressOrders(kind: DailyOrder['kind'], amount = 1): OrderCompletion[] {
  const done: OrderCompletion[] = [];
  let changed = false;
  for (const order of Store.data.objectives.orders) {
    if (order.kind !== kind || order.done) continue;
    order.progress = Math.min(order.target, order.progress + amount);
    changed = true;
    if (order.progress >= order.target) {
      order.done = true;
      order.claimed = true;
      addShards(order.reward); // addShards persists
      addXp(20);               // addXp persists
      done.push({ text: order.text, reward: order.reward });
    }
  }
  if (changed && !done.length) Store.save(); // completions already saved via reward grants
  return done;
}

// Mark today as an active day for the weekly meter (call on any win).
export function markActiveDay(): void {
  const w = Store.data.weekly;
  const today = todayKey();
  if (!w.days.includes(today)) { w.days.push(today); Store.save(); }
}

export const WEEKLY_GOAL = 3;
export const WEEKLY_REWARD = 120;

export function weeklyClaimable(): boolean {
  const w = Store.data.weekly;
  return !w.claimed && w.days.length >= WEEKLY_GOAL;
}

export function claimWeekly(): number {
  if (!weeklyClaimable()) return 0;
  Store.data.weekly.claimed = true;
  addShards(WEEKLY_REWARD);
  addXp(60);
  return WEEKLY_REWARD;
}

export function ordersRemaining(): number {
  return Store.data.objectives.orders.filter((o) => !o.done).length;
}
