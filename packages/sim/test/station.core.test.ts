/** P18: the space station is a second reload point. */
import { describe, expect, it } from 'vitest';
import { ATMOSPHERE_RADIUS, CRAFTS, EARTH_POS, FUEL_MAX, HANGAR_CENTRE, HULL_MAX, ROCKET_MAX, SPAWN_SPREAD_MAX, STATION_DOCK_RADIUS, STATION_POS, distance, initialState, reloadPoint, step } from '../src/index.js';
import { input } from './helpers.js';

const at = (pos: readonly [number, number, number], craft: 'fighter' | 'shuttle' = 'fighter') => {
  const s = initialState(1, 'normal', craft);
  return { ...s, ship: { ...s.ship, pos, fuel: 10, hull: 10, rockets: 0 } };
};

describe('space station', () => {
  it('reloads the ship at the station, saying where', () => {
    const r = step(at(STATION_POS), input());
    expect([r.state.ship.fuel, r.state.ship.hull, r.state.ship.rockets]).toEqual([FUEL_MAX, HULL_MAX, ROCKET_MAX]);
    expect(r.events).toContainEqual({ type: 'shipReloaded', at: 'station' });
  });

  it('refills to the craft’s maxima there too', () => {
    const r = step(at(STATION_POS, 'shuttle'), input());
    expect(r.state.ship.rockets).toBe(CRAFTS.shuttle.rocketMax);
  });

  it('only inside the dock radius', () => {
    const edge: [number, number, number] = [STATION_POS[0], STATION_POS[1] - STATION_DOCK_RADIUS - 1, STATION_POS[2]];
    expect(reloadPoint(edge)).toBeNull();
    expect(step(at(edge), input()).events.some((e) => e.type === 'shipReloaded')).toBe(false);
  });

  it('the hangar still says mothership', () => {
    expect(step(at(HANGAR_CENTRE), input()).events).toContainEqual({ type: 'shipReloaded', at: 'mothership' });
  });

  it('sits clear of the atmosphere and above the asteroid lane', () => {
    expect(distance(STATION_POS, EARTH_POS)).toBeGreaterThan(ATMOSPHERE_RADIUS + STATION_DOCK_RADIUS);
    expect(STATION_POS[1] - STATION_DOCK_RADIUS).toBeGreaterThan(SPAWN_SPREAD_MAX);
  });

  it('a full ship at the station reloads nothing and fires no event', () => {
    const s = initialState(1);
    expect(step({ ...s, ship: { ...s.ship, pos: STATION_POS } }, input()).events.some((e) => e.type === 'shipReloaded')).toBe(false);
  });
});
