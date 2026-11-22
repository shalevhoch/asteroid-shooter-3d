/** The local top-10 (P10): the best runs in this browser, no names (SPEC §6). Pure. */
import { DIFFICULTIES, type Difficulty } from '@asteroid/sim';

export interface ScoreEntry {
  readonly score: number;
  readonly difficulty: Difficulty;
  /** Waves cleared. */
  readonly waves: number;
  /** The campaign was won (finished after wave 10). */
  readonly won: boolean;
  /** Local date, YYYY-MM-DD. */
  readonly date: string;
}

export const TOP_KEY = 'asteroid-shooter-3d.top10.v1';
export const TOP_SIZE = 10;

const isEntry = (e: unknown): e is ScoreEntry => {
  if (typeof e !== 'object' || e === null) return false;
  const r = e as Record<string, unknown>;
  return (
    typeof r['score'] === 'number' && Number.isFinite(r['score']) && r['score'] > 0 &&
    DIFFICULTIES.some((d) => d === r['difficulty']) &&
    typeof r['waves'] === 'number' && Number.isFinite(r['waves']) && r['waves'] >= 0 &&
    typeof r['won'] === 'boolean' && typeof r['date'] === 'string'
  );
};

/** The stored list: invalid entries dropped, sorted best first, at most TOP_SIZE. Corrupt storage reads as empty. */
export function parseTop(raw: string | null): ScoreEntry[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.filter(isEntry).map((e) => ({ score: Math.floor(e.score), difficulty: e.difficulty, waves: Math.floor(e.waves), won: e.won, date: e.date.slice(0, 10) })).sort((a, b) => b.score - a.score).slice(0, TOP_SIZE);
}

/**
 * Inserts a run. Ties keep the older run ahead. Returns the new list and the run's 1-based rank,
 * or rank null when it didn't make the list (or scored 0).
 */
export function insertScore(list: readonly ScoreEntry[], entry: ScoreEntry): { list: ScoreEntry[]; rank: number | null } {
  if (entry.score <= 0) return { list: [...list], rank: null };
  const at = list.findIndex((e) => e.score < entry.score);
  const index = at === -1 ? list.length : at;
  if (index >= TOP_SIZE) return { list: [...list], rank: null };
  const next = [...list.slice(0, index), entry, ...list.slice(index)].slice(0, TOP_SIZE);
  return { list: next, rank: index + 1 };
}

/** Today's local date as YYYY-MM-DD. */
export function localDate(d: Date): string {
  return `${String(d.getFullYear())}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
