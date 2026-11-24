/** P40 split screen: viewports, two-pad requirement and pad picking. */
import { describe, expect, it } from 'vitest';
import { initialState } from '@asteroid/sim';
import { canStartCoop, splitViewports } from '../src/coop.js';
import { pickPads } from '../src/gamepad.js';
import { hudModel } from '../src/hud.js';

const pad = (mapping: string, connected = true): { connected: boolean; mapping: string } => ({ connected, mapping });

describe('split screen helpers (P40)', () => {
  it('splits the framebuffer into left and right halves that cover every pixel', () => {
    const [a, b] = splitViewports(800, 600);
    expect(a).toEqual({ x: 0, y: 0, w: 400, h: 600 });
    expect(b).toEqual({ x: 400, y: 0, w: 400, h: 600 });
    const odd = splitViewports(801, 600);
    expect(odd[0].w + odd[1].w).toBe(801);
    expect(odd[1].x).toBe(odd[0].w);
  });

  it('co-op starts only with two pads', () => {
    expect(canStartCoop(0)).toBe(false);
    expect(canStartCoop(1)).toBe(false);
    expect(canStartCoop(2)).toBe(true);
    expect(canStartCoop(3)).toBe(true);
  });

  it('picks two connected pads, standard-mapped first', () => {
    expect(pickPads([null, pad('standard'), pad('', true), pad('standard')])).toHaveLength(2);
    expect(pickPads([pad('standard'), pad('standard')]).map((p) => p.mapping)).toEqual(['standard', 'standard']);
    expect(pickPads([pad('foo'), pad('standard')]).map((p) => p.mapping)).toEqual(['standard', 'foo']);
    expect(pickPads([pad('standard', false), pad('standard')])).toHaveLength(1);
  });

  it('the P2 HUD reads the second ship\'s hull and does not change the 1P model', () => {
    const s = initialState(1, 'normal', 'fighter', { coop: true });
    const low = { ...s, ship2: s.ship2 ? { ...s.ship2, hull: 10, rockets: 0 } : undefined };
    const p2ship = low.ship2;
    expect(p2ship).toBeDefined();
    if (!p2ship) return;
    const one = hudModel(s, 0);
    const two = hudModel({ ...low, ship2: p2ship }, 0, 1);
    expect(one.hull).toBe(1);
    expect(two.hull).toBeCloseTo(0.1);
    expect(two.warnings).toContain('HULL CRITICAL');
    expect(two.warnings).toContain('NO ROCKETS: RELOAD AT THE MOTHERSHIP OR STATION');
    expect(hudModel(initialState(1), 0).hull).toBe(1);
  });
});
