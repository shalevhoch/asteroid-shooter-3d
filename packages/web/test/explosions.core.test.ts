/** P12 explosions: line sprites, sparks and smoke, the shockwave, the full explosion and chip recipes, Earth-hit shake and flash. */
import { describe, expect, it } from 'vitest';
import { BIG_RADIUS, nextFloat, type RngState, type SimEvent } from '@asteroid/sim';
import { lineCorners, type V3 } from '../src/fx/billboard.js';
import { chipPoint } from '../src/fx/bus.js';
import { EXPLOSION_FLAMES, EXPLOSION_FLASHES, EXPLOSION_SMOKE, EXPLOSION_SPARKS, FxEngine, IMPACT_SMOKE, IMPACT_SPARKS } from '../src/fx/engine.js';
import { rocketSmoke, smoke, spark, updateParticle } from '../src/fx/particles.js';
import { SHOCKWAVE_DECAY, SHOCKWAVE_GROWTH, shockwave, updateShockwave } from '../src/fx/shockwave.js';
import { FLASH_MAX, SHAKE_MAX_RAD, addJolt, hitStrength, joltAt } from '../src/shake.js';

const seq = (seed: number) => {
  let r: RngState = seed;
  return () => {
    const [v, n] = nextFloat(r);
    r = n;
    return v;
  };
};
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const len = (a: V3) => Math.hypot(...a);

describe('line sprites', () => {
  it('a line across the view is a quad ratio × length wide, its width ⊥ the line', () => {
    const c = lineCorners([10, 0, -100], [-10, 0, -100], 0.25);
    const width = sub(c[3] as V3, c[0] as V3);
    expect(len(width)).toBeCloseTo(5, 9);
    expect(dot(width, [1, 0, 0])).toBeCloseTo(0, 9);
    expect(c[0]?.[0]).toBeCloseTo(10, 9);
    expect(c[1]?.[0]).toBeCloseTo(-10, 9);
  });

  it('flattens every corner onto the head depth', () => {
    for (const v of lineCorners([0, 5, -80], [3, -2, -120], 0.3)) expect(v[2]).toBeCloseTo(-80, 9);
  });
});

describe('sparks and smoke', () => {
  it('a spark streaks out and fades ×0.88, then ×0.5 under ⅓', () => {
    const p = spark([0, 0, 0], seq(1));
    const head0 = len([p.x, p.y, p.z]);
    updateParticle(p, seq(2));
    expect(len([p.x, p.y, p.z])).toBeGreaterThan(head0);
    expect(p.a).toBeCloseTo(0.88, 9);
    while (p.a >= 0.333) updateParticle(p, seq(3));
    const a = p.a;
    updateParticle(p, seq(4));
    expect(p.a).toBeCloseTo(a * 0.5, 9);
  });

  it('smoke keeps its tail while its head runs out, fading ×0.85', () => {
    const p = smoke([0, 0, 0], seq(5));
    const tail: V3 = [p.tx, p.ty, p.tz];
    updateParticle(p, seq(6));
    expect([p.tx, p.ty, p.tz]).toEqual(tail);
    expect(p.a).toBeCloseTo(0.85, 9);
  });

  it('rocket smoke spans the last tick of flight and widens', () => {
    const p = rocketSmoke([0, 0, 0], [0, 0, 50], seq(7));
    expect([p.x, p.y, p.z, p.tx, p.ty, p.tz]).toEqual([0, 0, 50, 0, 0, 0]);
    updateParticle(p, seq(8));
    expect(p.ratio).toBeCloseTo(0.35 * 1.04, 9);
  });
});

describe('shockwave', () => {
  it('lies on the plane ⊥ its normal with an orthonormal basis, its up from the camera up', () => {
    const s = shockwave([0, 0, 0], [1, 1, 0], [0, 1, 0], 30);
    expect(dot(s.xAxis, s.normal)).toBeCloseTo(0, 9);
    expect(dot(s.yAxis, s.normal)).toBeCloseTo(0, 9);
    expect(dot(s.xAxis, s.yAxis)).toBeCloseTo(0, 9);
    for (const v of [s.xAxis, s.yAxis, s.normal]) expect(len(v)).toBeCloseTo(1, 9);
    expect(dot(s.yAxis, [0, 1, 0])).toBeGreaterThan(0);
  });

  it('grows ×1.25 and fades ×0.85 per tick, gone under 0.1', () => {
    const s = shockwave([0, 0, 0], [0, 0, 1], [0, 1, 0], 30);
    updateShockwave(s);
    expect(s.size).toBeCloseTo(30 * SHOCKWAVE_GROWTH, 9);
    expect(s.a).toBeCloseTo(SHOCKWAVE_DECAY, 9);
    let ticks = 1;
    while (!s.dead) {
      updateShockwave(s);
      ticks++;
    }
    expect(ticks).toBe(Math.ceil(Math.log(0.1) / Math.log(SHOCKWAVE_DECAY)));
  });
});

describe('recipes', () => {
  it('a big explosion is one shockwave (size × 10) and 10 flashes, 40 flames, 50 smoke, 100 sparks', () => {
    const fx = new FxEngine(seq(11));
    fx.apply([{ kind: 'explosion', pos: [0, 0, 0], size: 3, normal: [1, 0, 0] }]);
    expect(fx.shockwaves).toHaveLength(1);
    expect(fx.shockwaves[0]?.size).toBe(30);
    const n = (k: string) => fx.particles.filter((p) => p.kind === k).length;
    expect([n('flash'), n('flame'), n('smoke'), n('spark')]).toEqual([EXPLOSION_FLASHES, EXPLOSION_FLAMES, EXPLOSION_SMOKE, EXPLOSION_SPARKS]);
  });

  it('an explosion without a normal (ship, rocket, photon) has no shockwave', () => {
    const fx = new FxEngine(seq(12));
    fx.apply([{ kind: 'explosion', pos: [0, 0, 0], size: 1, normal: null }]);
    expect(fx.shockwaves).toHaveLength(0);
  });

  it('a chip is 1 flash, 3 sparks and 5 smoke puffs', () => {
    const fx = new FxEngine(seq(13));
    fx.apply([{ kind: 'impact', pos: [0, 0, 0] }]);
    expect(fx.particles).toHaveLength(1 + IMPACT_SPARKS + IMPACT_SMOKE);
  });

  it('the chip shows on the surface, on the side the photon came from', () => {
    const p = chipPoint([100, 0, 0], [100, 500, 0]);
    expect(p[0]).toBeCloseTo(100, 9);
    expect(p[1]).toBeCloseTo(BIG_RADIUS * 1.02, 9);
    expect(chipPoint([1, 2, 3], null)).toEqual([1, 2, 3]);
  });
});

describe('Earth-hit shake and flash', () => {
  const hit = (damage: number): SimEvent => ({ type: 'earthHit', id: 1, size: 'big', damage, pos: [0, 0, 0] });

  it('strength is damage over a big hit, capped at 1, the strongest of the tick', () => {
    expect(hitStrength([])).toBe(0);
    expect(hitStrength([hit(5)])).toBeCloseTo(0.5, 9);
    expect(hitStrength([hit(3), hit(40)])).toBe(1);
  });

  it('starts at full flash and fades to nothing', () => {
    const j = addJolt(null, 1, 1000);
    expect(joltAt(j, 1000, true).flash).toBeCloseTo(FLASH_MAX, 9);
    expect(joltAt(j, 5000, true)).toEqual({ yaw: 0, pitch: 0, flash: 0 });
    const mid = joltAt(j, 1100, true);
    expect(Math.abs(mid.yaw)).toBeLessThanOrEqual(SHAKE_MAX_RAD);
    expect(Math.hypot(mid.yaw, mid.pitch)).toBeGreaterThan(0);
  });

  it('with shake off the camera stays still but the flash still shows', () => {
    const j = addJolt(null, 1, 0);
    const o = joltAt(j, 100, false);
    expect([o.yaw, o.pitch]).toEqual([0, 0]);
    expect(o.flash).toBeGreaterThan(0);
  });
});
