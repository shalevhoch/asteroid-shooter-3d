/** P08 wave UI: banners, objective progress, the HUD wave line, the won flow, the difficulty setting. Pure. */
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_WAVES, INITIAL_WAVE, initialState } from '@asteroid/sim';
import { nextPhase } from '../src/game.js';
import { parseSettings } from '../src/settings.js';
import { DIFFICULTY_LABELS, bannerFor, objectiveProgress, waveLine } from '../src/waveUi.js';

describe('wave banners', () => {
  it('announces a wave with its count and objective', () => {
    const b = bannerFor([{ type: 'waveStarted', wave: 3, count: 9, objective: { kind: 'rocketKills', count: 2 } }]);
    expect(b?.title).toBe(`Wave 3 of ${String(CAMPAIGN_WAVES)}`);
    expect(b?.subtitle).toMatch(/9 asteroids · Mission: Destroy 2 asteroids with rockets/);
    expect(bannerFor([{ type: 'waveStarted', wave: 12, count: 27, objective: null }])?.title).toBe('Endless wave 12');
  });

  it('reports a clear with the objective bonus and regen', () => {
    const b = bannerFor([
      { type: 'objectiveMet', wave: 2, points: 70, repair: 10 },
      { type: 'waveCleared', wave: 2, objectiveMet: true, regen: 20, clearBonus: 40, earthBonus: 30 },
    ]);
    expect(b).toEqual({ title: 'Wave 2 cleared', subtitle: 'Clear bonus +40 · Earth bonus +30 · Objective met: +70 points, Earth +10 · Earth regenerates +20', durationMs: 3500 });
    expect(bannerFor([{ type: 'waveCleared', wave: 1, objectiveMet: false, regen: 0, clearBonus: 20, earthBonus: 12 }])?.subtitle).toBe('Clear bonus +20 · Earth bonus +12');
    expect(bannerFor([{ type: 'mothershipBump' }])).toBeNull();
  });
});

describe('wave HUD line', () => {
  it('shows the wave, the lead-in and objective progress', () => {
    const s = initialState(1);
    expect(waveLine(s)).toBe(`WAVE 1/${String(CAMPAIGN_WAVES)} · incoming`);
    const w3 = { ...s, wave: { ...INITIAL_WAVE, number: 3, phase: 'active' as const, rocketKills: 1 } };
    expect(waveLine(w3)).toBe(`WAVE 3/${String(CAMPAIGN_WAVES)} · Rocket kills 1/2`);
    expect(waveLine({ ...s, wave: { ...INITIAL_WAVE, number: 13, phase: 'active' as const } })).toMatch(/^ENDLESS 13/);
  });

  it('marks pass/fail objectives', () => {
    expect(objectiveProgress({ kind: 'noEarthHit' }, INITIAL_WAVE)).toBe('No Earth hits ✓');
    expect(objectiveProgress({ kind: 'noEarthHit' }, { ...INITIAL_WAVE, earthHits: 2 })).toBe('No Earth hits ✗');
    expect(objectiveProgress({ kind: 'photonOnly' }, { ...INITIAL_WAVE, rocketsFired: 1 })).toBe('Photons only ✗');
    expect(objectiveProgress({ kind: 'bigKills', count: 2 }, { ...INITIAL_WAVE, bigKills: 5 })).toBe('Big kills 2/2');
    expect(objectiveProgress(null, INITIAL_WAVE)).toBe('');
  });
});

describe('won flow and difficulty setting', () => {
  it('goes playing → won → playing (endless) or → over (finish)', () => {
    expect(nextPhase('playing', 'win')).toBe('won');
    expect(nextPhase('won', 'continue')).toBe('playing');
    expect(nextPhase('won', 'finish')).toBe('over');
    expect(nextPhase('paused', 'win')).toBe('paused');
    expect(nextPhase('over', 'continue')).toBe('over');
  });

  it('defaults to Normal and keeps a valid stored difficulty', () => {
    expect(parseSettings(null).difficulty).toBe('normal');
    expect(parseSettings('{"difficulty":"kid"}').difficulty).toBe('kid');
    expect(parseSettings('{"difficulty":"nightmare"}').difficulty).toBe('normal');
    expect(Object.keys(DIFFICULTY_LABELS)).toEqual(['kid', 'normal', 'hard']);
  });
});
