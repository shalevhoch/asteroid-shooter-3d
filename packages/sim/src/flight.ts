/** Ship flight (SPEC §3): turning, throttle, turbo with fuel, strafe and reverse. Direct movement, no inertia. */
import { FUEL_MAX, STRAFE_STEP, THROTTLE_MAX, THROTTLE_STEP, TURBO_STEP, TURN_RATE } from './constants.js';
import { fromAxisAngle, multiply, normalizeQuat, rotate, type Quat } from './quat.js';
import { LOCAL_FORWARD, LOCAL_RIGHT, LOCAL_UP, type Input, type ShipState, type SimEvent } from './state.js';
import { addScaled, type Vec3 } from './vec3.js';

/** A finite number clamped to [−1, 1]; anything else is 0. */
export const axis = (v: number): number => (Number.isFinite(v) ? Math.max(-1, Math.min(1, v)) : 0);
/** −1, 0 or +1 by sign; non-finite is 0. */
const unit = (v: number): number => (Number.isFinite(v) ? Math.sign(v) : 0);

/** Pitch → yaw → roll, each about the ship's own current axes (SPEC §3). */
export function turn(rot: Quat, input: Input): Quat {
  const pitch = fromAxisAngle(LOCAL_RIGHT, axis(input.pitch) * TURN_RATE);
  const yaw = fromAxisAngle(LOCAL_UP, -axis(input.yaw) * TURN_RATE);
  const roll = fromAxisAngle(LOCAL_FORWARD, axis(input.roll) * TURN_RATE);
  return normalizeQuat(multiply(multiply(multiply(rot, pitch), yaw), roll));
}

export interface FlightResult {
  readonly ship: ShipState;
  readonly events: readonly SimEvent[];
}

export function fly(ship: ShipState, input: Input): FlightResult {
  const events: SimEvent[] = [];
  const rot = turn(ship.rot, input);
  const throttle = Math.max(0, Math.min(THROTTLE_MAX, ship.throttle + unit(input.throttle)));
  const forward = rotate(rot, LOCAL_FORWARD);
  const right = rotate(rot, LOCAL_RIGHT);
  const up = rotate(rot, LOCAL_UP);

  const turbo = input.turbo && ship.fuel > 0;
  const fuel = turbo ? ship.fuel - 1 : ship.fuel;
  if (turbo && !ship.turbo) events.push({ type: 'turboStarted' });
  if (!turbo && ship.turbo) events.push({ type: 'turboEnded' });
  if (turbo && fuel === 0) events.push({ type: 'fuelEmpty' });

  let pos: Vec3 = addScaled(ship.pos, forward, turbo ? TURBO_STEP : throttle * THROTTLE_STEP);
  pos = addScaled(pos, right, unit(input.strafeX) * STRAFE_STEP);
  pos = addScaled(pos, up, unit(input.strafeY) * STRAFE_STEP);
  if (input.reverse) pos = addScaled(pos, forward, -STRAFE_STEP);

  return { ship: { ...ship, pos, rot, throttle, fuel: Math.min(fuel, FUEL_MAX), turbo }, events };
}
