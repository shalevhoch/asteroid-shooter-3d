/** P26 perks: drops, pickups, collection and each perk's effect. */
import { describe, expect, it } from 'vitest';
import {
  EARTH_POS, MAGNET_SPEED, NO_PERKS, PERK_DURATION, PHOTON_COOLDOWN, PICKUP_DRIFT, PICKUP_LIFE, RAPID_FIRE_COOLDOWN, SMART_BOMB_RANGE, SPREAD_ANGLE,
  BIG_ROCKET_POINTS, initialState, makeAsteroid, rollDrops, step, updatePerks, type GameState, type PerkKind, type SimEvent,
} from '../src/index.js';
import { input, openSpace } from './helpers.js';

const pickup = (s: GameState, kind: PerkKind, pos: [number, number, number], vel: [number, number, number] = [0, 0, 0]): GameState => ({ ...s, pickups: [{ id: 1, kind, pos, vel, age: 0 }], nextPickupId: 2 });
const kill = (by: 'photon' | 'rocket' | 'bomb' = 'photon'): SimEvent => ({ type: 'asteroidDestroyed', id: 1, size: 'small', by, pos: [5, 5, 5], points: 1, base: 1, combo: 1, multiplier: 1 });

describe('perks', () => {
  it('a run starts with no pickups or perks, and its own perk stream', () => {
    const s = initialState(7);
    expect(s.pickups).toEqual([]);
    expect(s.perks).toEqual(NO_PERKS);
    expect(s.perkRng).not.toBe(s.rng);
  });

  it('about 4 % of kills drop a pickup at the kill, about 6 % while struggling; smart-bomb kills never do', () => {
    const rate = (s0: GameState, by: 'photon' | 'bomb' = 'photon') => {
      let s = s0;
      let n = 0;
      for (let i = 0; i < 20000; i++) {
        const ev: SimEvent[] = [kill(by)];
        s = rollDrops({ ...s, pickups: [] }, ev, 100);
        n += s.pickups.length;
      }
      return n / 20000;
    };
    const s = openSpace(3);
    expect(rate(s)).toBeCloseTo(0.04, 2);
    expect(rate({ ...s, earthHealth: 40 })).toBeCloseTo(0.06, 2);
    expect(rate(s, 'bomb')).toBe(0);
  });

  it('a pickup drifts, then expires after 8 s', () => {
    let s = pickup(openSpace(), 'shield', [500, 0, 0], [PICKUP_DRIFT, 0, 0]);
    const ev: SimEvent[] = [];
    for (let i = 0; i < PICKUP_LIFE - 1; i++) s = updatePerks(s, ev, 100);
    expect(s.pickups[0]?.pos[0]).toBeCloseTo(500 + PICKUP_DRIFT * (PICKUP_LIFE - 1), 6);
    s = updatePerks(s, ev, 100);
    expect(s.pickups.filter((p) => p.id === 1)).toEqual([]);
    expect(ev).toContainEqual({ type: 'pickupExpired', id: 1 });
  });

  it('flying through a pickup grants the perk; collecting it again refreshes, never stacks', () => {
    const ev: SimEvent[] = [];
    let s = updatePerks(pickup(openSpace(), 'rapidFire', [10, 0, 0]), ev, 100);
    expect(ev.find((e) => e.type === 'perkCollected')).toMatchObject({ kind: 'rapidFire' });
    expect(s.perks.rapidFire).toBe(PERK_DURATION.rapidFire);
    s = updatePerks(s, [], 100);
    s = updatePerks(pickup(s, 'rapidFire', [0, 0, 0]), [], 100);
    expect(s.perks.rapidFire).toBe(PERK_DURATION.rapidFire);
  });

  it('timed perks count down and announce the end', () => {
    const ev: SimEvent[] = [];
    let s: GameState = { ...openSpace(), perks: { ...NO_PERKS, magnet: 2 } };
    s = updatePerks(updatePerks(s, ev, 100), ev, 100);
    expect(s.perks.magnet).toBe(0);
    expect(ev).toContainEqual({ type: 'perkExpired', kind: 'magnet' });
  });

  it('shield: Earth impacts do no damage and keep the combo', () => {
    const a = makeAsteroid(1, 'small', [EARTH_POS[0] - 945, 0, 0], 10);
    const s: GameState = { ...openSpace(), asteroids: [a], nextId: 2, perks: { ...NO_PERKS, shield: 10 }, combo: { count: 3, lastKillTick: 0 } };
    const r = step(s, input());
    expect(r.state.earthHealth).toBe(s.earthHealth);
    expect(r.state.asteroids).toEqual([]);
    expect(r.events.some((e) => e.type === 'shieldBlocked')).toBe(true);
    expect(r.events.some((e) => e.type === 'earthHit')).toBe(false);
    const unshielded = step({ ...s, perks: NO_PERKS }, input());
    expect(unshielded.state.earthHealth).toBeLessThan(s.earthHealth);
  });

  it('rapid fire shortens the photon cooldown', () => {
    const shots = (s0: GameState) => {
      let s = s0;
      let n = 0;
      for (let i = 0; i < 20; i++) {
        const r = step(s, input({ firePhoton: true }));
        n += r.events.filter((e) => e.type === 'photonFired').length;
        s = r.state;
      }
      return n;
    };
    const s = openSpace();
    expect(shots(s)).toBe(Math.ceil(20 / PHOTON_COOLDOWN));
    expect(shots({ ...s, perks: { ...NO_PERKS, rapidFire: 100 } })).toBe(Math.ceil(20 / RAPID_FIRE_COOLDOWN));
  });

  it('spread shot fires three photons, the outer two ±SPREAD_ANGLE off the line of fire', () => {
    const r = step({ ...openSpace(), perks: { ...NO_PERKS, spreadShot: 100 } }, input({ firePhoton: true }));
    const dirs = r.state.projectiles.map((p) => p.dir);
    expect(dirs).toHaveLength(3);
    const [f = [0, 0, 1], a = f, b = f] = dirs;
    const angle = (u: readonly number[], v: readonly number[]) => Math.acos(Math.min(1, u.reduce((t, x, i) => t + x * (v[i] ?? 0), 0)));
    expect(angle(f, a)).toBeCloseTo(SPREAD_ANGLE, 6);
    expect(angle(f, b)).toBeCloseTo(SPREAD_ANGLE, 6);
  });

  it('magnet pulls pickups in range toward the ship', () => {
    const s = updatePerks({ ...pickup(openSpace(), 'shield', [1000, 0, 0]), perks: { ...NO_PERKS, magnet: 100 } }, [], 100);
    expect(s.pickups[0]?.pos[0]).toBeCloseTo(1000 - MAGNET_SPEED, 6);
    const out = updatePerks({ ...pickup(openSpace(), 'shield', [1600, 0, 0]), perks: { ...NO_PERKS, magnet: 100 } }, [], 100);
    expect(out.pickups[0]?.pos[0]).toBe(1600);
  });

  it('smart bomb destroys every asteroid in range at rocket points, without splitting or dropping', () => {
    const near = makeAsteroid(1, 'big', [SMART_BOMB_RANGE - 10, 0, 0]);
    const far = makeAsteroid(2, 'big', [0, SMART_BOMB_RANGE + 200, 0]);
    const ev: SimEvent[] = [];
    const s = updatePerks({ ...pickup(openSpace(), 'smartBomb', [0, 0, 0]), asteroids: [near, far], nextId: 3 }, ev, 100);
    expect(s.asteroids.map((a) => a.id)).toEqual([2]);
    expect(s.score).toBe(BIG_ROCKET_POINTS);
    expect(ev).toContainEqual({ type: 'smartBomb', pos: [0, 0, 0], count: 1 });
    expect(s.pickups).toEqual([]);
    expect(s.perks).toEqual(NO_PERKS);
  });
});
