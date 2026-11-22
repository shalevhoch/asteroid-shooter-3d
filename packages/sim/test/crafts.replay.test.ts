/** P17: each craft replays deterministically, and crafts diverge on the same inputs. */
import { describe, expect, it } from 'vitest';
import { CRAFT_IDS, initialState, run, type Input } from '../src/index.js';
import { input } from './helpers.js';

const log: Input[] = Array.from({ length: 1500 }, (_, t) => input({ yaw: Math.sin(t / 30), pitch: Math.cos(t / 45) * 0.5, throttle: t === 5 ? 1 : 0, firePhoton: t % 3 === 0, fireRocket: t % 400 === 0, turbo: t % 200 < 20 }));

describe('craft replay', () => {
  it.each(CRAFT_IDS)('%s replays to a deep-equal state', (id) => {
    expect(run(initialState(9, 'normal', id), log)).toEqual(run(initialState(9, 'normal', id), log));
  });

  it('different crafts fly different paths', () => {
    const [a, b, c] = CRAFT_IDS.map((id) => run(initialState(9, 'normal', id), log).ship.pos);
    expect(a).not.toEqual(b);
    expect(a).not.toEqual(c);
  });
});
