/** DOM binding for the keymap (P04): keyboard, pointer-lock mouse, wheel. Produces one sim Input per tick. */
import type { Input } from '@asteroid/sim';
import { EDGE_ACTIONS, MOUSE_LEFT, MOUSE_RIGHT, actionFor, MOUSE_PX_PER_TICK, consumeMouse, toInput, type Action, type Layout } from './keymap.js';

export interface ControlSettings {
  layout: Layout;
  invertY: boolean;
  /** Mouse sensitivity multiplier (P13); 1 is `MOUSE_PX_PER_TICK` px per full-rate tick. */
  sensitivity: number;
}

export class Controls {
  private readonly heldCodes = new Set<string>();
  private throttleSteps = 0;
  private rocketPresses = 0;
  private mouseXPx = 0;
  private mouseYPx = 0;
  private readonly toggles: Action[] = [];

  constructor(
    private readonly canvas: HTMLElement,
    private readonly settings: ControlSettings,
  ) {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') return;
      const action = actionFor(this.settings.layout, e.code);
      if (!action) return;
      e.preventDefault();
      if (EDGE_ACTIONS.has(action)) {
        if (!e.repeat) this.press(action);
      } else this.heldCodes.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.heldCodes.delete(e.code));
    window.addEventListener('blur', () => {
      this.heldCodes.clear();
    });
    canvas.addEventListener('mousedown', (e) => {
      if (!this.locked) {
        Promise.resolve(canvas.requestPointerLock()).catch(() => undefined);
        return;
      }
      const code = e.button === 0 ? MOUSE_LEFT : e.button === 2 ? MOUSE_RIGHT : undefined;
      const action = code && actionFor(this.settings.layout, code);
      if (!code || !action) return;
      if (EDGE_ACTIONS.has(action)) this.press(action);
      else this.heldCodes.add(code);
    });
    window.addEventListener('mouseup', (e) => this.heldCodes.delete(e.button === 0 ? MOUSE_LEFT : MOUSE_RIGHT));
    canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.locked) return;
      this.mouseXPx += e.movementX;
      this.mouseYPx += e.movementY;
    });
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        if (e.deltaY !== 0) this.throttleSteps += e.deltaY < 0 ? 1 : -1;
      },
      { passive: false },
    );
  }

  get locked(): boolean {
    return document.pointerLockElement === this.canvas;
  }

  private press(action: Action): void {
    if (action === 'throttleUp') this.throttleSteps += 1;
    else if (action === 'throttleDown') this.throttleSteps -= 1;
    else if (action === 'fireRocket') this.rocketPresses = Math.min(this.rocketPresses + 1, 3);
    else this.toggles.push(action);
  }

  /** Drops queued presses and mouse movement, e.g. when a run starts or resumes. */
  reset(): void {
    this.throttleSteps = 0;
    this.rocketPresses = 0;
    this.mouseXPx = 0;
    this.mouseYPx = 0;
    this.heldCodes.clear();
  }

  /** UI toggles pressed since the last call (camera, layout, invert-Y, help). */
  takeToggles(): Action[] {
    return this.toggles.splice(0);
  }

  /** The sim input for the next tick; consumes one throttle step and one tick of mouse movement. */
  nextInput(): Input {
    const held = new Set<Action>();
    for (const code of this.heldCodes) {
      const a = actionFor(this.settings.layout, code);
      if (a) held.add(a);
    }
    const px = MOUSE_PX_PER_TICK / this.settings.sensitivity;
    const mx = consumeMouse(this.mouseXPx, px);
    const my = consumeMouse(this.mouseYPx, px);
    this.mouseXPx = mx.bufferPx;
    this.mouseYPx = my.bufferPx;
    const input = toInput({ held, throttleSteps: this.throttleSteps, rocketPresses: this.rocketPresses, mouseX: mx.axis, mouseY: my.axis, invertY: this.settings.invertY });
    this.throttleSteps -= input.throttle;
    if (input.fireRocket) this.rocketPresses--;
    return input;
  }
}
