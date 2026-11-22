/** SPEC §11: time to impact. */
import { describe, expect, it } from 'vitest';
import { type GameState, ASTEROID_SPEED, EARTH_POS, EARTH_RADIUS, SMALL_RADIUS, BIG_RADIUS, makeAsteroid, mostUrgent, step, timeToImpact } from '../src/index.js';
import { input, openSpace } from './helpers.js';

describe('time to impact', () => {
  it('is the surface gap over the speed', () => {
    const a = makeAsteroid(1, 'small', [EARTH_POS[0] - EARTH_RADIUS - SMALL_RADIUS - 300, 0, 0]);
    expect(timeToImpact(a)).toBeCloseTo(300 / ASTEROID_SPEED, 9);
    expect(timeToImpact({ ...a, speed: 0 })).toBe(Infinity);
  });

  it('predicts the tick the impact happens', () => {
    const a = makeAsteroid(1, 'big', [EARTH_POS[0] - EARTH_RADIUS - BIG_RADIUS - 30, 0, 0]);
    let s: GameState = { ...openSpace(), asteroids: [a], nextId: 2 };
    const predicted = Math.ceil(timeToImpact(a));
    let t = 0;
    while (s.asteroids.length > 0 && t < 100) {
      s = step(s, input()).state;
      t++;
    }
    expect(t).toBe(predicted);
  });

  it('picks the soonest impact, ties to the lowest id', () => {
    const near = makeAsteroid(5, 'small', [2000, 0, 0]);
    const far = makeAsteroid(2, 'small', [-800, 0, 0]);
    const twin = makeAsteroid(3, 'small', [2000, 0, 0]);
    expect(mostUrgent([far, near, twin])?.id).toBe(3);
    expect(mostUrgent([])).toBeNull();
  });
});
