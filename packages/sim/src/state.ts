/** Game state, input and events: the sim's whole public data model (ADR 0001). */
import { EARTH_MAX_HEALTH, SHIP_START } from './constants.js';
import { CRAFTS, type CraftId } from './crafts.js';
import { fromAxisAngle, type Quat } from './quat.js';
import { seedRng, type RngState } from './rng.js';
import type { Vec3 } from './vec3.js';
import { NO_COMBO, type ComboState } from './scoring.js';
import { NO_PERKS, perkSeed, type ActivePerks, type PerkKind, type PickupState, type TimedPerk } from './perks.js';
import { INITIAL_WAVE, type Difficulty, type Objective, type WaveState } from './waves.js';

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
  readonly rockets: number;
  /** Ticks until the photon guns can fire again. */
  readonly photonCooldown: number;
  /** Which wing fires the next photon: +1 right, −1 left. */
  readonly photonSide: 1 | -1;
}

export type ProjectileKind = 'photon' | 'rocket';

export interface ProjectileState {
  readonly id: number;
  readonly kind: ProjectileKind;
  readonly pos: Vec3;
  /** Unit direction of travel. */
  readonly dir: Vec3;
  /** Ticks of flight so far. */
  readonly age: number;
  /** Rockets: the locked asteroid id, or null while searching. Photons: always null. */
  readonly target: number | null;
}

export type AsteroidSize = 'big' | 'small';

export interface AsteroidState {
  /** Unique and increasing; every iteration over asteroids goes in id order (SPEC §4). */
  readonly id: number;
  readonly size: AsteroidSize;
  readonly pos: Vec3;
  /** Unit direction toward Earth's centre, fixed at spawn. */
  readonly dir: Vec3;
  readonly hp: number;
  /** Units per tick, fixed at spawn (the wave's speed × the preset's scale); split pieces inherit it. */
  readonly speed: number;
}

export type RunEndReason = 'earthDestroyed' | 'shipDestroyed';

export interface GameState {
  readonly tick: number;
  readonly rng: RngState;
  readonly ship: ShipState;
  /** Sorted by id. */
  readonly asteroids: readonly AsteroidState[];
  readonly nextId: number;
  readonly earthHealth: number;
  /** Sorted by id. */
  readonly projectiles: readonly ProjectileState[];
  readonly nextProjectileId: number;
  readonly score: number;
  /** The kill chain behind the combo multiplier (SPEC §6). */
  readonly combo: ComboState;
  readonly difficulty: Difficulty;
  /** The player's ship (P17). */
  readonly craft: CraftId;
  readonly wave: WaveState;
  /** Perk pickups in flight (P26), sorted by id. */
  readonly pickups: readonly PickupState[];
  readonly nextPickupId: number;
  /** The perk drop stream (P26), separate from `rng` so drops never shift the main sequence. */
  readonly perkRng: RngState;
  /** Ticks left on each timed perk; 0 = off. */
  readonly perks: ActivePerks;
  /** Set on the tick the run ends; `step` is then a no-op. */
  readonly ended: RunEndReason | null;
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
  /** Held: photons fire every PHOTON_COOLDOWN ticks. */
  readonly firePhoton: boolean;
  /** One rocket per tick this is true (the renderer sends one tick per press). */
  readonly fireRocket: boolean;
}

export const NO_INPUT: Input = {
  pitch: 0,
  yaw: 0,
  roll: 0,
  throttle: 0,
  turbo: false,
  strafeX: 0,
  strafeY: 0,
  reverse: false,
  firePhoton: false,
  fireRocket: false,
};

/** `bomb`: the smart-bomb perk (P26), scored as a rocket kill. */
export type KillCause = 'photon' | 'rocket' | 'bomb';

export type SimEvent =
  | { readonly type: 'mothershipBump' }
  | { readonly type: 'shipReloaded'; readonly at: 'mothership' | 'station' }
  | { readonly type: 'hullBurning' }
  | { readonly type: 'asteroidSpawned'; readonly id: number; readonly size: AsteroidSize }
  | { readonly type: 'earthHit'; readonly id: number; readonly size: AsteroidSize; readonly damage: number; readonly pos: Vec3 }
  | { readonly type: 'asteroidDestroyed'; readonly id: number; readonly size: AsteroidSize; readonly by: KillCause; readonly pos: Vec3; readonly points: number; readonly base: number; readonly combo: number; readonly multiplier: number }
  | { readonly type: 'asteroidHit'; readonly id: number; readonly hp: number; readonly pos: Vec3 }
  | { readonly type: 'photonFired'; readonly id: number; readonly pos: Vec3 }
  | { readonly type: 'rocketFired'; readonly id: number; readonly pos: Vec3; readonly target: number | null }
  | { readonly type: 'rocketLocked'; readonly id: number; readonly target: number }
  | { readonly type: 'projectileSpent'; readonly id: number; readonly kind: ProjectileKind; readonly pos: Vec3; readonly on: 'asteroid' | 'earth' | 'mothership' }
  | { readonly type: 'runEnded'; readonly reason: RunEndReason }
  | { readonly type: 'waveStarted'; readonly wave: number; readonly count: number; readonly objective: Objective | null }
  | { readonly type: 'waveCleared'; readonly wave: number; readonly objectiveMet: boolean; readonly regen: number; readonly clearBonus: number; readonly earthBonus: number }
  | { readonly type: 'objectiveMet'; readonly wave: number; readonly points: number; readonly repair: number }
  | { readonly type: 'campaignWon'; readonly wave: number }
  | { readonly type: 'turboStarted' }
  | { readonly type: 'turboEnded' }
  | { readonly type: 'fuelEmpty' }
  | { readonly type: 'perkDropped'; readonly id: number; readonly kind: PerkKind; readonly pos: Vec3 }
  | { readonly type: 'perkCollected'; readonly id: number; readonly kind: PerkKind; readonly pos: Vec3 }
  | { readonly type: 'perkExpired'; readonly kind: TimedPerk }
  | { readonly type: 'pickupExpired'; readonly id: number }
  | { readonly type: 'smartBomb'; readonly pos: Vec3; readonly count: number }
  | { readonly type: 'shieldBlocked'; readonly id: number; readonly size: AsteroidSize; readonly pos: Vec3 };

export interface StepResult {
  readonly state: GameState;
  readonly events: readonly SimEvent[];
}

/** Start facing +Z, out of the hangar bay's open end, with up +Y: local −Z turned 180° about +Y. */
export const START_ROT: Quat = fromAxisAngle([0, 1, 0], Math.PI);

export function initialState(seed: number, difficulty: Difficulty = 'normal', craft: CraftId = 'fighter'): GameState {
  const c = CRAFTS[craft];
  return {
    tick: 0,
    rng: seedRng(seed),
    ship: { pos: SHIP_START, rot: START_ROT, throttle: 0, fuel: c.fuelMax, hull: c.hullMax, turbo: false, rockets: c.rocketMax, photonCooldown: 0, photonSide: 1 },
    asteroids: [],
    projectiles: [],
    nextProjectileId: 1,
    score: 0,
    combo: NO_COMBO,
    nextId: 1,
    earthHealth: EARTH_MAX_HEALTH,
    difficulty,
    craft,
    wave: INITIAL_WAVE,
    pickups: [],
    nextPickupId: 1,
    perkRng: perkSeed(seed),
    perks: NO_PERKS,
    ended: null,
  };
}
