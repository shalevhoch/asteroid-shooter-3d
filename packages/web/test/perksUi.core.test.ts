/** P26 perks on screen: pickup looks, the HUD line, banners. */
import { describe, expect, it } from 'vitest';
import { NO_PERKS, PICKUP_LIFE, type PickupState } from '@asteroid/sim';
import { activePerkLine, perkBanner, pickupLook } from '../src/perksUi.js';

const p = (age: number): PickupState => ({ id: 1, kind: 'shield', pos: [0, 0, 0], vel: [0, 0, 0], age });

describe('perks UI', () => {
  it('pickups glow steadily, blink in the last 2 s and fade out at the end', () => {
    expect(pickupLook(p(10)).alpha).toBe(1);
    const late = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => pickupLook(p(PICKUP_LIFE - 40 + i)).alpha);
    expect(Math.min(...late)).toBeLessThan(0.5);
    expect(Math.max(...late)).toBe(1);
    expect(pickupLook(p(PICKUP_LIFE)).alpha).toBe(0);
  });

  it('the HUD lists active perks with whole seconds left', () => {
    expect(activePerkLine(NO_PERKS)).toBe('');
    expect(activePerkLine({ ...NO_PERKS, shield: 200, magnet: 1 })).toBe('SHIELD 8s · MAGNET 1s');
  });

  it('collecting shows a banner; a smart bomb says how many it destroyed', () => {
    expect(perkBanner([{ type: 'perkCollected', id: 1, kind: 'rapidFire', pos: [0, 0, 0] }])).toMatchObject({ title: 'Rapid fire', subtitle: 'photons fire faster for 10 s' });
    expect(perkBanner([{ type: 'smartBomb', pos: [0, 0, 0], count: 3 }])?.subtitle).toBe('3 asteroids destroyed');
    expect(perkBanner([])).toBeNull();
  });
});
