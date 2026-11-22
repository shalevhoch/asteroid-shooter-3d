/** P15 touch controls: stick, slider, merging a touch frame into the sim input, detection. */
import { describe, expect, it } from 'vitest';
import { NO_INPUT, THROTTLE_MAX } from '@asteroid/sim';
import { parseSettings } from '../src/settings.js';
import { NO_TOUCH, STICK_DEADZONE, STICK_RADIUS, mergeTouch, sliderLevel, stickAxes, wantsTouch } from '../src/touch.js';

const opts = { invertY: false, sensitivity: 1 };

describe('virtual stick', () => {
  it('full right is yaw right, full up is nose up', () => {
    expect(stickAxes(STICK_RADIUS, 0)).toEqual({ x: 1, y: 0 });
    expect(stickAxes(0, -STICK_RADIUS)).toEqual({ x: 0, y: 1 });
  });

  it('ignores the dead zone and rescales the rest', () => {
    expect(stickAxes(STICK_RADIUS * STICK_DEADZONE * 0.9, 0)).toEqual({ x: 0, y: 0 });
    const half = stickAxes(STICK_RADIUS * (STICK_DEADZONE + (1 - STICK_DEADZONE) / 2), 0);
    expect(half.x).toBeCloseTo(0.5, 9);
  });

  it('clamps past the rim, keeping the direction', () => {
    const a = stickAxes(300, -300);
    expect(Math.hypot(a.x, a.y)).toBeCloseTo(1, 9);
    expect(a.x).toBeCloseTo(a.y, 9);
  });
});

describe('throttle slider', () => {
  it('maps the height to the nearest level', () => {
    expect([0, 0.1, 0.5, 0.9, 1].map(sliderLevel)).toEqual([0, 0, 2, 4, THROTTLE_MAX]);
  });
});

describe('merging touch into input', () => {
  it('nothing touched leaves the input alone', () => {
    expect(mergeTouch(NO_INPUT, NO_TOUCH, 2, opts)).toEqual(NO_INPUT);
  });

  it('the slider steps the throttle one level per tick toward its target', () => {
    const t = { ...NO_TOUCH, throttleTarget: 3 };
    expect(mergeTouch(NO_INPUT, t, 1, opts).throttle).toBe(1);
    expect(mergeTouch(NO_INPUT, t, 3, opts).throttle).toBe(0);
    expect(mergeTouch(NO_INPUT, t, 4, opts).throttle).toBe(-1);
  });

  it('buttons fire, rocket and turbo', () => {
    const i = mergeTouch(NO_INPUT, { ...NO_TOUCH, fire: true, turbo: true, rocketTaps: 1 }, 0, opts);
    expect([i.firePhoton, i.turbo, i.fireRocket]).toEqual([true, true, true]);
  });

  it('the stick aims, honouring invert-Y and sensitivity, clamped', () => {
    const t = { ...NO_TOUCH, stickX: 0.5, stickY: 0.5 };
    expect(mergeTouch(NO_INPUT, t, 0, opts)).toMatchObject({ yaw: 0.5, pitch: 0.5 });
    expect(mergeTouch(NO_INPUT, t, 0, { invertY: true, sensitivity: 1 }).pitch).toBe(-0.5);
    expect(mergeTouch(NO_INPUT, t, 0, { invertY: false, sensitivity: 3 })).toMatchObject({ yaw: 1, pitch: 1 });
  });
});

describe('detection and defaults', () => {
  it('a coarse pointer with touch points gets touch controls; ?touch forces either way', () => {
    expect(wantsTouch({ coarse: true, maxTouchPoints: 5, search: '' })).toBe(true);
    expect(wantsTouch({ coarse: false, maxTouchPoints: 10, search: '' })).toBe(false);
    expect(wantsTouch({ coarse: false, maxTouchPoints: 0, search: '?touch' })).toBe(true);
    expect(wantsTouch({ coarse: true, maxTouchPoints: 5, search: '?touch=0' })).toBe(false);
  });

  it('touch devices default to Kid / Easy; a stored difficulty wins', () => {
    expect(parseSettings(null, false, true).difficulty).toBe('kid');
    expect(parseSettings('{"difficulty":"hard"}', false, true).difficulty).toBe('hard');
    expect(parseSettings(null).difficulty).toBe('normal');
  });
});
