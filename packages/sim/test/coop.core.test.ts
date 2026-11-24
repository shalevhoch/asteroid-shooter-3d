/** P40 two-player co-op: two ships, shared Earth, 1P path unchanged. */
import { describe, expect, it } from 'vitest';
import { NO_INPUT, SHIP2_OFFSET, SHIP_START, add, initialState, run, runCoop, shipsOf, step, type Input } from '../src/index.js';

const hold = (over: Partial<Input> = {}): Input => ({ ...NO_INPUT, ...over });

describe('two-player co-op (P40)', () => {
  it('a normal run has one ship and is unchanged if a second input is passed', () => {
    const start = initialState(7);
    expect(start.ship2).toBeUndefined();
    expect(shipsOf(start)).toHaveLength(1);
    const a = step(start, hold({ throttle: 1, firePhoton: true }));
    const b = step(start, hold({ throttle: 1, firePhoton: true }), NO_INPUT);
    expect(b.state).toEqual(a.state);
    expect(b.events).toEqual(a.events);
    expect(b.state.ship2).toBeUndefined();
  });

  it('a co-op run starts two ships in the hangar, P2 offset from P1', () => {
    const s = initialState(7, 'normal', 'fighter', { coop: true });
    expect(s.ship.pos).toEqual(SHIP_START);
    expect(s.ship2?.pos).toEqual(add(SHIP_START, SHIP2_OFFSET));
    expect(s.ship2?.hull).toBe(s.ship.hull);
    expect(s.ship2?.rockets).toBe(s.ship.rockets);
    expect(shipsOf(s)).toHaveLength(2);
  });

  it('both ships can fire in the same tick, P1\'s projectile first', () => {
    const s = initialState(1, 'normal', 'fighter', { coop: true });
    const r = step(s, hold({ firePhoton: true }), hold({ firePhoton: true }));
    const photons = r.events.filter((e) => e.type === 'photonFired');
    expect(photons).toHaveLength(2);
    expect(photons[0]?.id).toBeLessThan(photons[1]?.id ?? 0);
    expect(r.state.projectiles).toHaveLength(2);
    expect(r.state.ship.photonCooldown).toBeGreaterThan(0);
    expect(r.state.ship2?.photonCooldown).toBeGreaterThan(0);
  });

  it('the run ends only when Earth falls or both ships are destroyed', () => {
    const start = initialState(3, 'normal', 'fighter', { coop: true });
    const down = { ...start, ship: { ...start.ship, hull: 0 } };
    const mid = step(down, NO_INPUT, hold({ throttle: 1 }));
    expect(mid.state.ended).toBeNull();
    expect(mid.state.ship2?.throttle).toBe(1);
    const p2 = mid.state.ship2;
    expect(p2).toBeDefined();
    if (!p2) return;
    const end = step({ ...mid.state, ship2: { ...p2, hull: 0 } }, NO_INPUT, NO_INPUT);
    expect(end.state.ended).toBe('shipDestroyed');
    expect(end.events.some((e) => e.type === 'runEnded')).toBe(true);
  });

  it('the same two input logs replay to the same state', () => {
    const p1 = (t: number): Input => hold({ pitch: t % 20 === 0 ? 1 : 0, firePhoton: t % 7 === 0, throttle: t === 0 ? 1 : 0 });
    const p2 = (t: number): Input => hold({ yaw: t % 15 === 0 ? -1 : 0, firePhoton: t % 11 === 0, turbo: t % 40 < 5 });
    const inputs = Array.from({ length: 200 }, (_, t) => [p1(t), p2(t)] as const);
    const start = initialState(99, 'kid', 'interceptor', { coop: true, earnsCredits: true, credits: 10 });
    expect(runCoop(start, inputs)).toEqual(runCoop(start, inputs));
  });
});

describe('single-player is unchanged', () => {
  it('a 1P run through step matches run()', () => {
    const start = initialState(42);
    const inputs = Array.from({ length: 80 }, (_, t) => hold({ firePhoton: t % 5 === 0, throttle: t === 0 ? 1 : 0, yaw: 0.2 }));
    let s = start;
    for (const i of inputs) s = step(s, i).state;
    expect(s).toEqual(run(start, inputs));
    expect(s.ship2).toBeUndefined();
  });
});
