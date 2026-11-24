/** P35 G-Ship: the fourth craft and its trade-offs; the default stays the Fighter. */
import { describe, expect, it } from 'vitest';
import { CRAFTS, CRAFT_IDS, initialState } from '../src/index.js';

describe('G-Ship', () => {
  it('is on the craft list, after the original three', () => {
    expect(CRAFT_IDS).toEqual(['fighter', 'interceptor', 'shuttle', 'gship']);
  });

  it('turns a little faster with more fuel and an extra rocket, for 20 % less hull than the Fighter', () => {
    const g = CRAFTS.gship;
    const f = CRAFTS.fighter;
    expect(g.turnRate).toBeCloseTo(f.turnRate * 1.1);
    expect(g.fuelMax).toBeCloseTo(f.fuelMax * 1.15);
    expect(g.rocketMax).toBe(f.rocketMax + 1);
    expect(g.hullMax).toBeCloseTo(f.hullMax * 0.8);
    // A real trade-off: it isn't strictly better than the Interceptor on turning, nor the Shuttle on hull.
    expect(g.turnRate).toBeLessThan(CRAFTS.interceptor.turnRate);
    expect(g.hullMax).toBeLessThan(CRAFTS.shuttle.hullMax);
  });

  it('a G-Ship run starts full; the default craft is still the Fighter', () => {
    const s = initialState(1, 'normal', 'gship');
    expect(s.ship.hull).toBe(CRAFTS.gship.hullMax);
    expect(s.ship.rockets).toBe(CRAFTS.gship.rocketMax);
    expect(initialState(1).craft).toBe('fighter');
  });
});
