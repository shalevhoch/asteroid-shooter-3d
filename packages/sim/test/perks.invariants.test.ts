/** P26 perk invariants over long noisy runs. */
import { describe, expect, it } from 'vitest';
import { PICKUP_LIFE, PERK_DURATION, initialState, rollDrops, step, type GameState, type SimEvent } from '../src/index.js';
import { aimbot } from './helpers.js';

const lcg = (seed: number) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

describe('perk invariants', () => {
  it('drops never touch the main RNG', () => {
    const s = initialState(11);
    const ev: SimEvent[] = Array.from({ length: 50 }, (_, i) => ({ type: 'asteroidDestroyed', id: i, size: 'small', by: 'photon', pos: [0, 0, 0], points: 1, base: 1, combo: 1, multiplier: 1 }));
    expect(rollDrops(s, ev, 100).rng).toBe(s.rng);
  });

  it('pickups stay sorted by unique id, younger than their life; perks stay within their durations; replays match', () => {
    for (const seed of [1, 2, 3]) {
      const r = lcg(seed);
      const inputs = [];
      let s: GameState = initialState(seed);
      for (let t = 0; t < 4000 && !s.ended; t++) {
        const i = aimbot(s, r);
        inputs.push(i);
        s = step(s, i).state;
        const ids = s.pickups.map((p) => p.id);
        expect(ids).toEqual([...ids].sort((a, b) => a - b));
        expect(new Set(ids).size).toBe(ids.length);
        for (const p of s.pickups) expect(p.age).toBeLessThan(PICKUP_LIFE);
        for (const [k, v] of Object.entries(s.perks)) expect(v).toBeLessThanOrEqual(PERK_DURATION[k as keyof typeof PERK_DURATION]);
      }
      const again = inputs.reduce((x, i) => step(x, i).state, initialState(seed));
      expect(again).toEqual(s);
    }
  });
});
