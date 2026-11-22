/**
 * Touch controls (P15), the pure part: the virtual stick, the throttle slider and how a touch frame becomes sim input.
 * `touchControls.ts` binds them to the DOM.
 */
import { THROTTLE_MAX, type Input } from '@asteroid/sim';

/** Stick radius in CSS px: a full deflection is a full-rate turn. */
export const STICK_RADIUS = 64;
/** Deflection under this fraction of the radius is ignored. */
export const STICK_DEADZONE = 0.12;

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));

/**
 * Stick axes from the finger's offset from where it went down (screen px, +y down): `x` +1 = right, `y` +1 = up.
 * The deflection is clamped to the radius, and the dead zone is cut out and the rest rescaled, so output is 0 to 1
 * along the direction.
 */
export function stickAxes(dx: number, dy: number, radius = STICK_RADIUS, deadzone = STICK_DEADZONE): { x: number; y: number } {
  const d = Math.hypot(dx, dy);
  if (!Number.isFinite(d) || radius <= 0) return { x: 0, y: 0 };
  const m = Math.min(d / radius, 1);
  if (m <= deadzone) return { x: 0, y: 0 };
  const k = (m - deadzone) / (1 - deadzone) / d;
  return { x: clamp1(dx * k) + 0, y: clamp1(-dy * k) + 0 };
}

/** The throttle level for a finger at `frac` of the slider's height (0 = bottom, 1 = top): 0..THROTTLE_MAX, nearest. */
export function sliderLevel(frac: number): number {
  if (!Number.isFinite(frac)) return 0;
  return Math.round(Math.max(0, Math.min(1, frac)) * THROTTLE_MAX);
}

/** One tick's touch state. */
export interface TouchFrame {
  readonly stickX: number;
  readonly stickY: number;
  /** The slider's level, or null if the slider hasn't been touched since the run started. */
  readonly throttleTarget: number | null;
  readonly fire: boolean;
  readonly turbo: boolean;
  /** Rocket taps to spend this tick (at most one fires). */
  readonly rocketTaps: number;
}

export const NO_TOUCH: TouchFrame = { stickX: 0, stickY: 0, throttleTarget: null, fire: false, turbo: false, rocketTaps: 0 };

/**
 * Adds a touch frame to the keyboard/mouse input: the stick adds to pitch and yaw (scaled by sensitivity, clamped),
 * the slider steps the throttle one level per tick toward its target, and the buttons OR in.
 */
export function mergeTouch(base: Input, t: TouchFrame, shipThrottle: number, opts: { invertY: boolean; sensitivity: number }): Input {
  const pitch = (opts.invertY ? -t.stickY : t.stickY) * opts.sensitivity;
  const yaw = t.stickX * opts.sensitivity;
  const throttle = base.throttle !== 0 || t.throttleTarget === null ? base.throttle : Math.sign(t.throttleTarget - shipThrottle);
  return {
    ...base,
    pitch: clamp1(base.pitch + pitch),
    yaw: clamp1(base.yaw + yaw),
    throttle,
    turbo: base.turbo || t.turbo,
    firePhoton: base.firePhoton || t.fire,
    fireRocket: base.fireRocket || t.rocketTaps > 0,
  };
}

/** Whether this device should get touch controls: a coarse primary pointer with touch points, or `?touch` in the URL. */
export function wantsTouch(env: { coarse: boolean; maxTouchPoints: number; search: string }): boolean {
  const q = new URLSearchParams(env.search);
  if (q.has('touch')) return q.get('touch') !== '0';
  return env.coarse && env.maxTouchPoints > 0;
}
