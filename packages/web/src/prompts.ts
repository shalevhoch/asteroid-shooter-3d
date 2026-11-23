/** Card prompts (P22): name the input the player actually has. A connected gamepad wins: Start does it. */
export type Input = 'pad' | 'touch' | 'mouse';

export const inputKind = (pad: boolean, touch: boolean): Input => (pad ? 'pad' : touch ? 'touch' : 'mouse');

/** "Press Start to …" with a pad, else "Tap / Click to …". */
export function actionPrompt(input: Input, what: 'start' | 'resume'): string {
  if (input === 'pad') return `Press Start to ${what === 'start' ? 'play' : 'resume'}`;
  return `${input === 'touch' ? 'Tap' : 'Click'} to ${what}`;
}

/** A button Start triggers gets "(Start)" appended while a pad is connected. */
export const withStart = (label: string, input: Input): string => (input === 'pad' ? `${label} (Start)` : label);
