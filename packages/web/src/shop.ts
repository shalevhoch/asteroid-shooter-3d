/** The station shop (P29): the saved wallet and the shop panel. Credits are global; upgrades are saved per ship. */
import { t, type Lang } from './i18n.js';
import { CRAFT_IDS, UPGRADE_IDS, UPGRADE_MAX, parseUpgrades, priceOf, type CraftId, type GameState, type RunOptions, type UpgradeId, type Upgrades } from '@asteroid/sim';

export const WALLET_KEY = 'asteroid-shooter-3d.wallet.v1';

export interface Wallet {
  readonly credits: number;
  readonly upgrades: Readonly<Record<CraftId, Upgrades>>;
}

const credits = (v: unknown): number => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** The stored wallet, or an empty one for missing or broken data. */
export function parseWallet(raw: string | null): Wallet {
  let o: Record<string, unknown> = {};
  try {
    const v: unknown = JSON.parse(raw ?? '{}');
    if (typeof v === 'object' && v !== null) o = v as Record<string, unknown>;
  } catch {
    o = {};
  }
  const u = typeof o['upgrades'] === 'object' && o['upgrades'] !== null ? (o['upgrades'] as Record<string, unknown>) : {};
  return { credits: credits(o['credits']), upgrades: Object.fromEntries(CRAFT_IDS.map((c) => [c, parseUpgrades(u[c])])) as Record<CraftId, Upgrades> };
}

/** What a normal run of `craft` starts with. */
export const runOptions = (w: Wallet, craft: CraftId): RunOptions => ({ credits: w.credits, upgrades: w.upgrades[craft] });

/** The wallet after a run's credits and buys; runs that don't earn (the daily) leave it as it was. */
export function withRun(w: Wallet, s: GameState): Wallet {
  if (!s.earnsCredits) return w;
  return { credits: s.credits, upgrades: { ...w.upgrades, [s.craft]: s.upgrades } };
}

export const UPGRADE_LABELS: Readonly<Record<UpgradeId, { readonly name: string; readonly blurb: string }>> = {
  damage: { name: 'Photon damage', blurb: '+1 damage per photon hit' },
  fireRate: { name: 'Fire rate', blurb: 'photons recharge 1 tick faster' },
  hull: { name: 'Hull plating', blurb: '+20 hull' },
  shield: { name: 'Earth shield', blurb: '3 s of shield at each wave start' },
  speed: { name: 'Engines', blurb: '+10 % forward speed' },
  perkTime: { name: 'Perk duration', blurb: 'timed perks last 20 % longer' },
  missiles: { name: 'Lock-on missiles', blurb: 'hold rocket to lock +1 target per level' },
};

const pips = (n: number): string => '●'.repeat(n) + '○'.repeat(UPGRADE_MAX - n);

/** The shop panel: one button per upgrade (key 1–7), greyed out when capped or too dear. */
export function shopPanel(s: GameState, lang: Lang = 'en'): string {
  const rows = UPGRADE_IDS.map((id, i) => {
    const price = priceOf(s.upgrades, id);
    const label = UPGRADE_LABELS[id];
    const cost = price === null ? 'MAX' : `◆ ${String(price)}`;
    const off = price === null || price > s.credits ? ' disabled' : '';
    return `<button class="buy" data-buy="${id}"${off}><b>${String(i + 1)}</b> ${t(lang, label.name)} <span class="pips">${pips(s.upgrades[id])}</span> <span class="cost">${cost}</span><br><small>${t(lang, label.blurb)}</small></button>`;
  }).join('');
  return `<div class="shop"><h2>${t(lang, '🛰️ Station shop · ◆ {credits} credits', { credits: s.credits })}</h2><div class="buys">${rows}</div><p class="dim">${t(lang, '1–7 or click buys · upgrades stay with this ship · B or Enter flies on')}</p></div>`;
}

/** The upgrade a digit key buys, if any. */
export const upgradeForKey = (code: string): UpgradeId | null => UPGRADE_IDS[Number(code.replace('Digit', '')) - 1] ?? null;
