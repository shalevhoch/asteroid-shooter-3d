/** P29 station shop: the saved wallet, the shop panel and the HUD credits line. */
import { describe, expect, it } from 'vitest';
import { NO_UPGRADES, buyUpgrade, initialState } from '@asteroid/sim';
import { parseWallet, runOptions, shopPanel, upgradeForKey, withRun } from '../src/shop.js';
import { hudModel } from '../src/hud.js';

describe('station shop', () => {
  it('a missing or broken wallet is empty; a stored one reads back per ship', () => {
    expect(parseWallet(null)).toEqual({ credits: 0, upgrades: { fighter: NO_UPGRADES, interceptor: NO_UPGRADES, shuttle: NO_UPGRADES, gship: NO_UPGRADES } });
    expect(parseWallet('{oops').credits).toBe(0);
    const w = parseWallet(JSON.stringify({ credits: 340, upgrades: { shuttle: { hull: 2 } } }));
    expect(w.credits).toBe(340);
    expect(w.upgrades.shuttle.hull).toBe(2);
    expect(runOptions(w, 'shuttle')).toEqual({ credits: 340, upgrades: { ...NO_UPGRADES, hull: 2 } });
  });

  it('a run saves its credits and its ship\'s upgrades; a non-earning run saves nothing', () => {
    const w = parseWallet(JSON.stringify({ credits: 300 }));
    const s = buyUpgrade(initialState(1, 'normal', 'interceptor', runOptions(w, 'interceptor')), 'speed');
    const after = withRun(w, s);
    expect(after.credits).toBe(200);
    expect(after.upgrades.interceptor.speed).toBe(1);
    expect(after.upgrades.fighter).toEqual(NO_UPGRADES);
    expect(withRun(w, { ...s, earnsCredits: false })).toBe(w);
    expect(parseWallet(JSON.stringify(after))).toEqual(after);
  });

  it('the panel greys out what the wallet can\'t cover', () => {
    const s = { ...initialState(1), credits: 120 };
    const html = shopPanel(s);
    expect(html).toContain('◆ 120 credits');
    expect((html.match(/disabled/g) ?? []).length).toBe(1); // missiles start at 200
    expect((shopPanel({ ...s, credits: 50 }).match(/disabled/g) ?? []).length).toBe(7);
    expect(upgradeForKey('Digit1')).toBe('damage');
    expect(upgradeForKey('Digit6')).toBe('perkTime');
    expect(upgradeForKey('Digit7')).toBe('missiles');
    expect(upgradeForKey('Digit8')).toBeNull();
  });

  it('the HUD shows the credits, and the shop key in a lead-in', () => {
    const s = { ...initialState(1), credits: 75 };
    expect(hudModel(s, 0).credits).toBe('◆ 75 · B: STATION SHOP');
    expect(hudModel({ ...s, wave: { ...s.wave, phase: 'active' } }, 0).credits).toBe('◆ 75');
    expect(hudModel({ ...s, earnsCredits: false }, 0).credits).toBe('');
  });
});

describe('missiles HUD', () => {
  it('shows the volley size, then the locks while holding', () => {
    const s = { ...initialState(1), upgrades: { ...NO_UPGRADES, missiles: 2 } };
    expect(hudModel(initialState(1), 0).missiles).toBe('');
    expect(hudModel(s, 0).missiles).toBe('VOLLEY ×3');
    expect(hudModel({ ...s, missileLock: { ids: [4, 5], timer: 3 } }, 0).missiles).toBe('LOCKING 2/3');
  });
});
