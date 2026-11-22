/** docs/spec/scoring/scoring.md INV-1..4: the score is the sum of its scored events, kills pay base × multiplier, the multiplier is capped. */
import { describe, expect, it } from 'vitest';
import { COMBO_MAX_MULTIPLIER, comboMultiplier, initialState, nextFloat, pointsIn, step, type Difficulty, type GameState, type RngState } from '../src/index.js';
import { aimbot } from './helpers.js';

function play(seed: number, difficulty: Difficulty, ticks: number, check: (before: GameState, after: GameState, events: ReturnType<typeof step>['events']) => void): GameState {
  let rng: RngState = seed;
  const r = () => {
    const [v, n] = nextFloat(rng);
    rng = n;
    return v;
  };
  let s = initialState(seed, difficulty);
  s = { ...s, ship: { ...s.ship, pos: [1200, 0, 0] } };
  for (let t = 0; t < ticks && !s.ended; t++) {
    const res = step(s, aimbot(s, r));
    check(s, res.state, res.events);
    s = res.state;
  }
  return s;
}

describe('scoring invariants', () => {
  for (const [seed, difficulty] of [[3, 'kid'], [8, 'normal'], [21, 'hard']] as const) {
    it(`score = Σ scored events, kills pay base × capped multiplier (seed ${String(seed)}, ${difficulty})`, () => {
      let total = 0;
      let kills = 0;
      let clears = 0;
      let comboKills = 0;
      const end = play(seed, difficulty, 6000, (before, after, events) => {
        total += pointsIn(events);
        expect(after.score).toBe(total);
        expect(after.score).toBeGreaterThanOrEqual(before.score);
        for (const e of events) {
          if (e.type === 'asteroidDestroyed') {
            kills++;
            expect(e.multiplier).toBe(comboMultiplier(e.combo));
            expect(e.multiplier).toBeLessThanOrEqual(COMBO_MAX_MULTIPLIER);
            expect(e.points).toBe(e.base * e.multiplier);
            if (e.combo > 1) comboKills++;
          }
          if (e.type === 'waveCleared') clears++;
        }
      });
      expect(kills, 'the autopilot should score kills').toBeGreaterThan(5);
      expect(clears, 'and clear waves').toBeGreaterThan(0);
      expect(comboKills, 'and chain combos').toBeGreaterThan(0);
      expect(end.score).toBe(total);
    });
  }
});
