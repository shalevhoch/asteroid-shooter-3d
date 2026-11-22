/** P09 threat math: projection, edge arrows, radar, urgency, and "an Earth-bound asteroid is never invisible". */
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { IDENTITY, fromAxisAngle, nextFloat, type RngState, type Vec3 } from '@asteroid/sim';
import { CRITICAL_SECONDS, edgeArrow, formatImpact, onScreen, project, radarBlip, urgency } from '../src/threat.js';

function cameraAt(pos: Vec3, look: Vec3, fov = 50, aspect = 16 / 9): number[] {
  const cam = new THREE.PerspectiveCamera(fov, aspect, 1, 30000);
  cam.position.set(...pos);
  cam.lookAt(...look);
  cam.updateMatrixWorld();
  return new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).elements;
}

describe('project', () => {
  const m = cameraAt([0, 0, 0], [0, 0, -1]);
  it('puts a point straight ahead at the centre, and one behind as behind', () => {
    const ahead = project(m, [0, 0, -100]);
    expect(ahead.x).toBeCloseTo(0, 9);
    expect(ahead.y).toBeCloseTo(0, 9);
    expect(ahead.behind).toBe(false);
    expect(project(m, [0, 0, 100]).behind).toBe(true);
  });

  it('agrees with three.js Vector3.project', () => {
    const cam = new THREE.PerspectiveCamera(50, 16 / 9, 1, 30000);
    cam.position.set(10, -20, 30);
    cam.lookAt(500, 40, -200);
    cam.updateMatrixWorld();
    const vp = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse).elements;
    const p: Vec3 = [400, 100, -150];
    const ours = project(vp, p);
    const theirs = new THREE.Vector3(...p).project(cam);
    expect(ours.x).toBeCloseTo(theirs.x, 9);
    expect(ours.y).toBeCloseTo(theirs.y, 9);
  });

  it('knows what is on screen', () => {
    expect(onScreen(project(m, [0, 0, -100]))).toBe(true);
    expect(onScreen(project(m, [1000, 0, -100]))).toBe(false);
    expect(onScreen(project(m, [0, 0, 100]))).toBe(false);
  });
});

describe('edgeArrow', () => {
  it('pins an off-screen point to the inset border in its direction', () => {
    const a = edgeArrow({ x: 3, y: 1, behind: false }, 0.9);
    expect(a.x).toBeCloseTo(0.9, 9);
    expect(a.y).toBeCloseTo(0.3, 9);
    expect(a.angle).toBeCloseTo(Math.atan2(1, 3), 9);
  });

  it('mirrors points behind the camera, so the arrow says which way to turn', () => {
    const m = cameraAt([0, 0, 0], [0, 0, -1]);
    // Behind and to the right: turn right.
    const a = edgeArrow(project(m, [100, 0, 50]));
    expect(a.x).toBeGreaterThan(0);
    // Dead behind: point down rather than nowhere.
    expect(edgeArrow({ x: 0, y: 0, behind: true }).y).toBeLessThan(0);
  });
});

describe('never invisible', () => {
  it('every asteroid is on screen or has an arrow on the screen border (2000 random poses)', () => {
    let r: RngState = 11;
    const u = () => {
      const [v, n] = nextFloat(r);
      r = n;
      return v * 2 - 1;
    };
    for (let i = 0; i < 2000; i++) {
      const cam: Vec3 = [u() * 3000, u() * 1500, u() * 3000];
      const look: Vec3 = [cam[0] + u() * 100, cam[1] + u() * 100, cam[2] + u() * 100 + 0.01];
      const m = cameraAt(cam, look);
      const p = project(m, [u() * 4000, u() * 1000, u() * 4000]);
      if (onScreen(p)) continue;
      const a = edgeArrow(p);
      expect(Number.isFinite(a.x) && Number.isFinite(a.y)).toBe(true);
      expect(Math.max(Math.abs(a.x), Math.abs(a.y))).toBeCloseTo(0.9, 9);
    }
  });
});

describe('radarBlip', () => {
  it('maps forward to up and right to right, in the ship frame', () => {
    // Identity rotation: forward is −Z, right is +X, up is +Y.
    expect(radarBlip([0, 0, 0], IDENTITY, [0, 0, -1000], 2000)).toMatchObject({ x: 0, y: 0.5, clamped: false });
    const right = radarBlip([0, 0, 0], IDENTITY, [500, 300, 0], 1000);
    expect(right.x).toBeCloseTo(0.5, 9);
    expect(right.elevation).toBeCloseTo(0.3, 9);
    // Turned 90° left (yaw about +Y): world −X is now forward.
    const turned = radarBlip([0, 0, 0], fromAxisAngle([0, 1, 0], Math.PI / 2), [-1000, 0, 0], 2000);
    expect(turned.y).toBeCloseTo(0.5, 9);
  });

  it('clamps far points to the rim', () => {
    const b = radarBlip([0, 0, 0], IDENTITY, [3000, 0, -4000], 1000);
    expect(b.clamped).toBe(true);
    expect(Math.hypot(b.x, b.y)).toBeCloseTo(1, 9);
  });
});

describe('urgency and impact time', () => {
  it('grades by seconds to impact', () => {
    expect(urgency(CRITICAL_SECONDS * 25 - 1)).toBe('critical');
    expect(urgency(20 * 25)).toBe('warning');
    expect(urgency(60 * 25)).toBe('calm');
  });

  it('formats rounded up', () => {
    expect(formatImpact(1)).toBe('0:01');
    expect(formatImpact(25 * 75)).toBe('1:15');
    expect(formatImpact(0)).toBe('0:00');
  });
});
