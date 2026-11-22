/** P13 settings edge cases. */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, parseSettings } from '../src/settings.js';

describe('settings edge cases', () => {
  it('non-finite numbers fall back to the defaults', () => {
    // JSON can't hold NaN or Infinity; huge exponents parse to Infinity.
    expect(parseSettings('{"sensitivity":1e999,"volume":-1e999}')).toMatchObject({ sensitivity: 1, volume: 1 });
  });

  it('settings saved before P13 (no sensitivity or volume) load with the new defaults', () => {
    const old = '{"layout":"classic","invertY":true,"camera":"chase","help":false,"muted":true,"difficulty":"kid","shake":false}';
    expect(parseSettings(old)).toEqual({ ...DEFAULT_SETTINGS, layout: 'classic', invertY: true, muted: true, difficulty: 'kid', shake: false });
  });

  it('a volume of 0 is kept (silence without muting)', () => {
    expect(parseSettings('{"volume":0}').volume).toBe(0);
  });
});

describe('craft setting (P17)', () => {
  it('a stored craft survives; an unknown one falls back to the Fighter', () => {
    expect(parseSettings('{"craft":"shuttle"}').craft).toBe('shuttle');
    expect(parseSettings('{"craft":"g-ship"}').craft).toBe('fighter');
  });
});
