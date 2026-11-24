/** P31 mission UI: the wave-start banner names the mission, the clear banner the credits, the HUD the progress. */
import { describe, expect, it } from 'vitest';
import { INITIAL_WAVE, initialState, missionFor } from '@asteroid/sim';
import { bannerFor, objectiveProgress, waveLine } from '../src/waveUi.js';

describe('mission UI', () => {
  it('banners name the mission and the bonus credits', () => {
    const start = bannerFor([{ type: 'waveStarted', wave: 1, count: 5, objective: { kind: 'combo', count: 3 } }]);
    expect(start?.subtitle).toBe('5 asteroids · Mission: Chain a 3-kill combo');
    const clear = bannerFor([
      { type: 'missionComplete', wave: 1, mission: { kind: 'combo', count: 3 }, credits: 30 },
      { type: 'waveCleared', wave: 1, objectiveMet: true, regen: 0, clearBonus: 20, earthBonus: 30 },
    ]);
    expect(clear?.subtitle).toMatch(/^Mission complete: \+◆ 30 · Clear bonus/);
  });

  it('progress lines for the new missions', () => {
    const w = { ...INITIAL_WAVE, phase: 'active' as const };
    expect(objectiveProgress({ kind: 'combo', count: 3 }, { ...w, bestCombo: 2 })).toBe('Best chain 2/3');
    expect(objectiveProgress({ kind: 'noHullDamage' }, { ...w, hullBurns: 1 })).toBe('No hull burns ✗');
    expect(objectiveProgress({ kind: 'fastClear', seconds: 15 }, w)).toBe('Fast clear (15 s)');
    expect(objectiveProgress({ kind: 'fastClear', seconds: 15 }, { ...w, sinceSpawn: 100 }, true)).toBe('Clear in 11 s');
  });

  it('the HUD wave line shows wave 1\'s seeded mission', () => {
    const s = initialState(5);
    const line = waveLine({ ...s, wave: { ...s.wave, phase: 'active' } });
    expect(line).toContain(objectiveProgress(missionFor(5, 1), { ...s.wave, phase: 'active' }));
    expect(line.split(' · ').length).toBe(2);
  });
});
