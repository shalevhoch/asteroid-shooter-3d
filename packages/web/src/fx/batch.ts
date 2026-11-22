/**
 * `BillboardBatch` (P11, PLAN.md §5): every sprite in one instanced draw, sorted back to front on the CPU each frame,
 * premultiplied alpha with one blend (ONE, ONE_MINUS_SRC_ALPHA; additive sprites carry α = 0), and the view-plane flattening
 * in the vertex shader. `billboard.ts` holds the same math in TypeScript, where the tests pin it.
 *
 * Two quad kinds share the draw: camera-facing sprites (`iTail.w = 0`) and, from P12, velocity-aligned line sprites
 * (`iTail.w` = width/length ratio, the original `LineSprite`): head at `iCenter`, tail at `iTail.xyz`.
 */
import * as THREE from 'three';
import { backToFront, premultiply, viewDepth } from './billboard.js';
import { cellUv, type Cell } from './atlas.js';

const VERTEX = /* glsl */ `
attribute vec3 iCenter;
attribute vec2 iSizeAngle;
attribute vec4 iColor;
attribute vec4 iUv;
attribute vec4 iTail;
varying vec2 vUv;
varying vec4 vColor;
vec3 lineCorner(vec3 h) {
  // The original LineSprite.getQuadBillboard: width ⊥ both the line and the ray to its middle, ratio × length wide.
  vec3 t = (viewMatrix * vec4(iTail.xyz, 1.0)).xyz;
  vec3 line = h - t;
  vec3 perp = cross(-(h + t) * 0.5, line);
  float lp = length(perp);
  perp = lp > 1e-9 ? perp / lp * iTail.w * length(line) : vec3(0.0);
  return mix(h, t, position.x * 0.5 + 0.5) + perp * 0.5 * position.y;
}

void main() {
  vec3 c = (viewMatrix * vec4(iCenter, 1.0)).xyz;
  if (iTail.w > 0.0) {
    vec3 lc = lineCorner(c);
    lc *= c.z / min(lc.z, -1e-3);
    gl_Position = projectionMatrix * vec4(lc, 1.0);
    vUv = mix(iUv.xy, iUv.zw, position.xy * 0.5 + 0.5);
    vColor = iColor;
    return;
  }
  vec3 r = normalize(c);
  // A quad perpendicular to the eye ray (the original getOrthogonalQuadAtPosition), turned about it.
  vec3 a = vec3(0.0, 1.0, 0.0) - r * r.y;
  a = length(a) > 1e-6 ? normalize(a) : vec3(1.0, 0.0, 0.0);
  vec3 b = cross(r, a);
  float s = sin(iSizeAngle.y);
  float k = cos(iSizeAngle.y);
  vec3 up = a * k + b * s;
  vec3 right = b * k - a * s;
  vec3 corner = c + (right * position.x + up * position.y) * iSizeAngle.x;
  // Gilad's view-plane trick: slide the corner along its eye ray onto the plane z = c.z.
  corner *= c.z / min(corner.z, -1e-3);
  gl_Position = projectionMatrix * vec4(corner, 1.0);
  vUv = mix(iUv.xy, iUv.zw, position.xy * 0.5 + 0.5);
  vColor = iColor;
}`;

const FRAGMENT = /* glsl */ `
uniform sampler2D map;
varying vec2 vUv;
varying vec4 vColor;
void main() {
  vec4 t = texture2D(map, vUv);
  gl_FragColor = vec4(t.rgb * t.a, t.a) * vColor;
}`;

const UV_CACHE = new Map<Cell, [number, number, number, number]>();
const uvOf = (cell: Cell) => {
  let uv = UV_CACHE.get(cell);
  if (!uv) {
    uv = cellUv(cell);
    UV_CACHE.set(cell, uv);
  }
  return uv;
};

export class BillboardBatch {
  readonly mesh: THREE.Mesh;
  private readonly geometry: THREE.InstancedBufferGeometry;
  private readonly center: THREE.InstancedBufferAttribute;
  private readonly sizeAngle: THREE.InstancedBufferAttribute;
  private readonly color: THREE.InstancedBufferAttribute;
  private readonly uv: THREE.InstancedBufferAttribute;
  private readonly tail: THREE.InstancedBufferAttribute;
  // Staging, in push order; `end` writes it to the attributes in draw order.
  private readonly sPos: Float32Array;
  private readonly sSize: Float32Array;
  private readonly sColor: Float32Array;
  private readonly sUv: Float32Array;
  private readonly sTail: Float32Array;
  private readonly depth: Float32Array;
  private n = 0;

  constructor(
    atlas: THREE.Texture,
    readonly capacity: number,
  ) {
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]), 3));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const attr = (size: number) => new THREE.InstancedBufferAttribute(new Float32Array(capacity * size), size).setUsage(THREE.DynamicDrawUsage);
    this.center = attr(3);
    this.sizeAngle = attr(2);
    this.color = attr(4);
    this.uv = attr(4);
    this.tail = attr(4);
    g.setAttribute('iCenter', this.center);
    g.setAttribute('iSizeAngle', this.sizeAngle);
    g.setAttribute('iColor', this.color);
    g.setAttribute('iUv', this.uv);
    g.setAttribute('iTail', this.tail);
    g.instanceCount = 0;
    this.geometry = g;
    this.sPos = new Float32Array(capacity * 3);
    this.sSize = new Float32Array(capacity * 2);
    this.sColor = new Float32Array(capacity * 4);
    this.sUv = new Float32Array(capacity * 4);
    this.sTail = new Float32Array(capacity * 4);
    this.depth = new Float32Array(capacity);
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: { map: { value: atlas } },
      transparent: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
    });
    this.mesh = new THREE.Mesh(g, material);
    this.mesh.frustumCulled = false;
    // After the opaque world and the other transparent objects (atmosphere glow).
    this.mesh.renderOrder = 10;
  }

  /** Starts a frame's sprite list. */
  begin(): void {
    this.n = 0;
  }

  /** Queues one sprite; ignored past capacity or when invisible. `size` is the half-width in world units. */
  push(x: number, y: number, z: number, size: number, angle: number, r: number, g: number, b: number, a: number, additive: boolean, cell: Cell): void {
    if (this.n >= this.capacity || size <= 0 || a <= 0) return;
    const i = this.n++;
    const [pr, pg, pb, pa] = premultiply(r, g, b, a, additive);
    const [u0, v0, u1, v1] = uvOf(cell);
    const p = i * 3;
    this.sPos[p] = x;
    this.sPos[p + 1] = y;
    this.sPos[p + 2] = z;
    this.sSize[i * 2] = size;
    this.sSize[i * 2 + 1] = angle;
    const q = i * 4;
    this.sColor[q] = pr;
    this.sColor[q + 1] = pg;
    this.sColor[q + 2] = pb;
    this.sColor[q + 3] = pa;
    this.sUv[q] = u0;
    this.sUv[q + 1] = v0;
    this.sUv[q + 2] = u1;
    this.sUv[q + 3] = v1;
    this.sTail[q + 3] = 0;
  }

  /** Queues one line sprite from `head` to `tail`, `ratio` wide per unit of length (the original `LineSprite`). */
  pushLine(hx: number, hy: number, hz: number, tx: number, ty: number, tz: number, ratio: number, r: number, g: number, b: number, a: number, additive: boolean, cell: Cell): void {
    const before = this.n;
    this.push(hx, hy, hz, 1, 0, r, g, b, a, additive, cell);
    if (this.n === before) return;
    const q = before * 4;
    this.sTail[q] = tx;
    this.sTail[q + 1] = ty;
    this.sTail[q + 2] = tz;
    this.sTail[q + 3] = ratio;
  }

  /** Culls sprites behind the camera, sorts the rest farthest first, and uploads them. */
  end(camera: THREE.Camera): number {
    const view = camera.matrixWorldInverse.elements;
    let kept = 0;
    const idx: number[] = [];
    for (let i = 0; i < this.n; i++) {
      const d = viewDepth(view, this.sPos[i * 3] ?? 0, this.sPos[i * 3 + 1] ?? 0, this.sPos[i * 3 + 2] ?? 0);
      if (d <= 0.5) continue;
      this.depth[kept] = d;
      idx.push(i);
      kept++;
    }
    const order = backToFront(this.depth, kept);
    const c = this.center.array as Float32Array;
    const s = this.sizeAngle.array as Float32Array;
    const col = this.color.array as Float32Array;
    const uv = this.uv.array as Float32Array;
    const tail = this.tail.array as Float32Array;
    for (let j = 0; j < kept; j++) {
      const i = idx[order[j] ?? 0] ?? 0;
      c.set(this.sPos.subarray(i * 3, i * 3 + 3), j * 3);
      s.set(this.sSize.subarray(i * 2, i * 2 + 2), j * 2);
      col.set(this.sColor.subarray(i * 4, i * 4 + 4), j * 4);
      uv.set(this.sUv.subarray(i * 4, i * 4 + 4), j * 4);
      tail.set(this.sTail.subarray(i * 4, i * 4 + 4), j * 4);
    }
    for (const a of [this.center, this.sizeAngle, this.color, this.uv, this.tail]) {
      a.clearUpdateRanges();
      a.addUpdateRange(0, kept * a.itemSize);
      a.needsUpdate = true;
    }
    this.geometry.instanceCount = kept;
    return kept;
  }
}
