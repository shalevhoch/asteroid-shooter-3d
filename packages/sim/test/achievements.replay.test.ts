/** P16 achievements, each driven by a sim replay: a crafted mid-run state, an input log, `step` and the tracker. */
import { describe, expect, it } from 'vitest';
import {
  EARTH_POS,
  EARTH_RADIUS,
  INITIAL_WAVE,
  LONG_HAUL_TICKS,
  NEW_RUN,
  initialState,
  makeAsteroid,
  step,
  trackAchievements,
  waveDef,
  type AchievementId,
  type AchievementRun,
  type AsteroidState,
  type Difficulty,
  type GameState,
  type Input,
} from '../src/index.js';
import { input, repeat } from './helpers.js';

/** `n` small, still, one-hit asteroids in a line straight ahead of a ship at the origin facing +Z. */
const line = (n: number, from = 1): AsteroidState[] => Array.from({ length: n }, (_, i) => ({ ...makeAsteroid(from + i, 'small', [0, 0, 120 + i * 28], 0), hp: 1 }));

/** Wave `wave` fully spawned, the ship in open space, only `asteroids` left. */
function scene(wave: number, asteroids: AsteroidState[], over: Partial<GameState> = {}, difficulty: Difficulty = 'normal'): GameState {
  const s = initialState(3, difficulty);
  return {
    ...s,
    ship: { ...s.ship, pos: [0, 0, 0] },
    wave: { ...INITIAL_WAVE, number: wave, phase: 'active', spawned: waveDef(wave).count, timer: 1 },
    asteroids,
    nextId: 1000,
    ...over,
  };
}

/** Plays the log, folding every tick into one fresh run tracker; returns everything that unlocked. */
function play(s: GameState, log: readonly Input[]): AchievementId[] {
  return playOn(s, log, NEW_RUN).got;
}

function playOn(s: GameState, log: readonly Input[], run: AchievementRun): { got: AchievementId[]; state: GameState; run: AchievementRun } {
  const out: AchievementId[] = [];
  for (const i of log) {
    const r = step(s, i);
    s = r.state;
    const t = trackAchievements(run, r.events, s);
    run = t.run;
    out.push(...t.unlocked);
  }
  return { got: out, state: s, run };
}

const fire = (ticks: number) => repeat(ticks, input({ firePhoton: true }));
const idle = (ticks: number) => repeat(ticks, input());
/** A small asteroid one tick from hitting Earth. */
const doomed = (id: number) => makeAsteroid(id, 'small', [EARTH_POS[0] - EARTH_RADIUS - 22, 0, 0], 5);

describe('achievement replays', () => {
  it('First contact: the first kill', () => {
    expect(play(scene(1, line(1)), fire(30))).toContain('firstContact');
    expect(play(scene(1, line(1)), idle(30))).not.toContain('firstContact');
  });

  it('Chain reaction: a 10-kill chain, not 9', () => {
    expect(play(scene(1, line(10)), fire(140))).toContain('chainReaction');
    expect(play(scene(1, line(9)), fire(140))).not.toContain('chainReaction');
  });

  it('Perfect wave: a clear without an Earth hit', () => {
    expect(play(scene(2, line(3)), fire(60))).toContain('perfectWave');
    expect(play(scene(2, [...line(3), doomed(50)]), fire(60))).not.toContain('perfectWave');
  });

  it('Earth untouched: clear wave 5 with no Earth hit in the run', () => {
    expect(play(scene(5, line(2)), fire(40))).toContain('earthUntouched');
    expect(play(scene(4, line(2)), fire(40))).not.toContain('earthUntouched');
    expect(play(scene(5, [...line(2), doomed(50)]), fire(40))).not.toContain('earthUntouched');
  });

  it('Close call: clear a wave with Earth at 10 % or less', () => {
    expect(play(scene(3, line(1), { earthHealth: 8 }), fire(30))).toContain('closeCall');
    expect(play(scene(3, line(1), { earthHealth: 40 }), fire(30))).not.toContain('closeCall');
  });

  it('Sharpshooter: 20 photon hits in a row; a miss resets the streak', () => {
    expect(play(scene(1, line(20)), fire(200))).toContain('sharpshooter');
    expect(play(scene(1, line(19)), fire(200))).not.toContain('sharpshooter');
    // One photon into empty space that expires, then 19 hits: no; one more hit makes 20 in a row after the miss: yes.
    const miss = playOn(scene(1, []), [...fire(1), ...idle(40)], NEW_RUN);
    const after = playOn({ ...miss.state, asteroids: line(19) }, fire(200), miss.run);
    expect(after.got).not.toContain('sharpshooter');
    expect(playOn({ ...miss.state, asteroids: line(20) }, fire(200), miss.run).got).toContain('sharpshooter');
  });

  it('Lock-on: 10 rocket kills in one run', () => {
    const rockets = (n: number) => Array.from({ length: n }, () => [input({ fireRocket: true }), ...idle(29)]).flat();
    const s = scene(1, line(10));
    expect(play({ ...s, ship: { ...s.ship, rockets: 99 } }, rockets(12))).toContain('lockOn');
    expect(play({ ...s, ship: { ...s.ship, rockets: 9 } }, rockets(12))).not.toContain('lockOn');
  });

  it('Long haul: five minutes survived', () => {
    expect(play(scene(1, line(1), { tick: LONG_HAUL_TICKS - 3 }), idle(5))).toContain('longHaul');
    expect(play(scene(1, line(1), { tick: LONG_HAUL_TICKS - 30 }), idle(5))).not.toContain('longHaul');
  });

  it('Earth is safe: clear wave 10', () => {
    expect(play(scene(10, line(1)), fire(30))).toContain('earthIsSafe');
    expect(play(scene(9, line(1)), fire(30))).not.toContain('earthIsSafe');
  });

  it('Photons only: win without firing a rocket', () => {
    expect(play(scene(10, line(2)), fire(40))).toContain('photonsOnly');
    const withRocket = [input({ fireRocket: true }), ...fire(60)];
    const got = play(scene(10, line(2)), withRocket);
    expect(got).toContain('earthIsSafe');
    expect(got).not.toContain('photonsOnly');
  });

  it('Hardened: win on Hard', () => {
    expect(play(scene(10, line(1), {}, 'hard'), fire(30))).toContain('hardened');
    expect(play(scene(10, line(1), {}, 'kid'), fire(30))).not.toContain('hardened');
  });

  it('Beyond the campaign: clear an endless wave', () => {
    expect(play(scene(11, line(1)), fire(30))).toContain('beyondTheCampaign');
    expect(play(scene(10, line(1)), fire(30))).not.toContain('beyondTheCampaign');
  });
});
