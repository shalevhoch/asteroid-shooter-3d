import { describe, expect, it } from 'vitest';
import { NO_INPUT, buyUpgrade, initialState, step, type GameState, type Input } from '@asteroid/sim';
import { Recorder, decodeInput, encodeInput, parseReplay, playReplay, replayInputs } from '../src/replay.js';

/** A deterministic "player": varied inputs from a tiny LCG. */
function player(seed: number): (t: number) => Input {
  let x = seed >>> 0;
  const r = () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32);
  return (t) => {
    const hold = t % 40 < 20;
    return { ...NO_INPUT, pitch: hold ? r() * 2 - 1 : 0, yaw: hold ? r() - 0.5 : 0, throttle: t % 50 === 0 ? 1 : 0, firePhoton: r() < 0.6, fireRocket: t % 90 === 45, rocketHeld: t % 90 > 40 && t % 90 < 46, turbo: t % 200 < 30 };
  };
}

function liveRun(ticks: number, buyAt: Readonly<Record<number, 'damage' | 'missiles'>> = {}): { rec: Recorder; final: GameState } {
  const options = { credits: 2000, earnsCredits: true };
  let s = initialState(1234, 'normal', 'fighter', options);
  const rec = new Recorder(1234, 'normal', 'fighter', options);
  const p = player(7);
  for (let t = 0; t < ticks && !s.ended; t++) {
    const id = buyAt[t];
    if (id) {
      const next = buyUpgrade(s, id);
      if (next !== s) rec.buy(id);
      s = next;
    }
    const input = p(t);
    rec.input(input);
    s = step(s, input).state;
  }
  return { rec, final: s };
}

describe('replays (P37)', () => {
  it('an input survives encode and decode exactly, −0 included', () => {
    const i: Input = { ...NO_INPUT, pitch: -0, yaw: 0.1 + 0.2, roll: -1, throttle: 1, strafeX: -1, strafeY: 1, turbo: true, firePhoton: true, rocketHeld: true };
    const back = decodeInput(encodeInput(i));
    expect(back).toEqual({ ...i, reverse: false, fireRocket: false });
    expect(Object.is(back?.pitch, -0)).toBe(true);
    expect(decodeInput('1,2,3')).toBeNull();
  });
  it('a recorded run replays to the identical final state', () => {
    const { rec, final } = liveRun(3000);
    const r = parseReplay(JSON.stringify(rec.replay(final.score, '2026-11-24')));
    expect(r).not.toBeNull();
    if (!r) return;
    expect(replayInputs(r)?.length).toBe(rec.length);
    expect(playReplay(r)).toEqual(final);
  });
  it('shop buys replay at the same tick', () => {
    const { rec, final } = liveRun(1500, { 0: 'damage', 3: 'missiles' });
    expect(final.upgrades.damage).toBe(1);
    const r = rec.replay(final.score, '');
    expect(r.buys).toEqual([{ at: 0, id: 'damage' }, { at: 3, id: 'missiles' }]);
    expect(playReplay(r)).toEqual(final);
  });
  it('idle stretches compress', () => {
    const rec = new Recorder(1, 'kid', 'shuttle', {});
    for (let t = 0; t < 500; t++) rec.input(NO_INPUT);
    expect(rec.replay(0, '').frames).toBe('500*0,0,0,0,0,0,0');
  });
  it('rejects things that are not replays', () => {
    expect(parseReplay(null)).toBeNull();
    expect(parseReplay('nope')).toBeNull();
    expect(parseReplay(JSON.stringify({ v: 2 }))).toBeNull();
    expect(parseReplay(JSON.stringify({ v: 1, seed: 1, difficulty: 'normal', craft: 'fighter', frames: 'x', buys: [], score: 0 }))).toBeNull();
    expect(parseReplay(JSON.stringify({ v: 1, seed: 1, difficulty: 'bogus', craft: 'fighter', frames: '', buys: [], score: 0 }))).toBeNull();
  });
});
