/** Asteroids (SPEC §4): spawning, motion toward Earth, Earth impacts, and destruction with the big → small split. */
import {
  ASTEROID_SPEED,
  BIG_CHANCE,
  BIG_EARTH_DAMAGE,
  BIG_HP,
  BIG_PHOTON_POINTS,
  BIG_ROCKET_POINTS,
  SMALL_PHOTON_POINTS,
  SMALL_ROCKET_POINTS,
  BIG_RADIUS,
  EARTH_POS,
  EARTH_RADIUS,
  SMALL_EARTH_DAMAGE,
  SMALL_HP,
  SMALL_RADIUS,
  SPAWN_INTERVAL,
  SPAWN_SPREAD_MAX,
  SPAWN_SPREAD_MIN,
  SPAWN_X,
  SPLIT_OFFSETS,
} from './constants.js';
import { nextFloat, nextRange } from './rng.js';
import type { AsteroidSize, AsteroidState, GameState, KillCause, SimEvent } from './state.js';
import { add, addScaled, distance, normalize, sub, type Vec3 } from './vec3.js';

export const radiusOf = (size: AsteroidSize): number => (size === 'big' ? BIG_RADIUS : SMALL_RADIUS);
export const hpOf = (size: AsteroidSize): number => (size === 'big' ? BIG_HP : SMALL_HP);
export const earthDamageOf = (size: AsteroidSize): number => (size === 'big' ? BIG_EARTH_DAMAGE : SMALL_EARTH_DAMAGE);

/** Points for a kill (SPEC §6). Earth impacts score nothing. */
export function pointsFor(size: AsteroidSize, by: KillCause): number {
  if (size === 'big') return by === 'photon' ? BIG_PHOTON_POINTS : BIG_ROCKET_POINTS;
  return by === 'photon' ? SMALL_PHOTON_POINTS : SMALL_ROCKET_POINTS;
}

export function makeAsteroid(id: number, size: AsteroidSize, pos: Vec3): AsteroidState {
  return { id, size, pos, dir: normalize(sub(EARTH_POS, pos)), hp: hpOf(size) };
}

/** Spawns one asteroid when `tick` (the tick being entered) is a positive multiple of SPAWN_INTERVAL. RNG order: y, z, size. */
export function spawn(state: GameState, tick: number, events: SimEvent[]): GameState {
  if (tick <= 0 || tick % SPAWN_INTERVAL !== 0) return state;
  const [y, r1] = nextRange(state.rng, SPAWN_SPREAD_MIN, SPAWN_SPREAD_MAX);
  const [z, r2] = nextRange(r1, SPAWN_SPREAD_MIN, SPAWN_SPREAD_MAX);
  const [roll, r3] = nextFloat(r2);
  const size: AsteroidSize = roll < BIG_CHANCE ? 'big' : 'small';
  const a = makeAsteroid(state.nextId, size, [SPAWN_X, y, z]);
  events.push({ type: 'asteroidSpawned', id: a.id, size });
  return { ...state, rng: r3, asteroids: [...state.asteroids, a], nextId: state.nextId + 1 };
}

/** Moves every asteroid ASTEROID_SPEED along its direction, then resolves Earth impacts in id order. */
export function moveAsteroids(state: GameState, events: SimEvent[]): GameState {
  let earthHealth = state.earthHealth;
  const survivors: AsteroidState[] = [];
  for (const a of state.asteroids) {
    const pos = addScaled(a.pos, a.dir, ASTEROID_SPEED);
    if (distance(pos, EARTH_POS) <= EARTH_RADIUS + radiusOf(a.size)) {
      const damage = earthDamageOf(a.size);
      earthHealth = Math.max(0, earthHealth - damage);
      events.push({ type: 'earthHit', id: a.id, size: a.size, damage, pos });
    } else survivors.push({ ...a, pos });
  }
  return { ...state, asteroids: survivors, earthHealth };
}

/**
 * Removes asteroid `id`, adds its points to the score, and emits `asteroidDestroyed`. A big asteroid destroyed by photons splits into SPLIT_COUNT
 * small ones at the original's offsets, each aimed at Earth, with fresh ids appended in offset order.
 */
export function destroyAsteroid(state: GameState, id: number, by: KillCause, events: SimEvent[]): GameState {
  const target = state.asteroids.find((a) => a.id === id);
  if (!target) return state;
  const points = pointsFor(target.size, by);
  events.push({ type: 'asteroidDestroyed', id, size: target.size, by, pos: target.pos, points });
  const rest = state.asteroids.filter((a) => a.id !== id);
  const score = state.score + points;
  if (target.size !== 'big' || by !== 'photon') return { ...state, asteroids: rest, score };
  const pieces = SPLIT_OFFSETS.map((o, i) => makeAsteroid(state.nextId + i, 'small', add(target.pos, o)));
  return { ...state, asteroids: [...rest, ...pieces], nextId: state.nextId + pieces.length, score };
}
