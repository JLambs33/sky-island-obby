/**
 * Bounce pad — landing on it launches the player upward with a satisfying
 * squash animation.
 */

import { BoxGeometry, CylinderGeometry, Group, Mesh, MeshLambertMaterial } from "three";
import type { Box, Vec3 } from "../physics";
import { ZERO_DELTA, type Piece, type PieceHost } from "../types";

export class BouncePad implements Piece {
  readonly group = new Group();
  private readonly top: Mesh;
  private readonly solid: Box;
  private squash = 0;

  constructor(
    pos: [number, number, number],
    private readonly power = 16,
  ) {
    const base = new Mesh(
      new BoxGeometry(1.7, 0.25, 1.7),
      new MeshLambertMaterial({ color: 0x3d4b5c }),
    );
    base.position.set(pos[0], pos[1] + 0.125, pos[2]);
    this.top = new Mesh(
      new CylinderGeometry(0.7, 0.75, 0.25, 16),
      new MeshLambertMaterial({ color: 0x35e0c8, emissive: 0x14856d }),
    );
    this.top.position.set(pos[0], pos[1] + 0.37, pos[2]);
    this.group.add(base, this.top);
    this.solid = { cx: pos[0], cy: pos[1] + 0.25, cz: pos[2], hx: 0.85, hy: 0.25, hz: 0.85 };
  }

  onStand(host: PieceHost): void {
    host.bounce(this.power);
    this.squash = 1;
  }

  update(dt: number): void {
    if (this.squash > 0) {
      this.squash = Math.max(0, this.squash - dt * 4);
      this.top.scale.y = 1 - this.squash * 0.6;
    }
  }

  collectSolids(solids: Box[], deltas: Vec3[], owners: (Piece | null)[]): void {
    solids.push(this.solid);
    deltas.push(ZERO_DELTA as Vec3);
    owners.push(this);
  }

  reset(): void {
    this.squash = 0;
    this.top.scale.y = 1;
  }
}
