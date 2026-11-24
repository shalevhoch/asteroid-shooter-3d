/** Photo mode (P38): a paused free camera and screenshot helpers. Pure, so it can be tested without three.js or the DOM. */
import { add, cross, normalize, scale, sub, type Vec3 } from '@asteroid/sim';
import type { CameraPose } from './view.js';

export const PHOTO_FILTERS = ['none', 'cinematic', 'mono', 'vintage'] as const;
export type PhotoFilter = (typeof PHOTO_FILTERS)[number];

export const PHOTO_FOCI = ['ship', 'earth'] as const;
export type PhotoFocus = (typeof PHOTO_FOCI)[number];

export const FILTER_LABELS: Readonly<Record<PhotoFilter, string>> = {
  none: 'None',
  cinematic: 'Cinematic',
  mono: 'Black and white',
  vintage: 'Vintage',
};

export const FOCUS_LABELS: Readonly<Record<PhotoFocus, string>> = { ship: 'Ship', earth: 'Earth' };

/** CSS filters for the live preview and for the saved PNG. */
export const FILTER_CSS: Readonly<Record<PhotoFilter, string>> = {
  none: 'none',
  cinematic: 'contrast(1.15) saturate(1.2) brightness(1.05)',
  mono: 'grayscale(1) contrast(1.15)',
  vintage: 'sepia(0.45) contrast(1.1) saturate(0.85)',
};

export const PITCH_LIMIT = 1.45;
export const DISTANCE_MIN = 20;
export const DISTANCE_MAX = 8000;
const LOOK_RAD_PER_PX = 0.005;
const ZOOM_FACTOR = 0.12;
const BASE_SPEED = 400;

export interface PhotoCam {
  readonly focus: PhotoFocus;
  readonly yaw: number;
  readonly pitch: number;
  readonly distance: number;
  readonly pivot: Vec3;
}

export interface PhotoInput {
  /** Horizontal look in pixels (positive looks right). */
  readonly lookX: number;
  /** Vertical look in pixels (positive looks up). */
  readonly lookY: number;
  /** Zoom delta: negative moves closer. */
  readonly zoom: number;
  /** Fly the pivot: +X right, +Y up, +Z forward (toward the subject), −1..1. */
  readonly moveX: number;
  readonly moveY: number;
  readonly moveZ: number;
  readonly boost: boolean;
  readonly dt: number;
  readonly invertY: boolean;
  readonly sensitivity: number;
}

export const cycleFilter = (f: PhotoFilter, dir: 1 | -1 = 1): PhotoFilter =>
  PHOTO_FILTERS[(PHOTO_FILTERS.indexOf(f) + dir + PHOTO_FILTERS.length) % PHOTO_FILTERS.length] ?? f;

export const cycleFocus = (f: PhotoFocus): PhotoFocus => (f === 'ship' ? 'earth' : 'ship');

export const filterCss = (f: PhotoFilter): string => FILTER_CSS[f];

const clampPitch = (p: number): number => Math.max(-PITCH_LIMIT, Math.min(PITCH_LIMIT, p));
const clampDist = (d: number): number => Math.max(DISTANCE_MIN, Math.min(DISTANCE_MAX, d));

/** An orbit framed from the current eye around `pivot`. */
export function frameAround(focus: PhotoFocus, eye: Vec3, pivot: Vec3): PhotoCam {
  const off = sub(eye, pivot);
  const dist = Math.hypot(off[0], off[1], off[2]);
  const yaw = Math.atan2(off[0], off[2]);
  const pitch = Math.atan2(off[1], Math.hypot(off[0], off[2]));
  return { focus, yaw, pitch: clampPitch(Number.isFinite(pitch) ? pitch : 0), distance: clampDist(dist > 0 ? dist : 200), pivot };
}

/** Opens photo mode looking at the ship from the current camera eye. */
export const enterPhoto = (eye: Vec3, ship: Vec3): PhotoCam => frameAround('ship', eye, ship);

/** Snaps the orbit to the ship or Earth, keeping the current angles and a legal distance. */
export function focusOn(cam: PhotoCam, focus: PhotoFocus, ship: Vec3, earth: Vec3): PhotoCam {
  const pivot = focus === 'earth' ? earth : ship;
  const distance = clampDist(focus === 'earth' && cam.distance < 1200 ? 3200 : cam.distance);
  return { ...cam, focus, pivot, distance };
}

export function photoPose(cam: PhotoCam): CameraPose {
  const cp = Math.cos(cam.pitch);
  const sp = Math.sin(cam.pitch);
  const cy = Math.cos(cam.yaw);
  const sy = Math.sin(cam.yaw);
  const off: Vec3 = [sy * cp * cam.distance, sp * cam.distance, cy * cp * cam.distance];
  return { eye: add(cam.pivot, off), look: cam.pivot, up: [0, 1, 0] };
}

/** Applies one frame of look, zoom and fly, keeping the orbit legal. */
export function applyPhotoInput(cam: PhotoCam, i: PhotoInput): PhotoCam {
  const dt = Number.isFinite(i.dt) && i.dt > 0 ? i.dt : 0;
  const sens = Number.isFinite(i.sensitivity) && i.sensitivity > 0 ? i.sensitivity : 1;
  const yaw = cam.yaw - i.lookX * LOOK_RAD_PER_PX * sens;
  const pitch = clampPitch(cam.pitch + i.lookY * (i.invertY ? -1 : 1) * LOOK_RAD_PER_PX * sens);
  const distance = clampDist(cam.distance * Math.exp(-(Number.isFinite(i.zoom) ? i.zoom : 0) * ZOOM_FACTOR));
  const next: PhotoCam = { ...cam, yaw, pitch, distance };
  if (i.moveX === 0 && i.moveY === 0 && i.moveZ === 0) return next;
  const pose = photoPose(next);
  const lookDir = normalize(sub(pose.look, pose.eye));
  let right = normalize(cross(lookDir, [0, 1, 0]));
  if (right[0] === 0 && right[1] === 0 && right[2] === 0) right = [1, 0, 0];
  const up = normalize(cross(right, lookDir));
  const speed = BASE_SPEED * (i.boost ? 3 : 1) * (next.distance / 200) * dt;
  const pivot = add(add(add(next.pivot, scale(right, i.moveX * speed)), scale(up, i.moveY * speed)), scale(lookDir, i.moveZ * speed));
  return { ...next, pivot };
}

/** `asteroid-shooter-3d-YYYY-MM-DD-HHMMSS.png` in the local timezone. No player name. */
export function screenshotName(date: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `asteroid-shooter-3d-${String(date.getFullYear())}-${p(date.getMonth() + 1)}-${p(date.getDate())}-${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}.png`;
}

/** Copies `src` through a 2D canvas so the CSS filter is baked into the PNG. */
export function snapshotCanvas(src: HTMLCanvasElement, cssFilter: string): HTMLCanvasElement {
  const dest = document.createElement('canvas');
  dest.width = src.width;
  dest.height = src.height;
  const ctx = dest.getContext('2d');
  if (!ctx) return src;
  ctx.filter = cssFilter && cssFilter !== 'none' ? cssFilter : 'none';
  ctx.drawImage(src, 0, 0);
  return dest;
}
