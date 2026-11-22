/** P19 gamepad invariants: polling never repeats a press, disconnect releases everything, no pad means no effect. */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GamepadInput, NO_PAD, PAD } from '../src/gamepad.js';

const fake = (pressed: number[], connected = true) => ({
  connected,
  mapping: 'standard',
  axes: [0, -1, 0, 0],
  buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: pressed.includes(i), value: pressed.includes(i) ? 1 : 0 })),
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('GamepadInput', () => {
  it('a held button yields exactly one press across many polls', () => {
    let pads: unknown[] = [fake([PAD.A])];
    vi.stubGlobal('navigator', { getGamepads: () => pads });
    const g = new GamepadInput();
    const all = Array.from({ length: 10 }, () => g.poll(false)).flat();
    expect(all).toEqual(['rocket']);
    expect(g.connected).toBe(true);
    expect(g.nextHeld().pitch).toBe(1);
    pads = [null];
    expect(g.poll(false)).toEqual([]);
    expect(g.connected).toBe(false);
    expect(g.nextHeld()).toEqual(NO_PAD);
    pads = [fake([PAD.A])];
    expect(g.poll(false)).toEqual(['rocket']);
  });

  it('no Gamepad API: never connected, never pressed', () => {
    vi.stubGlobal('navigator', {});
    const g = new GamepadInput();
    expect(g.poll(false)).toEqual([]);
    expect(g.connected).toBe(false);
  });
});
