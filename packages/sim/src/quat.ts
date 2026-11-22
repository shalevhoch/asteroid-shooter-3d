/** Unit quaternions `[x, y, z, w]` for the ship's orientation. */
import type { Vec3 } from './vec3.js';

export type Quat = readonly [number, number, number, number];

export const IDENTITY: Quat = [0, 0, 0, 1];

/** Rotation of `angle` radians about the unit vector `axis` (right-hand rule). */
export function fromAxisAngle(axis: Vec3, angle: number): Quat {
  const s = Math.sin(angle / 2);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(angle / 2)];
}

/** `a × b`: rotate by `b` first, then by `a`. With `a` the current orientation, `b` acts in the local frame. */
export function multiply(a: Quat, b: Quat): Quat {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by - ax * bz + ay * bw + az * bx,
    aw * bz + ax * by - ay * bx + az * bw,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

/** Back to unit length, cancelling the drift that repeated multiplication accumulates. */
export function normalizeQuat(q: Quat): Quat {
  const l = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
  return l > 0 ? [q[0] / l, q[1] / l, q[2] / l, q[3] / l] : IDENTITY;
}

/** `v` rotated by the unit quaternion `q`. */
export function rotate(q: Quat, v: Vec3): Vec3 {
  const [x, y, z, w] = q;
  // t = 2 × (q.xyz × v); v' = v + w t + q.xyz × t
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [v[0] + w * tx + (y * tz - z * ty), v[1] + w * ty + (z * tx - x * tz), v[2] + w * tz + (x * ty - y * tx)];
}
