import { LOCAL_FORWARD, LOCAL_RIGHT, LOCAL_UP, NO_INPUT, dot, initialState, normalize, rotate, sub, type GameState, type Input, type Vec3 } from '../src/index.js';

export const input = (over: Partial<Input> = {}): Input => ({ ...NO_INPUT, ...over });
export const repeat = (n: number, i: Input): Input[] => Array.from({ length: n }, () => i);
export const forwardOf = (s: GameState): Vec3 => rotate(s.ship.rot, LOCAL_FORWARD);
export const upOf = (s: GameState): Vec3 => rotate(s.ship.rot, LOCAL_UP);
export const rightOf = (s: GameState): Vec3 => rotate(s.ship.rot, LOCAL_RIGHT);

/** Asserts two vectors agree to `digits` decimal places. */
export function expectVec(expect: (v: number) => { toBeCloseTo(e: number, d?: number): void }, a: Vec3, b: Vec3, digits = 6): void {
  for (let i = 0; i < 3; i++) expect(a[i] ?? NaN).toBeCloseTo(b[i] ?? NaN, digits);
}

/** A fresh run with the ship moved into open space at the origin, clear of the hangar's refill and of Earth. */
export function openSpace(seed = 1): GameState {
  const s = initialState(seed);
  return { ...s, ship: { ...s.ship, pos: [0, 0, 0] } };
}

/** A crude autopilot: steer at the nearest asteroid, fire when roughly lined up, with some noise. */
export function aimbot(s: GameState, r: () => number): Input {
  const ship = s.ship;
  const target = s.asteroids.reduce<GameState['asteroids'][number] | null>((best, a) => (!best || dot(sub(a.pos, ship.pos), sub(a.pos, ship.pos)) < dot(sub(best.pos, ship.pos), sub(best.pos, ship.pos)) ? a : best), null);
  if (!target) return input({ yaw: r() * 2 - 1, throttle: r() < 0.1 ? 1 : 0 });
  const d = normalize(sub(target.pos, ship.pos));
  const x = dot(d, rotate(ship.rot, LOCAL_RIGHT));
  const y = dot(d, rotate(ship.rot, LOCAL_UP));
  const z = dot(d, rotate(ship.rot, LOCAL_FORWARD));
  const lined = z > 0.995;
  return input({ yaw: z < 0 && Math.abs(x) < 0.2 ? 1 : x * 8, pitch: y * 8, firePhoton: lined && r() < 0.9, fireRocket: lined && r() < 0.02, throttle: r() < 0.3 ? 1 : -1 });
}

