/** `step(state, input) → { state, events }`: one 40 ms tick (SPEC §7). Pure and deterministic. */
import { fly } from './flight.js';
import { resolveMothership } from './mothership.js';
import type { GameState, Input, SimEvent, StepResult } from './state.js';

export function step(state: GameState, input: Input): StepResult {
  const events: SimEvent[] = [];
  // 1. Apply input.
  const flown = fly(state.ship, input);
  events.push(...flown.events);
  // 2. Ship hazards: mothership push-out (hangar, atmosphere and Earth contact land with P05).
  let ship = flown.ship;
  const hull = resolveMothership(ship.pos);
  if (hull.bumped) {
    ship = { ...ship, pos: hull.pos, throttle: Math.max(0, ship.throttle - 1) };
    events.push({ type: 'mothershipBump' });
  }
  return { state: { ...state, tick: state.tick + 1, ship }, events };
}

/** Runs an input log from a state; the replay contract (same seed + inputs → deep-equal state). */
export function run(state: GameState, inputs: readonly Input[]): GameState {
  return inputs.reduce((s, input) => step(s, input).state, state);
}
