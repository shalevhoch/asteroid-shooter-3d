import { describe, expect, it } from 'vitest';
import { initialState, type GameState, type SimEvent } from '@asteroid/sim';
import { TUTORIAL_STEPS, advanceTutorial, stepDone, tutorialHint } from '../src/tutorial.js';

const s0 = initialState(1);
const ev = (type: string): SimEvent[] => [{ type } as SimEvent];
const withShip = (patch: Partial<GameState['ship']>): GameState => ({ ...s0, ship: { ...s0.ship, ...patch } });

describe('first-run tutorial (P36)', () => {
  it('has five steps in order', () => {
    expect(TUTORIAL_STEPS).toEqual(['aim', 'fire', 'rocket', 'throttle', 'reload']);
  });
  it('each step completes on its own action only', () => {
    const [x, y, z, w] = s0.ship.rot;
    expect(stepDone('aim', s0, withShip({ rot: [x + 0.1, y, z, w] }), [])).toBe(true);
    expect(stepDone('aim', s0, s0, [])).toBe(false);
    expect(stepDone('fire', s0, s0, ev('photonFired'))).toBe(true);
    expect(stepDone('fire', s0, s0, ev('rocketFired'))).toBe(false);
    expect(stepDone('rocket', s0, s0, ev('rocketFired'))).toBe(true);
    expect(stepDone('throttle', s0, withShip({ throttle: s0.ship.throttle + 1 }), [])).toBe(true);
    expect(stepDone('throttle', s0, s0, [])).toBe(false);
    expect(stepDone('reload', s0, s0, ev('shipReloaded'))).toBe(true);
  });
  it('advances one step at a time and stops at the end', () => {
    expect(advanceTutorial(1, s0, s0, ev('photonFired'))).toBe(2);
    expect(advanceTutorial(2, s0, s0, ev('photonFired'))).toBe(2);
    expect(advanceTutorial(5, s0, s0, ev('shipReloaded'))).toBe(5);
  });
  it('has a hint for every step and input', () => {
    for (const s of TUTORIAL_STEPS) {
      expect(tutorialHint(s, false).length).toBeGreaterThan(10);
    }
  });
});
