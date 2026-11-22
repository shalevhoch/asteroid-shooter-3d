/** docs/spec/asteroids/asteroids.edge-cases.feature */
import { describe, expect, it } from 'vitest';
import { EARTH_POS, EARTH_RADIUS, destroyAsteroid, initialState, makeAsteroid, run, step, type GameState } from '../src/index.js';
import { input, openSpace, repeat } from './helpers.js';

const withAsteroids = (s: GameState, ...as: ReturnType<typeof makeAsteroid>[]): GameState => ({ ...s, asteroids: as, nextId: 100 });

describe('asteroid edge cases', () => {
  it('destroying an unknown id is a no-op', () => {
    const s = withAsteroids(openSpace(), makeAsteroid(1, 'small', [0, 0, 0]));
    const events: never[] = [];
    expect(destroyAsteroid(s, 99, 'photon', events)).toBe(s);
    expect(events).toEqual([]);
  });

  it('clamps Earth health at 0 when several impacts land on one tick', () => {
    const edge = (y: number) => makeAsteroid(y, 'big', [EARTH_POS[0] - EARTH_RADIUS - 101, y, 0]);
    const s = { ...withAsteroids(openSpace(), edge(1), edge(2), edge(3)), earthHealth: 15 };
    const r = step(s, input());
    expect(r.state.earthHealth).toBe(0);
    expect(r.events.filter((e) => e.type === 'runEnded')).toHaveLength(1);
  });

  it('an earth-destroyed and ship-destroyed tick reports Earth first', () => {
    const s0 = withAsteroids(openSpace(), makeAsteroid(1, 'big', [EARTH_POS[0] - EARTH_RADIUS - 101, 0, 0]));
    const s = { ...s0, earthHealth: 1, ship: { ...s0.ship, pos: [EARTH_POS[0], EARTH_RADIUS + 5, 0] as const } };
    expect(step(s, input()).state.ended).toBe('earthDestroyed');
  });

  it('is deterministic per seed and differs across seeds', () => {
    const idle = repeat(2000, input());
    expect(run(initialState(3), idle)).toEqual(run(initialState(3), idle));
    expect(run(initialState(3), idle).asteroids).not.toEqual(run(initialState(4), idle).asteroids);
  });
});
