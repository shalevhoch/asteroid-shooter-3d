/**
 * The FX engine (P11, P12): live particles and shockwaves, the original's emitters, a particle cap, and the hand-off to the batch.
 * Particles update on the sim's 25 Hz tick, as the Java particle timer did, and are drawn interpolated.
 */
import { ROCKET_SPEED, type AsteroidState, type GameState, type ProjectileState, type Vec3 } from '@asteroid/sim';
import { inAtmosphere, type Recipe } from './bus.js';
import { flame, flare, flash, glint, noisyDir, rocketSmoke, smoke, spark, updateParticle, type Particle, type Rnd } from './particles.js';
import { MAX_SHOCKWAVES, shockwave, updateShockwave, type Shockwave } from './shockwave.js';
import type { V3 } from './billboard.js';
import type { BillboardBatch } from './batch.js';

/** Live particles at most; past it the oldest go first, so new effects always show. */
export const MAX_PARTICLES = 4000;

/** Explosion emitter counts (original `Explosion`): a shockwave (size × 10), 10 flashes, 40 flames, 50 smoke trails, 100 sparks. */
export const EXPLOSION_FLASHES = 10;
export const EXPLOSION_FLAMES = 40;
export const EXPLOSION_SMOKE = 50;
export const EXPLOSION_SPARKS = 100;
/** A photon chipping a big asteroid (original `BigAsteroid` PHOTON hit): 3 sparks, 5 smoke trails. */
export const IMPACT_SPARKS = 3;
export const IMPACT_SMOKE = 5;
/** Flares a flying rocket sheds per tick (original `Shot.update`). */
export const ROCKET_TRAIL_FLARES = 8;

/** Projectile looks (kept from P06 for readability; the original photon was a 2-unit dot). Half-widths. */
const PHOTON_LOOK = { size: 8, r: 0.5, g: 0.88, b: 1 };
const ROCKET_LOOK = { size: 13, r: 1, g: 0.63, b: 0.25 };

export class FxEngine {
  readonly particles: Particle[] = [];
  readonly shockwaves: Shockwave[] = [];
  /** Live particles kept (P20 lowers it on slow devices); never above MAX_PARTICLES. */
  particleCap = MAX_PARTICLES;

  constructor(private readonly rnd: Rnd = Math.random) {}

  /** Spawns the particles for a tick's recipes. `camUp` is the camera's world up (it orients new shockwaves, as in the original). */
  apply(recipes: readonly Recipe[], camUp: V3 = [0, 1, 0]): void {
    for (const r of recipes) {
      if (r.kind === 'explosion') this.explode(r.pos, r.size, r.normal, camUp);
      else if (r.kind === 'impact') {
        // A small flash on top of the original's sparks and smoke, which are a few units long and vanish at range.
        this.add(flash(r.pos, 0.25, this.rnd));
        for (let i = 0; i < IMPACT_SPARKS; i++) this.add(spark(r.pos, this.rnd));
        for (let i = 0; i < IMPACT_SMOKE; i++) this.add(smoke(r.pos, this.rnd));
      } else for (let i = 0; i < 2; i++) this.add(glint(r.pos, this.rnd));
    }
    this.enforceCap();
  }

  /** The original `Explosion`: the shockwave first (when there is a normal), then the emitters. */
  private explode(pos: Vec3, size: number, normal: Vec3 | null, camUp: V3): void {
    if (normal) {
      this.shockwaves.push(shockwave(pos, normal, camUp, size * 10));
      if (this.shockwaves.length > MAX_SHOCKWAVES) this.shockwaves.shift();
    }
    for (let i = 0; i < EXPLOSION_FLASHES; i++) this.add(flash(pos, size, this.rnd));
    for (let i = 0; i < EXPLOSION_FLAMES; i++) this.add(flame(pos, size, this.rnd));
    for (let i = 0; i < EXPLOSION_SMOKE; i++) this.add(smoke(pos, this.rnd));
    for (let i = 0; i < EXPLOSION_SPARKS; i++) this.add(spark(pos, this.rnd));
  }

  /** Per-tick emitters driven by state: rocket trails and asteroids burning through the atmosphere. */
  ambient(state: GameState): void {
    for (const p of state.projectiles) if (p.kind === 'rocket') this.rocketTrail(p);
    for (const a of inAtmosphere(state)) this.atmosphereTail(a);
    this.enforceCap();
  }

  /** One tick of an asteroid burning through the atmosphere (original ATMOSPHERE collision): a flare tail, plus flames on a big one. */
  atmosphereTail(a: AsteroidState): void {
    const big = a.size === 'big';
    const back: Vec3 = [-a.dir[0] * (big ? 0.67 : 0.3), -a.dir[1] * (big ? 0.67 : 0.3), -a.dir[2] * (big ? 0.67 : 0.3)];
    for (let i = 0; i < (big ? 16 : 4); i++)
      this.add(flare(a.pos, 9 * (this.rnd() * 0.9 + 0.9), noisyDir(back, big ? 0.075 : 0.05, this.rnd), big ? 50 : 15, 'roundParticle', this.rnd));
    if (big) for (let i = 0; i < 3; i++) this.add(flame(a.pos, 2, this.rnd));
  }

  /** One tick of a flying rocket's trail (original `Shot.update`). */
  rocketTrail(p: ProjectileState): void {
    const from: Vec3 = [p.pos[0] - p.dir[0] * ROCKET_SPEED, p.pos[1] - p.dir[1] * ROCKET_SPEED, p.pos[2] - p.dir[2] * ROCKET_SPEED];
    this.add(rocketSmoke(from, p.pos, this.rnd));
    for (let i = 0; i < ROCKET_TRAIL_FLARES; i++)
      this.add(flare(p.pos, ROCKET_SPEED * (this.rnd() * 0.45 + 0.45), noisyDir(p.dir, 0.005, this.rnd), 0.25, 'roundParticle', this.rnd));
  }

  /** One tick of hyperdrive exhaust (P28): hot flares streaming back from each nozzle, plus a flame puff. */
  thrusterTrail(points: readonly Vec3[], back: Vec3, speed: number): void {
    for (const p of points) {
      for (let i = 0; i < 3; i++) this.add(flare(p, speed * (this.rnd() * 0.5 + 0.6), noisyDir(back, 0.04, this.rnd), 0.9, 'roundParticle', this.rnd));
      this.add(flame(p, 0.6, this.rnd));
    }
    this.enforceCap();
  }

  /** One 40 ms step for every particle; the dead are dropped. */
  tick(): void {
    let w = 0;
    for (const p of this.particles) {
      updateParticle(p, this.rnd);
      if (!p.dead) this.particles[w++] = p;
    }
    this.particles.length = w;
    let k = 0;
    for (const s of this.shockwaves) {
      updateShockwave(s);
      if (!s.dead) this.shockwaves[k++] = s;
    }
    this.shockwaves.length = k;
  }

  clear(): void {
    this.particles.length = 0;
    this.shockwaves.length = 0;
  }

  /** Queues every particle (interpolated by `alpha`), then the projectiles (by `shotAlpha`, the sim's), into the batch. */
  draw(batch: BillboardBatch, alpha: number, prev: readonly ProjectileState[], curr: readonly ProjectileState[], shotAlpha = alpha): void {
    for (const p of this.particles) {
      const x = p.px + (p.x - p.px) * alpha;
      const y = p.py + (p.y - p.py) * alpha;
      const z = p.pz + (p.z - p.pz) * alpha;
      if (p.ratio > 0) {
        batch.pushLine(x, y, z, p.ptx + (p.tx - p.ptx) * alpha, p.pty + (p.ty - p.pty) * alpha, p.ptz + (p.tz - p.ptz) * alpha, p.ratio, p.r, p.g, p.b, p.a, p.additive, p.cell);
      } else batch.push(x, y, z, p.size + p.jitter, p.angle, p.r, p.g, p.b, p.a, p.additive, p.cell);
    }
    const before = new Map(prev.map((p) => [p.id, p.pos]));
    for (const p of curr) {
      const from = before.get(p.id) ?? p.pos;
      const look = p.kind === 'photon' ? PHOTON_LOOK : ROCKET_LOOK;
      const x = from[0] + (p.pos[0] - from[0]) * shotAlpha;
      const y = from[1] + (p.pos[1] - from[1]) * shotAlpha;
      const z = from[2] + (p.pos[2] - from[2]) * shotAlpha;
      batch.push(x, y, z, look.size, 0, look.r, look.g, look.b, 1, true, p.kind === 'photon' ? 'particle' : 'roundParticle');
    }
  }

  private add(p: Particle): void {
    this.particles.push(p);
  }

  private enforceCap(): void {
    const over = this.particles.length - Math.min(this.particleCap, MAX_PARTICLES);
    if (over > 0) this.particles.splice(0, over);
  }
}
