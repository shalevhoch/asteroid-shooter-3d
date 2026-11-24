/** `step(state, input) → { state, events }`: one 40 ms tick (SPEC §7). Pure and deterministic. */
import { moveAsteroids } from './asteroids.js';
import { fly } from './flight.js';
import { applyHazards } from './hazards.js';
import { bossAttack, bossDefeats } from './boss.js';
import { updatePerks } from './perks.js';
import { applyUpgrades, speedScale, upgradedCraft } from './upgrades.js';
import { fire, moveProjectiles } from './weapons.js';
import { PRESETS, trackWave, updateWaves } from './waves.js';
import type { GameState, Input, RunEndReason, SimEvent, StepResult } from './state.js';

export function step(state: GameState, input: Input): StepResult {
  if (state.ended) return { state, events: [] };
  const events: SimEvent[] = [];
  const tick = state.tick + 1;
  // 1. Apply input.
  const preset = PRESETS[state.difficulty];
  const craft = upgradedCraft(state);
  const flown = fly(state.ship, input, preset.fuelDrain, craft, speedScale(state.upgrades));
  events.push(...flown.events);
  let s: GameState = fire({ ...state, tick, ship: flown.ship }, input, events, preset.rocketLockCone);
  // 2. Ship hazards.
  s = { ...s, ship: applyHazards(s.ship, events, { fuel: craft.fuelMax, hull: craft.hullMax, rockets: craft.rocketMax }) };
  // 3. Waves: lead-in, spawns, wave clear. 4. Move asteroids, resolve Earth impacts.
  // 3b. Boss attack (P34): a boss sheds small asteroids.
  s = moveAsteroids(bossAttack(updateWaves(s, events), events), events, preset.earthDamageScale);
  // 5. Move projectiles, resolve hits, expire. 5b. Perks (P26): pickups, collection, drops. 6. Objective tallies, run end.
  s = trackWave(updatePerks(moveProjectiles(s, events), events, craft.hullMax), events);
  bossDefeats(s, events);
  // 6b. Upgrades (P29): bank credits, wave-start Earth shield.
  s = applyUpgrades(s, events);
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
