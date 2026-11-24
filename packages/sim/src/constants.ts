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
/** The space station (P18): a landmark above the asteroid lane, between the spawn line and Earth. */
export const STATION_POS: Vec3 = [1000, 1000, 0];
/** Flying within this of the station's centre reloads the ship, like the hangar. */
export const STATION_DOCK_RADIUS = 150;

// §3 Ship
export const SHIP_START: Vec3 = [0, -960, 0];
/** Player 2's hangar offset (P40): still inside HANGAR_RADIUS. */
export const SHIP2_OFFSET: Vec3 = [40, 0, 0];
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
/** Boss asteroid (P34): a huge, slow rock on every 5th wave. */
export const BOSS_RADIUS = 220;
export const BOSS_HP = 120;
export const BOSS_EARTH_DAMAGE = 40;
export const BOSS_POINTS = 300;
/** A rocket or a smart bomb chips a boss instead of destroying it. */
export const BOSS_ROCKET_DAMAGE = 15;
export const BOSS_BOMB_DAMAGE = 30;
/** The boss moves at this fraction of the wave's speed, and sheds a small asteroid every BOSS_CALVE_TICKS. */
export const BOSS_SPEED_SCALE = 0.45;
export const BOSS_CALVE_TICKS = 125;
/** Every BOSS_EVERY-th wave has a boss. */
export const BOSS_EVERY = 5;
/** Bonus credits for defeating a boss. */
export const BOSS_CREDITS = 100;
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

// §5 Weapons
export const PHOTON_COOLDOWN = 5;
export const PHOTON_SPEED = 36;
export const PHOTON_LIFE = 20;
/** Muzzle offset in ship-local terms: ahead, to the side (alternating), and down. */
export const MUZZLE_FORWARD = 50;
export const MUZZLE_SIDE = 12;
export const MUZZLE_DOWN = 8;
export const ROCKET_MAX = 3;
export const ROCKET_SPEED = 15;
export const ROCKET_LIFE = 400;
/** At launch, a rocket locks the asteroid closest to the crosshair within this angle of the ship's forward. */
export const ROCKET_LOCK_CONE = (30 * Math.PI) / 180;
/** The original's steering: dir += toTarget × ROCKET_STEER / distance … */
export const ROCKET_STEER = 6;
/** … but never weaker than this, so far targets don't take a huge loop. */
export const ROCKET_MIN_STEER = 0.15;
/** Inside this range the rocket aims straight at its target every tick, so it can't orbit it. */
export const ROCKET_TERMINAL_RANGE = 200;

// §6 Scoring
export const BIG_PHOTON_POINTS = 20;
export const BIG_ROCKET_POINTS = 15;
export const SMALL_PHOTON_POINTS = 10;
export const SMALL_ROCKET_POINTS = 8;
