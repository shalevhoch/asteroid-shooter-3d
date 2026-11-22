/** Game state, input and events: the sim's whole public data model (ADR 0001). */
import { SHIP_START, FUEL_MAX, HULL_MAX } from './constants.js';
import { fromAxisAngle, type Quat } from './quat.js';
import { seedRng, type RngState } from './rng.js';
import type { Vec3 } from './vec3.js';

/** Ship-local axes: right +X, up +Y, forward −Z (so right = forward × up, SPEC §3). */
export const LOCAL_RIGHT: Vec3 = [1, 0, 0];
export const LOCAL_UP: Vec3 = [0, 1, 0];
export const LOCAL_FORWARD: Vec3 = [0, 0, -1];

export interface ShipState {
  readonly pos: Vec3;
  readonly rot: Quat;
  /** Throttle level, 0..THROTTLE_MAX. */
  readonly throttle: number;
  readonly fuel: number;
  readonly hull: number;
  /** True on ticks the turbo actually moved the ship (the renderer widens the FOV). */
  readonly turbo: boolean;
}

export interface GameState {
  readonly tick: number;
  readonly rng: RngState;
  readonly ship: ShipState;
}

/** One tick of player intent. Axes are clamped to [−1, 1]; anything non-finite counts as 0. */
export interface Input {
  /** +1 = nose up. */
  readonly pitch: number;
  /** +1 = nose right. */
  readonly yaw: number;
  /** +1 = roll right (right wing down). */
  readonly roll: number;
  /** +1 / −1 changes the throttle level by one this tick. */
  readonly throttle: number;
  readonly turbo: boolean;
  /** +1 = right, −1 = left. */
  readonly strafeX: number;
  /** +1 = up, −1 = down. */
  readonly strafeY: number;
  readonly reverse: boolean;
}

export const NO_INPUT: Input = { pitch: 0, yaw: 0, roll: 0, throttle: 0, turbo: false, strafeX: 0, strafeY: 0, reverse: false };

export type SimEvent =
  | { readonly type: 'mothershipBump' }
  | { readonly type: 'turboStarted' }
  | { readonly type: 'turboEnded' }
  | { readonly type: 'fuelEmpty' };

export interface StepResult {
  readonly state: GameState;
  readonly events: readonly SimEvent[];
}

/** Start facing +Z, out of the hangar bay's open end, with up +Y: local −Z turned 180° about +Y. */
export const START_ROT: Quat = fromAxisAngle([0, 1, 0], Math.PI);

export function initialState(seed: number): GameState {
  return {
    tick: 0,
    rng: seedRng(seed),
    ship: { pos: SHIP_START, rot: START_ROT, throttle: 0, fuel: FUEL_MAX, hull: HULL_MAX, turbo: false },
  };
}
