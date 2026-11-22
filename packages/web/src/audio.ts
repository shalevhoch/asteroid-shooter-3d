/** The original's three WAVs through WebAudio (P07). Unlocks on the first user input; a muted bank plays nothing. */
import type { SimEvent } from '@asteroid/sim';
import { assetUrl } from './assetUrl.js';

export type Sound = 'photon' | 'rocket' | 'kaboom';
export interface Cue {
  readonly sound: Sound;
  readonly volume: number;
}

/** Most cues one tick's events may trigger, so a big split or a volley doesn't clip. */
export const MAX_CUES_PER_TICK = 4;

/** Which sounds a tick's events play. Pure, so the mapping is tested. */
export function cuesFor(events: readonly SimEvent[]): Cue[] {
  const cues: Cue[] = [];
  for (const e of events) {
    if (e.type === 'photonFired') cues.push({ sound: 'photon', volume: 0.25 });
    else if (e.type === 'rocketFired') cues.push({ sound: 'rocket', volume: 0.6 });
    else if (e.type === 'asteroidDestroyed') cues.push({ sound: 'kaboom', volume: e.size === 'big' ? 0.9 : 0.55 });
    else if (e.type === 'earthHit') cues.push({ sound: 'kaboom', volume: 0.7 });
    else if (e.type === 'runEnded') cues.push({ sound: 'kaboom', volume: 1 });
  }
  return cues.slice(0, MAX_CUES_PER_TICK);
}

export class AudioBank {
  private ctx: AudioContext | null = null;
  private readonly buffers = new Map<Sound, AudioBuffer>();
  muted = false;

  constructor(private readonly base: string) {
    const unlock = () => {
      this.unlock();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  private unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const ctx = new AudioContext();
    this.ctx = ctx;
    for (const s of ['photon', 'rocket', 'kaboom'] as const) {
      void fetch(assetUrl(this.base, `sounds/${s}.wav`))
        .then((r) => r.arrayBuffer())
        .then((b) => ctx.decodeAudioData(b))
        .then((buf) => this.buffers.set(s, buf))
        .catch(() => undefined);
    }
  }

  get unlocked(): boolean {
    return this.ctx?.state === 'running';
  }

  play(cues: readonly Cue[]): void {
    const ctx = this.ctx;
    if (!ctx || this.muted) return;
    for (const c of cues) {
      const buf = this.buffers.get(c.sound);
      if (!buf) continue;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.value = c.volume;
      src.connect(gain).connect(ctx.destination);
      src.start();
    }
  }
}
