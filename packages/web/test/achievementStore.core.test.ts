/** P16: achievement unlocks persist and only toast once. */
import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_IDS } from '@asteroid/sim';
import { parseUnlocks, recordUnlocks, unlockedCount } from '../src/achievementStore.js';

describe('achievement store', () => {
  it('records new unlocks once and survives a reload', () => {
    const a = recordUnlocks({}, ['firstContact', 'perfectWave', 'firstContact'], '2026-11-22');
    expect(a.fresh).toEqual(['firstContact', 'perfectWave']);
    const back = parseUnlocks(JSON.stringify(a.store));
    expect(back).toEqual({ firstContact: '2026-11-22', perfectWave: '2026-11-22' });
    const b = recordUnlocks(back, ['firstContact', 'longHaul'], '2026-11-23');
    expect(b.fresh).toEqual(['longHaul']);
    expect(b.store.firstContact).toBe('2026-11-22');
    expect(unlockedCount(b.store)).toBe(3);
  });

  it('nothing new keeps the same object', () => {
    const s = { firstContact: 'x' };
    expect(recordUnlocks(s, ['firstContact'], 'y').store).toBe(s);
  });

  it('junk, arrays and unknown ids are dropped', () => {
    expect(parseUnlocks('nope')).toEqual({});
    expect(parseUnlocks('[1]')).toEqual({});
    expect(parseUnlocks('{"bogus":"d","longHaul":3,"hardened":"2026-01-01"}')).toEqual({ hardened: '2026-01-01' });
    expect(ACHIEVEMENT_IDS).toHaveLength(12);
  });
});
