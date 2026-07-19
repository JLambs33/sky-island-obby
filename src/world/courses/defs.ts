/**
 * Data-only course definitions. Positions are world units; platform `pos` is
 * the box center (tops are pos.y + size.y/2), while spawn/checkpoint/coin/
 * trophy positions are feet/base points ON a platform top.
 *
 * Tuning (see CLAUDE.md): full jump ≈ 1.85 high / ≈ 4.5 flat gap. Easy keeps
 * gaps ≤ 2, hard tops out ≈ 3.5.
 */

export type V3 = [number, number, number];

export type PieceDef =
  | { type: "platform"; pos: V3; size: V3; color?: number; moveTo?: V3; period?: number; path?: V3[]; speed?: number }
  | { type: "vanish"; pos: V3; size?: V3 }
  | { type: "falling"; pos: V3; size?: V3 }
  | { type: "lava"; pos: V3; size: V3; moveTo?: V3; period?: number }
  | { type: "bounce"; pos: V3; power?: number }
  | { type: "checkpoint"; pos: V3 }
  | { type: "coin"; pos: V3 }
  | { type: "spinner"; pos: V3; radius?: number; period?: number }
  | { type: "pendulum"; pos: V3; length?: number; period?: number; maxAngle?: number }
  | { type: "conveyor"; pos: V3; size: V3; dir: [number, number]; speed?: number }
  | { type: "wind"; pos: V3; size: V3; strength?: number }
  | { type: "speed"; pos: V3 }
  | { type: "teleporter"; pos: V3; dest: V3; color?: number }
  | { type: "beam"; pos: V3; size: V3 }
  | { type: "trophy"; pos: V3 };

export type CourseId = "easy" | "medium" | "hard" | "candy" | "gears" | "volcano";

/**
 * A chain of overlapping balance-beam segments weaving left/right along Z —
 * a "curvy" beam section. Physics only supports axis-aligned boxes, so the
 * curve is faked by alternating each segment's X offset while overlapping
 * enough in Z that there's never a gap to fall through.
 */
export function zigzagBeam(
  centerX: number,
  startZ: number,
  y: number,
  count: number,
  segLength: number,
  amplitude: number,
  width = 1.2,
): PieceDef[] {
  const overlap = width;
  const step = segLength - overlap;
  const pieces: PieceDef[] = [];
  for (let i = 0; i < count; i++) {
    const x = centerX + (i % 2 === 0 ? -amplitude : amplitude);
    const z = startZ - i * step;
    pieces.push({ type: "beam", pos: [x, y, z], size: [width, 0.4, segLength] });
  }
  return pieces;
}

export interface CourseDef {
  id: CourseId;
  name: string;
  /** Theme/portal color and default platform color. */
  color: number;
  spawn: V3;
  killY: number;
  coinValue: number;
  bonus: number;
  /** Completion under these seconds earns the medal; any completion = bronze. */
  medals: { gold: number; silver: number };
  pieces: PieceDef[];
}
