/**
 * Keymaps (P04): two layouts as data, plus the pure function that turns held actions and mouse movement into the
 * sim's per-tick {@link Input}. The DOM binding lives in `controls.ts`.
 */
import type { Input } from '@asteroid/sim';

export type Action =
  | 'pitchUp'
  | 'pitchDown'
  | 'yawLeft'
  | 'yawRight'
  | 'rollLeft'
  | 'rollRight'
  | 'throttleUp'
  | 'throttleDown'
  | 'turbo'
  | 'strafeLeft'
  | 'strafeRight'
  | 'strafeUp'
  | 'strafeDown'
  | 'reverse'
  | 'firePhoton'
  | 'fireRocket'
  | 'toggleCamera'
  | 'toggleLayout'
  | 'toggleInvertY'
  | 'toggleHelp'
  | 'toggleMute';

export type Layout = 'modern' | 'classic';
export const LAYOUTS: readonly Layout[] = ['modern', 'classic'];

/** Mouse buttons as pseudo key codes, so one table covers both. */
export const MOUSE_LEFT = 'Mouse0';
export const MOUSE_RIGHT = 'Mouse2';

/** Shared by both layouts: view and UI toggles. */
const COMMON: Readonly<Record<string, Action>> = {
  KeyC: 'toggleCamera',
  KeyL: 'toggleLayout',
  KeyY: 'toggleInvertY',
  KeyH: 'toggleHelp',
  F1: 'toggleHelp',
  KeyM: 'toggleMute',
};

/** `KeyboardEvent.code` (layout-independent physical keys) → action. */
export const KEYMAPS: Readonly<Record<Layout, Readonly<Record<string, Action>>>> = {
  // Mouse aim, WASD, as in most modern space shooters. Arrows are a keyboard-only fallback for aiming.
  modern: {
    ...COMMON,
    KeyW: 'throttleUp',
    KeyS: 'throttleDown',
    KeyA: 'strafeLeft',
    KeyD: 'strafeRight',
    KeyR: 'strafeUp',
    KeyF: 'strafeDown',
    KeyQ: 'rollLeft',
    KeyE: 'rollRight',
    KeyX: 'reverse',
    ShiftLeft: 'turbo',
    ShiftRight: 'turbo',
    ArrowUp: 'pitchUp',
    ArrowDown: 'pitchDown',
    ArrowLeft: 'yawLeft',
    ArrowRight: 'yawRight',
    Space: 'firePhoton',
    [MOUSE_LEFT]: 'firePhoton',
    [MOUSE_RIGHT]: 'fireRocket',
    // P27: a rocket key, so the modern layout plays fully from the keyboard (arrows aim).
    KeyV: 'fireRocket',
  },
  // The original's keys (MultiKeysAdapter + Game.java): IJKL look, U/O roll, W turbo, S back, A/D/E/Q strafe, 0/9 throttle.
  classic: {
    ...COMMON,
    KeyI: 'pitchUp',
    KeyK: 'pitchDown',
    KeyJ: 'yawLeft',
    KeyL: 'yawRight',
    KeyU: 'rollLeft',
    KeyO: 'rollRight',
    KeyW: 'turbo',
    KeyS: 'reverse',
    KeyA: 'strafeLeft',
    KeyD: 'strafeRight',
    KeyE: 'strafeUp',
    KeyQ: 'strafeDown',
    Digit0: 'throttleUp',
    Digit9: 'throttleDown',
    Space: 'firePhoton',
    KeyR: 'fireRocket',
    KeyV: 'fireRocket',
    KeyT: 'toggleLayout',
  },
};

/** Actions that fire once per press (not held). */
export const EDGE_ACTIONS: ReadonlySet<Action> = new Set<Action>(['throttleUp', 'throttleDown', 'fireRocket', 'toggleCamera', 'toggleLayout', 'toggleInvertY', 'toggleHelp', 'toggleMute']);

/** Human labels for the help overlay. */
export const ACTION_LABELS: Readonly<Record<Action, string>> = {
  pitchUp: 'pitch up',
  pitchDown: 'pitch down',
  yawLeft: 'yaw left',
  yawRight: 'yaw right',
  rollLeft: 'roll left',
  rollRight: 'roll right',
  throttleUp: 'throttle +',
  throttleDown: 'throttle −',
  turbo: 'turbo (hold)',
  strafeLeft: 'strafe left',
  strafeRight: 'strafe right',
  strafeUp: 'strafe up',
  strafeDown: 'strafe down',
  reverse: 'reverse (hold)',
  firePhoton: 'photons (hold)',
  fireRocket: 'homing rocket (locks the asteroid nearest the crosshair)',
  toggleCamera: 'camera: chase / classic',
  toggleLayout: 'layout: modern / classic',
  toggleInvertY: 'invert mouse Y',
  toggleHelp: 'this help',
  toggleMute: 'sound on / off',
};

/** The action a key code triggers in a layout, if any. In classic, L is yaw right, so T toggles the layout. */
export function actionFor(layout: Layout, code: string): Action | undefined {
  const map = KEYMAPS[layout];
  return Object.hasOwn(map, code) ? map[code] : undefined;
}

/** Keys grouped by action, for the help overlay: `[action, codes[]]` in the table's order. */
export function bindings(layout: Layout): [Action, string[]][] {
  const out = new Map<Action, string[]>();
  for (const [code, action] of Object.entries(KEYMAPS[layout])) out.set(action, [...(out.get(action) ?? []), code]);
  return [...out.entries()];
}

/** Pixels of mouse movement that make one tick of full-rate turn (axis = 1). */
export const MOUSE_PX_PER_TICK = 6;
/** The mouse buffer holds at most this many ticks of full-rate turn, so a big flick doesn't keep turning for long. */
export const MOUSE_BUFFER_TICKS = 4;

/**
 * Takes one tick's worth of turn out of the accumulated mouse movement (pixels). A flick faster than the max turn
 * rate spreads over the next ticks instead of being lost; anything past {@link MOUSE_BUFFER_TICKS} is dropped.
 */
export function consumeMouse(bufferPx: number, pxPerTick = MOUSE_PX_PER_TICK): { axis: number; bufferPx: number } {
  if (!Number.isFinite(bufferPx)) return { axis: 0, bufferPx: 0 };
  const cap = pxPerTick * MOUSE_BUFFER_TICKS;
  const buf = Math.max(-cap, Math.min(cap, bufferPx));
  const used = Math.max(-pxPerTick, Math.min(pxPerTick, buf));
  return { axis: used / pxPerTick, bufferPx: buf - used };
}

export interface TickControls {
  /** Held actions this tick. */
  readonly held: ReadonlySet<Action>;
  /** Net throttle presses since the last tick (each tick applies at most one; the rest wait). */
  readonly throttleSteps: number;
  /** Rocket presses not yet sent (one rocket per tick). */
  readonly rocketPresses: number;
  /** Mouse-derived axes in [−1, 1]: x = right, y = down (screen convention). */
  readonly mouseX: number;
  readonly mouseY: number;
  readonly invertY: boolean;
}

const both = (held: ReadonlySet<Action>, plus: Action, minus: Action): number => (held.has(plus) ? 1 : 0) - (held.has(minus) ? 1 : 0);
const clamp1 = (v: number): number => Math.max(-1, Math.min(1, v));

/** The sim input for one tick. Mouse up means nose up unless Y is inverted. */
export function toInput(c: TickControls): Input {
  const { held } = c;
  const mousePitch = c.invertY ? c.mouseY : -c.mouseY;
  return {
    pitch: clamp1(both(held, 'pitchUp', 'pitchDown') + mousePitch),
    yaw: clamp1(both(held, 'yawRight', 'yawLeft') + c.mouseX),
    roll: both(held, 'rollRight', 'rollLeft'),
    throttle: Math.sign(c.throttleSteps),
    turbo: held.has('turbo'),
    strafeX: both(held, 'strafeRight', 'strafeLeft'),
    strafeY: both(held, 'strafeUp', 'strafeDown'),
    reverse: held.has('reverse'),
    firePhoton: held.has('firePhoton'),
    fireRocket: c.rocketPresses > 0,
    rocketHeld: held.has('fireRocket'),
  };
}

const KEY_LABELS: Readonly<Record<string, string>> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
  Space: 'Space',
  [MOUSE_LEFT]: 'LMB',
  [MOUSE_RIGHT]: 'RMB',
};

/** A short label for a key code: `KeyW` → `W`, `Digit0` → `0`, `ArrowUp` → `↑`. */
export function keyLabel(code: string): string {
  return Object.hasOwn(KEY_LABELS, code) ? (KEY_LABELS[code] ?? code) : code.replace(/^(Key|Digit)/, '');
}
