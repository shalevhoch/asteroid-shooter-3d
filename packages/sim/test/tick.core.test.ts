import { describe, expect, it } from 'vitest';
import { TICK_HZ, TICK_MS, ticksFor } from '../src/index.js';

describe('tick contract', () => {
  it('runs at 25 Hz, 40 ms per tick', () => {
    expect(TICK_HZ).toBe(25);
    expect(TICK_MS).toBe(40);
  });

  it('splits accumulated frame time into whole ticks and a carried remainder', () => {
    expect(ticksFor(0)).toEqual({ ticks: 0, remainderMs: 0 });
    expect(ticksFor(39)).toEqual({ ticks: 0, remainderMs: 39 });
    expect(ticksFor(100)).toEqual({ ticks: 2, remainderMs: 20 });
  });

  it('ignores negative and non-finite input', () => {
    expect(ticksFor(-5)).toEqual({ ticks: 0, remainderMs: 0 });
    expect(ticksFor(Number.NaN)).toEqual({ ticks: 0, remainderMs: 0 });
  });
});
