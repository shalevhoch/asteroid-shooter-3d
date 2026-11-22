/** P20 edge cases: stalls, pinned quality, bad loader numbers, the FX cap. */
import { describe, expect, it } from 'vitest';
import { FxEngine } from '../src/fx/engine.js';
import { QualityGovernor, STALL_MS, WARMUP_MS, WINDOW_MS, initialQuality } from '../src/quality.js';
import { LoadProgress } from '../src/loading.js';

describe('quality edge cases', () => {
  it('stalls (tab hidden, load hitch) and junk frame times never step down', () => {
    const g = new QualityGovernor(initialQuality('', false));
    for (let i = 0; i < 200; i++) expect(g.frame(i % 2 ? STALL_MS + 1 : NaN)).toBeNull();
    for (let t = 0; t < WARMUP_MS + WINDOW_MS * 3; t += 16) {
      g.frame(16);
      if (t % 500 === 0) g.frame(1000);
    }
    expect(g.current.name).toBe('high');
  });

  it('a pinned level never moves', () => {
    const g = new QualityGovernor(initialQuality('?quality=high', true));
    for (let i = 0; i < 2000; i++) g.frame(100);
    expect(g.current.name).toBe('high');
  });

  it('bad loader numbers hold the bar', () => {
    const p = new LoadProgress();
    expect(p.update(0, 0)).toBe(0);
    expect(p.update(5, 10)).toBe(50);
    expect(p.update(NaN, 10)).toBe(50);
    expect(p.update(12, 10)).toBe(100);
  });

  it('the FX engine trims to a lowered particle cap, oldest first', () => {
    const fx = new FxEngine(() => 0.5);
    fx.particleCap = 100;
    fx.apply([{ kind: 'explosion', pos: [0, 0, 0], size: 1, normal: null }]);
    expect(fx.particles.length).toBe(100);
  });
});
