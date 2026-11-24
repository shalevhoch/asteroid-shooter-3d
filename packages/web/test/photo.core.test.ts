/** P38 photo mode: orbit, fly, focus, filters and the screenshot name. */
import { describe, expect, it } from 'vitest';
import { distance, type Vec3 } from '@asteroid/sim';
import {
  DISTANCE_MAX,
  DISTANCE_MIN,
  FILTER_LABELS,
  PITCH_LIMIT,
  applyPhotoInput,
  cycleFilter,
  enterPhoto,
  filterCss,
  focusOn,
  photoPose,
  screenshotName,
} from '../src/photo.js';

const origin: Vec3 = [0, 0, 0];
const idle = { lookX: 0, lookY: 0, zoom: 0, moveX: 0, moveY: 0, moveZ: 0, boost: false, dt: 1 / 60, invertY: false, sensitivity: 1 };

describe('photo mode (P38)', () => {
  it('opens an orbit around the ship from the current eye', () => {
    const cam = enterPhoto([0, 100, 200], origin);
    const pose = photoPose(cam);
    expect(cam.focus).toBe('ship');
    expect(distance(pose.eye, cam.pivot)).toBeCloseTo(cam.distance, 6);
    expect(pose.look).toEqual(origin);
    expect(distance(pose.eye, [0, 100, 200])).toBeCloseTo(0, 5);
  });

  it('dragging yaw walks the eye around the pivot on a sphere', () => {
    const a = enterPhoto([0, 0, 200], origin);
    const b = applyPhotoInput(a, { ...idle, lookX: 200 });
    const pa = photoPose(a);
    const pb = photoPose(b);
    expect(b.yaw).toBeLessThan(a.yaw);
    expect(distance(pb.eye, origin)).toBeCloseTo(distance(pa.eye, origin), 6);
    expect(pb.look).toEqual(origin);
    expect(pb.eye[0]).not.toBeCloseTo(pa.eye[0], 2);
  });

  it('WASD flies the pivot and the eye follows', () => {
    const a = enterPhoto([0, 0, 200], origin);
    const b = applyPhotoInput(a, { ...idle, moveX: 1, dt: 1 });
    expect(b.pivot[0]).toBeGreaterThan(0);
    expect(distance(photoPose(b).eye, b.pivot)).toBeCloseTo(b.distance, 6);
  });

  it('focusing Earth snaps the pivot and keeps a legal orbit', () => {
    const ship: Vec3 = [10, 0, 0];
    const earth: Vec3 = [3000, 0, 0];
    const cam = focusOn(enterPhoto([10, 50, 200], ship), 'earth', ship, earth);
    expect(cam.focus).toBe('earth');
    expect(cam.pivot).toEqual(earth);
    expect(cam.distance).toBeGreaterThanOrEqual(1200);
    expect(photoPose(cam).look).toEqual(earth);
  });

  it('filters cycle and only "none" has no CSS', () => {
    expect(cycleFilter('none')).toBe('cinematic');
    expect(cycleFilter('vintage')).toBe('none');
    expect(cycleFilter('cinematic', -1)).toBe('none');
    expect(filterCss('none')).toBe('none');
    expect(filterCss('mono')).toMatch(/grayscale/);
    expect(filterCss('cinematic')).toMatch(/contrast/);
    expect(filterCss('vintage')).toMatch(/sepia/);
    expect(Object.keys(FILTER_LABELS)).toEqual(['none', 'cinematic', 'mono', 'vintage']);
  });

  it('the screenshot name is dated and has no player name', () => {
    const n = screenshotName(new Date(2026, 10, 24, 19, 5, 7));
    expect(n).toBe('asteroid-shooter-3d-2026-11-24-190507.png');
    expect(n.toLowerCase()).not.toMatch(/shalev|gilad|player|logo|pilot/);
  });
});

describe('photo mode limits', () => {
  it('pitch and distance stay inside the legal range', () => {
    const a = enterPhoto([0, 0, 200], origin);
    const up = applyPhotoInput(a, { ...idle, lookY: 1_000_000 });
    const down = applyPhotoInput(a, { ...idle, lookY: -1_000_000 });
    const near = applyPhotoInput(a, { ...idle, zoom: 1_000 });
    const far = applyPhotoInput(a, { ...idle, zoom: -1_000 });
    expect(up.pitch).toBeCloseTo(PITCH_LIMIT);
    expect(down.pitch).toBeCloseTo(-PITCH_LIMIT);
    expect(near.distance).toBe(DISTANCE_MIN);
    expect(far.distance).toBe(DISTANCE_MAX);
  });

  it('invert-Y flips the pitch of a look, and a zero dt does not fly', () => {
    const a = enterPhoto([0, 0, 200], origin);
    const normal = applyPhotoInput(a, { ...idle, lookY: 20 });
    const inverted = applyPhotoInput(a, { ...idle, lookY: 20, invertY: true });
    expect(normal.pitch).toBeGreaterThan(a.pitch);
    expect(inverted.pitch).toBeLessThan(a.pitch);
    const still = applyPhotoInput(a, { ...idle, moveZ: 1, dt: 0 });
    expect(still.pivot).toEqual(a.pivot);
  });
});
