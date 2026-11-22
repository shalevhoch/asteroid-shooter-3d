/** Draws the sim's asteroids (P05): one mesh per asteroid id, interpolated between ticks, tumbling for show. */
import * as THREE from 'three';
import { BIG_RADIUS, SMALL_RADIUS, type AsteroidSize, type AsteroidState } from '@asteroid/sim';

/** The rock is drawn a bit smaller than its collision sphere, so near misses still count as hits. */
export const VISUAL_TO_COLLISION = 0.85;

/** Deterministic per-id tumble: a unit axis and a rate (radians per tick), from a small integer hash. */
export function tumbleFor(id: number): { axis: [number, number, number]; rate: number } {
  let h = Math.imul(id ^ 0x9e3779b9, 0x85ebca6b) >>> 0;
  const next = () => {
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
    return h / 4294967296;
  };
  const z = next() * 2 - 1;
  const t = next() * Math.PI * 2;
  const r = Math.sqrt(1 - z * z);
  return { axis: [r * Math.cos(t), r * Math.sin(t), z], rate: 0.01 + next() * 0.03 };
}

export class AsteroidView {
  private readonly meshes = new Map<number, THREE.Mesh>();
  private readonly material = new THREE.MeshStandardMaterial({ color: 0x8a7f72, roughness: 0.95, metalness: 0.05, flatShading: true });
  private readonly scales: Record<AsteroidSize, number>;
  private readonly axis = new THREE.Vector3();

  constructor(
    private readonly scene: THREE.Scene,
    private readonly geometry: { readonly big: THREE.BufferGeometry; readonly small: THREE.BufferGeometry },
  ) {
    const radius = (g: THREE.BufferGeometry) => {
      g.computeBoundingSphere();
      return g.boundingSphere?.radius ?? 1;
    };
    this.scales = { big: (BIG_RADIUS * VISUAL_TO_COLLISION) / radius(geometry.big), small: (SMALL_RADIUS * VISUAL_TO_COLLISION) / radius(geometry.small) };
  }

  /** Syncs meshes to `curr`, placing each between its `prev` and `curr` position by `alpha`. */
  update(prev: readonly AsteroidState[], curr: readonly AsteroidState[], alpha: number, tick: number): void {
    const before = new Map(prev.map((a) => [a.id, a]));
    const alive = new Set<number>();
    for (const a of curr) {
      alive.add(a.id);
      let mesh = this.meshes.get(a.id);
      if (!mesh) {
        mesh = new THREE.Mesh(this.geometry[a.size], this.material);
        mesh.scale.setScalar(this.scales[a.size]);
        this.scene.add(mesh);
        this.meshes.set(a.id, mesh);
      }
      const p = before.get(a.id)?.pos ?? a.pos;
      mesh.position.set(p[0] + (a.pos[0] - p[0]) * alpha, p[1] + (a.pos[1] - p[1]) * alpha, p[2] + (a.pos[2] - p[2]) * alpha);
      const t = tumbleFor(a.id);
      mesh.quaternion.setFromAxisAngle(this.axis.set(...t.axis), (tick + alpha) * t.rate);
    }
    for (const [id, mesh] of this.meshes) {
      if (!alive.has(id)) {
        this.scene.remove(mesh);
        this.meshes.delete(id);
      }
    }
  }

  clear(): void {
    this.update([], [], 0, 0);
  }
}
