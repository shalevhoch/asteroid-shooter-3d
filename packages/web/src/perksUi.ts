/** Perks on screen (P26): pickup looks, the HUD's active-perk line and the collect banner. Pure. */
import { PERK_DURATION, PICKUP_BLINK, PICKUP_LIFE, TICK_HZ, type ActivePerks, type PerkKind, type PickupState, type SimEvent, type TimedPerk } from '@asteroid/sim';
import type { Banner } from './waveUi.js';

export const PERK_LOOK: Readonly<Record<PerkKind, { readonly name: string; readonly how: string; readonly rgb: readonly [number, number, number] }>> = {
  shield: { name: 'Shield', how: 'Earth impacts blocked', rgb: [0.35, 0.75, 1] },
  rapidFire: { name: 'Rapid fire', how: 'photons fire faster', rgb: [1, 0.9, 0.3] },
  spreadShot: { name: 'Spread shot', how: 'three photons per shot', rgb: [1, 0.55, 0.2] },
  magnet: { name: 'Magnet', how: 'pickups fly to you', rgb: [0.95, 0.4, 1] },
  smartBomb: { name: 'Smart bomb', how: 'everything nearby destroyed', rgb: [1, 0.3, 0.3] },
};

/** Fade-out over the last half second. */
const FADE_TICKS = 12;

/** How a pickup draws at `age` (fractional ticks): a pulsing glow that blinks in its last 2 s and fades at the end. */
export function pickupLook(p: PickupState, age: number = p.age): { size: number; alpha: number; rgb: readonly [number, number, number] } {
  const left = PICKUP_LIFE - age;
  const pulse = 1 + 0.15 * Math.sin(age * 0.5);
  const blinkOff = left <= PICKUP_BLINK && Math.floor(age / 4) % 2 === 1;
  const fade = Math.max(0, Math.min(1, left / FADE_TICKS));
  return { size: 22 * pulse, alpha: blinkOff ? 0.25 * fade : fade, rgb: PERK_LOOK[p.kind].rgb };
}

/** "SHIELD 8s · MAGNET 12s" for the HUD; empty with nothing active. */
export function activePerkLine(perks: ActivePerks): string {
  return (Object.keys(perks) as TimedPerk[])
    .filter((k) => perks[k] > 0)
    .map((k) => `${PERK_LOOK[k].name.toUpperCase()} ${String(Math.ceil(perks[k] / TICK_HZ))}s`)
    .join(' · ');
}

/** A short banner when a perk is collected (the last one this tick wins). */
export function perkBanner(events: readonly SimEvent[]): Banner | null {
  let b: Banner | null = null;
  for (const e of events) {
    if (e.type === 'perkCollected') {
      const look = PERK_LOOK[e.kind];
      const secs = e.kind === 'smartBomb' ? '' : ` for ${String(PERK_DURATION[e.kind] / TICK_HZ)} s`;
      b = { title: look.name, subtitle: `${look.how}${secs}`, durationMs: 1800 };
    } else if (e.type === 'smartBomb') b = { title: 'Smart bomb', subtitle: `${String(e.count)} asteroid${e.count === 1 ? '' : 's'} destroyed`, durationMs: 1800 };
  }
  return b;
}
