/** The run flow (P07, P08): title → playing ⇄ paused → (won → playing | over) → over → playing, plus run stats and the stored best score. Pure. */
import type { SimEvent } from '@asteroid/sim';

export type Phase = 'title' | 'playing' | 'paused' | 'won' | 'over';
export type FlowAction = 'start' | 'pause' | 'resume' | 'end' | 'restart' | 'win' | 'continue' | 'finish';

/** The phase after an action; actions that don't apply in a phase leave it unchanged. */
export function nextPhase(phase: Phase, action: FlowAction): Phase {
  switch (action) {
    case 'start':
      return phase === 'title' ? 'playing' : phase;
    case 'pause':
      return phase === 'playing' ? 'paused' : phase;
    case 'resume':
      return phase === 'paused' ? 'playing' : phase;
    case 'end':
      return phase === 'playing' || phase === 'paused' ? 'over' : phase;
    case 'restart':
      return phase === 'over' ? 'playing' : phase;
    case 'win':
      return phase === 'playing' ? 'won' : phase;
    case 'continue':
      return phase === 'won' ? 'playing' : phase;
    case 'finish':
      return phase === 'won' ? 'over' : phase;
  }
}

export interface RunStats {
  readonly kills: number;
  readonly bigKills: number;
  readonly photonsFired: number;
  readonly photonHits: number;
  readonly rocketsFired: number;
  readonly earthHits: number;
  readonly wavesCleared: number;
  readonly objectivesMet: number;
  /** Score breakdown (P10): kills at base value, the combo's extra, objectives, wave-clear and Earth bonuses. */
  readonly killPoints: number;
  readonly comboPoints: number;
  readonly objectivePoints: number;
  readonly clearPoints: number;
  readonly earthPoints: number;
  readonly bestCombo: number;
}

export const EMPTY_STATS: RunStats = { kills: 0, bigKills: 0, photonsFired: 0, photonHits: 0, rocketsFired: 0, earthHits: 0, wavesCleared: 0, objectivesMet: 0, killPoints: 0, comboPoints: 0, objectivePoints: 0, clearPoints: 0, earthPoints: 0, bestCombo: 0 };

function addKill(s: RunStats, e: Extract<SimEvent, { type: 'asteroidDestroyed' }>): RunStats {
  return {
    ...s,
    kills: s.kills + 1,
    bigKills: s.bigKills + (e.size === 'small' ? 0 : 1),
    photonHits: s.photonHits + (e.by === 'photon' ? 1 : 0),
    killPoints: s.killPoints + e.base,
    comboPoints: s.comboPoints + e.points - e.base,
    bestCombo: Math.max(s.bestCombo, e.combo),
  };
}

/** The breakdown's total; equals the sim's score (SPEC §6). */
export const breakdownTotal = (s: RunStats): number => s.killPoints + s.comboPoints + s.objectivePoints + s.clearPoints + s.earthPoints;

export function addStats(stats: RunStats, events: readonly SimEvent[]): RunStats {
  let s = stats;
  for (const e of events) {
    if (e.type === 'asteroidDestroyed') s = addKill(s, e);
    else if (e.type === 'asteroidHit') s = { ...s, photonHits: s.photonHits + 1 };
    else if (e.type === 'photonFired') s = { ...s, photonsFired: s.photonsFired + 1 };
    else if (e.type === 'rocketFired') s = { ...s, rocketsFired: s.rocketsFired + 1 };
    else if (e.type === 'earthHit') s = { ...s, earthHits: s.earthHits + 1 };
    else if (e.type === 'waveCleared') s = { ...s, wavesCleared: s.wavesCleared + 1, clearPoints: s.clearPoints + e.clearBonus, earthPoints: s.earthPoints + e.earthBonus };
    else if (e.type === 'objectiveMet') s = { ...s, objectivesMet: s.objectivesMet + 1, objectivePoints: s.objectivePoints + e.points };
  }
  return s;
}

/** Photon accuracy in whole percent; 0 before the first shot. */
export const accuracy = (s: RunStats): number => (s.photonsFired > 0 ? Math.round((100 * s.photonHits) / s.photonsFired) : 0);

export const BEST_KEY = 'asteroid-shooter-3d.best.v1';

/** The stored best score; anything missing, negative or non-numeric reads as 0. */
export function parseBest(raw: string | null): number {
  const n = raw === null ? NaN : Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/** The new best and whether this run set it. A tie is not a new best. */
export function updateBest(best: number, score: number): { best: number; isNew: boolean } {
  return score > best ? { best: score, isNew: true } : { best, isNew: false };
}

/** m:ss from ticks at 25 Hz. */
export function formatTime(ticks: number, tickHz = 25): string {
  const total = Math.max(0, Math.floor(ticks / tickHz));
  return `${String(Math.floor(total / 60))}:${String(total % 60).padStart(2, '0')}`;
}
