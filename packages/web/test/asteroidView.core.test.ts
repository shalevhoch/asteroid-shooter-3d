import { describe, expect, it } from 'vitest';
import { tumbleFor } from '../src/asteroidView.js';

describe('tumbleFor', () => {
  it('is deterministic per id, with a unit axis and a modest rate', () => {
    expect(tumbleFor(7)).toEqual(tumbleFor(7));
    expect(tumbleFor(7)).not.toEqual(tumbleFor(8));
    for (let id = 1; id < 200; id++) {
      const { axis, rate } = tumbleFor(id);
      expect(Math.hypot(...axis)).toBeCloseTo(1, 9);
      expect(rate >= 0.01 && rate < 0.04).toBe(true);
    }
  });
});
