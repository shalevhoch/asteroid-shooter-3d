/** docs/spec/achievements/achievements.md invariants over random aimbot runs. */
import { describe, expect, it } from 'vitest';
import { ACHIEVEMENT_IDS, NEW_RUN, initialState, nextFloat, step, trackAchievements, type RngState } from '../src/index.js';
import { aimbot } from './helpers.js';

describe('achievement invariants', () => {
  it('INV-1/2/3: unlocks are known ids in list order without repeats, the tracker never mutates its input, and replays agree', () => {
    for (const seed of [1, 2]) {
      const go = () => {
        let rng: RngState = seed;
        const r = () => {
          const [v, n] = nextFloat(rng);
          rng = n;
          return v;
        };
        let s = initialState(seed);
        s = { ...s, ship: { ...s.ship, pos: [1200, 0, 0] } };
        let run = NEW_RUN;
        const log: string[] = [];
        for (let t = 0; t < 2500; t++) {
          const res = step(s, aimbot(s, r));
          s = res.state;
          const before = JSON.stringify(run);
          const out = trackAchievements(run, res.events, s);
          expect(JSON.stringify(run)).toBe(before);
          const idx = out.unlocked.map((id) => ACHIEVEMENT_IDS.indexOf(id));
          expect(idx.every((i) => i >= 0)).toBe(true);
          expect([...idx].sort((a, b) => a - b)).toEqual(idx);
          expect(new Set(idx).size).toBe(idx.length);
          run = out.run;
          log.push(...out.unlocked.map((id) => `${String(t)}:${id}`));
        }
        return log;
      };
      expect(go()).toEqual(go());
    }
  });
});
