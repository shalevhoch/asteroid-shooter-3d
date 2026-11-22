/** INV-7: the same seed and input log give a deep-equal state. */
import { describe, expect, it } from 'vitest';
import { initialState, run, type Input } from '../src/index.js';

const log: Input[] = Array.from({ length: 2000 }, (_, t) => ({
  pitch: Math.sin(t / 13),
  yaw: Math.cos(t / 17),
  roll: t % 50 < 10 ? 1 : 0,
  throttle: t % 97 === 0 ? 1 : t % 131 === 0 ? -1 : 0,
  turbo: t % 300 < 40,
  strafeX: t % 7 === 0 ? 1 : 0,
  strafeY: t % 11 === 0 ? -1 : 0,
  reverse: t % 400 < 5,
}));

describe('replay', () => {
  it('replays to a deep-equal state', () => {
    expect(run(initialState(99), log)).toEqual(run(initialState(99), log));
  });

  it('serialises and resumes mid-run identically', () => {
    const half = run(initialState(99), log.slice(0, 1000));
    const resumed = run(JSON.parse(JSON.stringify(half)) as typeof half, log.slice(1000));
    expect(resumed).toEqual(run(initialState(99), log));
  });
});
