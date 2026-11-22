/** Ship hazards (SPEC §3, tick step 2): mothership push-out, hangar refill, atmosphere burn, Earth contact. */
import { ATMOSPHERE_BURN, ATMOSPHERE_RADIUS, EARTH_POS, EARTH_RADIUS, FUEL_MAX, HANGAR_OFFSET, HANGAR_RADIUS, HULL_MAX, MOTHERSHIP_POS, SHIP_RADIUS } from './constants.js';
import { resolveMothership } from './mothership.js';
import type { ShipState, SimEvent } from './state.js';
import { add, distance } from './vec3.js';

export const HANGAR_CENTRE = add(MOTHERSHIP_POS, HANGAR_OFFSET);

export interface Refill {
  readonly fuel: number;
  readonly hull: number;
}
/** What the hangar tops up. P06 adds rockets. */
export const REFILL: Refill = { fuel: FUEL_MAX, hull: HULL_MAX };

export function applyHazards(input: ShipState, events: SimEvent[]): ShipState {
  let ship = input;
  const hull = resolveMothership(ship.pos);
  if (hull.bumped) {
    ship = { ...ship, pos: hull.pos, throttle: Math.max(0, ship.throttle - 1) };
    events.push({ type: 'mothershipBump' });
  }
  if (distance(ship.pos, HANGAR_CENTRE) < HANGAR_RADIUS && (ship.fuel < REFILL.fuel || ship.hull < REFILL.hull)) {
    ship = { ...ship, fuel: REFILL.fuel, hull: REFILL.hull };
    events.push({ type: 'shipReloaded' });
  }
  const toEarth = distance(ship.pos, EARTH_POS);
  if (toEarth < EARTH_RADIUS + SHIP_RADIUS) ship = { ...ship, hull: 0 };
  else if (toEarth < ATMOSPHERE_RADIUS) {
    ship = { ...ship, hull: Math.max(0, ship.hull - ATMOSPHERE_BURN) };
    events.push({ type: 'hullBurning' });
  }
  return ship;
}
