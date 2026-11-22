/** docs/spec/weapons/weapons.edge-cases.feature */
import { describe, expect, it } from 'vitest';
import { EARTH_POS, EARTH_RADIUS, MOTHERSHIP_WORLD_BOXES, makeAsteroid, segmentHitsBox, segmentHitsSphere, step, type GameState } from '../src/index.js';
import { input, openSpace, repeat } from './helpers.js';

describe('weapon edge cases', () => {
  it('a photon is consumed by Earth', () => {
    const s = openSpace();
    const s0: GameState = { ...s, ship: { ...s.ship, pos: [EARTH_POS[0], 0, -EARTH_RADIUS - 2000] } };
    let st = step(s0, input({ firePhoton: true })).state;
    st = { ...st, ship: { ...st.ship, pos: [EARTH_POS[0], 0, -EARTH_RADIUS - 2000] } };
    const p = st.projectiles[0];
    expect(p).toBeDefined();
    const nearEarth: GameState = { ...st, projectiles: st.projectiles.map((x) => ({ ...x, pos: [EARTH_POS[0], 0, -EARTH_RADIUS - 10] as const })) };
    const r = step(nearEarth, input());
    expect(r.state.projectiles).toHaveLength(0);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'projectileSpent', kind: 'photon' }));
  });

  it('a photon is consumed by the mothership', () => {
    const b = MOTHERSHIP_WORLD_BOXES[1];
    if (!b) throw new Error('no box');
    const s = openSpace();
    const centre: [number, number, number] = [(b.min[0] + b.max[0]) / 2, (b.min[1] + b.max[1]) / 2, b.min[2] - 30];
    const s0: GameState = { ...s, projectiles: [{ id: 1, kind: 'photon', pos: centre, dir: [0, 0, 1], age: 0, target: null }], nextProjectileId: 2 };
    expect(step(s0, input()).state.projectiles).toHaveLength(0);
  });

  it('two photons on one asteroid in a tick: an asteroid destroyed earlier is not hit again', () => {
    const s = openSpace();
    const a = { ...makeAsteroid(1, 'small', [0, 0, 100]), hp: 1, dir: [0, 0, 0] as const };
    const shots = [1, 2].map((id) => ({ id, kind: 'photon' as const, pos: [0, 0, 60] as const, dir: [0, 0, 1] as const, age: 0, target: null }));
    const r = step({ ...s, asteroids: [a], nextId: 2, projectiles: shots, nextProjectileId: 3 }, input());
    expect(r.events.filter((e) => e.type === 'asteroidDestroyed')).toHaveLength(1);
    expect(r.state.projectiles.map((p) => p.id)).toEqual([2]);
  });

  it('no rocket without rockets, and the photon cooldown survives letting go', () => {
    const s = openSpace();
    expect(step({ ...s, ship: { ...s.ship, rockets: 0 } }, input({ fireRocket: true })).events).toEqual([]);
    let st = step(s, input({ firePhoton: true })).state;
    st = step(st, input()).state;
    expect(step(st, input({ firePhoton: true })).events.some((e) => e.type === 'photonFired')).toBe(false);
  });

  it('a rocket with nothing to chase flies straight and expires', () => {
    let s = step(openSpace(), input({ fireRocket: true })).state;
    for (const i of repeat(399, input())) s = step(s, i).state;
    expect(s.projectiles).toHaveLength(0);
  });

  it('segment tests: endpoints, misses, degenerate segments', () => {
    expect(segmentHitsSphere([0, 0, 0], [0, 0, 10], [0, 5, 5], 5)).toBe(true);
    expect(segmentHitsSphere([0, 0, 0], [0, 0, 10], [0, 6, 5], 5)).toBe(false);
    expect(segmentHitsSphere([0, 0, 0], [0, 0, 0], [0, 0, 3], 3)).toBe(true);
    const box = { min: [0, 0, 0] as const, max: [1, 1, 1] as const };
    expect(segmentHitsBox([-1, 0.5, 0.5], [2, 0.5, 0.5], box)).toBe(true);
    expect(segmentHitsBox([-1, 2, 0.5], [2, 2, 0.5], box)).toBe(false);
    expect(segmentHitsBox([0.5, 0.5, -1], [0.5, 0.5, -0.5], box)).toBe(false);
    expect(segmentHitsBox([0.5, 0.5, 0.5], [0.5, 0.5, 0.5], box)).toBe(true);
  });
});
