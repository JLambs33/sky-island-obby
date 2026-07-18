/**
 * Shared world contracts. Pieces and worlds talk to the game only through
 * these interfaces, which keeps Course/Hub/pieces free of circular imports.
 */

import type { Object3D } from "three";
import type { Box, Vec3 } from "./physics";
import type { SfxName } from "../audio/Sfx";
import type { CourseId } from "./courses/defs";

export const ZERO_DELTA: Readonly<Vec3> = { x: 0, y: 0, z: 0 };

/** What a course piece may ask of the running course. */
export interface PieceHost {
  kill(): void;
  collectCoin(pos: Vec3): void;
  reachCheckpoint(pos: Vec3): void;
  bounce(power: number): void;
  completeCourse(): void;
}

export interface Piece {
  readonly group: Object3D;
  update(dt: number): void;
  /**
   * Contribute this step's solid boxes. The three arrays stay parallel:
   * `deltas[i]` is how solid i moved this step (for platform carry) and
   * `owners[i]` receives onStand when the player lands on it.
   */
  collectSolids(solids: Box[], deltas: Vec3[], owners: (Piece | null)[]): void;
  /** Player is standing on one of this piece's solids this step. */
  onStand?(host: PieceHost): void;
  /** Overlap-triggered behavior (coins, lava, checkpoints, trophy). */
  checkTrigger?(playerBox: Readonly<Box>, host: PieceHost): void;
  reset(): void;
}

/** What worlds (Hub / Course) may ask of the Game. */
export interface GameHost {
  addCoins(n: number): void;
  toast(msg: string): void;
  sfxPlay(name: SfxName): void;
  courseComplete(timeSec: number): void;
  enterCourse(id: CourseId): void;
  openShop(): void;
}
