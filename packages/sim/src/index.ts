/**
 * @asteroid/sim — the pure game core (ADR 0001).
 *
 * `step(state, input) → { state, events }` advances one fixed tick. This module also fixes the
 * tick contract every later packet builds on. No DOM, no three.js, no clock, no Math.random here.
 */

/** Sim ticks per second. The original game's physics timer ran every 40 ms. */
export const TICK_HZ = 25;

/** Milliseconds per tick, derived from {@link TICK_HZ}. */
export const TICK_MS = 1000 / TICK_HZ;

/**
 * How many whole ticks fit in an accumulated frame time, and the remainder to carry.
 * The renderer's fixed-step loop calls this each animation frame.
 */
export function ticksFor(accumulatedMs: number): { ticks: number; remainderMs: number } {
  if (!Number.isFinite(accumulatedMs) || accumulatedMs <= 0) return { ticks: 0, remainderMs: 0 };
  const ticks = Math.floor(accumulatedMs / TICK_MS);
  return { ticks, remainderMs: accumulatedMs - ticks * TICK_MS };
}

export { MOTHERSHIP_BOXES } from './data/mothershipBoxes.js';
export * from './constants.js';
export * from './state.js';
export * from './vec3.js';
export * from './quat.js';
export * from './rng.js';
export { fly, turn, axis } from './flight.js';
export { MOTHERSHIP_WORLD_BOXES, resolveMothership, sphereHitsBox, pushOut, type Box } from './mothership.js';
export { step, run } from './step.js';
export { makeAsteroid, spawn, moveAsteroids, destroyAsteroid, radiusOf, hpOf, earthDamageOf } from './asteroids.js';
export { applyHazards, HANGAR_CENTRE } from './hazards.js';
