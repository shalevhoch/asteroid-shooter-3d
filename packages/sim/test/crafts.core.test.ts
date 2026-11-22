/** P17 crafts: the Fighter is §3 unchanged; the others' stats apply to turning, fuel, rockets, hull and the hangar. */
import { describe, expect, it } from 'vitest';
import { CRAFTS, CRAFT_IDS, FUEL_MAX, HANGAR_CENTRE, HULL_MAX, ROCKET_MAX, TURN_RATE, initialState, step, type CraftId } from '../src/index.js';
import { forwardOf, input, openSpace } from './helpers.js';

const angle = (craft: CraftId) => {
  const s = { ...openSpace(1), craft };
  const a = forwardOf(s);
  const b = forwardOf(step(s, input({ yaw: 1 })).state);
  return Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
};

describe('crafts', () => {
  it('the Fighter is exactly the §3 ship, and the default', () => {
    expect(CRAFTS.fighter).toEqual({ turnRate: TURN_RATE, fuelMax: FUEL_MAX, rocketMax: ROCKET_MAX, hullMax: HULL_MAX });
    expect(initialState(1).craft).toBe('fighter');
  });

  it.each(CRAFT_IDS)('%s starts full and turns at its own rate', (id) => {
    const s = initialState(1, 'normal', id);
    const c = CRAFTS[id];
    expect([s.ship.fuel, s.ship.hull, s.ship.rockets]).toEqual([c.fuelMax, c.hullMax, c.rocketMax]);
    expect(angle(id)).toBeCloseTo(c.turnRate, 9);
  });

  it('the trade-offs: the Interceptor turns fastest with the least hull, the Shuttle the reverse', () => {
    expect(CRAFTS.interceptor.turnRate).toBeGreaterThan(CRAFTS.fighter.turnRate);
    expect(CRAFTS.shuttle.turnRate).toBeLessThan(CRAFTS.fighter.turnRate);
    expect(CRAFTS.interceptor.hullMax).toBeLessThan(CRAFTS.fighter.hullMax);
    expect(CRAFTS.shuttle.hullMax).toBeGreaterThan(CRAFTS.fighter.hullMax);
    expect(CRAFTS.shuttle.rocketMax).toBe(5);
    expect(CRAFTS.interceptor.rocketMax).toBe(2);
  });

  it('the hangar refills to the craft’s own maxima', () => {
    const s0 = initialState(1, 'normal', 'shuttle');
    const s = { ...s0, ship: { ...s0.ship, pos: HANGAR_CENTRE, fuel: 1, hull: 1, rockets: 0 } };
    const r = step(s, input());
    expect([r.state.ship.fuel, r.state.ship.hull, r.state.ship.rockets]).toEqual([CRAFTS.shuttle.fuelMax, CRAFTS.shuttle.hullMax, CRAFTS.shuttle.rocketMax]);
  });

  it('turbo spends fuel from the craft’s own tank', () => {
    const s = { ...openSpace(1), craft: 'interceptor' as const };
    const t = { ...s, ship: { ...s.ship, fuel: CRAFTS.interceptor.fuelMax } };
    expect(step(t, input({ turbo: true })).state.ship.fuel).toBe(CRAFTS.interceptor.fuelMax - 1);
  });
});
