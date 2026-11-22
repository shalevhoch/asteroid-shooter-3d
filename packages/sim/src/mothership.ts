/** The mothership's solid boxes (SPEC §2) and the ship push-out (SPEC §3). */
import { MOTHERSHIP_POS, MOTHERSHIP_SCALE, SHIP_RADIUS } from './constants.js';
import { MOTHERSHIP_BOXES } from './data/mothershipBoxes.js';
import { addScaled, type Vec3 } from './vec3.js';

export interface Box {
  readonly min: Vec3;
  readonly max: Vec3;
}

const toWorld = (c: readonly [number, number, number]): Vec3 => addScaled(MOTHERSHIP_POS, c, MOTHERSHIP_SCALE);

/** The six world-space boxes, in the original's b1..b6 order. */
export const MOTHERSHIP_WORLD_BOXES: readonly Box[] = MOTHERSHIP_BOXES.map((b) => ({ min: toWorld(b.min), max: toWorld(b.max) }));

/** Whether a sphere overlaps a box (closest-point test). */
export function sphereHitsBox(c: Vec3, r: number, b: Box): boolean {
  let d2 = 0;
  for (let a = 0; a < 3; a++) {
    const v = c[a] ?? 0;
    const lo = b.min[a] ?? 0;
    const hi = b.max[a] ?? 0;
    const d = v < lo ? lo - v : v > hi ? v - hi : 0;
    d2 += d * d;
  }
  return d2 < r * r;
}

/** Pushes the centre out of `b` grown by `r`, along the axis and side of least penetration (ties: x, y, z; min side first). */
export function pushOut(c: Vec3, r: number, b: Box): Vec3 {
  let best = Infinity;
  let axisIdx = 0;
  let target = 0;
  for (let a = 0; a < 3; a++) {
    const v = c[a] ?? 0;
    const toMin = v - ((b.min[a] ?? 0) - r);
    const toMax = (b.max[a] ?? 0) + r - v;
    if (toMin < best) [best, axisIdx, target] = [toMin, a, (b.min[a] ?? 0) - r];
    if (toMax < best) [best, axisIdx, target] = [toMax, a, (b.max[a] ?? 0) + r];
  }
  const out: [number, number, number] = [c[0], c[1], c[2]];
  out[axisIdx] = target;
  return out;
}

/** The ship's position after resolving every overlapping box in order, and whether any overlapped. */
export function resolveMothership(pos: Vec3, boxes: readonly Box[] = MOTHERSHIP_WORLD_BOXES): { pos: Vec3; bumped: boolean } {
  let p = pos;
  let bumped = false;
  for (const b of boxes) {
    if (sphereHitsBox(p, SHIP_RADIUS, b)) {
      p = pushOut(p, SHIP_RADIUS, b);
      bumped = true;
    }
  }
  return { pos: p, bumped };
}
