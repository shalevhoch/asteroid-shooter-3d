/** Scoring v2 (SPEC §6, P10): the combo multiplier and the wave-clear bonuses. Pure. */
import { EARTH_MAX_HEALTH } from './constants.js';
import type { SimEvent } from './state.js';

/** Ticks after a kill in which the next kill extends the combo (3 s). */
export const COMBO_WINDOW = 75;
/** The highest kill multiplier. */
export const COMBO_MAX_MULTIPLIER = 4;
/** Kills per multiplier step: kills 1–2 ×1, 3–4 ×2, 5–6 ×3, 7+ ×4. */
export const COMBO_STEP = 2;
/** Wave-clear bonus per wave number. */
export const WAVE_CLEAR_POINTS = 20;
/** Earth bonus at full health; scaled by Earth's health at the clear. */
export const EARTH_BONUS_MAX = 30;

export interface ComboState {
  /** Kills in the current chain; 0 = no chain. */
  readonly count: number;
  /** Tick of the chain's last kill. */
  readonly lastKillTick: number;
}

export const NO_COMBO: ComboState = { count: 0, lastKillTick: -Infinity };

/** The multiplier for the `count`th kill of a chain. */
export function comboMultiplier(count: number): number {
  return Math.min(COMBO_MAX_MULTIPLIER, 1 + Math.floor(Math.max(0, count - 1) / COMBO_STEP));
}

/** The chain after a kill on `tick`: extended inside the window, else a fresh chain of one. */
export function comboAfterKill(c: ComboState, tick: number): ComboState {
  return { count: tick - c.lastKillTick <= COMBO_WINDOW ? c.count + 1 : 1, lastKillTick: tick };
}

/** True while a kill on `tick` would still extend the chain. */
export const comboLive = (c: ComboState, tick: number): boolean => c.count > 0 && tick - c.lastKillTick <= COMBO_WINDOW;

/** Wave *n*'s clear bonus. */
export const clearBonus = (wave: number): number => WAVE_CLEAR_POINTS * wave;

/** The Earth bonus for clearing a wave with Earth at `health`. */
export const earthBonus = (health: number): number => Math.floor((EARTH_BONUS_MAX * Math.max(0, health)) / EARTH_MAX_HEALTH);

/** Every point a tick's events award: kills (with their multiplier), objectives and wave-clear bonuses. The score is always the sum of these. */
export function pointsIn(events: readonly SimEvent[]): number {
  let total = 0;
  for (const e of events) {
    if (e.type === 'asteroidDestroyed' || e.type === 'objectiveMet') total += e.points;
    else if (e.type === 'waveCleared') total += e.clearBonus + e.earthBonus;
  }
  return total;
}
