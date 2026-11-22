/** P11 FX: billboard math (sort, flatten, premultiply), the ported particles, and the sim-event → FX bus. */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { EARTH_POS, initialState, makeAsteroid, nextFloat, type RngState, type SimEvent } from '@asteroid/sim';
import { backToFront, billboardCorners, flatten, premultiply, viewDepth } from '../src/fx/billboard.js';
import { EXPLOSION_SIZE, inAtmosphere, recipesFor } from '../src/fx/bus.js';
import { flame, flash, updateParticle } from '../src/fx/particles.js';

const seq = (seed: number) => {
  let r: RngState = seed;
  return () => {
    const [v, n] = nextFloat(r);
    r = n;
    return v;
  };
};

describe('billboard math', () => {
  it('viewDepth is the distance along the camera axis (three.js view space)', () => {
    const cam = new THREE.PerspectiveCamera();
    cam.position.set(100, 50, -20);
    cam.lookAt(400, 80, 300);
    cam.updateMatrixWorld();
    const p = new THREE.Vector3(300, -40, 200);
    expect(viewDepth(cam.matrixWorldInverse.elements, p.x, p.y, p.z)).toBeCloseTo(-p.clone().applyMatrix4(cam.matrixWorldInverse).z, 9);
  });

  it('sorts farthest first, ties stable', () => {
    expect(backToFront([5, 50, 20, 50, 1], 5)).toEqual([1, 3, 2, 0, 4]);
    expect(backToFront([3, 2, 1], 2)).toEqual([0, 1]);
  });

  it('flattening keeps each corner on its eye ray and moves it to the centre depth', () => {
    const f = flatten([10, 20, -50], -100);
    expect(f).toEqual([20, 40, -100]);
  });

  it('a camera-facing sprite straight ahead is a plain square of side 2·size', () => {
    const c = billboardCorners([0, 0, -100], 5, 0);
    expect(c.map((v) => v.map((x) => Math.round(x * 1e9) / 1e9 + 0))).toEqual([
      [-5, -5, -100],
      [5, -5, -100],
      [5, 5, -100],
      [-5, 5, -100],
    ]);
  });

  it('premultiplies, and additive sprites write α = 0', () => {
    expect(premultiply(1, 0.5, 0.2, 0.5, false)).toEqual([0.5, 0.25, 0.1, 0.5]);
    expect(premultiply(1, 0.5, 0.2, 0.5, true)).toEqual([0.5, 0.25, 0.1, 0]);
    expect(premultiply(2, -1, 0.5, 1.5, false)).toEqual([1, 0, 0.5, 1]);
  });
});

describe('ported particles', () => {
  it('Flash swells ×1.6 per tick until past 12, then shrinks and fades', () => {
    const p = flash([0, 0, 0], 3, seq(1));
    const sizes: number[] = [];
    for (let i = 0; i < 4; i++) {
      updateParticle(p, seq(2));
      sizes.push(p.size);
    }
    expect(sizes[0]).toBeCloseTo(4.8, 6);
    expect(sizes[2]).toBeCloseTo(12.288, 6);
    expect(p.phase).toBe(1);
    expect(sizes[3]).toBeLessThan(sizes[2] ?? 0);
  });

  it('Flame fades in over ~13 ticks inflating ×1.3, then burns out inflating ×1.075', () => {
    const p = flame([0, 0, 0], 3, seq(3));
    let ticks = 0;
    while (p.phase === 0) {
      updateParticle(p, seq(4));
      ticks++;
    }
    expect(ticks).toBe(13);
    expect(p.size).toBeCloseTo(3 * 1.3 ** 13, 3);
    let life = 0;
    while (!p.dead) {
      updateParticle(p, seq(5));
      life++;
    }
    expect(life).toBe(10);
  });
});

describe('FX bus', () => {
  const state = initialState(1);
  const kill = (size: 'big' | 'small'): SimEvent => ({ type: 'asteroidDestroyed', id: 1, size, by: 'photon', pos: [0, 0, 0], points: 10, base: 10, combo: 1, multiplier: 1 });

  it('explodes kills and Earth impacts at the original sizes, facing away from Earth', () => {
    const r = recipesFor([kill('big'), kill('small'), { type: 'earthHit', id: 2, size: 'big', damage: 10, pos: [EARTH_POS[0] - 600, 0, 0] }], state);
    expect(r.map((x) => (x.kind === 'explosion' ? x.size : null))).toEqual([EXPLOSION_SIZE.big, EXPLOSION_SIZE.small, EXPLOSION_SIZE.big]);
    const last = r[2];
    expect(last?.kind === 'explosion' ? last.normal : null).toEqual([-1, 0, 0]);
  });

  it('explodes shots that hit Earth or the mothership, not ones that hit an asteroid', () => {
    const spent = (kind: 'photon' | 'rocket', on: 'asteroid' | 'earth' | 'mothership'): SimEvent => ({ type: 'projectileSpent', id: 1, kind, pos: [1, 2, 3], on });
    const r = recipesFor([spent('photon', 'earth'), spent('rocket', 'mothership'), spent('photon', 'asteroid')], state);
    expect(r).toEqual([
      { kind: 'explosion', pos: [1, 2, 3], size: EXPLOSION_SIZE.photon, normal: null },
      { kind: 'explosion', pos: [1, 2, 3], size: EXPLOSION_SIZE.rocket, normal: null },
    ]);
  });

  it('chips, embers and the ship explosion', () => {
    const r = recipesFor([{ type: 'asteroidHit', id: 1, hp: 2, pos: [4, 5, 6] }, { type: 'hullBurning' }, { type: 'runEnded', reason: 'shipDestroyed' }, { type: 'photonFired', id: 1, pos: [0, 0, 0] }], state);
    expect(r.map((x) => x.kind)).toEqual(['impact', 'embers', 'explosion']);
    expect(r[2]).toMatchObject({ pos: state.ship.pos, size: EXPLOSION_SIZE.ship });
  });

  it('finds asteroids burning in the atmosphere', () => {
    const near = makeAsteroid(1, 'small', [EARTH_POS[0] - 1100, 0, 0]);
    const far = makeAsteroid(2, 'big', [0, 0, 0]);
    expect(inAtmosphere({ ...state, asteroids: [near, far] }).map((a) => a.id)).toEqual([1]);
  });
});

