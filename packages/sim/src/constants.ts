/** SPEC.md named constants (§2–§3). Change values here; rules stay in SPEC.md. */
import type { Vec3 } from './vec3.js';

const DEG = Math.PI / 180;

// §2 World
export const EARTH_POS: Vec3 = [3000, 0, 0];
export const EARTH_RADIUS = 920;
export const ATMOSPHERE_RADIUS = 1.5 * EARTH_RADIUS;
export const MOTHERSHIP_POS: Vec3 = [0, -1180, 40];
export const MOTHERSHIP_SCALE = 5;
export const HANGAR_OFFSET: Vec3 = [0, 150, 0];
export const HANGAR_RADIUS = 100;

// §3 Ship
export const SHIP_START: Vec3 = [0, -960, 0];
export const TURN_RATE = 2 * DEG;
export const THROTTLE_MAX = 4;
export const THROTTLE_STEP = 1;
export const TURBO_STEP = 8;
export const FUEL_MAX = 600;
export const STRAFE_STEP = 1;
export const HULL_MAX = 100;
export const SHIP_RADIUS = 20;
export const ATMOSPHERE_BURN = 1;
export const EARTH_MAX_HEALTH = 100;

// §4 Asteroids
export const BIG_RADIUS = 100;
export const BIG_HP = 20;
export const SMALL_RADIUS = 20;
export const SMALL_HP = 8;
export const SPAWN_INTERVAL = 200;
export const SPAWN_X = -800;
export const SPAWN_SPREAD_MIN = -500;
export const SPAWN_SPREAD_MAX = 500;
export const BIG_CHANCE = 1 / 5;
export const ASTEROID_SPEED = 3;
export const BIG_EARTH_DAMAGE = 10;
export const SMALL_EARTH_DAMAGE = 2;
/** The original's split offsets (BigAsteroid.java), one small asteroid per entry. */
export const SPLIT_OFFSETS: readonly Vec3[] = [
  [20, 20, 20],
  [0, 20, 20],
  [20, -20, 20],
  [-20, 20, 0],
];
export const SPLIT_COUNT = SPLIT_OFFSETS.length;
