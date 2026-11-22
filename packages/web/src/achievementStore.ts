/** Achievement unlocks kept per browser (P16): id → the local date it unlocked. Unknown ids and junk are dropped. */
import { ACHIEVEMENT_IDS, type AchievementId } from '@asteroid/sim';

export const ACHIEVEMENTS_KEY = 'asteroid-shooter-3d.achievements.v1';
export type Unlocks = Readonly<Partial<Record<AchievementId, string>>>;

export function parseUnlocks(raw: string | null): Unlocks {
  if (!raw) return {};
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return {};
  }
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return {};
  const out: Partial<Record<AchievementId, string>> = {};
  for (const id of ACHIEVEMENT_IDS) {
    const d = (v as Record<string, unknown>)[id];
    if (typeof d === 'string') out[id] = d;
  }
  return out;
}

/** Records `ids` on `date`; returns the new map and the ids that are new (in the order given, once each). */
export function recordUnlocks(store: Unlocks, ids: readonly AchievementId[], date: string): { store: Unlocks; fresh: AchievementId[] } {
  const fresh = [...new Set(ids)].filter((id) => !store[id]);
  if (fresh.length === 0) return { store, fresh };
  const next: Partial<Record<AchievementId, string>> = { ...store };
  for (const id of fresh) next[id] = date;
  return { store: next, fresh };
}

export const unlockedCount = (store: Unlocks): number => ACHIEVEMENT_IDS.filter((id) => store[id]).length;
