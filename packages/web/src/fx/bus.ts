/**
 * The sim-event → FX bus (P11): which effects a tick's events and state call for, from the original's collision handlers.
 * Pure, so it's tested; `engine.ts` turns recipes into particles.
 */
import { ATMOSPHERE_RADIUS, BIG_RADIUS, EARTH_POS, SMALL_RADIUS, distance, normalize, sub, type AsteroidSize, type GameState, type SimEvent, type Vec3 } from '@asteroid/sim';

export type Recipe =
  /** `new Explosion(pos, camera, size, normal)`: flashes and flames now; P12 adds the shockwave on `normal`, smoke and sparks. */
  | {
      readonly kind: 'explosion';
      readonly pos: Vec3;
      readonly size: number;
      readonly normal: Vec3 | null;
    }
  /** A photon chipping a big asteroid (original: 3 sparks + 5 smoke puffs, P12). */
  | { readonly kind: 'impact'; readonly pos: Vec3 }
  /** The ship burning in the atmosphere: 2 glints. */
  | { readonly kind: 'embers'; readonly pos: Vec3 };

/** Explosion sizes from the original: big asteroid 3, small 0.25, ship 3, rocket on Earth/mothership 1, photon 0.25. */
export const EXPLOSION_SIZE = {
  big: 3,
  small: 0.25,
  ship: 3,
  rocket: 1,
  photon: 0.25,
} as const;

/** The shockwave plane faces away from Earth (the original's `direction.neg()`). */
const awayFromEarth = (pos: Vec3): Vec3 => normalize(sub(pos, EARTH_POS));

const asteroidExplosion = (size: AsteroidSize, pos: Vec3): Recipe => ({
  kind: 'explosion',
  pos,
  size: EXPLOSION_SIZE[size],
  normal: awayFromEarth(pos),
});

/**
 * Where a photon chip shows: on the big asteroid's surface, on the side the photon came in (its spent position comes just before
 * the hit event). The original put the sparks at the asteroid's centre, where its depth test hid them.
 */
export function chipPoint(centre: Vec3, shotAt: Vec3 | null): Vec3 {
  if (!shotAt) return centre;
  const d = normalize(sub(shotAt, centre));
  const r = BIG_RADIUS * 1.02;
  return [centre[0] + d[0] * r, centre[1] + d[1] * r, centre[2] + d[2] * r];
}

export function recipesFor(events: readonly SimEvent[], state: GameState): Recipe[] {
  const out: Recipe[] = [];
  let shotAt: Vec3 | null = null;
  for (const e of events) {
    if (e.type === 'asteroidDestroyed' || e.type === 'earthHit') out.push(asteroidExplosion(e.size, e.pos));
    else if (e.type === 'asteroidHit') out.push({ kind: 'impact', pos: chipPoint(e.pos, shotAt) });
    else if (e.type === 'projectileSpent' && e.on === 'asteroid') shotAt = e.pos;
    else if (e.type === 'projectileSpent') out.push({ kind: 'explosion', pos: e.pos, size: EXPLOSION_SIZE[e.kind], normal: null });
    else if (e.type === 'hullBurning') out.push({ kind: 'embers', pos: state.ship.pos });
    else if (e.type === 'runEnded' && e.reason === 'shipDestroyed') out.push({ kind: 'explosion', pos: state.ship.pos, size: EXPLOSION_SIZE.ship, normal: null });
  }
  return out;
}

/** Asteroids inside the atmosphere this tick: they trail smoke (the original's ATMOSPHERE collision, every tick). */
export function inAtmosphere(state: GameState): GameState['asteroids'] {
  return state.asteroids.filter((a) => distance(a.pos, EARTH_POS) <= ATMOSPHERE_RADIUS + (a.size === 'big' ? BIG_RADIUS : SMALL_RADIUS));
}
