/** P16 achievement edge cases. */
import { describe, expect, it } from 'vitest';
import { LONG_HAUL_TICKS, NEW_RUN, initialState, trackAchievements } from '../src/index.js';

describe('achievement edge cases', () => {
  it('a run that ended does not earn Long haul', () => {
    const s = { ...initialState(1), tick: LONG_HAUL_TICKS + 1, ended: 'earthDestroyed' as const };
    expect(trackAchievements(NEW_RUN, [], s).unlocked).not.toContain('longHaul');
  });

  it('an empty tick changes nothing', () => {
    const s = initialState(1);
    expect(trackAchievements(NEW_RUN, [], s)).toEqual({ run: NEW_RUN, unlocked: [] });
  });

  it('a photon still in flight is neither a hit nor a miss', () => {
    const s0 = initialState(1);
    const fired = trackAchievements(NEW_RUN, [{ type: 'photonFired', id: 7, pos: [0, 0, 0] }], { ...s0, projectiles: [{ id: 7, kind: 'photon', pos: [0, 0, 0], dir: [0, 0, 1], life: 10, target: null } as never] });
    expect(fired.run.photonsInFlight).toEqual([7]);
    expect(fired.run.photonStreak).toBe(0);
  });

  it('a wave cleared after an Earth hit in an earlier wave is still a perfect wave once the new wave starts', () => {
    const s = initialState(1);
    let t = trackAchievements(NEW_RUN, [{ type: 'earthHit', id: 1, size: 'small', damage: 2, pos: [0, 0, 0] }], s);
    t = trackAchievements(t.run, [{ type: 'waveStarted', wave: 2, count: 5, objective: null }], s);
    t = trackAchievements(t.run, [{ type: 'waveCleared', wave: 2, objectiveMet: false, regen: 0, clearBonus: 40, earthBonus: 0 }], s);
    expect(t.unlocked).toContain('perfectWave');
  });
});
