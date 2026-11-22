import { LOCAL_FORWARD, LOCAL_RIGHT, LOCAL_UP, NO_INPUT, initialState, rotate, type GameState, type Input, type Vec3 } from '../src/index.js';

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
