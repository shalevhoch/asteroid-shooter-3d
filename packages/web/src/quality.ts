/**
 * Render quality (P20): a device-pixel-ratio cap and a particle cap, picked per device and stepped down when the
 * measured frame rate stays low. Pure apart from the inputs passed in, so it's unit-tested.
 */
import { MAX_PARTICLES } from './fx/engine.js';

export interface QualityLevel {
  readonly name: 'high' | 'medium' | 'low';
  /** The renderer's pixel ratio is min(devicePixelRatio, dprCap). */
  readonly dprCap: number;
  /** Bloom post-processing (P30): on at high and medium, off at low. */
  readonly bloom: boolean;
  /** Live FX particles kept; the oldest go first past it. */
  readonly particleCap: number;
}

const HIGH: QualityLevel = { name: 'high', dprCap: 2, particleCap: MAX_PARTICLES, bloom: true };

export const QUALITY_LEVELS: readonly QualityLevel[] = [
  HIGH,
  { name: 'medium', dprCap: 1.5, particleCap: MAX_PARTICLES / 2, bloom: true },
  { name: 'low', dprCap: 1, particleCap: MAX_PARTICLES / 4, bloom: false },
];

/** Below this average fps over a window, quality steps down one level. */
export const LOW_FPS = 40;
/** Frame rate is measured over windows this long. */
export const WINDOW_MS = 2000;
/** No step down in the first moments after start (shader compiles, asset uploads). */
export const WARMUP_MS = 3000;
/** A frame longer than this (tab hidden, debugger, load hitch) is dropped and restarts the window. */
export const STALL_MS = 250;

export interface QualityChoice {
  readonly level: number;
  /** false when pinned by `?quality=`: never auto-steps. */
  readonly auto: boolean;
}

/** A level name from `?quality=`, or null. */
export function urlQuality(search: string): QualityLevel['name'] | null {
  const q = new URLSearchParams(search).get('quality');
  return QUALITY_LEVELS.find((l) => l.name === q)?.name ?? null;
}

/**
 * Starting level: `?quality=high|medium|low` pins it, then the settings choice (P23: a fixed level pins it too);
 * on auto, touch devices start at medium, the rest at high.
 */
export function initialQuality(search: string, touch: boolean, setting: 'auto' | QualityLevel['name'] = 'auto'): QualityChoice {
  const name = urlQuality(search) ?? (setting === 'auto' ? null : setting);
  const pinned = QUALITY_LEVELS.findIndex((l) => l.name === name);
  if (pinned >= 0) return { level: pinned, auto: false };
  return { level: touch ? 1 : 0, auto: true };
}

/**
 * Steps quality down, never up: when a full window averages under LOW_FPS. One-way, so it can't oscillate; a reload
 * starts over.
 */
export class QualityGovernor {
  level: number;
  private auto: boolean;
  private elapsed = 0;
  private windowMs = 0;
  private frames = 0;

  constructor(choice: QualityChoice) {
    this.level = choice.level;
    this.auto = choice.auto;
  }

  /** Starts over with a new choice (P23: the settings changed). */
  reset(choice: QualityChoice): QualityLevel {
    this.level = choice.level;
    this.auto = choice.auto;
    this.elapsed = this.windowMs = this.frames = 0;
    return this.current;
  }

  get current(): QualityLevel {
    return QUALITY_LEVELS[this.level] ?? HIGH;
  }

  /** Feed one frame's duration. Returns the new level when it changed, else null. */
  frame(dtMs: number): QualityLevel | null {
    if (!this.auto || this.level >= QUALITY_LEVELS.length - 1) return null;
    if (!Number.isFinite(dtMs) || dtMs <= 0 || dtMs > STALL_MS) {
      this.windowMs = this.frames = 0;
      return null;
    }
    this.elapsed += dtMs;
    if (this.elapsed < WARMUP_MS) return null;
    this.windowMs += dtMs;
    this.frames++;
    if (this.windowMs < WINDOW_MS) return null;
    const fps = (this.frames * 1000) / this.windowMs;
    this.windowMs = this.frames = 0;
    if (fps >= LOW_FPS) return null;
    this.level++;
    return this.current;
  }
}
