/**
 * Credits and the station shop (P29, SPEC §6b): credits are earned from score events and spent between waves on
 * per-ship upgrades. Everything here is pure; the shop only sells while a wave is in its lead-in.
 */
import { PHOTON_COOLDOWN } from './constants.js';
import { CRAFTS, type Craft } from './crafts.js';
import { RAPID_FIRE_COOLDOWN } from './perks.js';
import type { GameState, SimEvent } from './state.js';

export const UPGRADE_IDS = ['damage', 'fireRate', 'hull', 'shield', 'speed', 'perkTime'] as const;
export type UpgradeId = (typeof UPGRADE_IDS)[number];
export type Upgrades = Readonly<Record<UpgradeId, number>>;
export const NO_UPGRADES: Upgrades = { damage: 0, fireRate: 0, hull: 0, shield: 0, speed: 0, perkTime: 0 };

/** Every upgrade caps at this level. */
export const UPGRADE_MAX = 3;
/** The price of level 1, 2 and 3. */
export const UPGRADE_PRICES: readonly number[] = [100, 250, 450];
/** Points per credit: a kill worth 30 points earns 3 credits. */
export const POINTS_PER_CREDIT = 10;
/** Hull added per hull level. */
export const HULL_PER_LEVEL = 20;
/** Earth-shield ticks at each wave start per shield level (3 s). */
export const SHIELD_TICKS_PER_LEVEL = 75;
/** Forward speed added per speed level. */
export const SPEED_PER_LEVEL = 0.1;
/** Timed-perk duration added per perk-time level. */
export const PERK_TIME_PER_LEVEL = 0.2;

const level = (n: number): number => (Number.isFinite(n) ? Math.max(0, Math.min(UPGRADE_MAX, Math.floor(n))) : 0);

/** Any stored value read back as valid levels (missing, bad or out-of-range levels become 0 or the cap). */
export function parseUpgrades(raw: unknown): Upgrades {
  const o = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(UPGRADE_IDS.map((id) => [id, level(Number(o[id] ?? 0))])) as Record<UpgradeId, number>;
}

/** The price of the next level, or null at the cap. */
export function priceOf(upgrades: Upgrades, id: UpgradeId): number | null {
  return UPGRADE_PRICES[upgrades[id]] ?? null;
}

/** The shop is open in a wave's lead-in (before wave 1 too) while the run is live. */
export const shopOpen = (s: GameState): boolean => s.wave.phase === 'leadIn' && s.ended === null;

/** Buys the next level of `id` if the shop is open, it isn't capped and the credits cover it; else returns `s` unchanged. */
export function buyUpgrade(s: GameState, id: UpgradeId): GameState {
  const price = priceOf(s.upgrades, id);
  if (price === null || price > s.credits || !shopOpen(s)) return s;
  const upgrades = { ...s.upgrades, [id]: s.upgrades[id] + 1 };
  const ship = id === 'hull' ? { ...s.ship, hull: s.ship.hull + HULL_PER_LEVEL } : s.ship;
  return { ...s, credits: s.credits - price, upgrades, ship };
}

/** The craft's stats with hull upgrades applied. */
export function upgradedCraft(s: Pick<GameState, 'craft' | 'upgrades'>): Craft {
  const c = CRAFTS[s.craft];
  return { ...c, hullMax: c.hullMax + HULL_PER_LEVEL * s.upgrades.hull };
}

export const photonDamage = (u: Upgrades): number => 1 + u.damage;
/** Ticks between photons: 5, 4, 3, 2 by level; rapid fire stays the floor. */
export const photonCooldown = (u: Upgrades, rapid: boolean): number => (rapid ? RAPID_FIRE_COOLDOWN : Math.max(RAPID_FIRE_COOLDOWN, PHOTON_COOLDOWN - u.fireRate));
export const speedScale = (u: Upgrades): number => 1 + SPEED_PER_LEVEL * u.speed;
export const perkTicks = (base: number, u: Upgrades): number => Math.round(base * (1 + PERK_TIME_PER_LEVEL * u.perkTime));

/** Credits a tick's events earn: kills and objectives by points, wave clears by their bonuses. */
export function creditsFor(events: readonly SimEvent[]): number {
  let points = 0;
  for (const e of events) {
    if (e.type === 'asteroidDestroyed' || e.type === 'objectiveMet') points += e.points;
    else if (e.type === 'waveCleared') points += e.clearBonus + e.earthBonus;
  }
  const bonus = events.reduce((n, e) => n + (e.type === 'missionComplete' ? e.credits : 0), 0);
  return Math.floor(points / POINTS_PER_CREDIT) + bonus;
}

/** End of a tick: bank its credits (unless the run doesn't earn) and raise the wave-start Earth shield. */
export function applyUpgrades(s: GameState, events: readonly SimEvent[]): GameState {
  const credits = s.earnsCredits ? s.credits + creditsFor(events) : s.credits;
  const shield = s.upgrades.shield > 0 && events.some((e) => e.type === 'waveStarted') ? Math.max(s.perks.shield, SHIELD_TICKS_PER_LEVEL * s.upgrades.shield) : s.perks.shield;
  return credits === s.credits && shield === s.perks.shield ? s : { ...s, credits, perks: { ...s.perks, shield } };
}
