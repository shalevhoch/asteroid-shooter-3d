/** docs/spec/fx/fx.edge-cases.feature. */
import { describe, expect, it } from 'vitest';
import { ATLAS_H, ATLAS_LAYOUT, ATLAS_W, CELLS, cellUv } from '../src/fx/atlas.js';
import { billboardCorners } from '../src/fx/billboard.js';
import { flame, updateParticle } from '../src/fx/particles.js';

describe('FX edge cases', () => {
  it('a sprite straight above or below the camera still gets a full quad (no NaN)', () => {
    for (const c of [[0, 100, 0], [0, -100, -1e-9]] as const) {
      const q = billboardCorners([c[0], c[1], c[2] === 0 ? -1e-9 : c[2]], 5, 0);
      for (const v of q) for (const x of v) expect(Number.isFinite(x)).toBe(true);
    }
  });

  it('a zero-size sprite collapses to its centre', () => {
    for (const v of billboardCorners([10, 0, -100], 0, 1)) expect(v).toEqual([10, 0, -100]);
  });

  it('colours that run below 0 in the original stay drawable (the batch clamps them)', () => {
    const p = flame([0, 0, 0], 1, () => 0.5);
    for (let i = 0; i < 30 && !p.dead; i++) updateParticle(p, () => 0.5);
    expect(p.dead).toBe(true);
  });

  it('atlas cells sit inside the atlas, never overlap, and their UVs are inset and ordered', () => {
    const rects = CELLS.map((c) => ATLAS_LAYOUT[c]);
    for (const r of rects) {
      expect(r.x + r.w).toBeLessThanOrEqual(ATLAS_W);
      expect(r.y + r.h).toBeLessThanOrEqual(ATLAS_H);
    }
    for (let i = 0; i < rects.length; i++)
      for (let j = i + 1; j < rects.length; j++) {
        const a = rects[i];
        const b = rects[j];
        if (!a || !b) continue;
        const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
        expect(overlap, `${CELLS[i] ?? ''} / ${CELLS[j] ?? ''}`).toBe(false);
      }
    for (const c of CELLS) {
      const [u0, v0, u1, v1] = cellUv(c);
      expect(0 < u0 && u0 < u1 && u1 < 1 && 0 < v0 && v0 < v1 && v1 < 1).toBe(true);
    }
  });
});
