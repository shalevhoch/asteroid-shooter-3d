/**
 * The explosion shockwave (P12, original `Shockwave`): a ring quad on the plane ⊥ the explosion normal, its up axis the camera's
 * up at spawn projected onto that plane, growing ×1.25 and fading ×0.85 per tick. Drawn before every other sprite, and
 * view-plane flattened like them. The math is pure; `ShockwaveLayer` draws a small pool of meshes.
 */
import * as THREE from 'three';
import { cellUv } from './atlas.js';
import type { V3 } from './billboard.js';

export const SHOCKWAVE_GROWTH = 1.25;
export const SHOCKWAVE_DECAY = 0.85;
export const MAX_SHOCKWAVES = 24;

export interface Shockwave {
  readonly pos: V3;
  readonly xAxis: V3;
  readonly yAxis: V3;
  readonly normal: V3;
  size: number;
  a: number;
  dead: boolean;
}

const unit = (v: V3): V3 => {
  const l = Math.hypot(...v);
  return l > 1e-9 ? [v[0] / l, v[1] / l, v[2] / l] : [0, 0, 0];
};
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** A new shockwave; `camUp` is the camera's world up when it spawns. A normal along `camUp` falls back to the world X axis. */
export function shockwave(pos: V3, normal: V3, camUp: V3, size: number): Shockwave {
  const n = unit(normal);
  const d = camUp[0] * n[0] + camUp[1] * n[1] + camUp[2] * n[2];
  let y = unit([camUp[0] - n[0] * d, camUp[1] - n[1] * d, camUp[2] - n[2] * d]);
  if (Math.hypot(...y) === 0) y = unit(Math.abs(n[0]) < 0.9 ? cross(n, [1, 0, 0]) : cross(n, [0, 0, 1]));
  return { pos, normal: n, yAxis: y, xAxis: unit(cross(y, n)), size, a: 1, dead: false };
}

export function updateShockwave(s: Shockwave): void {
  s.size *= SHOCKWAVE_GROWTH;
  s.a *= SHOCKWAVE_DECAY;
  s.dead = s.a < 0.1;
}

const VERTEX = /* glsl */ `
varying vec2 vUv;
uniform vec4 uvRect;
void main() {
  vec4 c = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  mv.xyz *= c.z / min(mv.z, -1e-3);
  gl_Position = projectionMatrix * mv;
  vUv = mix(uvRect.xy, uvRect.zw, uv);
}`;

const FRAGMENT = /* glsl */ `
uniform sampler2D map;
uniform float alpha;
varying vec2 vUv;
void main() {
  vec4 t = texture2D(map, vUv);
  gl_FragColor = vec4(t.rgb * t.a, t.a) * alpha;
}`;

/** A pool of ring meshes, drawn just before the sprite batch. */
export class ShockwaveLayer {
  private readonly meshes: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
  private readonly basis = new THREE.Matrix4();

  constructor(scene: THREE.Scene, atlas: THREE.Texture) {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const [u0, v0, u1, v1] = cellUv('shockwave');
    for (let i = 0; i < MAX_SHOCKWAVES; i++) {
      const material = new THREE.ShaderMaterial({
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        uniforms: { map: { value: atlas }, alpha: { value: 0 }, uvRect: { value: new THREE.Vector4(u0, v0, u1, v1) } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.OneFactor,
        blendDst: THREE.OneMinusSrcAlphaFactor,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = 9;
      mesh.matrixAutoUpdate = false;
      scene.add(mesh);
      this.meshes.push(mesh);
    }
  }

  sync(waves: readonly Shockwave[]): void {
    this.meshes.forEach((mesh, i) => {
      const w = waves[i];
      mesh.visible = Boolean(w);
      if (!w) return;
      this.basis.makeBasis(new THREE.Vector3(...w.xAxis), new THREE.Vector3(...w.yAxis), new THREE.Vector3(...w.normal));
      this.basis.scale(new THREE.Vector3(w.size, w.size, w.size));
      this.basis.setPosition(...w.pos);
      mesh.matrix.copy(this.basis);
      mesh.matrixWorldNeedsUpdate = true;
      const alpha = mesh.material.uniforms['alpha'];
      if (alpha) alpha.value = w.a;
    });
  }
}
