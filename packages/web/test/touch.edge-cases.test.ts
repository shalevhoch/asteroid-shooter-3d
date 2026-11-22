/** P15 touch edge cases. */
import { describe, expect, it } from 'vitest';
import { NO_INPUT } from '@asteroid/sim';
import { NO_TOUCH, mergeTouch, sliderLevel, stickAxes } from '../src/touch.js';

describe('touch edge cases', () => {
  it('garbage offsets and fractions are harmless', () => {
    expect(stickAxes(NaN, 3)).toEqual({ x: 0, y: 0 });
    expect(stickAxes(5, 5, 0)).toEqual({ x: 0, y: 0 });
    expect([sliderLevel(NaN), sliderLevel(-2), sliderLevel(7)]).toEqual([0, 0, 4]);
  });

  it('a keyboard or wheel throttle step wins over the slider that tick', () => {
    expect(mergeTouch({ ...NO_INPUT, throttle: -1 }, { ...NO_TOUCH, throttleTarget: 4 }, 0, { invertY: false, sensitivity: 1 }).throttle).toBe(-1);
  });

  it('stick and keys add up, clamped to a full-rate turn', () => {
    const i = mergeTouch({ ...NO_INPUT, yaw: 1 }, { ...NO_TOUCH, stickX: 0.8 }, 0, { invertY: false, sensitivity: 1 });
    expect(i.yaw).toBe(1);
  });
});
