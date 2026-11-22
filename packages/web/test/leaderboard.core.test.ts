/** P10: the local top-10 and the run summary's breakdown. Pure. */
import { describe, expect, it } from 'vitest';
import { comboMultiplier, nextFloat, pointsIn, type RngState, type SimEvent } from '@asteroid/sim';
import { EMPTY_STATS, addStats, breakdownTotal } from '../src/game.js';
import { TOP_SIZE, insertScore, localDate, parseTop, type ScoreEntry } from '../src/leaderboard.js';

const entry = (score: number, over: Partial<ScoreEntry> = {}): ScoreEntry => ({ score, difficulty: 'normal', waves: 2, won: false, date: '2026-11-22', ...over });

describe('top-10', () => {
  it('inserts best first and reports the rank', () => {
    let list: ScoreEntry[] = [];
    for (const s of [300, 100, 200]) list = insertScore(list, entry(s)).list;
    expect(list.map((e) => e.score)).toEqual([300, 200, 100]);
    expect(insertScore(list, entry(250)).rank).toBe(2);
  });

  it('keeps 10, drops runs that do not place, and keeps older ties ahead', () => {
    let list: ScoreEntry[] = [];
    for (let i = 1; i <= 12; i++) list = insertScore(list, entry(i * 10)).list;
    expect(list).toHaveLength(TOP_SIZE);
    expect(list.at(-1)?.score).toBe(30);
    expect(insertScore(list, entry(30)).rank).toBeNull();
    const tie = insertScore(list, entry(120, { difficulty: 'hard' }));
    expect(tie.rank).toBe(2);
    expect(tie.list[0]?.difficulty).toBe('normal');
  });

  it('never records a 0 score', () => {
    expect(insertScore([], entry(0)).rank).toBeNull();
  });

  it('parses storage defensively', () => {
    expect(parseTop(null)).toEqual([]);
    expect(parseTop('nope')).toEqual([]);
    expect(parseTop('{"a":1}')).toEqual([]);
    const raw = JSON.stringify([entry(5), { score: 'x' }, entry(50, { difficulty: 'kid' }), { ...entry(7), difficulty: 'insane' }, entry(-3)]);
    expect(parseTop(raw).map((e) => e.score)).toEqual([50, 5]);
    expect(parseTop(JSON.stringify(Array.from({ length: 15 }, (_, i) => entry(i + 1))))).toHaveLength(TOP_SIZE);
  });

  it('formats the local date', () => {
    expect(localDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('run summary breakdown', () => {
  it('always adds up to the sim score (Σ scored events), over 500 random event streams', () => {
    let r: RngState = 4;
    const u = () => {
      const [v, n] = nextFloat(r);
      r = n;
      return v;
    };
    for (let trial = 0; trial < 500; trial++) {
      const events: SimEvent[] = [];
      for (let i = 0; i < 40; i++) {
        const k = u();
        if (k < 0.5) {
          const combo = 1 + Math.floor(u() * 9);
          const base = [8, 10, 15, 20][Math.floor(u() * 4)] ?? 10;
          const multiplier = comboMultiplier(combo);
          events.push({ type: 'asteroidDestroyed', id: i, size: u() < 0.5 ? 'big' : 'small', by: u() < 0.5 ? 'photon' : 'rocket', pos: [0, 0, 0], base, combo, multiplier, points: base * multiplier });
        } else if (k < 0.6) events.push({ type: 'objectiveMet', wave: i, points: 50 + 10 * i, repair: 10 });
        else if (k < 0.7) events.push({ type: 'waveCleared', wave: i, objectiveMet: false, regen: 0, clearBonus: 20 * i, earthBonus: Math.floor(u() * 31) });
        else events.push({ type: 'photonFired', id: i, pos: [0, 0, 0] });
      }
      const stats = addStats(EMPTY_STATS, events);
      expect(breakdownTotal(stats)).toBe(pointsIn(events));
    }
  });

  it('tracks the best chain', () => {
    const k = (combo: number): SimEvent => ({ type: 'asteroidDestroyed', id: 1, size: 'small', by: 'photon', pos: [0, 0, 0], base: 10, combo, multiplier: comboMultiplier(combo), points: 10 * comboMultiplier(combo) });
    const s = addStats(EMPTY_STATS, [k(1), k(2), k(3), k(1)]);
    expect(s.bestCombo).toBe(3);
    expect(s.comboPoints).toBe(10);
    expect(s.killPoints).toBe(40);
  });
});
