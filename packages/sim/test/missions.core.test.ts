/** P31 wave missions: every wave has one; seeded ones are deterministic; each type is checked; completion pays credits. */
import { describe, expect, it } from 'vitest';
import {
  ATMOSPHERE_RADIUS, EARTH_POS, EARTH_RADIUS, INITIAL_WAVE, NO_INPUT, creditsFor, initialState, missionCredits, missionFor, objectiveMet, seededMissions, step, waveDef, type GameState, type Objective,
} from '../src/index.js';
import { openSpace } from './helpers.js';

const W = INITIAL_WAVE;
/** A wave that's fully spawned and empty, so the next tick clears it. */
const clearing = (s: GameState, number: number, over: Partial<GameState['wave']> = {}): GameState => ({ ...s, asteroids: [], wave: { ...W, number, phase: 'active', spawned: waveDef(number).count, timer: 1, ...over } });

describe('wave missions', () => {
  it('every wave has a mission: the campaign objective where there is one, else a seeded draw', () => {
    for (let n = 1; n <= 30; n++) {
      const m = missionFor(123, n);
      expect(m).toBeTruthy();
      const o = waveDef(n).objective;
      if (o) expect(m).toEqual(o);
      else expect(seededMissions(n)).toContainEqual(m);
    }
  });

  it('seeded missions are the same for the same seed and vary across seeds', () => {
    expect(missionFor(7, 1)).toEqual(missionFor(7, 1));
    const kinds = new Set(Array.from({ length: 60 }, (_, i) => missionFor(i, 1).kind));
    expect(kinds).toEqual(new Set(['fastClear', 'combo', 'noHullDamage']));
  });

  it('each new mission type is judged on its tally', () => {
    const fast: Objective = { kind: 'fastClear', seconds: 15 };
    expect(objectiveMet(fast, { ...W, sinceSpawn: 375 })).toBe(true);
    expect(objectiveMet(fast, { ...W, sinceSpawn: 376 })).toBe(false);
    expect(objectiveMet({ kind: 'combo', count: 3 }, { ...W, bestCombo: 3 })).toBe(true);
    expect(objectiveMet({ kind: 'combo', count: 3 }, { ...W, bestCombo: 2 })).toBe(false);
    expect(objectiveMet({ kind: 'noHullDamage' }, W)).toBe(true);
    expect(objectiveMet({ kind: 'noHullDamage' }, { ...W, hullBurns: 1 })).toBe(false);
  });

  it('the tallies follow the wave: time since the last spawn, best chain, atmosphere burns', () => {
    const s = clearing(openSpace(), 1, { spawned: 0, timer: 5 });
    const r = step({ ...s, asteroids: [] }, NO_INPUT).state;
    expect(r.wave.sinceSpawn).toBe(1);
    const inAir: [number, number, number] = [EARTH_POS[0], EARTH_POS[1] + (EARTH_RADIUS + ATMOSPHERE_RADIUS) / 2, EARTH_POS[2]];
    const burnt = step({ ...s, ship: { ...s.ship, pos: inAir } }, NO_INPUT);
    expect(burnt.events.some((e) => e.type === 'hullBurning')).toBe(true);
    expect(burnt.state.wave.hullBurns).toBe(1);
  });

  it('completing a mission raises missionComplete with bonus credits; the wave start announces it', () => {
    const seed = Array.from({ length: 50 }, (_, i) => i).find((i) => missionFor(i, 1).kind === 'noHullDamage') ?? 0;
    const s = clearing(initialState(seed), 1);
    const r = step({ ...s, ship: { ...s.ship, pos: [0, 0, 0] } }, NO_INPUT);
    const done = r.events.find((e) => e.type === 'missionComplete');
    expect(done).toEqual({ type: 'missionComplete', wave: 1, mission: { kind: 'noHullDamage' }, credits: missionCredits(1) });
    expect(r.events.some((e) => e.type === 'objectiveMet')).toBe(false); // seeded missions pay credits, not points
    expect(r.state.credits).toBe(creditsFor(r.events));
    const start = step({ ...initialState(seed), wave: { ...W, timer: 1 } }, NO_INPUT).events.find((e) => e.type === 'waveStarted');
    expect(start).toMatchObject({ objective: { kind: 'noHullDamage' } });
  });

  it('a campaign objective still pays its points and repair, plus the mission credits', () => {
    const s = clearing(openSpace(), 2);
    const r = step(s, NO_INPUT);
    expect(r.events.some((e) => e.type === 'objectiveMet')).toBe(true);
    expect(r.events.find((e) => e.type === 'missionComplete')).toMatchObject({ wave: 2, credits: missionCredits(2) });
  });

  it('a failed mission pays nothing', () => {
    const r = step(clearing(openSpace(), 2, { earthHits: 1 }), NO_INPUT);
    expect(r.events.some((e) => e.type === 'missionComplete')).toBe(false);
  });
});
