/** Ship hazards (SPEC §3, tick step 2): mothership push-out, hangar refill, atmosphere burn, Earth contact. */
import { ATMOSPHERE_BURN, ATMOSPHERE_RADIUS, EARTH_POS, EARTH_RADIUS, FUEL_MAX, HANGAR_OFFSET, HANGAR_RADIUS, HULL_MAX, MOTHERSHIP_POS, ROCKET_MAX, SHIP_RADIUS, STATION_DOCK_RADIUS, STATION_POS } from './constants.js';
import { resolveMothership } from './mothership.js';
import type { ShipState, SimEvent } from './state.js';
import { add, distance, type Vec3 } from './vec3.js';

export const HANGAR_CENTRE = add(MOTHERSHIP_POS, HANGAR_OFFSET);

export interface Refill {
  readonly fuel: number;
  readonly hull: number;
  readonly rockets: number;
}
/** What the hangar tops up. */
export const REFILL: Refill = { fuel: FUEL_MAX, hull: HULL_MAX, rockets: ROCKET_MAX };

/** `refill` is what the hangar tops up to: the craft's maxima (P17). */
/** Which reload point, if any, the ship is in: the mothership's hangar or the space station (P18). */
export function reloadPoint(pos: Vec3): 'mothership' | 'station' | null {
  if (distance(pos, HANGAR_CENTRE) < HANGAR_RADIUS) return 'mothership';
  if (distance(pos, STATION_POS) < STATION_DOCK_RADIUS) return 'station';
  return null;
}

export function applyHazards(input: ShipState, events: SimEvent[], refill: Refill = REFILL): ShipState {
  let ship = input;
  const hull = resolveMothership(ship.pos);
  if (hull.bumped) {
    ship = { ...ship, pos: hull.pos, throttle: Math.max(0, ship.throttle - 1) };
    events.push({ type: 'mothershipBump' });
  }
  const at = reloadPoint(ship.pos);
  if (at && (ship.fuel < refill.fuel || ship.hull < refill.hull || ship.rockets < refill.rockets)) {
    ship = { ...ship, fuel: refill.fuel, hull: refill.hull, rockets: refill.rockets };
    events.push({ type: 'shipReloaded', at });
  }
  const toEarth = distance(ship.pos, EARTH_POS);
  if (toEarth < EARTH_RADIUS + SHIP_RADIUS) ship = { ...ship, hull: 0 };
  else if (toEarth < ATMOSPHERE_RADIUS) {
    ship = { ...ship, hull: Math.max(0, ship.hull - ATMOSPHERE_BURN) };
    events.push({ type: 'hullBurning' });
  }
  return ship;
}
