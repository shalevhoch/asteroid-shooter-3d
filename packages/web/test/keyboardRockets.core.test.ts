/** P27: rockets from the keyboard in both layouts, so 100 % keyboard play works; perk chime cue. */
import { describe, expect, it } from 'vitest';
import { KEYMAPS, LAYOUTS, actionFor, bindings, type Action } from '../src/keymap.js';
import { cuesFor } from '../src/audio.js';

const FLIGHT: Action[] = ['pitchUp', 'pitchDown', 'yawLeft', 'yawRight', 'rollLeft', 'rollRight', 'throttleUp', 'throttleDown', 'turbo', 'strafeLeft', 'strafeRight', 'strafeUp', 'strafeDown', 'reverse', 'firePhoton', 'fireRocket'];

describe('keyboard rockets', () => {
  it.each(LAYOUTS)('%s: V launches a rocket', (l) => {
    expect(actionFor(l, 'KeyV')).toBe('fireRocket');
  });

  it.each(LAYOUTS)('%s: every flight action has a keyboard key (no mouse needed)', (l) => {
    const keys = new Set(Object.entries(KEYMAPS[l]).filter(([code]) => !code.startsWith('Mouse')).map(([, a]) => a));
    for (const a of FLIGHT) expect(keys, `${l} ${a}`).toContain(a);
  });

  it('the controls list shows V for rockets', () => {
    expect(bindings('modern').find(([a]) => a === 'fireRocket')?.[1]).toContain('KeyV');
  });

  it('collecting a perk plays the chime', () => {
    expect(cuesFor([{ type: 'perkCollected', id: 1, kind: 'shield', pos: [0, 0, 0] }])).toEqual([{ sound: 'chime', volume: 0.5 }]);
  });
});
