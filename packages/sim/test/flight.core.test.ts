/** docs/spec/flight/flight.core.feature: SPEC.md §3. */
import { describe, expect, it } from 'vitest';
import { FUEL_MAX, SHIP_START, TURBO_STEP, initialState, run, step, type GameState, type SimEvent } from '../src/index.js';
import { expectVec, forwardOf, input, repeat, rightOf, upOf } from './helpers.js';

const start = () => initialState(1);
const runEvents = (s: GameState, inputs: ReturnType<typeof input>[]) => {
  const events: SimEvent[] = [];
  for (const i of inputs) {
    const r = step(s, i);
    s = r.state;
    events.push(...r.events);
  }
  return { state: s, events };
};

describe('ship flight', () => {
  it('starts in the hangar facing +Z with up +Y and right −X', () => {
    const s = start();
    expectVec(expect, s.ship.pos, SHIP_START);
    expectVec(expect, forwardOf(s), [0, 0, 1]);
    expectVec(expect, upOf(s), [0, 1, 0]);
    expectVec(expect, rightOf(s), [-1, 0, 0]);
  });

  it('stands still with no input', () => {
    expectVec(expect, run(start(), repeat(10, input())).ship.pos, SHIP_START);
  });

  it('moves forward at throttle × THROTTLE_STEP per tick', () => {
    const s = run(start(), [...repeat(4, input({ throttle: 1 })), ...repeat(10, input())]);
    expect(s.ship.throttle).toBe(4);
    expectVec(expect, s.ship.pos, [0, -960, 1 + 2 + 3 + 4 + 40]);
  });

  it('turbo overrides the throttle and burns 1 fuel per tick', () => {
    const throttled = run(start(), repeat(2, input({ throttle: 1 })));
    const z0 = throttled.ship.pos[2];
    const { state, events } = runEvents(throttled, repeat(5, input({ turbo: true })));
    expect(state.ship.pos[2] - z0).toBeCloseTo(5 * TURBO_STEP, 9);
    expect(state.ship.fuel).toBe(FUEL_MAX - 5);
    expect(state.ship.turbo).toBe(true);
    expect(events.filter((e) => e.type === 'turboStarted')).toHaveLength(1);
    const after = step(state, input());
    expect(after.events).toContainEqual({ type: 'turboEnded' });
    expect(after.state.ship.pos[2] - state.ship.pos[2]).toBeCloseTo(2, 9);
  });

  it('pitch +1 for 45 ticks (90°) points the nose up', () => {
    const s = run(start(), repeat(45, input({ pitch: 1 })));
    expectVec(expect, forwardOf(s), [0, 1, 0]);
    expectVec(expect, upOf(s), [0, 0, -1]);
  });

  it('yaw +1 for 45 ticks points the nose along the start right (−X)', () => {
    expectVec(expect, forwardOf(run(start(), repeat(45, input({ yaw: 1 })))), [-1, 0, 0]);
  });

  it('roll +1 for 45 ticks drops the right wing, so up points along the start right', () => {
    const s = run(start(), repeat(45, input({ roll: 1 })));
    expectVec(expect, upOf(s), [-1, 0, 0]);
    expectVec(expect, forwardOf(s), [0, 0, 1]);
  });

  it('turns about the current local axes, pitch → yaw → roll', () => {
    // Yaw right 90°, then pitch up 90°: the nose goes from −X to +Y regardless of the world frame.
    const s = run(start(), [...repeat(45, input({ yaw: 1 })), ...repeat(45, input({ pitch: 1 }))]);
    expectVec(expect, forwardOf(s), [0, 1, 0]);
  });

  it('strafes right and up and reverses at STRAFE_STEP', () => {
    const s = run(start(), repeat(10, input({ strafeX: 1, strafeY: 1, reverse: true })));
    // right is −X, up is +Y, back is −Z
    expectVec(expect, s.ship.pos, [-10, -950, -10]);
  });

  it('the mothership is solid: flying into the bay wall pushes the ship out and drops the throttle', () => {
    const faced = run(start(), repeat(45, input({ yaw: 1 })));
    let s = run(faced, repeat(4, input({ throttle: 1 })));
    let bumps = 0;
    for (let t = 0; t < 200; t++) {
      const r = step(s, input({ throttle: s.ship.throttle < 4 ? 1 : 0 }));
      s = r.state;
      bumps += r.events.filter((e) => e.type === 'mothershipBump').length;
      // b3's inner face is at x ≈ −104.3; the ship's sphere (r = 20) stays clear of it.
      expect(s.ship.pos[0]).toBeGreaterThanOrEqual(-104.3 + 20 - 1e-6);
    }
    expect(bumps).toBeGreaterThan(0);
  });
});
