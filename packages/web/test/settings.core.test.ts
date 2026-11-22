/** P13 settings: new fields parse and clamp, the panel rows, changing a setting. */
import { describe, expect, it } from 'vitest';
import { consumeMouse, MOUSE_PX_PER_TICK } from '../src/keymap.js';
import { DEFAULT_SETTINGS, SENSITIVITY_MAX, SENSITIVITY_MIN, SETTING_IDS, changeSetting, clampStep, parseSettings, settingRows } from '../src/settings.js';

const NAMES = { kid: 'Kid', normal: 'Normal', hard: 'Hard' } as const;

describe('settings (P13)', () => {
  it('sensitivity and volume default to 1 and survive a reload', () => {
    expect([DEFAULT_SETTINGS.sensitivity, DEFAULT_SETTINGS.volume]).toEqual([1, 1]);
    const s = parseSettings(null);
    changeSetting(s, 'sensitivity', 1);
    changeSetting(s, 'volume', -1);
    changeSetting(s, 'layout');
    changeSetting(s, 'shake');
    const back = parseSettings(JSON.stringify(s));
    expect(back).toEqual(s);
    expect([back.sensitivity, back.volume, back.layout, back.shake]).toEqual([1.25, 0.9, 'classic', false]);
  });

  it('stored values are clamped and snapped; junk falls back', () => {
    expect(parseSettings('{"sensitivity":99,"volume":-3}')).toMatchObject({ sensitivity: SENSITIVITY_MAX, volume: 0 });
    expect(parseSettings('{"sensitivity":0.6,"volume":0.333}')).toMatchObject({ sensitivity: 0.5, volume: 0.3 });
    expect(parseSettings('{"sensitivity":"fast","volume":null}')).toMatchObject({ sensitivity: 1, volume: 1 });
  });

  it('ranges stop at their ends', () => {
    const s = parseSettings(null);
    for (let i = 0; i < 40; i++) changeSetting(s, 'sensitivity', -1);
    for (let i = 0; i < 40; i++) changeSetting(s, 'volume', 1);
    expect([s.sensitivity, s.volume]).toEqual([SENSITIVITY_MIN, 1]);
    expect(clampStep(0.30000000000000004, 0, 1, 0.1)).toBe(0.3);
  });

  it('toggles flip or cycle', () => {
    const s = parseSettings(null);
    changeSetting(s, 'invertY');
    changeSetting(s, 'muted');
    changeSetting(s, 'help');
    changeSetting(s, 'camera');
    changeSetting(s, 'difficulty');
    expect(s).toMatchObject({ invertY: true, muted: true, help: true, camera: 'classic', difficulty: 'hard' });
  });

  it('the panel lists every setting once, and marks difficulty as next-run mid-run', () => {
    const rows = settingRows(DEFAULT_SETTINGS, NAMES, false);
    expect(rows.map((r) => r.id)).toEqual([...SETTING_IDS]);
    expect(rows.find((r) => r.id === 'difficulty')?.note).toBeUndefined();
    expect(settingRows(DEFAULT_SETTINGS, NAMES, true).find((r) => r.id === 'difficulty')?.note).toBe('next run');
    expect(rows.find((r) => r.id === 'volume')?.value).toBe('100%');
  });

  it('sensitivity scales mouse aim: ×2 turns at full rate with half the movement', () => {
    expect(consumeMouse(MOUSE_PX_PER_TICK / 2, MOUSE_PX_PER_TICK / 2).axis).toBe(1);
    expect(consumeMouse(MOUSE_PX_PER_TICK / 2).axis).toBe(0.5);
  });
});
