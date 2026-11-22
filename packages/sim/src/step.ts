/** `step(state, input) → { state, events }`: one 40 ms tick (SPEC §7). Pure and deterministic. */
import { moveAsteroids } from './asteroids.js';
import { fly } from './flight.js';
import { CRAFTS } from './crafts.js';
import { applyHazards } from './hazards.js';
import { fire, moveProjectiles } from './weapons.js';
import { PRESETS, trackWave, updateWaves } from './waves.js';
import type { GameState, Input, RunEndReason, SimEvent, StepResult } from './state.js';

export function step(state: GameState, input: Input): StepResult {
  if (state.ended) return { state, events: [] };
  const events: SimEvent[] = [];
  const tick = state.tick + 1;
  // 1. Apply input.
  const preset = PRESETS[state.difficulty];
  const craft = CRAFTS[state.craft];
  const flown = fly(state.ship, input, preset.fuelDrain, craft);
  events.push(...flown.events);
  let s: GameState = fire({ ...state, tick, ship: flown.ship }, input, events, preset.rocketLockCone);
  // 2. Ship hazards.
  s = { ...s, ship: applyHazards(s.ship, events, { fuel: craft.fuelMax, hull: craft.hullMax, rockets: craft.rocketMax }) };
  // 3. Waves: lead-in, spawns, wave clear. 4. Move asteroids, resolve Earth impacts.
  s = moveAsteroids(updateWaves(s, events), events, preset.earthDamageScale);
  // 5. Move projectiles, resolve hits, expire. 6. Objective tallies, run end.
  s = trackWave(moveProjectiles(s, events), events);
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
