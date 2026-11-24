/** P32 lock-on missiles: hold to lock up to 1 + level targets, release to fire one homing rocket per lock. */
import { describe, expect, it } from 'vitest';
import { MISSILE_LOCK_TICKS, MISSILE_PRICES, NO_UPGRADES, buyUpgrade, makeAsteroid, missileVolley, priceOf, run, step, type GameState } from '../src/index.js';
import { input, openSpace, repeat } from './helpers.js';

/** Three frozen asteroids ahead of the ship (+Z), the nearest to the crosshair first. */
function range(level: number): GameState {
  const s = openSpace();
  const rocks = [makeAsteroid(1, 'small', [0, 0, 900], 0), makeAsteroid(2, 'small', [20, 0, 900], 0), makeAsteroid(3, 'small', [-40, 0, 900], 0)];
  return { ...s, asteroids: rocks, nextId: 10, upgrades: { ...NO_UPGRADES, missiles: level } };
}
const press = input({ fireRocket: true, rocketHeld: true });
const hold = input({ rocketHeld: true });

describe('lock-on missiles', () => {
  it('missiles are sold at 200 / 350 / 550 and set the volley size', () => {
    expect([0, 1, 2].map((missiles) => priceOf({ ...NO_UPGRADES, missiles }, 'missiles'))).toEqual([...MISSILE_PRICES]);
    expect(missileVolley({ ...NO_UPGRADES, missiles: 2 })).toBe(3);
    expect(buyUpgrade({ ...openSpace(), credits: 200 }, 'missiles').upgrades.missiles).toBe(1);
  });

  it('without missiles a press fires one rocket at once, as before', () => {
    const r = step(range(0), press);
    expect(r.events.filter((e) => e.type === 'rocketFired')).toHaveLength(1);
    expect(r.state.missileLock).toBeNull();
  });

  it('holding locks the crosshair target at once, then the next-best every 8 ticks, up to the volley', () => {
    let s = step(range(2), press).state;
    expect(s.missileLock?.ids).toEqual([1]);
    s = run(s, repeat(MISSILE_LOCK_TICKS, hold));
    expect(s.missileLock?.ids).toEqual([1, 2]);
    s = run(s, repeat(MISSILE_LOCK_TICKS * 3, hold));
    expect(s.missileLock?.ids).toEqual([1, 2, 3]);
    expect(s.projectiles).toHaveLength(0);
  });

  it('releasing fires one homing rocket per lock for one rocket of ammo, and they hit', () => {
    let s = run(range(2), [press, ...repeat(MISSILE_LOCK_TICKS * 2, hold)]);
    const rockets = s.ship.rockets;
    const r = step(s, input());
    const fired = r.events.flatMap((e) => (e.type === 'rocketFired' ? [e.target] : []));
    expect(fired).toEqual([1, 2, 3]);
    expect(r.state.ship.rockets).toBe(rockets - 1);
    expect(r.state.missileLock).toBeNull();
    s = run(r.state, repeat(120, input()));
    expect(s.asteroids.filter((a) => a.id <= 3)).toHaveLength(0);
  });

  it('a release with nothing locked fires one unlocked rocket; a destroyed target drops its lock', () => {
    const empty = { ...range(1), asteroids: [] };
    const r = run(empty, [press, input()]);
    expect(r.projectiles.filter((p) => p.kind === 'rocket')).toHaveLength(1);
    const locked = step(range(1), press).state;
    const gone = step({ ...locked, asteroids: locked.asteroids.filter((a) => a.id !== 1) }, hold).state;
    expect(gone.missileLock?.ids).toEqual([]);
  });

  it('no rockets, no locking', () => {
    const s = range(1);
    expect(step({ ...s, ship: { ...s.ship, rockets: 0 } }, press).state.missileLock).toBeNull();
  });

  it('replay: the same inputs lock and fire the same way', () => {
    const inputs = [press, ...repeat(20, hold), ...repeat(40, input())];
    expect(run(range(2), inputs)).toEqual(run(range(2), inputs));
  });
});
