/** P34 boss waves: spawn on every 5th wave, damage rules, the calving attack, defeat rewards, determinism. */
import { describe, expect, it } from 'vitest';
import {
  BOSS_BOMB_DAMAGE, BOSS_CALVE_TICKS, BOSS_CREDITS, BOSS_HP, BOSS_POINTS, BOSS_ROCKET_DAMAGE, BOSS_SPAWN, INITIAL_WAVE, NO_INPUT,
  bossAttack, isBossWave, makeAsteroid, pointsFor, radiusOf, run, earthDamageOf, step, updatePerks, type GameState, type SimEvent,
} from '../src/index.js';
import { input, openSpace, repeat } from './helpers.js';

const startWave = (n: number): GameState => ({ ...openSpace(), wave: { ...INITIAL_WAVE, number: n, timer: 1 } });
const withBoss = (s: GameState, pos: [number, number, number] = [0, 0, 600], hp = BOSS_HP): GameState => ({ ...s, asteroids: [{ ...makeAsteroid(90, 'boss', pos, 0), hp }], nextId: 100 });

describe('boss waves', () => {
  it('every 5th wave opens with a boss; others don\'t', () => {
    expect([1, 4, 5, 9, 10, 15].map(isBossWave)).toEqual([false, false, true, false, true, true]);
    const r = step(startWave(5), NO_INPUT);
    const boss = r.state.asteroids.find((a) => a.size === 'boss');
    expect(boss?.hp).toBe(BOSS_HP);
    expect(Math.hypot(...[0, 1, 2].map((i) => (boss?.pos[i] ?? 0) - (BOSS_SPAWN[i] ?? 0)))).toBeLessThan(5); // spawned, then moved one tick
    expect(r.events.some((e) => e.type === 'bossSpawned')).toBe(true);
    expect(step(startWave(4), NO_INPUT).state.asteroids.some((a) => a.size === 'boss')).toBe(false);
  });

  it('a boss doesn\'t shift the run\'s RNG', () => {
    expect(step(startWave(5), NO_INPUT).state.rng).toEqual(step(startWave(4), NO_INPUT).state.rng);
  });

  it('a boss is huge, hits Earth hard and is worth a lot', () => {
    expect(radiusOf('boss')).toBeGreaterThan(radiusOf('big'));
    expect(earthDamageOf('boss')).toBeGreaterThan(earthDamageOf('big'));
    expect(pointsFor('boss', 'rocket')).toBe(BOSS_POINTS);
  });

  it('photons chip 1, rockets chip 15, bombs chip 30; nothing one-shots it', () => {
    const photon = run(withBoss(openSpace()), [input({ firePhoton: true }), ...repeat(30, NO_INPUT)]);
    expect(photon.asteroids.find((a) => a.id === 90)?.hp).toBe(BOSS_HP - 1);
    const rocket = run(withBoss(openSpace()), [input({ fireRocket: true }), ...repeat(80, NO_INPUT)]);
    expect(rocket.asteroids.find((a) => a.id === 90)?.hp).toBe(BOSS_HP - BOSS_ROCKET_DAMAGE);
    const ev: SimEvent[] = [];
    const bombed = updatePerks({ ...withBoss(openSpace()), pickups: [{ id: 1, kind: 'smartBomb', pos: [0, 0, 0], vel: [0, 0, 0], age: 0 }], nextPickupId: 2 }, ev, 100);
    expect(bombed.asteroids.find((a) => a.id === 90)?.hp).toBe(BOSS_HP - BOSS_BOMB_DAMAGE);
  });

  it('attack: every 5 s it sheds a small asteroid from its rim', () => {
    const s = withBoss({ ...openSpace(), tick: BOSS_CALVE_TICKS });
    const ev: SimEvent[] = [];
    const out = bossAttack(s, ev);
    expect(out.asteroids.filter((a) => a.size === 'small')).toHaveLength(1);
    expect(ev.map((e) => e.type)).toEqual(['asteroidSpawned', 'bossCalved']);
    expect(bossAttack({ ...s, tick: BOSS_CALVE_TICKS + 1 }, [])).toEqual({ ...s, tick: BOSS_CALVE_TICKS + 1 });
  });

  it('defeat: the last hit destroys it, scores its points and pays bonus credits', () => {
    const s = withBoss(openSpace(), [0, 0, 600], 1);
    const r = run(s, [input({ firePhoton: true }), ...repeat(30, NO_INPUT)]);
    expect(r.asteroids.some((a) => a.id === 90)).toBe(false);
    expect(r.score).toBe(BOSS_POINTS);
    expect(r.credits).toBe(BOSS_POINTS / 10 + BOSS_CREDITS);
    const events = [input({ firePhoton: true }), ...repeat(30, NO_INPUT)].reduce<{ s: GameState; e: SimEvent[] }>((acc, i) => {
      const x = step(acc.s, i);
      return { s: x.state, e: [...acc.e, ...x.events] };
    }, { s, e: [] }).e;
    expect(events.filter((e) => e.type === 'bossDefeated')).toEqual([{ type: 'bossDefeated', id: 90, wave: 1, credits: BOSS_CREDITS }]);
  });

  it('replay: a boss wave plays out the same way twice', () => {
    const inputs = repeat(600, input({ firePhoton: true }));
    expect(run(startWave(5), inputs)).toEqual(run(startWave(5), inputs));
  });
});
