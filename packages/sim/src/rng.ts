/**
 * The run's only source of randomness: mulberry32 over a uint32 state kept in the game state.
 * Pure: it returns the value and the next state.
 */
export type RngState = number;

export const seedRng = (seed: number): RngState => seed >>> 0;

/** A float in [0, 1), and the next RNG state. */
export function nextFloat(rng: RngState): [number, RngState] {
  const next = (rng + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, next];
}

/** A float in [min, max), and the next RNG state. */
export function nextRange(rng: RngState, min: number, max: number): [number, RngState] {
  const [u, next] = nextFloat(rng);
  return [min + u * (max - min), next];
}
