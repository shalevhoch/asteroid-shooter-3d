/**
 * Crafts (P17, SPEC §3): the player's choice of ship. The Fighter is the original ship with the §3 stats unchanged;
 * the others trade turn rate, fuel, rockets and hull against each other.
 */
import { FUEL_MAX, HULL_MAX, ROCKET_MAX, TURN_RATE } from './constants.js';

export type CraftId = 'fighter' | 'interceptor' | 'shuttle';
export const CRAFT_IDS: readonly CraftId[] = ['fighter', 'interceptor', 'shuttle'];

export interface Craft {
  /** Radians per tick at full axis. */
  readonly turnRate: number;
  readonly fuelMax: number;
  readonly rocketMax: number;
  readonly hullMax: number;
}

export const CRAFTS: Readonly<Record<CraftId, Craft>> = {
  /** The original ship: exactly the §3 numbers. */
  fighter: { turnRate: TURN_RATE, fuelMax: FUEL_MAX, rocketMax: ROCKET_MAX, hullMax: HULL_MAX },
  /** Nimble and fragile: turns 25 % faster, 3/4 of the fuel, 2 rockets, 3/4 of the hull. */
  interceptor: { turnRate: TURN_RATE * 1.25, fuelMax: FUEL_MAX * 0.75, rocketMax: ROCKET_MAX - 1, hullMax: HULL_MAX * 0.75 },
  /** Heavy hauler: turns 20 % slower, 1.5× the fuel, 5 rockets, 1.4× the hull. */
  shuttle: { turnRate: TURN_RATE * 0.8, fuelMax: FUEL_MAX * 1.5, rocketMax: ROCKET_MAX + 2, hullMax: HULL_MAX * 1.4 },
};
