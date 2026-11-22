/** P12 explosion edge cases. */
import { describe, expect, it } from 'vitest';
import { nextFloat, type RngState } from '@asteroid/sim';
import { lineCorners } from '../src/fx/billboard.js';
import { FxEngine } from '../src/fx/engine.js';
import { MAX_SHOCKWAVES, shockwave } from '../src/fx/shockwave.js';
import { addJolt, joltAt } from '../src/shake.js';

const seq = (seed: number) => {
  let r: RngState = seed;
  return () => {
    const [v, n] = nextFloat(r);
    r = n;
    return v;
  };
};

describe('explosion edge cases', () => {
  it('a normal along the camera up still gets a valid basis', () => {
    const s = shockwave([0, 0, 0], [0, 1, 0], [0, 1, 0], 10);
    for (const v of [s.xAxis, s.yAxis]) expect(Math.hypot(...v)).toBeCloseTo(1, 9);
    expect(s.yAxis[1]).toBeCloseTo(0, 9);
  });

  it('a zero-length line is a degenerate quad, not NaN', () => {
    for (const v of lineCorners([1, 1, -10], [1, 1, -10], 0.25)) for (const x of v) expect(Number.isFinite(x)).toBe(true);
  });

  it('a line pointing straight at the eye is degenerate, not NaN', () => {
    for (const v of lineCorners([0, 0, -10], [0, 0, -20], 0.25)) for (const x of v) expect(Number.isFinite(x)).toBe(true);
  });

  it('keeps at most MAX_SHOCKWAVES, dropping the oldest', () => {
    const fx = new FxEngine(seq(3));
    for (let i = 0; i < MAX_SHOCKWAVES + 5; i++) fx.apply([{ kind: 'explosion', pos: [i, 0, 0], size: 0.25, normal: [1, 0, 0] }]);
    expect(fx.shockwaves).toHaveLength(MAX_SHOCKWAVES);
    expect(fx.shockwaves[0]?.pos[0]).toBe(5);
  });

  it('clear() empties the shockwaves too', () => {
    const fx = new FxEngine(seq(4));
    fx.apply([{ kind: 'explosion', pos: [0, 0, 0], size: 3, normal: [1, 0, 0] }]);
    fx.clear();
    expect([fx.particles.length, fx.shockwaves.length]).toEqual([0, 0]);
  });

  it('a weaker hit during a strong jolt does not cut it short; a stronger one restarts it', () => {
    const j = addJolt(null, 1, 0);
    expect(addJolt(j, 0.3, 50)).toBe(j);
    expect(addJolt(j, 0, 50)).toBe(j);
    const k = addJolt(j, 1, 400);
    expect(k?.startMs).toBe(400);
  });

  it('a frame stamped before the jolt shows nothing', () => {
    expect(joltAt(addJolt(null, 1, 100), 90, true)).toEqual({ yaw: 0, pitch: 0, flash: 0 });
    expect(joltAt(null, 0, true).flash).toBe(0);
  });
});
