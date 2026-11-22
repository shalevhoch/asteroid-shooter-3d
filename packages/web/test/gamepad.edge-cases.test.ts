/** P19 gamepad edge cases. */
import { describe, expect, it } from 'vitest';
import { held, presses, stick } from '../src/gamepad.js';

describe('gamepad edge cases', () => {
  it('missing axes and buttons (a non-standard pad) read as rest', () => {
    expect(held({ axes: [], buttons: [] }, false)).toMatchObject({ pitch: 0, yaw: 0, fire: false });
    expect(presses({ axes: [], buttons: [] }, new Set([0])).presses).toEqual([]);
  });

  it('NaN axes are rest; the stick never exceeds the unit disc', () => {
    expect(stick(NaN, NaN)).toEqual({ x: 0, y: 0 });
    const s = stick(1, -1);
    expect(Math.hypot(s.x, s.y)).toBeLessThanOrEqual(1 + 1e-9);
  });

  it('an analog trigger counts only past half way', () => {
    const p = (v: number) => ({ axes: [0, 0, 0, 0], buttons: Array.from({ length: 8 }, (_, i) => ({ pressed: false, value: i === 7 ? v : 0 })) });
    expect(held(p(0.4), false).fire).toBe(false);
    expect(held(p(0.6), false).fire).toBe(true);
  });
});
