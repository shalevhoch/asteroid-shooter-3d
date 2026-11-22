/** Player settings kept per browser (P04): layout, invert-Y, camera. Unknown or corrupt values fall back to defaults. */
import { LAYOUTS, type Layout } from './keymap.js';
import { CAMERA_MODES, type CameraMode } from './view.js';

export interface Settings {
  layout: Layout;
  invertY: boolean;
  camera: CameraMode;
  help: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = { layout: 'modern', invertY: false, camera: 'chase', help: true };
export const SETTINGS_KEY = 'asteroid-shooter-3d.settings.v1';

export function parseSettings(raw: string | null): Settings {
  const s: Settings = { ...DEFAULT_SETTINGS };
  if (!raw) return s;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return s;
  }
  if (typeof v !== 'object' || v === null) return s;
  const o = v as { layout?: unknown; camera?: unknown; invertY?: unknown; help?: unknown };
  if (LAYOUTS.includes(o.layout as Layout)) s.layout = o.layout as Layout;
  if (CAMERA_MODES.includes(o.camera as CameraMode)) s.camera = o.camera as CameraMode;
  if (typeof o.invertY === 'boolean') s.invertY = o.invertY;
  if (typeof o.help === 'boolean') s.help = o.help;
  return s;
}

/** The next value in a list, wrapping. */
export const cycle = <T>(list: readonly T[], v: T): T => list[(list.indexOf(v) + 1) % list.length] ?? v;
