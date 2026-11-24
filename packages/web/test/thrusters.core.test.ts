/** P28 hyperdrive thrusters: ramp, nozzle looks and placement. */
import { describe, expect, it } from 'vitest';
import { CRAFT_IDS, START_ROT } from '@asteroid/sim';
import { NOZZLES, RAMP_DOWN, RAMP_UP, nozzleLook, nozzleWorld, rampThrust } from '../src/thrusters.js';
import { cuesFor } from '../src/audio.js';

describe('thrusters', () => {
  it('the burn builds fast under turbo, fades slower, and stays in [0, 1]', () => {
    expect(rampThrust(0, true, 1)).toBeCloseTo(RAMP_UP);
    expect(rampThrust(1, false, 1)).toBeCloseTo(1 - RAMP_DOWN);
    expect(rampThrust(0.9, true, 10)).toBe(1);
    expect(rampThrust(0.1, false, 10)).toBe(0);
    expect(rampThrust(0.5, true, NaN)).toBe(0.5);
  });

  it('idle: a small glow and no plume; hyperdrive: a long plume and a trail', () => {
    const idle = nozzleLook(0, 2, 4);
    expect(idle.flame).toBe(0);
    expect(idle.trail).toBe(false);
    const hot = nozzleLook(1, 4, 4);
    expect(hot.flame).toBeGreaterThan(1);
    expect(hot.glow).toBeGreaterThan(idle.glow);
    expect(hot.trail).toBe(true);
  });

  it('every craft has nozzles at its tail; backward is the ship\'s +Z', () => {
    for (const c of CRAFT_IDS) {
      expect(NOZZLES[c].length).toBeGreaterThan(0);
      for (const n of NOZZLES[c]) expect(n[2]).toBeGreaterThan(0.4);
    }
    const w = nozzleWorld('shuttle', [0, 0, 0], START_ROT, 40);
    expect(w.back[2]).toBeCloseTo(-1); // START_ROT faces +Z, so the exhaust streams toward −Z
    expect(w.points[0]?.[2]).toBeCloseTo(-0.48 * 40);
  });

  it('hyperdrive kicks in with a whoosh', () => {
    expect(cuesFor([{ type: 'turboStarted' }])).toEqual([{ sound: 'whoosh', volume: 0.45 }]);
  });
});
