/** P19 gamepad: standard mapping → held controls, presses, and merging into the sim input. */
import { describe, expect, it } from 'vitest';
import { NO_INPUT } from '@asteroid/sim';
import { NO_PAD, PAD, STICK_DEADZONE, held, mergePad, presses, stick, type PadSnapshot } from '../src/gamepad.js';

const pad = (axes: number[] = [0, 0, 0, 0], pressed: number[] = [], values: Record<number, number> = {}): PadSnapshot => ({
  axes,
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: values[i] ?? (pressed.includes(i) ? 1 : 0) })),
});

describe('gamepad', () => {
  it('left stick aims: up is nose up, right is yaw right; invert-Y flips pitch', () => {
    expect(held(pad([0, -1, 0, 0]), false)).toMatchObject({ pitch: 1, yaw: 0 });
    expect(held(pad([1, 0, 0, 0]), false)).toMatchObject({ yaw: 1 });
    expect(held(pad([0, -1, 0, 0]), true).pitch).toBe(-1);
  });

  it('a resting stick inside the dead zone is still', () => {
    expect(stick(STICK_DEADZONE * 0.9, 0)).toEqual({ x: 0, y: 0 });
    expect(stick(0.1, -0.1)).toEqual({ x: 0, y: 0 });
  });

  it('right stick strafes, bumpers roll, triggers fire and turbo, B reverses', () => {
    expect(held(pad([0, 0, 0.9, -0.9], [PAD.RB, PAD.B], { [PAD.RT]: 0.8, [PAD.LT]: 0.7 }), false)).toEqual({ pitch: 0, yaw: 0, roll: 1, strafeX: 1, strafeY: 1, turbo: true, reverse: true, fire: true });
    expect(held(pad([0, 0, 0, 0], [PAD.LB]), false).roll).toBe(-1);
    expect(held(pad(), false)).toEqual(NO_PAD);
  });

  it('presses fire once per push: A rocket, Y / d-pad up throttle +, X / d-pad down throttle −, Start, Back camera', () => {
    const a = presses(pad([], [PAD.A, PAD.Y, PAD.START]), new Set());
    expect(a.presses).toEqual(['rocket', 'throttleUp', 'start']);
    expect(presses(pad([], [PAD.A, PAD.Y, PAD.START]), a.down).presses).toEqual([]);
    expect(presses(pad([], [PAD.X, PAD.DOWN, PAD.UP, PAD.BACK]), new Set()).presses).toEqual(['throttleUp', 'throttleDown', 'throttleDown', 'camera']);
  });

  it('merges into the input: axes add and clamp, buttons OR, keys win on digital axes', () => {
    const h = held(pad([1, -1, -0.9, 0], [PAD.LB], { [PAD.RT]: 1 }), false);
    const i = mergePad({ ...NO_INPUT, yaw: 0.5, roll: 1 }, h, 1);
    expect(i).toMatchObject({ yaw: 1, roll: 1, strafeX: -1, firePhoton: true });
    expect(i.pitch).toBeCloseTo(0.707, 2);
    expect(mergePad(NO_INPUT, NO_PAD, 2)).toEqual(NO_INPUT);
  });
});
