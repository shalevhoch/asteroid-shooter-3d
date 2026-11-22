/** Weapons (SPEC §5): photon guns, homing rockets, swept hits, scoring via destroyAsteroid. */
import { destroyAsteroid, radiusOf } from './asteroids.js';
import { segmentHitsBox, segmentHitsSphere } from './collide.js';
import {
  EARTH_POS,
  EARTH_RADIUS,
  MUZZLE_DOWN,
  MUZZLE_FORWARD,
  MUZZLE_SIDE,
  PHOTON_COOLDOWN,
  PHOTON_LIFE,
  PHOTON_SPEED,
  ROCKET_LIFE,
  ROCKET_LOCK_CONE,
  ROCKET_MIN_STEER,
  ROCKET_SPEED,
  ROCKET_STEER,
  ROCKET_TERMINAL_RANGE,
} from './constants.js';
import { MOTHERSHIP_WORLD_BOXES } from './mothership.js';
import { rotate } from './quat.js';
import { LOCAL_FORWARD, LOCAL_RIGHT, LOCAL_UP, type AsteroidState, type GameState, type Input, type ProjectileState, type SimEvent } from './state.js';
import { addScaled, distance, dot, normalize, sub, type Vec3 } from './vec3.js';

const speedOf = (p: ProjectileState) => (p.kind === 'photon' ? PHOTON_SPEED : ROCKET_SPEED);
const lifeOf = (p: ProjectileState) => (p.kind === 'photon' ? PHOTON_LIFE : ROCKET_LIFE);

/** The asteroid closest to the line of fire within ROCKET_LOCK_CONE, ties to the lowest id. */
export function crosshairTarget(from: Vec3, forward: Vec3, asteroids: readonly AsteroidState[], cone = ROCKET_LOCK_CONE): number | null {
  let best: number | null = null;
  let bestAngle = cone;
  for (const a of asteroids) {
    const to = sub(a.pos, from);
    const d = Math.hypot(...to);
    if (d === 0) return a.id;
    const angle = Math.acos(Math.max(-1, Math.min(1, dot(to, forward) / d)));
    if (angle < bestAngle || (angle === bestAngle && best === null)) [best, bestAngle] = [a.id, angle];
  }
  return best;
}

/** The nearest asteroid to `from`, ties to the lowest id. */
export function nearestTarget(from: Vec3, asteroids: readonly AsteroidState[]): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const a of asteroids) {
    const d = distance(from, a.pos);
    if (d < bestD) [best, bestD] = [a.id, d];
  }
  return best;
}

/** Step 1 (firing): cooldown, alternating photons, one rocket per firing tick. */
export function fire(state: GameState, input: Input, events: SimEvent[], lockCone = ROCKET_LOCK_CONE): GameState {
  let { ship, projectiles, nextProjectileId } = state;
  const forward = rotate(ship.rot, LOCAL_FORWARD);
  const right = rotate(ship.rot, LOCAL_RIGHT);
  const up = rotate(ship.rot, LOCAL_UP);
  const muzzle = (side: number) => addScaled(addScaled(addScaled(ship.pos, forward, MUZZLE_FORWARD), right, side * MUZZLE_SIDE), up, -MUZZLE_DOWN);
  let cooldown = Math.max(0, ship.photonCooldown - 1);
  if (input.firePhoton && cooldown === 0) {
    const pos = muzzle(ship.photonSide);
    projectiles = [...projectiles, { id: nextProjectileId, kind: 'photon', pos, dir: forward, age: 0, target: null }];
    events.push({ type: 'photonFired', id: nextProjectileId, pos });
    nextProjectileId++;
    cooldown = PHOTON_COOLDOWN;
    ship = { ...ship, photonSide: ship.photonSide === 1 ? -1 : 1 };
  }
  ship = { ...ship, photonCooldown: cooldown };
  if (input.fireRocket && ship.rockets > 0) {
    const pos = muzzle(0);
    const target = crosshairTarget(ship.pos, forward, state.asteroids, lockCone);
    projectiles = [...projectiles, { id: nextProjectileId, kind: 'rocket', pos, dir: forward, age: 0, target }];
    events.push({ type: 'rocketFired', id: nextProjectileId, pos, target });
    nextProjectileId++;
    ship = { ...ship, rockets: ship.rockets - 1 };
  }
  return { ...state, ship, projectiles, nextProjectileId };
}

/** Homing (before moving): keep or find a target, then steer toward it. */
function home(p: ProjectileState, asteroids: readonly AsteroidState[], events: SimEvent[]): ProjectileState {
  let target = p.target !== null && asteroids.some((a) => a.id === p.target) ? p.target : null;
  if (target === null) {
    target = nearestTarget(p.pos, asteroids);
    if (target !== null) events.push({ type: 'rocketLocked', id: p.id, target });
  }
  const a = asteroids.find((x) => x.id === target);
  if (!a) return { ...p, target: null };
  const to = sub(a.pos, p.pos);
  const d = Math.hypot(...to);
  if (d === 0) return { ...p, target };
  if (d <= ROCKET_TERMINAL_RANGE) return { ...p, target, dir: normalize(to) };
  const k = Math.max(ROCKET_STEER / d, ROCKET_MIN_STEER);
  return { ...p, target, dir: normalize(addScaled(p.dir, normalize(to), k)) };
}

/** Step 5: move projectiles in id order and resolve hits; step 6 expiry happens here too. */
export function moveProjectiles(state: GameState, events: SimEvent[]): GameState {
  let s = state;
  const kept: ProjectileState[] = [];
  for (const p0 of state.projectiles) {
    const p = p0.kind === 'rocket' ? home(p0, s.asteroids, events) : p0;
    const to = addScaled(p.pos, p.dir, speedOf(p));
    const hit = s.asteroids.find((a) => segmentHitsSphere(p.pos, to, a.pos, radiusOf(a.size)));
    if (hit) {
      events.push({ type: 'projectileSpent', id: p.id, kind: p.kind, pos: to });
      s = damage(s, hit, p, events);
      continue;
    }
    if (segmentHitsSphere(p.pos, to, EARTH_POS, EARTH_RADIUS) || MOTHERSHIP_WORLD_BOXES.some((b) => segmentHitsBox(p.pos, to, b))) {
      events.push({ type: 'projectileSpent', id: p.id, kind: p.kind, pos: to });
      continue;
    }
    const age = p.age + 1;
    if (age >= lifeOf(p)) continue;
    kept.push({ ...p, pos: to, age });
  }
  return { ...s, projectiles: kept };
}

function damage(s: GameState, a: AsteroidState, p: ProjectileState, events: SimEvent[]): GameState {
  if (p.kind === 'rocket' || a.hp <= 1) return destroyAsteroid(s, a.id, p.kind, events);
  const hp = a.hp - 1;
  events.push({ type: 'asteroidHit', id: a.id, hp, pos: a.pos });
  return { ...s, asteroids: s.asteroids.map((x) => (x.id === a.id ? { ...x, hp } : x)) };
}

