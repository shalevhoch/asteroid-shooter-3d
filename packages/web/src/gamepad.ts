/**
 * Gamepad support (P19), the pure part: the W3C "standard" mapping (Xbox / PlayStation layout) → sim input.
 * `GamepadInput` polls `navigator.getGamepads()` once a frame; everything here works on plain snapshots, so it's tested.
 */
import type { Input } from '@asteroid/sim';

/** Standard-mapping button indices. */
export const PAD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, BACK: 8, START: 9, UP: 12, DOWN: 13 } as const;
/** Radial stick dead zone. */
export const STICK_DEADZONE = 0.15;
/** A trigger or the right stick counts as pressed past this. */
export const PRESS_THRESHOLD = 0.5;

export interface PadSnapshot {
  readonly axes: readonly number[];
  readonly buttons: readonly { readonly pressed: boolean; readonly value: number }[];
}

const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
const finite = (v: number | undefined) => (v !== undefined && Number.isFinite(v) ? v : 0);

/** A stick with a radial dead zone, rescaled so just past it is ~0 and the rim is 1. `y` +1 = stick pushed up. */
export function stick(x: number, y: number, deadzone = STICK_DEADZONE): { x: number; y: number } {
  const fx = finite(x);
  const fy = -finite(y);
  const m = Math.min(1, Math.hypot(fx, fy));
  if (m <= deadzone) return { x: 0, y: 0 };
  const k = (m - deadzone) / (1 - deadzone) / Math.hypot(fx, fy);
  return { x: clamp1(fx * k) + 0, y: clamp1(fy * k) + 0 };
}

const down = (p: PadSnapshot, i: number): boolean => {
  const b = p.buttons[i];
  return b ? b.pressed || b.value > PRESS_THRESHOLD : false;
};

/** What the pad holds this tick. */
export interface PadHeld {
  readonly pitch: number;
  readonly yaw: number;
  readonly roll: number;
  readonly strafeX: number;
  readonly strafeY: number;
  readonly turbo: boolean;
  readonly reverse: boolean;
  readonly fire: boolean;
}

export const NO_PAD: PadHeld = { pitch: 0, yaw: 0, roll: 0, strafeX: 0, strafeY: 0, turbo: false, reverse: false, fire: false };

/**
 * Held controls: left stick aims (up = nose up unless `invertY`), right stick strafes, bumpers roll, RT fires photons,
 * LT is turbo and B is reverse.
 */
export function held(p: PadSnapshot, invertY: boolean): PadHeld {
  const l = stick(finite(p.axes[0]), finite(p.axes[1]));
  const rx = finite(p.axes[2]);
  const ry = -finite(p.axes[3]);
  const digital = (v: number) => (v > PRESS_THRESHOLD ? 1 : v < -PRESS_THRESHOLD ? -1 : 0);
  return {
    pitch: invertY ? -l.y : l.y,
    yaw: l.x,
    roll: (down(p, PAD.RB) ? 1 : 0) - (down(p, PAD.LB) ? 1 : 0),
    strafeX: digital(rx),
    strafeY: digital(ry),
    turbo: down(p, PAD.LT),
    reverse: down(p, PAD.B),
    fire: down(p, PAD.RT),
  };
}

export type PadPress = 'rocket' | 'throttleUp' | 'throttleDown' | 'start' | 'camera';

/** Buttons that act once per press: A rocket, Y or d-pad up throttle +, X or d-pad down throttle −, Start, Back (camera). */
const PRESSES: readonly (readonly [number, PadPress])[] = [
  [PAD.A, 'rocket'],
  [PAD.Y, 'throttleUp'],
  [PAD.UP, 'throttleUp'],
  [PAD.X, 'throttleDown'],
  [PAD.DOWN, 'throttleDown'],
  [PAD.START, 'start'],
  [PAD.BACK, 'camera'],
];

/** Presses since the last snapshot: buttons down now and up before. Returns them and the new "was down" set. */
export function presses(p: PadSnapshot, wasDown: ReadonlySet<number>): { presses: PadPress[]; down: Set<number> } {
  const now = new Set<number>();
  const out: PadPress[] = [];
  for (const [i, what] of PRESSES) {
    if (!down(p, i)) continue;
    now.add(i);
    if (!wasDown.has(i)) out.push(what);
  }
  return { presses: out, down: now };
}

/** Adds the pad to the keyboard/mouse/touch input: axes add and clamp, buttons OR in, digital axes fill in when 0. */
export function mergePad(base: Input, h: PadHeld, sensitivity: number): Input {
  return {
    ...base,
    pitch: clamp1(base.pitch + h.pitch * sensitivity),
    yaw: clamp1(base.yaw + h.yaw * sensitivity),
    roll: base.roll !== 0 ? base.roll : h.roll,
    strafeX: base.strafeX !== 0 ? base.strafeX : h.strafeX,
    strafeY: base.strafeY !== 0 ? base.strafeY : h.strafeY,
    turbo: base.turbo || h.turbo,
    reverse: base.reverse || h.reverse,
    firePhoton: base.firePhoton || h.fire,
  };
}

/** Polls the first standard-mapped pad. One `poll()` per frame; `nextHeld()` per tick. */
export class GamepadInput {
  private wasDown = new Set<number>();
  private last: PadHeld = NO_PAD;
  connected = false;

  poll(invertY: boolean): PadPress[] {
    const pads = typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function' ? [...navigator.getGamepads()] : [];
    const pad = pads.find((g) => g?.connected && g.mapping === 'standard') ?? pads.find((g) => g?.connected) ?? null;
    this.connected = pad !== null;
    if (!pad) {
      this.last = NO_PAD;
      this.wasDown.clear();
      return [];
    }
    this.last = held(pad, invertY);
    const r = presses(pad, this.wasDown);
    this.wasDown = r.down;
    return r.presses;
  }

  nextHeld(): PadHeld {
    return this.last;
  }
}
