// First-time user experience — a gentle, non-blocking coach that points the
// player through their first few pours so they succeed within the first minute.
// It never intercepts input; it only highlights where to tap.

import { G } from './state';
import { Store } from '../store';
import { findHint, pourAmount } from '../core';

let active = false;
let pours = 0;
const NEED = 3; // guided pours before we trust the player

export function isTutorialActive(): boolean { return active; }

export function maybeStartTutorial(): void {
  if (Store.data.tutorialDone || G.daily) return;
  active = true;
  pours = 0;
  refreshCoach();
}

export function tutorialOnSelect(): void {
  if (active) refreshCoach();
}

export function tutorialOnPour(): void {
  if (!active) return;
  pours++;
  if (pours >= NEED) finishTutorial();
  else refreshCoach();
}

export function finishTutorial(): void {
  active = false;
  Store.data.tutorialDone = true;
  Store.save();
  hideCoach();
}

function el(id: string): HTMLElement | null { return document.getElementById(id); }

function hideCoach(): void {
  const c = el('coach');
  if (c) c.classList.remove('show');
}

// Point the finger + bubble at the next tube the player should tap.
function refreshCoach(): void {
  const coach = el('coach');
  const finger = el('coach-finger');
  const bubble = el('coach-bubble');
  if (!coach || !finger || !bubble || !G.layout) return;

  let targetTube: number;
  let text: string;

  if (G.selected >= 0) {
    // A tube is picked — find a legal destination (prefer the smart hint).
    let dest = -1;
    const h = findHint(G.tubes, G.cap);
    if (h && h.s === G.selected && pourAmount(G.tubes[G.selected], G.tubes[h.d], G.cap) > 0) dest = h.d;
    if (dest < 0) {
      for (let d = 0; d < G.tubes.length; d++) {
        if (d !== G.selected && pourAmount(G.tubes[G.selected], G.tubes[d], G.cap) > 0) { dest = d; break; }
      }
    }
    if (dest < 0) { hideCoach(); return; }
    targetTube = dest;
    text = 'Now tap here to pour the matching crystals in.';
  } else {
    const h = findHint(G.tubes, G.cap);
    if (!h) { finishTutorial(); return; }
    targetTube = h.s;
    text = pours === 0
      ? 'Tap this tube to pick it up.'
      : 'Tap a tube, then tap where to pour.';
  }

  const r = G.layout.rects[targetTube];
  const cx = r.x + r.w / 2;
  finger.style.left = `${cx}px`;
  finger.style.top = `${r.y + r.h * 0.5}px`;
  bubble.textContent = text;
  bubble.style.left = `${Math.max(90, Math.min(cx, (G.boardW || 320) - 90))}px`;
  bubble.style.top = `${Math.max(8, r.y - 46)}px`;
  coach.classList.add('show');
}
