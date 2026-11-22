/** docs/spec/weapons/weapons.md: "a rocket always reaches its target" and score/projectile invariants. */
import { describe, expect, it } from 'vitest';
import { ROCKET_LIFE, makeAsteroid, nextFloat, pointsIn, step, type GameState, type RngState, type SimEvent } from '../src/index.js';
import { input, openSpace } from './helpers.js';

function rng(seed: number) {
  let r: RngState = seed;
  return () => {
    const [u, n] = nextFloat(r);
    r = n;
    return u;
  };
}

const O: [number, number, number] = [0, 3000, -2000];

describe('rocket always reaches its target', () => {
  it('hits a locked, moving asteroid placed anywhere within 2000 units, in any direction, before ROCKET_LIFE runs out', () => {
    const next = rng(2024);
    for (let trial = 0; trial < 1000; trial++) {
      // A random direction and distance, a random approach heading, either size.
      const z = next() * 2 - 1;
      const t = next() * Math.PI * 2;
      const rr = Math.sqrt(1 - z * z);
      const dist = 150 + next() * 1850;
      // Far from Earth and the mothership, which would legitimately absorb the rocket.
      const pos: [number, number, number] = [O[0] + rr * Math.cos(t) * dist, O[1] + rr * Math.sin(t) * dist, O[2] + z * dist];
      const size = next() < 0.5 ? 'big' : 'small';
      const heading: [number, number, number] = [next() - 0.5, next() - 0.5, next() - 0.5];
      const n = Math.hypot(...heading) || 1;
      const a = { ...makeAsteroid(1, size, pos), dir: [heading[0] / n, heading[1] / n, heading[2] / n] as const };
      const s0 = openSpace();
      let s: GameState = { ...s0, asteroids: [a], nextId: 2, projectiles: [{ id: 1, kind: 'rocket', pos: O, dir: [0, 0, 1], age: 0, target: 1 }], nextProjectileId: 2 };
      let hit = false;
      for (let tick = 0; tick < ROCKET_LIFE && !hit; tick++) {
        const r = step(s, input());
        s = r.state;
        hit = r.events.some((e: SimEvent) => e.type === 'asteroidDestroyed' && e.id === 1 && e.by === 'rocket');
      }
      expect(hit, `trial ${String(trial)}: ${size} at ${pos.map(Math.round).join(',')}`).toBe(true);
    }
  });
});

describe('weapon invariants', () => {
  it('over a random dogfight: score = sum of scored events (kills, objectives, clear bonuses), projectiles stay sorted and alive within their life', () => {
    const next = rng(77);
    let s = openSpace(77);
    s = { ...s, asteroids: [1, 2, 3, 4, 5].map((id) => makeAsteroid(id, id % 2 ? 'big' : 'small', [-600 + id * 100, (next() - 0.5) * 400, 400 + id * 80])), nextId: 6 };
    let points = 0;
    for (let t = 0; t < 4000 && !s.ended; t++) {
      const r = step(s, input({ pitch: next() * 2 - 1, yaw: next() * 2 - 1, firePhoton: next() < 0.7, fireRocket: next() < 0.01, throttle: next() < 0.05 ? 1 : 0 }));
      s = r.state;
      points += pointsIn(r.events);
      expect(s.score).toBe(points);
      const ids = s.projectiles.map((p) => p.id);
      expect(ids).toEqual([...ids].sort((a, b) => a - b));
      for (const p of s.projectiles) expect(p.age).toBeLessThan(p.kind === 'photon' ? 20 : ROCKET_LIFE);
      expect(s.ship.rockets >= 0 && s.ship.rockets <= 3).toBe(true);
    }
    expect(points).toBeGreaterThan(0);
  });
});
