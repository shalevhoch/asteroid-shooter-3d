/** Player settings kept per browser (P04, P08, P12, P13): layout, invert-Y, camera, help, sound, volume, mouse sensitivity, difficulty, shake. Unknown or corrupt values fall back to defaults. */
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
  /** Mouse sensitivity multiplier (P13), SENSITIVITY_MIN..SENSITIVITY_MAX. */
  sensitivity: number;
  /** Master volume (P13), 0..1. */
  volume: number;
}

export const SENSITIVITY_MIN = 0.25;
export const SENSITIVITY_MAX = 3;
export const SENSITIVITY_STEP = 0.25;
export const VOLUME_STEP = 0.1;

export const DEFAULT_SETTINGS: Readonly<Settings> = { layout: 'modern', invertY: false, camera: 'chase', help: false, muted: false, difficulty: 'normal', shake: true, sensitivity: 1, volume: 1 };
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
  const o = v as { layout?: unknown; camera?: unknown; invertY?: unknown; help?: unknown; muted?: unknown; difficulty?: unknown; shake?: unknown; sensitivity?: unknown; volume?: unknown };
  if (LAYOUTS.includes(o.layout as Layout)) s.layout = o.layout as Layout;
  if (CAMERA_MODES.includes(o.camera as CameraMode)) s.camera = o.camera as CameraMode;
  if (typeof o.invertY === 'boolean') s.invertY = o.invertY;
  if (typeof o.help === 'boolean') s.help = o.help;
  if (typeof o.muted === 'boolean') s.muted = o.muted;
  if (DIFFICULTIES.includes(o.difficulty as Difficulty)) s.difficulty = o.difficulty as Difficulty;
  if (typeof o.shake === 'boolean') s.shake = o.shake;
  if (typeof o.sensitivity === 'number' && Number.isFinite(o.sensitivity)) s.sensitivity = clampStep(o.sensitivity, SENSITIVITY_MIN, SENSITIVITY_MAX, SENSITIVITY_STEP);
  if (typeof o.volume === 'number' && Number.isFinite(o.volume)) s.volume = clampStep(o.volume, 0, 1, VOLUME_STEP);
  return s;
}

/** The next value in a list, wrapping. */
export const cycle = <T>(list: readonly T[], v: T): T => list[(list.indexOf(v) + 1) % list.length] ?? v;

/** Clamps to [min, max] and snaps to the step grid (rounded to 2 decimals, so 0.1 steps stay clean). */
export function clampStep(v: number, min: number, max: number, step: number): number {
  const snapped = Math.round(v / step) * step;
  return Math.round(Math.min(max, Math.max(min, snapped)) * 100) / 100;
}

/** Ids of the rows on the settings panel (P13), in display order. */
export const SETTING_IDS = ['layout', 'camera', 'invertY', 'sensitivity', 'volume', 'muted', 'shake', 'help', 'difficulty'] as const;
export type SettingId = (typeof SETTING_IDS)[number];

export interface SettingRow {
  readonly id: SettingId;
  readonly label: string;
  readonly value: string;
  /** `toggle`: one button flips or cycles it; `range`: − and + buttons. */
  readonly kind: 'toggle' | 'range';
  readonly note?: string;
}

const onOff = (b: boolean) => (b ? 'on' : 'off');

/** The settings panel's rows. Mid-run (`midRun`), difficulty only applies to the next run, and says so. */
export function settingRows(s: Readonly<Settings>, difficultyNames: Readonly<Record<Difficulty, string>>, midRun: boolean): SettingRow[] {
  return [
    { id: 'layout', label: 'Keys', value: s.layout, kind: 'toggle' },
    { id: 'camera', label: 'Camera', value: s.camera, kind: 'toggle' },
    { id: 'invertY', label: 'Invert mouse Y', value: onOff(s.invertY), kind: 'toggle' },
    { id: 'sensitivity', label: 'Mouse sensitivity', value: `×${s.sensitivity.toFixed(2)}`, kind: 'range' },
    { id: 'volume', label: 'Volume', value: `${String(Math.round(s.volume * 100))}%`, kind: 'range' },
    { id: 'muted', label: 'Sound', value: onOff(!s.muted), kind: 'toggle' },
    { id: 'shake', label: 'Screen shake', value: onOff(s.shake), kind: 'toggle' },
    { id: 'help', label: 'Controls in play', value: onOff(s.help), kind: 'toggle' },
    { id: 'difficulty', label: 'Difficulty', value: difficultyNames[s.difficulty], kind: 'toggle', ...(midRun ? { note: 'next run' } : {}) },
  ];
}

/** Changes one setting in place: a toggle flips or cycles (`dir` ignored), a range steps by `dir` (±1). */
export function changeSetting(s: Settings, id: SettingId, dir: 1 | -1 = 1): void {
  switch (id) {
    case 'layout':
      s.layout = cycle(LAYOUTS, s.layout);
      return;
    case 'camera':
      s.camera = cycle(CAMERA_MODES, s.camera);
      return;
    case 'difficulty':
      s.difficulty = cycle(DIFFICULTIES, s.difficulty);
      return;
    case 'sensitivity':
      s.sensitivity = clampStep(s.sensitivity + dir * SENSITIVITY_STEP, SENSITIVITY_MIN, SENSITIVITY_MAX, SENSITIVITY_STEP);
      return;
    case 'volume':
      s.volume = clampStep(s.volume + dir * VOLUME_STEP, 0, 1, VOLUME_STEP);
      return;
    default:
      s[id] = !s[id];
  }
}
