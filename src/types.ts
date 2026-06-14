export interface Band {
  color: number;
  units: number;
}

export interface VialRect {
  x: number;
  y: number;
  w: number;
  h: number;
  unitH: number;
  innerPad: number;
}

export interface Layout {
  rects: VialRect[];
  vw: number;
  unitH: number;
  vialH: number;
  rows: number;
  cols: number;
}

export interface AnimState {
  type: 'pour';
  s: number;
  d: number;
  color: number;
  count: number;
  pre: number[][];
  t0: number;
  dur: number;
}

export interface AnimProgress {
  p: number;
  tfrac: number;
  liftEnv: number;
}

export interface RingFX {
  type: 'ring';
  x: number;
  y: number;
  born: number;
  life: number;
  r0: number;
  r1: number;
  color?: string;
}

export interface SparkFX {
  type: 'spark';
  x: number;
  y: number;
  born: number;
  life: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
}

export interface ConfettiFX {
  type: 'confetti';
  x: number;
  y: number;
  born: number;
  life: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  size: number;
  color: string;
  sides: 3 | 4 | 6;
}

export type FXParticle = RingFX | SparkFX | ConfettiFX;

export interface BestRecord {
  moves: number;
  stars: number;
  timeMs: number;
}

export interface Settings {
  sound: boolean;
  motion: boolean;
  symbols: boolean;
  haptics: boolean;
}

export interface DailyState {
  lastSeenDay: string;   // YYYY-MM-DD of last app open that we processed
  loginStreak: number;   // consecutive calendar days opened
  bestLoginStreak: number;
  lastRewardDay: string; // YYYY-MM-DD the daily login reward was claimed
}

export interface ChallengeState {
  day: string;            // YYYY-MM-DD the `done`/`best` fields apply to
  done: boolean;          // solved today's challenge
  best?: BestRecord;      // best result for today's challenge
  streak: number;         // consecutive days the daily challenge was solved
  bestStreak: number;
  lastSolvedDay: string;  // YYYY-MM-DD of the most recent solve (for streaks)
}

export interface Cosmetics {
  skin: string;          // active vial/crystal skin id
  theme: string;         // active background theme id
  owned: string[];       // owned cosmetic ids (skins + themes)
}

export interface SaveData {
  version: number;
  started: boolean;
  maxUnlocked: number;
  current: number;
  best: Record<string, BestRecord>;
  settings: Settings;
  shards: number;        // spendable soft currency (crystal shards)
  winStreak: number;     // consecutive level wins (resets on quit-to-menu/loss)
  tutorialDone: boolean;
  daily: DailyState;
  challenge: ChallengeState;
  cosmetics: Cosmetics;
}

export interface HintMove {
  s: number;
  d: number;
}

export interface UndoSnapshot {
  tubes: number[][];
  moves: number;
}

export interface GameState {
  screen: string;
  level: number;
  cap: number;
  tubes: number[][];
  start: number[][];
  par: number;
  moves: number;
  history: UndoSnapshot[];
  selected: number;
  locked: boolean;
  anim: AnimState | null;
  fx: FXParticle[];
  hintMove: HintMove | null;
  hintTimer: number;
  timeMs: number;
  timing: boolean;
  lastTick: number;
  layout: Layout | null;
  loopRunning: boolean;
  motion: boolean;
  symbols: boolean;
  shakeI: number;
  shakeT: number;
  settleI: number;
  settleT: number;
  boardW: number;
  boardH: number;
  daily: boolean;     // current run is the Daily Challenge
  hintsLeft: number;  // free hints remaining this level
}
