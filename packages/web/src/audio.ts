/** The original's three WAVs through WebAudio (P07). Unlocks on the first user input; a muted bank plays nothing. */
import type { SimEvent } from '@asteroid/sim';
import { assetUrl } from './assetUrl.js';

/** `chime` (P27 follow-up, the perk pickup) is synthesised, not loaded. */
export type Sound = 'photon' | 'rocket' | 'kaboom' | 'chime' | 'whoosh' | 'rumble';
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
    else if (e.type === 'asteroidDestroyed') {
      cues.push({ sound: 'kaboom', volume: e.size === 'big' ? 0.9 : 0.55 });
      // P30: big kills get a low rumble under the bang.
      if (e.size === 'big') cues.push({ sound: 'rumble', volume: 0.8 });
    }
    else if (e.type === 'earthHit') cues.push({ sound: 'kaboom', volume: 0.7 });
    else if (e.type === 'turboStarted') cues.push({ sound: 'whoosh', volume: 0.45 });
    else if (e.type === 'perkCollected') cues.push({ sound: 'chime', volume: 0.5 });
    else if (e.type === 'smartBomb' || e.type === 'runEnded') cues.push({ sound: 'kaboom', volume: 1 }, { sound: 'rumble', volume: 1 });
  }
  return cues.slice(0, MAX_CUES_PER_TICK);
}

/** A short rising two-note chime (E6 → A6) with a soft decay. */
function chime(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * 0.35), rate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) {
    const t = i / rate;
    const f = t < 0.09 ? 1318.5 : 1760;
    d[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 9) * 0.5;
  }
  return buf;
}

/** Hyperdrive kick-in (P28): a filtered noise swell that rises and fades over ~0.7 s. Deterministic noise. */
function whoosh(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * 0.7), rate);
  const d = buf.getChannelData(0);
  let seed = 12345;
  let lp = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / d.length;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const k = 0.04 + 0.25 * t;
    lp += k * (seed / 4294967296 - 0.5 - lp);
    d[i] = lp * 3 * Math.sin(Math.PI * t) ** 1.5;
  }
  return buf;
}

/** A synthesised explosion rumble (P30): a falling 70 → 30 Hz tone under low-passed noise, decaying over 1.1 s. */
function rumble(ctx: BaseAudioContext): AudioBuffer {
  const rate = ctx.sampleRate;
  const buf = ctx.createBuffer(1, Math.floor(rate * 1.1), rate);
  const d = buf.getChannelData(0);
  let seed = 98765;
  let lp = 0;
  let phase = 0;
  for (let i = 0; i < d.length; i++) {
    const t = i / d.length;
    seed = (seed * 1664525 + 1013904223) >>> 0;
    lp += 0.02 * (seed / 4294967296 - 0.5 - lp);
    phase += (2 * Math.PI * (70 - 40 * t)) / rate;
    const env = Math.min(1, i / (rate * 0.01)) * Math.exp(-3.2 * t);
    d[i] = env * (0.55 * Math.sin(phase) + 4 * lp);
  }
  return buf;
}

export class AudioBank {
  private ctx: AudioContext | null = null;
  private readonly buffers = new Map<Sound, AudioBuffer>();
  muted = false;
  /** Master volume, 0..1 (P13). */
  volume = 1;

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
    this.buffers.set('chime', chime(ctx));
    this.buffers.set('whoosh', whoosh(ctx));
    this.buffers.set('rumble', rumble(ctx));
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
    if (!ctx || this.muted || this.volume <= 0) return;
    for (const c of cues) {
      const buf = this.buffers.get(c.sound);
      if (!buf) continue;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.value = c.volume * this.volume;
      src.connect(gain).connect(ctx.destination);
      src.start();
    }
  }
}
