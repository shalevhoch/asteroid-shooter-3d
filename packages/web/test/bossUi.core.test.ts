/** P34 boss UI: the HUD boss bar and the boss banners. */
import { describe, expect, it } from 'vitest';
import { BOSS_HP, initialState, makeAsteroid } from '@asteroid/sim';
import { hudModel } from '../src/hud.js';
import { bannerFor } from '../src/waveUi.js';
import { cuesFor } from '../src/audio.js';

describe('boss UI', () => {
  it('the boss bar shows while a boss lives', () => {
    const s = initialState(1);
    expect(hudModel(s, 0).boss).toBeNull();
    expect(hudModel({ ...s, asteroids: [{ ...makeAsteroid(1, 'boss', [0, 0, 0]), hp: BOSS_HP / 2 }] }, 0).boss).toBe(0.5);
  });

  it('banners announce the boss and its defeat; a boss kill booms', () => {
    expect(bannerFor([{ type: 'waveStarted', wave: 5, count: 13, objective: null }, { type: 'bossSpawned', id: 9, wave: 5 }])?.title).toBe('⚠ Boss incoming');
    expect(bannerFor([{ type: 'bossDefeated', id: 9, wave: 5, credits: 100 }])?.subtitle).toBe('+◆ 100 bonus credits');
    expect(cuesFor([{ type: 'asteroidDestroyed', id: 9, size: 'boss', by: 'rocket', pos: [0, 0, 0], points: 300, base: 300, combo: 1, multiplier: 1 }])).toEqual([{ sound: 'kaboom', volume: 1 }, { sound: 'rumble', volume: 1 }]);
  });
});
