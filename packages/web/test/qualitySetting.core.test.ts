/** P23: the Graphics setting (auto / high / medium / low). */
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, changeSetting, parseSettings, settingRows } from '../src/settings.js';
import { QualityGovernor, initialQuality } from '../src/quality.js';

const NAMES = { kid: 'Kid', normal: 'Normal', hard: 'Hard' };

describe('Graphics setting', () => {
  it('defaults to auto, persists, and rejects junk', () => {
    expect(DEFAULT_SETTINGS.quality).toBe('auto');
    expect(parseSettings('{"quality":"low"}').quality).toBe('low');
    expect(parseSettings('{"quality":"ultra"}').quality).toBe('auto');
    expect(parseSettings('{"layout":"classic"}').quality).toBe('auto');
  });

  it('cycles auto → high → medium → low → auto', () => {
    const s = { ...DEFAULT_SETTINGS };
    const seen = [1, 2, 3, 4].map(() => (changeSetting(s, 'quality'), s.quality));
    expect(seen).toEqual(['high', 'medium', 'low', 'auto']);
  });

  it('the row shows the live level beside auto, and a URL override', () => {
    const row = (live?: string, pinned = false, q: 'auto' | 'low' = 'auto') => settingRows({ ...DEFAULT_SETTINGS, quality: q }, NAMES, false, live, pinned).find((r) => r.id === 'quality');
    expect(row('medium')?.value).toBe('auto · medium');
    expect(row('high', false, 'low')?.value).toBe('low');
    expect(row('high', true)?.note).toBe('set by URL');
  });

  it('a fixed level pins the governor; auto restores the step-down; ?quality= beats the setting', () => {
    expect(initialQuality('', false, 'low')).toEqual({ level: 2, auto: false });
    expect(initialQuality('', true, 'auto')).toEqual({ level: 1, auto: true });
    expect(initialQuality('?quality=high', true, 'low')).toEqual({ level: 0, auto: false });
    const g = new QualityGovernor(initialQuality('', false, 'medium'));
    for (let i = 0; i < 500; i++) g.frame(100);
    expect(g.current.name).toBe('medium');
    expect(g.reset(initialQuality('', false, 'auto')).name).toBe('high');
  });
});
