/**
 * Pure input-mapping math, kept free of any DOM so it can be unit tested.
 * Adapted from ~/Code/detective-game.
 *
 * Axis convention (shared by every driver): x = strafe right (+), y = forward (+).
 * Pushing the joystick up (screen −y) or pressing W maps to forward (+y). Screen-Y
 * grows downward, so joystick math inverts it here once, in one place.
 *
 * Vector helpers write into a caller-supplied `out` so the driver hot paths reuse
 * objects and never allocate per event/frame.
 */

import type { Vec2 } from "./InputController";

/** Normalize -0 to 0 so equality checks and readouts stay clean (harmless in math). */
const nz = (v: number): number => (v === 0 ? 0 : v);

/** WASD/arrow booleans → normalized move vector. Diagonals are clamped to length 1. */
export function keysToMove(
  up: boolean,
  down: boolean,
  left: boolean,
  right: boolean,
  out: Vec2,
): Vec2 {
  let x = (right ? 1 : 0) - (left ? 1 : 0);
  let y = (up ? 1 : 0) - (down ? 1 : 0);
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  out.x = x;
  out.y = y;
  return out;
}

/**
 * Joystick displacement in screen pixels (current − origin) → normalized move
 * vector. Displacement is clamped to the throw radius, then scaled to 0..1.
 * Screen-Y is inverted so pushing up produces forward (+y).
 */
export function joystickVector(dx: number, dy: number, maxRadius: number, out: Vec2): Vec2 {
  let x = dx;
  let y = dy;
  const len = Math.hypot(dx, dy);
  if (len > maxRadius && len > 0) {
    const s = maxRadius / len;
    x = dx * s;
    y = dy * s;
  }
  out.x = nz(x / maxRadius);
  out.y = nz(-(y / maxRadius));
  return out;
}
