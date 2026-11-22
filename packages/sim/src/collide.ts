/** Swept hit tests for projectiles (SPEC §5): a tick's path segment against spheres and boxes. */
import type { Box } from './mothership.js';
import { dot, sub, type Vec3 } from './vec3.js';

/** Whether the segment a→b passes within r of c (closest point on the segment). */
export function segmentHitsSphere(a: Vec3, b: Vec3, c: Vec3, r: number): boolean {
  const ab = sub(b, a);
  const len2 = dot(ab, ab);
  const t = len2 > 0 ? Math.max(0, Math.min(1, dot(sub(c, a), ab) / len2)) : 0;
  const p: Vec3 = [a[0] + ab[0] * t, a[1] + ab[1] * t, a[2] + ab[2] * t];
  const d = sub(c, p);
  return dot(d, d) <= r * r;
}

/** Whether the segment a→b touches the box (slab test). */
export function segmentHitsBox(a: Vec3, b: Vec3, box: Box): boolean {
  let t0 = 0;
  let t1 = 1;
  for (let i = 0; i < 3; i++) {
    const o = a[i] ?? 0;
    const d = (b[i] ?? 0) - o;
    const lo = box.min[i] ?? 0;
    const hi = box.max[i] ?? 0;
    if (d === 0) {
      if (o < lo || o > hi) return false;
      continue;
    }
    let ta = (lo - o) / d;
    let tb = (hi - o) / d;
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}
