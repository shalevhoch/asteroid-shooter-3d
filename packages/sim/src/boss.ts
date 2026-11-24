/**
 * Boss waves (P34, SPEC §10): every 5th wave opens with a boss asteroid: huge, slow, 120 hp, chipped by rockets and
 * bombs, and shedding a small asteroid toward Earth every 5 s. Defeating it pays bonus credits. No RNG is used, so the
 * game's random streams are untouched.
 */
import { BOSS_CALVE_TICKS, BOSS_CREDITS, BOSS_EVERY, BOSS_RADIUS, BOSS_SPEED_SCALE, SPAWN_X } from './constants.js';
import { makeAsteroid } from './asteroids.js';
import type { GameState, SimEvent } from './state.js';
import { add, type Vec3 } from './vec3.js';

export const isBossWave = (n: number): boolean => n > 0 && n % BOSS_EVERY === 0;

/** Where a boss enters: on the spawn plane, centred. */
export const BOSS_SPAWN: Vec3 = [SPAWN_X, 0, 0];

/** Spawns wave `wave`'s boss at `speed` (the wave's asteroid speed, before the boss scale). */
export function spawnBoss(s: GameState, wave: number, speed: number, events: SimEvent[]): GameState {
  const boss = makeAsteroid(s.nextId, 'boss', BOSS_SPAWN, speed * BOSS_SPEED_SCALE);
  events.push({ type: 'asteroidSpawned', id: boss.id, size: 'boss' }, { type: 'bossSpawned', id: boss.id, wave });
  return { ...s, asteroids: [...s.asteroids, boss], nextId: s.nextId + 1 };
}

/** The boss's attack: every BOSS_CALVE_TICKS it sheds a small asteroid from its rim, alternating above and below. */
export function bossAttack(s: GameState, events: SimEvent[]): GameState {
  if (s.tick % BOSS_CALVE_TICKS !== 0) return s;
  let out = s;
  for (const b of s.asteroids) {
    if (b.size !== 'boss') continue;
    const side = (s.tick / BOSS_CALVE_TICKS) % 2 === 0 ? 1 : -1;
    const calf = makeAsteroid(out.nextId, 'small', add(b.pos, [0, side * BOSS_RADIUS * 1.3, 0]), b.speed * 2.2);
    events.push({ type: 'asteroidSpawned', id: calf.id, size: 'small' }, { type: 'bossCalved', id: calf.id, from: b.id });
    out = { ...out, asteroids: [...out.asteroids, calf], nextId: out.nextId + 1 };
  }
  return out;
}

/** End of tick: a destroyed boss raises bossDefeated with its bonus credits. */
export function bossDefeats(s: GameState, events: SimEvent[]): void {
  for (const e of [...events]) if (e.type === 'asteroidDestroyed' && e.size === 'boss') events.push({ type: 'bossDefeated', id: e.id, wave: s.wave.number, credits: BOSS_CREDITS });
}
