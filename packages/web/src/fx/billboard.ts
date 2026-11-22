/**
 * Billboard math for the FX batch (P11, PLAN.md §5). Pure; `batch.ts` runs the same steps in GLSL.
 *
 * Original `Sprite`: a quad perpendicular to the camera → sprite ray (`getOrthogonalQuadAtPosition`), rotated about that ray,
 * then each corner slid along its own eye ray onto the plane through the sprite centre parallel to the view plane
 * (`convertToOrthogonalToCameraPlane`, Gilad's "3D street art" trick). The screen image is unchanged and the depth is constant,
 * so a sprite never cuts into an asteroid or another sprite. Sprites are drawn farthest first (`zedDistanceTo` order).
 */
export type V3 = readonly [number, number, number];

const clamp01 = (v: number): number => (v > 0 ? (v < 1 ? v : 1) : 0);

/** Premultiplied instance colour. Additive sprites (original blend SRC_ALPHA, ONE) write α = 0, so every sprite shares one blend: ONE, ONE_MINUS_SRC_ALPHA. */
export function premultiply(r: number, g: number, b: number, a: number, additive: boolean): [number, number, number, number] {
  const al = clamp01(a);
  return [clamp01(r) * al, clamp01(g) * al, clamp01(b) * al, additive ? 0 : al];
}

/** Distance in front of the camera along its view axis, from a column-major view matrix (three.js `matrixWorldInverse.elements`). */
export function viewDepth(view: ArrayLike<number>, x: number, y: number, z: number): number {
  return -((view[2] ?? 0) * x + (view[6] ?? 0) * y + (view[10] ?? 0) * z + (view[14] ?? 0));
}

/** Draw order: indices farthest first; equal depths keep their index order. */
export function backToFront(depths: ArrayLike<number>, count: number): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  return order.sort((a, b) => (depths[b] ?? 0) - (depths[a] ?? 0) || a - b);
}

/** Slides a view-space corner along its eye ray onto the plane z = centreZ. */
export function flatten(corner: V3, centreZ: number): V3 {
  const k = centreZ / corner[2];
  return [corner[0] * k, corner[1] * k, corner[2] * k];
}

const norm = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]);
  return l > 0 ? [v[0] / l, v[1] / l, v[2] / l] : [0, 0, 0];
};

/**
 * The four view-space corners of a line sprite (the original `LineSprite.getQuadBillboard`): head side then tail side, its width
 * ⊥ both the line and the eye ray to its middle, `ratio × length` wide; flattened onto the plane through the head (its position).
 */
export function lineCorners(h: V3, t: V3, ratio: number): V3[] {
  const line: V3 = [h[0] - t[0], h[1] - t[1], h[2] - t[2]];
  const m: V3 = [-(h[0] + t[0]) / 2, -(h[1] + t[1]) / 2, -(h[2] + t[2]) / 2];
  const cr: V3 = [m[1] * line[2] - m[2] * line[1], m[2] * line[0] - m[0] * line[2], m[0] * line[1] - m[1] * line[0]];
  const n = norm(cr);
  const w = (ratio * Math.hypot(...line)) / 2;
  const p: V3 = [n[0] * w, n[1] * w, n[2] * w];
  return ([[-1, -1], [1, -1], [1, 1], [-1, 1]] as const).map(([x, y]) => {
    const k = (x + 1) / 2;
    return flatten([h[0] + (t[0] - h[0]) * k + p[0] * y, h[1] + (t[1] - h[1]) * k + p[1] * y, h[2] + (t[2] - h[2]) * k + p[2] * y], h[2]);
  });
}

/**
 * The four view-space corners (−,−) (+,−) (+,+) (−,+) of a sprite centred at view-space `c`, half-size `size`, turned `angle`
 * about its eye ray, flattened onto the plane z = c.z.
 */
export function billboardCorners(c: V3, size: number, angle: number): V3[] {
  const r = norm(c);
  // Camera up (view-space +Y) projected onto the plane ⊥ the eye ray; straight up or down the ray falls back to +X.
  const upOnPlane: V3 = [-r[0] * r[1], 1 - r[1] * r[1], -r[2] * r[1]];
  const a = Math.hypot(...upOnPlane) > 1e-6 ? norm(upOnPlane) : ([1, 0, 0] as V3);
  const b: V3 = [r[1] * a[2] - r[2] * a[1], r[2] * a[0] - r[0] * a[2], r[0] * a[1] - r[1] * a[0]];
  const s = Math.sin(angle);
  const k = Math.cos(angle);
  const up: V3 = [a[0] * k + b[0] * s, a[1] * k + b[1] * s, a[2] * k + b[2] * s];
  const right: V3 = [b[0] * k - a[0] * s, b[1] * k - a[1] * s, b[2] * k - a[2] * s];
  return (
    [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ] as const
  ).map(([x, y]) => flatten([c[0] + (right[0] * x + up[0] * y) * size, c[1] + (right[1] * x + up[1] * y) * size, c[2] + (right[2] * x + up[2] * y) * size], c[2]));
}
