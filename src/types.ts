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

export interface SaveData {
  version: number;
  started: boolean;
  maxUnlocked: number;
  current: number;
  best: Record<string, BestRecord>;
  settings: Settings;
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
}
