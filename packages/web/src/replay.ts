/** Replays (P37): a run is its seed, rules and per-tick inputs, so replaying them through the pure sim reproduces it exactly. */
import { CRAFT_IDS, DIFFICULTIES, UPGRADE_IDS, buyUpgrade, initialState, parseUpgrades, step, type CraftId, type Difficulty, type GameState, type Input, type RunOptions, type UpgradeId } from '@asteroid/sim';

export const REPLAY_KEY = 'asteroid-shooter-3d.replay.v1';
/** A replay longer than this many characters isn't stored (localStorage is small); it can still be exported. */
export const REPLAY_STORE_LIMIT = 2_000_000;

/** A shop buy, applied before input `at` (buys happen paused, between ticks). */
export interface ReplayBuy {
  readonly at: number;
  readonly id: UpgradeId;
}

export interface Replay {
  readonly v: 1;
  readonly seed: number;
  readonly difficulty: Difficulty;
  readonly craft: CraftId;
  readonly options: RunOptions;
  /** Run-length encoded inputs: `count*frame` joined by `;`. */
  readonly frames: string;
  readonly buys: readonly ReplayBuy[];
  readonly score: number;
  readonly date: string;
}

const FLAGS = ['turbo', 'reverse', 'firePhoton', 'fireRocket', 'rocketHeld'] as const;
const num = (n: number): string => (Object.is(n, -0) ? '-0' : String(n));

/** One tick's input as text; exact for every finite number, including −0. */
export function encodeInput(i: Input): string {
  const flags = FLAGS.reduce((f, k, bit) => (i[k] === true ? f | (1 << bit) : f), 0);
  return [i.pitch, i.yaw, i.roll, i.throttle, i.strafeX, i.strafeY].map(num).join(',') + `,${String(flags)}`;
}

export function decodeInput(s: string): Input | null {
  const p = s.split(',').map(Number);
  if (p.length !== 7 || p.some((n) => !Number.isFinite(n))) return null;
  const [pitch = 0, yaw = 0, roll = 0, throttle = 0, strafeX = 0, strafeY = 0, f = 0] = p;
  const has = (k: (typeof FLAGS)[number]) => (f & (1 << FLAGS.indexOf(k))) !== 0;
  return { pitch, yaw, roll, throttle, strafeX, strafeY, turbo: has('turbo'), reverse: has('reverse'), firePhoton: has('firePhoton'), fireRocket: has('fireRocket'), rocketHeld: has('rocketHeld') };
}

/** Records a run as it is played. */
export class Recorder {
  private runs: [number, string][] = [];
  private buys: ReplayBuy[] = [];
  private count = 0;

  constructor(
    readonly seed: number,
    readonly difficulty: Difficulty,
    readonly craft: CraftId,
    readonly options: RunOptions,
  ) {}

  get length(): number {
    return this.count;
  }

  input(i: Input): void {
    const s = encodeInput(i);
    const last = this.runs[this.runs.length - 1];
    if (last?.[1] === s) last[0]++;
    else this.runs.push([1, s]);
    this.count++;
  }

  buy(id: UpgradeId): void {
    this.buys.push({ at: this.count, id });
  }

  replay(score: number, date: string): Replay {
    const frames = this.runs.map(([n, s]) => (n === 1 ? s : `${String(n)}*${s}`)).join(';');
    return { v: 1, seed: this.seed, difficulty: this.difficulty, craft: this.craft, options: this.options, frames, buys: [...this.buys], score, date };
  }
}

/** The replay's inputs, one per tick, or null when the frames don't parse. */
export function replayInputs(r: Replay): Input[] | null {
  const out: Input[] = [];
  if (r.frames === '') return out;
  for (const part of r.frames.split(';')) {
    const star = part.indexOf('*');
    const n = star < 0 ? 1 : Number(part.slice(0, star));
    const input = decodeInput(star < 0 ? part : part.slice(star + 1));
    if (!input || !Number.isInteger(n) || n < 1) return null;
    for (let k = 0; k < n; k++) out.push(input);
  }
  return out;
}

/** The replay's first state. */
export const replayStart = (r: Replay): GameState => initialState(r.seed, r.difficulty, r.craft, r.options);

/** Applies the buys recorded before input `at`. */
export function applyBuys(s: GameState, r: Replay, at: number): GameState {
  return r.buys.filter((b) => b.at === at).reduce((acc, b) => buyUpgrade(acc, b.id), s);
}

/** Plays a whole replay headless: the final state, for tests and checks. */
export function playReplay(r: Replay): GameState | null {
  const inputs = replayInputs(r);
  if (!inputs) return null;
  let s = replayStart(r);
  for (const [i, input] of inputs.entries()) {
    if (s.ended) break;
    s = step(applyBuys(s, r, i), input).state;
  }
  return s;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/** A replay from stored or imported JSON, or null when it isn't one. */
export function parseReplay(raw: string | null): Replay | null {
  if (!raw) return null;
  let o: unknown;
  try {
    o = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!isRecord(o) || o['v'] !== 1) return null;
  const { seed, difficulty, craft, options, frames, buys, score, date } = o;
  if (typeof seed !== 'number' || !Number.isInteger(seed) || typeof frames !== 'string' || typeof score !== 'number') return null;
  const diff = DIFFICULTIES.find((d) => d === difficulty);
  const ship = CRAFT_IDS.find((c) => c === craft);
  if (!diff || !ship || !Array.isArray(buys)) return null;
  const okBuys = buys.filter((b): b is ReplayBuy => isRecord(b) && typeof b['at'] === 'number' && UPGRADE_IDS.includes(b['id'] as UpgradeId));
  const opts = isRecord(options) ? options : {};
  const runOptions: RunOptions = {
    upgrades: parseUpgrades(opts['upgrades']),
    ...(typeof opts['credits'] === 'number' ? { credits: opts['credits'] } : {}),
    ...(typeof opts['earnsCredits'] === 'boolean' ? { earnsCredits: opts['earnsCredits'] } : {}),
  };
  const r: Replay = { v: 1, seed, difficulty: diff, craft: ship, options: runOptions, frames, buys: okBuys, score, date: typeof date === 'string' ? date : '' };
  return replayInputs(r) ? r : null;
}
