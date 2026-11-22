/** docs/spec/flight/flight.edge-cases.feature */
import { describe, expect, it } from 'vitest';
import { initialState, run, step, type GameState } from '../src/index.js';
import { input, openSpace, repeat } from './helpers.js';

const withFuel = (s: GameState, fuel: number): GameState => ({ ...s, ship: { ...s.ship, fuel } });

describe('flight edge cases', () => {
  it('clamps the throttle to 0..THROTTLE_MAX', () => {
    expect(step(initialState(1), input({ throttle: -1 })).state.ship.throttle).toBe(0);
    expect(run(initialState(1), repeat(6, input({ throttle: 1 }))).ship.throttle).toBe(4);
    expect(step(initialState(1), input({ throttle: 7 })).state.ship.throttle).toBe(1);
  });

  it('turbo with an empty tank falls back to the throttle', () => {
    let s = withFuel(run(openSpace(), repeat(1, input({ throttle: 1 }))), 1);
    const first = step(s, input({ turbo: true }));
    expect(first.state.ship.fuel).toBe(0);
    expect(first.events).toEqual([{ type: 'turboStarted' }, { type: 'fuelEmpty' }]);
    s = first.state;
    const second = step(s, input({ turbo: true }));
    expect(second.events).toEqual([{ type: 'turboEnded' }]);
    expect(second.state.ship.turbo).toBe(false);
    expect(second.state.ship.pos[2] - s.ship.pos[2]).toBeCloseTo(1, 9);
    expect(step(second.state, input({ turbo: true })).events).toEqual([]);
  });

  it('treats non-finite axes as 0 and clamps out-of-range ones', () => {
    const garbage = input({ pitch: NaN, yaw: Infinity, roll: -Infinity, throttle: NaN, strafeX: NaN, strafeY: -Infinity });
    const s = run(initialState(1), repeat(20, garbage));
    expect(s.ship.pos.every(Number.isFinite)).toBe(true);
    expect(s.ship.rot.every(Number.isFinite)).toBe(true);
    expect(s.ship.throttle).toBe(0);
    expect(run(initialState(1), repeat(10, input({ pitch: 50 })))).toEqual(run(initialState(1), repeat(10, input({ pitch: 1 }))));
  });

  it('keeps the orientation a unit quaternion over 10 000 ticks of tumbling', () => {
    const inputs = Array.from({ length: 10_000 }, (_, t) => input({ pitch: Math.sin(t / 7), yaw: Math.cos(t / 11), roll: Math.sin(t / 3) }));
    const q = run(initialState(1), inputs).ship.rot;
    expect(Math.hypot(...q)).toBeCloseTo(1, 12);
  });

  it('never mutates the input state and advances the tick by one', () => {
    const s = initialState(1);
    const copy = structuredClone(s);
    const next = step(s, input({ throttle: 1, pitch: 1 })).state;
    expect(s).toEqual(copy);
    expect(next.tick).toBe(1);
  });
});
