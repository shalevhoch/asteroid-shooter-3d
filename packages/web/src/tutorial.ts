/**
 * The tutorial (P36): five steps on the first run (aim, fire, rocket, throttle, reload), each done when the player
 * does it. Skippable; finishing or skipping saves a flag so it doesn't come back. Pure.
 */
import type { GameState, SimEvent } from '@asteroid/sim';

export const TUTORIAL_KEY = 'asteroid-shooter-3d.tutorial.v1';
export const TUTORIAL_STEPS = ['aim', 'fire', 'rocket', 'throttle', 'reload'] as const;
export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

/** Whether the step is done this tick, given the state before and after and the tick's events. */
export function stepDone(step: TutorialStep, before: GameState, after: GameState, events: readonly SimEvent[]): boolean {
  switch (step) {
    case 'aim': {
      const [a, b] = [before.ship.rot, after.ship.rot];
      return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]) + Math.abs(a[3] - b[3]) > 1e-6;
    }
    case 'fire':
      return events.some((e) => e.type === 'photonFired');
    case 'rocket':
      return events.some((e) => e.type === 'rocketFired');
    case 'throttle':
      return after.ship.throttle > before.ship.throttle || after.ship.turbo;
    case 'reload':
      return events.some((e) => e.type === 'shipReloaded');
  }
}

/** The step index after a tick (TUTORIAL_STEPS.length = finished). */
export function advanceTutorial(index: number, before: GameState, after: GameState, events: readonly SimEvent[]): number {
  const step = TUTORIAL_STEPS[index];
  return step !== undefined && stepDone(step, before, after, events) ? index + 1 : index;
}

/** The English hint for a step, per input kind (translated by the caller). */
export function tutorialHint(step: TutorialStep, touch: boolean): string {
  switch (step) {
    case 'aim':
      return touch ? 'Aim: drag the left side of the screen to turn the ship.' : 'Aim: move the mouse (or the left stick) to turn the ship.';
    case 'fire':
      return touch ? 'Fire: hold FIRE to shoot photons.' : 'Fire: hold Space or the left mouse button to shoot photons.';
    case 'rocket':
      return touch ? 'Rockets: tap ROCKET to launch a homing rocket.' : 'Rockets: press V or the right mouse button to launch a homing rocket.';
    case 'throttle':
      return touch ? 'Throttle: slide the throttle up to speed up.' : 'Throttle: W or the mouse wheel speeds up (hold Shift for turbo).';
    case 'reload':
      return "Reload: fly back into the mothership's hangar (or the station) to refill.";
  }
}
