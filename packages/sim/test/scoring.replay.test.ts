/** Scoring replays: the same seed, difficulty and inputs give the same score, combo and events. */
import { describe, expect, it } from 'vitest';
import { initialState, nextFloat, step, type GameState, type Input, type RngState, type SimEvent } from '../src/index.js';
import { aimbot } from './helpers.js';

function record(seed: number): { inputs: Input[]; end: GameState; events: SimEvent[] } {
  let rng: RngState = seed;
  const r = () => {
    const [v, n] = nextFloat(rng);
    rng = n;
    return v;
  };
  let s = initialState(seed);
  s = { ...s, ship: { ...s.ship, pos: [1200, 0, 0] } };
  const inputs: Input[] = [];
  const events: SimEvent[] = [];
  for (let t = 0; t < 3000; t++) {
    const i = aimbot(s, r);
    inputs.push(i);
    const res = step(s, i);
    events.push(...res.events);
    s = res.state;
  }
  return { inputs, end: s, events };
}

describe('scoring replay', () => {
  it('replays a scored run to a deep-equal state and event log', () => {
    const a = record(5);
    let s = initialState(5);
    s = { ...s, ship: { ...s.ship, pos: [1200, 0, 0] } };
    const events: SimEvent[] = [];
    for (const i of a.inputs) {
      const res = step(s, i);
      events.push(...res.events);
      s = res.state;
    }
    expect(a.end.score).toBeGreaterThan(0);
    expect(s).toEqual(a.end);
    expect(events).toEqual(a.events);
  });
});
