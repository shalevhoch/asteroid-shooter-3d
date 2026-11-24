/** HUD v0 (P07): a clean DOM HUD. `hudModel` is the pure part (what to show); `Hud` writes it to the page. */
import { waveLine } from './waveUi.js';
import { t, type Lang } from './i18n.js';
import { activePerkLine } from './perksUi.js';
import { formatImpact, urgency, type Urgency } from './threat.js';
import { hpOf, missileVolley, shopOpen, upgradedCraft, comboLive, comboMultiplier, mostUrgent, EARTH_MAX_HEALTH, THROTTLE_MAX, type GameState } from '@asteroid/sim';

export interface HudModel {
  readonly score: number;
  readonly best: number;
  /** 0..1 fractions for the bars. */
  readonly earth: number;
  readonly hull: number;
  readonly fuel: number;
  readonly rockets: number;
  readonly rocketMax: number;
  /** 0..THROTTLE_MAX, or THROTTLE_MAX + 1 while the turbo is moving the ship. */
  readonly speed: number;
  readonly speedMax: number;
  readonly turbo: boolean;
  /** "WAVE 3/10 · Rocket kills 1/2" (P08). */
  readonly wave: string;
  /** "COMBO 3 · next ×2" while a chain of 2+ kills is live (P10); empty otherwise. */
  readonly combo: string;
  /** The soonest Earth impact (P09), or null with no asteroids. */
  readonly impact: { readonly text: string; readonly urgency: Urgency } | null;
  /** Active perks with seconds left (P26), e.g. "SHIELD 8s · MAGNET 12s"; empty with none. */
  readonly perks: string;
  /** "VOLLEY ×3" with missiles bought, "LOCKING 2/3" while gathering locks (P32); empty otherwise. */
  readonly missiles: string;
  /** The boss's health 0..1 while one is alive (P34), else null. */
  readonly boss: number | null;
  /** "◆ 120" (P29), with the shop key while the shop is open; empty for runs that don't earn. */
  readonly credits: string;
  /** Warnings worth flashing. */
  readonly warnings: readonly string[];
}

const frac = (v: number, max: number) => Math.max(0, Math.min(1, v / max));

function impactOf(s: GameState): HudModel['impact'] {
  const u = mostUrgent(s.asteroids);
  return u ? { text: `IMPACT ${formatImpact(u.ticks)}`, urgency: urgency(u.ticks) } : null;
}

function bossHealth(s: GameState): number | null {
  const b = s.asteroids.find((a) => a.size === 'boss');
  return b ? frac(b.hp, hpOf('boss')) : null;
}

function missileLine(s: GameState): string {
  if (s.upgrades.missiles === 0) return '';
  const n = missileVolley(s.upgrades);
  return s.missileLock ? `LOCKING ${String(s.missileLock.ids.length)}/${String(n)}` : `VOLLEY ×${String(n)}`;
}

export function hudModel(s: GameState, best: number): HudModel {
  const warnings: string[] = [];
  const { hullMax, fuelMax, rocketMax } = upgradedCraft(s);
  if (s.earthHealth <= EARTH_MAX_HEALTH * 0.3) warnings.push('EARTH CRITICAL');
  if (s.ship.hull < hullMax) warnings.push(s.ship.hull <= hullMax * 0.3 ? 'HULL CRITICAL' : 'HULL DAMAGED');
  if (s.ship.fuel === 0) warnings.push('NO FUEL');
  if (s.ship.rockets === 0) warnings.push('NO ROCKETS: RELOAD AT THE MOTHERSHIP OR STATION');
  return {
    score: s.score,
    best: Math.max(best, s.score),
    earth: frac(s.earthHealth, EARTH_MAX_HEALTH),
    hull: frac(s.ship.hull, hullMax),
    fuel: frac(s.ship.fuel, fuelMax),
    rockets: s.ship.rockets,
    rocketMax,
    speed: s.ship.turbo ? THROTTLE_MAX + 1 : s.ship.throttle,
    speedMax: THROTTLE_MAX + 1,
    turbo: s.ship.turbo,
    wave: waveLine(s),
    impact: impactOf(s),
    combo: comboLive(s.combo, s.tick) && s.combo.count >= 2 ? `COMBO ${String(s.combo.count)} · next ×${String(comboMultiplier(s.combo.count + 1))}` : '',
    perks: activePerkLine(s.perks),
    missiles: missileLine(s),
    boss: bossHealth(s),
    credits: s.earnsCredits ? `◆ ${String(s.credits)}${shopOpen(s) ? ' · B: STATION SHOP' : ''}` : '',
    warnings,
  };
}

/** The HUD's English wave line in Hebrew (P36): the fixed words only; mission progress stays as written. */
export function localWaveLine(line: string, lang: Lang): string {
  if (lang === 'en') return line;
  return line.replace('next wave incoming', 'הגל הבא בדרך').replace('incoming', 'בדרך').replace(/^WAVE /, 'גל ').replace(/^ENDLESS /, 'אינסופי ');
}

export class Hud {
  private lang: Lang = 'en';

  /** Switches the HUD's language (P36). */
  setLang(lang: Lang): void {
    this.lang = lang;
    for (const k of ['earth', 'hull', 'fuel'] as const) this.q(`.bar.${k} span`).textContent = t(lang, k.toUpperCase());
  }

  constructor(private readonly root: HTMLElement) {
    root.innerHTML = `
      <div class="tl"><div class="score">0</div><div class="best">best 0</div><div class="credits"></div><div class="wave"></div><div class="combo"></div><div class="perks"></div></div>
      <div class="bars">
        <div class="bar earth"><span>EARTH</span><i></i></div>
        <div class="bar hull"><span>HULL</span><i></i></div>
        <div class="bar fuel"><span>FUEL</span><i></i></div>
      </div>
      <div class="br"><div class="rockets"></div><div class="speed"></div></div>
      <div class="bossbar"><span>BOSS</span><i></i></div>
      <div class="impact"></div>
      <div class="warn"></div>
      <div class="crosshair"><span class="ch">+</span><span class="hitmark">✕</span><span class="badge"></span></div>`;
  }

  private q(sel: string): HTMLElement {
    const e = this.root.querySelector<HTMLElement>(sel);
    if (!e) throw new Error(`hud ${sel} missing`);
    return e;
  }

  render(m: HudModel): void {
    this.q('.score').textContent = String(m.score);
    const L = this.lang;
    this.q('.best').textContent = t(L, 'best {best}', { best: m.best });
    this.q('.wave').textContent = localWaveLine(m.wave, L);
    this.q('.combo').textContent = m.combo;
    this.q('.perks').textContent = m.perks;
    this.q('.credits').textContent = m.credits.replace('B: STATION SHOP', t(L, 'B: STATION SHOP'));
    const boss = this.q('.bossbar');
    boss.style.display = m.boss === null ? 'none' : '';
    if (m.boss !== null) this.q('.bossbar i').style.width = `${String(Math.round(m.boss * 100))}%`;
    for (const k of ['earth', 'hull', 'fuel'] as const) {
      const bar = this.q(`.bar.${k} i`);
      bar.style.width = `${String(Math.round(m[k] * 100))}%`;
      bar.parentElement?.classList.toggle('low', m[k] <= 0.3);
    }
    this.q('.rockets').textContent = `${m.missiles ? `${m.missiles} · ` : ''}${t(L, 'ROCKETS')} ${'▲'.repeat(m.rockets)}${'△'.repeat(Math.max(0, m.rocketMax - m.rockets))}`;
    this.q('.speed').textContent = `${t(L, 'SPEED')} ${'■'.repeat(m.speed)}${'□'.repeat(m.speedMax - m.speed)}${m.turbo ? ` ${t(L, 'TURBO')}` : ''}`;
    this.q('.warn').textContent = m.warnings.map((w) => t(L, w)).join(' · ');
    const impact = this.q('.impact');
    impact.textContent = m.impact?.text ?? '';
    impact.dataset['urgency'] = m.impact?.urgency ?? '';
  }

  /** Places the crosshair where the line of fire is, `ndc` in [−1, 1]² (null hides it, e.g. behind the camera). */
  aim(ndc: { x: number; y: number } | null): void {
    const c = this.q('.crosshair');
    c.style.display = ndc ? '' : 'none';
    if (ndc) {
      c.style.left = `${String(((ndc.x + 1) / 2) * 100)}%`;
      c.style.top = `${String(((1 - ndc.y) / 2) * 100)}%`;
    }
  }

  /** Flashes the hit marker (P30): a white ✕ for a chip, a bigger orange one for a kill. */
  marker(kind: 'kill' | 'hit'): void {
    const m = this.q('.hitmark');
    m.className = `hitmark ${kind}`;
    m.animate([{ opacity: 1, transform: 'scale(1.35)' }, { opacity: 0, transform: 'scale(0.9)' }], { duration: kind === 'kill' ? 260 : 160, easing: 'ease-out' });
  }

  /** The combo badge beside the crosshair (P30). */
  badge(b: { readonly text: string; readonly scale: number }): void {
    const e = this.q('.badge');
    if (e.textContent !== b.text) e.textContent = b.text;
    e.style.transform = `translateY(-50%) scale(${b.scale.toFixed(2)})`;
  }

  show(visible: boolean): void {
    this.root.style.display = visible ? '' : 'none';
  }
}
