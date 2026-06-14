// Tactile feedback for mobile — subtle vibration patterns that give the game
// a physical, premium feel. No-ops on devices without the Vibration API and
// can be globally disabled (mirrors the sound preference).

const canVibrate =
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';

export const Haptics = {
  enabled: true,

  buzz(pattern: number | number[]): void {
    if (!this.enabled || !canVibrate) return;
    try {
      navigator.vibrate(pattern);
    } catch {
      /* some browsers throw if called outside a user gesture */
    }
  },

  tap(): void {
    this.buzz(8);
  },
  select(): void {
    this.buzz(10);
  },
  pour(): void {
    this.buzz(14);
  },
  invalid(): void {
    this.buzz([16, 40, 16]);
  },
  complete(): void {
    this.buzz([0, 18, 30, 26]);
  },
  win(): void {
    this.buzz([0, 30, 50, 30, 50, 60]);
  },
};
