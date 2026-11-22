/** docs/spec/waves/waves.edge-cases.feature */
import { describe, expect, it } from 'vitest';
import { CAMPAIGN_WAVES, ENDLESS_MAX_BIG, ENDLESS_MAX_SPEED, ENDLESS_MIN_INTERVAL, EARTH_MAX_HEALTH, describeObjective, objectiveMet, waveDef, INITIAL_WAVE, initialState, run, NO_INPUT } from '../src/index.js';

describe('wave edge cases', () => {
  it('caps endless waves', () => {
    const w = waveDef(500);
    expect(w.interval).toBe(ENDLESS_MIN_INTERVAL);
    expect(w.speed).toBe(ENDLESS_MAX_SPEED);
    expect(w.bigChance).toBe(ENDLESS_MAX_BIG);
    expect(waveDef(0)).toEqual(waveDef(1));
    expect(waveDef(-3)).toEqual(waveDef(1));
  });

  it('gives every campaign wave after the first an objective, and cycles them in endless', () => {
    expect(waveDef(1).objective).toBeNull();
    for (let n = 2; n <= CAMPAIGN_WAVES; n++) expect(waveDef(n).objective).not.toBeNull();
    expect(waveDef(CAMPAIGN_WAVES + 2).objective).toEqual(waveDef(2).objective);
  });

  it('judges objectives from the wave tallies', () => {
    expect(objectiveMet(null, INITIAL_WAVE)).toBe(false);
    expect(objectiveMet({ kind: 'noEarthHit' }, { ...INITIAL_WAVE, earthHits: 1 })).toBe(false);
    expect(objectiveMet({ kind: 'rocketKills', count: 2 }, { ...INITIAL_WAVE, rocketKills: 2 })).toBe(true);
    expect(objectiveMet({ kind: 'bigKills', count: 2 }, { ...INITIAL_WAVE, bigKills: 1 })).toBe(false);
    expect(objectiveMet({ kind: 'photonOnly' }, { ...INITIAL_WAVE, rocketsFired: 1 })).toBe(false);
    expect(describeObjective({ kind: 'rocketKills', count: 3 })).toMatch(/3/);
    expect(describeObjective(null)).toBe('');
  });

  it('never repairs Earth past its maximum', () => {
    const s = initialState(1, 'kid');
    const after = run({ ...s, ship: { ...s.ship, pos: [0, 0, 0] } }, Array.from({ length: 3000 }, () => NO_INPUT));
    expect(after.earthHealth).toBeLessThanOrEqual(EARTH_MAX_HEALTH);
  });
});
