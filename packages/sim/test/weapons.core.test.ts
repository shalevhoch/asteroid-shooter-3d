/** docs/spec/weapons/weapons.core.feature: SPEC.md §5–§6. */
import { describe, expect, it } from 'vitest';
import {
  BIG_HP,
  HANGAR_CENTRE,
  PHOTON_COOLDOWN,
  PHOTON_LIFE,
  PHOTON_SPEED,
  ROCKET_MAX,
  SMALL_HP,
  makeAsteroid,
  run,
  step,
  type AsteroidState,
  type GameState,
  type SimEvent,
  type Vec3,
} from '../src/index.js';
import { input, openSpace, repeat } from './helpers.js';

// openSpace(): the ship at the origin facing +Z, right = −X, up = +Y.
const ahead = (z: number, x = 0, y = 0): Vec3 => [x, y, z];
const withAsteroids = (s: GameState, ...as: AsteroidState[]): GameState => ({ ...s, asteroids: as, nextId: 100 });
/** Pins asteroids in place so tests aren't racing their approach to Earth. */
const frozen = (a: AsteroidState): AsteroidState => ({ ...a, dir: [0, 0, 0] });
const play = (s: GameState, inputs: ReturnType<typeof input>[]) => {
  const events: SimEvent[] = [];
  for (const i of inputs) {
    const r = step(s, i);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
};
const count = (events: SimEvent[], type: SimEvent['type']) => events.filter((e) => e.type === type).length;

describe('photons', () => {
  it('fires on the first tick held and then every PHOTON_COOLDOWN ticks, alternating wings', () => {
    const { events } = play(openSpace(), repeat(4 * PHOTON_COOLDOWN, input({ firePhoton: true })));
    const fired = events.flatMap((e) => (e.type === 'photonFired' ? [e.pos] : []));
    expect(fired).toHaveLength(4);
    // right is −X: first shot on the right wing (x < 0), then the left.
    expect(fired.map((p) => Math.sign(p[0]))).toEqual([-1, 1, -1, 1]);
    expect(fired[0]?.[2]).toBeCloseTo(50, 9);
  });

  it('flies PHOTON_SPEED per tick and expires after PHOTON_LIFE ticks', () => {
    const s1 = step(openSpace(), input({ firePhoton: true })).state;
    expect(s1.projectiles[0]?.pos[2]).toBeCloseTo(50 + PHOTON_SPEED, 9);
    const later = run(s1, repeat(PHOTON_LIFE - 2, input()));
    expect(later.projectiles).toHaveLength(1);
    expect(run(later, [input()]).projectiles).toHaveLength(0);
  });

  it('chips HP one per hit and destroys a small asteroid in SMALL_HP hits for 10 points', () => {
    const s0 = withAsteroids(openSpace(), frozen(makeAsteroid(1, 'small', ahead(400))));
    const { state, events } = play(s0, repeat(SMALL_HP * PHOTON_COOLDOWN + 20, input({ firePhoton: true })));
    expect(count(events, 'asteroidHit')).toBe(SMALL_HP - 1);
    expect(events).toContainEqual(expect.objectContaining({ type: 'asteroidDestroyed', id: 1, by: 'photon', points: 10 }));
    expect(state.score).toBe(10);
    expect(state.asteroids).toHaveLength(0);
  });

  it('splits a big asteroid after BIG_HP photon hits, for 20 points', () => {
    const s0 = withAsteroids(openSpace(), frozen(makeAsteroid(1, 'big', ahead(600))));
    const { state, events } = play(s0, repeat(BIG_HP * PHOTON_COOLDOWN + 20, input({ firePhoton: true })));
    expect(events).toContainEqual(expect.objectContaining({ type: 'asteroidDestroyed', id: 1, size: 'big', points: 20 }));
    expect(state.score).toBeGreaterThanOrEqual(20);
    expect(count(events, 'asteroidHit')).toBeGreaterThanOrEqual(BIG_HP - 1);
  });

  it('cannot tunnel through a small asteroid between ticks', () => {
    // A photon moves 36/tick; a small asteroid is 40 wide. Place it where no tick endpoint lands inside it.
    const s0 = withAsteroids(openSpace(), frozen(makeAsteroid(1, 'small', ahead(50 + 36 * 5 + 18, -12))));
    const { events } = play(s0, repeat(10, input({ firePhoton: true })));
    expect(count(events, 'asteroidHit')).toBeGreaterThan(0);
  });
});

describe('rockets', () => {
  it('carries ROCKET_MAX and fires one per press', () => {
    const { state, events } = play(openSpace(), repeat(ROCKET_MAX + 2, input({ fireRocket: true })));
    expect(count(events, 'rocketFired')).toBe(ROCKET_MAX);
    expect(state.ship.rockets).toBe(0);
  });

  it('locks the asteroid nearest the crosshair at launch', () => {
    const near = frozen(makeAsteroid(1, 'small', ahead(300, 150))); // 27° off the crosshair
    const centred = frozen(makeAsteroid(2, 'small', ahead(1200, 20))); // ~1°
    const r = step(withAsteroids(openSpace(), near, centred), input({ fireRocket: true }));
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'rocketFired', target: 2 }));
  });

  it('falls back to the nearest asteroid when nothing is in the cone', () => {
    const behind = frozen(makeAsteroid(1, 'small', ahead(-500)));
    const { events } = play(withAsteroids(openSpace(), behind), [input({ fireRocket: true }), ...repeat(300, input())]);
    expect(events).toContainEqual(expect.objectContaining({ type: 'rocketFired', target: null }));
    expect(events).toContainEqual({ type: 'rocketLocked', id: 1, target: 1 });
    expect(events).toContainEqual(expect.objectContaining({ type: 'asteroidDestroyed', id: 1, by: 'rocket', points: 8 }));
  });

  it('destroys a big asteroid outright for 15 points without splitting', () => {
    const s0 = withAsteroids(openSpace(), frozen(makeAsteroid(1, 'big', ahead(900, -200))));
    const { state, events } = play(s0, [input({ fireRocket: true }), ...repeat(150, input())]);
    expect(events).toContainEqual(expect.objectContaining({ type: 'asteroidDestroyed', id: 1, size: 'big', by: 'rocket', points: 15 }));
    expect(state.asteroids).toHaveLength(0);
    expect(state.score).toBe(15);
  });

  it('re-targets when its target dies first', () => {
    const a = frozen(makeAsteroid(1, 'small', ahead(1500)));
    const b = frozen(makeAsteroid(2, 'small', ahead(800, 400)));
    let s = step(withAsteroids(openSpace(), a, b), input({ fireRocket: true })).state;
    expect(s.projectiles[0]?.target).toBe(1);
    s = { ...s, asteroids: s.asteroids.filter((x) => x.id !== 1) };
    const { events } = play(s, repeat(300, input()));
    expect(events).toContainEqual({ type: 'rocketLocked', id: 1, target: 2 });
    expect(events).toContainEqual(expect.objectContaining({ type: 'asteroidDestroyed', id: 2, by: 'rocket' }));
  });

  it('the hangar refills rockets', () => {
    const s = openSpace();
    const s0 = { ...s, ship: { ...s.ship, pos: HANGAR_CENTRE, rockets: 0 } };
    const { state, events } = play(s0, [input()]);
    expect(state.ship.rockets).toBe(ROCKET_MAX);
    expect(count(events, 'shipReloaded')).toBe(1);
  });
});

describe('scoring', () => {
  it('emits points with every kill and sums them into the score', () => {
    const s0 = withAsteroids(openSpace(), frozen(makeAsteroid(1, 'small', ahead(500))), frozen(makeAsteroid(2, 'small', ahead(900, -300))));
    const { state, events } = play(s0, [input({ fireRocket: true }), input(), input({ fireRocket: true }), ...repeat(300, input())]);
    const kills = events.flatMap((e) => (e.type === 'asteroidDestroyed' ? [e.points] : []));
    expect(kills.length).toBe(2);
    expect(state.score).toBe(kills.reduce((a, b) => a + b, 0));
  });
});
