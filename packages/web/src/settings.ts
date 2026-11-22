/** Player settings kept per browser (P04, P08, P12): layout, invert-Y, camera, help, sound, difficulty, shake. Unknown or corrupt values fall back to defaults. */
import { DIFFICULTIES, type Difficulty } from '@asteroid/sim';
import { LAYOUTS, type Layout } from './keymap.js';
import { CAMERA_MODES, type CameraMode } from './view.js';

export interface Settings {
  layout: Layout;
  invertY: boolean;
  camera: CameraMode;
  help: boolean;
  muted: boolean;
  difficulty: Difficulty;
  /** Camera shake on Earth hits (P12). */
  shake: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = { layout: 'modern', invertY: false, camera: 'chase', help: false, muted: false, difficulty: 'normal', shake: true };
export const SETTINGS_KEY = 'asteroid-shooter-3d.settings.v1';

/** `reducedMotion` (the browser's prefers-reduced-motion) turns shake off by default; a stored choice wins. */
export function parseSettings(raw: string | null, reducedMotion = false): Settings {
  const s: Settings = { ...DEFAULT_SETTINGS, shake: !reducedMotion };
  if (!raw) return s;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return s;
  }
  if (typeof v !== 'object' || v === null) return s;
  const o = v as { layout?: unknown; camera?: unknown; invertY?: unknown; help?: unknown; muted?: unknown; difficulty?: unknown; shake?: unknown };
  if (LAYOUTS.includes(o.layout as Layout)) s.layout = o.layout as Layout;
  if (CAMERA_MODES.includes(o.camera as CameraMode)) s.camera = o.camera as CameraMode;
  if (typeof o.invertY === 'boolean') s.invertY = o.invertY;
  if (typeof o.help === 'boolean') s.help = o.help;
  if (typeof o.muted === 'boolean') s.muted = o.muted;
  if (DIFFICULTIES.includes(o.difficulty as Difficulty)) s.difficulty = o.difficulty as Difficulty;
  if (typeof o.shake === 'boolean') s.shake = o.shake;
  return s;
}

/** The next value in a list, wrapping. */
export const cycle = <T>(list: readonly T[], v: T): T => list[(list.indexOf(v) + 1) % list.length] ?? v;
