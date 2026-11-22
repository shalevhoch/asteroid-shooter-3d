/** Placeholder shot visuals (P06): additive glow sprites for photons and rockets, interpolated between ticks. */
import * as THREE from 'three';
import type { ProjectileKind, ProjectileState } from '@asteroid/sim';

const LOOK: Readonly<Record<ProjectileKind, { color: number; size: number }>> = {
  photon: { color: 0x7fe0ff, size: 16 },
  rocket: { color: 0xffa040, size: 26 },
};

export class ProjectileView {
  private readonly sprites = new Map<number, THREE.Sprite>();
  private readonly materials: Record<ProjectileKind, THREE.SpriteMaterial>;

  constructor(
    private readonly scene: THREE.Scene,
    texture: THREE.Texture,
  ) {
    const make = (k: ProjectileKind) =>
      new THREE.SpriteMaterial({ map: texture, color: LOOK[k].color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    this.materials = { photon: make('photon'), rocket: make('rocket') };
  }

  update(prev: readonly ProjectileState[], curr: readonly ProjectileState[], alpha: number): void {
    const before = new Map(prev.map((p) => [p.id, p]));
    const alive = new Set<number>();
    for (const p of curr) {
      alive.add(p.id);
      let s = this.sprites.get(p.id);
      if (!s) {
        s = new THREE.Sprite(this.materials[p.kind]);
        s.scale.setScalar(LOOK[p.kind].size);
        this.scene.add(s);
        this.sprites.set(p.id, s);
      }
      // A projectile's first tick has no previous position: start it from where it was fired.
      const from = before.get(p.id)?.pos ?? p.pos;
      s.position.set(from[0] + (p.pos[0] - from[0]) * alpha, from[1] + (p.pos[1] - from[1]) * alpha, from[2] + (p.pos[2] - from[2]) * alpha);
    }
    for (const [id, s] of this.sprites) {
      if (!alive.has(id)) {
        this.scene.remove(s);
        this.sprites.delete(id);
      }
    }
  }

  clear(): void {
    this.update([], [], 0);
  }
}
