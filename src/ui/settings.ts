import { Store } from '../store';
import { AudioEngine } from '../audio/engine';
import { Haptics } from '../platform/haptics';
import { G } from '../game/state';
import { markDirty } from '../render/loop';

export function applySettings(): void {
  const s = Store.data.settings;
  AudioEngine.enabled = !!s.sound;
  Haptics.enabled = s.haptics !== false;
  G.motion = !!s.motion;
  G.symbols = !!s.symbols;
  document.body.classList.toggle('calm', !s.motion);
  setToggle('tg-sound', s.sound);
  setToggle('tg-motion', !s.motion); // toggle ON = reduce motion
  setToggle('tg-symbols', s.symbols);
  setToggle('tg-haptics', s.haptics !== false);
  markDirty();
}

export function setToggle(id: string, on: boolean): void {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('on', !!on);
}
