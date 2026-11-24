/**
 * Hyperdrive thrusters (P28), render only: where each craft's engines are, how hard they burn, and how a nozzle draws.
 * Pure; `main.ts` feeds the ship pose and pushes the billboards.
 */
import { rotate, type CraftId, type Quat, type Vec3 } from '@asteroid/sim';

/** Nozzles in ship-local space as fractions of the ship's length (nose −Z, so the tail is +Z). */
export const NOZZLES: Readonly<Record<CraftId, readonly Vec3[]>> = {
  fighter: [[-0.09, 0.02, 0.47], [0.09, 0.02, 0.47]],
  interceptor: [[-0.08, 0.02, 0.48], [0.08, 0.02, 0.48]],
  shuttle: [[0, 0.03, 0.48]],
  gship: [[-0.07, 0.02, 0.47], [0.07, 0.02, 0.47]],
};

/** Ramp per tick: the burn builds fast when the turbo kicks in and dies down more slowly. */
export const RAMP_UP = 0.18;
export const RAMP_DOWN = 0.06;

/** Eases the burn level (0..1) toward 1 while the turbo is on, 0 otherwise, over `dtTicks` ticks. */
export function rampThrust(level: number, turbo: boolean, dtTicks: number): number {
  const dt = Number.isFinite(dtTicks) ? Math.max(0, dtTicks) : 0;
  return turbo ? Math.min(1, level + RAMP_UP * dt) : Math.max(0, level - RAMP_DOWN * dt);
}

export interface NozzleLook {
  /** Glow sprite half-width, in ship lengths. */
  readonly glow: number;
  readonly glowAlpha: number;
  /** Flame plume length behind the nozzle, in ship lengths; 0 = no plume. */
  readonly flame: number;
  readonly flameAlpha: number;
  /** Whether to shed trail particles this tick. */
  readonly trail: boolean;
}

/** A nozzle's look: a soft idle glow that grows with the throttle, plus a long hot plume and a trail under hyperdrive. */
export function nozzleLook(level: number, throttle: number, throttleMax: number): NozzleLook {
  const idle = 0.04 + 0.03 * (throttle / Math.max(1, throttleMax));
  return {
    glow: idle + 0.08 * level,
    glowAlpha: 0.5 + 0.2 * level,
    flame: level > 0.02 ? 0.25 + 1.1 * level : 0,
    flameAlpha: Math.min(1, level * 1.4),
    trail: level > 0.35,
  };
}

/** World positions of a craft's nozzles, and the world "backward" direction. */
export function nozzleWorld(craft: CraftId, pos: Vec3, rot: Quat, length: number): { points: Vec3[]; back: Vec3 } {
  const points = NOZZLES[craft].map((n) => {
    const w = rotate(rot, [n[0] * length, n[1] * length, n[2] * length]);
    return [pos[0] + w[0], pos[1] + w[1], pos[2] + w[2]] as Vec3;
  });
  return { points, back: rotate(rot, [0, 0, 1]) };
}
