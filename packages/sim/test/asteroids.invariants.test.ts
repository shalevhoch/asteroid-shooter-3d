/** docs/spec/asteroids/asteroids.md INV-1..INV-5: id order, conservation of asteroid count, Earth health bounds. */
import { describe, expect, it } from 'vitest';
import { EARTH_MAX_HEALTH, SPLIT_COUNT, destroyAsteroid, nextFloat, step, type GameState, type RngState, type SimEvent } from '../src/index.js';
import { input, openSpace } from './helpers.js';

describe('asteroid invariants', () => {
  for (const seed of [1, 7, 99]) {
    it(`conserve asteroids across spawns, splits, kills and impacts (seed ${String(seed)})`, () => {
      let s: GameState = openSpace(seed);
      let r: RngState = seed * 7919;
      let spawned = 0;
      let impacts = 0;
      let kills = 0;
      let splits = 0;
      for (let t = 0; t < 6000 && !s.ended; t++) {
        const res = step(s, input());
        s = res.state;
        const events: SimEvent[] = [...res.events];
        // Randomly destroy an asteroid now and then, by photon or rocket, to exercise splits.
        const [u, r2] = nextFloat(r);
        r = r2;
        const victim = s.asteroids[Math.floor(u * 1000) % Math.max(1, s.asteroids.length)];
        if (victim && u < 0.01) s = destroyAsteroid(s, victim.id, u < 0.005 ? 'photon' : 'rocket', events);
        for (const e of events) {
          if (e.type === 'asteroidSpawned') spawned++;
          if (e.type === 'earthHit') impacts++;
          if (e.type === 'asteroidDestroyed') {
            kills++;
            if (e.size === 'big' && e.by === 'photon') splits++;
          }
        }
        // INV-1: alive = spawned + split pieces − impacts − kills.
        expect(s.asteroids.length).toBe(spawned + splits * SPLIT_COUNT - impacts - kills);
        // INV-2: ids strictly increasing and below nextId.
        const ids = s.asteroids.map((a) => a.id);
        expect(ids).toEqual([...ids].sort((a, b) => a - b));
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.every((id) => id < s.nextId)).toBe(true);
        // INV-3: Earth health within bounds and only decreasing.
        expect(s.earthHealth >= 0 && s.earthHealth <= EARTH_MAX_HEALTH).toBe(true);
      }
      expect(spawned).toBeGreaterThan(5);
    });
  }
});
