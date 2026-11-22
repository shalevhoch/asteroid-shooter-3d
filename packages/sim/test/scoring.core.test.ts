/** SPEC §6 scoring v2: the combo multiplier and the wave-clear bonuses. */
import { describe, expect, it } from 'vitest';
import {
  BIG_PHOTON_POINTS, BIG_RADIUS, COMBO_WINDOW, EARTH_POS, EARTH_RADIUS, EARTH_BONUS_MAX, EARTH_MAX_HEALTH, NO_COMBO, SMALL_PHOTON_POINTS, WAVE_CLEAR_POINTS,
  clearBonus, comboAfterKill, comboLive, comboMultiplier, destroyAsteroid, earthBonus, makeAsteroid, step, waveDef,
  type GameState, type SimEvent,
} from '../src/index.js';
import { input, openSpace } from './helpers.js';

describe('combo multiplier', () => {
  it('steps up every 2 kills to ×4', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 20].map(comboMultiplier)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 4]);
  });

  it('chains kills inside the window and restarts outside it', () => {
    let c = comboAfterKill(NO_COMBO, 100);
    expect(c.count).toBe(1);
    c = comboAfterKill(c, 100 + COMBO_WINDOW);
    expect(c.count).toBe(2);
    expect(comboLive(c, 100 + 2 * COMBO_WINDOW)).toBe(true);
    expect(comboLive(c, 101 + 2 * COMBO_WINDOW)).toBe(false);
    expect(comboAfterKill(c, 101 + 2 * COMBO_WINDOW).count).toBe(1);
  });

  it('pays base × multiplier on the kill event', () => {
    let s: GameState = { ...openSpace(), tick: 10, asteroids: [1, 2, 3].map((id) => makeAsteroid(id, 'small', [id * 50, 0, 900])), nextId: 4 };
    const events: SimEvent[] = [];
    for (const id of [1, 2, 3]) s = destroyAsteroid(s, id, 'photon', events);
    expect(events.map((e) => (e.type === 'asteroidDestroyed' ? [e.base, e.combo, e.multiplier, e.points] : null))).toEqual([
      [SMALL_PHOTON_POINTS, 1, 1, 10],
      [SMALL_PHOTON_POINTS, 2, 1, 10],
      [SMALL_PHOTON_POINTS, 3, 2, 20],
    ]);
    expect(s.score).toBe(40);
  });

  it('is broken by an Earth impact', () => {
    let s: GameState = { ...openSpace(), tick: 10, combo: { count: 5, lastKillTick: 9 } };
    s = { ...s, asteroids: [makeAsteroid(1, 'big', [EARTH_POS[0] - EARTH_RADIUS - BIG_RADIUS - 30, 0, 0])], nextId: 2 };
    for (let i = 0; i < 40 && s.asteroids.length > 0; i++) s = step(s, input()).state;
    expect(s.combo).toEqual(NO_COMBO);
    const events: SimEvent[] = [];
    s = destroyAsteroid({ ...s, asteroids: [makeAsteroid(9, 'big', [0, 0, 900])] }, 9, 'photon', events);
    expect(events[0]).toMatchObject({ combo: 1, multiplier: 1, points: BIG_PHOTON_POINTS });
  });
});

describe('wave-clear bonuses', () => {
  it('pays 20 × wave and up to 30 for Earth health', () => {
    expect(clearBonus(3)).toBe(3 * WAVE_CLEAR_POINTS);
    expect(earthBonus(EARTH_MAX_HEALTH)).toBe(EARTH_BONUS_MAX);
    expect(earthBonus(EARTH_MAX_HEALTH / 2)).toBe(15);
  });

  it('adds both to the score at the clear, with the event carrying them', () => {
    const def = waveDef(1);
    const s0 = openSpace();
    const s: GameState = { ...s0, earthHealth: EARTH_MAX_HEALTH / 2, wave: { ...s0.wave, phase: 'active', spawned: def.count, timer: 5 } };
    const r = step(s, input());
    expect(r.events).toContainEqual({ type: 'waveCleared', wave: 1, objectiveMet: false, regen: 0, clearBonus: 20, earthBonus: 15 });
    expect(r.state.score).toBe(35);
  });
});
