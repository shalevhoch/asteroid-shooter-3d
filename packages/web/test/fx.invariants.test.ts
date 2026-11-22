/** docs/spec/fx/fx.md invariants: flattening never changes the screen image, every particle dies, the cap holds. */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { initialState, makeAsteroid, nextFloat, type ProjectileState, type RngState } from '@asteroid/sim';
import { billboardCorners, type V3 } from '../src/fx/billboard.js';
import { FxEngine, MAX_PARTICLES } from '../src/fx/engine.js';
import { flame, flare, flash, glint, updateParticle, type Particle } from '../src/fx/particles.js';

const seq = (seed: number) => {
  let r: RngState = seed;
  return () => {
    const [v, n] = nextFloat(r);
    r = n;
    return v;
  };
};

describe('view-plane flattening', () => {
  it('keeps the screen image, puts every corner at the centre depth and keeps the quad ⊥ the eye ray before flattening (1000 random sprites)', () => {
    const u = seq(9);
    const proj = new THREE.PerspectiveCamera(50, 16 / 9, 1, 30000).projectionMatrix;
    for (let i = 0; i < 1000; i++) {
      const c: V3 = [(u() - 0.5) * 2000, (u() - 0.5) * 1200, -(50 + u() * 5000)];
      const size = 1 + u() * 200;
      const angle = u() * Math.PI * 2;
      const flat = billboardCorners(c, size, angle);
      for (const v of flat) expect(v[2]).toBeCloseTo(c[2], 6);
      // The unflattened corner lies on the same eye ray: same projected x/y.
      const r = Math.hypot(...c);
      const ray: V3 = [c[0] / r, c[1] / r, c[2] / r];
      for (const v of flat) {
        // Recover the unflattened corner: the point on this eye ray in the plane through c ⊥ ray.
        const t = (c[0] * ray[0] + c[1] * ray[1] + c[2] * ray[2]) / (v[0] * ray[0] + v[1] * ray[1] + v[2] * ray[2]);
        const orig = new THREE.Vector3(v[0] * t, v[1] * t, v[2] * t);
        const a = orig.clone().applyMatrix4(proj);
        const b = new THREE.Vector3(...v).applyMatrix4(proj);
        expect(a.x).toBeCloseTo(b.x, 6);
        expect(a.y).toBeCloseTo(b.y, 6);
        // And that corner is size·√2 from the centre, in the plane ⊥ the ray.
        const d = orig.clone().sub(new THREE.Vector3(...c));
        expect(d.length()).toBeCloseTo(size * Math.SQRT2, 4);
        expect(d.dot(new THREE.Vector3(...ray))).toBeCloseTo(0, 4);
      }
    }
  });
});

describe('particle lifetimes', () => {
  const kinds: [string, (r: () => number) => Particle, number][] = [
    ['flash', (r) => flash([0, 0, 0], 3, r), 60],
    ['flash (small)', (r) => flash([0, 0, 0], 0.25, r), 60],
    ['flame', (r) => flame([0, 0, 0], 3, r), 30],
    ['flare', (r) => flare([0, 0, 0], 10, [1, 0, 0], 0.25, 'roundParticle', r), 100],
    ['glint', (r) => glint([0, 0, 0], r), 400],
  ];
  for (const [name, make, maxTicks] of kinds) {
    it(`${name} always dies within ${String(maxTicks)} ticks (200 seeds)`, () => {
      for (let seed = 1; seed <= 200; seed++) {
        const r = seq(seed);
        const p = make(r);
        let t = 0;
        while (!p.dead && t <= maxTicks) {
          updateParticle(p, r);
          t++;
        }
        expect(p.dead, `seed ${String(seed)}`).toBe(true);
      }
    });
  }
});

describe('FX engine', () => {
  it('never holds more than MAX_PARTICLES, keeping the newest', () => {
    const fx = new FxEngine(seq(3));
    for (let i = 0; i < 200; i++) fx.apply([{ kind: 'explosion', pos: [i, 0, 0], size: 3, normal: null }]);
    expect(fx.particles.length).toBe(MAX_PARTICLES);
    expect(fx.particles.at(-1)?.x).toBeGreaterThan(190);
  });

  it('drains to empty once nothing emits', () => {
    const fx = new FxEngine(seq(4));
    fx.apply([{ kind: 'explosion', pos: [0, 0, 0], size: 3, normal: null }, { kind: 'impact', pos: [0, 0, 0] }, { kind: 'embers', pos: [0, 0, 0] }]);
    const rocket: ProjectileState = { id: 1, kind: 'rocket', pos: [0, 0, 0], dir: [1, 0, 0], age: 0, target: null };
    fx.ambient({ ...initialState(1), projectiles: [rocket] });
    for (let i = 0; i < 500; i++) fx.tick();
    expect(fx.particles).toHaveLength(0);
  });

  it('sheds 8 trail flares per rocket per tick, and a flare tail for asteroids in the atmosphere', () => {
    const fx = new FxEngine(seq(5));
    const rocket: ProjectileState = { id: 1, kind: 'rocket', pos: [0, 0, 0], dir: [1, 0, 0], age: 0, target: null };
    fx.ambient({ ...initialState(1), projectiles: [rocket, { ...rocket, id: 2 }] });
    expect(fx.particles).toHaveLength(16);
    fx.clear();
    fx.ambient({ ...initialState(1), asteroids: [makeAsteroid(1, 'big', [3000 - 1100, 0, 0]), makeAsteroid(2, 'small', [3000 - 1050, 0, 0])] });
    expect(fx.particles).toHaveLength(16 + 3 + 4);
  });
});
