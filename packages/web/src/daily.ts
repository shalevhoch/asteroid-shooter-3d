/**
 * The daily challenge (P33): one seeded run per UTC day, the same for everyone. Fixed rules: Normal, the Fighter,
 * no upgrades and no credits earned. The local best is kept per day. Pure apart from the inputs.
 */
import { NO_UPGRADES, type CraftId, type Difficulty, type RunOptions } from '@asteroid/sim';

export const DAILY_KEY = 'asteroid-shooter-3d.daily.v1';
export const DAILY_DIFFICULTY: Difficulty = 'normal';
export const DAILY_CRAFT: CraftId = 'fighter';
export const DAILY_OPTIONS: RunOptions = { upgrades: NO_UPGRADES, credits: 0, earnsCredits: false };

/** The UTC date as YYYY-MM-DD. */
export const utcDate = (d: Date): string => d.toISOString().slice(0, 10);

/** The day's seed: FNV-1a over "daily:YYYY-MM-DD", as an unsigned 32-bit integer. */
export function dailySeed(date: string): number {
  let h = 0x811c9dc5;
  for (const ch of `daily:${date}`) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface DailyBest {
  readonly date: string;
  readonly best: number;
}

/** The stored best, counted only for `today`; anything else reads as 0. */
export function dailyBest(raw: string | null, today: string): number {
  try {
    const v: unknown = JSON.parse(raw ?? 'null');
    if (typeof v !== 'object' || v === null) return 0;
    const o = v as Record<string, unknown>;
    return o['date'] === today && typeof o['best'] === 'number' && Number.isFinite(o['best']) && o['best'] > 0 ? Math.floor(o['best']) : 0;
  } catch {
    return 0;
  }
}

/** Records a daily score: returns the record to store and whether it beat today's best. */
export function recordDaily(raw: string | null, today: string, score: number): { readonly store: DailyBest; readonly isNew: boolean } {
  const best = dailyBest(raw, today);
  return score > best ? { store: { date: today, best: score }, isNew: true } : { store: { date: today, best }, isNew: false };
}
