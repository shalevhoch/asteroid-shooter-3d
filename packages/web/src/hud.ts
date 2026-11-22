/** HUD v0 (P07): a clean DOM HUD. `hudModel` is the pure part (what to show); `Hud` writes it to the page. */
import { waveLine } from './waveUi.js';
import { EARTH_MAX_HEALTH, FUEL_MAX, HULL_MAX, ROCKET_MAX, THROTTLE_MAX, type GameState } from '@asteroid/sim';

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
  /** Warnings worth flashing. */
  readonly warnings: readonly string[];
}

const frac = (v: number, max: number) => Math.max(0, Math.min(1, v / max));

export function hudModel(s: GameState, best: number): HudModel {
  const warnings: string[] = [];
  if (s.earthHealth <= EARTH_MAX_HEALTH * 0.3) warnings.push('EARTH CRITICAL');
  if (s.ship.hull < HULL_MAX) warnings.push(s.ship.hull <= HULL_MAX * 0.3 ? 'HULL CRITICAL' : 'HULL DAMAGED');
  if (s.ship.fuel === 0) warnings.push('NO FUEL');
  if (s.ship.rockets === 0) warnings.push('NO ROCKETS: RELOAD AT THE MOTHERSHIP');
  return {
    score: s.score,
    best: Math.max(best, s.score),
    earth: frac(s.earthHealth, EARTH_MAX_HEALTH),
    hull: frac(s.ship.hull, HULL_MAX),
    fuel: frac(s.ship.fuel, FUEL_MAX),
    rockets: s.ship.rockets,
    rocketMax: ROCKET_MAX,
    speed: s.ship.turbo ? THROTTLE_MAX + 1 : s.ship.throttle,
    speedMax: THROTTLE_MAX + 1,
    turbo: s.ship.turbo,
    wave: waveLine(s),
    warnings,
  };
}

export class Hud {
  constructor(private readonly root: HTMLElement) {
    root.innerHTML = `
      <div class="tl"><div class="score">0</div><div class="best">best 0</div><div class="wave"></div></div>
      <div class="bars">
        <div class="bar earth"><span>EARTH</span><i></i></div>
        <div class="bar hull"><span>HULL</span><i></i></div>
        <div class="bar fuel"><span>FUEL</span><i></i></div>
      </div>
      <div class="br"><div class="rockets"></div><div class="speed"></div></div>
      <div class="warn"></div>
      <div class="crosshair">+</div>`;
  }

  private q(sel: string): HTMLElement {
    const e = this.root.querySelector<HTMLElement>(sel);
    if (!e) throw new Error(`hud ${sel} missing`);
    return e;
  }

  render(m: HudModel): void {
    this.q('.score').textContent = String(m.score);
    this.q('.best').textContent = `best ${String(m.best)}`;
    this.q('.wave').textContent = m.wave;
    for (const k of ['earth', 'hull', 'fuel'] as const) {
      const bar = this.q(`.bar.${k} i`);
      bar.style.width = `${String(Math.round(m[k] * 100))}%`;
      bar.parentElement?.classList.toggle('low', m[k] <= 0.3);
    }
    this.q('.rockets').textContent = `ROCKETS ${'▲'.repeat(m.rockets)}${'△'.repeat(m.rocketMax - m.rockets)}`;
    this.q('.speed').textContent = `SPEED ${'■'.repeat(m.speed)}${'□'.repeat(m.speedMax - m.speed)}${m.turbo ? ' TURBO' : ''}`;
    this.q('.warn').textContent = m.warnings.join(' · ');
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

  show(visible: boolean): void {
    this.root.style.display = visible ? '' : 'none';
  }
}
