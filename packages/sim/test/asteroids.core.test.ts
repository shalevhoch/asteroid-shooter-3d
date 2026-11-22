/** docs/spec/asteroids/asteroids.core.feature: SPEC.md §4 and the §3 ship hazards. */
import { describe, expect, it } from 'vitest';
import {
  ASTEROID_SPEED,
  ATMOSPHERE_RADIUS,
  BIG_EARTH_DAMAGE,
  BIG_HP,
  EARTH_MAX_HEALTH,
  EARTH_POS,
  EARTH_RADIUS,
  FUEL_MAX,
  HANGAR_CENTRE,
  HULL_MAX,
  SMALL_EARTH_DAMAGE,
  SMALL_HP,
  SPAWN_INTERVAL,
  destroyAsteroid,
  distance,
  initialState,
  makeAsteroid,
  run,
  step,
  type GameState,
  type SimEvent,
} from '../src/index.js';
import { input, openSpace, repeat } from './helpers.js';

const idle = (n: number) => repeat(n, input());
const collect = (s: GameState, n: number) => {
  const events: SimEvent[] = [];
  for (let i = 0; i < n; i++) {
    const r = step(s, input());
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
};
const withAsteroids = (s: GameState, ...as: ReturnType<typeof makeAsteroid>[]): GameState => ({
  ...s,
  asteroids: as,
  nextId: Math.max(0, ...as.map((a) => a.id)) + 1,
});

describe('asteroids', () => {
  it('spawns the first asteroid on tick SPAWN_INTERVAL and one every interval after', () => {
    expect(run(openSpace(), idle(SPAWN_INTERVAL - 1)).asteroids).toHaveLength(0);
    const first = run(openSpace(), idle(SPAWN_INTERVAL));
    expect(first.asteroids).toHaveLength(1);
    expect(first.asteroids[0]?.id).toBe(1);
    expect(run(openSpace(), idle(3 * SPAWN_INTERVAL)).asteroids.map((a) => a.id)).toEqual([1, 2, 3]);
  });

  it('spawns at x = −800 with y, z in [−500, 500), aimed at Earth, with full HP', () => {
    const { state, events } = collect(openSpace(), SPAWN_INTERVAL);
    const a = state.asteroids[0];
    if (!a) throw new Error('no asteroid');
    expect(a.pos[0]).toBeCloseTo(-800 + ASTEROID_SPEED * a.dir[0], 9);
    for (const v of [a.pos[1], a.pos[2]]) expect(v >= -510 && v < 510).toBe(true);
    expect(a.hp).toBe(a.size === 'big' ? BIG_HP : SMALL_HP);
    expect(events).toContainEqual({ type: 'asteroidSpawned', id: 1, size: a.size });
  });

  it('spawns big about one time in five', () => {
    let bigs = 0;
    const seeds = 400;
    for (let seed = 1; seed <= seeds; seed++) if (run(openSpace(seed), idle(SPAWN_INTERVAL)).asteroids[0]?.size === 'big') bigs++;
    expect(bigs / seeds).toBeGreaterThan(0.12);
    expect(bigs / seeds).toBeLessThan(0.28);
  });

  it('moves ASTEROID_SPEED per tick straight at Earth', () => {
    const a = makeAsteroid(1, 'small', [0, 300, 0]);
    const s = run(withAsteroids(openSpace(), a), idle(10));
    const moved = s.asteroids[0];
    expect(moved && distance(moved.pos, a.pos)).toBeCloseTo(10 * ASTEROID_SPEED, 9);
    expect(moved && distance(EARTH_POS, a.pos) - distance(EARTH_POS, moved.pos)).toBeCloseTo(10 * ASTEROID_SPEED, 6);
  });

  it('hits Earth: the asteroid is gone and Earth loses 10 (big) or 2 (small)', () => {
    const near = (dx: number): [number, number, number] => [EARTH_POS[0] - dx, 0, 0];
    const big = makeAsteroid(1, 'big', near(EARTH_RADIUS + 100 + 2));
    const small = makeAsteroid(2, 'small', [EARTH_POS[0], EARTH_RADIUS + 20 + 2, 0]);
    const { state, events } = collect(withAsteroids(openSpace(), big, small), 1);
    expect(state.asteroids).toHaveLength(0);
    expect(state.earthHealth).toBe(EARTH_MAX_HEALTH - BIG_EARTH_DAMAGE - SMALL_EARTH_DAMAGE);
    expect(events.flatMap((e) => (e.type === 'earthHit' ? [e.id] : []))).toEqual([1, 2]);
  });

  it('splits a big asteroid destroyed by photons into four small ones at the original offsets', () => {
    const big = makeAsteroid(5, 'big', [100, 200, 300]);
    const events: SimEvent[] = [];
    const s = destroyAsteroid(withAsteroids(openSpace(), big), 5, 'photon', events);
    expect(s.asteroids.map((a) => [a.id, a.size, a.pos])).toEqual([
      [6, 'small', [120, 220, 320]],
      [7, 'small', [100, 220, 320]],
      [8, 'small', [120, 180, 320]],
      [9, 'small', [80, 220, 300]],
    ]);
    expect(s.nextId).toBe(10);
    expect(events).toEqual([{ type: 'asteroidDestroyed', id: 5, size: 'big', by: 'photon', pos: [100, 200, 300], points: 20, base: 20, combo: 1, multiplier: 1 }]);
    expect(s.score).toBe(20);
  });

  it('does not split a big asteroid destroyed by a rocket, nor a small one', () => {
    const s = withAsteroids(openSpace(), makeAsteroid(1, 'big', [0, 0, 0]), makeAsteroid(2, 'small', [0, 50, 0]));
    expect(destroyAsteroid(s, 1, 'rocket', []).asteroids.map((a) => a.id)).toEqual([2]);
    expect(destroyAsteroid(s, 2, 'photon', []).asteroids.map((a) => a.id)).toEqual([1]);
  });

  it('ends the run when Earth reaches 0 health', () => {
    const s0 = { ...withAsteroids(openSpace(), makeAsteroid(1, 'big', [EARTH_POS[0] - EARTH_RADIUS - 101, 0, 0])), earthHealth: 10 };
    const { state, events } = collect(s0, 1);
    expect(state.earthHealth).toBe(0);
    expect(state.ended).toBe('earthDestroyed');
    expect(events).toContainEqual({ type: 'runEnded', reason: 'earthDestroyed' });
    expect(step(state, input({ throttle: 1 })).state).toBe(state);
  });
});

describe('ship hazards', () => {
  it('refills fuel and hull in the hangar, once', () => {
    const start = initialState(1);
    const s0 = { ...start, ship: { ...start.ship, pos: HANGAR_CENTRE, fuel: 10, hull: 40 } };
    const { state, events } = collect(s0, 3);
    expect(state.ship.fuel).toBe(FUEL_MAX);
    expect(state.ship.hull).toBe(HULL_MAX);
    expect(events.filter((e) => e.type === 'shipReloaded')).toHaveLength(1);
  });

  it('burns the hull 1 per tick in the atmosphere, and ends the run at 0', () => {
    const inAtmosphere: [number, number, number] = [EARTH_POS[0] - (EARTH_RADIUS + ATMOSPHERE_RADIUS) / 2, 0, 0];
    const s0 = { ...openSpace(), ship: { ...openSpace().ship, pos: inAtmosphere } };
    const after10 = collect(s0, 10);
    expect(after10.state.ship.hull).toBe(HULL_MAX - 10);
    expect(after10.events.filter((e) => e.type === 'hullBurning')).toHaveLength(10);
    const dead = run(s0, idle(HULL_MAX));
    expect(dead.ship.hull).toBe(0);
    expect(dead.ended).toBe('shipDestroyed');
  });

  it('destroys the ship on contact with Earth', () => {
    const s0 = { ...openSpace(), ship: { ...openSpace().ship, pos: [EARTH_POS[0] - EARTH_RADIUS - 5, 0, 0] as const } };
    const { state } = collect(s0, 1);
    expect(state.ship.hull).toBe(0);
    expect(state.ended).toBe('shipDestroyed');
  });

  it('leaves the hull alone outside the atmosphere', () => {
    expect(run(openSpace(), idle(50)).ship.hull).toBe(HULL_MAX);
  });
});
