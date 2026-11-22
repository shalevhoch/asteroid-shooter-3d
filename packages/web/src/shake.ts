/**
 * Earth-hit feedback (P12): a short camera shake and a red screen flash, scaled by the hit. Pure; `main.ts` applies it.
 * Shake is on by default, off when the browser asks for reduced motion, and a setting either way (SPEC §12).
 */
import { BIG_EARTH_DAMAGE, type SimEvent } from '@asteroid/sim';

export const SHAKE_MS = 450;
export const FLASH_MS = 550;
/** Peak camera rotation for a full-strength hit, in radians (~0.8°). */
export const SHAKE_MAX_RAD = 0.014;
/** Peak flash opacity for a full-strength hit. */
export const FLASH_MAX = 0.35;

/** How hard a tick's Earth hits land: damage over a big asteroid's base damage, 0..1; 0 without a hit. */
export function hitStrength(events: readonly SimEvent[]): number {
  let s = 0;
  for (const e of events) if (e.type === 'earthHit') s = Math.max(s, Math.min(1, e.damage / BIG_EARTH_DAMAGE));
  return s;
}

export interface Jolt {
  readonly strength: number;
  readonly startMs: number;
}

/** A new hit replaces the running jolt only if it is stronger than what's left of it. */
export function addJolt(current: Jolt | null, strength: number, nowMs: number): Jolt | null {
  if (strength <= 0) return current;
  if (current && joltLeft(current, nowMs) >= strength) return current;
  return { strength, startMs: nowMs };
}

const joltLeft = (j: Jolt, nowMs: number): number => j.strength * Math.max(0, 1 - (nowMs - j.startMs) / SHAKE_MS);

/** The camera offset (yaw, pitch in radians) and flash opacity at `nowMs`. Zero before the jolt and after it ends. */
export function joltAt(j: Jolt | null, nowMs: number, shake: boolean): { yaw: number; pitch: number; flash: number } {
  if (!j) return { yaw: 0, pitch: 0, flash: 0 };
  const t = nowMs - j.startMs;
  if (t < 0) return { yaw: 0, pitch: 0, flash: 0 };
  const s = Math.max(0, 1 - t / SHAKE_MS) ** 2 * j.strength * SHAKE_MAX_RAD;
  const f = Math.max(0, 1 - t / FLASH_MS) * j.strength * FLASH_MAX;
  return shake && s > 0 ? { yaw: s * Math.sin(t * 0.09), pitch: s * Math.cos(t * 0.113), flash: f } : { yaw: 0, pitch: 0, flash: f };
}
