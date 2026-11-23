/** P22: card prompts follow the connected input. */
import { describe, expect, it } from 'vitest';
import { actionPrompt, inputKind, withStart } from '../src/prompts.js';

describe('card prompts', () => {
  it('a pad wins over touch and mouse', () => {
    expect(inputKind(true, true)).toBe('pad');
    expect(inputKind(false, true)).toBe('touch');
    expect(inputKind(false, false)).toBe('mouse');
  });
  it('title and pause name the right input', () => {
    expect(actionPrompt('pad', 'start')).toBe('Press Start to play');
    expect(actionPrompt('pad', 'resume')).toBe('Press Start to resume');
    expect(actionPrompt('touch', 'start')).toBe('Tap to start');
    expect(actionPrompt('mouse', 'resume')).toBe('Click to resume');
  });
  it('win / game-over buttons get "(Start)" only with a pad', () => {
    expect(withStart('Play again', 'pad')).toBe('Play again (Start)');
    expect(withStart('Play again', 'mouse')).toBe('Play again');
  });
});
