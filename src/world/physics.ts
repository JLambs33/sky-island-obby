/**
 * Pure AABB collision for the obby. Everything solid in the game is an
 * axis-aligned box, so movement is axis-separated move-and-resolve: move X,
 * push out; move Z, push out; move Y, push out (recording ground/ceiling).
 * DOM-free and allocation-free so it unit tests trivially and stays cheap at
 * 60 Hz on an iPad.
 */

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** Center + half extents. */
export interface Box {
  cx: number;
  cy: number;
  cz: number;
  hx: number;
  hy: number;
  hz: number;
}

export interface MoveResult {
  x: number;
  y: number;
  z: number;
  onGround: boolean;
  hitCeiling: boolean;
  /** Index into `solids` of the box being stood on, or -1. */
  groundIndex: number;
}

/**
 * Highest solid top surface directly under (x, z), considering only solids
 * whose top is at or below `fromY + tolerance`. Used to ground-verify respawn
 * points so the player never spawns over air. Returns null when nothing is
 * below.
 */
export function findGroundY(
  x: number,
  z: number,
  solids: readonly Box[],
  fromY: number,
  tolerance = 0.5,
): number | null {
  let best: number | null = null;
  for (const s of solids) {
    if (Math.abs(x - s.cx) >= s.hx || Math.abs(z - s.cz) >= s.hz) continue;
    const top = s.cy + s.hy;
    if (top > fromY + tolerance) continue;
    if (best === null || top > best) best = top;
  }
  return best;
}

/** Strict overlap — touching faces do not count, so resolved contacts are stable. */
export function boxesOverlap(a: Box, b: Box): boolean {
  return (
    Math.abs(a.cx - b.cx) < a.hx + b.hx &&
    Math.abs(a.cy - b.cy) < a.hy + b.hy &&
    Math.abs(a.cz - b.cz) < a.hz + b.hz
  );
}

const mover: Box = { cx: 0, cy: 0, cz: 0, hx: 0, hy: 0, hz: 0 };

// Resolve with a hair of separation so a contact surface produced by one axis
// can't float-error into a phantom overlap on the next axis' pass.
const SKIN = 1e-4;

/**
 * Move a box from (px,py,pz) by (dx,dy,dz) against `solids`, resolving each
 * axis independently. Writes the final position and contact flags into `out`.
 * At 60 Hz fixed steps and game speeds (< ~0.35 units/step) tunneling through
 * the thinnest solids (0.4 units) can't happen, so no swept test is needed.
 */
export function moveBox(
  px: number,
  py: number,
  pz: number,
  hx: number,
  hy: number,
  hz: number,
  dx: number,
  dy: number,
  dz: number,
  solids: readonly Box[],
  out: MoveResult,
): MoveResult {
  mover.hx = hx;
  mover.hy = hy;
  mover.hz = hz;
  mover.cx = px + dx;
  mover.cy = py;
  mover.cz = pz;

  // Horizontal resolution pushes toward the side the mover's center is on
  // (minimal penetration), not the movement direction — so a solid that
  // moved INTO a stationary player (pistons, sweeper walls) shoves them out
  // the correct side even when the player isn't moving at all.
  for (const s of solids) {
    if (!boxesOverlap(mover, s)) continue;
    mover.cx = mover.cx < s.cx ? s.cx - s.hx - hx - SKIN : s.cx + s.hx + hx + SKIN;
  }

  mover.cz = pz + dz;
  for (const s of solids) {
    if (!boxesOverlap(mover, s)) continue;
    mover.cz = mover.cz < s.cz ? s.cz - s.hz - hz - SKIN : s.cz + s.hz + hz + SKIN;
  }

  mover.cy = py + dy;
  out.onGround = false;
  out.hitCeiling = false;
  out.groundIndex = -1;
  for (let i = 0; i < solids.length; i++) {
    const s = solids[i];
    if (!boxesOverlap(mover, s)) continue;
    if (dy <= 0) {
      mover.cy = s.cy + s.hy + hy + SKIN;
      out.onGround = true;
      out.groundIndex = i;
    } else {
      mover.cy = s.cy - s.hy - hy - SKIN;
      out.hitCeiling = true;
    }
  }

  out.x = mover.cx;
  out.y = mover.cy;
  out.z = mover.cz;
  return out;
}
