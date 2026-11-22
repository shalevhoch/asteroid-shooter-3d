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
