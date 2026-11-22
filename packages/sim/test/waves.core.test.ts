/** docs/spec/waves/waves.core.feature: SPEC.md §10. */
import { describe, expect, it } from 'vitest';
import {
  ASTEROID_SPEED,
  BREATHER_TICKS,
  CAMPAIGN_WAVES,
  EARTH_MAX_HEALTH,
  FUEL_MAX,
  OBJECTIVE_POINTS_BASE,
  OBJECTIVE_POINTS_PER_WAVE,
  OBJECTIVE_REPAIR,
  PRESETS,
  SPAWN_INTERVAL,
  destroyAsteroid,
  initialState,
  step,
  waveDef,
  type Difficulty,
  type GameState,
  type SimEvent,
} from '../src/index.js';
import { input } from './helpers.js';

/** Open space so the hangar never refills anything; the given difficulty. */
const fresh = (difficulty: Difficulty = 'normal', seed = 1): GameState => {
  const s = initialState(seed, difficulty);
  return { ...s, ship: { ...s.ship, pos: [0, 0, 0] } };
};

/** Steps `n` ticks, optionally killing every asteroid by rocket (no split) right after each tick. */
function play(s0: GameState, n: number, kill = false): { state: GameState; events: (SimEvent & { tick: number })[] } {
  let s = s0;
  const events: (SimEvent & { tick: number })[] = [];
  for (let t = 0; t < n && !s.ended; t++) {
    const r = step(s, input());
    s = r.state;
    events.push(...r.events.map((e) => ({ ...e, tick: s.tick })));
    if (kill) {
      const ev: SimEvent[] = [];
      for (const a of s.asteroids) s = destroyAsteroid(s, a.id, 'rocket', ev);
    }
  }
  return { state: s, events };
}
type Ticked = SimEvent & { tick: number };
function ofType<T extends SimEvent['type']>(events: Ticked[], type: T): (Extract<SimEvent, { type: T }> & { tick: number })[] {
  return events.filter((e): e is Extract<SimEvent, { type: T }> & { tick: number } => e.type === type);
}

describe('waves', () => {
  it('wave 1 on Normal keeps the original pace: an asteroid every 200 ticks from tick 200, at speed 3', () => {
    const { state, events } = play(fresh(), 1001);
    expect(ofType(events, 'waveStarted').map((e) => e.tick)).toEqual([SPAWN_INTERVAL]);
    expect(ofType(events, 'asteroidSpawned').map((e) => e.tick)).toEqual([200, 400, 600, 800, 1000]);
    expect(state.asteroids.every((a) => a.speed === ASTEROID_SPEED)).toBe(true);
    expect(state.wave.spawned).toBe(5);
  });

  it('clears a wave once it is fully spawned and empty, then starts the next after the breather', () => {
    const { events } = play(fresh(), 1400, true);
    const cleared = ofType(events, 'waveCleared');
    expect(cleared[0]).toMatchObject({ wave: 1, tick: 1001 });
    const started = ofType(events, 'waveStarted');
    expect(started[1]).toMatchObject({ wave: 2, count: waveDef(2).count, tick: 1001 + BREATHER_TICKS });
  });

  it('escalates: each wave has more, faster, denser asteroids', () => {
    for (let n = 1; n < CAMPAIGN_WAVES; n++) {
      const a = waveDef(n);
      const b = waveDef(n + 1);
      expect(b.count).toBeGreaterThan(a.count);
      expect(b.speed).toBeGreaterThan(a.speed);
      expect(b.interval).toBeLessThan(a.interval);
      expect(b.bigChance).toBeGreaterThan(a.bigChance);
    }
  });

  it('rewards a met objective with points and Earth repair', () => {
    // Wave 2's objective is "let nothing hit Earth"; killing everything meets it.
    const s0 = { ...fresh(), earthHealth: 50 };
    const { state, events } = play(s0, 4000, true);
    const met = ofType(events, 'objectiveMet').find((e) => e.wave === 2);
    expect(met).toEqual({ type: 'objectiveMet', wave: 2, points: OBJECTIVE_POINTS_BASE + 2 * OBJECTIVE_POINTS_PER_WAVE, repair: OBJECTIVE_REPAIR, tick: met?.tick });
    expect(state.earthHealth).toBeGreaterThan(50);
  });

  it('fails a noEarthHit objective when anything hits Earth', () => {
    // Let wave 1 run its course with no kills: Earth takes hits, then wave 2 (noEarthHit) also gets no kills.
    const { events } = play(fresh(), 6000);
    const w2 = ofType(events, 'waveCleared').find((e) => e.wave === 2);
    expect(w2?.objectiveMet).toBe(false);
    expect(ofType(events, 'objectiveMet')).toEqual([]);
  });

  it('wins the campaign after wave 10 and continues into endless waves', () => {
    const { events, state } = play(fresh(), 30000, true);
    expect(ofType(events, 'campaignWon')).toHaveLength(1);
    expect(ofType(events, 'campaignWon')[0]?.wave).toBe(CAMPAIGN_WAVES);
    expect(state.wave.number).toBeGreaterThan(CAMPAIGN_WAVES);
    expect(state.ended).toBeNull();
  });
});

describe('difficulty presets', () => {
  it('Kid/Easy: slower asteroids, calmer spawns, Earth regenerates, wider lock, no fuel drain, half damage', () => {
    const kid = PRESETS.kid;
    const { state, events } = play(fresh('kid'), Math.round(SPAWN_INTERVAL + 200 * kid.intervalScale) + 1);
    expect(ofType(events, 'asteroidSpawned').map((e) => e.tick)).toEqual([200, 200 + Math.round(200 * kid.intervalScale)]);
    expect(state.asteroids[0]?.speed).toBeCloseTo(ASTEROID_SPEED * kid.speedScale, 12);
    expect(kid.rocketLockCone).toBeGreaterThan(PRESETS.normal.rocketLockCone);
    // No fuel drain under turbo.
    const turbo = step(fresh('kid'), input({ turbo: true })).state;
    expect(turbo.ship.fuel).toBe(FUEL_MAX);
    expect(turbo.ship.turbo).toBe(true);
    // Regen at wave clear.
    const hurt = { ...fresh('kid'), earthHealth: 40 };
    const cleared = play(hurt, 1600, true).events.find((e) => e.type === 'waveCleared');
    expect(cleared).toMatchObject({ wave: 1, regen: kid.earthRegen });
  });

  it('Kid halves Earth damage and Hard multiplies it by 1.5 (rounded, at least 1)', () => {
    const hits = (d: Difficulty) => ofType(play(fresh(d), 4000).events, 'earthHit').map((e) => [e.size, e.damage]);
    for (const [size, dmg] of hits('kid')) expect(dmg).toBe(size === 'big' ? 5 : 1);
    for (const [size, dmg] of hits('hard')) expect(dmg).toBe(size === 'big' ? 15 : 3);
    for (const [size, dmg] of hits('normal')) expect(dmg).toBe(size === 'big' ? 10 : 2);
  });

  it('Normal is the P01–P07 tuning', () => {
    expect(PRESETS.normal).toMatchObject({ speedScale: 1, intervalScale: 1, earthDamageScale: 1, earthRegen: 0, fuelDrain: 1 });
    expect(EARTH_MAX_HEALTH).toBe(100);
  });
});
