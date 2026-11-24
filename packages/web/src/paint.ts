/** Unlockable paint colours (P39): render-only tints, saved per ship. Pure, so it can be tested without three.js. */
import { CRAFT_IDS, type AchievementId, type CraftId } from '@asteroid/sim';
import type { Unlocks } from './achievementStore.js';

export const PAINT_IDS = ['stock', 'ember', 'ice', 'gold', 'obsidian', 'crimson', 'azure', 'violet'] as const;
export type PaintId = (typeof PAINT_IDS)[number];

export interface PaintDef {
  readonly name: string;
  /** Multiplier on the model's stock colour (white leaves the texture as it is). */
  readonly tint: number;
  readonly achievement?: AchievementId;
  readonly cost?: number;
}

export const PAINTS: Readonly<Record<PaintId, PaintDef>> = {
  stock: { name: 'Stock', tint: 0xffffff },
  ember: { name: 'Ember', tint: 0xff6a3d, achievement: 'firstContact' },
  ice: { name: 'Ice', tint: 0x9ee7ff, achievement: 'sharpshooter' },
  gold: { name: 'Gold', tint: 0xffd27f, achievement: 'earthIsSafe' },
  obsidian: { name: 'Obsidian', tint: 0x4a5562, achievement: 'hardened' },
  crimson: { name: 'Crimson', tint: 0xe23b4a, cost: 200 },
  azure: { name: 'Azure', tint: 0x4aa3ff, cost: 200 },
  violet: { name: 'Violet', tint: 0xb07cff, cost: 400 },
};

export const PAINT_KEY = 'asteroid-shooter-3d.paint.v1';

export interface PaintStore {
  /** The chosen colour for each craft. */
  readonly chosen: Readonly<Record<CraftId, PaintId>>;
  /** Credit colours that have been bought. */
  readonly bought: readonly PaintId[];
}

const emptyChosen = (): Record<CraftId, PaintId> => Object.fromEntries(CRAFT_IDS.map((c) => [c, 'stock'])) as Record<CraftId, PaintId>;

export const EMPTY_PAINT: PaintStore = { chosen: emptyChosen(), bought: [] };

const asPaint = (v: unknown): PaintId | null => (typeof v === 'string' && (PAINT_IDS as readonly string[]).includes(v) ? (v as PaintId) : null);

/** The stored paints, or Stock everywhere if the record is missing or broken. */
export function parsePaint(raw: string | null): PaintStore {
  if (!raw) return { chosen: emptyChosen(), bought: [] };
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return { chosen: emptyChosen(), bought: [] };
  }
  if (typeof v !== 'object' || v === null) return { chosen: emptyChosen(), bought: [] };
  const o = v as { chosen?: unknown; bought?: unknown };
  const chosen = emptyChosen();
  if (typeof o.chosen === 'object' && o.chosen !== null) {
    for (const c of CRAFT_IDS) {
      const id = asPaint((o.chosen as Record<string, unknown>)[c]);
      if (id) chosen[c] = id;
    }
  }
  const bought = Array.isArray(o.bought) ? o.bought.map(asPaint).filter((id): id is PaintId => id !== null && PAINTS[id].cost !== undefined) : [];
  return { chosen, bought: [...new Set(bought)] };
}

/** Whether `id` can be selected: Stock always, achievement colours from unlocks, credit colours once bought. */
export function paintUnlocked(id: PaintId, unlocks: Unlocks, bought: readonly PaintId[]): boolean {
  const p = PAINTS[id];
  if (p.achievement) return Boolean(unlocks[p.achievement]);
  if (p.cost !== undefined) return bought.includes(id);
  return true;
}

export const chosenPaint = (s: PaintStore, craft: CraftId): PaintId => s.chosen[craft];

/** Selects an unlocked colour for `craft`. Unknown or locked ids are ignored. */
export function selectPaint(s: PaintStore, craft: CraftId, id: PaintId, unlocks: Unlocks): PaintStore {
  if (!paintUnlocked(id, unlocks, s.bought)) return s;
  if (s.chosen[craft] === id) return s;
  return { ...s, chosen: { ...s.chosen, [craft]: id } };
}

/**
 * Buys a credit colour if it isn't already bought and `credits` can cover the price. Returns the new store and remaining
 * credits, or null if the buy cannot happen.
 */
export function buyPaint(s: PaintStore, id: PaintId, credits: number): { store: PaintStore; credits: number } | null {
  const cost = PAINTS[id].cost;
  if (cost === undefined || s.bought.includes(id) || credits < cost) return null;
  return { store: { ...s, bought: [...s.bought, id] }, credits: credits - cost };
}

/** The colour granted by an achievement, if any. */
export function paintForAchievement(id: AchievementId): PaintId | null {
  for (const p of PAINT_IDS) if (PAINTS[p].achievement === id) return p;
  return null;
}
