/** `step(state, input) → { state, events }`: one 40 ms tick (SPEC §7). Pure and deterministic. */
import { moveAsteroids } from './asteroids.js';
import { fly } from './flight.js';
import { applyHazards } from './hazards.js';
import { bossAttack, bossDefeats } from './boss.js';
import { updatePerks } from './perks.js';
import { applyUpgrades, speedScale, upgradedCraft } from './upgrades.js';
import { fire, moveProjectiles } from './weapons.js';
import { PRESETS, trackWave, updateWaves } from './waves.js';
import { NO_INPUT, type GameState, type Input, type RunEndReason, type ShipState, type SimEvent, type StepResult } from './state.js';

function flyOne(ship: ShipState, input: Input, drain: number, craft: ReturnType<typeof upgradedCraft>, speed: number): { ship: ShipState; events: readonly SimEvent[] } {
  return ship.hull <= 0 ? { ship, events: [] } : fly(ship, input, drain, craft, speed);
}

/** Applies P2's fire without losing P1's ship or missile locks. */
function fireP2(s: GameState, input: Input, events: SimEvent[], cone: number): GameState {
  const p2 = s.ship2;
  if (!p2) return s;
  if (p2.hull <= 0) return { ...s, ship2: { ...p2, photonCooldown: Math.max(0, p2.photonCooldown - 1) } };
  const p1 = s.ship;
  const lock1 = s.missileLock;
  const fired = fire({ ...s, ship: p2, missileLock: s.missileLock2 ?? null }, input, events, cone);
  return { ...fired, ship: p1, ship2: fired.ship, missileLock: lock1, missileLock2: fired.missileLock };
}


function withHazards(s: GameState, events: SimEvent[], refill: { fuel: number; hull: number; rockets: number }): GameState {
  const ship = s.ship.hull > 0 ? applyHazards(s.ship, events, refill) : s.ship;
  const ship2 = s.ship2 && s.ship2.hull > 0 ? applyHazards(s.ship2, events, refill) : s.ship2;
  return ship2 ? { ...s, ship, ship2 } : { ...s, ship };
}

export function step(state: GameState, input: Input, input2: Input = NO_INPUT): StepResult {
  if (state.ended) return { state, events: [] };
  const events: SimEvent[] = [];
  const tick = state.tick + 1;
  // 1. Apply input.
  const preset = PRESETS[state.difficulty];
  const craft = upgradedCraft(state);
  const speed = speedScale(state.upgrades);
  const refill = { fuel: craft.fuelMax, hull: craft.hullMax, rockets: craft.rocketMax };
  const f1 = flyOne(state.ship, input, preset.fuelDrain, craft, speed);
  events.push(...f1.events);
  let s: GameState = { ...state, tick, ship: f1.ship };
  if (state.ship2) {
    const f2 = flyOne(state.ship2, input2, preset.fuelDrain, craft, speed);
    events.push(...f2.events);
    s = { ...s, ship2: f2.ship };
  }
  // 1b. Weapons. Player 1 first, then player 2, so projectile ids stay deterministic.
  if (s.ship.hull > 0) s = fire(s, input, events, preset.rocketLockCone);
  else s = { ...s, ship: { ...s.ship, photonCooldown: Math.max(0, s.ship.photonCooldown - 1) } };
  s = fireP2(s, input2, events, preset.rocketLockCone);
  s = withHazards(s, events, refill);
  // 3. Waves: lead-in, spawns, wave clear. 4. Move asteroids, resolve Earth impacts.
  // 3b. Boss attack (P34): a boss sheds small asteroids.
  s = moveAsteroids(bossAttack(updateWaves(s, events), events), events, preset.earthDamageScale);
  // 5. Move projectiles, resolve hits, expire. 5b. Perks (P26): pickups, collection, drops. 6. Objective tallies, run end.
  s = trackWave(updatePerks(moveProjectiles(s, events), events, craft.hullMax), events);
  bossDefeats(s, events);
  // 6b. Upgrades (P29): bank credits, wave-start Earth shield.
  s = applyUpgrades(s, events);
  const shipsDown = s.ship.hull <= 0 && (s.ship2 === undefined || s.ship2.hull <= 0);
  const ended: RunEndReason | null = s.earthHealth <= 0 ? 'earthDestroyed' : shipsDown ? 'shipDestroyed' : null;
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

/** A two-player input log (P40). */
export function runCoop(state: GameState, inputs: readonly (readonly [Input, Input])[]): GameState {
  return inputs.reduce((s, [a, b]) => step(s, a, b).state, state);
}
