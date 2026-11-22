/**
 * Waves, objectives and difficulty presets (SPEC §10). Data first: the campaign table, the endless formula and the
 * presets are plain values; `updateWaves` (tick step 3) and `trackWave` (end of tick) are the only logic.
 */
import { ASTEROID_SPEED, BIG_CHANCE, EARTH_MAX_HEALTH, ROCKET_LOCK_CONE, SPAWN_INTERVAL, SPAWN_SPREAD_MAX, SPAWN_SPREAD_MIN, SPAWN_X } from './constants.js';
import { makeAsteroid } from './asteroids.js';
import { nextFloat, nextRange } from './rng.js';
import { clearBonus, earthBonus } from './scoring.js';
import type { AsteroidSize, GameState, SimEvent } from './state.js';

export type Difficulty = 'kid' | 'normal' | 'hard';
export const DIFFICULTIES: readonly Difficulty[] = ['kid', 'normal', 'hard'];

export interface Preset {
  /** × every wave's asteroid speed. */
  readonly speedScale: number;
  /** × every wave's spawn interval (bigger = calmer). */
  readonly intervalScale: number;
  /** × Earth damage per impact (rounded, at least 1). */
  readonly earthDamageScale: number;
  /** Earth health restored at every wave clear, capped at EARTH_MAX_HEALTH. */
  readonly earthRegen: number;
  /** Rocket crosshair lock cone (radians). */
  readonly rocketLockCone: number;
  /** Fuel spent per turbo tick. */
  readonly fuelDrain: number;
}

/** Normal is the P01–P07 tuning; Kid/Easy is the gentle one from the issue (#29). */
export const PRESETS: Readonly<Record<Difficulty, Preset>> = {
  kid: { speedScale: 0.6, intervalScale: 1.4, earthDamageScale: 0.5, earthRegen: 20, rocketLockCone: (60 * Math.PI) / 180, fuelDrain: 0 },
  normal: { speedScale: 1, intervalScale: 1, earthDamageScale: 1, earthRegen: 0, rocketLockCone: ROCKET_LOCK_CONE, fuelDrain: 1 },
  hard: { speedScale: 1.25, intervalScale: 0.8, earthDamageScale: 1.5, earthRegen: 0, rocketLockCone: ROCKET_LOCK_CONE, fuelDrain: 1 },
};

export type Objective =
  | { readonly kind: 'noEarthHit' }
  | { readonly kind: 'rocketKills'; readonly count: number }
  | { readonly kind: 'bigKills'; readonly count: number }
  | { readonly kind: 'photonOnly' };

export interface WaveDef {
  /** Asteroids spawned in the wave. */
  readonly count: number;
  /** Ticks between spawns (before the preset's intervalScale). */
  readonly interval: number;
  /** Units per tick (before the preset's speedScale). */
  readonly speed: number;
  readonly bigChance: number;
  readonly objective: Objective | null;
}

export const CAMPAIGN_WAVES = 10;
/** Ticks between a wave clear and the next wave's first asteroid. */
export const BREATHER_TICKS = 125;
/** Points for meeting a wave's objective: base + per wave number. */
export const OBJECTIVE_POINTS_BASE = 50;
export const OBJECTIVE_POINTS_PER_WAVE = 10;
/** Earth health an objective repairs. */
export const OBJECTIVE_REPAIR = 10;
/** Endless-mode caps. */
export const ENDLESS_MIN_INTERVAL = 50;
export const ENDLESS_MAX_SPEED = 2 * ASTEROID_SPEED;
export const ENDLESS_MAX_BIG = 0.6;

const OBJECTIVES: readonly (Objective | null)[] = [
  null,
  { kind: 'noEarthHit' },
  { kind: 'rocketKills', count: 2 },
  { kind: 'bigKills', count: 2 },
  { kind: 'noEarthHit' },
  { kind: 'photonOnly' },
  { kind: 'rocketKills', count: 3 },
  { kind: 'noEarthHit' },
  { kind: 'bigKills', count: 4 },
  { kind: 'noEarthHit' },
];

/** Wave `n` (1-based). Wave 1 is the original's pace; each wave adds 2 asteroids and gets a little faster, denser and bigger. */
export function waveDef(n: number): WaveDef {
  const i = Math.max(0, Math.floor(n) - 1);
  return {
    count: 5 + 2 * i,
    interval: Math.max(ENDLESS_MIN_INTERVAL, SPAWN_INTERVAL - 14 * i),
    speed: Math.min(ENDLESS_MAX_SPEED, ASTEROID_SPEED * (1 + 0.05 * i)),
    bigChance: Math.min(ENDLESS_MAX_BIG, BIG_CHANCE + 0.03 * i),
    objective: OBJECTIVES[i % OBJECTIVES.length] ?? null,
  };
}

export type WavePhase = 'leadIn' | 'active';

export interface WaveState {
  readonly number: number;
  readonly phase: WavePhase;
  /** leadIn: ticks until the wave starts. active: ticks until the next spawn. */
  readonly timer: number;
  readonly spawned: number;
  /** This wave's tallies, for its objective. */
  readonly earthHits: number;
  readonly rocketKills: number;
  readonly bigKills: number;
  readonly rocketsFired: number;
}

/** Wave 1 starts SPAWN_INTERVAL ticks into the run, so the first asteroid arrives at the original's tick 200. */
export const INITIAL_WAVE: WaveState = { number: 1, phase: 'leadIn', timer: SPAWN_INTERVAL, spawned: 0, earthHits: 0, rocketKills: 0, bigKills: 0, rocketsFired: 0 };

export function objectiveMet(o: Objective | null, w: WaveState): boolean {
  if (!o) return false;
  switch (o.kind) {
    case 'noEarthHit':
      return w.earthHits === 0;
    case 'rocketKills':
      return w.rocketKills >= o.count;
    case 'bigKills':
      return w.bigKills >= o.count;
    case 'photonOnly':
      return w.rocketsFired === 0;
  }
}

/** A short player-facing line for an objective. */
export function describeObjective(o: Objective | null): string {
  if (!o) return '';
  switch (o.kind) {
    case 'noEarthHit':
      return 'Let nothing hit Earth';
    case 'rocketKills':
      return `Destroy ${String(o.count)} asteroids with rockets`;
    case 'bigKills':
      return `Destroy ${String(o.count)} big asteroids`;
    case 'photonOnly':
      return 'Photons only: fire no rockets';
  }
}

const scaledInterval = (def: WaveDef, p: Preset) => Math.max(1, Math.round(def.interval * p.intervalScale));

function spawnOne(state: GameState, def: WaveDef, preset: Preset, events: SimEvent[]): GameState {
  const [y, r1] = nextRange(state.rng, SPAWN_SPREAD_MIN, SPAWN_SPREAD_MAX);
  const [z, r2] = nextRange(r1, SPAWN_SPREAD_MIN, SPAWN_SPREAD_MAX);
  const [roll, r3] = nextFloat(r2);
  const size: AsteroidSize = roll < def.bigChance ? 'big' : 'small';
  const a = makeAsteroid(state.nextId, size, [SPAWN_X, y, z], def.speed * preset.speedScale);
  events.push({ type: 'asteroidSpawned', id: a.id, size });
  return { ...state, rng: r3, asteroids: [...state.asteroids, a], nextId: state.nextId + 1 };
}

/** Tick step 3: run the lead-in, spawn on schedule, and close the wave once it's fully spawned and cleared. */
export function updateWaves(state: GameState, events: SimEvent[]): GameState {
  const preset = PRESETS[state.difficulty];
  const w = state.wave;
  const def = waveDef(w.number);
  if (w.phase === 'leadIn') {
    if (w.timer > 1) return { ...state, wave: { ...w, timer: w.timer - 1 } };
    events.push({ type: 'waveStarted', wave: w.number, count: def.count, objective: def.objective });
    const s = spawnOne(state, def, preset, events);
    return { ...s, wave: { ...w, phase: 'active', timer: scaledInterval(def, preset), spawned: 1 } };
  }
  if (w.spawned < def.count) {
    if (w.timer > 1) return { ...state, wave: { ...w, timer: w.timer - 1 } };
    const s = spawnOne(state, def, preset, events);
    return { ...s, wave: { ...w, timer: scaledInterval(def, preset), spawned: w.spawned + 1 } };
  }
  if (state.asteroids.length > 0) return state;
  return clearWave(state, def, preset, events);
}

function clearWave(state: GameState, def: WaveDef, preset: Preset, events: SimEvent[]): GameState {
  const w = state.wave;
  const met = objectiveMet(def.objective, w);
  const bonus = clearBonus(w.number);
  const earth = earthBonus(state.earthHealth);
  let score = state.score + bonus + earth;
  let earthHealth = state.earthHealth;
  if (met) {
    const points = OBJECTIVE_POINTS_BASE + OBJECTIVE_POINTS_PER_WAVE * w.number;
    const repair = Math.min(OBJECTIVE_REPAIR, EARTH_MAX_HEALTH - earthHealth);
    score += points;
    earthHealth += repair;
    events.push({ type: 'objectiveMet', wave: w.number, points, repair });
  }
  const regen = Math.min(preset.earthRegen, EARTH_MAX_HEALTH - earthHealth);
  earthHealth += regen;
  events.push({ type: 'waveCleared', wave: w.number, objectiveMet: met, regen, clearBonus: bonus, earthBonus: earth });
  if (w.number === CAMPAIGN_WAVES) events.push({ type: 'campaignWon', wave: w.number });
  const next: WaveState = { ...INITIAL_WAVE, number: w.number + 1, timer: BREATHER_TICKS };
  return { ...state, score, earthHealth, wave: next };
}

/** End of tick: fold this tick's events into the current wave's objective tallies. */
export function trackWave(state: GameState, events: readonly SimEvent[]): GameState {
  let w = state.wave;
  for (const e of events) {
    if (e.type === 'earthHit') w = { ...w, earthHits: w.earthHits + 1 };
    else if (e.type === 'rocketFired') w = { ...w, rocketsFired: w.rocketsFired + 1 };
    else if (e.type === 'asteroidDestroyed') w = { ...w, rocketKills: w.rocketKills + (e.by === 'rocket' ? 1 : 0), bigKills: w.bigKills + (e.size === 'big' ? 1 : 0) };
  }
  return w === state.wave ? state : { ...state, wave: w };
}
