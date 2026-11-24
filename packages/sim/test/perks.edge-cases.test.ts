/** P26 perk edge cases. */
import { describe, expect, it } from 'vitest';
import { PICKUP_LIFE, updatePerks, type GameState, type SimEvent } from '../src/index.js';
import { openSpace } from './helpers.js';

describe('perk edge cases', () => {
  it('a smart bomb with nothing in range still goes off, destroying nothing', () => {
    const ev: SimEvent[] = [];
    const s: GameState = { ...openSpace(), pickups: [{ id: 1, kind: 'smartBomb', pos: [0, 0, 0], vel: [0, 0, 0], age: 0 }], nextPickupId: 2 };
    updatePerks(s, ev, 100);
    expect(ev).toContainEqual({ type: 'smartBomb', pos: [0, 0, 0], count: 0 });
  });

  it('two pickups collected on one tick both apply, in id order', () => {
    const ev: SimEvent[] = [];
    const s: GameState = { ...openSpace(), pickups: [{ id: 1, kind: 'shield', pos: [5, 0, 0], vel: [0, 0, 0], age: 0 }, { id: 2, kind: 'magnet', pos: [-5, 0, 0], vel: [0, 0, 0], age: 0 }], nextPickupId: 3 };
    const out = updatePerks(s, ev, 100);
    expect(ev.flatMap((e) => (e.type === 'perkCollected' ? [e.id] : []))).toEqual([1, 2]);
    expect(out.perks.shield).toBeGreaterThan(0);
    expect(out.perks.magnet).toBeGreaterThan(0);
  });

  it('reaching the ship on its last tick still counts as collected', () => {
    const ev: SimEvent[] = [];
    const s: GameState = { ...openSpace(), pickups: [{ id: 1, kind: 'shield', pos: [0, 0, 0], vel: [0, 0, 0], age: PICKUP_LIFE - 1 }], nextPickupId: 2 };
    expect(updatePerks(s, ev, 100).perks.shield).toBeGreaterThan(0);
    expect(ev.some((e) => e.type === 'pickupExpired')).toBe(false);
  });
});
