/**
 * Achievements (P16, SPEC §13): twelve unlocks read off a run's sim events and state. Pure: a run-scoped tracker is
 * folded over each tick's `(events, state)` and reports what unlocked that tick. Storing unlocks is the web's job.
 */
import { CAMPAIGN_WAVES } from './waves.js';
import { EARTH_MAX_HEALTH } from './constants.js';
import type { GameState, SimEvent } from './state.js';

export const ACHIEVEMENT_IDS = [
  'firstContact',
  'chainReaction',
  'perfectWave',
  'earthUntouched',
  'closeCall',
  'sharpshooter',
  'lockOn',
  'longHaul',
  'earthIsSafe',
  'photonsOnly',
  'hardened',
  'beyondTheCampaign',
] as const;
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number];

export const CHAIN_REACTION_KILLS = 10;
export const UNTOUCHED_WAVES = 5;
export const CLOSE_CALL_HEALTH = 0.1 * EARTH_MAX_HEALTH;
export const SHARPSHOOTER_STREAK = 20;
export const LOCK_ON_KILLS = 10;
/** Five minutes at the sim's 25 Hz. */
export const LONG_HAUL_TICKS = 5 * 60 * 25;

export const ACHIEVEMENTS: Readonly<Record<AchievementId, { readonly name: string; readonly how: string }>> = {
  firstContact: { name: 'First contact', how: 'Destroy an asteroid.' },
  chainReaction: { name: 'Chain reaction', how: `A ${String(CHAIN_REACTION_KILLS)}-kill combo chain.` },
  perfectWave: { name: 'Perfect wave', how: 'Clear a wave without an Earth hit.' },
  earthUntouched: { name: 'Earth untouched', how: `Clear wave ${String(UNTOUCHED_WAVES)} without an Earth hit all run.` },
  closeCall: { name: 'Close call', how: `Clear a wave with Earth at ${String(CLOSE_CALL_HEALTH)} % or less.` },
  sharpshooter: { name: 'Sharpshooter', how: `${String(SHARPSHOOTER_STREAK)} photon hits in a row, no misses.` },
  lockOn: { name: 'Lock-on', how: `${String(LOCK_ON_KILLS)} rocket kills in one run.` },
  longHaul: { name: 'Long haul', how: 'Survive 5 minutes in one run.' },
  earthIsSafe: { name: 'Earth is safe', how: `Clear all ${String(CAMPAIGN_WAVES)} waves.` },
  photonsOnly: { name: 'Photons only', how: 'Win the campaign without firing a rocket.' },
  hardened: { name: 'Hardened', how: 'Win the campaign on Hard.' },
  beyondTheCampaign: { name: 'Beyond the campaign', how: 'Clear a wave in endless mode.' },
};

/** Run-scoped progress: start a fresh one with each run. */
export interface AchievementRun {
  readonly earthHits: number;
  readonly waveEarthHits: number;
  readonly rocketsFired: number;
  readonly rocketKills: number;
  readonly photonStreak: number;
  /** Photons in flight that haven't hit yet, sorted. A photon that leaves without hitting is a miss. */
  readonly photonsInFlight: readonly number[];
}

export const NEW_RUN: AchievementRun = { earthHits: 0, waveEarthHits: 0, rocketsFired: 0, rocketKills: 0, photonStreak: 0, photonsInFlight: [] };

type Counts = { earthHits: number; waveEarthHits: number; rocketsFired: number; rocketKills: number };

/** Run tallies from one event. */
function count(c: Counts, e: SimEvent): void {
  if (e.type === 'earthHit') {
    c.earthHits++;
    c.waveEarthHits++;
  } else if (e.type === 'waveStarted') c.waveEarthHits = 0;
  else if (e.type === 'rocketFired') c.rocketsFired++;
  else if (e.type === 'asteroidDestroyed' && e.by === 'rocket') c.rocketKills++;
}

/** Unlocks one event earns, given the tallies so far this tick. */
function earned(c: Counts, e: SimEvent, events: readonly SimEvent[], state: GameState, got: Set<AchievementId>): void {
  if (e.type === 'asteroidDestroyed') {
    got.add('firstContact');
    if (e.combo >= CHAIN_REACTION_KILLS) got.add('chainReaction');
  } else if (e.type === 'waveCleared') cleared(c, e, events, state, got);
  else if (e.type === 'campaignWon') {
    got.add('earthIsSafe');
    if (c.rocketsFired === 0) got.add('photonsOnly');
    if (state.difficulty === 'hard') got.add('hardened');
  }
}

function cleared(c: Counts, e: Extract<SimEvent, { type: 'waveCleared' }>, events: readonly SimEvent[], state: GameState, got: Set<AchievementId>): void {
  if (c.waveEarthHits === 0) got.add('perfectWave');
  if (e.wave >= UNTOUCHED_WAVES && c.earthHits === 0) got.add('earthUntouched');
  // Earth before this clear's objective repair and regen: the health the wave was fought down to.
  if (state.earthHealth - e.regen - (e.objectiveMet ? repairOf(events, e.wave) : 0) <= CLOSE_CALL_HEALTH) got.add('closeCall');
  if (e.wave > CAMPAIGN_WAVES) got.add('beyondTheCampaign');
}

/** Photon outcomes, in id order: a hit extends the streak, a photon gone without a hit ends it. */
function photons(run: AchievementRun, events: readonly SimEvent[], state: GameState, got: Set<AchievementId>): { streak: number; inFlight: number[] } {
  const inFlight = new Set(run.photonsInFlight);
  const hits = new Set<number>();
  for (const e of events) {
    if (e.type === 'photonFired') inFlight.add(e.id);
    else if (e.type === 'projectileSpent' && e.kind === 'photon' && e.on === 'asteroid') hits.add(e.id);
  }
  const live = new Set(state.projectiles.filter((p) => p.kind === 'photon').map((p) => p.id));
  let streak = run.photonStreak;
  const left: number[] = [];
  for (const id of [...inFlight].sort((a, b) => a - b)) {
    if (hits.has(id)) {
      streak++;
      if (streak >= SHARPSHOOTER_STREAK) got.add('sharpshooter');
    } else if (!live.has(id)) streak = 0;
    else left.push(id);
  }
  return { streak, inFlight: left };
}

/** Folds one tick into the run and returns what unlocked this tick (each id at most once, in list order). */
export function trackAchievements(run: AchievementRun, events: readonly SimEvent[], state: GameState): { run: AchievementRun; unlocked: AchievementId[] } {
  const got = new Set<AchievementId>();
  const c: Counts = { earthHits: run.earthHits, waveEarthHits: run.waveEarthHits, rocketsFired: run.rocketsFired, rocketKills: run.rocketKills };
  for (const e of events) {
    count(c, e);
    earned(c, e, events, state, got);
  }
  const p = photons(run, events, state, got);
  if (c.rocketKills >= LOCK_ON_KILLS) got.add('lockOn');
  if (state.tick >= LONG_HAUL_TICKS && state.ended === null) got.add('longHaul');
  return { run: { ...c, photonStreak: p.streak, photonsInFlight: p.inFlight }, unlocked: ACHIEVEMENT_IDS.filter((id) => got.has(id)) };
}

const repairOf = (events: readonly SimEvent[], wave: number): number => {
  for (const e of events) if (e.type === 'objectiveMet' && e.wave === wave) return e.repair;
  return 0;
};
