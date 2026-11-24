/** Asteroids (SPEC §4): construction, motion toward Earth, Earth impacts, and destruction with the big → small split. */
import {
  ASTEROID_SPEED,
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
  SPLIT_OFFSETS,
} from './constants.js';
import { NO_COMBO, comboAfterKill, comboMultiplier } from './scoring.js';
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

export function makeAsteroid(id: number, size: AsteroidSize, pos: Vec3, speed = ASTEROID_SPEED): AsteroidState {
  return { id, size, pos, dir: normalize(sub(EARTH_POS, pos)), hp: hpOf(size), speed };
}

/**
 * Moves every asteroid its speed along its direction, then resolves Earth impacts in id order (damage × the preset's
 * scale). An impact breaks the combo. While the shield perk is up (P26), impacts do no damage and keep the combo.
 */
export function moveAsteroids(state: GameState, events: SimEvent[], earthDamageScale = 1): GameState {
  const shield = state.perks.shield > 0;
  let earthHealth = state.earthHealth;
  let hit = false;
  const survivors: AsteroidState[] = [];
  for (const a of state.asteroids) {
    const pos = addScaled(a.pos, a.dir, a.speed);
    if (distance(pos, EARTH_POS) <= EARTH_RADIUS + radiusOf(a.size)) {
      if (shield) {
        events.push({ type: 'shieldBlocked', id: a.id, size: a.size, pos });
        continue;
      }
      const damage = Math.max(1, Math.round(earthDamageOf(a.size) * earthDamageScale));
      earthHealth = Math.max(0, earthHealth - damage);
      hit = true;
      events.push({ type: 'earthHit', id: a.id, size: a.size, damage, pos });
    } else survivors.push({ ...a, pos });
  }
  return { ...state, asteroids: survivors, earthHealth, combo: hit ? NO_COMBO : state.combo };
}

/**
 * Removes asteroid `id`, adds its points to the score, and emits `asteroidDestroyed`. A big asteroid destroyed by photons splits into SPLIT_COUNT
 * small ones at the original's offsets, each aimed at Earth, with fresh ids appended in offset order.
 */
export function destroyAsteroid(state: GameState, id: number, by: KillCause, events: SimEvent[]): GameState {
  const target = state.asteroids.find((a) => a.id === id);
  if (!target) return state;
  const base = pointsFor(target.size, by);
  const combo = comboAfterKill(state.combo, state.tick);
  const multiplier = comboMultiplier(combo.count);
  const points = base * multiplier;
  events.push({ type: 'asteroidDestroyed', id, size: target.size, by, pos: target.pos, points, base, combo: combo.count, multiplier });
  const rest = state.asteroids.filter((a) => a.id !== id);
  const score = state.score + points;
  if (target.size !== 'big' || by !== 'photon') return { ...state, asteroids: rest, score, combo };
  const pieces = SPLIT_OFFSETS.map((o, i) => makeAsteroid(state.nextId + i, 'small', add(target.pos, o), target.speed));
  return { ...state, asteroids: [...rest, ...pieces], nextId: state.nextId + pieces.length, score, combo };
}

/**
 * Ticks until asteroid `a` touches Earth on its current course (SPEC §11): its surface gap over its speed.
 * Infinity if it isn't moving; 0 if it's already touching.
 */
export function timeToImpact(a: AsteroidState): number {
  if (!(a.speed > 0)) return Infinity;
  return Math.max(0, (distance(a.pos, EARTH_POS) - EARTH_RADIUS - radiusOf(a.size)) / a.speed);
}

/** The asteroid that reaches Earth first (ties to the lowest id), with its time to impact; null when there are none. */
export function mostUrgent(asteroids: readonly AsteroidState[]): { id: number; ticks: number } | null {
  let best: { id: number; ticks: number } | null = null;
  for (const a of asteroids) {
    const ticks = timeToImpact(a);
    if (Number.isFinite(ticks) && (!best || ticks < best.ticks || (ticks === best.ticks && a.id < best.id))) best = { id: a.id, ticks };
  }
  return best;
}
