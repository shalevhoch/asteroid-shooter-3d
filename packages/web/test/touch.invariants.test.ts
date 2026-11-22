/** docs/spec/touch/touch.md invariants, over random fingers. */
import { describe, expect, it } from 'vitest';
import { NO_INPUT, THROTTLE_MAX, nextFloat, type RngState } from '@asteroid/sim';
import { NO_TOUCH, STICK_DEADZONE, STICK_RADIUS, mergeTouch, stickAxes } from '../src/touch.js';

const seq = (seed: number) => {
  let r: RngState = seed;
  return () => {
    const [v, n] = nextFloat(r);
    r = n;
    return v;
  };
};

describe('touch invariants', () => {
  it('INV-1/2: stick axes stay in the unit disc, keep the direction, 0 in the dead zone; merged aim stays in [−1, 1]', () => {
    const u = seq(5);
    for (let i = 0; i < 2000; i++) {
      const dx = (u() - 0.5) * 400;
      const dy = (u() - 0.5) * 400;
      const a = stickAxes(dx, dy);
      expect(Math.hypot(a.x, a.y)).toBeLessThanOrEqual(1 + 1e-9);
      if (Math.hypot(dx, dy) <= STICK_RADIUS * STICK_DEADZONE) expect(a).toEqual({ x: 0, y: 0 });
      else expect(a.x * -dy - a.y * dx).toBeCloseTo(0, 6);
      const m = mergeTouch({ ...NO_INPUT, yaw: u() * 2 - 1, pitch: u() * 2 - 1 }, { ...NO_TOUCH, stickX: a.x, stickY: a.y }, 0, { invertY: u() < 0.5, sensitivity: 0.25 + u() * 2.75 });
      expect(Math.abs(m.yaw)).toBeLessThanOrEqual(1);
      expect(Math.abs(m.pitch)).toBeLessThanOrEqual(1);
    }
  });

  it('INV-3: the slider moves the throttle one level per tick and never past its target', () => {
    for (let target = 0; target <= THROTTLE_MAX; target++)
      for (let start = 0; start <= THROTTLE_MAX; start++) {
        let level = start;
        for (let t = 0; t < 10; t++) {
          const step = mergeTouch(NO_INPUT, { ...NO_TOUCH, throttleTarget: target }, level, { invertY: false, sensitivity: 1 }).throttle;
          expect(Math.abs(step)).toBeLessThanOrEqual(1);
          level += step;
          expect(Math.sign(target - level)).not.toBe(-Math.sign(target - start) || 2);
        }
        expect(level).toBe(target);
      }
  });

  it('INV-4: with nothing touched the input is unchanged', () => {
    const base = { ...NO_INPUT, yaw: 0.3, throttle: 1, firePhoton: true };
    expect(mergeTouch(base, NO_TOUCH, 2, { invertY: true, sensitivity: 2 })).toEqual(base);
  });
});
