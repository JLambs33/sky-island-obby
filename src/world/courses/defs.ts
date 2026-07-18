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
  | { type: "platform"; pos: V3; size: V3; color?: number; moveTo?: V3; period?: number }
  | { type: "vanish"; pos: V3; size?: V3 }
  | { type: "lava"; pos: V3; size: V3 }
  | { type: "bounce"; pos: V3; power?: number }
  | { type: "checkpoint"; pos: V3 }
  | { type: "coin"; pos: V3 }
  | { type: "spinner"; pos: V3; radius?: number; period?: number }
  | { type: "trophy"; pos: V3 };

export type CourseId = "easy" | "medium" | "hard";

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
