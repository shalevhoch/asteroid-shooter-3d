/** docs/spec/explosions/explosions.md invariants. */
import { describe, expect, it } from 'vitest';
import { nextFloat, type RngState } from '@asteroid/sim';
import { lineCorners, type V3 } from '../src/fx/billboard.js';
import { FxEngine } from '../src/fx/engine.js';
import { addJolt, FLASH_MAX, joltAt, SHAKE_MAX_RAD } from '../src/shake.js';

const seq = (seed: number) => {
  let r: RngState = seed;
  return () => {
    const [v, n] = nextFloat(r);
    r = n;
    return v;
  };
};

describe('explosion invariants', () => {
  it('INV-1: every explosion particle and shockwave dies within 200 ticks', () => {
    const fx = new FxEngine(seq(21));
    fx.apply([
      { kind: 'explosion', pos: [0, 0, 0], size: 3, normal: [0, 0, 1] },
      { kind: 'impact', pos: [5, 0, 0] },
    ]);
    for (let i = 0; i < 200; i++) fx.tick();
    expect([fx.particles.length, fx.shockwaves.length]).toEqual([0, 0]);
  });

  it('INV-2: a line sprite’s width is ⊥ the line and the eye ray to its middle (500 random lines)', () => {
    const u = seq(22);
    for (let i = 0; i < 500; i++) {
      const h: V3 = [(u() - 0.5) * 400, (u() - 0.5) * 400, -(50 + u() * 2000)];
      const t: V3 = [h[0] + (u() - 0.5) * 50, h[1] + (u() - 0.5) * 50, h[2] + (u() - 0.5) * 50];
      const line: V3 = [h[0] - t[0], h[1] - t[1], h[2] - t[2]];
      const m: V3 = [(h[0] + t[0]) / 2, (h[1] + t[1]) / 2, (h[2] + t[2]) / 2];
      const d = (x: V3, y: V3) => x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
      for (const k of [0, 3]) {
        // Unflatten the head-side corner back along its eye ray to the point whose offset from the head is ⊥ the line.
        const a = lineCorners(h, t, 0.25)[k] as V3;
        const l = d(h, line) / d(a, line);
        const off: V3 = [a[0] * l - h[0], a[1] * l - h[1], a[2] * l - h[2]];
        const len = Math.hypot(...line);
        expect(d(off, line) / len).toBeCloseTo(0, 6);
        expect(d(off, m) / Math.hypot(...m)).toBeCloseTo(0, 6);
        expect(Math.hypot(...off)).toBeCloseTo((0.25 * len) / 2, 6);
      }
    }
  });

  it('INV-3: shake never exceeds SHAKE_MAX_RAD and the flash never exceeds FLASH_MAX', () => {
    const j = addJolt(null, 1, 0);
    for (let t = 0; t < 700; t += 7) {
      const o = joltAt(j, t, true);
      expect(Math.abs(o.yaw)).toBeLessThanOrEqual(SHAKE_MAX_RAD);
      expect(Math.abs(o.pitch)).toBeLessThanOrEqual(SHAKE_MAX_RAD);
      expect(o.flash).toBeLessThanOrEqual(FLASH_MAX);
      expect(o.flash).toBeGreaterThanOrEqual(0);
    }
  });
});
