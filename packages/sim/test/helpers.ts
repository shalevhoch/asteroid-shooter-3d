import { LOCAL_FORWARD, LOCAL_RIGHT, LOCAL_UP, NO_INPUT, rotate, type GameState, type Input, type Vec3 } from '../src/index.js';

export const input = (over: Partial<Input> = {}): Input => ({ ...NO_INPUT, ...over });
export const repeat = (n: number, i: Input): Input[] => Array.from({ length: n }, () => i);
export const forwardOf = (s: GameState): Vec3 => rotate(s.ship.rot, LOCAL_FORWARD);
export const upOf = (s: GameState): Vec3 => rotate(s.ship.rot, LOCAL_UP);
export const rightOf = (s: GameState): Vec3 => rotate(s.ship.rot, LOCAL_RIGHT);

/** Asserts two vectors agree to `digits` decimal places. */
export function expectVec(expect: (v: number) => { toBeCloseTo(e: number, d?: number): void }, a: Vec3, b: Vec3, digits = 6): void {
  for (let i = 0; i < 3; i++) expect(a[i] ?? NaN).toBeCloseTo(b[i] ?? NaN, digits);
}
