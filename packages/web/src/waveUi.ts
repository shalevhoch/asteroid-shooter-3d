/** Wave UI (P08): banners for wave events, the HUD's wave line, difficulty labels. Pure, so it's tested. */
import { CAMPAIGN_WAVES, describeObjective, waveDef, type Difficulty, type GameState, type Objective, type SimEvent, type WaveState } from '@asteroid/sim';

export interface Banner {
  readonly title: string;
  readonly subtitle: string;
  readonly durationMs: number;
}

/** The banner a tick's events raise, if any; the last relevant event wins. */
export function bannerFor(events: readonly SimEvent[]): Banner | null {
  let banner: Banner | null = null;
  let bonus = '';
  for (const e of events) {
    if (e.type === 'objectiveMet') bonus = `Objective met: +${String(e.points)} points${e.repair > 0 ? `, Earth +${String(e.repair)}` : ''}`;
    else if (e.type === 'waveCleared') {
      const regen = e.regen > 0 ? `Earth regenerates +${String(e.regen)}` : '';
      banner = { title: `Wave ${String(e.wave)} cleared`, subtitle: [bonus, regen].filter(Boolean).join(' · ') || 'Get ready…', durationMs: 3500 };
    } else if (e.type === 'waveStarted') {
      const label = e.wave > CAMPAIGN_WAVES ? `Endless wave ${String(e.wave)}` : `Wave ${String(e.wave)} of ${String(CAMPAIGN_WAVES)}`;
      banner = { title: label, subtitle: `${String(e.count)} asteroids${e.objective ? ` · ${describeObjective(e.objective)}` : ''}`, durationMs: 3000 };
    }
  }
  return banner;
}

/** Objective progress for the HUD, e.g. "Rocket kills 1/2"; empty when the wave has no objective. */
export function objectiveProgress(o: Objective | null, w: WaveState): string {
  if (!o) return '';
  switch (o.kind) {
    case 'noEarthHit':
      return w.earthHits === 0 ? 'No Earth hits ✓' : 'No Earth hits ✗';
    case 'rocketKills':
      return `Rocket kills ${String(Math.min(w.rocketKills, o.count))}/${String(o.count)}`;
    case 'bigKills':
      return `Big kills ${String(Math.min(w.bigKills, o.count))}/${String(o.count)}`;
    case 'photonOnly':
      return w.rocketsFired === 0 ? 'Photons only ✓' : 'Photons only ✗';
  }
}

/** "WAVE 3/10 · Rocket kills 1/2", or "ENDLESS 12" past the campaign. */
export function waveLine(s: GameState): string {
  const w = s.wave;
  const label = w.number > CAMPAIGN_WAVES ? `ENDLESS ${String(w.number)}` : `WAVE ${String(w.number)}/${String(CAMPAIGN_WAVES)}`;
  const next = w.phase === 'leadIn' ? (w.number === 1 ? ' · incoming' : ' · next wave incoming') : '';
  const progress = w.phase === 'active' ? objectiveProgress(waveDef(w.number).objective, w) : '';
  return [label + next, progress].filter(Boolean).join(' · ');
}

export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, { name: string; blurb: string }>> = {
  kid: { name: 'Kid / Easy', blurb: 'Slower asteroids, Earth heals between waves, wide rocket lock, unlimited turbo.' },
  normal: { name: 'Normal', blurb: 'The original game’s pace, escalating over 10 waves.' },
  hard: { name: 'Hard', blurb: 'Faster, denser asteroids that hit Earth harder.' },
};
