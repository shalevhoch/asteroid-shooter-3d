/**
 * Threat awareness math (P09): screen projection, edge arrows, radar placement, urgency. Pure (plain arrays, no
 * three.js), so it's unit-tested. `threatView.ts` draws it.
 */
import { LOCAL_FORWARD, LOCAL_RIGHT, LOCAL_UP, TICK_HZ, dot, rotate, sub, type Quat, type Vec3 } from '@asteroid/sim';

/** Where a world point lands on screen: normalised device coords, and whether it's behind the camera. */
export interface Projected {
  readonly x: number;
  readonly y: number;
  readonly behind: boolean;
}

/** Projects through a column-major 4×4 view-projection matrix (three.js `elements` order). */
export function project(m: readonly number[], p: Vec3): Projected {
  const e = (i: number) => m[i] ?? 0;
  const x = e(0) * p[0] + e(4) * p[1] + e(8) * p[2] + e(12);
  const y = e(1) * p[0] + e(5) * p[1] + e(9) * p[2] + e(13);
  const w = e(3) * p[0] + e(7) * p[1] + e(11) * p[2] + e(15);
  if (Math.abs(w) < 1e-9) return { x: 0, y: 0, behind: true };
  return { x: x / w, y: y / w, behind: w < 0 };
}

/** On screen: in front of the camera and inside the NDC square. */
export const onScreen = (p: Projected): boolean => !p.behind && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1;

export interface Arrow {
  /** NDC position on the inset edge. */
  readonly x: number;
  readonly y: number;
  /** Direction the arrow points (radians, screen space: 0 = right, π/2 = up). */
  readonly angle: number;
}

/**
 * Where to put an arrow for an off-screen point: on the border of the NDC square inset by `inset`, along the
 * direction from the screen centre. A point behind the camera is mirrored, so the arrow points the way to turn.
 */
export function edgeArrow(p: Projected, inset = 0.9): Arrow {
  let dx = p.behind ? -p.x : p.x;
  let dy = p.behind ? -p.y : p.y;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) [dx, dy] = [0, -1];
  const k = inset / Math.max(Math.abs(dx), Math.abs(dy));
  return { x: dx * k, y: dy * k, angle: Math.atan2(dy, dx) };
}

export interface RadarBlip {
  /** Disc coordinates in [−1, 1]: x = right, y = forward (up on the disc). Clamped to the rim when out of range. */
  readonly x: number;
  readonly y: number;
  /** Above (+) or below (−) the ship's wing plane, in disc units. */
  readonly elevation: number;
  readonly clamped: boolean;
}

/** A point in the ship's frame, top-down: forward is up on the disc, `range` world units to the rim. */
export function radarBlip(shipPos: Vec3, shipRot: Quat, p: Vec3, range: number): RadarBlip {
  const d = sub(p, shipPos);
  const x = dot(d, rotate(shipRot, LOCAL_RIGHT)) / range;
  const y = dot(d, rotate(shipRot, LOCAL_FORWARD)) / range;
  const elevation = dot(d, rotate(shipRot, LOCAL_UP)) / range;
  const r = Math.hypot(x, y);
  return r > 1 ? { x: x / r, y: y / r, elevation, clamped: true } : { x, y, elevation, clamped: false };
}

export type Urgency = 'critical' | 'warning' | 'calm';
/** Seconds to impact under which a threat is critical / a warning. */
export const CRITICAL_SECONDS = 10;
export const WARNING_SECONDS = 30;

export function urgency(ticksToImpact: number): Urgency {
  const s = ticksToImpact / TICK_HZ;
  return s < CRITICAL_SECONDS ? 'critical' : s < WARNING_SECONDS ? 'warning' : 'calm';
}

export const URGENCY_COLORS: Readonly<Record<Urgency, string>> = { critical: '#ff5a4a', warning: '#ffb347', calm: '#e8e070' };

/** "0:07" from ticks, rounded up so it never shows 0:00 before impact. */
export function formatImpact(ticks: number): string {
  const s = Math.max(0, Math.ceil(ticks / TICK_HZ));
  return `${String(Math.floor(s / 60))}:${String(s % 60).padStart(2, '0')}`;
}
