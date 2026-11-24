/** P39 paint colours: unlocks, purchases, per-ship choice and broken storage. */
import { describe, expect, it } from 'vitest';
import { EMPTY_PAINT, PAINTS, buyPaint, chosenPaint, paintForAchievement, paintUnlocked, parsePaint, selectPaint } from '../src/paint.js';

describe('paint colours (P39)', () => {
  it('Stock is always unlocked; achievement and credit colours follow unlocks and purchases', () => {
    expect(paintUnlocked('stock', {}, [])).toBe(true);
    expect(paintUnlocked('ember', {}, [])).toBe(false);
    expect(paintUnlocked('ember', { firstContact: '2026-11-24' }, [])).toBe(true);
    expect(paintUnlocked('gold', { earthIsSafe: '2026-11-24' }, [])).toBe(true);
    expect(paintUnlocked('crimson', {}, [])).toBe(false);
    expect(paintUnlocked('crimson', {}, ['crimson'])).toBe(true);
    expect(paintForAchievement('earthIsSafe')).toBe('gold');
    expect(paintForAchievement('longHaul')).toBeNull();
  });

  it('a credit colour deducts its price once, and only when the wallet can afford it', () => {
    expect(buyPaint(EMPTY_PAINT, 'stock', 1000)).toBeNull();
    expect(buyPaint(EMPTY_PAINT, 'azure', 50)).toBeNull();
    const r = buyPaint(EMPTY_PAINT, 'azure', 250);
    expect(r).toEqual({ store: { chosen: EMPTY_PAINT.chosen, bought: ['azure'] }, credits: 50 });
    expect(r).not.toBeNull();
    if (!r) return;
    expect(buyPaint(r.store, 'azure', 500)).toBeNull();
    const v = buyPaint(EMPTY_PAINT, 'violet', 400);
    expect(v?.credits).toBe(0);
  });

  it('the chosen colour is saved per ship, and locked colours cannot be selected', () => {
    const u = { firstContact: '2026-11-24' };
    const a = selectPaint(EMPTY_PAINT, 'fighter', 'ember', u);
    const b = selectPaint(a, 'interceptor', 'crimson', u);
    expect(b).toBe(a);
    const c = selectPaint({ ...a, bought: ['azure'] }, 'interceptor', 'azure', u);
    expect(chosenPaint(c, 'fighter')).toBe('ember');
    expect(chosenPaint(c, 'interceptor')).toBe('azure');
    expect(chosenPaint(c, 'shuttle')).toBe('stock');
  });

  it('broken or unknown storage falls back to Stock on every ship', () => {
    expect(parsePaint(null)).toEqual(EMPTY_PAINT);
    expect(parsePaint('nope')).toEqual(EMPTY_PAINT);
    expect(parsePaint(JSON.stringify({ chosen: { fighter: 'neon', shuttle: 'gold' }, bought: ['gold', 'azure', 'nope'] }))).toEqual({
      chosen: { ...EMPTY_PAINT.chosen, shuttle: 'gold' },
      bought: ['azure'],
    });
  });

  it('Stock multiplies by white, and every paint has a unique tint', () => {
    expect(PAINTS.stock.tint).toBe(0xffffff);
    const tints = Object.values(PAINTS).map((p) => p.tint);
    expect(new Set(tints).size).toBe(tints.length);
  });
});
