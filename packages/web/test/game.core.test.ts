/** P07 run flow, stats, best score, HUD model, audio cues and FX bursts. All pure. */
import { describe, expect, it } from 'vitest';
import { EARTH_MAX_HEALTH, initialState, type GameState, type SimEvent } from '@asteroid/sim';
import { MAX_CUES_PER_TICK, cuesFor } from '../src/audio.js';
import { burstsFor } from '../src/fx.js';
import { EMPTY_STATS, accuracy, addStats, formatTime, nextPhase, parseBest, updateBest, type FlowAction, type Phase } from '../src/game.js';
import { hudModel } from '../src/hud.js';

const kill = (size: 'big' | 'small', by: 'photon' | 'rocket'): SimEvent => ({ type: 'asteroidDestroyed', id: 1, size, by, pos: [0, 0, 0], points: 10 });

describe('run flow', () => {
  it('goes title → playing ⇄ paused → over → playing', () => {
    let p: Phase = 'title';
    const seq: [FlowAction, Phase][] = [
      ['start', 'playing'],
      ['pause', 'paused'],
      ['resume', 'playing'],
      ['end', 'over'],
      ['restart', 'playing'],
    ];
    for (const [a, expected] of seq) {
      p = nextPhase(p, a);
      expect(p).toBe(expected);
    }
  });

  it('ignores actions that do not apply', () => {
    expect(nextPhase('title', 'pause')).toBe('title');
    expect(nextPhase('title', 'end')).toBe('title');
    expect(nextPhase('over', 'pause')).toBe('over');
    expect(nextPhase('over', 'resume')).toBe('over');
    expect(nextPhase('playing', 'start')).toBe('playing');
    expect(nextPhase('playing', 'restart')).toBe('playing');
    expect(nextPhase('paused', 'end')).toBe('over');
  });
});

describe('run stats', () => {
  it('counts kills, shots, hits and Earth hits', () => {
    const s = addStats(EMPTY_STATS, [
      { type: 'photonFired', id: 1, pos: [0, 0, 0] },
      { type: 'photonFired', id: 2, pos: [0, 0, 0] },
      { type: 'photonFired', id: 3, pos: [0, 0, 0] },
      { type: 'photonFired', id: 4, pos: [0, 0, 0] },
      { type: 'asteroidHit', id: 1, hp: 3, pos: [0, 0, 0] },
      kill('big', 'photon'),
      kill('small', 'rocket'),
      { type: 'rocketFired', id: 5, pos: [0, 0, 0], target: 1 },
      { type: 'earthHit', id: 2, size: 'small', damage: 2, pos: [0, 0, 0] },
    ]);
    expect(s).toEqual({ kills: 2, bigKills: 1, photonsFired: 4, photonHits: 2, rocketsFired: 1, earthHits: 1 });
    expect(accuracy(s)).toBe(50);
    expect(accuracy(EMPTY_STATS)).toBe(0);
  });

  it('formats time from ticks', () => {
    expect(formatTime(0)).toBe('0:00');
    expect(formatTime(25 * 75)).toBe('1:15');
    expect(formatTime(-5)).toBe('0:00');
  });
});

describe('best score', () => {
  it('parses stored values defensively', () => {
    expect(parseBest(null)).toBe(0);
    expect(parseBest('1234')).toBe(1234);
    expect(parseBest('12.9')).toBe(12);
    expect(parseBest('-5')).toBe(0);
    expect(parseBest('lots')).toBe(0);
  });

  it('only a higher score is a new best', () => {
    expect(updateBest(100, 150)).toEqual({ best: 150, isNew: true });
    expect(updateBest(100, 100)).toEqual({ best: 100, isNew: false });
    expect(updateBest(100, 40)).toEqual({ best: 100, isNew: false });
  });
});

describe('HUD model', () => {
  const s0 = initialState(1);
  it('shows full bars, all rockets and no warnings at the start', () => {
    const m = hudModel(s0, 300);
    expect(m).toMatchObject({ score: 0, best: 300, earth: 1, hull: 1, fuel: 1, rockets: 3, speed: 0, turbo: false, warnings: [] });
  });

  it('turns the speed gauge to max under turbo and raises warnings', () => {
    const s: GameState = { ...s0, score: 500, earthHealth: EARTH_MAX_HEALTH * 0.2, ship: { ...s0.ship, turbo: true, hull: 20, fuel: 0, rockets: 0 } };
    const m = hudModel(s, 300);
    expect(m.best).toBe(500);
    expect(m.speed).toBe(m.speedMax);
    expect(m.warnings).toEqual(['EARTH CRITICAL', 'HULL CRITICAL', 'NO FUEL', 'NO ROCKETS: RELOAD AT THE MOTHERSHIP']);
  });
});

describe('audio cues', () => {
  it('maps events to the original three sounds', () => {
    expect(cuesFor([{ type: 'photonFired', id: 1, pos: [0, 0, 0] }])).toEqual([{ sound: 'photon', volume: 0.25 }]);
    expect(cuesFor([{ type: 'rocketFired', id: 1, pos: [0, 0, 0], target: null }])[0]?.sound).toBe('rocket');
    expect(cuesFor([kill('big', 'photon')])[0]).toEqual({ sound: 'kaboom', volume: 0.9 });
    expect(cuesFor([{ type: 'mothershipBump' }])).toEqual([]);
  });

  it('caps cues per tick', () => {
    expect(cuesFor(Array.from({ length: 10 }, () => kill('small', 'photon')))).toHaveLength(MAX_CUES_PER_TICK);
  });
});

describe('fx bursts', () => {
  it('bursts on kills, Earth hits and photon hits, sized by asteroid', () => {
    const b = burstsFor([kill('big', 'photon'), kill('small', 'rocket'), { type: 'asteroidHit', id: 1, hp: 2, pos: [1, 2, 3] }, { type: 'photonFired', id: 1, pos: [0, 0, 0] }]);
    expect(b).toHaveLength(3);
    expect(b[0]?.size).toBeGreaterThan(b[1]?.size ?? Infinity);
    expect(b[2]?.pos).toEqual([1, 2, 3]);
  });
});
