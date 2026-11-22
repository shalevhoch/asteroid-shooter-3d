import { describe, expect, it } from 'vitest';
import { nextFloat, nextRange, seedRng } from '../src/index.js';

describe('seeded RNG', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    let a = seedRng(5);
    let b = seedRng(5);
    for (let i = 0; i < 1000; i++) {
      const [x, a2] = nextFloat(a);
      const [y, b2] = nextFloat(b);
      expect(x).toBe(y);
      expect(x >= 0 && x < 1).toBe(true);
      a = a2;
      b = b2;
    }
  });

  it('differs across seeds and maps ranges', () => {
    expect(nextFloat(seedRng(1))[0]).not.toBe(nextFloat(seedRng(2))[0]);
    const [v] = nextRange(seedRng(3), -500, 500);
    expect(v >= -500 && v < 500).toBe(true);
  });
});
