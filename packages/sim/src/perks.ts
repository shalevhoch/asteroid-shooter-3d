/**
 * Perks (P26, SPEC §15): destroyed asteroids sometimes drop a pickup; flying through it grants a perk. Pure and
 * deterministic. Drops draw from their own RNG stream (`perkRng`), so runs without pickups play exactly as before.
 */
import { destroyAsteroid } from './asteroids.js';
import { SHIP_RADIUS } from './constants.js';
import { nextFloat, nextRange, type RngState } from './rng.js';
import type { GameState, SimEvent } from './state.js';
import { perkTicks } from './upgrades.js';
import { addScaled, distance, normalize, sub, type Vec3 } from './vec3.js';

export const PERK_KINDS = ['shield', 'rapidFire', 'spreadShot', 'magnet', 'smartBomb'] as const;
export type PerkKind = (typeof PERK_KINDS)[number];
/** Perks that last a while; the smart bomb is instant. */
export type TimedPerk = Exclude<PerkKind, 'smartBomb'>;

/** Drop chance per destroyed asteroid, and while the player is struggling (Earth or hull below half). */
export const PERK_DROP_CHANCE = 0.04;
export const PERK_DROP_CHANCE_STRUGGLING = 0.06;
export const STRUGGLING_FRACTION = 0.5;
/** A pickup lives 8 s (200 ticks); the renderer blinks it in the last 2 s and fades it in the last 0.5 s. */
export const PICKUP_LIFE = 200;
export const PICKUP_BLINK = 50;
/** Drift speed in units per tick, in a random direction. */
export const PICKUP_DRIFT = 0.6;
/** Collected when the ship's centre is within this of the pickup. */
export const PICKUP_RADIUS = SHIP_RADIUS + 40;
/** Timed perk durations in ticks. Collecting a perk that's already active refreshes it (no stacking). */
export const PERK_DURATION: Readonly<Record<TimedPerk, number>> = { shield: 250, rapidFire: 250, spreadShot: 250, magnet: 375 };
/** Rapid fire: photon cooldown in ticks (normal is PHOTON_COOLDOWN = 5). */
export const RAPID_FIRE_COOLDOWN = 2;
/** Spread shot: two extra photons this far off the line of fire, in radians. */
export const SPREAD_ANGLE = 0.1;
/** Magnet: pickups within this range fly toward the ship at this speed. */
export const MAGNET_RANGE = 1500;
export const MAGNET_SPEED = 25;
/** Smart bomb: destroys every asteroid within this range of the ship (rocket points, no split, no drops). */
export const SMART_BOMB_RANGE = 2500;
/** Weights for which perk drops: shield and rapid fire are commoner, the smart bomb rarer. */
export const PERK_WEIGHTS: Readonly<Record<PerkKind, number>> = { shield: 3, rapidFire: 3, spreadShot: 2, magnet: 2, smartBomb: 1 };

export interface PickupState {
  readonly id: number;
  readonly kind: PerkKind;
  readonly pos: Vec3;
  /** Drift per tick. */
  readonly vel: Vec3;
  /** Ticks since it dropped. */
  readonly age: number;
}

export type ActivePerks = Readonly<Record<TimedPerk, number>>;
export const NO_PERKS: ActivePerks = { shield: 0, rapidFire: 0, spreadShot: 0, magnet: 0 };

/** The seed for the perk stream: a different stream from the main RNG, from the same seed. */
export const perkSeed = (seed: number): RngState => (seed ^ 0x5bd1e995) >>> 0;

export function struggling(s: GameState, hullMax: number): boolean {
  return s.earthHealth < 100 * STRUGGLING_FRACTION || s.ship.hull < hullMax * STRUGGLING_FRACTION;
}

function pickKind(u: number): PerkKind {
  const total = PERK_KINDS.reduce((t, k) => t + PERK_WEIGHTS[k], 0);
  let acc = 0;
  for (const k of PERK_KINDS) {
    acc += PERK_WEIGHTS[k] / total;
    if (u < acc) return k;
  }
  return 'shield';
}

/** A random unit vector from two draws. */
function randomDir(rng: RngState): [Vec3, RngState] {
  const [z, r1] = nextRange(rng, -1, 1);
  const [t, r2] = nextRange(r1, 0, 2 * Math.PI);
  const k = Math.sqrt(1 - z * z);
  return [[k * Math.cos(t), k * Math.sin(t), z], r2];
}

/** Rolls a drop for each asteroid the player destroyed this tick (in event order). Smart-bomb kills never drop. */
export function rollDrops(s: GameState, events: SimEvent[], hullMax: number): GameState {
  const chance = struggling(s, hullMax) ? PERK_DROP_CHANCE_STRUGGLING : PERK_DROP_CHANCE;
  let { perkRng, nextPickupId } = s;
  const dropped: PickupState[] = [];
  const out: SimEvent[] = [];
  for (const e of events) {
    if (e.type !== 'asteroidDestroyed' || e.by === 'bomb') continue;
    const [u, r1] = nextFloat(perkRng);
    perkRng = r1;
    if (u >= chance) continue;
    const [k, r2] = nextFloat(perkRng);
    const [dir, r3] = randomDir(r2);
    perkRng = r3;
    const p: PickupState = { id: nextPickupId++, kind: pickKind(k), pos: e.pos, vel: addScaled([0, 0, 0], dir, PICKUP_DRIFT), age: 0 };
    dropped.push(p);
    out.push({ type: 'perkDropped', id: p.id, kind: p.kind, pos: p.pos });
  }
  events.push(...out);
  return { ...s, perkRng, nextPickupId, pickups: [...s.pickups, ...dropped] };
}

/** Moves a pickup: drift, or toward the ship under the magnet. */
function movePickup(p: PickupState, ship: Vec3, magnet: boolean): PickupState {
  const d = distance(p.pos, ship);
  if (magnet && d < MAGNET_RANGE && d > 0) return { ...p, pos: addScaled(p.pos, normalize(sub(ship, p.pos)), Math.min(MAGNET_SPEED, d)), age: p.age + 1 };
  return { ...p, pos: addScaled(p.pos, p.vel, 1), age: p.age + 1 };
}

/** Smart bomb: destroys every asteroid within range, nearest-first by id order. */
function smartBomb(s: GameState, events: SimEvent[]): GameState {
  const hit = s.asteroids.filter((a) => distance(a.pos, s.ship.pos) <= SMART_BOMB_RANGE).map((a) => a.id);
  let out = s;
  for (const id of hit) out = destroyAsteroid(out, id, 'bomb', events);
  events.push({ type: 'smartBomb', pos: s.ship.pos, count: hit.length });
  return out;
}

function grant(s: GameState, kind: PerkKind, events: SimEvent[]): GameState {
  if (kind === 'smartBomb') return smartBomb(s, events);
  return { ...s, perks: { ...s.perks, [kind]: perkTicks(PERK_DURATION[kind], s.upgrades) } };
}

/** Counts active perks down by a tick, announcing the ones that run out. */
function tickPerks(perks: ActivePerks, events: SimEvent[]): ActivePerks {
  const next = { ...perks };
  for (const k of Object.keys(perks) as TimedPerk[]) {
    if (perks[k] <= 0) continue;
    next[k] = perks[k] - 1;
    if (next[k] === 0) events.push({ type: 'perkExpired', kind: k });
  }
  return next;
}

/** The perk step (after projectiles): count down, move pickups, collect, expire, then roll this tick's drops. */
export function updatePerks(state: GameState, events: SimEvent[], hullMax: number): GameState {
  const magnet = state.perks.magnet > 0;
  let s: GameState = { ...state, perks: tickPerks(state.perks, events) };
  const kept: PickupState[] = [];
  const collected: PickupState[] = [];
  for (const p0 of s.pickups) {
    const p = movePickup(p0, s.ship.pos, magnet);
    if (distance(p.pos, s.ship.pos) <= PICKUP_RADIUS) collected.push(p);
    else if (p.age >= PICKUP_LIFE) events.push({ type: 'pickupExpired', id: p.id });
    else kept.push(p);
  }
  s = { ...s, pickups: kept };
  for (const p of collected) {
    events.push({ type: 'perkCollected', id: p.id, kind: p.kind, pos: p.pos });
    s = grant(s, p.kind, events);
  }
  return rollDrops(s, events, hullMax);
}
