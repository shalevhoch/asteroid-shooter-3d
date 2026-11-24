/** P33 daily challenge: the seed comes from the UTC date; the best is kept per day; the run is upgrade-free. */
import { describe, expect, it } from 'vitest';
import { NO_UPGRADES, initialState } from '@asteroid/sim';
import { DAILY_CRAFT, DAILY_DIFFICULTY, DAILY_OPTIONS, dailyBest, dailySeed, recordDaily, utcDate } from '../src/daily.js';

describe('daily challenge', () => {
  it('the seed follows the UTC date, not the local one', () => {
    expect(utcDate(new Date('2026-11-24T23:30:00-05:00'))).toBe('2026-11-25');
    expect(utcDate(new Date('2026-11-25T01:30:00+02:00'))).toBe('2026-11-24');
    expect(dailySeed('2026-11-24')).toBe(dailySeed('2026-11-24'));
    expect(dailySeed('2026-11-24')).not.toBe(dailySeed('2026-11-25'));
    expect(Number.isInteger(dailySeed('2026-11-24')) && dailySeed('2026-11-24') >= 0).toBe(true);
  });

  it('a year of days gives distinct seeds', () => {
    const seeds = new Set(Array.from({ length: 366 }, (_, i) => dailySeed(utcDate(new Date(Date.UTC(2026, 0, 1 + i))))));
    expect(seeds.size).toBe(366);
  });

  it('everyone gets the same run: fixed difficulty, craft, no upgrades, no credits', () => {
    const a = initialState(dailySeed('2026-11-24'), DAILY_DIFFICULTY, DAILY_CRAFT, DAILY_OPTIONS);
    expect(a).toEqual(initialState(dailySeed('2026-11-24'), DAILY_DIFFICULTY, DAILY_CRAFT, DAILY_OPTIONS));
    expect(a.upgrades).toEqual(NO_UPGRADES);
    expect(a.credits).toBe(0);
    expect(a.earnsCredits).toBe(false);
  });

  it('the best is kept per day; yesterday\'s or broken records read as 0', () => {
    expect(dailyBest(null, '2026-11-24')).toBe(0);
    expect(dailyBest('{bad', '2026-11-24')).toBe(0);
    expect(dailyBest(JSON.stringify({ date: '2026-11-23', best: 900 }), '2026-11-24')).toBe(0);
    const first = recordDaily(null, '2026-11-24', 300);
    expect(first).toEqual({ store: { date: '2026-11-24', best: 300 }, isNew: true });
    expect(recordDaily(JSON.stringify(first.store), '2026-11-24', 200)).toEqual({ store: { date: '2026-11-24', best: 300 }, isNew: false });
    expect(recordDaily(JSON.stringify(first.store), '2026-11-25', 50).isNew).toBe(true);
  });
});
