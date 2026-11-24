/** P30 look and feel: hit-stop, kill flash, damage smoke, hit marker, combo badge, rumble cue, bloom per quality. */
import { describe, expect, it } from 'vitest';
import { initialState, type SimEvent } from '@asteroid/sim';
import { comboBadge, damageSmoke, flashAt, hitMarker, hitStopMs, killFlash } from '../src/lookfeel.js';
import { cuesFor } from '../src/audio.js';
import { QUALITY_LEVELS } from '../src/quality.js';
import { paintNebula } from '../src/nebula.js';

const kill = (size: 'big' | 'small', by: 'photon' | 'rocket' | 'bomb' = 'photon'): SimEvent => ({ type: 'asteroidDestroyed', id: 1, size, by, pos: [0, 0, 0], points: 10, base: 10, combo: 1, multiplier: 1 });

describe('look and feel', () => {
  it('big kills and smart bombs hold the sim briefly and flash white; small kills don\'t', () => {
    expect(hitStopMs([kill('small')])).toBe(0);
    expect(hitStopMs([kill('big', 'rocket')])).toBe(70);
    expect(hitStopMs([{ type: 'smartBomb', pos: [0, 0, 0], count: 4 }, kill('big', 'bomb')])).toBe(90);
    expect(killFlash([kill('small')])).toBe(0);
    expect(killFlash([kill('big')])).toBeGreaterThan(0);
    expect(flashAt(0.4, 0)).toBe(0.4);
    expect(flashAt(0.4, 90)).toBeCloseTo(0.2);
    expect(flashAt(0.4, 500)).toBe(0);
  });

  it('a ship smokes below half hull, more as it nears zero', () => {
    expect(damageSmoke(60, 100)).toBe(0);
    expect(damageSmoke(50, 100)).toBe(0);
    expect(damageSmoke(40, 100)).toBeGreaterThan(0);
    expect(damageSmoke(5, 100)).toBeGreaterThan(damageSmoke(40, 100));
    expect(damageSmoke(0, 100)).toBe(1);
  });

  it('the hit marker shows kills over chips, and ignores bomb kills', () => {
    expect(hitMarker([{ type: 'asteroidHit', id: 1, hp: 2, pos: [0, 0, 0] }])).toBe('hit');
    expect(hitMarker([{ type: 'asteroidHit', id: 1, hp: 2, pos: [0, 0, 0] }, kill('small')])).toBe('kill');
    expect(hitMarker([kill('small', 'bomb')])).toBeNull();
  });

  it('the combo badge shows ×2 and up, growing with the multiplier', () => {
    const s = initialState(1);
    expect(comboBadge(s).text).toBe('');
    expect(comboBadge({ tick: 10, combo: { count: 3, lastKillTick: 10 } })).toEqual({ text: '×2', scale: 1 });
    expect(comboBadge({ tick: 10, combo: { count: 7, lastKillTick: 10 } }).scale).toBeGreaterThan(1);
    expect(comboBadge({ tick: 500, combo: { count: 7, lastKillTick: 10 } }).text).toBe('');
  });

  it('big explosions rumble; bloom is off only on low quality', () => {
    expect(cuesFor([kill('big')]).map((c) => c.sound)).toEqual(['kaboom', 'rumble']);
    expect(cuesFor([kill('small')]).map((c) => c.sound)).toEqual(['kaboom']);
    expect(QUALITY_LEVELS.map((q) => q.bloom)).toEqual([true, true, false]);
  });

  it('the nebula paints the same way every time, wrapping at the seam', () => {
    const calls: number[][] = [];
    const ctx = {
      clearRect: () => undefined,
      fillRect: (...a: number[]) => calls.push(a),
      createRadialGradient: () => ({ addColorStop: () => undefined }),
      set globalCompositeOperation(_: string) {},
      set fillStyle(_: unknown) {},
    } as unknown as CanvasRenderingContext2D;
    paintNebula(ctx, 1024, 512);
    const first = calls.slice();
    calls.length = 0;
    paintNebula(ctx, 1024, 512);
    expect(calls).toEqual(first);
    expect(first.length).toBe(3 * 26 * 3);
  });
});
