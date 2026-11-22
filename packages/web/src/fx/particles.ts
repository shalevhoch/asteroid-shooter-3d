/**
 * The original sprite particles (P11), ported rule for rule from `objects3d/particles/sprites/*.java`. Each updates once per
 * 40 ms tick, as the Java particle timer did. Sizes are half-widths in world units (the Java quad spans ±size).
 * Randomness comes from an injected `rnd()` so tests can seed it.
 */
import type { Cell } from './atlas.js';

export type ParticleKind = 'flash' | 'flame' | 'flare' | 'glint';

export interface Particle {
  kind: ParticleKind;
  cell: Cell;
  additive: boolean;
  x: number;
  y: number;
  z: number;
  /** Position one tick ago, for interpolation. */
  px: number;
  py: number;
  pz: number;
  /** Per-tick drift. */
  vx: number;
  vy: number;
  vz: number;
  size: number;
  /** Render-time size jitter (Flare). */
  jitter: number;
  angle: number;
  spin: number;
  r: number;
  g: number;
  b: number;
  a: number;
  /** 0 = first phase (grow), 1 = second (fade). */
  phase: 0 | 1;
  grow: number;
  /** Flare: per-tick fade. */
  decay: number;
  dead: boolean;
}

export type Rnd = () => number;
type V = readonly [number, number, number];

/** `Vector.noise(n)`: each component ± n/2. */
const noisy = (p: V, n: number, rnd: Rnd): V => [p[0] + rnd() * n - n / 2, p[1] + rnd() * n - n / 2, p[2] + rnd() * n - n / 2];

function base(kind: ParticleKind, cell: Cell, additive: boolean, p: V): Particle {
  return {
    kind,
    cell,
    additive,
    x: p[0],
    y: p[1],
    z: p[2],
    px: p[0],
    py: p[1],
    pz: p[2],
    vx: 0,
    vy: 0,
    vz: 0,
    size: 1,
    jitter: 0,
    angle: 0,
    spin: 0,
    r: 1,
    g: 1,
    b: 1,
    a: 1,
    phase: 0,
    grow: 1,
    decay: 0,
    dead: false,
  };
}

const FLASH_CELLS: readonly Cell[] = ['flash1', 'flash2', 'flash3', 'flash4'];
const FLAME_CELLS: readonly Cell[] = ['flame1', 'flame2', 'flame3', 'flame4'];
const pick = <T>(xs: readonly T[], rnd: Rnd): T => xs[Math.floor(rnd() * xs.length) % xs.length] as T;

/** `Flash`: a rotating burst that swells ×1.6 per tick past 12, then shrinks and darkens. Additive. */
export function flash(pos: V, size: number, rnd: Rnd): Particle {
  return {
    ...base('flash', pick(FLASH_CELLS, rnd), true, noisy(pos, 2, rnd)),
    size,
    spin: 0.01 * rnd() + 0.01,
    r: 1,
    g: 0.65,
    b: 0.3,
    a: 0.5,
  };
}

/** `Flame`: fades in while inflating ×1.3, then inflates ×1.075 while it burns out; drifts on a random, upward-biased expander. Additive. */
export function flame(pos: V, size: number, rnd: Rnd): Particle {
  const drift = 4;
  return {
    ...base('flame', pick(FLAME_CELLS, rnd), true, noisy(pos, 2, rnd)),
    size,
    spin: 0.01 * rnd() + 0.01,
    r: 0.8,
    g: 0.4,
    b: 0.005,
    a: 0,
    grow: 1.3,
    vx: (rnd() * 0.25 - 0.125) * drift,
    vy: rnd() * 0.25 * drift,
    vz: (rnd() * 0.25 - 0.125) * drift,
  };
}

/** `Flare`: a dot flying along `dir` at `vel`, fading and slowly growing. Alpha-blended. */
export function flare(pos: V, vel: number, dir: V, size: number, cell: Cell, rnd: Rnd): Particle {
  return {
    ...base('flare', cell, false, pos),
    size,
    vx: dir[0] * vel,
    vy: dir[1] * vel,
    vz: dir[2] * vel,
    r: 1,
    g: 0.9,
    b: 0.8,
    a: 1,
    decay: rnd() * 0.01 + 0.01,
  };
}

/** `Glint`: a red ember (the ship burning in the atmosphere). Additive. */
export function glint(pos: V, rnd: Rnd): Particle {
  const drift = 2.5;
  return {
    ...base('glint', 'roundSparks', true, noisy(pos, 2, rnd)),
    size: 2,
    grow: 1.13,
    r: 1,
    g: 0,
    b: 0,
    a: 0.25,
    vx: (rnd() * 0.25 - 0.125) * drift,
    vy: rnd() * 0.5 * drift,
    vz: (rnd() * 0.25 - 0.125) * drift,
  };
}

/** `noise(n)` on a direction, as the Java emitters do before normalising nothing: the caller passes it on as-is. */
export const noisyDir = (d: V, n: number, rnd: Rnd): V => noisy(d, n, rnd);

/** Advances one particle by one tick (mutates it; that's the hot loop). */
export function updateParticle(p: Particle, rnd: Rnd): void {
  p.px = p.x;
  p.py = p.y;
  p.pz = p.z;
  p.x += p.vx;
  p.y += p.vy;
  p.z += p.vz;
  p.angle = (p.angle + p.spin) % (Math.PI * 2);
  switch (p.kind) {
    case 'flash':
      updateFlash(p);
      return;
    case 'flame':
      updateFlame(p);
      return;
    case 'flare':
      p.r -= p.decay * 1.1;
      p.g -= p.decay * 1.2;
      p.b -= p.decay * 1.3;
      p.a -= p.decay;
      p.size += p.decay * 2;
      p.jitter = rnd() * 0.4 - 0.2;
      p.dead = p.a <= 0.05;
      return;
    case 'glint':
      if (p.phase === 0) {
        p.size *= p.grow;
        p.a += 0.05;
        if (p.a > 0.9) p.phase = 1;
      } else p.a -= 0.0025;
      p.dead = p.phase === 1 && p.a < 0.01;
      return;
  }
}

function updateFlash(p: Particle): void {
  if (p.phase === 0) {
    p.g *= 1.01;
    p.b *= 1.01;
    p.a *= 1.01;
    p.size *= 1.6;
    if (p.size > 12) {
      p.phase = 1;
      p.g -= 0.05;
      p.b -= 0.1;
    }
  } else {
    p.g *= 0.8;
    p.b *= 0.7;
    p.a *= 0.6;
    p.size *= 0.9;
  }
  // The original lives on until it shrinks under 0.1; by then α is far below one 8-bit step, so stop at that.
  p.dead = p.phase === 1 && (p.size < 0.1 || p.a < 1 / 512);
}

function updateFlame(p: Particle): void {
  p.size *= p.grow;
  if (p.phase === 0) {
    p.r += 0.01625;
    p.g += 0.015;
    p.b += 0.015;
    p.a += 0.075;
    if (p.a >= 0.95) {
      p.phase = 1;
      p.grow = 1.075;
    }
  } else {
    p.r -= 0.12;
    p.g -= 0.08;
    p.b -= 0.03;
    p.a -= 0.1;
  }
  p.dead = p.phase === 1 && p.a < 0.025;
}
