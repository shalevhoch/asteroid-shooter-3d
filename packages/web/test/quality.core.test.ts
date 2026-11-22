/** P20 render quality: starting level, one-way step-down on low fps, and the loading bar. */
import { describe, expect, it } from 'vitest';
import { MAX_PARTICLES } from '../src/fx/engine.js';
import { LOW_FPS, QUALITY_LEVELS, QualityGovernor, WARMUP_MS, WINDOW_MS, initialQuality } from '../src/quality.js';
import { LoadProgress } from '../src/loading.js';

/** Feeds `ms` of frames at `fps`; returns the changes. */
const run = (g: QualityGovernor, fps: number, ms: number) => {
  const out: string[] = [];
  for (let t = 0; t < ms; t += 1000 / fps) {
    const q = g.frame(1000 / fps);
    if (q) out.push(q.name);
  }
  return out;
};

describe('quality', () => {
  it('levels: high is today\'s look (DPR 2, all particles); each step lowers DPR and the particle cap', () => {
    expect(QUALITY_LEVELS.map((l) => [l.name, l.dprCap, l.particleCap])).toEqual([
      ['high', 2, MAX_PARTICLES],
      ['medium', 1.5, MAX_PARTICLES / 2],
      ['low', 1, MAX_PARTICLES / 4],
    ]);
  });

  it('desktops start high, touch devices medium; ?quality= pins a level and turns auto off', () => {
    expect(initialQuality('', false)).toEqual({ level: 0, auto: true });
    expect(initialQuality('', true)).toEqual({ level: 1, auto: true });
    expect(initialQuality('?quality=low', false)).toEqual({ level: 2, auto: false });
    expect(initialQuality('?quality=bogus', true)).toEqual({ level: 1, auto: true });
  });

  it('steps down one level per slow window, after the warm-up, down to low', () => {
    const g = new QualityGovernor(initialQuality('', false));
    expect(run(g, 20, WARMUP_MS)).toEqual([]);
    expect(run(g, 20, WINDOW_MS + 100)).toEqual(['medium']);
    expect(run(g, 20, 3 * WINDOW_MS)).toEqual(['low']);
    expect(g.current.name).toBe('low');
  });

  it('a fast device stays high', () => {
    const g = new QualityGovernor(initialQuality('', false));
    expect(run(g, 60, 60_000)).toEqual([]);
    expect(run(g, LOW_FPS + 1, 10_000)).toEqual([]);
  });

  it('loading bar: only forward, 100 only when done', () => {
    const p = new LoadProgress();
    expect(p.update(1, 2)).toBe(50);
    expect(p.update(1, 4)).toBe(50);
    expect(p.update(3, 4)).toBe(75);
    expect(p.update(4, 4)).toBe(100);
  });
});
