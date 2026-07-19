/**
 * Balance beam — a static wooden plank with side rails, narrower than a
 * regular platform so it reads as a dedicated balance challenge rather than
 * just another hop. Physics is a plain AABB (matching the plank), same as
 * Platform; the rails are purely cosmetic and slightly narrower than the
 * plank so they never catch the player's feet.
 *
 * Straight runs and "curvy" zigzag paths are both built by chaining several
 * axis-aligned BalanceBeam segments end to end (see the course defs) — the
 * physics engine only supports axis-aligned boxes, so a winding path is
 * authored as a sequence of short beams alternating between X- and
 * Z-oriented, not a single rotated piece.
 */

import { BoxGeometry, Group, Mesh, MeshLambertMaterial } from "three";
import type { Box, Vec3 } from "../physics";
import { ZERO_DELTA, type Piece } from "../types";

const PLANK_COLOR = 0xc98a4b;
const RAIL_COLOR = 0x8a5a2b;

export class BalanceBeam implements Piece {
  readonly group = new Group();
  private readonly solid: Box;

  constructor(pos: [number, number, number], size: [number, number, number]) {
    const plank = new Mesh(
      new BoxGeometry(size[0], size[1], size[2]),
      new MeshLambertMaterial({ color: PLANK_COLOR }),
    );
    plank.position.set(...pos);
    this.group.add(plank);

    // Thin rail strips along the two long edges (whichever axis is longer).
    const alongX = size[0] >= size[2];
    const railThickness = 0.08;
    const railHeight = 0.1;
    const railMat = new MeshLambertMaterial({ color: RAIL_COLOR });
    if (alongX) {
      for (const sign of [-1, 1]) {
        const rail = new Mesh(new BoxGeometry(size[0], railHeight, railThickness), railMat);
        rail.position.set(pos[0], pos[1] + size[1] / 2 + railHeight / 2, pos[2] + sign * (size[2] / 2 - railThickness / 2));
        this.group.add(rail);
      }
    } else {
      for (const sign of [-1, 1]) {
        const rail = new Mesh(new BoxGeometry(railThickness, railHeight, size[2]), railMat);
        rail.position.set(pos[0] + sign * (size[0] / 2 - railThickness / 2), pos[1] + size[1] / 2 + railHeight / 2, pos[2]);
        this.group.add(rail);
      }
    }

    this.solid = {
      cx: pos[0],
      cy: pos[1],
      cz: pos[2],
      hx: size[0] / 2,
      hy: size[1] / 2,
      hz: size[2] / 2,
    };
  }

  update(): void {}

  collectSolids(solids: Box[], deltas: Vec3[], owners: (Piece | null)[]): void {
    solids.push(this.solid);
    deltas.push(ZERO_DELTA as Vec3);
    owners.push(null);
  }

  reset(): void {}
}
