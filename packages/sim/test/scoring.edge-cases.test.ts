/** docs/spec/scoring/scoring.edge-cases.feature. */
import { describe, expect, it } from 'vitest';
import { COMBO_MAX_MULTIPLIER, EARTH_MAX_HEALTH, NO_COMBO, comboAfterKill, comboMultiplier, destroyAsteroid, earthBonus, makeAsteroid, type GameState, type SimEvent } from '../src/index.js';
import { openSpace } from './helpers.js';

describe('scoring edge cases', () => {
  it('a kill exactly COMBO_WINDOW ticks after the last extends the chain; one tick later restarts it', () => {
    expect(comboAfterKill({ count: 3, lastKillTick: 0 }, 75).count).toBe(4);
    expect(comboAfterKill({ count: 3, lastKillTick: 0 }, 76).count).toBe(1);
  });

  it('the first kill of a run starts a chain of one', () => {
    expect(comboAfterKill(NO_COMBO, 0).count).toBe(1);
  });

  it('the multiplier never exceeds the cap, however long the chain', () => {
    expect(comboMultiplier(10_000)).toBe(COMBO_MAX_MULTIPLIER);
    expect(comboMultiplier(0)).toBe(1);
  });

  it('a big photon kill counts once; its split pieces only count when they are destroyed', () => {
    let s: GameState = { ...openSpace(), tick: 5, asteroids: [makeAsteroid(1, 'big', [0, 0, 900])], nextId: 2 };
    const events: SimEvent[] = [];
    s = destroyAsteroid(s, 1, 'photon', events);
    expect(s.combo.count).toBe(1);
    expect(s.asteroids).toHaveLength(4);
  });

  it('the Earth bonus is 0 at 0 health and never negative', () => {
    expect(earthBonus(0)).toBe(0);
    expect(earthBonus(-5)).toBe(0);
    expect(earthBonus(EARTH_MAX_HEALTH * 0.99)).toBe(29);
  });

  it('destroying an unknown asteroid scores nothing and keeps the chain', () => {
    const s: GameState = { ...openSpace(), combo: { count: 2, lastKillTick: 0 } };
    const events: SimEvent[] = [];
    expect(destroyAsteroid(s, 99, 'photon', events)).toBe(s);
    expect(events).toEqual([]);
  });
});
