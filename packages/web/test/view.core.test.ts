/** P04 view math: interpolation, camera rigs, FOV easing, settings parsing. */
import { describe, expect, it } from 'vitest';
import { IDENTITY, fromAxisAngle, initialState } from '@asteroid/sim';
import { DEFAULT_SETTINGS, cycle, parseSettings } from '../src/settings.js';
import { FOV_BASE, FOV_TURBO, cameraPose, interpolate, nextFov } from '../src/view.js';

describe('interpolate', () => {
  const a = { pos: [0, 0, 0] as const, rot: IDENTITY };
  const b = { pos: [10, -20, 30] as const, rot: fromAxisAngle([0, 1, 0], Math.PI / 2) };

  it('returns the endpoints at 0 and 1 and the midpoint between', () => {
    expect(interpolate(a, b, 0).pos).toEqual([0, 0, 0]);
    expect(interpolate(a, b, 1).pos).toEqual([10, -20, 30]);
    expect(interpolate(a, b, 0.5).pos).toEqual([5, -10, 15]);
    const mid = interpolate(a, b, 0.5).rot;
    const expected = fromAxisAngle([0, 1, 0], Math.PI / 4);
    for (let i = 0; i < 4; i++) expect(mid[i]).toBeCloseTo(expected[i] ?? NaN, 9);
  });

  it('takes the short way round when the quaternions have opposite signs', () => {
    const neg = { pos: a.pos, rot: [-0, -0, -0, -1] as const };
    const r = interpolate(a, neg, 0.5).rot;
    expect(Math.abs(r[3])).toBeCloseTo(1, 9);
  });

  it('clamps alpha and treats garbage as 1', () => {
    expect(interpolate(a, b, 2).pos).toEqual([10, -20, 30]);
    expect(interpolate(a, b, -1).pos).toEqual([0, 0, 0]);
    expect(interpolate(a, b, NaN).pos).toEqual([10, -20, 30]);
  });
});

describe('cameraPose', () => {
  it('puts the chase camera behind and above the ship, looking ahead', () => {
    const s = initialState(1).ship; // facing +Z
    const c = cameraPose(s, 'chase');
    expect(c.eye[2]).toBeLessThan(s.pos[2]);
    expect(c.eye[1]).toBeGreaterThan(s.pos[1]);
    expect(c.look[2]).toBeGreaterThan(s.pos[2]);
    expect(c.up[1]).toBeCloseTo(1, 9);
  });

  it('puts the classic camera where the original eye was, looking straight ahead', () => {
    const s = initialState(1).ship;
    const c = cameraPose(s, 'classic');
    expect(c.eye[2]).toBeCloseTo(s.pos[2] - 62, 9);
    expect(c.look[1]).toBeCloseTo(c.eye[1], 9);
    expect(c.look[0]).toBeCloseTo(c.eye[0], 9);
  });
});

describe('nextFov', () => {
  it('eases toward the turbo FOV and back, never overshooting', () => {
    let fov = FOV_BASE;
    for (let i = 0; i < 120; i++) fov = nextFov(fov, { turbo: true }, 1 / 60);
    expect(fov).toBeGreaterThan(FOV_TURBO - 1);
    expect(fov).toBeLessThanOrEqual(FOV_TURBO);
    for (let i = 0; i < 120; i++) fov = nextFov(fov, { turbo: false }, 1 / 60);
    expect(fov).toBeLessThan(FOV_BASE + 1);
    expect(nextFov(FOV_BASE, { turbo: true }, -1)).toBe(FOV_BASE);
  });
});

describe('settings', () => {
  it('defaults to modern, no invert, chase, help shown', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual({ layout: 'modern', invertY: false, camera: 'chase', help: true });
  });

  it('keeps valid fields and drops bad ones', () => {
    expect(parseSettings('{"layout":"classic","invertY":true,"camera":"warp","help":"no"}')).toEqual({ ...DEFAULT_SETTINGS, layout: 'classic', invertY: true });
    expect(parseSettings('not json')).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings('null')).toEqual(DEFAULT_SETTINGS);
  });

  it('cycles through a list', () => {
    expect(cycle(['a', 'b', 'c'], 'c')).toBe('a');
    expect(cycle(['a', 'b'], 'a')).toBe('b');
  });
});
