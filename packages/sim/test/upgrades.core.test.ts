/** P29 credits and the station shop: prices, caps, the lead-in rule and each upgrade's effect. */
import { describe, expect, it } from 'vitest';
import {
  CRAFTS, HULL_PER_LEVEL, NO_UPGRADES, PERK_DURATION, PHOTON_COOLDOWN, RAPID_FIRE_COOLDOWN, SHIELD_TICKS_PER_LEVEL, THROTTLE_STEP, UPGRADE_IDS, UPGRADE_MAX, UPGRADE_PRICES,
  applyUpgrades, buyUpgrade, creditsFor, initialState, makeAsteroid, parseUpgrades, photonCooldown, priceOf, run, shopOpen, step, type GameState, type SimEvent,
} from '../src/index.js';
import { aimbot, input, openSpace, repeat } from './helpers.js';

const rich = (s: GameState, credits = 10_000): GameState => ({ ...s, credits });
const kill = (points: number): SimEvent => ({ type: 'asteroidDestroyed', id: 1, size: 'small', by: 'photon', pos: [0, 0, 0], points, base: points, combo: 1, multiplier: 1 });

describe('credits and shop', () => {
  it('a run starts with the wallet and upgrades it is given; bad values are cleaned', () => {
    const s = initialState(1, 'normal', 'shuttle', { credits: 320.7, upgrades: { ...NO_UPGRADES, hull: 2 } });
    expect(s.credits).toBe(320);
    expect(s.ship.hull).toBe(CRAFTS.shuttle.hullMax + 2 * HULL_PER_LEVEL);
    expect(initialState(1).credits).toBe(0);
    expect(initialState(1, 'normal', 'fighter', { credits: NaN }).credits).toBe(0);
    expect(parseUpgrades({ damage: 9, speed: -1, hull: 'x' })).toEqual({ ...NO_UPGRADES, damage: UPGRADE_MAX });
  });

  it('prices rise 100, 250, 450 and stop at the cap', () => {
    let s = rich(openSpace());
    const paid: number[] = [];
    for (let i = 0; i < 4; i++) {
      paid.push(priceOf(s.upgrades, 'damage') ?? -1);
      s = buyUpgrade(s, 'damage');
    }
    expect(paid).toEqual([...UPGRADE_PRICES, -1]);
    expect(s.upgrades.damage).toBe(UPGRADE_MAX);
    expect(s.credits).toBe(10_000 - 800);
  });

  it('no sale without the credits, mid-wave, or after the run', () => {
    const s = openSpace();
    expect(shopOpen(s)).toBe(true);
    expect(buyUpgrade({ ...s, credits: 99 }, 'hull')).toEqual({ ...s, credits: 99 });
    const active = rich({ ...s, wave: { ...s.wave, phase: 'active' } });
    expect(buyUpgrade(active, 'hull')).toBe(active);
    const over = rich({ ...s, ended: 'shipDestroyed' });
    expect(buyUpgrade(over, 'hull')).toBe(over);
  });

  it('kills, objectives and wave clears earn credits at a tenth of their points; non-earning runs bank nothing', () => {
    expect(creditsFor([kill(30), kill(9), { type: 'waveCleared', wave: 1, objectiveMet: false, regen: 0, clearBonus: 20, earthBonus: 30 }])).toBe(8);
    const s = openSpace();
    expect(applyUpgrades(s, [kill(100)]).credits).toBe(10);
    expect(applyUpgrades({ ...s, earnsCredits: false }, [kill(100)]).credits).toBe(0);
  });

  it('damage: a level-2 photon breaks a 3-hp asteroid in one hit where a plain photon only chips it', () => {
    const a = makeAsteroid(1, 'big', [0, 0, 400], 0);
    let s = rich({ ...openSpace(), asteroids: [{ ...a, hp: 3 }], nextId: 10 });
    s = buyUpgrade(buyUpgrade(s, 'damage'), 'damage');
    const shots = [input({ firePhoton: true }), ...repeat(20, input())];
    expect(run(s, shots).asteroids.filter((x) => x.id === 1)).toHaveLength(0);
    expect(run({ ...s, upgrades: NO_UPGRADES }, shots).asteroids.find((x) => x.id === 1)?.hp).toBe(2);
  });

  it('fire rate: the photon cooldown drops 5 → 4 → 3 → 2; rapid fire stays the floor', () => {
    const levels = [0, 1, 2, 3].map((fireRate) => photonCooldown({ ...NO_UPGRADES, fireRate }, false));
    expect(levels).toEqual([PHOTON_COOLDOWN, 4, 3, 2]);
    expect(photonCooldown({ ...NO_UPGRADES, fireRate: 3 }, true)).toBe(RAPID_FIRE_COOLDOWN);
  });

  it('hull: +20 now and +20 on the cap; speed: +10 % per level; perk time: +20 % per level', () => {
    const s = buyUpgrade(rich(openSpace()), 'hull');
    expect(s.ship.hull).toBe(CRAFTS.fighter.hullMax + HULL_PER_LEVEL);
    const fast = buyUpgrade(rich({ ...openSpace(), ship: { ...openSpace().ship, throttle: 1 } }), 'speed');
    const moved = step(fast, input()).state.ship.pos[2] - fast.ship.pos[2];
    expect(Math.abs(moved)).toBeCloseTo(THROTTLE_STEP * 1.1);
    const perky = { ...openSpace(), upgrades: { ...NO_UPGRADES, perkTime: 2 }, pickups: [{ id: 1, kind: 'magnet' as const, pos: [0, 0, 0] as [number, number, number], vel: [0, 0, 0] as [number, number, number], age: 0 }], nextPickupId: 2 };
    expect(step(perky, input()).state.perks.magnet).toBe(Math.round(PERK_DURATION.magnet * 1.4));
  });

  it('shield: each wave starts with 3 s × level of Earth shield', () => {
    const s = { ...openSpace(), upgrades: { ...NO_UPGRADES, shield: 2 }, wave: { ...openSpace().wave, timer: 1 } };
    const r = step(s, input());
    expect(r.events.some((e) => e.type === 'waveStarted')).toBe(true);
    expect(r.state.perks.shield).toBe(2 * SHIELD_TICKS_PER_LEVEL);
  });

  it('every upgrade id is sold', () => {
    const s = UPGRADE_IDS.reduce((acc, id) => buyUpgrade(acc, id), rich(openSpace()));
    expect(Object.values(s.upgrades)).toEqual(UPGRADE_IDS.map(() => 1));
  });

  it('replay: the same seed, upgrades and inputs reach the same state', () => {
    const play = () => {
      let s = initialState(42, 'normal', 'interceptor', { credits: 500, upgrades: { ...NO_UPGRADES, damage: 1, speed: 2 } });
      let seed = 9;
      const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      s = buyUpgrade(s, 'fireRate');
      for (let i = 0; i < 1500; i++) s = step(s, aimbot(s, r)).state;
      return s;
    };
    const a = play();
    expect(a).toEqual(play());
    expect(a.credits).toBeGreaterThan(400);
  });
});
