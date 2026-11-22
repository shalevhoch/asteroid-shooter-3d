/**
 * Pure view math (P04): interpolating between sim ticks, and the camera rigs. Uses the sim's vector types so it can be
 * tested without three.js.
 */
import { LOCAL_FORWARD, LOCAL_UP, add, normalizeQuat, rotate, type Quat, type ShipState, type Vec3 } from '@asteroid/sim';

export interface Pose {
  readonly pos: Vec3;
  readonly rot: Quat;
}

/** Linear position, normalised-lerp rotation (shortest arc). `alpha` ∈ [0, 1] is clamped. */
export function interpolate(prev: Pose, curr: Pose, alpha: number): Pose {
  const t = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1;
  const p = prev.pos;
  const c = curr.pos;
  const dotq = prev.rot[0] * curr.rot[0] + prev.rot[1] * curr.rot[1] + prev.rot[2] * curr.rot[2] + prev.rot[3] * curr.rot[3];
  const s = dotq < 0 ? -1 : 1;
  const lerp = (a: number, b: number) => a + (b - a) * t;
  return {
    pos: [lerp(p[0], c[0]), lerp(p[1], c[1]), lerp(p[2], c[2])],
    rot: normalizeQuat([lerp(prev.rot[0], s * curr.rot[0]), lerp(prev.rot[1], s * curr.rot[1]), lerp(prev.rot[2], s * curr.rot[2]), lerp(prev.rot[3], s * curr.rot[3])]),
  };
}

export type CameraMode = 'chase' | 'classic';
export const CAMERA_MODES: readonly CameraMode[] = ['chase', 'classic'];

/** Camera offsets in ship-local space (right +X, up +Y, forward −Z). */
export const CAMERA_RIGS: Readonly<Record<CameraMode, { eye: Vec3; look: Vec3 }>> = {
  // Behind and above, looking a little ahead of the ship.
  chase: { eye: [0, 24, 115], look: [0, 8, -80] },
  // The original's view: the eye where the Java camera was (the ship model ~62 units ahead and a bit below).
  classic: { eye: [0, 11, 62], look: [0, 11, -1000] },
};

export interface CameraPose {
  readonly eye: Vec3;
  readonly look: Vec3;
  readonly up: Vec3;
}

export function cameraPose(pose: Pose, mode: CameraMode): CameraPose {
  const rig = CAMERA_RIGS[mode];
  return { eye: add(pose.pos, rotate(pose.rot, rig.eye)), look: add(pose.pos, rotate(pose.rot, rig.look)), up: rotate(pose.rot, LOCAL_UP) };
}

/** Vertical FOV (degrees): 50, widening toward 80 under turbo, easing back (the original's warp feel). */
export const FOV_BASE = 50;
export const FOV_TURBO = 80;
export const FOV_EASE_PER_SECOND = 4;

export function nextFov(fov: number, ship: Pick<ShipState, 'turbo'>, dtSeconds: number): number {
  const target = ship.turbo ? FOV_TURBO : FOV_BASE;
  const k = 1 - Math.exp(-FOV_EASE_PER_SECOND * Math.max(0, dtSeconds));
  return fov + (target - fov) * k;
}

export const forwardOf = (rot: Quat): Vec3 => rotate(rot, LOCAL_FORWARD);

/** How far ahead the crosshair marks the line of fire (photons travel 36 × 20 = 720 units). */
export const AIM_DISTANCE = 600;

/** The point `distance` ahead of the ship along its line of fire. */
export function aimPoint(pose: Pose, distance: number): Vec3 {
  return add(pose.pos, rotate(pose.rot, [0, 0, -distance]));
}
