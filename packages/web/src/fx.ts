/** Placeholder explosions and hit sparks (P07): additive sprites that grow and fade. Real FX come in P11–P12. */
import * as THREE from 'three';
import { BIG_RADIUS, SMALL_RADIUS, type SimEvent } from '@asteroid/sim';

export interface Burst {
  readonly pos: readonly [number, number, number];
  /** Final sprite size in world units. */
  readonly size: number;
  readonly durationMs: number;
  readonly color: number;
}

/** What bursts a tick's events spawn. Pure, so it's tested. */
export function burstsFor(events: readonly SimEvent[]): Burst[] {
  const out: Burst[] = [];
  for (const e of events) {
    if (e.type === 'asteroidDestroyed') out.push({ pos: e.pos, size: (e.size === 'big' ? BIG_RADIUS : SMALL_RADIUS) * 4, durationMs: e.size === 'big' ? 900 : 600, color: 0xffc070 });
    else if (e.type === 'earthHit') out.push({ pos: e.pos, size: (e.size === 'big' ? BIG_RADIUS : SMALL_RADIUS) * 5, durationMs: 1100, color: 0xff7040 });
    else if (e.type === 'asteroidHit') out.push({ pos: e.pos, size: 40, durationMs: 200, color: 0x9fe8ff });
  }
  return out;
}

interface Live {
  readonly sprite: THREE.Sprite;
  readonly burst: Burst;
  readonly born: number;
}

export class FxLayer {
  private readonly live: Live[] = [];

  constructor(
    private readonly scene: THREE.Scene,
    private readonly texture: THREE.Texture,
  ) {}

  spawn(bursts: readonly Burst[], nowMs: number): void {
    for (const b of bursts) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texture, color: b.color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      sprite.position.set(...b.pos);
      this.scene.add(sprite);
      this.live.push({ sprite, burst: b, born: nowMs });
    }
  }

  update(nowMs: number): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const l = this.live[i];
      if (!l) continue;
      const t = (nowMs - l.born) / l.burst.durationMs;
      if (t >= 1) {
        this.scene.remove(l.sprite);
        l.sprite.material.dispose();
        this.live.splice(i, 1);
        continue;
      }
      l.sprite.scale.setScalar(l.burst.size * (0.3 + 0.7 * Math.sqrt(t)));
      l.sprite.material.opacity = 1 - t * t;
    }
  }

  clear(): void {
    this.update(Infinity);
  }
}
