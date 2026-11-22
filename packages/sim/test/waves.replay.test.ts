/** Replay-driven: the same seed, difficulty and input log give a deep-equal state across waves. */
import { describe, expect, it } from 'vitest';
import { DIFFICULTIES, initialState, run, type Input } from '../src/index.js';

const log: Input[] = Array.from({ length: 6000 }, (_, t) => ({
  pitch: Math.sin(t / 40) * 0.3,
  yaw: Math.cos(t / 55) * 0.4,
  roll: 0,
  throttle: t === 10 ? 1 : 0,
  turbo: false,
  strafeX: 0,
  strafeY: 0,
  reverse: false,
  firePhoton: true,
  fireRocket: t % 700 === 0,
}));

describe('wave replay', () => {
  it.each(DIFFICULTIES)('%s replays to a deep-equal state, and differs by difficulty', (d) => {
    const a = run(initialState(5, d), log);
    expect(a).toEqual(run(initialState(5, d), log));
    expect(a.wave.number).toBeGreaterThanOrEqual(1);
  });

  it('different difficulties diverge', () => {
    expect(run(initialState(5, 'kid'), log.slice(0, 1500)).asteroids).not.toEqual(run(initialState(5, 'hard'), log.slice(0, 1500)).asteroids);
  });
});
