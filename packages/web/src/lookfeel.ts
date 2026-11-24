/**
 * Look and feel (P30): the pure rules behind hit-stop, the kill flash, the ship's damage smoke, the hit marker and
 * the combo badge. main.ts applies them; keeping them here keeps them tested.
 */
import { comboLive, comboMultiplier, type GameState, type SimEvent } from '@asteroid/sim';

/** How long the sim freezes after a tick's big hits: a big kill 70 ms, a smart bomb 90 ms; 0 for nothing big. */
export function hitStopMs(events: readonly SimEvent[]): number {
  let ms = 0;
  for (const e of events) {
    if (e.type === 'smartBomb') ms = Math.max(ms, 90);
    else if (e.type === 'asteroidDestroyed' && e.size !== 'small' && e.by !== 'bomb') ms = Math.max(ms, e.size === 'boss' ? 160 : 70);
  }
  return ms;
}

/** The white flash's peak opacity for a tick's events. */
export function killFlash(events: readonly SimEvent[]): number {
  let a = 0;
  for (const e of events) {
    if (e.type === 'smartBomb') a = Math.max(a, 0.4);
    else if (e.type === 'asteroidDestroyed' && e.size !== 'small' && e.by !== 'bomb') a = Math.max(a, e.size === 'boss' ? 0.5 : 0.16);
  }
  return a;
}

/** The flash a moment later: it fades out over ~180 ms. */
export const flashAt = (peak: number, sinceMs: number): number => (sinceMs < 0 ? 0 : Math.max(0, peak * (1 - sinceMs / 180)));

/** Smoke puffs per tick from a damaged ship: none at half hull or more, rising to 1 at zero. */
export function damageSmoke(hull: number, hullMax: number): number {
  const f = hullMax > 0 ? hull / hullMax : 1;
  return f >= 0.5 ? 0 : Math.min(1, (0.5 - Math.max(0, f)) * 2 + 0.25);
}

/** The crosshair's hit marker for a tick: 'kill' for a projectile kill, 'hit' for a chip, else null. */
export function hitMarker(events: readonly SimEvent[]): 'kill' | 'hit' | null {
  let m: 'kill' | 'hit' | null = null;
  for (const e of events) {
    if (e.type === 'asteroidDestroyed' && (e.by === 'photon' || e.by === 'rocket')) return 'kill';
    if (e.type === 'asteroidHit') m = 'hit';
  }
  return m;
}

/** The combo badge beside the crosshair: "×3" with a scale that grows with the multiplier; empty under ×2. */
export function comboBadge(s: Pick<GameState, 'combo' | 'tick'>): { readonly text: string; readonly scale: number } {
  if (!comboLive(s.combo, s.tick)) return { text: '', scale: 1 };
  const m = comboMultiplier(s.combo.count);
  return m < 2 ? { text: '', scale: 1 } : { text: `×${String(m)}`, scale: 1 + 0.18 * (m - 2) };
}
