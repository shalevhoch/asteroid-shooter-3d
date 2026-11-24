import { describe, expect, it } from 'vitest';
import { HE, LANGS, bannerTitle, isRtl, placeholders, t } from '../src/i18n.js';
import { TUTORIAL_STEPS, tutorialHint } from '../src/tutorial.js';
import { DEFAULT_SETTINGS, changeSetting, parseSettings, settingRows } from '../src/settings.js';
import { UPGRADE_IDS } from '@asteroid/sim';
import { UPGRADE_LABELS } from '../src/shop.js';

describe('Hebrew and English UI text (P36)', () => {
  it('every Hebrew entry keeps exactly the English placeholders', () => {
    for (const [en, he] of Object.entries(HE)) expect(placeholders(he), en).toEqual(placeholders(en));
  });
  it('t fills placeholders and falls back to English', () => {
    expect(t('en', 'best {best}', { best: 7 })).toBe('best 7');
    expect(t('he', 'best {best}', { best: 7 })).toBe('שיא 7');
    expect(t('he', 'no such line {x}', { x: 1 })).toBe('no such line 1');
  });
  it('Hebrew is right to left, English is not', () => {
    expect(LANGS).toEqual(['en', 'he']);
    expect(isRtl('he')).toBe(true);
    expect(isRtl('en')).toBe(false);
  });
  it('wave banner titles translate with their numbers', () => {
    expect(bannerTitle('en', 'Wave 3 of 10')).toBe('Wave 3 of 10');
    expect(bannerTitle('he', 'Wave 3 of 10')).toContain('3');
    expect(bannerTitle('he', 'Wave 3 of 10')).not.toContain('Wave');
  });
  it('tutorial hints, shop lines and setting labels all have Hebrew', () => {
    const keys = [
      ...TUTORIAL_STEPS.flatMap((s) => [tutorialHint(s, false), tutorialHint(s, true)]),
      ...UPGRADE_IDS.flatMap((id) => [UPGRADE_LABELS[id].name, UPGRADE_LABELS[id].blurb]),
      ...settingRows(DEFAULT_SETTINGS, { kid: 'Kid / Easy', normal: 'Normal', hard: 'Hard' }, false).map((r) => r.label),
    ];
    for (const k of keys) expect(HE[k], k).toBeDefined();
  });
  it('the language setting parses and cycles', () => {
    expect(DEFAULT_SETTINGS.lang).toBe('en');
    expect(parseSettings(JSON.stringify({ lang: 'he' })).lang).toBe('he');
    expect(parseSettings(JSON.stringify({ lang: 'xx' })).lang).toBe('en');
    const s = { ...DEFAULT_SETTINGS };
    changeSetting(s, 'lang');
    expect(s.lang).toBe('he');
    changeSetting(s, 'lang');
    expect(s.lang).toBe('en');
  });
});
