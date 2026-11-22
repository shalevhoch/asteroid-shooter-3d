/** docs/spec/flight/flight.md INV-1..INV-6 over seeded random input sequences. */
import { describe, expect, it } from 'vitest';
import {
  FUEL_MAX,
  MOTHERSHIP_WORLD_BOXES,
  SHIP_RADIUS,
  STRAFE_STEP,
  THROTTLE_MAX,
  TURBO_STEP,
  distance,
  initialState,
  nextFloat,
  sphereHitsBox,
  step,
  type Input,
  type RngState,
} from '../src/index.js';
import { openSpace } from './helpers.js';

/** A seeded random input stream (the test's own RNG, independent of the sim's). */
function randomInputs(seed: number, n: number): Input[] {
  let r: RngState = seed;
  const next = () => {
    const [u, r2] = nextFloat(r);
    r = r2;
    return u;
  };
  const tri = () => Math.floor(next() * 3) - 1;
  return Array.from({ length: n }, () => ({
    pitch: next() * 2 - 1,
    yaw: next() * 2 - 1,
    roll: next() * 2 - 1,
    throttle: next() < 0.2 ? tri() : 0,
    turbo: next() < 0.3,
    strafeX: tri(),
    strafeY: tri(),
    reverse: next() < 0.1,
  }));
}

describe('flight invariants', () => {
  for (const seed of [1, 2, 3, 42, 1234]) {
    it(`hold over 3000 random ticks (seed ${String(seed)})`, () => {
      let s = openSpace(seed);
      for (const i of randomInputs(seed, 3000)) {
        const prev = s;
        const r = step(s, i);
        s = r.state;
        if (s.ended) break;
        const reloaded = r.events.some((e) => e.type === 'shipReloaded');
        const { ship } = s;
        expect(Math.abs(Math.hypot(...ship.rot) - 1)).toBeLessThan(1e-9); // INV-1
        expect(Number.isInteger(ship.throttle) && ship.throttle >= 0 && ship.throttle <= THROTTLE_MAX).toBe(true); // INV-2
        expect(Number.isInteger(ship.fuel) && ship.fuel >= 0 && ship.fuel <= FUEL_MAX).toBe(true); // INV-3
        if (!reloaded) expect(ship.fuel).toBeLessThanOrEqual(prev.ship.fuel);
        if (!reloaded && i.turbo && prev.ship.fuel > 0) expect(ship.fuel).toBe(prev.ship.fuel - 1); // INV-4
        const moved = distance(prev.ship.pos, ship.pos);
        const bumped = MOTHERSHIP_WORLD_BOXES.some((b) => sphereHitsBox(prev.ship.pos, SHIP_RADIUS + TURBO_STEP + 3 * STRAFE_STEP, b));
        if (!bumped) expect(moved).toBeLessThanOrEqual(TURBO_STEP + 3 * STRAFE_STEP + 1e-9); // INV-5
        expect(s.tick).toBe(prev.tick + 1); // INV-9
      }
    });
  }

  it('leaves the ship clear of the box it was pushed out of (INV-6)', () => {
    let s = initialState(7);
    for (const i of randomInputs(7, 3000)) {
      const r = step(s, i);
      s = r.state;
      if (r.events.some((e) => e.type === 'mothershipBump')) {
        const overlapping = MOTHERSHIP_WORLD_BOXES.filter((b) => sphereHitsBox(s.ship.pos, SHIP_RADIUS - 1e-6, b));
        expect(overlapping.length).toBeLessThanOrEqual(1); // at most a neighbour box it was pushed into
      }
    }
  });
});
