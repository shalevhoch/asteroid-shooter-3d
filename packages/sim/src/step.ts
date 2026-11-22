/** `step(state, input) → { state, events }`: one 40 ms tick (SPEC §7). Pure and deterministic. */
import { moveAsteroids, spawn } from './asteroids.js';
import { fly } from './flight.js';
import { applyHazards } from './hazards.js';
import type { GameState, Input, RunEndReason, SimEvent, StepResult } from './state.js';

export function step(state: GameState, input: Input): StepResult {
  if (state.ended) return { state, events: [] };
  const events: SimEvent[] = [];
  const tick = state.tick + 1;
  // 1. Apply input.
  const flown = fly(state.ship, input);
  events.push(...flown.events);
  // 2. Ship hazards.
  let s: GameState = { ...state, tick, ship: applyHazards(flown.ship, events) };
  // 3. Spawn. 4. Move asteroids, resolve Earth impacts.
  s = moveAsteroids(spawn(s, tick, events), events);
  // 5. Projectiles land in P06. 6. Run end.
  const ended: RunEndReason | null = s.earthHealth <= 0 ? 'earthDestroyed' : s.ship.hull <= 0 ? 'shipDestroyed' : null;
  if (ended) {
    s = { ...s, ended };
    events.push({ type: 'runEnded', reason: ended });
  }
  return { state: s, events };
}

/** Runs an input log from a state; the replay contract (same seed + inputs → deep-equal state). */
export function run(state: GameState, inputs: readonly Input[]): GameState {
  return inputs.reduce((s, input) => step(s, input).state, state);
}
