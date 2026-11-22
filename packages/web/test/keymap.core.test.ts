/** P04 keymaps: the two layouts, the input composition and the mouse buffer. Pure. */
import { describe, expect, it } from 'vitest';
import {
  ACTION_LABELS,
  EDGE_ACTIONS,
  KEYMAPS,
  LAYOUTS,
  MOUSE_BUFFER_TICKS,
  MOUSE_PX_PER_TICK,
  actionFor,
  bindings,
  consumeMouse,
  keyLabel,
  toInput,
  type Action,
  type TickControls,
} from '../src/keymap.js';

const controls = (over: Partial<TickControls> = {}): TickControls => ({ held: new Set(), throttleSteps: 0, mouseX: 0, mouseY: 0, invertY: false, ...over });
const FLIGHT: Action[] = ['pitchUp', 'pitchDown', 'yawLeft', 'yawRight', 'rollLeft', 'rollRight', 'throttleUp', 'throttleDown', 'turbo', 'strafeLeft', 'strafeRight', 'strafeUp', 'strafeDown', 'reverse', 'firePhoton', 'fireRocket'];

describe('keymaps', () => {
  it.each(LAYOUTS)('%s binds every flight action and a layout toggle and help', (layout) => {
    const bound = new Set(Object.values(KEYMAPS[layout]));
    for (const a of [...FLIGHT, 'toggleLayout', 'toggleHelp'] as Action[]) expect(bound, `${layout} lacks ${a}`).toContain(a);
  });

  it('modern is mouse-aim WASD; classic is the original keys', () => {
    expect(actionFor('modern', 'KeyW')).toBe('throttleUp');
    expect(actionFor('modern', 'ShiftLeft')).toBe('turbo');
    expect(actionFor('modern', 'Mouse0')).toBe('firePhoton');
    expect(actionFor('modern', 'Mouse2')).toBe('fireRocket');
    expect(actionFor('classic', 'KeyW')).toBe('turbo');
    expect(actionFor('classic', 'KeyI')).toBe('pitchUp');
    expect(actionFor('classic', 'KeyL')).toBe('yawRight');
    expect(actionFor('classic', 'KeyO')).toBe('rollRight');
    expect(actionFor('classic', 'Digit0')).toBe('throttleUp');
    expect(actionFor('classic', 'KeyR')).toBe('fireRocket');
    expect(actionFor('classic', 'KeyT')).toBe('toggleLayout');
  });

  it('ignores unknown codes and inherited object keys', () => {
    expect(actionFor('modern', 'KeyZ')).toBeUndefined();
    expect(actionFor('modern', 'toString')).toBeUndefined();
    expect(actionFor('classic', '__proto__')).toBeUndefined();
  });

  it('labels every action and groups keys by action', () => {
    for (const layout of LAYOUTS) for (const [action, codes] of bindings(layout)) {
      expect(ACTION_LABELS[action]).toBeTruthy();
      expect(codes.length).toBeGreaterThan(0);
    }
    expect(bindings('modern').find(([a]) => a === 'turbo')?.[1]).toEqual(['ShiftLeft', 'ShiftRight']);
    expect(EDGE_ACTIONS.has('throttleUp')).toBe(true);
    expect(EDGE_ACTIONS.has('turbo')).toBe(false);
  });

  it('labels keys briefly', () => {
    expect(keyLabel('KeyW')).toBe('W');
    expect(keyLabel('Digit9')).toBe('9');
    expect(keyLabel('ArrowLeft')).toBe('←');
    expect(keyLabel('Mouse0')).toBe('LMB');
    expect(keyLabel('F1')).toBe('F1');
  });
});

describe('toInput', () => {
  it('maps held actions to axes, cancelling opposites', () => {
    const i = toInput(controls({ held: new Set<Action>(['pitchUp', 'yawLeft', 'rollRight', 'rollLeft', 'strafeRight', 'strafeDown', 'turbo', 'reverse']) }));
    expect(i).toEqual({ pitch: 1, yaw: -1, roll: 0, throttle: 0, turbo: true, strafeX: 1, strafeY: -1, reverse: true });
  });

  it('adds the mouse to the keys and clamps', () => {
    expect(toInput(controls({ mouseX: 0.5 })).yaw).toBe(0.5);
    expect(toInput(controls({ held: new Set<Action>(['yawRight']), mouseX: 0.5 })).yaw).toBe(1);
    // Mouse up (negative screen y) is nose up, unless inverted.
    expect(toInput(controls({ mouseY: -0.25 })).pitch).toBe(0.25);
    expect(toInput(controls({ mouseY: -0.25, invertY: true })).pitch).toBe(-0.25);
  });

  it('applies one throttle step per tick, in the pressed direction', () => {
    expect(toInput(controls({ throttleSteps: 3 })).throttle).toBe(1);
    expect(toInput(controls({ throttleSteps: -2 })).throttle).toBe(-1);
    expect(toInput(controls()).throttle).toBe(0);
  });
});

describe('consumeMouse', () => {
  it('turns a small movement into a partial axis and empties the buffer', () => {
    expect(consumeMouse(MOUSE_PX_PER_TICK / 2)).toEqual({ axis: 0.5, bufferPx: 0 });
  });

  it('spreads a flick over several ticks at full rate', () => {
    let buf = MOUSE_PX_PER_TICK * 2.5;
    const axes: number[] = [];
    for (let t = 0; t < 4; t++) {
      const r = consumeMouse(buf);
      axes.push(r.axis);
      buf = r.bufferPx;
    }
    expect(axes).toEqual([1, 1, 0.5, 0]);
  });

  it('drops movement beyond the buffer cap, and garbage', () => {
    const r = consumeMouse(-MOUSE_PX_PER_TICK * 100);
    expect(r.axis).toBe(-1);
    expect(r.bufferPx).toBe(-MOUSE_PX_PER_TICK * (MOUSE_BUFFER_TICKS - 1));
    expect(consumeMouse(NaN)).toEqual({ axis: 0, bufferPx: 0 });
  });
});
